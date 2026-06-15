'use strict'

/**
 * Nuxt 2 server middleware — handles POST /api/course
 *
 * Dispatches by body.type:
 *   design        — SSE stream: course design conversation
 *   session       — SSE stream: individual session delivery
 *   quiz-generate — JSON: generate 3 quiz questions for a session
 *   quiz-grade    — JSON: grade one advisor answer
 *   progress      — JSON: record session completion (stub for platform integration)
 */

const fs = require('fs')
const path = require('path')
const { createOpenAIClient } = require('../server/utils/openaiClient')
const { getOrgTemplates, filterTemplatesByQuery, formatTemplatesForPrompt } = require('../server/utils/templates')
const { filterSummariesByQuery, formatSummariesForPrompt, formatSectionDescriptionsForPrompt } = require('../server/utils/summaries')
const { detectDomainForSession, formatDomainContextForSession, formatDomainSummaryForDesign, detectDomainsForDesign } = require('../server/utils/domainSupport')
const { detectLogicTree, buildLearnReferenceText } = require('../server/utils/logicTrees')
const { sendError } = require('../server/utils/sendError')
const { validateQuizGenerate, validateQuizGrade } = require('../server/utils/validateAIResponse')
const { fenceUntrusted } = require('../server/utils/promptSafety')
const CourseReminderService = require('../server/services/CourseReminderService')

// Node.js 15+ crashes on unhandled rejections — guard against OpenAI SDK stream cleanup errors
if (!process._courseMiddlewareGuarded) {
  process._courseMiddlewareGuarded = true
  process.on('unhandledRejection', (reason) => {
    console.error('[course] Unhandled rejection (server kept alive):', reason?.message || String(reason))
  })
}

// OpenAI singleton — one client per process, avoids creating a new connection pool on every request
let _openaiClient = null
function getOpenAI () {
  if (!_openaiClient) { _openaiClient = createOpenAIClient({ apiKey: process.env.OPENAI_API_KEY }) }
  return _openaiClient
}

const { loadPrompt } = require('../server/utils/promptLoader')
const { createLimiter } = require('./utils/rateLimit')

const checkCourseLimit = createLimiter(15)

// Quiz override questions — loaded once, falls back to empty if file missing
let _quizOverrides = null
function getQuizOverrides () {
  if (_quizOverrides) { return _quizOverrides }
  try {
    const filePath = path.resolve(process.cwd(), 'data/course-quizzes.json')
    _quizOverrides = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) {
    _quizOverrides = { overrides: {} }
  }
  return _quizOverrides
}

function sseWrite (res, data) {
  res.write('data: ' + JSON.stringify(data) + '\n\n')
}

function sseHeaders (req, res) {
  const origin = (req && req.headers && req.headers.origin) || ''
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  }
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  res.writeHead(200, headers)
}

