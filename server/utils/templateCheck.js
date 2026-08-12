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
 * How many below-the-bar records are shown under "Weaker matches".
 * @see design/mockups/template-check-evidence-row.html §2 — "Up to three, marked weak".
 */
const WEAK_MAX = 3

/**
 * Neighbouring branch text is cut at this length. The mini-table is read at a
 * glance while deciding one row; a cell that runs to a paragraph is a row nobody
 * reads, which is the same reason Mike ruled it to one branch above and below.
 */
const NEIGHBOUR_TEXT_MAX = 200

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
 * Score one catalogue record against a name as written in a tree.
 *
 * Deliberately conservative. Three shapes score above the bar, in descending
 * confidence: a title that starts with the whole name ("Growth Fundamentals
 * Framework" → "Growth Fundamentals Framework Philosophy"), a title that contains
 * it, and a title sharing most of its distinctive words. Anything weaker scores
 * zero and is never suggested, so the screen shows "Nothing matches" rather than
 * a suggestion nobody should act on — the 2026-08-04 failure was confident
 * wrongness, not silence.
 *
 * `weakScore` is the one addition, and it changes nothing about what is
 * suggested: a record sharing at least one distinctive word carries its ratio
 * there so "Weaker matches" can show the closest the catalogue has. It is never
 * read by `findCandidate`, and a weak record can never become a suggestion.
 *
 * @param {string} n - the normalised name.
 * @param {Array<string>} words - its distinctive words (3+ letters).
 * @param {object} row - one catalogue record.
 * @returns {{score: number, why: string, weakScore: number}}
 */
function scoreRow (n, words, row) {
  const t = normalise(row.title)

  if (t.startsWith(n)) {
    return { score: 0.95, why: 'the title starts with the exact name written in the table', weakScore: 0 }
  }
  if (t.includes(n)) {
    return { score: 0.85, why: 'the title contains the exact name written in the table', weakScore: 0 }
  }
  if (n.includes(t) && t.split(' ').length >= 2) {
    return { score: 0.75, why: 'the name written in the table contains this title in full', weakScore: 0 }
  }
  if (words.length) {
    const tWords = new Set(t.split(' '))
    const hits = words.filter(w => tWords.has(w)).length
    const ratio = hits / words.length
    if (ratio >= CANDIDATE_MIN_SCORE && hits >= 2) {
      return {
        score: 0.6 + (ratio - CANDIDATE_MIN_SCORE) * 0.2,
        why: `${hits} of the ${words.length} distinctive words match`,
        weakScore: 0
      }
    }
    if (hits >= 1) {
      // Below the bar. Shown only under "Weaker matches", and worded as the
      // mockup words it — "1 of 3 words" — not as a match.
      return { score: 0, why: `${hits} of the ${words.length} words`, weakScore: ratio }
    }
  }
  return { score: 0, why: '', weakScore: 0 }
}

/**
 * One candidate as the screen shows it.
 *
 * `summary` reads `purpose` FIRST, and it is the only field the catalogue
 * actually has. This read was `summary || description` until 2026-08-12: neither
 * exists on any of the 291 records, so the suggestion's explanatory line resolved
 * to '' every time and the screen's `v-if="row.candidate.summary"` never
 * rendered. The element was in the approved mockup and blank from the day it
 * shipped — which is why Mike could not tell what any suggestion WAS. The two old
 * names are kept behind it so a future export that carries them still works.
 * Pinned by templateCheckCandidateText.test.js.
 *
 * @param {object} row - the catalogue record.
 * @param {number} score
 * @param {string} why
 * @returns {{title: string, score: number, why: string, summary: string}}
 */
function candidateOf (row, score, why) {
  return {
    title: row.title,
    score,
    why,
    summary: String(row.purpose || row.summary || row.description || '')
  }
}

/**
 * Where a template sits in the master app, as "Section › Sub-section".
 *
 * Shown beside every candidate title because two records can share almost the
 * same name and differ only in where they live.
 *
 * @param {object} row - the catalogue record.
 * @returns {string}
 */
function sectionPath (row) {
  return [row.section, row.subSection].filter(Boolean).join(' › ')
}

/**
 * The last-resort space-insensitive pass, run only when the whole catalogue has
 * already failed on score.
 *
 * "Quickfire Diagnosis Template" is the published **Quick Fire Diagnosis**, and
 * every test in `scoreRow` misses it: the strings differ by one space, so neither
 * contains the other, and only 0.4 of its distinctive words match against a 0.6
 * bar. Mike was shown "Nothing matches" for a document he can open.
 *
 * Running last is what makes it safe: it cannot outrank a spaced match, cannot
 * change an existing suggestion, and can only turn "Nothing matches" into
 * something to look at. It is scored AT the bar, never above it — this is the
 * weakest reading offered, and the screen still labels it "Probably this", not an
 * answer.
 *
 * @param {string} n - the normalised name.
 * @param {object} catalogue - from buildCatalogue().
 * @returns {{title: string, score: number, why: string, summary: string}|null}
 */
function looseCandidate (n, catalogue) {
  const dn = n.replace(/\s/g, '')
  let loose = null
  let longest = 0
  for (const row of catalogue.list) {
    const t = normalise(row.title)
    const dt = t.replace(/\s/g, '')
    if (!dt || !dn) { continue }
    const hit = dt.startsWith(dn) || dt.includes(dn) ||
      (dn.includes(dt) && t.split(' ').length >= 2)
    // Longest title wins, so a specific record beats a short generic one that
    // happens to sit inside it.
    if (hit && (!loose || dt.length > longest)) {
      loose = candidateOf(row, CANDIDATE_MIN_SCORE, 'the same words, with the spaces put differently')
      longest = dt.length
    }
  }
  return loose
}

/**
 * Every catalogue record worth putting in front of Mike for one name, best first.
 *
 * The suggestion itself is unchanged — `best` is exactly what `findCandidate`
 * has always returned. What is new is everything BELOW it: the alternatives that
 * scored near it, and, where nothing scored at all, the closest the catalogue has
 * marked plainly as weak. Both were drawn in
 * design/mockups/template-check-evidence-row.html, §1 and §2, and exist because a
 * suggestion that hides its rivals is how "Lite Fundamentals Data" was offered a
 * framework about winning engagements: the higher-scoring title won on spelling,
 * and the right document was never on screen to be compared.
 *
 * @param {string} name - the name as written in the tree.
 * @param {object} catalogue - from buildCatalogue().
 * @returns {{best: object|null, candidates: Array<object>}} candidates carry
 *   `weak`, `path` and `summary` and are ordered best first.
 */
function rankCandidates (name, catalogue) {
  const n = normalise(name)
  if (!n) { return { best: null, candidates: [] } }
  const words = n.split(' ').filter(w => w.length > 2)

  const scored = []
  const weak = []
  for (const row of catalogue.list) {
    const s = scoreRow(n, words, row)
    if (s.score >= CANDIDATE_MIN_SCORE) {
      scored.push(Object.assign(candidateOf(row, s.score, s.why), { path: sectionPath(row) }))
    } else if (s.weakScore > 0) {
      weak.push(Object.assign(candidateOf(row, s.weakScore, s.why), { path: sectionPath(row), weak: true }))
    }
  }

  // Stable sort, so equal scores keep catalogue order and the FIRST of them is
  // the suggestion — the same record `findCandidate` picked when it kept only a
  // strictly-higher score.
  scored.sort((a, b) => b.score - a.score)
  weak.sort((a, b) => b.score - a.score)

  let best = scored.length ? scored[0] : null
  if (!best) {
    const loose = looseCandidate(n, catalogue)
    if (loose) {
      const row = catalogue.list.find(r => r.title === loose.title)
      best = Object.assign(loose, { path: row ? sectionPath(row) : '' })
      scored.push(best)
    }
  }

  // A candidate is drawn as weak when it is below the bar, or when it scores
  // under the suggestion — the two cases the mockup styles identically, because
  // both mean "here for comparison, not being proposed".
  const strong = scored.slice(0, 4).map(c => Object.assign({}, c, { weak: best ? c.score < best.score : true }))
  return { best, candidates: strong.concat(weak.slice(0, WEAK_MAX)) }
}

/**
 * Find the best catalogue title for a name the catalogue does not hold.
 *
 * Kept as the single answer to "what would the screen suggest here", used by the
 * scan, the patch builder and the tests. Behaviour is unchanged by the candidate
 * list built around it.
 *
 * @param {string} name - the name as written in the tree.
 * @param {object} catalogue - from buildCatalogue().
 * @returns {{title: string, score: number, why: string, summary: string}|null}
 */
function findCandidate (name, catalogue) {
  const { best } = rankCandidates(name, catalogue)
  if (!best) { return null }
  // `path` belongs to the evidence panel, not to the suggestion contract this
  // function has always returned.
  const { title, score, why, summary } = best
  return { title, score, why, summary }
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
 * Cut a neighbouring branch's text to something readable at a glance.
 *
 * @param {string} s
 * @returns {string}
 */
function clip (s) {
  const t = String(s || '').trim()
  return t.length > NEIGHBOUR_TEXT_MAX ? `${t.slice(0, NEIGHBOUR_TEXT_MAX - 1)}…` : t
}

/**
 * The sentence a name was written in.
 *
 * The screen showed a branch title and a bare name and never this — which is
 * what Mike was describing on 2026-08-12: *"it's too hard to tell what's required
 * since it doesn't indicate against the json search content script."* The whole
 * instruction is returned when no single sentence contains the name, because
 * showing the surrounding text is the point and showing nothing is the fault.
 *
 * @param {string} prose - the branch's instruction text.
 * @param {string} name - the name as written.
 * @returns {string}
 */
function sentenceWith (prose, name) {
  const text = String(prose || '').trim()
  if (!text || !name) { return text }
  const parts = text.match(/[^.!?]+[.!?]*/g) || [text]
  const needle = String(name).toLowerCase()
  const hit = parts.find(p => p.toLowerCase().includes(needle))
  return (hit || text).trim()
}

/**
 * Every branch of this table whose template lists name the same tool.
 *
 * A formal reference has no sentence around it, so what stands in for the
 * evidence is which branches are asking for the document.
 * @see design/mockups/template-check-evidence-row.html §1.
 *
 * @param {Array<object>} rules - from rulesOf().
 * @param {string} name - the name as written.
 * @returns {Array<string>} branch names, in table order.
 */
function branchesNaming (rules, name) {
  const key = normalise(name)
  return rules
    .filter(r => []
      .concat(r.lists.templates, r.lists.templates_if_unsure, r.lists.support_templates)
      .some(v => normalise(v) === key))
    .map(r => r.branchName)
    .filter(Boolean)
}

/**
 * The branch among its neighbours — one above and one below.
 *
 * 🔴 Ruled by Mike, 2026-08-12: *"just neighbouring branches - 1 above and below
 * when possible."* **"When possible" is why nothing is padded here**: the first
 * branch of a table has nothing above it and the last has nothing below, so those
 * rows return two entries rather than three. Drawing a blank row would suggest
 * something was hidden.
 *
 * @param {Array<object>} rules - from rulesOf().
 * @param {number} index - the position of this branch.
 * @returns {Array<{ruleId: string, branchName: string, condition: string, then: string, state: string, title: string}>}
 */
function neighboursOf (rules, index) {
  const out = []
  for (let i = index - 1; i <= index + 1; i++) {
    if (i < 0 || i >= rules.length) { continue }
    const r = rules[i]
    out.push({
      ruleId: r.id,
      branchName: r.branchName,
      condition: clip(r.condition),
      then: clip(r.prose),
      // 'here' is this row; the other two are filled in once every finding is
      // known — a branch's state depends on rows other than this one.
      state: i === index ? 'here' : 'settled',
      verdict: '',
      title: ''
    })
  }
  return out
}

/**
 * Fill in what each neighbouring branch's own names came to.
 *
 * Runs after the whole scan because the answer is about OTHER rows: a branch is
 * settled when every name it uses has been answered, and that is only knowable
 * once all of them have been built. The example this exists for: `Decision
 * Workpaper` is answerable only from the branch above it, which is already ruled
 * to **FM Board White Paper** — two names sharing no words, so no matcher will
 * ever join them.
 *
 * @param {Array<object>} findings - every finding from this scan.
 * @returns {void} findings are annotated in place.
 */
function attachNeighbourState (findings) {
  const byRule = new Map()
  for (const f of findings) {
    const k = `${f.treeId}::${f.ruleId}`
    if (!byRule.has(k)) { byRule.set(k, []) }
    byRule.get(k).push(f)
  }

  for (const f of findings) {
    for (const n of f.neighbours) {
      if (n.state === 'here') { continue }
      const rows = byRule.get(`${f.treeId}::${n.ruleId}`) || []
      // A branch naming nothing the catalogue cannot open raises no rows at all,
      // and is settled for the same reason.
      const open = rows.filter(r => r.verdict === VERDICT.NONE || r.verdict === VERDICT.MAYBE)
      if (open.length) {
        n.state = 'open'
        n.verdict = open[0].verdict
        n.title = open[0].name
        continue
      }
      const titles = [...new Set(rows
        .filter(r => r.ruling && r.ruling.title)
        .map(r => r.ruling.title))]
      n.title = titles.length === 1 ? titles[0] : ''
    }
  }
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

    const rules = rulesOf(tree)
    for (let index = 0; index < rules.length; index++) {
      const rule = rules[index]
      const place = { rules, index }

      // ── Formal references ────────────────────────────────────────────
      for (const field of Object.keys(rule.lists)) {
        for (const raw of rule.lists[field]) {
          // Prose placeholders ("a goal-setting template [...]") are guidance for
          // the AI, not references. The same predicate the runtime gate uses, so
          // the two can never disagree about what counts as a name.
          if (!isTemplateName(raw)) { continue }
          listRefs++
          if (catalogue.titles.has(raw)) { continue }
          findings.push(buildFinding(treeId, treeName, rule, raw, WHERE.LIST, field, catalogue, rulings, place))
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
        findings.push(buildFinding(treeId, treeName, rule, phrase, WHERE.PROSE, null, catalogue, rulings, place))
      }
    }
  }

  // Whether a neighbouring branch is settled depends on rows built elsewhere in
  // this loop, so it can only be answered once the loop has finished.
  attachNeighbourState(findings)

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
 * @param {{rules: Array<object>, index: number}} place - the branch's position in
 *   its own table, which is what the evidence panel is built from.
 * @returns {object}
 */
function buildFinding (treeId, treeName, rule, name, where, field, catalogue, rulings, place) {
  const key = findingKey(treeId, rule.id, name)
  // The fallback is what keeps a ruling attached to its row across the
  // normaliser change — see legacyFindingKey. Current spelling always wins.
  const legacyKey = legacyFindingKey(treeId, rule.id, name)
  const ruling = rulings[key] || (legacyKey !== key ? rulings[legacyKey] : undefined)
  const ranked = rankCandidates(name, catalogue)
  const candidate = ranked.best
    ? {
        title: ranked.best.title,
        score: ranked.best.score,
        why: ranked.best.why,
        summary: ranked.best.summary
      }
    : null

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
    ruleId: rule.id,
    table: treeName,
    branchName: rule.branchName,
    condition: rule.condition,
    name,
    where,
    field: field || null,
    verdict,
    candidate: verdict === VERDICT.MAYBE ? candidate : null,
    ruling: ruling || null,

    // ── The evidence, added 2026-08-12 ────────────────────────────────
    // Everything below is what the row is JUDGED from, and it is attached to
    // every row regardless of verdict: a ruling is reversible, and a row being
    // re-opened needs the same evidence as one being answered for the first
    // time. Design: design/mockups/template-check-evidence-row.html and
    // design/mockups/template-check-table-context.html.
    sentence: where === WHERE.PROSE ? sentenceWith(rule.prose, name) : '',
    listedIn: where === WHERE.LIST
      ? { field: field || '', branches: branchesNaming(place.rules, name) }
      : null,
    // Every candidate, not just the suggestion — including, where nothing
    // scored, the closest the catalogue has, marked weak.
    candidates: ranked.candidates,
    neighbours: neighboursOf(place.rules, place.index),
    // How many branches the whole table has, so the row can say how much of it is
    // being shown. Three of eight is context; three of three is the whole table,
    // and the note should not claim otherwise.
    tableBranches: place.rules.length
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
  rankCandidates,
  sentenceWith,
  branchesNaming,
  neighboursOf,
  buildCatalogue,
  rulesOf,
  normalise,
  VERDICT,
  WHERE
}
