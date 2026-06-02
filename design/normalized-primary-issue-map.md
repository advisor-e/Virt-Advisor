# Normalized Primary Issue Map — Workshop 1.5 Complete

**Status:** Workshop 1.5 complete — 2026-06-02
**Author:** Mike Barnes (domain expert) + engineering team
**Purpose:** CaseState Layer 2 design foundation. Normalized from Workshop 1 output. All entries classified by role and abstraction level. Feeds Workshop 2 (Solution Categories).

---

## Classification Framework

| Role | Definition | Test |
|---|---|---|
| **P — Problem** | Structural condition — valid starting point for advisory engagement | Can an advisor begin an engagement here? |
| **S — Symptom** | Downstream effect — first question is always "what caused this?" | Routes to another domain or probes for cause |
| **Ctx — Context** | Meeting type or advisor action — not a business problem | Moves to Layer 3 Strategy Resolution |
| **C — Constraint** | External limitation affecting solution selection | Restricts what can be recommended |

**Two-stage test applied to all entries:**
1. Engagement-start test (P vs S) — is this valid CaseState input?
2. Intervention pathway test (Primary Issue vs Diagnostic Contributor) — does this drive a distinct advisory engagement, or does it accumulate inside another?

**Key principle:** "Has causes" ≠ Symptom. Everything has causes. The discriminator is whether an advisor can begin a direct intervention here.

---

## Domain 1: Profitability & Feasibility

*Status: Classified — clustering outstanding for Workshop 2.*

| Entry | Role | Notes |
|---|---|---|
| Cost of sales has increased | P | Cost structure intervention |
| Excessive discounting eroding margin | P | Pricing intervention |
| Low sales volume pulling profit down | P* | *Cross-domain flag — P here, S in Sales & Marketing. Resolution rule needed in Workshop 2. |
| Fixed overhead costs grown beyond revenue | P | Cost structure intervention |
| Asset utilisation below viability threshold | P | Feasibility intervention |
| Finance strain | S | Routes to Financial Management |
| Asset realisation / venture extraction | Ctx | Layer 3 meetingContext |

*Clustering pending: 5 P entries expected to produce 3 clusters (Cost Structure, Revenue, Feasibility). Outstanding for Workshop 2.*

---

## Domain 2: Staff

| Primary Issue | Diagnostic Contributors |
|---|---|
| **Workforce Capacity** | Too few qualified staff |
| **Workforce Capability** | Inexperienced / undertrained staff · No internal training structures |
| **Management Effectiveness** | Poor management practices · Poor communication and feedback · Poorly defined roles and responsibilities |
| **Talent Acquisition** | Weak hiring practices |

*Weak hiring practices: S within the flat list — diagnostic contributor under Talent Acquisition*

---

## Domain 3: Data

| Primary Issue | Diagnostic Contributors |
|---|---|
| **Data Reliability** | No enforceable data capture methods · Poor data integrity (manual input reliance) · Lack of financial controls |
| **Reporting Quality** | Too much lag indicator data, not enough lead indicators · Narrow data spread (selective tracking — not exclusively financial) |

---

## Domain 4: Sales & Marketing

| Primary Issue | Diagnostic Contributors |
|---|---|
| **Sales Execution** | No visible sales process · Poor sales training |
| **Marketing Foundation** | Poor outbound messaging / no marketing systems · No defined target market personas · No defined marketing statements |
| **Product Market Fit** | Poor product fit or market acceptance · Product uncompetitive or outdated |
| **Brand & Positioning** | Poor positioning or brand perception |

*Low sales volume → S. Domain-level presenting problem — not a primary issue.*
*Supply line disruptions / quality controls → relocated to Domain 8 (Systems).*

---

## Domain 5: Financial Management

| Primary Issue | Diagnostic Contributors |
|---|---|
| **Financial Capability** | Poor financial literacy |
| **Financial Structure** | Cost structure imbalance · Over-trading |

