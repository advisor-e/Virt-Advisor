# Content routing — what reaches a client recommendation

> **GENERATED FILE — do not edit by hand.** Run `npm run routing` to rebuild it.
> The rules live in [`server/utils/contentRouting.js`](../server/utils/contentRouting.js),
> which the build guard also reads, so this report and the tests can never disagree.

Content filed into the wrong lane is invisible: it renders, it saves, it passes tests,
and it silently never reaches the decision it was written for. That happened three times
in the week of 2026-07-30, and every one was found by a person reading code. This table
is how the next one gets noticed instead.

**491 content assets classified** — 236 client-recommendation · 29 AI-briefing · 226 advisor-read-only · **0 unknown**.

## What the lanes mean

| Lane | Meaning |
|---|---|
| `client-recommendation` | Influences which templates a client is recommended. A change here changes what advisors see on their cards. |
| `ai-briefing` | Briefs the AI on the client path but does NOT select templates. Changes the wording and depth of what the AI says, not which pages it picks. |
| `advisor-read-only` | Only ever read by an advisor or learner. Never reaches a client recommendation. |

A lane is **not** a quality mark. AI-briefing content is doing exactly its job by not
selecting templates.

## By family

| Family | Client recommendation | AI briefing | Advisor read-only | Unknown | Total |
|---|---|---|---|---|---|
| Logic tables | 37 | 0 | 5 | 0 | 42 |
| Advisory distinctions | 67 | 0 | 0 | 0 | 67 |
| Domain support documents | 0 | 29 | 0 | 0 | 29 |
| Library templates | 132 | 0 | 159 | 0 | 291 |
| Quiz banks | 0 | 0 | 62 | 0 | 62 |

## Logic tables

A `nodes` table is walked and its templates become client recommendations. A `flat_if_then` table is Learn-mode reference and is never walked — and the two look identical on screen.

<details>
<summary><strong>42 assets</strong> — click to expand</summary>

| Asset | Lane | Decided by | Evidence |
|---|---|---|---|
| Quickfire Logic | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=8 · type=(none) |
| Client Sales Logic | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=25 · type=(none) |
| Cashflow Logic | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=7 · type=(none) |
| Governance & Leadership Logic | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=14 · type=(none) |
| Client Planning Logic | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=19 · type=(none) |
| Staff Performance Logic | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=24 · type=(none) |
| Frameworks Find Logic | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=8 · type=(none) |
| Get the Job - Sales Process Decision Tree | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=25 · type=(none) |
| Get the Job - Public Speaking & Seminar Delivery | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=8 · type=(none) |
| Trial Fit Method — Revenue Model Presentation | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=5 · type=(none) |
| Cautious Reveal Method — Introducing Revenue Models to Resistant Clients | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=6 · type=(none) |
| End of Year Meeting — Planning and Delivery | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=5 · type=(none) |
| Facilitation 101 — Framing, Story, and Relevance | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=3 · type=(none) |
| Revealing the Growth Curve | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=5 · type=(none) |
| Framing a Conflict Meeting | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=6 · type=(none) |
| Capacity, Capability, Opportunity | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=4 · type=(none) |
| The Heald Matrix | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=4 · type=(none) |
| Deming's Theory of Volatility | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=4 · type=(none) |
| Working Capital Cycle | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=4 · type=(none) |
| Ratio Analysis | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=4 · type=(none) |
| Dashboard Discussions | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=4 · type=(none) |
| Systems Thinking | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=27 · type=(none) |
| Risk Management | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=19 · type=(none) |
| Business Valuation | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=15 · type=(none) |
| Succession Planning | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=19 · type=(none) |
| Profitability & Feasibility | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=27 · type=(none) |
| Due Diligence | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=10 · type=(none) |
| Get the Job - Sales Tracker | `advisor-read-only` | `flat_if_then` — formatted as Learn-mode reference only; never walked (logicTrees.js, design §2.5) | data/logic_trees.json · nodes=0 · type=flat_if_then |
| Get the Job - Marketing | `advisor-read-only` | `flat_if_then` — formatted as Learn-mode reference only; never walked (logicTrees.js, design §2.5) | data/logic_trees.json · nodes=0 · type=flat_if_then |
| Get the Job - Positioning | `advisor-read-only` | `flat_if_then` — formatted as Learn-mode reference only; never walked (logicTrees.js, design §2.5) | data/logic_trees.json · nodes=0 · type=flat_if_then |
| Get the Job - Team Problem Solving | `advisor-read-only` | `flat_if_then` — formatted as Learn-mode reference only; never walked (logicTrees.js, design §2.5) | data/logic_trees.json · nodes=0 · type=flat_if_then |
| Get the Job - Pricing & Proposals | `advisor-read-only` | `flat_if_then` — formatted as Learn-mode reference only; never walked (logicTrees.js, design §2.5) | data/logic_trees.json · nodes=0 · type=flat_if_then |
| Stock Purchasing & Inventory Management | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=12 · type=(none) |
| Raising Capital & Business Acquisition | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=8 · type=(none) |
| FM Coaching & Firm Culture — Internal Firm Development | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=13 · type=(none) |
| Get Seminar | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=8 · type=(none) |
| CA Firm Strategy | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=7 · type=(none) |
| Firm Board Pack | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=8 · type=(none) |
| Leadership & Partner Development | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=8 · type=(none) |
| Financial Systems Review | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=6 · type=(none) |
| 3 Pill Financial Management | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=8 · type=(none) |
| Cash Tactics | `client-recommendation` | `nodes` graph — walked by walkLogicTree; its nodes[].templates become client recommendations | data/logic_trees.json · nodes=7 · type=(none) |

