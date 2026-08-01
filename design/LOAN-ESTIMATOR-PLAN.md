# The Loan Estimator — build plan

> **Status: WRITTEN 2026-07-23, NOT YET APPROVED TO BUILD.** No code exists. The phase
> order below and the four open rulings in §3 need Mike's yes before Phase 1 starts.
> Live progress belongs in [`ACTIONS.md`](ACTIONS.md); this document is the design.
>
> **Source workbook:** `design/report-source-models/The Loan Estimator.xlsx` (4 sheets:
> Capital Input · Serviceability Input · Loan Criteria · Interest). Read end to end
> 2026-07-23; every figure quoted here is the workbook's own cached value.
>
> **Scope ruling (Mike, 2026-07-23): build the WHOLE lending assessment**, not just the
> Quick Calculator that the catalogue's one-line summary describes.
>
> Follow [`ADDING-A-REPORT.md`](ADDING-A-REPORT.md) throughout — this plan says *what* and
> *in what order*; the recipe says *how*, and the `add-a-report` skill carries the traps.

---

## 1. What the workbook actually is

The catalogue calls it *"repayments, interest and total cost across loan options."* That
describes roughly one tenth of the file. It is really a **bank lending assessment** in five
connected parts:

| # | Part | What it answers | Sheet |
|---|---|---|---|
| A | **Bank rule table** | How much will a bank lend against each asset, over what term, at what assessment rate? | Loan Criteria |
| B | **Security position** | What is the client's asset base worth, net of debt, and what could it support? | Capital Input |
| C | **Serviceability** | After tax and living costs, can the household actually afford the repayments? | Serviceability Input |
| D | **Repayment schedules** | Table / Reducing / Interest Only — interest, principal and balance over 10 years | Interest |
| E | **Business block** | The trading entity's EBIT and its own securities | Serviceability Input (lower) |

**16 security classes**, and they are distinctly New Zealand: Residential Home, Rental
Property, Boat, Classic Cars, Artworks, Commercial Property, Plant & Equipment, Vehicles,
Inventory/Stock, Debtors (90 days or less), Farm (Dairy), Farm (Sheep/Beef), Horticulture,
Glass House Horticulture, Fonterra Shares.

**Part C is the largest single piece** and the one with the most judgement in it: two
customers' gross income taxed to net, plus rental, boarder and other income; minus student
loans, overdraft and credit-card minimums, per-dependant and per-vehicle allowances, rent,
general and additional living costs; minus the minimum payments on current *and* proposed
loans calculated at the **assessment** rate rather than the actual rate. The output is a
monthly surplus and a plain-English verdict.

---

## 2. Anchors already verified by hand

These are the numbers a golden test must reproduce. Each was checked independently, not
just read off the sheet:

- **Quick Calculator monthly repayment = `5747.094633`** — $1,350,000 price less $270,000
  deposit = $1,080,000 at 5.5% over 36 years (432 months), Table basis. Re-derived from the
  standard annuity formula and matches the workbook to the penny. This is the safest first
  thing to build.
- **Residential Home stress-tested payment = `9026.370957`** — `-PMT(8.95%/12, 25*12,
  1080000)`, i.e. the *assessment* rate over the security's maximum term, not the actual
  loan terms. Confirms Part B leans on the Part A rule table.
- **Household surplus = `105.7495571` → verdict "Doesn't Look Good"** — the verdict flips
  at a surplus above **250**. A useful end-to-end anchor because it exercises income, tax,
  expenses and loan minimums in one number.

---

## 3. OPEN DECISIONS — needed before the phases they gate

These are decisions, not assumptions. None has been guessed at in this document.

### 3.1 Tax tables — do we ship them at all? *(gates Phase 3)*

The workbook hardcodes income tax bands with **no effective date**. The NZ bands present
are 10.5% / 17.5% / 30% / 33% / 39% breaking at 15,600 / 53,500 / 78,100 / 180,000 — which
look like the 2024–25 NZ thresholds and are therefore **probably out of date today
(2026)**. I have not verified them against current IRD rates; that check is part of the
decision, not a detail of it.

This is the one part of the report that goes wrong *with the passage of time* rather than
because of a defect, and it goes wrong silently. Options, for Mike:

- **(a) Ship them as dated config** — `data/tax-bands.json` carrying an explicit tax year,
  with the screen naming the year it used. Wrong figures become visible rather than silent.
  A later Firm Manager edit target lets a firm update them without a developer.
- **(b) Make them an input** — the advisor supplies the net income and we never model tax.
  Smallest surface, least value, and it moves the risk onto the advisor.
- **(c) Ship as-is.** Not recommended and recorded only to be explicit: undated tax rates
  inside a lending assessment is the kind of thing that is defensible right up until it
  isn't.

**Recommendation: (a).** It keeps the workbook's value and makes staleness loud.

### 3.2 The Australian side appears unfinished *(gates Phase 3)*

The workbook carries Australian income thresholds *and* a separate federal table — but
**every Australian federal rate in it is `0.0`**, across all five bands. State-level rates
(32.5% / 37% / 45%) are populated. So an Australian assessment currently computes no
federal tax at all, which cannot be intended.

