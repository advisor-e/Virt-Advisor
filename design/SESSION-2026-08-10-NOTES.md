# Session Notes — 2026-08-10 · Laptop, Session 39

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, level with `origin`, suite
> **4,845 green / 282 suites**, lint 0 errors, **25 ahead / 0 behind `master`**.
>
> Mike asked for the Mentor Hub's cascade to reach the **global manager** and **group manager**
> tiers by Wednesday. **The mechanism is built and shipped.** It holds nothing until the master
> team supplies two things that are theirs, not ours — see below.

---

## What the next session most needs to know

**Two-thirds of a deadline can be ours and one-third somebody else's, and saying so early is
the whole value.** Mike wanted this live by Wednesday 12 August. Reading the code first showed
that the tier model already existed (`server/collaborate/data/roles.js` — a full four-tier tree,
built for Q-ROLES in July) and that `resolveInheritedRows` was written to be widened. So the
build was a day, not a week.

But **no role value anywhere produces `global_group_manager` or `group_manager`**, and the `firms`
table has no group or country column. Both are issued/owned upstream by Advisor-e. Told to Mike
before building, not after — he needed the lead time to ask them, and two days is already thin.

---

## What was done

### The tier chain (`fbaafb5`)

Design: [`MENTOR-TIER-CHAIN-PLAN.md`](MENTOR-TIER-CHAIN-PLAN.md) — **written and committed
BEFORE any code changed**, then marked BUILT with its one deviation. Read that file, not this
paragraph.

Four call sites each stated the same sentence — *"the level above me is the platform scope"* —
and that sentence, repeated, **is** what made the cascade exactly two levels deep. New
`server/utils/tierChain.js` replaces it with a question. `resolveInheritedRows` needed no change
at all.

🔴 **The safety property, and it is a test run rather than a claim.** With no membership data —
today — `parentScopeOf` returns exactly what the four sites hardcoded, so **the entire
pre-existing suite passes UNMODIFIED**. If widening the cascade had altered any existing
behaviour, 4,828 tests would have said so.

**One deviation, named:** the overlay folds **bottom-up**, not top-down as the plan's §3.4
described. An existing test pins the read order and it is right — the query log reads as *"did
it ask the reserved mentor scope, or go rummaging in another firm?"*, and folding top-down gives
an identical answer while quietly reversing that log. **The code changed; no existing test did.**

⚠ **The id collision, one tier wider.** Own-row ids mint per scope, so two tiers sharing a prefix
put two different rows under one identity — the Phase 5 defect, where a firm switching off "its
own" step would have dropped the mentor's. Three new tiers, three new prefixes (`xs-`/`gs-`,
`xq-`/`gq-`), and a test fails if anyone reuses a letter. **`x` for global because `g` reads as
group, and those two tiers are adjacent** — a near-miss between adjacent tiers is worse than an
unmemorable letter.

### Three record corrections

- **The coaching reference CAN inherit** — the claim in `ACTIONS.md` and
  `MENTOR-SAVE-SCOPE-PLAN.md` that it is "a bare array with no ids, a data-model change" is
  **wrong and was corrected in both files**. All 15 rows carry stable `cr-` ids, and
  `firmStaircase.js` cites that very prefix as the precedent for its own. Its real blocker is
  smaller: it never joined `resolveInheritedRows`, and its firm side is append-only. **Templates
  genuinely has none — 0 ids across 291 records** — so that half of the claim stands.
- **The Collaborate entry's table re-keying is SUPERSEDED**, struck through rather than deleted so
  nobody rebuilds the storage table later on its say-so. Mike ruled on 2026-08-09 — three weeks
  after it was written — that mentor storage is a reserved `firms` row, **not** a re-keyed table.
  The tier chain follows the later ruling.

---

## Where the work stopped

**Cleanly. One commit, pushed. Nothing is half-finished in code.**

🔴 **BLOCKED ON THE MASTER TEAM — and this is the whole of what remains:**

1. **The two role values** (`group_manager`, `global_group_manager`) in the Advisor-e login token.
   ⚠ Worth raising together: **`mentor` was never added either** — it is still borrowing
   `platform_admin`.
2. **Firm → country → global-group membership.** The `firms` table has no column for it.

**The control is at the point of use, not in a document:** the joining instructions are written
into [`config/db-schema.sql`](../config/db-schema.sql) beside the `__platform__` insert they
already have to run — including that a missing tier row is **rejected by the foreign key while
the dev fallback reports success anyway**. That is exactly how the mentor's own saves ran broken
for weeks; it is the second time this trap has been written down, and the first time ahead of it
rather than after.

## On conflicts

Touched `server/utils/` (tierChain **new**, firmOverlay, firmQuizzes, firmStaircase, quizConfig,
staircaseConfig), `config/db-schema.sql`, and three `design/` files. **`ACTIONS.md` is where a
conflict would land**, as always.

⚠ **`staircaseConfig.js` / `quizConfig.js` no longer import `platformScope`** — they ask
`tierChain.parentScopeOf` instead. A stub that assumes the old two-level shape will not fail
loudly; it will simply never consult a middle tier.

⚠ **`firmOverlay.loadFirmConfig` now issues up to four reads instead of two** for a cascading
key. With no membership data it is still exactly two, in the same order. A test that counts
queries will only notice once membership exists.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's.** Nothing here went near
them.

## Honest limits

⚠ **None of this can be demonstrated by logging in as a group manager, because no such login
exists.** It is evidenced by tests against a seeded membership map — a weaker claim than a live
screen, written down as one on the artefact §5. **Same shape as the firms-table read of
2026-08-09.** When MySQL and the real roles arrive, this is the second thing to check.

## Open for Mike

- **Ask the master team for the two roles + the membership** — the Wednesday deadline rests
  entirely on this. Point them at the block in `config/db-schema.sql`; it needs no explanation.
- **The checklist page** — Mike's next focus, not yet described or started.
- **Rule the 93 Template Check rows** — the queue stays empty until he does. Confirmed by running
  the check: 51 *nothing matches* + 42 *probably this*. *(Carried, unchanged.)*
- **Reply to Carl about `npm install`** — v0.7.0 adds `@mdi/font`; without it the tab icons render
  blank and it reads as a broken build. *(Carried, unchanged.)*
- **Raise the export gap with the master-app team — SEVEN tools.** *(Carried, unchanged.)*
- **Decide on the `/startup` change** proposed in
  [§approved-mockup-stranded-on-a-branch](ACTIONS.md#approved-mockup-stranded-on-a-branch).
  *(Carried, unchanged.)*
