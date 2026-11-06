---
name: top-notch
description: The "top-notch" quality bar for a website, and the loop that reaches it. Defines what the word means (award-level design, understood in 5 seconds, true and sourced facts, maxed-out measurements), the chain of skills to run in order (awwwards, awesome-design, web-design-guidelines, Impeccable with its detector and its critique, audit, distill and polish commands, a targeted security audit, adversarial copy review and distill workflows, real clicks in a browser, a fresh external critic each pass), numeric thresholds with the commands that measure them, the motion level expected, cost control, and when to stop. Use it whenever someone asks for a top-notch, top-tier, award-level, premium, "Awwwards-level" or "go all out" website, asks to create, redo, finish, audit or "pass" a site to that level, or says it in French (« top-notch », « top niveau », « nickel chrome », « haut de gamme », « envoie le paquet »). Also adapts the bar to a desktop app or a slide deck.
---

# /top-notch

A site is top-notch only when **all four** hold at once:

1. **Award-level design**: it could win a Site of the Day on Awwwards.
2. **Understood in 5 seconds** by someone who knows nothing about the subject: who, what, for whom, what to do next.
3. **True, sourced facts**, every status exact (planned, in progress, delivered, in production).
4. **Maxed-out measurements**: performance, accessibility, SEO.

If one is missing, the site is not top-notch. Two more things are checked, because sites passed every metric and still failed them:
- a non-technical persona passes the 5-second test on the first screen (critics scored a site above 7 while its owner understood nothing on its first screen);
- the site is not "too busy": every piece of information is said once (an owner judged a site too busy while it passed every other threshold).

**Before anything else**, read `LOCAL.md` next to this file if it exists. It holds the owner's personal rules (who approves deploys, banned words, sources of truth for facts, machine quirks, model policy) and it **wins over this file**.

## 0. Setup

top-notch is an orchestration layer: it fixes the order of steps, the thresholds and the agent reviews, and relies on other skills installed next to it (usually in `~/.claude/skills/`). The README has the install commands.

| Skill | Source | Without it |
|---|---|---|
| `awwwards` | github.com/juliobsz/skills (MIT), folder `awwwards` | **Required.** The scripts in `scripts/` reuse its `browser.mjs` (`launch()`) and `serve.mjs` (`serve(dir, port)`); `shoot.mjs`, `audit.mjs`, `serve.mjs`, `og.mjs`, `font.mjs` and the critic brief (`references/quality-bar.md`) come from it. |
| `impeccable` | github.com/pbakaus/impeccable (Apache-2.0) | The detector rows become manual checks. **The distill step needs its `reference/` folder**: without it, run distill by hand with the rules of requirement 9. |
| `web-design-guidelines` | github.com/vercel-labs/agent-skills | Review the interface code against your own checklist. |
| `awesome-design` | github.com/VoltAgent/awesome-design-md (MIT): a collection of `design-md/<brand>/DESIGN.md` files, not a skill; clone it and point the agent at it, or wrap it in a small skill | Pick reference design systems yourself. |
| `security-audit` | github.com/cloudflare/security-audit-skill (MIT), folder `skills/security-audit` | Do the targeted checks of step 7 by hand. |
| `dataviz`, `video-transcript` | optional | Only for charts, or when the owner shares a video as inspiration. |

Set the paths once per shell (adapt to where the skills live):

```bash
TN=~/.claude/skills/top-notch      # this skill
AW=~/.claude/skills/awwwards
IMP=~/.claude/skills/impeccable    # its engine: $IMP/scripts/impeccable (impeccable.cmd from PowerShell or cmd)
```

In the project you check: Node 20+, `npm i -D playwright lighthouse`, and `npx playwright install chromium` if no Chrome or Edge is installed. The measuring scripts print their usage when run without arguments and exit 1 when their check fails. `csp-hashes.mjs` and `typo-fr.mjs` rewrite the build folder (default `dist`). `release-gate.mjs` exits 2 when it could only fail to fetch. `workflows/*.js` take absolute paths: expand `~` and `$IMP` before passing them.

## 1. The nine requirements

