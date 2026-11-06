// Layout check across sizes: no horizontal overflow from 320 to 1920 px, and the first screen fits
// (bottom of the h1, of the main call to action with --cta, and of the last element that must be
// seen with --last, all visible without scrolling; at most 4 h1 lines from 1024 px up).
//   node viewports.mjs <base-url> [--pages /,/pricing/] [--cta "<selector of the hero's main button>"]
//                     [--last "<selector of the last element of the first screen, e.g. a status line>"]
// Prints one line per failure, or a single OK line; exit code 1 on failure, including when --cta
// or --last match nothing (a wrong selector must not pass silently) or match a hidden element.
// Overflow is checked on the document and on each element, because sites that set
// overflow-x: hidden on html or body hide a real overflow from the document check.
// Not checked here, look at the first-screen captures: hero top and bottom gaps (both >= 24 px,
// within 2:1) and an orphan button alone on a line.
// Run it with the project as the current folder so Playwright resolves from the project.
// Under Git Bash on Windows, prefix MSYS_NO_PATHCONV=1 so "--pages /" is not rewritten into a path.
import { launch } from './lib.mjs';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const base = a.find((x, i) => !x.startsWith('--') && !['--pages', '--cta', '--last'].includes(a[i - 1]));
if (!base) { console.error('usage: node viewports.mjs <base-url> [--pages /,/pricing/] [--cta "<selector>"] [--last "<selector>"]'); process.exit(1); }
try { new URL(base); } catch { console.error(`not a URL: ${base} (pass a full http(s):// URL)`); process.exit(1); }
const pages = opt('--pages', '/').split(/,(?=\/)/);
for (const p of pages) if (!p.startsWith('/') || /^\/?[A-Za-z]:/.test(p)) { console.error(`bad page "${p}": paths start with / (under Git Bash, prefix MSYS_NO_PATHCONV=1)`); process.exit(1); }
const cta = opt('--cta', null);
const last = opt('--last', null);
const WIDTHS = [320, 360, 390, 768, 1024, 1280, 1440, 1920];
const HERO = [[1280, 720], [1366, 768], [1440, 780], [1920, 1080], [375, 812], [390, 844]];

const browser = await launch();
const bad = [];
try {
  const page = await (await browser.newContext({ reducedMotion: 'reduce' })).newPage();
  let ctaSeen = false; // --cta and --last are checked on the pages that have them; each must exist on at least one
  let lastSeen = false;
  const visit = async (p, w, h) => {
    await page.setViewportSize({ width: w, height: h });
    const res = await page.goto(new URL(p, base).href, { waitUntil: 'load' }).catch(() => null);
    await page.waitForTimeout(600);
    return res && res.ok();
  };
  for (const p of pages) {
    await page.setViewportSize({ width: 1280, height: 800 });
    const first = await page.goto(new URL(p, base).href, { waitUntil: 'load' }).catch(() => null);
    if (!first || !first.ok()) { bad.push(`${p}: answered ${first ? first.status() : 'nothing'}`); continue; }
    for (const w of WIDTHS) {
      await visit(p, w, 800);
      const o = await page.evaluate(() => {
        const doc = document.documentElement.scrollWidth - innerWidth;
        let el = null;
        for (const e of document.querySelectorAll('body *')) {
          const r = e.getBoundingClientRect();
          if (!r.width || r.right <= innerWidth + 1) continue;
          const cs = getComputedStyle(e);
          if (cs.position === 'fixed' || cs.visibility === 'hidden') continue;
          // Ignore elements inside a clipping or scrolling ancestor (carousels, tables in a wrapper).
          let clipped = false;
          for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
            const ox = getComputedStyle(p).overflowX;
            if (ox !== 'visible') { clipped = true; break; }
          }
          if (clipped) continue;
          el = `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} (right edge ${Math.round(r.right)})`;
          break;
        }
        return { doc, el };
      });
      if (o.doc > 1) bad.push(`${p} ${w}px: horizontal overflow of ${o.doc}px`);
      else if (o.el) bad.push(`${p} ${w}px: element past the right edge, hidden by an overflow rule: ${o.el}`);
    }
    for (const [w, h] of HERO) {
      await visit(p, w, h);
      const r = await page.evaluate(([sel, lastSel]) => {
        // null: no such element; -1: present but not rendered (display:none or zero size)
        const bottom = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return b.width && b.height ? b.bottom : -1; };
        const h1 = document.querySelector('main h1') || document.querySelector('h1');
        let lines = null;
        if (h1) {
          // Count rendered lines: cluster the text fragments by their vertical centre, in units of
          // the h1's line height, so a smaller span on the same line does not count as a new line.
          const cs = getComputedStyle(h1);
          const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
          const rows = new Set();
          const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (!n.textContent.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(n);
            for (const rect of range.getClientRects()) if (rect.width > 1) rows.add(Math.round((rect.top + rect.bottom) / 2 / lh));
          }
          lines = rows.size;
        }
        return { h1: bottom(h1), lines, cta: sel ? bottom(document.querySelector(sel)) : null, last: lastSel ? bottom(document.querySelector(lastSel)) : null, vh: innerHeight };
      }, [cta, last]);
      if (r.cta != null && r.cta !== -1) ctaSeen = true;
      if (r.last != null && r.last !== -1) lastSeen = true;
      const show = (v) => (v == null ? 'none' : v === -1 ? 'hidden' : Math.round(v));
      if (r.h1 == null) { bad.push(`${p} ${w}x${h}: no h1`); continue; }
      const cut = r.h1 === -1 || r.h1 > r.vh || (r.cta != null && (r.cta === -1 || r.cta > r.vh)) || (r.last != null && (r.last === -1 || r.last > r.vh));
      if (cut) bad.push(`${p} ${w}x${h}: first screen cut (h1 bottom ${show(r.h1)}, cta bottom ${show(r.cta)}, last bottom ${show(r.last)}, viewport ${r.vh})`);
      if (w >= 1024 && r.lines > 4) bad.push(`${p} ${w}x${h}: h1 on ${r.lines} lines (4 at most on desktop)`);
    }
  }
  if (cta && !ctaSeen) bad.push(`--cta "${cta}" matches nothing visible on ${pages.join(', ')}`);
  if (last && !lastSeen) bad.push(`--last "${last}" matches nothing visible on ${pages.join(', ')}`);
  console.log(bad.length ? bad.join('\n') : `OK: ${pages.length} page(s), ${WIDTHS.length} widths, ${HERO.length} first-screen sizes`);
} finally {
  await browser.close();
}
process.exitCode = bad.length ? 1 : 0;
