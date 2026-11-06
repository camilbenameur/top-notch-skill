// Focus indicator read in PIXELS, not in computed style. For each Tab stop (real key presses, so
// :focus-visible applies), the area around the focused element is captured with focus, then again
// after blur, and the changed pixels are counted. A computed `outline` can pass while
// `overflow: hidden` on a parent clips it to nothing on screen: this catches that.
// A stop passes when at least --factor x (width + height) pixels change (default 1.5, about a
// 1-px ring around three quarters of the box; WCAG 2.4.13 asks for more, so raise it if you aim
// for AAA). Stops that do not change at all are listed first.
//   node focus-probe.mjs <url> [--max 60] [--factor 1.5] [--width 1440] [--out .shots/focus.json]
// Run it with the project as the current folder so Playwright resolves from the project.
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './lib.mjs';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const url = a.find((x, i) => !x.startsWith('--') && !['--max', '--factor', '--width', '--out'].includes(a[i - 1]));
if (!url) { console.error('usage: node focus-probe.mjs <url> [--max 60] [--factor 1.5] [--width 1440] [--out .shots/focus.json]'); process.exit(1); }
const MAX = +opt('--max', 60);
const FACTOR = +opt('--factor', 1.5);
const W = +opt('--width', 1440);
const out = path.resolve(opt('--out', path.join('.shots', 'focus.json')));
const PAD = 8;

const browser = await launch();
const stops = [];
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, reducedMotion: 'reduce', bypassCSP: true });
  const page = await ctx.newPage();
  const lab = await ctx.newPage(); // decodes PNGs in a canvas, so no image library is needed
  await page.bringToFront();
  const res = await page.goto(url, { waitUntil: 'load' }).catch(() => null);
  if (!res || !res.ok()) { console.error(`focus-probe: ${url} answered ${res ? res.status() : 'nothing'}`); process.exitCode = 1; throw new Error('load'); }
  await page.waitForTimeout(1200);
  // No transitions, so the ring is measured fully drawn and fully gone (a 200-300 ms fade would
  // otherwise be caught halfway). Iframes are not entered: a Tab stop inside one ends the walk.
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}' });
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });

  const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const current = () => page.evaluate(() => {
    const e = document.activeElement;
    if (!e || e === document.body || e === document.documentElement) return null;
    if (!e.hasAttribute('data-focus-probe')) e.setAttribute('data-focus-probe', String(document.querySelectorAll('[data-focus-probe]').length));
    const r = e.getBoundingClientRect();
    const name = (e.getAttribute('aria-label') || e.textContent || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 40);
    return { id: e.getAttribute('data-focus-probe'), name: `${e.tagName.toLowerCase()} "${name}"`, x: r.x, y: r.y, w: r.width, h: r.height, focusVisible: e.matches(':focus-visible') };
  });
  const diff = (b1, b2) => lab.evaluate(async ([s1, s2]) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
    const [i1, i2] = await Promise.all([load(s1), load(s2)]);
    const c = document.createElement('canvas'); c.width = i1.width; c.height = i1.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(i1, 0, 0); const d1 = g.getImageData(0, 0, c.width, c.height).data;
    g.clearRect(0, 0, c.width, c.height); g.drawImage(i2, 0, 0); const d2 = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let k = 0; k < d1.length; k += 4) if (Math.abs(d1[k] - d2[k]) + Math.abs(d1[k + 1] - d2[k + 1]) + Math.abs(d1[k + 2] - d2[k + 2]) > 60) n++;
    return n;
  }, [b1.toString('base64'), b2.toString('base64')]);

  const seen = new Set();
  let end = 'max';
  for (let i = 1; i <= MAX; i++) {
    await page.keyboard.press('Tab');
    await frames();
    await page.waitForTimeout(120);
    const s = await current();
    if (!s) { end = 'left the page'; break; }
    if (seen.has(s.id)) { end = 'cycled'; break; }
    seen.add(s.id);
    const vp = page.viewportSize();
    const clip = { x: Math.max(0, s.x - PAD), y: Math.max(0, s.y - PAD) };
    clip.width = Math.min(vp.width, s.x + s.w + PAD) - clip.x;
    clip.height = Math.min(vp.height, s.y + s.h + PAD) - clip.y;
    if (clip.width < 2 || clip.height < 2 || s.w < 1 || s.h < 1) { stops.push({ stop: i, ...s, measurable: false, why: 'off screen or zero size' }); continue; }
    const focused = await page.screenshot({ clip, scale: 'css' });
    await page.evaluate(() => document.activeElement.blur());
    await frames();
    await page.waitForTimeout(80);
    const blurred = await page.screenshot({ clip, scale: 'css' });
    await page.evaluate((id) => document.querySelector(`[data-focus-probe="${id}"]`)?.focus({ preventScroll: true }), s.id);
    await frames();
    const changed = await diff(focused, blurred);
    const need = Math.round(FACTOR * (s.w + s.h));
    stops.push({ stop: i, name: s.name, w: Math.round(s.w), h: Math.round(s.h), focusVisible: s.focusVisible, changed, need, ok: changed >= need });
  }
  const bad = stops.filter((s) => s.measurable !== false && !s.ok).sort((x, y) => x.changed - y.changed);
  console.log(`${url}: ${stops.length} Tab stops (${end}), ${bad.length} with a weak or invisible focus indicator`);
  for (const s of bad) console.log(`  stop ${s.stop} ${s.name} ${s.w}x${s.h}: ${s.changed} px changed, ${s.need} needed${s.focusVisible ? '' : ' (no :focus-visible)'}`);
  if (stops[0]) console.log(`  first stop: ${stops[0].name} (should be the skip link)`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ url, end, stops }, null, 2));
  const measured = stops.filter((s) => s.measurable !== false).length;
  if (!measured) console.log('  no measurable Tab stop: nothing was checked');
  process.exitCode = bad.length || !measured ? 1 : 0;
} catch (e) {
  if (e.message !== 'load') throw e;
} finally {
  await browser.close();
}
