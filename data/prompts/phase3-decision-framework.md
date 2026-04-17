# Phase 3 Decision Framework — Specification
**Version:** 0.1 (Draft for review)
**Status:** Framework agreed, implementation pending

---

## Overview

The Phase 3 recommendation is not just a template lookup — it is a **structured service proposal** co-built by the AI and the advisor. The AI synthesises signals from four lenses collected during discovery, proposes a sequenced solution, and confirms advisor agreement before finalising.

The output answers five questions:
- **What** — the template sequence (topic-driven, keyword-matched)
- **Why** — engagement type rationale per template
- **How** — delivery approach per engagement type
- **When** — number of meetings + timeframe (advisor-confirmed)
- **Agreement** — advisor validates the approach before it is finalised

---

## The Four Lenses

### Lens 1 — Situation
*What got them here, what is the priority, what are the downstream issues*

**Purpose:** Determines the template sequence and topic suitability.

**Key inputs:**
- Opening situation (keywords → template topic matching)
- Whether the client raised the issue or the advisor noticed it
- Scenario-specific diagnostic answers (profit/staff/sales/data systems etc.)
- **Three-part advisor diagnostic question** (see below)
- Advisor-confirmed timeframe for solving the issues

**The three-part diagnostic question:**
> "What do you feel contributed to this situation, which issue do you feel we should solve first, and what do you think the downstream issues are that we should solve or include in your service offer?"

The AI must validate the advisor's response covers all three components:
1. Contributing factors (root cause — what got them here)
2. Priority (which issue to solve first → primary template)
3. Downstream issues (what comes next → secondary/tertiary templates)

If any component is missing, the AI follows up naturally and conversationally on the specific gap — not robotically. Example: if downstream issues are missing → *"Do you have a sense of what other issues might surface once we address that?"*

**Output of this lens:** Ordered list of issues to address + topic keywords for template matching.

---

### Lens 2 — Client
*Business complexity/scale, owner acumen, awareness, desire to act*

**Purpose:** Determines engagement type and template complexity.

**Key inputs:**
- Growth Curve position → baseline template complexity + fee sensitivity indicator
- Owner acumen (experienced/savvy vs. new to strategic thinking)
- Owner awareness of the problem
- Owner desire to act/solve it

**Decision logic:**

| Growth Curve + Acumen | Awareness + Desire | Engagement type mix | Template complexity |
|---|---|---|---|
| Early stage (Design–Break-even) + low acumen | Low | Education first | Simple, foundational |
| Early stage + high acumen | High | Education → Advice | Moderate |
| Mid stage (Lifestyle–Leverage) + moderate acumen | Moderate | Facilitation → Advice | Moderate–complex |
| Mid–late stage + high acumen | High | Advice (with Facilitation if behavioural change needed) | Complex |
| Late stage (Reach–Maturity) + high acumen | High | Advice | Sophisticated |

**Important override:** Owner acumen can push template complexity *higher* than Growth Curve position alone suggests. High awareness and desire can extend the sequence to include more templates across multiple engagement types (e.g. Education → Facilitation → Advice).

**Output of this lens:** Engagement type(s) appropriate for this client + ceiling on template complexity.

---

### Lens 3 — Relationship
*Trust level, history, how the client receives advice, advisor credibility with this client*

**Purpose:** Modifies how the engagement type is delivered and the scope of the service offer.

**Key inputs:**
- Strength of relationship (strong/established vs. new/still building)
- History of prior engagements
- How the client receives advice (open and light-hearted vs. discerning and careful)
- Implied credibility of the advisor with this specific client

**Decision logic:**

**Strong relationship (high credibility):**
- Advisor can lead with a comprehensive sequential solution
- Multi-template service offer appropriate (3–5 templates)
- Can span Education → Facilitation → Advice across a structured timeframe
- Recommendation framed as: *"We solve issue 1, then 2, then deal with issue 3"*

**Weak relationship + high client awareness/acumen:**
- Service must hit the button — directly focused on the presenting issue
- Advice or Facilitation in nature
- 1–3 templates, topic-specific
- Avoid broad educational preamble — client will see it as the advisor not understanding the problem

**Weak relationship + low client acumen:**
- Educative approach — but still topic-specific, not generic
- 1–3 templates maximum
- Sequence only if advisor input supports it

**Output of this lens:** Scope of service offer (number of templates, session count) + delivery positioning for the advisor.

---

### Lens 4 — Advisor
*Advisory skills, technical competency, confidence, willingness to stretch*

**Purpose:** Determines whether recommended templates are within reach or a stretch — and flags accordingly.

**Key inputs:**
- Length and depth of advisory experience
- Comfort with tools and frameworks
- Confidence in this type of situation
- Willingness to try something new / stretch beyond current comfort zone
- Advisor Profile (if pre-saved — replaces Phase 2 questions entirely)

