# Multiple Property Assessment — screen design

> **Status, 2026-08-21: BOTH PHASES ARE BUILT. THE SCREEN IS THE PORTFOLIO.**
>
> - **Phase 1 (one property)** — built 2026-08-17, live. Maths, golden test, Restify
>   route, catalogue row, page, screen. The group-tier tax cascade followed on
>   2026-08-18 and closed item 4.20.
> - **Phase 2 (the portfolio)** — item 4.19, built 2026-08-20/21. The maths and its golden
>   test, the route, **the drawing**, the screen and the catalogue line: all five steps
>   P2-1 to P2-5 are done. The household, the loan apportionment table, five properties and
>   the consolidation, plus the deposit hold-back, the lending ceiling and the servicing
>   figures Mike asked for on 2026-08-20.
>
> ✅ **The drawing is
> [`mockups/multiple-property-portfolio.html`](mockups/multiple-property-portfolio.html)**
> (step P2-3), its design and its six questions are **§11**, and Mike ruled all six on
> 2026-08-21: *"looks great - move forward"*. Its figures are the built model's own output,
> not the workbook's and not invented. **§10 names twelve differences between the drawing
> and the build, and two defects that rendering the screen found.**
>
> ⚠ **Layout is NOT verified.** No browser driver is installed in this repository, and
> jsdom has no layout engine — the screen's rendered TEXT was read before shipping, which
> is not the same as seeing a laid-out page. This is the gap the Property Tax Rules tab's
> phasing boxes fell through.
>
> *(This block read* **"PHASE 2's MATHS IS BUILT; ITS SCREEN IS NOT … The route, the
> screen and the catalogue line are NOT built"** *until 2026-08-21. The route sentence was
> already wrong when it was written — `838cf46` landed in the same session. It is rewritten
> rather than appended to, and recorded here, because a status line that is wrong is worse
> than none; §10 records that the last two contradictions of this kind were both caught in
> this very document.)*
>
> *(This block read "PHASE 1 IS BUILT AND LIVE … All eight design questions are ruled"
> until 2026-08-20. It is rewritten rather than appended to because a status line that
> is wrong is worse than none — and §10 records that the last contradiction of this kind
> was caught here, in this very document, on 2026-08-18.)*
>
> This document and
> [`mockups/multiple-property-assessment.html`](mockups/multiple-property-assessment.html)
> are the artefact the build is measured against, saved before approval as `CLAUDE.md`
> requires. ✅ **The mockup was opened beside the finished screen and all seven differences
> are named in §10.**
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
| Loan apportionment | Spends the deposit across the residence + up to 5 investments, in order, until the money runs out; each property borrows the rest |
| Per property (×5) | ~25 typed inputs, a ten-year P&L, a ten-year tax position, two loans amortised over ten years, and a ten-year investment summary |
| Consolidated | All five stacked: total revenue, total expenses, net operating profit, total property value, total debt, net equity, investor funds, weekly cash position |

⚠ **An earlier estimate in chat called this "one of the smallest and cleanest" of the nine.
That was wrong** — it was taken from the file size and sheet count, before the cells were
read. It is recorded here rather than quietly dropped, because the size is what drove the
decision to phase the build.

🔴 **THE ROW ABOVE USED TO CLAIM AN "LVR CEILING". THERE IS NO CEILING IN THE WORKBOOK.**
It read *"spreads available lending across the residence + up to 5 investments, in order,
until the LVR ceiling is reached"*, and that sentence was written from the shape of the
table before the formulas were read. Checked on 2026-08-20 across all seven sheets: `R5`
computes an LVR (`=R11/R9`) and **no formula anywhere references that cell**, there is no
threshold to compare it against, and no conditional formatting marks it. It is a number on
display. What the table actually runs out of is the **deposit**, not a borrowing limit.
*This is exactly the failure mode `design-docs-are-claims-to-check` describes: a plausible
sentence in a design document, believed by later sessions because it is written down.* The
ceiling now exists — as an editable setting nobody had to invent (§8 Q10) — but it never
came from here.

⚠ **`Import Range` and `Imported Report` are NOT part of the model and are not ported.**
`Import Range` holds a single `IMPORTRANGE()` formula for pulling a SECOND copy of the
workbook's consolidated report across from another Google Sheet — the manual answer to a
client holding more than five properties. `Imported Report` is a copy of `Consolidated
Report` carrying its own note: *"This report is for 'holding' purposes - you still need to
link the cells from your Import Range (page) reports in order to get total consolidated
figures."* The mechanism has no meaning outside a spreadsheet; in an app the answer is to
allow more properties.

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

**NOT in Phase 1 — Phase 2** *(the maths of all four is BUILT, 2026-08-20; see §9)*
- ✅ Properties 2 to 5
- ✅ The family home and the loan apportionment table (`INPUTS` rows 3–17)
- ✅ The consolidated report
- ❌ The `Import Range` / `Imported Report` sheets — **deliberately not ported**, see §1

**And three things Phase 2 added that the workbook does not have**, all ruled by Mike on
2026-08-20 and all in §8 Q8–Q10:
- ✅ The deposit **hold-back** — a family chooses how much of their cash goes into each
  property, rather than the table imposing it
- ✅ The **lending ceiling**, as an editable setting on the existing tax-rules cascade
- ✅ The **servicing demand** — what the portfolio costs the family each year, shown and
  deliberately not judged

⚠ **What Phase 2 still lacks is a SCREEN, and an artefact to build one against.** §4 and
§5 below describe one property's inputs and results only. Nothing anywhere in this
document or the mockup draws the household, the apportionment table, the hold-back, the
LVR figures or the consolidated report.

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
| 50 | Depreciation Rate on Chattels (DV) — **moved to Tax rules, 2026-08-17** | 28% |
| 52 | Assumed Rental Growth (per annum) | 3.5% |
| 54 | Assumed Capital Growth (per annum) | 3.0% |
| 58 | Assumed Expense Inflation | 5.0% |
| 60 | Assumed Interest Rate Inflation | 0.1% |

### Tax rules — **new, and none of it is the workbook's wording**

🔴 **This card does not exist in the workbook.** These four rules were assumptions inside
formulas, not fields, so every label here is new and every one is Mike's — **§8 Q5**. They
are listed here for completeness; the ruling that created them is §8 Q3 and §6 rule 10.

| Setting | Default (New Zealand) | Was |
|---|---|---|
| Non-Deductible Costs Added Back in Year 1 | Setup Costs only | `MODEL` C46 |
| GST on Rental Management Fee | 15.0% | hardcoded inside `MODEL` row 14 |
| What May Be Depreciated | Chattels only | `MODEL` row 42 |
| Depreciation Method | Diminishing Value | `MODEL` row 42 |
| Depreciation Rate on Chattels | 28.0% | `INPUTS` E50 — **moves here from Assumptions** |
| Rental Losses | Ring-Fenced | `MODEL` rows 48–54 |
| Interest is a Deductible Expense | Phasing | `INPUTS` E78 — already an input, joins its neighbours |

### Funding structure

