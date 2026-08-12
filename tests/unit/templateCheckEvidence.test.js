'use strict'

/**
 * The evidence attached to every Template Check row — the sentence, the
 * neighbouring branches, and every candidate rather than only the suggestion.
 *
 * Built to design/mockups/template-check-evidence-row.html and
 * design/mockups/template-check-table-context.html, both approved by Mike on
 * 2026-08-12.
 *
 * TWO KINDS OF TEST LIVE HERE, DELIBERATELY:
 *
 *  1. The feature works — a row carries its sentence, its neighbours, and the
 *     documents it might be.
 *  2. **Nothing was taken away.** The suggestion, the verdict and the counts are
 *     what they were before the evidence existed. This half matters more: the
 *     screen's whole value is that it never guesses, and a weak match leaking
 *     into a suggestion would undo the 2026-08-04 lesson silently — no test
 *     failing, no error, just a confident wrong answer back on Mike's queue.
 */

const {
  runTemplateCheck,
  findCandidate,
  rankCandidates,
  sentenceWith,
  neighboursOf,
  buildCatalogue,
  VERDICT
} = require('../../server/utils/templateCheck')

/** A two-branch tree in the `nodes` shape. */
function tree (nodes) {
  return { id: 't1', name: 'Test Table', nodes }
}

const CATALOGUE = [
  { title: 'Board White Paper', purpose: 'How to pitch to the board.', section: 'Do the Job', subSection: 'Governance Tools' },
  { title: 'Annual Board Plan', purpose: 'The board year, scheduled.', section: 'Do the Job', subSection: 'Governance Tools' },
  { title: 'Cash Tactics', purpose: 'Short-term cash moves.', section: 'Do the Job', subSection: 'Cashflow' }
]

describe('the sentence a name was written in', () => {
  it('returns only the sentence holding the name, not the whole instruction', () => {
    const prose = 'Open with the quarterly review. Use the Decision Workpaper for big calls. Close on actions.'
    expect(sentenceWith(prose, 'Decision Workpaper')).toBe('Use the Decision Workpaper for big calls.')
  })

  it('falls back to the whole instruction rather than showing nothing', () => {
    // A name found by the prose scanner but not by a plain substring search must
    // still produce evidence. An empty panel reads as "no evidence exists",
    // which is the fault this screen was built to end.
    expect(sentenceWith('One run-on instruction with no full stop', 'Nothing Here'))
      .toBe('One run-on instruction with no full stop')
  })

  it('is empty for a formal template-list reference, which has no sentence', () => {
    const report = runTemplateCheck({
      trees: [tree([
        { id: 'n1', branch_name: 'B1', condition: 'c', action: 'a', templates: ['Missing Tool'] }
      ])],
      templates: CATALOGUE
    })
    const f = report.findings[0]
    expect(f.sentence).toBe('')
    // What stands in its place: which branches are asking for the document.
    expect(f.listedIn).toEqual({ field: 'templates', branches: ['B1'] })
  })

  it('names every branch of the table asking for the same document', () => {
    const report = runTemplateCheck({
      trees: [tree([
        { id: 'n1', branch_name: 'First', condition: 'c', action: 'a', templates: ['Missing Tool'] },
        { id: 'n2', branch_name: 'Second', condition: 'c', action: 'a', templates: ['Missing Tool'] }
      ])],
      templates: CATALOGUE
    })
    expect(report.findings[0].listedIn.branches).toEqual(['First', 'Second'])
  })
})

