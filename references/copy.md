# Copy: the bar and how to check it

## Contents

- The reader
- Plain language
- Honesty: price, limits, status
- AI tells
- The copy review workflow
- Facts, commitments and the content gate
- Legal pages checklist
- Typography per locale
- Titles, descriptions, share images
- Applying edits safely
- Facts at scale (reference and fan sites)

## The reader

Write for the least technical reader of the audience. Jargon is explained, shown as a small parenthetical label next to the plain word, or kept to pages written for technical readers; such a page carries a short note ("this page is for the curious; you do not need it to understand the offer"). When a technical idea is at the heart of the offer, illustrated, animated scenes with two caption lines each explain it better than a paragraph.

When a reel or a video inspired a section, keep the idea and write your own example; never copy its script. Fake URLs drawn in scenes use `.example` domains.

## Plain language

- The H1 and the meta description state what is done, for whom, and from what price, in everyday verbs.
- Do a glossary pass: list every term the target reader may not know, then replace it or define it once.
- Avoid extended metaphors: one image repeated across a page is flagged by every reader.
- When rewriting a headline, give a simple default plus exactly one alternative, then regenerate everything derived from it in the same pass (meta description, share image, notes), redeploy, and check it live.
- Accuracy beats brevity: delete an explanation that cannot be given correctly in plain words.

## Honesty: price, limits, status

- Next to a "from X" price, show the total price of a working outcome on the offers page.
- Any payback, ROI or saving figure divides the **total** cost until the benefit really starts by the monthly benefit (a pilot that earns nothing is part of the cost). Recompute every sum and every default value of an interactive calculator.
- A cost fact in a caption ("under one cent of AI calls") carries the clause that human work is billed separately.
- Each limit or admission sits next to every claim it qualifies: a limit of the offer on the offers page, a capability gap next to the offer that sells that capability.
- Anything that does not exist yet is written in the future tense, never the present. A vague "not available yet" can be misread (as "free", as "coming soon"): say what cannot be done yet and why.
- Never claim a comparison or a process that did not happen; reframe the truth as a strength.
- Each status is exact: planned, in progress, delivered, in production. A spec is not a delivered project.
- Every claim of improvement states its condition or cost. Facts are tagged sourced, calculated or estimated; an unmeasured number is labelled an objective.
- Add one reader question to every review: "what would change my decision, and where is it hidden?"

## AI tells

Banned in headings and on the first screen, rare everywhere else:
- "Not X, but Y" antitheses, and the same mirror antithesis repeated across a page.
- Systematic rule-of-three rhythm; "First / Then / Finally" plans.
- Punchlines, aphorisms, noun-only slogans as H1.
- Reveal colons ("The result:", "two things:").
- Sincerity markers ("honestly", "truly", "real", "really").
- Essay connectors ("Moreover", "hence the need for").
- Consultant abstractions ("framework", "guardrails", "end to end", "seamless", "leverage", "unleash", "elevate", "journey", "delve").
- Over-promises ("risk-free", "guaranteed").
- Em and en dashes.
- Overuse of "each / every"; identical sentence openings; bursts of semicolons; calques from another language; passives with no agent.

After applying fixes, run `scripts/content-gate.mjs` with a rules file (start from `scripts/content-rules.example.json`) and keep warnings under its `maxWarnings`, then confirm with `curl` on the deployed HTML that removed phrases are gone. When a proper noun trips a rule (a product called "Elevate", say), exclude that page with `allowIn` or narrow the pattern, and note why in the rules file.

## The copy review workflow

`workflows/copy-review.js` runs independent readers, then an arbiter. Default lenses:

| Key | Lens | Brief, in short |
|---|---|---|
| `newcomer` | Newcomer | The least technical reader (a salesperson, a recruiter). Someone forwarded the link. Look at the captures first, then read. Score = clarity /10; 5-second test: who, what, for whom, what next. |
| `decision-maker` | Decision-maker | The person who signs. What exactly am I buying, total cost, risk to money, data and team time, why them rather than another vendor, is it serious? Score = desire to get in touch. |
| `skeptic`, `worried-reader` | Hostile pair (with `hostile: true`) | Unsupported claims and gains without their condition or cost; questions the text leaves unanswered. |
| `ai-tells` | AI tells | The catalogue above. Score 10 = indistinguishable from a careful human writer. |
| `facts` | Facts (with `sources`) | Every date, title, figure, price, status and name against the sources; tense; every sum recomputed; pages do not contradict each other. |
| `legal` | Legal (with `legal`) | Accuracy, tense, promises that can be kept, sourced from official pages with URLs. |
| `proofreader` | Proofreader | Spelling, grammar, punctuation and the typographic conventions of the site's language; register constant. |

Custom `readers` replace `newcomer` and `decision-maker` and keep their own keys.

Add one persona per real audience (`readers`), plus the hostile pair for non-technical audiences (`hostile: true`): a skeptic who hunts unsupported claims and a worried reader who asks what the text fails to answer. Feed every lens a short facts file (`facts`). The arbiter also returns a `commitments` list (see below).

