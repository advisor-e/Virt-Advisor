'use strict'

/**
 * @file Sending one tax-authority depreciation schedule to the model, and refusing to
 *   believe what comes back until every field of it has been checked.
 * @module server/utils/depreciationExtract
 *
 * Item 4.78, slice 3. The prompt itself is `depreciation-read` in `data/ai-prompts.json`,
 * where a manager can read it on the AI Prompts tab at any of the four tiers; this module
 * assembles it, attaches the document, and validates the answer.
 *
 * 🔴 THE APPLICATION DOES NOT READ THE PDF, AND THAT IS MIKE'S RULING OF 2026-09-09 (FR-046).
 * The file is sent to the model and read there. Extracting text locally is the tooling that
 * turned *"diminishing value"* into `diinisin alue` on IR265 on 2026-09-08 — damaged text
 * that still read as English, so a search for a missing term returned nothing and the
 * nothing looked like an answer. It would also be a new dependency on a locked Node 14.15.
 *
 * 🔴 NOTHING THE MODEL RETURNS IS TRUSTED AS STRUCTURED DATA. `CLAUDE.md` requires an LLM's
 * output to be parsed and validated before it reaches state, and every rate here is bound
 * for a document a lender reads. `validateReading` therefore refuses a whole read that
 * cannot name its document and date, and refuses an individual ROW that cannot carry a rate
 * in range with a page and a class — a refused row becomes a NAMED GAP rather than a
 * half-filled table (FR-048). A table with three sound rows and one guess looks exactly
 * like a table with four sound rows.
 *
 * 🔴 A PARTIAL READ IS NEVER A PARTIAL PROPOSAL (FR-047). `readable: false` proposes nothing
 * at all, and the person is told in Mike's own words — `UNREADABLE_MESSAGE` below, settled
 * verbatim on 2026-09-09. The model's own explanation of what defeated it is never shown
 * (FR-050): unedited model text on a screen is the one thing this feature is otherwise
 * careful never to do.
 *
 * ⚠ THE READ STREAMS, AND THAT IS NOT A PREFERENCE. `openaiClient` guards every call with a
 * per-socket INACTIVITY timeout; a non-streamed read of a 60-page schedule spends its whole
 * duration with no bytes on the socket, which is precisely what that guard kills. Streaming
 * keeps traffic flowing. The events are accumulated here and the assembled text is parsed
 * once at the end — nothing is shown as it arrives.
 *
 * Node 14, CommonJS.
 */

const { createOpenAIClient } = require('./openaiClient')
// The whole module rather than the two functions, so a test can stand in for one of them:
// both of this file's prompt-assembly failure paths are otherwise unreachable, and an error
// path nobody has run is an error path nobody knows the shape of.
const aiPrompts = require('./aiPrompts')
const {
  CATEGORY_KEYS,
  METHODS,
  normaliseCountry,
  publishedKey
} = require('./depreciationRates')

/** The prompt this module runs, as declared in `data/ai-prompts.json`. */
const PROMPT_ID = 'depreciation-read'

/**
 * The model. The same one the Economic Analysis runs on (`server/routes/economicAnalysis.js`),
 * for the same reason: it is the one this app has exercised against real documents. A
 * schedule read needs no web search, so no `tools` are sent.
 */
const MODEL = 'gpt-6-astra'

/**
 * Largest document accepted, matching the approved drawing's *"PDF, up to 20 MB"*.
 *
 * ⚠ THE MODEL MAY STILL REFUSE A FILE THIS SIDE ACCEPTS — its own limits are on pages as
 * well as bytes. That refusal surfaces as a plain failure to the manager rather than as an
 * empty success; it cannot be measured from here, and pretending otherwise would be the
 * same fault as the damage percentage FR-049 removed.
 */
const MAX_PDF_BYTES = 20 * 1024 * 1024

/** The only content type accepted. A schedule is published as a PDF. */
const PDF_MIME = 'application/pdf'

/**
 * Idle guard for the read, in milliseconds. Generous because a long schedule takes minutes
 * of model time, and safe because it is per-socket inactivity rather than total duration —
 * a stream that is still delivering keeps resetting it.
 */
const IDLE_TIMEOUT_MS = 180000

/** Longest class label or document title kept, in characters. Matches the store's own cap. */
const MAX_LABEL = 120

