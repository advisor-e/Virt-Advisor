'use strict'

const {
  computeThreeWayForecast,
  computeThreeYearForecast,
  DEFAULTS
} = require('../../server/report/threeWayForecastModel')

/**
 * Two fixes to the Three-Way Forecast, built 2026-09-05 on Mike's instruction.
 *
 *   Fix 1 — a facility that carries a balance instead of paying it off.
 *   Fix 2 — deposits already paid on stock that has not arrived.
 *
 * Drawing: `design/mockups/three-way-forecast-facilities-and-transit.html`, whose ten
 * questions Mike ruled one at a time on 2026-09-05 — five of them changing the drawing.
 * They are two independent fixes on one page, and they are tested here together for the
 * same reason they were drawn together: both concern what the opening position carries
 * into the forecast, and both reach the balance sheet and the cash flow.
 *
 * 🔴 THE GUARD IS WRITTEN FIRST AND IT COMES FIRST HERE. Both changes touch the three
 * statements, which is the condition that made this guard mandatory for item 4.64: with
 * the new fields empty the forecast must be unchanged to the cent. The 10,155-cell golden
 * set in `threeWayForecastModel.test.js` is the other half of it and runs untouched.
 */

/** What the client is actually shown, and where any real drift would appear. */
const statementsOf = f => JSON.stringify({
  profitAndLoss: f.profitAndLoss,
  balanceSheet: f.balanceSheet,
  cashFlow: f.cashFlow
})

describe('the guard — with the new fields empty, nothing moves', () => {
  test('🔴 spelling both blocks out explicitly is byte-identical to saying nothing', () => {
    const silent = computeThreeWayForecast({})
    const spelledOut = computeThreeWayForecast({
      loans: DEFAULTS.loans.map(l => Object.assign({}, l, { type: 'term' })),
      openingBalanceSheet: Object.assign({}, DEFAULTS.openingBalanceSheet, { stockInTransitDeposits: 0 }),
      stockInTransit: { balanceOwing: 0, landing: new Array(12).fill(0) }
    })
    expect(statementsOf(spelledOut)).toBe(statementsOf(silent))
  })

  test('every funding line in the golden set is a term loan, so none of Fix 1 reaches it', () => {
    const f = computeThreeWayForecast({})
    f.schedules.loans.forEach((l) => { expect(l.type).toBe('term') })
    f.balanceSheet.months.totalFacilities.forEach(v => expect(v).toBe(0))
    f.profitAndLoss.interestFacilities.forEach(v => expect(v).toBe(0))
    // And the term-loan line still carries what it always carried.
    expect(f.profitAndLoss.interestTermLoans[0]).toBe(
      f.schedules.loans.reduce((a, l) => a + l.interest[0], 0))
  })

  test('stock in transit is silent unless the opening balance sheet carried a deposit', () => {
    const t = computeThreeWayForecast({}).schedules.stockInTransit
    expect(t.openingDeposits).toBe(0)
    expect(t.notLanded).toBe(0)
    t.landedValue.forEach(v => expect(v).toBe(0))
    t.balancePaid.forEach(v => expect(v).toBe(0))
    t.borderGst.forEach(v => expect(v).toBe(0))
  })
})