Common rules for every reader: read only; 25 findings at most; each finding has the page, a quote copied **exactly**, the problem, a severity (blocker / major / minor), and a ready-to-paste rewrite no longer than the original unless it adds a needed fact; never invent a number, client, guarantee or commitment; no personal taste without effect on understanding, trust or accuracy.

The arbiter checks every quote verbatim against the text dump, merges duplicates, rejects false leads with a reason, puts what only the owner can answer in `needs_owner`, and orders edits by severity.

Second pass: `pass2: true`, `lenses` with 3 or 4 keys, and a text dump of the changed pages only. Readers then report only what is still blocking or major, 10 findings at most, with an empty rewrite when the decision belongs to the owner. Expect scores to plateau near 7 by the third pass: then hand the owner questions over instead of looping. A regression pass is worth its cost.

## Facts, commitments and the content gate

Step 1 of the loop writes a facts file and a forbidden-claims list. Wire them into three layers:
1. **A build-time content gate** (`scripts/content-gate.mjs` with a rules file): banned words, wrong "in production" claims (allowed only on the pages where it is true), dashes, phone numbers, placeholders.
2. **The copy review**: `facts` and `rules` args with explicit negatives ("X is never named", "this activity does not exist yet").
3. **A release gate** (`scripts/release-gate.mjs`) that fetches the live external pages the site links to or makes claims about (3 attempts, 20 s timeout each), and tells "could not fetch" apart from "content mismatch".

Anything the readers cannot confirm becomes an owner question, never copy. After an agent edits text, diff for status inflation, legal commitments and role wording, and trace every added descriptor to a source. Agents report deviations; they never apply them silently.

Keep a **commitment ledger** (the copy review's `commitments` output): everything the site promises that the owner must make true before selling or launching, such as insurance, reviewed contract templates, liability terms, response times, or where the form service stores messages.

## Legal pages checklist

Adapt to your jurisdiction and verify every point on official sources, never from memory (no phone number or address from memory either):
- data collected, purposes, legal basis, whether sign-in is optional, retention including backups, recipients, international transfers, IP processing by the host, cookies, the full list of rights, the supervisory authority;
- publisher identity (some jurisdictions allow a pseudonymous publisher if the host is identified), host name, address and phone copied from the host's own legal page;
- for a site that asks businesses to share data: a short data-handling FAQ (what we sign: NDA, then a quote with scope, price, deadlines and code ownership, then a processor contract if personal data is involved; where data is hosted; the AI vendor's API terms; a local-model option) and a visible "your data stays with you" block;
- a single source for privacy statements: a sign-in button caption lists exactly what the privacy page lists.

## Typography per locale

- Apply the typography of the site's language after the build, on `dist/**/*.html`, touching only text between tags, never `script`, `style`, `pre`, `code` or attributes. `scripts/typo-fr.mjs` is the French example (no-break spaces before `: ; ! ?` and `%`, inside guillemets, thousands separators, times like "17 h 40", number and unit).
- Edit the sources with plain spaces, never `dist`, so quotes from the text dump match the sources.
- For an app, apply it as a DOM pass on rendered text plus a test that counts violations.
- Scan `src`, `dist` and docs for hidden characters (U+200B to U+200F, U+202A to U+202E, U+2066 to U+2069, U+FEFF): some editing tools decode `\uXXXX` escapes into real characters.

## Titles, descriptions, share images

- Titles ≤ 70 characters and keyword-bearing ("Pricing: website audit from 500 EUR", not "Pricing | Name"). Meta descriptions 50 to 160 characters.
- Dates abbreviated with dots can fool a repeated-sentence check, and decorative strings can trip the audit (a file name shown as decoration containing "TODO"): reword them rather than ignoring the warning.
- Write canonical and absolute `og:` URLs from the final host: deploy an unindexed first version early to know it.
- Regenerate the share image after copy changes, rendered in the site's colour scheme (a dark site: emulate the dark scheme and look at the PNG), and make the Apple touch icon and `favicon.ico` from the same card.

## Applying edits safely

- Apply the arbiter's edits with a small script driven by JSON (`[{ file, a, b }]`): normalize CRLF before matching and write back the original line endings; assert exactly one match per edit; have a loose mode where a no-break space in the file matches a plain space in the quote; print one line per edit; throw on a miss.
- Match against the data source text (entities decoded, curly versus straight apostrophes as in the source), not the rendered HTML.
- Write scripts and data to files, not shell heredocs: apostrophes and backslashes break heredocs (a Windows path became control characters).
- After a bulk class rename, re-check states visually.
- Prove a regression test by mutation: mutate, run, restore in a `finally`, run again.

## Facts at scale (reference and fan sites)

Researchers open a source for every claim; a skeptic reopens each source to refute it; a completeness critic looks for gaps; drafters are checked sentence by sentence; a final review returns exact replacements. Show reliability in the text ("community wiki, not cross-checked", "unverified", "inferred") and keep a visible "what is still unverified" section. Treat a content creator's numbers as opinion until reproduced. Generate "in short" summaries from the checked text, with the same caveats. A source that blocks fetchers can be read through a real browser. Generate maps and data graphics from the data at build time so they cannot drift, and never trace a third party's art or brand assets.