describe('the branch among its neighbours', () => {
  const RULES = [
    { id: 'a', branchName: 'A', condition: 'ca', prose: 'pa' },
    { id: 'b', branchName: 'B', condition: 'cb', prose: 'pb' },
    { id: 'c', branchName: 'C', condition: 'cc', prose: 'pc' }
  ]

  it('shows one above and one below', () => {
    const n = neighboursOf(RULES, 1)
    expect(n.map(x => x.branchName)).toEqual(['A', 'B', 'C'])
    expect(n[1].state).toBe('here')
  })

  it('pads nothing at the first branch', () => {
    // 🔴 Ruled by Mike 2026-08-12: "1 above and below WHEN POSSIBLE". A blank row
    // would suggest something was hidden above the first branch of a table.
    const n = neighboursOf(RULES, 0)
    expect(n.map(x => x.branchName)).toEqual(['A', 'B'])
    expect(n[0].state).toBe('here')
  })

  it('pads nothing at the last branch', () => {
    const n = neighboursOf(RULES, 2)
    expect(n.map(x => x.branchName)).toEqual(['B', 'C'])
    expect(n[1].state).toBe('here')
  })

  it('cuts long branch text rather than letting a row run to a paragraph', () => {
    const long = 'x'.repeat(400)
    const [only] = neighboursOf([{ id: 'a', branchName: 'A', condition: long, prose: long }], 0)
    expect(only.condition.length).toBeLessThanOrEqual(200)
    expect(only.condition.endsWith('…')).toBe(true)
  })
})

describe('what a neighbouring branch came to', () => {
  /** Two branches, each naming a tool the catalogue does not answer to. */
  const TREES = [tree([
    { id: 'n1', branch_name: 'Above', condition: 'c', action: 'Use the FM Board Paper for this.' },
    { id: 'n2', branch_name: 'Here', condition: 'c', action: 'Use the Decision Workpaper for this.' }
  ])]

  it('shows the title a neighbour was ruled to — the case the design exists for', () => {
    // `Decision Workpaper` matches nothing and never will. What answers it is the
    // branch above, already ruled to a real document whose name shares no words
    // with it. No matcher finds that; reading the table does.
    const report = runTemplateCheck({
      trees: TREES,
      templates: CATALOGUE,
      rulings: {
        't1::n1::fm board paper': { verdict: 'ruled', title: 'Board White Paper' }
      }
    })
    const here = report.findings.find(f => f.name === 'Decision Workpaper')
    const above = here.neighbours.find(n => n.branchName === 'Above')
    expect(above.state).toBe('settled')
    expect(above.title).toBe('Board White Paper')
  })

  it('says a neighbour is still open, in the verdict wording already approved', () => {
    const report = runTemplateCheck({ trees: TREES, templates: CATALOGUE })
    const here = report.findings.find(f => f.name === 'Decision Workpaper')
    const above = here.neighbours.find(n => n.branchName === 'Above')
    expect(above.state).toBe('open')
    // Reused, never re-worded: the neighbour column borrows the verdict names
    // Mike approved on 2026-08-05 rather than inventing a third vocabulary.
    expect([VERDICT.NONE, VERDICT.MAYBE]).toContain(above.verdict)
  })

  it('counts a branch that raised nothing as settled', () => {
    const report = runTemplateCheck({
      trees: [tree([
        { id: 'n1', branch_name: 'Clean', condition: 'c', action: 'Nothing to see.' },
        { id: 'n2', branch_name: 'Here', condition: 'c', action: 'Use the Decision Workpaper for this.' }
      ])],
      templates: CATALOGUE
    })
    const here = report.findings.find(f => f.name === 'Decision Workpaper')
    expect(here.neighbours.find(n => n.branchName === 'Clean').state).toBe('settled')
  })
})

