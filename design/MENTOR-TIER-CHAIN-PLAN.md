# The tier chain — widening the cascade from two levels to five

> **Status: BUILT 2026-08-10** (laptop, session 39). Written before any code changed, per the
> Save-the-Artefact rule; Mike approved the direction in chat the same day. Suite **4,845 green
> / 282 suites**, lint 0 errors.
>
> **ONE DEVIATION from §3.4, named rather than left to be noticed.** The overlay folds the chain
> **bottom-up** (this scope first, then each level above), not top-down as §3.4 described. An
> existing test — `cascadingConfig.test.js` *"the mentor layer is read from the reserved scope,
> not from any firm"* — pins the read order, and that order is right: someone auditing the query
> log reads it as *"did it ask the reserved mentor scope, or go rummaging in another firm?"*.
> Folding top-down gives an identical answer while quietly reversing that log. The merge
> direction is unchanged (lower tier wins); **no existing test was modified.**

**The goal.** Today a firm inherits the mentor's content. Mike needs the same inheritance
through the two management tiers between them:

```
Mentor  →  Global Manager  →  Group Manager  →  Firm Manager  →  Advisor
```

---

## 1. What is already true (and why this is small)

The single inheritance mechanism — [`resolveInheritedRows.js`](../server/utils/resolveInheritedRows.js) —
was written to be widened, and says so in its own header:

> *"TWO LEVELS TODAY, DELIBERATELY. The platform → firm pair is what exists; the middle
> management tiers are added here ONCE, later, per the ruled sequencing (unify the mechanism
> first, then widen it). Nothing outside this file need change when they are."*

Five building blocks already cascade through it: Domain Support, Logic Tables, Advisory
Distinctions, the Advisory Staircase and Quizzes.

And the four-tier hierarchy already exists, fully modelled, in the Collaborate half —
[`server/collaborate/data/roles.js`](../server/collaborate/data/roles.js): `TIERS`,
`resolveTier`, `canManage`, and the tree *Global group → Country → Firm → Advisor*.

**So neither the mechanism nor the hierarchy has to be invented.** What is missing is the
join between them.

---

## 2. What is actually blocking a real group manager (NOT ours)

Both belong to the Advisor-e master team. Recorded here so it is never mistaken for our work:

- **No role exists.** [`roles.js`](../server/collaborate/data/roles.js) `tierFromRoleClaim`
  maps exactly two things — `platform_admin` → mentor, `firm_manager` → firm_manager.
  **No role value anywhere produces `global_group_manager` or `group_manager`.** The only routes in
  are a hardcoded `tier` on a seed record, or `ROLE_OVERRIDES`, which is an in-memory object
  (`const ROLE_OVERRIDES = {}`) that empties on every restart. The file says it plainly:
  *"NOT a substitute for the real Advisory JWT role the master team still wires."*
- **No membership data.** The `firms` table ([`config/db-schema.sql`](../config/db-schema.sql))
  has seven columns — id, name, slug, logo_url, primary_colour, persona_name, created_at.
  **No country, no group, no parent.** So "which firms are in the Germany group?" has no
  answer in our data. The Collaborate tier model gets country from the *advisor* record; the
  cascade store keys on *firm*. The two never meet.
- ⚠ The `group` table in our schema is a **Special Interest Group** (Collaborate: `group_member`,
  `group_tag`, `marketplace_listing`). It is a social group, **not** a management tier. Using it
  for the hierarchy would be a correctness bug.

**Asked of the master team 2026-08-10:** the two role values, and the firm→group→global
membership. Until then the middle tiers exist in code and hold nothing.

---

## 3. The design

### 3.1 One new seam: `server/utils/tierChain.js`

Every block that cascades currently hardcodes the same sentence: *"the level above me is the
platform scope."* Four call sites say it. This module replaces that sentence with a question.

```
parentScopeOf(scopeId)  →  the scope id one level up, or null at the top
scopeChain(scopeId)     →  [top … self], the full fold order
```

Reserved scope ids follow the existing `__platform__` convention, which exists because
`firm_framework_versions.firm_id` is foreign-keyed to `firms.id`, so every scope must be a real
row:

| Tier | Scope id | Row in `firms` |
|---|---|---|
| Mentor | `__platform__` | already seeded |
| Global Manager | `__global__:<globalGroup>` | seeded per global group |
| Group Manager | `__group__:<globalGroup>:<country>` | seeded per country |
| Firm Manager | the real firm id | already there |

