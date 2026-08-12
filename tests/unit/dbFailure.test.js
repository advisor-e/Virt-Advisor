'use strict'

/**
 * The guard that stops a refused save from being reported as a success.
 *
 * The case that matters most is the foreign-key rejection: every management
 * tier needs its reserved row in `firms`, and without it MySQL refuses each
 * save with errno 1452 / sqlState '23000'. Before this guard the dev fallback
 * read that as "no database", wrote the content to a gitignored scratch file
 * and told the caller it had saved. That row is asserted by name below,
 * because it is the specific failure this module was written for.
 */

const { isDatabaseRefusal, devFallbackAllowed } = require('../../server/utils/dbFailure')

/** A rejection as mysql2 surfaces it — a server answered and said no. */
function serverRefusal (code, errno, sqlState) {
  const e = new Error(code)
  e.code = code
  e.errno = errno
  e.sqlState = sqlState
  return e
}

/** A connection failure as mysql2 surfaces it — nothing ever answered. */
function connectionFailure (code) {
  const e = new Error(code)
  e.code = code
  return e
}

describe('isDatabaseRefusal — did a live server refuse this?', () => {
  test('🔴 the missing reserved-row foreign-key error IS a refusal', () => {
    const err = serverRefusal('ER_NO_REFERENCED_ROW_2', 1452, '23000')
    expect(isDatabaseRefusal(err)).toBe(true)
  })

  test.each([
    ['ER_DUP_ENTRY', 1062, '23000'],
    ['ER_NO_SUCH_TABLE', 1146, '42S02'],
    ['ER_DATA_TOO_LONG', 1406, '22001'],
    ['ER_PARSE_ERROR', 1064, '42000']
  ])('%s is a refusal', (code, errno, sqlState) => {
    expect(isDatabaseRefusal(serverRefusal(code, errno, sqlState))).toBe(true)
  })

  test.each([
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'PROTOCOL_CONNECTION_LOST'
  ])('%s is NOT a refusal — nothing answered', (code) => {
    expect(isDatabaseRefusal(connectionFailure(code))).toBe(false)
  })

  test('a bare Error is not a refusal — this is what the dev-fallback tests throw', () => {
    expect(isDatabaseRefusal(new Error('no db in this test'))).toBe(false)
  })

  test.each([[null], [undefined], ['a string'], [0], [{}], [{ sqlState: '' }], [{ sqlState: 23000 }]])(
    'survives a non-error value: %p',
    (value) => {
      expect(isDatabaseRefusal(value)).toBe(false)
    }
  )

  test('code alone cannot decide it — both kinds carry a code', () => {
    expect(connectionFailure('ECONNREFUSED').code).toBeDefined()
    expect(serverRefusal('ER_NO_REFERENCED_ROW_2', 1452, '23000').code).toBeDefined()
  })
})

describe('devFallbackAllowed — may the scratch file be used?', () => {
  const original = process.env.NODE_ENV

  afterEach(() => {
    if (original === undefined) { delete process.env.NODE_ENV } else { process.env.NODE_ENV = original }
  })

  test('🔴 NO when the server refused — even outside production', () => {
    process.env.NODE_ENV = 'development'
    expect(devFallbackAllowed(serverRefusal('ER_NO_REFERENCED_ROW_2', 1452, '23000'))).toBe(false)
  })

  test('🔴 NO in a UAT-shaped environment either — the value is not the point', () => {
    process.env.NODE_ENV = 'uat'
    expect(devFallbackAllowed(serverRefusal('ER_NO_REFERENCED_ROW_2', 1452, '23000'))).toBe(false)
  })

  test('YES when nothing answered and we are not in production', () => {
    process.env.NODE_ENV = 'development'
    expect(devFallbackAllowed(connectionFailure('ECONNREFUSED'))).toBe(true)
  })

  test('YES with NODE_ENV unset — a developer machine with no MySQL', () => {
    delete process.env.NODE_ENV
    expect(devFallbackAllowed(new Error('no db in this test'))).toBe(true)
  })

  test('NEVER in production, whatever the failure', () => {
    process.env.NODE_ENV = 'production'
    expect(devFallbackAllowed(connectionFailure('ECONNREFUSED'))).toBe(false)
    expect(devFallbackAllowed(new Error('anything'))).toBe(false)
  })
})
