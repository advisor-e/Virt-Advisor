# Implementation Plan: The Engine's Middle, and the Learning Loop Made True

**Branch**: `feat/firm-quiz-builder-ui` (the desktop's branch; Spec Kit creates no branches here) | **Date**: 2026-09-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-engine-middle-learning-true/spec.md`, clarified with Mike the same day (three answers under its Clarifications heading, plus his four rulings at its head).

## Summary

Ten stories, one plan. The engine proposes and confirms the primary issue in the conversation and stores it on the trace, which also closes a fault this research found: the outcome pool's primary issue **and** industry are blank on every live row because the trace's situation is a string. Pooled evidence becomes one signed number per pairing, so a template can rise as well as fall, and no pooled number can move a template the advisor's own words reached. The mentor sees the loop's reach and an out-of-sample figure. The pool secret refuses to be forgotten. Every backend AI call goes through one provider seam with a once-only fallback that personal data never reaches unless cleared. The mentor authors each template's fingerprint on a screen whose rows the compiler cannot erase. The brief stops saying routing groups await building. No model, no schema change, no new dependency.

## Technical Context

**Language/Version**: JavaScript, Node.js 14.15 (CommonJS on the backend); Nuxt 2 / Vue 2 Options API / Pug on the frontend.

**Primary Dependencies**: nothing new. The overlay store `server/utils/firmOverlay.js`; Node's built-in `https` (already the OpenAI client); `mysql2` through `server/utils/db.js`.

**Storage**: `firm_framework_versions` via the overlay store for authored profiles (`semantic-profile:<pageId>` at `PLATFORM_SCOPE`) and the existing pool and decisions rows. The confirmed primary issue and the industry ride the case's existing `decision_trace` JSON column. **No schema change.** One SQL `COUNT` is added to `caseStore` (R5).

**Testing**: Jest, fake req/res for routes, `@vue/test-utils` v1 for component logic. The proposer's mapping, the net-balance arithmetic, the cap rule, the provider routing rule for personal data, the boot check and the time split are held at 100% under CLAUDE.md's rule for functions that validate what reaches the engine or the model.

**Target Platform**: Restify on 4000, Nuxt on 3000, inside Advisor-e.

**Project Type**: web application, two-part, existing layout.

**Performance Goals**: the mentor page inside 2000 ms at 10,000 pooled outcomes (SC-005), with the reach counts and the effective-profile map cached 60 s like the library. The recommendation path adds one cached profile read. The time-split bench runs on the existing job path (1500 ms budget, then a job id).

**Constraints**: every write scoped to the verified token; nothing pooled names anyone; no free text in the pool; no background scheduler; personal data to a cleared provider only; every applied, lifted or outweighed adjustment on the trace; four committed drawings and Mike's rulings on them before code.

**Scale/Scope**: one platform pool; 199 profile entries; 25 AI call sites across two clients, of which 21 can fall back and 4 cannot (Responses-API features and audio).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | This plan |
|---|---|
| Stack Constitution (Nuxt 2, Vue 2 Options API, Pug, Buefy, raw MySQL on Restify, OpenAI by REST backend-only, Node 14.15, CommonJS, no TypeScript) | No new dependency. The provider seam is a wrapper over the existing raw-`https` client; a second provider is reached by the same REST path with a different host, so req 7 (REST, backend, no SDK) holds for every provider. One new Vue component in Options API with Pug. **Pass.** |
| Business logic, DB and third-party calls backend only | The proposer, the arithmetic, the provider seam, the counts and the profile store are all in `server/`. The frontend renders and calls routes. **Pass.** |
| AI content surfaces on a hub page, mentor first, mentor alone by default | Profiles: a Mentor Hub tab, `['mentor']`, judgement stated (FR-015). Provider config is not AI *content*; it is an operator setting and stays in config with no screen, stated here. **Pass.** |
| Save the Artefact | Four drawings in `design/mockups/`, rows in `design/ARTEFACTS.md`, questions ruled one at a time, before any task touches code. **Pass, first task group.** |
| Every change needs Mike's explicit yes; one recommendation, one yes/no | Each task at implement time. **Pass.** |
| Tests earn their place by catching what UAT cannot | The mapping, the arithmetic, the cap, the routing rule, the boot refusal, the time split; none assert wording or CSS. **Pass.** |
| Item on the live list, asked for by Mike in his words | 4.97, `askedBy` Mike 2026-09-14. **Pass.** |
| No schema change unless proved unavoidable | None. **Pass.** |
| Secrets backend only | Provider keys are backend env; never in the Nuxt `env:` block. **Pass.** |
| Markdown pipeline locked | Untouched. **Pass.** |
| The four tiers are settled | Nothing here re-raises them; the profile tab is mentor-alone by stated judgement. **Pass.** |

No violations. Complexity Tracking names the three things that had to be named.

## Project Structure

### Documentation (this feature)

```text
specs/003-engine-middle-learning-true/
├── plan.md              # This file
├── research.md          # Phase 0: R1–R10, the seams as found and each decision
├── data-model.md        # Phase 1: the records that change or are added
├── quickstart.md        # Phase 1: how to prove each story end to end
├── contracts/
│   └── api.md           # Phase 1: routes, resolver options, trace shapes, config, hub tab
└── tasks.md             # Phase 2 (/speckit-tasks), not created here
```

### Source Code (repository root)

```text
design/mockups/
├── primary-issue-proposal.html        # NEW drawing — the proposal turn, confirm/reframe, the driver question
├── outcome-learning-lift-reach.html   # NEW drawing — mentor page with lifts, reach, out-of-sample; firm tab counts
├── outcome-learning-trace-lift.html   # NEW drawing — trace: lifted, held back, outweighed-by-<kind>, provider line
└── template-profiles.html             # NEW drawing — the profile screen
design/ARTEFACTS.md                    # four new rows
design/features/advisory-engine.md     # routing groups: removed by ruling (R10)
design/virt-advisor-registry.md        # the stale __none_of_these__ line (R10)
design/UAT-LOAD-PACK.md, .env.example  # secret wording (R6); AI_* provider variables (R8)

config/integration.js                  # AI: primary/fallback provider config, model roles, personal-data clearance

server/utils/
├── primaryIssueProposer.js            # NEW: rank authored labels vs cause text + signals; boxed AI tiebreak; confirm/reframe parsing
├── aiProvider.js                      # NEW: provider seam, once-only fallback, personal-data rule, provider on every reply
├── semanticProfiles.js                # NEW: effective profiles = authored rows over compiled file, 60 s TTL; thin test
├── outcomePoolBootCheck.js            # NEW: refuse to serve when a consenting firm exists and the secret is missing
├── outcomeLearning.js                 # net-balance size + direction; buildContribution reads trace.primaryIssue / trace.industry
├── outcomeLearningSession.js          # trace: lifted / held back / outweighed-by; direction
├── outcomeBench.js                    # capBreaches on the fixed bench; timeSplitBench
├── templateResolver.js                # signed pooled sizes, ADVISOR_EVIDENCE outweigh rule, options.profileMap, resolveIndustryWord, stop-words on issue keywords; SCORING_VERSION 2.3.0
├── caseStore.js                       # countReviewStatus(firmId) with dev fallback
└── openaiClient.js                    # unchanged; wrapped by aiProvider
server/advisorEngine.js                # issueProposed + issueDriver questions; trace.primaryIssue, trace.industry, trace.ai; profileMap option; call sites through aiProvider
server/courseEngine.js, server/routes/{cases,promptCheck,nextStepsDraft,compliance,meetingReview}.js,
server/utils/{hubReading,complianceCheck,meetingReports,anonymiseCase}.js   # call sites through aiProvider with {personal}
server/routes/
├── semanticProfiles.js                # NEW: list, save one, history, restore — mentorGuard
├── outcomeLearning.js                 # list adds reach + timeSplit; bench runs three
├── outcomeConsent.js                  # read adds the firm's reach pair; set refuses on:true without the secret
└── mentor.js                          # unchanged
server/restify-server.js               # routes; boot check before the listening line

components/
├── FirmManagerHub.vue                 # semanticProfiles tab: TAB_TIERS ['mentor'], NAV_GROUPS, panel
├── mentor/MentorSemanticProfiles.vue  # NEW
├── mentor/MentorOutcomeLearning.vue   # direction column, reach tiles, out-of-sample card, honesty line
├── firm/FirmOutcomeConsent.vue        # the firm's reach pair; secret-missing refusal message
└── VirtualAdvisor.vue                 # trace: lifted / outweighed-by lines; provider line; no new marker
utils/traceReasonCodes.js              # pooled:lifted-<n>, pooled:outweighed-<kind>
locales/*.json                         # semanticProfiles.*, outcomeLearning.* additions, decisionTrace.* additions
scripts/
├── scenario-lab.js                    # primary-issue metrics; thin-profile count; capBreaches
├── dev/seed-outcome-pool.js           # a landed-well template so a lift crosses the floor
└── build-semantic-profiles.js         # header comment: authored rows live in the store, this file is the seed

tests/unit/
├── primaryIssueProposer.test.js       # ranking, tie → AI box, confirm/reframe/none, context domains skipped (100%)
├── aiProvider.test.js                 # primary ok; primary fails → fallback once; personal + uncleared → no fallback; provider on reply (100%)
├── semanticProfiles.test.js           # merge order, TTL, thin test, compiler cannot touch authored rows
├── semanticProfiles.routes.test.js    # scope from token, save/history/restore
├── outcomePoolBootCheck.test.js       # consenting + missing → exit; none consenting → boot; test env skipped (100%)
├── outcomeLearning.test.js            # net balance, direction, contribution reads trace keys (updated)
├── pooledHoldback.test.js             # signed sizes, net cap, every ADVISOR_EVIDENCE kind outweighs (updated)
├── outcomeLearningTrace.test.js       # lifted, outweighed-by (updated)
├── outcomeBench.test.js               # capBreaches, timeSplit incl. insufficient (updated)
├── caseStoreCounts.test.js            # countReviewStatus, dev fallback
├── hubTabTiers.test.js                # semanticProfiles in MENTOR_ADDED_SINCE
└── retiredPrimaryIssueSelector.test.js # unchanged and must stay green
```

**Structure Decision**: the existing two-part layout. New backend modules follow the util-plus-route pairing of 4.87. The one new component follows `MentorTemplateLibrary.vue`, the smallest mentor tab.

## Phase 0 — Research

See [research.md](research.md). Decisions in one line each:

1. **R1 Primary issue**: a conversational `issueProposed` question after the domain check-in, ranking Mike's labels by keyword and signal with a boxed AI tie-break; confirm, reframe once, then one open driver question, then none; stored on the trace as `primaryIssue` and `industry` (which also fixes the pool's blank fields); no column.
2. **R2 Lift and hold-back**: one signed `size` per pairing from the net balance; resolver applies the net across matches, capped ±10; `SCORING_VERSION` 2.3.0.
3. **R3 The cap**: any of six advisor-evidence reason families outweighs; the fixed bench counts cap breaches and expects zero. Consequence stated: learning re-orders the long tail only.
4. **R4 Industry**: pooled as the vocabulary word the resolver's own matcher resolves it to.
5. **R5 Reach**: one SQL count per firm; summed over consenting firms for the mentor.
6. **R6 Secret**: an asynchronous boot refusal when a consenting firm exists; the consent switch refuses without it; two documents rewritten from "optional".
7. **R7 Out-of-sample**: adjustments from every earlier month, tested on the latest month; insufficient stated in words.
8. **R8 Provider seam**: a wrapper with once-only fallback; personal data gated by config; provider on every log line and on the advisor trace; four sites have no fallback by construction and say so.
9. **R9 Profiles**: authored rows per template at platform scope, merged over the compiled file at read time; thin = empty, `totalSignals < 4`, or keyword-sourced; the spec's 23/88 corrected to today's 46 empty / 149 auto / 1 reviewed.
10. **R10 Brief**: three places rewritten; the registry's stale sentinel line with them.

