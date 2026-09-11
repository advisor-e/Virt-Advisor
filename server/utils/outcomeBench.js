'use strict'

/**
 * outcomeBench — the two benches that say whether Outcome Learning made the engine smarter
 * (item 4.87, specs/002-outcome-learning FR-015, SC-001, SC-004, SC-005; tasks T040–T042).
 *
 *   fixedBench(scenarios, templates, adjustments)  — the Scenario Lab's 50 invented cases.
 *   outcomeBench(poolRows, templates, adjustments) — every pooled review, replayed.
 *   runBenches(...)                                — both, in the shape the decisions row stores.
 *
 * Both replay a situation through the SAME two-pass resolver and display-set builder the live
 * session uses, twice: once with no pooled adjustments and once with the live ones. "Smarter"
 * is the difference between the two shares, and nothing here is an estimate: every figure can
 * be recomputed by hand from the rows and the scoring log.
 *
 * 🔴 THE FIXED BENCH'S EXPECTED ANSWER IS THE ENGINE'S OWN UNADJUSTED ANSWER (Mike's yes,
 * 2026-09-11). The 50 cases carry no authored answer key, and inventing one would be inventing
 * his content. So `before` is 1.0 by construction and `after` is the share of cases the live
 * adjustments left unchanged — exactly what SC-001 and SC-004 ask the fixed bench to prove: a
 * firm that has not opted in sees no change, and the cap never lets pooled outcomes overrule
 * the advisor's own words. It is a guard, not a score, and the page's honesty line says so.
 *
 * 🔴 THE OUTCOME BENCH'S DENOMINATOR IS EVERY REPLAYED REVIEW. A review that marked nothing
 * "Landed well" still counts once in the denominator and never in the numerator: it is a case
 * the engine cannot be right on, and leaving it out would flatter the share (SC-005).
 *
 * 🔴 NOTHING HERE CAN NAME ANYONE. A pooled row holds no firm, advisor or client; the replay
 * reads only the row's situation fields and the report carries only counts and shares.
 *
 * A long replay yields to the event loop every YIELD_EVERY rows so the bench route can answer
 * with a job id past the page-render limit while the run continues — measured 2026-09-11 at
 * about one millisecond per resolver pass, so 10,000 reviews take about twenty seconds.
 */

const STAIRCASE = require('../../data/advisory-staircase.json')
const { extractProblemSignals } = require('./problemSignals')
const { staircaseToCeiling, DOMAIN_NATURAL_ENGAGEMENT } = require('./caseState')
const { resolveTemplatesWithOutlier, buildDisplaySet } = require('./templateResolver')

const YIELD_EVERY = 200

/** Staircase step id → step number, so a pooled row's `as-interpretation` becomes a ceiling. */
const STEP_NUMBER_BY_ID = new Map(STAIRCASE.steps.map(s => [s.id, s.step]))

function _key (title) {
  return typeof title === 'string' ? title.trim().toLowerCase() : null
}

/**
 * One replay: the top card the advisor would have seen, or null when nothing scored.
 * @param {Object} caseState
 * @param {Object} strategy - `{ engagementType, templateBudget }`
 * @param {Array<Object>} templates
 * @param {Array<Object>} adjustments - the resolver option shape; `[]` for the plain run
 * @param {string[]} signalTypes - the session's fired lens signals, for `signal` adjustments
 * @returns {string|null} the top template's title
 */
function topRecommendation (caseState, strategy, templates, adjustments, signalTypes) {
  const resolved = resolveTemplatesWithOutlier(caseState, strategy, templates, {
    pooledAdjustments: adjustments,
    pooledSignalTypes: signalTypes
  })
  const cards = buildDisplaySet(resolved, strategy.templateBudget)
  return cards[0] && typeof cards[0].title === 'string' ? cards[0].title : null
}

