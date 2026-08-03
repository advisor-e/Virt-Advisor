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
 * Measuring it therefore takes a live AI call per sentence and is not
 * deterministic, so it belongs in a sampled tool of its own — one that repeats
 * a run enough times to tell a real move from a flaky one. COST IS NOT THE
 * REASON it sits outside this probe (ruling, Mike, 2026-08-02): where live AI is
 * what proves the thing, it runs, and token spend is never weighed against the
 * correctness of a measurement. See design/ACTIONS.md, trigger-vocabulary-sweep.
 * Every result carries `notMeasured` saying so — a probe that silently omitted
 * a whole layer would read as "nothing else affects this", which is false.
 *
 * NOTHING HERE WRITES. No config is saved, no override is stored; the preview
 * builds its proposed tree in memory and throws it away.
 */

const logicTrees = require('./logicTrees')
const { extractProblemSignals, SIGNAL_DESCRIPTIONS } = require('./problemSignals')

/**
 * The layers a run cannot see, stated in the payload so a screen can print it.
 * Wording lives here so the API and any future surface say the same thing.
 *
 * ONE SENTENCE (probeText) MEASURES DISTINCTIONS FOR REAL — one live AI call, the
 * engine's own classifier. It is not in this list any more. Ruled by Mike on
 * 2026-08-02: *"I have NEVER said to save a few bucks on tokens and avoid live AI
 * — if live AI testing is required for best practice, do it without asking."*
 *
 * The 470-sentence PREVIEW still cannot, and this is a time argument, not a cost
 * one: it would be ~940 model calls per click, minutes of waiting for one answer.
 */
