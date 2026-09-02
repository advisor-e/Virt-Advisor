'use strict'

/**
 * The by-month accounts intake for the Volatility Report (item 4.54).
 *
 * These carry the 100% bar because the module reads UNTRUSTED uploaded files and feeds
 * numbers a client acts on. The assertions that matter most are not "did it parse" but
 * the three findings from the real client export recorded in REPORT-DATA-MODEL §3.9 —
 * empty months, the partial cut-off month, and the year-to-date column — each of which
 * produces a wrong volatility score that looks entirely believable.
 *
 * Approved artefact: design/mockups/volatility-report.html (wording approved 2026-08-31).
 */

const { parseMonthlyUpload, extractMonthlySales, extractTransactionMonths } = require('../../server/report/intake/monthlySalesParser')
const { assembleMonthlySeries, ordinalLabel } = require('../../server/report/intake/monthlySeriesAssembler')
const { makeXlsx } = require('./xlsxFixture')

/** Apr→Mar financial year headers, dated, as Xero writes them. */
function headers (startYear) {
  const names = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  return names.map((n, i) => n + ' ' + (i < 9 ? startYear : startYear + 1))
}

/**
 * A by-month P&L grid. `sales`/`consulting` are the two trading-income rows; the
 * interest and other-income rows exist to prove they are NOT counted as sales.
 */
function byMonthGrid (opts) {
  const o = opts || {}
  const startYear = o.startYear === undefined ? 2026 : o.startYear
  const sales = o.sales
  const consulting = o.consulting || sales.map(() => 0)
  const head = o.headers || headers(startYear)
  const ytd = sales.reduce((t, v) => t + v, 0)
  return [
    ['Profit and Loss'],
    [o.company || 'Kinetic Test Ltd'],
    [o.period === undefined ? ('For the year ended 31 March ' + (startYear + 1)) : o.period],
    [],
    ['Account'].concat(head).concat(['Total']),
    ['Income'],
    ['Sales'].concat(sales).concat([ytd]),
    ['Consulting'].concat(consulting).concat([consulting.reduce((t, v) => t + v, 0)]),
    ['Interest Income'].concat(sales.map(() => 40)).concat([480]),
    ['Total Income'].concat(sales.map((v, i) => v + consulting[i] + 40)).concat([ytd + 480]),
    ['Other Income'],
    ['Rent Received'].concat(sales.map(() => 900)).concat([10800]),
    ['Total Other Income'].concat(sales.map(() => 900)).concat([10800])
  ]
}

/** Nine real months then three zeros — a mid-year export, the §3.9 shape. */
const MID_YEAR = [50000, 52000, 61000, 47000, 58000, 63000, 55000, 49000, 31000, 0, 0, 0]
/** A closed prior year: every month real. */
const CLOSED_YEAR = [44000, 46000, 51000, 43000, 49000, 57000, 52000, 48000, 60000, 41000, 45000, 53000]