| Row | Label (workbook's own) | Sample |
|---|---|---|
| 15 | Total Savings for (Combined) Investment Property's Deposit | 315,000 |
| 65 | Funding Required | 649,000 |
| 68 | – Interest Only Loan | 350,000 |
| 69 | – Principal & Interest Loan | 299,000 *(derived: Funding Required − Interest Only)* |
| 71 | Repayment Term of Interest Only Loan (yrs) | 8 |
| 72 | Repayment Term of P&I Loan (yrs) | 7 |
| 74 | Assumed Interest Rate on Interest Only Loan | 4.0% |
| 76 | Assumed Interest Rate on P&I Loan | 4.0% |
| 78 | Interest is a Deductible Expense | Yes / No / **Phasing** |
| 80–84 | Phasing Interest Deductibility Table | yr1 100%, yr2 75%, yr3 50%, yr4 25%, yr5 0% |

⚠ **The cash deposit moved out of Phase 2 and into Phase 1 — 2026-08-17.** §2 puts `INPUTS`
rows 3–17 in Phase 2, but row 15 is the only source of the deposit and **Projected Return on
Investor Funds — one of the four headline figures — cannot be calculated without it**
(`OUTPUTS` C18 → C21 → C23). It is carried as a typed input under the workbook's own label.
⚠ In the full five-property model this figure is the *combined* deposit and property 1
receives all of it — `OUTPUTS` C18 is `INPUTS!E15` while property 2 takes the apportionment
balance `INPUTS!L7`. With one property the distinction does not arise; it returns with
Phase 2.

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
Up · **Capital Introduced** · Cumulative Investor Funds · Projected Return on Investor
Funds · Weekly Cash Profit/(Loss).

🔴 **Capital Introduced is a new line, not one of the workbook's — added 2026-08-17 by
Mike's ruling in rule 9 of §6.** It carries the money the client puts in to clear the
interest-only loan, and it is what stops that payoff being counted as free money. It shows
only under the *repay* setting; under the *convert* setting it is absent, because no capital
is introduced. **Its label is open — Q4c in §8.**

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

### 9. 🔴 The interest-only loan vanishes at the end of its term — a fault, corrected

**Found 2026-08-17 by reading the cells, before any code was written. This is the one rule
below that does NOT describe what the workbook does — it describes what we build instead.**

`MODEL` row 60 is `=if(INPUTS!$E$71 >= <year>, INPUTS!$E$68, 0)`. With the interest-only
term set to 8 years, **the 350,000 balance is set to zero in year 9 and nothing repays it** —
no repayment in the cash flow (row 28 covers the P&I loan only), no sale, no refinance. The
debt simply ceases to exist. Its own cached values:

| | Yr 8 | Yr 9 |
|---|---|---|
| Total Debt Position (`OUTPUTS` 13) | 350,000 | **0** |
| Net Equity (`OUTPUTS` 15) | 448,188 | **822,134** |

🔴 **Two of the four headline figures in §5a ride on that step** — Net equity year 10
(846,798) and Projected return on investor funds year 10 (36.4%). Left as it is, the screen
would tell an advisor a property returns 36% when, with the loan still owed, equity is about
**496,798** and the return is **negative**. `modelClass` is `CLASS_DECISION`; somebody may
buy a property on this figure. ⚠ **§5a's sample values for those two figures are therefore
the pre-fix ones and will be restated when the golden test pins the corrected numbers.**

#### Ruled by Mike, 2026-08-17 — the advisor chooses, because the client decides

Asked what should happen instead, he ruled first that the loan **converts to principal and
interest**, and then asked for the second ending as well: *"can we adde the option to convert
the debt to principle and interest or, pay off the debt with a capital introduction?"*
**Both are built, as a setting the advisor picks.** Which one is true depends on the client,
so the model must not decide it.

| Setting | What the model does from year 9 |
|---|---|
| **Convert to principal & interest** | The 350,000 amortises over the loan's remaining term, using the same `PMT` and sub-250 residual rule as the existing P&I block and the interest-only loan's own year-by-year rate (which is already defined for years 9–10). Interest continues on a reducing balance, repayments appear in the cash flow, equity climbs steadily instead of jumping. **Needs one input that does not exist in the workbook — Q4b in §8.** |
| **Repay from capital introduced** | The balance goes to zero in year 9 and interest stops — the workbook's own behaviour — **but the money is counted.** The amount is added to Cumulative Investor Funds through the new Capital Introduced line (§5b), so the return figure reflects what the client actually put in. |

⚠ **The second setting is what the workbook does today, done honestly.** The fault was never
the zeroing — it was zeroing without recording where the money came from.

*The options turned down, recorded so they are not re-derived: leaving the balance
outstanding and charging interest to year 10 (rejected — it models a loan nobody has agreed
to roll over), and porting the workbook unchanged (rejected under the standing rule that a
proven source defect is corrected, not reproduced).*

⚠ **This affects properties 2–5 identically** — the same block, repeated — so Phase 2
inherits the corrected behaviour rather than the fault. **The source workbook itself is not
corrected by this document;** that is a separate change and it has not been made.

### 10. 🔴 Four New Zealand rules stop being assumptions and become inputs

**Ruled by Mike, 2026-08-17 — see Q3 in §8 for the ruling and the exchange that produced
it.** Rules 1, 3 and 5 above, plus the year-1 cost add-back, are jurisdiction-specific. They
are reproduced faithfully *as defaults*, and each is now a setting:

| Rule | Default (New Zealand) | What changes elsewhere |
|---|---|---|
| GST inside the management fee | **15%** | The fee costs a different amount. **Silently**, today |
| What may be depreciated, and how | **Chattels only, diminishing value** | Where the building may be depreciated the answer improves markedly |
| Rental losses | **Ring-fenced, carried forward** | Where losses offset other income, tax relief arrives years earlier |
| Year-1 non-deductible costs added back | **Setup Costs only** | See the open question below — it may be wrong for NZ too |

⚠ **The defaults reproduce the workbook exactly, so the golden test is unaffected.** A
firm that changes nothing gets the same figures it gets today.

#### The one that is still open — and it is a question about New Zealand, not the world

`MODEL` C46 adds back **Setup Costs only** (`+C19`), while the workbook's own note at
`INPUTS` H46 reads *"Setup Costs / Purchase Costs - Non Deductible"*. **The note names both;
the formula uses one.** If the note is right, year 1's taxable loss is 2,000 smaller and
every carried-forward year after it moves — on the *repay* ending the year-10 tax bill goes
from 1,521.61 to 2,081.61.

**It is reproduced exactly and NOT corrected**, because it is a tax judgement rather than an
arithmetic slip — unlike the three corrections above, which are provable from the cells
alone. **Mike's ruling turned it from a question into a setting**, so the model no longer
depends on the answer; but somebody should still say which is right, because it decides what
the New Zealand *default* should be.

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

Everything above is either the workbook's own wording or the ruled house style.

✅ **NOTHING IS OPEN.** Q1–Q7a were ruled by Mike on 2026-08-17 in one session; Q8–Q10
came out of Phase 2 and were ruled on 2026-08-20.

| | Question | Ruled |
|---|---|---|
| **Q1** | The screen's name | Keep the catalogue name; the header carries "Property 1 of 5" |
| **Q2** | The four headline band labels | The short ones, as drawn |
| **Q3** | The New Zealand tax assumptions | All four become variable inputs |
| **Q4** | The end of the interest-only period | Three labels, all as proposed |
| **Q5** | The Tax rules card | `Tax rules`, and all six labels as drawn |
| **Q6** | Who sets the tax rules | Group sets it; firm **and** advisor may override |
| **Q7** | The Model Library card's line | "Whether a rental property is worth buying…" |
| **Q7a** | Does the card carry the scope line too | Yes |
| **Q8** | Two proven faults in the apportionment table | Correct both, even though live figures move |
| **Q9** | Should the home mortgage reduce the deposit | Neither — **the family chooses the deposit**, and the sums must still balance |
| **Q10** | What maximum LVR the model should use | None shipped — **"it needs to be an editable input"** |

⚠ **Nothing in the remaining build waits on Mike.** Phase 1 is complete. Phase 2's maths
is built and green; its route, artefact, screen and catalogue line (§9 P2-2 to P2-5) are
unblocked.

⚠ **Three things sit with Mike but block nothing:** the ceiling figure itself (nothing is
judged until it is set), whether the tab should be renamed now it is not only tax, and
whether the sample's own 350,000 / 299,000 loan split should be reset now the deposit is
genuinely applied — see Q10 and §10.

🔴 **Read each ruling before building to it, not this table.** The table names the answer;
the section beneath gives the reason and the options turned down — and the reason is what
stops a later session re-deriving a settled question.

### Q1 — The screen's name — ✅ **RULED BY MIKE, 2026-08-17**

**Option (a): keep the catalogue name, and show "Property 1 of 5" on the screen.**

The name does not change between the phases, and nobody is misled at either stage: an
advisor opening Phase 1 sees both what the model is *for* and how much of it is *in
place*. The header carries **"Property 1 of 5 · the remaining four arrive in the next
release"**, in the muted ink and the standard card border — no new colour, no new
component.

⚠ **What settled it was his own question, not the argument for it.** He asked whether the
additional properties would be added in future. Once the answer was yes and Phase 2 was on
the live list as **4.19**, the interim name stopped being a problem worth solving — the
finished thing genuinely is a multiple property assessment. **A naming question was really
a scheduling question**, and it could not be answered until the schedule was.

*The options turned down, recorded so they are not re-derived: giving Phase 1 its own name
(e.g. Rental Property Assessment) and letting the catalogue name arrive with Phase 2, which
would have meant renaming a live screen and breaking its route.*

### Q2 — The four headline labels — ✅ **RULED BY MIKE, 2026-08-17**

**The short labels, as drawn on the mockup:**

> **Weekly cash position** · **Total debt** · **Net equity** · **Return on investor funds**

The year sits underneath each in the muted sub-line, not inside the label — which is how
the band already reads on every other model.

*The option turned down: the workbook's own longer wording (`Weekly Cash Profit/(Loss)`,
`Total Debt Position`, `Projected Return on Investor Funds`). It matches the spreadsheet
exactly, and the longest of them wraps on the band.* ⚠ **The workbook's wording is still
used verbatim in the ten-year tables below the band** — the short labels are the band's
alone, so nothing is renamed where there is room for the real name.

