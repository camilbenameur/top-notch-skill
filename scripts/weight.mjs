// Real weight of a page: everything the browser downloads, imported modules included, by resource
// type, at phone size after a full scroll (so lazy images count). Text resources are counted
// gzipped (a local static server usually does not compress). Media (video) is left out.
//   node weight.mjs <url> [--max-total 1024] [--max-js 100] [--max-font 150]     (KB)
// Exit code 1 when the page does not load or a ceiling is exceeded (defaults: the top-notch bar;
// a Next.js site passes --max-js 200).
// Run it with the project as the current folder so Playwright resolves from the project.
import zlib from 'node:zlib';
import { launch } from './lib.mjs';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? +a[i + 1] : d; };
const url = a.find((x, i) => !x.startsWith('--') && !['--max-total', '--max-js', '--max-font'].includes(a[i - 1]));
if (!url) { console.error('usage: node weight.mjs <url> [--max-total 1024] [--max-js 100] [--max-font 150]'); process.exit(1); }
const MAX = { total: opt('--max-total', 1024), script: opt('--max-js', 100), font: opt('--max-font', 150) };

const browser = await launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const tally = {};
  const jobs = [];
  page.on('response', (r) => jobs.push((async () => {
    const type = r.request().resourceType();
    if (type === 'media') return;
    const body = await r.body().catch(() => null);
    if (!body) return;
    const text = /javascript|css|html|json|svg/.test(r.headers()['content-type'] || '');
    tally[type] = (tally[type] || 0) + (text ? zlib.gzipSync(body).length : body.length);
  })()));
  const res = await page.goto(url, { waitUntil: 'load' }).catch((e) => { console.error(e.message.split('\n')[0]); return null; });
  if (!res || !res.ok()) { console.error(`weight: ${url} answered ${res ? res.status() : 'nothing'}`); process.exitCode = 1; }
  else {
    // Scroll to the bottom in steps so lazy images and late modules load, then settle.
    // Capped at 40 screens, so an infinite feed cannot hang the run.
    await page.evaluate(async () => {
      const end = Math.min(document.documentElement.scrollHeight, 40 * innerHeight);
      for (let y = 0; y < end; y += innerHeight) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }
    });
    await page.waitForTimeout(1500);
    await Promise.all(jobs);
    const kb = (n) => Math.round(n / 1024);
    const total = Object.values(tally).reduce((x, y) => x + y, 0);
    for (const [k, v] of Object.entries(tally).sort((x, y) => y[1] - x[1])) console.log(`${k.padEnd(12)} ${kb(v)} KB`);
    console.log(`${'total'.padEnd(12)} ${kb(total)} KB`);
    const over = [];
    if (total > MAX.total * 1024) over.push(`total ${kb(total)} KB > ${MAX.total}`);
    if ((tally.script || 0) > MAX.script * 1024) over.push(`script ${kb(tally.script)} KB > ${MAX.script}`);
    if ((tally.font || 0) > MAX.font * 1024) over.push(`font ${kb(tally.font)} KB > ${MAX.font}`);
    if (over.length) { console.log(`OVER: ${over.join(', ')}`); process.exitCode = 1; }
  }
} finally {
  await browser.close();
}
