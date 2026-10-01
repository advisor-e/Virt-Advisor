'use strict'

/**
 * @file The "Suggested wording" under each passage of a recorded strategy session — what was
 *   said, rewritten as the sentence an advisor would have typed. Item 8.4, screen 4.
 * @module server/utils/passageTidy
 *
 * 🔴 THE AI TIDIES WORDING AND NEVER DECIDES PLACEMENT (Decision 11). `boxPlacement` has already
 * put each passage under its box by the clock; this is handed the passages in that order and
 * may only reword them. A reply that names a passage it was not given is dropped, and one it
 * leaves out comes back with no suggestion — never a guess.
 *
 * 🔴 IT IS MEETING REVIEW, AND IT KEEPS MEETING REVIEW'S CONDITIONS (CLAUDE.md's one privacy
 * exception), exactly as `conceptSummary` does: spoken words and app-authored box names only,
 * no id of any kind beyond the passage's own `p1`; the speech fenced as speech; `personal: true`
 * and `moderate:` with the spoken text alone; the reply parsed and checked, never trusted.
 *
 * THE INSTRUCTIONS ARE ON A SCREEN. They are `passage-tidy` in `data/ai-prompts.json`, shown on
 * the Mentor Hub's AI Prompts tab (the hub-page rule of 2026-08-16), and assembled with the
 * backend's protocols in front of them by `aiPrompts.assemblePrompt`.
 *
 * Node 14, CommonJS.
 */

const { AI } = require('../../config/integration')
const { getClient, modelFor, logSuffix } = require('./aiProvider')
const { stripInvisible } = require('./promptSafety')
const { assemblePrompt } = require('./aiPrompts')
const {
  NOT_FOUND,
  TRANSCRIPT_OPEN,
  TRANSCRIPT_CLOSE,
  REPORT_TIMEOUT_MS,
  parseJsonReply
} = require('./meetingReports')

/** The prompt this module runs, as declared in `data/ai-prompts.json`. */
const PROMPT_ID = 'passage-tidy'

/** The Meeting Summary's own model, from the one role map, read at call time. */
const TIDY_MODEL = () => modelFor(AI.primary, 'report')

/** A suggestion past this is not a sentence or two for one box; it is cut, and the cut logged. */
const MAX_WORDING_CHARS = 600

const SPEAKER = { advisor: 'ADVISOR', client: 'CLIENT' }

/**
 * One piece of speech, safe inside the fence: invisible characters stripped, whitespace
 * collapsed, and the fence's own angle-bracket runs removed so speech cannot close it.
 * @param {*} text
 * @returns {string}
 */