</details>

## Advisory distinctions

A distinction adds its `boost` straight to a template score, so it moves recommendations by design.

<details>
<summary><strong>67 assets</strong> — click to expand</summary>

| Asset | Lane | Decided by | Evidence |
|---|---|---|---|
| Active interpersonal conflict | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=conflict · boost=5 · templates=1 |
| Formal conflict between owners | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=conflict · boost=5 · templates=2 |
| Imbalance in partner contribution | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=conflict · boost=5 · templates=1 |
| Mediation engagement needed | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=conflict · boost=5 · templates=1 |
| Escalating conflict with legal risk | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=conflict · boost=5 · templates=1 |
| Accumulated unresolved tension | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=conflict · boost=5 · templates=2 |
| Crisis prevention — pre-escalation | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=conflict · boost=5 · templates=1 |
| Communication failure between parties | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=conflict · boost=5 · templates=1 |
| Operational conflict between owner-operators | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=conflict · boost=5 · templates=2 |
| General profitability pressure | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=profit · boost=5 · templates=2 |
| Cost of sales has increased | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=profit · boost=5 · templates=2 |
| Excessive discounting eroding margin | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=profit · boost=5 · templates=2 |
| Fixed overhead costs grown beyond revenue | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=profit · boost=5 · templates=2 |
| Asset utilisation below viability threshold | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=profit · boost=5 · templates=2 |
| Revenue is the constraint — not cost | `client-recommendation` | boost +5 added to 3 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=profit · boost=5 · templates=3 |
| Debtor and cashflow pressure | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=profit · boost=5 · templates=2 |
| Too few qualified staff | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=staff · boost=5 · templates=1 |
| Inexperienced or insufficiently trained staff | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=staff · boost=5 · templates=2 |
| No internal training structures | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=staff · boost=5 · templates=2 |
| Poor management practices | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=staff · boost=5 · templates=2 |
| Roles and responsibilities poorly defined | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=staff · boost=5 · templates=1 |
| Weak hiring practices | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=staff · boost=5 · templates=1 |
| Motivation and engagement gap | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=staff · boost=5 · templates=2 |
| No enforceable data capture methods | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=data-systems · boost=5 · templates=2 |
| Poor data integrity — manual input causing errors | `client-recommendation` | boost +5 added to 3 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=data-systems · boost=5 · templates=3 |
| Too much lag data, not enough lead indicators | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=data-systems · boost=5 · templates=2 |
| Narrow data spread — financials only | `client-recommendation` | boost +5 added to 3 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=data-systems · boost=5 · templates=3 |
| No visible sales process | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=sales-marketing · boost=5 · templates=2 |
| Closing and conversion failure | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=sales-marketing · boost=5 · templates=2 |
| Poor outbound marketing | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=sales-marketing · boost=5 · templates=1 |
| No defined target market | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=sales-marketing · boost=5 · templates=1 |
| Poor brand positioning | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=sales-marketing · boost=5 · templates=2 |
| Poor product or market fit | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=sales-marketing · boost=5 · templates=2 |
| Customer retention failure | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=sales-marketing · boost=5 · templates=2 |
| Poor financial literacy — owner focused on wrong numbers | `client-recommendation` | boost +5 added to 3 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=forecasting · boost=5 · templates=3 |
| Over-trading — debt-funded growth | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=forecasting · boost=5 · templates=2 |
| Cost structure imbalance — knowledge gap | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=forecasting · boost=5 · templates=2 |
| Poor boardroom dynamics | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=governance · boost=5 · templates=2 |
| Lack of financial controls | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=governance · boost=5 · templates=2 |
| Poor decision quality | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=governance · boost=5 · templates=1 |
| Weak communication of expectations — no documentation | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=governance · boost=5 · templates=1 |
| Culture left to chance | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=governance · boost=5 · templates=1 |
| Personality and skill diversity not pursued | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=governance · boost=5 · templates=2 |
| Lack of clarity that business model will remain competitive | `client-recommendation` | boost +5 added to 3 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=strategy · boost=5 · templates=3 |
| Poor business metrics — no operational objectives | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=strategy · boost=5 · templates=2 |
| No defined objectives — no communicated direction | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=strategy · boost=5 · templates=2 |
| Processes are undefined | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=systems · boost=5 · templates=1 |
| Processes are over-engineered | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=systems · boost=5 · templates=1 |
| No regular structured review of practices | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=systems · boost=5 · templates=1 |
| Siloed operations | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=systems · boost=5 · templates=1 |
| Supply line disruptions or poor quality controls | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=systems · boost=5 · templates=2 |
| Transaction readiness — sale | `client-recommendation` | boost +5 added to 3 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=valuation · boost=5 · templates=3 |
| Earnings consistency issue reducing valuation | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=valuation · boost=5 · templates=2 |
| Asset valuation concerns | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=valuation · boost=5 · templates=2 |
| Goodwill and valuation methodology | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=valuation · boost=5 · templates=2 |
| Key person dependency risk | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=risk · boost=5 · templates=1 |
| Over-reliance on insurance as risk strategy | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=risk · boost=5 · templates=1 |
| No systematic risk identification process | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=risk · boost=5 · templates=1 |
| Owner purpose and status — no defined life after work | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=succession · boost=5 · templates=1 |
| Sibling or family inequality in succession | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=succession · boost=5 · templates=2 |
| No clear succession pathway | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=succession · boost=5 · templates=1 |
| EOY context — convert compliance to advisory value | `client-recommendation` | boost +5 added to 3 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=eoy · boost=5 · templates=3 |
| Compliance meeting with no advisory content | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=eoy · boost=5 · templates=2 |
| Knowledge gap blocking the advisory upsell | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=eoy · boost=5 · templates=2 |
| Acquisition due diligence context | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=due-diligence · boost=5 · templates=2 |
| Sale due diligence context | `client-recommendation` | boost +5 added to 2 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=due-diligence · boost=5 · templates=2 |
| Transaction urgency — live deal | `client-recommendation` | boost +5 added to 1 template(s) in templateResolver.js | data/advisory-distinctions.json · domain=due-diligence · boost=5 · templates=1 |

