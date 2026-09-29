# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-29 · Desktop · branch `feat/firm-quiz-builder-ui`

**Clean and pushed; 6 ahead of `master`, 0 behind.** Green: 659 suites / 14,241 tests on Node
14.15. Run tests, commits and pushes with the 14.15 folder first on PATH (item 22.2).

**Closed on Mike's word:** 15.13 (the report brought into Assess current position, printed on
one framed plan sheet) and 10.3 (Tax & Forecast Rates: one hub page, four former tabs as
sections). **Parked:** 15.15, for his re-think.

**Also built today, on his rulings:** the mentor loads and approves country schedules and they
cascade — a global group manager sees them as "Advisor-e" and may load their own. The real
IR265 is loaded at mentor level in this computer's test database. **Fixed:** the plan's Print
button (blank since 22 Sep), the schedules list drawing blank when pages were unread, and the
Depreciation Rates upload wording.

**Local test database only:** the Strategy Planner's three tables now exist here, with practice
session 1 and a completed practice report for Dev Client Ltd.

### FOR THE LAPTOP

- Merge `master` once this branch reaches it; nothing of yours was touched.
- Shared files changed: `components/FirmManagerHub.vue` (NAV_GROUPS, TAB_TIERS:
  `taxForecastRates`, and `countrySchedules` now mentor too), `locales/en.json`,
  `pages/strategy-planner.vue` (print rules, 15.13), `StrategyConceptCapture.vue` and
  `StrategyPlanDocument.vue` (15.13 insertions; 8.4 is yours), `hubTabTiers.test.js`,
  `mentorHubScope.component.test.js`.
- 15.14, 15.20 and 8.4 remain yours.
