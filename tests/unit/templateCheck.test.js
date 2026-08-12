'use strict'

// The Template Check scan.
//
// WHY THIS FILE EXISTS, and why it is written against hand-built fixtures rather
// than the real corpus: the last two attempts to settle these names both failed
// on a claim about the corpus that nobody could check. On 2026-08-04 twenty-seven
// names were declared missing and the premise was wrong. On 2026-08-05 the gate
// built to hold them back turned out to read 37 of the 42 tables — and its test
// walked `tree.nodes`, so the test had the same blind spot as the code and the
// two agreed with each other.
//
// So these tests state the BEHAVIOUR on data they control, and one separate block
// at the end makes the corpus-wide claims that are worth making — each one
// phrased so that if it stops being true, the failure names what changed.

const {
  runTemplateCheck,
  extractProseNames,
  findCandidate,
  buildCatalogue,
  rulesOf,
  findingKey,
  VERDICT,
  WHERE
} = require('../../server/utils/templateCheck')

const CATALOGUE = [
  { title: 'Quick Position' },
  { title: 'Growth Fundamentals Framework Philosophy', summary: 'The full version of the framework.' },
  { title: 'Formal Risk Management', summary: 'Categorises threats by probability and consequence.' },
  { title: 'Annual Board Plan' },
  { title: 'Partner Accountability', summary: 'first of two' },
  { title: 'Partner Accountability', summary: 'second of two' }
]

/** A tree in the 37-table shape (rules under `nodes`). */
function nodeTree (nodes) {
  return { id: 'tree_nodes', name: 'A Node Tree', nodes }
}

/** A tree in the 5-table shape (rules under `branches`) — the blind spot. */
function branchTree (branches) {
  return { id: 'tree_flat', name: 'A Flat Tree', branches }
}

function run (trees, rulings) {
  return runTemplateCheck({ trees, templates: CATALOGUE, rulings: rulings || {} })
}

describe('both tree shapes are read', () => {
  // This is the whole reason the scan exists. A version that reads only `nodes`
  // passes every other test in this file.
  it('finds a bad name in a `nodes` tree', () => {
    const r = run([nodeTree([{ id: 'n1', templates: ['No Such Tool'] }])])
    expect(r.findings.map(f => f.name)).toEqual(['No Such Tool'])
  })

  it('finds a bad name in a `branches` tree', () => {
    const r = run([branchTree([{ id: 'b1', templates: ['No Such Tool'] }])])
    expect(r.findings.map(f => f.name)).toEqual(['No Such Tool'])
  })

  it('counts the two shapes separately, so a regression to one of them is visible', () => {
    const r = run([nodeTree([]), nodeTree([]), branchTree([])])
    expect(r.counts.tablesChecked).toBe(3)
    expect(r.counts.tablesWithNodes).toBe(2)
    expect(r.counts.tablesWithBranches).toBe(1)
  })

  it('rulesOf reads nodes OR branches, never assuming the first', () => {
    expect(rulesOf({ nodes: [{ id: 'a' }] })).toHaveLength(1)
    expect(rulesOf({ branches: [{ id: 'b' }, { id: 'c' }] })).toHaveLength(2)
    expect(rulesOf({})).toEqual([])
  })
})

describe('formal template references', () => {
  it('says nothing about a name the catalogue holds', () => {
    const r = run([nodeTree([{ id: 'n1', templates: ['Quick Position'] }])])
    expect(r.findings).toEqual([])
  })

  it('checks all three template fields, not just `templates`', () => {
    const r = run([nodeTree([{
      id: 'n1',
      templates: ['Ghost One'],
      templates_if_unsure: ['Ghost Two'],
      support_templates: ['Ghost Three']
    }])])
    expect(r.findings.map(f => f.name).sort()).toEqual(['Ghost One', 'Ghost Three', 'Ghost Two'])
    expect(r.findings.map(f => f.field).sort()).toEqual(['support_templates', 'templates', 'templates_if_unsure'])
  })

  it('lets deliberate prose placeholders through untouched', () => {
    // 18 of these are live. They are guidance for the AI, not references, and a
    // scan that raised them would bury the real findings under them.
    const r = run([nodeTree([{ id: 'n1', templates: ['a goal-setting template [Planning — tags: goals]'] }])])
    expect(r.findings).toEqual([])
  })

  it('labels the reference as coming from a template list', () => {
    const r = run([nodeTree([{ id: 'n1', templates: ['Ghost'] }])])
    expect(r.findings[0].where).toBe(WHERE.LIST)
  })
})

