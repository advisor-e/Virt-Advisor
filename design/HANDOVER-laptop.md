# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-20 · Laptop · branch `feat/advisor-progress`

**Suite 12,304 green** (570 suites), lint 0 errors, `npm run build` succeeds. **22 live items** —
15.7 closed today. Take the ahead/behind counts from `npm run check:branch`, never from a number
written here.

🔴 **15.7 CLOSED — ALL 33 DRAWINGS ARE WIRED.** 33 render on the advisor's run screen and 33 in the
client's plan; the *"no capture screen yet"* notice fell **17 → 12**. The last five were Market
Diffusion Theory, Product Life Cycle, E. Deming's Volatility Theory, the Digital Funnel Storyboard
and Packaging/ Bundling, and each was opened and looked at in the assembled plan rather than counted.

🔴 **THE ONE THING TO KNOW BEFORE YOU TOUCH THE GENERATOR: THE REFUSAL IS GONE, AND IT DOES NOT COME
BACK.** `build-concept-graphics.js` used to throw on a drawing carrying a pasted-in picture, because
the five weigh 307 KB gzipped against a 300 KB **first-load** budget. That comparison never applied
to them — every drawing is a lazy import and no drawing is in the first-load bundle, which
`conceptGraphics.test.js` pins three tests below where the ban sat. **Measured on a real build:
first load 129.5 → 129.6 KB gzipped.** A file in `static/` would weigh 118 KB against the 120 KB it
weighs inline. Mike's ruling is why it stays inline: *"theres no point having a graphic if it wont
push through to the clients plan"* — the plan is printed, saved as PDF and emailed on. A
**per-drawing ceiling** replaced the ban and still catches an unscaled original.

**Two Vue console warnings closed with it** — `6MarketingQuestions` and `10MarketingMessages` are
not valid component names. Every generated drawing now registers as `Concept<Name>` via
`registeredName()`; the file names are unchanged.

**7.12 IS STILL YOURS TO PUT BACK.** Mike ruled 2026-09-19 that `7.12` is *the right calculator is
offered only sometimes*; this laptop applied its half (`e33002be`) and your branch still points it
elsewhere. `npm run check:branch` reports it every session until one of us moves.

**DESKTOP — shared files I changed:** `to-do-items.json`, `to-do.md`, `to-do-done-and-parked.md`,
`strategy-planner.md`, `CODE-SIZE.md`, `scripts/build-concept-graphics.js`,
`tests/unit/conceptGraphics.test.js`, `components/strategy/StrategyConceptGraphic.vue`, and **every
file in `components/strategy/concepts/`** — the 27 existing ones changed one line each (the `name:`
above), plus five new drawings and `index.js`. All of that directory is generated: on a conflict,
take either side and run `node scripts/build-concept-graphics.js`.
**No `FirmManagerHub.vue`, no engine code, no `report-model-summaries.json`.**
**7.5 and 15.1 stay active on this laptop.**
