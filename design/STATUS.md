# Status — every task in the app, at a glance

> **GENERATED FILE — do not edit by hand.** Run `npm run status` to rebuild it.
> The source of truth is [`ACTIONS.md`](ACTIONS.md); this is a view of it. Every
> row links back to the full entry, where the reasoning and evidence live.

**62 outstanding** — 9 in progress · 46 open · 7 blocked. **113 completed** (listed at the bottom).

Completed work is kept here on purpose: so a task is never done twice, and so a new
task that resembles an old one can be traced back to the code that solved it.

## Outstanding

| Priority | Type | Status | Task | Section | |
|---|---|---|---|---|---|
| P2 | DECISION+BUILD | In progress | 28 dormant trees → harvest JUDGMENT into signals | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1418) |
| P2 | BUILD/DECISION | In progress | Get-the-Job Stage 2: due_diligence | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1437) |
| P2 | BUILD | In progress | Course persistence (courses + progress) — BUILT 2026-07-15, Stages A–D (Course Builder table CB-16/CB-17) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1439) |
| P2 | BUILD/DECISION | In progress | Business Performance Report (NEW feature, in design) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1499) |
| P3 | BUILD | In progress | Close the improvement loop | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1480) |
| P3 | BUILD | In progress | Learn-mode domain-support enrichment — BUILT 2026-07-16 (ruled: INJECT) | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1511) |
| — | — | In progress | Report-model maths — verified against source Excel 2026-07-10; 1 proven formula flaw FIXED, others are faithful/not-flaws | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1300) |
| — | — | In progress | CourseBuilder SSE never aborted — *(course half ✅ FIXED 2026-07-15, b8ef0ed — AbortController on every context switch; see Course Builder table CB-… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1310) |
| — | — | In progress | (history) Engine could not recognise a business in CRISIS (the quickfire SURVIVAL branch) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1426) |
| P1 | BUILD | Open | a visible routing map: which material reaches CLIENT RECOMMENDATIONS, and which is ADVISOR-READ-ONLY | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L108) |
| P1 | WIRE | Open | the trigger lists match *phrasings*, not *subjects* | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L186) |
| P1 | CONTENT/VERIFY | Open | a FABRICATED detail was found living in the domain-support data, presented as the firm's own material | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1379) |
| P2 | WIRE | Open | two People Power situations open NO table at all | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L174) |
| P2 | DECISION/SEC | Open | only the FIRST FIVE trigger phrases of any Advisory Distinction ever reach the AI, while the screen shows all of them and invites more | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L265) |
| P2 | RULING | Open | P2 · RULING NEEDED (Mike) — three triggers are still too generic, and the fix is wording, not code | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L324) |
| P2 | RULING | Open | ↳ P2 · RULING NEEDED (Mike) — six of the eleven branches have an empty templates[], left empty rather than guessed (CLAUDE.md — never fabricate the f… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L452) |
| P2 | RULING | Open | ↳ P2 · RULING NEEDED (Mike) — all 13 Sales & Marketing branches have an empty templates[] | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L488) |
| P2 | SALVAGE | Open | PR #1 (chore/i18n-jsdoc-cleanup, opened 2026-06-30) CLOSED UNMERGED 2026-07-21, deliberately | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1268) |
| P2 | VERIFY | Open | the advisor-chat recommendation change has NOT been exercised live | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1408) |
| P2 | PROCESS | Open | Adopt release tags as the integration hand-off to the master team | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1416) |
| P2 | CONTENT | Open | P2 · CONTENT (Mike/master-team) — the EOY scripts text is not in the app's data, and "EOY Scripts Only" is not a page in the current master export | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1445) |
| P2 | FIX | Open | Learn mode is profile-blind: it asks questions the advisor profile already answers | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1447) |
| P2 | BUILD | Open | P2 · BUILD (pre-production) — Firm Manager config persistence → MySQL | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1451) |
| P2 | BUILD | Open | Distinctions cascade, Stage 3 — hierarchy hook-up to the master app (mentor→firms→advisors) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1453) |
| P2 | FIX | Open | Coaching-reference review, Phase 2: cap + domain-filter the injected entries | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1488) |
| P2 | SEC/FIX | Open | Coaching-reference review, Phase 3: server-side caseContext | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1490) |
| P2 | BUILD | Open | Education gates on the Advisory Staircase — RULED: advisor-choice prompt (Mike's own design, 2026-07-16) | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1515) |
| P3 | SCORING | Open | ↳ a repeated word in an answer_pattern silently doubles that branch's score | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L495) |
| P3 | DOC | Open | ↳ QUIZ-LAB-REPORT.md is now STALE (says 58 banks / 610 questions; reality is 62 / 652) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L942) |
| P3 | TEST | Open | ↳ P3 · TEST follow-up (found 2026-07-30, NOT done — needs its own approval): that test checks an allowlisted name is still absent from the library, b… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1033) |
| P3 | CONTENT | Open | ↳ P3 · CONTENT (Mike) — two defects in Domain Support/EOY Support.pdf itself | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1132) |
| P3 | ENV | Open | npm 8 is not installed on the desktop, which is the machine that does the installs | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1236) |
| P3 | TEST | Open | jest.config.js collectCoverageFrom excludes the decision engine + routes (advisorEngine.js, courseEngine.js, server/routes/, mixins/), so the Const… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1464) |
| P3 | TEST | Open | No component-test infrastructure and no Playwright, anywhere in the repo | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1466) |
| P3 | STRUCT | Open | Monolithic components, no base/shared split | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1468) |
| P3 | DOC | Open | Sparse JSDoc. Mixins lack @param/@returns; course.js has none; advisor.js ~4 tags across 2061 lines. Scheduled into the planned cleanup pass — see… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1470) |
| P3 | I | Open | P3 · I18N — Hardcoded English in templates (e.g | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1472) |
| P3 | EDIT-TARGET | Open | Bring building blocks under Firm-Manager no-code editing: 14-question weight sliders, Strategy table (strategyResolver rules), primary-issues table… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1474) |
| P3 | EDIT-TARGET | Open | Plan-mode's 2 proprietary frameworks are embedded (locked) inside plan.txt and flagged "should become firm-editable." Add to the firm-editable cons… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1476) |
| P3 | BUILD | Open | Profile → DB. Move the advisor profile off localStorage into the firm DB (same migration family as case studies). *Source:* registry Part 1A → Prof… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1478) |
| P3 | BUILD | Open | Auditability goals. Decision Trace (per-recommendation trace) + Config versioning (edit history; tag each saved case with the active config version… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1494) |
| P3 | DOC | Open | P3 · DOC tidy — fold any remaining per-file detail from registry_compilation_wip; resolve the Org CA Capacity Planner mislabelled-PDF flag (Part 2A) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1497) |
| P3 | BUILD | Open | HOW-swap scope — RULED: YES, both places | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1513) |
| — | — | Open | 3 new source documents added 2026-07-30 (commit e443c52) — read and planned, NOT YET TRANSCRIBED | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L333) |
| — | — | Open | NEXT SESSION (Mike, 2026-07-22) — bring the Document Library page into line with Quizzes and Advisory Distinctions, and make the LOGIC TABLES and D… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L509) |
| — | — | Open | ↳ Stale lab baseline found (log, not Phase 0): committed design/SCENARIO-LAB-REPORT.md was last re-baselined 2026-07-14 AI-ON, before the 2026-07-22… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L530) |
| — | — | Open | ↳ One reading artefact left for Mike, deliberately not "tidied": sys_b4a_sixsigma now reads *"Volatility Analysis (from the Lite Data) establishes wh… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1095) |
| — | — | Open | ↳ Still open: (1) Job 2 — SCOPE CORRECTED 2026-07-30, read this before starting it; (2) per-material origin tags are domain-level until the §2.4 comp… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1109) |
| — | — | Open | BUG — every <b-icon> in the app renders as NOTHING; no icon font is loaded | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1191) |
| — | — | Open | ↳ Follow-up (deferred, minor) — plain-number localisation | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1251) |
| — | — | Open | ↳ Phase 4 — the "add a report" recipe (doc and/or /add-report skill) | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1264) |
| — | — | Open | Non-atomic Stage-D delete across stores — server/routes/mentor.js L181 — a mid-way failure leaves the master row live while firms lose their overri… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1306) |
| — | — | Open | Session-state read-modify-write race on concurrent same-session requests — advisorEngine.js (last-write-wins loses answers) | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1307) |
| — | — | Open | ↳ CONTENT GAP — Productive Habits needs a content summary | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1421) |
| — | — | Open | STACK DRIFT (dev toolchain) — flip engine-strict back to true | ⛔ DO-FIRST P1 (stack governance — overnight/reinstall-gated) | [open](ACTIONS.md#L1535) |
| — | — | Blocked | STATE — Vuex installed but unused — RULED: PARKED until the Advisor-e UAT settles, then bundled with the localStorage→MySQL migration | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1512) |
| — | — | Blocked | BUILD — Broaden urgency-trigger detection (follow-up to Intervention Urgency, evidence-gated) | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1524) |
| — | — | Blocked | BUILD — Primary-issue selector remnant (evidence-gated) | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1525) |
| — | — | Blocked | BUILD — Firm Manager: master-export self-service upload (Stage 2) | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1526) |
| — | — | Blocked | OPS (not code) — Provision the va_case_studies MySQL table | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1527) |
| — | — | Blocked | FEATURE (future, parked) — Advisor-enablement distinction table, paired to Learn mode | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1528) |
| — | — | Blocked | BUILD (later) — Distinctions cascade Stage 4 — case-study → suggested-distinction loop (north-star #4; out of scope for the cascade build itself) | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1529) |

## Completed

<details>
<summary><strong>113 completed tasks</strong> — click to expand</summary>

| Priority | Type | Task | Section | |
|---|---|---|---|---|
| P1 | FIX | Course Builder's session briefing reached the WRONG domain materials | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L26) |
| P1 | WIRE | the 8 new Organisational Review branches were wired correctly inside a table that never opened for the conversations they were written for | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L133) |
| — | — | ↳ TOOLING FOR THIS SWEEP — BUILT 2026-08-01 (approved by Mike, this branch, commit 754d204) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L223) |
| P1 | FIX | entry triggers matched anywhere inside a word, so "HR" fired on "t-HR-ee" | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L294) |
| — | — | ↳ TRANSCRIPTION PROGRESS 2026-07-31 (all approved by Mike, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L373) |
| P1 | — | ↳ SHAPE RULED 2026-07-31 (Mike) — the branch tables become nodes, NOT flat_if_then | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L391) |
| — | — | ↳ Organisational Review's 8 branches BUILT 2026-07-31 (approved by Mike, this branch) — as a third path inside staff_performance (15 → 24 nodes), mir… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L400) |
| — | — | ↳ Strategic Planning's 11 branches BUILT 2026-07-31 (approved by Mike, this branch) — as a third path inside client_planning (7 → 19 nodes), followin… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L423) |
| — | — | ↳ Sales & Marketing's 13 branches BUILT 2026-07-31 (approved by Mike, this branch) — the workstream's last piece | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L465) |
| — | — | ↳ Phase 0 BUILT 2026-07-23 (approved by Mike, this branch): firm-aware content loading is live behind the engines | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L512) |
| — | — | ↳ Phase 1 BUILT 2026-07-23 (approved by Mike, this branch): Document Library rebuilt onto the rail → panel pattern | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L537) |
| — | — | ↳ Phase 2 STARTED 2026-07-24 (approved by Mike, this branch) — EOY is the first domain migrated to the four-column standard (§0.5); engine wired | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L547) |
| — | — | ↳ TAB STRUCTURE RULED 2026-07-24 (Mike) — plan §0.6: two dedicated Firm Manager tabs, Domain Support (four-column tables) and Logic Tables (IF→THEN g… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L556) |
| — | — | ↳ Domain Support editable tab BUILT 2026-07-24 (approved by Mike, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L561) |
| P1 | WIRE | ↳ domain-support firm overrides now use the config key the engine reads | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L574) |
| — | — | ↳ Logic Tables tab — Slice B SHIPPED + 3-way grouping + firm re-filing (2026-07-27, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L624) |
| — | — | ↳ Editing ergonomics SHIPPED 2026-07-29 (this branch) — found while Mike was about to edit 29 domains of four-column tables | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L633) |
| — | — | ↳ 🔑 Logic-tree ENTRY POINT is now data, not array position — 2026-07-29 (this branch, 71b7a2c + 98ecc51) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L645) |
| — | — | ↳ Decision Frameworks (PDF Document Library) tab REMOVED 2026-07-27 (owner decision, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L680) |
| — | — | ↳ Templates & Videos tab HIDDEN 2026-07-27 (owner decision, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L689) |
| — | — | ↳ Firm Profile tab REMOVED 2026-07-27 (owner decision, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L693) |
| — | — | ↳ Firm-table editing UX — name wrap + drag-to-size-and-remember (2026-07-27, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L700) |
| — | — | ↳ Domain-support content migration — COMPLETE 2026-07-29 | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L707) |
| — | — | ↳ "Hide list / Show list" SHIPPED 2026-07-29 (Mike's ask, approved; this branch) — more editing room on both firm-editable tables | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L753) |
| — | — | ↳ Specialist Tools Quiz INGESTED 2026-07-28 (approved by Mike, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L831) |
| — | — | ↳ Strategic Tools Quiz INGESTED 2026-07-28 (approved by Mike, this branch) — every quiz PDF in Course Builder Quiz/ now has banks behind it | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L856) |
| — | — | ↳ QUIZ LAB BUILT 2026-07-28 (approved by Mike, this branch) — scripts/quiz-lab.js | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L864) |
| — | — | ↳ LIVE-EYEBALL DONE 2026-07-28 (Mike, running app) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L885) |
| — | — | ↳ QUIZ PROVENANCE BUILT 2026-07-28 (approved by Mike, this branch) — "which bank fed this question?" Mike's ask: a complaint that "the quizzes aren't… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L893) |
| — | — | ↳ Governance Quiz INGESTED 2026-07-30 (approved by Mike, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L912) |
| — | — | ↳ LIVE END-TO-END CONFIRMED BY MIKE 2026-07-30 — the advisor AND firm-manager halves | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L951) |
| — | — | ↳ Ghost logic-tree references — 29 → 0, ALL CLOSED 2026-07-30 (the last one needed Mike's ruling, recorded at the end of this entry) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L984) |
| — | — | ↳ GUARD SHIPPED so this cannot rot silently again: tests/unit/logicTreeTemplateNames.test.js fails the build if any client-delivery tree names a page… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1019) |
| — | — | ↳ RULED + FIXED 2026-07-30 (Mike, same session) — Growth Framework → Growth Curve | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1044) |
| — | — | ↳ 7 prose mentions in tree notes SWAPPED 2026-07-30 (approved by Mike, same session) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1087) |
| — | — | ↳ Domain Support rail made honest 2026-07-27 | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1105) |
| — | — | FIXED 2026-07-23 (Phase 1 of the firm-editable tables build, approved by Mike) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1165) |
| — | — | Done 2026-06-29 (this session) — Distinctions cascade Stages E AND D BUILT + verified, on branch feat/mentor-distinctions-authoring | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1214) |
| — | — | Done 2026-06-25 (this session) — cross-domain engine sweep, all lab-measured over 50 fixed cases across the 14 domains: (1) Display-drop fixed (bui… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L1215) |
| — | — | FIXED 2026-07-19 — R1 — QP intake: edited figure keeps its "from file" badge — components/QuickPositionIntake.vue L48 | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1231) |
| — | — | FIXED 2026-07-19 — R2 — QP: cleared figure silently becomes the demo sample number, still tagged "from file" — QuickPositionIntake.vue | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1232) |
| — | — | FIXED 2026-07-19 — R3 · SEC — XLSX reader: unbounded row index → OOM/DoS from a ~1 KB crafted file — server/report/intake/xlsxReader.js | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1233) |
| — | — | FIXED 2026-07-19 — R4 — multi-column exports silently read first-column-only — server/report/intake/xeroReportParser.js | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1234) |
| — | — | TEST-GAP — CLOSED 2026-07-22 | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1235) |
| — | — | FIXED 2026-07-19 — R5 — EBITDA calc: mismatched growth/discount lengths → NaN → null EV indistinguishable from honesty-null — server/report/ebitdaD… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1239) |
| — | — | FIXED 2026-07-19 — R6 · SEC — intake catch echoed unexpected err.message → could leak a server file path — new server/report/intakeError.js: protot… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1240) |
| — | — | FIXED 2026-07-19 — R7 · SEC — global jsonBodyParser had NO maxBodySize (unlimited buffering, six anonymous calc routes behind it) — server/restify-… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1241) |
| — | — | RULED + FIXED 2026-07-19 — R8 · DECISION (Mike): option A — defaults may substitute, but NEVER silently — both engines now return defaultedInputs n… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1242) |
| — | — | FIXED 2026-07-19 — R9 — both new reports: failed recompute left stale figures with no warning — QuickPositionReport.vue + EbitdaDcfReport.vue: Eigh… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1243) |
| — | — | FIXED 2026-07-19 — R10 — both new reports: debounced-recompute race, older response could overwrite newer — _reqSeq monotonic stamp in both recompu… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1244) |
| — | — | FIXED 2026-07-19 — R11 — EBITDA print screen had NO from-file/entered badges; QP hid two file-sourced figures and untagged a third — components/Ebi… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1245) |
| — | — | FIXED 2026-07-19 — R12 — stepper desync + silent wipe of confirmed figures navigating back from step 3 — both intakes gained restore (reopen the co… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1246) |
| — | — | DONE 2026-07-21 — Firm preferred-currency (report money now firm-configurable) | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1250) |
| P2 | BUILD | Report scaffolding workstream COMPLETE 2026-07-22, all four phases | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1253) |
| — | — | ↳ Phase 1 DONE 2026-07-21 — reportRecompute mixin, all 6 reports converted | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1254) |
| — | — | ↳ Phase 2 DONE 2026-07-21 — HeroStrip/HeroFigure + SliderField, every converted screen browser-verified by Mike | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1255) |
| — | — | ↳ HeroStrip + HeroFigure built, 5 of 6 screens converted, ALL browser-verified by Mike 2026-07-21 | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1256) |
| — | — | ↳ SliderField DONE 2026-07-21 — 3 screens converted, all browser-verified by Mike | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1260) |
| — | — | ↳ Phase 3 DONE 2026-07-22 — ProvenanceBadge + StaleBanner + ReportHeader, all six screens browser-verified by Mike | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1263) |
| P3 | DX | FIXED 2026-07-21 — the dev server bound to the IPv6 loopback ONLY, so http://127.0.0.1:3000 is unreachable while http://localhost:3000 works (or do… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1266) |
| P3 | UX | FIXED 2026-07-22 (Mike approved) | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L1269) |
| — | — | FIXED 2026-07-10 — /api/course mounted with NO firmAuth — server/restify-server.js L131 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1283) |
| — | — | FIXED 2026-07-10 — Stored XSS in "Remove" confirm dialogs — doc name / video title (components/FirmManagerHub.vue) and distinction description (com… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1284) |
| — | — | FIXED 2026-07-10 — Backend URL hardcoded http://localhost:4000 in 7 frontend files (utils/cases.js, mixins/caseMixin.js, components/MentorReview.vu… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1287) |
| — | — | FIXED 2026-07-10 — OpenAI calls have no effective timeout — server/utils/openaiClient.js L131 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1289) |
| — | — | FIXED 2026-07-10 — SEC: cross-firm document download (IDOR) + broken auth on download — server/routes/firmManager.js L287 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1290) |
| — | — | FIXED 2026-07-10 — SEC: /api/course body has no size limit — server/courseEngine.js L469 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1291) |
| — | — | FIXED 2026-07-10 — SEC: rate limiter keys on spoofable X-Forwarded-For — server/utils/rateLimit.js L11 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1292) |
| — | — | ALREADY FIXED — verified in code 2026-07-22 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1293) |
| — | — | FIXED PROPERLY 2026-07-22 (Mike: "do it once, do it right") — recommended-template extraction | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1294) |
| — | — | FIXED 2026-07-10 — Saved-courses picker never refreshes — components/CourseBuilder.vue | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1295) |
| — | — | VERIFIED FIXED 2026-07-16 — Course-completion logging dead in prod — original localhost hardcode fixed by the apiProxy work; live click-through 202… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1296) |
| — | — | FIXED 2026-07-10 — Legacy-case migration self-disables on failure — utils/cases.js + mixins/caseMixin.js | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1297) |
| — | — | ↳ FIXED — WCC contribution margin (cell D20) workingCapitalCycleModel.js L96 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1301) |
| — | — | ↳ FIXED 2026-07-10 — input robustness across all 3 report models | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1304) |
| — | — | FIXED 2026-07-17 — SEC — prompt injection (both halves closed) | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1305) |
| — | — | FIXED 2026-07-15 — Global unhandledRejection swallow hid every other crash — courseEngine.js L29 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1308) |
| — | — | ALREADY FIXED — verified in code 2026-07-22 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1309) |
| — | — | FIXED 2026-07-22 — Chat input rendered under the Team Dashboard | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1311) |
| — | — | FIXED 2026-07-21 — Report-component slider races (stale numbers on rapid slider drags) — BusinessPerformanceReport.vue / DebtorDragReport.vue / Mar… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1312) |
| — | — | FIXED 2026-07-22 — Speech mixin teardown + permission-denial loop | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1313) |
| P1 | — | NOT A DEFECT — corrected 2026-07-22 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1314) |
| — | — | FIXED 2026-07-15 — server-middleware/course.js was missing the client-disconnect cleanup that advisor.js added → abandoned SSE sockets wedged the d… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1315) |
| — | — | FIXED 2026-07-22 — retryLastMessage duplicated the user turn | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1316) |
| — | — | FIXED 2026-07-22 — profileQuestions index drift | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L1317) |
| P2 | UX | DONE 2026-07-22. Sample figures now say so. Wording approved by Mike: "These are sample numbers, not your client's" (report.sampleFigures), shown v… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1410) |
| P1 | STACK | P1 · STACK DEVIATION CLOSED 2026-07-22 — the three report components' text is now in locales/en.json (report.debtorDrag 56 strings, report.marginBr… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1412) |
| P2 | DOC | Backfill the unknown commits in the deployed-versions ledger | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1414) |
| P2 | RESOLVED | P2 · RESOLVED 2026-06-25 — crisis recognition now robust + live-validated (see ACTIONS-ARCHIVE) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1425) |
| — | — | ↳ STEP 1 DONE (2026-06-24) — recognition | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1427) |
| — | — | ↳ STEP 2 VALIDATED (2026-06-24) — Mike's IP, no-code, proven end-to-end | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1428) |
| P2 | DATA | Tree→template provenance sweep RESOLVED 2026-06-24 | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1430) |
| — | — | ↳ get_positioning — 4 fabricated template names (Business Assessment Report, Revenue Model What-if, Agenda & Notes, Management Reporting Annual Plan)… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1431) |
| — | — | ↳ get_marketing / get_team_problem / get_sales_tracker — all refs PDF-verified advisor-dev kit (legitimately absent from the client search JSON) → ke… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1432) |
| — | — | ↳ valuation — Valuation support.pdf (the sweep had only read Valuation Logic.pdf) is the real source; MBO/BIMBO/Newco ratified upstream by Mike (Indi… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1433) |
| P3 | SEC/TEST | Ghost-reference validator scope LOCKED to node trees (2026-06-24) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1435) |
| P1 | FIX | Learn topic-router never re-routed on a mid-conversation pivot | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1441) |
| P2 | FIX | Verbatim-content honesty at the data boundary (Learn + all chat modes) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1443) |
| — | — | FIXED 2026-07-22 — /api/clients proxy wiring | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1449) |
| P2 | DONE | Distinctions cascade, mentor authoring surface (the UI origin of the cast) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1455) |
| — | — | ↳ A single-source loader (server/utils/platformDistinctions.js); repointed all 5 platform reads; byte-identical with no stored rows | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1456) |
| — | — | ↳ B /api/mentor/distinctions CRUD (firmAuth + requireMentorRole, global scope, never req.firmId); dev-file fallback; prod save errors re-thrown | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1457) |
| — | — | ↳ C mentor UI (components/MentorDistinctions.vue + tabbed pages/mentor.vue); self-contained (firm screen untouched); nuxt build green | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1458) |
| — | — | ↳ D — delete semantics ("keep theirs") | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1459) |
| — | — | ↳ E — mentor-update review (adopt/keep-mine) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1460) |
| P3 | TEST | dev-fallback tests no longer depend on local data/dev-*.json files | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1463) |
| P1 | SEC/FIX | Coaching-reference learning loop hardened (Phase 1 of the 2026-07-15 review) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1482) |
| P2 | BUILD | Mentor case-study review (per-case, manager-gated, anonymised) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1492) |
| — | — | org_leadership home — RULED: stays in Learn mode | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1510) |
| P3 | BUILD | Raw-JSON "Decision Framework" Firm Manager tab — SHIPPED 2026-07-16 (ruled: HIDE, admin/mentor-only) | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1514) |
| — | — | "Context domains override the strategy layer" — RULED: current per-domain handling IS the design | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1516) |
| P2 | SEC | Tier 2 fabrication watch: enforcement ON | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1522) |
| — | — | EXPERIENCE — Frustration detection BUILT 2026-06-25 | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1523) |

</details>

## What this table does not tell you

- It reads the **first line** of each entry. `ACTIONS.md` is 1536 lines and single
  entries run past 6,000 characters — the detail, the evidence and the rulings are in
  there, not here. Follow the link.
- **188 list lines carry no status marker** and are therefore not rows above. They are
  sub-points inside entries, not tasks — but they are counted here rather than dropped,
  so the difference between "no tasks" and "not parsed" is always visible.
- A row marked Done reflects what the entry says. It is not independent proof the work
  shipped; the linked entry names the commit and the tests.
