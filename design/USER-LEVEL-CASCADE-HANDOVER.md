# User-Level Cascade — Handover to the Master Coding Team

**Status:** Design + integration-seam inventory. Authored 2026-06-26.
**Corrected 2026-08-13** — see the box below. Three things had gone out of date in the
seven weeks since; the role model itself had not.
**Purpose:** Define the user levels and the cascade rule that governs them, and hand the
master coding team a precise, grounded list of the connection points in *this* app
(Virt Advisor) where their Global→Group→Firm cascade plugs in.

> 🔴 **WHAT CHANGED ON 2026-08-13, and why a reader needs to know before Part 3.**
> This document was written before the tier work of August 2026 was designed or built.
> Three passages had been overtaken by rulings made since, and one of them would have
> sent the master team building the wrong thing:
>
> 1. **Part 3 — "the one open decision" — IS NO LONGER OPEN.** It offered two database
>    shapes to choose between. Mike ruled a third on **2026-08-09**, and that is what is
>    built and tested. Part 3 now records the ruling instead of asking the question.
> 2. **"A firm cannot push anything upward"** was true of *content* and is now wrong as a
>    general statement. Mike ruled on **2026-08-10** that **every report rolls up**. Both
>    directions are stated together in Part 1 rather than left to be reconciled.
> 3. **The level at rank 2 had lost the word "group" from its name.** It is **global group
>    manager** / `global_group_manager`, and the short form is what produced an invented job
>    title twice in one session. The superseded spelling is **not written out here** — that
>    is not squeamishness: `tests/unit/tierVocabulary.test.js` scans `design/` too and fails
>    the build on it, precisely so a stale name cannot survive inside the note explaining
>    that it is stale. *(It caught this very edit on 2026-08-13.)*
>
> **The role model was NOT stale and has not been changed.** The coach roles below are
> real — confirmed by Mike 2026-08-13. An earlier reading of this file treated them as an
> error to be tidied away. They are not.
>
> **Scope of this document.** This app does **not** gain new per-role functionality. The
> four new middle roles all operate this app *as if they were a Firm Manager*. The work
> here is to make the connection points explicit so the master team can attach the
> cascade — which lives upstream in Advisor-e and its SQL database — without ambiguity.

---

## Part 1 — The Role Model (plain English)

### The seven levels

| Level | Role | Value this app understands | Operates this app as… |
|------|------|------|------------------------|
| 1 | **Mentor** | `mentor` | Platform owner (Mike). Makes app changes; authors content, domain logic trees, summary documents; seeds the baseline distinctions every firm starts with. |
| 2 | **Global Group Manager** | `global_group_manager` | — same screens as a Firm Manager — |
| 2 | **Global Coach** | *(none — see below)* | — same screens as a Firm Manager — |
| 3 | **Group Manager** | `group_manager` | — same screens as a Firm Manager — |
| 3 | **Group Coach** | *(none — see below)* | — same screens as a Firm Manager — |
| 4 | **Firm Manager** | `firm_manager` | Closest to the advisor and client. Final say on editability and visibility within the firm. |
| 5 | **Advisor** | `advisor` | Uses the engine with the client; sees what the Firm Manager allows. |

The four middle roles (Global/Group × Manager/Coach) **have no distinct functionality in
this app**. They access the same Firm-Manager-level surface. What differs *between* them —
who introduced which content, and whose thinking cascades to whom — is resolved **upstream
in Advisor-e + SQL** by the master coding team.

🔴 **THE COACH ROLES, AND THE CURATOR ROLE, ARE REAL — AND THIS APP DELIBERATELY DOES NOT
MODEL THEM.** Confirmed by Mike, 2026-08-13: *"real roles but do not have need for special
pages. All document cloning and major access permissions granted by the roles you have been
given. There is also a Curator role but again, no need to concern this app code."*

- **No page, no tab and no permission in this app keys off a coach or curator role.**
  Document cloning and the major access permissions are granted by the five values in the
  table above. That is why the middle column is empty for the coaches, and why Curator has
  no row at all.
- **Their absence from the code is a decision, not an omission.** Recorded here because a
  reader who finds them in this document and not in `roles.js` will otherwise conclude one
  of the two is wrong and "fix" it. On 2026-08-13 exactly that happened, and the document
  was nearly corrected toward the code.
- **This app's own tier vocabulary is a different and narrower list** — the six values
  pinned by `tests/unit/tierVocabulary.test.js`: `mentor`, `global_group_manager`,
  `group_manager`, `firm_manager`, `advisor`, `business_entity`. It is *this app's scope*,
  **not** the whole Advisor-e role model. Neither list is a subset of the other by accident:
  Advisor-e has roles we do not model, and we name a `business_entity` level that this
  document's Part 1 stops short of.
