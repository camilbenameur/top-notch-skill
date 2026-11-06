// After the build: replace 'unsafe-inline' in the CSP's script-src with the SHA-256 hashes of the
// inline scripts the built pages actually carry. JSON data blocks (application/json,
// application/ld+json) are not scripts and are not hashed.
//   node csp-hashes.mjs [dist] [--headers dist/_headers]
// The headers file (Cloudflare/Netlify `_headers` style, or any text file holding the CSP) must
// contain "script-src 'self' 'unsafe-inline'"; the script fails otherwise, so a silent no-op
// cannot ship. Re-run it after every build: any change to an inline script changes its hash.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const dist = a.find((x, i) => !x.startsWith('--') && a[i - 1] !== '--headers') || 'dist';
const file = opt('--headers', path.join(dist, '_headers'));
if (!fs.existsSync(dist)) { console.error(`csp-hashes: no folder ${path.resolve(dist)}`); process.exit(1); }
if (!fs.existsSync(file)) { console.error(`csp-hashes: no headers file ${path.resolve(file)}`); process.exit(1); }

const hashes = new Set();
const handlers = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) {
      const html = fs.readFileSync(p, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      // Inline event handlers and javascript: URLs cannot be allowed by a hash without
      // 'unsafe-hashes': once 'unsafe-inline' is gone they silently stop working.
      const h = html.match(/\son[a-z]+\s*=\s*["']|href\s*=\s*["']\s*javascript:/gi);
      if (h) handlers.push(`${path.relative(dist, p)}: ${[...new Set(h.map((x) => x.trim()))].join(', ')}`);
      for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
        const attrs = m[1] || '';
        if (/(?:^|\s)src\s*=/i.test(attrs) || /type\s*=\s*["']?application\/(ld\+)?json/i.test(attrs) || !m[2]) continue;
        hashes.add(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
      }
    }
  }
};
walk(dist);

const needle = "script-src 'self' 'unsafe-inline'";
const headers = fs.readFileSync(file, 'utf8');
if (!headers.includes(needle)) { console.error(`csp-hashes: ${file} has no "${needle}" to rewrite`); process.exit(1); }
fs.writeFileSync(file, headers.split(needle).join(`script-src 'self' ${[...hashes].sort().join(' ')}`));
console.log(`csp-hashes: script-src pinned to ${hashes.size} inline script hash(es) in ${file}`);
if (handlers.length) {
  console.log(`WARNING: inline event handlers or javascript: URLs will stop working; move them to scripts:\n  ${handlers.join('\n  ')}`);
  process.exitCode = 1;
}
