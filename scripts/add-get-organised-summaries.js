const fs = require('fs')
const path = require('path')

const dataFile = path.resolve(__dirname, '../data/content-summaries.json')
const existing = JSON.parse(fs.readFileSync(dataFile, 'utf8'))

const newEntries = [

  // ─── Get Organised - Firm Manager ─────────────────────────────────────────

  {
    name: 'CA Capacity Planner',
    section: 'Get Organised - Firm Manager',
    purpose: 'A scenario-modelling spreadsheet (not an analytical report) that helps accounting and advisory firms optimise team structure, price jobs, and model an advisory transition. Contains three linked sheets: Base Capacity & Job Estimation, Scenario Versioning & Management, and Client Trimming & Advisory Transition.',
    helpsOwner: 'Gives instant visibility into whether the firm has enough staff to complete the work. Reveals when highly-paid senior staff are forced to do junior work due to team skill deficiencies, and mathematically proves that dropping the bottom tier of clients can free up hours and increase profitability.',
    helpsAdvisor: 'Allows advisors to model different fee ranges, client service categories (Growth, Protect, Transition), and advisory transition scenarios using native version history — no duplicate files required. Frames the advisory pivot around Capacity (freed hours), Capability (ready templates), and Opportunity (willing clients).',
    indicators: 'Firm or practice owners feeling trapped in a high-volume compliance cycle, experiencing margin erosion because senior staff are doing junior work, or wanting to model the financial impact of an advisory transition before committing to the change.'
  },
  {
    name: 'Our Strategic Plan',
    section: 'Get Organised - Firm Manager',
    purpose: "A comprehensive strategic planning framework that guides an accounting or advisory firm through five sequential phases — Planning, Packaging, Coaching, Sales, and Delivery — to transition from disorganised compliance work to a structured, profitable advisory practice.",
    helpsOwner: 'Provides a clear roadmap from operational chaos to institutionalised advisory practice. Ensures clients are categorised into Growth, Maintain, and Service tiers so each receives the right level of time and resources.',
    helpsAdvisor: 'Walks the firm through client categorisation, service packaging aligned to the Growth Curve, team coaching structures, EOY and Revenue Model discovery processes, and delivery tracking using Dashboard reports and Global Actions reporting.',
    indicators: 'Firm partners or practice owners who want to formalise their advisory service model, who are unsure how to sequence the transition from compliance-led to advisory-led practice, or who need a framework to align the whole team around a common growth plan.'
  },
  {
    name: 'Lite Advisor-e Plan',
    section: 'Get Organised - Firm Manager',
    purpose: "An entry-level, streamlined version of the full CA Firm Strategy framework — providing a simplified 5-phase planning template for firms at the start of their advisory transition or those with smaller teams who need a lighter implementation pathway.",
    helpsOwner: "Gets the advisory practice organised and moving without the complexity of the full strategic planning process. Ensures the firm's advisory infrastructure is in place before client-facing work begins.",
    helpsAdvisor: 'Provides a quick-start strategic template that can be completed in less time than the full strategic plan, covering capacity assessment, service packaging, team coaching basics, and a simplified delivery cadence.',
    indicators: 'Smaller firms or recently onboarded advisory practices starting their Advisor-e journey who need a manageable first step into structured advisory planning before taking on the full strategic plan.'
  },
  {
    name: 'Strategic Summary Tables',
    section: 'Get Organised - Firm Manager',
    purpose: 'Contrast model tables (FM Expectations and FM Stages) that map out the interrelatedness of the firm owners\' aspirations and the sequential business development objectives required to achieve them — often described as the best "bang for buck" planning tools in the system.',
    helpsOwner: 'Provides a clear visual of where the firm currently sits against where the owners want it to be, and the specific sequential steps required to close the gap. Makes strategic planning tangible rather than abstract.',
    helpsAdvisor: "Gives partners and directors a shared reference point for strategic conversations. Used as an agenda item in board meetings or quarterly planning sessions to keep the firm's end game visible and to check progress against milestones.",
    indicators: "Partners, directors, and firm managers who want to define their firm's End Game in a structured way and track the sequential development objectives required to reach it. Particularly useful during annual planning sessions or when partners are misaligned on direction."
  },
  {
    name: 'Our Own Growth Stage',
    section: 'Get Organised - Firm Manager',
    purpose: "A Growth Curve Checklist that aligns the firm's own strategic service offerings directly with the age and developmental stage of each client's business — helping advisors identify which services to push to which clients based on where they sit on the Growth Curve.",
    helpsOwner: 'Ensures the advice being received is contextually relevant to their current business stage (Design, Launch, Growth, Leverage, Maturity) rather than generic guidance that may not apply.',
    helpsAdvisor: 'Acts as a roadmap for cross-selling and up-selling relevant advisory services. Empowers the advisor to proactively push appropriate service solutions (e.g., succession planning for a Maturity-stage client, process improvement for a Leverage-stage client) into the client service plan.',
    indicators: 'All client-facing advisors who want a systematic way to match their service offerings to client life-cycle stage — particularly useful during annual service plan reviews or when identifying new advisory opportunities within an existing client base.'
  },
  {
    name: 'Plan For Success',
    section: 'Get Organised - Firm Manager',
    purpose: 'A team development planning template that defines the functional skills team members need to improve, schedules coaching content around peak workflow commitments using a work-sprint structure, and ensures training is directly tied to client outcomes.',
    helpsOwner: 'Ensures the professionals advising them are undergoing continuous, structured improvement — not ad-hoc learning that may not be relevant to the client\'s current situation.',
    helpsAdvisor: 'By scheduling learning in work sprints around busy compliance periods, it structures professional development so it is sustainable rather than deferred. Gives firm managers a clear view of who needs to learn what and by when.',
    indicators: 'Firm Managers, Internal Coaches, and all team members who need a structured professional development plan. Particularly relevant when onboarding new advisors, addressing skill gaps identified during client reviews, or building out a Visible Learning Culture.'
  },
  {
    name: 'Pricing Tactics',
    section: 'Get Organised - Firm Manager',
    purpose: 'A pricing framework and advisory fee structure tool that helps the firm define optimal charge-out rates, structure advisory service tiers, and ensure profitable delivery of advisory services alongside compliance work.',
    helpsOwner: 'Provides full transparency on what is being charged and why — matching the investment to the specific value and time committed at each level of advisory engagement.',
    helpsAdvisor: 'Enables the firm to structure pricing across preparation, travel, and delivery components for different team members. Prevents under-charging for advisory time and ensures the transition from compliance to advisory is financially viable from day one.',
    indicators: 'Firm partners reviewing their advisory pricing model, firms transitioning from time-based billing to value-based advisory packages, or advisors who are unsure how to price a new advisory service offering without undermining their compliance revenue.'
  },
  {
    name: 'Partner Accountability',
    section: 'Get Organised - Firm Manager',
    purpose: 'A robust governance framework combining a Conduct & Effect matrix, Code of Conduct, Demerit Points Table, Bonus Points System, and Yellow Card warning mechanism to manage partner performance, behaviour, and profit share entitlement objectively.',
    helpsOwner: 'Protects the firm\'s profitability and integrity. Links behavioural and performance failures directly to financial consequences (e.g., accumulating 20 demerit points in 12 months results in immediate resignation and forfeiture of client base) while incentivising growth through bonuses for fee generation.',
    helpsAdvisor: 'Equips managing partners with a structured, objective mechanism to manage underperformance or toxic boardroom behaviour (e.g., "The Assassin", "The Bully & The Donkey" tactics) without relying on subjective feelings. Evaluates partners as Finders, Minders, or Grinders.',
    indicators: 'Existing boards of directors, established partnerships, or executive teams needing formal governance structures, conflict resolution tools, or performance management frameworks. Use when partner behaviour is creating cultural or financial risk for the firm.'
  },
  {
    name: 'Directorship Pathway',
    section: 'Get Organised - Firm Manager',
    purpose: 'A transparent, objective 5-year roadmap for transitioning an individual into a partnership role — removing ambiguity by establishing strict benchmarks for experience, character, and core competencies across two structured templates (Pathway 1 guidelines and Pathway 2 Competency Assessment Framework).',
    helpsOwner: 'Provides predictable succession planning. Ensures incoming partners are culturally aligned, have a proven fee management track record ($250k+), generate organic growth ($125k+), maintain pristine personal finances, hold a family trust, and are insurable.',
    helpsAdvisor: 'Serves as a comprehensive evaluation rubric. The Competency Assessment Framework allows assessment partners to rank candidates from 1 (needs serious attention) to 5 (competent to coach others) across financial management, workflow scheduling, delegation, and client engagement competencies.',
    indicators: 'Professional service firms, accounting practices, or mid-sized businesses looking to cultivate internal talent for equity partnerships or directorship roles. Use when identifying a Partner in Pathway (PIP) or conducting a formal 360-degree partnership review.'
  },
  {
    name: 'FM Board Annual Plan',
    section: 'Get Organised - Firm Manager',
    purpose: 'A 12-month board calendar that maps out specific strategic focuses month by month (e.g., Strategic Scenario Planning in February, CEO Performance Review in May, Internal Business Culture Review in July) — ensuring the board addresses high-level strategic topics systematically rather than reactively.',
    helpsOwner: 'Prevents the board from being consumed by day-to-day operational issues by guaranteeing that crucial governance topics are scheduled and addressed throughout the year.',
    helpsAdvisor: 'Allows the advisor to prepare focused, thematic advisory sessions well in advance and ensures the firm\'s governance rhythm is institutionalised rather than ad-hoc.',
    indicators: 'Maturing firms that need to transition from reactive planning to an institutionalised annual governance rhythm. Use when the board consistently gets bogged down in operational detail rather than strategic direction, or when key annual governance tasks are being missed.'
  },
  {
    name: 'FM Board Pack Tables',
    section: 'Get Organised - Firm Manager',
    purpose: 'A pre-meeting compliance table that requires all directors to formally confirm they have "Read and Understood" the Boardpack Agenda, CEO Report, financials, and major correspondence before the meeting begins — ensuring all directors share the same factual baseline.',
    helpsOwner: 'Prevents time-wasting in the boardroom caused by directors who have not reviewed materials. Ensures every meeting starts from an informed position and that no director can claim ignorance of documented decisions.',
    helpsAdvisor: 'Gives the advisor a standardised preparation and accountability tool that ensures the board operates with governance discipline rather than casual discussion.',
    indicators: 'Any firm implementing monthly or quarterly board meetings where preparation quality and pre-reading compliance are currently inconsistent. Use whenever the same topics keep being re-explained in meetings because directors have not reviewed materials beforehand.'
  },
  {
    name: 'FM Agenda & Minutes',
    section: 'Get Organised - Firm Manager',
    purpose: 'A structured board meeting agenda and minutes template system (Master Agenda, BoardPack Agenda, Meeting Minutes) that transitions casual business conversations into formally governed, accountable board meetings with rigid time allocations, conflict of interest declarations, and mandatory takeaways.',
    helpsOwner: 'Ensures meetings stay on track, legally records all decisions and actions, and holds directors accountable to time and previously assigned items.',
    helpsAdvisor: 'Provides a standardised environment to deliver professional guidance, track progress formally, and record advisory input in a way that creates an auditable governance trail.',
    indicators: 'Any firm size implementing monthly or quarterly board or advisory board meetings. Critical when meetings regularly overrun, lack clear action items, or fail to formally record decisions that affect partner liability or firm direction.'
  },
  {
    name: 'FM General Notes',
    section: 'Get Organised - Firm Manager',
    purpose: 'A flexible meeting notes template for capturing general business discussions, informal decisions, and action items outside of the formal board meeting structure — providing continuity between meetings and a written record of conversations that inform future board decisions.',
    helpsOwner: 'Ensures important ideas, concerns, and commitments raised in informal settings are captured and carried into the formal governance process rather than being lost between meetings.',
    helpsAdvisor: 'Provides a lightweight documentation tool for use in management check-ins, partner catch-ups, and working group sessions — maintaining a continuous paper trail without the formality of full board minutes.',
    indicators: 'Firm managers and partners who want to maintain governance rigour in day-to-day management conversations and ensure nothing falls through the cracks between formal board meetings.'
  },
  {
    name: 'FM Board White Paper',
    section: 'Get Organised - Firm Manager',
    purpose: 'A formal strategic proposal template that standardises how new ideas or major expenditures are pitched to the board — requiring an Executive Summary, Historical Context, Suggested Solution, Measurable Benefits, and analysis of alternative solutions before any capital or resource commitment is approved.',
    helpsOwner: 'Removes emotional gut-feel pitches from the boardroom. Forces thorough research, feasibility analysis, and a clear business case before the firm commits capital or changes direction.',
    helpsAdvisor: 'Provides a clear framework for drafting or reviewing strategic expansion plans (opening a new branch, adopting new software, entering a new market) with the objectivity required by the board.',
    indicators: 'Firms evaluating major expenditures, mergers, new market entries, significant technology changes, or any initiative where directors are prone to rushing decisions based on excitement rather than rigorous analysis. Use whenever a proposal involves material capital, resource, or operational risk.'
  },
  {
    name: 'FM Quality Decisions',
    section: 'Get Organised - Firm Manager',
    purpose: 'A decision-making framework that educates the board on Psyche Errors (Optimism Bias, Confirmation Bias, Complacency) and provides a Decision Workpaper to formally capture the problem, alternative solutions, logic, counter-arguments, and early failure indicators for major decisions.',
    helpsOwner: 'Protects the board from its own cognitive biases and ensures the firm distinguishes between true causation and mere correlation when analysing results (e.g., "Did the marketing cause the sales spike, or was it something else?").',
    helpsAdvisor: 'Empowers the advisor to challenge owner assumptions safely using established frameworks (the 5 Whys, W. Edward Deming\'s Theory of Volatility, Double-Blind testing). Builds a documented habit of quality decision-making.',
    indicators: 'High-growth firms, firms in transition or succession, or boards prone to emotional or highly biased decision-making. Use whenever a major decision is being rushed, when the board keeps revisiting the same problem, or when previous decisions have had unintended consequences.'
  },
  {
    name: 'FM Resolutions',
    section: 'Get Organised - Firm Manager',
    purpose: 'Formal legal resolution templates that authorise major financial or operational commitments — such as paying dividends, raising capital, purchasing significant assets, or launching a new company — creating a legally binding, auditable trail of unanimous or majority director votes.',
    helpsOwner: 'Creates a legally compliant, auditable record of major decisions that protects the corporate veil and ensures all significant moves are formally authorised rather than verbally agreed.',
    helpsAdvisor: 'Ensures the firm\'s major strategic and financial moves are executed with strict legal and compliance rigour, reducing the risk of future disputes about what was agreed and by whom.',
    indicators: 'Incorporated firms executing binding financial commitments or structural changes. Use whenever a major financial decision is made in a board meeting — capital raising, dividend payments, significant asset purchases, or structural changes — to formalise it immediately.'
  },
  {
    name: 'Formal Risk Management',
    section: 'Get Organised - Firm Manager',
    purpose: 'A living Risk Management Cover document that categorises business risks by Probability (likelihood) and Consequence (loss severity), and applies one of four strategies: Accept, Avoid, Reduce, or Transfer — providing the firm with a structured approach to ongoing risk oversight.',
    helpsOwner: 'Protects the firm against operational, legal, reputational, and financial risks by ensuring they are identified, classified, and actively managed rather than discovered reactively.',
    helpsAdvisor: 'Provides a structured, objective risk evaluation tool that can be updated continuously as the firm\'s situation changes. Anchors risk discussions in evidence and probability rather than emotional response.',
    indicators: 'Any firm wanting to formalise risk management practices, firms in growth or transition where new risks are emerging rapidly, or boards that currently have no structured approach to identifying and responding to business risk.'
  },
  {
    name: 'FM HIre Winners',
    section: 'Get Organised - Firm Manager',
    purpose: 'A comprehensive recruitment and onboarding system for advisory firms covering leadership style alignment, candidate vetting using Enneagram psychological profiling, a 3-stage interview process (Feel/Know/Test), FM Team CANOE personality review, Associate job ad templates, and a structured AM/PM orientation schedule for new hires.',
    helpsOwner: 'Prevents the extreme financial and cultural cost of a bad hire by ensuring candidates are assessed for psychological fit, leadership alignment, and technical competence before an offer is made.',
    helpsAdvisor: 'Provides highly targeted behavioural interview questions based on the candidate\'s Enneagram type, a 360-degree team synergy review (CANOE: Conscientiousness, Agreeableness, Neuroticism, Openness, Extraversion), and a Buddy System orientation framework for the new hire\'s first two days.',
    indicators: 'Leadership teams and HR managers actively preparing to recruit advisory staff or restructure the team. Use when a previous bad hire has damaged culture or profitability, when the firm is scaling rapidly and needs a repeatable hiring process, or when preparing a formal Associate Advisor job advertisement.'
  },
  {
    name: 'Coaching Content',
    section: 'Get Organised - Firm Manager',
    purpose: "A comprehensive advisor skill development content library based on the 'Flipping the Learning' model — starting with client problems and working backwards to determine what internal training is required, ensuring the firm's learning investment is directly connected to client outcomes.",
    helpsOwner: 'Ensures the advisory firm\'s time and training resources are dedicated to learning how to solve the exact problems the business owner is currently facing — not generic courses disconnected from real client needs.',
    helpsAdvisor: 'Removes ambiguity from professional development by clarifying exactly who on the team needs to learn what and by when, using a technology-enabled closed feedback loop that monitors common failures and continuously improves the training curriculum.',
    indicators: 'Practice partners, training managers, and HR leaders responsible for mapping the internal training curriculum. Use when the team\'s professional development feels disconnected from client delivery, or when advisors are learning in silos rather than as a collaborative team.'
  },
  {
    name: 'Coaching Outcome Statements',
    section: 'Get Organised - Firm Manager',
    purpose: 'A Team Training Operating System (OS) that provides clear Field Outcome Statements defining the responsibilities, boundaries, and expected coaching requirements across each advisory tier — from Advisory Support through to Strategic Advisor and future Partnership Option.',
    helpsOwner: 'Ensures clients are matched with advisors functioning at the correct level of expertise, from software training and educational meetings through to complex, conflict-based business facilitation.',
    helpsAdvisor: 'Sets crystal-clear career expectations. An Associate Advisor knows they manage accounts proactively but are not required to hunt for new prospects. A Strategic Advisor knows exactly what skills they must master to become a Partnership Option. Removes ambiguity and entitlement disputes.',
    indicators: 'Management tracking the Professional\'s Journey and team members wanting to understand their specific role boundaries and career progression path. Use during performance reviews, when restructuring the advisory team, or when onboarding a new advisor.'
  },
  {
    name: 'Planning Templates Directory',
    section: 'Get Organised - Firm Manager',
    purpose: 'A structured directory and reference guide that maps all available planning templates to their relevant coaching phases, client situations, and advisory applications — giving firm managers and coaches a clear overview of what tools to deploy and when.',
    helpsOwner: 'Ensures the advisory firm is systematically using the full toolkit available rather than defaulting to the same small set of familiar templates, improving the breadth and quality of client service.',
    helpsAdvisor: 'Provides a navigation reference so advisors can quickly identify the right template for each client situation and coaching phase, reducing preparation time and ensuring consistency across the team.',
    indicators: 'Firm managers, internal coaches, and advisory teams who want a structured reference to ensure the full template library is being deployed systematically. Use during team coaching sessions, client preparation, or when reviewing whether the full Advisor-e toolkit is being utilised.'
  },
  {
    name: 'Paper Tower',
    section: 'Get Organised - Firm Manager',
    purpose: 'A team-building workshop toolkit containing the Paper Tower financial scoring model, Review Questions debrief script, Task Sheet rules, and Spaghetti Tower alternative exercise — translating a hands-on construction challenge into profound insights about team dynamics, process discipline, and business decision-making.',
    helpsOwner: 'Demonstrates how material costs, time efficiency, and quality directly impact the bottom line. Translates soft skills (team communication, planning) into hard financial metrics, proving that rushing into action without a plan leads to waste and financial loss.',
    helpsAdvisor: 'The facilitator scoring model automates complex profit/loss calculations so the advisor can focus on observing team behaviour. The debrief script introduces a 9-step problem-solving process (Appoint Chairperson, SMART Objective, Brainstorm without assessment, etc.) directly applicable to real business projects.',
    indicators: 'Facilitators and firm managers running internal team-building days, conflict resolution sessions, or workshops aimed at improving structured decision-making and team collaboration. Also used as an engaging ice-breaker before intensive strategy sessions.'
  },
  {
    name: 'Hire Winners',
    section: 'Get Organised - Firm Manager',
    purpose: 'A general hiring framework covering recruitment theory, leadership alignment, 3-stage candidate vetting (Feel/Know/Test), and structured orientation — designed to prevent costly hiring mistakes by assessing cultural fit, technical competence, and growth potential before an offer is made.',
    helpsOwner: 'Protects the firm against the financial and cultural cost of a wrong hire by using a disciplined, multi-stage vetting process before committing to an employment offer.',
    helpsAdvisor: 'Provides a replicable hiring process that can be used across advisory, administrative, and support roles. The structured orientation table ensures new hires are productively integrated from day one rather than left to find their own footing.',
    indicators: 'Advisory firms and accounting practices preparing to recruit any team member. Use when previous informal hiring has resulted in poor cultural fit, high staff turnover, or when the firm has grown to the point where a repeatable hiring process is needed.'
  },
  {
    name: 'Team Bldg Problem Solving',
    section: 'Get Organised - Firm Manager',
    purpose: 'A structured 9-step team problem-solving framework and facilitation guide that moves teams from chaotic, jump-to-solution behaviour to process-driven, accountable decision-making — covering Chairperson appointment, SMART objectives, brainstorming without assessment, option evaluation, resource allocation, and action planning.',
    helpsOwner: 'Prevents the team from suffering analysis paralysis or jumping straight to the first solution, ensuring complex business challenges are solved methodically with an Enforcer assigned to maintain implementation momentum.',
    helpsAdvisor: 'Provides an authoritative, institutionally-backed framework for guiding client strategy sessions and ensuring that decisions made in the room result in accountable action plans rather than good intentions.',
    indicators: 'Facilitators and management teams navigating complex problems, strategic pivots, or internal conflicts. Use when the team regularly starts meetings without a clear objective, when brainstorming sessions consistently end without decisions, or when previously agreed actions are not being implemented.'
  },
  {
    name: 'Advisor-e Coaching Plan',
    section: 'Get Organised - Firm Manager',
    purpose: 'A comprehensive 60-session coaching curriculum spreadsheet that tracks the full advisory development program — including pricing models, session hours, skill outcomes, and progress against field objectives — from technical software usage through to advanced soft skills like sales framing and COI development.',
    helpsOwner: 'Provides measurable ROI on coaching investment by mapping topics, planned attendees, and delivery hours directly against specific field outcomes and client-facing improvements.',
    helpsAdvisor: 'Gives a predictable, structured pathway from technical foundations to strategic advisory capability. Scheduled in work sprints that respect peak compliance periods, with a Weekly Golden Hour dedicated to strategic learning above compliance deliveries.',
    indicators: 'Practice managers and advisors managing long-term professional development programs. Use when the coaching program lacks a documented curriculum, when it is unclear which sessions have been completed or what remains, or when a new advisor cohort needs a structured onboarding pathway.'
  },
  {
    name: 'Advisory Performance Improvement',
    section: 'Get Organised - Firm Manager',
    purpose: 'A formal Performance Improvement Plan (PIP) template tailored specifically for advisory roles and portal engagement — documenting exact performance gaps against measurable metrics, defining required behavioural changes, assigning a mentor, and scheduling strict 30/60/90-day review milestones.',
    helpsOwner: 'Protects the firm against fee loss and cultural damage caused by underperforming advisors by ensuring performance issues are formally documented, clearly communicated, and actively managed before they become costly.',
    helpsAdvisor: 'Removes all ambiguity about what the performance gap is and exactly what must change. Outlines specific behaviours to start and stop, details the mentorship available, and establishes clear review timelines — protecting both the firm and the advisor from misunderstanding.',
    indicators: 'Team members failing to meet minimum portal engagement expectations (e.g., client entities not created, post-meeting actions not tagged), advisors resisting the advisory engagement model, or any situation where informal performance conversations have not produced change.'
  },
  {
    name: 'Group Coaching Sessions',
    section: 'Get Organised - Firm Manager',
    purpose: 'A suite of 6 video-based interactive group coaching tutorials — each with a presentation video (including timed breakout sessions), a Coach Prep guide, a session run sheet, and supporting templates — covering disruption, structured networking, COI development (Parts 1 & 2), Event-Cause-Effect storytelling, and fee/job creep discussions.',
    helpsOwner: 'Demonstrates the firm\'s commitment to a Visible Learning Culture — ensuring the advisory team is continuously developing the skills needed to solve real client problems and create competitive advantage.',
    helpsAdvisor: 'Provides a turnkey team training system. Each session is designed to be fun, interactive, and quick to prepare: just turn on the video and pause at the breakout questions. Covers the core skills needed for advisory growth: coping with disruption, building referral networks, handling difficult fee conversations, and engaging passive-aggressive prospects.',
    indicators: 'Firm managers and internal coaches pursuing a Visible Learning Culture. Use when the advisory team needs structured group development that goes beyond individual coaching, particularly when building COI skills, improving client communication, or establishing a culture of psychological safety and continuous learning.'
  },
  {
    name: 'Coping With Disruption',
    section: 'Get Organised - Firm Manager',
    purpose: 'A 90-minute group coaching tutorial (34-min video + 5 breakouts) that builds a Visible Learning Culture by teaching the team about the Reticular Activating System, Enneagram coping styles, how to learn from failure without emotional blackmail, and how to translate new skills into competitive advantage for clients.',
    helpsOwner: 'Ensures the advisory team takes collective responsibility for developing competitive advantage — creating a culture of progression and honesty where learning is a continuous journey rather than a one-off event.',
    helpsAdvisor: 'Helps advisors recognise how the R.A.S limits their SWOT analysis, teaches them to use feedback frameworks to fail forward, and builds a structured 90-day learning focus — clarifying how each new skill benefits the client, the advisor, and the firm.',
    indicators: 'Advisory teams experiencing resistance to new technology, AI adoption, or process changes. Use as the first session in a team development program when establishing a Visible Learning Culture, or whenever the team needs to collectively develop resilience and adaptability.'
  },
  {
    name: 'Structured Networking',
    section: 'Get Organised - Firm Manager',
    purpose: 'A 90-minute group coaching tutorial (40-min video + 5 breakouts) that teaches advisors to develop intentional relationships with existing clients through structured networking — covering psychological blockages, the Advisor-e Relationship Staircase, how to avoid giving free advice during coffee chats, and managing internal dialogue.',
    helpsOwner: 'Helps advisors transition from reactive relationship management to strategic relationship building with existing clients and centres of influence, increasing the value each relationship delivers over time.',
    helpsAdvisor: 'Provides frameworks including the Jo-Hari Window, Freud\'s Psyche Structure, Coded Behaviour, and micro-habit building to analyse client communication styles, grade relationship depth, and manage the internal dialogue that prevents advisors from executing networking tactics. Homework: approach 3 identified clients.',
    indicators: 'Advisory teams who know they should be networking more intentionally but struggle to take consistent action, or whose "coffee chats" consistently result in free advice being given rather than strategic relationship progression.'
  },
  {
    name: 'COI Development pt1',
    section: 'Get Organised - Firm Manager',
    purpose: 'The first of three COI coaching modules (47-min video + 5 breakouts) covering the psychology of Centre of Influence development — including the 3 relation types, Honey & Mumford processing styles, 4 requirements for successful business relationships, 4 referral styles, 5 approach options, and the Advisor-e COI process (Could We / How Would We / Will We / Test Review).',
    helpsOwner: 'Ensures the advisor has undergone rigorous, scenario-based training in building authentic referral relationships — resulting in a more structured and professional business relationship rather than a haphazard sales pitch.',
    helpsAdvisor: 'Provides the psychological framework for understanding COI dynamics, identifying referral-style mismatches, and progressing relationships deliberately through the four stages of the Advisor-e COI process. Homework: identify 3 COI targets and secure a coffee chat.',
    indicators: 'Advisory teams starting to build a structured referral network. Use as the foundational module before attempting COI outreach — critical for advisors who have tried referral development before but found it felt inauthentic or yielded poor results.'
  },
  {
    name: 'COI Development pt2',
    section: 'Get Organised - Firm Manager',
    purpose: 'The second COI coaching module (23-min video + 5 breakouts) covering the logistics and compelling offer phase — starting within a comfort-range COI profile, mapping logistics using the COI Logistics Model, building a value proposition through the Time/Control/Money lens, and establishing a feedback loop to refine the offer.',
    helpsOwner: 'Results in an advisory offer that focuses directly on the value the COI\'s clients understand and desire, rather than internal firm metrics or technical jargon.',
    helpsAdvisor: 'Forces advisors to define their ideal COI profile (geography, demographics, client mix), calculate how many prospecting hours are required to secure their target number of COIs, and validate their offer against the Time/Control/Money framework before taking it to market.',
    indicators: 'Advisory teams who have completed COI Development Part 1 and are ready to operationalise their networking strategy with specific logistics, a compelling offer, and a defined COI target profile.'
  },
  {
    name: 'Event, Cause, Effect',
    section: 'Get Organised - Firm Manager',
    purpose: "A 90-minute group coaching tutorial (33-min video + 5 breakouts) teaching the Event-Cause-Effect storytelling framework — a 3rd-person dissociation technique using the 'rule of 5 and 3' (5 Causes, 3 Effects) that positions advisory conversations as problem-solving rather than selling, specifically designed for handling passive-aggressive or resistant prospects ('Mr Prickly').",
    helpsOwner: 'Ensures the advisor operates with genuine congruence rather than rehearsed sales scripts — creating conversations centred on "let\'s fix the problem, not the blame" that feel collaborative rather than adversarial.',
    helpsAdvisor: "Provides the advisor with a mental anchor that reduces performance anxiety. Teaches them to illustrate technical expertise via 3rd-person dissociation while building emotional connection via 1st-person empathy, and to use the 'Look Both Ways' (pre and post-event) approach to naturally extend engagement scope.",
    indicators: 'Advisors struggling with resistant, disengaged, or guarded prospects. Use after COI Development Parts 1 & 2 to train advisors in the advanced client engagement skill of building common problem stories that create trust and open doors without triggering sales resistance.'
  },
  {
    name: 'Fee Estimate & Job Creep Discussions',
    section: 'Get Organised - Firm Manager',
    purpose: "A 90-minute group coaching tutorial (31-min video + 5 breakouts) equipping advisors to handle the two fee scenarios that 'sneak up' on professionals: Scenario 1 (client downplays a job to influence the estimate) and Scenario 2 (client uses an 'assumed close' to avoid discussing price) — using Prime & Range-Link scripts, Blow-out warnings, and the Old Car Maintenance philosophy.",
    helpsOwner: 'Standardises the firm\'s response to problematic client pricing behaviours, protecting profitability and ensuring fee conversations are handled consistently and confidently across the entire advisory team.',
    helpsAdvisor: 'Provides psychological tools to understand when the "balance of power" shifts in a fee conversation, and equips advisors with literal scripts (using the word "because" as a logical justifier) and role-play practice to build confidence before facing real clients.',
    indicators: 'Advisory firms where advisors regularly discount fees under pressure, fail to raise job creep issues with clients, or avoid fee estimate conversations due to discomfort. Use as a team training module when write-offs are increasing or when client fee disputes are occurring.'
  },

  // ─── Get Organised - Advisor ────────────────────────────────────────────────

  {
    name: 'My Improvement Plan',
    section: 'Get Organised - Advisor',
    purpose: 'A personal performance improvement and development plan for internal advisory team members not directly responsible for growing fees — covering role expectations, skill development targets, performance benchmarks, and structured review milestones.',
    helpsOwner: 'Ensures the internal support team and non-revenue-generating advisors are developing professionally and meeting minimum performance standards, indirectly improving the quality of service the client receives.',
    helpsAdvisor: 'Provides a structured self-development framework with clear expectations and review points. Distinct from the My Fee Growth Plan in that it focuses on internal performance and skill development rather than revenue targets.',
    indicators: 'Internal advisory staff, administrative team members, and associates not yet required to generate fees who need a formal development plan. Use during performance reviews or when an internal team member is underperforming relative to their role expectations.'
  },
  {
    name: 'My Fee Growth Plan',
    section: 'Get Organised - Advisor',
    purpose: "A personal advisory fee growth model that helps individual advisors define their target clients, niche service offers, marketing statements, conversion assumptions, and activity targets — turning fee growth from a vague aspiration into a mathematically modelled personal plan.",
    helpsOwner: 'Ensures clients are categorised and targeted by advisors who have a clear, documented strategy for growing their fee base — leading to more focused, value-driven advisory relationships rather than reactive account management.',
    helpsAdvisor: 'Defines target clients (Growth, Maintain, Service tiers), outlines niche service offers, and sets personal fee targets with conversion assumptions. Helps advisors take autonomous ownership of their pipeline rather than relying on the firm to generate all opportunities.',
    indicators: 'Advisors with full or shared autonomy who are responsible for growing their portion of the fee base. Use during annual planning, when an advisor is transitioning from associate to strategic tier, or when fee growth has stalled and a structured reset is needed.'
  },
  {
    name: 'My Network/Entertainment Schedule',
    section: 'Get Organised - Advisor',
    purpose: "A personal networking and client entertainment planning template that maps out the advisor's scheduled relationship-building activities — coffee chats, dinners, events, and COI meetings — against their fee growth targets and client priority tiers.",
    helpsOwner: 'Ensures the advisor is proactively investing time in relationship maintenance and development rather than only engaging clients reactively around compliance deadlines.',
    helpsAdvisor: 'Provides a structured schedule to track relationship-building activities and ensure the advisor is consistently progressing relationships up the Relationship Staircase. Links entertainment and networking spend to client value and fee growth targets.',
    indicators: 'Advisors at any level who want to formalise their networking activities, who are building a COI referral network, or whose relationship-building activities currently lack structure or accountability.'
  },
  {
    name: 'Platinum Case Study',
    section: 'Get Organised - Advisor',
    purpose: "A structured client case study preparation format used in the firm's Platinum Hr team sessions — guiding the presenting advisor through how to introduce client financials and observed trends, frame the client's issues against the Get Organised / Get the Job / Do the Job framework, explain the service offer, and capture peer feedback.",
    helpsOwner: 'Ensures client situations are analysed by the entire advisory team rather than in isolation, leading to richer, more validated advice and solutions that have been stress-tested before the client conversation.',
    helpsAdvisor: 'Provides a structured template for presenting client cases to peers in the Golden Hr / Platinum Hr learning cycle. Ensures the advisor is fully prepared before entering a client meeting and captures group intelligence in a reusable format.',
    indicators: 'Advisors preparing for complex client reviews, strategy sessions, or difficult conversations. Use as the standard preparation format for all Platinum Hr team sessions within a Visible Learning Culture program.'
  },
  {
    name: 'My CPD Log',
    section: 'Get Organised - Advisor',
    purpose: "A personal Continuing Professional Development (CPD) log that tracks learning hours, session topics, competencies developed, and progress against the firm's required CPD framework — providing an auditable record of professional development for compliance, partnership pathway assessment, and personal accountability.",
    helpsOwner: 'Ensures the advisor providing services is maintaining their professional competence through documented, structured learning rather than ad-hoc development.',
    helpsAdvisor: 'Automates accountability by providing a simple log for recording each learning activity, the time spent, and the competency developed. Required for partnership pathway progression and used in conjunction with the Coaching Progress Plan to track 60-session curriculum completion.',
    indicators: 'All advisors in the Advisor-e ecosystem. Particularly important for those on the Directorship Pathway who must demonstrate a minimum number of CPD hours, and for practice managers tracking team-wide professional development compliance.'
  },
  {
    name: 'My Sales Logistics & Mktg Plan',
    section: 'Get Organised - Advisor',
    purpose: 'A personal sales logistics and marketing planning template that defines the advisor\'s target market profile, COI approach strategy, weekly prospecting activity targets, and marketing messaging — translating advisory growth ambitions into a concrete, measurable activity plan.',
    helpsOwner: 'Ensures the advisor is approaching their market systematically and with a clear value proposition rather than opportunistically, leading to more consistent and professional client and COI engagement.',
    helpsAdvisor: 'Provides the personal equivalent of the firm-level Messaging Plan — mapping outreach activities (calls, coffee chats, seminars, referral asks) to specific targets and timelines, and tracking conversion through the pipeline stages.',
    indicators: 'Advisors with fee growth responsibility who are building their own client base or COI network. Use during annual planning, when reviewing why fee growth has stalled, or when starting a structured COI development program.'
  }
]

const updated = [...existing, ...newEntries]
fs.writeFileSync(dataFile, JSON.stringify(updated, null, 2))
console.log('Previous count:', existing.length)
console.log('New entries added:', newEntries.length)
console.log('Total:', updated.length)
