# Coverage Debt

> **One page on purpose.** This list is short enough to read every session. The moment it
> grows into a backlog it stops working — that is what happened to the coverage standard it
> replaces. Opened 2026-07-30.

## The rule

`jest.config.js` holds two kinds of number, and they are not interchangeable:

- **Standards** — what CLAUDE.md §Testing actually asks for, in force because we meet it.
  **Never lower one.** Raise the code to it.
- **Floors** — a measured *no worse than today* ratchet on code that does not yet meet its
  standard. **A floor is not a standard and never becomes one.** Each floor's outstanding
  debt is a row below. **When tests are added, raise the floor in the same commit** — that
  is the ratchet turning, and it is the only mechanism here that actually holds.

## Why this file exists

On 2026-07-30, sizing a small config fix for the newly landed Collaborate code turned up
something larger: **this repo had never run coverage on any automated run.** `npm test` was
bare `jest`, `.husky/pre-commit` was bare `jest`, and there is no CI. The written
`global: { lines: 80 }` dated from **2026-05-04** (`d793b77`), when the measured set was
**9 files** in `server/utils`. That folder now holds **47**, an AI engine grew inside it,
and nothing ever objected.

**The standard did not slip. The measured set grew five-fold underneath a number nobody was
checking.** Two standards CLAUDE.md names — Restify routes ≥90% and mixins ≥80% — were not
being measured at all.

Fixed the same day: coverage is now collected on **every** run, so the pre-commit hook
enforces it. Cost: `npm test` went from ~11s to ~20s.

## The debt

Measured 2026-07-30 across 8,759 lines. Repo-wide: **6,750 covered — 77.1%**
(70.9% when this file was opened the same day; see *Paid* below).
"Owed" = lines that must newly execute to reach that row's standard.

| owed | area | now | standard | note |
|---|---|---|---|---|
| **264** | `server/routes/firmManager.js` | 61% | 90% | ⚠ **Pay this during Collaborate slice 2**, which rewrites this file — the tests are that rewrite's safety net. Desktop is also active here; say so before starting. |
| **510** | `server/advisorEngine.js` | 37% | 80% | 🔴 **DEFERRED DELIBERATELY** — see below. Frozen, not forgotten. |
| **16** | `mixins/speechMixin.js` | 78% | 80% | The one mixin still short. Its microphone lifecycle *is* tested (`speechMixin.component.test.js`); the gap is branches. Bucket is already above standard, so this is optional. |
| **84** | `server-middleware/**` (ours) | 12% | 80% | 4 SSE proxies at 0%: `advisor.js`, `course.js`, `translate.js`, `apiProxy.js`. Need a fake backend to drive. `report.js` (58%) is the only one with tests. |
| **60** | `server/routes/report.js` | 40% | 90% | The largest remaining route gap after firmManager. |
| **37** | `server/services/**` | 14% | 80% | `driveService.js` needs Google credentials — the documented-blocker class. Make it fail loudly rather than fake it. |
| **2** | `server/routes/mentor.js` | 88% | 90% | |

⚠ **`server/routes/**` cannot reach its 90% standard until `firmManager.js` and `report.js`
are done**, so it stays a floor (now 73% lines, up from 71%) rather than becoming a standard
— even though 8 of its 10 files are individually at or near it.

## Paid — 2026-07-30, the day this file was opened

- **`server/utils/logicTrees.js` 22% → 82% lines**, taking the whole `server/utils/` bucket
  from 67.9% to **84.1% — above its 80% standard**, so its config entry moved from a floor
  to a ratchet above the standard. `tests/unit/learnReferenceFormatters.test.js`: 81 tests
  over the 13 learn-mode reference formatters. Each is asserted to read its data file, open
  with its documented heading, render a body, and interpolate no `undefined` — the two
  silent failure modes named above.
- **`server/utils/sanitiseInput.js` branches 83.8% → 100%.** 7 tests for the case-review
  object and the four identity fields (`sessionId`, `clientId`, `advisorId`, `firmId`),
  which were entirely unexercised despite being the values the engine must firm-validate.
  **Its old `branches: 85` was retired by being met, not by being lowered.**

Paid later the same session, all in code that guards a boundary:

- **`server/middleware/firmAuth.js` 89.4% → 100% on all four metrics, and pinned there.**
  Two things had no test at all: the dev **mentor** bypass (a strictly wider identity than
  the dev advisor bypass it sits beside — the mentor view is not firm-scoped), and the whole
  of **`requireMentorRole`**, the one gate that deliberately crosses the firm boundary.
  Where `requireManagerRole` admits two roles, that one must admit exactly one, or a firm's
  own manager could read across firms. Now asserted, including that a `firm_manager` is
  refused.
- **`server/routes/cases.js` 76.3% → 98.6%.** `anonymiseCasePreview` was exported and
  mounted with **no test at all** — the one case route that sends client content to an LLM.
  Its contract is a privacy boundary, so the tests assert it: manager-gated, firm-scoped,
  shared-cases-only, and **the raw summary and transcript never appear in the response**,
  only the scrubbed copy. Plus a table over every handler proving each fails closed on
  missing identity and returns a safe envelope — no stack trace, path or SQL — when the DB
  fails in production.
- **`server/routes/health.js` 0% → 100%.** Three lines, but the shape (`200` + `ok: true`)
  is a contract with things outside this repo: a deploy check, a load balancer, the master
  app. Also asserted to leak nothing but `ok` and `timestamp`.