1. **Clarity.** On the first screen a non-technical reader knows who, what, for whom, at what price if it sells, and what to do next. The H1 and the meta description say it in everyday verbs. No slogan that needs decoding. Words borrowed from the concept's metaphor never appear in headings, navigation, buttons or captions: use the audience's words. When the signature visual is abstract, a one-sentence plain caption on the first screen says what it shows. On phones the primary button comes before the art.
2. **Point of view.** A concept drawn from a verifiable fact of the subject's real world (the owner's actual work, tools or passion), readable at first glance by a non-expert, and an art direction you could not hand to anyone else. A concept from geography or an abstract metaphor (a fabric weave, a constellation) fails the glance test. "Systematic" means rigorous (grid, type scale, spacing, states, contrast), not bland.
3. **Motion that goes all out.** See §4 and `references/motion.md`.
4. **Performance.** See §6.
5. **Accessibility.** WCAG AA everywhere, full keyboard use, `prefers-reduced-motion`, screen readers. Touch targets 44 px for primary actions, 24 px minimum for the rest. Any continuous motion has a visible pause control (WCAG 2.2.2), pauses off screen and in a hidden tab, and stops under reduced motion with its final state shown.
6. **Copy.** Human, exact, sourced, honest about price, limits and status. See `references/copy.md`.
7. **Robustness.**
   - Layout works from 320 to 1920 px, with a designed 404 page.
   - Content is in the HTML without JavaScript.
   - Forms: a visible `<label>`, the right `type` and `autocomplete` per field, an error tied to its field (`aria-invalid`, `aria-describedby`), send and success messages in a `role="status"` region, the button disabled while sending, a no-JS fallback (`<form method="post" action>` that works alone), anti-spam (honeypot plus a server check), and a privacy notice next to the button (purpose, legal basis, retention, rights, contact).
   - Legal pages your jurisdiction requires (publisher, host, contact; a privacy policy if data is collected), linked from every footer. What is missing becomes a question for the owner, never invented.
   - One real form submission only, to the owner's inbox, after the owner's go, never retried automatically.
8. **Discoverable.** SEO, share image and structured data. Or a deliberate non-indexing (see `references/thresholds.md`).
9. **Sobriety.** Every piece of information is said once on the whole site, every page has one primary action, and what does not help a visitor decide is folded away or removed. One FAQ, in one place, 6 questions at most, collapsed. The home page can be skimmed in one minute: about 1,000 visible words at most, menu and footer included. Density is a per-artifact parameter: a public marketing page is sober, a reference handout or speaker aid may be dense; ask who consumes the artifact before applying a word budget. Sobriety is checked (the distill step); it does not follow from the rest.

**A signature that encodes data** (a chart, a trace, a map) ships a plain-text twin next to it, labels demo data as demo data, never encodes meaning by colour alone (use shape too), and records the WebGL-or-not decision in `DESIGN.md`.

## 2. Two modes, one checkpoint, written decisions

- **Existing site** ("make this site top-notch"):
  1. Baseline first: measure the live site (Lighthouse mobile and desktop, crawl, audit, raw-HTML word count, status code of an unknown URL) and run a fresh critic. Fill the "before" column of the thresholds table (§6).
  2. Rank the gaps: blockers, then what shows, then finish.
  3. Keep the stack unless it blocks a requirement. A client-rendered SPA that shows 0 words without JS, or answers 200 on unknown URLs, moves to static output.
  4. Fix the CI first if branch builds fail (for Cloudflare Workers Builds, non-production versions upload only with a minimal `wrangler.jsonc` setting `assets.directory` and `not_found_handling: "404-page"`).
- **New site**: run the `awwwards` skill end to end (brief, concept, system, build, QA, launch) with everything this skill adds.
- **Impeccable context, both modes.** Once per session, with the project as the current folder: `$IMP/scripts/impeccable context` (loads `PRODUCT.md`, `DESIGN.md` and the surface brief). No `PRODUCT.md`: `/impeccable init` creates it. Never run `/impeccable document` on a project that already has a `DESIGN.md`: it would regenerate it from the code. Impeccable mode per surface: **Persuade** for a sales or landing page, **Experience** for a portfolio or showcase, **Read** for docs or articles, **Operate** for app UI.
- **Stack for a new site.** Default: static Astro (`ClientRouter`, GSAP, Lenis), with a form posting to an external service or a worker. Next.js only for authentication or dynamic data; write it in `DESIGN.md`, and the JS ceiling becomes 200 KB gzip. **This rule wins over the awwwards stack table.**
- **Decisions written in `DESIGN.md` before building:**
  - **Language(s).** One by default. It drives the typography rules (French spacing applies to French only), the banned-phrase list and the reader personas. Bilingual: one data module holding both languages, `hreflang` with `x-default`, one URL per language, sitemap alternates, a language switch through the router (unless a reload is intended), one 404 for both, a share image per language, reviews in both.
  - **Dark mode.** Default `color-scheme: light` plus `<meta name="color-scheme" content="light">`. Otherwise a full dark theme, checked AA.
  - **Analytics.** None by default. Otherwise cookieless (Plausible, Umami, Cloudflare Web Analytics), added to the CSP.
  - **Print.** `@media print` hides navigation and animation.
  - **Offline.** No service worker.
  - **Shared element** between a list and a detail page: yes, or "not applicable".
  - **Loader:** yes or no, with the reason (policy in `references/motion.md`).
  - **WebGL** or not, with the reason.

