'use strict'

/**
 * @file The Logic-Lab page's read model — what a firm can change, how much of it
 *       there is, and what has already happened because of it.
 * @module server/utils/logicLabSummary
 *
 * THE SPEC IS THE MOCKUP: design/mockups/decision-logic-map-mockup.html, approved
 * by Mike 2026-08-02. Sections 1 (the three levers) and 3 (the near-miss answer)
 * are built from what this module returns.
 *
 * ── WHY THIS IS A MODULE AND NOT A ROUTE BODY ─────────────────────────────────
 * A mentor-level rollup is planned (Mike, 2026-08-03): one page that reads the
 * SAME logic-lab material out of every firm's hub — the phrases, the templates
 * they point at, which editable blocks actually get used — so platform content
 * and the engine can be improved from what firms really do, and the improvements
 * cascade back down as revised logic tables, domain-support docs and distinction
 * defaults.
 *
 * That rollup must never be a second, drifting definition of "what a firm has".
 * So every count lives HERE, behind pure functions that take resolved config as
 * input:
 *
 *   • the firm route calls these once, for req.firmId;
 *   • a future mentor route enumerates firms (overlay.listFirmIdsWithConfigKey)
 *     and calls the SAME functions per firm, then sums.
 *
 * Nothing here reads a store, a request, or a file — which is what makes the
 * cross-firm loop safe to write later and trivial to test now.
 *
 * ── WHAT MAY AND MAY NOT TRAVEL UPWARDS ───────────────────────────────────────
 * Every field produced here is CONFIGURATION or a COUNT: distinction wording the
 * firm authored, table names, template titles, how many documents exist. No
 * client name, no advisor name, no session text, no case narrative ever enters a
 * summary object. That is the property that makes a mentor reading across firms
 * a content question rather than a privacy one, and it is a rule about this
 * module's OUTPUT — so it holds whoever calls it.
 *
 * `SCHEMA_VERSION` is stamped on every summary. A rollup that has cached or
 * compared summaries across firms needs to know when their shape changed;
 * without it, an added field reads as a firm that suddenly did something new.
 */

/** Bump when the SHAPE of a summary changes (not when a count changes). */
const SCHEMA_VERSION = 1

// The logic table hint boost, read from the resolver rather than re-typed here.
// Section 1 of the page states this number as fact; a second copy of it would be
// free to disagree with the engine, which is the whole failure the single-source
// rule exists to prevent.
const { TREE_HINT_BOOST } = require('./templateResolver')

/**
 * A distinction's boost when the firm has not set one. classifyDistinctions
 * applies `row.boost || 5` (server/advisorEngine.js), and the create/update
 * routes clamp a firm's own value to 1–20 — so 5 is the default, not a ceiling.
 * `buildLeverSummary` reports the firm's OWN most-common value when it has rows,
 * because a firm that moved every distinction to 8 must not read "+5" on a page
 * whose entire promise is that it shows their live configuration.
 */
const DISTINCTION_DEFAULT_BOOST = 5

/**
 * What the Scenario Lab measured on 2026-08-02, with its provenance attached.
 *
 * These are PLATFORM measurements, not this firm's — 51 invented cross-domain
 * cases run through the real resolver with and without the firm-editable levers
 * (scripts/scenario-lab.js). They are on the page because they answer "is this
 * lever worth my time", which no count of the firm's own rows can answer.
 *
 * ⚠ They are stated as what they are. `basis` travels with every number so a
 * surface cannot print one as if it were the firm's own result, and so the next
 * person to re-run the lab knows exactly what to replace.
 */
const MEASURED = {
  basis: 'scenario-lab',
  caseCount: 51,
  measuredOn: '2026-08-02',
  /** Cases whose recommendation turned on the firm's logic tables alone. */
  turnedOnTablesAlone: 3,
  /** Cases whose recommendation turned on the firm's distinctions alone. */
  turnedOnDistinctionsAlone: 29,
  /**
   * Average points between the 1st and 2nd template. This is the number that
   * makes +3 and +5 meaningful — and the reason the page must never express
   * leverage as a share of score (ACTIONS: "DO NOT present leverage as
   * share-of-score"; a +3 flipped the winner at a score of 47 and at a score of 6).
   */
  averageTopTwoMargin: 3.0
}

