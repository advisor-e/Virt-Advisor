'use strict'

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

/**
 * Route tests for the Domain Support endpoints, pinning the 2026-07-30 P1 fix:
 * these routes must store the firm's edits in the SINGLE `domain-support` bundle
 * the advisor and course engines read (firmContent.CONFIG_KEYS.domainSupport),
 * not the per-domain `domain-support-<id>` keys they used before.
 *
 * The test that earns its keep is the first one in the save block. Until the fix
 * a save landed under a config key no reader ever selects, and the dev-file
 * fallback hid it completely — both sides fall back to the SAME gitignored JSON,
 * so a saved edit did reach the AI in development and only diverged once MySQL
 * was provisioned. The screen would have said "saved" while the firm's content
 * never reached the AI, with nothing raising an error. A key assertion is the
 * only thing that can catch that; a behavioural test in dev cannot see it.
 */

jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn()
}))
jest.mock('../../server/services/driveService', () => ({
  listFirmDocuments: jest.fn(),
  listBaseDocuments: jest.fn(),
  uploadFirmDocument: jest.fn(),
  downloadDocument: jest.fn(),
  deleteFirmDocument: jest.fn()
}))
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const db = require('../../server/utils/db')
const {
  getDomainSupport,
  getDomainSupportDetail,
  saveDomainSupport,
  resetDomainSupport,
  getDomainSupportHistory,
  restoreDomainSupport
} = require('../../server/routes/firmManager')

// The key the engines read. Hardcoded on purpose: importing the constant would
// let a rename slip past both sides at once, which is the whole failure here.
const ENGINE_KEY = 'domain-support'

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body }
  }
}

function makeReq (overrides = {}) {
  return { firmId: 'firm-test-123', userRole: 'firm_manager', userEmail: 'mgr@testfirm.com', params: {}, ...overrides }
}

beforeEach(() => {
  jest.clearAllMocks()
  // No firm override by default → every domain reads as platform.
  overlay.loadFirmConfig.mockResolvedValue(null)
})

describe('GET /domain-support (list)', () => {
  test('reads the whole bundle in ONE store call, not one per domain', async () => {
    const res = makeMockRes()
    await getDomainSupport(makeReq(), res)
    expect(res._status).toBe(200)
    // Two reads only: the section-placement map and the override bundle. Before
    // the fix this was one call per domain (~36 round-trips to draw one screen).
    const contentReads = overlay.loadFirmConfig.mock.calls.filter(c => c[1] === ENGINE_KEY)
    expect(contentReads).toHaveLength(1)
  })

  test('a domain the firm has overridden reads as firm origin', async () => {
    overlay.loadFirmConfig.mockImplementation((firmId, key) =>
      key === ENGINE_KEY ? Promise.resolve({ eoy: { overview: 'Firm wording' } }) : Promise.resolve(null))
    const res = makeMockRes()
    await getDomainSupport(makeReq(), res)
    const eoy = res._body.doTheJob.find(d => d.id === 'eoy')
    expect(eoy.origin).toBe('firm')
    expect(eoy.hasOverride).toBe(true)
    // A domain the firm has NOT touched stays platform.
    expect(res._body.doTheJob.find(d => d.id === 'profit').origin).toBe('platform')
  })
})

describe('GET /domain-support/:domainId (detail)', () => {
  test('merges the firm\'s entry from the bundle over the platform base', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ eoy: { overview: 'FIRM OVERVIEW' } })
    const res = makeMockRes()
    await getDomainSupportDetail(makeReq({ params: { domainId: 'eoy' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.overview).toBe('FIRM OVERVIEW')
    expect(Array.isArray(res._body.materials)).toBe(true) // platform content survives the merge
  })
})

