# User-Level Cascade — Handover to the Master Coding Team

**Status:** Design + integration-seam inventory. Authored 2026-06-26.
**Purpose:** Define the seven user levels and the cascade rule that governs them, and
hand the master coding team a precise, grounded list of the connection points in *this*
app (Virt Advisor) where their Global→Group→Firm cascade plugs in.

> **Scope of this document.** This app does **not** gain new per-role functionality. The
> four new middle roles all operate this app *as if they were a Firm Manager*. The work
> here is to make the connection points explicit so the master team can attach the
> cascade — which lives upstream in Advisor-e and its SQL database — without ambiguity.

---

## Part 1 — The Role Model (plain English)

### The seven levels

| Level | Role | Operates this app as… |
|------|------|------------------------|
| 1 | **Mentor** | Platform owner (Mike). Makes app changes; authors content, domain logic trees, summary documents; seeds the baseline distinctions every firm starts with. |
| 2 | **Global Manager** | — same screens as a Firm Manager — |
| 2 | **Global Coach** | — same screens as a Firm Manager — |
| 3 | **Group Manager** | — same screens as a Firm Manager — |
| 3 | **Group Coach** | — same screens as a Firm Manager — |
| 4 | **Firm Manager** | Closest to the advisor and client. Final say on editability and visibility within the firm. |
| 5 | **Advisor** | Uses the engine with the client; sees what the Firm Manager allows. |

The four middle roles (Global/Group × Manager/Coach) **have no distinct functionality in
this app**. They access the same Firm-Manager-level surface. What differs *between* them —
who introduced which content, and whose thinking cascades to whom — is resolved **upstream
in Advisor-e + SQL** by the master coding team.

### The cascade rule (the governing principle)

> **Influence flows down only. Override authority sits at the firm.**

- **Mentor / Global / Group** decide what content is *introduced* and seeded downward.
  Each layer **inherits** from the layer above it.
- The **Firm Manager**, being closest to the advisor and client, has the **final say on
  editability and visibility** — what their advisors and clients actually see.
- A firm **cannot push anything upward or sideways**: no influencing the Global, the
  Group, or any other firm. Authority is **total within their firm, zero outside it**.
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

### C. Storage — *the real structural work, and why it's the master team's job*

- **`config/db-schema.sql`** — `firm_framework_versions` is keyed by `(firm_id,
  config_key)`. This is the heart of the handover decision below: the database currently
  understands **firm only**. Cases/visibility (`server/utils/caseStore.js`,
  `server/routes/cases.js`) and Drive folders (`server/services/driveService.js`) are
  likewise firm-scoped (base-or-firm).

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

## Part 3 — The one open decision the master team must make

The database scopes overrides by `firm_id` only. To carry Global and Group layers, choose:

1. **Parallel tables** — `global_framework_versions`, `group_framework_versions`
   alongside `firm_framework_versions`. Simple, explicit; more tables and more code paths.
2. **Polymorphic scope column** — one table with `scope_type ENUM('global','group','firm')`
   + `scope_id`. Fewer tables; the loader cascades by querying each scope in order. More
   flexible, slightly more abstract.

This is a master-team / SQL decision. This app's loader (`firmOverlay.js`) will read
whichever shape they choose — it needs only "give me the configs for these scope ids, in
this order," then merges them with the existing `deepMerge`.

---

## The 8 seam files the master team plugs into

1. `server/middleware/firmAuth.js` — identity + role validation (highest priority)
2. `config/integration.js` — JWT claims + role constants
3. `server/utils/firmOverlay.js` — overlay load/merge (critical)
4. `server/utils/firmDistinctions.js` — distinction cascade load
5. `server/utils/resolveDistinctions.js` — distinction resolver
6. `server/advisorEngine.js` — engine read points
7. `server/routes/firmManager.js` — Firm-Manager read/write routing
8. `config/db-schema.sql` — storage scope (the open decision above)

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