*Artisan-over-commercial mindset → S. Probes for cause before routing: financial literacy gap? pricing confidence? founder identity? Observable criteria needed.*

*Cross-domain rule: Poor financial literacy = P in Domain 5 (problem to solve). In Domain 13 (End of Year) it becomes a constraint on the advisor's ability to upsell — handled by Layer 3.*

---

## Domain 6: Governance & Leadership

| Primary Issue | Diagnostic Contributors | Complexity |
|---|---|---|
| **Partner Dynamics** | Poor boardroom dynamics / partner disputes | Step 4 |
| **Decision & Accountability** | Poor decision quality · Weak communication / no accountability documentation | Step 3 |
| **Culture & Composition** | Culture left to chance · Personality and skill diversity not actively pursued | Step 3 |

*Domain 12 overlap rule: Partner disputes identified during diagnostic conversation = Governance Domain 6. Formal conflict mediation meeting = Domain 12 meetingContext.*

*Entry note: "Personality and skill diversity not actively pursued" is a governance-level mindset failure starting at owner/board level — not a hiring process failure (Staff domain). It cascades downward; if it's evident in the boardroom it will be evident further down.*

---

## Domain 7: Strategy & Planning

| Primary Issue | Diagnostic Contributors | Signal Type |
|---|---|---|
| **Business Model Viability** | Lack of clarity or belief that the current business model will remain competitive | Belief-based — requires validation |
| **Performance Measurement** | Poor business metrics / undefined operational objectives | Objective |
| **Strategic Direction** | No defined objectives — no communicated direction | Objective |

*Belief-based signals are valid P classifications when the belief itself is the binding constraint on action. Lower confidence than objective signals — requires validation before routing.*

*Generic `strategy_needed` signal flagged for deprecation — replace with granular signals matching primary issues after all domains are classified.*

---

## Domain 8: Systems

| Primary Issue | Diagnostic Contributors | Complexity |
|---|---|---|
| **Process Definition** | Processes undefined or over-engineered | Step 2 |
| **Process Review** | No regular structured review of practices | Step 2 |
| **Internal Integration** | Siloed operations — no coordination | Step 3 |
| **External Integration** | Supply line disruptions / quality controls *(relocated from Sales & Marketing)* | Step 3 |

*Principle established: "Missing system" problems are always P — the fix is building what doesn't exist, not investigating a cause.*

*Entry 4 cross-domain note: Supply line disruptions can surface in Risk Management or Sales & Marketing depending on context. Resolution rule: if supply failure is the operational root cause → Systems domain handles it.*

---

## Domain 9: Valuation

| Primary Issue | Diagnostic Contributors | Complexity |
|---|---|---|
| **Transaction Readiness** | Inconsistent financial performance · Asset values unsubstantiated · Stock and WIP figures inflated · Goodwill calculation methodology errors | Step 4 |

*All four entries are P (pass engagement-start test) but do not drive distinct intervention pathways — all accumulate inside the same advisory objective: produce a credible valuation.*

*When Transaction Readiness fires, Layer 3 sets meetingContext = "transaction". Layer 4 selects from valuation and sale preparation templates only — no mixing with operational templates.*

---

## Domain 10: Risk Management

| Primary Issue | Diagnostic Contributors | Complexity |
|---|---|---|
| **Risk Framework** | No process to identify and mitigate risks · Over-reliance on insurance · Poorly defined probability vs consequence assessment | Step 3 |

*All three entries are P but do not drive distinct intervention pathways — all part of the same risk framework design engagement.*

---

## Domain 11: Succession Planning

| Primary Issue | Diagnostic Contributors | Complexity |
|---|---|---|
| **Owner Purpose & Identity** | Owner has no defined life after work | Step 2–3 |
| **Family Dynamics** | Family inequality driving role appointments and decisions | Step 3–4 |
| **Succession Pathway** | No clear succession pathway — general idea without executable plan | Step 3–4 |

