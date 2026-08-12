'use strict'

/**
 * SEEDED MEMBERSHIP MUST BE IMPOSSIBLE IN PRODUCTION, NOT MERELY UNLIKELY.
 *
 * The two middle-tier hubs are empty in development because nothing has ever filled
 * tierChain's membership map. Seeding it from a file makes them reviewable — and
 * makes a new way to get hurt, because membership decides the STORAGE SCOPE a
 * manager's saves resolve to. A seeded map in force in a real deployment could write
 * one firm's edits into a whole country's scope, and every firm in that country
 * would inherit them. That is precisely the accident the fail-closed tier design
 * exists to prevent, so the gate is what these tests are really about.
 *
 * 🔴 THE GATE IS DOUBLE, AND BOTH HALVES ARE TESTED SEPARATELY. Requiring only
 * NODE_ENV would mean a forgotten environment variable exposes it; requiring only
 * ALLOW_DEV_AUTH would mean a production box that sets it for any reason exposes it.
 * The pair is the same condition that admits the dev tokens in firmAuth — deliberately,
 * because those tokens are the ONLY identities that can reach either hub.
 *
 * The invalid-row tests matter for a quieter reason: a dropped row makes a firm
 * invisible to its managers, which is obvious. A DEFAULTED row would put that firm
 * under a group nobody chose, which is not obvious at all.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const FIXTURE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-membership-'))
const GOOD_FILE = path.join(FIXTURE_DIR, 'good.json')
const MESSY_FILE = path.join(FIXTURE_DIR, 'messy.json')
const MISSING_FILE = path.join(FIXTURE_DIR, 'nope.json')
const BROKEN_FILE = path.join(FIXTURE_DIR, 'broken.json')

fs.writeFileSync(GOOD_FILE, JSON.stringify({
  membership: {
    'firm-berlin': { globalGroup: 'Advisor-e', country: 'DE' },
    'firm-leeds': { globalGroup: 'BDO', country: 'UK' }
  }
}))

fs.writeFileSync(MESSY_FILE, JSON.stringify({
  membership: {
    'firm-ok': { globalGroup: 'Advisor-e', country: 'DE' },
    'firm-no-country': { globalGroup: 'Advisor-e' },
    'firm-empty-brand': { globalGroup: '', country: 'DE' },
    'firm-not-an-object': 'Advisor-e/DE',
    'firm-null': null
  }
}))

fs.writeFileSync(BROKEN_FILE, '{ this is not json')

/**
 * Load the module fresh with a chosen environment and fixture file.
 *
 * The module reads its path at require time and its gate at call time, so the file
 * must be chosen before the require and the environment may be set either side. The
 * registry is reset so a previous test's path cannot leak into this one.
 *
 * @param {{prod: boolean, devAuth: boolean, file: string}} opts
 * @returns {{result: object, membership: object}}
 */
function loadWith (opts) {
  jest.resetModules()

  const before = { ...process.env }
  process.env.NODE_ENV = opts.prod ? 'production' : 'test'
  if (opts.devAuth) { process.env.ALLOW_DEV_AUTH = 'true' } else { delete process.env.ALLOW_DEV_AUTH }
  process.env.FIRM_MEMBERSHIP_DEV_FILE = opts.file

  const tierChain = require('../../server/utils/tierChain')
  tierChain.setFirmMembership({})

  const { loadDevFirmMembership } = require('../../server/utils/devFirmMembership')
  const result = loadDevFirmMembership()
  const membership = tierChain.getFirmMembership()

  process.env = before
  return { result, membership }
}

describe('the gate — when seeded membership may load at all', () => {
  test('🔴 REFUSES IN PRODUCTION even with ALLOW_DEV_AUTH set and a perfectly good file', () => {
    const { result, membership } = loadWith({ prod: true, devAuth: true, file: GOOD_FILE })

    expect(result.loaded).toBe(false)
    expect(result.reason).toBe('disabled')
    // The map must be untouched, not merely unreported.
    expect(membership).toEqual({})
  })

  test('🔴 REFUSES when ALLOW_DEV_AUTH is absent, even outside production', () => {
    // A developer machine with NODE_ENV unset is the common case. Seeding there
    // without the explicit opt-in would put invented firms in front of anyone who
    // simply started the server.
    const { result, membership } = loadWith({ prod: false, devAuth: false, file: GOOD_FILE })

    expect(result.loaded).toBe(false)
    expect(result.reason).toBe('disabled')
    expect(membership).toEqual({})
  })

  test('loads only when BOTH halves of the gate agree', () => {
    const { result, membership } = loadWith({ prod: false, devAuth: true, file: GOOD_FILE })

    expect(result.loaded).toBe(true)
    expect(result.firms).toBe(2)
    expect(membership['firm-berlin']).toEqual({ globalGroup: 'Advisor-e', country: 'DE' })
    expect(membership['firm-leeds']).toEqual({ globalGroup: 'BDO', country: 'UK' })
  })
})

describe('what it does with a file it cannot use', () => {
  test('a missing file is not a fault — it is a developer who never made one', () => {
    const { result, membership } = loadWith({ prod: false, devAuth: true, file: MISSING_FILE })

    expect(result.loaded).toBe(false)
    expect(result.reason).toBe('no-file')
    expect(membership).toEqual({})
  })

  test('unparseable JSON is reported, never thrown — a bad fixture must not stop the boot', () => {
    const { result, membership } = loadWith({ prod: false, devAuth: true, file: BROKEN_FILE })

    expect(result.loaded).toBe(false)
    expect(result.reason).toMatch(/^unparseable/)
    expect(membership).toEqual({})
  })

  test('🔴 MALFORMED ROWS ARE DROPPED, NEVER DEFAULTED', () => {
    // Guessing a missing country would place that firm's manager's edits into a
    // scope nobody chose. Being invisible is the safe failure; being misfiled is not.
    const { result, membership } = loadWith({ prod: false, devAuth: true, file: MESSY_FILE })

    expect(result.loaded).toBe(true)
    expect(Object.keys(membership)).toEqual(['firm-ok'])
    expect(result.firms).toBe(1)
  })
})

describe('the file that actually ships in this repo', () => {
  test('data/dev-firm-membership.json parses and every row is usable', () => {
    // It is test data, but a typo in it produces a hub that is silently empty —
    // indistinguishable from the "not connected yet" state it is meant to relieve.
    const shipped = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../data/dev-firm-membership.json'), 'utf8')
    )

    const rows = shipped.membership
    expect(Object.keys(rows).length).toBeGreaterThan(0)

    Object.keys(rows).forEach((firmId) => {
      expect(typeof rows[firmId].globalGroup).toBe('string')
      expect(rows[firmId].globalGroup.length).toBeGreaterThan(0)
      expect(typeof rows[firmId].country).toBe('string')
      expect(rows[firmId].country.length).toBeGreaterThan(0)
    })
  })

  test('every firm it maps is a firm the dev directory actually lists', () => {
    // The two files are edited by hand and by different people at different times.
    // A firm mapped here but absent from the directory shows up on a hub as a raw
    // id with no name — the exact "one firm, two spellings" symptom.
    const membership = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../data/dev-firm-membership.json'), 'utf8')
    ).membership
    const firms = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../data/dev-firms.json'), 'utf8')
    ).firms

    const known = new Set(firms.map(f => f.id))
    Object.keys(membership).forEach(firmId => expect(known.has(firmId)).toBe(true))
  })
})
