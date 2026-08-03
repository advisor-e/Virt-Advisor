'use strict'

/**
 * The Logic-Lab read model — the counts section 1 states as fact, and the
 * near-miss aggregation behind router row 5.
 *
 * These functions are also the seam the planned MENTOR ROLLUP will call once per
 * firm, so their behaviour on empty, partial and stale input is not an edge case
 * — it is what a cross-firm loop will hit constantly.
 */

const {
  buildLeverSummary,
  aggregateNearMisses,
  MEASURED,
  SCHEMA_VERSION
} = require('../../server/utils/logicLabSummary')
const { TREE_HINT_BOOST } = require('../../server/utils/templateResolver')

const tree = (id, opts = {}) => ({
  id,
  origin: opts.origin || 'platform',
  nodes: opts.templates ? [{ id: 'n1', templates: opts.templates }] : [{ id: 'n1' }]
})

describe('buildLeverSummary', () => {
  it('counts the three levers and the quiz footnote from resolved config', () => {
    const summary = buildLeverSummary({
      domainSupportDocs: [
        { id: 'profit', hasOverride: true, origin: 'firm' },
        { id: 'staff', hasOverride: false, origin: 'platform' }
      ],
      logicTrees: [
        tree('a', { templates: ['Quality Decisions'] }),
        tree('b', { templates: ['Lite Strategy'], origin: 'firm' }),
        tree('c') // branches, but no template hint
      ],
      distinctions: [
        { id: 1, boost: 5, source: 'firm-own' },
        { id: 'pd-2', boost: 5, source: 'platform' },
        { id: 'pd-3', boost: 5, source: 'firm-override' }
      ],
      quizBanks: {
        'Quality Decisions': { entries: [{ id: 'q1' }, { id: 'q2' }] },
        'Lite Strategy': { entries: [{ id: 'q3' }] }
      }
    })

    expect(summary.domainSupport).toEqual({ documents: 2, firmEdited: 1 })
    expect(summary.logicTables).toEqual({
      tables: 3, withTemplateHints: 2, firmEdited: 1, boost: TREE_HINT_BOOST
    })
    expect(summary.distinctions).toEqual({ count: 3, firmAuthored: 2, boost: 5 })
    expect(summary.quizBanks).toEqual({ banks: 2, questions: 3 })
  })

  it('reads the logic-table boost from the engine, never a local copy', () => {
    // If templateResolver ever changes TREE_HINT_BOOST, the page follows it.
    // A hard-coded 3 here would let the screen and the engine drift apart.
    expect(buildLeverSummary({}).logicTables.boost).toBe(TREE_HINT_BOOST)
  })

  it('states the firm’s OWN most common distinction boost, not the default', () => {
    const summary = buildLeverSummary({
      distinctions: [{ boost: 8 }, { boost: 8 }, { boost: 5 }]
    })
    expect(summary.distinctions.boost).toBe(8)
  })

  it('breaks a tie towards the lower boost — understating beats overstating', () => {
    expect(buildLeverSummary({ distinctions: [{ boost: 8 }, { boost: 5 }] }).distinctions.boost).toBe(5)
  })

  it('falls back to the default boost for a firm with no distinctions', () => {
    expect(buildLeverSummary({ distinctions: [] }).distinctions.boost).toBe(5)
  })

  it('ignores the private underscore keys in a quiz bank map', () => {
    const summary = buildLeverSummary({
      quizBanks: { _meta: { entries: [{ id: 'x' }] }, Real: { entries: [{ id: 'q' }] } }
    })
    expect(summary.quizBanks).toEqual({ banks: 1, questions: 1 })
  })

  it('returns zeroes rather than throwing on a firm with nothing configured', () => {
    const summary = buildLeverSummary({})
    expect(summary.domainSupport.documents).toBe(0)
    expect(summary.logicTables.tables).toBe(0)
    expect(summary.distinctions.count).toBe(0)
    expect(summary.quizBanks).toEqual({ banks: 0, questions: 0 })
  })

  it('stamps the schema version and carries the measurements’ provenance', () => {
    const summary = buildLeverSummary({})
    expect(summary.schemaVersion).toBe(SCHEMA_VERSION)
    // The 51-case figures are PLATFORM measurements, and must never be readable
    // as this firm's own result.
    expect(summary.measured.basis).toBe('scenario-lab')
    expect(summary.measured).toEqual(MEASURED)
  })
})