Needs Mike's confirmation of one of: it is genuinely unfinished and we build **NZ only**;
it is unfinished and we complete it (which means sourcing real ATO rates — a bigger job
than it looks, given Australia's tax-free threshold and Medicare levy); or it is
deliberately zeroed for a reason I have not found.

**Recommendation: NZ only for v1**, with the Australian path explicitly absent rather than
present-and-zero. A visible gap is safer than a silent zero.

### 3.3 The verdict wording *(gates Phase 4)*

The sheet prints **"Looking Good!"** or **"Doesn't Look Good"** against a household's
borrowing capacity. An advisor will show this to a client, who may well hear it as a
lending decision rather than an indication.

Mike to rule on the wording and on whether a qualifier sits beside it. Per CLAUDE.md no
label is to be invented here — the workbook's own words are recorded above as the starting
point, not as an approved choice.

### 3.4 One screen or several? *(gates Phase 4)*

Five parts will not fit one screen the way the existing six reports do. Two shapes:

- **A stepped flow** like Quick Position (chips: security → serviceability → result).
  Familiar to the app, handles the volume of input, more work.
- **One long screen with collapsible sections.** Simpler, prints as one document, but the
  input burden is heavy and everything is visible at once.

**Recommendation: stepped flow**, because Part C alone has ~25 inputs. But this is a design
call and the "every model looks the same" ruling of 2026-07-22 applies — the headline,
banner and badges come from `components/base/` either way and are not up for redesign.

---

## 4. Defect found in the source workbook

**The Reducing-loan "Balance Outstanding" row is wrong from year 5 onward.** Proven, not
suspected — `Interest` sheet, cells `AA8`–`AF8`:

| | Yr 4 | Yr 5 | Yr 6 | Yr 7 | Yr 10 |
|---|---|---|---|---|---|
| Workbook shows | 960,000 | **276,718.75** | **180,000** | **210,000** | **300,000** |
| Should be (col N) | 960,000 | 930,000 | 900,000 | 870,000 | 780,000 |

Cause is a copy-paste slip in the column reference: `AA8` reads `O90` (cumulative
*interest*) and `AB8`–`AF8` read `P102`–`P150` (cumulative *principal repaid*), where all
six should read column `N` (the balance) as the first four correctly do. A balance that
falls for four years, collapses, then climbs is impossible.

**Only visible when "Reducing" is selected**; the default Table basis is correct throughout.

Per the recipe, the default is to **reproduce the source faithfully and let the owner
decide separately** — the same treatment as the Working Capital `D20` flaw. Recorded here
so the decision is taken deliberately rather than by whoever writes the test. **Mike to
rule** at Phase 2, and if we do correct it, the source `.xlsx` should be corrected too so
the two do not diverge.

---

## 5. Classification and privacy — settled, not open

- **`modelClass: CLASS_DECISION`** (already the catalogue's entry). The client's real
  numbers, typed in. **No "Illustrative" badge, ever** — `reportBadgeClass.component.test.js`
  enforces this and will fail the build if it appears.
- The workbook holds a **named individual's personal finances** — legal name, dependants,
  incomes, debts. Nothing from this report goes to an LLM, and no figure or name is logged.
  Backend logs stay code-only, as the intake routes already do.
- Calc routes stay **anonymous** — numbers in, numbers out, no `firmAuth`. Only file intake
  needs a guard, and Phase 1–4 involve no uploads.

---

## 6. Phasing

Backend outward, each phase proving green before the next depends on it. Every phase is
its own commit and its own approval.

1. **Rule table + security position (Parts A + B).** `data/loan-criteria.json` as the single
   source for lend %, max term, assessment rate and the allowance figures — config, not
   code, so it can become a Firm Manager edit target later without a rewrite.
   `server/report/loanEstimatorModel.js` computes adjusted values, equity, loan limits,
   available security and stress-tested payments. Golden test against the workbook's own
   cached values with cell references. **No UI.**
2. **Repayment schedules + Quick Calculator (Part D).** Table / Reducing / Interest Only,
   10-year interest, principal and balance. Gated on the §4 ruling. The `5747.094633`
   anchor lands here.
3. **Serviceability (Part C).** Gated on §3.1 and §3.2. Tax bands from dated config;
   income, expenses, allowances, loan minimums at assessment rate; surplus and verdict.
4. **Route, catalogue, screen(s) (Parts A–D).** Gated on §3.3 and §3.4. Composed from
   `ReportHeader` / `HeroStrip` / `HeroFigure` / `SliderField` / `StaleBanner` and the
   `currencyMixin` + `reportRecompute` mixins. Catalogue row flips `STATUS_SOON` →
   `STATUS_READY` and gains its `route`.
5. **Guards and proof.** Add to `reportHeadlineConsistency.component.test.js`'s `SCREENS`
   list (step 8 — fails silently if skipped), component tests via
   `tests/helpers/mountComponent.js`, full suite + lint green, and Mike views it in the
   running app.
6. **Business block (Part E)** — deliberately last. It is the least connected piece and the
   report is useful without it.

---

## 7. Risk control

- **One phase, one commit, one approval.** A phase that cannot finish cleanly stops at the
  last green commit rather than being half-landed.
- **Golden tests carry cell references**, so any figure can be re-checked against the
  workbook by hand — the convention every existing model follows.
- **Mutation-verify anything load-bearing**: revert the logic on a copy *outside* the repo
  and confirm the test actually fails. Two defects shipped on the last report with passing
  tests because the tests exercised a state the app cannot produce.
- **Where the source is odd, assert the source's number** and log the oddity here. Porting
  is the job; repairing is a separate owner decision (§4).
- **This is a multi-session workstream.** Expect to end sessions mid-plan; the phase
  boundaries are chosen so that is safe.

## 8. Payoff

Six of ~87 catalogued models are built. This is the first of the genuinely large ones, and
the first to need config-as-data (§6.1) and multi-step input. Both are patterns the
budgets, dashboards and forecast reports will need — so the cost here is partly an
investment in those.
