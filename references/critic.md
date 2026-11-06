# Judging the site: comprehension gate, external critic, real clicks

## Contents

- Comprehension gate
- Preparing the evidence
- External critic brief
- What a stills-only critic cannot see
- Score carve-outs and the plateau
- Real clicks

## Comprehension gate

Run it **before** the external critic and before content freeze, and again after every copy rewrite (a longer copy changes the layout). Two or three persona agents get only the first-screen captures (desktop `d-01-hero`, phone `m-01-hero`) plus the H1 and lead text.

Questions, in order: what is this; for whom; what does it cost; what would I do next; which words did I not understand.

Example personas for a B2B service:
- a non-technical salesperson in a small company who must answer their boss: "can they help us, and how much?";
- the manager who signs: "what exactly do I buy, the total cost, the risk to money, data and team time, why them rather than another vendor, is it serious?".

For a consumer product: a first-time visitor on a phone who arrived from a social post, and a returning buyer comparing with a competitor. For a portfolio: a recruiter with 30 seconds, and a peer who knows the craft.

Pass mark: ≥ 8/10 on first-screen clarity from each persona.

## Preparing the evidence

- Shoot into a fresh pass folder (`.shots/pass-NN`), never into one that holds an older run: stale captures mixed with new ones mislead the critic. Keep the log outside it. Never run two `shoot.mjs` at once.
- Check the evidence before the critic sees it: scroll shots are not identical to the first view; page coverage is complete (`--crawl` with enough `--max`, phone views of long pages); `hover.targets` is large enough.
- Give the critic a curated copy (`.shots/pass-NN/critic/`). Do not strip FAIL lines from `audit.txt` without saying so ("FAIL lines only concerned <excluded page>").
- Add a `seo.txt` with the head, share tags, canonical, sitemap, robots and favicon evidence. Capture both colour schemes, signed-in or filled states for apps, mid-animation frames (below), and custom sequences in their own folder (pinned steps, reduced-motion frames).
- Full-page captures of reveal-on-scroll sites are empty below the fold: capture with reduced motion and crop into viewport-height slices.

## External critic brief

A **fresh** agent every pass: a reused critic anchors on its previous scores. Run the first one **early**, before the polish loop, and make its top two structural fixes (compose empty frames, turn proof lists into case studies, a centerpiece visual that carries the concept across pages) the main work of the pass. Polish-only passes moved a score from 7.15 to 7.25.

Start from the brief in `$AW/references/quality-bar.md` and add:

> You are an Awwwards juror reviewing a site you have never seen. You get only evidence. Use only the files below: do not open the site, search the web, read source code, DESIGN.md or any other file. Never kill processes by image name.
>
> Inputs: the rubric, the `.shots` folder, `audit.txt`. Prefixes: `d-` desktop 1440, `m-` phone 390, `r-` reduced motion, `k-` keyboard, `d-90..92` page transition, `h-NN-rest` / `h-NN-hover` hover pairs.
>
> 1. Write the site's idea in one sentence first. If you cannot, that is a Creativity finding.
> 2. Score Design, Usability, Creativity, Content, and separately the six developer areas (Semantics/SEO, Animations/Transitions, Accessibility, Web performance, Responsive design, Markup/Meta-data). Start from 6: no evidence, no points. Cite a screenshot or a report field for every score.
> 3. Give a fix list ranked by score gained, each fix concrete ("m-03: the title wraps to five lines at 390 px; drop the mobile display size to 14vw").
> 4. `colorOnly`, `pixels` and `masked` are leads, not verdicts. A fill that floods a button is a real treatment; a text link that only changes colour is not. `idleMotion: false` is not a fault by itself.
> 5. Leave out what cannot be judged from stills, and state the limits of your evidence. Do not suggest a new concept.

Add a scope-notes paragraph with the deliberate decisions (not indexed so no sitemap, copy language, no client cases yet) and the known tool false positives (see `pitfalls.md`). Expect about 70k tokens, 17 tool calls and a minute when the critic only reads evidence.

Compare the critic's one-sentence idea with what the site was meant to say. If they differ, the concept is not landing.

## What a stills-only critic cannot see

Transitions and motion quality are invisible in stills; a pass that only added motion moved a score from 7.55 to 7.2. So:
- add mid-animation frames (for example 300, 900 and 1,800 ms after a section enters the viewport);
- add a measured table of transition timings (instrument `astro:before-preparation`, `astro:after-swap` and `astro:page-load`; a curtain was visible only 110 to 675 ms);
- tell the critic motion is judged only from those frames. Cross-document View Transitions do not show in headless frames: say so, or provide a real recording.

Do not expect motion work to raise a stills-based score.

## Score carve-outs and the plateau

This is the only place the critic bar bends. Say which carve-out applies up front, at the checkpoint, and repeat it in the delivery.

| Case | What changes | What does not |
|---|---|---|
| **No client proof or live demo yet** | Content and Creativity at exactly 8 count as met even when the critic names missing proof as the reason they are not higher; the gap is recorded as "needs real proof", not as an open defect. | Every other axis ≥ 8, the six developer areas ≥ 8, the weighted average ≥ 8.5. |
| **Imposed theme** (the owner imposed a reference look) | Design and Creativity floors drop to 7; the weighted average target drops to 8.0. Theme-fidelity findings form a separate class the owner may drop. | Usability and Content ≥ 8, the six developer areas ≥ 8. If the owner frees the theme, the full bar returns. |

Stop rule: SKILL.md §3. Deliver the honest KO with the two changes that would raise the score most.

## Real clicks

Mandatory, in a browser the user can see: a built-in browser pane, a browser extension driving the user's browser, or headed Playwright as a last resort. A hidden browser pane freezes animations, screenshots time out and the viewport reads 0×0: ask the user once, at the start, to keep it visible.

Required pass: the menu button, each menu link, Escape, a command palette if any, an anchor link from an inner page back to the home page (`/#contact`), an inner page then the browser's Back, the language switch, the form in its error state.

Probe for a scroll-to-anchor:
- arm a sampler inside a capture-phase `pointerdown` or `pointerup` listener on `window`;
- sample `target.getBoundingClientRect().top` every 100 to 200 ms for about 3.5 s;
- afterwards read `document.activeElement`, `location.hash` and `scrollY`;
- expected: the target lands at header height + 16 (or `scroll-padding-top`) in under about 1.3 s, with focus on the section.

Anchor test matrix (8 cases): click right after load; click later; open `/#id` directly in a fresh session; again after the loader was seen; arrive from another page through the router; press Enter on the link; phone viewport; the skip link. Repeat on the deployed URL after every deploy.

Practical notes for a built-in browser pane:
- after resizing to an emulated size, its screenshots can be cropped or scaled: take exact-size captures with your own Playwright script and keep the pane for real clicks and JS probes;
- click by element reference rather than coordinates (they go stale after layout changes);
- navigating to the same URL with only a new hash does not reload: use `location.reload()`;
- when a screenshot looks wrong, confirm with `getComputedStyle` before fixing anything;
- do not re-import an app script with `import()`: it creates a second instance;
- clear `localStorage` between runs, reset the viewport afterwards, and click empty space before testing keyboard shortcuts.