*Business scale or profitability insufficient to support transition → S. Routes to Profitability / Financial Management. Succession reveals it; intervention belongs elsewhere.*

*Domain 12 overlap rule: Family dynamics identified during succession diagnostic = Succession Domain 11. Formal conflict mediation meeting called specifically for family disputes = Domain 12 meetingContext. If meetingContext = "conflict", Domain 12 handles the session — Succession templates not recommended until conflict is resolved.*

*Three entries kept separate (not clustered) because they drive materially different intervention types: coaching (Owner Purpose), facilitation (Family Dynamics), strategic planning (Succession Pathway).*

---

## Domains 12, 13, 14 — Layer 3 meetingContext Only

These domains are not diagnostic — they are engagement contexts. They do not produce primary issues in CaseState. They override Layer 3 strategy resolution.

| Domain | meetingContext value | Layer 3 effect |
|---|---|---|
| **Conflict Meetings** | `conflict` | Overrides normal diagnostic flow — facilitation templates first. Domain 12 applies only when meeting is explicitly called for conflict resolution and advisor's role is mediator. |
| **End of Year Meetings** | `compliance` | Overrides template budget — education and compliance templates first |
| **Due Diligence** | `transaction` | Restricts to due diligence templates only |

---

## Primary Issue Count Summary

| Domain | Primary Issues | Symptoms | Contexts |
|---|---|---|---|
| Profitability & Feasibility | 5 (clustering pending) | 1 | 1 |
| Staff | 4 | 0 | 0 |
| Data | 2 | 0 | 0 |
| Sales & Marketing | 4 | 1 | 0 |
| Financial Management | 2 | 1 | 0 |
| Governance & Leadership | 3 | 0 | 0 |
| Strategy & Planning | 3 | 0 | 0 |
| Systems | 4 | 0 | 0 |
| Valuation | 1 | 0 | 0 |
| Risk Management | 1 | 0 | 0 |
| Succession Planning | 3 | 1 | 0 |
| Conflict Meetings | 0 | 0 | Ctx |
| End of Year Meetings | 0 | 0 | Ctx |
| Due Diligence | 0 | 0 | Ctx |
| **Total** | **32 (before Profitability clustering)** | **3** | **3** |

---

## Outstanding Items — Deferred to Workshop 2

| Item | Detail |
|---|---|
| Domain 1 clustering | 5 P entries not yet clustered — expected to produce 3 clusters (Cost Structure, Revenue, Feasibility) |
| Low sales volume cross-domain rule | P in Domain 1, S in Domain 4 — resolution rule needed |
| Signal vocabulary overhaul | Generic signals (strategy_needed, staff_problem etc.) to be replaced with granular signals matching primary issues |
| Artisan mindset observable criteria | Needs evidence requirements so two advisors classify the same client the same way |

---

## Design Principles Established in Workshop 1.5

1. **"Has causes" ≠ Symptom.** Almost every business problem has causes. The test is whether an advisor can begin a direct intervention.
2. **Two-stage test required.** Engagement-start (P vs S) + Intervention pathway (Primary Issue vs Diagnostic Contributor).
3. **Missing system problems are always P.** The fix is building what doesn't exist.
4. **Belief-based problems are valid P.** Owner belief is a valid starting point when the belief is the binding constraint on action.
5. **Transactional domains collapse.** Valuation and Risk Management collapse to 1 primary issue — all entries accumulate in the same engagement.
6. **Operational domains preserve granularity.** Staff, Sales & Marketing, Governance — entries drive distinct intervention pathways and stay separate.
7. **Meeting-type domains belong in Layer 3.** Conflict, EOY, Due Diligence are not diagnostic — they override strategy resolution.
8. **Cross-domain routing rules required.** When the same condition appears in two domains (financial controls, low sales volume), a resolution rule must exist.
