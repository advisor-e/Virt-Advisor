# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-28 · Desktop · branch `feat/firm-quiz-builder-ui`

**Clean and pushed. 642 suites / 13,924 tests green on Node 14.15, audit PASS. 10 ahead, 0 behind
`master`** — PR #134 and #137 were merged today on Mike's instruction, so the next `/startup`
proposes a PR.

**Closed: 13.5** (four slices — `779f5cd7`, `9722719c`, `637a83a4`, and the records).
**Fixed:** the Handbook's U+FFFD refusal; years 2 and 3 re-landing opening stock in transit; the
manager console's missing-figures guard (tiles and posture switch). **Filed: 22.2** — this
machine's default Node is 20; run tests, commits and pushes with the 14.15 folder first on PATH, as
its note says. **In hand here:** nothing; 13.5's marker is cleared.

### 🔴 FOR THE LAPTOP

- Merge `master` first — the laptop is 18 behind it.
- 15.2's Mentor Hub tab no longer waits: #134 is merged and `FirmManagerHub.vue` is free.
- Shared files changed today: `ThreeWayForecastIntake.vue`, `ThreeWayForecastReport.vue`,
  `threeWayForecastModel.js`, `importShipmentModel.js`, `threeWayForecastSavedShape.js`,
  `HeroStrip.vue` (now takes 2 columns), `ManagerConsole.vue`, and `en.json` under
  `report.threeWayForecast`. `fxAllowancePct` / `salesFxAllowancePct` are now what-if settings,
  not costs.
