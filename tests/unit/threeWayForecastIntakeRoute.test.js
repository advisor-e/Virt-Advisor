'use strict'

/**
 * The Three-Way Forecast intake route.
 *
 * Same harness as volatilityIntakeRoute.test.js: formidable is mocked at the module
 * boundary so the handler runs without real multipart plumbing.
 *
 * 🔴 WHAT THIS FILE IS REALLY FOR. The route reads up to four files and two of them — the
 * by-month Profit and Loss exports — are told apart from the annual pair by SNIFFING, and
 * the order of the sniff is load-bearing. A single-period Balance Sheet cannot look like a
 * by-month report, but a twelve-column P&L IS a P&L, and the annual reader reaches it
 * through `guardFigureColumns`, which THROWS rather than declining. Sniff the annual
 * reader first and the by-month slots silently never work: the advisor drops the file,
 * sees no error, and gets no starting point. That is invisible in UAT — an empty sales
 * grid looks exactly like a file nobody dropped.
 *
 * The second by-month slot (item 4.61a, 2026-09-03) is here for one measurable reason, and
 * `a mid-year export alone…` below is the test that states it: a current-year export
 * usually stops part-way through a month, its trailing months are stripped, and one file
 * can then yield eleven usable months and no seed at all.
 */

jest.mock('formidable', () => ({ formidable: jest.fn() }))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { formidable } = require('formidable')
const { threeWayForecastIntake } = require('../../server/routes/report')
const { makeXlsx, makeMultiSheetXlsx } = require('./xlsxFixture')

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

const MONTH_NAMES = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

/**
 * A full twelve-column by-month P&L for the April–March year beginning `startYear`, with
 * only the first `populated` months carrying figures.
 *
 * That is the shape of a real mid-year export, and the parser reads it as one: a zero
 * month is "no data" rather than "no sales", and the last populated month is partial
 * because empty months follow it. So `byMonthYear(2025, 6)` offers twelve columns and
 * yields FIVE usable months — which is the whole reason the second slot exists.
 *
 * @param {number} startYear - the calendar year the April sits in
 * @param {number} populated - how many of the twelve months carry a figure
 */
