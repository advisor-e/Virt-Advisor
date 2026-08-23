/**
 * Logic tree loader and formatter — CommonJS version for the Restify backend.
 * Loads data/logic_trees.json and provides detection + formatting for prompt injection.
 *
 * Usage:
 *   const { detectLogicTree, formatLogicTreeForPrompt } = require('./utils/logicTrees')
 *
 *   const tree = detectLogicTree(firstMessage)           // returns tree object or null
 *   const block = formatLogicTreeForPrompt(tree)         // returns formatted string for context
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')
const masterExport = require('./masterExport')
const { mergeEntry } = require('./firmContent')
const { fenceUntrusted } = require('./promptSafety')
const { normalise, extractProseNames } = require('./toolNameScan')
const { formatGuideForPrompt, GUIDE_BY_ID } = require('./methodGuides')

let _trees = null
const _refCache = new Map()

function loadReferenceFile (filename) {
  if (_refCache.has(filename)) { return _refCache.get(filename) }
  const filePath = resolve(process.cwd(), 'data/' + filename)
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'))
    _refCache.set(filename, data)
    return data
  } catch (err) {
    console.error('[logicTrees] Failed to load ' + filename + ':', err.message)
    _refCache.set(filename, null)
    return null
  }
}

// ── Template availability gate ─────────────────────────────────────────────
// A tree may legitimately DECLARE a template the catalogue does not carry yet.
// The source logic tables in `Logic Tables/` name tools in their THEN column
// ("THEN deploy the Risk Mgt Cover matrix") that the master export has not
// published under that title — see design/TREE-RECOMMENDATION-REVIEW.md.
// Declaring the name keeps the tree faithful to its source PDF; this gate stops
// it reaching the AI until the catalogue actually has it, so an advisor is never
// sent looking for a page they cannot open. When the export catches up, the name
// starts flowing with no edit to the tree or to this file.

/**
 * Is this string a template NAME, as opposed to a deliberate prose placeholder?
 *
 * Trees carry descriptive stand-ins where no single tool fits — e.g.
 * "a goal-setting template [Planning — tags: goals, targets…]". Those are
 * guidance for the AI, not references, and must pass through untouched: 18 of
 * them are live today. Shared by the startup ghost check and the runtime gate so
 * the two can never disagree about what counts as a reference.
 *
 * @param {*} name
 * @returns {boolean} true when `name` should be checked against the catalogue
 */
function isTemplateName (name) {
  return Boolean(name) && typeof name === 'string' && name.length < 80 &&
    !name.startsWith('[') && !name.startsWith('a ')
}

let _catalogueTitles = null

/**
 * Titles the running app can actually serve, from data/templates.json — the
 * tracked mirror the app reads (NOT the raw export, which is gitignored and
 * absent on a fresh clone / CI).
 * @returns {Set<string>} empty set when the catalogue cannot be read
 */
function catalogueTitles () {
  if (_catalogueTitles) { return _catalogueTitles }
  const rows = loadReferenceFile('templates.json')
  _catalogueTitles = new Set(
    Array.isArray(rows) ? rows.map(r => r && r.title).filter(Boolean) : []
  )
  return _catalogueTitles
}

/**
 * Split declared template names into those the catalogue can serve and those it
 * cannot yet.
 *
 * FAIL-SAFE: if the catalogue is missing or unreadable the set is empty, and
 * withholding on that basis would strip EVERY template from EVERY prompt — a far
 * worse failure than naming an unavailable one. So an empty catalogue passes
 * everything through and says so loudly, rather than silently muting the engine.
 *
 * @param {Array<string>} names
 * @returns {{available: Array<string>, withheld: Array<string>}}
 */
function splitByAvailability (names) {
  const list = Array.isArray(names) ? names : []
  const titles = catalogueTitles()
  if (titles.size === 0) {
    console.error('[logicTrees] WARNING: template catalogue unavailable — availability gate disabled, all declared templates will be emitted')
    return { available: list, withheld: [] }
  }
  const available = []
  const withheld = []
  for (const name of list) {
    if (!isTemplateName(name) || titles.has(name)) { available.push(name) } else { withheld.push(name) }
  }
  return { available, withheld }
}

let _catalogueKeys = null

/**
 * The same titles as `catalogueTitles`, normalised for comparison against a name
 * as it was written into a sentence. Prose is written by hand and punctuated
 * ("De Bono's 6 Hats"), so an exact-string match is the wrong test here — it is
 * the right one for a template LIST, where the name is a deliberate reference.
 *
 * The normaliser is the Template Check screen's own, shared rather than copied,
 * so a name the screen reports as resolved is a name this gate lets through.
 *
 * @returns {Set<string>} empty set when the catalogue cannot be read
 */
function catalogueKeys () {
  if (_catalogueKeys) { return _catalogueKeys }
  _catalogueKeys = new Set([...catalogueTitles()].map(normalise))
  return _catalogueKeys
}