</details>

## Domain support documents

These BRIEF the AI on the client path. They do not pick templates (§0.6 ruling) — selection is the resolver, the logic tables and the distinctions, none of which read these files.

<details>
<summary><strong>29 assets</strong> — click to expand</summary>

| Asset | Lane | Decided by | Evidence |
|---|---|---|---|
| conflict meetings and facilitation | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/conflict-domain-support.json · materials=2 |
| data integrity and financial systems | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/data-systems-domain-support.json · materials=4 |
| due diligence and acquisition review | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/due-diligence-domain-support.json · materials=3 |
| end of year meetings and client reviews | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/eoy-domain-support.json · materials=4 |
| firm management coaching and culture | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/fm-coach-culture-domain-support.json · materials=20 |
| financial management and forecasting | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/forecasting-domain-support.json · materials=5 |
| Get the Job — Marketing | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/get-marketing-domain-support.json · materials=7 |
| Get the Job — Positioning | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/get-positioning-domain-support.json · materials=4 |
| Get the Job — Advisory Pricing & Proposals | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/get-pricing-proposals-domain-support.json · materials=4 |
| Get the Job — Learning to Sell | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/get-sales-domain-support.json · materials=6 |
| Get the Job — Sales Tracker | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/get-sales-tracker-domain-support.json · materials=5 |
| Get the Job — Seminar Delivery | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/get-seminar-domain-support.json · materials=16 |
| Get the Job — Team Problem Solving | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/get-team-problem-domain-support.json · materials=3 |
| governance and leadership | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/governance-domain-support.json · materials=3 |
| firm board governance and reporting | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/org-board-pack-domain-support.json · materials=11 |
| CA firm capacity planning | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/org-capacity-planner-domain-support.json · materials=3 |
| CA firm strategy and partner management | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/org-firm-strategy-domain-support.json · materials=6 |
| leadership development and partner management | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/org-leadership-domain-support.json · materials=3 |
| people engagement, recruitment and performance | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/people-power-domain-support.json · materials=26 |
| profitability and feasibility | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/profit-domain-support.json · materials=4 |
| raising capital and business acquisition | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/raising-capital-domain-support.json · materials=6 |
| risk management and insurance | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/risk-domain-support.json · materials=2 |
| sales and marketing | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/sales-marketing-domain-support.json · materials=19 |
| staff, productivity and leadership | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/staff-domain-support.json · materials=4 |
| stock purchasing and inventory management | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/stock-purchasing-domain-support.json · materials=1 |
| strategy and planning | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/strategy-domain-support.json · materials=13 |
| succession planning and business continuity | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/succession-domain-support.json · materials=4 |
| systems thinking and process improvement | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/systems-domain-support.json · materials=4 |
| business valuation and sale | `ai-briefing` | read only by the domainSupport formatters, which feed the prompt — template selection never reads it (§0.6) | data/valuation-domain-support.json · materials=2 |

