/**
 * branch-survey.js — say what the OTHER machine has that `master` does not.
 *
 * The defect this exists for (`startup-blind-to-other-machine`, P1, found 2026-08-01 by
 * Mike): check-branch-state.js measures HEAD against `origin/master` and nothing else.
 * On the morning of 2026-08-01 the desktop was genuinely 0 behind `master` while
 * `origin/feat/advisor-progress` sat 82 commits ahead of it, unmerged. So the desktop was
 * up to date with the SHARED code and two days behind the ACTUAL work, with a green light
 * saying so. It was found only because Mike opened a screen and could not find his work.
 *
 * It has now happened four times in three days, including twice within an hour of a merge
 * and once causing this AI to recommend work that another machine had already rebuilt.
 * A branch that is pushed but not yet merged is invisible to every check we own.
 *
 * REPORT ONLY — and that is structural, not a promise. Nothing here returns an exit code,
 * throws, or is reachable from the two rules that block. Another machine's branch is never
 * a reason to refuse THIS machine's push.
 *
 * Node 14.15 / CommonJS per the Stack Constitution. No dependencies.
 */

'use strict'

var PROTECTED_BRANCH = 'master'
var REMOTE_PREFIX = 'origin/'

/**
 * Strip the remote prefix from a remote-tracking ref name.
 * @param {string} ref e.g. `origin/feat/foo`
 * @returns {string} e.g. `feat/foo`
 */
function shortName (ref) {
  var s = String(ref || '')
  return s.indexOf(REMOTE_PREFIX) === 0 ? s.slice(REMOTE_PREFIX.length) : s
}

/**
 * Is this ref one we would ever report on? Name-only — it asks nothing of git.
 *
 * Split out from `selectBranches` so the caller can prune BEFORE paying for a
 * commit count per branch: counting is one git process each, and this repo carries
 * roughly fifteen remote refs of which a third are frozen snapshots.
 *
 * @param {string} ref remote-tracking ref, short form
 * @param {string} currentBranch the branch we are standing on
 * @returns {boolean} true if it is worth counting
 */
function isCandidate (ref, currentBranch) {
  var name = shortName(ref)
  if (!name) { return false }

  // `refs/remotes/origin/HEAD` shortens to a bare `origin` — the remote's default
  // pointer, not a branch anyone works on. It is the one entry that does not look
  // like the others, so it is the one that would slip through.
  if (name === 'origin' || name === 'HEAD') { return false }

  if (name === PROTECTED_BRANCH) { return false }

  // Our own branch is already measured, precisely, by rule 1 in check-branch-state.
  // Repeating it here would read as if it were somebody else's work.
  if (name === currentBranch) { return false }

  // `release/*` are FROZEN PR snapshots — cut from a branch, merged via pull request,
  // then deliberately left behind. They are permanently "ahead of master" by design
  // (PR #30 was raised from one), so reporting them is permanent noise, and noise is
  // how a report gets ignored.
  if (name.indexOf('release/') === 0) { return false }

  return true
}

/**
 * Choose and order the branches worth showing.
 *
 * Pure: no git, no I/O. Re-applies `isCandidate` rather than trusting the caller to
 * have pruned — the filtering rules are the whole point of this file, so they must
 * hold regardless of who calls it.
 *
 * @param {Array<{ref: string, ahead: number, behind: number, lastCommit: string}>} rows
 * @param {string} currentBranch
 * @returns {Array} the reportable rows, most recently touched first
 */
function selectBranches (rows, currentBranch) {
  var kept = (rows || []).filter(function (row) {
    if (!row || !isCandidate(row.ref, currentBranch)) { return false }
    // Nothing ahead of master means nothing unmerged, which is the only thing we
    // are reporting. A branch that is merely stale is master's business, not ours.
    return Number(row.ahead) > 0
  })

  return kept.sort(function (a, b) {
    // Most recently touched first: an active branch is the one you may collide with
    // today, and a long-abandoned one should not sit at the top of the list.
    var da = String(a.lastCommit || '')
    var db = String(b.lastCommit || '')
    if (da !== db) { return da < db ? 1 : -1 }
    if (Number(a.ahead) !== Number(b.ahead)) { return Number(b.ahead) - Number(a.ahead) }
    // Name last, so the order is total and the tests cannot pass by luck.
    return shortName(a.ref) < shortName(b.ref) ? -1 : 1
  })
}

