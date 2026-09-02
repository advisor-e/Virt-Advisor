# Three-Way Forecast — where the app departs from the source workbook

> **What this document is.** The Three-Way Forecast is a port of
> `design/report-source-models/3 way Filter.xlsx`. The port reproduces that workbook
> **exactly** — 3,385 of its 3,409 calculated Year 1 cells, proven cell by cell — with
> **seven deliberate corrections**, each ruled by Mike on 2026-09-02.
>
> This is the record of those seven. Open it beside
> [`server/report/threeWayForecastModel.js`](../server/report/threeWayForecastModel.js)
> and [`tests/unit/threeWayForecastModel.test.js`](../tests/unit/threeWayForecastModel.test.js)
> — every correction has a test that pins the workbook's figure beside ours, so no
> departure can go quiet.
>
> **Written 2026-09-02.** Nothing here changes Mike's method. Every one of the seven is
> an arithmetic or fill error of the kind that accumulates when a spreadsheet is extended
> over years — in this case from three fixed-asset categories to six.

---

## Why there are seven, and why they cluster

The workbook was built with **three** fixed-asset categories and later extended to
**six**. The individual schedules were extended correctly; several formulas that *add
them up* were not. Four of the seven are that one root cause. The GST rows, notably,
*were* updated to all six — which is what makes the cash-flow ones so odd: the model
pays the GST on a purchase it never pays for.

The remaining three are independent: a `#REF!` left by a formula filled past the edge of
the sheet, a duplicated payment line, and a cost charged to profit that nothing ever
settles.

---

## The seven

### R1 — Total Non-Current Assets counted four of six categories

**Sheet row 106.** `SUM(C99:C102)`, shared across the whole row in all three years. Rows
99–104 are the six categories; the total stops at Office Equipment, leaving out
**Computer Hardware** and **Other**.

**Proof.** The workbook's own cached value is 1,190,000, which is exactly
80,000 + 1,000,000 + 50,000 + 60,000. The correct total is 1,340,000.

**Effect.** Net Assets understated; the balance sheet cannot tie.

**Ruling — corrected.** All six counted, **and a visible balance check added**, which
§2 and §11 of the forecast prompt specification require and which is what found R7.

---

### R2 — The P&L depreciation charge covered three of six schedules

**Sheet row 28.** `D306+D316+D326` — Vehicles, Leasehold Improvements, Plant/Equipment.
Office Equipment, Computer Hardware and Other are never charged. Year 2 repeats it at
its own offsets (`D305+D315+D325`), so this is not a single-year slip.

**Proof.** Year 1 charges **164,672**; the six schedules the workbook itself calculates
come to **220,326**.

**Effect. The largest of the seven: year-1 profit overstated by 55,654**, repeating in
years two and three. The balance sheet meanwhile carries all six correctly depreciated —
so the assets fall while the P&L never feels it.

**Ruling — corrected.** All six schedules charged.

---

### R3 — Cash-flow asset sales covered three of six

**Sheet row 130.** `D399+D304+D314+D324` — the GST on all six disposals (row 399), plus
the proceeds of only three.

**Effect.** Sell 5,000 of office equipment and the model banks **750** — the GST — and
never the 5,000.

**Ruling — corrected.**

---

### R4 — Cash-flow capital expenditure covered three of six

**Sheet row 142.** `D303+D403+D313+D323` — the same shape as R3, in the other direction.

**Effect.** Buy 20,000 of office equipment and the model pays **3,000** — the GST — and
never the 20,000. Cash is wrong by an amount small enough to look plausible. In the
shipped sample every capital purchase is zero, which is why it has never surfaced.

**Ruling — corrected.**

---

### R5 — The six-monthly GST return was `#REF!` in the first month of each year

**Sheet row 411** (row 410 in years 2 and 3).
`IF(OR(MONTH(D1)=3,MONTH(D1)=9),SUM(#REF!),"")`.

**Proof.** The intact columns read `SUM(A406:F406)` — a **rolling six-column window**. In
the first month, six columns back falls off the left edge of the sheet, so the reference
is unrecoverable and Excel writes `#REF!`.

**Effect.** A firm on six-monthly GST gets an error, not a figure, in month 1. It does
not bite on the sample, which is set to Two Monthly.