function fenced (text) {
  return stripInvisible(String(text || '')).replace(/<{3,}|>{3,}/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * The messages for one segment's passages.
 *
 * @param {object} input
 * @param {Array<{id: string, box: (object|null), heard: Array<{role: string, text: string}>}>} input.passages
 * @param {string} input.conceptName - the app's own name for the concept
 * @param {Object.<string, string>} input.boxLabels - field key → the box's own heading
 * @returns {Array<{role: string, content: string}>}
 */
function buildMessages (input) {
  const labels = input.boxLabels || {}
  const lines = (input.passages || []).map((p) => {
    const where = p.box ? (labels[p.box.fieldKey] || 'this topic') : 'no box yet'
    const said = p.heard.map(h => (SPEAKER[h.role] || 'UNKNOWN') + ': ' + fenced(h.text))
    return '[' + p.id + '] BOX: ' + fenced(where) + '\n' + said.join('\n')
  })
  return [
    { role: 'system', content: assemblePrompt(PROMPT_ID).text },
    {
      role: 'user',
      content: 'Topic: ' + fenced(input.conceptName || 'one planning topic') + '\n\n' +
        TRANSCRIPT_OPEN + '\n' + lines.join('\n\n') + '\n' + TRANSCRIPT_CLOSE
    }
  ]
}

/**
 * Check a reply against the passages that were sent.
 *
 * @param {*} reply - the parsed model reply
 * @param {Array<string>} ids - the passage ids sent, in order
 * @returns {{valid: boolean, errors: Array<string>, wordings: (Object.<string, (string|null)>|null),
 *   dropped: number, cut: number}}
 */
function validate (reply, ids) {
  if (reply === null || typeof reply !== 'object' || Array.isArray(reply)) {
    return { valid: false, errors: ['Response must be a plain object'], wordings: null, dropped: 0, cut: 0 }
  }
  if (!Array.isArray(reply.passages)) {
    return { valid: false, errors: ['"passages" must be an array'], wordings: null, dropped: 0, cut: 0 }
  }
  const asked = Array.isArray(ids) ? ids : []
  const byId = {}
  let dropped = 0
  reply.passages.forEach((p) => {
    const id = (p && typeof p.id === 'string') ? p.id.trim() : ''
    if (!asked.includes(id) || Object.prototype.hasOwnProperty.call(byId, id)) {
      dropped += 1
      return
    }
    byId[id] = p
  })

  let cut = 0
  const wordings = {}
  asked.forEach((id) => {
    const raw = byId[id]
    let text = (raw && typeof raw.wording === 'string') ? stripInvisible(raw.wording).trim() : ''
    if (!text || text.toUpperCase() === NOT_FOUND) { wordings[id] = null; return }
    if (text.length > MAX_WORDING_CHARS) {
      text = text.slice(0, MAX_WORDING_CHARS)
      cut += 1
    }
    wordings[id] = text
  })
  return { valid: true, errors: [], wordings, dropped, cut }
}

/**
 * Suggest the wording for one segment's passages.
 *
 * @param {object} args
 * @param {Array<object>} args.passages - from `boxPlacement.placePassages`
 * @param {string} args.conceptName
 * @param {Object.<string, string>} [args.boxLabels]
 * @param {object} [args.client] - injected OpenAI client (tests)
 * @returns {Promise<{model: string, provider: string, wordings: Object.<string, (string|null)>}>}
 * @throws {Error} with code PASSAGE_TIDY_INVALID when the reply is unusable
 */
async function suggest (args) {
  const passages = Array.isArray(args.passages) ? args.passages : []
  const messages = buildMessages({ passages, conceptName: args.conceptName, boxLabels: args.boxLabels })
  const client = args.client || getClient('report')
  const startedAt = Date.now()
  const spoken = []
  passages.forEach(p => p.heard.forEach(h => spoken.push(String(h.text || ''))))

  let completion
  try {
    // 🔴 PERSONAL: the client's own spoken words. Moderated on what was SAID alone — never the
    // box names or the instructions, which are the app's own (Z3).
    completion = await client.chat.completions.create({ messages, temperature: 0 },
      { timeout: REPORT_TIMEOUT_MS, personal: true, moderate: spoken })
  } catch (err) {
    console.error('[passage-tidy] model=' + TIDY_MODEL() + ' status=error latency=' +
      (Date.now() - startedAt) + 'ms ' + logSuffix(null, err))
    throw err
  }

  const message = completion && completion.choices && completion.choices[0] && completion.choices[0].message
  const checked = validate(parseJsonReply(message ? message.content : null), passages.map(p => p.id))
  const usage = completion && completion.usage
  // Model, latency, tokens and result — never a word of what was said (CLAUDE.md).
  console.log('[passage-tidy] model=' + TIDY_MODEL() + ' status=ok latency=' +
    (Date.now() - startedAt) + 'ms prompt=' + ((usage && usage.prompt_tokens) || 0) +
    ' completion=' + ((usage && usage.completion_tokens) || 0) + ' ' + logSuffix(completion) +
    ' passages=' + passages.length + ' valid=' + checked.valid + ' dropped=' + checked.dropped +
    ' cut=' + checked.cut)

  if (!checked.valid) {
    const err = new Error('The suggested wording was not usable: ' + checked.errors.join('; '))
    err.code = 'PASSAGE_TIDY_INVALID'
    throw err
  }
  return {
    model: TIDY_MODEL(),
    provider: (completion && completion.provider) || AI.primary.name,
    wordings: checked.wordings
  }
}

module.exports = { PROMPT_ID, MAX_WORDING_CHARS, buildMessages, validate, suggest }
