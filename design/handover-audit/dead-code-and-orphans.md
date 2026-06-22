# Dead Code, Orphans & Parked-Asset Inventory — Handover Audit

> **✅ UPDATE 2026-06-23 — the 3 "Confirmed dead" exports are resolved.** Traced each first (the
> apparent "3–4 refs" were def + `module.exports` + doc-comment examples, not callers).
> `getSummaryByPage` + `getTemplateByPage` **removed** from `templateRegistry.js`. `SCORING_VERSION`
> **kept and wired** into the `[va-session]` log + the persisted decision trace (its documented
> intent), not deleted — it part-delivers the auditability "tag each saved case with the active
> version" goal. +3 tests; 513/513 pass. See `design/ACTIONS.md` (CLEANUP item, done). The
> **Suspected (6)** and **Dormant-by-design** buckets below are unchanged.

**Audit date:** 2026-06-21 · **Scope:** READ-ONLY. No code changed. No `search_content*.json` touched.
**Method:** static reference tracing with Grep/Glob/Read only. Every claim below cites `path:line`.
**Conservatism rule applied:** an item is only "Confirmed dead" when a whole-repo search shows
**zero** non-definition, non-doc, non-test references. Anything with a test-only reference, an
internal-only reference, or a deliberate design status is labelled **Suspected** or
**Dormant-by-design (do not remove)**.

---

## Summary

| Bucket | Count | Notes |
|---|---|---|
| **Confirmed dead** (zero refs anywhere outside own def) | **3** | `getSummaryByPage`, `getTemplateByPage`, `SCORING_VERSION` |
| **Suspected** (test-only / internal-only / orphaned-but-named) | **6** | `validateAIResponse`, `parseSSELine`, `resetCoachingCache`, `buildInsightPrompt`, `server/routes/advisor.js` 501 stub, `DEV_FILES` export |
| **Dormant-by-design (DO NOT remove)** | **28 trees + 3 stubs** | 28 dormant logic trees (fallback-only); `CourseReminderService` stub; `firm.js` stub handlers; commented OpenAI stub |

**Orphaned-utils verdict (the headline question):**
`validateAIResponse({content:string})` and `parseSSELine` ARE genuinely orphaned — **no
production call site exists** (only `tests/` + `jest.config.js`). The backlog claim is
**CONFIRMED**. However the *file* `server/utils/validateAIResponse.js` is NOT dead: its two
sibling exports `validateQuizGenerate` / `validateQuizGrade` are live in `courseEngine.js`.
So the recommendation is **retire the two orphaned functions, keep the file** (see below).

`CONTEXT_DOMAINS` / `PRIMARY_ISSUES` dead-constant check: `CONTEXT_DOMAINS` returns **zero hits
repo-wide** (confirmed removed). `PRIMARY_ISSUES` still exists at
`components/VirtualAdvisor.vue:722` but is **live** (consumed at `VirtualAdvisor.vue:843`) — it is
a frontend display map, not a dead backend constant. Nothing to action.

---

## 1. Orphaned utils (backlog-flagged) — call-site evidence + recommendation

### `validateAIResponse(response)` — expects a `{content:string}` shape
**Definition:** `server/utils/validateAIResponse.js:26-48`.
**All references found repo-wide:**
- `tests/unit/validateAIResponse.test.js:11,18,27,…,109` (test only)
- `jest.config.js:19` (100%-coverage gate config)
- `design/ACTIONS.md:60` (backlog note describing it as orphaned)

**No production caller.** The live AI shapes are: quiz-grade `{passed,score,feedback}`,
quiz-generate `{questions:[…]}`, and distinction-classify (array) — **none** is `{content:string}`.
Confirmed by the backlog's own analysis (`ACTIONS.md:60`).

→ **Verdict: truly orphaned.** **Recommendation: RETIRE** the function (and its tests + the
`jest.config.js:19` coverage entry that pins it). It validates a shape no live path produces.
No retarget candidate exists — the three real shapes already have dedicated validators.

### `parseSSELine(line)`
**Definition:** `server/utils/validateAIResponse.js:58-77`.
**All references found repo-wide:**
- `tests/unit/validateAIResponse.test.js:118-195` (test only)
- `design/ACTIONS.md:60` (backlog note)

**No production caller.** The frontend parses SSE inline (the streaming consumer in
`components/VirtualAdvisor.vue` reads the SSE stream itself); the backend SSE parser that *is*
live is `parseSSEStream` in `openaiClient.js:43` (used at `openaiClient.js:145`), a different
function operating on raw byte chunks, not `"data: "`-prefixed lines.

→ **Verdict: truly orphaned.** **Recommendation: RETIRE.** Distinct from the live
`parseSSEStream`; nothing imports it.

