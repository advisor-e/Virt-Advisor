'use strict'

/**
 * GUARD — an entry trigger must start at a word boundary.
 *
 * Why this file exists (2026-07-31). Trigger matching was a raw substring test,
 * so short triggers fired inside unrelated words. `staff_performance` carries the
 * trigger "HR": it matched t-HR-ee, t-HR-ough, s-HR-unk, c-HR-onic and
 * t-HR-eshold, and across the 51 Scenario Lab cases it opened the staff table in
 * ELEVEN of them — for conversations about margins, forecasting and due
 * diligence. "ratio" fired inside sepa-RATIO-n, ope-RATIO-nal and gene-RATIO-n;
 * "DD" inside a-DD-ed and mi-DD-le; "draw" inside with-DRAW-al. The single
 * clearest case: "the owner wants to retire in three years and has no plan" — a
 * textbook succession conversation — opened the STAFF table, on "three".
 *
 * Measured on the real committed data, old module against new in one process:
 * 8 of the 51 Scenario Lab cases changed table (five from the wrong table to the
 * right one), and 9 of 1,085 self-probes changed — every one of the nine from
 * some unrelated tree to its OWN tree.
 *
 * The boundary is LEADING ONLY, and that is a measured choice rather than a
 * stylistic one. Requiring a trailing boundary too — the "whole word" rule most
 * people reach for first — is worse here: it drops "margins", "benchmarked",
 * "management reports", "bottlenecks", "workflows", "avoided" and "drawings",
 * and costs one Scenario Lab case its correct table. Both halves of that rule are
 * asserted below, because a future tidy-up that adds `\b` to the end would pass
 * every other test in this repo.
 */

const MOCK_TREES = [
  {
    id: 'short_codes',
    name: 'Short Codes',
    description: 'Tree whose triggers are the short ones that caused the defect',
    entry_triggers: ['HR', 'DD', 'ratio', 'draw'],
    nodes: [{ id: 'root', branch_name: 'Root', type: 'assessment', condition: 'x' }]
  },
  {
    id: 'suffixable',
    name: 'Suffixable',
    description: 'Tree whose triggers are singular forms that must still catch plurals',
    entry_triggers: ['workflow', 'margin', 'bottleneck'],
    nodes: [{ id: 'root', branch_name: 'Root', type: 'assessment', condition: 'x' }]
  }
]

function requireWithMock (fileContent) {
  let mod
  jest.isolateModules(() => {
    jest.doMock('fs', () => ({
      readFileSync: jest.fn(() => JSON.stringify(fileContent))
    }))
    mod = require('../../server/utils/logicTrees')
  })
  return mod
}

/**
 * The module reading the REAL committed data/logic_trees.json.
 *
 * `jest.doMock('fs', …)` above is registered against the whole module registry,
 * so a plain require() here inherits the last fixture's fake readFileSync and the
 * real-data assertions silently test the fixture instead — they returned null
 * rather than failing loudly, which is the vacuous-guard trap. dontMock + a fresh
 * module registry is what actually reaches the file on disk.
 */
function requireReal () {
  let mod
  jest.isolateModules(() => {
    jest.dontMock('fs')
    mod = require('../../server/utils/logicTrees')
  })
  return mod
}

