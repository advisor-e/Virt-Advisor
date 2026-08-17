# Multiple Property Assessment — screen design (Phase 1)

> **Status: AWAITING MIKE'S APPROVAL.** Nothing is built. This document and
> [`mockups/multiple-property-assessment.html`](mockups/multiple-property-assessment.html)
> are the artefact the build will be measured against, saved before approval as
> `CLAUDE.md` requires.
>
> **Source workbook:** [`report-source-models/Multiple Property Assessment.xlsx`](report-source-models/Multiple%20Property%20Assessment.xlsx)
> — sheets `INTRO`, `INPUTS`, `MODEL`, `OUTPUTS`, `Consolidated Report`, `Import Range`,
> `Imported Report`.
>
> **Chosen by Mike, 2026-08-17**, from the nine unbuilt models in the catalogue.

---

## 1. What the workbook actually is

It is **not** a side-by-side property comparison. It is a **five-property rental portfolio
model with a ten-year projection behind each property**, plus a consolidation.

| Layer | What it holds |
|---|---|
| The household | The family home, its value and mortgage, and the combined cash deposit |
| Loan apportionment | Spreads available lending across the residence + up to 5 investments, in order, until the LVR ceiling is reached |
| Per property (×5) | ~25 typed inputs, a ten-year P&L, a ten-year tax position, two loans amortised over ten years, and a ten-year investment summary |
| Consolidated | All five stacked: total revenue, total expenses, net operating profit, total property value, total debt, net equity, investor funds, weekly cash position |

⚠ **An earlier estimate in chat called this "one of the smallest and cleanest" of the nine.
That was wrong** — it was taken from the file size and sheet count, before the cells were
read. It is recorded here rather than quietly dropped, because the size is what drove the
decision to phase the build.

---

## 2. Scope of Phase 1 — and what it deliberately leaves out

**Phase 1 is ONE property, ten years.** That is the whole of the mathematical difficulty:
the two loans, the amortisation, the diminishing-value depreciation, the ring-fenced tax
losses and the interest-deductibility phasing all live inside a single property's block.
Properties 2–5 are the same block repeated.

**In Phase 1**
- One investment property, all ~25 inputs
- The ten-year P&L
- The ten-year tax position, including losses carried forward
- Both loans amortised over ten years
- The ten-year investment summary and the four headline figures

**NOT in Phase 1 — Phase 2**
- Properties 2 to 5
- The family home and the loan apportionment table (`INPUTS` rows 3–17)
- The consolidated report
- The `Import Range` / `Imported Report` sheets

🔴 **Phase 1 is a usable screen on its own.** An advisor can assess a single rental
property properly, which is more than the app can do today.

---

## 3. Classification — and what follows from it

| | |
|---|---|
| **`modelClass`** | `CLASS_DECISION` |
| **Badge** | 🔴 **No "Illustrative" badge.** Someone may buy a property on this output. |
| **Privacy** | The scrubbing boundary **applies** — real purchase prices, real rents, real loan balances |
| **File intake** | **None.** Every figure is typed by the advisor, as with The Loan Estimator |
| **Route auth** | Anonymous calc route — numbers in, numbers out (`ADDING-A-REPORT.md` step 4) |
| **Category** | Valuation, beside The Loan Estimator and Lease vs Buy |

---

## 4. The inputs — left column

Every label below is **the workbook's own wording**, taken from the `INPUTS` sheet. Nothing
here was invented. Values shown are the workbook's own sample figures for the first
property, which become `DEFAULT_INPUTS`.

⚠ **Exact cell references are pinned when the golden test is written** (step 2 of the
recipe). The rows and cached values below are what the design was read from.

### Property

