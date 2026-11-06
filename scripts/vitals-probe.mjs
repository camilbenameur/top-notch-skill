// CLS and blocking time on a throttled phone, several runs, with the sources of every layout
// shift, the long tasks and the LCP element. Use it when Lighthouse and shoot.mjs disagree, or to
// prove that CLS stays near 0 when the web font arrives late (--slow-font).
//   node vitals-probe.mjs <url> [--runs 5] [--cpu 4] [--slow-font 2500] [--scroll] [--out .shots/vitals.json]
// --cpu       CPU slowdown factor (Chrome DevTools protocol), default 4
// --slow-font delays every font response by this many ms, to expose shifts caused by the swap
// --scroll    scrolls the page once after load (shifts caused by lazy content and reveals)
// Blocking time here = the sum over long tasks of (duration - 50 ms) from navigation to 5 s after
// load, under real CPU throttling. It runs well above Lighthouse's simulated TBT, so it is a
// diagnostic (which tasks block, when), not the gate: gate on Lighthouse TBT. The longest tasks are
// listed with their start time. Exit code 1 when the median CLS is >= 0.02.
// Run it with the project as the current folder so Playwright resolves from the project.
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './lib.mjs';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const url = a.find((x, i) => !x.startsWith('--') && !['--runs', '--cpu', '--slow-font', '--out'].includes(a[i - 1]));
if (!url) { console.error('usage: node vitals-probe.mjs <url> [--runs 5] [--cpu 4] [--slow-font 2500] [--scroll] [--out .shots/vitals.json]'); process.exit(1); }
const RUNS = Math.max(1, +opt('--runs', 5) || 5);
const CPU = Math.max(1, +opt('--cpu', 4) || 4);
const SLOW = +opt('--slow-font', 0) || 0;
const SCROLL = a.includes('--scroll');
const out = path.resolve(opt('--out', path.join('.shots', 'vitals.json')));

// CLS as browsers define it: the largest session window (shifts less than 1 s apart, a window
// lasting at most 5 s). clsTotal is the plain sum, for reference.
const OBSERVE = () => {
  window.__v = { cls: 0, clsTotal: 0, shifts: [], long: [], lcp: null };
  let win = 0; let winStart = -1; let lastT = -1;
  const name = (n) => (n && n.nodeType === 1 ? `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}${typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}` : '?');
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      if (lastT < 0 || e.startTime - lastT >= 1000 || e.startTime - winStart >= 5000) { win = 0; winStart = e.startTime; }
      win += e.value; lastT = e.startTime;
      window.__v.cls = Math.max(window.__v.cls, win);
      window.__v.clsTotal += e.value;
      window.__v.shifts.push({ t: Math.round(e.startTime), value: +e.value.toFixed(4), sources: (e.sources || []).map((s) => name(s.node)) });
    }
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.long.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => { const e = l.getEntries().pop(); if (e) window.__v.lcp = { t: Math.round(e.startTime), el: name(e.element) }; }).observe({ type: 'largest-contentful-paint', buffered: true });
};

const median = (xs) => { const s = [...xs].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const browser = await launch();
const runs = [];
try {
  for (let i = 1; i <= RUNS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    if (SLOW) await page.route(/\.(woff2?|ttf|otf)(\?|$)/i, async (route) => { await new Promise((r) => setTimeout(r, SLOW)); await route.continue(); });
    await page.addInitScript(OBSERVE);
    const u = new URL(url); u.searchParams.set('vp', String(i));
    const res = await page.goto(u.href, { waitUntil: 'load', timeout: 60000 }).catch(() => null);
    if (!res || !res.ok()) { console.error(`run ${i}: ${url} answered ${res ? res.status() : 'nothing'}`); process.exitCode = 1; await ctx.close(); continue; }
    if (SCROLL) await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); } });
    await page.waitForTimeout(5000 + SLOW);
    const v = await page.evaluate(() => window.__v);
    const tbt = v.long.reduce((s, x) => s + Math.max(0, x.d - 50), 0);
    runs.push({ run: i, cls: +v.cls.toFixed(4), clsTotal: +v.clsTotal.toFixed(4), tbt, longTasks: v.long.length, lcp: v.lcp, shifts: v.shifts });
    console.log(`run ${i}: CLS ${v.cls.toFixed(4)} (sum ${v.clsTotal.toFixed(4)})  blocking ${tbt} ms (${v.long.length} long tasks)  LCP ${v.lcp ? `${v.lcp.t} ms on ${v.lcp.el}` : 'n/a'}`);
    for (const s of v.shifts.filter((x) => x.value >= 0.001)) console.log(`   shift ${s.value} at ${s.t} ms: ${s.sources.join(', ') || 'unknown source'}`);
    const top = [...v.long].sort((x, y) => y.d - x.d).slice(0, 3);
    if (top.length) console.log(`   longest tasks: ${top.map((x) => `${x.d} ms at ${x.t} ms`).join(', ')}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
if (runs.length) {
  const m = { cls: median(runs.map((r) => r.cls)), tbt: median(runs.map((r) => r.tbt)) };
  console.log(`MEDIAN over ${runs.length} run(s), CPU ${CPU}x${SLOW ? `, fonts delayed ${SLOW} ms` : ''}: CLS ${m.cls}  blocking ${m.tbt} ms`);
  if (m.cls >= 0.02) process.exitCode = 1;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ url, cpu: CPU, slowFont: SLOW, median: m, runs }, null, 2));
  console.log(`-> ${out}`);
}
