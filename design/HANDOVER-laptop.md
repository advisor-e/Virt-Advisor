# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-04 · Laptop · branch `feat/advisor-progress`

Suite **7,700 green** (399 suites), lint 0 errors, everything committed and pushed.
Started 21 ahead / 0 behind; **merged `master` twice** (13 commits, then 9).

### Built — 4.64, buying and selling overseas. Drawn, approved and built in one day.

Step 3 gains a whole section behind one tick: imported stock with its terms, the sell-down
price ladder, overseas sales with their own delivery lag, collection profile, zero-rating
and FX allowance, and their own mark-up. The cash flow grows **five rows of its own** —
deposits, freight, duty, border GST, supplier balance — visible on the report screen.

**Item 4.63 was absorbed into 4.64 as slice 2** on Mike's instruction. Not built.

### Four things worth more than the item

**The guard went first and it is why this was safe.** Tick off, series empty → all 3,385
year-one golden cells unmoved and the three statements byte-identical, written and passing
*before* the feature existed. It also pins the input shape as a test rather than a note.

**The balance sheet broke, and a test caught it — not an eyeball.** A deposit paid before
the goods land had nowhere to sit. It is a **prepayment**; a landed-but-unpaid container is
a **liability**. Both are new balance-sheet lines. 🔴 **Any addition that moves cash and
stock in different months needs the same check.**

**The approved drawing contradicted itself, and the DRAWING was corrected.** Its "Ready to
sell after it lands" control said *Same month* while its own revenue table, tiles and
printed working all had the container first selling the month after. Found only by opening
the drawing beside the code, which is the third time that ritual has paid.

**A gap named honestly came back the same day.** The engine computed the five cash rows
correctly, and the report screen showed one "Money out" total — the exact concealment Mike
had objected to. Saying so plainly rather than glossing it got a "yes" and it shipped.

### Next

**The mentor Model Inputs tab for the price ladder** (figures are in
`data/forecast-sell-down.json`, shown but not editable), then **slice 2** — the Import &
Retail shipment calculator. Both of slice 2's rulings are already taken.

### 🖥 DESKTOP — read this before you touch the forecast

🔴 **Your slice 2 has four screens left and your own note puts the FORECAST last. We
rewrote it today.** `ThreeWayForecastReport.vue` gained `hasOverseasTrade`,
`overseasCashRows`, a rebuilt `cashRows`, an `is-sub` row style and five locale keys.
`ThreeWayForecastIntake.vue` gained a large step-3 section, `overseasInputs()`, eight
computed properties and 44 locale keys. Expect conflicts in both and **keep both sides**.

Also shared: `server/report/threeWayForecastModel.js` (new `overseas` block, two new
balance-sheet lines), `locales/en.json`, `ARTEFACTS.md`, `features/to-do-items.json`,
`features/report-models.md`, and a new `data/forecast-sell-down.json`.

⚠ **We took YOUR 4.62 whole at the merge** — your slice-2 text is newer than ours, and a
sentence this branch had added to your comment was dropped. Your item is yours to write.

✅ Your 2026-09-04 handover was current when we merged. Thank you — it made the collision
call easy.
