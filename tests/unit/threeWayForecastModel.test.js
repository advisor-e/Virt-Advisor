'use strict'

const fs = require('fs')
const path = require('path')
const { computeThreeWayForecast, DEFAULTS } = require('../../server/report/threeWayForecastModel')
const golden = require('../fixtures/threeWayForecastYear1.golden.json')
const { SOURCE_ROWS } = require('./threeWayForecastRows')

/**
 * Three-Way Forecast — the golden test.
 *
 * The workbook (`design/report-source-models/3 way Filter.xlsx`, sheet "Yr 1.
 * Projections") holds 3,409 calculated cells across its twelve monthly columns. This
 * suite proves the port against 3,385 of them — every one except the month-header dates
 * in row 1, which are a label rather than a calculation, and row 201, the mis-filled
 * duplicate payment row that correction R6 removes and which therefore cannot map to a
 * single series (it has its own test below).
 *
 * The expected values are NOT typed in here. They are read from the workbook's own
 * cached cell values into `tests/fixtures/threeWayForecastYear1.golden.json`, so there
 * is no transcription risk and every figure keeps its cell reference: the fixture is
 * keyed by sheet row, and SOURCE_ROWS below maps each row to the model's own field. That
 * map is the port's documentation as much as the test's plumbing — it says, row by row,
 * what each part of the spreadsheet became.
 *
 * Seven corrections, each ruled by Mike on 2026-09-02, are tested separately with the
 * workbook's figure beside ours so the departure is always visible. Full evidence:
 * `design/THREE-WAY-FORECAST-DEVIATIONS.md`.
 */

// The row map lives in ./threeWayForecastRows so the three-year chain test can use
// the same one — it is a single mapping, and two copies would drift apart.

/** Follow a dotted path (numeric segments index arrays). */
function read (root, dotted) {
  const parts = dotted.split('.')
  let node = root
  for (let i = 0; i < parts.length; i++) {
    if (node === undefined || node === null) { return undefined }
    node = /^\d+$/.test(parts[i]) ? node[Number(parts[i])] : node[parts[i]]
  }
  return node
}

const COLUMNS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']
/** Relative tolerance: the workbook caches ~10 significant digits, so exactness is
 *  agreement to that precision, not bit equality. */
const TOLERANCE = 5e-7

describe('Three-Way Forecast — the port reproduces the workbook exactly', () => {
  const asWritten = computeThreeWayForecast({}, { sourceFidelity: true })

  test('every mapped row resolves to a twelve-month series', () => {
    const rows = Object.keys(SOURCE_ROWS)
    rows.forEach((row) => {
      const series = read(asWritten, SOURCE_ROWS[row])
      expect(Array.isArray(series)).toBe(true)
      expect(series).toHaveLength(12)
    })
  })

  test('the fixture and the map cover the same rows', () => {
    // A row in one and not the other is a silent hole in the proof.
    const mapped = Object.keys(SOURCE_ROWS).sort()
    const fixtured = Object.keys(golden.rows).sort()
    expect(fixtured).toEqual(mapped.filter(r => fixtured.includes(r)))
    expect(fixtured.length).toBeGreaterThanOrEqual(288)
  })

  test('all 3,385 golden cells match the workbook', () => {
    let compared = 0
    const failures = []
    Object.keys(golden.rows).forEach((row) => {
      const series = read(asWritten, SOURCE_ROWS[row])
      golden.rows[row].months.forEach((want, m) => {
        if (want === null) { return } // the workbook holds no number for that cell
        compared++
        const got = series[m]
        const ok = typeof got === 'number' && isFinite(got) &&
          Math.abs(got - want) / Math.max(1, Math.abs(want)) < TOLERANCE
        if (!ok) {
          failures.push(COLUMNS[m] + row + ' (' + golden.rows[row].label + '): workbook ' + want + ', ours ' + got)
        }
      })
    })
    expect(failures).toEqual([])
    expect(compared).toBe(golden._source.cellCount)
    expect(compared).toBe(3385)
  })
})