## Phase 1 — Design

- [data-model.md](data-model.md): the trace additions, the signed adjustment, the profile row, the reach pair, the time-split result, the provider record.
- [contracts/api.md](contracts/api.md): four new routes, three changed responses, the resolver options, the reason codes, the config keys, the hub tab entry, the boot check.
- [quickstart.md](quickstart.md): how to prove each of the ten stories on the built app, and what each bench must print.

### Constitution Check, re-run after design

Unchanged. The design added no dependency, no schema change, no frontend logic beyond rendering, and no tier the spec did not name.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| `AI_PRIMARY_*` / `AI_FALLBACK_*` / `AI_FALLBACK_PERSONAL_DATA_CLEARED` in `config/integration.js` and `.env.example` | Story 8 needs a second provider named in config, not code, and a clearance Mike sets. | Hardcoding a provider (the choice is Mike's; DeepSeek's terms make the default matter). |
| Eleven hardcoded model names moved into one role map | The fallback must carry its own model names; a role map is the only way both providers can be configured without touching call sites twice. | Leaving literals and mapping at the seam (two places to keep in step). |
| `caseStore.countReviewStatus(firmId)` | Story 5 needs a count; the store has none and its lists cap at 500 rows. | Counting rows in JS (caps, and rows leave the store for a number). |

## Decisions the plan puts to Mike (one yes/no each, at tasks time)

1. The class of the four advisor-conversation calls (research R8, rows 7-10): treated as not personal, per his 2026-09-06 ruling on the economic brief. Yes to that class?
2. The consequence in R3: with every evidence kind protected, pooled evidence re-orders only templates the advisor's words did not reach. Yes to that reading of FR-005?
3. The load pack and `.env.example` change from "optional" to "required once any firm shares". Yes?

## What is deliberately not in this plan

- No second-opinion mode (item 4.98).
- No fallback for the Responses-API sites or audio transcription; the seam records `fallback=none` for them.
- No firm or middle-tier view of profiles; no advisor edit of a profile.
- No routing groups (removed by ruling 2026-06-09).
- No back-fill of primary issues onto cases reviewed before this ships.
- No trained model anywhere.
