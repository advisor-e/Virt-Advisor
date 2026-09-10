'use strict'

/**
 * outcomeLearning — the pool, the guard, and the arithmetic (item 4.87).
 *
 * specs/002-outcome-learning: data-model §2 (the pooled row), §3 (the computed adjustment),
 * §5 (the resolver option). Explainable code, not a model: pooled verdicts become capped
 * score hold-backs through the same seam as distinction boosts, and every number here can
 * be recomputed by hand from the rows.
 *
 * 🔴 NOTHING IN A POOLED ROW CAN NAME ANYONE. The builder copies only allow-listed fields,
 * each checked against a vocabulary the platform already holds; the guard then refuses the
 * WHOLE row on any key, type, length, or content it does not expect. Nothing is trimmed or
 * dropped to make a row pass, because a row that needed trimming is a row whose source is
 * wrong. Free text never enters: primary issue is kept only when it equals one of Mike's
 * authored labels, industry only when the caller's vocabulary holds it.
 *
 * Nothing here touches the database or the model. The routes read and write.
 */

const DOMAINS = require('../../data/domains.json')
const ENGAGEMENT_TYPES = require('../../data/engagement-types.json')
const STAIRCASE = require('../../data/advisory-staircase.json')
const PRIMARY_ISSUES = require('../../data/primary-issues.json')

// Mike's rulings, 2026-09-10 (spec clarify): the evidence floor and the hold-back cap.
const MIN_FIRMS = 5
const MIN_CASES = 25
const POOLED_HOLDBACK_MAX = 10

const POOL_PREFIX = 'outcome-pool:'
const DECISIONS_KEY = 'outcome-adjustments'
const SHAPE_VERSION = 1

const DOMAIN_IDS = new Set(DOMAINS.map(d => d.id))
// No fallbacks on the three data files: they are the single source, and a missing list
// should stop the backend at load rather than quietly admit nothing.
const ENGAGEMENT_TYPE_IDS = new Set(ENGAGEMENT_TYPES.types.map(t => t.id))
const STAIRCASE_STEP_IDS = new Set(STAIRCASE.steps.map(s => s.id))
const STAIRCASE_STEP_BY_NUMBER = new Map(STAIRCASE.steps.map(s => [s.step, s.id]))
/** Every authored primary-issue label, per domain. Labels, not ids: the file holds none. */
const PRIMARY_ISSUE_LABELS = new Map(Object.keys(PRIMARY_ISSUES).map(d => [d, new Set(PRIMARY_ISSUES[d])]))

const USED_VALUES = ['full', 'partial', 'none']
const OUTCOME_VALUES = ['well', 'less']
const DIMENSIONS = ['domain', 'industry', 'signal', 'engagementType']
const DECISION_STATES = ['live', 'held', 'rejected']

const MAX_TITLE = 255
const MAX_INDUSTRY = 40
// The data model says 64 for every other string. Primary issue is the one exception, and it
// is stated: it is validated by MEMBERSHIP in Mike's authored label list, whose longest entry
// is 89 characters today, so a 64 cap would refuse rows carrying his own wording.
const MAX_PRIMARY_ISSUE = 120
const MAX_OTHER = 64

const ROW_KEYS = ['v', 'month', 'domain', 'primaryIssue', 'industry', 'signals', 'engagementType', 'staircaseStep', 'templates']
const TEMPLATE_KEYS = ['title', 'used', 'outcome']

// ── The guard ─────────────────────────────────────────────────────────────────

function _refuse (reason) {
  const err = new Error('outcome contribution refused: ' + reason)
  err.code = 'OUTCOME_GUARD_' + reason
  throw err
}

/**
 * Content that has no business in an anonymous row: an email, a URL, a phone or account
 * number, or an id shaped like a UUID. Any of them refuses the row.
 */
