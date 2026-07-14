'use strict'

// Bugs 1 + 2 from the engine-defects review (2026-07-14) — the live scaffolding
// session where "business" became the client's industry and a duplicate title
// silently ate a meeting slot. (Bug 3 lives in meetingCount.test.js; Bug 4 — the
// unauthorised template cap — is an inline budget calc exercised via Bug 3's
// clamp plus the removal of Math.min, asserted here indirectly through dedup
// honouring larger budgets.)

const { resolveTemplates } = require('../../server/utils/templateResolver')

function makeCaseState (over = {}) {
  return {
    domain: 'profit',
    primaryIssue: null,
    industry: null,
    solutionCategories: [],
    client: {},
    advisor: {},
    complexityCeiling: 'strategic',
    problemSignals: {},
    ...over
  }
}

const strategy = budget => ({ engagementType: 'education', templateBudget: budget })

// ── Bug 1 — industry keywords are stop-word filtered ─────────────────────────

describe('Bug 1 — "business" is never treated as the client industry', () => {
  const pool = [
    { page: 'id-ins', title: 'Business Insurance Model', section: 'Do the Job', subSection: 'General Tools', tags: ['insurance'], purpose: 'key person and share transfer insurance' },
    { page: 'id-wcc', title: 'Working Capital Cycle', section: 'Do the Job', subSection: 'General Tools', tags: ['cash'], purpose: 'understand the working capital cycle' },
    { page: 'id-scaf', title: 'Scaffolding', section: 'Do the Job', subSection: 'General Tools', tags: ['construction'], purpose: 'scaffolding industry revenue model' }
  ]

  test('the live defect: "Vanoss scaffolding business" gives NO boost to "Business Insurance Model"', () => {
    const r = resolveTemplates(makeCaseState({ industry: 'Vanoss scaffolding business' }), strategy(3), pool, {})
    const insurance = r.scoringLog.find(t => t.title === 'Business Insurance Model')
    expect(insurance.matchReasons).not.toContain('industry:title_match')
    expect(insurance.matchReasons).not.toContain('industry:tag_match')
  })

  test('a genuine industry word still matches — "Scaffolding" earns its title boost', () => {
    const r = resolveTemplates(makeCaseState({ industry: 'Vanoss scaffolding business' }), strategy(3), pool, {})
    const scaffolding = r.scoringLog.find(t => t.title === 'Scaffolding')
    expect(scaffolding.matchReasons).toContain('industry:title_match')
  })

  test('every shared stop-word is inert as an industry ("client", "advisor", "template"…)', () => {
    const r = resolveTemplates(makeCaseState({ industry: 'business client advisor template' }), strategy(3), pool, {})
    for (const t of r.scoringLog) {
      expect(t.matchReasons.some(x => x.startsWith('industry:title_match') || x.startsWith('industry:tag_match'))).toBe(false)
    }
  })

  test('the car-yard defect: "car sales a car yard" gives NO boost to sales-titled tools', () => {
    // Live session 2026-07-14 (raising-capital): "sales" became the industry and
    // industry:title_match lifted six Sales/Sale-titled templates over the field.
    const salesPool = [
      { page: 'id-sd', title: 'Sales Dashboard', section: 'Do the Job', subSection: 'General Tools', tags: ['sales'], purpose: 'real-time view of sales performance' },
      { page: 'id-bsa', title: 'Business Sale Assessment 1', section: 'Do the Job', subSection: 'General Tools', tags: ['sale'], purpose: 'the process involved in selling a business' },
      { page: 'id-wcc', title: 'Working Capital Cycle', section: 'Do the Job', subSection: 'General Tools', tags: ['cash'], purpose: 'understand the working capital cycle' }
    ]
    const r = resolveTemplates(makeCaseState({ industry: 'car sales a car yard' }), strategy(3), salesPool, {})
    for (const t of r.scoringLog) {
      expect(t.matchReasons.some(x => x.startsWith('industry:'))).toBe(false)
    }
  })

  test('a genuine industry containing a generic word still matches on its SPECIFIC word', () => {
    // "financial services" → 'services' is stopped, 'financial' carries.
    const finPool = [
      { page: 'id-fin', title: 'Financial Systems Review', section: 'Do the Job', subSection: 'General Tools', tags: [], purpose: 'review of financial systems' }
    ]
    const r = resolveTemplates(makeCaseState({ industry: 'financial services' }), strategy(3), finPool, {})
    expect(r.scoringLog[0].matchReasons).toContain('industry:title_match')
  })
})

// ── Bug 2 — a duplicate title cannot consume a budget slot ────────────────────

describe('Bug 2 — duplicate titles are deduped BEFORE the budget slice', () => {
  // The live library shape: the same title twice under different page IDs.
  const poolWithDupe = [
    { page: 'id-qfd-1', title: 'Quick Fire Diagnosis', section: 'Do the Job', subSection: 'General Tools', tags: ['diagnosis'], purpose: 'diagnose the source of the issue' },
    { page: 'id-qfd-2', title: 'Quick Fire Diagnosis', section: 'Do the Job', subSection: 'General Tools', tags: ['diagnosis', 'triage'], purpose: 'diagnose the source of the issue quickly' },
    { page: 'id-wcc', title: 'Working Capital Cycle', section: 'Do the Job', subSection: 'General Tools', tags: ['cash'], purpose: 'understand the working capital cycle' },
    { page: 'id-be', title: 'Break-Even Analysis', section: 'Do the Job', subSection: 'General Tools', tags: ['costs'], purpose: 'find the break-even point' }
  ]

  test('the live defect: budget 3 yields THREE distinct cards, not two', () => {
    const r = resolveTemplates(makeCaseState(), strategy(3), poolWithDupe, {})
    expect(r.selected).toHaveLength(3)
    const titles = r.selected.map(t => t.title)
    expect(new Set(titles).size).toBe(3) // all distinct
    expect(titles).toContain('Working Capital Cycle') // the vacated slot goes to the next real template
  })

  test('the scoring log deliberately KEEPS the duplicate — data-quality evidence, not hidden', () => {
    const r = resolveTemplates(makeCaseState(), strategy(3), poolWithDupe, {})
    const qfdRows = r.scoringLog.filter(t => t.title === 'Quick Fire Diagnosis')
    expect(qfdRows).toHaveLength(2)
  })

  test('the diverse candidate pool contains no duplicate titles either', () => {
    const r = resolveTemplates(makeCaseState(), strategy(3), poolWithDupe, {})
    const titles = r.candidates.map(t => t.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  test('budgets above the old cap of 3 are honoured (Bug 4: the Math.min is gone)', () => {
    const bigPool = ['A', 'B', 'C', 'D', 'E', 'F'].map((n, i) => (
      { page: `id-${i}`, title: `Tool ${n}`, section: 'Do the Job', subSection: 'General Tools', tags: [], purpose: '' }
    ))
    const r = resolveTemplates(makeCaseState(), strategy(6), bigPool, {})
    expect(r.selected).toHaveLength(6) // six meetings @ 60 mins = six templates
  })
})
