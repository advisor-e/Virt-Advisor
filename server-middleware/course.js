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
const OpenAI = require('openai')
const { getOrgTemplates, filterTemplatesByQuery, formatTemplatesForPrompt } = require('../server/utils/templates')
const { sendError } = require('../server/utils/sendError')
const CourseReminderService = require('../server/services/CourseReminderService')

// Prompt cache — loaded once per process
const _promptCache = {}
function loadPrompt (name) {
  if (_promptCache[name]) { return _promptCache[name] }
  const filePath = path.resolve(process.cwd(), 'data/prompts', name + '.txt')
  const content = fs.readFileSync(filePath, 'utf8')
  _promptCache[name] = content
  return content
}

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

function sseHeaders (res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  })
}

function jsonResponse (res, status, payload) {
  if (res.headersSent) { return }
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

// ── Design conversation ────────────────────────────────────────────────────

async function handleDesign (body, res) {
  const { query, conversationHistory = [], advisorProfile, orgTemplateIds, courseState = {} } = body
  if (!query) { return sendError(res, 400, 'QUERY_REQUIRED', 'query is required') }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const templates = getOrgTemplates(orgTemplateIds || null)
  const filtered = filterTemplatesByQuery(templates, query)
  const templateContext = formatTemplatesForPrompt(filtered)

  const systemPrompt = loadPrompt('course-design') +
    '\n\n## Available templates and resources\n\n' + templateContext

  const advisorContext = advisorProfile
    ? '\n\n## Advisor profile\n\n' +
      Object.entries(advisorProfile)
        .filter(([, v]) => v && v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    : ''

  const messages = [
    { role: 'system', content: systemPrompt + advisorContext },
    ...conversationHistory,
    { role: 'user', content: query }
  ]

  sseHeaders(res)
  sseWrite(res, { type: 'state', state: courseState })

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 2000,
    stream: true
  })

  let fullText = ''
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || ''
    if (delta) {
      fullText += delta
      sseWrite(res, { type: 'delta', text: delta })
    }
  }

  // Extract course outline if AI included one
  const outlineMatch = fullText.match(/\[COURSE_OUTLINE\]([\s\S]*?)\[\/COURSE_OUTLINE\]/)
  const newState = { ...courseState }
  if (outlineMatch) {
    try {
      newState.pendingOutline = JSON.parse(outlineMatch[1].trim())
    } catch (e) {
      console.warn('[course:design] Could not parse course outline JSON:', e.message)
    }
  }

  sseWrite(res, { type: 'state', state: newState })
  sseWrite(res, { type: 'done' })
  res.end()
}

// ── Session delivery ───────────────────────────────────────────────────────

async function handleSession (body, res) {
  const { query, sessionHistory = [], sessionContext, advisorProfile, orgTemplateIds } = body
  if (!query) { return sendError(res, 400, 'QUERY_REQUIRED', 'query is required') }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const templates = getOrgTemplates(orgTemplateIds || null)
  const focusQuery = [sessionContext?.focus, sessionContext?.title].filter(Boolean).join(' ') || query
  const filtered = filterTemplatesByQuery(templates, focusQuery)
  const templateContext = formatTemplatesForPrompt(filtered)

  const sessionInject = sessionContext
    ? '\n\n## This session\n\n' +
      `Session ${sessionContext.id}: ${sessionContext.title}\n` +
      `Focus: ${sessionContext.focus}\n` +
      `Objectives:\n${(sessionContext.objectives || []).map(o => '- ' + o).join('\n')}\n` +
      `Resources: ${(sessionContext.resources || []).join(', ')}\n` +
      `Estimated duration: ${sessionContext.estimatedHours || 1.5} hours`
    : ''

  const advisorContext = advisorProfile
    ? '\n\n## Advisor profile\n\n' +
      Object.entries(advisorProfile)
        .filter(([, v]) => v && v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    : ''

  const systemPrompt = loadPrompt('course-session') +
    sessionInject + advisorContext +
    '\n\n## Available templates and resources\n\n' + templateContext

  const messages = [
    { role: 'system', content: systemPrompt },
    ...sessionHistory,
    { role: 'user', content: query }
  ]

  sseHeaders(res)
  sseWrite(res, { type: 'state', state: {} })

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 2000,
    stream: true
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || ''
    if (delta) { sseWrite(res, { type: 'delta', text: delta }) }
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

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
    jsonResponse(res, 200, { success: true, questions: data.questions || [] })
  } catch (e) {
    console.error('[course:quiz-generate]', e.message)
    jsonResponse(res, 500, { success: false, error: 'Failed to generate quiz questions' })
  }
}

// ── Quiz grading ───────────────────────────────────────────────────────────

async function handleQuizGrade (body, res) {
  const { question, answer, sessionContext } = body
  if (!question || !answer) {
    return jsonResponse(res, 400, { success: false, error: 'question and answer are required' })
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const prompt = `Grade an advisor's quiz answer for a professional development course.

Session: ${sessionContext?.title || 'Unknown'}
Question: ${question.question}
Related objective: ${question.objective || 'Not specified'}
Advisor's answer: ${String(answer).slice(0, 1000)}

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
    jsonResponse(res, 200, { success: true, passed: data.passed, score: data.score, feedback: data.feedback })
  } catch (e) {
    console.error('[course:quiz-grade]', e.message)
    jsonResponse(res, 500, { success: false, error: 'Failed to grade answer' })
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

module.exports = async function (req, res, next) {
  if (req.method !== 'POST') { return next() }

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
        await handleDesign(body, res)
        break
      case 'session':
        await handleSession(body, res)
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
