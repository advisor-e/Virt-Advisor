# Report Data Model — T3 / T10 / T13

> ## ⚠️ RE-SCOPED 2026-07-13 — READ THIS FIRST
>
> This document was drafted on a **false premise**: that the three built models (Working
> Capital Cycle, Debtor Drag, Margin/Mark-up/Break-even) are *reports* that a client's accounts
> get fed into. **They are not — they are Education models.** The owner corrected this; see
> [`MODEL-CLASSIFICATION.md`](MODEL-CLASSIFICATION.md).
>
> **Consequences:**
>
> - **§3–§4 (Xero exports, file intake) do NOT apply to any model built today.** They apply to
>   the **Report class** only — 9 models, **none of which is built yet**.
> - **§2's figure inventory remains valid and important.** It is what *proved* the point: ~⅔ of
>   the inputs these models need do not exist in any accounting export, because they are pricing
>   and operational assumptions. That is the signature of a teaching tool, not an intake problem
>   to solve.
> - **§5's privacy rule was WRONG and is corrected below.** It assumed "no file dropped = no
>   client data = no exposure". The real trigger is **real client numbers, however they arrive** —
>   so **Decision tools, which import nothing and are typed in by hand, still handle sensitive
>   client data and still need scrubbing.**
>
> **Status: DRAFT for the owner's review. No code has been written against this.**
> The *figure inventory* in §2 is **fact** — read straight out of the model code.
>
> **§3 was VERIFIED on 2026-07-13** against four real Xero exports (Demo Company NZ), which
> **refuted three of this document's assumptions** — see §3.3, §3.4, §3.5 — and surfaced the
> single most important intake rule: **Xero's exports do not contain their own totals; they are
> uncalculated formulas that a parser reads as ZERO** (§3.1). One mapping remains unverified
> (§3.6) because the demo org has no inventory or debtor/creditor accounts. Rows still marked
> ⚠️ are **not safe to build against**.
>
> **§3.6 was CLOSED on 2026-07-15** against a populated real-company export pair supplied by
> the owner (Electric Bikes NZ Limited — Balance Sheet + "Current financial year by month"
> P&L; held outside the repo with the other exports, never committed). The stock, debtor and
> creditor mappings are now verified — see **§3.9** — the monthly-sales gap (§3.5) has a real
> export that fills it, and the totals rule gained a cross-check nuance (§3.1).

