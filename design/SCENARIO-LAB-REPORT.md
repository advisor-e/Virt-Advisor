# Scenario Lab — Cross-Domain Case-Study Report

> **Auto-generated** by `scripts/scenario-lab.js` over the fixed 50-case set (`scenario-lab-cases.json`). Re-run to refresh; do not hand-edit.
> Coverage: **50 sessions across all 14 content domains**. AI layer (firm distinctions + distress): **ON**.

## Metrics (measure before vs after an engine change)

- **Signal lever fired:** 21/50 sessions (42%) — the rest ran on generic domain priors only.
- **Content-driven top pick:** 50/50 (100%) — the #1 recommendation matched on something the advisor actually said (a signal, distinction, industry or topic), not just a domain prior.
- **Average score separation (top vs 4th):** 5.4 points — higher = more decisive / confident ranking.
- **Distress read:** fired TRUE in 4/50; of those, 3 were genuine crises → **precision 75%**, **recall 100%** (there are 3 genuine crises in the set).

## At a glance

| # | Domain | Top recommendation | Signal? | Content-driven? | Crisis? | Distress |
|--:|---|---|:--:|:--:|:--:|:--:|
| 1 | profit | Quick Fire Diagnosis | **no** | yes |  | false |
| 2 | profit | Customer Journey | yes | yes | YES | **TRUE** |
| 3 | profit | Quick Fire Diagnosis | **no** | yes |  | false |
| 4 | profit | 8 Profit Levers | **no** | yes |  | false |
| 5 | profit | Working Capital Cycle | **no** | yes |  | false |
| 6 | staff | Alignment Statements | yes | yes |  | false |
| 7 | staff | Hiring Winners | **no** | yes |  | false |
| 8 | staff | Hiring Winners | **no** | yes |  | false |
| 9 | staff | People vs. Process | **no** | yes |  | false |
| 10 | data-systems | 90 Day Best Practice Accounting | yes | yes |  | false |
| 11 | data-systems | Data Session | **no** | yes |  | false |
| 12 | data-systems | 90 Day Best Practice Accounting | yes | yes |  | false |
| 13 | data-systems | Data Session | yes | yes |  | false |
| 14 | sales-marketing | Lite Marketing | yes | yes |  | false |
| 15 | sales-marketing | Lite Marketing | **no** | yes |  | false |
| 16 | sales-marketing | Sales Session | **no** | yes |  | false |
| 17 | sales-marketing | 8 Profit Levers | **no** | yes |  | false |
| 18 | forecasting | Lite Feasibility | yes | yes |  | **TRUE** |
| 19 | forecasting | Planning Session | yes | yes |  | false |
| 20 | forecasting | Tour Operators | **no** | yes |  | false |
| 21 | governance | Firm Board Pack | **no** | yes |  | false |
| 22 | governance | Business Targets | **no** | yes |  | false |
| 23 | governance | Governance Introduction | yes | yes |  | false |
| 24 | strategy | Lite Strategy | yes | yes |  | false |
| 25 | strategy | Lite Strategy | **no** | yes |  | false |
| 26 | strategy | Lite Strategy | yes | yes |  | false |
| 27 | strategy | Lite Strategy | yes | yes |  | false |
| 28 | systems | Process Session | yes | yes |  | false |
| 29 | systems | Process Session | yes | yes |  | false |
| 30 | systems | Process Session | yes | yes |  | false |
| 31 | valuation | Sale Assessment Report 3 | **no** | yes |  | false |
| 32 | valuation | Sale Assessment Report 3 | **no** | yes |  | false |
| 33 | valuation | Sale Assessment Report 3 | **no** | yes |  | false |
| 34 | risk | Formal Risk Management | **no** | yes |  | false |
| 35 | risk | Formal Risk Management | yes | yes |  | false |
| 36 | risk | Formal Risk Management | **no** | yes |  | false |
| 37 | succession | Farm Succession | yes | yes |  | false |
| 38 | succession | Business Sale Assessment 1 | yes | yes |  | false |
| 39 | succession | Farm Succession | yes | yes |  | false |
| 40 | conflict | Force Field Analysis | **no** | yes |  | false |
| 41 | conflict | Partner Accountability | **no** | yes |  | false |
| 42 | conflict | Force Field Analysis | **no** | yes |  | false |
| 43 | eoy | General Meeting Agenda | **no** | yes |  | false |
| 44 | eoy | 8 Profit Levers | **no** | yes |  | false |
| 45 | eoy | 8 Profit Levers | **no** | yes |  | false |
| 46 | due-diligence | Stg. 1 Due Diligence | **no** | yes |  | false |
| 47 | due-diligence | Stg. 1 Due Diligence | **no** | yes |  | false |
| 48 | due-diligence | Stg. 1 Due Diligence | **no** | yes |  | false |
| 49 | succession | Farm Succession | yes | yes | YES | **TRUE** |
| 50 | forecasting | Forecasting | yes | yes | YES | **TRUE** |

---

## profit·margins/pricing

**The advisor's session (invented):**
- _Core problem:_ Their margins keep shrinking and they don't really know what each product costs to make.
- _What contributed:_ Costs have crept up, they guess their prices, and they have never modelled their break-even.
- _Already tried:_ They put prices up once across the board, lost a few customers, got scared and stopped.
- _On the check-in:_ Yes, it is really about understanding their costs and pricing properly.
- _Industry:_ a small manufacturer · _Staircase:_ step 3 · _Sessions:_ 3

