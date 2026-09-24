'use strict'

const {
  DEFAULT_INPUTS,
  MAX_TASKS,
  computeOwnerExpectations,
  computeDevelopmentStages,
  computeQuickLoan
} = require('../../server/report/ownerExpectationsModel')

/**
 * GOLDEN TEST — Business Owner Expectations and Business Development Stages (item 5.3).
 *
 * Every expected number is the source workbook's OWN cached value, read out of
 * `design/report-source-models/BO Expectations.xlsx`, with the cell beside it so any
 * figure can be re-checked by hand. Where the workbook is internally odd, the SOURCE's
 * number is asserted: reproducing it is the job, repairing it is Mike's decision.
 */

const P = 6

describe('Business Owners Data Entry — golden values', () => {
  const r = computeOwnerExpectations(DEFAULT_INPUTS)

  it('adds every owner on each row into the totals column', () => {
    expect(r.totals.incomes[0]).toBeCloseTo(240001, P) //   AF5
    expect(r.totals.incomes[1]).toBeCloseTo(250001, P) //   AF6
    expect(r.totals.incomes[2]).toBeCloseTo(370000, P) //   AF9
    expect(r.totals.incomes[3]).toBeCloseTo(475000, P) //   AF12
    expect(r.totals.weeklyHours).toEqual([233, 85, 75]) //  AF7, AF10, AF13
    expect(r.totals.leaveWeeks).toEqual([12, 14, 18]) //    AF8, AF11, AF14
  })

  it('prices each duty at the owner\'s stage 1 week, now and focus alike', () => {
    const andy = r.owners[0]
    expect(andy.duties[0].nowHours).toBeCloseTo(4.5, P) //     F16 = $E$7*E16
    expect(andy.duties[0].focusHours).toBeCloseTo(18, P) //    H16 = $E$7*G16
    expect(andy.duties[2].focusHours).toBeCloseTo(11.25, P) // H18
    expect(andy.duties[7].focusHours).toBeCloseTo(2.25, P) //  H23
    const bob = r.owners[3]
    expect(bob.duties[0].nowHours).toBeCloseTo(3.8, P) //      R16 = $Q$7*Q16
    expect(bob.duties[4].focusHours).toBeCloseTo(7.6, P) //    T20
    const dick = r.owners[5]
    expect(dick.duties[8].focusHours).toBeCloseTo(3, P) //     AB24
  })

  it('totals each owner\'s split, which the sample keeps at 100%', () => {
    const shirley = r.owners[2]
    expect(shirley.dutyTotals.now).toBeCloseTo(1, P) //        M27
    expect(shirley.dutyTotals.nowHours).toBeCloseTo(40, P) //  N27
    expect(shirley.dutyTotals.focus).toBeCloseTo(1, P) //      O27
    expect(shirley.dutyTotals.focusHours).toBeCloseTo(40, P) // P27
    expect(r.owners[4].dutyTotals.focusHours).toBeCloseTo(35, P) // X27
  })

  it('carries the four column years', () => {
    expect(r.years).toEqual([2025, 2026, 2029, 2031]) // D5, D6, D9, D12
  })
})

