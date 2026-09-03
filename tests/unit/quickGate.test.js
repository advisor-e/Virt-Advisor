'use strict'

const fs = require('fs')
const path = require('path')
const { plan, DATA_TESTS } = require('../../scripts/quick-gate')

/**
 * The pre-commit quick gate (Mike, 2026-09-03: eight minutes per commit, five commits a
 * day, "we have to fix this"). Only the planning is pinned — what runs for which staged
 * files — because that is the part that decides whether a red commit slips past to push.
 * The one property that matters most: a data file a test reads with `fs` must still make
 * that test run, since Jest's module graph cannot see the link.
 */
describe('quick-gate — what runs for what', () => {
  it('lints only .js and .vue, and hands code and json to the related-tests search', () => {
    const p = plan(['server/routes/report.js', 'components/Foo.vue', 'data/domains.json', 'design/x.md'])
    expect(p.lint).toEqual(['server/routes/report.js', 'components/Foo.vue'])
    expect(p.related).toEqual(['server/routes/report.js', 'components/Foo.vue', 'data/domains.json'])
  })

  it('runs nothing for a docs-only commit outside the design folder', () => {
    const p = plan(['CLAUDE.md', 'design/WORKING-AGREEMENT.md', 'README.md'])
    expect(p.lint).toEqual([])
    expect(p.related).toEqual([])
    expect(p.named).toEqual([])
  })

  it('names the list tests when the list or its page changes — fs reads are invisible to Jest', () => {
    expect(plan(['design/features/to-do-items.json']).named).toEqual(['tests/unit/toDoItems.test.js', 'tests/unit/applyToDo.test.js'])
    expect(plan(['design/features/to-do.md']).named).toContain('tests/unit/applyToDo.test.js')
  })

  it('names the active-items test when a handover changes', () => {
    expect(plan(['design/HANDOVER-desktop.md']).named).toEqual(['tests/unit/activeItems.test.js'])
  })

  it('names the folder rules when a Brief, a mockup or the register changes — a Brief without its History slipped past once', () => {
    const named = plan(['design/features/new-thing.md']).named
    expect(named).toContain('tests/unit/newFeature.test.js')
    expect(named).toContain('tests/unit/buildHandbook.test.js')
    expect(plan(['design/mockups/x.html']).named).toContain('tests/unit/designArtefacts.test.js')
    expect(plan(['design/ARTEFACTS.md']).named).toContain('tests/unit/designArtefacts.test.js')
  })

  it('accepts Windows separators and never names a test twice', () => {
    const p = plan(['design\\features\\to-do-items.json', 'design/features/to-do.md'])
    // to-do.md is also a design/features page, so the folder rules ride along once.
    expect(p.named).toEqual([
      'tests/unit/toDoItems.test.js', 'tests/unit/applyToDo.test.js',
      'tests/unit/newFeature.test.js', 'tests/unit/designArtefacts.test.js', 'tests/unit/buildHandbook.test.js'
    ])
    expect(new Set(p.named).size).toBe(p.named.length)
  })

  it('leaves ESLint\'s ignored folders alone, so an ignored script does not fail on style it never had to meet', () => {
    const p = plan(['scripts/quick-gate.js', 'server/x.js'], ['scripts/', 'data/'])
    expect(p.lint).toEqual(['server/x.js'])
    expect(p.related).toEqual(['scripts/quick-gate.js', 'server/x.js'])
  })

  it('every test the map names actually exists — a renamed test would silently stop running', () => {
    DATA_TESTS.forEach((rule) => {
      rule.run.forEach((t) => {
        expect(fs.existsSync(path.resolve(__dirname, '..', '..', t))).toBe(true)
      })
    })
  })
})
