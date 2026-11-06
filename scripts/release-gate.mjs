// Release gate: fetch the live pages the site links to or makes claims about, and check that each
// still says what the site says it does (a public repository, a published article, a listing).
//   node release-gate.mjs --config release-gate.json
// Config: { "checks": [ { "url": "https://...", "expect": ["text that must appear", ...],
//                          "forbid": ["text that must not appear"] } ] }
// Each URL gets 3 attempts with a 20 s timeout. "could not fetch" (network, timeout, 5xx, and the
// bot walls 401, 403, 408, 429, 999) is told apart from "content mismatch" (the page answered, or
// is 404/410, and does not say what the site claims): the first may be a passing outage or a
// fetcher being blocked (check those by hand in a browser), the second means the claim is wrong.
// Visible text only: scripts and styles are dropped and entities decoded before matching.
// Exit code 1 on any mismatch, 2 when only fetch failures remain.
import fs from 'node:fs';

const a = process.argv.slice(2);
const i = a.indexOf('--config');
const file = i > -1 ? a[i + 1] : 'release-gate.json';
if (!fs.existsSync(file)) { console.error(`release-gate: no config ${file}`); process.exit(1); }
const { checks = [] } = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!checks.length) { console.error('release-gate: no checks in the config'); process.exit(1); }

const fetchText = async (url) => {
  let last;
  for (let n = 1; n <= 3; n++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'follow', headers: { 'user-agent': 'release-gate/1.0' } });
      if (res.status >= 500 || [401, 403, 408, 429, 999].includes(res.status)) throw new Error(`HTTP ${res.status}`);
      return { status: res.status, text: await res.text() };
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1500 * n));
    }
  }
  return { error: last?.message || 'unknown error' };
};

const NAMED = { nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', amp: '&' };
const fold = (s) => s.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const visible = (html) => fold(html
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m));
let mismatch = 0;
let unreachable = 0;
for (const c of checks) {
  const r = await fetchText(c.url);
  if (r.error) { unreachable++; console.log(`COULD NOT FETCH  ${c.url}  (${r.error})`); continue; }
  const text = visible(r.text);
  const missing = (c.expect || []).filter((x) => !text.includes(fold(x)));
  const present = (c.forbid || []).filter((x) => text.includes(fold(x)));
  if (r.status >= 400 || missing.length || present.length) {
    mismatch++;
    console.log(`MISMATCH  ${c.url}  HTTP ${r.status}${missing.length ? `  missing: ${missing.map((x) => `"${x}"`).join(', ')}` : ''}${present.length ? `  present: ${present.map((x) => `"${x}"`).join(', ')}` : ''}`);
  } else console.log(`OK  ${c.url}`);
}
console.log(`release-gate: ${checks.length} check(s), ${mismatch} mismatch(es), ${unreachable} unreachable`);
process.exitCode = mismatch ? 1 : unreachable ? 2 : 0;