function byMonthYear (startYear, populated) {
  const cols = MONTH_NAMES.map((m, i) => m + ' ' + (i < 9 ? startYear : startYear + 1))
  const values = []
  for (let i = 0; i < 12; i++) { values.push(i < populated ? 40000 + (i * 1000) : 0) }
  return [
    'Profit and Loss',
    'Kinetic Test Ltd',
    'For the year ended 31 March ' + (startYear + 1),
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

  /**
   * 🔴 MIKE'S RULING, 2026-09-07, REVERSING THE OLD RULE HERE. In his words: "I want it to
   * bring in the sales and cost figures it DOES have - and notify the user that the
   * remaining months need to be added manually."
   *
   * These two tests pinned the opposite — that a short run seeded NOTHING — and he met the
   * consequence the same day: a current-year export stopped part-way through a month,
   * eleven complete months were thrown away, and step 4 showed a $202,781 loss on $0 of
   * sales that balanced perfectly and whose sliders could not move a figure.
   *
   * ⚠ THE HALF OF THE OLD RULE THAT SURVIVES, and these still pin it: the PART month is
   * left out. `usable` has already had incomplete trailing months stripped, so what is
   * seeded is whole months only. A month eight days long seeded as a whole one is a WRONG
   * figure; an empty month is a missing one, and the screen now names which.
   */
  test('🔴 a short run brings in the months it HAS, and names the ones it does not', async () => {
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const monthly = tempFile(byMonthCsv(6))

    const res = await run([bs, monthly])

    expect(res.status).toBe(200)
    expect(res.body.data.proposal.sales).toHaveLength(12)
    expect(res.body.data.provenance.sales).toBe('seeded')
    // Six real months, in order, and the rest left empty rather than invented.
    expect(res.body.data.salesSeededMonths).toBe(6)
    expect(res.body.data.proposal.sales.slice(6).every(v => v === 0)).toBe(true)
    expect(res.body.data.proposal.sales.slice(0, 6).every(v => v > 0)).toBe(true)
    // And it says so, naming both halves.
    expect(res.body.data.warnings.join(' ')).toMatch(/6 complete months/i)
    expect(res.body.data.warnings.join(' ')).toMatch(/need your figures/i)
  })

  test('🔴 a mid-year export alone seeds what it has; last year’s alongside it gives a full twelve', async () => {
    // This year stops after September, so the parser marks Sep partial and Oct–Mar empty:
    // five usable months, and the forecast needs twelve.
    const bs1 = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const alone = await run([bs1, tempFile(byMonthYear(2025, 6))])

    expect(alone.status).toBe(200)
    expect(alone.body.data.proposal.sales).toHaveLength(12)
    expect(alone.body.data.provenance.sales).toBe('seeded')
    expect(alone.body.data.salesSeededMonths).toBeGreaterThan(0)
    expect(alone.body.data.salesSeededMonths).toBeLessThan(12)
    // The part month is NOT among them — only whole months are ever seeded.
    expect(alone.body.data.proposal.sales.slice(alone.body.data.salesSeededMonths)
      .every(v => v === 0)).toBe(true)

    // Drop last year's as well and the twelve are there — Sep 2024 to Aug 2025, taken off
    // the end of a 17-month run. This is the failure the second slot exists to fix.
    const bs2 = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const both = await run([bs2, tempFile(byMonthYear(2025, 6)), tempFile(byMonthYear(2024, 12))])

    expect(both.status).toBe(200)
    expect(both.body.data.blocked).toBeNull()
    expect(both.body.data.proposal.sales).toHaveLength(12)
    expect(both.body.data.provenance.sales).toBe('seeded')
    expect(both.body.data.salesSeededMonths).toBe(12)
    // The newest usable month is August 2025 — the fifth of this year's file, 44,000 —
    // so the run ends on this year's figures and not last year's.
    expect(both.body.data.proposal.sales[11]).toBe(44000)
  })

  test('two whole by-month years join into one run, newest twelve seeding the forecast', async () => {
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const res = await run([bs, tempFile(byMonthYear(2025, 12)), tempFile(byMonthYear(2024, 12))])

    expect(res.status).toBe(200)
    expect(res.body.data.proposal.sales).toHaveLength(12)
    // 24 months in hand, so the twelve taken are this year's whole April–March.
    expect(res.body.data.proposal.sales[0]).toBe(40000)
    expect(res.body.data.proposal.sales[11]).toBe(51000)
  })

  /**
   * The volatility read needs the WHOLE run, not the twelve that seed the sales boxes.
   * Until 2026-09-03 everything else was discarded one line after being joined, so these
   * assertions are the ones that stop that quietly coming back — and a truncated history
   * would not look wrong on screen, it would just measure a shorter period than the
   * advisor was told.
   */
  test('🔴 the whole usable run reaches the screen, not only the twelve that seed the sales', async () => {
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const res = await run([bs, tempFile(byMonthYear(2025, 12)), tempFile(byMonthYear(2024, 12))])

    expect(res.status).toBe(200)
    expect(res.body.data.history).toHaveLength(24)
    // Oldest first, and it ends where the seed ends.
    expect(res.body.data.history[23].value).toBe(res.body.data.proposal.sales[11])
    // Each month carries its own date, so the screen names it rather than guessing.
    expect(typeof res.body.data.history[0].ordinal).toBe('number')
  })

  test('the run keeps the months a mid-year export cannot seed a year from', async () => {
    // Five usable months this year plus twelve last year is a 17-month run: too few to
    // seed twelve, but more than enough for the swing. The two must not be conflated.
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const res = await run([bs, tempFile(byMonthYear(2025, 6)), tempFile(byMonthYear(2024, 12))])

    expect(res.status).toBe(200)
    expect(res.body.data.history.length).toBeGreaterThan(12)
  })

  test('no by-month export means an empty run, never a partial one', async () => {
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const res = await run([bs])

    expect(res.status).toBe(200)
    expect(res.body.data.history).toEqual([])
  })

  test('a third by-month report is refused rather than silently dropped', async () => {
    const res = await run([
      tempFile(byMonthYear(2025, 12)),
      tempFile(byMonthYear(2024, 12)),
      tempFile(byMonthYear(2023, 12))
    ])

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('TOO_MANY_MONTHLY_FILES')
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
    // Seven, because the ceiling rose from four to six on 2026-09-03 (item 4.61b) when
    // last year's Balance Sheet and Profit and Loss became droppable for the trend read.
    const res = await run([
      '/no/such/a.xlsx', '/no/such/b.xlsx', '/no/such/c.xlsx', '/no/such/d.xlsx',
      '/no/such/e.xlsx', '/no/such/f.xlsx', '/no/such/g.xlsx'
    ])

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

/* ── the Fixed Asset Schedule, item 4.65 slice 1 ────────────────────────────────────── */

/**
 * A Fixed Asset Schedule as MYOB writes one, cut to four assets. Real column headings and
 * real values from MYOB_Financial_Exports.xlsx (Mike, 2026-09-07); the full eleven-asset
 * file is exercised in assetScheduleParser.test.js.
 */
const SCHEDULE_GRID = [
  ['Kinetic Test Ltd'],
  ['Asset Register Report'],
  ['Financial Year Ending 31 March 2026'],
  [],
  ['Asset Code', 'Asset Description', 'Asset Group', 'Purchase Date', 'Cost ($)', "Dep'n Rate", "Dep'n Method", 'Opening Accum Dep', "YTD Dep'n", 'Closing Carrying Value'],
  ['FA-008', '2021 Toyota HiAce Service Van', 'Motor Vehicles', '10/04/2021', 48000, '10.00%', 'Straight Line', 19200, 4800, 24000],
  ['FA-009', '2018 Ford Ranger Utility', 'Motor Vehicles', '18/09/2022', 37000, '10.00%', 'Diminishing Value', 2000, 3500, 31500],
  ['FA-010', 'High-Spec Dev Workstation', 'Office Equipment', '15/01/2023', 6500, '20.00%', 'Straight Line', 2166.67, 1300, 3033.33],
  ['FA-011', 'Reception Furniture & Displays', 'Office Equipment', '01/11/2021', 8000, '10.00%', 'Straight Line', 2450, 800, 4750],
  [null, 'TOTALS', null, null, 99500, null, null, 23816.67, 10400, 63283.33]
]

describe('the Fixed Asset Schedule reaches the forecast', () => {
  test('🔴 a schedule inside a multi-sheet workbook is found, though the sheet is third', async () => {
    // THE CASE THAT MATTERS, and the shape of both real exports: one workbook holding a
    // Profit and Loss, a Balance Sheet and a schedule. The annual reader stops at the first
    // sheet it recognises — the P&L — so without a scan that keeps going the schedule is
    // never seen and the advisor gets an empty chooser with nothing on screen to say why.
    const book = tempFile(makeMultiSheetXlsx([
      { name: 'Profit and Loss', grid: PL_GRID },
      { name: 'Balance Sheet', grid: BS_GRID },
      { name: 'Asset Register', grid: SCHEDULE_GRID }
    ]), '.xlsx')

    const res = await run([book])

    expect(res.status).toBe(200)
    expect(res.body.data.assetSchedule).not.toBeNull()
    expect(res.body.data.assetSchedule.assets).toHaveLength(4)
    expect(res.body.data.assetSchedule.totalBookValue).toBe(63283.33)
  })

  test('⚠ DOCUMENTS A DEFECT: the Balance Sheet in that same workbook is NOT read', async () => {
    // 🔴 THIS ASSERTS SOMETHING WRONG ON PURPOSE, so that fixing it breaks this test rather
    // than passing unnoticed. Found 2026-09-08 while building item 4.65 slice 1, by running
    // Mike's real exports through the route.
    //
    // `parseForecastUpload` returns the FIRST recognised report across the workbook's sheets.
    // Both real exports put the Profit and Loss first, so the Balance Sheet sitting on the
    // next sheet is ignored — and the Balance Sheet is the one REQUIRED file. An advisor
    // dropping their own MYOB or QuickBooks export is told to drop a Balance Sheet while
    // looking at the file that contains one. It fails loudly rather than silently, which is
    // the only reason this is not worse.
    //
    // NOT FIXED HERE: it is a defect in a shared reader, outside the drawing Mike approved,
    // and it is his to schedule. Reported 2026-09-08.
    const book = tempFile(makeMultiSheetXlsx([
      { name: 'Profit and Loss', grid: PL_GRID },
      { name: 'Balance Sheet', grid: BS_GRID },
      { name: 'Asset Register', grid: SCHEDULE_GRID }
    ]), '.xlsx')

    const res = await run([book])

    expect(res.body.data.blocked).toMatch(/Balance Sheet is needed/i)
  })

  test('a schedule dropped as a file of its own is read, not refused', async () => {
    // The seventh slot is exactly this. Before item 4.65 the annual reader threw
    // UNRECOGNISED_REPORT on any file it could not place, so a lone schedule was an error.
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const sched = tempFile(makeXlsx(SCHEDULE_GRID, 'Asset Register'), '.xlsx')

    const res = await run([bs, sched])

    expect(res.status).toBe(200)
    expect(res.body.data.assetSchedule.assets.map(a => a.name)).toContain('2018 Ford Ranger Utility')
    expect(res.body.data.proposal.openingBalanceSheet.cashAtBank).toBe(71000)
  })

  test('🔴 the schedule seeds NOTHING — the six categories still come from the Balance Sheet', async () => {
    // The drawing's §4, and the reason this feature is shaped as it is: neither real schedule
    // ties to its own balance sheet. A schedule allowed to seed the categories would have
    // understated fixed assets, charged too little depreciation all year, and balanced.
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const sched = tempFile(makeXlsx(SCHEDULE_GRID, 'Asset Register'), '.xlsx')

    const withSchedule = await run([bs, sched])
    const without = await run([tempFile(makeXlsx(BS_GRID), '.xlsx')])

    expect(withSchedule.body.data.proposal.assets).toEqual(without.body.data.proposal.assets)
  })

  test('🔴 the tie-back is reported and never blocks', async () => {
    // Mike's ruling, question 3, 2026-09-08. This BS_GRID carries no fixed assets at all, so
    // the schedule's 63,283.33 cannot tie — and the upload still succeeds, which is the point.
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const sched = tempFile(makeXlsx(SCHEDULE_GRID, 'Asset Register'), '.xlsx')

    const res = await run([bs, sched])

    expect(res.status).toBe(200)
    expect(res.body.data.assetSchedule.tie.available).toBe(true)
    expect(res.body.data.assetSchedule.tie.ties).toBe(false)
    expect(res.body.data.assetSchedule.tie.scheduleTotal).toBe(63283.33)
    expect(res.body.data.assetSchedule.tie.difference).toBe(-63283.33)
  })

  test('no schedule dropped leaves the field null, not an empty list', async () => {
    // Null and [] are different facts: "you dropped no schedule" versus "your schedule is
    // empty". The screen has to be able to tell them apart.
    const res = await run([tempFile(makeXlsx(BS_GRID), '.xlsx')])
    expect(res.body.data.assetSchedule).toBeNull()
  })

  test('two schedules: the first is used and the advisor is told', async () => {
    const a = tempFile(makeXlsx(SCHEDULE_GRID, 'Asset Register'), '.xlsx')
    const b = tempFile(makeXlsx(SCHEDULE_GRID, 'Asset Register'), '.xlsx')

    const res = await run([tempFile(makeXlsx(BS_GRID), '.xlsx'), a, b])

    expect(res.status).toBe(200)
    expect(res.body.data.assetSchedule.assets).toHaveLength(4)
    expect(res.body.data.warnings.join(' ')).toMatch(/more than one fixed asset schedule/i)
  })

  test('a file that is neither a report nor a schedule still fails loudly', async () => {
    // The tolerance added for a schedule-only workbook must not swallow a genuine bad file.
    const bs = tempFile(makeXlsx(BS_GRID), '.xlsx')
    const junk = tempFile('not,a,report\n1,2,3\n')

    const res = await run([bs, junk])

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body.success).toBe(false)
  })
})
