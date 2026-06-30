'use strict'

// Stage E — mentor-update review (adopt / keep mine) on a distinction the firm OVERRODE.
// Drift is detected by comparing the live mentor row's content signature to the baseline
// stamped when the firm last overrode / kept-mine it. firmOverlay is mocked with a STATEFUL
// store so a save is visible to the next load (these tests chain override → mentor-edit →
// review across calls). Because the mock resolves, the dev-JSON fallback never runs.

jest.mock('../../server/utils/firmOverlay', () => {
  const store = {}
  const k = (firmId, key) => `${firmId}::${key}`
  return {
    loadFirmConfig: jest.fn((firmId, key) => {
      const v = store[k(firmId, key)]
      return Promise.resolve(v === undefined ? null : v)
    }),
    saveFirmConfig: jest.fn((firmId, key, value) => { store[k(firmId, key)] = value; return Promise.resolve(1) }),
    __store: store,
    __reset: () => { for (const kk of Object.keys(store)) { delete store[kk] } }
  }
})

const overlay = require('../../server/utils/firmOverlay')
const { PLATFORM_SCOPE, PLATFORM_CONFIG_KEY } = require('../../server/utils/platformDistinctions')
const fm = require('../../server/routes/firmManager')

const FIRM = 'firm-1'
const REQ = { firmId: FIRM, userEmail: 'mgr@firm.com' }
const PLAT_KEY = `${PLATFORM_SCOPE}::${PLATFORM_CONFIG_KEY}`
const OVR_KEY = `${FIRM}::distinction-overrides`
const BASE_KEY = `${FIRM}::distinction-override-baselines`

// send() is the success path; sendError() uses writeHead()+end() — support both so
// error responses (404/409) populate _s/_b too.
function res () {
  return {
    _s: null,
    _b: null,
    headersSent: false,
    send (s, b) { this._s = s; this._b = b },
    writeHead (s) { this._s = s; this.headersSent = true },
    end (body) { try { this._b = JSON.parse(body) } catch (e) { this._b = body } }
  }
}

function setMentorRow (fields) {
  overlay.__store[PLAT_KEY] = [Object.assign(
    { id: 'pd-1', domain: 'strategy', description: 'Mentor original', triggers: ['x'], templates: ['T1'], boost: 5 },
    fields || {}
  )]
}

async function overridePd1 () {
  await fm.setDistinctionOverride({ ...REQ, params: { id: 'pd-1' }, body: { description: 'Firm version' } }, res())
}

beforeEach(() => {
  overlay.__reset()
  setMentorRow() // seed the mentor (platform) set
})

describe('baseline stamping', () => {
  test('overriding a row stamps the mentor baseline and shows no drift immediately', async () => {
    await overridePd1()
    expect(overlay.__store[BASE_KEY]['pd-1']).toBeDefined()
    const r = res(); await fm.getDistinctionState(REQ, r)
    expect(r._b.driftIds).toEqual([])
  })
})

describe('drift detection', () => {
  test('mentor edits the overridden row → driftIds includes it', async () => {
    await overridePd1()
    setMentorRow({ description: 'Mentor CHANGED', boost: 9 }) // the mentor edits their version
    const r = res(); await fm.getDistinctionState(REQ, r)
    expect(r._b.driftIds).toEqual(['pd-1'])
  })

  test('a non-content change (mentor re-saves identical content) is NOT drift', async () => {
    await overridePd1()
    setMentorRow({ updated_at: '2099-01-01T00:00:00Z' }) // same content, new timestamp only
    const r = res(); await fm.getDistinctionState(REQ, r)
    expect(r._b.driftIds).toEqual([])
  })

  test('a pre-existing override with no baseline is backfilled (no false drift)', async () => {
    overlay.__store[OVR_KEY] = { 'pd-1': { description: 'Firm version' } } // predates the feature
    const r = res(); await fm.getDistinctionState(REQ, r)
    expect(r._b.driftIds).toEqual([])
    expect(overlay.__store[BASE_KEY]['pd-1']).toBeDefined()
  })
})

describe('Keep mine', () => {
  test('re-stamps the baseline so drift clears until the mentor edits again', async () => {
    await overridePd1()
    setMentorRow({ description: 'Mentor CHANGED' })
    let r = res(); await fm.getDistinctionState(REQ, r)
    expect(r._b.driftIds).toEqual(['pd-1'])

    await fm.keepMineDistinction({ ...REQ, params: { id: 'pd-1' } }, res())
    r = res(); await fm.getDistinctionState(REQ, r)
    expect(r._b.driftIds).toEqual([]) // cleared

    setMentorRow({ description: 'Mentor CHANGED AGAIN' })
    r = res(); await fm.getDistinctionState(REQ, r)
    expect(r._b.driftIds).toEqual(['pd-1']) // reappears on the next edit
  })

  test('409 when the firm has no override for that row', async () => {
    const r = res(); await fm.keepMineDistinction({ ...REQ, params: { id: 'pd-1' } }, r)
    expect(r._s).toBe(409)
    expect(r._b.error.code).toBe('NOT_OVERRIDDEN')
  })

  test('404 for an unknown platform id', async () => {
    const r = res(); await fm.keepMineDistinction({ ...REQ, params: { id: 'pd-999' } }, r)
    expect(r._s).toBe(404)
  })
})

describe('Adopt (reset to platform)', () => {
  test('removes the override and its baseline', async () => {
    await overridePd1()
    setMentorRow({ description: 'Mentor CHANGED' })
    await fm.resetDistinctionOverride({ ...REQ, params: { id: 'pd-1' } }, res())
    expect((overlay.__store[OVR_KEY] || {})['pd-1']).toBeUndefined()
    expect((overlay.__store[BASE_KEY] || {})['pd-1']).toBeUndefined()
    // and the row is no longer flagged
    const r = res(); await fm.getDistinctionState(REQ, r)
    expect(r._b.driftIds).toEqual([])
  })
})