describe('Business Development Stages — golden values', () => {
  const { stages } = computeDevelopmentStages(DEFAULT_INPUTS)
  const [e, f, g, h] = stages

  it('takes each stage\'s net profit from the owners\' income total', () => {
    expect(e.netProfit).toBeCloseTo(240001, P) // E21 = owners!AF5
    expect(h.netProfit).toBeCloseTo(475000, P) // H21 = owners!AF12
  })

  it('works back up to the revenue each stage must reach', () => {
    expect(e.totalGrossProfit).toBeCloseTo(614001, P) // E15
    expect(g.totalGrossProfit).toBeCloseTo(824000, P) // G15
    expect(e.grossProfit).toBeCloseTo(699001, P) //      E10
    expect(h.grossProfit).toBeCloseTo(1064000, P) //     H10
    expect(e.revenue).toBeCloseTo(1311383, P) //         E6
    expect(f.revenue).toBeCloseTo(1341383, P) //         F6
    expect(g.revenue).toBeCloseTo(1521382, P) //         G6
    expect(h.revenue).toBeCloseTo(1676382, P) //         H6
  })

  it('states every cost and the profit as a share of that revenue', () => {
    expect(e.cogsPct).toBeCloseTo(0.4669741792, P) //       E7
    expect(h.cogsPct).toBeCloseTo(0.3652997944, P) //       H7
    expect(e.salesPromoPct).toBeCloseTo(0.06481706717, P) // E12
    expect(g.salesPromoPct).toBeCloseTo(0.05587025481, P) // G12
    expect(e.fixedCostsPct).toBeCloseTo(0.2851950956, P) //  E20
    expect(h.fixedCostsPct).toBeCloseTo(0.3006474658, P) //  H20
    expect(e.netProfitPct).toBeCloseTo(0.1830136581, P) //   E22
    expect(f.netProfitPct).toBeCloseTo(0.1863755542, P) //   F22
    expect(g.netProfitPct).toBeCloseTo(0.2431999327, P) //   G22
    expect(h.netProfitPct).toBeCloseTo(0.2833483061, P) //   H22
  })

  it('🔴 FIXED (Mike, 2026-09-24): Debt / Equity % divides debt by EQUITY, as its heading says', () => {
    // NOT the workbook's figures. E26:H26 are E25/E24 — debt ÷ total assets — which cached
    // 0.403024055 / 0.4 / 0.3571428571 / 0.18. Each figure below is worked out by hand:
    expect(e.equity).toBe(130290) //                         218,250 − 87,960
    expect(e.debtRatio).toBeCloseTo(87960 / 130290, P) //    = 0.6751093714
    expect(f.debtRatio).toBeCloseTo(100000 / 150000, P) //   250,000 − 100,000 = 150,000 → 0.6666666667
    expect(g.debtRatio).toBeCloseTo(125000 / 225000, P) //   350,000 − 125,000 = 225,000 → 0.5555555556
    expect(h.debtRatio).toBeCloseTo(90000 / 410000, P) //    500,000 − 90,000 = 410,000 → 0.2195121951
  })

  it('has no ratio when there is no equity left, rather than a number that means nothing', () => {
    const inputs = JSON.parse(JSON.stringify(DEFAULT_INPUTS))
    inputs.development.debt = [218250, 300000, 0, 90000] // equal to, above, and no debt at all
    const [s0, s1, s2] = computeDevelopmentStages(inputs).stages
    expect(s0.debtRatio).toBeNull()
    expect(s1.debtRatio).toBeNull()
    expect(s2.debtRatio).toBe(0)
  })

  it('follows the owners sheet when an owner\'s target changes', () => {
    const inputs = JSON.parse(JSON.stringify(DEFAULT_INPUTS))
    inputs.owners[0].incomes[3] += 100000
    const next = computeDevelopmentStages(inputs).stages[3]
    expect(next.netProfit - h.netProfit).toBeCloseTo(100000, P)
    expect(next.revenue - h.revenue).toBeCloseTo(100000, P)
  })
})

