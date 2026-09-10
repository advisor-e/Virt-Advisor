'use strict'

/**
 * Next Steps Draft — the AI draft of the three next steps on a Business Performance
 * Report. Restify routes.
 *
 * Item 4.70, stage 6. Approved by Mike 2026-09-09 against
 * `design/mockups/business-performance-report-next-steps-draft.html`, the drawing every
 * screen is compared with before anything ships.
 *
 * 🔴 THE APP SENDS EIGHT COLOUR WORDS AND NOTHING ELSE — Mike's privacy ruling, 2026-09-09.
 * The list the advisor sees in the blue box is the list that leaves: the eight measures
 * with green, amber or red, and where an industry was named, below, within or above its
 * middle half. `validateSendList` admits nothing else, so a client's name, a figure or a
 * file cannot be sent even by a screen that tried. No PII exception is needed, because
 * nothing personal is assembled.
 *
 * 🔴 THE TICK IS ON THE WORDS. `setReady` records the three lines as approved, whether they
 * came from a draft or were typed, and the pages route prints page 8 only when the saved
 * lines equal that record (`nextStepsDraftRuns.matches`). One rule for both, and no way to
 * print unapproved words.
 *
 * A draft outruns the 2000 ms page-render rule, so `startDraft` returns a run to poll, the
 * shape the economic analysis and Meeting Review already use.
 *
 * Node 14, CommonJS.
 */

const { createOpenAIClient } = require('../utils/openaiClient')
const { sendError } = require('../utils/sendError')
const { assemblePrompt, loadResolvedAiPromptOverrides } = require('../utils/aiPrompts')
const { loadFirmConfig } = require('../utils/firmOverlay')
const { validateSendList, renderSendList, validateDraft } = require('../report/nextStepsDraft')
const runsStore = require('../utils/nextStepsDraftRuns')

/** The prompt this route runs, as declared in `data/ai-prompts.json`. */
const PROMPT_ID = 'next-steps-draft'

/**
 * The model — the one the economic analysis proved live on 2026-09-06. No tools: this
 * call has nothing to search for, and a search would be a way for facts to arrive that
 * the advisor never saw sent.
 */
const MODEL = 'gpt-6-astra'

/** Socket inactivity guard. A draft is a few hundred tokens; a minute is generous. */
const IDLE_TIMEOUT_MS = 60000

/** Bounded so an opaque client reference stays opaque and short. */
const MAX_CLIENT_REF = 100

/** Injected in tests. */
let _clientFactory = createOpenAIClient

/** Test seam: swap the OpenAI client factory. @param {Function} [factory] */
function _setClientFactory (factory) {
  _clientFactory = factory || createOpenAIClient
}

/**
 * One line per call, so a run that fails is visible from the log alone.
 * @param {string} runId @param {number} startedAt @param {boolean} success @param {object|null} usage
 */
function logCall (runId, startedAt, success, usage) {
  const u = usage || {}
  console.log('[next-steps] run ' + runId +
    ' model=' + MODEL +
    ' ok=' + success +
    ' ms=' + (Date.now() - startedAt) +
    ' prompt_tokens=' + (u.input_tokens === undefined ? '?' : u.input_tokens) +
    ' completion_tokens=' + (u.output_tokens === undefined ? '?' : u.output_tokens))
}

/**
 * The assembled prompt with the send list in place of `{{measures}}`.
 *
 * Not fenced: the list is the app's own six words from a whitelist, not text a person
 * typed, and fencing it as untrusted would tell the model to distrust the one thing it is
 * meant to act on.
 *
 * @param {{text: string}} assembled
 * @param {string} sendText - from `renderSendList`
 * @returns {string}
 */
function fillPlaceholders (assembled, sendText) {
  return assembled.text.split('{{measures}}').join(sendText)
}

/** @param {*} v @returns {string|null} */
function clientRefOf (v) {
  return typeof v === 'string' && v ? v.slice(0, MAX_CLIENT_REF) : null
}

/** @param {object} req @returns {{name: string, email: string}} */
function whoIs (req) {
  return { name: req.advisorName || 'unknown', email: req.userEmail || '' }
}

/** @param {*} steps @returns {Array<{title: string, body: string}>|null} three lines, or null */
function stepsOf (steps) {
  if (!Array.isArray(steps) || steps.length !== 3) { return null }
  const out = []
  for (const s of steps) {
    if (!s || typeof s !== 'object' || typeof s.title !== 'string' || typeof s.body !== 'string') { return null }
    out.push({ title: s.title, body: s.body })
  }
  return out
}

/**
 * The call itself, off the request. Swallows its own errors onto the run.
 * @param {object} run
 * @param {string} promptText
 */
async function runDraft (run, promptText) {
  const startedAt = Date.now()
  try {
    const client = _clientFactory({ apiKey: process.env.OPENAI_API_KEY })
    const response = await client.responses.create(
      { model: MODEL, input: promptText, text: { format: { type: 'json_object' } } },
      { timeout: IDLE_TIMEOUT_MS }
    )
    const checked = validateDraft(response)
    logCall(run.runId, startedAt, checked.ok, response && response.usage)
    if (!checked.ok) {
      console.error('[next-steps] run ' + run.runId + ' refused: ' + checked.error.code)
      runsStore.failRun(run, checked.error.code, checked.error.message)
      return
    }
    runsStore.completeRun(run, checked.data)
  } catch (err) {
    logCall(run.runId, startedAt, false, null)
    console.error('[next-steps] run ' + run.runId + ' failed:', err.message)
    runsStore.failRun(run, 'DRAFT_FAILED', 'The draft could not be made. Nothing has changed — try again in a moment.')
  }
}

