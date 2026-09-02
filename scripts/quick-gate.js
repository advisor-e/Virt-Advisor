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
  { when: /^design\/features\/to-do(-items\.json|\.md|-done-and-parked\.md)$/, run: ['tests/unit/toDoItems.test.js', 'tests/unit/applyToDo.test.js'] },
  { when: /^design\/(HANDOVER-[a-z]+\.md)$/, run: ['tests/unit/activeItems.test.js'] }
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
  if (p.related.length || p.named.length) {
    var jest = [path.join('node_modules', 'jest', 'bin', 'jest.js'), '--coverage=false', '--passWithNoTests']
    if (p.related.length) { jest = jest.concat(['--findRelatedTests'], p.related) }
    // Named tests ride along as plain path patterns; with --findRelatedTests present
    // Jest treats extra args as related sources, so run them as a second call.
    run(jest)
    if (p.named.length) {
      run([path.join('node_modules', 'jest', 'bin', 'jest.js'), '--coverage=false'].concat(p.named))
    }
  }
  line('quick-gate: clean. The full suite, coverage and the audit gate run at push.')
}

module.exports = { plan: plan, DATA_TESTS: DATA_TESTS }

if (require.main === module) {
  try {
    main()
  } catch (err) {
    line('quick-gate: a step failed (' + ((err && err.status) || 1) + '). Fix it, or see .husky/pre-commit.')
    process.exit(1)
  }
}
