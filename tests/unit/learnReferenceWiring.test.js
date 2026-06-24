'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// LEARN-MODE WIRING for the "Get the Job" trees (2026-06-23).
//
// Eight logic trees that carry real advisor-development IP were loaded but reached
// no mode — five used a second schema (`flat_if_then`, rules at `tree.branches`,
// no `nodes`) that no consumer read, and three node trees were tagged for the
// wrong mode. This locks the Stage-1 fix: the seven Get-the-Job trees are tagged
// `mode: 'learn'` and `buildLearnReferenceText` formats both schemas, so each
// produces real Learn-mode reference content.
//
// Boundary guard: these are Get-the-Job tools — they must surface in Learn mode
// only, never leak into the client recommendation path (design §2.5). The client
// soft-hint walks `nodes` and skips `mode === 'learn'` trees, so this is covered;
// the explicit assertion below keeps it that way.
// ─────────────────────────────────────────────────────────────────────────────

const data = require('../../data/logic_trees.json')
const { buildLearnReferenceText, walkLogicTree, isClientDeliveryLearnTree } = require('../../server/utils/logicTrees')

const GET_THE_JOB_LEARN_TREES = [
  'get_marketing',
  'get_positioning',
  'get_sales_tracker',
  'get_team_problem',
  'get_pricing_proposals',
  'get_seminar',
  'org_leadership'
]

const FLAT_TREES = ['get_marketing', 'get_positioning', 'get_sales_tracker', 'get_team_problem', 'get_pricing_proposals']

function tree (id) { return (data.trees || []).find(t => t.id === id) }

describe('Get-the-Job trees are wired into Learn mode', () => {
  for (const id of GET_THE_JOB_LEARN_TREES) {
    describe(id, () => {
      test('is tagged mode: learn', () => {
        expect(tree(id).mode).toBe('learn')
      })

      test('produces real Learn-mode reference content (not just a header)', () => {
        const ref = buildLearnReferenceText(tree(id))
        expect(ref).toBeTruthy()
        // A bare header (no body) is ~ the description only; real content is well beyond it.
        expect(ref.length).toBeGreaterThan(tree(id).description.length + 200)
      })
    })
  }

  test('flat_if_then trees render their branch rules (condition/action/templates)', () => {
    for (const id of FLAT_TREES) {
      const ref = buildLearnReferenceText(tree(id))
      expect(ref).toMatch(/Condition:/)
      expect(ref).toMatch(/Action:/)
      expect(ref).toMatch(/Templates:/) // the branch-level template recommendations now surface
    }
  })

  test('BOUNDARY: Get-the-Job learn trees never leak into the client walk path', () => {
    // walkLogicTree drives the client recommendation hint. A Get-the-Job tree must
    // contribute nothing there — Get-the-Job content is for advisors, not clients.
    const state = { detectedDomain: 'sales-marketing', clientRaisedIssue: 'marketing growth pricing team', situationDiagnostic: 'messy records' }
    for (const id of GET_THE_JOB_LEARN_TREES) {
      expect(walkLogicTree(state, id)).toEqual([])
    }
  })

  test('BOUNDARY: advisor-BD / firm trees are barred from the client-mode deep-dive', () => {
    // These mean the OPPOSITE thing in a client session (advisor selling THEIR services
    // vs the client's business) — they must never surface mid-client-conversation.
    for (const id of GET_THE_JOB_LEARN_TREES) {
      expect(isClientDeliveryLearnTree(tree(id))).toBe(false)
    }
    // ...including the pre-existing leak this also closes.
    expect(isClientDeliveryLearnTree(tree('sales_process'))).toBe(false)
    expect(isClientDeliveryLearnTree(tree('public_speaking'))).toBe(false)
  })

  test('client-delivery learn trees ARE still allowed to deep-dive', () => {
    // The deep-dive must keep working for genuine client-delivery coaching.
    for (const id of ['dashboard_discussions', 'ratio_analysis', 'working_capital_cycle', 'conflict_meeting']) {
      expect(isClientDeliveryLearnTree(tree(id))).toBe(true)
    }
  })
})
