# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-14 (thirty-third session) · Laptop · branch `feat/advisor-progress`

Suite **10,691 green** (508 suites), lint 0, audit PASS. Tree clean, everything committed and
pushed, **18 ahead of `master`, 0 behind**. Seven live items. **4.100 IS STILL ACTIVE ON THIS
MACHINE** — four build items remain and they touch its own files.

**4.100 — THE WAGES/SALARY REVIEW IS BUILT END TO END**, and the card is in the Model Library as a
**Decision tool** (nothing arrives from an accounts export). Five step components on
`pages/wages-review.vue`, 97 component tests, plus the shared headline guard. Full record in
[`features/report-models.md`](features/report-models.md) § *Wages/Salary Review*.

🔴 **NEVER BUILD A STEP FROM THE DRAWING'S FIELD LIST ALONE — this is the session's real lesson.**
Its inventory was a hand reading of which cells are typed, and it was wrong **five times out of
twelve** on step 1. Check the stored XML instead: does the cell carry an `<f>`, and does any formula
actually read it. And `Seasonal Inputs` uses **1.25-wide spacer columns (I, K, Q, S)** — a reading
that skips empty cells shifts every field one to the left and then answers confidently about the
wrong column. That produced one wrong sentence in the record, corrected in `87921726`.

🔴 **THREE THINGS ARE MIKE'S, and they are on the item:** a name for the global overtime flag
(`Seasonal Inputs` J4 — read by 12 formulas, blank in the sample, and **blank is a third state**), the
**shutdown** overnight allowance (its column interleaves label text with formulas and cannot be read
safely — a test pins that we do not invent one), and **a real payroll export**.

**Still to build:** the rates converter tab, the gated staff register, the payroll reader, the Tax
Rates fifth figure. **Do not re-derive the engine** — it is golden-tested and the report renders its
output unchanged.

**ITEM NUMBERS ARE NOW SAFE.** 4.97/4.98 were renumbered to **4.100/4.101** and
`npm run check:branch` prints the next free number across every machine's branch, so the collision
cannot recur. ⚠ **Your live 4.93 still clashes with our closed 4.93** (Mid-Level Budget); nothing of
yours was touched.

**DESKTOP:** 4.87 untouched — none of its files opened. Changed under you: `locales/en.json`,
`utils/reportModelCatalogue.js`, `data/report-model-summaries.json`, `scripts/check-branch-state.js`
(+ new `scripts/ref-ceiling.js`), and the guards `reportModelCatalogue`, `reportModelSummaries`,
`reportBadgeClass`, `reportHeadlineConsistency` and `modelGuideRoute` — the last of which had its
source slice **bounded** (it read to end-of-file and swept in unrelated handlers). Merge `master`
before you touch any of them.