function jsonResponse (res, status, payload) {
  if (res.headersSent) { return }
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

// ── Design conversation ────────────────────────────────────────────────────

// Detects when an advisor's first message mentions both selling and delivering a service
function _detectCourseMultiGoal (answer) {
  const lower = answer.toLowerCase()
  const hasSelling = /\b(sell|selling|sales|win clients|winning clients|get clients|approach clients)\b/.test(lower)
  const hasDelivery = /\b(deliver|facilitat|run|use|apply|conduct|implement|strateg|planning|profit|staff|governance|systems|valuati|succession|conflict)\b/.test(lower)
  return hasSelling && hasDelivery
}

// Code-controlled question sequence — asked one at a time before outline generation
const COURSE_DESIGN_QUESTIONS = [
  {
    field: 'currentLevel',
    text: "What's your current experience or confidence level in this area — have you had any prior training, coaching, or reading on this topic?"
  },
  {
    field: 'intensity',
    text: 'Do you prefer each session to stay at a consistent level of depth throughout, or would you like the course to get progressively more challenging as you go?'
  },
  {
    field: 'sessionDetails',
    text: 'How many minutes would you like each session to aim for, and how many sessions in total would you like to commit to?'
  }
]

function handleDesign (req, body, res) {
  const { query, advisorProfile, orgTemplateIds, courseState = {} } = body
  if (!query) { return sendError(res, 400, 'QUERY_REQUIRED', 'query is required') }

  const openai = getOpenAI()

  // Restore or initialise design pipeline state
  const state = Object.assign({
    goalsPrimary: null,
    multiGoalDetected: false,
    currentLevel: null,
    intensity: null,
    sessionDetails: null,
    pendingOutline: null
  }, courseState)

  // Helper: send a hardcoded question as instant SSE (no OpenAI call)
  function sendQuestion (text, newState) {
    sseHeaders(req, res)
    sseWrite(res, { type: 'state', state: newState })
    sseWrite(res, { type: 'delta', text })
    sseWrite(res, { type: 'done' })
    res.end()
  }

  // Helper: build full context and stream an AI-generated outline
  async function generateOutline (userMessage) {
    const allUserText = [
      state.goalsPrimary,
      state.goalsSecondary && state.goalsSecondary !== 'pending' ? state.goalsSecondary : '',
      state.currentLevel,
      state.intensity,
      state.sessionDetails
    ].filter(Boolean).join(' ').slice(0, 3000)

    const templates = getOrgTemplates(orgTemplateIds || null)
    const filtered = filterTemplatesByQuery(templates, allUserText)
    const templateContext = formatTemplatesForPrompt(filtered)

    // Inject summaries for the most query-relevant templates only — mirrors the
    // advisor engine's capped injection. Injecting all 278 summaries (~52k tokens)
    // blew the OpenAI per-minute token limit; the AI builds the course from the
    // already query-filtered template list above, so unrelated summaries add no value.
    const summariesText = formatSummariesForPrompt(filterSummariesByQuery(allUserText, 12))
    const sectionDescText = formatSectionDescriptionsForPrompt()

    const detectedDomains = detectDomainsForDesign(allUserText)
    const domainSummaries = detectedDomains
      .map(id => formatDomainSummaryForDesign(id))
      .filter(Boolean)
      .join('\n\n')

    const advisorContextStr = advisorProfile
      ? '\n\n## Advisor profile\n\n' +
        Object.entries(advisorProfile)
          .filter(([, v]) => v && v.trim())
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      : ''

    const systemPrompt = loadPrompt('course-design') +
      (domainSummaries ? '\n\n' + domainSummaries : '') +
      '\n\n## Template section complexity guide\n\n' + sectionDescText +
      '\n\n## Content summaries — what each template teaches and its complexity level\n\n' + summariesText +
      '\n\n## Available templates and resources\n\n' + templateContext +
      advisorContextStr

    sseHeaders(req, res)
    sseWrite(res, { type: 'state', state })

    let stream
    try {
      stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 2500,
        stream: true
      }, { timeout: 60000 })
    } catch (createErr) {
      console.error('[course:design] OpenAI create failed:', createErr.message)
      sseWrite(res, { type: 'done' })
      res.end()
      return
    }

    let fullText = ''
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || ''
        if (delta) {
          fullText += delta
          sseWrite(res, { type: 'delta', text: delta })
        }
      }
    } catch (streamErr) {
      console.error('[course:design] Stream error:', streamErr.message)
    }

    const outlineMatch = fullText.match(/\[COURSE_OUTLINE\]([\s\S]*?)\[\/COURSE_OUTLINE\]/)
    const finalState = { ...state, pendingOutline: null }
    if (outlineMatch) {
      try {
        finalState.pendingOutline = JSON.parse(outlineMatch[1].trim())
      } catch (e) {
        console.warn('[course:design] Could not parse course outline JSON:', e.message)
      }
    }

    sseWrite(res, { type: 'state', state: finalState })
    sseWrite(res, { type: 'done' })
    res.end()
  }

  // ── Case 1: Outline revision — advisor wants changes to an existing outline ──
  if (state.pendingOutline) {
    const existingOutline = JSON.stringify(state.pendingOutline, null, 2)
    state.pendingOutline = null
    const revisionMessage = `The advisor has reviewed this course outline:\n\n${existingOutline}\n\nThey want the following changes:\n${fenceUntrusted(query)}\n\nPlease revise the outline accordingly and present the updated version.`
    return generateOutline(revisionMessage)
  }

  // ── Case 2: First message — capture primary goal, detect multi-goal ──
  if (!state.goalsPrimary) {
    state.goalsPrimary = query
    state.multiGoalDetected = _detectCourseMultiGoal(query)
    // Fall straight through to pipeline — no separate Q1 needed
  }

  // ── Case 3: Discovery pipeline — ask one question at a time ──
  for (const q of COURSE_DESIGN_QUESTIONS) {
    if (q.skip && q.skip(state)) { continue }
    if (!state[q.field]) {
      state[q.field] = 'pending'
      return sendQuestion(q.text, state)
    }
    if (state[q.field] === 'pending') {
      state[q.field] = query
    }
  }

  // ── Case 4: All fields collected — generate the outline ──
  const collectedAnswers = [
    `Development goals: ${state.goalsPrimary}`,
    `Current level and experience: ${state.currentLevel}`,
    `Intensity preference: ${state.intensity}`,
    `Session format: ${state.sessionDetails}`
  ].filter(Boolean).join('\n')

  return generateOutline(
    `Here is the complete picture of this advisor's learning needs:\n\n${collectedAnswers}\n\nNow generate the complete course outline.`
  )
}

