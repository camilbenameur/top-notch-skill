# Thresholds: protocols, carve-outs, calibration

SKILL.md §6 lists the thresholds. This file says how to measure them so the numbers mean something, which carve-outs are allowed, and what real runs scored.

## Contents

- Lighthouse protocol
- Blocking time and LCP on mobile
- CLS
- Accessibility beyond axe
- First screen
- Hover coverage
- No-JS check
- Build output checks
- A deliberately non-indexed site
- HTTP headers
- Calibration from real runs

## Lighthouse protocol

- Run each page and mode **3 times in a row with nothing else running** (never during `shoot.mjs`, a critic, a build or a workflow), with a cache-busting query. Report min, median and max; gate on the median. `scripts/lighthouse.mjs` does this.
- Record `environment.benchmarkIndex` before blaming the site: about 800 on a quiet machine, about 500 when busy. The first, cold run is the outlier.
- A local static server does not compress, so local performance is a floor. Final numbers come from the deployed URL. PageSpeed Insights has a daily quota: do not rely on it.
- If `chrome-launcher` fails (`spawn UNKNOWN` on some Windows machines), `lighthouse.mjs` launches the browser through Playwright with a debugging port. Prefer a system Chrome or Edge (`CHROME_PATH`) over a bundled Chromium.
- Run accessibility on one page of **every** template: axe inside `shoot.mjs` missed `heading-order`, `aria-prohibited-attr` and some contrast cases that Lighthouse caught.
- To list failing audits by hand: `node -e "const r=require('./lh.json');console.log(Object.values(r.categories).flatMap(c=>c.auditRefs.filter(a=>r.audits[a.id].score!==null&&r.audits[a.id].score<1).map(a=>c.id+':'+a.id)))"`

## Blocking time and LCP on mobile

Targets: TBT < 150 ms, LCP < 2.0 s on a throttled phone.

Levers that worked:
- Split long pages into an index plus chapter pages and cap the DOM per page (about 3,000 to 5,000 words, tables under about 100 rows). A 30,000-word page cost 670 to 1,489 ms of style and layout.
- Remove `text-wrap: pretty`, `backdrop-filter` and `content-visibility` from long pages; cut SVG node counts.
- Inline the data the first screen needs; preload only the hero font; defer non-critical engine init; skip the client router on first load.
- Diagnose with `forced-reflow-insight`, `mainthread-work-breakdown`, `long-tasks` and `dom-size-insight` in the Lighthouse JSON.
- Re-run a lone outlier in isolation 2 or 3 times and use the median.

To see which long tasks block and what shifts, run `scripts/vitals-probe.mjs` (several runs on a 4× throttled phone, long tasks, layout-shift sources, LCP element).

If mobile performance still misses (a client router plus GSAP can make it structurally hard), report KO with the measured values and the levers left. Under 95 the row is KO, whatever the reason: never call the site top-notch with that row open.

## CLS

The threshold is CLS < 0.02; aim for 0. It must hold across 3 to 5 runs on a throttled phone, also with an artificially slow font, with each shift's sources printed: `vitals-probe.mjs --runs 5 --slow-font 2500` does all three (add `--scroll` for shifts caused by lazy content).

- Write the hero title as fixed lines (one span per line, explicit trailing space).
- Tune the fallback `@font-face` with `size-adjust` from the measured width ratio of the same string.
- `font-display: optional` with the font preloaded is an option; state the trade-off in `DESIGN.md`.
- Reserve identical geometry for skeleton and loaded states, and room for any typing or rewriting text (an invisible sizer).
- A global `[hidden] { display: none !important; }`.
- Measure only after real pointer input: a scripted `element.click()` is not user input and inflates CLS.

## Accessibility beyond axe

- **Focus ring by pixels.** `scripts/focus-probe.mjs` presses real Tab keys and counts changed pixels around each focused element. A computed `outline` passed while `overflow: hidden` on a parent clipped the ring to nothing.
- SVG focus targets need `:focus-visible`; use a roving tabindex for large grids.
- Accessible names: duplicated hover labels produce names like "Offers Offers" (hide the copy with `aria-hidden`); an `aria-label` must start with the visible text (`label-content-name-mismatch`); no nested interactive elements; the skip link does not cover the logo when focused.
- Group `contrastNeedsReview` nodes by reason (background gradient, background image, translucent text) and check each by eye. Move decorative backgrounds to a fixed `::before` layer.
- No element starts at partial opacity: Lighthouse audits without scrolling and failed a 0.2-opacity element at 1.42:1.
- Forced states (`:hover`, `:active`) hold AA too, red text on hovered rows included.
- Compute contrast in a script for every token on every surface, write the ratios in comments, and mark any token under 4.5:1 "decoration only, never text". Non-text borders 3:1. Split the accent into a fill token and a text-safe token.
- Targets: 44 px for primaries, 24 px for the rest (pad inline links: `display: inline-block; padding-block: 0.36em`). Visible labels at least 11 to 12 px.

## First screen

