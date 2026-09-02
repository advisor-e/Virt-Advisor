'use strict'

// monthlySalesParser reads an UNTRUSTED uploaded file and produces the monthly sales
// series the Volatility Report measures, so it is held to the 100% standard CLAUDE.md
// sets for functions processing untrusted input (item 4.54). The refusals matter as
// much as the reads: a plausible series built from misordered or gappy months would
// put a wrong volatility band in front of a client with nothing looking broken.

const { parseMonthlyUpload, extractMonthlySales, monthOf, MIN_MONTHS, MAX_MONTHS } = require('../../server/report/intake/monthlySalesParser')
const { makeXlsx } = require('./xlsxFixture')

const KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** Month header labels "Jan 2025".. for n months starting at (m0 0-based, y0). */
function labels (n, m0, y0) {
  const out = []
  for (let i = 0; i < n; i++) {
    const m = (m0 + i) % 12
    const y = y0 + Math.floor((m0 + i) / 12)
    out.push(KEYS[m].charAt(0).toUpperCase() + KEYS[m].slice(1) + ' ' + y)
  }
  return out
}

/** A per-month value series: base, base+step, ... */
function series (n, base, step) {
  return Array.from({ length: n }, (_, i) => base + i * (step || 0))
}

/**
 * A realistic by-month P&L grid. `opts` bends one thing at a time:
 * headerLabels (replace the month header cells), extraTotalColumn, salesRows
 * (replace the income line items: [label, values[]]), cachedIncomeTotals
 * (values for the "Total Income" row; null cells stay blank), noIncomeSection.
 */
function monthlyGrid (opts) {
  const o = opts || {}
  const n = o.n || 12
  const header = o.headerLabels || labels(n, 0, 2025)
  const sales = series(n, 1000, 10)
  const other = series(n, 50, 0)
  const salesRows = o.salesRows || [['Sales', sales], ['Service Fees', other]]
  const totals = o.cachedIncomeTotals !== undefined
    ? o.cachedIncomeTotals
    : header.map((_, i) => salesRows.reduce((t, r) => t + (r[1][i] || 0), 0))

  const grid = [
    ['Profit and Loss'],
    ['Kinetic Test Ltd'],
    ['For the ' + n + ' months ended 31 December 2025'],
    [],
    ['', ...header, ...(o.extraTotalColumn ? ['Total'] : [])]
  ]
  if (!o.noIncomeSection) {
    grid.push(['Income'])
    for (const [label, values] of salesRows) { grid.push([label, ...values]) }
    if (totals) { grid.push(['Total Income', ...totals]) }
  }
  grid.push(['Less Operating Expenses'])
  grid.push(['Rent', ...series(n, 200, 0)])
  grid.push(['Total Operating Expenses', ...series(n, 200, 0)])
  return grid
}

const META = { companyName: 'Kinetic Test Ltd', reportDate: null }

/** Run the extractor and return the sales values in order. */
function salesOf (grid) {
  return extractMonthlySales(grid, META).months.map(m => m.sales)
}

/** Expect a coded refusal. @param {Function} fn @param {string} code */
function expectRefusal (fn, code) {
  let caught = null
  try { fn() } catch (e) { caught = e }
  expect(caught).not.toBeNull()
  expect(caught.code).toBe(code)
  return caught
}

// ── The happy path — a real by-month shape ────────────────────────────────────

describe('a 12-month P&L export', () => {
  const r = extractMonthlySales(monthlyGrid(), META)

  test('is recognised, oldest month first, with its names and years', () => {
    expect(r.recognised).toBe(true)
    expect(r.kind).toBe('monthlySales')
    expect(r.monthsRead).toBe(12)
    expect(r.months[0]).toEqual({ key: 'jan', year: 2025, sales: 1050 })
    expect(r.months[11].key).toBe('dec')
    expect(r.months[11].year).toBe(2025)
  })

  test('each month\'s sales is the SUM of the income line items, never the Total row', () => {
    // Sales 1000..1110 step 10, plus Service Fees 50 flat.
    expect(r.months.map(m => m.sales)).toEqual(series(12, 1050, 10))
  })

  test('carries the company name for the advisor\'s own screen', () => {
    expect(r.companyName).toBe('Kinetic Test Ltd')
  })

  test('matching cached totals produce no warnings', () => {
    expect(r.warnings).toEqual([])
  })
})

