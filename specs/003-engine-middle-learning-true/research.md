# Research — the seams as found in the code, 2026-09-14

Every unknown in the plan's Technical Context was resolved by reading the code, not by
recalling it. Four read-only sweeps were run the same day: the AI call sites, the
primary-issue seam, the profile and hub seams, and the Outcome Learning extension points.
Each decision below names what was found, what was chosen, and what was rejected.

## R1 — The primary issue: where it lives today and where the step plugs in

**Found.**
- `state.primaryIssue` is initialised `null` (`server/advisorEngine.js:1904`), the intake
  entry for it is permanently skipped (`:2175-2178`), it is reset on a course correction
  (`:1975`), read into the course-correction message (`:1112`) and into the
  `collectedAnswers` string (`:2768`). `caseState.js:128` passes it to the resolver, where
  `primary_issue:strong_match` (+3) / `partial_match` (+1) at `templateResolver.js:331-341`
  have been dead since June because the field is always null.
- The cause-first domain check-in is the `domainConfirmed` question (`:2117-2141`), always
  asked, with `onAnswer` calling `resolveDomainCorrection`. The sequencer (`:2452-2542`)
  asks one question per turn: a `QUESTIONS` entry with `field`, `textFn`/`text`, `skip`,
  `onAnswer`. `sendQuestion` emits a plain `delta` and `done{field}`; the Nuxt proxy is
  byte-for-byte, so a new conversational question needs no proxy change.
- Nothing anywhere maps a signal or a keyword to an authored label. `data/primary-issues.json`
  is `{domain: [label, …]}`, 11 domains, 40 labels; the 11 other domains (the three context
  domains and eight newer ones) have none. The only reader today is the Outcome Learning
  guard's allow-list.
- **The decision trace stores `situation` as a newline-joined string** (`:2766-2806`).
  `outcomeLearning.buildContribution` (`server/utils/outcomeLearning.js:191-210`) tests
  `typeof trace.situation === 'object'` and so reads `null` for **both** `primaryIssue` and
  `industry` on every live row. Only the unit tests build `situation` as an object. This is a
  fault in 4.87 as built, found by this research.
- `tests/unit/retiredPrimaryIssueSelector.test.js` bans five identifiers and the locale key
  `advisor.primaryIssue` in `VirtualAdvisor.vue`, and pins exactly two marker-strip lines.
  `sendMessage` is locked while any selector card is open, so a free-text step must emit no
  marker.
- The Scenario Lab's 51 cases carry no expected primary issue; `outcomeBench.scenarioToCase`
  hardcodes `primaryIssue: ''`.

**Decision.**
- A new `QUESTIONS` entry `issueProposed` directly after `domainConfirmed`, skipped for the
  three context domains and for any domain with no authored labels. Its `textFn` calls a new
  `server/utils/primaryIssueProposer.js`, which ranks the domain's authored labels against
  `causeText(state)` by (a) keyword overlap with the label text and (b) the problem signals
  that fired, and when that leaves a tie or nothing, asks the model to pick **one label from
  the list or "none"** at temperature 0, boxed exactly like the domain backstop
  (`parseDomainClassification` pattern). The proposal line: the label, one reason, "have I
  got that right, or is it really something else?".
- `onAnswer`: a confirm pattern (the existing `_CONFIRM_PATTERN` family) stores the label;
  anything else is re-ranked as a reframe; a hit is proposed once more (`_forceAskField`
  pattern, one turn); a miss triggers FR-003a: one open question `issueDriver` ("what is the
  single biggest thing driving it?"), one more ranking, then `state.primaryIssue = null`,
  `console.log('[signal-miss] …')` and `trace.primaryIssue.how = 'none'`.
- Storage: **no new column.** The label rides `decision_trace` as a new top-level key
  `primaryIssue: { label, how: 'confirmed'|'reframed'|'none', reason }` and a new top-level
  `industry: string|null`. `buildContribution` reads those two keys, not `situation`; the
  string `situation` is untouched, because `resolveSavedClientContext` reads it as text.
- The resolver's `_primaryIssueKeywords` gains the same stop-word filter the industry
  keywords have (`STOP_WORDS`), which the June note flagged; and the title joins the text it
  matches against, because Mike's labels name tools ("Break-Even") as often as problems.
- The lab: `scenarioToCase` passes the proposer's top label through, and METRICS gains
  "Primary issue proposed: x/51, would confirm as proposed: y/51 (by the label the case's
  `domainConfirmed` text supports)".

