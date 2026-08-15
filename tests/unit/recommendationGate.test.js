'use strict'

/**
 * The recommendation gate — server/utils/logicTrees.js
 *
 * WHY THIS EXISTS. 55 branches across 8 logic tables keep their instruction in a
 * field called `recommendation`, and `formatNodeForPrompt` never read it. None of
 * the 55 carries an `action` to fall back on, so those instructions reached the AI
 * nowhere — and nothing looked broken, because `notes` still carried the
 * background. See design/ACTIONS.md#tree-recommendation-field-dropped.
 *
 * It could not be fixed on its own. Some of those sentences name a tool by the
 * working name used in the source logic tables rather than the title the
 * catalogue publishes, so emitting the field ungated would have started sending
 * advisors after pages that do not open — the exact harm the sibling availability
 * gate was built to prevent for template LISTS.
 *
 * So the field is emitted, sentence by sentence, and any sentence naming a tool
 * the catalogue cannot serve is held back. Mike's ruling of 2026-08-04 is the
 * rule being implemented: hold back the template recommendation, keep the
 * coaching.
 *
 * The last describe block is the one that matters most: it is a guard against the
 * whole FAMILY of this defect, not this instance of it. A field added to the tree
 * data that the prompt builder does not read now fails the build instead of
 * disappearing quietly for a year.
 */

const {
  withholdUnavailableNames,
  formatNodeForPrompt,
  loadLogicTrees
} = require('../../server/utils/logicTrees')
const { extractProseNames } = require('../../server/utils/toolNameScan')
const templates = require('../../data/templates.json')

// The app's own loader, not a raw require of the JSON — the file is an object
// with a `trees` key, and this test must see exactly what the engine sees.
const logicTrees = loadLogicTrees()

/** Titles the catalogue really carries, used so no test invents a template. */
const catalogueTitles = new Set(templates.map(t => t && t.title).filter(Boolean))

/** Every node in the corpus that keeps its instruction in `recommendation`. */
const recommendationNodes = []
for (const tree of logicTrees) {
  for (const node of (tree.nodes || [])) {
    if (node.recommendation) { recommendationNodes.push({ tree, node }) }
  }
}

describe('withholdUnavailableNames — one sentence at a time', () => {
  it('keeps a sentence naming a tool the catalogue carries', () => {
    const text = 'Use Stock Policies to document the reorder rules.'
    expect(catalogueTitles.has('Stock Policies')).toBe(true)
    expect(withholdUnavailableNames(text)).toBe(text)
  })

  it('withholds a sentence naming a tool the catalogue cannot serve', () => {
    // One of the seven named in the source logic tables but absent from the
    // export — design/ACTIONS.md#export-gap-six-tools.
    expect(withholdUnavailableNames('Deploy the Offshoring Review before deciding.')).toBe('')
  })

  it('keeps the coaching and drops only the sentence that names the tool', () => {
    // This is Mike's 2026-08-04 ruling in one assertion: a template
    // recommendation whose name the catalogue cannot serve is held back, and
    // advice that happens to sit beside it is not collateral damage.
    const kept = withholdUnavailableNames(
      'Deploy the Offshoring Review to compare costs. Document the decision criteria before you meet the board.'
    )
    expect(kept).toBe('Document the decision criteria before you meet the board.')
  })

  it('keeps a title whose last word is a NUMBER', () => {
    // The catalogue really publishes these, and the trees name them correctly.
    // An earlier scanner stopped at the digit and reported "Business Purchase
    // Assessment", a name that exists nowhere — which would have withheld eight
    // perfectly correct sentences and put nine rows on the Template Check screen
    // that needed no ruling. See server/utils/toolNameScan.js.
    expect(catalogueTitles.has('Business Purchase Assessment 1')).toBe(true)
    const text = 'Use Business Purchase Assessment 1 as the primary tool.'
    expect(extractProseNames(text)).toContain('Business Purchase Assessment 1')
    expect(withholdUnavailableNames(text)).toBe(text)
  })

  it('keeps both tools when one sentence names two', () => {
    expect(catalogueTitles.has('6 Hats')).toBe(true)
    const text = 'Use Quality Decisions and 6 Hats to structure the debate.'
    expect(withholdUnavailableNames(text)).toBe(text)
  })

  it('returns empty for empty, blank and non-string input', () => {
    expect(withholdUnavailableNames('')).toBe('')
    expect(withholdUnavailableNames('   ')).toBe('')
    expect(withholdUnavailableNames(null)).toBe('')
    expect(withholdUnavailableNames(undefined)).toBe('')
  })
})

