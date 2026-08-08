'use strict'

// The Logic Lab Report rollup.
//
// This is the SECOND read in the app that crosses the firm boundary — the first
// is the anonymised case feed, which is double opt-in and has a human approving
// every item. This one has no such gate: it reads every firm automatically. It is
// defensible only because it carries configuration and counts, so the privacy
// tests below are not a formality. They are the reason the page is allowed to
// exist.
//
// The rest guard the reading Mike takes off the page. "Several firms pushed the
// same fix" means a default of his needed changing; one firm means that firm has
// a preference. Getting that boundary wrong sends him editing platform content on
// the strength of a single firm's habit.

const {
  buildMentorLogicLabReport,
  groupPushedEdits,
  preferredTemplates,
  leverUsage,
  publishableFields,
  assertNoPersonalFields,
  readingFor,
  PLATFORM_GAP_FIRMS
} = require('../../server/utils/mentorLogicLabReport')

/**
 * One accepted idea, in the shape logicLabAccept.buildLogEntry produces.
 *
 * @param {object} over - fields to override.
 * @returns {object}
 */
function idea (over) {
  return Object.assign({
    at: '2026-07-01T09:00:00Z',
    sentence: 'the partners keep second-guessing every decision',
    domain: 'governance',
    expectedTemplate: 'Governance Introduction',
    distinctionsMatched: [],
    templatesBefore: ['6 Hats'],
    templatesAfter: ['6 Hats', 'Governance Introduction'],
    distinctionDescription: 'Poor sign-off discipline',
    distinctionSource: 'firm-own',
    distinctionId: 'fd-1'
  }, over)
}

/**
 * @param {string} id
 * @param {Array<object>} entries
 * @param {object} [levers]
 * @returns {object}
 */
function firm (id, entries, levers) {
  return { firmId: id, firmName: id, entries, levers: levers || {} }
}

describe('nothing personal crosses the firm boundary', () => {
  it('drops the manager who made the edit — the pattern matters, the person does not', () => {
    const out = publishableFields(idea({ by: 'manager@firm.example' }))
    expect(out.by).toBeUndefined()
    expect(out.sentence).toBeDefined()
  })

  it('is a whitelist, so a field added upstream tomorrow does not travel', () => {
    const out = publishableFields(idea({ clientName: 'Acme Ltd', transcript: 'the whole session' }))
    expect(out.clientName).toBeUndefined()
    expect(out.transcript).toBeUndefined()
  })

  it('THROWS rather than filtering when something forbidden reaches the payload', () => {
    // Loudly, deliberately. A silent filter would hide the day the upstream shape
    // changed, and a privacy failure found afterwards cannot be undone.
    expect(() => assertNoPersonalFields({ firms: [{ clientName: 'Acme Ltd' }] }))
      .toThrow(/forbidden field "clientName"/)
  })

  it('builds a whole report with no forbidden field in it', () => {
    const report = buildMentorLogicLabReport({
      firms: [firm('firm-a', [idea({ by: 'someone@firm.example' })])]
    })
    expect(JSON.stringify(report)).not.toContain('someone@firm.example')
  })
})

describe('grouping is what makes a pattern visible', () => {
  it('groups firms that made the same change, and counts FIRMS not edits', () => {
    const groups = groupPushedEdits([
      firm('a', [idea({}), idea({})]),
      firm('b', [idea({})])
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].firmCount).toBe(2)
    expect(groups[0].editCount).toBe(3)
  })

  it('keeps different templates apart', () => {
    const groups = groupPushedEdits([
      firm('a', [idea({}), idea({ expectedTemplate: 'Cashflow Fundamentals' })])
    ])
    expect(groups.map(g => g.template).sort()).toEqual(['Cashflow Fundamentals', 'Governance Introduction'])
  })

  it('skips an edit that names no template rather than inventing a bucket', () => {
    expect(groupPushedEdits([firm('a', [idea({ expectedTemplate: '' })])])).toEqual([])
  })

  it('puts the widest pattern first — that is the one worth acting on', () => {
    const groups = groupPushedEdits([
      firm('a', [idea({ expectedTemplate: 'Rare' })]),
      firm('b', [idea({})]),
      firm('c', [idea({})])
    ])
    expect(groups[0].template).toBe('Governance Introduction')
  })

  it('shows the newest edits first inside a group', () => {
    const groups = groupPushedEdits([
      firm('a', [idea({ at: '2026-01-01T00:00:00Z' }), idea({ at: '2026-08-01T00:00:00Z' })])
    ])
    expect(groups[0].edits[0].at).toBe('2026-08-01T00:00:00Z')
  })
})

