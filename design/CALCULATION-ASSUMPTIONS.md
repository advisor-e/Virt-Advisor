# Calculation assumptions — for accountants

**Why this file exists.** Mike's instruction, 2026-09-26: keep a note of the accounting standards
behind the app's calculations, *"such that it can be disclosed to accountants in a 'calculation
assumptions' page"*. This file is the source that page will be built from. Each section says what
a model **does today**, the standard that governs it, and where the two differ. A difference is
stated here, never hidden, until the code closes it.

**How it is kept.** Paragraph numbers follow IFRS. The New Zealand (NZ IAS, NZ IFRIC) and
Australian (AASB) equivalents carry the same numbers. Every citation below was read from the
published text on the date shown. Nothing here is advice to a client.

**Lenders read a plain version,** [`CALCULATION-ASSUMPTIONS-FOR-FIRMS.md`](CALCULATION-ASSUMPTIONS-FOR-FIRMS.md),
as the *Notes* page of every Three-Way Forecast (item 44.1 Stage 2). A change to a treatment here
changes that file and the notes' wording in `locales/en.json` in the same commit.

Tax rules are kept in their own files and linked, not repeated:
[`TAX-RULES-IMPORT-GST.md`](TAX-RULES-IMPORT-GST.md).

---

## 0. The Three-Way Forecast as a whole

The report states, on screen and on every printed statement page: *"This is a forecast. Actual
results are likely to differ from it, and the differences may be material."* — FRS-42 para 59.
Wording approved by Mike 2026-09-26 and pinned in
[`threeWayForecastReport.component.test.js`](../tests/unit/threeWayForecastReport.component.test.js).

---

## 1. Imported stock and foreign currency — Three-Way Forecast

*Checked 2026-09-26; treatments rewritten to the built code 2026-09-28. Model: [`server/report/threeWayForecastModel.js`](../server/report/threeWayForecastModel.js),
with the shipment calculator [`server/report/importShipmentModel.js`](../server/report/importShipmentModel.js).
Work item: 13.5.*

### 1.1 What the standards require

| Standard | Para | Requirement |
|---|---|---|
| IAS 21 | 21, 22 | A foreign-currency transaction is recorded at the **spot rate at the date of the transaction** — the date it first qualifies for recognition. |
| IFRIC 22 | 8, 9 | Where consideration is paid **in advance**, the date of the transaction is the date the prepayment is first recognised. **Each advance payment has its own date**, so each locks its own rate. |
| IAS 21 | 16, 23, 28, 29 | An exchange difference arises only on a **monetary item** — an amount still owed — when the rate moves before settlement, and it is recognised **in profit or loss**. Non-monetary items stay at their historical rate. |
| IAS 2 | 10, 11 | The cost of inventory includes the purchase price, **import duties** and **transport and handling**. Taxes recoverable from the tax authority are excluded. |
| IAS 2 | 18 | A **financing element** in deferred settlement terms is recognised **as interest expense** over the financing period, not as inventory cost. |

**What follows for an importer.** Each payment to the supplier converts at the rate on the day it
is paid. On the default supplier terms the deposit (at order) and the balance (order + 91 days)
are both paid before the goods land (order + ~145 days). Both are therefore advance payments, and
the stock's cost is the sum of the two converted payments — no separate exchange gain or loss
arises. A separate exchange gain or loss arises only on an amount still owed after the goods land.
No paragraph permits an exchange difference to be added to the carrying amount of inventory.

### 1.2 What the forecast does

Built in item 13.5 on Mike's rulings of 2026-09-26. The advisor holds up to three currencies in a
**"Currencies you trade in"** table, each with an **assumed exchange rate** quoted as *1 NZD buys
0.6000 USD*. Every foreign amount is entered in its own currency and converted at that rate; an
amount in the firm's own currency is never converted.