/**
 * How many published classes are kept from one document, for the manager's own picker.
 *
 * ⚠ A CAP, NOT A TARGET, AND IT IS ABOVE THE REAL DOCUMENTS. IR265 publishes about 156
 * classes and the approved drawing's picker says so in as many words; 250 clears that with
 * room for a longer schedule, while stopping a runaway answer from filling a firm's stored
 * record. Classes past the cap are dropped from the END, so the order the document prints
 * them in is the order that survives.
 */
const MAX_CLASSES = 250

/**
 * How many unsettled entries are kept from one document.
 *
 * These are not rates and nothing is ever taken from them: each names a class, the pages it
 * appears on and what differs, so a manager can settle it against the document themselves
 * (section 3 of the prompt). Fifty is far above what a published schedule produces — IR265
 * produced exactly one — and exists so a confused answer cannot fill a firm's stored record.
 */
const MAX_UNRESOLVED = 50

/**
 * 🔴 MIKE'S WORDS, SETTLED 2026-09-09, AND PINNED BY TEST BECAUSE THEY ARE LOAD-BEARING.
 *
 * This is the whole of what a person is told when a document cannot be read. It replaced a
 * panel in both approved drawings that quoted a measured damage figure — *"about 12% of the
 * text came through damaged"* — which the application can no longer measure now that it is
 * not the one reading (FR-049). Changing this sentence changes what a manager believes
 * happened to their document, so it is not free wording.
 */
const UNREADABLE_MESSAGE = 'This document could not be read reliably — nothing was taken ' +
  'from it. No rates have been proposed and nothing has changed. Try downloading it again ' +
  'from the tax authority\'s website, or load a different edition.'

/** A finite number, or null. Mirrors the store's own reader so the two cannot disagree. */
function num (v) {
  if (v === null || v === undefined || v === '') { return null }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/**
 * One line of the model's text, capped, with control characters removed.
 *
 * A class label is the tax authority's own wording and reaches a screen and a printed
 * report. Everything except its first line is dropped rather than escaped: a label is a
 * name, and a name that arrives with three paragraphs behind it is not one.
 *
 * @param {*} value
 * @returns {string} may be empty, which callers treat as absent
 */
function oneLine (value) {
  if (typeof value !== 'string') { return '' }
  const first = value.split('\n')[0]
  // eslint-disable-next-line no-control-regex
  return first.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, MAX_LABEL)
}

/**
 * Builds the request body for one document read.
 *
 * The file rides as a base64 data URL on the Responses API's `input_file` part, which needs
 * no multipart upload and no Files API — both of which would mean new machinery on a locked
 * runtime for no gain.
 *
 * @param {object} opts
 * @param {string} opts.promptText - the assembled prompt, country already substituted
 * @param {string} opts.filename - the document's own name, for the model's reference only
 * @param {string} opts.base64 - the PDF, base64 encoded
 * @returns {object} the params for `client.responses.create`
 */
function buildRequest (opts) {
  return {
    model: MODEL,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: opts.promptText },
          {
            type: 'input_file',
            filename: opts.filename,
            file_data: 'data:' + PDF_MIME + ';base64,' + opts.base64
          }
        ]
      }
    ],
    stream: true
  }
}

/**
 * The model's text from a completed `/v1/responses` response, in either shape it arrives in.
 *
 * @param {object} response
 * @returns {string}
 */
function textFromResponse (response) {
  if (!response || typeof response !== 'object') { return '' }
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text
  }
  const parts = []
  const output = Array.isArray(response.output) ? response.output : []
  output.forEach((item) => {
    const content = item && Array.isArray(item.content) ? item.content : []
    content.forEach((part) => {
      if (part && typeof part.text === 'string') { parts.push(part.text) }
    })
  })
  return parts.join('\n')
}

/**
 * Parses the model's reply as JSON, tolerating a code fence around it.
 *
 * Section 8 of the prompt asks for bare JSON; a fence is the one deviation common enough to
 * be worth absorbing, and absorbing it here is cheaper than a refused read a manager cannot
 * act on. Anything else parses to null and is refused as malformed.
 *
 * @param {string} text
 * @returns {object|null}
 */
function parseModelJson (text) {
  if (typeof text !== 'string') { return null }
  let body = text.trim()
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/i.exec(body)
  if (fenced) { body = fenced[1].trim() }
  if (!body) { return null }
  try {
    const parsed = JSON.parse(body)
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : null
  } catch (e) {
    return null
  }
}