describe('monthlySalesParser — reading one by-month export', () => {
  test('reads twelve months of trading income, excluding interest and other income', () => {
    const r = extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 }))
    expect(r.recognised).toBe(true)
    expect(r.kind).toBe('profitLossByMonth')
    expect(r.companyName).toBe('Kinetic Test Ltd')
    expect(r.months).toHaveLength(12)
    // Sales only: the 40/month interest and 900/month rent must not appear.
    expect(r.months.map(m => m.value)).toEqual(CLOSED_YEAR)
  })

  test('sums several trading-income rows into one monthly sales figure', () => {
    const consulting = CLOSED_YEAR.map(() => 1000)
    const r = extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR, consulting, startYear: 2025 }))
    expect(r.months.map(m => m.value)).toEqual(CLOSED_YEAR.map(v => v + 1000))
  })

  test('the year-to-date column is not read as a thirteenth month', () => {
    const r = extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 }))
    expect(r.months).toHaveLength(12)
    const ytd = CLOSED_YEAR.reduce((t, v) => t + v, 0)
    expect(r.months.some(m => m.value === ytd)).toBe(false)
  })

  test('months are oldest-first and carry a calendar ordinal across the year boundary', () => {
    const r = extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 }))
    expect(r.months[0].year).toBe(2025)
    expect(r.months[0].month).toBe(3) // April
    expect(r.months[11].year).toBe(2026)
    expect(r.months[11].month).toBe(2) // March
    for (let i = 1; i < r.months.length; i++) {
      expect(r.months[i].ordinal).toBe(r.months[i - 1].ordinal + 1)
    }
  })

  // §3.9 finding 1 — the one that quietly wrecks the maths.
  test('empty months after the cut-off are marked, not treated as zero sales', () => {
    const r = extractMonthlySales(byMonthGrid({ sales: MID_YEAR }))
    const empties = r.months.filter(m => m.reason === 'empty')
    expect(empties.map(m => m.label)).toEqual(['Jan 2027', 'Feb 2027', 'Mar 2027'])
    expect(empties.every(m => m.complete === false)).toBe(true)
  })

  // §3.9 finding 2.
  test('the cut-off month is marked partial when empty months follow it', () => {
    const r = extractMonthlySales(byMonthGrid({ sales: MID_YEAR }))
    const dec = r.months.find(m => m.label === 'Dec 2026')
    expect(dec.reason).toBe('partial')
    expect(dec.complete).toBe(false)
    expect(dec.value).toBe(31000)
  })

  test('a fully populated year has NO partial month — it is a closed year, not a cut-off', () => {
    const r = extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 }))
    expect(r.months.every(m => m.complete)).toBe(true)
    expect(r.months.every(m => m.reason === null)).toBe(true)
  })

  test('a zero month INSIDE the year is marked empty but leaves the later months complete', () => {
    const withHole = CLOSED_YEAR.slice()
    withHole[4] = 0
    const r = extractMonthlySales(byMonthGrid({ sales: withHole, startYear: 2025 }))
    expect(r.months[4].reason).toBe('empty')
    expect(r.months[11].complete).toBe(true) // nothing trails it, so nothing is partial
  })

  test('undated month headers are placed from the report period', () => {
    const r = extractMonthlySales(byMonthGrid({
      sales: CLOSED_YEAR,
      startYear: 2025,
      headers: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
    }))
    expect(r.months[0].year).toBe(2025)
    expect(r.months[11].year).toBe(2026)
  })

  test('partially dated headers are filled forward, rolling the year at January', () => {
    const r = extractMonthlySales(byMonthGrid({
      sales: CLOSED_YEAR,
      startYear: 2025,
      // Some columns carry a year, some do not — the dated ones must be left alone.
      headers: ['Apr 2025', 'May', 'Jun', 'Jul', 'Aug', 'Sep 2025', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
    }))
    expect(r.months[0].label).toBe('Apr 2025')
    expect(r.months[8].year).toBe(2025) // December, still the first calendar year
    expect(r.months[9].year).toBe(2026) // January rolls it
    expect(r.months[11].year).toBe(2026)
  })

  test('two-digit years are read as this century', () => {
    const r = extractMonthlySales(byMonthGrid({
      sales: CLOSED_YEAR,
      startYear: 2025,
      headers: ['Apr-25', 'May-25', 'Jun-25', 'Jul-25', 'Aug-25', 'Sep-25', 'Oct-25', 'Nov-25', 'Dec-25', 'Jan-26', 'Feb-26', 'Mar-26']
    }))
    expect(r.months[0].year).toBe(2025)
    expect(r.months[11].year).toBe(2026)
  })

  test('undated headers AND no period year: returns no months and says why', () => {
    const r = extractMonthlySales(byMonthGrid({
      sales: CLOSED_YEAR,
      period: 'Monthly summary',
      headers: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
    }))
    expect(r.recognised).toBe(true)
    expect(r.months).toEqual([])
    expect(r.warnings.join(' ')).toMatch(/could not be placed on a calendar/i)
  })

  test('an export with trading income but no recognised rows warns rather than inventing a figure', () => {
    const grid = byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 })
    grid[5] = ['Miscellaneous'] // the Income section header becomes something unrecognised
    const r = extractMonthlySales(grid)
    expect(r.warnings.join(' ')).toMatch(/No trading-income rows were found/i)
    expect(r.months.every(m => m.value === 0)).toBe(true)
  })

  test('a ragged grid — absent rows, blank cells, a missing figure — is read without crashing', () => {
    // The file is untrusted, so the shape cannot be assumed: a hand-edited or truncated
    // export can carry rows that are simply not there and cells that are blank. None of
    // that may throw, and none of it may silently invent a figure.
    const grid = byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 })
    const salesRow = grid.findIndex(r => r && r[0] === 'Sales')
    grid[salesRow][2] = null // May carries no figure at all
    grid.splice(salesRow, 0, undefined, ['', '', '']) // an absent row and an unlabelled one
    grid.splice(3, 0, undefined, ['', '']) // and the same again ABOVE the month header

    const r = extractMonthlySales(grid)
    expect(r.recognised).toBe(true)
    expect(r.months).toHaveLength(12)
    expect(r.months[0].value).toBe(CLOSED_YEAR[0]) // April unaffected
    expect(r.months[2].value).toBe(CLOSED_YEAR[2]) // June unaffected
    // May had no figure, so it reads as no data — never as a month that sold nothing.
    expect(r.months[1].value).toBe(0)
    expect(r.months[1].reason).toBe('empty')
  })

  test('not a by-month grid → not recognised', () => {
    expect(extractMonthlySales([['Profit and Loss'], ['Co'], ['Income'], ['Sales', 100]]).recognised).toBe(false)
  })

  test('month columns but no report title → not recognised', () => {
    const grid = byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 })
    grid[0] = ['Some Other Schedule']
    expect(extractMonthlySales(grid).recognised).toBe(false)
  })

  test('a "Total …" row inside Income closes the section and is never a line item', () => {
    const r = extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 }))
    // Total Income is 1040 above sales each month; if it were counted the figures would double.
    expect(r.months[0].value).toBe(CLOSED_YEAR[0])
  })
})

