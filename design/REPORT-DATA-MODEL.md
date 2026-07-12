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
> The *figure inventory* in §2 is **fact** — read straight out of the model code. The *Xero
> source* column in §2–§3 is **partly unverified**: no sample Xero export was available, so rows
> marked ⚠️ are my best reading of what Xero produces and must be checked against a real export
> before anything is built. Those rows now describe how a *Report-class* model would be fed —
> they are **not** a plan to retrofit intake onto the Education models.

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
| 8 | `daysOnHand` (Q23) | 6 | FILE ⚠️ | Days inventory on hand — derivable from Balance Sheet stock ÷ COGS × 365, if the client carries stock |
| 9 | `daysReceivable` (D22) | 35 | FILE ⚠️ | Debtor days (DSO) — from Aged Receivables, or Receivables ÷ Revenue × 365 |
| 10 | `daysPayable` (Q13) | 15 | FILE ⚠️ | Creditor days (DPO) — from Aged Payables, or Payables ÷ COGS × 365 |
| 11 | `fixedCostsMonthly` (D17) | 180 | FILE ⚠️ | Monthly overheads — P&L operating expenses ÷ months in the period |
| 12 | `priorScenarioAnnualRevenue` (V35) | 2543 | FILE ⚠️ | Prior-year revenue — P&L, comparative column |

**6 of 12 must be advisor-entered.**

### 2.2 Debtor Business Drag (`server/report/debtorDragModel.js`)

| # | Input | Default | Source | Where it comes from |
| --- | --- | --- | --- | --- |
| 13 | `monthlySales[12]` | 100000 … 324000 | FILE ⚠️ | Twelve monthly sales figures. Xero's income-by-month / Business Performance export, or a P&L run monthly |
| 14 | `scenarioA` — the **current** collection profile (`sameMonth`, `month1`, `month2`, `month3`, `month4`, `writeOff`) | .85 / .07 / .05 / 0 / 0 / .03 | FILE ⚠️ | Derivable from the **Aged Receivables** ageing buckets — what proportion is collected in-month, 1 month late, 2 months late… This is the single most valuable thing the file gives us, because it is the model's whole premise |
| 15 | `scenarioB` — the **alternative** collection profile (same six parts) | .72 / .15 / .10 / 0 / 0 / .03 | ADVISOR | This is the what-if the advisor is exploring. It must never be auto-filled — it is the question being asked, not a fact |

**Note:** the fractions in a profile should sum to 1. The model already normalises defensively
(a short or malformed profile cannot produce `NaN` — hardened in `4f91a66`), but the intake
should warn the advisor when a profile does not add up, rather than silently rebalancing it.

### 2.3 Margin · Mark-up · Break-even (`server/report/marginBreakevenModel.js`)

| # | Input | Default | Source | Where it comes from |
| --- | --- | --- | --- | --- |
| 16 | `price` | 250 | ADVISOR | Unit sale price — a product fact |
| 17 | `cost` | 82.50 | ADVISOR | Unit cost — a product fact |
| 18 | `overheads` (`oh`) | 11 500 | FILE ⚠️ | Monthly overheads — P&L operating expenses |
| 19 | `ownerDrawings` (`draw`) | 8 600 | FILE ⚠️ | Owner's salary / drawings — P&L or the owner's current account. May be a deliberate *target* rather than actual, in which case ADVISOR |
| 20 | `priceChangePct` (`wif`) | 0 | ADVISOR | The what-if being explored. Never auto-filled |

**3 of 5 must be advisor-entered.**

---

## 3. What we need from Xero

Working assumption — **to be confirmed against a real export**:

| Export | Gives us | Feeds |
| --- | --- | --- |
| **Profit & Loss** (with comparatives) | Revenue, prior-year revenue, operating expenses, owner's drawings | #11, #12, #18, #19 |
| **Aged Receivables Summary** | Ageing buckets → the current collection profile; debtor days | #9, #14 |
| **Aged Payables Summary** | Creditor days | #10 |
| **Income by month** (or a monthly P&L) | The twelve monthly sales figures | #13 |
| **Balance Sheet** | Stock on hand, capital employed | #8, possibly #1 |

**Open question for the owner:** that is up to five separate exports. Asking an advisor to
download five files is friction that undermines the "effortless" promise. Options: accept
whatever subset is dropped and ask for the rest on-screen (consistent with the hybrid
decision); or identify a single richer Xero export that carries most of it. **I could not
verify this without a sample export.**

---

## 4. Intake contract (T10)

1. **Accept** `.xlsx` and `.csv` only. **Reject** `.pdf` with a message naming the export to
   download instead. Rationale: a PDF has no cells — figures are inferred from page layout and
   can be silently misread. In a report shown to a client, a wrong number is worse than an
   extra step.
2. **Never silently guess.** If a figure cannot be found, the field is presented to the
   advisor pre-filled with the model default and tagged *entered*, not *from file*.
3. **Every figure carries its provenance** — *from file* or *entered* — and the report shows
   it. An assumption must never be able to pass as a fact while the client is in the room.
4. **Wrong-file handling.** If the dropped file is not a recognised export (wrong report, wrong
   shape, no matching columns), say so plainly and name what was expected. Do not partially
   parse it.
5. **Fail loudly.** Per the Constitution's honesty defaults: no fabricated figure, ever. A
   missing number is a question to the advisor, not a silently-inserted zero.
6. **Where the parsing runs:** the **Restify backend**, not Nuxt. File parsing is business
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
| Individual customer names in the Aged Receivables | Time periods |
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

1. **Sample export.** Can you drop a Xero export (a dummy client is fine — only the layout
   matters)? Every ⚠️ above becomes fact instead of assumption, and §3's "how many files"
   question resolves.
2. **Five files is a lot.** Is the advisor willing to drop several exports, or should we take
   whatever they give and ask for the rest on-screen?
3. **`initialInvestment` (#1)** — is that a real figure off the Balance Sheet, or a scenario
   number the advisor chooses? It changes whether the Working Capital Cycle report can be
   seeded at all.
4. **Owner's drawings (#19)** — actual (from the accounts) or a target (advisor-set)? The
   Margin model treats it as a target to cover.
5. **Stock.** `daysOnHand` assumes the client carries inventory. What should the Working
   Capital Cycle report do for a service business with no stock?

---

## 7. What this unblocks

With §2 agreed and the ⚠️ rows verified, T3 is done and T10 (intake UX) and T13 (scrubbing)
can be specified concretely. Nothing here changes the live app; the three report models keep
working exactly as they do today, on their defaults, until intake is built.