describe('withholdUnavailableNames — when the catalogue cannot be read', () => {
  it('withholds everything, and says so loudly', () => {
    // DELIBERATELY THE OPPOSITE DIRECTION TO splitByAvailability's fail-safe.
    // There, an unreadable catalogue must not withhold — doing so would strip
    // every template from every prompt and mute the engine. Here, withholding is
    // exactly the behaviour of every build before this change, so it loses
    // nothing that was not already being lost, and it cannot name a tool the
    // advisor is unable to open.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.isolateModules(() => {
        const realFs = jest.requireActual('fs')
        jest.doMock('fs', () => Object.assign({}, realFs, {
          readFileSync: (file, encoding) => {
            if (String(file).includes('templates.json')) { throw new Error('simulated unreadable catalogue') }
            return realFs.readFileSync(file, encoding)
          }
        }))
        const isolated = require('../../server/utils/logicTrees')
        expect(isolated.withholdUnavailableNames('Use Stock Policies to document the rules.')).toBe('')
      })
      expect(spy.mock.calls.some(c => String(c[0]).includes('catalogue unavailable'))).toBe(true)
    } finally {
      spy.mockRestore()
    }
  })
})

describe('formatNodeForPrompt — the instruction now reaches the prompt', () => {
  it('emits a recommendation that names nothing unavailable', () => {
    const node = {
      branch_name: 'Test branch',
      type: 'recommendation',
      condition: 'The client asks about stock levels',
      recommendation: 'Use Stock Policies to document the reorder rules.'
    }
    expect(formatNodeForPrompt(node, [])).toContain('Action: Use Stock Policies to document the reorder rules.')
  })

  it('emits nothing at all when every sentence is withheld', () => {
    const node = {
      branch_name: 'Test branch',
      type: 'recommendation',
      condition: 'The client asks about offshoring',
      recommendation: 'Deploy the Offshoring Review.'
    }
    const out = formatNodeForPrompt(node, [])
    expect(out).not.toContain('Offshoring Review')
    expect(out).not.toContain('Action:')
  })

  it('fences the text when the tree is firm-authored', () => {
    // `recommendation` is firm-editable free text like `action` and `notes`, so it
    // must be fenced as data when the tree carries a firm override — otherwise a
    // firm could write instructions the model would read as its own.
    const node = {
      branch_name: 'Test branch',
      type: 'recommendation',
      condition: 'x',
      recommendation: 'Use Stock Policies to document the reorder rules.'
    }
    const fenced = formatNodeForPrompt(node, [], true)
    const plain = formatNodeForPrompt(node, [], false)
    expect(fenced).not.toBe(plain)
    expect(fenced).toContain('Stock Policies')
  })
})

describe('the corpus — what the real trees emit today', () => {
  it('never emits a tool name the catalogue cannot serve', () => {
    // THE INVARIANT. Everything else here is an example; this is the guarantee,
    // measured against all 42 tables rather than a sample.
    const leaks = []
    for (const { tree, node } of recommendationNodes) {
      const emitted = withholdUnavailableNames(node.recommendation)
      for (const name of extractProseNames(emitted)) {
        if (!catalogueTitles.has(name)) { leaks.push(`${tree.id}/${node.id}: "${name}"`) }
      }
    }
    expect(leaks).toEqual([])
  })

  it('delivers 34 branches whole and 8 in part, and withholds 13 entirely', () => {
    // A SNAPSHOT, AND IT IS MEANT TO MOVE. Every withheld branch is waiting on a
    // name being settled on the Template Check screen and applied to the tables.
    // When that happens this test fails and the number it names is the number of
    // instructions that started reaching advisors — which is the point of
    // recording it. Adjust it deliberately; never delete it.
    //
    // MOVED 2026-08-15, and this is exactly the event the note above describes.
    // Mike named the page behind the seven Get-the-Job Seminar branches —
    // "Design & Deliver" — and they went from 1 withheld + 6 partial to 7 whole:
    //   27 / 14 / 14  →  34 / 8 / 13
    // Seven instructions started reaching advisors that day. **21 branches still
    // lose text and nobody has ruled on them yet.**
    let full = 0
    let partial = 0
    let withheld = 0
    for (const { node } of recommendationNodes) {
      const out = withholdUnavailableNames(node.recommendation)
      if (!out) { withheld++ } else if (out === node.recommendation.trim()) { full++ } else { partial++ }
    }
    expect(recommendationNodes.length).toBe(55)
    expect({ full, partial, withheld }).toEqual({ full: 34, partial: 8, withheld: 13 })
  })
})

