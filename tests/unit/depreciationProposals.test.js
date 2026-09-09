'use strict'

/**
 * The PENDING side of item 4.78 — the documents a scope has loaded and what was read out of
 * each, kept in a store the rate resolver never reads.
 *
 * 🔴 THE ONE PROPERTY THIS FILE EXISTS FOR: a record here can hold rates, and holding them
 * changes no forecast. That is what makes "nothing unapproved reaches a forecast" structural
 * (P1, FR-008) rather than a flag somebody has to remember. The proof that the resolver
 * ignores it is in the route tests, where both stores are live at once; the proof that this
 * store cannot be corrupted into something a screen would show wrongly is here.
 */

const p = require('../../server/utils/depreciationProposals')
const { CATEGORY_KEYS } = require('../../server/utils/depreciationRates')

const READING = {
  document: 'IR265 — General depreciation rates',
  published: '2023-10',
  country: 'NZ',
  firstYearRuleFound: false,
  categories: {
    vehicles: {
      label: 'Motor vehicles',
      method: 'dv',
      dvRate: 0.5,
      slRate: 0.4,
      lifeYears: 4,
      source: { document: 'IR265', page: '61', published: '2023-10' }
    }
  },
  unmatched: CATEGORY_KEYS.filter(k => k !== 'vehicles'),
  refusedRows: 0
}

function record (over) {
  return Object.assign(p.documentRecord({
    filename: 'ir265.pdf',
    country: 'NZ',
    loadedBy: 'manager@example.com',
    reading: READING
  }), over || {})
}

describe('a record of one read', () => {
  test('a successful read is pending, and carries what was read', () => {
    const r = record()
    expect(r.status).toBe('pending')
    expect(r.country).toBe('NZ')
    expect(r.documentName).toBe('IR265 — General depreciation rates')
    expect(r.published).toBe('2023-10')
    expect(r.loadedBy).toBe('manager@example.com')
    expect(r.categories.vehicles.dvRate).toBe(0.5)
    expect(r.unmatched).not.toContain('vehicles')
    expect(r.decidedAt).toBeNull()
  })

  test('a read that produced nothing is recorded as unreadable, not dropped', () => {
    // A manager who loaded three files has to be able to see which one failed.
    const r = p.documentRecord({ filename: 'scan.pdf', country: 'NZ', loadedBy: 'm@e.com', reading: null })
    expect(r.status).toBe('unreadable')
    expect(r.categories).toEqual({})
    expect(r.unmatched).toEqual(CATEGORY_KEYS)
    expect(r.published).toBeNull()
  })

  test('two records never share an id', () => {
    expect(record().id).not.toBe(record().id)
    expect(p.newDocumentId()).toMatch(/^[0-9a-f]{24}$/)
  })

  test('the country is normalised, so one country cannot end up with two spellings', () => {
    expect(p.documentRecord({ filename: 'x.pdf', country: 'nz', loadedBy: 'm', reading: null }).country).toBe('NZ')
  })
})

