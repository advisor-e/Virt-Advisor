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
const { ebitdaDcfIntake, quickPositionIntake, volatilityIntake } = require('../../server/routes/report')

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
    expect(res.body.error.message).toBe('The files together are larger than 5 MB — a Xero report export should be well under 1 MB each. Please export again without extra tabs or images.')
  })

  test('Quick Position (single file) keeps its per-file 413 wording', async () => {
    nextParse(tooBigErr, null)
    const res = makeRes()
    await quickPositionIntake({}, res)
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
    expect(res.body.error.message).toContain('The file is larger than 5 MB')
  })

  test('Volatility (single file) refuses over-size with the per-file wording too', async () => {
    nextParse(tooBigErr, null)
    const res = makeRes()
    await volatilityIntake({}, res)
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
    expect(res.body.error.message).toContain('The file is larger than 5 MB')
  })
})

// ── Volatility intake (item 4.54) — the by-month upload route ─────────────────

describe('volatility intake', () => {
  /** Write real bytes to a temp file and hand its path through the mocked form. */
  function uploadOf (content) {
    const filepath = path.join(os.tmpdir(), 'va-test-vol-intake-' + Date.now() + '.csv')
    fs.writeFileSync(filepath, content)
    nextParse(null, { file: { filepath } })
    return filepath
  }

  const MONTHS = ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025',
    'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025']

  test('no file attached → NO_FILE', async () => {
    nextParse(null, {})
    const res = makeRes()
    await volatilityIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('NO_FILE')
  })

  test('a real by-month CSV comes back as the monthly sales series, and the temp file is deleted', async () => {
    const csv = [
      'Profit and Loss', 'Kinetic Test Ltd', 'For the 12 months ended 31 December 2025',
      ',' + MONTHS.join(','),
      'Income', 'Sales,' + MONTHS.map((_, i) => 1000 + i).join(','),
      'Total Income,' + MONTHS.map((_, i) => 1000 + i).join(',')
    ].join('\n')
    const filepath = uploadOf(csv)
    const res = makeRes()
    await volatilityIntake({}, res)
    expect(res.status).toBe(200)
    expect(res.body.data.kind).toBe('monthlySales')
    expect(res.body.data.monthsRead).toBe(12)
    expect(res.body.data.months[0]).toEqual({ key: 'jan', year: 2025, sales: 1000 })
    // Parse-and-discard: nothing of the client's file is left on the server.
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(fs.existsSync(filepath)).toBe(false)
  })

  test('an annual (whole-period) export is refused 422 with its authored sentence — and the code only is logged', async () => {
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      uploadOf('Profit and Loss\nSecret Client Ltd\nFor the year ended 31 March 2026\nIncome\nSales,500000\nTotal Income,500000')
      const res = makeRes()
      await volatilityIntake({}, res)
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('MONTHS_INSUFFICIENT')
      expect(res.body.error.message).toContain('your accounting software')
      // Identity stays local: the client's name must never reach a log line.
      const logged = errorLog.mock.calls.map(c => c.join(' ')).join(' ')
      expect(logged).toContain('MONTHS_INSUFFICIENT')
      expect(logged).not.toContain('Secret Client')
    } finally {
      errorLog.mockRestore()
    }
  })
})
