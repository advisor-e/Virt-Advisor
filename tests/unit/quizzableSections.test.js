'use strict'

// CB-31 Phase 3 — which library areas the Quizzes editor may list.
// Mike's ruling 2026-07-22, from the owner's own section headers documents:
// advisory-content areas only. Two Do-the-Job pages carry no sub-section at
// all, so before this rule the editor showed them under a heading the app had
// invented — a group that exists nowhere in the firm's library.

const { quizzablePages } = require('../../server/routes/firmManager')
const { listTemplatePages } = require('../../server/utils/resolveTemplateName')
const QUIZZABLE = require('../../data/quizzable-sections.json')
const BASE_QUIZZES = require('../../data/course-quizzes.json')

const OFFICIAL_DO_THE_JOB = QUIZZABLE.restrictions['Do the Job']

describe('the rule is data, not code', () => {
  test('Do the Job is restricted to the 10 areas in the headers document', () => {
    expect(OFFICIAL_DO_THE_JOB).toEqual([
      'Help',
      'Client On Boarding',
      'EOY Notes & Docs',
      'Growth Framework',
      'Revenue & Feasibility Models',
      'General Tools',
      'Lite Fundamentals',
      'Strategic Tools',
      'Specialist Tools',
      'Governance Tools'
    ])
  })

  // Get Organised's areas are named like permissions ("Firm Manager Access")
  // but its headers document describes real material. Restricting them would
  // delete a whole section of the firm's library from the editor.
  test('only Do the Job is restricted — the other sections are untouched', () => {
    expect(Object.keys(QUIZZABLE.restrictions)).toEqual(['Do the Job'])
  })
})

describe('quizzablePages', () => {
  const pages = listTemplatePages()
  const kept = quizzablePages(pages)

  test('drops the pages with no sub-section, so no invented heading appears', () => {
    const blank = kept.filter(p => !p.subSection)
    expect(blank).toEqual([])
  })

  test('drops every Do-the-Job area absent from the headers document', () => {
    const strays = kept
      .filter(p => p.section === 'Do the Job')
      .filter(p => !OFFICIAL_DO_THE_JOB.includes(p.subSection))
    expect(strays).toEqual([])
  })

  test('keeps every Get the Job and Get Organised page', () => {
    const before = pages.filter(p => p.section !== 'Do the Job').length
    const after = kept.filter(p => p.section !== 'Do the Job').length
    expect(after).toBe(before)
    expect(after).toBeGreaterThan(0)
  })

  test('an unrestricted section is passed through, not silently dropped', () => {
    const invented = [{ page: 'id-x', section: 'Brand New Section', subSection: 'Anything', title: 'T' }]
    expect(quizzablePages(invented)).toHaveLength(1)
  })

  test('still yields real pages — the filter must not empty the editor', () => {
    expect(kept.length).toBeGreaterThan(200)
    expect(kept.length).toBeLessThan(pages.length)
  })

  // Mike's ruling 2026-07-22: areas appear in the order of his own headers
  // documents, not the order the export happens to store them in. The screen
  // builds its rail from this list's order, so the order is pinned here.
  describe('order follows the headers documents', () => {
    const seen = (arr, key) => arr.reduce((acc, p) => {
      if (acc[acc.length - 1] !== p[key]) { acc.push(p[key]) }
      return acc
    }, [])

    test('sections run Do the Job, Get the Job, Get Organised', () => {
      expect(seen(kept, 'section')).toEqual(['Do the Job', 'Get the Job', 'Get Organised'])
    })

    test('Do the Job areas match the headers document exactly', () => {
      const subs = seen(kept.filter(p => p.section === 'Do the Job'), 'subSection')
      expect(subs).toEqual(OFFICIAL_DO_THE_JOB)
    })

    test('each section is contiguous — an area never appears twice', () => {
      for (const section of ['Do the Job', 'Get the Job', 'Get Organised']) {
        const subs = seen(kept.filter(p => p.section === section), 'subSection')
        expect(new Set(subs).size).toBe(subs.length)
      }
    })

    test('a named area outranks an unnamed one, which falls to the end', () => {
      const rows = [
        { section: 'Get the Job', subSection: 'Facilitation Skills', title: 'unnamed', page: 'p1' },
        { section: 'Get the Job', subSection: 'Marketing', title: 'named', page: 'p2' }
      ]
      expect(quizzablePages(rows).map(r => r.title)).toEqual(['named', 'unnamed'])
    })
  })

  // The filter hides pages. If one already carried a quiz, that quiz would
  // become unreachable in the editor while still being served to advisors.
  test('no existing quiz bank is hidden by the filter', () => {
    const visible = new Set(kept.map(p => p.title))
    const bankKeys = Object.keys(BASE_QUIZZES.banks || {}).filter(k => !k.startsWith('_'))
    expect(bankKeys.length).toBeGreaterThan(0)
    for (const key of bankKeys) {
      expect(visible.has(key)).toBe(true)
    }
  })
})
