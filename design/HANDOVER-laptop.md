# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-10-02 (late) · Laptop · branch `feat/advisor-progress`

**9 ahead of master after this commit, 0 behind; suite green 696 suites / 15,276 tests on Node 14.15.**
PR #155 (7.27, 7.21, Tension Point Scripts) merged to master today.

**15.22 proceeds — only the Sales Flowchart ruling is left (waits on Mike).** Built today:
Landing Page Review (8 section tables, 58 boxes, S&M pp27–30) and a Notes box for the five
teaching-only topics. **15.33 done** — sessions listing a removed concept open without it.
**Fixed:** every Strategy Planner capture box lost the first letter typed into it.

**FOR THE DESKTOP:**

- **The capture boxes no longer use Buefy `lazy`.** They save on `change.native` and only signal
  on `input` — `StrategyCaptureBox.vue`, `StrategyConceptCapture.vue`. Pinned by
  `strategyCaptureSaveRate.test.js`; don't put `lazy` back.
- **Grid capture can now be one table per section** (`tableTitle`, `tableNotes`, `span`), and a
  concept can take a single Notes box (`captureNotes`). Shared files: `strategyCaptureForms.js`,
  `strategyFrameworks.js`, `scripts/read-deck-capture-tables.js`, `pages/strategy-planner.vue`,
  `server/routes/meetingSegments.js`, `locales/en.json`.
- `data/strategy-deck-capture-tables.json` was regenerated; the 15 existing tables are identical.

**Still in hand here:** 8.6, 15.31 and 15.22, all waiting on Mike.
