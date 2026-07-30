# Status — every task in the app, at a glance

> **GENERATED FILE — do not edit by hand.** Run `npm run status` to rebuild it.
> The source of truth is [`ACTIONS.md`](ACTIONS.md); this is a view of it. Every
> row links back to the full entry, where the reasoning and evidence live.

**55 outstanding** — 9 in progress · 39 open · 7 blocked. **105 completed** (listed at the bottom).

Completed work is kept here on purpose: so a task is never done twice, and so a new
task that resembles an old one can be traced back to the code that solved it.

## Outstanding

| Priority | Type | Status | Task | Section | |
|---|---|---|---|---|---|
| P2 | DECISION+BUILD | In progress | 28 dormant trees → harvest JUDGMENT into signals | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1084) |
| P2 | BUILD/DECISION | In progress | Get-the-Job Stage 2: due_diligence | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1103) |
| P2 | BUILD | In progress | Course persistence (courses + progress) — BUILT 2026-07-15, Stages A–D (Course Builder table CB-16/CB-17) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1105) |
| P2 | BUILD/DECISION | In progress | Business Performance Report (NEW feature, in design) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1165) |
| P3 | BUILD | In progress | Close the improvement loop | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1146) |
| P3 | BUILD | In progress | Learn-mode domain-support enrichment — BUILT 2026-07-16 (ruled: INJECT) | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1177) |
| — | — | In progress | Report-model maths — verified against source Excel 2026-07-10; 1 proven formula flaw FIXED, others are faithful/not-flaws | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L966) |
| — | — | In progress | CourseBuilder SSE never aborted — *(course half ✅ FIXED 2026-07-15, b8ef0ed — AbortController on every context switch; see Course Builder table CB-… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L976) |
| — | — | In progress | (history) Engine could not recognise a business in CRISIS (the quickfire SURVIVAL branch) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1092) |
| P1 | BUILD | Open | a visible routing map: which material reaches CLIENT RECOMMENDATIONS, and which is ADVISOR-READ-ONLY | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L108) |
| P1 | CONTENT/VERIFY | Open | a FABRICATED detail was found living in the domain-support data, presented as the firm's own material | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1045) |
| P2 | SALVAGE | Open | PR #1 (chore/i18n-jsdoc-cleanup, opened 2026-06-30) CLOSED UNMERGED 2026-07-21, deliberately | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L934) |
| P2 | VERIFY | Open | the advisor-chat recommendation change has NOT been exercised live | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1074) |
| P2 | PROCESS | Open | Adopt release tags as the integration hand-off to the master team | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1082) |
| P2 | CONTENT | Open | P2 · CONTENT (Mike/master-team) — the EOY scripts text is not in the app's data, and "EOY Scripts Only" is not a page in the current master export | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1111) |
| P2 | FIX | Open | Learn mode is profile-blind: it asks questions the advisor profile already answers | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1113) |
| P2 | BUILD | Open | P2 · BUILD (pre-production) — Firm Manager config persistence → MySQL | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1117) |
| P2 | BUILD | Open | Distinctions cascade, Stage 3 — hierarchy hook-up to the master app (mentor→firms→advisors) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1119) |
| P2 | FIX | Open | Coaching-reference review, Phase 2: cap + domain-filter the injected entries | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1154) |
| P2 | SEC/FIX | Open | Coaching-reference review, Phase 3: server-side caseContext | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1156) |
| P2 | BUILD | Open | Education gates on the Advisory Staircase — RULED: advisor-choice prompt (Mike's own design, 2026-07-16) | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1181) |
| P3 | DOC | Open | ↳ QUIZ-LAB-REPORT.md is now STALE (says 58 banks / 610 questions; reality is 62 / 652) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L608) |
| P3 | TEST | Open | ↳ P3 · TEST follow-up (found 2026-07-30, NOT done — needs its own approval): that test checks an allowlisted name is still absent from the library, b… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L699) |
| P3 | CONTENT | Open | ↳ P3 · CONTENT (Mike) — two defects in Domain Support/EOY Support.pdf itself | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L798) |
| P3 | ENV | Open | npm 8 is not installed on the desktop, which is the machine that does the installs | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L902) |
| P3 | TEST | Open | jest.config.js collectCoverageFrom excludes the decision engine + routes (advisorEngine.js, courseEngine.js, server/routes/, mixins/), so the Const… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1130) |
| P3 | TEST | Open | No component-test infrastructure and no Playwright, anywhere in the repo | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1132) |
| P3 | STRUCT | Open | Monolithic components, no base/shared split | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1134) |
| P3 | DOC | Open | Sparse JSDoc. Mixins lack @param/@returns; course.js has none; advisor.js ~4 tags across 2061 lines. Scheduled into the planned cleanup pass — see… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1136) |
| P3 | I | Open | P3 · I18N — Hardcoded English in templates (e.g | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1138) |
| P3 | EDIT-TARGET | Open | Bring building blocks under Firm-Manager no-code editing: 14-question weight sliders, Strategy table (strategyResolver rules), primary-issues table… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1140) |
| P3 | EDIT-TARGET | Open | Plan-mode's 2 proprietary frameworks are embedded (locked) inside plan.txt and flagged "should become firm-editable." Add to the firm-editable cons… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1142) |
| P3 | BUILD | Open | Profile → DB. Move the advisor profile off localStorage into the firm DB (same migration family as case studies). *Source:* registry Part 1A → Prof… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1144) |
| P3 | BUILD | Open | Auditability goals. Decision Trace (per-recommendation trace) + Config versioning (edit history; tag each saved case with the active config version… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1160) |
| P3 | DOC | Open | P3 · DOC tidy — fold any remaining per-file detail from registry_compilation_wip; resolve the Org CA Capacity Planner mislabelled-PDF flag (Part 2A) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1163) |
| P3 | BUILD | Open | HOW-swap scope — RULED: YES, both places | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1179) |
| — | — | Open | 3 new source documents added 2026-07-30 (commit e443c52) — read and planned, NOT YET TRANSCRIBED | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L133) |
| — | — | Open | NEXT SESSION (Mike, 2026-07-22) — bring the Document Library page into line with Quizzes and Advisory Distinctions, and make the LOGIC TABLES and D… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L175) |
| — | — | Open | ↳ Stale lab baseline found (log, not Phase 0): committed design/SCENARIO-LAB-REPORT.md was last re-baselined 2026-07-14 AI-ON, before the 2026-07-22… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L196) |
| — | — | Open | ↳ One reading artefact left for Mike, deliberately not "tidied": sys_b4a_sixsigma now reads *"Volatility Analysis (from the Lite Data) establishes wh… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L761) |
| — | — | Open | ↳ Still open: (1) Job 2 — SCOPE CORRECTED 2026-07-30, read this before starting it; (2) per-material origin tags are domain-level until the §2.4 comp… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L775) |
| — | — | Open | BUG — every <b-icon> in the app renders as NOTHING; no icon font is loaded | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L857) |
| — | — | Open | ↳ Follow-up (deferred, minor) — plain-number localisation | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L917) |
| — | — | Open | ↳ Phase 4 — the "add a report" recipe (doc and/or /add-report skill) | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L930) |
| — | — | Open | Non-atomic Stage-D delete across stores — server/routes/mentor.js L181 — a mid-way failure leaves the master row live while firms lose their overri… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L972) |
| — | — | Open | Session-state read-modify-write race on concurrent same-session requests — advisorEngine.js (last-write-wins loses answers) | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L973) |
| — | — | Open | ↳ CONTENT GAP — Productive Habits needs a content summary | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1087) |
| — | — | Open | STACK DRIFT (dev toolchain) — flip engine-strict back to true | ⛔ DO-FIRST P1 (stack governance — overnight/reinstall-gated) | [open](ACTIONS.md#L1201) |
| — | — | Blocked | STATE — Vuex installed but unused — RULED: PARKED until the Advisor-e UAT settles, then bundled with the localStorage→MySQL migration | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1178) |
| — | — | Blocked | BUILD — Broaden urgency-trigger detection (follow-up to Intervention Urgency, evidence-gated) | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1190) |
| — | — | Blocked | BUILD — Primary-issue selector remnant (evidence-gated) | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1191) |
| — | — | Blocked | BUILD — Firm Manager: master-export self-service upload (Stage 2) | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1192) |
| — | — | Blocked | OPS (not code) — Provision the va_case_studies MySQL table | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1193) |
| — | — | Blocked | FEATURE (future, parked) — Advisor-enablement distinction table, paired to Learn mode | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1194) |
| — | — | Blocked | BUILD (later) — Distinctions cascade Stage 4 — case-study → suggested-distinction loop (north-star #4; out of scope for the cascade build itself) | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1195) |

## Completed

<details>
<summary><strong>105 completed tasks</strong> — click to expand</summary>

| Priority | Type | Task | Section | |
|---|---|---|---|---|
| P1 | FIX | Course Builder's session briefing reached the WRONG domain materials | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L26) |
| — | — | ↳ Phase 0 BUILT 2026-07-23 (approved by Mike, this branch): firm-aware content loading is live behind the engines | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L178) |
| — | — | ↳ Phase 1 BUILT 2026-07-23 (approved by Mike, this branch): Document Library rebuilt onto the rail → panel pattern | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L203) |
| — | — | ↳ Phase 2 STARTED 2026-07-24 (approved by Mike, this branch) — EOY is the first domain migrated to the four-column standard (§0.5); engine wired | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L213) |
| — | — | ↳ TAB STRUCTURE RULED 2026-07-24 (Mike) — plan §0.6: two dedicated Firm Manager tabs, Domain Support (four-column tables) and Logic Tables (IF→THEN g… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L222) |
| — | — | ↳ Domain Support editable tab BUILT 2026-07-24 (approved by Mike, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L227) |
| P1 | WIRE | ↳ domain-support firm overrides now use the config key the engine reads | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L240) |
| — | — | ↳ Logic Tables tab — Slice B SHIPPED + 3-way grouping + firm re-filing (2026-07-27, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L290) |
| — | — | ↳ Editing ergonomics SHIPPED 2026-07-29 (this branch) — found while Mike was about to edit 29 domains of four-column tables | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L299) |
| — | — | ↳ 🔑 Logic-tree ENTRY POINT is now data, not array position — 2026-07-29 (this branch, 71b7a2c + 98ecc51) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L311) |
| — | — | ↳ Decision Frameworks (PDF Document Library) tab REMOVED 2026-07-27 (owner decision, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L346) |
| — | — | ↳ Templates & Videos tab HIDDEN 2026-07-27 (owner decision, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L355) |
| — | — | ↳ Firm Profile tab REMOVED 2026-07-27 (owner decision, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L359) |
| — | — | ↳ Firm-table editing UX — name wrap + drag-to-size-and-remember (2026-07-27, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L366) |
| — | — | ↳ Domain-support content migration — COMPLETE 2026-07-29 | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L373) |
| — | — | ↳ "Hide list / Show list" SHIPPED 2026-07-29 (Mike's ask, approved; this branch) — more editing room on both firm-editable tables | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L419) |
| — | — | ↳ Specialist Tools Quiz INGESTED 2026-07-28 (approved by Mike, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L497) |
| — | — | ↳ Strategic Tools Quiz INGESTED 2026-07-28 (approved by Mike, this branch) — every quiz PDF in Course Builder Quiz/ now has banks behind it | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L522) |
| — | — | ↳ QUIZ LAB BUILT 2026-07-28 (approved by Mike, this branch) — scripts/quiz-lab.js | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L530) |
| — | — | ↳ LIVE-EYEBALL DONE 2026-07-28 (Mike, running app) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L551) |
| — | — | ↳ QUIZ PROVENANCE BUILT 2026-07-28 (approved by Mike, this branch) — "which bank fed this question?" Mike's ask: a complaint that "the quizzes aren't… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L559) |
| — | — | ↳ Governance Quiz INGESTED 2026-07-30 (approved by Mike, this branch) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L578) |
| — | — | ↳ LIVE END-TO-END CONFIRMED BY MIKE 2026-07-30 — the advisor AND firm-manager halves | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L617) |
| — | — | ↳ Ghost logic-tree references — 29 → 0, ALL CLOSED 2026-07-30 (the last one needed Mike's ruling, recorded at the end of this entry) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L650) |
| — | — | ↳ GUARD SHIPPED so this cannot rot silently again: tests/unit/logicTreeTemplateNames.test.js fails the build if any client-delivery tree names a page… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L685) |
| — | — | ↳ RULED + FIXED 2026-07-30 (Mike, same session) — Growth Framework → Growth Curve | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L710) |
| — | — | ↳ 7 prose mentions in tree notes SWAPPED 2026-07-30 (approved by Mike, same session) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L753) |
| — | — | ↳ Domain Support rail made honest 2026-07-27 | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L771) |
| — | — | FIXED 2026-07-23 (Phase 1 of the firm-editable tables build, approved by Mike) | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L831) |
| — | — | Done 2026-06-29 (this session) — Distinctions cascade Stages E AND D BUILT + verified, on branch feat/mentor-distinctions-authoring | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L880) |
| — | — | Done 2026-06-25 (this session) — cross-domain engine sweep, all lab-measured over 50 fixed cases across the 14 domains: (1) Display-drop fixed (bui… | ★ BIGGEST PRIORITY RIGHT NOW | [open](ACTIONS.md#L881) |
| — | — | FIXED 2026-07-19 — R1 — QP intake: edited figure keeps its "from file" badge — components/QuickPositionIntake.vue L48 | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L897) |
| — | — | FIXED 2026-07-19 — R2 — QP: cleared figure silently becomes the demo sample number, still tagged "from file" — QuickPositionIntake.vue | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L898) |
| — | — | FIXED 2026-07-19 — R3 · SEC — XLSX reader: unbounded row index → OOM/DoS from a ~1 KB crafted file — server/report/intake/xlsxReader.js | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L899) |
| — | — | FIXED 2026-07-19 — R4 — multi-column exports silently read first-column-only — server/report/intake/xeroReportParser.js | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L900) |
| — | — | TEST-GAP — CLOSED 2026-07-22 | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L901) |
| — | — | FIXED 2026-07-19 — R5 — EBITDA calc: mismatched growth/discount lengths → NaN → null EV indistinguishable from honesty-null — server/report/ebitdaD… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L905) |
| — | — | FIXED 2026-07-19 — R6 · SEC — intake catch echoed unexpected err.message → could leak a server file path — new server/report/intakeError.js: protot… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L906) |
| — | — | FIXED 2026-07-19 — R7 · SEC — global jsonBodyParser had NO maxBodySize (unlimited buffering, six anonymous calc routes behind it) — server/restify-… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L907) |
| — | — | RULED + FIXED 2026-07-19 — R8 · DECISION (Mike): option A — defaults may substitute, but NEVER silently — both engines now return defaultedInputs n… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L908) |
| — | — | FIXED 2026-07-19 — R9 — both new reports: failed recompute left stale figures with no warning — QuickPositionReport.vue + EbitdaDcfReport.vue: Eigh… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L909) |
| — | — | FIXED 2026-07-19 — R10 — both new reports: debounced-recompute race, older response could overwrite newer — _reqSeq monotonic stamp in both recompu… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L910) |
| — | — | FIXED 2026-07-19 — R11 — EBITDA print screen had NO from-file/entered badges; QP hid two file-sourced figures and untagged a third — components/Ebi… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L911) |
| — | — | FIXED 2026-07-19 — R12 — stepper desync + silent wipe of confirmed figures navigating back from step 3 — both intakes gained restore (reopen the co… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L912) |
| — | — | DONE 2026-07-21 — Firm preferred-currency (report money now firm-configurable) | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L916) |
| P2 | BUILD | Report scaffolding workstream COMPLETE 2026-07-22, all four phases | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L919) |
| — | — | ↳ Phase 1 DONE 2026-07-21 — reportRecompute mixin, all 6 reports converted | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L920) |
| — | — | ↳ Phase 2 DONE 2026-07-21 — HeroStrip/HeroFigure + SliderField, every converted screen browser-verified by Mike | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L921) |
| — | — | ↳ HeroStrip + HeroFigure built, 5 of 6 screens converted, ALL browser-verified by Mike 2026-07-21 | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L922) |
| — | — | ↳ SliderField DONE 2026-07-21 — 3 screens converted, all browser-verified by Mike | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L926) |
| — | — | ↳ Phase 3 DONE 2026-07-22 — ProvenanceBadge + StaleBanner + ReportHeader, all six screens browser-verified by Mike | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L929) |
| P3 | DX | FIXED 2026-07-21 — the dev server bound to the IPv6 loopback ONLY, so http://127.0.0.1:3000 is unreachable while http://localhost:3000 works (or do… | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L932) |
| P3 | UX | FIXED 2026-07-22 (Mike approved) | CODE-REVIEW SWEEP — 2026-07-18 (report feature, 3-reviewer pass) | [open](ACTIONS.md#L935) |
| — | — | FIXED 2026-07-10 — /api/course mounted with NO firmAuth — server/restify-server.js L131 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L949) |
| — | — | FIXED 2026-07-10 — Stored XSS in "Remove" confirm dialogs — doc name / video title (components/FirmManagerHub.vue) and distinction description (com… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L950) |
| — | — | FIXED 2026-07-10 — Backend URL hardcoded http://localhost:4000 in 7 frontend files (utils/cases.js, mixins/caseMixin.js, components/MentorReview.vu… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L953) |
| — | — | FIXED 2026-07-10 — OpenAI calls have no effective timeout — server/utils/openaiClient.js L131 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L955) |
| — | — | FIXED 2026-07-10 — SEC: cross-firm document download (IDOR) + broken auth on download — server/routes/firmManager.js L287 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L956) |
| — | — | FIXED 2026-07-10 — SEC: /api/course body has no size limit — server/courseEngine.js L469 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L957) |
| — | — | FIXED 2026-07-10 — SEC: rate limiter keys on spoofable X-Forwarded-For — server/utils/rateLimit.js L11 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L958) |
| — | — | ALREADY FIXED — verified in code 2026-07-22 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L959) |
| — | — | FIXED PROPERLY 2026-07-22 (Mike: "do it once, do it right") — recommended-template extraction | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L960) |
| — | — | FIXED 2026-07-10 — Saved-courses picker never refreshes — components/CourseBuilder.vue | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L961) |
| — | — | VERIFIED FIXED 2026-07-16 — Course-completion logging dead in prod — original localhost hardcode fixed by the apiProxy work; live click-through 202… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L962) |
| — | — | FIXED 2026-07-10 — Legacy-case migration self-disables on failure — utils/cases.js + mixins/caseMixin.js | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L963) |
| — | — | ↳ FIXED — WCC contribution margin (cell D20) workingCapitalCycleModel.js L96 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L967) |
| — | — | ↳ FIXED 2026-07-10 — input robustness across all 3 report models | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L970) |
| — | — | FIXED 2026-07-17 — SEC — prompt injection (both halves closed) | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L971) |
| — | — | FIXED 2026-07-15 — Global unhandledRejection swallow hid every other crash — courseEngine.js L29 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L974) |
| — | — | ALREADY FIXED — verified in code 2026-07-22 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L975) |
| — | — | FIXED 2026-07-22 — Chat input rendered under the Team Dashboard | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L977) |
| — | — | FIXED 2026-07-21 — Report-component slider races (stale numbers on rapid slider drags) — BusinessPerformanceReport.vue / DebtorDragReport.vue / Mar… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L978) |
| — | — | FIXED 2026-07-22 — Speech mixin teardown + permission-denial loop | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L979) |
| P1 | — | NOT A DEFECT — corrected 2026-07-22 | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L980) |
| — | — | FIXED 2026-07-15 — server-middleware/course.js was missing the client-disconnect cleanup that advisor.js added → abandoned SSE sockets wedged the d… | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L981) |
| — | — | FIXED 2026-07-22 — retryLastMessage duplicated the user turn | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L982) |
| — | — | FIXED 2026-07-22 — profileQuestions index drift | CODE-REVIEW SWEEP — 2026-07-10 (5-reviewer pass, whole app) | [open](ACTIONS.md#L983) |
| P2 | UX | DONE 2026-07-22. Sample figures now say so. Wording approved by Mike: "These are sample numbers, not your client's" (report.sampleFigures), shown v… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1076) |
| P1 | STACK | P1 · STACK DEVIATION CLOSED 2026-07-22 — the three report components' text is now in locales/en.json (report.debtorDrag 56 strings, report.marginBr… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1078) |
| P2 | DOC | Backfill the unknown commits in the deployed-versions ledger | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1080) |
| P2 | RESOLVED | P2 · RESOLVED 2026-06-25 — crisis recognition now robust + live-validated (see ACTIONS-ARCHIVE) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1091) |
| — | — | ↳ STEP 1 DONE (2026-06-24) — recognition | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1093) |
| — | — | ↳ STEP 2 VALIDATED (2026-06-24) — Mike's IP, no-code, proven end-to-end | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1094) |
| P2 | DATA | Tree→template provenance sweep RESOLVED 2026-06-24 | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1096) |
| — | — | ↳ get_positioning — 4 fabricated template names (Business Assessment Report, Revenue Model What-if, Agenda & Notes, Management Reporting Annual Plan)… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1097) |
| — | — | ↳ get_marketing / get_team_problem / get_sales_tracker — all refs PDF-verified advisor-dev kit (legitimately absent from the client search JSON) → ke… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1098) |
| — | — | ↳ valuation — Valuation support.pdf (the sweep had only read Valuation Logic.pdf) is the real source; MBO/BIMBO/Newco ratified upstream by Mike (Indi… | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1099) |
| P3 | SEC/TEST | Ghost-reference validator scope LOCKED to node trees (2026-06-24) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1101) |
| P1 | FIX | Learn topic-router never re-routed on a mid-conversation pivot | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1107) |
| P2 | FIX | Verbatim-content honesty at the data boundary (Learn + all chat modes) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1109) |
| — | — | FIXED 2026-07-22 — /api/clients proxy wiring | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1115) |
| P2 | DONE | Distinctions cascade, mentor authoring surface (the UI origin of the cast) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1121) |
| — | — | ↳ A single-source loader (server/utils/platformDistinctions.js); repointed all 5 platform reads; byte-identical with no stored rows | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1122) |
| — | — | ↳ B /api/mentor/distinctions CRUD (firmAuth + requireMentorRole, global scope, never req.firmId); dev-file fallback; prod save errors re-thrown | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1123) |
| — | — | ↳ C mentor UI (components/MentorDistinctions.vue + tabbed pages/mentor.vue); self-contained (firm screen untouched); nuxt build green | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1124) |
| — | — | ↳ D — delete semantics ("keep theirs") | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1125) |
| — | — | ↳ E — mentor-update review (adopt/keep-mine) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1126) |
| P3 | TEST | dev-fallback tests no longer depend on local data/dev-*.json files | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1129) |
| P1 | SEC/FIX | Coaching-reference learning loop hardened (Phase 1 of the 2026-07-15 review) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1148) |
| P2 | BUILD | Mentor case-study review (per-case, manager-gated, anonymised) | OPEN — actionable now (build / decide this session) | [open](ACTIONS.md#L1158) |
| — | — | org_leadership home — RULED: stays in Learn mode | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1176) |
| P3 | BUILD | Raw-JSON "Decision Framework" Firm Manager tab — SHIPPED 2026-07-16 (ruled: HIDE, admin/mentor-only) | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1180) |
| — | — | "Context domains override the strategy layer" — RULED: current per-domain handling IS the design | NEEDS A MIKE DECISION (no code until you rule) | [open](ACTIONS.md#L1182) |
| P2 | SEC | Tier 2 fabrication watch: enforcement ON | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1188) |
| — | — | EXPERIENCE — Frustration detection BUILT 2026-06-25 | GATED — not startable yet (evidence / auth / ops blocked) | [open](ACTIONS.md#L1189) |

</details>

## What this table does not tell you

- It reads the **first line** of each entry. `ACTIONS.md` is 1202 lines and single
  entries run past 6,000 characters — the detail, the evidence and the rulings are in
  there, not here. Follow the link.
- **127 list lines carry no status marker** and are therefore not rows above. They are
  sub-points inside entries, not tasks — but they are counted here rather than dropped,
  so the difference between "no tasks" and "not parsed" is always visible.
- A row marked Done reflects what the entry says. It is not independent proof the work
  shipped; the linked entry names the commit and the tests.
