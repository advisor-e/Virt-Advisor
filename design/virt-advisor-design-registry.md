# Virt Advisor — Master Design Registry

**Version:** 1.0 — 2026-06-03
**Status:** Stage 2 complete — all 11 flags resolved 2026-06-03. Stage 3 in progress — Domain 4 complete, 10 domains remaining. Solution Categories renamed to Routing Groups (RG_ format) — confirmed by 4 independent engineering reviews 2026-06-03. Causal audit chain and 4-table governance model added.
**Purpose:** Single source of truth for the complete Virt Advisor decision logic. Every stage, every decision, every item — in sequence. Written to be readable and editable by a firm manager without engineering knowledge.
**Supersedes:** design/primary-issue-registry.md (superseded 2026-06-03)

---

## How to Use This Document

This document follows the Virt Advisor recommendation pipeline from start to finish. Each stage explains what it does, why it exists, what decisions were made and why, what is complete, what is outstanding, and why the design is sound.

**To navigate to a specific stage:** use the stage numbers. Stage 1 is the first thing that happens in a conversation. Stage 6 is the last.

**To review or challenge a decision:** every decision is marked as either Mike confirmed (domain expert explicitly agreed) or Assumed — flagged (engineering team made a judgment call requiring review). Any item marked Needs Review requires domain expert input before it can be built.

**To propose a change as a firm manager:** locate the relevant stage and domain. Note the item you want to change with your proposed revision and reason. Mark the item status as Proposed Change. The engineering team reviews all proposed changes before implementing.

---

## The Decision Pipeline — Overview

When an advisor uses Virt Advisor, six stages happen in sequence. Every stage has one job.

```
Stage 1 — Conversation & Signal Capture
         The advisor answers questions. The system records structured information.
              ↓
Stage 2 — Primary Issue Classification
         The system identifies what is structurally wrong with the client's business.
              ↓
Stage 3 — Solution Categories
         The system identifies what type of advisory work is needed.
              ↓
Stage 4 — Strategy Resolution
         The system determines how the engagement should be structured.
              ↓
Stage 5 — Template Selection
         The system selects the most relevant advisory tools from the library.
              ↓
Stage 6 — AI Narrative
         The AI writes the recommendation in clear, advisor-ready language.
```

**Core design principle:** The AI writes the recommendation at Stage 6. It does not decide what is wrong, what type of work is needed, or which templates to use. Those decisions happen in Stages 2–5, in code, using the domain expert's design. This is what makes the system auditable and trustworthy.

---

## Stage 1 — Conversation & Signal Capture

### What This Stage Does
The advisor describes their client's situation. Stage 1 captures everything the advisor says and converts it into structured, usable information that the rest of the pipeline can work with.

### Why This Stage Exists
The recommendation engine needs structured data, not free text. An advisor saying "my client is struggling with costs" tells a human a lot but tells a computer very little. Stage 1 converts what the advisor tells us into precise, categorised information that Stages 2–5 can act on consistently. Without Stage 1, every downstream decision would be made by the AI interpreting free text — which is slow, inconsistent, and unauditable.

### How It Works — Three Capture Methods

**Method 1 — Constrained questions (preferred)**
The advisor selects from a defined list of options. Examples already working: Advisory Staircase selector (Step 1–5), Session Length selector, Growth Curve selector, Financial Management droptab. When an answer is constrained, the system knows exactly what was selected — no interpretation required.

**Method 2 — Rule-based extraction**
For short typed responses, the system uses pattern matching to extract a structured answer. Examples already working: detecting whether the advisor confirmed reviewing reports, detecting whether the client raised the issue first.

**Method 3 — AI-assisted extraction (used sparingly)**
For free-text answers where a categorical answer must be inferred, a small focused AI call classifies the response into a structured value only. The AI does not make recommendations at this stage — it only classifies one piece of information at a time.

### The 13-Question Framework

Every Virt Advisor conversation collects the following information. These 13 questions apply across all 14 domains. Domain-specific questions sit on top of this foundation.

| # | Information Collected | When Asked | Capture Method |
|---|---|---|---|
| 1 | Opening situation — what the advisor has observed | Always | Free text → AI extraction |
| 2 | Whether the client raised the issue themselves | Always | Rule-based |
| 3 | What contributed to the situation and any downstream effects | Always | Free text → AI extraction |
| 4 | Disambiguation — if two domains score equally | Only on tie | Constrained question |
| — | Industry the client operates in | Always | Constrained question |
| 5 | Business ownership structure | Always | Constrained question |
| 6 | Business growth stage | Always (skip if NFP or public entity) | Constrained question — Growth Curve selector |
| 7 | Advisory staircase position | Always | Constrained question — Step 1–5 selector |
| 9 | Advisor experience level | Skip if advisor profile exists | Constrained question |
| 10 | Advisor confidence in this domain | Always | Constrained question |
| 11 | Advisor enjoyment of this type of work | Skip if advisor profile exists | Constrained question |
| 12 | Number of meetings planned | Always | Constrained question |
| 13 | Session length | Always | Constrained question — Session Length selector |
| 14 | What the client has already tried to address this situation, and what the outcome was | Always | Free text → AI extraction |

**Why Question 14 matters:** If a client has already attempted an approach and it failed, recommending that same approach again damages advisor trust. The extracted answer is used to down-weight templates that match the failed approach before Stage 5 scoring begins.

**Why Question 3 matters:** The advisor's answer to "what contributed to this situation?" distinguishes whether a problem has an external cause (market conditions, economic environment) or an internal cause (process failure, product gap, management issue). This distinction routes the case to the correct domain without hardcoded rules. Low sales volume caused by a poor sales process routes to Sales & Marketing. Low sales volume caused by a recession routes to Profitability. Same presenting problem, different domains, resolved by what the advisor said.

### Current Status

| Item | Status |
|---|---|
| Universal 13-question framework | Designed and locked |
| Constrained questions — Sales & Marketing | Built |
| Constrained questions — Profitability | Built |
| Constrained questions — Staff | Built |
| Constrained questions — Data | Built |
| Constrained questions — Financial Management | Built (droptab) |
| Constrained questions — Governance, Strategy, Systems, Valuation, Risk, Succession | Not yet built — pending Stage 2 flags resolved and Phase B build |
| Observability logging — full pipeline trace per session | Designed, not yet built — Phase A |

### AI Extraction Boundary Rule — Formal Design Constraint

**Boundary rule (confirmed by 4 independent engineering reviews, 2026-06-03):**
AI extraction converts free text from Questions 1, 3, and 14 into structured signals only. It does not classify primary issues, routing groups, or templates. The output is a structured JSON object of boolean flags and string arrays. All classification happens in decision Tables 1–4. This boundary is formal and must not be extended.

What AI extracts:
```
{ supplier_cost_pressure: true, margin_pressure: true, client_already_tried: ["price_increase"] }
```

What AI does NOT extract: primary issue, routing group, template recommendation.

If a proposed change requires AI to make a classification decision beyond signal extraction, it is a structural change requiring engineering review — not a content or configuration change.

### Why This Is Robust
Constrained questions eliminate the most common failure mode in AI advisory systems: misinterpretation of free text. When an advisor selects Step 3 from the staircase, the system knows with certainty. No inference. No error. The 13-question framework was reviewed by two independent panels of senior engineers (3 engineers each) who confirmed the structure is sound. Question 3 was specifically validated as the correct mechanism for cross-domain disambiguation.

---

## Stage 2 — Primary Issue Classification

### What This Stage Does
Using the information captured in Stage 1, the system identifies which primary issue best describes the client's situation. The primary issue is the specific structural problem that the advisory engagement will address.