const IDENTIFYING = [/@/, /:\/\//, /\d{6,}/, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i]

function _checkString (value, max, reason) {
  if (typeof value !== 'string') { _refuse(reason) }
  if (value.length === 0 || value.length > max) { _refuse('STRING_LENGTH') }
  if (IDENTIFYING.some(re => re.test(value))) { _refuse('STRING_CONTENT') }
}

function _checkKeys (obj, allowed, reason) {
  Object.keys(obj).forEach((k) => {
    if (!allowed.includes(k)) { _refuse(reason) }
  })
}

/**
 * Validate a pooled row and return it unchanged, or throw `OUTCOME_GUARD_<REASON>`.
 *
 * @param {*} obj - the candidate row
 * @param {{libraryTitles: string[], signalTypes: string[]}} vocab - the platform template
 *   titles and the known signal types, supplied by the caller because both are read from
 *   stores this module must not open
 * @returns {Object} the same object, untouched
 */
function guardContribution (obj, vocab) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { _refuse('NOT_OBJECT') }
  const v = vocab || {}
  const titles = new Set((Array.isArray(v.libraryTitles) ? v.libraryTitles : []).map(t => String(t).trim().toLowerCase()))
  const signals = new Set(Array.isArray(v.signalTypes) ? v.signalTypes : [])

  _checkKeys(obj, ROW_KEYS, 'UNKNOWN_KEY')
  ROW_KEYS.forEach((k) => {
    if (!(k in obj)) { _refuse('MISSING_KEY') }
  })

  if (obj.v !== SHAPE_VERSION) { _refuse('VERSION') }

  if (typeof obj.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(obj.month)) { _refuse('MONTH') }

  _checkString(obj.domain, MAX_OTHER, 'DOMAIN')
  if (!DOMAIN_IDS.has(obj.domain)) { _refuse('DOMAIN') }

  if (obj.primaryIssue !== null) {
    _checkString(obj.primaryIssue, MAX_PRIMARY_ISSUE, 'PRIMARY_ISSUE')
    const labels = PRIMARY_ISSUE_LABELS.get(obj.domain)
    if (!labels || !labels.has(obj.primaryIssue)) { _refuse('PRIMARY_ISSUE') }
  }

  if (obj.industry !== null) {
    _checkString(obj.industry, MAX_INDUSTRY, 'INDUSTRY')
  }

  if (!Array.isArray(obj.signals)) { _refuse('SIGNALS') }
  obj.signals.forEach((s) => {
    _checkString(s, MAX_OTHER, 'SIGNALS')
    if (!signals.has(s)) { _refuse('SIGNALS') }
  })

  _checkString(obj.engagementType, MAX_OTHER, 'ENGAGEMENT_TYPE')
  if (!ENGAGEMENT_TYPE_IDS.has(obj.engagementType)) { _refuse('ENGAGEMENT_TYPE') }

  if (obj.staircaseStep !== null) {
    _checkString(obj.staircaseStep, MAX_OTHER, 'STAIRCASE_STEP')
    if (!STAIRCASE_STEP_IDS.has(obj.staircaseStep)) { _refuse('STAIRCASE_STEP') }
  }

  if (!Array.isArray(obj.templates) || obj.templates.length === 0) { _refuse('TEMPLATES') }
  obj.templates.forEach((t) => {
    if (!t || typeof t !== 'object' || Array.isArray(t)) { _refuse('TEMPLATE') }
    _checkKeys(t, TEMPLATE_KEYS, 'TEMPLATE_KEY')
    TEMPLATE_KEYS.forEach((k) => {
      if (!(k in t)) { _refuse('TEMPLATE_KEY') }
    })
    _checkString(t.title, MAX_TITLE, 'TEMPLATE_TITLE')
    if (!titles.has(t.title.trim().toLowerCase())) { _refuse('TEMPLATE_TITLE') }
    if (!USED_VALUES.includes(t.used)) { _refuse('TEMPLATE_USED') }
    if (t.outcome !== null && !OUTCOME_VALUES.includes(t.outcome)) { _refuse('TEMPLATE_OUTCOME') }
  })

  return obj
}

// ── The builder ───────────────────────────────────────────────────────────────

/**
 * Build the pooled row for a reviewed case, from the row the route already loaded.
 *
 * Returns null when the case has nothing to contribute: no per-template outcomes, or none
 * naming a template in the platform library. The result is NOT guarded here; the caller
 * passes it through guardContribution so the refusal is logged where the case id is known.
 *
 * @param {Object} caseRow - a case as caseStore maps it (domain, staircaseStep,
 *   templateOutcomes, decisionTrace, review)
 * @param {string[]} libraryTitles - every title in the platform template library
 * @param {string[]} signalTypes - the known signal type ids
 * @param {Iterable<string>} industryVocabulary - the industries the engine recognises; a
 *   typed industry is pooled only on an exact, case-insensitive match
 * @returns {Object|null}
 */
