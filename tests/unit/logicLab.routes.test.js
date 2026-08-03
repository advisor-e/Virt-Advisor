'use strict'

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

/**
 * The three Logic-Lab routes behind the Firm Manager Hub tab of that name.
 *
 * What matters here is not the happy path but the promises the page makes about
 * them:
 *
 *   1. THEY READ THE FIRM'S OWN CONFIGURATION. "Of course it needs to be
 *      accurate for them — always" (Mike, 2026-08-02). A summary built from the
 *      platform files with the firm's edits missing is the failure this ruling
 *      was made about, and it would look completely normal on screen.
 *   2. A PART FAILING NEVER TAKES THE PAGE DOWN SILENTLY. The near-miss half
 *      depends on the case store; if that is unreachable, the levers are still
 *      true, and the payload says which half is missing.
 *   3. NOTHING WRITES. All three are reads of configuration and of engine
 *      behaviour.
 */

jest.mock('../../server/utils/db', () => ({ execute: jest.fn(), getConnection: jest.fn() }))
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn(),
  listFirmIdsWithConfigKey: jest.fn()
}))
jest.mock('../../server/utils/caseStore', () => ({ listSharedForFirm: jest.fn() }))
jest.mock('../../server/utils/decisionScore', () => ({ diagnose: jest.fn() }))
// Spied, not replaced: every test but the fault case wants the REAL resolution,
// so a mock standing in for it would prove nothing about what ships.
jest.mock('../../server/utils/firmDistinctions', () => {
  const actual = jest.requireActual('../../server/utils/firmDistinctions')
  return { ...actual, loadFirmDistinctionState: jest.fn(actual.loadFirmDistinctionState) }
})

const overlay = require('../../server/utils/firmOverlay')
const caseStore = require('../../server/utils/caseStore')
const decisionScore = require('../../server/utils/decisionScore')
const firmDistinctions = require('../../server/utils/firmDistinctions')

const {
  getLogicLabSummary,
  getLogicLabTemplateTitles,
  diagnoseDecision
} = require('../../server/routes/firmManager')

// Mirrors firmManager.routes.test.js: sendError writes through writeHead/end
// rather than send(), so a mock without them turns a tested error path into a
// TypeError that looks like a broken route.
function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    header () {},
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = typeof body === 'string' ? JSON.parse(body) : body }
  }
}

function makeReq (overrides = {}) {
  return {
    firmId: 'firm-test-123',
    userRole: 'firm_manager',
    userEmail: 'mgr@testfirm.com',
    query: {},
    params: {},
    body: {},
    ...overrides
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  // No firm overrides stored: every loader falls through to the platform base,
  // which is the shape a brand-new firm actually has.
  overlay.loadFirmConfig.mockResolvedValue(null)
  caseStore.listSharedForFirm.mockResolvedValue([])
})

describe('GET /api/firm-manager/logic-lab/summary', () => {
  it('answers with the three levers, counted from real content', async () => {
    const res = makeRes()
    await getLogicLabSummary(makeReq(), res)

    expect(res._status).toBe(200)
    const { levers } = res._body
    // Counted from the repo's own data files, so these assert "it counted
    // something real" rather than pinning a number Mike may change tomorrow.
    expect(levers.domainSupport.documents).toBeGreaterThan(0)
    expect(levers.logicTables.tables).toBeGreaterThan(0)
    expect(levers.logicTables.withTemplateHints).toBeLessThanOrEqual(levers.logicTables.tables)
    expect(levers.distinctions.count).toBeGreaterThan(0)
    expect(levers.logicTables.boost).toBe(3)
  })

  it('carries the Scenario Lab figures with their provenance attached', async () => {
    const res = makeRes()
    await getLogicLabSummary(makeReq(), res)
    expect(res._body.levers.measured.basis).toBe('scenario-lab')
    expect(res._body.levers.measured.caseCount).toBe(51)
  })

  it('returns domain labels, so no screen has to show a database key', async () => {
    const res = makeRes()
    await getLogicLabSummary(makeReq(), res)
    expect(Array.isArray(res._body.domains)).toBe(true)
    expect(res._body.domains[0]).toHaveProperty('label')
  })

  it('reads the firm’s OWN logic tables — an edit changes the count on the page', async () => {
    const plain = makeRes()
    await getLogicLabSummary(makeReq(), plain)
    const before = plain._body.levers.logicTables.firmEdited

    // The firm has edited one table. `logic-trees` is the single overlay bundle
    // the engine reads, so this is exactly what a real save stores.
    overlay.loadFirmConfig.mockImplementation((firmId, key) =>
      key === 'logic-trees' ? { governance: { entry_triggers: ['board drift'] } } : null)

    const edited = makeRes()
    await getLogicLabSummary(makeReq(), edited)
    expect(edited._body.levers.logicTables.firmEdited).toBe(before + 1)
  })

  it('aggregates near-misses from the firm’s SHARED cases', async () => {
    // A firm-own distinction filed under succession that keeps matching staff.
    overlay.loadFirmConfig.mockImplementation((firmId, key) =>
      key === 'advisory-distinctions'
        ? [{ id: 91, domain: 'succession', description: 'Owner cannot let go', triggers: ['wont let go'], templates: ['Succession Plan'], boost: 5 }]
        : null)
    caseStore.listSharedForFirm.mockResolvedValue([
      { decisionTrace: { domain: { id: 'staff' }, distinctions: { nearMisses: [{ id: 91, domain: 'succession', source: 'firm-own' }] } } },
      { decisionTrace: { domain: { id: 'staff' }, distinctions: { nearMisses: [{ id: 91, domain: 'succession', source: 'firm-own' }] } } }
    ])

    const res = makeRes()
    await getLogicLabSummary(makeReq(), res)

    expect(res._body.nearMisses.rows).toHaveLength(1)
    expect(res._body.nearMisses.rows[0]).toMatchObject({
      id: 91, filedDomain: 'succession', matchedDomain: 'staff', count: 2
    })
  })

  it('keeps the levers when the case store is unreachable, and says which half is missing', async () => {
    caseStore.listSharedForFirm.mockRejectedValue(new Error('store down'))
    const res = makeRes()
    await getLogicLabSummary(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.levers.logicTables.tables).toBeGreaterThan(0)
    expect(res._body.nearMisses.unavailable).toBe(true)
    expect(res._body.nearMisses.rows).toEqual([])
  })
})

