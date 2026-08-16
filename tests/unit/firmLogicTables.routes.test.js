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
  getLogicTreeHistory,
  setLogicTreeSection,
  setDomainSupportSection
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

  // Order became presentation once the entry point was recorded in entry_node
  // (Phase 1). Before that, walkLogicTree started at tree.nodes[0].id and
  // moving rows would have repointed where the engine begins reasoning.
  test('a nodes-shaped tree IS reorderable now that it records its entry point', async () => {
    const res = makeMockRes()
    await getLogicTreeDetail(makeReq({ params: { treeId: 'eoy_meeting' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.reorderable).toBe(true)
  })

  test('a flat_if_then tree IS reorderable — its rules are self-contained', async () => {
    const res = makeMockRes()
    await getLogicTreeDetail(makeReq({ params: { treeId: 'get_sales_tracker' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.reorderable).toBe(true)
  })

  test('every real tree is reorderable — all 42 now qualify', async () => {
    const logicTrees = require('../../server/utils/logicTrees')
    for (const tree of logicTrees.effectiveTrees(null)) {
      const res = makeMockRes()
      await getLogicTreeDetail(makeReq({ params: { treeId: tree.id } }), res)
      expect(res._body.reorderable).toBe(true)
    }
  })

  // The guard that protects a tree added later: without a usable entry_node the
  // walk falls back to whatever sits first, so reordering must not be offered.
  test('a nodes-shaped tree whose entry_node is missing or dangling is refused', async () => {
    const logicTrees = require('../../server/utils/logicTrees')
    const real = logicTrees.effectiveTrees(null).find(t => Array.isArray(t.nodes) && t.nodes.length)

    // deepMerge overwrites rather than skipping, so an override of `undefined`
    // wipes the recorded entry just as an empty or dangling one does.
    for (const bad of [undefined, '', 'no_such_node']) {
      overlay.loadFirmConfig.mockResolvedValue({ [real.id]: { entry_node: bad } })
      const res = makeMockRes()
      await getLogicTreeDetail(makeReq({ params: { treeId: real.id } }), res)
      expect(res._body.reorderable).toBe(false)
    }
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

  // The id a firm-added row is given IS its identity — the firm-editable cascade
  // keys a firm's decisions about a row to it. It used to be the row's POSITION
  // in the submitted list (`firm-branch-${i}`), which is not identity: a new row
  // landing where an earlier firm row's number was minted produced two rows with
  // the same id, silently.
  test('a new row never takes the id of a firm row already in the table', async () => {
    const logicTrees = require('../../server/utils/logicTrees')
    const base = logicTrees.loadLogicTrees().find(t => t.id === 'quickfire')
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    // Row 1 is brand new (no id); the firm row already holding `firm-branch-1`
    // is submitted after it — exactly what re-ordering or an insert produces.
    await saveLogicTree(makeReq({
      params: { treeId: 'quickfire' },
      body: {
        branches: [
          { id: base.nodes[0].id, branch_name: base.nodes[0].branch_name, condition: '', action: '', notes: '' },
          { branch_name: 'Brand new row', condition: '', action: '', notes: '' },
          { id: 'firm-branch-1', branch_name: 'Added last month', condition: '', action: '', notes: '' }
        ]
      }
    }), res)

    const saved = overlay.saveFirmConfig.mock.calls[0][2].quickfire.nodes
    const ids = saved.map(n => n.id)
    expect(ids.length).toBe(new Set(ids).size) // no duplicates
    expect(saved.find(n => n.branch_name === 'Added last month').id).toBe('firm-branch-1')
    expect(saved.find(n => n.branch_name === 'Brand new row').id).not.toBe('firm-branch-1')
  })

  test('two new rows in one save get different ids', async () => {
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'quickfire' },
      body: {
        branches: [
          { branch_name: 'First new', condition: '', action: '', notes: '' },
          { branch_name: 'Second new', condition: '', action: '', notes: '' }
        ]
      }
    }), res)
    const saved = overlay.saveFirmConfig.mock.calls[0][2].quickfire.nodes
    expect(saved[0].id).not.toBe(saved[1].id)
  })

  test('a firm row keeps its id when the table is saved again — ids never renumber', async () => {
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    // The same row, now sitting at a different position than when it was created.
    await saveLogicTree(makeReq({
      params: { treeId: 'quickfire' },
      body: {
        branches: [
          { branch_name: 'A new one above it', condition: '', action: '', notes: '' },
          { id: 'firm-branch-0', branch_name: 'Created first', condition: '', action: '', notes: '' }
        ]
      }
    }), res)
    const saved = overlay.saveFirmConfig.mock.calls[0][2].quickfire.nodes
    expect(saved.find(n => n.branch_name === 'Created first').id).toBe('firm-branch-0')
  })

  test('a generated id never collides with a platform node id', async () => {
    const logicTrees = require('../../server/utils/logicTrees')
    const base = logicTrees.loadLogicTrees().find(t => t.id === 'quickfire')
    const platformIds = new Set((base.nodes || []).map(n => n.id))
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'quickfire' },
      body: { branches: [{ branch_name: 'Firm Extra', condition: '', action: '', notes: '' }] }
    }), res)
    const saved = overlay.saveFirmConfig.mock.calls[0][2].quickfire.nodes
    expect(platformIds.has(saved[0].id)).toBe(false)
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

/**
 * Item 4.16 C — the opening question and the standing rules on this screen.
 *
 * The prompt half is pinned in tests/unit/logicTreeOpeningQuestion.test.js. What
 * matters HERE is that the screen offers an edit exactly where the engine reads
 * one, and that a saved edit goes home to the array it came from. Approved
 * artefact: design/LEARN-TREE-OPENING-QUESTION-FIELD.md.
 */
describe('the opening question on the Logic Tables screen', () => {
  test('a learn table with one returns it, so the editor can show a box', async () => {
    const res = makeMockRes()
    await getLogicTreeDetail(makeReq({ params: { treeId: 'eoy_meeting' } }), res)
    expect(typeof res._body.openingQuestion).toBe('string')
    expect(res._body.openingQuestion).toContain('Where are you in the EOY meeting process')
  })

  // The box must not appear where an edit would reach nothing — that is item
  // 4.16 in miniature, and the reason the gate here is the prompt's gate.
  test('a table without one returns null, so the editor shows no box', async () => {
    const logicTrees = require('../../server/utils/logicTrees')
    const without = logicTrees.effectiveTrees(null).filter(t => !t.stage_entry_question)
    expect(without.length).toBe(29)
    for (const tree of without) {
      const res = makeMockRes()
      await getLogicTreeDetail(makeReq({ params: { treeId: tree.id } }), res)
      expect(res._body.openingQuestion).toBeNull()
    }
  })

  test('the question returned is the RESOLVED one — a firm sees its own edit', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ eoy_meeting: { stage_entry_question: 'Our own wording.' } })
    const res = makeMockRes()
    await getLogicTreeDetail(makeReq({ params: { treeId: 'eoy_meeting' } }), res)
    expect(res._body.openingQuestion).toBe('Our own wording.')
  })

  test('a firm that has written none inherits the tier above, not an empty box', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ eoy_meeting: { nodes: [] } })
    const res = makeMockRes()
    await getLogicTreeDetail(makeReq({ params: { treeId: 'eoy_meeting' } }), res)
    expect(res._body.openingQuestion).toContain('Where are you in the EOY meeting process')
  })

  test('a save stores the edited question in the shared bundle', async () => {
    overlay.saveFirmConfig.mockResolvedValue(4)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'eoy_meeting' },
      body: { branches: [], openingQuestion: '  Where are you up to?  ' }
    }), res)
    expect(res._status).toBe(200)
    const map = overlay.saveFirmConfig.mock.calls[0][2]
    expect(map.eoy_meeting.stage_entry_question).toBe('Where are you up to?')
  })

  // The field shares one Save button with the branch table, but a hand-made
  // request need not send both — and silence must not be read as "delete it".
  test('a body that omits the question leaves a stored one alone', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ eoy_meeting: { stage_entry_question: 'Kept.' } })
    overlay.saveFirmConfig.mockResolvedValue(5)
    const res = makeMockRes()
    await saveLogicTree(makeReq({ params: { treeId: 'eoy_meeting' }, body: { branches: [] } }), res)
    expect(res._status).toBe(200)
    const map = overlay.saveFirmConfig.mock.calls[0][2]
    expect(map.eoy_meeting.stage_entry_question).toBe('Kept.')
  })

  test('an empty question is refused rather than stored', async () => {
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'eoy_meeting' },
      body: { branches: [], openingQuestion: '   ' }
    }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('an over-length question is refused — the value travels into every session', async () => {
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'eoy_meeting' },
      body: { branches: [], openingQuestion: 'x'.repeat(801) }
    }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.message).toContain('800')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('the longest question the platform authored still fits inside the cap', () => {
    const logicTrees = require('../../server/utils/logicTrees')
    const longest = logicTrees.effectiveTrees(null)
      .filter(t => t.stage_entry_question)
      .reduce((a, t) => Math.max(a, t.stage_entry_question.length), 0)
    expect(longest).toBeLessThan(800)
  })

  test('a table with no opening question refuses one rather than storing it unseen', async () => {
    const logicTrees = require('../../server/utils/logicTrees')
    const without = logicTrees.effectiveTrees(null).find(t => !t.stage_entry_question)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: without.id },
      body: { branches: [], openingQuestion: 'Sneaked in.' }
    }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('the standing rules on the Logic Tables screen', () => {
  test('public_speaking shows its two standing rules, tagged and last', async () => {
    const res = makeMockRes()
    await getLogicTreeDetail(makeReq({ params: { treeId: 'public_speaking' } }), res)
    const rows = res._body.branches
    const standing = rows.filter(r => r.kind === 'standing')
    expect(standing.map(r => r.branch_name)).toEqual(['Networking Boundaries', 'Event Conclusion'])
    // Last, because they are not part of the staged sequence.
    expect(rows.slice(-2)).toEqual(standing)
    expect(rows.filter(r => r.kind === 'branch')).toHaveLength(8)
  })

  test('every other row on every table is a plain branch', async () => {
    const logicTrees = require('../../server/utils/logicTrees')
    for (const tree of logicTrees.effectiveTrees(null).filter(t => t.id !== 'public_speaking')) {
      const res = makeMockRes()
      await getLogicTreeDetail(makeReq({ params: { treeId: tree.id } }), res)
      expect(res._body.branches.every(r => r.kind === 'branch')).toBe(true)
    }
  })

  // The rail badge is the count of what the screen shows and saves. It read 8
  // while the table held 10, because two of them were in an array nothing looked at.
  test('the rail count includes the standing rules', async () => {
    const res = makeMockRes()
    await getLogicTrees(makeReq(), res)
    const ps = res._body.getTheJob.find(t => t.id === 'public_speaking')
    expect(ps.count).toBe(10)
  })

  test('a reworded standing rule goes home to flat_branches, never into the walk', async () => {
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'public_speaking' },
      body: {
        branches: [
          { id: 'ps_networking', kind: 'standing', branch_name: 'Networking Boundaries', condition: 'REWORDED', action: 'a', notes: 'n' },
          { id: 'ps_conclusion', kind: 'standing', branch_name: 'Event Conclusion', condition: 'c', action: 'a', notes: 'n' }
        ]
      }
    }), res)
    expect(res._status).toBe(200)
    const saved = overlay.saveFirmConfig.mock.calls[0][2].public_speaking
    expect(saved.flat_branches.map(b => b.id)).toEqual(['ps_networking', 'ps_conclusion'])
    expect(saved.flat_branches[0].condition).toBe('REWORDED')
    // The staged list is untouched by a standing-rule edit, and no standing rule
    // has leaked into it.
    expect(saved.nodes.some(n => n.id === 'ps_networking')).toBe(false)
  })

  test('a standing rule keeps the templates the platform authored on it', async () => {
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'public_speaking' },
      body: {
        branches: [
          { id: 'ps_networking', kind: 'standing', branch_name: 'N', condition: 'c', action: 'a', notes: 'n' },
          { id: 'ps_conclusion', kind: 'standing', branch_name: 'E', condition: 'c', action: 'a', notes: 'n' }
        ]
      }
    }), res)
    const saved = overlay.saveFirmConfig.mock.calls[0][2].public_speaking
    const conclusion = saved.flat_branches.find(b => b.id === 'ps_conclusion')
    expect(conclusion.templates).toEqual(['Get. Seminar Feedback Form'])
  })

  // The guard AND the scope rule in one: standing rules can be reworded, not
  // created. A hand-made request cannot mint a new flat_branches entry by
  // claiming `kind` for an id the platform never authored there.
  test('a forged standing row with an unknown id becomes an ordinary branch', async () => {
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'public_speaking' },
      body: { branches: [{ id: 'made-up', kind: 'standing', branch_name: 'Forged', condition: 'c', action: 'a', notes: '' }] }
    }), res)
    const saved = overlay.saveFirmConfig.mock.calls[0][2].public_speaking
    expect((saved.flat_branches || []).some(b => b.branch_name === 'Forged')).toBe(false)
    expect(saved.nodes.some(n => n.branch_name === 'Forged')).toBe(true)
  })

  // An older client posting the pre-4.16 shape knows nothing about standing
  // rules. Its silence must not be read as "the firm deleted both".
  test('a body with no kind at all leaves the standing rules untouched', async () => {
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'public_speaking' },
      body: { branches: [{ id: 'ps_stage1', branch_name: 'S1', condition: 'c', action: 'a', notes: '' }] }
    }), res)
    const saved = overlay.saveFirmConfig.mock.calls[0][2].public_speaking
    expect(saved.flat_branches).toBeUndefined()
  })

  test('a table with no standing rules never stores an empty flat_branches', async () => {
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'eoy_meeting' },
      body: { branches: [{ id: 'x', kind: 'branch', branch_name: 'B', condition: 'c', action: 'a', notes: '' }] }
    }), res)
    expect(overlay.saveFirmConfig.mock.calls[0][2].eoy_meeting.flat_branches).toBeUndefined()
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