</details>

## Library templates

Split by `includedInClient`, the flag the master export carries to say whether a page may be put in front of a client.

<details>
<summary><strong>291 assets</strong> — click to expand</summary>

| Asset | Lane | Decided by | Evidence |
|---|---|---|---|
| Dashboard Report | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| E.O.Y Meeting | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| General Meeting Agenda | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| PDF Storage | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| FBT Questionnaire | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Growth Curve | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Coping With Adversity | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Covid Agendas | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Receivership vs Liquidation | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Quick & Worst | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Insurance | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Legal | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Loan Estimator | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Retirement Calcs | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Time Matters | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Control Matters | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Money Matters | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Capacity, Capability, Opportunity | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| App Review | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Assumptions | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Customer Journey | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Debtor Protocols | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Demings Volatility | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| 1 pg Bizz Case | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Lite Strategy | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| People vs. Process | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Powerful Goal Setting | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Productive Habits | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| 8 Profit Levers | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Org Chart Only | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Quick Fire Diagnosis | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Rubbish In - Rubbish Out | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Working Capital Cycle | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Lite Planning | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Lite Data | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Lite Marketing | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Lite Sales | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Lite People | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Lite Process | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Alignment Statements | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| 4 Part Bizz Plan | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| SWOT / PEST | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Phone Techniques | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Planning Outcomes Review | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Business Targets | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Orientation Part 1 | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Orientation Part 2 | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Profit Levers & Blue Ocean | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Organisational Review | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Sales & Marketing Review | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| 80/20 Farm Plan | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Nine Growth Aspects | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Specialist Content 1 | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Formal Risk Management | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Governance Introduction | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Programme Pages | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Remuneration & Incentives | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Partner Accountability | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Stg. 1 Due Diligence | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Financial Systems Review | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Stock Policies | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Succession Planning | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Farm Succession | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Lease vs. Buy | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Labour Only | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Labour, Margin | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Labour, Margin, Sales | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Back Costing | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Break-Even | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Audio-Opto | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Cafe | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Cake Shop | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Car Importer | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Childcare Ctr | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Construction | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Cost per Mtr | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Earth Moving Hrs | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Engineering | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Food & Remedy Product'n | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Forecasting | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Gym & Trainer | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Home Services Feasibility | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Hospitality | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Hairdressing | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| IT Services | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Joiner | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Motel & Lodge | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Online Sales | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Production Output | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Professional Services Firm | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Quick Position | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Rental Property | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Retail | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Rural Volatility | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Sales Forecaster | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Shop | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Tour Operators | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Tours + Shop | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Trucking/ Haulage | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Volatility Scenario | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Wages Review | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Workshop / Program Sales | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Worst Case Scenario | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Physiotherapy | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Dentist | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Finance & Depreciation | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Personal Budget | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| High Level Budget | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Hiring Winners | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Landscaping & Maintainence | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Midwife | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Homeware Sales | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Porters & Pine | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Pivot | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| E Mails | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Section Overview | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Manufacturing | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Force Field Analysis | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Advisory Pricing Model | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| 5 Layers Questionnaire | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Advisory Proposal | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Mgt Annual Plan | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Outbound Emails | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Coaching Content | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| My Improvement Plan | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Lite Fundamentals Proposal | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Sales Psychology (Basics) | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Advisor Prep | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Lite Feasibility | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Dashboard Discussions | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Ratio Analysis | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Key Interviews | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Asset Review | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Porter's Revenue | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Purchase Assessment Report 3 | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Coaching Outcome Statements | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Planning Templates Directory | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Pitch Deck | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Structure Options | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| 90 Day Best Practice Accounting | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Activity Ratios | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Business Sale Assessment 1 | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Indicative Value Questions | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Business Purchase Assessment 1 | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Purchase Assessment Model 2 | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Business Insurance Model | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Gift Approach Letters | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Phone Scripts | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Total Needs Sales Scripts | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Lite Fundamentals | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| The Nature of Engagement | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| The 5 Steps in the Advisory Staircase | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| The Heald Matrix | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Section Brief | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Your Sales Process Decision Tree | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Business Clock vs Body Clock | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| 6 Hats | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Lite Fundamentals Visual Aids | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Business Dating | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Capacity, Capability, Opportunity | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| What's Applicable | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| HOPE Recession Model | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Advisor Prep | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Sale Assessment Model 2 | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Sale Assessment Report 3 | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| Messaging Plan | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Paper Tower | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Hire Winners | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| My Fee Growth Plan | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| My Network/Entertainment Schedule | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Online Quiz Summary | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Video Hyperlinks | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Website Blurbs | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| The Helicopter Story | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Call Reluctance Psychology | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Winning Management Reporting | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Campaign Intro Options | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Centre of Influence Scripts | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Platinum Case Study | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Quickfire Advisory Directory | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| My CPD Log | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Advisory Playsheets | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Learning Graphics | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Growth Curve Checklist | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Revealing the Growth Curve Freehand | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| EOY Quiz | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Turnaround Behaviours | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| BNZ Templates | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Baking Apple Pie | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| EBITDA | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Common Problem Stories | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Board Member Conduct | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Annual Board Plan | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Draft White Papers | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Quality Decisions | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Leadership Review | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Customer Reliance | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Location Review | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Supply Chain Review | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Margin vs Markup | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Labour Margin Mix | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Sales Dashboard | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Finance and Depreciation | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Dry Stock Farming | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Marine Harvest | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Mussel Farm 2 | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Real Estate Office | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Farm House Budget | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Doctor | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Health Spa | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Support Person | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Deliver and Hire | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Mobile Services | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Beverages | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Craft Production | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Raw Food | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Dress Maker | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Hard & Software Sales | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Pet Shop | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Entry Fee | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Sales Teams | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Drilling & Pumps | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Fencing Cost pr Mtr | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Butcher | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Cleaners | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Consultancy Pricing | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Financial Advisor | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| IT Services | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Plumber | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Landscaping & Maintenance | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Learn-from-Home | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Scaffolding | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| 3 Pillars of Financial Management | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Price Rise | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| My Sales Logistics & Mktg Plan | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| CA Capacity Planner | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| CA Firm Strategy | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Leadership | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Firm Board Pack | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Our Own Growth Stage | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Plan For Success | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Lite Advisor-e Plan | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Strategic Summary Tables | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Our Strategic Plan | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Pricing Tactics | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Partner Accountability | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Directorship Pathway | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| FM Board Annual Plan | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| FM Board Pack Tables | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| FM Agenda & Minutes | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| FM General Notes | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| FM Board White Paper | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| FM Quality Decisions | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| FM Resolutions | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Formal Risk Management | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| FM HIre Winners | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Team Bldg Problem Solving | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Advisor-e Coaching Plan | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Advisory Performance Improvement | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Group Coaching Sessions | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Coping With Disruption | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Structured Networking | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| COI Development pt1 | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| COI Development pt2 | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Event, Cause, Effect | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Fee Estimate & Job Creep Discussions | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| My Sales Logistics & Mktg' Plan | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get Organised |
| Sales Tracker Opt A | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Sales Tracker Opt B | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Our Sales Process | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Cartoons | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Design & Deliver | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Capacity, Capability, Opportunity | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Time, Control, Money | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Mastering Positioning | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Video Techniques | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Cost of Capital | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Crypto Asset Allocations | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Facilitation 101 | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Get the Job |
| Salary Sacrifice Table | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| 7 Cash Drivers | `client-recommendation` | `includedInClient: true` — eligible to be recommended to a client | data/templates.json · section=Do the Job |
| The 9 Growth Stages | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Lite Fundamentals Components | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Growth Fundamentals Framework Philosophy | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Working With Revenue Models | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Revenue Model Support | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Due Diligence Support | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Systems B4 Scale | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Coping With Adversity | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Speak Easy | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |
| Mapping the Marketing & Sales Process | `advisor-read-only` | `includedInClient: false` — advisor-facing library page, not put in front of a client | data/templates.json · section=Do the Job |

