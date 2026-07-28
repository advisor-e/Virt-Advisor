'use strict'

// CB-34 — the template-name resolver is the safety layer between a human-typed
// heading and a template's permanent ID. These tests lock its contract: it
// absorbs formatting noise and a cleanly missing/extra word, binds ONLY on a
// unique winner, and otherwise refuses loudly with ranked suggestions. A wrong
// auto-bind mis-files a quiz silently, so the "refuse" paths matter as much as
// the "bind" ones — hence full-branch coverage.

const { resolveTemplateName, listTemplatePages, normalise, tokenSet } = require('../../server/utils/resolveTemplateName')

// Fixture mirrors the 18 General-Section-Quiz templates (real titles, fake ids).
const T = [
  { page: 'id-1', title: '7 Cash Drivers' },
  { page: 'id-2', title: 'Dashboard Discussions' },
  { page: 'id-3', title: '3 Pillars of Financial Management' },
  { page: 'id-4', title: '8 Profit Levers' },
  { page: 'id-5', title: 'Working Capital Cycle' },
  { page: 'id-6', title: '6 Hats' },
  { page: 'id-7', title: '4 Part Bizz Plan' },
  { page: 'id-8', title: 'Debtor Protocols' },
  { page: 'id-9', title: 'Rubbish In - Rubbish Out' },
  { page: 'id-10', title: "What's Applicable" },
  { page: 'id-11', title: 'Customer Journey' },
  { page: 'id-12', title: 'Demings Volatility' },
  { page: 'id-13', title: 'Quick Fire Diagnosis' },
  { page: 'id-14', title: 'HOPE Recession Model' },
  { page: 'id-15', title: 'Lite Feasibility' },
  { page: 'id-16', title: 'People vs. Process' },
  { page: 'id-17', title: 'Price Rise' },
  { page: 'id-18', title: 'Structure Options' }
]

describe('resolveTemplateName — exact (formatting-insensitive)', () => {
  test('identical title binds exact', () => {
    const r = resolveTemplateName('Working Capital Cycle', T)
    expect(r).toEqual({ ok: true, id: 'id-5', title: 'Working Capital Cycle', matchType: 'exact' })
  })

  test('case is ignored', () => {
    expect(resolveTemplateName('working capital cycle', T).id).toBe('id-5')
    expect(resolveTemplateName('DASHBOARD DISCUSSIONS', T).id).toBe('id-2')
  })

  test('trailing punctuation is ignored ("People vs. Process:")', () => {
    const r = resolveTemplateName('People vs. Process:', T)
    expect(r.ok).toBe(true)
    expect(r.id).toBe('id-16')
    expect(r.matchType).toBe('exact')
  })

  test('capitalisation/spacing of hyphenated title is ignored ("Rubbish in - Rubbish out")', () => {
    const r = resolveTemplateName('Rubbish in - Rubbish out', T)
    expect(r.ok).toBe(true)
    expect(r.id).toBe('id-9')
    expect(r.matchType).toBe('exact')
  })

  test('collapses arbitrary whitespace', () => {
    expect(resolveTemplateName('  Working   Capital \n Cycle ', T).id).toBe('id-5')
  })
})

describe('resolveTemplateName — subset (one clean extra/missing word)', () => {
  test('extra word in heading binds ("6 Hats Thinking" -> "6 Hats")', () => {
    const r = resolveTemplateName('6 Hats Thinking', T)
    expect(r).toMatchObject({ ok: true, id: 'id-6', matchType: 'subset' })
  })

  test('missing word in heading binds ("HOPE Model" -> "HOPE Recession Model")', () => {
    const r = resolveTemplateName('HOPE Model', T)
    expect(r).toMatchObject({ ok: true, id: 'id-14', matchType: 'subset' })
  })

  test('missing word binds ("Quick Fire" -> "Quick Fire Diagnosis")', () => {
    expect(resolveTemplateName('Quick Fire', T).id).toBe('id-13')
  })
})

