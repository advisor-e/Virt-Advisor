# The Tier Cascade — the Brief

> **Read this before building anything that a manager sees, or anything a firm can
> configure.** Current rules only. The arguments, reversals and the two occasions this was
> got wrong are in [`tier-cascade-history.md`](tier-cascade-history.md) — after this page.
>
> **Covers:** the six levels, what flows down to them, what reports back up, and how a level
> is named in storage. **Does not cover:** login, accounts, roles or templates — those are
> Advisor-e's, not ours (see P1).

---

## 1. Design philosophy

**The cascade is a quality feedback loop, not an org chart.**

> *"The information and tools cascade down so we share the tools effectively, the reports
> cascade up so we learn what is working, what isn't, who is failing so we can offer help."*
> — the owner, 2026-08-10

Two directions, one shape. **Tools go down** so that good advisory material reaches everyone
rather than staying with whoever wrote it. **Reports come up** so the people who can help know
who needs it. Take either direction away and the loop stops being a quality system and becomes
either a filing cabinet or a league table.

That is why the tone rule below is not decoration. The typical user of this app is **learning
on the job, in front of a paying client** — not a confident specialist. Advisor-e's promise is
"learning just in time". A report exists to find where the product is failing the learner, so
somebody can act. **A screen written for a confident expert is written for the wrong person.**

The second idea doing a lot of work: **every tier is the same screen, re-scoped.** There is no
per-tier functionality, and there never should be. A firm manager sees their advisers; a group
manager sees their firms; the shape is identical. The moment a tier gets its own feature, the
model has been broken.

---

## 2. Key principles — the non-negotiables

**P1 · If it needs login, accounts, the org chart, roles or templates, it is not ours.**
Advisor-e owns all of it. Do not design a screen for it, do not hold a copy of its data, do not
mint an id for it. This app holds **advisory decision configuration** — the material the AI
draws on, the decision trees, the language, the client journey, the capability questions — and
the record of what people did with them. Nothing else.

**P2 · Never invent or shorten a role name.** The six are fixed:
`mentor` · `global_group_manager` · `group_manager` · `firm_manager` · `advisor` ·
`business_entity`. Spoken: mentor, global group manager, group manager, firm manager, advisor,
business entity. A global group is a **brand**; a group is normally a **country**; a firm is a
**branch**. `tierVocabulary.test.js` fails the build if a superseded spelling appears anywhere
in the source **or** in `design/`.

**P3 · A level holds only its changes, never a copy.** An untouched row keeps receiving the
level above's improvements automatically. A row a level *has* edited is protected, and the
level above's later change is **offered** — Adopt / Keep mine — never silently applied.
Clone-like protection where someone made a decision; automatic freshness where they did not.

**P4 · Every report rolls up, to the level immediately below, summarised.** No per-report
exceptions, ever. Firm manager → its advisers. Group manager → its firms. Global group manager
→ its groups. Mentor → its global groups. Deciding report-by-report which tier "should" see
something invents per-tier functionality and creates an exception list somebody must re-derive
later.

**P5 · Every tab and every report names the tiers it belongs to. Never gate on a negative.**
A gate written as `scope !== 'mentor'` answers *yes* for a tier that does not exist yet. The day
a third scope appears, such a tab switches itself on silently and nothing fails.

**P6 · No new code takes a bare `firmId` as its scope.** A route resolves a **tier** and a
**scope**; a firm is one possible value, never the assumed one.

**P7 · Every cross-firm row carries its origin.** A report that shows something is wrong
without showing **where** is an alarm with no address. The origin is a *path* — the level
immediately below the viewer first, the firm last. Naming a firm to the manager above it is not
a disclosure; what stays hidden is the **adviser** and the **client**.

**P8 · A tier with nothing to show says so on screen.** An empty roll-up and a broken one must
never look alike.

**P9 · Tone is help, never score.** The users are learning. A badge means *act*, not *glance*.

---

## 3. Design considerations

**The advisor is a pass-through and the business entity is a recipient.** Neither authors
anything here, so neither gets override storage. The business entity is an *entity*, not a
person — it may have several people, which is why the tier is not named after one.

**Arrays deliberately cannot cascade.** An array replaces wholesale, so a level holding a
one-item array would blank the level above's entire set for itself. That is why `templates` and
`logic-lab-accepted` are absent from the cascading keys. A correctness decision, not an
omission.

**Two mechanisms, and they are not interchangeable.** `deepMerge` is for map-shaped config
where an untouched entry falls through to the layer above. `resolveInheritedRows` is for blocks
where each row is a *decision* — switch it off, edit it, reset it, or add your own. Six blocks
cascade: Domain Support, Logic Tables, Section placement, Advisory Distinctions, Advisory
Staircase, Quizzes.