describe('monthlySalesParser — the Account Transactions export', () => {
  /**
   * The real shape, from Mike's own export on 2026-08-31: title, company, period line,
   * a Date/Gross header, an account section, then one row per invoice with the date as
   * an Excel serial. It was refused before this shape was supported.
   */
  function txGrid (opts) {
    const o = opts || {}
    const rows = [
      ['Consultancy Fees Transactions'],
      [o.company || 'Kinetic Test Ltd'],
      [o.period === undefined ? 'For the period 1 January 2025 to 31 December 2025' : o.period],
      [],
      [o.dateHeader || 'Date', o.amountHeader || 'Gross'],
      [],
      ['Consultancy Fees']
    ]
    for (const t of (o.rows || [])) { rows.push(t) }
    rows.push(['Total Consultancy Fees', 0], [], ['Total', 0])
    return rows
  }

  /** 1 Jan 2025 is Excel serial 45658. */
  const JAN_2025 = 45658
  /** Serial for the 1st of the nth month after January 2025. */
  function firstOf (monthOffset) {
    return Math.round((Date.UTC(2025, monthOffset, 1) - Date.UTC(1899, 11, 30)) / 86400000)
  }

  test('sums transactions into months, oldest-first', () => {
    const r = extractTransactionMonths(txGrid({
      rows: [[JAN_2025, 11000], [JAN_2025 + 2, 500], [firstOf(1), 9500], [firstOf(2), 11500]]
    }))
    expect(r.recognised).toBe(true)
    expect(r.kind).toBe('accountTransactions')
    expect(r.months[0].label).toBe('Jan 2025')
    expect(r.months[0].value).toBe(11500) // two invoices in January, added together
    expect(r.months[1].value).toBe(9500)
    expect(r.months[2].value).toBe(11500)
  })

  test('a month with no transactions is a REAL zero, not missing data', () => {
    // The opposite reading from the by-month P&L, and deliberately so: in a transaction
    // listing, nothing invoiced IS nothing sold — and that lumpiness is the whole subject
    // of this report. Reading it as missing would delete the quiet months and flatter the
    // business.
    const r = extractTransactionMonths(txGrid({
      period: 'For the period 1 January 2025 to 31 March 2025',
      rows: [[JAN_2025, 10000], [firstOf(2), 10000]]
    }))
    expect(r.months.map(m => m.value)).toEqual([10000, 0, 10000])
    expect(r.months[1].complete).toBe(true)
    expect(r.warnings.join(' ')).toMatch(/1 month has no transactions .* is counted as zero sales/)
  })

  test('a period starting mid-month makes that month partial', () => {
    const r = extractTransactionMonths(txGrid({
      period: 'For the period 20 August 2024 to 31 August 2026',
      rows: [[firstOf(-4), 5000], [firstOf(0), 5000]]
    }))
    expect(r.months[0].reason).toBe('partial')
    expect(r.months[0].complete).toBe(false)
  })

  test('a period ending mid-month makes that month partial', () => {
    const r = extractTransactionMonths(txGrid({
      period: 'For the period 1 January 2025 to 15 March 2025',
      rows: [[JAN_2025, 5000], [firstOf(2), 5000]]
    }))
    const last = r.months[r.months.length - 1]
    expect(last.label).toBe('Mar 2025')
    expect(last.reason).toBe('partial')
  })

  test('a period ending on the last day of the month is NOT partial', () => {
    const r = extractTransactionMonths(txGrid({
      period: 'For the period 1 January 2025 to 28 February 2025',
      rows: [[JAN_2025, 5000], [firstOf(1), 5000]]
    }))
    expect(r.months[r.months.length - 1].complete).toBe(true)
  })

  test('section headers and "Total …" rows are never transactions', () => {
    const r = extractTransactionMonths(txGrid({ period: 'For the period 1 January 2025 to 31 January 2025', rows: [[JAN_2025, 7000]] }))
    // The grid carries "Total Consultancy Fees" 0 and "Total" 0 — neither may become a month.
    expect(r.months).toHaveLength(1)
    expect(r.months[0].value).toBe(7000)
  })

  test('credit notes net off within their month', () => {
    const r = extractTransactionMonths(txGrid({ rows: [[JAN_2025, 10000], [JAN_2025 + 5, -2500]] }))
    expect(r.months[0].value).toBe(7500)
  })

  test('the amount column is chosen by name, Gross before Net', () => {
    const grid = txGrid({ rows: [[JAN_2025, 1000, 800]] })
    grid[4] = ['Date', 'Net', 'Gross']
    const r = extractTransactionMonths(grid)
    expect(r.months[0].value).toBe(800) // the Gross column, not the first numeric one
  })

  test('no Date column, or no amount column → not recognised', () => {
    const noDate = txGrid({ dateHeader: 'When', rows: [[JAN_2025, 100]] })
    expect(extractTransactionMonths(noDate).recognised).toBe(false)
    const noAmount = txGrid({ amountHeader: 'Reference', rows: [[JAN_2025, 100]] })
    expect(extractTransactionMonths(noAmount).recognised).toBe(false)
  })

  test('a header with no transactions under it is not recognised', () => {
    expect(extractTransactionMonths(txGrid({ rows: [] })).recognised).toBe(false)
  })

  test('an unreadable date serial is ignored rather than dated to 1899', () => {
    const r = extractTransactionMonths(txGrid({ period: 'For the period 1 January 2025 to 31 January 2025', rows: [[5, 9999], [JAN_2025, 1000]] }))
    expect(r.months).toHaveLength(1)
    expect(r.months[0].value).toBe(1000)
  })

  test('without a period line the transactions themselves set the span', () => {
    const r = extractTransactionMonths(txGrid({
      period: 'Consultancy Fees',
      rows: [[JAN_2025, 1000], [firstOf(2), 2000]]
    }))
    expect(r.months).toHaveLength(3)
    expect(r.months.every(m => m.complete)).toBe(true)
  })

  test('an unreadable period line falls back to the transactions themselves', () => {
    const r = extractTransactionMonths(txGrid({
      period: 'For the period sometime to whenever',
      rows: [[JAN_2025, 1000], [firstOf(1), 2000]]
    }))
    expect(r.months).toHaveLength(2)
    expect(r.reportDate).toBeNull()
    expect(r.months.every(m => m.complete)).toBe(true)
  })

  test('a period naming a month that does not exist falls back too', () => {
    const r = extractTransactionMonths(txGrid({
      period: 'For the period 20 Smarch 2024 to 31 Smarch 2026',
      rows: [[JAN_2025, 1000], [firstOf(1), 2000]]
    }))
    expect(r.months).toHaveLength(2)
    expect(r.reportDate).toBeNull()
  })

  test('two partial months inside the run read in the plural', () => {
    const first = extractTransactionMonths(txGrid({
      period: 'For the period 1 January 2025 to 15 February 2025',
      rows: [[JAN_2025, 10000], [firstOf(1), 4000]]
    }))
    const second = extractTransactionMonths(txGrid({
      period: 'For the period 20 March 2025 to 31 May 2025',
      rows: [[firstOf(2) + 20, 3000], [firstOf(3), 9500], [firstOf(4), 9200]]
    }))
    const a = assembleMonthlySeries([first, second])
    expect(a.warnings.join(' ')).toMatch(/2 months inside the series \(Feb 2025, Mar 2025\) cover/)
  })

  test('a ragged transactions grid is read without crashing', () => {
    const grid = txGrid({
      period: 'For the period 1 January 2025 to 28 February 2025',
      rows: [[JAN_2025, 1000], [firstOf(1), 2000]]
    })
    grid.splice(1, 0, undefined, ['', '']) // absent and unlabelled rows above the header
    grid.splice(9, 0, undefined) // and one among the transactions
    const r = extractTransactionMonths(grid)
    expect(r.recognised).toBe(true)
    expect(r.months.map(m => m.value)).toEqual([1000, 2000])
  })

  test('parseMonthlyUpload recognises a transactions export from raw bytes', () => {
    const grid = txGrid({
      period: 'For the period 1 January 2025 to 28 February 2025',
      rows: [[JAN_2025, 1000], [firstOf(1), 2000]]
    })
    const r = parseMonthlyUpload(makeXlsx(grid))
    expect(r.kind).toBe('accountTransactions')
    expect(r.months.map(m => m.value)).toEqual([1000, 2000])
  })

  test('a partial month left INSIDE the joined run is named, not silently kept', () => {
    // One file ends mid-February; the next starts in March. February is then no longer at
    // an edge, so it cannot be trimmed — it has to be pointed at instead.
    const first = extractTransactionMonths(txGrid({
      period: 'For the period 1 January 2025 to 15 February 2025',
      rows: [[JAN_2025, 10000], [firstOf(1), 4000]]
    }))
    const second = extractTransactionMonths(txGrid({
      period: 'For the period 1 March 2025 to 31 May 2025',
      rows: [[firstOf(2), 9000], [firstOf(3), 9500], [firstOf(4), 9200]]
    }))
    const a = assembleMonthlySeries([first, second])
    expect(a.usable.map(m => m.label)).toEqual(['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025'])
    expect(a.warnings.join(' ')).toMatch(/1 month inside the series \(Feb 2025\) cover/)
  })

  test('the whole file joins into one series through the assembler', () => {
    const r = extractTransactionMonths(txGrid({
      period: 'For the period 20 December 2024 to 31 December 2025',
      rows: [[firstOf(-1) + 25, 4000]].concat(
        Array.from({ length: 12 }, (_, i) => [firstOf(i), 10000 + i * 100])
      )
    }))
    const a = assembleMonthlySeries([r])
    // December 2024 opened mid-month, so it is dropped from the front, not measured.
    expect(a.dropped.map(m => m.label)).toEqual(['Dec 2024'])
    expect(a.usable).toHaveLength(12)
    expect(a.usable[0].label).toBe('Jan 2025')
    expect(a.warnings.join(' ')).toMatch(/begins part-way through Dec 2024/)
  })
})

