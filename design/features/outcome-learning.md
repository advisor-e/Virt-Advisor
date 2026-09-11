# The Founder's Claims Audit and Outcome Learning

> **One page, two halves.** The first half is the audit Mike asked for on 2026-09-10: three
> claims he wants to market, read against the design documents and the code. The second half
> is the task that came out of it, item **4.87 · Outcome Learning**, in his words, with the spec
> at [`specs/002-outcome-learning/spec.md`](../../specs/002-outcome-learning/spec.md). The
> backend and the advisor's panel are built through story 3 (2026-09-11); the two hub screens,
> the seed script and the benches are not — §8 says what stands where. The history is in
> [`outcome-learning-history.md`](outcome-learning-history.md).
>
> **Read against the code at commit `b1466ef`**: the Advisory Engine, Advisory Distinctions and
> Virtual Advisor briefs, the Design Logic, the Scenario Lab report; `server/advisorEngine.js`,
> `templateResolver.js`, `strategyResolver.js`, `fabricationWatch.js`, `validateAIResponse.js`,
> `caseStore.js`, `priorEngagement.js`, the labs, and the test suite.

---

## Part one — the Founder's Claims Audit

You said you have built a world-class AI coach for advisors from hard-coded logic, AI, and
robust learning loops. This is what the design documents promise, what the code actually does,
and where the gap is. Every line points at a file you can open.

| Claim | Verdict | In one line |
|---|---|---|
| Hard-coded logic makes the decisions | **Holds** | The engine decides which templates and why. The AI never picks one. |
| AI is in the product | **Holds, bounded** | Used in seven places, each fenced, validated or gated. Fully dependent on one provider. |
| Robust learning loops | **Partly** | Real loops exist, including one that closes on outcomes for the same client. Nothing yet learns across clients, firms or the platform. |
| World class | **Unprovable here** | The code cannot prove a comparison. It can prove traceability, guardrails and test depth, which is what a buyer can check. |

## 1. Hard-coded logic makes the decisions

The Advisory Engine brief states the architecture in one line: *the engine decides; the AI
writes.* The code matches it.

| Claim in the design | What the code does | Where |
|---|---|---|
| Template selection is scored and ranked in code, no AI | A deterministic scorer over domain, primary issue, industry, signals and distinction boosts. No model call anywhere in the resolver. | `server/utils/templateResolver.js` |
| The staircase ceiling is the one hard block; everything else ranks and flags | Exactly one hard filter, `CEILING_BLOCKED`; engagement type is a scoring preference only. A second pass runs without the ceiling so the best out-of-range option is shown as a stretch, never hidden. | `templateResolver.js` lines 96–260 |
| AI classifies one typed signal at a time, temperature 0 | Five model call sites in the engine, every one at temperature 0. | `server/advisorEngine.js` lines 147, 287, 333, 671, 1189 |
| Domain detection is keyword-first, AI only as a boxed backstop | Keyword match first; a tie asks the advisor; no match at all lets the AI choose, restricted to the 14 domain ids, and the decision trace records which path chose it. | `advisorEngine.js` lines 1976–2017, `domainSetBy` at 3230 |
| Every recommendation is traceable | A decision trace is built through the session and carried to the screen. | `decisionTrace`, 8 sites in the engine |
| Advisor and client text is hostile | Delimited before it enters any prompt, at 61 sites across the backend. | `fenceUntrusted` |
| Never trust model output as data | Every structured AI reply passes a validator. Those validators are held at 100% line, branch and function coverage by the build itself. | `validateAIResponse.js`, `jest.config.js` line 104 |
| The AI cannot invent the firm's material | A fabrication watch detects quoted script-like wording that traces to neither the firm's reference material nor the conversation, and appends a visible correction. Shipped log-only in June, enforcement in July after live threads showed zero false positives. | `server/utils/fabricationWatch.js` |
| The AI says what it does not know rather than filling the gap | Every Learn-mode prompt carries a generated statement of which guides it holds and which it does not, and the instruction to decline and name the right guide. Verified against the live model. | `design/LEARN-SCOPE-HONESTY.md` |

