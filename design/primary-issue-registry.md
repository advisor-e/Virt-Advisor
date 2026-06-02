# Primary Issue Registry — Virt Advisor

**Version:** 1.0 — 2026-06-03
**Status:** In progress — Domains 1 and 4 flagged for review. Domain 4 Workshop 2 complete.
**Purpose:** Single source of truth for all primary issues across all 14 advisory domains. Shows every original item, every normalization decision, every solution category, and every outstanding flag. Replaces workshop documents as the working reference.

---

## How to Use This Document

This document records every stage of the decision logic from raw domain expert input through to solution categories. It is designed to be readable and editable by a firm manager without engineering knowledge.

- **To understand why something was classified a certain way** — read the Normalization Basis column
- **To challenge a classification** — flag the row as Needs Review and note the reason
- **To add a new primary issue** — add a row to the relevant domain table with Status = Proposed
- **To add a solution category** — add a row to the Workshop 2 table for the relevant domain

---

## Where This Fits in the Pipeline

```
Domain (advisory area)
    ↓
Primary Issue (the structural problem — this document)
    ↓
Solution Category (the type of advisory work — Workshop 2)
    ↓
Templates (the specific tool recommended — Workshop 3)
```

Primary issues are the foundation of the entire recommendation engine. If a primary issue is wrong, vague, or missing, every downstream stage — solution categories, template selection, and the AI recommendation — will be built on a false premise.

---

## Status Legend

| Status | Meaning |
|---|---|
| Locked | Confirmed by domain expert. No changes without explicit review. |
| Needs Review | Flagged — normalization may have assumed too much. Requires domain expert confirmation. |
| Proposed | New item suggested but not yet confirmed. |
| Reclassified — S | Reclassified as Symptom. Not a primary issue — routes to another domain or probes for cause. |
| Reclassified — Ctx | Reclassified as Context. Not a diagnostic issue — overrides strategy layer (Layer 3). |
| Relocated | Moved to a different domain where intervention is better handled. |

## Normalization Basis Legend

| Basis | Meaning |
|---|---|
| Mike confirmed | Domain expert explicitly agreed to this classification |
| Assumed — acceptable | Single item renamed to a label. Low risk of distortion. |
| Assumed — flagged | Multiple items merged under one label, or label significantly departs from original language. Requires Mike review. |

---

## Domain 1: Profitability & Feasibility

**Domain purpose:** Identify whether the business is generating sufficient profit and whether the current business model is viable. This domain routes to cost, pricing, revenue, and feasibility interventions.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | Cost of sales has increased — materials, labour, supplier costs eating into margin |
| 2 | Excessive discounting eroding margin — pricing confidence or competitive pressure |
| 3 | Low sales volume pulling profit down — revenue is the constraint, not cost |
| 4 | Fixed overhead costs grown beyond what revenue can support |
| 5 | Asset utilisation below viability threshold — the numbers don't stack up |
| 6 | Finance strain — funding structure or repayment creating pressure |
| 7 | Asset realisation or venture extraction — owner needs to understand what they can get out or how to exit the risk |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Resulting Primary Issue | Normalization Basis | Status |
|---|---|---|---|---|
| 1 | Merged with item 4 under cluster label | Cost Structure | Assumed — flagged | Needs Review |
| 4 | Merged with item 1 under cluster label | Cost Structure | Assumed — flagged | Needs Review |
| 2 | Renamed | Pricing & Margins | Assumed — acceptable | Locked |
| 3 | Renamed | Revenue | Assumed — acceptable | Locked |
| 5 | Renamed | Feasibility | Assumed — acceptable | Locked |
| 6 | Reclassified as Symptom | — | Mike confirmed | Reclassified — S |
| 7 | Reclassified as Context | — | Mike confirmed | Reclassified — Ctx |