describe('entry triggers match only at a word boundary', () => {
  describe('a short trigger no longer fires inside an unrelated word', () => {
    const INSIDE_A_WORD = [
      ['HR inside "three"', 'the owner wants to retire in three years'],
      ['HR inside "through"', 'we went through the numbers together'],
      ['HR inside "shrunk"', 'their growth has shrunk this year'],
      ['HR inside "chronic"', 'it is a chronic problem'],
      ['ratio inside "separation"', 'there was no separation of family and business money'],
      ['ratio inside "operational"', 'this is an operational question'],
      ['DD inside "added"', 'the interest just added up'],
      ['DD inside "middle"', 'the middle managers are overloaded'],
      ['draw inside "withdrawal"', 'the withdrawal was unexpected']
    ]

    test.each(INSIDE_A_WORD)('%s', (_why, message) => {
      const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
      expect(detectLogicTree(message)).toBeNull()
    })
  })

  describe('a trigger still fires as a whole word, and still runs on into suffixes', () => {
    const SHOULD_MATCH = [
      ['exact word', 'we should review HR properly', 'short_codes'],
      ['lower case in the message', 'the hr function is a mess', 'short_codes'],
      ['start of a sentence', 'ratio analysis is what they need', 'short_codes'],
      ['plural — the trailing-boundary trap', 'their margins keep shrinking', 'suffixable'],
      ['plural of a compound', 'the workflows are undocumented', 'suffixable'],
      ['plural again', 'there are bottlenecks everywhere', 'suffixable'],
      ['suffix, not a plural', 'we drew up a plan and are drawing another', 'short_codes']
    ]

    test.each(SHOULD_MATCH)('%s', (_why, message, expectedId) => {
      const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
      const tree = detectLogicTree(message)
      expect(tree).not.toBeNull()
      expect(tree.id).toBe(expectedId)
    })
  })

  test('a hyphen is a word boundary, so a compound still matches its parts', () => {
    // "passive-aggressive" is a real trigger; a trigger must also survive being
    // preceded by punctuation rather than a space.
    const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
    expect(detectLogicTree('the debtor-ratio is wrong')).not.toBeNull()
  })

  test('detectLogicTrees applies the same rule as detectLogicTree', () => {
    // The scorer is shared. If one is ever changed without the other, the two
    // paths disagree — and the recommendation path uses the plural one, so the
    // discrepancy would be invisible in Learn mode.
    const { detectLogicTree, detectLogicTrees } = requireWithMock({ trees: MOCK_TREES })
    expect(detectLogicTrees('we went through the numbers')).toEqual([])
    expect(detectLogicTrees('their margins keep shrinking').map(t => t.id)).toEqual(['suffixable'])
    expect(detectLogicTree('we went through the numbers')).toBeNull()
  })

  test('a firm-authored trigger containing regex characters cannot throw', () => {
    // entry_triggers are firm-editable (FIRM-EDITABLE-TABLES-PLAN §3). No
    // committed trigger contains a regex metacharacter today — all 1,005 were
    // checked — but an unescaped "(" from a firm override would throw at request
    // time, taking down detection for that firm rather than simply not matching.
    const { detectLogicTree } = requireWithMock({
      trees: [{
        id: 'hostile',
        name: 'Hostile',
        description: 'd',
        entry_triggers: ['profit (net)', 'a+b', '[unclosed', 'back\\slash'],
        nodes: [{ id: 'root', branch_name: 'Root', type: 'assessment', condition: 'x' }]
      }]
    })
    expect(() => detectLogicTree('nothing relevant here')).not.toThrow()
    expect(detectLogicTree('nothing relevant here')).toBeNull()
    // and it matches literally, not as a pattern
    expect(detectLogicTree('we discussed profit (net) last week').id).toBe('hostile')
    expect(detectLogicTree('a+b was the formula').id).toBe('hostile')
  })

  test('the real committed data: "chronic debtors" reaches working capital, not staff', () => {
    // Anchored to the real file rather than a fixture, because the defect was
    // only visible against real trigger lists. Pre-change this scored
    // staff_performance on the "HR" inside "chronic".
    const { detectLogicTree } = requireReal()
    const tree = detectLogicTree('chronic debtors')
    expect(tree).not.toBeNull()
    expect(tree.id).toBe('working_capital_cycle')
  })

  test('the real committed data: a succession conversation no longer opens the staff table', () => {
    const { detectLogicTree } = requireReal()
    const tree = detectLogicTree('the owner wants to retire in three years and has no plan')
    // It does not yet reach `succession` — that tree has no trigger for this
    // phrasing, which is the separate trigger-vocabulary gap logged in ACTIONS.md.
    // What matters here is that it no longer reaches the WRONG table.
    expect(tree === null || tree.id !== 'staff_performance').toBe(true)
  })
})