Third batch — the whole `mixins/**` bucket, **32.4% → 93.4% lines**, above its 80% standard
for the first time (it had never been measured at all):

- **`caseMixin.js` 0% → 100% lines** (48 tests) — 216 lines and the largest untested file
  outside the AI engine. Three behaviours exist because of a rule or a past defect, and are
  asserted hardest: **"mine" is keyed on the server-returned advisor id**, so a colleague's
  firm-shared case stays visible to the AI but is never listed as the advisor's own; the
  **token race** that once made saved cases look *wiped* after a refresh, because the first
  load ran before the parent resolved the Bearer token; and **promotion sends only a case
  id**, so promoted coaching text and its audit stamp cannot be forged from the browser.
  Also covers the microphone teardown on panel close — the same privacy class as the
  recogniser defect in `speechMixin.component.test.js`.
- **`localeMixin.js` 1.6% → 100% lines** (22 tests) — the language picker and the on-demand
  AI translation of the whole UI. The tests that matter prove the **prototype-pollution
  guards still hold**: the reply is built by an LLM and turned back into a nested object, so
  a returned key of `__proto__.x` or `constructor.prototype.x` would otherwise write onto
  every object in the page. Both are asserted dropped, and `Object.prototype` untouched.
- **`currencyMixin.js` 38% → 100% on all four metrics** (18 tests) — every money figure on
  every report screen. Its doc comment promises that *any* failure (401, offline, backend
  down) silently keeps the cached currency because "a report must render regardless"; that
  promise is the kind that rots unnoticed, since a swallowed error looks the same whether
  it is deliberate or accidental. Most of the suite drives those failure paths.

**A trap for anyone testing an async `mounted()` here:** `caseMixin.mounted()` awaits the
legacy-case migration and only *then* calls the load, which awaits again — so a single
`$nextTick()` settles neither and **every assertion fails against empty state for the same
wrong reason**. Use a microtask loop, not `setImmediate`, because the promotion tests run
under jest's fake timers, which fake `setImmediate` too.

**Two fixtures of mine that were wrong, and what they proved:** a DB-failure test asserted
502 and got 404, because `getSharedForFirm` deliberately falls back to the dev file outside
production — so that test now pins `NODE_ENV`, and its sibling documents the dev behaviour.
And a `shareCaseWithMentor` fixture sent a flat body and got a correct 400: the approved copy
arrives nested under `anonymised`. **Both were my error, not the code's** — worth stating,
because a failing new test on old code reads as a bug until you check.

**Two things worth not rediscovering:**

1. **A blanket `/undefined/` assertion is a false positive.** The Heald Matrix reference
   legitimately contains the sentence *"do not leave the next step undefined"*. The check
   must match value positions (`: undefined`, `• undefined`, `**undefined**`) only. The
   blanket version was written first and failed on correct content.
2. **Recompute a bucket's floor whenever its exclusions change.** The first draft of the
   `./server/collaborate/` floor was measured with its 0% boot file still in the bucket, so
   it read 83/77/93/82 over code that actually measures 96/82/99/99 — 13 points of silent
   slack, in a gate written to remove exactly that.

**Already at standard, for contrast:** `server/report/**` (the financial models) 100% lines
across 11 files · `server/courseEngine.js` 92% · `sanitiseInput.js` and
`validateAIResponse.js` 100% on all four metrics · and **all of the landed Collaborate code**
(90.5% / 100%), which arrived better covered than anything we own.

## The one deferred item, and why

**`server/advisorEngine.js` — 510 lines owed, frozen at a measured floor.** It is a
3,343-line SSE streaming engine that calls OpenAI. Chasing the number as the file stands
would mean mocking so heavily the tests test the mocks. The honest order is
**decompose, then test**, as its own workstream. Its floor stops it getting worse in the
meantime.

Its real safety net today is not Jest: `scripts/scenario-lab.js` and
`domain-detection-check.js` exercise this path over fixed cases. That testing is real; it
simply cannot be counted here. ⚠ And the Scenario Lab has known blind spots — recorded in
`ACTIONS.md` for logic-tree entry nodes and ghost references — so a green lab run is not
evidence for a change it does not reach.

## The three controls

A written to-do is what failed here. From the desktop's own note of 2026-07-30: *"A boot
warning is not a control. This one had been logged and carried for days."*

1. **The gate.** Coverage runs on every `npm test`, so the pre-commit hook enforces every
   floor. This stops decay. It does **not** force progress — a floor is a brake, not an
   engine, and it would not have caught what went wrong here.
2. **The touch-rule.** No new work lands in a file carrying debt without paying that row
   off. Needs no calendar: it fires when someone is already in the file. This is what puts
   `firmManager.js`'s 264 lines inside Collaborate slice 2, where they belong.
3. **The checklists.** This file is read at `/startup` and `/shutdown`, and before a release
   tag — not left in `ACTIONS.md`, which is ~1,500 lines and where this would have died.

**Honest limit,** in this project's own words about the pre-push hook: *sealed against
accident, not against intent.* Any of these can be undone by someone who decides to — but
only deliberately, and it shows up in a diff.

## Not a coverage job, but found while measuring

- **`store/` does not exist.** CLAUDE.md names Vuex modules as the only global state
  mechanism and the Engineering Standards list `store/` as a directory. Nothing is broken;
  the document describes a directory the repo does not have. Worth a line in ACTIONS.md.
- **`npm run test:coverage` now duplicates the default.** Coverage is always on, so that
  script's only remaining value is its reporter. For the full per-file table:
  `npx jest --coverage --coverageReporters=text`.
