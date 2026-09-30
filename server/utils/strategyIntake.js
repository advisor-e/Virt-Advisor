'use strict'

/**
 * @file The guided questions the Strategy Planner asks when a client has no saved conversation,
 *   and the rules that turn the answers into a suggestion's input and its ceiling.
 * @module server/utils/strategyIntake
 *
 * Item 15.31. Approved artefact: `design/mockups/strategy-suggest-intake.html`, APPROVED TO
 * BUILD FROM by Mike 2026-09-30. Its rulings, each binding here:
 *
 *   - **The Virtual Advisor's own questions, read and never copied.** The wording comes from
 *     `intakeQuestions.js` (shared with `advisorEngine.js`), the firm's own Staircase question,
 *     and Mike's plan question from `data/domains.json` `strategyPlanExists`.
 *   - **His plan question first**, because he named it the more important.
 *   - **How many is set by the session's length, never by the model** — see `conceptCap`.
 *
 * 🔴 WHAT REACHES THE MODEL. The advisor's answers, as "question / answer" pairs, and nothing
 * else: no client, advisor, firm or case id. They are typed by a person, so the route passes
 * the typed ones to moderation (rule Z3, `design/OPENAI-ZDR-CONSTRAINTS.md`).
 *
 * Node 14, CommonJS.
 */

const DOMAINS = require('../../data/domains.json')
const { QUESTION_TEXT } = require('./intakeQuestions')
const { BASE_STAIRCASE } = require('./staircaseConfig')

/**
 * Mike's timing rule, 2026-09-30, in his words: "allow 6mins for the frame (welcome, this is
 * your session etc) and 3 mins to discuss agenda, then each concept can have 20 mins - this
 * includes BOTH discuss concept and record responses."
 */
const FRAME_MINUTES = 6
const AGENDA_MINUTES = 3
const MINUTES_PER_CONCEPT = 20

/**
 * The concept that IS the frame — "Know what today is for…". Its time is FRAME_MINUTES, so
 * suggesting it would spend a 20-minute slot on the welcome twice over. Found on the first
 * real run (90 minutes, 4 slots, one of them this); Mike ruled 2026-09-30 that the guided
 * suggestion never offers it. The advisor can still tick it by hand.
 */
const FRAME_CONCEPT_ID = 'our-session-objective'

/**
 * The catalogue the guided suggestion may choose from — everything but the frame.
 * @param {Array<object>} concepts
 * @returns {Array<object>}
 */
function suggestableConcepts (concepts) {
  return (concepts || []).filter(c => c && c.id !== FRAME_CONCEPT_ID)
}

/** A typed "Other" length outside this is not a planning session anyone runs. */
const MIN_SESSION_MINUTES = FRAME_MINUTES + AGENDA_MINUTES + MINUTES_PER_CONCEPT
const MAX_SESSION_MINUTES = 8 * 60

/** One answer's share of the prompt. Enough for a considered sentence or three. */
const MAX_ANSWER_CHARS = 500

/**
 * The questions, in the order they are asked. `kind` tells the screen how each is answered:
 * the three pickers are the Virtual Advisor's own, and the rest are the advisor's own words.
 */
const SEQUENCE = [
  { field: 'strategyPlanExists', kind: 'text' },
  { field: 'growthStage', kind: 'growthStage' },
  { field: 'advisoryStaircase', kind: 'staircase' },
  { field: 'clientRaisedIssue', kind: 'text' },
  { field: 'clientPersonality', kind: 'text' },
  { field: 'advisorExperience', kind: 'text' },
  { field: 'advisorConfidence', kind: 'text' },
  { field: 'advisorSessionLength', kind: 'sessionLength' }
]

/**
 * Mike's plan question, from where he ruled it lives: the strategy domain's plan question.
 * @returns {string}
 */
function planQuestion () {
  const domains = Array.isArray(DOMAINS) ? DOMAINS : (DOMAINS.domains || [])
  const strategy = domains.find(d => d && d.id === 'strategy')
  const q = strategy && Array.isArray(strategy.questions)
    ? strategy.questions.find(x => x && x.field === 'strategyPlanExists')
    : null
  return q && q.text ? String(q.text) : ''
}

