/**
 * Nuxt 2 server middleware — handles POST /api/advisor/query
 *
 * Calls OpenAI directly using the local data files.
 * When the Restify backend is ready, this can be replaced with a proxy.
 * See server/restify-route.js for the Restify implementation reference.
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const OpenAI = require('openai')
const { getOrgTemplates, filterTemplatesByQuery, formatTemplatesForPrompt } = require('../server/utils/templates')
const { formatCoachingForPrompt } = require('../server/utils/coaching')
const { filterSummariesByQuery, getSummariesForTemplateNames, formatSummariesForPrompt, formatSectionDescriptionsForPrompt } = require('../server/utils/summaries')
const { formatGrowthFundamentalsForPrompt, conversationHasGrowthStage } = require('../server/utils/growth')
const { detectLogicTree, detectLogicTrees, formatLogicTreeForPrompt, buildLearnReferenceText } = require('../server/utils/logicTrees')
const { formatDomainSupportForPrompt } = require('../server/utils/domainSupport')
const { sanitiseInput } = require('../server/utils/sanitiseInput')
const { sendError } = require('../server/utils/sendError')
const { injectVideoInfo } = require('../server/utils/videoInjector')
const { extractTemplatesFromText } = require('../server/utils/tierLookup')
const { logVASession } = require('../server/utils/activityLogger')

// Reference data for scenario-specific Phase 3 instructions
const FIN_MGT_TABLE = require('../data/fin-mgt-table.json')
const SALES_MARKETING_SLIDES = require('../data/sales-marketing-slides.json')
const DOMAINS = require('../data/domains.json')

// Build detection patterns from domain definitions — compiled once at startup
const DOMAIN_PATTERNS = DOMAINS.map(d => ({
  id: d.id,
  label: d.label,
  pattern: new RegExp(d.keywords, 'gi'),
  disambigPattern: new RegExp(d.disambiguationKeywords, 'i')
}))

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

const { loadPrompt } = require('../server/utils/promptLoader')
const { createLimiter } = require('./rateLimit')

const checkAdvisorLimit = createLimiter(30)

// ── Server-side session store ──────────────────────────────────────────────
// Conversation state lives here — the client never sees it.
// Single-process only; replace Map with Redis for multi-process deployments.
const SESSION_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
const sessionStore = new Map()

function sessionCreate () {
  const id = crypto.randomBytes(16).toString('hex')
  sessionStore.set(id, { state: null, lastActivity: Date.now() })
  return id
}

function sessionGet (id) {
  if (!id) { return null }
  const entry = sessionStore.get(id)
  if (!entry) { return null }
  if (Date.now() - entry.lastActivity > SESSION_TTL_MS) {
    sessionStore.delete(id)
    return null
  }
  entry.lastActivity = Date.now()
  return entry.state
}

function sessionSave (id, state) {
  const entry = sessionStore.get(id)
  if (entry) {
    entry.state = state
    entry.lastActivity = Date.now()
  } else {
    sessionStore.set(id, { state, lastActivity: Date.now() })
  }
}

setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS
  for (const [k, v] of sessionStore) {
    if (v.lastActivity < cutoff) { sessionStore.delete(k) }
  }
}, 15 * 60 * 1000).unref()

let _loadFirmConfig = null
function loadFirmConfig (...args) {
  if (!_loadFirmConfig) { _loadFirmConfig = require('../server/utils/firmOverlay').loadFirmConfig }
  return _loadFirmConfig(...args)
}

// ── Startup checks ──
// Validate critical env vars and required files before any request arrives.
;(function startupCheck () {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[advisor] FATAL: OPENAI_API_KEY is not set — all advisor requests will fail.')
  } else {
    const k = process.env.OPENAI_API_KEY
    console.log('[advisor] OPENAI_API_KEY loaded — last 8 chars: ...' + k.slice(-8))
  }
  const REQUIRED_PROMPTS = ['client', 'discover', 'plan', 'learn']
  for (const name of REQUIRED_PROMPTS) {
    const p = path.resolve(process.cwd(), 'data/prompts', name + '.txt')
    if (!fs.existsSync(p)) {
      console.error(`[advisor] STARTUP WARNING: required prompt file missing: ${p}`)
    }
  }
})()

const OPENING_MSG = {
  client: 'What is the core problem or opportunity you want to address with this client?',
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
  if (profile.advisorRole && profile.advisorRole.trim()) { lines.push(`Advisor role / practice type: ${profile.advisorRole.trim()}`) }
  if (profile.experience && profile.experience.trim()) { lines.push(`Experience: ${profile.experience.trim()}`) }
  if (profile.clientDemographic && profile.clientDemographic.trim()) { lines.push(`Typical client profile: ${profile.clientDemographic.trim()}`) }
  if (profile.enjoyment && profile.enjoyment.trim()) { lines.push(`Advisory conversations they enjoy most: ${profile.enjoyment.trim()}`) }
  if (profile.technicalStrengths && profile.technicalStrengths.trim()) { lines.push(`Challenges / hesitations / development areas: ${profile.technicalStrengths.trim()}`) }
  if (profile.toolsComfort && profile.toolsComfort.trim()) { lines.push(`Comfort with tools and frameworks: ${profile.toolsComfort.trim()}`) }
  if (profile.notes && profile.notes.trim()) { lines.push(`Additional context: ${profile.notes.trim()}`) }
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

  const _t0mf = Date.now()
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
    logAI('moving-forward', 'gpt-4o-mini', _t0mf, true, response.usage)
    const returned = (response.choices[0]?.message?.content || '').trim()
    return MOVING_FORWARD_OPTIONS.find(q => returned.includes(q.slice(0, 20))) || MOVING_FORWARD_OPTIONS[0]
  } catch (e) {
    logAI('moving-forward', 'gpt-4o-mini', _t0mf, false, null)
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
    logicTrees = null,
    maxTemplates = 25,
    excludeSections = [],
    firmTemplates = null
  } = options || {}

  const orgTemplates = getOrgTemplates(orgTemplateIds || null, firmTemplates)
    .filter(t => excludeSections.length === 0 || !excludeSections.includes(t.menuSection))
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
    const treesArray = Array.isArray(logicTrees) ? logicTrees : (logicTree ? [logicTree] : [])
    const treeTemplateNames = treesArray.flatMap(t => (t.nodes || []).filter(n => n.type === 'recommendation').flatMap(n => n.templates || []))
    const treeSummaries = getSummariesForTemplateNames(treeTemplateNames)
    const summaryMap = new Map()
    for (const s of [...querySummaries, ...treeSummaries]) {
      if (!summaryMap.has(s.name)) { summaryMap.set(s.name, s) }
    }
    const summariesToUse = Array.from(summaryMap.values()).slice(0, 25)
    summariesText = summariesToUse.length > 0
      ? `## Template Content Summaries (${summariesToUse.length} most relevant)\n\nUse these for Phase 3. Each entry contains: Purpose, When to use, Helps the owner, Helps the advisor.\n\n` + formatSummariesForPrompt(summariesToUse)
      : null
  }

  // Logic trees — diagnostic pathways that led to this situation
  const treesForPrompt = Array.isArray(logicTrees) ? logicTrees : (logicTree ? [logicTree] : [])
  const logicTreeText = treesForPrompt.length > 0
    ? treesForPrompt.map(t => formatLogicTreeForPrompt(t)).join('\n\n---\n\n')
    : null

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
let _dbgBytesWritten = 0
function dbg (msg) {
  if (!process.env.VA_DEBUG) { return }
  if (_dbgBytesWritten >= _dbgMaxBytes) { return }
  try {
    const line = new Date().toISOString() + ' ' + msg + '\n'
    fs.appendFileSync(_dbgLog, line)
    _dbgBytesWritten += Buffer.byteLength(line)
  } catch (e) {}
}

// Logs a completed OpenAI call to stderr for operational monitoring.
// Always on (not gated by VA_DEBUG) — lightweight, one line per call.
function logAI (label, model, startTime, success, usage) {
  const latency = Date.now() - startTime
  const tokens = usage
    ? `prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`
    : 'tokens=unknown'
  console.error(`[openai] ${label} model=${model} status=${success ? 'ok' : 'error'} latency=${latency}ms ${tokens}`)
}

const BODY_LIMIT = 256 * 1024 // 256 KB — protects against memory-exhaustion DoS

module.exports = function advisorMiddleware (req, res, next) {
  dbg('MW: method=' + req.method + ' url=' + req.url)
  if (req.method !== 'POST' || req.url !== '/query') {
    return next()
  }

  if (!checkAdvisorLimit(req, res)) { return }

  let body = ''
  let bodySize = 0
  let bodyRejected = false

  req.on('error', (err) => {
    console.error('[advisor] Request socket error:', err.message)
    sendError(res, 400, 'REQUEST_ERROR', 'Request error')
  })

  req.on('data', (chunk) => {
    if (bodyRejected) { return }
    bodySize += chunk.length
    if (bodySize > BODY_LIMIT) {
      bodyRejected = true
      sendError(res, 413, 'BODY_TOO_LARGE', 'Request body too large')
      req.socket && req.socket.destroy()
      return
    }
    body += chunk.toString('utf8')
  })

  req.on('end', () => {
    if (bodyRejected) { return }
    handleQuery(body, res).catch((err) => {
      console.error('[advisor] Unhandled error:', err.message)
      if (!res.headersSent) {
        sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error')
      } else if (!res.writableEnded) {
        try { res.write('data: ' + JSON.stringify({ type: 'error', message: 'Server error' }) + '\n\n') } catch (e) {}
        try { res.end() } catch (e) {}
      }
    })
  })
}

function formatCaseSummaries (cases) {
  if (!cases || cases.length === 0) { return null }
  const lines = ['## Past Case Studies']
  lines.push('')
  lines.push('These are real sessions saved by advisors in your firm. Reference them where relevant to show pattern recognition and build on prior experience — but only if genuinely applicable. Do not force references.')
  lines.push('')
  cases.forEach((c) => {
    const date = c.date ? new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    const scope = c.visibility === 'shared' ? 'Shared with firm' : 'Advisor\'s own'
    lines.push(`### ${c.title} (${date} · ${scope})`)
    lines.push(c.summary || '')
    if (c.review) {
      lines.push('')
      lines.push('**Post-delivery review (what actually happened when this was delivered to a real client):**')
      if (c.review.wentWell) { lines.push(`✓ Went well: ${c.review.wentWell}`) }
      if (c.review.wentLess) { lines.push(`⚠ Could have been better: ${c.review.wentLess}`) }
      if (c.review.changesRecommended) { lines.push(`→ Recommended changes: ${c.review.changesRecommended}`) }
    }
    lines.push('')
  })
  return lines.join('\n')
}

async function handleQuery (rawBody, res) {
  let parsed
  try {
    parsed = JSON.parse(rawBody)
  } catch (e) {
    sendError(res, 400, 'INVALID_JSON', 'Invalid JSON')
    return
  }

  const sanitised = sanitiseInput(parsed)
  if (!sanitised) {
    sendError(res, 400, 'INVALID_REQUEST', 'Invalid request body')
    return
  }

  const {
    query,
    mode,
    orgTemplateIds,
    conversationHistory,
    advisorProfile,
    language,
    languageName,
    caseContext,
    sessionId: incomingSessionId,
    advisorId,
    firmId
  } = sanitised

  const ALLOWED_MODES = ['client', 'discover', 'plan', 'learn']
  if (!ALLOWED_MODES.includes(mode)) {
    sendError(res, 400, 'INVALID_MODE', 'Invalid mode')
    return
  }

  // Load firm-specific template override once per request — null if none saved
  const firmTemplates = firmId
    ? await loadFirmConfig(firmId, 'templates').catch(() => null)
    : null

  if (!query || !query.trim()) {
    sendError(res, 400, 'QUERY_REQUIRED', 'Query is required')
    return
  }

  // ─────────────────────────────────────────────────────────────────
  // CLIENT MODE SEQUENCER
  // Code controls the question sequence entirely.
  // AI is only called for Phase 3 recommendation.
  // ─────────────────────────────────────────────────────────────────
  if (mode === 'client') {
    let sessionId = incomingSessionId
    const storedState = sessionGet(sessionId)

    const state = Object.assign({
      // Detection — active domain ID (one of 14 domain ids, or null)
      detectedDomain: null,
      disambiguationNeeded: false,
      disambiguationScenarios: [],
      // Universal questions
      disambiguationAnswer: null,
      clientRaisedIssue: false,
      situationDiagnostic: null,
      // Profit scenario questions
      usesReports: false,
      reportsFromFirm: null,
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
      operatorDataDriven: null,
      operatorPlanning: null,
      operatorFinancialLiteracy: null,
      clientMotivation: null,
      advisoryStaircase: null,
      clientPersonality: null,
      // Phase 2 questions
      advisorExperience: null,
      advisorConfidence: null,
      advisorEnjoyment: null,
      advisorTimeframe: null,
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
    }, storedState || {})

    // Always re-detect domain from the first user message.
    // Score all 14 domains by keyword match count. Most matches wins.
    // On a tie between any two or more, ask disambiguation.

    const detectionWindow = conversationHistory.length > 0
      ? conversationHistory.filter(m => m.role === 'user').slice(0, 4).map(m => m.content).concat(query).join(' ')
      : query
    const domainScores = DOMAIN_PATTERNS.map(d => ({
      id: d.id,
      label: d.label,
      count: (detectionWindow.match(d.pattern) || []).length
    })).filter(d => d.count > 0)

    // Helper: set the active domain, clear disambiguation state
    function setDetectedDomain (id) {
      state.detectedDomain = id
    }

    // Lock domain once resolved — only re-score on the very first turn or if disambiguation is still pending
    if (state.detectedDomain && !state.disambiguationNeeded) {
      // Domain already locked — skip re-detection entirely
    } else {
    // Reset detection state before re-scoring
    state.detectedDomain = null
    state.disambiguationNeeded = false
    state.disambiguationScenarios = []

    if (domainScores.length > 0) {
      const maxCount = Math.max(...domainScores.map(d => d.count))
      const topMatches = domainScores.filter(d => d.count === maxCount)

      if (topMatches.length === 1) {
        setDetectedDomain(topMatches[0].id)
      } else {
        // Genuine tie — disambiguation question fires after Q1
        state.disambiguationNeeded = true
        state.disambiguationScenarios = topMatches.map(d => ({ id: d.id, label: d.label }))
      }
    }
    } // end domain lock else

    // Helper: stream a hardcoded question directly to the client
    const sendQuestion = (text) => {
      if (sessionId) { sessionSave(sessionId, state) }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      })
      res.write('data: ' + JSON.stringify({ type: 'delta', text }) + '\n\n')
      res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
      res.end()
    }

    // ── INIT: create session, return opening question and session ID ──
    if (query === '__init__') {
      sessionId = sessionCreate()
      sessionSave(sessionId, state)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      })
      res.write('data: ' + JSON.stringify({ type: 'delta', text: 'What is the core problem or opportunity you want to address with this client?' }) + '\n\n')
      res.write('data: ' + JSON.stringify({ type: 'session', sessionId }) + '\n\n')
      res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
      res.end()
      return
    }

    // ── QUESTION PIPELINE ──
    // Full sequence of questions in order. Each has an optional skip() condition.
    // The sequencer asks the first unanswered, non-skipped question, then stops.
    const isNFPorPublic = s => s.ownership && /not.for.profit|nfp|non.profit|public|listed/i.test(s.ownership)

    const QUESTIONS = [
      {
        field: 'clientRaisedIssue',
        text: 'Has the client specifically requested help with this issue, or is it something you\'ve noticed?'
      },
      {
        field: 'situationDiagnostic',
        text: 'What do you feel contributed to this situation, and are there any downstream effects we should factor into the service offer?'
      },
      {
        field: 'disambiguationAnswer',
        textFn: (s) => {
          const scenarios = s.disambiguationScenarios || []
          if (scenarios.length === 2) {
            return `I'm picking up signals for both ${scenarios[0].label} and ${scenarios[1].label} in what you've described — which of these is the primary focus for this client?`
          }
          const list = scenarios.map(sc => sc.label).join(', ')
          return `I'm picking up signals across multiple areas — ${list}. Which would you say is the primary focus for this client?`
        },
        skip: s => !s.disambiguationNeeded,
        onAnswer: (answer, s) => {
          // Try each tied domain's disambiguation pattern against the advisor's answer
          const tiedIds = (s.disambiguationScenarios || []).map(sc => sc.id)
          const tiedPatterns = DOMAIN_PATTERNS.filter(d => tiedIds.includes(d.id))
          const matched = tiedPatterns.find(d => d.disambigPattern.test(answer))
          if (matched) {
            setDetectedDomain(matched.id)
          } else if (s.disambiguationScenarios && s.disambiguationScenarios.length > 0) {
            console.warn('[advisor] Disambiguation could not be resolved from answer; defaulting to domain:', s.disambiguationScenarios[0].id)
            setDetectedDomain(s.disambiguationScenarios[0].id)
          }
          s.disambiguationNeeded = false
        }
      },
      // ── Domain 1: Profitability / Feasibility ──
      {
        field: 'usesReports',
        text: 'Does the client use financial management reports on a regular basis?',
        skip: s => s.detectedDomain !== 'profit'
      },
      {
        field: 'reportsFromFirm',
        text: 'Are these financial reports generated and presented by you or a member of your firm?',
        skip: s => s.detectedDomain !== 'profit' || !s.usesReports || s.usesReports === 'pending' || !/\byes\b|already|\bthey do\b|\bwe do\b|regular|use them|have them/i.test(s.usesReports)
      },
      {
        field: 'wouldBenefitFromReview',
        text: 'Do you think the client could benefit from a detailed review of their business variables and profit drivers?',
        skip: s => s.detectedDomain !== 'profit' ||
          (s.usesReports && s.usesReports !== 'pending' && !/\byes\b|already|\bthey do\b|\bwe do\b|regular|use them|have them/i.test(s.usesReports))
      },
      {
        field: 'industry',
        text: 'What industry is the client in?',
        skip: s => s.detectedDomain !== 'profit'
      },
      // ── Domain 2: Staff ──
      {
        field: 'staffScope',
        text: 'Does this issue relate to one or two specific employees, or is it a wider team issue across the business?',
        skip: s => s.detectedDomain !== 'staff'
      },
      {
        field: 'staffOrigin',
        text: 'Has this issue surfaced in response to a specific event, or has it just developed over time — and if so, how long has it been building?',
        skip: s => s.detectedDomain !== 'staff'
      },
      {
        field: 'staffCategory',
        text: 'In your opinion, is this a potential employment law matter, or does it fall into the broader category of team and leadership improvement?',
        skip: s => s.detectedDomain !== 'staff'
      },
      // ── Domain 3: Data Integrity / Financial Systems ──
      {
        field: 'dataSystemsChartAccounts',
        text: 'Which of the following, if any, does the client currently utilise — (a) a chart of accounts aligned to business practices for reporting purposes, (b) knowledge of their break-even requirements, (c) comprehension of the Working Capital Cycle? Please speak to each of the three points.',
        skip: s => s.detectedDomain !== 'data-systems'
      },
      {
        field: 'dataSystemsTeam',
        text: 'Describe the staff numbers, experience and capabilities of the business admin and accounting team.',
        skip: s => s.detectedDomain !== 'data-systems'
      },
      {
        field: 'dataSystemsComplexity',
        text: 'In your opinion, is the issue related to the complexity of their business administration and technology/software shortfalls?',
        skip: s => s.detectedDomain !== 'data-systems'
      },
      // ── Domain 4: Sales & Marketing ──
      {
        field: 'salesDiagnosis',
        text: 'Has your client accurately determined if their key problem is lack of sales vs. the profitability from the sales they do make?',
        skip: s => s.detectedDomain !== 'sales-marketing'
      },
      {
        field: 'salesTracking',
        text: 'Does your client track the conversion ratio from prospect to customer or messaging campaign to prospects? If so — which of these and how do they record the data?',
        skip: s => s.detectedDomain !== 'sales-marketing'
      },
      {
        field: 'salesProductFit',
        text: "In your opinion, is the issue related to 'Product Fit' — is your client's product or service still competitive?",
        skip: s => s.detectedDomain !== 'sales-marketing'
      },
      // ── Domain 5: Financial Management — droptab ──
      {
        field: 'forecastingTheme',
        text: 'These themes reflect different levels of client awareness and readiness. Select the one that best describes where your client is starting from with financial management.\n[FIN_MGT_THEME_SELECTOR]',
        skip: s => s.detectedDomain !== 'forecasting'
      },
      // ── Domains 6–14: questions loaded from domains.json when populated ──
      ...DOMAINS.filter(d => d.questions && d.questions.length > 0).flatMap(d =>
        d.questions.map(q => ({
          field: q.field,
          text: q.text,
          skip: s => s.detectedDomain !== d.id
        }))
      ),
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
        field: 'advisoryStaircase',
        text: 'Where would you say your current engagement with this client sits on the Advisory Staircase?\n[STAIRCASE_SELECTOR]'
      },
      {
        field: 'operatorPlanning',
        text: 'Do they follow structured plans and act on them, or does the business tend to run day to day?',
        skip: (s) => {
          const raised = s.clientRaisedIssue && s.clientRaisedIssue !== 'pending' &&
            /requested|asked|raised|their own|they came|they want|want(ed)? (some |to |help|advice|ideas)|came to (me|us)|looking for|approached|seeking|\byes\b|\bthey did\b|\bit was them\b/i.test(s.clientRaisedIssue)
          const deepEngagement = s.advisoryStaircase && s.advisoryStaircase !== 'pending' && /Step [345]/i.test(s.advisoryStaircase)
          return raised || deepEngagement
        }
      },
      {
        field: 'clientPersonality',
        text: 'Are they light-hearted and open to being challenged, or more discerning and careful about how they receive advice?',
        skip: () => true // asked at start of approach phase instead, where it is actually needed
      },
      {
        field: 'advisorExperience',
        text: 'How long have you been delivering advisory work, and are you comfortable using tools and frameworks with clients?',
        skip: () => !!advisorProfile
      },
      {
        field: 'advisorConfidence',
        text: 'How confident do you feel about delivering services in this type of situation — is this familiar territory, or more of a stretch for you personally?'
      },
      {
        field: 'advisorEnjoyment',
        text: 'What kinds of advisory conversations do you enjoy most?',
        skip: () => !!advisorProfile
      },
      {
        field: 'advisorTimeframe',
        text: 'How many meetings are you comfortable committing to with this client, and over what timeframe?'
      }
    ]

    dbg('SEQUENCER: checking pipeline, detectedDomain=' + state.detectedDomain)

    // Guard: once recommendation is delivered, skip the pipeline entirely.
    // Without this, a post-rec turn can re-trigger disambiguation or any unanswered
    // question if domain re-detection produces a different score than the original turn.
    if (!state.recommendationDelivered) {
      for (const q of QUESTIONS) {
        if (q.skip && q.skip(state)) { continue }
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
          if (q.onAnswer) { q.onAnswer(query, state) }
        }
      }
    }

    // ── POST-RECOMMENDATION FLOW ──
    // If the AI has already delivered the Phase 3 recommendation, intercept the advisor's response
    if (state.recommendationDelivered) {
      // Hard stop — conversation is done, nothing further to process
      if (state.conversationComplete) {
        return sendQuestion("You're ready to go. Good luck with it. Come back any time — before the meeting if you want to prep further, or after if you'd like to debrief.", state)
      }

      if (!state.clientApproachAsked) {
        const wantsAlternatives = /\b(alternative|alternatives|different|other option|not sure|not happy|not convinced|something else|explore|prefer something|instead|not quite right|change|not right)\b/i
        const confirmsHappy = /\b(yes|yeah|yep|yep|looks good|look.*good|pretty good|good enough|that.?s great|that.?s fine|that.?s right|that.?s perfect|happy with that|happy with|i.?m happy|perfect|sounds good|love it|that works|that.?ll work|that.?ll do|that.?s good|brilliant|excellent|great suggestion|go with that|looks right|fair enough|alright|all right)\b/i

        // Guard: if the advisor is asking a question (how/what/tell me/can you), they
        // are following up — not confirming happiness. Fall through to AI regardless.
        const containsQuestion = /\b(how|what|why|tell me|can you|could you|would you|explain|show me|walk me)\b/i

        if (wantsAlternatives.test(query)) {
          // Advisor wants alternatives — fall through to AI, then re-check next turn
          state.clientApproachAsked = true
        } else if (confirmsHappy.test(query) && !containsQuestion.test(query)) {
          // Advisor confirms happy — fire Moving Forward
          // The AI always closes with "Are you happy with what I've suggested?" so a
          // happiness signal here is always a direct response to that question
          state.happyConfirmed = true
          state.clientApproachAsked = true
          state.movingForwardAsked = true
          logVASession(advisorId, firmId, state.detectedDomain, state.recommendedTemplates).catch(() => {})
          const mfQuestion = await getMovingForwardQuestion(conversationHistory)
          return sendQuestion(mfQuestion, state)
        }
        // else: follow-up question, or multi-turn conversation — fall through to AI
        // without setting clientApproachAsked so the same check runs again next turn
      }

      // Alternatives path — detect when advisor confirms an alternative → fire Moving Forward
      if (state.clientApproachAsked && !state.happyConfirmed && !state.movingForwardAsked) {
        // Deliberately narrow — avoids matching fragments inside longer sentences
        const confirmsAlternative = /\b(yes|yeah|yep|great|perfect|that works|sounds good|run with|that.?s better|looks better|happy with|that.?ll do|good idea|that.?s right|that one)\b/i
        if (confirmsAlternative.test(query)) {
          state.happyConfirmed = true
          state.movingForwardAsked = true
          logVASession(advisorId, firmId, state.detectedDomain, state.recommendedTemplates).catch(() => {})
          const mfQuestion = await getMovingForwardQuestion(conversationHistory)
          return sendQuestion(mfQuestion, state)
        }
      }

      // Phase 4 — response to Moving Forward question
      if (state.movingForwardAsked && !state.movingForwardDone) {
        state.movingForwardDone = true
        const noPattern = /\b(no|nope|nah|not now|not right now|i.?m fine|i.?m good|got it|ready to go|all good|i.?ll be fine|that.?s all|all done|i.?m done|that.?ll do|i.?m good to go|good to go)\b/i
        // Guard: "no, I want help with X" is a redirect, not a decline — fall through to AI
        const isRedirect = /^no[,\s]+(?:i\s+want|i\s+need|actually|but\b|wait\b|i\s+would|i.d\s+like|i\s+still|help|how|what)/i
        if (noPattern.test(query) && !isRedirect.test(query)) {
          state.conversationComplete = true
          return sendQuestion("You're ready to go. Good luck with it. Come back any time — before the meeting if you want to prep further, or after if you'd like to debrief.", state)
        }
        // Yes (or redirect) — ask personality before generating approach guidance if not yet known
        if (!state.clientPersonality) {
          state.clientPersonality = 'pending'
          return sendQuestion('Before I help you plan your approach — are they light-hearted and open to being challenged, or more discerning and careful about how they receive advice?', state)
        }
      }

      // Capture personality answer given at the start of the approach phase
      if (state.movingForwardDone && state.clientPersonality === 'pending') {
        state.clientPersonality = query
        // fall through to AI — personality context now populated
      }

      // After AI delivered Moving Forward help — close cleanly on advisor sign-off.
      // Anchored to ^ and $ so partial fragment matches inside longer sentences don't trigger.
      if (state.movingForwardHelped) {
        const signOffPattern = /^(thanks|thank you|cheers|great|perfect|looks good|that.?s great|that.?ll do|got it|appreciate|brilliant|all good|wonderful|lovely|that.?s all|all done)[!.\s]*$/i
        if (signOffPattern.test(query.trim())) {
          state.conversationComplete = true
          return sendQuestion("You're ready to go. Good luck with it. Come back any time — before the meeting if you want to prep further, or after if you'd like to debrief.", state)
        }
      }

      // AI handles: either alternatives exploration or client approach guidance
      const domainSupportPost = state.detectedDomain ? formatDomainSupportForPrompt(state.detectedDomain) : null
      const allUserText = conversationHistory.filter(m => m.role === 'user').map(m => m.content).join(' ')
      const postRecContextQuery = [allUserText, query, state.detectedDomain, state.industry].filter(Boolean).join(' ')
      const contextMsgPost = buildClientContext(orgTemplateIds, postRecContextQuery, { advisorProfile, firmTemplates }) +
        (domainSupportPost ? '\n---\n\n' + domainSupportPost : '')

      const messagesPost = [
        { role: 'user', content: contextMsgPost },
        { role: 'assistant', content: OPENING_MSG.client },
        ...conversationHistory,
        { role: 'user', content: query }
      ]

      // Detect "how do I use / learn [tool]" requests — switch to learn prompt so the
      // AI gives practical how-to coaching rather than restarting domain detection.
      const isHowToRequest = /\b(how do i|how do you|how to|teach me|walk me through|show me how|how would i|how can i|help me understand|explain)\b.{0,60}\b(use|learn|apply|run|do|deliver|introduce|facilitate|work with|implement|conduct|run through)\b/i
      // In post-rec context, pronouns (them/these/it/this) referring to recommended templates are valid
      const mentionsTool = /\b(force field|template|tool|framework|analysis|matrix|plan|process|model|approach|method|heald|revenue model|growth curve|staircase|accountability|board plan|register|heatmap|them|these|it|this one|those)\b/i
      const isLearnRequest = isHowToRequest.test(query) && mentionsTool.test(query)

      // Append a post-rec instruction so the AI does not restart domain detection
      // or ask discovery questions when the advisor sends a follow-up.
      const postRecInstruction = '\n\n[POST-RECOMMENDATION] The full recommendation has already been delivered and the advisor has responded to it. Do NOT run domain detection. Do NOT ask disambiguation questions. Do NOT restart the discovery process. Answer the advisor\'s current question directly and helpfully.\n\nCRITICAL TEMPLATE RULE: You may ONLY reference or recommend templates that appear EXACTLY as named in the provided template list above. Do NOT invent template names. Do NOT suggest templates that do not exist in the list. Do NOT paraphrase, adapt, or combine template names. If the advisor\'s question calls for a template that is not in the list, clearly state what IS available from the list that comes closest — never fabricate a name. Violating this rule destroys advisor trust.'

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      })
      if (res.socket) { res.socket.setNoDelay(true) }

      const _t0post = Date.now()
      let _postUsage = null
      let _postOk = false
      let _postBuffer = ''
      try {
        const streamPost = await getOpenAI().chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 1500,
          stream: true,
          stream_options: { include_usage: true },
          messages: [{ role: 'system', content: (isLearnRequest ? loadPrompt('learn') : loadPrompt('client')) + postRecInstruction }, ...messagesPost]
        })
        for await (const chunk of streamPost) {
          if (chunk.usage) { _postUsage = chunk.usage }
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) { _postBuffer += text }
          // Emit once when stream finishes — video sentences injected in code
          if (chunk.choices[0]?.finish_reason) {
            if (state.movingForwardDone && !state.movingForwardHelped) {
              state.movingForwardHelped = true
            }
            state.postRecAiResponses = (state.postRecAiResponses || 0) + 1
            const processed = injectVideoInfo(_postBuffer, orgTemplateIds)
            res.write('data: ' + JSON.stringify({ type: 'delta', text: processed }) + '\n\n')
            if (sessionId) { sessionSave(sessionId, state) }
            res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
          }
        }
        _postOk = true
      } catch (streamErr) {
        console.error('[advisor] Post-rec stream error:', streamErr.message)
        if (!res.writableEnded) {
          try { res.write('data: ' + JSON.stringify({ type: 'error', message: 'Stream interrupted' }) + '\n\n') } catch (e) {}
        }
      } finally {
        logAI('client-post-rec', 'gpt-4o-mini', _t0post, _postOk, _postUsage)
        if (!res.writableEnded) { res.end() }
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
      state.situationDiagnostic && state.situationDiagnostic !== 'pending' ? `Situation diagnostic (contributing factors, priority issue, downstream effects): ${state.situationDiagnostic}` : '',
      // Domain 1: Profitability answers
      state.detectedDomain === 'profit' && state.usesReports && state.usesReports !== 'pending' ? `Uses management reports: ${state.usesReports}` : '',
      state.detectedDomain === 'profit' && state.reportsFromFirm && state.reportsFromFirm !== 'pending' ? `Reports delivered by advisor's firm: ${state.reportsFromFirm}` : '',
      state.detectedDomain === 'profit' && state.wouldBenefitFromReview && state.wouldBenefitFromReview !== 'pending' ? `Would benefit from profit driver review: ${state.wouldBenefitFromReview}` : '',
      state.detectedDomain === 'profit' && state.industry && state.industry !== 'pending' ? `Industry: ${state.industry}` : '',
      // Domain 2: Staff answers
      state.detectedDomain === 'staff' && state.staffScope && state.staffScope !== 'pending' ? `Staff issue scope (individual vs team): ${state.staffScope}` : '',
      state.detectedDomain === 'staff' && state.staffOrigin && state.staffOrigin !== 'pending' ? `Staff issue origin (event vs gradual): ${state.staffOrigin}` : '',
      state.detectedDomain === 'staff' && state.staffCategory && state.staffCategory !== 'pending' ? `Staff issue category (employment law vs team improvement): ${state.staffCategory}` : '',
      // Domain 3: Data / Systems answers
      state.detectedDomain === 'data-systems' && state.dataSystemsChartAccounts && state.dataSystemsChartAccounts !== 'pending' ? `Chart of accounts / break-even / working capital: ${state.dataSystemsChartAccounts}` : '',
      state.detectedDomain === 'data-systems' && state.dataSystemsTeam && state.dataSystemsTeam !== 'pending' ? `Admin and accounting team: ${state.dataSystemsTeam}` : '',
      state.detectedDomain === 'data-systems' && state.dataSystemsComplexity && state.dataSystemsComplexity !== 'pending' ? `Complexity vs technology issue: ${state.dataSystemsComplexity}` : '',
      // Domain 4: Sales & Marketing answers
      state.detectedDomain === 'sales-marketing' && state.salesDiagnosis && state.salesDiagnosis !== 'pending' ? `Sales volume vs profitability diagnosis: ${state.salesDiagnosis}` : '',
      state.detectedDomain === 'sales-marketing' && state.salesTracking && state.salesTracking !== 'pending' ? `Conversion tracking: ${state.salesTracking}` : '',
      state.detectedDomain === 'sales-marketing' && state.salesProductFit && state.salesProductFit !== 'pending' ? `Product fit assessment: ${state.salesProductFit}` : '',
      // Domain 5: Financial Management answer (droptab selection)
      state.detectedDomain === 'forecasting' && state.forecastingTheme && state.forecastingTheme !== 'pending' ? `Selected financial management theme: ${state.forecastingTheme}` : '',
      // Domains 6–14: dynamic question answers from domains.json
      ...DOMAINS.filter(d => d.questions && d.questions.length > 0 && state.detectedDomain === d.id).flatMap(d =>
        d.questions.map(q => state[q.field] && state[q.field] !== 'pending' ? `${q.field}: ${state[q.field]}` : '')
      ),
      // Shared Phase 1 answers
      state.ownership && state.ownership !== 'pending' ? `Business ownership: ${state.ownership}` : '',
      state.growthStage && state.growthStage !== 'pending' ? `Growth stage: ${state.growthStage}` : '',
      state.operatorPlanning && state.operatorPlanning !== 'pending' ? `Operator execution style — structured planning vs day-to-day: ${state.operatorPlanning}` : '',
      state.advisoryStaircase && state.advisoryStaircase !== 'pending' ? `Advisory Staircase position: ${state.advisoryStaircase}` : '',
      state.clientPersonality && state.clientPersonality !== 'pending' ? `Client personality/style: ${state.clientPersonality}` : '',
      state.advisorExperience && state.advisorExperience !== 'pending' ? `Advisor experience: ${state.advisorExperience}` : '',
      state.advisorConfidence && state.advisorConfidence !== 'pending' ? `Advisor confidence for this specific situation (NOT a measure of overall career experience or seniority): ${state.advisorConfidence}` : '',
      state.advisorEnjoyment && state.advisorEnjoyment !== 'pending' ? `Advisor enjoyment/strengths: ${state.advisorEnjoyment}` : '',
      state.advisorTimeframe && state.advisorTimeframe !== 'pending' ? `Advisor timeframe and meeting commitment: ${state.advisorTimeframe}` : ''
    ].filter(Boolean).join('\n')

    // Derive explicit exclusion and context rules from diagnostic answers
    const reportsYes = state.usesReports && /\byes\b|already|they do|we do|regular|use them|have them/i.test(state.usesReports)
    const reportsNo = state.usesReports && state.usesReports !== 'pending' && !reportsYes
    const reportsFromAdvisorFirm = state.reportsFromFirm && /\byes\b|we do|our firm|my firm|we provide|we deliver|i do|i deliver|we produce/i.test(state.reportsFromFirm)
    const reviewNo = state.wouldBenefitFromReview && /\bno\b|not really|don't think|good handle|already know|doesn't need|do not|wouldn't/i.test(state.wouldBenefitFromReview)
    const staircaseStep = state.advisoryStaircase ? (state.advisoryStaircase.match(/Step\s*([1-5])/i) || [])[1] : null
    const staircaseNum = staircaseStep ? parseInt(staircaseStep) : null
    const clientRaisedIssue = state.clientRaisedIssue && /\byes\b|\byeah\b|\byep\b|they\s*(?:have\s+|'ve\s+)?(raised|brought|flagged|mentioned|came|approached|asked|wanted)\b|client\s+(?:has\s+|have\s+)?raised|came to me|brought it up|raised\s+(?:the\s+)?(?:issue|it\b)|flagged it|their idea|they initiated|spoke\s+to\s+(?:me|us)\s+about|called\s+(?:me|us)\s+about|phoned\s+(?:me|us)|reached\s+out|got\s+in\s+touch|contacted\s+(?:me|us)|they\s+(?:called|rang|phoned|messaged|emailed|texted)/i.test(state.clientRaisedIssue)

    // Parse meeting count from advisorTimeframe — upper bound of a range taken so capacity covers all planned sessions
    const _timeframeText = state.advisorTimeframe && state.advisorTimeframe !== 'pending' ? state.advisorTimeframe.toLowerCase() : ''
    const _meetingWordMap = { one: 1, two: 2, three: 3, four: 4, five: 5 }
    const _countRangeMatch = _timeframeText.match(/\b(one|two|three|four|five|\d)\s+(?:to|or|maybe|-)\s+(one|two|three|four|five|\d)\b/i)
    const _countSingleMatch = _timeframeText.match(/\b(one|two|three|four|five|\d)\b/i)
    const meetingNum = _countRangeMatch
      ? (_meetingWordMap[_countRangeMatch[2]] || parseInt(_countRangeMatch[2]) || null)
      : _countSingleMatch
        ? (_meetingWordMap[_countSingleMatch[1]] || parseInt(_countSingleMatch[1]) || null)
        : null
    const tier1Capacity = meetingNum || 2

    // Detect price communication need — scan all substantive answer fields, not just priority/downstream
    const _pricePattern = /\b(communicat(?:e|ing|ion|ions)?|price[s]?\s+(?:increase[s]?|rise[s]?|hike[s]?|change[s]?|up)\b|put(?:ting)?\s+(?:the\s+|their\s+)?price[s]?\s+up|pass\s+(?:it|the\s+cost|increase)\s+on|tell\s+(?:the\s+)?(?:client|customer)s?\s+about|inform\s+(?:the\s+)?(?:client|customer)s?|announc(?:e|ing|ement[s]?)?|retain(?:ing)?\s+(?:client|customer)s?|losing\s+(?:client|customer)s?|afraid\s+to\s+(?:raise|increase|put\s+up)\s+(?:the\s+)?price|client[s]?\s+(?:leave|leav|left|retention))\b/i
    const _priceFields = [state.situationDiagnostic, state.advisorConfidence]
    const hasPriceCommunication = _priceFields.some(f => f && f !== 'pending' && _pricePattern.test(f))

    // Map industry answer to a specific industry template name if one exists in the library
    const industryText = (state.industry || '').toLowerCase()
    const industryTemplateMap = [
      { pattern: /scaffold/i, template: 'Scaffolding' },
      { pattern: /construct|builder|build|plumb|electr|roofing|carpent|chippy|sparky|trade/i, template: 'Construction' },
      { pattern: /engineer|manufactur|precision|tooling|plastics|fabricat/i, template: 'Engineering' },
      { pattern: /hospit|restaur|cafe|catering|pub|bar|nightclub|food|beverage/i, template: 'Hospitality' },
      { pattern: /retail|shop|store|merchandise|ecomm/i, template: 'Retail' },
      { pattern: /farm|dairy|rural|agri|milk|crop|livestock/i, template: 'Rural Volatility' }
    ]
    const matchedIndustryTemplate = industryTemplateMap.find(m => m.pattern.test(industryText))
    const recommendedRevenueModel = matchedIndustryTemplate ? matchedIndustryTemplate.template : null

    const profitInstruction = state.detectedDomain === 'profit' && state.industry && state.industry !== 'pending'
      ? `\n\nPROFIT SITUATION: This client has a profitability/cost problem. Their industry is: ${state.industry}.

Your recommendation MUST include a revenue model or what-if analysis template from the provided template list. Rules:
- Only recommend templates that exist in the provided list — do NOT invent, adapt, or combine template names
${recommendedRevenueModel ? `- An industry-specific revenue model exists for this client: "${recommendedRevenueModel}". You MUST use this exact name in "My recommendation" — do NOT call it "Revenue Model", "Scaffolding Revenue Model", or any other variation. The only permitted name is "${recommendedRevenueModel}".` : '- Select the closest real revenue model or what-if analysis template available, exactly as named in the list'}
- In the "How to approach it" section, explain specifically how the advisor should apply that template in the context of the ${state.industry} industry — mention industry-specific cost pressures, pricing dynamics, and revenue levers relevant to that sector
- Do not append the industry name to the template name
- KEY INSIGHT — frame this in the "How to approach it" section: The revenue/what-if model's deepest value is the gap it exposes — the difference between what the owner assumes the business delivers (revenue, costs, profit) and what the financials actually show. That gap is a direct window into the mindset behind every decision they make. An owner running on flawed assumptions will keep arriving at the same outcomes. Making the gap visible is what shifts them from assumption-driven to data-driven thinking. The advisor should position the model as the tool that makes this shift possible — not just a financial exercise, but a change in how the owner sees their own business.
- DELIVERY METHOD RULE: ${clientRaisedIssue ? 'The client raised this issue themselves — they are already motivated and aware. The advisor MUST use the Trial Fit Method to introduce the revenue model. In "How to approach it", explain the Trial Fit Method: open with the tailored suit metaphor ("get it down, then get it good"), give a quick global overview of the model without lingering on detail, then immediately get the client interacting with a specific section using best-guess numbers. Do not skip the framing stage even with an enthusiastic client.' : 'The advisor noticed this issue — the client has not yet asked for this kind of help. The advisor MUST use the Cautious Reveal Method to deliver the revenue model. CRITICAL: the Cautious Reveal is NOT a template and must NOT appear in "My recommendation" — it is a delivery approach only. Explain it solely within the "How to approach it" section: establish WHY the client needs the model before showing WHAT it contains — concepts before complexity. Open with the overtrading concept and profit sweet spot conversation. Never show the client their own model until they have mentally owned the idea. Consider sending the Phil\'s a plumber video before the meeting to prime awareness.'}
${reportsYes ? '- This client already uses financial management reports regularly. Do NOT recommend the Working Capital Cycle or any basic financial literacy or financial awareness templates — they are beneath this client\'s level. Only recommend templates appropriate for a financially informed client.' : ''}
${reportsNo ? `- FINANCIAL EDUCATION: This client does not use financial management reports. Include a financial education template in TIER 2 (future consideration). To select the correct one, match the client's described situation to the most relevant theme in the Financial Management Progression Table below — read the Problem column and find the closest match. You MUST use the Suggested Template name from that theme exactly as written. The only permitted template names for this slot are: The Heald Matrix, Working Capital Cycle, Demings Volatility, Forecasting, Dashboard Discussions, Ratio Analysis. Do NOT use any other template name. If the closest theme is "Eyes On The Prize" (Revenue Model), skip it — the revenue model is already in Section 1 — and choose the next best matching theme instead.\n- CRITICAL: Do NOT describe this client as using, having access to, or being familiar with management reports at any point in your response. Their situation is that they do not use reports — every template description and all explanatory prose must reflect this. Writing anything that implies the client already uses reports is factually incorrect and undermines the recommendation.\n\nFINANCIAL MANAGEMENT PROGRESSION TABLE:\n${formatFinMgtTable()}` : ''}
${reportsFromAdvisorFirm ? '- The advisor\'s firm already delivers management reports to this client. This is an established financial services relationship — build on that foundation, not repeat it. Position the next step as advancing the engagement.' : ''}
${reviewNo ? '- The advisor has indicated the client does NOT need a detailed review of business variables and profit drivers. Do NOT recommend templates focused on profit driver analysis, business variable reviews, or foundational financial education. Stick to action-oriented templates relevant to the specific profitability issue.' : ''}
${staircaseNum ? `- Advisory Staircase position: Step ${staircaseNum}. ${staircaseNum <= 2 ? 'This is an early-stage engagement — keep templates foundational and accessible. Build confidence before introducing complexity.' : staircaseNum === 3 ? 'The engagement is at interpretation stage — the client is ready for structured analysis and what-if modelling.' : staircaseNum === 4 ? 'The engagement is at application stage — the client is ready for forecasting, scenario planning, and strategic templates.' : 'This is a mature strategic engagement — the client expects sophisticated, data-driven templates. Do not recommend foundational or educational content.'}` : ''}`
      : ''

    const staffInstruction = state.detectedDomain === 'staff' && state.staffCategory && state.staffCategory !== 'pending'
      ? `\n\nSTAFF SITUATION: This is a staff/team issue. Use the three diagnostic answers to shape the recommendation:
- Scope (individual vs team): ${state.staffScope}
- Origin (event-driven vs gradual): ${state.staffOrigin}
- Category: ${state.staffCategory}

If the category indicates a potential employment law matter: you MUST flag clearly that this may require an HR or legal specialist before any advisory template is used. However, if the scope indicates one or two specific employees, you may also suggest a Performance Improvement Plan — this is available in the Advisor-e library under Get Organised / Team Coaching & Culture.
If the category indicates team and leadership improvement: tailor the recommendation to match the scope (individual vs whole team) and the origin (event-driven vs gradual development). Solutions may be up to 4 templates if required. Refer to the People Power Template to guide suggestions.`
      : ''

    const dataSystemsInstruction = state.detectedDomain === 'data-systems' && state.dataSystemsChartAccounts && state.dataSystemsChartAccounts !== 'pending'
      ? `\n\nDATA INTEGRITY / FINANCIAL SYSTEMS SITUATION: Use the three diagnostic answers to shape the recommendation:
- Chart of accounts / break-even / working capital: ${state.dataSystemsChartAccounts}
- Admin and accounting team: ${state.dataSystemsTeam}
- Complexity vs technology issue: ${state.dataSystemsComplexity}

If the answer to (a) indicates poor understanding or non-use of any of the three points (chart of accounts, break-even, working capital): ensure templates related to those specific topics are included. The final solution may include 4 or 5 templates if necessary.
If the team answer indicates lack of experience or education in accounting: the recommendation may also include the Accounting Best Practices section.
If the complexity/technology answer indicates software issues AND the business is at Leverage, Reach, Leapfrog, or Maturity on the Growth Curve: the recommendation may also include the Financial Systems Review.`
      : ''

    const salesMarketingInstruction = state.detectedDomain === 'sales-marketing' && state.salesDiagnosis && state.salesDiagnosis !== 'pending'
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

    const forecastingInstruction = state.detectedDomain === 'forecasting' && state.forecastingTheme && state.forecastingTheme !== 'pending'
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

    // ── Domains 6–14 instruction stubs — populated when domain questions are finalised ──
    const governanceInstruction = state.detectedDomain === 'governance'
      ? '\n\nGOVERNANCE & LEADERSHIP SITUATION: The advisor has flagged a governance or leadership issue. Recommend templates from the Governance & Leadership domain. Use Phase 2 answers to calibrate complexity and engagement style.'
      : ''

    const strategyInstruction = state.detectedDomain === 'strategy'
      ? '\n\nSTRATEGY & PLANNING SITUATION: The advisor has flagged a strategic planning need. Recommend templates from the Strategy & Planning domain. Use Phase 2 answers to calibrate depth and sequencing.'
      : ''

    const systemsInstruction = state.detectedDomain === 'systems'
      ? '\n\nSYSTEMS SITUATION: The advisor has flagged a systems or process issue. Recommend templates from the Systems domain. Use Phase 2 answers to calibrate complexity.'
      : ''

    const valuationInstruction = state.detectedDomain === 'valuation'
      ? '\n\nVALUATION SITUATION: The advisor has flagged a business valuation need. Recommend templates from the Valuation domain. Use Phase 2 answers to calibrate the level of engagement.'
      : ''

    const riskInstruction = state.detectedDomain === 'risk'
      ? '\n\nRISK MANAGEMENT SITUATION: The advisor has flagged a risk management issue. Recommend templates from the Risk Management domain. Use Phase 2 answers to calibrate urgency and complexity.'
      : ''

    const successionInstruction = state.detectedDomain === 'succession'
      ? '\n\nSUCCESSION PLANNING SITUATION: The advisor has flagged a succession or exit planning need. Recommend templates from the Succession Planning domain. Use Phase 2 answers to calibrate timeframe and complexity.'
      : ''

    const conflictInstruction = state.detectedDomain === 'conflict'
      ? '\n\nCONFLICT SITUATION: The advisor has flagged a conflict or dispute. Recommend templates from the Conflict Meetings domain. Note any mediation or employment law implications from the context.'
      : ''

    const eoyInstruction = state.detectedDomain === 'eoy'
      ? '\n\nEND OF YEAR MEETING SITUATION: The advisor is preparing for an end of year meeting. Recommend templates from the End of Year content domain. Use Phase 2 answers to calibrate depth.'
      : ''

    const dueDiligenceInstruction = state.detectedDomain === 'due-diligence'
      ? '\n\nDUE DILIGENCE SITUATION: The advisor has flagged a due diligence or acquisition situation. Recommend templates from the Due Diligence domain. Use Phase 2 answers to calibrate the level of advisor involvement.'
      : ''

    const profileNote = advisorProfile
      ? `\n\nADVISOR PROFILE: ${formatAdvisorProfile(advisorProfile)}\nUse this profile in place of Phase 2 answers when writing "Why this suits you as the advisor". Only reference what is explicitly stated in the profile. Do NOT infer, assume, or guess the advisor's experience level, seniority, or capability from what is absent. If experience is not mentioned, write the section based solely on role, interests, and stated strengths — do not label the advisor as new, inexperienced, or a beginner.`
      : ''

    // Override query with the collected answers summary for the AI recommendation call
    const domainInstructions = profitInstruction + staffInstruction + dataSystemsInstruction + salesMarketingInstruction + forecastingInstruction +
      governanceInstruction + strategyInstruction + systemsInstruction + valuationInstruction +
      riskInstruction + successionInstruction + conflictInstruction + eoyInstruction + dueDiligenceInstruction

    const _tier1Label = `${meetingNum || 2} meeting${(meetingNum || 2) !== 1 ? 's' : ''} = ${tier1Capacity} template${tier1Capacity !== 1 ? 's' : ''} maximum`
    const recommendationStructure = `\n\nRECOMMENDATION FORMAT — follow this structure exactly. Do not invent alternative headings or reorder the sections.

SECTION 1 — "My recommendation"
Select templates that directly address the CAUSE of the client's situation — what led to it and the primary fix. Capacity: ${tier1Capacity} template${tier1Capacity !== 1 ? 's' : ''} (${_tier1Label}). Do not exceed this number in Section 1. Order by priority: the template that addresses what the advisor said they want to tackle first comes first, followed by any other primary cause templates, then any downstream needs included in Section 1.

SECTION 2 — "You might find these templates support this topic — for future consideration"
Maximum 3 templates. Before including any template here, apply one of these three tests against the collected answers above — a template only belongs in Section 2 if it passes at least one test:

TEST 1 — Downstream: The advisor named a specific downstream or flow-on effect in any collected answer field, and this template directly and specifically addresses that stated effect. A loose thematic connection does not pass this test — the effect must have been named by the advisor.

TEST 2 — Foundational gap: A domain diagnostic answer revealed a clear knowledge or tool gap, and this template closes it (e.g. no use of financial reports → a financial education template from the approved list). The gap must be explicitly present in the collected answers.

TEST 3 — Phase 2 secondary need: The advisor described a specific secondary need in their confidence or experience answer that is distinct from the primary situation and not already covered in Section 1.

If a template does not pass one of these three tests, it does not belong in Section 2. Do not pad to reach the maximum.

Do NOT include templates that:
- Belong to the "Get Organised" section — these are advisor development and practice management tools, never client-facing. Do not recommend them under any circumstances.
- Are generic or process-based (meeting agendas, time management) unless explicitly discussed
- Address the advisor's own practice management rather than the client's situation
- Were not referenced in any collected answer field
- Duplicate the intent of a Tier 1 template

PER-TEMPLATE FORMAT — use this exact structure for every template in both sections, no exceptions. Each field label must appear exactly as written below, including the ** markers. Each sub-section MUST be separated by a blank line so they render as distinct paragraphs:

**[Template name]**

**Why this fits your client:**
[Reference the client's situation, the issue raised, their growth stage, operator capability, and motivation to change. Draw from content summaries where available.]

**Why this suits you as the advisor:**
[Reference the advisor's experience, confidence, and willingness to stretch. Only reference what is explicitly known — do not infer or fabricate.]

**How to approach it:**
[Practical delivery guidance tailored to this specific advisor-client combination.]

**Suggested session plan:**
[Map the recommended templates to the meetings within the advisor's stated timeframe. Use the advisor's meeting count and timeframe to distribute the work across sessions.]

**What this typically leads to:**
[The downstream opportunity or natural next engagement this template typically opens up. Draw from content summaries where available.]

Do not use any other field names. Do not add extra fields. Do not use "Purpose:", "Helps the owner:", "Helps the advisor:", or any other heading not listed above. The ** characters are not decorative — they must appear in your output exactly as shown above.

Use the advisor's answers about what caused this situation and what will flow on from it to determine which templates belong in each section.${hasPriceCommunication ? '\n\nPRICE COMMUNICATION: The advisor has flagged communicating price increases as a need for this engagement. Include the "Price Rise" template (exactly that name) in Section 1 — it covers two communication methods for explaining a price rise to customers.' : ''}`

    const recommendationQuery = `Here is everything collected about the client and situation:\n\n${collectedAnswers}${domainInstructions}${profileNote}${recommendationStructure}\n\nNow produce the Phase 3 recommendation.`

    // Fall through to AI call for Phase 3 recommendation
    const languageInstruction2 = language !== 'en'
      ? `\n\nIMPORTANT: Always respond entirely in ${languageName}.`
      : ''

    const allUserConvText = conversationHistory.filter(m => m.role === 'user').map(m => m.content).concat(query).join(' ')
    const matchedTrees = detectLogicTrees(allUserConvText)
    const domainSupportPhase3 = state.detectedDomain ? formatDomainSupportForPrompt(state.detectedDomain) : null
    const contextMsg2 = buildClientContext(orgTemplateIds, collectedAnswers, {
      includeSummaries: true,
      logicTrees: matchedTrees,
      includeGrowthStage: state.growthStage && state.growthStage !== 'pending' ? state.growthStage : null,
      maxTemplates: 25,
      excludeSections: ['get-organised', 'get-the-job'],
      firmTemplates
    }) + (domainSupportPhase3 ? '\n---\n\n' + domainSupportPhase3 : '')

    const systemPrompt2 = loadPrompt('client') + languageInstruction2

    const messages2 = [
      { role: 'user', content: contextMsg2 },
      { role: 'assistant', content: OPENING_MSG.client },
      { role: 'user', content: recommendationQuery }
    ]

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    })
    if (res.socket) { res.socket.setNoDelay(true) }

    const _t0phase3 = Date.now()
    let _p3Usage = null
    let _p3Ok = false
    let _p3Buffer = ''
    try {
      const stream2 = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 2500,
        stream: true,
        stream_options: { include_usage: true },
        messages: [{ role: 'system', content: systemPrompt2 }, ...messages2]
      })
      for await (const chunk of stream2) {
        if (chunk.usage) { _p3Usage = chunk.usage }
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) {
          _p3Buffer += text
          // Stream each chunk immediately so the advisor sees text appearing in real time
          res.write('data: ' + JSON.stringify({ type: 'delta', text }) + '\n\n')
        }
        if (chunk.choices[0]?.finish_reason) {
          // Post-process for video injection — if it changed the text, send a replace event
          const processed = injectVideoInfo(_p3Buffer, orgTemplateIds)
          if (processed !== _p3Buffer) {
            res.write('data: ' + JSON.stringify({ type: 'replace', text: processed }) + '\n\n')
          }
          res.write('data: ' + JSON.stringify({ type: 'recommendation_delivered' }) + '\n\n')
          res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
        }
      }
      _p3Ok = true
      state.recommendedTemplates = extractTemplatesFromText(_p3Buffer)
      if (sessionId) { sessionSave(sessionId, state) }
    } catch (streamErr) {
      console.error('[advisor] Phase 3 stream error:', streamErr.message)
      if (!res.writableEnded) {
        try { res.write('data: ' + JSON.stringify({ type: 'error', message: 'Stream interrupted' }) + '\n\n') } catch (e) {}
      }
    } finally {
      logAI('client-phase3', 'gpt-4o-mini', _t0phase3, _p3Ok, _p3Usage)
      if (!res.writableEnded) { res.end() }
    }
    return
  }

  const languageInstruction = language !== 'en'
    ? `\n\nIMPORTANT: The advisor is using the ${languageName} interface. Always respond entirely in ${languageName}, regardless of what language the advisor writes in.`
    : ''
  const orgTemplates = getOrgTemplates(orgTemplateIds || null, firmTemplates)
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
  const model = 'gpt-4o-mini'

  // Summaries only apply to Do the Job templates — skip for plan/learn modes.
  // Also defer until conversation is deep enough to be approaching a recommendation.
  // Use the first user message (establishes the topic) + current query for filtering —
  // the current message alone may be a short answer ("yes", "they're a plumber") that matches nothing.
  const summariesApply = mode === 'client' || mode === 'discover'
  const allUserMsgs = trimmedHistory.filter(m => m.role === 'user').map(m => m.content).join(' ')
  const summaryQuery = allUserMsgs ? allUserMsgs + ' ' + query : query
  const relevantSummaries = summariesApply && trimmedHistory.length >= 6 ? filterSummariesByQuery(summaryQuery, 10) : []
  const summariesText = formatSummariesForPrompt(relevantSummaries)

  const advisorProfileText = advisorProfile ? formatAdvisorProfile(advisorProfile) : null
  const profileSystemInstruction = advisorProfileText
    ? '\n\nADVISOR PROFILE PRE-SUPPLIED: Use the profile in the context when writing the "Why this suits you as the advisor" section.'
    : ''

  const basePrompt = loadPrompt(mode) || loadPrompt('client')
  const systemPrompt = basePrompt + profileSystemInstruction + languageInstruction

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

  // Deep-dive detection — client/discover mode only, deferred until after first exchange.
  // Loading the full reference text (~19K chars) on the opening message bloats the prompt
  // unnecessarily. The AI can't usefully offer a deep dive before it knows the client situation.
  let deepDiveText = null
  if ((mode === 'client' || mode === 'discover') && trimmedHistory.length >= 2) {
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

  // Domain support reference — client mode injects this directly in its own block (Phase 3 + post-rec).
  // Discover/plan/learn modes do not run domain detection, so no support text here.
  const domainSupportText = null

  const contextMessage = [
    `## Available Templates for This Organisation (${templatesToUse.length} most relevant shown)`,
    '',
    templatesText,
    sectionDescText ? '\n---\n\n' + sectionDescText : '',
    coachingText
      ? '\n---\n\n## Coaching Reference — Expert Guidance on Template Selection\n\n' + coachingText
      : '',
    domainSupportText ? '\n---\n\n' + domainSupportText : '',
    growthText ? '\n---\n\n' + growthText : '',
    summariesText ? '\n---\n\n## Detailed Template Summaries — Purpose, Indicators & Delivery Guidance\n\n' + summariesText : '',
    advisorProfileText
      ? '\n---\n\n## Advisor Profile (pre-supplied)\n\nThis advisor has already provided their background. Do not ask the Phase 2 questions — skip directly from Phase 1 to Phase 3 once you have a clear enough picture of the client. When writing "Why this suits you as the advisor", use ONLY what is explicitly stated in the profile below — do not infer, extrapolate, or assume anything about their career stage, seniority, years of experience, or interests that is not written here.\n\n' + advisorProfileText
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
        Connection: 'keep-alive',
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
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  // Disable Nagle's algorithm so each SSE chunk is sent immediately
  if (res.socket) {
    res.socket.setNoDelay(true)
  }

  const _t0main = Date.now()
  const stream = await getOpenAI().chat.completions.create({
    model,
    max_tokens: 2500,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  })

  let _mainUsage = null
  let _mainOk = false
  let _mainBuffer = ''
  try {
    for await (const chunk of stream) {
      if (chunk.usage) { _mainUsage = chunk.usage }
      const text = chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content
        ? chunk.choices[0].delta.content
        : ''
      if (text) { _mainBuffer += text }
      if (chunk.choices[0] && chunk.choices[0].finish_reason) {
        const processed = injectVideoInfo(_mainBuffer, orgTemplateIds)
        res.write('data: ' + JSON.stringify({ type: 'delta', text: processed }) + '\n\n')
        res.write('data: ' + JSON.stringify({ type: 'done' }) + '\n\n')
      }
    }
    _mainOk = true
  } catch (streamErr) {
    console.error('[advisor] Stream error:', streamErr.message)
    if (!res.writableEnded) {
      try { res.write('data: ' + JSON.stringify({ type: 'error', message: 'Stream interrupted' }) + '\n\n') } catch (e) {}
    }
  } finally {
    logAI(mode, model, _t0main, _mainOk, _mainUsage)
    if (!res.writableEnded) { res.end() }
  }
}