function buildContribution (caseRow, libraryTitles, signalTypes, industryVocabulary) {
  if (!caseRow || typeof caseRow !== 'object') { return null }
  const outcomes = Array.isArray(caseRow.templateOutcomes) ? caseRow.templateOutcomes : []
  if (outcomes.length === 0) { return null }

  const canonical = new Map((Array.isArray(libraryTitles) ? libraryTitles : []).map(t => [String(t).trim().toLowerCase(), String(t)]))
  const templates = []
  const seen = new Set()
  outcomes.forEach((o) => {
    if (!o || typeof o !== 'object') { return }
    const key = String(o.title || '').trim().toLowerCase()
    const title = canonical.get(key)
    if (!title || seen.has(key)) { return }
    if (!USED_VALUES.includes(o.used)) { return }
    seen.add(key)
    templates.push({ title, used: o.used, outcome: OUTCOME_VALUES.includes(o.outcome) ? o.outcome : null })
  })
  if (templates.length === 0) { return null }

  const trace = caseRow.decisionTrace && typeof caseRow.decisionTrace === 'object' ? caseRow.decisionTrace : {}
  const lenses = trace.lenses && typeof trace.lenses === 'object' ? trace.lenses : {}
  const situation = trace.situation && typeof trace.situation === 'object' ? trace.situation : {}

  const domain = typeof caseRow.domain === 'string' && caseRow.domain
    ? caseRow.domain
    : (trace.domain && typeof trace.domain.id === 'string' ? trace.domain.id : null)

  // The only date, and only to the month. Reviewed-at first: that is when the verdict was given.
  const when = (caseRow.review && caseRow.review.reviewedAt) || caseRow.updatedAt || new Date().toISOString()
  const parsed = new Date(when)
  const month = Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 7)
    : parsed.toISOString().slice(0, 7)

  const labels = domain ? PRIMARY_ISSUE_LABELS.get(domain) : null
  const typedIssue = typeof situation.primaryIssue === 'string' ? situation.primaryIssue.trim() : ''
  const primaryIssue = labels && labels.has(typedIssue) ? typedIssue : null

  const vocabulary = new Set(Array.from(industryVocabulary || [], s => String(s).trim().toLowerCase()))
  const typedIndustry = typeof situation.industry === 'string' ? situation.industry.trim().toLowerCase() : ''
  const industry = typedIndustry && vocabulary.has(typedIndustry) ? typedIndustry : null

  const known = new Set(Array.isArray(signalTypes) ? signalTypes : [])
  const signals = Array.from(new Set((Array.isArray(lenses.signalTypes) ? lenses.signalTypes : []).filter(s => known.has(s))))

  const engagementType = typeof lenses.engagementType === 'string' ? lenses.engagementType : null

  let staircaseStep = null
  if (STAIRCASE_STEP_IDS.has(caseRow.staircaseStep)) {
    staircaseStep = caseRow.staircaseStep
  } else if (STAIRCASE_STEP_BY_NUMBER.has(Number(caseRow.staircaseStep))) {
    staircaseStep = STAIRCASE_STEP_BY_NUMBER.get(Number(caseRow.staircaseStep))
  }

  return { v: SHAPE_VERSION, month, domain, primaryIssue, industry, signals, engagementType, staircaseStep, templates }
}

// ── The arithmetic ────────────────────────────────────────────────────────────

