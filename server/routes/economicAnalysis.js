'use strict'

/**
 * Economic Analysis — the Three-Way Forecast's optional market research. Restify routes.
 *
 * Item 4.66, asked for by Mike 2026-09-03: *"i want to include an option to tick 'economic
 * analysis' which then charges AI to conduct global and local market research … since the
 * majority of 3 way forecasts are used to support funding requests"*. Built on his
 * instruction of 2026-09-06 (*"build the economic analysis"*), slice 1 — the engine.
 *
 * Artefacts this is built against, and must be compared with before anything ships:
 *   · `design/ECONOMIC-ANALYSIS-PROMPT.md`   — the prompt, section by section
 *   · `design/ECONOMIC-ANALYSIS-TEST-RUNS.md` — four live runs, the evidence
 *   · `design/mockups/three-way-forecast-economic-analysis.html` — six screens
 *
 * 🔴 THIS IS THE FIRST AI CALL IN THE REPORT AREA, so the boundaries are worth stating
 * rather than assuming. The key is read from `process.env` on the backend and nowhere
 * else; nothing about a client is assembled by the app; the advisor's brief is the only
 * client-derived content and it is fenced before it reaches the model.
 *
 * 🔴 THE APP SENDS NOTHING ABOUT THE CLIENT ON ITS OWN — Mike's privacy ruling, 2026-09-06.
 * Not the client's name, not a figure from the forecast, not the file they uploaded. The
 * whole client-derived payload is `brief`, typed by the advisor, shown back to them
 * verbatim before they press the button. That is why this feature needs no PII exception:
 * there is no PII for the app to strip, because the app never assembles any.
 *
 * ⚠ THE ONE RESIDUAL RISK, AND IT IS NOT CLOSED IN CODE. An advisor can type a client's
 * name into the brief. The app will never do it and a filter that half-worked would be
 * worse than an honest warning, so the control is the ruling itself — they see the exact
 * words that will be sent. The screen carries that caution (slice 2).
 *
 * ⚠ IT MUST STREAM. A research run takes 83–102 seconds. A non-streamed POST would spend
 * nearly all of that with no bytes on the socket and trip the client's own inactivity
 * guard; streaming also gives the waiting screen the model's real searches to show.
 *
 * Node 14, CommonJS.
 */

const { createOpenAIClient } = require('../utils/openaiClient')
const { fenceUntrusted } = require('../utils/promptSafety')
const { sendError } = require('../utils/sendError')
const { assemblePrompt, loadResolvedAiPromptOverrides } = require('../utils/aiPrompts')
const { loadFirmConfig } = require('../utils/firmOverlay')
const { validateResearch } = require('../report/economicAnalysis/researchResult')
const runsStore = require('../utils/economicAnalysisRuns')

/** The prompt this route runs, as declared in `data/ai-prompts.json`. */
const PROMPT_ID = 'economic-analysis'

/**
 * The model, and the one value in this build that the evidence does NOT pin down.
 *
 * ⚠ `design/ECONOMIC-ANALYSIS-TEST-RUNS.md` records the timings, costs, search counts and
 * output of four live runs, but never names the model they were made with — the script was
 * outside the repository and is gone. Everything else here is read off the artefacts; this
 * is a judgement, kept in one place so it is one edit to correct. It must be confirmed
 * against a live run before the feature ships.
 */
const MODEL = 'gpt-4o'

/** Standard web search on the Responses API — not deep research (prompt file §2). */
const TOOLS = [{ type: 'web_search' }]

/**
 * Socket inactivity guard. Streaming keeps traffic flowing, so this is a stall detector
 * and not a duration cap: the longest observed run was 102 seconds end to end, but a
 * single web search inside it can be quiet for a while.
 */
const IDLE_TIMEOUT_MS = 120000

/**
 * Brief length bounds.
 *
 * The floor is not tidiness. A two-word brief produces research about nothing in
 * particular, costs the same, and takes the same minute and a half — and the screens' own
 * hint list asks for four things. The ceiling bounds the untrusted surface and the bill.
 */
const MIN_BRIEF_CHARS = 40
const MAX_BRIEF_CHARS = 2000

/** Injected in tests. */
let _clientFactory = createOpenAIClient

/** Test seam: swap the OpenAI client factory. @param {Function} [factory] */
function _setClientFactory (factory) {
  _clientFactory = factory || createOpenAIClient
}

/** One line per completed call, matching the `[openai]` format the advisor engine uses. */
function logCall (runId, startedAt, success, usage, searches) {
  const latency = Date.now() - startedAt
  const tokens = usage
    ? 'prompt=' + usage.input_tokens + ' completion=' + usage.output_tokens + ' total=' + usage.total_tokens
    : 'tokens=unknown'
  console.log('[openai] economic-analysis run=' + runId + ' model=' + MODEL +
    ' status=' + (success ? 'ok' : 'error') + ' latency=' + latency + 'ms ' +
    tokens + ' searches=' + searches)
}

