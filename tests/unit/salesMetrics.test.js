'use strict'

/**
 * The Sales Tracker dashboard's figures — item 17 stage 3.
 *
 * 🔴 WHY THIS IS TESTED HARD WHILE THE SCREEN AROUND IT IS NOT.
 *
 * Mike's rule of 2026-08-24: a test earns its place when it catches what UAT
 * cannot. Nobody in UAT can see that a conversion rate is wrong — a percentage
 * looks exactly as plausible at 43% as at 34%, and an advisor plans against it.
 * This is the "wrong number" case the rule names, so every figure is pinned to a
 * hand-worked example rather than to whatever the code happens to produce.
 *
 * The one that matters most is the EMPTY DENOMINATOR. A conversion rate over zero
 * approaches is not 0% and not 100% — there is nothing to report. A dashboard
 * showing a confident 0% on an empty pipeline is a wrong number wearing the look
 * of a real one, and an advisor reading it concludes their approach is failing
 * when they have simply not started.
 */

const m = require('../../server/utils/salesMetrics')

/** A deal with only what a test cares about spelled out. */
function deal (over) {
  return Object.assign({
    prospectName: 'X',
    prospectStatus: 'Active',
    secureMeeting: false,
    proposalSent: false,
    proposalValue: 0,
    jobSecured: false,
    jobSecuredValue: 0,
    additionalWorkSecured: 0
  }, over || {})
}

function coi (over) {
  return Object.assign({
    coiName: 'Partner',
    totalReferrals: 0,
    totalConverted: 0,
    feeValue: 0
  }, over || {})
}

describe('🔴 a rate with nothing to divide by is NOT zero', () => {
  test('every rate is null on an empty pipeline', () => {
    const r = m.compute([], [])
    expect(r.funnel.meetingRate).toBeNull()
    expect(r.funnel.proposalRate).toBeNull()
    expect(r.funnel.winRate).toBeNull()
    expect(r.funnel.overallRate).toBeNull()
    expect(r.coi.conversionRate).toBeNull()
  })

  test('a stage with no traffic reports null, not 0%, even when earlier stages have some', () => {
    // Three approaches, no meetings. The meeting rate is a real 0% — it was
    // measured. The proposal rate has NOTHING to measure and must be null.
    const r = m.compute([deal(), deal(), deal()], [])
    expect(r.funnel.meetingRate).toBe(0)
    expect(r.funnel.proposalRate).toBeNull()
    expect(r.funnel.winRate).toBeNull()
  })

  test('averageWin is null with no wins, never a division by zero', () => {
    expect(m.compute([deal(), deal()], []).value.averageWin).toBeNull()
    expect(m.compute([], []).value.averageWin).toBeNull()
  })

  test('medianDaysToSecure is null when no deal records both dates', () => {
    expect(m.compute([deal({ jobSecured: true })], []).value.medianDaysToSecure).toBeNull()
  })

  test('rate() itself: 0 whole is null, a real 0 part is 0', () => {
    expect(m.rate(0, 0)).toBeNull()
    expect(m.rate(5, 0)).toBeNull()
    expect(m.rate(0, 5)).toBe(0)
  })
})

describe('the funnel counts and rates, on a hand-worked example', () => {
  // 10 approached · 6 met · 4 proposed · 3 won. Worked by hand:
  //   meetingRate  6/10 = 60%
  //   proposalRate 4/6  = 66.7%
  //   winRate      3/4  = 75%
  //   overallRate  3/10 = 30%
  const deals = [
    ...Array(4).fill(0).map(() => deal()),
    ...Array(2).fill(0).map(() => deal({ secureMeeting: true })),
    deal({ secureMeeting: true, proposalSent: true }),
    ...Array(3).fill(0).map(() => deal({
      secureMeeting: true, proposalSent: true, jobSecured: true, jobSecuredValue: 1000
    }))
  ]

  test('the counts', () => {
    const f = m.compute(deals, []).funnel
    expect(f).toMatchObject({ approached: 10, meetings: 6, proposals: 4, secured: 3 })
  })

  test('each rate is against the step BEFORE it, not against the total', () => {
    const f = m.compute(deals, []).funnel
    expect(f.meetingRate).toBe(60)
    expect(f.proposalRate).toBe(66.7)
    expect(f.winRate).toBe(75)
    expect(f.overallRate).toBe(30)
  })

  test('a rate is rounded to one decimal, not left at full precision', () => {
    // 1 of 3 = 33.333…
    const r = m.compute([
      deal({ secureMeeting: true }), deal({ secureMeeting: true }),
      deal({ secureMeeting: true, proposalSent: true })
    ], [])
    expect(r.funnel.proposalRate).toBe(33.3)
  })
})