describe('parseMonthlyUpload — file types', () => {
  test('reads a real .xlsx buffer', () => {
    const r = parseMonthlyUpload(makeXlsx(byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 })))
    expect(r.months).toHaveLength(12)
    expect(r.months.map(m => m.value)).toEqual(CLOSED_YEAR)
  })

  test('reads a CSV buffer', () => {
    const grid = byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 })
    const csv = grid.map(row => row.map(c => (c === undefined || c === null) ? '' : String(c)).join(',')).join('\n')
    const r = parseMonthlyUpload(Buffer.from(csv, 'utf8'))
    expect(r.months.map(m => m.value)).toEqual(CLOSED_YEAR)
  })

  test('the whole-year P&L is refused BY NAME, not read as one month', () => {
    const annual = [
      ['Profit and Loss'], ['Kinetic Test Ltd'], ['For the year ended 31 March 2026'], [],
      ['Income'], ['Sales', 500000], ['Total Income', 500000]
    ]
    let err = null
    try { parseMonthlyUpload(Buffer.from(annual.map(r => r.join(',')).join('\n'), 'utf8')) } catch (e) { err = e }
    expect(err.code).toBe('NOT_BY_MONTH')
    expect(err.message).toMatch(/Current financial year by month/)
  })

  test('a PDF is refused by the shared sniff', () => {
    let err = null
    try { parseMonthlyUpload(Buffer.from('%PDF-1.7 stuff', 'latin1')) } catch (e) { err = e }
    expect(err.code).toBe('PDF_REJECTED')
  })

  test('an empty upload is refused', () => {
    let err = null
    try { parseMonthlyUpload(Buffer.alloc(0)) } catch (e) { err = e }
    expect(err.code).toBe('UNRECOGNISED_FILE')
  })

  test('binary that is not a zip is refused', () => {
    let err = null
    try { parseMonthlyUpload(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x00, 0x05])) } catch (e) { err = e }
    expect(err.code).toBe('UNRECOGNISED_FILE')
  })
})