**Rejected.** A `primary_issue` column (schema change, not needed: the trace is already the
pooled row's source). A menu of labels (the June ruling). A trained classifier (a fresh
decision for Mike, never assumed).

## R2 — Lift and hold-back from one net balance

**Found.** `computeAdjustments` emits `holdBack = round(10 × less ÷ delivered) ≥ 0`;
`liveAdjustments` filters `holdBack > 0`; the resolver drops any adjustment whose `holdBack`
is not `> 0` at normalisation (`templateResolver.js:221-232`), sums matched hold-backs,
caps at 10, subtracts, clamps at 1, and writes `pooled:held_back-<n>`. The trace parser
`HELD_BACK = /^pooled:held_back-(\d+)$/` is non-negative. The mentor table renders
`'−' + a.holdBack`; sort is by `holdBack` descending.

**Decision.** One signed field replaces the sizing: `size = round(10 × (well − less) ÷
delivered)`; `direction = size > 0 ? 'lift' : size < 0 ? 'holdBack' : 'none'`. `holdBack`
stays on the computed object as `Math.max(0, −size)` for one release so nothing that reads
it breaks, and is removed when the page no longer reads it. `liveAdjustments` filters
`size !== 0`. The resolver accepts a signed `size`, sums the matched sizes, caps the net at
±10, applies `score = max(1, score + net)`, and writes `pooled:lifted-<n>` or
`pooled:held_back-<n>`. The trace parser matches both; `applied[].direction` is added.
`SCORING_VERSION` moves to 2.3.0. The dev seed adds a template that lands well so a lift
crosses the floor locally.

**Rejected.** Two shares on one pairing (Mike, clarify Q1, Option B rejected). A separate
lift cap (no reason for two numbers).

## R3 — The cap: "the advisor's own words win" against every evidence kind

**Found.** Outweighed fires only on `reasons.some(r => r.indexOf('distinction:') === 0)`.
The advisor's own evidence produces four other reason families: `primary_issue:*`,
`industry:title_match` / `industry:tag_match`, and `semantic:<n>` (the problem-signal
match, three quarters of a typical score) plus `purpose_fallback:<n>` (signals matched
against purpose text when a template has no profile). The fixed bench reports "share
unchanged", not "cap held".

**Decision.** `ADVISOR_EVIDENCE = ['distinction:', 'primary_issue:', 'industry:title_match',
'industry:tag_match', 'semantic:', 'purpose_fallback:']`. A template carrying any of them is
outweighed; `pooled:outweighed` gains a suffix naming the first family matched
(`pooled:outweighed-semantic`), and the trace's `by` reports it. The fixed bench's `after`
becomes two numbers: `unchanged` (as today) and `capBreaches` (cases where a template carrying
advisor evidence moved past or below an adjusted one), and SC-003 reads the second.

**Consequence, stated for Mike's yes on the plan.** With `semantic:` in the list, a pooled
adjustment can only move a template the advisor's words did not reach at all: one surfacing
on the domain prior, engagement fit, or a tree hint. That is the literal reading of FR-005 and
of the promise on the consent tab; it means learning re-orders the long tail, never the head.
If Mike wants pooled evidence to weigh against weak advisor evidence (a single partial match)
that is a different rule and a fresh ruling; the plan does not assume it.

**Rejected.** A numeric comparison (pooled size versus the points the evidence earned): it
makes "win" a matter of magnitudes the mentor cannot read on the page.

## R4 — Industry into the pool

**Found.** `buildContribution` pools a typed industry only on an exact, case-insensitive
match with the vocabulary set; the resolver matches with `_matchesWord` (equal, or a ≥4-char
prefix either way) after splitting on `/[\s—\-,/&]+/` and dropping `STOP_WORDS` and
`INDUSTRY_STOPWORDS` (exported). And per R1 the industry is read from the wrong place, so it
is null regardless.

**Decision.** `templateResolver` exports `resolveIndustryWord(typed, vocabulary)`: split and
filter exactly as `_industryKeywords`, then the first keyword that `_matchesWord`es a
vocabulary word, returning **the vocabulary word**. `buildContribution` reads
`trace.industry`, calls it, and pools the vocabulary word or `null`. The guard is unchanged:
the row still carries only a vocabulary word.

## R5 — The loop's reach

**Found.** `caseStore` has no count function; `reviewed_at` is set only by `updateReview`
together with `feedback_pending = 0`; the mentor shape drops both. `listFirmIdsWithConfigKey`
lists firms holding a config key, excluding the platform scope.

