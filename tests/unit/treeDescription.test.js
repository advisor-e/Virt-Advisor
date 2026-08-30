'use strict'

// Item 4.18, the ROUTING half. Four of the twenty-one learn trees carry no
// `description` — ratio_analysis, dashboard_discussions, working_capital_cycle and
// demings_volatility. They are the four financial methods, the only four whose
// vocabulary genuinely overlaps, and the seventeen that are easy to tell apart all
// carry a paragraph. Two consumers were affected and neither said anything:
//   1. the tree's own prompt header emitted a blank line where its subject belongs;
//   2. pickLearnTreeAI's menu offered the picker two bare labels to choose between.
//
// The sentence is NOT authored here. Each of the four companion reference files
// already opens with one, so treeDescription reads it. A second copy in
// logic_trees.json would be a second thing to keep level by hand, and the copy nobody
// edits is the one the AI reads.

const {
  treeDescription,
  formatLogicTreeForPrompt,
  loadLogicTrees
} = require('../../server/utils/logicTrees')

const treeById = id => loadLogicTrees().find(t => t.id === id)
const THE_FOUR = ['ratio_analysis', 'dashboard_discussions', 'working_capital_cycle', 'demings_volatility']

describe('treeDescription', () => {
  test('every learn tree can say what it is', () => {
    // The guard that matters: a NEW learn tree added with no description, whose guide
    // also has none, would arrive at the picker as a bare label — silently, exactly as
    // these four did. This fails the build instead.
    const silent = loadLogicTrees()
      .filter(t => t.mode === 'learn' && !treeDescription(t))
      .map(t => t.id)
    expect(silent).toEqual([])
  })

  test('the four financial trees fall back to their guide\'s own summary', () => {
    for (const id of THE_FOUR) {
      const tree = treeById(id)
      expect(tree.description).toBeFalsy() // still absent on the tree itself
      const desc = treeDescription(tree)
      expect(desc.length).toBeGreaterThan(80)
      // It is the guide file's sentence, not something composed here.
      const guide = require('../../server/utils/methodGuides').loadGuideBase(id)
      expect(desc).toBe(guide.description)
    }
  })

  test('the four are distinguishable from each other within the picker\'s 150-char slice', () => {
    // This is the actual failure being fixed: the picker chose between "Ratio Analysis"
    // and "Dashboard Discussions" on the labels alone. A fallback that truncated to an
    // identical preamble would fix nothing, so the slice the picker uses is what is
    // checked — not the full sentence.
    const slices = THE_FOUR.map(id => treeDescription(treeById(id)).slice(0, 150))
    expect(new Set(slices).size).toBe(THE_FOUR.length)
  })

  test('a tree\'s own description always wins over the guide\'s', () => {
    // The fallback fills a gap; it must never override an authored sentence, so
    // authoring one on a tree later takes effect with no code change.
    const eoy = treeById('eoy_meeting')
    expect(eoy.description).toBeTruthy()
    expect(treeDescription(eoy)).toBe(eoy.description)
  })

  test('returns an empty string rather than throwing for a tree with no guide', () => {
    expect(treeDescription(null)).toBe('')
    expect(treeDescription({ id: 'no_such_tree' })).toBe('')
  })
})

describe('the tree prompt header', () => {
  test('no longer opens with a blank line for the four', () => {
    for (const id of THE_FOUR) {
      const header = formatLogicTreeForPrompt(treeById(id)).split('\n')
      // [0] is the heading, [1] blank, [2] is where the subject sentence belongs.
      expect(header[2].trim().length).toBeGreaterThan(80)
    }
  })
})