describe('the money', () => {
  test('proposed, secured and additional are summed independently', () => {
    const v = m.compute([
      deal({ proposalValue: 1000 }),
      deal({ proposalValue: 500, jobSecured: true, jobSecuredValue: 400, additionalWorkSecured: 100 })
    ], []).value
    expect(v.proposed).toBe(1500)
    expect(v.secured).toBe(400)
    expect(v.additional).toBe(100)
  })

  test('the average win is over WON deals, not over all deals', () => {
    // Two wins worth 1000 and 2000, plus three that never closed. The average
    // must be 1500, not 600.
    const v = m.compute([
      deal({ jobSecured: true, jobSecuredValue: 1000 }),
      deal({ jobSecured: true, jobSecuredValue: 2000 }),
      deal(), deal(), deal()
    ], []).value
    expect(v.averageWin).toBe(1500)
  })

  test('a null, undefined or unparseable figure counts as 0 rather than poisoning the total', () => {
    const v = m.compute([
      deal({ proposalValue: 100 }),
      deal({ proposalValue: null }),
      deal({ proposalValue: undefined }),
      deal({ proposalValue: 'nonsense' })
    ], []).value
    expect(v.proposed).toBe(100)
    expect(Number.isNaN(v.proposed)).toBe(false)
  })
})

describe('days to secure', () => {
  test('a MEDIAN, so one stale deal does not move the number', () => {
    // 10, 20, 30 days and one that sat for two years. A mean would be ~200;
    // the median an advisor can plan against is 25.
    const deals = [
      deal({ jobSecured: true, approachDate: '2026-01-01', dateSecured: '2026-01-11' }),
      deal({ jobSecured: true, approachDate: '2026-01-01', dateSecured: '2026-01-21' }),
      deal({ jobSecured: true, approachDate: '2026-01-01', dateSecured: '2026-01-31' }),
      deal({ jobSecured: true, approachDate: '2024-01-01', dateSecured: '2026-01-01' })
    ]
    expect(m.compute(deals, []).value.medianDaysToSecure).toBe(25)
  })

  test('an odd count takes the middle value', () => {
    const deals = [
      deal({ jobSecured: true, approachDate: '2026-01-01', dateSecured: '2026-01-11' }),
      deal({ jobSecured: true, approachDate: '2026-01-01', dateSecured: '2026-01-21' }),
      deal({ jobSecured: true, approachDate: '2026-01-01', dateSecured: '2026-02-10' })
    ]
    expect(m.compute(deals, []).value.medianDaysToSecure).toBe(20)
  })

  test('an unparseable or negative span is skipped, not counted as zero', () => {
    const deals = [
      deal({ jobSecured: true, approachDate: 'nonsense', dateSecured: '2026-01-11' }),
      deal({ jobSecured: true, approachDate: '2026-02-01', dateSecured: '2026-01-01' }), // backwards
      deal({ jobSecured: true, approachDate: '2026-01-01', dateSecured: '2026-01-11' })
    ]
    expect(m.compute(deals, []).value.medianDaysToSecure).toBe(10)
  })
})

describe('the breakdowns', () => {
  test('counts group by the field, largest first, and skip blanks', () => {
    const r = m.compute([
      deal({ prospectStatus: 'Active' }),
      deal({ prospectStatus: 'Active' }),
      deal({ prospectStatus: 'Won' }),
      deal({ prospectStatus: '' }),
      deal({ prospectStatus: '   ' })
    ], [])
    expect(r.byStatus).toEqual([
      { label: 'Active', value: 2 },
      { label: 'Won', value: 1 }
    ])
  })

  test('secured value by staff sums money, and drops anyone with nothing won', () => {
    const r = m.compute([
      deal({ leadStaff: 'Jo', jobSecured: true, jobSecuredValue: 1000 }),
      deal({ leadStaff: 'Jo', jobSecured: true, jobSecuredValue: 500 }),
      deal({ leadStaff: 'Sam', jobSecured: true, jobSecuredValue: 2000 }),
      deal({ leadStaff: 'Alex', jobSecuredValue: 0 })
    ], [])
    expect(r.securedByStaff).toEqual([
      { label: 'Sam', value: 2000 },
      { label: 'Jo', value: 1500 }
    ])
  })

  test('the shape matches what our SVG chart components take', () => {
    // HBarChart/DoughnutChart want `{ label, value }` per row. Asserted because
    // the whole point of redrawing rather than porting Chart.js is that these
    // feed our own components directly.
    const r = m.compute([deal({ industry: 'Legal' })], [coi({ industry: 'Legal' })])
    const rows = [].concat(r.byStatus, r.byIndustry, r.coi.byIndustry, r.securedByStaff)
    rows.forEach((row) => {
      expect(Object.keys(row).sort()).toEqual(['label', 'value'])
      expect(typeof row.label).toBe('string')
      expect(typeof row.value).toBe('number')
    })
  })
})

