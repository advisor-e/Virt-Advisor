'use strict'

/**
 * @file Checking a firm's compliance pack for completeness — from document NAMES alone.
 * @module server/utils/complianceCheck
 *
 * Item 4.83, slice 4. The prompt is `compliance-check` in `data/ai-prompts.json`, where a
 * manager can read it on the AI Prompts tab at any of the four tiers; the eight points are
 * `data/compliance-checklist.json`, which is section 9 of `design/MEETING-REVIEW-DPIA.md`.
 * This module assembles the two, sends them, and refuses to believe the answer until every
 * field has been checked.
 *
 * 🔴 NO DOCUMENT CONTENT IS EVER SENT, AND THAT IS THE ARTEFACT'S OWN PROMISE, MADE THREE
 * TIMES: *"we do not read them"*, *"we do not read your documents for meaning"*, *"neither the
 * AI nor anyone at Advisor-e reads it"*. The drawing's own examples of a covered point are file
 * names — *"Covered by: Legal opinion — Harrow & Tait, 3 Sep 2026"*. What travels is the list
 * of names a firm typed when it lodged its documents, and nothing else. A build that attaches a
 * PDF here has broken a promise printed on the screen the firm is reading.
 *
 * 🔴 IT REPORTS COMPLETENESS, NEVER MEANING. A tick means a document of that name appears to
 * address that point — never that it addresses it adequately, and never anything about what the
 * law requires. Only a firm's lawyer can say either, and the prompt forbids both.
 *
 * 🔴 NOTHING THE MODEL RETURNS IS TRUSTED AS STRUCTURED DATA. `CLAUDE.md` requires an LLM's
 * output to be parsed and validated before it reaches state. `validateCheck` refuses a whole
 * answer that is not an object with a points array, refuses a point whose id was never sent,
 * and refuses a `coveredBy` name that was not in the list given — a model naming a document the
 * firm does not have would put an invented file on a compliance screen.
 *
 * ⚠ ANY POINT THE ANSWER OMITS IS RECORDED AS NOT COVERED. The safe direction: a firm told it
 * is missing something it has will go and look; a firm told nothing is missing will not.
 *
 * ⚠ THIS RUNS ON A BUTTON, NEVER AUTOMATICALLY — Mike's ruling of 2026-09-10, and the reason
 * is item 4.82, which is still open: nothing anywhere caps how many paid readings a user can
 * set off. A build that "helpfully" re-checks on upload or on page load has undone that ruling.
 *
 * Node 14, CommonJS.
 */

const CHECKLIST = require('../../data/compliance-checklist.json')
const { createOpenAIClient } = require('./openaiClient')
// The whole module rather than the two functions, so a test can stand in for one of them.
const aiPrompts = require('./aiPrompts')

/** The prompt this module runs, as declared in `data/ai-prompts.json`. */
const PROMPT_ID = 'compliance-check'

/**
 * The model. The same one the depreciation read runs on, for the same reason: it is the one
 * this app has exercised. This task needs no web search and no file input, so neither is sent.
 */
const MODEL = 'gpt-6-astra'

/** The eight points, as published. */
const POINTS = CHECKLIST.points

/** Every point id, for validating what comes back. */
const POINT_IDS = POINTS.map(p => p.id)

/**
 * Most document names sent in one check.
 *
 * A firm's pack is small by nature — the drawing shows three. The cap is here so that a firm
 * which has lodged a hundred files cannot turn one button press into an unbounded prompt, and
 * it is generous enough that no honest pack meets it.
 */
const MAX_DOCUMENTS = 60

/** Longest a single document name may be in the prompt. Names are a firm's own free text. */
const MAX_NAME = 200

/** Idle guard for the call, in milliseconds. A short structured answer needs no more. */
const TIMEOUT_MS = 60000

/**
 * The eight points, as the prompt's `{{points}}` block.
 *
 * @returns {string}
 */
function pointsBlock () {
  return POINTS.map(p => `- ${p.id}: ${p.title}`).join('\n')
}

/**
 * The firm's document names, as the prompt's `{{documents}}` block.
 *
 * ⚠ NAMES ARE A FIRM'S OWN FREE TEXT, so they are treated as hostile input and wrapped rather
 * than concatenated raw (`CLAUDE.md`, prompt safety). Each is trimmed, capped and put on its
 * own delimited line, so a name containing instructions reads as one item in a list.
 *
 * @param {string[]} names
 * @returns {string}
 */
function documentsBlock (names) {
  if (!names.length) { return '(none — this firm has lodged no documents)' }
  return names.map(n => `- <<<${n}>>>`).join('\n')
}

/**
 * The document names to send: trimmed, capped, de-duplicated and limited.
 *
 * @param {Array<{name: string}>} documents - the firm's lodged documents
 * @returns {string[]}
 */
function namesOf (documents) {
  const out = []
  const seen = {}
  const list = Array.isArray(documents) ? documents : []

  for (let i = 0; i < list.length && out.length < MAX_DOCUMENTS; i++) {
    const raw = list[i] && list[i].name
    if (typeof raw !== 'string') { continue }
    // Newlines and angle brackets would break the delimiters the block above relies on.
    const name = raw.replace(/[\r\n<>]+/g, ' ').trim().slice(0, MAX_NAME)
    if (!name || seen[name]) { continue }
    seen[name] = true
    out.push(name)
  }
  return out
}

