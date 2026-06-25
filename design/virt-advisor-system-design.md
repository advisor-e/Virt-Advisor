# Virt Advisor — Complete System Design

**Version:** 2.0 — 2026-06-04
**Status:** Authoritative. Supersedes all prior design documents in this folder.
**Purpose:** Single reference for the complete Virt Advisor system — all components, all decision logic, all data flows, in the sequence they operate. Written to be understood by domain experts and engineers equally. External reviewers should read this document first.

---

## North-Star Vision

**Virt Advisor is a platform a firm makes its own.** The platform ships a strong shared base, but the lasting value — and the reason a firm pays for it — is that a firm can pour its own intellectual property into the system and have that IP reach its advisors automatically, without writing code. Four commitments sit at the heart of every design decision:

**1. A firm can add its own IP — and steer what its advisors are shown.**
A firm's managers (and the platform owner) teach the system their own advisory knowledge through plain-English editing screens, never code. Through **"distinctions"** — plain-English rules that influence template selection — a firm manager makes the engine surface the templates *they* judge best suited to **their staff and their client base**, not just the platform defaults. The platform base is a starting point a firm overrides and extends, never a ceiling. *Delivered by:* the layered-override model (reset to default any time), the Advisory Distinctions table, and the Firm Manager edit-targets.

**2. A firm controls its own template library — "the search table."**
The library of advisory tools the engine draws from is the firm's to shape. A firm edits its content upstream, exports it as JSON, and uploads it to its own account — with validation, version history, and one-click restore — so the firm's evolving library, not a fixed platform list, is what its advisors are matched against. *Delivered by:* the master-export lifecycle (per-firm storage, base → diverge) and the Firm Manager self-service upload.

**3. A firm's team finds its stuff effortlessly.**
Adding IP is only worth it if the firm's advisors actually get it at the moment they need it. Every piece of firm content — distinctions, overrides, templates, documents, videos — surfaces to that firm's advisors through the same single natural conversation, with no folder-hunting and no need to know where anything lives. The advisor asks; the firm's own IP answers. *Delivered by:* firm content flowing into the recommendation/scoring engine and the Discover (template search) mode, scoped to the firm.

