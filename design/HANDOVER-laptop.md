# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-15 (thirty-sixth session) · Laptop · branch `feat/advisor-progress`

Suite **10,993 green** (517 suites), lint 0 errors, audit PASS. Tree clean, all pushed,
**51 ahead of `master`, 0 behind**. **Seven live items** — none filed, none closed.

🔴 **MERGE PR #93 BEFORE THIS BRANCH, AND KNOW THAT NEITHER ORDER IS CLEAN.** #93
(`fix/item-number-ceiling`, off `master`) is **seven files, not three**, and **three of them
already exist here with different contents**: `scripts/ref-ceiling.js`,
`tests/unit/refCeiling.test.js`, `scripts/check-branch-state.js`. The numbering half of 4.101
was built twice — ours 2026-09-14, theirs the same week. **#93 supersedes ours** and carries
Mike's parent-number scheme (`design/ITEM-NUMBERING.md`). Take #93's versions when `master`
comes in; do **not** delete ours before it lands or `check:branch` breaks here. On 4.101.

**4.100 IS NOW 4.104** (`a7b0f6f8`, 26 files). Two items held 4.100 — ours and a keyword fault
the desktop closed the same day, both numbered 2026-09-14 before any ceiling existed. Found by
reading the desktop's handover **from its own branch**, as 4.101's note says to.

**4.104 — THE STAFF REGISTER IS BUILT.** Drawn, approved, four questions ruled, built, then
walked in a running app. One `firmOverlay` key per client — **no new table**. Both contents
routes re-resolve the gate from the live case. Leave is valued at the rate **including pay
rises** (`max` of the year's rises — the workbook's own `S49`), so step 3 is preferred over
step 1.

🔴 **WE DELIBERATELY DO NOT REPRODUCE THE WORKBOOK'S 63,154 LEAVE LIABILITY.** 24 of its 29
people are priced from *sick leave consumed*; its one surviving formula points at a blank cell;
the rest of the column is hand-typed. We price from accrued leave only — **10,115.84 across
five**. The golden test pins the difference *and the reason*, so nobody "fixes" it back.

🔴 **RUNNING IT FOUND THREE FAULTS 10,975 GREEN TESTS DID NOT.** The sample team carries four
duplicated names and four nameless people: rows keyed by name updated the wrong person, and
nameless rows were **silently discarded on save**. Identity is `division|name|occurrence` now.
The footer also read "1 person" above twenty-nine.

⚠ **THE API DOES NOT HOT-RELOAD.** The first browser walk tested the old backend while the
frontend had rebuilt, and nearly read as a failed fix. Restart it before believing any walk
that follows a backend change.

**DESKTOP:** 4.87 untouched. **One piece of 4.104 is yours when 4.87 lands** — the Firm Manager
control for the register's retention dial needs a tab in `FirmManagerHub.vue`; its backend,
cascade and default are built and tested, and `4.104`'s `activeOn` is cleared so you can take
it. Also: on your branch **`4.94` names two different closed items in the same file**, and
`4.96` differs across branches — old numbers are frozen under #93's scheme, so that is a
decision, not a renumber. Shared files I changed: `locales/en.json`, `nuxt.config.js`,
`server/restify-server.js`, `.gitignore`, `design/ARTEFACTS.md`, `features/report-models.md`,
`.claude/commands/startup.md`, `scripts/ref-ceiling.js`. Merge `master` before touching any.