**Flag — Cost Structure:** Items 1 and 4 were merged under a vague cluster label during normalization. These are materially different issues with different intervention pathways:
- Item 1 (cost of sales) → advisor works on margins per job, supplier costs, delivery efficiency
- Item 4 (fixed overhead) → advisor works on lease, wages structure, fixed commitments

These should be two separate primary issues. Requires Mike confirmation.

**Flag — Revenue:** "Revenue" is a one-word label for a specific item. Low risk of distortion but worth confirming the label is specific enough to route correctly.

### Step 3 — Solution Categories (Workshop 2)

*Domain 1 Workshop 2 not yet started — pending resolution of Cost Structure flag.*

---

## Domain 2: Staff

**Domain purpose:** Identify whether the business has the right people, in the right roles, with the right capability, managed effectively. Routes to workforce, training, management, and hiring interventions.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | Too few qualified staff — insufficient headcount to meet demand |
| 2 | Inexperienced or insufficiently trained staff — capability gap in the existing team |
| 3 | No internal training structures — no system for building capability over time |
| 4 | Poor management practices — weak coaching and accountability from leadership |
| 5 | Poor communication and feedback standards — team isn't getting the information or direction it needs |
| 6 | Roles and responsibilities poorly defined — people don't know what they own |
| 7 | Weak hiring practices — no structured process for bringing the right people in |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Resulting Primary Issue | Normalization Basis | Status |
|---|---|---|---|---|
| 1 | Renamed | Workforce Capacity | Assumed — acceptable | Locked |
| 2 | Merged with item 3 under cluster label | Workforce Capability | Assumed — flagged | Needs Review |
| 3 | Merged with item 2 under cluster label | Workforce Capability | Assumed — flagged | Needs Review |
| 4 | Merged with items 5 and 6 under cluster label | Management Effectiveness | Assumed — flagged | Needs Review |
| 5 | Merged with items 4 and 6 under cluster label | Management Effectiveness | Assumed — flagged | Needs Review |
| 6 | Merged with items 4 and 5 under cluster label | Management Effectiveness | Assumed — flagged | Needs Review |
| 7 | Renamed | Talent Acquisition | Assumed — acceptable | Locked |

**Flag — Workforce Capability:** Items 2 and 3 were merged. Question: is "staff are inexperienced" the same advisory engagement as "there is no training system"? The first may lead to an immediate capability intervention; the second to a structural training design. May be distinct primary issues.

**Flag — Management Effectiveness:** Items 4, 5, and 6 were merged. These three may be distinct:
- Item 4 (poor management practices) → coaching and accountability design
- Item 5 (poor communication) → communication framework
- Item 6 (poorly defined roles) → role clarity and RACI design
Requires Mike confirmation on whether these drive different advisory engagements or can share one.

### Step 3 — Solution Categories (Workshop 2)

*Domain 2 Workshop 2 not yet started.*

---

## Domain 3: Data

**Domain purpose:** Identify whether the business has reliable data, appropriate financial controls, and the right mix of lead and lag indicators. Routes to data capture, integrity, controls, and reporting interventions.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | No enforceable data capture methods — data either isn't being collected or there's no system to ensure it is |
| 2 | Poor data integrity — over-reliance on manual input creating errors and unreliable numbers |
| 3 | Lack of financial controls — no transparency or governance over purchase and sale decisions |
| 4 | Too much lag indicator data, not enough lead indicators — the business is always looking backwards, never forward |
| 5 | Narrow data spread — financial performance tracked but business activities, operational metrics, or inventory effectiveness ignored or underreported |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Resulting Primary Issue | Normalization Basis | Status |
|---|---|---|---|---|
| 1 | Merged with items 2 and 3 under cluster label | Data Reliability | Assumed — acceptable for items 1+2 | Locked (items 1+2) |
| 2 | Merged with items 1 and 3 under cluster label | Data Reliability | Assumed — acceptable for items 1+2 | Locked (items 1+2) |
| 3 | Merged with items 1 and 2 under cluster label | Data Reliability | Assumed — flagged | Needs Review |
| 4 | Merged with item 5 under cluster label | Reporting Quality | Assumed — acceptable | Locked |
| 5 | Merged with item 4 under cluster label | Reporting Quality | Assumed — acceptable | Locked |