describe('Three-Way Forecast — the seven corrections (Mike, 2026-09-02)', () => {
  const written = computeThreeWayForecast({}, { sourceFidelity: true })
  const fixed = computeThreeWayForecast({})
  const year = series => series.reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0)

  test('R1 — Total Non-Current Assets counts all six categories, not four (sheet row 106)', () => {
    // The workbook's SUM(C99:C102) stops at Office Equipment, leaving out Computer
    // Hardware and Other in every column of every year.
    expect(written.balanceSheet.opening.totalNonCurrentAssets).toBe(1190000)
    expect(fixed.balanceSheet.opening.totalNonCurrentAssets).toBe(1340000)
    expect(fixed.balanceSheet.months.totalNonCurrentAssets[11]).toBeCloseTo(1119674, 6)
    expect(written.balanceSheet.months.totalNonCurrentAssets[11]).toBeCloseTo(1011932, 6)
  })

  test('R2 — the P&L depreciation charge covers all six schedules, not three (row 28)', () => {
    // The single largest correction: the workbook's D306+D316+D326 omits Office
    // Equipment, Computer Hardware and Other, so profit is overstated.
    expect(written.profitAndLoss.depreciation[0]).toBe(14750)
    expect(fixed.profitAndLoss.depreciation[0]).toBe(20083)
    expect(year(written.profitAndLoss.depreciation)).toBe(164672)
    expect(year(fixed.profitAndLoss.depreciation)).toBe(220326)
    // Profit falls by at least the extra depreciation. It falls by a little MORE, and
    // that is not slack: R6 and R7 move cash, cash moves the overdraft, and the
    // overdraft interest is itself a P&L line. The corrections cannot be isolated from
    // one another in a model whose statements are linked — which is the point of one.
    const profitDrop = year(written.profitAndLoss.netSurplusBeforeTax) - year(fixed.profitAndLoss.netSurplusBeforeTax)
    expect(profitDrop).toBeGreaterThanOrEqual(220326 - 164672)
  })

  test('R3/R4 — asset sales and capital expenditure cover all six categories', () => {
    // Buy 20,000 of office equipment in month 4 and sell 5,000 in month 6. The workbook
    // pays the GST on the purchase (its GST rows already cover all six) and never pays
    // for the equipment itself — 3,000 leaves the bank for a 20,000 asset.
    const withCapex = {
      assets: [{}, {}, {},
        { additions: [0, 0, 0, 20000, 0, 0, 0, 0, 0, 0, 0, 0], disposals: [0, 0, 0, 0, 0, 5000, 0, 0, 0, 0, 0, 0] },
        {}, {}]
    }
    const w = computeThreeWayForecast(withCapex, { sourceFidelity: true })
    const f = computeThreeWayForecast(withCapex)
    expect(w.cashFlow.payments.capitalExpenditure[3]).toBe(3000) // the GST alone
    expect(f.cashFlow.payments.capitalExpenditure[3]).toBe(23000) // asset + GST
    expect(w.cashFlow.receipts.assetSales[5]).toBe(750) // the GST alone
    expect(f.cashFlow.receipts.assetSales[5]).toBe(5750) // proceeds + GST
  })

  test('R5 — the six-monthly GST window clamps to the start of the year (row 411)', () => {
    // Starting in a month when a six-monthly return falls due, the workbook's window
    // reaches six columns back, off the edge of the sheet, and reads #REF!.
    const marchStart = { startDateSerial: 45717, gstPeriod: 'Six Monthly' }
    const w = computeThreeWayForecast(marchStart, { sourceFidelity: true })
    const f = computeThreeWayForecast(marchStart)
    expect(f.months.calendarMonths[0]).toBe(3)
    expect(w.schedules.gst.fileSixMonthly[0]).toBeNull() // the workbook's #REF!
    expect(f.schedules.gst.fileSixMonthly[0]).toBe(f.schedules.gst.forMonth[0])
    expect(f.schedules.gst.fileSixMonthly[0]).toBe(11084)
    // The other filing frequencies still say what they mean: a monthly return files
    // exactly the month's own GST, whatever the six-monthly window is doing.
    expect(f.schedules.gst.fileOneMonthly).toEqual(f.schedules.gst.forMonth)
    expect(w.schedules.gst.fileOneMonthly).toEqual(w.schedules.gst.forMonth)
  })

  test('R6 — each overhead is settled exactly once (row 201)', () => {
    // The workbook settles "Other 5" twice in month 1 (it is also in the GST-free
    // block), then a mis-filled formula settles "Other 4" twice from month 2.
    const otherFive = DEFAULTS.overheads.otherFive / 12 // 416.67
    const otherFour = DEFAULTS.overheads.otherFour / 12 // 333.33
    expect(written.schedules.expensePayments.blockOneNet[0] - fixed.schedules.expensePayments.blockOneNet[0])
      .toBeCloseTo(otherFive, 6)
    expect(written.schedules.expensePayments.blockOneNet[1] - fixed.schedules.expensePayments.blockOneNet[1])
      .toBeCloseTo(otherFour, 6)
    // Nothing is lost: "Other 5" is still settled, in the GST-free block.
    expect(fixed.schedules.expensePayments.blockThreeTotal[0])
      .toBeGreaterThan(fixed.profitAndLoss.overheads.otherFive[0])
  })

  test('R7 — Other Direct Expenses (GST Exempt) is settled at all (row 11)', () => {
    // The workbook charges it to the P&L and pays it from nothing, so cash never moves.
    // 2% of revenue, 890,000 of sales, 17,800 in the year.
    expect(year(fixed.schedules.expensePayments.blockThreeTotal) -
      year(written.schedules.expensePayments.blockThreeTotal)).toBeCloseTo(17800, 6)
    expect(year(fixed.profitAndLoss.otherDirectExpensesExempt)).toBeCloseTo(17800, 6)
    // The P&L charge itself is unchanged — only the payment was missing.
    expect(fixed.profitAndLoss.otherDirectExpensesExempt)
      .toEqual(written.profitAndLoss.otherDirectExpensesExempt)
  })

  test('the corrections register names all seven, and is empty in source-fidelity mode', () => {
    expect(fixed.corrections.map(c => c.ref)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'])
    expect(written.corrections).toEqual([])
  })
})