**Own-row id prefixes must stay distinct per tier**, or one level switching off "its own" row
silently drops another's: mentor `ms-`/`mq-`, global `xs-`/`xq-`, group `gs-`/`gq-`, firm
`fs-`/`fq-`. `x` for global, because `g` reads as *group* and the two tiers are adjacent.

**Some roles are real but deliberately unmodelled.** Global Coach, Group Coach and Curator are
genuine Advisor-e roles. They need no pages and no code here. **Do not add them to the code,
and do not delete them from the design record** — the trap runs both ways.

---

## 4. For the coder

### Where things live

| Piece | Path |
|---|---|
| The one seam — parent scope, chain, origin path | `server/utils/tierChain.js` |
| Override storage, version history, restore | `server/utils/firmOverlay.js` |
| Row-level inheritance | `server/utils/resolveDistinctions.js` |
| Scope resolution on a request | `server/middleware/firmAuth.js` |
| The one screen every tier renders | `components/FirmManagerHub.vue` |
| Thin per-tier pages | `pages/mentor.vue` · `pages/firm-manager.vue` · `pages/group-manager.vue` · `pages/global-group-manager.vue` |

### Scope identity

Reserved scope ids ride the **existing `firm_id` column** — the owner's reserved-row ruling, no
schema change:

| Tier | Scope id |
|---|---|
| Mentor | `__platform__` |
| Global group manager | `__global__:<brand>` |
| Group manager | `__group__:<brand>:<country>` |
| Firm manager | the real firm id |

Double underscores make a collision with a real Advisor-e firm id impossible.

### Traps that have actually bitten

1. 🔴 **A new tier scope needs its reserved row in `firms` seeded**, or its saves are
   foreign-key refused. This used to be silent — the dev fallback reported success while
   nothing was written. That specific fault is now fixed (`dbFailure.js` discriminates on
   `sqlState`), but seeding the row is still required.
2. ✅ **The negative tab gates are FIXED — keep them that way.** `TAB_TIERS` in
   `FirmManagerHub.vue` is now the whole matrix in one place, and **every entry names its tiers
   positively**. That was done because three tabs had been gated on `scope !== 'mentor'`: the
   moment a third scope existed, Team Progress and Team Case Studies would have switched
   themselves on at the new tiers while Advisory Distinctions vanished from them — nothing
   erroring, no test failing. Adding a fifth scope now shows up as a **missing** tab, which is
   visible, rather than one that appears uninvited. `hubTabTiers.test.js` pins the firm and
   mentor columns to what they showed before the middle tiers existed. **Do not reintroduce a
   `v-if` gate on a negative.**
3. ⚠ **`config/db-schema.sql` has a `group` table and it is NOT a management tier.** It is a
   Collaborate Special Interest Group — social. Reading it as a tier would be a correctness bug.
4. **`assertNoPersonalFields` throws rather than filters.** Leave it that way. A silent filter
   would hide the day the payload shape changed.

### The one named exception to "every report rolls up"

**Template Check is mentor-only**, and the owner narrowed it himself the day after ruling that
every report rolls up: *"we use it to improve the overall system. it does not relate to
people/advisor performance or group manager selection/access permission to templates."* It is
also the only report with **no firm dimension** — it scans the shared master catalogue against
the logic tables, so there is nothing in it belonging to a group that could be shown to that
group. Its routes keep the mentor-role guard rather than the managing-tier guard the other
reports moved to. This makes each middle hub **12 tabs, not the 13 first drawn**.

### The honest limit

**The middle-tier hubs are built** — `pages/global-group-manager.vue` and
`pages/group-manager.vue` render the same hub at the new scopes — **and they hold no real data.**
Both reasons belong to Advisor-e, not to us: no role value produces `global_group_manager` or
`group_manager` (and `mentor` still borrows `platform_admin`), and the `firms` table has no
country, group or parent column. Without a membership map, `parentScopeOf` returns the mentor
scope for every firm and the chain runs mentor → firm, exactly as it did before the chain
existed.

⚠ **In development the two middle hubs show INVENTED firms.** Membership is seeded from
`data/dev-firm-membership.json` and the server says so loudly at startup. Do not read those
screens as real firms, and do not demonstrate them to anyone as though they were.

⚠ **This cannot be demonstrated by logging in as a group manager, because no such login
exists.** It is evidenced by tests against a seeded membership map — a weaker claim than a live
screen, and it should be stated as one.

**The coaching reference does not inherit.** Its 15 rows carry stable `cr-` ids; it simply never
joined `resolveInheritedRows`, and its firm side is append-only.

---

## 5. Related briefs

[`firm-manager-hub.md`](firm-manager-hub.md) — the screen every tier renders ·
[`advisory-distinctions.md`](advisory-distinctions.md) — the row-inheritance mechanism the rest
came up to · [`collaborate.md`](collaborate.md) — the roll-up that already works and is the
model for the others.

**History, and the two occasions this was got wrong:**
[`tier-cascade-history.md`](tier-cascade-history.md)