/**
 * Today, as the prompt's §2 wants it — a date a model cannot misread, from the server.
 * @returns {string} e.g. "6 September 2026"
 */
function todayInWords (now) {
  const d = now instanceof Date ? now : new Date()
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return d.getUTCDate() + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCFullYear()
}

/**
 * Builds the text sent to the model: the assembled prompt with its two placeholders
 * filled in.
 *
 * 🔴 SUBSTITUTION IS `split`/`join`, NOT `String.replace`. A replacement string containing
 * `$&` or `$1` is interpreted by `replace`, so an advisor whose brief happened to contain
 * one would have their own text rewritten on the way to the model. This is the same class
 * of fault as an unfenced prompt and is closed the same way — by never letting advisor
 * text be interpreted as anything.
 *
 * The brief is fenced before it is substituted, so what lands in §2 is the guard line and
 * the delimited block, exactly where that section's own words say the brief will be.
 *
 * @param {object} assembled - the result of `assemblePrompt`
 * @param {string} brief - the advisor's own words, unfenced
 * @param {Date} [now]
 * @returns {string}
 */
function fillPlaceholders (assembled, brief, now) {
  return assembled.text
    .split('{{today}}').join(todayInWords(now))
    .split('{{advisorBrief}}').join(fenceUntrusted(brief))
}

/**
 * Reads one streamed event for progress, defensively.
 *
 * Every branch here is optional: an event shape this does not recognise is ignored rather
 * than throwing. Progress is a courtesy to the waiting screen and must never be able to
 * fail a run that is otherwise going fine.
 *
 * @param {object} run
 * @param {object} event
 * @returns {object|null} the completed response, when this event carries one
 */
function readEvent (run, event) {
  if (!event || typeof event.type !== 'string') { return null }

  if (event.type === 'response.output_item.added' || event.type === 'response.output_item.done') {
    const item = event.item
    if (item && item.type === 'web_search_call' && event.type === 'response.output_item.added') {
      const query = item.action && item.action.query
      runsStore.recordSearch(run, query || '')
    }
    return null
  }

  if (event.type === 'response.completed') {
    return event.response || null
  }

  return null
}

/**
 * Runs the research. Never rejects: it records its own outcome on the run, because an
 * unhandled rejection from a promise nobody is awaiting would take the process down.
 *
 * @param {object} run
 * @param {string} promptText
 * @returns {Promise<void>}
 */
async function runResearch (run, promptText) {
  const startedAt = Date.now()

  try {
    const client = _clientFactory({ apiKey: process.env.OPENAI_API_KEY })
    const events = await client.responses.create(
      { model: MODEL, input: promptText, tools: TOOLS, stream: true },
      { timeout: IDLE_TIMEOUT_MS }
    )

    let completed = null
    for await (const event of events) {
      const response = readEvent(run, event)
      if (response) { completed = response }
    }

    if (!completed) {
      logCall(run.runId, startedAt, false, null, run.searchCount)
      runsStore.failRun(run, 'RESEARCH_INCOMPLETE',
        'The research did not finish. Nothing has been saved — run it again.')
      return
    }

    const checked = validateResearch(completed)
    logCall(run.runId, startedAt, checked.ok, completed.usage, run.searchCount)

    if (!checked.ok) {
      // The detail is for the log and for whoever reads it next — never for the response.
      console.error('[economic-analysis] run ' + run.runId + ' refused: ' +
        checked.error.code + ' ' + JSON.stringify(checked.error.detail))
      runsStore.failRun(run, checked.error.code, checked.error.message)
      return
    }

    runsStore.completeRun(run, checked.data)
  } catch (err) {
    logCall(run.runId, startedAt, false, null, run.searchCount)
    console.error('[economic-analysis] run ' + run.runId + ' failed:', err.message)
    runsStore.failRun(run, 'RESEARCH_FAILED',
      'The research could not be completed. Nothing has been saved — try again in a moment.')
  }
}

/**
 * POST /api/report/economic-analysis  (firmAuth)
 *
 * Starts a research run and returns immediately with a run to poll — 83 to 102 seconds is
 * far past the 2000 ms page-render rule in `CLAUDE.md`, which is the same reason Meeting
 * Review returns a job twice.
 *
 * @route POST /api/report/economic-analysis
 * @param {object} req.body - `{ brief: string, clientRef?: string }`
 * @returns {{started: true, runId: string, runNumber: number}}
 */
