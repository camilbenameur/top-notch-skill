// Dump the visible text of every page of a site into one file, for copy reviews
// (workflows/copy-review.js) and for the distill pass (workflows/distill-site.js).
// Headings are marked [H1] [H2] [H3]; each page starts with its path, <title> and meta description.
// Closed <details> are opened, text-transform is neutralised (quotes must match the source) and
// non-breaking spaces become plain spaces. The 404 page is read last.
// --force-visible also overrides content-visibility (innerText skips content-visibility:auto
// sections that are off screen) and visibility:hidden reveal states.
// Exit code 1 when no page could be read.
//   node page-text.mjs <url | build-dir> [--out .shots/text.txt] [--max 40] [--force-visible]
// Run it with the project as the current folder so Playwright resolves from the project.
import fs from 'node:fs';
import path from 'node:path';
import { launch, serve } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
const target = args.find((a, i) => !a.startsWith('--') && !['--out', '--max'].includes(args[i - 1]));
if (!target) { console.error('usage: node page-text.mjs <url | build-dir> [--out .shots/text.txt] [--max 40] [--force-visible]'); process.exit(1); }
const out = opt('--out', path.join('.shots', 'text.txt'));
const max = Math.max(1, +opt('--max', 40) || 40);
const force = args.includes('--force-visible');
const CSS = '*,*::before,*::after{text-transform:none!important}'
  + (force ? '*{content-visibility:visible!important;visibility:visible!important}' : '');

let server, start = target;
if (!/^https?:\/\//.test(target)) {
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) { console.error(`${path.resolve(target)} is not a folder. Build first, or pass a full http(s):// URL.`); process.exit(1); }
  server = await serve(target, 0);
  start = `http://127.0.0.1:${server.address().port}/`;
}
const origin = new URL(start).origin;
const NBSP = /[  ]/g;
const browser = await launch();
try {
  // Reduced motion so text that animates in is already visible; bypassCSP so the style tag applies.
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 }, bypassCSP: true });
  const page = await ctx.newPage();

  const read = async () => {
    await page.addStyleTag({ content: CSS });
    return page.evaluate(() => {
      document.querySelectorAll('details').forEach((d) => { d.open = true; });
      document.querySelectorAll('h1, h2, h3').forEach((h) => h.prepend(`[${h.tagName}] `));
      return {
        title: document.title,
        meta: document.querySelector('meta[name="description"]')?.content ?? '',
        text: document.body.innerText,
        links: [...document.querySelectorAll('a[href]')].map((a) => a.href),
      };
    });
  };
  const block = (p, d) => `===== PAGE ${p}\nTITLE: ${d.title}\nMETA: ${d.meta}\n${d.text.replace(/\n{3,}/g, '\n\n').trim()}\n`.replace(NBSP, ' ');

  const norm = (p) => p.replace(/(.)\/$/, '$1');
  const queue = [new URL(start).pathname + new URL(start).search];
  const seen = new Set([norm(new URL(start).pathname)]);
  const done = new Set();
  const parts = [];
  while (queue.length && parts.length < max) {
    const p = queue.shift();
    const res = await page.goto(origin + p, { waitUntil: 'load', timeout: 30000 }).catch(() => null);
    if (!res || !res.ok()) { console.error(`skip ${p} (${res ? res.status() : 'no response'})`); continue; }
    const landed = norm(new URL(page.url()).pathname); // after redirects (/about -> /about/)
    if (done.has(landed)) continue;
    done.add(landed);
    await page.waitForTimeout(1200);
    const data = await read();
    parts.push(block(p, data));
    for (const href of data.links) {
      let u;
      try { u = new URL(href); } catch { continue; }
      if (u.origin !== origin || /\.(pdf|png|jpe?g|webp|avif|gif|svg|xml|txt|zip|ico)$/i.test(u.pathname)) continue;
      if (!seen.has(norm(u.pathname))) { seen.add(norm(u.pathname)); queue.push(u.pathname); }
    }
  }
  if (!parts.length) {
    console.error('page-text: no page could be read (is the server up, is the start URL right?)');
    process.exitCode = 1;
    throw new Error('no page');
  }

  const miss = await page.goto(`${origin}/__page-text-not-found`, { waitUntil: 'load', timeout: 30000 }).catch(() => null);
  if (miss && miss.status() === 404) {
    await page.waitForTimeout(1200);
    parts.push(block('/404 (not found page)', await read()));
  } else console.error(`no 404 page (status ${miss ? miss.status() : 'none'})`);

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, parts.join('\n'), 'utf8');
  const words = parts.join(' ').split(/\s+/).filter(Boolean).length;
  console.log(`${parts.length} pages, ${words} words -> ${path.resolve(out)}`);
  if (queue.length) console.log(`not read (--max ${max}): ${queue.join(' ')}`);
} catch (e) {
  if (e.message !== 'no page') throw e;
} finally {
  await browser.close();
  server?.close();
}
