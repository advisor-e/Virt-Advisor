# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-12 · Desktop · branch `feat/firm-quiz-builder-ui`

**4.87 Outcome Learning is finished on our side and handed to UAT** (`b252e1e`): all 47 tasks
ticked, `activeOn` cleared, waiting on Mike. The quickstart was walked on the production build
against local MySQL: consent, a pooled row with no free text, the mentor's decisions and both
refusals, restore, both benches, the advisor's notice. Story 3 found **4.94 — "Why this?" named
the wrong hold-back and could hide one — fixed the same hour** (`02c1f5a`, closed on
done-and-parked §2). Not shown locally: withdrawal taking an adjustment below the floor, and a
second firm.

**Two things still with Mike:** the OpenAI top-up so a real "Read this for me" reading exists
(4.93), and whether the Break-Even-in-education acceptance at 15:42 on 2026-09-11 was his.

**Running the app:** `OUTCOME_POOL_SECRET` is still not in `.env`. Each session that picks a new
value leaves the previous seed's 31 rows in the pool under tokens nobody can withdraw; the pool
now holds 62 rows from two secrets. Put one value in `.env` and re-seed with `--reset` before
eyeballing Story 2 step 5.

Suite green: 499 suites, 10,331 tests. Tree clean, 56 ahead of master, 0 behind, pushed.

**LAPTOP:** none of your files touched. Shared files that changed under you:
`server/utils/templateResolver.js` (the pooled block and the scoring log),
`server/utils/outcomeLearningSession.js`, `design/features/to-do-items.json` (4.87 only),
`design/features/to-do-done-and-parked.md` (4.94 at the top of §2). Merge master before you
touch any.
