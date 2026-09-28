'use strict'

/**
 * Item 13.5 — foreign currency, freight and duty in the Three-Way Forecast, by the accounting
 * standards. Drawing approved by Mike 2026-09-26:
 * `design/mockups/three-way-forecast-foreign-currency.html`. Basis:
 * `design/CALCULATION-ASSUMPTIONS.md` §1.
 *
 * WHAT THESE TESTS ARE FOR. A converted figure looks right on screen whether it divided or
 * multiplied by the rate, and a stock cost missing its freight looks like any other number.
 * UAT cannot see either. So every figure the drawing prints is reproduced here from the
 * engine itself, and the workbook the calculator was ported from is run through it month by
 * month.
 */

const {
  resolveCurrencies, currencyOf, toHome, movedRates, MAX_CURRENCIES
} = require('../../server/report/fxConversion')
const { computeImportShipments } = require('../../server/report/importShipmentModel')
const {
  computeThreeWayForecast, computeThreeYearForecast, exchangeRateWhatIf
} = require('../../server/report/threeWayForecastModel')

/** The Excel serial the engine starts from, for 1 January 2026. */
const JAN_2026 = (Date.UTC(2026, 0, 1) - Date.UTC(1899, 11, 30)) / 86400000

const TABLE = [{ code: 'USD', rate: 0.6 }, { code: 'CNY', rate: 4.2 }, { code: 'AUD', rate: 0.9 }]
const sum = row => row.reduce((a, b) => a + b, 0)

/** The overseas block with everything the drawing leaves at its default. */
function overseas (extra) {
  return Object.assign({
    enabled: true,
    importedPurchases: new Array(12).fill(0),
    freightPct: 0.12,
    dutyPct: 0.05,
    fxAllowancePct: 0.1,
    salesFxAllowancePct: 0.1,
    overseasSales: new Array(12).fill(0)
  }, extra)
}

describe('converting at "1 NZD buys"', () => {
  test('a foreign amount divides by the rate: 64,585.80 USD at 0.6000 is 107,643.00 NZD', () => {
    expect(toHome(64585.8, currencyOf('USD', TABLE))).toBeCloseTo(107643, 6)
  })

  test('the firm’s own currency is never converted', () => {
    const own = currencyOf('', TABLE)
    expect(own.known).toBe(true)
    expect(toHome(5000, own)).toBe(5000)
  })

  test('a currency the table does not hold is reported, not guessed', () => {
    const euro = currencyOf('EUR', TABLE)
    expect(euro.known).toBe(false)
    expect(toHome(5000, euro)).toBe(5000)
  })

  test('the table keeps three good rows, first of each code, and refuses a bad rate', () => {
    const t = resolveCurrencies([
      { code: 'usd', rate: 0.6 },
      { code: 'USD', rate: 0.7 },
      { code: 'EUR', rate: 0 },
      { code: 'GBPX', rate: 0.5 },
      { code: 'CNY', rate: '4.2' },
      { code: 'AUD', rate: 0.9 },
      { code: 'JPY', rate: 90 }
    ])
    expect(t).toEqual(TABLE)
    expect(t.length).toBe(MAX_CURRENCIES)
    expect(resolveCurrencies('not a list')).toEqual([])
  })

  test('a 10% fall in the NZ dollar moves every rate together', () => {
    const fallen = movedRates(TABLE, -0.1)
    expect(fallen[0].rate).toBeCloseTo(0.54, 10)
    expect(fallen[1].rate).toBeCloseTo(3.78, 10)
  })
})

/**
 * The drawing's own two orders. January: the workbook's January order, 107,643 of stock,
 * invoiced as 64,585.80 USD. February: 252,000 CNY, illustrative. Both on the workbook's
 * supplier terms — 60% deposit, balance at order + 91 days, 6% interest cover.
 */
const ORDERS = computeImportShipments({
  startDate: '2026-01-01',
  currencies: TABLE,
  shipments: [
    { description: 'January', cost: 64585.8, currency: 'USD', orderDate: '2026-01-01', depositPct: 0.6, speed: 'Sea' },
    { description: 'February', cost: 252000, currency: 'CNY', orderDate: '2026-02-01', depositPct: 0.6, speed: 'Sea' }
  ]
})

/** Sales to overseas customers: 130,000 NZD of it, invoiced as 117,000 AUD at 0.9000. */
const AUD_SALES = [36000, 49500, 31500, 0, 0, 0, 0, 0, 0, 0, 0, 0]