**One single checkpoint with the owner before building or redesigning.** Present:
- the concept and art direction in a few lines, with 1 to 3 quickly rendered static mockups (a throwaway HTML board screenshotted at 1366×768 and 390×844), so the owner chooses on images, not descriptions;
- the page plan and the one-line positioning;
- the decisions above, as a table;
- every open question with a recommended default: language, indexing, legal identity, external links, missing content.

Ask them all in one multi-question message, recommended option first (an optional `QUESTIONNAIRE.md` with defaults lets the owner answer in advance). After the answer, work without asking again; anything left unanswered takes the most conservative default. Remember a rejected direction so it is never proposed again.

- **Imposed theme.** When the owner imposes a reference look, say up front that Design and Creativity scores will cap around 7, and apply the imposed-theme carve-out of `references/critic.md`. Run the rigor passes first (accessibility, motion system, copy, layout, CLS) and keep theme-fidelity findings in a separate class the owner can drop at once. If the owner frees the theme, run an art-direction contest before building (3 competing worlds with mockups, a 3-lens jury, a synthesis that grafts the best of the losers).
- **Product site with sign-in.** Ship a no-account demo mode (progress kept in `localStorage`, optional sync after sign-in), put a live sample of the core screen on the landing page, keep the real H1 in the static HTML, and point the crawl, text dump, distill and critic at real screens (a demo route), not the login gate. Register the OAuth redirect URIs of every domain before delivery. Test the OAuth flow with `curl` (redirect to the provider, state cookie, bad-state and denied paths) and stop at the consent screen. Secrets are typed by the owner.

## 3. The chain and the passes

The chain, with what each step brings:

| # | Step | Tool | What you get |
|---|---|---|---|
| 1 | Ground truth | the owner's sources | A facts file and a forbidden-claims list ("X is never named", "this does not exist yet"), wired into the content gate, the copy review and the release gate. No invented fact. |
| 2 | Inspiration | `awesome-design` | 2 or 3 `DESIGN.md` close to the target tone, for system rigor. Never copy a brand. |
| 3 | Concept to launch | `awwwards` | The backbone. Read its references (`concepts`, `art-direction`, `typography`, `layout`, `motion`, `engine`, `astro` or `nextjs`, `quality`, `quality-bar`, `ship`). Where this skill sets a different value (stack, motion, thresholds), this skill wins. |
| 4 | Interface rules | `web-design-guidelines` | All interface code checked against its rules. |
| 5 | Second design eye | `impeccable` | Detector at 0, `critique` and `audit` on the render, a mandatory `distill` pass, `polish` last. Table below. |
| 6 | Charts | `dataviz` | Only if the site charts numbers. |
| 7 | Site security | `security-audit`, targeted | Headers, form, secrets in the bundle, dependencies. Not a full audit. |
| 8 | Copy | `workflows/copy-review.js` | Adversarial readers then an arbiter (`references/copy.md`). |
| 9 | Comprehension gate | 2 or 3 persona agents | They see only the first-screen captures plus H1 and lead: ≥ 8/10 on first-screen clarity (`references/critic.md`). |
| 10 | External critic | a fresh agent each pass | Evidence only: captures, reports, rubric. Never the code or `DESIGN.md` (`references/critic.md`). |
| 11 | Real clicks | a browser the user can watch | Anchors, menu, forms, page transitions, Back (§5). |
| 12 | Video references | `video-transcript` | When the owner shares a reel or video as inspiration. |

**Passes, in the order they actually run:**