| Assumption | Default | Treatment | Against the standards |
|---|---|---|---|
| Supplier price | — | Entered **in the supplier's currency**. Each payment — deposit, balance and interest cover — converts at that currency's assumed rate, and the converted payments are the stock's cost. | ✅ Consistent — IAS 21.21; IFRIC 22.8-9, since both payments fall before the goods land. |
| Exchange rate | Entered by the advisor | **One rate per currency for the whole forecast.** With no movement assumed between payment and settlement, no exchange difference arises, so the "Exchange-rate movement" line is zero and is not shown. | ✅ Consistent — IAS 21.28 recognises a difference only when the rate moves; IAS 1.29-31 omits what is immaterial. |
| Freight | 12% of stock value | **Part of the stock's cost**: paid in the landing month, charged to cost of sales as the stock sells, with any unsold share carried in closing stock. | ✅ Consistent — IAS 2.10-11. |
| Duty | 5% of stock value | As freight. | ✅ Consistent — IAS 2.10-11. |
| Border GST | 15% | Charged on landing on the stock's cost with freight and duty, and claimed back. Not part of stock cost. | ✅ Consistent — IAS 2.11 excludes recoverable taxes. Base and timing: [`TAX-RULES-IMPORT-GST.md`](TAX-RULES-IMPORT-GST.md). |
| Supplier interest cover | 6% a year on the deferred balance, over its days outstanding (360-day year) | Paid with the balance and **expensed as interest in overheads**, below the gross margin. | ✅ Consistent — IAS 2.18. |
| Overseas sales | — | Entered **in the customer's currency** and converted at its assumed rate; collected in full at that rate. | ✅ Consistent — IAS 21.21, 21.28, on one assumed rate. |
| Balance still owed on stock at sea when the forecast opens | — | Entered in the supplier's currency and converted when the goods land. The deposits already paid stay at what was paid. | ✅ Consistent — IAS 21.23 for the amount owed; IFRIC 22.8 for the deposits. |
| What if the exchange rate moves | 10% each way | **Shown, never charged.** The forecast is run again with every rate on one side moved together — the NZ dollar falling for stock, rising for overseas receipts — and step 4 shows the extra paid or the less received within the forecast's years, with the lowest bank balance with and without the move. | ✅ Discloses the exchange rates as significant assumptions, with the effect of a change — FRS-42 paras 51, 55, 58. |

A forecast saved before 13.5 carries no currencies: it opens in the firm's own currency and nothing
converts.

### 1.3 Sources

