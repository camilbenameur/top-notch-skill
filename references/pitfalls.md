# Known pitfalls

## Contents

- Tool false positives (do not "fix" these)
- Impeccable detector: typical hits
- Browsers and Chromium
- Build, folders and deploy
- Agents and workflows
- Windows notes

## Tool false positives (do not "fix" these)

- `keyboard.stuck` on three identical unlabeled inputs: a tool artefact, but add the visible labels anyway.
- `skipLinkFirst` false on a non-English site: the check only knows English labels. `keyboard.stops[0]` is authoritative (an in-page link to `#main`).
- `audit.mjs` "no sitemap" on a deliberately non-indexed site.
- A `colorOnly` flag on a real transform: open the hover pair before changing anything.
- "Failed request" lines for the 404 probe URL during a crawl.
- `idleMotion` is a diff of two screenshots 1.5 s apart (threshold 0.0005). It can miss a looping idle animation with a long pause: re-run once, shorten the loop pause, or use a larger, higher-contrast idle element. If the motion is visible, prove it with your own diff and write "tool KO, visible".
- A hidden browser pane freezes idle tests.
- `shoot.mjs --crawl` hits sign-in and API endpoints: answer `/api/me` with `200 { user: null }`, make login a redirect, add `rel="nofollow"` and `Disallow: /api/`, and exclude those pages.
- `--crawl` drops query strings: for query-routed apps, run `shoot.mjs` per URL in a loop.
- Two `<h1>` on a page generated from a markdown file that has its own `# Title`.
- Sections under `content-visibility: auto` are skipped by `innerText`: use `page-text.mjs --force-visible`. Closed `<details>` are skipped too (one site lost 23 % of its copy to this): `page-text.mjs` opens them.
- `audit.mjs` counts JS without imported modules (it said 8 KB where the real figure was about 60 KB): use `weight.mjs`.

## Impeccable detector: typical hits

| Rule | Fix |
|---|---|
| `undersized-ui-text` | Raise the size; visible labels at least 11 to 12 px. |
| `line-length` | Cap prose around 60 to 68ch. Table cells ignore `max-width` on `td` unless scoped, e.g. `.doc table td:last-child { max-width: 40rem; }`. |
| `cramped-padding` | Inner padding on bordered containers. |
| Side-border accent | A tinted background instead; under `forced-colors`, a full outline, never a one-sided border. |
| Repeating stripes | Remove `repeating-linear-gradient` decoration. |
| Wide letter-spacing | ≤ 0.05em on body text; wider only on short uppercase labels. |
| `aphoristic-cadence` | A copy problem (often translated text): send it to the copy review. |

Summarise a report: `grep -E '^  \[' .shots/pass-NN/impeccable.txt | sed -E 's/"[^"]*"//g' | sort | uniq -c | sort -rn`

## Browsers and Chromium

- Launch through the awwwards `browser.mjs` (bundled, then cached, then system Chrome or Edge) and test with a five-line script (launch, print `browser.version()`) before blaming a check. A bundled headless shell can be missing, a bundled Chromium can fail with `spawn UNKNOWN`, and a `channel: 'msedge'` launch hung once while a persistent context on a fresh temp profile worked.
- **Never kill a browser by image name** (`taskkill /IM chrome.exe`, `pkill chrome`): it also closes the user's own browser. Stop a stuck Chromium by the PID you started, and close every browser in a `finally`. Tell sub-agents the same, and never let them launch the user's installed browser profile.
- Do not use `waitUntil: 'networkidle'` with a dev server's hot reload.
- Make each capture scene fail soft so one broken state does not lose the run.

## Build, folders and deploy

- Keep the project, `dist` and `node_modules` outside synced folders (OneDrive, Dropbox): sync slows builds and skews Lighthouse, and `npm install` can replace a junction with a real folder.
- Do not commit rendered PNG folders (`.shots/`, rendered decks): ignore them.
- Check `git status` for debug litter after every agent wave.
- A stale server from another session may hold your port: check what it serves, never kill it, use another port.
- A font subset gains little when the files are already Latin subsets (127 → 116 KB); the real LCP fix was the font swap strategy.
- Isolate Python tools (`fonttools` for subsetting) in their own virtual environment.

## Agents and workflows

- **A workflow can report "completed" with empty or partial results** when agents hit a usage limit or a network error. Read the per-agent results (the run's journal) and the failures block; re-run the pass if any lens failed.
- Guard agent calls: throw when a result is `null`, and when any parallel builder returned nothing.
- Resume from cache when the runner supports it: completed agent calls replay when their prompt and options are unchanged, so never edit the prompts of finished agents; append new phases instead. Before relaunching a stalled run, check whether it is still writing, or two runs will edit the same files.
- Relaunch only missing items, judged from the files on disk (pass the list of missing items in `args`).
- A workflow's result file can be a JSON envelope (`summary`, `agentCount`, `logs`, `result`) where `result` is itself a JSON string: parse it twice.
- A closed session or a headless worker that ends its turn can kill its background workflows: tell a worker not to return before its workflow finishes.
- If the Workflow tool refuses a script path, read the file first and pass its text inline, or fall back to parallel subagents and say the arbitration was done inline.
- **Waiting.** Launch a long crawl in the background with a sentinel file, and wait on that file with an until-loop or the harness's notification, never by polling. Put a `PATH` export on its own line: in `export ... && cmd &`, the `&` sends the whole chain to the background.
- **Low-RAM machines.** One browser at a time, closed in a `finally`; wait while free memory is under about 450 MB; take an archive of the project before large builds.
- Dry-run a workflow script with stubs (`phase`, `log`, `parallel`, `agent`) and a syntax check before spending tokens on it.
- Writers get disjoint files and exported copies of shared data; no build, git or server; at most two at once on a small machine; one browser at a time (a lock file with the PID and a start time, with stale detection). Read-only reviewers get no browser and no build.
- Agents stall when the machine sleeps or the network drops: keep the machine awake and give them a "continue from the files on disk" instruction.
- Never import or launch an app's entry-point module from a test agent, and audit sub-agent transcripts for process kills afterwards.
- A pasted API key in a chat is compromised: refuse to use it and have it revoked.
- Do not use third-party stealth-browser or captcha-solving services for QA: test locally.

## Windows notes

- Git Bash rewrites arguments that start with `/` into Windows paths: prefix `MSYS_NO_PATHCONV=1` (`--pages /`). That flag also stops conversion of `/c/...` script paths, so pass `C:/...` paths to Node. Lighthouse `--output-path` with an absolute `/c/` path fails: use a relative path.
- Shell heredocs break on apostrophes and backslashes: write scripts and data to files.
- Python: no `C:\Users` in a non-raw string (`unicodeescape`): use forward slashes; set `PYTHONIOENCODING=utf-8` for accented output (ignored under `python -I`).
- `grep -P` fails under some Git Bash locales: scan with Node or Python.
- PowerShell may block `npx.ps1`: call `npx.cmd`; do not change the execution policy.
- `taskkill` from Git Bash needs doubled slashes: `taskkill //PID <pid> //T //F`.
- An old Node first in `PATH` makes Playwright refuse to start: check `node -v` in every shell call.
- Importing a module by absolute path needs a `file:///C:/...` URL.
- Under heavy load, Git Bash can fail to fork: retry the call from PowerShell.
- The file system is case-insensitive: a report named `navigation.md` overwrote `NAVIGATION.md`.
- Some machines reserve port ranges or refuse `::1`: serve on `127.0.0.1` and pick a free port.
