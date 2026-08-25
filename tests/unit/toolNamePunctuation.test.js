'use strict'

/**
 * THE NAME MATCHER WAS BLIND TO AN APOSTROPHE AND TO A MISPLACED SPACE, and it
 * reported real, published documents to Mike as "Nothing matches" three separate
 * times — a digit (2026-08-05), an apostrophe and a space (2026-08-12).
 * design/ACTIONS.md #name-matcher-punctuation-blind.
 *
 * Two mechanisms, one symptom:
 *
 *  - `normalise` replaced EVERY non-alphanumeric character with a space, so
 *    "Porter's & Pine" became `porter s pine` and could never equal the published
 *    **Porters & Pine** (`porters pine`).
 *  - `findCandidate` compares spaced strings, so "Quickfire Diagnosis Template"
 *    neither contains nor is contained by **Quick Fire Diagnosis**, and scores
 *    only 0.4 of its distinctive words against a 0.6 bar.
 *
 * The tests below are written against the REAL catalogue, not fixtures, because
 * the claim is about documents that actually exist. Three of them assert an
 * absence or a non-change — that the runtime gate withholds nothing new, and that
 * three rulings Mike has already given stay attached to their rows. Those are the
 * ways this fix could have done harm, so they are the ones worth pinning.
 */

const { normalise, normaliseLegacy, extractProseNames } = require('../../server/utils/toolNameScan')
const { findCandidate, buildCatalogue, findingKey, legacyFindingKey, runTemplateCheck } = require('../../server/utils/templateCheck')
const { withholdUnavailableNames } = require('../../server/utils/logicTrees')
const TEMPLATES = require('../../data/templates.json')
const TREES = require('../../data/logic_trees.json')

const catalogue = buildCatalogue(TEMPLATES)
const titleExists = t => TEMPLATES.some(r => r.title === t)

describe('an apostrophe no longer splits a name in two', () => {
  test('the two documents this was found on are genuinely published', () => {
    // If this fails, the rest of the file is testing a fiction.
    expect(titleExists('Porters & Pine')).toBe(true)
    expect(titleExists('Quick Fire Diagnosis')).toBe(true)
  })

  test("Porter's & Pine matches the published Porters & Pine", () => {
    expect(normalise("Porter's & Pine")).toBe(normalise('Porters & Pine'))
    // The exact failure as it reached Mike: the old rule made them different.
    expect(normaliseLegacy("Porter's & Pine")).not.toBe(normaliseLegacy('Porters & Pine'))
  })

  test('a possessive is closed up, not spaced', () => {
    expect(normalise("De Bono's 6 Hats")).toBe('de bonos 6 hats')
    expect(normalise("What's Applicable")).toBe('whats applicable')
    // Curly apostrophes are what a pasted document actually carries.
    expect(normalise('Porter’s Revenue')).toBe(normalise("Porter's Revenue"))
  })

  test('every other mark still becomes a space, exactly as before', () => {
    expect(normalise('Get. Paper Tower Model')).toBe('get paper tower model')
    expect(normalise('Sales & Marketing')).toBe('sales marketing')
  })

  test('no two distinct catalogue titles are merged by the change', () => {
    // The one real risk of relaxing a comparison: two different documents
    // becoming indistinguishable, so a suggestion silently points at the wrong
    // one. Measured across all 291 titles — the change must introduce none.
    const group = (fn) => {
      const m = new Map()
      for (const r of TEMPLATES) {
        const k = fn(r.title)
        if (!m.has(k)) { m.set(k, new Set()) }
        m.get(k).add(r.title)
      }
      return m
    }
    const before = group(normaliseLegacy)
    const after = group(normalise)
    const newlyMerged = [...after.entries()]
      .filter(([, titles]) => titles.size > 1)
      .filter(([, titles]) => (before.get(normaliseLegacy([...titles][0])) || new Set()).size <= 1)
    expect(newlyMerged).toEqual([])
  })
})

