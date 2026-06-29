# Advisory Distinctions — Mentor → Firm → Advisor Cascade (Build Plan)

**Status:** PLAN — agreed model, not yet built. Confirmed with Mike 2026-06-16.
**Update 2026-06-27:** §6 added — the **mentor authoring surface** (give the mentor the firm's
Advisory Distinctions screen, plain-CRUD, as the UI origin of the cast). Agreed with Mike; not yet built.
**Update 2026-06-29:** §6 Stages A–C **shipped**; **Stage E BUILT** (mentor-update review: per-override
content-signature drift detection → "Mentor updated this distinction" badge + Review-update compare
panel with Adopt / Keep-mine). A complementary "since your last visit" notice covers the *non-overridden*
(auto-applied) case. Backend: `firmManager.js` (override-baseline store + `keepMineDistinction` +
`getDistinctionState.driftIds`); UI: `FirmManagerHub.vue`. Tests: `firmManagerStageE.routes.test.js`,
`firmManagerDistinctionReview.routes.test.js`.
**Update 2026-06-29 (later):** **Stage D BUILT** ("keep theirs" cross-firm promotion). On a mentor
delete, every firm that OVERRODE the row keeps its version as a standalone firm-own row, then its
override + drift baseline are dropped; declined-only firms need no action; untouched firms lose the
default. Promotion runs BEFORE the master is removed (fail-safe — if it throws, the row is not deleted).
Production enumeration is real now: `firmOverlay.listFirmIdsWithConfigKey` (`SELECT DISTINCT firm_id …`),
with the dev-overrides map as the dev fallback — so this is **not** throwaway. `firmManager.promoteOverridesForDeletedRow`,
called from `mentor.deleteMentorDistinction`; tests `firmManagerStageD.routes.test.js`. Also hardened
test isolation (caseStore dev path now `CASE_DEV_FILE`-overridable; `platformDistinctions` fs-mocked) so
a clean `npm test` is deterministic. All on branch `feat/mentor-distinctions-authoring`; Stage 3
(hierarchy/role) is the only cascade stage still open.
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

---

## 6. Mentor authoring surface — the UI origin of the cast (agreed 2026-06-27)

**The gap.** The cascade below the mentor is built, but the *top* of it is still a hand-edited
file: the mentor (Mike) authors the platform set by editing `data/advisory-distinctions.json`
directly. There is no UI. This section is the agreed plan to give the mentor the **same no-code
Advisory Distinctions screen the firm already has** ([components/FirmManagerHub.vue](../components/FirmManagerHub.vue)
Tab 5), instantiated one level up on the Mentor page ([pages/mentor.vue](../pages/mentor.vue)), so
the mentor's authored set becomes the original cast that cascades down to firm → advisor.

**Why this is small.** Nothing in the cascade changes. `resolveEffectiveDistinctions`
([server/utils/resolveDistinctions.js](../server/utils/resolveDistinctions.js)) still takes
`platformRows` + a firm's changes and produces the firm's effective list. We are only changing
**where `platformRows` come from** — a writable store the mentor edits, instead of a static
`require()` — and adding the screen to edit them. The firm's decline/override/own-row machinery
is untouched, and "firm customisation wins and sticks" still holds because firm overrides are
keyed to the platform row's stable `pd-N` id.

**Row model — plain CRUD (DECIDED 2026-06-27).** The firm screen carries *decline / override /
reset-to-platform* controls because the firm sits **underneath** the mentor. At the very top there
is no layer above to decline or override, so the mentor screen is the firm screen with **only the
own-row controls**: Add / Edit / Move / Remove / boost, same form, triggers tag list, template
picker and boost slider. Every mentor row is simply a platform (`pd-N`) row.

**Storage (recommended).** Reuse the existing `firmOverlay` store (the `firm_framework_versions`
table) under a single reserved **global / mentor scope** (a fixed key, not a real `firmId`) — this
inherits **version history + one-click restore for free**, exactly as the firm edits do, with no
new table. The committed `advisory-distinctions.json` becomes the **seed / fallback** (and the
dev-mode fallback), mirroring how [server/utils/firmDistinctions.js](../server/utils/firmDistinctions.js)
already handles firm rows.

### Build sequence (foundation-first)

