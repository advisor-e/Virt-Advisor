'use strict'

/**
 * @file AI response validation utilities.
 * Governance framework §5.2 — LLM output must never be trusted as valid structured data.
 * Parse and validate the shape of every AI response before saving to state or the database.
 * @module server/utils/validateAIResponse
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean}  valid  - True when the response passes all checks
 * @property {string[]} errors - List of validation failure messages (empty when valid)
 * @property {Object|null} data - The validated response object, or null on failure
 */

/**
 * Validates a quiz-generation AI response and normalises the questions key.
 * Accepts the key variations the model may use (questions / quiz_questions /
 * quiz / items). Valid = a non-empty array of question objects, each carrying a
 * non-empty `question` string. The whole batch is rejected if any item is
 * malformed, so a partially-broken quiz is never served.
 *
 * @param {*} response - The parsed AI response to validate
 * @returns {ValidationResult} `data` is `{ questions: Array }` when valid
 */
function validateQuizGenerate (response) {
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    return { valid: false, errors: ['Response must be a plain object'], data: null }
  }

  const questions = response.questions || response.quiz_questions || response.quiz || response.items
  if (!Array.isArray(questions) || questions.length === 0) {
    return { valid: false, errors: ['Missing or empty questions array'], data: null }
  }

  for (const q of questions) {
    if (q === null || typeof q !== 'object' || Array.isArray(q)) {
      return { valid: false, errors: ['Each question must be a plain object'], data: null }
    }
    if (typeof q.question !== 'string' || q.question.trim() === '') {
      return { valid: false, errors: ['Each question must have a non-empty question string'], data: null }
    }
  }

  return { valid: true, errors: [], data: { questions } }
}

/**
 * Validates a quiz-grade AI response. Valid = a boolean `passed`, a numeric
 * `score` in [0, 100], and a non-empty `feedback` string. Used before an
 * advisor's course pass/fail is recorded — an invalid grade must never be
 * trusted (it could otherwise mark a pass on malformed model output).
 *
 * @param {*} response - The parsed AI response to validate
 * @returns {ValidationResult} `data` is `{ passed, score, feedback }` when valid
 */
function validateQuizGrade (response) {
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    return { valid: false, errors: ['Response must be a plain object'], data: null }
  }

  const errors = []

  if (typeof response.passed !== 'boolean') {
    errors.push(`Field 'passed' must be a boolean, got ${typeof response.passed}`)
  }

  if (typeof response.score !== 'number' || Number.isNaN(response.score) || response.score < 0 || response.score > 100) {
    errors.push("Field 'score' must be a number between 0 and 100")
  }

  if (typeof response.feedback !== 'string' || response.feedback.trim() === '') {
    errors.push("Field 'feedback' must be a non-empty string")
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null }
  }

  return { valid: true, errors: [], data: { passed: response.passed, score: response.score, feedback: response.feedback } }
}

/**
 * Validates a course-outline AI response (the [COURSE_OUTLINE] JSON emitted by
 * the design stream), then normalises the derivable fields (CB-08).
 *
 * REJECTED (whole outline, data null) when the content an advisor reads to
 * judge the course is missing: the outline `title`, a non-empty `sessions`
 * array, or any session's `title` or `focus` — those cannot be invented
 * without fabricating (governance: don't-fabricate).
 *
 * NORMALISED instead of rejected (the screen renders these directly, so they
 * must be trustworthy, but they are all derivable): session `id`s are rewritten
 * to true positions (the AI's own numbering can drift), `totalSessions` is set
 * to the real count (never the AI's claim), `intensity` is snapped to its two
 * legal values (defaulting to 'consistent'), `resources`/`objectives` become
 * clean string arrays, `estimatedMinutes` becomes a positive number (defaulting
 * to 30 — the session screen's existing default), and `topic` a string.
 *
 * @param {*} response - The parsed AI response to validate
 * @returns {ValidationResult} `data` is the validated + normalised outline when valid
 */
function validateCourseOutline (response) {
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    return { valid: false, errors: ['Response must be a plain object'], data: null }
  }

  const errors = []

  if (typeof response.title !== 'string' || response.title.trim() === '') {
    errors.push("Field 'title' must be a non-empty string")
  }

  if (!Array.isArray(response.sessions) || response.sessions.length === 0) {
    errors.push("Field 'sessions' must be a non-empty array")
  } else {
    for (const s of response.sessions) {
      if (s === null || typeof s !== 'object' || Array.isArray(s)) {
        errors.push('Each session must be a plain object')
        break
      }
      if (typeof s.title !== 'string' || s.title.trim() === '') {
        errors.push('Each session must have a non-empty title string')
        break
      }
      if (typeof s.focus !== 'string' || s.focus.trim() === '') {
        errors.push('Each session must have a non-empty focus string')
        break
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null }
  }

  const sessions = response.sessions.map((s, i) => {
    const resources = Array.isArray(s.resources) ? s.resources.filter(r => typeof r === 'string') : []
    const session = {
      ...s,
      id: i + 1,
      resources,
      objectives: Array.isArray(s.objectives) ? s.objectives.filter(o => typeof o === 'string') : [],
      estimatedMinutes: (typeof s.estimatedMinutes === 'number' && Number.isFinite(s.estimatedMinutes) && s.estimatedMinutes > 0)
        ? s.estimatedMinutes
        : 30
    }
    // CB-25: resourceLinks round-trips through the browser (and a shared
    // course copies it to teammates), so it is re-validated at the door:
    // https-only, and only for names actually in this session's resources —
    // a tampered javascript:/foreign entry is dropped, never stored.
    const links = {}
    if (s.resourceLinks && typeof s.resourceLinks === 'object' && !Array.isArray(s.resourceLinks)) {
      for (const name of resources) {
        const url = s.resourceLinks[name]
        if (typeof url === 'string' && /^https:\/\//i.test(url)) { links[name] = url }
      }
    }
    if (Object.keys(links).length) { session.resourceLinks = links } else { delete session.resourceLinks }
    return session
  })

  const data = {
    ...response,
    sessions,
    totalSessions: sessions.length,
    intensity: String(response.intensity).toLowerCase() === 'progressive' ? 'progressive' : 'consistent',
    topic: typeof response.topic === 'string' ? response.topic : ''
  }

  return { valid: true, errors: [], data }
}

module.exports = { validateQuizGenerate, validateQuizGrade, validateCourseOutline }