const DRAWING = {
  startDateSerial: JAN_2026,
  currencies: TABLE,
  overseas: overseas({
    importedPurchases: ORDERS.importedPurchases,
    landings: ORDERS.landings,
    overseasSales: AUD_SALES,
    overseasSalesCurrency: 'AUD'
  })
}

describe('the drawing’s January order, before and after', () => {
  const row = ORDERS.rows[0]
  const f = computeThreeWayForecast(DRAWING)
  const os = f.schedules.overseas
  const p = f.cashFlow.payments

  test('the calculator shows the screen its figures in NZD, and keeps the invoice as entered', () => {
    expect(row.currency).toBe('USD')
    expect(row.invoice).toBeCloseTo(64585.8, 6)
    expect(row.cost).toBeCloseTo(107643, 6)
    expect(row.deposit).toBeCloseTo(64585.8, 6)
    expect(row.balance).toBeCloseTo(43057.2, 6)
    expect(row.interest).toBeCloseTo(653.03, 2)
    expect(row.balanceDueOn).toBe('2026-04-02')
  })

  test('the deposit, paid in January, is 64,585.80 — not the 71,044.38 the 10% made it', () => {
    expect(p.overseasDeposits[0]).toBeCloseTo(64585.8, 6)
  })

  test('the balance, paid 2 April, is 43,057.20 plus 653.03 interest cover', () => {
    expect(p.overseasSupplierBalance[3]).toBeCloseTo(43057.2 + 653.0342, 3)
    expect(os.supplierInterest[3]).toBeCloseTo(653.03, 2)
  })

  test('freight 12,917.16 and duty 5,382.15 are paid in May, when it lands', () => {
    expect(row.landsInMonth).toBe(4)
    expect(os.freight[4]).toBeCloseTo(12917.16, 6)
    expect(os.duty[4]).toBeCloseTo(5382.15, 6)
  })

  test('the stock costs 125,942.31, and border GST is 15% of that: 18,891.35', () => {
    expect(os.importedPurchases[4] + os.freight[4] + os.duty[4]).toBeCloseTo(125942.31, 6)
    expect(os.borderGst[4]).toBeCloseTo(18891.35, 2)
  })

  test('no exchange movement is charged — not the 10,764.30 of before', () => {
    expect(sum(f.profitAndLoss.exchangeMovement)).toBe(0)
  })

  test('freight and duty are not charged in May: nothing of it has sold by then', () => {
    expect(os.importedCostOfSales[4]).toBe(0)
  })

  test('the three statements still articulate', () => {
    const base = computeThreeWayForecast({ startDateSerial: JAN_2026 })
    f.balanceSheet.months.balanceCheck.forEach((v, m) => {
      expect(v).toBeCloseTo(base.balanceSheet.months.balanceCheck[m], 6)
    })
  })
})

describe('the February order converts at its own currency’s rate', () => {
  const os = computeThreeWayForecast(DRAWING).schedules.overseas

  test('252,000 CNY at 4.2000: a 36,000 deposit in February and a 24,000 balance on 3 May', () => {
    expect(ORDERS.rows[1].cost).toBeCloseTo(60000, 6)
    expect(ORDERS.rows[1].balanceDueOn).toBe('2026-05-03')
    expect(os.deposits[1]).toBeCloseTo(36000, 6)
    expect(os.supplierInterest[4]).toBeCloseTo(364, 6)
  })
})

describe('overseas sales convert at their customer’s rate', () => {
  const os = computeThreeWayForecast(DRAWING).schedules.overseas

  test('117,000 AUD at 0.9000 is 130,000 NZD of revenue, all of it collected', () => {
    expect(sum(os.overseasRevenue)).toBeCloseTo(130000, 6)
    expect(sum(os.overseasCollections)).toBeCloseTo(130000, 6)
    expect(sum(os.fxOnSales)).toBe(0)
  })
})

