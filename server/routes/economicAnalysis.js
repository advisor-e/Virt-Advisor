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
const { validateResearch, extractText } = require('../report/economicAnalysis/researchResult')
const runsStore = require('../utils/economicAnalysisRuns')

/** The prompt this route runs, as declared in `data/ai-prompts.json`. */
const PROMPT_ID = 'economic-analysis'

/**
 * The model. Chosen against OpenAI's current web-search guide and exercised by a live run
 * on 2026-09-06 — no longer the bare judgement this constant used to carry.
 *
 * ⚠ IT IS STILL NOT THE MODEL THAT MADE RUNS 1–4, AND NOTHING CAN BE. That script lived
 * outside the repository and is gone, and `design/ECONOMIC-ANALYSIS-TEST-RUNS.md` never
 * named it. Those four runs are evidence about the PROMPT; they say nothing about this value
 * and never will.
 *
 * The first guess here was `gpt-4o`, and a live run through this route disproved it: it came
 * back in 10 seconds having made no search at all — 1,760 input tokens against run 1's
 * 68,457, which included retrieved page content — and the validator refused the result as
 * `SECTION_UNSOURCED`. Every example in OpenAI's current web-search guide uses this model.
 */
const MODEL = 'gpt-6-astra'

/** Standard web search on the Responses API — not deep research (prompt file §2). */
const TOOLS = [{ type: 'web_search' }]

/**
 * 🔴 THE SEARCH IS COMPULSORY, NOT REQUESTED, and that is the whole of this constant.
 *
 * By default the model decides for itself whether to search. On 2026-09-06 it decided not
 * to: it answered from memory in ten seconds and produced a confident, correctly structured,
 * entirely unsourced outlook that the validator refused. §3 of the prompt tells it to search
 * the public web before writing anything — this is what turns that from a request it may
 * decline into a condition of the call.
 *
 * Same lesson as the citation fix recorded in `design/ECONOMIC-ANALYSIS-PROMPT.md` §5: three
 * instruction-level attempts failed and removing the model's choice succeeded. An instruction
 * the model may ignore is not a control. Remove this and unsourced research is possible again.
 */
const TOOL_CHOICE = 'required'

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

/** How much of a refused reply is logged. Enough to see the shape, not a whole transcript. */
const REFUSED_REPLY_LOG_CHARS = 4000

/**
 * The model's own words, when the guard has refused them. Diagnosis only — item 4.73.
 *
 * 🔴 WHY THIS EXISTS. Every run through this route failed on the default no-date path on
 * 2026-09-07 and 2026-09-08, and the reason could not be established because the reply was
 * validated and then dropped. The refusal code alone cannot tell the two failures apart: runs
 * 17 and 19 lost ALL FIVE sections, which means no numbered heading was recognised at all,
 * while run 18 parsed cleanly and simply cited nothing. Those want different fixes, and the
 * text is the only thing that says which. See `design/ECONOMIC-ANALYSIS-TEST-RUNS.md`.
 *
 * ⚠ NOT IN PRODUCTION, deliberately. Nothing about a client reaches this prompt on its own
 * (Mike's ruling, 2026-09-06), so there is no PII exception in play — but the reply can quote
 * back the brief the ADVISOR typed, and an advisor's words should not accumulate in a
 * production log for a diagnosis that only ever happens on a developer's machine.
 *
 * @param {string} runId
 * @param {object} response - the completed OpenAI response
 * @returns {void}
 */
function logRefusedReply (runId, response) {
  if (process.env.NODE_ENV === 'production') { return }
  try {
    const { text } = extractText(response)
    const body = String(text || '')
    console.error('[economic-analysis] run ' + runId + ' raw reply (' + body.length +
      ' chars, first ' + REFUSED_REPLY_LOG_CHARS + '):\n' +
      body.slice(0, REFUSED_REPLY_LOG_CHARS))
  } catch (err) {
    // A diagnostic must never be the thing that breaks the run it is diagnosing.
    console.error('[economic-analysis] run ' + runId + ' raw reply unavailable:', err.message)
  }
}

/**
 * A calendar date in words — the form §2 wants for BOTH of its dates, and one a model
 * cannot misread. Called twice: once for `{{today}}` from the server, once for
 * `{{assessmentDate}}`, which may be the advisor's own.
 *
 * ⚠ THE SERVER'S OWN DATE, NOT UTC. It read UTC until 2026-09-07, which put YESTERDAY in
 * front of an advisor at UTC+12 for the first twelve hours of every day — and it prints, in
 * the client's own funding pack: "The assessment starts on 6 September 2026", written on
 * the 7th. Seen in a live run, not in a test.
 *
 * ⚠ AND IT IS ONLY AS RIGHT AS THE SERVER'S CLOCK. An advisor in a different zone from the
 * server still gets the server's day for `{{today}}`. The advisor's chosen ASSESSMENT date
 * is now sent (`{{assessmentDate}}`), but their time zone is not, so this stands — §4 of the
 * prompt file records `{{today}}` as the server's, and changing where it comes from is a
 * decision, not a tidy-up.
 *
 * @returns {string} e.g. "7 September 2026"
 */
