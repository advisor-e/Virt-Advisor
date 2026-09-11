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

const { createOpenAIClient, failureFromEvent } = require('./openaiClient')
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
 * 🔴 A CEILING ON A RUNAWAY ANSWER, AND IT IS BELOW THE REAL DOCUMENTS — item 4.90. This
 * comment used to read *"IR265 publishes about 156 classes … 250 clears that with room"*, which
 * argued the cap was generous and was wrong by a factor of eighteen: IR265 publishes about
 * 2,800 classes across 52 table pages, so 250 holds roughly a tenth of it.
 *
 * 🔴 THE NUMBER STAYS AT 250 ANYWAY — Mike's ruling of 2026-09-11. Raising it would pretend one
 * model answer can carry a whole schedule, and item 4.91 proved that same week that it cannot:
 * the real IR265 came back offering nothing at all. The answer to a long schedule is the
 * COUNTRY SCHEDULE (item 4.92), read a page range at a time, which the picker searches in full.
 *
 * ⚠ WHAT THIS KNOWINGLY ACCEPTS: a firm whose group has loaded no country schedule gets this
 * document's first 250 classes with nothing on screen saying more exist. Classes past the cap
 * are dropped from the END, so the order the document prints them in is the order that
 * survives. Loading the country schedule removes it.
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

/**
 * What a person is told when a document WAS opened and named, and nothing at all came out of
 * it — no rate for any of the six, and no class for the picker either.
 *
 * 🔴 ITEM 4.91, AND IT IS THE COUNTRY READER'S RULE APPLIED ON THIS SIDE. On 2026-09-11 the
 * real IR265 came back readable, correctly named and dated, flagging three genuine
 * contradictions in Inland Revenue's own schedule — and offering no rates and no classes at
 * all. `refusedRows` was 0, so nothing was rejected here: the model sent empty lists. That was
 * stored as `pending`, which a manager reads as *"Needs your approval · 0 of 6 categories
 * read"* — an approval that can never be given, on a row that cannot even be deleted, because
 * only an `unreadable` one may be (item 4.88). `countryScheduleRead` already refuses its own
 * version of this (`NOTHING_READ`); the two readers now agree.
 *
 * ⚠ DELIBERATELY THE COUNTRY READER'S SENTENCE, with only the words that must differ changed —
 * it stores nothing, this keeps a failed row. A manager who loads a whole schedule and one who
 * loads a single document have had the same thing happen to them, and two wordings for one
 * event is how a screen starts sounding like two different products. Approved by Mike
 * 2026-09-11.
 */
const NOTHING_READ_MESSAGE = 'This document was opened and named, but nothing could be read ' +
  'from it — no rates and no classes. Nothing has been proposed. Try downloading it again ' +
  'from the tax authority\'s website, or load a different edition.'

/**
 * What a person is told when the AI SERVICE ITSELF refused the request.
 *
 * 🔴 MIKE'S WORDING, APPROVED 2026-09-11. It is deliberately not about the document, because the
 * document is not the problem and every other failure message in this file is. On that day the
 * OpenAI account ran out of credit; the API said `credit_balance_exhausted` in as many words and
 * the app told three people in a row that their reading "did not finish — load the document
 * again". Retrying could never have worked, and nothing on any screen said so.
 *
 * ⚠ IT NAMES NO CAUSE, on purpose. Out of credit, an expired key, a rate limit and a content
 * refusal all reach here, and only whoever administers the account can tell them apart — which
 * is what the logged `code` and the provider's own sentence are for.
 *
 * It is shared with `countryScheduleRead`, exactly as `UNREADABLE_MESSAGE` is: one event, one
 * wording, however a manager arrived at it.
 */
