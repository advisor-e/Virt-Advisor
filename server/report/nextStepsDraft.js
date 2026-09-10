'use strict'

/**
 * @file The next-steps draft — what may be sent to the model, and what may come back.
 * @module server/report/nextStepsDraft
 *
 * Item 4.70, stage 6. Drawing: `design/mockups/business-performance-report-next-steps-draft.html`.
 *
 * 🔴 PRIVACY — RULED BY MIKE, 2026-09-09. The model receives the eight measures and their
 * bands, and where step 1 named an industry, whether each sits below, within or above the
 * Stats NZ middle half. Never the client's name, a dollar figure, a file, or the industry's
 * own name. `validateSendList` is the whole of how that is enforced: it admits only the
 * eight measure keys with one of three colour words, and the same keys with one of three
 * position words, and refuses everything else. What it returns is what `renderSendList`
 * writes into the prompt, and a test proves that text carries no digit.
 *
 * 🔴 PROTOCOL 4 HAS A HOME THAT IS NOT THE CLIENT'S PAGE. The platform protocols require the
 * model to state what it could not verify, and on the first live run (2026-09-09) it did so
 * INSIDE step three — "underlying figures and causes have not been verified", on the owner's
 * page. A prompt cannot vary a protocol, so the draft's JSON carries `limits`: the model's
 * statement of its limits, recorded beside the draft for the advisor, never printed.
 *
 * 🔴 THE MODEL IS GIVEN NO FIGURE, SO ANY FIGURE IT WRITES IS INVENTED. `validateDraft`
 * refuses a draft containing any digit at all — stricter than the economic analysis's
 * `figuresIn`, deliberately: "60 days on hand" would pass that guard and would still be a
 * number the model made up. A currency sign is refused on the same reasoning.
 *
 * Node 14, CommonJS.
 */

const { MAX_TEXT } = require('../../utils/dashboardReportsSavedShape')
const { MEASURES, SCORE_MEASURES } = require('./trendModel')
const { extractText } = require('./economicAnalysis/researchResult')

/** The eight measures the health score counts, in the trend model's own order. */
const MEASURE_KEYS = MEASURES.concat(SCORE_MEASURES).map(m => m.key)

/**
 * The name each measure is sent under. 🔒 Pinned by test to the locale file's
 * `report.dashboardReports.draft.measure.*`, so the blue box on the screen and the text
 * that leaves the app say the same thing — "exactly what will be sent" has to be exact.
 */
const MEASURE_NAMES = {
  salesGrowth: 'Sales growth',
  grossMargin: 'Gross margin',
  overheadRatio: 'Overhead ratio',
  debtorDays: 'Debtor days',
  creditorDays: 'Creditor days',
  stockDays: 'Stock days',
  currentRatio: 'Current ratio',
  debtToEquity: 'Debt to equity'
}

/** The three colour words the health score uses. */
const BANDS = ['green', 'amber', 'red']

/** How much of the model's own statement of limits is kept. It is a record, not a page. */
const MAX_LIMITS = 600

/** The three positions `compareToIndustry` reports against the Stats NZ middle half. */
const POSITIONS = ['below', 'within', 'above']

/** @param {string} code @param {string} message @returns {{ok: false, error: {code: string, message: string}}} */
function refuse (code, message) {
  return { ok: false, error: { code, message } }
}

/**
 * The list the screen shows, checked before it is sent.
 *
 * @param {object} body - `{ measures: [{key, band}], positions?: [{key, position}] }`
 * @returns {{ok: true, data: {measures: object[], positions: object[]}}|{ok: false, error: object}}
 */
function validateSendList (body) {
  const b = body && typeof body === 'object' ? body : {}
  const measures = Array.isArray(b.measures) ? b.measures : []
  const positions = Array.isArray(b.positions) ? b.positions : []

  if (measures.length === 0) {
    return refuse('NO_SCORE', 'There is no health score to draft from yet — the score needs both years of accounts.')
  }

  const seen = {}
  const cleanMeasures = []
  for (const m of measures) {
    const key = m && typeof m.key === 'string' ? m.key : ''
    const band = m && typeof m.band === 'string' ? m.band : ''
    if (!MEASURE_KEYS.includes(key) || !BANDS.includes(band) || seen[key]) {
      return refuse('SEND_LIST_REFUSED', 'The list to send holds something other than the eight measures and their colours, so nothing was sent.')
    }
    seen[key] = true
    cleanMeasures.push({ key, band })
  }

  const seenPos = {}
  const cleanPositions = []
  for (const p of positions) {
    const key = p && typeof p.key === 'string' ? p.key : ''
    const position = p && typeof p.position === 'string' ? p.position : ''
    if (!MEASURE_KEYS.includes(key) || !POSITIONS.includes(position) || seenPos[key]) {
      return refuse('SEND_LIST_REFUSED', 'The list to send holds something other than the eight measures and their positions, so nothing was sent.')
    }
    seenPos[key] = true
    cleanPositions.push({ key, position })
  }

  return { ok: true, data: { measures: cleanMeasures, positions: cleanPositions } }
}

