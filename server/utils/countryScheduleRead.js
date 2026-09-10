'use strict'

/**
 * @file Reading a country's WHOLE published schedule — a survey, then one pass per page
 *   range, added up on this side.
 * @module server/utils/countryScheduleRead
 *
 * Item 4.92, slice 2. The artefact is section 3 of
 * `design/mockups/depreciation-rates-country-schedules.html`, approved by Mike 2026-09-11.
 *
 * 🔴 WHY THE READ IS SPLIT AT ALL, AND IT IS THE WHOLE ITEM. On 2026-09-11 the real IR265 was
 * sent to the model in one request. It came back readable, correctly named IR265, correctly
 * dated October 2023, flagging three genuine contradictions in Inland Revenue's own schedule —
 * and proposing NO RATES AND NO CLASSES AT ALL (item 4.91). `refusedRows` was 0, so nothing was
 * rejected on our side: the model simply sent empty lists. Its class cap was 250 against a
 * document that publishes about 2,800 across 52 table pages (item 4.90). Raising a number was
 * never the fix. ONE ANSWER CANNOT CARRY A 52-PAGE SCHEDULE, so each request asks for a page
 * range and this module adds the answers up.
 *
 * 🔴 THE SURVEY PASS EXISTS BECAUSE WE ARE NOT ALLOWED TO OPEN THE PDF. Mike ruled on
 * 2026-09-09 that a document is sent to the model and read there — the local text extraction it
 * replaced is what turned *"diminishing value"* into `diinisin alue`. So nothing on this side
 * knows how many pages a schedule has, and a read cannot be divided into page ranges until
 * something says how far it runs. The model is the only thing that has read it, so the model is
 * asked first, in one cheap call that reads no rates. Counting the pages ourselves would mean a
 * PDF library on a locked Node 14.15 and would re-open the exact door that ruling closed.
 *
 * 🔴 A FAILED PASS NEVER DISCARDS THE PASSES THAT WORKED — Mike's second ruling of 2026-09-11.
 * A pass is retried once on its own; if it still will not read, its page range is recorded in
 * `pagesUnread` and everything else is kept. Under the rule this replaces, one pair of rows
 * about undersea cable capacity on pages 39–40 threw away all 52 pages of IR265.
 *
 * ⚠ NOTHING HERE IS TRUSTED AS STRUCTURED DATA. `CLAUDE.md` requires an LLM's output to be
 * parsed and validated before it reaches state, and every class read here can be picked by a
 * manager and written into a firm's approved rates, which reach a document a lender reads.
 * A class that cannot carry a rate in range, a page inside the pass's own range, and a label is
 * dropped — and dropping it is counted, so the screen can say how many were refused.
 *
 * ⚠ THIS MODULE SPENDS MONEY. One survey plus one request per eight pages: seven passes for
 * IR265's 52 pages, nine for a 71-page schedule. Mike ruled on 2026-09-11 that a country
 * schedule has its OWN reading allowance, kept apart from a firm's 20 a day — the number is his
 * and is not set here. Nothing in this module checks a budget; the ROUTE spends it, once per
 * schedule, before the survey is sent.
 *
 * Node 14, CommonJS.
 */

const { createOpenAIClient } = require('./openaiClient')
const aiPrompts = require('./aiPrompts')
// The pure helpers only — request assembly, response reading, JSON parsing and one-line text.
// They are shared rather than copied so the two readers cannot drift on what a fenced answer
// is or how a streamed response is assembled. Nothing stateful is taken.
//
// ⚠ `UNREADABLE_MESSAGE` IS TAKEN FROM THERE DELIBERATELY. It is Mike's pinned wording of
// 2026-09-09, which a test holds him to. A manager who loads a whole schedule and one who loads
// a single document have had the same thing happen to them, and two wordings for one event is
// how a screen starts sounding like two different products.
const {
  MAX_PDF_BYTES,
  PDF_MIME,
  MODEL,
  IDLE_TIMEOUT_MS,
  UNREADABLE_MESSAGE,
  buildRequest,
  textFromResponse,
  parseModelJson,
  oneLine
} = require('./depreciationExtract')
const {
  MAX_SCHEDULE_CLASSES,
  MAX_UNRESOLVED,
  MAX_PAGE,
  cleanClass
} = require('./countrySchedules')
const { normaliseCountry, publishedKey, num } = require('./sourcedFigure')

