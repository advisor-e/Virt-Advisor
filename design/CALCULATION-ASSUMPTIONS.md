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

## 1. Imported stock and foreign currency — Three-Way Forecast

*Checked 2026-09-26. Model: [`server/report/threeWayForecastModel.js`](../server/report/threeWayForecastModel.js),
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

### 1.2 What the forecast does today

All figures are entered in the firm's own currency. **No model converts between currencies.**

| Assumption | Default | Treatment today | Against the standards |
|---|---|---|---|
| Supplier price | — | Entered as a home-currency amount. There is no field for the supplier's currency or an exchange rate. | ⚠ Differs — IAS 21.21 records the foreign amount at a rate. **Changing in 13.5.** |
| Exchange-rate allowance on purchases | 10% | A flat percentage of the **whole** order value, deposit included, charged as a direct cost in the landing month. On the workbook's January order (107,643, 60% deposit) this is **10,764.30**. | ⚠ Differs — an assumed loss, not a rate. It charges exposure on a deposit already paid (IFRIC 22.8). **Replaced in 13.5.** |
| Freight | 12% of stock value | Expensed as a direct cost in the landing month. | ⚠ Differs — IAS 2.10-11 carries freight in the stock's cost, expensed as the stock sells. **Changing in 13.5.** |
| Duty | 5% of stock value | Expensed as a direct cost in the landing month. | ⚠ Differs — as freight. **Changing in 13.5.** |
| Border GST | 15% | Charged on landing and claimed back. Not part of stock cost. | ✅ Consistent — IAS 2.11 excludes recoverable taxes. Base and timing: [`TAX-RULES-IMPORT-GST.md`](TAX-RULES-IMPORT-GST.md). |
| Supplier interest cover | 6% a year on the deferred balance, over its days outstanding (360-day year) | Paid with the balance and **expensed as interest in overheads**, below the gross margin. | ✅ Consistent — IAS 2.18. |
| Exchange-rate allowance on overseas receipts | 10% | A flat percentage taken off each overseas receipt, as a direct cost. | ⚠ Differs — the receivable is a monetary item: an exchange gain or loss arises only between invoice and collection, in profit or loss (IAS 21.21, 21.28). **Replaced in 13.5.** |

### 1.3 What 13.5 changes (ruled by Mike 2026-09-26, not yet built)

- The advisor enters the supplier's invoice **in its own currency** with an **assumed exchange rate**.
- Each payment converts at that rate for the month it is paid, and the converted payments become
  the stock's cost (IAS 21.21, IFRIC 22.8-9).
- A separate exchange gain or loss line appears only for an amount owed after the goods land
  (IAS 21.28).
- Freight and duty join the imported stock's cost and are charged as the stock sells, not in
  full in the landing month (IAS 2.10-11).
- Overseas sales are entered in the customer's currency with an assumed rate. An exchange gain or
  loss arises only on money not yet collected, in profit or loss, not in cost of sales
  (IAS 21.21, 21.28).
- Both 10% allowances stop being a cost. Each becomes a **"what if the rate moves"** setting on
  amounts not yet paid or collected, and its effect is shown rather than charged.

When 13.5 ships, §1.2 is rewritten to match the code. The table above then becomes the disclosure.

### 1.4 Sources

- [IAS 21 *The Effects of Changes in Foreign Exchange Rates*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias21.html)
- [IFRIC 22 *Foreign Currency Transactions and Advance Consideration*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2024/issued/ifric22.html)
- [IAS 2 *Inventories*](https://www.ifrs.org/content/dam/ifrs/publications/html-standards/english/2025/issued/ias2.html)