**Decision logic:**

**Experienced + confident:**
- Let Lenses 1–3 drive template complexity and sequence without modification
- Recommend the optimal solution for the client

**Less experienced / lower confidence:**
- Suggest Education-style templates as primary
- Reduce template complexity
- Flag any stretch templates explicitly with guidance

**Less experienced BUT willing to stretch:**
- Remove the advisor constraint — let Lenses 1–3 drive the recommendation fully
- Acknowledge the stretch and offer coaching/preparation support in the recommendation

**Output of this lens:** Final calibration of template complexity + stretch flag if needed.

---

## Timeframe and Capacity

The advisor's available capacity, combined with the client's awareness/desire (which influences fee sensitivity and engagement length), creates a practical boundary on the service offer.

**How it works:**
1. AI asks the advisor for their preferred timeframe for addressing the client's issues
2. Advisor's answer is interpreted against their current workload/capacity
3. AI maps the template sequence to a realistic number of meetings within that timeframe
4. The recommendation includes a suggested session plan — not just a list of templates

**Example output framing:**
> *"Based on what you've told me, I'd suggest a 3-session engagement over 2 months: Session 1 addresses [X] using [Template A], Session 2 moves into [Y] with [Template B], and Session 3 consolidates with [Template C]."*

---

## The Agreement Check

The recommendation is **co-built**, not delivered as a verdict. The advisor's agreement is woven through the process based on:
- Positive sentiment signals during the discovery conversation
- Direct keyword matches confirming the advisor's own diagnosis
- An explicit closing confirmation before the recommendation is finalised

**Closing confirmation question:**
> *"Does this approach feel right to you?"*

This is not a formality — it is the final validation that the human expert agrees the logic holds. If the advisor pushes back, the AI explores alternatives without discarding the prior context.

---

## Recommendation Output Structure

Every Phase 3 recommendation must include:

1. **My recommendation** — template sequence in delivery order
2. **Engagement type** — named per template (Education / Facilitation / Advice) with rationale
3. **Why this fits your client** — drawn from Lenses 1 + 2 (situation + client signals)
4. **Why this suits you as the advisor** — drawn from Lens 4 (advisor profile)
5. **How to approach it** — delivery guidance per engagement type, industry-specific where relevant
6. **Suggested session plan** — number of meetings + timeframe
7. **What this typically leads to** — downstream opportunity / natural next step
8. **Agreement check** — *"Does this approach feel right to you?"*

---

## Template Count Guidelines

These are guidelines, not hard rules. Advisor input and agreement always take precedence.

| Situation | Templates |
|---|---|
| Single focused issue, high awareness, weak relationship | 1–2 |
| Single issue, strong relationship, high acumen | 1–3 |
| Multi-issue, strong relationship, high awareness/desire | 3–5 |
| Low acumen, weak relationship, low awareness | 1–2 (Education only) |
| Advisor willing to stretch, strong relationship | Up to 5 if situation warrants |

---

## Question Sequence (Agreed & Implemented)

| # | Field | Question | Lens | Skip rule |
|---|---|---|---|---|
| 0 | — | Opening — core situation | Situation | Always fires |
| 1 | clientRaisedIssue | Did the client raise it or did the advisor notice it? | Client | Never skip |
| 2 | situationDiagnostic | What contributed / priority / downstream issues? | Situation | Never skip |
| 1a | usesReports | Does the client use financial management reports? | Client | Profit scenario only |
| 1a-i | reportsFromFirm | Are these reports generated by your firm? | Relationship | Profit + usesReports=yes only |
| 1b | wouldBenefitFromReview | Would they benefit from a detailed profit driver review? | Client | Profit scenario only |
| 1c | industry | What industry is the client in? | Situation | Profit scenario only |
| — | ownership | Private / NFP / public? | Client | Never skip |
| — | growthStage | Growth Curve position [GROWTH_CURVE_SELECTOR] | Client | Skip if NFP/public |
| — | acumen | Business owner acumen | Client | Never skip |
| — | academic | Academic vs instinctive | Client | Never skip |
| — | advisoryStaircase | Advisory Staircase position [STAIRCASE_SELECTOR] | Relationship | Never skip |
| — | clientPersonality | Light-hearted vs discerning? | Relationship | Skip if staircase Step 3+ |
| — | advisorExperience | Advisory experience and tools comfort | Advisor | Skip if Advisor Profile saved |
| — | advisorConfidence | Confidence in this specific situation? | Advisor | Never skip (topic-specific) |
| — | advisorTimeframe | Timeframe and meeting commitment? | Advisor | Never skip |

---

## Editable Per-Firm Recommendation Logic (Future)
The Phase 3 instruction block (not the diagnostic questions, not the core behaviour rules) to become editable by firm managers via an admin UI — stored per firm in the database, injected at runtime, with fallback to default if unavailable.