// ── Session delivery ───────────────────────────────────────────────────────

async function handleSession (req, body, res) {
  const { query, sessionHistory = [], sessionContext, advisorProfile, orgTemplateIds } = body
  if (!query) { return sendError(res, 400, 'QUERY_REQUIRED', 'query is required') }

  const openai = getOpenAI()

  const templates = getOrgTemplates(orgTemplateIds || null)
  const focusQuery = [sessionContext?.focus, sessionContext?.title, ...(sessionContext?.resources || [])].filter(Boolean).join(' ') || query
  const filtered = filterTemplatesByQuery(templates, focusQuery)
  const templateContext = formatTemplatesForPrompt(filtered)

  const sessionInject = sessionContext
    ? '\n\n## This session\n\n' +
      `Session ${sessionContext.id}: ${sessionContext.title}\n` +
      `Focus: ${sessionContext.focus}\n` +
      `Objectives:\n${(sessionContext.objectives || []).map(o => '- ' + o).join('\n')}\n` +
      `Resources: ${(sessionContext.resources || []).join(', ')}\n` +
      `Estimated duration: ${sessionContext.estimatedMinutes || sessionContext.estimatedHours * 60 || 30} minutes`
    : ''

  // Domain support context — match session topic to the relevant domain support JSON
  const domainQuery = focusQuery
  const domainId = detectDomainForSession(domainQuery)
  const domainContext = domainId
    ? '\n\n' + formatDomainContextForSession(domainId, sessionContext?.resources || [])
    : ''

  // Logic tree reference — match session topic to a learn-mode logic tree
  const logicTree = detectLogicTree(domainQuery)
  const logicTreeContext = logicTree ? '\n\n' + (buildLearnReferenceText(logicTree) || '') : ''

  const advisorContext = advisorProfile
    ? '\n\n## Advisor profile\n\n' +
      Object.entries(advisorProfile)
        .filter(([, v]) => v && v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    : ''

  const systemPrompt = loadPrompt('course-session') +
    sessionInject + domainContext + logicTreeContext + advisorContext +
    '\n\n## Available templates and resources\n\n' + templateContext

  const messages = [
    { role: 'system', content: systemPrompt },
    ...sessionHistory,
    { role: 'user', content: query }
  ]

  sseHeaders(res)
  sseWrite(res, { type: 'state', state: {} })

  let stream
  try {
    stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 2000,
      stream: true
    }, { timeout: 45000 })
  } catch (createErr) {
    console.error('[course:session] OpenAI create failed:', createErr.message)
    sseWrite(res, { type: 'error', message: 'AI response timed out. Please try again.' })
    sseWrite(res, { type: 'done' })
    res.end()
    return
  }

  try {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || ''
      if (delta) { sseWrite(res, { type: 'delta', text: delta }) }
    }
  } catch (streamErr) {
    console.error('[course:session] Stream error:', streamErr.message)
  }

  sseWrite(res, { type: 'done' })
  res.end()
}

// ── Quiz generation ────────────────────────────────────────────────────────