**Flag — Financial Controls placement:** Item 3 (lack of financial controls) was placed under Data Reliability. Financial controls are a governance issue — they cover purchase and sale decisions, transparency, and accountability. This may belong in Domain 6 (Governance & Leadership) or as its own primary issue within Domain 3. Requires Mike confirmation.

### Step 3 — Solution Categories (Workshop 2)

*Domain 3 Workshop 2 not yet started.*

---

## Domain 4: Sales & Marketing

**Domain purpose:** Identify whether the business has an effective sales process, strong market positioning, a defined target market, and competitive products. Routes to sales, marketing, product, and brand interventions.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

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

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Resulting Primary Issue | Normalization Basis | Status |
|---|---|---|---|---|
| 1 | Reclassified as Symptom | — | Mike confirmed | Reclassified — S |
| 2 | Merged with item 3 under cluster label | Product Market Fit | Mike confirmed | Locked |
| 3 | Merged with item 2 under cluster label | Product Market Fit | Mike confirmed | Locked |
| 4 | Relocated to Domain 8 (Systems) | External Integration | Mike confirmed | Relocated |
| 5 | Merged with item 6 under cluster label | Sales Execution | Mike confirmed | Locked |
| 6 | Merged with item 5 under cluster label | Sales Execution | Mike confirmed | Locked |
| 7 | Merged with items 8 and 10 under cluster label | Marketing Foundation | Assumed — flagged | Needs Review |
| 8 | Merged with items 7 and 10 under cluster label | Marketing Foundation | Assumed — flagged | Needs Review |
| 9 | Renamed | Brand & Positioning | Assumed — acceptable | Locked |
| 10 | Merged with items 7 and 8 under cluster label | Marketing Foundation | Assumed — flagged | Needs Review |

**Flag — Marketing Foundation:** Items 7, 8, and 10 were merged. These three may be distinct:
- Item 7 (outbound messaging + marketing systems) → building marketing infrastructure
- Item 8 (no defined target market personas) → market segmentation and targeting
- Item 10 (no defined marketing statements) → messaging and value proposition design
Requires Mike confirmation on whether these should remain as one primary issue or be split.

### Step 3 — Solution Categories (Workshop 2) — COMPLETE

| Primary Issue | Solution Category | Status |
|---|---|---|
| Sales Execution | Map sales process by selling style | Locked — Mike confirmed |
| Sales Execution | Develop sales response scripts | Locked — Mike confirmed |
| Marketing Foundation | Build outbound marketing system | Locked — Mike confirmed |
| Marketing Foundation | Develop target market messaging | Locked — Mike confirmed |
| Product Market Fit | Assess product market fit | Locked — Mike confirmed |
| Product Market Fit | Assess competitive position | Locked — Mike confirmed |
| Brand & Positioning | Design brand positioning strategy | Locked — Mike confirmed |

---

## Domain 5: Financial Management

**Domain purpose:** Identify whether the business owner has sufficient financial literacy and whether the business's cost and debt structure is sound. Routes to financial education, cost restructuring, and debt/growth management interventions.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | Poor financial literacy — owner focused on wrong numbers, chasing sales volume while ignoring margin or fixed costs |
| 2 | Artisan-over-commercial mindset — business decisions driven by craft or quality pride rather than market demand |
| 3 | Over-trading — growth funded primarily through debt, leaving the business dangerously exposed to economic downturns or competitive pressure |
| 4 | Cost structure imbalance — decisions based on assumptions rather than data, resulting in a cost base that doesn't reflect reality |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Resulting Primary Issue | Normalization Basis | Status |
|---|---|---|---|---|
| 1 | Renamed | Financial Capability | Assumed — acceptable | Locked |
| 2 | Reclassified as Symptom | — | Mike confirmed | Reclassified — S |
| 3 | Merged with item 4 under cluster label | Financial Structure | Assumed — flagged | Needs Review |
| 4 | Merged with item 3 under cluster label | Financial Structure | Assumed — flagged | Needs Review |