**Ruling — repaired, not dropped.** Unlike the EBITDA `#REF!` remnants dropped on
2026-07-17 — which needed a deleted sheet — the intent here is fully readable from the
surviving columns of the same row. The window clamps to the start of the year, which is
what months 2 and 3 already do (columns A–C hold labels, so they contribute nothing).
Nothing is invented.

---

### R6 — One overhead was settled twice, every month

**Sheet row 201.** The workbook splits overheads into three payment blocks. **"Other 5"
appears in two of them**: the pay-next-month GST-inclusive block (row 201) and the
pay-this-month GST-free block (row 217). Row 201's formula is also mis-filled — month 1
points at Other 5, **months 2–12 point at Other 4**, which is already on the line above.

**Effect.** Month 1 pays Other 5 twice; months 2–12 pay Other 4 twice. About **4,100 of
year-1 expense paid twice** on the sample, plus GST, scaling with whatever a firm puts in
its "Other" categories. **Cash and accounts payable only — profit is unaffected**, which
is why a read-through never catches it.

**Ruling — corrected: Other 5 is settled once, in the GST-free current-month block.**
That block is deliberate and complete (Bank Charges, Commissions, Wages, Shareholder
Salaries, the direct-cost Other 2), whereas row 201 is both a duplicate and mis-filled.

> ⚠ **This one is a judgement about Mike's own expense categories, not arithmetic.** If
> "Other 5" turns out to be a GST-bearing cost settled a month in arrears, it moves to
> the other block. The fix is the same size either way.

---

### R7 — A cost charged to profit that nothing ever paid

**Sheet row 11, "Other Direct Expenses (GST Exempt)".** Charged to the P&L as 2% of
revenue. It appears in **none of the three payment blocks and in no accrual.**

**Proof — the strongest in this document.** With R1–R6 applied the balance check should
have sat flat. It eroded every month, and in **twelve months out of twelve the erosion
equalled that month's charge to the penny**: 1,700 · 1,400 · 1,500 · 1,600 · 1,200 ·
1,300 · 1,400 · 1,400 · 1,600 · 1,900 · 1,400 · 1,400.

**Effect. 17,800 in year one** leaves the profit & loss and never leaves the bank, and it
scales with sales and accumulates year on year. **It overstates forecast closing cash** —
the single figure a client and their financier look at hardest, and the reason a
three-way model exists at all.

**Ruling — corrected: settled in the GST-free current-month block.** The line's own name
is "GST **Exempt**" and that block is "GST **Exclusive** … Paid in the Current Month"; the
other two percentage-of-revenue direct costs (Other 2, Commissions) are already there.

> **This is the one the balance check paid for.** It was found within minutes of R1's
> check being switched on, in a workbook that has been in use for some time. Nothing else
> in the model would have surfaced it: the P&L is right, and the cash flow is internally
> consistent with itself.

---

## What the corrections do to the numbers

Year 1, on the workbook's own sample figures:

| | As the workbook computes it | Corrected |
|---|---:|---:|
| Depreciation charged | 164,672 | **220,326** |
| Net surplus before tax | −189,013 | **−244,551** |
| Closing bank balance | −386,294 | **−400,760** |
| Total non-current assets (month 12) | 1,011,932 | **1,119,674** |
| Balance check movement over the year | eroded by 17,800 | **zero — flat all year** |

The corrected forecast is **14,466 worse at year end**. Every one of the seven was
pushing the same way: they flattered the position.

---

## Two things that are NOT corrections

### The opening balance sheet does not balance — and that is honest

After all seven corrections the balance check sits at **164,000 and does not move**.
That residual is entirely the **opening balance sheet** in the sample data, which was
never made to tie. The monthly mechanics articulate exactly.

The screen must show this rather than hide it: an advisor entering a real opening
position needs to see a non-zero check and fix their own figures.
`tests/unit/threeWayForecastModel.test.js` pins both halves — the flat 164,000 on the
sample, and a clean zero all year when a balanced opening position is supplied.

### R8 — the shareholder current accounts reset at every year boundary

**Ruled by Mike 2026-09-02, when years 2 and 3 were built.**

Every year of the workbook opens its four shareholder current accounts from
`'Data Input'!E68`…`E71` — the **year-one** column — in year 2 *and* year 3. So a year's
interest, advances and drawings are wiped at each boundary and the account starts again
from where it began.

