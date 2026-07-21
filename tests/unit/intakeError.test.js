'use strict'

// intakeErrorResponse (R6, 2026-07-19) — the allowlist gate between whatever the
// intake pipeline throws and what the browser is shown. The one rule these tests
// pin: an unexpected error's message (fs errors carry the server's real temp-file
// path) must NEVER pass through; authored refusals always do.

const { intakeErrorResponse, INTAKE_STATUS } = require('../../server/report/intakeError')
const { parseCsv } = require('../../server/report/intake/csvReader')

const FALLBACK = 'The file could not be read as a Xero report export.'

describe('intakeErrorResponse — authored refusals pass through', () => {
  test('a known code keeps its code, message and mapped status', () => {
    const e = new Error('PDF files cannot be read reliably — please export as Excel or CSV')
    e.code = 'PDF_REJECTED'
    const r = intakeErrorResponse(e, FALLBACK)
    expect(r.status).toBe(415)
    expect(r.body.error.code).toBe('PDF_REJECTED')
    expect(r.body.error.message).toBe(e.message)
    expect(r.body.success).toBe(false)
    expect(typeof r.body.timestamp).toBe('string')
  })

  test('every code the intake pipeline authors is on the allowlist', () => {
    const authored = [
      'NOT_XLSX', 'CORRUPT_FILE', 'FILE_TOO_LARGE', 'TOO_MANY_PARTS',
      'PDF_REJECTED', 'UNRECOGNISED_FILE', 'UNRECOGNISED_REPORT',
      'MULTI_PERIOD_COLUMNS', 'TOO_MANY_FILES', 'WRONG_REPORT_KIND'
    ]
    for (const code of authored) { expect(typeof INTAKE_STATUS[code]).toBe('number') }
  })
})

describe('intakeErrorResponse — everything unexpected is silenced to the generic sentence', () => {
  test('an fs error NEVER leaks its server path to the client', () => {
    const e = new Error("ENOENT: no such file or directory, open 'C:\\Users\\mb\\AppData\\Local\\Temp\\upload_1234'")
    e.code = 'ENOENT'
    const r = intakeErrorResponse(e, FALLBACK)
    expect(r.status).toBe(400)
    expect(r.body.error.code).toBe('INTAKE_PARSE_FAILED')
    expect(r.body.error.message).toBe(FALLBACK)
    expect(JSON.stringify(r.body)).not.toMatch(/ENOENT|Temp|\\\\|C:/)
  })

  test('an inherited-property probe (code: "constructor") hits nothing', () => {
    const e = new Error('probe')
    e.code = 'constructor'
    const r = intakeErrorResponse(e, FALLBACK)
    expect(r.status).toBe(400)
    expect(r.body.error.code).toBe('INTAKE_PARSE_FAILED')
    expect(r.body.error.message).toBe(FALLBACK)
  })

  test('a codeless error and a missing error both degrade to the generic sentence', () => {
    expect(intakeErrorResponse(new Error('raw SQL detail'), FALLBACK).body.error.message).toBe(FALLBACK)
    expect(intakeErrorResponse(undefined, FALLBACK).body.error.message).toBe(FALLBACK)
  })

  test('a known code with an empty message still falls back (never a blank refusal)', () => {
    const e = new Error('placeholder')
    e.message = '' // constructed non-empty to satisfy lint; the empty message is the case under test
    e.code = 'PDF_REJECTED'
    const r = intakeErrorResponse(e, FALLBACK)
    expect(r.body.error.message).toBe(FALLBACK)
    expect(r.body.error.code).toBe('INTAKE_PARSE_FAILED')
  })
})

describe('csvReader cap errors joined the allowlist (their authored messages must survive R6)', () => {
  test('the row cap throws FILE_TOO_LARGE', () => {
    try {
      parseCsv('x,1\n'.repeat(6000))
      throw new Error('should have thrown')
    } catch (e) { expect(e.code).toBe('FILE_TOO_LARGE') }
  })

  test('the column cap throws FILE_TOO_LARGE', () => {
    try {
      parseCsv('x,'.repeat(300) + '1')
      throw new Error('should have thrown')
    } catch (e) { expect(e.code).toBe('FILE_TOO_LARGE') }
  })
})
