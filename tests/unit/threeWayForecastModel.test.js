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

  test('the corrections register names all eight, and is empty in source-fidelity mode', () => {
    // Seven aggregation repairs ruled 2026-09-02, plus R10 — the sale price — ruled
    // 2026-09-03. R8 and R9 are not in this register: one is a carry-forward rule and
    // the other is the calendar, and neither changes a figure inside a single year.
    expect(fixed.corrections.map(c => c.ref)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R10'])
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

describe('R9 — months advance by the calendar (Mike, 2026-09-02)', () => {
  test('a first-of-month start runs April to March, on the first of each', () => {
    const f = computeThreeWayForecast({})
    expect(f.months.calendarMonths).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3])
    expect(f.months.isoDates[0]).toBe('2024-04-01')
    expect(f.months.isoDates[11]).toBe('2025-03-01')
    expect(f.startsSkipACalendarMonth).toBe(false)
  })

  test('🔴 a start late in a month no longer skips one', () => {
    // The workbook adds 31 DAYS, so 30 January stepped to 2 March and February never
    // happened — and these dates decide when a GST return falls due, so the whole
    // filing schedule misfired. Mike's ruling: "obviously, it needs to be per calendar
    // month."
    const lateStart = computeThreeWayForecast({ startDateSerial: 45687 }) // 2025-01-30
    expect(lateStart.months.calendarMonths).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(lateStart.startsSkipACalendarMonth).toBe(false)
  })

  test('a 31st clamps to the last day of a shorter month rather than overflowing', () => {
    // 31 January plus a month is the 28th (or 29th) of February, never the 2nd or 3rd
    // of March — which is exactly the overflow that produced the skip above.
    const jan31 = computeThreeWayForecast({ startDateSerial: 45688 }) // 2025-01-31
    expect(jan31.months.isoDates[0]).toBe('2025-01-31')
    expect(jan31.months.isoDates[1]).toBe('2025-02-28')
    expect(jan31.months.isoDates[2]).toBe('2025-03-31')
    expect(jan31.months.calendarMonths).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  test('February is dated correctly in a leap year', () => {
    const jan31Leap = computeThreeWayForecast({ startDateSerial: 45322 }) // 2024-01-31
    expect(jan31Leap.months.isoDates[1]).toBe('2024-02-29')
  })

  test('source-fidelity mode keeps the workbook\'s 31-day stepping', () => {
    // It must: those dates move real figures through the GST filing schedule, and the
    // golden set is proved against a workbook that steps that way.
    const asWritten = computeThreeWayForecast({}, { sourceFidelity: true })
    expect(asWritten.months.isoDates[11]).toBe('2025-03-08')
    const corrected = computeThreeWayForecast({})
    expect(corrected.months.isoDates[11]).toBe('2025-03-01')
  })
})

describe('Three-Way Forecast — a sale carries its own price (R10, Mike 2026-09-03)', () => {
  /**
   * The guard, and it was written and proved passing BEFORE the engine was touched.
   *
   * Until this change a sale had one figure. It came off the asset register AND it was
   * banked, so the two agreed only when an asset sold for exactly its written-down
   * value. Mike's ruling: "there are legitimate times that an asset sells for more than
   * book value - such as a used vehicle - this should be able to be included and
   * calculated."
   *
   * So `disposals` now means the book value coming off the register and `proceeds` is
   * what it sold for. THE WHOLE RISK OF THE CHANGE IS THAT IT REACHES THE GST
   * COMPUTATION AND THE P&L, both of which the golden set covers cell by cell. The
   * figures below are the engine's own output from BEFORE the change, captured on a
   * scenario that exercises every path it touches — a purchase, a sale, and a second
   * purchase in another category. Omitting `proceeds` must reproduce them exactly.
   */
  const z = () => new Array(12).fill(0)
  const scenario = () => {
    const assets = DEFAULTS.assets.map(a => ({ ...a, additions: z(), disposals: z() }))
    assets[0].additions[2] = 45000 // vehicles, bought in month 3
    assets[0].disposals[2] = 12000 // vehicles, sold in month 3
    assets[2].additions[5] = 18000 // plant & equipment, bought in month 6
    return { assets }
  }

  test('with no price given, every figure is what it was before R10', () => {
    const f = computeThreeWayForecast(scenario())
    // Cash: the sale banked with its GST, the purchases paid with theirs.
    expect(f.cashFlow.receipts.assetSales[2]).toBe(13800)
    expect(f.cashFlow.payments.capitalExpenditure[2]).toBe(51750)
    expect(f.cashFlow.payments.capitalExpenditure[5]).toBe(20700)
    // The asset register, month by month — the depreciation path.
    expect(f.schedules.assets[0].closingValue.map(v => Math.round(v)))
      .toEqual([78667, 77356, 108517, 106708, 104930, 103181, 101461, 99770, 98107, 96472, 94864, 93283])
    // The P&L: no gain arises, so Other Income is untouched.
    expect(f.profitAndLoss.totalOtherIncome[2]).toBeCloseTo(239.48329, 5)
    expect(f.profitAndLoss.netSurplusBeforeTax[2]).toBeCloseTo(-21675.084597, 5)
  })

  test('a van carried at 8,000 and sold for 12,000 banks the price and books the gain', () => {
    // Mike's own example. The three statements have to disagree in exactly the right
    // places: the bank follows the price, the register follows the book value, and the
    // 4,000 between them is profit in the month of the sale.
    const inputs = { assets: [{ opening: 80000, disposals: [0, 0, 8000, 0, 0, 0, 0, 0, 0, 0, 0, 0], proceeds: [0, 0, 12000, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, {}, {}, {}, {}, {}] }
    const f = computeThreeWayForecast(inputs)
    expect(f.cashFlow.receipts.assetSales[2]).toBe(13800) // 12,000 + GST on 12,000
    expect(f.schedules.gst.onAssetSales[2]).toBe(1800) // GST follows the invoice
    expect(f.profitAndLoss.gainOnAssetSales[2]).toBe(4000) // 12,000 - 8,000
    // Only 8,000 leaves the register — the gain is profit, never a write-off.
    const noSale = computeThreeWayForecast({ assets: [{ opening: 80000 }, {}, {}, {}, {}, {}] })
    // 8,000 off the register, less the month's depreciation no longer charged on it —
    // ROUND(8000 * 0.2 / 12) = 133, Excel's rounding, which the port keeps.
    expect(noSale.schedules.assets[0].closingValue[2] - f.schedules.assets[0].closingValue[2])
      .toBe(7867)
  })

  test('selling below book value is a loss, and it reduces profit', () => {
    // The same arithmetic in the other direction — a loss is not a special case, and a
    // model that only handled gains would look right on every example anyone tried.
    const inputs = { assets: [{ opening: 80000, disposals: [0, 0, 8000, 0, 0, 0, 0, 0, 0, 0, 0, 0], proceeds: [0, 0, 5000, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, {}, {}, {}, {}, {}] }
    const f = computeThreeWayForecast(inputs)
    expect(f.profitAndLoss.gainOnAssetSales[2]).toBe(-3000)
    expect(f.cashFlow.receipts.assetSales[2]).toBe(5750) // 5,000 + GST on 5,000
  })

  test('the gain reaches profit, tax and retained earnings — not just the P&L line', () => {
    // The whole reason the gain joins Other Income rather than sitting beside it: a
    // figure that stopped at the P&L would leave the balance sheet out by the gain, and
    // the three statements would stop articulating. The balance check is what proves it.
    const base = { assets: [{ opening: 80000, disposals: [0, 0, 8000, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, {}, {}, {}, {}, {}] }
    const gained = JSON.parse(JSON.stringify(base))
    gained.assets[0].proceeds = [0, 0, 12000, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const flat = computeThreeWayForecast(base)
    const f = computeThreeWayForecast(gained)
    expect(f.profitAndLoss.netSurplusBeforeTax[2] - flat.profitAndLoss.netSurplusBeforeTax[2])
      .toBeCloseTo(4000, 6)
    expect(f.balanceSheet.months.retainedEarnings[11])
      .toBeGreaterThan(flat.balanceSheet.months.retainedEarnings[11])
    // Still balancing: no correction is worth anything if it breaks the articulation.
    expect(f.balanceSheet.months.balanceCheck[11])
      .toBeCloseTo(flat.balanceSheet.months.balanceCheck[11], 6)
  })

  test('source-fidelity mode ignores the price outright', () => {
    // The workbook has no such figure. If a price could reach it, the golden set would
    // be measuring something the spreadsheet never did.
    const inputs = { assets: [{ opening: 80000, disposals: [0, 0, 8000, 0, 0, 0, 0, 0, 0, 0, 0, 0], proceeds: [0, 0, 12000, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, {}, {}, {}, {}, {}] }
    const w = computeThreeWayForecast(inputs, { sourceFidelity: true })
    expect(w.cashFlow.receipts.assetSales[2]).toBe(9200) // book value + its GST
    expect(w.profitAndLoss.gainOnAssetSales.every(v => v === 0)).toBe(true)
  })

  test('a price equal to the book value is the same forecast as no price at all', () => {
    // The default made explicit. If these two ever diverge, the default has drifted and
    // every forecast built before today would read differently on the same figures.
    const without = scenario()
    const withEqual = scenario()
    withEqual.assets[0].proceeds = withEqual.assets[0].disposals.slice()
    expect(JSON.stringify(computeThreeWayForecast(withEqual)))
      .toBe(JSON.stringify(computeThreeWayForecast(without)))
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
    expect(f.corrections).toHaveLength(8)
  })
})

/**
 * 🔴 THE GUARD FOR ITEM 4.64 — buying and selling overseas.
 *
 * WRITTEN BEFORE THE FEATURE, on Mike's approval of the drawing
 * (design/mockups/three-way-forecast-international.html, approved 2026-09-04). The
 * split adds a second sales series, a second purchase series, two more payment profiles
 * and a sell-down price ladder, and it reaches into the GST computation — which the
 * golden set covers cell by cell.
 *
 * THE PROMISE IT HOLDS THE ENGINE TO: with the tick off, nothing moves. A business that
 * does no overseas trade must get the identical figure in every cell it gets today,
 * whether the caller says nothing about overseas trade at all or hands over an
 * explicitly empty block.
 *
 * It also PINS THE INPUT SHAPE. The block below is the contract the screen must send;
 * its figures are the drawing's own, read out of `Import & Retail.xlsx`.
 */
describe('4.64 — with the tick off, the overseas split moves nothing', () => {
  /** The shape the screen sends, with every series empty and the terms at their defaults. */
  const EMPTY_OVERSEAS = {
    enabled: false,
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

  const silent = computeThreeWayForecast({})

  /**
   * THE THREE STATEMENTS — what the client is actually shown, and where any real drift
   * would appear. The comparison deliberately excludes `schedules`, because the block
   * ECHOES the terms it was handed (the pattern, the mark-ups, the cost ratio) and a
   * forecast that repeats its own settings has not changed anybody's numbers. The
   * schedules are proved separately, cell by cell, by the golden test below.
   */
  const statementsOf = f => JSON.stringify({
    profitAndLoss: f.profitAndLoss,
    balanceSheet: f.balanceSheet,
    cashFlow: f.cashFlow
  })

  /** Every monthly series the overseas block produces, which must be flat zero. */
  const overseasIsSilent = (f) => {
    const os = f.schedules.overseas
    const series = ['deposits', 'freight', 'duty', 'borderGst', 'supplierBalance',
      'fxOnPurchases', 'importedRevenue', 'importedCostOfSales', 'overseasRevenue',
      'overseasGst', 'overseasCollections', 'fxOnSales', 'exchangeMovement']
    series.forEach((k) => {
      os[k].forEach((v) => { expect(v).toBe(0) })
    })
    expect(os.depositsBeforeStart).toEqual([])
    expect(os.revenueBeyondYear).toBe(0)
  }

  test('an explicitly empty overseas block is identical to saying nothing at all', () => {
    const f = computeThreeWayForecast({ overseas: EMPTY_OVERSEAS })
    expect(statementsOf(f)).toBe(statementsOf(silent))
    overseasIsSilent(f)
  })

  test('the terms are ignored while both series are empty', () => {
    // Every dial moved to something unusual, both series still zero. A forecast with no
    // overseas trade cannot be moved by a percentage that applies to none of it.
    const fiddled = JSON.parse(JSON.stringify(EMPTY_OVERSEAS))
    fiddled.depositPct = 0.9
    fiddled.depositLeadMonths = 9
    fiddled.freightPct = 0.4
    fiddled.dutyPct = 0.25
    fiddled.fxAllowancePct = 0.35
    fiddled.salesFxAllowancePct = 0.35
    fiddled.zeroRated = false
    fiddled.deliveryLagMonths = 4
    fiddled.overseasMarkup = 3.2
    fiddled.sellDown.newMarkup = 4.5
    fiddled.sellDown.pattern = 'Slow Burn'
    const f = computeThreeWayForecast({ overseas: fiddled })
    expect(statementsOf(f)).toBe(statementsOf(silent))
    overseasIsSilent(f)
  })

  test('the tick being ON with nothing entered still moves nothing', () => {
    // Ticking the box is not the same as trading overseas. An advisor who opens the
    // section, looks at it and enters nothing must be exactly where they started.
    const opened = JSON.parse(JSON.stringify(EMPTY_OVERSEAS))
    opened.enabled = true
    const f = computeThreeWayForecast({ overseas: opened })
    expect(statementsOf(f)).toBe(statementsOf(silent))
    overseasIsSilent(f)
  })

  test('all 3,385 golden cells still match the workbook with the block present', () => {
    // The golden proof itself, re-run through the new input path.
    const asWritten = computeThreeWayForecast({ overseas: EMPTY_OVERSEAS }, { sourceFidelity: true })
    let compared = 0
    const failures = []
    Object.keys(golden.rows).forEach((row) => {
      const series = read(asWritten, SOURCE_ROWS[row])
      golden.rows[row].months.forEach((want, m) => {
        if (want === null) { return }
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
    expect(compared).toBe(3385)
  })

  /**
   * The drawing's own worked example, whose arithmetic is printed beneath its table so it
   * can be checked by hand. A container of 90,000 landing in September and one of 60,000
   * landing in January: 60% deposit paid four months ahead, balance the month after
   * landing, freight 12%, duty 5%, exchange allowance 10%, Steady Eddy.
   *
   * Month 0 is April, because the forecast opens 1 April.
   */
  const WORKED = (function () {
    const o = JSON.parse(JSON.stringify(EMPTY_OVERSEAS))
    o.enabled = true
    o.importedPurchases = [0, 0, 0, 0, 0, 90000, 0, 0, 0, 60000, 0, 0]
    return o
  })()

  describe('the worked example comes out as drawn', () => {
    const f = computeThreeWayForecast({ overseas: WORKED })
    const os = f.schedules.overseas

    test('the deposit leaves four months before the stock lands', () => {
      expect(os.deposits[1]).toBeCloseTo(59400, 6) // 90,000 x 60% x 1.10, in May
      expect(os.deposits[5]).toBeCloseTo(39600, 6) // for January's container
      expect(os.deposits[0]).toBe(0)
    })

    test('freight, duty and border GST all fall in the landing month', () => {
      expect(os.freight[5]).toBeCloseTo(10800, 6) // 12% of 90,000
      expect(os.duty[5]).toBeCloseTo(4500, 6) // 5% of 90,000
      // The landed value is the exchange-adjusted stock cost plus freight and duty:
      // (99,000 + 10,800 + 4,500) x 15% = 17,145.
      expect(os.borderGst[5]).toBeCloseTo(17145, 6)
      expect(os.borderGst[9]).toBeCloseTo(11430, 6)
    })

    test('the balance follows a month after landing', () => {
      expect(os.supplierBalance[6]).toBeCloseTo(39600, 6)
      expect(os.supplierBalance[10]).toBeCloseTo(26400, 6)
    })

    test('the stock sells DOWN the ladder, not all at the launch price', () => {
      // Steady Eddy is 20/30/20/30. The first two bands are inside 60 days and go at the
      // new price; the third at standard, the fourth at runout.
      expect(os.importedRevenue[6]).toBeCloseTo(51300, 6) // 0.2 x 90,000 x 2.85
      expect(os.importedRevenue[7]).toBeCloseTo(76950, 6) // 0.3 x 90,000 x 2.85
      expect(os.importedRevenue[8]).toBeCloseTo(45360, 6) // 0.2 x 90,000 x 2.52
      expect(os.importedRevenue[9]).toBeCloseTo(59940, 6) // 0.3 x 90,000 x 2.22

      // 🔴 THE WHOLE POINT OF THE LADDER, and the reason Mike asked for it: September's
      // container brings in 233,550, where pricing every unit as new claims 256,500.
      expect(51300 + 76950 + 45360 + 59940).toBeCloseTo(233550, 6)
      expect(90000 * 2.85).toBeCloseTo(256500, 6)
    })

    test('revenue that lands beyond the twelve months is reported, not dropped', () => {
      // January's container only reaches its second selling month by March, so two bands
      // fall into next year. The advisor has to know it is there.
      expect(os.revenueBeyondYear).toBeCloseTo(70200, 6)
    })

    test('the real stock cost reaches cost of sales, not revenue over a mark-up', () => {
      // Mike's ruling: unit costs govern imported stock. 20% of 90,000 is 18,000 of stock
      // consumed in October, whatever it sold for.
      expect(os.importedCostOfSales[6]).toBeCloseTo(18000, 6)
      expect(os.importedCostOfSales[7]).toBeCloseTo(27000, 6)
    })

    test('the exchange movement is its own cost, on the stock cost', () => {
      expect(os.fxOnPurchases[5]).toBeCloseTo(9000, 6) // 10% of 90,000
      expect(os.fxOnPurchases[9]).toBeCloseTo(6000, 6)
    })
  })

  describe('the five cash rows are rows of their own', () => {
    const f = computeThreeWayForecast({ overseas: WORKED })
    const base = computeThreeWayForecast({})

    test('each is separately visible, not rolled into accounts payable', () => {
      // The reason the section exists, in Mike's words: "the whole point of this section
      // is to show when deposits are due, freight is paid, border gst etc - BEFORE the
      // business can even start selling them".
      const p = f.cashFlow.payments
      expect(p.overseasDeposits[1]).toBeCloseTo(59400, 6)
      expect(p.overseasFreight[5]).toBeCloseTo(10800, 6)
      expect(p.overseasDuty[5]).toBeCloseTo(4500, 6)
      expect(p.overseasBorderGst[5]).toBeCloseTo(17145, 6)
      expect(p.overseasSupplierBalance[6]).toBeCloseTo(39600, 6)
      // And none of it touched the domestic creditors ledger.
      expect(p.accountsPayable[5]).toBeCloseTo(base.cashFlow.payments.accountsPayable[5], 6)
    })

    test('131,445 leaves the business by the end of September, on stock costing 90,000', () => {
      // The drawing's headline figure — the working-capital hole a funding request exists
      // to cover — and not one dollar of this stock has been sold by then.
      const p = f.cashFlow.payments
      let out = 0
      for (let m = 0; m <= 5; m++) {
        out += p.overseasDeposits[m] + p.overseasFreight[m] + p.overseasDuty[m] +
          p.overseasBorderGst[m] + p.overseasSupplierBalance[m]
      }
      expect(out).toBeCloseTo(131445, 6)
      expect(f.schedules.overseas.importedRevenue.slice(0, 6).every(v => v === 0)).toBe(true)
    })
  })

  describe('the three statements still articulate with overseas trade on', () => {
    /**
     * 🔴 THE TEST THAT MATTERS MOST. Everything else here checks a figure; this checks
     * that the figures still form a coherent set of accounts. Cash out, stock in, the
     * exchange loss through the P&L and off the debtor, border GST paid and claimed back
     * — get one half of any of those wrong and the balance sheet stops articulating,
     * which no amount of eyeballing a cash-flow row would catch.
     *
     * The workbook's own sample does not balance (its opening position is out by 164,000,
     * which is what the screen's out-of-balance banner exists to say). So the assertion
     * is not that the check is zero — it is that overseas trade does not MOVE it.
     */
    const base = computeThreeWayForecast({})

    test('the balance check is unmoved by importing and exporting', () => {
      const both = JSON.parse(JSON.stringify(WORKED))
      both.overseasSales = [0, 0, 0, 0, 0, 0, 0, 40000, 55000, 35000, 0, 0]
      const f = computeThreeWayForecast({ overseas: both })
      f.balanceSheet.months.balanceCheck.forEach((v, m) => {
        expect(v).toBeCloseTo(base.balanceSheet.months.balanceCheck[m], 6)
      })
    })

    test('it is also unmoved when the exports are NOT zero-rated', () => {
      const taxed = JSON.parse(JSON.stringify(WORKED))
      taxed.overseasSales = [0, 0, 0, 0, 0, 0, 0, 40000, 55000, 35000, 0, 0]
      taxed.zeroRated = false
      const f = computeThreeWayForecast({ overseas: taxed })
      f.balanceSheet.months.balanceCheck.forEach((v, m) => {
        expect(v).toBeCloseTo(base.balanceSheet.months.balanceCheck[m], 6)
      })
    })
  })

  describe('GST is right in both directions', () => {
    const base = computeThreeWayForecast({})
    const exporting = (function () {
      const o = JSON.parse(JSON.stringify(EMPTY_OVERSEAS))
      o.enabled = true
      o.overseasSales = [0, 0, 0, 100000, 0, 0, 0, 0, 0, 0, 0, 0]
      return o
    })()

    test('a zero-rated export raises no GST output at all', () => {
      const f = computeThreeWayForecast({ overseas: exporting })
      expect(f.schedules.overseas.overseasGst[3]).toBe(0)
      // Revenue rose by 100,000 and the GST on income did not move.
      expect(f.profitAndLoss.revenue[3] - base.profitAndLoss.revenue[3]).toBeCloseTo(100000, 6)
      expect(f.schedules.gst.onIncome[3]).toBeCloseTo(base.schedules.gst.onIncome[3], 6)
    })

    test('untick zero-rating and the same sale is charged at the domestic rate', () => {
      const taxed = JSON.parse(JSON.stringify(exporting))
      taxed.zeroRated = false
      const f = computeThreeWayForecast({ overseas: taxed })
      expect(f.schedules.overseas.overseasGst[3]).toBeCloseTo(15000, 6)
      expect(f.schedules.gst.onIncome[3] - base.schedules.gst.onIncome[3]).toBeCloseTo(15000, 6)
    })

    test('border GST is claimed back as an input — a timing cost, not a lost one', () => {
      const f = computeThreeWayForecast({ overseas: WORKED })
      expect(f.cashFlow.payments.overseasBorderGst[5]).toBeCloseTo(17145, 6)
      expect(f.schedules.gst.inputs[5] - base.schedules.gst.inputs[5])
        .toBeGreaterThanOrEqual(17145 - 0.000001)
    })
  })

  describe('the tick is load-bearing in the engine, not only on the screen', () => {
    test('figures sent with the tick OFF are dropped, not half-applied', () => {
      // An advisor who fills the section in and then unticks it gets today's forecast
      // back. The screen zeroes the series too, but a flag that only the screen honours
      // is a trap for the next caller — slice 2 among them.
      const unticked = JSON.parse(JSON.stringify(WORKED))
      unticked.enabled = false
      const f = computeThreeWayForecast({ overseas: unticked })
      expect(statementsOf(f)).toBe(statementsOf(silent))
      overseasIsSilent(f)
    })
  })

  describe('what the twelve months cannot show is said, not hidden', () => {
    test('a deposit falling before the forecast starts is reported and not counted', () => {
      // Stock landing in June (month 2) on a four-month lead was paid for in February,
      // before a forecast opening 1 April. Mike's ruling of 2026-09-04: warn, and leave
      // the cash out — it is already in the opening bank balance.
      const early = JSON.parse(JSON.stringify(EMPTY_OVERSEAS))
      early.enabled = true
      early.importedPurchases = [0, 0, 90000, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const os = computeThreeWayForecast({ overseas: early }).schedules.overseas
      expect(os.depositsBeforeStart).toHaveLength(1)
      expect(os.depositsBeforeStart[0].landsInMonth).toBe(2)
      expect(os.depositsBeforeStart[0].amount).toBeCloseTo(59400, 6)
      os.deposits.forEach((v) => { expect(v).toBe(0) })
    })
  })
})
