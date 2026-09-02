'use strict'

/**
 * The Three-Way Forecast intake route.
 *
 * Same harness as volatilityIntakeRoute.test.js: formidable is mocked at the module
 * boundary so the handler runs without real multipart plumbing.
 *
 * 🔴 WHAT THIS FILE IS REALLY FOR. The route reads up to three files and one of them —
 * last year's by-month Profit and Loss — is told apart from the other two by SNIFFING,
 * and the order of the sniff is load-bearing. A single-period Balance Sheet cannot look
 * like a by-month report, but a twelve-column P&L IS a P&L, and the annual reader reaches
 * it through `guardFigureColumns`, which THROWS rather than declining. Sniff the annual
 * reader first and the third slot silently never works: the advisor drops the file, sees
 * no error, and gets no starting point. That is invisible in UAT — an empty sales grid
 * looks exactly like a file nobody dropped.
 */

jest.mock('formidable', () => ({ formidable: jest.fn() }))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { formidable } = require('formidable')
const { threeWayForecastIntake } = require('../../server/routes/report')
const { makeXlsx } = require('./xlsxFixture')

/** Minimal res double capturing the (status, body) send. */
function makeRes () {
  const res = { status: null, body: null }
  res.send = (status, body) => { res.status = status; res.body = body }
  return res
}

/** Point the mocked form's parse() at a canned outcome. @param {Error|null} err @param {object} files */
function nextParse (err, files) {
  formidable.mockReturnValue({
    parse (req, cb) { cb(err, {}, files) }
  })
}

/** Write a real temp file so the parse-and-discard rule can be observed. */
function tempFile (content, ext) {
  const p = path.join(os.tmpdir(), 'twf-intake-test-' + Math.random().toString(36).slice(2) + (ext || '.csv'))
  fs.writeFileSync(p, content)
  return p
}

/** Has the handler removed the temp file it was given? @param {string} p */
function gone (p) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(!fs.existsSync(p)), 30)
  })
}

const BS_GRID = [
  ['Balance Sheet'],
  ['Kinetic Test Ltd'],
  ['As at 31 March 2026'],
  [],
  ['Assets'],
  ['Current Assets'],
  ['Bank'],
  ['Cheque Account', 71000],
  ['Total Bank', 71000],
  ['Accounts Receivable', 52000],
  ['Inventory', 40000],
  ['Total Current Assets', 163000],
  ['Total Assets', 163000],
  ['Liabilities'],
  ['Current Liabilities'],
  ['Accounts Payable', 58000],
  ['GST Payable', 5500],
  ['Total Current Liabilities', 63500],
  ['Total Liabilities', 63500],
  ['Equity'],
  ['Share Capital', 200000],
  ['Retained Earnings', 7000],
  ['Total Equity', 207000]
]

const PL_GRID = [
  ['Profit and Loss'],
  ['Kinetic Test Ltd'],
  ['For the year ended 31 March 2026'],
  [],
  ['Income'],
  ['Sales', 890000],
  ['Total Income', 890000],
  ['Less Operating Expenses'],
  ['Rent', 8500],
  ['Wages and Salaries', 85000],
  ['Total Operating Expenses', 93500]
]

/**
 * A by-month P&L covering `n` months from April 2025 — the "Current financial year by
 * month" layout, which is the export the third slot asks for.
 * @param {number} n
 */
function byMonthCsv (n) {
  const names = ['Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025',
    'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026']
  const cols = names.slice(0, n)
  const values = []
  for (let i = 0; i < n; i++) { values.push(40000 + (i * 1000)) }
  return [
    'Profit and Loss',
    'Kinetic Test Ltd',
    'For the year ended 31 March 2026',
    '',
    'Account,' + cols.join(','),
    'Income',
    'Sales,' + values.join(','),
    'Total Income,' + values.join(',')
  ].join('\n')
}

/** Run the handler over a set of temp file paths. @param {Array<string>} paths */
async function run (paths) {
  nextParse(null, { file: paths.map(p => ({ filepath: p })) })
  const res = makeRes()
  await threeWayForecastIntake({}, res)
  return res
}

describe('the by-month file reaches the forecast', () => {
  test('🔴 twelve months of last year seed the sales, tagged as a starting point', async () => {
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const pl = tempFile(makeXlsx(PL_GRID), '.xlsx')
    const monthly = tempFile(byMonthCsv(12))

    const res = await run([bs, pl, monthly])

    expect(res.status).toBe(200)
    expect(res.body.data.blocked).toBeNull()
    expect(res.body.data.proposal.sales).toHaveLength(12)
    // Seeded, NOT 'file': last year's actual is a starting point for a judgement about
    // next year, and the screen must not present the two the same way.
    expect(res.body.data.provenance.sales).toBe('seeded')
    // The annual reports still read normally alongside it.
    expect(res.body.data.proposal.openingBalanceSheet.cashAtBank).toBe(71000)
    expect(res.body.data.proposal.overheads.rent).toBe(8500)
  })

  test('without a by-month file nothing is seeded, and the sales stay the advisor’s', async () => {
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const res = await run([bs])

    expect(res.status).toBe(200)
    expect(res.body.data.proposal.sales).toBeUndefined()
    expect(res.body.data.provenance.sales).toBe('entered')
  })

  test('🔴 short of twelve complete months nothing is seeded, and it says so', async () => {
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const monthly = tempFile(byMonthCsv(6))

    const res = await run([bs, monthly])

    expect(res.status).toBe(200)
    // Six months are never stretched into twelve — a made-up month in a seeded series is
    // worse than no seed, because it carries the same badge as the real ones.
    expect(res.body.data.proposal.sales).toBeUndefined()
    expect(res.body.data.provenance.sales).toBe('entered')
    expect(res.body.data.warnings.join(' ')).toMatch(/twelve/i)
  })

  test('two by-month reports are refused rather than silently merged', async () => {
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const a = tempFile(byMonthCsv(12))
    const b = tempFile(byMonthCsv(12))

    const res = await run([bs, a, b])

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body.success).toBe(false)
  })
})

describe('the route still keeps its promises', () => {
  test('a Balance Sheet is required, and its absence is stated rather than half-assembled', async () => {
    const pl = tempFile(makeXlsx(PL_GRID), '.xlsx')
    const res = await run([pl])

    expect(res.status).toBe(200)
    expect(res.body.data.blocked).toMatch(/Balance Sheet/)
    expect(res.body.data.proposal.openingBalanceSheet).toBeUndefined()
  })

  test('🔴 every temp file is deleted, including on the by-month path', async () => {
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const monthly = tempFile(byMonthCsv(12))

    await run([bs, monthly])

    expect(await gone(bs)).toBe(true)
    expect(await gone(monthly)).toBe(true)
  })

  test('an over-count is refused BEFORE any file is read', async () => {
    // These paths do not exist: reading one would ENOENT into the generic parse failure,
    // so a clean TOO_MANY_FILES proves the count was checked first.
    const res = await run(['/no/such/a.xlsx', '/no/such/b.xlsx', '/no/such/c.xlsx', '/no/such/d.xlsx'])

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body.error.code).toBe('TOO_MANY_FILES')
  })

  test('a file that is neither report is refused by the forecast reader’s own message', async () => {
    const junk = tempFile('Some Other Report\nAcme\n\nRow,1\n')
    const res = await run([junk])

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body.success).toBe(false)
    // The path of the file must never travel back to the browser.
    expect(JSON.stringify(res.body)).not.toContain(os.tmpdir())
  })
})