**What the engine decided:**
- **Domain:** profit · **Engagement:** education · **Ceiling:** analytical · **Budget:** 3
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** 8 Profit Levers (+5), Quick Fire Diagnosis (+10), Lite Feasibility (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Quick Fire Diagnosis** _(score 14)_ — a core tool type for this domain; boosted by a firm distinction (+10); fits the engagement style (preferred).
2. **8 Profit Levers** _(score 12)_ — a core tool type for this domain; boosted by a firm distinction (+5); matches the topic "profit"; fits the engagement style (preferred).
3. **Lite Feasibility** _(score 9)_ — a core tool type for this domain; boosted by a firm distinction (+5); fits the engagement style (preferred).

---

## profit·CRISIS café liquidation  ⚠ (genuine crisis)

**The advisor's session (invented):**
- _Core problem:_ My client is scared about going under and not sure how they will make ends meet - they think the business could be lost.
- _What contributed:_ Poor financial management, not upselling as much as they could, and an economic downturn hitting everyone.
- _Already tried:_ Nothing really - they put their head in the sand and hoped it would get better.
- _On the check-in:_ It is more serious than a downturn - we are talking about whether they stay in business or are forced out entirely, possibly facing liquidation.
- _Industry:_ a couple of cafes · _Staircase:_ step 3 · _Sessions:_ 3

**What the engine decided:**
- **Domain:** profit · **Engagement:** education · **Ceiling:** analytical · **Budget:** 3
- **Problem signals read:** Insufficient sales volume, customer acquisition, or foot traffic (×2)
- **Firm distinctions boosting:** Customer Journey (+5), 8 Profit Levers (+5), Sales Session (+5)
- **Distress read:** **YES**

**Recommended templates, and why:**
1. **Customer Journey** _(score 49)_ — a core tool type for this domain; boosted by a firm distinction (+5); strongly matches the problem described (signal weight 40.0); fits the engagement style (preferred).
2. **Sales Session** _(score 47)_ — a related tool type for this domain; boosted by a firm distinction (+5); strongly matches the problem described (signal weight 40.0); fits the engagement style.
3. **Labour, Margin, Sales** _(score 44)_ — a related tool type for this domain; matches the topic "profit"; strongly matches the problem described (signal weight 40.0).

---

## profit·cost blowout

**The advisor's session (invented):**
- _Core problem:_ Their food and wage costs have blown out and there is almost nothing left at the end of the month.
- _What contributed:_ Supplier prices jumped, portion control is poor, and rosters are not matched to trade.
- _Already tried:_ They cut a couple of staff shifts but the problem came straight back.
- _On the check-in:_ Yes, it is about getting the cost base under control and protecting the margin.
- _Industry:_ a restaurant · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** profit · **Engagement:** education · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Quick Fire Diagnosis (+10), Working Capital Cycle (+5), Dashboard Discussions (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Quick Fire Diagnosis** _(score 14)_ — a core tool type for this domain; boosted by a firm distinction (+10); fits the engagement style (preferred).
2. **Working Capital Cycle** _(score 12)_ — a core tool type for this domain; boosted by a firm distinction (+5); matches the topic "profit"; fits the engagement style (preferred).

---

## profit·plateau

**The advisor's session (invented):**
- _Core problem:_ The business has plateaued - revenue is fine but profit just will not grow.
- _What contributed:_ They have never looked at their profit drivers and everything is run on gut feel.
- _Already tried:_ They ran a couple of sales promotions which lifted turnover but not profit.
- _On the check-in:_ Yes, it is about lifting profitability, not just sales.
- _Industry:_ a retailer · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** profit · **Engagement:** education · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** 8 Profit Levers (+10), Quick Fire Diagnosis (+5), Customer Journey (+5), Sales Session (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **8 Profit Levers** _(score 17)_ — a core tool type for this domain; boosted by a firm distinction (+10); matches the topic "profit"; fits the engagement style (preferred).
2. **Retail** _(score 9)_ — a related tool type for this domain; matches the client's industry by name.

---

## profit·undercharging

**The advisor's session (invented):**
- _Core problem:_ I think they are simply charging too little for the value they deliver.
- _What contributed:_ They are scared to raise prices, have never benchmarked, and compete on being cheapest.
- _Already tried:_ Nothing - they are too afraid of losing clients to even try.
- _On the check-in:_ Yes, it is about pricing and the confidence to charge what they are worth.
- _Industry:_ a services business · _Staircase:_ step 2 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** profit · **Engagement:** education · **Ceiling:** foundational · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** 8 Profit Levers (+5), Working Capital Cycle (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Working Capital Cycle** _(score 16)_ — a core tool type for this domain; relevant to the client's industry; boosted by a firm distinction (+5); matches the topic "profit"; fits the engagement style (preferred).
2. **8 Profit Levers** _(score 12)_ — a core tool type for this domain; boosted by a firm distinction (+5); matches the topic "profit"; fits the engagement style (preferred).

---

## staff·performance/delegation

**The advisor's session (invented):**
- _Core problem:_ The owner is drowning because the team cannot be trusted to run anything without them.
- _What contributed:_ No clear roles, nobody is held to account, and the owner does everything themselves.
- _Already tried:_ They hired a 2IC last year but never gave them real authority so it changed nothing.
- _On the check-in:_ Yes, it is about the team's performance and the owner being able to delegate.
- _Industry:_ a building firm · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** staff · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Staff, team, HR, or leadership issues (×4)
- **Firm distinctions boosting:** Remuneration & Incentives (+5), Alignment Statements (+10)
- **Distress read:** no

**Recommended templates, and why:**
1. **Alignment Statements** _(score 91)_ — a related tool type for this domain; boosted by a firm distinction (+10); strongly matches the problem described (signal weight 80.0).
2. **People vs. Process** _(score 86)_ — a related tool type for this domain; relevant to the client's industry; strongly matches the problem described (signal weight 80.0); fits the engagement style.

---

## staff·high turnover

**The advisor's session (invented):**
- _Core problem:_ They keep losing good people and are constantly rehiring and retraining.
- _What contributed:_ No onboarding, no development path, and pay is below the market.
- _Already tried:_ They threw a one-off bonus at it which did nothing for retention.
- _On the check-in:_ Yes, it is about why staff keep leaving and how to keep them.
- _Industry:_ a hospitality venue · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** staff · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Hiring Winners (+5), Productive Habits (+5), People Session (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Hiring Winners** _(score 9)_ — a related tool type for this domain; boosted by a firm distinction (+5); matches the topic "staff".
2. **People Session** _(score 7)_ — boosted by a firm distinction (+5); purpose mentions "staff"; fits the engagement style.

---

## staff·hiring

**The advisor's session (invented):**
- _Core problem:_ They cannot find decent people and it is holding the whole business back.
- _What contributed:_ No recruitment process, vague job descriptions, and they hire in a panic.
- _Already tried:_ They used one recruiter once and were not happy with the candidates.
- _On the check-in:_ Yes, it is about hiring the right people properly.
- _Industry:_ a trades business · _Staircase:_ step 2 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** staff · **Engagement:** facilitation · **Ceiling:** foundational · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Hiring Winners (+10)
- **Distress read:** no

**Recommended templates, and why:**
1. **Hiring Winners** _(score 14)_ — a related tool type for this domain; boosted by a firm distinction (+10); matches the topic "staff".
2. **Business Insurance Model** _(score 8)_ — matches the client's industry by name.

---

## staff·toxic culture

**The advisor's session (invented):**
- _Core problem:_ The culture has gone sour - there is gossip, low morale and people are checked out.
- _What contributed:_ No shared values, weak leadership, and a couple of negative personalities setting the tone.
- _Already tried:_ They did a pizza day and a survey but nothing changed underneath.
- _On the check-in:_ Yes, it is about the culture and how the team works together.
- _Industry:_ an office-based SME · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** staff · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** People vs. Process (+5), Alignment Statements (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **People vs. Process** _(score 7)_ — a related tool type for this domain; boosted by a firm distinction (+5); fits the engagement style.
2. **Alignment Statements** _(score 6)_ — a related tool type for this domain; boosted by a firm distinction (+5).

---

## data-systems·unreliable numbers

**The advisor's session (invented):**
- _Core problem:_ They genuinely do not trust their own numbers - the books are a mess and reports are always late.
- _What contributed:_ Everything is in spreadsheets, data is entered twice, and there is no single source of truth.
- _Already tried:_ They bought accounting software but never set it up properly so it sits unused.
- _On the check-in:_ Yes, it is about getting reliable data and reporting they can rely on.
- _Industry:_ a retailer · _Staircase:_ step 2 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** data-systems · **Engagement:** education · **Ceiling:** foundational · **Budget:** 2
- **Problem signals read:** Data integrity, chart of accounts, or financial systems accuracy issues (×3)
- **Firm distinctions boosting:** Financial Systems Review (+10), App Review (+5), Rubbish In - Rubbish Out (+5), 90 Day Best Practice Accounting (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **90 Day Best Practice Accounting** _(score 71)_ — a related tool type for this domain; boosted by a firm distinction (+5); matches the topic "data-systems"; strongly matches the problem described (signal weight 60.0); fits the engagement style (preferred).
2. **Rubbish In - Rubbish Out** _(score 68)_ — a related tool type for this domain; boosted by a firm distinction (+5); strongly matches the problem described (signal weight 60.0); fits the engagement style (preferred).

---

## data-systems·no reports

**The advisor's session (invented):**
- _Core problem:_ They run the business with no management reports at all - just the bank balance.
- _What contributed:_ No dashboard, no monthly numbers, and decisions are made blind.
- _Already tried:_ Their bookkeeper sends a P&L once a year at tax time and that is it.
- _On the check-in:_ Yes, it is about getting regular reporting so they can actually see what is happening.
- _Industry:_ a small SME · _Staircase:_ step 2 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** data-systems · **Engagement:** education · **Ceiling:** foundational · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Financial Systems Review (+5), App Review (+5), Dashboard Discussions (+5), Data Session (+10), Activity Ratios (+5), Dashboard Report (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Data Session** _(score 14)_ — a core tool type for this domain; boosted by a firm distinction (+10); purpose mentions "data-systems"; fits the engagement style.
2. **Activity Ratios** _(score 8)_ — a related tool type for this domain; boosted by a firm distinction (+5); fits the engagement style (preferred).

---

## data-systems·manual double-entry

**The advisor's session (invented):**
- _Core problem:_ Their data is a nightmare - the same figures are keyed into three different places.
- _What contributed:_ Disconnected systems, manual re-keying, and constant errors that take hours to find.
- _Already tried:_ They tried to fix it with another spreadsheet which made it worse.
- _On the check-in:_ Yes, it is about the data integrity and the systems behind the numbers.
- _Industry:_ a wholesaler · _Staircase:_ step 2 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** data-systems · **Engagement:** education · **Ceiling:** foundational · **Budget:** 2
- **Problem signals read:** Data integrity, chart of accounts, or financial systems accuracy issues (×1)
- **Firm distinctions boosting:** Rubbish In - Rubbish Out (+5), Financial Systems Review (+5), 90 Day Best Practice Accounting (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **90 Day Best Practice Accounting** _(score 31)_ — a related tool type for this domain; boosted by a firm distinction (+5); matches the topic "data-systems"; strongly matches the problem described (signal weight 20.0); fits the engagement style (preferred).
2. **Rubbish In - Rubbish Out** _(score 28)_ — a related tool type for this domain; boosted by a firm distinction (+5); strongly matches the problem described (signal weight 20.0); fits the engagement style (preferred).

---

## data-systems·no KPIs

**The advisor's session (invented):**
- _Core problem:_ They are flying blind - no idea which numbers actually matter for their business.
- _What contributed:_ They track nothing meaningful and cannot tell a good month from a bad one until it is too late.
- _Already tried:_ They downloaded a generic KPI template online but it did not fit them.
- _On the check-in:_ Yes, it is about identifying the right measures and tracking them.
- _Industry:_ a services business · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** data-systems · **Engagement:** education · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Data integrity, chart of accounts, or financial systems accuracy issues (×1)
- **Firm distinctions boosting:** Dashboard Discussions (+5), Data Session (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Data Session** _(score 29)_ — a core tool type for this domain; boosted by a firm distinction (+5); purpose mentions "data-systems"; strongly matches the problem described (signal weight 20.0); fits the engagement style.
2. **Dashboard Discussions** _(score 28)_ — a related tool type for this domain; boosted by a firm distinction (+5); strongly matches the problem described (signal weight 20.0); fits the engagement style (preferred).

---

## sales·weak pipeline

**The advisor's session (invented):**
- _Core problem:_ Not enough new customers are coming through the door and sales have gone flat.
- _What contributed:_ No marketing to speak of, no follow-up on leads, and no real sales process.
- _Already tried:_ They boosted a few posts on social media but got nothing measurable from it.
- _On the check-in:_ Yes, it is about lifting sales volume and getting a proper pipeline.
- _Industry:_ a services business · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** sales-marketing · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Marketing, brand awareness, or digital presence gaps (×1)
- **Firm distinctions boosting:** Customer Journey (+5), Sales Session (+5), Lite Marketing (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Lite Marketing** _(score 31)_ — a core tool type for this domain; boosted by a firm distinction (+5); matches the topic "sales-marketing"; strongly matches the problem described (signal weight 20.0); fits the engagement style.
2. **Business Targets** _(score 29)_ — matches the client's industry by name; strongly matches the problem described (signal weight 20.0); fits the engagement style.

---

## sales·no marketing

**The advisor's session (invented):**
- _Core problem:_ They have no marketing presence at all and rely entirely on word of mouth.
- _What contributed:_ No website to speak of, no brand, and no way for new customers to find them.
- _Already tried:_ They printed flyers once and got almost no response.
- _On the check-in:_ Yes, it is about building some marketing so they are not invisible.
- _Industry:_ a trades business · _Staircase:_ step 2 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** sales-marketing · **Engagement:** facilitation · **Ceiling:** foundational · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Lite Marketing (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Lite Marketing** _(score 11)_ — a core tool type for this domain; boosted by a firm distinction (+5); matches the topic "sales-marketing"; fits the engagement style.
2. **Business Targets** _(score 9)_ — matches the client's industry by name; fits the engagement style.

---

## sales·low conversion

**The advisor's session (invented):**
- _Core problem:_ Plenty of people enquire but hardly any of them actually buy.
- _What contributed:_ No structured sales approach, no follow-up, and the team is uncomfortable closing.
- _Already tried:_ They tried discounting to win deals which just trained customers to wait for a sale.
- _On the check-in:_ Yes, it is about converting more of the leads they already get.
- _Industry:_ a retailer · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** sales-marketing · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Customer Journey (+5), Sales Session (+10), Phone Techniques (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Sales Session** _(score 16)_ — a core tool type for this domain; boosted by a firm distinction (+10); matches the topic "sales-marketing"; fits the engagement style.
2. **Customer Journey** _(score 10)_ — a related tool type for this domain; boosted by a firm distinction (+5); matches the topic "sales-marketing"; fits the engagement style.

---

## sales·lost major customers

**The advisor's session (invented):**
- _Core problem:_ They have lost two big customers recently and sales are sliding.
- _What contributed:_ Over-reliant on a few accounts, no new business effort, and weak customer relationships.
- _Already tried:_ They called the lost customers to win them back but it was too late.
- _On the check-in:_ Yes, it is about rebuilding sales and not being so exposed to a few accounts.
- _Industry:_ a manufacturer · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** sales-marketing · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Customer Journey (+5), 8 Profit Levers (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **8 Profit Levers** _(score 10)_ — a related tool type for this domain; boosted by a firm distinction (+5); matches the topic "sales-marketing"; fits the engagement style.
2. **Customer Journey** _(score 10)_ — a related tool type for this domain; boosted by a firm distinction (+5); matches the topic "sales-marketing"; fits the engagement style.

---

## forecasting·cash surprises

**The advisor's session (invented):**
- _Core problem:_ They keep getting blindsided by cash - some months there is nothing left to pay the bills.
- _What contributed:_ Very seasonal, no forecast, and they spend in the good months without planning for the lean ones.
- _Already tried:_ They tried watching the bank balance but that is reactive and too late.
- _On the check-in:_ Yes, it is about forecasting cash flow so there are no surprises.
- _Industry:_ a hospitality venue · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** forecasting · **Engagement:** education · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Cash flow problems, working capital issues, or inability to pay bills (×1)
- **Firm distinctions boosting:** Data Session (+5), Planning Session (+5)
- **Distress read:** **YES**  ← FALSE POSITIVE

**Recommended templates, and why:**
1. **Lite Feasibility** _(score 25)_ — matches the topic "forecasting"; strongly matches the problem described (signal weight 20.0); fits the engagement style (preferred).
2. **Forecasting** _(score 25)_ — a core tool type for this domain; matches the topic "forecasting"; strongly matches the problem described (signal weight 20.0).

---

## forecasting·no budget

**The advisor's session (invented):**
- _Core problem:_ They have never done a budget and have no idea what the year ahead looks like.
- _What contributed:_ No plan, no targets, and they cannot tell if they are on track or not.
- _Already tried:_ They jotted some numbers on paper once but never used them.
- _On the check-in:_ Yes, it is about building a budget and forecast they can steer by.
- _Industry:_ a general SME · _Staircase:_ step 2 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** forecasting · **Engagement:** education · **Ceiling:** foundational · **Budget:** 2
- **Problem signals read:** Strategic direction, planning, or pivot required (×1)
- **Firm distinctions boosting:** Money Matters (+5), Planning Session (+10), Data Session (+10)
- **Distress read:** no

**Recommended templates, and why:**
1. **Planning Session** _(score 12)_ — a related tool type for this domain; boosted by a firm distinction (+10); fits the engagement style.
2. **Data Session** _(score 12)_ — a related tool type for this domain; boosted by a firm distinction (+10); fits the engagement style.

---

## forecasting·seasonal swings

**The advisor's session (invented):**
- _Core problem:_ Their income swings wildly with the seasons and they never seem ready for the quiet months.
- _What contributed:_ No cash buffer planning and they overcommit when times are good.
- _Already tried:_ They took out an overdraft to cover the gaps which just added interest.
- _On the check-in:_ Yes, it is about forecasting through the seasonal cycle.
- _Industry:_ a tourism operator · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** forecasting · **Engagement:** education · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Working Capital Cycle (+5), Forecasting (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Tour Operators** _(score 10)_ — a core tool type for this domain; matches the client's industry by name.
2. **Forecasting** _(score 10)_ — a core tool type for this domain; boosted by a firm distinction (+5); matches the topic "forecasting".

---

## governance·accountability

**The advisor's session (invented):**
- _Core problem:_ Decisions get made in meetings and then nothing happens - no one owns anything.
- _What contributed:_ No structure to decisions, the partners undermine each other, and accountability is non-existent.
- _Already tried:_ They started weekly meetings but with no agenda they just talk in circles.
- _On the check-in:_ Yes, it is about decision-making and accountability at the top.
- _Industry:_ a professional firm · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** governance · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** 6 Hats (+5), Alignment Statements (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Firm Board Pack** _(score 11)_ — matches the client's industry by name; matches the topic "governance".
2. **6 Hats** _(score 9)_ — boosted by a firm distinction (+5); matches the topic "governance"; fits the engagement style.

---

## governance·decisions don't stick

**The advisor's session (invented):**
- _Core problem:_ They agree on something and then someone quietly does the opposite a week later.
- _What contributed:_ No clear decision rights, mixed family and business roles, and no follow-through.
- _Already tried:_ They wrote a few rules down but no one refers to them.
- _On the check-in:_ Yes, it is about how decisions are made and made to stick.
- _Industry:_ a family business · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** governance · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** 6 Hats (+5), Alignment Statements (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Business Targets** _(score 10)_ — a related tool type for this domain; matches the client's industry by name; fits the engagement style.
2. **Formal Risk Management** _(score 10)_ — a core tool type for this domain; relevant to the client's industry; matches the topic "governance"; fits the engagement style.

---

## governance·no board structure

**The advisor's session (invented):**
- _Core problem:_ The business has outgrown being run out of the owner's head and needs some proper governance.
- _What contributed:_ No board, no reporting rhythm, and the owner makes every call alone.
- _Already tried:_ They appointed a friend as an advisor but it never became formal.
- _On the check-in:_ Yes, it is about putting a governance and board structure in place.
- _Industry:_ a growing SME · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** governance · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Data integrity, chart of accounts, or financial systems accuracy issues (×1), Governance structure, accountability, or board issues (×1)
- **Firm distinctions boosting:** Governance Introduction (+5), Partner Accountability (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Governance Introduction** _(score 31)_ — a core tool type for this domain; boosted by a firm distinction (+5); matches the topic "governance"; strongly matches the problem described (signal weight 20.0); fits the engagement style.
2. **Partner Accountability** _(score 31)_ — a core tool type for this domain; boosted by a firm distinction (+5); matches the topic "governance"; strongly matches the problem described (signal weight 20.0); fits the engagement style.

---

## strategy·no direction

**The advisor's session (invented):**
- _Core problem:_ They have lost their way - the market shifted and they are not sure what their business even is anymore.
- _What contributed:_ No clear plan, chasing every opportunity, and their old competitive edge has gone.
- _Already tried:_ They did a one-page plan at a retreat two years ago and never looked at it again.
- _On the check-in:_ Yes, it is about strategic direction and where the business is heading.
- _Industry:_ a tech company · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** strategy · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Strategic direction, planning, or pivot required (×2)
- **Firm distinctions boosting:** Lite Strategy (+5), SWOT / PEST (+5), Porters & Pine (+5), 4 Part Bizz Plan (+5), 1 pg Bizz Case (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Lite Strategy** _(score 50)_ — a related tool type for this domain; boosted by a firm distinction (+5); matches the topic "strategy"; strongly matches the problem described (signal weight 40.0); fits the engagement style.
2. **1 pg Bizz Case** _(score 50)_ — a related tool type for this domain; boosted by a firm distinction (+5); matches the topic "strategy"; strongly matches the problem described (signal weight 40.0); fits the engagement style.

---

## strategy·lost edge

**The advisor's session (invented):**
- _Core problem:_ Competitors have caught up and they no longer stand out for anything.
- _What contributed:_ No clear point of difference, competing on price, and margins eroding as a result.
- _Already tried:_ They copied a competitor's offer which just made them look the same.
- _On the check-in:_ Yes, it is about finding a real competitive position again.
- _Industry:_ a retailer · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** strategy · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Lite Strategy (+5), SWOT / PEST (+5), Porters & Pine (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Lite Strategy** _(score 10)_ — a related tool type for this domain; boosted by a firm distinction (+5); matches the topic "strategy"; fits the engagement style.
2. **Porters & Pine** _(score 9)_ — a core tool type for this domain; boosted by a firm distinction (+5); purpose mentions "strategy"; fits the engagement style.

---

## strategy·growth stalled

**The advisor's session (invented):**
- _Core problem:_ They grew fast for years and now growth has completely stalled.
- _What contributed:_ No next-stage plan, the founder is the bottleneck, and the model has run out of road.
- _Already tried:_ They hired more salespeople which did not move the needle.
- _On the check-in:_ Yes, it is about the strategy for the next stage of growth.
- _Industry:_ a services business · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** strategy · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Business systems, process, or technology gaps (×1)
- **Firm distinctions boosting:** Lite Strategy (+5), SWOT / PEST (+5), Porters & Pine (+5), 4 Part Bizz Plan (+5), 1 pg Bizz Case (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Lite Strategy** _(score 14)_ — a related tool type for this domain; relevant to the client's industry; boosted by a firm distinction (+5); matches the topic "strategy"; fits the engagement style.
2. **1 pg Bizz Case** _(score 14)_ — a related tool type for this domain; relevant to the client's industry; boosted by a firm distinction (+5); matches the topic "strategy"; fits the engagement style.

---

## strategy·new market

**The advisor's session (invented):**
- _Core problem:_ They are thinking about moving into a new market and want to know if it makes sense.
- _What contributed:_ No analysis of the opportunity, no view of the competition, and lots of gut enthusiasm.
- _Already tried:_ They had a few informal chats with contacts but nothing structured.
- _On the check-in:_ Yes, it is about whether and how to enter the new market.
- _Industry:_ a manufacturer · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** strategy · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Strategic direction, planning, or pivot required (×1)
- **Firm distinctions boosting:** Lite Strategy (+5), SWOT / PEST (+5), Porters & Pine (+5), 4 Part Bizz Plan (+5), 1 pg Bizz Case (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Lite Strategy** _(score 30)_ — a related tool type for this domain; boosted by a firm distinction (+5); matches the topic "strategy"; strongly matches the problem described (signal weight 20.0); fits the engagement style.
2. **1 pg Bizz Case** _(score 30)_ — a related tool type for this domain; boosted by a firm distinction (+5); matches the topic "strategy"; strongly matches the problem described (signal weight 20.0); fits the engagement style.

---

## systems·chaotic process

**The advisor's session (invented):**
- _Core problem:_ Everything is chaotic - jobs fall through the cracks because nothing is documented or repeatable.
- _What contributed:_ No standard processes, constant bottlenecks, and it all lives in one person's head.
- _Already tried:_ They wrote a few procedures once but no one follows them.
- _On the check-in:_ Yes, it is about getting proper systems and processes in place.
- _Industry:_ a manufacturer · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** systems · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Business systems, process, or technology gaps (×2)
- **Firm distinctions boosting:** Process Session (+10)
- **Distress read:** no

**Recommended templates, and why:**
1. **Process Session** _(score 54)_ — boosted by a firm distinction (+10); matches the topic "systems"; strongly matches the problem described (signal weight 40.0); fits the engagement style.
2. **App Review** _(score 46)_ — a core tool type for this domain; matches the topic "systems"; strongly matches the problem described (signal weight 40.0); fits the engagement style.

---

## systems·owner bottleneck

**The advisor's session (invented):**
- _Core problem:_ Nothing happens unless the owner does it - the business cannot run without them for a day.
- _What contributed:_ No delegation systems, no checklists, and every job needs the owner's input.
- _Already tried:_ They tried to take a week off and the whole place ground to a halt.
- _On the check-in:_ Yes, it is about building systems so the business is not owner-dependent.
- _Industry:_ a trades business · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** systems · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Staff, team, HR, or leadership issues (×1), Business systems, process, or technology gaps (×1)
- **Firm distinctions boosting:** Process Session (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Process Session** _(score 29)_ — boosted by a firm distinction (+5); matches the topic "systems"; strongly matches the problem described (signal weight 20.0); fits the engagement style.
2. **App Review** _(score 26)_ — a core tool type for this domain; matches the topic "systems"; strongly matches the problem described (signal weight 20.0); fits the engagement style.

---

## systems·no documentation

**The advisor's session (invented):**
- _Core problem:_ None of how they work is written down - it is all tribal knowledge.
- _What contributed:_ No documented workflows, inconsistent output, and new staff take months to get up to speed.
- _Already tried:_ They started a procedures folder that has three documents in it.
- _On the check-in:_ Yes, it is about documenting and standardising how they work.
- _Industry:_ a services business · _Staircase:_ step 2 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** systems · **Engagement:** facilitation · **Ceiling:** foundational · **Budget:** 2
- **Problem signals read:** Business systems, process, or technology gaps (×1)
- **Firm distinctions boosting:** Process Session (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Process Session** _(score 29)_ — boosted by a firm distinction (+5); matches the topic "systems"; strongly matches the problem described (signal weight 20.0); fits the engagement style.
2. **App Review** _(score 26)_ — a core tool type for this domain; matches the topic "systems"; strongly matches the problem described (signal weight 20.0); fits the engagement style.

---

## valuation·what is it worth

**The advisor's session (invented):**
- _Core problem:_ The owner wants to know what the business is actually worth - they are thinking about selling.
- _What contributed:_ They have had an offer but no idea if it is fair and no recent valuation.
- _Already tried:_ They used an online valuation calculator and did not trust the result.
- _On the check-in:_ Yes, it is about valuing the business properly before any sale.
- _Industry:_ a wholesaler · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** valuation · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Business Sale Assessment 1 (+5), Indicative Value Questions (+5), Sale Assessment Report 3 (+10), Asset Review (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Sale Assessment Report 3** _(score 17)_ — a core tool type for this domain; boosted by a firm distinction (+10); matches the topic "valuation"; fits the engagement style (preferred).
2. **Advisor Prep** _(score 3)_ — matches the topic "valuation".

---

## valuation·partner buyout

**The advisor's session (invented):**
- _Core problem:_ One partner is buying out the other and they cannot agree on a value.
- _What contributed:_ No valuation methodology agreed and emotions are running high over the number.
- _Already tried:_ They each picked a number from thin air and it caused a stand-off.
- _On the check-in:_ Yes, it is about a defensible valuation for the buyout.
- _Industry:_ a professional firm · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** valuation · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Sale Assessment Report 3 (+5), Asset Review (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Sale Assessment Report 3** _(score 12)_ — a core tool type for this domain; boosted by a firm distinction (+5); matches the topic "valuation"; fits the engagement style (preferred).
2. **CA Firm Strategy** _(score 8)_ — matches the client's industry by name.

---

## valuation·is the offer fair

**The advisor's session (invented):**
- _Core problem:_ A buyer has made an offer and the owner has no way to judge whether it is any good.
- _What contributed:_ No understanding of valuation multiples or what drives the price for their business.
- _Already tried:_ They asked a mate in business who gave them a wildly different figure.
- _On the check-in:_ Yes, it is about assessing whether the offer reflects true value.
- _Industry:_ a manufacturer · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** valuation · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Business Sale Assessment 1 (+5), Indicative Value Questions (+5), Sale Assessment Report 3 (+10), Asset Review (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Sale Assessment Report 3** _(score 17)_ — a core tool type for this domain; boosted by a firm distinction (+10); matches the topic "valuation"; fits the engagement style (preferred).
2. **Advisor Prep** _(score 3)_ — matches the topic "valuation".

---

## risk·customer concentration

**The advisor's session (invented):**
- _Core problem:_ They have one customer that is 70 percent of revenue and no plan for if that customer leaves.
- _What contributed:_ No contingency, no key-person cover, and no risk planning at all.
- _Already tried:_ They keep saying they will diversify but never get to it.
- _On the check-in:_ Yes, it is about managing the risk of being so exposed.
- _Industry:_ a contract supplier · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** risk · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Formal Risk Management (+10)
- **Distress read:** no

**Recommended templates, and why:**
1. **Formal Risk Management** _(score 14)_ — boosted by a firm distinction (+10); matches the topic "risk"; fits the engagement style.
2. **Supply Chain Review** _(score 7)_ — a core tool type for this domain; matches the topic "risk"; fits the engagement style (preferred).

---

## risk·key person

**The advisor's session (invented):**
- _Core problem:_ The whole business depends on one technical person and if they go it collapses.
- _What contributed:_ No succession for the role, no documentation, and no insurance against losing them.
- _Already tried:_ They talked about cross-training but never actually did it.
- _On the check-in:_ Yes, it is about the key-person risk and how to reduce it.
- _Industry:_ a services business · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** risk · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Succession planning, exit, or ownership transition (×1), Business systems, process, or technology gaps (×1)
- **Firm distinctions boosting:** Formal Risk Management (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Formal Risk Management** _(score 13)_ — relevant to the client's industry; boosted by a firm distinction (+5); matches the topic "risk"; fits the engagement style.
2. **Business Clock vs Body Clock** _(score 12)_ — a core tool type for this domain; matches the client's industry by name; fits the engagement style (preferred).

---

## risk·no contingency

**The advisor's session (invented):**
- _Core problem:_ They have no insurance review and no plan for if something goes badly wrong.
- _What contributed:_ No risk register, gaps in cover, and a she'll-be-right attitude.
- _Already tried:_ They renewed the same insurance policy without ever reviewing it.
- _On the check-in:_ Yes, it is about identifying the risks and putting protection in place.
- _Industry:_ a trades business · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** risk · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Formal Risk Management (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Formal Risk Management** _(score 13)_ — relevant to the client's industry; boosted by a firm distinction (+5); matches the topic "risk"; fits the engagement style.
2. **Business Clock vs Body Clock** _(score 12)_ — a core tool type for this domain; matches the client's industry by name; fits the engagement style (preferred).

---

## succession·owner exit no successor

**The advisor's session (invented):**
- _Core problem:_ The owner is getting older and wants to step back but there is no plan for who takes over.
- _What contributed:_ The kids might take it on but nothing is agreed and the owner's identity is tied up in it.
- _Already tried:_ They talked about it at Christmas once and it caused a family argument.
- _On the check-in:_ Yes, it is about succession and handing the business on.
- _Industry:_ a family farm · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** succession · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Succession planning, exit, or ownership transition (×1)
- **Firm distinctions boosting:** Succession Planning (+10)
- **Distress read:** no

**Recommended templates, and why:**
1. **Farm Succession** _(score 35)_ — a core tool type for this domain; matches the client's industry by name; matches the topic "succession"; strongly matches the problem described (signal weight 20.0); fits the engagement style (preferred).
2. **Business Targets** _(score 21)_ — strongly matches the problem described (signal weight 20.0); fits the engagement style.

---

## succession·family handover dispute

**The advisor's session (invented):**
- _Core problem:_ Two of the kids want to run the business and it is causing a real rift over who gets it.
- _What contributed:_ No clear successor, no fairness framework, and the parents are avoiding the decision.
- _Already tried:_ They tried to split it equally on paper which pleased no one.
- _On the check-in:_ Yes, it is about a fair succession plan for the family.
- _Industry:_ a family business · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** succession · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Succession planning, exit, or ownership transition (×1)
- **Firm distinctions boosting:** Farm Succession (+5), Succession Planning (+10)
- **Distress read:** no

**Recommended templates, and why:**
1. **Business Sale Assessment 1** _(score 32)_ — a core tool type for this domain; matches the client's industry by name; strongly matches the problem described (signal weight 20.0); fits the engagement style (preferred).
2. **Business Targets** _(score 29)_ — matches the client's industry by name; strongly matches the problem described (signal weight 20.0); fits the engagement style.

---

## succession·owner identity

**The advisor's session (invented):**
- _Core problem:_ The owner knows they should exit but cannot let go - the business is their whole identity.
- _What contributed:_ No exit timeline, no second line of leadership, and emotional attachment is stalling everything.
- _Already tried:_ They set a retirement date twice and moved it both times.
- _On the check-in:_ Yes, it is about helping the owner transition out of the business.
- _Industry:_ a professional practice · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** succession · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** Succession planning, exit, or ownership transition (×1)
- **Firm distinctions boosting:** Succession Planning (+10)
- **Distress read:** no

**Recommended templates, and why:**
1. **Farm Succession** _(score 27)_ — a core tool type for this domain; matches the topic "succession"; strongly matches the problem described (signal weight 20.0); fits the engagement style (preferred).
2. **Business Targets** _(score 21)_ — strongly matches the problem described (signal weight 20.0); fits the engagement style.

---

## conflict·partner dispute

**The advisor's session (invented):**
- _Core problem:_ The two partners are barely talking - one feels they do all the work and it is getting toxic.
- _What contributed:_ They never agreed what each wanted from the business and resentment has built up.
- _Already tried:_ They tried to thrash it out themselves and it turned into a shouting match.
- _On the check-in:_ Yes, it is about the conflict between the partners.
- _Industry:_ a two-partner business · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** conflict · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Force Field Analysis (+10), Partner Accountability (+5), Alignment Statements (+10)
- **Distress read:** no

**Recommended templates, and why:**
1. **Force Field Analysis** _(score 16)_ — a core tool type for this domain; boosted by a firm distinction (+10); matches the topic "conflict"; fits the engagement style.
2. **Partner Accountability** _(score 15)_ — a related tool type for this domain; matches the client's industry by name; boosted by a firm distinction (+5); fits the engagement style.

---

## conflict·contribution imbalance

**The advisor's session (invented):**
- _Core problem:_ One partner thinks they put in far more than the other but they take equal drawings.
- _What contributed:_ No agreement on roles or contribution and it is festering into open resentment.
- _Already tried:_ They avoided the conversation for a year hoping it would sort itself out.
- _On the check-in:_ Yes, it is about the imbalance and accountability between the partners.
- _Industry:_ a partnership · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** conflict · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Partner Accountability (+5), Force Field Analysis (+5), Alignment Statements (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Partner Accountability** _(score 15)_ — a related tool type for this domain; matches the client's industry by name; boosted by a firm distinction (+5); fits the engagement style.
2. **Orientation Part 1** _(score 11)_ — a core tool type for this domain; matches the client's industry by name; fits the engagement style.

---

## conflict·communication breakdown

**The advisor's session (invented):**
- _Core problem:_ Family members in the business have stopped communicating and it is affecting the staff.
- _What contributed:_ Old grievances, no separation of family and business, and everything is taken personally.
- _Already tried:_ They had one heated family meeting that made things worse.
- _On the check-in:_ Yes, it is about repairing communication and managing the conflict.
- _Industry:_ a family business · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** conflict · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Force Field Analysis (+5), Alignment Statements (+10)
- **Distress read:** no

**Recommended templates, and why:**
1. **Force Field Analysis** _(score 11)_ — a core tool type for this domain; boosted by a firm distinction (+5); matches the topic "conflict"; fits the engagement style.
2. **Business Targets** _(score 11)_ — a core tool type for this domain; matches the client's industry by name; fits the engagement style.

---

## eoy·compliance-to-value

**The advisor's session (invented):**
- _Core problem:_ We have the end-of-year meeting coming up and I want to turn it into more than signing off the accounts.
- _What contributed:_ The compliance work is done; I want to add value and open up advisory.
- _Already tried:_ Last year the EOY meeting was 20 minutes of signing forms and nothing more.
- _On the check-in:_ Yes, it is about making the end-of-year meeting valuable.
- _Industry:_ a general SME · _Staircase:_ step 2 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** eoy · **Engagement:** facilitation · **Ceiling:** foundational · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Dashboard Discussions (+5), 8 Profit Levers (+5), Quick Fire Diagnosis (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **General Meeting Agenda** _(score 10)_ — a related tool type for this domain; matches the client's industry by name; fits the engagement style.
2. **8 Profit Levers** _(score 7)_ — a related tool type for this domain; boosted by a firm distinction (+5); fits the engagement style.

---

## eoy·tax planning

**The advisor's session (invented):**
- _Core problem:_ Before year end I want to have a proper planning conversation with this client, not just compliance.
- _What contributed:_ They have had a strong year and there are planning opportunities we have never discussed.
- _Already tried:_ In the past we only ever spoke after the year had closed when it was too late.
- _On the check-in:_ Yes, it is about a proactive end-of-year planning conversation.
- _Industry:_ a profitable SME · _Staircase:_ step 2 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** eoy · **Engagement:** facilitation · **Ceiling:** foundational · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Dashboard Discussions (+5), 8 Profit Levers (+5), Quick Fire Diagnosis (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **8 Profit Levers** _(score 15)_ — a related tool type for this domain; matches the client's industry by name; boosted by a firm distinction (+5); fits the engagement style.
2. **Profit Levers & Blue Ocean** _(score 9)_ — matches the client's industry by name; fits the engagement style.

---

## eoy·annual review depth

**The advisor's session (invented):**
- _Core problem:_ I want the annual review to actually mean something to the client this year.
- _What contributed:_ Historically it has been a tax formality and the client sees no value in it.
- _Already tried:_ We sent a standard checklist last year and got little engagement.
- _On the check-in:_ Yes, it is about a deeper, more valuable annual review.
- _Industry:_ a services business · _Staircase:_ step 3 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** eoy · **Engagement:** facilitation · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Dashboard Discussions (+5), 8 Profit Levers (+10), Quick Fire Diagnosis (+5), Money Matters (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **8 Profit Levers** _(score 12)_ — a related tool type for this domain; boosted by a firm distinction (+10); fits the engagement style.
2. **Quick Fire Diagnosis** _(score 11)_ — a related tool type for this domain; relevant to the client's industry; boosted by a firm distinction (+5); fits the engagement style.

---

## dd·buying a business

**The advisor's session (invented):**
- _Core problem:_ My client is looking at buying another business and needs help working out if it is a good deal.
- _What contributed:_ They have the target's accounts but do not know what to check or what the risks are.
- _Already tried:_ They glanced at the P&L themselves but have no structured process.
- _On the check-in:_ Yes, it is about due diligence on the acquisition.
- _Industry:_ an acquirer · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** due-diligence · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Stg. 1 Due Diligence (+5), Business Purchase Assessment 1 (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Stg. 1 Due Diligence** _(score 10)_ — a core tool type for this domain; boosted by a firm distinction (+5); purpose mentions "due-diligence"; fits the engagement style (preferred).
2. **Business Dating** _(score 4)_ — matches the topic "due-diligence"; fits the engagement style.

---

## dd·assessing target risks

**The advisor's session (invented):**
- _Core problem:_ They are mid-way through buying a competitor and worried about what they cannot see.
- _What contributed:_ Concerns about customer reliance, hidden liabilities and whether the numbers are real.
- _Already tried:_ They took the seller's word for most of it which makes me nervous.
- _On the check-in:_ Yes, it is about properly assessing the risks in the target.
- _Industry:_ an acquirer · _Staircase:_ step 4 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** due-diligence · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Stg. 1 Due Diligence (+10), Business Purchase Assessment 1 (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Stg. 1 Due Diligence** _(score 15)_ — a core tool type for this domain; boosted by a firm distinction (+10); purpose mentions "due-diligence"; fits the engagement style (preferred).
2. **Business Dating** _(score 4)_ — matches the topic "due-diligence"; fits the engagement style.

---

## dd·earn-out structuring

**The advisor's session (invented):**
- _Core problem:_ They want to buy a business but structure part of the price on future performance.
- _What contributed:_ No view on how to structure the deal, the earn-out terms, or the risks in it.
- _Already tried:_ They proposed a flat price which the seller rejected.
- _On the check-in:_ Yes, it is about structuring and de-risking the acquisition deal.
- _Industry:_ an acquirer · _Staircase:_ step 5 · _Sessions:_ 2

**What the engine decided:**
- **Domain:** due-diligence · **Engagement:** advice · **Ceiling:** strategic · **Budget:** 2
- **Problem signals read:** _none — the engine read no problem signals from the words, so this ran on generic priors only_
- **Firm distinctions boosting:** Stg. 1 Due Diligence (+5), Business Purchase Assessment 1 (+5)
- **Distress read:** no

**Recommended templates, and why:**
1. **Stg. 1 Due Diligence** _(score 10)_ — a core tool type for this domain; boosted by a firm distinction (+5); purpose mentions "due-diligence"; fits the engagement style (preferred).
2. **Business Purchase Assessment 1** _(score 9)_ — a core tool type for this domain; boosted by a firm distinction (+5); fits the engagement style (preferred).

---

## succession·CRISIS failing handover  ⚠ (genuine crisis)

**The advisor's session (invented):**
- _Core problem:_ The owner wants to hand over to the kids but honestly the business is failing and may not survive long enough to hand over anything.
- _What contributed:_ Mounting debt, the bank is circling, and the next generation may inherit a collapse.
- _Already tried:_ They kept hoping a good season would fix it and it has not.
- _On the check-in:_ Yes - it is succession but the urgent issue is whether the business even survives to be handed on.
- _Industry:_ a family farm · _Staircase:_ step 4 · _Sessions:_ 3

**What the engine decided:**
- **Domain:** succession · **Engagement:** advice · **Ceiling:** analytical · **Budget:** 3
- **Problem signals read:** Succession planning, exit, or ownership transition (×2)
- **Firm distinctions boosting:** Succession Planning (+5)
- **Distress read:** **YES**

**Recommended templates, and why:**
1. **Farm Succession** _(score 55)_ — a core tool type for this domain; matches the client's industry by name; matches the topic "succession"; strongly matches the problem described (signal weight 40.0); fits the engagement style (preferred).
2. **Business Targets** _(score 41)_ — strongly matches the problem described (signal weight 40.0); fits the engagement style.
3. **Formal Risk Management** _(score 41)_ — strongly matches the problem described (signal weight 40.0); fits the engagement style.

---

## forecasting·CRISIS cant pay bills  ⚠ (genuine crisis)

**The advisor's session (invented):**
- _Core problem:_ They have run out of cash and genuinely cannot pay this month's bills - they are talking about closing the doors.
- _What contributed:_ No reserves, creditors chasing, and the bank will not extend any further.
- _Already tried:_ They borrowed from family to cover last month and that is now gone too.
- _On the check-in:_ Yes - it started as cash flow but now it is about whether the business survives at all.
- _Industry:_ a hospitality venue · _Staircase:_ step 3 · _Sessions:_ 3

**What the engine decided:**
- **Domain:** forecasting · **Engagement:** education · **Ceiling:** analytical · **Budget:** 3
- **Problem signals read:** Cash flow problems, working capital issues, or inability to pay bills (×1)
- **Firm distinctions boosting:** Working Capital Cycle (+5), Forecasting (+5)
- **Distress read:** **YES**

**Recommended templates, and why:**
1. **Forecasting** _(score 30)_ — a core tool type for this domain; boosted by a firm distinction (+5); matches the topic "forecasting"; strongly matches the problem described (signal weight 20.0).
2. **Working Capital Cycle** _(score 27)_ — boosted by a firm distinction (+5); strongly matches the problem described (signal weight 20.0); fits the engagement style (preferred).
3. **Lite Feasibility** _(score 25)_ — matches the topic "forecasting"; strongly matches the problem described (signal weight 20.0); fits the engagement style (preferred).

---
