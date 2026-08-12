'use strict'

/**
 * @file The Template Check scan — every place a logic table names a tool, checked
 *   against the templates the app can actually open.
 * @module server/utils/templateCheck
 *
 * WHY THIS EXISTS. A logic table's whole job is to tell an advisor which tool to
 * reach for. When the name it uses is not a name the catalogue answers to, the
 * advisor is sent looking for a page that will not open — and nothing announces
 * it. Two attempts to settle these names by hand have now failed for opposite
 * reasons: on 2026-08-04 twenty-seven were declared missing and the premise was
 * wrong (they were real tools under working names), and on 2026-08-05 the safety
 * net built to hold them back turned out to watch 37 of the 42 tables. This scan
 * replaces both with one list Mike can work from.
 *
 * WHAT IT DOES NOT DO. It never edits a tree and never decides anything. It
 * reports. Every verdict below is either a fact about the catalogue ("nothing is
 * called this") or an explicitly-labelled suggestion.
 *
 * TWO TREE SHAPES, DELIBERATELY. 37 tables keep their rules in `nodes`; 5 keep
 * them in `branches` (the flat Get-the-Job tables). The gate this scan reports on
 * only ever saw the first kind — see design/ACTIONS.md#gate-blind-to-flat-trees —
 * so scanning both is the point of the exercise, not a detail.
 *
 * TWO KINDS OF REFERENCE, WHICH FAIL DIFFERENTLY:
 *  - **Template list** — a formal entry in `templates` / `templates_if_unsure` /
 *    `support_templates`. These are unambiguous: the tree is declaring a tool.
 *  - **In a sentence** — a capitalised phrase inside the instruction prose. These
 *    are a guess by nature. A phrase is not a document just because it is
 *    capitalised, which is exactly why a dismissal ("Not a tool") is part of the
 *    design rather than an afterthought.
 */

const LOGIC_TREES = require('../../data/logic_trees.json')
const TEMPLATES = require('../../data/templates.json')
const { isTemplateName } = require('./logicTrees')

// The prose scanner lives in its own module because the runtime recommendation
// gate in logicTrees.js needs the identical answer to "what tools does this
// sentence name". See server/utils/toolNameScan.js for why that matters.
const { normalise, normaliseLegacy, extractProseNames } = require('./toolNameScan')

/** Below this, a suggested match is not offered at all — silence beats a bad guess. */
const CANDIDATE_MIN_SCORE = 0.6

/**
 * The four verdicts, exactly as approved by Mike on 2026-08-05.
 * @see design/mockups/logic-table-template-check.html §"Every word on this screen"
 */
const VERDICT = {
  NONE: 'none', // "Nothing matches"
  MAYBE: 'maybe', // "Probably this"
  RULED: 'ruled', // "You've ruled"
  DISMISSED: 'dismissed', // "Not a tool"
  // The mockup's fifth state, shown on its own rows rather than in the wording
  // table: a name Mike has confirmed is a real document the export does not
  // carry. Only the master-app team can close it, so it is not "ruled" — there is
  // nothing here left for him to do.
  FLAGGED: 'flagged' // "Flagged — waiting on the master team"
}

/** Where the name was found. Approved labels: "Template list" / "In a sentence". */
const WHERE = { LIST: 'list', PROSE: 'prose' }

/**
 * Build the catalogue lookup once per scan.
 *
 * @param {Array<object>} rows - templates.json records.
 * @returns {{titles: Set<string>, normalised: Map<string, object>, list: Array<object>}}
 */
function buildCatalogue (rows) {
  const list = Array.isArray(rows) ? rows.filter(r => r && r.title) : []
  const titles = new Set(list.map(r => r.title))
  const normalised = new Map()
  for (const r of list) {
    const key = normalise(r.title)
    // Titles are NOT unique in the master export ("Partner Accountability" and
    // "Quality Decisions" each appear twice). First wins for the suggestion; the
    // screen tells Mike to choose rather than choosing for him.
    if (!normalised.has(key)) { normalised.set(key, r) }
  }
  return { titles, normalised, list }
}