- [IAS 21 *The Effects of Changes in Foreign Exchange Rates*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias21.html)
- [IFRIC 22 *Foreign Currency Transactions and Advance Consideration*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ifric22.html)
- [IAS 2 *Inventories*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias2.html)
- [IAS 1 *Presentation of Financial Statements*](https://www.xrb.govt.nz/dmsdocument/2801/)
- [FRS-42 *Prospective Financial Statements*](https://standards.xrb.govt.nz/standards-navigator/frs-42/). It governs
  *general purpose* forecasts; a forecast prepared for one lender is usually special purpose, so it
  is applied here as best practice, not as a legal requirement.

---

## 2. Everything else in the Three-Way Forecast

*Checked 2026-09-30 against the built code (item 44.1, Stage 1). Model:
[`server/report/threeWayForecastModel.js`](../server/report/threeWayForecastModel.js). No code was
changed by this review; each ⚠ below is a departure put to Mike one at a time, and ends as a fix or
a filed item on his word.*

**What the verdicts mean.** ✅ the treatment is what the standard asks for. ⚠ it departs from the
standard — stated so an accountant reading the forecast knows. ℹ a simplification or an assumption
the standard leaves to judgement, disclosed rather than wrong.

**Which standard applies is itself an assumption.** Most small New Zealand companies are not
required to prepare general purpose financial statements and report on a special-purpose, tax basis.
This section measures the forecast against full IFRS (NZ IFRS) because that is the strictest reading
a lender or accountant can bring to it; a ⚠ is therefore a *difference to disclose*, and only
sometimes an error to fix.

**Every paragraph cited in this section was read from the published text on 2026-09-30:** IAS 1.32,
69, 71; IAS 2.9, 21, 22, 34; IAS 7.10, 16-18, 31, 33, 35; IAS 12.15, 24, 34; IAS 16.50, 51, 55,
60-62, 68, 71; IFRS 9 4.2.1, 5.5.1, 5.5.15; IFRS 15.31, 38; IFRS 16.5, 6, 22; IFRS 18.53, 54,
60, 61, 69.

### 2.1 Revenue and debtors

| Assumption | Default | Treatment | Against the standards |
|---|---|---|---|
| Domestic sales | Entered monthly, ex GST | Revenue in the month entered; GST added on top and collected with it. | ✅ IFRS 15.31, 38 — at a point in time, on the assumption goods are delivered in the month sold. |
| Imported stock sold at home | The sell-down ladder | Revenue in the month each slice sells, at the price its age still commands. | ✅ IFRS 15.31. |
| **Overseas sales** | Delivered 2 months after invoice | Revenue is booked in the **invoice** month; collection is counted from **delivery**. | ⚠ **IFRS 15.31, 38** — revenue follows the transfer of control, and physical possession is one of its indicators. On the default lag, revenue is recognised two months before the customer has the goods. Correct only where the terms pass control at shipment. |
| **Debtor collection** | 10 / 55 / 30 / 5% over the month and the next three | Sales are collected on the profile. Whatever a profile, domestic or overseas, leaves uncollected is the **bad debt**: charged as an expense before GST in the month of the sale, taken off debtors with its GST, and its GST taken off the GST owed. A profile totalling 100% charges nothing. | ✅ **IFRS 9 5.5.1, 5.5.15** — the expected loss is recognised when the receivable is. **Fixed 2026-10-01 (item 44.3, Mike's design of 2026-09-30)**; until then an overseas shortfall sat in debtors for ever. ℹ GST bad-debt relief is taken in the month of sale, not when the debt is formally written off — a timing simplification. ⚠ The screen still refuses a domestic profile under 100%, until its wording is approved. Pinned by `threeWayForecastStandards.test.js`. |
| Opening debtors | From the opening balance sheet | Collected in full over the first four months, in the proportions of the profile; all in month 1 when customers pay in the month of sale. No bad debt is charged on them. | ℹ A timing assumption; no standard governs it. **Fixed 2026-09-30**: a same-month profile collected none of them, for all three years. |
| Other income | Annual figure | Spread evenly over twelve months. | ℹ A timing assumption. |

### 2.2 Inventory and cost of sales

| Assumption | Default | Treatment | Against the standards |
|---|---|---|---|
| Local cost of sales | Mark-up 68% | Cost of sales is local sales ÷ (1 + mark-up); closing stock is what remains of opening stock plus purchases. | ✅ IAS 2.21-22 permit a retail-style method **if the result approximates cost**. ℹ Closing stock is a result, not a count; the report names it when it turns negative. |
| Imported stock | — | Its real cost, freight and duty included, charged as each slice sells. | ✅ IAS 2.10-11, 34 (§1). |
| Lower of cost and net realisable value | Lowest price on the ladder is a 122% mark-up | No write-down test. | ℹ IAS 2.9. At the default prices stock never sells below cost, so none is needed; a manager who lowers the ladder below cost gets the loss in the month of sale rather than when it became apparent. |
| Direct costs | Freight 3%, commissions 10%, other 1% and 2% of revenue | Charged in cost of sales in the month of the revenue. | ✅ A presentation choice. |

### 2.3 Fixed assets

| Assumption | Default | Treatment | Against the standards |
|---|---|---|---|
| Depreciation rate | 20% to 35% by category | Diminishing value at the rate entered, one-twelfth a month. | ✅ IAS 16.62 permits diminishing balance. ℹ **IAS 16.50, 60** — the rate must reflect each asset's useful life and how it is used up. The rate is the advisor's own; the defaults are tax-style rates, right where they approximate that and a difference to disclose where they do not. |
| When it starts | — | A full month's charge in the month of purchase, on the month's closing register. | ✅ IAS 16.55, to the month. |
| Residual value | None | Depreciated towards nil. | ℹ IAS 16.51 — a residual value is an estimate the forecast does not ask for. |
| Sales | Price = book value unless entered | Book value leaves the register; the price is banked with its GST; the difference is a gain or loss in other income in the month of sale. | ✅ IAS 16.68, 71 — and never shown as revenue. |
| Revaluations | — | None. The opening "capital gain" line is carried unchanged. | ℹ Cost model throughout. |

### 2.4 Borrowing

| Assumption | Default | Treatment | Against the standards |
|---|---|---|---|
| Term loan interest | Rate per loan | On the opening balance each month; the repayment covers interest first, the rest reduces the loan. | ✅ Amortised cost at the loan's own rate (IFRS 9 4.2.1) where there are no fees. ℹ Arrangement fees are not modelled. |
| Where term loans sit | — | What falls due within twelve months — each loan rolled forward on its own terms, with any lump sum the year names — is a current liability, *Term loans due within 12 months* (wording approved by Mike 2026-09-30); the rest stays non-current under the lender's name. | ✅ IAS 1.69, 71. **Fixed 2026-09-30**; until then the whole loan sat under non-current and working capital was overstated by the next year's repayments. Pinned by `threeWayForecastStandards.test.js`. |
| Facilities | — | Current liabilities; interest on the balance; no scheduled repayment. | ✅ IAS 1.69 — repayable on demand. |
| Overdraft and credit interest | 7% and 2% | On the opening bank balance each month. | ✅ |
| Interest in the profit and loss | — | Every interest charge — overdraft, term loans, facilities, a supplier's charge for waiting, interest on overdue tax — under *Financing costs*, below the operating surplus and *Surplus before financing and tax*. Interest earned sits between the two. | ✅ IFRS 18.53-54, 60, 61, 69. **Fixed 2026-09-30 (item 44.2)**; until then all interest sat inside overheads, and a supplier's interest had no row of its own. Layout approved by Mike: [`three-way-forecast-ifrs-layout.html`](mockups/three-way-forecast-ifrs-layout.html). |
| Borrowing costs on assets being built | — | Always expensed. | ℹ IAS 23 capitalises them only for an asset that takes a substantial time to get ready. The forecast does not model one. |

### 2.5 Income tax

| Assumption | Default | Treatment | Against the standards |
|---|---|---|---|
| Current tax | 28% | Each month's profit before tax × the rate; a loss joins a pool that relieves later profit. | ℹ Taxable profit is taken to equal accounting profit — no non-deductible expenses, no tax depreciation. |
| **Deferred tax** | — | None. | ⚠ **IAS 12.15, 24, 34** — temporary differences (for example, accounting depreciation against tax depreciation) and unused losses carry deferred tax. The forecast recognises none, including no asset for its own loss pool. |
| Payments and refunds | Entered | Settle the tax balance in the months entered. | ✅ |

### 2.6 Shareholder current accounts

| Assumption | Default | Treatment | Against the standards |
|---|---|---|---|
| Interest | 5% | Charged only on an overdrawn account, as income to the company. | ✅ |
| How the balances show | — | Gross: what shareholders owe the company is a current asset, what the company owes them a current liability. | ✅ IAS 1.32. **Fixed 2026-09-30**; until then all four were netted into one figure — on the sample, a 14,000 asset in place of 57,000 owed each way against 43,000. Pinned by `threeWayForecastStandards.test.js`. |

### 2.7 Overheads, accruals and leases

| Assumption | Default | Treatment | Against the standards |
|---|---|---|---|
| Overheads | Annual figures | One-twelfth each month, paid the same or the following month by type. | ✅ Accrual basis. |
| Paying suppliers | 0 / 90 / 10% over the month and the next two | Stock bought is paid on the profile, which must total 100%; the opening balance owed is paid over the first four months, or all in month 1 when suppliers are paid in the month they bill. | ℹ A timing assumption. **Fixed 2026-09-30**: a same-month profile paid none of the opening balance. |
| ACC levies and insurance | Paid in the months entered | Expensed evenly; the difference sits in prepayments or accruals. | ✅ |
| **Rent** | Annual figure | Expensed as paid. | ⚠ **IFRS 16.22** — a lessee recognises a right-of-use asset and a lease liability, unless the lease is short-term or of a low-value asset (IFRS 16.5-6). Most premises leases are neither. |
| Holiday pay and other employee entitlements | — | Not accrued; wages are expensed as paid. | ℹ Not modelled. |
| Provisions | — | None. | ℹ IAS 37; the forecast models none. |

### 2.8 Presentation

| Assumption | Treatment | Against the standards |
|---|---|---|
| Cash flow | Receipts and payments by type, gross (the direct method), grouped into operating, investing and financing with a subtotal each. Interest paid is financing and interest received investing; tax is operating. | ✅ IAS 7.10, 16, 17, 18, 31-33, 35. **Fixed 2026-09-30 (item 44.2)**; until then it was one list of receipts and payments. |
| Balance sheet | Current and non-current, with a working-capital line. | ✅ Including term loans (2.4) and shareholder accounts (2.6) since 2026-09-30. |
| GST | Outputs less inputs, settled on the filing cycle; never revenue or cost. | ✅ Revenue excludes amounts collected for others. Timing and basis: [`TAX-RULES-IMPORT-GST.md`](TAX-RULES-IMPORT-GST.md). |

### 2.9 The count

| | |
|---|---|
| Treatments recorded before 44.1 | **9** (§1, currency) |
| Treatments recorded now | **44** (§1's 9 and §2's 35) |
| Departures found | **9** |
| Fixed | **5** — term loans' current portion, shareholder accounts gross (44.1); cash flow by activity and interest in financing (44.2), all 2026-09-30; bad debts (44.3), 2026-10-01 |
| Re-read as a disclosure, not a departure | **1** — depreciation rates, which are the advisor's own |
| Still open | **3**, on the live list as 44.3: deferred tax, leases and overseas shipping terms need facts the forecast does not yet ask for |

### 2.10 Sources

- [IAS 2 *Inventories*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias2.html)
- [IAS 7 *Statement of Cash Flows*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias7.html)
- [IAS 12 *Income Taxes*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias12.html)
- [IAS 16 *Property, Plant and Equipment*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias16.html)
- [IAS 1 *Presentation of Financial Statements*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ias1.html)
- [NZ IFRS 9 *Financial Instruments*](https://standards.xrb.govt.nz/standards-navigator/nz-ifrs-9/)
- [NZ IAS 1 *Presentation of Financial Statements*](https://standards.xrb.govt.nz/standards-navigator/nz-ias-1/), for paragraphs 69 and 71
- [IFRS 15 *Revenue from Contracts with Customers*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ifrs15.html)
- [IFRS 16 *Leases*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ifrs16.html)
- [IFRS 18 *Presentation and Disclosure in Financial Statements*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ifrs18.html)