- ⚠ **One consequence worth naming for the master team.** `resolveTier` in
  [`roles.js`](../server/collaborate/data/roles.js) falls through to `advisor` for any role
  value it does not recognise. So a token whose *only* role claim is a coach value resolves
  to advisor here. That is the safe direction to fail, and it is the current behaviour by
  design — but if a coach is meant to see the manager surface, their token needs to carry
  the corresponding manager value. **That is an Advisor-e decision, not a change to make
  here.**

### The cascade rule (the governing principle)

> **Content and influence flow DOWN. Reports flow UP. Override authority sits at the firm.**

🔴 **CORRECTED 2026-08-13 — this rule used to read "influence flows down only", and read
alone it denied the upward half.** Mike's governing principle, ruled 2026-08-10:

> *"Every quality system requires a feedback loop, a way to make sure we can improve. The
> information and tools cascade down so we share the tools effectively, the reports cascade
> up so we learn what is working, what isn't, who is failing so we can offer help."*

**Every report rolls up — no exceptions — and each level sees the level immediately below
it, summarised**, never a flat roster of everything beneath it. The full table is in
[`TIER-CASCADE-MAP.md` §3](TIER-CASCADE-MAP.md). The two directions are not in tension:
**configuration** only ever moves down, **reporting** only ever moves up, and neither
carries the other's payload.

- **Mentor / Global / Group** decide what content is *introduced* and seeded downward.
  Each layer **inherits** from the layer above it.
- The **Firm Manager**, being closest to the advisor and client, has the **final say on
  editability and visibility** — what their advisors and clients actually see.
- A firm **cannot push CONFIGURATION upward or sideways**: no influencing the Global Group,
  the Group, or any other firm. Authority over content is **total within their firm, zero
  outside it**. *(This clause said "cannot push anything upward" until 2026-08-13 — it is
  about configuration, and reports are the deliberate exception above.)*
- **Future direction:** firms will be able to override the Mentor's thinking for their own
  firm. The baseline is a *starting point*, not a lock. (Any genuinely locked platform
  defaults are a separate, explicit decision — see [[design_growth_locked_protected_ip]].)

### Why the architecture already enforces this

The firm is the **last layer in the merge chain**, so it always gets the final word on
what reaches its advisors and clients. Because a firm can only ever *write to its own
layer*, it is **structurally incapable** of pushing changes up or sideways. The rule is
enforced by the shape of the system, not by a policy someone has to remember.

The cascade simply inserts **Global** and **Group** as additional inherit-only layers
between Mentor and Firm:

```
Mentor (platform baseline)
   └─ Global override
        └─ Group override
             └─ Firm override   ← final say on what Advisor/Client sees
                  └─ Advisor / Client (read what the Firm allows)
```

This is the existing **Mentor → Firm → Advisor** distinctions cascade with two new middle
layers spliced in. The merge order is the precedence order.

---

## Part 2 — Integration-Seam Inventory (for the master team)

Every place in this app where (a) firm identity enters from auth, and (b) per-firm
overlays/distinctions resolve on top of the Mentor baseline. The app is already a
layered-override system: there are a **small number of central doorways**, not scattered
logic. Line numbers are accurate as of 2026-06-26 — confirm against current source before
editing.

### A. Auth / firm-identity injection — *the front door*

- **`server/middleware/firmAuth.js`** — single entry point. `firmAuth()` verifies the JWT
  and stamps the request with `req.firmId`, `req.advisorId`, `req.userRole`,
  `req.userEmail`. **Extension point:** also stamp `req.groupId` and `req.globalId`.
  `requireManagerRole()` currently validates two roles only (`firm_manager`,
  `platform_admin`) — must become tiered to recognise Global/Group managers.
- **`config/integration.js`** — the `AUTH` block hardcodes the JWT claim names and role
  strings. **Extension point:** add `groupIdClaim`, `globalIdClaim`, and the new role
  constants here.
- **`server/restify-server.js`** — mounts `firmAuth` + `requireManagerRole` uniformly on
  protected routes. Per-route scope guards (firm-level vs group-level vs global-level) get
  added here once the tiers exist.

### B. Overlay / cascade resolution — *the loader*

- **`server/utils/firmOverlay.js`** — **the critical seam.** `loadFirmConfig(firmId,
  configKey)` is the single read point for all firm overrides; `deepMerge()` does the
  base+override merge; `saveFirmConfig()` writes a new version. **Extension point:**
  cascade-load **Global → Group → Firm** and merge in precedence order. `deepMerge()` is
  already chainable and should not need to change; the loader does.
- **`server/utils/firmDistinctions.js`** — `loadFirmDistinctionState()` loads the three
  distinction config keys for a firm. **Extension point:** load and merge the Global and
  Group instances of the same keys before the firm's.
