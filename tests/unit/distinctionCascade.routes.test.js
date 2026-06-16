'use strict'

process.env.JWT_SECRET = 'test-secret'

// Firm Manager routes for the platform-distinction cascade (decline + override).
// firmOverlay is mocked so the handlers exercise the production storage path
// (loadFirmConfig/saveFirmConfig) without a database; we assert what is persisted.

jest.mock('../../server/utils/db', () => ({ execute: jest.fn(), getConnection: jest.fn() }))
jest.mock('../../server/services/driveService', () => ({
  listFirmDocuments: jest.fn(), listBaseDocuments: jest.fn(), uploadFirmDocument: jest.fn(), downloadDocument: jest.fn(), deleteFirmDocument: jest.fn()
}))
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(), saveFirmConfig: jest.fn(), getVersionHistory: jest.fn(), restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const ADVISORY_DISTINCTIONS = require('../../data/advisory-distinctions.json')
const {
  getDistinctionState,
  setDistinctionOverride,
  resetDistinctionOverride,
  setDistinctionDecline
} = require('../../server/routes/firmManager')

const FIRM = 'firm-test-123'
const EMAIL = 'mgr@testfirm.com'
const VALID_ID = ADVISORY_DISTINCTIONS.platform[0].id // 'pd-1'
const VALID_ID_2 = ADVISORY_DISTINCTIONS.platform[1].id // 'pd-2'

function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    // Success path (res.send(status, body)) stores the object directly.
    send (status, body) { this._status = status; this._body = body },
    header () {},
    // Error path goes through sendError -> writeHead + end(JSON string).
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) {
      try { this._body = JSON.parse(body) } catch { this._body = body }
    }
  }
}

function makeReq (over = {}) {
  return { firmId: FIRM, userRole: 'firm_manager', userEmail: EMAIL, params: {}, body: {}, ...over }
}

