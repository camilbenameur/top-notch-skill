// French typography pass on the built HTML (run after the build). An example of a per-locale step:
// write the equivalent for your own language, or skip it for English.
// Text between tags only, never inside <script>, <style>, <pre>, <code> or <textarea>, never in
// attributes:
//   « mot »         -> narrow no-break space inside the guillemets
//   mot : ; ! ?     -> no-break space before the colon, narrow no-break space before ; ! ?
//   1 250 €, 40 %   -> no-break space before € and %
//   9 h, 17 h 40    -> no-break spaces around the h
//   1 250           -> narrow no-break space between thousands
//   étape 2         -> no-break space before the number
// Keep plain spaces in the sources: the copy review quotes the text dump, which must match them.
//   node typo-fr.mjs [dist]
import fs from 'node:fs';
import path from 'node:path';

const dist = process.argv[2] || 'dist';
if (!fs.existsSync(dist)) { console.error(`typo-fr: no folder ${path.resolve(dist)}`); process.exit(1); }
const NBSP = ' ';
const NNBSP = ' ';

const fixText = (t) => t
  .replace(/«[   ]?/g, `«${NNBSP}`)
  .replace(/[   ]?»/g, `${NNBSP}»`)
  .replace(/ :(?=\s|$)/g, `${NBSP}:`)
  .replace(/ ([;!?])/g, `${NNBSP}$1`)
  .replace(/(\d) (€|%|\$)/g, `$1${NBSP}$2`)
  .replace(/(\d) h (?=\d)/g, `$1${NBSP}h${NBSP}`)
  .replace(/(\d) h(?![\p{L}\d])/gu, `$1${NBSP}h`)
  .replace(/(?<![\d.,])(\d{1,3}) (?=\d{3}(?!\d))/g, `$1${NNBSP}`)
  .replace(/(?<!\p{L})([Éé]tape|[Pp]age|[Cc]hapitre) (?=\d)/gu, `$1${NBSP}`);

// A small tokenizer: comments and the content of raw elements (script, style, pre, code,
// textarea) are copied unchanged up to their closing tag, so a "<" inside a script cannot derail
// it; tags are matched with quoted attribute values, so a ">" inside an attribute is safe.
const RAW = new Set(['script', 'style', 'pre', 'code', 'textarea']);
const TAG = /<\/?[a-zA-Z][^\s/>]*(?:\s+(?:[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?|\/))*\s*\/?>/y;
const fixHtml = (html) => {
  let out = '';
  let i = 0;
  let text = '';
  const flush = () => { out += fixText(text); text = ''; };
  const lower = html.toLowerCase();
  while (i < html.length) {
    if (html[i] !== '<') { text += html[i++]; continue; }
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      const stop = end < 0 ? html.length : end + 3;
      flush(); out += html.slice(i, stop); i = stop; continue;
    }
    TAG.lastIndex = i;
    const m = TAG.exec(html);
    if (!m) { text += html[i++]; continue; }
    flush(); out += m[0]; i += m[0].length;
    const name = /^<([a-zA-Z][^\s/>]*)/.exec(m[0])?.[1]?.toLowerCase();
    if (name && RAW.has(name) && !m[0].endsWith('/>')) {
      const end = lower.indexOf(`</${name}`, i);
      const stop = end < 0 ? html.length : end;
      out += html.slice(i, stop); i = stop;
    }
  }
  flush();
  return out;
};

let n = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) { fs.writeFileSync(p, fixHtml(fs.readFileSync(p, 'utf8'))); n++; }
  }
};
walk(dist);
console.log(`typo-fr: French spacing applied to ${n} HTML file(s) in ${dist}`);