describe('what if the exchange rate moves — shown, not charged', () => {
  const what = exchangeRateWhatIf(Object.assign({ yearCount: 1 }, { years: [DRAWING] }))

  test('a 10% fall in the NZ dollar costs 21,906.59 more for the two orders', () => {
    // The drawing's working: 14,066.15 on January's order and 7,840.44 on February's.
    expect(what.applies).toBe(true)
    expect(what.purchases.move).toBeCloseTo(-0.1, 10)
    expect(what.purchases.extraPaid).toBeCloseTo(21906.59, 2)
  })

  test('a 10% rise in the NZ dollar brings in 11,818.18 less from overseas customers', () => {
    expect(what.sales.move).toBeCloseTo(0.1, 10)
    expect(what.sales.lessReceived).toBeCloseTo(11818.18, 2)
  })

  test('each tile names only its own side’s currencies, before and after the move', () => {
    // The drawing: USD and CNY for the orders, AUD for the customers.
    expect(what.purchases.rates.map(r => r.code)).toEqual(['USD', 'CNY'])
    expect(what.purchases.rates[0].moved).toBeCloseTo(0.54, 10)
    expect(what.sales.rates).toEqual([{ code: 'AUD', rate: 0.9, moved: 0.9 * 1.1 }])
  })

  test('the lowest bank balance is reported with and without each move', () => {
    expect(what.purchases.lowestCash.with.value).toBeLessThan(what.purchases.lowestCash.without.value)
    expect(what.sales.lowestCash.with.value).toBeLessThanOrEqual(what.sales.lowestCash.without.value)
  })

  test('the forecast itself is not changed by it', () => {
    const plain = computeThreeYearForecast({ yearCount: 1, years: [DRAWING] })
    expect(what.purchases.lowestCash.without.value).toBeCloseTo(plain.summary.lowestCash.value, 6)
  })

  test('a forecast in the firm’s own currency has nothing to move', () => {
    const home = exchangeRateWhatIf({ yearCount: 1, years: [{}] })
    expect(home.applies).toBe(false)
    expect(home.purchases.extraPaid).toBe(0)
    expect(home.sales.lessReceived).toBe(0)
  })
})