- **`server/utils/resolveDistinctions.js`** — `resolveEffectiveDistinctions()` is the pure
  resolver (platform base + firm declines/overrides/own-rows → effective list). Either
  pre-merge the Global/Group state into the firm state, or extend it to accept all tiers.
- **`server/advisorEngine.js`** — the recommendation engine reads overlays at three points
  (firm template override, firm staircase override via `deepMerge`, firm distinction
  state). All three must use the cascade-aware loaders once they exist.
- **`server/routes/firmManager.js`** — `getFramework`/`saveFramework`/`importTemplates`
  are the Firm-Manager read/write points. **Extension point:** route the write to the
  correct scope (global/group/firm) based on the request identity.

### C. Storage — *settled 2026-08-09; no schema change, but one insert*

- **`config/db-schema.sql`** — `firm_framework_versions` is keyed by `(firm_id,
  config_key)`, and the database understands **firm only**. ✅ **That is now sufficient**:
  Part 3's ruling puts each tier's reserved scope id **in that same `firm_id` column**, so
  no table, column or migration is added. What the team must do instead is **insert the
  reserved `firms` row for each tier** — see Part 3's warning box, because without it a
  save is refused by the foreign key while the screen reports success.
- Cases/visibility (`server/utils/caseStore.js`, `server/routes/cases.js`) and Drive
  folders (`server/services/driveService.js`) are likewise firm-scoped (base-or-firm).

### D. Master export / per-firm content

- **`server/utils/masterExport.js`** — loads the newest `search_content_*.json` from
  Central Frameworks as the **global Mentor baseline**. Per-firm template uploads go
  through `importTemplates()` in `firmManager.js`. Decision for the master team: do
  Global/Group tiers get their own export uploads, or does this stay a single Mentor
  baseline with overrides layered on top?

### E. Hardcoded role / tier handling to revisit

- **`config/integration.js`** — `managerRole`/`adminRole` (two roles only).
- **`server/middleware/firmAuth.js`** — `requireManagerRole()` (two-role check).
- **`server/utils/activityLogger.js`** — carries a note that advisorId/firmId should come
  from the verified JWT once auth is wired; extend to the new ids.
- *(Note: the `highest_tier` ENUM on templates/courses is **content** classification —
  entry/intermediate/advanced — and is unrelated to user roles. Leave it alone.)*

---

## Part 3 — Storage scope: RULED 2026-08-09, and no longer a question

> 🔴 **THIS SECTION USED TO ASK THE MASTER TEAM TO CHOOSE BETWEEN TWO DATABASE SHAPES.
> DO NOT ANSWER THAT QUESTION — IT WAS SETTLED A DIFFERENT WAY, AND THE ANSWER IS BUILT.**
> The two options offered here until 2026-08-13 were *parallel tables*
> (`global_framework_versions`, `group_framework_versions`) and a *polymorphic
> `scope_type` + `scope_id` column*. **Neither was adopted.** Anyone who implements either
> one now will be building against a shape this app no longer uses. The superseded options
> are named rather than deleted, so a reader holding an older copy can tell it is older.

**The ruling (Mike, 2026-08-09): reserved scope ids ride the EXISTING `firm_id` column.**
No new table, no new column, no schema migration.

| Tier | Scope id stored in `firm_id` | Row needed in `firms` |
|---|---|---|
| Mentor | `__platform__` | seeded already |
| Global group manager | `__global__:<brand>` | one per global group |
| Group manager | `__group__:<brand>:<country>` | one per country |
| Firm manager | the real Advisor-e firm id | already there |

Double underscores make a collision with a real Advisor-e firm id impossible. The single
seam is [`server/utils/tierChain.js`](../server/utils/tierChain.js) — `parentScopeOf` /
`scopeChain` — and [`firmOverlay.js`](../server/utils/firmOverlay.js) walks the chain
bottom-up, merging with the existing `deepMerge`. Both are built and tested.

### 🔴 The one thing that WILL bite whoever deploys this

**Every tier scope needs its reserved row in `firms` before anything is saved at that
tier.** Without it the save is **refused by the foreign key while the screen reports
success** — the fault that ran the mentor's own saves silently broken for weeks. The
insert instructions sit in [`config/db-schema.sql`](../config/db-schema.sql), beside the
`__platform__` insert the team already has to run.

⚠ **NOT the `group` table** further down that same file. That is a Collaborate **Special
Interest Group** (`group_member` / `group_tag` / `marketplace_listing`) — a social group.
Reading it as a management tier would be a correctness bug.

### What IS still open, and it is genuinely Advisor-e's

Two things, and this app cannot supply either:

1. **No middle-tier login exists.** [`roles.js`](../server/collaborate/data/roles.js) maps
   only `platform_admin` → mentor and `firm_manager` → firm manager. No role value produces
   `global_group_manager` or `group_manager`, and `globalManagerRole` / `groupManagerRole`
   in [`config/integration.js`](../config/integration.js) are deliberately empty strings.
   ⚠ **`mentor` was never added either** — it still borrows `platform_admin`.