/**
 * The validated list as the words that go into the prompt — and nothing else does.
 *
 * @param {{measures: object[], positions: object[]}} data - from `validateSendList`
 * @returns {string}
 */
function renderSendList (data) {
  const lines = data.measures.map(m => '- ' + MEASURE_NAMES[m.key] + ': ' + m.band)
  if (data.positions.length) {
    lines.push('')
    lines.push('Against the industry\'s middle half:')
    data.positions.forEach((p) => { lines.push('- ' + MEASURE_NAMES[p.key] + ': ' + p.position) })
  } else {
    lines.push('')
    lines.push('No industry comparison was made.')
  }
  return lines.join('\n')
}

/**
 * Whether one drafted line is a string the report can hold, with no figure in it.
 * @param {*} v
 * @returns {string|null} the refusal code, or null when the line is fine
 */
function lineFault (v) {
  if (typeof v !== 'string') { return 'DRAFT_MALFORMED' }
  const t = v.trim()
  if (!t) { return 'DRAFT_EMPTY' }
  if (t.length > MAX_TEXT) { return 'DRAFT_TOO_LONG' }
  if (/[0-9]/.test(t) || /[£$€¥₹%]/.test(t)) { return 'DRAFT_HAS_FIGURE' }
  return null
}

/**
 * The model's reply, checked before any of it reaches a screen.
 *
 * Accepts the parsed Responses API object (its text is read with the economic analysis's
 * own `extractText`) or a plain string. The text must be one JSON object holding `steps`:
 * three objects each holding exactly `title` and `body`, every one a non-empty string
 * within the saved report's line limit, with no digit or currency sign anywhere — and,
 * optionally, `limits`: a string, the model's own statement of what it could not verify.
 * Nothing else.
 *
 * @param {object|string} response
 * @returns {{ok: true, data: {steps: Array<{title: string, body: string}>, limits: string}}|{ok: false, error: object}}
 */
function validateDraft (response) {
  const text = typeof response === 'string' ? response : extractText(response).text
  let parsed
  try {
    parsed = JSON.parse(String(text || '').trim())
  } catch (e) {
    return refuse('DRAFT_MALFORMED', 'The draft did not come back in the shape expected, so it has been refused rather than shown. Draft again.')
  }
  const keys = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed).sort().join() : ''
  if (keys !== 'steps' && keys !== 'limits,steps') {
    return refuse('DRAFT_MALFORMED', 'The draft did not come back in the shape expected, so it has been refused rather than shown. Draft again.')
  }
  if (parsed.limits !== undefined && typeof parsed.limits !== 'string') {
    return refuse('DRAFT_MALFORMED', 'The draft did not come back in the shape expected, so it has been refused rather than shown. Draft again.')
  }
  const steps = parsed.steps
  if (!Array.isArray(steps) || steps.length !== 3) {
    return refuse('DRAFT_MALFORMED', 'The draft did not come back as three next steps, so it has been refused rather than shown. Draft again.')
  }
  const clean = []
  for (const s of steps) {
    if (!s || typeof s !== 'object' || Array.isArray(s) || Object.keys(s).sort().join() !== 'body,title') {
      return refuse('DRAFT_MALFORMED', 'The draft did not come back in the shape expected, so it has been refused rather than shown. Draft again.')
    }
    const fault = lineFault(s.title) || lineFault(s.body)
    if (fault === 'DRAFT_HAS_FIGURE') {
      return refuse(fault, 'The draft stated a figure. It was given none, so any figure in it is invented — it has been refused rather than shown. Draft again.')
    }
    if (fault === 'DRAFT_TOO_LONG') {
      return refuse(fault, 'A line of the draft is longer than the report can hold, so it has been refused rather than shown. Draft again.')
    }
    if (fault) {
      return refuse(fault, 'The draft came back with an empty line, so it has been refused rather than shown. Draft again.')
    }
    clean.push({ title: s.title.trim(), body: s.body.trim() })
  }
  return { ok: true, data: { steps: clean, limits: String(parsed.limits || '').trim().slice(0, MAX_LIMITS) } }
}

module.exports = {
  MEASURE_KEYS,
  MEASURE_NAMES,
  MAX_LIMITS,
  BANDS,
  POSITIONS,
  validateSendList,
  renderSendList,
  validateDraft
}
