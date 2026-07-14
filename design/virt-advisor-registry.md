  # Virt Advisor — System Registry (v1.0)

> **STATUS: OFFICIAL — the authoritative registry of how the system works.** Documents the system **as it actually works today**, verified against live code and data (baseline 2026-06-05); promoted from DRAFT on 2026-06-09 after Mike's read-through; **last reconciled 2026-06-22 (see "Recent Changes" at the top for everything that shipped since v1.0).** Supersedes `virt-advisor-design-registry.md`, which is **archived, not deleted** — `design/archive/virt-advisor-design-registry.ARCHIVED.md`, do-not-use banner (Part 10).
> Verification marks flag **genuine open build/decision work — tracked here on purpose (no silent parking), not documentation gaps**: **⚠ TO MAP** = a mapping or decision still to be made · **GAP** = built but locked in code/PDF, should become firm-editable. They stay flagged until the underlying work is done.

### How this document is ordered
**Global understanding first (Parts 0–3), then local detail (Parts 4–10).**
0. Governing Principles · 0A. Plain-Language Glossary · 1. App Functions · 1A. Non-Client Function Detail · 2. Master Asset Table · 2A. Logic/Support inventory · 3. Decision Pipeline (the 7-stage loop)
4. Lenses · 5. 14 Questions→Lenses · 6. Categorisation Axes · 7. Stage Detail · 7A. Stage-2 Primary Issue Registry · 8. Invisible HOW-Swap · 9. Improvement Engine · 10. Migration Checklist

### Scope
This describes the **Client** advisory function's engine in full (Parts 3–7); the other 7 functions are documented in **Part 1A**. The system is **built and running**; this registry's job is to make it auditable and to expose every building block for no-code editing (Principle P1). Remaining open work is flagged inline (⚠ TO MAP / GAP) — chiefly surfacing the 3 frameworks' *grading* in Firm Manager (the framework *content* itself is platform-locked, P1). **The case-study DB migration is now done (2026-06-22) — see "Recent Changes" (top).**

---

## Recent Changes — since v1.0 (2026-06-11 → 2026-06-25)

> Records what shipped and merged to `master` after the v1.0 baseline, so the registry is current at a glance. The detailed Parts below are updated inline where a specific claim changed; this is the summary.

> **2026-06-25 — CROSS-DOMAIN ENGINE SWEEP (merged `872614b`, live-validated; full detail in `design/ACTIONS-ARCHIVE.md`).** The decision pipeline (Part 3) changed in several places, all measured on the new **Scenario Lab** (`scripts/scenario-lab.js`, 50 fixed cases × 14 domains + metrics + the readable `design/SCENARIO-LAB-REPORT.md`):
> - **Stage 5/6 — code owns the displayed cards** (`buildDisplaySet`). The AI no longer picks the final templates from a wide net (that violated Principle 4 and silently dropped the top-scored card); it writes copy for the code-selected set only. R17's AI exclusion licence retired.
> - **Stage 1 — domain detection is now keyword-first with a confidence-gated AI backstop** (System Design §3.2, amended). Confident keyword wins; a thin/no match lets `gpt-4o-mini` read the MEANING and map to one of the 14 (boxed; disagreement asks the advisor). The classifier is given one-line domain BOUNDARIES (crisis=profit, not risk). Detection reachability 78%→96%.
> - **Stage 6 tone** — a recalibrated AI distress read (precision 8%→75%) drives a sober register for a failing business.
> - **Scoring** — pure industry revenue models suppressed outside profit/forecasting; staff/data/systems signal-dictionary patterns broadened to natural phrasing (coverage 26%→42%).
> - **Crisis** is now robust end-to-end (recognition + tools + tone), superseding the literal-keyword-only topic gate. **Case studies** persistence confirmed working; an advisor-page stale-token bug ("wipe on refresh") fixed. The **Scenario Lab is the standing cross-domain regression bench** — run it before any selection/detection change.

**1. Advisory Distinctions — full mentor→firm→advisor cascade (shipped, merged).** Distinctions are no longer a flat firm boost list. There is now a 3-tier cascade (platform/mentor → firm → advisor) resolved into one *effective list* per firm: a firm edit *replaces* the platform row, a firm *decline* switches it off, firm-own rows are added (override-replaces / decline-wins / no double-boost). Firms can edit, decline, or **move** a distinction to a better domain. Stable `pd-N` ids. A **cross-domain near-miss bridge** surfaces firm distinctions filed under another domain that match the session. A **"Why this recommendation" decision-trace panel** shows the advisor the issue, lenses, scores, and distinction influence. Code: `server/utils/resolveDistinctions.js`, `firmDistinctions.js`, `advisorEngine.js`. (Updates Part 2 distinctions row, Part 9.)

**2. Template-selection engine repair (shipped, merged).** `includedInClient` removed as a selection gate everywhere — it only governs client self-serve visibility, not advisor recommendability; the candidate pool is now the full *do-the-job* set (~208 templates). `DOMAIN_SIGNAL_SCOPE` + the purpose-fallback are single-sourced from the signal dictionary (was a drifted hand-copy that dropped `revenue_modelling` from profit). Industry now scores (wrong-industry templates held back). Distinctions can target a revenue-model **group** (`@rf-industry` / `@rf-general`), auto-matched to the client's industry. A cross-domain **regression harness** (`tests/unit/selectionHarness.test.js`) locks the behaviour. (Updates Part 4 Step 1 + attenuation.)

**3. Case studies → shared server database (shipped, merged — closes the IDOR).** Case studies moved from browser `localStorage` to a shared server-side database via secured `/api/cases` routes (`firmAuth`; advisor/firm identity from the JWT, never the request — this **closes the `cases.js` IDOR**). Each case has a two-way **private↔shared** visibility toggle; "shared" now genuinely means firm-wide and follows the advisor across devices. Post-delivery review + a one-time localStorage→DB migration included. New table `va_case_studies` (`config/db-schema.sql`); dev runs on a gated JSON fallback until MySQL is provisioned. Code: `server/routes/cases.js`, `server/utils/caseStore.js`. This is **step (a)** of the case-study feedback loop; the manager review area + one-click "move" (steps b, c) remain to build. (Updates Part 1A, Part 2, Part 9.)

**4. Learn mode — win-work/EOY redirect + EOY coaching (shipped, merged).** When an advisor's goal is to win/upsell advisory work rather than solve a client problem, the system offers to switch them into **Learn** mode and carries their real goal across. A dedicated **EOY Meeting coaching section** was added to `learn.txt`: stage overview for context → offer the step-by-step drill-down → coach element by element from the EOY reference. The Learn coaching tree is now picked by the AI from the advisor's words (robust to dictation), falling back to the keyword matcher. (Updates Part 1A Learn.)

**5. Anti-fabrication — guardrail + watch (shipped, merged; NEW).** Two layers protect the firm's IP from being invented. **Tier 1:** a single canonical "never invent the firm's content" guardrail (`server/utils/promptGuardrail.js`) is prepended to **every** system prompt by `promptLoader`, so no mode/path can ship without it. **Tier 2 (log-only):** `server/utils/fabricationWatch.js` checks every finished AI answer's quoted, script-like wording against the reference *and* the conversation, and **logs** (`[fabrication-watch]`) any quote it can't trace — it observes, it does not yet alter output. Removal (enforcement) is parked + evidence-gated (ACTIONS P2). Origin: a live EOY session invented a "Motivating Hook" script.

**6. OpenAI architecture — engines on the Restify backend (shipped, merged).** The advisor + course engines now run on the **Restify backend** (`server/advisorEngine.js`, `server/courseEngine.js`) and call the **OpenAI REST API directly** (no SDK, Node-14-compatible); the Nuxt `server-middleware/` is a thin SSE proxy. Mode prompts live in `data/prompts/*.txt` (now **6**: client, discover, plan, learn, course-design, course-session) loaded by `server/utils/promptLoader.js`; the API key is backend-only. Closes the former Req-7 / architecture-boundary drift.

---

## Part 0 — Governing Principles

**P1 — Auditable AND editable (with proprietary frameworks protected).** Every decision the system makes must be (a) traceable to a reason, and (b) changeable by a firm manager in the Firm Manager page (table/flowchart/slider) — never requiring a code change. This is the whole point of the system. **Exception — protected IP (the 3 proprietary frameworks' content):** the proprietary *content* of the **3 Engagement Types**, the **5-step Advisory Staircase**, and the **entire Growth Fundamentals framework** (the steps/types/stages and their meaning) is deliberately **platform-locked and NOT firm-editable**, to protect the IP it represents (Mike's decision, 2026-06-11). They stay wired to their single-source JSON (so they drive the engine and the AI without code changes), but a firm cannot rewrite the frameworks. Do not re-propose making the framework content editable. **Distinction:** firm-*tunable grading around* a framework is allowed and not the same thing — e.g. the Advisory Staircase **complexity grading (ceiling) per level** is firm-editable (built 2026-06-09), because that tunes how much complexity a firm permits at each level, not the framework itself.

**P2 — Weighting serves the advisor, it does not replace them.** The 4 lenses are weighted to *reduce guessing*, not to remove advisor judgment. The primary safeguard against a wrong outcome is **checking in with the advisor** (domain confirmation, primary-issue selector, "none of these fit" escape, contradiction detector, and always confirming agreement before finalising). Weights tune the *suggestion*; the advisor confirms or corrects the *outcome*. **When a weight and the advisor disagree, the advisor wins.** More precision must never cost fewer check-ins. Do not over-rigidify.

**P3 — AI classifies micro-signals and writes copy. Code makes the macro decisions.** Diagnosis, strategy, and template selection are driven by the domain expert's design (data + code). The AI extracts signals from free text and writes the final narrative — it does not invent the recommendation.

**P4 — The master template library is read-only.** `search_content_*.json` / `templates.json` (278 templates) are generated by the Advisor-e master app. IDs and content are never edited here.

---

## Part 0A — Plain-Language Glossary

Technical terms used in this registry, in advisor language. (One line each.)

| Term | In plain English |
|---|---|
| **Asset / Building block** | Any editable piece the system uses to make a recommendation — a list, a rule, a framework. "Building block" is the friendlier name. |
| **Signal** | A clue the system picks out of what the advisor types (e.g. "cash flow problem") that points toward certain templates. |
| **Semantic profile** | A pre-written "fingerprint" for each template describing which problems it's really for, so the system can match it to what the advisor described. |
| **Profile richness** | How detailed a template's fingerprint is — used only to break ties (the more focused template wins). |
| **Candidate pool** | The shortlist of templates the system considers before choosing the final one or two. |
| **Relevance gate** | A final AI check that drops any shortlisted template that doesn't genuinely fit, before the advisor sees it. |
| **Template budget** | How many templates the session can realistically use, set by meeting count and session length. |
| **Complexity ceiling** | The most advanced level of tool appropriate for where the client relationship currently is (set by the staircase). |
| **Engagement type** | How the advisor works with the client: teach (Education), work through together (Facilitation), or give expert recommendations (Advice). |
| **Lens** | One of the four angles the system views a situation through: Situation, Client Acumen, Relationship, Advisor Capability. |
| **Primary issue** | The specific underlying problem the engagement will address — not the surface symptom. |
| **Solution category** | A grouping of related templates by the kind of fix they provide. |
| **Distinction boost** | Extra weight a firm gives its own preferred templates or phrases, set in Firm Manager. |
| **Attenuation** | Turning down (or off) clues that don't belong to the current domain, so they don't distort the result. |
| **Two-card output** | Showing the advisor both the ideal template and the one that fits the current relationship, when those differ. |
| **CaseState** | The system's tidy internal summary of everything captured about the situation (an internal term — never shown in the app). |

---

## Part 1 — The App Functions

Virt Advisor is **8 functions**, not one. The advisor picks a function from the menu; only the first (Client) runs the diagnostic pipeline. **The bulk of this registry (Parts 3–7) describes the Client function's engine**; the other 7 functions are documented in **Part 1A**. Note the **Type** column: only Client/Discover/Plan/Learn are `advisor.js` AI-chat *modes* — Course/Progression/Profile/Firm Manager are separate subsystems with their own routes/pages, not modes.

| # | Function (menu label) | What it does | Type · id | In this registry |
|---|---|---|---|---|
| 1 | **Client** — "I have a client situation" | Guided advisory: diagnose the client situation → recommend templates → explain why | chat mode · `client` | ✅ Parts 3–7 (the 7-stage closed loop) |
| 2 | **Discover** — "I want to find something specific" | Universal template finder (any section) by concept, capability, or half-remembered name | chat mode · `discover` | ✅ Part 1A |
| 3 | **Plan** — "I want to plan ahead" | Advisor's own practice / fee / development planning | chat mode · `plan` | ✅ Part 1A |
| 4 | **Learn** — "I'm interested in learning more" | Skill-development coaching; home of the 14 coaching trees; HOW-swap target | chat mode · `learn` | ✅ Part 1A (+ Part 8) |
| 5 | **Course** — "I want to build a course" | Builds + delivers a structured learning course | subsystem · `/api/course` | ✅ Part 1A |
| 6 | **Progression** — "My Progress" | Tracks the advisor's capability across tiers (DB-backed) | subsystem · `/api/activity/*` | ✅ Part 1A |
| 7 | **Profile** — "Your advisor profile" | Stores known advisor facts to personalise all functions | form · localStorage | ✅ Part 1A |
| 8 | **Firm Manager** — "Team Dashboard" / admin hub | The **editing surface** for building blocks: documents, advisory distinctions, decision framework, videos, firm profile | subsystem · `/api/firm-manager/*` | ✅ Part 1A |