### Q2 (as asked)

Proposed, from the workbook's own row names:
**Weekly cash position · Total debt · Net equity (year 10) · Return on investor funds
(year 10)**.

The workbook's own wording is longer — *"Weekly Cash Profit/(Loss)"*, *"Total Debt
Position"*, *"Projected Return on Investor Funds"*. The band has room for short labels
only. **Which wording does he want on the band?**

### Q3 — The New Zealand tax assumptions — ✅ **RULED BY MIKE, 2026-08-17**

**All four become variable inputs.** Asked whether the year-1 cost add-back could be made
configurable — *"can this be made a variable input to allow for different tax treatements
around the world?"* — and then shown that the same reasoning applies to three other rules
baked into the maths, he ruled: **"yes - all 4."**

| Baked in | Where it lived | What it becomes |
|---|---|---|
| Which year-1 costs are non-deductible | `MODEL` C46 | An input — see rule 10 in §6 |
| **15% GST inside the management fee** | Hardcoded *inside* `MODEL` row 14 | A rate input, with the effective charge shown |
| Depreciation on chattels only, diminishing value | `MODEL` row 42 | What may be depreciated, and by which method |
| Losses ring-fence and carry forward | `MODEL` rows 48–54 | Ring-fenced, or offset against other income |

🔴 **The GST one is the reason this could not stay as it was.** An advisor reading *"7.5%"*
on screen has no way to know the model charges **8.625%** — the 1.15 is inside the formula
and nothing on the sheet says so. It is the only one of the four that is wrong *silently*.

⚠ **This decides what the MODEL can vary, not who sets it.** Where these live — typed by the
advisor on the screen, or set once by the firm on a hub page — is **Q6**, and it is open.

*The original question, kept because the ruling is best read against it:*

### Q3 (as asked) — The New Zealand tax assumptions

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

⚠ **That last sentence was wrong on both counts, and it is left standing as a record.**
Making them editable is *not* additive — the GST multiplier sits inside a formula and had
to be lifted out — and it *does* change the maths for any firm outside New Zealand, which
is the whole reason Mike ruled as he did.

### Q4 — The wording for the end of the interest-only period — ✅ **RULED BY MIKE, 2026-08-17**

**All three as proposed — (a), (a), (a):**

| | Ruled |
|---|---|
| **Q4a** | **At the End of the Interest Only Period** → *Convert to Principal & Interest* · *Repay from Capital Introduced* |
| **Q4b** | **Total Term of Interest Only Loan (yrs)**, default **30** — the advisor gives the loan's full term and the model derives the rest |
| **Q4c** | **Capital Introduced** |

*The options below are kept as they were put to him, so the choice can be read against what
it was chosen over.*

**The behaviour is settled — rule 9 of §6. Only the words are open**, and there are three
labels because Mike ruled that the advisor picks between two endings. **Nothing here is
chosen; each is written out for him to rule on, and he may give his own wording instead.**

#### Q4a — the choice field itself, and its two settings

| | The field | Setting one | Setting two |
|---|---|---|---|
| **(a)** | At the End of the Interest Only Period | Convert to Principal & Interest | Repay from Capital Introduced |
| **(b)** | Interest Only Loan — What Happens at Term End | Converts to Principal & Interest | Paid Off |

*(a) names the moment and then the action, which is how the workbook's own funding rows
read. (b) is shorter on the settings but puts a dash into a label, which no other field on
this screen does.*

#### Q4b — the extra figure the *convert* setting needs

The workbook has no field for how long the loan runs once the interest-only period ends, and
it cannot be inferred: `INPUTS` row 71 is the interest-only period itself (8 years), not the
loan's life.

| | Label | Default | What the advisor types |
|---|---|---|---|
| **(a)** | Total Term of Interest Only Loan (yrs) | 30 | The loan's full term as it appears on the bank's offer. The model derives the rest — 30 − 8 = 22 years of repayments. |
| **(b)** | Repayment Term After Interest Only Period (yrs) | 22 | The after-period directly. Closer to row 71's existing wording, but it is a number no loan document states. |

*Our recommendation is (a): it mirrors how the sheet already derives the P&I loan from
Funding Required minus the interest-only portion — the advisor gives what they have, the
model does the arithmetic.*

#### Q4c — the new investment-summary line the *repay* setting needs

It sits beside Cash Deposit and Annual Cash Top Up in §5b, and it carries the money the
client puts in to clear the loan.

| | Label |
|---|---|
| **(a)** | Capital Introduced |
| **(b)** | Capital Introduced to Repay Loan |

*(a) matches the length of the lines either side of it; (b) says what it is for, at the cost
of being the longest label in the block.*

⚠ **One thing here is NOT being asked, because it is a technical default rather than a
choice:** after conversion the loan keeps charging the interest-only loan's own year-by-year
rate, which the workbook already defines for years 9 and 10 (`INPUTS` P74, Q74). Using
anything else would mean inventing a rate.

### Q5 — The labels on the new Tax rules card — ✅ **RULED BY MIKE, 2026-08-17**

**The card is `Tax rules`, and all six labels stand exactly as proposed.** He ruled from
the drawn card rather than from a list — the mockup was published and updated first, and
the wording judged in place.

Q3's ruling creates a fifth input card, and **none of its labels exists in the workbook** —
these rules were never fields, they were assumptions inside formulas. So every one is new
wording and every one is Mike's. They are drawn in
[`mockups/multiple-property-assessment.html`](mockups/multiple-property-assessment.html) as
proposed below.

| | Proposed label | Its settings | Notes |
|---|---|---|---|
| **Q5a** | The card's own title: **Tax rules** | — | *Tax treatment* and *Tax settings* were the alternatives |
| **Q5b** | **Non-Deductible Costs Added Back in Year 1** | *Setup Costs only* · *Setup and Purchase Costs* · *None* | The question that started this. NZ is the first |
| **Q5c** | **GST on Rental Management Fee** | a rate, **15.0%** | The fee's own label drops *"(plus GST)"* and shows the effective charge instead — **8.625%** on the sample |
| **Q5d** | **What May Be Depreciated** | *Chattels only* · *Chattels and Building* | A building rate appears only when the building may be depreciated |
| **Q5e** | **Depreciation Method** | *Diminishing Value* · *Straight Line* | |
| **Q5f** | **Rental Losses** | *Ring-Fenced* · *Offset Against Other Income* | Ring-fenced is what the workbook does; it delays all tax relief to year 10 |

⚠ **Two consequences of the card, both visible in the mockup rather than described:**
the depreciation rate **moves** out of Assumptions and into this card, beside the setting
that decides whether anything may be depreciated at all; and the Tax position table's row
*"Loss to Carry Forward (Ring-Fenced)"* now has the Rental Losses setting speaking in its
name, so it must read differently under the other setting.

### Q6 — Who sets the tax rules — ✅ **RULED BY MIKE, 2026-08-17**

**Option (a): set at the group (the country), and BOTH the firm and the advisor may
override.** The app's existing inheritance pattern exactly — P3 of
[`features/tier-cascade.md`](features/tier-cascade.md) — so an untouched setting keeps
receiving the level above's improvements, an edited one is protected, and a change from
above is offered rather than forced.

**What that means for the build, stated so it is not re-derived:**

- The cascade is `group → firm → advisor`, on the **existing firm-overlay mechanism** —
  the Advisory Distinctions and coaching-reference pattern, which brings version history
  and restore with it.
- **Build tier-agnostic**, on the resolved-config shape, per the Brief. Do not write a
  route that takes a bare `firmId` (P6).
- **The advisor's override is per client**, and it is the level with the sharpest edge:
  the risk Mike accepted is that an advisor can get one client's tax wrong on one
  property. **The screen must therefore state the rules in force** — the model already
  returns `taxRules` for exactly this.
- ⚠ **Without the firm-to-country map the group tier falls back to the platform scope** —
  see the evidential limit below. That is today's behaviour and today's New Zealand
  defaults: it fails toward what already works, never toward a guess.

*The options turned down: firm-only override (tax stops being a per-client question,
which for most firms it is not — rejected because a firm advising across a border could
not vary it for one client), and mentor-seeds-then-group (one more tier, and the mentor
has no country of its own to speak for).*

### Q6 (as asked)

**Deliberately separated from Q3.** Q3 decided the model *can* vary them. This
decides where they are set.

