'use strict'

/**
 * The Sales Dashboard's figures — Mike's own dashboard maths, ported.
 *
 * WHAT IS WORTH ASSERTING HERE. Mike's rule of 2026-08-24: a test earns its
 * place when it catches what UAT cannot. Nobody looking at this screen can see:
 *
 *   1. 🔴 That Campaign and Total Needs are split on `salesStyle` AT ALL. Two
 *      plausible-looking funnels appear either way; only the split makes them
 *      mean anything, and collapsing them is exactly the fault this port exists
 *      to undo.
 *   2. That a referral only counts when the named COI is one the advisor
 *      actually holds — otherwise a typo in "Referred by" inflates the count.
 *   3. That the averages are computed over WON deals only, and skip a deal with
 *      no dates rather than dating it to today.
 *   4. That his rounding and his zeroes are preserved. His rates are whole
 *      numbers and an empty denominator gives 0, because the rings are drawn
 *      FROM the number. Changing it would change his screen.
 */

const metrics = require('../../server/utils/salesMetrics')

/** A deal, with only what a test cares about spelled out. */
function deal (over) {
  return Object.assign({
    prospectStatus: 'Active',
    salesStyle: 'Campaign',
    approachStyle: 'Phone',
    secureMeeting: false,
    proposalSent: false,
    jobSecured: false,
    proposalValue: 0,
    jobSecuredValue: 0,
    approachDate: null,
    dateSecured: null,
    coiInvolved: '',
    leadStaff: 'Jo',
    industry: 'Legal',
    prospectSource: 'Referral'
  }, over || {})
}

/** A referral partner. */
function coi (over) {
  return Object.assign({
    coiName: 'Hollis',
    industry: 'Legal',
    couldWe: 0,
    howWouldWe: 0,
    willWe: 0,
    testReview: 0,
    totalReferrals: 0,
    totalConverted: 0,
    feeValue: 0
  }, over || {})
}

describe('🔴 the two funnels are split on salesStyle', () => {
  test('a Campaign deal and a Total Needs deal land in different funnels', () => {
    const d = metrics.dashboard([
      deal({ salesStyle: 'Campaign', secureMeeting: true }),
      deal({ salesStyle: 'Total Needs' })
    ], [])

    expect(d.campaignFunnel.approaches).toBe(1)
    expect(d.campaignFunnel.meetings).toBe(1)
    expect(d.totalNeedsFunnel.approaches).toBe(1)
    expect(d.totalNeedsFunnel.meetings).toBe(0)
  })

  test('🔴 the two funnels are NOT the same numbers — a collapsed dashboard would make them so', () => {
    // Five Campaign deals all won; one Total Needs deal, not won. A single
    // collapsed funnel reports 6 approaches and 5 secured for both.
    const deals = []
    for (let i = 0; i < 5; i++) {
      deals.push(deal({ salesStyle: 'Campaign', secureMeeting: true, proposalSent: true, jobSecured: true, jobSecuredValue: 1000 }))
    }
    deals.push(deal({ salesStyle: 'Total Needs' }))

    const d = metrics.dashboard(deals, [])
    expect(d.campaignFunnel.secured).toBe(5)
    expect(d.totalNeedsFunnel.secured).toBe(0)
    expect(d.campaignFunnel).not.toEqual(d.totalNeedsFunnel)
  })

  test('a deal with neither sales style sits in no funnel, as his loop leaves it', () => {
    const d = metrics.dashboard([deal({ salesStyle: null })], [])
    expect(d.campaignFunnel.approaches).toBe(0)
    expect(d.totalNeedsFunnel.approaches).toBe(0)
    // It is still counted in the overall totals.
    expect(d.totalProspects).toBe(1)
  })

  test('approaches count approachStyle, not merely the row existing', () => {
    // His rule: `if (entry.approachStyle) campaignApproaches++`.
    const d = metrics.dashboard([
      deal({ approachStyle: 'Phone' }),
      deal({ approachStyle: '' })
    ], [])
    expect(d.campaignFunnel.approaches).toBe(1)
    expect(d.totalProspects).toBe(2)
  })
})

