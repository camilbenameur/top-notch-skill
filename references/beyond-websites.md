# Beyond websites: apps, slide decks, any artifact

The loop (baseline, one checkpoint, build, distill, adversarial review, deterministic checks, fresh critic, repeat) works on more than websites. The thresholds change.

## Contents

- Desktop and work apps
- Slide decks
- Any artifact: a judged loop

## Desktop and work apps

### Map the requirements first

Write in `DESIGN.md`, before the audit, which requirements apply, which are adapted and which do not apply, each with one line of reason.

| Status | Requirements |
|---|---|
| Not applicable | SEO, share image, JSON-LD, sitemap, deployment headers, legal pages and public forms, no-JS rendering, Lenis, ScrollTrigger, marquee, kinetic type, service worker, print, 320 px phones, Lighthouse, hosting, loader, idle motion |
| Applies fully | 5-second clarity, AA accessibility in light **and** dark, copy quality, typography, bundle weight, a clean console, the external critic |
| Adapted | "Responsive" becomes the minimum window up to 1920×1080. The CSP becomes the renderer's own CSP, checked by a test. Lighthouse becomes bundle JS < 200 KB gzip, CLS < 0.02 and zero network requests (`connect-src 'none'`). |

App thresholds: both themes AA; keyboard scenarios pass; the document never scrolls as a whole (document height ≤ window height; give the scroll container `position: relative` so screen-reader-only elements do not extend the document); minimum window (for example 860×520) to 1920×1080.

Fonts: the system stack or bundled local files. Icons: inline SVG with `currentColor` and `aria-hidden`. No CDN. Window chrome: frameless with the real caption buttons kept, a draggable header, overlay colours synced to the OS theme, the app icon and its OS identity set.

### A showcase harness

Build a throwaway entry that mounts the real app with a **fake bridge** returning fictitious data for every screen:
- views picked by a query parameter (`?view=name`), plus flags for loading skeletons, theme, frozen animations and queue states;
- served by the dev server on `127.0.0.1` only, excluded from the app build and type-checking, with its own npm script;
- captured by a Playwright script taking scene names and role-based clicks, in both themes and with reduced motion, to `captures/<scene>-<theme>.png`, using a throwaway browser profile. Read the PNGs after every batch.

Self-review of your own captures is not a pass: the critic and the Impeccable detector run on the showcase URL in both themes, axe on the showcase, distill on the screens.

### A verifier that cannot lie

Build it in the first fix batch: browser **probes** separated from **pure judge functions** that have their own unit tests on fabricated PNGs and DOM reports. A check whose work was not done is red by construction. Exit codes: 0 green, 1 red, 2 could not verify, 130 interrupted. It refuses a stale build. Re-validate probes after a redesign (stale selectors gave false greens). A red caused by the tool is a tool defect, fixed in the tool.

### App UX rules reviewers kept finding

- No internal vocabulary in visible text: rename "pipeline", "sourcing", "session" to what the user does. A final grep of the UI (errors and notifications included) for banned words.
- Every step of a process is a first-class navigation entry, in order; actions that belong to a step live on its page; two entry points to the same action feed the same visible queue; each page has a one-line explanation of what it is.
- Human error messages with a next action, never a raw "Error 500".
- A "Loading…" state only after 400 ms; skeletons reserve the loaded geometry; one shared read and a prewarm for data-heavy startup.
- A UX-journey reviewer that counts clicks before and after.
- A single-character shortcut can be turned off or needs a modifier (WCAG 2.1.4). A skip link first; dialogs with `aria-modal`, a Tab trap, Escape to close, and focus returned.
- Hover responds with more than colour.
- Reference feel for a work tool: native, sober, one accent, dense rows, status dots rather than chips.

### Real tests of the shipped build

Launch the real build on realistic data, capture every tab and state, and list data-driven display bugs apart from code tests. Say which screens were not clicked because they could trigger side effects. Measure cold start on a realistic data size. Entry points refuse to start without an explicit test flag; a test mode runs the normal startup without showing a window; every test sets a temporary home and profile. By default, do not open visible windows on the user's screen during automated tests unless they ask to watch.

### Order of a visual redesign