/**
 * An instruction, cut down to the sentences that name no tool the advisor cannot
 * open.
 *
 * WHY A SENTENCE AND NOT THE WHOLE FIELD. These instructions carry more than the
 * tool name — "Use Business Purchase Assessment 1 as the primary tool. If the
 * business is scaling, add Stock Policies to document reorder rules" is two
 * separate pieces of advice. Dropping the field whole to suppress one unresolved
 * name would throw away coaching that has nothing wrong with it, which is the
 * thing Mike ruled on 2026-08-04: hold back the template recommendation, keep the
 * coaching.
 *
 * ⚠ SEGMENTS ARE COARSER THAN THE SCANNER'S OWN SENTENCE SPLIT, deliberately. The
 * scanner also breaks at a spaced dash; this does not. That can only ever withhold
 * MORE text than strictly necessary — never less — because a name inside a coarse
 * segment is still found when that segment is scanned. Erring toward silence is
 * the whole point of the gate.
 *
 * ⚠ A NAME THE BRANCH ALREADY LISTS FORMALLY IS NOT EXEMPT, which is where this
 * departs from the Template Check screen. The screen skips those to avoid
 * reporting one reference twice; this gate is protecting an advisor, and a name
 * sitting in an unavailable `templates[]` entry is exactly the name
 * `splitByAvailability` has already withheld from the Templates line. Letting the
 * sentence say it anyway would put back what the sibling gate just removed.
 *
 * @param {string} text - the instruction as written in the tree
 * @returns {string} the surviving sentences, or '' when none survive
 */
function withholdUnavailableNames (text) {
  const s = String(text || '')
  if (!s.trim()) { return '' }

  const titles = catalogueKeys()
  if (titles.size === 0) {
    // FAIL-SAFE, AND IT POINTS THE OPPOSITE WAY TO `splitByAvailability` ON
    // PURPOSE. There, an unreadable catalogue must not withhold, because doing so
    // would strip every template from every prompt and mute the engine. Here,
    // withholding restores exactly the behaviour of every build before this one —
    // the field was never emitted at all — so it costs nothing that was not
    // already being lost, and it cannot name a tool nobody can open.
    console.error('[logicTrees] WARNING: template catalogue unavailable — instruction text withheld rather than risk naming a tool the advisor cannot open')
    return ''
  }

  const kept = []
  for (const segment of s.match(/[^.:;!?]+[.:;!?]*\s*/g) || []) {
    const unresolved = extractProseNames(segment).filter(name => !titles.has(normalise(name)))
    if (unresolved.length === 0) { kept.push(segment) }
  }
  return kept.join('').trim()
}

// ── Ghost reference validation ─────────────────────────────────────────────
// Runs once on first load. Logs all logic tree template references that do not
// exist in the search content (source of truth). These are dead links — when a
// tree walks to one, the system silently returns a non-existent name and Phase 3
// AI fabricates a recommendation for a template the advisor cannot find.
//
// Set VA_STRICT_CONTENT=true to hard-exit on any ghost reference (for CI/CD).
// Without the flag, ghosts are logged as errors but the app continues.
function validateLogicTreeReferences (trees) {
  // Discover the newest master export (in Central Frameworks/) via the shared
  // helper — do NOT hardcode a filename, which silently goes stale after the next
  // re-export and disables this whole ghost-reference check. Returns null on a
  // fresh clone / CI where the gitignored export is absent.
  const searchContent = masterExport.loadLatestSearchContent()

  if (!Array.isArray(searchContent)) {
    console.error('[logicTrees] WARNING: Cannot validate ghost references — search content unavailable or invalid')
    return []
  }

  const validTitles = new Set(searchContent.map(t => t.title))
  const ghosts = []

  // A reference is a ghost when it is a real template-name-shaped string (not a
  // `[placeholder]` or prose fragment) that matches no search-content title.
  const isGhost = name =>
    name && typeof name === 'string' && name.length < 80 &&
    !name.startsWith('[') && !name.startsWith('a ') &&
    !validTitles.has(name)

  const collectGhosts = (templates) => {
    for (const name of (templates || [])) {
      if (isGhost(name) && !ghosts.includes(name)) { ghosts.push(name) }
    }
  }

  // ONLY client-delivery (node) trees are validated against the search content:
  // their templates ARE client recommendations, so a dead link becomes a real AI
  // hallucination. flat_if_then (Get-the-Job) trees are DELIBERATELY NOT scanned
  // here — they are Learn-mode-only (design §2.5) and their `branches[].templates`
  // reference advisor-kit / framework materials that legitimately do not live in the
  // client search JSON (provenance rule: a ref is valid if in the search JSON OR
  // named in the source PDFs — and the PDFs are not machine-readable here). Checking
  // those branches against the search content false-positives every legitimate kit
  // reference, so it is intentionally out of scope. See design/ACTIONS.md.
  for (const tree of trees) {
    for (const node of (tree.nodes || [])) { collectGhosts(node.templates) }
  }

  if (ghosts.length > 0) {
    console.error(`[logicTrees] GHOST REFERENCES DETECTED (${ghosts.length}): logic trees reference template names that do not exist in search content. These produce AI hallucinations.`)
    ghosts.forEach(g => console.error(`  ghost: "${g}"`))
    if (process.env.VA_STRICT_CONTENT === 'true') {
      process.stderr.write('\n[STARTUP ERROR] VA_STRICT_CONTENT is enabled. Fix ghost references before starting.\n\n')
      process.exit(1)
    }
  }

  // Returned for tests/callers; loadLogicTrees ignores it (side-effect logging is
  // the production contract). Empty array = no ghosts found.
  return ghosts
}

