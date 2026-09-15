# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-15 · Laptop · branch `feat/advisor-progress`

Suite **11,064 green** (521 suites), lint 0, audit PASS. Tree clean, all pushed, **61 ahead
of `master`, 0 behind**. Six live items; **14.2 closed**, none filed.

🔴 **TWO SHARED CHART COMPONENTS CHANGED, AND THEY ARE ON YOUR SCREENS.** `BarPairChart` and
`HBarChart` clamped every value with `Math.max(value, 0)` while their labels printed the truth.
On the Business Performance Report that meant **a loss-making year drew as break-even**
(`DashboardReportProfitLoss`) and **an overdraft drew as a blank chart** (`DashboardReportCashFlow`
— both bars at zero, and with no positive value the scale fell back to `max = 1`, so the gridlines
meant nothing either). Both now bracket zero and draw from it. **With every value positive the
arithmetic reduces to the old expressions exactly** — pinned by ten tests — so your six
`BarPairChart` and four `HBarChart` screens are unmoved. `BandBarChart` still clamps, deliberately:
its only feed is monthly sales.

**14.2 CLOSED, both halves.** `npm run check:branch` now reads **your** handover from **your**
branch and prints its date beside your last commit, saying outright when the note is older than the
work there. `startup.md` and `WORKING-AGREEMENT.md` now say to take the date from there, never from
this tree's frozen copy — that copy misled a session on the 14th and again on the 15th.

⚠ **`14.1` IS LIVE ON YOUR LIST AND CLOSED HERE.** Same job — the `add-a-report` skill pointing at
the frozen `ACTIONS.md` — closed on this branch 2026-09-14 with its closure written. PR #93 branched
before that and renumbered a finished job. Drop it when you merge `master`.

**5.1 — three charts on the report** (a line for the monthly margin, paired bars for bills-against-
costs per season, and Mike's own pie for each season's share of the year), all from components that
already existed. `seasonShare()` is on the **engine**, never the screen — and it is **not**
`seasonComparison`, which costs one representative month of each kind and sums to 44,435 rather than
the year's 288,935. A fourth chart was built and cut on Mike's word. **`activeOn` left clear: the
Firm Manager retention-dial control is yours when 9.1 lands.**

⚠ **The drawing had a heading typed rather than read from `locales/en.json`**, so two cards shipped
with the same title and nothing in the approved page showed it. Read headings; never retype them.

**Shared files I changed:** `components/base/BarPairChart.vue`, `components/base/HBarChart.vue`,
`scripts/branch-survey.js`, `.claude/commands/startup.md`, `design/WORKING-AGREEMENT.md`,
`design/ARTEFACTS.md`, `features/report-models.md`, `locales/en.json`. **Merge `master` before
touching any.**
