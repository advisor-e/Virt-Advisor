# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-12 (twenty-third session) · Laptop · branch `feat/advisor-progress`

Suite **10,058 green** (485 suites), lint 0 errors, tree clean, 7 ahead / 0 behind `master`.
**Items 4.88 AND 4.89 built, walked in a browser and CLOSED** — Mike asked for a model from the
performance reports that had never been built and chose the **High Level Budget**. Model,
route, page, screen, locales, catalogue card live, all four report guards. Closures on
[`to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2. **FOUR live items** — 4.15,
4.58, 4.86 and 4.87. *(This line and commit `f04ffcc`'s message both said three; the commit is
pushed and cannot be corrected, so trust this file and the JSON, not that message.)*

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

🔴 **4.89 FILED AND CLOSED THE SAME EVENING — and it moved the headline figures.** The workbook's
two GST oddities, both ruled by Mike one at a time. **Interest Received is out of the GST base**
(an exempt supply bears no GST; moves nothing in the sample, everything for a client with interest
income). **The entered figures are GST-INCLUSIVE**, so rows 66/69/71 were counting GST twice: the
budgeted closing balance falls **192,426 → 151,300** and the actual **143,565 → 109,300**, the
workbook overstating year-end cash by the whole net GST, **41,126, about 27%**. The GST is now a
reading at the foot of the result table. The test **proves** it — the gap between the workbook's
closing balance and ours is checked to equal `gstHeld` exactly. Closure on
[`to-do-done-and-parked.md`](features/to-do-done-and-parked.md) §2.

**Waiting on Mike, unchanged:** 4.58's OpenAI reply (letter sent 2026-09-12), 4.15's eighteen
template names, and whether the three unranked items get placed.

**DESKTOP:** none of your files were touched and 4.87 was left alone. Changed here:
`utils/reportModelCatalogue.js`, `server/routes/report.js`, `server/restify-server.js`,
`locales/en.json`, `data/report-model-summaries.json`, four report guards, and the usual records —
merge `master` in at startup once this lands.