function loadLogicTrees () {
  if (_trees) { return _trees }
  const filePath = resolve(process.cwd(), 'data/logic_trees.json')
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'))
    _trees = data.trees || []
  } catch (err) {
    console.error('[logicTrees] Failed to load logic_trees.json:', err.message)
    _trees = []
  }
  try { validateLogicTreeReferences(_trees) } catch (e) {}
  return _trees
}

/**
 * The tree list the CURRENT REQUEST should see: the cached platform base with
 * the firm's per-tree overrides (if any) merged in — Phase 0 of
 * design/FIRM-EDITABLE-TABLES-PLAN.md §3. Overrides apply to EXISTING tree ids
 * only; adding whole new trees is the Phase 3 scope decision. With no override
 * the base array is returned as-is (zero cost, zero behaviour change). Merged
 * copies are built fresh per call and never written back into _trees — that is
 * the cross-firm isolation guarantee.
 * @param {Object|null} firmTrees - the firm's override map, keyed by tree id
 *   (loadFirmLogicTrees), or null
 * @returns {Array<Object>}
 */
function effectiveTrees (firmTrees) {
  const base = loadLogicTrees()
  if (!firmTrees || typeof firmTrees !== 'object' || Array.isArray(firmTrees)) { return base }
  return base.map((tree) => {
    const override = firmTrees[tree.id]
    if (override && typeof override === 'object' && !Array.isArray(override)) {
      const merged = mergeEntry(tree, override)
      // Mark this per-request merged copy as carrying firm-authored branch text
      // so the prompt formatter fences it (formatLogicTreeForPrompt). Set on the
      // fresh merged object only — never on the shared base — and non-enumerable
      // so it can never leak into an API response or JSON. This is the single
      // point a tree becomes firm-authored, so the whole engine sees the flag
      // for free without threading it through every call site.
      Object.defineProperty(merged, '__firmAuthored', { value: true, enumerable: false, configurable: true })
      return merged
    }
    return tree
  })
}

// ── Trigger matching ───────────────────────────────────────────────────────
// A trigger must start at a WORD BOUNDARY. It may still run on into the rest of
// the word, so "workflow" catches "workflows" and "margin" catches "margins".
//
// Why this exists (2026-07-31). Matching was a raw substring test, so a short
// trigger fired inside unrelated words. `staff_performance` carries the trigger
// "HR", which matched t-HR-ee, t-HR-ough, s-HR-unk, c-HR-onic and t-HR-eshold:
// across the 51 Scenario Lab cases it fired in ELEVEN, opening the staff table
// for conversations about margins, forecasting and due diligence. "ratio" fired
// inside sepa-RATIO-n, "DD" inside a-DD-ed, "hiring" inside re-HIRING. Measured
// on the same 51 cases, the boundary rule moves 8: four from the wrong table to
// the right one (systems, sales_process, demings_volatility, conflict_meeting)
// and three from a wrong table to none.
//
// The boundary is LEADING ONLY, chosen by measurement rather than taste. A
// trailing \b as well — the "whole word" rule — reads as the tidier choice and
// is worse: it drops "margins", "benchmarked", "management reports",
// "bottlenecks", "workflows", "avoided" and "drawings", and costs one Scenario
// Lab case its correct table (systems·no documentation, matched via workflows).
//
// Node 14: no lookbehind, no named groups. All 1,005 committed triggers were
// checked for regex metacharacters (zero) and none begins with punctuation, but
// the source is firm-editable, so the pattern is escaped regardless — a firm
// typing "(" into a trigger must not throw at request time.
const _triggerRe = new Map()

/**
 * Does `trigger` appear in `lower` starting at a word boundary?
 * @param {string} lower - the message, already lowercased
 * @param {string} trigger - a single entry_trigger, any case
 * @returns {boolean}
 */
function triggerMatches (lower, trigger) {
  let re = _triggerRe.get(trigger)
  if (!re) {
    const escaped = String(trigger).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    re = new RegExp('\\b' + escaped)
    _triggerRe.set(trigger, re)
  }
  return re.test(lower)
}

/**
 * Counts how many of a tree's entry_triggers the message matches.
 * @param {Object} tree
 * @param {string} lower - the message, already lowercased
 * @returns {number}
 */
function scoreTriggers (tree, lower) {
  return (tree.entry_triggers || []).filter(trigger => triggerMatches(lower, trigger)).length
}

/**
 * Detects which logic tree (if any) best matches the advisor's opening message.
 * Scores each tree by counting how many of its entry_triggers appear in the message.
 * Returns the highest-scoring tree, or null if nothing matches. A firm override
 * that edits entry_triggers changes which tree fires FOR THAT FIRM.
 * @param {string} message
 * @param {Object|null} [firmTrees] - the firm's override map (loadFirmLogicTrees)
 */