async function handleQuizGenerate (body, res) {
  const { sessionContext, sessionHistory = [] } = body

  // Fixed override questions take priority over AI generation
  const overrides = getQuizOverrides()
  const sessionKey = sessionContext?.title || ''
  if (overrides.overrides && overrides.overrides[sessionKey]) {
    return jsonResponse(res, 200, { success: true, questions: overrides.overrides[sessionKey] })
  }

  const openai = getOpenAI()

  const sessionSummary = sessionHistory
    .filter(m => m.role === 'assistant')
    .map(m => m.content)
    .join('\n\n')
    .slice(0, 3000)

  const prompt = `Generate exactly 3 quiz questions to test an advisor's understanding of a course session.

Session title: ${sessionContext?.title || 'Unknown'}
Session objectives: ${(sessionContext?.objectives || []).join('; ')}
Session content covered (AI responses):
${sessionSummary}

Requirements:
- Open-ended questions (not multiple choice)
- Test conceptual understanding, not memorisation
- Each question must relate to a session objective
- Answerable in 2-4 sentences

Return ONLY valid JSON with no other text:
{"questions":[{"id":1,"question":"...","objective":"..."},{"id":2,"question":"...","objective":"..."},{"id":3,"question":"...","objective":"..."}]}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      response_format: { type: 'json_object' }
    })
    const data = JSON.parse(completion.choices[0].message.content)
    const result = validateQuizGenerate(data)
    if (!result.valid) {
      console.error('[course:quiz-generate] invalid AI response shape:', result.errors.join('; '))
      return sendError(res, 500, 'QUIZ_GENERATE_FAILED', 'Failed to generate quiz questions')
    }
    jsonResponse(res, 200, { success: true, questions: result.data.questions })
  } catch (e) {
    console.error('[course:quiz-generate]', e.message)
    sendError(res, 500, 'QUIZ_GENERATE_FAILED', 'Failed to generate quiz questions')
  }
}

// ── Quiz grading ───────────────────────────────────────────────────────────

async function handleQuizGrade (body, res) {
  const { question, answer, sessionContext } = body
  if (!question || !answer) {
    return sendError(res, 400, 'PARAMS_REQUIRED', 'question and answer are required')
  }

  const openai = getOpenAI()

  const prompt = `Grade an advisor's quiz answer for a professional development course.

Session: ${sessionContext?.title || 'Unknown'}
Question: ${question.question}
Related objective: ${question.objective || 'Not specified'}
Advisor's answer:
${fenceUntrusted(String(answer).slice(0, 1000))}

Evaluate whether this answer demonstrates understanding of the objective. Return ONLY valid JSON:
{"passed":true,"score":80,"feedback":"Specific, encouraging 2-3 sentence feedback explaining what was correct, what was missing if anything, and a key point to remember."}

Scoring: 70+ = passed. Be generous — genuine understanding expressed imperfectly should still pass. A low score must include specific guidance on what to revisit.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      response_format: { type: 'json_object' }
    })
    const data = JSON.parse(completion.choices[0].message.content)
    const result = validateQuizGrade(data)
    if (!result.valid) {
      console.error('[course:quiz-grade] invalid AI response shape:', result.errors.join('; '))
      return sendError(res, 500, 'QUIZ_GRADE_FAILED', 'Failed to grade answer')
    }
    jsonResponse(res, 200, { success: true, passed: result.data.passed, score: result.data.score, feedback: result.data.feedback })
  } catch (e) {
    console.error('[course:quiz-grade]', e.message)
    sendError(res, 500, 'QUIZ_GRADE_FAILED', 'Failed to grade answer')
  }
}

// ── Progress record (platform integration hook) ────────────────────────────

function handleProgress (body, res) {
  const { advisorId, courseId, sessionId, score } = body

  // Phase 1: stub — platform team wires this to their account/reporting system in Phase 2
  // Phase 2: persist progress to MySQL and update firm-level reporting
  CourseReminderService.markComplete({ advisorId, courseId, sessionId, score })

  jsonResponse(res, 200, { success: true })
}

// ── Request body parser ────────────────────────────────────────────────────

function parseBody (req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

// ── Main middleware export ─────────────────────────────────────────────────

module.exports = async function (req, res) {
  if (!checkCourseLimit(req, res)) { return }

  let body
  try {
    body = await parseBody(req)
  } catch (e) {
    return sendError(res, 400, 'INVALID_JSON', 'Request body must be valid JSON')
  }

  if (!body || typeof body !== 'object') {
    return sendError(res, 400, 'INVALID_BODY', 'Request body must be a JSON object')
  }

  // Cap query length
  if (typeof body.query === 'string') {
    body.query = body.query.slice(0, 4000)
  }

  try {
    switch (body.type) {
      case 'design':
        await handleDesign(req, body, res)
        break
      case 'session':
        await handleSession(req, body, res)
        break
      case 'quiz-generate':
        await handleQuizGenerate(body, res)
        break
      case 'quiz-grade':
        await handleQuizGrade(body, res)
        break
      case 'progress':
        handleProgress(body, res)
        break
      default:
        sendError(res, 400, 'INVALID_TYPE', 'type must be: design, session, quiz-generate, quiz-grade, or progress')
    }
  } catch (e) {
    console.error('[course] Unhandled error:', e.message)
    if (!res.headersSent) {
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred')
    }
    if (!res.writableEnded) { res.end() }
  }
}
