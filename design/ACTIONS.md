# Virt Advisor — Action Backlog

> **The single prioritised list of every open task.** Triage from here — don't re-read the whole registry to find work.
>
> **Governance rule (no silent parking, applied to tasks):** no item may be deferred in an inline note anywhere (registry / HANDOFF / code) **without also adding a line here**. The note and the backlog line are created together. See memory `feedback-no-silent-parking`.
>
> **Stack-deviation rule (binding, see `CLAUDE.md` → Stack Constitution):** any variance from the team's locked stack spec — a dependency version bump, a new plugin, a framework variation — is logged here as a **P1 (critical) reconcile task the moment it is found or introduced**. Drift is never silently accepted as the new normal.
>
> **Legend** — Status: ☐ open · ◐ in progress · ✅ done. Type: **SEC** security · **WIRE** framework wiring · **BUILD** · **DECISION** (needs Mike) · **EDIT-TARGET** (bring a building block under Firm-Manager no-code editing) · **DOC**.
>
> **Last swept:** 2026-06-09.
>
> **▶ NEXT SESSION — START HERE:** The ★ frameworks-wiring task is **COMPLETE** — all three frameworks (Growth Fundamentals ✅, Advisory Staircase ✅, 3 Engagement Types ✅) are wired to single sources of truth (done & pushed 2026-06-09). The only remaining engagement-types work is the separate **"surface all three in Firm Manager"** sub-task below (an EDIT-TARGET, not wiring). Otherwise triage from P1: the new **STACK DRIFT** items (Node/restify/Nuxt reconciliation). The **IDOR** security gate is now part-closed — the `/api/activity/*` routes are fixed (2026-06-09); only the `utils/cases.js` portion remains, gated to the Case-study DB migration (P2).

---

## P1 — do first (security blockers + the core-principle work + the quick win)

> **The three STACK DRIFT items below have a written execution plan + runbook:** [`design/STACK-RECONCILIATION-PLAN.md`](STACK-RECONCILIATION-PLAN.md) (target versions, verified facts, end-of-day install steps, risks). Status there: PLAN — not yet executed.

- ☐ **STACK DRIFT — Nuxt version.** `nuxt 2.18.1` is installed; team baseline is **2.14.0** (`CLAUDE.md` → Stack Constitution req. 1). Decide: pin to 2.14.0, or have the team ratify 2.18.1 as the new baseline and update the spec. **Why:** AI bumped the framework version away from the locked spec without sign-off. *Source:* governance reconciliation 2026-06-09; `package.json`.

- ☐ **STACK DRIFT — Restify 11 vs Node 14.15 (the root one).** `restify ^11.1.0` is installed; restify 11 requires **Node 16+**, which conflicts with the locked **Node 14.15** target (Stack Constitution req. 9). This is the actual cause of the earlier "we run on Node 18/20" claim. Decide: downgrade restify to a Node-14-compatible line, OR have the team formally raise the Node target (which then ripples into the Node-14 code rules). **Why:** the repo as installed cannot run on the spec'd runtime. **Gate:** reverting a live backend dependency is a real change → its own reviewed task, not an inline edit. *Source:* governance reconciliation 2026-06-09; `package.json`.

- ☐ **STACK DRIFT — No `engines` pin.** `package.json` has no `engines` field, so nothing enforces the Node target and each session is free to wander. Add an `engines` pin once the Node-version question above is settled. **Why:** the missing pin is what let the drift happen unnoticed. *Source:* governance reconciliation 2026-06-09.