Tokens and shell first, by one agent alone (a token change re-skins every screen, so a stop leaves a consistent app); then navigation alone (it touches every screen); then two screen groups per batch, each followed by a review with real captures and computed checks; at most two repair rounds. Snapshot before large builds. When the owner says stop, finish with type-check, build, all suites and a smoke test, write a resume file with ordered next steps, and commit only on a yes.

## Slide decks

### Build and render

- Generate an editable PPTX from a structured spec (YAML) with `python-pptx` on the real template (layouts, logo, footer). Dump the template first (layout names, placeholder indexes and types, slide size).
- Slide types the generator supports: cover, table of contents, chapter, bullets, two columns, table, image, diagram, comparison, steps, code.
- Editable diagrams as native shapes, or generated SVG rendered by a headless browser when precision matters.
- The generator prints zero layout warnings (text overflow, table too big: split it). Render to PNG (PowerPoint automation or LibreOffice) and to PDF, build a contact sheet (3 columns of 640×360 tiles), and look at every PNG. A warning-free render is the deterministic gate before any scoring pass.
- When the same defect class recurs (uneven title sizes, table rows, orphan words, label offsets), fix the generator or the template once, not each slide.

### Rubric (9 criteria, 0 to 10, start at 10 and subtract per defect, citing the slide and the exact text)

1. **Message titles**: a conclusion, ≤ 70 characters (cover, agenda and closing exempt).
2. **Density**: ≤ 40 words per content slide (60 for a table, 25 for a diagram), ≤ 5 bullets, none over 12 words, no font under 14 pt. A speaker aid or handout may be denser: decide who consumes it first.
3. **Each fact once** (speaker notes excluded).
4. **One message per slide**, with a hierarchy readable in 3 s.
5. **Diagrams**: readable at 3 m, no arrow crossing a box, labels ≥ 14 pt, the accent colour only for what is new, a legend for new / hypothesis / rejected. Lint: label boxes ≥ 12 px from lines and boxes, arrow ends inside a node, every arrow labelled, every legend key used.
6. **Narrative and time**: problem, key idea, solution, proof, limits, next steps.
7. **Fidelity** to the single source: −2 per invented claim. Never fill a critic's gap with a plausible claim: grep the source first or mark it an open question.
8. **Finish.**
9. **Speaker notes**: ≤ 90 s per slide, adding what the slide does not say, a timing cue and an "if asked" block.

Scorer: 4 or 5 parallel read-only lenses, then one arbiter that re-checks every finding against the renders and the source, drops unfounded ones with a reason, dedupes and ranks defects by cost (≈ 460k to 550k tokens, 2.5 to 8 minutes per pass). Include an "owner decisions, do not penalise" block. Cap each criterion's penalty, or show the raw deduction count next to a saturated score. Use the median of the last two passes. Stop when the target is reached, after 3 identical scores, or after N passes.

Time the talk from the sum of per-slide time marks in the notes and from a real rehearsal (≈ 1 minute per slide); pre-decide a cut list with a time checkpoint.

## Any artifact: a judged loop

For a spec, a plan, a design document or code:

1. The author produces; a deterministic gate runs first, and a red gate is fixed without a panel.
2. Trial round: 3 fresh judges, one lens each. Validation round: 3 fresh judges with double scoring.
3. Score = median per axis over valid judges. Pass = every axis ≥ 8 and mean ≥ 8.5. On failure, a fresh triage agent keeps at most 3 findings. Every round is appended to a log; at most 4 rounds, then escalate to the owner.

Judge design:
- judges get no tools; their prompt holds only the artifact and the rubric (no history, scores or paths); the author never judges its own work;
- every finding quotes an exact line; rubrics have anchors at 2, 5, 8 and 10; double scoring with the axes in a different order; a spread over 2 triggers an arbiter; "not evaluable" is allowed;
- **canaries**: a script degrades the real artifact; a judge that scores a canary 6.0 or more is voided;
- calibrate on a small set of good and bad excerpts (half held out): good ≥ 8.0, bad < 6.0;
- do not feed raw scores back to the builder (a three-level verdict plus findings), and lock the evaluator and rubric files from the builder;
- make each numeric gate falsifiable: simulate the loop and register thresholds before measuring.