function detectLogicTree (message, firmTrees) {
  const trees = effectiveTrees(firmTrees)
  const lower = message.toLowerCase()

  let bestMatch = null
  let bestScore = 0

  for (const tree of trees) {
    const score = scoreTriggers(tree, lower)

    if (score > bestScore) {
      bestScore = score
      bestMatch = tree
    }
  }

  return bestScore > 0 ? bestMatch : null
}

/**
 * Returns all logic trees that match the message, sorted by score descending.
 * Every tree scoring at least one trigger is returned — no arbitrary cap.
 * @param {string} message
 * @param {Object|null} [firmTrees] - the firm's override map (loadFirmLogicTrees)
 */
function detectLogicTrees (message, firmTrees) {
  const trees = effectiveTrees(firmTrees)
  const lower = message.toLowerCase()

  return trees
    .map(tree => ({
      tree,
      score: scoreTriggers(tree, lower)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ tree }) => tree)
}

/**
 * Explains WHY the detector opened what it opened: the same scoring as
 * `detectLogicTrees`, but returning each tree's score and the exact trigger
 * phrases that matched.
 *
 * Read-only — nothing here feeds a request. It exists because the trigger lists
 * are firm-editable and, until now, invisible: a firm could change which table
 * opens with no way to see the phrase that did it (design/ACTIONS.md →
 * trigger-vocabulary-sweep).
 *
 * ⚠ Its ORDERING MUST stay identical to `detectLogicTrees`, and its top row
 * identical to `detectLogicTree`'s single winner — otherwise the screen would
 * confidently explain a decision production never made. Both are locked by
 * tests/unit/phraseProbe.test.js over the whole corpus, not by spot-checks.
 * The `.sort` below relies on the same stable-sort tie behaviour as
 * `detectLogicTrees` (Array.prototype.sort is stable in Node 11+), so an
 * equal-scoring pair keeps platform file order in both.
 *
 * @param {string} message - the advisor's words
 * @param {Object|null} [firmTrees] - the firm's override map (loadFirmLogicTrees)
 * @returns {Array<{id:string,name:string,shape:string,score:number,matched:string[]}>}
 *   every tree scoring at least one trigger, highest first
 */
function explainDetection (message, firmTrees) {
  const trees = effectiveTrees(firmTrees)
  const lower = (typeof message === 'string' ? message : '').toLowerCase()

  const rows = []
  for (const tree of trees) {
    const matched = (tree.entry_triggers || []).filter(trigger => triggerMatches(lower, trigger))
    if (matched.length === 0) { continue }
    rows.push({
      id: tree.id,
      name: tree.name || tree.id,
      // Which lane the table's content reaches: a `nodes` tree is walked and its
      // templates become client recommendations; `flat_if_then` is Learn-mode
      // reference and is never walked (see formatLogicTreeForPrompt).
      shape: Array.isArray(tree.nodes) ? 'nodes' : 'flat_if_then',
      score: matched.length,
      matched
    })
  }
  rows.sort((a, b) => b.score - a.score)
  return rows
}

/**
 * Formats a single tree node into a readable text block for the AI.
 * @param {Object} node
 * @param {Array<Object>} allNodes
 * @param {boolean} [fence=false] - when true, the firm-editable free-text fields
 *   (condition, action, question, notes) are wrapped with fenceUntrusted so the
 *   model reads firm-authored text as data, not instructions. Short structural
 *   labels (branch_name) are left as-is, mirroring how domain-support fences
 *   prose but not labels. Off by default → platform output is byte-identical.
 */
