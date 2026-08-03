'use strict'

/**
 * @file The score sheet behind the Logic-Lab diagnostic — why a firm did not get
 *       the template it expected, and by how much it fell short.
 * @module server/utils/decisionScore
 *
 * THE BLOCKER THIS CLOSES. templateResolver already returns `matchReasons` per
 * template with the real numbers (`distinction:+5`, `tree_hint:+3`), computed on
 * every session and thrown away — no route has ever exposed them (ACTIONS
 * #logic-lab-decision-logic-build, "🔴 THE ONE BLOCKER"). This module runs the
 * REAL resolver over one sentence and publishes the part of its answer a firm is
 * allowed to see.
 *
 * NOTHING HERE WRITES, and nothing here re-implements scoring. Every number comes
 * from templateResolver via the same call an advisor session makes; a second
 * scoring implementation would be free to disagree with production, which is
 * worse than showing nothing at all.
 *
 * ── THE IP BOUNDARY IS THE FIRST CONSTRAINT (Mike, 2026-08-02) ────────────────
 * "The algorithm as a whole stays hidden — this is our IP." The page shows only
 * the blocks made editable on purpose. So the allowlist below FAILS CLOSED: a
 * reason code is hidden unless it is explicitly cleared, which means the next
 * developer who adds a scoring rule cannot leak the engine's shape by forgetting
 * to think about this file. Protected specifically: that the engine relies on
 * growth stages, the three engagement types and the Advisory Staircase, and the
 * question order.
 *
 * ── AND THE NUMBERS STILL ADD UP ─────────────────────────────────────────────
 * Everything withheld is summed into ONE published figure — "other engine
 * factors: +11" — never omitted. A score that does not add up loses the reader,
 * and a page that quietly drops points is the silent-omission failure this
 * codebase already has a rule against. The remainder is computed as
 * `score − (published points)`, so it is right by construction: it cannot drift
 * as scoring rules are added, because it is never enumerated.
 *
 * ── WHAT THIS RUN ASSUMES, AND WHY THE PAGE MUST SAY SO ──────────────────────
 * A real session gets a complexity ceiling and an engagement type from the
 * advisor's answers. A typed sentence has neither. So the run is UNRESTRICTED
 * (no staircase ceiling) and uses the domain's natural engagement, and every
 * result carries `assumptions` for the screen to print. Approved by Mike
 * 2026-08-03 as the one addition to the approved mockup: without it the page
 * shows a score sheet while hiding what it assumed to produce it.
 */

const phraseProbe = require('./phraseProbe')
const logicTrees = require('./logicTrees')
const { DOMAIN_NATURAL_ENGAGEMENT } = require('./caseState')
const { resolveTemplatesWithOutlier } = require('./templateResolver')
const { getOrgTemplates } = require('./templates')

/**
 * How many templates the score sheet lists. The expected template is ALWAYS
 * added on top of these, wherever it ranked — the mockup's sheet is two rows
 * (the winner and the one you expected) and this keeps a little context around
 * them without turning the answer into a leaderboard.
 */
const SHEET_ROWS = 5

/** The engagement type used when a domain declares none. Matches scenario-lab. */
const FALLBACK_ENGAGEMENT = 'facilitation'

/** Templates a real session would return; the sheet ranks far more than it shows. */
const DIAGNOSTIC_BUDGET = 2

/**
 * THE ALLOWLIST — the only reason codes that may ever reach a firm's screen.
 *
 * ⚠ FAILS CLOSED BY DESIGN. Adding a scoring rule to templateResolver does NOT
 * add it here. An unrecognised code is hidden and its points land in the "other
 * engine factors" remainder, which is the safe direction: the arithmetic still
 * balances and nothing new is revealed. `tests/unit/decisionScore.test.js`
 * proves it with a code that does not exist.
 *
 * Both entries are firm-editable blocks — the two levers the whole page is about:
 *   distinction:+5 / distinction:@rf-general+5 → an Advisory Distinction matched
 *   tree_hint:+3                               → a logic table pointed here
 *
 * `points` is parsed from the code itself rather than assumed, so a firm that
 * sets a distinction's boost to 8 sees 8.
 */
const PUBLISHABLE_REASONS = [
  {
    kind: 'distinction',
    // distinction:+5 and the group form distinction:@rf-industry+5
    test: /^distinction:(?:@[a-z-]+)?\+(\d+(?:\.\d+)?)$/
  },
  {
    kind: 'tree_hint',
    test: /^tree_hint:\+(\d+(?:\.\d+)?)$/
  }
]

/**
 * Split one template's reasons into what may be shown and what its points were
 * worth. Anything unmatched is deliberately dropped from the list — its value is
 * recovered by the remainder, which is derived from the total, not from here.
 *
 * @param {Array<string>} reasons the resolver's raw matchReasons
 * @returns {{published: Array<{kind: string, points: number, code: string}>, publishedPoints: number}}
 */