/**
 * A Scenario Lab case as the engine sees it — the ONE builder the Scenario Lab script and the
 * fixed bench share, so the bench can never drift from the report (research §8 found the
 * reason mapping copied twice; the case shape is not copied a second time here).
 * @param {Object} sc - one entry of scripts/scenario-lab-cases.json
 * @returns {{caseState: Object, strategy: Object, signalTypes: string[]}}
 */
function scenarioToCase (sc) {
  // The CURRENT live engine input: what contributed plus the check-in answer.
  const text = [sc.situationDiagnostic, sc.domainConfirmed].filter(Boolean).join(' ')
  const problemSignals = extractProblemSignals(text)
  const caseState = {
    domain: sc.domain,
    primaryIssue: '',
    industry: sc.industry || null,
    solutionCategories: [sc.domain],
    complexityCeiling: staircaseToCeiling(sc.staircase),
    client: {},
    advisor: {},
    problemSignals
  }
  const strategy = {
    engagementType: sc.engagement || DOMAIN_NATURAL_ENGAGEMENT[sc.domain] || 'facilitation',
    templateBudget: sc.budget || 2
  }
  // The invented cases carry no lens signals, so a `signal` adjustment never matches them.
  return { caseState, strategy, signalTypes: [] }
}

/**
 * A pooled review's situation as the engine sees it. The row holds no spoken words, so the
 * text-read problem signals are empty and only the row's own fields steer the replay:
 * domain, authored primary issue, vocabulary industry, lens signals, engagement type and
 * staircase step. That is the anonymised shape and nothing more.
 * @param {Object} row - data-model §2
 * @returns {{caseState: Object, strategy: Object, signalTypes: string[]}}
 */
function poolRowToCase (row) {
  const stepNumber = STEP_NUMBER_BY_ID.get(row.staircaseStep)
  const caseState = {
    domain: row.domain,
    primaryIssue: typeof row.primaryIssue === 'string' ? row.primaryIssue : '',
    industry: typeof row.industry === 'string' ? row.industry : null,
    solutionCategories: [row.domain],
    complexityCeiling: staircaseToCeiling(stepNumber),
    client: {},
    advisor: {},
    problemSignals: {}
  }
  const strategy = {
    engagementType: typeof row.engagementType === 'string' ? row.engagementType : (DOMAIN_NATURAL_ENGAGEMENT[row.domain] || 'facilitation'),
    // Only the top card is judged, so one card is the whole display set.
    templateBudget: 1
  }
  const signalTypes = Array.isArray(row.signals) ? row.signals.filter(s => typeof s === 'string') : []
  return { caseState, strategy, signalTypes }
}

/** Every title the review marked "Landed well" — used fully or partly, verdict `well`. */
function _wellTitles (row) {
  const out = new Set()
  ;(Array.isArray(row.templates) ? row.templates : []).forEach((t) => {
    if (t && (t.used === 'full' || t.used === 'partial') && t.outcome === 'well') {
      const k = _key(t.title)
      if (k) { out.add(k) }
    }
  })
  return out
}

function _share (count, total) {
  return total > 0 ? count / total : 0
}

function _liveIds (adjustments) {
  return (Array.isArray(adjustments) ? adjustments : [])
    .map(a => a && typeof a.id === 'string' ? a.id : null)
    .filter(Boolean)
}

/**
 * The fixed bench. `before` is 1.0 by construction (see the header); `after` is the share of
 * cases whose top recommendation the live adjustments left where it was; `changed` names the
 * cases that moved, so the report can say WHICH — never only how many.
 *
 * @param {Array<Object>} scenarios - scripts/scenario-lab-cases.json, or a filtered subset
 * @param {Array<Object>} templates - the platform library
 * @param {Array<Object>} adjustments - the live adjustments in the resolver option shape
 * @returns {Promise<{before: number, after: number, cases: number, unchanged: number,
 *   changed: Array<{key: string, from: string|null, to: string|null}>, liveIds: string[]}>}
 */
