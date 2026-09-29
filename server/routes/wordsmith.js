'use strict'

/**
 * Wordsmith in Run session — the planner panel's Restify routes. Item 15.14, screens 1–5 of
 * `design/mockups/wordsmith-screens.html`, approved by Mike 2026-09-29 with decisions A–E and
 * 16 build details. Every ruling is in `design/features/strategy-planner.md` §9b.
 *
 * 🔴 ONLY THE ALIGNMENT STATEMENTS RECORDING IS EVER SENT, WITH CONSENT (CLAUDE.md's privacy
 * exception, the second named use). The words are found by the segment's concept label, which
 * the server checks when a section opens (`openNextSegment`), and `wordsmith.run` refuses
 * anything else again before a byte is built.
 *
 * 🔴 NOTHING REACHES A BOX WITHOUT THE CLIENT'S AGREEMENT (Decision D), and the record — the
 * AI's draft, the client's words it came from, the final wording, who agreed — is written
 * before the box, beside the transcript, and dies with it (build detail 1).
 *
 * A run outlives the 2000 ms page-render rule, so it is started and polled, as Meeting Review's
 * reports and the next-steps draft are. Runs live in memory for two hours (`aiRunStore`).
 *
 * 🔴 WHAT A REWRITE KEEPS COMES FROM THE SERVER, NEVER THE BROWSER. "Write again with these"
 * (Decision B) sends four fixed choices; the sort, the tone, the reader, the purpose and the style
 * are the base run's, held here. A browser can therefore never supply "what the client said".
 *
 * Advisors, `firmAuth`; every route checks the meeting is this firm's AND this advisor's.
 */

const { sendError } = require('../utils/sendError')
const { moderationReport } = require('../utils/moderationReport')
const { createRunStore } = require('../utils/aiRunStore')
const { joinTranscripts } = require('../utils/meetingSegments')
const { stripInvisible } = require('../utils/promptSafety')
const store = require('../utils/meetingAudioStore')
const ws = require('../utils/wordsmith')
const wc = require('../utils/wordsmithContent')
const frameworks = require('../utils/strategyFrameworks')
const captureForms = require('../utils/strategyCaptureForms')
const strategyStore = require('../utils/strategySessionStore')
const { markerKeyFor, buildMarker } = require('../../utils/wordsmithMarker')

const MAX_TYPED = 500
const MAX_FINAL = 2000

const runs = createRunStore({
  // Approvals are recorded beside the transcript (build detail 1), never in the overlay; the
  // store's own approval half is not used.
  configKey: null,
  idPrefix: 'wsr_',
  initialState: 'writing',
  logTag: 'wordsmith',
  runFields: s => ({ meetingId: s.clientRef, only: s.only || null })
})

/** meetingId → the whole-set run still writing, so a second press shows it (build detail 4). */
const writing = new Map()

/** meetingId → when Wordsmith was first pressed for it, for the record's time to approval. */
const firstPressed = new Map()

/** Injected in tests: `{ read, write }` model clients. */
let _clients = null
function _setClients (clients) { _clients = clients || null }
function _reset () { runs._reset(); writing.clear(); firstPressed.clear(); _clients = null }

/** Meeting Review's ownership check — the firm AND the advisor. Required lazily. */
function ownedMeeting (req, res) {
  return require('./meetingReview').ownedMeeting(req, res)
}

/**
 * The Alignment Statements section's words, or an error already sent.
 *
 * Decision A: Wordsmith works only once the section has been turned into text. A section rolled
 * into "part 2" is one section, so every part is joined.
 *
 * @returns {Array<object>|null} transcript rows `{start, role, text}`
 */
function alignmentRows (meta, res) {
  if (!meta.segmented) {
    sendError(res, 409, 'NOT_SEGMENTED', 'This recording is not a strategy session.')
    return null
  }
  if (!meta.consentConfirmedAt) {
    sendError(res, 409, 'CONSENT_NOT_CONFIRMED', 'The client\'s consent to recording has not been confirmed.')
    return null
  }
  const parts = (meta.segments || []).filter(s => s.conceptId === ws.ALIGNMENT_CONCEPT_ID)
  if (parts.some(s => ['recording', 'closed', 'transcribing'].includes(s.state))) {
    sendError(res, 409, 'STILL_TRANSCRIBING', 'This section is still being turned into text.')
    return null
  }
  if (!parts.some(s => s.state === 'done')) {
    sendError(res, 409, 'NOT_TEXT_YET', 'Record this section first.')
    return null
  }
  const rows = joinTranscripts(parts, n => store.readSegmentTranscript(meta.meetingId, n)).segments
  if (!rows.length) {
    sendError(res, 409, 'NOTHING_SAID', 'Nothing was said in this section, so there is nothing to write from.')
    return null
  }
  return rows.map(r => ({ start: r.start, role: r.role, text: r.text }))
}

