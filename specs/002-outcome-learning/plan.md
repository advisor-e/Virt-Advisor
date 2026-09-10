# Implementation Plan: Learning from Outcomes Across Consenting Firms

**Branch**: `feat/firm-quiz-builder-ui` (the desktop's branch; Spec Kit creates no branches here) | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-outcome-learning/spec.md`, clarified with Mike the same day (four answers under its Clarifications heading, plus his two rulings on FR-008 and FR-010).

## Summary

Pool the per-template verdicts a case review already records, from every firm whose manager has switched contribution on, into anonymised rows at the platform scope of the existing overlay store. Compute, by plain counting, which templates keep going less well in which single situation dimension; propose a hold-back once 5 firms and 25 cases stand behind it; let the mentor accept, hold or reject each one on a Mentor Hub page with version history; and apply live hold-backs in `templateResolver.js` through the same options seam distinction boosts use, capped, clamped at 1 like the client-history hold-back, and written to the decision trace with their counts. Two benches report a before-and-after figure. No model, no schema change, no new dependency.

## Technical Context

**Language/Version**: JavaScript, Node.js 14.15 (CommonJS on the backend); Nuxt 2 / Vue 2 Options API / Pug on the frontend.

**Primary Dependencies**: nothing new. `mysql2` through `server/utils/db.js`; the overlay store `server/utils/firmOverlay.js`; Node's built-in `crypto` for the contribution token.

**Storage**: `firm_framework_versions` via the overlay store. Pooled outcomes and mentor decisions at `PLATFORM_SCOPE` (`__platform__`); consent on each firm's own row. **No schema change.** One store addition is needed and is named below (Complexity Tracking).

**Testing**: Jest, fake req/res for routes (`tests/unit/*.routes.test.js` convention), `@vue/test-utils` v1 for the two components' logic. The guard and the arithmetic sit at 100% coverage under CLAUDE.md's rule for functions that validate what reaches the engine.

**Target Platform**: the Restify backend on port 4000 and the Nuxt frontend on port 3000, inside Advisor-e.

**Project Type**: web application, two-part (Nuxt UI, Restify API), existing layout.

**Performance Goals**: the mentor page, including its recompute, inside the 2000 ms page-render rule at 10,000 pooled outcomes (SC-008). The contribution write adds one overlay save to a case review. The recommendation path adds one overlay read per request, degraded to "no adjustment" on any failure (FR-019).

**Constraints**: every write scoped to the verified token; nothing pooled carries a firm, advisor, client or case identifier; free text never enters the pool; no background scheduler; hold-back only; every applied or outweighed adjustment on the trace. Three committed drawings and Mike's rulings on them precede any code.

**Scale/Scope**: one platform-wide pool. Order of magnitude: hundreds of firms, tens of thousands of outcomes over years; ~450 template titles × 4 dimensions × values gives at most a few thousand candidate adjustments, of which a handful will ever cross the floor.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution points at `CLAUDE.md`, `design/WORKING-AGREEMENT.md` and the live list. Checked against each:

| Rule | This plan |
|---|---|
| Stack Constitution (Nuxt 2, Vue 2 Options API, Pug, Buefy, raw MySQL on Restify, Node 14.15, CommonJS, no TypeScript) | No new dependency; `crypto.createHmac` is in Node 14; two new Vue components in Options API with Pug templates; routes on Restify. **Pass.** |
| Business logic, DB and third-party calls backend only | All computation, the guard, consent and the pool live in `server/utils/` and `server/routes/`. The frontend only renders and calls routes through the existing `apiProxy.js` prefixes. **Pass.** |
| AI content surfaces on a hub page, mentor first, mentor alone by default | Adjustments surface on a Mentor Hub tab, `['mentor']` in `TAB_TIERS`. The one firm-tier screen is the consent switch, which a firm must own (FR-001); no middle-tier view (FR-014, stated). **Pass.** |
| Save the Artefact | Three drawings in `design/mockups/`, registered in `design/ARTEFACTS.md`, with their questions ruled one at a time and the drawing approved as its own question, before Phase 2 tasks touch code. **Pass, and it is the first task group.** |
| Every change needs Mike's explicit yes; one recommendation, one yes/no | Each task is put to him that way at implement time. **Pass.** |
| Tests earn their place by catching what UAT cannot | Tests cover the consent gate, the guard, the floor, the cap, the trace shape and the arithmetic; none assert wording or CSS. **Pass.** |
| Item on the live list, asked for by Mike in his words | 4.87, `askedBy` Mike 2026-09-10. **Pass.** |
| No schema change unless proved unavoidable | None. One store function is added (a deletion by key prefix) and is named as a deviation for Mike below. **Pass with one named addition.** |
| Secrets backend only | The contribution-token secret is a backend environment variable, never in the Nuxt `env:` block. **Pass.** |

No violations. Complexity Tracking carries the two additions that are not violations but had to be named; both were ruled by Mike on 2026-09-10.

## Project Structure

### Documentation (this feature)

```text
specs/002-outcome-learning/
├── plan.md              # This file
├── research.md          # Phase 0: the seams as found in the code, and each decision
├── data-model.md        # Phase 1: the four records and their states
├── quickstart.md        # Phase 1: how to prove it works end to end
├── contracts/
│   └── api.md           # Phase 1: the routes, the resolver option, the trace block, the hub tabs
└── tasks.md             # Phase 2 (/speckit-tasks), not created here
```

### Source Code (repository root)

```text
design/mockups/
├── outcome-learning-consent.html   # NEW drawing — firm manager's switch + the advisor's one line
├── outcome-learning-mentor.html    # NEW drawing — Mentor Hub page
└── outcome-learning-trace.html     # NEW drawing — the trace line
design/ARTEFACTS.md                 # three new rows

server/utils/
├── outcomeLearning.js              # NEW: shape builder, guard (100%), arithmetic, floor, cap, ids
├── outcomeConsent.js               # NEW: consent record read/validate, contributionOpen(), token
├── firmOverlay.js                  # + deleteFirmConfigsByPrefix(firmId, keyPrefix)  (named addition)
├── templateResolver.js             # + options.pooledAdjustments, POOLED_HOLDBACK_MAX, two reason codes
└── priorEngagement.js              # unchanged; its clamp-and-label pattern is copied
server/routes/
├── outcomeLearning.js              # NEW: mentor routes (list/recompute, decision, history, restore, bench)
├── outcomeConsent.js               # NEW: firm-manager routes (read, set, withdraw)
└── cases.js                        # reviewCase: contribute after a successful review, when consent is on
server/advisorEngine.js             # load consent + live adjustments, pass to resolver, emit trace block
server/restify-server.js            # route registration under /api/mentor and /api/firm-manager

components/
├── FirmManagerHub.vue              # TAB_TIERS + NAV_GROUPS entries, two panels
├── MentorOutcomeLearning.vue       # NEW
├── FirmOutcomeConsent.vue          # NEW
├── VirtualAdvisor.vue              # trace: the Outcome Learning section (from the drawing)
└── CaseReview screen               # the one-line notice (file named at build from the drawing)
utils/traceReasonCodes.js           # two REASON_RULES entries
locales/*.json (8)                  # decisionTrace + outcomeLearning + outcomeConsent keys
scripts/
├── scenario-lab.js                 # --adjustments <file> to run the fixed bench with/without; explainReasons() gains the two codes
└── outcome-bench.js                # NEW: the bench built from the pool itself

tests/unit/
├── outcomeLearning.test.js         # guard, arithmetic, floor, ids, orphan detection
├── outcomeConsent.test.js          # consent record, gate, token, withdrawal
├── outcomeLearning.routes.test.js  # mentor routes, scope from token, degrade paths
├── outcomeConsent.routes.test.js   # firm routes, scope from token
├── pooledHoldback.test.js          # resolver: cap, clamp, outweighed rule, consent-off = untouched
├── casesContribute.test.js         # reviewCase contributes only when consent is on; guard refusal logged, review still saved
├── hubTabTiers.test.js             # pin the two new tab entries
└── decisionTraceI18n.test.js       # the two new codes resolve in every locale
```

**Structure Decision**: the existing two-part layout, unchanged. New backend modules follow the store-plus-route pairing every other hub feature uses (`benchmarkerStore.js` / `benchmarker.js`; `compliance.js`). The two Vue components follow the mentor-twin pattern (`MentorTemplateCheck.vue`, `FirmBenchmarker.vue`).

## Phase 0 — Research

See [research.md](research.md). Every unknown in Technical Context is resolved there; the seams were read in the code, not remembered. Summary of the decisions:

1. **Contribution moment**: inside `reviewCase` after `updateReview` succeeds, using the row the route already scoped by advisor and firm. A guard refusal is logged and the review still saves.
2. **Pool rows**: one overlay row per contributed case at `PLATFORM_SCOPE`, key `outcome-pool:<token>:<caseHash>`. One writer per row, so item 4.75's lost-update fault cannot recur; a re-review of the same case is a new version of the same row, never a duplicate.
3. **The token**: HMAC-SHA256 of the firm id with a backend-only secret, truncated. Links a row to its firm's consent for withdrawal without naming the firm. No secret set: contribution fails loudly and is logged; nothing is pooled under a guessable token.
4. **Industry**: the case's industry is free text typed by the advisor. It enters the pool only when it matches a term in the resolver's existing industry vocabulary; otherwise that outcome carries no industry value. Named as question 1 on the mentor drawing.
5. **Arithmetic**: per (template, dimension, value): `delivered`, `less`, `firms`, `cases`. `holdBack = round(POOLED_HOLDBACK_MAX × less / delivered)`, publishable when `firms ≥ 5 && cases ≥ 25`. Hand-checkable from the counts shown.
6. **Cap and "the advisor's words win"**: `POOLED_HOLDBACK_MAX = 10` summed across every live adjustment a template matches; clamped at 1 like `HISTORY_HOLDBACK_PENALTY`; and **skipped, recorded as outweighed, when the template carries a distinction boost from the advisor's own words in this session**. Deterministic and testable; the cap size is question 1 on the trace drawing.
7. **Decisions row**: one platform row `outcome-adjustments` holding the mentor's decisions by adjustment id, last recompute time and bench figures. One writer (the mentor), version history and restore free.
8. **Recompute**: on the mentor's GET, on a POST from the page, and inside the withdrawal route. No scheduler.
9. **Two benches**: the Scenario Lab gains an `--adjustments <file>` flag (the mentor page exports live adjustments as JSON); a new `scripts/outcome-bench.js` replays each pooled situation through the resolver and reports the share whose top recommendation the review marked "went well". Both figures are written to the decisions row by the bench route so the page shows them.

## Phase 1 — Design

- [data-model.md](data-model.md): the four stored records, the computed adjustment, the trace block, validation and state transitions.
- [contracts/api.md](contracts/api.md): the eight routes, the resolver option, the trace block shape, the hub-tab entries, the reason codes.
- [quickstart.md](quickstart.md): how to prove each user story end to end, and how to run the two benches.

### Constitution Check, re-run after design

Unchanged from above. The design added no dependency, no schema change, no frontend logic beyond rendering, and no tier the spec did not name. The one store addition stays the only item in Complexity Tracking.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| `deleteFirmConfigsByPrefix(firmId, keyPrefix)` in `server/utils/firmOverlay.js` — a hard delete of every version of every row under a prefix at one scope | FR-003 withdrawal must **remove** a firm's contributions. The store today only appends versions; a "withdrawn" tombstone would leave the anonymised rows readable in history, which is not removal. | Tombstones (leave data in history, contradict the screen's promise); a schema change (a `withdrawn_at` column — heavier, and the rule says none unless unavoidable). The prefix delete is one function, scoped to `PLATFORM_SCOPE` + `outcome-pool:<token>:`, tested for refusing any other prefix. **Ruled by Mike 2026-09-10: approved.** |
| `OUTCOME_POOL_SECRET`, a backend-only environment variable | The contribution token must not be reversible to a firm id by anyone reading the pool rows. | A plain hash of the firm id (reversible by anyone who can list firm ids); a random per-firm token stored on the firm's consent row (works, but then the consent row names the pool rows, and the mapping lives in the database rather than in a secret held outside it). **Ruled by Mike 2026-09-10: approved.** Goes in `.env.example` and the UAT pack. |

## What is deliberately not in this plan

- No middle-tier or firm view of adjustments (FR-014); the firm's only lever is consent.
- No lifting of a template (FR-010, Mike's ruling); no free text in the pool (clarified).
- No back-fill of reviews recorded before consent.
- No trained model. If a later step wants one it is a fresh decision for Mike.
- No new proxy entry: `/api/mentor` and `/api/firm-manager` already reach the backend.
