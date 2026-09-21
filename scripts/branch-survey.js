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
 * 🔴 IT ALSO REPORTS THE OTHER MACHINE'S HANDOVER, READ FROM THAT MACHINE'S OWN BRANCH —
 * item 14.2's second half, closed 2026-09-15. Startup used to compare handover dates using
 * the copy in THIS machine's working tree, which is frozen at the last merge, so a session
 * could report the other division idle when it was not. It did exactly that on 2026-09-14
 * and again on 2026-09-15, both times caught only by someone reading the other branch by
 * hand. The date now comes from the branch that owns it.
 *
 * REPORT ONLY — and that is structural, not a promise. Nothing here returns an exit code,
 * throws, or is reachable from the two rules that block. Another machine's branch is never
 * a reason to refuse THIS machine's push.
 *
 * Node 14.15 / CommonJS per the Stack Constitution. No dependencies.
 */

'use strict'

var activeItems = require('./active-items')

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
 * What to say about the other machine's handover note, if anything.
 *
 * 🔴 THE HALF OF ITEM 14.2 THAT THIS CLOSES, and it is the half that actually misleads a
 * reader. Startup reads `design/HANDOVER-desktop.md` out of the WORKING TREE — which is
 * this machine's copy of it, frozen at whatever the last merge brought over. The other
 * machine writes its note on its OWN branch, so the copy read here can be days behind the
 * real one and nothing about it looks wrong: the file exists, it parses, it has a date.
 *
 * On 2026-09-14 a session reported the desktop idle since 2026-09-10 when its note was in
 * fact two days newer, and it happened AGAIN on 2026-09-15 — the note this machine held
 * was dated 2026-09-13 while the desktop's own branch carried one from the 15th. Both
 * times it was caught only by reading the other branch by hand.
 *
 * Pure so it can be tested without git: the date is read from the branch by the caller.
 *
 * @param {{machine: string|null, handoverDate: string|null, lastCommit: string}} row
 * @returns {string|null} one line, or null when there is nothing worth saying
 */
function handoverNote (row) {
  if (!row || !row.machine) { return null }

  var date = row.handoverDate || null
  var last = String(row.lastCommit || '')

  if (!date) {
    return 'no handover note on that branch — that session ended without writing one'
  }
  if (last && date < last) {
    // The note predates the work, which is the signal that matters: somebody committed
    // and then finished without a shutdown. Days are deliberately not counted — the two
    // dates say it, and arithmetic on date strings is a thing to get wrong.
    return row.machine + ' handover dated ' + date + ', OLDER than its last commit (' +
      last + ') — treat it as incomplete'
  }
  if (last && date > last) {
    // A note dated AFTER its own newest commit. The date is TYPED by the session that
    // wrote the note, never derived, so a forward-dated one reads as "current" for ever
    // however stale the work behind it becomes — which is the exact failure the line
    // below was added to prevent. Found 2026-09-21: the desktop's note said 2026-09-22
    // against commits from the 21st, and this function called it current.
    return row.machine + ' handover dated ' + date + ', LATER than its last commit (' +
      last + ') — that date is typed, so it cannot prove the note is current'
  }
  return row.machine + ' handover dated ' + date + ' — current, and read from ITS branch'
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

  // Aligns the note under the counts: the first line is 2 spaces, the name, then 3 more.
  var gutter = new Array(width + 4).join(' ')

  selected.forEach(function (row, i) {
    var pad = names[i] + new Array(width - names[i].length + 1).join(' ')
    lines.push(
      '  ' + pad +
      '   ' + row.ahead + ' ahead, ' + row.behind + ' behind ' + PROTECTED_BRANCH +
      ' — last commit ' + (row.lastCommit || 'unknown')
    )
    var note = handoverNote(row)
    if (note) { lines.push('  ' + gutter + note) }
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

    // The other machine's handover, READ FROM ITS OWN BRANCH rather than from this
    // machine's working copy of the file. That is the whole point — see `handoverNote`.
    // A branch that is nobody's machine gets no note and costs no git call.
    var machine = activeItems.machineFor(shortName(ref))
    var handoverDate = null
    if (machine) {
      var note = gitSafe(['show', ref + ':design/HANDOVER-' + machine + '.md'])
      // null means the command failed — usually the file does not exist on that branch,
      // which `handoverNote` reports as its own thing rather than staying silent.
      handoverDate = note === null ? null : activeItems.handoverDate(note)
    }

    rows.push({
      ref: ref,
      behind: parseInt(pair[0], 10) || 0,
      ahead: parseInt(pair[1], 10) || 0,
      lastCommit: (parts[1] || '').trim(),
      machine: machine,
      handoverDate: handoverDate
    })
  })

  return describeSurvey(selectBranches(rows, currentBranch))
}

module.exports = {
  isCandidate: isCandidate,
  selectBranches: selectBranches,
  handoverNote: handoverNote,
  describeSurvey: describeSurvey,
  surveyLines: surveyLines
}
