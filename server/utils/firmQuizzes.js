'use strict'

/**
 * Firm quiz overlay (CB-31 Phase 2) — the layered-override model for quiz banks.
 *
 * Platform base = the banks shipped in data/course-quizzes.json (the firm's IP,
 * transcribed from the authored PDFs). Firm overlay = a firm's edits and
 * additions, stored per firm in firm_framework_versions under config_key
 * 'quiz-banks' — the same machinery behind Advisory Distinctions and the
 * Advisory Staircase, so version history and restore come free.
 *
 * Mike's ruling (2026-07-21): a firm MAY edit the platform's own questions.
 * The edit is stored as an overlay and the base is never touched, so
 * "back to the original" is always possible.
 *
 * Two rules make the merge safe:
 *   1. A bank is replaced WHOLESALE, never merged entry-by-entry. Merging
 *      arrays element-by-element would let a firm's 3-question edit silently
 *      inherit the tail of a 10-question platform bank.
 *   2. Every merged bank carries `origin` — 'platform' or 'firm'. The course
 *      engine fences firm-authored text before it reaches the AI: a question
 *      typed into a browser form is untrusted input, however trusted the
 *      manager who typed it, and prompt injection is the standard attack on
 *      exactly this path. Platform banks are repo data and stay unfenced, so
 *      the tuned CB-29/CB-30 prompt behaviour is unchanged.
 */

const { resolveTemplateName } = require('./resolveTemplateName')

const CONFIG_KEY = 'quiz-banks'

// Bounds on firm-supplied content. The global 1 MB body cap stops a giant
// payload; these stop a merely large one from becoming an unreadable screen or
// an oversized prompt.
const LIMITS = {
  banks: 300, // the master export holds 281 pages
  entriesPerBank: 100,
  keyChars: 200,
  textChars: 2000,
  sourceChars: 300
}

const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const isPlainObject = v => typeof v === 'object' && v !== null && !Array.isArray(v)
const isFilledString = (v, max) =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max

/**
 * Validate a firm-supplied quiz overlay and return a canonical copy of it.
 *
 * Nothing from the request is stored as-is: the returned object is rebuilt
 * field by field from validated values, so unknown fields, prototype-polluting
 * keys and stray types cannot reach the database.
 *
 * @param {*} override - the raw body value (untrusted)
 * @param {Array<{page: string, title: string}>} [templates] - injectable template list (tests)
 * @returns {{ok: true, value: Object} | {ok: false, error: string, candidates?: Array}}
 */
function validateQuizOverride (override, templates) {
  if (!isPlainObject(override)) {
    return { ok: false, error: 'Quizzes must be sent as a JSON object keyed by page name.' }
  }

  const keys = Object.keys(override).filter(k => !k.startsWith('_'))
  if (keys.length === 0) {
    return { ok: false, error: 'No quizzes were sent.' }
  }
  if (keys.length > LIMITS.banks) {
    return { ok: false, error: `Too many quizzes in one save (limit ${LIMITS.banks}).` }
  }

  const value = {}
  for (const key of keys) {
    if (RESERVED_KEYS.has(key)) {
      return { ok: false, error: 'That page name cannot be used.' }
    }
    if (key.length > LIMITS.keyChars) {
      return { ok: false, error: 'A page name is too long.' }
    }

    // The page must exist. The resolver refuses on a near-miss rather than
    // guessing, so a typo can never silently attach a quiz to the wrong page.
    let resolved
    try {
      resolved = resolveTemplateName(key, templates)
    } catch (e) {
      return { ok: false, error: 'The page library could not be read, so quizzes cannot be saved right now.' }
    }
    if (!resolved.ok) {
      return {
        ok: false,
        error: `"${key}" does not match a page in your library.`,
        candidates: (resolved.candidates || []).map(c => c.title)
      }
    }

    const bank = override[key]
    if (!isPlainObject(bank) || !Array.isArray(bank.entries)) {
      return { ok: false, error: `The quiz for "${resolved.title}" is not in the expected shape.` }
    }
    if (bank.entries.length === 0) {
      return { ok: false, error: `The quiz for "${resolved.title}" has no questions.` }
    }
    if (bank.entries.length > LIMITS.entriesPerBank) {
      return { ok: false, error: `The quiz for "${resolved.title}" has too many questions (limit ${LIMITS.entriesPerBank}).` }
    }

    const seenIds = new Set()
    const entries = []
    for (const entry of bank.entries) {
      if (!isPlainObject(entry)) {
        return { ok: false, error: `A question in "${resolved.title}" is not in the expected shape.` }
      }
      if (!Number.isInteger(entry.id) || entry.id < 1) {
        return { ok: false, error: `A question in "${resolved.title}" is missing its number.` }
      }
      if (seenIds.has(entry.id)) {
        return { ok: false, error: `Two questions in "${resolved.title}" share the number ${entry.id}.` }
      }
      seenIds.add(entry.id)
      for (const field of ['question', 'answer', 'keyPoint']) {
        if (!isFilledString(entry[field], LIMITS.textChars)) {
          return { ok: false, error: `A question in "${resolved.title}" is missing its ${field === 'keyPoint' ? 'key point' : field}, or it is too long.` }
        }
      }
      entries.push({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
        keyPoint: entry.keyPoint
      })
    }

    const canonical = { entries }
    if (isFilledString(bank.source, LIMITS.sourceChars)) {
      canonical.source = bank.source
    }
    // Key on the resolved page title, not what was typed, so the stored key is
    // always a real page name however the author spelled it.
    value[resolved.title] = canonical
  }

  return { ok: true, value }
}

/**
 * Merge the platform base with a firm's overlay.
 *
 * @param {Object} base - banks from data/course-quizzes.json
 * @param {Object|null} override - the firm's stored overlay
 * @returns {Object} merged banks, each tagged with `origin`
 */
function mergeQuizBanks (base, override) {
  const merged = {}
  for (const [key, bank] of Object.entries(base || {})) {
    if (key.startsWith('_')) { continue }
    merged[key] = { ...bank, origin: 'platform' }
  }
  for (const [key, bank] of Object.entries(override || {})) {
    if (key.startsWith('_') || RESERVED_KEYS.has(key)) { continue }
    // Wholesale replacement — see rule 1 in the file header.
    merged[key] = { ...bank, origin: 'firm' }
  }
  return merged
}

module.exports = { CONFIG_KEY, LIMITS, validateQuizOverride, mergeQuizBanks }