describe('the averages are his', () => {
  test('avgFee is the mean fee across WON deals only', () => {
    const d = metrics.dashboard([
      deal({ jobSecured: true, jobSecuredValue: 1000 }),
      deal({ jobSecured: true, jobSecuredValue: 3000 }),
      deal({ jobSecured: false, jobSecuredValue: 99999 })
    ], [])
    expect(d.campaignFunnel.avgFee).toBe(2000)
  })

  test('🔴 a won deal with no dates is SKIPPED, never dated to today', () => {
    // One deal takes 10 days; the other records no dates. The average must be
    // 10, not 5 (which is what counting the undated one as zero would give).
    const d = metrics.dashboard([
      deal({ jobSecured: true, jobSecuredValue: 1, approachDate: '2026-01-01', dateSecured: '2026-01-11' }),
      deal({ jobSecured: true, jobSecuredValue: 1 })
    ], [])
    expect(d.campaignFunnel.avgDaysElapsed).toBe(10)
  })

  test('no won deals means zero, not NaN', () => {
    const d = metrics.dashboard([deal({ jobSecured: false })], [])
    expect(d.campaignFunnel.avgFee).toBe(0)
    expect(d.campaignFunnel.avgDaysElapsed).toBe(0)
    expect(Number.isNaN(d.campaignFunnel.avgFee)).toBe(false)
  })

  test('a negative span (secured before approached) is discarded', () => {
    const d = metrics.dashboard([
      deal({ jobSecured: true, jobSecuredValue: 1, approachDate: '2026-02-01', dateSecured: '2026-01-01' })
    ], [])
    expect(d.campaignFunnel.avgDaysElapsed).toBe(0)
  })
})

describe('🔴 a referral only counts for a partner the advisor actually holds', () => {
  test('a named COI that exists is counted', () => {
    const d = metrics.dashboard(
      [deal({ coiInvolved: 'Hollis', jobSecured: true, jobSecuredValue: 5000, proposalValue: 6000 })],
      [coi({ coiName: 'Hollis' })]
    )
    expect(d.coiPerformance.totalReferrals).toBe(1)
    expect(d.coiPerformance.totalConverted).toBe(1)
    expect(d.coiPerformance.totalSecuredFeeValue).toBe(5000)
    expect(d.coiPerformance.totalProposalFeeValue).toBe(6000)
  })

  test('🔴 a name that matches NO partner is not counted — a typo cannot inflate the figure', () => {
    const d = metrics.dashboard(
      [deal({ coiInvolved: 'Holis', jobSecured: true, jobSecuredValue: 5000 })],
      [coi({ coiName: 'Hollis' })]
    )
    expect(d.coiPerformance.totalReferrals).toBe(0)
    expect(d.coiPerformance.totalSecuredFeeValue).toBe(0)
  })

  test('the match ignores case and surrounding spaces, as his does', () => {
    const d = metrics.dashboard(
      [deal({ coiInvolved: '  hOLLIS  ' })],
      [coi({ coiName: 'Hollis' })]
    )
    expect(d.coiPerformance.totalReferrals).toBe(1)
  })

  test('an unconverted referral counts as a referral but not a conversion', () => {
    const d = metrics.dashboard(
      [deal({ coiInvolved: 'Hollis', jobSecured: false })],
      [coi({ coiName: 'Hollis' })]
    )
    expect(d.coiPerformance.totalReferrals).toBe(1)
    expect(d.coiPerformance.totalConverted).toBe(0)
  })
})

describe('the COI status progression counts partners past each gate', () => {
  test('a score above zero counts; a zero does not', () => {
    const d = metrics.dashboard([], [
      coi({ couldWe: 3, howWouldWe: 1, willWe: 0, testReview: 0 }),
      coi({ couldWe: 5, howWouldWe: 0, willWe: 0, testReview: 0 })
    ])
    expect(d.coiPerformance.couldWe).toBe(2)
    expect(d.coiPerformance.howWouldWe).toBe(1)
    expect(d.coiPerformance.willWe).toBe(0)
    expect(d.coiPerformance.testReview).toBe(0)
  })
})