- **Pass 0, baseline** (existing site): §5 measurements on the live site, a first critic, the "before" column. Then the single checkpoint (§2).
- **Pass 1, structure:** steps 1 to 7 (build), then copy review (8), distill, and the comprehension gate (9) until the first screen is understood; freeze the content. Then the full measurements of §5 and the **first critic early**: its top two structural fixes (empty frames to compose, proof lists to turn into case studies, a centerpiece visual that carries the concept across pages) are the main work of pass 2. Polish-only passes do not move the score.
- **Pass 2 to N:** fix, rebuild, re-measure into a new pass folder, a second copy-review pass on changed pages, real clicks, a **new** critic. At least two full passes. The last pass removes one decorative effect, the weakest, picked from an explicit list with file and line (hover, press and focus feedback are never candidates), then `polish`.

**Stop rule.** The loop ends when every threshold is met, **or** when the lagging criterion has not moved for 3 passes and no content or accuracy error remains. Then ship the best version, show per-axis scores, name the two changes that would raise them most, and never claim a target that was not met. If the critic's top fixes fall outside the allowed files, or the score gains less than about 0.3 per pass for two passes, stop and ask the owner to widen the scope.

**Impeccable in the chain.** Invoke the `impeccable` skill with a command (for example `/impeccable critique home`). Its references live in `$IMP/reference/`.

| When | Command | What you get |
|---|---|---|
| Before building or redesigning a surface | `shape` | The UX plan of the surface, checked against the awwwards concept. The concept wins. |
| After each build pass | the detector (§5) | AI-generated UI tics: one-sided colored borders, decorative stripes, cards in cards, purple gradients, Inter everywhere… Target 0. Typical hits and fixes: `references/pitfalls.md`. |
| With `shoot.mjs` | `critique` | A heuristic UX review, next to the external critic. |
| With `audit.mjs` | `audit` | Accessibility, performance, responsiveness, through Impeccable. |
| Before content freeze | `distill`, through `workflows/distill-site.js` | The cut plan: each fact once, one primary action per page, one FAQ. **Mandatory.** |
| As needed | `quieter`, `clarify`, `typeset`, `layout` | Too loud, unclear UI copy, type scale or grid to redo. |
| Motion | `animate` | Ideas for useful motion. §4 timings win. |
| Forms and edge cases | `harden` | Errors, empty states, long text, languages. |
| Last pass | `polish` | Finish before launch. |

- **Precedence.** This skill sets stack, motion, thresholds and copy rules: it wins over Impeccable and awwwards. Impeccable's hard floors (`$IMP/reference/craft-floor.md`) apply unless `DESIGN.md` records a decision. A client instruction beats Impeccable's style warnings, as Impeccable itself says.
- **Hooks.** Installing Impeccable adds hooks (session start, a check after each UI file edit, a full pass at the end of each reply, up to 30 s). Treat their findings like the detector's.
- **Finish reviewer.** Impeccable installs an `impeccable-finish-reviewer` agent that reviews a finished build against its direction. Run it in addition to the external critic, never instead.
- **Ignoring a finding.** Only when it contradicts a `DESIGN.md` decision, with the reason: `$IMP/scripts/impeccable ignores add-value <rule> <value> --reason "<reason>"`, or an `<!-- impeccable-disable <rule>: <reason> -->` comment in the file. Log every exception in `DESIGN.md`. Suppression works per file: fix rather than silence.

## 4. Motion: go all out

A full choreography, not a fade-up pasted on every section. Every point is **mandatory** unless `DESIGN.md` declares it not applicable.

- **One signature moment**, tied to the concept, executed perfectly, visible on the first screen, and extended beyond the hero: one gesture per section, same language, different action.
- **A choreographed arrival.** Hero entry 1.2 s at most, after the loader if there is one. A loader only under the policy in `references/motion.md` (once per session, home only, never on phones, designed for about 1 s with its exit so the measured worst case stays under 1.5 s).
- **Continuous page transitions** (Astro `ClientRouter` or View Transitions, with the awwwards engine adapter), plus a shared element when a list leads to detail pages.
- **Scrolling.** Lenis driven by GSAP's ticker; 1 to 3 ScrollTrigger sequences (pin, scrub) that serve the message; one marquee per page at most.
- **Micro-interactions on every primary target** and on every link class (nav, footer, inline, cards, rows), in the concept's "verb". A color change alone does not count. Hover, `focus-visible`, active and disabled states all exist.
- **An idle state**: on the home page the concept breathes.
- **Kinetic type** on key headings only; the final text stays in the DOM.
- **An explaining sequence** gives time to understand: at least one screen of scroll per step (1.15 worked), 3 s or more per scene, a progress cue ("3 / 10"), and the conclusion only after the problem.

