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

🔴 **A FUNCTION PASSED ALL TEN OF ITS TESTS AND REAL MYSQL REFUSED IT.** `countReviewStatus`
selected `NOT (reviewed_at IS NULL)` grouped by `reviewed_at IS NULL`; `only_full_group_by`
does not see those as the same expression — `ER_WRONG_FIELD_WITH_GROUP`. The tests mock
`db.execute`, so none of them could show it and UAT would have been the first to find out.
**SELECT and GROUP BY now carry the identical `(reviewed_at IS NULL) = 0`, and a comment says
why.** Proved end to end afterwards: three throwaway rows at a borrowed firm returned 3
delivered / 1 reviewed, deleted by id. That is three faults in two days found by running
things, not by the suite.

⚠ **US5 IS NOT FINISHED — NOTHING CALLS `countReviewStatus`.** T037/T038 done; **T039 (the
route) and T040 (the two screens) are the next step**, and the reach tiles are already drawn.
36 of 67 tasks. `activeOn` still names this machine for 4.97.

**4.100 was one phrase, not the general fault.** `sales-marketing` no longer counts *sales*
when *cost of* precedes it. Measuring it found worse than filed: *"our cost of sales keeps
climbing"* scored profit 0 / sales 1 and routed **outright**, no question asked. A thin single
keyword can still carry a conversation into the wrong area — recorded honestly in
`advisory-engine.md` §4 rather than claimed closed.

**4.99 still stands** — no AI-backed script runs here, so the Scenario Lab was not run.
`npm run build` NOT run (nothing tagged). OpenAI top-up still with Mike (blocks 4.93).

**LAPTOP:** your note is dated 2026-09-13 while your branch had a commit on 2026-09-15 — two
days stale, flagged at startup. You are 41 ahead of master. Shared files I touched:
`data/domains.json` (one keyword pattern), `server/utils/caseStore.js` (one new function,
nothing existing changed), `design/features/advisory-engine.md`. Merge `master` before those.
