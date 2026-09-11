'use strict'

/**
 * hubReading — "Read this for me" on the Outcome Learning page and the Logic-Lab Report.
 *
 * Asked for by Mike on 2026-09-11, on the mentor's Outcome Learning page: *"I have no idea
 * how I, as a mentor, am supposed to use this function and what I'm learning from it … I'm
 * not seeing any AI interpretation of what's in front of me. Is that possible we could
 * create that?"* Drawing: `design/mockups/hub-page-guidance.html`, approved the same day.
 *
 * 🔴 THE MODEL IS SENT WHAT THE PAGE SHOWS AND NOTHING ELSE. The two payload builders here
 * copy allow-listed fields off the page's own payload — template titles, situation labels,
 * counts, states, bench figures; on the Logic-Lab Report the grouped edits without their
 * origin path. Neither page holds a firm id, an advisor or a client, and this module never
 * reaches for a store, so it cannot add one. The Logic-Lab builder is run through the
 * page's own personal-field guard as well, which throws rather than filters.
 *
 * 🔴 THE READING IS ADVICE, NEVER A DECISION. Nothing here writes to an adjustment or a
 * default; the route stores the reading text and the counts it was read from, so the page
 * can say when the pool has moved on (`isStale`).
 *
 * 🔴 THE MODEL'S OUTPUT IS UNTRUSTED. `validateReading` accepts exactly three string fields
 * under the three headings the drawing fixed, caps their length, and puts every word back
 * through `checkContribution` — a reply carrying a web address, an email or a person's
 * name is discarded whole, the same loophole `promptReview` closes. A reading of the wrong
 * shape is reported as a failure, never shown as "nothing to say".
 *
 * The prompt is `hub-reading` on the AI Prompts tab (`data/ai-prompts.json`), assembled by
 * `aiPrompts.assemblePrompt`, so every word the model is given is on a screen.
 *
 * Node 14, CommonJS.
 */

const { fenceUntrusted } = require('./promptSafety')
const { assemblePrompt } = require('./aiPrompts')
const { checkContribution } = require('./promptContribution')
const { assertNoPersonalFields } = require('./mentorLogicLabReport')
const { createOpenAIClient } = require('./openaiClient')

const PROMPT_ID = 'hub-reading'
const PAGES = ['outcome-learning', 'logic-lab-report']
/** The three headings the drawing fixed; a reply must carry all three. */
const FIELDS = ['standsOut', 'doFirst', 'notYet']
const MAX_FIELD = 900
/** At most this many groups and probed sentences go to the model — a reading, not a dump. */
const MAX_GROUPS = 12
const MAX_SENTENCES_PER_GROUP = 3
const MAX_ROWS = 60

const READING_MODEL = 'gpt-4o-mini'
const READING_MAX_TOKENS = 700
const READING_TIMEOUT_MS = 30000

let _client = null
/** Built once, on first use, so a missing key is a failed reading and not a dead server. */
function _openai () {
  if (!_client) { _client = createOpenAIClient({ apiKey: process.env.OPENAI_API_KEY }) }
  return _client
}
/** For tests. */
function _setClient (client) { _client = client }

// ── What the model is sent ────────────────────────────────────────────────────

function _num (v) { return Number.isFinite(v) ? v : 0 }

/**
 * The Outcome Learning page as the model reads it: the rows and the benches, allow-listed
 * field by field. Firms are a count; there is no key, token or id anywhere in the result.
 * @param {Object} page - the list route's payload (`recompute()` result)
 * @returns {{page: string, firms: number, cases: number, floor: Object, capMax: number,
 *   rows: Array<Object>, benches: Object|null}}
 */
function outcomeLearningPayload (page) {
  const p = page && typeof page === 'object' ? page : {}
  const rows = (Array.isArray(p.adjustments) ? p.adjustments : []).slice(0, MAX_ROWS).map(a => ({
    template: String(a.template || ''),
    situation: String(a.dimension || '') + ': ' + String(a.value || ''),
    delivered: _num(a.delivered),
    less: _num(a.less),
    holdBack: _num(a.holdBack),
    firms: _num(a.firms),
    cases: _num(a.cases),
    state: String(a.state || '')
  }))
  const b = p.benches && typeof p.benches === 'object' ? p.benches : null
  const bench = which => b && b[which] && typeof b[which] === 'object'
    ? { before: _num(b[which].before), after: _num(b[which].after), liveAdjustments: Array.isArray(b[which].liveIds) ? b[which].liveIds.length : 0 }
    : null
  return {
    page: 'outcome-learning',
    firms: _num(p.firms),
    cases: _num(p.cases),
    floor: p.floor && typeof p.floor === 'object' ? { minFirms: _num(p.floor.minFirms), minCases: _num(p.floor.minCases) } : null,
    capMax: _num(p.capMax),
    rows,
    benches: b ? { fixed: bench('fixed'), outcome: bench('outcome') } : null
  }
}

/**
 * The Logic-Lab Report as the model reads it: the grouped pushed edits without their
 * origin path, and the glance counts. Run through the page's own personal-field guard.
 * @param {Object} report - `buildMentorLogicLabReport`'s result
 * @returns {{page: string, firms: number, pushedEdits: number, groups: Array<Object>}}
 */