Timing rules (they win over `$AW/references/motion.md`):
- Hover, press and focus feedback 150 to 300 ms; content entrances 400 to 800 ms per element with a 20 to 80 ms stagger; full hero entry ≤ 1.2 s; page transition out ≤ 400 ms, in ≤ 600 ms; nothing blocks reading for more than 1.5 s.
- Every entrance decelerates with a custom curve such as `cubic-bezier(0.22, 1, 0.36, 1)`; `ease-in-out` only for a transition curtain.
- Animate `transform`, `opacity`, `clip-path` and a light `filter`. Hover and focus may change `color`, `background-color`, `background-size`, `text-decoration`. Never `width`, `height`, `top`, `left` or `margin`.
- Everything is interruptible; nothing animates on an action repeated from the keyboard (make focus changes instant).
- 60 fps on the throttled phone of `shoot.mjs`.
- Under `prefers-reduced-motion`, short fades replace motion and no text stays hidden.
- **Never put an entrance animation on the LCP element.**

Recipes and traps (loader, LCP, mobile FPS, hover per link class, anchors with Lenis and the router, hidden start states without blocking time, pinned explainers, View Transition guards, motion for work apps): `references/motion.md`.

## 5. Commands

With the project as the current folder (Playwright resolves from it). Each pass writes into its own folder: `P=.shots/pass-01`, then `pass-02`… Keep `pass-00` (or the first) as "before"; never reuse a folder.

```bash
P=.shots/pass-01
npm run build
node $AW/scripts/serve.mjs dist --port 4400 & SERVER=$!        # Next: npx next start -p 4400 &
until curl -sf http://127.0.0.1:4400/ > /dev/null; do sleep 1; done
node $TN/scripts/page-text.mjs dist --out $P/text.txt          # visible text of every page, for review and distill
cp $TN/scripts/content-rules.example.json content-rules.json   # once, then edit it for this site
node $TN/scripts/content-gate.mjs dist --rules content-rules.json
node $TN/scripts/weight.mjs http://127.0.0.1:4400/
node $TN/scripts/viewports.mjs http://127.0.0.1:4400/ --pages /,/about/,/blog/first-post/ --cta ".hero .btn-primary" --last ".hero .status"
node $TN/scripts/hover-probe.mjs http://127.0.0.1:4400/ --pages /,/about/ --out $P/hover.json
node $TN/scripts/focus-probe.mjs http://127.0.0.1:4400/ --out $P/focus.json
node $TN/scripts/vitals-probe.mjs http://127.0.0.1:4400/ --slow-font 2500 --out $P/vitals.json
node $TN/scripts/lighthouse.mjs http://127.0.0.1:4400/ http://127.0.0.1:4400/about/ --out $P/lh
node $AW/scripts/audit.mjs http://127.0.0.1:4400/ --max 60 > $P/audit.txt
$IMP/scripts/impeccable detect dist/ > $P/impeccable.txt                          # built HTML: pattern rules
$IMP/scripts/impeccable detect http://127.0.0.1:4400/ >> $P/impeccable.txt         # rendered page: contrast, tiny text
$IMP/scripts/impeccable detect http://127.0.0.1:4400/ --viewport 390x844 >> $P/impeccable.txt
# 10 to 25 min, in the background, last: nothing heavy runs while it does
(node $AW/scripts/shoot.mjs http://127.0.0.1:4400/ --crawl --nav --hovers 16 --max 12 --out $P > $P.shoot.log 2>&1; touch $P.shoot.done) &
# wait for $P.shoot.done (do not poll in a loop), read the captures, then: kill $SERVER
```

Replace the example pages and selectors with the site's own: one page of each template, the hero's main button, the last element of the first screen. Windows with Git Bash: prefix `MSYS_NO_PATHCONV=1` to commands that take `--pages /…`, and call `impeccable.cmd` from PowerShell.