// Make loadFirmConfig resolve a value per config key.
function stubConfig ({ own = [], declines = [], overrides = {} } = {}) {
  overlay.loadFirmConfig.mockImplementation((firmId, key) => {
    const map = {
      'advisory-distinctions': own,
      'distinction-declines': declines,
      'distinction-overrides': overrides
    }
    return Promise.resolve(map[key])
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.saveFirmConfig.mockResolvedValue(undefined)
})

describe('getDistinctionState', () => {
  it('returns own rows, declines, overrides and the resolved effective list', async () => {
    const own = [{ id: 1, domain: 'conflict', triggers: ['x'], description: 'Own', templates: ['T'], boost: 6 }]
    stubConfig({ own, declines: [VALID_ID_2], overrides: { [VALID_ID]: { boost: 9 } } })
    const res = makeRes()
    await getDistinctionState(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.declinedIds).toEqual([VALID_ID_2])
    expect(res._body.overrides).toEqual({ [VALID_ID]: { boost: 9 } })
    expect(res._body.ownRows).toEqual(own)

    const eff = res._body.effective
    expect(eff.some(r => r.id === VALID_ID_2)).toBe(false) // declined -> absent
    const overridden = eff.find(r => r.id === VALID_ID)
    expect(overridden.source).toBe('firm-override')
    expect(overridden.boost).toBe(9)
    expect(eff.find(r => r.id === 1 && r.source === 'firm-own')).toBeTruthy()
  })
})

describe('setDistinctionOverride', () => {
  it('saves a new override for a valid platform id', async () => {
    stubConfig({ overrides: {} })
    const res = makeRes()
    await setDistinctionOverride(makeReq({ params: { id: VALID_ID }, body: { boost: 12, templates: ['Custom'] } }), res)

    expect(res._status).toBe(200)
    expect(res._body).toEqual({ updated: true, id: VALID_ID })
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, 'distinction-overrides', { [VALID_ID]: { boost: 12, templates: ['Custom'] } }, EMAIL
    )
  })

  it('merges a partial edit into an existing override', async () => {
    stubConfig({ overrides: { [VALID_ID]: { boost: 9, templates: ['A'] } } })
    const res = makeRes()
    await setDistinctionOverride(makeReq({ params: { id: VALID_ID }, body: { description: 'New wording' } }), res)

    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, 'distinction-overrides',
      { [VALID_ID]: { boost: 9, templates: ['A'], description: 'New wording' } }, EMAIL
    )
  })

  it('rejects an unknown platform id with 404 and does not save', async () => {
    const res = makeRes()
    await setDistinctionOverride(makeReq({ params: { id: 'pd-999999' }, body: { boost: 5 } }), res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('rejects an empty body (no editable fields) with 400', async () => {
    stubConfig({})
    const res = makeRes()
    await setDistinctionOverride(makeReq({ params: { id: VALID_ID }, body: {} }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('NO_FIELDS')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('clamps boost into the 1-20 range', async () => {
    stubConfig({ overrides: {} })
    const res = makeRes()
    await setDistinctionOverride(makeReq({ params: { id: VALID_ID }, body: { boost: 999 } }), res)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, 'distinction-overrides', { [VALID_ID]: { boost: 20 } }, EMAIL
    )
  })

  it('never accepts id/domain from the body (identity stays pinned)', async () => {
    stubConfig({ overrides: {} })
    const res = makeRes()
    await setDistinctionOverride(makeReq({ params: { id: VALID_ID }, body: { id: 'hacked', domain: 'profit', boost: 7 } }), res)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, 'distinction-overrides', { [VALID_ID]: { boost: 7 } }, EMAIL
    )
  })
})

describe('resetDistinctionOverride', () => {
  it('removes the override for the id and keeps the others', async () => {
    stubConfig({ overrides: { [VALID_ID]: { boost: 9 }, [VALID_ID_2]: { boost: 8 } } })
    const res = makeRes()
    await resetDistinctionOverride(makeReq({ params: { id: VALID_ID } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ reset: true, id: VALID_ID })
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, 'distinction-overrides', { [VALID_ID_2]: { boost: 8 } }, EMAIL
    )
  })

  it('is idempotent and does not save when there is no override', async () => {
    stubConfig({ overrides: {} })
    const res = makeRes()
    await resetDistinctionOverride(makeReq({ params: { id: VALID_ID } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('rejects an unknown platform id with 404', async () => {
    const res = makeRes()
    await resetDistinctionOverride(makeReq({ params: { id: 'pd-999999' } }), res)
    expect(res._status).toBe(404)
  })
})

describe('setDistinctionDecline', () => {
  it('adds the id to the declined set when declined=true', async () => {
    stubConfig({ declines: [] })
    const res = makeRes()
    await setDistinctionDecline(makeReq({ params: { id: VALID_ID }, body: { declined: true } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ declined: true, id: VALID_ID })
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(FIRM, 'distinction-declines', [VALID_ID], EMAIL)
  })

  it('removes the id when declined=false (re-enable)', async () => {
    stubConfig({ declines: [VALID_ID, VALID_ID_2] })
    const res = makeRes()
    await setDistinctionDecline(makeReq({ params: { id: VALID_ID }, body: { declined: false } }), res)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(FIRM, 'distinction-declines', [VALID_ID_2], EMAIL)
  })

  it('does not duplicate an already-declined id', async () => {
    stubConfig({ declines: [VALID_ID] })
    const res = makeRes()
    await setDistinctionDecline(makeReq({ params: { id: VALID_ID }, body: { declined: true } }), res)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(FIRM, 'distinction-declines', [VALID_ID], EMAIL)
  })

  it('rejects a non-boolean declined with 400', async () => {
    const res = makeRes()
    await setDistinctionDecline(makeReq({ params: { id: VALID_ID }, body: { declined: 'yes' } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_DECLINED')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('rejects an unknown platform id with 404', async () => {
    const res = makeRes()
    await setDistinctionDecline(makeReq({ params: { id: 'pd-999999' }, body: { declined: true } }), res)
    expect(res._status).toBe(404)
  })
})