describe('a stored list is validated on the way back out', () => {
  test('a sound list survives whole', () => {
    const store = { documents: [record()] }
    const out = p.validateProposals(store)
    expect(out.ok).toBe(true)
    expect(out.value.documents).toHaveLength(1)
  })

  test.each([
    ['null', null],
    ['undefined', undefined]
  ])('%s reads as an empty list rather than an error', (_label, value) => {
    const out = p.validateProposals(value)
    expect(out.ok).toBe(true)
    expect(out.value.documents).toEqual([])
  })

  test.each([
    ['an array', []],
    ['a string', 'documents'],
    ['a number', 3]
  ])('%s is refused', (_label, value) => {
    expect(p.validateProposals(value).ok).toBe(false)
  })

  test.each([
    ['no id', { id: '' }],
    ['no filename', { filename: '' }],
    ['a country that is not a code', { country: 'New Zealand' }],
    ['a status nothing recognises', { status: 'maybe' }],
    ['no loaded date', { loadedAt: '' }],
    ['a loaded date that is not one', { loadedAt: 'last Tuesday' }],
    ['a publication date that is not one', { published: 'October 2023' }]
  ])('a record with %s is dropped, and the others are kept', (_label, over) => {
    const good = record()
    const out = p.validateProposals({ documents: [record(over), good] })
    expect(out.ok).toBe(false)
    expect(out.errors.length).toBeGreaterThan(0)
    // 🔴 The rest of a manager's work is not lost because one record is bad.
    expect(out.value.documents).toHaveLength(1)
    expect(out.value.documents[0].id).toBe(good.id)
  })

  test('a category the forecast does not have is dropped from a record', () => {
    const r = record()
    r.categories = Object.assign({ buildings: { dvRate: 0.02 } }, r.categories)
    const out = p.validateProposals({ documents: [r] })
    expect(Object.keys(out.value.documents[0].categories)).toEqual(['vehicles'])
  })

  test('unmatched is recomputed when it is missing, never guessed at', () => {
    const r = record({ unmatched: 'all of them' })
    const back = p.validateProposals({ documents: [r] }).value.documents[0]
    expect(back.unmatched).toEqual(CATEGORY_KEYS.filter(k => k !== 'vehicles'))
  })

  test('firstYearRuleFound is strictly boolean', () => {
    const back = p.validateProposals({ documents: [record({ firstYearRuleFound: 'yes' })] })
    expect(back.value.documents[0].firstYearRuleFound).toBe(false)
  })

  test('a refused-row count that is not a positive number reads as none', () => {
    const back = over => p.validateProposals({ documents: [record(over)] }).value.documents[0].refusedRows
    expect(back({ refusedRows: -2 })).toBe(0)
    expect(back({ refusedRows: 'three' })).toBe(0)
    expect(back({ refusedRows: 2.7 })).toBe(2)
  })

  test('a record that is not an object at all is dropped', () => {
    const out = p.validateProposals({ documents: ['ir265.pdf', null, record()] })
    expect(out.value.documents).toHaveLength(1)
  })

  test('documents that is not an array reads as none', () => {
    expect(p.validateProposals({ documents: 'ir265' }).value.documents).toEqual([])
  })
})

describe('adding, finding and deciding', () => {
  test('a new document goes in front and never replaces one already there', () => {
    // Mike's drawing, in as many words: "a second document never replaces the first, it is
    // read alongside it" (FR-001).
    const first = record()
    const second = record()
    const store = p.addDocument(p.addDocument({ documents: [] }, first), second)
    expect(store.documents.map(d => d.id)).toEqual([second.id, first.id])
  })

  test('the list is capped, oldest dropped', () => {
    let store = { documents: [] }
    const ids = []
    for (let i = 0; i < p.MAX_DOCUMENTS + 3; i++) {
      const r = record()
      ids.push(r.id)
      store = p.addDocument(store, r)
    }
    expect(store.documents).toHaveLength(p.MAX_DOCUMENTS)
    expect(store.documents[0].id).toBe(ids[ids.length - 1])
    expect(p.findDocument(store, ids[0])).toBeNull()
  })

  test('adding does not mutate the store it was given', () => {
    const store = { documents: [] }
    p.addDocument(store, record())
    expect(store.documents).toHaveLength(0)
  })

  test('a decision names who made it and when, and leaves the others alone', () => {
    const a = record()
    const b = record()
    const store = { documents: [a, b] }
    const next = p.setStatus(store, a.id, 'approved', 'manager@example.com')
    expect(p.findDocument(next, a.id).status).toBe('approved')
    expect(p.findDocument(next, a.id).decidedBy).toBe('manager@example.com')
    expect(Date.parse(p.findDocument(next, a.id).decidedAt)).not.toBeNaN()
    expect(p.findDocument(next, b.id).status).toBe('pending')
    // The original is untouched, so a failed write cannot leave a half-changed list behind.
    expect(a.status).toBe('pending')
  })

  test('finding something that is not there answers null rather than throwing', () => {
    expect(p.findDocument({ documents: [] }, 'nope')).toBeNull()
    expect(p.findDocument(null, 'nope')).toBeNull()
    expect(p.findDocument({}, 'nope')).toBeNull()
  })

  test('setting a status on a store with nothing in it is not an error', () => {
    expect(p.setStatus(null, 'x', 'approved', 'm').documents).toEqual([])
  })
})
