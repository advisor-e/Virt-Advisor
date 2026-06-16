# Advisory Distinctions — Mentor → Firm → Advisor Cascade (Build Plan)

**Status:** PLAN — agreed model, not yet built. Confirmed with Mike 2026-06-16.
**Audience:** written to be read by domain experts and engineers equally.
**Related:** `design/virt-advisor-system-design.md` §11 (Firm Manager / Advisory Distinctions),
memory `design-distinctions-cascade`, `north_star_vision` (commitments #1 add IP + steer, #4
case-study loop), `firm_manager_hub`, the `firm-manager-edit-target` skill.

---

## 1. The model (plain English)

Three tiers, with the hierarchy supplied by the existing Advisor-e master app (we integrate,
we do not rebuild it):

1. **Mentor (Mike)** authors distinctions centrally.
2. **Firm managers** receive them and may **decline** (switch off for their firm) or **edit**
   (keep their own version) — affecting their firm only.
3. **Advisors** run sessions using their firm's **effective list**.

**Two locked decisions:**
- **On by default (opt-out).** A published mentor distinction is immediately live for every
  firm's advisors — no firm action required. A firm may then decline or edit it.
- **Firm customisation wins and sticks.** Once a firm declines or edits a distinction, the
  mentor's *later* changes to that same distinction do **not** override the firm's choice.
  Mentor updates flow only to firms that hadn't touched that distinction. The firm is closest
  to the client/advisor relationship and has final say.

**Effective list for a firm's advisors** =
`all live mentor distinctions − the ones this firm declined + this firm's edited versions
(swapped in) + this firm's own added rows`.

**Why it exists (the destination):** firms feed real-world case studies back in to develop and
hone their advisors' business acumen and confidence — the case-study → suggested-distinction
feedback loop.

---

## 2. Where the code is today (verified 2026-06-16)

- **Mentor tier = today's "platform" rows** in `data/advisory-distinctions.json` — always-on,
  loaded for everyone, no decline/edit. (Authored by `platform_admin` = Mike.)
- **Firm tier exists but is additive-only** — per-firm rows via
  `loadFirmConfig(firmId, 'advisory-distinctions')` (dev fallback `data/dev-firm-distinctions.json`),
  loaded **only when a `firmId` is present**. No accept/decline/edit *of mentor rows*.
- **`classifyDistinctions(domain, advisorText, firmRows)`** ([server/advisorEngine.js](../server/advisorEngine.js))
  merges platform + firm rows, classifies semantically (gpt-4o-mini), and boosts each matched
  row's `templates` by its `boost`.
- **Advisors don't receive firm distinctions at all today.** The advisor page derives `firmId`
  from the URL query only ([pages/advisor.vue](../pages/advisor.vue)); with no `?firmId=` it is
  `null`, so the `if (firmId)` branch skips firm rows. **This is the Q1 bug** from the 2026-06-16
  investigation — the proven reason a firm's "Lite Strategy" row never surfaced.
- **Reusable plumbing already built:** the per-firm override store with **version history +
  one-click restore** (`firmOverlay`, used for the Advisory Staircase edit-target) and the
  **Firm Manager Advisory Distinctions screen** (platform rows read-only; firm rows full CRUD).

---

## 3. Staged build (foundation-first)

### Stage 0 — Foundation: the advisor session knows its firm  ⭐ do first
The base everything else sits on, and it independently **closes the Q1 bug**.
- Derive `firmId` in the advisor flow from the authenticated session (mirror `firm-manager.vue`:
  `localStorage 'advisor_e_firm_id'`, localhost dev fallback `dev-firm-001`); keep the URL query
  as an explicit override for testing.