| Row | Label (workbook's own) | Sample |
|---|---|---|
| 23 | Address of FIRST Investment Property | 56 Big Deal Avenue, Goldentown |
| 27 | Tax Rate Applicable to Rental Income | 28% |
| 31 | Purchase Price | 649,000 |
| 34 | – Land | 260,000 |
| 35 | – Building | 359,168 |
| 36 | – Chattels | 29,832 |
| 38 | Rental Assessment (per week) | 610 |
| 56 | Assumed Vacancy (weeks per annum) | 2 |

**The split must reconcile.** Land + Building + Chattels = Purchase Price. The workbook
checks this itself (row 32 = price − split total, expected 0). The screen shows the
difference and refuses to compute while it is non-zero.

### Annual costs

| Row | Label (workbook's own) | Sample |
|---|---|---|
| 40 | Accounting Fees | 1,500 |
| 41 | Rental Management Fee (plus GST) | 7.5% |
| 42 | Insurance (per annum) | 3,600 |
| 43 | Rates (per annum) | 1,850 |
| 44 | Body Corp Fee (per annum) | 1,387.50 |
| 45 | Purchase Costs (Legal / Loan / Valuation / BC Estab) | 2,000 |
| 46 | Setup Costs | 1,500 |
| 47 | Repairs & Maintenance (per annum) | 500 |
| 48 | Other (per annum) | 25 |

**Purchase Costs and Setup Costs appear in year 1 only** — the workbook carries them in the
first column and leaves the rest blank. The port must do the same, not inflate them.

### Assumptions

| Row | Label (workbook's own) | Sample |
|---|---|---|
| 50 | Depreciation Rate on Chattels (DV) | 28% |
| 52 | Assumed Rental Growth (per annum) | 3.5% |
| 54 | Assumed Capital Growth (per annum) | 3.0% |
| 58 | Assumed Expense Inflation | 5.0% |
| 60 | Assumed Interest Rate Inflation | 0.1% |

### Funding structure

| Row | Label (workbook's own) | Sample |
|---|---|---|
| 65 | Funding Required | 649,000 |
| 68 | – Interest Only Loan | 350,000 |
| 69 | – Principal & Interest Loan | 299,000 *(derived: Funding Required − Interest Only)* |
| 71 | Repayment Term of Interest Only Loan (yrs) | 8 |
| 72 | Repayment Term of P&I Loan (yrs) | 7 |
| 74 | Assumed Interest Rate on Interest Only Loan | 4.0% |
| 76 | Assumed Interest Rate on P&I Loan | 4.0% |
| 78 | Interest is a Deductible Expense | Yes / No / **Phasing** |
| 80–84 | Phasing Interest Deductibility Table | yr1 100%, yr2 75%, yr3 50%, yr4 25%, yr5 0% |

**Year-by-year interest rates.** The workbook lets each of the ten years carry its own rate
for both loans, so a fixed-to-floating change can be modelled. Its own note (row 79) says:
*"Use the year by year interest input to cater for fixed rate to floating rate variances."*
Row 60's note adds: *"Remember to zero this figure if you choose to manually adjust the
interest rates."*

**Phase 1 ships the single rate plus the inflation figure, with the ten-year override
behind a disclosure** — the same information, not shown as twenty boxes by default.

---

## 5. The results — right column

### 5a. The headline band — four figures

Chosen from the workbook's own `OUTPUTS` investment summary, not invented:

| Figure | Workbook source | Sample |
|---|---|---|
| **Weekly cash profit / (loss)** — year 1 | `MODEL` row 33 | **−$929** |
| **Total debt position** — year 1 | `OUTPUTS` row 13 | **$611,144** |
| **Net equity** — year 10 | `OUTPUTS` row 15 | **$846,798** |
| **Projected return on investor funds** — year 10 | `OUTPUTS` row 23 | **36.4%** |

🔴 **The weekly figure is the one an advisor says out loud.** *"This property costs you
$929 a week for the first seven years, and turns positive in year eight."* It leads.

⚠ **Negative figures render in the `crit` tone.** A property that costs the client
$929 a week must not look neutral.

### 5b. Investment summary — ten years

`OUTPUTS` rows 11–28. One row per line, one column per year:

Assumed Property Value · Total Debt Position · Net Equity · Cash Deposit · Annual Cash Top
Up · Cumulative Investor Funds · Projected Return on Investor Funds · Weekly Cash
Profit/(Loss).

### 5c. Profit & loss — ten years

`MODEL` rows 10–33: Rental · the nine expense lines · Interest – Interest Only · Interest –
P&I · Total Expenses · Net Operating Profit (Loss) · Loan Repayments · Tax Payable · Net
Cash Position · Weekly Cash Profit/(Loss).

### 5d. Tax position — ten years

`MODEL` rows 40–54: Net Operating Profit (Loss) · Depreciation Expense · Add Back
Deductible Interest · Taxable Operating Income (Loss) · Prior Year Tax Loss · Net Taxable
Income (Loss) · Tax Payable · Loss to Carry Forward (Ring-Fenced).

### 5e. Loan calculations — ten years

`MODEL` rows 60–72. Interest Only: Loan Balance · Annual Interest · Assumed Annual Interest
Rate. Principal & Interest: Opening Loan Balance · Loan Repayment · Annual Interest ·
Closing Loan Balance · Assumed Annual Interest Rate.

---

## 6. Rules found in the formulas that a plain port would miss

Each of these was read out of the cells, and each would produce a wrong figure if assumed:

1. **The management fee carries GST inside the calculation.** `= Rental × (fee% × 1.15)`.
   The 15% is hardcoded in the formula, not an input.
2. **Rental income is net of vacancy.** `= Rent PW × ((52 − vacancy weeks) / 52) × 52`.
3. **Depreciation is diminishing value on chattels only**, and the base shrinks by the
   depreciation already claimed — not a flat percentage each year.
4. **Year 1's taxable income adds Setup Costs back** (`= (NOP − depreciation − deductible
   interest) + setup costs`), because they are non-deductible. **Years 2–10 do not.** The
   formula genuinely differs in the first column.
5. **Tax losses ring-fence and carry forward.** Tax is payable only when cumulative net
   taxable income turns positive — in the sample that is year 10, not year 5.
6. **Interest deductibility phases 100 / 75 / 50 / 25 / 0** over five years when set to
   "Phasing", and that multiplier applies to the add-back.
7. **The P&I loan uses `PMT`**, and switches to paying the residual when the opening
   balance drops below 250.
8. **Interest rate inflation compounds by year index** — year 3's rate is
   `rate + (rate × inflation × 2)`, year 4 `× 3`, and so on.

---

## 7. The look — not a question

Per the owner ruling of 2026-07-23 in [`ADDING-A-REPORT.md`](ADDING-A-REPORT.md), the look
is **read off the existing live screens**, never proposed fresh. The mockup copies the
ruled standard exactly: 1120px centred, `#eef3f8` canvas, 360px + `1fr` columns, 16px gaps
everywhere, `#002b64` headline band, white cards with a 3px `#00b1e0` top edge, 14px
radius, 16px padding, navy uppercase 12px card titles, Open Sans 300, all light.

It follows the `[A]`–`[D2d]` skeleton in
[`REPORT-LAYOUT-REFERENCE.html`](REPORT-LAYOUT-REFERENCE.html): full-width header, then the
full-width band, then the two-column body.

---

## 8. 🔴 What actually needs Mike's word

Everything above is either the workbook's own wording or the ruled house style. **Three
things are genuinely open, and only these are being asked:**

### Q1 — The screen's name

The catalogue calls it **"Multiple Property Assessment"**. Phase 1 assesses **one**
property. A screen with that title that takes a single property tells the advisor
something untrue on first sight.

Options, for Mike alone to pick:
- **(a)** Ship Phase 1 under the catalogue name, with the property list visibly showing
  "Property 1 of 5 — the rest arrive in the next release".
- **(b)** Give Phase 1 its own honest name — e.g. *Rental Property Assessment* — and let
  *Multiple Property Assessment* arrive with Phase 2.
- **(c)** Something in his own words.

### Q2 — The four headline labels

Proposed, from the workbook's own row names:
**Weekly cash position · Total debt · Net equity (year 10) · Return on investor funds
(year 10)**.

The workbook's own wording is longer — *"Weekly Cash Profit/(Loss)"*, *"Total Debt
Position"*, *"Projected Return on Investor Funds"*. The band has room for short labels
only. **Which wording does he want on the band?**

### Q3 — The New Zealand tax assumptions

The model has NZ rules baked in: **15% GST** inside the management fee, **chattels-only
diminishing-value depreciation**, **ring-fenced rental losses**, and the **five-year
interest-deductibility phasing**.

- **Fixed** — simplest, correct for NZ firms, wrong everywhere else.
- **Firm-editable** — surfaced on a hub page per the 2026-08-16 hub-page rule, so a firm
  sets its own rate and rules.

⚠ The hub-page rule in `CLAUDE.md` bears on this: content that shapes an output should be
visible and changeable. But that rule is about **AI content**, and these are model
constants. **This is a judgement for Mike, and it is stated rather than assumed.**

**Phase 1 proceeds with them fixed and clearly labelled** unless he says otherwise —
making them editable is additive and does not change the maths.

---

## 9. Build order once approved

Per [`ADDING-A-REPORT.md`](ADDING-A-REPORT.md), backend outward, each step its own approved
change:

1. `server/report/multiplePropertyModel.js` — pure, CommonJS, exports `DEFAULT_INPUTS`
2. `tests/unit/multiplePropertyModel.test.js` — **golden test, written alongside**, every
   expected number the workbook's own cached value with its cell reference
3. Restify route + registration (anonymous — no file intake)
4. Catalogue row flipped to `STATUS_READY` with `route`
5. `pages/…vue` wrapping the screen in `<report-shell>`
6. `components/…vue` composing `ReportHeader` + `HeroStrip`/`HeroFigure` + `StaleBanner`,
   mixing in `currencyMixin` + `reportRecompute`
7. Added to `SCREENS` in `reportHeadlineConsistency.component.test.js` — **the step nothing
   reminds you about**
8. All strings through `$t()` in `locales/en.json`

---

## 10. Build vs artefact — filled in when the build lands

*(Empty until Phase 1 ships. Per `CLAUDE.md`, the finished build is put beside this
artefact and **every difference named here**, deliberate or not.)*
