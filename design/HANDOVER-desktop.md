# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-21 · Desktop · branch `feat/firm-quiz-builder-ui`

**Item 17 stage 3 COMPLETE** — the COI screen and the Sales Dashboard, both driven in a browser.
Clean, pushed, 7 ahead / 0 behind. Suite 12,724 green. Merged the laptop's 15.1 work on the way.
**Next: stage 4, Team + Lists.**

### 🔴 READ HIS SCREEN BEFORE PORTING IT — stages 4–7 are five more of them

**My first dashboard was thrown away, and rightly.** The plan said *"redrawn on our six SVG chart
components"* and said **nothing about what the screen looked like**, so I read that as a free hand
and designed one — inventing a chart, collapsing his two funnels into one, dropping his rings.
His `pages/dashboard.vue` had been on `E:` the whole time, 938 lines, fully designed, unopened.

**A plan naming a CONSTRAINT is not a licence to invent a layout. His app is the specification.**
What was copied, and the three forced differences (charts, address, currency): Brief §10 stage 3.

🔴 **His two funnels split on `salesStyle`** — Campaign vs Total Needs, the point of the screen.
The field was already in our table from stage 1 and simply never read.
`salesDashboardMetrics.test.js` fails if they are collapsed again; mutation-verified.

### A test that passed while asserting nothing — fixed (`def402ed`)

`salesPipeline.component.test.js` asserted on an **empty** money box, and `Number('')` is `0` — so
its NaN guard could be deleted with all 25 tests still green. The COI equivalent had the same
hole. Both now bite. ⚠ **When a test and its comment agree, neither is evidence** — delete the
thing it guards and see what goes red.

### Notes

- **Seeded dev data**: 7 deals and 4 partners in local MySQL under `dev-advisor-001`. Not real.
- **LAPTOP — shared files I touched**: `locales/en.json` (added `salesCoi`,
  `salesTrackerDashboard`), `salesMetrics.js` (added only), `salesCoi.js`, `to-do-items.json`
  item 17, `sales-tracker.md`. **Your 7.5 and 15.1 untouched.**