describe('what counts as sales — the shared classification rules', () => {
  test('interest, dividends and bad debts recovered are NOT sales — and the file\'s own Total Income (which includes them) still cross-checks clean', () => {
    const n = 12
    const r = extractMonthlySales(monthlyGrid({
      salesRows: [
        ['Sales', series(n, 1000, 0)],
        ['Interest Income', series(n, 99, 0)],
        ['Dividends', series(n, 99, 0)],
        ['Bad Debts Recovered', series(n, 99, 0)]
      ]
    }), META)
    expect(r.months.map(m => m.sales)).toEqual(series(n, 1000, 0))
    expect(r.warnings).toEqual([])
  })

  test('an Other Income section is not sales (R18 anchoring: only the trading sections count)', () => {
    const grid = monthlyGrid()
    grid.push(['Other Income'])
    grid.push(['Sundry Grants', ...series(12, 500, 0)])
    expect(salesOf(grid)).toEqual(series(12, 1050, 10))
  })

  test('a trailing Total COLUMN is simply not a month, so it is never read', () => {
    const grid = monthlyGrid({ extraTotalColumn: true })
    // give the total column a poisonous value on the sales row
    const salesRow = grid.find(row => row[0] === 'Sales')
    salesRow.push(999999)
    expect(salesOf(grid)).toEqual(series(12, 1050, 10))
  })

  test('a blank cell in one month is that month reading lower, never NaN', () => {
    const values = series(12, 100, 0)
    values[5] = null
    const grid = monthlyGrid({ salesRows: [['Sales', values]] })
    const out = salesOf(grid)
    expect(out[5]).toBe(0)
    expect(out[0]).toBe(100)
  })

  test('sparse grids do not throw: a missing row, a number-only row and a blank-label row are all skipped', () => {
    const grid = monthlyGrid()
    const at = grid.findIndex(row => row[0] === 'Income')
    grid.splice(at, 0, undefined, [null, 1, 2, 3], ['   '])
    grid.splice(3, 1, undefined) // the blank spacer row above the header, gone entirely
    expect(salesOf(grid)).toEqual(series(12, 1050, 10))
  })
})

// ── The cross-check ───────────────────────────────────────────────────────────

describe('the file\'s own Total Income row', () => {
  test('a POISONED cached total is never believed — line items win, advisor warned', () => {
    const totals = series(12, 1050, 10)
    totals[3] = 999999
    totals[7] = 999999
    const r = extractMonthlySales(monthlyGrid({ cachedIncomeTotals: totals }), META)
    expect(r.months.map(m => m.sales)).toEqual(series(12, 1050, 10))
    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0]).toContain('2 month(s)')
  })

  test('a file with NO totals row at all raises nothing — there is simply nothing to check', () => {
    const grid = [
      ['Profit and Loss'],
      ['Kinetic Test Ltd'],
      ['For the 12 months ended 31 December 2025'],
      ['', ...labels(12, 0, 2025)],
      ['Income'],
      ['Sales', ...series(12, 1000, 0)]
    ]
    const r = extractMonthlySales(grid, META)
    expect(r.months.map(m => m.sales)).toEqual(series(12, 1000, 0))
    expect(r.warnings).toEqual([])
  })

  test('an uncalculated (blank) totals row raises nothing', () => {
    const r = extractMonthlySales(monthlyGrid({ cachedIncomeTotals: labels(12, 0, 2025).map(() => null) }), META)
    expect(r.warnings).toEqual([])
  })

  test('R17 carried over: a "Total X" row that is a real account inside Income is counted', () => {
    // The real income total includes the oddly-named account, as a real file's would.
    const grid = monthlyGrid({
      salesRows: [['Sales', series(12, 1000, 0)]],
      cachedIncomeTotals: series(12, 1007, 0)
    })
    const at = grid.findIndex(row => row[0] === 'Total Income')
    // values that match no open section's running sum → a real account, kept
    // (one month left blank, which reads as nothing that month, never NaN)
    const oil = series(12, 7, 0)
    oil[2] = null
    grid.splice(at, 0, ['Total Oil Sales', ...oil])
    const r = extractMonthlySales(grid, META)
    const want = series(12, 1007, 0)
    want[2] = 1000
    expect(r.months.map(m => m.sales)).toEqual(want)
  })

  test('R17 the other way: a sum-like "Total X" row is a total, never double-counted', () => {
    const grid = monthlyGrid({ salesRows: [['Sales', series(12, 1000, 0)]] })
    const at = grid.findIndex(row => row[0] === 'Total Income')
    // row total equals the Income section's own running sum (12 × 1000) → stays a total
    const sumLike = series(12, 1000, 0)
    grid.splice(at, 0, ['Total Something', ...sumLike])
    expect(salesOf(grid)).toEqual(series(12, 1000, 0))
  })
})

// ── Month ordering ────────────────────────────────────────────────────────────