/**
 * Validates the FIGURES of one row — the part a proposed category and a published class have
 * in common — into the shape the approved store already accepts.
 *
 * Returning the STORE's shape is deliberate: what a manager approves is handed to
 * `validateDepreciationRates` unchanged, so there is no second definition of what a rate is
 * and no translation step in which a field could be lost. A class the manager PICKS instead
 * of the proposed match is written to that same store, so it has to clear the same bar —
 * which is why one function serves both rather than two that could drift apart.
 *
 * @param {*} row - one entry of the model's `rates` or `classes` array
 * @param {object} source - `{ document, published }` from the document itself
 * @returns {object|null} the store-shaped entry, or null when the row is refused
 */
function cleanFigures (row, source) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) { return null }

  const method = row.method
  if (!METHODS.includes(method)) { return null }

  const dvRate = num(row.dvRate)
  const slRate = num(row.slRate)
  // Refused, never rescaled: a 50 here is a rate in the wrong unit, and reading it as 5000%
  // would depreciate an asset to nothing in a forecast that still balances.
  if (dvRate !== null && (dvRate <= 0 || dvRate > 1)) { return null }
  if (slRate !== null && (slRate <= 0 || slRate > 1)) { return null }

  const operative = method === 'dv' ? dvRate : slRate
  if (operative === null) { return null }

  const label = oneLine(row.class)
  if (!label) { return null }

  const lifeYears = num(row.lifeYears)
  if (lifeYears !== null && (lifeYears <= 0 || lifeYears > 100)) { return null }

  const page = oneLine(row.page).slice(0, 20)

  return {
    label,
    method,
    dvRate,
    slRate,
    lifeYears,
    source: { document: source.document, page: page || null, published: source.published }
  }
}

/**
 * Validates one proposed row — a published class the model matched to one of the six.
 *
 * @param {*} row - one entry of the model's `rates` array
 * @param {object} source - `{ document, published }` from the document itself
 * @returns {{key: string, entry: object}|null} null when the row is refused
 */
function cleanRow (row, source) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) { return null }

  const key = typeof row.category === 'string' ? row.category.trim() : ''
  if (!CATEGORY_KEYS.includes(key)) { return null }

  const entry = cleanFigures(row, source)
  return entry === null ? null : { key, entry }
}

/**
 * Validates a whole reading: the document it names, and every row in it.
 *
 * Three ways a read is refused outright, and each is a different sentence to the manager:
 *   - `UNREADABLE`      — the model said so. Nothing is proposed (FR-047).
 *   - `MALFORMED`       — the answer is not the shape section 8 asked for, or names no
 *                         document, or no date we can rank. Believing half of it is worse
 *                         than believing none.
 *   - `COUNTRY_MISMATCH`— the document is another country's. An approved table is tagged
 *                         with its country and reaches only clients in it (FR-012); building
 *                         a New Zealand table out of an Australian schedule would defeat that
 *                         at the first step, and it is far likelier to be a manager picking
 *                         the wrong file than the model misreading a masthead.
 *
 * A read that survives may still propose NOTHING — every row refused, or none offered. That
 * is a success with six gaps, not a failure: the categories are named on screen and each
 * keeps the figure it already had (FR-032).
 *
 * @param {*} raw - the parsed model answer
 * @param {object} opts
 * @param {string} opts.country - the two-letter code the manager declared on upload
 * @returns {{ok: boolean, code: (string|null), message: (string|null), reading: (object|null)}}
 */