### Why This Stage Exists
Without a primary issue classification, the system cannot route to the right type of advisory work or the right templates. Primary issues also prevent cross-domain contamination — if the system does not know whether the primary issue is a cost problem or a sales problem, it will attempt to score templates from both domains simultaneously, which produces unreliable recommendations (confirmed by live test, 2026-05-28).

### How It Works
The primary issue is derived from Stage 1 signals combined with domain-specific questions. The derivation happens in code, not by AI. The output is a single primary issue per domain.

### Design Decisions

**Decision 1 — Primary issues are authored by the domain expert, not generated by AI.**
Every primary issue in this registry was written by Mike Barnes (15+ years business advisory experience) in Workshop 1, 2026-06-02. The normalization in Workshop 1.5 reorganised the items but did not generate new ones. Any item renamed or grouped during normalization is flagged for domain expert review.

**Decision 2 — Primary issues pass a two-stage test before being locked.**
Test A — Engagement start: Can an advisor begin an advisory engagement based on this issue alone? If yes, it is a primary issue. If no, it is a symptom (routes to another domain) or a context (overrides the strategy layer).
Test B — Intervention pathway: Does this issue drive a distinct intervention from other issues in the same domain? If yes, it remains a separate primary issue. If no, it is a diagnostic contributor that accumulates under a broader primary issue.

**Decision 3 — Normalization labels must not distort the domain expert's original language.**
Workshop 1.5 applied cluster labels to group related items. Where a label significantly departs from original language or distinct items were merged under one label, the item is flagged for Mike's review. This failure mode was confirmed during the 2026-06-03 session when "Cost Structure" was found to be an AI-generated abstraction that merged two distinct primary issues with different intervention pathways.

### Status Legend

| Status | Meaning |
|---|---|
| Locked | Confirmed by domain expert. No changes without explicit review. |
| Needs Review | Flagged — requires domain expert confirmation before building. |
| Reclassified — S | Reclassified as Symptom. Routes to another domain or probes for cause. |
| Reclassified — Ctx | Reclassified as Context. Overrides the strategy layer (Stage 4). Not a diagnostic issue. |
| Relocated | Moved to a different domain where the intervention is better handled. |

### Normalization Basis Legend

| Basis | Meaning |
|---|---|
| Mike confirmed | Domain expert explicitly agreed to this classification in a workshop session |
| Assumed — acceptable | Single item renamed to a short label. Low risk of distortion. |
| Assumed — flagged | Multiple items merged under one label, or label departs significantly from original language. Requires Mike review before building. |

### Why This Is Robust
The primary issue map is grounded entirely in domain expert language. Every item originated from Mike Barnes in Workshop 1. The normalization process in Workshop 1.5 organised the items but any assumption made during that process is explicitly flagged for review. The two-stage test (engagement start + intervention pathway) was confirmed as structurally sound by two independent senior engineering panels (6 engineers total).

---

### Domain 1: Profitability & Feasibility

**Domain purpose:** Identify whether the business is generating sufficient profit and whether the current business model is financially viable. Routes to cost, pricing, revenue, and feasibility interventions.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | Cost of sales has increased — materials, labour, supplier costs eating into margin |
| 2 | Excessive discounting eroding margin — pricing confidence or competitive pressure |
| 3 | Low sales volume pulling profit down — revenue is the constraint, not cost |
| 4 | Fixed overhead costs grown beyond what revenue can support |
| 5 | Asset utilisation below viability threshold — the numbers don't stack up |
| 6 | Finance strain — funding structure or repayment creating pressure |
| 7 | Asset realisation or venture extraction — owner needs to understand what they can get out or how to exit the risk |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Resulting Primary Issue | Basis | Status |
|---|---|---|---|---|---|
| 1 | Cost of sales has increased — materials, labour, supplier costs eating into margin | Split from item 4 — restored as distinct primary issue | Cost of sales has increased | Mike confirmed — 2026-06-03 | Locked |
| 2 | Excessive discounting eroding margin — pricing confidence or competitive pressure | Label restored to original Workshop 1 language | Excessive discounting eroding margin | Mike confirmed — 2026-06-03 | Locked |
| 3 | Low sales volume pulling profit down — revenue is the constraint, not cost | Renamed | Sales Revenue | Mike confirmed — 2026-06-03 | Locked |
| 4 | Fixed overhead costs grown beyond what revenue can support | Split from item 1 — restored as distinct primary issue | Fixed overhead costs grown beyond what revenue can support | Mike confirmed — 2026-06-03 | Locked |
| 5 | Asset utilisation below viability threshold — the numbers don't stack up | Label restored to original Workshop 1 language | Asset utilisation below viability threshold | Mike confirmed — 2026-06-03 | Locked |
| 6 | Finance strain — funding structure or repayment creating pressure | Reclassified as Symptom — routes to Domain 5 Financial Management | — | Mike confirmed | Reclassified — S |
| 7 | Asset realisation or venture extraction — owner needs to understand what they can get out or how to exit the risk | Reclassified as Context — Layer 3 strategy override | — | Mike confirmed | Reclassified — Ctx |

**Resolution — Items 1 and 4 — Cost Structure split (2026-06-03):** Confirmed normalization failure. "Cost Structure" was an AI-generated cluster label merging two distinct primary issues. Restored to original Workshop 1 language: "Cost of sales has increased" (item 1) and "Fixed overhead costs grown beyond what revenue can support" (item 4). Mike confirmed both labels and the split.

#### Solution Categories — Workshop 2
*Not yet started.*

---

### Domain 2: Staff

**Domain purpose:** Identify whether the business has the right people, in the right roles, with the right capability, managed effectively. Routes to workforce, training, management, and hiring interventions.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | Too few qualified staff — insufficient headcount to meet demand |
| 2 | Inexperienced or insufficiently trained staff — capability gap in the existing team |
| 3 | No internal training structures — no system for building capability over time |
| 4 | Poor management practices — weak coaching and accountability from leadership |
| 5 | Poor communication and feedback standards — team isn't getting the information or direction it needs |
| 6 | Roles and responsibilities poorly defined — people don't know what they own |
| 7 | Weak hiring practices — no structured process for bringing the right people in |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Resulting Primary Issue | Basis | Status |
|---|---|---|---|---|---|
| 1 | Too few qualified staff — insufficient headcount to meet demand | Label restored to original Workshop 1 language | Too few qualified staff | Mike confirmed — 2026-06-03 | Locked |
| 2 | Inexperienced or insufficiently trained staff — capability gap in the existing team | Confirmed as distinct primary issue — original language retained | Inexperienced or insufficiently trained staff | Mike confirmed — 2026-06-03 | Locked |
| 3 | No internal training structures — no system for building capability over time | Confirmed as distinct primary issue — original language retained | No internal training structures | Mike confirmed — 2026-06-03 | Locked |
| 4 | Poor management practices — weak coaching and accountability from leadership | Merged with item 5 — confirmed same engagement covering 3 components | Poor management practices — weak communication, feedback and formal discipline | Mike confirmed — 2026-06-03 | Locked |
| 5 | Poor communication and feedback standards — team isn't getting the information or direction it needs | Merged with item 4 — confirmed same engagement covering 3 components | Poor management practices — weak communication, feedback and formal discipline | Mike confirmed — 2026-06-03 | Locked |
| 6 | Roles and responsibilities poorly defined — people don't know what they own | Confirmed as distinct primary issue — original language retained | Roles and responsibilities poorly defined | Mike confirmed — 2026-06-03 | Locked |
| 7 | Weak hiring practices — no structured process for bringing the right people in | Label restored to original Workshop 1 language | Weak hiring practices | Mike confirmed — 2026-06-03 | Locked |