const NOT_MEASURED_IN_PREVIEW = [
  {
    layer: 'advisory-distinctions',
    reason: 'Distinctions are judged by the AI for each conversation. Comparing them across all ' +
      '470 test sentences would mean around 940 AI calls for one answer, so this comparison ' +
      'covers the phrase matching only. Use "Try a sentence" above to see distinctions for real.'
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
async function probeText (rawText, firmTrees, distinctionRows) {
  const full = typeof rawText === 'string' ? rawText : ''
  const text = full.slice(0, MAX_TEXT)

  const tables = logicTrees.explainDetection(text, firmTrees)
  const signalCounts = extractProblemSignals(text)
  const domains = scoreDomains(text)

  return {
    text,
    truncated: full.length > MAX_TEXT,
    domains,
    // The winner is what production acts on; the rest still get walked when they
    // score, which is why every scoring table is listed rather than just the top.
    tables,
    topTable: tables.length > 0 ? tables[0].id : null,
    signals: Object.keys(signalCounts).map(name => ({
      name,
      description: SIGNAL_DESCRIPTIONS[name] || name,
      count: signalCounts[name]
    })).sort((a, b) => b.count - a.count),
    distinctions: await matchDistinctions(text, domains, distinctionRows),
    // Every layer IS measured for one sentence, so nothing is withheld here. The
    // key stays in the payload rather than disappearing, so a screen that prints
    // limits keeps working and simply has none to print.
    notMeasured: []
  }
}

/**
 * Which of the firm's Advisory Distinctions this sentence matches — for real, via
 * one live gpt-4o-mini call through the ENGINE'S OWN classifier. A second
 * implementation here would be free to disagree with production, which is worse
 * than showing nothing.
 *
 * Distinctions are scored within the detected domain, exactly as a live session
 * does, so the probe cannot report a match the engine would never have made.
 *
 * That domain filter is also the commonest reason a firm's own distinction never
 * fires, so `elsewhere` reports the firm's rows filed in OTHER areas that this
 * sentence would have matched — see `matchElsewhere` below.
 *
 * @param {string} text - the advisor's words
 * @param {Array<{id:string}>} domains - scored domains, highest first
 * @param {Array<Object>} [rows] - the firm's resolved effective distinctions
 * @returns {Promise<Object>} { measured, domain, matched[], elsewhere, reason? }
 */
async function matchDistinctions (text, domains, rows) {
  const domain = domains && domains.length > 0 ? domains[0].id : null
  if (!domain) {
    return {
      measured: false,
      domain: null,
      matched: [],
      // Not a failure — distinctions are scored inside a domain, so with no
      // domain there is nothing to score. Said out loud rather than shown as
      // "no matches", which would read as "your distinctions did not apply".
      reason: 'Distinctions are read within a domain, and no domain was recognised from these words.'
    }
  }

  const all = Array.isArray(rows) ? rows : []
  const inDomain = all.filter(r => r && r.domain === domain)

  // Always run the elsewhere check, even when this domain has no distinctions at
  // all — "you have none here, but you have one filed under Conflict that fits"
  // is a more useful answer than either half alone.
  const elsewhere = await matchElsewhere(text, domain, all)

  if (inDomain.length === 0) {
    return {
      measured: true,
      domain,
      matched: [],
      elsewhere,
      reason: 'This domain has no distinctions yet, so there was nothing for the AI to match.'
    }
  }

  const matched = await require('../advisorEngine').classifyMatchingRows(inDomain, text, 'logic-lab-probe')
  return {
    measured: true,
    domain,
    considered: inDomain.length,
    elsewhere,
    matched: (matched || []).map(r => ({
      id: r.id,
      description: r.description,
      boost: r.boost || 5,
      templates: Array.isArray(r.templates) ? r.templates : [],
      source: r.source || 'platform'
    }))
  }
}

/**
 * The firm's OWN distinctions, filed in OTHER areas, that this sentence would have
 * matched had they been in the detected one.
 *
 * WHY THIS EXISTS — the whole reason a firm manager opens this page is *"I wrote a
 * distinction and it didn't fire, why not?"*, and the commonest answer is not that
 * the wording was poor. It is that the row was never shown to the AI at all:
 * distinctions are scored inside the detected domain (above), so a row filed
 * anywhere else is invisible no matter how well it describes the situation.
 *
 * Found by Mike on 2026-08-03, testing the first build. His sentence — *"clients
 * who are not on the same page, have poor decision making and no clear strategy"* —
 * read as `governance`, while his own row *"Clients not on same page or haven't
 * defined what each wants from the business"* sits in `conflict`. It matched his
 * words almost verbatim and never entered the running. The page instead reported a
 * PLATFORM row that did match, and offered to change that — the wrong material and
 * the wrong answer. See design/LOGIC-LAB-ACCEPT-AND-PUSH.md §1a.
 *
 * THE FIRM'S OWN MATERIAL ONLY (`firm-own` + `firm-override`). "Why didn't MINE
 * work" is the question, and an accept may only ever change the firm's own rows —
 * re-filing a platform row the firm never wrote is not a determined fix.
 *
 * A second live classifier call, deliberately: the same judgement the engine makes,
 * asked of a different set of rows. Re-implementing "would this have matched?" here
 * would be free to disagree with production.
 *
 * ⚠ INHERITS THE OPEN P1 (`ai-failure-reads-as-no-match`, owned by the laptop):
 * `classifyMatchingRows` returns `[]` both when the AI matched nothing and when the
 * call FAILED, so an empty `rows` here cannot yet be told apart from an outage.
 * `considered` is returned alongside so a screen can at least say what was looked
 * at, and this reads correctly the moment that P1 is fixed.
 *
 * @param {string} text - the advisor's words
 * @param {string} domain - the detected domain
 * @param {Array<Object>} allRows - the firm's resolved effective distinctions
 * @returns {Promise<{considered: number, rows: Array<Object>}>}
 */
async function matchElsewhere (text, domain, allRows) {
  const candidates = allRows.filter(r =>
    r && r.domain && r.domain !== domain &&
    (r.source === 'firm-own' || r.source === 'firm-override')
  )
  if (candidates.length === 0) { return { considered: 0, rows: [] } }

  const hits = await require('../advisorEngine').classifyMatchingRows(candidates, text, 'logic-lab-elsewhere')
  return {
    considered: candidates.length,
    rows: (hits || []).map(r => ({
      id: r.id,
      description: r.description,
      // The area it is filed in — the whole point of the finding, and the thing
      // the manager has to change.
      filedDomain: r.domain,
      boost: r.boost || 5,
      templates: Array.isArray(r.templates) ? r.templates : [],
      triggers: Array.isArray(r.triggers) ? r.triggers : [],
      source: r.source
    }))
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
    notMeasured: NOT_MEASURED_IN_PREVIEW
  }
}

module.exports = {
  probeText,
  matchDistinctions,
  scoreDomains,
  buildCorpus,
  previewTriggerChange,
  NOT_MEASURED_IN_PREVIEW,
  MAX_TEXT,
  MAX_PHRASES,
  MAX_PHRASE_LEN
}