/**
 * The questions with their wording, for the screen and for the prompt.
 *
 * @param {object} [staircase] - the firm's resolved Staircase (`loadBlendedStaircase`), so a
 *   firm that reworded its Staircase question is asked in its own words, as the Virtual
 *   Advisor asks it
 * @returns {Array<{field: string, kind: string, text: string}>}
 */
function questions (staircase) {
  const authored = staircase && typeof staircase.selectorPrompt === 'string'
    ? staircase.selectorPrompt.trim()
    : ''
  const textOf = {
    strategyPlanExists: planQuestion(),
    advisoryStaircase: authored || BASE_STAIRCASE.selectorPrompt
  }
  return SEQUENCE.map(q => ({
    field: q.field,
    kind: q.kind,
    text: textOf[q.field] || QUESTION_TEXT[q.field] || ''
  }))
}

/**
 * Minutes from a session-length answer — "90 mins" from the picker, or a typed number.
 * @param {*} answer
 * @returns {number|null} null when there is no usable number in range
 */
function sessionMinutes (answer) {
  const m = /(\d{1,3})/.exec(String(answer || ''))
  if (!m) { return null }
  const n = parseInt(m[1], 10)
  if (n < MIN_SESSION_MINUTES || n > MAX_SESSION_MINUTES) { return null }
  return n
}

/**
 * The most concepts a session of this length can hold — Mike's rule, rounded DOWN so a
 * suggestion never overruns the time the advisor said they have. 30 → 1, 60 → 2, 90 → 4,
 * 120 → 5.
 *
 * @param {number} minutes
 * @returns {number} 0 when the minutes are not usable
 */
function conceptCap (minutes) {
  if (typeof minutes !== 'number' || !isFinite(minutes)) { return 0 }
  return Math.max(0, Math.floor((minutes - FRAME_MINUTES - AGENDA_MINUTES) / MINUTES_PER_CONCEPT))
}

/**
 * The advisor's answers, checked before anything reads them.
 *
 * Every question must be answered: the screen reveals them one at a time and offers the
 * suggestion only after the last, so a missing answer means a request that did not come from
 * the screen. Unknown fields are ignored, never passed on.
 *
 * @param {*} raw - `{ [field]: string }`
 * @returns {{answers: Object<string, string>, minutes: number}|null} null when incomplete or
 *   the session length is unusable
 */
function normaliseAnswers (raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { return null }
  const answers = {}
  for (let i = 0; i < SEQUENCE.length; i++) {
    const field = SEQUENCE[i].field
    const value = typeof raw[field] === 'string' ? raw[field].trim().slice(0, MAX_ANSWER_CHARS) : ''
    if (!value) { return null }
    answers[field] = value
  }
  const minutes = sessionMinutes(answers.advisorSessionLength)
  if (minutes === null) { return null }
  return { answers, minutes }
}

/**
 * The answers the advisor TYPED, for moderation. The picker answers are the app's own words
 * and are never sent to the moderation check — its allowance is small (rule Z3).
 * @param {Object<string, string>} answers - from `normaliseAnswers`
 * @returns {string[]}
 */
function typedAnswers (answers) {
  return SEQUENCE
    .filter(q => q.kind === 'text')
    .map(q => (answers && answers[q.field]) || '')
    .filter(Boolean)
}

/**
 * The client situation the model reads: each question beside its answer, in the order asked.
 * @param {Object<string, string>} answers - from `normaliseAnswers`
 * @param {Array<{field: string, text: string}>} asked - from `questions`
 * @returns {string}
 */
function situationFromAnswers (answers, asked) {
  return (asked || [])
    .filter(q => answers && answers[q.field])
    .map(q => q.text + '\n' + answers[q.field])
    .join('\n\n')
}

module.exports = {
  FRAME_MINUTES,
  AGENDA_MINUTES,
  MINUTES_PER_CONCEPT,
  FRAME_CONCEPT_ID,
  suggestableConcepts,
  MIN_SESSION_MINUTES,
  MAX_SESSION_MINUTES,
  SEQUENCE,
  questions,
  sessionMinutes,
  conceptCap,
  normaliseAnswers,
  typedAnswers,
  situationFromAnswers
}