/**
 * Find the best catalogue title for a name the catalogue does not hold.
 *
 * Deliberately conservative. Three shapes score, in descending confidence:
 * a title that starts with the whole name ("Growth Fundamentals Framework" →
 * "Growth Fundamentals Framework Philosophy"), a title that contains it, and a
 * title sharing most of its distinctive words. Anything weaker returns null, so
 * the screen shows "Nothing matches" rather than a suggestion nobody should act
 * on — the 2026-08-04 failure was confident wrongness, not silence.
 *
 * @param {string} name - the name as written in the tree.
 * @param {object} catalogue - from buildCatalogue().
 * @returns {{title: string, score: number, why: string, summary: string}|null}
 */
function findCandidate (name, catalogue) {
  const n = normalise(name)
  if (!n) { return null }
  const words = n.split(' ').filter(w => w.length > 2)
  let best = null

  for (const row of catalogue.list) {
    const t = normalise(row.title)
    let score = 0
    let why = ''

    if (t.startsWith(n)) {
      score = 0.95
      why = 'the title starts with the exact name written in the table'
    } else if (t.includes(n)) {
      score = 0.85
      why = 'the title contains the exact name written in the table'
    } else if (n.includes(t) && t.split(' ').length >= 2) {
      score = 0.75
      why = 'the name written in the table contains this title in full'
    } else if (words.length) {
      const tWords = new Set(t.split(' '))
      const hits = words.filter(w => tWords.has(w)).length
      const ratio = hits / words.length
      if (ratio >= CANDIDATE_MIN_SCORE && hits >= 2) {
        score = 0.6 + (ratio - CANDIDATE_MIN_SCORE) * 0.2
        why = `${hits} of the ${words.length} distinctive words match`
      }
    }

    if (score >= CANDIDATE_MIN_SCORE && (!best || score > best.score)) {
      // `purpose` FIRST, and it is the only field the catalogue actually has.
      // This read was `summary || description` until 2026-08-12: neither exists
      // on any of the 291 records, so the suggestion's explanatory line resolved
      // to '' every time and the screen's `v-if="row.candidate.summary"` never
      // rendered. The element was in the approved mockup and blank from the day
      // it shipped — which is why Mike could not tell what any suggestion WAS.
      // The two old names are kept behind it so a future export that carries
      // them still works. Pinned by templateCheckCandidateText.test.js.
      best = {
        title: row.title,
        score,
        why,
        summary: String(row.purpose || row.summary || row.description || '')
      }
    }
  }
  if (best) { return best }

  // ── LAST RESORT: the same name with the spaces put differently ──────────
  // "Quickfire Diagnosis Template" is the published **Quick Fire Diagnosis**, and
  // every test above misses it: the strings differ by one space, so neither
  // contains the other, and only 0.4 of its distinctive words match against a 0.6
  // bar. Mike was shown "Nothing matches" for a document he can open.
  //
  // It runs only when the whole catalogue has already failed, which is what makes
  // it safe: it cannot outrank a spaced match, cannot change an existing
  // suggestion, and can only turn "Nothing matches" into something to look at. It
  // is scored AT the bar, never above it — this is the weakest reading offered,
  // and the screen still labels it "Probably this", not an answer.
  const dn = n.replace(/\s/g, '')
  let loose = null
  for (const row of catalogue.list) {
    const t = normalise(row.title)
    const dt = t.replace(/\s/g, '')
    if (!dt || !dn) { continue }
    const hit = dt.startsWith(dn) || dt.includes(dn) ||
      (dn.includes(dt) && t.split(' ').length >= 2)
    // Longest title wins, so a specific record beats a short generic one that
    // happens to sit inside it.
    if (hit && (!loose || dt.length > loose.length)) {
      loose = {
        title: row.title,
        score: CANDIDATE_MIN_SCORE,
        why: 'the same words, with the spaces put differently',
        summary: String(row.purpose || row.summary || row.description || ''),
        length: dt.length
      }
    }
  }
  if (!loose) { return null }
  delete loose.length
  return loose
}

/**
 * Every rule in a tree, flattened to one shape regardless of which of the two
 * layouts the tree uses. This is the function that closes the blind spot: a tree
 * is asked for `nodes` OR `branches`, never assumed to have the first.
 *
 * @param {object} tree
 * @returns {Array<{id: string, branchName: string, condition: string, prose: string, lists: object}>}
 */
