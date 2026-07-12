import {
  MODELS,
  CATEGORIES,
  CATEGORY_ALL,
  STATUS_READY,
  STATUS_SOON,
  filterModels,
  readyCount,
  colourFor,
  isOpenable
} from '../../utils/reportModelCatalogue'

/**
 * The Model Library's selection logic. The component is presentation only, so this
 * is where the behaviour that matters is pinned: what the advisor can search for,
 * and — critically — which cards are clickable. A model whose report does not exist
 * must never render as a link.
 */
describe('report model catalogue', () => {
  describe('catalogue integrity', () => {
    it('gives every model a name, category, summary and a known status', () => {
      const categories = CATEGORIES.map(c => c.name)

      MODELS.forEach((m) => {
        expect(typeof m.name).toBe('string')
        expect(m.name.length).toBeGreaterThan(0)
        expect(typeof m.summary).toBe('string')
        expect(m.summary.length).toBeGreaterThan(0)
        expect(categories).toContain(m.category)
        expect([STATUS_READY, STATUS_SOON]).toContain(m.status)
      })
    })

    it('has no duplicate model names (they key the grid)', () => {
      const names = MODELS.map(m => m.name)
      expect(new Set(names).size).toBe(names.length)
    })

    it('gives every ready model a route, and no unbuilt model a route', () => {
      MODELS.forEach((m) => {
        if (m.status === STATUS_READY) {
          expect(typeof m.route).toBe('string')
          expect(m.route.startsWith('/')).toBe(true)
        } else {
          expect(m.route).toBeUndefined()
        }
      })
    })

    it('points the ready models at the three live report routes', () => {
      const ready = MODELS.filter(m => m.status === STATUS_READY)
      expect(ready.map(m => m.route).sort()).toEqual([
        '/business-performance-report',
        '/debtor-drag',
        '/margin-breakeven'
      ])
    })

    it('links to in-app routes only — never to a mockup file', () => {
      MODELS.forEach((m) => {
        if (m.route) {
          expect(m.route).not.toMatch(/\.html$/)
        }
      })
    })
  })

  describe('isOpenable', () => {
    it('opens a ready model that has a route', () => {
      expect(isOpenable({ status: STATUS_READY, route: '/debtor-drag' })).toBe(true)
    })

    it('does not open an unbuilt model', () => {
      expect(isOpenable({ status: STATUS_SOON })).toBe(false)
    })

    it('does not open a model flagged ready but missing its route', () => {
      // A mis-flagged entry must degrade to an inert card, not a link to nowhere.
      expect(isOpenable({ status: STATUS_READY })).toBe(false)
    })

    it('survives a missing model', () => {
      expect(isOpenable(null)).toBe(false)
      expect(isOpenable(undefined)).toBe(false)
    })
  })

  describe('filterModels', () => {
    it('returns the whole catalogue with no filters', () => {
      expect(filterModels()).toHaveLength(MODELS.length)
      expect(filterModels(MODELS, {})).toHaveLength(MODELS.length)
    })

    it('treats the All chip and a blank query as no filter', () => {
      const all = filterModels(MODELS, { category: CATEGORY_ALL, query: '   ' })
      expect(all).toHaveLength(MODELS.length)
    })

    it('narrows to a single category', () => {
      const cashflow = filterModels(MODELS, { category: 'Cash Flow' })
      expect(cashflow.length).toBeGreaterThan(0)
      cashflow.forEach(m => expect(m.category).toBe('Cash Flow'))
      expect(cashflow.length).toBeLessThan(MODELS.length)
    })

    it('matches the query against the model name, case-insensitively', () => {
      const hits = filterModels(MODELS, { query: 'DEBTOR' })
      expect(hits.map(m => m.name)).toContain('Debtor Business Drag')
    })

    it('matches the query against the summary, not just the name', () => {
      // "overdraft" appears only in the Debtor Business Drag summary.
      const hits = filterModels(MODELS, { query: 'overdraft' })
      expect(hits).toHaveLength(1)
      expect(hits[0].name).toBe('Debtor Business Drag')
    })

    it('matches the query against the category', () => {
      const hits = filterModels(MODELS, { query: 'budgeting' })
      expect(hits.length).toBeGreaterThan(0)
      hits.forEach(m => expect(m.category).toBe('Budgeting'))
    })

    it('applies category and query together', () => {
      const hits = filterModels(MODELS, { category: 'Cash Flow', query: 'stock' })
      expect(hits).toHaveLength(1)
      expect(hits[0].name).toBe('Working Capital Cycle')
    })

    it('returns nothing when nothing matches (drives the empty state)', () => {
      expect(filterModels(MODELS, { query: 'zzzznotamodel' })).toHaveLength(0)
    })

    it('preserves catalogue order', () => {
      const hits = filterModels(MODELS, { category: 'Valuation' })
      const expected = MODELS.filter(m => m.category === 'Valuation').map(m => m.name)
      expect(hits.map(m => m.name)).toEqual(expected)
    })

    it('survives malformed input rather than throwing', () => {
      expect(filterModels(null, { query: 'cash' })).toEqual([])
      expect(filterModels(MODELS, { query: null })).toHaveLength(MODELS.length)
      expect(filterModels(MODELS, { query: 42 })).toHaveLength(0)
    })
  })

  describe('readyCount', () => {
    it('counts only the models with a built report', () => {
      expect(readyCount(MODELS)).toBe(3)
      expect(readyCount([])).toBe(0)
      expect(readyCount(null)).toBe(0)
    })
  })

  describe('colourFor', () => {
    it('returns the brand colour for a known category', () => {
      expect(colourFor('Cash Flow')).toBe('#0070c0')
      expect(colourFor('Risk')).toBe('#ff0000')
    })

    it('falls back to the primary blue rather than rendering a colourless card', () => {
      expect(colourFor('Not A Category')).toBe('#0070c0')
      expect(colourFor(undefined)).toBe('#0070c0')
    })
  })
})
