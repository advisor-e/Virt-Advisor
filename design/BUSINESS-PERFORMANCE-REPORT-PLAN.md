# Business Performance Report — Task & Design Notes

> **Purpose of this document.** The single running record of what we decide as we plan
> and design the Business Performance Report feature, plus the live **Task Board** below.
> Design/task notes only — the coding rules live in the app's Stack Constitution
> ([`../CLAUDE.md`](../CLAUDE.md)), which is the locked source of truth and always wins over
> anything here. Backlog line: [`ACTIONS.md`](ACTIONS.md) (P2 · BUILD/DECISION).
>
> **Status:** planning started. **Last updated:** 2026-07-09.
>
> **⚠ For the master coding team.** This is a **new, self-contained feature, in DESIGN only —
> no application code has been changed.** It is deliberately isolated on its own branch
> (`feat/business-performance-report`) and is **not part of the in-progress Virt Advisor →
> Advisory.com merge**. It becomes build work only after the design below is approved.

**Legend** — Priority: **P1** = do first · **P2** = next · **P3** = later.
Status: ☐ Not started · ◐ In progress · ⛔ Blocked · ✅ Done.

---

## 2. Task Board (live — prioritised)

The master to-do list. Every piece of work lands here so nothing gets left behind. We
update the Status column as we go; anything blocked says why in Notes.

