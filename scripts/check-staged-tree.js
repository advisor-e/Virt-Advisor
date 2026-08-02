/**
 * check-staged-tree.js — make the pre-commit gates test the COMMIT.
 *
 * The defect this exists for (2026-08-02, `hook-tests-worktree-not-commit` in
 * design/ACTIONS.md): `.husky/pre-commit` runs ESLint, the full Jest suite and the
 * audit gate against the WORKING TREE. None of them looks at the index. So a commit
 * that contains only some of the edits on disk is validated by three gates that were
 * all reading the OTHER version of the files — every gate honest, every gate green,
 * and the commit shipped red.
 *
 * That is exactly what happened: two files arrived staged from a merge, were then
 * edited to fix the merge's failures, and only a third file was `git add`-ed. Commit
 * `741eb5c` carried the old regex and a stale routing map while reporting a clean run.
 *
 * This does NOT test the commit either. It forces working tree ≡ commit contents, so
 * that the three gates already running mean what they claim. Deliberately no stashing:
 * a stash that fails mid-hook can lose work, which is a worse trade than a refusal.
 *
 * Untracked files are NOT considered — a scratch file that was never `git add`-ed is
 * not a half-staged edit, and blocking on those would fire constantly.
 *
 * Run modes:
 *   node scripts/check-staged-tree.js            → enforce (exit 1 blocks the commit)
 *   node scripts/check-staged-tree.js --report   → report only, never exits non-zero
 *
 * Node 14.15 / CommonJS per the Stack Constitution. No dependencies.
 */

'use strict'

var execFileSync = require('child_process').execFileSync

/**
 * Turn the list of tracked-but-unstaged files into the refusal message, or null
 * when there is nothing to refuse.
 *
 * Split out from the git call so the decision is testable without a git sandbox.
 *
 * @param {string[]} files paths reported by `git diff --name-only`
 * @returns {string[]|null} lines to print, or null when the tree is committable
 */
function describeUnstaged (files) {
  var real = (files || []).filter(function (f) { return String(f).trim() !== '' })
  if (real.length === 0) { return null }

  var lines = [
    real.length + ' tracked file(s) have edits on disk that are NOT in this commit:',
    ''
  ]
  real.forEach(function (f) { lines.push('  • ' + f) })
  lines.push('')
  lines.push('Lint, the test suite and the audit gate all read the files as they are on')
  lines.push('DISK. If the commit holds a different version, those three green ticks')
  lines.push('describe code you are not committing. That is how commit 741eb5c shipped')
  lines.push('with a stale routing map while every gate passed.')
  lines.push('')
  lines.push('What to do — either:')
  lines.push('  git add <file>        include the edits, so the commit is what was tested')
  lines.push('  git restore <file>    discard them, if they were not meant to be here')
  lines.push('  git stash push <file> set them aside for a later commit')
  lines.push('')
  lines.push('See `hook-tests-worktree-not-commit` in design/ACTIONS.md.')
  return lines
}

/**
 * Read the tracked files that have unstaged modifications.
 * @returns {string[]|null} file paths, or null if git could not be asked
 */
function unstagedFiles () {
  try {
    var out = execFileSync('git', ['diff', '--name-only'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    return out.split('\n').map(function (s) { return s.trim() }).filter(Boolean)
  } catch (err) {
    return null
  }
}

function main () {
  var reportOnly = process.argv.indexOf('--report') !== -1
  var files = unstagedFiles()

  if (files === null) {
    // Not a git repo, or git unavailable. Never block on our own inability to check —
    // but never claim the commit is clean either.
    // eslint-disable-next-line no-console
    console.log('check-staged-tree: could not read the index — skipping.')
    return
  }

  var message = describeUnstaged(files)
  if (!message) { return }

  var bar = '────────────────────────────────────────────────────────────────────────'
  // eslint-disable-next-line no-console
  var line = function (s) { console.log(s) }
  line(bar)
  line(reportOnly ? '⚠  UNSTAGED EDITS — this commit would not be what was tested' : '⛔ COMMIT BLOCKED')
  line(bar)
  message.forEach(line)
  line(bar)
  if (!reportOnly) { process.exit(1) }
}

if (require.main === module) { main() }

module.exports = { describeUnstaged: describeUnstaged }
