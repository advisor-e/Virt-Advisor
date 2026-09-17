# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-17 · Laptop · branch `feat/advisor-progress`

**One commit, pushed** (`8a021f50`). Suite **12,111 green**, lint 0 errors, coverage and audit
gates passed at push. **0 behind `master`, 38 ahead.** **15.1 and 7.5 stay active on this laptop.**

☑ **THE CONCEPT INDEX IS BUILT — 15.1's first prerequisite is closed.** The 52 as records in
`data/strategy-frameworks.json`, loaded by `strategyFrameworks.js`, pinned by
`strategyConcepts.test.js`. **All 11 of Pivot's concepts resolve; 0 did before.** Full account in
the Brief §8 — read it there, not here.

🔴 **DECISION F IS STILL MIKE'S AND IT BLOCKS THE MENU SCREEN** — which concept each "Where To
Start??" action means. A mapping for him to write, not a yes/no. **D2 on the output drawing is
also still open** from 16 Sep. Nothing else waits on him.

⚠ **32 of the 52 carry NO capture form, on purpose.** Census §4 says choosing one for a concept
outside the measured 24 is a design decision, not a reading. A test fails if one appears. **Do
not "complete" them.**

⚠ **NO EXTRACTOR EXISTS AND THE DATA FILE IS NOW THE SOURCE.** The rows were read off the PDFs
once by a throwaway Python script, deliberately not kept (JS-only repo). **The five traps that
extraction hit are in Brief §8** — read them before writing another one.

**Filed today:** 5.3 — four Wages Register suites share one real dev file and collide at random
under parallel Jest workers. Failed once in three full runs. Cause traced, three fixes named.

**DESKTOP — shared files I changed:** `data/strategy-frameworks.json` (added `concepts`; the
five `frameworks` rows are untouched), `server/utils/strategyFrameworks.js` (added only —
nothing existing changed), `design/features/to-do-items.json`, `design/ARTEFACTS.md`,
`design/PLANNING-TEMPLATE-CENSUS.md`, `design/features/strategy-planner.md`.
**Nothing in `FirmManagerHub.vue`, `advisorEngine.js` or anything else 7.2 owns.**