- ◐ **SEC — Client-supplied identity (IDOR).**
  - ✅ **`/api/activity/*` routes — DONE 2026-06-09.** All three activity routes (`log-course`, `progression`, `team`) now sit behind `firmAuth`; advisor + firm are derived from the verified JWT, never the client. `team` additionally requires `requireManagerRole` (advisor → own only; manager → own firm only). Advisor identity added to `firmAuth` as `req.advisorId` (configurable `advisorIdClaim` in `config/integration.js`, falls back to the JWT `sub` claim; matching dev-bypass advisor ID). Front-end screens now send the pass and no longer send IDs in the request. New test `tests/unit/activity.routes.test.js` (6 tests) proves a spoofed ID in the request is ignored.
  - ☐ **`utils/cases.js` — STILL OPEN.** Still trusts `advisorId`/`firmId`, but it is client-side localStorage today (no server endpoint to exploit). Its IDOR fix lands with the **Case-study DB migration (P2)**, where the data first becomes shared/server-side.
  - **Why:** as-is, anyone could read another advisor's or firm's data by changing the IDs. **Gate:** activity routes closed; cases.js gated to the DB migration. *Source:* registry Part 1A → Progression; HANDOFF Security Notes.

- ☐ **WIRE — The 3 proprietary frameworks, Phase 2** (the ★ top priority — this is what delivers Principle P1 for the most valuable IP). Phase 1 (extract to JSON) is done; now wire the live code to **read** the JSON:
  - ✅ **Growth Fundamentals** — DONE 2026-06-09. On-screen selector (`VirtualAdvisor.vue growthStages`) now imports `growth-fundamentals.json`; detector (`growth.js conversationHasGrowthStage`) reads stage names from the same file; hard-coded `GROWTH_STAGE_NAMES` array removed. 3-copy duplication closed — single source of truth.
  - ✅ **Advisory Staircase** — DONE 2026-06-09. Selector (`VirtualAdvisor.vue staircaseSteps`) now imports `advisory-staircase.json` (label keeps "Step N:" prefix for the server's number-finder; descriptions use data-file `selectorDescription` wording); ceiling logic (`caseState.js staircaseToCeiling`) reads `complexityCeiling` from the same file. Steps + ceiling de-duplicated. NOTE: `education-gates-ascent` remains display-only / not-wired — separate DECISION in P2.
  - ✅ **3 Engagement Types** — DONE 2026-06-09. **Option C satisfied:** the `DOMAIN_NATURAL_ENGAGEMENT` map was relocated to a per-domain `engagementType` field on all 22 domains in `domains.json` (single source of truth); `caseState.js` now builds the map from that file; the duplicate map block was removed from `engagement-types.json` and the revisit block marked done; `strategyResolver.js` reads the unknown-domain fallback from `engagement-types.json` `defaultEngagement`. Behaviour-preserving (174/174 tests pass; engagement types resolve identically).
  - ☐ Then **surface all three in Firm Manager** so a firm can edit them. *Source:* registry Part 2 + Outstanding item 6; memory `design-engagement-types-extraction`, `design-education-gates-ascent`.

- ✅ **DOC — Promote the registry DRAFT → official. DONE 2026-06-09.** Mike read it through and approved; banner flipped DRAFT→official (v1.0), draft warnings removed, file renamed `design/virt-advisor-registry-DRAFT.md` → `design/virt-advisor-registry.md` (git mv, history preserved), the 3 in-repo references + archive note updated. Deliberate inline ⚠/GAP future-work flags retained by design. *Source:* registry Outstanding item 7.

---

## P2 — important, decide/build soon

- ☐ **DECISION (Mike) — The 28 dormant diagnostic trees.** 28 of your 42 decision trees drive no live path. Decide: switch on (wire into Stage 2 diagnosis), retire, or partial. **Why:** significant proprietary IP sitting idle. *Source:* registry Part 2 dormant-asset register.
- ☐ **BUILD — Case-study DB migration** (localStorage → MySQL). Enables shared cases across devices/firm; also the place the `cases.js` IDOR fix lands. *Source:* HANDOFF → Learning Loop.
- ☐ **BUILD — Course progress persistence.** The `progress` handler is a labelled stub (`CourseReminderService.markComplete`); wire to MySQL + firm-level reporting. *Source:* registry Part 1A → Course.
- ☐ **BUILD — Primary-issue selector redesign.** Replace the cold pick-from-a-list card with a system-led, reasoned **propose→confirm** conversational step (still maps to a canonical Workshop-1 issue). *Source:* registry Stage 2 design-debt note; memory `design-primary-issue-step`.

- ☐ **BUILD — Firm Manager: master-export self-service upload (Stage 2 of the search_content plan).** Replace the developer-managed export file with a Firm Manager screen where a firm downloads the template export from Advisor-e and uploads it themselves. Per-firm Google Drive folder (`/VirtAdvisor/firms/{firmId}/`), schema-validated upload (size cap, JSON-only, shape check, last-known-good fallback), version history + restore (= auditability), firm_manager role-gated. **Blocked on** Firm Manager Auth (hub Phase 1) — no verified firmId to scope the file to until then; lands as part of hub Phase 5 (Template & Video Library). **Stage 1** (single central loader + validation, single-firm interim, file in one defined folder) ships first and this swaps in behind it via that one loader. *Source:* memory `firm-manager-hub`; 2026-06-08 master-export design discussion.

---

## P3 — improvements, editing-targets, auditability

- ☐ **EDIT-TARGET — Bring building blocks under Firm-Manager no-code editing** (close the "✗ editable" column in Part 2): 14-question **weight sliders**, **Strategy table** (`strategyResolver` rules), **primary-issues** table, **content-summaries** editor, **coaching-reference** editor, **logic-trees** flowchart editor (tied to the 28-trees decision). *Source:* registry Part 2.
- ☐ **BUILD — Intervention Urgency.** `caseState.client.urgency` is computed but unused; make it a Stage-3 output that compresses sequencing + cuts template count when `high`. *Source:* registry Stage 3.
- ☐ **BUILD — Profile → DB.** Move the advisor profile off localStorage into the firm DB (same migration family as case studies). *Source:* registry Part 1A → Profile.
- ☐ **BUILD — Close the improvement loop.** Case-study → suggested-distinction flow; wire coaching-reference editing into Firm Manager. *Source:* registry Part 9.
- ☐ **BUILD — Auditability goals.** Decision Trace (per-recommendation trace of issue/lenses/scores) + Config versioning (edit history; tag each saved case with the active config version). *Source:* registry Part 9.
- ☐ **BUILD — Retire the R17 relevance gate** once the deterministic scoring matures (interim AI stopgap). *Source:* registry Stage 4.
- ☐ **DECISION (Mike) — HOW-swap scope.** Confirm whether the invisible client→learn swap should also fire in discover mode and pre-recommendation. *Source:* registry Part 8.
- ☐ **EDIT — Fin-Mgt Theme reconcile.** Live `finMgtThemes` are hard-coded in `VirtualAdvisor.vue` while `fin-mgt-table.json` exists — reconcile to one source. *Source:* registry Stage 1.
- ☐ **DOC tidy** — fold any remaining per-file detail from `registry_compilation_wip` (Part 2 note); resolve the Org CA Capacity Planner mislabelled-PDF flag (Part 2A). *Source:* registry.
- ☐ **QUALITY — Clear pre-existing ESLint errors.** Lint is currently *skipped* in the pre-commit hook (eslint package needs `npm install` to restore — see `.husky/pre-commit`), so these errors sit dormant rather than blocking commits. **4 errors:** `server/routes/activity.js` — 3× `no-useless-return` (the trailing `return` at the end of `logCourse`, `getProgression`, `getTeam`); `components/VirtualAdvisor.vue` — 1× `curly` (missing `{ }` after an `if`, ~line 1455). Also assorted `no-console` *warnings* across both files and a DOMPurify named-export warning. **Why:** these predate the IDOR fix and were surfaced when those files were touched on 2026-06-09 — logging them so they are not lost when lint is re-enabled. Fix when eslint is restored and pre-commit lint is turned back on. *Source:* lint run during the IDOR fix, 2026-06-09.

---

## Recently completed (2026-06-08)
✅ Extracted Advisory Staircase + 3 Engagement Types to JSON (Phase 1) · ✅ Fixed Growth Curve selector drift · ✅ Resolved Part 2A PDF→JSON mapping · ✅ Itemised logic trees (14 active / 28 dormant) + no-silent-parking rule · ✅ Documented all 7 non-Client functions (Part 1A) · ✅ Elevated the IDOR gap in HANDOFF · ✅ Registry final read-through + plain-language pass.