async function fixedBench (scenarios, templates, adjustments) {
  const list = Array.isArray(scenarios) ? scenarios : []
  const live = Array.isArray(adjustments) ? adjustments : []
  const changed = []
  let unchanged = 0
  for (let i = 0; i < list.length; i++) {
    const { caseState, strategy, signalTypes } = scenarioToCase(list[i])
    const expected = topRecommendation(caseState, strategy, templates, [], signalTypes)
    const withLive = topRecommendation(caseState, strategy, templates, live, signalTypes)
    if (_key(expected) === _key(withLive)) {
      unchanged += 1
    } else {
      changed.push({ key: list[i].key, from: expected, to: withLive })
    }
    if ((i + 1) % YIELD_EVERY === 0) { await new Promise(resolve => setImmediate(resolve)) }
  }
  return {
    before: list.length > 0 ? 1 : 0,
    after: _share(unchanged, list.length),
    cases: list.length,
    unchanged,
    changed,
    liveIds: _liveIds(live)
  }
}

/**
 * The outcome bench. Each pooled review is replayed with and without the live adjustments;
 * a replay is a hit when its top recommendation is a template that review marked "Landed
 * well". Denominator: every replayed row (see the header).
 *
 * @param {Object.<string, Object>} poolRows - `{ '<token>:<caseHash>': row }` as the store
 *   returns them; only the row is read, never the key
 * @param {Array<Object>} templates - the platform library
 * @param {Array<Object>} adjustments - the live adjustments in the resolver option shape
 * @returns {Promise<{before: number, after: number, reviews: number, wellBefore: number,
 *   wellAfter: number, noWellVerdict: number, liveIds: string[]}>}
 */
async function outcomeBench (poolRows, templates, adjustments) {
  const rows = poolRows && typeof poolRows === 'object' ? Object.keys(poolRows).map(k => poolRows[k]) : []
  const live = Array.isArray(adjustments) ? adjustments : []
  let reviews = 0
  let wellBefore = 0
  let wellAfter = 0
  let noWellVerdict = 0
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || typeof row !== 'object' || typeof row.domain !== 'string') { continue }
    reviews += 1
    const well = _wellTitles(row)
    if (well.size === 0) { noWellVerdict += 1 }
    const { caseState, strategy, signalTypes } = poolRowToCase(row)
    const plain = _key(topRecommendation(caseState, strategy, templates, [], signalTypes))
    const adjusted = _key(topRecommendation(caseState, strategy, templates, live, signalTypes))
    if (plain && well.has(plain)) { wellBefore += 1 }
    if (adjusted && well.has(adjusted)) { wellAfter += 1 }
    if ((i + 1) % YIELD_EVERY === 0) { await new Promise(resolve => setImmediate(resolve)) }
  }
  return {
    before: _share(wellBefore, reviews),
    after: _share(wellAfter, reviews),
    reviews,
    wellBefore,
    wellAfter,
    noWellVerdict,
    liveIds: _liveIds(live)
  }
}

/**
 * Both benches, stamped, in the shape `outcome-adjustments.benches` stores (data-model §4).
 * @param {{scenarios: Array, poolRows: Object, templates: Array, adjustments: Array}} input
 * @returns {Promise<{fixed: Object, outcome: Object}>} each with `ranAt`
 */
async function runBenches (input) {
  const fixed = await fixedBench(input.scenarios, input.templates, input.adjustments)
  const outcome = await outcomeBench(input.poolRows, input.templates, input.adjustments)
  const ranAt = new Date().toISOString()
  return {
    fixed: Object.assign({ ranAt }, fixed),
    outcome: Object.assign({ ranAt }, outcome)
  }
}

module.exports = {
  YIELD_EVERY,
  scenarioToCase,
  poolRowToCase,
  topRecommendation,
  fixedBench,
  outcomeBench,
  runBenches
}