describe('every candidate, not only the suggestion', () => {
  it('shows the alternatives that scored near the suggestion', () => {
    const cat = buildCatalogue([
      { title: 'Sales Tracker Opt A', purpose: 'A', section: 'Get the Job', subSection: 'Sales Process Design' },
      { title: 'Sales Tracker Opt B', purpose: 'B', section: 'Get the Job', subSection: 'Sales Process Design' }
    ])
    const { candidates } = rankCandidates('Sales Tracker Thing', cat)
    expect(candidates.map(c => c.title)).toEqual(['Sales Tracker Opt A', 'Sales Tracker Opt B'])
    // Equal scores: neither is dimmed, because neither is the weaker reading.
    expect(candidates.every(c => c.weak === false)).toBe(true)
  })

  it('carries where each document lives, so near-identical names can be told apart', () => {
    const cat = buildCatalogue(CATALOGUE)
    const { candidates } = rankCandidates('Board White Paper Extra', cat)
    expect(candidates[0].path).toBe('Do the Job › Governance Tools')
    expect(candidates[0].summary).toBe('How to pitch to the board.')
  })

  it('shows the closest records as weak where nothing scored at all', () => {
    const cat = buildCatalogue(CATALOGUE)
    const { best, candidates } = rankCandidates('Board Meeting Snacks', cat)
    expect(best).toBeNull()
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every(c => c.weak === true)).toBe(true)
  })

  it('🔴 never lets a weak record become a suggestion', () => {
    // The safety claim. "Weaker matches" exists so a dead-end row can be judged;
    // the moment one of them could be offered as "Probably this", the screen is
    // guessing again — which is exactly the 2026-08-04 failure.
    const report = runTemplateCheck({
      trees: [tree([{ id: 'n1', branch_name: 'B', condition: 'c', action: 'Use the Board Meeting Snacks for this.' }])],
      templates: CATALOGUE
    })
    const f = report.findings[0]
    expect(f.verdict).toBe(VERDICT.NONE)
    expect(f.candidate).toBeNull()
    expect(f.candidates.every(c => c.weak === true)).toBe(true)
  })

  it('🔴 offers exactly what it offered before the evidence existed', () => {
    // findCandidate is the one answer to "what would this screen suggest", and it
    // is now built from the ranked list. Same suggestion, same reason, same score.
    const cat = buildCatalogue(CATALOGUE)
    for (const name of ['Board White Paper Extra', 'Annual Board', 'Cash Tactics Plan', 'Nothing Like This']) {
      const best = rankCandidates(name, cat).best
      const suggested = findCandidate(name, cat)
      if (!best) {
        expect(suggested).toBeNull()
      } else {
        expect(suggested).toEqual({
          title: best.title, score: best.score, why: best.why, summary: best.summary
        })
      }
    }
  })
})

describe('against the real logic tables and the real catalogue', () => {
  const report = runTemplateCheck({})

  it('attaches evidence to every row, whatever its verdict', () => {
    // A ruling is reversible, so a ruled row needs the same evidence as an open
    // one. Anything less makes "Change my mind" a decision taken blind.
    expect(report.findings.length).toBeGreaterThan(0)
    for (const f of report.findings) {
      expect(Array.isArray(f.candidates)).toBe(true)
      expect(Array.isArray(f.neighbours)).toBe(true)
      expect(f.neighbours.length).toBeGreaterThanOrEqual(1)
      expect(f.neighbours.length).toBeLessThanOrEqual(3)
      expect(f.neighbours.filter(n => n.state === 'here')).toHaveLength(1)
      expect(f.tableBranches).toBeGreaterThanOrEqual(f.neighbours.length)
    }
  })

  it('never shows more of a table than the table has', () => {
    for (const f of report.findings) {
      if (f.tableBranches === 1) { expect(f.neighbours).toHaveLength(1) }
      if (f.tableBranches === 2) { expect(f.neighbours).toHaveLength(2) }
    }
  })

  it('🔴 the suggestion on every real row is unchanged by the candidate list', () => {
    for (const f of report.findings) {
      if (!f.candidate) { continue }
      const strongest = f.candidates.find(c => !c.weak)
      expect(strongest).toBeDefined()
      expect(f.candidate.title).toBe(strongest.title)
    }
  })

  it('finds the branch above Decision Workpaper — the row the design was drawn for', () => {
    const f = report.findings.find(x => x.name === 'Decision Workpaper')
    expect(f).toBeDefined()
    expect(f.neighbours.map(n => n.branchName)).toContain('Strategic Proposals — Major Capital or Market Decision')
    expect(f.sentence).toContain('Decision Workpaper')
  })
})