> **Measured, not asserted.** The Scenario Lab runs a fixed set of 51 invented sessions across all
> 14 domains before and after any engine change. Its last run: the top recommendation matched
> something the advisor actually said in 51 of 51 cases; the distress read caught all 4 genuine
> crises with one false alarm. [`SCENARIO-LAB-REPORT.md`](../SCENARIO-LAB-REPORT.md).

> ⚠ **The honest gap in this claim.** The same report shows the signal lever fired in only 21 of
> 51 sessions. The other 30 ranked on domain priors alone. Two stages of the designed pipeline,
> primary-issue classification and routing groups, are written down and not in the code, and the
> brief says so plainly. 88 templates have thin purpose-only profiles and 23 carry no signals,
> which limits how sharply the scorer can separate them. These are precision limits, not
> correctness faults, and they are all on the record.

## 2. AI is in the product, and it is bounded everywhere it appears

Seven distinct uses, each with a control around it. That combination is the real claim, and it
holds.

| Where the AI works | The control around it |
|---|---|
| Signal classification from free text | One enumerated signal per call, temperature 0, never a free answer |
| Writing the recommendation narrative | Template names validated against the library; images and raw HTML disabled in the renderer; the markdown pipeline locked after repeated real-world breakage |
| Domain backstop | Only when keywords find nothing; boxed to the 14 ids; logged |
| Course sessions and quizzes | The AI facilitates and points to the library, never teaches the content; questions built from the firm's own banks (63 banks); a grading failure records "ungraded", never an invented score |
| Meeting transcription and the two reports | Every quote verified against the transcript before storage; a quote the client said, or one uncited, is dropped; transcript wrapped in delimiters and declared not-instructions |
| Economic analysis for a forecast | The advisor writes the brief and sees the exact words sent; a citation guard refuses unsourced answers; the pack prints only on explicit approval |
| Reading a tax authority's depreciation schedule | The AI proposes, a manager approves, and nothing reads an unapproved table; every figure carries its source document and date |

> ⚠ **Weaknesses a buyer would find.** Everything runs on one provider, OpenAI, through a direct
> REST call. The economic analysis produced nine live faults that the green tests never caught,
> found only by running it in a browser. The rendering pipeline is protected by a lock rather than
> by a design that cannot break. A handful of on-screen strings are still hardcoded English
> despite the localisation rule.

## 3. Robust learning loops — partly

The loops that exist are real, and they are human-in-the-loop by design: a domain expert changes
the system without a developer, and the change reaches every advisor through a cascade that
offers rather than overwrites. What does not exist is any loop that closes itself across firms.

### What is built and proven

- **Advisory Distinctions.** Plain-English rows a mentor or firm writes, turned into score boosts
  in the resolver. A firm's edit sticks; the mentor's later change is offered, never applied. This
  is the mechanism behind the product's central promise, and it is live at every tier.
  `templateResolver.js` line 367.
- **Logic tables and observation points editable at four tiers**, with version history and restore.
- **Quiz banks and graded results** feeding an advisor's progress and CPD record; 63 banks keyed to
  templates.
