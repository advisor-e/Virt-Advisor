# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-26 · Desktop · branch `feat/firm-quiz-builder-ui`

**Clean and pushed. 636 suites / 13,787 tests green, audit PASS. 0 behind `master`; everything
ahead is in PR #134** (opened today, description current). Not merged — that is the master team's.

**Worked: 13.5**, now *Foreign currency, freight and duty in the Three-Way Forecast*. Mike ruled
the design by the accounting standards; the drawing
[`three-way-forecast-foreign-currency.html`](mockups/three-way-forecast-foreign-currency.html) is
**approved, not built**; his call is **proceed**. `activeOn` desktop.
**Shipped:** the forecast's FRS-42 caution, on screen and under every printed statement page.
**Filed:** 44.1, a full IFRS / FRS-42 review of the forecast plus a disclosure screen for firm
managers (unranked). **New:** [`CALCULATION-ASSUMPTIONS.md`](CALCULATION-ASSUMPTIONS.md), the
accountants' record of the forecast's treatments.

**Pick up first:** the 13.5 build — engine, screen, saved shape, and a test that runs the
workbook's twelve months of orders through the engine itself.

### 🔴 FOR THE LAPTOP

- **13.5 will change** `threeWayForecastModel.js` (the overseas schedule), `importShipmentModel.js`,
  `ThreeWayForecastIntake.vue`, `ThreeWayForecastReport.vue` and `threeWayForecastSavedShape.js`.
  Ask before touching them. The "Exchange-rate movement" line will hide when it is zero.
- Yesterday's notes still apply until PR #134 merges: translation is the backend's, `en.json`
  grew at its tail (keep both sides), and `mountComponent` renders `<i18n>` by default.