/**
 * Validate what the model returned, against the points and names actually sent.
 *
 * 🔴 EVERY POINT IS ACCOUNTED FOR, WHATEVER THE ANSWER LOOKS LIKE. The result always carries
 * all eight, in the published order; a point the model omitted, duplicated or invented is
 * recorded as NOT COVERED. An answer shorter than the list must never silently become a
 * shorter checklist.
 *
 * 🔴 A `coveredBy` NAME THAT WAS NOT SENT IS DROPPED. A model naming a document the firm does
 * not hold would put an invented file on a compliance screen, and it would look exactly like a
 * real one.
 *
 * @param {*} raw - the parsed JSON the model returned
 * @param {string[]} names - the document names that were sent
 * @returns {{ok: boolean, points: Array<{id, title, why, covered, coveredBy}>, covered: number}}
 *   `ok` is false when the answer was unusable; `points` is still the full list, all uncovered,
 *   so a caller that ignores `ok` cannot show a firm a half-checklist.
 */
function validateCheck (raw, names) {
  const sent = {}
  ;(Array.isArray(names) ? names : []).forEach((n) => { sent[n] = true })

  const blank = () => POINTS.map(p => ({
    id: p.id,
    title: p.title,
    why: p.why,
    covered: false,
    coveredBy: []
  }))

  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.points)) {
    return { ok: false, points: blank(), covered: 0 }
  }

  const answered = {}
  raw.points.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { return }
    if (typeof entry.id !== 'string') { return }
    if (!POINT_IDS.includes(entry.id)) { return }
    // A duplicate keeps the FIRST answer rather than the last: two answers for one point is a
    // model contradicting itself, and picking the later one silently would hide that.
    if (Object.prototype.hasOwnProperty.call(answered, entry.id)) { return }

    const by = (Array.isArray(entry.coveredBy) ? entry.coveredBy : [])
      .filter(n => typeof n === 'string' && sent[n])

    // `covered: true` with nothing to point at is not a covered point. The screen names the
    // document beside every tick, and a tick with no name behind it cannot be checked.
    answered[entry.id] = { covered: entry.covered === true && by.length > 0, coveredBy: by }
  })

  const points = POINTS.map((p) => {
    const found = answered[p.id]
    return {
      id: p.id,
      title: p.title,
      why: p.why,
      covered: found ? found.covered : false,
      coveredBy: found ? found.coveredBy : []
    }
  })

  return {
    ok: true,
    points,
    covered: points.filter(p => p.covered).length
  }
}

/**
 * Pull the JSON object out of a model's text answer.
 *
 * The prompt asks for bare JSON; a fence or a sentence in front of it is a model drifting from
 * its instructions rather than a failure worth showing a firm, so the first `{` to the last `}`
 * is taken. Anything that will not parse returns null and the caller reports a plain failure.
 *
 * @param {string} text
 * @returns {object|null}
 */
function parseAnswer (text) {
  if (typeof text !== 'string') { return null }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) { return null }
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch (e) {
    return null
  }
}

/**
 * Run the check for one scope.
 *
 * @param {object} opts
 * @param {string} opts.scopeId - the verified scope, for resolving prompt overrides
 * @param {Array<{name: string}>} opts.documents - the firm's lodged documents
 * @param {function} opts.loadFirmConfig - the overlay reader, injected
 * @param {string} opts.apiKey - the OpenAI key, backend only
 * @param {function} [opts.requestImpl] - https.request-compatible, injectable for tests
 * @returns {Promise<{ok: boolean, code: string|null, result: object|null}>} NEVER REJECTS —
 *   a failed check is reported plainly and the firm's previous result is left alone.
 */
async function runCheck (opts) {
  const names = namesOf(opts.documents)

  let promptText
  try {
    const overrides = await aiPrompts.loadResolvedAiPromptOverrides(opts.scopeId, opts.loadFirmConfig)
    const assembled = aiPrompts.assemblePrompt(PROMPT_ID, overrides)
    if (assembled.blocked) {
      return { ok: false, code: 'PROMPT_BLOCKED', result: null }
    }
    // `split`/`join`, never `String.replace`: a replacement containing `$&` would be
    // interpreted, and both blocks are assembled from a firm's own text.
    promptText = assembled.text
      .split('{{points}}').join(pointsBlock())
      .split('{{documents}}').join(documentsBlock(names))
  } catch (err) {
    console.error('[compliance-check] prompt assembly failed:', err.message)
    return { ok: false, code: 'PROMPT_ERROR', result: null }
  }

  let text
  try {
    const client = createOpenAIClient({ apiKey: opts.apiKey, requestImpl: opts.requestImpl })
    const completion = await client.chat.completions.create(
      {
        model: MODEL,
        messages: [{ role: 'user', content: promptText }],
        temperature: 0
      },
      { timeout: TIMEOUT_MS }
    )
    text = completion &&
      completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content
  } catch (err) {
    console.error('[compliance-check] model call failed:', err.message)
    return { ok: false, code: 'MODEL_ERROR', result: null }
  }

  const checked = validateCheck(parseAnswer(text), names)
  if (!checked.ok) {
    return { ok: false, code: 'UNREADABLE_ANSWER', result: null }
  }

  return {
    ok: true,
    code: null,
    result: {
      checkedAt: new Date().toISOString(),
      covered: checked.covered,
      total: POINTS.length,
      points: checked.points
    }
  }
}

module.exports = {
  PROMPT_ID,
  MODEL,
  POINTS,
  POINT_IDS,
  MAX_DOCUMENTS,
  MAX_NAME,
  namesOf,
  pointsBlock,
  documentsBlock,
  validateCheck,
  parseAnswer,
  runCheck
}
