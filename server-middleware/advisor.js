/**
 * Nuxt 2 server middleware — handles POST /api/advisor/query
 *
 * Calls OpenAI directly using the local data files.
 * When the Restify backend is ready, this can be replaced with a proxy.
 * See server/restify-route.js for the Restify implementation reference.
 */

const OpenAI = require('openai')
const fs = require('fs')
const path = require('path')
const { getOrgTemplates, filterTemplatesByQuery, formatTemplatesForPrompt } = require('../server/utils/templates')
const { formatCoachingForPrompt } = require('../server/utils/coaching')
const { filterSummariesByQuery, getSummariesForTemplateNames, formatSummariesForPrompt, formatSectionDescriptionsForPrompt } = require('../server/utils/summaries')
const { formatGrowthFundamentalsForPrompt, conversationHasGrowthStage } = require('../server/utils/growth')
const { detectLogicTree, formatLogicTreeForPrompt, formatSeminarsReferenceForPrompt, formatTrialFitReferenceForPrompt, formatCautiousRevealReferenceForPrompt, formatEoyReferenceForPrompt, formatFacilitationReferenceForPrompt, formatGrowthCurveRevealReferenceForPrompt, formatConflictMeetingReferenceForPrompt, formatCCOReferenceForPrompt, formatHealdMatrixReferenceForPrompt, formatDemingsVolatilityReferenceForPrompt, formatWorkingCapitalCycleReferenceForPrompt, formatRatioAnalysisReferenceForPrompt, formatDashboardDiscussionsReferenceForPrompt, buildLearnReferenceText } = require('../server/utils/logicTrees')

// Reference data for scenario-specific Phase 3 instructions
const FIN_MGT_TABLE = require('../data/fin-mgt-table.json')
const SALES_MARKETING_SLIDES = require('../data/sales-marketing-slides.json')

function formatFinMgtTable () {
  return FIN_MGT_TABLE.themes.map(t =>
    `Theme: ${t.name}\nProblem: ${t.problem}\nSolution: ${t.solution}\nSuggested Template: ${t.template}`
  ).join('\n\n')
}

function formatSalesMarketingSlides () {
  return SALES_MARKETING_SLIDES.frameworks.map(f =>
    `Page ${f.page} — ${f.name}: ${f.summary}`
  ).join('\n')
}

// Prompt cache — loaded once per process, never re-read from disk
const _promptCache = {}
function loadPrompt (name) {
  if (_promptCache[name]) return _promptCache[name]
  const filePath = path.resolve(process.cwd(), 'data/prompts', name + '.txt')
  _promptCache[name] = fs.readFileSync(filePath, 'utf8')
  return _promptCache[name]
}

const OPENING_MSG = {
  client: 'Great — let\'s work through this together.\n\nTell me about your client and the situation you want to address — I\'ll use that, along with what I already know about you, to find the right template.\n\n**What\'s the core situation or challenge you\'re looking to address with this client?**',
  discover: 'Sure — let\'s find you the right template.\n\n**Tell me what you have in mind. You can describe it by what it does ("something that helps clients understand their cash flow"), by a combination of topics ("strategic planning plus team engagement"), or by a name you half-remember ("something like the Working Capital one"). The more detail you give, the better I can match it.**',
  plan: 'Great — let\'s think through this together.\n\nBefore I point you to the right tool, I want to understand where you are and what you\'re trying to achieve — the best planning framework depends entirely on your situation.\n\n**What\'s prompting you to think about planning ahead right now?**',
  learn: 'Great — this is one of the most valuable things you can invest in.\n\nTo make sure I point you to the right resource, I want to understand what you\'re looking to develop and what\'s driving it.\n\n**What area are you most drawn to working on — winning clients, facilitation skills, the psychology side, positioning and messaging, or something else?**'
}

// Sections to include per mode — limits the template pool before query scoring
const MODE_SECTIONS = {
  plan: ['get-organised'],
  learn: ['get-the-job', 'get-organised']
}

function formatAdvisorProfile (profile) {
  const lines = []
  if (profile.experience && profile.experience.trim()) lines.push(`Experience: ${profile.experience.trim()}`)
  if (profile.clientDemographic && profile.clientDemographic.trim()) lines.push(`Typical client profile: ${profile.clientDemographic.trim()}`)
  if (profile.enjoyment && profile.enjoyment.trim()) lines.push(`Advisory conversations they enjoy most: ${profile.enjoyment.trim()}`)
  if (profile.technicalStrengths && profile.technicalStrengths.trim()) lines.push(`Technical strengths: ${profile.technicalStrengths.trim()}`)
  if (profile.toolsComfort && profile.toolsComfort.trim()) lines.push(`Comfort with tools and frameworks: ${profile.toolsComfort.trim()}`)
  if (profile.notes && profile.notes.trim()) lines.push(`Additional context: ${profile.notes.trim()}`)
  return lines.join('\n')
}

// ── Phase 4 — AI picks the most natural Moving Forward question ──
// Uses gpt-4o-mini with a 50-token cap — fast and cheap.
// Falls back to the first option if the AI returns something unexpected.
const MOVING_FORWARD_OPTIONS = [
  'Would you like help developing your approach to the client for this session?',
  'Would you like to rehearse how you\'d open this conversation?',
  'Shall I help you think through how to introduce this to the client?'
]

async function getMovingForwardQuestion (conversationHistory) {
  const systemPrompt = `You are deciding which single question to ask an advisor after delivering a template recommendation.

Choose exactly one of the following based on the conversation — pick whichever feels most natural given the client situation, the advisor's experience, and what was discussed:
- "Would you like help developing your approach to the client for this session?"
- "Would you like to rehearse how you'd open this conversation?"
- "Shall I help you think through how to introduce this to the client?"

Return ONLY the chosen question — no preamble, no explanation, no additional text.`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 50,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6),
        { role: 'user', content: 'Choose and return the single most appropriate question.' }
      ]
    })
    const returned = (response.choices[0]?.message?.content || '').trim()
    return MOVING_FORWARD_OPTIONS.find(q => returned.includes(q.slice(0, 20))) || MOVING_FORWARD_OPTIONS[0]
  } catch (e) {
    return MOVING_FORWARD_OPTIONS[0]
  }
}