**4. Real client work continuously sharpens the firm's system.**
A firm manager can **review real-world case studies** from their own advisors' sessions and feed what they learn straight back in — refining distinctions and template selection so the system keeps getting better at matching their staff and their client base. The improvement engine is the firm's own live work, not pre-emptive guesswork. *Delivered by:* the case-study-review → suggested-distinction loop and firm-level feedback capture. *(This makes design principle #3 concrete — real sessions, not pre-emptive patches, improve the system.)*

**Why this is the heart.** The shared platform makes Virt Advisor useful on day one. These four commitments make it *theirs* — and a firm's own IP, shaped by its own client work and reaching its own team automatically, is what turns a tool into a durable, white-labelable product. Every component supports firm-specific overrides on top of platform defaults; nothing is single-tenant. When a design decision is unclear, the test is simple: *does this make it easier for a firm to add its IP, control its library, get it to its team, and learn from its own client work?*

---

## 1. What Virt Advisor Is

Virt Advisor is an AI-assisted advisory preparation tool for accounting and business advisors. It has one core job: help an advisor prepare for a client meeting by identifying the right advisory tools (templates) and understanding how to use them.

It is **not** a client-facing tool. The advisor uses it privately before or between meetings. The client never sees or interacts with Virt Advisor directly.

The system has two distinct functions:
- **Diagnosis function** — identifies WHAT template is recommended and WHY (based on the client's situation)
- **Development function** — helps the advisor understand HOW to learn and deliver the recommended template

These two functions share a single conversation interface. The advisor never switches screens or modes manually — the system detects what they need and responds accordingly.

---

## 2. Component Map

### 2.1 Application Sections

| Section | User-facing name | Technical name | What it does |
|---|---|---|---|
| Guided advisory session | "I have a client situation" | Client mode | Diagnoses client situation, recommends templates, explains WHY |
| Template search | "I want to find a template" | Discover mode | Advisor searches for a specific template by concept or capability |
| Skill development | "I want to learn more" | Learn mode | Coaches the advisor on HOW to use and deliver advisory tools |
| Practice planning | "I want to plan ahead" | Plan mode | Helps the advisor plan their own practice development and fee growth |
| Course builder | "I want to build a course" | Course mode | Designs and delivers a personalised structured learning course |
| Progress tracker | "My Progress" | Progression view | Tracks the advisor's capability development across three tiers |
| Advisor profile | Settings / Profile | Advisor profile | Stores known facts about the advisor to personalise all interactions |
| Firm Manager | Firm Manager hub | Firm management | Platform-level administration, document library, decision framework overrides |

### 2.2 Server Components

| File | What it does |
|---|---|
| `server-middleware/advisor.js` | Core AI sequencer — handles all modes (client, discover, plan, learn). Single endpoint: `POST /api/advisor/query` |
| `server-middleware/course.js` | Course session facilitation — handles course design and session delivery |
| `server/utils/signals.js` | Extracts typed diagnostic signals from collected advisor answers |
| `server/utils/caseState.js` | Builds the structured case object (CaseState) from signals |
| `server/utils/strategyResolver.js` | Determines engagement type, complexity ceiling, template budget |
| `server/utils/templateResolver.js` | Scores and ranks templates deterministically — no AI in this step |
| `server/utils/domainSupport.js` | Loads domain knowledge reference files and formats them for AI context |
| `server/utils/summaries.js` | Loads template content summaries and formats them for AI context |
| `server/utils/templates.js` | Loads and filters the template library |
| `server/utils/logicTrees.js` | Loads diagnostic logic trees — trees emit signals, not template names |
| `server/utils/problemSignals.js` | Extracts free-text signals from advisor's situation description |
| `server/routes/activity.js` | Progress tracking — logs sessions and course completions, returns tier data |
| `server/routes/firmManager.js` | Firm management endpoints — documents, framework overrides, videos, profile |

### 2.3 UI Components

| Component | What it does |
|---|---|
| `VirtualAdvisor.vue` | Main conversation interface — all modes, message stream, selectors, header |
| `CourseBuilder.vue` | Course design and session delivery interface |
| `AdvisorProgression.vue` | Progress dashboard — advisor self-view and firm manager team view |
| `FirmManagerHub.vue` | Firm manager administration hub |

### 2.4 Data Files

| File | What it contains | Used by |
|---|---|---|
| `data/templates.json` | All 278 templates — title, section, subSection, purpose, tags, page ID, includedInClient flag | templateResolver, templates.js |
| `data/semantic-profiles.json` | Signal weight maps per template — auto-generated from content summaries and purpose fields | templateResolver (scoring) |
| `data/content-summaries.json` | Rich per-template content: indicators, helpsOwner, helpsAdvisor (41 templates have this) | summaries.js → Phase 3 AI prompt |
| `data/domains.json` | 14 domain definitions — keywords, disambiguation patterns, domain-specific questions | advisor.js (domain detection + question pipeline) |
| `data/logic_trees.json` | Diagnostic branching trees. **Design intent:** emit *signals* at terminal nodes (signals age slowly — Principle 7). **As-built (2026-06-23):** trees emit template *names* (client trees) and coaching *text* (learn trees) — no `signals` field exists yet. Two schemas: node-based (`nodes[]`) and `flat_if_then` (`branches[]`). The "harvest judgment into signals" programme is closing this gap toward the intent — do NOT re-spec the intent to match the drift. | logicTrees.js (learn-mode reference + client soft-hint + zero-candidate fallback) |
| `data/signal-dictionary.json` | Pattern vocabulary for free-text signal extraction | problemSignals.js |
| `data/*-domain-support.json` | Domain knowledge reference material (one file per domain) — tools, guidance, if-then logic | domainSupport.js → AI prompt injection |
| `data/prompts/client.txt` | System prompt for client (guided advisory) mode | advisor.js Phase 3 AI call |
| `data/prompts/discover.txt` | System prompt for discover (template search) mode | advisor.js |
| `data/prompts/learn.txt` | System prompt for learn (skill development) mode | advisor.js (including invisible mid-conversation swap) |
| `data/prompts/plan.txt` | System prompt for plan (practice planning) mode | advisor.js |
| `data/prompts/course-design.txt` | System prompt for generating course outlines | course.js |
| `data/prompts/course-session.txt` | System prompt for facilitating individual course sessions | course.js |
| `data/coaching-reference.json` | Coaching reference material injected into AI context | advisor.js (discover, learn modes) |
| `data/course-starters.json` | Four pre-built course templates (title, session count, colour) | CourseBuilder.vue |
| `data/course-quizzes.json` | Fixed quiz question overrides per session title | course.js |
| `search_content_[timestamp].json` | Master template export from Advisor-e master app — used for ghost reference validation only | logicTrees.js (startup validation) |

### 2.5 Template Library Structure

Templates are organised into three menu sections. The section determines which mode can use a template:

| Menu section | `menuSection` value | What it contains | Used in |
|---|---|---|---|
| Do the Job | *(no value — default)* | Client-facing advisory delivery tools shown during client meetings | Client mode only (`includedInClient === true`) |
| Get the Job | `get-the-job` | Advisor business development tools — sales process, positioning, prospecting | Learn mode, Plan mode |
| Get Organised | `get-organised` | Practice management and firm organisation tools | Plan mode |

**This separation is a hard architectural boundary.** "Do the Job" templates are never shown in Learn or Plan mode. "Get the Job" and "Get Organised" templates are never recommended to clients.

Within the "Do the Job" section, templates are further classified by subSection, which determines complexity level:

| subSection | Complexity | Typical use |
|---|---|---|
| General Tools | Foundational | Step 1–2 clients, education engagements |
| Lite Fundamentals | Foundational–Analytical | Financial literacy building |
| Reporting | Foundational–Analytical | Dashboard and report templates |
| Growth Framework | Foundational | Growth stage awareness tools |
| Revenue & Feasibility Models | Analytical | Industry-specific financial models (Google Sheets) |
| Strategic Tools | Analytical–Strategic | Strategic planning tools |
| Governance Tools | Strategic | Board and governance tools |
| Specialist Tools | Strategic | Valuation, succession, due diligence |
| External Advisors | Any | Collaboration pages for legal, finance, insurance |
| EOY Notes & Docs | Any | End of year meeting templates and document storage |

---

## 3. The Guided Facilitative Session — Client Mode

This is the core function of Virt Advisor. An advisor describes a client situation and receives a recommended set of advisory templates with a rationale for each.

### 3.1 The Six-Stage Pipeline

Every client session passes through six stages in sequence. Stages 1–5 are fully deterministic — no AI makes any structural decision. Stage 6 is where AI is used, but only to write the recommendation copy.

```
Stage 1 — Conversation & Signal Capture
         Advisor answers questions → structured signals extracted
              ↓
Stage 2 — Primary Issue Classification
         Signals → what is structurally wrong with the client's business
              ↓
Stage 3 — Routing Groups
         Primary issue → which pool of templates is relevant
              ↓
Stage 4 — Strategy Resolution
         Engagement type, complexity ceiling, template budget — all in code
              ↓
Stage 5 — Template Selection
         Score and rank within the routing group pool — no AI
              ↓
Stage 6 — AI Narrative
         AI writes the recommendation copy — no structural decisions
```

### 3.2 Stage 1 — Conversation and Signal Capture

#### The Question Pipeline

Every client session collects 13 universal data points plus domain-specific questions. Questions use three capture methods in priority order:

| Method | Description | Examples already working |
|---|---|---|
| Constrained selector | Advisor picks from defined options — no interpretation needed | Advisory Staircase (Step 1–5), Growth Curve, Session Length, Financial Management droptab |
| Rule-based extraction | Pattern matching on short typed responses | Detecting whether client raised the issue; detecting yes/no on reports |
| Free text → AI extraction | AI classifies one signal at a time from free text — temperature 0, enum output only | Opening situation description, contributing factors, what client has tried |

**The AI extraction boundary (formally locked):** AI extraction converts free text to structured signals only. It does not classify primary issues, select routing groups, or recommend templates. This boundary must not be extended.

> **Amendment (2026-06-25):** one deliberate, bounded extension is now permitted — an **AI topic-detection backstop**. When literal keyword matching finds no domain, the AI may classify the situation into one of the **existing 14 domains** (and read a distress flag for tone). It still does **not** select routing groups, recommend, rank, or substitute templates — template selection remains code-owned (Principle 4). The backstop is keyword-first (runs only on a keyword miss), boxed to the 14 ids, and logged. See §3.2 "AI semantic backstop".

#### The 13 Universal Questions

| # | Information collected | When asked | Method |
|---|---|---|---|
| 1 | Opening situation — what the advisor has observed | Always (opening) | Free text → AI extraction |
| 2 | Whether the client raised the issue themselves | Always | Rule-based |
| 3 | Contributing factors and downstream effects | Always | Free text → AI extraction |
| 4 | Disambiguation — when two domains score equally | Only on tie | Constrained question |
| — | Industry | Always | Free text |
| 5 | Business ownership (private / NFP / public) | Always | Constrained question |
| 6 | Growth stage (Growth Curve position) | Always unless NFP or public | Constrained selector |
| 7 | Advisory Staircase position | Always | Constrained selector (Step 1–5) |
| 8 | Advisor experience level | Skip if advisor profile pre-loaded | Free text |
| 9 | Advisor confidence in this domain | Always | Free text |
| 10 | Advisor enjoyment of this type of work | Skip if advisor profile pre-loaded | Free text |
| 11 | Number of meetings planned | Always | Free text |
| 12 | Session length | Always | Constrained selector |
| 13 | What the client has already tried and the outcome | Always | Free text → AI extraction |

Question 13 matters because if a client has already attempted an approach and it failed, the resolver down-weights templates that match that failed approach before scoring begins.

Question 3 matters because it distinguishes internal causes from external causes for the same presenting problem. Low sales volume caused by a poor sales process routes to Sales & Marketing. Low sales volume caused by a recession routes to Profitability.

#### Domain Detection

Domain detection runs continuously as the conversation progresses. All 14 domains are scored simultaneously against the advisor's words using keyword pattern matching. The highest-scoring domain is set as the active domain. If two domains score within a defined threshold of each other, a disambiguation question is triggered.

**AI semantic backstop (amended 2026-06-25 — keyword-first, AI fallback).** Keyword matching remains the **primary** domain driver — when it lands a domain, detection is fully deterministic and no AI runs. But literal keyword matching is brittle to wording: a crisis phrased as "gone to liquidation" or "shut their business down" matches none of the literal triggers ("facing liquidation", "shutting down"), so the session was mis-routed (live evidence, café-liquidation session, 2026-06-25). To close this without abandoning determinism, the keyword pass is **confidence-gated** (scenario-lab verified, 90% reachability over 50 cross-domain cases): a **confident** single keyword match (≥2 hits) is used as-is, no AI; a **tie** asks the advisor; a **thin** single hit (1 keyword) is low-confidence, so a single `gpt-4o-mini` classification weighs in — if it **agrees** the keyword stands, if it **disagrees** both are surfaced to the advisor (never a silent override of a possibly-correct keyword, incl. the deliberate crisis→profit routing); and when the keyword pass finds **no** domain at all, the AI maps the situation **by meaning** to one of the **existing 14** domains. In every case the AI cannot invent a domain or template — an off-list reply is rejected. The choice is logged on the decision trace (`domainSetBy: "ai"` / `"ai-disambiguation"`). Separately, a **universal distress read** runs every session (literal phrase-check first, AI meaning-read if that misses) so the sober crisis **tone** fires regardless of exact wording. This is the conscious, documented lifting of the former "topic detection is keyword-only" constraint — keyword-first, AI only as the safety net.

The 14 domains:

| # | Domain | Purpose |
|---|---|---|
| 1 | Profitability & Feasibility | Cost, pricing, revenue, and financial viability problems |
| 2 | Staff | Workforce, training, management, and hiring problems |
| 3 | Data | Data capture, integrity, controls, and reporting problems |
| 4 | Sales & Marketing | Sales process, marketing, product fit, brand problems |
| 5 | Financial Management | Financial literacy, cost structure, and debt problems |
| 6 | Governance & Leadership | Leadership, decision-making, culture, and governance problems |
| 7 | Strategy & Planning | Business model, metrics, and direction problems |
| 8 | Systems | Process design, review, integration, and supply chain problems |
| 9 | Valuation | Transaction readiness and valuation problems |
| 10 | Risk Management | Risk framework and mitigation problems |
| 11 | Succession Planning | Succession pathway, family dynamics, owner identity problems |
| 12 | Conflict Meetings | Context domain — mediator role, overrides strategy layer |
| 13 | End of Year Meetings | Context domain — compliance conversion, overrides strategy layer |
| 14 | Due Diligence | Context domain — transaction in progress, overrides strategy layer |

Domains 12–14 are context domains. They do not produce primary issues. When active, they override the strategy layer and restrict template selection to the appropriate template types.

### 3.3 Stage 2 — Primary Issue Classification

Primary issues are the specific structural problems each domain addresses. They were authored by the domain expert (Mike Barnes) in Workshop 1 (2026-06-02) and confirmed in Workshop 1.5. Every primary issue passed a two-stage test:

- **Test A:** Can an advisor begin an advisory engagement based on this issue alone?
- **Test B:** Does this issue drive a distinct intervention from other issues in the same domain?

Items that failed Test A are classified as Symptoms (they route to another domain to find the real cause). Items that failed Test B are classified as Diagnostic Contributors (they accumulate under a broader primary issue). Items that are not diagnostic problems at all are classified as Context (they override the strategy layer).

**Design status:** All 14 domains have locked primary issues. Stage 2 classification is designed but not yet built in code — primary issue does not currently appear as a named field in CaseState.

### 3.4 Stage 3 — Routing Groups

Each primary issue maps to one or two routing groups. A routing group is an internal classification code that restricts the template library to the relevant pool before scoring begins. Routing groups prevent cross-domain contamination — the live scoring failure confirmed in testing (May 2026) was caused by the absence of this layer.

Routing groups are **never shown to advisors**. They appear in the causal audit chain visible to firm managers and auditors only.

Naming convention: `RG_[CLASSIFICATION]` — noun classification, no verbs.

**Design status:** Domain 4 (Sales & Marketing) has complete routing groups. All other domains have primary issues locked but routing groups not yet designed. Workshop 2 will complete routing groups for all remaining domains.

Domain 4 routing groups (complete):

| Primary Issue | Routing Group | Code |
|---|---|---|
| Sales Execution | Sales Process | RG_SALES_PROCESS |
| Sales Execution | Sales Capability | RG_SALES_CAPABILITY |
| Marketing Foundation | Marketing Systems | RG_MARKETING_SYSTEMS |
| Marketing Foundation | Market Messaging | RG_MARKET_MESSAGING |
| Product Market Fit | Product Fit | RG_PRODUCT_FIT |
| Product Market Fit | Market Position | RG_MARKET_POSITION |
| Poor positioning or brand perception | Brand Strategy | RG_BRAND_STRATEGY |

### 3.5 Stage 4 — Strategy Resolution

Before any template is scored, the strategy layer determines how the engagement should be structured. All decisions are deterministic — no AI.

| Decision | Inputs | Rule |
|---|---|---|
| Engagement type | Growth stage, awareness level, staircase position | Education → Facilitation → Advice. Never reversed. |
| Complexity ceiling | Staircase position | Step 1–2 = foundational only. Step 3–4 = analytical. Step 5 = strategic. |
| Template budget | Session length × meetings | 30 mins = 0 templates. 60/90 mins = 1. 120 mins = 2. Capped at 3 total. |
| Advisor constraint | Advisor confidence rating | Low confidence → ceiling drops one level. Willing to stretch → constraint lifted. |
| Context override | Domains 12–14 active | Conflict → facilitation templates only. EOY → education templates. Due diligence → specialist only. |

**Engagement types:**

| Type | Meaning | When applied |
|---|---|---|
| Education | Client needs to understand before they can act | Early staircase, low awareness, new relationship |
| Facilitation | Advisor guides client through a process or decision | Mid staircase, moderate awareness |
| Advice | Advisor recommends specific actions | High staircase, established relationship |

**Code status:** `strategyResolver.js` exists and produces engagement type, complexity ceiling, and template budget. Connected to the live pipeline.

### 3.6 Stage 5 — Template Selection

The resolver filters the template library and scores candidates. No AI is involved at this stage.

**Hard filters (applied first — binary in/out):**

- `includedInClient === true` — only Do the Job templates are eligible
- `menuSection !== 'get-organised'` — Get Organised templates excluded
- `menuSection !== 'get-the-job'` — Get the Job templates excluded
- Template subSection not above the complexity ceiling
- Engagement type hard blocks: Education cannot include Specialist, Strategic, Governance, or Revenue & Feasibility Models (unless revenue_feasibility signal is active)

**Scoring (applied to eligible pool):**

| Score component | Points | What it rewards |
|---|---|---|
| Domain subSection match (primary) | +4 | Template subSection is the primary match for this domain |
| Domain subSection match (secondary) | +2 | Template subSection is a secondary match for this domain |
| Engagement type subSection preference | +2/+1 | Template subSection matches the engagement type preference |
| Semantic signal match | Variable | Template's signal profile matches active signals from the case |
| Out-of-domain signal | 0 (attenuated) | Signals from other domains do not contaminate scoring |

**Ghost name protection:** Every selected template is validated against `templates.json` before being passed to Stage 6. Any name not found in the library is rejected and logged. The AI at Stage 6 cannot invent or substitute template names.

**Code status:** `templateResolver.js` exists and is connected to the live pipeline. Currently scores all eligible templates without the routing group pre-filter (routing group layer not yet built). The out-of-domain attenuation is working and prevents cross-domain contamination.

### 3.7 Stage 6 — AI Narrative

The AI receives the pre-selected templates, their content summaries, a summary of the collected answers, and domain support reference material. It writes the recommendation copy only.

**What the AI cannot do at this stage:**
- Select templates not in the pre-selected list
- Substitute or rename templates
- Add templates not provided
- Change engagement type or sequencing
- Infer facts about the advisor or client not explicitly provided

**Prompt structure (client.txt):** Five structural rules only — all topic-agnostic. Domain-specific guidance is handled by the CaseState summary and domain support injection, not by topic-specific rules in the prompt.

**Output format per recommended template:**
- Why this fits your client
- Why this suits you as the advisor
- How to approach it (draws from domain support reference material)
- Suggested session plan
- What this typically leads to

**Code status:** Working. Phase 3 AI call fires after all Stage 5 selections are made. Post-recommendation conversation is handled by a separate AI call using the same session history.

---

## 4. The Invisible Mode Swap

This is one of the most important design features in the system. After a recommendation is delivered, the advisor continues the conversation in the same interface. They never switch screens or select a mode. The system detects what they need and swaps the AI's instruction set silently.

### 4.1 How It Works

After the recommendation is delivered, every follow-up message is tested against two patterns simultaneously:

**Pattern 1 — Intent detection (HOW signal):**
Phrases like "how do I", "walk me through", "teach me", "show me how", "how to", "help me understand", "explain"

**Pattern 2 — Tool reference:**
Words like "template", "tool", "framework", "it", "this one", "them", "these", "model", "approach", "method"

If both patterns match → the AI call uses `learn.txt` (the skill development prompt) instead of `client.txt`. The advisor receives practical HOW-TO coaching — step by step guidance, delivery approach, what to say to the client, how to open the session.

If one or neither matches → the AI call stays on `client.txt`. The advisor receives advisory rationale, alternative template suggestions, or engagement strategy.

**The swap is re-evaluated on every message.** If the advisor asks a HOW question, they get learn mode. If they then ask a WHY question, they get back to client mode. The conversation flows naturally without any visible transition.

### 4.2 What Each Prompt Brings

| Prompt used | What the advisor gets |
|---|---|
| `client.txt` | WHAT template and WHY — recommendation rationale, alternatives, engagement strategy |
| `learn.txt` | HOW to use it — step-by-step delivery coaching, what to say, how to introduce the template, frameworks within the tool, practical scripts |

### 4.3 The Post-Recommendation Guard

Both paths (client and learn) include a post-recommendation instruction that prevents the AI from restarting domain detection, asking discovery questions, or treating the follow-up as a new client situation. The advisor and the original recommendation context are preserved throughout.

---

## 5. Discover Mode — Template Search

Discover mode is for advisors who already know roughly what they want and need to find the right template for it.

**Opening question:** Advisor describes the concept, capability, or situation they have in mind.

**How it works:**
1. AI searches the template library and identifies the closest match
2. AI asks one clarifying question if needed (or uses the diagnostic logic tree for the relevant area)
3. AI confirms the match — ending every search response with "Is that what you had in mind, or would you like me to look for something else?"
4. Once the advisor confirms — AI offers help with approach, opening email, or opening script for the template
5. Conversation ends when the advisor is ready

**Template pool:** All templates (Do the Job section only) — full library available, not filtered by domain.

**Key rule:** Previously rejected templates in the same conversation are never suggested again.

**After confirmation — three offers:**
- Help developing the approach to the client for this session
- An email to the client introducing the session
- An opening script for the meeting itself

---

## 6. Learn Mode — Skill Development

Learn mode helps advisors develop their own professional skills — not client work, but the advisor's personal capability to sell, position, facilitate, and deliver advisory services.

**Opening question:** "What area are you most drawn to working on as an advisor right now?"

**Template pool:** Get the Job + Get Organised sections (not Do the Job — these are advisor development tools, not client tools).

**Coaching areas available:**
- Sales process — TCM, Lite Fundamentals, Total Needs, Planning Outcomes Review
- Trial Fit Method — revenue model coaching for high-awareness clients
- Cautious Reveal Method — revenue model coaching for low-awareness clients
- Seminar and presentation delivery — 8-stage sequential coaching
- Dashboard Discussions — 3×3 framework, profitability, capital, facilitation
- Working Capital Cycle — profit vs cash, three problem types, preservation
- Ratio Analysis — advisory staircase, common size, benchmarks
- Deming's Volatility — variation types, tampering, averages
- Conflict Meeting Facilitation — psychology, detachment, 6-step process

**Sequential delivery rule:** Coaching trees deliver one stage at a time. The AI always asks where the advisor is before recommending the next step. It never jumps ahead or names a template before checking.

**Connection to client mode:** Learn mode is also what activates silently during the invisible mid-conversation swap (Section 4) when an advisor asks HOW to use a recommended template during a guided session.

---

## 7. Plan Mode — Practice Planning

Plan mode helps advisors plan their own practice — not client situations, but the advisor's own business development, fee growth, and role evolution.

**Opening question:** "What's prompting you to think about planning ahead right now?"

**Template pool:** Get Organised section (practice management tools).

**How it works:**
1. Understand current situation
2. Clarify goals
3. Identify what has been tried
4. Recommend approach

**Fee growth routing:**
- Partner or practice leader → Practice Capacity Planner
- Individual advisor → My Fee Growth Model
- Financial planner → Financial Advisor what-if model

**Sales process matching:** The approach recommendation matches the advisor's experience level and role — a new advisor building confidence gets different guidance than an established partner expanding their practice.

---

## 8. Course Builder — Structured Learning

The Course Builder is a separate interface (`CourseBuilder.vue`) for advisors who want a structured multi-session learning programme rather than a single conversation.

### 8.1 Two Phases

**Phase 1 — Course Design:**
- Advisor selects from four pre-built starter courses, or starts from scratch
- AI generates a full course outline — JSON structure with title, sessions, resources, objectives, estimated duration
- Advisor confirms or adjusts the outline before starting
- Design is driven by `course-design.txt` prompt

Pre-built starters:
- Positioning Financial Management (5 sessions)
- The EOY Opportunity (4 sessions)
- Coffee & A Curve (4 sessions)
- Simple Dashboard Discussions (5 sessions)

**Phase 2 — Session Delivery:**
- One session at a time, guided by `course-session.txt`
- AI opens each session with a 2–3 sentence intro explaining why this matters
- AI directs the advisor to the physical resource in the Advisor-e library
- AI checks in — what stood out, what questions came up
- AI deepens — asks questions connecting the content to real advisor practice
- Session ends when the advisor signals they are ready for the quiz
- Quiz can be AI-generated or overridden by a fixed question set in `course-quizzes.json`

**Critical session rule:** The AI never generates template content or shows what is inside a template. It only references the template by name and directs the advisor to find it in the library.

### 8.2 How Course Builder Differs From Learn Mode

| | Learn mode | Course Builder |
|---|---|---|
| Structure | Conversational — follows the advisor's lead | Structured — fixed outline with sessions in sequence |
| Duration | Single conversation | Multi-session programme over days or weeks |
| Entry point | "I want to learn more" navigation | "I want to build a course" navigation |
| Progress tracking | Not tracked | Each session logged to activity database |
| Quiz | Not included | Included at end of each session |

---

## 9. My Progress — Capability Tracking

The progress tracker (`AdvisorProgression.vue`) shows the advisor where they are in their capability development journey. It is connected to a MySQL database that logs activity.

### 9.1 What Is Tracked

| Activity | What gets logged |
|---|---|
| Completing a guided client session | Domain, highest complexity tier reached, timestamp |
| Completing a course session | Course ID, session index, quiz score, highest tier reached, timestamp |

### 9.2 Tier Structure

Advisors progress through three tiers based on accumulated activity:

| Tier | What it represents |
|---|---|
| Entry-level | Early engagement — building familiarity with the advisory tools |
| Intermediate | Developing practice — delivering tools consistently across domains |
| Advanced | Established practice — operating at high complexity across multiple domains |

Tier is derived from activity data — not stored directly. The progression view calculates it fresh from the log on each load.

### 9.3 Two Views

| View | Who sees it | What it shows |
|---|---|---|
| Self-view | The advisor | Their own tier, VA sessions by domain, course completions, quiz scores, recent activity |
| Team view | Firm manager | All advisors in the firm — tier, sessions, last active date |

---

## 10. Advisor Profile

The advisor profile is a stored set of known facts about the advisor that personalises every interaction across all modes.

### 10.1 Profile Fields

| Field | What it captures |
|---|---|
| advisorRole | Their role (partner, advisor, financial planner, etc.) |
| experience | How long they have been delivering advisory work |
| clientDemographic | The types of clients they typically work with |
| enjoyment | What kinds of advisory conversations they enjoy most |
| technicalStrengths | Areas of technical strength |
| toolsComfort | Comfort level with tools and frameworks |
| notes | Any other relevant context |

### 10.2 How the Profile Is Used

When an advisor profile is pre-loaded (passed as a parameter to the session), it:

1. **Skips three questions** in the client mode question pipeline — advisor experience, advisor enjoyment, and (if profile is rich enough) advisor confidence. These are already known and do not need to be re-asked.
2. **Injects profile context** into the AI's system prompt for all modes — so the AI tailors the recommendation, the coaching, and the planning guidance to this specific advisor's background and strengths.
3. **Applies to all four modes** — client, discover, learn, and plan all use the profile when present.

### 10.3 Profile and Question Skipping

The question pipeline explicitly checks for the profile before asking experience and enjoyment questions:

```
advisorExperience → skip if advisorProfile is present
advisorEnjoyment  → skip if advisorProfile is present
```

This prevents the system from asking an experienced advisor for information it already has. The profile makes sessions faster and more accurate for advisors who have completed their profile setup.

---

## 11. Firm Manager

The Firm Manager hub (`/firm-manager`) is a separate authenticated interface for platform administrators and firm-level managers.

### 11.1 Access Control

- Requires `firm_manager` or `platform_admin` role (validated via `advisor_e_token` and `advisor_e_role` in localStorage)
- On localhost, auto-authenticated for development

### 11.2 Capabilities

| Area | What firm managers can do |
|---|---|
| Document Library | Upload, list, download, and delete firm-specific documents (stored in Google Drive) |
| Decision Framework | View and override the base platform decision rules for their firm |
| Framework History | View version history of framework overrides and restore an earlier version |
| Videos | Add and remove video links for firm-specific content |
| Firm Profile | Update the firm's profile information |
| Storage | View Drive storage usage |
| Team Progress | View all advisors' progression tiers and activity (via the AdvisorProgression team view) |
| **Advisory Distinctions** | **Add domain expert signal vocabulary — phrases that indicate specific client situations** |

### 11.3 Advisory Distinctions Table — Design Decision (2026-06-04)

**Confirmed design. This is the mechanism by which domain expert knowledge is added to the system without code changes.**

#### What It Is

A table in the Firm Manager hub where the platform administrator (Mike Barnes) and firm managers add rows that teach the system what specific advisor phrases mean. Each row connects a conversational signal to a domain, giving the scoring engine vocabulary it would not otherwise have.

This is the editable version of what would otherwise be hardcoded signal patterns — it puts ownership of advisory vocabulary where it belongs: with the domain expert, not the engineers.

#### The Table Format

| Column | What it contains |
|---|---|
| Domain | Which advisory domain this distinction applies to |
| When the advisor says... | A phrase, keyword, or concept the advisor might use (plain English — no regex) |
| It signals | A short plain-English description of what this means diagnostically |
| Templates it helps surface | The template names this distinction should boost (optional — system infers if blank) |

#### Example Rows (platform level — authored by Mike Barnes)

| Domain | When the advisor says... | It signals | Templates it helps surface |
|---|---|---|---|
| Conflict | shareholders fighting, partner dispute, messy breakup, they're not talking | High-conflict partner scenario | Force Field Analysis, Alignment Statements |
| Conflict | contribution, equity, not pulling their weight, one does more than the other | Partner accountability issue | Partner Accountability |
| Conflict | they need to understand the consequences, pull them back from the edge | Pre-escalation mediation opportunity | Force Field Analysis |
| Succession | kids taking over, passing it on, family business, sibling disagreement | Family succession scenario | Farm Succession, Succession Planning |
| EOY | end of year, compliance meeting, annual review, tax done | EOY context — convert compliance to value | EOY templates |
| Governance | no one's accountable, decisions never stick, they undermine each other | Decision quality or accountability gap | 6 Hats, Alignment Statements |

#### Two Levels

**Platform level (platform_admin only — Mike Barnes):**
Rows that apply to all firms using the platform. These encode 15+ years of advisory experience as reusable signal vocabulary. Every advisor in every firm benefits immediately when a row is added here.

**Firm level (firm_manager role):**
Rows that apply only to that firm's advisors. Used for firm-specific specialisations, niche industries, or client types the platform level doesn't cover. Firm rows sit on top of platform rows — they do not replace them.

#### How It Feeds the Pipeline

At session time, the system reads all active distinction rows for the detected domain and scans the collected advisor answers (opening description, diagnostic answer, domain question answers) for any of the trigger phrases. When a match is found, it raises the score for the associated templates — the same mechanism as semantic signal scoring, but driven by editable data rather than hardcoded patterns.

This solves the context domain scoring gap: conflict, EOY, and due-diligence domains currently suppress all signals, leaving only subSection priors to discriminate. Advisory distinctions give these domains their own vocabulary without requiring code changes.

#### Build Status

**Designed 2026-06-04. Not yet built.**

Belongs in Firm Manager Phase 2 (after core Firm Manager hub is stable). Database schema: two tables — `platform_distinctions` (platform admin only) and `firm_distinctions` (per firm). UI: simple add/edit/delete table with domain dropdown. Pipeline integration: read at session start, applied in templateResolver scoring pass.

### 11.4 Firm Overlay Architecture

Every layer of the pipeline supports a firm override layer on top of the base platform defaults:

| Layer | Base platform | Firm override |
|---|---|---|
| Signal schema | Standard signals | Firm-specific signals for their specialisation |
| Advisory distinctions | Platform vocabulary (Mike-authored) | Firm-specific vocabulary rows on top |
| Strategy rules | Base strategy rules | Firm-specific engagement type and ceiling rules |
| Template pool | Platform library | Firm-uploaded templates scored alongside platform |
| Content summaries | Platform PDFs / JSON | Firm Google Docs → Drive API sync → firm JSON |

---

## 12. Data Flow — How a Session Connects Everything

```
Advisor describes client situation
    ↓
advisor.js question pipeline
    ├── domains.json (domain keyword patterns)
    ├── logic_trees.json (if-then signal enrichment)
    └── Structured state fields (answers stored per session)
    ↓
signals.js — extract typed signals from state
    ↓
caseState.js — build structured case object
    ├── domain, solutionCategories, client facts, advisor facts, constraints
    └── [primaryIssue + routingGroup — designed, not yet in code]
    ↓
strategyResolver.js — determine engagement structure
    ├── engagementType (education / facilitation / advice)
    ├── complexityCeiling (foundational / analytical / strategic)
    └── templateBudget (count)
    ↓
templateResolver.js — score and rank templates
    ├── templates.json (the library)
    ├── semantic-profiles.json (signal weights)
    ├── Advisory Distinctions (platform + firm rows — boost domain-specific templates)
    └── Two-pass output: unrestricted best match + within-range match
    ↓
advisor.js Phase 3 AI call (client.txt prompt)
    ├── Pre-selected templates
    ├── content-summaries.json (rich template descriptions)
    ├── *-domain-support.json (domain knowledge reference)
    └── Collected answers summary
    ↓
Recommendation delivered to advisor
    ↓
Post-recommendation conversation
    ├── HOW question detected → learn.txt prompt (invisible swap)
    ├── WHY / alternative question → client.txt prompt
    └── Happiness confirmed → Moving Forward question → approach guidance
    ↓
logVASession() → activity.js → MySQL (domain, tier, timestamp)
```

---

## 13. Template Recommendation Output — Design Decision (2026-06-04)

### The Two-Card Output Model

**Confirmed design. Supersedes all prior hard-exclusion logic in the template resolver.**

When the system selects templates, it runs two passes:

**Pass 1 — Unrestricted:** Find the best-matching template across the full eligible library, regardless of the advisor's staircase position, engagement type, or subSection preference. Relevance to the client's situation is the only criterion.

**Pass 2 — Within parameters:** Find the best-matching template that respects the advisor's current staircase ceiling and engagement type. Apply all normal filters.

The output depends on what the two passes return:

| Scenario | Output |
|---|---|
| Pass 1 and Pass 2 return the same template | Single recommendation card — normal flow, no flags |
| Pass 1 returns a better template than Pass 2 | Two recommendation cards — see below |
| Pass 2 returns nothing (no within-range template exists) | Pass 1 template only, with "no entry-level option" note |

**Two-card output format:**

**Card 1 — Most relevant (may be outside your range):**
Includes the best-matched template with a visible flag:
*"This template sits above your current advisory range — it is the strongest match for this client's situation. Consider it if you are comfortable stretching for this engagement."*

**Card 2 — Within your current range:**
Includes the best within-parameters match with no flag — this is the safe choice.

If no within-parameters template exists, Card 2 is replaced with a plain-language note:
*"There is no entry-level template suited to a situation of this complexity. This client may need a more experienced advisor or a specialist referral before a structured advisory engagement can begin."*

This message is a feature, not a failure. It tells the advisor the honest truth about the situation and their current capability match — which is exactly what a good virtual advisor should do.

### Why This Replaces Hard Exclusions

Previously, the resolver used hard exclusion rules (engagement type gates, domain subsection hard blocks) to prevent "unsuitable" templates from appearing. This caused silent failure — the best template for a situation was excluded without the advisor knowing it existed, and worse alternatives were recommended instead.

**Hard exclusions are removed from the resolver.** They are replaced by:
- Soft preferences (subSection maps become ranking boosts, not gates)
- The two-card output (transparency over suppression)
- The staircase complexity ceiling (the ONLY remaining hard block — protects against recommending Step 5 engagements to a Step 1 advisor)

The staircase ceiling remains as a hard block because it protects advisor capability, not system tidiness. Every other exclusion is replaced by ranking and flagging.

### Design Principles This Enforces

This decision directly implements Principle 1 (if in doubt, ask the advisor) by showing the advisor the full picture and letting them decide — rather than making the decision silently on their behalf.

---

## 13b. Build Status — What Is Complete and What Is Not

### Pipeline Stages

| Stage | Design | Code | Connected to live sessions |
|---|---|---|---|
| Stage 1: Signal Capture (5 built domains) | Locked | Built | Yes |
| Stage 1: Signal Capture (9 stub domains) | Questions not yet written | Not built | No |
| Stage 2: Primary Issue Classification | All 14 domains locked | Not in code — no primaryIssue field in CaseState | No |
| Stage 3: Routing Groups | Domain 4 complete; 10 domains pending | Not built | No |
| Stage 4: Strategy Resolution | Locked | Built (strategyResolver.js) | Yes |
| Stage 5: Template Selection — scoring | Locked | Built (templateResolver.js) | Yes |
| Stage 5: Template Selection — routing group pre-filter | Locked | Not built | No |
| Stage 6: AI Narrative | Locked | Built | Yes |
| Stage 6: AI Narrative prompt simplification | Designed | Not implemented | — |

### Other Sections

| Section | Status |
|---|---|
| Advisor course correction (contradiction detector + None of these apply) | Designed 2026-06-04 — not yet built |
| Invisible mode swap (HOW detection) | Built and working. **Reverse (2026-06-23):** when an advisor in Learn mode describes a *live client situation*, the Learn prompt now names the cross-over transparently and offers to expand into how-to **in place** (no restart / no lost context) rather than bouncing them to the client tool. |
| Discover mode | Built and working |
| Learn mode | Built and working. **Correction 2026-06-23:** "built and working" was true for the original coaching trees but **masked a gap** — the 7 "Get the Job" advisor-development trees (a second `flat_if_then` schema, imported 2026-05-06 in `fbcc3ff`) were loaded but reached no consumer and were mis-counted as "empty." Now wired (`formatFlatBranch` + `mode:'learn'` tags) and gated so they never leak into a client session (`isClientDeliveryLearnTree`). |
| Plan mode | Built and working |
| Course Builder | Built and working |
| My Progress | Built and working |
| Advisor Profile (injection into AI context) | Built and working |
| Advisor Profile (edit UI) | Dependent on master app |
| Firm Manager hub | Built and working |
| Firm overlay (template pool) | Built and working |
| Firm overlay (decision framework edit) | Built and working |
| Activity logging to MySQL | Built and working |
| Ghost reference validation | Built — runs on startup |

### Content Gaps (affect scoring quality, not functionality)

| Gap | Actual scope |
|---|---|
| Templates with no semantic profile at all | 2 (IT Services, Landscaping & Maintenance — both niche industry Revenue & Feasibility Models) |
| Templates with semantic profiles but zero signals | 23 — categorised: 5 correctly have none, 9 work via subSection prior, 5 worth adding signals, 4 need purpose review |
| Templates with thin purpose-only profiles (no rich summary) | 88 — system works with these, scoring is less precise |

---

## 14. Advisor Course Correction — Design Decision (2026-06-04)

**Confirmed design. The system guides advisors — it does not trap them.**

### The Problem This Solves

The pipeline assumes the AI will correctly detect the domain and ask the right questions. When it does not — due to ambiguous language, a typo, selector label contamination, or any other cause — the advisor currently has no way to redirect. They are forced to answer increasingly wrong questions until a wrong recommendation is delivered. This is a waste of their time and damages trust.

The solution is not to make the AI more accurate at prediction. The solution is to make the system responsive to the advisor when it goes wrong.

### Contradiction Detection

The pipeline monitors every advisor response for signals that indicate the conversation has gone in the wrong direction. These signals include:

- **Explicit negation of options:** "none of these", "that doesn't apply", "none of that", "not really"
- **Direct contradiction of the current direction:** describing a situation that clearly belongs to a different domain than the one being followed
- **Dismissal or frustration:** phrases that indicate the current questions are missing the point entirely
- **Non-answers:** responses that do not address the question asked and introduce a new topic

When a contradiction signal fires, the AI does not restart, go backwards, or abandon the session. Instead it pauses, surfaces its current understanding, and invites the advisor to confirm or correct:

*"It sounds like I may have the wrong read on this situation — let me check. From what you've described: [one sentence summary]. Is that right, or should we look at this from a different angle?"*

The advisor's correction is taken as free text, re-enters the pipeline naturally, and the conversation continues forward from that point. No backwards navigation. No lost answers.

### None of These Apply — Required on All Selectors

Every constrained selector in the conversation pipeline — primary issue selector, disambiguation question, and any domain-specific option set — must include a "None of these fit — let me describe it differently" escape option.

When selected, the AI acknowledges the mismatch and invites a fresh free-text description:

*"No problem — tell me in your own words what's actually going on with this client."*

The free-text response re-enters domain detection from the top. The conversation continues forward.

This option is not a failure state. It is the system being honest that its current read is wrong and trusting the advisor to correct it.

### The Improvement Engine

The system will never predict every combination of 14 domains, hundreds of primary issues, and natural advisor language through pre-emptive testing and keyword expansion. That approach will always be incomplete and always require patching.

**The feedback loop and case studies are the improvement mechanism — not pre-emptive code.**

Every advisor correction (contradiction response, "none of these" selection, course correction after a wrong recommendation) is captured as session data. Case studies record what the advisor actually said, what the system did with it, and what the correct answer was. Over time, real session patterns — not hypothetical test scenarios — identify where the system needs improvement.

Engineering decisions that require constant patching to handle edge cases are a signal that the wrong layer is doing the work. If an edge case cannot be resolved by the advisor correcting the system in-session and that correction being captured as learning, escalate it as a structural issue — do not patch it.

---

## 15. Key Design Principles

These principles govern all decisions in the system. Any proposed change that violates one of them is a structural change requiring full engineering review.

1. **If in doubt, ask the advisor.** When the system needs a categorical decision and cannot determine it with certainty from signals or conversation context, the right answer is always a constrained question to the advisor — not an inference, not a default, not an AI guess. The advisor knows their client. This principle takes precedence over pipeline elegance. It applies at every stage: domain detection ties trigger a disambiguation question; primary issue uncertainty triggers a primary issue selector; any ambiguity in strategy or context triggers a clarifying question. Never silently assume.

2. **Guide and show thinking — do not trap.** The system guides advisors through a conversation. It shows its current understanding, asks for confirmation, and responds to correction. It never forces an advisor to choose from wrong options with no exit, and never ploughs forward when the advisor has signalled a mismatch. Advisor judgment always takes precedence over AI inference.

3. **Real sessions improve the system. Not pre-emptive patches.** Feedback, case studies, and advisor corrections captured from live sessions are the improvement engine. Engineering time spent on pre-emptive edge case patching — keyword expansion, test scenario multiplication, scoring micro-adjustments — is misallocated. Build the correction and capture mechanism first. Let real data identify what needs fixing.

4. **AI classifies micro-signals. Code makes macro-decisions.** Domain detection, primary issue classification, routing, strategy, and template selection are all in code. AI writes copy only. *(Amended 2026-06-25: domain detection is keyword-first with an AI **backstop** — when keywords find no domain, the AI maps the situation to one of the existing 14 by meaning, boxed to those ids and logged. Routing, strategy and template selection stay fully code-owned; the AI still never picks or ranks a template. See §3.2.)*

5. **Decision-grade normalisation, not perfect extraction.** Constrained questions are preferred over free-text wherever a categorical answer is needed. Free-text is only used where richness matters.

6. **Each layer has one contract.** Signal extraction, classification, routing, strategy, selection, and narrative are separate steps. Mixing them produces untestable, unpredictable output.

7. **Signals age slowly, template names age fast.** Logic trees emit signals, not template names. Template names change as the library evolves; signals do not.

5. **The template section boundary is absolute.** Do the Job templates are for clients. Get the Job and Get Organised templates are for advisors. This boundary cannot be crossed.

6. **The invisible swap preserves context.** When the system swaps between client.txt and learn.txt mid-conversation, the full conversation history is preserved. The advisor's experience is one continuous conversation.

7. **The advisor never knows how it works.** All pipeline complexity — domain detection, signal extraction, strategy resolution, template scoring, prompt switching — is invisible. The advisor experiences a single natural conversation.

8. **Multi-tenancy at every layer from day one.** Every component supports firm-specific overrides on top of platform defaults. Nothing is single-tenant.

9. **Observability before logic changes.** Every session produces a structured log showing signals, CaseState, strategy decision, and template scores. This log is how bad recommendations are diagnosed.

10. **No template appears without a reason that can be stated.** The causal audit chain — signal → primary issue → routing group → strategy → template — must be traceable for every recommendation. If a recommendation cannot be traced, it is a bug.
