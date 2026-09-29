# Calculation assumptions — the version firms read

**What this file is.** The firm-facing version of
[`CALCULATION-ASSUMPTIONS.md`](CALCULATION-ASSUMPTIONS.md) §0-§2, written for firm managers and a
client's accountant or lender rather than for developers. Item 44.1 Stage 2 (Mike's ruling
2026-09-30): it reaches firms as a **Compliance item the mentor publishes** — no page of its own.

**It is a second copy, so it is kept in step by hand.** When a treatment in the record changes, this
file changes in the same commit, and the mentor republishes the item (the Compliance tab versions
it and tells every firm it is new).

**How to publish it.** Mentor Hub → Compliance → publish an item. Paste the three parts below
exactly. The Compliance tab shows the body as plain text, which is why it has no tables or bold.

**Status:** wording approved by Mike 2026-09-30, as committed in `1248c251`. Published to firms: not yet — the mentor publishes it.

---

## TITLE

Three-Way Forecast — calculation assumptions and accounting standards

## SUMMARY

How the Three-Way Forecast works out each figure, the accounting standard behind each treatment, and the six places it still differs from full NZ IFRS. For firm managers, and to share with a client's accountant or lender.

## BODY (paste everything between the two lines)

---

This explains how the Three-Way Forecast works out its figures, which accounting standard governs each treatment, and where the forecast differs from full NZ IFRS. Share it with a client's accountant or lender when they ask how a forecast was built.

A FORECAST, NOT A SET OF ACCOUNTS
Every Three-Way Forecast states, on screen and on each printed statement: "This is a forecast. Actual results are likely to differ from it, and the differences may be material." (FRS-42 para 59.)

WHICH STANDARDS
Most small New Zealand companies are not required to prepare general purpose financial statements and report on a special-purpose, tax basis. This page measures the forecast against full NZ IFRS because that is the strictest reading an accountant or lender can bring to it. A difference listed at the end is something to bear in mind, not necessarily an error.
Paragraph numbers follow IFRS; NZ IFRS and the Australian standards (AASB) use the same numbers. FRS-42, Prospective Financial Statements, is applied as best practice: it governs general purpose forecasts, and a forecast prepared for one lender is usually special purpose.
Nothing on this page is advice to a client.

1. REVENUE AND DEBTORS
- Local sales are recognised in the month entered, excluding GST, on the basis that the goods are delivered that month (IFRS 15.31, 38).
- Imported stock sold locally is recognised in the month each part sells, at the price its age still commands (IFRS 15.31).
- Overseas sales are recognised in the month invoiced; the cash is collected on its own profile, counted from delivery. See difference 6 below.
- Customers pay on the collection profile entered — by default 10% in the month of sale, then 55%, 30% and 5% over the next three months. Every sale is assumed to be collected in full; see difference 3 below.
- Debtors owed at the start are collected over the first four months, in the proportions of the same profile.
- Other income entered as a yearly figure is spread evenly across the year.

2. STOCK AND COST OF SALES
- Local cost of sales is local sales divided by (1 + the mark-up entered). Closing stock is opening stock plus purchases, less cost of sales. This is a retail-style method, which IAS 2.21-22 permit when the result approximates cost. Closing stock is therefore a calculated figure, not a count, and the report says so if it falls below zero.
- Imported stock is carried at what it really cost: the supplier's price converted at the exchange rate, plus freight and duty (IAS 2.10-11). It is charged to cost of sales as each part sells (IAS 2.34), and whatever has not sold stays in closing stock.
- GST paid at the border is claimed back, so it is not part of the stock's cost (IAS 2.11).
- Stock is not tested for falling below cost (IAS 2.9). At the default prices imported stock always sells above cost; if lower prices are set, any loss shows when the stock sells.
- Direct costs set as a percentage of revenue — freight, commissions and other direct costs — are charged in cost of sales in the month of the revenue.

3. FOREIGN CURRENCY
- Up to three currencies, each at one assumed exchange rate for the whole forecast, quoted as what 1 NZD buys.
- Every payment to an overseas supplier — deposit, balance and any interest — converts at that rate. Payments made before the goods land are the stock's cost, so no exchange gain or loss arises (IAS 21.21-23; IFRIC 22.8-9).
- Overseas sales convert at their currency's rate and are collected in full at that rate.
- A balance still owed on stock at sea when the forecast starts converts when the goods land; deposits already paid stay at what was paid.
- Interest a supplier charges for waiting to be paid is an interest expense, not part of the stock's cost (IAS 2.18).
- What a change in exchange rates would do is shown, never charged: the forecast is run again with every rate on one side moved (by 10% by default), and the extra paid or the less received is shown beside it, with the lowest bank balance with and without the move (FRS-42 paras 51, 55, 58).

