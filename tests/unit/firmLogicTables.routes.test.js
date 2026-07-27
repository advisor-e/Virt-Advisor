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
const db = require('../../server/utils/db')
const {
  getLogicTrees,
  getLogicTreeDetail,
  saveLogicTree,
  resetLogicTree,
  getLogicTreeHistory
} = require('../../server/routes/firmManager')

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
  test('splits the real trees into the three master sections', async () => {
    const res = makeMockRes()
    await getLogicTrees(makeReq(), res)
    expect(res._status).toBe(200)
    const doIds = res._body.doTheJob.map(t => t.id)
    const getIds = res._body.getTheJob.map(t => t.id)
    const orgIds = res._body.getOrganised.map(t => t.id)
    // Client-delivery tree → Do the Job; get_ tree → Get the Job; org_/fm_ → Get Organised.
    expect(doIds).toContain('eoy_meeting')
    expect(getIds).toContain('get_marketing')
    expect(orgIds).toContain('org_ca_firm_strategy')
    // Each tree lands in exactly one group.
    expect(doIds).not.toContain('get_marketing')
    expect(doIds).not.toContain('org_ca_firm_strategy')
  })

  test('a table carries a branch count and platform origin by default', async () => {
    const res = makeMockRes()
    await getLogicTrees(makeReq(), res)
    const eoy = res._body.doTheJob.find(t => t.id === 'eoy_meeting')
    expect(eoy.count).toBeGreaterThan(0)
    expect(eoy.origin).toBe('platform')
  })

  test('a table the firm has overridden reads as firm origin', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ eoy_meeting: { nodes: [] } })
    const res = makeMockRes()
    await getLogicTrees(makeReq(), res)
    const eoy = res._body.doTheJob.find(t => t.id === 'eoy_meeting')
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

