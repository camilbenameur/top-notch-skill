// Content gate: fail the build when the visible text breaks a mechanical rule (banned words, false
// status claims, em dashes, a phone number), and count AI tells. What a regex cannot judge (what a
// sentence implies) stays with the adversarial review (workflows/copy-review.js).
//   node content-gate.mjs <dist | text-file> --rules content-rules.json
// Input: a build folder (every .html, text between tags, scripts and styles skipped) or the text
// dump of page-text.mjs. Rules file (see content-rules.example.json):
//   { "fail": [{ "pattern": "regex", "flags": "i", "why": "...", "allowIn": ["path regex", ...] }],
//     "warn": [{ "pattern": "regex", "flags": "gi", "why": "..." }],
//     "maxWarnings": 0 }
// "allowIn" lists page paths where a fail pattern is accepted (for example "in production" on the
// one project that really is). Exit 1 on any fail, or when warnings exceed maxWarnings.
import fs from 'node:fs';
import path from 'node:path';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const target = a.find((x, i) => !x.startsWith('--') && a[i - 1] !== '--rules');
const rulesFile = opt('--rules', 'content-rules.json');
if (!target || !fs.existsSync(target)) { console.error('usage: node content-gate.mjs <dist | text-file> --rules content-rules.json'); process.exit(1); }
if (!fs.existsSync(rulesFile)) { console.error(`content-gate: no rules file ${path.resolve(rulesFile)}. Copy scripts/content-rules.example.json into the project and edit it.`); process.exit(1); }
let rules;
try { rules = JSON.parse(fs.readFileSync(rulesFile, 'utf8')); } catch (e) { console.error(`content-gate: ${rulesFile} is not valid JSON: ${e.message}`); process.exit(1); }

const NAMED = { nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'", mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', laquo: '«', raquo: '»', euro: '€', amp: '&' };
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m); // one pass, so "&amp;lt;" stays "&lt;"
const pages = []; // [{ page, text }]
if (fs.statSync(target).isDirectory()) {
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) {
        const raw = fs.readFileSync(p, 'utf8');
        const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw)?.[1] ?? '';
        const metaTag = [...raw.matchAll(/<meta\s[^>]*>/gi)].map((m) => m[0]).find((t) => /name\s*=\s*["']description["']/i.test(t)) || '';
        const meta = /content\s*=\s*"([^"]*)"/i.exec(metaTag)?.[1] ?? /content\s*=\s*'([^']*)'/i.exec(metaTag)?.[1] ?? '';
        const body = raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|template|noscript|title)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
        const text = decode(`${title}\n${meta}\n${body}`).replace(/[  ]/g, ' ').replace(/[ \t]+/g, ' ');
        pages.push({ page: '/' + path.relative(target, p).replace(/\\/g, '/').replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, ''), text });
      }
    }
  };
  walk(target);
} else {
  const all = fs.readFileSync(target, 'utf8');
  if (!/^===== PAGE /m.test(all)) pages.push({ page: '/', text: all });
  else for (const block of all.split(/^===== PAGE /m).filter((b) => b.trim())) {
    const nl = block.indexOf('\n');
    pages.push({ page: block.slice(0, nl).trim(), text: block.slice(nl + 1) });
  }
}
if (!pages.length || !pages.some((p) => p.text.trim())) { console.error(`content-gate: no page or no text found in ${target}`); process.exit(1); }

const context = (text, i, len) => text.slice(Math.max(0, i - 40), i + len + 40).replace(/\s+/g, ' ').trim();
const fails = [];
for (const r of rules.fail || []) {
  const re = new RegExp(r.pattern, (r.flags || '').replace('g', '') + 'g');
  const allow = (r.allowIn || []).map((x) => new RegExp(x));
  for (const { page, text } of pages) {
    if (allow.some((x) => x.test(page))) continue;
    for (const m of text.matchAll(re)) fails.push(`${page}: "${context(text, m.index, m[0].length)}" (${r.why || r.pattern})`);
  }
}
const warns = {};
for (const r of rules.warn || []) {
  const re = new RegExp(r.pattern, (r.flags || '').replace('g', '') + 'g');
  for (const { page, text } of pages) {
    const n = [...text.matchAll(re)].length;
    if (n) (warns[r.why || r.pattern] ||= []).push(`${page} x${n}`);
  }
}
const nWarn = Object.values(warns).flat().reduce((s, x) => s + +x.split(' x').pop(), 0);
const words = pages.reduce((s, p) => s + p.text.split(/\s+/).filter(Boolean).length, 0);

for (const f of fails) console.error(`FAIL ${f}`);
for (const [why, where] of Object.entries(warns)) console.log(`WARN ${why}: ${where.join(', ')}`);
console.log(`content-gate: ${pages.length} pages, ${words} words, ${fails.length} fail(s), ${nWarn} warning(s)`);
process.exitCode = fails.length || nWarn > (rules.maxWarnings ?? Infinity) ? 1 : 0;
