/**
 * Adds 3 new logic trees to data/logic_trees.json and 3 new domain entries to data/domains.json:
 *  - stock_purchasing  (Stock Purchasing & Inventory Management)
 *  - raising_capital   (Raising Capital & Business Acquisition)
 *  - fm_coach_culture  (FM Coaching & Firm Culture)
 */

const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')

// ── logic_trees.json ────────────────────────────────────────────────────────

const ltPath = resolve(process.cwd(), 'data/logic_trees.json')
const lt = JSON.parse(readFileSync(ltPath, 'utf8'))

const existingIds = new Set(lt.trees.map(t => t.id))

const newTrees = [
  // ── 1. Stock Purchasing ─────────────────────────────────────────────────
  {
    id: 'stock_purchasing',
    name: 'Stock Purchasing & Inventory Management',
    description: 'Guides advisors through stock categorisation (exotic/bulk/standard), reorder trigger analysis, and cash-flow approval checks before committing to a stock order. Surfaces the correct purchase assessment template based on the type of stock and the client\'s liquidity position.',
    entry_triggers: [
      'stock purchasing',
      'inventory management',
      'stock levels',
      'order quantities',
      'reorder point',
      'stock replenishment',
      'purchase assessment',
      'stock policies',
      'inventory control',
      'days on hand',
      'unit cost risk',
      'stock order',
      'purchasing model',
      'too much stock',
      'running out of stock',
      'cash conversion cycle',
      'stock cash flow',
      'bulk purchasing',
      'exotic stock',
      'imported goods',
      'stock holding costs'
    ],
    nodes: [
      {
        id: 'sp_entry',
        branch_name: 'Stock Purchasing — Situation Assessment',
        type: 'assessment',
        condition: 'Client has a stock purchasing or inventory management issue',
        notes: 'Four distinct stock problems require different approaches. The key distinctions are: (1) Categorisation — not all stock follows the same reorder model. Exotic/imported items and bulk commodities need adjusted weighting rules. (2) Reorder Trigger — the mathematical signal to replenish: (Current Stock + In-Transit) ≤ (Average Daily Units Sold × Days to Arrive). (3) Financial Approval — before any order, validate that the Quick Ratio is healthy and available cash covers both the order and upcoming operational expenses. (4) Policy Review — if the business lacks a structured purchasing process, the priority is building one before optimising it.',
        branches: [
          {
            answer_pattern: 'need to assess stock type and determine the right ordering parameters',
            next_node: 'sp_categorise'
          },
          {
            answer_pattern: 'need to determine when to trigger a reorder — running out or sitting on too much',
            next_node: 'sp_reorder'
          },
          {
            answer_pattern: 'cash flow concern — worried about whether the business can afford the stock order',
            next_node: 'sp_financial'
          },
          {
            answer_pattern: 'no formal stock purchasing policy or process — need to build one from scratch',
            next_node: 'sp_policies'
          }
        ]
      },
      {
        id: 'sp_categorise',
        branch_name: 'Stock Categorisation — Exotic vs Bulk vs Standard',
        type: 'question',
        condition: 'Client needs help determining the right purchasing model for their stock type',
        question: 'How would you describe the primary stock items we\'re managing — are they high-value, slow-moving items you source individually (imported, specialty, or singular items), high-volume low-margin commodities you buy in bulk, or a standard mixed inventory?',
        notes: 'Stock type determines which weighting factors dominate the purchasing matrix. Exotic/imported items: prioritise Days on Hand over Volume — these items move slowly by nature but carry high margins, so the normal volume weighting would incorrectly flag them as underperforming. Bulk/commodity items: prioritise Volume and Unit Cost Risk over Days on Hand — penalising high stock levels for fast-moving commodities ignores the operational risk of running out. Standard mixed: apply the full matrix without adjustment.',
        branches: [
          {
            answer_pattern: 'high-value specialty or imported items — singular or exotic stock',
            next_node: 'sp_exotic'
          },
          {
            answer_pattern: 'bulk or commodity items — high volume, lower margin, fast moving',
            next_node: 'sp_bulk'
          },
          {
            answer_pattern: 'standard mixed inventory',
            next_node: 'sp_standard'
          }
        ]
      },
      {
        id: 'sp_exotic',
        branch_name: 'Exotic / Imported Stock — Days on Hand Priority',
        type: 'recommendation',
        condition: 'Stock is high-value, singular, or imported — slow-moving by design',
        notes: 'Ignore Volume weighting in the purchasing matrix for these items. The correct metric is Days on Hand. High stock levels are expected and do not indicate inefficiency — they reflect long lead times and the need for buffer stock on hard-to-replace items. The Purchase Assessment Model 2 handles non-standard inventory profiles.',
        recommendation: 'Use Purchase Assessment Model 2 to assess reorder quantities and lead time buffers. Pair with Stock Policies to document the exotic/imported item classification rules so the purchasing decision is repeatable.',
        templates: ['Purchase Assessment Model 2', 'Stock Policies']
      },
      {
        id: 'sp_bulk',
        branch_name: 'Bulk / Commodity Stock — Volume and Unit Cost Risk Priority',
        type: 'recommendation',
        condition: 'Stock is high-volume, fast-moving commodity items',
        notes: 'Ignore Days on Hand weighting for bulk items — high stock levels are operationally necessary, not inefficient. The relevant risks are Unit Cost Risk (price volatility on commodity inputs) and Volume sold. Bulk purchasing commitments also expose the business to cash conversion cycle risk if a batch doesn\'t move as expected.',
        recommendation: 'Use Purchase Assessment Report 3 which weights Volume and Unit Cost Risk correctly for commodity stock. Establish Stock Policies to define maximum/minimum order boundaries and approved supplier terms.',
        templates: ['Purchase Assessment Report 3', 'Stock Policies']
      },
      {
        id: 'sp_standard',
        branch_name: 'Standard Mixed Inventory — Full Matrix Assessment',
        type: 'recommendation',
        condition: 'Standard mixed stock with no unusual categorisation requirements',
        notes: 'Apply the full purchasing matrix using both Days on Hand and Volume weighting equally. The Business Purchase Assessment 1 covers standard inventory assessment.',
        recommendation: 'Use Business Purchase Assessment 1 as the primary tool. If the business is scaling and needs more granular control, add Stock Policies to document reorder rules, supplier terms, and approval thresholds.',
        templates: ['Business Purchase Assessment 1', 'Stock Policies']
      },
      {
        id: 'sp_reorder',
        branch_name: 'Reorder Trigger Analysis',
        type: 'question',
        condition: 'Client needs to determine when to trigger stock replenishment',
        question: 'Do we know the business\'s average daily units sold, current stock on hand, any stock already in transit, and the supplier\'s typical lead time in days?',
        notes: 'The reorder trigger formula is: (Current Stock On Hand + In-Transit Stock) ≤ (Average Daily Units Sold × Days to Arrive from Supplier). If this condition is met, a replenishment order must be placed immediately to avoid a stockout. Without accurate daily sales and lead time data, any reorder system will be unreliable. The first step may be establishing a baseline of daily sales data before optimising the trigger.',
        branches: [
          {
            answer_pattern: 'yes — we have daily sales data, current stock levels, and supplier lead times',
            next_node: 'sp_reorder_calc'
          },
          {
            answer_pattern: 'no — the data is incomplete or we are estimating',
            next_node: 'sp_reorder_data'
          }
        ]
      },
      {
        id: 'sp_reorder_calc',
        branch_name: 'Reorder Calculation — Trigger Test',
        type: 'recommendation',
        condition: 'Data is available to calculate the reorder trigger',
        notes: 'Calculate: (Current Stock + In-Transit) vs (Daily Units Sold × Lead Days). If the result shows the trigger is met or near, initiate an order and move to the financial approval check. The Purchase Assessment Report 3 is the right tool for running this scenario with the client.',
        recommendation: 'Run the reorder trigger calculation using Purchase Assessment Report 3. Then use Stock Policies to document the trigger thresholds so future reorder decisions are systematic rather than reactive.',
        templates: ['Purchase Assessment Report 3', 'Stock Policies']
      },
      {
        id: 'sp_reorder_data',
        branch_name: 'Reorder Data Gap — Baseline First',
        type: 'recommendation',
        condition: 'Data needed for accurate reorder calculations is missing or estimated',
        notes: 'Optimising a reorder system without reliable data produces a false sense of control. The priority is to establish a 4–8 week baseline of actual daily sales by SKU before setting trigger thresholds. Use the Business Purchase Assessment 1 as a starting point with estimated figures, then refine once data is collected.',
        recommendation: 'Start with Business Purchase Assessment 1 using best-estimate inputs to establish a working model. Use Stock Policies to document what data needs to be tracked and by whom, creating an accountability structure for data collection going forward.',
        templates: ['Business Purchase Assessment 1', 'Stock Policies']
      },
      {
        id: 'sp_financial',
        branch_name: 'Financial Approval Check — Liquidity Before Ordering',
        type: 'question',
        condition: 'Cash flow concern before committing to a stock order',
        question: 'Is the Quick Ratio (liquid assets vs current liabilities) healthy, and is there enough available cash to cover both the stock order AND upcoming capital expenditure and seasonally-adjusted operational expenses?',
        notes: 'The financial approval check is a two-part test: (1) Quick Ratio — measures whether the business can cover current liabilities without selling inventory. A ratio below 1.0 signals the business may be too illiquid to take on new stock without compromising operations. (2) Cash adequacy — available cash must cover both the stock order and any upcoming Capex or seasonal expenses. Buying stock while neglecting upcoming operational commitments is a common cause of cash flow crises in product businesses.',
        branches: [
          {
            answer_pattern: 'quick ratio is healthy and there is sufficient cash for the order and upcoming expenses',
            next_node: 'sp_approve'
          },
          {
            answer_pattern: 'low liquidity or upcoming capex means cash is constrained',
            next_node: 'sp_reject'
          }
        ]
      },
      {
        id: 'sp_approve',
        branch_name: 'Financial Approval — Proceed to Order',
        type: 'recommendation',
        condition: 'Liquidity is adequate — safe to proceed with the stock order',
        notes: 'The business has sufficient liquidity to proceed. Use the appropriate purchase assessment model based on stock type to determine optimal order quantity.',
        recommendation: 'Proceed with the stock order. Use the relevant Purchase Assessment template (Business Purchase Assessment 1 for standard stock, Purchase Assessment Report 3 for bulk/reorder scenarios, or Purchase Assessment Model 2 for exotic items) to determine order quantities. Document the financial approval criteria in Stock Policies.',
        templates: ['Business Purchase Assessment 1', 'Purchase Assessment Report 3', 'Stock Policies']
      },
      {
        id: 'sp_reject',
        branch_name: 'Financial Rejection — Halt or Reduce Order',
        type: 'recommendation',
        condition: 'Low liquidity or upcoming cash commitments make a full stock order unsafe',
        notes: 'Proceeding with the full order risks the business\'s ability to meet operational expenses. The options are: (1) Halt the order entirely and wait for cash position to improve. (2) Reduce order quantities to strictly necessary daily minimums — order only enough to prevent a stockout, not to optimise bulk pricing. The short-term cost of smaller orders is less than the risk of a cash flow crisis.',
        recommendation: 'Use Stock Policies to determine the minimum viable order quantity. Use Business Purchase Assessment 1 or Purchase Assessment Report 3 to model what a reduced order looks like vs the full order, so the decision is data-driven rather than a gut call.',
        templates: ['Stock Policies', 'Business Purchase Assessment 1']
      },
      {
        id: 'sp_policies',
        branch_name: 'Stock Policy Review — Build Purchasing Process',
        type: 'recommendation',
        condition: 'No formal stock purchasing policy or process exists',
        notes: 'Without a documented purchasing policy, every stock decision is made ad hoc, creating inconsistency, over-ordering, under-ordering, and cash flow risk. The policy should define: approved suppliers and payment terms, stock categorisation rules (exotic vs bulk vs standard), reorder trigger thresholds by SKU category, financial approval criteria before placing orders, and who has authority to authorise purchases at different dollar thresholds.',
        recommendation: 'Start with Stock Policies to document the purchasing framework. Then use Business Purchase Assessment 1 to run a baseline assessment and populate the policy with real data.',
        templates: ['Stock Policies', 'Business Purchase Assessment 1']
      }
    ]
  },

  // ── 2. Raising Capital ──────────────────────────────────────────────────
  {
    id: 'raising_capital',
    name: 'Raising Capital & Business Acquisition',
    description: 'Guides advisors through capital raising scenarios — from VC pitch preparation through post-term-sheet due diligence, organisational transformation, entrepreneurial path selection, and acquisition-led entry. Surfaces Pitch Deck and Cost of Capital as primary tools alongside external specialist referrals where appropriate.',
    entry_triggers: [
      'raising capital',
      'raise capital',
      'investment',
      'investors',
      'pitch deck',
      'venture capital',
      'equity funding',
      'term sheet',
      'capital raise',
      'business acquisition',
      'search fund',
      'ETA',
      'entrepreneur',
      'starting a business',
      'franchise model',
      'external funding',
      'due diligence capital',
      'kotter change',
      'organisational transformation',
      'rich vs royal',
      'business model selection',
      'blank pitch deck',
      'data room',
      'virtual data room',
      'six hurdles fundraising',
      'cost of capital',
      'capital structure',
      'debt vs equity'
    ],
    nodes: [
      {
        id: 'rc_entry',
        branch_name: 'Raising Capital — Situation Assessment',
        type: 'assessment',
        condition: 'Client is dealing with a capital raising, business transformation, or entrepreneurial entry situation',
        notes: 'Five distinct capital and acquisition scenarios require different advisory paths. Key distinctions: (1) Active capital seeking — the client knows they need external funding and is ready to pitch. This requires pitch preparation and an understanding of the six procedural hurdles of fundraising. (2) Post-term sheet — a term sheet has been signed and the 90-day due diligence clock has started. Speed and organisation are critical. (3) Organisational transformation — an established business needs a major strategic change. Kotter\'s 8-Step Change Process applies. (4) Path selection — an aspiring entrepreneur is deciding what type of business to start. The Rich vs Royal and Six Patterns of Entrepreneurship frameworks are relevant. (5) Acquisition — the client wants to become an entrepreneur by acquiring an existing business rather than starting one.',
        branches: [
          {
            answer_pattern: 'actively seeking external capital — preparing to approach investors',
            next_node: 'rc_seeking'
          },
          {
            answer_pattern: 'term sheet has been signed — now in due diligence preparation phase',
            next_node: 'rc_term_sheet'
          },
          {
            answer_pattern: 'established business needing major transformation — change management challenge',
            next_node: 'rc_transformation'
          },
          {
            answer_pattern: 'aspiring entrepreneur deciding what type of business or model to pursue',
            next_node: 'rc_aspiring'
          },
          {
            answer_pattern: 'wants to acquire an existing business rather than start from scratch',
            next_node: 'rc_acquisition'
          }
        ]
      },
      {
        id: 'rc_seeking',
        branch_name: 'Capital Raising — Pitch Preparation',
        type: 'question',
        condition: 'Client is actively preparing to seek external capital from investors',
        question: 'At what stage is the pitch preparation — does the client have a clear "Ask" (the specific amount being sought and how it will be used), or are we starting from scratch with no pitch materials?',
        notes: 'The six procedural hurdles of fundraising: (1) Define the Ask — amount, use of funds, equity offered, valuation basis. (2) Build the pitch deck — problem, solution, market size, traction, team, financials, ask. (3) Identify target investors — strategic vs financial, sector-specific vs generalist. (4) Initial outreach and screening meetings. (5) Term sheet negotiation. (6) Due diligence and close. Most clients underestimate how long this process takes — 6 to 18 months is typical for a first raise. The pitch deck must be investor-grade, not a PowerPoint summary. The Cost of Capital model helps the client understand what they are giving up and at what valuation.',
        branches: [
          {
            answer_pattern: 'clear ask defined — need to build or refine the pitch deck',
            next_node: 'rc_pitch'
          },
          {
            answer_pattern: 'starting from scratch — no defined ask and no pitch materials yet',
            next_node: 'rc_pitch_foundation'
          }
        ]
      },
      {
        id: 'rc_pitch',
        branch_name: 'Pitch Deck — Refinement',
        type: 'recommendation',
        condition: 'Client has a defined ask and needs to build or refine pitch materials',
        notes: 'A strong pitch deck covers: problem, solution, market opportunity, traction/evidence, business model, team, financial projections, and the ask. Investors evaluate the team as much as the idea — credibility and track record matter. Advisors should ensure the financials are defensible and the ask reflects a realistic valuation basis.',
        recommendation: 'Use the Pitch Deck template as the primary structure. Use Cost of Capital to help the client understand their cost of equity vs debt and ensure the proposed capital structure is optimal before they commit to a funding path.',
        templates: ['Pitch Deck', 'Cost of Capital']
      },
      {
        id: 'rc_pitch_foundation',
        branch_name: 'Pitch Foundation — Define the Ask First',
        type: 'recommendation',
        condition: 'No defined ask — client needs foundational work before pitch preparation',
        notes: 'Without a clearly defined ask, pitch preparation is premature. The advisor should work through: what the capital will be used for (growth, acquisition, product development, working capital), how much is needed, what equity or debt the client is willing to offer, and what valuation basis they will defend. The Cost of Capital model helps quantify the true cost of equity dilution and alternative debt structures before the client commits to an equity raise.',
        recommendation: 'Start with Cost of Capital to help the client model equity vs debt scenarios and understand the true cost of each option. Then use the Pitch Deck template once the ask and use of funds are defined.',
        templates: ['Cost of Capital', 'Pitch Deck']
      },
      {
        id: 'rc_term_sheet',
        branch_name: 'Post-Term Sheet — Due Diligence Preparation',
        type: 'recommendation',
        condition: 'A term sheet has been signed — the client is now in a 90-day due diligence window',
        notes: 'Once a term sheet is signed, the clock is running. Month 1 priority: conduct a legal and IP compliance health check to catch red flags before the investor\'s due diligence team does. Month 2: organise the Virtual Data Room — financial statements, legal documents, IP registrations, material contracts, staff agreements. Month 3: prepare management for investor interviews and resolve any identified issues. This is specialised work — the advisor\'s role is to ensure the business is well-organised and represented, not to conduct the legal review. A specialist solicitor and accountant should be engaged. The Pitch Deck should be finalised as an executive summary alongside the data room.',
        recommendation: 'Refer the client to a specialist M&A solicitor and transaction accountant immediately. Use Pitch Deck to ensure the business narrative is coherent and consistent with the data room. Use Cost of Capital to confirm the valuation basis is defensible before due diligence begins.',
        templates: ['Pitch Deck', 'Cost of Capital']
      },
      {
        id: 'rc_transformation',
        branch_name: 'Organisational Transformation — Change Management',
        type: 'recommendation',
        condition: 'Established business needs a major strategic or cultural transformation',
        notes: 'Major organisational change follows a predictable failure pattern when managed badly: resistance, loss of momentum, reversion to old habits. Kotter\'s 8-Step Change Process addresses this: (1) Create urgency. (2) Build a guiding coalition. (3) Form a strategic vision. (4) Enlist a volunteer army. (5) Enable action by removing barriers. (6) Generate short-term wins. (7) Sustain acceleration. (8) Anchor changes in culture. The advisor\'s role is to help the leadership team move through each step deliberately rather than jumping straight to implementation. The Cost of Capital model may be relevant if the transformation requires external funding.',
        recommendation: 'This is primarily a strategy and governance engagement. Use the strategic orientation and governance templates from the Do the Job library. If capital is needed to fund the transformation, use Cost of Capital to model the funding requirement and structure.',
        templates: ['Cost of Capital']
      },
      {
        id: 'rc_aspiring',
        branch_name: 'Aspiring Entrepreneur — Business Model Selection',
        type: 'recommendation',
        condition: 'Client wants to start a business but is unsure which type or model to pursue',
        notes: 'The Rich vs Royal framework distinguishes between: Rich (high equity upside, high risk, VC-backed, founder equity diluted over time — the tech startup path) and Royal (owner control, lower risk, lifestyle or legacy business — the "boring and basic" or franchise path). Neither is superior — the right choice depends on the client\'s risk appetite, capital availability, and personal objectives. The Six Patterns of Entrepreneurship help map the client to their most natural entry point. Most advisors should direct clients toward the Boring and Basic or Franchisee model unless they have deep tech startup experience.',
        recommendation: 'Use Cost of Capital to model the capital requirements and equity dilution of different business models. For clients pursuing acquisition or franchise routes, refer to relevant business assessment templates.',
        templates: ['Cost of Capital']
      },
      {
        id: 'rc_acquisition',
        branch_name: 'Business Acquisition — Search Fund / ETA / Franchise',
        type: 'recommendation',
        condition: 'Client wants to become an entrepreneur by acquiring an existing business',
        notes: 'Acquisition eliminates ideation risk — the client buys a proven model rather than building from scratch. Three main paths: (1) Search Fund (ETA — Entrepreneurship Through Acquisition) — the client raises a small fund to spend 2 years searching for a business to acquire, then raises acquisition capital. High control, moderate risk. (2) Franchise — the client buys a business-in-a-box with an established brand, system, and support structure. Lowest risk, most constrained. (3) Direct acquisition — the client identifies and acquires a specific business independently. This path requires due diligence expertise. The advisor should ensure the client understands the difference between the purchase price and the total cost (including working capital, legal fees, and post-acquisition stabilisation costs).',
        recommendation: 'Use Cost of Capital to model the acquisition funding structure. The Due Diligence logic tree and templates are directly relevant once a target business is identified.',
        templates: ['Cost of Capital']
      }
    ]
  },

  // ── 3. FM Coach & Culture ────────────────────────────────────────────────
  {
    id: 'fm_coach_culture',
    name: 'FM Coaching & Firm Culture — Internal Firm Development',
    description: 'Guides firm managers and senior advisors through internal people development challenges — hiring and applicant screening, performance management, fee negotiation and scope creep, team feedback culture, COI engagement, and team workshop facilitation. Surfaces the relevant Get Organised templates for each scenario.',
    entry_triggers: [
      'firm manager',
      'firm culture',
      'visible learning culture',
      'coaching plan',
      'advisory coaching',
      'team coaching',
      'performance improvement',
      'PIP',
      'advisory PIP',
      'fee estimate',
      'job creep',
      'scope creep',
      'fee blowout',
      'applicant screening',
      'hiring process',
      'interview process',
      'team feedback',
      'field intelligence',
      'case study presentation',
      'COI prospect',
      'centre of influence',
      'guarded prospect',
      'event cause effect',
      'paper tower',
      'team building workshop',
      'group coaching',
      'coaching sessions',
      'firm development',
      'advisor development',
      'coaching outcome',
      'disruption coping',
      'structured networking',
      'COI development',
      'golden hour',
      'platinum hour',
      'coaching agenda',
      'fee negotiation'
    ],
    nodes: [
      {
        id: 'fmc_entry',
        branch_name: 'FM Coaching & Culture — Situation Assessment',
        type: 'assessment',
        condition: 'Firm manager or senior advisor has an internal team or coaching challenge',
        notes: 'Six distinct FM coaching and culture scenarios. Key distinctions: (1) Hiring — the challenge is in the applicant screening process, specifically ensuring consistency between interview environments. (2) Performance — a team member is resistant, underperforming, or failing to adopt firm processes. (3) Fee negotiations — an upcoming fee discussion or scope creep situation needs to be managed proactively. (4) Team learning — building a Visible Learning Culture through structured feedback and case study presentation. (5) COI engagement — converting a guarded centre of influence into a referral partner. (6) Team workshops — delivering experiential learning activities to a group.',
        branches: [
          {
            answer_pattern: 'hiring or applicant screening — interview process challenge',
            next_node: 'fmc_hiring'
          },
          {
            answer_pattern: 'staff performance — team member underperforming or resisting firm processes',
            next_node: 'fmc_performance'
          },
          {
            answer_pattern: 'fee estimate or scope creep — managing a fee negotiation or blowout',
            next_node: 'fmc_fees'
          },
          {
            answer_pattern: 'team feedback and learning culture — field intelligence case study or Visible Learning',
            next_node: 'fmc_team_learning'
          },
          {
            answer_pattern: 'COI engagement — converting a guarded centre of influence prospect',
            next_node: 'fmc_coi'
          },
          {
            answer_pattern: 'team workshop or team building activity — Paper Tower or group session',
            next_node: 'fmc_workshop'
          }
        ]
      },
      {
        id: 'fmc_hiring',
        branch_name: 'Hiring — Final Stage Applicant Screening',
        type: 'question',
        condition: 'Challenge is in the final stages of the hiring process',
        question: 'Is the challenge at the front end (identifying the right candidates) or at the final stage (assessing whether the shortlisted candidate is giving consistent, authentic answers across interviews)?',
        notes: 'A common failure in hiring is that candidates present well in a structured office interview but "bend their perspective" to give expected answers. The recommended screening technique for the final meeting is to shift the environment — move to a café or informal setting — and re-ask trait questions from the first interview. Consistency across environments indicates authenticity. Inconsistency indicates the candidate was performing for the interview rather than revealing their actual character. This test is most valuable for advisory and client-facing roles where relationship authenticity matters.',
        branches: [
          {
            answer_pattern: 'final stage — screening a shortlisted candidate for authenticity and consistency',
            next_node: 'fmc_hiring_final'
          },
          {
            answer_pattern: 'front end — identifying and attracting the right candidates',
            next_node: 'fmc_hiring_attract'
          }
        ]
      },
      {
        id: 'fmc_hiring_final',
        branch_name: 'Final Stage Screening — Environment Change Test',
        type: 'recommendation',
        condition: 'Candidate is at final interview stage — authenticity check needed',
        notes: 'Change the setting to a café or informal environment for the third meeting. Re-ask the same trait questions from the first interview. If the answers remain consistent, the candidate is authentic. If the answers shift, the earlier responses were likely crafted for the formal setting. FM Hire Winners covers the full structured hiring process. Hire Winners provides the broader performance and expectations framework for new advisors.',
        recommendation: 'Use FM HIre Winners for the structured interview and screening process across all three meetings. Use Hire Winners to set performance expectations and onboarding milestones once the candidate is selected.',
        templates: ['FM HIre Winners', 'Hire Winners']
      },
      {
        id: 'fmc_hiring_attract',
        branch_name: 'Attracting Candidates — Role Definition and Advertising',
        type: 'recommendation',
        condition: 'Challenge is at the front end of the hiring process — attracting the right candidates',
        notes: 'The quality of candidates attracted is determined by the clarity of the role definition and the strength of the firm\'s employer brand. FM Hire Winners includes the role definition and advertising framework. Pair with the Advisor-e Coaching Plan to show candidates the structured development pathway they will follow — this is a strong differentiation factor for attracting growth-oriented advisors.',
        recommendation: 'Use FM HIre Winners to structure the role definition, job advertisement, and candidate screening criteria. Use the Advisor-e Coaching Plan as supporting material to demonstrate the firm\'s commitment to advisor development.',
        templates: ['FM HIre Winners', 'Advisor-e Coaching Plan']
      },
      {
        id: 'fmc_performance',
        branch_name: 'Performance Management — Resistance or Underperformance',
        type: 'question',
        condition: 'Team member is underperforming or resisting firm processes',
        question: 'Is this a specific behaviour issue — for example, failing to load client financials, resisting the advisory portal, or actively vocalising resistance — or is it a broader pattern of underperformance across multiple areas?',
        notes: 'The Advisory PIP (Performance Improvement Plan) is triggered by specific, documented start/stop behaviours — not vague underperformance. It sets explicit 30/60/90-day milestones and defines what success looks like. This protects the firm\'s Visible Learning Culture by making the standard transparent and enforceable. Vague or undocumented performance concerns rarely result in lasting change. Before initiating the PIP, ensure the advisor has had clear coaching conversations and has been given the tools and support to succeed.',
        branches: [
          {
            answer_pattern: 'specific resistance to firm process — documented behaviour that is clearly defined',
            next_node: 'fmc_pip'
          },
          {
            answer_pattern: 'broader underperformance — multiple areas, less clearly defined',
            next_node: 'fmc_coaching'
          }
        ]
      },
      {
        id: 'fmc_pip',
        branch_name: 'Advisory PIP — Defined Resistance or Non-Compliance',
        type: 'recommendation',
        condition: 'Specific documented resistance to firm process — PIP criteria are met',
        notes: 'The Advisory Performance Improvement template defines: start behaviours (what the advisor must begin doing), stop behaviours (what must cease), review milestones at 30/60/90 days, and the consequence if milestones are not met. This must be delivered in writing and acknowledged by the advisor. The Advisor-e Coaching Plan provides the positive framework — what the advisor is working toward — as a counterbalance to the corrective focus of the PIP.',
        recommendation: 'Use Advisory Performance Improvement as the primary PIP document. Use Advisor-e Coaching Plan alongside it to frame the PIP within a broader development context, making it less punitive and more growth-oriented.',
        templates: ['Advisory Performance Improvement', 'Advisor-e Coaching Plan']
      },
      {
        id: 'fmc_coaching',
        branch_name: 'Broader Underperformance — Structured Coaching Response',
        type: 'recommendation',
        condition: 'Broader pattern of underperformance — coaching approach before formal PIP',
        notes: 'Before initiating formal performance management, use structured coaching to: identify root cause (skill gap vs will gap vs environmental barrier), establish baseline expectations clearly, and give the advisor a documented improvement pathway. This approach protects the firm legally and demonstrates good faith. If coaching fails to produce change within a defined period, the Advisory PIP becomes the next step.',
        recommendation: 'Use Advisor-e Coaching Plan to structure the coaching conversations and document improvement targets. Use Coaching Content and Coaching Outcome Statements to build the session content. If improvement stalls, escalate to Advisory Performance Improvement.',
        templates: ['Advisor-e Coaching Plan', 'Coaching Content', 'Coaching Outcome Statements']
      },
      {
        id: 'fmc_fees',
        branch_name: 'Fee Estimate & Scope Creep — Proactive Management',
        type: 'recommendation',
        condition: 'An upcoming fee discussion, blowout, or scope creep situation needs managing',
        notes: 'The Prime & Range-Link approach: Prime the client early — before the emotional event — by referencing the fee estimate in an earlier conversation ("This type of work typically runs between X and Y..."). When the evidence of the fee increase arrives, the client has already been primed and is less likely to react with shock or resistance. Range-Link means presenting a fee range rather than a fixed figure, anchored to the scope of work. Scope creep must be addressed at the point it occurs, not retrospectively. Raising fee concerns late in a project is far harder than setting boundaries early.',
        recommendation: 'Use Fee Estimate & Job Creep Discussions as the primary conversation and documentation template. This covers both the proactive priming conversation and the reactive scope management approach.',
        templates: ['Fee Estimate & Job Creep Discussions']
      },
      {
        id: 'fmc_team_learning',
        branch_name: 'Team Learning — Visible Learning Culture',
        type: 'recommendation',
        condition: 'Building team feedback culture through field intelligence case studies and structured learning sessions',
        notes: 'The Visible Learning Culture requires: (1) Structured case study presentations where advisors share field intelligence from client visits. (2) The Feedback Model — colleagues respond by first stating what "stands out" positively before raising concerns. Enforcing positive-first feedback prevents defensive barriers and maintains psychological safety. (3) Regular coaching sessions that reinforce the learning cycle. The Golden Hr and Platinum Hr sessions are the primary mechanisms for this. Group Coaching Sessions cover the broader cohort.',
        recommendation: 'Use Coaching Content to structure the session content and Coaching Outcome Statements to define success measures for each learning session. Use Group Coaching Sessions for cohort-level learning activities.',
        templates: ['Coaching Content', 'Coaching Outcome Statements', 'Group Coaching Sessions']
      },
      {
        id: 'fmc_coi',
        branch_name: 'COI Engagement — Converting a Guarded Prospect',
        type: 'question',
        condition: 'Centre of influence prospect is guarded, resistant, or acting defensively',
        question: 'Is this a new COI who has never engaged with advisory work before, or an existing relationship that has stalled or become guarded after an initial positive start?',
        notes: 'The Event, Cause, Effect method for guarded COI prospects: deliver a relevant client problem story strictly in the third person ("I was working with a client who...") so the COI can see themselves in the situation without feeling personally blamed or sold to. This removes defensiveness and positions the advisor as an empathetic problem solver. The story must be delivered in 3rd person — switching to 1st person ("you should...") immediately triggers the defensive "Mr. Prickly" response. COI Development pt1 covers the initial approach and relationship-building framework. COI Development pt2 covers deepening the referral relationship.',
        branches: [
          {
            answer_pattern: 'new COI — never engaged before, need an approach strategy',
            next_node: 'fmc_coi_new'
          },
          {
            answer_pattern: 'existing COI relationship — has stalled or become guarded',
            next_node: 'fmc_coi_stalled'
          }
        ]
      },
      {
        id: 'fmc_coi_new',
        branch_name: 'New COI Approach',
        type: 'recommendation',
        condition: 'New centre of influence — needs an initial engagement strategy',
        notes: 'The Structured Networking template provides a systematic approach to identifying and prioritising COI targets. Event, Cause, Effect is the primary tool for the first meaningful conversation — use a relevant client story in 3rd person to illustrate value without pitching. COI Development pt1 covers the relationship-building framework from first contact to referral agreement.',
        recommendation: 'Use Structured Networking to plan and prioritise COI outreach. Use COI Development pt1 to structure the approach and early relationship-building. Use Event, Cause, Effect as the conversation tool for the first substantive meeting.',
        templates: ['Structured Networking', 'COI Development pt1', 'Event, Cause, Effect']
      },
      {
        id: 'fmc_coi_stalled',
        branch_name: 'Stalled COI Relationship — Re-Engagement',
        type: 'recommendation',
        condition: 'Existing COI relationship has stalled or the prospect has become guarded',
        notes: 'A stalled COI relationship is usually caused by: the advisor shifting into sales mode too early, a lack of consistent value delivery, or a misaligned expectation about what the referral relationship looks like. Re-engagement using the Event, Cause, Effect story in 3rd person resets the dynamic — it re-demonstrates value without reopening the sales conversation. COI Development pt2 covers deepening an existing relationship toward a formal referral structure. Coping With Disruption may be relevant if the COI\'s business is going through a challenging period.',
        recommendation: 'Use Event, Cause, Effect to re-engage with a relevant 3rd-person story. Use COI Development pt2 to rebuild the relationship toward a referral structure. Use Coping With Disruption if the COI is navigating disruption in their own business.',
        templates: ['Event, Cause, Effect', 'COI Development pt2', 'Coping With Disruption']
      },
      {
        id: 'fmc_workshop',
        branch_name: 'Team Workshop — Experiential Learning Activity',
        type: 'recommendation',
        condition: 'Delivering a team building or group learning workshop',
        notes: 'The Paper Tower exercise proves experientially that process-driven, planned approaches produce better financial outcomes than outcome-oriented, rushed action. The debrief question after the exercise is critical: "Did you separate brainstorming from assessment?" Teams that failed the task almost always did not. The 9-step team process reinforces this. Team Bldg Problem Solving provides structured problem-solving frameworks for team activities. Group Coaching Sessions provides the broader facilitation structure for multi-session group learning programs.',
        recommendation: 'Use Paper Tower as the primary experiential learning tool. Use Team Bldg Problem Solving for the structured debrief and subsequent team problem-solving exercises. Use Group Coaching Sessions to structure the broader learning program these activities sit within.',
        templates: ['Paper Tower', 'Team Bldg Problem Solving', 'Group Coaching Sessions']
      }
    ]
  }
]