function rulesOf (tree) {
  let rules = []
  if (Array.isArray(tree.nodes)) { rules = tree.nodes } else if (Array.isArray(tree.branches)) { rules = tree.branches }
  return rules.map(r => ({
    id: String(r.id || ''),
    branchName: String(r.branch_name || ''),
    condition: String(r.condition || ''),
    // `recommendation` is read deliberately. 55 branches keep their instruction
    // there and it never reaches the prompt today — design/ACTIONS.md
    // #tree-recommendation-field-dropped. "Use Risk Mgt Cover matrix to identify,
    // classify and assign strategic actions" is one of them, and a scan that
    // skipped the field would report that branch as clean.
    prose: [r.action, r.notes, r.recommendation].filter(Boolean).join('. '),
    lists: {
      templates: Array.isArray(r.templates) ? r.templates : [],
      templates_if_unsure: Array.isArray(r.templates_if_unsure) ? r.templates_if_unsure : [],
      support_templates: Array.isArray(r.support_templates) ? r.support_templates : []
    }
  }))
}

/**
 * A stable identity for one finding, so a ruling or a dismissal made today still
 * attaches to the same row tomorrow. Built from the tree, the rule and the name
 * as written — never from a row index, which changes the moment a table is edited.
 *
 * @param {string} treeId
 * @param {string} ruleId
 * @param {string} name
 * @returns {string}
 */
function findingKey (treeId, ruleId, name) {
  return `${treeId}::${ruleId}::${normalise(name)}`
}

/**
 * The same identity as `findingKey`, spelled the way it was before the
 * apostrophe fix of 2026-08-12.
 *
 * 🔴 REMOVING THIS SILENTLY UNANSWERS QUESTIONS MIKE HAS ALREADY ANSWERED. A
 * ruling is filed under the normalised name, so the moment `normalise` stopped
 * splitting `Porter's` into two words, three of his 59 rulings — Porters & Pine,
 * De Bono's 6 Hats, Deming's Theory of Volatility — no longer matched their own
 * rows and would have reappeared on his queue as unruled. That is the same fault
 * the fix was made to end, arriving by the back door.
 *
 * Read only, and only as a fallback: nothing is ever WRITTEN under this key, so
 * every new ruling lands on the current spelling and the stored file is left
 * exactly as Mike's own sessions wrote it.
 *
 * @param {string} treeId
 * @param {string} ruleId
 * @param {string} name
 * @returns {string}
 */
function legacyFindingKey (treeId, ruleId, name) {
  return `${treeId}::${ruleId}::${normaliseLegacy(name)}`
}

/**
 * Run the check across every logic table.
 *
 * @param {object} [options]
 * @param {object} [options.trees] - logic_trees.json shape; defaults to the committed file.
 * @param {Array<object>} [options.templates] - templates.json rows; defaults to the committed file.
 * @param {object} [options.rulings] - keyed by findingKey: { verdict, title, note, ruledAt }.
 *   Mike's own decisions, which always outrank what the scan worked out.
 * @returns {{counts: object, findings: Array<object>, checkedAt: null}}
 */
function runTemplateCheck (options) {
  const opts = options || {}
  const treeFile = opts.trees || LOGIC_TREES
  const trees = Array.isArray(treeFile) ? treeFile : (treeFile.trees || [])
  const catalogue = buildCatalogue(opts.templates || TEMPLATES)
  const rulings = opts.rulings || {}

  const findings = []
  let listRefs = 0
  let proseRefs = 0

  for (const tree of trees) {
    const treeId = String(tree.id || '')
    const treeName = String(tree.name || treeId)

    for (const rule of rulesOf(tree)) {
      // ── Formal references ────────────────────────────────────────────
      for (const field of Object.keys(rule.lists)) {
        for (const raw of rule.lists[field]) {
          // Prose placeholders ("a goal-setting template [...]") are guidance for
          // the AI, not references. The same predicate the runtime gate uses, so
          // the two can never disagree about what counts as a name.
          if (!isTemplateName(raw)) { continue }
          listRefs++
          if (catalogue.titles.has(raw)) { continue }
          findings.push(buildFinding(treeId, treeName, rule, raw, WHERE.LIST, field, catalogue, rulings))
        }
      }

      // ── Names written into the instruction ───────────────────────────
      const alreadyListed = new Set(
        [].concat(rule.lists.templates, rule.lists.templates_if_unsure, rule.lists.support_templates)
          .map(normalise)
      )
      for (const phrase of extractProseNames(rule.prose)) {
        const key = normalise(phrase)
        // A phrase the catalogue already answers to is not a problem, and one the
        // branch already lists formally is the same reference twice.
        if (catalogue.normalised.has(key) || alreadyListed.has(key)) { continue }
        proseRefs++
        findings.push(buildFinding(treeId, treeName, rule, phrase, WHERE.PROSE, null, catalogue, rulings))
      }
    }
  }

  return { counts: countUp(trees, findings, listRefs, proseRefs), findings }
}

