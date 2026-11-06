# top-notch

A Claude Code skill that turns one word into a full quality bar for a website. Say "make this site top-notch" and the agent knows what you mean, which skills to chain, what to measure, and when it is allowed to stop.

A site is top-notch only when all four hold at once:

1. **Award-level design**: the level of an Awwwards Site of the Day.
2. **Understood in 5 seconds** by someone who knows nothing about the subject.
3. **True, sourced facts.**
4. **Maxed-out measurements**: speed, accessibility, SEO.

If one is missing, the site is not top-notch.

## The loop

| Step | What happens |
|---|---|
| 1. Baseline | Measure everything before touching anything, to get a "before" column. |
| 2. One checkpoint | The agent presents the concept (with quick mockups), the page plan and the decisions that belong to you. After your answer, it works without asking again. |
| 3. Build | Concept, art direction, typography, motion, pages, driven by the `awwwards` skill. |
| 4. Distill | Every piece of information said once, one primary action per page. On one site this cut the copy by about 45 %. |
| 5. Adversarial copy review | Reader agents hunt for errors in the text (newcomer, decision-maker, AI tells, facts, legal, proofreading), then an arbiter decides. A comprehension gate checks that the first screen is understood. |
| 6. Automated checks | Each with a numeric threshold (table below). |
| 7. Real clicks | Some bugs only show up when you really use the site in a browser. Headless scripts miss them. |
| 8. External critic | A fresh agent that has never seen the project gets only the screenshots and reports, never the code or the intentions. It scores like an Awwwards juror and ranks fixes. A new one every pass. Bar: every axis ≥ 8 and a weighted average ≥ 8.5/10. |
| 9. Loop | Fix, redeploy, re-measure, new critic, until every threshold is met. |

| Check | What it verifies | Bar |
|---|---|---|
| Impeccable detector | The visual tics of AI-generated interfaces | 0 findings |
| `shoot.mjs` (awwwards) | Every page on desktop, phone, reduced motion and keyboard, plus hover pairs and axe | every capture reviewed, 0 axe violations |
| `audit.mjs` (awwwards) | Errors, headings, broken links, thin content | 0 FAIL |
| `viewports.mjs` | No overflow from 320 to 1920 px; h1, main button and the last first-screen line visible without scrolling | OK |
| `weight.mjs` | Real page weight, imported modules and lazy images included | home < 1 MB, JS < 100 KB gzip |
| `hover-probe.mjs` | The hover of every link and button, nested elements included | no target without a change |
| `focus-probe.mjs` | The focus ring of every Tab stop, read in pixels | every stop visible |
| `vitals-probe.mjs` | CLS (also with a slow font) on a throttled phone, with shift sources, long tasks and the LCP element | CLS < 0.02 |
| `content-gate.mjs` | Banned words, false status claims, AI tells | 0 fail |
| `lighthouse.mjs` | Performance, accessibility, best practices, SEO, 3 runs, median | ≥ 95 mobile, 100 desktop |

The stop rule: the loop ends when every threshold is met, or when the lagging score has not moved for 3 passes and no accuracy error remains. Then the agent ships the best version and says honestly what is missing and what would raise it.

[SKILL.md](SKILL.md) holds the rules. The `references/` folder holds what was learned on real runs: motion recipes and traps, measurement protocols and calibration numbers, copy rules and reader briefs, the critic brief, known tool false positives, and how to adapt the bar to a desktop app or a slide deck.

## Requirements

top-notch is an orchestrator: it chains other skills and adds its own checks. Install them next to it, in `~/.claude/skills/`. Their files are not copied here: they are linked.

