'use strict'

/**
 * Intake route guards (R14 + R15, 2026-07-20): the EBITDA intake refuses an
 * over-count upload BEFORE any file is parsed, and the batch-size 413 speaks
 * honestly about the 5 MB cap being per request ("together"), not per file.
 *
 * formidable is mocked at the module boundary so the handler can be driven
 * without real multipart plumbing. The over-count fixtures carry filepaths
 * that do not exist — if the handler ever tried to read/parse them first,
 * fs.readFileSync would ENOENT and the response would be the generic parse
 * failure, so the TOO_MANY_FILES assertions also prove the refusal ordering.
 */

jest.mock('formidable', () => ({ formidable: jest.fn() }))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { formidable } = require('formidable')
const { ebitdaDcfIntake, quickPositionIntake, threeWayForecastIntake } = require('../../server/routes/report')
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

describe('EBITDA intake — R15 file-count pre-check', () => {
  test('six files are refused with TOO_MANY_FILES before any file is parsed', async () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ filepath: '/nonexistent/upload-' + i }))
    nextParse(null, { file: six })
    const res = makeRes()
    await ebitdaDcfIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('TOO_MANY_FILES')
    // The authored message survives — a pre-parse ENOENT would have produced the generic sentence instead
    expect(res.body.error.message).toContain('up to 5 years — 6 files were sent')
  })

  test('five files pass the count gate (and fail later, on the nonexistent paths, as parse errors)', async () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ filepath: '/nonexistent/upload-' + i }))
    nextParse(null, { file: five })
    const res = makeRes()
    await ebitdaDcfIntake({}, res)
    expect(res.body.error.code).not.toBe('TOO_MANY_FILES')
  })
})

describe('intake size-cap messages — R14 (option B: cap unchanged, words honest)', () => {
  const tooBigErr = new Error('options.maxFileSize (5242880 bytes) exceeded')

  test('EBITDA batch over 5 MB → 413 saying the files TOGETHER exceed the cap', async () => {
    nextParse(tooBigErr, null)
    const res = makeRes()
    await ebitdaDcfIntake({}, res)
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
    // R14 option B is about ONE word: the cap is per REQUEST, so the message must say
    // the files "together" exceed it, never imply a per-file limit. That word is what
    // is load-bearing here — the rest of the sentence is free to change.
    expect(res.body.error.message).toMatch(/files together are larger than 5 MB/)
  })

  test('Quick Position (single file) keeps its per-file 413 wording', async () => {
    nextParse(tooBigErr, null)
    const res = makeRes()
    await quickPositionIntake({}, res)
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
    expect(res.body.error.message).toContain('The file is larger than 5 MB')
  })

  test('Three-Way Forecast batch over 5 MB → 413 saying TOGETHER, like EBITDA', async () => {
    nextParse(tooBigErr, null)
    const res = makeRes()
    await threeWayForecastIntake({}, res)
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
    expect(res.body.error.message).toContain('The files together are larger than 5 MB')
  })
})

describe('Three-Way Forecast intake — the same file-count pre-check', () => {
  // Seven, because the ceiling rose from four to six on 2026-09-03 (item 4.61b) when last
  // year's Balance Sheet and Profit and Loss became droppable for the two-year trend read.
  test('seven files are refused with TOO_MANY_FILES before any file is parsed', async () => {
    // The filepaths do not exist: had the handler read them first, the response would
    // be the generic parse failure, so this also proves the refusal ordering.
    const seven = Array.from({ length: 7 }, (_, i) => ({ filepath: '/nonexistent/upload-' + i }))
    nextParse(null, { file: seven })
    const res = makeRes()
    await threeWayForecastIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('TOO_MANY_FILES')
    expect(res.body.error.message).toContain('up to 6 files — 7 were sent')
  })

  test('four files pass the count gate — two annual reports and two by-month', async () => {
    const four = Array.from({ length: 4 }, (_, i) => ({ filepath: '/nonexistent/upload-' + i }))
    nextParse(null, { file: four })
    const res = makeRes()
    await threeWayForecastIntake({}, res)
    expect(res.body.error.code).not.toBe('TOO_MANY_FILES')
  })

  test('no file attached is refused by name', async () => {
    nextParse(null, {})
    const res = makeRes()
    await threeWayForecastIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('NO_FILE')
  })
})