2. **Nothing in our data says which firms sit in which group.** The `firms` table has no
   country, group or parent column. Advisor-e already holds both facts (firm as the
   Advisory `branch`, country as `country-address`), so this is **a claim to pass through
   in the token, not data for anyone to re-type**.

Until both arrive, `parentScopeOf` returns the mentor scope for every firm, so the chain
runs mentor → firm — exactly as it did before the tier work existed. That is why the whole
pre-existing test suite passed unmodified, and it is the safe direction to fail.

---

## The 8 seam files the master team plugs into

1. `server/middleware/firmAuth.js` — identity + role validation (highest priority)
2. `config/integration.js` — JWT claims + role constants
3. `server/utils/firmOverlay.js` — overlay load/merge (critical)
4. `server/utils/firmDistinctions.js` — distinction cascade load
5. `server/utils/resolveDistinctions.js` — distinction resolver
6. `server/advisorEngine.js` — engine read points
7. `server/routes/firmManager.js` — Firm-Manager read/write routing
8. `config/db-schema.sql` — storage scope. **No schema change needed** (Part 3, ruled
   2026-08-09) — but the **reserved `firms` row per tier must be inserted**, or that
   tier's saves are foreign-key refused while the screen reports success

---

## Part 4 — Mentor case-study review (BUILT 2026-06-26)

A working feature, not a plan: it lets the **Mentor** review real advisor case
studies — **with the firm manager's per-case permission** — to find accuracy
problems and improve the app. Built, tested, `nuxt build` green, and verified live
end-to-end. This documents what exists and the one thing the master team must wire.

### How it works (the cascade rule, made concrete)

The rule above ("influence flows down; override sits at the firm") applies in
reverse for *visibility upward*: nothing reaches the Mentor unless the firm
deliberately sends it. It is a **double opt-in**:

1. The **advisor** shares a case with their **firm** (existing `visibility`:
   private → shared).
2. The **firm manager** then chooses **"Share with mentor"** on that specific
   case. Before it is sent, an **anonymiser** strips client identity (names,
   company, place, identifying figures) while preserving tone, frustration and
   jargon; the manager **previews and approves** the scrubbed copy. Only then is
   it stored and made visible to the Mentor. **"Withdraw from mentor"** reverses
   it and clears the stored copy.
3. The **Mentor** sees only approved, anonymised, advisor-stripped cases, on a
   **separate page only the Mentor can reach** (`/mentor`) — the one read that
   deliberately crosses the firm boundary.

The raw summary/transcript **never leave the firm**; the Mentor only ever sees
the anonymised copy a human approved.

### What was built (this app)

- **Data model** — `va_case_studies` gains `mentor_shared` (a flag *separate*
  from `visibility`, manager-owned), `mentor_anon_summary` / `mentor_anon_transcript`
  (written only on approval), and `mentor_shared_by` / `mentor_shared_at` (audit).
- **Anonymiser** — `server/utils/anonymiseCase.js` (OpenAI REST, JSON mode,
  strict output validation; roles preserved from the original, not the model).
- **Endpoints** (all manager-gated + firm-scoped except the last):
  - `POST /api/firm-manager/cases/:id/anonymise-preview` — scrubbed preview (no save)
  - `POST /api/firm-manager/cases/:id/share-with-mentor` — approve + persist
  - `DELETE /api/firm-manager/cases/:id/share-with-mentor` — withdraw + clear copy
  - `GET  /api/mentor/cases` — **mentor-role only**; cross-firm, anonymised feed
- **UI** — manager actions in `FirmManagerHub.vue` (Team Case Studies); the
  net-new mentor surface `pages/mentor.vue` + `components/MentorReview.vue`.

### The one thing the master team must wire (the seam)

The Mentor view is gated by **`requireMentorRole`** in `firmAuth.js`, which checks
**`AUTH.mentorRole`** in `config/integration.js`. That is set to **`platform_admin`
as an interim** so the feature is usable now. **Action for the master team:** when
the real Mentor role exists upstream (the same role that sits at the top of the
Global→Group→Firm cascade — seam files #1 and #2 above), point `AUTH.mentorRole`
at it. No route or UI change is needed — only that one constant.

> Two clearly-labelled **dev-only** affordances exist for local testing and are
> inert in production (gated behind `ALLOW_DEV_AUTH` + non-production): the
> `dev-local-mentor` bypass token in `firmAuth.js`, and the gitignored
> `data/dev-cases.json` fixture. Neither ships to production.

### New seam files (add to the list above)

9. `server/routes/mentor.js` — the cross-firm Mentor read (role-gated)
10. `server/utils/caseStore.js` — `listSharedWithMentor` + the mentor-share mutations
