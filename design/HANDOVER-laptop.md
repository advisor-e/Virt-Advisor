# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-12 (twenty-third session) · Laptop · branch `feat/advisor-progress`

Suite **10,065 green** (485 suites), lint 0 errors, tree clean, 5 ahead / 0 behind `master`.
**Item 4.88 built, walked in a browser and CLOSED** — Mike asked for a model from the
performance reports that had never been built and chose the **High Level Budget**. Model,
route, page, screen, locales, catalogue card live, all four report guards. Closure on
[`to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2. **Four live items now.**

🔴 **HIS SOURCE WORKBOOK IS WRONG, AND THE FIX IS RULED.** `High Level Budget.xlsx` adds its two
subtotal rows three different ways across three sheets; the Actuals sheet drops **Wages and
Interest Only Loan Payments — 159,900 a year** — from every total *including the bank balance*,
charting a **173,700** saving where the truth is **13,800**. All three sides now use the Budget
sheet's full ranges. **Proved by reverting it outside the repo and reproducing all six of the
workbook's cached figures exactly**, which is what shows the rest of the port is faithful.

🔴 **TWO FAULTS SURVIVED 10,062 PASSING TESTS AND WERE FOUND BY LOOKING** — entry boxes three
times the approved width, and a zero rendered as a signed change. **The second had to be found
twice**, in the headline and then in the table beneath it. `npm run go`, open the screen, and
count. Six drawing-vs-build differences are named on the drawing and in `report-models.md` §4.

**⛔ DO NOT WIRE THE ACCOUNTS READERS INTO 4.88's ACTUALS.** Mike raised it himself, was shown
why, and ruled **leave it for now**: it is a cash budget and a P&L is accrual, three of its lines
are balance-sheet movements absent from a P&L, and a P&L carries depreciation. It is recorded in
both homes; it is not a gap and not to be re-raised as one.

**New item 4.89** — the workbook's two GST oddities, ported exactly and **waiting on Mike**:
whether Interest Received belongs in the GST base, and whether the entered figures are
GST-inclusive or exclusive. Two questions, one at a time, and nothing is changed without his word.

**Also waiting on Mike, unchanged:** 4.58's OpenAI reply (letter sent 2026-09-12), 4.15's eighteen
template names, and whether 4.89 and the other three get ranked.

**DESKTOP:** none of your files were touched and 4.87 was left alone. Changed here:
`utils/reportModelCatalogue.js`, `server/routes/report.js`, `server/restify-server.js`,
`locales/en.json`, `data/report-model-summaries.json`, four report guards, and the usual records —
merge `master` in at startup once this lands.