> ⚠ **This question was first written as "advisor, firm, or both" and that framing was
> wrong.** It named two tiers out of six and missed the mechanism the app already has.
> Corrected 2026-08-17 on Mike's instruction, after reading
> [`features/tier-cascade.md`](features/tier-cascade.md) — which is what that Brief is for.
> The original is recorded here rather than deleted, because the mistake is instructive:
> **a design question phrased in terms of two tiers invents a two-tier answer.**

**What the Brief settles before Mike is asked anything:**

- **P2 — a group is normally a COUNTRY.** Tax rules are per-country. A firm is a *branch*
  inside one, so a firm is the wrong place for a country's tax rules to *originate*, even
  though it may well be the place they are corrected.
- **P3 — a level holds only its changes, never a copy.** An untouched setting keeps
  receiving the level above's improvements; one a level has edited is protected, and a
  later change from above is **offered** (Adopt / Keep mine), never silently applied. This
  is built and in use — the Advisory Distinctions and coaching-reference pattern.
- **P5 — every tab names the tiers it belongs to**, and never gates on a negative.

**So the real question is how far down the override runs:**

| | Set at | May override | Costs |
|---|---|---|---|
| **(a)** | Group (the country) | Firm **and** advisor | The house pattern exactly. An advisor can get a client's tax wrong on one property |
| **(b)** | Group (the country) | Firm only | Tax stops being a per-client question, which for most firms it is not. A firm advising across a border cannot vary it per client |
| **(c)** | Mentor (the platform seeds New Zealand), then group | Firm and advisor | Mentor-first, as P10 has it for AI content. One more tier to build, and the mentor has no country of its own to speak for |

⚠ **One evidential limit applies to every option above.** The two middle-tier hubs are built
and approved, and they hold no real firm data until Advisor-e supplies the firm-to-country
map — Mike has PARKED that ([`features/to-do.md`](features/to-do.md) 3.3), and it is question 5
of [`MASTER-TEAM-INTEGRATION-EMAIL.md`](MASTER-TEAM-INTEGRATION-EMAIL.md). So a group-tier
setting is evidenced by tests against a seeded membership map, which is a weaker claim than a
live screen and must be stated as one. It is not a reason to prefer one option over another.

**It does not block the build:** the model takes these as inputs whatever tier eventually
supplies them, and the fallback is what it already does — the New Zealand defaults.

⚠ **The hub-page rule in `CLAUDE.md` does not settle this by itself**: it governs content
that shapes what the **AI** is shown, and these are model constants that never reach a
prompt. It is raised rather than assumed, as that rule requires.

⚠ **One thing that does NOT vary by this choice:** whichever way it goes, the screen must
**state** the rules the figures were built on. The model already returns them
(`taxRules`, including the effective management fee) precisely so a reader is never left
to assume New Zealand. That is not a display nicety — it is the fix for the fault that
made this a setting in the first place.

### Q7 — What the Model Library card should say — ✅ **RULED BY MIKE, 2026-08-17**

> **Whether a rental property is worth buying — ten years of cash, tax and equity.**

Option (a): it names the question the advisor is being asked, which is how the other
Valuation cards read. It goes into
[`../utils/reportModelCatalogue.js`](../../utils/reportModelCatalogue.js) **in the same
change that flips the row to `STATUS_READY`**, which waits on the page — see §9 step 4.

⚠ **One thing under this was NOT asked and is still open:** whether the card should also
carry the *"Property 1 of 5"* scope line. See the note at the foot of this question.

*The options turned down, recorded so they are not re-derived: "Ten years of cash flow,
tax and equity on a rental property" (describes the output rather than the question) and
"What a rental property really costs each week, and what it is worth in ten years" (leads
with the weekly figure, but is the longest of the three).*

### Q7 (as asked)

🔴 **The catalogue's current summary is wrong and must not ship as it is:**

> *"Compare several property investments side by side."*

**It is not a side-by-side comparison** (§1), and Phase 1 is one property over ten years.
The row stays `STATUS_SOON` until this is answered and the page exists — a row flipped to
ready with no page fails
[`../tests/unit/reportShellFrame.test.js`](../../tests/unit/reportShellFrame.test.js).

The card carries a name and one line. The name is ruled (Q1). The line is open:

| | Proposed |
|---|---|
| **(a)** | Whether a rental property is worth buying — ten years of cash, tax and equity. |
| **(b)** | Ten years of cash flow, tax and equity on a rental property. |
| **(c)** | What a rental property really costs each week, and what it is worth in ten years. |

*(a) names the question an advisor is being asked, which is how the other Valuation cards
read — "Which way to fund an asset, compared on real cash terms." (b) describes the
output. (c) leads with the weekly figure, which is the number an advisor says out loud
(§5a), at the cost of being the longest of the three.*

⚠ **It says "a rental property", singular, on purpose.** The screen's own header already
carries *"Property 1 of 5 · the remaining four arrive in the next release"* (Q1), so the
scope is stated where somebody is looking at it. **Whether the CARD should carry that too
is a real question** — a card that promises five properties and opens on one is the
problem Q1 was ruled to avoid, and the card is the thing an advisor sees *first*.

### Q7a — Does the card carry the scope line too — ✅ **RULED BY MIKE, 2026-08-17**

**Yes. The card says it as well as the screen's header.** His reason is the one above:
the card is what an advisor sees first, and the name promises five properties.

The catalogue row therefore carries the scope alongside the summary, in the same change
that flips it to `STATUS_READY`. ⚠ **The exact placement on the card is not a new wording
question** — the card's shape is the ruled house standard and is read off the existing
Model Library cards, per the owner ruling of 2026-07-23. **It must be removed when
Phase 2 lands** (item 4.19), and that is the one line of this design that is written to
be deleted later.

### Q8 — Two proven faults in the apportionment table — ✅ **RULED BY MIKE, 2026-08-20**

**"yes fix both"** — and he was told plainly, before answering, that correcting the first
one moves figures on a Phase 1 screen he has already seen.

Both were found while reading `INPUTS` rows 3–17 for Phase 2, and both are proven rather
than suspected:

| | The fault | The proof |
|---|---|---|
| **1** | Row 15 apportions the purchase **PRICE** for the first investment (`L15 = L9*L13`) where the residence's own cell apportions **REQUIRED FUNDING** (`K15 = K11*K13`). Property 1 borrowed the full 649,000 and the 90,000 available to it was ignored. | The workbook's own check cell **R17** ("Balance of Loans to Apportion"). Read row 11 × row 13 it lands on exactly the non-deductible share of the home loan every time — 90,000 = 225,000 × 40%, and 120,000 = 300,000 × 40% when the mortgage is raised. Read as written it gives 0 and then 105,000, and the 0 that makes the sheet look reconciled is a coincidence of the sample figures. |
| **2** | The deposit is counted twice. `OUTPUTS` C18 gives property 1 the **whole** pool (315,000) and C100 gives property 2 `INPUTS!L7` (90,000) — part of the same money. | `Consolidated Report` C29 caches **405,000** of investor cash for a household holding 315,000, and it flows through C32 into the Projected Return on Investor Funds headline at C34. |

⚠ **Fault 2's columns are off by one as well** — property 2 reads Invest 1's balance,
property 3 reads Invest 2's — which is a second sign that row 7 was never finished.

**This is the standing rule applied, not a new one:** a proven source-workbook defect is
corrected, not reproduced and flagged. It is the same call Mike made on all four Loan
Estimator defects.

### Q9 — Should the home mortgage reduce the deposit — ✅ **RULED BY MIKE, 2026-08-20**

**Neither option he was offered.** He was asked to choose between the workbook's
behaviour — `L7 = R3 − K11`, the home mortgage eating 225,000 of a 315,000 deposit — and
letting the full savings reach the rentals. His answer:

> *"either way, the math has to add up. If there is an option for a family to 'hold-back'
> some of their cash deposit then that's fine but the remaining math still has to work - I
> think the sheet was trying to provide the option as to how much got used on this
> property but still met equity lending and servicing requirements - check if the math can
> enable these"*

🔴 **He was right that the sheet was reaching for it.** `M15:P15` — the apportioned loans
for properties 2 to 5 — are **not formulas at all but hand-typed constants**. Somebody was
overriding that row by hand. This ruling is that override, made visible and made to
reconcile.

**So `depositApplied` is a per-property input.** Omitted, the property takes what is left
of the pool in order, as the cascade did. Supplied, the family holds the rest back. A zero
is a choice and is honoured as one. And the home mortgage no longer reduces the pool —
with the deposit chosen there is nothing left for that subtraction to express, and `INPUTS`
B15 calls the figure *"Total Savings for (Combined) Investment Property's Deposit"*.

**THE THREE IDENTITIES — his condition, "the math has to add up".** Each is asserted in
the golden test under seven allocations, including abuse:

```text
requiredFunding + depositApplied === purchasePrice        (every property)
Σ depositApplied + depositHeldBack === totalSavings       (the portfolio)
interestOnly + principalAndInterest === requiredFunding   (every property)
```

⚠ **The third identity caught a fault in the workbook's own sample.** `INPUTS` E68 types a
350,000 interest-only loan against a property that, once its deposit is genuinely applied,
needs to borrow 334,000 — so E69 (`=E65−E68`) goes to **minus 16,000**. The slice is capped
at the funding required and the reduction is named in `warnings`, because it signals that
the loan split needs revisiting. **Whether the sample's own 350,000 / 299,000 split should
be reset is open for Mike.**

✅ **The workbook is still the reference.** Hand the table the deposits the sheet itself
hands out and it reproduces the sheet cell for cell — row 11, R9, R11 and the 73.98% LVR
at R5. Its allocation is simply one of the available choices, and the golden test's anchor
block passes exactly that.

### Q10 — What maximum LVR the model should use — ✅ **RULED BY MIKE, 2026-08-20**

Offered 80%, 70%, 65% or a figure of his own, he answered: **"it needs to be an editable
input"**.

**What was checked first, across all seven sheets:** there is no lending test anywhere in
the workbook. `R5` computes an LVR and no formula references it, no threshold exists, no
conditional formatting marks it. There is likewise **no servicing test and no way to build
one** — the workbook collects no household income and no living costs on any sheet.

**So the ceiling joins the existing tax-rules cascade** (Q6's mechanism): mentor → global
group → group → firm, each level correcting, version history and restore for free, and an
advisor still typing over it on the report for one client. No new mechanism, and **no new
Hub tab** — Mike having already said the hub was getting overwhelming for a firm manager.

🔴 **It ships BLANK, not at 80%.** A figure shipped as a default would be a lending policy
nobody chose, arriving with the authority of a calculated result. Unset means both LVRs
are computed and shown and neither is judged. **Two LVRs**, because they answer different
questions: `lvr` is R5's, everything in; `investmentLvr` is the rentals alone, which is
what an investor's lender tests. On the sample, 69.4% and 90.9%.

**Servicing is shown and deliberately not judged.** `consolidated.servicing` reports the
annual demand, the weekly equivalent, the worst year and the ten-year total. A test fails
the build if anyone ever adds an affordability verdict.

⚠ **THE LABEL IS OURS, AND SO IS ITS PLACEMENT.** *"Maximum Loan to Value Ratio (%)"* and
its help text are not Mike's, unlike every other label on that tab (Q5). He was offered a
committed drawing of the tab with the field on it before it was built and declined it:
*"no, just add it as a field - I'm sure you can do it"*. That is his call to make and it
is recorded here and in the component's own header rather than left to read like a ruling.
**One line from him changes either.**

⚠ **It is a LENDING rule sitting on a tab named Tax Rules.** The tab's opening sentence now
says "tax and lending"; its name is untouched, because renaming it is his call.

---

## 9. Build order once approved

Per [`ADDING-A-REPORT.md`](ADDING-A-REPORT.md), backend outward, each step its own approved
change:

1. ✅ **BUILT 2026-08-17** — `server/report/multiplePropertyModel.js`, pure, CommonJS,
   exports `DEFAULT_INPUTS`
2. ✅ **BUILT 2026-08-17** — `tests/unit/multiplePropertyModel.test.js`, the golden test
   written alongside. **55 tests.** Years 1–8 are the workbook's own cached values with
   their cell references; years 9–10 under `convert` are hand-worked with the arithmetic
   beside each, because those are the years the workbook gets wrong. Every correction is
   mutation-verified outside the repository.
3. ✅ **BUILT 2026-08-17** — `POST /api/report/multiple-property`, registered, anonymous
   (no file intake). **7 route tests**, including one that fails the build if the client's
   property address ever reaches a log line.
4. ✅ **BUILT 2026-08-17** — the catalogue row carries Q7's summary and Q7a's scope line
   and is `STATUS_READY` on `/multiple-property`. **Flipped in the SAME change as the
   page**, because
   [`../tests/unit/reportShellFrame.test.js`](../../tests/unit/reportShellFrame.test.js)
   derives its list from the catalogue's ready routes. `scope` is a new optional catalogue
   field; the Model Library renders it under the summary. ⚠ **It is written to be deleted
   when Phase 2 lands** (item 4.19).
5. ✅ **BUILT 2026-08-17** — `pages/multiple-property.vue`, wrapping the screen in
   `<report-shell>`
6. ✅ **BUILT 2026-08-17** — `components/MultiplePropertyAssessment.vue`, composing
   `ReportHeader` + `HeroStrip`/`HeroFigure` + `StaleBanner` + `SampleNotice`, mixing in
   `currencyMixin` + `reportRecompute`. The four ten-year tables are built from row
   descriptors in `computed`, so the formatting rules have one definition rather than
   sixty lines of template.
7. ✅ **BUILT 2026-08-17** — added to `SCREENS` in
   `reportHeadlineConsistency.component.test.js` **and** to `RENDERED_BY` in
   `reportBadgeClass.component.test.js`, whose unmapped-route check is a failure, not a
   skip. Plus `tests/unit/multiplePropertyScreen.component.test.js` — 8 tests on what only
   the screen can get wrong.
8. ✅ **BUILT 2026-08-17** — every string through `$t()` in `locales/en.json`. No hardcoded
   English; this screen does not repeat the older screens' logged P1.

9. ✅ **BUILT 2026-08-18** (`1feefa2`) — the tax rules cascading from the group tier (§8 Q6),
   on the existing firm-overlay mechanism, so version history and restore came for free.
   `server/utils/propertyTaxRules.js` resolves them up the tier chain, four manager routes
   save and restore them, `components/firm/FirmPropertyTaxRules.vue` is the Hub tab, and the
   report seeds its Tax rules card from the result and stays editable. **34 tests.**

✅ **PHASE 1 IS COMPLETE.** Item 4.20 closed 2026-08-18.

### Phase 2 — the portfolio (item 4.19, started 2026-08-20)

**P2-1. ✅ BUILT 2026-08-20 — the maths and its golden test**, in three approved changes:

| | Commit | What |
|---|---|---|
| a | `c7fc42b` | The household, `apportionLoans()`, five properties and the consolidation, with corrections 4 and 5 (§8 Q8). 40 tests. |
| b | `a0a779f` | The deposit hold-back, the two LVRs, the servicing block, and the three identities (§8 Q9). Grew the file to 80 tests. |
| c | `e36f8da` | The lending ceiling as an editable setting on the tax-rules cascade, and the first component test that tab has ever had (§8 Q10). |

- `computeMultiplePropertyPortfolio()` calls Phase 1's per-property function **unchanged**,
  supplying only its funding and its deposit from the table — so Phase 1's 55 golden tests
  never moved.
- **The anchors that prove the port**: the workbook's own `Consolidated Report` row 11
  (Total Revenue) and row 22 (Total Assumed Property Values) match its cached values
  **exactly across all ten years**. Rows 24 and 26 are deliberately NOT pinned — row 24
  reaches minus 68,772 in year 10 under the interest-only fault corrected in Phase 1, so
  pinning it would pin the fault.

**P2-2. ✅ BUILT 2026-08-20 (`838cf46`) — the Restify route.** `POST
/api/report/multiple-property` now takes either shape on one URL: a body carrying
`household` or `properties` computes the portfolio, and **every other body computes exactly
as it did before Phase 2 existed** — the Phase 1 screen is live in UAT, so the test this
change is really about sends the old shape and asserts nothing moved. The lending ceiling is
**not** resolved here: the route stays anonymous, and the ceiling reaches the caller from the
authenticated `GET /api/report/property-tax-rules` alongside the tax rules it shares a
settings block with. 16 route tests, up from 7.

⚠ **This step was recorded as "NOT BUILT" until 2026-08-21, having already been built the
session before.** The line is corrected rather than quietly replaced, because a build step
that says it is outstanding when it is done is the same defect as one that says it is done
when it is outstanding — and §10 exists because this document has now produced both.

**P2-3. ✅ BUILT 2026-08-21 — THE ARTEFACT, and it came BEFORE the screen.**
[`mockups/multiple-property-portfolio.html`](mockups/multiple-property-portfolio.html), with
its design written up in **§11** and its six open questions as **Q11–Q16**. 🔴 **This is the
step §10 says was skipped for the Property Tax Rules tab.** It was written here as its own
numbered step so that it could not be absorbed into "the screen" a second time, and it was
not.

**P2-4. ✅ BUILT 2026-08-21 — the screen**, once §11's Q11–Q16 were ruled (Mike,
2026-08-21: *"looks great - move forward"*). `components/MultiplePropertyAssessment.vue`
becomes the portfolio: the household, the property list, the portfolio-level tax rules and
the open property's own figures on the left; the findings, the deposit table, the lending
position, the properties compared, the consolidated report, the servicing demand, the
commentary and the open property's four ten-year tables on the right. Every string through
`$t()`. **26 component tests**, up from 8 — and §10 names twelve differences from the
drawing plus **two defects that rendering found and no test would have**.