describe('the opening balance owed on stock at sea has a currency too', () => {
  // Mike's ruling (5) of 2026-09-26. 12,000 USD at 0.6000 is 20,000 NZD, paid when it lands.
  // The deposits stay in NZD: they are already paid.
  const f = computeThreeWayForecast({
    startDateSerial: JAN_2026,
    currencies: TABLE,
    openingBalanceSheet: { stockInTransitDeposits: 30000 },
    stockInTransit: { balanceOwing: 12000, balanceCurrency: 'USD', landing: [0, 0, 30000, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
  })

  test('12,000 USD is paid as 20,000 NZD in the landing month', () => {
    expect(f.schedules.stockInTransit.balancePaid[2]).toBeCloseTo(20000, 6)
    expect(f.schedules.stockInTransit.landedValue[2]).toBeCloseTo(50000, 6)
  })

  test('and it moves with the rate in the "what if"', () => {
    const what = exchangeRateWhatIf({
      yearCount: 1,
      years: [{
        startDateSerial: JAN_2026,
        currencies: TABLE,
        openingBalanceSheet: { stockInTransitDeposits: 30000 },
        stockInTransit: { balanceOwing: 12000, balanceCurrency: 'USD', landing: [0, 0, 30000, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
      }]
    })
    // 12,000 USD at 0.5400 is 22,222.22: 2,222.22 more.
    expect(what.purchases.extraPaid).toBeCloseTo(2222.22, 2)
  })
})

describe('a currency removed from the table after something chose it', () => {
  test('the amount is left unconverted and named, so the report can say so', () => {
    const f = computeThreeWayForecast({
      startDateSerial: JAN_2026,
      currencies: [{ code: 'USD', rate: 0.6 }],
      overseas: overseas({ overseasSales: AUD_SALES, overseasSalesCurrency: 'AUD' })
    })
    const missing = f.schedules.overseas.unconverted
    expect(missing.length).toBe(3)
    expect(missing[0]).toEqual({ where: 'overseasSales', currency: 'AUD', amount: 36000 })
  })
})

/**
 * THE MEASURE NAMED AT SCOPING: the workbook's twelve months of orders, run through the
 * calculator and the engine. `Import & Retail.xlsx`, `Supplier 1 Inputs` — row 52 the order
 * cost, row 44 the shipping speed, rows 54, 56 and 58 the deposit, balance and interest his
 * sheet works out. Each order is invoiced in USD at 0.6000 so the conversion is exercised.
 *
 * 🔴 PINNED ON PURPOSE: these are Mike's own workbook figures, read off the sheet on
 * 2026-09-28. A change here means the port no longer reproduces his sheet.
 */
describe('the workbook’s twelve months of orders', () => {
  const COST = [107643, 38966, 94311, 56599, 79173, 100677, 29703, 28677, 78532, 29583, 36033, 13374]
  const SPEED = ['Air', 'Sea', 'Express', 'Express', 'Sea', 'Air', 'Express', 'Sea', 'Air', 'Express', 'Sea', 'Express']
  const INTEREST = [653.0342, 236.3937333, 572.1534, 343.3672667, 480.3162, 610.7738,
    180.1982, 173.9738, 476.4274667, 179.4702, 218.6002, 81.1356]
  // Row 59, "FX Loss": what his sheet charges on each balance. 13.5 charges none of it.
  const FX_LOSS = [1088.390333, 393.9895556, 953.589, 572.2787778, 800.527, 1017.956333,
    300.3303333, 289.9563333]

  const calc = computeImportShipments({
    startDate: '2026-01-01',
    currencies: [{ code: 'USD', rate: 0.6 }],
    shipments: COST.map((c, m) => ({
      cost: c * 0.6,
      currency: 'USD',
      orderDate: '2026-' + String(m + 1).padStart(2, '0') + '-01',
      depositPct: 0.6,
      speed: SPEED[m]
    }))
  })

  test('every order’s deposit, balance and interest is his, to the cent', () => {
    expect(calc.rows).toHaveLength(12)
    calc.rows.forEach((r, m) => {
      expect(r.cost).toBeCloseTo(COST[m], 6)
      expect(r.deposit).toBeCloseTo(COST[m] * 0.6, 6)
      expect(r.balance).toBeCloseTo(COST[m] * 0.4, 6)
      expect(r.interest).toBeCloseTo(INTEREST[m], 4)
    })
  })

  test('every balance is paid before its goods land, so no exchange movement arises', () => {
    calc.rows.forEach((r) => { expect(r.balanceDueOn < r.landsOn).toBe(true) })
  })

  describe('through the engine', () => {
    // January to August land inside the year; September's lands in January 2027.
    const inYear = 8
    const f = computeThreeWayForecast({
      startDateSerial: JAN_2026,
      currencies: [{ code: 'USD', rate: 0.6 }],
      overseas: overseas({ importedPurchases: calc.importedPurchases, landings: calc.landings })
    })
    const p = f.cashFlow.payments
    const inYearCost = sum(COST.slice(0, inYear))

    test('the eight orders landing in the year are the ones the engine takes', () => {
      expect(calc.landings).toHaveLength(inYear)
      expect(sum(f.schedules.overseas.importedPurchases)).toBeCloseTo(inYearCost, 4)
    })

    test('it pays his deposits, and his balances with his interest', () => {
      expect(sum(p.overseasDeposits)).toBeCloseTo(inYearCost * 0.6, 4)
      expect(sum(p.overseasSupplierBalance)).toBeCloseTo(inYearCost * 0.4 + sum(INTEREST.slice(0, inYear)), 4)
    })

    test('it charges none of the 5,417.02 his sheet calls "FX Loss" on those eight', () => {
      expect(sum(FX_LOSS)).toBeCloseTo(5417.02, 2)
      expect(sum(f.profitAndLoss.exchangeMovement)).toBe(0)
    })

    test('the stock it carries is the goods plus 12% freight and 5% duty', () => {
      const pl = f.profitAndLoss
      expect(sum(pl.importedStock) + sum(pl.overseasFreight) + sum(pl.overseasDuty))
        .toBeCloseTo(inYearCost * 1.17, 4)
    })

    test('and the three statements still articulate', () => {
      const base = computeThreeWayForecast({ startDateSerial: JAN_2026 })
      f.balanceSheet.months.balanceCheck.forEach((v, m) => {
        expect(v).toBeCloseTo(base.balanceSheet.months.balanceCheck[m], 6)
      })
    })
  })
})

describe('POST /api/report/three-way-forecast/three-years carries the what-if (13.5)', () => {
  const { threeYearForecast } = require('../../server/routes/report')
  const send = (body) => {
    const res = { send (status, payload) { res.status = status; res.body = payload } }
    threeYearForecast({ body }, res, () => {})
    return res
  }

  test('the reply holds the forecast and its what-if, in the standard envelope', () => {
    const res = send({ yearCount: 1, years: [DRAWING] })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.years).toHaveLength(1)
    expect(res.body.data.whatIf.applies).toBe(true)
    expect(res.body.data.whatIf.purchases.extraPaid).toBeCloseTo(21906.59, 2)
  })

  test('a domestic forecast says there is nothing to move', () => {
    expect(send({ yearCount: 1, years: [{}] }).body.data.whatIf.applies).toBe(false)
  })
})