describe('Fix 1 — a facility carries its balance and is charged interest on it', () => {
  /** The real client's own facility: 2,450,000 at 8%. */
  const FACILITY = { name: 'Trade finance', type: 'facility', opening: 2450000, monthlyRepayment: 0, interestRate: 0.08 }

  test('the balance does not amortise — it closes where it opened', () => {
    const fac = computeThreeWayForecast({ loans: [FACILITY] }).schedules.loans[0]
    fac.capitalRepaid.forEach(v => expect(v).toBe(0))
    fac.closingBalance.forEach(v => expect(v).toBe(2450000))
  })

  test('🔴 and the workaround it replaces does exactly what the drawing said it did', () => {
    // "Put it in a loan row and set the repayment to zero" does not give an interest-only
    // facility. Capital repaid is worked out as `repayment − interest`, so a zero repayment
    // makes it NEGATIVE and the debt grows by its own interest — while the interest is also
    // paid in cash. The charge lands twice and the balance sheet still ties, so nothing
    // complains. These two figures are the ones printed on the drawing, and they are why
    // the fix is a schedule rather than a note telling advisors to use a loan row.
    const broken = computeThreeWayForecast({
      loans: [Object.assign({}, FACILITY, { type: 'term' })]
    }).schedules.loans[0]
    expect(broken.capitalRepaid[0]).toBe(-16333)
    expect(broken.closingBalance[11]).toBe(2653348)

    const fixed = computeThreeWayForecast({ loans: [FACILITY] }).schedules.loans[0]
    expect(fixed.closingBalance[11]).toBe(2450000)
  })

  test('interest is charged every month, on the balance', () => {
    const fac = computeThreeWayForecast({ loans: [FACILITY] }).schedules.loans[0]
    fac.interest.forEach(v => expect(v).toBe(Math.round(2450000 * 0.08 / 12)))
  })

  test('a facility reports no monthly repayment, whatever it was sent', () => {
    // The box on screen is disabled and says "No set repayment"; a figure left in it from
    // before the Type was switched must not survive into the schedule and quietly amortise.
    const fac = computeThreeWayForecast({
      loans: [Object.assign({}, FACILITY, { monthlyRepayment: 25000 })]
    }).schedules.loans[0]
    expect(fac.monthlyRepayment).toBe(0)
    fac.capitalRepaid.forEach(v => expect(v).toBe(0))
  })

  test('drawdowns and repayments are typed, and they move the balance', () => {
    const fac = computeThreeWayForecast({
      loans: [Object.assign({}, FACILITY, {
        drawdowns: [0, 500000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lumpSumRepayments: [0, 0, 0, 300000, 0, 0, 0, 0, 0, 0, 0, 0]
      })]
    }).schedules.loans[0]
    expect(fac.closingBalance[0]).toBe(2450000)
    expect(fac.closingBalance[1]).toBe(2950000)
    expect(fac.closingBalance[3]).toBe(2650000)
    // Interest follows the balance, not the opening figure.
    expect(fac.interest[2]).toBe(Math.round(2950000 * 0.08 / 12))
  })

  test('🔴 a facility’s interest is its own figure, and both are still charged', () => {
    const f = computeThreeWayForecast({
      loans: [
        { name: 'Bank term loan', type: 'term', opening: 80000, monthlyRepayment: 2450, interestRate: 0.07 },
        FACILITY
      ]
    })
    const term = f.profitAndLoss.interestTermLoans
    const fac = f.profitAndLoss.interestFacilities
    expect(term[0]).toBe(Math.round(80000 * 0.07 / 12))
    expect(fac[0]).toBe(Math.round(2450000 * 0.08 / 12))
    // Two figures, and BOTH reach the cash flow. The fault being fixed is a facility that
    // cost the forecast nothing at all — 42% of that client's liabilities, earning nothing.
    expect(f.cashFlow.payments.interestPaid[0]).toBeCloseTo(
      term[0] + fac[0] + f.cashFlow.overdraftInterest[0] + f.profitAndLoss.overheads.interestIrd[0], 6)
  })

  test('🔴 a facility is a CURRENT liability; a term loan is not', () => {
    // Mike's ruling of 2026-09-05, given when revolving trade finance was left in Other
    // current liability: a facility is repayable on demand. Putting it with the term loans
    // would move 2,450,000 out of that client's working capital.
    const f = computeThreeWayForecast({
      loans: [
        { name: 'Bank term loan', type: 'term', opening: 80000, monthlyRepayment: 2450, interestRate: 0.07 },
        FACILITY
      ]
    })
    expect(f.balanceSheet.opening.totalFacilities).toBe(2450000)
    expect(f.balanceSheet.opening.nonCurrentLiabilities.map(l => l.name)).toEqual(['Bank term loan'])
    expect(f.balanceSheet.months.facilities).toHaveLength(1)
    expect(f.balanceSheet.months.nonCurrentLiabilities).toHaveLength(1)
    expect(f.balanceSheet.months.totalFacilities[0]).toBe(2450000)
  })

  test('the three statements still articulate with a facility running', () => {
    const f = computeThreeWayForecast({
      openingBalanceSheet: Object.assign({}, DEFAULTS.openingBalanceSheet, {
        retainedEarnings: 7000 - 164000 - 2450000
      }),
      loans: DEFAULTS.loans.concat([FACILITY])
    })
    expect(f.balanceSheet.opening.balanceCheck).toBe(0)
    f.balanceSheet.months.balanceCheck.forEach(v => expect(v).toBe(0))
  })
})

describe('Fix 1 — funding rows appear as they are needed, capped at eight', () => {
  const line = (n, opening) => ({ name: 'Line ' + n, type: 'term', opening, monthlyRepayment: 0, interestRate: 0 })

  test('six funding lines are six schedules, not three folded together', () => {
    const loans = [1, 2, 3, 4, 5, 6].map((n, i) => line(n, (i + 1) * 1000))
    const f = computeThreeWayForecast({ loans })
    expect(f.schedules.loans).toHaveLength(6)
    expect(f.balanceSheet.opening.totalNonCurrentLiabilities)
      .toBe(21000 + DEFAULTS.openingBalanceSheet.otherNonCurrentLiability)
  })

  test('past eight the engine takes eight and stops', () => {
    const many = []
    for (let n = 0; n < 20; n++) { many.push(line(n, 1000)) }
    expect(computeThreeWayForecast({ loans: many }).schedules.loans).toHaveLength(8)
  })

  test('🔴 sending FEWER lines than the sample no longer inherits the sample’s money', () => {
    // Until 2026-09-05 this mapped over the three DEFAULT loans, so a caller sending one
    // silently picked up "XYZ Bank" at 1,000,000 and "DEF Finance" at 50,000 in the slots
    // it did not fill — a fictional company's debt in a real client's forecast, with
    // nothing on screen to notice it by. The screen always sent three, so it never bit.
    const f = computeThreeWayForecast({ loans: [line(1, 80000)] })
    expect(f.schedules.loans).toHaveLength(1)
    expect(f.balanceSheet.opening.nonCurrentLiabilities.map(l => l.balance)).toEqual([80000])
  })

  test('a later year may carry a different number of lines without throwing', () => {
    const three = computeThreeYearForecast({
      years: [
        { loans: [line(1, 80000)] },
        { loans: [line(1, 80000), line(2, 25000)] },
        { loans: [line(1, 80000), line(2, 25000), line(3, 9000)] }
      ]
    })
    expect(three.years).toHaveLength(3)
    // A line with no predecessor opens at its OWN figure rather than reaching past the end
    // of last year's schedules, which is what used to throw.
    expect(three.years[1].schedules.loans[1].openingBalance[0]).toBe(25000)
  })
})

describe('Fix 2 — deposits already paid on stock that has not arrived', () => {
  /** The real client's own deposit total. The balance owing is illustrative — no file has one. */
  const DEPOSITS = 825629
  const BALANCE = 550419

  /** An opening position that ties, carrying the deposit on its own line. */
  const openingWith = deposits => Object.assign({}, DEFAULTS.openingBalanceSheet, {
    stockInTransitDeposits: deposits,
    retainedEarnings: 7000 - 164000 + deposits
  })

  const withTransit = landing => computeThreeWayForecast({
    openingBalanceSheet: openingWith(DEPOSITS),
    stockInTransit: { balanceOwing: BALANCE, landing }
  })

  /** A landing of the whole deposit in month 2. */
  const landsInFebruary = () => {
    const landing = new Array(12).fill(0)
    landing[1] = DEPOSITS
    return landing
  }

  test('a deposit with no landing month sits as an asset and nothing else happens', () => {
    const f = withTransit(new Array(12).fill(0))
    expect(f.balanceSheet.opening.balanceCheck).toBe(0)
    f.balanceSheet.months.importPrepayments.forEach(v => expect(v).toBe(DEPOSITS))
    f.cashFlow.payments.stockInTransitBalance.forEach(v => expect(v).toBe(0))
    expect(f.schedules.stockInTransit.notLanded).toBe(DEPOSITS)
  })

  test('🔴 a landing releases the deposit, pays the balance and makes the stock ARRIVE', () => {
    const f = withTransit(landsInFebruary())
    const t = f.schedules.stockInTransit

    // Held as a prepayment until the container lands, then gone.
    expect(f.balanceSheet.months.importPrepayments[0]).toBe(DEPOSITS)
    expect(f.balanceSheet.months.importPrepayments[1]).toBe(0)
    // The balance is settled in the landing month and in no other. Mike's ruling of
    // 2026-09-05 and the load-bearing one: without it the stock lands carrying only its
    // deposit, no cash leaves to pay the rest, and the profit is overstated by figures that
    // all look perfectly reasonable.
    expect(t.balancePaid[1]).toBeCloseTo(BALANCE, 6)
    expect(t.balancePaid[0]).toBe(0)
    // 🔴 THE SECOND SEAM. Releasing the prepayment says the money stopped being a deposit;
    // it does not make the stock arrive. Deposit plus balance is what the goods cost, and
    // that is what has to join purchases, because purchases are what drive inventory.
    expect(t.landedValue[1]).toBeCloseTo(DEPOSITS + BALANCE, 6)
    expect(f.schedules.inventory.purchases[1]).toBeCloseTo(
      DEFAULTS.purchases[1] + DEPOSITS + BALANCE, 6)
  })

  test('the opening cash is untouched — that money left before the forecast began', () => {
    const f = withTransit(landsInFebruary())
    const flat = computeThreeWayForecast({ openingBalanceSheet: openingWith(DEPOSITS) })
    expect(f.cashFlow.openingBalance[0]).toBe(flat.cashFlow.openingBalance[0])
  })

  test('🔴 GST is charged at the border in the landing month, and claimed back after it', () => {
    // Researched rather than assumed (Mike: "research the tax rules rather than guessing").
    // GST is triggered by the goods ARRIVING, not by paying for them, so a deposit paid in
    // a previous financial year still attracts the full border GST here. Charged on the
    // goods alone — his ruling of 2026-09-05 — because the drawing carries no field for
    // duty or freight. Sources: design/TAX-RULES-IMPORT-GST.md.
    const f = withTransit(landsInFebruary())
    const expected = (DEPOSITS + BALANCE) * DEFAULTS.gstRate
    expect(f.schedules.stockInTransit.borderGst[1]).toBeCloseTo(expected, 6)
    expect(f.cashFlow.payments.stockInTransitGst[1]).toBeCloseTo(expected, 6)
    // An input credit on the same return, so it is a TIMING cost and not a lost one.
    const withoutIt = computeThreeWayForecast({ openingBalanceSheet: openingWith(DEPOSITS) })
    expect(f.schedules.gst.inputs[1] - withoutIt.schedules.gst.inputs[1]).toBeCloseTo(expected, 6)
    // And nothing is charged in a month with no landing.
    expect(f.schedules.stockInTransit.borderGst[0]).toBe(0)
  })

  test('🔴 a shortfall is not an error — the remainder stays a deposit at the year end', () => {
    // Deliberately unlike the collection and payment profiles one level up, which DO block.
    // Those are percentages, where anything but 100 is an error. These are amounts, and a
    // container landing after the forecast year ends is what an importer on a nine-month
    // lead has routinely. Blocking would refuse a fact about the business.
    const landing = new Array(12).fill(0)
    landing[1] = 644629
    const f = withTransit(landing)
    expect(f.schedules.stockInTransit.notLanded).toBe(181000)
    expect(f.balanceSheet.months.importPrepayments[11]).toBeCloseTo(181000, 6)
    // The balance owing follows the goods pro rata: only what landed is paid for.
    expect(f.schedules.stockInTransit.balancePaid[1]).toBeCloseTo(BALANCE * (644629 / DEPOSITS), 6)
  })

  test('landing more than was paid is clamped, never invented', () => {
    const landing = new Array(12).fill(0)
    landing[0] = DEPOSITS
    landing[1] = 500000
    const f = withTransit(landing)
    expect(f.schedules.stockInTransit.landing.reduce((a, v) => a + v, 0)).toBe(DEPOSITS)
    expect(f.schedules.stockInTransit.landing[1]).toBe(0)
  })

  test('the three statements articulate through two landings', () => {
    const landing = new Array(12).fill(0)
    landing[1] = 330252
    landing[3] = 495377
    const f = withTransit(landing)
    expect(f.balanceSheet.opening.balanceCheck).toBe(0)
    f.balanceSheet.months.balanceCheck.forEach(v => expect(v).toBe(0))
  })

  test('deposits still on the water at the year end open the next year as deposits', () => {
    const three = computeThreeYearForecast({
      years: [
        {
          openingBalanceSheet: openingWith(DEPOSITS),
          stockInTransit: { balanceOwing: 0, landing: new Array(12).fill(0) }
        },
        {},
        {}
      ]
    })
    expect(three.years[1].balanceSheet.opening.stockInTransitDeposits).toBeCloseTo(DEPOSITS, 6)
  })
})