/** The two prompts this module runs, as declared in `data/ai-prompts.json`. */
const SURVEY_PROMPT_ID = 'country-schedule-survey'
const PASS_PROMPT_ID = 'country-schedule-pass'

/**
 * How many pages one pass asks for.
 *
 * ⚠ EIGHT IS THE DRAWN NUMBER AND IT IS A JUDGEMENT, NOT A MEASUREMENT. IR265 prints about 54
 * classes to a page, so eight pages is roughly 430 classes in one answer — comfortably inside
 * what a reply carries, and far enough from the limit that a dense page does not tip it over.
 * Fewer pages per pass costs more requests for the same schedule; more risks reproducing 4.91
 * on a smaller scale, where the failure is a silently short list rather than an error.
 */
const PAGES_PER_PASS = 8

/**
 * The most passes one schedule may take.
 *
 * A ceiling on cost, and on a survey that answers with a nonsense page count. Forty passes is
 * 320 pages — far beyond any published depreciation schedule. A document needing more is one
 * somebody should look at rather than one we quietly spend forty requests on.
 */
const MAX_PASSES = 40

/** Longest a document name may be. Matches the store's own cap. */
const MAX_LABEL = 120

/** Swappable for tests, exactly as `depreciationExtract` does it. */
let _clientFactory = createOpenAIClient

/** @param {Function} [factory] - a `createOpenAIClient`-shaped factory; absent restores the real one */
function _setClientFactory (factory) {
  _clientFactory = factory || createOpenAIClient
}

/**
 * A whole page number inside a believable document, or null.
 * @param {*} v
 * @returns {number|null}
 */
function pageNumber (v) {
  const n = num(v)
  if (n === null || !Number.isInteger(n)) { return null }
  return (n >= 1 && n <= MAX_PAGE) ? n : null
}

/**
 * Validate the survey — what the document is, and how far it runs.
 *
 * Refused outright in three ways, each a different sentence to the manager:
 *   - `UNREADABLE`       — the model said so. Nothing is read (Mike's rule of 2026-09-09).
 *   - `MALFORMED`        — the answer is not the shape section 6 asked for, or names no
 *                          document, edition or page count we can use.
 *   - `COUNTRY_MISMATCH` — the document is another country's. A schedule is tagged with its
 *                          country and reaches only clients in it, so building a New Zealand
 *                          table out of an Australian schedule would defeat that at step one —
 *                          and it is far likelier to be a manager picking the wrong file.
 *
 * @param {*} raw - the parsed model answer
 * @param {object} opts
 * @param {string} opts.country - the two-letter code the manager declared on upload
 * @returns {{ok: boolean, code: (string|null), message: (string|null), detail: (string|undefined), survey: (object|null)}}
 */
function validateSurvey (raw, opts) {
  const declared = normaliseCountry(opts && opts.country)
  if (declared === null) {
    return { ok: false, code: 'MALFORMED', message: 'No country was declared for this schedule', survey: null }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, code: 'MALFORMED', message: UNREADABLE_MESSAGE, survey: null }
  }

  // Strictly boolean. A missing flag is not a quiet yes: the one judgement the prompt asks for
  // first must be present before anything else it returns is worth reading.
  if (raw.readable !== true) {
    if (raw.readable === false) {
      // The model's own sentence saying what defeated it. LOGGED AND NEVER SHOWN — the manager
      // gets Mike's pinned wording. Before this existed a refusal was a dead end for whoever had
      // to work out why, and IR265 cost three paid readings to diagnose for exactly that reason.
      return {
        ok: false,
        code: 'UNREADABLE',
        message: UNREADABLE_MESSAGE,
        detail: oneLine(raw.whyUnreadable) || '',
        survey: null
      }
    }
    return { ok: false, code: 'MALFORMED', message: UNREADABLE_MESSAGE, survey: null }
  }

  const doc = raw.document
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return { ok: false, code: 'MALFORMED', message: UNREADABLE_MESSAGE, survey: null }
  }

  const document = oneLine(doc.name).slice(0, MAX_LABEL)
  if (!document) {
    return { ok: false, code: 'MALFORMED', message: UNREADABLE_MESSAGE, survey: null }
  }

  const published = typeof doc.published === 'string' ? doc.published.trim() : ''
  if (publishedKey(published) === null) {
    return { ok: false, code: 'MALFORMED', message: UNREADABLE_MESSAGE, survey: null }
  }

  const found = normaliseCountry(doc.country)
  if (found !== null && found !== declared) {
    return {
      ok: false,
      code: 'COUNTRY_MISMATCH',
      message: 'This schedule is published for ' + found + ', not ' + declared +
        '. Load it under ' + found + ', or load a ' + declared + ' schedule instead.',
      survey: null
    }
  }

  const totalPages = pageNumber(raw.totalPages)
  if (totalPages === null) {
    return { ok: false, code: 'MALFORMED', message: UNREADABLE_MESSAGE, survey: null }
  }

  // Ranges the model could not express usably are dropped rather than repaired, and an empty
  // list falls back to the whole document below — reading too much is wasteful, reading too
  // little loses classes silently, and only one of those is recoverable.
  const tableRanges = []
  const offered = Array.isArray(raw.tableRanges) ? raw.tableRanges : []
  offered.forEach((one) => {
    if (!one || typeof one !== 'object' || Array.isArray(one)) { return }
    const from = pageNumber(one.from)
    const to = pageNumber(one.to)
    if (from === null || to === null || to < from) { return }
    if (from > totalPages) { return }
    tableRanges.push({ from, to: Math.min(to, totalPages) })
  })

  return {
    ok: true,
    code: null,
    message: null,
    survey: {
      document,
      published,
      country: declared,
      totalPages,
      tableRanges: tableRanges.length ? tableRanges : [{ from: 1, to: totalPages }],
      firstYearRuleFound: raw.firstYearRuleFound === true
    }
  }
}