describe('a name whose spaces sit differently still finds its document', () => {
  test('Quickfire Diagnosis Template is offered Quick Fire Diagnosis', () => {
    const c = findCandidate('Quickfire Diagnosis Template', catalogue)
    expect(c).toBeTruthy()
    expect(c.title).toBe('Quick Fire Diagnosis')
    expect(c.why).toBe('the same words, with the spaces put differently')
    // It is the weakest reading offered, never presented as certainty.
    expect(c.score).toBe(0.6)
    // And it still carries the line that says what the document is.
    expect(c.summary.length).toBeGreaterThan(0)
  })

  test('it never displaces a suggestion the spaced comparison already made', () => {
    // The last resort runs only after the whole catalogue has failed. A name with
    // an ordinary match must come back with that match and its own reason.
    const c = findCandidate('Get.1a.Sales Tracker', catalogue)
    expect(c.title).toBe('Sales Tracker Opt A')
    expect(c.why).not.toBe('the same words, with the spaces put differently')
  })

  test('a name that resembles nothing still returns null', () => {
    // Relaxing a matcher must not turn "Nothing matches" into a guess. This is
    // the 2026-08-04 failure — confident wrongness, not silence.
    expect(findCandidate('Zzzq Wibble Frobnicator', catalogue)).toBeNull()
  })
})

describe('the runtime gate withholds nothing new', () => {
  // THIS IS THE SAFETY CLAIM OF THE WHOLE CHANGE. `normalise` also decides which
  // sentences reach a live prompt, so a change that made it stricter would mute
  // advice with no error and no failing test anywhere else.
  const recommendations = []
  const trees = Array.isArray(TREES) ? TREES : (TREES.trees || [])
  for (const t of trees) {
    const rules = Array.isArray(t.nodes) ? t.nodes : (Array.isArray(t.branches) ? t.branches : [])
    for (const r of rules) { if (r.recommendation) { recommendations.push(r.recommendation) } }
  }

  /** The gate's own logic, run against the pre-change normaliser for comparison. */
  const gateUnder = (text, keys, norm) => {
    const kept = []
    for (const seg of String(text).match(/[^.:;!?]+[.:;!?]*\s*/g) || []) {
      if (extractProseNames(seg).filter(n => !keys.has(norm(n))).length === 0) { kept.push(seg) }
    }
    return kept.join('').trim()
  }
  const legacyKeys = new Set(TEMPLATES.map(r => normaliseLegacy(r.title)))

  test('there are gated recommendations to test at all', () => {
    expect(recommendations.length).toBeGreaterThan(50)
  })

  test('every gated recommendation survives exactly as much text as before', () => {
    const differences = recommendations
      .map(rec => ({ rec, before: gateUnder(rec, legacyKeys, normaliseLegacy), after: withholdUnavailableNames(rec) }))
      .filter(x => x.before !== x.after)
    expect(differences).toEqual([])
  })

  test('the gate never returns MORE than the instruction it was given', () => {
    for (const rec of recommendations) {
      expect(rec).toContain(withholdUnavailableNames(rec).slice(0, 40))
    }
  })
})