describe('Quick Calculator — golden values', () => {
  it('reads year one of the Table worksheet', () => {
    const q = computeQuickLoan(DEFAULT_INPUTS)
    expect(q.yearOneInterest).toBeCloseTo(24193.6581, 4) //    M8 = sum('Interest Calcs'!E30:E41)
    expect(q.monthlyRepayment).toBeCloseTo(7425.449453, 5) //  M10 = 'Interest Calcs'!C23
    expect(q.annualRepayment).toBeCloseTo(89105.39343, 4) //   P18 = sum('Interest Calcs'!C30:C41)
  })

  it('reads year one of the Reducing worksheet', () => {
    const q = computeQuickLoan({ loan: { ...DEFAULT_INPUTS.loan, type: 'Reducing' } })
    expect(q.yearOneInterest).toBeCloseTo(23843.75, 6) //       O41 = sum('Interest Calcs'!M30:M41)
    expect(q.annualRepayment).toBeCloseTo(98843.75, 6) //       sum(K30:K41) = 12 × 6,250 + 23,843.75
  })

  it('🔴 FIXED (Mike, 2026-09-24): a Reducing loan\'s monthly repayment is its first month, not the Table instalment', () => {
    // NOT M10's figure: the workbook showed the Table PMT, 7,425.449453, for both types.
    // 8,437.50 is the workbook's own 'Interest Calcs'!K30 — 375,000 / 60 = 6,250 principal,
    // plus 375,000 × 7% / 12 = 2,187.50 interest.
    const reducing = computeQuickLoan({ loan: { ...DEFAULT_INPUTS.loan, type: 'Reducing' } })
    expect(reducing.monthlyRepayment).toBeCloseTo(8437.5, 6)
    expect(computeQuickLoan(DEFAULT_INPUTS).monthlyRepayment).toBeCloseTo(7425.449453, 5) // Table: C23, unchanged
  })
})

describe('Hostile and partial input', () => {
  it('treats junk as zero rather than letting NaN reach a screen', () => {
    const r = computeDevelopmentStages({ owners: [{ incomes: ['x', null, {}, 5] }], development: { cogs: 'lots' } })
    r.stages.forEach((s) => {
      Object.keys(s).forEach((k) => {
        if (typeof s[k] === 'number') { expect(Number.isFinite(s[k])).toBe(true) }
      })
    })
    expect(r.stages[3].netProfit).toBe(5)
  })

  it('ignores a seventh owner, as the sheet has six blocks', () => {
    const seven = Array.from({ length: 7 }, () => ({ incomes: [1, 1, 1, 1] }))
    expect(computeOwnerExpectations({ owners: seven }).owners).toHaveLength(6)
  })

  it('caps free text so a pasted essay cannot swell a response', () => {
    const s = computeDevelopmentStages({ development: { markets: ['m'.repeat(5000)] } })
    expect(s.stages[0].markets).toHaveLength(200) // the saved-report store's ceiling
  })

  it('carries each owner\'s own task names, in their order, capped', () => {
    const r = computeOwnerExpectations({
      owners: [
        { stages: [{ weeklyHours: 40 }], duties: [{ task: '  Board work ', now: 0.5, focus: 0.25 }, { task: 'Hiring', now: 0.5, focus: 0.75 }] },
        { stages: [{ weeklyHours: 50 }], duties: Array.from({ length: 30 }, (_, i) => ({ task: 'T' + i, now: 0 })) }
      ]
    })
    expect(r.owners[0].duties.map(d => d.task)).toEqual(['Board work', 'Hiring'])
    expect(r.owners[0].duties[1].focusHours).toBeCloseTo(30, P)
    expect(r.owners[0].dutyTotals.now).toBeCloseTo(1, P)
    expect(r.owners[1].duties).toHaveLength(MAX_TASKS)
  })

  it('starts every sample owner on the workbook\'s ten tasks, read from the shipped list', () => {
    const shipped = require('../../data/owner-focus-tasks.json').tasks
    expect(shipped).toHaveLength(10)
    expect(shipped[0]).toBe('(Strategic) Client Dealings') // D16
    expect(shipped[9]).toBe('Other 1') //                     D25
    computeOwnerExpectations(DEFAULT_INPUTS).owners
      .forEach(o => expect(o.duties.map(d => d.task)).toEqual(shipped))
  })

  it('returns zero, never Infinity, for a loan with no term', () => {
    const q = computeQuickLoan({ loan: { amount: 1000, rate: 0.05, termMonths: 0 } })
    expect(q.monthlyRepayment).toBe(0)
    expect(q.annualRepayment).toBe(0)
  })
})