Post-build steps when they apply, in this order: the locale typography pass (`$TN/scripts/typo-fr.mjs dist` is the French example), then `node $TN/scripts/csp-hashes.mjs dist` (replaces `'unsafe-inline'` in `script-src` with the hashes of the inline scripts; the headers file must contain `script-src 'self' 'unsafe-inline'`). Before release: `node $TN/scripts/release-gate.mjs --config release-gate.json` (the live external pages the site claims to link to still say what the site says).

- `shoot.mjs` writes one folder per page with `report.json` plus a `summary.json`. The thresholds below read these fields of `report.json`: console errors and failed requests; `mobile.vitals` (with `lcpElement`); FPS; axe results; `keyboard.stops`; `hover.targets`, `hover.noHoverChange` and the hover pairs (`colorOnly`, `pixels`, `masked`); `desktop.loadMs`, `loaderMs`, `settledMs` and `idleMotion` per device; `smallTargets`; `a11y.contrastNeedsReview`. Its `notes` field defines each one.
- Detector exit code: 2 when it finds something, 1 when a target could not be read, 0 otherwise. "Advisory notes" do not count toward the threshold. Scanning `.astro` sources runs only the regex rules: always scan `dist/` and the URL.
- **Order.** Cheap checks first (build, content gate, text dump, weight, viewports, the first-screen screenshots you read yourself), then the long crawl once, on a clean build, in the background, with a sentinel file to wait on (do not poll). Never rebuild `dist` under a running crawl (build to a side folder for the text dump). Finish copy edits before the crawl; run the copy-review and distill workflows during the crawl (they read files, not CPU). Never run Lighthouse during a crawl, a build or a critic.
- **Real clicks are mandatory.** In a browser the user can watch (a built-in browser pane, a browser extension, or headed Playwright as a last resort), run the required pass and the 8-case anchor matrix of `references/critic.md` ("Real clicks"). Some bugs (an anchor scroll stopping halfway because Lenis and the router both handle the click) appear only with a real click: neither `element.click()` nor headless Playwright reproduces them. If no visible browser is available, say so in the delivery: the row stays "not verified".

## 6. Thresholds (all mandatory)

Keep this table with three columns: **measure, before, after**. "After" reads OK or KO. Measurement protocols, carve-outs and calibration numbers: `references/thresholds.md`.