</details>

## Quiz banks

Required only by courseEngine.js. No require chain reaches them from the advisor engine or the template resolver, so a bank cannot move a recommendation.

<details>
<summary><strong>62 assets</strong> — click to expand</summary>

| Asset | Lane | Decided by | Evidence |
|---|---|---|---|
| 3 Pillars of Financial Management | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| 4 Part Bizz Plan | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| 6 Hats | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=12 |
| 7 Cash Drivers | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| 8 Profit Levers | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Alignment Statements | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Board Member Conduct | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Business Clock vs Body Clock | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Business Dating | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Business Targets | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Coping With Adversity | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=20 |
| Customer Journey | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Dashboard Discussions | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Debtor Protocols | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Demings Volatility | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Draft White Papers | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Due Diligence Support | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| E.O.Y Meeting | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Force Field Analysis | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Governance Introduction | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Growth Fundamentals Framework Philosophy | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| HOPE Recession Model | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Hiring Winners | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Indicative Value Questions | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Lite Data | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Lite Feasibility | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Lite Fundamentals Components | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Lite Marketing | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Lite People | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Lite Planning | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Lite Process | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Lite Sales | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Organisational Review | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Orientation Part 1 | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Orientation Part 2 | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| People vs. Process | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Phone Techniques | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Pivot | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Planning Outcomes Review | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Porters & Pine | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Powerful Goal Setting | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Price Rise | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Profit Levers & Blue Ocean | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Purchase Assessment Report 3 | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Quality Decisions | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Quick Fire Diagnosis | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Ratio Analysis | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Remuneration & Incentives | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Revealing the Growth Curve Freehand | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Revenue Model Support | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Rubbish In - Rubbish Out | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Sale Assessment Report 3 | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Sales & Marketing Review | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Stock Policies | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Structure Options | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Succession Planning | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=20 |
| Systems B4 Scale | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| The 9 Growth Stages | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Turnaround Behaviours | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| What's Applicable | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |
| Working Capital Cycle | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=20 |
| Working With Revenue Models | `advisor-read-only` | required only by courseEngine.js — no path from the advisor engine or the template resolver | data/course-quizzes.json · questions=10 |

