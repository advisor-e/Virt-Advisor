'use strict'

const { computeEbitdaDcf } = require('../../server/report/ebitdaDcfModel')

/**
 * Golden values read from `EBITDA Model.xlsx` (deconstructed + independently validated
 * 2026-07-17 — 96/96 cells, plan decision log). The #REF!-broken remnants (Interest
 * Calcs sheet, Margin-of-Error workings) are excluded by owner ruling and have no cells
 * here. All arrays oldest-first (2021..2025 / 2026..2030).
 */
describe('EBITDA & DCF — golden values (source-sheet defaults)', () => {
  const r = computeEbitdaDcf({})

  test('years and period count — G6..K6, AB6', () => {
    expect(r.years).toEqual([2021, 2022, 2023, 2024, 2025])
    expect(r.periodCount).toBe(5)
  })

  test('Gross Profit — row 12', () => {
    expect(r.pnl.grossProfit).toEqual([249254, 601563, 948375, 800440, 1254877])
  })

  test('Gross profit % — row 13', () => {
    const want = [0.2456725851, 0.4126257811, 0.2674651537, 0.1718826936, 0.1842815487]
    want.forEach((w, i) => expect(r.pnl.grossProfitPct[i]).toBeCloseTo(w, 9))
  })

  test('Net Operating Profit — row 16', () => {
    expect(r.pnl.netOperatingProfit).toEqual([63621, 236349, 598723, 454654, 359511])
  })

  test('Operating expense % — row 17', () => {
    const want = [0.1829657257, 0.2505086118, 0.09861049262, 0.0742524475, 0.1314865386]
    want.forEach((w, i) => expect(r.pnl.operatingExpensePct[i]).toBeCloseTo(w, 9))
  })

  test('Sub Total Sundry Income — row 24', () => {
    expect(r.pnl.sundrySubtotal).toEqual([3500, 15612, 13353, 8289, 65163])
  })

  test('Net Profit before Tax — row 25', () => {
    expect(r.pnl.netProfitBeforeTax).toEqual([67121, 251961, 612076, 462943, 424674])
  })

  test('Sub Total Cost Adjustments — row 41', () => {
    expect(r.pnl.addBackSubtotal).toEqual([235800, 236500, 239000, 237000, 300121])
  })

  test('Owners Discretionary Cash Flow (EBPITDA) — row 43', () => {
    expect(r.pnl.ebpitda).toEqual([302921, 488461, 851076, 699943, 724795])
  })

  test('Subtotal Owner\'s Benefits — row 51', () => {
    expect(r.pnl.ownerBenefitsSubtotal).toEqual([153000, 153000, 153000, 153000, 153000])
  })

  test('EBITDA (normalised) — row 53', () => {
    expect(r.pnl.ebitda).toEqual([149921, 335461, 698076, 546943, 571795])
  })

  test('valuation: actual growth rates + count + average — F13..I13, E8, I15', () => {
    const want = [1.237585128, 1.080945326, -0.2164993496, 0.04543800725]
    want.forEach((w, i) => expect(r.valuation.actualGrowth[i]).toBeCloseTo(w, 8))
    expect(r.valuation.actualGrowthCount).toBe(4)
    expect(r.valuation.averageActualGrowth).toBeCloseTo(0.5368672779, 9)
  })

  test('valuation: projected EBITDA 2026-2030 — row 12 future', () => {
    expect(r.valuation.futureYears).toEqual([2026, 2027, 2028, 2029, 2030])
    const want = [594666.8, 630346.808, 661864.1484, 681720.0729, 708988.8758]
    want.forEach((w, i) => expect(r.valuation.projectedEbitda[i]).toBeCloseTo(w, 3))
  })

  test('valuation: discounted cash flow — K9..O9', () => {
    const want = [558986.792, 586222.5314, 628770.941, 647634.0692, 666449.5432]
    want.forEach((w, i) => expect(r.valuation.discountedCashFlow[i]).toBeCloseTo(w, 3))
  })

  test('valuation: sum, terminal, ENTERPRISE VALUE — O7, Q7, Q5', () => {
    expect(r.valuation.sumDiscounted).toBeCloseTo(3088063.877, 2)
    expect(r.valuation.terminalValue).toBeCloseTo(1332899.086, 2)
    expect(r.valuation.enterpriseValue).toBeCloseTo(4420962.963, 2)
  })

  test('listed: market cap — G20', () => {
    expect(r.listed.marketCap).toBeCloseTo(1908637383, 0)
  })

  test('listed: actual growth (incl. the blank-2025 -> -1) + count + average — F29..I29, E24, I31', () => {
    const want = [7.246648794, -3.80136541, -0.3630033654, -1]
    want.forEach((w, i) => expect(r.listed.actualGrowth[i]).toBeCloseTo(w, 8))
    expect(r.listed.actualGrowthCount).toBe(4)
    expect(r.listed.averageActualGrowth).toBeCloseTo(0.5205700046, 9)
  })

  test('listed: projection seeds from 2024 when 2025 is blank — K28..O28 (the sheet\'s own fallback)', () => {
    const want = [570.856, 587.98168, 599.7413136, 617.733553, 642.4428951]
    want.forEach((w, i) => expect(r.listed.projectedEbitda[i]).toBeCloseTo(w, 6))
  })

  test('listed: discounted cash flow — K25..O25', () => {
    const want = [536.60464, 546.8229624, 569.7542479, 586.8468754, 603.8963214]
    want.forEach((w, i) => expect(r.listed.discountedCashFlow[i]).toBeCloseTo(w, 6))
  })

  test('listed: sum, terminal, calculated EV, ASSESSED SHARE PRICE — O23, Q23, Q21, N21', () => {
    expect(r.listed.sumDiscounted).toBeCloseTo(2843.925047, 5)
    expect(r.listed.terminalValue).toBeCloseTo(150974080.4, 0)
    expect(r.listed.calculatedEnterpriseValue).toBeCloseTo(2994899127, 0)
    expect(r.listed.assessedSharePrice).toBeCloseTo(0.9257863754, 9)
    expect(r.listed.currentSharePrice).toBeCloseTo(0.59, 9)
  })
})