function formatNodeForPrompt (node, allNodes, fence = false) {
  const lines = []
  const fx = v => (fence ? fenceUntrusted(v) : v)

  lines.push(`**[${node.branch_name}]** (${node.type})`)
  lines.push(`Condition: ${fx(node.condition)}`)

  if (node.type === 'assessment' && node.gate_question) {
    lines.push(`Gate check: ${node.gate_question}`)
  }

  if (node.action) {
    lines.push(`Action: ${fx(node.action)}`)
  }

  // `recommendation` holds the instruction on 55 branches across 8 tables, none of
  // which carry an `action` to fall back on — so for years this said nothing at
  // all and the branch looked complete, because `notes` still reached the model
  // with the background. See design/ACTIONS.md#tree-recommendation-field-dropped.
  //
  // Labelled `Action:` rather than introducing a second word for the same thing:
  // the source tables' own column is "THEN (Action / Next Step)", the model
  // already reads that label everywhere else, and no node carries both fields.
  //
  // Gated, because emitting it ungated is what made this unsafe to fix on its own
  // — a sentence here can name a tool the catalogue cannot serve yet.
  const recommendation = withholdUnavailableNames(node.recommendation)
  if (recommendation) {
    lines.push(`Action: ${fx(recommendation)}`)
  }

  if (node.question) {
    lines.push(fence ? `Ask: ${fenceUntrusted(node.question)}` : `Ask: "${node.question}"`)
  }

  if (node.sales_process) {
    lines.push(`Sales process: ${node.sales_process}`)
  }

  // Every template list is gated: a name the catalogue cannot serve yet is held
  // back rather than named to the advisor. See the availability gate above.
  const templates = splitByAvailability(node.templates).available
  if (templates.length > 0) {
    lines.push(`Templates: ${templates.join(', ')}`)
  }

  const ifUnsure = splitByAvailability(node.templates_if_unsure).available
  if (ifUnsure.length > 0) {
    lines.push(`Templates if client is unsure: ${ifUnsure.join(', ')}`)
  }

  const support = splitByAvailability(node.support_templates).available
  if (support.length > 0) {
    lines.push(`Support with: ${support[0]}`)
  }

  if (node.notes) {
    lines.push(`Notes: ${fx(node.notes)}`)
  }

  if (node.branches && node.branches.length > 0) {
    lines.push('Branches:')
    for (const branch of node.branches) {
      const targetNode = allNodes.find(n => n.id === branch.next_node)
      const targetName = targetNode ? targetNode.branch_name : branch.next_node
      lines.push(`  • If "${branch.answer_pattern}" → ${targetName}`)
    }
  }

  // Context for a choice the branch labels alone cannot support. Platform
  // content read from the reference files, so it is NOT fenced — `fence` marks
  // firm-authored tree text, and this is neither authored by a firm nor stored
  // in the tree. See DECISION_CONTEXT_FORMATTERS.
  const decisionContext = DECISION_CONTEXT_FORMATTERS[node.id]
  let hasDecisionContext = false
  if (decisionContext) {
    const block = decisionContext()
    if (block) {
      lines.push('', block)
      hasDecisionContext = true
    }
  }

  // `advisor_note` is the branch author's ruling on the choice above, and it sat
  // unread here for as long as `recommendation` did — authored, stored, and
  // emitted nowhere. Mike's, on 2026-08-16: send it.
  //
  // UNGATED, DELIBERATELY, and this is the one field that is. Run through
  // `withholdUnavailableNames` the live note survives as "This determines the
  // delivery method." and nothing else — the gate reads "use Trial Fit" and "use
  // Cautious Reveal" as tools it cannot find, when they are delivery approaches
  // and not documents an advisor could fail to open. Gating it would have looked
  // like a fix while deleting the instruction. The gate is unchanged for every
  // other field; `recommendationGate.test.js` pins this note as the only one in
  // the data, so a second one cannot arrive ungated without the build stopping.
  //
  // Fenced when the tree is firm-authored, exactly like every other node field.
  if (node.advisor_note) {
    // Blank line only when the block precedes it, matching the approved artefact
    // — the ruling reads as the close of that block, not as another bullet. On an
    // ordinary branch the note is just the next line.
    if (hasDecisionContext) { lines.push('') }
    lines.push(`Advisor note: ${fx(node.advisor_note)}`)
  }

  return lines.join('\n')
}

/**
 * Formats a single top-level branch of a `flat_if_then` tree into a readable block.
 *
 * `flat_if_then` trees (the "Get the Job" advisor-development logic) store their logic
 * as a flat list of condition→action→templates rules at `tree.branches`, NOT in `nodes`.
 * They carry no branching graph, so they are formatted as a plain if-then reference for
 * Learn-mode coaching — never walked, and never fed into the client recommendation path
 * (Get-the-Job content must not reach client templates — design §2.5).
 */
function formatFlatBranch (branch, fence = false) {
  const fx = v => (fence ? fenceUntrusted(v) : v)
  const lines = [`**[${branch.branch_name}]**`]
  if (branch.condition) { lines.push(`Condition: ${fx(branch.condition)}`) }
  if (branch.action) { lines.push(`Action: ${fx(branch.action)}`) }
  if (branch.templates && branch.templates.length > 0) {
    lines.push(`Templates: ${branch.templates.join(', ')}`)
  }
  if (branch.notes) { lines.push(`Notes: ${fx(branch.notes)}`) }
  return lines.join('\n')
}

/**
 * Formats a full logic tree into a readable text block for injection into the AI context.
 */
function formatApproachGuidance (guidance) {
  if (!guidance || guidance.length === 0) { return '' }
  const lines = ['\n### Campaign Approach — Match HOW you reach out to the relationship warmth\n']
  for (const g of guidance) {
    lines.push(`**${g.method}**`)
    lines.push(`Relationship: ${g.relationship_status}`)
    if (g.step_detail) { lines.push(`Steps: ${g.step_detail}`) }
    lines.push(`Discovery meeting style: ${g.discovery_style}`)
    lines.push('')
  }
  return lines.join('\n')
}

