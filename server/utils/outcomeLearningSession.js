'use strict'

/**
 * outcomeLearningSession — what a live advisor session reads from Outcome Learning, and
 * what it writes back onto the decision trace (item 4.87, specs/002-outcome-learning
 * data-model §5, tasks T033/T035).
 *
 * Two functions, kept out of advisorEngine.js so they can be tested to 100% without a
 * session harness:
 *
 *   loadPooledForSession(firmId)  — the firm's consent and the LIVE adjustments, or nothing.
 *   buildOutcomeLearningTrace(…)  — the trace block, computed from the scoring log, never
 *                                   from intent.
 *
 * 🔴 A SESSION NEVER FAILS BECAUSE LEARNING COULD NOT BE READ (FR-019). Every store fault
 * degrades to no adjustments with `available: false`, and the recommendation resolves as it
 * would have before this feature existed. The trace then says learning was unavailable,
 * which is the honest sentence; silence would claim an influence the engine did not have.
 *
 * 🔴 NOTHING IS APPLIED AT A FIRM THAT HAS NOT OPTED IN. Consent is read per session; the
 * pool is read only after it.
 */

const overlay = require('./firmOverlay')
const { PLATFORM_SCOPE } = require('./platformScope')
const { CONFIG_KEY, contributionOpen } = require('./outcomeConsent')
const { POOL_PREFIX, DECISIONS_KEY, computeAdjustments, liveAdjustments } = require('./outcomeLearning')
const { platformTemplates } = require('./outcomeContribute')

/**
 * The live list is one platform-wide set and costs a full pool read plus the arithmetic,
 * so it is cached per process for a minute — the same TTL the template library uses. A
 * mentor's decision therefore reaches live sessions within a minute, which the mentor
 * page says; clearPooledCache exists for tests and for any route that wants it sooner.
 */
const TTL_MS = 60 * 1000
let _cache = null

function clearPooledCache () { _cache = null }

async function _liveAdjustments () {
  if (_cache && (Date.now() - _cache.at) < TTL_MS) { return _cache.value }
  const [rows, stored, templates] = await Promise.all([
    overlay.loadFirmConfigsByPrefix(PLATFORM_SCOPE, POOL_PREFIX),
    overlay.loadFirmConfig(PLATFORM_SCOPE, DECISIONS_KEY),
    platformTemplates()
  ])
  const decisions = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored.decisions : null
  const titles = templates.map(t => t && t.title).filter(t => typeof t === 'string' && t.trim())
  const value = liveAdjustments(computeAdjustments(rows, decisions, titles))
  _cache = { at: Date.now(), value }
  return value
}

/**
 * @param {string|null} firmId - the verified scope, or null for a session with no firm
 * @returns {Promise<{consented: boolean, available: boolean, adjustments: Array}>} the
 *   resolver option shape in `adjustments`; `[]` unless the firm consents and the pool
 *   could be read
 */
async function loadPooledForSession (firmId) {
  if (!firmId) { return { consented: false, available: true, adjustments: [] } }
  let consented = false
  try {
    consented = contributionOpen(await overlay.loadFirmConfig(firmId, CONFIG_KEY))
    if (!consented) { return { consented: false, available: true, adjustments: [] } }
    return { consented: true, available: true, adjustments: await _liveAdjustments() }
  } catch (err) {
    console.error('[outcome-learning] unavailable for this session:', err.message)
    return { consented, available: false, adjustments: [] }
  }
}

const HELD_BACK = /^pooled:held_back-(\d+)$/

/**
 * The trace block, from what the resolver actually wrote. A template is `applied` only
 * when its scoring log carries a `pooled:held_back-<n>` reason, and the hold-back reported
 * is the one in that reason — the capped total the resolver applied, not the sum of the
 * adjustments. A template is `outweighed` only when it carries `pooled:outweighed`.
 *
 * Where several adjustments matched one template, `id` is the first matching one's and
 * `firms`/`cases` are the smallest across them — the weakest evidence behind the line, so
 * the panel never overstates it.
 *
 * @param {Array<{title: string, matchReasons: string[]}>} scoringLog
 * @param {Array<{id: string, template: string, holdBack: number, firms: number, cases: number}>} adjustments
 * @param {{consented: boolean, available: boolean}} status
 * @returns {{consented: boolean, available: boolean, applied: Array, outweighed: Array}}
 */
function buildOutcomeLearningTrace (scoringLog, adjustments, status) {
  const consented = !!(status && status.consented)
  const available = !(status && status.available === false)
  const block = { consented, available, applied: [], outweighed: [] }
  if (!consented) { return block }

  const byTitle = new Map()
  ;(Array.isArray(adjustments) ? adjustments : []).forEach((a) => {
    if (!a || typeof a.template !== 'string') { return }
    const key = a.template.trim().toLowerCase()
    if (!byTitle.has(key)) { byTitle.set(key, []) }
    byTitle.get(key).push(a)
  })

  const evidence = (title) => {
    const matched = byTitle.get(String(title).trim().toLowerCase()) || []
    if (matched.length === 0) { return { id: null, dimension: null, value: null, firms: 0, cases: 0 } }
    return {
      id: matched[0].id,
      // What matched, so the panel can say "held back in {where}" (the trace drawing).
      dimension: matched[0].dimension || null,
      value: matched[0].value || null,
      firms: Math.min(...matched.map(a => a.firms)),
      cases: Math.min(...matched.map(a => a.cases))
    }
  }

  ;(Array.isArray(scoringLog) ? scoringLog : []).forEach((t) => {
    if (!t || typeof t.title !== 'string') { return }
    const reasons = Array.isArray(t.matchReasons) ? t.matchReasons : []
    const held = reasons.map(r => HELD_BACK.exec(String(r))).find(Boolean)
    if (held) {
      block.applied.push(Object.assign({ template: t.title, holdBack: Number(held[1]) }, evidence(t.title)))
    } else if (reasons.includes('pooled:outweighed')) {
      const e = evidence(t.title)
      const matched = byTitle.get(t.title.trim().toLowerCase()) || []
      const holdBack = matched.reduce((sum, a) => sum + (Number(a.holdBack) || 0), 0)
      block.outweighed.push(Object.assign({ template: t.title, holdBack }, e, { by: 'distinction' }))
    }
  })

  return block
}

module.exports = { TTL_MS, clearPooledCache, loadPooledForSession, buildOutcomeLearningTrace }