// ── Shared context builder for all client-mode AI calls ──
// Centralises template/coaching/summary fetching so Phase 3 and post-rec
// don't duplicate the same logic independently.
function buildClientContext (orgTemplateIds, searchQuery, options) {
  const {
    includeCoaching = true,
    includeSummaries = false,
    includeGrowthStage = null,
    includeSectionDesc = false,
    advisorProfile = null,
    logicTree = null,
    maxTemplates = 25
  } = options || {}

  const orgTemplates = getOrgTemplates(orgTemplateIds || null)
  const relevant = filterTemplatesByQuery(orgTemplates, searchQuery, maxTemplates)
  const templatesToUse = relevant.length > 0 ? relevant : orgTemplates.slice(0, maxTemplates)
  const templatesText = formatTemplatesForPrompt(templatesToUse)
  const coachingText = includeCoaching ? formatCoachingForPrompt() : null
  const sectionDescText = includeSectionDesc ? formatSectionDescriptionsForPrompt() : null
  const growthText = includeGrowthStage
    ? formatGrowthFundamentalsForPrompt([{ role: 'user', content: includeGrowthStage }])
    : null
  const profileText = advisorProfile
    ? `\n\nADVISOR PROFILE: ${formatAdvisorProfile(advisorProfile)}`
    : ''

  // Build summaries: keyword match + tree terminal-node templates (merged, de-duped, capped at 25)
  let summariesText = null
  if (includeSummaries) {
    const querySummaries = filterSummariesByQuery(searchQuery, 12)
    const treeTemplateNames = logicTree
      ? logicTree.nodes.filter(n => n.type === 'recommendation').flatMap(n => n.templates || [])
      : []
    const treeSummaries = getSummariesForTemplateNames(treeTemplateNames)
    const summaryMap = new Map()
    for (const s of [...querySummaries, ...treeSummaries]) {
      if (!summaryMap.has(s.name)) summaryMap.set(s.name, s)
    }
    const summariesToUse = Array.from(summaryMap.values()).slice(0, 25)
    summariesText = summariesToUse.length > 0
      ? `## Do the Job Content Summaries (${summariesToUse.length} most relevant)\n\nUse these for Phase 3. Each entry contains: Purpose, When to use, Helps the owner, Helps the advisor.\n\n` + formatSummariesForPrompt(summariesToUse)
      : null
  }

  // Logic tree — diagnostic pathway that led to this situation
  const logicTreeText = logicTree ? formatLogicTreeForPrompt(logicTree) : null

  return [
    `## Available Templates (${templatesToUse.length} most relevant)`,
    '',
    templatesText,
    sectionDescText ? '\n---\n\n' + sectionDescText : '',
    coachingText ? '\n---\n\n## Coaching Reference\n\n' + coachingText : '',
    growthText ? '\n---\n\n' + growthText : '',
    summariesText ? '\n---\n\n' + summariesText : '',
    logicTreeText ? '\n---\n\n' + logicTreeText : ''
  ].filter(Boolean).join('\n') + profileText
}

let openaiClient = null

function getOpenAI () {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

const _dbgLog = require('os').tmpdir() + '/va-debug.log'
const _dbgMaxBytes = 5 * 1024 * 1024 // 5 MB cap — prevents runaway disk usage if debug left on
function dbg (msg) {
  if (!process.env.VA_DEBUG) return
  try {
    const stat = fs.statSync(_dbgLog)
    if (stat.size >= _dbgMaxBytes) return
  } catch (e) {}
  try { fs.appendFileSync(_dbgLog, new Date().toISOString() + ' ' + msg + '\n') } catch (e) {}
}

module.exports = function advisorMiddleware (req, res, next) {
  dbg('MW: method=' + req.method + ' url=' + req.url)
  if (req.method !== 'POST' || req.url !== '/query') {
    return next()
  }

  let body = ''
  req.on('data', chunk => { body += chunk.toString() })
  req.on('end', () => {
    handleQuery(body, res).catch(err => {
      console.error('[advisor] Unhandled error:', err.message)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Internal server error' }))
      } else if (!res.writableEnded) {
        try { res.write('data: ' + JSON.stringify({ type: 'error', message: 'Server error' }) + '\n\n') } catch (e) {}
        try { res.end() } catch (e) {}
      }
    })
  })
}

