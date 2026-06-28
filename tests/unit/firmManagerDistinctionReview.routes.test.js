'use strict'

// Firm Manager — "mentor updates since your last visit" review state.
//   getDistinctionState        flags platform (mentor) rows changed since the firm's
//                              last-reviewed marker, and counts them.
//   markDistinctionsReviewed   advances that marker to now.
// firmOverlay is mocked so load/save are controllable; because the mocks RESOLVE,
// the dev-JSON fallback (which only runs when the loader rejects) never touches disk.

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const { PLATFORM_CONFIG_KEY } = require('../../server/utils/platformDistinctions')
const { getDistinctionState, markDistinctionsReviewed } = require('../../server/routes/firmManager')

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body }
  }
}

const FIRM_REQ = { firmId: 'firm-1', userEmail: 'manager@firm.com' }

// pd-1 was edited by the mentor (carries updated_at); pd-2 is a plain seed row (no
// timestamps) and must never be flagged.
const EDIT_TS = '2026-06-28T20:00:00.000Z'
const PLATFORM = [
  { id: 'pd-1', domain: 'strategy', triggers: ['x'], description: 'Edited', templates: ['T'], boost: 5, updated_at: EDIT_TS, updated_by: 'mentor@advisor-e.com' },
  { id: 'pd-2', domain: 'conflict', triggers: ['y'], description: 'Seed row', templates: ['T'], boost: 5 }
]

// All route loads go through overlay.loadFirmConfig(scopeOrFirmId, key); answer by key.
function mockLoads ({ lastSeen = null } = {}) {
  overlay.loadFirmConfig.mockImplementation((idOrScope, key) => {
    if (key === PLATFORM_CONFIG_KEY) { return PLATFORM }
    if (key === 'distinction-last-seen') { return lastSeen }
    if (key === 'advisory-distinctions') { return [] } // firm's own rows
    if (key === 'distinction-declines') { return [] }
    if (key === 'distinction-overrides') { return {} }
    return null
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.saveFirmConfig.mockResolvedValue(1)
})

describe('getDistinctionState — mentor-update flags', () => {
  test('null marker (never reviewed): flags every timestamped row, never seed rows', async () => {
    mockLoads({ lastSeen: null })
    const res = makeMockRes()
    await getDistinctionState(FIRM_REQ, res)
    expect(res._status).toBe(200)
    expect(res._body.lastReviewedAt).toBeNull()
    expect(res._body.newUpdateCount).toBe(1)
    const pd1 = res._body.platform.find(r => r.id === 'pd-1')
    const pd2 = res._body.platform.find(r => r.id === 'pd-2')
    expect(pd1.mentorUpdated).toBe(true)
    expect(pd1.mentorUpdatedAt).toBe(EDIT_TS)
    expect(pd2.mentorUpdated).toBe(false)
    expect(pd2.mentorUpdatedAt).toBeNull()
  })

  test('marker AFTER the edit: nothing flagged', async () => {
    mockLoads({ lastSeen: '2026-06-29T00:00:00.000Z' })
    const res = makeMockRes()
    await getDistinctionState(FIRM_REQ, res)
    expect(res._body.newUpdateCount).toBe(0)
    expect(res._body.platform.find(r => r.id === 'pd-1').mentorUpdated).toBe(false)
  })

  test('marker BEFORE the edit: the edited row is flagged', async () => {
    mockLoads({ lastSeen: '2026-06-28T00:00:00.000Z' })
    const res = makeMockRes()
    await getDistinctionState(FIRM_REQ, res)
    expect(res._body.newUpdateCount).toBe(1)
    expect(res._body.platform.find(r => r.id === 'pd-1').mentorUpdated).toBe(true)
  })

  test('does not mutate the shared platform rows (badge fields are added to copies)', async () => {
    mockLoads({ lastSeen: null })
    await getDistinctionState(FIRM_REQ, makeMockRes())
    expect(Object.prototype.hasOwnProperty.call(PLATFORM[0], 'mentorUpdated')).toBe(false)
  })
})

describe('markDistinctionsReviewed', () => {
  test('saves an ISO timestamp under the firm scope and returns it', async () => {
    const res = makeMockRes()
    await markDistinctionsReviewed(FIRM_REQ, res)
    expect(res._status).toBe(200)
    expect(res._body.reviewed).toBe(true)
    expect(typeof res._body.lastReviewedAt).toBe('string')
    expect(Number.isNaN(new Date(res._body.lastReviewedAt).getTime())).toBe(false)
    const [firmId, key, value, savedBy] = overlay.saveFirmConfig.mock.calls[0]
    expect(firmId).toBe('firm-1')
    expect(key).toBe('distinction-last-seen')
    expect(value).toBe(res._body.lastReviewedAt)
    expect(savedBy).toBe('manager@firm.com')
  })

  test('after marking reviewed, that timestamp clears the flags on the next read', async () => {
    const markRes = makeMockRes()
    await markDistinctionsReviewed(FIRM_REQ, markRes)
    mockLoads({ lastSeen: markRes._body.lastReviewedAt })
    const stateRes = makeMockRes()
    await getDistinctionState(FIRM_REQ, stateRes)
    expect(stateRes._body.newUpdateCount).toBe(0)
  })
})
