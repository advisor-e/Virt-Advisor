# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-15 · Desktop · branch `feat/firm-quiz-builder-ui`

**4.100 IS CLOSED** (`883a6481`) and **4.97 US5 is half built** (`9be4fef7`). Both pushed.
Nine live items. Suite **11,097 green** (524 suites), lint 0, coverage and audit gates passed.

🔴 **A FUNCTION PASSED ALL TEN OF ITS TESTS AND REAL MYSQL REFUSED IT** — `only_full_group_by`
needs SELECT and GROUP BY to carry the identical expression, which no mocked test can show. Fixed,
proved end to end on real rows, and the reason is a comment in `caseStore.js` and on T038. **Three
faults in two days found by running things, not by the suite.**

⚠ **US5 IS NOT FINISHED — NOTHING CALLS `countReviewStatus`.** T037/T038 done; **T039 (the
route) and T040 (the two screens) are the next step**, and the reach tiles are already drawn.
36 of 67 tasks. `activeOn` still names this machine for 4.97.

**4.100 was one phrase, not the general fault.** `sales-marketing` no longer counts *sales*
when *cost of* precedes it — *"our cost of sales keeps climbing"* used to route **outright**,
no question asked. A thin single keyword can still carry a conversation into the wrong area,
recorded honestly in `advisory-engine.md` §4 rather than claimed closed.

🔴 **4.97 IS NOW FIRST ON THE LIST**, moved from 7th on Mike's instruction — *"make sure its
at front of task list next time"*. Start there. Every other item kept its relative order.

🔴 **TWO RECORDS WERE STALE AND BOTH ARE CORRECTED.** The OpenAI account **has credit** (Mike
said so; a real gpt-4o-mini call from this desktop proved it) — 4.93's "no credits" blocker was
four days out of date and that item now waits on **us**, not Mike. And **4.99's environment half
is already fixed**: `NODE_EXTRA_CA_CERTS` points at the Avast root and AI-backed scripts DO run
here. 4.99 is renamed to the fault that actually remains — a part-measured lab run overwriting a
full one, which fired again today when an unrecognised flag made the lab run 0 cases with AI OFF
and overwrite the real 51-session report. Restored from git; nothing lost. **There is no
`--help`** — a wrong flag is read as a filter matching nothing, and it still writes.

`npm run build` NOT run (nothing tagged).

**LAPTOP:** your note is dated 2026-09-13 while your branch had a commit on 2026-09-15 — two
days stale, flagged at startup. You are 41 ahead of master. Shared files I touched:
`data/domains.json` (one keyword pattern), `server/utils/caseStore.js` (one new function,
nothing existing changed), `design/features/advisory-engine.md`. Merge `master` before those.
