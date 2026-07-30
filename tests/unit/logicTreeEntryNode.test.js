'use strict'

/**
 * The entry point of a logic tree is DATA, not array position.
 *
 * `walkLogicTree` used to start at `tree.nodes[0].id`, which quietly made row
 * order part of the flow: promoting a different branch repointed where the
 * engine began reasoning. That blocked firms from reordering rows for
 * readability (Firm Manager → Logic Tables). `entry_node` records the start
 * explicitly so order becomes presentation only.
 *
 * These tests exist to stop that regressing — the failure mode is silent, and
 * `walkLogicTree` runs on live sessions (advisorEngine template hints, and the
 * zero-candidate fallback).
 */

const { walkLogicTree, effectiveTrees } = require('../../server/utils/logicTrees')

// The override must ride on a REAL tree id: effectiveTrees merges a firm map
// over the platform set and drops ids it does not recognise, so a wholly
// invented tree would silently vanish and every assertion would pass vacuously.
// deepMerge replaces arrays wholesale, so supplying `nodes` swaps the graph.
const REAL_TREE_ID = 'quickfire'

// A small two-branch graph. Signal text is built from the state, so 'alpha' /
// 'beta' in the answer patterns decide which way the walk goes.
function makeTree (overrides) {
  return Object.assign({
    entry_node: 'start',
    nodes: [
      {
        id: 'start',
        branch_name: 'Start here',
        type: 'question',
        question: 'Which way?',
        branches: [
          { answer_pattern: 'alpha pathway', next_node: 'alpha' },
          { answer_pattern: 'beta pathway', next_node: 'beta' }
        ]
      },
      { id: 'alpha', branch_name: 'Alpha', type: 'recommendation', templates: ['Alpha Template'] },
      { id: 'beta', branch_name: 'Beta', type: 'recommendation', templates: ['Beta Template'] }
    ]
  }, overrides || {})
}

// Must be a field buildSignalText actually reads — `coreProblem` is not one of
// them, and a state it ignores produces an empty signal, a score of 0, and a
// walk that stops at the entry node while every assertion passes vacuously.
const ALPHA_STATE = { clientRaisedIssue: 'we need the alpha pathway please' }

/** Walk the test graph by overriding a real tree, never the data file itself. */
function walk (tree, state) {
  return walkLogicTree(state || ALPHA_STATE, REAL_TREE_ID, { [REAL_TREE_ID]: tree })
}

describe('entry_node — the tree says where it starts', () => {
  test('the walk begins at entry_node', () => {
    expect(walk(makeTree())).toEqual(['Alpha Template'])
  })

  test('REORDERING THE ROWS DOES NOT CHANGE THE WALK — the whole point', () => {
    const before = walk(makeTree())

    // Move the entry node to the bottom, exactly as a firm dragging rows would.
    const reordered = makeTree()
    const [start] = reordered.nodes.splice(0, 1)
    reordered.nodes.push(start)
    expect(reordered.nodes[0].id).not.toBe('start') // genuinely reordered

    expect(walk(reordered)).toEqual(before)
  })

  // A falsy entry_node takes the same branch as a tree that never had the
  // field — the legacy, position-based path.
  test('without entry_node it still starts at the first row, as it always did', () => {
    expect(walk(makeTree({ entry_node: '' }))).toEqual(['Alpha Template'])
  })

  test('an entry_node naming a node that does not exist falls back rather than walking nothing', () => {
    expect(walk(makeTree({ entry_node: 'no_such_node' }))).toEqual(['Alpha Template'])
  })
})

describe('the real tree data', () => {
  const trees = effectiveTrees(null)

  test('every node-shaped tree records its entry point', () => {
    const missing = trees
      .filter(t => Array.isArray(t.nodes) && t.nodes.length)
      .filter(t => !t.entry_node)
      .map(t => t.id)
    expect(missing).toEqual([])
  })

  test('every entry_node names a node that actually exists in its tree', () => {
    const dangling = trees
      .filter(t => t.entry_node && Array.isArray(t.nodes))
      .filter(t => !t.nodes.some(n => n.id === t.entry_node))
      .map(t => t.id)
    expect(dangling).toEqual([])
  })

  test('the recorded entry still matches the first row — nothing was repointed by the migration', () => {
    const moved = trees
      .filter(t => t.entry_node && Array.isArray(t.nodes) && t.nodes.length)
      .filter(t => t.entry_node !== t.nodes[0].id)
      .map(t => t.id)
    expect(moved).toEqual([])
  })
})
