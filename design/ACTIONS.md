# Virt Advisor — Action Backlog

> **The single prioritised list of every open task.** Triage from here — don't re-read the whole registry to find work.
>
> **Governance rule (no silent parking, applied to tasks):** no item may be deferred in an inline note anywhere (registry / HANDOFF / code) **without also adding a line here**. The note and the backlog line are created together. See memory `feedback-no-silent-parking`.
>
> **Legend** — Status: ☐ open · ◐ in progress · ✅ done. Type: **SEC** security · **WIRE** framework wiring · **BUILD** · **DECISION** (needs Mike) · **EDIT-TARGET** (bring a building block under Firm-Manager no-code editing) · **DOC**.
>
> **Last swept:** 2026-06-08.

---

## P1 — do first (security blockers + the core-principle work + the quick win)

- ☐ **SEC — Client-supplied identity (IDOR).** The `/api/activity/*` routes (Progression) and `utils/cases.js` trust `advisorId`/`firmId` sent from the browser. Derive both from the verified JWT (the `firmAuth` pattern) and enforce ownership (advisor → own only; manager → own firm only). **Why:** as-is, anyone can read another advisor's or firm's data by changing the IDs. **Gate:** must close before real firm data goes live. *Source:* registry Part 1A → Progression; HANDOFF Security Notes.

- ☐ **WIRE — The 3 proprietary frameworks, Phase 2** (the ★ top priority — this is what delivers Principle P1 for the most valuable IP). Phase 1 (extract to JSON) is done; now wire the live code to **read** the JSON:
  - ☐ **Growth Fundamentals** — point the on-screen selector (`VirtualAdvisor.vue growthStages`) + the detector (`growth.js GROWTH_STAGE_NAMES`) at `growth-fundamentals.json`; remove the 3-copy duplication. **Why:** drift already happened once.
  - ☐ **Advisory Staircase** — wire `advisory-staircase.json`; move the steps + ceiling out of `caseState.js` / `VirtualAdvisor.vue`. Honour the `education-gates-ascent` design note (still a DECISION to wire — see P2).
  - ☐ **3 Engagement Types** — wire `engagement-types.json`; **acceptance criterion = Option C**: relocate `DOMAIN_NATURAL_ENGAGEMENT` to a per-domain field in `domains.json` (single source of truth) before this is "done".
  - ☐ Then **surface all three in Firm Manager** so a firm can edit them. *Source:* registry Part 2 + Outstanding item 6; memory `design-engagement-types-extraction`, `design-education-gates-ascent`.

- ☐ **DOC — Promote the registry DRAFT → official.** Flip the top banner DRAFT→official + remove draft warnings (old registry already archived). **Gate:** after Mike's read-through. *Source:* registry Outstanding item 7.

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

---

## Recently completed (2026-06-08)
✅ Extracted Advisory Staircase + 3 Engagement Types to JSON (Phase 1) · ✅ Fixed Growth Curve selector drift · ✅ Resolved Part 2A PDF→JSON mapping · ✅ Itemised logic trees (14 active / 28 dormant) + no-silent-parking rule · ✅ Documented all 7 non-Client functions (Part 1A) · ✅ Elevated the IDOR gap in HANDOFF · ✅ Registry final read-through + plain-language pass.