const SERVICE_REFUSED_MESSAGE = 'The AI service refused this request, so nothing was read and ' +
  'nothing has changed. This is not a problem with your document — please tell your ' +
  'administrator.'

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
 * Four ways a read is refused outright, and each is a different sentence to the manager:
 *   - `UNREADABLE`      — the model said so. Nothing is proposed (FR-047).
 *   - `MALFORMED`       — the answer is not the shape section 8 asked for, or names no
 *                         document, or no date we can rank. Believing half of it is worse
 *                         than believing none.
 *   - `COUNTRY_MISMATCH`— the document is another country's. An approved table is tagged
 *                         with its country and reaches only clients in it (FR-012); building
 *                         a New Zealand table out of an Australian schedule would defeat that
 *                         at the first step, and it is far likelier to be a manager picking
 *                         the wrong file than the model misreading a masthead.
 *   - `NOTHING_READ`    — it was opened and named, and then offered no rate for any of the six
 *                         AND no class for the picker. There is nothing in it to approve
 *                         (item 4.91).
 *
 * A read that survives may still propose no RATES — every row refused, or none offered — and
 * that is a success with six gaps rather than a failure: the categories are named on screen
 * and each keeps the figure it already had (FR-032). What is refused is the read with nothing
 * in it AT ALL, which is a different thing: a manager can act on a class list that matched
 * none of the six, and cannot act on an empty document.
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

  // 🔴 NOTHING TO APPROVE IS NOT A PROPOSAL (item 4.91). Everything above has run, so this is
  // the last thing checked rather than the first: a read is refused here only once we know
  // that neither list survived it.
  //
  // ⚠ BOTH LISTS, NEVER EITHER ONE. A document matching none of the six but publishing a
  // hundred classes is entirely actionable — the manager picks from it, which is what the
  // picker is for (FR-027) — so an empty `categories` alone is a success with six gaps, not
  // a failure. And `unresolved` does not count towards either: nothing is ever taken from it,
  // so a read carrying only the contradictions it could not settle still leaves a manager
  // with nothing they can approve. IR265 returned exactly that.
  if (Object.keys(categories).length === 0 && classes.length === 0) {
    return { ok: false, code: 'NOTHING_READ', message: NOTHING_READ_MESSAGE, reading: null }
  }

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
  // Counted for the diagnostic below, and the two numbers say different things: NOTHING arriving
  // is a call that never started, while thousands of events and no completion is a read that ran
  // and was cut off. Without them the two are one silent failure.
  let eventsSeen = 0
  let lastType = ''
  let refusal = null
  try {
    const client = _clientFactory({ apiKey: process.env.OPENAI_API_KEY })
    const events = await client.responses.create(
      buildRequest({ promptText, filename: opts.filename, base64: opts.buffer.toString('base64') }),
      { timeout: IDLE_TIMEOUT_MS }
    )
    for await (const event of events) {
      eventsSeen++
      if (event && typeof event.type === 'string') { lastType = event.type }
      // The provider REFUSING is not the same as the stream ending early, and until 2026-09-11
      // both arrived here as "no completed response". The first one wins: a refusal is followed
      // by `response.failed` repeating it, and the earlier event carries the fault itself.
      if (refusal === null) { refusal = failureFromEvent(event) }
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

  // 🔴 THE PROVIDER REFUSED, AND IT SAID WHY. Reported as a refusal rather than as an unfinished
  // reading, because the two need opposite responses: an unfinished read is worth retrying and a
  // refusal is not. On 2026-09-11 the account ran out of credit, the API said exactly that, and
  // this function told three people in a row to load the document again.
  //
  // ⚠ THE PROVIDER'S OWN SENTENCE IS LOGGED AND NEVER SHOWN — it is unedited text from outside
  // this app and carries a billing URL, which is not a thing to put on an adviser's screen. The
  // same rule as `whyUnreadable` (FR-050) and for the same reason.
  if (refusal !== null) {
    console.error(
      '[depreciation-read] SERVICE_REFUSED · code=' + JSON.stringify(refusal.code) +
      ' · the service said: ' + JSON.stringify(refusal.message) +
      ' · events seen=' + eventsSeen +
      ' · file=' + JSON.stringify(opts.filename || '')
    )
    return { ok: false, code: 'SERVICE_REFUSED', message: SERVICE_REFUSED_MESSAGE, reading: null }
  }

  if (!completed) {
    // 🔴 THE ONE FAILURE IN THIS FUNCTION THAT RECORDED NOTHING ANYWHERE, until 2026-09-11. It
    // returns above the diagnostic block below, so a read that streamed for minutes and stopped
    // left no trace at all — which is precisely what happened to Mike loading IR265 that day, and
    // why it could not be told apart from a call that never started.
    console.error(
      '[depreciation-read] READ_INCOMPLETE — the stream ended with no completed response' +
      ' · events seen=' + eventsSeen +
      ' · last event=' + JSON.stringify(lastType) +
      ' · file=' + JSON.stringify(opts.filename || '')
    )
    return {
      ok: false,
      code: 'READ_INCOMPLETE',
      // 🔴 MIKE'S WORDING, APPROVED 2026-09-11, replacing *"load the document again"* — advice
      // that cannot succeed for a long schedule and which he followed twice, paying each time.
      //
      // ⚠ IT NAMES LENGTH AS THE CAUSE, which is the common case and not the only one: a short
      // document can reach here through a transient fault, and would be told something untrue.
      // That was put to him with the wording and the wording stands. The log line above is what
      // tells the two apart, and it is new.
      message: 'The reading did not finish — this document is too long to read in one go. ' +
        'Nothing has been proposed. A schedule this size is loaded once for the whole country ' +
        'on the Country Rate Schedules screen.',
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
  // ⚠ AND A SUCCESS IS LOGGED TOO, which is the half this did not have. On 2026-09-11 IR265
  // came back readable, correctly named and dated, flagging three real contradictions in the
  // schedule — and proposing NO RATES AND NO CLASSES AT ALL. `refusedRows` was 0, so nothing
  // was rejected on our side; beyond that we could only guess. WHAT THE MODEL OFFERED, BEFORE
  // ANY CLEANING, IS THE ONE FACT THAT SETTLES IT.
  //
  // ⚠ THE OFFERED COUNTS FOLLOW `NOTHING_READ` INTO THE REFUSAL BRANCH, and that is the whole
  // reason they are built before the branch rather than inside it. That case is now refused
  // rather than stored (item 4.91) — logging it as a bare refusal would throw away the exact
  // measurement this line was added to take, one day after it was added.
  const parsed = parseModelJson(answer)
  const offered = (parsed && typeof parsed === 'object') ? parsed : {}
  const countOf = v => (Array.isArray(v) ? v.length : -1)

  if (!result.ok) {
    console.error(
      '[depreciation-read] refused as ' + result.code +
      ' · response status=' + (completed.status || 'unknown') +
      ' · answer length=' + answer.length +
      (result.code === 'NOTHING_READ'
        ? ' · the model OFFERED rates=' + countOf(offered.rates) +
          ' classes=' + countOf(offered.classes) +
          ' unresolved=' + countOf(offered.unresolved)
        : '') +
      (result.detail ? ' · the model said: ' + JSON.stringify(result.detail) : '') +
      ' · answer began: ' + JSON.stringify(answer.slice(0, 400))
    )
  } else {
    // A count of -1 means the key was absent rather than empty — a different fault from an
    // empty list, and the two are worth telling apart.
    console.error(
      '[depreciation-read] read ' + JSON.stringify(result.reading.document) +
      ' · response status=' + (completed.status || 'unknown') +
      ' · answer length=' + answer.length +
      ' · the model OFFERED rates=' + countOf(offered.rates) +
      ' classes=' + countOf(offered.classes) +
      ' unresolved=' + countOf(offered.unresolved) +
      ' · WE KEPT rates=' + Object.keys(result.reading.categories).length +
      ' classes=' + result.reading.classes.length +
      ' unresolved=' + result.reading.unresolved.length +
      ' refused=' + result.reading.refusedRows +
      // Not item 4.91 any more: a read with no rates but a class list is a legitimate success
      // with six gaps (FR-032), and the both-empty case never reaches this branch. It is still
      // worth seeing, because a document that matches none of the six is worth a look.
      (Object.keys(result.reading.categories).length === 0 ? ' · NO CATEGORY WAS MATCHED' : '')
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
  NOTHING_READ_MESSAGE,
  SERVICE_REFUSED_MESSAGE,
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
