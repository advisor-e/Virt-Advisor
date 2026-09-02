# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-02 · Laptop · branch `feat/advisor-progress`

Suite **7,315 green** (378 suites), lint 0 errors. Started 33 ahead / 0 behind, ended
**42 ahead / 0 behind**, everything pushed (`3b301ed`). Nothing uncommitted.

### The Three-Way Forecast — engine, intake and result screen all shipped

Mike asked for it and ruled every decision. Ported from `3 way Filter.xlsx`:
**10,155 of its 10,227 calculated cells reproduced exactly**, across all three years —
the largest golden set in this repo by a wide margin (EBITDA's was 96). Live at
`/three-way-forecast`; the Model Library card reads **12 ready**.

### 🔴 Nine defects found in Mike's source workbook, all ruled by him

Full evidence in [`../THREE-WAY-FORECAST-DEVIATIONS.md`](THREE-WAY-FORECAST-DEVIATIONS.md).
The largest overstated year-one profit by **55,654**; another charged a cost to profit
that nothing ever paid (17,800 a year). **His own years 2 and 3 proved R1 was his
intent** — they total all six asset categories where year 1 totals four.

### ⚠ TWICE TODAY, RUNNING THE APP CAUGHT WHAT 7,000 PASSING TESTS DID NOT

An intake reading a **249,000 overdraft as cash** (no "Total Assets" row, so liabilities
nested inside assets), and **every forecast year showing year one's dates** (a field
computed and never exposed). Both suites were green. **Probe live output; green is not
evidence.**

### 🖥 DESKTOP — two things

1. **`xeroReportParser.js` changed materially.** The assets/liabilities/equity split is
   now by **exclusion, not nesting**, and `headerMeta` returns `bodyFrom`. Quick Position
   and EBITDA contracts are untouched and regression-pinned.
2. **"Xero" is gone from all user-facing wording** (Mike's ruling) — use the shared
   `report.supportedSoftware` key on any new intake screen.

### Next

The intake's **three screens** (steps 1–3 of the approved drawing) — the backend is built
and probed. Two **behaviour** questions stay open in `ARTEFACTS.md`: flagging negative
stock, and whether an unbalanced opening blocks or only warns. **4.60** needs four real
QuickBooks/MYOB exports; do not promote a package on more reconstructions.
