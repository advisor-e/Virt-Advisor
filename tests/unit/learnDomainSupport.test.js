'use strict'

// Learn-mode enrichment (Mike's ruling 2026-07-16): a Learn coaching tree may
// resolve to a domain-support file — explicit data mapping first, exact
// name-conversion second, NEVER a guess. These tests read the real data/
// directory, so they also lock the wiring: the three aliased trees in
// logic_trees.json must keep pointing at files that actually exist.

const { supportIdForLearnTree, formatDomainSupportForPrompt } = require('../../server/utils/domainSupport')
const { loadLogicTrees } = require('../../server/utils/logicTrees')

describe('supportIdForLearnTree — resolution rules', () => {
  test('an explicit data mapping wins (sales_process → get-sales)', () => {
    expect(supportIdForLearnTree({ id: 'sales_process', domainSupport: 'get-sales' })).toBe('get-sales')
  })

  test('an explicit mapping to a file that does not exist resolves to null — never a broken injection', () => {
    expect(supportIdForLearnTree({ id: 'sales_process', domainSupport: 'no-such-file' })).toBeNull()
  })

  test('mechanical name conversion applies when the file exists (get_marketing → get-marketing)', () => {
    expect(supportIdForLearnTree({ id: 'get_marketing' })).toBe('get-marketing')
    expect(supportIdForLearnTree({ id: 'org_leadership' })).toBe('org-leadership')
  })

  test('no matching file → null (public_speaking has no support file; nothing is guessed)', () => {
    expect(supportIdForLearnTree({ id: 'public_speaking' })).toBeNull()
    expect(supportIdForLearnTree(null)).toBeNull()
    expect(supportIdForLearnTree({})).toBeNull()
  })
})

describe('learn-tree data wiring (logic_trees.json)', () => {
  const learnTrees = loadLogicTrees().filter(t => t && t.mode === 'learn')

  test('the three aliased trees carry their explicit mapping and each resolves to a real file', () => {
    const byId = Object.fromEntries(learnTrees.map(t => [t.id, t]))
    expect(supportIdForLearnTree(byId.sales_process)).toBe('get-sales')
    expect(supportIdForLearnTree(byId.eoy_meeting)).toBe('eoy')
    expect(supportIdForLearnTree(byId.conflict_meeting)).toBe('conflict')
  })

  test('every resolvable learn tree formats to a non-empty prompt block', () => {
    const resolvable = learnTrees
      .map(t => supportIdForLearnTree(t))
      .filter(Boolean)
    // The ruling's coverage: 10 of the 21 learn trees have a verified file.
    expect(resolvable.length).toBeGreaterThanOrEqual(10)
    for (const id of resolvable) {
      const block = formatDomainSupportForPrompt(id)
      expect(block).toBeTruthy()
      expect(block).toContain('## Domain Support Reference')
    }
  })

  test('an explicit domainSupport field on a tree never points at a missing file (data drift guard)', () => {
    for (const t of learnTrees) {
      if (typeof t.domainSupport === 'string') {
        expect(supportIdForLearnTree(t)).not.toBeNull()
      }
    }
  })
})
