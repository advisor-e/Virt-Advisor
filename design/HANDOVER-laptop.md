# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-14 (thirty-second session) · Laptop · branch `feat/advisor-progress`

Suite **10,568 green** (502 suites), lint 0 errors, audit PASS. Tree clean, **everything committed
and pushed**, 10 ahead of `master`, 0 behind. **Seven live items. 4.100 IS STILL ACTIVE ON THIS
MACHINE** — the screens are the next slice and they touch the same files.

🔴 **THIS MACHINE'S TWO NEWEST ITEMS WERE RENUMBERED 2026-09-14 on Mike's yes: 4.97 → 4.100 and
4.98 → 4.101.** Both machines allocate the next number from their own branch, so both had filed a
different 4.97 and a different 4.98 the same day. Your 4.93, 4.97, 4.98 and 4.99 keep their numbers;
nothing of yours was touched. This has fired eight times: 4.88–4.92 and 4.94 are already duplicated
inside `to-do-done-and-parked.md`, where the uniqueness guard does not reach, and your live 4.93
clashes with our closed one.

**YOU NO LONGER HAVE TO KNOW ANY OF THAT — `npm run check:branch` NOW PRINTS THE NEXT FREE NUMBER**
(item 4.101, widened and half-built on Mike's yes). It reads the live list *and* the archive from
every machine's branch, so the ceiling is a read, not a guess. New: `scripts/ref-ceiling.js`,
`tests/unit/refCeiling.test.js` (21 cases), and a `ceilingReport` in `scripts/check-branch-state.js`.
Report-only — it cannot block a push. **The handover half of 4.101 is still open**, so keep reading
the other machine's note from `origin/<their branch>`.

**4.100 — THE WAGES ENGINE IS BUILT** on Mike's *"build the wages/salary review model"*:
`server/report/wagesModel.js`, `tests/unit/wagesModel.test.js`, `POST /api/report/wages-review`
and its route test. **NO SCREEN EXISTS.** Full record in
[`features/report-models.md`](features/report-models.md) § *Wages/Salary Review*.

🔴 **THE NEXT THING IS THE FIVE INPUT STEPS, AND THEY NEED MIKE'S WORDING FIRST.** Do not invent
labels. Also still to come: the report screen, the rates converter tab, the gated register, the
payroll reader, the Tax Rates fifth figure. **Do not add the catalogue row until a page exists** —
the frame guard reads ready routes and would fail.

🔴 **MIKE STILL OWES A REAL PAYROLL EXPORT.** No reader may be called supported until one is read.

⚠ **THE BUILD CORRECTS TWO WORKBOOK FIGURES AND THE DRAWING'S NUMBERS ARE SUPERSEDED** — named in
the drawing's own header, so read that before quoting anything off the page. Year margin
**350,121 → 288,935**; **July 181 → −132, no longer breaking even**. Billings unchanged and matching
on all 87 person-seasons. Both corrections mutation-verified; with them reverted the engine
reproduces the workbook to the cent, so it is a faithful port.

🔴 **A LESSON WORTH MORE THAN THIS MODEL.** Mike, on being shown the second fault as a judgement
call: *"if it needs to be fixed - fix it - NEVER allow a mistake to remain."* A source workbook's
own label does not excuse a wrong figure, and one model may not hold two answers to the same
question. Recorded in the Brief.

**DESKTOP:** 4.87 untouched — none of its files opened. Changed under you: `server/routes/report.js`
and `server/restify-server.js` (one route each, additive), plus `features/report-models.md`,
`ARTEFACTS.md`, `features/to-do-items.json`, `mockups/wages-model.html` and generated `CODE-SIZE.md`.
Your note of **2026-09-14** was read on your own branch and is current. **4.101 (was 4.98) is still
open** — until it is fixed, read the other machine's handover from `origin/<their branch>`, not the
working tree.