describe('GET /api/firm-manager/logic-lab/templates', () => {
  it('offers the platform library when the firm has imported none', async () => {
    const res = makeRes()
    await getLogicLabTemplateTitles(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.titles.length).toBeGreaterThan(0)
    // Sorted and de-duplicated: it is a picker, not a dump.
    const sorted = [...res._body.titles].sort((a, b) => String(a).localeCompare(String(b)))
    expect(res._body.titles).toEqual(sorted)
    expect(new Set(res._body.titles).size).toBe(res._body.titles.length)
  })

  it('offers the FIRM’S library once it has imported one', async () => {
    overlay.loadFirmConfig.mockImplementation((firmId, key) =>
      key === 'templates'
        ? [{ page: 'p1', title: 'Our Own Tool', section: 'x' }, { page: 'p2', title: 'Another', section: 'x' }]
        : null)

    const res = makeRes()
    await getLogicLabTemplateTitles(makeReq(), res)
    expect(res._body.titles).toEqual(['Another', 'Our Own Tool'])
  })
})

describe('POST /api/firm-manager/logic-lab/diagnose', () => {
  it('refuses an empty sentence rather than running the engine on nothing', async () => {
    const res = makeRes()
    await diagnoseDecision(makeReq({ body: { text: '   ' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_BODY')
    expect(decisionScore.diagnose).not.toHaveBeenCalled()
  })

  it('passes the firm’s own configuration into the run', async () => {
    decisionScore.diagnose.mockResolvedValue({ scored: true, sheet: [], probe: {}, expected: null, gap: null })
    overlay.loadFirmConfig.mockImplementation((firmId, key) => {
      if (key === 'logic-trees') { return { governance: { entry_triggers: ['board drift'] } } }
      if (key === 'advisory-distinctions') { return [{ id: 1, domain: 'governance', description: 'x', triggers: ['y'], templates: ['z'], boost: 5 }] }
      return null
    })

    const res = makeRes()
    await diagnoseDecision(makeReq({ body: { text: 'poor decision making', expectedTitle: 'Quality Decisions' } }), res)

    expect(res._status).toBe(200)
    const args = decisionScore.diagnose.mock.calls[0][0]
    expect(args.text).toBe('poor decision making')
    expect(args.expectedTitle).toBe('Quality Decisions')
    expect(args.firmTrees).toEqual({ governance: { entry_triggers: ['board drift'] } })
    expect(args.distinctionRows.some(r => r.id === 1)).toBe(true)
  })

  it('reports a distinction read failure instead of passing it off as "none matched"', async () => {
    decisionScore.diagnose.mockResolvedValue({ scored: true, sheet: [], probe: {}, expected: null, gap: null })
    // The resolver itself failing — not the overlay, which degrades to the dev
    // files on a developer machine and so would prove nothing here.
    firmDistinctions.loadFirmDistinctionState.mockRejectedValueOnce(new Error('store down'))

    const res = makeRes()
    await diagnoseDecision(makeReq({ body: { text: 'poor decision making' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.distinctionsAvailable).toBe(false)
  })

  it('ignores a non-string expectedTitle rather than passing it through', async () => {
    decisionScore.diagnose.mockResolvedValue({ scored: true, sheet: [], probe: {}, expected: null, gap: null })
    const res = makeRes()
    await diagnoseDecision(makeReq({ body: { text: 'a sentence', expectedTitle: { evil: true } } }), res)

    expect(decisionScore.diagnose.mock.calls[0][0].expectedTitle).toBeNull()
  })

  it('returns a safe generic error, never the internal fault', async () => {
    decisionScore.diagnose.mockRejectedValue(new Error('ECONNREFUSED 10.0.0.4:3306'))
    const res = makeRes()
    await diagnoseDecision(makeReq({ body: { text: 'a sentence' } }), res)

    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('10.0.0.4')
  })
})