/**
 * POST /api/report/dashboard-reports/next-steps  (firmAuth)
 *
 * Starts a draft and returns a run to poll.
 *
 * @route POST /api/report/dashboard-reports/next-steps
 * @param {object} req.body - `{ measures: [{key, band}], positions?: [{key, position}], clientRef?: string }`
 * @returns {{started: true, runId: string, runNumber: number, sent: string}} — `sent` is
 *   the exact text that went into the prompt, for the record
 */
async function startDraft (req, res) {
  const body = req.body || {}
  const list = validateSendList(body)
  if (!list.ok) {
    return sendError(res, 400, list.error.code, list.error.message)
  }

  const clientRef = clientRefOf(body.clientRef)
  const already = runsStore.countInContext(req.firmId, req.advisorId, clientRef)
  if (already >= runsStore.MAX_RUNS_PER_CONTEXT) {
    return sendError(res, 429, 'TOO_MANY_DRAFTS',
      'This report has had ' + already + ' drafts. Edit one of the drafts you already have.')
  }

  const sentText = renderSendList(list.data)
  let promptText
  try {
    const overrides = await loadResolvedAiPromptOverrides(req.firmId, loadFirmConfig)
    const assembled = assemblePrompt(PROMPT_ID, overrides)
    if (assembled.blocked) {
      return sendError(res, 409, 'PROMPT_BLOCKED',
        'A setting this prompt needs has not been filled in. A firm manager can set it on the AI Prompts page.')
    }
    promptText = fillPlaceholders(assembled, sentText)
  } catch (err) {
    console.error('[next-steps] prompt assembly failed:', err.message)
    return sendError(res, 500, 'PROMPT_UNAVAILABLE',
      'The draft prompt could not be loaded, so nothing was sent. Try again in a moment.')
  }

  const run = runsStore.createRun({
    firmId: req.firmId,
    advisorId: req.advisorId,
    clientRef,
    sent: sentText
  })

  // Deliberately not awaited: the reply goes back now and the screen polls.
  runDraft(run, promptText)

  res.send(202, { started: true, runId: run.runId, runNumber: run.runNumber, sent: sentText })
}

/**
 * GET /api/report/dashboard-reports/next-steps/:runId  (firmAuth)
 *
 * Where this draft has got to. Callback form because it awaits nothing — see the same
 * note on the economic analysis's `getRun`.
 *
 * @route GET /api/report/dashboard-reports/next-steps/:runId
 * @returns {{runId, state, runNumber, error, draft}}
 */
function getDraft (req, res, next) {
  const run = runsStore.ownedRun(req.params.runId, req.firmId, req.advisorId)
  if (!run) {
    sendError(res, 404, 'RUN_NOT_FOUND', 'That draft could not be found.')
    return next()
  }
  res.send(200, {
    runId: run.runId,
    state: run.state,
    runNumber: run.runNumber,
    error: run.error,
    draft: run.state === 'done' ? run.result : null
  })
  return next()
}

/**
 * POST /api/report/dashboard-reports/next-steps/ready  (firmAuth)
 *
 * The tick, which IS the approval gate — `isApproved: true` before AI output is committed,
 * recorded as who, when, which draft of how many, the draft as it arrived and the three
 * lines as approved. Works with no draft at all, because typed words need the same tick.
 *
 * @route POST /api/report/dashboard-reports/next-steps/ready
 * @param {object} req.body - `{ clientRef: string, ready: boolean, steps: [{title, body} ×3], runId?: string }`
 * @returns {{ready: boolean, approval: object, recorded: boolean}} — `approval` per
 *   `nextStepsDraftRuns.summarise`
 */
async function setReady (req, res) {
  const body = req.body || {}
  const clientRef = clientRefOf(body.clientRef)
  if (!clientRef) {
    return sendError(res, 400, 'CLIENT_REQUIRED', 'Choose the client this report is for before ticking the next steps ready.')
  }
  const steps = stepsOf(body.steps)
  if (!steps) {
    return sendError(res, 400, 'STEPS_MALFORMED', 'The three next steps did not arrive in the shape expected, so nothing was recorded.')
  }
  const ready = Boolean(body.ready)
  let run = null
  if (typeof body.runId === 'string' && body.runId) {
    run = runsStore.ownedRun(body.runId, req.firmId, req.advisorId)
    if (!run) {
      return sendError(res, 404, 'RUN_NOT_FOUND', 'That draft could not be found, so nothing was recorded.')
    }
    if (run.state !== 'done' || !run.result) {
      return sendError(res, 409, 'DRAFT_NOT_READY', 'This draft has not finished, so it cannot be ticked ready yet.')
    }
  }
  if (ready && steps.some(s => !s.title.trim() || !s.body.trim())) {
    return sendError(res, 400, 'STEPS_INCOMPLETE', 'All three next steps need a title and a body before they can be ticked ready.')
  }

  try {
    const { approval, recorded } = await runsStore.recordReady({
      firmId: req.firmId,
      clientRef,
      ready,
      steps,
      run,
      who: whoIs(req),
      totalDrafts: runsStore.countInContext(req.firmId, req.advisorId, clientRef)
    })
    res.send(200, { ready: approval.isApproved, approval: runsStore.summarise(approval, steps), recorded })
  } catch (err) {
    console.error('[next-steps] ready failed:', err.message)
    sendError(res, 500, 'READY_FAILED', 'The next steps could not be marked ready. Nothing has changed.')
  }
}

module.exports = {
  PROMPT_ID,
  MODEL,
  startDraft,
  getDraft,
  setReady,
  fillPlaceholders,
  _setClientFactory
}
