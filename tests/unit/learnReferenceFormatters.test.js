'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// LEARN-MODE REFERENCE FORMATTERS (2026-07-30).
//
// Thirteen functions in server/utils/logicTrees.js turn a companion reference JSON
// into the detailed coaching block that goes into the AI's prompt. They were the
// single largest untested region in the repo — ~500 lines, 0% covered — found while
// rebuilding the coverage gate (design/COVERAGE-DEBT.md).
//
// They are worth testing for a reason that has nothing to do with the coverage number.
// Each one opens with `const ref = loadReferenceFile('x.json'); if (!ref) { return '' }`
// and then interpolates the file's keys straight into template literals. So:
//
//   - Rename or lose a reference file and the formatter returns '' — the advisor gets a
//     Learn-mode answer stripped of its entire coaching reference, with no error anywhere.
//   - Drop or rename a KEY inside the file and `${ref.objective}` renders the literal
//     string "undefined" into the prompt the model is asked to coach from.
//
// Both fail silently in production. These tests are the loud version.
// ─────────────────────────────────────────────────────────────────────────────

const data = require('../../data/logic_trees.json')
const logicTrees = require('../../server/utils/logicTrees')

const { buildLearnReferenceText } = logicTrees

// treeId → its exported formatter, the data file it reads, and the heading it must open with.
// Add a row here whenever a new learn-mode tree gets a reference file (the same moment you
// add it to LEARN_REFERENCE_FORMATTERS in logicTrees.js).
const REFERENCES = [
  { id: 'trial_fit', fn: 'formatTrialFitReferenceForPrompt', file: 'trial-fit-reference.json', heading: '## Trial Fit Method — Detailed Coaching Reference' },
  { id: 'cautious_reveal', fn: 'formatCautiousRevealReferenceForPrompt', file: 'cautious-reveal-reference.json', heading: '## Cautious Reveal Method — Detailed Coaching Reference' },
  { id: 'public_speaking', fn: 'formatSeminarsReferenceForPrompt', file: 'powerful-seminars.json', heading: '## Powerful Seminars Reference — Detailed Coaching Content' },
  { id: 'eoy_meeting', fn: 'formatEoyReferenceForPrompt', file: 'eoy-reference.json', heading: '## End of Year Meeting — Detailed Coaching Reference' },
  { id: 'heald_matrix', fn: 'formatHealdMatrixReferenceForPrompt', file: 'heald-matrix-reference.json', heading: '## The Heald Matrix — Detailed Coaching Reference' },
  { id: 'capacity_capability_opportunity', fn: 'formatCCOReferenceForPrompt', file: 'capacity-capability-opportunity-reference.json', heading: '## Capacity, Capability, Opportunity — Detailed Coaching Reference' },
  { id: 'conflict_meeting', fn: 'formatConflictMeetingReferenceForPrompt', file: 'conflict-meeting-reference.json', heading: '## Framing a Conflict Meeting — Detailed Coaching Reference' },
  { id: 'reveal_growth_curve', fn: 'formatGrowthCurveRevealReferenceForPrompt', file: 'growth-curve-reveal-reference.json', heading: '## Revealing the Growth Curve — Detailed Coaching Reference' },
  { id: 'facilitation_101', fn: 'formatFacilitationReferenceForPrompt', file: 'facilitation-reference.json', heading: '## Facilitation 101 — Detailed Coaching Reference' },
  { id: 'demings_volatility', fn: 'formatDemingsVolatilityReferenceForPrompt', file: 'demings-volatility-reference.json', heading: "## Deming's Theory of Volatility — Detailed Coaching Reference" },
  { id: 'working_capital_cycle', fn: 'formatWorkingCapitalCycleReferenceForPrompt', file: 'working-capital-cycle-reference.json', heading: '## Working Capital Cycle — Detailed Coaching Reference' },
  { id: 'ratio_analysis', fn: 'formatRatioAnalysisReferenceForPrompt', file: 'ratio-analysis-reference.json', heading: '## Ratio Analysis — Detailed Coaching Reference' },
  { id: 'dashboard_discussions', fn: 'formatDashboardDiscussionsReferenceForPrompt', file: 'dashboard-discussions-reference.json', heading: '## Dashboard Discussions — Detailed Coaching Reference' }
]

function tree (id) { return (data.trees || []).find(t => t.id === id) }

describe.each(REFERENCES)('learn reference formatter — $id', ({ id, fn, file, heading }) => {
  test('is exported under the name the reference map uses', () => {
    expect(typeof logicTrees[fn]).toBe('function')
  })

  test(`reads data/${file} — a formatter returning '' means the file was renamed or lost`, () => {
    const out = logicTrees[fn]()
    expect(typeof out).toBe('string')
    expect(out).not.toBe('')
  })

  test('opens with its documented heading', () => {
    expect(logicTrees[fn]().startsWith(heading)).toBe(true)
  })

  test('renders a body, not just the heading', () => {
    expect(logicTrees[fn]().length).toBeGreaterThan(heading.length + 200)
  })

  // The important one. `${ref.someKey}` on a missing key puts the literal word
  // "undefined" into the coaching prompt, and nothing else in the system notices.
  //
  // Match VALUE POSITIONS only — after a label, as a bullet, or inside bold — never the
  // bare word. The Heald Matrix reference legitimately contains the sentence "do not leave
  // the next step undefined", so a blanket /undefined/ check fails on correct content.
  // (Learned the hard way: the blanket version was written first and this caught it.)
  test('interpolates no "undefined" into a value position in the coaching prompt', () => {
    const out = logicTrees[fn]()
    expect(out).not.toMatch(/:\s*undefined/)
    expect(out).not.toMatch(/^[•*\s-]*undefined\b/m)
    expect(out).not.toMatch(/\*\*undefined\*\*/)
  })

  test('is reachable in production — the tree exists, is mode "learn", and carries the block', () => {
    const t = tree(id)
    expect(t).toBeTruthy()
    expect(t.mode).toBe('learn')

    const full = buildLearnReferenceText(t)
    expect(full).toContain(heading)
    // buildLearnReferenceText joins tree prompt and reference with a '---' rule.
    expect(full).toContain('\n\n---\n\n')
  })
})

describe('the reference map as a whole', () => {
  test('every formatter exported for a reference file is covered by a row above', () => {
    const exported = Object.keys(logicTrees).filter(k => /^format.*ReferenceForPrompt$/.test(k))
    const tested = REFERENCES.map(r => r.fn)
    expect(exported.sort()).toEqual(tested.sort())
  })

  test('a tree with no reference file still returns its own prompt, with no rule appended', () => {
    // get_marketing is a learn tree with no companion reference file.
    const full = buildLearnReferenceText(tree('get_marketing'))
    expect(full).toBeTruthy()
    expect(full).not.toContain('\n\n---\n\n')
  })

  test('returns null for anything that is not a learn tree', () => {
    expect(buildLearnReferenceText(null)).toBeNull()
    expect(buildLearnReferenceText({ id: 'x', mode: 'client' })).toBeNull()
  })
})