function validateReading (raw, opts) {
  const declared = normaliseCountry(opts && opts.country)
  if (declared === null) {
    return { ok: false, code: 'MALFORMED', message: 'No country was declared for this document', reading: null }
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, code: 'MALFORMED', message: UNREADABLE_MESSAGE, reading: null }
  }

  // Strictly boolean. A missing flag is not a quiet yes: the one judgement this prompt asks
  // for first must be present before anything it returns is worth reading.
  if (raw.readable !== true) {
    if (raw.readable === false) {
      // `detail` is the model's own sentence saying what defeated it, added to the prompt on
      // 2026-09-11. It is LOGGED AND NEVER SENT: the manager gets UNREADABLE_MESSAGE, which is
      // Mike's pinned wording. Before this existed, a refusal was a dead end for whoever had to
      // work out why — IR265 cost three paid readings to diagnose for exactly that reason.
      return {
        ok: false,
        code: 'UNREADABLE',
        message: UNREADABLE_MESSAGE,
        detail: oneLine(raw.whyUnreadable) || '',
        reading: null
      }
    }
    return { ok: false, code: 'MALFORMED', message: UNREADABLE_MESSAGE, reading: null }
  }

  const doc = raw.document
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return { ok: false, code: 'MALFORMED', message: UNREADABLE_MESSAGE, reading: null }
  }

  const document = oneLine(doc.name)
  if (!document) {
    return { ok: false, code: 'MALFORMED', message: UNREADABLE_MESSAGE, reading: null }
  }

  const published = typeof doc.published === 'string' ? doc.published.trim() : ''
  if (publishedKey(published) === null) {
    return { ok: false, code: 'MALFORMED', message: UNREADABLE_MESSAGE, reading: null }
  }

  const found = normaliseCountry(doc.country)
  if (found !== null && found !== declared) {
    return {
      ok: false,
      code: 'COUNTRY_MISMATCH',
      message: 'This document is published for ' + found + ', not ' + declared +
        '. Load it under ' + found + ', or load a ' + declared + ' document instead.',
      reading: null
    }
  }

  const source = { document, published }
  const categories = {}
  let refusedRows = 0

  const rows = Array.isArray(raw.rates) ? raw.rates : []
  rows.forEach((row) => {
    const cleaned = cleanRow(row, source)
    if (cleaned === null) { refusedRows++; return }
    // A second row for a category already proposed is refused rather than allowed to
    // overwrite the first. Section 7 forbids it, so a second one means something went wrong
    // in the read, and silently taking the last would be a selection nobody could see.
    if (categories[cleaned.key]) { refusedRows++; return }
    categories[cleaned.key] = cleaned.entry
  })

  const unmatched = CATEGORY_KEYS.filter(k => !categories[k])

  // The document's own class list, which is what a manager picks from when the model's match
  // is wrong (FR-027, and §2 of the approved class-match drawing). It is held to the SAME bar
  // as a proposed row — a class offered in the picker can be chosen, and a chosen class is
  // written to the approved table, so one that cannot carry a rate and a page would put an
  // unsourced figure in front of a lender by a different door.
  //
  // ⚠ A REFUSED CLASS IS SIMPLY ABSENT FROM THE PICKER, and is deliberately not counted into
  // `refusedRows`. That figure means "rows the model proposed for a category and we would not
  // take", which is a statement about the SIX; folding a dropped class into it would make a
  // number the screen shows mean two different things.
  const classes = []
  const seen = {}
  const offered = Array.isArray(raw.classes) ? raw.classes : []
  offered.forEach((row) => {
    if (classes.length >= MAX_CLASSES) { return }
    const entry = cleanFigures(row, source)
    if (entry === null) { return }
    // Two entries with the same wording are one class listed twice: a picker offering both
    // asks a manager to choose between two things they cannot tell apart.
    const key = entry.label.toLowerCase()
    if (seen[key]) { return }
    seen[key] = true
    classes.push(entry)
  })

  // 🔴 THE ENTRIES THE DOCUMENT ITSELF COULD NOT SETTLE (Mike's ruling, 2026-09-11). A legible
  // document that disagrees with itself is not an unreadable document: IR265 prints the same
  // Southern Cross Cable class on pages 39 and 40 with different rates — a sliding scale split
  // across a page break — and the old rule made that one pair of rows throw away all 52 pages.
  //
  // ⚠ NOTHING IS EVER TAKEN FROM THIS LIST. It carries no rate and no category; it exists so a
  // dropped entry is VISIBLE rather than silently absent, which is P3 of the Brief applied to
  // the rows rather than to the categories.
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

  return {
    ok: true,
    code: null,
    message: null,
    reading: {
      document,
      published,
      country: declared,
      firstYearRuleFound: raw.firstYearRuleFound === true,
      categories,
      unmatched,
      refusedRows,
      classes,
      unresolved
    }
  }
}

/** Swappable for tests, exactly as `economicAnalysis.js` does it. */
let _clientFactory = createOpenAIClient

/** @param {Function} [factory] - a `createOpenAIClient`-shaped factory; absent restores the real one */
function _setClientFactory (factory) {
  _clientFactory = factory || createOpenAIClient
}

