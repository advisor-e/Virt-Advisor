'use strict'

/**
 * The mentor's Outcome Learning routes (4.87 T024/T025).
 *
 * What UAT cannot see: a decision signed with a body-supplied name, a `live` decision that
 * slips under the floor, a page load that quietly burns the decision history, and a
 * recompute that takes longer than the page-render rule allows at scale.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))
jest.mock('../../server/utils/templateLibrary', () => ({ loadEffectiveTemplates: jest.fn() }))

const overlay = require('../../server/utils/firmOverlay')
const { loadEffectiveTemplates } = require('../../server/utils/templateLibrary')
const routes = require('../../server/routes/outcomeLearning')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { DECISIONS_KEY, POOL_PREFIX } = require('../../server/utils/outcomeLearning')

const MENTOR = 'mentor@advisor-e.example'
const LIB = [{ title: 'Break-even Analysis' }, { title: 'Cashflow Forecast' }]

function makeRes () {
  return {
    headersSent: false,
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status },
    end (json) { this._body = JSON.parse(json) }
  }
}

const req = (over = {}) => ({ userEmail: MENTOR, body: {}, ...over })

/** `firms` distinct tokens, `cases` rows, `less` of them marked less on one template. */
function pool ({ firms, cases, less, title = 'Break-even Analysis', prefix = 't' }) {
  const rows = {}
  for (let i = 0; i < cases; i++) {
    rows[prefix + (i % firms) + ':c' + i] = {
      v: 1,
      month: '2026-09',
      domain: 'profit',
      primaryIssue: null,
      industry: null,
      signals: [],
      engagementType: 'advice',
      staircaseStep: null,
      templates: [{ title, used: 'full', outcome: i < less ? 'less' : 'well' }]
    }
  }
  return rows
}

const ID = 'break-even-analysis|domain|profit'