function formatLogicTreeForPrompt (tree) {
  if (!tree) { return '' }

  // A firm-overridden tree carries firm-authored branch text (tagged in
  // effectiveTrees); fence it so the model treats it as data, not instructions.
  const fence = !!(tree && tree.__firmAuthored)
  const fx = v => (fence ? fenceUntrusted(v) : v)

  const headerLines = [
    `## Diagnostic Logic Tree — ${tree.name}`,
    '',
    tree.description,
    ''
  ]

  // The sentence that establishes WHERE IN THE METHOD the advisor already is,
  // before any coaching starts. Authored on all 13 learn tables since they
  // shipped and read by nothing — item 4.16 C, design/LEARN-TREE-OPENING-QUESTION-FIELD.md.
  //
  // WHY IT MATTERS MORE THAN ITS SIZE SUGGESTS: these 13 are exactly the 13
  // tables with a companion method guide (LEARN_REFERENCE_FORMATTERS), and the
  // guide reaches the model in full — ~19,000 characters of staged coaching. The
  // one sentence saying which stage the advisor needs did not, so the model has
  // been reading the whole method with no idea where the advisor is standing in
  // it, and opening at stage one for somebody halfway through.
  //
  // LEARN MODE ONLY, and the gate is deliberate rather than incidental. Every one
  // of the 13 is `mode: 'learn'`; a client-delivery table is WALKED to a
  // recommendation rather than opened with a question. The gate means a
  // `stage_entry_question` authored later onto a client table cannot silently
  // start asking a business owner where they are up to.
  if (tree.mode === 'learn' && tree.stage_entry_question) {
    headerLines.push(`Ask this first, before coaching any stage: ${fx(tree.stage_entry_question)}`)
    headerLines.push('')
  }

  const header = headerLines.join('\n')

  const nodeBlocks = (tree.nodes || [])
    .map(node => formatNodeForPrompt(node, tree.nodes, fence))
    .join('\n\n')

  // flat_if_then trees keep their rules at the tree level (`tree.branches`), not in nodes.
  const flatBlocks = (tree.branches || [])
    .map(branch => formatFlatBranch(branch, fence))
    .join('\n\n')

  // Standing rules on a NODES-shaped table: rules that hold whichever stage the
  // advisor is in, so they are kept out of the walked graph in a second array.
  //
  // THIS IS WHY THEY WERE INVISIBLE. `flatBlocks` above reads `tree.branches`,
  // which on a nodes-shaped table is empty — so `public_speaking`'s two rules
  // (networking boundaries, event conclusion) reached neither the prompt nor the
  // Logic Tables screen, and no test could notice a field nothing named.
  //
  // Formatted by the SAME `formatFlatBranch` the Get-the-Job tables use, not a
  // second renderer — which also means their `templates` are emitted ungated,
  // exactly as those tables' are. That is the deliberate Get-the-Job carve-out
  // recorded at validateLogicTreeReferences: these name advisor-kit materials
  // that legitimately do not live in the client search content.
  const standing = tree.flat_branches || []
  const standingBlock = standing.length > 0
    ? '\n\n### Rules that always apply, whichever stage the advisor is in\n\n' +
      standing.map(branch => formatFlatBranch(branch, fence)).join('\n\n')
    : ''

  const approachBlock = tree.approach_guidance
    ? formatApproachGuidance(tree.approach_guidance)
    : ''

  return header + nodeBlocks + flatBlocks + standingBlock + approachBlock
}

/**
 * The short-form context for the Cautious Reveal vs Trial Fit choice.
 *
 * WHY THIS EXISTS. The `pf_awareness` branch asks the engine to pick a delivery
 * method, and until now gave it a question and two labels to pick from — no
 * reason, and no signal to read the client by. The reasoning was authored all
 * along, in the two method reference files, but it never loaded here:
 * `buildLearnReferenceText` returns null for the Profitability tree because
 * those references attach to their own learn-mode coaching trees, and a
 * profitability conversation routes to `profitability_feasibility`. The two
 * destination branches do carry some of it, but only after the choice is made
 * and only on the road already taken — the model never saw both sides while it
 * was choosing.
 *
 * Approved as design/PF-AWARENESS-DECISION-BLOCK.md, which lists every line
 * against the file and key it is read from.
 *
 * ⚠ READ, NEVER COPIED. Every sentence is pulled from the reference file that
 * owns it, so editing that file changes what the model is shown and the two
 * cannot drift. This is the failure that produced items 2.6 and 4.16 — content
 * authored in one place and quietly not used in another — so it is not repeated
 * here by transcribing the sentences into code.
 *
 * ⚠ THE SHORT FORM ONLY. The full guides are ~19,000 characters each and stay
 * attached to their own trees. This block is ~1,900 and is emitted on one branch.
 *
 * @returns {string} the block, or '' if either reference file cannot be read
 */
function formatDeliveryMethodChoiceForPrompt () {
  const tf = loadReferenceFile('trial-fit-reference.json')
  const cr = loadReferenceFile('cautious-reveal-reference.json')
  if (!tf || !cr || !tf.when_to_use || !cr.when_to_use || !cr.key_concepts) { return '' }

  const lines = [
    'Choosing the delivery method — why this choice matters',
    '',
    `Map shock: ${cr.key_concepts.map_shock}`,
    '',
    'Signs the client is AWARE / motivated (points to Trial Fit):'
  ]
  for (const indicator of (tf.when_to_use.indicators || [])) {
    lines.push(`  • ${indicator}`)
  }
  if (tf.when_to_use.caution) { lines.push(`  Caution: ${tf.when_to_use.caution}`) }

  lines.push('')
  lines.push('Signs the client is UNAWARE / resistant (points to Cautious Reveal):')
  lines.push(`  • ${cr.when_to_use.client_profile}`)
  for (const scenario of (cr.when_to_use.typical_scenarios || [])) {
    lines.push(`  • ${scenario}`)
  }
  if (cr.when_to_use.contrast_with_trial_fit) {
    lines.push(`  Contrast: ${cr.when_to_use.contrast_with_trial_fit}`)
  }

  return lines.join('\n')
}