| ID | Task | Category | Priority | Status | Notes / Depends on |
| --- | --- | --- | :---: | :---: | --- |
| T1 | Deconstruct the report mockup into a precise section-by-section spec (each section's inputs, metrics, layout, and narrative) | Design | P1 | ☐ | The mockup is the fixed target; this becomes the build spec |
| T2 | **Port each Excel model's calculation logic into a live backend calc engine** (inputs → outputs; editable variables → recalculated figures) — not just reference | Design | P1 | ◐ | Backend-only per stack; enables live editing (T17). **First model DONE (deconstruct + validate): `GE.3c.Working Capital Cycle model` — all 28 calc cells reproduced exactly.** Others to follow, by demand |
| T3 | Define the report **data model** — every figure the report needs, and where it comes from | Design | P1 | ☐ | Depends on T1 + T2 |
| T4 | Decide the **data-in approach** — dropped exported files vs. a live Xero API pull (or both) | Design | P1 | ✅ | RESOLVED 2026-07-09 — **files only**, no Xero API link (privacy-first, see §3) |
| T12 | Define the **privacy & data-handling model** — what data leaves the app, how it's minimised, and where AI runs | Design | P1 | ✅ | RESOLVED 2026-07-09 — option (a): anonymised figures only to backend AI; no client identifiers ever leave. See §3 / §6 Q2 |
| T13 | Design the **de-identification (scrubbing) step** — strip client names, ID numbers, bank account numbers, and any identifiers from dropped files before the AI step | Design | P1 | ☐ | The boundary that makes the privacy promise true; runs backend-only |
| T14 | **Review the Virt Advisor codebase** — map how pages/menu/nav, the AI engine, i18n, and auth work, to confirm exactly how the Report page plugs in | Design | P1 | ✅ | DONE 2026-07-09 — plugs in cleanly, no stack changes; integration map in §8 |
| T15 | Design the **AI "Virtual Coach" support** for report design (asks purpose/audience/how they'll communicate it; gives insight) | Feature (candidate) | — | ☐ | Reuse existing `VirtualAdvisor` pattern; ground it in `Dashboard Discussions.pdf`; scope (v1 vs fast-follow) TBD |
| T16 | Define the **launch / session hand-off** from Advisory.com's "client report button" into the Virt Advisor report page (how the button opens it + passes auth) | Wire (master-team) | P2 | ☐ | Needs master-team input / access to Advisory.com; see §6 Q7 |
| T10 | Design the **drag-and-drop file intake** — which reports, which file formats, and how they're read | Design | P1 | ☐ | Core UX; depends on T4 answer |
| T11 | Design the **Report Makeup Menu** — simple include/exclude buttons for each section & graph | Design | P1 | ☐ | The owner's "compose by clicking, no config" control |
| T17 | Design the **interactive modelling screen** — editable input variables, live recalculation, and the "beautiful, engaging" first visual | Design | P1 | ☐ | Depends on T2 engines; recalc round-trips to backend (Q8) |
| T18 | Design **PDF download / print** of the on-screen report | Design | P2 | ☐ | The PPTX mockup is the target look |
| T19 | Design the **education layer** — use the models (working-capital cycle, EBITDA, stock purchasing…) to teach financial concepts in the client conversation | Design | P1 | ☐ | The differentiator; draws on the AI coach's **diagnostic** logic (Logic Tables + Domain Support via `advisorEngine`), **NOT** the Course feature; + `Dashboard Discussions.pdf`, Virtual Coach (T15). Pin exact components in T21 |
| T20 | Design **editable / visible AI prompt templates per report type** (e.g. 3-way forecast) — default prompt shipped, accountant can view + edit; storage, versioning, editable-vs-locked-IP | Design | P1 | ☐ | Transparency + trust + education; see §6 Q9; respects prompt-safety + scrubbing rules |
| T21 | **Pinpoint the exact engine components** the report + education layer points to — the AI coach's diagnostic sections (`advisorEngine`), the `Logic Tables/` and `Domain Support/` data — vs. code-only reuse of `courseEngine` | Design | P1 | ☐ | Owner instruction 2026-07-09: "get quite clear which part of the app this engine points to." Do at engine-design time |
| T22 | **Catalogue the ~87 models** into a searchable index — fingerprint each (inputs / outputs / industry / purpose) | Design | P2 | ☐ | "Part A" librarian; bounded one-time job; feeds the matcher (T23) |
| T23 | Design the **conversational model matcher** — AI asks business type + problem, routes to best-fit model(s) | Design | P2 | ☐ | Reuse the app's existing semantic/diagnostic matching; see §3 "model library & AI matcher" |
| T5 | Define the **Business Health Score** method (how "78 / GOOD" is calculated) | Design | P2 | ☐ | Appears in Executive Summary |
| T6 | Define the **AI-insight** approach — what OpenAI writes, prompt design, and output validation | Design | P2 | ☐ | Backend-only; must validate LLM output per stack rules |
| T7 | Decide the **benchmark data** source (industry medians for the Benchmarks section) | Design | P2 | ☐ | External data — flag any privacy / licensing considerations |
| T8 | Decide the report **output format & delivery** (e.g. HTML→PDF, branded deck) | Design | P3 | ☐ | Affects how we render the final deliverable |
| T9 | Stand up the **Handover document** for the master coding team | Handover | P2 | ☐ | Deferred by decision — generated from these notes once decisions firm up (see §5) |

_When we move from design into build, coding tasks get added here with the same columns._

---

## 3. What the app is (agreed framing)

> A business-performance advisory tool: pull a client's financials (Xero, per the stack)
> → run them through the supplied financial models → present dashboards → generate the
> branded **Business Performance Report** with AI-written plain-English insights → and
> drive a structured advisor-client "dashboard discussion" that captures an action plan.

Confirmed by the product owner on 2026-07-09.

### Target user & core UX principle (owner's aim, 2026-07-09)

- **User:** accountants who are **not tech-savvy**. The app does the technical work for them.
- **Data in:** the accountant **drags and drops reports they've exported from Xero** —
  P&L, Balance Sheet, Inventory, and the like — into a folder. No live-connection setup.
- **Control:** a **"Report Makeup Menu"** — simple buttons to include or exclude specific
  graphs / sections. They compose the report by clicking, not configuring.
- **Guiding principle — zero tech, zero prompting (by default).** All the AI work and
  prompt-writing that a user would otherwise do by hand (e.g. in Claude) is hidden inside the
  app and runs automatically — the accountant never _has_ to write a prompt. **Refined
  2026-07-09:** this is a default, not a wall — they can **view and edit** the pre-prepared
  prompt behind each report if they wish (see "Transparent, editable AI prompts").

### Privacy-first positioning (owner's aim, 2026-07-09) — a core product principle

The app exists **for accountants who are worried about client-data privacy**. They:

- Are not comfortable linking their accounting system directly to another app.
- Do not want to deal with agentic AI.
- Do **not** have a commercial Claude plan and are uneasy about pasting client data into a
  consumer AI tool and how the provider may handle / share it.

**So the promise is: AI-quality insight on client financials without the accountant ever
pasting sensitive client data into a consumer AI tool.** How the app itself handles data —
what leaves it, if anything — is therefore central, not a detail. This becomes a first-class
design constraint (task **T12**) and must be spelled out plainly in the handover.

> **Data-in resolved:** **files only**, no live Xero API link (task T4). A direct API link
> is explicitly out of scope — other apps serve users who want that.

**Important clarification — personalised output, anonymised AI (2026-07-09).** The
anonymisation is _only_ about what is sent to the AI. The **final report is fully
personalised** — client name, accounting firm logo, branding — to look bespoke. The flow:

1. Identity (client name, ID/bank numbers) is **held locally** and scrubbed out before the
   AI step (task T13).
2. The AI writes the narrative from **anonymised numbers only**.
3. The app **re-assembles the finished report locally**, merging the AI narrative with the
   real client name, logo and branding that never left the app.

So identity stays inside the app; only numbers travel; personalisation is applied at final
assembly.

### Interactive modelling & live editing (owner's aim, 2026-07-09 — being confirmed)

The app is **more than "drop a file → static report."** The supplied Excel models become
**live calculation engines inside the app**:

- **Inputs are a combination:** seed figures (a dropped Xero report and/or manual entry)
  **plus live variable editing** — the accountant, sitting with the client, changes input
  variables to explore "what-if" scenarios and the figures update.
- **The first on-screen view is a beautiful, engaging, interactive screen** — not a static
  document. (Mirrors the `What If` / `Drag n Drop Dashboard` sheets in `Dashboard Reports_.xlsx`.)
- **Output:** download / print the result as a **PDF** (the PPTX mockup is the target look).
- **Build implication:** the models' formulas must be **re-built as calculation engines** in
  the app (task **T2** becomes core + sizeable). Per the Stack Constitution, calculations are
  **backend (Restify) only** — so live edits call the backend engine as values change
  (debounced). Confirm the recalc approach — see Q8.

### Differentiator — education-led advisory (owner's aim, 2026-07-09 — being confirmed)

The intended point of difference: **not "just another financial-performance reporting app."**
The reporting shifts toward **educating the client on financial concepts** — using a model
(e.g. the **working-capital cycle**, **EBITDA**, or the **stock-purchasing** model) as the
vehicle for an **educational conversation** with the client. The numbers are the way in;
teaching the concept is the value. This aligns naturally with the host app's identity (the **AI coach**), with
`Dashboard Discussions.pdf`, and with the Virtual Coach idea (**T15**).

> **Correction 2026-07-09 (owner):** the diagnostic intelligence to leverage is **NOT the
> Course feature** — Course is not the most developed logic. The refined understanding lives
> in the AI coach's **diagnostic sections** — the _"I've got a problem with a client"_ /
> _"I want to know more"_ flows — backed by the **Logic Tables** and **Domain Support**
> tables (`advisorEngine` + the `Logic Tables/` and `Domain Support/` data). `courseEngine` is
> at most a **code-structure template** for the plumbing, never the brain. Pin down the exact
> components at engine-design time (**T21**).

Likely reframes T5 / T6 / T15 around explanation, not just scoring.

### Transparent, editable AI prompts (owner's aim, 2026-07-09 — being confirmed)

Accountants should be able to **see — and edit — the instruction given to the AI** for each
report type. Example: producing a **3-way forecast** uses a **pre-prepared primary prompt**;
that prompt lives as an **editable template** (surfaced in-app, Advisory-style) that:

- **Ships as the default**, so the accountant needn't write anything (upholds "zero prompting").
- **Is visible and editable** — if the accountant disagrees with the instruction they can
  change it, so they feel they are **influencing the AI's interaction with the data**, not
  blindly relying on our engine. Builds trust with AI-wary users and reinforces the education
  angle.

**To decide (Q9):** where prompts are stored + **versioned**; whether editing is
per-accountant or per-firm; and **which prompts are freely editable vs. locked proprietary
IP** (the app already has "platform-locked" prompt IP, e.g. `plan.txt`'s frameworks). The
Stack Constitution's prompt-safety rules still apply to any edited prompt (delimit user data;
never concatenate raw client data; the scrubbing-before-AI step is unchanged).

### The model library & AI matcher (owner's aim, 2026-07-09 — feasibility discussed)

Owner has **~87 Excel models** (financial concepts + industry-specific revenue models). Vision:
one front interface where the AI asks the adviser **what type of business** and **what they want
to solve**, then **matches to the closest model(s)** and produces the right report — reusing
existing models so prepackaged issues aren't rebuilt each time.

**Feasibility (senior read) — two very different halves:**

- **Part A — "the librarian": catalogue the 87 models + a conversational matcher.** _Achievable,
  low-moderate risk._ A natural extension of the AI coach, which **already** matches free-text
  problems to templates/domains (domain detection, semantic profiles, signal maps, "Discover"
  search). Main new work = **cataloguing** each model (inputs / outputs / industry / purpose)
  into a searchable index — a bounded, mostly one-time job.
- **Part B — "the engineer": AI auto-builds a correct calc engine on the fly from any model.**
  _Hard + high-risk — the "asking too much" part._ Financial correctness is regulated; the Stack
  Constitution forbids trusting raw AI output and demands validated, auditable numbers.
  Auto-porting messy spreadsheet formulas unattended for client reports is a large, risky effort.

**Recommended framing:** a **smart librarian + assembler** over a **growing library of
pre-validated model-engines** — NOT an AI that writes new financial maths unsupervised. Port
models into validated engines **deliberately + by demand** (T2 scaled up; most-used first); once
ported + validated a model is reusable ("prepackaged, no rebuild"). The AI **selects and
assembles** report + narrative from validated building blocks; it **never fabricates the
calculations**. Captures the vision's value while keeping output correct and auditable.

### The three kinds of input we were given

1. **The target output — `Business_Performance_Report_Mockup.pptx`.** The polished,
   client-facing report we are aiming to produce. 10 sections: Cover · Contents ·
   Executive Summary (with a _Business Health Score_) · Financial Dashboard · P&L ·
   Balance Sheet · Cash Flow & Working Capital · Inventory · Benchmarks & Trends · Key
   Insights & Next Steps. **This is the spec for what the app produces.**
2. **The calculation engines — 9 Excel models.** The maths behind the report:
   - `Dashboard Reports_.xlsx` — core hub: API data in, monthly / yearly graphs, benchmarks,
     what-if, tax estimator, manual input.
   - `3 way Filter.xlsx` — 3-way projections (P&L, Balance Sheet, cash flow) + quick margins.
   - `High Level Budget.xlsx` / `Mid Level Budget.xlsx` — budget vs actual, cashflow variances.
   - `Sales Dashboard.xlsx` — sales reporting & mix.
   - `Volatility Report.xlsx` — 12/18/24-month volatility analysis.
   - `EBITDA Model.xlsx` — EBITDA, discounted cash flow, interest.
   - `Cost of Capital.xlsx` — WACC + Beta.
   - `Growth Pro.1a.Stock Purchasing.xlsx` — inventory / reorder optimisation.
3. **The advisory method — `Dashboard Discussions.pdf`.** The facilitation framework for the
   advisor-client conversation: the **3×3 model** (_Cause–Event–Effect_ × _Get Organised /
   Get the Job / Do the Job_ × _Fixed / Activity / Variable costs_) plus a per-metric
   discussion template. The _human layer_ that turns numbers into a recorded action plan.

### How it maps to the locked stack

- **Xero** → data in.
- **OpenAI (backend only)** → plain-English narrative, insights, and health-score commentary.
- **The Report** → the deliverable.

### Scope for v1

**We start with the Report generator** — data → models → the branded Business Performance
Report. Rationale: the mockup gives a fixed, unambiguous target; it exercises the full
data → models → AI-insight pipeline end-to-end; the dashboards and the discussion workflow
then reuse that same engine. Confirmed by the product owner on 2026-07-09.

**Interactive from the start (updated 2026-07-09):** v1's report is itself interactive —
live variable editing + recalculation on an engaging screen, then PDF download / print (see
"Interactive modelling" above). This pulls some "what-if" capability into v1, and the
**education layer** (see "Differentiator" above) is a lead design concern, not an add-on.

**Deferred (later phases):** the standalone interactive _dashboards_ feature (a drag-n-drop
dashboard builder / benchmark explorer as separate screens); the fully advisor-led discussion
workflow as its own app.

---

## 4. Decision log

| Date | Decision |
| --- | --- |
| 2026-07-09 | App framing agreed (see §3). |
| 2026-07-09 | v1 focus = **the Report generator**; dashboards and discussion workflow deferred. |
| 2026-07-09 | Adopt a live, prioritised Task Board (§2) as the master to-do list. |
| 2026-07-09 | Handover document deferred — generated from these notes once decisions firm up. |
| 2026-07-09 | Core aim recorded: non-tech accountants drag-and-drop exported Xero reports; a click-based "Report Makeup Menu"; zero prompting (AI hidden). See §3. |
| 2026-07-09 | **Data-in = files only**; no direct Xero API link (out of scope). |
| 2026-07-09 | **Privacy-first** is a core product principle — the app must avoid users pasting client data into consumer AI; how the app handles data is a first-class constraint (T12). |
| 2026-07-09 | **AI data policy = option (a):** anonymised figures only to the backend AI; **no client identifiers leave the app** (no names, ID numbers, bank account numbers). Backed by private-server hosting + AWS security. Requires a scrubbing step (T13). |
| 2026-07-09 | **Build topology = Path A:** build inside the existing **Virt Advisor** app as a separate page reached from a menu button, reusing its engine (i18n, AI backend, auth). |
| 2026-07-09 | **Host app confirmed:** `e:\Visual Code Projects\Virt Advisor` — verified as the app; its `package.json` matches the locked Stack Constitution exactly. Its own `CLAUDE.md` is the governing rulebook (same as the tech-stack doc). |
| 2026-07-09 | **T14 review complete:** Report plugs into Virt Advisor cleanly with **no stack changes**; reuse the existing "Course" AI-feature pattern. Full integration map in §8. |
| 2026-07-09 | **Entry point clarified:** launched from Advisory.com (master app) **existing "client report button"** — NOT from a button inside the AI coach (Virt Advisor) UI. The AI coach UI gets no new button; the AI engine/logic is shared behind the scenes. Supersedes the earlier "button in the AI coach header" assumption. Hosting mechanism = open Q7. |
| 2026-07-09 | **Q7 resolved = Option 1 ("Launch"):** report screen lives inside Virt Advisor; Advisory's button opens it and passes the session. All client data stays in one privacy boundary. Launch/hand-off mechanism to define with master team (T16). |
| 2026-07-09 | **Concept expanded (confirming): interactive modelling.** Excel models become live backend calc engines; accountant edits variables live with the client; engaging on-screen view; download / print PDF. Inputs = seed data + live editing. (T2, T17, T18) |
| 2026-07-09 | **Differentiator (confirming): education-led advisory.** Focus shifts toward teaching financial concepts (working-capital cycle, EBITDA, stock purchasing) via the models — not "just another reporting app." Aligns with the Course engine + Virtual Coach. (T19) |
| 2026-07-09 | **Transparency (confirming): editable / visible AI prompts.** Each report type ships a default prompt the accountant can view + edit; "zero prompting" refined to a default, not a wall. (T20) |
| 2026-07-09 | **Naming:** the host app (Virt Advisor) is referred to as the **AI coach**. |
| 2026-07-09 | **Engine-source correction (owner):** the report's diagnostic/education intelligence points at the AI coach's **diagnostic sections** — `advisorEngine` + **Logic Tables** + **Domain Support** — **NOT** the Course feature (Course = code skeleton only). Pin exact components at engine design (T21). |
| 2026-07-09 | **~87-model matcher — feasibility discussed.** Part A (catalogue + AI matcher) is achievable + reuses existing matching (T22/T23). Part B (AI auto-builds engines on the fly) is high-risk — **not** pursued. Recommended: a librarian/assembler over a **growing library of pre-validated engines**; AI selects/assembles, never fabricates the maths. Scope (north-star vs v1) = Q10. |
| 2026-07-09 | **Q10 resolved = validated-library, north-star, incremental.** Core report on key models first; grow the library + matcher over time; AI never auto-generates financial calculations. Adopt the safe build sequence in §9. |
| 2026-07-09 | **First slice = `GE.3c.Working Capital Cycle model`** (educational; cycle = Days Deliverable + Days on Hand + Days Receivable − Days Payable → Cycle Factor → revenue/profit). Deconstructed; reading confirmed by owner (Step 2). |
| 2026-07-09 | **Step 3 PASSED — correctness proof.** Independent re-implementation reproduces the spreadsheet's numbers **exactly**: all 28 calculated cells match. These 28 values are the **golden reference** for the future JS engine's tests. |
| 2026-07-09 | **Note:** this first model is **manual-input / educational** (illustrative numbers, no client data) → it does **not** exercise file-intake/scrubbing; those get proven by a later data-driven slice. |
| 2026-07-09 | **Brand tokens set** (owner) — Open Sans **Light**; palette Navy `#002B64`, Cyan `#00B1E0`, Sky `#7FD3F1`, Blue `#0070C0`, Pure blue `#0000FF`, Charcoal `#3A3A3A`; semantic Good `#4CA52D` / Caution `#FF9900` / Danger `#FF0000`. Full doc: `design/BRAND-TOKENS.md`. |
| 2026-07-09 | **First slice BUILT (walking skeleton)** on `feat/business-performance-report`: backend calc engine (`server/report/workingCapitalCycleModel.js`, 31 tests inc. 28 golden) + route (`server/routes/report.js`) + proxy + Nuxt page + `components/BusinessPerformanceReport.vue` (interactive wheel, brand tokens, Open Sans Light) + PDF via browser print. Adds "Set as starting point" (rebase baseline). Verified: lint clean, template compiles. Coach text templated (not AI). |
| 2026-07-09 | **UI: bold, consistent "hero band" (owner-driven).** Each report now opens with a dark navy→aqua gradient band — white numbers, bright-aqua labels, red/green for negative/positive — applied to all three mockups AND the app components. The Model Library launcher links to the local report files (opens from disk, bypasses artifact cache). Note: the claude.ai artifact viewer was caching stale views; local files (`design/mockups/*.html`) are the reliable preview. |
| 2026-07-09 | **Third model BUILT + validated: Margin · Mark-up · Break-even.** Combines `GE.Margin - Markup - Breakeven Calculator` + `Break-Even_` (Input + What-If-Price) — margin vs mark-up, break-even = (overheads + owner's drawings) ÷ margin, cost-of-sales %, and the what-if-price curve. `server/report/marginBreakevenModel.js` (9 tests, all golden), route `/api/report/margin-breakeven`, `components/MarginBreakevenReport.vue` + page. |
| 2026-07-09 | **UI polish (all models + launcher):** stronger brand-colour pass (key numbers pop blue, headers navy, hero tints, colour-coded library tags); a **Reset** button on every concept model (alongside WCC/Debtor freeze-baselines); mark-up shown as both ×  and %; Cost-of-sales % tile added to Margin. |
| 2026-07-09 | **Second model BUILT + validated: Debtor Business Drag.** Full monthly cashflow engine (`server/report/debtorDragModel.js` → `computeDebtorCashflow`) — all 12 month-end bank balances match the source (17 tests); route `/api/report/debtor-drag`; `components/DebtorDragReport.vue` + page. Full 5-stage debtor + 5-stage supplier profiles, editable GST, before/after overdraft chart, print-to-PDF. |
| 2026-07-09 | **Model Library browser** designed (`design/mockups/model-library-launcher.html`) — searchable / category-filtered, scales to the full ~80-model library; seeds the future AI matcher (T22/T23). |
| 2026-07-09 | **Rules captured (owner):** GST/VAT must be **editable** (multi-country); **never simplify or remove any element of a source model** without asking first. |
| 2026-07-09 | **Screen design APPROVED** by owner — interactive mockup at `design/mockups/working-capital-cycle-mockup.html`: left inputs, live results, and the animated **cash wheel** (Cash→Stock→Sale→Debtors) with fixed costs shown outside it (matches the original model's graphic). Coach text = **templated for first build**, AI enhancement later. |

---

## 5. Handover to the master coding team (to be built)

A dedicated handover document will summarise, in build-ready form, everything the master
coding team needs — conforming to the Stack Constitution. Scope and format to be confirmed
(see task **T9**). This section holds the pointer; the document itself will live separately
once we start it.

---

## 6. Open questions (worked one at a time)

- **Q1 — Data-in method.** ✅ RESOLVED 2026-07-09 — **files only**; no direct Xero API link.
- **Q7 — Where the report UI runs (hosting).** ✅ RESOLVED 2026-07-09 — **Option 1
  ("Launch")**. The report screen lives **inside Virt Advisor** — the UI, drag-drop,
  scrubbing and AI all in one privacy boundary; Advisory.com's existing "client report button" just
  **opens it and passes the session**. No screen is built into Advisory. **Follow-up (T16):**
  define the launch / session hand-off mechanism with the master team. _Caveat:_ Advisory.com's
  codebase has not been reviewed — the hand-off detail needs owner/master-team input or access.
- **Q5 — Dropped file format(s).** What does the accountant actually export from Xero — PDF,
  Excel (`.xlsx`), CSV, or a mix? The app's upload accepts **PDF only** today; supporting
  Excel/CSV is a flagged config change (`STORAGE.allowedMimeTypes`). Drives the file-reading
  design (T10) and the scrubbing step (T13). — _open, high priority — likely the next question._
- **Q6 — Report delivery mode.** Live-streaming text (like the chat) vs. one complete
  response returned at the end. Streaming is more work (SSE + reader loop); a single JSON
  response is simpler. — _open, decide during report engine design._
- **Q8 — Live-recalc architecture.** Per the Stack Constitution, calculations are
  backend-only (not in Nuxt). Live variable-editing therefore calls the backend calc engine
  as values change (debounced for responsiveness). Confirm acceptable, or whether any
  display-only lightweight frontend calc is wanted. — _open, decide during T2 / T17._
- **Q9 — Editable AI prompts.** For the visible/editable prompt templates (T20): where are
  prompts stored + versioned? Editing per-accountant or per-firm? Which prompts are freely
  editable vs. **locked proprietary IP**? — _open, decide during prompt / engine design._
- **Q10 — Scope of the 87-model matcher.** ✅ RESOLVED 2026-07-09 — **north-star, built
  incrementally** (validated-library approach). Safety principle confirmed: the AI
  **selects/assembles pre-validated engines and never auto-generates financial calculations**
  for client output. Build the core report on key models first; grow the library + matcher over
  time.
- **Q4 — Storage / repo layout.** _Confirmed shape (pending go-ahead to execute)._ Not one
  "perf" folder. **(1) Code** integrated into Virt Advisor's standard folders (`pages/`,
  `components/`, `server/`, `locales/`), namespaced. **(2) Design notes** →
  `design/BUSINESS-PERFORMANCE-REPORT-PLAN.md` in the Virt Advisor repo, with a BUILD line in
  `design/ACTIONS.md` (house "no silent parking" convention). **(3) Reference models**
  (Excel / PPTX / PDF) → `design/report-source-models/`. The `Perf Report` folder is
  **temporary staging** — copied in, verified, then retired with owner's go-ahead (nothing
  deleted before the move is verified). Sub-decision: commit the reference binaries to git
  (recommended — small, travels with handover) — owner's call, and committing/pushing is
  always the owner's decision.
- **Q3 — Build topology.** ✅ RESOLVED 2026-07-09 — **Path A: build inside the existing
  Virtual Adviser / AI coach app.** The Performance Report is a **separate page reached from
  a menu button** (not inside the coach chat), reusing the app's already-built engine —
  especially the i18n/language work, the AI backend plumbing, and auth. Built as a
  self-contained module so it doesn't disturb the finished / protected parts of the app.
- **Q2 — AI & the privacy promise.** ✅ RESOLVED 2026-07-09 — **option (a)**: anonymised
  figures only may go to the backend AI. **Privacy line:** no client identification leaves
  the app — no ID numbers, no bank account numbers, no client names. Acceptable because the
  main app is on a private server with AWS security protocols, and only de-identified numbers
  are sent. Requires a scrubbing step before the AI (task **T13**).

---

## 7. Parking lot

_Ideas to revisit later._

---

## 8. Integration map — how the Report plugs into Virt Advisor (from T14 review, 2026-07-09)

Verified read-only against the live code. **No changes to the locked stack are needed.** The
Report reuses the same engine the existing "Course" feature already uses.

**Key facts about the host app:**

- Routing is **file-based** — dropping a `.vue` file in `pages/` creates its route.
- There is **no global menu bar**; pages link to each other via inline buttons in the header
  of `components/VirtualAdvisor.vue` (the `.header-actions` block, ~line 45) — that's where
  the "Firm Manager" button lives and where the Report button goes.
- The AI engine pattern is: a backend engine file → a Restify route → a thin Nuxt proxy →
  the page calls it. `server/courseEngine.js` is the clean template to copy **for code
  structure only**.
- **Naming:** the host app (Virt Advisor) is referred to as the **AI coach**.
- **Where the intelligence is (owner, 2026-07-09):** the refined diagnostic logic lives in the
  advisor _"problem" / "want to know more"_ sections — `advisorEngine.js` plus the
  `Logic Tables/` and `Domain Support/` data — **not** the Course feature. `courseEngine.js`
  is only a clean code skeleton. Map the precise components at engine-design time (**T21**).
- The chat + markdown rendering is reusable, but `utils/markdownPreprocessor.js` and the
  `MarkdownIt` config are **locked — do not modify** (reuse by importing only).
- 8 languages in `locales/`; new strings go in a `report.*` namespace across all 8 files.
- Auth = backend `firmAuth` guard (real security) + a `localStorage` check in the page (UI
  gate). Copy the pattern from `pages/firm-manager.vue`.
- File upload uses `formidable`, but the allowed types are **PDF-only today** — broadening
  to Excel/CSV is a config change that must be flagged and approved (see §6 Q5).

**The plug-in map (new files vs. what they copy):**

| Concern | New file / change | Copy / reuse |
| --- | --- | --- |
| Route + page | `pages/business-performance-report.vue` (thin auth wrapper) | `pages/firm-manager.vue` |
| Entry point | **From Advisory.com's existing "client report button"**, which opens the Virt-Advisor-hosted report page and passes the session (Option 1). NO button added to the AI coach UI. Hand-off mechanism = T16 | — |
| UI component | `components/BusinessPerformanceReport.vue` (Pug, Options API, Buefy) | `CourseBuilder.vue` / VirtualAdvisor chat parts |
| Markdown | reuse `utils/markdownPreprocessor.js` + locked `MarkdownIt` config (unchanged) | VirtualAdvisor `renderMarkdown` |
| AI backend | `server/reportEngine.js` | **code skeleton** from `server/courseEngine.js` + `server/utils/openaiClient.js`; **diagnostic intelligence** from `advisorEngine` + `Logic Tables/` + `Domain Support/` (map in T21) |
| Route reg. | edit `server/restify-server.js` (`firmAuth` guard) | existing engine routes |
| Proxy | `server-middleware/report.js` + entry in `nuxt.config.js` (plain ES5) | `server-middleware/course.js` |
| File upload | formidable in the report route | `server/routes/firmManager.js` `uploadDocument` |
| i18n | add `report.*` to all 8 `locales/*.json`; import `localeMixin` for the picker | existing namespaces |
| Design notes | `design/BUSINESS-PERFORMANCE-REPORT-PLAN.md` + a line in `design/ACTIONS.md` | existing `-PLAN.md` docs |

**Host-app documentation conventions to follow once we move in:** `design/ACTIONS.md` is the
app's prioritised backlog with a strict **"no silent parking"** rule (every deferral must be
logged there); design docs use `SUBJECT-...-PLAN.md` / `-REPORT.md`; progress is recorded in
dated `SESSION-YYYY-MM-DD-NOTES.md` files. Our Task Board (§2) maps onto this.

---

## 9. Recommended build sequence (safe, prudent path — 2026-07-09)

Approach: **prove the whole pipeline on ONE model first (a "walking skeleton"), then grow the
validated library.** Every step is approval-gated; the finished / locked parts of the app are
never disturbed; all work happens on a feature branch.

1. **Lock the vision.** A consolidated play-back of the whole concept → owner confirms /
   corrects. Fast, and it prevents building the wrong thing.
2. **Pick the first slice.** ONE self-contained, high-value model + its report section, chosen
   to exercise the entire pipeline (recommend the **working-capital cycle** or **EBITDA** —
   both are in the education examples and map to a report section). Design just that slice:
   inputs, calc logic (T2), data-in (T10) + format (Q5), scrubbing (T13), AI narrative + prompt
   (T6 / T20), on-screen visual (T17), PDF (T18).
3. **Prove correctness on paper.** Confirm the ported engine reproduces the Excel model's
   numbers **exactly** before any build. Nothing ships until engine = spreadsheet.
4. **Build the thin slice end-to-end** on a feature branch, reusing the AI coach engine: file in
   → scrub → calc → one report section → AI narrative → engaging screen → PDF. Validated +
   tested to the stack's standards. Owner sees it working in the real app.
5. **Review + handover checkpoint.** Document what exists; owner sign-off; decide commit / push;
   loop in the master team.
6. **Grow the library.** Add the Report Makeup Menu (T11), more validated models, the matcher
   (T22 / T23), the education layer (T19), editable prompts (T20) — each added incrementally,
   validated, and approved.

**Safety rails (throughout):** feature branch only; every ported model validated against its
spreadsheet + tested; nothing goes to the AI until scrubbed; correctness is never delegated to
the AI; one step at a time with owner approval before any code; plain-English updates; regular
"save to GitHub?" checkpoints.
