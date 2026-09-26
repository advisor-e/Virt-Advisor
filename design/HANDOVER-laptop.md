# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-26 · Laptop · branch `feat/advisor-progress`

**Clean and pushed. 6 ahead of master, 0 behind (PR threshold 10). Green at push: 634 suites /
13,809 tests.**

**Closed today on Mike's word:** 15.28 Alignment Statements (built; table rows now one height per
row), 15.27 (a step's purpose reaches the advisor as a tooltip on Build session), 15.26 (Our
Session Objective is two sheets; the agenda lists each step with its concepts beneath, rules in
`utils/agendaLayout.js`), 15.24 (Owner Expectations holds ONE shared, editable list of up to ten
tasks — model, screen, printed table and the managers' Owner Focus Tasks tab).

**FOR THE DESKTOP:**
- Owner Expectations tasks are now one list of ten shared by all owners (Mike, 2026-09-26), not a
  list per owner. Anything reading duties should expect identical names across owners, at most ten.
- `utils/agendaLayout.js` is new; `conceptSheetCount` now takes an agenda page count.
- The generator writes a non-breaking space as `&#160;` (`scripts/build-concept-graphics.js`).

**In hand, not touched today:** 15.17, 15.20, 8.4.
