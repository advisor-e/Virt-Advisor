'use strict'

/**
 * The Import & Retail shipment calculator (item 4.64 slice 2).
 *
 * WHAT THESE TESTS ARE FOR. An advisor types an order date and sees a landing month come
 * back. What they cannot see is that the month was reached by shifting five months rather
 * than by adding 145 days, that a container ordered on the 20th was filed alongside one
 * ordered on the 2nd, or that a balance really due in August was scheduled for October
 * because one averaged lead was applied to every shipment. Those are the assertions here.
 *
 * 🔴 THE DATES BELOW ARE THE APPROVED DRAWING'S OWN WORKED EXAMPLE
 * (`design/mockups/three-way-forecast-international.html`, the slice 2 panel), and the
 * arithmetic is printed on the drawing so it can be checked by hand. If these change, the
 * drawing changed too — or the build has drifted from it.
 */

const {
  DEFAULT_TERMS,
  SHIPPING_DAYS,
  toUtcDate,
  addDays,
  monthIndex,
  computeImportShipments
} = require('../../server/report/importShipmentModel')

const { computeThreeWayForecast } = require('../../server/report/threeWayForecastModel')

/** The forecast opens 1 April 2026, as the drawing's worked example does. */
const START = '2026-04-01'

/** The drawing's two sample rows: both ordered in May, eighteen days apart, both by sea. */
const TWO_CONTAINERS = {
  startDate: START,
  shipments: [
    { description: 'Container 1 — 20 lines', cost: 90000, orderDate: '2026-05-02', depositPct: 0.6, speed: 'Sea' },
    { description: 'Container 2 — 14 lines', cost: 60000, orderDate: '2026-05-20', depositPct: 0.6, speed: 'Sea' }
  ]
}

describe('the supplier terms as shipped', () => {
  // 🔴 A DELIBERATE PIN. All four are Mike's own, out of `Supplier 1 Inputs` of
  // Import & Retail.xlsx. They are what turn an order date into a landing date, so a silent
  // edit moves every container on every forecast by however many days it changed.
  test('the terms are the workbook’s: manufacture 120, balance 91, prep 9', () => {
    expect(DEFAULT_TERMS.manufactureDays).toBe(120)
    expect(DEFAULT_TERMS.balanceDueDays).toBe(91)
    expect(DEFAULT_TERMS.prepDays).toBe(9)
  })

  test('the shipping days are the workbook’s three speeds', () => {
    expect(SHIPPING_DAYS).toEqual({ Sea: 25, Air: 20, Express: 15 })
  })

  // The workbook states its own totals: 120 + 25 + 9 = 154 by sea, 149 air, 144 express.
  // Those three figures are printed on `Supplier 1 Inputs` row 3, so this checks the port
  // against a number Mike can see rather than against our own addition.
  test('order to retail comes to the workbook’s own 154 / 149 / 144 days', () => {
    const base = DEFAULT_TERMS.manufactureDays + DEFAULT_TERMS.prepDays
    expect(base + SHIPPING_DAYS.Sea).toBe(154)
    expect(base + SHIPPING_DAYS.Air).toBe(149)
    expect(base + SHIPPING_DAYS.Express).toBe(144)
  })
})