/** A run, only for this advisor, this firm and this meeting. */
function ownedRunFor (req, meta) {
  const run = runs.ownedRun(String(req.params.runId || ''), req.firmId, req.advisorId)
  return run && run.meetingId === meta.meetingId ? run : null
}

/** The part of a finished run the screen reads. The sort and the typed words stay here. */
function publicResult (run) {
  if (run.state !== 'done' || !run.result) { return null }
  return {
    purpose: run.result.purpose,
    style: run.result.style,
    settings: run.result.settings,
    statements: run.result.statements.map(s => ({
      name: s.name,
      empty: s.empty,
      quotes: s.quotes.map(q => ({ text: q.text, room: Boolean(q.room) })),
      questions: s.questions,
      draft: s.draft,
      checks: s.checks,
      error: s.error ? 'This statement could not be written.' : null
    }))
  }
}

/** Off the request: run the engine, and put its result or its failure on the run. */
async function runJob (run, args, meetingId) {
  try {
    const out = await ws.run(Object.assign({}, args, _clients ? { clients: _clients } : {}))
    runs.completeRun(run, Object.assign({ purpose: args.purpose, style: args.style }, out))
  } catch (err) {
    console.error('[wordsmith] run ' + run.runId + ' failed:', err.code || err.message)
    const report = moderationReport(err, { segments: args.segments })
    runs.failRun(run, 'WORDSMITH_FAILED', 'Wordsmith couldn\'t write these statements.', report ? { moderation: report } : undefined)
  } finally {
    if (writing.get(meetingId) === run.runId) { writing.delete(meetingId) }
  }
}

/**
 * Everything a run needs before it starts, or an error already sent: the meeting, its words, the
 * resolved content, and room under the run limit.
 */
async function prepare (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return null }
  const segments = alignmentRows(meta, res)
  if (!segments) { return null }
  if (runs.countInContext(req.firmId, req.advisorId, meta.meetingId) >= runs.MAX_RUNS_PER_CONTEXT) {
    sendError(res, 429, 'TOO_MANY_RUNS', 'Wordsmith has written ' + runs.MAX_RUNS_PER_CONTEXT + ' times for this meeting. Edit one of the drafts you have.')
    return null
  }
  let content
  try {
    // Build detail 13: a firm's record that cannot be read stops Wordsmith; it is never
    // quietly swapped for the mentor's content the firm may have switched off.
    content = await wc.loadResolvedContent(req.firmId, wc.readScopeConfig)
  } catch (err) {
    console.error('[wordsmith] content unavailable:', err.message)
    sendError(res, 503, 'CONTENT_UNAVAILABLE', 'Wordsmith couldn\'t write these statements.')
    return null
  }
  return { meta, segments, content }
}

/** Four fixed choices from a body, checked; tone and reader come from the base run. */
function settingsFrom (body, base) {
  const raw = body && body.settings
  if (!raw || typeof raw !== 'object') { return { ok: true, value: base.settings } }
  const merged = {
    sentenceLength: raw.sentenceLength,
    formality: raw.formality,
    jargon: raw.jargon,
    voice: raw.voice,
    tone: base.settings.tone,
    audience: base.settings.audience
  }
  const checked = ws.validateStyle(merged)
  return checked.valid ? { ok: true, value: checked.settings } : { ok: false }
}

/** @param {*} v @returns {string|null} */
function typedText (v) {
  const t = typeof v === 'string' ? stripInvisible(v).trim() : ''
  return t && t.length <= MAX_TYPED ? t : null
}

/**
 * POST /api/meeting/recordings/:meetingId/wordsmith  (advisor)
 *
 * Write the five statements. With `baseRunId`, write them again with the advisor's settings
 * (Decision B), keeping the base run's sort and typed words.
 *
 * @route POST /api/meeting/recordings/:meetingId/wordsmith
 * @param {object} req.body - `{ purpose, style }`, or `{ baseRunId, settings }`
 * @returns {{runId: string, runNumber: number}} 202, to poll
 */
