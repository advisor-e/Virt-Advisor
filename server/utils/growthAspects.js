'use strict'

/**
 * @file The nine Growth Aspects — each one's description and Mike's questions behind it —
 *   with each tier's own edits merged over the shipped wording.
 * @module server/utils/growthAspects
 *
 * Item 15.2, screen 3 of `design/mockups/growth-aspect-questions.html` (approved by Mike
 * 2026-09-27). The shipped wording is `data/growth-fundamentals.json`; the Mentor Hub's
 * Growth Aspect Questions tab stores changes over it. The descriptions reach the Virtual
 * Advisor's prompt and the questions reach the planner's coverage wheel, which is why this
 * is a screen and not a data file — the hub-page rule.
 *
 * MENTOR TIER ALONE today (`TAB_TIERS.growthAspectQuestions`): the questions are Mike's and
 * the same for every firm. The resolver walks the whole tier chain regardless, exactly as
 * `forecastSellDown.js` does, so a firm that one day needs its own wording is one line there.
 *
 * ⚠ WHAT A TIER MAY CHANGE IS EACH ASPECT'S DESCRIPTION AND ITS QUESTION LIST — NEVER THE
 * NINE NAMES. The names are the key everything else joins on: the planner's actions table
 * offers them as a fixed list (`strategyFrameworks.js`), an objective saved against one is
 * counted on the wheel by it, and the AI's aspect-naming answer is checked against them.
 * A renamed aspect would orphan every objective already filed under the old name.
 *
 * ⚠ A TIER STORES ONLY WHAT DIFFERS FROM THE LEVEL ABOVE (`diffAgainst`). A save that
 * repeated the shipped wording would freeze it at this tier, and a later correction to the
 * data file — the questions are pinned word for word by `growthAspectQuestions.test.js` —
 * would then reach nobody.
 */

const fs = require('fs')
const path = require('path')
const { devFallbackAllowed } = require('./dbFailure')
const { parentScopeOf } = require('./tierChain')

/** The overlay address this content is stored under, at every tier. */
const CONFIG_KEY = 'growth-aspect-questions'

/** The shipped nine, in the deck's order: `{name, description, questions}`. */
const BASE_ASPECTS = Object.freeze(
  (require('../../data/growth-fundamentals.json').growthAspects || [])
    .map(a => Object.freeze({
      name: a.name,
      description: a.description,
      questions: Object.freeze((a.questions || []).slice())
    }))
)

/** The nine names — the only keys a stored change may carry. */
const ASPECT_NAMES = BASE_ASPECTS.map(a => a.name)

/**
 * Length limits. Generous against the real content — the longest shipped description is
 * under 200 characters and the longest question under 450 — and there so a pasted document
 * cannot be stored as one "question" and sent to the model on every client session.
 */
const MAX_DESCRIPTION = 400
const MAX_QUESTION = 1000
const MAX_QUESTIONS = 40

const DEV_FILE = path.resolve(__dirname, '../../data/dev-growth-aspect-questions.json')

/**
 * The overlay store, required on first use. advisorEngine.js loads this module, and it keeps
 * the MySQL pool out of its own load for the same reason it lazy-loads `loadFirmConfig`.
 * @returns {object}
 */
function overlay () {
  return require('./firmOverlay')
}

/** Dev-only: this scope's own stored changes from the JSON fallback, or null. */
function devRead (scopeId) {
  try {
    const own = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))[scopeId]
    return (own && typeof own === 'object' && !Array.isArray(own)) ? own : null
  } catch (e) { return null }
}