- **The case-study review, and it closes on outcomes.** After delivery the advisor records what
  went well, what went less well, what they would change, and a verdict on every template: used in
  full, partly or not at all, and whether it went well or less well (Mike's ruling, 2026-07-14).
  At the next session for the same client the engine reads that history *before* scoring:
  templates already delivered, and any marked as having gone less well, are held back by a fixed
  penalty, and the advisor's own "went less well" words are mined for fresh signals.
  `server/utils/priorEngagement.js`, `templateResolver.js` line 561, pinned by
  `historyHoldback.test.js`.
- **Case reviews travelling upward**, anonymised, double opt-in, so a firm's cases become team
  development.
- **Meeting Review follow-through**: last meeting's agreed actions checked against this meeting's
  transcript, matched on the client, never guessed.
- **Adoption reporting** that names silent firms, counts only, never people.
- **Three laboratory benches**, Scenario, Quiz and Discover, that measure the engine before and
  after a change on fixed cases.

### What is missing, and it is the difference between "loops" and "learning"

> - **The outcome loop now crosses firms on the backend, and is not yet on a screen or proven.**
>   Since 2026-09-11 a consenting firm's per-template verdicts are pooled anonymised at the
>   platform scope, turned into capped hold-backs that only a mentor-accepted decision can make
>   live, and applied in the resolver beneath the advisor's own words (part two). No hub screen
>   shows the pool or lets the mentor accept anything yet, and no real pool has crossed the
>   floor, so "learning across firms" is built and untested, not proven.
> - **The review is optional and its uptake is unmeasured.** A case stays flagged "feedback
>   pending" until the advisor returns to it. Nothing reports how many ever do, so the loop's
>   reach is unknown.
> - **The middle of the pipeline is designed, not built.** Primary issues and routing groups.
> - **Content still has holes that a human must fill.** 18 logic-table names still point at pages
>   the library does not hold; the signal lever fires in fewer than half the lab cases.

## 4. "World class"

The code cannot prove a comparison with anything outside it. What it can prove is the kind of
thing a serious buyer checks before believing that phrase.

| What can be checked | The figure |
|---|---|
| Working code, comments stripped | 83,407 lines across 415 files ([Code Size](../CODE-SIZE.md), recomputed every build) |
| Tests | 9,541 tests, 467 suites, green; more test code than app code; AI-output validators pinned at 100% |
| Content the engine reasons over | 291 templates, 42 logic trees, 14 advisory domains, 63 quiz banks |
| Tiers the configuration cascades through | Mentor, global group, group, firm, advisor, and now the client |
| Traceability | Signal → strategy → template on every recommendation, with the decision path shown |

> ⚠ **What a buyer would probe, and you should have an answer ready.** The app is in UAT, not
> production, so there is no usage data behind any claim yet. The Adviser Network runs on nine
> invented people until the master team wires identity. No independent benchmark exists against a
> competitor. The build and its two CI gates run on the master team's side, not here. One AI
> provider, no fallback.

## 5. What you can say, and what to avoid

**Supportable today**

- Every recommendation is decided by explainable logic and can be traced back to what the advisor
  said.
- The AI writes and classifies; it never chooses a template, invents a document, or grades a blank.
- A firm pours its own vocabulary and judgement in, without a developer, and it reaches its
  advisors automatically while the firm's choices are protected.
- It remembers each client: what was delivered, what went less well, and the advisor's own words,
  and it changes the next recommendation for that client accordingly.
- Advice is tested against a fixed bench of cases across all 14 domains before any engine change
  ships.
- More test code than product code, with the AI-output checks held at 100%.

**Not yet supportable**

- "Gets smarter with use" across the board. The cross-firm loop is built on the backend
  (part two) but supportable only once the mentor's page exists and a real pool has crossed the
  floor in UAT.
- Any accuracy or outcome figure from real advisors. Verdicts are recorded per case, but nothing
  adds them up, and the app is not yet in production.
- "World class" as a comparison. Say what it does instead; the list above is stronger than the
  adjective.
- Anything about the adviser network's people until identity is wired.

> **The one change that would turn a per-client loop into learning.** The verdicts already exist,
> one case at a time. Add them up: a mentor and firm view of which templates keep going less well,
> and for what kind of client, read from the same recorded outcomes. That gives the Scenario Lab
> real cases instead of invented ones, gives the mentor evidence for which distinctions earn their
> boost, and is the first thing any self-adjusting step would need. **This became part two.**

---

## Part two — Outcome Learning, item 4.87

Mike's response to the third verdict, verbatim: *"now i want to build a prompt to develop the
task to enable real machine learning - such that it does, indeed, get smarter with use. Not just
from one firm, but from all those who consent to help develop the model by sharing anonymised
data."*

## 6. The rules the spec derived from the task

**The verdicts already exist; the task is to let them cross firms.** Pooled, anonymised, across
every firm that consents, the same per-template verdicts can tell the platform which templates
keep going less well in which situations, and adjust the ranking for everyone. That is what
"smarter with use" means here.

**It is counting and weighting, not a trained model.** The engine decides and the AI writes; that
boundary does not move. An adjustment is arithmetic a person can check by hand from the counts
shown beside it, applied through the same seam Advisory Distinctions already use, capped so
pooled evidence can never outrank what the advisor said today, and accepted by the mentor before
it applies anywhere.

**P1 · Nothing leaves a firm that has not opted in.** A firm manager switches contribution on and
off on a hub page at the firm tier. A firm that is not opted in never receives an adjustment.

**P2 · The anonymised shape is exact, and the guard throws.** Domain, primary issue, industry, the
signals that fired, engagement type, staircase step, template titles, the per-template verdict,
and review words only after the stripping the mentor-share path applies. A personal field refuses
the whole contribution and is logged; nothing is dropped silently.

**P3 · The learning is explainable.** Every adjustment can be recomputed from its counts. A
trained model is a fresh decision for Mike, never an assumption.

**P4 · The mentor accepts before it applies.** Accept, hold or reject, with name, date, version
history and restore.

**P5 · The advisor's own words win.** Adjustments are capped below the current session's signals,
and every applied or outweighed adjustment appears on the decision trace with its evidence count.

**P6 · Below the floor, nothing publishes.** A minimum number of contributing firms and cases,
shown beside every adjustment.

**P7 · A recommendation never waits on learning.** If the pool cannot be read, the engine runs
without adjustments and the trace says so.

**Ruled by Mike, 2026-09-10:** the floor is **5 contributing firms and 25 cases**, and an
adjustment can only **hold a template back**, never lift one, in this release. Both are written into
the spec (FR-008, FR-010). **Clarified with him the same day**, in the spec's Clarifications section:
no free text enters the pool, only the tick-box verdicts; an adjustment is keyed to a template and one
situation dimension at a time; only "went less well" on a delivered template counts against it, and
"not used at all" is neutral; recompute happens when the mentor opens the page or asks for it, and on
a firm's withdrawal, never on a background schedule. **The three drawings are drawn and approved (2026-09-10); their rulings sit on each drawing.**

## 7. The task, as Mike set it

Pasted to `/speckit-specify` on 2026-09-10 and kept here verbatim, so the spec, the plan and the
build can always be checked against what was asked.

```text
Learning from outcomes across consenting firms — "the platform gets smarter with use".

FILE IT FIRST. Before writing the spec, add this to design/features/to-do-items.json as a feature asked for by Mike on 2026-09-10, in his words: "build a prompt to develop the task to enable real machine learning - such that it does, indeed, get smarter with use. Not just from one firm, but from all those who consent to help develop the model by sharing anonymised data". Score 3 (helps sell the package), waiting on Mike, rankedByMike false, activeOn this machine. Then write the spec.

WHAT EXISTS TODAY, AND MUST BE REUSED, NOT REBUILT.
- A case review records, per template, whether it was used in full, partly or not at all, and whether it went well or less well: server/utils/caseStore.js (template_outcomes, review_went_well, review_went_less, review_changes_recommended).
- The next session for the SAME client reads that history before scoring and holds back templates that were delivered or went less well: server/utils/priorEngagement.js and HISTORY_HOLDBACK_PENALTY in server/utils/templateResolver.js, pinned by tests/unit/historyHoldback.test.js. Nothing crosses clients today.
- An anonymised, double-opt-in path already carries a case upward to the mentor with identifiers stripped and a personal-field guard that throws rather than filters: mentor_anon_summary and mentor_anon_transcript in caseStore.js, design/features/case-reviews.md P1–P4.
- Score adjustments already have a seam: distinction boosts are added to a template's score in templateResolver.js (around line 367), authored on the Advisory Distinctions screen and cascaded through server/utils/tierChain.js with "offer, never override" semantics.
- The Scenario Lab (scripts/scenario-lab.js, 51 fixed cases across 14 domains) measures the engine before and after a change.
- The tier cascade and the hub pages (components/FirmManagerHub.vue, TAB_TIERS) are where anything the AI or the engine reads must be visible and editable (CLAUDE.md, "AI fixes surface on a hub page").

WHAT IT MUST DO.
1. Consent. A firm manager opts the firm in, and can opt out at any time, on a hub page at the firm tier. Nothing leaves a firm that has not opted in, and opting out stops future contributions without deleting what was already pooled unless the manager asks for that too. Every advisor is told on the case-review screen that anonymised outcomes may contribute, in wording Mike approves.
2. Anonymisation. What travels is exactly the anonymised shape and no more: domain, primary issue where present, industry, the signals that fired, engagement type, staircase step, template titles, the per-template verdict, and the advisor's review words only after the same PII stripping the mentor-share path applies. No firm, advisor, client or case identifiers, ever. The guard throws on a personal field; it never filters silently.
3. The learning is explainable code, not a black-box model. From the pooled outcomes compute adjustments per template and per situation (which templates keep going less well, and for which domain, industry, signal or engagement type), and apply them as score adjustments in templateResolver through the same seam as distinction boosts, capped so pooled evidence can never outrank what the advisor said today. Every applied adjustment appears on the decision trace with the evidence count behind it.
4. It surfaces on the Mentor Hub first. A page shows what has been learned, from how many firms and cases, each adjustment with its evidence, and the mentor accepts, holds or rejects each one before it goes live, with version history and restore. State in one line whether the middle tiers and firms need their own view; the default is the mentor alone, and a firm gets a view only when it needs a different value.
5. Thresholds. No adjustment is published below a minimum number of contributing firms and cases; the numbers are shown beside every adjustment. Propose the floors and the reasoning; the meeting aggregate's 5 advisors and 20 meetings is the precedent in this app. Mike sets the final figures.
6. It is measured. "Smarter" is a number: the Scenario Lab runs before and after, plus a second bench built from the pooled anonymised outcomes themselves, so the adjustments are tested against real cases rather than invented ones. Report both in the plan.
7. Every write is scoped to the verified token, never a supplied id. Pooled data lives at the platform scope through the existing overlay store; no schema change unless the plan proves one is unavoidable, and then it is a named deviation for Mike.

WHAT IT MUST NEVER DO.
- Change a recommendation for a firm that has opted out.
- Let the AI choose, rename or invent a template, or move the "engine decides, AI writes" boundary (design/features/advisory-engine.md P1, P2).
- Send an identifier or a client's words to any model.
- Add a dependency that does not run on Node 14.15, use TypeScript, or touch a locked stack version. A trained model is not assumed; if a later step needs one, it is a fresh decision for Mike.
- Build anything at a tier not named in the spec.

DESIGN STAGE, BEFORE ANY CODE (CLAUDE.md, Save the Artefact).
Draw three screens as committed files in design/mockups/, in the style copied from an approved mockup (design/mockups/meeting-preset-advisor-level.html or firm-template-library.html), with real point and template text from the data files and any invented figures marked as examples:
- outcome-learning-consent.html — the firm manager's opt-in and opt-out, and the one line an advisor sees on the case review.
- outcome-learning-mentor.html — the Mentor Hub page: what was learned, evidence counts, accept / hold / reject, history.
- outcome-learning-trace.html — how an applied adjustment appears on an advisor's decision trace.
Each drawing lists every new word in a wording table marked proposed, and ends with its open questions, each carrying ONE recommendation and the argument against it. Register all three in design/ARTEFACTS.md. Put the questions to Mike one at a time, one yes/no each, and record every ruling on the drawing before building. Mike approves the drawing itself as its own question; rulings on the questions inside it are not approval of the drawing.

WORKING RULES FOR THIS TASK.
Every change needs Mike's explicit yes. Wording on screens is his to approve before it goes into code. Tests are written for what UAT cannot see: the consent gate, the anonymisation guard, the threshold, the cap on adjustments, and the trace, with the AI-output and anonymisation validators at 100% coverage. After the spec: run /speckit-clarify, then /speckit-plan, then /speckit-tasks, stopping for Mike's yes between each.
```

## 8. For the coder

Built through story 3 and both hub screens on 2026-09-11, task by task from
[`tasks.md`](../../specs/002-outcome-learning/tasks.md), each checked against the three drawings
approved by Mike 2026-09-10; industry suggestions on the intake followed the same day from a fourth
drawing. The benches remain.

| Piece | Where it stands today |
|---|---|
| Consent record, tokens, pinned wording | `server/utils/outcomeConsent.js` — HMAC tokens under `OUTCOME_POOL_SECRET` (`.env.example`, UAT load pack §3) |
| Pool row, guard, arithmetic | `server/utils/outcomeLearning.js` — floor 5 firms / 25 cases, cap 10; primary issue validated by membership in Mike's authored labels (cap 120, a stated exception) |
| The one hard delete | `deleteFirmConfigsByPrefix` in `server/utils/firmOverlay.js` — withdrawal removes every version under `outcome-pool:<token>:` |
| The review hook and the advisor's flag | `server/utils/outcomeContribute.js`, called from `reviewCase` in `server/routes/cases.js`; `outcomeContribution` rides the case list |
| Firm routes | `server/routes/outcomeConsent.js` — read, set, withdraw under `fmGuard`; withdraw recomputes. The read also returns `adjustmentsApplying` (the count a sharing firm sees, never the list) and every switch is kept as `events` on the record for the History card |
| The firm's screen | `components/firm/FirmOutcomeConsent.vue`, the Outcome Sharing tab under Compliance at the firm tier alone (`TAB_TIERS.outcomeConsent`); strings in `locales/en.json` `outcomeConsent.*` |
| The advisor's notice | the one line on the review panel in `components/VirtualAdvisor.vue`, shown when `outcomeContribution` on the case list is true (`mixins/caseMixin.js`) |
| Mentor routes | `server/routes/outcomeLearning.js` — list, recompute, decision, history, restore, export under `mentorGuard`; a page load recomputes but never writes a version; a rejection without a reason is refused |
| The mentor's screen | `components/mentor/MentorOutcomeLearning.vue`, the Outcome Learning tab under Rolled up from below at the mentor tier alone (`TAB_TIERS.outcomeLearning`); strings in `locales/en.json` `outcomeLearning.*`. The bench card says the benches have not been run until user story 4 |
| The resolver | `pooledAdjustments` / `pooledSignalTypes` in `server/utils/templateResolver.js`, before the history clamp; `SCORING_VERSION` 2.2.0 |
| The session and the trace | `server/utils/outcomeLearningSession.js`, wired in `server/advisorEngine.js`; `decisionTrace.outcomeLearning` |
| Reason wording | `pooled:held_back-<n>`, `pooled:outweighed` in `utils/traceReasonCodes.js`, `locales/en.json`, [`WORDING-TRACE-REASONS.md`](../WORDING-TRACE-REASONS.md) |
| The advisor's panel | "Learned from outcomes" in `components/VirtualAdvisor.vue` |
| Industry suggestions on the intake | The intake has no industry field — the engine asks it in the chat — so `questionDoneEvent` in `server/advisorEngine.js` closes each sequenced question with its field, `GET /api/advisor/industry-vocabulary` (`server/routes/industryVocabulary.js`, proxied above the SSE entry) serves the same words the pool accepts, `utils/industrySuggestions.js` holds the rulings as numbers (three letters, eight chips, prefix on the whole answer), and the chip row in `components/VirtualAdvisor.vue` replaces the whole answer on a click. Nothing changes what saves to the case |
| The dev seed | `scripts/dev/seed-outcome-pool.js` — 31 reviews across five firms through the guard and the store, never around them; refuses under `NODE_ENV=production`; `--reset` clears its own firms' rows first. Firm A is `dev-firm-001`, the firm the dev-local-bypass sign-in carries, so a withdrawal from its tab is quickstart Story 2 step 5 |
| NOT BUILT | `--adjustments` on the Scenario Lab, the outcome bench and the bench route |
| The four approved drawings | [`outcome-learning-consent.html`](../mockups/outcome-learning-consent.html) · [`outcome-learning-mentor.html`](../mockups/outcome-learning-mentor.html) · [`outcome-learning-trace.html`](../mockups/outcome-learning-trace.html) · [`outcome-learning-intake-industry.html`](../mockups/outcome-learning-intake-industry.html), rulings on each, rows in [`ARTEFACTS.md`](../ARTEFACTS.md) |

## 9. Related briefs

[`advisory-engine.md`](advisory-engine.md) — the engine this adjusts ·
[`advisory-distinctions.md`](advisory-distinctions.md) — the seam it reuses ·
[`case-reviews.md`](case-reviews.md) — the anonymised path it reuses ·
[`cases-and-clients.md`](cases-and-clients.md) — where the verdicts are recorded.

**History:** [`outcome-learning-history.md`](outcome-learning-history.md)
