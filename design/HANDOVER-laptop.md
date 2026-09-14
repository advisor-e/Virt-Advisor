# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-15 (thirty-fifth session) · Laptop · branch `feat/advisor-progress`

Suite **10,833 green** (512 suites), lint 0 errors, audit PASS. Tree clean, everything pushed,
**43 ahead of `master`, 0 behind**. **Seven live items**, unchanged — today finished work, it
filed none.

**4.100 — the staff register's GATE is built, both directions. The register TABLE is not.**
Three states, because Decision 6 states two conditions and each failing looks different:
`closed` renders **no control at all**, `available` is the only state with a button, `open`
carries the provenance line. Mike ruled the switch turns **both ways** — a close records who
and when and **keeps the opening it closed**. Artefact `mockups/wages-register-gate.html`,
approved the same day. `caseStore.js` was **read, never edited**, so 4.87 is untouched.

🔴 **RUNNING THE APP FOUND WHAT 10,819 TESTS COULD NOT — and the lesson generalises.**
`wagesRegisterGate`, `clientReportAccess` and `savedReports` all reached `firmOverlay` with **no
dev fallback**, so the gate was dead on any machine without MySQL and a *shipped* feature (4.62)
put a red error under the client picker on **every report page**. Every unit test mocks
`firmOverlay`, so the real one was never called. **If a store touches `firmOverlay` directly,
check it has the `dbFailure` fallback before believing a green suite.**

⚠ **`.claude/skills/run-the-app/SKILL.md` was wrong and is corrected.** The client picker renders
on **no** report page locally, and the cause is the missing **token**, not the database. Seed
`advisor_e_token` via `addInitScript` before the page loads; the fix is written into the skill.

**DESKTOP:** 4.87 untouched. Shared files changed: `server/utils/clientReportAccess.js`,
`savedReports.js`, `server/restify-server.js`, `nuxt.config.js`, `locales/en.json`,
`design/ARTEFACTS.md`, `features/report-models.md` + its history, and the `run-the-app` skill.
Merge `master` before touching any.

**Found while writing this up, and fixed:** the Brief's *"Still to come"* for this model had listed
the rates tab and the fifth Tax Rates figure since **the day both were built** (2026-09-14). Replaced,
superseded text on `report-models-history.md` §5. Checking a line against the code *before* writing
beside it is what caught it.