describe('names written into the instruction', () => {
  it('reads a tool named after an instruction verb', () => {
    expect(extractProseNames('Deploy the Offshoring Review to settle it.')).toEqual(['Offshoring Review'])
  })

  it('reads BOTH tools when one instruction names two', () => {
    // "Deploy the Annual Board Plan and BoardPack Agenda" — the second is exactly
    // the kind of name a hand review skips.
    expect(extractProseNames('Deploy the Annual Board Plan and BoardPack Agenda.'))
      .toEqual(['Annual Board Plan', 'BoardPack Agenda'])
  })

  it('matches an instruction that opens a sentence as well as one inside it', () => {
    // The first version of this regex was case-sensitive on the verb, so every
    // "Deploy the …" at the start of a sentence — which is most of them — was
    // invisible, and the scan quietly reported those branches as clean.
    expect(extractProseNames('Use the Ghost Tool now.')).toEqual(['Ghost Tool'])
    expect(extractProseNames('First, then use the Ghost Tool.')).toEqual(['Ghost Tool'])
  })

  it('does NOT raise a capitalised phrase that is merely being discussed', () => {
    // Both of these are phrases Mike ruled "Not a tool" on 2026-08-05. Requiring
    // the instruction verb declines to raise them without anyone dismissing them.
    expect(extractProseNames('The 5 Common Psyche Errors: Confirmation Bias.')).toEqual([])
    expect(extractProseNames('Chart of Accounts design is the critical first step.')).toEqual([])
  })

  it('never runs a phrase across a sentence boundary', () => {
    expect(extractProseNames('Use the Ghost Tool. Select the next step.')).toEqual(['Ghost Tool'])
  })

  it('keeps a name whole rather than trimming a trailing noun off it', () => {
    // An earlier version stripped "Plan" as a suffix and produced "Annual Board",
    // a name that appears nowhere in either file.
    expect(extractProseNames('Deploy the Annual Board Plan.')).toEqual(['Annual Board Plan'])
  })

  it('ignores a name already listed formally on the same branch', () => {
    const r = run([nodeTree([{
      id: 'n1',
      templates: ['Ghost Tool'],
      action: 'Use the Ghost Tool now.'
    }])])
    expect(r.findings).toHaveLength(1)
    expect(r.findings[0].where).toBe(WHERE.LIST)
  })

  it('reads the `recommendation` field, which the prompt builder drops today', () => {
    // 55 branches keep their instruction there (ACTIONS.md
    // #tree-recommendation-field-dropped). A scan that skipped it would report
    // every one of those branches as clean.
    const r = run([nodeTree([{ id: 'n1', recommendation: 'Use Risk Mgt Cover matrix to classify.' }])])
    expect(r.findings.map(f => f.name)).toContain('Risk Mgt Cover')
  })

  it('labels the reference as coming from a sentence', () => {
    const r = run([nodeTree([{ id: 'n1', action: 'Deploy the Ghost Tool.' }])])
    expect(r.findings[0].where).toBe(WHERE.PROSE)
  })
})

describe('suggesting a candidate', () => {
  const cat = buildCatalogue(CATALOGUE)

  it('offers a title that starts with the name as written', () => {
    const c = findCandidate('Growth Fundamentals Framework', cat)
    expect(c.title).toBe('Growth Fundamentals Framework Philosophy')
  })

  it('reads through a longer name to the title inside it', () => {
    const c = findCandidate('Formal Risk Management template', cat)
    expect(c.title).toBe('Formal Risk Management')
  })

  it('stays SILENT rather than guessing', () => {
    // The 2026-08-04 failure was confident wrongness, not silence. A verdict of
    // "Nothing matches" is recoverable; a bad suggestion acted on is not.
    expect(findCandidate('Zebra Crossing Protocol', cat)).toBeNull()
  })

  it('produces "Probably this" when there is a candidate and "Nothing matches" when there is not', () => {
    const r = run([nodeTree([
      { id: 'n1', templates: ['Growth Fundamentals Framework'] },
      { id: 'n2', templates: ['Zebra Crossing Protocol'] }
    ])])
    const byName = Object.fromEntries(r.findings.map(f => [f.name, f.verdict]))
    expect(byName['Growth Fundamentals Framework']).toBe(VERDICT.MAYBE)
    expect(byName['Zebra Crossing Protocol']).toBe(VERDICT.NONE)
  })
})