- `viewports.mjs --last` checks the **last** element of the first screen (a status line, a price note), not only the H1 and the main button. A status line that changes the buying decision must be fully visible at 1280×720, 1366×768, 1440×780 and 390×844. It also catches an element pushed past the right edge and hidden by `overflow-x: hidden` on `html` or `body`, which the document check alone misses.
- At most 4 H1 lines on desktop. Bound the H1 by height and width, for example `clamp(2.3rem, min(0.7rem + 3.7vw, 7svh), 4.4rem)`, with the hero at `min-height: calc(100svh - <header>)` and `align-content: center`.
- Top and bottom gaps of the hero both ≥ 24 px and within a 2:1 ratio; no orphan button alone on a line.
- Read the first-screen PNG yourself before launching a long crawl, and stop the crawl on a visible defect.
- Re-check after every copy rewrite: a longer H1 pushed the status line below the fold.

## Hover coverage

`shoot.mjs` samples one target per control type, so small inner pages give 3 to 6 targets. Accept `hover.targets.length ≥ 8` **or** every control type covered (say how many types), and back it with `hover-probe.mjs` over every target.

## No-JS check

The raw HTML holds at least 95 % of the words of the rendered text (nothing injected only by JS). Extra raw words (closed dialogs, screen-reader labels) are fine; explain them. Run it on one page of each type and each language. Keep the hero's final state in the HTML and animate toward it.

Raw count with the one-liner below. Rendered count: the words of the same page's block in the `page-text.mjs` output, without its `TITLE:` and `META:` lines and the `[H1]`/`[H2]`/`[H3]` markers. Ratio = raw / rendered.

```bash
curl -s http://127.0.0.1:4400/ | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(s.replace(/<(script|style)[\s\S]*?<\/\1>|<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length))"
```

## Build output checks

- Grep the compiled CSS in `dist` for every visually critical property declared in the source (`backdrop-filter`, `clip-path`, `mask`, `@supports`, view-transition rules). Lightning CSS keeps only the last of `-webkit-backdrop-filter` / `backdrop-filter`: write the prefixed one first.
- After any change of font or asset origin, read the console in a real browser (errors only) and update the CSP (`font-src 'self'` for self-hosted fonts). Check `document.fonts.check('700 20px <Family>')`.
- Console errors in best practices are often generator bugs (a malformed SVG path).
- Replace `'unsafe-inline'` in `script-src` with hashes after each build (`scripts/csp-hashes.mjs`). JSON embedded in HTML escapes `<` as `\u003c`.
- A form posting to an external service needs its origin in both `connect-src` and `form-action`. A 5xx from the form provider is an outage, not a CORS bug: probe it with `curl` and an `OPTIONS` preflight before the single real send.
- Verify a deploy with a clean-clone build (copy `git ls-files -co --exclude-standard`, `npm ci`, build, dry-run deploy) outside any synced folder.

## A deliberately non-indexed site

- Lighthouse SEO caps around 66 to 69 because of `is-crawlable`. The requirement becomes: `is-crawlable` is the only failing SEO audit.
- The layers that matter are the `robots` meta tag and the `X-Robots-Tag` header. `Disallow: /` in `robots.txt` stops crawlers from reading them, and already-known URLs can stay listed: do not use it to de-index.
- `audit.mjs` will report "no sitemap": expected.
- An absolute `og:image` pointing at production "does not load" locally: verify after deploy.

## HTTP headers

On the deployed URL (a local static server sends none):

```bash
curl -sI https://<url>/ | grep -i -E "strict-transport|content-security|x-content-type|referrer-policy|permissions-policy|x-robots"
```

Before deploy, read the headers file and mark the row "to check after deploy". After a redeploy, verify assets with `fetch(url, { cache: 'no-store' })` and a marker string: hashless assets with `max-age=3600` serve stale code (set them to `must-revalidate`).

## Calibration from real runs

Use these as "expect" ranges, not guarantees.

| Run | Numbers |
|---|---|
| Service site (Astro, GSAP, Lenis), 9 pages | LCP about 1.3 to 2.1 s on a throttled phone (the home page over 2.0 s); CLS 0; `desktop.settledMs` about 2.5 to 4 s; `mobile.loaderMs` 2.3 to 3.7 s before the loader policy existed; real home JS about 60 KB gzip (`audit.mjs` reported 8 KB because it ignores imported modules). 4 full crawls and 2 critics, both around 7.4. About 3 hours from first build to deploy. |
| Same site, explainer section added | Critic about 7.2 before and after polish-only passes: polish does not move the score; structural fixes do. |
| Portfolio redesign | Critics 7.3, 7.55, then 7.2 after a pass that only added motion (stills cannot see it). Lighthouse desktop 100, mobile 79 to 99 depending on machine load. |
| Content site with sign-in | Copy cut by about 45 % after distill. Critics under 7 until a demo route let them see real screens. |
| Service site distill | Home page about 70 % shorter; FAQ cut by three quarters. |
| Desktop app, imposed theme | Critic 6.65 then 7.05. Pass 1: more than half of the hover targets were colour-only. |
| Copy review | Pass 1 lens scores 5 to 7.5; the arbiter keeps about 45 of 60 to 70 edits; by pass 3 scores sit near 7 and most findings are owner questions. A regression pass after fixes found 7 new issues the fixes introduced. |

Typical defects that survive until a careful pass: a 15 px touch target, a focus stop with no visible style, a colour-only hover on footer links, a status line pushed below the fold by a longer heading.

What the scores mean: a 7 is "a clear system, the concept partly carried"; an 8 needs every page composed and the concept used beyond the hero, and a centerpiece visual for utility-style sites.