**P2-5. ✅ BUILT 2026-08-21 — the catalogue.** The scope line *"Property 1 of 5 · the
remaining four arrive in the next release"* is deleted from the catalogue row **and** the
screen's header (Q1, Q7a), together with its locale key. It was the one line of this design
written to be deleted, and it is gone.

⚠ **What was NOT changed, and it is Mike's call:** the catalogue summary still reads
*"Whether **a rental property** is worth buying — ten years of cash, tax and equity"* —
singular. That is his own wording, ruled at Q7 when the screen was one property. It now
understates a five-property model. See §10.

*(Superseded 2026-08-18. This block previously read* **"Still NOT done, and it is the other
half of item 4.20 … That is the firm-overlay work, and it has not been started."** *It is
recorded rather than quietly overwritten, because an approved artefact that contradicts the
code is exactly what §10 exists to catch — and on 2026-08-18 this sentence was the thing
caught.)*

---

## 10. Build vs artefact

*(Per `CLAUDE.md`, the finished build is put beside this artefact and **every difference
named here**, deliberate or not.)*

### The SCREEN, built 2026-08-17 — seven differences, all named

The mockup was opened beside the running screen before this was written. Nothing below was
found afterwards.

| | The mockup | The build | Why |
|---|---|---|---|
| **1** | A light header with a navy title | The shared `ReportHeader` — the solid `#002b64` banner every model wears | The owner ruling of 2026-07-23 says the look is **read off the live screens**. The mockup's header was a simplification of a component it could not import; the component wins |
| **2** | *"Prepared for: Bill & Sue Mcgue · 56 Big Deal Avenue, Goldentown"* | The house `report.preparedFor` placeholder, as on every other model. **The address is a typed field** at the top of *The property* card | There is no client-name source on this screen, and inventing one would have put a sample couple's name in front of a real client. The address had to become an input anyway — §4 lists it (row 23) and the mockup showed it nowhere it could be edited |
| **3** | Net equity sub-line: *"Year 10 · after the loan still owing"* | **"Year 10"** | 🔴 The clause is **false under the *Repay from Capital Introduced* ending**, where the loan is cleared. §8 Q2's ruling is that *the year* sits in the sub-line; the year is what stayed |
| **4** | The loan table has no *P&I — Assumed Annual Interest Rate* row | The row **is** there | §5e lists it. The mockup dropped it, and the two rates genuinely differ once the inflation figure bites |
| **5** | *Total Term of Interest Only Loan* drawn under the *Convert* ending | **Always shown** | Nothing on a screen vanishes as a side effect of the reader changing a setting. It is inert under *Repay*, not hidden |
| **6** | A *"▸ Set interest rates year by year (10 years, both loans)"* disclosure | 🔴 **NOT BUILT** | **The model cannot serve it.** It takes a base rate plus an inflation figure and has no per-year rate input at all — §4's "behind a disclosure" was written before the model was. Building it is a change to the maths with its own golden test, not a screen job. **It is not on the live list; raising it is a decision, not a to-do already taken** |
| **7** | One paragraph of prose under *What this says*, about this property | **Three sentences built from the figures**, covering the cases the one paragraph could not: a property that never turns cash-positive, one positive from year 1, tax that does become payable, and losses offset rather than ring-fenced | A fixed paragraph would have been **false for any property but the sample** — and it would have read as authored analysis while being a hardcoded string, which is precisely item 4.18's failure. ✅ **The exact sentences were put to Mike on 2026-08-17 and approved: *"the wording is great."*** |

⚠ **Differences 1 and 2 are the mockup being a drawing rather than a build, and 3–7 are
the build knowing things the drawing could not.** None of them is drift: each was found by
putting the two side by side, which is the only reason they are listed rather than
discovered by somebody else in a month.

✅ **The thing §10 warned must not be dropped was not dropped.** *"charged at 8.625% with
GST"* renders under the management fee, from `taxRules.effectiveManagementFeePct`, and a
test fails the build if it ever stops.

### 🔴 The PROPERTY TAX RULES TAB, built 2026-08-18 — there was NO artefact, and Mike has not seen it

**This is a Save-the-Artefact failure and it is written here as one.** `CLAUDE.md` requires
anything shown for approval to exist as a committed file first, and requires the finished
build to be put beside that file with every difference named. **There is no drawing of this
tab.** The one mockup for this model — [`mockups/multiple-property-assessment.html`](mockups/multiple-property-assessment.html)
— is the report screen. Nothing was ever drawn for the Hub tab, so there is nothing to put
the build beside, and this section cannot say what §10 is supposed to say.

**What IS approved, and it is not nothing:**

| | Ruled | Where |
|---|---|---|
| The labels on the tax settings | ✅ Mike, 2026-08-17 | §8 Q5 |
| Who sets them, who may correct them, who types over them | ✅ Mike, 2026-08-17 | §8 Q6 |
| The mentor's exclusion, and the option turned down | ✅ Mike, 2026-08-17 | §8 Q6 |

**So no wording on the tab is invented — the words are his rulings.** What was never put to
anyone is the **layout**: that the tab shows what it INHERITS, what this tier has CHANGED,
and what its advisors RESOLVE to, in three columns, with version history beside them.

⚠ **The remedy is NOT a mockup drawn after the fact.** A drawing made from the finished build
proves nothing — it can only agree with what it was copied from, which is the failure this
rule exists to prevent, wearing the rule's own clothes. **The remedy is Mike opening the tab
on the running app.**

✅ **HE DID, AND THE REMEDY IS DISCHARGED — recorded here 2026-08-20.** In his words:
*"I DID look at the property tax rules — your notes should show that the phasing depreciation
inputs were too small and thus failed to show the % figures."* He was right: the five phasing
percentage boxes shared a slot sized for one, about 31px each, so every one read as empty
while holding and saving the correct value. **Finding that defect WAS the review** — no test
in the repository could have seen it, because jsdom has no layout engine.

🔴 **THIS HEADING IS LEFT AS IT WAS WRITTEN, AND THE CORRECTION SITS UNDER IT, on purpose.**
The claim *"Mike has not seen it"* survived into a fourth session and was repeated again on
2026-08-20 by a session that read the newest notes but not the one holding his correction.
Rewriting the heading would remove the evidence of how long a wrong line lives once it is
written down. **The gap that remains is the missing artefact, not a missing review.**

🔴 **How it happened, so the next one is caught earlier.** The tab was built as the second half
of a report model. The report screen had an artefact and went through §10 properly; the Hub
tab was treated as plumbing attached to it rather than as a screen in its own right. **A tab is
a screen.** The Save-the-Artefact rule does not have a size threshold, and the thing that
disguised this one was that it arrived inside a job whose *other* half was fully covered.

### 🔴 The LENDING CEILING FIELD, added to that same tab 2026-08-20 — no artefact, and this time it was DECLINED

**The rule was offered and turned down, and that is a different thing from being skipped.**
Mike was told, in these terms, that the tab had been built with no drawing, that he had
still never opened it, and that the order should be *"write and commit the drawing of the
tab with the new field in it first, then show it to you with the labels I'm proposing."*
His answer: **"no, just add it as a field - I'm sure you can do it."**

So there is again nothing to put the build beside, and this section again cannot say what
§10 is supposed to say. What follows is the honest substitute.

| | |
|---|---|
| **Label** | *"Maximum Loan to Value Ratio (%)"* — **OURS, not a ruling.** |
| **Help text** | *"The most a lender will advance against a property. Leave blank for no limit — the ratio is still shown, it is simply not judged."* — **ours.** |
| **Placement** | Sixth of nine, after Depreciation Rate on Chattels — **ours.** |
| **Tab intro** | Widened from *"treats tax"* to *"treats tax and lending"* — **ours.** |
| **The tab's NAME** | **Untouched.** It still says Property Tax Rules while holding a lending setting. Renaming it is his call and was not made. |
| **That it exists at all, and is editable** | ✅ **His** — Q10. |
| **That it ships blank** | Ours, with the reason in Q10: a shipped figure is a lending policy nobody chose. |