describe('Three-Way Forecast — the three statements articulate', () => {
  test('the balance check does not move once, across all twelve months', () => {
    // This is the whole point of a three-way model: profit, cash and the balance sheet
    // must agree in every period. Before the corrections this eroded every month; it is
    // what exposed R7. Any residual is the OPENING balance sheet the advisor entered —
    // in the workbook's own sample that is 164,000, and it is honest for it to show.
    const f = computeThreeWayForecast({})
    const opening = f.balanceSheet.opening.balanceCheck
    expect(opening).toBe(164000)
    f.balanceSheet.months.balanceCheck.forEach(v => expect(v).toBe(opening))
  })

  test('an opening balance sheet that balances stays balanced all year', () => {
    // The residual above is the sample data, not the mechanics. Give the model an
    // opening position that actually ties and the check is zero in every month.
    const tied = computeThreeWayForecast({
      openingBalanceSheet: Object.assign({}, DEFAULTS.openingBalanceSheet, { retainedEarnings: 7000 - 164000 })
    })
    expect(tied.balanceSheet.opening.balanceCheck).toBe(0)
    tied.balanceSheet.months.balanceCheck.forEach(v => expect(v).toBe(0))
  })

  test('the cash flow closing balance is the balance sheet cash position', () => {
    const f = computeThreeWayForecast({})
    for (let m = 0; m < 12; m++) {
      const net = f.balanceSheet.months.cashAtBank[m] - f.balanceSheet.months.bankOverdraft[m]
      expect(net).toBeCloseTo(f.cashFlow.closingBalance[m], 6)
    }
  })

  test('each month opens where the previous month closed', () => {
    const f = computeThreeWayForecast({})
    for (let m = 1; m < 12; m++) {
      expect(f.cashFlow.openingBalance[m]).toBe(f.cashFlow.closingBalance[m - 1])
      expect(f.schedules.debtors.openingBalance[m]).toBe(f.schedules.debtors.closingBalance[m - 1])
      expect(f.schedules.creditors.openingBalance[m]).toBe(f.schedules.creditors.closingBalance[m - 1])
      f.schedules.loans.forEach(l => expect(l.openingBalance[m]).toBe(l.closingBalance[m - 1]))
      f.schedules.assets.forEach(a => expect(a.bookValue[m]).toBe(a.closingValue[m - 1]))
    }
  })
})