/**
 * Turn the selected branches into printable lines.
 *
 * @param {Array} selected output of `selectBranches`
 * @returns {string[]|null} lines to print, or null when there is nothing to say
 */
function describeSurvey (selected) {
  if (!selected || selected.length === 0) { return null }

  var names = selected.map(function (r) { return shortName(r.ref) })
  var width = names.reduce(function (w, n) { return n.length > w ? n.length : w }, 0)

  var lines = ['Other branches hold work that is NOT in `' + PROTECTED_BRANCH + '`:', '']

  selected.forEach(function (row, i) {
    var pad = names[i] + new Array(width - names[i].length + 1).join(' ')
    lines.push(
      '  ' + pad +
      '   ' + row.ahead + ' ahead, ' + row.behind + ' behind ' + PROTECTED_BRANCH +
      ' — last commit ' + (row.lastCommit || 'unknown')
    )
  })

  lines.push('')
  lines.push('Nothing is blocked and your branch is fine — this is the gap the drift')
  lines.push('check cannot see. That work is invisible here until it reaches `' + PROTECTED_BRANCH + '`,')
  lines.push('so if you are about to touch the same screens, merge or ask first.')
  lines.push('')
  lines.push('See `startup-blind-to-other-machine` in design/ACTIONS.md.')
  return lines
}

/**
 * Ask git what the other branches are doing, and describe them.
 *
 * The git runner is injected so the whole path is testable without a sandbox repo.
 * It must return trimmed stdout, or null when the command failed.
 *
 * @param {function(string[]): (string|null)} gitSafe a non-throwing git runner
 * @param {string} currentBranch
 * @returns {string[]|null} lines to print, or null when there is nothing to say
 */
function surveyLines (gitSafe, currentBranch) {
  // A SEPARATE, best-effort fetch. check-branch-state fetches `master` alone and must
  // keep its own guarantee: if this wider fetch fails we report nothing at all, rather
  // than letting a survey failure turn a working drift check into an unverified one.
  if (gitSafe(['fetch', 'origin', '--quiet']) === null) { return null }

  var raw = gitSafe([
    'for-each-ref',
    '--format=%(refname:short)\t%(committerdate:short)',
    'refs/remotes/origin'
  ])
  if (!raw) { return null }

  var rows = []
  raw.split('\n').forEach(function (entry) {
    var parts = String(entry).split('\t')
    var ref = (parts[0] || '').trim()
    if (!isCandidate(ref, currentBranch)) { return }

    // One call per branch, both numbers at once: `--left-right` counts each side of
    // the three-dot range, so this is half the git processes two calls would cost.
    //
    // Compared against `origin/master`, NEVER the local `master`: this repo is worked
    // through pull requests, so a local `master` may be weeks stale or absent entirely,
    // and every count here would then be quietly wrong.
    var counts = gitSafe(['rev-list', '--left-right', '--count', 'origin/' + PROTECTED_BRANCH + '...' + ref])
    if (counts === null) { return }
    var pair = counts.split(/\s+/)

    rows.push({
      ref: ref,
      behind: parseInt(pair[0], 10) || 0,
      ahead: parseInt(pair[1], 10) || 0,
      lastCommit: (parts[1] || '').trim()
    })
  })

  return describeSurvey(selectBranches(rows, currentBranch))
}

module.exports = {
  isCandidate: isCandidate,
  selectBranches: selectBranches,
  describeSurvey: describeSurvey,
  surveyLines: surveyLines
}
