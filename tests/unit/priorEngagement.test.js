'use strict'

// priorEngagement — the summariser that turns a client's saved case history
// into what the engine reads back at recommendation time (client knowledge
// base, design 2026-07-14). Locks the honesty and PII rules:
//   - reviews stay CASE-level — no fabricated per-template outcomes
//   - the output carries NO internal ids (case/client/advisor)
//   - malformed history degrades, never throws (it must not block a recommendation)

const { buildPriorEngagementSummary, formatPriorEngagementText, MAX_ENGAGEMENTS } = require('../../server/utils/priorEngagement')

function makeCase (over = {}) {
  return {
    id: 'case-uuid-SECRET', // internal id — must never surface in the summary
    advisorId: 'advisor-uuid-SECRET',
    clientId: 'client-uuid-SECRET',
    title: 'Vanoss — fixed costs blowout',
    mode: 'client',
    visibility: 'private',
    domain: 'profit',
    staircaseStep: 'Step 2: Assimilation',
    growthStage: 'Leverage',
    templates: ['Quick Fire Diagnosis', 'Working Capital Cycle'],
    review: {
      wentWell: 'Diagnosis landed — the owner finally saw the debt-servicing cost.',
      wentLess: 'Working capital session ran long; owner got lost in the detail.',
      changesRecommended: 'Split working capital across two shorter sessions.'
    },
    createdAt: '2026-06-18T09:00:00.000Z',
    ...over
  }
}

describe('buildPriorEngagementSummary', () => {
  test('no history → null (empty array, null, undefined, junk)', () => {
    expect(buildPriorEngagementSummary([])).toBeNull()
    expect(buildPriorEngagementSummary(null)).toBeNull()
    expect(buildPriorEngagementSummary(undefined)).toBeNull()
    expect(buildPriorEngagementSummary('not-an-array')).toBeNull()
  })

  test('summarises one reviewed engagement in full', () => {
    const s = buildPriorEngagementSummary([makeCase()])
    expect(s.sessions).toBe(1)
    expect(s.lastDomain).toBe('profit')
    expect(s.lastStaircaseStep).toBe('Step 2: Assimilation')
    expect(s.lastGrowthStage).toBe('Leverage')
    expect(s.templatesDelivered).toEqual(['Quick Fire Diagnosis', 'Working Capital Cycle'])
    expect(s.engagements[0].review.wentLess).toMatch(/ran long/)
  })

  test('templatesDelivered dedupes across engagements, newest first', () => {
    const s = buildPriorEngagementSummary([
      makeCase({ templates: ['EBITDA', 'Quick Fire Diagnosis'], createdAt: '2026-07-01T00:00:00.000Z' }),
      makeCase({ templates: ['Quick Fire Diagnosis', 'Break-Even'], createdAt: '2026-06-01T00:00:00.000Z' })
    ])
    expect(s.templatesDelivered).toEqual(['EBITDA', 'Quick Fire Diagnosis', 'Break-Even'])
    expect(s.sessions).toBe(2)
  })

  test('reviews stay case-level — a case without one gets review null, nothing invented', () => {
    const s = buildPriorEngagementSummary([makeCase({ review: null })])
    expect(s.engagements[0].review).toBeNull()
    expect(s.engagements[0].templates).toEqual(['Quick Fire Diagnosis', 'Working Capital Cycle'])
  })

  test('malformed rows degrade instead of throwing (missing fields, wrong types)', () => {
    const s = buildPriorEngagementSummary([
      { title: null, templates: 'not-an-array', review: 'not-an-object', createdAt: null },
      makeCase()
    ])
    expect(s.sessions).toBe(2)
    expect(s.engagements[0].title).toBe('')
    expect(s.engagements[0].templates).toEqual([])
    expect(s.engagements[0].review).toBeNull()
  })

  test(`prompt detail caps at ${MAX_ENGAGEMENTS} engagements but counts every session`, () => {
    const many = Array.from({ length: 9 }, (_, i) => makeCase({ title: `Session ${i}` }))
    const s = buildPriorEngagementSummary(many)
    expect(s.sessions).toBe(9)
    expect(s.engagements).toHaveLength(MAX_ENGAGEMENTS)
  })

  test('review text is capped so an oversized note cannot flood the prompt', () => {
    const s = buildPriorEngagementSummary([makeCase({
      review: { wentWell: 'x'.repeat(5000), wentLess: '', changesRecommended: '' }
    })])
    expect(s.engagements[0].review.wentWell.length).toBe(500)
  })

  test('carries NO internal ids anywhere (the PII rule)', () => {
    const s = buildPriorEngagementSummary([makeCase()])
    const flat = JSON.stringify(s)
    expect(flat).not.toContain('SECRET')
    expect(flat).not.toContain('case-uuid')
    expect(flat).not.toContain('client-uuid')
    expect(flat).not.toContain('advisor-uuid')
  })
})

describe('formatPriorEngagementText', () => {
  test('renders name, count, delivered templates and the review lines', () => {
    const s = buildPriorEngagementSummary([makeCase()])
    const text = formatPriorEngagementText(s, 'Vanoss Scaffolding')
    expect(text).toContain('Vanoss Scaffolding — 1 prior session')
    expect(text).toContain('Templates already delivered: Quick Fire Diagnosis, Working Capital Cycle.')
    expect(text).toContain('Went well: Diagnosis landed')
    expect(text).toContain('Went less well: Working capital session ran long')
    expect(text).toContain('Advisor would change: Split working capital')
  })

  test('says plainly when no review was recorded — absence is stated, not papered over', () => {
    const s = buildPriorEngagementSummary([makeCase({ review: null })])
    const text = formatPriorEngagementText(s, 'Vanoss Scaffolding')
    expect(text).toContain('No post-delivery review recorded')
  })

  test('no internal ids in the prompt text', () => {
    const s = buildPriorEngagementSummary([makeCase()])
    expect(formatPriorEngagementText(s, 'Vanoss Scaffolding')).not.toContain('SECRET')
  })

  test('an invalid date renders without a date rather than "Invalid Date"', () => {
    const s = buildPriorEngagementSummary([makeCase({ createdAt: 'garbage-date' })])
    const text = formatPriorEngagementText(s, 'Vanoss')
    expect(text).not.toContain('Invalid Date')
  })
})