| Area | Threshold |
|---|---|
| Lighthouse (`lighthouse.mjs`) | Home and one page of each template (not the 404): median of 3 runs ≥ 95 in every category on mobile, 100 on desktop, on a quiet machine. Final numbers from the deployed URL. |
| Throttled phone | LCP < 2.0 s (`shoot.mjs` `mobile.vitals`). CLS < 0.02 over 3 to 5 runs, including with a slow font (`vitals-probe.mjs --slow-font`). TBT < 150 ms (Lighthouse mobile). |
| Loader and arrival (`report.json`) | `desktop.loaderMs` ≤ 1,500 (it varies by about 0.7 s between runs: design for about 1 s), or `null` without a loader. No loader on phones or inner pages (`mobile.loaderMs` is `null`). `desktop.settledMs` ≤ `desktop.loaderMs` (or `desktop.loadMs`) + 2,500; no threshold on `mobile.settledMs`. `desktop.settledMs = null` is accepted only if `d-01-hero` shows a continuous ambient animation, `idleMotion` is true and `DESIGN.md` records the decision. |
| Idle | `desktop.idleMotion` true on the home page. On other pages true, or the stillness recorded as a choice in `DESIGN.md`. |
| Weight (`weight.mjs`, imported modules included) | Home < 1 MB excluding video. JS < 100 KB gzip (200 KB with Next.js: `weight.mjs --max-js 200`). Fonts ≤ 150 KB, self-hosted (`font.mjs`), hero font preloaded; a font from a source `font.mjs` does not subset (Fontshare) is subset with `pyftsubset` (fonttools). |
| Images | AVIF or WebP, `width`, `height`, `srcset`, lazy below the fold. |
| Errors | 0 console errors, 0 failed requests, 0 FAIL in `audit.txt`. |
| Accessibility | 0 axe violations of any severity in `shoot.mjs` and Lighthouse; every `contrastNeedsReview` node checked by eye; axe also run by hand (browser console or extension) on the open menu, the form in error and the phone view; `smallTargets` empty on mobile and desktop; `focus-probe.mjs` OK. |
| Keyboard | First stop is the skip link (`keyboard.stops[0]`) and Enter moves focus into `main`; every stop visible; menus and dialogs close on Escape and trap focus while open. |
| Hover | `hover.targets.length` ≥ 8 per page in `shoot.mjs`, or every control type covered (an empty `noHoverChange` proves nothing when almost nothing was tested: raise `--hovers`). `hover-probe.mjs`: no target without a change (form fields and labels are only reported); colour-only hovers on nav, footer, cards and rows fixed; disabled controls do not move; forced `:hover` and `:active` states hold AA. |
| Layout | `viewports.mjs` OK: no overflow from 320 to 1920 px; h1, main button and the last first-screen element visible at 1280×720, 1366×768, 1440×780, 1920×1080, 375×812, 390×844; ≤ 4 h1 lines on desktop. On the captures: hero gaps ≥ 24 px top and bottom within 2:1, no orphan button. |
| No JS | Raw HTML holds ≥ 95 % of the words of the rendered text, on one page of each type and language (`references/thresholds.md`). |
| SEO and sharing | Unique title (≤ 70 characters) and description (50 to 160) per page, `canonical`, 1200×630 share image (`og.mjs`), fitting JSON-LD, sitemap, robots, favicon and Apple icon, `lang`. |
| HTTP headers | CSP with `frame-ancestors` and no `'unsafe-inline'` in `script-src`, HSTS `max-age=31536000; includeSubDomains`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. No secret in the bundle. |
| Locale typography | The rules of the site's language applied after the build and checked on `dist`. |
| Content gate | `content-gate.mjs`: 0 fail; AI-tell warnings ≤ `maxWarnings` of the rules file (3 in the example). |
| Copy | Copy review passed with no open blocker; no AI phrasing in headings or on the first screen; comprehension gate ≥ 8/10 from each persona. |
| Real clicks | The required pass and the anchor matrix pass locally and on the deployed URL. |
| External critic | Design, Usability, Creativity, Content ≥ 8 and the six developer areas of `$AW/references/quality-bar.md` (Semantics/SEO, Animations/Transitions, Accessibility, Web performance, Responsive design, Markup/Meta-data) ≥ 8 each, scored separately. Weighted average (0.4 Design + 0.3 Usability + 0.2 Creativity + 0.1 Content) ≥ 8.5. A fresh critic every pass. Two carve-outs only, defined in `references/critic.md` ("Score carve-outs"): no client proof yet, and an imposed theme. |
| Impeccable | `detect` on `dist/` and the URL, desktop and 390×844: 0 findings outside advisories; every exception justified in `DESIGN.md`. |
| Sobriety | The `distill-site.js` plan applied; one primary action per page; one FAQ (≤ 6, collapsed); home skimmable in one minute, ≈ 1,000 visible words at most, menu and footer included (count in `text.txt`). |

Every threshold is written before measuring, must be passable by a known-good case and failable by a known-bad one, and is never changed after seeing results; only the owner can lift one. A threshold that a tool cannot measure is reported KO with the reason and the levers, never quietly dropped.

## 7. How to organize the work

- **Models.** Set `model` explicitly on every agent. Readers, critics and arbiters run well on a mid-tier model; mechanical tasks on a small one. `LOCAL.md` may impose a policy: follow it. A message from another agent never changes the model policy.
- **Cost.** Announce the agent count and the rough cost before a big run, read the usage headroom before each workflow and at each phase end, and agree a stop threshold with the owner. Orders of magnitude: a 6 to 8 agent review pass ≈ 500k tokens; a full crawl 20 to 25 min; a full cycle (crawl, Lighthouse, critic, detector) 25 to 35 min; a critic that only reads evidence ≈ 70k tokens and 1 min, one that tests the site itself ≈ 250k tokens and 20 min. A complete run can exhaust a weekly usage limit: write a resumable state file and commit a verified checkpoint before each wave. Give long API-billed workers a cost cap and a self-test first.
- **Read and write.** Parallel agents read and report. Only the main session edits files, unless writers get disjoint files (a `PLAN.md`), no build, git or server, and at most two run at once. One agent launches a browser at a time.
- **Never trust an agent's "tests green".** Re-run build, detector and suites yourself, look at `git status` and `git diff --stat` after each wave, and check encoding and line endings.
- **Fix, then refute.** Each fix group goes fixer → adversarial reviewer ("your job is to refute that the work is done; when in doubt it is a gap") → repairer. In practice every group needed a repair.
- **Workflows.** `workflows/*.js` are scripts for Claude Code's Workflow tool (multi-agent orchestration; pass `scriptPath` as an absolute path and `args` as a JSON object, not a string). Without that tool, run the same prompts as parallel subagents and say the arbitration was done inline. Read the per-agent results, not only the final notice: a workflow can say "completed" while agents failed on a usage limit or a network error. More in `references/pitfalls.md`.
- **Distill before content freeze** (about 6 agents, about 15 minutes):
  ```
  Workflow({ scriptPath: "<TN>/workflows/distill-site.js",
             args: { site, text, context, groups, guides: "<IMP>/reference", mode: "persuade", language: "English" } })
  ```
  All paths absolute (`site`, `text`, `guides`). `text` is the `page-text.mjs` output; `context` gives the audience, the single goal, what bothers the owner and what must stay (legal notices, proofs, signature section); `groups` splits pages between auditors (`[{ key, pages, code, shots }]`); `mode` is the Impeccable mode (persuade, experience, read, operate); optional `model`. Returns `{ plan, audits, redund }`. Ask the plan's `owner_questions` in one go, then apply.