describe('monthlySeriesAssembler — joining two exports', () => {
  const thisYear = () => extractMonthlySales(byMonthGrid({ sales: MID_YEAR, startYear: 2026 }))
  const lastYear = () => extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 }))

  test('one mid-year file: the empty and partial months come off the end', () => {
    const a = assembleMonthlySeries([thisYear()])
    expect(a.series).toHaveLength(12)
    expect(a.usable).toHaveLength(8) // Apr–Nov 2026
    expect(a.setAside.map(m => m.reason)).toEqual(['partial', 'empty', 'empty', 'empty'])
    expect(a.usable[a.usable.length - 1].label).toBe('Nov 2026')
  })

  test('two files join into 24 months, and the window slides back over the complete ones', () => {
    const a = assembleMonthlySeries([thisYear(), lastYear()])
    expect(a.series).toHaveLength(24)
    expect(a.usable).toHaveLength(20) // Apr 2025 – Nov 2026
    expect(a.usable[0].label).toBe('Apr 2025')
    expect(a.usable[19].label).toBe('Nov 2026')
    expect(a.warnings).toEqual([])
  })

  test('upload order does not matter — the older file is always placed first', () => {
    const forward = assembleMonthlySeries([thisYear(), lastYear()])
    const backward = assembleMonthlySeries([lastYear(), thisYear()])
    expect(backward.usable).toEqual(forward.usable)
  })

  test('files that do not meet: the gap is named and only the newer run is used', () => {
    const old = extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR, startYear: 2023 }))
    const a = assembleMonthlySeries([thisYear(), old])
    expect(a.warnings.join(' ')).toMatch(/do not meet/i)
    expect(a.warnings.join(' ')).toMatch(/24 months are missing/i)
    expect(a.usable[0].label).toBe('Apr 2026')
    expect(a.usable).toHaveLength(8)
  })

  test('overlapping files: the older file wins and the advisor is told', () => {
    const a = extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 }))
    const b = extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR.map(v => v + 7), startYear: 2025 }))
    const out = assembleMonthlySeries([a, b])
    expect(out.warnings.join(' ')).toMatch(/overlap/i)
    expect(out.usable).toHaveLength(12)
    expect(out.usable[0].value).toBe(CLOSED_YEAR[0]) // the older file's figure, not +7
  })

  test('a zero month inside the run is kept in place and named, never spliced out', () => {
    const holed = CLOSED_YEAR.slice()
    holed[4] = 0
    const a = assembleMonthlySeries([extractMonthlySales(byMonthGrid({ sales: holed, startYear: 2025 }))])
    expect(a.usable).toHaveLength(12)
    expect(a.usable[4].value).toBe(0)
    expect(a.warnings.join(' ')).toMatch(/read as zero in the export/i)
    // The months either side must still be adjacent — a splice would break this.
    expect(a.usable[5].ordinal).toBe(a.usable[4].ordinal + 1)
  })

  test('different companies is a warning, not a refusal', () => {
    const a = extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 }))
    const b = extractMonthlySales(byMonthGrid({ sales: MID_YEAR, startYear: 2026, company: 'Other Ltd' }))
    const out = assembleMonthlySeries([a, b])
    expect(out.warnings.join(' ')).toMatch(/different companies/i)
    expect(out.usable.length).toBeGreaterThan(0)
  })

  test('more than two files is refused before anything is read', () => {
    let err = null
    try { assembleMonthlySeries([thisYear(), lastYear(), thisYear()]) } catch (e) { err = e }
    expect(err.code).toBe('TOO_MANY_FILES')
  })

  test('a file that is not a by-month P&L is refused, naming its position', () => {
    let err = null
    try { assembleMonthlySeries([thisYear(), { kind: 'profitLoss' }]) } catch (e) { err = e }
    expect(err.code).toBe('WRONG_REPORT_KIND')
    expect(err.message).toMatch(/File 2/)
  })

  test('no files at all assembles to nothing rather than throwing', () => {
    const a = assembleMonthlySeries([])
    expect(a.usable).toEqual([])
    expect(a.series).toEqual([])
    expect(a.files).toEqual([])
  })

  test('a non-array argument is treated as no files', () => {
    expect(assembleMonthlySeries(null).usable).toEqual([])
  })

  test('per-file summary carries the range and the complete count', () => {
    const a = assembleMonthlySeries([thisYear()])
    expect(a.files[0].monthsRead).toBe(12)
    expect(a.files[0].monthsComplete).toBe(8)
    expect(a.files[0].range).toBe('Apr 2026 – Mar 2027')
  })

  test('a file whose months could not be dated still summarises without crashing', () => {
    const undated = extractMonthlySales(byMonthGrid({
      sales: CLOSED_YEAR,
      period: 'Monthly summary',
      headers: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
    }))
    const a = assembleMonthlySeries([undated])
    expect(a.files[0].range).toBeNull()
    expect(a.usable).toEqual([])
    expect(a.warnings.join(' ')).toMatch(/could not be placed on a calendar/i)
  })

  test('a one-month gap reads in the singular', () => {
    // An eleven-column export ending Feb 2026, against one starting Apr 2026:
    // exactly March 2026 is absent.
    const first = extractMonthlySales(byMonthGrid({
      sales: CLOSED_YEAR.slice(0, 11),
      startYear: 2025,
      headers: headers(2025).slice(0, 11)
    }))
    const second = extractMonthlySales(byMonthGrid({ sales: MID_YEAR, startYear: 2026 }))
    const out = assembleMonthlySeries([first, second])
    expect(out.warnings.join(' ')).toMatch(/1 month is missing between them \(Mar 2026\)/)
  })

  test('an overlap of exactly one month reads as that month, not a range', () => {
    const a = extractMonthlySales(byMonthGrid({ sales: CLOSED_YEAR, startYear: 2025 }))
    const b = extractMonthlySales(byMonthGrid({
      sales: [70000, 71000, 72000, 73000, 74000, 75000],
      headers: ['Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026']
    }))
    const out = assembleMonthlySeries([a, b])
    expect(out.warnings.join(' ')).toMatch(/Both exports cover Mar 2026\./)
  })

  test('two zero months inside the run read in the plural', () => {
    const holed = CLOSED_YEAR.slice()
    holed[4] = 0
    holed[6] = 0
    const out = assembleMonthlySeries([extractMonthlySales(byMonthGrid({ sales: holed, startYear: 2025 }))])
    expect(out.warnings.join(' ')).toMatch(/2 months inside the series \(Aug 2025, Oct 2025\)/)
  })

  test('a parsed file missing its optional fields is summarised without crashing', () => {
    // Defensive: the assembler must not assume the parser filled every field, because a
    // half-populated object reaching it would otherwise throw inside a route's try block
    // and surface as a generic failure with no clue what was wrong.
    const out = assembleMonthlySeries([{ kind: 'profitLossByMonth' }])
    expect(out.files[0]).toEqual({
      companyName: null, reportDate: null, monthsRead: 0, monthsComplete: 0, range: null, warnings: []
    })
    expect(out.usable).toEqual([])
    expect(out.warnings).toEqual([])
  })

  test('ordinalLabel names a month from its ordinal', () => {
    expect(ordinalLabel(2026 * 12 + 3)).toBe('Apr 2026')
    expect(ordinalLabel(2026 * 12 + 0)).toBe('Jan 2026')
  })
})
