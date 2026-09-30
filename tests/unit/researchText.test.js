'use strict'

/**
 * The Economic Analysis text parser (utils/researchText.js) — lists and tables.
 *
 * Before 2026-09-30 a table the model wrote printed in a lender's pack as one run-on line of
 * pipes and dashes, and a bullet list as one paragraph. The shapes below are the ones a live
 * run produced (section 5, "What could not be sourced").
 */

const { paragraphsOf } = require('../../utils/researchText')

/** A token run back to plain text, for comparing. */
const plain = tokens => tokens.map(t => t.s).join('')

describe('paragraphsOf — lists and tables', () => {
  it('a table: head row, body rows, divider dropped, a link in a cell kept as a link', () => {
    const body = [
      '| Missing evidence | Intended use | Treatment |',
      '|---|---|---|',
      '| Current sales | Installed base | None stated; see [stats.govt.nz](https://stats.govt.nz/x). |',
      '| Wages | Labour cost | Context only. |'
    ].join('\n')
    const [block] = paragraphsOf(body)
    expect(block.table.head.map(plain)).toEqual(['Missing evidence', 'Intended use', 'Treatment'])
    expect(block.table.rows.map(r => r.map(plain))).toEqual([
      ['Current sales', 'Installed base', 'None stated; see stats.govt.nz.'],
      ['Wages', 'Labour cost', 'Context only.']
    ])
    expect(block.table.rows[0][2].find(t => t.t === 'link').url).toBe('https://stats.govt.nz/x')
  })

  it('a bullet list: one item per bullet, bold kept, a wrapped line stays with its item', () => {
    const body = '- **Assessment end date:** Not supplied.\n- **Location:** Not supplied.\n  Regional analysis stops here.'
    const [block] = paragraphsOf(body)
    expect(block.ordered).toBe(false)
    expect(block.list.map(plain)).toEqual([
      'Assessment end date: Not supplied.',
      'Location: Not supplied. Regional analysis stops here.'
    ])
    expect(block.list[0][0]).toEqual({ t: 'bold', s: 'Assessment end date:', url: '' })
  })

  it('a heading with its list in the same block is split into the two', () => {
    const blocks = paragraphsOf('### Business scope\n- One\n- Two')
    expect(blocks[0]).toEqual({ heading: true, tokens: [{ t: 'text', s: 'Business scope', url: '' }] })
    expect(blocks[1].list.map(plain)).toEqual(['One', 'Two'])
  })

  it('a numbered list is ordered; prose with a figure like 4.1% is not a list', () => {
    expect(paragraphsOf('1. First\n2. Second')[0]).toMatchObject({ ordered: true })
    const [prose] = paragraphsOf('4.1% annual inflation\nin the June quarter.')
    expect(prose.list).toBeUndefined()
    expect(plain(prose.tokens)).toBe('4.1% annual inflation in the June quarter.')
  })
})
