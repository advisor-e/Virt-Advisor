'use strict'

/**
 * The Economic Analysis's KEY FIGURES block — the headline and key-indicator tiles on the
 * printed pack's opening page (item 44.4; Mike's ruling 2026-09-30: a tile is drawn only for
 * a figure found in the research's cited text).
 *
 * AI-output validation, so every shape is here: a good block, none at all, a figure the
 * sections never gave, a figure with no citation beside it, a headline carrying an unsourced
 * number, and a block too long.
 */

const { validateResearch, splitKeyFigures } = require('../../server/report/economicAnalysis/researchResult')
const { loadRun, responseFrom } = require('../fixtures/economicAnalysisRuns')

const SECTIONS = [
  '1. Global economic outlook',
  'World trade grew 1.9% in the June 2026 quarter. Energy averaged US$96.80 per barrel.',
  '',
  '2. Local and regional outlook',
  'Consumer prices rose 3.4%. Average weekly earnings were 1,046.88.',
  '',
  '3. Sector outlook',
  'Insured lives numbered 2.55 million. The average premium was 1,902.',
  '',
  '4. What this means for the business under review',
  'Conditions are mixed and cost pressure persists.',
  '',
  '5. What could not be sourced',
  'Local commercial rents could not be sourced.'
].join('\n')

const CITES = [
  { url: 'https://wto.org/a', at: '1.9%' },
  { url: 'https://iea.org/b', at: 'US$96.80' },
  { url: 'https://cso.ie/c', at: '3.4%' },
  { url: 'https://centralbank.ie/d', at: '1,046.88' },
  { url: 'https://hia.ie/e', at: '2.55 million' },
  { url: 'https://gov.ie/f', at: '1,902' }
]

function run (block) {
  return validateResearch(responseFrom(SECTIONS + (block === undefined ? '' : '\n\n' + block), CITES))
}

describe('the KEY FIGURES block', () => {
  test('a good block: the headline, and each tile sourced from the citation beside its figure', () => {
    const r = run([
      '**KEY FIGURES**',
      'HEADLINE: Trade is growing modestly while prices keep rising.',
      'FIGURE: World trade | +1.9% | June 2026 quarter',
      '- FIGURE: **Consumer prices** | 3.4% | March 2026'
    ].join('\n'))
    expect(r.ok).toBe(true)
    expect(r.data.headline).toBe('Trade is growing modestly while prices keep rising.')
    expect(r.data.keyFigures).toEqual([
      { what: 'World trade', figure: '+1.9%', date: 'June 2026 quarter', url: 'https://wto.org/a', host: 'wto.org' },
      // A date the sections never give is dropped, not shown.
      { what: 'Consumer prices', figure: '3.4%', date: '', url: 'https://cso.ie/c', host: 'cso.ie' }
    ])
    // The block is not research: it is gone from the text and from section 5.
    expect(r.data.text).not.toContain('KEY FIGURES')
    expect(r.data.sections[4].body).not.toContain('HEADLINE')
  })

  test('no block at all: the research passes exactly as before, with no tiles', () => {
    const r = run()
    expect(r.ok).toBe(true)
    expect(r.data.headline).toBeNull()
    expect(r.data.keyFigures).toEqual([])
  })

  test('a figure the sections never gave, or one inside section 4 or 5, is left out', () => {
    const r = run('KEY FIGURES\nFIGURE: Unemployment | 5.6% | June 2026\nFIGURE: Premium | 1,902 |')
    expect(r.data.keyFigures.map(k => k.figure)).toEqual(['1,902'])
  })

  test('a figure with no citation beside it is left out', () => {
    const uncited = validateResearch(responseFrom(SECTIONS + '\n\nKEY FIGURES\nFIGURE: Earnings | 1,046.88 |',
      CITES.filter(c => c.at !== '1,046.88').concat([{ url: 'https://extra.org/x', at: 'Insured' }])))
    expect(uncited.ok).toBe(true)
    expect(uncited.data.keyFigures).toEqual([])
  })

  test('a headline carrying a number the sections do not is dropped', () => {
    expect(run('KEY FIGURES\nHEADLINE: Growth will reach 7.5% next year.').data.headline).toBeNull()
    expect(run('KEY FIGURES\nHEADLINE: Trade grew 1.9% and prices 3.4%.').data.headline).toBe('Trade grew 1.9% and prices 3.4%.')
  })

  test('at most six tiles; malformed lines are ignored, never fatal', () => {
    const lines = ['KEY FIGURES', 'FIGURE: no pipes here', 'FIGURE: | 1.9% |', 'FIGURE: Trade | nine |']
    for (let i = 0; i < 8; i++) { lines.push('FIGURE: Premium ' + i + ' | 1,902 |') }
    const r = run(lines.join('\n'))
    expect(r.ok).toBe(true)
    expect(r.data.keyFigures.length).toBe(6)
  })

  test('the recorded runs, which carry no block, still validate as they did', () => {
    const r = validateResearch(loadRun(4))
    expect(r.ok).toBe(true)
    expect(r.data.keyFigures).toEqual([])
  })

  test('splitKeyFigures takes the last heading, so the words in the prose cannot cut early', () => {
    const { body, block } = splitKeyFigures('a\nKEY FIGURES\nb\nKEY FIGURES\nHEADLINE: x')
    expect(body).toContain('b')
    expect(block.trim()).toBe('HEADLINE: x')
  })
})