// Nodes that make a choice the model cannot make well from the branch labels
// alone, mapped to the context it needs while making it. Keyed by node id and
// deliberately tiny: every entry grows a live prompt, so one is added only with
// an approved artefact behind it.
const DECISION_CONTEXT_FORMATTERS = {
  pf_awareness: formatDeliveryMethodChoiceForPrompt
}

// ── The thirteen method guides ───────────────────────────────────────────────
//
// 🔴 THESE THIRTEEN FUNCTIONS USED TO BE ~900 LINES OF HAND-WRITTEN FORMATTING,
// each naming the fields it emitted one by one. A field authored into the JSON
// afterwards was never mentioned again — silently. Measured 2026-08-17: **116 of
// the 954 authored lines across the thirteen reached no prompt at all**, including
// the discussion questions authored against every one of Dashboard Discussions'
// twelve metrics, and the `causes` behind each of Working Capital Cycle's three
// problem types (the symptom reached the model; the diagnosis did not).
//
// They are now one line each, over the shared walker in server/utils/methodGuides.js,
// which walks the document's own shape and therefore cannot skip a field. That
// closes the 116 as a consequence of the design rather than as thirteen patches the
// next authored field would defeat again.
//
// ⚠ DO NOT ADD A FOURTEENTH HAND-WRITTEN FORMATTER, and do not add a field to one
// of these by hand. A new guide is a row in methodGuides.GUIDES; a new field is a
// key in the JSON and needs no code at all. Adding one here is the exact pattern
// that lost the 116.
//
// They are kept as named functions because the module's public API and
// tests/unit/learnReferenceFormatters.test.js both name them, and because each
// still answers the question "does this guide's file still load?" — the silent
// failure those tests exist to catch. They take no firm overrides: a caller that
// needs a scope's edits goes through buildLearnReferenceText.

function formatTrialFitReferenceForPrompt () { return formatGuideForPrompt('trial_fit') }
function formatCautiousRevealReferenceForPrompt () { return formatGuideForPrompt('cautious_reveal') }
function formatSeminarsReferenceForPrompt () { return formatGuideForPrompt('public_speaking') }
function formatEoyReferenceForPrompt () { return formatGuideForPrompt('eoy_meeting') }
function formatHealdMatrixReferenceForPrompt () { return formatGuideForPrompt('heald_matrix') }
function formatCCOReferenceForPrompt () { return formatGuideForPrompt('capacity_capability_opportunity') }
function formatConflictMeetingReferenceForPrompt () { return formatGuideForPrompt('conflict_meeting') }
function formatGrowthCurveRevealReferenceForPrompt () { return formatGuideForPrompt('reveal_growth_curve') }
function formatFacilitationReferenceForPrompt () { return formatGuideForPrompt('facilitation_101') }
function formatDemingsVolatilityReferenceForPrompt () { return formatGuideForPrompt('demings_volatility') }
function formatWorkingCapitalCycleReferenceForPrompt () { return formatGuideForPrompt('working_capital_cycle') }
function formatRatioAnalysisReferenceForPrompt () { return formatGuideForPrompt('ratio_analysis') }
function formatDashboardDiscussionsReferenceForPrompt () { return formatGuideForPrompt('dashboard_discussions') }

/**
 * Builds the full reference text block for a given learn-mode tree.
 * Used by both learn mode (primary path) and the deep-dive offer in client/discover mode.
 * Returns a formatted string combining the tree prompt and its companion reference content,
 * or null if the tree is not a recognised learn-mode tree.
 *
 * The companion guide is resolved through the reading scope's edits (item 4.16 F):
 * the mentor's wording, then any tier below it that has reworded a line, with the
 * whole block fenced when anybody has. Called with no overrides — which is every
 * pre-existing call site until it is threaded through — it serves the platform
 * guides exactly as it always did.
 *
 * @param {Object|null} tree - a logic tree
 * @param {Object|null} [guideOverrides] - resolved method-guide override map, keyed
 *   by guide id (methodGuideConfig.loadResolvedGuideOverrides)
 * @returns {string|null}
 */
function buildLearnReferenceText (tree, guideOverrides) {
  if (!tree || tree.mode !== 'learn') { return null }

  let text = formatLogicTreeForPrompt(tree)

  if (GUIDE_BY_ID[tree.id]) {
    const ref = formatGuideForPrompt(tree.id, guideOverrides)
    if (ref) { text += '\n\n---\n\n' + ref }
  }

  // 🔴 THE PSYCHOLOGY UNDER THE DELIVERY (item 4.35, 2026-08-23). Facilitation 101
  // teaches HOW to introduce a concept; Productive Habits is why the sequence works
  // at all — how a person reacts to learning, and what turns their decision into a
  // habit afterwards. Without it the model is asked to run the protocol and left to
  // improvise the part that decides whether the client accepts the concept.
  //
  // ⚠ ONLY ON THIS TREE, deliberately. The block is ~6,000 characters; attaching it
  // to every learn tree would spend that on guides it has nothing to do with, and
  // attaching it to every client recommendation would spend it on every answer the
  // product gives. Where else it should go is Mike's call, not a default.
  if (tree.id === 'facilitation_101') {
    const habits = formatGuideForPrompt('productive_habits', guideOverrides)
    if (habits) { text += '\n\n---\n\n' + habits }
  }

  return text
}