describe('resolveTemplateName — refuses to guess', () => {
  test('genuine wording mismatch is rejected with the closest suggestion ("4 Part Business Plan")', () => {
    const r = resolveTemplateName('4 Part Business Plan', T)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('none')
    expect(r.candidates[0].title).toBe('4 Part Bizz Plan')
    expect(r.candidates[0].score).toBeGreaterThan(0)
  })

  test('abbreviated heading is rejected with suggestion ("Fin Mgt 3 Pillars")', () => {
    const r = resolveTemplateName('Fin Mgt 3 Pillars', T)
    expect(r.ok).toBe(false)
    expect(r.candidates[0].title).toBe('3 Pillars of Financial Management')
  })

  test('a single common word does not bind ("Model")', () => {
    const r = resolveTemplateName('Model', T)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('none')
    // still offers the overlapping title as a hint
    expect(r.candidates.some(c => c.title === 'HOPE Recession Model')).toBe(true)
  })

  test('total gibberish is rejected with no candidates', () => {
    const r = resolveTemplateName('Zxqw Plmn Vbnm', T)
    expect(r).toEqual({ ok: false, reason: 'none', candidates: [] })
  })

  test('multiple weak overlaps are returned ranked, highest first', () => {
    // "Cash Flow Plan" partially overlaps "7 Cash Drivers" and "4 Part Bizz Plan"
    const r = resolveTemplateName('Cash Flow Plan', T)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('none')
    expect(r.candidates.length).toBeGreaterThanOrEqual(2)
    expect(r.candidates[0].score).toBeGreaterThanOrEqual(r.candidates[1].score)
  })

  test('a template with a punctuation-only title is skipped, not crashed on', () => {
    const list = [{ page: 'x', title: '---' }, { page: 'y', title: 'Alpha Beta' }]
    const r = resolveTemplateName('Zzz', list)
    expect(r).toEqual({ ok: false, reason: 'none', candidates: [] })
  })

  test('empty / punctuation-only headings are rejected as empty', () => {
    expect(resolveTemplateName('', T)).toEqual({ ok: false, reason: 'empty', candidates: [] })
    expect(resolveTemplateName('   ', T)).toEqual({ ok: false, reason: 'empty', candidates: [] })
    expect(resolveTemplateName('!!! ---', T).reason).toBe('empty')
    expect(resolveTemplateName(null, T).reason).toBe('empty')
    expect(resolveTemplateName(undefined, T).reason).toBe('empty')
  })

  test('ambiguous exact match is rejected as ambiguous', () => {
    const dup = [{ page: 'a', title: 'Price Rise' }, { page: 'b', title: 'Price, Rise!' }]
    const r = resolveTemplateName('price rise', dup)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('ambiguous')
    expect(r.candidates.map(c => c.id).sort()).toEqual(['a', 'b'])
  })

  test('ambiguous subset match is rejected as ambiguous', () => {
    const two = [{ page: 'a', title: 'Cash Flow Model' }, { page: 'b', title: 'Cash Flow Forecast' }]
    const r = resolveTemplateName('Cash Flow', two)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('ambiguous')
    expect(r.candidates.length).toBe(2)
  })
})

describe('resolveTemplateName — all 18 General-Section-Quiz headings resolve', () => {
  // These are the headings exactly as they appear in General Section Quiz.pdf
  // (including the two near-misses the resolver now absorbs without a manual fix).
  const headings = [
    ['7 Cash Drivers', 'id-1'], ['Dashboard Discussions', 'id-2'],
    ['3 Pillars of Financial Management', 'id-3'], ['8 Profit Levers', 'id-4'],
    ['Working Capital Cycle', 'id-5'], ['6 Hats', 'id-6'],
    ['4 Part Bizz Plan', 'id-7'], ['Debtor Protocols', 'id-8'],
    ['Rubbish in - Rubbish out', 'id-9'], ["What's Applicable", 'id-10'],
    ['Customer Journey', 'id-11'], ['Demings Volatility', 'id-12'],
    ['Quick Fire Diagnosis', 'id-13'], ['HOPE Recession Model', 'id-14'],
    ['Lite Feasibility', 'id-15'], ['People vs. Process:', 'id-16'],
    ['Price Rise', 'id-17'], ['Structure Options', 'id-18']
  ]
  test.each(headings)('"%s" resolves to %s', (heading, id) => {
    const r = resolveTemplateName(heading, T)
    expect(r.ok).toBe(true)
    expect(r.id).toBe(id)
  })
})

