# Session Notes — 2026-08-09 (B) · Laptop, Session 37

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, level with `origin`, suite
> **4,725 green / 275 suites**, lint 0 errors, **17 ahead / 0 behind `master`**.
>
> Mike asked to "finish the Mentor Hub". The saving path is fixed for the two largest
> content areas. **It is not finished** — three things remain, named below rather than
> left for the phase numbers to imply.

---

## What the next session most needs to know

**A feature that has been live-verified can still be incapable of working.**

Advisory Distinctions authoring and Template Check rulings both write to a reserved scope,
`__platform__`, passed where a firm id goes. `firm_framework_versions.firm_id` is
foreign-keyed to `firms.id`, and **no `__platform__` row existed anywhere** — grepped the
schema and the whole repo. Neither feature could ever have written to a real database.

Both were built, tested, clicked through and signed off. Nothing was wrong with any of that.
The constraint had simply never been exercised, because MySQL has never been provisioned and
the dev path falls back to a gitignored JSON file that absorbs the rejection silently. In
production the same write raises a foreign-key error.

**Carry this:** "it works in dev" and "it is tested" are both true of code that cannot run.
Where a dev fallback catches an error, the thing being tested is the fallback. Fixed today
(`d360615`), and a test now asserts the seeded row exists and that the foreign key which makes
it necessary is still there.

---

## What was done

Plan and rulings: [`MENTOR-SAVE-SCOPE-PLAN.md`](MENTOR-SAVE-SCOPE-PLAN.md). Backlog entry:
[`ACTIONS.md` §mentor-save-scope](ACTIONS.md#mentor-save-scope).

### The defect Mike asked about (`11d9fb4` — the plan)

A mentor's save **succeeded into the wrong place**. `requireManagerRole` allows managerRole
**or** adminRole, and the interim mentor role IS adminRole — so the mentor was never refused.
The save ran, reported success, and landed under whatever firm the token claimed. The mentor's
own content was untouched, no firm inherited the edit, and the screen said it worked.

### Phase 1 (`d360615`) — the row that is not a firm

Schema seeds `__platform__`; the id gets one home
([`platformScope.js`](../server/utils/platformScope.js)) instead of two copies;
`listFirmIdsWithConfigKey` excludes it **in SQL**.

**The integration hazard is the part worth remembering.** `db-schema.sql` invites the
Advisor-e team, a few lines above, to *skip* the `firms` CREATE TABLE and repoint the foreign
keys at their own. That reader is exactly the one who would miss the seed row and meet the FK
error in production. The INSERT carries its own loud instruction, and a test asserts the
instruction is still present — it is the kind of comment that gets tidied away.

### Phase 3 (`fe12167`) — resolved once, not 156 times

`req.firmId` is read in ~156 places. The scope is resolved in the middleware so no call site
can forget. **Deliberately NOT in `attachIdentity`**, which `collaborateAuth` shares — the
people layer (`/api/people`, the Adviser Network tab) already resolves the caller's tier
server-side and is the one tab that works one level up. A test pins that it is not re-pointed.

### Phase 4 (`4f424ce`) — a firm inherits, where the shape allows it

🔴 **RULED (Mike): DELTA.** A firm holds only the fields it changed; the mentor's later edits
keep reaching it for everything untouched. The fold lives in `loadFirmConfig`.

**It covers less than the plan promised, and the estimate given to Mike was wrong.** "One
function fixes all four content types" fixes two. Corrected to him in the same session and in
the plan in-file.

| Shape | Keys | Cascades? |
|---|---|---|
| Map `{id: value}` | `domain-support`, `logic-trees`, and both `*-sections` | ✅ built |
| Array | `templates`, `coaching-reference`, `advisory-distinctions`, `logic-lab-accepted` | ❌ cannot |
| Row model | Staircase, Quizzes, Distinctions | ◐ Phase 5 |

**Arrays cannot express a delta and no effort changes that.** The overlay rule replaces an array
wholesale — right for a firm editing one config, fatal for inheritance: a firm holding a one-item
array would blank the mentor's whole set *for themselves*. There is no untouched entry to fall
through to the layer above. Giving those entries ids is a **data-model change, not a merge
change**. Recorded in `ACTIONS.md` explicitly so it is never re-scoped as "just add it to the list".

---

## Where the work stopped

**Cleanly. All five commits are pushed. Nothing is half-finished in code.**

Three things remain before "finish the Mentor Hub" is true:

1. **Phase 5 — Staircase and Quizzes do not inherit from the mentor.** They resolve a tier's
   decisions against a base (`resolveInheritedRows`), so they inherit by having the mentor's
   resolved content become that base — `loadBlendedStaircase(PLATFORM_SCOPE)` feeding the firm's
   blend. Not started. This is the next job.
2. **Team Progress and Team Case Studies show one firm, not a roll-up.** Both call firm-scoped
   routes. ⚠ **They now render EMPTY at `/mentor`** rather than showing a placeholder firm's data
   — a consequence of Phase 3 and the honest answer, but it looks different and Mike has been told.
   *Adviser Network is fine* and resolves its tier server-side.
3. **Template Check has no "Apply it".** 93 rows can be ruled; each then reads *"Recorded — not
   yet applied to the table."*

## On conflicts

Touched `config/db-schema.sql`, `server/middleware/firmAuth.js`,
`server/utils/firmOverlay.js`, `platformDistinctions.js`, `templateCheckRulings.js`, one new
util, three new tests, and four `design/` files. **`ACTIONS.md` is where a conflict would land.**

⚠ **`firmOverlay.js` and `firmAuth.js` are now shared machinery for every tier.** Merge `master`
before touching either. `cascadingConfig.test.js`, `mentorStorageScope.test.js` and
`platformScope.test.js` are what make a wrong change fail loudly — in particular, do not "tidy"
the `collaborateAuth is NOT re-pointed` test, which is the only thing protecting the Adviser
Network roll-up.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's.** Nothing here went near
`FirmLogicTables.vue`, `FirmLogicLab.vue` or `DecisionLogicDiagnostic.vue`.

## Open for Mike

- **Phase 5** — the next build, if he wants the Staircase and Quizzes inheriting too.
- **Reply to Carl about `npm install`.** He pulled `2beba9f` (= `v0.7.0` + two doc commits) on
  4 August — the first uptake of any release tag from this repo. **v0.7.0 adds `@mdi/font`;
  without `npm install` the tab icons render blank and it reads as a broken build.** Not yet
  confirmed with him. Row written in [`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md).
- **Decide on the `/startup` change** proposed in
  [§approved-mockup-stranded-on-a-branch](ACTIONS.md#approved-mockup-stranded-on-a-branch).
  *(Carried, unchanged — and it worked today: the drift check named the other branch, its commit
  subjects were read before building, and nothing was stranded.)*
- **Raise the export gap with the master-app team — SEVEN tools.** *(Carried, unchanged.)*