describe('POST /logic-trees/:treeId/section (re-file, display-only)', () => {
  test('an invalid section is a clean 400 and saves nothing', async () => {
    const res = makeMockRes()
    await setLogicTreeSection(makeReq({ params: { treeId: 'eoy_meeting' }, body: { section: 'nonsense' } }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('an unknown table id is a clean 404', async () => {
    const res = makeMockRes()
    await setLogicTreeSection(makeReq({ params: { treeId: 'no_such_tree' }, body: { section: 'getTheJob' } }), res)
    expect(res._status).toBe(404)
  })

  test('a move stores the item under the SEPARATE sections key (never the content key)', async () => {
    overlay.loadFirmConfig.mockResolvedValue({}) // no prior placements
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    // eoy_meeting defaults to Do the Job; move it to Get the Job.
    await setLogicTreeSection(makeReq({ params: { treeId: 'eoy_meeting' }, body: { section: 'getTheJob' } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toMatchObject({ moved: true, treeId: 'eoy_meeting', section: 'getTheJob' })
    const [firmId, key, map] = overlay.saveFirmConfig.mock.calls[0]
    expect(firmId).toBe('firm-test-123')
    expect(key).toBe('logic-tree-sections') // NOT 'logic-trees' — placement is separate from content
    expect(map).toEqual({ eoy_meeting: 'getTheJob' })
  })

  test('moving an item back to its default clears the override', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ eoy_meeting: 'getTheJob' }) // previously moved
    overlay.saveFirmConfig.mockResolvedValue(2)
    const res = makeMockRes()
    // eoy_meeting's platform default is Do the Job.
    await setLogicTreeSection(makeReq({ params: { treeId: 'eoy_meeting' }, body: { section: 'doTheJob' } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig.mock.calls[0][2]).toEqual({}) // override removed → sparse
  })

  test('the list route files a moved table under the firm section, not its default', async () => {
    // Key-aware mock: the sections key returns a placement; the content key does not.
    overlay.loadFirmConfig.mockImplementation((firmId, key) =>
      Promise.resolve(key === 'logic-tree-sections' ? { eoy_meeting: 'getTheJob' } : null))
    const res = makeMockRes()
    await getLogicTrees(makeReq(), res)
    expect(res._body.getTheJob.map(t => t.id)).toContain('eoy_meeting') // moved here
    expect(res._body.doTheJob.map(t => t.id)).not.toContain('eoy_meeting') // gone from default
  })
})

describe('POST /domain-support/:domainId/section (re-file, display-only)', () => {
  test('an invalid section is a clean 400', async () => {
    const res = makeMockRes()
    await setDomainSupportSection(makeReq({ params: { domainId: 'eoy' }, body: { section: 'nope' } }), res)
    expect(res._status).toBe(400)
  })

  test('an unknown domain id is a clean 404', async () => {
    const res = makeMockRes()
    await setDomainSupportSection(makeReq({ params: { domainId: 'not-a-domain' }, body: { section: 'getTheJob' } }), res)
    expect(res._status).toBe(404)
  })

  test('a move stores under the domain-support sections key', async () => {
    overlay.loadFirmConfig.mockResolvedValue({})
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await setDomainSupportSection(makeReq({ params: { domainId: 'eoy' }, body: { section: 'getOrganised' } }), res)
    expect(res._status).toBe(200)
    const [, key, map] = overlay.saveFirmConfig.mock.calls[0]
    expect(key).toBe('domain-support-sections')
    expect(map).toEqual({ eoy: 'getOrganised' })
  })
})

describe('the THEN column reaches every field a node keeps its instruction in', () => {
  /**
   * 55 branches across 8 tables hold their instruction in `recommendation` and
   * have neither `action` nor `question`, so the editor used to render an empty
   * THEN box — the mentor could see the branch but not the sentence, and could
   * not correct "Use Get Seminar template" in the app at all.
   */
  test('a recommendation-only branch is no longer blank on screen', async () => {
    const res = makeMockRes()
    await getLogicTreeDetail(makeReq({ params: { treeId: 'get_seminar' } }), res)
    expect(res._status).toBe(200)
    const row = res._body.branches.find(b => b.id === 'gs_audience_negativity')
    expect(row).toBeTruthy()
    // Was 'Use Get Seminar template' until 2026-08-15, when Mike named the page
    // that actually exists. The branch was never blank — it is what the branch
    // NAMES that changed, and this row is the one the gate used to cut back to
    // its second sentence.
    expect(row.action).toContain('Use Design & Deliver template')
  })

  test('a reworded recommendation goes home to `recommendation`, never to `action`', async () => {
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'get_seminar' },
      body: {
        branches: [{
          id: 'gs_audience_negativity',
          branch_name: 'Audience Engagement — Preemptive Negativity',
          condition: 'unchanged',
          action: 'Use Design & Deliver. Address known objections at the opening.',
          notes: 'unchanged'
        }]
      }
    }), res)
    expect(res._status).toBe(200)

    const [, , map] = overlay.saveFirmConfig.mock.calls[0]
    const saved = map.get_seminar.nodes.find(n => n.id === 'gs_audience_negativity')
    expect(saved.recommendation).toBe('Use Design & Deliver. Address known objections at the opening.')

    // 🔴 THE SAFETY CLAIM. `recommendation` is gated sentence-by-sentence by the
    // tool-name check; `action` is not. Landing the edit in `action` would carry
    // it past that gate silently, so the absence of the key IS the assertion.
    expect(Object.prototype.hasOwnProperty.call(saved, 'action')).toBe(false)
  })

  test('a pure-question node still round-trips to `question`', async () => {
    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'get_seminar' },
      body: { branches: [{ id: 'gs_entry', branch_name: 'B', condition: 'c', action: 'Which challenge?', notes: 'n' }] }
    }), res)
    expect(res._status).toBe(200)
    const [, , map] = overlay.saveFirmConfig.mock.calls[0]
    const saved = map.get_seminar.nodes.find(n => n.id === 'gs_entry')
    expect(saved.question).toBe('Which challenge?')
    expect(Object.prototype.hasOwnProperty.call(saved, 'action')).toBe(false)
  })

  test('an ordinary branch still writes to `action`', async () => {
    const logicTrees = require('../../server/utils/logicTrees')
    const base = logicTrees.loadLogicTrees().find(t => t.id === 'quickfire')
    const acting = (base.nodes || []).find(n => typeof n.action === 'string' && n.action !== '')
    expect(acting).toBeTruthy() // guard: the fixture still has an action node

    overlay.saveFirmConfig.mockResolvedValue(1)
    const res = makeMockRes()
    await saveLogicTree(makeReq({
      params: { treeId: 'quickfire' },
      body: { branches: [{ id: acting.id, branch_name: 'B', condition: 'c', action: 'reworded', notes: 'n' }] }
    }), res)
    expect(res._status).toBe(200)
    const [, , map] = overlay.saveFirmConfig.mock.calls[0]
    const saved = map.quickfire.nodes.find(n => n.id === acting.id)
    expect(saved.action).toBe('reworded')
  })
})
