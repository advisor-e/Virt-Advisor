'use strict'

// ⚠ PRODUCTION MODE, SET BEFORE ANY require BELOW — and that is the whole reason this
// file exists separately. firmManager captures `IS_DEV` at module load, and in dev every
// firm write falls back to a local file rather than throwing (_saveDistinctions →
// _devWriteDistinctions). So the failure under test — a real storage failure part-way
// through a cross-firm delete — CANNOT be produced in dev mode, and a test that tried
// would silently prove nothing while writing to the repo's dev JSON files.
process.env.NODE_ENV = 'production'

/**
 * A MENTOR DELETE THAT STOPS PART-WAY MUST SAY SO.
 *
 * WHAT WAS ACTUALLY WRONG — and it is NOT what the backlog said. The entry claimed "a
 * mid-way failure leaves the master row live while firms lose their overrides". Reading
 * the code disproved the loss half: promotion writes a firm's kept copy BEFORE dropping
 * that firm's override, and the master row is removed LAST, so a failure at any point
 * strands nothing. The order is deliberately fail-safe and the JSDoc says so.
 *
 * The real defect was the REPORT. Every failure returned "Could not delete distinction"
 * — a sentence meaning nothing happened — at a moment when one firm could already hold
 * its kept copy and have had its override removed. Same family as the AI-failure fix of
 * 2026-08-03: a message stating something about the system that is not true.
 *
 * The residual, accepted risk is duplication, not loss: until a retry, a promoted firm
 * can see both its kept copy and the still-live master row. Full atomicity across
 * per-firm configs was considered and rejected as a large, high-risk change to a working
 * path that already prevents the damage it would guard against.
 */

jest.mock('../../server/utils/firmOverlay', () => {
  const store = {}
  const k = (firmId, key) => `${firmId}::${key}`
  const failures = {}
  return {
    loadFirmConfig: jest.fn((firmId, key) => {
      const v = store[k(firmId, key)]
      return Promise.resolve(v === undefined ? null : v)
    }),
    saveFirmConfig: jest.fn((firmId, key, value) => {
      if (failures[k(firmId, key)]) { return Promise.reject(new Error('connection refused')) }
      store[k(firmId, key)] = value
      return Promise.resolve(1)
    }),
    listFirmIdsWithConfigKey: jest.fn(() => Promise.resolve([])),
    __store: store,
    __failOn: (firmId, key) => { failures[k(firmId, key)] = true },
    __reset: () => {
      for (const kk of Object.keys(store)) { delete store[kk] }
      for (const kk of Object.keys(failures)) { delete failures[kk] }
    }
  }
})

const overlay = require('../../server/utils/firmOverlay')
const { PLATFORM_SCOPE, PLATFORM_CONFIG_KEY } = require('../../server/utils/platformDistinctions')
const { promoteOverridesForDeletedRow } = require('../../server/routes/firmManager')
const { deleteMentorDistinction } = require('../../server/routes/mentor')

const OWN = f => `${f}::advisory-distinctions`
const OVR = f => `${f}::distinction-overrides`

const MENTOR_REQ = { userEmail: 'mentor@advisor-e.com' }

const MASTER_ROWS = [
  { id: 'pd-1', domain: 'profit', description: 'Master desc', triggers: ['m1'], templates: ['MasterT'], boost: 5 }
]

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

/**
 * Two firms both override pd-1; firm-b's kept-copy write fails. The run therefore dies
 * with firm-a fully promoted and firm-b untouched.
 */
function twoFirmsSecondFails () {
  overlay.__store[`${PLATFORM_SCOPE}::${PLATFORM_CONFIG_KEY}`] = MASTER_ROWS
  overlay.__store[OVR('firm-a')] = { 'pd-1': { description: 'A words' } }
  overlay.__store[OVR('firm-b')] = { 'pd-1': { description: 'B words' } }
  overlay.listFirmIdsWithConfigKey.mockResolvedValue(['firm-a', 'firm-b'])
  overlay.__failOn('firm-b', 'advisory-distinctions')
}

let consoleError
beforeEach(() => {
  overlay.__reset()
  jest.clearAllMocks()
  overlay.listFirmIdsWithConfigKey.mockResolvedValue([])
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { consoleError.mockRestore() })

describe('promoteOverridesForDeletedRow — the failure carries what it had already done', () => {
  test('the thrown error names the firms already promoted', async () => {
    twoFirmsSecondFails()

    let caught = null
    try {
      await promoteOverridesForDeletedRow(MASTER_ROWS[0], 'mentor@x')
    } catch (err) {
      caught = err
    }

    expect(caught).not.toBeNull()
    expect(caught.promoted).toEqual(['firm-a'])
  })

  test('the firm promoted before the failure keeps its version — nothing is stranded', async () => {
    twoFirmsSecondFails()

    await promoteOverridesForDeletedRow(MASTER_ROWS[0], 'mentor@x').catch(() => {})

    const kept = overlay.__store[OWN('firm-a')]
    expect(kept).toHaveLength(1)
    expect(kept[0].description).toBe('A words')
    expect(kept[0].keptOnMentorDelete).toBe(true)
  })
})

describe('deleteMentorDistinction — the message stops claiming nothing happened', () => {
  test('returns PARTIAL_DELETE naming how many firms already kept their copy', async () => {
    twoFirmsSecondFails()
    const res = makeMockRes()

    await deleteMentorDistinction({ ...MENTOR_REQ, params: { id: 'pd-1' } }, res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('PARTIAL_DELETE')
    expect(res._body.error.message).toContain('1 firm')
    expect(res._body.error.message).toContain('NOT removed')
    // The envelope contract is unchanged.
    expect(res._body.success).toBe(false)
    expect(typeof res._body.timestamp).toBe('string')
  })

  test('the server log names the firms, so a retry is informed rather than blind', async () => {
    twoFirmsSecondFails()

    await deleteMentorDistinction({ ...MENTOR_REQ, params: { id: 'pd-1' } }, makeMockRes())

    const logged = consoleError.mock.calls.map(c => c.join(' ')).join('\n')
    expect(logged).toContain('PART-WAY')
    expect(logged).toContain('firm-a')
  })

  test('the master row is NOT removed, so repeating the delete is safe', async () => {
    twoFirmsSecondFails()

    await deleteMentorDistinction({ ...MENTOR_REQ, params: { id: 'pd-1' } }, makeMockRes())

    // The platform scope was never written — the row the mentor asked to delete is still
    // there. This is what makes "try again" honest advice rather than a hope.
    const stillThere = overlay.__store[`${PLATFORM_SCOPE}::${PLATFORM_CONFIG_KEY}`]
    expect(stillThere.map(r => r.id)).toEqual(['pd-1'])
  })

  test('a failure BEFORE any firm was promoted still reads as "nothing happened"', async () => {
    // The honest message in the other direction: PARTIAL_DELETE here would be a false
    // alarm, and would send someone hunting for a half-finished state that never existed.
    overlay.__store[`${PLATFORM_SCOPE}::${PLATFORM_CONFIG_KEY}`] = MASTER_ROWS
    overlay.listFirmIdsWithConfigKey.mockResolvedValue([])
    overlay.__failOn(PLATFORM_SCOPE, PLATFORM_CONFIG_KEY)

    const res = makeMockRes()
    await deleteMentorDistinction({ ...MENTOR_REQ, params: { id: 'pd-1' } }, res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
  })
})