function logicLabPayload (report) {
  const r = report && typeof report === 'object' ? report : {}
  const glance = r.glance && typeof r.glance === 'object' ? r.glance : {}
  const groups = (Array.isArray(r.groups) ? r.groups : []).slice(0, MAX_GROUPS).map(g => ({
    domain: String(g.domain || ''),
    template: String(g.template || ''),
    firms: _num(g.firmCount),
    edits: _num(g.editCount),
    label: String(g.reading || ''),
    sentences: (Array.isArray(g.edits) ? g.edits : []).slice(0, MAX_SENTENCES_PER_GROUP)
      .map(e => ({ sentence: String((e && e.sentence) || ''), expected: String((e && e.expectedTemplate) || '') }))
  }))
  const payload = {
    page: 'logic-lab-report',
    firms: _num(glance.firms),
    pushedEdits: _num(glance.pushedEdits),
    firmsWithPushes: _num(glance.firmsWithPushes),
    groups
  }
  assertNoPersonalFields(payload)
  return payload
}

/**
 * The counts a reading was made from, so the page can say when they have moved on.
 * @param {Object} payload - from either builder
 * @returns {Object}
 */
function stampOf (payload) {
  return payload.page === 'logic-lab-report'
    ? { firms: payload.firms, edits: payload.pushedEdits }
    : { firms: payload.firms, cases: payload.cases, live: payload.rows.filter(r => r.state === 'live').length }
}

/**
 * True when the page has changed since the reading was made.
 * @param {Object|null} reading - a stored reading, with `from`
 * @param {Object} now - `stampOf` the current payload
 * @returns {boolean}
 */
function isStale (reading, now) {
  if (!reading || !reading.from || typeof reading.from !== 'object') { return false }
  return Object.keys(now).some(k => reading.from[k] !== now[k])
}

// ── The call ──────────────────────────────────────────────────────────────────

/**
 * The messages for the completion call: the mentor's document as the system prompt, the
 * page's data fenced in the user message.
 * @param {Object} payload
 * @param {Object} [resolvedOverrides]
 * @returns {{messages: Array<Object>}}
 */
function buildReadingMessages (payload, resolvedOverrides) {
  if (!payload || !PAGES.includes(payload.page)) { throw new Error('hubReading: unknown page') }
  const assembled = assemblePrompt(PROMPT_ID, resolvedOverrides || {})
  return {
    messages: [
      { role: 'system', content: assembled.text },
      { role: 'user', content: fenceUntrusted(JSON.stringify(payload)) }
    ]
  }
}

/**
 * Pulls the JSON object out of whatever the model said; tolerant of a code fence or a
 * sentence around it and of nothing else.
 * @param {*} raw
 * @returns {Object|null}
 */
function parseReading (raw) {
  const text = String(raw === null || raw === undefined ? '' : raw)
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) { return null }
  try {
    const parsed = JSON.parse(match[0])
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch (_e) {
    return null
  }
}

/**
 * Exactly the three fields, each a non-empty string, capped, and every word re-checked.
 * A reading is dropped whole, never repaired: a heading with invented words under it is
 * worse than no reading.
 * @param {*} parsed
 * @returns {{ok: boolean, reading: {standsOut: string, doFirst: string, notYet: string}|null}}
 */
function validateReading (parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { return { ok: false, reading: null } }
  const out = {}
  for (const f of FIELDS) {
    const v = parsed[f]
    if (typeof v !== 'string' || v.trim() === '') { return { ok: false, reading: null } }
    out[f] = v.trim().length > MAX_FIELD ? v.trim().slice(0, MAX_FIELD) : v.trim()
  }
  if (!checkContribution(FIELDS.map(f => out[f]).join('\n')).ok) { return { ok: false, reading: null } }
  return { ok: true, reading: out }
}

/**
 * Make a reading of one page. Logs model, tokens, latency and result and nothing else.
 * @param {Object} payload - from either builder
 * @returns {Promise<{ok: boolean, reading: Object|null}>} `reading` carries the three
 *   fields plus `readAt`, `from` (the stamp) and `model`
 */
async function makeReading (payload) {
  const startedAt = Date.now()
  const log = (ok, usage) => {
    const tokens = usage ? `prompt=${usage.prompt_tokens} completion=${usage.completion_tokens}` : 'tokens=unknown'
    console.log(`[openai] hub-reading page=${payload && payload.page} model=${READING_MODEL} status=${ok ? 'ok' : 'error'} latency=${Date.now() - startedAt}ms ${tokens}`)
  }
  try {
    const { messages } = buildReadingMessages(payload, {})
    const response = await _openai().chat.completions.create({
      model: READING_MODEL,
      max_tokens: READING_MAX_TOKENS,
      temperature: 0,
      messages
    }, { timeout: READING_TIMEOUT_MS })
    const content = response && response.choices && response.choices[0] && response.choices[0].message
      ? response.choices[0].message.content
      : ''
    const validated = validateReading(parseReading(content))
    log(validated.ok, response && response.usage)
    if (!validated.ok) { return { ok: false, reading: null } }
    return {
      ok: true,
      reading: Object.assign({}, validated.reading, { readAt: new Date().toISOString(), from: stampOf(payload), model: READING_MODEL })
    }
  } catch (err) {
    log(false, null)
    console.error('[hub-reading] failed:', err.message)
    return { ok: false, reading: null }
  }
}

/**
 * A stored reading, cleaned: the three fields and the stamp, or null.
 * @param {*} stored
 * @returns {Object|null}
 */
function readStoredReading (stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return null }
  if (FIELDS.some(f => typeof stored[f] !== 'string' || !stored[f])) { return null }
  return {
    standsOut: stored.standsOut,
    doFirst: stored.doFirst,
    notYet: stored.notYet,
    readAt: typeof stored.readAt === 'string' ? stored.readAt : null,
    from: stored.from && typeof stored.from === 'object' ? stored.from : null
  }
}

module.exports = {
  PROMPT_ID,
  FIELDS,
  MAX_FIELD,
  outcomeLearningPayload,
  logicLabPayload,
  stampOf,
  isStale,
  buildReadingMessages,
  parseReading,
  validateReading,
  makeReading,
  readStoredReading,
  _setClient
}
