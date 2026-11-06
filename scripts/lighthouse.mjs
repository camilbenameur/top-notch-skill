// Lighthouse, run several times per page and mode, gated on the median of each metric.
// Exit code 1 when a category median is under the minimum (95 on mobile, 100 on desktop by
// default) or when a page fails to load.
// The browser is launched through Playwright with a remote debugging port, which avoids the
// chrome-launcher failures seen on some Windows machines ("spawn UNKNOWN").
//   node lighthouse.mjs <url> [<url>...] [--runs 3] [--modes mobile,desktop] [--out .shots/lh]
//                      [--min-mobile 95] [--min-desktop 100] [--port 9334]
// Needs `lighthouse` and `playwright` in the project (npm i -D lighthouse playwright). Run it with
// the project as the current folder. Set CHROME_PATH to force a browser (system Chrome or Edge is
// steadier than a bundled Chromium). Close every other heavy process first: a busy machine
// lowers mobile scores (watch the benchmarkIndex column; ~800 quiet, ~500 busy).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const urls = a.filter((x, i) => !x.startsWith('--') && !['--runs', '--modes', '--out', '--port', '--min-mobile', '--min-desktop'].includes(a[i - 1]));
if (!urls.length) { console.error('usage: node lighthouse.mjs <url> [<url>...] [--runs 3] [--modes mobile,desktop] [--out .shots/lh] [--min-mobile 95] [--min-desktop 100]'); process.exit(1); }
for (const u of urls) { try { new URL(u); } catch { console.error(`not a URL: ${u} (pass a full http(s):// URL)`); process.exit(1); } }
const runs = Math.max(1, +opt('--runs', 3) || 3);
const MIN = { mobile: +opt('--min-mobile', 95), desktop: +opt('--min-desktop', 100) };
const modes = opt('--modes', 'mobile,desktop').split(',');
if (modes.some((m) => !(m in MIN))) { console.error(`--modes takes mobile and/or desktop (got ${modes.join(',')})`); process.exit(1); }
const out = opt('--out', path.join('.shots', 'lh'));
const port = +opt('--port', 9334);

const req = createRequire(path.join(process.cwd(), 'noop.js'));
const load = async (name) => {
  try { return await import(pathToFileURL(req.resolve(name)).href); } catch (e) {
    console.error(`Cannot load "${name}" from ${process.cwd()}. Run: npm i -D lighthouse playwright`);
    process.exit(1);
  }
};
const lighthouse = (await load('lighthouse')).default;
const desktopConfig = (await load('lighthouse/core/config/desktop-config.js')).default;
const pw = await load('playwright');
const chromium = pw.chromium || pw.default?.chromium;

const args = [`--remote-debugging-port=${port}`];
const tries = [
  process.env.CHROME_PATH && { executablePath: process.env.CHROME_PATH },
  { channel: 'chrome' }, { channel: 'msedge' }, {},
].filter(Boolean);
let browser;
for (const t of tries) {
  try { browser = await chromium.launch({ ...t, args }); break; } catch {}
}
if (!browser) { console.error('No browser could be launched. Set CHROME_PATH or run: npx playwright install chromium'); process.exit(1); }

const median = (xs) => { const s = [...xs].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
fs.mkdirSync(out, { recursive: true });
const summary = [];
try {
  for (const [n, url] of urls.entries()) {
    const U = new URL(url);
    const slug = `${n + 1}-${U.host}${U.pathname}`.replace(/[^a-z0-9]+/gi, '_').replace(/_$/, '');
    for (const mode of modes) {
      const rows = [];
      for (let i = 1; i <= runs; i++) {
        const u = new URL(url); u.searchParams.set('lh', `${mode}${i}`); // cache-busting
        const res = await lighthouse(u.href, { port, output: 'json', logLevel: 'error' }, mode === 'desktop' ? desktopConfig : undefined).catch((e) => ({ error: e }));
        if (!res?.lhr || res.lhr.runtimeError) {
          console.error(`${u.href} ${mode} #${i}: ${res?.lhr?.runtimeError?.message || res?.error?.message || 'no result'}`);
          process.exitCode = 1;
          continue;
        }
        const r = res.lhr; const au = r.audits;
        const num = (id, d = 0) => { const v = au[id]?.numericValue; return v == null ? null : +v.toFixed(d); };
        const mw = au['mainthread-work-breakdown']?.details?.items || [];
        const row = {
          run: i,
          ...Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, v.score == null ? null : Math.round(v.score * 100)])),
          lcp: num('largest-contentful-paint'),
          tbt: num('total-blocking-time'),
          cls: num('cumulative-layout-shift', 3),
          styleLayout: Math.round((mw.find((x) => x.group === 'styleLayout') || {}).duration || 0),
          benchmarkIndex: Math.round(r.environment?.benchmarkIndex || 0),
          failing: Object.values(r.categories).flatMap((c) => c.auditRefs.filter((ref) => au[ref.id].score !== null && au[ref.id].score < 1 && ref.weight > 0).map((ref) => `${c.id}:${ref.id}`)),
        };
        rows.push(row);
        fs.writeFileSync(path.join(out, `${slug}-${mode}-${i}.json`), res.report);
        console.log(`${slug} ${mode} #${i}  perf ${row.performance}  a11y ${row.accessibility}  bp ${row['best-practices']}  seo ${row.seo}  LCP ${row.lcp}  TBT ${row.tbt}  CLS ${row.cls}  style ${row.styleLayout}  bench ${row.benchmarkIndex}`);
      }
      if (!rows.length) { console.error(`${slug} ${mode}: no run produced a result`); process.exitCode = 1; continue; }
      const keys = ['performance', 'accessibility', 'best-practices', 'seo', 'lcp', 'tbt', 'cls'];
      const vals = (k) => rows.map((r) => r[k]).filter((v) => v != null);
      const med = Object.fromEntries(keys.map((k) => [k, vals(k).length ? median(vals(k)) : null]));
      const failing = [...new Set(rows.flatMap((r) => r.failing))];
      const low = ['performance', 'accessibility', 'best-practices', 'seo'].filter((k) => med[k] == null || med[k] < MIN[mode]);
      if (low.length) process.exitCode = 1;
      summary.push({ page: slug, mode, runs: rows.length, median: med, min: Object.fromEntries(keys.map((k) => [k, Math.min(...vals(k))])), max: Object.fromEntries(keys.map((k) => [k, Math.max(...vals(k))])), belowMinimum: low, failing });
      console.log(`${slug} ${mode} MEDIAN  perf ${med.performance}  a11y ${med.accessibility}  bp ${med['best-practices']}  seo ${med.seo}  LCP ${med.lcp}  TBT ${med.tbt}  CLS ${med.cls}${low.length ? `\n  BELOW ${MIN[mode]}: ${low.join(', ')}` : ''}${failing.length ? `\n  failing audits: ${failing.join(', ')}` : ''}`);
    }
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`summary -> ${path.resolve(out, 'summary.json')}`);