async function startRun (req, res) {
  const body = req.body || {}
  const ready = await prepare(req, res)
  if (!ready) { return }
  const { meta, segments, content } = ready

  let args
  if (body.baseRunId) {
    const base = runs.ownedRun(String(body.baseRunId), req.firmId, req.advisorId)
    if (!base || base.meetingId !== meta.meetingId || base.state !== 'done' || base.only) {
      return sendError(res, 404, 'RUN_NOT_FOUND', 'That set of drafts could not be found.')
    }
    const settings = settingsFrom(body, base.result)
    if (!settings.ok) { return sendError(res, 400, 'BAD_SETTINGS', 'Choose each setting from its list.') }
    args = { purpose: base.result.purpose, style: base.result.style, settings: settings.value, sorted: base.result.sorted }
  } else {
    const purpose = typedText(body.purpose)
    const style = typedText(body.style)
    if (!purpose || !style) {
      return sendError(res, 400, 'BAD_INPUT', 'Say what the statements are for and how they should sound, in ' + MAX_TYPED + ' characters or fewer each.')
    }
    args = { purpose, style }
  }

  const active = writing.get(meta.meetingId)
  const running = active && runs.ownedRun(active, req.firmId, req.advisorId)
  if (running && running.state === 'writing') {
    return res.send(202, { runId: running.runId, runNumber: running.runNumber })
  }

  if (!firstPressed.has(meta.meetingId)) { firstPressed.set(meta.meetingId, new Date().toISOString()) }
  const run = runs.createRun({ firmId: req.firmId, advisorId: req.advisorId, clientRef: meta.meetingId })
  writing.set(meta.meetingId, run.runId)
  // Deliberately not awaited: the reply goes back now and the screen polls.
  runJob(run, Object.assign({
    conceptId: ws.ALIGNMENT_CONCEPT_ID,
    consentConfirmed: true,
    segments,
    statements: content.statements,
    styleSettings: content.styleSettings
  }, args), meta.meetingId)
  res.send(202, { runId: run.runId, runNumber: run.runNumber })
}

/**
 * POST /api/meeting/recordings/:meetingId/wordsmith/:runId/statements  (advisor)
 *
 * Write one statement again — plainly, or with the room's typed answers to its questions
 * (Decision C: an answer counts as something the client said).
 *
 * @route POST /api/meeting/recordings/:meetingId/wordsmith/:runId/statements
 * @param {object} req.body - `{ statement, answers?: [{elementId, text}] }`
 * @returns {{runId: string, runNumber: number}} 202, to poll
 */
async function rewriteStatement (req, res) {
  const body = req.body || {}
  if (!ws.STATEMENT_NAMES.includes(body.statement)) {
    return sendError(res, 400, 'UNKNOWN_STATEMENT', 'That is not one of the five statements.')
  }
  const ready = await prepare(req, res)
  if (!ready) { return }
  const { meta, segments, content } = ready
  const base = ownedRunFor(req, meta)
  if (!base || base.state !== 'done' || !base.result) {
    return sendError(res, 404, 'RUN_NOT_FOUND', 'That set of drafts could not be found.')
  }
  const answers = Array.isArray(body.answers) ? body.answers.slice(0, 5) : []
  const run = runs.createRun({ firmId: req.firmId, advisorId: req.advisorId, clientRef: meta.meetingId, only: [body.statement] })
  runJob(run, {
    conceptId: ws.ALIGNMENT_CONCEPT_ID,
    consentConfirmed: true,
    segments,
    statements: content.statements,
    styleSettings: content.styleSettings,
    purpose: base.result.purpose,
    style: base.result.style,
    settings: base.result.settings,
    sorted: base.result.sorted,
    only: [body.statement],
    roomAnswers: { [body.statement]: answers }
  }, meta.meetingId)
  res.send(202, { runId: run.runId, runNumber: run.runNumber })
}

/**
 * GET /api/meeting/recordings/:meetingId/wordsmith/:runId  (advisor)
 * @route GET /api/meeting/recordings/:meetingId/wordsmith/:runId
 * @returns {{runId, state, runNumber, error, result}}
 */
function getRun (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }
  const run = ownedRunFor(req, meta)
  if (!run) { return sendError(res, 404, 'RUN_NOT_FOUND', 'That set of drafts could not be found.') }
  res.send(200, { runId: run.runId, state: run.state, runNumber: run.runNumber, error: run.error, result: publicResult(run) })
}

/** The Alignment Statements box key for one statement, read from the capture form itself. */
function boxKeyFor (name) {
  const capture = captureForms.captureForConcept(frameworks.getConcept(ws.ALIGNMENT_CONCEPT_ID))
  const field = (capture.fields || []).find(f => f.columnLabel === name && /^t0r\d+c\d+$/.test(f.key))
  return field ? field.key : null
}

