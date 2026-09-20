# Handover — the desktop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the laptop's is
> [`HANDOVER-laptop.md`](HANDOVER-laptop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-21 · Desktop · branch `feat/firm-quiz-builder-ui`

**PR #101 MERGED — everything from before it is on `master`.** Suite **12,341 green** (570
suites), lint 0, coverage and audit gates passed. Tree clean. **26 live items.**

🔴 **7.12 IS THE LAPTOP'S; THIS MACHINE'S JOB IS 7.13.** Merging `master` did not clear the
duplicate `check:branch` warned about — **it produced it**, and `itemIdentity.test.js` (which
arrived in that same merge) caught it immediately. Applied from Mike's existing ruling in
[`ITEM-NUMBERING.md`](ITEM-NUMBERING.md) §2026-09-19, not re-decided. ⚠ **Do not fix this again
from the laptop** — both machines fixing it independently is how it started.

🔴 **ITEM 17 — MIKE WANTS THE WHOLE SALES TRACKER, AND THE BUILD PLAN IS WRITTEN.** His ruling:
all eight screens, not the pipeline-and-COI subset the survey recommended. **Plan is
[`features/sales-tracker.md`](features/sales-tracker.md) §7 onward** — 7 stages, **12–21 days**,
each priced. `activeOn` is set to **desktop**. **Start at stages 1+2: schema with `firm_id`, then
Pipeline end to end.**

🔴 **THE BLOCKER NOBODY HAD PRICED: that app has no concept of a firm.** No table carries
`firm_id`, and pipeline/COI say *"shared across the firm"* in their own comments. Ported as-is,
**one firm would see another firm's prospects and fee values** — score-5 privacy, not a schema
tidy-up. It is invisible in the screens, which is why the plan states it first.

**THE APP RUNS — go and look before designing anything.** `localhost:3100` from
`E:/…/sales-tracker-nuxt-clean` (Node 20, not 14.15 — its Prisma will not parse on 14.15).
`mike@advisor-e.com` / `Advisor2026!`, **and you must start at `/login`** — see below.

⚠ **TWO BUGS FOUND BY DRIVING IT, BOTH DIAGNOSED IN THE BRIEF §7.** Their firm-manager middleware
had no `process.server` guard (**fixed and committed in their repo**, `107c903`); and **`/` is the
Blog page and needs no login**, so a visitor who never signs in is bounced from every tab. The
second cost an hour, **three wrong theories are recorded so nobody repeats them**, and it was found
only by driving a real browser the way Mike actually used it. `curl` reported a healthy server
throughout. [[feedback_walk_the_conversation]] is updated to cover any screen.

**LAPTOP — shared files I changed:** `to-do-items.json`, `to-do.md`, `features/README.md`,
`strategy-planner.md` and 15.1's note (both wrongly said the concept drawings were not wired in —
they are, 28 of 33; you flagged the same thing and asked to be consulted, and Mike approved the
fix). **Your 7.5, 15.1 and 15.7 are untouched.**

**NEXT:** item 17 stages 1+2. **7.13** is also unclaimed, with build steps in `advisory-engine.md` §4.