/**
 * The passes one schedule takes, from the survey's ranges.
 *
 * ⚠ RANGES ARE READ IN THE ORDER GIVEN AND NEVER MERGED ACROSS A GAP. A schedule whose tables
 * are interrupted by chapters of prose has real gaps in it, and joining two ranges to save a
 * request would pay to read the prose between them.
 *
 * ⚠ PAST `MAX_PASSES` THE REST IS NOT SILENTLY LOST — the pages that will not be read come back
 * as `unplanned`, so the caller records them as a named gap exactly as a failed pass is. This is
 * the same rule as item 4.90's, applied before a request is spent rather than after.
 *
 * @param {Array<{from: number, to: number}>} tableRanges
 * @returns {{passes: Array<{from: number, to: number}>, unplanned: Array<{from: number, to: number}>}}
 */
function planPasses (tableRanges) {
  const passes = []
  const unplanned = []
  const ranges = Array.isArray(tableRanges) ? tableRanges : []

  for (let r = 0; r < ranges.length; r++) {
    const range = ranges[r]
    if (!range || !Number.isInteger(range.from) || !Number.isInteger(range.to) || range.to < range.from) {
      continue
    }
    let cursor = range.from
    while (cursor <= range.to) {
      const to = Math.min(cursor + PAGES_PER_PASS - 1, range.to)
      if (passes.length >= MAX_PASSES) {
        unplanned.push({ from: cursor, to: range.to })
        cursor = range.to + 1
        break
      }
      passes.push({ from: cursor, to })
      cursor = to + 1
    }
    // Every remaining range is unread once the cap is hit, and each is named.
    if (passes.length >= MAX_PASSES && cursor > range.to && r + 1 < ranges.length) {
      for (let k = r + 1; k < ranges.length; k++) {
        const rest = ranges[k]
        if (rest && Number.isInteger(rest.from) && Number.isInteger(rest.to) && rest.to >= rest.from) {
          unplanned.push({ from: rest.from, to: rest.to })
        }
      }
      break
    }
  }

  return { passes, unplanned }
}

/**
 * Validate one pass — the classes printed on one range of pages.
 *
 * @param {*} raw - the parsed model answer
 * @param {object} opts
 * @param {number} opts.from - the first page this pass covered
 * @param {number} opts.to - the last page this pass covered
 * @param {{document: string, published: string}} opts.source - from the survey
 * @returns {{ok: boolean, code: (string|null), detail: (string|undefined), classes: object[], unresolved: object[], refusedRows: number, outOfRange: number}}
 */