**Resolution — Items 2 and 3 (2026-06-03):** Confirmed as two distinct primary issues. Item 2 addresses immediate capability gap in current staff. Item 3 addresses structural absence of a training system. Different intervention pathways. Mike confirmed.

**Resolution — Items 4 and 5 (2026-06-03):** Confirmed as one primary issue — communication of expectations, feedback, and formal discipline enforcement are three components of the same management engagement. Label: "Poor management practices — weak communication, feedback and formal discipline". Mike confirmed.

**Resolution — Item 6 (2026-06-03):** Confirmed as distinct primary issue. Roles and responsibilities poorly defined drives a separate intervention from management practices. Mike confirmed.

#### Solution Categories — Workshop 2
*Not yet started.*

---

### Domain 3: Data

**Domain purpose:** Identify whether the business has reliable data, appropriate financial controls, and the right mix of lead and lag indicators to make informed decisions. Routes to data capture, integrity, controls, and reporting interventions.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | No enforceable data capture methods — data either isn't being collected or there's no system to ensure it is |
| 2 | Poor data integrity — over-reliance on manual input creating errors and unreliable numbers |
| 3 | Lack of financial controls — no transparency or governance over purchase and sale decisions |
| 4 | Too much lag indicator data, not enough lead indicators — the business is always looking backwards, never forward |
| 5 | Narrow data spread — financial performance tracked but business activities, operational metrics, or inventory effectiveness ignored or underreported |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Resulting Primary Issue | Basis | Status |
|---|---|---|---|---|---|
| 1 | No enforceable data capture methods — data either isn't being collected or there's no system to ensure it is | Confirmed as distinct primary issue — process/system intervention | No enforceable data capture methods | Mike confirmed — 2026-06-03 | Locked |
| 2 | Poor data integrity — over-reliance on manual input creating errors and unreliable numbers | Confirmed as distinct primary issue — technology/tools intervention (software, apps, devices) | Poor data integrity | Mike confirmed — 2026-06-03 | Locked |
| 3 | Lack of financial controls — no transparency or governance over purchase and sale decisions | Relocated to Domain 6 (Governance & Leadership) — financial controls govern authority over hiring, pay, leave, purchase and sale decisions | — | Mike confirmed — 2026-06-03 | Relocated |
| 4 | Too much lag indicator data, not enough lead indicators — the business is always looking backwards, never forward | Confirmed as distinct primary issue — original language retained | Too much lag indicator data, not enough lead indicators | Mike confirmed — 2026-06-03 | Locked |
| 5 | Narrow data spread — financial performance tracked but business activities, operational metrics, or inventory effectiveness ignored or underreported | Confirmed as distinct primary issue — original language retained | Narrow data spread | Mike confirmed — 2026-06-03 | Locked |

**Resolution — Items 1 and 2 (2026-06-03):** Confirmed as two distinct primary issues. Item 1 is a process/system problem — no mechanism to capture data. Item 2 is a technology problem — manual input causing errors; intervention involves software, apps, and devices. Mike confirmed.

**Resolution — Item 3 (2026-06-03):** Relocated to Domain 6 (Governance & Leadership). Financial controls govern authority over hiring, pay, leave, and purchase/sale decisions — these are management governance decisions, not data problems. Mike confirmed.

**Resolution — Items 4 and 5 (2026-06-03):** Confirmed as two distinct primary issues. Item 4 addresses the type of data tracked (lag vs lead indicators). Item 5 addresses the breadth of data tracked (financial only vs operational and activity metrics). Different interventions. Mike confirmed.

#### Solution Categories — Workshop 2
*Not yet started.*

---

### Domain 4: Sales & Marketing

**Domain purpose:** Identify whether the business has an effective sales process, a defined target market, competitive products, and strong brand positioning. Routes to sales, marketing, product, and brand interventions.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | Low sales volume — not enough revenue coming through the door |
| 2 | Poor product fit or market acceptance — what's being sold isn't landing with buyers |
| 3 | Product or service uncompetitive or outdated — the market has moved on |
| 4 | Supply line disruptions or poor quality controls — delivery problems undermining sales |
| 5 | No visible sales process — no structured way of moving prospects to clients |
| 6 | Poor sales training — the team doesn't know how to sell effectively |
| 7 | Poor outbound messaging and lack of marketing systems — nothing going out consistently |
| 8 | No defined target market personas — the business doesn't know who it's selling to |
| 9 | Poor positioning or brand perception — how the business is seen doesn't match what it wants to be known for |
| 10 | No defined marketing statements — the business can't answer: what do we say, to whom, and when |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Resulting Primary Issue | Basis | Status |
|---|---|---|---|---|---|
| 1 | Low sales volume — not enough revenue coming through the door | Reclassified as Symptom — cause determined by Question 3 and domain-specific questions | — | Mike confirmed | Reclassified — S |
| 2 | Poor product fit or market acceptance — what's being sold isn't landing with buyers | Merged with item 3 | Product Market Fit | Mike confirmed | Locked |
| 3 | Product or service uncompetitive or outdated — the market has moved on | Merged with item 2 | Product Market Fit | Mike confirmed | Locked |
| 4 | Supply line disruptions or poor quality controls — delivery problems undermining sales | Relocated to Domain 8 — if supply failure is the operational root cause, Systems domain handles it | External Integration (Domain 8) | Mike confirmed | Relocated |
| 5 | No visible sales process — no structured way of moving prospects to clients | Merged with item 6 | Sales Execution | Mike confirmed | Locked |
| 6 | Poor sales training — the team doesn't know how to sell effectively | Merged with item 5 | Sales Execution | Mike confirmed | Locked |
| 7 | Poor outbound messaging and lack of marketing systems — nothing going out consistently | Confirmed as one primary issue with items 8 and 10 — three components of the same marketing problem | Marketing Foundation | Mike confirmed — 2026-06-03 | Locked |
| 8 | No defined target market personas — the business doesn't know who it's selling to | Confirmed as one primary issue with items 7 and 10 — three components of the same marketing problem | Marketing Foundation | Mike confirmed — 2026-06-03 | Locked |
| 9 | Poor positioning or brand perception — how the business is seen doesn't match what it wants to be known for | Label restored to original Workshop 1 language | Poor positioning or brand perception | Mike confirmed — 2026-06-03 | Locked |
| 10 | No defined marketing statements — the business can't answer: what do we say, to whom, and when | Confirmed as one primary issue with items 7 and 8 — three components of the same marketing problem | Marketing Foundation | Mike confirmed — 2026-06-03 | Locked |

**Resolution — Items 7, 8, and 10 (2026-06-03):** Confirmed as one primary issue — Marketing Foundation. Three components of the same marketing problem: who you say it to (target market personas), what you say (messaging and marketing statements), and when and how often (outbound marketing systems). Mike confirmed.

#### Routing Groups — Workshop 2 — COMPLETE

Validated by two independent senior engineering panels, 2026-06-03. Routing group names updated to RG_ format, 2026-06-03 (confirmed by 4 external engineering reviews). Routing groups are internal classification codes — not shown to advisors, visible to firm managers and auditors in the causal audit chain only.

| Primary Issue | Routing Group | Internal Code | Notes | Status |
|---|---|---|---|---|
| Sales Execution | Sales Process | RG_SALES_PROCESS | Selling style (Point of Sale, Consultative, Territory Management) determines which templates score highest within this group | Locked — Mike confirmed |
| Sales Execution | Sales Capability | RG_SALES_CAPABILITY | Covers scripting, rehearsal, tension point handling, and objection handling templates | Locked — Mike confirmed |
| Marketing Foundation | Marketing Systems | RG_MARKETING_SYSTEMS | Covers marketing infrastructure and output cadence templates | Locked — Mike confirmed |
| Marketing Foundation | Market Messaging | RG_MARKET_MESSAGING | Covers target audience definition and messaging design templates | Locked — Mike confirmed |
| Product Market Fit | Product Fit | RG_PRODUCT_FIT | Covers product-market validation and fit assessment templates | Locked — Mike confirmed |
| Product Market Fit | Market Position | RG_MARKET_POSITION | Competition fronts = specific competitive dimensions (quality, price, convenience) | Locked — Mike confirmed |
| Poor positioning or brand perception | Brand Strategy | RG_BRAND_STRATEGY | Covers brand positioning and perception design templates | Locked — Mike confirmed |

