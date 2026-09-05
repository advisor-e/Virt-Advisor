# Tax rules — GST on imported goods (New Zealand)

**Why this file exists.** On 2026-09-05 a forecast fix was about to be built from an approved
drawing that described a container landing as three movements — release the deposit, pay the
balance, add the cost to stock — and said nothing about GST. Mike's instruction was
*"research the tax rules rather than guessing"*. This is what the research found, written down
so the next session does not re-derive it, and so a figure in the engine can be traced to a
rule rather than to a recollection.

**Scope.** New Zealand, GST-registered importer, commercial goods. Every statement below is
sourced. Nothing here is advice to a client — it is the rule the forecast engine implements.

---

## 1. Paying an overseas supplier carries no New Zealand GST

A payment to an overseas supplier for goods that are still outside New Zealand is not a New
Zealand taxable supply. A deposit paid before the goods arrive therefore carries no GST, and
there is no input tax to claim at the moment it is paid.

Where a deposit is held such that the supplier cannot use it until some event occurs, the
stakeholder rules apply and the time of supply is not triggered until that event
([IS 10/03, *GST: Time of supply — payments of deposits*](https://www.taxtechnical.ird.govt.nz/-/media/project/ir/tt/pdfs/interpretation-statements/is1003.pdf)).

**What the engine does with it:** nothing. An opening deposit on stock in transit sits as an
asset and attracts no tax until the goods land.

## 2. GST is triggered by the goods ARRIVING, not by paying for them

GST is charged at the border when the goods are imported. This is the load-bearing point and
the one the drawing missed: **a container whose deposit was paid in a previous financial year
still attracts the full border GST in the month it lands.** The trigger is importation.

## 3. What it is charged on

15% of the **Customs value, plus Customs duty (where any is payable), plus freight and
insurance** incurred in bringing the goods to New Zealand
([NZ Customs — Customs duty and GST](https://www.customs.govt.nz/business/import/import-payments/customs-duty-and-gst),
[Duty and GST](https://www.customs.govt.nz/sending-and-receiving/duty-and-gst)).

⚠ **The engine charges it on the goods alone — deposit plus balance — and not on freight or
duty.** Mike's ruling, 2026-09-05, taken with the research in front of him: the approved
drawing carries no field for either, freight on goods already on the water is commonly
prepaid, and duty varies by product. Adding two boxes the drawing does not have would be
inventing. **The intake screen says so in terms**, so nobody reads the figure as a complete
Customs assessment. The understatement is knowable and stated rather than hidden.

## 4. When it is payable

On clearance — or, for an importer with a Customs deferred account, in one monthly payment
**due on the 20th of the following month**, which is between 3 and 7 weeks of deferral
depending on where in the month the goods cleared
([NZ Customs — Deferred accounts for importers](https://www.customs.govt.nz/business/import/deferred-accounts-for-importers)).

**What the engine does with it:** charges it as cash out in the **landing month**. This is the
earlier of the two, and it is the conservative direction for a document a lender reads. A
deferred account would move it up to seven weeks later and improve the forecast; a forecast
that assumed the deferral and did not have it would overstate the bank.

## 5. It comes back

Border GST is an input tax deduction on the return for the period in which the goods were
imported, so it is a **timing cost, not a lost one**
([BR Pub 22/07, *GST — Importers and input tax deductions*](https://www.taxtechnical.ird.govt.nz/-/media/project/ir/tt/pdfs/rulings/public/2022/br-pub-22-07.pdf)).

**What the engine does with it:** the same thing the overseas section built for item 4.64
already does — the payment shows in the landing month and the credit reduces the next return,
so both appear in their real months. Showing both is the point: the cost is the gap between
them, not the tax.

---

## Where this is implemented

- [`server/report/threeWayForecastModel.js`](../server/report/threeWayForecastModel.js) —
  `overseasSchedule`, which computes `borderGst` for shipments created inside the forecast
  (item 4.64) and `transitBorderGst` for stock already paid for at the opening date.
- [`components/ThreeWayForecastIntake.vue`](../components/ThreeWayForecastIntake.vue) — the
  step 2 block that states what the GST figure excludes.

## What this file does NOT cover

Low-value imported goods (the NZ$1,000 threshold and the offshore-supplier registration rules
that go with it), imported services, and any jurisdiction other than New Zealand. The forecast
engine models commercial container imports; if it is ever asked to model any of the above, the
rules are a fresh piece of research, not an extrapolation from this page.
