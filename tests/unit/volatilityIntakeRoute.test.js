'use strict'

/**
 * The Volatility by-month intake route (item 4.54).
 *
 * Same harness as reportIntakeRoute.test.js: formidable is mocked at the module
 * boundary so the handler runs without real multipart plumbing. The over-count fixtures
 * carry filepaths that do not exist — so if the handler ever read them before checking
 * the count, fs.readFileSync would ENOENT and the response would be the generic parse
 * failure. The TOO_MANY_FILES assertions therefore also prove the refusal ORDER.
 *
 * What these tests are really guarding: an upload route that leaks a server path, logs a
 * client's account names, or leaves a temp file behind. None of those show up in UAT.
 */

jest.mock('formidable', () => ({ formidable: jest.fn() }))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { formidable } = require('formidable')
const { volatilityIntake } = require('../../server/routes/report')

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
function tempFileWith (content) {
  const p = path.join(os.tmpdir(), 'vol-intake-test-' + Math.random().toString(36).slice(2) + '.csv')
  fs.writeFileSync(p, content, 'utf8')
  return p
}

/** A minimal by-month CSV the parser accepts. */
const BY_MONTH_CSV = [
  'Profit and Loss',
  'Kinetic Test Ltd',
  'For the year ended 31 March 2026',
  '',
  'Account,Apr 2025,May 2025,Jun 2025,Jul 2025,Aug 2025,Sep 2025',
  'Income',
  'Sales,44000,46000,51000,43000,49000,57000',
  'Total Income,44000,46000,51000,43000,49000,57000'
].join('\n')

describe('volatility intake — file-count gate', () => {
  test('three files are refused with TOO_MANY_FILES before any file is parsed', async () => {
    const three = Array.from({ length: 3 }, (_, i) => ({ filepath: '/nonexistent/upload-' + i }))
    nextParse(null, { file: three })
    const res = makeRes()
    await volatilityIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('TOO_MANY_FILES')
    // The authored message survives — a pre-parse ENOENT would have given the generic one.
    expect(res.body.error.message).toContain('up to 2 accounts files — 3 were sent')
  })

  test('two files pass the count gate', async () => {
    const two = Array.from({ length: 2 }, (_, i) => ({ filepath: '/nonexistent/upload-' + i }))
    nextParse(null, { file: two })
    const res = makeRes()
    await volatilityIntake({}, res)
    expect(res.body.error.code).not.toBe('TOO_MANY_FILES')
  })

  test('no files attached → NO_FILE', async () => {
    nextParse(null, {})
    const res = makeRes()
    await volatilityIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('NO_FILE')
  })

  test('a single file arriving unwrapped (not an array) is accepted', async () => {
    const p = tempFileWith(BY_MONTH_CSV)
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await volatilityIntake({}, res)
    expect(res.status).toBe(200)
    expect(res.body.data.usable).toHaveLength(6)
  })
})

describe('volatility intake — the happy path', () => {
  test('returns the joined series, what is usable, and what was set aside', async () => {
    const p = tempFileWith(BY_MONTH_CSV)
    nextParse(null, { file: [{ filepath: p }] })
    const res = makeRes()
    await volatilityIntake({}, res)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.usable.map(m => m.value)).toEqual([44000, 46000, 51000, 43000, 49000, 57000])
    expect(res.body.data.setAside).toEqual([])
    expect(res.body.data.files[0].monthsRead).toBe(6)
    expect(typeof res.body.timestamp).toBe('string')
  })

  test('the temp file is deleted whether the parse succeeds or fails', async () => {
    // The route deletes with fs.unlink(path, () => {}) — fire-and-forget, as the other two
    // intakes do — so the file can outlive the handler by a tick. Wait for it to go rather
    // than racing it; the point of the test is that it goes, not when.
    const gone = async (p) => {
      for (let i = 0; i < 50 && fs.existsSync(p); i++) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      return !fs.existsSync(p)
    }

    const ok = tempFileWith(BY_MONTH_CSV)
    nextParse(null, { file: [{ filepath: ok }] })
    await volatilityIntake({}, makeRes())
    expect(await gone(ok)).toBe(true)

    const bad = tempFileWith('Profit and Loss\nCo\nFor the year ended 31 March 2026\n\nIncome\nSales,500000')
    nextParse(null, { file: [{ filepath: bad }] })
    await volatilityIntake({}, makeRes())
    expect(await gone(bad)).toBe(true)
  })
})

describe('volatility intake — refusals stay safe', () => {
  test('the whole-year P&L is refused by name with NOT_BY_MONTH', async () => {
    const p = tempFileWith('Profit and Loss\nKinetic Test Ltd\nFor the year ended 31 March 2026\n\nIncome\nSales,500000\nTotal Income,500000')
    nextParse(null, { file: [{ filepath: p }] })
    const res = makeRes()
    await volatilityIntake({}, res)
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('NOT_BY_MONTH')
    expect(res.body.error.message).toMatch(/Current financial year by month/)
  })

  test('an unreadable file returns the generic sentence — never a server path', async () => {
    nextParse(null, { file: [{ filepath: '/nonexistent/upload-x' }] })
    const res = makeRes()
    await volatilityIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INTAKE_PARSE_FAILED')
    expect(res.body.error.message).toBe('The file could not be read as a by-month Xero export.')
    // The ENOENT message carries the path; it must not survive into the response.
    expect(JSON.stringify(res.body)).not.toMatch(/nonexistent/)
  })

  test('an oversize batch → 413 saying the files TOGETHER exceed the cap', async () => {
    nextParse(new Error('options.maxFileSize (5242880 bytes) exceeded'), null)
    const res = makeRes()
    await volatilityIntake({}, res)
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
    expect(res.body.error.message).toMatch(/together are larger than 5 MB/)
  })

  test('a non-size multipart failure → 400 UPLOAD_PARSE_FAILED', async () => {
    nextParse(new Error('unexpected end of form'), null)
    const res = makeRes()
    await volatilityIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('UPLOAD_PARSE_FAILED')
  })

  test('nothing client-identifying is logged — only the stable code', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const p = tempFileWith('Profit and Loss\nAcme Joinery Ltd\nFor the year ended 31 March 2026\n\nIncome\nSales,500000')
    nextParse(null, { file: [{ filepath: p }] })
    await volatilityIntake({}, makeRes())

    const logged = spy.mock.calls.map(c => c.join(' ')).join(' | ')
    expect(logged).toContain('NOT_BY_MONTH')
    expect(logged).not.toMatch(/Acme Joinery/)
    expect(logged).not.toMatch(/vol-intake-test/) // not the filename either
    spy.mockRestore()
  })
})