---

### Domain 5: Financial Management

**Domain purpose:** Identify whether the business owner has sufficient financial understanding and whether the business's cost base and debt structure are sound. Routes to financial education, cost restructuring, and debt management interventions.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | Poor financial literacy — owner focused on wrong numbers, chasing sales volume while ignoring margin or fixed costs |
| 2 | Artisan-over-commercial mindset — business decisions driven by craft or quality pride rather than market demand; builds the best product while the market wants good enough at a fair price |
| 3 | Over-trading — growth funded primarily through debt, leaving the business dangerously exposed to economic downturns or competitive pressure |
| 4 | Cost structure imbalance — decisions based on assumptions rather than data, resulting in a cost base that doesn't reflect reality |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Resulting Primary Issue | Basis | Status |
|---|---|---|---|---|---|
| 1 | Poor financial literacy — owner focused on wrong numbers, chasing sales volume while ignoring margin or fixed costs | Label restored to original Workshop 1 language | Poor financial literacy | Mike confirmed — 2026-06-03 | Locked |
| 2 | Artisan-over-commercial mindset — business decisions driven by craft or quality pride rather than market demand | Reclassified as Symptom — probes for underlying cause before routing: financial literacy gap, pricing confidence, or founder identity issue | — | Mike confirmed | Reclassified — S |
| 3 | Over-trading — growth funded primarily through debt, leaving the business dangerously exposed | Confirmed as distinct primary issue — conscious risk position requiring funding strategy intervention | Over-trading | Mike confirmed — 2026-06-03 | Locked |
| 4 | Cost structure imbalance — decisions based on assumptions rather than data, resulting in a cost base that doesn't reflect reality | Confirmed as distinct primary issue — knowledge gap caused by poor data and complicated accounting practices | Cost structure imbalance | Mike confirmed — 2026-06-03 | Locked |

**Resolution — Items 3 and 4 (2026-06-03):** Confirmed as two distinct primary issues. Over-trading is a deliberate risk position — owner often knows they are doing it — requiring funding strategy and debt restructuring. Cost structure imbalance is a knowledge problem — owner doesn't know real costs due to complicated accounting — requiring cost analysis and accounting clarity. Mike confirmed.

#### Solution Categories — Workshop 2
*Not yet started.*

---

### Domain 6: Governance & Leadership

**Domain purpose:** Identify whether the business has effective leadership, sound decision-making processes, clear financial authority controls, a deliberate culture, and an appropriately composed team. Routes to conflict facilitation, decision framework, financial controls, culture design, and governance interventions.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | Poor boardroom dynamics or partner/owner disputes — conflict or misalignment at the top affecting the business |
| 2 | Poor decision quality — no structured process for making and committing to decisions |
| 3 | Weak communication of expectations with no documentation — people aren't held accountable because nothing is written down, and certain personality types avoid confrontation at all costs |
| 4 | Culture left to chance — no deliberate effort to define and shape what the business stands for |
| 5 | Personality and skill diversity not actively pursued — team not built for complementary strengths; ideology substituted for performance-driven thinking |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Resulting Primary Issue | Basis | Status |
|---|---|---|---|---|---|
| 1 | Poor boardroom dynamics or partner/owner disputes — conflict or misalignment at the top affecting the business | Label restored to original Workshop 1 language | Poor boardroom dynamics or partner/owner disputes | Mike confirmed — 2026-06-03 | Locked |
| R1 (relocated from Domain 3) | Lack of financial controls — no transparency or governance over purchase and sale decisions | Relocated from Domain 3 — financial authority over hiring, pay, leave, purchases and sales is a governance decision | Lack of financial controls | Mike confirmed — 2026-06-03 | Locked |
| 2 | Poor decision quality — no structured process for making and committing to decisions | Confirmed as distinct primary issue — skills and methodology gap; intervention uses structured frameworks (e.g. 6 hats) to reduce bias and argumentative behaviour | Poor decision quality | Mike confirmed — 2026-06-03 | Locked |
| 3 | Weak communication of expectations with no documentation — people aren't held accountable because nothing is written down | Confirmed as distinct primary issue — social and cultural problem; coded behaviour enabled by less assertive personality types and poor chairmanship | Weak communication of expectations with no documentation | Mike confirmed — 2026-06-03 | Locked |
| 4 | Culture left to chance — no deliberate effort to define and shape what the business stands for | Confirmed as distinct primary issue — culture design engagement: defining values, standards and acceptable behaviour | Culture left to chance | Mike confirmed — 2026-06-03 | Locked |
| 5 | Personality and skill diversity not actively pursued — team not built for complementary strengths | Confirmed as distinct primary issue — specialist engagement requiring understanding of personality types (e.g. DISC); different knowledge and tools from culture design | Personality and skill diversity not actively pursued | Mike confirmed — 2026-06-03 | Locked |