**Decisions already taken** (do not re-open — see the plan's decision log):

- **T4 — files only.** No live Xero API pull. (2026-07-09)
- **T12 — anonymised numbers only reach the AI.** Client identity is held locally, scrubbed
  before the AI step, and re-merged at final assembly so the finished report is still fully
  personalised (name, firm logo, branding). (2026-07-09)
- **Intake is hybrid.** The dropped file seeds every figure it can; the advisor supplies the
  rest on-screen, pre-filled with a sensible default so the report is never blank. Every
  figure is visibly tagged *from file* or *entered*. (2026-07-13)
- **Spreadsheets only — XLSX and CSV.** PDF exports are rejected with a message naming the
  right export to download. (2026-07-13)

---

## 1. Why the intake has to be hybrid

**Most of what these reports need is not in a set of accounts.**

The three built models take **20 named inputs**, which resolve to **41 individual numbers**
(the Debtor model alone takes twelve monthly sales figures and two six-part collection
profiles). Of the 20 named inputs, roughly a third can be read from an accounting export.
The rest are *operational* facts — what the business charges, what a unit costs it, how long
delivery takes. No accounting system holds those, because they are not accounting outputs.

Working Capital Cycle is the clearest case: of its twelve inputs, six are pricing and
operational assumptions that no Xero report contains.

This is not a defect in the models — it is the nature of the models. It does mean
"drop a file → the report fills itself" was never achievable, and the intake must be designed
as *seed-then-complete*. It also fits the stated product intent: the advisor sits with the
client and moves the variables. The file's job is to get them to a credible starting point
faster, not to do the whole job.

---

## 2. Figure inventory

Legend — **Source**: `FILE` = readable from an accounting export · `ADVISOR` = must be
entered/confirmed by the advisor · ⚠️ = Xero mapping unverified, needs checking against a real
export.

### 2.1 Working Capital Cycle (`server/report/workingCapitalCycleModel.js`)

| # | Input | Default | Source | Where it comes from |
| --- | --- | --- | --- | --- |
| 1 | `initialInvestment` (E3) | 200 | ADVISOR | The cash pot being cycled. Arguably capital employed from the Balance Sheet ⚠️, but it is really a scenario choice — confirm with owner |
| 2 | `plantEquipmentPct` (E5) | 0.40 | ADVISOR | Share of the investment sunk into plant & equipment. Not derivable from a P&L |
| 3 | `unitCost` (V7) | 1 | ADVISOR | Per-unit cost. Not in accounting data (it is a product fact, not a ledger line) |
| 4 | `markupPct` (V11) | 1.50 | ADVISOR | Pricing decision |
| 5 | `discountPct` (V13) | 0.15 | ADVISOR | Pricing decision |
| 6 | `fullPricePct` (V19) | 1.00 | ADVISOR | Share of units sold at full price. Pricing/mix decision |
| 7 | `daysDeliverable` (Q20) | 4 | ADVISOR | Operational lead time |
| 8 | `daysOnHand` (Q23) | 6 | FILE ✅ | Days inventory on hand — Balance Sheet stock ÷ COGS × 365, if the client carries stock. **Verified 2026-07-15 (§3.9) — but stock can be split across several differently-named rows (one real company: 4 rows); the advisor confirms which rows count** |
| 9 | `daysReceivable` (D22) | 35 | FILE ✅ | Debtor days (DSO) — from Aged Receivables, or Receivables ÷ Revenue × 365. **Accounts Receivable verified present on a populated Balance Sheet 2026-07-15 (§3.9)** |
| 10 | `daysPayable` (Q13) | 15 | FILE ✅ | Creditor days (DPO) — from Aged Payables, or Payables ÷ COGS × 365. **Accounts Payable verified present on a populated Balance Sheet 2026-07-15 (§3.9)** |
| 11 | `fixedCostsMonthly` (D17) | 180 | FILE ✅ | Monthly overheads — P&L operating expenses ÷ months. **Verified: must be SUMMED from the expense line items — the "Total Operating Expenses" row is an uncalculated formula that reads as zero (§3.1)** |
| 12 | `priorScenarioAnnualRevenue` (V35) | 2543 | **ADVISOR** ❌ | ~~P&L comparative column~~ — **REFUTED (§3.3): the P&L export has a single year column. Prior-year revenue is not in it.** Needs a second P&L, or the advisor enters it |

**6 of 12 must be advisor-entered.**

### 2.2 Debtor Business Drag (`server/report/debtorDragModel.js`)

| # | Input | Default | Source | Where it comes from |
| --- | --- | --- | --- | --- |
| 13 | `monthlySales[12]` | 100000 … 324000 | FILE ✅ *(specific export)* | ~~Standard P&L~~ — refuted (§3.5): the standard export is annual. **✅ 2026-07-15: the "Current financial year by month" P&L export carries all 12 monthly columns (§3.9)** — the advisor must supply that export. Future months read as `0` (not real sales) and the latest month is likely partial — advisor confirms which months are real |
| 14 | `scenarioA` — the **current** collection profile (`sameMonth`, `month1`, `month2`, `month3`, `month4`, `writeOff`) | .85 / .07 / .05 / 0 / 0 / .03 | **ADVISOR** ❌ | ~~Derivable from the Aged Receivables ageing buckets — the single most valuable thing the file gives us~~ — **REFUTED (§3.4). Aged Receivables ages by DUE DATE: it shows how overdue today's outstanding balances are, NOT what proportion of a month's sales were collected in-month / 1 month late / 2 months late.** That is a payment *history* and it is not in this report. The ageing spread is a rough proxy at best; the real profile needs invoice-level paid-vs-issued dates |
| 15 | `scenarioB` — the **alternative** collection profile (same six parts) | .72 / .15 / .10 / 0 / 0 / .03 | ADVISOR | This is the what-if the advisor is exploring. It must never be auto-filled — it is the question being asked, not a fact |

**Note:** the fractions in a profile should sum to 1. The model already normalises defensively
(a short or malformed profile cannot produce `NaN` — hardened in `4f91a66`), but the intake
should warn the advisor when a profile does not add up, rather than silently rebalancing it.

### 2.3 Margin · Mark-up · Break-even (`server/report/marginBreakevenModel.js`)

| # | Input | Default | Source | Where it comes from |
| --- | --- | --- | --- | --- |
| 16 | `price` | 250 | ADVISOR | Unit sale price — a product fact |
| 17 | `cost` | 82.50 | ADVISOR | Unit cost — a product fact |
| 18 | `overheads` (`oh`) | 11 500 | FILE ✅ | Monthly overheads — P&L operating expenses. Same source and same rule as #11: **summed from the expense line items, never the Total row** |
| 19 | `ownerDrawings` (`draw`) | 8 600 | FILE ⚠️ | Owner's salary / drawings — P&L or the owner's current account. May be a deliberate *target* rather than actual, in which case ADVISOR |
| 20 | `priceChangePct` (`wif`) | 0 | ADVISOR | The what-if being explored. Never auto-filled |

**3 of 5 must be advisor-entered.**

---

## 3. What Xero actually gives us — VERIFIED

> **Verified 2026-07-13** against four real Xero exports supplied by the owner
> (`Demo Company (NZ)` — Xero's own demo org, so no client data): Balance Sheet, Profit and
> Loss, Aged Receivables Summary, Aged Payables Summary. Files live outside the repo at
> `c:\Some VS Code\Perf Report\xero reports\` and **must not be committed**.
> **Extended 2026-07-15** with a populated real-company pair in the same folder (Electric
> Bikes NZ Limited — Balance Sheet + by-month P&L) — see §3.9.
>
> **Three assumptions in the first draft were WRONG.** They are struck out below rather than
> quietly deleted, because each was the kind of error that produces a plausible-looking wrong
> number in front of a client.

### 3.1 🔴 Xero exports do not contain their own totals

**The single most important finding.** Xero writes every total as an **Excel formula with no
cached value**:

```text
Total Trading Income     =SUM(B8:B9)
Gross Profit             =(B10 - 0)
Total Operating Expenses =SUM(B15:B18)
Net Profit               =((B12 + 0) - B19)
Total Assets             =(0 + C10)
Total (aged receivables) =SUM(B7:B13)
```

Excel computes these when a human opens the file. A program reading the file off disk sees a
formula string — and a parser asking for the *value* gets **zero**, because nothing ever
calculated it. On first read of the P&L, every total came back `0`.

**Rule: the intake MUST compute totals itself by summing the line items, and MUST NEVER read a
"Total …" row.** A total row that silently reads as zero is precisely the failure mode the
intake contract exists to prevent — a report full of zeros looks perfectly normal.

**Nuance (2026-07-15).** The populated real-company exports (§3.9) *do* carry cached values in
their Total rows — so the zero-read is not universal; it depends on how the file was produced.
The rule is unchanged (we always sum the line items ourselves — a cached value can never be
relied on to exist), but it gains a free safety net: **when a cached total IS present, compare
it against our own sum and warn the advisor on a mismatch** rather than silently trusting
either figure.

### 3.2 What each export does and does not carry

| Export | Verified contents | Feeds |
| --- | --- | --- |
| **Profit & Loss** | Line-item income + operating expenses. Annual, ~21 rows. **NO comparative column** — 2026 only. **NOT monthly.** | #11 (overheads — must be summed from line items), #19 (drawings, if present as an expense line) |
| **Balance Sheet** | Account rows under Assets / Liabilities / Equity. **Carries 4 comparative years** (2026, 2025, 2024, 2023) | #1, #8 ⚠️ — see 3.3 |
| **Aged Receivables Summary** | Per-customer ageing **by due date**: `Current`, `< 1 Month`, `1 Month`, `2 Months`, `3 Months`, `Older`, `Total` | #9 (debtor days, approx.) — **NOT #14, see 3.4** |
| **Aged Payables Summary** | Per-supplier ageing. **Different shape to Receivables** — no `Current` column, and a nested `Expense Claims` section below the main table | #10 (creditor days, approx.) |

### 3.3 ~~Prior-year revenue from the P&L~~ — NOT AVAILABLE

~~*Profit & Loss (with comparatives) → prior-year revenue (#12)*~~ — **wrong.** The P&L export
has a single year column. Prior-year revenue is **not in this export**. (The *Balance Sheet*
carries four years, which is the reverse of what I assumed.) Either a second P&L for the prior
year is needed, or #12 becomes ADVISOR-entered.

### 3.4 ~~The collection profile from Aged Receivables~~ — NOT DERIVABLE

~~*"Ageing buckets → the current collection profile. This is the single most valuable thing the
file gives us, because it is the model's whole premise."*~~ — **wrong, and worth understanding
why.**

The report ages **by due date**. It says *how overdue the balances outstanding right now are*.
The collection profile the Debtor model needs is a completely different thing: *what proportion
of a given month's sales are collected in-month, one month later, two months later*. That is a
payment **history**, and it is not in this report — a customer who always pays on time and one
who paid 90 days late but has now settled both show as nothing outstanding.

The ageing distribution is a **rough proxy at best**. The real profile needs invoice-level data
(paid dates against invoice dates) — an Aged Receivables *Detail* export or an invoice list.

*(Moot for now: the Debtor model is **Education** — it needs no file at all. This matters only
when a Report-class model needs a real collection profile.)*

### 3.5 ~~Monthly sales from the P&L~~ — NOT AVAILABLE ~~in the standard export~~ — ✅ a specific export fills it (2026-07-15)

The *standard* P&L is annual. The twelve monthly sales figures (#13) are not in it. A
monthly-columns P&L or an income-by-month export would be needed.

**Update 2026-07-15 — that export exists and was verified (§3.9).** Xero's **"Current
financial year by month"** P&L layout carries a column per month (Apr → Mar for an NZ tax
year) plus a Year-to-date column, with income broken out by line item. So #13 is
FILE-seedable — *when the advisor supplies that specific export*, not the standard P&L. Two
caveats:

- **Months after the data cut-off appear as `0`.** In the verified file, a year ending
  31 Mar 2027 had real figures only through July 2026 — every later month reads as a genuine
  zero to a parser. The intake must not present "no data yet" as real zero sales; the last
  populated month is also likely *partial*. The advisor confirms which months are real.
- **It covers the current financial year only** — it does not solve prior-year revenue
  (#12, §3.3), which stays advisor-entered unless a second export is supplied.

### 3.6 ~~Could NOT be verified — the demo org is too sparse~~ — ✅ CLOSED 2026-07-15

Xero's Demo Company balance sheet holds a bank account, GST, a historical adjustment and
current-year earnings — **no Inventory, no Accounts Receivable, no Accounts Payable rows at
all.** So the mapping for **stock on hand (#8)**, and reading debtor/creditor balances off the
balance sheet, **could not be confirmed** from that file.

**CLOSED 2026-07-15 against a populated real-company balance sheet (§3.9).** Accounts
Receivable, Accounts Payable and Inventory rows are all present and readable — #8, #9 and #10
are now verified FILE sources. One finding changes the mapping design: **stock was split
across four differently-named rows** (a main inventory account plus three per-branch stock
accounts), so a fixed row-name lookup under-reads it — see §3.9.

### 3.7 The four files do not share a reporting date

Balance Sheet: *as at 31 March 2026*. Aged Receivables / Payables: *as at 31 July 2026*. P&L:
*year ended 31 March 2026*. Four separate exports = four chances to be out of step. **Intake
must read each file's date, check they align, and warn the advisor when they do not** — mixing
a July debtors position with a March P&L produces ratios that are quietly wrong.

### 3.8 Confirmed: the files are full of names

Aged Receivables lists customers by name (*Basket Case, Ridgeway University, City Limousines…*).
Aged Payables lists suppliers — **and an `Expense Claims` section naming an individual person**.
This confirms §5: the aged reports must be reduced to bucket totals **on ingest, before
storage**.

### 3.9 Populated-export verification — 2026-07-15

> Verified against a real trading company's exports supplied by the owner (**Electric Bikes
> NZ Limited**, lightly pseudonymised at source): a **Balance Sheet** (as at 30 Jun 2026) and
> a **"Current financial year by month" P&L** (year ending 31 Mar 2027). Same storage rule as
> the 2026-07-13 files: they live outside the repo at `c:\Some VS Code\Perf Report\xero reports\`
> and **must not be committed**.

1. **The three missing mappings are confirmed (closes §3.6).** Accounts Receivable
   ($269,625.19), Accounts Payable ($122,638.52) and Inventory are all present as readable
   Balance Sheet rows. #8 / #9 / #10 in §2 are upgraded from ⚠️ to verified.
2. **Stock can be SPLIT across several differently-named rows.** This company carries
   `Inventory (Unleashed)` ($1,511,124.74) **plus three per-branch stock rows** — Hamilton,
   Victoria Park and Wellington "P&A Stock" (~$87.5K together). Account names come from each
   business's own chart of accounts, not a standard; a parser looking for one row literally
   called "Inventory" silently under-reads this company's stock by ~$87K. **This validates
   the hybrid-intake decision:** the file *proposes* candidate rows; the advisor confirms
   which rows count as stock (and as receivables/payables) before the figure is used.
3. **Cached totals exist in real-org exports (nuance to §3.1).** Unlike the demo files, every
   Total row here carries a cached value. Rule unchanged — always sum the line items — but a
   present cached total becomes a cross-check: mismatch → warn the advisor.
4. **Monthly sales are FILE-seedable via the by-month export (updates §3.5).** All 12 monthly
   columns + YTD, income broken out by line item. Future months read as `0` and the latest
   populated month is likely partial — the advisor confirms which months are real.
5. **Comparative columns are NOT guaranteed.** The demo Balance Sheet carried 4 comparative
   years; this real one carries a **single date column**. §3.2's "carries 4 comparative
   years" is a property of *that file*, not of the export type. The parser must handle both.
6. **The date-mismatch rule (§3.7) fires again.** Balance Sheet as at 30 Jun 2026; the P&L's
   year ends 31 Mar 2027. Two files, two periods — the intake's date-alignment warning earns
   its keep on real data.
7. **Account row LABELS are themselves identifying (feeds §5).** Inside the account names:
   bank card number suffixes ("business card -4702", "credit card -9084"), personal names as
   account rows ("Short-term Loan: Mr x", "Equity Mr y" — pseudonymised in this file; real
   exports will carry real names), named lenders, and branch locations. Scrubbing must treat
   **row labels** as identifying content — not just the filename, headers and customer lists.
   The file pair even disagrees on the company's own name (the Balance Sheet shows both the
   real name and the pseudonym; the P&L only the pseudonym) — company names appear in
   multiple places per file.

---

## 4. Intake contract (T10)

1. **Accept** `.xlsx` and `.csv` only. **Reject** `.pdf` with a message naming the export to
   download instead. Rationale: a PDF has no cells — figures are inferred from page layout and
   can be silently misread. In a report shown to a client, a wrong number is worse than an
   extra step.
2. 🔴 **NEVER read a "Total" row. Always sum the line items.** Xero's totals are uncalculated
   formulas that read as zero (§3.1). This rule is not optional and is the first thing to test.
3. **Never silently guess.** If a figure cannot be found, the field is presented to the
   advisor pre-filled with the model default and tagged *entered*, not *from file*.
4. **Every figure carries its provenance** — *from file* or *entered* — and the report shows
   it. An assumption must never be able to pass as a fact while the client is in the room.
5. **Parse each export on its own shape.** Aged Receivables and Aged Payables are *not*
   symmetrical (§3.2): Payables has no `Current` column and nests an `Expense Claims` block.
   A parser that assumes one shape fits both will misread the other.
6. **Check the reporting dates agree** across the dropped files, and warn when they do not
   (§3.7).
7. **Wrong-file handling.** If the dropped file is not a recognised export (wrong report, wrong
   shape, no matching columns), say so plainly and name what was expected. Do not partially
   parse it.
8. **Fail loudly.** Per the Constitution's honesty defaults: no fabricated figure, ever. A
   missing number is a question to the advisor, not a silently-inserted zero.
9. **Where the parsing runs:** the **Restify backend**, not Nuxt. File parsing is business
   logic and the Constitution puts it backend-only. The Nuxt side is upload UI plus a thin
   proxy.

---

## 5. Scrubbing boundary (T13)

> **CORRECTED 2026-07-13.** This section originally assumed that privacy exposure begins when a
> **file is dropped**. That is wrong, and it is the kind of wrong that leaks data. The trigger is
> **the client's real numbers, however they arrive.**
>
> - **Education models** — exempt. Nothing real ever goes in; the numbers are illustrative.
> - **Decision tools** — **NOT exempt**, despite importing no file at all. A client's loan
>   balances, property values and retirement position are typed in by hand and are just as
>   sensitive. Scrubbing applies in full.
> - **Reports** — not exempt. Real numbers, from the accounts.
>
> So the boundary below governs **Decision tools and Reports alike**. Do not read "no upload" as
> "no exposure". See [`MODEL-CLASSIFICATION.md`](MODEL-CLASSIFICATION.md) §1.

The rule: **identity never leaves the app; only numbers travel.**

| Held locally — never sent to the AI | Sent to the AI (anonymised) |
| --- | --- |
| Client / company name | The figures in §2 |
| Contact names, addresses, emails, phone | Derived ratios and model outputs |
| Bank account and tax/ID numbers | Category labels ("overheads", "debtor days") |
| **Individual customer names in Aged Receivables** — verified present (*Basket Case, Ridgeway University, City Limousines…*) | Time periods |
| **Individual supplier names in Aged Payables — and the `Expense Claims` block, which names a real person** (verified) | — |
| **Balance Sheet account row LABELS** — verified 2026-07-15 (§3.9): bank card number suffixes, personal names ("Short-term Loan: …", "Equity …"), named lenders and branch locations appear inside the account names themselves | — |
| Accounting firm branding, logo | — |
| **The uploaded file's own metadata** (filename, author, sheet names — these routinely carry the client's name) | — |

Then: the AI writes the narrative from anonymised numbers only, and the app **re-assembles
the finished report locally**, merging that narrative with the real client name, logo and
branding — which never left. So the output is fully personalised while nothing identifying
was ever transmitted.

**Watch item:** the Aged Receivables export lists *individual customers by name*. That file is
the richest source we have (it gives us the collection profile) and simultaneously the most
identifying. It must be reduced to ageing-bucket totals **on ingest**, before storage — not
just before the AI call.

---

## 6. Open questions for the owner

✅ **RESOLVED — sample export.** Four real Xero exports supplied 2026-07-13 (Demo Company NZ).
§3 is now verified, and three of this document's assumptions were refuted by them.

✅ **RESOLVED — populated export.** Supplied 2026-07-15 (Electric Bikes NZ Limited). Stock,
debtor and creditor mappings verified — with the multi-row stock finding — see §3.9.

✅ **HALF-RESOLVED — the two "missing" exports.** **Monthly sales (#13): resolved as (a)** —
the "Current financial year by month" P&L export carries all 12 monthly columns (verified
2026-07-15, §3.5/§3.9); the advisor supplies that export. **Prior-year revenue (#12): still
open** — a second (prior-year) P&L, or advisor-entered.

Still open:

1. **Prior-year revenue (#12)** — see above: second export, or typed in? *(Report-class-only —
   no built model needs it.)*
2. **The collection profile has no home (§3.4).** If a Report-class model ever needs a true
   collection profile, it needs invoice-level data (paid vs issued dates) — an Aged Receivables
   **Detail** export, not the Summary. Worth confirming whether that export exists in the form
   we'd need.
3. **`initialInvestment` (#1)** — a real figure off the Balance Sheet, or a scenario number the
   advisor chooses?
4. **Owner's drawings (#19)** — actual (from the accounts) or a target (advisor-set)? The
   Margin model treats it as a target to cover.
5. **Stock.** `daysOnHand` assumes the client carries inventory. What should a Report-class
   model do for a service business with no stock?

---

## 7. What this unblocks

**Reminder of scope:** everything here concerns the **Report class only** (9 models, none
built). The three live models are **Education** — they need no intake, no data model and no
scrubbing, and they keep working exactly as they do today.

With §3 now verified, the intake contract (§4) can be built against known file shapes — and
against the one rule that matters most: **compute every total from the line items; never read a
"Total" row.** T13's boundary (§5) is confirmed by the real files, which carry customer,
supplier and personal names exactly as feared.
