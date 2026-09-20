# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-20 · Laptop · branch `feat/advisor-progress`

**Suite 12,284 green** (570 suites), lint 0 errors, coverage and audit gates passed. **18 ahead
of `master`, 0 behind**, all of it in **[PR #102](https://github.com/advisor-e/Virt-Advisor/pull/102)** —
whose title and description were rewritten this session to cover all 17 commits instead of the
five they were written for. **24 live items.**

🔴 **7.12 IS STILL YOURS TO PUT BACK.** Mike ruled 2026-09-19 that `7.12` returns to *the right
calculator is offered only sometimes* and your new job takes `7.13`. This laptop applied its half
(`e33002be`); your branch still points `7.12` at *the model's page is recalled by the AI*, so the
guard will refuse your merge until you move it. Your handover is dated 2026-09-18 and the check
confirms it is current.

**15.7 — THE CONCEPT DRAWINGS NOW REACH THE SCREEN, 4 OF 33.** `scripts/build-concept-graphics.js`
lifts an approved drawing out of its mockup into a component, so what ships is provably what Mike
approved; `StrategyConceptGraphic` serves the teaching slide, the capture card and the client's
plan. Drawings load lazily — the 33 weigh 361 KB gzipped against a 300 KB first-load budget.
**Five of the remaining 29 need their embedded photograph lifted out to a file first; the
generator refuses them rather than shipping one into the bundle.**

🔴 **RUNNING IT FOUND A CAP AND MIKE LIFTED IT THE SAME DAY.** `placeableCards` dropped any concept
with no fill-in table, and only 16 of the 52 have one — so that line held all 33 drawings to 16.
**Ruled: a concept needs a table OR a drawing.** Three consequences, all about what a client reads:
a drawing-only concept prints no capture page, its step announces no Action points, and the
"no capture screen yet" notice counts only concepts with neither.

**TWO NEW ITEMS, both filed on his yes rather than left here.** **15.11** — five concepts keep
their fill-in table on a deck page (`responsePage` 24, 34, 37, 41) and all 33 drawings are
*teaching* pages; four code comments claimed otherwise and are corrected. **16** — a client's
document carries no firm at all, so the reason 33 concepts were redrawn has not yet reached a
client's page; gated on the unruled monogram-vs-logo deviation on the Porter's artefact.

**DESKTOP — shared files I changed:** `to-do-items.json`, `to-do.md`, `strategy-planner.md`,
`CODE-SIZE.md`, `StrategyPlanDocument.vue`, `StrategyCaptureCard.vue`, `StrategyConceptCapture.vue`,
`StrategyTeachingSlide.vue`, `pages/strategy-planner.vue`. **New:** `StrategyConceptGraphic.vue`,
`components/strategy/concepts/`, `scripts/build-concept-graphics.js`, three test suites. **No
`FirmManagerHub.vue`, no engine code, no `report-model-summaries.json`.** **7.5, 15.1 and 15.7
stay active on this laptop.**