describe('POST /domain-support/:domainId (save)', () => {
  test('saves under the SINGLE config key the engine reads', async () => {
    overlay.saveFirmConfig.mockResolvedValue(3)
    const res = makeMockRes()
    await saveDomainSupport(makeReq({ params: { domainId: 'eoy' }, body: { materials: [] } }), res)

    expect(res._status).toBe(200)
    expect(res._body).toMatchObject({ saved: true, version: 3, domainId: 'eoy' })
    const [firmId, key, map] = overlay.saveFirmConfig.mock.calls[0]
    expect(firmId).toBe('firm-test-123')
    // The regression: 'domain-support-eoy' would pass every behavioural test in
    // dev and never reach the AI in production.
    expect(key).toBe(ENGINE_KEY)
    expect(map).toHaveProperty('eoy')
  })

  test('saving one domain leaves the other domains\' edits in the bundle', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ profit: { overview: 'Profit wording' } })
    overlay.saveFirmConfig.mockResolvedValue(4)
    const res = makeMockRes()
    await saveDomainSupport(makeReq({ params: { domainId: 'eoy' }, body: { materials: [{ name: 'X' }] } }), res)

    const map = overlay.saveFirmConfig.mock.calls[0][2]
    expect(map.eoy.materials).toHaveLength(1)
    expect(map.profit).toEqual({ overview: 'Profit wording' }) // untouched
  })

  test('a seller-facing support file (no row in domains.json) still saves', async () => {
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveDomainSupport(makeReq({ params: { domainId: 'get-sales' }, body: { materials: [] } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig.mock.calls[0][2]).toHaveProperty('get-sales')
  })

  test('an unknown domain id is a clean 404 and writes nothing', async () => {
    const res = makeMockRes()
    await saveDomainSupport(makeReq({ params: { domainId: 'no-such-domain' }, body: {} }), res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a prototype key is refused, never written as a bundle key', async () => {
    // The id is now an object key rather than part of a config_key string, so an
    // unchecked `__proto__` would assign the map's prototype instead of storing
    // an override.
    for (const hostile of ['__proto__', 'constructor', 'prototype']) {
      const res = makeMockRes()
      await saveDomainSupport(makeReq({ params: { domainId: hostile }, body: { materials: [] } }), res)
      expect(res._status).toBe(404)
    }
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('DELETE /domain-support/:domainId (reset)', () => {
  test('drops just that domain from the bundle and keeps the rest', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ eoy: { overview: 'a' }, profit: { overview: 'b' } })
    overlay.saveFirmConfig.mockResolvedValue(5)
    const res = makeMockRes()
    await resetDomainSupport(makeReq({ params: { domainId: 'eoy' } }), res)

    expect(res._status).toBe(200)
    expect(res._body).toMatchObject({ reset: true, domainId: 'eoy' })
    const map = overlay.saveFirmConfig.mock.calls[0][2]
    expect(map).not.toHaveProperty('eoy')
    expect(map).toHaveProperty('profit')
  })

  test('resetting a domain the firm never edited is a clean no-op', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    const res = makeMockRes()
    await resetDomainSupport(makeReq({ params: { domainId: 'eoy' } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('GET /domain-support/:domainId/history', () => {
  test('reads the shared bundle key, not a per-domain key', async () => {
    db.execute.mockResolvedValue([[{ version: 2, saved_by: 'a@b.com', created_at: '2026-07-29' }]])
    const res = makeMockRes()
    await getDomainSupportHistory(makeReq({ params: { domainId: 'eoy' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.history).toHaveLength(1)
    expect(db.execute.mock.calls[0][1]).toEqual(['firm-test-123', ENGINE_KEY])
  })
})

describe('POST /domain-support/:domainId/restore', () => {
  test('restores ONE domain without rolling the others back', async () => {
    // Version 2 held an older EOY and an older Profit; today both have moved on.
    db.execute.mockResolvedValue([[{ config_json: JSON.stringify({ eoy: { overview: 'OLD EOY' }, profit: { overview: 'OLD PROFIT' } }) }]])
    overlay.loadFirmConfig.mockResolvedValue({ eoy: { overview: 'NEW EOY' }, profit: { overview: 'NEW PROFIT' } })
    overlay.saveFirmConfig.mockResolvedValue(9)

    const res = makeMockRes()
    await restoreDomainSupport(makeReq({ params: { domainId: 'eoy' }, body: { version: 2 } }), res)

    expect(res._status).toBe(200)
    const map = overlay.saveFirmConfig.mock.calls[0][2]
    expect(map.eoy).toEqual({ overview: 'OLD EOY' }) // rolled back
    expect(map.profit).toEqual({ overview: 'NEW PROFIT' }) // NOT rolled back
  })

  test('restoring to a version where the domain had no override clears it', async () => {
    db.execute.mockResolvedValue([[{ config_json: JSON.stringify({ profit: { overview: 'OLD PROFIT' } }) }]])
    overlay.loadFirmConfig.mockResolvedValue({ eoy: { overview: 'NEW EOY' }, profit: { overview: 'NEW PROFIT' } })
    overlay.saveFirmConfig.mockResolvedValue(10)

    const res = makeMockRes()
    await restoreDomainSupport(makeReq({ params: { domainId: 'eoy' }, body: { version: 1 } }), res)

    const map = overlay.saveFirmConfig.mock.calls[0][2]
    expect(map).not.toHaveProperty('eoy') // back to the platform default, not invented
    expect(map).toHaveProperty('profit')
  })

  test('a non-numeric version is a clean 400', async () => {
    const res = makeMockRes()
    await restoreDomainSupport(makeReq({ params: { domainId: 'eoy' }, body: { version: 'two' } }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})