function validatePass (raw, opts) {
  const empty = { classes: [], unresolved: [], refusedRows: 0, outOfRange: 0 }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return Object.assign({ ok: false, code: 'MALFORMED' }, empty)
  }
  if (raw.readable !== true) {
    return Object.assign({
      ok: false,
      code: raw.readable === false ? 'UNREADABLE' : 'MALFORMED',
      detail: oneLine(raw.whyUnreadable) || ''
    }, empty)
  }

  const classes = []
  const errors = []
  let refusedRows = 0
  let outOfRange = 0

  const offered = Array.isArray(raw.classes) ? raw.classes : []
  offered.forEach((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) { refusedRows++; return }

    const page = pageNumber(row.page)
    if (page === null) { refusedRows++; return }
    // 🔴 A CLASS FROM OUTSIDE THIS PASS'S PAGES IS DROPPED, and counted separately from a
    // malformed one. Another pass covers those pages and reports them with the right page
    // number; keeping this copy would either duplicate that one or beat it to the name and
    // win, which would put a class in the table under a page it was not printed on.
    if (page < opts.from || page > opts.to) { outOfRange++; return }

    // Reshaped into the STORE's own class shape and validated by the store's own checker, so
    // there is no second definition of what a class is and nothing can pass here that the
    // store would later refuse.
    const candidate = {
      label: oneLine(row.class),
      method: row.method,
      dvRate: row.dvRate,
      slRate: row.slRate,
      lifeYears: row.lifeYears,
      source: { document: opts.source.document, page: String(page), published: opts.source.published }
    }
    const cleaned = cleanClass(candidate, 'pass', errors)
    if (cleaned === null) { refusedRows++; return }
    classes.push(cleaned)
  })

  const unresolved = []
  const flagged = Array.isArray(raw.unresolved) ? raw.unresolved : []
  flagged.forEach((row) => {
    if (unresolved.length >= MAX_UNRESOLVED) { return }
    if (!row || typeof row !== 'object' || Array.isArray(row)) { return }
    const label = oneLine(row.class)
    if (!label) { return }
    unresolved.push({
      label,
      pages: oneLine(row.pages) || '',
      differs: oneLine(row.differs) || ''
    })
  })

  return { ok: true, code: null, classes, unresolved, refusedRows, outOfRange }
}

/**
 * Send one prompt with the document attached, and return the parsed answer.
 *
 * ⚠ THE READ STREAMS, AND THAT IS NOT A PREFERENCE. `openaiClient` guards every call with a
 * per-socket INACTIVITY timeout; a non-streamed read of eight dense pages can spend its whole
 * duration with no bytes on the socket, which is precisely what that guard kills. The events
 * are accumulated here and parsed once at the end — nothing is shown as it arrives.
 *
 * @param {object} opts
 * @param {string} opts.promptId
 * @param {object} opts.replacements - `{{name}}` to value, all already validated
 * @param {string} opts.scopeId - the VERIFIED scope, for the prompt's own tier overrides
 * @param {string} opts.filename
 * @param {string} opts.base64 - the document, encoded once by the caller and reused per pass
 * @param {Function} opts.loadFirmConfig
 * @returns {Promise<{ok: boolean, code: (string|null), message: (string|null), answer: string, parsed: (object|null)}>}
 *   Never rejects on a model or network fault.
 */
async function _send (opts) {
  let promptText
  try {
    const overrides = await aiPrompts.loadResolvedAiPromptOverrides(opts.scopeId, opts.loadFirmConfig)
    const assembled = aiPrompts.assemblePrompt(opts.promptId, overrides)
    if (assembled.blocked) {
      return {
        ok: false,
        code: 'PROMPT_BLOCKED',
        message: 'A setting this prompt needs has not been filled in. A manager can set it on the AI Prompts page.',
        answer: '',
        parsed: null
      }
    }
    promptText = assembled.text
    // `split`/`join`, never `String.replace`: a replacement containing `$&` would be
    // interpreted. Every value here is a country code or a page number checked above, so this
    // is belt to that brace.
    Object.keys(opts.replacements).forEach((key) => {
      promptText = promptText.split('{{' + key + '}}').join(String(opts.replacements[key]))
    })
  } catch (err) {
    console.error('[country-schedule] prompt assembly failed:', err.message)
    return { ok: false, code: 'PROMPT_UNAVAILABLE', message: 'The reading instructions could not be assembled', answer: '', parsed: null }
  }

  let completed = null
  try {
    const client = _clientFactory({ apiKey: process.env.OPENAI_API_KEY })
    const events = await client.responses.create(
      buildRequest({ promptText, filename: opts.filename, base64: opts.base64 }),
      { timeout: IDLE_TIMEOUT_MS }
    )
    for await (const event of events) {
      if (event && event.type === 'response.completed' && event.response) {
        completed = event.response
      }
    }
  } catch (err) {
    console.error('[country-schedule] request failed:', err.message)
    return {
      ok: false,
      code: 'READ_FAILED',
      message: 'The schedule could not be sent for reading. Nothing has changed — try again.',
      answer: '',
      parsed: null
    }
  }

  if (!completed) {
    return {
      ok: false,
      code: 'READ_INCOMPLETE',
      message: 'The reading did not finish. Nothing has been proposed — load the schedule again.',
      answer: '',
      parsed: null
    }
  }

  const answer = textFromResponse(completed)
  return { ok: true, code: null, message: null, answer, parsed: parseModelJson(answer) }
}