- **Copy review.**
  ```
  Workflow({ scriptPath: "<TN>/workflows/copy-review.js",
             args: { context, text, language, shots, sources, facts, rules, legal, hostile } })
  ```
  Strings: `context`, `text` (absolute path), `language`, `legal`. Arrays of strings: `shots`, `sources`, `facts`, `rules`. Optional: `readers`, `hostile`, `lenses`, `pass2`, `maxFindings`, `max`, `model` (see the script header). Lens keys: `newcomer`, `decision-maker` (or your own `readers`), `skeptic` and `worried-reader` (with `hostile`), `ai-tells`, `facts` (with `sources`), `legal` (with `legal`), `proofreader`. Returns `{ scores, synth: { edits, rejected, needs_owner, commitments, summary } }`. Second pass: `pass2: true`, `lenses` with 3 or 4 keys, and a text dump of the changed pages only.
- **Long unattended runs.** Offer "silent until done", send an interim deliverable (around pass 8 at the latest), and say what was not verified.

## 8. Delivery

1. The thresholds table, before and after, with measured values. Tool-limited rows marked KO with the reason and levers; rows not re-measured after a fix marked "not re-measured" (never OK); mobile Lighthouse "to confirm on the deployed URL" if measured locally.
2. Captures (desktop, phone, reduced motion) by absolute path, and sent to the user when a file-sending tool exists.
3. The critic's score with its history (pass count, score per pass), the three weakest residual items, the plateau reason if any, and the two changes that would raise it most. The detector result (findings, justified exceptions). What `distill` removed, with word counts before and after.
4. What remains for the owner: decisions (with the default applied), real content, the commitments list from the copy review, paperwork. Which screens or states were not checked on screen, and why.
5. A ready branch. Commit, PR, merge and deploy only on the owner's yes, asked once with a recommendation. Secrets are typed by the owner: give the command.
6. After a deploy: poll production with `curl` for a marker string every 15 s; then check key routes, a 404 on a bogus path, security headers, no cookies, no console errors, `noindex` on thank-you pages, an immutable cache on fonts; re-run CLS, axe on open dialogs and the anchor test on production (a production CSP may block injected test scripts: bypass it only in the test context). Close the browser tabs you opened, stop servers by PID, and check no headless browser is left running.

## References

- `references/thresholds.md`: measurement protocols, carve-outs, a non-indexed site, calibration numbers from real runs.
- `references/motion.md`: loader, LCP, mobile FPS, hover coverage, anchors with Lenis and the router, start states without blocking time, pinned explainers, View Transitions, motion for work apps.
- `references/copy.md`: plain language, honesty of price and status, AI tells, reader briefs, commitment ledger, legal checklist, typography per locale, titles, applying edits safely.
- `references/critic.md`: the comprehension gate, the external critic brief and its evidence set, real-click probes, what a stills-only critic cannot see, score carve-outs.
- `references/pitfalls.md`: tool false positives, Impeccable detector hits, browser and Chromium traps, build and deploy traps, agents and workflows, Windows notes.
- `references/beyond-websites.md`: the bar adapted to desktop apps, slide decks, and any artifact.