**Flag — Financial Structure:** Items 3 and 4 are materially different:
- Item 3 (over-trading) → growth funded through debt; risk of collapse under economic pressure. The intervention is debt restructuring, funding strategy, and growth pacing.
- Item 4 (cost structure imbalance) → cost base doesn't reflect business reality. The intervention is cost analysis and restructuring.
These may require separate primary issues and separate solution categories. Requires Mike confirmation.

### Step 3 — Solution Categories (Workshop 2)

*Domain 5 Workshop 2 not yet started — pending resolution of Financial Structure flag.*

---

## Domain 6: Governance & Leadership

**Domain purpose:** Identify whether the business has effective leadership, sound decision-making processes, healthy culture, and appropriate team composition. Routes to conflict facilitation, decision framework, culture, and governance interventions.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | Poor boardroom dynamics or partner/owner disputes — conflict or misalignment at the top affecting the business |
| 2 | Poor decision quality — no structured process for making and committing to decisions |
| 3 | Weak communication of expectations with no documentation — people aren't held accountable because nothing is written down, and certain personality types avoid confrontation |
| 4 | Culture left to chance — no deliberate effort to define and shape what the business stands for |
| 5 | Personality and skill diversity not actively pursued — team not built for complementary strengths; ideology substituted for performance-driven thinking |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Resulting Primary Issue | Normalization Basis | Status |
|---|---|---|---|---|
| 1 | Renamed | Partner Dynamics | Assumed — acceptable | Locked |
| 2 | Merged with item 3 under cluster label | Decision & Accountability | Assumed — acceptable | Locked |
| 3 | Merged with item 2 under cluster label | Decision & Accountability | Assumed — acceptable | Locked |
| 4 | Merged with item 5 under cluster label | Culture & Composition | Assumed — flagged | Needs Review |
| 5 | Merged with item 4 under cluster label | Culture & Composition | Assumed — flagged | Needs Review |

**Flag — Culture & Composition:** Items 4 and 5 may drive distinct engagements:
- Item 4 (culture left to chance) → values definition, culture design, team norms
- Item 5 (skill diversity not pursued) → hiring philosophy, team composition strategy, board design
Requires Mike confirmation on whether these should remain merged.

### Step 3 — Solution Categories (Workshop 2)

*Domain 6 Workshop 2 not yet started.*

---

## Domain 7: Strategy & Planning

**Domain purpose:** Identify whether the business has a viable model, clear objectives, and communicated direction. Routes to business model review, metrics design, and strategic planning interventions.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | Lack of clarity or belief that the current business model will remain competitive — owner isn't sure the business has a viable future in its current form |
| 2 | Poor business metrics or undefined operational objectives — no clear targets means inefficient or ineffective activities continue unchallenged |
| 3 | No defined objectives means no communicated direction — leads to low staff engagement or staff anxiety about job security |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Resulting Primary Issue | Normalization Basis | Status |
|---|---|---|---|---|
| 1 | Renamed | Business Model Viability | Assumed — acceptable | Locked |
| 2 | Renamed | Performance Measurement | Assumed — acceptable | Locked |
| 3 | Renamed | Strategic Direction | Assumed — acceptable | Locked |

*No flags. Each original item became one primary issue with a straightforward rename. Items 2 and 3 are closely related but kept separate as they drive different downstream interventions (metrics design vs direction communication).*

### Step 3 — Solution Categories (Workshop 2)

*Domain 7 Workshop 2 not yet started.*

---

## Domain 8: Systems

**Domain purpose:** Identify whether the business has defined, reviewed, and integrated operational processes — both internally and with external supply chains. Routes to process design, review, integration, and supply chain interventions.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | Processes are either undefined or over-engineered — both result in tasks being done ineffectively or inconsistently |
| 2 | No regular structured review of practices — the business never stops to ask whether what it's doing is working or could be improved |
| 3 | Siloed operations — departments or people working independently with no coordination, creating gaps, duplication, and miscommunication |

