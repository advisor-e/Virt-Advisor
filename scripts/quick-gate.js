/**
 * quick-gate.js — the pre-commit gate, sized to the commit.
 *
 * Why (Mike, 2026-09-03): the pre-commit hook ran full lint, the full suite WITH
 * coverage, and the audit gate on every commit, however small. On the desktop that is
 * eight minutes, and coverage is most of it — it instruments every source file before
 * one test runs. Five sessions a day cost him nearly an hour of waiting. The full gate
 * has moved to `.husky/pre-push`, where it runs once before anything leaves the machine,
 * and this runs here instead: lint on the staged files, and the tests that reach them,
 * with coverage off.
 *
 * What it cannot do, said plainly: a test that reads a data file with `fs` is not linked
 * to that file in Jest's module graph, so `--findRelatedTests` will not find it. The
 * DATA_TESTS map below names those pairs by hand; anything not listed there is caught
 * at push, not at commit. A local commit that turns out red is fixed forward — nothing
 * reaches `master` without the push gate.
 *
 * Node 14.15 / CommonJS per the Stack Constitution. No dependencies.
 */

'use strict'

var execFileSync = require('child_process').execFileSync
var fs = require('fs')
var path = require('path')

/** Tests that read a file with `fs` rather than `require`, so the module graph cannot see the link. */
var DATA_TESTS = [
  { when: /^design\/features\/to-do(-items\.json|\.md|-done-and-parked\.md)$/, run: ['tests/unit/toDoItems.test.js', 'tests/unit/applyToDo.test.js', 'tests/unit/itemIdentity.test.js'] },
  { when: /^design\/(HANDOVER-[a-z]+\.md)$/, run: ['tests/unit/activeItems.test.js'] },
  // A Brief, its History, the index or a mockup: the folder rules (every Brief has a
  // companion and a row; every mockup is registered) and the Handbook build. Found
  // 2026-09-03 when a new Brief shipped without its History and only the push gate saw it.
  { when: /^design\/(features\/.*\.md|mockups\/.*\.html|ARTEFACTS\.md)$/, run: ['tests/unit/newFeature.test.js', 'tests/unit/designArtefacts.test.js', 'tests/unit/buildHandbook.test.js'] },
  // The concept drawings. `conceptGraphics.test.js` reads every
  // `design/mockups/strategy-concept-*.html` with `fs`, so the module graph cannot
  // link it and the row above never ran it. Found 2026-09-23 while building item
  // 15.19: committing a drawing left it green here and red at the push gate, which
  // is the latest possible moment to learn a drawing is unwired.
  { when: /^(design\/(mockups\/.*\.html|ARTEFACTS\.md)|scripts\/build-concept-graphics\.js)$/, run: ['tests/unit/conceptGraphics.test.js'] }
]
// Data under data/ and locales/ is `require`d by the tests that read it, so the module
// graph already links those; they need no row here. Add a row only for an `fs` read.

/** Files ESLint is configured to read. */
var LINTABLE = /\.(js|vue)$/

/**
 * Decide what to run for a set of staged paths. Pure, so it can be pinned.
 *
 * @param {string[]} staged repo-relative paths, forward slashes
 * @param {string[]} [ignored] folder prefixes ESLint ignores (from .eslintignore) — a file
 *   under one is still a related-tests source, but is not linted, exactly as `npm run lint`
 *   would not lint it
 * @returns {{ lint: string[], related: string[], named: string[] }}
 *   lint — files to lint; related — files to hand to `--findRelatedTests`;
 *   named — test files DATA_TESTS says must run regardless of the module graph
 */
function plan (staged, ignored) {
  var skip = ignored || []
  var files = (staged || []).map(function (f) { return f.replace(/\\/g, '/') })
  var lint = files.filter(function (f) {
    return LINTABLE.test(f) && !skip.some(function (dir) { return f.indexOf(dir) === 0 })
  })
  var related = files.filter(function (f) { return /\.(js|vue|json)$/.test(f) })
  var named = []
  files.forEach(function (f) {
    DATA_TESTS.forEach(function (rule) {
      if (rule.when.test(f)) {
        rule.run.forEach(function (t) { if (named.indexOf(t) === -1) { named.push(t) } })
      }
    })
  })
  return { lint: lint, related: related, named: named }
}

/**
 * The Jest command lines a plan needs, in order. Pure, so it can be pinned.
 *
 * 🔴 AN EMPTY FILTER IS NOT "NO TESTS" — IT IS EVERY TEST, and that is the fault this
 * function exists to make visible. Jest given no path pattern runs the whole suite, so
 * the related-tests call must be made ONLY when there are related files to trace. A
 * commit of documents alone — a drawing, a Brief, ARTEFACTS.md — has no related files
 * and four named tests, and used to run all 617 suites before running the four. That
 * defeats Mike's ruling of 2026-09-03, which split the gates precisely so a commit
 * stays in seconds, and it defeated it hardest for the commits that can least break
 * code. Found 2026-09-23 committing the Add Concept drawing.
 *
 * ⚠ THE TWO CALLS CANNOT BE MERGED. With `--findRelatedTests` present, Jest reads every
 * further argument as another SOURCE file to trace, not as a test to run — so a named
 * test appended to that call would be treated as a source and silently run nothing.
 *
 * @param {{lint: string[], related: string[], named: string[]}} p a plan from `plan()`
 * @returns {string[][]} argv arrays, each ready to hand to node
 */
function jestRuns (p) {
  var bin = path.join('node_modules', 'jest', 'bin', 'jest.js')
  var runs = []

  if (p.related.length) {
    runs.push([bin, '--coverage=false', '--passWithNoTests', '--findRelatedTests'].concat(p.related))
  }
  if (p.named.length) {
    runs.push([bin, '--coverage=false'].concat(p.named))
  }
  return runs
}

function line (msg) {
  // eslint-disable-next-line no-console
  console.log(msg)
}

/**
 * Run the gate against the index. Exits non-zero on the first failing step.
 */
function main () {
  var root = path.resolve(__dirname, '..')
  var staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
    { encoding: 'utf8', cwd: root }).split(/\r?\n/).filter(Boolean)
  // Folder lines of .eslintignore ("scripts/", "data/"). File patterns there (*.bat,
  // *.log) never match a lintable extension, so folders are all that matter.
  var ignored = []
  try {
    ignored = fs.readFileSync(path.join(root, '.eslintignore'), 'utf8').split(/\r?\n/)
      .map(function (l) { return l.trim() })
      .filter(function (l) { return l && l.charAt(0) !== '#' && l.slice(-1) === '/' })
  } catch (err) { /* no ignore file — lint everything staged */ }
  var p = plan(staged, ignored)

  line('quick-gate: ' + staged.length + ' staged file(s) — lint ' + p.lint.length +
    ', related tests for ' + p.related.length + ', named tests ' + p.named.length + '.')

  var node = process.execPath
  var run = function (args) {
    execFileSync(node, args, { stdio: 'inherit', cwd: root })
  }

  if (p.lint.length) {
    run([path.join('node_modules', 'eslint', 'bin', 'eslint.js')].concat(p.lint))
  }
  jestRuns(p).forEach(run)
  line('quick-gate: clean. The full suite, coverage and the audit gate run at push.')
}

module.exports = { plan: plan, jestRuns: jestRuns, DATA_TESTS: DATA_TESTS }

if (require.main === module) {
  try {
    main()
  } catch (err) {
    line('quick-gate: a step failed (' + ((err && err.status) || 1) + '). Fix it, or see .husky/pre-commit.')
    process.exit(1)
  }
}