describe('EBITDA & DCF — adapts to fewer periods', () => {
  test('three years of accounts compute end-to-end', () => {
    const r = computeEbitdaDcf({
      latestYear: 2025,
      sales: [3545789, 4656897, 6809564],
      costOfSales: [2597414, 3856457, 5554687],
      operatingExpenses: [349652, 345786, 895366],
      sundry: {
        otherIncome: [12564, 7800, 64600],
        badDebtsRecovered: [0, 0, 0],
        interestReceived: [789, 489, 563],
        dividendsReceived: [0, 0, 0]
      },
      addBacks: {
        managementFees: [0, 0, 0],
        loanInterestPaid: [13000, 11000, 74121],
        consentCosts: [0, 0, 0],
        extraordinaryItems: [0, 0, 0],
        establishmentCosts: [0, 0, 0],
        shareholderSalaries: [187500, 187500, 187500],
        insuranceRetirement: [7500, 7500, 7500],
        ownersVehicles: [16000, 16000, 16000],
        leaseholdImprovements: [15000, 15000, 15000],
        assetUpgrades: [0, 0, 0],
        other3: [0, 0, 0],
        other4: [0, 0, 0],
        other5: [0, 0, 0]
      },
      fairMarket: {
        salaries: [140000, 140000, 140000],
        insuranceRetirement: [2500, 2500, 2500],
        vehicles: [9000, 9000, 9000],
        fringeBenefits: [1500, 1500, 1500]
      }
    })
    expect(r.years).toEqual([2023, 2024, 2025])
    expect(r.periodCount).toBe(3)
    // the 2023-2025 EBITDA values match their five-year counterparts
    expect(r.pnl.ebitda).toEqual([698076, 546943, 571795])
    expect(r.valuation.actualGrowthCount).toBe(2)
    // the projection still runs 5 future years from the same 2025 seed
    expect(r.valuation.enterpriseValue).toBeCloseTo(4420962.963, 2)
  })
})

describe('EBITDA & DCF — honesty guards (null over fabricated figures)', () => {
  test('zero sales year: the sheet\'s own zero-guard returns 0 percentages', () => {
    const r = computeEbitdaDcf({ sales: [0, 1457890, 3545789, 4656897, 6809564] })
    expect(r.pnl.grossProfitPct[0]).toBe(0)
    expect(r.pnl.operatingExpensePct[0]).toBe(0)
    expect(r.periodCount).toBe(4) // countif(">1") — the zero year drops out
  })

  test('zero prior-year EBITDA: growth is null and excluded from the average, never Infinity', () => {
    // year 1 crafted so EBITDA lands exactly on 0 (NPBT + add-backs = fair-market package)
    const z = computeEbitdaDcf({
      sales: [388621, 1457890, 3545789, 4656897, 6809564],
      costOfSales: [285621, 856327, 2597414, 3856457, 5554687],
      operatingExpenses: [185800, 365214, 349652, 345786, 895366],
      sundry: {
        otherIncome: [0, 15247, 12564, 7800, 64600],
        badDebtsRecovered: [0, 0, 0, 0, 0],
        interestReceived: [0, 365, 789, 489, 563],
        dividendsReceived: [0, 0, 0, 0, 0]
      }
      // year 1: gross 103000, NOP -82800, NPBT -82800, +235800 = 153000, -153000 = EBITDA 0
    })
    expect(z.pnl.ebitda[0]).toBe(0)
    expect(z.valuation.actualGrowth[0]).toBeNull()
    expect(z.valuation.actualGrowthCount).toBe(3)
    expect(Number.isFinite(z.valuation.averageActualGrowth)).toBe(true)
  })

  test('zero shares issued: assessed share price is null, never Infinity', () => {
    const r = computeEbitdaDcf({ listed: { sharesIssued: 0 } })
    expect(r.listed.assessedSharePrice).toBeNull()
    expect(r.listed.marketCap).toBe(0)
  })

  test('insolvent-now reads truthfully negative, never clamped', () => {
    const r = computeEbitdaDcf({
      costOfSales: [1200000, 1600000, 3800000, 5000000, 7000000] // upside-down every year
    })
    expect(r.pnl.ebitda[4]).toBeLessThan(0)
    expect(r.valuation.enterpriseValue).toBeLessThan(0) // a loss-maker values negative — the truth
  })

  test('junk input is robust: strings coerce, garbage falls back to defaults', () => {
    const junk = computeEbitdaDcf({
      sales: ['1014578', '1457890', '3545789', '4656897', '6809564'],
      dcf: { exitMultiple: '2', projectedGrowth: ['0.04', '0.06', '0.05', '0.03', '0.04'] },
      listed: { sharePrice: 'not-a-number' },
      addBacks: 'garbage',
      nonsense: { deeply: ['weird'] }
    })
    expect(junk.valuation.enterpriseValue).toBeCloseTo(4420962.963, 2)
    expect(junk.listed.currentSharePrice).toBeCloseTo(0.59, 9) // fell back to the default
  })

  test('null/undefined/empty inputs return the full default computation', () => {
    for (const empty of [null, undefined, {}, 'junk', 42]) {
      const r = computeEbitdaDcf(empty)
      expect(r.valuation.enterpriseValue).toBeCloseTo(4420962.963, 2)
      expect(r.pnl.ebitda[4]).toBe(571795)
    }
  })
})