*Item 4 below was relocated from Domain 4 (Sales & Marketing) during Workshop 1.5 normalization:*

| # | Relocated Item |
|---|---|
| 4 | Supply line disruptions or poor quality controls — delivery problems undermining sales *(originally Domain 4, item 4)* |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Resulting Primary Issue | Normalization Basis | Status |
|---|---|---|---|---|
| 1 | Renamed | Process Definition | Assumed — acceptable | Locked |
| 2 | Renamed | Process Review | Assumed — acceptable | Locked |
| 3 | Renamed | Internal Integration | Assumed — acceptable | Locked |
| 4 (relocated) | Renamed | External Integration | Mike confirmed (relocation rationale: if supply failure is the operational root cause, Systems domain handles it) | Locked |

*No flags. All renames are straightforward. Relocation of item 4 was confirmed by domain expert.*

### Step 3 — Solution Categories (Workshop 2)

*Domain 8 Workshop 2 not yet started.*

---

## Domain 9: Valuation

**Domain purpose:** Identify whether the business is positioned to support a credible valuation for sale, partnership, or financing. Routes exclusively to transaction readiness interventions.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | Inconsistent financial performance reducing the capitalised future earnings component — unreliable earnings history lowers what a buyer will pay |
| 2 | Asset values unsubstantiated — assets on the books aren't supported by current independent evidence |
| 3 | Stock and work in progress figures inflated — inventory or WIP carried at values that don't reflect reality |
| 4 | Goodwill calculations driven by market growth assumptions rather than the debt-servicing capacity of the business — valuation built on what the market might do, not what a buyer can actually finance |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Resulting Primary Issue | Normalization Basis | Status |
|---|---|---|---|---|
| 1 | Collapsed into single primary issue | Transaction Readiness | Mike confirmed | Locked |
| 2 | Collapsed into single primary issue | Transaction Readiness | Mike confirmed | Locked |
| 3 | Collapsed into single primary issue | Transaction Readiness | Mike confirmed | Locked |
| 4 | Collapsed into single primary issue | Transaction Readiness | Mike confirmed | Locked |

*Collapse justified: all four items accumulate inside the same advisory objective — produce a credible valuation. No item drives a separate intervention pathway. When Transaction Readiness fires, strategy layer restricts template selection to valuation and sale preparation templates only.*

### Step 3 — Solution Categories (Workshop 2)

*Domain 9 Workshop 2 not yet started.*

---

## Domain 10: Risk Management

**Domain purpose:** Identify whether the business has a systematic process for identifying, assessing, and mitigating risk. Routes to risk framework design interventions.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | No process to identify and mitigate risks — the business has no systematic way of seeing risks before they become problems |
| 2 | Over-reliance on insurance — default response to risk is to insure it rather than actively avoid or reduce exposure |
| 3 | Poorly defined risk assessment — no framework for understanding probability of a risk occurring versus the financial consequence if it does |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Resulting Primary Issue | Normalization Basis | Status |
|---|---|---|---|---|
| 1 | Collapsed into single primary issue | Risk Framework | Mike confirmed | Locked |
| 2 | Collapsed into single primary issue | Risk Framework | Mike confirmed | Locked |
| 3 | Collapsed into single primary issue | Risk Framework | Mike confirmed | Locked |

*Collapse justified: all three items are different symptoms of the same structural gap — the business has no risk management framework. The advisory engagement is the same regardless of which symptom presents first: design and implement a risk identification and assessment process.*

### Step 3 — Solution Categories (Workshop 2)

*Domain 10 Workshop 2 not yet started.*

---

## Domain 11: Succession Planning

