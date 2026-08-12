'use strict'

/**
 * @file The firm's effective quiz banks — one read path for the course engine.
 * @module server/utils/quizConfig
 *
 * The counterpart of staircaseConfig.js, for quizzes. Platform banks
 * (data/course-quizzes.json) blended with the firm's decisions, resolved through
 * the one mechanism (resolveInheritedRows.js).
 *
 * THIS FILE CLOSES A DEFECT, not just a feature gap. Until now the course engine
 * read data/course-quizzes.json DIRECTLY and never loaded the firm overlay at all,
 * while the Firm Manager screen rendered platform ⊕ firm through mergeQuizBanks.
 * A firm could therefore save quiz material, see it on screen with version history
 * beside it, and every course would still have used ours — the screen reporting
 * "saved" while the AI never saw a word of it. Exactly the failure found on the
 * domain-support config key on 2026-07-30. It had not bitten yet only because no
 * Save button reaches the route; the editing screen would have made it real.
 *
 * WHY THE POSITIONAL ID IS REASSIGNED HERE. Every question keeps its stable `qid`,
 * but its `id` — the integer the AI is shown as "Entry 3" and hands back as
 * `bankRef` — is a POSITION. Switch off question 2 and the questions below it must
 * close the gap, or the model is shown Entry 1, 3, 4 and the grader's lookup goes
 * hunting for a number nobody offered. Same reasoning as the staircase's `step`.
 *
 * WHAT AN EMPTY RESULT MEANS. A firm that switches off every question in a bank
 * has no bank: the resolved bank is dropped entirely, so the engine falls through
 * to AI-generated questions exactly as it does for a page that never had one.
 * Serving a bank with zero questions instead would tell the AI "build every
 * question from the bank above" and hand it nothing to build from.
 *
 * WHAT CHANGED 2026-08-09 (Phase 5 of the Mentor Hub save-scope plan). A firm's
 * banks used to resolve against the SHIPPED FILE, so a question the mentor wrote at
 * /mentor saved correctly and reached no firm. A firm now resolves against the
 * MENTOR'S RESOLVED BANKS. Same mechanism applied twice — see staircaseConfig.js,
 * which took the identical change.
 */

const BASE_QUIZZES = require('../../data/course-quizzes.json')
const { resolveInheritedRows } = require('./resolveInheritedRows')
const { loadFirmQuizState } = require('./firmQuizzes')
const { parentScopeOf } = require('./tierChain')

/**
 * Source tags written onto every resolved question. The engine fences on these:
 * anything that is not `platform` was typed into a browser and is untrusted.
 * @type {{inherited: string, override: string, own: string}}
 */
const QUIZ_SOURCE_LABELS = { inherited: 'platform', override: 'firm-override', own: 'firm-own' }

let _taggedBase = null

/**
 * The platform banks, minus the `_comment` documentation keys, with every question
 * tagged `source: 'platform'`.
 *
 * THE TAGGING IS NOT COSMETIC — it is what makes the fencing default safe. The
 * engine asks `isFirmAuthored(entry)`, which fails CLOSED: an entry with no
 * provenance is treated as the firm's and fenced. That is the right default for a
 * security check, but it means an UNTAGGED bank reaching the engine would fence
 * Advisor-e's own questions and quietly change the tuned prompt for every firm.
 * So no path here may return an untagged bank — including the common one where the
 * firm has decided nothing. Tagged once and memoised: the base is static repo data.
 *
 * @returns {Object} platform banks keyed by page title
 */
function baseBanks () {
  if (_taggedBase) { return _taggedBase }
  const out = {}
  for (const [key, bank] of Object.entries(BASE_QUIZZES.banks || {})) {
    if (key.startsWith('_')) { continue }
    out[key] = {
      ...bank,
      entries: (Array.isArray(bank.entries) ? bank.entries : [])
        .map(e => ({ ...e, source: QUIZ_SOURCE_LABELS.inherited }))
    }
  }
  _taggedBase = out
  return out
}

/**
 * Sticky flag: a human typed this question into a browser, at SOME level.
 *
 * WHY `source` IS NOT ENOUGH ON ITS OWN, and why this exists (2026-08-09, Phase 5).
 * `source` describes a row's relationship to the level BELOW it — a mentor-authored
 * question is `firm-own` on the mentor's screen and `platform` once a firm inherits
 * it, because from the firm's side it is inherited. That is correct for badging and
 * fatal for fencing: it would quietly untag mentor-typed text on its way to the AI.
 * This flag is written once, never cleared, and survives every fold (the mechanism
 * copies unknown fields through), so provenance outlives the tier it came from.
 * @type {string}
 */
const BROWSER_AUTHORED = 'browserAuthored'

/**
 * True when a question was typed into a browser rather than shipped in the repo.
 *
 * WHY THE BAR IS "NOT REPO DATA" AND NOT "NOT ADVISOR-E". A mentor IS Advisor-e, so
 * it is tempting to trust their questions as platform content. The distinction that
 * actually matters for prompt injection is not who typed it but what reviewed it:
 * repo data passes code review and git history; anything typed into a screen passes
 * neither. And the blast radius runs the wrong way — a firm's text reaches one firm,
 * a mentor's reaches EVERY firm. So mentor-typed questions stay fenced.
 *
 * FAILS CLOSED: anything without a `platform` tag is treated as browser-authored and
 * therefore fenced before it reaches the AI. Under-fencing opens the standard
 * prompt-injection route on this exact path; over-fencing only costs prompt
 * tuning. Every bank the engine can reach is tagged (see baseBanks), so the
 * closed default should never actually fire in production — it is the backstop.
 *
 * @param {Object} entry - a question carrying `source` and possibly `browserAuthored`
 * @returns {boolean}
 */