/* ── one workbook, two reports — item 4.79 ──────────────────────────────────────────── */

/**
 * A real MYOB or QuickBooks export is ONE workbook holding both reports, and both put the
 * Profit and Loss first. These drive the two routes with genuine file bytes, because the
 * fault they guard against lived between the reader and the route and neither side's own
 * tests could see it: every fixture written before item 4.79 held one report per file, which
 * is how Xero exports and not how the other two packages do.
 */
const BS_GRID = [
  ['Balance Sheet'],
  ['Kinetic Test Ltd'],
  ['As at 31 March 2026'],
  [],
  ['Assets'],
  ['Bank'],
  ['Cheque Account', 120000],
  ['Total Bank', 120000],
  ['Total Assets', 120000]
]

const PL_GRID = [
  ['Profit and Loss'],
  ['Kinetic Test Ltd'],
  ['For the year ended 31 March 2026'],
  [],
  ['Income'],
  ['Sales', 500000],
  ['Total Income', 500000],
  ['Less Operating Expenses'],
  ['Rent', 24000],
  ['Total Operating Expenses', 24000]
]

/** Write a buffer somewhere the route can read it. The routes unlink what they read. */
function tempFile (buf) {
  const p = path.join(os.tmpdir(), 'intake-' + Math.random().toString(36).slice(2) + '.xlsx')
  fs.writeFileSync(p, buf)
  return { filepath: p }
}

describe('Quick Position intake — a combined workbook fills both zones', () => {
  test('🔴 one file holding a P&L and a Balance Sheet returns BOTH reports', async () => {
    // The defect this replaces: only the first report came back, so the advisor's Balance
    // Sheet went unread, the P&L zone ticked, and Continue stayed greyed out saying nothing.
    nextParse(null, {
      file: tempFile(makeMultiSheetXlsx([
        { name: 'Profit and Loss', grid: PL_GRID },
        { name: 'Balance Sheet', grid: BS_GRID }
      ]))
    })
    const res = makeRes()
    await quickPositionIntake({}, res)

    expect(res.status).toBe(200)
    expect(res.body.data.reports.map(r => r.kind)).toEqual(['profitLoss', 'balanceSheet'])
    // Read, not merely listed — this is the figure the screen could not reach before.
    expect(res.body.data.reports[1].proposals.cash.value).toBe(120000)
  })

  test('a single-report export still comes back, as a one-entry list', async () => {
    nextParse(null, { file: tempFile(makeXlsx(BS_GRID, 'Balance Sheet')) })
    const res = makeRes()
    await quickPositionIntake({}, res)

    expect(res.status).toBe(200)
    expect(res.body.data.reports).toHaveLength(1)
    expect(res.body.data.reports[0].kind).toBe('balanceSheet')
  })
})

describe('EBITDA intake — the P&L is taken from whichever sheet holds it', () => {
  test('🔴 a workbook with the Balance Sheet FIRST still reads its P&L', async () => {
    // This is the ordering that failed the whole upload with WRONG_REPORT_KIND before item
    // 4.79: the first report was a Balance Sheet, and this model reads P&L exports only.
    nextParse(null, {
      file: [tempFile(makeMultiSheetXlsx([
        { name: 'Balance Sheet', grid: BS_GRID },
        { name: 'Profit and Loss', grid: PL_GRID }
      ]))]
    })
    const res = makeRes()
    await ebitdaDcfIntake({}, res)

    expect(res.status).toBe(200)
    expect(res.body.data.files[0].kind).toBe('profitLoss')
    expect(res.body.data.files[0].year).toBe(2026)
  })

  test('⚠ a file with NO P&L in it still fails loudly, naming the position', async () => {
    // The loud refusal is unchanged — only its trigger is now right. A Balance Sheet dropped
    // on this model is still a mistake worth stopping, and it still says which file.
    nextParse(null, { file: [tempFile(makeXlsx(BS_GRID, 'Balance Sheet'))] })
    const res = makeRes()
    await ebitdaDcfIntake({}, res)

    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('WRONG_REPORT_KIND')
    expect(res.body.error.message).toContain('File 1')
  })
})
