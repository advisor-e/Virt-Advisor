'use strict'

/**
 * outcomeContribute — the step that pools a review when the firm has said yes (item 4.87,
 * specs/002-outcome-learning research §1, tasks T018/T019).
 *
 * Called from `reviewCase` AFTER the review has saved. It reads the firm's consent, the
 * case the advisor just reviewed (owner-scoped), and the platform's template library; then
 * builds, guards and saves one anonymous row at PLATFORM_SCOPE. Every failure is thrown to
 * the caller, which logs it with the case id and leaves the review response untouched: a
 * review is never lost because learning failed.
 *
 * 🔴 NOTHING HERE CARRIES THE ADVISOR. The pool row is keyed by two one-way tokens and its
 * `saved_by` is the constant below, never an email.
 */

const SEED_TEMPLATES = require('../../data/templates.json')
const overlay = require('./firmOverlay')
const caseStore = require('./caseStore')
const { PLATFORM_SCOPE } = require('./platformScope')
const { loadEffectiveTemplates } = require('./templateLibrary')
const { STOP_WORDS } = require('./stop-words')
const { INDUSTRY_STOPWORDS } = require('./templateResolver')
const { SIGNAL_TYPES } = require('./signals')
const { CONFIG_KEY, contributionOpen, firmToken, caseHash } = require('./outcomeConsent')
const { POOL_PREFIX, buildContribution, guardContribution } = require('./outcomeLearning')

/** What a pool row records as its author. A constant, so no person is named on it. */
const POOL_SAVED_BY = 'outcome-learning'

// The resolver's own word splitter, so a word here is a word there.
const WORD_SPLIT = /[\s—\-,/&]+/

/**
 * The industries the engine recognises: every word of every template title and tag that
 * the resolver's industry matcher would accept — longer than three letters and not a stop
 * word under either of its two lists. This is what T022a's suggestions offer and what a
 * typed industry must equal exactly to enter the pool.
 *
 * @param {Array<{title?: string, tags?: string[]}>} templates
 * @returns {Set<string>} lowercase words
 */
function industryVocabulary (templates) {
  const out = new Set()
  ;(Array.isArray(templates) ? templates : []).forEach((t) => {
    if (!t || typeof t !== 'object') { return }
    const sources = [typeof t.title === 'string' ? t.title : ''].concat(Array.isArray(t.tags) ? t.tags : [])
    sources.forEach((s) => {
      String(s).toLowerCase().split(WORD_SPLIT).forEach((w) => {
        if (w.length > 3 && !STOP_WORDS.has(w) && !INDUSTRY_STOPWORDS.has(w)) { out.add(w) }
      })
    })
  })
  return out
}

/**
 * The platform's template library now: the mentor's upload, else the committed seed.
 * Pool titles are validated against the PLATFORM library, never a firm's, because an
 * adjustment is platform-wide (data-model §3).
 * @returns {Promise<Array>}
 */
async function platformTemplates () {
  const uploaded = await loadEffectiveTemplates(null)
  return Array.isArray(uploaded) && uploaded.length > 0 ? uploaded : SEED_TEMPLATES
}

/**
 * Whether a firm's reviews enter the pool right now. Never throws: the case list must
 * load whatever the store is doing, and an unreadable consent reads as off.
 * @param {string} firmId - the verified scope
 * @returns {Promise<boolean>}
 */
async function firmContributes (firmId) {
  try {
    return contributionOpen(await overlay.loadFirmConfig(firmId, CONFIG_KEY))
  } catch (err) {
    console.error('[outcome-learning] consent read failed:', err.message)
    return false
  }
}

/**
 * Pool one reviewed case, if the firm consents and there is something to pool.
 *
 * @param {string} caseId
 * @param {string} advisorId - the verified advisor; scopes the case read
 * @param {string} firmId - the verified scope; names the consent and the token
 * @returns {Promise<{pooled: boolean, reason?: string, key?: string}>}
 * @throws on a guard refusal (`OUTCOME_GUARD_*`), a missing secret
 *   (`OUTCOME_POOL_SECRET_MISSING`), or a store failure — the caller logs and moves on
 */
async function contributeCaseOutcome (caseId, advisorId, firmId) {
  const consent = await overlay.loadFirmConfig(firmId, CONFIG_KEY)
  if (!contributionOpen(consent)) { return { pooled: false, reason: 'consent_off' } }

  // Both tokens first: a missing secret is found before anything else is read.
  const key = POOL_PREFIX + firmToken(firmId) + ':' + caseHash(caseId)

  const row = await caseStore.getVisibleCase(caseId, advisorId, firmId)
  if (!row) { return { pooled: false, reason: 'case_not_found' } }

  const templates = await platformTemplates()
  const libraryTitles = templates.map(t => t && t.title).filter(t => typeof t === 'string' && t.trim())
  const signalTypes = Object.values(SIGNAL_TYPES)

  const contribution = buildContribution(row, libraryTitles, signalTypes, industryVocabulary(templates))
  if (!contribution) { return { pooled: false, reason: 'nothing_to_pool' } }

  guardContribution(contribution, { libraryTitles, signalTypes })
  await overlay.saveFirmConfig(PLATFORM_SCOPE, key, contribution, POOL_SAVED_BY)
  return { pooled: true, key }
}

module.exports = {
  POOL_SAVED_BY,
  industryVocabulary,
  platformTemplates,
  firmContributes,
  contributeCaseOutcome
}
