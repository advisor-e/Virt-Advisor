# Session Notes — 2026-08-22 · Laptop, Session 81

> **Branch `feat/advisor-progress`.** Suite **329 suites / 6,101 tests green**, lint 0 errors,
> tree clean, everything pushed.
>
> **One item closed: 4.34.** Twelve live items remain, three of them needing Mike.
> `master` is untouched — this branch is 7 ahead, 0 behind.
>
> 🔴 **`v0.10.0` is still awaiting pull by the master team.** Unchanged from session 80: Mike
> parked the email, and the ledger row records it as *Awaiting pull*. Nothing here changes that.

---

## 🔴 FIRST THING THE DESKTOP MUST DO

**Nothing new.** Session 80's instruction still stands and has not been superseded: merge
`master` (it moved 60 commits to `458cf9e`), then `npm install` — `playwright` was added as a
devDependency and `package-lock.json` changed.

This session added **no dependency** and touched **no shared configuration**.

---

## What shipped

| Commit | What |
|---|---|
| `e25b80c` | **4.34** — the Coach reading carries its real figures, for both readers |
| `2f3b0e9` | the screen's headings get the same caveat the prompt got; 4.34's closure record |
| *(this one)* | three document corrections found at shutdown, and one prose claim now guarded |

---

## 1. What 4.34 was, in one paragraph

`data/report-model-summaries.json` stored each model's Coach reading as **the sentence with
its numbers taken out**, because the figures are computed when the screen runs.
`ModelGuide.vue` printed those lines verbatim. So the Model Guide read *"your [working
capital] of working capital … takes [n] days … about [amount] more revenue a year"* where the
model's own screen reads **$120 · 30 days · $1,800** — and **the AI was handed the same
bracketed text**. Mike, reading the page the evening it shipped: *"it makes this section
worthless"*.

The sentence stays the single source both readers share. It now carries `{named}` gaps, and
each reader fills them from the same figures — the screen in the firm's currency, the AI in
the platform default. See **P21** of [`features/report-models.md`](features/report-models.md).

---

## 2. 🔴 The item's own plan was wrong, and checking it before building is what found it

The to-do item said the route could compute every model from its defaults. **Two of the
readings were not the model's to give.** Working Capital's *"cut it to 20 days"* what-if lived
in `BusinessPerformanceReport.vue`; EBITDA's dip year and terminal share lived in
`EbitdaDcfReport.vue`. Reproducing either on the backend would have been **the same sum
written twice** — the drift fault this repo keeps closing, in a new place.

**They were moved into the models.** Both screens now read them from there, and the golden
tests confirm the move changed nothing.

⚠ **The EBITDA half went one step past what was explicitly approved.** Mike approved moving
*one* derivation; a second turned out to need the same treatment for the same reason. It was
reported in the message asking to commit, rather than folded in quietly, and approved there.

**The transferable part:** *a figure quoted on two screens has one home.* A number you cannot
quote without copying its arithmetic is a number in the wrong place.

---

## 3. 🔴 A Brief had gone false about the app's own capability

Found at shutdown, not during the work. [`features/report-models.md`](features/report-models.md)
§3a still said, in red:

> **THIS ONE HAS NO SCREEN, AND THAT IS A STATED EXCEPTION.**

True when Mike ruled it on 2026-08-21. **`/model-guide` was built the next day** (`68f5fae`)
and that paragraph was never revisited — while **P20, higher up the same page, described the
screen correctly throughout**. The Brief told a reader both things at once. The identical
sentence sat in `data/report-model-summaries.json`'s own header, **and I read past it that
morning** while editing that very file.

**This is session 80's finding one section along and in the other direction.** That one had
the Brief *understating* what works (`playwright` was installed and the Brief denied it); this
one had it *denying a screen that exists*. The shared cause is stated plainly because it will
recur: **no test reads prose.**

**So one piece of prose is now guarded.** P20 also named **three** models as having no Coach
panel when there are **four** — Lease vs Buy omitted from the day it was written.
`reportModelSummaries.test.js` now **reads that sentence in the Brief** and fails when it
stops matching the data. Mutation-verified: put the old wording back, the test fails.

⚠ **The other counts and capability claims across every Brief are NOT guarded.** Only this
one sentence is. Recorded in [`ACTIONS.md`](ACTIONS.md) as an observation rather than started,
because a sweep of every claim in every Brief is Mike's decision, not a job to begin unasked.

---

## 4. The risk this fix introduced, and the ruling on it

**The AI now reads real money where it read `[amount]`** — including *"$4,420,963"*. All six
models state "illustrative teaching figures" in their limits and the list instruction already
forbids passing them off as a client's, but that asked the model to join two sentences a page
apart.

Mike ruled the same day that both headings name the figures as samples **in the same breath as
the number** — *"on the screen's own sample figures"*, in the prompt and on the screen. Tests
fail if either loses it.

**Raised before shipping rather than after.** An enrichment that makes something quotable
changes what can be misquoted.

---

## 5. For the other machine

**Nothing here touches Course Builder or the Business Performance Report programme.** The
files changed are the report models' backend, three report screens' Coach panels, the Model
Guide, and documentation.

⚠ **Three backend models gained output fields** — `workingCapitalCycleModel.fasterCycle`,
`ebitdaDcfModel`'s `valuation.dipYear` / `dipGrowth` / `terminalShare` / `exitMultiple`, and
`marginBreakevenModel.DEFAULTS`. Nothing was removed or renamed, so existing callers are
unaffected.

⚠ **`components/BusinessPerformanceReport.vue` and `components/EbitdaDcfReport.vue` no longer
derive those figures themselves.** If either is being edited on the desktop, take the new
version: a test fails if a component goes back to computing its own copy, and the reason is
in §2 above.

⚠ **`data/report-model-summaries.json` is read by the AI.** Its Coach lines now carry
`{named}` gaps. Adding a gap without adding its figure to
`server/utils/reportModelFigures.js` fails the build — deliberately.

---

## 6. Where the work stopped

**Nothing is half-built and nothing is uncommitted.** 4.34 is closed with its closure written
on [`features/to-do-done-and-parked.md`](features/to-do-done-and-parked.md) before it came off
the live list, which is the order that page's own rule demands.

⚠ **NOT VERIFIED BY EYE, and this is the one real gap.** The rendered words are asserted by
component tests — which is the substance of this change — but **the headings are now
noticeably longer** and no test can judge how they sit in a small uppercase style. Mike was
asked to glance at `/model-guide` when he next has the app open. That gap is item **4.25**,
still open: the browser driver is installed, no visual check is written.

**Two things owed, both parked by Mike rather than forgotten:**

- The master team has not been told `v0.10.0` exists. Ledger says *Awaiting pull*.
- This branch is 7 ahead of `master` and reaches it only by pull request. None is open.
