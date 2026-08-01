'use strict'

/**
 * GUARD — the Organisational Review conversations must OPEN the staff table.
 *
 * Why this file exists. The 8 Organisational Review branches added to
 * `staff_performance` on 2026-07-31 were measured correct: forced open, every one
 * of the 8 rules reaches its own node and its own pages. Nothing forces the table
 * open in production. A table is chosen by detectLogicTree (server/utils/
 * logicTrees.js), which counts how many of a tree's `entry_triggers` appear as
 * plain substrings of the advisor's words — and `staff_performance`'s 37 triggers
 * were all performance language (staff, morale, hiring, productivity). Measured
 * against the live detector, "nobody knows who reports to whom and the org chart
 * is a mess" selected NO TREE AT ALL. The content rendered, saved, and passed
 * every one of the 2,043 tests while being unreachable.
 *
 * That is the fourth right-content/wrong-lane defect in three days, and the
 * lesson recorded each time is the same: routing behaviour is covered by no test,
 * so it is caught by hand or not at all. The Sales & Marketing regression on
 * 2026-07-31 — a new branch whose ordinary words out-scored the two branches that
 * owned them — passed the entire suite while it was live, and was caught only by
 * a manual before/after walk.
 *
 * This test is that control. It asserts the OUTCOME (which table opens for a
 * realistic sentence), never the trigger list itself: a test that re-listed the
 * 22 phrases would pass whatever the detector did with them, which is the
 * vacuous-guard trap. It runs the real detector against the real committed
 * data/logic_trees.json — no fixtures, and deliberately no `firmTrees` argument,
 * because that parameter MERGES onto the platform bundle and would make a
 * modified tree and the platform tree indistinguishable (the trap that produced a
 * worthless "no change" measurement on 2026-07-30).
 */

const { detectLogicTree, detectLogicTrees } = require('../../server/utils/logicTrees')

/**
 * Conversations the 8 Organisational Review branches were written for, in the
 * advisor's own words rather than the branch's vocabulary. Each names the branch
 * it is meant to reach, so a failure says which piece of content went dark.
 */
const ORG_REVIEW_OPENERS = [
  ['sp_org_alignment', 'nobody knows who reports to whom and the org chart is a mess'],
  ['sp_org_entry', 'there are no feedback loops and no accountability anywhere'],
  ['sp_org_entry', 'the reporting lines are unclear and decisions get made by nobody'],
  ['sp_org_values', 'our stated values mean nothing, nobody lives by them'],
  ['sp_org_values', 'there is a values clash between the two sides of the business'],
  ['sp_org_meetings', 'our meetings go nowhere, cynical snipes and sulking'],
  ['sp_org_habits', 'we need an organisational review, the structure has never been looked at']
]

/**
 * The staff paths that already worked before the Organisational Review branches
 * existed. Widening a trigger list can only ever ADD matches to its own tree, but
 * it can move which tree WINS — so these prove the original diagnosis still opens
 * the same table it always did. Every one was verified against the PRE-change
 * snapshot rather than assumed, which is how the two exclusions below were found.
 *
 * NOT in this list, deliberately — two People Power situations that open NO TABLE
 * AT ALL, measured on the pre-change file and therefore nothing to do with the
 * Organisational Review work:
 *   "the owners are not aligned and it is causing friction"  → sp_sit_owners_misaligned
 *   "considering offering shares to key staff to lock them in" → sp_sit_remuneration
 * They are the same right-content/wrong-lane defect this file guards, one layer
 * over, and are logged in design/ACTIONS.md rather than quietly folded in here:
 * fixing them widens which table fires and needs its own approval and its own
 * before/after measurement.
 */
const EXISTING_STAFF_OPENERS = [
  'my staff are driving me nuts',
  'my team engagement is lacking and it shows with customers',
  'we are hiring and want the right person',
  'we keep making operational mistakes and struggling to get work out the door',
  'we need to review remuneration and profit share'
]

/**
 * Words that read as if they belong to the organisational branches but are OWNED
 * by another table built for them. Taking them would move conversations that land
 * correctly today. Each pairing was measured, not assumed.
 */
const OWNED_BY_OTHERS = [
  ['confirmation bias', 'governance'],
  ['optimism bias', 'org_firm_board_pack'],
  ['job creep', 'fm_coach_culture'],
  ['enneagram', 'org_leadership']
]

describe('staff_performance entry triggers — the Organisational Review branches are reachable', () => {
  test.each(ORG_REVIEW_OPENERS)(
    'opens staff_performance for the %s conversation',
    (branchId, opener) => {
      const tree = detectLogicTree(opener)
      expect(tree).not.toBeNull()
      expect(tree.id).toBe('staff_performance')
    }
  )

  test('the branch each opener is meant to reach still exists in the tree', () => {
    const tree = detectLogicTree(ORG_REVIEW_OPENERS[0][1])
    const nodeIds = new Set(tree.nodes.map(n => n.id))
    for (const [branchId] of ORG_REVIEW_OPENERS) {
      expect(nodeIds.has(branchId)).toBe(true)
    }
  })

  test.each(EXISTING_STAFF_OPENERS)(
    'the pre-existing staff path still opens staff_performance: %s',
    (opener) => {
      const tree = detectLogicTree(opener)
      expect(tree).not.toBeNull()
      expect(tree.id).toBe('staff_performance')
    }
  )

  test.each(OWNED_BY_OTHERS)(
    'does not steal "%s" from %s',
    (phrase, ownerTreeId) => {
      const matched = detectLogicTrees(phrase).map(t => t.id)
      expect(matched).toContain(ownerTreeId)
      expect(matched).not.toContain('staff_performance')
    }
  )

  test('production reads the whole collected conversation, not just the opener', () => {
    // advisorEngine.js L2383 joins every collected answer into one block and runs
    // the detector over that. Two of the four realistic conversations measured on
    // 2026-07-31 reached the table only by accident, on the generic word "culture"
    // appearing in an unrelated answer; the structural ones reached nothing. This
    // asserts the shape production actually passes in.
    const collected = [
      'Opening situation: nobody knows who reports to whom and the org chart is a mess',
      'Primary issue (advisor-confirmed): The organisation structure is unclear',
      'Staff issue scope (individual vs team): It affects the whole organisation'
    ].join('\n')

    const tree = detectLogicTree(collected)
    expect(tree).not.toBeNull()
    expect(tree.id).toBe('staff_performance')
  })

  test('guards itself against passing vacuously', () => {
    // If the tree were renamed, removed, or emptied, every assertion above could
    // still pass against some other tree. Anchor the fixture set to reality.
    expect(ORG_REVIEW_OPENERS.length).toBeGreaterThanOrEqual(7)
    const tree = detectLogicTree('my staff are driving me nuts')
    expect(tree.entry_triggers.length).toBeGreaterThanOrEqual(37)
    expect(tree.nodes.length).toBeGreaterThanOrEqual(24)
  })
})