beforeEach(() => {
  jest.clearAllMocks()
  loadEffectiveTemplates.mockResolvedValue(LIB)
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.loadFirmConfigsByPrefix.mockResolvedValue({})
  overlay.saveFirmConfig.mockResolvedValue(1)
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => { console.error.mockRestore() })

describe('list', () => {
  test('recomputes from the pool at the platform scope and returns counts, floor, cap, adjustments, benches', async () => {
    overlay.loadFirmConfigsByPrefix.mockResolvedValue(pool({ firms: 6, cases: 31, less: 12 }))
    overlay.loadFirmConfig.mockResolvedValue({ decisions: {}, lastRecomputeAt: '2026-09-10T00:00:00Z', benches: { fixed: { before: 0.6, after: 0.66 } } })
    const res = makeRes()
    await routes.list(req(), res)
    expect(overlay.loadFirmConfigsByPrefix).toHaveBeenCalledWith(PLATFORM_SCOPE, POOL_PREFIX)
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith(PLATFORM_SCOPE, DECISIONS_KEY)
    expect(res._status).toBe(200)
    expect(res._body).toMatchObject({
      success: true,
      firms: 6,
      cases: 31,
      lastRecomputeAt: '2026-09-10T00:00:00Z',
      floor: { minFirms: 5, minCases: 25 },
      capMax: 10,
      benches: { fixed: { before: 0.6, after: 0.66 } },
      orphaned: []
    })
    expect(res._body.adjustments.find(a => a.id === ID)).toMatchObject({ delivered: 31, less: 12, holdBack: 4, state: 'proposed' })
  })

  test('a page load never writes a version', async () => {
    overlay.loadFirmConfigsByPrefix.mockResolvedValue(pool({ firms: 6, cases: 31, less: 12 }))
    await routes.list(req(), makeRes())
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('falls back to the committed seed titles when no library is uploaded', async () => {
    loadEffectiveTemplates.mockResolvedValue(null)
    overlay.loadFirmConfigsByPrefix.mockResolvedValue(pool({ firms: 6, cases: 31, less: 12, title: 'Not In Any Library' }))
    const res = makeRes()
    await routes.list(req(), res)
    expect(res._body.adjustments).toEqual([])
    expect(res._body.orphaned.map(a => a.id)).toContain('not-in-any-library|domain|profit')
  })

  test('a malformed decisions row reads as empty, never as a guess', async () => {
    overlay.loadFirmConfig.mockResolvedValue(['not', 'a', 'row'])
    const res = makeRes()
    await routes.list(req(), res)
    expect(res._body).toMatchObject({ firms: 0, cases: 0, lastRecomputeAt: null, benches: null, adjustments: [] })
    overlay.loadFirmConfig.mockResolvedValue({ decisions: [1], lastRecomputeAt: 5, benches: 'x' })
    const res2 = makeRes()
    await routes.list(req(), res2)
    expect(res2._body).toMatchObject({ lastRecomputeAt: null, benches: null })
  })

  test('the empty pool: no firms, no cases, no adjustments', async () => {
    const res = makeRes()
    await routes.list(req(), res)
    expect(res._body).toMatchObject({ success: true, firms: 0, cases: 0, adjustments: [], orphaned: [] })
    overlay.loadFirmConfigsByPrefix.mockResolvedValue(null)
    const res2 = makeRes()
    await routes.list(req(), res2)
    expect(res2._body).toMatchObject({ success: true, firms: 0, cases: 0, adjustments: [] })
  })

  test('a store failure returns the safe error shape', async () => {
    overlay.loadFirmConfigsByPrefix.mockRejectedValue(new Error('ECONNREFUSED 10.0.0.1:3306'))
    const res = makeRes()
    await routes.list(req(), res)
    expect(res._status).toBe(500)
    expect(res._body).toMatchObject({ success: false, error: { code: 'DB_ERROR' } })
    expect(JSON.stringify(res._body)).not.toContain('10.0.0.1')
  })

  test('a 10,000-row pool across 50 firms recomputes inside the 2000 ms page rule', async () => {
    overlay.loadFirmConfigsByPrefix.mockResolvedValue(pool({ firms: 50, cases: 10000, less: 3000 }))
    const res = makeRes()
    const started = Date.now()
    await routes.list(req(), res)
    expect(Date.now() - started).toBeLessThan(2000)
    expect(res._body).toMatchObject({ firms: 50, cases: 10000 })
    expect(res._body.adjustments.find(a => a.id === ID)).toMatchObject({ delivered: 10000, less: 3000, holdBack: 3, meetsFloor: true })
  })
})

describe('recomputeNow', () => {
  test('persists lastRecomputeAt on the decisions row, keeping decisions and benches, signed by the token', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ decisions: { [ID]: { state: 'held' } }, lastRecomputeAt: 'old', benches: { fixed: {} } })
    const res = makeRes()
    await routes.recomputeNow(req(), res)
    expect(overlay.saveFirmConfig).toHaveBeenCalledTimes(1)
    const [scope, key, value, by] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(PLATFORM_SCOPE)
    expect(key).toBe(DECISIONS_KEY)
    expect(by).toBe(MENTOR)
    expect(value.decisions).toEqual({ [ID]: { state: 'held' } })
    expect(value.benches).toEqual({ fixed: {} })
    expect(value.lastRecomputeAt).not.toBe('old')
    expect(res._body.lastRecomputeAt).toBe(value.lastRecomputeAt)
  })

  test('a store failure returns the safe error shape', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('boom'))
    const res = makeRes()
    await routes.recomputeNow(req(), res)
    expect(res._status).toBe(500)
    expect(res._body).toMatchObject({ success: false, error: { code: 'DB_ERROR' } })
  })
})