4. FIXED ASSETS
- Six categories, each depreciated on a diminishing-value basis at the rate entered, one-twelfth each month (IAS 16.62).
- A full month's depreciation is charged in the month an asset is bought (IAS 16.55). No residual value is assumed.
- The rates are the advisor's. The defaults, 20% to 35%, are tax-style rates. IAS 16.50 and 60 require a rate that reflects each asset's useful life and how it is used up; where tax rates do not, the difference should be disclosed.
- When an asset is sold, its book value leaves the register, the sale price is banked with its GST, and any gain or loss is shown as other income in the month of sale — never as revenue (IAS 16.68, 71).
- Assets are not revalued; they stay at cost less depreciation.

5. BORROWING
- Term loans: interest each month on the opening balance at the loan's rate. The repayment covers the interest first and the rest reduces the loan — amortised cost (IFRS 9 4.2.1). Arrangement fees are not modelled.
- On the balance sheet, repayments due within the next 12 months show as a current liability, "Term loans due within 12 months", and the rest as non-current under each lender's name (IAS 1.69, 71).
- Facilities — revolving trade, stock or invoice finance — are current liabilities, with interest on the balance and no scheduled repayment (IAS 1.69).
- Overdraft interest, and interest earned on a credit balance, are worked on the opening bank balance each month.
- Borrowing costs are always expensed. IAS 23 would add them to an asset that takes a substantial time to build; the forecast does not model one.

6. INCOME TAX
- Each month's profit before tax multiplied by the tax rate, 28% by default. A loss joins a pool that reduces the tax on later profits.
- Taxable profit is taken to equal accounting profit: no non-deductible expenses and no separate tax depreciation.
- No deferred tax is recognised; see difference 4 below.
- Tax payments and refunds fall in the months entered.

7. SHAREHOLDER CURRENT ACCOUNTS
- Interest, 5% by default, is charged only on an overdrawn account, as income to the company.
- Shown gross: what shareholders owe the company is a current asset, and what the company owes them is a current liability. The two are never netted (IAS 1.32).

8. OVERHEADS AND ACCRUALS
- Overheads entered as yearly figures are expensed evenly, one-twelfth a month, and paid in the same or the following month depending on the type.
- ACC levies and insurance are expensed evenly and paid in the months entered; the difference sits in prepayments or accrued expenses.
- Holiday pay and other employee entitlements are not accrued; wages are expensed as paid.
- No provisions are modelled (IAS 37).

9. GST
- GST is never revenue or cost. Output tax less input tax is settled on the filing cycle and the invoice or payments basis chosen. GST on imported goods is charged when they land and claimed on the next return.

10. HOW THE STATEMENTS ARE SET OUT
- Balance sheet: current and non-current, with working capital.
- Cash flow: receipts and payments shown gross — the direct method (IAS 7.18). See difference 1 below.

WHERE THIS FORECAST STILL DIFFERS FROM FULL NZ IFRS
Six differences remain. Each is on our list to address; until then, bear them in mind when reading a forecast.
1. Cash flow grouping (IAS 7.10). Cash flows are not grouped into operating, investing and financing activities.
2. Interest (IFRS 18.60, for periods beginning on or after 1 January 2027). Interest sits inside operating overheads; from 2027 it belongs in a financing section below operating profit. Profit after tax is the same either way.
3. Bad debts (IFRS 9 5.5.1, 5.5.15). No allowance is made for expected credit losses; every sale is assumed to be collected.
4. Deferred tax (IAS 12.15, 24, 34). None is recognised, including no asset for tax losses carried forward.
5. Leases (IFRS 16.22). Rent is expensed as paid. Under IFRS 16 most leases — other than short-term leases and leases of low-value assets (IFRS 16.5-6) — put a right-of-use asset and a lease liability on the balance sheet.
6. Overseas revenue timing (IFRS 15.31, 38). Overseas sales are recognised in the month invoiced. That is right where control passes at shipment, as under FOB or CIF terms; where goods are sold delivered to the customer, the revenue belongs in the month of delivery.

Reviewed September 2026. Every paragraph cited was checked against the published text of the standard.

---