/**
 * May this learn tree surface in a CLIENT-mode deep-dive (the mid-session "want to go
 * deeper on HOW?" offer)? Only CLIENT-DELIVERY learn trees may — skills the advisor uses
 * WITH a client. Advisor business-development trees (`section: 'get-the-job'`) and firm/
 * practice trees (`section: 'get-organised'`) must NEVER appear in a client session: the
 * same words mean the OPPOSITE thing there. "Sales / marketing / pricing" in a Get-the-Job
 * tree is the advisor selling THEIR consultancy to the owner; in a client session it is the
 * owner selling to THEIR customers. Surfacing one in the other is a category error and
 * breaches the Do-the-Job vs Get-the-Job boundary (design §2.5). Dedicated Learn mode is
 * unaffected — there the advisor has explicitly chosen to develop their own practice.
 */
function isClientDeliveryLearnTree (tree) {
  return !!tree && tree.mode === 'learn' &&
    tree.section !== 'get-the-job' && tree.section !== 'get-organised'
}

function buildSignalText (state) {
  const parts = [
    state.detectedDomain, state.industry, state.clientRaisedIssue,
    state.situationDiagnostic, state.staffScope, state.staffOrigin, state.staffCategory,
    state.salesDiagnosis, state.salesTracking, state.salesProductFit,
    state.forecastingTheme, state.dataSystemsChartAccounts, state.dataSystemsTeam,
    state.dataSystemsComplexity, state.growthStage, state.operatorDataDriven,
    state.clientMotivation, state.advisoryStaircase, state.clientPersonality
  ]
  return parts.filter(v => v && typeof v === 'string' && v !== 'pending').join(' ').toLowerCase()
}

function scorePattern (signalText, pattern) {
  if (!pattern || !signalText) { return 0 }
  const stopWords = new Set(['then', 'that', 'this', 'when', 'with', 'from', 'they', 'have', 'been', 'will', 'their', 'does', 'what'])
  const words = pattern.toLowerCase()
    .split(/[\s,/|]+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
  if (!words.length) { return 0 }
  return words.filter(w => signalText.includes(w)).length
}

function walkLogicTree (state, treeId, firmTrees) {
  const trees = effectiveTrees(firmTrees)
  const tree = trees.find(t => t.id === treeId)
  if (!tree || !tree.nodes || !tree.nodes.length) { return [] }
  const signalText = buildSignalText(state)
  const templates = new Set()
  const visited = new Set()

  function walkNode (nodeId, depth) {
    if (depth > 12 || visited.has(nodeId)) { return }
    visited.add(nodeId)
    const node = tree.nodes.find(n => n.id === nodeId)
    if (!node) { return }
    for (const t of (node.templates || [])) {
      if (t && typeof t === 'string' && !t.startsWith('[') && !t.startsWith('a ') && t.length < 80) {
        templates.add(t)
      }
    }
    if (node.type === 'recommendation') { return }
    if (node.next_stage !== undefined) {
      const nextNode = tree.nodes.find(n => n.stage === node.next_stage)
      if (nextNode) { walkNode(nextNode.id, depth + 1) }
      return
    }
    const branches = node.branches || []
    if (!branches.length) { return }
    let bestBranch = null
    let bestScore = 0
    for (const branch of branches) {
      const score = scorePattern(signalText, branch.answer_pattern)
      if (score > bestScore) { bestScore = score; bestBranch = branch }
    }
    if (bestBranch && bestScore > 0) { walkNode(bestBranch.next_node, depth + 1) }
  }

  // Start where the tree SAYS to start, not wherever a node happens to sit.
  // `entry_node` was added so a firm can reorder rows for readability without
  // silently repointing the engine (array position used to be the entry point).
  // The positional fallback keeps any tree without the field behaving exactly
  // as it always did.
  const entryId = (tree.entry_node && tree.nodes.some(n => n.id === tree.entry_node))
    ? tree.entry_node
    : tree.nodes[0].id
  walkNode(entryId, 0)
  return [...templates]
}

module.exports = { isTemplateName, splitByAvailability, withholdUnavailableNames, formatDeliveryMethodChoiceForPrompt, formatNodeForPrompt, loadLogicTrees, effectiveTrees, validateLogicTreeReferences, detectLogicTree, detectLogicTrees, explainDetection, formatLogicTreeForPrompt, formatSeminarsReferenceForPrompt, formatTrialFitReferenceForPrompt, formatCautiousRevealReferenceForPrompt, formatEoyReferenceForPrompt, formatFacilitationReferenceForPrompt, formatGrowthCurveRevealReferenceForPrompt, formatConflictMeetingReferenceForPrompt, formatCCOReferenceForPrompt, formatHealdMatrixReferenceForPrompt, formatDemingsVolatilityReferenceForPrompt, formatWorkingCapitalCycleReferenceForPrompt, formatRatioAnalysisReferenceForPrompt, formatDashboardDiscussionsReferenceForPrompt, buildLearnReferenceText, walkLogicTree, isClientDeliveryLearnTree }