/**
 * Read a whole country schedule: survey it, plan the passes, run them, and add them up.
 *
 * 🔴 WHAT COMES BACK IS A PROPOSAL AND NOTHING MORE. It carries no approver and no approval
 * date, so `validateCountrySchedule` refuses it until a manager approves it — the same
 * structural gate that makes the six rates safe. There is no flag to forget to test.
 *
 * @param {object} opts
 * @param {string} opts.scopeId - the VERIFIED scope, never a request body
 * @param {string} opts.country - the two-letter code the manager declared
 * @param {string} opts.filename
 * @param {Buffer} opts.buffer - the document itself
 * @param {Function} opts.loadFirmConfig - the overlay reader, injected
 * @param {Function} [opts.onProgress] - called with a plain object after each pass, so a
 *   screen can show "pass 4 of 9". Its faults are swallowed: progress reporting must never
 *   lose a read that has already been paid for.
 * @returns {Promise<{ok: boolean, code: (string|null), message: (string|null), detail: (string|undefined), reading: (object|null)}>}
 *   Never rejects.
 */
async function readSchedule (opts) {
  const country = normaliseCountry(opts.country)
  if (country === null) {
    return { ok: false, code: 'INVALID_COUNTRY', message: 'country must be a two-letter code, such as NZ', reading: null }
  }
  if (!Buffer.isBuffer(opts.buffer) || opts.buffer.length === 0) {
    return { ok: false, code: 'NO_FILE', message: 'No document was received', reading: null }
  }
  if (opts.buffer.length > MAX_PDF_BYTES) {
    return { ok: false, code: 'TOO_LARGE', message: 'That file is larger than 20 MB', reading: null }
  }

  // Encoded ONCE and reused by every pass. A 20 MB document re-encoded nine times is 180 MB of
  // avoidable string building on a request that is already slow.
  const base64 = opts.buffer.toString('base64')
  const common = {
    scopeId: opts.scopeId,
    filename: opts.filename,
    base64,
    loadFirmConfig: opts.loadFirmConfig
  }

  const report = (payload) => {
    if (typeof opts.onProgress !== 'function') { return }
    try { opts.onProgress(payload) } catch (err) {
      console.error('[country-schedule] progress report failed:', err.message)
    }
  }

  // ── The survey ────────────────────────────────────────────────────────────────────────
  const surveyed = await _send(Object.assign({
    promptId: SURVEY_PROMPT_ID,
    replacements: { country }
  }, common))
  if (!surveyed.ok) {
    return { ok: false, code: surveyed.code, message: surveyed.message, reading: null }
  }

  const survey = validateSurvey(surveyed.parsed, { country })
  if (!survey.ok) {
    console.error(
      '[country-schedule] survey refused as ' + survey.code +
      ' · answer length=' + surveyed.answer.length +
      (survey.detail ? ' · the model said: ' + JSON.stringify(survey.detail) : '') +
      ' · answer began: ' + JSON.stringify(surveyed.answer.slice(0, 400))
    )
    return { ok: false, code: survey.code, message: survey.message, detail: survey.detail, reading: null }
  }

  const source = { document: survey.survey.document, published: survey.survey.published }
  const { passes, unplanned } = planPasses(survey.survey.tableRanges)
  report({ state: 'surveyed', document: source.document, published: source.published, totalPages: survey.survey.totalPages, passes: passes.length })

  // ── The passes ────────────────────────────────────────────────────────────────────────
  const classes = []
  const seen = {}
  const unresolved = []
  const pagesRead = []
  const pagesUnread = unplanned.slice()
  let refusedRows = 0
  let outOfRange = 0
  let cappedAt = null

  for (let i = 0; i < passes.length; i++) {
    const pass = passes[i]

    // Every remaining pass is unread once the store's cap is reached. Stopping is right and
    // dropping silently is not: a table that ends part-way through the document with nothing
    // saying so is item 4.90, and the whole point of this rewrite is not to repeat it.
    if (classes.length >= MAX_SCHEDULE_CLASSES) {
      cappedAt = classes.length
      for (let k = i; k < passes.length; k++) { pagesUnread.push({ from: passes[k].from, to: passes[k].to }) }
      break
    }

    let result = null
    // Retried ONCE, on its own. Mike's second ruling: a pass that will not read does not throw
    // the schedule away — but one transient fault should not cost a page range either.
    for (let attempt = 0; attempt < 2 && result === null; attempt++) {
      const sent = await _send(Object.assign({
        promptId: PASS_PROMPT_ID,
        replacements: { country, fromPage: pass.from, toPage: pass.to }
      }, common))
      if (!sent.ok) { continue }
      const parsed = validatePass(sent.parsed, { from: pass.from, to: pass.to, source })
      if (!parsed.ok) {
        console.error(
          '[country-schedule] pass ' + pass.from + '-' + pass.to + ' refused as ' + parsed.code +
          (parsed.detail ? ' · the model said: ' + JSON.stringify(parsed.detail) : '') +
          ' · answer began: ' + JSON.stringify(sent.answer.slice(0, 300))
        )
        continue
      }
      result = parsed
    }

    if (result === null) {
      pagesUnread.push({ from: pass.from, to: pass.to })
      report({ state: 'pass-failed', pass: i + 1, of: passes.length, from: pass.from, to: pass.to, classes: classes.length })
      continue
    }

    result.classes.forEach((one) => {
      if (classes.length >= MAX_SCHEDULE_CLASSES) { return }
      // A class the document prints in two places is one class. The FIRST wins, so the order
      // the document prints them in is the order that survives.
      const key = one.label.toLowerCase()
      if (seen[key]) { return }
      seen[key] = true
      classes.push(one)
    })
    result.unresolved.forEach((one) => {
      if (unresolved.length >= MAX_UNRESOLVED) { return }
      unresolved.push(one)
    })
    refusedRows += result.refusedRows
    outOfRange += result.outOfRange
    pagesRead.push({ from: pass.from, to: pass.to })

    report({ state: 'pass-done', pass: i + 1, of: passes.length, from: pass.from, to: pass.to, classes: classes.length })
  }

  // ⚠ A SUCCESS IS LOGGED AS FULLY AS A FAILURE, which is the half the per-document reader did
  // not have until 2026-09-11. A read that proposes nothing is indistinguishable from a healthy
  // one in every other record we keep — that is item 4.91, and it cost three paid readings to
  // diagnose. Server-side only and never shown: the subject is a PUBLISHED TAX SCHEDULE, and no
  // client, business or person is in this request at all.
  console.error(
    '[country-schedule] read ' + JSON.stringify(source.document) +
    ' ' + country +
    ' · pages=' + survey.survey.totalPages +
    ' · passes planned=' + passes.length +
    ' read=' + pagesRead.length +
    ' unread=' + pagesUnread.length +
    ' · classes=' + classes.length +
    ' unresolved=' + unresolved.length +
    ' refused=' + refusedRows +
    ' outOfRange=' + outOfRange +
    (cappedAt === null ? '' : ' · STOPPED AT THE ' + MAX_SCHEDULE_CLASSES + '-CLASS CAP') +
    (classes.length === 0 ? ' · NO CLASSES WERE READ — item 4.91 again' : '')
  )

  // Every pass failed, or the survey planned none. A proposal with nothing in it cannot be
  // approved and must not be offered as though it could — that is exactly item 4.91.
  if (classes.length === 0) {
    return {
      ok: false,
      code: 'NOTHING_READ',
      message: 'The schedule was opened and named, but no classes could be read from it. ' +
        'Nothing has been stored. Try downloading it again from the tax authority\'s website, ' +
        'or load a different edition.',
      reading: null
    }
  }

  return {
    ok: true,
    code: null,
    message: null,
    reading: {
      country,
      document: source.document,
      published: source.published,
      totalPages: survey.survey.totalPages,
      firstYearRuleFound: survey.survey.firstYearRuleFound,
      pagesRead,
      pagesUnread,
      classes,
      unresolved,
      refusedRows,
      outOfRange,
      passesPlanned: passes.length
    }
  }
}

module.exports = {
  SURVEY_PROMPT_ID,
  PASS_PROMPT_ID,
  PAGES_PER_PASS,
  MAX_PASSES,
  MAX_PDF_BYTES,
  PDF_MIME,
  MODEL,
  UNREADABLE_MESSAGE,
  pageNumber,
  validateSurvey,
  planPasses,
  validatePass,
  readSchedule,
  _setClientFactory
}