describe('his rounding and his zeroes are preserved', () => {
  test('🔴 a rate with no denominator is 0, NOT null — the ring must have a number to draw', () => {
    expect(metrics.wholeRate(0, 0)).toBe(0)
    expect(metrics.wholeRate(5, 0)).toBe(0)
  })

  test('a rate is a whole number, as his rings show', () => {
    expect(metrics.wholeRate(1, 3)).toBe(33)
    expect(metrics.wholeRate(2, 3)).toBe(67)
  })

  test('⚠ this deliberately differs from compute()\'s null convention, which is kept for its own callers', () => {
    // Both live side by side on purpose: `rate` reports "nothing to report",
    // `wholeRate` gives the rings something to draw. Neither was changed.
    expect(metrics.rate(0, 0)).toBeNull()
    expect(metrics.wholeRate(0, 0)).toBe(0)
  })
})

describe('the breakdowns his charts read', () => {
  test('the monthly trend is keyed on the APPROACH date, oldest first', () => {
    const rows = metrics.monthlySecuredTrend([
      deal({ approachDate: '2026-03-04', jobSecuredValue: 100 }),
      deal({ approachDate: '2026-01-09', jobSecuredValue: 400 }),
      deal({ approachDate: '2026-03-20', jobSecuredValue: 50 })
    ])
    expect(rows).toEqual([
      { month: '2026-01', value: 400 },
      { month: '2026-03', value: 150 }
    ])
  })

  test('a deal with no approach date is left out of the trend', () => {
    expect(metrics.monthlySecuredTrend([deal({ jobSecuredValue: 900 })])).toEqual([])
  })

  test('the status, source, staff and industry breakdowns carry his field names', () => {
    const d = metrics.dashboard(
      [deal({ prospectStatus: 'Active', prospectSource: 'Referral', leadStaff: 'Jo', jobSecuredValue: 500 })],
      [coi({ industry: 'Legal' })]
    )
    expect(d.statusBreakdown[0]).toEqual({ status: 'Active', count: 1 })
    expect(d.sourceBreakdown[0]).toEqual({ source: 'Referral', count: 1 })
    expect(d.staffSecuredBreakdown[0]).toEqual({ leadStaff: 'Jo', value: 500 })
    expect(d.coiIndustryBreakdown[0]).toEqual({ industry: 'Legal', relationships: 1 })
  })
})

describe('the earlier single-funnel shape is untouched', () => {
  test('compute() still returns what its own tests and callers expect', () => {
    // The port ADDS a shape; it does not remove one. Nobody asked for a field
    // to disappear from a published contract.
    const m = metrics.compute([deal({ secureMeeting: true })], [])
    expect(m.funnel).toBeDefined()
    expect(m.funnel.approached).toBe(1)
    expect(m.value).toBeDefined()
    expect(m.coi).toBeDefined()
  })
})

describe('bad input does not throw', () => {
  test('no arguments, nulls and empty lists all produce a drawable payload', () => {
    ;[metrics.dashboard(), metrics.dashboard(null, null), metrics.dashboard([], [])].forEach((d) => {
      expect(d.campaignFunnel.approaches).toBe(0)
      expect(d.totalNeedsFunnel.approaches).toBe(0)
      expect(d.coiPerformance.total).toBe(0)
      expect(d.statusBreakdown).toEqual([])
    })
  })

  test('a non-numeric money field becomes 0 rather than NaN', () => {
    const d = metrics.dashboard([deal({ jobSecured: true, jobSecuredValue: 'abc' })], [])
    expect(d.totalSecuredValue).toBe(0)
    expect(Number.isNaN(d.campaignFunnel.avgFee)).toBe(false)
  })
})