describe('Three-Way Forecast — honesty and robustness', () => {
  test('junk inputs fall back to the workbook sample rather than computing on NaN', () => {
    const f = computeThreeWayForecast({
      sales: ['nonsense', null, undefined, {}, [], NaN, Infinity, '', 'abc', false, true, 70000],
      markup: 'not a number',
      gstRate: undefined,
      assets: 'not an array',
      loans: null
    })
    f.profitAndLoss.revenue.forEach(v => expect(isFinite(v)).toBe(true))
    f.cashFlow.closingBalance.forEach(v => expect(isFinite(v)).toBe(true))
    // A supplied, usable figure is still honoured even when its neighbours are junk.
    expect(f.profitAndLoss.revenue[11]).toBe(70000)
    expect(f.schedules.inventory.costRatio).toBeCloseTo(1 / (1 + DEFAULTS.markup), 12)
  })

  test('numeric strings are accepted, as they arrive over HTTP', () => {
    const f = computeThreeWayForecast({ gstRate: '0.2', markup: '0.5' })
    expect(f.schedules.gst.rate).toBe(0.2)
    expect(f.schedules.inventory.costRatio).toBeCloseTo(1 / 1.5, 12)
  })

  test('zero revenue reports a zero margin rather than dividing by zero', () => {
    const f = computeThreeWayForecast({ sales: new Array(12).fill(0) })
    f.profitAndLoss.grossMargin.forEach(v => expect(v).toBe(0))
    f.profitAndLoss.netMargin.forEach(v => expect(v).toBe(0))
  })

  test('an insolvent position reads as truthfully negative, never floored at zero', () => {
    const f = computeThreeWayForecast({})
    expect(f.cashFlow.closingBalance[11]).toBeLessThan(0)
    expect(f.balanceSheet.months.netAssets[11]).toBeLessThan(0)
    expect(f.balanceSheet.months.cashAtBank[11]).toBe(0)
    expect(f.balanceSheet.months.bankOverdraft[11]).toBeGreaterThan(0)
  })

  test('an unrecognised GST period or basis falls back rather than silently filing nothing', () => {
    const f = computeThreeWayForecast({ gstPeriod: 'Whenever', gstBasis: 'Vibes' })
    expect(f.schedules.gst.period).toBe(DEFAULTS.gstPeriod)
    expect(f.schedules.gst.basis).toBe(DEFAULTS.gstBasis)
  })

  test('the cash basis changes the GST computed on income, the invoice basis does not', () => {
    const invoice = computeThreeWayForecast({ gstBasis: 'Invoice' })
    const cash = computeThreeWayForecast({ gstBasis: 'Cash' })
    expect(invoice.schedules.gst.onIncome).toEqual(invoice.schedules.debtors.gst)
    expect(cash.schedules.gst.onIncome[0]).not.toBe(invoice.schedules.gst.onIncome[0])
  })

  test('a loan is never repaid past zero', () => {
    const f = computeThreeWayForecast({
      loans: [{ opening: 3000, monthlyRepayment: 2450, interestRate: 0.07 }, {}, {}]
    })
    f.schedules.loans[0].closingBalance.forEach(v => expect(v).toBeGreaterThanOrEqual(0))
    expect(f.schedules.loans[0].closingBalance[11]).toBe(0)
  })

  test('interest is charged on an overdrawn shareholder account and not on one in credit', () => {
    const f = computeThreeWayForecast({})
    expect(f.schedules.shareholders[0].openingBalance[0]).toBeGreaterThan(0)
    expect(f.schedules.shareholders[0].interestOnOverdrawn[0]).toBe(0)
    expect(f.schedules.shareholders[1].openingBalance[0]).toBeLessThan(0)
    expect(f.schedules.shareholders[1].interestOnOverdrawn[0]).toBeGreaterThan(0)
  })
})

describe('Three-Way Forecast — the month stepping quirk is reported, not hidden', () => {
  test('a first-of-month start walks the calendar correctly', () => {
    const f = computeThreeWayForecast({})
    expect(f.months.calendarMonths).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3])
    expect(f.startsSkipACalendarMonth).toBe(false)
  })

  test('a start late in a month skips one, and the model says so', () => {
    // The workbook advances by 31 DAYS, so 30 January steps to 2 March and February
    // never appears. Those dates drive the GST filing schedule. Ported as written and
    // flagged, pending Mike's ruling — see the model header.
    const lateStart = computeThreeWayForecast({ startDateSerial: 45687 }) // 2025-01-30
    expect(lateStart.months.calendarMonths[0]).toBe(1)
    expect(lateStart.months.calendarMonths[1]).toBe(3)
    expect(lateStart.startsSkipACalendarMonth).toBe(true)
  })
})

describe('Three-Way Forecast — the source-fidelity switch cannot be reached from a request', () => {
  test('no route passes options to the model', () => {
    // `sourceFidelity` reproduces the workbook INCLUDING its seven defects. It is a
    // second parameter precisely so a request body can never set it; this fails the
    // build if a route ever starts forwarding one.
    const routes = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'routes', 'report.js'), 'utf8')
    expect(routes.indexOf('sourceFidelity')).toBe(-1)
    expect(/computeThreeWayForecast\(\s*inputs\s*\)/.test(routes)).toBe(true)
  })

  test('inputs named sourceFidelity are treated as data, not as a switch', () => {
    const f = computeThreeWayForecast({ sourceFidelity: true })
    expect(f.sourceFidelity).toBe(false)
    expect(f.corrections).toHaveLength(7)
  })
})