/**
 * Most frequent boost across a firm's distinctions, so section 1 can state the
 * firm's real number. Ties fall to the lower value — a page that overstates a
 * lever is worse than one that understates it.
 * @param {Array<{boost?: number}>} rows
 * @returns {number}
 */
function _commonBoost (rows) {
  const counts = new Map()
  for (const row of rows) {
    const boost = Number(row && row.boost) || DISTINCTION_DEFAULT_BOOST
    counts.set(boost, (counts.get(boost) || 0) + 1)
  }
  if (counts.size === 0) { return DISTINCTION_DEFAULT_BOOST }
  let best = DISTINCTION_DEFAULT_BOOST
  let bestCount = -1
  for (const [boost, count] of counts) {
    if (count > bestCount || (count === bestCount && boost < best)) {
      best = boost
      bestCount = count
    }
  }
  return best
}

/**
 * Does this logic table carry any template hint at all? A table with branches
 * but no template names influences the AI's reasoning and lifts nothing in the
 * ranking — the distinction the "37 of 42 carry template hints" line draws.
 * @param {Object} tree
 * @returns {boolean}
 */
function _carriesTemplateHint (tree) {
  const nodes = Array.isArray(tree && tree.nodes)
    ? tree.nodes
    : (Array.isArray(tree && tree.branches) ? tree.branches : [])
  return nodes.some(node => Array.isArray(node && node.templates) && node.templates.length > 0)
}

/**
 * The three levers, as section 1 of the page states them, plus the quiz-bank
 * footnote. Every number is derived from the RESOLVED configuration handed in —
 * the firm's edits included — never from the platform files on disk.
 *
 * @param {Object} input
 * @param {Array<Object>} [input.domainSupportDocs] resolved domain-support rows
 * @param {Array<Object>} [input.logicTrees] resolved logic tables (nodes included)
 * @param {Array<Object>} [input.distinctions] the firm's resolved effective distinctions
 * @param {Object} [input.quizBanks] resolved banks, keyed by template title
 * @returns {Object} counts only — safe to aggregate across firms
 */
function buildLeverSummary (input) {
  const opts = input || {}
  const docs = Array.isArray(opts.domainSupportDocs) ? opts.domainSupportDocs : []
  const trees = Array.isArray(opts.logicTrees) ? opts.logicTrees : []
  const distinctions = Array.isArray(opts.distinctions) ? opts.distinctions : []
  const banks = (opts.quizBanks && typeof opts.quizBanks === 'object') ? opts.quizBanks : {}

  const bankKeys = Object.keys(banks).filter(k => !k.startsWith('_'))
  const questionCount = bankKeys.reduce((total, key) => {
    const entries = banks[key] && banks[key].entries
    return total + (Array.isArray(entries) ? entries.length : 0)
  }, 0)

  return {
    schemaVersion: SCHEMA_VERSION,
    domainSupport: {
      documents: docs.length,
      // How many the firm has actually edited. The mentor rollup's real question
      // is which blocks get used, and "29 exist" cannot answer it.
      firmEdited: docs.filter(d => d && (d.hasOverride || d.origin === 'firm')).length
    },
    logicTables: {
      tables: trees.length,
      withTemplateHints: trees.filter(_carriesTemplateHint).length,
      firmEdited: trees.filter(t => t && t.origin === 'firm').length,
      boost: TREE_HINT_BOOST
    },
    distinctions: {
      count: distinctions.length,
      // The firm's own IP specifically: rows they wrote or edited, as opposed to
      // platform rows they simply inherited.
      firmAuthored: distinctions.filter(d =>
        d && (d.source === 'firm-own' || d.source === 'firm-override')).length,
      boost: _commonBoost(distinctions)
    },
    quizBanks: {
      banks: bankKeys.length,
      questions: questionCount
    },
    measured: MEASURED
  }
}

