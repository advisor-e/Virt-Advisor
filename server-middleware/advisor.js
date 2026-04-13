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
const { filterSummariesByQuery, formatSummariesForPrompt, formatSectionDescriptionsForPrompt } = require('../server/utils/summaries')
const { formatGrowthFundamentalsForPrompt, conversationHasGrowthStage } = require('../server/utils/growth')

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
    maxTemplates = 25
  } = options || {}

  const orgTemplates = getOrgTemplates(orgTemplateIds || null)
  const relevant = filterTemplatesByQuery(orgTemplates, searchQuery, maxTemplates)
  const templatesToUse = relevant.length > 0 ? relevant : orgTemplates.slice(0, maxTemplates)
  const templatesText = formatTemplatesForPrompt(templatesToUse)
  const coachingText = includeCoaching ? formatCoachingForPrompt() : null
  const summariesText = includeSummaries ? formatSummariesForPrompt(filterSummariesByQuery(searchQuery, 10)) : null
  const sectionDescText = includeSectionDesc ? formatSectionDescriptionsForPrompt() : null
  const growthText = includeGrowthStage
    ? formatGrowthFundamentalsForPrompt([{ role: 'user', content: includeGrowthStage }])
    : null
  const profileText = advisorProfile
    ? `\n\nADVISOR PROFILE: ${formatAdvisorProfile(advisorProfile)}`
    : ''

  return [
    `## Available Templates (${templatesToUse.length} most relevant)`,
    '',
    templatesText,
    sectionDescText ? '\n---\n\n' + sectionDescText : '',
    coachingText ? '\n---\n\n## Coaching Reference\n\n' + coachingText : '',
    growthText ? '\n---\n\n' + growthText : '',
    summariesText ? '\n---\n\n## Template Summaries\n\n' + summariesText : ''
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
      profitSituation: false,
      staffSituation: false,
      disambiguationNeeded: false,
      disambiguationAnswer: null,
      clientRaisedIssue: false,
      usesReports: false,
      wouldBenefitFromReview: false,
      industry: null,
      staffScope: null,
      staffOrigin: null,
      staffCategory: null,
      ownership: null,
      growthStage: null,
      acumen: null,
      academic: null,
      trust: null,
      engagementHistory: null,
      clientPersonality: null,
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
    // Count matches per scenario: most matches wins. On a tie, ask disambiguation.
    const profitPattern = /profit|profitability|margin|margins|fuel cost|fuel costs|rising cost|rising costs|cost increase|increasing cost|expenses|cost pressure|squeeze/gi
    const staffPattern = /\b(staff|employees|team|efficiency|productivity|effectiveness|leadership|HR|morale|culture|disharmony|poor communication)\b/gi
    const firstMsg = conversationHistory.length > 0
      ? (conversationHistory.find(m => m.role === 'user') || { content: query }).content
      : query
    const profitMatches = (firstMsg.match(profitPattern) || []).length
    const staffMatches = (firstMsg.match(staffPattern) || []).length

    if (profitMatches > staffMatches) {
      state.profitSituation = true
      state.staffSituation = false
      state.disambiguationNeeded = false
    } else if (staffMatches > profitMatches) {
      state.staffSituation = true
      state.profitSituation = false
      state.disambiguationNeeded = false
    } else if (profitMatches > 0 && staffMatches > 0) {
      // Genuine tie — disambiguation question fires after Q1
      state.disambiguationNeeded = true
      state.profitSituation = false
      state.staffSituation = false
    } else {
      state.profitSituation = false
      state.staffSituation = false
      state.disambiguationNeeded = false
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
        text: 'At present I\'m reading your core issue as profitability and cost management — is that right, or would you prefer we focus more on staff, productivity and leadership in this scenario?',
        skip: s => !s.disambiguationNeeded,
        onAnswer: (answer, s) => {
          if (/\b(staff|leadership|team|productivity|people|employees)\b/i.test(answer)) {
            s.staffSituation = true
            s.profitSituation = false
          } else {
            s.profitSituation = true
            s.staffSituation = false
          }
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
        return sendQuestion(q.text, state)
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
        const confirmsHappy = /\b(yes|yeah|yep|looks good|that.?s great|happy with that|happy with|perfect|sounds good|love it|that works|brilliant|excellent|great suggestion|that.?s perfect|go with that)\b/i

        if (wantsAlternatives.test(query)) {
          // Advisor wants alternatives — fall through to AI, then re-check next turn
          state.clientApproachAsked = true
        } else if (state.postRecAiResponses === 0 && confirmsHappy.test(query)) {
          // First response after recommendation AND explicit happiness — fire Moving Forward
          // If postRecAiResponses > 0 we're deep in a follow-up conversation and "yes"
          // might be answering an AI question — let the AI handle the conclusion instead
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
      state.profitSituation && state.usesReports && state.usesReports !== 'pending' ? `Uses management reports: ${state.usesReports}` : '',
      state.profitSituation && state.wouldBenefitFromReview && state.wouldBenefitFromReview !== 'pending' ? `Would benefit from profit driver review: ${state.wouldBenefitFromReview}` : '',
      state.profitSituation && state.industry && state.industry !== 'pending' ? `Industry: ${state.industry}` : '',
      state.staffSituation && state.staffScope && state.staffScope !== 'pending' ? `Staff issue scope (individual vs team): ${state.staffScope}` : '',
      state.staffSituation && state.staffOrigin && state.staffOrigin !== 'pending' ? `Staff issue origin (event vs gradual): ${state.staffOrigin}` : '',
      state.staffSituation && state.staffCategory && state.staffCategory !== 'pending' ? `Staff issue category (employment law vs team improvement): ${state.staffCategory}` : '',
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
If the category indicates team and leadership improvement: tailor the recommendation to match the scope (individual vs whole team) and the origin (event-driven vs gradual development).`
      : ''

    const profileNote = advisorProfile
      ? `\n\nADVISOR PROFILE: ${formatAdvisorProfile(advisorProfile)}\nUse this profile in place of Phase 2 answers when writing "Why this suits you as the advisor".`
      : ''

    // Override query with the collected answers summary for the AI recommendation call
    const recommendationQuery = `Here is everything collected about the client and situation:\n\n${collectedAnswers}${profitInstruction}${staffInstruction}${profileNote}\n\nNow produce the Phase 3 recommendation.`

    // Fall through to AI call for Phase 3 recommendation
    const languageInstruction2 = language !== 'en'
      ? `\n\nIMPORTANT: Always respond entirely in ${languageName}.`
      : ''

    const contextMsg2 = buildClientContext(orgTemplateIds, collectedAnswers, {
      includeSummaries: true,
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
    caseSummariesText ? '\n---\n\n' + caseSummariesText : ''
  ].join('\n')

  // PHASE 2 INTERCEPT — fires before the AI runs.
  // If a profile exists and the last AI message was a Phase 2 question, return a
  // hardcoded bridge response directly — AI never runs for this turn.
  if (advisorProfileText && trimmedHistory.length > 0) {
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