describe('secured by month', () => {
  test('groups by the month a job was SECURED, oldest first', () => {
    const r = m.compute([
      deal({ jobSecured: true, dateSecured: '2026-03-15', jobSecuredValue: 100 }),
      deal({ jobSecured: true, dateSecured: '2026-01-02', jobSecuredValue: 200 }),
      deal({ jobSecured: true, dateSecured: '2026-03-28', jobSecuredValue: 300 })
    ], [])
    expect(r.securedByMonth).toEqual([
      { iso: '2026-01', label: '2026-01', value: 200 },
      { iso: '2026-03', label: '2026-03', value: 400 }
    ])
  })

  test('🔴 an undated win is SKIPPED, never dated to today', () => {
    // Dating an undated win to the current month invents a spike in whichever
    // month the screen happened to be opened.
    const r = m.compute([
      deal({ jobSecured: true, dateSecured: null, jobSecuredValue: 999 }),
      deal({ jobSecured: true, dateSecured: 'nonsense', jobSecuredValue: 999 })
    ], [])
    expect(r.securedByMonth).toEqual([])
  })

  test('a deal that is not won does not appear, even with a date', () => {
    const r = m.compute([deal({ dateSecured: '2026-03-15', jobSecuredValue: 100 })], [])
    expect(r.securedByMonth).toEqual([])
  })
})

describe('the COI figures', () => {
  test('referrals, conversions and fee value are summed', () => {
    const c = m.compute([], [
      coi({ totalReferrals: 10, totalConverted: 4, feeValue: 5000 }),
      coi({ totalReferrals: 5, totalConverted: 1, feeValue: 2000 })
    ]).coi
    expect(c).toMatchObject({ total: 2, referrals: 15, converted: 5, feeValue: 7000 })
  })

  test('the conversion rate is converted over REFERRED, not over partners', () => {
    // 5 of 15 referrals = 33.3%. Over partners it would be 250%, which is the
    // kind of number nobody questions until a client sees it.
    const c = m.compute([], [
      coi({ totalReferrals: 10, totalConverted: 4 }),
      coi({ totalReferrals: 5, totalConverted: 1 })
    ]).coi
    expect(c.conversionRate).toBe(33.3)
  })

  test('partners who referred nobody do not make the rate null for everyone else', () => {
    const c = m.compute([], [
      coi({ totalReferrals: 4, totalConverted: 2 }),
      coi({ totalReferrals: 0, totalConverted: 0 })
    ]).coi
    expect(c.conversionRate).toBe(50)
  })

  test('the top partners are by fee value, capped at ten', () => {
    const many = Array(15).fill(0).map((_, i) => coi({ coiName: 'P' + i, feeValue: (i + 1) * 100 }))
    const c = m.compute([], many).coi
    expect(c.topByValue).toHaveLength(10)
    expect(c.topByValue[0]).toEqual({ label: 'P14', value: 1500 })
    // Descending, so the list reads as a ranking.
    const values = c.topByValue.map(r => r.value)
    expect(values).toEqual([...values].sort((a, b) => b - a))
  })
})

describe('it never throws on bad input', () => {
  test.each([
    ['both empty', [], []],
    ['both null', null, null],
    ['both undefined', undefined, undefined],
    ['not arrays', 'nope', 42]
  ])('%s produces a full payload rather than an error', (_label, a, b) => {
    const r = m.compute(a, b)
    expect(r.funnel.approached).toBe(0)
    expect(r.coi.total).toBe(0)
    expect(Array.isArray(r.byStatus)).toBe(true)
  })

  test('a row missing every field is counted but contributes nothing', () => {
    const r = m.compute([{}], [{}])
    expect(r.funnel.approached).toBe(1)
    expect(r.value.proposed).toBe(0)
    expect(r.byStatus).toEqual([])
  })
})