/**
 * Reads one document: assembles the prompt for this scope, sends the file, and validates
 * what comes back.
 *
 * @param {object} opts
 * @param {string} opts.scopeId - the VERIFIED scope, for the prompt's own tier overrides
 * @param {string} opts.country - two-letter code the manager declared
 * @param {string} opts.filename
 * @param {Buffer} opts.buffer - the document itself
 * @param {Function} opts.loadFirmConfig - the overlay reader, injected
 * @returns {Promise<{ok: boolean, code: (string|null), message: (string|null), reading: (object|null)}>}
 *   Never rejects on a model or network fault: it answers `READ_FAILED` so the caller can
 *   tell a manager what happened rather than showing them a stack trace.
 */
async function readDocument (opts) {
  const country = normaliseCountry(opts.country)
  if (country === null) {
    return { ok: false, code: 'INVALID_COUNTRY', message: 'country must be a two-letter code, such as NZ', reading: null }
  }

  let promptText
  try {
    const overrides = await aiPrompts.loadResolvedAiPromptOverrides(opts.scopeId, opts.loadFirmConfig)
    const assembled = aiPrompts.assemblePrompt(PROMPT_ID, overrides)
    if (assembled.blocked) {
      return {
        ok: false,
        code: 'PROMPT_BLOCKED',
        message: 'A setting this prompt needs has not been filled in. A manager can set it on the AI Prompts page.',
        reading: null
      }
    }
    // `split`/`join`, never `String.replace`: a replacement containing `$&` would be
    // interpreted. The country is two letters checked above, so this is belt to that brace.
    promptText = assembled.text.split('{{country}}').join(country)
  } catch (err) {
    console.error('[depreciation-read] prompt assembly failed:', err.message)
    return { ok: false, code: 'PROMPT_UNAVAILABLE', message: 'The reading instructions could not be assembled', reading: null }
  }

  let completed = null
  try {
    const client = _clientFactory({ apiKey: process.env.OPENAI_API_KEY })
    const events = await client.responses.create(
      buildRequest({ promptText, filename: opts.filename, base64: opts.buffer.toString('base64') }),
      { timeout: IDLE_TIMEOUT_MS }
    )
    for await (const event of events) {
      if (event && event.type === 'response.completed' && event.response) {
        completed = event.response
      }
    }
  } catch (err) {
    console.error('[depreciation-read] read failed:', err.message)
    return {
      ok: false,
      code: 'READ_FAILED',
      message: 'The document could not be sent for reading. Nothing has changed — try again.',
      reading: null
    }
  }

  if (!completed) {
    return {
      ok: false,
      code: 'READ_INCOMPLETE',
      message: 'The reading did not finish. Nothing has been proposed — load the document again.',
      reading: null
    }
  }

  const answer = textFromResponse(completed)
  const result = validateReading(parseModelJson(answer), { country })

  // 🔴 DIAGNOSTIC, added 2026-09-11 on Mike's instruction, because a real document failed and
  // NOTHING RECORDED WHY. `UNREADABLE` (the model said it could not read it) and `MALFORMED`
  // (its answer was not the shape section 8 asked for) show the same sentence on screen, store
  // the same `unreadable` status, and were logged nowhere — so the two cannot be told apart
  // after the fact, which is exactly the position we were in with IR265.
  //
  // Server-side only and never shown to anyone: the subject is a PUBLISHED TAX SCHEDULE and the
  // model's reply about it. No client, business or person is in this request at all — section 2
  // of the prompt says so and the route sends nothing else.
  if (!result.ok) {
    console.error(
      '[depreciation-read] refused as ' + result.code +
      ' · response status=' + (completed.status || 'unknown') +
      ' · answer length=' + answer.length +
      (result.detail ? ' · the model said: ' + JSON.stringify(result.detail) : '') +
      ' · answer began: ' + JSON.stringify(answer.slice(0, 400))
    )
  }

  return result
}

module.exports = {
  PROMPT_ID,
  MODEL,
  MAX_PDF_BYTES,
  PDF_MIME,
  IDLE_TIMEOUT_MS,
  MAX_LABEL,
  MAX_CLASSES,
  MAX_UNRESOLVED,
  UNREADABLE_MESSAGE,
  oneLine,
  buildRequest,
  textFromResponse,
  parseModelJson,
  cleanFigures,
  cleanRow,
  validateReading,
  readDocument,
  _setClientFactory
}