⚠ **One line from Mike changes any row marked "ours".** They are listed individually so
that changing one is a one-line instruction rather than an archaeology exercise.

✅ **What did NOT happen again: shipping it untested.** The tab had no component test of
any kind — it was built on 2026-08-18 with neither an artefact nor a test, which is two
of the three checks missing at once. `tests/unit/firmPropertyTaxRules.component.test.js`
now exists: 12 tests on what the tab shows, what it sends, whether it can tell "set here"
from "inherited", and that none of the eight tax settings was disturbed by the ninth.

⚠ **THE SENTENCE THAT WAS HERE WAS WRONG, AND IT IS THE POINT OF THIS ENTRY.** It read:
*"The remedy for BOTH gaps is still the same, and still outstanding: Mike opening the tab
on the running app. It has now been carried four sessions."* **He had already opened it,
and had already said so** — on the morning of this same day, correcting the claim in
`SESSION-2026-08-19-B-NOTES.md` and again in `SESSION-2026-08-20-NOTES.md` §3. The session
that wrote the line above read the newest session note and the one before it, and **not the
one holding the correction**, which is exactly what the startup rule *"read every session
note back to the last merge"* exists to prevent. It then repeated the claim in a commit
message, in `to-do.md`, and proposed adding it to the live list as a task Mike had already
done. He caught it: *"remember, i started this session by telling you i already opened the
property tax rules"*.

🔴 **A finding is not evidence that the finder wasn't looking.** He found a real layout
defect on this very tab — five phasing percentage boxes sharing a slot sized for one — and
that finding was itself the review. Turning it into "still not reviewed" made his own work
into evidence against him, twice.

**What remains is only the ARTEFACT.** No drawing of this tab exists, and per the note
above one made now would prove nothing. It is not a blocker for anything; it is a gap in
the record, and it is stated as one rather than as an outstanding job for Mike.

### The PHASE 2 SCREEN, built 2026-08-21 — twelve differences, all named

**The drawing was opened beside the running screen before this was written.** Approved by
Mike on 2026-08-21 (*"looks great - move forward"*) after reading
[`mockups/multiple-property-portfolio.html`](mockups/multiple-property-portfolio.html).

| | The drawing | The build | Why |
|---|---|---|---|
| **1** | Sub-line *"Year 1 · all five properties"* | *"all {n} properties"*, and *"one property"* at one | The screen takes one to five. The drawn literal is false for every count but the one drawn |
| **2** | Three more sub-lines saying *five* — *The five properties*, *All five properties added together*, *the family home and five rentals* | Counts, for the same reason | |
| **3** | The household note cites `INPUTS` rows 11–15 and K13 | The cell references are dropped; the rest stands | A spreadsheet cell reference is developer shorthand. It means nothing to an advisor, and the half that says where the ceiling comes from is the half that helps |
| **4** | The *Balance of Loans to Apportion* note cites *"the workbook's own row 17"* | Same — reference dropped, meaning kept | As above |
| **5** | A `.warn-none` style for an all-clear findings card | 🔴 **The card is ABSENT when the model changed nothing** | The drawing defined the style and drew **no sentence for it**. Rather than invent wording after approval, the card does not appear. Guarded by a test |
| **6** | *"Held back by the family — $0 of $315,000. Every dollar of the deposit is spent, and it is spent once."* | **Two sentences**: that one when the deposit is fully spent, and a plain statement of the amount kept when it is not | 🔴 The drawn sentence is **false in exactly the case the hold-back control exists to create**. It was drawn on a state where nothing was held back |
| **7** | The lending card shows only *"shown, not judged"* | Adds *"Within the {max} ceiling."* / *"Above the {max} ceiling."* | **Ours, and never drawn.** The drawing showed only the unset state; the second-state annotation's *within* / *over* column is the closest it comes. One line from Mike changes either |
| **8** | Commentary: *"…the rentals together stand at 90.9% loan to value, **which no ordinary investment lender will advance**."* | The final clause is **dropped** | 🔴 It is a lending judgement, and asserting it needs a threshold. The model ships the ceiling blank precisely so nothing is judged (§8 Q10) — hard-coding "no ordinary lender" would smuggle back the invented policy that ruling refused |
| **9** | Commentary: *"…carry $4,678 a week **for the first five years**"* | *"…in the hardest year"*, using the model's own `peakYear` | "The first five years" was read off the sample's shape. It is not a figure the model produces, and it is wrong for a portfolio that peaks later |
| **10** | Card titles *Property 1 — the property* and *— funding*; *Annual costs* and *Assumptions* not drawn at all | All four carry the *Property n —* prefix, composed with the **existing approved** card titles (so *— Funding structure*, not *— funding*) | No card in that column should be ambiguous about which property it belongs to. Composing reuses wording Mike already ruled rather than inventing a second name for the same card |
| **11** | Tax rules note: *"A single property may still differ — that override lives on the property itself, below."* | 🔴 **NO per-property tax override is drawn, and none is built.** Tax rules are portfolio-level only | The drawing's prose promises a control the drawing does not show. Building it would be building something unapproved; deleting the sentence would hide the gap. **It is named here and it is open** |
| **12** | The catalogue card carries the scope line | Scope line deleted from the row **and** the header (step P2-5, ruled) — but the summary still reads *"Whether **a rental property** is worth buying"*, singular | ⚠ That summary is **Mike's own wording, ruled at Q7** when the screen was one property. It now understates a five-property model. **Changing it is his call and was not made** |