/** Dev-only: persist this scope's own changes to the JSON fallback. */
function devWrite (scopeId, value) {
  let all = {}
  try { all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (e) { all = {} }
  all[scopeId] = value
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
}

/**
 * The overlay reader, falling back to the dev file so the cascade behaves the same with and
 * without a database. Shared by the hub routes, the planner route and the Virtual Advisor,
 * so all three see the same wording.
 * @param {string} scopeId
 * @param {string} key
 * @returns {Promise<object|null>}
 */
async function readScopeConfig (scopeId, key) {
  try {
    return await overlay().loadFirmConfig(scopeId, key)
  } catch (err) {
    if (devFallbackAllowed(err)) { return devRead(scopeId) }
    throw err
  }
}

/**
 * Store this scope's own changes, falling back to the dev file.
 * @param {string} scopeId - from the verified JWT, never a request body.
 * @param {object} value - already validated.
 * @param {string} savedBy
 * @returns {Promise<void>}
 */
async function saveScopeConfig (scopeId, value, savedBy) {
  try {
    await overlay().saveFirmConfig(scopeId, CONFIG_KEY, value, savedBy)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(scopeId, value)
  }
}

/**
 * Validate and sanitise a scope's OWN changes: `{ [aspectName]: {description?, questions?} }`.
 *
 * An absent aspect, or an absent field within one, is not an error — it means "keep taking
 * this from the level above". Everything present is checked:
 *   - an unknown aspect name or field is refused, never dropped: a change that vanishes
 *     quietly is wording somebody believes they set;
 *   - a description may not be blank — the AI is sent it to recognise the aspect;
 *   - a question list keeps at least one question, or the wheel would offer
 *     "Show the 0 questions" and the AI could name an aspect with nothing behind it;
 *   - a blank question is refused rather than stripped, so the saved count is the count
 *     the mentor saw.
 *
 * @param {*} value - the candidate object.
 * @returns {{ok: boolean, errors: string[], value: object}} `value` holds only the trimmed,
 *   recognised fields and is meaningful only when `ok` is true.
 */
function validateAspects (value) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['the aspects must be a non-array JSON object'], value: {} }
  }

  const clean = {}
  Object.keys(value).forEach((name) => {
    if (!ASPECT_NAMES.includes(name)) {
      errors.push(`${name} is not one of the nine Growth Aspects`)
      return
    }
    const body = value[name]
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      errors.push(`${name} must be a non-array JSON object`)
      return
    }
    const out = {}
    Object.keys(body).forEach((field) => {
      if (field !== 'description' && field !== 'questions') {
        errors.push(`${name}: ${field} cannot be changed here`)
      }
    })

    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
      const d = typeof body.description === 'string' ? body.description.trim() : null
      if (!d) {
        errors.push(`${name}: the description cannot be blank`)
      } else if (d.length > MAX_DESCRIPTION) {
        errors.push(`${name}: the description is longer than ${MAX_DESCRIPTION} characters`)
      } else {
        out.description = d
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'questions')) {
      const qs = body.questions
      if (!Array.isArray(qs)) {
        errors.push(`${name}: the questions must be a list`)
      } else if (qs.length === 0) {
        errors.push(`${name}: keep at least one question`)
      } else if (qs.length > MAX_QUESTIONS) {
        errors.push(`${name}: no more than ${MAX_QUESTIONS} questions`)
      } else {
        const trimmed = qs.map(q => (typeof q === 'string' ? q.trim() : ''))
        const blank = trimmed.findIndex(q => !q)
        const long = trimmed.findIndex(q => q.length > MAX_QUESTION)
        if (blank !== -1) {
          errors.push(`${name}: question ${blank + 1} is blank`)
        } else if (long !== -1) {
          errors.push(`${name}: question ${long + 1} is longer than ${MAX_QUESTION} characters`)
        } else {
          out.questions = trimmed
        }
      }
    }

    if (Object.keys(out).length) { clean[name] = out }
  })

  return { ok: errors.length === 0, errors, value: clean }
}

/**
 * Lay a scope's validated changes over the aspects above it. Returns new objects; the
 * inputs are never mutated, so `BASE_ASPECTS` stays the shipped wording for every caller.
 * @param {Array<object>} base
 * @param {object} own - validated `{name: {description?, questions?}}`
 * @returns {Array<object>}
 */
function applyOwn (base, own) {
  return base.map((a) => {
    const mine = own[a.name]
    if (!mine) { return a }
    return {
      name: a.name,
      description: mine.description !== undefined ? mine.description : a.description,
      questions: mine.questions !== undefined ? mine.questions.slice() : a.questions.slice()
    }
  })
}

/**
 * Keep only what differs from the level above — see the file note on why a repeat of the
 * inherited wording is never stored.
 * @param {object} own - validated changes
 * @param {Array<object>} inherited - the resolved aspects of the level above
 * @returns {object}
 */
function diffAgainst (own, inherited) {
  const out = {}
  inherited.forEach((a) => {
    const mine = own[a.name]
    if (!mine) { return }
    const kept = {}
    if (mine.description !== undefined && mine.description !== a.description) {
      kept.description = mine.description
    }
    if (mine.questions !== undefined &&
        JSON.stringify(mine.questions) !== JSON.stringify(a.questions)) {
      kept.questions = mine.questions
    }
    if (Object.keys(kept).length) { out[a.name] = kept }
  })
  return out
}

/**
 * The aspects one scope works to, resolved through every tier above it.
 *
 * @param {string|null} scopeId - from the verified JWT and NEVER from a request body — a
 *   body-supplied id would let one firm read another's configuration (`tier-cascade.md` P6).
 * @param {function(string, string): Promise<Object|null>} loadConfig - the overlay reader,
 *   injected so tests need no database.
 * @returns {Promise<Array<{name: string, description: string, questions: string[]}>>}
 *   NEVER REJECTS: the planner and the Virtual Advisor must not fail for it, and the worst
 *   case is the shipped wording — what every firm had before this tab existed.
 */
async function loadResolvedAspects (scopeId, loadConfig) {
  if (!scopeId) { return BASE_ASPECTS }

  const parent = parentScopeOf(scopeId)
  const base = parent === null ? BASE_ASPECTS : await loadResolvedAspects(parent, loadConfig)

  let stored = null
  try {
    stored = await loadConfig(scopeId, CONFIG_KEY)
  } catch (err) {
    console.error('[growth-aspects] scope read failed:', err.message)
    return base
  }
  // Identity when nothing is stored, so "unchanged" is provable by reference.
  const { ok, value } = validateAspects(stored)
  if (!ok || Object.keys(value).length === 0) { return base }
  return applyOwn(base, value)
}

module.exports = {
  CONFIG_KEY,
  BASE_ASPECTS,
  ASPECT_NAMES,
  MAX_DESCRIPTION,
  MAX_QUESTION,
  MAX_QUESTIONS,
  validateAspects,
  applyOwn,
  diffAgainst,
  loadResolvedAspects,
  readScopeConfig,
  saveScopeConfig
}
