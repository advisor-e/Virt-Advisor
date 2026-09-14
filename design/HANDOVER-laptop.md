# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-14 (thirty-third session) · Laptop · branch `feat/advisor-progress`

Suite **10,701 green** (508 suites), lint 0, audit PASS. Tree clean, everything pushed,
**20 ahead of `master`, 0 behind**. Eight live items.

🔴 **START HERE: ITEM 4.102, AND THE PLAN IS ALREADY WRITTEN.**
[`design/WAGES-SHUTDOWN-PORT.md`](WAGES-SHUTDOWN-PORT.md) is a cold-start build spec — the
whole shutdown chain traced out of the workbook's stored XML, the two things to settle before
any engine code, and the build order. **Read it first; do not re-derive it.** Mike ruled the
fix himself: *"plan the fix properly then get it done."* **Its first task is a question to
answer, not code**: is the overnight allowance counted twice on the shutdown basis?

**The fault it fixes:** a team built on our own step 1 reports **zero revenue** on the
Shutdown basis (the workbook gets 973,328). The engine reads two ready-made per-person
arrays that step 1 never collects. It is reachable today — the Shutdown button is live and
the model is in the Model Library. **Mike was offered the button being disabled meanwhile and
said no**, so leave it live.

**4.100 — THE WAGES/SALARY REVIEW IS OTHERWISE BUILT END TO END**: five steps on
`pages/wages-review.vue`, the report, and the card in the library as a **Decision tool**.
Seasonal is correct and golden-tested — **1,362,740 / 288,935 / July −132 are the regression
guard and must not move.** Record in [`features/report-models.md`](features/report-models.md).

🔴 **NEVER BUILD FROM THE DRAWING'S FIELD LIST ALONE — the session's real lesson.** It was
wrong five times out of twelve on step 1. Read the stored XML: does the cell carry an `<f>`,
and does any formula read it. Both sheets use **1.25–1.88-wide spacer columns**, so a reading
that skips empty cells shifts every field one left and answers about the wrong column. That
produced one wrong sentence in the record, corrected in `87921726`.

**Two older questions are now ANSWERED** and folded into 4.102: the "button for overtime in
summer" is the per-month switch on `Cash Report` row 11, and the shutdown allowance is not a
separate total but a per-person figure inside each monthly wage. **Still Mike's:** a name for
the seasonal overtime flag (`Seasonal Inputs` J4), and a real payroll export.

**DESKTOP:** 4.87 untouched. Changed under you today: `locales/en.json`,
`utils/reportModelCatalogue.js`, `data/report-model-summaries.json`,
`scripts/check-branch-state.js` (+ new `scripts/ref-ceiling.js`), and the guards
`reportModelCatalogue`, `reportModelSummaries`, `reportBadgeClass`,
`reportHeadlineConsistency`, `modelGuideRoute`. Merge `master` before touching any of them.
**Item numbers are safe now** — `npm run check:branch` prints the next free one across both
machines (it is 4.102). ⚠ Your live 4.93 still clashes with our closed 4.93.