/**
 * Assemble one row of the report.
 *
 * @param {string} treeId
 * @param {string} treeName
 * @param {object} rule
 * @param {string} name - as written in the tree, never normalised.
 * @param {string} where - WHERE.LIST | WHERE.PROSE
 * @param {string|null} field - which template list it came from.
 * @param {object} catalogue
 * @param {object} rulings
 * @returns {object}
 */
function buildFinding (treeId, treeName, rule, name, where, field, catalogue, rulings) {
  const key = findingKey(treeId, rule.id, name)
  // The fallback is what keeps a ruling attached to its row across the
  // normaliser change — see legacyFindingKey. Current spelling always wins.
  const legacyKey = legacyFindingKey(treeId, rule.id, name)
  const ruling = rulings[key] || (legacyKey !== key ? rulings[legacyKey] : undefined)
  const candidate = findCandidate(name, catalogue)

  // Mike's decision always wins over the scan's own reading of the same row. The
  // stored verdict is used as-is where it names one of his three decisions —
  // mapping "flagged" onto "ruled" would render a row pointing at no template.
  let verdict
  if (ruling && [VERDICT.DISMISSED, VERDICT.FLAGGED].includes(ruling.verdict)) {
    verdict = ruling.verdict
  } else if (ruling) {
    verdict = VERDICT.RULED
  } else {
    verdict = candidate ? VERDICT.MAYBE : VERDICT.NONE
  }

  return {
    key,
    treeId,
    table: treeName,
    branchName: rule.branchName,
    condition: rule.condition,
    name,
    where,
    field: field || null,
    verdict,
    candidate: verdict === VERDICT.MAYBE ? candidate : null,
    ruling: ruling || null
  }
}

/**
 * The three tiles at the top of the screen.
 *
 * @param {Array<object>} trees
 * @param {Array<object>} findings
 * @param {number} listRefs - formal references checked.
 * @param {number} proseRefs - sentence names raised.
 * @returns {object}
 */
function countUp (trees, findings, listRefs, proseRefs) {
  const live = findings.filter(f => f.verdict !== VERDICT.DISMISSED)
  return {
    tablesChecked: trees.length,
    // Both shapes, named separately: the whole reason this scan exists is that
    // the previous safety net could only see one of them.
    tablesWithNodes: trees.filter(t => Array.isArray(t.nodes)).length,
    tablesWithBranches: trees.filter(t => Array.isArray(t.branches) && !Array.isArray(t.nodes)).length,
    listReferencesChecked: listRefs,
    proseNamesRaised: proseRefs,
    unmatchedInLists: live.filter(f => f.where === WHERE.LIST).length,
    unmatchedInProse: live.filter(f => f.where === WHERE.PROSE).length,
    nothingMatches: live.filter(f => f.verdict === VERDICT.NONE).length,
    probablyThis: live.filter(f => f.verdict === VERDICT.MAYBE).length,
    youveRuled: live.filter(f => f.verdict === VERDICT.RULED).length,
    flagged: live.filter(f => f.verdict === VERDICT.FLAGGED).length,
    notATool: findings.filter(f => f.verdict === VERDICT.DISMISSED).length,
    total: live.length
  }
}

module.exports = {
  runTemplateCheck,
  findingKey,
  legacyFindingKey,
  extractProseNames,
  findCandidate,
  buildCatalogue,
  rulesOf,
  normalise,
  VERDICT,
  WHERE
}