describe('🔴 the drawing’s worked example, date for date', () => {
  const out = computeImportShipments(TWO_CONTAINERS)

  test('a container ordered 2 May lands 24 September and is sellable 3 October', () => {
    expect(out.rows[0].landsOn).toBe('2026-09-24')
    expect(out.rows[0].sellableOn).toBe('2026-10-03')
    expect(out.rows[0].balanceDueOn).toBe('2026-08-01')
  })

  test('a container ordered 20 May lands 12 October and is sellable 21 October', () => {
    expect(out.rows[1].landsOn).toBe('2026-10-12')
    expect(out.rows[1].sellableOn).toBe('2026-10-21')
    expect(out.rows[1].balanceDueOn).toBe('2026-08-19')
  })

  // 🔴 THE WHOLE ARGUMENT FOR DATING EVENTS. Both were ordered in May. Band-mapping knows
  // only "ordered in May" and would file both in one month; the real dates put them in
  // different ones. This is Mike's own R9 failure in the other direction.
  test('two containers ordered in the SAME month land in DIFFERENT months', () => {
    expect(out.rows[0].landsInMonth).toBe(5) // September
    expect(out.rows[1].landsInMonth).toBe(6) // October
    expect(out.importedPurchases).toEqual([0, 0, 0, 0, 0, 90000, 60000, 0, 0, 0, 0, 0])
  })

  // A container landing on 24 September is not on a shelf that month — the prep days are
  // why. It is the same fact behind the forecast's "ready to sell after it lands" control.
  test('one of them lands in September and is not sellable until October', () => {
    expect(out.rows[0].landsInMonth).toBe(5)
    expect(out.rows[0].sellableInMonth).toBe(6)
  })

  test('the deposits fall in the month the orders were placed', () => {
    expect(out.deposits).toEqual([0, 90000 * 0.6 + 60000 * 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  })

  test('the balances fall in August, on the supplier’s own 91-day terms', () => {
    expect(out.balances[4]).toBeCloseTo(90000 * 0.4 + 60000 * 0.4, 6)
  })
})

describe('🔴 what the uniform terms would have said instead', () => {
  // THIS IS WHY MIKE RULED THAT THE CALCULATOR WRITES ALL THREE SERIES. Under one deposit
  // lead and one balance profile, the same two containers pay their balance the month after
  // they land — October and November. Their real terms make both due in AUGUST, two and
  // three months earlier. On a funding request that is the difference between money the
  // business has and money it has not.
  const out = computeImportShipments(TWO_CONTAINERS)

  test('the real balance months are two and three months before the profile’s', () => {
    expect(out.rows[0].balanceMonth).toBe(4) // August, not October (lands Sep, +1)
    expect(out.rows[1].balanceMonth).toBe(4) // August, not November (lands Oct, +1)
  })

  test('the real deposit months are earlier than a four-month lead would give', () => {
    // A four-month lead off a September landing is May, which happens to agree for the
    // first container — and off an October landing is June, which does NOT: it was really
    // paid in May, with the other one.
    expect(out.rows[0].depositMonth).toBe(1) // May
    expect(out.rows[1].depositMonth).toBe(1) // May, where the uniform lead would say June
  })
})

describe('the workbook’s own payment split', () => {
  // January's orders on `Supplier 1 Inputs`: 107,643 of unit cost, a 64,585.80 deposit and
  // 43,057.20 of balance due. Read straight off rows 52, 54 and 56.
  const out = computeImportShipments({
    startDate: '2026-01-01',
    shipments: [{ cost: 107643, orderDate: '2026-01-01', depositPct: 0.6, speed: 'Sea' }]
  })

  test('the 60/40 split reproduces his figures to the cent', () => {
    expect(out.rows[0].deposit).toBeCloseTo(64585.8, 6)
    expect(out.rows[0].balance).toBeCloseTo(43057.2, 6)
  })

  test('the balance is due 91 days after the order, which is 2 April', () => {
    expect(out.rows[0].balanceDueOn).toBe('2026-04-02')
  })

  /**
   * ⚠ A KNOWN AND DELIBERATE DIFFERENCE FROM THE WORKBOOK, RECORDED RATHER THAN HIDDEN.
   *
   * His sheet then adds two charges to the balance before paying it — 6% interest cover and
   * a 10% currency movement, both pro-rated over 91/360 — giving 44,798.62 where this model
   * hands the engine 43,057.20.
   *
   * The 10% IS modelled: the forecast applies its own exchange allowance to both the deposit
   * and the balance, which is slice 1's approved behaviour and is why this module
   * deliberately does not touch it. THE 6% INTEREST COVER IS NOT MODELLED ANYWHERE. There is
   * no line for it on the approved screen and no ruling asking for one, so it is reported to
   * Mike rather than invented here. This test states the gap so it cannot be forgotten.
   */
  test('interest cover is NOT applied — the workbook charges 6%, and nothing here does', () => {
    const workbookPaid = 43057.2 * (1 + 0.06 * 91 / 360 + 0.10 * 91 / 360)
    expect(workbookPaid).toBeCloseTo(44798.62, 2)
    expect(out.rows[0].balance).toBeCloseTo(43057.2, 6)
  })
})

describe('filing a date in the right month', () => {
  test('months are CALENDAR months, not 30-day blocks', () => {
    const start = toUtcDate('2026-04-01')
    // The last day of the first month is still month 0, whatever the day count says.
    expect(monthIndex(toUtcDate('2026-04-30'), start)).toBe(0)
    expect(monthIndex(toUtcDate('2026-05-01'), start)).toBe(1)
    // 30 days after 1 April is 1 May — a different month from a 30-day block's answer.
    expect(monthIndex(addDays(start, 30), start)).toBe(1)
  })

  test('a date before the forecast starts gives a negative month, never a clamp', () => {
    expect(monthIndex(toUtcDate('2026-02-15'), toUtcDate('2026-04-01'))).toBe(-2)
  })

  test('months cross a year boundary without resetting', () => {
    expect(monthIndex(toUtcDate('2027-03-31'), toUtcDate('2026-04-01'))).toBe(11)
    expect(monthIndex(toUtcDate('2027-04-01'), toUtcDate('2026-04-01'))).toBe(12)
  })

  // A local-midnight Date shifts by a day across a daylight-saving boundary, and a shipment
  // landing on the 1st would then land in the previous month for half the year.
  test('the 1st of a month stays the 1st, whatever the machine’s timezone', () => {
    const d = toUtcDate('2026-10-01')
    expect(d.getUTCDate()).toBe(1)
    expect(iso(addDays(toUtcDate('2026-09-30'), 1))).toBe('2026-10-01')
    function iso (x) {
      return x.getUTCFullYear() + '-' +
        String(x.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(x.getUTCDate()).padStart(2, '0')
    }
  })
})

describe('what the twelve months cannot hold', () => {
  test('a container landing after the year is reported, not silently dropped', () => {
    const out = computeImportShipments({
      startDate: START,
      // Ordered in March, so it lands well into the next forecast.
      shipments: [{ cost: 50000, orderDate: '2027-03-01', depositPct: 0.6, speed: 'Sea' }]
    })
    expect(out.beyondYear).toHaveLength(1)
    expect(out.landings).toHaveLength(0)
    // Its cash is out too: charging a deposit for goods this year never receives would show
    // money leaving for nothing.
    expect(out.importedPurchases.reduce((a, b) => a + b, 0)).toBe(0)
    expect(out.deposits.reduce((a, b) => a + b, 0)).toBe(0)
  })

  test('a deposit falling before the forecast starts keeps a negative month', () => {
    const out = computeImportShipments({
      startDate: START,
      // Ordered in February, landing in July — the deposit went before the year opened.
      shipments: [{ cost: 80000, orderDate: '2026-02-10', depositPct: 0.6, speed: 'Sea' }]
    })
    expect(out.rows[0].depositMonth).toBe(-2)
    expect(out.landings[0].depositMonth).toBe(-2)
    // Not counted in the twelve — the engine reports it on `depositsBeforeStart`.
    expect(out.deposits.reduce((a, b) => a + b, 0)).toBe(0)
  })
})

describe('input that cannot be trusted', () => {
  test('no start date returns an empty result rather than guessing today', () => {
    const out = computeImportShipments({ shipments: [{ cost: 1000, orderDate: '2026-05-01' }] })
    expect(out.rows).toEqual([])
    expect(out.landings).toEqual([])
    expect(out.importedPurchases.every(v => v === 0)).toBe(true)
  })

  test('an unusable order date drops that row and keeps the others', () => {
    const out = computeImportShipments({
      startDate: START,
      shipments: [
        { cost: 1000, orderDate: 'next Tuesday' },
        { cost: 2000, orderDate: '2026-02-31' },
        { cost: 3000, orderDate: '2026-05-02' }
      ]
    })
    expect(out.rows).toHaveLength(1)
    expect(out.rows[0].cost).toBe(3000)
  })

  test('a shipment with no cost is not a shipment', () => {
    const out = computeImportShipments({
      startDate: START,
      shipments: [{ cost: 0, orderDate: '2026-05-02' }]
    })
    expect(out.rows).toEqual([])
  })

  test('an unknown speed falls back to sea rather than to nothing', () => {
    const out = computeImportShipments({
      startDate: START,
      shipments: [{ cost: 1000, orderDate: '2026-05-02', speed: 'Teleport' }]
    })
    expect(out.rows[0].speed).toBe('Sea')
    expect(out.rows[0].landsOn).toBe('2026-09-24')
  })

  test('a deposit share outside 0–1 is clamped, and the stock still lands', () => {
    const out = computeImportShipments({
      startDate: START,
      shipments: [{ cost: 1000, orderDate: '2026-05-02', depositPct: 4 }]
    })
    expect(out.rows[0].depositPct).toBe(1)
    expect(out.rows[0].landsInMonth).toBe(5)
  })

  test('a supplier’s own terms override the workbook’s', () => {
    const out = computeImportShipments({
      startDate: START,
      terms: { manufactureDays: 30, balanceDueDays: 14, prepDays: 0, shippingDays: { Sea: 5 } },
      shipments: [{ cost: 1000, orderDate: '2026-05-02', speed: 'Sea' }]
    })
    expect(out.rows[0].landsOn).toBe('2026-06-06') // 2 May + 35 days
    expect(out.rows[0].sellableOn).toBe('2026-06-06')
    expect(out.rows[0].balanceDueOn).toBe('2026-05-16')
  })
})

/**
 * 🔴 THE SEAM INTO THE FORECAST ENGINE.
 *
 * The engine's own guard proves that a forecast WITHOUT a calculator is unchanged to the
 * cent (`threeWayForecastModel.test.js`, 3,385 golden cells). What is proved here is the
 * other half: that a forecast WITH one actually uses the shipments' own months, and that
 * the tick still governs the whole section.
 */
describe('the calculator drives the forecast', () => {
  const OVERSEAS = {
    enabled: true,
    importedPurchases: new Array(12).fill(0),
    depositPct: 0.6,
    depositLeadMonths: 4,
    balancePayment: [0, 1, 0, 0, 0],
    freightPct: 0.12,
    dutyPct: 0.05,
    fxAllowancePct: 0.1,
    sellDown: {
      newMarkup: 1.85,
      standardMarkup: 1.52,
      runoutMarkup: 1.22,
      newUpToDays: 60,
      standardUpToDays: 90,
      runoutUpToDays: 120,
      pattern: 'Steady Eddy'
    },
    readyAfterMonths: 1,
    overseasSales: new Array(12).fill(0),
    deliveryLagMonths: 2,
    overseasCollection: [0, 0.5, 0.5, 0, 0],
    zeroRated: true,
    salesFxAllowancePct: 0.1,
    overseasMarkup: null
  }

  const withCalculator = Object.assign({}, OVERSEAS, {
    importedPurchases: computeImportShipments(TWO_CONTAINERS).importedPurchases,
    landings: computeImportShipments(TWO_CONTAINERS).landings
  })

  test('the deposits land in May — the month the orders were placed', () => {
    const os = computeThreeWayForecast({ overseas: withCalculator }).schedules.overseas
    // Both containers, deposit 60% plus the 10% exchange allowance, in one month.
    expect(os.deposits[1]).toBeCloseTo((90000 + 60000) * 0.6 * 1.1, 6)
    expect(os.deposits[2]).toBe(0)
    expect(os.deposits[5]).toBe(0)
  })

  // 🔴 THE POINT OF THE RULING, ASSERTED. The uniform profile pays each balance the month
  // after its landing — October and November. The suppliers' real 91-day terms make both due
  // in August, two and three months earlier.
  test('the balances fall in August, where the uniform profile said October and November', () => {
    const os = computeThreeWayForecast({ overseas: withCalculator }).schedules.overseas
    expect(os.supplierBalance[4]).toBeCloseTo((90000 + 60000) * 0.4 * 1.1, 6)
    expect(os.supplierBalance[6]).toBe(0)
    expect(os.supplierBalance[7]).toBe(0)

    const uniform = Object.assign({}, OVERSEAS, {
      importedPurchases: computeImportShipments(TWO_CONTAINERS).importedPurchases
    })
    const flat = computeThreeWayForecast({ overseas: uniform }).schedules.overseas
    expect(flat.supplierBalance[6]).toBeCloseTo(90000 * 0.4 * 1.1, 6) // October
    expect(flat.supplierBalance[7]).toBeCloseTo(60000 * 0.4 * 1.1, 6) // November
    expect(flat.supplierBalance[4]).toBe(0)
  })

  test('freight, duty and border GST still fall in the landing months', () => {
    const os = computeThreeWayForecast({ overseas: withCalculator }).schedules.overseas
    expect(os.freight[5]).toBeCloseTo(90000 * 0.12, 6)
    expect(os.freight[6]).toBeCloseTo(60000 * 0.12, 6)
    expect(os.duty[5]).toBeCloseTo(90000 * 0.05, 6)
  })

  // 🔴 THE TICK GOVERNS THE SHIPMENTS TOO. An advisor who enters containers and then unticks
  // the section gets today's forecast back, not half of one.
  test('with the tick off the shipments are dropped like everything else', () => {
    const off = Object.assign({}, withCalculator, { enabled: false })
    const os = computeThreeWayForecast({ overseas: off }).schedules.overseas
    expect(os.deposits.every(v => v === 0)).toBe(true)
    expect(os.supplierBalance.every(v => v === 0)).toBe(true)
    expect(os.freight.every(v => v === 0)).toBe(true)
  })

  // 🔴 THE CHECK THAT CAUGHT THE PREPAYMENT AND THE LIABILITY WHEN SLICE 1 WAS BUILT, and
  // the reason it is repeated here: the calculator moves cash into months the stock does
  // not arrive in, which is precisely the shape of change that stops the three statements
  // articulating. A deposit paid in May for stock landing in October has to sit somewhere.
  test('the balance sheet still balances with the calculator driving it', () => {
    const f = computeThreeWayForecast({ overseas: withCalculator })
    const opening = f.balanceSheet.opening.balanceCheck
    f.balanceSheet.months.balanceCheck.forEach((v) => {
      expect(v).toBeCloseTo(opening, 6)
    })
  })
})
