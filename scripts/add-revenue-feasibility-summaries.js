/**
 * Adds Revenue & Feasibility Models content summaries to content-summaries.json.
 * 22 structural tool entries + 1 shared industry model entry.
 */

const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')

const filePath = resolve(process.cwd(), 'data/content-summaries.json')
const existing = JSON.parse(readFileSync(filePath, 'utf8'))
const previousCount = existing.length

const newEntries = [
  // ── Shared entry for all 64 industry-specific models ──────────────────────
  {
    name: 'Revenue & Feasibility Industry Model',
    section: 'Revenue & Feasibility Models',
    purpose: 'An industry-specific revenue and feasibility model used as the vital first step in an advisory engagement. More than 74 industry variants exist (Cafe, Hairdressing, Construction, Dentist, etc.) — each one clarifies the specific variables that drive that industry\'s revenue and profit, calculates the client\'s true financial capacity, and compares current reality against probable potential.',
    helpsOwner: 'Eliminates guesswork about the business\'s financial position. Gives the client and advisor a shared, data-driven understanding of where revenue comes from, where margin is lost, and what realistic improvement potential looks like — specific to their industry.',
    helpsAdvisor: 'Demonstrates commercial knowledge in the client\'s specific industry context, building instant credibility and alignment. Creates the data foundation needed to identify performance gaps, set improvement targets, and secure client buy-in to a deeper advisory engagement. Particularly valuable with new clients or when repositioning the relationship from compliance to advisory.',
    indicators: 'Any new or existing client where the advisor does not yet have a clear picture of the revenue model, margin drivers, and capacity constraints. Use at the start of an engagement, when a client\'s profitability has declined without a clear cause, when setting a financial improvement plan, or when a client needs to see the advisor\'s industry knowledge before committing to a deeper engagement.'
  },

  // ── Structural tools ──────────────────────────────────────────────────────
  {
    name: 'Assumptions',
    section: 'Revenue & Feasibility Models',
    purpose: 'The input and setup sheet for revenue and feasibility models — where the advisor captures the key business assumptions (pricing, volume, costs, staffing ratios) that drive all downstream calculations in the model.',
    helpsOwner: 'Ensures the business owner\'s assumptions about their own numbers are made explicit and stress-tested before committing to a financial plan — surfacing unrealistic expectations early.',
    helpsAdvisor: 'Provides a single reference point for all model inputs, making it easy to run scenario changes by adjusting one assumption rather than editing the model directly. Creates a transparent audit trail of what was agreed at the start of the engagement.',
    indicators: 'Use at the start of any revenue or feasibility modelling engagement to establish the baseline assumptions before building out the full model.'
  },
  {
    name: 'Break-Even',
    section: 'Revenue & Feasibility Models',
    purpose: 'Calculates the exact revenue level at which the business covers all fixed and variable costs and begins to generate profit. Includes contribution margin analysis to show which products or services carry the most margin weight.',
    helpsOwner: 'Gives the business owner a clear, non-negotiable revenue target they must hit before the business is sustainable — removing any ambiguity about minimum performance requirements.',
    helpsAdvisor: 'Provides an instant benchmark for assessing whether a client\'s current revenue is above or below the survival threshold, and by how much. Essential for crisis clients, new business feasibility assessments, and businesses considering a major cost restructure.',
    indicators: 'New business start-ups, clients facing declining revenue, businesses considering a significant cost restructure, or any engagement where the viability of the current business model is in question.'
  },
  {
    name: 'Back Costing',
    section: 'Revenue & Feasibility Models',
    purpose: 'Works backward from a desired profit or owner salary outcome to calculate the revenue, pricing, and volume needed to achieve it — reversing the typical bottom-up P&L approach.',
    helpsOwner: 'Reveals whether the owner\'s financial goals are achievable given their current cost structure and pricing — preventing them from setting aspirational targets that the business model simply cannot support.',
    helpsAdvisor: 'Quickly identifies the gap between where the client is and what they need to achieve their target, framing improvement priorities clearly in terms of price increase, volume growth, or cost reduction.',
    indicators: 'Clients who know what they want to earn but have no clear plan for how to get there. Use when setting financial targets during a strategy or planning session, or when a client\'s salary expectations are misaligned with their current revenue.'
  },
  {
    name: 'EBITDA',
    section: 'Revenue & Feasibility Models',
    purpose: 'Normalises a client\'s earnings by removing financing decisions, tax positions, depreciation schedules, and owner-specific costs — producing a clean EBITDA figure for benchmarking, valuation, and performance comparison.',
    helpsOwner: 'Provides a clear picture of the business\'s true operating performance, separate from how it is financed or what the owner chooses to pay themselves.',
    helpsAdvisor: 'Essential for valuation conversations, business sale preparation, and benchmarking against industry peers. Also exposes distorted profitability caused by unusual owner drawings, related-party transactions, or non-recurring costs.',
    indicators: 'Clients considering a sale or valuation, businesses preparing for a capital raise, any engagement where the P&L is distorted by owner remuneration or unusual depreciation, or when a multiple-of-earnings valuation is being discussed.'
  },
  {
    name: 'Margin vs Markup',
    section: 'Revenue & Feasibility Models',
    purpose: 'A teaching and calculation tool that clarifies the mathematical difference between margin (profit as a percentage of sale price) and markup (profit as a percentage of cost) — and shows how confusing the two leads to systematic underpricing.',
    helpsOwner: 'Corrects one of the most common and costly pricing mistakes small business owners make — believing they are operating on a certain margin when they are actually operating on a lower one.',
    helpsAdvisor: 'Provides a simple, visual demonstration that can be delivered quickly in a client meeting, building credibility while directly improving the client\'s pricing literacy. Often a high-impact, fast-win conversation.',
    indicators: 'Any client who sets prices using a markup but talks about their business in terms of margin, or whose gross profit is consistently lower than expected despite hitting revenue targets. Retail, hospitality, and trade businesses are particularly susceptible to this confusion.'
  },
  {
    name: 'Volatility Scenario',
    section: 'Revenue & Feasibility Models',
    purpose: 'Models the financial impact of revenue or cost volatility on business performance — running multiple scenarios to show how changes in key variables (price, volume, input costs, exchange rates) affect profitability under different conditions.',
    helpsOwner: 'Prepares the business owner for unexpected market changes by quantifying the financial impact of various scenarios before they occur, enabling proactive rather than reactive decision-making.',
    helpsAdvisor: 'Creates the evidence base for risk management and contingency planning conversations, showing clients which variables they are most exposed to and which levers to pull if conditions deteriorate.',
    indicators: 'Businesses in volatile industries (hospitality, rural, construction, import), clients facing rising input costs, or any engagement where a single key variable (fuel cost, exchange rate, commodity price) could materially affect viability.'
  },
  {
    name: 'Worst Case Scenario',
    section: 'Revenue & Feasibility Models',
    purpose: 'A dedicated downside planning model that stress-tests the business against its worst plausible outcome — used to establish the floor of financial performance and determine whether the business can survive it.',
    helpsOwner: 'Forces a realistic assessment of downside risk before it materialises, allowing the owner to prepare contingency measures rather than being caught off-guard by a predictable event.',
    helpsAdvisor: 'Provides the data needed for risk management and business continuity conversations. Establishes whether the client needs a cash buffer, an insurance strategy, or a structural change to survive a worst-case event.',
    indicators: 'Clients who have never modelled a downside scenario, businesses with high fixed cost bases, and any engagement involving risk management, succession planning, or a significant strategic decision with meaningful downside exposure.'
  },
  {
    name: 'Forecasting',
    section: 'Revenue & Feasibility Models',
    purpose: 'A forward-looking revenue and cost projection model for building 12-month or multi-year financial forecasts. Tracks assumptions against actuals to continuously improve forecast accuracy over time.',
    helpsOwner: 'Replaces gut-feel planning with a structured, data-driven forward view — allowing the owner to see cash flow implications, staffing requirements, and growth milestones before they arrive.',
    helpsAdvisor: 'Creates a regular financial anchor point for advisory meetings. Each month\'s actuals update the forecast, giving the advisor concrete data to work from and making performance gap conversations more precise and productive.',
    indicators: 'Clients who are planning growth, preparing for a finance application, managing cash flow uncertainty, or who currently have no formal forward financial plan in place.'
  },
  {
    name: 'Sales Dashboard',
    section: 'Revenue & Feasibility Models',
    purpose: 'A real-time sales performance tracking tool that monitors revenue against target, conversion rates, average transaction value, and sales pipeline activity — providing a live view of sales health at a glance.',
    helpsOwner: 'Replaces anecdotal reporting with objective data, allowing the owner to identify sales shortfalls early enough to intervene rather than discovering them at month-end when it is too late.',
    helpsAdvisor: 'Provides a structured conversation starter for every advisory meeting — if sales are tracking below target, the dashboard immediately surfaces whether the issue is volume, conversion rate, or average transaction value.',
    indicators: 'Businesses with a dedicated sales function, clients with declining revenue who lack visibility into their pipeline, and any client where improving sales performance is a key advisory objective.'
  },
  {
    name: 'Labour Only',
    section: 'Revenue & Feasibility Models',
    purpose: 'A labour-cost-focused revenue model for businesses where labour is the primary cost driver and revenue is directly tied to hours or units of labour deployed.',
    helpsOwner: 'Shows the exact relationship between staffing levels, chargeable hours, and revenue — making it clear how many staff or hours are needed to generate a target revenue figure.',
    helpsAdvisor: 'Simplifies the modelling conversation for pure service businesses where the margin equation is straightforward: more chargeable hours at a higher rate equals more profit.',
    indicators: 'Professional services firms, trade businesses, healthcare providers, cleaning companies, and any business where staff time is the primary revenue-generating asset and there is minimal product cost.'
  },
  {
    name: 'Labour, Margin',
    section: 'Revenue & Feasibility Models',
    purpose: 'Extends the Labour Only model by adding a margin layer — used for businesses that generate revenue from both labour and products or materials sold at a margin.',
    helpsOwner: 'Clarifies which revenue stream (labour vs. product/materials) contributes most to profit, and where pricing changes will have the greatest impact on the bottom line.',
    helpsAdvisor: 'Identifies whether profitability is being undermined by low margin on materials or products even when labour revenue is strong — a common issue in trade and construction businesses.',
    indicators: 'Trade businesses, construction companies, workshop-based businesses, and any business that bills for both time and materials.'
  },
  {
    name: 'Labour, Margin, Sales',
    section: 'Revenue & Feasibility Models',
    purpose: 'The most comprehensive of the labour-based models — adds a sales volume layer to the Labour + Margin structure, modelling how changes in sales activity feed through to labour demand, margin, and net profit.',
    helpsOwner: 'Provides a complete picture of how a sales campaign or growth initiative will translate into operational requirements and financial outcomes before the owner commits resources.',
    helpsAdvisor: 'Enables end-to-end planning conversations where growth in sales must be balanced against capacity, margin, and cost — preventing clients from growing into unprofitability by taking on more work than they can deliver profitably.',
    indicators: 'Businesses planning a sales push, firms entering a growth phase, or any client where the connection between sales activity and operational capacity needs to be explicitly quantified.'
  },
  {
    name: 'Labour Margin Mix',
    section: 'Revenue & Feasibility Models',
    purpose: 'Models revenue for businesses with a mixed labour and margin revenue structure — used when the ratio of labour to product revenue varies significantly across different service or product lines.',
    helpsOwner: 'Shows how changing the product/service mix affects overall profitability, enabling more strategic decisions about which offerings to promote or scale.',
    helpsAdvisor: 'Allows scenario testing of different revenue mixes, helping clients understand which combination of labour and product revenue produces the highest margin at their current cost structure.',
    indicators: 'Businesses with multiple revenue streams that mix time-billing with product sales, or service businesses considering adding a product line to their offering.'
  },
  {
    name: 'Lease vs. Buy',
    section: 'Revenue & Feasibility Models',
    purpose: 'A financial comparison model for evaluating whether it is more cost-effective to lease or purchase a capital asset (vehicle, equipment, property) — factoring in cash flow, tax treatment, depreciation, and total cost of ownership.',
    helpsOwner: 'Provides an objective financial basis for a major capital decision rather than relying on instinct or the advice of the vendor or financier, who have a conflict of interest.',
    helpsAdvisor: 'Demonstrates tangible financial advisory value by modelling a decision the client is already facing — creating a clear, quantified recommendation that is easy to act on and memorable.',
    indicators: 'Clients facing a major asset acquisition decision, businesses considering equipment upgrades or replacements, and any engagement where capital allocation is a priority conversation.'
  },
  {
    name: 'Quick Position',
    section: 'Revenue & Feasibility Models',
    purpose: 'A rapid financial position tool that provides an immediate, high-level snapshot of a business\'s revenue, cost structure, and margin — used when a full model is not needed but a quick financial reality check is.',
    helpsOwner: 'Gets a fast, clear picture of where the business stands financially without the setup time of a full feasibility model.',
    helpsAdvisor: 'Enables the advisor to establish financial credibility quickly in an early-stage client conversation by producing a meaningful output from minimal inputs — ideal for prospect meetings.',
    indicators: 'First meetings with a new prospect, quick-check sessions with existing clients, or any situation where time is limited but a financial anchor point is needed to ground the conversation.'
  },
  {
    name: 'Wages Review',
    section: 'Revenue & Feasibility Models',
    purpose: 'A structured wages cost analysis tool that models the total cost of the workforce — including base wages, taxes, and on-costs — and tests the financial impact of wage increases, restructures, or additional hires.',
    helpsOwner: 'Makes the true cost of wages visible and allows the owner to model the impact of pay rises or restructuring before committing, rather than discovering the cost impact after the fact.',
    helpsAdvisor: 'Provides data for staff cost conversations and helps clients understand why wage decisions that feel small on an individual basis can have significant cumulative impact at a business level.',
    indicators: 'Clients approaching an annual wage review, businesses planning to hire, businesses experiencing wage cost pressure, or any client where staff costs represent a major portion of operating expenses.'
  },
  {
    name: 'Sales Forecaster',
    section: 'Revenue & Feasibility Models',
    purpose: 'A dedicated sales forecast model that projects future revenue based on conversion assumptions, pipeline volume, average deal size, and sales cycle length — activity-driven and forward-looking rather than historically based.',
    helpsOwner: 'Translates sales activity (calls made, proposals sent, meetings booked) into projected revenue — giving the owner a leading indicator of future performance rather than a lagging one.',
    helpsAdvisor: 'Creates a basis for holding proactive sales conversations in advisory meetings. If the pipeline suggests a revenue shortfall 60 days out, the advisor can intervene early rather than reviewing a problem that has already happened.',
    indicators: 'Businesses with a structured sales process, clients building a sales team, or any engagement where improving pipeline visibility and sales predictability is an objective.'
  },
  {
    name: 'Finance & Depreciation',
    section: 'Revenue & Feasibility Models',
    purpose: 'Models the cost of financing a capital asset over its useful life — combining loan repayment schedules, interest costs, and depreciation treatment to show the true annual cost of ownership and its impact on profit.',
    helpsOwner: 'Reveals the full financial impact of a financing decision rather than just the monthly repayment figure — particularly important when tax depreciation and interest deductibility are relevant to the decision.',
    helpsAdvisor: 'Enables precise modelling of any scenario involving asset financing, making capital investment conversations far more credible and actionable than a rough estimate.',
    indicators: 'Clients considering equipment, vehicle, or property financing; businesses preparing for a capital expenditure round; any engagement where depreciation treatment and its effect on reported profit needs to be explained.'
  },
  {
    name: 'Finance and Depreciation',
    section: 'Revenue & Feasibility Models',
    purpose: 'Models the cost of financing a capital asset over its useful life — combining loan repayment schedules, interest costs, and depreciation treatment to show the true annual cost of ownership and its impact on profit.',
    helpsOwner: 'Reveals the full financial impact of a financing decision rather than just the monthly repayment figure — particularly important when tax depreciation and interest deductibility are relevant to the decision.',
    helpsAdvisor: 'Enables precise modelling of any scenario involving asset financing, making capital investment conversations far more credible and actionable than a rough estimate.',
    indicators: 'Clients considering equipment, vehicle, or property financing; businesses preparing for a capital expenditure round; any engagement where depreciation treatment and its effect on reported profit needs to be explained.'
  },
  {
    name: 'Personal Budget',
    section: 'Revenue & Feasibility Models',
    purpose: 'A personal financial budget model that maps the owner\'s household income requirements against the business\'s ability to generate those drawings — ensuring personal financial needs are factored into business planning.',
    helpsOwner: 'Clarifies exactly how much the business needs to generate to support the owner\'s personal lifestyle, making the connection between business performance and personal financial security explicit and undeniable.',
    helpsAdvisor: 'Provides the critical input for determining a client\'s true financial target. A business plan that does not account for personal drawings may achieve its stated financial goals while leaving the owner financially stressed — this template prevents that gap.',
    indicators: 'Owner-operated businesses, clients setting revenue targets for the year ahead, and any engagement where the owner\'s salary or drawings have been inconsistent, underpaid, or unclear.'
  },
  {
    name: 'High Level Budget',
    section: 'Revenue & Feasibility Models',
    purpose: 'A top-down budgeting model that establishes the overall revenue and cost framework for the business — used when a detailed line-by-line budget is not required but a structured financial plan is.',
    helpsOwner: 'Provides a financial plan that is simple enough to understand and use without requiring deep accounting knowledge — giving the owner something they will actually refer to during the year.',
    helpsAdvisor: 'Creates a financial baseline for the year that can be referenced in every subsequent advisory meeting, making performance tracking conversations precise and efficient without requiring full management account complexity.',
    indicators: 'SME clients without a formal budget in place, businesses entering a new financial year without a financial plan, and early-stage advisory engagements where establishing a financial baseline is the first priority.'
  }
]

// De-duplicate: skip any entry whose name already exists
const existingNames = new Set(existing.map(e => e.name))
const toAdd = newEntries.filter(e => !existingNames.has(e.name))

const updated = [...existing, ...toAdd]
writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8')
console.log('Previous count:', previousCount)
console.log('New entries added:', toAdd.length)
console.log('Total:', updated.length)
if (toAdd.length < newEntries.length) {
  console.log('Skipped (already existed):', newEntries.length - toAdd.length)
}