| Skill | Source | License | Role |
|---|---|---|---|
| `awwwards` | [juliobsz/skills](https://github.com/juliobsz/skills), folder `awwwards` | MIT | Backbone: concept to launch, `shoot.mjs`, `audit.mjs`, `serve.mjs`, the critic brief. **Required**: the scripts here reuse its browser helper. |
| `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Apache-2.0 | Anti-pattern detector, `critique`, `audit`, `distill`, `polish`. Needed for the distill step. |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills), folder `skills/web-design-guidelines` | see repo | Interface rules review. |
| `awesome-design` | [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (a collection of `DESIGN.md` files, not a skill) | MIT | Real design systems for inspiration. |
| `security-audit` | [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill), folder `skills/security-audit` | MIT | Targeted security review (headers, form, secrets). |
| `dataviz`, `video-transcript` | any | | Optional: charts, video references. |

Without the optional ones, the matching steps fall back to manual checks (SKILL.md §0 says how).

In the project you check: Node 20+, then

```bash
npm i -D playwright lighthouse
npx playwright install chromium
```

(the second line only if no Chrome or Edge is installed). The files in `workflows/` are scripts for Claude Code's Workflow tool (multi-agent orchestration); where it is not available, the agent runs the same prompts as parallel subagents.

## Install

With Git Bash, macOS or Linux (read every third-party skill before installing it):

```bash
SK=~/.claude/skills; T=$(mktemp -d)
git clone https://github.com/camilbenameur/top-notch-skill "$SK/top-notch"
git clone --depth 1 https://github.com/juliobsz/skills "$T/juliobsz" && cp -r "$T/juliobsz/awwwards" "$SK/"
git clone --depth 1 https://github.com/vercel-labs/agent-skills "$T/vercel" && cp -r "$T/vercel/skills/web-design-guidelines" "$SK/"
git clone --depth 1 https://github.com/cloudflare/security-audit-skill "$T/cf" && cp -r "$T/cf/skills/security-audit" "$SK/"
git clone --depth 1 https://github.com/VoltAgent/awesome-design-md "$SK/awesome-design-md"
```

Install Impeccable by following [its README](https://github.com/pbakaus/impeccable). `awesome-design-md` is a folder of `DESIGN.md` files, not a skill: point the agent at it when picking references.

Smoke test, from a project with a build in `dist/`:

```bash
node ~/.claude/skills/awwwards/scripts/serve.mjs dist --port 4400 &
node ~/.claude/skills/top-notch/scripts/weight.mjs http://127.0.0.1:4400/
```

Then, in Claude Code: "make my site top-notch", "pass this site to top-notch", or "audit this site at the top-notch bar". The skill also answers to French phrasings: « top-notch », « top niveau » (top level), « nickel chrome » (spotless), « haut de gamme » (high end), « envoie le paquet » (go all out).

Update with `git pull` in `~/.claude/skills/top-notch`.

## Personal rules

Put your own rules in a `LOCAL.md` file next to `SKILL.md`: banned words, the sources of truth for facts about you, who approves deploys, the model policy for agents, machine quirks. The skill reads it first and it wins over the defaults. `LOCAL.md` is in `.gitignore`, so it never leaves your machine.

## What's inside

```
SKILL.md                         the bar, the chain, the passes, the thresholds, delivery
references/motion.md             loader, LCP, frame rate, hover, anchors, pinned sequences
references/thresholds.md         measurement protocols, carve-outs, calibration numbers
references/copy.md               plain language, honesty, AI tells, reader briefs, legal
references/critic.md             comprehension gate, critic brief, real-click probes
references/pitfalls.md           tool false positives, detector hits, browsers, agents, Windows
references/beyond-websites.md    desktop apps, slide decks, any artifact
scripts/viewports.mjs            overflow 320 to 1920 px, first screen fits, h1 lines
scripts/weight.mjs               real page weight by resource type, gzipped, with ceilings
scripts/page-text.mjs            visible text of every page, for review and distill
scripts/hover-probe.mjs          hover of every target, descendants and card containers included
scripts/focus-probe.mjs          focus ring of every Tab stop, in pixels
scripts/vitals-probe.mjs         CLS with sources, slow-font test, blocking time, LCP element
scripts/lighthouse.mjs           Lighthouse x3 per page and mode, medians, minimums
scripts/content-gate.mjs         rule-file text gate (start from content-rules.example.json)
scripts/release-gate.mjs         live external pages still say what the site claims
scripts/csp-hashes.mjs           pins script-src to inline script hashes after the build
scripts/typo-fr.mjs              French typography pass, an example of a locale step
scripts/lib.mjs                  locates the awwwards skill's browser helper
workflows/copy-review.js         adversarial readers + arbiter (+ commitments list)
workflows/distill-site.js        page auditors + redundancy hunter + one cut plan
```

## License

MIT
