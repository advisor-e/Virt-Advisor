'use strict'

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

/**
 * Route tests for the method-guide endpoints (item 4.16 F, 2026-08-17).
 *
 * Approved artefact: design/METHOD-GUIDES-SCREEN.md · design/mockups/method-guides.html
 *
 * TWO THINGS HERE EARN THEIR KEEP.
 *
 * 1. THE KEY ASSERTION. A save must land under the `method-guides` bundle the
 *    engines read. The dev-file fallback would hide a wrong key completely — both
 *    sides fall back to the same gitignored JSON, so a save under a key no reader
 *    selects still reaches the AI in development and only diverges once MySQL is
 *    provisioned. That is the exact fault domain support hit on 2026-07-30, and
 *    only a key assertion can catch it.
 *
 * 2. THE SHAPE REFUSAL. "Structure is fixed; words are editable" is a rule that
 *    only exists if something enforces it. A firm that could add a stage would
 *    author a method, and a firm that could rename a field would break the walk
 *    both the screen and the prompt are built from.
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
  getMethodGuides,
  getMethodGuideDetail,
  saveMethodGuide,
  resetMethodGuide,
  getMethodGuideHistory,
  getDomainSupportDetail
} = require('../../server/routes/firmManager')
const { loadGuideBase } = require('../../server/utils/methodGuides')

// The key the engines read. Hardcoded on purpose: importing the constant would let
// a rename slip past both sides at once, which is the whole failure being guarded.
const ENGINE_KEY = 'method-guides'

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body }
  }
}

function makeReq (overrides = {}) {
  return { firmId: 'firm-test-123', userRole: 'firm_manager', userEmail: 'mgr@testfirm.com', params: {}, body: {}, ...overrides }
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(4)
  db.execute.mockResolvedValue([[]])
})

describe('GET /api/firm-manager/method-guides', () => {
  test('lists all fourteen, with where each one opens from', async () => {
    const res = makeMockRes()
    await getMethodGuides(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body.guides).toHaveLength(14)
    const standing = res._body.guides.filter(g => g.standing)
    // Two standing entries, in the order the rail shows them: The 3 Engagement
    // Types is its own page listed UNDER Facilitation 101 (Mike, 2026-08-23),
    // which is what puts it on the screen at every tier.
    expect(standing.map(g => g.id)).toEqual(['facilitation_101', 'engagement_types'])
    expect(standing[1].label).toBe('The 3 Engagement Types')
    // Every row is named for a person as well as by id — the screen shows the
    // label, and deriving it in the browser would be a second copy of the mapping.
    for (const g of res._body.guides) {
      for (const r of g.rows) { expect(typeof r.domainLabel).toBe('string') }
    }
  })

  test('reports which guides this scope has reworded', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ trial_fit: { objective: 'Ours.' } })
    const res = makeMockRes()
    await getMethodGuides(makeReq(), res)
    const byId = Object.fromEntries(res._body.guides.map(g => [g.id, g.origin]))
    expect(byId.trial_fit).toBe('firm')
    expect(byId.conflict_meeting).toBe('platform')
  })
})

describe('GET /api/firm-manager/method-guides/:guideId', () => {
  test('serves the walked sections AND the content they address', async () => {
    const res = makeMockRes()
    await getMethodGuideDetail(makeReq({ params: { guideId: 'trial_fit' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.sections.length).toBeGreaterThan(0)
    // Both, deliberately: the walk carries the structure and the labels, the
    // content is what an edit is written back into. Without the content a saved
    // value could land on a different line from the box it was typed in.
    expect(res._body.content.objective).toBe(loadGuideBase('trial_fit').objective)
    expect(res._body.origin).toBe('platform')
  })

  test('an unknown guide is a 404, never an empty screen', async () => {
    const res = makeMockRes()
    await getMethodGuideDetail(makeReq({ params: { guideId: 'not_a_guide' } }), res)
    expect(res._status).toBe(404)
  })
})

describe('POST /api/firm-manager/method-guides/:guideId', () => {
  test('🔴 saves into the `method-guides` bundle the engines read', async () => {
    const content = JSON.parse(JSON.stringify(loadGuideBase('trial_fit')))
    content.objective = 'Our own objective.'
    const res = makeMockRes()
    await saveMethodGuide(makeReq({ params: { guideId: 'trial_fit' }, body: { content } }), res)

    expect(res._status).toBe(200)
    const [, key, stored] = overlay.saveFirmConfig.mock.calls[0]
    expect(key).toBe(ENGINE_KEY)
    // Stored SPARSELY: one sentence changed, one sentence stored, so a later
    // platform correction to any other line still reaches this firm.
    expect(stored).toEqual({ trial_fit: { objective: 'Our own objective.' } })
  })

  test('stores per GUIDE, so a guide on two pages cannot say two things', async () => {
    const content = JSON.parse(JSON.stringify(loadGuideBase('capacity_capability_opportunity')))
    content.objective = 'Reworded once.'
    const res = makeMockRes()
    await saveMethodGuide(makeReq({ params: { guideId: 'capacity_capability_opportunity' }, body: { content } }), res)
    const [, , stored] = overlay.saveFirmConfig.mock.calls[0]
    // Keyed by guide id, NOT by the domain it was edited from — which is what makes
    // the on-screen "an edit here changes it there too" line true.
    expect(Object.keys(stored)).toEqual(['capacity_capability_opportunity'])
  })

  test('editing back to the inherited wording clears the override rather than storing an empty one', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ trial_fit: { objective: 'Ours.' } })
    const res = makeMockRes()
    await saveMethodGuide(makeReq({
      params: { guideId: 'trial_fit' },
      body: { content: JSON.parse(JSON.stringify(loadGuideBase('trial_fit'))) }
    }), res)
    const [, , stored] = overlay.saveFirmConfig.mock.calls[0]
    expect(stored).toEqual({})
    expect(res._body.origin).toBe('platform')
  })

  test('refuses an added stage — that is authoring a method, not rewording one', async () => {
    const content = JSON.parse(JSON.stringify(loadGuideBase('trial_fit')))
    content.stages.push({ stage: 99, name: 'Invented', key_principle: 'x', coaching_points: [] })
    const res = makeMockRes()
    await saveMethodGuide(makeReq({ params: { guideId: 'trial_fit' }, body: { content } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_SHAPE')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a field the platform never authored', async () => {
    const content = JSON.parse(JSON.stringify(loadGuideBase('trial_fit')))
    content.smuggled_in = 'Text the walker would render and the AI would read.'
    const res = makeMockRes()
    await saveMethodGuide(makeReq({ params: { guideId: 'trial_fit' }, body: { content } }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a body that is not a guide at all', async () => {
    const res = makeMockRes()
    await saveMethodGuide(makeReq({ params: { guideId: 'trial_fit' }, body: { content: 'oops' } }), res)
    expect(res._status).toBe(400)
  })

  test('an unknown guide id is a 404 before anything is stored', async () => {
    const res = makeMockRes()
    await saveMethodGuide(makeReq({ params: { guideId: 'not_a_guide' }, body: { content: {} } }), res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/firm-manager/method-guides/:guideId', () => {
  test('drops only that guide, leaving the others alone', async () => {
    overlay.loadFirmConfig.mockResolvedValue({
      trial_fit: { objective: 'Ours.' },
      ratio_analysis: { objective: 'Also ours.' }
    })
    const res = makeMockRes()
    await resetMethodGuide(makeReq({ params: { guideId: 'trial_fit' } }), res)
    expect(res._status).toBe(200)
    const [, , stored] = overlay.saveFirmConfig.mock.calls[0]
    expect(stored).toEqual({ ratio_analysis: { objective: 'Also ours.' } })
  })

  test('resetting a guide that was never edited writes nothing', async () => {
    const res = makeMockRes()
    await resetMethodGuide(makeReq({ params: { guideId: 'trial_fit' } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('GET /api/firm-manager/method-guides/:guideId/history', () => {
  test('reads the versions of this scope\'s method-guide bundle', async () => {
    db.execute.mockResolvedValue([[{ version: 2, saved_by: 'mgr@testfirm.com', created_at: '2026-08-17' }]])
    const res = makeMockRes()
    await getMethodGuideHistory(makeReq({ params: { guideId: 'trial_fit' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.history).toHaveLength(1)
    expect(db.execute.mock.calls[0][1]).toEqual(['firm-test-123', ENGINE_KEY])
  })
})

describe('the Domain Support detail route', () => {
  test('tells the screen which framework rows have a guide behind them', async () => {
    const res = makeMockRes()
    await getDomainSupportDetail(makeReq({ params: { domainId: 'profit' } }), res)
    expect(res._status).toBe(200)
    const ids = res._body.guides.map(g => g.id).sort()
    expect(ids).toEqual(['cautious_reveal', 'trial_fit'])
    // Named against the row it opens from, so the control cannot land on the
    // wrong row — matched on the server, where the mapping is authored.
    expect(res._body.guides.find(g => g.id === 'trial_fit').material).toBe('Trial Fit Method')
  })

  test('a domain with no guide gets an empty list, not a guessed one', async () => {
    const res = makeMockRes()
    await getDomainSupportDetail(makeReq({ params: { domainId: 'governance' } }), res)
    expect(res._body.guides).toEqual([])
  })
})