The double underscores are what make a collision with a real Advisor-e firm id impossible —
the same reasoning that protects `__platform__`.

### 3.2 🔴 THE SAFETY PROPERTY THIS WHOLE PLAN RESTS ON

**With no membership data, `parentScopeOf` returns exactly what is hardcoded today.**

- `parentScopeOf(realFirmId)` → `__platform__` (we don't know its group, so we don't invent one)
- `parentScopeOf('__platform__')` → `null`

So the fold is a two-level fold, identical to today, and **every existing test must stay green
without modification.** That is the proof the change is behaviour-preserving — not an
assertion, a test run. The middle tiers light up when the master team supplies membership, with
no further code change.

**It fails toward today's behaviour, never toward a guess.** An unknown firm inherits the
mentor's content, which is what it does now.

### 3.3 ⚠ The id-collision trap, one tier wider

Phase 5 hit this exactly once and it nearly shipped: own-row ids mint per scope, so the
mentor's first added step and a firm's first added step were **both `fs-1`**, and a firm
switching off "its own" step would have dropped the mentor's. It was fixed by giving the mentor
`ms-` / `mq-`.

**Three tiers means three more prefixes, and they must all be distinct** — otherwise the same
bug returns with three new ways to hit it:

| Tier | Staircase | Quiz |
|---|---|---|
| Mentor | `ms-` | `mq-` |
| Global Manager | `xs-` | `xq-` |
| Group Manager | `gs-` | `gq-` |
| Firm | `fs-` | `fq-` |

(`x` for global because `g` is taken by group, and a near-miss between two adjacent tiers is
worse than an unmemorable letter.) Minted in
[`firmStaircase.js`](../server/utils/firmStaircase.js) and
[`firmQuizzes.js`](../server/utils/firmQuizzes.js), which already switch on scope.

**A test asserts the prefix set is distinct**, so a fifth tier cannot be added later by
someone who reuses a letter.

### 3.4 The four call sites

Each stops hardcoding `PLATFORM_SCOPE` as "the level above" and asks `parentScopeOf` instead.

| File | Today | After |
|---|---|---|
| [`firmOverlay.js`](../server/utils/firmOverlay.js) `loadFirmConfig` | one `_readActiveConfig(PLATFORM_SCOPE)` then `deepMerge` | fold `scopeChain` top-down, each level over the last |
| [`staircaseConfig.js`](../server/utils/staircaseConfig.js) `loadBlendedStaircase` | `isPlatformScope ? BASE : recurse(PLATFORM_SCOPE)` | `parent === null ? BASE : recurse(parent)` |
| [`quizConfig.js`](../server/utils/quizConfig.js) `loadBlendedQuizBanks` | same shape | same change |
| [`platformDistinctions.js`](../server/utils/platformDistinctions.js) | reads `PLATFORM_SCOPE` as origin | unchanged — it IS the origin; the chain sits above it |

The recursion already absorbs a store fault at each level without rejecting, so a broken middle
tier degrades to the level above rather than failing the session. That behaviour is inherited,
not new.

### 3.5 What does NOT change

- **Templates** (291 records, **zero ids**) and **`logic-lab-accepted`** still cannot cascade —
  array-shaped, no stable id to key a decision to. Unchanged by this plan and not smuggled in.
- **The coaching reference** — all 15 platform rows *do* carry stable `cr-` ids (the earlier
  handover note claiming otherwise is wrong, corrected 2026-08-10). Its blocker is different:
  it never joined `resolveInheritedRows` at all, and its firm side is append-only. A separate,
  smaller job — not part of this one.
- **Logic Lab** and the firm-side logic-table screens remain the desktop machine's.

---

## 4. Build order

1. `tierChain.js` + tests — the seam, with an empty membership map.
2. Prove the empty map is a no-op: **the full existing suite, unmodified, green.**
3. The four call sites.
4. The per-tier id prefixes + the distinctness test.
5. Three-level tests with a seeded membership map, proving mentor → group → firm inheritance,
   decline-beats-inherit at the middle tier, and no id collision between tiers.

---

## 5. Honest limits

⚠ **This cannot be demonstrated by logging in as a group manager**, because no such login
exists (§2). It is evidenced by tests against a seeded membership map — a weaker claim than a
live screen, and it is written down as one here rather than left to be discovered.

⚠ **Same shape as the firms-table read** shipped 2026-08-09, and as the defect found in session
37 where a dev fallback silently absorbed a foreign-key rejection for two signed-off features.
When MySQL and the real roles arrive, this is the second thing to check after the firms read.
