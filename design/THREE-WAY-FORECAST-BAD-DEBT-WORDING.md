# Three-Way Forecast — bad debts: the wording for approval

Item 44.3, the bad-debt slice. The calculation is built (Mike's design of 2026-09-30: the
shortfall in a collection profile is the bad debt, domestic and overseas alike — charged in the
month of the sale, before GST, taken off debtors with its GST, its GST taken off the GST owed).
Basis: [`CALCULATION-ASSUMPTIONS.md`](CALCULATION-ASSUMPTIONS.md) §2.1.

What is still missing is on the screen, and every word of it is put to Mike here. `{total}`,
`{gap}`, `{local}` and `{overseas}` are filled in by the app, as percentages.

## 1. The profit and loss

| # | Where | Proposed wording | Why |
|---|---|---|---|
| 1 | A line of its own in the itemised profit and loss, among the overheads, directly above *Depreciation*. Shown only when it carries a figure, as the supplier-interest line is. | **Bad debts** | The charge is already inside *Overheads*; without its own line the lines above that total no longer add up to it. IFRS 18 also asks for credit losses to be shown separately. The summary view keeps its one *Overheads* line. |

## 2. Step 3 — the two collection profiles

A local profile under 100% will **no longer stop the forecast being built**. Over 100% is still
refused, with today's sentence unchanged.

| # | Where | Today | Proposed wording |
|---|---|---|---|
| 2 | *When customers pay*, when the profile totals less than 100% | These come to {total}. The missing {gap} is money you invoice and never collect — put it in one of the months above. | **These come to {total}. The missing {gap} is money you invoice and never collect, so the forecast charges it as a bad debt in the month of the sale. If you expect to collect it, put it in one of the months above.** |
| 3 | *Then they pay* (overseas), when the profile totals less than 100% | These must add to 100% — they come to {total} | **The same sentence as 2.** |

## 3. Notes to the forecast

The Notes are built from the approved drawing,
[`mockups/three-way-forecast-notes.html`](mockups/three-way-forecast-notes.html). On approval the
drawing takes the same sentences, so the two never disagree. **A forecast whose profiles both
total 100% keeps today's sentences, unchanged.**

| # | Where | Today | Proposed wording |
|---|---|---|---|
| 4 | *Revenue and debtors*, when a profile falls short. The first sentence has three forms; the second is always the same. | Local sales are collected in full; {gap} of overseas sales is assumed never to be collected — see difference 1 below. | **{local} of local sales is never collected.** — or — **{overseas} of overseas sales is never collected.** — or, both short — **{local} of local sales and {overseas} of overseas sales are never collected.** Then: **That share is charged as a bad debt in the month of the sale, before GST, and taken off what customers owe; the GST on it comes off the GST owed. See difference 1 below.** |
| 5 | *Where this forecast differs from full IFRS*, difference 1, when a profile falls short | Bad debts (IFRS 9 5.5.1, 5.5.15). No allowance is made for expected credit losses. Local sales are assumed to be collected in full; the {gap} of overseas sales not collected stays in what customers owe and is not charged as an expense. | **Bad debts (IFRS 9 5.5.1, 5.5.15). The only allowance made is the share of sales the collection profile never collects. Debtors owed at the start are assumed to be collected in full, and the GST on a bad debt is recovered in the month of the sale rather than when the debt is written off.** |

The sentence in today's column of row 5 is **wrong since 2026-10-01**: the shortfall is now charged
as an expense. It stays on screen only until this is approved and built.

## 4. The firm-facing copy

[`CALCULATION-ASSUMPTIONS-FOR-FIRMS.md`](CALCULATION-ASSUMPTIONS-FOR-FIRMS.md) repeats the Notes'
sentences (lines 50 and 110). It takes sentences 4 and 5 where a shortfall is described, and keeps
today's sentences for the default profile.

**Status:** ⏳ awaiting Mike's approval.