**Decision.** `caseStore.countReviewStatus(firmId)` → `{ delivered, reviewed }` by one
`SELECT COUNT(*)` grouped on `reviewed_at IS NULL` over `firm_id`, all visibilities (a count
discloses no case), with the dev-JSON fallback branch. The mentor's list route sums it over
firms whose consent record is on; the firm's read route returns its own pair. Cached with the
same 60 s TTL as the live adjustments so the page stays inside 2000 ms.

**Rejected.** Reading rows and counting in JS (500-row cap, and rows leave the store for a
number).

## R6 — The pool secret fails loud

**Found.** `_secret()` reads `process.env.OUTCOME_POOL_SECRET` lazily and throws
`OUTCOME_POOL_SECRET_MISSING`. Boot has two refusal precedents in `restify-server.js`:
`checkNodeVersion` and `assertConfig` (fatal in production, warn in dev), both synchronous
and before `listen`. A consenting-firm check needs the database, so it is asynchronous.
**`design/UAT-LOAD-PACK.md:55` and `.env.example:116-120` both call the secret optional**,
and the load pack's "five genuinely required" list excludes it.

**Decision.** `server/utils/outcomePoolBootCheck.js` — `assertPoolSecretIfConsented()` runs
inside `server.listen`'s callback path before the listening line: if
`listFirmIdsWithConfigKey('outcome-consent')` yields any firm whose record is `on` and the
secret is missing, it prints `[startup] FATAL: OUTCOME_POOL_SECRET is not set but <n> firm(s)
share outcomes` and exits 1; skipped under `NODE_ENV=test`. The consent `set` route refuses
`on: true` with `503 POOL_UNAVAILABLE` when the secret is missing (the withdraw route already
does). The load pack line and `.env.example` are rewritten to say: optional until the first
firm switches sharing on, required and never changed after. Both are named edits in tasks.

**Named for Mike.** This reverses the load pack's "optional" wording he approved on 4.87. The
spec (story 6) already rules it; the plan records that the two documents change with it.

## R7 — An honest out-of-sample bench

**Found.** `outcomeBench` reads every row and ignores `row.month`; the seed spreads 31 rows
over 2026-07/08/09 round-robin, so a month split has data but the verdicts are interleaved
with month, so a local run will show little signal. The benches are stored on the decisions
row as `{fixed, outcome}` with `ranAt` and `liveIds`.

**Decision.** `timeSplitBench(poolRows, decisions, templates)`: cut-off = the latest month
present; training rows = every earlier month; test rows = the latest month. Adjustments are
recomputed from the training rows alone, and only ids the mentor has marked live are applied
(the mentor's decisions, the training set's evidence). It reports `{ cutoff, trained, tested,
before, after, liveIds }`; when the test month holds fewer than `MIN_CASES` rows it reports
`insufficient: true` and no figure. Stored as `benches.timeSplit`. The honesty line becomes
three sentences: in-sample, out-of-sample, and which to trust.

## R8 — A provider-neutral fallback

**Found.** Two clients: `openaiClient.js` (chat completions and the Responses API, raw
`https`, no retry, no logging, key passed in by every caller) and `transcriptionClient.js`
(multipart audio). 25 call sites; model names hardcoded in eleven places; four log-line
formats; the decision trace records no model. Three sites use Responses-API-only features
(web search with citations; base64 PDF input) and one is audio: none has a chat-completions
equivalent at another provider. Several sites already have a factory seam (`_setClientFactory`,
`_setClient`, injected `deps.client`).

**The per-call personal-data class** (the list the plan owed Mike). Personal data = a
client's words, a transcript, a client name, or figures identifying a client.

| # | Call | Sends | Class |
|---|---|---|---|
| 1-6 | advisorEngine classifiers (distinctions, domain backstop, distress, moving-forward, learn tree, domain confirmation) | fenced advisor sentence | not personal |
| 7-10 | advisorEngine streams (intake message, post-recommendation chat, the recommendation, the main turn) | the advisor's conversation about a client, no client record | **advisor's words about a client — Mike to confirm the class; the plan treats it as not personal, per the 2026-09-06 ruling on the economic brief** |
| 11-14 | courseEngine (outline, session, quiz make, quiz grade) | fenced advisor profile and answers | not personal |
| 15 | `anonymiseCase` — the de-identification call | the whole client conversation | **personal** |
| 16 | hub reading | page figures only | not personal |
| 17 | prompt check | the user's own pasted document | not personal |
| 18 | compliance check | document file names | not personal |
| 19 | next-steps draft | eight colour words | not personal |
| 20 | economic analysis (Responses + web search) | the advisor's brief | not personal; **no fallback possible** |
| 21-22 | depreciation and country schedule reads (Responses + PDF) | a published government PDF | not personal; **no fallback possible** |
| 23 | meeting transcription (audio) | the whole recording | **personal; no fallback possible** |
| 24-25 | meeting summary, coaching notes | the full transcript | **personal** |

