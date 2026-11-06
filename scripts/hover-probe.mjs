// Hover EVERY interactive target of a page, not one per class signature as shoot.mjs does (which
// tested 6 targets on a page that had 22). For each visible, enabled target: computed style at
// rest, then with the mouse on it (after 450 ms, past 150-300 ms transitions). Each target is
// classed "none" (nothing changes), "color" (only colours or underline change) or "motion"
// (something beyond colour: transform, shadow, outline, opacity, filter, background image...).
// Critics deduct for colour-only hovers on nav links, footer links, cards and rows, so read the
// "color" list too, not only "none".
//   node hover-probe.mjs <base-url> [--pages /,/about/] [--out .shots/hover.json] [--max 60] [--width 1440]
// Run it with the project as the current folder so Playwright resolves from the project.
// Under Git Bash on Windows, prefix MSYS_NO_PATHCONV=1 so "--pages /" is not rewritten.
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './lib.mjs';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const base = a.find((x, i) => !x.startsWith('--') && !['--pages', '--out', '--max', '--width'].includes(a[i - 1]));
if (!base) { console.error('usage: node hover-probe.mjs <base-url> [--pages /,/about/] [--out .shots/hover.json] [--max 60] [--width 1440]'); process.exit(1); }
const pages = opt('--pages', '/').split(/,(?=\/)/);
const out = path.resolve(opt('--out', path.join('.shots', 'hover.json')));
const MAX = +opt('--max', 60);
const W = +opt('--width', 1440);
const COLOR = new Set(['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'textDecorationLine', 'textDecorationColor', 'outlineColor', 'fill', 'stroke']);
const PROPS = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'textDecorationLine', 'textDecorationColor', 'fill', 'stroke', 'opacity', 'transform', 'translate', 'scale', 'boxShadow', 'outlineStyle', 'outlineColor', 'filter', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'letterSpacing'];

const browser = await launch();
const results = {};
try {
  const page = await (await browser.newContext({ viewport: { width: W, height: 900 } })).newPage();
  for (const p of pages) {
    const res = await page.goto(new URL(p, base).href, { waitUntil: 'load' }).catch(() => null);
    if (!res || !res.ok()) { console.error(`${p}: answered ${res ? res.status() : 'nothing'}`); results[p] = { error: `HTTP ${res ? res.status() : 'none'}`, none: [], fieldsNone: [] }; continue; }
    await page.waitForTimeout(1500);
    await page.mouse.move(2, 898);
    const targets = await page.evaluate((max) => {
      const sel = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="link"], summary, input:not([type="hidden"]), select, textarea, label[for]';
      const seen = [];
      for (const e of document.querySelectorAll(sel)) {
        if (e.disabled || e.getAttribute('aria-disabled') === 'true' || e.closest('[aria-hidden="true"], [hidden], [inert]')) continue;
        const r = e.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || getComputedStyle(e).visibility === 'hidden') continue;
        const name = (e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 40);
        e.setAttribute('data-hover-probe', String(seen.length));
        seen.push({ i: seen.length, name: `${e.tagName.toLowerCase()} "${name}"`, w: Math.round(r.width), h: Math.round(r.height), inNav: !!e.closest('nav, header'), inFooter: !!e.closest('footer'), field: /^(INPUT|SELECT|TEXTAREA|LABEL)$/.test(e.tagName) });
        if (seen.length >= max) break;
      }
      return seen;
    }, MAX);
    const rows = [];
    for (const t of targets) {
      const loc = page.locator(`[data-hover-probe="${t.i}"]`);
      try {
        await loc.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.mouse.move(2, 898);
        await page.waitForTimeout(350);
        const box = await loc.boundingBox();
        if (!box) continue;
        const at = { x: box.x + box.width * 0.4, y: box.y + box.height * 0.5 };
        const onTop = await loc.evaluate((e, { x, y }) => { const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)); }, at);
        if (!onTop) { rows.push({ ...t, reaction: 'covered' }); continue; }
        // The element, its descendants (hover effects often live on a nested span or an icon) and
        // the ::before / ::after of each. Keys look like "2::after transform".
        // A card or row whose hover effect lives on the container (".card:hover img") is
        // snapshotted from the container when it is small enough.
        const snap = () => loc.evaluate((e, props) => {
          const o = { cursor: getComputedStyle(e).cursor };
          const box = e.closest('li, article, tr, [class*="card"], [class*="row"]');
          const root = box && box.querySelectorAll('*').length <= 40 ? box : e;
          [root, ...root.querySelectorAll('*')].slice(0, 40).forEach((x, i) => {
            for (const ps of ['', '::before', '::after']) {
              const cs = getComputedStyle(x, ps || null);
              if (ps && (cs.content === 'none' || cs.content === 'normal')) continue;
              for (const k of props) o[`${i}${ps} ${k}`] = cs[k];
              if (ps || i) { o[`${i}${ps} width`] = cs.width; o[`${i}${ps} clipPath`] = cs.clipPath; }
            }
          });
          return o;
        }, PROPS);
        const rest = await snap();
        await page.mouse.move(at.x, at.y, { steps: 5 });
        await page.waitForTimeout(450);
        const hover = await snap();
        const changes = Object.keys(rest).filter((k) => k !== 'cursor' && rest[k] !== hover[k]);
        const reaction = !changes.length ? 'none' : changes.every((k) => COLOR.has(k.split(' ')[1])) ? 'color' : 'motion';
        rows.push({ ...t, reaction, changes, cursor: hover.cursor });
      } catch (e) {
        rows.push({ ...t, reaction: 'error', message: String(e.message).split('\n')[0] });
      }
    }
    const measured = rows.filter((r) => r.reaction !== 'covered' && r.reaction !== 'error');
    results[p] = {
      found: targets.length,
      hovered: measured.length,
      none: measured.filter((r) => r.reaction === 'none' && !r.field).map((r) => `${r.name} (${r.w}x${r.h})`),
      fieldsNone: measured.filter((r) => r.reaction === 'none' && r.field).map((r) => `${r.name} (${r.w}x${r.h})`),
      colorOnly: measured.filter((r) => r.reaction === 'color').map((r) => `${r.name}${r.inNav ? ' [nav]' : r.inFooter ? ' [footer]' : ''}`),
      motion: measured.filter((r) => r.reaction === 'motion').length,
      notPointer: measured.filter((r) => /^(a|button|summary)\b/.test(r.name) && r.cursor !== 'pointer').map((r) => `${r.name} cursor:${r.cursor}`),
      small: rows.filter((r) => r.w < 24 || r.h < 24).map((r) => `${r.name} ${r.w}x${r.h}`),
      covered: rows.filter((r) => r.reaction === 'covered').map((r) => r.name),
      errors: rows.filter((r) => r.reaction === 'error').map((r) => `${r.name} ${r.message}`),
      detail: rows,
    };
    if (targets.length >= MAX) results[p].note = `stopped at --max ${MAX}: raise it to cover every target`;
    console.log(`${p}: ${measured.length} hovered, ${results[p].none.length} with no change, ${results[p].colorOnly.length} colour-only, ${results[p].motion} beyond colour, ${results[p].small.length} under 24 px`);
  }
} finally {
  await browser.close();
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(results, null, 2));
console.log(`-> ${out}`);
// Fail on any target with no hover change (links, buttons, summaries, role targets) and on a page
// that did not load; form fields and labels with no change are reported (fieldsNone) but do not fail.
process.exitCode = Object.values(results).some((r) => r.error || r.none.length) ? 1 : 0;