function isBrowserAuthored (entry) {
  return !!entry && (entry[BROWSER_AUTHORED] === true || entry.source !== QUIZ_SOURCE_LABELS.inherited)
}

/**
 * Resolve one bank's questions against the firm's decisions.
 *
 * The mechanism keys on `id`, so questions go in identified by their STABLE qid
 * and come back out renumbered by position — identity in, position out.
 *
 * @param {Array<Object>} entries - the platform bank's questions
 * @param {Object} state - { declinedIds, overrides, ownRows } already filtered to this bank
 * @returns {Array<Object>} resolved questions, `id` contiguous from 1
 */
function resolveBankEntries (entries, state) {
  const rows = (Array.isArray(entries) ? entries : [])
    .filter(e => e && e.qid)
    .map(e => ({ ...e, id: e.qid }))

  const resolved = resolveInheritedRows(rows, state, { sourceLabels: QUIZ_SOURCE_LABELS })

  return resolved.map((row, i) => {
    const out = { ...row, qid: row.qid || row.id, id: i + 1 }
    // Stamp at the level that typed it. The spread above carries an existing stamp
    // down from any level higher, and nothing here clears one: a question typed once
    // stays marked as typed, however many tiers inherit it. See BROWSER_AUTHORED.
    if (row.source !== QUIZ_SOURCE_LABELS.inherited) { out[BROWSER_AUTHORED] = true }
    return out
  })
}

/**
 * Group a firm's own questions by the bank each names.
 * @param {Array<Object>} ownRows
 * @returns {Map<string, Array<Object>>}
 */
function ownRowsByBank (ownRows) {
  const byBank = new Map()
  for (const row of Array.isArray(ownRows) ? ownRows : []) {
    if (!row || typeof row.bank !== 'string' || !row.bank) { continue }
    if (!row.id) { continue }
    if (!byBank.has(row.bank)) { byBank.set(row.bank, []) }
    // `qid` mirrors the firm id so every resolved question has one identity field,
    // whoever wrote it — the screen and the drift check need not special-case.
    byBank.get(row.bank).push({ ...row, qid: row.qid || row.id })
  }
  return byBank
}

/**
 * Blend the platform banks with a firm's decisions.
 *
 * @param {Object} base - platform banks keyed by page title
 * @param {{declinedIds: string[], overrides: Object, ownRows: Array}} state
 * @returns {Object} effective banks, each question carrying `qid` and `source`
 */
function blendQuizBanks (base, state) {
  const declinedIds = Array.isArray(state && state.declinedIds) ? state.declinedIds : []
  const overrides = (state && state.overrides && typeof state.overrides === 'object' && !Array.isArray(state.overrides))
    ? state.overrides
    : {}
  const byBank = ownRowsByBank(state && state.ownRows)

  const merged = {}
  for (const [key, bank] of Object.entries(base || {})) {
    const entries = resolveBankEntries(bank.entries, {
      declinedIds,
      overrides,
      ownRows: byBank.get(key) || []
    })
    byBank.delete(key)
    // No questions left — the firm switched the whole bank off. See the header.
    if (entries.length === 0) { continue }
    merged[key] = { ...bank, entries }
  }

  // Banks the firm created for a page Advisor-e ships no quiz for.
  for (const [key, rows] of byBank.entries()) {
    const entries = resolveBankEntries([], { declinedIds, overrides, ownRows: rows })
    if (entries.length === 0) { continue }
    merged[key] = { source: 'Firm-authored', entries }
  }

  return merged
}

/**
 * Load a firm's effective quiz banks.
 *
 * @param {string|null} firmId - the scope to resolve for: a firm id, or the reserved
 *   PLATFORM_SCOPE for the mentor's own level. Taken from the verified JWT and never
 *   from a request body (a body-supplied firmId would let one firm read another's
 *   quizzes)
 * @param {function(string, string): Promise<*>} loadFirmConfig - the overlay reader,
 *   injected so the engine reuses the client it has and tests need no database
 * @returns {Promise<Object>} the effective banks. Falls back to the layer above when
 *   this level has decided nothing, has no scope id, or the store cannot be
 *   reached. Never rejects: a storage problem must not stop a course or strip an
 *   advisor's quiz back to AI invention without a word in the log.
 */
async function loadBlendedQuizBanks (firmId, loadFirmConfig) {
  if (!firmId) { return baseBanks() }

  // The layer this level inherits from — asked of tierChain rather than assumed, so
  // one recursion serves mentor -> global -> group -> firm however many levels there
  // are (design/MENTOR-TIER-CHAIN-PLAN.md §3.4). With no membership data the answer
  // is the platform scope, exactly what this line hardcoded before. The mentor has
  // nothing above it, and that null is what ends the recursion. Phase 5.
  const parent = parentScopeOf(firmId)
  const base = parent === null
    ? baseBanks()
    : await loadBlendedQuizBanks(parent, loadFirmConfig)

  let state
  try {
    state = await loadFirmQuizState(firmId, loadFirmConfig, base)
  } catch (err) {
    // In production an unreachable store is a real fault: log it, serve the base.
    // (In development the state loader falls back to the JSON stand-ins itself, so
    // reaching here at all means production.)
    console.error('[quiz] firm state read failed:', err.message)
    return base
  }

  const hasDecisions = state.declinedIds.length > 0 ||
    Object.keys(state.overrides).length > 0 ||
    state.ownRows.length > 0
  if (!hasDecisions) { return base }

  return blendQuizBanks(base, state)
}

module.exports = {
  QUIZ_SOURCE_LABELS,
  BROWSER_AUTHORED,
  baseBanks,
  isBrowserAuthored,
  blendQuizBanks,
  resolveBankEntries,
  loadBlendedQuizBanks
}
