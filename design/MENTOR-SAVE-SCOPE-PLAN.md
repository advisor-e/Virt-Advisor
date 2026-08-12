# Mentor Hub — making a mentor's save land at mentor level

**Status:** ✅ **BUILT — Phases 1, 3, 4 and 5 are in the code** (2026-08-09). Phase 2 needed no
code change under the ruling; see the phase itself. The write path is finished. The three items
in §5 are still open and are still deliberately outside this plan.
*(The line this replaces read "PLAN — awaiting Mike's approval. Nothing in this document has been
built." Left visible rather than silently swapped: a stale status line is how a document starts
being quoted against the code.)*
**Written:** 2026-08-09 (laptop, `feat/advisor-progress`), after Mike asked to "finish the
Mentor Hub" and approved starting with the saving fix.
**Scope:** the write path only. Reads, the roll-up tabs and Template Check's "Apply it" are
named at the end as *not* in this plan.

---

## 1. What is actually wrong

The Mentor Hub renders twelve tabs. Nine of them are the Firm Manager's own tabs, re-scoped
one level up ([`pages/mentor.vue`](../pages/mentor.vue) renders
[`FirmManagerHub.vue`](../components/FirmManagerHub.vue) with `scope="mentor"`).

**Reading is correct.** With no override stored, every tier falls back to the platform content
in `data/*.json` — which is the mentor's own content. Nothing misleads on screen.

**Saving is not.** Every one of those tabs saves through the Firm Manager routes, and each of
those calls the overlay store with the caller's *firm*:

```js
// server/routes/firmManager.js:415 — and 20 more call sites in the same shape
const version = await overlay.saveFirmConfig(req.firmId, configKey, configJson, req.userEmail)
```

`req.firmId` comes from the verified token, never the browser — correct, and not the problem.
The problem is that a mentor has one too.

