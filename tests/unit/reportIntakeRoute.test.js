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

const { formidable } = require('formidable')
const { ebitdaDcfIntake, quickPositionIntake, threeWayForecastIntake } = require('../../server/routes/report')

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
  test('four files are refused with TOO_MANY_FILES before any file is parsed', async () => {
    // The filepaths do not exist: had the handler read them first, the response would
    // be the generic parse failure, so this also proves the refusal ordering.
    const four = Array.from({ length: 4 }, (_, i) => ({ filepath: '/nonexistent/upload-' + i }))
    nextParse(null, { file: four })
    const res = makeRes()
    await threeWayForecastIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('TOO_MANY_FILES')
    expect(res.body.error.message).toContain('up to 3 files — 4 were sent')
  })

  test('three files pass the count gate', async () => {
    const three = Array.from({ length: 3 }, (_, i) => ({ filepath: '/nonexistent/upload-' + i }))
    nextParse(null, { file: three })
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