async function handleQuery (rawBody, res) {
  let parsed
  try {
    parsed = JSON.parse(rawBody)
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON' }))
    return
  }

  const { query, mode = 'client', orgTemplateIds, conversationHistory = [], advisorProfile, language = 'en', languageName = 'English', caseSummaries: caseContext = [], conversationState = {} } = parsed

  if (!query || !query.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Query is required' }))
    return
  }

  // ─────────────────────────────────────────────────────────────────
  // CLIENT MODE SEQUENCER
  // Code controls the question sequence entirely.
  // AI is only called for Phase 3 recommendation.
  // ─────────────────────────────────────────────────────────────────
  if (mode === 'client') {
    const state = Object.assign({
      // Scenario flags
      profitSituation: false,
      staffSituation: false,
      dataSystemsSituation: false,
      salesMarketingSituation: false,
      forecastingSituation: false,
      disambiguationNeeded: false,
      disambiguationScenarios: [],
      // Universal questions
      disambiguationAnswer: null,
      clientRaisedIssue: false,
      // Profit scenario questions
      usesReports: false,
      wouldBenefitFromReview: false,
      industry: null,
      // Staff scenario questions
      staffScope: null,
      staffOrigin: null,
      staffCategory: null,
      // Data/Systems scenario questions
      dataSystemsChartAccounts: null,
      dataSystemsTeam: null,
      dataSystemsComplexity: null,
      // Sales/Marketing scenario questions
      salesDiagnosis: null,
      salesTracking: null,
      salesProductFit: null,
      // Forecasting scenario question (droptab)
      forecastingTheme: null,
      // Shared Phase 1 questions
      ownership: null,
      growthStage: null,
      acumen: null,
      academic: null,
      trust: null,
      engagementHistory: null,
      clientPersonality: null,
      // Phase 2 questions
      advisorExperience: null,
      advisorConfidence: null,
      // Flow state
      readyForRecommendation: false,
      recommendationDelivered: false,
      happyConfirmed: false,
      clientApproachAsked: false,
      movingForwardAsked: false,
      movingForwardDone: false,
      movingForwardHelped: false,
      conversationComplete: false,
      postRecAiResponses: 0
    }, conversationState)

    // Always re-detect scenario from the first user message — never trust state for these flags.
    // Score all 5 scenarios by keyword match count. Most matches wins.
    // On a tie between any two or more, ask disambiguation.
    const SCENARIO_PATTERNS = [
      {
        id: 'profit',
        label: 'profitability and cost management',
        pattern: /profit|profitability|margin|margins|fuel cost|fuel costs|rising cost|rising costs|cost increase|increasing cost|expenses|cost pressure|squeeze/gi
      },
      {
        id: 'staff',
        label: 'staff, productivity and leadership',
        pattern: /\b(staff|employees|team|efficiency|productivity|effectiveness|leadership|HR|morale|culture|disharmony|poor communication)\b/gi
      },
      {
        id: 'data-systems',
        label: 'data integrity and financial systems',
        pattern: /data integrity|\bdata\b|inaccurate|not accurate|can't rely|cannot rely|not reliable|accurate data|financial data|data quality|quality reports|financial reports|financial reporting|management reports|their financials|the financials|the figures|their figures|the numbers|the books|chart of accounts|financial literacy|generating reports|monthly reporting|financial systems|accounting systems|bookkeeping|unreliable|clean accounts|bad data|poor data|trust the numbers/gi
      },
      {
        id: 'sales-marketing',
        label: 'sales and marketing',
        pattern: /\b(sales|marketing|messaging|advertising)\b|drop in revenue|drop in sales|drop in income|low sales|media campaigns|brand awareness/gi
      },
      {
        id: 'forecasting',
        label: 'forecasting and management reporting',
        pattern: /cash forecast|budgets|dashboard discussions|dashboard|ratio analysis|financial management report/gi
      }
    ]

    const firstMsg = conversationHistory.length > 0
      ? (conversationHistory.find(m => m.role === 'user') || { content: query }).content
      : query

    const scenarioScores = SCENARIO_PATTERNS.map(s => ({
      id: s.id,
      label: s.label,
      count: (firstMsg.match(s.pattern) || []).length
    })).filter(s => s.count > 0)

    // Helper: set exactly one situation flag, clear the rest
    function setSituationFlag (id) {
      state.profitSituation = id === 'profit'
      state.staffSituation = id === 'staff'
      state.dataSystemsSituation = id === 'data-systems'
      state.salesMarketingSituation = id === 'sales-marketing'
      state.forecastingSituation = id === 'forecasting'
    }

    // Reset all situation flags before re-detecting
    state.profitSituation = false
    state.staffSituation = false
    state.dataSystemsSituation = false
    state.salesMarketingSituation = false
    state.forecastingSituation = false
    state.disambiguationNeeded = false
    state.disambiguationScenarios = []

    if (scenarioScores.length > 0) {
      const maxCount = Math.max(...scenarioScores.map(s => s.count))
      const topMatches = scenarioScores.filter(s => s.count === maxCount)

      if (topMatches.length === 1) {
        setSituationFlag(topMatches[0].id)
      } else {
        // Genuine tie — disambiguation question fires after Q1
        state.disambiguationNeeded = true
        state.disambiguationScenarios = topMatches.map(s => ({ id: s.id, label: s.label }))
      }
    }

    // Helper: stream a hardcoded question directly to the client
    const sendQuestion = (text, newState) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      })
      res.write('data: ' + JSON.stringify({ type: 'delta', text }) + '\n\n')
      res.write('data: ' + JSON.stringify({ type: 'state', state: newState }) + '\n\n')
      res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
      res.end()
    }

    // ── QUESTION PIPELINE ──
    // Full sequence of questions in order. Each has an optional skip() condition.
    // The sequencer asks the first unanswered, non-skipped question, then stops.
    const isNFPorPublic = s => s.ownership && /not.for.profit|nfp|non.profit|public|listed/i.test(s.ownership)

    const QUESTIONS = [
      {
        field: 'clientRaisedIssue',
        text: 'Has the client specifically raised this issue themselves, or is it something you\'ve noticed and want to address with them?'
      },
      {
        field: 'disambiguationAnswer',
        textFn: s => {
          const scenarios = s.disambiguationScenarios || []
          if (scenarios.length === 2) {
            return `I'm picking up signals for both ${scenarios[0].label} and ${scenarios[1].label} in what you've described — which of these is the primary focus for this client?`
          }
          const list = scenarios.map(sc => sc.label).join(', ')
          return `I'm picking up signals across multiple areas — ${list}. Which would you say is the primary focus for this client?`
        },
        skip: s => !s.disambiguationNeeded,
        onAnswer: (answer, s) => {
          const lower = answer.toLowerCase()
          if (/profit|margin|cost|expense|squeeze/i.test(lower)) {
            setSituationFlag('profit')
          } else if (/staff|team|employee|leadership|hr|morale|culture/i.test(lower)) {
            setSituationFlag('staff')
          } else if (/data|system|chart.*account|financial literacy|accounting/i.test(lower)) {
            setSituationFlag('data-systems')
          } else if (/sales|marketing|revenue|advertising|brand|conversion/i.test(lower)) {
            setSituationFlag('sales-marketing')
          } else if (/forecast|budget|dashboard|ratio/i.test(lower)) {
            setSituationFlag('forecasting')
          } else if (s.disambiguationScenarios && s.disambiguationScenarios.length > 0) {
            // Can't determine from answer — default to first tied scenario
            setSituationFlag(s.disambiguationScenarios[0].id)
          }
          s.disambiguationNeeded = false
        }
      },
      {
        field: 'usesReports',
        text: 'Does the client use financial management reports on a regular basis?',
        skip: s => !s.profitSituation
      },
      {
        field: 'wouldBenefitFromReview',
        text: 'Do you think the client could benefit from a detailed review of their business variables and profit drivers?',
        skip: s => !s.profitSituation
      },
      {
        field: 'industry',
        text: 'What industry is the client in?',
        skip: s => !s.profitSituation
      },
      {
        field: 'staffScope',
        text: 'Does this issue relate to one or two specific employees, or is it a wider team issue across the business?',
        skip: s => !s.staffSituation
      },
      {
        field: 'staffOrigin',
        text: 'Has this issue surfaced in response to a specific event, or has it just developed over time — and if so, how long has it been building?',
        skip: s => !s.staffSituation
      },
      {
        field: 'staffCategory',
        text: 'In your opinion, is this a potential employment law matter, or does it fall into the broader category of team and leadership improvement?',
        skip: s => !s.staffSituation
      },
      // ── Data Integrity / Financial Systems scenario questions ──
      {
        field: 'dataSystemsChartAccounts',
        text: 'Which of the following, if any, does the client currently utilise — (a) a chart of accounts aligned to business practices for reporting purposes, (b) knowledge of their break-even requirements, (c) comprehension of the Working Capital Cycle? Please speak to each of the three points.',
        skip: s => !s.dataSystemsSituation
      },
      {
        field: 'dataSystemsTeam',
        text: 'Describe the staff numbers, experience and capabilities of the business admin and accounting team.',
        skip: s => !s.dataSystemsSituation
      },
      {
        field: 'dataSystemsComplexity',
        text: 'In your opinion, is the issue related to the complexity of their business administration and technology/software shortfalls?',
        skip: s => !s.dataSystemsSituation
      },
      // ── Sales / Marketing scenario questions ──
      {
        field: 'salesDiagnosis',
        text: 'Has your client accurately determined if their key problem is lack of sales vs. the profitability from the sales they do make?',
        skip: s => !s.salesMarketingSituation
      },
      {
        field: 'salesTracking',
        text: 'Does your client track the conversion ratio from prospect to customer or messaging campaign to prospects? If so — which of these and how do they record the data?',
        skip: s => !s.salesMarketingSituation
      },
      {
        field: 'salesProductFit',
        text: "In your opinion, is the issue related to 'Product Fit' — is your client's product or service still competitive?",
        skip: s => !s.salesMarketingSituation
      },
      // ── Forecasting / Management Reporting scenario — droptab ──
      {
        field: 'forecastingTheme',
        text: 'These themes reflect different levels of client awareness and readiness. Select the one that best describes where your client is starting from with financial management.\n[FIN_MGT_THEME_SELECTOR]',
        skip: s => !s.forecastingSituation
      },
      {
        field: 'ownership',
        text: 'Is the business privately owned, a not-for-profit, or publicly listed?'
      },
      {
        field: 'growthStage',
        text: 'Where would you place them on the Growth Curve?\n[GROWTH_CURVE_SELECTOR]',
        skip: s => isNFPorPublic(s)
      },
      {
        field: 'acumen',
        text: 'How would you describe the business owner\'s acumen — are they experienced and commercially savvy, or relatively new to thinking strategically about their business?'
      },
      {
        field: 'academic',
        text: 'Are they academically inclined — do they read business books, follow frameworks, engage with ideas? Or are they more instinctive and practical?'
      },
      {
        field: 'trust',
        text: 'How would you describe their relationship with you — is there strong trust already, or is it still being built?'
      },
      {
        field: 'clientPersonality',
        text: 'Are they light-hearted and open to being challenged, or are they more discerning and careful about how they receive advice?',
        // Skip if the trust answer already signals a warm, casual relationship — the answer is implied
        skip: s => s.trust && s.trust !== 'pending' && /\b(great|friend|laugh|fun|relax|get on|love|close|enjoy|really well|very well|good rapport|like them|good mates|good mate)\b/i.test(s.trust)
      },
      {
        field: 'engagementHistory',
        text: 'Have they asked for this kind of help before, or is this new territory for them?'
      },
      {
        field: 'advisorExperience',
        text: 'How long have you been delivering advisory work, and are you comfortable using tools and frameworks with clients?',
        skip: () => !!advisorProfile
      },
      {
        field: 'advisorConfidence',
        text: 'How confident do you feel about this type of situation — is this familiar territory, or more of a stretch?',
        skip: () => !!advisorProfile
      }
    ]

    dbg('SEQUENCER: checking pipeline, profitSituation=' + state.profitSituation)

    for (const q of QUESTIONS) {
      if (q.skip && q.skip(state)) continue
      if (!state[q.field]) {
        // Not yet asked — ask it now
        state[q.field] = 'pending'
        const questionText = q.textFn ? q.textFn(state) : q.text
        return sendQuestion(questionText, state)
      }
      if (state[q.field] === 'pending') {
        // Was asked last turn — record the answer
        state[q.field] = query
        // Allow the question to react to its answer (e.g. disambiguation resolving a scenario)
        if (q.onAnswer) q.onAnswer(query, state)
      }
    }

    // ── POST-RECOMMENDATION FLOW ──
    // If the AI has already delivered the Phase 3 recommendation, intercept the advisor's response
    if (state.recommendationDelivered) {
      // Hard stop — conversation is done, nothing further to process
      if (state.conversationComplete) {
        return sendQuestion("You're ready to go. Good luck with it.", state)
      }

      if (!state.clientApproachAsked) {
        const wantsAlternatives = /\b(alternative|alternatives|different|other option|not sure|not happy|not convinced|something else|explore|prefer something|instead|not quite right|change|not right)\b/i
        const confirmsHappy = /\b(yes|yeah|yep|yep|looks good|look.*good|pretty good|good enough|that.?s great|that.?s fine|that.?s right|that.?s perfect|happy with that|happy with|i.?m happy|perfect|sounds good|love it|that works|that.?ll work|that.?ll do|that.?s good|brilliant|excellent|great suggestion|go with that|looks right|fair enough|alright|all right)\b/i

        if (wantsAlternatives.test(query)) {
          // Advisor wants alternatives — fall through to AI, then re-check next turn
          state.clientApproachAsked = true
        } else if (confirmsHappy.test(query)) {
          // Advisor confirms happy — fire Moving Forward
          // The AI always closes with "Are you happy with what I've suggested?" so a
          // happiness signal here is always a direct response to that question
          state.happyConfirmed = true
          state.clientApproachAsked = true
          state.movingForwardAsked = true
          const mfQuestion = await getMovingForwardQuestion(conversationHistory)
          return sendQuestion(mfQuestion, state)
        }
        // else: follow-up question, or multi-turn conversation — fall through to AI
        // without setting clientApproachAsked so the same check runs again next turn
      }

      // Alternatives path — detect when advisor confirms an alternative → fire Moving Forward
      if (state.clientApproachAsked && !state.happyConfirmed && !state.movingForwardAsked) {
        const confirmsAlternative = /\b(yes|yeah|yep|great|perfect|that works|sounds good|let.?s run|run with|that.?s better|looks better|go with|happy with|that.?ll do|good idea|let.?s go|makes sense|that.?s right|that one)\b/i
        if (confirmsAlternative.test(query)) {
          state.happyConfirmed = true
          state.movingForwardAsked = true
          const mfQuestion = await getMovingForwardQuestion(conversationHistory)
          return sendQuestion(mfQuestion, state)
        }
      }

      // Phase 4 — response to Moving Forward question
      if (state.movingForwardAsked && !state.movingForwardDone) {
        state.movingForwardDone = true
        const noPattern = /\b(no|nope|nah|not now|not right now|i.?m fine|i.?m good|got it|ready to go|all good|i.?ll be fine|that.?s all|all done|i.?m done|that.?ll do|i.?m good to go|good to go)\b/i
        if (noPattern.test(query)) {
          state.conversationComplete = true
          return sendQuestion("You're ready to go. Good luck with it.", state)
        }
        // Yes — fall through to AI to help prepare talking points / framing
      }

      // After AI delivered Moving Forward help — close cleanly on advisor sign-off
      if (state.movingForwardHelped) {
        const signOffPattern = /\b(thanks|thank you|cheers|great|perfect|looks good|that.?s great|that.?ll do|got it|appreciate|brilliant|all good|wonderful|lovely)\b/i
        if (signOffPattern.test(query)) {
          state.conversationComplete = true
          return sendQuestion("You're ready to go. Good luck with it.", state)
        }
      }

      // AI handles: either alternatives exploration or client approach guidance
      const contextMsgPost = buildClientContext(orgTemplateIds, query, { advisorProfile })

      const messagesPost = [
        { role: 'user', content: contextMsgPost },
        { role: 'assistant', content: OPENING_MSG.client },
        ...conversationHistory,
        { role: 'user', content: query }
      ]

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      })
      if (res.socket) res.socket.setNoDelay(true)

      const streamPost = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1500,
        stream: true,
        messages: [{ role: 'system', content: loadPrompt('client') }, ...messagesPost]
      })

      try {
        for await (const chunk of streamPost) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) res.write('data: ' + JSON.stringify({ type: 'delta', text }) + '\n\n')
          if (chunk.choices[0]?.finish_reason === 'stop') {
            if (state.movingForwardDone && !state.movingForwardHelped) {
              state.movingForwardHelped = true
            }
            state.postRecAiResponses = (state.postRecAiResponses || 0) + 1
            res.write('data: ' + JSON.stringify({ type: 'state', state }) + '\n\n')
            res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
          }
        }
      } catch (streamErr) {
        console.error('[advisor] Post-rec stream error:', streamErr.message)
        if (!res.writableEnded) {
          try { res.write('data: ' + JSON.stringify({ type: 'error', message: 'Stream interrupted' }) + '\n\n') } catch (e) {}
        }
      } finally {
        if (!res.writableEnded) res.end()
      }
      return
    }

    // ── PHASE 3 — all questions done, call AI for first recommendation ──
    state.readyForRecommendation = true
    state.recommendationDelivered = true

    // Build a summary of collected answers for the AI
    const collectedAnswers = [
      `Opening situation: ${(conversationHistory.find(m => m.role === 'user') || { content: query }).content}`,
      state.clientRaisedIssue && state.clientRaisedIssue !== 'pending' ? `Whether client raised it: ${state.clientRaisedIssue}` : '',
      // Profit scenario answers
      state.profitSituation && state.usesReports && state.usesReports !== 'pending' ? `Uses management reports: ${state.usesReports}` : '',
      state.profitSituation && state.wouldBenefitFromReview && state.wouldBenefitFromReview !== 'pending' ? `Would benefit from profit driver review: ${state.wouldBenefitFromReview}` : '',
      state.profitSituation && state.industry && state.industry !== 'pending' ? `Industry: ${state.industry}` : '',
      // Staff scenario answers
      state.staffSituation && state.staffScope && state.staffScope !== 'pending' ? `Staff issue scope (individual vs team): ${state.staffScope}` : '',
      state.staffSituation && state.staffOrigin && state.staffOrigin !== 'pending' ? `Staff issue origin (event vs gradual): ${state.staffOrigin}` : '',
      state.staffSituation && state.staffCategory && state.staffCategory !== 'pending' ? `Staff issue category (employment law vs team improvement): ${state.staffCategory}` : '',
      // Data/Systems scenario answers
      state.dataSystemsSituation && state.dataSystemsChartAccounts && state.dataSystemsChartAccounts !== 'pending' ? `Chart of accounts / break-even / working capital: ${state.dataSystemsChartAccounts}` : '',
      state.dataSystemsSituation && state.dataSystemsTeam && state.dataSystemsTeam !== 'pending' ? `Admin and accounting team: ${state.dataSystemsTeam}` : '',
      state.dataSystemsSituation && state.dataSystemsComplexity && state.dataSystemsComplexity !== 'pending' ? `Complexity vs technology issue: ${state.dataSystemsComplexity}` : '',
      // Sales/Marketing scenario answers
      state.salesMarketingSituation && state.salesDiagnosis && state.salesDiagnosis !== 'pending' ? `Sales volume vs profitability diagnosis: ${state.salesDiagnosis}` : '',
      state.salesMarketingSituation && state.salesTracking && state.salesTracking !== 'pending' ? `Conversion tracking: ${state.salesTracking}` : '',
      state.salesMarketingSituation && state.salesProductFit && state.salesProductFit !== 'pending' ? `Product fit assessment: ${state.salesProductFit}` : '',
      // Forecasting scenario answer (droptab selection)
      state.forecastingSituation && state.forecastingTheme && state.forecastingTheme !== 'pending' ? `Selected financial management theme: ${state.forecastingTheme}` : '',
      // Shared Phase 1 answers
      state.ownership && state.ownership !== 'pending' ? `Business ownership: ${state.ownership}` : '',
      state.growthStage && state.growthStage !== 'pending' ? `Growth stage: ${state.growthStage}` : '',
      state.acumen && state.acumen !== 'pending' ? `Business acumen: ${state.acumen}` : '',
      state.academic && state.academic !== 'pending' ? `Academic vs instinctive: ${state.academic}` : '',
      state.trust && state.trust !== 'pending' ? `Relationship/trust: ${state.trust}` : '',
      state.clientPersonality && state.clientPersonality !== 'pending' ? `Client personality/style: ${state.clientPersonality}` : '',
      state.engagementHistory && state.engagementHistory !== 'pending' ? `Engagement history: ${state.engagementHistory}` : '',
      state.advisorExperience && state.advisorExperience !== 'pending' ? `Advisor experience: ${state.advisorExperience}` : '',
      state.advisorConfidence && state.advisorConfidence !== 'pending' ? `Advisor confidence: ${state.advisorConfidence}` : ''
    ].filter(Boolean).join('\n')

    const profitInstruction = state.profitSituation && state.industry && state.industry !== 'pending'
      ? `\n\nPROFIT SITUATION: This client has a profitability/cost problem. Their industry is: ${state.industry}.

Your recommendation MUST include a revenue model or what-if analysis template from the provided template list. Rules:
- Only recommend templates that exist in the provided list — do NOT invent, adapt, or combine template names
- Select the closest real revenue model or what-if analysis template available, exactly as named in the list
- In the "How to approach it" section, explain specifically how the advisor should apply that template in the context of the ${state.industry} industry
- Do not append the industry name to the template name (e.g. do not write "Scaffolding Revenue Model" if the template is simply called "Revenue Model")`
      : ''

    const staffInstruction = state.staffSituation && state.staffCategory && state.staffCategory !== 'pending'
      ? `\n\nSTAFF SITUATION: This is a staff/team issue. Use the three diagnostic answers to shape the recommendation:
- Scope (individual vs team): ${state.staffScope}
- Origin (event-driven vs gradual): ${state.staffOrigin}
- Category: ${state.staffCategory}

If the category indicates a potential employment law matter: you MUST flag clearly that this may require an HR or legal specialist before any advisory template is used. However, if the scope indicates one or two specific employees, you may also suggest a Performance Improvement Plan — this is available in the Advisor-e library under Get Organised / Team Coaching & Culture.
If the category indicates team and leadership improvement: tailor the recommendation to match the scope (individual vs whole team) and the origin (event-driven vs gradual development). Solutions may be up to 4 templates if required. Refer to the People Power Template to guide suggestions.`
      : ''

    const dataSystemsInstruction = state.dataSystemsSituation && state.dataSystemsChartAccounts && state.dataSystemsChartAccounts !== 'pending'
      ? `\n\nDATA INTEGRITY / FINANCIAL SYSTEMS SITUATION: Use the three diagnostic answers to shape the recommendation:
- Chart of accounts / break-even / working capital: ${state.dataSystemsChartAccounts}
- Admin and accounting team: ${state.dataSystemsTeam}
- Complexity vs technology issue: ${state.dataSystemsComplexity}

If the answer to (a) indicates poor understanding or non-use of any of the three points (chart of accounts, break-even, working capital): ensure templates related to those specific topics are included. The final solution may include 4 or 5 templates if necessary.
If the team answer indicates lack of experience or education in accounting: the recommendation may also include the Accounting Best Practices section.
If the complexity/technology answer indicates software issues AND the business is at Leverage, Reach, Leapfrog, or Maturity on the Growth Curve: the recommendation may also include the Financial Systems Review.`
      : ''

    const salesMarketingInstruction = state.salesMarketingSituation && state.salesDiagnosis && state.salesDiagnosis !== 'pending'
      ? `\n\nSALES / MARKETING SITUATION: Use the three diagnostic answers to shape the recommendation:
- Sales volume vs profitability diagnosis: ${state.salesDiagnosis}
- Conversion tracking: ${state.salesTracking}
- Product fit assessment: ${state.salesProductFit}

If the diagnosis answer indicates the client does not know whether their issue is sales volume or profitability: suggest the Customer Journey template to create clarity first.
If the client has problems with sales volume or conversion: for smaller businesses or where the advisor is newer to this topic, suggest Lite Sales. If the business is more complex, the owner is more open to input, and the advisor is more experienced, suggest the Sales & Marketing Review. The final solution may include up to 4 or 5 templates if necessary.
If the tracking answer indicates the client does not track any conversion data or does a poor job of it: suggest Lite Marketing together with the 8 Profit Levers.
If the product fit answer indicates a product fit issue: refer to pages 7–9 (Product Fit section) of the Sales & Marketing Review template.

SALES & MARKETING REVIEW — FRAMEWORK INDEX (for reference when recommending specific sections):
${formatSalesMarketingSlides()}`
      : ''

    const forecastingInstruction = state.forecastingSituation && state.forecastingTheme && state.forecastingTheme !== 'pending'
      ? `\n\nFORECASTING / MANAGEMENT REPORTING SITUATION: The advisor has selected the following theme from the Financial Management Table:
Selected theme: ${state.forecastingTheme}

Use this theme to drive the recommendation:
- The "My recommendation" section: recommend the template mapped to this theme as the primary template.
- The "Why this fits your client" section: reference the problem description of the selected theme.
- The "How to approach it" section: frame the approach using the solution description for that theme.
- Do NOT recommend templates outside the theme's suggested template unless there is a clear secondary need from Phase 2 answers.

FINANCIAL MANAGEMENT TABLE — all themes for reference:
${formatFinMgtTable()}`
      : ''

    const profileNote = advisorProfile
      ? `\n\nADVISOR PROFILE: ${formatAdvisorProfile(advisorProfile)}\nUse this profile in place of Phase 2 answers when writing "Why this suits you as the advisor".`
      : ''

    // Override query with the collected answers summary for the AI recommendation call
    const recommendationQuery = `Here is everything collected about the client and situation:\n\n${collectedAnswers}${profitInstruction}${staffInstruction}${dataSystemsInstruction}${salesMarketingInstruction}${forecastingInstruction}${profileNote}\n\nNow produce the Phase 3 recommendation.`

    // Fall through to AI call for Phase 3 recommendation
    const languageInstruction2 = language !== 'en'
      ? `\n\nIMPORTANT: Always respond entirely in ${languageName}.`
      : ''

    const matchedTree = detectLogicTree(firstMsg)
    const contextMsg2 = buildClientContext(orgTemplateIds, collectedAnswers, {
      includeSummaries: true,
      logicTree: matchedTree,
      includeGrowthStage: state.growthStage && state.growthStage !== 'pending' ? state.growthStage : null,
      includeSectionDesc: true,
      maxTemplates: 40
    })

    const systemPrompt2 = loadPrompt('client') + languageInstruction2

    const messages2 = [
      { role: 'user', content: contextMsg2 },
      { role: 'assistant', content: OPENING_MSG.client },
      { role: 'user', content: recommendationQuery }
    ]

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    })
    if (res.socket) res.socket.setNoDelay(true)

    const stream2 = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      stream: true,
      messages: [{ role: 'system', content: systemPrompt2 }, ...messages2]
    })

    try {
      for await (const chunk of stream2) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) res.write('data: ' + JSON.stringify({ type: 'delta', text }) + '\n\n')
        if (chunk.choices[0]?.finish_reason === 'stop') {
          res.write('data: ' + JSON.stringify({ type: 'state', state }) + '\n\n')
          res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
        }
      }
    } catch (streamErr) {
      console.error('[advisor] Phase 3 stream error:', streamErr.message)
      if (!res.writableEnded) {
        try { res.write('data: ' + JSON.stringify({ type: 'error', message: 'Stream interrupted' }) + '\n\n') } catch (e) {}
      }
    } finally {
      if (!res.writableEnded) res.end()
    }
    return
  }

  const languageInstruction = language !== 'en'
    ? `\n\nIMPORTANT: The advisor is using the ${languageName} interface. Always respond entirely in ${languageName}, regardless of what language the advisor writes in.`
    : ''
  const orgTemplates = getOrgTemplates(orgTemplateIds || null)
  const primarySections = MODE_SECTIONS[mode] || null

  let templatesToUse
  if (primarySections) {
    // Always include all primary-section templates so the AI has full coverage of
    // the mode's core area, then top-up with query-matched templates from other
    // sections so cross-section needs (e.g. plan → sell) are catered for.
    const primary = orgTemplates.filter(t => primarySections.includes(t.menuSection))
    const other = orgTemplates.filter(t => !primarySections.includes(t.menuSection))
    const crossSection = filterTemplatesByQuery(other, query, 10)
    templatesToUse = [...primary, ...crossSection]
  } else {
    const relevant = filterTemplatesByQuery(orgTemplates, query, 25)
    templatesToUse = relevant.length > 0 ? relevant : orgTemplates.slice(0, 25)
  }

  const templatesText = formatTemplatesForPrompt(templatesToUse)

  // Trim conversation history to prevent context bloat in long sessions.
  // 20 messages (~10 rounds) preserves enough context for recommendation quality
  // while keeping prompt size reasonable.
  const trimmedHistory = conversationHistory.length > 20
    ? conversationHistory.slice(-20)
    : conversationHistory

  // Coaching reference: only needed when approaching or making a recommendation.
  // Discover mode always needs it (first response IS a recommendation).
  // Other modes: defer until conversation is deep enough (4+ exchanges).
  const includeCoaching = mode === 'discover' || trimmedHistory.length >= 4
  const coachingText = includeCoaching ? formatCoachingForPrompt() : null

  // Use gpt-4o-mini throughout — fast and more than capable for conversational Q&A.
  // Only switch to gpt-4o for the final recommendation (deep conversation, 10+ messages).
  const model = trimmedHistory.length < 10 ? 'gpt-4o-mini' : 'gpt-4o'

  // Summaries only apply to Do the Job templates — skip for plan/learn modes.
  // Also defer until conversation is deep enough to be approaching a recommendation.
  const summariesApply = mode === 'client' || mode === 'discover'
  const relevantSummaries = summariesApply && trimmedHistory.length >= 6 ? filterSummariesByQuery(query, 10) : []
  const summariesText = formatSummariesForPrompt(relevantSummaries)

  const advisorProfileText = advisorProfile ? formatAdvisorProfile(advisorProfile) : null
  const profileSystemInstruction = advisorProfileText
    ? '\n\nADVISOR PROFILE PRE-SUPPLIED: Use the profile in the context when writing the "Why this suits you as the advisor" section.'
    : ''

  const basePrompt = loadPrompt(mode) || loadPrompt('client')
  const systemPrompt = basePrompt + profileSystemInstruction + languageInstruction

  function formatCaseSummaries (cases) {
    if (!cases || cases.length === 0) return null
    const lines = ['## Past Case Studies']
    lines.push('')
    lines.push('These are real sessions saved by advisors in your firm. Reference them where relevant to show pattern recognition and build on prior experience — but only if genuinely applicable. Do not force references.')
    lines.push('')
    cases.forEach(c => {
      const date = c.date ? new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
      const scope = c.visibility === 'shared' ? 'Shared with firm' : 'Advisor\'s own'
      lines.push(`### ${c.title} (${date} · ${scope})`)
      lines.push(c.summary || '')
      if (c.review) {
        lines.push('')
        lines.push('**Post-delivery review (what actually happened when this was delivered to a real client):**')
        if (c.review.wentWell) lines.push(`✓ Went well: ${c.review.wentWell}`)
        if (c.review.wentLess) lines.push(`⚠ Could have been better: ${c.review.wentLess}`)
        if (c.review.changesRecommended) lines.push(`→ Recommended changes: ${c.review.changesRecommended}`)
      }
      lines.push('')
    })
    return lines.join('\n')
  }

  // Case studies are only relevant in client and discover modes
  const caseSummariesText = (mode === 'client' || mode === 'discover') ? formatCaseSummaries(caseContext) : null

  // Learn mode logic trees — detect from conversation for sales_process and public_speaking trees
  let learnSalesTreeText = null
  if (mode === 'learn') {
    const allLearnMessages = [...trimmedHistory.map(m => m.content), query].join(' ')
    const learnTree = detectLogicTree(allLearnMessages)
    if (learnTree && learnTree.mode === 'learn') {
      learnSalesTreeText = buildLearnReferenceText(learnTree)
    }
  }

  // Deep-dive detection — client/discover mode only.
  // If the conversation has drifted into territory covered by a learn-mode tree, load that
  // tree's full reference content and signal the AI to offer a structured deep dive.
  let deepDiveText = null
  if (mode === 'client' || mode === 'discover') {
    const allConversationText = [...trimmedHistory.map(m => m.content), query].join(' ')
    const deepDiveTree = detectLogicTree(allConversationText)
    if (deepDiveTree && deepDiveTree.mode === 'learn') {
      deepDiveText = buildLearnReferenceText(deepDiveTree)
    }
  }

  // Include Growth Fundamentals reference once the advisor has selected a growth stage
  const includeGrowth = mode === 'client' && conversationHasGrowthStage(trimmedHistory)
  const growthText = includeGrowth ? formatGrowthFundamentalsForPrompt(trimmedHistory) : null

  // Section descriptions always included for client/discover modes so AI can tier-match from the start
  const sectionDescText = (mode === 'client' || mode === 'discover') ? formatSectionDescriptionsForPrompt() : null

  const contextMessage = [
    `## Available Templates for This Organisation (${templatesToUse.length} most relevant shown)`,
    '',
    templatesText,
    sectionDescText ? '\n---\n\n' + sectionDescText : '',
    coachingText
      ? '\n---\n\n## Coaching Reference — Expert Guidance on Template Selection\n\n' + coachingText
      : '',
    growthText ? '\n---\n\n' + growthText : '',
    summariesText ? '\n---\n\n## Detailed Template Summaries — Purpose, Indicators & Delivery Guidance\n\n' + summariesText : '',
    advisorProfileText
      ? '\n---\n\n## Advisor Profile (pre-supplied)\n\nThis advisor has already provided their background. Do not ask the Phase 2 questions — skip directly from Phase 1 to Phase 3 once you have a clear enough picture of the client. Reference the profile below in your recommendation exactly as you would answers given in conversation.\n\n' + advisorProfileText
      : '',
    caseSummariesText ? '\n---\n\n' + caseSummariesText : '',
    learnSalesTreeText ? '\n---\n\n' + learnSalesTreeText : '',
    deepDiveText
      ? '\n---\n\n## Deep Dive Reference Material\n\nThe conversation has touched on a topic that has structured how-to coaching content available. This material is provided below.\n\nAfter delivering your Phase 3 recommendation (or at the natural point when this topic has been identified), close with:\n"Would you like to do a deep dive on this material and explore how you can use it with your client in a meeting?"\n\nIf they say yes, use the reference content below to coach them through it step by step — walking them through each stage as you would in a structured coaching session.\n\n' + deepDiveText
      : ''
  ].join('\n')

  // PHASE 2 INTERCEPT — fires before the AI runs.
  // If a profile exists and the last AI message was a Phase 2 question, return a
  // hardcoded bridge response directly — AI never runs for this turn.
  // Only applies to client/discover modes — never learn/plan (those modes ask different
  // questions that would otherwise match Phase 2 patterns and short-circuit the conversation).
  if (advisorProfileText && trimmedHistory.length > 0 && (mode === 'client' || mode === 'discover')) {
    const lastAssistant = [...trimmedHistory].reverse().find(m => m.role === 'assistant')
    const phase2Patterns = [
      'how long have you been delivering',
      'how long have you been',
      'are you comfortable using tools',
      'comfortable using tools and frameworks',
      'how confident do you feel',
      'what kinds of advisory conversations',
      'delivered anything like this to a client before',
      'delivered similar content to this client',
      'how confident are you',
      'tell me a bit about yourself as the advisor',
      'tell me about yourself as the advisor'
    ]
    const isPhase2Question = lastAssistant && phase2Patterns.some(p => lastAssistant.content.toLowerCase().includes(p))
    if (isPhase2Question) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      })
      res.write('data: ' + JSON.stringify({ type: 'delta', text: 'Your advisor profile covers that — here\'s my recommendation.' }) + '\n\n')
      res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
      res.end()
      return
    }
  }

  const messages = [
    { role: 'user', content: contextMessage },
    { role: 'assistant', content: OPENING_MSG[mode] || OPENING_MSG.client },
    ...trimmedHistory,
    { role: 'user', content: query }
  ]

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  // Disable Nagle's algorithm so each SSE chunk is sent immediately
  if (res.socket) {
    res.socket.setNoDelay(true)
  }

  const stream = await getOpenAI().chat.completions.create({
    model,
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  })

  try {
    for await (const chunk of stream) {
      const text = chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content
        ? chunk.choices[0].delta.content
        : ''
      if (text) {
        res.write('data: ' + JSON.stringify({ type: 'delta', text }) + '\n\n')
      }
      if (chunk.choices[0] && chunk.choices[0].finish_reason) {
        res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
      }
    }
  } catch (streamErr) {
    console.error('[advisor] Stream error:', streamErr.message)
    if (!res.writableEnded) {
      try { res.write('data: ' + JSON.stringify({ type: 'error', message: 'Stream interrupted' }) + '\n\n') } catch (e) {}
    }
  } finally {
    if (!res.writableEnded) res.end()
  }
}