- The mentor is **not refused**. `requireManagerRole` allows `AUTH.managerRole` **or**
  `AUTH.adminRole` ([`firmAuth.js:228`](../server/middleware/firmAuth.js#L228)), and the interim
  mentor role *is* `platform_admin` = `adminRole`. So the save runs.
- The mentor's `firmId` is a placeholder. The dev bypass sets it explicitly:
  `firmId: DEV_FIRM_ID, // placeholder; the mentor view is not firm-scoped`
  ([`firmAuth.js:163`](../server/middleware/firmAuth.js#L163)).

**Consequence.** The mentor edits Domain Support at `/mentor`, presses Save, sees success — and
the edit is written as *one firm's private override*. No other firm inherits it. The mentor's
own platform content is unchanged. Nothing errors, nothing is blank, and the screen says it
worked. **This is the failure family the repo already has a name for: the record looks right and
the artefact is wrong.**

### 1.1 A second defect, found while proving the first

Two mentor features already dodge the problem with a reserved sentinel scope — they pass the
string `'__platform__'` where a firm id goes:

| Module | Constant | Config key |
|---|---|---|
| [`platformDistinctions.js:37`](../server/utils/platformDistinctions.js#L37) | `PLATFORM_SCOPE = '__platform__'` | `advisory-distinctions-platform` |
| [`templateCheckRulings.js:30`](../server/utils/templateCheckRulings.js#L30) | `PLATFORM_SCOPE = '__platform__'` | (its own key) |

**That write cannot succeed against the real database.** The column is foreign-keyed to a table
of real firms:

```sql
-- config/db-schema.sql:79
CONSTRAINT `fk_firm_fw_firm`
  FOREIGN KEY (`firm_id`) REFERENCES `firms` (`id`) ON DELETE CASCADE
```

There is **no `__platform__` row in `firms`** — grepped the schema and the whole repo; no seed
INSERT exists anywhere. So MySQL will reject the insert with a foreign-key error.

**Why nobody has hit it.** MySQL has never been provisioned. In development the save throws, is
caught, and falls back to a gitignored dev-JSON file — so it *appears* to work. In production the
same throw is deliberately re-raised, so the mentor would get a 500.

**This means Advisory Distinctions authoring and Template Check rulings — two finished, live-
verified features — break on the day the database arrives.** They are not broken now, and this
is not a regression anyone introduced; the constraint has simply never been exercised. It is
listed here because any fix to the save path has to decide what that column means, and deciding
it fixes this at the same time.

---

## 2. The decision this plan turns on — RULED

The `firm_id` column is already being used as "the scope that owns this config", with a value
that is not a firm. Three ways to make that honest were put to Mike.

> ### 🔴 RULED 2026-08-09 — **Option A: seed a reserved firm row.**
> Mike chose the reserved-row option over re-keying the table. The plan in §3 is written to that
> ruling. **Options B and C below are kept for the record only** — they are not alternatives to
> re-propose, and §3 does not depend on them.
>
> **What the ruling buys:** the two features currently broken against a real database (§1.1) start
> working for the price of one row, and no function signature changes anywhere.
>
> **What it costs, stated plainly so it is not a surprise later:** the firms table gains a row that
> is not a firm, and every future tier needs another one. §3.1 lists the places that read the firms
> table and therefore have to learn to skip it — that work is part of this plan, not a follow-up.

### Option A — seed a reserved firm row *(CHOSEN)*

Insert a row in `firms` with id `__platform__`, name *"Platform (mentor)"*.

- **For:** one line of SQL. Nothing else changes. The two existing features start working.
- **Against:** it is a fake firm in the firms table. It will appear in any firm list, count or
  admin screen that reads `firms` — including `listFirmIdsWithConfigKey`, which the mentor
  delete-promotion already uses. Every future tier (global, group) needs another fake row.
- **Verdict:** fastest, and it buys a small lie that gets more expensive each tier.

### Option B — drop the foreign key, treat the column as a scope id

Remove `fk_firm_fw_firm`; the column stays `VARCHAR(64)` and holds either a firm id or a
sentinel, enforced by the application.

- **For:** no fake rows, small change, matches what the code already does.
- **Against:** loses `ON DELETE CASCADE` — a deleted firm's overrides would be orphaned unless
  cleaned up in code. The column's meaning becomes a convention rather than a rule, which is the
  kind of thing that is obvious today and invisible in a year.

### Option C — name the tier properly *(recommended)*

Re-key the table to `(scope_level, scope_id, config_key)`:

```sql
`scope_level`  VARCHAR(16)  NOT NULL DEFAULT 'firm',   -- 'platform' | 'global' | 'group' | 'firm'
`scope_id`     VARCHAR(64)  NOT NULL,                  -- firm id, or the tier's id ('' at platform)
```

with the foreign key dropped (it can no longer apply to every row) and the two indexes re-keyed.

- **For:** the column says what it is. The two middle tiers Mike ruled in on 2026-07-30 (global
  manager, group manager) get a home without another schema change. The sentinel strings
  disappear. Version history and restore keep working untouched — they key off the same triple.
- **Against:** the largest of the three. Six functions in
  [`firmOverlay.js`](../server/utils/firmOverlay.js) gain a scope argument, and their call sites
  are updated.
- **Cost is at its floor right now.** MySQL has never been provisioned, so there is no data
  anywhere to migrate — this is a schema edit today and a live migration of firms' authored
  content later.

**Recommendation: Option C.** A and B both work this week; only C is still right when the group
and global tiers arrive, and the reason to prefer it — no data to move — expires the moment the
database is provisioned.

---

## 3. The plan (Option A, as ruled)

Four phases. Each ends green — the suite passes and the app runs — so this can stop after any
one of them. **No function signature changes**: `__platform__` keeps travelling through the
existing `firmId` argument, which is why this is the small version.

### Phase 1 — make the reserved scope legal, and invisible

Two halves, and the second is the one that is easy to forget.

**Seed the row.** `config/db-schema.sql` gains a reserved firm, created with the schema so it can
never be missing on a fresh database:

```sql
INSERT INTO `firms` (`id`, `name`, `slug`)
VALUES ('__platform__', 'Platform (mentor)', '__platform__')
ON DUPLICATE KEY UPDATE `id` = `id`;
```

**Then hide it.** This is §3.1 — a reserved row that leaks into a firm list is the whole cost of
this option, and it is paid here rather than discovered later.

- **Tests:** a platform-scope save succeeds against the schema; the row exists after a clean
  build; no firm-facing list returns it.

### 3.1 Every place that could count the reserved row as a firm

> **⚠ CORRECTED 2026-08-09, before building.** An earlier draft of this section listed **three**
> readers and named two of them wrongly. Checked against the code: **nothing in the backend queries
> the `firms` table at all** — not one SQL statement selects from or joins it. So the "firm list,
> count or picker" that draft warned about does not exist, and the Logic Lab Report is not a
> separate reader either: it builds its firm list from the same function as everything else
> ([`mentor.js:338`](../server/routes/mentor.js#L338) → `safeFirmIds` → `listFirmIdsWithConfigKey`).
> The claim is corrected here rather than left to be quoted later.

**There is one choke point, not three.** Every "which firms…" answer in the app goes through a
single function, which makes the exclusion one change with one test protecting every caller:

| Where | What it does | What it must do |
|---|---|---|
| [`firmOverlay.js`](../server/utils/firmOverlay.js) `listFirmIdsWithConfigKey` | returns every firm id holding an active config under a key | exclude `__platform__` **in SQL**, so no caller can forget and the row never crosses the wire |

Its two callers, and why the miscount would matter to each:

- **The mentor delete-promotion** (Stage D of the distinctions cascade) uses it to find the firms
  that customised a row the mentor is deleting. Including the platform scope makes the mentor's own
  set look like a firm to protect from the mentor.
- **The Logic Lab Report** uses it to count how many firms touched each lever. Its whole meaning
  rests on that number — five firms reads as a platform gap, two as "watch, don't act", one as that
  firm's preference. Counting the mentor shifts every row by one.

> **⏱ The report is safe today only by accident, and Phase 3 ends the accident.** The mentor's
> existing content sits under *different* config keys from firms' (`advisory-distinctions-platform`
> vs `advisory-distinctions`), so it never matches the report's lever keys. Once Phase 3 lands, a
> mentor's saves start arriving under the *same* keys firms use, and the collision becomes real.
> **This is why the exclusion belongs in Phase 1** — before the rows exist, rather than when the
> numbers start looking odd.

> **One shared constant, not three string literals.** `platformDistinctions.js` and
> `templateCheckRulings.js` each declared their own `PLATFORM_SCOPE = '__platform__'`, and this
> phase needed a third. Phase 1 gives it one home ([`platformScope.js`](../server/utils/platformScope.js))
> that the schema comment points at, so the day it changes it changes once — the
> [single-source-wiring](../CLAUDE.md) pattern the repo already uses. A test fails if any module
> under `server/` declares the literal again.

> **🔴 The integration hazard this uncovered.** `db-schema.sql` explicitly invites the Advisor-e team
> to *skip* the `firms` CREATE TABLE and repoint the foreign keys at their own table. That reader is
> exactly the one who would miss the seed row and hit the foreign-key error in production. The
> INSERT therefore carries its own loud instruction to run it regardless, and a test asserts that
> instruction is still present.

### Phase 2 — prove the two existing features actually work

`platformDistinctions.js` and `templateCheckRulings.js` need **no code change** under this ruling
— their writes simply stop being refused.

- **This is the phase that closes §1.1.** A test asserts a `__platform__` save is accepted by the
  real schema, so the defect cannot come back unnoticed.
- Without this phase the fix is believed rather than demonstrated, and §1.1 was found precisely
  because nothing exercised the constraint.

### Phase 3 — a mentor's save lands at mentor level

- The Firm Manager routes resolve the storage scope from the **verified identity** rather than
  assuming `req.firmId`: a mentor resolves to `__platform__`, everyone else to their own firm.
  One helper, so no route invents its own rule.
- A firm manager is completely unaffected — same scope, same rows, same behaviour.
- **Tests:** a mentor save writes the platform row and touches no firm's row; a firm manager
  cannot write the platform row even by asking — the scope is never read from the request body,
  which is the existing IDOR-safe rule extended one level up.

### Phase 4 — a firm inherits what the mentor authored

Today a firm's read looks at one row. Once the mentor has content of their own, the read has to
fold the chain: **file default → platform → (global → group) → firm**, each layer a sparse
override of the one above.

- `deepMerge` already generalises; `mergeEntry` becomes a fold rather than a 2-argument merge.
- **Tests:** a mentor edit reaches a firm that has overridden nothing; a firm's own edit still
  wins over the mentor's; a mentor edit to a field the firm has *not* touched still reaches
  that firm.

#### ✅ BUILT 2026-08-09 — and it covers less than this section promised

The fold lives in `loadFirmConfig` ([`firmOverlay.js`](../server/utils/firmOverlay.js)), so every
caller inherits it and no call site can forget. That part went as planned.

**What did not go as planned: it applies to four config keys, not to everything.** Checking the
stored shapes before writing the merge showed the "one function fixes all four content types"
estimate was wrong, for a reason that is not a shortcut and cannot be engineered around with a
bigger effort:

| Shape | Keys | Cascades? |
|---|---|---|
| **Map** `{ id: value }` | `domain-support`, `logic-trees`, `domain-support-sections`, `logic-tree-sections` | ✅ **yes — built** |
| **Array** | `templates`, `coaching-reference`, `advisory-distinctions`, `logic-lab-accepted` | ❌ no |
| **Row model** (declines / overrides / own) | Staircase, Quizzes, Distinctions | ◐ by a different route |

- **Arrays cannot express a delta.** The overlay rule replaces an array wholesale — correct for a
  firm editing one config, and fatal for inheritance: a firm holding a one-item array would blank
  the mentor's whole set *for themselves*. There is no "untouched entry" in a bare array to fall
  through to the layer above. Giving these ids would be a data-model change, not a merge change.
- ⚠ **CORRECTED 2026-08-10 — that last sentence is true of `templates`, and NOT of
  `coaching-reference`.** Measured: **0 of 291** records in `data/templates.json` carry an id, but
  **15 of 15** rows in `data/coaching-reference.json` do (`cr-…`), and `firmStaircase.js` cites
  that very `cr-` prefix as the precedent for its own. The coaching reference's blocker is that it
  never joined `resolveInheritedRows` — `server/utils/coaching.js` imports neither it nor
  `platformScope` — and its firm side is append-only, so no decline or override exists to inherit
  through. **A build job, not a data-model change.** The row above kept verbatim rather than
  rewritten: it is what the Phase-5 decision was taken against, and this is the correction to it.
- **The row-model content already resolves inheritance**, via `resolveInheritedRows`, against a
  base. A `deepMerge` fold underneath would apply inheritance twice. They inherit correctly by
  having the **mentor's resolved content become their base** — `loadBlendedStaircase(PLATFORM_SCOPE)`
  feeding the firm's blend. That is a real, tractable change and it is **Phase 5**, named here
  rather than left implied.

**So what a mentor can author today and have every firm inherit:** Domain Support and Logic Tables,
including their section placement. **Not yet:** the Advisory Staircase, Quizzes, Templates.
Advisory Distinctions already cascaded and still does.
*(Superseded by Phase 5 below for the Staircase and Quizzes — built 2026-08-09.)*

---

### Phase 5 — the Staircase and the Quizzes inherit too

#### ✅ BUILT 2026-08-09

The two row-model blocks resolve through `resolveInheritedRows` against a base, and that base
was the **shipped file**. So a mentor could add a staircase step or a quiz question, see it
saved, see it on their own screen with version history beside it, and no firm would ever get
it. Both now resolve against the **mentor's resolved content** instead.

The change is the same function calling itself one level up —
[`staircaseConfig.js`](../server/utils/staircaseConfig.js) and
[`quizConfig.js`](../server/utils/quizConfig.js), one rule for two tiers rather than a second
mechanism for the new one. The platform scope is the only level with nothing above it, which is
what ends the recursion. A firm that has decided nothing still gets the shipped object itself,
so the tuned behaviour every firm has today is byte-identical.

Tests: [`mentorTierCascade.test.js`](../tests/unit/mentorTierCascade.test.js).

#### 🔒 The security decision inside it, and why it went the safe way

Quiz questions carry a `source` tag, and anything not tagged `platform` is fenced before it
reaches the AI. **`source` describes a row's relationship to the level BELOW it** — so a
mentor's own question is `firm-own` on the mentor's screen and `platform` the moment a firm
inherits it. Reading `source` alone would therefore have quietly *un*fenced mentor-typed text on
its way into the prompt.

**Ruled the safe way: mentor-typed content stays fenced.** The bar is "not repo data", not "not
Advisor-e" — repo data passes code review and git history, a screen passes neither. And the
blast radius runs the wrong way: a firm's text reaches one firm, a mentor's reaches **every**
firm. A sticky `browserAuthored` flag is stamped at the level that typed it and never cleared,
so provenance outlives the tier it came from. `isFirmAuthored` was renamed `isBrowserAuthored`
in the same change — once the mentor tier could author questions, "the firm's" stopped
describing the set being fenced.

#### ⚠ The defect Phase 5 would otherwise have created — found while building, fixed here

Own-row ids are minted **per scope**, counted from the rows that scope already holds. So the
mentor's first added step and a firm's first added step were **both `fs-1`** (and both `fq-1`
for questions). Harmless while the two tiers never met — Phase 5 makes them meet in one resolved
list, and *every decision in the mechanism is keyed to an id*. A firm switching off "its own"
step would have dropped the mentor's instead.

The mentor now mints under `ms-` / `mq-` ([`firmStaircase.js`](../server/utils/firmStaircase.js),
[`firmQuizzes.js`](../server/utils/firmQuizzes.js)). This is collision-proof by construction
rather than by timing, and each future tier takes its own prefix. **No stored data is affected**
— no mentor own-rows exist anywhere, mentor-tier saving having started only in Phase 3.

> **How it surfaced is worth keeping.** Three existing test stubs answered the store without
> looking at *which scope* was asking, so they replayed a firm's own rows at mentor level — and
> reproduced the collision exactly. The temptation was to read that as mock noise and scope the
> stubs. The stubs did need scoping, but the duplicate they produced was real.

> **🔴 RULED 2026-08-09 (Mike): DELTA.** A firm stores only the fields it changed, merged over the
> mentor's at read time — the mechanism Advisory Distinctions already uses. The mentor's later edits
> keep reaching every firm for anything that firm has not touched; a firm's own change wins and
> sticks. Phase 4 is unblocked. Recorded in
> [`MENTOR-HUB-CONSOLIDATED-NOTES.md` §7.4](MENTOR-HUB-CONSOLIDATED-NOTES.md).
>
> **Original framing, kept because it is why the question was worth asking:**
> **⚠ Phase 4 contains a question Mike has not yet been asked** — recorded in
> [`MENTOR-HUB-CONSOLIDATED-NOTES.md` §7.4](MENTOR-HUB-CONSOLIDATED-NOTES.md) as the one open
> question "with a real cost attached". Does a lower tier hold a **delta** (only the fields it
> changed, merged live — so the mentor's later edits keep flowing) or a **clone** (a full copy
> taken once — so it goes stale the moment the mentor changes anything)? The distinctions cascade
> stores a delta; §4.1's wording *"each level clones the level above"* reads as a copy. **The
> staircase already hit this once** (2026-07-31: a firm override replaced the whole `steps` array,
> so that firm would never have seen a step the platform later added). Phases 1–3 do not depend
> on the answer. Phase 4 cannot start without it.

---

## 4. Risk and safety

- **No data can be lost.** There is no database and no stored override anywhere — verified, not
  assumed. Every override today lives in a gitignored dev-JSON file on one machine.
- **Nothing crosses the firm boundary.** No route in this plan reads another firm's content. The
  scope is always taken from the verified token, never from the request — the same rule that
  makes the current routes IDOR-safe, applied one level up.
- **Two features change behaviour in Phase 2** — Advisory Distinctions authoring and Template
  Check rulings. Both are mentor-only and both are currently writing to a dev file, so the
  observable change on Mike's machine is nil; the change is that they will work in production.
- **The reserved row is the known cost of Option A**, and the honest risk is not the row itself —
  it is a screen somewhere counting it as a firm. §3.1 lists the three readers found in the code
  and Phase 1 fixes all of them; the residual risk is a *fourth* one written later by someone who
  does not know the row exists. That is why the constant gets one home and the schema carries a
  comment, rather than the knowledge living in this document.
- **`FirmManagerHub.vue` is shared by two tiers.** A change made for one reaches the other.
  `mentorHubScope.component.test.js` is what makes that fail loudly — it must stay.
- **Stack Constitution:** all of this is Restify backend + raw SQL. No frontend logic, no new
  dependency, nothing that touches the locked versions.

---

## 5. Deliberately NOT in this plan

Named so they are visible rather than assumed done:

1. **Team Progress and Team Case Studies do not roll up** — both call firm-scoped routes, so at
   mentor level they show one firm. (*Adviser Network* already resolves tier server-side and is
   fine.)
2. **Template Check has no "Apply it"** — 93 rows can be ruled; each then reads *"Recorded — not
   yet applied to the table."*
3. **The two middle tiers have no screens.** Phase 1 gives them somewhere to store content; it
   does not build `/global` or `/group`.
4. **`AUTH.mentorRole` is still `platform_admin`.** Until the master team adds a real mentor role,
   a platform admin and a mentor are the same person to this code.
