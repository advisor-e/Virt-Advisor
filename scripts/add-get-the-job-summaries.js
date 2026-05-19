const fs = require('fs')
const path = require('path')

const dataFile = path.resolve(__dirname, '../data/content-summaries.json')
const existing = JSON.parse(fs.readFileSync(dataFile, 'utf8'))

const newEntries = [
  // ─── Get the Job - Sales Tracker ───────────────────────────────────────────
  {
    name: 'Sales Tracker Opt A',
    section: 'Get the Job - Sales Tracker',
    purpose: 'A spreadsheet-based sales tracking model (Option A layout) that systematically records advisory sales activities, pipeline velocity, and referral network performance in one transparent view.',
    helpsOwner: 'Gives business owners clear visibility into how their advisor is managing the sales pipeline and referral relationships, reinforcing confidence in the advisory process.',
    helpsAdvisor: 'Provides a structured system to record and analyse sales activities, conversion rates, and referral sources — helping advisors identify where fee growth is coming from and where to focus effort.',
    indicators: 'Advisors focused on fee growth who want a disciplined, trackable approach to managing their sales pipeline and referral network. Suits both new and experienced advisors.'
  },
  {
    name: 'Sales Tracker Opt B',
    section: 'Get the Job - Sales Tracker',
    purpose: 'An alternate layout of the Sales Tracker spreadsheet (Option B) offering a different view of pipeline data, activity logs, and referral source tracking for advisors building their fee base.',
    helpsOwner: 'Supports transparency in the advisory engagement process, showing clients that their advisor operates with structured accountability and discipline.',
    helpsAdvisor: 'Provides a second format option for advisors who prefer a different visual layout or tracking methodology. Measures pipeline velocity and referral network effectiveness.',
    indicators: 'Use when an advisor wants a different tracking layout or when team members have varying reporting preferences. Entry-level tool suitable for all experience levels.'
  },
  {
    name: 'Our Sales Process',
    section: 'Get the Job - Sales Tracker',
    purpose: "A documented sales process template that maps out the advisory firm's end-to-end approach to winning new business — from initial contact through to signed engagement and first meeting.",
    helpsOwner: "Sets clear expectations about how the advisor approaches winning clients: methodical, professional, and outcome-focused rather than high-pressure.",
    helpsAdvisor: 'Creates a repeatable, trainable sales process that can be shared with new team members or used to benchmark and improve conversion rates at each pipeline stage.',
    indicators: 'Advisory firms wanting to formalise, document, and standardise their sales approach across the team. Useful when onboarding new advisors or reviewing why the pipeline is stalling.'
  },

  // ─── Get the Job - Marketing ───────────────────────────────────────────────
  {
    name: 'E Mails',
    section: 'Get the Job - Marketing',
    purpose: 'A collection of client portal set-up and onboarding email templates covering initial invitations, login authentication instructions, follow-up for non-registrants, and consent emails for granting external advisor (banker) portal access.',
    helpsOwner: 'Provides clear, friendly instructions to help new clients register on the Advisor-e portal, access their service plan, and grant their banker read-only access to shared financial data if desired.',
    helpsAdvisor: 'Streamlines client onboarding with professionally worded templates that handle portal setup, login issues, spam-folder warnings, and Privacy Act-compliant banker access consent — removing friction from the digital onboarding process.',
    indicators: 'Use when onboarding a new client to the portal, when a client fails to complete their registration, or when setting up a banker or external advisor as a read-only portal user on a mutual client.'
  },
  {
    name: 'Outbound Emails',
    section: 'Get the Job - Marketing',
    purpose: 'A versatile collection of targeted outreach email and SMS templates including the 3rd Quarter Campaign (cash forecasting and business planning), the 90 Day Accounting Best Practice program outreach, and Covid-19 contingency planning communications.',
    helpsOwner: 'Prepares business owners for predictable financial pressure points — Provisional Tax, GST deadlines, holiday-period cash squeezes — and offers structured solutions proactively before a crisis hits.',
    helpsAdvisor: 'Provides pre-written, multi-channel marketing campaigns (email + SMS + phone scripts) to generate advisory meetings, sell structured programs, and demonstrate proactive value during periods of client vulnerability.',
    indicators: 'Use to proactively engage clients before Q3 tax obligations hit, when clients lack a business plan, when disruptions arise (Covid, lockdowns, supply shortages), or when an advisor wants to run a 90-day accounting best practice program for a Xero/MYOB client with untrained staff.'
  },
  {
    name: 'Gift Approach Letters',
    section: 'Get the Job - Marketing',
    purpose: "Pre-written approach letters designed to open conversations with prospects or re-engage dormant clients by framing the advisor's services as a gift or value-add rather than a sales pitch.",
    helpsOwner: 'Receives a low-pressure, professionally written communication that highlights specific business benefits without feeling like an unsolicited sales call.',
    helpsAdvisor: 'Provides a warm, relationship-first entry point for prospect outreach or client re-engagement, reducing the awkwardness of cold approaches and increasing the likelihood of a follow-up meeting.',
    indicators: 'Advisors wanting to approach new prospects or lapsed clients with a professional, low-pressure letter. Particularly useful when building a marketing outreach campaign or following up after networking events.'
  },
  {
    name: 'Messaging Plan',
    section: 'Get the Job - Marketing',
    purpose: "A strategic marketing framework that uses the C.P.D hierarchy (Concept, Principle, Detail) to align an advisor's social media, articles, seminars, and client communications into a cohesive, problem-focused marketing engine with a broad sequenced timeline.",
    helpsOwner: 'Ensures marketing and client communications are directly tailored to solve specific business problems (e.g., cashflow, teamwork) rather than being generic broadcast content.',
    helpsAdvisor: 'Provides a step-by-step system to build Concept Domains from the Fee Growth Plan, map client problems to specific service offers, create content across videos, articles, speeches, and blogs, and schedule campaigns with a broad timeline to prevent workflow collisions.',
    indicators: 'Advisory teams or marketing coordinators wanting to move beyond ad-hoc marketing to a structured, problem-anchored strategy. Use when setting up a new service line, launching a seminar series, or systematically building brand authority.'
  },
  {
    name: 'Online Quiz Summary',
    section: 'Get the Job - Marketing',
    purpose: "A set of three interactive lead qualification quizzes (Growth Fundamentals, What's Applicable, HR Maths) hosted on Google Forms, acting as a low-friction micro-step between initial prospect contact and a formal first meeting.",
    helpsOwner: "Provides a quick, non-pressured way for prospects to reflect on their business fundamentals, technology readiness, or HR practices in under a few minutes on their smartphone.",
    helpsAdvisor: 'Acts as a lead generation and qualification tool. Quiz results prime the upcoming meeting theme, allow the advisor to tailor their pitch toward the Lite Fundamentals package, and provide data on the prospect\'s receptivity to specific services.',
    indicators: 'Use with new prospects before a first meeting to warm them up and gather diagnostic data. Also effective for re-engaging existing clients who need a structured way to prioritise their 90-day business focus.'
  },
  {
    name: 'Video Hyperlinks',
    section: 'Get the Job - Marketing',
    purpose: 'A curated library of 8 short educational video links covering key advisory concepts including the Growth Curve, pricing vs. leakage, portal invitations, and succession planning — designed to support cold calling follow-up and ongoing client education.',
    helpsOwner: 'Allows clients and prospects to consume concise visual explanations of important business and advisory concepts on their own schedule, before or after a meeting.',
    helpsAdvisor: "Standardises client communications, supports cold calling follow-up with professional reference material, and gives advisors a ready answer to common client questions by linking directly to a specific video rather than scheduling a meeting.",
    indicators: 'Use after a cold call to send a prospect a relevant explainer video. Load key links into your email signature for passive daily distribution. Recommend specific videos when clients ask about Growth Curve stages, pricing, portal value, or succession planning.'
  },
  {
    name: 'Website Blurbs',
    section: 'Get the Job - Marketing',
    purpose: 'A complete website copywriting toolkit providing pre-written band-structured homepage content, service descriptions, calls to action, and social proof frameworks to help accounting and advisory firms redesign their website around clear value positioning.',
    helpsOwner: 'Clearly articulates what the firm solves, presents service options progressively from basic accounting to legacy-level advisory, and builds trust within the first 30 seconds of browsing.',
    helpsAdvisor: "Eliminates the blank-page problem when briefing a web developer. Provides three distinct copywriting styles (Calling Out the Ghosts, Metaphor, Range Finder) and an ascension model to position the firm as problem-solvers rather than compliance providers.",
    indicators: "Use when an advisory firm is updating or redesigning their website, repositioning their service offering, or when the current site fails to articulate advisory value beyond tax compliance."
  },
  {
    name: 'Cartoons',
    section: 'Get the Job - Marketing',
    purpose: 'A slide deck of professionally designed cartoon visual aids illustrating complex business and financial concepts — including working capital cycles, the Profit Sweet-Spot, the Growth Curve, and cashflow dynamics — using simple, memorable metaphors.',
    helpsOwner: 'Breaks down abstract financial and operational concepts into visual metaphors that are easy to understand, increasing engagement and retention when discussing growth, margins, and business lifecycles.',
    helpsAdvisor: 'Provides ready-to-use presentation assets that simplify client education, spark conversation, and help advisors gauge client understanding without requiring advanced financial literacy from the client.',
    indicators: 'Use in client presentations, portal documents, and advisory meetings when explaining working capital, Growth Curve stages, or the profit sweet-spot — particularly when a client struggles to grasp abstract financial concepts.'
  },
  {
    name: 'Video Techniques',
    section: 'Get the Job - Marketing',
    purpose: 'A guide to using short video as a client communication and sales tool — covering how to record, package, and send advisory videos to prospects and clients as part of the sales and ongoing engagement process.',
    helpsOwner: 'Allows them to consume short, professional video explanations of advisory concepts and service offerings in their own time before or after a meeting.',
    helpsAdvisor: 'Enables the advisor to scale their communication, replace some face-to-face follow-ups with personalised video messages, and use recorded content as part of a systematic marketing and sales funnel.',
    indicators: 'Use when following up with prospects after a meeting, when explaining a concept that benefits from visual demonstration, or when building a short video content library for target market outreach.'
  },

  // ─── Get the Job - Seminar Delivery ───────────────────────────────────────
  {
    name: 'Design & Deliver',
    section: 'Get the Job - Seminar Delivery',
    purpose: 'A comprehensive end-to-end seminar toolkit covering content design frameworks (CPD hierarchy, 30-40 min template, Blank Platform scripting), audience psychology, team-building exercises (Paper Tower, Spaghetti Tower), storytelling techniques (Magic Formula Stories), seminar entertainment protocols, workshop run sheets, and post-event feedback tools.',
    helpsOwner: 'Delivers professionally structured educational events that help business owners understand complex growth and financial concepts in a memorable, engaging format with clear takeaways and practical team-building experiences.',
    helpsAdvisor: "Provides a complete seminar-building system from content design through to delivery psychology, room management, AV logistics, and post-event feedback measurement. Includes scripts for using humor, stories, and exercises to build deep audience connection and generate discovery session leads.",
    indicators: "Senior or experienced advisors planning and delivering educational seminars, workshops, or networking events. Use when designing new presentation content, running Growth Stage Seminars, facilitating team-building sessions, or developing the advisor's public speaking capability and personal brand."
  },

  // ─── Get the Job - Positioning ────────────────────────────────────────────
  {
    name: 'The Nature of Engagement',
    section: 'Get the Job - Positioning',
    purpose: 'A framework for categorising client work into three distinct engagement types — Advice, Facilitation, and Education — enabling advisors to define their role, delivery method, and fee positioning for each type of interaction.',
    helpsOwner: 'Sets clear expectations about what kind of engagement they are receiving: accepting advice with clear consequences, working through a trigger event via facilitation, or closing a knowledge gap through sequential education.',
    helpsAdvisor: "Defines the correct advisor positioning for each engagement and introduces the 'Look Both Ways' principle — examining pre-event causes and post-event effects to naturally extend the engagement scope without it feeling like an upsell.",
    indicators: "Use when clarifying the nature of an upcoming client engagement — particularly when clients request a loan drawdown, face a major trigger event, or when the advisor wants to reframe compliance work as a billable advisory opportunity."
  },
  {
    name: 'The 5 Steps in the Advisory Staircase',
    section: 'Get the Job - Positioning',
    purpose: 'A visual framework mapping the progressive stages of the advisor-client relationship, from initial observation and tax compliance through to advanced strategic facilitation, performance oversight, and leadership advisory.',
    helpsOwner: 'Helps the client understand the value progression available in the advisory relationship and what richer engagement at each step means for their business outcomes.',
    helpsAdvisor: "Provides a structured way to explain the natural progression from compliance to high-value advisory, helping advisors articulate and sell deeper services without it feeling like an upsell conversation.",
    indicators: "Use in positioning conversations with clients who currently only see the advisor as a compliance provider. Effective in initial advisory pitches, service re-framing discussions, and when the client asks what else the advisor can do for them."
  },
  {
    name: 'The Heald Matrix',
    section: 'Get the Job - Positioning',
    purpose: "A positioning matrix used to map the advisor's service capabilities against client needs and business complexity, identifying the correct level of engagement and where additional value can be added.",
    helpsOwner: 'Provides a structured way to understand which advisory services are most relevant to their current situation, growth stage, and business complexity.',
    helpsAdvisor: 'Helps advisors think strategically about which clients need which services, preventing under-servicing or mismatched proposals. Useful for internal practice management and client portfolio reviews.',
    indicators: 'Use during internal advisory planning sessions, client portfolio reviews, or when deciding how to position a proposal to a client with complex, multi-dimensional needs spanning multiple service areas.'
  },
  {
    name: 'The Helicopter Story',
    section: 'Get the Job - Positioning',
    purpose: "A scripted visual analogy that positions the advisor as the essential Air Control Tower, using the metaphor of a helicopter pilot flying blindfolded to demonstrate why annual accounting meetings are dangerously inadequate and why regular strategic meetings are critical.",
    helpsOwner: "Helps the business owner visualise how running their business without timely internal dashboards is like a blindfolded pilot navigating storms — making the need for regular strategic check-ins feel obvious and self-generated rather than sold.",
    helpsAdvisor: "Perfectly positions the advisor as indispensable. By illustrating the risks of high-impact events (fraud, volatility, unexpected debt), the story naturally creates the client's demand for more frequent meetings without the advisor having to make a direct sales pitch.",
    indicators: 'Use with clients who view accounting as an annual compliance exercise, resist regular meetings, or do not see the value of frequent strategic check-ins. Highly effective in initial positioning conversations and first advisory meetings.'
  },
  {
    name: 'Capacity, Capability, Opportunity',
    section: 'Get the Job - Positioning',
    purpose: "A three-lens diagnostic framework (CCO) that evaluates a business's readiness to grow by separately assessing its physical capacity for more volume, its team and financial capability to support growth, and the strength of market opportunity.",
    helpsOwner: 'Clearly separates the legitimate physical constraints of the business (capacity) from skill and financial limitations (capability), and ensures market realities (opportunity) are properly assessed before investing in growth.',
    helpsAdvisor: "Can be used externally as a formal agenda structure for a client discussion, or internally as a diagnostic to identify where value can be added. Acts as a natural entry point to introduce relevant service offerings without solving all the client's problems on the spot.",
    indicators: 'Use with clients who want to scale, increase transaction volume, or expand into new markets — particularly when growth attempts have stalled or when the owner is unclear about what constraint is actually holding them back.'
  },
  {
    name: 'Time, Control, Money',
    section: 'Get the Job - Positioning',
    purpose: "A positioning framework that anchors the advisor's value proposition to the three core outcomes business owners are seeking: more time, more control over their business, and more money — connecting advisory services directly to personal owner motivations.",
    helpsOwner: 'Articulates business goals in emotionally resonant terms: having time to enjoy life, genuine control over how the business operates day-to-day, and financial reward that justifies the personal investment of effort.',
    helpsAdvisor: "Provides a compelling language framework for positioning advisory services beyond technical deliverables. By anchoring the conversation to these three universal desires, the advisor makes their value proposition immediately relevant and personally motivating.",
    indicators: "Use in early client conversations, positioning discussions, and initial advisory pitches to connect the advisor's service offering to the owner's personal motivations rather than just business metrics or compliance outcomes."
  },
  {
    name: 'Mastering Positioning',
    section: 'Get the Job - Positioning',
    purpose: "A deep-dive framework on how advisors transition from being a transactional vendor of hours to a trusted authority — achieved through total congruence between technical advice, body language, tone of voice, and fundamental values.",
    helpsOwner: "Creates a safe, trusted advisory environment where the owner's biological survival instincts are not triggered. They can engage openly and collaboratively, knowing the advisor is authentic and fully on their side.",
    helpsAdvisor: "Shifts focus from selling a specific service to selling yourself. By achieving total congruence between advice, delivery style, and values, the advisor removes client resistance and makes influence natural rather than forced.",
    indicators: 'Use as a core framework for all prospect and client interactions — particularly when establishing a new relationship, recovering from a trust deficit, or when technically sound advice is not translating into client engagement or fee acceptance.'
  },

  // ─── Get the Job - Learning to Sell ───────────────────────────────────────
  {
    name: 'Sales Psychology (Basics)',
    section: 'Get the Job - Learning to Sell',
    purpose: "An introduction to advisory sales psychology covering the principles of the first prospect meeting, including rapport-building, permission-based conversation flow, the Event-Cause-Effect storytelling model, and how to structure the discovery phase without pressure.",
    helpsOwner: "Reduces first-meeting anxiety by making the advisory process transparent and structured. The owner understands what will happen next, which removes the tension of feeling like they are being sold to.",
    helpsAdvisor: "Provides scripted progressions for the crucial first meeting — from building rapport through to setting clear expectations — using Check Time and Ask Permission scripts that maintain advisor control without high-pressure tactics.",
    indicators: 'New advisors learning to structure prospect meetings, or experienced advisors refreshing their first-meeting approach. Use as preparation for initial discovery sessions and early-stage prospect meetings where trust foundations need to be established.'
  },
  {
    name: 'Phone Scripts',
    section: 'Get the Job - Learning to Sell',
    purpose: 'Ready-to-use phone scripts for cold calling, campaign follow-up calls, and structured call frameworks to secure meetings with prospects and re-engage lapsed clients after email or SMS outreach.',
    helpsOwner: 'Receives a professional, non-pressured call that clearly communicates advisory value and gives a clear next step without obligation.',
    helpsAdvisor: 'Removes the hesitation and inconsistency of unscripted calls by providing structured, tested scripts for different scenarios — cold outreach, post-email follow-up, and meeting request calls.',
    indicators: 'Use when following up after a marketing email or SMS campaign, making cold calls to prospects, or re-engaging clients who have not responded to written outreach. Also useful for training new staff on client-facing telephone skills.'
  },
  {
    name: 'Total Needs Sales Scripts',
    section: 'Get the Job - Learning to Sell',
    purpose: "A comprehensive bespoke sales scripting system for complex, high-value advisory engagements using the Total Needs Selling approach — an exploratory, fact-finding process that separates the discovery phase from the solution phase entirely.",
    helpsOwner: "Ensures the advisor takes time to understand the client's unique situation through structured questioning rather than rushing to a pre-packaged solution, building genuine trust and a tailored outcome.",
    helpsAdvisor: "Provides scripted scoping session prompts, privacy statements, rough budget estimate frameworks, and presentation scripts with Call Out the Ghosts objection neutralisation and trial-closing techniques. Also includes implementation rationale scripts for final negotiation stages.",
    indicators: 'Use with complex, high-value prospects where a modular campaign approach would miss important nuance. Required when the client has multi-dimensional problems, a larger expected fee, or when the advisor needs a formal scoping session before presenting a bespoke proposal.'
  },
  {
    name: 'Your Sales Process Decision Tree',
    section: 'Get the Job - Learning to Sell',
    purpose: "A visual flowchart guiding advisors through selecting the optimal sales approach for each prospect — either a pre-packaged Campaign (Modular Delivery) or a bespoke Total Needs process — based on business complexity, advisor confidence, and prospect receptiveness.",
    helpsOwner: 'Ensures they receive an advisory approach calibrated to their specific situation — not over-complicated for a simpler business, and not under-serviced for a complex one.',
    helpsAdvisor: 'Removes guesswork from sales planning. Directs new advisors toward a Free Client Content entry point, routes simpler prospects to the Lite Fundamentals track, and guides complex prospects toward full scoping. Accounts for the four client processing styles (Activist, Pragmatist, Reflector, Theorist).',
    indicators: 'Use at the beginning of any new prospect engagement to categorise the lead and select the correct sales path. Essential for team-based practices where consistency of approach across multiple advisors matters.'
  },
  {
    name: 'Call Reluctance Psychology',
    section: 'Get the Job - Learning to Sell',
    purpose: 'A psychological framework for understanding and overcoming the internal barriers that prevent advisors from making calls, approaching prospects, or asking for business — addressing mindset patterns and behavioural strategies to build consistent sales activity.',
    helpsOwner: 'Ensures clients are proactively contacted by an advisor who has overcome hesitation and can engage confidently rather than only responding to inbound enquiries.',
    helpsAdvisor: 'Provides tools to identify the specific type of call reluctance present (fear of rejection, over-preparation, intrusion sensitivity) and targeted strategies to build the confidence and consistency needed for regular prospect outreach.',
    indicators: 'Use with advisors who know the sales process but struggle to take consistent action — those who avoid phone calls, over-prepare before approaching prospects, or have a pattern of almost contacting leads but not following through.'
  },
  {
    name: 'Winning Management Reporting',
    section: 'Get the Job - Learning to Sell',
    purpose: "A framework for presenting management reporting as a high-value advisory service — demonstrating how regular, structured financial reporting creates the conditions for winning new advisory business and deepening existing client relationships.",
    helpsOwner: 'Shows the business owner how structured management reporting gives real-time visibility into performance against plan, enabling faster and better decisions rather than waiting for end-of-year tax figures.',
    helpsAdvisor: 'Positions the advisor as a proactive, data-driven partner. By framing management reporting as the foundation of the advisory relationship, the advisor creates recurring engagement points and demonstrates continuous value — supporting fee retention and service expansion.',
    indicators: 'Use when introducing a new client to advisory services, when selling the value of regular meetings, or when an existing compliance-only client needs to understand the value of ongoing strategic oversight throughout the year.'
  },
  {
    name: 'Campaign Intro Options',
    section: 'Get the Job - Learning to Sell',
    purpose: "A set of modular, pre-packaged campaign introduction scripts built around the S.P.I.D.E.R acronym (Show, Pin, Investigate, Determine/Dangle, Ensure, Reveal) for delivering the Lite Fundamentals sales process to smaller, less complex prospects in 1-2 meetings.",
    helpsOwner: 'Provides visual context for their business struggles (placing them on the Growth Curve) and clearly outlines the financial potential of fixing their specific constraints through the Revenue Model, without a lengthy scoping process.',
    helpsAdvisor: 'Simplifies the sales process for campaign-style engagements into manageable, scripted steps. The SPIDER sequence introduces predefined conditions the prospect must agree to (time commitment, action orientation, monthly fee) before the final program is revealed.',
    indicators: 'Use with prospects who are smaller or simpler businesses suited to a modular program rather than a bespoke engagement. Particularly effective when presenting the Lite Fundamentals package and a structured, replicable sales process is needed.'
  },
  {
    name: 'Centre of Influence Scripts',
    section: 'Get the Job - Learning to Sell',
    purpose: 'Scripted frameworks for building referral relationships with bankers, lawyers, and other external professionals (Centres of Influence) — including outreach scripts, portal onboarding emails, referral request language, and shared client advisory protocols.',
    helpsOwner: 'Ensures their advisory team and external financial partners are collaborating effectively, giving them access to the best combined advice without needing to separately manage multiple professional relationships.',
    helpsAdvisor: "Provides a systematic approach to building a COI referral network. Includes scripts for inviting bankers into the portal ecosystem, Privacy Act-compliant consent processes, and language for positioning shared client relationships as mutually beneficial opportunities.",
    indicators: "Use when building a COI referral network, onboarding a banker as an external advisor on the portal, or when a client's banker could benefit from visibility into the client's financial position. Also use when seeking referrals from non-competing professionals such as lawyers or insurance advisors."
  },
  {
    name: 'Common Problem Stories',
    section: 'Get the Job - Learning to Sell',
    purpose: 'A library of scripted Magic Formula Stories (MFS) built around common client business problems — designed to build empathy, lower prospect resistance, and naturally lead conversations toward the advisor\'s service solutions without overt selling.',
    helpsOwner: 'Hears relatable stories about other business owners who faced similar challenges, which builds trust and normalises their situation — making them more open to exploring solutions rather than defending their current position.',
    helpsAdvisor: "Provides tested story frameworks that illustrate technical knowledge and empathy without appearing boastful. Each story follows the Draw-Plot-Reveal-Close structure to guide the client's thinking toward a specific advisory service naturally and without pressure.",
    indicators: "Use at the start of a prospect meeting to build rapport and identify shared pain points. Also effective when a client is resistant to change or struggling to articulate their problem — a relevant common problem story can unlock the conversation."
  }
]

const updated = [...existing, ...newEntries]
fs.writeFileSync(dataFile, JSON.stringify(updated, null, 2))
console.log('Previous count:', existing.length)
console.log('New entries added:', newEntries.length)
console.log('Total:', updated.length)