function todayInWords (now) {
  const d = now instanceof Date ? now : new Date()
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

/**
 * The advisor's chosen assessment date, as a real calendar date or nothing.
 *
 * 🔴 THE POINT OF THIS FUNCTION IS THAT NOTHING THE ADVISOR TYPES REACHES THE PROMPT.
 * The assessment date was machine-generated until 2026-09-07 and therefore trusted by
 * construction; Mike's ruling that the advisor sets it (*"or, have a field to enter the
 * date"*) makes it user input going into a prompt, which `CLAUDE.md` says to treat as
 * hostile. It reaches §2 as `{{assessmentDate}}` — never as `{{today}}`, which stays the
 * server's own day and is the yardstick §2 judges currency against. So only
 * `YYYY-MM-DD` is accepted, it must survive the round trip through `Date` — which rejects
 * `2026-02-31` and `2026-13-01` rather than rolling them over — and `todayInWords` writes
 * the words. The string sent to the model is ours either way.
 *
 * Parsed as LOCAL parts, never `new Date('2026-09-07')`, which ISO-parses as UTC and would
 * reintroduce the off-by-one day this field exists to close.
 *
 * @param {*} value - `req.body.assessmentDate`
 * @returns {Date|null} null when absent or not a real date
 */
function assessmentDateOf (value) {
  if (typeof value !== 'string') { return null }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) { return null }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1900 || year > 2999 || month < 1 || month > 12 || day < 1 || day > 31) { return null }

  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) { return null }
  return d
}

/**
 * Builds the text sent to the model: the assembled prompt with its three placeholders
 * filled in.
 *
 * 🔴 THE TWO DATES ARE DELIBERATELY DIFFERENT VALUES — item 4.69, 2026-09-07. They were one
 * placeholder until the advisor could set the assessment date, and §2 asked that single date
 * to do two jobs at once: say when the assessment period starts, AND be the yardstick for
 * how current a figure is. The first is properly the advisor's; the second can only ever be
 * the real day. Given 30 November 2026 the model searched for
 * `monetary policy ... 2026 November`, found nothing — the data does not exist yet — and
 * returned §§1 and 3 with no sources, which the citation guard then refused. Reproduced
 * twice before this changed. `{{assessmentDate}}` may be in the future; `{{today}}` never is.
 *
 * Both go through `todayInWords`, so the string sent to the model is OURS in both cases even
 * though one of the two dates originates with the advisor.
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
 * @param {Date|null} [assessmentDate] - the advisor's chosen date; absent means the server's day
 * @param {Date} [now]
 * @returns {string}
 */
function fillPlaceholders (assembled, brief, assessmentDate, now) {
  return assembled.text
    .split('{{assessmentDate}}').join(todayInWords(assessmentDate || now))
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
 * 🔴 THE SEARCH PHRASE IS READ ON `.done`, AND THAT IS EVIDENCE, NOT PREFERENCE. A live
 * run on 2026-09-06 recorded both sightings of the same `web_search_call`:
 *
 *   response.output_item.added → status "in_progress", NO `action` object at all
 *   response.output_item.done  → status "completed", action.type "search",
 *                                query "site.rbnz.govt.nz official cash rate August 2026 OCR"
 *
 * The first build read `.added` and every phrase arrived empty — ten searches counted with
 * nothing to show beside them. There is no query at `.added` to read; it does not exist yet.
 * The cost is that a search appears when it finishes rather than when it starts, which keeps
 * the count and the phrases in step with each other.
 *
 * ⚠ The API also emits `response.web_search_call.in_progress` / `.searching` / `.completed`.
 * They carry no query, so nothing reads them here.
 *
 * @param {object} run
 * @param {object} event
 * @returns {object|null} the completed response, when this event carries one
 */
function readEvent (run, event) {
  if (!event || typeof event.type !== 'string') { return null }

  if (event.type === 'response.output_item.added' || event.type === 'response.output_item.done') {
    const item = event.item
    if (item && item.type === 'web_search_call' && event.type === 'response.output_item.done') {
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
      { model: MODEL, input: promptText, tools: TOOLS, tool_choice: TOOL_CHOICE, stream: true },
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
      logRefusedReply(run.runId, completed)
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
 * @param {object} req.body - `{ brief: string, assessmentDate?: string, clientRef?: string }`
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

  // Absent is fine and means the server's own day — an older screen must not break. Present
  // but not a real date is refused rather than quietly corrected: the date is printed in the
  // client's funding pack, so guessing what they meant is the one thing not to do.
  const assessmentDate = assessmentDateOf(body.assessmentDate)
  if (body.assessmentDate !== undefined && !assessmentDate) {
    return sendError(res, 400, 'ASSESSMENT_DATE_INVALID',
      'That assessment date is not a real date. Pick the date this assessment should be dated from.')
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
    promptText = fillPlaceholders(assembled, brief, assessmentDate)
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
 * ⚠ THE CALLBACK SIGNATURE IS DELIBERATE, and it is the only handler here that has it.
 * Restify accepts a handler two ways — `async (req, res)`, or a plain `(req, res, next)` —
 * and asserts at MOUNT TIME, refusing to boot the whole server if a handler is neither.
 * This one reads memory and returns; it awaits nothing. Declaring it `async` to satisfy that
 * assertion would be a false label on the function and trips `require-await`. So it takes
 * the callback form instead, like `server/routes/health.js`, the app's other synchronous
 * handler. Its two siblings above are `async` because they genuinely await.
 *
 * @route GET /api/report/economic-analysis/:runId
 * @returns {{runId, state, runNumber, searchCount, searches, error, research}}
 */
function getRun (req, res, next) {
  const run = runsStore.ownedRun(req.params.runId, req.firmId, req.advisorId)
  if (!run) {
    sendError(res, 404, 'RUN_NOT_FOUND', 'That research run could not be found.')
    return next()
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
  return next()
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
  assessmentDateOf,
  readEvent,
  PROMPT_ID,
  MODEL,
  MIN_BRIEF_CHARS,
  MAX_BRIEF_CHARS,
  _setClientFactory
}
