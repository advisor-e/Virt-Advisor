'use strict'

/**
 * @file Read-only probe over the DETERMINISTIC layers of the decision engine.
 * @module server/utils/phraseProbe
 *
 * WHY THIS EXISTS. Which logic table opens for a conversation is decided by
 * literal phrase matching against each table's `entry_triggers` — 1,005 phrases
 * across 42 tables, all firm-editable, none of them visible on any screen. On
 * 2026-07-31 that produced two P1 defects in one day: eight correctly-written
 * branches sat inside a table that never opened, and short triggers fired inside
 * unrelated words ("HR" inside "t-HR-ee"). Both were found by a person reading
 * code and hand-running measurements that survive nowhere.
 *
 * This module makes the same measurements repeatable: what does the engine do
 * with this sentence, and what would change if these words were added.
 *
 * ── WHAT IT COVERS, AND WHAT IT DELIBERATELY DOES NOT ──────────────────────
 * Four systems match phrases in this codebase. Three are deterministic and are
 * covered here in full:
 *
 *   1. DOMAIN detection  — regexes from domains.json (advisorEngine DOMAIN_PATTERNS)
 *   2. LOGIC TABLES      — entry_triggers, word-boundary literal (logicTrees)
 *   3. PROBLEM SIGNALS   — the signal dictionary's compiled patterns
 *
 * The fourth — ADVISORY DISTINCTIONS — is NOT covered, and its absence is
 * reported rather than left to be inferred. A distinction's `triggers` are not
 * matched literally at all: they are passed to gpt-4o-mini as example phrases
 * and the model decides semantically (advisorEngine `_classifyMatchingRows`).
 * Measuring it therefore costs an API call per sentence and is not repeatable
 * for free, so it belongs in a sampled tool of its own, not in this one.
 * Every result carries `notMeasured` saying so — a probe that silently omitted
 * a whole layer would read as "nothing else affects this", which is false.
 *
 * NOTHING HERE WRITES. No config is saved, no override is stored; the preview
 * builds its proposed tree in memory and throws it away.
 */

const logicTrees = require('./logicTrees')
const { extractProblemSignals, SIGNAL_DESCRIPTIONS } = require('./problemSignals')

/**
 * The layers this probe cannot see, stated in the payload so a screen can print
 * it. Wording lives here so the API and any future surface say the same thing.
 */
const NOT_MEASURED = [
  {
    layer: 'advisory-distinctions',
    reason: 'Distinction trigger phrases are examples read by the AI, not literal matches — ' +
      'measuring them needs a live AI call, so they are not included here.'
  }
]

// Input guards. The text arrives from a browser and becomes a regex subject (never
// a regex itself — triggers are escaped in logicTrees.triggerMatches), so the only
// real risk is volume. Caps are stated back in the response: a cap that hides
// itself is the failure this whole module exists to prevent.
const MAX_TEXT = 2000
// 200, sized against the data rather than picked: the largest live trigger list is
// staff_performance at 59, so a lower cap would silently refuse a full rewrite of
// the biggest table — the one most likely to be edited. Anything beyond the cap is
// counted into `phrasesIgnored` and reported, never dropped in silence.
const MAX_PHRASES = 200
const MAX_PHRASE_LEN = 80

/** Trim, drop blanks, de-duplicate, and cap — reporting what it dropped. */
function _cleanPhrases (input) {
  const list = Array.isArray(input) ? input : []
  const seen = new Set()
  const kept = []
  let dropped = 0
  for (const raw of list) {
    const phrase = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    if (!phrase || phrase.length > MAX_PHRASE_LEN || seen.has(phrase)) { dropped++; continue }
    if (kept.length >= MAX_PHRASES) { dropped++; continue }
    seen.add(phrase)
    kept.push(phrase)
  }
  return { kept, dropped }
}

/**
 * Score the 14 domains exactly as the engine's first pass does: count keyword
 * matches, most matches wins, nothing above zero means the AI backstop would be
 * consulted instead (advisorEngine L1573).
 * @param {string} text
 * @returns {Array<{id:string,label:string,count:number}>} highest first
 */