⚠ **Two behaviours the drawing implies but does not show, decided here rather than in the
code:** a property may be added up to five and removed down to one (never to none — a
portfolio of nothing would compute on the model's sample), and **a new property is seeded
from the workbook sample with a blank address** rather than blanked. It is seeded because
the *backend already defaults every absent figure to that same sample*: a blank card would
show zeros while the model computed on 649,000, and the screen would disagree with its own
figures.

#### 🔴 Two defects found by RENDERING the screen, which no test would have caught

Both were found by mounting the component with the real English strings and reading what
an advisor would actually see — not by any assertion, and not by the 5,885 tests that were
green at the time. **Both are fixed, and both now have a test that was mutation-verified
by reverting the fix and watching it fail.**

- **The cash deposit vanished from the per-property investment summary.**
  `investmentSummary.cashDeposit` is a **scalar**, not a ten-year series; indexing it gave
  `undefined` and the row rendered as ten dashes. *Every other row in that table is a
  series*, which is what made it an easy mistake and a hard one to see.
- **The deposit box was empty where the table had put money in.** The box binds to what
  the family **typed**, so in the state the screen opens in it was blank — sitting beside a
  funding figure of 334,000 that had visibly had 315,000 deducted from it. The screen was
  disagreeing with its own table. The applied figure is now the box's **placeholder**, so
  blank still means *"take what is left of the pool"* and the reader still sees the money.

⚠ **This is the Property Tax Rules lesson arriving on time rather than late.** Jest has no
layout engine and no eye; the tab's phasing-box defect was found by Mike opening the
screen. Here the screen was read before it was shipped — but **reading rendered text is
still not seeing a laid-out page**, and no browser driver is installed in this repository.
**Layout remains unverified and it is stated as unverified.**

### The PHASE 2 MATHS, built 2026-08-20

**No differences to record, because there is no drawing to differ from — and that is the
point of P2-3.** The maths is backend-only and nothing of it reaches a screen yet. Every
behaviour it added that the workbook does not have was written INTO this document and
ruled on first: the hold-back and the three identities (§8 Q9), the lending ceiling and
the two LVRs (§8 Q10), the servicing demand (§8 Q10), and the two corrections (§8 Q8).

⚠ **The one thing a Phase 2 screen must NOT quietly drop:** the `warnings` list. A capped
interest-only slice, a deposit reduced to fit, or a breached LVR are each a sentence the
advisor needs to read. They are computed and returned; a screen that does not render them
puts the model back to silently producing a plausible wrong number, which is the exact
fault §8 Q8 was raised to fix.

### The backend, built 2026-08-17

**No differences to record, and that is the point.**
Everything the build needed that the artefact did not have was written INTO the artefact
first and ruled on: the cash deposit input (§4), the two funding fields and the Capital
Introduced line (§6 rule 9, §8 Q4), and the whole Tax rules card (§6 rule 10, §8 Q3/Q5).
The mockup was redrawn from the model's real output before Mike approved the labels, so
the figures he judged are the figures the screen will show. **Nothing drifted because
nothing was built ahead of the artefact.**

⚠ **The one thing the screen must NOT quietly drop:** the mockup shows the effective
management fee — *"charged at 8.625% with GST"* — under the fee itself. The model returns
`taxRules.effectiveManagementFeePct` for it. That line is the visible half of §6 rule 10's
fix, and a screen without it puts the model back where it started.

---

### The TAX RULES CARD — a promise the drawing made and the drawing never showed

The Tax rules card carried the note *"A single property may still differ — that override lives
on the property itself, below."* **No such control was drawn anywhere on that page, and none
was built.** The tax rules sit at portfolio level and apply to all five properties.

That is the artefact disagreeing with the build, which is the exact thing this section exists to
catch — and it could not be settled by a developer. Building the override unasked would have
shipped something Mike never saw; deleting the sentence quietly would have hidden a promise he
may have meant. The case FOR an override is a firm advising across a border; the case AGAINST is
a family whose properties are all in one country, which is the reasoning §11 Q11 is built on.

✅ **RULED BY MIKE, 2026-08-25 (item 4.27): strike the sentence.** The tax rules stay at
portfolio level. The card now says so outright rather than by omission, and the promise is
recorded here as withdrawn deliberately — not vanished.

---

## 11. The Phase 2 screen — the portfolio

> **The drawing is
> [`mockups/multiple-property-portfolio.html`](mockups/multiple-property-portfolio.html),
> written 2026-08-21 as build step P2-3.** Every figure on it is
> `computeMultiplePropertyPortfolio()`'s own output on its own defaults — nothing is the
> workbook's uncorrected arithmetic and nothing is invented. The second state shown near
> its foot is the same function called with a hand-spread deposit and an 80% ceiling.
>
> 🔴 **The screen is not built and must not be built until Q11–Q16 are ruled.**

### 11.1 The shape, and the problem it solves

Five properties carry about **twenty-five inputs each** and **four ten-year tables each**.
Drawn flat that is a screen with a hundred and twenty-five input boxes and twenty tables.
The shape is therefore a real design decision rather than a layout preference, and it is
**Q11**.

**What is drawn: the portfolio is the screen, and one property is open inside it.** The
ruled `[A]`–`[D2d]` skeleton is unchanged — full-width header, full-width headline band,
then the 360px + `1fr` two-column body, 16px gaps throughout.

| | Left column `[D1]` — what is typed | Right column `[D2]` — what is computed |
|---|---|---|
| Portfolio | **The household** · **The properties** (the list of five) · **Tax rules** | **Things to check** · **How the deposit is spread** · **Lending position** · **The five properties** · **Consolidated report** · **What the portfolio asks of the family** · **What this says** |
| The open property | **Property n — the property** · **— funding** · *— annual costs* · *— assumptions* | **Property n — investment summary**, then its *profit & loss*, *tax position* and *loan calculations* |

🔴 **Opening a different property changes only the property cards and the property section.
Nothing in the portfolio moves.** This is the *nothing-moves-under-the-reader's-hand* rule
applied rather than assumed: choosing which property to inspect is the reader navigating,
which is a different thing from a screen rearranging itself as a side effect of an unrelated
setting. And **the five-property comparison card exists so that opening a property is never
the only way to compare it** — a reader is never asked to judge two states they cannot see
at once.

⚠ **The comparison card has to answer §1**, which says in terms that this model is *not* a
side-by-side property comparison. It still is not. Nothing on that card is scored, ranked or
recommended; it is the five properties the advisor already entered, each showing the four
figures the model already computes.

**The alternative, turned down and recorded so it is not re-derived:** a portfolio screen
that links out to five separate property screens, each one Phase 1 as it stands. Less to
build, and each screen stays simple. Rejected because **the deposit is a portfolio-wide
decision made property by property** — changing property 3's deposit changes what properties
4 and 5 can borrow — so splitting it across two screens means the advisor never sees the
consequence of the number they are typing.

### 11.2 What the drawing found, which is not a design question

Running the model on its own defaults is the state an advisor meets first, and it says
something the spreadsheet never could:

- **Property 1 absorbs the whole $315,000 deposit and properties 2–5 borrow 100% of their
  purchase price.** That is what *"no hold-back chosen"* means — the cascade spends the pool
  in order until it runs out.
- **The rentals on their own stand at 90.9% loan to value**, and 91.6% when the deposit is
  spread evenly by hand instead. Against an 80% ceiling, spreading it puts *every* property
  over; concentrating it leaves one comfortable and four impossible.
- **The honest answer is that $315,000 does not buy five properties.** No version of the
  workbook could produce that finding, because the workbook has no lending test at all
  (§8 Q10).

🔴 **THE SAME PROPERTY READS DIFFERENTLY ON THE TWO SCREENS.** Property 1 is **−$929 a
week** on the live Phase 1 screen and **+$41 a week** here. Neither is a fault. Phase 1 lets
the advisor type *Funding Required* and *Cash Deposit* as two independent numbers, and its
sample types $649,000 of funding **and** a $315,000 deposit — borrowing the whole purchase
price while also putting money down. The portfolio's table will not allow that, which is
correction 4 of §8 Q8, ruled *"yes fix both"* after Mike was told live figures would move.

⚠ **It is raised because an advisor who opens both screens will see it and will ask.**
Nothing is proposed. It bears directly on Mike's still-open question of **whether the
sample's own $350,000 / $299,000 loan split should be reset** now the deposit is genuinely
applied — that same inconsistency is what produces the single finding on the drawn screen.

### 11.3 🔴 What actually needs Mike's word — Q11 to Q16

**Everything else on the drawing is either the workbook's own wording, an existing ruling of
his, or the ruled house look.** What follows is ours, and each is listed so that changing one
is a one-line instruction rather than an archaeology exercise. **He may give his own wording
for any of them instead of choosing.**

| | Question | Ours | Our recommendation |
|---|---|---|---|
| **Q11** | The shape of the screen | Portfolio-is-the-screen; the property list and *+ Add a property*; the titles *The household*, *The properties*, *The five properties*; Tax rules at portfolio level | As drawn |
| **Q12** | The headline band | Only the sub-line *"Year 1 · all five properties"*. The four labels are his, unchanged (§8 Q2) | As drawn |
| **Q13** | The deposit table | The title *How the deposit is spread*; the columns *Deposit applied*, *Deductible share*, *Loan to value*; the row *The family home*; the held-back sentence | As drawn |
| **Q14** | The hold-back control | The label *Deposit Applied to This Property*; that it is typed in two places; that *Funding Required* and the P&I loan become read-only here | As drawn |
| **Q15** | The seven finding sentences | The card *Things to check*, its sub-line, all seven sentences, and the *What this says* commentary | As drawn |
| **Q16** | Lending and servicing | The titles *Lending position* and *What the portfolio asks of the family*; both ratio names; the *"shown, not judged"* wording — **and one real decision, below** | As drawn, plus **do not** ask for income yet |

🔴 **Read the drawing, not this table.** The table names what is open; the drawing shows the
words in place, and Q5 is the precedent — Mike ruled on the whole Tax rules card in one line
because it had been *drawn* rather than listed.

#### Q16 — the one that is a decision rather than a wording choice

**Should the screen ask for the family's income and living costs, so that servicing can be
judged rather than merely stated?**

The model reports what the portfolio *demands* — $243,244 in year 1, about $4,678 a week,
$1,566,523 over ten years — and deliberately stops there. A test fails the build if an
affordability verdict is ever added.

- **Ask for it.** The advisor gets a real answer to the question every client actually has:
  *can we afford this?* It is also the single largest omission in the source workbook, which
  collects no income on any sheet.
- **Do not ask for it.** It is new maths, not a screen change: a serviceability test needs
  income, living costs, existing commitments and a lender's own stress rate, and each of
  those is a jurisdiction-specific rule of the kind §8 Q3 turned into settings. Building it
  half-way would produce a verdict that looks authoritative and is not, on a screen whose
  `modelClass` is `CLASS_DECISION` — somebody may buy five properties on it.

**Our recommendation as engineers: do not ask for it now.** Ship the demand stated plainly,
and treat serviceability as its own piece of work with its own artefact, its own settings and
its own golden test. ⚠ **This is raised rather than assumed precisely because it is the kind
of gap that gets noticed after a screen ships**, and the honest time to name it is before.

### 11.4 What the drawing deliberately does not do

- **It does not redraw what Phase 1 already had approved and built** — *Annual costs*,
  *Assumptions*, and three of the four per-property ten-year tables. Redrawing settled work
  only invites it to drift.
- **It does not port `Import Range` or `Imported Report`** — §1.
- **It does not judge affordability** — Q16 above.
- **It does not offer the year-by-year interest rate table.** The model has no per-year rate
  input; building one is a change to the maths with its own golden test (§10, difference 6).
  It is not on the live list, and raising it is a decision rather than a to-do already taken.