**Resolution — Items 2 and 3 (2026-06-03):** Confirmed as two distinct primary issues. Item 2 (poor decision quality) is a skills and methodology gap — intervention uses structured frameworks (e.g. De Bono's 6 hats) to overcome argumentative behaviour and confirmation bias. Item 3 (weak communication with no documentation) is a social and cultural problem — coded behaviour where people go along to maintain the facade of relationships, enabled by less assertive personalities and poor chairmanship. Completely different interventions. Mike confirmed.

**Resolution — Items 4 and 5 (2026-06-03):** Confirmed as two distinct primary issues. Both share a common root (lack of intentional leadership about organisational design) but require different interventions. Item 4 (culture left to chance) — culture definition and values design. Item 5 (personality diversity not pursued) — specialist engagement requiring understanding of personality types; different knowledge and advisory tools. Mike confirmed.

#### Solution Categories — Workshop 2
*Not yet started.*

---

### Domain 7: Strategy & Planning

**Domain purpose:** Identify whether the business has a viable model, clear measurable objectives, and communicated direction. Routes to business model review, metrics design, and strategic planning interventions.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | Lack of clarity or belief that the current business model will remain competitive — owner isn't sure the business has a viable future in its current form |
| 2 | Poor business metrics or undefined operational objectives — no clear targets means inefficient or ineffective activities continue unchallenged |
| 3 | No defined objectives means no communicated direction — leads to low staff engagement or staff anxiety about job security |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Resulting Primary Issue | Basis | Status |
|---|---|---|---|---|---|
| 1 | Lack of clarity or belief that the current business model will remain competitive — owner isn't sure the business has a viable future in its current form | Label restored to original Workshop 1 language | Lack of clarity or belief that the current business model will remain competitive | Mike confirmed — 2026-06-03 | Locked |
| 2 | Poor business metrics or undefined operational objectives — no clear targets means inefficient or ineffective activities continue unchallenged | Label restored to original Workshop 1 language | Poor business metrics or undefined operational objectives | Mike confirmed — 2026-06-03 | Locked |
| 3 | No defined objectives means no communicated direction — leads to low staff engagement or staff anxiety about job security | Label restored to original Workshop 1 language | No defined objectives means no communicated direction | Mike confirmed — 2026-06-03 | Locked |

*No flags. Each original item became one primary issue with a straightforward rename. Items 2 and 3 are closely related but kept separate: item 2 concerns absence of metrics, item 3 concerns absence of communicated direction — different interventions.*

#### Solution Categories — Workshop 2
*Not yet started.*

---

### Domain 8: Systems

**Domain purpose:** Identify whether the business has defined, reviewed, and integrated operational processes — both internal coordination and external supply chain. Routes to process design, review, integration, and supply chain interventions.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | Processes are either undefined or over-engineered — both result in tasks being done ineffectively or inconsistently |
| 2 | No regular structured review of practices — the business never stops to ask whether what it's doing is working or could be improved |
| 3 | Siloed operations — departments or people working independently with no coordination, creating gaps, duplication, and miscommunication |

The following item was relocated from Domain 4 during Workshop 1.5:

| # | Relocated Item | Relocated From | Relocation Reason |
|---|---|---|---|
| 4 | Supply line disruptions or poor quality controls — delivery problems undermining sales | Domain 4, item 4 | If supply failure is the operational root cause, Systems handles it. Sales & Marketing handles the commercial consequence; Systems handles the operational failure. |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Resulting Primary Issue | Basis | Status |
|---|---|---|---|---|---|
| 1 | Processes are either undefined or over-engineered — both result in tasks being done ineffectively or inconsistently | Label restored to original Workshop 1 language | Processes are either undefined or over-engineered | Mike confirmed — 2026-06-03 | Locked |
| 2 | No regular structured review of practices — the business never stops to ask whether what it's doing is working or could be improved | Label restored to original Workshop 1 language | No regular structured review of practices | Mike confirmed — 2026-06-03 | Locked |
| 3 | Siloed operations — departments or people working independently with no coordination, creating gaps, duplication, and miscommunication | Label restored to original Workshop 1 language | Siloed operations | Mike confirmed — 2026-06-03 | Locked |
| 4 (relocated) | Supply line disruptions or poor quality controls — delivery problems undermining sales | Label restored to original Workshop 1 language | Supply line disruptions or poor quality controls | Mike confirmed — 2026-06-03 | Locked |

*No flags. All renames are straightforward. Relocation of item 4 from Domain 4 confirmed by Mike.*

#### Solution Categories — Workshop 2
*Not yet started.*

---

### Domain 9: Valuation

**Domain purpose:** Identify whether the business is positioned to support a credible, defensible valuation for sale, partnership entry, or financing. Routes exclusively to transaction readiness interventions.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | Inconsistent financial performance reducing the capitalised future earnings component — unreliable earnings history lowers what a buyer will pay |
| 2 | Asset values unsubstantiated — assets on the books aren't supported by current independent evidence |
| 3 | Stock and work in progress figures inflated — inventory or WIP carried at values that don't reflect reality |
| 4 | Goodwill calculations driven by market growth assumptions rather than the debt-servicing capacity of the business — valuation built on what the market might do, not what a buyer can actually finance |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Resulting Primary Issue | Basis | Status |
|---|---|---|---|---|---|
| 1 | Inconsistent financial performance reducing the capitalised future earnings component — unreliable earnings history lowers what a buyer will pay | Collapsed with items 2, 3, and 4 into single primary issue | Transaction Readiness | Mike confirmed | Locked |
| 2 | Asset values unsubstantiated — assets on the books aren't supported by current independent evidence | Collapsed with items 1, 3, and 4 into single primary issue | Transaction Readiness | Mike confirmed | Locked |
| 3 | Stock and work in progress figures inflated — inventory or WIP carried at values that don't reflect reality | Collapsed with items 1, 2, and 4 into single primary issue | Transaction Readiness | Mike confirmed | Locked |
| 4 | Goodwill calculations driven by market growth assumptions rather than the debt-servicing capacity of the business — valuation built on what the market might do, not what a buyer can actually finance | Collapsed with items 1, 2, and 3 into single primary issue | Transaction Readiness | Mike confirmed | Locked |

*Collapse justified: all four items accumulate inside the same advisory objective — produce a credible, defensible valuation. No item drives a separate intervention pathway independent of the others. When Transaction Readiness is the primary issue, the strategy layer restricts template selection to valuation and sale preparation templates only.*

#### Solution Categories — Workshop 2
*Not yet started.*

---

### Domain 10: Risk Management

**Domain purpose:** Identify whether the business has a systematic process for identifying, assessing, and mitigating risk. Routes to risk framework design interventions.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | No process to identify and mitigate risks — the business has no systematic way of seeing risks before they become problems |
| 2 | Over-reliance on insurance — the default response to risk is to insure it rather than actively avoid or reduce exposure |
| 3 | Poorly defined risk assessment — no framework for understanding probability of a risk occurring versus the financial consequence if it does |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Resulting Primary Issue | Basis | Status |
|---|---|---|---|---|---|
| 1 | No process to identify and mitigate risks — the business has no systematic way of seeing risks before they become problems | Collapsed with items 2 and 3 into single primary issue | Risk Framework | Mike confirmed | Locked |
| 2 | Over-reliance on insurance — the default response to risk is to insure it rather than actively avoid or reduce exposure | Collapsed with items 1 and 3 into single primary issue | Risk Framework | Mike confirmed | Locked |
| 3 | Poorly defined risk assessment — no framework for understanding probability of a risk occurring versus the financial consequence if it does | Collapsed with items 1 and 2 into single primary issue | Risk Framework | Mike confirmed | Locked |

*Collapse justified: all three items are different symptoms of the same structural gap — the business has no risk management framework. Regardless of which symptom presents first, the advisory engagement is the same: design and implement a risk identification, assessment, and mitigation process.*

#### Solution Categories — Workshop 2
*Not yet started.*

---

### Domain 11: Succession Planning

**Domain purpose:** Identify whether the business owner has a viable succession pathway, has resolved personal and family barriers to transition, and has defined a meaningful life beyond the business. Routes to coaching, facilitation, and succession planning interventions.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | Owner has no defined life after work — fear of losing purpose or status causes them to undermine or delay succession activities |
| 2 | Business scale or profitability insufficient to support both withdrawing owners and incoming successors — the numbers don't work for a clean transition |
| 3 | Sibling or family inequality — emotions and family dynamics driving role appointments and business decisions instead of capability or business need |
| 4 | No clear succession pathway — a general idea exists but no executable plan with defined steps, timelines, or accountabilities |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Resulting Primary Issue | Basis | Status |
|---|---|---|---|---|---|
| 1 | Owner has no defined life after work — fear of losing purpose or status causes them to undermine or delay succession activities | Label updated — "Identity" replaced with "Status" to match original Workshop 1 language | Owner Purpose & Status | Mike confirmed — 2026-06-03 | Locked |
| 2 | Business scale or profitability insufficient to support both withdrawing owners and incoming successors — the numbers don't work for a clean transition | Reclassified as Symptom — routes to Profitability or Financial Management. Succession reveals the problem; intervention belongs in the domain where the financial issue lives. | — | Mike confirmed | Reclassified — S |
| 3 | Sibling or family inequality — emotions and family dynamics driving role appointments and business decisions instead of capability or business need | Label restored to original Workshop 1 language | Sibling or family inequality | Mike confirmed — 2026-06-03 | Locked |
| 4 | No clear succession pathway — a general idea exists but no executable plan with defined steps, timelines, or accountabilities | Label restored to original Workshop 1 language | No clear succession pathway | Mike confirmed — 2026-06-03 | Locked |

*No flags. Renames are straightforward. Item 2 reclassification confirmed by Mike.*

#### Solution Categories — Workshop 2
*Not yet started.*

---

### Domains 12, 13, 14 — Context Domains

These three domains do not produce primary issues. They are engagement contexts — they describe the type of meeting being held, not a business problem to diagnose. When any of these contexts is active, it overrides the strategy layer (Stage 4) and restricts template selection accordingly.

---

### Domain 12: Conflict Meetings

**Domain purpose:** Handle sessions called specifically to address partner or stakeholder conflict. The advisor's role is mediator, not diagnostician. Normal diagnostic flow is suspended.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | Accumulated tolerance — partners who have avoided difficult conversations for too long eventually reach a breaking point, with resentment built up over past events |
| 2 | Ego, personality, and ethics clash — differences in values, working style, and personal fears combine to create a toxic dynamic between partners |
| 3 | Adversity exposes incompatibility — pressure and hardship reveal how differently partners cope, and what each sees as the other's greatest weakness surfaces at the worst possible moment |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Basis | Status |
|---|---|---|---|---|
| 1 | Accumulated tolerance — partners who have avoided difficult conversations for too long eventually reach a breaking point | Reclassified as Context — meetingContext = conflict | Mike confirmed | Reclassified — Ctx |
| 2 | Ego, personality, and ethics clash — differences in values, working style, and personal fears | Reclassified as Context — meetingContext = conflict | Mike confirmed | Reclassified — Ctx |
| 3 | Adversity exposes incompatibility — pressure and hardship reveal how differently partners cope | Reclassified as Context — meetingContext = conflict | Mike confirmed | Reclassified — Ctx |

*Strategy layer override: facilitation templates selected first. Domain 12 applies only when the meeting has been explicitly called for conflict resolution and the advisor's role is mediator.*

---

### Domain 13: End of Year Meetings

**Domain purpose:** Handle annual compliance review sessions. The advisor's challenge is converting a compliance-focused meeting into a value-add conversation. Not a diagnostic domain.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | Clients treat advice as worthless — heard but not acted on; the meeting is treated as a compliance formality |
| 2 | Accountants mistake compliance comprehension for client value — assuming that because the client understands their tax position, the meeting was meaningful |
| 3 | Knowledge gap blocks the upsell — the advisor wants to offer value-added services but the client lacks foundational understanding to recognise what they need or why they'd pay for it; you cannot ask an uneducated client to make an educated purchase decision |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Basis | Status |
|---|---|---|---|---|
| 1 | Clients treat advice as worthless — heard but not acted on; the meeting is treated as a compliance formality | Reclassified as Context — meetingContext = compliance | Mike confirmed | Reclassified — Ctx |
| 2 | Accountants mistake compliance comprehension for client value | Reclassified as Context — meetingContext = compliance | Mike confirmed | Reclassified — Ctx |
| 3 | Knowledge gap blocks the upsell | Reclassified as Context — meetingContext = compliance | Mike confirmed | Reclassified — Ctx |

*Strategy layer override: education and compliance templates selected first.*

---

### Domain 14: Due Diligence

**Domain purpose:** Handle sessions where a business transaction is in progress. The advisor supports buyer or seller through the due diligence process. Not a diagnostic domain.

#### Original Items — Workshop 1, authored by Mike Barnes, 2026-06-02

| # | Original Item |
|---|---|
| 1 | A transaction is in progress — the seller must prove the business is as good as represented, while the buyer's job is to find everything that was too good to be true before the deal closes |

#### Normalization Decisions — Workshop 1.5, 2026-06-02

| Item # | Original Item | Normalization Action | Basis | Status |
|---|---|---|---|---|
| 1 | A transaction is in progress — the seller must prove the business is as good as represented, while the buyer's job is to find everything that was too good to be true before the deal closes | Reclassified as Context — meetingContext = transaction | Mike confirmed | Reclassified — Ctx |

*Strategy layer override: restricts template selection to due diligence templates only. No operational or advisory templates recommended while a transaction context is active.*

---

## Stage 3 — Routing Groups

### What This Stage Does
Using the primary issue identified in Stage 2, the system assigns an internal routing group — a classification code that narrows the template pool to only the templates relevant to that class of intervention. The routing group is an internal implementation detail. Advisors never see it. It exists solely to prevent cross-domain template contamination.

### Why This Stage Exists
Before this stage existed, the system scored all 131 templates simultaneously against the primary issue. This caused cross-domain contamination — a template from the wrong domain could outscore the correct template because it shared downstream symptoms. A live test confirmed this: a customer acquisition problem caused the system to recommend a cash flow diagnostic tool as the top result.

The root cause: a primary issue does not map to a single advisory intervention. "Cost of sales has increased" could lead to supplier review, pricing analysis, margin recovery, cost reduction, or operational efficiency — all valid. Without an intermediate routing layer, scoring has to do the work of both routing and ranking simultaneously, and it fails.

Routing groups solve this by creating a hard boundary. The resolver only scores templates within the assigned routing group. Scoring then only has to rank within a correct pool, not route and rank simultaneously.

### How It Works
The primary issue (Stage 2) maps to one or more routing groups via Table 2. The system uses the active routing group to restrict the template library. Stage 5 scores and ranks within this restricted pool only.

### Design Decisions

**Decision 1 — Routing groups are internal classification codes, not advisory descriptions.**
Routing groups are never shown to advisors. They are implementation detail. Their purpose is routing only — not to describe the advisory work, not to report on methodology, not to guide the advisor.

Naming convention: `RG_[CLASSIFICATION]` — noun classification, no verbs, no prescription.

| Avoid | Use | Reason |
|---|---|---|
| Build outbound marketing system | RG_MARKETING_SYSTEMS | Activity name — prescribes work |
| Develop sales response scripts | RG_SALES_CAPABILITY | Activity name — prescribes work |
| Assess competitive position | RG_MARKET_POSITION | Activity name — prescribes work |

The naming debate is formally closed. Routing groups are noun classifications with an RG_ prefix. No verb-noun requirements. No readability tests for advisors. Decision recorded 2026-06-03, confirmed by 4 independent engineering reviews.

**Decision 2 — Domain scoping by default.**
Each routing group belongs to one domain. A routing group named RG_PERFORMANCE_COACHING could apply to sales, staff, and management — making it impossible for the resolver to distinguish. Domain-scoped routing groups prevent this at the source. Exception: if a routing group genuinely applies to multiple domains with the same templates, it may span domains but requires explicit domain mapping.

**Decision 3 — Granularity target: 15–25 routing groups total across all 11 diagnostic domains.**
Each routing group must map to 3–10 templates. No routing group with more than 15 templates. No routing group mapping to 1–2 templates only.

**Decision 4 — Routing groups are designed before templates are classified.**
Template classification does not begin until routing groups are finalised across all domains.

**Decision 5 — Architecture allows future weighted multi-group routing.**
Today each primary issue maps to one or two routing groups. The architecture must allow a primary issue to eventually map to multiple routing groups with confidence weighting (e.g. 70% RG_COST_MANAGEMENT, 30% RG_PRICING_DISCIPLINE). This is not built now but must not be prevented by the current design.

### The 4-Table Governance Model

All routing decisions are expressed as data tables. Tables are the source of truth. Code executes them. Firm managers edit tables — not code.

**Table 1 — Signal Pattern → Primary Issue** (domain expert edits)

Maps structured signals to primary issues using AND/OR logic with required and prohibited signal columns. Free-text AI extraction feeds this table — it does not replace it.

| Rule ID | Domain | Logic | Required Signals | Prohibited Signals | Primary Issue |
|---|---|---|---|---|---|
| P001 | Profitability | AND | supplier_cost_pressure, margin_pressure | revenue_growth | Cost of sales has increased |
| P002 | Profitability | OR | discounting_mentioned, price_resistance | — | Excessive discounting eroding margin |
| (all rules to be completed) | | | | | |

**Table 2 — Primary Issue → Routing Group** (domain expert edits)

| Primary Issue | Routing Group | Internal Code |
|---|---|---|
| Cost of sales has increased | Cost Management | RG_COST_MANAGEMENT |
| Excessive discounting eroding margin | Pricing Discipline | RG_PRICING_DISCIPLINE |
| Sales Revenue | Revenue Growth | RG_REVENUE_GROWTH |
| (all primary issues to be mapped) | | |

**Table 3 — Strategy Resolution** (firm manager edits)

| Staircase | Confidence | Context | Engagement Type | Complexity Ceiling |
|---|---|---|---|---|
| Step 1 | Low | Standard | Education | Step 1 only |
| Step 2 | Medium | Standard | Education | Step 1–2 |
| Step 3 | Medium | Standard | Facilitation | Step 1–3 |
| Step 4 | High | Standard | Advice | Step 1–4 |
| Step 5 | High | Standard | Advice | All |
| Any | Any | Conflict | Facilitation | Override |
| Any | Any | Compliance | Education | Override |
| Any | Any | Transaction | Advice | Due diligence only |
| (confidence constraints and stretch rules to be added) | | | | |

**Table 4 — Template Eligibility** (firm manager edits)

| Routing Group | Engagement Type | Complexity Ceiling | Template IDs | Exclude When |
|---|---|---|---|---|
| RG_SALES_PROCESS | Education | Step 1–2 | [to be done — template classification not yet run] | |
| RG_SALES_PROCESS | Facilitation | Step 3–4 | [to be done] | |
| RG_SALES_CAPABILITY | Education | Step 1–2 | [to be done] | client_already_tried: sales_scripting |
| (all routing groups × engagement types × complexity levels to be completed) | | | | |

### Who Sees What

| Audience | What They See | Can Edit |
|---|---|---|
| Advisors | Primary Issue + Recommended Templates + AI Narrative | No |
| Firm managers | Primary Issue + Routing Group + Template Pool in audit view | Table 3, Table 4 only |
| Auditors and designers | Full causal chain (see below) + all four tables | Tables 1–4 |

### The Causal Audit Chain — Required for Every Recommendation

Every recommendation must produce an inspectable causal chain. Without this there is no audit — only a log.

```
Advisor described: "[free text from Q1, Q3, or Q14]"
  ↓ AI extraction → structured signal
Signal detected: [signal name and value]
  ↓ Table 1 rule [Rule ID] matched
Primary Issue: [primary issue label]
  ↓ Table 2 mapping
Routing Group: [RG_CODE] — [human-readable name]
  ↓ Table 3 rule — [staircase] + [confidence] + [context]
Engagement: [type], Complexity ceiling [level]
  ↓ Table 4 — highest scoring templates within [RG_CODE] + [engagement] + [ceiling]
Templates: [template names]
  ↓ Exclusions applied: [any exclusions from Q14 or context]
Final template pool: [template names]
```

A firm manager who believes the wrong templates were recommended opens:
- Table 4 to change the template pool for a routing group + strategy combination
- Table 2 to change which routing group a primary issue maps to
- Table 1 to adjust signal pattern logic if classification is wrong

No scenario requires code changes.

### Current Status

| Domain | Routing Groups | Status |
|---|---|---|
| Domain 4 — Sales & Marketing | 7 routing groups across 4 primary issues | Complete — locked |
| All other diagnostic domains | Not yet started | Pending |
| Table 1 — Signal → Primary Issue | Partially designed | Signals and primary issues locked; AND/OR rules not yet built |
| Table 2 — Primary Issue → Routing Group | Domain 4 complete | All other domains pending |
| Table 3 — Strategy Resolution | Design locked | Specific row values to be confirmed |
| Table 4 — Template Eligibility | Not yet built | Requires routing groups complete across all domains and templates classified |

### Why This Is Robust
Confirmed by 4 independent engineering reviews (2 external panels, 2 counter-argument responses), 2026-06-03. The intermediate routing layer correctly solves the cross-domain contamination problem. Position B (direct routing without this layer) was unanimously rejected — complexity migrates into template tags and the audit trail becomes unreadable. The 4-table governance model ensures every routing decision is visible, editable, and traceable without code changes.

---

## Stage 4 — Strategy Resolution

### What This Stage Does
Before any template is selected, the system determines how the advisory engagement should be structured — what type of engagement it is, how complex the recommended tools can be, how many templates to include, and what order they should be delivered in.

### Why This Stage Exists
Template quality is only one part of a good recommendation. An advisor working with a Step 1 client (new advisory relationship, low trust) should not receive the same engagement structure as a Step 4 client (established relationship, strategic advisory). The strategy layer enforces these constraints before templates are considered — so the resolver never has to break them.

### How It Works
The strategy layer receives the primary issue (Stage 2) and solution category (Stage 3), combined with the advisor profile information captured in Stage 1. It applies deterministic rules — no AI — and outputs a strategy decision: engagement type, complexity ceiling, template budget, and sequencing rules.

### Design Decisions

**Decision 1 — All strategy decisions are deterministic. No AI.**
Engagement type, complexity ceiling, template budget, and sequencing rules are determined by code using fixed rules. AI is not used for any of these decisions. These are structural constraints that must be enforced consistently. AI-generated strategy decisions are inconsistent and cannot be audited.

**Decision 2 — Three engagement types derived from the advisory relationship, not the problem.**
Education — client needs to understand before they can act.
Facilitation — advisor guides client through a process or decision.
Advice — advisor recommends specific actions.
Derived from: advisory staircase position, client awareness level, client capability to act.

**Decision 3 — The advisory staircase sets the complexity ceiling only.**
The staircase (Step 1–5) determines the upper limit of template complexity that can be recommended. It does not determine engagement type. These are independent variables. A Step 2 relationship may still require facilitation rather than education depending on context.

**Decision 4 — Advisor constraints apply before template selection.**
If the advisor rates their confidence as low in this domain, the system reduces the complexity ceiling. If the advisor indicates willingness to stretch, the constraint is lifted. These adjustments happen in the strategy layer before any template is scored.

**Decision 5 — Firm manager overrides apply at this layer.**
Firms can set custom rules that override the base strategy decisions for their advisors. Firm overrides sit on top of base platform rules and do not replace them.

### Current Status

| Item | Status |
|---|---|
| Strategy layer design | Locked |
| Code implementation | Not yet built — Phase C |
| Firm override layer | Designed, not yet built |

### Why This Is Robust
Deterministic strategy decisions were confirmed by two external senior engineering panels as the correct architectural decision. Strategy decisions made by AI are the primary cause of inconsistent recommendations in advisory systems. Moving them to deterministic code with defined rules makes the system auditable, testable, and consistent.

---

## Stage 5 — Template Selection

### What This Stage Does
Using the solution category (Stage 3) and strategy decision (Stage 4), the system selects the most relevant templates from the advisory library and ranks them. The output is a scored list of real template names with the rationale for each selection.

### Why This Stage Exists
Template selection was previously handled inside the AI recommendation call — the AI chose templates at the same time as it wrote the recommendation. This made selection unauditable, inconsistent, and prone to hallucination (the AI invented template names that did not exist in the library). Moving selection into code before the AI is involved produces deterministic, auditable, and trustworthy template recommendations.

### How It Works
The resolver filters the template library to only the candidates classified under the active solution category. It then scores and ranks those candidates based on the match between the client's situation and each template's purpose. The highest-scoring templates within the complexity ceiling and template budget are passed to Stage 6. If no template meets the criteria, the system reports a gap explicitly — it does not fall back silently to an unrelated template.

### Design Decisions

**Decision 1 — Template selection happens entirely in code. No AI.**
The AI at Stage 6 receives a pre-selected list. It cannot choose from a pool, substitute one template for another, or add templates not in the list.

**Decision 2 — Matching order: title, then tags, then purpose.**
Templates are scored in this order: title directly names the situation or problem → tags match signals from the client's case → purpose field matches the advisory objective.

**Decision 3 — Ghost names are blocked.**
A ghost name is a template name that appears in a recommendation but does not exist in the template library. The system validates every selected template against the library before passing it to Stage 6. Any ghost name is rejected and logged as a gap.

**Decision 4 — Firm-specific templates compete alongside platform templates.**
When a firm has uploaded their own templates, those templates are scored alongside the platform library. Firm templates must earn their selection through scoring — they are not given automatic priority.

### Current Status

| Item | Status |
|---|---|
| Template selection design | Locked |
| Code implementation | Not yet built — Phase D |
| Template classification — assigning all 131 templates to solution categories | Not yet started — requires Stage 3 complete across all domains |
| Gap detection audit | Not yet started — will run as part of template classification |

### Why This Is Robust
Separating template selection from AI narrative generation eliminates the most common failure mode in AI advisory systems — template hallucination. The design was confirmed by two external senior engineering panels. The ghost name validator already built as a startup check confirms the pattern is sound.

---

## Stage 6 — AI Narrative

### What This Stage Does
The AI receives the pre-selected templates from Stage 5, together with a summary of the client's situation and the content of each template. It writes a clear, advisor-ready recommendation in plain language. This is the only stage where AI is used for generation.

### Why This Stage Exists
Templates and strategy are selected by code in Stages 3–5. What remains is communication — turning a structured decision into a recommendation an advisor can understand and act on immediately. This is where AI adds genuine value: writing clear, contextual, actionable copy.

### What the AI Cannot Do at This Stage
- Select templates not in the pre-selected list
- Substitute one template for another
- Add templates not provided to it
- Change the engagement type or sequencing determined in Stage 4
- Infer facts about the advisor or client that were not explicitly provided

### Design Decisions

**Decision 1 — AI writes copy only. No structural decisions.**
All decisions about what is wrong (Stage 2), what type of work is needed (Stage 3), how the engagement is structured (Stage 4), and which tools to use (Stage 5) have been made before the AI is involved.

**Decision 2 — The prompt is structural, not topical.**
The AI receives five structural rules that apply regardless of domain or situation. Domain-specific instructions are not embedded in the prompt — they are handled by the structure of the input (solution category, selected templates, case summary). This keeps the prompt short (target: under 8,000 tokens) and prevents the AI from following topic-specific rules that conflict with structural ones.

**Decision 3 — Hallucination prevention is structural, not instructional.**
Telling the AI "do not invent template names" is less reliable than ensuring the AI receives a finite list of real template names as its only options. Stage 5 provides that list. The AI writes about the pre-selected templates only — it does not choose from the library.

### Current Status

| Item | Status |
|---|---|
| AI narrative design | Locked |
| Code implementation | Basic version exists — requires rebuild after Stage 5 is complete — Phase E |
| Prompt simplification | Designed, not yet implemented |

### Why This Is Robust
Restricting the AI to a single task — writing copy about pre-selected templates — dramatically reduces the failure surface. AI systems fail when given multiple tasks simultaneously (selection, ranking, writing, format compliance). The design separation confirmed by two external senior engineering panels ensures the AI has one job with clear boundaries.

---

## Global Status Summary

### Stage Completion

| Stage | Description | Design Status | Build Status |
|---|---|---|---|
| Stage 1 | Conversation & Signal Capture | Locked | Partial — stub domain questions outstanding for 9 domains |
| Stage 2 | Primary Issue Classification | Complete — all flags resolved 2026-06-03 | Not yet built — Phase B and C |
| Stage 3 | Routing Groups | In progress — Domain 4 complete, 10 domains remaining | Not yet built — Phase D |
| Stage 4 | Strategy Resolution | Locked | Not yet built — Phase C |
| Stage 5 | Template Selection | Locked | Not yet built — Phase D |
| Stage 6 | AI Narrative | Locked | Partial — requires Stages 3–5 complete — Phase E |

### Stage 2 — Outstanding Flags Requiring Domain Expert Decision

| # | Domain | Flag | Decision Needed |
|---|---|---|---|
| 1 | Profitability & Feasibility | Cost Structure merges two distinct items — cost of sales has increased (item 1) and fixed overhead costs grown beyond revenue (item 4) | RESOLVED 2026-06-03 — Split into Cost of Sales Increase and Fixed Costs Increase. Mike confirmed. |
| 2 | Profitability & Feasibility | Revenue label — one word for a specific original item | RESOLVED 2026-06-03 — Renamed to Sales Revenue. Mike confirmed. |
| 3 | Staff | Workforce Capability merges inexperienced staff (item 2) and no internal training structures (item 3) | RESOLVED 2026-06-03 — Two distinct primary issues confirmed. Mike confirmed. |
| 4 | Staff | Items 4 and 5 — poor management practices and poor communication and feedback | RESOLVED 2026-06-03 — Merged as one primary issue: "Poor management practices — weak communication, feedback and formal discipline". Mike confirmed. |
| 4b | Staff | Item 6 — roles and responsibilities poorly defined | RESOLVED 2026-06-03 — Confirmed as distinct primary issue. Mike confirmed. |
| 5a | Data | Items 1 and 2 merged — no data capture methods and poor data integrity | RESOLVED 2026-06-03 — Two distinct primary issues. Data capture = process problem. Data integrity = technology problem. Mike confirmed. |
| 5b | Data | Lack of financial controls (item 3) placed alongside data capture and data integrity | RESOLVED 2026-06-03 — Relocated to Domain 6 (Governance & Leadership). Financial authority decisions are governance, not data. Mike confirmed. |
| 5c | Data | Items 4 and 5 merged — lag indicator data and narrow data spread | RESOLVED 2026-06-03 — Two distinct primary issues confirmed. Mike confirmed. |
| 6 | Financial Management | Financial Structure merges over-trading (item 3) and cost structure imbalance (item 4) | RESOLVED 2026-06-03 — Two distinct primary issues. Over-trading = deliberate risk position. Cost structure imbalance = knowledge gap from poor data. Mike confirmed. |
| 7a | Governance & Leadership | Items 2 and 3 merged — poor decision quality and weak accountability documentation | RESOLVED 2026-06-03 — Two distinct primary issues. Decision quality = skills/methodology gap. Weak communication = social/cultural coded behaviour problem. Mike confirmed. |
| 7b | Governance & Leadership | Items 4 and 5 merged — culture left to chance and personality and skill diversity not actively pursued | RESOLVED 2026-06-03 — Two distinct primary issues. Culture = values/behaviour design. Personality diversity = specialist engagement requiring personality type knowledge. Mike confirmed. |
| 8 | Sales & Marketing | Marketing Foundation merges poor outbound messaging and lack of marketing systems (item 7), no defined target market personas (item 8), and no defined marketing statements (item 10) | RESOLVED 2026-06-03 — Confirmed as one primary issue. Three components of the same marketing problem: who, what, when and how often. Mike confirmed. |

### Build Sequence

The system is built in five phases. Each phase depends on the previous.

| Phase | What Gets Built | Depends On |
|---|---|---|
| Phase A | Observability — structured logging of every pipeline decision per session | Nothing — built first so failures can be diagnosed |
| Phase B | Domain-specific questions for 9 outstanding domains | Stage 2 flags resolved |
| Phase C | Strategy Resolution in code — Stage 4 | Stage 2 complete, Phase B done |
| Phase D | Template Selection in code — Stage 5 — plus template classification across all domains | Stage 3 complete, Phase C done |
| Phase E | AI Narrative simplification — Stage 6 | Phase D done |