function publishableReasons (reasons) {
  const published = []
  let publishedPoints = 0

  for (const code of (Array.isArray(reasons) ? reasons : [])) {
    if (typeof code !== 'string') { continue }
    for (const rule of PUBLISHABLE_REASONS) {
      const hit = rule.test.exec(code)
      if (!hit) { continue }
      const points = Number(hit[1]) || 0
      published.push({ kind: rule.kind, points, code })
      publishedPoints += points
      break
    }
  }

  return { published, publishedPoints }
}

/**
 * One row of the score sheet: rank, title, the two publishable levers, and the
 * single figure standing for everything held back.
 *
 * @param {Object} entry a templateResolver scoringLog row
 * @param {number} rank 1-based position
 * @returns {Object}
 */
function buildRow (entry, rank) {
  const score = Number(entry.score) || 0
  const { published, publishedPoints } = publishableReasons(entry.matchReasons)
  return {
    rank,
    title: entry.title,
    page: entry.page,
    score: +score.toFixed(2),
    reasons: published,
    // Signed on purpose. Penalties are real (a held-back template scores below
    // its parts), and printing "+" on a negative total would be a lie about the
    // engine that the reader has no way to catch.
    otherFactors: +(score - publishedPoints).toFixed(2),
    /** Did any firm-editable lever reach this template at all? */
    hasFirmLever: published.length > 0
  }
}

/**
 * Distinction boosts for the resolver, built from the classification the probe
 * ALREADY ran. Re-classifying here would mean a second live AI call per
 * diagnosis that could disagree with the result printed directly above it on the
 * same screen.
 *
 * @param {Object} probeDistinctions the probe's `distinctions` block
 * @returns {Object<string, number>} template title → total boost
 */
function boostsFromProbe (probeDistinctions) {
  const matched = (probeDistinctions && probeDistinctions.matched) || []
  const map = {}
  for (const row of matched) {
    for (const title of (row.templates || [])) {
      map[title] = (map[title] || 0) + (Number(row.boost) || 5)
    }
  }
  return map
}

/**
 * The template names the firm's matched logic tables point at for THIS
 * situation — the same detect-then-walk a live session performs.
 *
 * ⚠ IT CALLS THE ENGINE'S OWN DETECTOR, not the probe's rows. The probe reports
 * a tree's `shape`; the engine skips on its `mode` (advisorEngine L2625). Reading
 * the probe's output here would silently include Learn-mode trees — they drive
 * the Learn path, never a client recommendation — and the sheet would then credit
 * a firm's logic table with points a live session never awards. Re-running the
 * detector is the cheaper mistake than a score sheet that disagrees with
 * production.
 *
 * @param {string|null} domain the detected domain
 * @param {string} text the advisor's words
 * @param {Object|null} firmTrees the firm's logic-tree override map
 * @returns {Array<string>}
 */
function treeHintsFor (domain, text, firmTrees) {
  const state = { detectedDomain: domain, situationDiagnostic: text }
  const names = []
  for (const tree of logicTrees.detectLogicTrees(text, firmTrees)) {
    if (tree.mode === 'learn') { continue }
    for (const name of logicTrees.walkLogicTree(state, tree.id, firmTrees)) {
      names.push(name)
    }
  }
  return names
}

/**
 * Score ONE template on its own, for a title the ranking log did not carry.
 *
 * WHY A SECOND RUN RATHER THAN A BIGGER LOG. The resolver keeps the top 20 and
 * discards anything scoring zero, and that cap is the engine's business — the
 * page must not change scoring behaviour to make itself easier to write. Running
 * the identical call over a pool of one asks the same question of the same code
 * and cannot be affected by a cap, because there is nothing to cap.
 *
 * The options MUST match the full run exactly, or the score reported here would
 * be a different number from the one the sheet above it is built on.
 *
 * @param {string} title the template the firm expected
 * @param {Array<Object>} pool the same library the full run used
 * @param {Object} caseState the same case state
 * @param {Object} strategyDecision the same strategy decision
 * @param {Object} options the same distinctionBoosts + treeHintNames
 * @returns {Object} an expected-row: scored-but-outside-the-sheet, or unscored
 */
function scoreOneTemplate (title, pool, caseState, strategyDecision, options) {
  const wanted = String(title).toLowerCase()
  const one = pool.filter(t => String(t.title).toLowerCase() === wanted)

  if (one.length > 0) {
    const solo = resolveTemplatesWithOutlier(caseState, strategyDecision, one, options)
    const entry = ((solo.primary && solo.primary.scoringLog) || [])[0]
    if (entry) {
      // Rank is genuinely unknown — it placed below the 20 the log keeps, and
      // inventing a number would be worse than saying so.
      return Object.assign(buildRow(entry, null), { outsideSheet: true })
    }
  }

  // Either the library has no such template, or it scored nothing at all. Both
  // mean no lever of the firm's reached it, and both are stated as scoring zero
  // rather than as an absence the reader has to interpret.
  return {
    rank: null,
    title,
    page: null,
    score: 0,
    reasons: [],
    otherFactors: 0,
    hasFirmLever: false,
    unscored: true,
    inLibrary: one.length > 0
  }
}