describe('month order', () => {
  test('newest-first columns are reversed to oldest-first', () => {
    const rev = labels(12, 0, 2025).reverse()
    const values = series(12, 100, 1) // 100 for Dec … 111 for Jan, as printed
    const grid = monthlyGrid({ headerLabels: rev, salesRows: [['Sales', values]] })
    const r = extractMonthlySales(grid, META)
    expect(r.months[0].key).toBe('jan')
    expect(r.months[0].sales).toBe(111)
    expect(r.months[11].key).toBe('dec')
    expect(r.months[11].sales).toBe(100)
  })

  test('a year boundary is walked correctly (Oct 2024 … Sep 2025)', () => {
    const r = extractMonthlySales(monthlyGrid({ headerLabels: labels(12, 9, 2024) }), META)
    expect(r.months[0]).toMatchObject({ key: 'oct', year: 2024 })
    expect(r.months[11]).toMatchObject({ key: 'sep', year: 2025 })
  })

  test('yearless headers are accepted when consecutive, with year reported as unknown', () => {
    const bare = labels(12, 3, 2025).map(l => l.split(' ')[0]) // Apr..Mar, no years
    const r = extractMonthlySales(monthlyGrid({ headerLabels: bare }), META)
    expect(r.months[0].key).toBe('apr')
    expect(r.months[0].year).toBeNull()
  })

  test('yearless newest-first headers are reversed by their own printed order', () => {
    const bare = labels(12, 0, 2025).map(l => l.split(' ')[0]).reverse() // Dec..Jan
    const values = series(12, 100, 1) // 100 for Dec … 111 for Jan, as printed
    const r = extractMonthlySales(monthlyGrid({ headerLabels: bare, salesRows: [['Sales', values]] }), META)
    expect(r.months[0]).toMatchObject({ key: 'jan', year: null, sales: 111 })
    expect(r.months[11]).toMatchObject({ key: 'dec', sales: 100 })
  })

  test('yearless and NOT consecutive is refused — no honest order exists', () => {
    const shuffled = ['Jan', 'Mar', 'Feb', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    expectRefusal(() => extractMonthlySales(monthlyGrid({ headerLabels: shuffled }), META), 'MONTHS_UNREADABLE')
  })

  test('a GAP in the months is refused, never read as zero', () => {
    const gappy = labels(13, 0, 2025)
    gappy.splice(6, 1) // drop July: Jan..Jun, Aug..Jan
    expectRefusal(() => extractMonthlySales(monthlyGrid({ n: 12, headerLabels: gappy }), META), 'MONTHS_UNREADABLE')
  })

  test('a DUPLICATED month is refused', () => {
    const dup = labels(12, 0, 2025)
    dup[11] = dup[10]
    expectRefusal(() => extractMonthlySales(monthlyGrid({ headerLabels: dup }), META), 'MONTHS_UNREADABLE')
  })
})

// ── Refusals ──────────────────────────────────────────────────────────────────

describe('wrong-shape files fail loudly', () => {
  test('11 months is refused, naming the count', () => {
    const err = expectRefusal(() => extractMonthlySales(monthlyGrid({ n: 11 }), META), 'MONTHS_INSUFFICIENT')
    expect(err.message).toContain('only 11 monthly columns')
  })

  test('a whole-period export (no monthly columns) is refused with its own sentence', () => {
    const annual = [
      ['Profit and Loss'],
      ['Kinetic Test Ltd'],
      ['For the year ended 31 March 2026'],
      ['Income'],
      ['Sales', 500000],
      ['Total Income', 500000]
    ]
    const err = expectRefusal(() => extractMonthlySales(annual, META), 'MONTHS_INSUFFICIENT')
    expect(err.message).toContain('whole-period')
  })

  test('a P&L with months but no income section is refused', () => {
    expectRefusal(() => extractMonthlySales(monthlyGrid({ noIncomeSection: true }), META), 'UNRECOGNISED_REPORT')
  })

  // 🔴 Ruled wording, pinned once (Mike, 2026-09-02): no product names — the sentences
  // say "your accounting software", never a vendor. This is the one deliberate pin.
  test('every authored refusal names no accounting product', () => {
    const collect = (fn) => { try { fn() } catch (e) { return e.message } return '' }
    const messages = [
      collect(() => extractMonthlySales(monthlyGrid({ n: 11 }), META)),
      collect(() => extractMonthlySales(monthlyGrid({ noIncomeSection: true }), META)),
      collect(() => extractMonthlySales(monthlyGrid({ headerLabels: labels(12, 0, 2025).map(l => l.split(' ')[0]).sort() }), META))
    ]
    for (const m of messages) {
      expect(m).not.toContain('Xero')
    }
  })
})

describe('more history than the model can use', () => {
  test('beyond 24 months the most recent 24 are read, and it is said', () => {
    const n = 30
    const r = extractMonthlySales(monthlyGrid({
      n,
      headerLabels: labels(n, 0, 2023),
      salesRows: [['Sales', series(n, 100, 1)]]
    }), META)
    expect(r.monthsRead).toBe(MAX_MONTHS)
    expect(r.months[0].sales).toBe(106) // month 7 of 30 — the first of the last 24
    expect(r.months[23].sales).toBe(129)
    expect(r.warnings.some(w => w.includes('most recent 24'))).toBe(true)
  })
})

// ── The buffer-level entry point ──────────────────────────────────────────────

describe('parseMonthlyUpload', () => {
  const csvOf = grid => Buffer.from(grid.map(row => (row || []).join(',')).join('\n'), 'utf8')

  test('reads a CSV export end to end', () => {
    const r = parseMonthlyUpload(csvOf(monthlyGrid()))
    expect(r.monthsRead).toBe(12)
    expect(r.months[0].sales).toBe(1050)
  })

  test('reads a real .xlsx buffer end to end', () => {
    const r = parseMonthlyUpload(makeXlsx(monthlyGrid()))
    expect(r.monthsRead).toBe(12)
    expect(r.months.map(m => m.sales)).toEqual(series(12, 1050, 10))
  })

  test('reads Excel DATE-SERIAL month headers (a formatted export)', () => {
    // 45658 = 2025-01-01; first-of-month serials for Jan..Dec 2025
    const serials = [45658, 45689, 45717, 45748, 45778, 45809, 45839, 45870, 45901, 45931, 45962, 45992]
    const r = parseMonthlyUpload(makeXlsx(monthlyGrid({ headerLabels: serials })))
    expect(r.months[0]).toMatchObject({ key: 'jan', year: 2025 })
    expect(r.months[11]).toMatchObject({ key: 'dec', year: 2025 })
  })

  test('a Balance Sheet is not a P&L', () => {
    const bs = [['Balance Sheet'], ['Kinetic Test Ltd'], ['As at 31 March 2026'], ['Assets'], ['Bank', 100]]
    expectRefusal(() => parseMonthlyUpload(csvOf(bs)), 'UNRECOGNISED_REPORT')
  })

  test('a PDF is refused before any parsing', () => {
    expectRefusal(() => parseMonthlyUpload(Buffer.from('%PDF-1.7 whatever')), 'PDF_REJECTED')
  })

  test('an empty upload is refused', () => {
    expectRefusal(() => parseMonthlyUpload(Buffer.alloc(0)), 'UNRECOGNISED_FILE')
  })

  test('binary junk is refused as unrecognised, not crashed on', () => {
    expectRefusal(() => parseMonthlyUpload(Buffer.from([0x00, 0x01, 0x02, 0x7F, 0x00, 0x03])), 'UNRECOGNISED_FILE')
  })
})

// ── monthOf — every header shape a real export prints ─────────────────────────

describe('monthOf', () => {
  test.each([
    ['Jan', { m: 0, y: null }],
    ['January 2025', { m: 0, y: 2025 }],
    ['Jan-25', { m: 0, y: 2025 }],
    ['Jan 25', { m: 0, y: 2025 }],
    ['31 Jan 2024', { m: 0, y: 2024 }],
    ['Sep 2024', { m: 8, y: 2024 }],
    ['DEC 2025', { m: 11, y: 2025 }]
  ])('reads %s', (text, want) => {
    expect(monthOf(text)).toEqual(want)
  })

  test.each([
    ['not a month', 'Total'],
    ['an out-of-range year', 'Jan 1930'],
    ['an empty string', ''],
    ['a plain figure', '1234'],
    ['null', null],
    ['an object', {}]
  ])('%s is not a month', (_label, v) => {
    expect(monthOf(v)).toBeNull()
  })

  test('a date serial converts; an out-of-range or fractional number does not', () => {
    expect(monthOf(45658)).toEqual({ m: 0, y: 2025 }) // 1 Jan 2025
    expect(monthOf(1234)).toBeNull() // 1903 — no report header
    expect(monthOf(99999)).toBeNull()
    expect(monthOf(45658.5)).toBeNull()
  })
})

// ── The constants the screen relies on ────────────────────────────────────────

test('the window floor and ceiling match the model\'s windows', () => {
  expect(MIN_MONTHS).toBe(12)
  expect(MAX_MONTHS).toBe(24)
})