/**
 * The near-miss answer behind router row 5: the firm's own distinctions that are
 * filed under one domain but keep matching conversations the engine recognised
 * as another. A distinction is only ever judged inside the detected domain, so
 * one filed elsewhere is not outvoted — it is never considered at all.
 *
 * Source: the cross-domain bridge the engine ALREADY computes on every session
 * (advisorEngine findNearMissDistinctions) and stores in the case's decision
 * trace. Nothing new is measured here; this counts what is already recorded.
 *
 * ⚠ HONEST LIMIT, and the caller must print it. This can only see cases the
 * advisor SHARED with the firm. Private cases are advisor-only by design (the
 * case-study visibility model), so a count of 3 means "3 of the shared cases",
 * never "3 conversations". Returned as `basisCaseCount` rather than left to be
 * inferred from a number that would otherwise read as the whole truth.
 *
 * ⚠ THE LIVE ROW WINS OVER THE TRACE. A case records the distinction as it was
 * worded when that session ran; the firm may have edited or deleted it since.
 * Every row is re-read from `effectiveDistinctions` and one that no longer exists
 * is DROPPED — offering "Move it to Cashflow" for a deleted distinction would
 * fail on click, and showing yesterday's wording as today's is the same
 * record-keeps-the-paraphrase failure the Save-the-Artefact rule exists for.
 *
 * @param {Array<Object>} cases the firm's shared cases, each with `decisionTrace`
 * @param {Array<Object>} [effectiveDistinctions] the firm's live resolved rows
 * @returns {{rows: Array<Object>, basisCaseCount: number, tracedCaseCount: number, staleDropped: number}}
 */
function aggregateNearMisses (cases, effectiveDistinctions) {
  const list = Array.isArray(cases) ? cases : []
  const live = new Map()
  for (const row of (Array.isArray(effectiveDistinctions) ? effectiveDistinctions : [])) {
    if (row && row.id !== null && row.id !== undefined) { live.set(String(row.id), row) }
  }
  const byKey = new Map()
  let tracedCaseCount = 0
  let staleDropped = 0

  for (const kase of list) {
    const trace = kase && kase.decisionTrace
    if (!trace) { continue }
    tracedCaseCount++
    const misses = (trace.distinctions && trace.distinctions.nearMisses) || []
    if (!Array.isArray(misses) || misses.length === 0) { continue }

    const detectedId = (trace.domain && trace.domain.id) || null
    if (!detectedId) { continue }

    for (const miss of misses) {
      if (!miss || miss.id === null || miss.id === undefined) { continue }
      const current = live.get(String(miss.id))
      if (live.size > 0 && !current) { staleDropped++; continue }

      // Keyed by the distinction AND the domain it kept reaching: the same row
      // matching two different areas is two different decisions, and collapsing
      // them would offer a move to whichever came first.
      const key = `${miss.id}::${detectedId}`
      const existing = byKey.get(key)
      if (existing) {
        existing.count++
        continue
      }
      // Where the firm filed it is read from the LIVE row when there is one: a
      // manager who already moved it must not be told again that it is misfiled.
      const filedDomain = (current && current.domain) || miss.domain || null
      if (filedDomain === detectedId) { continue }

      byKey.set(key, {
        id: miss.id,
        source: (current && current.source) || miss.source || 'firm-own',
        description: (current && current.description) || miss.description || '',
        /** Where the firm filed it — where it is doing nothing. */
        filedDomain,
        /** Where it keeps matching — where it would count. */
        matchedDomain: detectedId,
        count: 1,
        // Carried so "Copy it there" can recreate the row in the target area
        // without a second round trip. The firm's own material, no client data.
        triggers: (current && Array.isArray(current.triggers)) ? current.triggers : [],
        templates: (current && Array.isArray(current.templates)) ? current.templates : [],
        boost: (current && Number(current.boost)) || DISTINCTION_DEFAULT_BOOST
      })
    }
  }

  return {
    // Most-repeated first: the row a manager should act on is the one that has
    // cost them the most sessions, not the one whose case is newest.
    rows: [...byKey.values()].sort((a, b) => b.count - a.count),
    basisCaseCount: list.length,
    tracedCaseCount,
    /** Near-misses whose distinction has since been deleted. Reported, not hidden. */
    staleDropped
  }
}

module.exports = {
  SCHEMA_VERSION,
  MEASURED,
  DISTINCTION_DEFAULT_BOOST,
  buildLeverSummary,
  aggregateNearMisses
}