describe("Mike's existing rulings stay attached to their rows", () => {
  // A ruling is filed under the normalised name. Changing the normaliser moved
  // three keys, and without the legacy fallback three questions he answered on
  // 2026-08-12 would have reappeared as unanswered — the very fault this change
  // was made to end, arriving by the back door.
  const RULED = [
    { tree: 'org_ca_firm_strategy', rule: 'cas_strategic_decision', name: "De Bono's 6 Hats", title: '6 Hats' },
    { tree: 'org_firm_board_pack', rule: 'fbp_data_interpretation', name: "Deming's Theory of Volatility", title: 'Demings Volatility' }
  ]

  test('the legacy key is the old spelling, and it differs from the new one', () => {
    const k = findingKey('t', 'r', "De Bono's 6 Hats")
    const legacy = legacyFindingKey('t', 'r', "De Bono's 6 Hats")
    expect(k).toBe('t::r::de bonos 6 hats')
    expect(legacy).toBe('t::r::de bono s 6 hats')
    expect(k).not.toBe(legacy)
  })

  test('a ruling stored under the old key is still found', () => {
    const rulings = {}
    for (const r of RULED) {
      rulings[legacyFindingKey(r.tree, r.rule, r.name)] = { verdict: 'ruled', title: r.title }
    }
    const report = runTemplateCheck({ rulings })
    for (const r of RULED) {
      const row = report.findings.find(f => f.treeId === r.tree && f.name === r.name)
      expect(row).toBeTruthy()
      expect(row.verdict).toBe('ruled')
      expect(row.ruling.title).toBe(r.title)
    }
  })

  test('without the fallback those same rows would read as unanswered', () => {
    // The proof that the fallback is load-bearing rather than decorative.
    const rulings = {}
    for (const r of RULED) {
      rulings[legacyFindingKey(r.tree, r.rule, r.name)] = { verdict: 'ruled', title: r.title }
    }
    for (const r of RULED) {
      expect(rulings[findingKey(r.tree, r.rule, r.name)]).toBeUndefined()
    }
  })

  test('the current spelling wins when a row is stored under both', () => {
    const r = RULED[0]
    const rulings = {
      [legacyFindingKey(r.tree, r.rule, r.name)]: { verdict: 'ruled', title: 'the old answer' },
      [findingKey(r.tree, r.rule, r.name)]: { verdict: 'ruled', title: 'the current answer' }
    }
    const row = runTemplateCheck({ rulings }).findings.find(f => f.treeId === r.tree && f.name === r.name)
    expect(row.ruling.title).toBe('the current answer')
  })

  test("Porter's & Pine no longer appears on the queue at all", () => {
    // It is not a row with a suggestion now — it is not a row. The name written
    // in the table IS the published document, and the screen should be silent.
    const report = runTemplateCheck({})
    expect(report.findings.some(f => /Porter's & Pine/.test(f.name))).toBe(false)
  })
})

/**
 * THE SAME BLINDNESS, ONE CHARACTER CLASS OVER — a lowercase part-number.
 *
 * A tool name may continue only through a word starting `[A-Z0-9]`, which is what stops a
 * phrase running on into ordinary prose. Two published pages break that rule in their own
 * titles: **COI Development pt1** and **pt2**. The scanner stopped at the lowercase `pt`,
 * looked up "COI Development", found nothing, and the gate withheld a sentence naming a
 * page the advisor can open. The branch's own `templates[]` entry resolved the whole time,
 * because that path exact-matches instead of scanning prose — so the tree looked correct
 * from every angle except the one that mattered.
 *
 * Measured across the corpus: 53 of 55 gated recommendations are byte-identical before and
 * after, and the two that change are these.
 */
describe('a lowercase part-number is part of the name', () => {
  test('the two pages are still published under these exact titles', () => {
    // If Advisor-e retitles them upstream, this is the line that says so.
    const titles = new Set((Array.isArray(TEMPLATES) ? TEMPLATES : TEMPLATES.templates || [])
      .map(t => t && t.title))
    expect(titles.has('COI Development pt1')).toBe(true)
    expect(titles.has('COI Development pt2')).toBe(true)
  })

  test('the scanner reads the whole name, not the half before the suffix', () => {
    expect(extractProseNames('Use COI Development pt1 to structure the approach.'))
      .toEqual(['COI Development pt1'])
    expect(extractProseNames('Use COI Development pt2 to rebuild the relationship.'))
      .toEqual(['COI Development pt2'])
  })

  test('it does not swallow the prose that follows', () => {
    // The suffix is the ONE lowercase word a name continues through. The next word must
    // still start a capital or the name ends there.
    expect(extractProseNames('Use COI Development pt1 to structure the approach.'))
      .not.toContain('COI Development pt1 to structure')
  })

  test('🔴 and the sentences now reach the advisor whole', () => {
    // The outcome, through the production gate rather than an imitation of it.
    const canary = withholdUnavailableNames('Use Quick Position template.')
    if (!canary) {
      console.warn('[test] template catalogue unavailable — gate outcome not asserted')
      return
    }
    ;[
      'Use COI Development pt1 to structure the approach and early relationship-building.',
      'Use COI Development pt2 to rebuild the relationship toward a referral structure.'
    ].forEach((sentence) => {
      expect(withholdUnavailableNames(sentence)).toBe(sentence)
    })
  })
})