// Filter out any trees that already exist
const treesToAdd = newTrees.filter(t => !existingIds.has(t.id))
lt.trees.push(...treesToAdd)
lt.last_updated = new Date().toISOString().split('T')[0]

writeFileSync(ltPath, JSON.stringify(lt, null, 2), 'utf8')
console.log('Trees added:', treesToAdd.map(t => t.id).join(', ') || 'none (all existed)')
console.log('Total trees:', lt.trees.length)

// ── domains.json ────────────────────────────────────────────────────────────

const domPath = resolve(process.cwd(), 'data/domains.json')
const domains = JSON.parse(readFileSync(domPath, 'utf8'))
const existingDomainIds = new Set(domains.map(d => d.id))

const newDomains = [
  {
    id: 'stock-purchasing',
    label: 'stock purchasing and inventory management',
    keywords: 'stock purchasing|inventory management|stock levels|reorder point|purchase assessment|stock replenishment|days on hand|unit cost risk|stock policies|ordering quantities|bulk purchasing|stock cash flow',
    disambiguationKeywords: 'stock|inventory|purchasing|reorder|stock levels',
    questions: []
  },
  {
    id: 'raising-capital',
    label: 'raising capital and business acquisition',
    keywords: 'raising capital|raise capital|pitch deck|venture capital|equity funding|term sheet|capital raise|business acquisition|search fund|entrepreneur|franchise model|cost of capital|capital structure',
    disambiguationKeywords: 'capital|pitch|investor|equity|acquisition|funding',
    questions: []
  },
  {
    id: 'fm-coach-culture',
    label: 'firm management coaching and culture',
    keywords: 'firm manager|firm culture|visible learning|coaching plan|advisory coaching|performance improvement|PIP|fee estimate|job creep|scope creep|applicant screening|team feedback|COI prospect|paper tower|group coaching|team building',
    disambiguationKeywords: 'firm manager|coaching|visible learning|PIP|COI|paper tower',
    questions: []
  }
]

const domainsToAdd = newDomains.filter(d => !existingDomainIds.has(d.id))
domains.push(...domainsToAdd)

writeFileSync(domPath, JSON.stringify(domains, null, 2), 'utf8')
console.log('Domains added:', domainsToAdd.map(d => d.id).join(', ') || 'none (all existed)')
console.log('Total domains:', domains.length)
