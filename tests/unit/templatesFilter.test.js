'use strict'

// CB-27: filterTemplatesByQuery's abbreviation blind spot. Words of exactly 3
// letters (EOY, FBT, KPI, tax) were silently dropped (length > 3), and dotted
// titles ("E.O.Y") could never title-match their plain form. Locks the fix +
// guards the behaviours around it (stop-words, plural title matching, the
// empty-query fallback).

const { filterTemplatesByQuery } = require('../../server/utils/templates')

const POOL = [
  { title: 'E.O.Y Meeting', topic: 'Client Meetings', section: 'Do the Job', subSection: 'EOY Notes & Docs', purpose: 'End of year meeting framework', tags: [] },
  { title: 'EOY Quiz', topic: 'Quiz', section: 'Do the Job', subSection: 'EOY Notes & Docs', purpose: 'Knowledge check', tags: [] },
  { title: 'Cafe', topic: 'Revenue Models', section: 'Do the Job', purpose: 'Cafe revenue model', tags: [] },
  { title: 'Sales Psychology (Basics)', topic: 'Selling', section: 'Get the Job', purpose: 'Foundations of advisory selling', tags: [] }
]

describe('filterTemplatesByQuery abbreviations (CB-27)', () => {
  test("a 3-letter abbreviation is a real search word: 'EOY meeting prep' surfaces both EOY templates first", () => {
    const hits = filterTemplatesByQuery(POOL, 'EOY meeting prep')
    const titles = hits.map(t => t.title)
    expect(titles.slice(0, 2)).toEqual(expect.arrayContaining(['E.O.Y Meeting', 'EOY Quiz']))
  })

  test("dot-blind both ways: searching 'e.o.y' finds the undotted 'EOY Quiz', and 'eoy' finds the dotted 'E.O.Y Meeting'", () => {
    expect(filterTemplatesByQuery(POOL, 'e.o.y review').map(t => t.title)).toContain('EOY Quiz')
    expect(filterTemplatesByQuery(POOL, 'eoy review').map(t => t.title)).toContain('E.O.Y Meeting')
  })

  test('3-letter STOP words still contribute nothing: an all-stop-word query falls back to the unranked slice', () => {
    const hits = filterTemplatesByQuery(POOL, 'the and you for')
    expect(hits).toHaveLength(POOL.length) // fallback: no scorable words → first N unranked
  })

  test("plural/derived title matching is unharmed: 'cafes' still finds 'Cafe'", () => {
    expect(filterTemplatesByQuery(POOL, 'struggling cafes').map(t => t.title)).toContain('Cafe')
  })

  test('non-matching queries still return only scored templates', () => {
    const hits = filterTemplatesByQuery(POOL, 'blockchain tokenomics')
    expect(hits).toEqual([])
  })
})
