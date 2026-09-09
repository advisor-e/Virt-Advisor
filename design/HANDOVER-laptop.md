# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-09 (eleventh session) · Laptop · branch `feat/advisor-progress`

Suite **8,926 green** (438 suites), lint 0 errors, coverage and audit gates clean. **Ten
commits, all pushed.** 27 ahead, 0 behind `origin/master`; nothing merged in.

**4.81 TAX RATES IS BUILT, SLICES 1 TO 5** — the country table, the four-tier cascade, five
routes, the **Tax Rates** tab at every manager tier, the engine, and the advisor's side. A
manager approves a country's company tax rate, GST rate, filing cycle and accounting basis,
each naming its document and page; an advisor names the client's country and is *offered* the
change. New pages: [`features/tax-rates.md`](features/tax-rates.md) and its history.

🔴 **A SEPARATE TAB FROM DEPRECIATION RATES — Mike approved that before the drawing was drawn.**
He renamed 4.78 hours earlier so a tab's name predicts its contents. They share one country
table, one cascade and one approval gate in the code, and **nothing on screen**. Do not merge
them.

🔴 **DESKTOP — THE ONE THING THAT COULD TRIP YOU UP.** `ThreeWayForecastIntake.vue` now has a
**country field** (4.78's approved addendum, built here on Mike's explicit yes). **Only the TAX
half is wired to it.** Wiring the six depreciation rates to that same field is still 4.78's
work and is *not* done.

⚠ **`threeWayForecastModel.js` CHANGED.** Its three hardcoded GST filing branches became one
formula, so a quarterly BAS can be expressed at all. **All 3,385 golden workbook cells pass
unchanged and no existing test was edited** — but it is a shared file, so merge with care.

**Not built, both drawn and both named in the Brief §7:** loading a tax PDF for the AI to read,
and the country saved with the forecast (needs 4.62's last screen). 🔴 **Mike ruled the PDF
reading STAYS INSIDE 4.81** rather than becoming its own item — and whether it is worth building
at all is genuinely open: four figures here against IR265's ~156 classes. History §5 says why.

⚠ **NOT OPENED IN A BROWSER.** Every path is proven against stubs. Economic Analysis threw up
nine live faults green tests all missed — treat the first real run as the real test.

**4.78 and 4.81 both stay flagged active on the laptop.** `FirmTaxRates.vue` uses `$t()` where
four of its six siblings hardcode English; it deliberately did not join that open deviation.

**DESKTOP:** 🔴 **your note is still dated 2026-09-04 while your branch is 51 ahead with a commit
from today.** Nothing of yours was touched here; nothing went near quiz screens.
