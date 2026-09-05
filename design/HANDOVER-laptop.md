# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-05 (second session) · Laptop · branch `feat/advisor-progress`

Suite **7,903 green** (410 suites), lint clean. **PR #61 IS MERGED** — `master` is `c8d965a`
and this branch is **0 ahead / 0 behind**. Nothing is uncommitted anywhere.

### 🔴 DESKTOP — MERGE `master` BEFORE YOU TOUCH ANYTHING

`feat/firm-quiz-builder-ui` is **25 behind / 2 ahead**. Master now holds the forecast's two
layout fixes AND the whole business-entity wiring, which changed
`ThreeWayForecastIntake.vue`, `ThreeWayForecastReport.vue` and `pages/three-way-forecast.vue`.
**4.62 is no longer active on either machine** — its `activeOn` is cleared, and its build is
finished, so nothing there is reserved.

### What changed today

**4.62 IS BUILT OUT — all twelve models now open at business entity level.** Mike's ruling:
*"anything an advisor can edit, the client can edit."* The forecast's saved row is the whole
intake plus the report's four levers (`utils/threeWayForecastSavedShape.js`, 86 keys, 14
tests). Only step 1, the upload, stays the advisor's. Detail in `business-entity-reports.md` §5.

**The glossary "?" marks were completely dead and looked finished.** `b-tooltip` was never
registered in `plugins/buefy.js`. **The tests could not catch it and still cannot catch the
next one:** `tests/helpers/mountComponent.js` registers the WHOLE Buefy library while the app
registers 22 by hand, so a component test always sees a control the app may not have. Nothing
covers `plugins/buefy.js`. Recorded, not filed — closure in `to-do-done-and-parked.md` §2.

### Next

**Nothing is half-finished.** 4.62 waits on Mike for the `clientReports.saved.*` wording and
on UAT for the one thing untestable here: **no saved report has ever reached the real store**,
because the client picker is empty without MySQL. Same blocker as **4.50**.

**4.15, 4.58, 4.60, 4.65, 4.66 wait on Mike.** Seven items live.

⚠ The suite failed twice on `EPERM` writing a temp file in `activityStore` dev-fallback tests,
a different test each time, then passed clean three times running. Windows, not the code.
`shipmentTimer` in `ThreeWayForecastIntake.vue` is still never cleared on destroy, still
deliberately not filed.