**Decision.** `server/utils/aiProvider.js` wraps `createOpenAIClient`: `getProvider(role)`
reads `config/integration.js → AI` (from env: `AI_PRIMARY_*`, `AI_FALLBACK_*`: name, api key,
host, chat path, model map by role) and returns a client whose `chat.completions.create` tries
the primary, and on a thrown error, a 401/402/429/5xx status, or an empty reply, tries the
fallback **once** when (a) a fallback is configured and (b) the call is not classed personal
or `AI_FALLBACK_PERSONAL_DATA_CLEARED=true`. Every call site passes `{ personal: true|false }`
in `options`; the wrapper returns `{ …reply, provider }` and every log line gains
`provider=<name>`. The Responses API and the audio client keep one provider by construction
and log `provider=openai fallback=none`. The advisor trace gains `ai: { provider }` set from the
recommendation call. Model names move from the eleven literals into one role map so the
fallback can carry its own names. No provider is named in code; DeepSeek's hosting and terms
are named in the config comment as the reason the personal-data flag defaults to false.

**Rejected.** Retrying the primary (it was already refused). A second opinion (item 4.98). A
fallback for the Responses-API and audio sites (no equivalent exists; say so rather than fake it).

## R9 — Template profiles on a screen

**Found.** `data/semantic-profiles.json` is an array of 199 entries keyed by `page`; live
counts: **46 empty profiles** (38 with no summary at all, 8 with a summary that matched no
keyword), 150 high / 3 medium / 46 low confidence, sources `auto` 149, `keyword` 11,
`reviewed` 1. **The audit's "23 with no signals / 88 purpose-only" figures reproduce from
nothing in the repository today**; the spec is corrected to the live counts. The compiler
rewrites the whole file from the registry and would erase a hand edit; the resolver loads the
file once, synchronously, and caches it for the process's life. The semantic term is
`weight × signalCount × 2 × domainWeight`, unbounded, and the profile also decides industry
suppression. Two platform-scope patterns exist: one key holding a map with one history
(`outcome-adjustments`), or one row per thing under a prefix (`outcome-pool:`).
`hubTabTiers.test.js` requires every new mentor tab in `MENTOR_ADDED_SINCE` with its ruling and
a `TAB_TIERS` entry.

**Decision.** Authored profiles live in the overlay store at `PLATFORM_SCOPE` under
`semantic-profile:<pageId>`, one row per template, so each has its own version history and
restore, and nothing the compiler or a fresh export writes can touch them (the rule Mike
asked for, satisfied by where they live rather than by a guard). A new
`server/utils/semanticProfiles.js` — `loadEffectiveProfiles()` merges the authored rows over
the compiled file with the 60 s TTL the library uses; `advisorEngine` passes the merged map to
`resolveTemplates` as `options.profileMap`, so the resolver stays synchronous and its
file-load path is the fallback. "Thin" = empty profile, or `totalSignals < 4` (the compiler's
own high-confidence threshold), or source `keyword`. The screen lists every template with its
effective profile, flags thin ones with the reason, shows the summary's indicators read-only,
and edits signal ticks with weights 1-10 (default 5 when first ticked). The lab gains
"Templates with a thin effective profile: n/199" and each case's top card shows whether a
`semantic:` reason carried it.

**Rejected.** Writing authored edits into `content-summaries.json`'s `reviewed_signal_map`
(the compiler would then have to run, and the file is a build input, not a screen). A firm
tier (a firm's vocabulary already reaches scoring through distinctions; the profile is
platform content). Making the resolver asynchronous (every caller and the benches would
change for one read).

## R10 — The brief's routing-groups line

**Found.** `design/virt-advisor-registry.md:375` and `:886-888`: routing groups removed by
ruling, 2026-06-09. `design/features/advisory-engine.md:101-103`, `:137-138`, `:196` still say
"designed, not built". **Decision.** The three places are rewritten to say removed by ruling,
with the registry line cited; the pipeline table row becomes "removed 2026-06-09". The
registry's own stale line about the `__none_of_these__` sentinel (`:551`, the handler was
deleted 2026-08-15) is corrected in the same edit since R1 found it.