**What the advisor / firm manager actually sees → internal name.** The menu labels on screen differ from the internal names used in this registry. (9 on-screen labels → 7 internal functions: Progression wears two labels, and Profile is a pop-up rather than a chat.)

| On-screen label | Internal name (this registry) | App reference |
|---|---|---|
| "I have a client situation" | Client | chat mode `client` |
| "I want to find something specific" | Discover | chat mode `discover` |
| "I want to plan ahead" | Plan | chat mode `plan` |
| "I'm interested in learning more" | Learn | chat mode `learn` |
| "I want to build a course" | Course | mode `course` → `/api/course` |
| "My Progress" | Progression *(advisor's own view)* | mode `progression` → `/api/activity/progression` |
| "Team Dashboard" | Progression *(firm-manager team view)* | mode `firm` → `/api/activity/team` |
| "Your advisor profile" | Profile | profile pop-up (localStorage) |
| "Firm Manager" | Firm Manager *(editing hub)* | separate page `/firm-manager` → `/api/firm-manager/*` |

*Note:* "My Progress" and "Team Dashboard" are two views of the **same** Progression system (your own tiers vs your team's); "Firm Manager" is a **separate** editing-hub page (documents / distinctions / framework), not the same thing as "Team Dashboard".

**Key relationships:**
- Functions 2–7 draw on the same asset library but use different prompts/flows (e.g. `discover.txt`, `plan.txt`, `learn.txt`, course files).
- **Function 8 (Firm Manager) is cross-cutting** — it's where Governing Principle P1 ("editable without code") is delivered for every building block in Part 2 (Master Asset Table).
- Client and Learn are linked at runtime by the invisible HOW-swap (Part 8).

---

## Part 1A — Non-Client Function Detail

> The Client function's engine is Parts 3–7. This part documents the **other** functions, built up one at a time and verified against live code. Each entry states what the function is, its flow, its assets, and — per the no-silent-parking rule — what is actually wired vs dormant.

### Discover — "I want to find something specific"
**In plain terms:** **"I want to find something specific"** *(internal: Discover)* — the menu button an advisor taps to hunt down a specific template: they describe what they're after, and the AI finds the closest matches from across the whole library.

**What:** a universal template **finder** — the advisor locates a specific template by concept, capability, or half-remembered name, then gets delivery help. **Searches the whole library (any section) by design** — the advisor may be hunting a client-facing Do-the-Job tool *or* one of their own get-the-job / get-organised tools (Mike-confirmed 2026-06-08). **Not** a diagnostic pipeline. **Mode id:** `discover` (one of the 4 `advisor.js` AI-chat modes). **Prompt:** `discover.txt`. **Menu label:** "I want to find something specific" (`en.json mode.discover`). **Live:** ✓. **Editable in Firm Mgr:** ✗ (prompt protected).

**Flow (strict 3 steps):**
1. **Find** — match to the best template; ask ONE clarifying question if vague. Tracks every rejected template, never re-suggests one. Honest "no match" fallback. Output: **Best match / How it works / Also worth considering**, ending with the fixed line *"Is that what you had in mind…?"*
2. **Confirm** — never skipped. If wrong, ask what was missing (+ keywords) and re-search without repeats; if confirmed → Step 3.
3. **Deliver** — only after confirmation, offer approach help / email / opening script. Deliberately does **not** ask experience or confidence — actively searching is signal enough.

**Template scoping (verified `advisor.js` + `templates.js`):** Discover is **not** in `MODE_SECTIONS`, so `primarySections = null` → the AI receives the **top-25 query-matched templates across all sections** (`filterTemplatesByQuery`, no section filter). Each result is labelled *"Client-facing delivery tool"* vs *"Advisor reference/learning resource"* (`formatTemplatesForPrompt`) — so the get/client distinction is preserved by **labelling, not exclusion**. *(Contrast: Client hard-excludes get-the-job / get-organised via `excludeSections`.)*

**Assets:** `discover.txt`; canned opening; coaching reference (always on in discover); `content-summaries.json`; case summaries; section descriptions; advisor profile. Shares Client's context-assembly path (`mode === 'client' || 'discover'`) but **skips the diagnostic engine (Stages 1–4)** entirely. A `[POST-RECOMMENDATION]` guard stops it restarting the search and hard-binds it to the exact template list (no invented names).

**Logic trees — DORMANT here.** `discover.txt` Step 1 tells the AI to use a "Diagnostic Logic Tree if provided in the context", but the server **never injects one** into discover mode (verified: the only tree-derived text discover can receive is a `mode: learn` deep-dive reference, after 2+ messages). So that instruction always falls through to a generic clarifying question. **Decision 2026-06-08 — Option 1:** leave as-is, documented dormant, not wired (a quick search tool asking a plain question is fine). Part of the broader **28-dormant-diagnostic-trees** question — see the Part 2 dormant-asset register.

### Plan — "I want to plan ahead"
**In plain terms:** **"I want to plan ahead"** *(internal: Plan)* — the menu button for working on the advisor's **own** business: career, fees, and how they run their practice — not a client's.

**What:** helps the advisor plan their **own** career, practice, and development — explicitly *"not about their clients… about them"* (`plan.txt`). Facilitative/exploratory. **Mode id:** `plan` (one of the 4 `advisor.js` AI-chat modes). **Prompt:** `plan.txt`. **Menu label:** "I want to plan ahead" (tag: Facilitative · Advisor Planning). **Live:** ✓. **Editable in Firm Mgr:** ✗ (prompt protected).

**Flow:** open questions one at a time across current situation → 12-month goals → what they've tried (~3–4 exchanges), then a 5-part recommendation (My recommendation / Why this fits where you are / What this will help you achieve / How to use it / What this typically leads to).

**Template scoping (verified `advisor.js`):** `MODE_SECTIONS.plan = ['get-organised']` → all get-organised templates (advisor planning / career dev / firm logistics) as the **primary** pool, **plus** a query-matched top-up (≤10) from other sections. Leads with the advisor's own development tools but can pull get-the-job (selling) or do-the-job (delivery) when the conversation moves there (`plan.txt` Rule: *"the advisor's needs come first, not the section boundary"*).

**Two proprietary decision frameworks embedded IN the prompt** (live, but locked in `plan.txt` — not in the editable layer; a "locked-in-prompt" GAP):
- **Sales-Process matching** — match the sales approach to advisor experience/confidence. New/unconfident → always Free Client Content / TCM (softest entry). Confident/experienced → a decision table (Campaign / Lite Fundamentals vs Total Needs vs Planning Outcomes Review) by client type. Plus the **HOW-you-sell ≠ WHAT-you-deliver** rule (sales process vs Modular/Bespoke solution are separate decisions).
- **Fee-Growth role-based routing** — identify role + firm position, then give **two tools (model first, then plan)**: partner/director → Practice Capacity Planner + My Fee Growth Plan; advisor growing own fees → My Fee Growth Model + My Fee Growth Plan; financial planner → Financial Advisor model + My Fee Growth Plan.

**Assets:** `plan.txt`; canned opening; `MODE_SECTIONS` scoping; **Advisor Profile** (Fee-Growth routing reads the role field, asks if unset); coaching reference (after 4 exchanges). **Does NOT use** content-summaries, case studies, section descriptions, domain support, growth reference, or the Phase-2 intercept — those are client/discover only.

**vs Client/Discover:** advisor-facing (own growth), no diagnostic pipeline, no domain detection, get-organised-primary scoping. Its real decision logic lives **inside the prompt** — live but ✗-editable.

### Learn — "I'm interested in learning more"
**In plain terms:** **"I'm interested in learning more"** *(internal: Learn)* — the menu button for an advisor to build their **own** skills, and where the step-by-step coaching guides (Trial Fit, Conflict, Dashboards…) actually run.

**What:** helps the advisor develop their **own** professional skills and knowledge — *"their growth as an advisor — not about their clients"* (`learn.txt`). Facilitative/encouraging; always reminds the advisor the resources live inside Advisor-e. **Mode id:** `learn` (one of the 4 `advisor.js` AI-chat modes). **Prompt:** `learn.txt`. **Menu label:** "I'm interested in learning more" (tag: Facilitative · Development). **Live:** ✓. **Editable in Firm Mgr:** ✗ (prompt protected). Development areas: selling/winning clients, positioning/messaging, facilitation, psychology, networking/referrals, financial analysis & reporting, business fundamentals, revenue modelling.

**Flow:** one open question at a time across *what they want to develop → where they're starting from → how they like to learn* (build a picture before recommending — never after only 1–2 exchanges), then a 5-part recommendation (My recommendation / Why this fits / What you'll get from it / How to use it / What to explore next).

**Template scoping (verified `advisor.js`):** `MODE_SECTIONS.learn = ['get-the-job', 'get-organised']` → both advisor-development sections as the **primary** pool + a query-matched top-up (≤10) from other sections (can pull do-the-job when the advisor needs something to practise on). **Note:** this primary pool is taken *whole and unfiltered for fit* — the open known cause of a less-relevant resource surfacing (the "Total Needs" case); see the parked advisor-enablement-distinction-table item in ACTIONS.

**Win-work / EOY redirect + EOY coaching (added 2026-06-22).** When the advisor's goal is to **win or upsell** advisory work rather than solve a client problem, Client mode now offers to switch them into Learn and carries the real goal across. `learn.txt` also carries a dedicated **EOY Meeting** coaching protocol (`eoy_meeting`): give the stage overview for context → **offer** the step-by-step drill-down → coach element by element from the EOY reference. The Learn coaching tree is selected by the AI from the advisor's words (dictation-robust), falling back to the keyword matcher.

**This is the active home of the sequential coaching trees** — the **14 `mode: learn` trees** from the dormant-asset register (Part 2). Verified wiring: in learn mode, `detectLogicTree` runs on the conversation and any `mode: learn` tree is injected as coaching reference (`buildLearnReferenceText` → context). `learn.txt` carries a detailed coaching protocol for each: **Sales Process** (`sales_process`), **Trial Fit** (`trial_fit`), **Cautious Reveal** (`cautious_reveal`), **Seminar & Presentation** (`public_speaking`), **Dashboard Discussions** (`dashboard_discussions`), **Working Capital Cycle** (`working_capital_cycle`), **Ratio Analysis** (`ratio_analysis`), **Deming's Volatility** (`demings_volatility`), **Conflict Meeting Facilitation** (`conflict_meeting`). The pattern is always: *ask where the advisor is → coach one stage at a time from the reference content → progress when ready* — the tree IS the recommendation, not a source of template picks. Each tree pairs with a `*-reference.json` coaching library (trial-fit, cautious-reveal, powerful-seminars, dashboard-discussions, working-capital-cycle, ratio-analysis, demings-volatility, conflict-meeting, etc.).

**Target of the invisible HOW-swap (verified, Part 8).** In the Client post-recommendation path, `isHowToRequest && mentionsTool` → the system prompt silently swaps `client.txt` → `learn.txt` **for that message only** (`advisor.js:1115`), then reverts. So an advisor mid-Client-session who asks "how do I actually use this?" gets Learn's coaching brain without changing modes.

**Assets:** `learn.txt`; canned opening; `MODE_SECTIONS` scoping; the 14 `mode: learn` trees + their `*-reference.json` libraries; coaching reference (after 4 exchanges). **Does NOT use** content-summaries, case studies, section descriptions, domain support, growth reference, the Phase-2 intercept, or domain detection (client/discover only).

**vs Client/Discover/Plan:** advisor-facing skill development; no diagnostic pipeline; get-the-job + get-organised primary scoping; uniquely, it both **activates the 14 coaching trees** and is the **HOW-swap destination**.

### Course — "I want to build a course"
**In plain terms:** **"I want to build a course"** *(internal: Course)* — a separate area where the advisor builds and works through their own multi-session training course, with quizzes and progress tracking.

**What:** the advisor builds **and** delivers a structured, multi-session learning program for their **own** development. **Separate subsystem** — not an `advisor.js` mode. **Endpoint:** POST `/api/course` (`server-middleware/course.js`). **Frontend:** `components/CourseBuilder.vue`. **Prompts:** `course-design.txt`, `course-session.txt`. **Menu label:** "I want to build a course" (tag: Guided · Learning Program). **Model:** `gpt-4o` (heavier than the `gpt-4o-mini` used by the chat modes). **Live:** ✓. **Editable in Firm Mgr:** ✗ (prompts protected; quiz overrides are data).

**Five operations (dispatched by `body.type`):**
1. **design** (SSE) — course-design conversation → outline. A **code-controlled** question sequence (`COURSE_DESIGN_QUESTIONS`, asked one at a time with no AI call): current level/experience → intensity (consistent vs progressively harder) → session length & count. First message = primary goal (`_detectCourseMultiGoal` flags selling + delivery together). When all collected, `generateOutline` builds full context (query-filtered templates + **all** content-summaries + section descriptions + detected domains + advisor profile) + `course-design.txt` → streams an outline, emitting `[COURSE_OUTLINE]…[/COURSE_OUTLINE]` JSON parsed into `pendingOutline`. If an outline already exists, the next message is treated as a **revision** request.
2. **session** (SSE) — delivers one session via `course-session.txt` + the session context (title/focus/objectives/resources/duration) + matched **domain support** JSON + a matched **`mode: learn` logic tree** (`detectLogicTree` → `buildLearnReferenceText`) + advisor profile + templates.
3. **quiz-generate** (JSON) — 3 open-ended questions per session; **fixed overrides from `course-quizzes.json` take priority**, else `gpt-4o` generates.
4. **quiz-grade** (JSON) — grades one answer (70+ = pass, deliberately generous, with revisit guidance on a low score).
5. **progress** (JSON) — records session completion via `CourseReminderService.markComplete`. **⚠ Stub (labelled in code, not silently parked):** Phase-1 stub only; **Phase-2 persists to MySQL** + firm-level reporting.

**Assets:** `course-design.txt`, `course-session.txt`; `course-starters.json` (course starters — title/blurb/session-count, used by `CourseBuilder.vue`); `course-quizzes.json` (fixed quiz overrides); `CourseReminderService`. Reuses templates, content-summaries (all injected at design), section descriptions, domain-support JSONs, and the `mode: learn` trees (session delivery), + advisor profile.

**Scope (get/client lens):** advisor-development oriented (building the advisor's own learning program), but pulls relevant templates **across sections** as course material (`filterTemplatesByQuery`, no section restriction).

**vs the chat modes:** separate endpoint + screen, `gpt-4o`, a code-controlled design questionnaire (not free conversation), and a quiz/grade/progress loop. No diagnostic pipeline.

### Progression — "My Progress"
**In plain terms:** **"My Progress"** / **"Team Dashboard"** *(internal: Progression)* — the dashboard of sessions and courses completed and how the advisor is scoring; "My Progress" is the advisor's own view, "Team Dashboard" is the manager's team view.

**What:** a dashboard tracking the advisor's capability progression across three tiers (**entry-level / intermediate / advanced**) — counts of VA (client) sessions and course sessions, average quiz scores, and last-active per tier; plus a **team overview** for the firm manager. **Separate subsystem** — not an `advisor.js` mode. **Frontend:** `components/AdvisorProgression.vue`. **Backend:** `server/routes/activity.js` (Restify, registered in `restify-server.js`). **Menu label:** "My Progress" (tag: Development). **Live:** ✓ (DB-backed). **Editable in Firm Mgr:** n/a (reporting view).

**Routes (registered in `restify-server.js`):**
- `POST /api/activity/log-course` — log a completed course session
- `GET /api/activity/progression?advisorId&firmId` — advisor's own tier progression
- `GET /api/activity/team?firmId` — firm-manager team overview

**Data store:** MySQL tables `advisor_va_sessions` + `advisor_course_completions`, written by `server/utils/activityLogger.js` — `logVASession` (domain + recommended templates + highest tier from a completed Client session) and `logCourseSession` (course session + quiz score + tier). The dashboard aggregates both per tier (vaSessions, courseSessions, avgQuizScore, lastActive). DB calls fall back to empty data if the DB is unavailable (graceful).

**✅ IDOR CLOSED (activity 2026-06-09; cases 2026-06-22).** The three activity routes now sit behind `firmAuth` with advisor/firm identity derived from the verified **JWT**, never the request (advisor → own only; `team` additionally gated by `requireManagerRole` → own firm only); a spoofed id in the request is ignored (`tests/unit/activity.routes.test.js`). The related **`cases.js` IDOR is also now closed** — case studies are server-side behind `firmAuth` (see "Recent Changes" §3). *(Distinct from the Course `progress` stub — the activity routes DO write to the real DB.)*

**⚠ Dependency:** needs the MySQL tables provisioned; `restify-server.js` warns when `MYSQL_PASSWORD` is a placeholder → routes return empty.

### Profile — "Your advisor profile"
**In plain terms:** **"Your advisor profile"** *(internal: Profile)* — a one-time set of questions about the advisor themselves, so the system personalises every recommendation without re-asking.

**What:** stores known facts about the advisor, captured **once**, then reused to personalise recommendations across functions — *"Answer a few questions once — I'll use your background in every recommendation, without asking again."* **Not** a chat mode or separate endpoint — a **modal form inside `VirtualAdvisor.vue`** (reached from a menu card). **Menu label:** "Your advisor profile". **Live:** ✓. **Editable in Firm Mgr:** n/a (advisor-owned).

**Fields (7):** `advisorRole`, `experience`, `clientDemographic`, `enjoyment`, `technicalStrengths`, `toolsComfort`, `notes`. **Adaptive questioning:** the wording switches between standard and **beginner** variants (`enjoymentBeginner`, `clientDemographicBeginner`, `technicalStrengthsBeginner`) based on the advisor's stated role/experience. Supports **voice input** per field.

**How it's used (the cross-cutting personalisation layer):** passed as `advisorProfile` into Client/Discover (`formatAdvisorProfile` → context, drives the "Why this suits you as the advisor" section, and lets the **Phase-2 intercept** skip re-asking when a profile exists), Plan (Fee-Growth routing reads the role field), Learn, and Course (design + session context). One profile feeds five functions.

**Storage:** **localStorage only** (client-side) — not synced across devices, not in the firm DB (same limitation as case studies; same migration target). Switch device → profile is gone.

**Privacy by design:** the `clientDemographic` question explicitly instructs *"please don't mention names"*; the profile stores the **advisor's own** professional background, not client PII.

### Firm Manager — the editing hub (admin)
**In plain terms:** **"Firm Manager"** *(this is the one label the manager actually sees on screen)* — the admin area where a firm manager edits the building blocks (documents, distinctions, decision framework) without touching code.

**What:** the **no-code editing surface** for the firm's building blocks — the delivery of Governing Principle P1 (auditable AND editable). Cross-cutting (Function 8): it edits the assets the other functions consume. **Separate page:** `pages/firm-manager.vue` (+ `components/FirmManagerHub.vue`). **Backend:** `server/routes/firmManager.js`. **Menu label:** "Team Dashboard" / Firm Manager. **Live:** ✓ (Advisory Distinctions fully; others per below). **This IS the Firm-Mgr "editable" column** referenced throughout Part 2.

**Security — the reference implementation for secure multi-tenancy.** Every route is guarded by `[firmAuth, requireManagerRole]` (registered in `restify-server.js`): a valid JWT + a `firm_manager` / `platform_admin` role, with `firmId` **derived from the verified token** (the line-130 standard). This is the correct pattern that the Progression/case-study routes still need to adopt (see HANDOFF Security Notes).

**What a manager edits (routes):**
- **Documents** — `GET/POST /documents`, `/documents/download`, `DEL /documents/:fileId`. Stored in **Google Drive**; PDF-only, MIME-validated, size + per-firm quota enforced.
- **Decision Framework** — `GET/POST /framework` + `GET /framework/history` + `POST /framework/restore`. **Versioned with one-click restore** — a real config-versioning implementation (the auditability goal in Part 9, realised here).
- **Advisory Distinctions** — full CRUD (`GET/POST/PUT/DEL /distinctions/:id`). The proven, live, editable building block — proof-of-concept for the whole "edit without code" model; has dev-mode file fallbacks (`_devRead/_WriteDistinctions`).
- **Videos** — `GET/POST/DEL /videos/:id` (HTTPS training videos).
- **Firm Profile** — `GET/PUT /profile`.
- **Template Import** — `GET/POST/DEL /templates` (import / reset the firm's templates).
- **Storage usage** — `GET /storage` (per-firm quota view).

**Loop role:** drives the **Stage-7** action — `POST /api/cases/promote` (`firmAuth` + `requireManagerRole`) promotes a strong reviewed case into the coaching reference. **Hardened 2026-07-15 (coaching-reference review, Phase 1):** the body carries only `caseId` — the entry is built server-side from the stored case (audit stamps from the JWT + server clock), and lands in the FIRM's own overlay store (`config_key='coaching-reference'`, versioned) rather than the old global file, so one firm's promoted observations never reach another firm's prompts; firm entries are fenced (`fenceUntrusted`) before prompt injection.

**vs everything else:** not a recommendation function — it's the **control surface** that makes the other seven functions' building blocks editable. Closing the "✗ editable" column across Part 2 = bringing more blocks under *these* routes.

*(✅ All 7 non-Client functions now documented in Part 1A.)*

---

## Part 2 — Master Asset Table

The single global view of every asset and building block: what triggers it, which stage/section it supports, how it influences the decision, whether it's live, and whether it's editable in the Firm Manager (Governing Principle P1). **Proprietary frameworks are first-class assets and listed here.** This table replaces the old separate "asset inventory" and "building-block status" tables — one source, no duplication.

| Asset / Building block | Type | Trigger (question / input) | Supports (stage · section) | Decision-logic influence | Live? | Editable in Firm Mgr? |
|---|---|---|---|---|---|---|
| `search_content_*.json` / `templates.json` (278) | master data | every session | Stage 4 selection | the candidate universe of templates | ✓ | read-only (master app) |
| **Growth Fundamentals Framework** (`growth-fundamentals.json`, `growth-curve-reveal-reference.json`) | **proprietary framework** | Q6 Growth Curve selector | Stage 1 (Lens 2) · Growth Framework tier · Stage 5 | scale → fee sensitivity + complexity ceiling | ✓ | 🚫 **NOT firm-editable — platform-locked IP (Mike, 2026-06-11).** `growth-fundamentals.json` is the live single source (drives the on-screen selector + the Stage-5 AI narrative via `growth.js`; the old hard-coded duplicates were wired to it 2026-06-09). "Editable by a firm" is deliberately **out of scope** for this framework — an explicit exception to Principle P1 |
| **Advisory Staircase — 5 Advisor-e Steps** (source: `Logic Tables/5 Advisor-e Steps.logic.pdf` + `Domain Support/_5 Advisor-e Steps.supt.pdf`; live steps hard-coded in `VirtualAdvisor.vue`) | **proprietary framework** | Q7 Staircase selector | Stage 1 (Lens 3) · Stage 3 | relationship depth → complexity ceiling + comprehensiveness | ✓ | **Content locked; complexity grading firm-tunable (Mike, 2026-06-11).** The 5 steps + their proprietary meaning are platform-locked / NOT firm-editable. What a firm CAN tune is the **complexity grading (ceiling) attached to each level** — built 2026-06-09 (`GET/POST /api/firm-manager/staircase` + UI tab; per-request override blend in `advisor.js`), correct, stays. Wired to single-source `advisory-staircase.json`. Carries `education-gates-ascent` designIntent |
| **3 Engagement Types** (source: `Logic Tables/3 Engagement Types.logic.pdf` + `Domain Support/3 Engagement Types.supt.pdf` + `The 3 Engagement Types.pdf`; live in `client.txt` + `strategyResolver.js`) | **proprietary framework** | derived (not asked) | Stage 3 · Axis 2 · Stage 5 | engagement type + delivery style | ✓ | 🚫 **NOT firm-editable — platform-locked IP (Mike, 2026-06-11).** Wired to single source (`engagement-types.json` + per-domain `engagementType` in `domains.json` via Option C). A firm cannot rewrite it |
| `domains.json` | data | Q1/Q3 + domain questions | Stage 1 detection · Stage 2 | domain routing + domain questions | ✓ | editable |
| `signal-dictionary.json` | data | Q1/Q3/Q14 free text | Stage 1 | free-text → signals | ✓ | editable |
| `primary-issues.json` (10 domains) | data | domain + answers | Stage 2 | primary-issue options | ✓ | ✗ — target table |
| `logic_trees.json` — **14 active** (`mode: learn`) | **proprietary decision trees** | topic mentioned in chat | Learn mode + Client/Discover deep-dive | how-to **coaching reference** content | ✓ **live & used** | ✗ — editor target |
| `logic_trees.json` — **28 dormant** (diagnostic, no `mode`) | **proprietary decision trees** | resolver returns 0 candidates (rare) | **Stage 4 fallback** (not Stage 2) | *intended:* diagnostic pathway → templates; *actual:* a **rarely-hit fallback, not idle** — when the deterministic resolver returns zero candidates, `advisor.js` falls back to `detectLogicTrees`+`walkLogicTree` (NOT mode-gated, so these 28 can supply the template names). Bypassed whenever the resolver returns candidates (the normal case). | ⚠ **DORMANT (fallback-only) / parked** | ✗ — target flowchart |
| `semantic-profiles.json` (125) | auto-generated | signals | Stage 4 | template scoring weights | ✓ | ✗ (auto-gen) |
| `advisory-distinctions.json` (platform `pd-N`) + firm DB | data | advisor free text (AI-classified) | Stage 4 boost | phrase/theme → template boost; **now a mentor→firm→advisor cascade** — effective list (override-replaces / decline-wins / firm-own), firm can edit/decline/**move** a row, cross-domain near-miss bridge, "Why this recommendation" trace | ✓ | ✓ **built (cascade 2026-06-17)** |
| Relevance gate (R17) | prompt rule (`client.txt`) | candidate pool | Stage 4 | AI excludes ill-fitting templates | ✓ (interim) | ✗ |
| 14-question weights | code (scattered) | the 14 questions | Stage 1 → 3/4 | how much each lens bends the outcome | ✓ | ✗ — sliders target |
| Strategy rules | code (`strategyResolver.js`) | Lenses 2/3/4 | Stage 3 | engagement type, ceiling, budget | ✓ | ✗ — target table |
| `section-descriptions.json` (18) | data | section | Stage 1 · Stage 3 | tier / complexity / advisor-level | ✓ | ✗ |
| `fin-mgt-table.json` | data | Fin-Mgt droptab | Stage 1 | forecasting theme | ✓ | editable |
| `content-summaries.json` (187) | data (ex-PDF) | selected templates | Stage 5 | recommendation copy | ✓ | ✗ — editor target |
| `*-domain-support.json` (~25) | data (ex-PDF) | detected domain | Stage 5 | "how to approach it" | ✓ | ✗ |
| `*-reference.json` (~13) | data (ex-PDF) | method / deep-dive | Stage 5 | delivery-method content | ✓ | ✗ |
| `prompts/*.txt` (**6**, via `promptLoader`) | prompt | mode | Stage 5 | AI instructions per mode (+ the single global never-invent guardrail prepended to every prompt) | ✓ | ✗ (protected) |
| Case study capture (`utils/cases.js` → `/api/cases`) | code | saved session | Stage 6 (loop) | captures session for learning | ✓ **(shared server DB 2026-06-22; was localStorage)** | advisor-saved |
| Post-delivery review (`VirtualAdvisor.vue`) | code | after delivery | Stage 6 (loop) | what actually happened | ✓ | advisor-entered |
| Promote-to-coaching (`coaching-reference.json`) | data | strong reviewed case | Stage 7 (loop) | curated cases the AI references | ✓ (firm mgr) | partial |
| `coaching-reference.json` (15) | data | domain / pattern | Stage 5 + Stage 7 | pattern recognition | ✓ | ✗ — editor target |
| Course content (`course-starters.json`, `course-quizzes.json`) | data | Course function | (Course mode) | course outlines + quizzes | ✓ | ✗ |
| Source PDFs — `Logic Tables/` (46) | source docs | — | — | human source for `logic_trees.json` (the 42 trees) — **itemised in Part 2A** | n/a | n/a |
| Source PDFs — `Domain Support/` (49) | source docs | — | — | human source for `*-domain-support.json` / `*-reference.json` — **itemised in Part 2A** | n/a | n/a |
| Source docs — root (Common Problem Framework, Do the Job headers/summaries, Get the Job, 3 Engagement Types) | source docs | — | — | reference for categorisation + engagement types | n/a | n/a |

**Reading it:** Advisory Distinctions is the only block both live AND editable in Firm Manager. The proprietary frameworks were the top migration priority for **wiring to single-source JSON** (now done for all three). **All 3 proprietary frameworks' CONTENT is platform-locked — NOT firm-editable (Mike's decision 2026-06-11):** the **3 Engagement Types**, the **5-step Advisory Staircase**, and the **entire Growth Fundamentals framework**. This is the explicit protected-IP exception to Principle P1 — a firm cannot rewrite the frameworks; do not re-propose it. All three are **wired to single-source JSON** (`growth-fundamentals.json`, `advisory-staircase.json`, `engagement-types.json`; Phase 2 wiring completed 2026-06-09, the 3-copy duplication gone) — that wiring is correct and **stays**, since it drives the engine + AI without code changes. **Distinction (not a contradiction):** the Advisory Staircase **complexity-grading** edit-target (routes + UI tab, built 2026-06-09) lets a firm tune the *complexity ceiling per level* — grading, not framework content — so it is **correct and stays**. *(The earlier "surface all three so a firm can edit them" goal was an assumption that accreted from generalising one early build — never a decision.)*

**Dormant-asset register — `logic_trees.json` (the "no silent parking" rule).** The 42 trees, split by *real* usage (verified 2026-06-08 against the `mode` field):
- **14 active** (`mode: learn`) — used as how-to coaching content in Learn mode + the Client/Discover deep-dive offer: `sales_process`, `public_speaking`, `trial_fit`, `cautious_reveal`, `eoy_meeting`, `facilitation_101`, `reveal_growth_curve`, `conflict_meeting`, `capacity_capability_opportunity`, `heald_matrix`, `demings_volatility`, `working_capital_cycle`, `ratio_analysis`, `dashboard_discussions`.
- **28 dormant** (diagnostic, no `mode`) — **built but consumed by NO live decision path** (the Client flow uses advisor primary-issue selection instead): `quickfire`, `client_sales`, `cashflow`, `governance`, `client_planning`, `staff_performance`, `frameworks_find`, `systems`, `risk_management`, `valuation`, `succession`, `profitability_feasibility`, `due_diligence`, `get_sales_tracker`, `get_marketing`, `get_positioning`, `get_team_problem`, `get_pricing_proposals`, `stock_purchasing`, `raising_capital`, `fm_coach_culture`, `get_seminar`, `org_ca_firm_strategy`, `org_firm_board_pack`, `org_leadership`, `financial_systems_review`, `three_pill_fin_mgt`, `cash_tactics`.

**Governance rule (Principle P1 — no silent parking):** every asset must carry an honest status — **live & used** / **built but dormant** / **parked** — and anything *built-but-not-wired* must appear as a **named** backlog item, never absorbed into an aggregate count. No asset may be parked without a registry entry + status + reason. *(The 28 dormant diagnostic trees are the standing example of what this rule exists to prevent.)*

**▶ Status update — the 28 dormant trees → harvest into signals (2026-06-23).** Direction LOCKED (Mike; memory `design-logic-trees-guide-not-replace`): **the trees GUIDE the engine's understanding, they don't replace it.** A deterministic before/after harness ([`tests/unit/treeContributionHarness.test.js`](../tests/unit/treeContributionHarness.test.js)) proved the trees' *template lists are largely redundant* (the signal engine already reaches the same tools) but their *judgment is genuinely missing* — distinctions + readiness gates the flat scorer can't express. So the work is **not** wiring template lists in as-is; it is **harvesting each tree's branch logic into signals**, with the tree's named templates as a soft-hint tie-breaker only. Findings:
- **Name rot DISPROVEN.** All 93 template names referenced by the content trees are real, current `templates.json` titles (0 stale). No name reconciliation needed.
- **Triage** (`scripts/triageTrees.js`) sorted the content trees: needs-signal (`client_sales`, `systems`, `succession`, `quickfire`) · tie-breaker/cheap-win (`client_planning`, `staff_performance`, `profitability_feasibility`, `risk_management`, `stock_purchasing`) · redundant (`raising_capital`, `org_firm_board_pack`, `three_pill_fin_mgt`) · firm-facing → belong to the firm/learning surface, not the client engine (`fm_coach_culture`, `org_ca_firm_strategy`).
- **First harvest SHIPPED — `governance_too_early`.** The governance tree's "too early for governance — fix foundational management first" gate is now a **live signal** (`signal-dictionary.json`), and **People vs. Process** carries it (`reviewed_signal_map`). When the business is unready the engine surfaces it at the top — the gate IP is doing work. (Productive Habits needs a content summary before it can join — logged.) See `design/ACTIONS.md` (28-dormant-trees item) for the live programme + per-tree sequencing.

---

## Part 2A — Logic Tables & Domain Support: Full Inventory

Every logic table and domain-support document, listed as an asset. Most topics have a **matched pair**: a `Logic Tables/*.logic.pdf` (the decision logic → a `logic_trees.json` tree) and a `Domain Support/*.supt.pdf` (the delivery content → a `*-domain-support.json` / `*-reference.json`). 46 logic PDFs · 49 support PDFs.

| Topic | Logic table (`Logic Tables/`) | Domain support (`Domain Support/`) |
|---|---|---|
| 3 Engagement Types *(proprietary framework)* | 3 Engagement Types.logic.pdf | 3 Engagement Types.supt.pdf |
| 5 Advisor-e Steps *(Advisory Staircase — proprietary)* | 5 Advisor-e Steps.logic.pdf | _5 Advisor-e Steps.supt.pdf |
| 3 Pill Financial Management | 3 Pill Fin Mgt Logic.pdf | 3 pill Fin Mgt support.pdf |
| Capacity, Capability, Opportunity (CCO) | CCO Logic.pdf | Capacity Capability Opportunity Support.pdf |
| Cash Tactics | Cash Tactics Logic.pdf | Cash Tactics Support.pdf |
| Cashflow | Cashflow Logic.pdf | — |
| Cautious Reveal Method | Cautious Reveal Method Logic.pdf | Cautious Reveal Summary.pdf |
| Client Planning | Client Planning Logic.pdf | Client Planning support.pdf |
| Client Sales | Client Sales Logic.pdf | — |
| Conflict | Conflict Logic.pdf | Conflict Support.pdf |
| Dashboard Discussions | Dashboard Logic.pdf | Dashboard Support.pdf |
| Deming's Volatility | Demings Logic.pdf | Demings Volatility support.pdf |
| Due Diligence | Due Diligence Logic.pdf | Due Diligence support.pdf |
| End of Year (EOY) | EOY Logic.pdf | EOY Support.pdf |
| FM Coaching & Culture | FM Coach & Culture Logic.pdf | FM Coach & Culture Spt.pdf |
| Facilitation 101 | Facilitation Logic.pdf | Facilitation 101 Support.pdf |
| Financial Systems Review | Financial Systems Review Logic.pdf | — |
| Frameworks Find (triage) | Frameworks Find Logic.pdf | — |
| Get — Advisory Pricing & Proposal | Get Advisory Pricing & Proposal Logic.pdf | Get Advisory Pricing & Proposal Support.pdf |
| Get — Positioning | Get Positioning Logic.pdf | Get Positioning Support.pdf |
| Get — Public Speaking | Get Public speaking logic.pdf | — |
| Get — Sales | get sales logic.pdf | Get Sales Support.pdf |
| Get — Sales Tracker | Get Sales Tracker Logic.pdf | Get Sales Tracker Support.pdf |
| Get — Seminar | Get Seminar Logic.pdf | Get Seminar Support.pdf |
| Get — Marketing | Get marketing logic.pdf | Get Marketing Support.pdf |
| Get — Team Problem | Get Team Problem Logic.pdf | Get Team Problem Support.pdf |
| Governance & Leadership | Governance & Leadership Logic.pdf | Governance & Leadership support.pdf |
| Heald Matrix | Heald Matrix Logic.pdf | The Heald Matrix support.pdf |
| Lite Feasibility | Lite Feasibility Logic.pdf | Lite Feasibility support.pdf |
| Org — CA Capacity Planner | Org. CA Capacity Planner Support.pdf ⚠ *(mislabelled "Support" in Logic folder)* | Org. CA Capacity Planner Support.pdf |
| Org — CA Firm Strategy | Org. CA Firm Strategy logic.pdf | Org CA Firm Strategy Support.pdf |
| Org — Firm Board Pack | Org. Firm Board Pack Logic.pdf | Org. Firm Board Pack Support.pdf |
| Org — Leadership | Org. Leadership Logic.pdf | Org. Leadership Support.pdf |
| People Power | People Power template logic.pdf | People Power Suppt.pdf |
| Quickfire (triage entry) | Quickfire Logic.pdf | — |
| Raising Capital | Raising Capital Logic.pdf | Raising Capital Supt.pdf |
| Ratio Analysis | Ratio Analysis Logic.pdf | Ratio Analysis Supt.pdf |
| Reveal Growth Curve | Reveal Curve Logic.pdf | Reveal Curve support.pdf |
| Risk Management | Risk Management Logic.pdf | Risk Management support.pdf |
| Staff Performance | Staff Performance Logic.pdf | Staff Support.pdf |
| Stock Purchasing | Stock Purchasing Logic.pdf | Stock Purchasing Suppt.pdf |
| Succession | Succession Logic.pdf | Succession Planning Supt.pdf |
| Systems | Systems Logic.pdf | Systems Support.pdf |
| Trial Fit Method | Trial Fit Method Logic.pdf | Trial Fit Method - Summary.pdf |
| Valuation | Valuation Logic.pdf | Valuation support.pdf |
| Working Capital Cycle | Working Capital Logic.pdf | Working Capital Cycle Support.pdf |

**Support / reference docs with no logic-table counterpart** (content only): Coaching Content.pdf · Do the Job Content summaries (2).pdf · Get the Job Content SPT.pdf · Org. Advisor Content.pdf · Org. Firm Content Spt.pdf · Powerful Seminars.pdf · Sales & Marketing Slides table.pdf · Why Use Rev Models.pdf · _Do the Job Content headers (3).pdf

**Mapping to extracted JSON — resolved 2026-06-08** (verified against `logic_trees.json` (42 trees) + on-disk `data/*.json`).

*Rule:* the logic PDFs map to the **42 `logic_trees.json` trees** essentially 1:1 by topic; most support PDFs have a matching `*-domain-support.json` / `*-reference.json`. All 42 trees are accounted for — 41 map to a topic above; the 42nd, `profitability_feasibility`, is the **Profit domain** (a domain, not a method PDF, so it has no row here).

*Resolved ambiguities:* **Get — Sales** → tree `sales_process`; **Get — Public Speaking** → tree `public_speaking`. Topics with no support PDF (Cashflow, Client Sales, Financial Systems Review, Frameworks Find, Quickfire) correctly have no support JSON.

*Exceptions — the only rows with a missing JSON (the extraction backlog):*

| Topic | Logic tree (`logic_trees.json`) | Support JSON | Gap |
|---|---|---|---|
| **3 Engagement Types** *(proprietary framework)* | — | — | ✅ now extracted → `engagement-types.json` (Phase 1, 2026-06-08). Lives as its own framework file, **not** a `logic_trees` entry |
| **5 Advisor-e Steps / Staircase** *(proprietary framework)* | — | — | ✅ now extracted → `advisory-staircase.json` (Phase 1, 2026-06-08). Own framework file, **not** a `logic_trees` entry |
| 3 Pill Financial Management | `three_pill_fin_mgt` ✓ | ✗ | support PDF not yet extracted |
| Cash Tactics | `cash_tactics` ✓ | ✗ | support PDF not yet extracted |
| Client Planning | `client_planning` ✓ | ✗ | support PDF not yet extracted |
| Lite Feasibility | ✗ (no `lite_feasibility` tree) | ✗ | neither extracted |
| Org — CA Capacity Planner | ✗ (no tree) | `org-capacity-planner-domain-support.json` ✓ | no tree — logic PDF mislabelled "Support" in the Logic folder (may be a phantom) |
| People Power | ✗ (no `people_power` tree) | `people-power-domain-support.json` ✓ | no `people_power` tree |

*JSON outside this table:* the domain-level supports `profit-`, `data-systems-`, `forecasting-`, `sales-marketing-`, `strategy-domain-support.json` belong to the 14 domains (not method PDFs), so they don't appear above. **This Part 2A table is the *method* inventory, not the complete JSON inventory.**

---

## Part 3 — The Decision Pipeline (Client function — a 7-stage loop)

> Applies to the **Client function** only. The old registry had 6 linear stages, with Stage 3 = "Routing Groups / Solution Categories". **Routing groups are dead and removed.** More importantly: the pipeline is **not linear — it is a closed loop.** Stages 6–7 capture what really happened and feed it back to improve Stages 1–5 next time. The feedback loop is part of the pipeline, not an add-on.

```
        ┌──────────────────────────────────────────────────────────────┐
        │  feedback tunes the building blocks that drive Stages 1–5      │
        ↓                                                                │
Stage 1 — Conversation & Signal Capture                                  │
          Advisor answers questions; system captures info through the 4 lenses.
               ↓                                                         │
Stage 2 — Primary Issue Classification                                   │
          System identifies the specific structural problem.            │
               ↓                                                         │
Stage 3 — Strategy Resolution                                            │
          Engagement type, complexity ceiling, template budget, sequencing.
               ↓                                                         │
Stage 4 — Template Selection                                             │
          Scores/ranks Do-the-Job templates; AI relevance-gates the pool.
               ↓                                                         │
Stage 5 — AI Narrative                                                   │
          AI writes the advisor-ready recommendation. (Delivered to advisor.)
               ↓                                                         │
Stage 6 — Capture & Review                                               │
          Advisor saves the case study + records, after delivering to the client,
          what actually happened (post-delivery review).                │
               ↓                                                         │
Stage 7 — System Improvement ────────────────────────────────────────────┘
          Strong cases promoted to coaching reference; firm manager edits
          distinctions / weights / logic. The system is now better for next time.
```

**The loop is the system.** Stages 1–5 produce a recommendation; Stages 6–7 turn each real session into improvement — without code (Governing Principles P1 + P2). The loop's components are tracked in the Master Asset Table (Part 2); full narrative in Part 9.

Cross-cutting (not a stage): the **invisible HOW-swap** can re-point the AI from advisory (`client.txt`) to coaching (`learn.txt`) mid-conversation when the advisor asks HOW to use a tool (Part 8).

---

## Part 4 — The 4 Lenses

Discovery is viewed through 4 lenses, captured in Stage 1 and consumed in Stages 3–4. *(Absent from the old registry entirely — this is core operating logic.)*

| Lens | Captures | Determines |
|---|---|---|
| **1. Situation** | what happened, priority issue, issue drivers, downstream effects, timeframe | template **topic + sequence** |
| **2. Client Acumen** | growth-curve scale + owner awareness / desire / acumen | **engagement type + complexity ceiling** (acumen can push complexity above the growth-curve ceiling) |
| **3. Relationship Dynamics** | strength/history of the advisor-client relationship | **how** the engagement is delivered + **how many** templates (1–3 weak, 3–5 strong) |<<MIke: this is largely sorted by the droptab shoiwing level of current engagement against the 5 stairs in advisory staircase>>
| **4. Advisor Capability** | advisor skill / experience / confidence / willingness to stretch | whether templates are **in-reach or a stretch** (low capability → Education unless advisor opts to stretch, which removes the constraint) |

**Two orthogonal AI layers** (original design intent):
- **Detection layer** — WHICH templates are relevant (logic trees + keywords + signals)
- **Lens layer** — HOW to apply them (decision matrices + branch logic directing the AI)

### Lenses in practice

One worked example per lens, then one combined case threading all four — grounded in the real engine mechanics (Stages 3–4).

**Lens 1 — Situation** *(→ topic + sequence)*
> Advisor: *"Client runs a café. Profit's been flat two years even though sales are up. They tried discounting; it didn't work."*
> Reads → priority issue = profit plateau; driver = margin erosion (sales up but profit flat points to cost/price, not volume); tried-and-failed = discounting. → **Determines:** topic = **Profit** domain; sequence = diagnose margins *before* any growth play; discount-led templates down-weighted (Q14).

**Lens 2 — Client Acumen** *(→ engagement type + ceiling)*
> Advisor: *owner-operator, early-growth, "doesn't really read their numbers," and didn't raise the issue themselves.*
> Reads → low awareness/desire; client did **not** request help. → **Determines:** engagement forced to **Education**; the revenue-model reveal runs as **Cautious Reveal** (don't open the model in meeting 1); ceiling stays low unless acumen pushes it up.

**Lens 3 — Relationship Dynamics** *(→ how delivered + how many)*
> Advisor: staircase droptab at **Step 2** (early relationship); 2 meetings planned; 60-min sessions.
> Reads → weak/early relationship → foundational ceiling (blocks Strategic/Specialist/Governance/External); budget from meetings × session length. → **Determines:** **1–2 templates only**, paced gently; heavyweight tools hidden.

**Lens 4 — Advisor Capability** *(→ in-reach vs stretch)*
> Advisor: experience low, confidence low, but writes *"happy to give it a go."*
> Reads → confidence = low, but stretch-willingness = **true** (matches the stretch phrase). → **Determines:** a low-confidence advisor would normally be capped at Education, but the stretch flag **removes that constraint** — the domain's natural engagement is allowed and experience-required tools stop being penalised.

**Combined — all four on the café case**
> Situation → **Profit** domain, margins-first sequence · Acumen → **Education**, Cautious Reveal · Relationship (Step 2) → **foundational** ceiling, **1–2** templates · Capability (low but stretching) → constraint lifted, focused tool allowed. **Result:** one or two foundational profit/margin templates, taught gently, model introduced only once the concept lands.

---

## Part 5 — The 14 General Questions → 4 Lenses

Verified against the `QUESTIONS` array in `server-middleware/advisor.js`. The **Weight** column is the future Firm-Manager control surface (today influence is hard-coded across `strategyResolver`, `templateResolver`, and regex in `advisor.js`).

| # | Question | Primary lens | Also informs | Drives | Influence | Weight |
|---|---|---|---|---|---|---|
| 1 | Opening situation | Situation | — | topic + sequence; primary-issue seed | Primary | _tbd_ |
| 2 | Did the client raise it? | Client Acumen | Relationship | awareness/desire → engagement (Trial Fit vs Cautious Reveal) | Strong | _tbd_ |
| 3 | What contributed + downstream | Situation | — | cause routing (internal/external) → domain; downstream templates | Primary | _tbd_ |
| 4 | Disambiguation (tie only) | routing | Situation | resolves domain tie | Conditional | _tbd_ |
| — | Industry | Situation | — | topic suitability + industry relevance gate | Strong | _tbd_ |
| 5 | Ownership (private/NFP/listed) | Client Acumen | — | scale/type; NFP/listed skips Growth Curve | Moderate | _tbd_ |
| 6 | Growth Curve stage | Client Acumen | — | scale → fee sensitivity + complexity ceiling | Strong | _tbd_ |
| 7 | Advisory Staircase | Relationship Dynamics | sets complexity ceiling | relationship depth → comprehensiveness + count | Strong | _tbd_ |
| 9 | Advisor experience | Advisor Capability | — | in-reach vs stretch | Moderate | _tbd_ |
| 10 | Advisor confidence | Advisor Capability | — | capability gate (low lowers ceiling unless stretch) | Strong | _tbd_ |
| 11 | Advisor enjoyment | Advisor Capability | — | tailors tools to advisor | Minor | _tbd_ |
| 12 | Meetings planned | Relationship Dynamics | — | template budget (count) | Strong | _tbd_ |
| 13 | Session length | Relationship Dynamics | — | templates-per-session → budget | Moderate | _tbd_ |
| 14 | What client already tried | Situation | — | down-weights failed approaches | Strong | _tbd_ |

Multi-lens (need a weight *per lens* later): **Q2** (Client Acumen + Relationship), **Q7 Staircase** (Relationship + complexity ceiling). Q4 / primaryIssue / domainConfirmed are routing mechanics, not lens questions.

**On the Weight column.** There is **no numeric per-question weight table in code today** — each question's influence is encoded as the scattered scoring point-values and gates documented in Stages 3–4 (e.g. domain subSection +2, strong primary-issue match +3, modeling-declined −50, the confidence/stretch gates). The qualitative **Influence** column above is therefore the current **baseline expert calibration** — frozen as the as-built behaviour. The numeric **Weight** column (`_tbd_`) is the **editable target**: a future Firm-Manager control (per-lens sliders) exposing this calibration for adjustment without code.

---

## Part 6 — The 3 Template Categorisation Axes

**Axis 1 — User Intent** (`menuSection`). Only ONE is client-facing:
| menuSection | Used for | In client selection? |
|---|---|---|
| `do-the-job` | advisory delivery to the client | **Yes — the only pool scored** |
| `get-the-job` | advisor learning (sales/marketing/facilitation/presentation) | No — Learn/Discover modes |
| `get-organised` | advisor planning, career dev, team learning, firm logistics | No — Plan/Course/Firm modes |
*(Enforced in `templateResolver.js`: eligible filter excludes get-organised + get-the-job.)*

**Axis 2 — Engagement Type** — Education / Facilitation / Advice. Derived in Stage 3; signals both topic complexity and delivery style / required relationship dynamics.

**Axis 3 — Template Complexity** (`subSection`, within Do-the-Job).

> **Authoritative source:** `_Do the Job Content headers.pdf` (root) — defines each tier, its engagement type, and the advisor level it suits. Machine-readable form: the `section` values in `content-summaries.json`. These tiers are not to be guessed — this PDF is the canonical definition.

| Complexity tier | Underlying Advisor-e section / `subSection` | Engagement type | Advisor level |
|---|---|---|---|
| Client On-Boarding | Client On-Boarding | engagement-securing | all |
| End of Year Content | EOY Notes & Docs | engagement-securing | all |
| Growth Fundamentals Framework | Growth Framework | engagement-securing | all |
| Revenue & Feasibility Models (74+ industry models) | Revenue & Feasibility Models | Education | younger / building confidence |
| General Tools | General | Education | younger / building confidence |
| Lite Fundamentals | Lite Fundamentals | Education + Facilitation | experienced, unsupervised |
| Strategic Tools | Strategic Tools | Facilitation | experienced, complex concepts |
| Specialist Tools | Specialist Tools | Advice | experienced, complex concepts |
| Governance Tools *(Risk Management included — Mike-confirmed)* | Governance / Board Pack | Facilitation + Education + Advice | experienced, complex concepts |

*Source note: the PDF labels the last tier simply "Governance Tools" mapping to the "Governance / Board Pack" section. "(Risk Management included)" is Mike-confirmed, not in the PDF.*

Excluded from the model: `Help` (learning guide, never client-facing); `Reporting` and `External Advisors` (parked, ignored for now); `Firm Manager Access` / `Risk Advisor Access` (app plumbing).

---

## Part 7 — Stage Detail

### Stage 1 — Conversation & Signal Capture
- **What:** captures the advisor's description and converts it into structured info across the 4 lenses.
- **Capture methods:** constrained selectors (preferred), rule-based extraction, sparing AI extraction (signals only).
- **Assets:** `domains.json` (domain detection + domain questions), `signal-dictionary.json`, `growth-fundamentals.json` (Growth Curve), `fin-mgt-table.json` (droptab), `section-descriptions.json`. Questions live in `advisor.js` QUESTIONS array.
- **Live:** ✓ running. **Editable in Firm Mgr:** ✗.
**Constrained selectors → lens + edit status** (verified against `advisor.js` QUESTIONS + `VirtualAdvisor.vue`)

| Selector (token) | Question / field | Lens | Drives | Editable in Firm Mgr |
|---|---|---|---|---|
| Growth Curve `[GROWTH_CURVE_SELECTOR]` | Q6 `growthStage` (skipped if NFP/listed) | **Lens 2 — Client Acumen** | scale → fee sensitivity + complexity ceiling | ✗ (options hard-coded in `VirtualAdvisor.vue`; framework not wired) |
| Advisory Staircase `[STAIRCASE_SELECTOR]` | Q7 `advisoryStaircase` | **Lens 3 — Relationship Dynamics** | relationship depth → complexity ceiling + comprehensiveness/count | ✗ (steps hard-coded in `VirtualAdvisor.vue`) |
| Session Length `[SESSION_LENGTH_SELECTOR]` | Q13 `advisorSessionLength` | **Lens 3 — Relationship Dynamics** | templates-per-session → template budget | ✗ |
| Fin-Mgt Theme `[FIN_MGT_THEME_SELECTOR]` | forecasting `finMgtTheme` | **Lens 1 — Situation** | client's financial-management starting point → forecasting topic/sequence | ✅ wired to single-source `fin-mgt-table.json` (2026-06-11); the hard-coded `finMgtThemes` copy is gone |

Note: the Growth Curve, Staircase, and Fin-Mgt option content is now read from single-source JSON in `VirtualAdvisor.vue` (`growthStages` ← `growth-fundamentals.json`, `staircaseSteps` ← `advisory-staircase.json`, `finMgtThemes` ← `fin-mgt-table.json`); the former hard-coded in-component copies are all removed (last one, Fin-Mgt, reconciled 2026-06-11).

**Conversational intake — the 14 + free conversation (verified 2026-06-10).** The per-domain question *battery* has been removed: intake is the 14 general questions plus the advisor's free-text description — the diagnostic battery fields are skipped (`BATTERY_FIELDS` / `_battery` in `advisor.js`). Two adaptive mechanics now shape what is asked and captured:
- **Prep-mode (the advisor hasn't met the client yet).** When the opening description trips `detectNotMetClient` (and is not overridden by an explicit "already met" phrasing), the system offers **once** to *"skip the questions about them and just prep what you can answer now."* On acceptance, the six **client-about** questions — `clientRaisedIssue`, `situationDiagnostic`, `clientAlreadyTried`, `industry`, `ownership`, `growthStage` (`PREP_SKIP_FIELDS`) — are skipped; each gets a `'skipped'` sentinel so the Phase-3 mandatory-answer gate passes **honestly** (recorded as *intentionally absent*, not lost), and Stage 5 is told to frame the output as pre-meeting preparation. The advisor/relationship questions (staircase, experience, confidence, enjoyment, meeting count, session length) are **kept** (Mike, 2026-06-10). The 14 are never skipped to jump to recommendations — prep-mode trims only the unanswerable subset (memory `design-intake-resistance-fallback`).
- **Meeting-count voice-safe parsing.** `parseMeetingCount` folds spoken forms into the template-budget input ("too"→2, "a couple"→2, "a few"→3; bare "to" excluded; a range takes the upper bound) so a speech-to-text slip can't silently halve the budget — a live "too" once cut a 2-template session to 1.

**Data questions — resolved (verified 2026-06-06):**
- **`domains.json` = 22 live domains, not legacy.** The original 14 plus 8 newer (stock-purchasing, raising-capital, fm-coach-culture, org-firm-strategy, org-capacity-planner, org-leadership, org-board-pack, people-power). All 22 carry rich detection keyword sets (≈190–240 each) and are wired into the engine (`DOMAIN_NATURAL_ENGAGEMENT` in `caseState.js`, `DOMAIN_SUBSECTION_MAP` in `templateResolver.js`). The 8 newer ones have **no domain-specific follow-up questions yet** — they run on the general 14-question flow. No `get-*` ids exist in `domains.json` (that premise was wrong). All domains are equal-priority; "14" was the original count, since extended to 22.
- **`signal-assignments-draft.json` = a draft staging artifact, not live.** Output by `scripts/generate-signal-assignments.js` (Phase 1 of the content feedback loop). Not loaded by any server runtime — the live signal path is `signal-dictionary.json` + `semantic-profiles.json`. Keep as a generator draft; not wired.

### Stage 2 — Primary Issue Classification
- **What:** identifies the single primary issue (the structural problem the engagement addresses).
- **Assets:** `primary-issues.json` (the canonical per-domain list), `logic_trees.json` (42 trees, currently dormant fallback).
- **Live:** ✓ — the primary issue is **inferred** from problem-signals + domain (the cold selector was removed from intake 2026-06-10). **Editable in Firm Mgr:** ✗.
- **Full domain detail — all 14 domains — is preserved in [Part 7A](#part-7a) below** (harvested verbatim from the old registry; Mike-authored Workshop 1 + Workshop 1.5 normalization; the genuinely good asset).
- **How primary issue is derived (today) — the cause-signal lever (verified 2026-06-10).** The cold `[PRIMARY_ISSUE_SELECTOR]` card has been **removed from intake** (`primaryIssue` field is `skip: () => true` in `advisor.js`); the advisor no longer hand-classifies. The primary problem is instead **inferred from `problemSignals`** — regex-matched from the advisor's *cause* text by `extractProblemSignals`. That cause text (`causeText()` in `caseState.js`) is the advisor's "what contributed + downstream effects?" answer (`situationDiagnostic`) **plus** their answer to the cause-first domain check-in (`domainConfirmed`) — so a correction the advisor makes *at the check-in* finally steers selection. **These `problemSignals` are the dominant scoring input** (≈77% of the score, via the Stage-4 semantic-profile match); the confirmed **domain alone is worth only ~1–2 points**. A plain "yes, that's right" matches no dictionary phrase, so it changes nothing — the lever only moves when the advisor says something signal-bearing (uncovered gaps are logged `[signal-miss]` for `signal-dictionary.json` review). The trees' live consumption is unchanged: the 14 `mode: learn` trees feed Learn-mode + deep-dive coaching, and the 28 diagnostic trees stay a **rarely-hit Stage-4 fallback** (zero-candidate case only — see Part 2 + Stage 4). So "dormant" here means *fallback-only*, not disconnected.
- **⚠ DESIGN DEBT — the conversational propose→confirm step (P2; cold card already removed 2026-06-10).** The disliked pick-from-a-list card is **gone** from intake, but the *positive* half of the redesign is not built: a system-led step that **proposes** the single most likely primary issue *with a one-line reason* and asks the advisor to confirm or reframe in their own words (the same propose→confirm pattern as the domain step, conversational, no menu), still mapping to a canonical Workshop-1 primary issue (Part 7A) so Stages 3–4 stay auditable. Today the gap is filled by **silent inference** (the cause-signal lever above) with no explicit primary-issue confirmation. **Build task — not yet done.**

### Course-correction safeguards (Principle P2 in practice) *(spans Stages 1–2)*
Three built mechanisms keep the advisor in control and catch a wrong read early (verified in `advisor.js` + `VirtualAdvisor.vue`):
- **Cause-first domain confirmation** — after the situation is described, the pipeline always asks the advisor to confirm before continuing (`domainConfirmed` → `[DOMAIN_SELECTOR]` card). The message is now **cause-first** (`buildDomainConfirmationMessage`): it reflects back the *driver* the advisor described and its main knock-on effect — anchored to the problem-signal the engine actually extracted — *then* names the detected area, and asks whether the **driver** is right (not just the label). This fixes the old "you weren't listening" read, where the system confirmed only the surface domain label and went off-line with the advisor (memory `design-cause-first-not-problem-first`). Two guarded variations: if the advisor sounded **unsure** (`detectUncertainty`, conservative — "I think"/"probably" don't count), it runs an **uncertainty-gated dig-in** asking them to pin the single biggest driver rather than confirm a shaky read; if they were confident but no signal matched, it trusts them and logs `[signal-miss]`. The AI line is validated (`_isValidConfirmation`) and falls back to the old deterministic line on any failure, so behaviour is identical when the AI is unavailable. The advisor confirms or corrects, and `onAnswer` sets `detectedDomain` to their choice; their wording is also folded into the cause text that drives selection (Stage 2 cause-signal lever).
- **Contradiction detector** — every advisor answer is tested against `_CONTRADICTION_PATTERN` (negation / dismissal / redirect — "none of these", "that's not the issue", "wrong area"). On a hit the pipeline pauses and asks a domain-specific check; capped at **2 per session** (`courseCorrections < 2`) so it can't loop.
- **"None of these fit" escape** — the domain-confirmation selector offers a `__none_of_these__` sentinel (`noneOfTheseApply` in `VirtualAdvisor.vue`); the server resets `detectedDomain` / `domainConfirmed` / `primaryIssue` + disambiguation state and invites a free-text redescription. *(Previously hung off the primary-issue selector, which is no longer part of intake.)*

Together these deliver P2: *more precision must never cost fewer check-ins.*

### Stage 3 — Strategy Resolution

**What:** deterministically converts the lens readings into a strategy: *engagement type, complexity ceiling, template budget, sequencing.* Pure function — same inputs always give the same output. **Code:** `strategyResolver.js`. **Live:** ✓. **Editable in Firm Mgr:** ✗ (target: Strategy table).

**Inputs → which lens each comes from**

| Input field | Lens | Source |
|---|---|---|
| `client.requestedHelp` | Lens 2 (Relationship/awareness) | `client_awareness === 'client_raised'` |
| `complexityCeiling` | Lens 3 (Client Acumen / staircase) | `staircaseToCeiling(staircase)` |
| `advisor.confidence` + `advisor.stretchWillingness` | Lens 4 (Advisor Capability) | confidence signal + free-text stretch regex |
| `domain` | — | natural type via `DOMAIN_NATURAL_ENGAGEMENT` |
| `constraints.templateBudget` | session constraints | `template_budget` signal |

**Rule 1 — Engagement type** (Education / Facilitation / Advice)

| Condition (checked in order) | Result |
|---|---|
| Client did **not** request help | `education` |
| Advisor confidence `low` **and** not willing to stretch | `education` (sets `advisorConstraintApplied`) |
| Otherwise | domain's **natural** type |

Domain natural types: **Education** — profit, data-systems, forecasting, stock-purchasing, raising-capital. **Facilitation** — staff, sales-marketing, governance, strategy, systems, conflict, eoy (+ org/people domains). **Advice** — valuation, risk, succession, due-diligence, org-firm-strategy.

**Rule 2 — Complexity ceiling** (staircase only, independent of engagement type)

| Staircase step | Ceiling |
|---|---|
| 1–2 | `foundational` |
| 3–4 | `analytical` |
| 5 | `strategic` |

**Rule 3 — Template budget:** `templateBudget` from constraints, default **1**.

**Rule 4 — Sequencing:** `education` → `education_first`; otherwise `standard`.

**Firm-override layer:** any of `engagementType`, `complexityCeiling`, `templateBudget`, `sequencingRule` supplied by the firm overrides the computed value. `advisorConstraintApplied` is never overridable (it records what happened).

**✅ Intervention Urgency — WIRED 2026-06-23.** `caseState.client.urgency` (`high`/`medium`/`low` via `deriveUrgency`) is now a named **non-overridable** Stage-3 output (`strategyResolver.js`). On `high` (cash crisis / partner dispute / live deal / covenant breach), a tested `urgencyDirective` (`advisorEngine.js`) injects a directive into the Phase-3 recommendation prompt: **lead with the single most critical move + flag the time-pressure (AI-phrased)**. **Note — the original "compress sequencing + cut template count" target was changed by Mike's ruling (2026-06-23): the template count is UNCHANGED** (he chose ordering + framing only); `sequencingRule` was inert (no consumer) so it was not the lever. Trigger coverage is currently governance/risk only — broadening it is a logged follow-up in `design/ACTIONS.md`. *Source:* build 2026-06-23.

**Plain language:** Stage 3 answers *"how should we engage, how deep can we go, and how much do we hand over?"* — without picking the actual templates yet (that's Stage 4).

### Stage 4 — Template Selection

**What:** deterministically scores and ranks the client-facing ("Do-the-Job") templates, produces a diverse candidate pool, and hands it to the AI relevance gate. Pure function — no AI calls inside, same inputs always give the same ranking. **Code:** `templateResolver.js` (`SCORING_VERSION = '2.1.0'`). **Assets:** `semantic-profiles.json` (per-template problem "fingerprints", pre-built by `scripts/build-semantic-profiles.js`), `advisory-distinctions.json` (+ firm distinctions), the relevance gate (R17 in `client.txt`). **Live:** ✓. **Editable in Firm Mgr:** distinctions ✓ (built); scoring weights / profiles ✗.

> **Plain-English walkthrough** (keep — the engine in advisor language)
> By Stage 4 the engine already knows the **domain**, the confirmed **primary issue**, and the Stage 3 **strategy** (engagement, depth, budget). Its only job here is to pick the actual templates — like a librarian told the topic, now choosing the right few tools off a shelf of ~130.
> 1. **Throw out what's not allowed.** Remove non-client templates, advisor-admin shelves, and anything **above the relationship ceiling** (the staircase rule — heavyweight tools stay hidden for new relationships). That ceiling is the *only* hard cut-off; engagement type never bins a template, it only nudges scoring.
> 2. **Score every survivor.** Points for fitting (right shelf, words echoing the primary issue, and above all a strong match to the *problem fingerprint*), minus points for contradicting (client doesn't need modelling → revenue-model tools effectively removed; client already runs reports → reporting tools penalised). Out-of-domain noise is silenced, and four domains (risk, valuation, conflict, due-diligence) ignore loose wording entirely.
> 3. **Rank, break ties, cap.** Highest score wins; ties go to the **more focused** template, then a fixed ID order so the result is never random; keep only as many as the template budget allows.
> 4. **Two answers, not one.** The whole thing runs twice — "best possible" (ceiling ignored) and "best that fits now" (ceiling kept). When they differ, the advisor sees **both cards**: the ideal tool and the one that fits the current client relationship.

**Step 1 — Hard filters.** (a) Eligibility: the pool is the **do-the-job** set (excludes the `get-organised` / `get-the-job` advisor-development sections by `menuSection`). **`includedInClient` was REMOVED as a gate (2026-06-18)** — it only governs client self-serve visibility, not advisor recommendability, so dropping it widened the recommendable pool to ~208 templates. (b) Staircase **complexity ceiling** (`CEILING_BLOCKED`) blocks subSections above the relationship level (foundational blocks Strategic/Specialist/Governance/External; analytical blocks Specialist/External; strategic blocks nothing). **Engagement type is never a hard gate** — soft scoring only.

**Step 2 — Scoring (additive points + penalties).**

| Signal | Condition | Points |
|---|---|---|
| Domain subSection — primary / secondary | matches `DOMAIN_SUBSECTION_MAP` (1st / later entry) | +2 / +1 |
| Primary-issue keyword — strong / partial | ≥2 / exactly 1 keyword hits across tags + purpose | +3 / +1 |
| Advisory distinction boost | firm-configured boost for this template title | + (1–20) |
| Solution category — tag / purpose hit | category keyword in tags / in purpose only | +3 / +1 each |
| Semantic profile match | Σ (profile strength × signal count × 2.0 × signal weight) | variable |
| Purpose fallback (no profile) | 1.5 × signal weight per matched signal (one per signal) | variable |
| Engagement subSection — primary / secondary | `ENGAGEMENT_SUBSECTION_PREFERENCE` (1st / later) | +2 / +1 |
| Advisor confidence — match / boost | low-conf + new-advisor shelf / high-conf + experience shelf | +1 |
| Growth stage exact | client growth stage == template growth stage | +2 |
| **Penalty** — modeling declined | advisor declined modelling **and** Revenue & Feasibility subSection | **−50** (effectively excludes) |
| **Penalty** — reports already in use | client uses reports regularly **and** Reporting subSection | −4 |
| **Penalty** — advisor confidence mismatch | low-conf + experience-required shelf | −1 |

**Signal attenuation (`DOMAIN_SIGNAL_SCOPE`).** In-domain signals weight **1.0**; out-of-domain signals weight **0** (excluded, not just reduced — rollback constant `outOfDomainWeight: 0.33` exists if soft attenuation is ever wanted). Four domains map to an **empty scope** (risk, valuation, conflict, due-diligence) → all free-text signals suppressed; these run on structured questions only. A domain absent from the map gets no filtering. **Single-sourced (2026-06-18):** `DOMAIN_SIGNAL_SCOPE` + the purpose-fallback now read from the signal dictionary (was a drifted hand-copy that omitted `revenue_modelling` from profit). **Industry now scores** — a wrong-industry template is held back; and a distinction can target a revenue-model **group** (`@rf-industry` / `@rf-general`) auto-matched to the client's industry.

**Where the dominant signals come from (cross-ref Stage 2).** The signals feeding the **semantic-profile match** above are the `problemSignals` extracted from the advisor's *cause* text — `situationDiagnostic` **plus** the cause-first check-in answer (`domainConfirmed`), via `causeText()`. They are the dominant scoring input (≈77%), which is why the cause-first confirmation matters here: a correction at the check-in re-derives these signals and re-ranks the templates, whereas the confirmed domain alone moves the score only ~1–2 points (memory `design-cause-first-not-problem-first`).

**Step 3 — Rank, tie-break, cap.** Keep only `score > 0`, then sort:

`score DESC → profileRichness ASC → page-id ASC (deterministic)`

The second key prefers the **more focused** template (lower total profile strength = more narrowly authored = preferred). **Note:** a previously stale header comment that read "profile richness *descending*" was corrected to "ascending (focused-wins)" to match the code; the code is and always was authoritative. Then cap to `templateBudget` (default 1) → `selected`.

**Candidate pool.** Beyond the capped selection, a diverse pool is built for the AI: each subSection capped at 3 entries, total `MAX_CANDIDATES = max(8, budget × 4)`, so the AI sees representation across shelves rather than one subSection monopolising the slots. `scoringLog` retains the top 20 for auditing.

**Two-pass / two-card output (`resolveTemplatesWithOutlier`).** Runs `resolveTemplates` twice: **Pass 1 "primary"** with `ignoreCeiling: true` (best match regardless of staircase), **Pass 2 "withinRange"** with the ceiling enforced. `hasOutlier` = the two top picks differ; `fallbackExists` = at least one within-range template found. This is what powers the *ideal vs fits-your-range* two-card recommendation.

**⚠ Relevance gate (R17, interim).** After scoring, an AI relevance gate in `client.txt` drops candidates that don't genuinely fit. It slightly crosses the "deterministic engine selects, AI only narrates" boundary — accepted as a stopgap until the scoring model matures, then to be retired.

### Stage 5 — AI Narrative
- **What:** AI writes the recommendation from the pre-selected templates + case summary + content.
- **Assets:** `data/prompts/*.txt`, `content-summaries.json`, ~25 `*-domain-support.json`, ~13 `*-reference.json`, `coaching-reference.json`.
- **Live:** ✓ running. **Editable in Firm Mgr:** ✗.
- **Prompt assembly (the final AI call).** System = `client.txt` (protected) + language instruction. The session is replayed as a short conversation: (1) **context message** (`buildClientContext()`) — the eligible template list (≤25, excl. get-organised/get-the-job, + firm templates) + content-summaries for the pre-selected templates + the domain-support "how to approach it" text; (2) the canned **opening**; (3) **situation brief** — domain, engagement type (+ delivery context), template budget, the Stage-5 copy directives (`_copySignals`: Trial Fit/Cautious Reveal, reports status, price communication, problem focus), the two-card **outlier context**, the **pre-scored Stage-4 candidates** (with IDs), the **collected answers**, and a profile note — ending "Now produce the recommendation." Model `gpt-4o-mini`, `max_tokens 2500`, streamed. *(Two-card output documented in Stage 4; course-correction safeguards after Stage 2.)*

**Revenue-model delivery method — Trial Fit vs Cautious Reveal.** When a revenue/profit model is in play, Stage 5 injects a *how-to-reveal* directive into the AI prompt. This is **not** a Stage 3 engagement-type decision — it is a delivery instruction, gated by two advisor answers (parsed in `advisor.js`): did the **client raise** the issue (`clientRaisedIssue`), and would the client **benefit from a revenue-model review** (`reviewYes`).

| Condition | Method | Directive to the AI |
|---|---|---|
| Client raised it **and** review agreed (`clientRaisedIssue && reviewYes`) | **Trial Fit** | Introduce the model in stages. |
| Advisor noticed (client did **not** raise) **and** review agreed (`!clientRaisedIssue && reviewYes`) | **Cautious Reveal** | Establish the concept before opening the model. Do **not** open the model in meeting 1. |
| Review not agreed (`reviewYes` false) | — | No revenue-model delivery directive emitted. |

Both methods also have detailed **learn-mode coaching references** — `trial-fit-reference.json` and `cautious-reveal-reference.json` — formatted into the learn-mode prompt via `LEARN_REFERENCE_FORMATTERS` in `logicTrees.js`.

**Plain language:** the engine has already decided *what* to recommend; Trial Fit / Cautious Reveal decide *how gently* to put a revenue model in front of the client based on whether they asked for help.

### Stage 6 — Capture & Review *(closes the loop)*
- **What:** advisor saves the session as a case study, and after delivering to the real client records what actually happened (post-delivery review).
- **Code/assets:** `utils/cases.js` (capture — localStorage), review panel in `VirtualAdvisor.vue`.
- **Live:** ✓ (localStorage; DB migration pending). **Full detail:** Part 9.

### Stage 7 — System Improvement *(closes the loop)*
- **What:** strong reviewed cases promoted to coaching reference; firm manager edits distinctions / weights / logic. The adjusted building blocks drive Stages 1–5 better next time.
- **Code/assets:** `coaching-reference.json` (promote), `advisory-distinctions.json` (+ DB), Firm Manager.
- **Live:** distinctions ✓ editable; coaching promote ✓; rest ⚠ target. **Full detail:** Part 9.

---

<a id="part-7a"></a>
## Part 7A — Stage 2: Primary Issue Registry (all 14 domains)

> Harvested verbatim from the old registry. Every item authored by Mike Barnes in Workshop 1 (2026-06-02); normalised in Workshop 1.5; flags resolved 2026-06-03. This is the canonical primary-issue map — the foundation of Stage 2. Do not lose or paraphrase.

### The Two-Stage Test (what qualifies as a primary issue)
- **Test A — Engagement start:** Can an advisor begin an engagement on this issue alone? If yes → primary issue. If no → it's a Symptom (routes elsewhere) or a Context (overrides strategy).
- **Test B — Intervention pathway:** Does it drive a *distinct* intervention from other issues in the same domain? If yes → separate primary issue. If no → it's a diagnostic contributor that accumulates under a broader one.

### Status legend
Locked = domain-expert confirmed · Reclassified — S = Symptom (routes to another domain / probes for cause) · Reclassified — Ctx = Context (overrides Stage 3 strategy) · Relocated = moved to the domain that better handles the intervention.

---

### Domain 1: Profitability & Feasibility
**Purpose:** Is the business generating sufficient profit and is the model financially viable? Routes to cost, pricing, revenue, feasibility interventions.

**Primary issues (Locked):**
1. Cost of sales has increased *(split from "Cost Structure" — distinct from fixed overheads)*
2. Excessive discounting eroding margin
3. Sales Revenue *(renamed from "low sales volume pulling profit down")*
4. Fixed overhead costs grown beyond what revenue can support *(split from "Cost Structure")*
5. Asset utilisation below viability threshold

**Reclassified:** Finance strain → Symptom (routes to Domain 5 Financial Management). · Asset realisation / venture extraction → Context (strategy override).
**Key resolution:** "Cost Structure" was an AI-generated merge of two distinct issues (cost of sales vs fixed overheads). Split + restored. Mike confirmed.

---

### Domain 2: Staff
**Purpose:** Right people, right roles, right capability, managed well. Routes to workforce, training, management, hiring.

**Primary issues (Locked):**
1. Too few qualified staff
2. Inexperienced or insufficiently trained staff *(current-staff capability gap)*
3. No internal training structures *(structural absence of a training system)*
4. Poor management practices — weak communication, feedback and formal discipline *(items 4+5 merged — three components of one engagement)*
5. Roles and responsibilities poorly defined
6. Weak hiring practices

**Key resolutions:** Items 2 vs 3 confirmed distinct (immediate gap vs structural system). Items 4+5 merged. Item 6 distinct. Mike confirmed.

---

### Domain 3: Data
**Purpose:** Reliable data, right lead/lag indicator mix, sound capture. Routes to data capture, integrity, reporting.

**Primary issues (Locked):**
1. No enforceable data capture methods *(process/system problem)*
2. Poor data integrity *(technology problem — manual input errors; software/apps/devices)*
3. Too much lag indicator data, not enough lead indicators *(type of data)*
4. Narrow data spread *(breadth of data — financial only vs operational/activity)*

**Relocated:** Lack of financial controls → Domain 6 (Governance) — financial authority is a governance decision, not a data problem.
**Key resolutions:** Items 1 vs 2 distinct (process vs technology). Items 4 vs 5 distinct (type vs breadth). Mike confirmed.

---

### Domain 4: Sales & Marketing
**Purpose:** Effective sales process, defined target market, competitive products, strong positioning.

**Primary issues (Locked):**
- **Sales Execution** *(items 5+6 merged — no visible sales process + poor sales training)*
- **Marketing Foundation** *(items 7+8+10 merged — who you say it to + what you say + when/how often)*
- **Product Market Fit** *(items 2+3 merged — product fit + competitiveness)*
- **Poor positioning or brand perception**

**Reclassified:** Low sales volume → Symptom (cause set by Q3 + domain questions). · Supply line disruptions / quality → Relocated to Domain 8 Systems.
**Note:** Domain 4 is the only domain the old registry took to routing groups (now dead). Its 4 primary issues stand; the routing-group layer is dropped.

---

### Domain 5: Financial Management
**Purpose:** Owner's financial understanding + soundness of cost base and debt structure. Routes to financial education, cost restructuring, debt management.

**Primary issues (Locked):**
1. Poor financial literacy *(owner focused on wrong numbers)*
2. Over-trading *(deliberate risk position — debt-funded growth; needs funding strategy)*
3. Cost structure imbalance *(knowledge gap — doesn't know real costs due to poor data/accounting)*

**Reclassified:** Artisan-over-commercial mindset → Symptom (probes for cause: literacy / pricing confidence / founder identity).
**Key resolution:** Over-trading vs cost-structure-imbalance confirmed distinct (deliberate risk vs knowledge gap). Mike confirmed.

---

### Domain 6: Governance & Leadership
**Purpose:** Effective leadership, sound decisions, financial authority controls, deliberate culture, balanced team.

**Primary issues (Locked):**
1. Poor boardroom dynamics or partner/owner disputes
2. Lack of financial controls *(relocated in from Domain 3)*
3. Poor decision quality *(skills/methodology gap — structured frameworks e.g. 6 Hats)*
4. Weak communication of expectations with no documentation *(social/cultural — coded behaviour, weak chairmanship)*
5. Culture left to chance *(values/behaviour design)*
6. Personality and skill diversity not actively pursued *(specialist — personality types e.g. DISC)*

**Key resolutions:** Items 2 vs 3 distinct (skills gap vs social/cultural). Items 4 vs 5 distinct (culture design vs personality specialism). Mike confirmed.

---

### Domain 7: Strategy & Planning
**Purpose:** Viable model, clear measurable objectives, communicated direction.

**Primary issues (Locked):**
1. Lack of clarity or belief that the current business model will remain competitive
2. Poor business metrics or undefined operational objectives *(absence of metrics)*
3. No defined objectives means no communicated direction *(absence of communicated direction)*

**Note:** No flags. Items 2 and 3 closely related but kept separate — different interventions (metrics vs direction).

---

### Domain 8: Systems
**Purpose:** Defined, reviewed, integrated operational processes — internal coordination + external supply chain.

**Primary issues (Locked):**
1. Processes are either undefined or over-engineered
2. No regular structured review of practices
3. Siloed operations
4. Supply line disruptions or poor quality controls *(relocated in from Domain 4 — operational failure; Sales handles the commercial consequence)*

**Note:** No flags. All renames straightforward.

---

### Domain 9: Valuation
**Purpose:** Positioned to support a credible, defensible valuation for sale/partnership/financing.

**Primary issue (Locked):** **Transaction Readiness** — collapses all four original items (inconsistent earnings, unsubstantiated assets, inflated stock/WIP, goodwill assumptions). All accumulate inside one advisory objective; none drives a separate pathway. When active, strategy restricts selection to valuation/sale-prep templates only.

---

### Domain 10: Risk Management
**Purpose:** Systematic process to identify, assess, mitigate risk.

**Primary issue (Locked):** **Risk Framework** — collapses all three original items (no identification process, over-reliance on insurance, poorly defined assessment). Same engagement regardless of which symptom presents: design + implement a risk framework.

---

### Domain 11: Succession Planning
**Purpose:** Viable succession pathway; personal/family barriers resolved; meaningful life beyond the business.

**Primary issues (Locked):**
1. Owner Purpose & Status *("Identity" replaced with "Status" per Workshop 1)*
2. Sibling or family inequality
3. No clear succession pathway

**Reclassified:** Business scale/profitability insufficient for clean transition → Symptom (routes to Profitability or Financial Management — succession reveals it; intervention lives where the financial issue lives).

---

### Domains 12–14 — Context Domains
These produce **no primary issues**. They describe the *type of meeting*, not a business problem. When active, the context **overrides Stage 3 strategy** and restricts template selection.

- **Domain 12 — Conflict Meetings** → `meetingContext = conflict`. Advisor is mediator, not diagnostician. Strategy override: **facilitation templates first**. Applies only when the meeting is explicitly called for conflict resolution.
- **Domain 13 — End of Year Meetings** → `meetingContext = compliance`. Challenge = convert compliance meeting into value-add. Strategy override: **education + compliance templates first**.
- **Domain 14 — Due Diligence** → `meetingContext = transaction`. Advisor supports buyer/seller through a live deal. Strategy override: **due-diligence templates only** — no operational/advisory templates while a transaction is active.

---

## Part 8 — Cross-cutting: The Invisible HOW-Swap
In `advisor.js` (post-recommendation): regex detects HOW-phrasing + tool reference → silently swaps system prompt `client.txt` → `learn.txt`, re-evaluated per message. Documented in `virt-advisor-system-design.md` Section 4. **Live, client mode, post-recommendation.** ⚠ TO MAP: confirm whether it should also fire in discover mode and pre-recommendation.

---

## Part 9 — The Improvement Engine (Feedback Loop, Case Studies, Firm-Manager Editing)

This is how the system gets better **without code** — the realisation of Governing Principles P1 (editable) and P2 (real sessions over rigid weights). It is arguably the point of the whole system. *(Absent from the old registry entirely.)*

**Loop status:** the foundation is built — capture ✓, post-delivery review ✓, promote-to-coaching ✓, and Advisory Distinctions editing ✓. Fully *closing* the loop still needs the case-study **DB migration** plus bringing **14-question weights / strategy / logic editing** under Firm Manager (see item 4 + ⚠ TO MAP below).

**The loop that closes the system:**
```
Guided session (Client function)
   ↓ advisor saves it
Case Study  (transcript + recommendation + session context)
   ↓ after delivering to the real client
Post-Delivery Review  (what went well / less well / changes recommended)
   ↓ firm manager promotes the strongest cases
Coaching Reference  (curated real cases the AI draws on)
   ↓ + firm manager edits Advisory Distinctions / weights / logic
Improved recommendation on the next session
```

**1. Case Study capture** — `utils/cases.js`. Saves transcript, mode, domain, recommended templates, staircase/growth/fin-mgt selections, summary, visibility (shared/private). The "Record a quick observation?" intake captures fresh post-session notes. **Built — now server-side (2026-06-22):** saves via secured `/api/cases` (`firmAuth`, identity from the JWT — closes the `cases.js` IDOR), with a two-way **private↔shared** toggle and a one-time localStorage→DB migration, so "shared" cases are genuinely firm-wide and follow the advisor across devices. `va_case_studies` table (`config/db-schema.sql`); dev uses a gated JSON fallback until MySQL is provisioned. This is **step (a)** of the case-study feedback loop.

**2. Post-Delivery Review** — after the advisor delivers to the real client: *what went well / what went less well / changes recommended for similar cases*. Captures what **actually happened** vs what was recommended. Built (review panel in `VirtualAdvisor.vue`).

**3. Promote to Coaching Reference** — firm-manager-only action; promotes a strong reviewed case into `coaching-reference.json` (15 curated entries) which the AI references in future sessions to show pattern recognition. Built (promote button, gated to firm-manager role).

**4. Firm-Manager editing — the no-code control surface** — where the firm adjusts the system from what real sessions reveal. **Advisory Distinctions is live + editable today**, now as a full **mentor→firm→advisor cascade** (edit / decline / **move to another domain**, effective-list resolver, cross-domain near-miss bridge, "Why this recommendation" decision-trace panel) — the proof of concept for the whole model. Remaining building blocks (logic trees, 14-question weights, strategy table, coaching content — see Part 2) are the targets to bring under the same editing.

**Principle restated:** improvement is **data + configuration, not code**. If improving an outcome requires a code change, that signals a structural problem — escalate it, don't patch. *(See [[content_feedback_loop]], [[feedback_design_philosophy]].)*

*(The live/editable status of each loop mechanism is in the Master Asset Table, Part 2 — not repeated here.)*

**Design goals — auditability (target, not yet built).**
- **Decision Trace** — every recommendation should be able to emit a full trace: the primary issue (+ why), which lenses fired and with what weights, the templates considered vs selected with their scores, and any coaching-reference influence. Makes each recommendation auditable after the fact (covers the Stage 1–5 output).
- **Config versioning** — editable assets (distinctions, weights, logic, coaching content) should carry edit history, and each saved case study should be tagged with the **active config version** that produced it — so a past recommendation can always be audited against the configuration in force at the time.

**⚠ TO MAP:** ~~DB migration of case studies~~ ✅ **done 2026-06-22** (step a); the **manager case-review area** + manager-only one-click **"move it here"** (steps b + c of the feedback loop — see memory `design-case-study-review-team-dev`); wiring coaching-reference editing into Firm Manager; the case-study → suggested-distinction flow (turn a reviewed case directly into an editable distinction).

---

## Part 10 — Harvest / Migration Checklist (from old registry)

**SAFEGUARD RULE: harvest before retire.** ✅ **Done 2026-06-05** — the old file is now **archived (not deleted)** at `design/archive/virt-advisor-design-registry.ARCHIVED.md` with a do-not-use banner, plus `design/archive/README.md`. It is reference-only (Workshop-1 verbatim history); never authoritative, never merged. No code loads design `.md` files, so it cannot reach the running app.

| From old registry | Action | Done? |
|---|---|---|
| Stage 2 primary-issue domain tables (Domains 1–14) | KEEP → harvested into Part 7A | ✅ done |
| The two-stage test | KEEP → Part 7A | ✅ done |
| Context-domain overrides (Conflict/EOY/Due Diligence) | KEEP → Part 7A | ✅ done |
| Stage 3 — Routing Groups | DELETE (dead) | ✅ dropped |
| 4-Table Governance Model (Tables 1–4 as drawn) | DELETE (served routing groups) | ✅ dropped |
| Routing-group causal audit chain | DELETE | ✅ dropped |
| "Engineering panel confirmed" decoration | DELETE (noise) | ✅ dropped |
| Build-status tables ("not yet built") | CORRECT — Stages 2/4/5 run live today | ✅ corrected here |
| Full original-item + normalization-decision tables (verbatim long-form) | DO NOT COPY — distilled Part 7A is sufficient. No duplicating the same content a second way. | ✅ decided |

**Decision (Mike, 2026-06-05):** Keep only what's needed. Part 7A's distilled primary-issue map (purposes, locked primary issues, reclassifications, key resolutions) is the single record going forward — enough to drive and audit the system. The full verbatim Workshop original-item lists and row-by-row normalization tables are **not** carried forward into the live registry — they remain available in the archived file (reference only), so the *why* behind each split/merge is never lost but never competes as a parallel live record.

---

## Outstanding before this draft can be finalised

**Done so far:** asset inventory (Parts 2 + 2A) · logic-table/domain-support inventory · proprietary frameworks listed · Stage-2 primary-issue registry harvested · improvement loop integrated · structure ordered global→local.

**Still open:**
1. ✅ **DONE 2026-06-08 — all 7 non-Client app functions documented in Part 1A.** Discover (universal finder), Plan (advisor-facing get-organised-primary), Learn (advisor development; active home of the 14 coaching trees + HOW-swap target), Course (separate /api/course subsystem; progress is a Phase-2 stub), Progression (DB-backed tier dashboard; flagged IDOR gap → HANDOFF), Profile (cross-cutting personalisation; localStorage-only), Firm Manager (the secured no-code editing hub; reference impl for multi-tenant auth).
2. ✅ Stage 1 constrained selectors → lens + edit status — DONE (table in Stage 1 detail; Growth Curve→Lens 2, Staircase + Session Length→Lens 3, Fin-Mgt Theme→Lens 1; options hard-coded in `VirtualAdvisor.vue`).
3. ✅ Map each Part 2A logic/support pair → its extracted JSON — DONE 2026-06-08 (mapping rule + exceptions table in Part 2A). All 42 `logic_trees.json` trees accounted for; gaps flagged: 3 support PDFs unextracted (3-Pill, Cash Tactics, Client Planning), Lite Feasibility has neither, Capacity Planner + People Power are tree-less. The two frameworks (3 Engagement Types, 5 Advisor-e Steps) are now extracted to their own JSON.
4. ✅ Stage 3/4/5 detail — DONE. Stage 3 + Stage 4 (scoring/two-card), course-correction safeguards, Stage 2 primary-issue derivation (+ redesign-intent debt note), and Stage 5 prompt assembly all documented against verified code.
5. ✅ Data questions — DONE: `domains.json` = 22 live domains (14 original + 8 newer, all keyword-detected + engine-wired; 8 have no domain questions yet); `signal-assignments-draft.json` = draft generator artifact, not loaded at runtime.
6. **★ TOP PRIORITY — the 3 proprietary frameworks.** **Phase 1 (extract to editable JSON) ✅ done 2026-06-08:** Advisory Staircase → `advisory-staircase.json`; 3 Engagement Types → `engagement-types.json`; Growth Fundamentals already JSON (`growth-fundamentals.json`). All three were **wired 2026-06-09 (Phase 2 wiring ✅)** — every acceptance criterion is met: (a) *Growth* — the `VirtualAdvisor.vue` selector + `growth.js` detector now read `growth-fundamentals.json` (the 3-copy duplication is gone); (b) *Engagement Types* — **Option C done**: `DOMAIN_NATURAL_ENGAGEMENT` relocated to a per-domain `engagementType` field in `domains.json` (single source of truth); (c) *Staircase* — steps + complexity ceiling moved out of `caseState.js` / `VirtualAdvisor.vue` into `advisory-staircase.json`. **The remaining work is to surface the firm's *grading / tuning* around the frameworks in Firm Manager** (the framework **content** itself is platform-locked and NOT firm-editable — Mike 2026-06-11, P1; the Advisory Staircase complexity-grading editor is already built). Do not re-propose making the framework content editable. **Captured design notes:** `education-gates-ascent` (staircase — not wired), `domain-heuristic-vs-client-readiness` (engagement — as-built observation).
7. ✅ Final read-through done 2026-06-08 — front-section stale items cleared (reviewer note, Part 1 table + Type column, Part 2 framework status, nav, Part 1A added). **Ready to promote:** on approval, flip the STATUS banner DRAFT→official and remove the draft warnings (old registry already archived, not deleted — Part 10). Genuine open work stays flagged inline (framework Firm-Manager surfacing; loop DB migration; HOW-swap edge case).