describe('the reading Mike takes off a group', () => {
  it('calls several firms a platform gap', () => {
    expect(readingFor(PLATFORM_GAP_FIRMS)).toBe('platform-gap')
  })

  it('calls a few firms "watch, don\'t act"', () => {
    expect(readingFor(2)).toBe('watch')
  })

  it('calls one firm a preference — never a reason to change a default', () => {
    // The whole risk of this page: one firm's habit read as evidence about the
    // platform, and Mike editing content everyone inherits on the strength of it.
    expect(readingFor(1)).toBe('preference')
  })
})

describe('what gets used', () => {
  it('counts a template once per firm, however often that firm pushed it', () => {
    const out = preferredTemplates([firm('a', [idea({}), idea({}), idea({})])])
    expect(out).toEqual([{ title: 'Governance Introduction', firms: 1 }])
  })

  it('keeps a lever nobody touches in the list', () => {
    // The artefact's point about this table is the NEGATIVE reading: a lever with
    // no firms is either perfect or not understood, and dropping the row for
    // being empty hides the question.
    const out = leverUsage([firm('a', [], {})])
    expect(out.find(l => l.lever === 'quizBanks')).toEqual({ lever: 'quizBanks', firms: 0 })
  })

  it('counts a firm as using Logic-Lab when it has pushed an edit', () => {
    const out = leverUsage([firm('a', [idea({})], {})])
    expect(out.find(l => l.lever === 'logicLab').firms).toBe(1)
  })
})

describe('the whole report', () => {
  const report = buildMentorLogicLabReport({
    firms: [
      firm('firm-a', [idea({}), idea({})], { distinctions: { firmOwn: 12 }, logicTables: { edited: 3 } }),
      firm('firm-b', [idea({})], { distinctions: { firmOwn: 4 } }),
      firm('firm-c', [], {})
    ],
    rolledUpAt: '2026-08-09T00:00:00Z'
  })

  it('totals the pushes and says how many firms are behind them', () => {
    expect(report.glance.pushedEdits).toBe(3)
    expect(report.glance.firmsWithPushes).toBe(2)
    expect(report.glance.firms).toBe(3)
  })

  it('flags a firm that runs entirely on the mentor\'s defaults', () => {
    // Not a footnote: everything that firm's advisors see is Mike's, unaltered.
    const c = report.firms.find(f => f.firmName === 'firm-c')
    expect(c.defaultsOnly).toBe(true)
    expect(report.glance.firmsThatEditedSomething).toBe(2)
  })

  it('sums firm-own distinctions and table edits across the platform', () => {
    expect(report.glance.firmOwnDistinctions).toBe(16)
    expect(report.glance.logicTableEdits).toBe(3)
  })

  it('orders the firm table by who pushed most', () => {
    expect(report.firms.map(f => f.firmName)).toEqual(['firm-a', 'firm-b', 'firm-c'])
  })

  it('returns an EMPTY report rather than inventing one when no firm has pushed', () => {
    // The artefact's third honest limit: silence is absence of evidence, not
    // approval of the defaults. An empty answer must stay empty.
    const empty = buildMentorLogicLabReport({ firms: [] })
    expect(empty.groups).toEqual([])
    expect(empty.glance.pushedEdits).toBe(0)
    expect(empty.usage.templates).toEqual([])
  })
})