- **Stage A — storage + single-source loader (no UI).** Add `loadPlatformDistinctions()` (modelled
  on `firmDistinctions.js`): read mentor rows from the global overlay scope, fall back to the JSON
  when nothing is stored. Repoint the three direct reads through it —
  [advisorEngine.js:1961](../server/advisorEngine.js#L1961),
  [firmManager.js:840](../server/routes/firmManager.js#L840) and `:944`.
  **Acceptance:** with no stored rows, behaviour is byte-identical to today; existing tests stay green.
- **Stage B — mentor CRUD routes.** `/api/mentor/distinctions` list / create / update / delete /
  move, gated `firmAuth + requireMentorRole`, writing to the global mentor scope (never
  `req.firmId`). New rows get the next stable `pd-N`; edits keep the id pinned.
  **Acceptance:** a mentor edit reaches a firm that hasn't touched that row; a firm that overrode it
  keeps its own version.
- **Stage C — mentor UI.** Add an "Advisory Distinctions" section to the Mentor page (tabs, alongside
  the case reviews) using the firm distinctions form/picker/boost slider in plain-CRUD mode.
  **Acceptance:** the mentor edits the cast on screen; version history/restore works as the firm
  screen's does.
- **Stage D — delete semantics + tests. ✅ BUILT 2026-06-29** (was: rule decided 2026-06-27, impl
  deferred — brought forward at Mike's request). `firmManager.promoteOverridesForDeletedRow` runs from
  `mentor.deleteMentorDistinction` BEFORE the master row is removed (fail-safe). Cross-firm enumeration
  is production-real (`firmOverlay.listFirmIdsWithConfigKey`) with the dev-overrides map as the dev
  fallback. Tests: `tests/unit/firmManagerStageD.routes.test.js` (override→firm-own with master domain;
  decline inert; untouched firm; idempotent prior-move; multi-firm). The original rule + shape:
  - **DECIDED 2026-06-27 (Mike): keep theirs.** When the mentor
  deletes a master row, a firm that had *customised* it keeps its version as a standalone firm-own row;
  only the master default disappears. Honours "firm customisation wins and sticks" — a firm never loses
  its work because the mentor removed the original. A firm that only *declined* the row needs no action
  (the decline becomes inert); an untouched firm simply loses the default.
  - **Implementation shape.** The promotion happens at **delete time** in the mentor handler (which still
    holds the full master row, incl. its domain, before removing it): enumerate the firms that hold an
    override for that id, and for each, write a firm-own row = the master base + the firm's edits (with
    the master row's domain), then drop that override. Today the resolver silently *drops* an override
    with no matching platform row — that is the behaviour this stage replaces, so the firm's edits are
    promoted rather than lost.
  - **Needs:** a cross-firm enumeration (which firms hold an override for this id) — dev: read the
    dev-overrides JSON; prod: scan `firm_framework_versions` for `config_key='distinction-overrides'`.
    This is a **cross-firm write from the mentor handler** (it reaches into firm stores) — guard it the
    same way as the other firm writes, and it rides the MySQL-persistence item for the production path.
  - **Tests:** ≥90% route coverage + a promotion unit test (full override → promoted firm-own row with
    the right domain; decline cleared/inert; untouched firm unaffected).
- **Stage E — mentor-update review (adopt / keep mine) (agreed 2026-06-27).** When the mentor edits
  a row a firm has overridden, the firm is *shielded* (firm-wins-and-sticks) — but they should be
  able to **see the mentor's newer version and choose**. Add a "mentor updated this distinction"
  prompt on the firm's overridden rows with two actions: **Adopt** (drop the firm's override → fall
  back to the current mentor row; reuses today's *Reset to platform* path) and **Keep mine** (re-stamp
  the baseline so the badge clears until the mentor edits again). Plus a small **compare panel**
  (mentor's current version vs the firm's effective version).
  - **Drift detection (the one genuinely new piece).** A firm's override stores only the *edited
    fields* (a partial delta — [firmManager.js:801-828](../server/routes/firmManager.js#L801-L828);
    the resolver does `{...mentorRow, ...firmEdit}`, so unedited fields already track the mentor
    live, **per-field, not per-row**). There is no record of how the mentor row looked when the firm
    edited it, so nothing can tell it has since changed. Fix: when a firm overrides a row, also stamp
    a **baseline marker** (a content-hash or the mentor row's version number at that moment). Current
    mentor row ≠ stamped baseline → show the badge. Versioning comes for free once mentor authoring
    rides `firmOverlay`.
  - **Scope simplification (recommended).** Keep *Adopt* **whole-row** at first (take the mentor's
    version entirely, or keep the firm's entirely). Field-level cherry-picking ("take the mentor's
    new templates but keep my boost") is materially more complex — flag as a later refinement, not
    first-cut.
  - **Why it's low-risk:** opt-in, nothing changes under a firm silently, and *Adopt* reuses the
    existing reset machinery. Depends on mentor edits being versioned, so it sequences **after** the
    mentor-authoring stages (A–C).
  - **Acceptance:** mentor edits an overridden row → the firm sees a "mentor updated this" badge;
    *Adopt* gives them the new mentor version; *Keep mine* clears the badge and preserves their
    version; the badge reappears only on the mentor's *next* edit.

### Deferred decisions (do not block Stage A)
- **Shared vs copied UI (Stage C).** Extract one `DistinctionsEditor` used by both pages in two
  modes (cleaner; needs a careful refactor of the shipped firm screen, with its tests as the net),
  **or** a trimmed mentor-only copy (lower risk; two files to keep in step). Lean: shared.
- **Delete-cascade rule (Stage D).** What a mentor delete does to firms that overrode that row.

### Risk to state up front
A mentor edit is **cross-firm and on-by-default**: saving a row instantly changes advisor behaviour
for every firm that hasn't customised it. `firmOverlay` version-history/restore is the safety net,
but the blast radius is real and should be visible in the UI.

**Persistence note.** Same as Stages 1–2 above — the mentor scope rides the shared
*Firm-Manager config persistence → MySQL* item (`design/ACTIONS.md` P2). The dev-JSON fallback is
test-only; not "done" until real persistence lands.