**Domain purpose:** Identify whether the business owner has a viable succession pathway, has resolved family or personal barriers to transition, and has defined a life beyond the business. Routes to coaching, facilitation, and succession planning interventions.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | Owner has no defined life after work — fear of losing purpose or status causes them to undermine or delay succession activities |
| 2 | Business scale or profitability insufficient to support both withdrawing owners and incoming successors — the numbers don't work for a clean transition |
| 3 | Sibling or family inequality — emotions and family dynamics driving role appointments and business decisions instead of capability or business need |
| 4 | No clear succession pathway — a general idea exists but no executable plan with defined steps, timelines, or accountabilities |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Resulting Primary Issue | Normalization Basis | Status |
|---|---|---|---|---|
| 1 | Renamed | Owner Purpose & Identity | Assumed — acceptable | Locked |
| 2 | Reclassified as Symptom | — | Mike confirmed | Reclassified — S |
| 3 | Renamed | Family Dynamics | Assumed — acceptable | Locked |
| 4 | Renamed | Succession Pathway | Assumed — acceptable | Locked |

*Item 2 reclassified as Symptom: insufficient business scale or profitability reveals the issue, but the intervention belongs in Profitability or Financial Management — not Succession. Succession planning cannot proceed until the financial viability problem is resolved.*

### Step 3 — Solution Categories (Workshop 2)

*Domain 11 Workshop 2 not yet started.*

---

## Domains 12, 13, 14 — Context Domains (Not Diagnostic)

These domains do not produce primary issues. They are engagement contexts that override the strategy layer (Layer 3). They are not routed through the primary issue → solution category → template pathway.

---

## Domain 12: Conflict Meetings

**Domain purpose:** Handle sessions where the meeting has been called specifically to address partner or stakeholder conflict. The advisor's role is mediator, not diagnostician.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | Accumulated tolerance — partners who have avoided difficult conversations for too long eventually reach a breaking point, with resentment built up over past events |
| 2 | Ego, personality, and ethics clash — differences in values, working style, and personal fears combine to create a toxic dynamic between partners |
| 3 | Adversity exposes incompatibility — pressure and hardship reveal how differently partners cope, and what each sees as the other's greatest weakness surfaces at the worst possible moment |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Normalization Basis | Status |
|---|---|---|---|
| 1 | Reclassified as Context — meetingContext = "conflict" | Mike confirmed | Reclassified — Ctx |
| 2 | Reclassified as Context — meetingContext = "conflict" | Mike confirmed | Reclassified — Ctx |
| 3 | Reclassified as Context — meetingContext = "conflict" | Mike confirmed | Reclassified — Ctx |

*These items describe why the conflict meeting is happening, not a business problem to diagnose. Strategy layer override: facilitation templates first. Domain 12 applies only when meeting is explicitly called for conflict resolution and advisor's role is mediator.*

---

## Domain 13: End of Year Meetings

**Domain purpose:** Handle compliance review sessions. The advisor's challenge is converting a compliance meeting into a value-add conversation. Not a diagnostic domain.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | Clients treat advice as worthless — heard but not acted on; the meeting is a compliance formality |
| 2 | Accountants mistake compliance comprehension for client value — assuming that because the client understands their tax position, the meeting was meaningful |
| 3 | Knowledge gap blocks the upsell — the advisor wants to offer value-added services but the client lacks foundational understanding to recognise what they need or why they'd pay for it |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Normalization Basis | Status |
|---|---|---|---|
| 1 | Reclassified as Context — meetingContext = "compliance" | Mike confirmed | Reclassified — Ctx |
| 2 | Reclassified as Context — meetingContext = "compliance" | Mike confirmed | Reclassified — Ctx |
| 3 | Reclassified as Context — meetingContext = "compliance" | Mike confirmed | Reclassified — Ctx |

*These items describe the advisor's challenge in the meeting, not a business problem to diagnose. Strategy layer override: education and compliance templates first.*

---

## Domain 14: Due Diligence

**Domain purpose:** Handle sessions where a transaction is in progress. Advisor role switches to supporting either buyer or seller through the due diligence process.