describe('resolveTemplateName — default template source', () => {
  test('with no template arg it loads data/templates.json and resolves a real title', () => {
    const r = resolveTemplateName('Working Capital Cycle')
    expect(r.ok).toBe(true)
    // template page ids are opaque stable strings (e.g. "bizz360"), not a fixed format
    expect(typeof r.id).toBe('string')
    expect(r.id.length).toBeGreaterThan(0)
    expect(r.title).toBe('Working Capital Cycle')
  })

  test('a second load hits the in-memory cache and stays consistent', () => {
    const a = resolveTemplateName('Price Rise')
    const b = resolveTemplateName('Price Rise')
    expect(a).toEqual(b)
    expect(a.ok).toBe(true)
  })
})

describe('exported helpers', () => {
  test('normalise lowercases, strips punctuation, collapses spaces', () => {
    expect(normalise('  People vs. Process: ')).toBe('people vs process')
    expect(normalise('Rubbish In - Rubbish Out')).toBe('rubbish in rubbish out')
    expect(normalise(null)).toBe('')
  })

  test('tokenSet returns distinct word tokens', () => {
    expect([...tokenSet('6 Hats Hats')].sort()).toEqual(['6', 'hats'])
    expect(tokenSet('   ').size).toBe(0)
  })
})

// CB-31 Phase 3 — the quiz editor draws its page rail from this list. It must
// come from the SAME source the resolver binds against, or the editor would
// offer pages that a save then refuses.
describe('listTemplatePages', () => {
  const WITH_GROUPING = [
    { page: 'id-1', section: 'Do the Job', subSection: 'Reporting', title: 'Dashboard Report' },
    { page: 'id-2', section: 'Do the Job', subSection: 'Cash', title: 'Working Capital Cycle' }
  ]

  test('returns the grouping fields the rail needs', () => {
    expect(listTemplatePages(WITH_GROUPING)).toEqual([
      { page: 'id-1', section: 'Do the Job', subSection: 'Reporting', title: 'Dashboard Report', bindable: true },
      { page: 'id-2', section: 'Do the Job', subSection: 'Cash', title: 'Working Capital Cycle', bindable: true }
    ])
  })

  test('a missing section or sub-section becomes an empty string, never undefined', () => {
    const [row] = listTemplatePages([{ page: 'id-9', title: 'Orphan Page' }])
    expect(row).toEqual({ page: 'id-9', section: '', subSection: '', title: 'Orphan Page', bindable: true })
  })

  test('every page the editor is offered is one the resolver can bind', () => {
    for (const row of listTemplatePages(T)) {
      expect(resolveTemplateName(row.title, T).ok).toBe(true)
    }
  })

  // The flag exists to stop the editor offering a page whose save would be
  // refused. So it is pinned to what the resolver ACTUALLY does, not to the
  // reasoning behind it — if the two ever disagree, this fails.
  describe('bindable tracks the resolver, page by page', () => {
    const TWINS = [
      { page: 'id-1', title: 'Advisor Prep' },
      { page: 'id-2', title: 'Advisor Prep' },
      { page: 'id-3', title: 'Debtor Protocols' }
    ]

    test('a duplicated title is marked not bindable; a unique one is', () => {
      const rows = listTemplatePages(TWINS)
      expect(rows.map(r => r.bindable)).toEqual([false, false, true])
    })

    test('titles differing only by punctuation count as the same name', () => {
      const rows = listTemplatePages([
        { page: 'id-1', title: "My Sales Logistics & Mktg' Plan" },
        { page: 'id-2', title: 'My Sales Logistics & Mktg Plan' }
      ])
      expect(rows.every(r => r.bindable === false)).toBe(true)
    })

    test('across the real library, bindable agrees with the resolver on every page', () => {
      for (const row of listTemplatePages()) {
        expect(row.bindable).toBe(resolveTemplateName(row.title).ok)
      }
    })

    test('the real library still has pages that cannot take a quiz — the reason this flag exists', () => {
      const blocked = listTemplatePages().filter(r => !r.bindable)
      expect(blocked.length).toBeGreaterThan(0)
      expect(blocked.every(r => typeof r.title === 'string' && r.title)).toBe(true)
    })
  })

  test('mutating the result cannot corrupt the cache every resolve depends on', () => {
    const first = listTemplatePages()
    first[0].title = 'CORRUPTED'
    expect(listTemplatePages()[0].title).not.toBe('CORRUPTED')
  })

  test('the real library loads and carries its grouping', () => {
    const pages = listTemplatePages()
    expect(pages.length).toBeGreaterThan(0)
    expect(pages.every(p => typeof p.page === 'string' && typeof p.title === 'string')).toBe(true)
    expect(pages.some(p => p.subSection)).toBe(true)
  })
})