### Counter-evidence — the file itself is NOT dead
`server/utils/validateAIResponse.js` also exports `validateQuizGenerate` /
`validateQuizGrade`, both **live**:
- `server/courseEngine.js:22` (import), `:391` (`validateQuizGenerate`), `:434` (`validateQuizGrade`).

→ **Keep the file.** Remove only the two orphaned functions if the team accepts the retire
recommendation. (This is a P1 #1 open sub-item per `ACTIONS.md:60`: "the orphaned
`validateAIResponse({content})` / `parseSSELine` retarget-or-retire decision" is still open.)

---

## 2. Dormant logic trees — list + live-wiring evidence

**Source data:** `data/logic_trees.json` — **42 top-level trees** (confirmed: 42 `entry_triggers`
blocks; ids from `quickfire` @ line 16 to `cash_tactics` @ line 6699).
**Loader/engine:** `server/utils/logicTrees.js`.

### How trees are reached (live wiring)
There are **two** consumption paths, both in the engines:

1. **Learn-mode content path (LIVE):** `detectLogicTree` / `detectLogicTrees` /
   `buildLearnReferenceText` →
   - `server/advisorEngine.js:17` (import), `:371` (`loadLogicTrees().filter(t => t.mode === 'learn')`),
     `:2100`, `:2102`, `:2112`, `:2114` (learn + deep-dive offer)
   - `server/courseEngine.js:20,294,295`
   These consume **only `mode: "learn"` trees** (14 of them).

2. **Diagnostic fallback path (RARELY HIT):** `detectLogicTrees` + `walkLogicTree` at
   `server/advisorEngine.js:1780-1785`. This branch runs **only when the deterministic resolver
   returns zero candidates** (`advisorEngine.js:1772-1779` — `if (_resolverCandidates.length > 0)`
   takes the resolver path; the `else` is the tree walk). The normal Client flow uses advisor
   primary-issue selection + `templateResolver`, so this fallback is bypassed in the common case.

### The 14 ACTIVE trees (`mode: "learn"`)
Confirmed by `mode` grep (14 hits at lines 1302,1712,1857,1948,2050,2160,2226,2313,2424,2498,
2572,2641,2710,2778) and by the registry (`virt-advisor-registry.md:254`):
`sales_process`, `public_speaking`, `trial_fit`, `cautious_reveal`, `eoy_meeting`,
`facilitation_101`, `reveal_growth_curve`, `conflict_meeting`,
`capacity_capability_opportunity`, `heald_matrix`, `demings_volatility`,
`working_capital_cycle`, `ratio_analysis`, `dashboard_discussions`.
Each has a companion reference formatter wired in `logicTrees.js:1050-1064`
(`LEARN_REFERENCE_FORMATTERS`).

### The 28 DORMANT trees (no `mode`, diagnostic)
(Registry `virt-advisor-registry.md:255`; cross-checked against the id census in
`logic_trees.json`.) Reachable **only** via the resolver-empty fallback at
`advisorEngine.js:1783`:
`quickfire`, `client_sales`, `cashflow`, `governance`, `client_planning`,
`staff_performance`, `frameworks_find`, `systems`, `risk_management`, `valuation`,
`succession`, `profitability_feasibility`, `due_diligence`, `get_sales_tracker`,
`get_marketing`, `get_positioning`, `get_team_problem`, `get_pricing_proposals`,
`stock_purchasing`, `raising_capital`, `fm_coach_culture`, `get_seminar`,
`org_ca_firm_strategy`, `org_firm_board_pack`, `org_leadership`,
`financial_systems_review`, `three_pill_fin_mgt`, `cash_tactics`.

→ **Verdict: DORMANT-BY-DESIGN (do not remove).** These are **not dead** — they are a wired but
rarely-hit Stage-4 fallback (`advisorEngine.js:1779-1785`), and they carry significant
proprietary IP. The registry explicitly classifies them as "dormant (fallback-only) / parked"
(`virt-advisor-registry.md:230`) and there is a **named, open Mike-decision** to wire-in / retire
/ leave them (`ACTIONS.md:140`). This is the standing "no silent parking" example — they must
**stay named in the registry, not be deleted as an aggregate cleanup.** Removing them is a
product decision, not a code-cleanup decision.

> ⚠ Related real defect surfaced while tracing (NOT in scope to fix here): `logicTrees.js:40-80`
> (`validateLogicTreeReferences`) hard-codes two `search_content_*.json` filenames
> (`logicTrees.js:43`). If the master export filename changes, the ghost-reference validator
> silently no-ops. Flag for the team; do not edit.

---

## 3. Unused exports / dead constants

Verified by whole-repo `.js`/`.vue` reference search (definition + `module.exports` lines and
doc-comments excluded; test refs noted explicitly).

| Export | File:line (def) | Status | Evidence |
|---|---|---|---|
| `getSummaryByPage` | `server/utils/templateRegistry.js:67` | **Confirmed dead** | Only refs are the def, the `module.exports` (`:100`) and a usage-example doc-comment (`:10,:13`). No importer, no internal call. |
| `getTemplateByPage` | `server/utils/templateRegistry.js:72` | **Confirmed dead** | Same as above (`:10,:14,:100`). No consumer. |
| `SCORING_VERSION` | `server/utils/templateResolver.js:28` | **Confirmed dead** | Exported (`:544`); the comment (`:27`) says "bump … so scoring logs are traceable" but **no log or caller references it**. Zero consumers repo-wide. |
| `resetCoachingCache` | `server/utils/coaching.js:24` | **Suspected** | Exported (`:46`); **no reference anywhere**, including tests. Likely a test-helper whose test was removed. Conservative: Suspected (confirm no future test harness needs it). |
| `buildInsightPrompt` | `server/routes/firm.js:86` | **Suspected** | Exported (`:109`); only "call site" is a **commented-out** line (`firm.js:63`). Built ahead of the (stubbed) OpenAI hookup. Dormant pending the firm-insights build. |
| `DEV_FILES` (export) | `server/utils/firmDistinctions.js:36` | **Suspected (redundant export)** | The constant **is used internally** (`firmDistinctions.js:79-81`), so the symbol is live; but the **export** has no external consumer. Safe to keep; flag the export as redundant. |

**Live exports that looked suspect but are USED (do NOT touch):** `detectLogicTrees`
(`advisorEngine.js:1780`), `DOMAIN_NATURAL_ENGAGEMENT` (`strategyResolver.js:26`),
`staircaseToCeiling`/`causeText` (internal: `caseState.js:134,154`), `SIGNAL_DESCRIPTIONS`
(`advisorEngine.js:27`), `SIGNAL_REGISTRY` (`templateResolver.js:5`),
`formatDomainSummaryForDesign`/`detectDomainsForDesign` (`courseEngine.js:19`),
`appendCoachingEntry` (`cases.js:3`), `extractTemplatesFromText` (`advisorEngine.js:23`),
`CONFIG_KEYS` (`firmManager.js`), `SIGNAL_TYPES` (`caseState.js`/`signals.js`),
`buildObservabilityPayload` (`advisorEngine.js:25`), `conversationHasGrowthStage`
(`advisorEngine.js:16`), `getVersionHistory`/`restoreVersion` (`firmManager.js:318,332`),
`getDoTheJobTemplatesWithSummaries` (`scripts/build-semantic-profiles.js:171`),
`parseSSEStream` (internal `openaiClient.js:145` + tests — NOT dead),
`injectVideoInfo` (`advisorEngine.js:1496,2006,2240`).

**Dead-constant re-check (`CONTEXT_DOMAINS`/`PRIMARY_ISSUES`):**
`CONTEXT_DOMAINS` — **zero hits repo-wide → confirmed already removed.**
`PRIMARY_ISSUES` — **live** at `VirtualAdvisor.vue:722` (consumed `:843`). Not dead.

---

## 4. Stubs / TODO / FIXME inventory

No `TODO`/`FIXME`/`stub` markers found in `mixins/`, `utils/`, `server-middleware/`, `store/`,
`plugins/` (frontend clean). All labelled stubs are backend, all **honestly labelled** (no
silent parking):

| Location | Kind | Status |
|---|---|---|
| `server/services/CourseReminderService.js:28,47,66` | `TODO: Platform team — wire to notification system`; methods log-only (`:32,:49,:69`) | **Dormant-by-design.** Phase-1 stub by design (registry `:155`; `ACTIONS.md:145`). `markComplete` IS wired live (`courseEngine.js:453`); `scheduleReminder`/`cancelReminder` are internal-only (`CourseReminderService.js:65`). |
| `server/courseEngine.js:451` | `// Phase 1: stub — platform team wires this in Phase 2` | Dormant-by-design (the `progress` handler persistence). |
| `server/routes/firm.js:9-21,31,45,59,72` | `TODO` DB hookup + `TODO` OpenAI hookup; `getAdvisors`/`postInsights` return empty stubs | **Dormant-by-design** but mounted live (`restify-server.js:123-124`); `FirmDashboard.vue` uses its own mock data. Documented in `HANDOFF.md:239`. |
| `server/routes/firm.js:60-69` | **Commented-out OpenAI SDK stub** (`// const OpenAI = require('openai')`) | **Suspected / governance hazard.** If un-commented it re-introduces the OpenAI SDK + key into a route the wrong way; Req 7 (amended) mandates the backend REST client `openaiClient.js`. Flag: when wired, must use `createOpenAIClient`, NOT this commented SDK pattern. |
| `server/routes/advisor.js` (whole file) | `Restify route stub — migration target`; returns `501 NOT_MIGRATED` (`:18-24`) | **Suspected dead file.** **NOT mounted** anywhere (`restify-server.js` mounts `advisorEngine` at `:121`, never `routes/advisor.js`). Its only repo reference is a doc-comment in `firm.js:20`. The Phase-2 migration it anticipated already happened (engine moved to `advisorEngine.js`), so this stub is likely obsolete. Confirm with team before removal. |
| `server/restify-server.js:38-59` | "placeholder config" startup guards | **Live & correct** — fail-fast guards, not a stub. Keep. |

No commented-out *logic* blocks found beyond the firm.js illustrative TODOs above.

---

## 5. Cleanup candidates table (for team review — nothing removed)

| # | Item | path:line | Classification | Recommended action |
|---|---|---|---|---|
| 1 | `validateAIResponse({content})` | `server/utils/validateAIResponse.js:26` | **Suspected dead (truly orphaned)** | Retire fn + its tests + `jest.config.js:19` entry. Keep the file. |
| 2 | `parseSSELine` | `server/utils/validateAIResponse.js:58` | **Suspected dead (truly orphaned)** | Retire fn + its tests. |
| 3 | `getSummaryByPage` | `server/utils/templateRegistry.js:67` | **Confirmed dead** | Remove export + fn (no consumer). |
| 4 | `getTemplateByPage` | `server/utils/templateRegistry.js:72` | **Confirmed dead** | Remove export + fn. |
| 5 | `SCORING_VERSION` | `server/utils/templateResolver.js:28` | **Confirmed dead** | Either wire it into scoring logs (its stated purpose) or remove. |
| 6 | `resetCoachingCache` | `server/utils/coaching.js:24` | **Suspected dead** | Confirm no test harness needs it, then remove or add a test. |
| 7 | `buildInsightPrompt` | `server/routes/firm.js:86` | **Suspected (dormant)** | Keep until firm-insights is built (it is the prompt for that stub); re-confirm at that time. |
| 8 | `DEV_FILES` export | `server/utils/firmDistinctions.js:90` | **Suspected (redundant export)** | Symbol live internally; drop only the export if desired. |
| 9 | `server/routes/advisor.js` 501 stub file | `server/routes/advisor.js` (whole) | **Suspected dead file** | Confirm migration superseded it; if so, remove. Not mounted. |
| 10 | Commented OpenAI SDK stub | `server/routes/firm.js:60-69` | **Dormant-by-design / hazard** | When wiring firm-insights, replace with `openaiClient.js`; do NOT un-comment as-is. |
| 11 | `CourseReminderService` stub methods | `server/services/CourseReminderService.js:28-69` | **Dormant-by-design (DO NOT remove)** | Phase-2 build target (`ACTIONS.md:145`). Keep. |
| 12 | `firm.js` `getAdvisors`/`postInsights` stub handlers | `server/routes/firm.js:28,56` | **Dormant-by-design (DO NOT remove)** | Mounted live, return empty by design; Phase-2 DB hookup (`HANDOFF.md:239`). |
| 13 | 28 dormant diagnostic logic trees | `data/logic_trees.json` (ids in §2) | **Dormant-by-design (DO NOT remove)** | Product decision pending (`ACTIONS.md:140`). Fallback-wired, IP-bearing. Keep & keep named. |

---

## Open questions for the team

1. **Retire-vs-retarget on the two orphaned validators** (`validateAIResponse`/`parseSSELine`):
   confirm RETIRE. They validate/parse shapes no live path produces, and the live equivalents
   (`validateQuizGenerate`/`validateQuizGrade`, `parseSSEStream`) already exist. Open per
   `ACTIONS.md:60`.
2. **Is `server/routes/advisor.js` (the 501 stub) obsolete?** The Phase-2 migration it points to
   appears done (`advisorEngine` is mounted at `restify-server.js:121`). If confirmed, it is a
   safe deletion. Its 501 response is unreachable (never routed).
3. **`SCORING_VERSION`** — was it meant to appear in scoring logs (per its comment) and the
   logging line was dropped, or is the version tracking abandoned? Decide wire-in vs delete.
4. **The 28 dormant trees** — this is the big standing decision (`ACTIONS.md:140`): wire into
   Stage-2 diagnosis, retire, or leave as fallback. Out of scope for code cleanup; named here
   only so the handover team sees it is *honestly parked*, not hidden.
5. **`logicTrees.js:43` hard-coded `search_content_*.json` filenames** — the ghost-reference
   validator silently no-ops if the master export is renamed. Not a dead-code item, but a
   fragility worth the team's attention.
