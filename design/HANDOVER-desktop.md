# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-21 · Desktop · branch `feat/firm-quiz-builder-ui`

**Item 17 stage 3 COMPLETE — the COI screen and the Sales Dashboard.** Both driven in a browser
against seeded data. Suite green on every affected suite (327 across the eight run).

### 🔴 READ THIS BEFORE PORTING ANY OF HIS OTHER SCREENS

**The first dashboard I built was thrown away, and rightly.** The plan said the dashboard is
*"redrawn on our six SVG chart components"* and said **nothing about what the screen looked
like** — so I read that as a free hand and designed one: a waterfall chart of my own invention,
his **two funnels collapsed into one**, his rings and COI table dropped, the page renamed.

His answer: *"i want what i had in the first place - i spent a lot of time to get it right - all
you had to do was wire it"*, and then *"dont change shit - get it looking the same"*.

**The lesson, and it cost most of a session: a plan that names a CONSTRAINT is not a licence to
invent a layout. His app IS the specification — open the screen before you write the one that
replaces it.** His `pages/dashboard.vue` had been sitting on `E:`, 938 lines, fully designed,
the whole time.

**Stages 4–7 are five more of his screens.** Read each one first.

### What is built (item 17)

| | |
|---|---|
| Stage 1 | 5 tables (`db-migration-sales-tracker.sql`), proven on real MySQL |
| Stage 2 | Pipeline store, routes and **screen** |
| Stage 3 | COI store, routes and **screen** · **Sales Dashboard**, backend and screen |
| Next | **Stage 4 — Team + Lists**, the firm-manager pages |

**The dashboard is a faithful copy** of his own: his seven stat cards, both rings-and-averages
blocks, his COI panel, his charts row, **his CSS unchanged** (deliberately NOT re-themed to our
brand tokens) and his wording verbatim under `salesTrackerDashboard` in `locales/en.json`.

🔴 **HIS TWO FUNNELS SPLIT ON `salesStyle`** — Campaign vs Total Needs, each with its own four
rates, average fee and average days. That field was **already in our table and store** from
stage 1 and simply was not being read. `dashboard()` in `salesMetrics.js` ports his
`metrics.get.js` field for field; `salesDashboardMetrics.test.js` (22 tests, mutation-verified)
fails if they are ever collapsed again.

⚠ **His rounding and his zeroes are kept on purpose.** `wholeRate` gives a whole number and **0**
for an empty denominator, where our `rate` gives `null` — because his rings are DRAWN from the
number and a ring needs one. Both live side by side; `compute()` and its contract are untouched.

### The three forced differences, all stated in the Brief

1. **Charts** — his are Chart.js + vue-chartjs; the locked stack forbids both, so they are drawn
   on `components/base/` carrying **his** colours. His two vertical bars are horizontal: we have
   no vertical bar component.
2. **Address** — `/sales-tracker-dashboard`, because `/sales-dashboard` is item 4.95's Sales
   Dashboard **model**, a different screen. The page still calls itself *"Sales Dashboard"*.
3. **Money** — `currencyMixin`, not his hardcoded `en-NZ`/`NZD`, which would show every firm New
   Zealand dollars.

### One fault found in YESTERDAY's work, still open

🔴 **`tests/unit/salesPipeline.component.test.js` does not actually test its NaN guard.** Delete
the guard in `SalesPipeline.vue`'s `payload()` and all 25 tests still pass. The cause: the test
asserts on an EMPTY box, and `Number('')` is `0` — the values that really reach NaN are
`undefined` and unparseable text. **Mutation-verified both ways.** The COI screen's equivalent
test was rewritten and now bites; the pipeline one was not touched, as it is outside what Mike
approved this session. **Put it to him before doing anything else with it.**

### Seeded dev data

Seven deals and four referral partners are in the local MySQL from testing, under
`dev-advisor-001` / `dev-firm-001`. Harmless, but they are not real.

**LAPTOP — shared files I changed:** `locales/en.json` (added `salesCoi` and
`salesTrackerDashboard`), `server/utils/salesMetrics.js` (added, removed nothing),
`server/routes/salesCoi.js`, `to-do-items.json` item 17, `sales-tracker.md`.
**Your 7.5 and 15.1 are untouched.**