function scoreDomains (text) {
  // Lazily required: advisorEngine is already loaded by the running server, so
  // this is free at runtime, but keeping it out of module scope means a unit test
  // of the trigger layer alone does not drag the whole engine in.
  const patterns = require('../advisorEngine').DOMAIN_PATTERNS || []
  return patterns
    // String.match, not RegExp.test — the patterns carry /g and test() would be
    // stateful across calls. This mirrors the engine's own call exactly.
    .map(d => ({ id: d.id, label: d.label, count: (text.match(d.pattern) || []).length }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)
}

/**
 * Run one sentence through every deterministic layer.
 * @param {string} rawText - the advisor's words, as typed
 * @param {Object|null} [firmTrees] - the firm's logic-tree override map
 * @returns {Object} the three layers, plus what was not measured
 */
function probeText (rawText, firmTrees) {
  const full = typeof rawText === 'string' ? rawText : ''
  const text = full.slice(0, MAX_TEXT)

  const tables = logicTrees.explainDetection(text, firmTrees)
  const signalCounts = extractProblemSignals(text)

  return {
    text,
    truncated: full.length > MAX_TEXT,
    domains: scoreDomains(text),
    // The winner is what production acts on; the rest still get walked when they
    // score, which is why every scoring table is listed rather than just the top.
    tables,
    topTable: tables.length > 0 ? tables[0].id : null,
    signals: Object.keys(signalCounts).map(name => ({
      name,
      description: SIGNAL_DESCRIPTIONS[name] || name,
      count: signalCounts[name]
    })).sort((a, b) => b.count - a.count),
    notMeasured: NOT_MEASURED
  }
}

/**
 * Build the comparison corpus from content that ALREADY EXISTS, so there is
 * nothing to hand-maintain and nothing invented.
 *
 * ⚠ HONEST LIMIT, and it matters. These sentences are the firm's own branch
 * conditions and the Scenario Lab's openings — they are NOT recordings of how
 * advisors actually talk, and they will systematically under-represent the
 * natural phrasings the vocabulary sweep exists to catch. The corpus is the
 * right instrument for "would this word steal a conversation from another
 * table" and the WRONG one for "does this table open for real language". The
 * typed probe is what covers the second. Callers surface `composition` so a
 * reader can see what the number rests on.
 *
 * @returns {{entries:Array<{id:string,source:string,treeId:string|null,text:string}>,composition:Object}}
 */
function buildCorpus () {
  const entries = []

  // Source 1 — every branch's own condition text, across all tables.
  for (const tree of logicTrees.loadLogicTrees()) {
    const branches = Array.isArray(tree.nodes)
      ? tree.nodes
      : (Array.isArray(tree.branches) ? tree.branches : [])
    branches.forEach((node, i) => {
      const text = String(node.condition || node.question || '').trim()
      if (!text) { return }
      entries.push({
        id: `${tree.id}#${node.id || i}`,
        source: 'branch-condition',
        treeId: tree.id,
        text
      })
    })
  }

  // Source 2 — the Scenario Lab's openings. Committed test data, and the closest
  // thing in the repo to a real advisor sentence. Opening + diagnostic are joined
  // because production runs the detector over the whole collected-answers block,
  // not the opener alone (advisorEngine L2383).
  let labCases = []
  try {
    labCases = require('../../scripts/scenario-lab-cases.json')
  } catch (_e) {
    labCases = []
  }
  for (const c of (Array.isArray(labCases) ? labCases : [])) {
    const text = [c.opening, c.situationDiagnostic].filter(Boolean).join(' ').trim()
    if (!text) { continue }
    entries.push({ id: `lab:${c.key}`, source: 'scenario-lab', treeId: null, text })
  }

  const composition = {}
  for (const e of entries) { composition[e.source] = (composition[e.source] || 0) + 1 }
  return { entries, composition }
}

/**
 * What would change if a table's trigger phrases were edited.
 *
 * Runs the WHOLE corpus twice through the real detector — once as things stand,
 * once with the proposed list merged in exactly as a save would merge it
 * (firmContent.mergeEntry replaces arrays wholesale, so the proposed
 * `entry_triggers` replaces the live one). Both runs happen in this one call
 * with explicit inputs, which is what removes the measurement trap that bit on
 * 2026-07-30: neither run can read the other's edit as its own baseline.
 *
 * NOTHING IS SAVED. The proposed override exists only for the length of this call.
 *
 * @param {Object} opts
 * @param {string} opts.treeId - the table being edited
 * @param {string[]} [opts.add] - phrases to add
 * @param {string[]} [opts.remove] - phrases to remove
 * @param {Object|null} [opts.firmTrees] - the firm's current override map
 * @returns {Object} gained / lost / otherMoves / unchanged, plus the corpus it used
 */
function previewTriggerChange (opts) {
  const treeId = opts && opts.treeId
  const firmTrees = (opts && opts.firmTrees) || null

  const base = logicTrees.effectiveTrees(firmTrees).find(t => t.id === treeId)
  if (!base) { return null }

  const current = (base.entry_triggers || []).map(t => String(t).toLowerCase())
  const { kept: toAdd, dropped: addDropped } = _cleanPhrases(opts && opts.add)
  const { kept: toRemove, dropped: removeDropped } = _cleanPhrases(opts && opts.remove)

  const removeSet = new Set(toRemove)
  const next = current.filter(t => !removeSet.has(t))
  for (const phrase of toAdd) {
    if (!next.includes(phrase)) { next.push(phrase) }
  }

  // Merge the proposal the same way a real save would, then let the REAL
  // detector read it. No second scoring implementation exists here.
  const proposedMap = Object.assign({}, firmTrees || {})
  proposedMap[treeId] = Object.assign({}, proposedMap[treeId] || {}, { entry_triggers: next })

  const { entries, composition } = buildCorpus()
  const gained = []
  const lost = []
  const otherMoves = []
  let unchanged = 0

  for (const entry of entries) {
    const beforeRows = logicTrees.explainDetection(entry.text, firmTrees)
    const afterRows = logicTrees.explainDetection(entry.text, proposedMap)
    const before = beforeRows.length > 0 ? beforeRows[0].id : null
    const after = afterRows.length > 0 ? afterRows[0].id : null

    if (before === after) { unchanged++; continue }

    if (after === treeId) {
      // The phrases responsible, so a reader can judge the change rather than
      // trust the verdict.
      const row = afterRows.find(r => r.id === treeId)
      gained.push({
        id: entry.id,
        source: entry.source,
        text: entry.text,
        // null = the sentence previously opened NO table; a tree id = this edit
        // TOOK the conversation from that table, which is the expensive mistake.
        takenFrom: before,
        matched: row ? row.matched.filter(p => toAdd.includes(p)) : []
      })
    } else if (before === treeId) {
      lost.push({ id: entry.id, source: entry.source, text: entry.text, wentTo: after })
    } else {
      otherMoves.push({ id: entry.id, source: entry.source, text: entry.text, before, after })
    }
  }

  return {
    treeId,
    triggersBefore: current.length,
    triggersAfter: next.length,
    // Phrases the caller sent that were blank, over-long, duplicated, or beyond
    // the cap. Reported, never silently swallowed.
    phrasesIgnored: addDropped + removeDropped,
    caps: { maxPhrases: MAX_PHRASES, maxPhraseLength: MAX_PHRASE_LEN, maxTextLength: MAX_TEXT },
    corpus: { size: entries.length, composition },
    corpusLimit: 'These sentences are branch conditions and Scenario Lab cases — not recordings of ' +
      'real advisor speech. They show what a change would take from other tables; they do not prove ' +
      'a table opens for the way people actually talk.',
    gained,
    lost,
    otherMoves,
    unchanged,
    notMeasured: NOT_MEASURED
  }
}

module.exports = {
  probeText,
  scoreDomains,
  buildCorpus,
  previewTriggerChange,
  NOT_MEASURED,
  MAX_TEXT,
  MAX_PHRASES,
  MAX_PHRASE_LEN
}