function _slug (value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * The stable id of one adjustment: `slug(title)|dimension|slug(value)`.
 * @param {string} template
 * @param {string} dimension
 * @param {string} value
 * @returns {string}
 */
function adjustmentId (template, dimension, value) {
  return _slug(template) + '|' + dimension + '|' + _slug(value)
}

function _parseId (id) {
  const parts = String(id).split('|')
  return parts.length === 3 && DIMENSIONS.includes(parts[1])
    ? { templateSlug: parts[0], dimension: parts[1], valueSlug: parts[2] }
    : null
}

/**
 * Turn the pool into adjustments, each with its counts, floor and state.
 *
 * @param {Object.<string, Object>} poolRows - `{ '<token>:<caseHash>': row }` as
 *   loadFirmConfigsByPrefix(PLATFORM_SCOPE, POOL_PREFIX) returns it; the firm count is the
 *   number of distinct tokens, parsed from the keys and from nowhere else
 * @param {Object} decisions - the `decisions` map from the DECISIONS_KEY row, or null
 * @param {string[]} libraryTitles - every title in the platform library now; an adjustment
 *   whose template is no longer there is `orphaned`
 * @returns {Array<Object>} data-model §3, sorted by hold-back then id
 */
function computeAdjustments (poolRows, decisions, libraryTitles) {
  const rows = poolRows && typeof poolRows === 'object' ? poolRows : {}
  const decided = decisions && typeof decisions === 'object' ? decisions : {}
  const titles = new Map((Array.isArray(libraryTitles) ? libraryTitles : []).map(t => [String(t).trim().toLowerCase(), String(t)]))

  const acc = new Map()
  const tally = (template, dimension, value, token, outcome) => {
    const id = adjustmentId(template, dimension, value)
    let a = acc.get(id)
    if (!a) {
      a = { id, template, dimension, value, delivered: 0, less: 0, well: 0, tokens: new Set() }
      acc.set(id, a)
    }
    a.delivered += 1
    if (outcome === 'less') { a.less += 1 }
    if (outcome === 'well') { a.well += 1 }
    a.tokens.add(token)
  }

  Object.keys(rows).forEach((key) => {
    const row = rows[key]
    if (!row || typeof row !== 'object') { return }
    const token = key.split(':')[0]
    if (!token) { return }
    const templates = Array.isArray(row.templates) ? row.templates : []
    templates.forEach((t) => {
      if (!t || (t.used !== 'full' && t.used !== 'partial')) { return }
      if (typeof t.title !== 'string') { return }
      if (typeof row.domain === 'string') { tally(t.title, 'domain', row.domain, token, t.outcome) }
      if (typeof row.industry === 'string') { tally(t.title, 'industry', row.industry, token, t.outcome) }
      if (typeof row.engagementType === 'string') { tally(t.title, 'engagementType', row.engagementType, token, t.outcome) }
      ;(Array.isArray(row.signals) ? row.signals : []).forEach((s) => {
        if (typeof s === 'string') { tally(t.title, 'signal', s, token, t.outcome) }
      })
    })
  })

  const out = []
  acc.forEach((a) => {
    const firms = a.tokens.size
    const cases = a.delivered
    // `delivered` is at least 1 for anything in the map, so the ratio is always defined.
    const holdBack = Math.round(POOLED_HOLDBACK_MAX * a.less / a.delivered)
    const meetsFloor = firms >= MIN_FIRMS && cases >= MIN_CASES
    const decision = decided[a.id]
    const inLibrary = titles.has(a.template.trim().toLowerCase())
    let state
    if (!inLibrary) {
      state = 'orphaned'
    } else if (!meetsFloor) {
      state = 'below_floor'
    } else if (decision && DECISION_STATES.includes(decision.state)) {
      state = decision.state
    } else {
      state = 'proposed'
    }
    out.push({
      id: a.id,
      template: inLibrary ? titles.get(a.template.trim().toLowerCase()) : a.template,
      dimension: a.dimension,
      value: a.value,
      delivered: a.delivered,
      less: a.less,
      well: a.well,
      firms,
      cases,
      holdBack,
      meetsFloor,
      state,
      decision: decision || null
    })
  })

  // A decision with no evidence behind it any more is shown, never dropped (data-model §4).
  Object.keys(decided).forEach((id) => {
    if (acc.has(id)) { return }
    const parts = _parseId(id)
    if (!parts) { return }
    const d = decided[id] || {}
    const template = typeof d.template === 'string' ? d.template : null
    const inLibrary = template !== null && titles.has(template.trim().toLowerCase())
    out.push({
      id,
      template: inLibrary ? titles.get(template.trim().toLowerCase()) : template,
      dimension: parts.dimension,
      value: typeof d.value === 'string' ? d.value : parts.valueSlug,
      delivered: 0,
      less: 0,
      well: 0,
      firms: 0,
      cases: 0,
      holdBack: 0,
      meetsFloor: false,
      state: inLibrary ? 'below_floor' : 'orphaned',
      decision: d
    })
  })

  // Ids are unique here (one map entry each), so two never compare equal.
  out.sort((x, y) => (y.holdBack - x.holdBack) || (x.id < y.id ? -1 : 1))
  return out
}

/**
 * The adjustments the resolver may apply: live, and holding something back.
 * A live adjustment with a hold-back of 0 is listed on the page and applies nothing.
 * @param {Array<Object>} computed - from computeAdjustments
 * @returns {Array<{id:string,template:string,dimension:string,value:string,holdBack:number,firms:number,cases:number}>}
 */
function liveAdjustments (computed) {
  return (Array.isArray(computed) ? computed : [])
    .filter(a => a && a.state === 'live' && a.holdBack > 0)
    .map(a => ({ id: a.id, template: a.template, dimension: a.dimension, value: a.value, holdBack: a.holdBack, firms: a.firms, cases: a.cases }))
}

module.exports = {
  MIN_FIRMS,
  MIN_CASES,
  POOLED_HOLDBACK_MAX,
  POOL_PREFIX,
  DECISIONS_KEY,
  SHAPE_VERSION,
  DIMENSIONS,
  buildContribution,
  guardContribution,
  adjustmentId,
  computeAdjustments,
  liveAdjustments
}
