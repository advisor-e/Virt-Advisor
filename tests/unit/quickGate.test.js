'use strict'

const fs = require('fs')
const path = require('path')
const { plan, jestRuns, DATA_TESTS } = require('../../scripts/quick-gate')

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
    expect(plan(['design/features/to-do-items.json']).named).toEqual(['tests/unit/toDoItems.test.js', 'tests/unit/applyToDo.test.js', 'tests/unit/itemIdentity.test.js'])
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
      'tests/unit/toDoItems.test.js', 'tests/unit/applyToDo.test.js', 'tests/unit/itemIdentity.test.js',
      'tests/unit/newFeature.test.js', 'tests/unit/designArtefacts.test.js', 'tests/unit/buildHandbook.test.js'
    ])
    expect(new Set(p.named).size).toBe(p.named.length)
  })

  it('leaves ESLint\'s ignored folders alone, so an ignored script does not fail on style it never had to meet', () => {
    const p = plan(['scripts/quick-gate.js', 'server/x.js'], ['scripts/', 'data/'])
    expect(p.lint).toEqual(['server/x.js'])
    expect(p.related).toEqual(['scripts/quick-gate.js', 'server/x.js'])
  })

  // 🔴 AN EMPTY FILTER IS EVERY TEST, NOT NO TESTS. Jest handed no path pattern runs
  // the whole suite, so a commit of documents alone — which has no related files and
  // several named ones — used to run all 617 suites before running the few it wanted.
  // That is the eight-minute commit this gate exists to end, arriving by the back door
  // on the commits that can least break code. Found 2026-09-23 committing a drawing.
  describe('what is actually handed to Jest', () => {
    it('does not run the whole suite when a commit carries only documents', () => {
      const runs = jestRuns(plan(['design/mockups/add-concept.html', 'design/ARTEFACTS.md']))

      // One call only, and it names its tests. A call carrying neither
      // --findRelatedTests nor a path is the fault.
      expect(runs).toHaveLength(1)
      expect(runs[0]).not.toContain('--findRelatedTests')
      expect(runs[0].filter(a => /\.test\.js$/.test(a)).length).toBeGreaterThan(0)

      // The property that matters, stated once: no call may be unfiltered.
      runs.forEach((r) => {
        const filtered = r.includes('--findRelatedTests') || r.some(a => a.startsWith('tests/'))
        expect(filtered).toBe(true)
      })
    })

    it('traces related tests only when there are code files to trace from', () => {
      const runs = jestRuns(plan(['server/routes/report.js']))

      expect(runs).toHaveLength(1)
      expect(runs[0]).toContain('--findRelatedTests')
      expect(runs[0]).toContain('server/routes/report.js')
    })

    it('keeps the two calls apart, because --findRelatedTests swallows a named test as a source', () => {
      const runs = jestRuns(plan(['data/domains.json', 'design/features/to-do-items.json']))

      expect(runs).toHaveLength(2)
      expect(runs[0]).toContain('--findRelatedTests')
      expect(runs[1]).not.toContain('--findRelatedTests')
      expect(runs[1]).toContain('tests/unit/toDoItems.test.js')
    })

    it('runs nothing at all when a commit touches neither code nor a mapped file', () => {
      expect(jestRuns(plan(['README.md']))).toEqual([])
    })
  })

  it('every test the map names actually exists — a renamed test would silently stop running', () => {
    DATA_TESTS.forEach((rule) => {
      rule.run.forEach((t) => {
        expect(fs.existsSync(path.resolve(__dirname, '..', '..', t))).toBe(true)
      })
    })
  })
})
