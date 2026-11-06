# Motion: recipes and traps

Everything here came out of real top-notch passes. The rules in SKILL.md §4 are the contract; this file is how to meet them without losing performance or accessibility.

## Contents

- LCP and entrance animations
- Loader policy
- Mobile frame rate
- Hover and focus on every link class
- Anchor links with Lenis and Astro's router
- Hidden start states without blocking time
- Extending the signature beyond the hero
- Pinned explainer sequences
- View Transitions and scroll containers
- Auditing timings by reading the source
- Motion in a work app

## LCP and entrance animations

- Never animate the LCP candidate in. Whatever block is the LCP element at 390 px (hero lead, CTA wrapper) is visible in the first paint; animate the H1 lines or decorative parts only.
- When mobile LCP is high, read `vitals.lcpElement` in `report.json` first.
- If `shoot.mjs` and Lighthouse disagree wildly (14 s against 1.1 s once), look at what the LCP element waits for. In that case a 187 KB JSON was fetched before a preview could draw. Inline the data the first screen needs as `<script type="application/json">`.
- A hero typing or streaming signature stays under 1.2 s in total, with the final text in the HTML.

## Loader policy

An earlier allowance (a loader up to 2.6 s) cost more than it gave. The policy, and the threshold in SKILL.md §6 (`desktop.loaderMs` ≤ 1,500):

- Show it once per session (a `sessionStorage` flag set when it finishes, wrapped in try/catch for private mode), on the home route only, never under 768 px wide, never on inner pages.
- When skipped, remove the element from the DOM, do not just hide it, so `loaderMs` reports `null`.
- An inline script in the layout `<head>` adds a `seen` class to `<html>` before paint, and hides the loader again after router swaps.
- Progress follows real work (`document.fonts.ready`) with a floor and a hard ceiling. Design for 0.8 to 1.0 s on desktop, exit included, so the measured worst case stays under 1.5 s. The hero entry (≤ 1.2 s) starts when the loader leaves.
- Design with margin: `loaderMs` varies by about 0.7 s between runs.

## Mobile frame rate

- No SVG filters (`feTurbulence`, blur, drop-shadow) and no large SVG `<pattern>` fills on big or scroll-animated areas. `feTurbulence` gave 11 fps; a hatch pattern dropped mobile Lighthouse from 99 to 70 with 1.6 s of blocking time.
- Fake materials with CSS gradients and compositor-only overlays animated with `transform`.
- Pause continuously animated pinned elements when off screen and when the tab is hidden.
- When Lighthouse drops after adding a visual, bisect: delete elements from the built HTML and re-measure 3 times each.

## Hover and focus on every link class

Critics deduct for nav links, footer links, inline links, cards and list rows whose hover is colour-only or tiny, even when `shoot.mjs` reports `noHoverChange` empty (it samples one target per class).

- Give each role a non-colour treatment in the concept's verb: a drawn-in underline, a row shift or inverse video, an arrow that advances 4 px, a sweep. Each has a `:focus-visible` twin, inside `@media (hover: hover)`.
- Make focus changes instant. Tab is a repeated keyboard action, and a capture taken mid-transition looks like a bug:
  ```css
  :focus-visible, :focus-visible *, :focus-visible::before, :focus-visible::after { transition-duration: 0s !important; }
  ```
- A rolling nav label (two stacked copies) keeps the duplicate `aria-hidden`, and the incoming copy looks visibly different.
- Disabled controls never move on hover. Every pressable control has an `:active` state.
- A header over scrolling content is opaque enough, or blurred, so body text does not ghost through it.
- Measure with `scripts/hover-probe.mjs`: it hovers every target and compares the element, its descendants and their pseudo-elements. Read its `colorOnly` list, not only `none`.

## Anchor links with Lenis and Astro's router

Lenis and the router both listen to `#id` clicks and fight: the scroll stops halfway. The bug shows only with a real click (not `element.click()`, not headless Playwright).

- Lenis with `anchors: false`.
- One capture-phase click handler on `window` that ignores `defaultPrevented`, non-left clicks, modifier keys, `target="_blank"`, `download`, other origins, other paths and unknown ids; then `preventDefault()` and `stopImmediatePropagation()`.
- `history.replaceState(history.state, '', hash)` rather than a push (the router keeps its state there).
- Scroll to the target minus (sticky header height + 16) through one helper. Lenis already subtracts `scroll-padding-top`: do not add the offset twice.
- A settle check at about 1,700 ms re-scrolls instantly if the target is more than 4 px off, unless the user has wheeled, touched or pressed a key since.
- The target gets `tabindex="-1"` and `focus({ preventScroll: true })`, with `section[tabindex="-1"]:focus { outline: none; }`. A targeted `<details>` opens first. An open dialog closes, and focus is not sent back to its opener if it already moved.
- On boot and on every router `enter`, if `location.hash` is set, go to it at once, and force it again after the page init and the enter transition (Lenis still holds the previous page height).
- Never put `data-astro-reload` on language links: it bypasses the transition curtain. Re-apply state flags (`js`, `motion`, `seen`) on every swap.

Reference handler:

```ts
// One owner for in-page links. scrollToTarget wraps lenis.scrollTo(el, { offset, immediate }).
const headerOffset = () => (document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0) + 16;

function targetOf(hash: string) {
  if (!hash || hash === '#') return null;
  try { return document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return null; }
}

let settle = 0;
function settleOn(el: HTMLElement) {
  clearTimeout(settle);
  let touched = false;
  const mark = () => { touched = true; };
  const events = ['wheel', 'touchstart', 'keydown'] as const;
  events.forEach((t) => addEventListener(t, mark, { passive: true, once: true }));
  settle = window.setTimeout(() => {
    events.forEach((t) => removeEventListener(t, mark));
    const off = el.getBoundingClientRect().top - headerOffset();
    if (!touched && Math.abs(off) > 4) scrollToTarget(el, { offset: -headerOffset(), immediate: true });
  }, 1700);
}

export function goToHash(hash: string, immediate = false) {
  const el = targetOf(hash);
  if (!el) return false;
  if (el instanceof HTMLDetailsElement) el.open = true;
  scrollToTarget(el, { offset: -headerOffset(), immediate });
  if (!immediate) settleOn(el);
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  return true;
}

export function initAnchors() {
  addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash || !targetOf(url.hash)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    history.replaceState(history.state, '', url.hash);
    goToHash(url.hash);
  }, true); // capture: runs before the router's and Lenis's listeners
}
```

Test it with the matrix in `critic.md` ("Real clicks").

## Hidden start states without blocking time

- Never create hidden start states with many `gsap.set` or `gsap.from` calls at load: 150 calls cost about 1.1 s of blocking time on a 4× throttled phone.
- Use CSS under `.js.motion` plus one IntersectionObserver that adds `.is-in`, or batched direct `element.style` writes with no reads, cleaned up by the page's cleanup.
- Replace SplitText at load with CSS `clip-path` headings. If you keep SplitText on block text, set `aria: 'none'`: it puts `aria-label` on `<p>`, which Lighthouse reports as `aria-prohibited-attr`.
- Split engine init into short tasks (yield with `setTimeout(0)`), with a generation counter to abort on navigation.
- Install heavy pinned sections lazily near the viewport (IntersectionObserver with `rootMargin`), render only the visible scene (`content-visibility: hidden` on the others), and create scrubbed ScrollTriggers under `content-visibility` lazily with a debounced refresh.
- Review delegated animation code for blocking time before merging it.

## Extending the signature beyond the hero

One gesture per section, same language, different action. For example, with a terminal concept: a command prints columns, a log types a hash then draws a branch, a config file fills key by key, a checklist waits on a cursor, something lighter for contact.

- Typed text is a `clip-path` revealed in character steps.
- Hidden start states exist only under `.js.motion`, never under reduced motion (`hiddenText` must be 0).
- Decoration is `aria-hidden`; the real text is in the HTML, in order.
- Every effect lives in a page-scoped `onPage()` that returns its cleanup, triggered once by an IntersectionObserver, on one GSAP clock (no own `requestAnimationFrame` loop, no scroll listener).
- The initial and final stills must each look intentional: a stills critic sees only those.

## Pinned explainer sequences

- The `<ol>` holds every step in the HTML, so no-JS and reduced motion show everything. In pinned mode, non-current steps are hidden with opacity only, so a screen reader still reads them all.
- Pin only if the stage fits the viewport; otherwise fall back to the stacked list. Size the stage by its tallest step.
- Test 11 viewports (320×568 to 1920×1080) printing `{ pinned, stageH, scrollH, overflowX }`. Take the pin top from `.pin-spacer`. A navigation round trip leaves exactly one `.pin-spacer` and 0 console errors.
- At least 1.15 screens of scroll per step; explanatory scenes at about 0.72× speed; the scroll hint fades after step 1; a progress cue ("3 / 10"); step counters agree everywhere.
- A moving marker that feels "too fast": a steady `cubic-bezier(0.4, 0, 0.2, 1)` at about 900 ms. Measure positions every 50 ms rather than trusting the declared duration. Confirm an ambiguous duration request once.
- An illustrated scene (flat SVG, a recurring character, two lines of caption at most: the problem marked with a cross, then what the step fixes marked with a tick, never colour alone) explains a technical idea better than a paragraph. The static SVG is always the finished picture, and the timeline's last frame equals it.

## View Transitions and scroll containers

- Guard every call: `document.startViewTransition && document.visibilityState === 'visible' && !reducedMotion`. A transition started in a hidden tab never resolves and freezes the screen. Attach `.catch(() => {})` to `ready`, `finished` and `updateCallbackDone`.
- A click during a View Transition can be lost (pointer events go to `html`). Add a click catch-up, and a probe that clicks a nav item then another target 100 ms later.
- `data-lenis-prevent` only on a container that really scrolls vertically. On a horizontal-only table wrapper it blocks wheel scrolling over it. Test: wheel over every overflow container, modal and table, and check the page still scrolls.

## Auditing timings by reading the source

Before heavy measurements, `grep -n duration` in the engine and motion folders and compare with the budget. Typical out-of-spec values and fixes seen: text reveals 1.2 s → 0.8 (lines), 1.1 → 0.7 (words), 0.9 → 0.6 (characters), fades 1.0 → 0.6, a card punch-in 2.5 s → 1.2 s, hover steps 0.36 s → 0.24 to 0.28 s, the default `ease` replaced by a custom curve, transitions on `width` or `top` removed.

## Motion in a work app

For a desktop or work app the rule is "no motion without a function" (state feedback, continuity, information). Keep hover, press and focus feedback, progress, FLIP reordering (transform only), a skeleton-to-content crossfade, and View Transitions between views. No loader (skeletons are the loading state) and no idle breathing (a pulse stops after 3 beats; only a running long task spins). Write this decision in `DESIGN.md`, since Impeccable's product guidance (150 to 250 ms) and the site entrance budget (400 to 800 ms) otherwise conflict.
