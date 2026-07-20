/**
 * check-branch-state.js — the mechanical half of the Working Agreement.
 *
 * Enforces the two branch rules that, when broken silently, produced the
 * 97-commit UAT drift found on 2026-07-21 (see design/WORKING-AGREEMENT.md and
 * the `release-tagging-workflow` item in design/ACTIONS.md):
 *
 *   1. A feature branch must never be behind `origin/master`. Drift is merged in
 *      at the START of a session, not discovered weeks later at integration time.
 *   2. `master` is not pushed to directly. It is reached through a pull request,
 *      so that every change to the releasable line has a reviewable, nameable unit.
 *
 * Run modes:
 *   node scripts/check-branch-state.js            → enforce (exit 1 blocks the push)
 *   node scripts/check-branch-state.js --report   → report only, never exits non-zero
 *
 * Node 14.15 / CommonJS per the Stack Constitution. No dependencies — this must
 * run before `npm install` has necessarily been touched.
 */

'use strict'

var execFileSync = require('child_process').execFileSync

var REPORT_ONLY = process.argv.indexOf('--report') !== -1
var PROTECTED_BRANCH = 'master'

/**
 * Run a git command and return trimmed stdout.
 * @param {string[]} args git arguments
 * @returns {string} stdout, trimmed
 * @throws if git exits non-zero
 */
function git (args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

/**
 * Run a git command, returning null instead of throwing.
 * @param {string[]} args git arguments
 * @returns {string|null} stdout, or null if the command failed
 */
function gitSafe (args) {
  try {
    return git(args)
  } catch (err) {
    return null
  }
}

function line (msg) {
  // eslint-disable-next-line no-console
  console.log(msg)
}

function bar () {
  line('────────────────────────────────────────────────────────────────────────')
}

/**
 * Block the action, unless we are in report-only mode.
 * @param {string[]} messages lines to print
 */
function fail (messages) {
  bar()
  line(REPORT_ONLY ? '⚠  BRANCH STATE — action needed' : '⛔ PUSH BLOCKED')
  bar()
  messages.forEach(line)
  bar()
  if (!REPORT_ONLY) {
    line('If you genuinely must override this, `git push --no-verify` will skip the')
    line('check — but the drift is then yours to resolve before integration.')
    bar()
    process.exit(1)
  }
}

var branch = gitSafe(['rev-parse', '--abbrev-ref', 'HEAD'])

if (!branch || branch === 'HEAD') {
  line('check-branch-state: detached HEAD or not a git repo — skipping.')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Rule 2 — master is reached by pull request, never by a direct push.
// ---------------------------------------------------------------------------
if (branch === PROTECTED_BRANCH) {
  fail([
    'You are pushing directly to `master`.',
    '',
    '`master` is the releasable line the master-app team pulls from. It is',
    'reached through a pull request so every change to it has a reviewable,',
    'nameable unit the team can reference.',
    '',
    'What to do:',
    '  1. Put your work on a branch:  git switch -c feat/<short-name>',
    '  2. Push that branch, then open a pull request into master on GitHub.',
    '',
    'See design/WORKING-AGREEMENT.md.'
  ])
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Rule 1 — a feature branch must not be behind origin/master.
// ---------------------------------------------------------------------------
// Refresh our view of master. If this fails we are most likely offline; we warn
// loudly rather than blocking, because refusing to push on a network hiccup
// would be wrong — but we never claim the branch is clean when we could not check.
var fetched = gitSafe(['fetch', 'origin', PROTECTED_BRANCH, '--quiet']) !== null

if (!fetched) {
  bar()
  line('⚠  Could not reach origin to check for drift (offline?).')
  line('   The push is ALLOWED, but the branch state is UNVERIFIED —')
  line('   re-run `npm run check:branch` once you are back online.')
  bar()
  process.exit(0)
}

var behindRaw = gitSafe(['rev-list', '--count', 'HEAD..origin/' + PROTECTED_BRANCH])
var aheadRaw = gitSafe(['rev-list', '--count', 'origin/' + PROTECTED_BRANCH + '..HEAD'])

if (behindRaw === null || aheadRaw === null) {
  line('check-branch-state: could not compare against origin/' + PROTECTED_BRANCH + ' — skipping.')
  process.exit(0)
}

var behind = parseInt(behindRaw, 10)
var ahead = parseInt(aheadRaw, 10)

if (behind > 0) {
  fail([
    'Branch `' + branch + '` is ' + behind + ' commit(s) BEHIND origin/' + PROTECTED_BRANCH + '.',
    '',
    'Pushing now stores up a merge that gets harder every day, and it is how the',
    'two machines drift apart. Catch up first — it is almost always painless when',
    'done early.',
    '',
    'What to do:',
    '  git fetch origin',
    '  git merge origin/' + PROTECTED_BRANCH,
    '  npm test          # prove the merge did not break anything',
    '  git push          # this check will then pass',
    '',
    'See design/WORKING-AGREEMENT.md.'
  ])
  process.exit(0)
}

// Clean.
line('✔ Branch `' + branch + '`: ' + ahead + ' ahead, 0 behind origin/' + PROTECTED_BRANCH + '.')
process.exit(0)