describe('POST /logic-trees/:treeId (save)', () => {
  test('a missing branches array is a clean 400', async () => {
    const res = makeMockRes()
    await saveLogicTree(makeReq({ params: { treeId: 'eoy_meeting' }, body: {} }), res)
    expect(res._status).toBe(400)
    expect(res._body.success).toBe(false)
  })

  test('an unknown table id is a clean 404', async () => {
    const res = makeMockRes()
    await saveLogicTree(makeReq({ params: { treeId: 'no_such_tree' }, body: { branches: [] } }), res)
    expect(res._status).toBe(404)
  })

  test('saves the whole logic-trees bundle under the single config key', async () => {
    overlay.saveFirmConfig.mockResolvedValue(3)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'eoy_meeting' },
      body: { branches: [{ id: 'x', branch_name: 'B', condition: 'c', action: 'a', notes: 'n' }] }
    }), res)
    expect(res._status).toBe(200)
    expect(res._body).toMatchObject({ saved: true, version: 3, treeId: 'eoy_meeting' })
    // One bundle, one key: firmId, 'logic-trees', the map, savedBy.
    const [firmId, key, map] = overlay.saveFirmConfig.mock.calls[0]
    expect(firmId).toBe('firm-test-123')
    expect(key).toBe('logic-trees')
    expect(map).toHaveProperty('eoy_meeting')
  })

  test('a reworded branch keeps the platform node\'s hidden flow wiring', async () => {
    // Take a REAL branching node (has `branches`/`next_node` wiring) and reword it.
    const logicTrees = require('../../server/utils/logicTrees')
    const base = logicTrees.loadLogicTrees().find(t => t.id === 'quickfire')
    const wired = (base.nodes || []).find(n => Array.isArray(n.branches) && n.branches.length)
    expect(wired).toBeTruthy() // guard: the fixture still has a wired node

    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'quickfire' },
      body: { branches: [{ id: wired.id, branch_name: wired.branch_name, condition: 'REWORDED', action: '', notes: '' }] }
    }), res)

    const map = overlay.saveFirmConfig.mock.calls[0][2]
    const savedNode = map.quickfire.nodes.find(n => n.id === wired.id)
    expect(savedNode.condition).toBe('REWORDED') // the edit applied
    expect(savedNode.branches).toEqual(wired.branches) // the flow wiring survived
  })

  test('an added row becomes a new branch with no flow wiring', async () => {
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'quickfire' },
      body: { branches: [{ branch_name: 'Firm Extra', condition: 'if x', action: 'do y', notes: '' }] }
    }), res)
    const map = overlay.saveFirmConfig.mock.calls[0][2]
    const added = map.quickfire.nodes.find(n => n.branch_name === 'Firm Extra')
    expect(added).toBeTruthy()
    expect(added.branches).toBeUndefined() // appended guidance row, no wiring
  })

  test('a flat_if_then branch keeps its hidden templates when reworded', async () => {
    const logicTrees = require('../../server/utils/logicTrees')
    const flat = logicTrees.loadLogicTrees()
      .find(t => Array.isArray(t.branches) && t.branches.some(b => Array.isArray(b.templates) && b.templates.length))
    if (!flat) { return } // no flat tree carries templates in the fixture — nothing to assert
    const idx = flat.branches.findIndex(b => Array.isArray(b.templates) && b.templates.length)
    const displayId = flat.branches[idx].id || `row-${idx}` // the id the detail route hands the UI

    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: flat.id },
      body: { branches: [{ id: displayId, branch_name: flat.branches[idx].branch_name, condition: 'REWORDED', action: '', notes: '' }] }
    }), res)
    const map = overlay.saveFirmConfig.mock.calls[0][2]
    const saved = map[flat.id].branches[0]
    expect(saved.condition).toBe('REWORDED')
    expect(saved.templates).toEqual(flat.branches[idx].templates) // IP preserved, not dropped
  })

  test('a removed row drops out of the saved bundle', async () => {
    const logicTrees = require('../../server/utils/logicTrees')
    const base = logicTrees.loadLogicTrees().find(t => t.id === 'quickfire')
    const keep = base.nodes[0]
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    // Submit only the first node → every other base node is removed.
    await saveLogicTree(makeReq({
      params: { treeId: 'quickfire' },
      body: { branches: [{ id: keep.id, branch_name: keep.branch_name, condition: 'c', action: 'a', notes: 'n' }] }
    }), res)
    const map = overlay.saveFirmConfig.mock.calls[0][2]
    expect(map.quickfire.nodes).toHaveLength(1)
    expect(map.quickfire.nodes[0].id).toBe(keep.id)
  })
})

describe('DELETE /logic-trees/:treeId (reset)', () => {
  test('drops just that table from the firm bundle and saves the rest', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ eoy_meeting: { nodes: [] }, quickfire: { nodes: [] } })
    overlay.saveFirmConfig.mockResolvedValue(4)
    const res = makeMockRes()
    await resetLogicTree(makeReq({ params: { treeId: 'eoy_meeting' } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toMatchObject({ reset: true, treeId: 'eoy_meeting' })
    const map = overlay.saveFirmConfig.mock.calls[0][2]
    expect(map).not.toHaveProperty('eoy_meeting')
    expect(map).toHaveProperty('quickfire') // other tables untouched
  })

  test('resetting a table the firm never edited is a clean no-op', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    const res = makeMockRes()
    await resetLogicTree(makeReq({ params: { treeId: 'eoy_meeting' } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled() // nothing to write
  })
})

describe('GET /logic-trees/:treeId/history', () => {
  test('returns the bundle version history rows', async () => {
    db.execute.mockResolvedValue([[{ version: 2, saved_by: 'a@b.com', created_at: '2026-07-27' }]])
    const res = makeMockRes()
    await getLogicTreeHistory(makeReq({ params: { treeId: 'eoy_meeting' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.history).toHaveLength(1)
    // Read from the single shared bundle key, not a per-tree key.
    expect(db.execute.mock.calls[0][1]).toEqual(['firm-test-123', 'logic-trees'])
  })
})