describe("the mentor's ruling outranks the scan", () => {
  const tree = nodeTree([{ id: 'n1', templates: ['Zebra Crossing Protocol'] }])
  const key = findingKey('tree_nodes', 'n1', 'Zebra Crossing Protocol')

  it('shows "You\'ve ruled" once a name has been pointed at a template', () => {
    const r = run([tree], { [key]: { verdict: 'ruled', title: 'Quick Position' } })
    expect(r.findings[0].verdict).toBe(VERDICT.RULED)
    expect(r.findings[0].ruling.title).toBe('Quick Position')
  })

  it('shows "Not a tool" once a name has been dismissed', () => {
    const r = run([tree], { [key]: { verdict: 'dismissed' } })
    expect(r.findings[0].verdict).toBe(VERDICT.DISMISSED)
  })

  it('overrides a suggestion the scan would otherwise have made', () => {
    const t = nodeTree([{ id: 'n1', templates: ['Growth Fundamentals Framework'] }])
    const k = findingKey('tree_nodes', 'n1', 'Growth Fundamentals Framework')
    const r = run([t], { [k]: { verdict: 'dismissed' } })
    expect(r.findings[0].verdict).toBe(VERDICT.DISMISSED)
    expect(r.findings[0].candidate).toBeNull()
  })

  it('keeps dismissals out of the live totals but still counts them', () => {
    const r = run([tree], { [key]: { verdict: 'dismissed' } })
    expect(r.counts.total).toBe(0)
    expect(r.counts.notATool).toBe(1)
  })

  it('gives a finding an identity that survives the table being edited', () => {
    // Built from the tree, the rule and the name — never a row index, which moves
    // the moment a table is edited and would silently re-attach a ruling to a
    // different row.
    expect(findingKey('t', 'r', 'A Name')).toBe(findingKey('t', 'r', 'a  name!'))
    expect(findingKey('t', 'r', 'A Name')).not.toBe(findingKey('t', 'r2', 'A Name'))
  })
})

describe('the real corpus', () => {
  // Claims about the shipped data. Each is written so a failure says what moved.
  const report = runTemplateCheck()

  it('reads all 42 logic tables, in both shapes', () => {
    expect(report.counts.tablesChecked).toBe(42)
    expect(report.counts.tablesWithNodes + report.counts.tablesWithBranches).toBe(42)
    // The five flat tables are the ones the availability gate has never seen.
    expect(report.counts.tablesWithBranches).toBe(5)
  })

  it('finds the flat-table names the gate is blind to', () => {
    // Named individually because these are the specific references that reach the
    // AI today with nothing behind them (ACTIONS.md #gate-blind-to-flat-trees).
    const names = report.findings.filter(f => f.where === 'list').map(f => f.name)
    expect(names).toContain('Get.1a.Sales Tracker')
    expect(names).toContain('Get. TCM.Quiz Link Email')
  })

  it('finds the names Mike confirmed are real documents the export lacks', () => {
    const names = report.findings.map(f => f.name)
    expect(names).toContain('Offshoring Review')
    expect(names).toContain('BoardPack Agenda')
  })

  it('does not raise "Chart of Accounts", which is only ever discussed', () => {
    // Every mention of it in the corpus is descriptive ("Chart of Accounts design
    // is the critical first step"), so requiring an instruction verb declines to
    // raise it — one of the two phrases Mike ruled "Not a tool" on 2026-08-05.
    expect(report.findings.map(f => f.name)).not.toContain('Chart of Accounts')
  })

  it('DOES still raise "Psyche Errors", and that is not a bug', () => {
    // The other of the two. Somewhere in the corpus it is named after an
    // instruction verb, so the scan cannot tell it from a real tool — and it
    // should not pretend to. This is precisely the false positive "Not a tool"
    // exists to absorb, and pinning it here stops a future tightening of the
    // extractor from being mistaken for a fix.
    expect(report.findings.map(f => f.name)).toContain('Psyche Errors')
  })

  it('produces a list a person could actually finish', () => {
    // Not a precise number — the corpus changes. The first version of the prose
    // extractor returned 745 rows against the 27 found by hand, and a list nobody
    // can finish is the same as no list at all. This is the guard on that.
    expect(report.counts.total).toBeGreaterThan(20)
    expect(report.counts.total).toBeLessThan(200)
  })
})