### Step 1 — Original Items (Workshop 1, authored by Mike Barnes)

| # | Original Item |
|---|---|
| 1 | A transaction is in progress — the seller must prove the business is as good as represented, while the buyer's job is to find everything that was too good to be true before the deal closes |

### Step 2 — Normalization Decisions (Workshop 1.5)

| Original Item # | Normalization Action | Normalization Basis | Status |
|---|---|---|---|
| 1 | Reclassified as Context — meetingContext = "transaction" | Mike confirmed | Reclassified — Ctx |

*Strategy layer override: restricts to due diligence templates only. No mixing with operational templates.*

---

## Global Summary

### Primary Issue Status by Domain

| Domain | Original Items | Locked Primary Issues | Needs Review | Reclassified S | Reclassified Ctx | Relocated | Workshop 2 Status |
|---|---|---|---|---|---|---|---|
| 1 — Profitability & Feasibility | 7 | 3 | 2 (Cost Structure split) | 1 | 1 | 0 | Not started — pending review |
| 2 — Staff | 7 | 2 | 2 (Capability, Effectiveness) | 0 | 0 | 0 | Not started — pending review |
| 3 — Data | 5 | 4 | 1 (controls placement) | 0 | 0 | 0 | Not started — pending review |
| 4 — Sales & Marketing | 10 | 6 | 1 (Marketing Foundation split) | 1 | 0 | 1 | Complete |
| 5 — Financial Management | 4 | 1 | 1 (Financial Structure split) | 1 | 0 | 0 | Not started — pending review |
| 6 — Governance & Leadership | 5 | 3 | 1 (Culture & Composition) | 0 | 0 | 0 | Not started — pending review |
| 7 — Strategy & Planning | 3 | 3 | 0 | 0 | 0 | 0 | Not started |
| 8 — Systems | 3 + 1 relocated | 4 | 0 | 0 | 0 | 0 | Not started |
| 9 — Valuation | 4 | 1 (collapsed) | 0 | 0 | 0 | 0 | Not started |
| 10 — Risk Management | 3 | 1 (collapsed) | 0 | 0 | 0 | 0 | Not started |
| 11 — Succession Planning | 4 | 3 | 0 | 1 | 0 | 0 | Not started |
| 12 — Conflict Meetings | 3 | 0 | 0 | 0 | 3 | 0 | N/A — context domain |
| 13 — End of Year Meetings | 3 | 0 | 0 | 0 | 3 | 0 | N/A — context domain |
| 14 — Due Diligence | 1 | 0 | 0 | 0 | 1 | 0 | N/A — context domain |
| **Total** | **62** | **31** | **8** | **4** | **8** | **1** | |

### Outstanding Flags — Requires Domain Expert Review

| # | Domain | Flag | Decision Needed |
|---|---|---|---|
| 1 | Profitability | "Cost Structure" merges two distinct issues | Split into: "Cost of sales has increased" + "Fixed overhead costs grown beyond revenue" — or confirm as one? |
| 2 | Profitability | "Revenue" label may be too broad | Confirm label is specific enough, or rename to reflect original language |
| 3 | Staff | "Workforce Capability" merges inexperience + no training system | Are these the same advisory engagement or distinct primary issues? |
| 4 | Staff | "Management Effectiveness" merges management practices + communication + role clarity | Are these distinct primary issues or contributors to the same engagement? |
| 5 | Data | "Lack of financial controls" placed under Data Reliability | Does this belong in Data or Governance? Or is it its own primary issue? |
| 6 | Financial Management | "Financial Structure" merges over-trading + cost structure imbalance | Split into two primary issues or confirm as one? |
| 7 | Governance | "Culture & Composition" merges culture design + team diversity | Are these the same advisory engagement or distinct? |
| 8 | Sales & Marketing | "Marketing Foundation" merges outbound messaging + target market personas + marketing statements | Three items — confirm as one primary issue or split? |