</details>

## What this map does not cover

Stated rather than left to be inferred — an audit that hides its own edges is worse than
no audit, because it reads as complete.

- **40 data files are not classified.** They are listed below by name.
  This list is DERIVED from what is on disk, not typed out, so a new data file appears
  here by itself rather than waiting for someone to remember it.

  - `data/advisory-staircase.json`
  - `data/ai-prompts.json`
  - `data/capacity-capability-opportunity-reference.json`
  - `data/cautious-reveal-reference.json`
  - `data/conflict-meeting-reference.json`
  - `data/content-summaries.json`
  - `data/course-starters.json`
  - `data/currencies.json`
  - `data/dashboard-discussions-reference.json`
  - `data/demings-volatility-reference.json`
  - `data/domains.json`
  - `data/engagement-types.json`
  - `data/eoy-reference.json`
  - `data/facilitation-reference.json`
  - `data/fin-mgt-table.json`
  - `data/forecast-sell-down.json`
  - `data/forecast-trend-thresholds.json`
  - `data/glossary.json`
  - `data/growth-curve-reveal-reference.json`
  - `data/growth-fundamentals.json`
  - `data/heald-matrix-reference.json`
  - `data/languages.json`
  - `data/loan-criteria.json`
  - `data/meeting-observations.json`
  - `data/powerful-seminars.json`
  - `data/primary-issues.json`
  - `data/productive-habits.json`
  - `data/property-tax-rules.json`
  - `data/quizzable-sections.json`
  - `data/ratio-analysis-reference.json`
  - `data/report-model-summaries.json`
  - `data/sales-marketing-slides.json`
  - `data/section-descriptions.json`
  - `data/semantic-profiles.json`
  - `data/signal-assignments-draft.json`
  - `data/signal-dictionary.json`
  - `data/support-contact.json`
  - `data/tax-bands.json`
  - `data/trial-fit-reference.json`
  - `data/working-capital-cycle-reference.json`

- **Only the PLATFORM layer is classified.** A firm's overrides and its own added rows
  are resolved at runtime and are not on disk to be read here, so a firm-authored asset
  does not appear. The lane its platform equivalent sits in still applies.
  (The `data/dev-*.json` files are the dev-mode override stores and are excluded
  for the same reason.)

- **A lane says where an asset can reach, not whether it is any good.** This report
  cannot tell you a logic table is well written, only that the engine walks it.