describe('GUARD — no tree field may be silently dropped again', () => {
  /**
   * Fields the prompt builder deliberately does not emit, each with the reason.
   * Structural fields drive the walk and mean nothing to the model.
   */
  const NOT_EMITTED = {
    id: 'structural — identifies the node to the walker',
    next_node: 'structural — a single-successor link, followed by the walker',
    stage: 'structural — the walker\'s position in a staged tree',
    next_stage: 'structural — the walker\'s next position',
    // ⚠ NOT structural. This is a real instruction on one node
    // (profitability_feasibility/pf_awareness) that reaches the AI nowhere: "Do
    // not use Trial Fit on an unaware client — it will cause map shock." It is
    // the SAME defect as `recommendation`, found by this guard the day it was
    // written, and it is listed here rather than fixed because emitting a new
    // field into live prompts is Mike's call, not a developer's. Raised with him
    // 2026-08-12.
    advisor_note: 'AWAITING MIKE — a dropped instruction, not a structural field'
  }

  it('the list of unemitted fields is honest — every one is really in the data', () => {
    // Guards the guard. An entry left here after its field is wired up would
    // quietly license the next silent drop.
    const seen = new Set()
    for (const tree of logicTrees) {
      for (const node of (tree.nodes || [])) {
        for (const key of Object.keys(node)) { seen.add(key) }
      }
    }
    for (const key of Object.keys(NOT_EMITTED)) {
      expect(seen.has(key)).toBe(true)
    }
  })

  it('the set of fields carried by the tree data has not grown', () => {
    // A new field is either wired into formatNodeForPrompt or explained in
    // NOT_EMITTED above — and until someone does one of those, the build stops.
    // This is the control the field-drop defect never had: `recommendation` sat
    // unread for a year because nothing compared the data to the formatter.
    const seen = new Set()
    for (const tree of logicTrees) {
      for (const node of (tree.nodes || [])) {
        for (const key of Object.keys(node)) { seen.add(key) }
      }
    }
    expect([...seen].sort()).toEqual([
      'action', 'advisor_note', 'branch_name', 'branches', 'condition',
      'gate_question', 'id', 'next_node', 'next_stage', 'notes', 'question',
      'recommendation', 'sales_process', 'stage', 'support_templates',
      'templates', 'templates_if_unsure', 'type'
    ])
  })

  it('every content-bearing field actually appears in the formatted block', () => {
    // Proof by exercise rather than by reading the function: a marker in each
    // field must come out the other side.
    const target = { id: 'target', branch_name: 'Target branch' }
    const node = {
      id: 'n1',
      branch_name: 'MARKER_BRANCH',
      type: 'assessment',
      condition: 'MARKER_CONDITION',
      gate_question: 'MARKER_GATE',
      action: 'MARKER_ACTION',
      // Lowercase on purpose: the scanner reads a capitalised word after a
      // connector as part of the tool name, so an ALL-CAPS marker here would be
      // glued onto "Stock Policies" and the sentence withheld — a fact about the
      // test's own marker, not about the gate.
      recommendation: 'Use Stock Policies to document marker_recommendation.',
      question: 'MARKER_QUESTION',
      sales_process: 'MARKER_SALES',
      templates: ['Stock Policies'],
      templates_if_unsure: ['6 Hats'],
      support_templates: ['Quality Decisions'],
      notes: 'MARKER_NOTES',
      branches: [{ answer_pattern: 'MARKER_PATTERN', next_node: 'target' }]
    }
    const out = formatNodeForPrompt(node, [target])
    for (const marker of [
      'MARKER_BRANCH', 'MARKER_CONDITION', 'MARKER_GATE', 'MARKER_ACTION',
      'marker_recommendation', 'MARKER_QUESTION', 'MARKER_SALES', 'MARKER_NOTES',
      'MARKER_PATTERN', 'Stock Policies', '6 Hats', 'Quality Decisions'
    ]) {
      expect(out).toContain(marker)
    }
  })
})