**Proof that it is an omission rather than an intention: the loans were wired up.**
`'Data Input'!M347 = 'Yr 1. Projections'!O109` carries loan 1's closing balance into year
2, and the same for the other two. The current accounts never got the equivalent. The
balance sheet meanwhile *does* carry the correct closing figure (`C82`/`C92` read year
1's `O82`/`O92`), so the schedule and the balance sheet disagree with each other.

**Effect.** 2,916 a year on the sample — the interest accrued on the two overdrawn
accounts — and it compounds.

**Ruling — corrected.** Each account opens where it closed, exactly as the loans do.

---

## What years 2 and 3 proved about R1 and R2

Scouting the later sheets on 2026-09-02 turned up the strongest evidence in this
document, and it did not come from us:

**The workbook's own years 2 and 3 already total all six asset categories.**

| Total Non-Current Assets | Formula |
|---|---|
| Year 1 (row 106) | `SUM(D99:D102)` — four of six |
| Year 2 (row 105) | `SUM(D99:D104)` — **all six** |
| Year 3 (row 105) | `SUM(D99:D104)` — **all six** |

So **R1 is the author's own intent**, applied in the later sheets and missed in the
first. Year 1 is the outlier, not our correction.

It also explains something that looked alarming at first. The workbook's own year-2
balance check **jumps 91,218 in its first month** — because year 1 hands a four-of-six
total to a sheet that totals six. **Applying R1 removes the jump entirely.**

**R2 is different: depreciation charges three of six in all three years** (`D306+D316+D326`
in year 1, `D305+D315+D325` at the later sheets' offsets). That one is consistently wrong
throughout, so the correction applies across the board.

---

### The month stepping quirk is ported as written and is NOT yet ruled on

The workbook advances its month headers by adding **31 days**, not one calendar month
(`Data Input` C105 = C104+31). Those dates decide which months a GST return falls due.

- On a **first-of-month start** — the normal case, and the sample — the sequence is
  correct: April, May, June … March.
- On a start **late in a month** it can skip one. From 30 January it steps to 2 March,
  and February never appears, which misfires the two-monthly filing schedule.

Ported faithfully, and the model reports it: `startsSkipACalendarMonth` in the returned
payload is `true` when the stepping has skipped a month, so nothing hides.

**Over three years the drift is no longer subtle.** A forecast opening 1 April 2024 has
its final month beginning **22 March 2027** — three weeks adrift of the 1 March a
calendar-month step would give, and drifting further with every year added. On one year
it is a curiosity; on three it is visible on the screen.

**Raised for Mike 2026-09-02, not yet ruled on. Do not "fix" it without his ruling.**

---

## How the deviations are held in place

- **[`tests/unit/threeWayForecastModel.test.js`](../tests/unit/threeWayForecastModel.test.js)**
  — 26 tests. The golden set proves fidelity against 3,385 cells read straight from the
  workbook's cached values into
  [`tests/fixtures/threeWayForecastYear1.golden.json`](../tests/fixtures/threeWayForecastYear1.golden.json)
  (generated, never typed, so there is no transcription risk). Seven further tests pin
  each correction with the workbook's figure beside ours.
- **The two guards divide the work, and both are mutation-verified.** Removing a single
  `ROUND` fails the golden test on 321 cells; removing Excel's 15-digit rounding fails it
  on 150. Reverting R7 leaves the golden test green — correctly, because R7 *is* a
  departure — and is caught instead by the articulation test, which sees the balance
  check start drifting.
- **`sourceFidelity` is a second parameter, never part of the request body**, so no
  client can ask the engine for the defective figures. A test fails the build if any
  route starts forwarding options.

## Related

- [`design/BUSINESS-PERFORMANCE-REPORT-PLAN.md`](BUSINESS-PERFORMANCE-REPORT-PLAN.md) —
  the standing rule this document exists to satisfy: *never simplify or remove any
  element of a source model without asking first* (2026-07-09).
- [`design/ADDING-A-REPORT.md`](ADDING-A-REPORT.md) — the eight steps. Stage A (engine,
  golden test, route, registration) is complete; the screen is a later stage and needs a
  committed mockup approved by Mike before it is built.
- `design/prompt-sources/cashflow forecast prompt with privacy.docx` — ruled by Mike on
  2026-09-02 to be **the standard this screen must meet**: its privacy and
  de-identification protocol (§3A), source discipline (§3), materiality and the flagged
  issues register (§5/§7), draft-and-publish stages (§8) and the plain-English summary
  (§10). None of that is built yet; it shapes the stages after this one.
