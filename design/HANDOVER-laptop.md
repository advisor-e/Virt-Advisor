# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-07 (fourth session) · Laptop · branch `feat/advisor-progress`

Suite **8,147 green** (417 suites), lint 0 errors. Two commits, **PR #67 merged** —
`master` is `d1157fc` and this branch is level with it. Nothing uncommitted.

**4.71 IS COMPLETE — both slices.** Slice 2, the three-year step 4, was drawn, ruled and
built in one day. **Mike's first ruling replaced the recommendation put to him** (*"three
years, always"*): *"good point — you should be able to choose 1, 2 or 3 year forecast
please"*. All six questions ruled one at a time; the drawing is
[`mockups/three-way-forecast-three-years.html`](mockups/three-way-forecast-three-years.html),
and every ruling is recorded on it with the argument that was put against it.

**The count reaches the ENGINE, and that was the one thing worth getting right.** The
tempting build — compute three years, display fewer — would have left a one-year forecast
reporting a three-year revenue and a lowest cash point in a year nobody asked about. Both
look entirely reasonable on screen. `yearCount` is now a model input, clamped there rather
than trusted from the body, and a test pins 890,000 for one year against 2,670,000 for three.

**What the drawing turned on, and it came out of running the real engine:** three *"same
again"* years are not copies. On flat sales of 890,000 the sample's profit still climbs
**14,915 → 23,305 → 30,354** as depreciation falls away and the term loan pays down.

### 🔴 DESKTOP — read this first

- **Shared files changed, and two of them are yours:**
  `server/report/threeWayForecastModel.js` (a `yearCount` input, `MAX_FORECAST_YEARS`, the
  summary reads the last year built rather than `years[2]`) and `locales/en.json` (a
  `report.threeWayForecast.assume.years` block and a `…report.years` block). Also
  `server/routes/report.js` (JSDoc only), `ThreeWayForecastIntake.vue`,
  `ThreeWayForecastReport.vue`, and three test files.
- ⚠ **`tests/unit/reportHeadlineConsistency.component.test.js` changed** — the forecast row
  now feeds `computeThreeYearForecast({ yearCount: 1 })`, because the screen calls the
  three-years route for every forecast. If you add a report model, that guard is unchanged
  in every other respect.
- ⚠ **A behaviour-preserving refactor in `ThreeWayForecastReport.vue`:** six row builders
  were computeds reading the year on screen and are now methods taking the year they build
  (`cashRowsFor` and friends), with the old computeds as one-line callers. The print needed
  it — a computed cannot be asked about a year other than the current one.
- **You are 18 ahead / 14 behind `master`.** Four of those 14 are today's forecast work,
  including `xeroReportParser.js` from the MYOB fix earlier today — the same file your 4.70
  stage 2 touched. Merge `master` in before going further.
- **The OpenAI account is still OUT OF CREDITS.** Economic analysis fails for every user.

### Open, and named rather than left to be discovered

- **The one-year default is OURS, not Mike's ruling.** A new forecast opens at one year,
  which is exactly what step 4 has always shown. Flagged to him; he has not ruled on it.
- **One label necessarily changes on a multi-year forecast** — *"Result for the year"* is
  not true of three, so it reads *"Result over 3 years"*. It is the approved drawing's own
  wording, but his ruling said the tiles keep their labels, so it is recorded as a deviation.
- 🔴 **"Gross margin" means two different things on steps 3 and 4** — margin on the goods,
  and margin after direct costs. Recorded on the drawing and **deliberately NOT filed**: it
  pre-dates quick-fire, and the screen starts those four direct-cost fields at zero, so an
  advisor who leaves them alone types 41 and sees 41. An earlier draft of that box quoted a
  sixteen-point gap taken from the engine's built-in sample; the correction is on the page
  rather than quietly dropped.

### Next

**4.69** still owes one run on the no-date path once credits return — it is the only item
`activeOn` this laptop. **4.60** waits on four real exports from QuickBooks Online and MYOB,
and whoever collects them should be asked for the Fixed Asset Schedule at the same time
(**4.65**, same request to the same person).

**Nine live items.** 4.71's `activeOn` cleared — it is done and on `master`.