describe('aggregateNearMisses', () => {
  const live = [
    { id: 7, domain: 'succession', source: 'firm-own', description: 'Owner cannot let go', triggers: ['wont let go'], templates: ['Succession Plan'], boost: 5 },
    { id: 9, domain: 'forecasting', source: 'firm-own', description: 'No single version of the numbers', triggers: ['two sets'], templates: ['Dashboard'], boost: 5 }
  ]

  const caseWith = (domainId, misses) => ({
    decisionTrace: { domain: { id: domainId }, distinctions: { nearMisses: misses } }
  })

  it('counts how many shared conversations a misfiled distinction reached', () => {
    const out = aggregateNearMisses([
      caseWith('staff', [{ id: 7, domain: 'succession', description: 'Owner cannot let go' }]),
      caseWith('staff', [{ id: 7, domain: 'succession', description: 'Owner cannot let go' }]),
      caseWith('staff', [{ id: 7, domain: 'succession', description: 'Owner cannot let go' }])
    ], live)

    expect(out.rows).toHaveLength(1)
    expect(out.rows[0]).toMatchObject({
      id: 7, filedDomain: 'succession', matchedDomain: 'staff', count: 3
    })
  })

  it('keeps one distinction’s two target areas apart', () => {
    const out = aggregateNearMisses([
      caseWith('staff', [{ id: 7, domain: 'succession' }]),
      caseWith('conflict', [{ id: 7, domain: 'succession' }])
    ], live)
    expect(out.rows.map(r => r.matchedDomain).sort()).toEqual(['conflict', 'staff'])
  })

  it('orders by what has cost the firm most, not by newest case', () => {
    const out = aggregateNearMisses([
      caseWith('staff', [{ id: 9, domain: 'forecasting' }]),
      caseWith('conflict', [{ id: 7, domain: 'succession' }]),
      caseWith('conflict', [{ id: 7, domain: 'succession' }])
    ], live)
    expect(out.rows[0].id).toBe(7)
    expect(out.rows[0].count).toBe(2)
  })

  it('shows the CURRENT wording, not the wording recorded in the case', () => {
    const out = aggregateNearMisses(
      [caseWith('staff', [{ id: 7, domain: 'succession', description: 'the old wording' }])],
      live
    )
    expect(out.rows[0].description).toBe('Owner cannot let go')
  })

  it('drops a near-miss whose distinction has since been deleted, and says so', () => {
    const out = aggregateNearMisses(
      [caseWith('staff', [{ id: 404, domain: 'succession', description: 'gone' }])],
      live
    )
    expect(out.rows).toEqual([])
    expect(out.staleDropped).toBe(1)
  })

  it('drops a near-miss the firm has already moved into the matching area', () => {
    // The trace still says succession; the live row now says staff. Telling the
    // manager again that it is misfiled would be false.
    const moved = [{ ...live[0], domain: 'staff' }]
    const out = aggregateNearMisses(
      [caseWith('staff', [{ id: 7, domain: 'succession' }])],
      moved
    )
    expect(out.rows).toEqual([])
  })

  it('reports what the count rests on, so a number cannot read as every conversation', () => {
    const out = aggregateNearMisses([
      caseWith('staff', [{ id: 7, domain: 'succession' }]),
      { decisionTrace: null }, // shared, but never recorded a decision
      { decisionTrace: { domain: { id: 'staff' }, distinctions: {} } }
    ], live)
    expect(out.basisCaseCount).toBe(3)
    expect(out.tracedCaseCount).toBe(2)
  })

  it('skips a trace with no recorded area — there is nothing to move it into', () => {
    const out = aggregateNearMisses([
      { decisionTrace: { domain: null, distinctions: { nearMisses: [{ id: 7, domain: 'succession' }] } } }
    ], live)
    expect(out.rows).toEqual([])
  })

  it('carries the firm’s own row so a copy needs no second round trip', () => {
    const out = aggregateNearMisses([caseWith('staff', [{ id: 7, domain: 'succession' }])], live)
    expect(out.rows[0].templates).toEqual(['Succession Plan'])
    expect(out.rows[0].triggers).toEqual(['wont let go'])
    expect(out.rows[0].boost).toBe(5)
  })

  it('returns an empty answer for a firm with no shared cases', () => {
    expect(aggregateNearMisses([], live)).toEqual({
      rows: [], basisCaseCount: 0, tracedCaseCount: 0, staleDropped: 0
    })
    expect(aggregateNearMisses(null, live).rows).toEqual([])
  })
})
