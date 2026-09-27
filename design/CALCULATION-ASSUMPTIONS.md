# Calculation assumptions — for accountants

**Why this file exists.** Mike's instruction, 2026-09-26: keep a note of the accounting standards
behind the app's calculations, *"such that it can be disclosed to accountants in a 'calculation
assumptions' page"*. This file is the source that page will be built from. Each section says what
a model **does today**, the standard that governs it, and where the two differ. A difference is
stated here, never hidden, until the code closes it.

**How it is kept.** Paragraph numbers follow IFRS. The New Zealand (NZ IAS, NZ IFRIC) and
Australian (AASB) equivalents carry the same numbers. Every citation below was read from the
published text on the date shown. Nothing here is advice to a client.

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
