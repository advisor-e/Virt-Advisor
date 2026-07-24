'use strict'

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

/**
 * Route tests for the read-only Logic Tables endpoints (FIRM-EDITABLE-TABLES-PLAN.md
 * Phase 3, Slice A): GET /logic-trees (list, grouped) and GET /logic-trees/:treeId
 * (one table's branches). The claims that matter: the real trees load and group
 * advisory vs get-the-job, branch counts and Platform/Your-firm origin are right,
 * a table's branches come back as the four display columns, and an unknown id is
 * a clean 404 — all against the SINGLE `logic-trees` overlay bundle the engine
 * reads (not per-key storage).
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
const { getLogicTrees, getLogicTreeDetail } = require('../../server/routes/firmManager')

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
  // No firm override by default → every table reads as platform.
  overlay.loadFirmConfig.mockResolvedValue(null)
})

describe('GET /logic-trees (list)', () => {
  test('returns advisory and get-the-job groups from the real trees', async () => {
    const res = makeMockRes()
    await getLogicTrees(makeReq(), res)
    expect(res._status).toBe(200)
    const advisoryIds = res._body.advisory.map(t => t.id)
    const getIds = res._body.getSellers.map(t => t.id)
    expect(advisoryIds).toContain('eoy_meeting')
    // A get-the-job tree lands in its own group, never in advisory.
    expect(getIds).toContain('get_marketing')
    expect(advisoryIds).not.toContain('get_marketing')
  })

  test('a table carries a branch count and platform origin by default', async () => {
    const res = makeMockRes()
    await getLogicTrees(makeReq(), res)
    const eoy = res._body.advisory.find(t => t.id === 'eoy_meeting')
    expect(eoy.count).toBeGreaterThan(0)
    expect(eoy.origin).toBe('platform')
  })

  test('a table the firm has overridden reads as firm origin', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ eoy_meeting: { nodes: [] } })
    const res = makeMockRes()
    await getLogicTrees(makeReq(), res)
    const eoy = res._body.advisory.find(t => t.id === 'eoy_meeting')
    expect(eoy.origin).toBe('firm')
  })
})

describe('GET /logic-trees/:treeId (detail)', () => {
  test('returns the branches as the four display columns', async () => {
    const res = makeMockRes()
    await getLogicTreeDetail(makeReq({ params: { treeId: 'eoy_meeting' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.id).toBe('eoy_meeting')
    expect(Array.isArray(res._body.branches)).toBe(true)
    expect(res._body.branches.length).toBeGreaterThan(0)
    const b = res._body.branches[0]
    expect(b).toHaveProperty('branch_name')
    expect(b).toHaveProperty('condition')
    expect(b).toHaveProperty('action')
    expect(b).toHaveProperty('notes')
    expect(b).toHaveProperty('id')
  })

  test('an unknown table id is a clean 404, not a crash', async () => {
    const res = makeMockRes()
    await getLogicTreeDetail(makeReq({ params: { treeId: 'no_such_tree' } }), res)
    expect(res._status).toBe(404)
    expect(res._body.success).toBe(false)
  })
})
