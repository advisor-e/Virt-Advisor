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

Everything above is either the workbook's own wording or the ruled house style. **Four things
have been genuinely open. Q1 is ruled, so three are still being asked:**

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

### Q2 — The four headline labels

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

### Q5 — The labels on the new Tax rules card

Q3's ruling creates a fifth input card, and **none of its labels exists in the workbook** —
these rules were never fields, they were assumptions inside formulas. So every one is new
wording and every one is Mike's. They are drawn in
[`mockups/multiple-property-assessment.html`](mockups/multiple-property-assessment.html) as
proposed below; **nothing is chosen.**

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

### Q6 — Who sets the tax rules

**Open, and deliberately separated from Q3.** Q3 decided the model can vary them. This
decides where they are set:

- **The advisor, on the screen** — every input beside the others, changed per client. Right
  if a firm advises clients in more than one country.
- **The firm, once, on a hub page** — set for the whole firm and inherited, per the
  hub-page rule of 2026-08-16. Right if a firm works in one jurisdiction, which most do, and
  removes four chances to get tax wrong from every advisor's screen.
- **Both** — the firm sets the default, the advisor may override it on a client.

⚠ **The hub-page rule in `CLAUDE.md` does not settle this by itself**: it governs content
that shapes what the **AI** is shown, and these are model constants that never reach a
prompt. It is raised rather than assumed, as that rule requires.

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