/**
 * POST /api/meeting/recordings/:meetingId/wordsmith/:runId/use  (advisor)
 *
 * "Use this wording": the statement goes in its box, with the stamp, after the record is written.
 *
 * 🔴 THE CLIENT'S AGREEMENT IS REQUIRED, NOT ASSUMED (Decision D). The tick — "The client has read
 * this statement and agrees with it" — arrives as `clientAgreed: true`; nothing else puts words in
 * a box. This app has no client login, so it is the advisor's confirmation, as the summaries' is.
 *
 * @route POST /api/meeting/recordings/:meetingId/wordsmith/:runId/use
 * @param {object} req.body - `{ sessionId, statement, text, clientAgreed: true }`
 * @returns {{fieldKey: string, value: string, markerKey: string, marker: string}}
 */
async function useWording (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }
  const body = req.body || {}
  if (body.clientAgreed !== true) {
    return sendError(res, 400, 'CLIENT_NOT_AGREED', 'Tick that the client has read this statement and agrees with it first.')
  }
  const run = ownedRunFor(req, meta)
  const entry = run && run.state === 'done' && run.result && run.result.statements.find(s => s.name === body.statement)
  if (!entry || !entry.draft) { return sendError(res, 404, 'RUN_NOT_FOUND', 'That draft could not be found.') }
  const text = typeof body.text === 'string' ? stripInvisible(body.text).trim() : ''
  if (!text || text.length > MAX_FINAL) {
    return sendError(res, 400, 'BAD_INPUT', 'The wording must be between 1 and ' + MAX_FINAL + ' characters.')
  }
  const fieldKey = boxKeyFor(entry.name)
  if (!fieldKey) { return sendError(res, 500, 'NO_BOX', 'Wordsmith could not find that statement\'s box.') }

  try {
    const session = Number.isInteger(Number(body.sessionId)) && Number(body.sessionId) > 0
      ? await strategyStore.getSession(body.sessionId, req.firmId)
      : null
    // A session tied to another meeting is another conversation: this client's words never
    // go into that plan.
    if (!session || (session.meetingId && session.meetingId !== meta.meetingId)) {
      return sendError(res, 404, 'NOT_FOUND', 'No such planning session')
    }

    const approvedAt = new Date().toISOString()
    // The record first: a statement never reaches a plan without it (CLAUDE.md: Original |
    // AI Suggestion | Final Approved Value). If this throws, no box is written.
    store.appendWordsmithRecord(meta.meetingId, {
      statement: entry.name,
      fieldKey,
      sessionId: session.id,
      runId: run.runId,
      runNumber: run.runNumber,
      totalRuns: runs.countInContext(req.firmId, req.advisorId, meta.meetingId),
      firstPressedAt: firstPressed.get(meta.meetingId) || null,
      clientWords: entry.quotes.filter(q => !q.room).map(q => q.text),
      roomAnswers: entry.quotes.filter(q => q.room).map(q => q.text),
      settings: run.result.settings,
      aiDraft: { text: entry.draft.text, why: entry.draft.why, keptPhrases: entry.draft.keptPhrases, checks: entry.checks },
      finalText: text,
      edited: text !== entry.draft.text,
      clientAgreed: true,
      isApproved: true,
      approvedBy: { name: req.advisorName || 'unknown', email: req.userEmail || '' },
      approvedAt
    })

    const marker = buildMarker({ approvedAt, text })
    const saves = [
      { fieldKey, value: text },
      { fieldKey: markerKeyFor(fieldKey), value: marker }
    ]
    for (const s of saves) {
      const done = await strategyStore.saveEntry({ sessionId: session.id, firmId: req.firmId, frameworkId: ws.ALIGNMENT_CONCEPT_ID, fieldKey: s.fieldKey, value: s.value, source: 'typed' })
      if (!done) { return sendError(res, 404, 'NOT_FOUND', 'No such planning session') }
    }
    res.send(200, { fieldKey, value: text, markerKey: markerKeyFor(fieldKey), marker })
  } catch (err) {
    console.error('[wordsmith] use failed:', err.code || err.message)
    return sendError(res, 500, 'WORDSMITH_SAVE_FAILED', 'Nothing in the boxes has changed. Try again.')
  }
}

/** Restify asserts a synchronous handler takes `next` — Meeting Review's `mountable`. */
function mountable (fn) {
  return function (req, res, next) {
    fn(req, res)
    if (typeof next === 'function') { next() }
  }
}

module.exports = {
  startRun,
  rewriteStatement,
  getRun: mountable(getRun),
  useWording,
  boxKeyFor,
  runs,
  _setClients,
  _reset
}
