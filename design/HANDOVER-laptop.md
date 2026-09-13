# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-13 (twenty-fourth session) · Laptop · branch `feat/advisor-progress`

Suite **10,115 green** (486 suites), lint 0 errors, tree clean, 2 ahead / 0 behind `master`.
Two commits, both pushed: `dd7542d7`, `43ac2983`. **FIVE live items** — 4.15, 4.58, 4.86, 4.87,
and the new 4.90.

**4.90 Retirement Review — STARTED, AND IT IS ACTIVE ON THIS MACHINE.** Mike asked for it:
*"build the retirement planning model in perf reports section"*. The maths engine and its golden
test are done — [`server/report/retirementReviewModel.js`](../server/report/retirementReviewModel.js)
and its test, 47 cases, eight mutations run and all eight caught. **Nothing user-facing yet:**
route, catalogue row, entry steps and result screen still to build. It is the largest workbook in
the library — six properties, three mortgage types, twenty years, two hidden amortisation sheets.

🔴 **THE PORT WAS PROVED EXACT BEFORE ANY CORRECTION WAS APPLIED** — every cached value on all six
sheets, all twenty years of all twelve series. **That ordering IS the proof and cannot be redone
later:** once the output differs from the spreadsheet, no comparison can establish fidelity. What
still runs in its place: everything the corrections do not touch stays pinned to the workbook, and
the structural correction is pinned to the workbook's *own* numbers.

🔴 **THREE RULED DEVIATIONS, all Mike 2026-09-13**, on every result as `workbookCorrections`:
current tax bands from `data/tax-bands.json` (12.926% → 12.582%); the pension taxed in the
projection; the sixth property realigned to year one. The last two were **4.91, filed and closed
the same day** — its block sat four columns out, so it earned nothing for four years and, when
sold, **credited the client with nothing at all**. Closing cash **1,522,255 → 2,590,883**, years in
deficit 13 → 14. The two pull opposite ways and are reported separately, never netted.

**4.92 closed** — the intermittent `EPERM` that rejected a push and blamed unrelated code. Windows
reports EPERM, not ENOENT, for a file unlinked while a handle lingers; `existsSync` cannot see that
window and a delete-pending path refuses writes too. The two `activityStore` dev-fallback suites no
longer delete their temp file mid-run. **`activityStore.js` itself is correct and was not touched.**

**Waiting on Mike, unchanged:** 4.58's OpenAI reply (letter sent 2026-09-12), 4.15's eighteen
template names, and whether the four unranked items get placed.

**DESKTOP:** none of your files were touched and 4.87 was left alone. New here:
`server/report/retirementReviewModel.js` and its test. Changed: the two `activityStore`
dev-fallback tests and the usual records. ⚠ **4.90 will next touch
`utils/reportModelCatalogue.js` and `server/routes/report.js`** — shared files, so leave them to
this machine. Merge `master` in at startup once this lands.