describe('decision', () => {
  const withPool = spec => overlay.loadFirmConfigsByPrefix.mockResolvedValue(pool(spec))

  test('writes by and at from the token, never the body, and keeps the template with the decision', async () => {
    withPool({ firms: 6, cases: 31, less: 12 })
    overlay.loadFirmConfig.mockResolvedValue({ decisions: { other: { state: 'held' } }, lastRecomputeAt: 'kept', benches: null })
    const res = makeRes()
    await routes.decision(req({ body: { id: ID, state: 'live', reason: 'Strong evidence', by: 'impostor@x', at: '1999' } }), res)
    expect(res._status).toBe(200)
    const [scope, key, value, by] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(PLATFORM_SCOPE)
    expect(key).toBe(DECISIONS_KEY)
    expect(by).toBe(MENTOR)
    expect(value.lastRecomputeAt).toBe('kept')
    expect(value.decisions.other).toEqual({ state: 'held' })
    expect(value.decisions[ID]).toMatchObject({ state: 'live', by: MENTOR, reason: 'Strong evidence', template: 'Break-even Analysis', dimension: 'domain', value: 'profit' })
    expect(value.decisions[ID].by).not.toBe('impostor@x')
    expect(value.decisions[ID].at).not.toBe('1999')
    expect(res._body.decision).toMatchObject({ id: ID, state: 'live', by: MENTOR })
  })

  test('refuses live below the floor with 400 OUTCOME_BELOW_FLOOR and writes nothing', async () => {
    withPool({ firms: 4, cases: 31, less: 12 })
    const res = makeRes()
    await routes.decision(req({ body: { id: ID, state: 'live' } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('OUTCOME_BELOW_FLOOR')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('held and rejected are allowed below the floor', async () => {
    withPool({ firms: 4, cases: 31, less: 12 })
    for (const body of [{ id: ID, state: 'held' }, { id: ID, state: 'rejected', reason: 'not this one' }]) {
      const res = makeRes()
      await routes.decision(req({ body }), res)
      expect(res._status).toBe(200)
    }
    expect(overlay.saveFirmConfig).toHaveBeenCalledTimes(2)
  })

  // Mike's ruling of 2026-09-10: required to reject, optional to hold. Refused on the backend
  // so no screen can reject without one.
  test.each([['missing', undefined], ['blank', '   ']])('refuses a rejection with a %s reason before reading anything', async (_l, reason) => {
    const res = makeRes()
    await routes.decision(req({ body: { id: ID, state: 'rejected', reason } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_DECISION')
    expect(overlay.loadFirmConfigsByPrefix).not.toHaveBeenCalled()
  })

  test('refuses live on an orphaned adjustment', async () => {
    withPool({ firms: 6, cases: 31, less: 12, title: 'Gone Template' })
    const res = makeRes()
    await routes.decision(req({ body: { id: 'gone-template|domain|profit', state: 'live' } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('OUTCOME_ORPHANED')
  })

  test('refuses an unknown id with 404', async () => {
    withPool({ firms: 6, cases: 31, less: 12 })
    const res = makeRes()
    await routes.decision(req({ body: { id: 'nothing|domain|here', state: 'held' } }), res)
    expect(res._status).toBe(404)
    expect(res._body.error.code).toBe('OUTCOME_UNKNOWN_ID')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test.each([
    ['a missing id', { state: 'live' }],
    ['a blank id', { id: '  ', state: 'live' }],
    ['an unknown state', { id: ID, state: 'maybe' }],
    ['a reason that is not a string', { id: ID, state: 'held', reason: 7 }],
    ['a reason over 500', { id: ID, state: 'held', reason: 'x'.repeat(501) }],
    ['no body at all', undefined]
  ])('refuses %s with 400 INVALID_DECISION before reading anything', async (_label, body) => {
    const res = makeRes()
    await routes.decision(req({ body }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_DECISION')
    expect(overlay.loadFirmConfigsByPrefix).not.toHaveBeenCalled()
  })

  test('a reason is optional and a missing email is stored as null', async () => {
    withPool({ firms: 6, cases: 31, less: 12 })
    const res = makeRes()
    await routes.decision(req({ userEmail: undefined, body: { id: ID, state: 'held' } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig.mock.calls[0][2].decisions[ID]).toMatchObject({ reason: '', by: null })
  })

  test('a store failure returns the safe error shape', async () => {
    withPool({ firms: 6, cases: 31, less: 12 })
    overlay.saveFirmConfig.mockRejectedValue(new Error('boom'))
    const res = makeRes()
    await routes.decision(req({ body: { id: ID, state: 'held' } }), res)
    expect(res._status).toBe(500)
    expect(res._body).toMatchObject({ success: false, error: { code: 'DB_ERROR' } })
  })
})

describe('history and restore', () => {
  test('history reads the decisions row at the platform scope', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 3, version: 3, is_active: 1 }])
    const res = makeRes()
    await routes.history(req(), res)
    expect(overlay.getVersionHistory).toHaveBeenCalledWith(PLATFORM_SCOPE, DECISIONS_KEY)
    expect(res._body).toEqual({ success: true, versions: [{ id: 3, version: 3, is_active: 1 }] })
  })

  test('history store failure is the safe error shape', async () => {
    overlay.getVersionHistory.mockRejectedValue(new Error('boom'))
    const res = makeRes()
    await routes.history(req(), res)
    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
  })

  test('restore calls the store with the platform scope, the key and the version', async () => {
    overlay.restoreVersion.mockResolvedValue(4)
    const res = makeRes()
    await routes.restore(req({ body: { versionId: 2 } }), res)
    expect(overlay.restoreVersion).toHaveBeenCalledWith(PLATFORM_SCOPE, DECISIONS_KEY, 2)
    expect(res._body).toEqual({ success: true })
  })

  test.each([[undefined], [null], ['']])('restore refuses a missing versionId (%p)', async (versionId) => {
    const res = makeRes()
    await routes.restore(req({ body: { versionId } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('MISSING_VERSION')
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })

  test('restore with no body at all is a 400, not a crash', async () => {
    const res = makeRes()
    await routes.restore(req({ body: undefined }), res)
    expect(res._status).toBe(400)
  })

  test('restore store failure is the safe error shape', async () => {
    overlay.restoreVersion.mockRejectedValue(new Error('Version not found'))
    const res = makeRes()
    await routes.restore(req({ body: { versionId: 99 } }), res)
    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
  })
})

describe('exportLive', () => {
  test('returns only live adjustments with a hold-back, in the resolver shape', async () => {
    overlay.loadFirmConfigsByPrefix.mockResolvedValue(Object.assign(
      pool({ firms: 6, cases: 31, less: 12 }),
      pool({ firms: 6, cases: 30, less: 10, title: 'Cashflow Forecast', prefix: 'u' })
    ))
    overlay.loadFirmConfig.mockResolvedValue({
      decisions: {
        [ID]: { state: 'live' },
        'cashflow-forecast|domain|profit': { state: 'held' },
        'break-even-analysis|engagementType|advice': { state: 'rejected' }
      }
    })
    const res = makeRes()
    await routes.exportLive(req(), res)
    expect(res._status).toBe(200)
    expect(res._body.adjustments).toEqual([
      { id: ID, template: 'Break-even Analysis', dimension: 'domain', value: 'profit', holdBack: expect.any(Number), firms: expect.any(Number), cases: expect.any(Number) }
    ])
    expect(res._body.adjustments[0].holdBack).toBeGreaterThan(0)
  })

  test('a store failure returns the safe error shape', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('boom'))
    const res = makeRes()
    await routes.exportLive(req(), res)
    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
  })
})

describe('recomputeAndPersist, for the withdraw route', () => {
  test('is exported, saves once at the platform scope, and returns the recomputed result', async () => {
    overlay.loadFirmConfigsByPrefix.mockResolvedValue(pool({ firms: 6, cases: 31, less: 12 }))
    const result = await routes.recomputeAndPersist('manager@firm.example')
    expect(overlay.saveFirmConfig).toHaveBeenCalledTimes(1)
    expect(overlay.saveFirmConfig.mock.calls[0][0]).toBe(PLATFORM_SCOPE)
    expect(overlay.saveFirmConfig.mock.calls[0][3]).toBe('manager@firm.example')
    expect(result).toMatchObject({ firms: 6, cases: 31 })
    expect(typeof result.lastRecomputeAt).toBe('string')
  })
})