async function startResearch (req, res) {
  const body = req.body || {}
  const brief = typeof body.brief === 'string' ? body.brief.trim() : ''

  if (brief.length < MIN_BRIEF_CHARS) {
    return sendError(res, 400, 'BRIEF_TOO_SHORT',
      'Say a little more about the business before researching — what it does, where it operates, and what the finance is for.')
  }
  if (brief.length > MAX_BRIEF_CHARS) {
    return sendError(res, 400, 'BRIEF_TOO_LONG',
      'That brief is longer than ' + MAX_BRIEF_CHARS + ' characters. Shorten it to the things a researcher could not guess.')
  }

  const clientRef = typeof body.clientRef === 'string' ? body.clientRef.slice(0, 100) : null
  const already = runsStore.countInContext(req.firmId, req.advisorId, clientRef)
  if (already >= runsStore.MAX_RUNS_PER_CONTEXT) {
    return sendError(res, 429, 'TOO_MANY_RUNS',
      'This forecast has had ' + already + ' research runs. Start a new forecast, or use one of the runs you already have.')
  }

  let promptText
  try {
    const overrides = await loadResolvedAiPromptOverrides(req.firmId, loadFirmConfig)
    const assembled = assemblePrompt(PROMPT_ID, overrides)
    if (assembled.blocked) {
      return sendError(res, 409, 'PROMPT_BLOCKED',
        'A setting this prompt needs has not been filled in. A firm manager can set it on the AI Prompts page.')
    }
    promptText = fillPlaceholders(assembled, brief)
  } catch (err) {
    console.error('[economic-analysis] prompt assembly failed:', err.message)
    return sendError(res, 500, 'PROMPT_UNAVAILABLE',
      'The research prompt could not be loaded, so nothing was sent. Try again in a moment.')
  }

  const run = runsStore.createRun({
    firmId: req.firmId,
    advisorId: req.advisorId,
    clientRef,
    brief
  })

  // Deliberately not awaited: the reply goes back now and the screen polls. `runResearch`
  // swallows its own errors onto the run for exactly this reason.
  runResearch(run, promptText)

  res.send(202, { started: true, runId: run.runId, runNumber: run.runNumber })
}

/**
 * GET /api/report/economic-analysis/:runId  (firmAuth)
 *
 * Where this run has got to. What the waiting screen polls.
 *
 * `searches` are the model's own search phrases, in the order it made them. The approved
 * drawing showed four fixed research areas ticking off; the API reports what was searched
 * but not which output section a search belongs to, so showing real queries is the honest
 * form of the same idea and is a named deviation from the mockup.
 *
 * @route GET /api/report/economic-analysis/:runId
 * @returns {{runId, state, runNumber, searchCount, searches, error, research}}
 */
function getRun (req, res) {
  const run = runsStore.ownedRun(req.params.runId, req.firmId, req.advisorId)
  if (!run) {
    return sendError(res, 404, 'RUN_NOT_FOUND', 'That research run could not be found.')
  }

  res.send(200, {
    runId: run.runId,
    state: run.state,
    runNumber: run.runNumber,
    searchCount: run.searchCount,
    searches: run.searches.slice(-12),
    error: run.error,
    approval: run.approval,
    research: run.state === 'done' ? run.result : null
  })
}

/**
 * POST /api/report/economic-analysis/:runId/include  (firmAuth)
 *
 * The second tick, which IS the approval gate. Financial and regulatory work needs an
 * explicit `isApproved: true` before AI output is committed, and an advisor reading the
 * research and deciding it is fit for a lender is that approval — so there is no separate
 * Approve button. What there is, is a record: who, when, and which run of how many.
 *
 * It refuses a run that has not finished, which is what stops unread research being
 * included on a tick set against nothing.
 *
 * @route POST /api/report/economic-analysis/:runId/include
 * @param {object} req.body - `{ include: boolean }`
 * @returns {{included: boolean, approval: (object|null), recorded: boolean}}
 */
async function setInclude (req, res) {
  const run = runsStore.ownedRun(req.params.runId, req.firmId, req.advisorId)
  if (!run) {
    return sendError(res, 404, 'RUN_NOT_FOUND', 'That research run could not be found.')
  }

  const include = Boolean(req.body && req.body.include)

  if (!include) {
    runsStore.clearApproval(run)
    return res.send(200, { included: false, approval: null, recorded: true })
  }

  if (run.state !== 'done' || !run.result) {
    return sendError(res, 409, 'RESEARCH_NOT_READY',
      'This research has not finished, so it cannot be included yet.')
  }

  const totalRuns = runsStore.countInContext(run.firmId, run.advisorId, run.clientRef)
  const who = { name: req.advisorName || 'unknown', email: req.userEmail || '' }

  try {
    const { approval, recorded } = await runsStore.approveRun(run, who, totalRuns)
    res.send(200, { included: true, approval, recorded })
  } catch (err) {
    console.error('[economic-analysis] include failed:', err.message)
    sendError(res, 500, 'INCLUDE_FAILED',
      'The research could not be marked for inclusion. Nothing has changed.')
  }
}

module.exports = {
  startResearch,
  getRun,
  setInclude,
  fillPlaceholders,
  todayInWords,
  readEvent,
  PROMPT_ID,
  MODEL,
  MIN_BRIEF_CHARS,
  MAX_BRIEF_CHARS,
  _setClientFactory
}