- ✅ **RESOLVED 2026-06-16 — the advisor route is now JWT-scoped.** `/api/advisor/query` sits
  behind `firmAuth`; `firmId`/`advisorId` come from the verified token (`req.firmId`/`req.advisorId`)
  and `advisorEngine.handleQuery` ignores any IDs in the request body, closing the IDOR. The
  front-end sends the Bearer token (real JWT when logged in; dev-bypass on localhost). Verified by
  `tests/unit/advisor.auth.test.js` + a live run (no token → 401; dev-bypass → session runs). The
  only remaining production step is the integration team wiring the real login token + secret
  (HANDOFF Step 4/5); this env uses a placeholder `JWT_SECRET`.
- **Acceptance:** an advisor session run under a firm loads that firm's distinctions; the dev
  "Lite Strategy" row surfaces in the matching session from the Q1 investigation.

### Stage 1 — Decline (per-firm on/off for a mentor distinction)
- **Prereq:** mentor distinctions need **stable IDs** so a decline can reference one. (Platform
  rows in `advisory-distinctions.json` may need IDs added — confirm/derive.)
- **Data:** per-firm set of declined mentor-distinction IDs, stored via `firmOverlay`
  (`config_key` e.g. `distinction-declines`) → version history/restore for free.
- **Backend:** when building the classify candidate list for a firm, exclude its declined mentor
  rows.
- **UI:** in the Firm Manager Advisory Distinctions tab, mentor rows gain an accept/**decline**
  toggle (replacing pure read-only); a declined row reads as off.
- **Acceptance:** a firm declines a mentor row → its advisors lose that boost; other firms are
  unaffected; restore re-enables it.

### Stage 2 — Edit (firm's own version; firm-wins-and-sticks)
- **Data:** per-firm edited copies keyed by mentor-distinction ID, stored via `firmOverlay`.
- **Backend:** the effective list swaps the firm's edited version in place of the mentor
  original; once a firm has edited an ID, later mentor changes to that ID **skip** the firm.
- **UI:** "Edit" on a mentor row opens the existing firm-distinction form pre-filled, creating a
  firm-owned copy marked "edited from mentor."
- **Acceptance:** firm edits a mentor row → advisors get the firm's version; a subsequent mentor
  change to that row does not override it; version history/restore works.

### Stage 3 — Hierarchy hook-up (master-app integration)
- Map mentor → firms → advisors from the master app's existing hierarchy/roles so the cascade
  scopes correctly: a mentor's rows reach the firms under them; an advisor's effective list comes
  from their firm.
- ⚠ **Open decision:** is **"mentor" a new role**, or is `platform_admin` (Mike) the mentor for
  now? Build Stages 0–2 against the dev firm; formalise the role here.

### Stage 4 — Case-study feedback loop (north-star, later)
- Case-study review → suggested-distinction flow (already designed — `content_feedback_loop`,
  north-star commitment #4). Out of scope for the cascade build itself; recorded as the
  destination so it isn't lost.

---

## 4. Cross-cutting

- **Persistence:** `firmOverlay` writes go to MySQL in production; the gitignored dev-JSON
  fallback (gated by `IS_DEV`, no version history) is **test-only** and must be replaced by real
  persistence before production. Shares the existing **"Firm Manager config persistence → MySQL"**
  task (ACTIONS.md P2).
- **Security / IDOR:** every decline/edit must be scoped to the *authenticated* `firmId`, never a
  client-supplied one (see the Stage 0 open decision). Same guard pattern as the other firm
  config routes.
- **Auditability:** `firmOverlay` version history + restore gives the audit trail "for free."
- **Stable IDs** (Stage 1 prereq) are the one piece of groundwork with no UI.

---

## 5. Risks / watch-items
- ~~The Stage 0 auth gap is the only thing that could make this *insecure* if rushed — verified
  firm identity for the advisor flow is non-negotiable before production.~~ **CLOSED 2026-06-16:**
  the advisor route is now JWT-scoped via `firmAuth` (see Stage 0). The residual is operational —
  the integration team must wire the real login token/secret (placeholder `JWT_SECRET` in dev).
- Stages 1–2 are buildable + testable today against the dev firm, but are not *done* until the
  MySQL persistence lands (don't mistake the dev-JSON fallback for finished).
