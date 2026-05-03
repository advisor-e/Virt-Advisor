'use strict'

// Mock data for the logic tree detection algorithm.
// Tests are isolated from the real data/logic_trees.json file.
const MOCK_TREES = [
  {
    id: 'profit',
    name: 'Profit & Revenue Growth',
    description: 'For advisors focused on fee growth and revenue improvement',
    entry_triggers: ['profit', 'revenue', 'fees', 'margin'],
    nodes: [
      { id: 'root', branch_name: 'Revenue Assessment', type: 'assessment', condition: 'initial check' }
    ]
  },
  {
    id: 'staff',
    name: 'Staff & Team Management',
    description: 'For advisors dealing with team issues',
    entry_triggers: ['staff', 'team', 'hire', 'employee', 'culture'],
    nodes: [
      { id: 'root', branch_name: 'Team Assessment', type: 'assessment', condition: 'initial check' }
    ]
  }
]

// requireWithMock loads a fresh copy of logicTrees.js isolated from the module cache
// and with a controlled fs mock — so the module-level _trees cache is always clean.
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

describe('detectLogicTree', () => {
  describe('no match cases', () => {
    test('returns null when message contains no known keywords', () => {
      const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
      expect(detectLogicTree('hello, the weather is nice today')).toBeNull()
    })

    test('returns null when tree list is empty', () => {
      const { detectLogicTree } = requireWithMock({ trees: [] })
      expect(detectLogicTree('profit revenue fees margin')).toBeNull()
    })

    test('returns null when data file fails to load', () => {
      let mod
      jest.isolateModules(() => {
        jest.doMock('fs', () => ({
          readFileSync: jest.fn(() => { throw new Error('ENOENT: file not found') })
        }))
        mod = require('../../server/utils/logicTrees')
      })
      expect(mod.detectLogicTree('profit')).toBeNull()
    })

    test('returns null for an empty message string', () => {
      const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
      expect(detectLogicTree('')).toBeNull()
    })
  })

  describe('single match cases', () => {
    test('returns the matching tree when one trigger keyword is present', () => {
      const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
      const result = detectLogicTree('my client is worried about profit')
      expect(result).not.toBeNull()
      expect(result.id).toBe('profit')
    })

    test('returns the staff tree when a staff keyword is detected', () => {
      const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
      const result = detectLogicTree('I need help hiring new team members')
      expect(result).not.toBeNull()
      expect(result.id).toBe('staff')
    })

    test('returned object has expected tree shape (name, nodes)', () => {
      const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
      const result = detectLogicTree('revenue has been declining')
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('nodes')
      expect(Array.isArray(result.nodes)).toBe(true)
    })
  })

  describe('multi-match scoring', () => {
    test('returns the highest-scoring tree when multiple trees match', () => {
      const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
      // 3 profit triggers, 1 staff trigger — profit should win
      const result = detectLogicTree('profit revenue fees but also team')
      expect(result.id).toBe('profit')
    })

    test('returns the tree with more matching triggers, not just first match', () => {
      const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
      // 3 staff triggers, 1 profit trigger — staff should win
      const result = detectLogicTree('staff team culture but also revenue')
      expect(result.id).toBe('staff')
    })
  })

  describe('case sensitivity', () => {
    test('matches keywords regardless of message case', () => {
      const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
      const result = detectLogicTree('PROFIT MARGIN IS TOO LOW')
      expect(result).not.toBeNull()
      expect(result.id).toBe('profit')
    })

    test('matches mixed-case keywords', () => {
      const { detectLogicTree } = requireWithMock({ trees: MOCK_TREES })
      const result = detectLogicTree('Revenue Has Been Declining')
      expect(result).not.toBeNull()
    })
  })
})
