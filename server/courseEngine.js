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
const { loadFirmDomainSupport, loadFirmLogicTrees, readForSession } = require('../server/utils/firmContent')
const { groundOutlineResources } = require('../server/utils/outlineResources')
const { findQuizOverride, findQuizBank } = require('../server/utils/quizOverrides')
const { loadBlendedQuizBanks, isFirmAuthored } = require('../server/utils/quizConfig')
const { isClarificationRequest, prefillDesignState, requestedSessionCount, requestedSessionMinutes } = require('../server/utils/designInterview')
const { applyOutlineEffort, lengthNotice } = require('../server/utils/courseEffort')
const { sendError } = require('../server/utils/sendError')
const { validateQuizGenerate, validateQuizGrade, validateCourseOutline } = require('../server/utils/validateAIResponse')
const { fenceUntrusted } = require('../server/utils/promptSafety')
const CourseReminderService = require('../server/services/CourseReminderService')

// OpenAI singleton — one client per process, avoids creating a new connection pool on every request
let _openaiClient = null
function getOpenAI () {
  if (!_openaiClient) { _openaiClient = createOpenAIClient({ apiKey: process.env.OPENAI_API_KEY }) }
  return _openaiClient
}

// Lazy firmOverlay accessor (the advisorEngine pattern) — firmOverlay pulls in
// the MySQL pool via ./db, which must not load at require time.
let _loadFirmConfig = null
function loadFirmConfig (...args) {
  if (!_loadFirmConfig) { _loadFirmConfig = require('../server/utils/firmOverlay').loadFirmConfig }
  return _loadFirmConfig(...args)
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

// Code-controlled question sequence — asked one at a time before outline
// generation. `reask` is the plainer rephrase sent once when the advisor's
// reply asks for clarification instead of answering (CB-06; wording approved
// by Mike 2026-07-15). Questions already answered in the opening message are
// pre-filled by prefillDesignState and never asked.
const COURSE_DESIGN_QUESTIONS = [
  {
    field: 'currentLevel',
    text: "What's your current experience or confidence level in this area — have you had any prior training, coaching, or reading on this topic?",
    reask: "No problem — put simply: how much have you already done in this area? For example 'complete beginner', or 'some experience but no formal training'."
  },
  {
    field: 'intensity',
    text: 'Do you prefer each session to stay at a consistent level of depth throughout, or would you like the course to get progressively more challenging as you go?',
    reask: 'Let me put that another way: would you like every session to feel about the same level, or start easy and get harder as you go?'
  },
  {
    field: 'sessionDetails',
    text: 'How many minutes would you like each session to aim for, and how many sessions in total would you like to commit to?',
    reask: "Just the practical details: roughly how many minutes per session, and how many sessions? For example '30 minutes, 4 sessions'."
  }
]

function handleDesign (req, body, res) {
  const { query, advisorProfile, orgTemplateIds, courseState = {} } = body
  if (!query) { return sendError(res, 400, 'QUERY_REQUIRED', 'query is required') }

  const openai = getOpenAI()

  // Restore or initialise design pipeline state
  const state = Object.assign({
    goalsPrimary: null,
    currentLevel: null,
    intensity: null,
    sessionDetails: null,
    pendingOutline: null
  }, courseState)
  // Code-owned per-generation flags — never trusted from the round-trip
  // (CB-26, and the session-length figures computed alongside it).
  delete state.sessionCountNotice
  delete state.sessionLengthNotice
  delete state.courseMinutes
  delete state.courseUnknownCount

  // Helper: send a hardcoded question as instant SSE (no OpenAI call)
  function sendQuestion (text, newState) {
    sseHeaders(req, res)
    sseWrite(res, { type: 'state', state: newState })
    sseWrite(res, { type: 'delta', text })
    sseWrite(res, { type: 'done' })
    res.end()
  }

  // Helper: build full context and stream an AI-generated outline.
  // fallbackOutline (revision flow only): the advisor's previously approved
  // outline — restored whenever the AI's reply does not contain a valid
  // replacement, so a failed revision can never destroy an approved outline.
  // countText (CB-26): the advisor text carrying their requested session
  // count — the prompt asks the AI to honour it, but only code checks it.
  async function generateOutline (userMessage, fallbackOutline, countText) {
    const allUserText = [
      state.goalsPrimary,
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

    // Firm content overlay (Phase 0 — design/FIRM-EDITABLE-TABLES-PLAN.md §3):
    // identity from the firmAuth-verified req, never the body. A production storage
    // fault rejects rather than reading as "no override"; readForSession logs it and
    // designs the course from the platform content instead of failing the request.
    const firmDomainSupport = await readForSession(loadFirmDomainSupport, req.firmId, loadFirmConfig, 'course')
    const detectedDomains = detectDomainsForDesign(allUserText, firmDomainSupport)
    const domainSummaries = detectedDomains
      .map(id => formatDomainSummaryForDesign(id, firmDomainSupport))
      .filter(Boolean)
      .join('\n\n')

    const advisorContextStr = advisorProfile
      ? '\n\n## Advisor profile\n\n' +
        fenceUntrusted(Object.entries(advisorProfile)
          .filter(([, v]) => typeof v === 'string' && v.trim())
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n'))
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
      // Same user-facing message the session handler sends — the design screen
      // must never end a failed stream with nothing to show (CB-10).
      sseWrite(res, { type: 'error', message: 'AI response timed out. Please try again.' })
      sseWrite(res, { type: 'state', state: { ...state, pendingOutline: fallbackOutline || null } })
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
    // Commit-only-on-success: until a replacement outline validates, the final
    // state carries the fallback (the previously approved outline in the
    // revision flow, null otherwise) — never a malformed outline, which would
    // render a broken/blank course view.
    const finalState = { ...state, pendingOutline: fallbackOutline || null }
    if (outlineMatch) {
      try {
        const parsedOutline = JSON.parse(outlineMatch[1].trim())
        const result = validateCourseOutline(parsedOutline)
        if (result.valid) {
          // Ground every resource name in the firm's real template library —
          // the prompt forbids invented names, but only code enforces it (CB-02).
          const grounded = groundOutlineResources(result.data, templates)
          if (grounded.dropped.length) {
            console.warn('[course:design] Dropped invented resource names:', grounded.dropped.join(' | '))
          }
          // CB-27 rescue-snap audit: Original → Snapped, per the
          // AI-transformation logging rule.
          if (grounded.snapped.length) {
            console.warn('[course:design] Snapped near-miss resource names:', grounded.snapped.map(x => `'${x.from}' → '${x.to}'`).join(' | '))
          }
          // The real length of each session, computed from the resources the
          // AI just chose (video + reading + rehearsal per Mike's ruling
          // 2026-08-03). The AI's own `estimatedMinutes` was never a
          // measurement — the design prompt instructs it to copy the
          // advisor's requested number back — so it is replaced, not trusted.
          const aiMinutes = (grounded.outline.sessions || []).map(s => s.estimatedMinutes)
          const timed = applyOutlineEffort(grounded.outline, templates)
          // AI-transformation audit (Original → Final), per the house rule.
          console.warn('[course:design] Session minutes AI → computed:',
            timed.outline.sessions.map((s, i) => `${aiMinutes[i]}→${s.estimatedMinutes === undefined ? 'unpublished' : s.estimatedMinutes}`).join(', '))
          finalState.pendingOutline = timed.outline
          finalState.courseMinutes = timed.totalMinutes
          finalState.courseUnknownCount = timed.unknownCount

          // CB-26: the advisor asked for a specific session count — if the
          // delivered outline differs, code flags it (the outline card shows
          // the notice); the AI is never trusted to confess the deviation.
          const requested = requestedSessionCount(countText)
          if (requested && timed.outline.totalSessions !== requested) {
            console.warn(`[course:design] Session-count mismatch: requested ${requested}, delivered ${timed.outline.totalSessions}`)
            finalState.sessionCountNotice = { requested, delivered: timed.outline.totalSessions }
          }

          // The same check for the OTHER half of that one answer: sessions
          // whose real length misses what the advisor asked for. Flagged, not
          // corrected — the advisor already has 'Request changes', and a
          // silent re-plan would hide the mismatch rather than surface it.
          const notice = lengthNotice(timed.outline, requestedSessionMinutes(countText))
          if (notice) {
            console.warn(`[course:design] Session-length mismatch: requested ${notice.requested} min — ` +
              notice.sessions.map(s => `session ${s.id} is ${s.minutes} min`).join(', '))
            finalState.sessionLengthNotice = notice
          }
        } else {
          console.warn('[course:design] Course outline failed shape validation:', result.errors.join('; '))
        }
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
    const previousOutline = state.pendingOutline
    const existingOutline = JSON.stringify(previousOutline, null, 2)
    // Cleared for the in-stream state event only (no card flicker mid-reply);
    // previousOutline is passed as the fallback so a failed revision restores it.
    state.pendingOutline = null
    const revisionMessage = `The advisor has reviewed this course outline:\n\n${existingOutline}\n\nThey want the following changes:\n${fenceUntrusted(query)}\n\nPlease revise the outline accordingly and present the updated version.`
    // Count check against the revision instruction itself — only a count named
    // NOW is a live request (a previously accepted deviation is not re-flagged).
    return generateOutline(revisionMessage, previousOutline, query)
  }

  // ── Case 2: First message — capture the goal, pre-fill what it answers ──
  if (!state.goalsPrimary) {
    state.goalsPrimary = query
    // Questions the opening message confidently answers are never asked (CB-06).
    prefillDesignState(state, query)
    // Fall straight through to pipeline — no separate Q1 needed
  }

  // ── Case 3: Discovery pipeline — ask one question at a time ──
  for (const q of COURSE_DESIGN_QUESTIONS) {
    if (!state[q.field]) {
      state[q.field] = 'pending'
      return sendQuestion(q.text, state)
    }
    if (state[q.field] === 'pending') {
      // A question about the question → re-ask once in plainer words, never
      // store it as the answer. Capped at one re-ask so it cannot loop; a
      // second unclear reply is accepted as the answer (CB-06).
      const reaskFlag = q.field + 'Reasked'
      if (isClarificationRequest(query) && !state[reaskFlag]) {
        state[reaskFlag] = true
        return sendQuestion(q.reask, state)
      }
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

  // The answers are raw advisor typing — fenced so they read as data (CB-09).
  return generateOutline(
    `Here is the complete picture of this advisor's learning needs:\n\n${fenceUntrusted(collectedAnswers)}\n\nNow generate the complete course outline.`,
    undefined,
    state.sessionDetails
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

  // sessionContext round-trips through the browser, so it is client-controlled
  // at arrival — fenced before it enters the system prompt (CB-14).
  const sessionObjectives = Array.isArray(sessionContext?.objectives) ? sessionContext.objectives : []
  const sessionResources = Array.isArray(sessionContext?.resources) ? sessionContext.resources : []
  const sessionInject = sessionContext
    ? '\n\n## This session\n\n' +
      fenceUntrusted(
        `Session ${sessionContext.id}: ${sessionContext.title}\n` +
        `Focus: ${sessionContext.focus}\n` +
        `Objectives:\n${sessionObjectives.map(o => '- ' + o).join('\n')}\n` +
        `Resources: ${sessionResources.join(', ')}\n` +
        `Estimated duration: ${sessionContext.estimatedMinutes || sessionContext.estimatedHours * 60 || 30} minutes`
      )
    : ''

  // Domain support context — match session topic to the relevant domain support JSON.
  // Firm content overlays (Phase 0 — design/FIRM-EDITABLE-TABLES-PLAN.md §3):
  // identity from the firmAuth-verified req, never the body. As above, a production
  // storage fault is logged and the session runs on the platform content.
  const firmDomainSupport = await readForSession(loadFirmDomainSupport, req.firmId, loadFirmConfig, 'course')
  const firmLogicTrees = await readForSession(loadFirmLogicTrees, req.firmId, loadFirmConfig, 'course')
  const domainQuery = focusQuery
  const domainId = detectDomainForSession(domainQuery, firmDomainSupport)
  const domainContext = domainId
    ? '\n\n' + formatDomainContextForSession(domainId, firmDomainSupport)
    : ''

  // Logic tree reference — match session topic to a learn-mode logic tree
  const logicTree = detectLogicTree(domainQuery, firmLogicTrees)
  const logicTreeContext = logicTree ? '\n\n' + (buildLearnReferenceText(logicTree) || '') : ''

  const advisorContext = advisorProfile
    ? '\n\n## Advisor profile\n\n' +
      fenceUntrusted(Object.entries(advisorProfile)
        .filter(([, v]) => typeof v === 'string' && v.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'))
    : ''

  const systemPrompt = loadPrompt('course-session') +
    sessionInject + domainContext + logicTreeContext + advisorContext +
    '\n\n## Available templates and resources\n\n' + templateContext

  const messages = [
    { role: 'system', content: systemPrompt },
    ...sessionHistory,
    { role: 'user', content: query }
  ]

  sseHeaders(req, res)
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

async function handleQuizGenerate (req, body, res) {
  const { sessionContext, sessionHistory = [] } = body

  // Fixed override questions take priority over AI generation — matched on
  // session title, then resource/template names (the stable key; CB-12).
  const overrides = getQuizOverrides()
  const overrideQuestions = findQuizOverride(overrides.overrides, sessionContext)
  if (overrideQuestions) {
    return jsonResponse(res, 200, { success: true, questions: overrideQuestions })
  }

  const openai = getOpenAI()

  // CB-30: a firm-authored question bank (keyed by the template the session
  // teaches from) is mandatory source material — the AI tailors the bank's
  // questions to the session, never invents its own.
  //
  // CB-31: a question typed into the Firm Manager screen at runtime is untrusted
  // input however trusted the manager who wrote it — a "question" could be
  // phrased as an instruction to the model. Firm-authored questions are therefore
  // fenced; Advisor-e's are repo data and stay unfenced, leaving the tuned
  // CB-29/CB-30 prompt behaviour unchanged.
  //
  // 2026-07-31: the banks now come from the MECHANISM, not straight off disk.
  // Two things change. (1) A firm's saved quiz material finally reaches the AI —
  // until now the engine read the shipped file directly, so a firm could save,
  // see it on screen, and every course still used ours. (2) Fencing is PER
  // QUESTION, because one bank can now hold Advisor-e's questions and the firm's
  // side by side; fencing the whole block would smother ours in delimiters the
  // prompt was never tuned for, and fencing none of it would open the standard
  // prompt-injection route. A bank with no firm content produces byte-identical
  // text to before — locked by a test.
  const banks = await loadBlendedQuizBanks(req.firmId, loadFirmConfig)
  const bank = findQuizBank(banks, sessionContext)
  // Provenance: which bank answered. `bankRef` (already on every question) is
  // only an entry NUMBER — meaningless without the bank it belongs to, so the
  // advisor's quiz review and any manager view cannot say where a question came
  // from. The key is resolved by identity rather than changing findQuizBank's
  // return shape, which the grader and its tests also depend on.
  //
  // Identity ONLY — never the entries. The firm's model answers stay withheld
  // until after grading (see handleQuizGrade), or the browser would hold the
  // answers before the advisor writes theirs.
  const bankKey = bank
    ? (Object.keys(banks).find(k => banks[k] === bank) || null)
    : null
  const bankEntries = bank
    ? bank.entries.map((e) => {
      const line = `Entry ${e.id}\nQuestion: ${e.question}\nKey point: ${e.keyPoint}`
      return isFirmAuthored(e) ? fenceUntrusted(line) : line
    }).join('\n')
    : ''
  const bankBlock = bank
    ? '\nFirm-authored question bank for the template this session teaches from (mandatory source material):\n' +
      bankEntries + '\n'
    : ''
  const factRequirements = bank
    ? `- Build every question from the firm-authored question bank above: choose the 3 entries most relevant to the session content covered, and tailor each to that content — adapt wording and scenario details, keep the entry's substance and key point. Never copy an entry word-for-word and never ask anything the bank does not cover.
- Each question must carry "bankRef": the id of the bank entry it is built from.`
    : `- Questions 1 and 2 must test the specific facts, frameworks, or key points actually taught in the session content above — for example: name the stages, list the components, state what the framework says. The advisor must show they absorbed the material, not just give their opinion of it.
- Only ask about facts that appear in the session content above — never test general knowledge the session did not cover.`
  const jsonShape = bank
    ? '{"questions":[{"id":1,"question":"...","objective":"...","bankRef":1},{"id":2,"question":"...","objective":"...","bankRef":2},{"id":3,"question":"...","objective":"...","bankRef":3}]}'
    : '{"questions":[{"id":1,"question":"...","objective":"..."},{"id":2,"question":"...","objective":"..."},{"id":3,"question":"...","objective":"..."}]}'

  const sessionSummary = sessionHistory
    .filter(m => m.role === 'assistant')
    .map(m => m.content)
    .join('\n\n')
    .slice(0, 3000)

  // Client-supplied at arrival — fenced so it reads as data (CB-14).
  const quizObjectives = Array.isArray(sessionContext?.objectives) ? sessionContext.objectives : []
  const prompt = `Generate exactly 3 quiz questions to test an advisor's understanding of a course session.

Session details and content covered (AI responses):
${fenceUntrusted(
    `Session title: ${sessionContext?.title || 'Unknown'}\n` +
    `Session objectives: ${quizObjectives.join('; ')}\n` +
    `Session content covered:\n${sessionSummary}`
  )}
${bankBlock}
Requirements:
- Open-ended questions (not multiple choice)
${factRequirements}
- Question 3 must ask the advisor to apply what was taught to their own practice or a client situation.
- Each question must relate to a session objective
- Answerable in 2-4 sentences

Return ONLY valid JSON with no other text:
${jsonShape}`

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
    jsonResponse(res, 200, {
      success: true,
      questions: result.data.questions,
      // null when the session's page has no authored bank — the questions were
      // written from the session content, and the screen says so rather than
      // implying a firm source that does not exist.
      bank: bank ? { key: bankKey, source: bank.source || null, origin: bank.origin || 'platform' } : null
    })
  } catch (e) {
    console.error('[course:quiz-generate]', e.message)
    sendError(res, 500, 'QUIZ_GENERATE_FAILED', 'Failed to generate quiz questions')
  }
}

// ── Quiz grading ───────────────────────────────────────────────────────────

async function handleQuizGrade (req, body, res) {
  const { question, answer, sessionContext, sessionHistory = [] } = body
  if (!question || !answer) {
    return sendError(res, 400, 'PARAMS_REQUIRED', 'question and answer are required')
  }

  const openai = getOpenAI()

  // Same capped session summary quiz-generate uses — the marker must judge
  // against what was actually taught, not GPT-4o's general knowledge (CB-04).
  const sessionSummary = sessionHistory
    .filter(m => m.role === 'assistant')
    .map(m => m.content)
    .join('\n\n')
    .slice(0, 3000)

  // CB-30: when the question was built from a firm-authored bank entry, the
  // firm's model answer is the authoritative marking guide (extends CB-04).
  // bankRef arrives from the client but only SELECTS a server-held entry —
  // the marking-guide text itself is never client-supplied.
  // CB-31: a question typed into the Firm Manager screen is fenced here for the
  // same reason as in quiz generation — and, since 2026-07-31, per QUESTION: the
  // marking guide is one entry, so what matters is who wrote THAT entry, not what
  // else its bank contains.
  //
  // The bank is resolved the same way generation resolved it, so the entry
  // numbers match. (If a manager edits the quiz between an advisor being asked
  // and answering, the numbering can shift under them — the same exposure any
  // mid-course config change has, and no worse than the previous behaviour.)
  const bank = findQuizBank(await loadBlendedQuizBanks(req.firmId, loadFirmConfig), sessionContext)
  const bankRef = question && Number.isInteger(question.bankRef) ? question.bankRef : null
  const bankEntry = (bank && bankRef !== null && bank.entries.find(e => e.id === bankRef)) || null
  const guideBody = bankEntry
    ? `Model answer: ${bankEntry.answer}\nKey point: ${bankEntry.keyPoint}`
    : ''
  const markingGuide = bankEntry
    ? `Firm-authored marking guide (authoritative — this defines what counts as correct):
${isFirmAuthored(bankEntry) ? fenceUntrusted(guideBody) : guideBody}

`
    : ''

  // Title, question, objective and summary are client-supplied at arrival —
  // fenced so they read as data (CB-14); the answer was already fenced.
  const prompt = `Grade an advisor's quiz answer for a professional development course.

Question and session details:
${fenceUntrusted(
    `Session: ${sessionContext?.title || 'Unknown'}\n` +
    `Question: ${question.question}\n` +
    `Related objective: ${question.objective || 'Not specified'}\n` +
    `Session content covered (what was taught):\n${sessionSummary || 'Not available'}`
  )}
${markingGuide}Advisor's answer:
${fenceUntrusted(String(answer).slice(0, 1000))}

Evaluate whether this answer demonstrates understanding of the objective, judged ${bankEntry ? 'first against the firm-authored marking guide above, then ' : ''}against the session content above where provided. Return ONLY valid JSON:
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
    const payload = { success: true, passed: result.data.passed, score: result.data.score, feedback: result.data.feedback }
    // The firm's model answer is revealed only AFTER grading — it must never
    // ride quiz-generate, or the browser would hold the answers before the
    // advisor writes theirs. AI-generated (bankless) questions have no
    // authored answer and must never fabricate one.
    if (bankEntry) {
      payload.modelAnswer = bankEntry.answer
      payload.modelKeyPoint = bankEntry.keyPoint
    }
    jsonResponse(res, 200, payload)
  } catch (e) {
    console.error('[course:quiz-grade]', e.message)
    sendError(res, 500, 'QUIZ_GRADE_FAILED', 'Failed to grade answer')
  }
}

// ── Progress record (platform integration hook) ────────────────────────────

function handleProgress (req, body, res) {
  // Identity from the verified JWT (firmAuth attaches req.advisorId) — never
  // the body: a crafted request must not log completions against another
  // advisor (CB-16 Stage C). Course-document persistence rides the Stage D
  // PUT /api/courses/:id; completions reporting rides /api/activity/log-course.
  const advisorId = req.advisorId
  if (!advisorId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const { courseId, sessionId, score } = body

  CourseReminderService.markComplete({ advisorId, courseId, sessionId, score })

  jsonResponse(res, 200, { success: true })
}

// ── Request body parser ────────────────────────────────────────────────────

// 256 KB — matches advisorEngine's BODY_LIMIT; protects this (unauthenticated-
// at-the-body-parse-stage) route against a memory-exhaustion DoS.
const BODY_LIMIT = 256 * 1024

function parseBody (req) {
  return new Promise((resolve, reject) => {
    let data = ''
    let size = 0
    let rejected = false
    req.on('data', (chunk) => {
      if (rejected) { return }
      size += chunk.length
      if (size > BODY_LIMIT) {
        rejected = true
        const err = new Error('Request body too large')
        err.code = 'BODY_TOO_LARGE'
        req.socket && req.socket.destroy()
        reject(err)
        return
      }
      data += chunk
    })
    req.on('end', () => {
      if (rejected) { return }
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
    if (e && e.code === 'BODY_TOO_LARGE') {
      return sendError(res, 413, 'BODY_TOO_LARGE', 'Request body too large')
    }
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
        await handleQuizGenerate(req, body, res)
        break
      case 'quiz-grade':
        await handleQuizGrade(req, body, res)
        break
      case 'progress':
        handleProgress(req, body, res)
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

// Exposed for unit testing (the default export is the Restify handler).
module.exports.parseBody = parseBody
module.exports.BODY_LIMIT = BODY_LIMIT