/**
 * Run one sentence through the real engine and explain the ranking.
 *
 * @param {Object} input
 * @param {string} input.text the advisor's words, as typed
 * @param {string} [input.expectedTitle] the template the firm expected
 * @param {Object|null} [input.firmTrees] the firm's logic-tree overrides
 * @param {Array<Object>} [input.distinctionRows] the firm's effective distinctions
 * @param {Array<Object>} [input.firmTemplates] the firm's imported template library
 * @returns {Promise<Object>} probe + sheet + gap + the assumptions the run made
 */
async function diagnose (input) {
  const opts = input || {}
  const text = String(opts.text || '').trim()
  const expectedTitle = opts.expectedTitle ? String(opts.expectedTitle).trim() : null

  // Layer 1 — what the engine made of the words. Real, and the same route the
  // page shows above the sheet, so the two halves can never disagree.
  const probe = await phraseProbe.probeText(text, opts.firmTrees || null, opts.distinctionRows || [])
  const domain = (probe.domains && probe.domains.length > 0) ? probe.domains[0].id : null

  if (!domain) {
    // Scoring happens inside a domain. With none recognised there is no ranking
    // to explain — said plainly rather than shown as an empty table, which would
    // read as "no template suited you".
    return {
      probe,
      scored: false,
      reason: 'noDomain',
      sheet: [],
      expected: null,
      gap: null,
      assumptions: null
    }
  }

  const problemSignals = {}
  for (const signal of (probe.signals || [])) { problemSignals[signal.name] = signal.count }

  const distinctionBoosts = boostsFromProbe(probe.distinctions)
  const treeHintNames = treeHintsFor(domain, text, opts.firmTrees || null)

  const engagementType = DOMAIN_NATURAL_ENGAGEMENT[domain] || FALLBACK_ENGAGEMENT
  const caseState = {
    domain,
    primaryIssue: '',
    industry: null,
    solutionCategories: [domain],
    // Null, so no staircase ceiling blocks anything: a typed sentence carries no
    // advisor range. Declared in `assumptions` below.
    complexityCeiling: null,
    client: {},
    advisor: {},
    problemSignals
  }
  const strategyDecision = { engagementType, templateBudget: DIAGNOSTIC_BUDGET }

  const pool = getOrgTemplates(null, opts.firmTemplates || null)
  const resolved = resolveTemplatesWithOutlier(caseState, strategyDecision, pool, {
    distinctionBoosts,
    treeHintNames
  })
  const log = (resolved.primary && resolved.primary.scoringLog) || []

  const sheet = log.slice(0, SHEET_ROWS).map((entry, i) => buildRow(entry, i + 1))

  // The expected template, wherever it landed — the row that turns "here is what
  // happened" into "here is how far short you were".
  let expected = null
  if (expectedTitle) {
    const at = log.findIndex(e => String(e.title).toLowerCase() === expectedTitle.toLowerCase())
    if (at > -1) {
      expected = buildRow(log[at], at + 1)
      if (at >= SHEET_ROWS) { sheet.push(expected) }
    } else {
      // ⚠ ABSENT FROM THE LOG DOES NOT MEAN UNSCORED, and reporting it that way
      // was a real defect (found by Mike, 2026-08-03). `scoringLog` is capped at
      // the top 20 (templateResolver L622) and drops anything scoring zero — so a
      // template missing from it either scored NOTHING or merely placed 21st.
      // Those are different problems with different fixes, and telling a firm the
      // engine "did not rank it at all" when it scored is exactly the confident
      // half-truth this page exists to remove.
      expected = scoreOneTemplate(expectedTitle, pool, caseState, strategyDecision, {
        distinctionBoosts,
        treeHintNames
      })
    }
  }

  // The gap is now computable in every case, because the expected template
  // always carries a real score — including zero. Before the 2026-08-03 fix an
  // unfound title produced a null score and the gap silently disappeared, which
  // removed the one number the whole section exists to state.
  const top = sheet.length > 0 ? sheet[0] : null
  const gap = (top && expected && typeof expected.score === 'number')
    ? +(top.score - expected.score).toFixed(2)
    : null

  return {
    probe,
    scored: true,
    reason: null,
    domain,
    sheet,
    expected,
    gap,
    // Printed by the page. The run had to fill in what a real session asks the
    // advisor for, and a sheet that hides its own inputs is not evidence.
    //
    // ⚠ WHAT IT DELIBERATELY DOES NOT NAME. The two things filled in here are the
    // staircase ceiling and the engagement type, and both are protected IP (Mike,
    // 2026-08-02: the page must not reveal that the engine relies on the growth
    // stages, the three engagement types, the Advisory Staircase, or the question
    // order). So the flag says a sentence alone was used and the ranking can
    // therefore differ — the limit is stated in full, the mechanism is not.
    assumptions: {
      fromSentenceOnly: true,
      templatesConsidered: pool.length
    }
  }
}

module.exports = {
  diagnose,
  publishableReasons,
  buildRow,
  boostsFromProbe,
  treeHintsFor,
  scoreOneTemplate,
  PUBLISHABLE_REASONS,
  SHEET_ROWS
}
