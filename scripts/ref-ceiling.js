/**
 * ref-ceiling.js — say what the highest to-do item number is ACROSS BOTH MACHINES.
 *
 * The defect this exists for (found 2026-09-14, item 4.101): each machine allocates the
 * next item number by looking at its own branch, and the other machine's branch is
 * invisible until it reaches `master`. So both pick the same "next" number and file two
 * different pieces of work under it.
 *
 * It has happened NINE times. 4.88, 4.89, 4.90, 4.91, 4.92 and 4.94 each name two
 * unrelated items inside `to-do-done-and-parked.md`; 4.97 and 4.98 collided live on
 * 2026-09-14 and this machine's two were renumbered to 4.100 / 4.101 on Mike's ruling.
 * Then 4.100 collided in its turn — the desktop had filed its own on the same day, and
 * closed it on 2026-09-15 — so this machine's became 4.104. Both numbers were allocated
 * on 2026-09-14, BEFORE this script existed; it is not a case of the ceiling failing.
 * None of it was caught by a test: `toDoItems.test.js` guards uniqueness on the LIVE
 * list only, so every past collision slid through the moment both items closed — the
 * ninth was found by reading the other machine's branch by hand at startup.
 *
 * Printing the true ceiling at the top of every session turns the guess that caused all
 * eight into a read. It cannot fix a clash that already exists — it stops the next one.
 *
 * REPORT ONLY, structurally: nothing here returns an exit code or throws past its own
 * boundary. Another machine's numbering is never a reason to refuse this machine's push.
 *
 * Node 14.15 / CommonJS per the Stack Constitution. No dependencies.
 */

'use strict'

var LIVE_LIST = 'design/features/to-do-items.json'
var ARCHIVE = 'design/features/to-do-done-and-parked.md'

/** `"ref": "4.100"` on the live list. */
var LIVE_REF = /"ref"\s*:\s*"(\d+\.\d+)"/g

/**
 * `**4.95 — the Sales Dashboard…` in the archive. The separator varies across three
 * years of entries (`—`, `·`, `-`), so only the bold-open and the number are matched.
 */
var ARCHIVE_REF = /^\*\*(\d+\.\d+)\s/gm

/**
 * Pull every item reference out of one file's text.
 *
 * @param {string} text file contents, live list or archive
 * @param {RegExp} pattern a global regex whose first group is the ref
 * @returns {string[]} refs in the order found, duplicates kept
 */
function refsMatching (text, pattern) {
  var found = []
  var re = new RegExp(pattern.source, pattern.flags)
  var m
  while ((m = re.exec(String(text || ''))) !== null) { found.push(m[1]) }
  return found
}

/**
 * Every ref a machine holds — live items and closed ones alike.
 *
 * The archive matters as much as the live list, and is the half that was missed: an
 * item that closes keeps its number forever, and `report.js`, `ARTEFACTS.md` and the
 * mockups all quote closed numbers. A ceiling drawn from live items alone would hand
 * out a number already spent.
 *
 * @param {string} liveJson contents of to-do-items.json
 * @param {string} archiveMd contents of to-do-done-and-parked.md
 * @returns {string[]} every ref found, duplicates kept
 */
function refsIn (liveJson, archiveMd) {
  return refsMatching(liveJson, LIVE_REF).concat(refsMatching(archiveMd, ARCHIVE_REF))
}

/**
 * Order two refs the way people read them, NOT the way strings sort.
 *
 * `'4.100' < '4.99'` is true alphabetically and false in every sense that matters here.
 * Both halves are compared as integers.
 *
 * @param {string} a e.g. '4.100'
 * @param {string} b e.g. '4.99'
 * @returns {number} negative if a is lower, positive if a is higher, 0 if equal
 */
function compareRefs (a, b) {
  var pa = String(a).split('.')
  var pb = String(b).split('.')
  var majorA = parseInt(pa[0], 10)
  var majorB = parseInt(pb[0], 10)
  if (majorA !== majorB) { return majorA - majorB }
  return parseInt(pa[1], 10) - parseInt(pb[1], 10)
}

/**
 * The highest ref in a list.
 *
 * @param {string[]} refs
 * @returns {string|null} the highest, or null when the list is empty
 */
function highest (refs) {
  var kept = (refs || []).filter(function (r) { return /^\d+\.\d+$/.test(String(r)) })
  if (kept.length === 0) { return null }
  return kept.sort(compareRefs)[kept.length - 1]
}

/**
 * The number a new item should take.
 *
 * @param {string} ref the highest ref in use anywhere
 * @returns {string} the next one up, in the same series
 */
function nextAfter (ref) {
  var parts = String(ref).split('.')
  return parts[0] + '.' + (parseInt(parts[1], 10) + 1)
}

/**
 * Turn the per-branch findings into printable lines.
 *
 * @param {Array<{label: string, highest: string|null}>} rows one per branch read
 * @returns {string[]|null} lines to print, or null when nothing could be read
 */
function describeCeiling (rows) {
  var known = (rows || []).filter(function (r) { return r && r.highest })
  if (known.length === 0) { return null }

  var ceiling = highest(known.map(function (r) { return r.highest }))
  var width = known.reduce(function (w, r) { return r.label.length > w ? r.label.length : w }, 0)

  var lines = [
    'THE NEXT FREE ITEM NUMBER IS ' + nextAfter(ceiling) + '.',
    '',
    'Take it from here, never from your own branch\'s ceiling — the other machine\'s',
    'numbers are invisible to you until its work reaches `master`.',
    ''
  ]

  known.forEach(function (row) {
    var pad = row.label + new Array(width - row.label.length + 1).join(' ')
    lines.push('  ' + pad + '   highest in use ' + row.highest)
  })

  lines.push('')
  lines.push('Live items AND closed ones are counted: a number is spent for good once')
  lines.push('used. Guessing this produced eight duplicated refs — 4.88-4.92 and 4.94')
  lines.push('sit twice in the archive, where the uniqueness guard does not reach.')
  return lines
}

/**
 * Read both list files from one branch.
 *
 * @param {function(string[]): (string|null)} gitSafe a non-throwing git runner
 * @param {string} ref a branch or remote-tracking ref to read from
 * @returns {string|null} the highest ref that branch holds, or null if unreadable
 */
function highestOn (gitSafe, ref) {
  var live = gitSafe(['show', ref + ':' + LIVE_LIST])
  var archive = gitSafe(['show', ref + ':' + ARCHIVE])
  if (live === null && archive === null) { return null }
  return highest(refsIn(live || '', archive || ''))
}

/**
 * Ask git for the ceiling on this branch and on every other machine's branch.
 *
 * `isCandidate` is borrowed from the branch survey so the two reports agree on what
 * counts as another machine's branch — `master`, `release/*` snapshots and the remote
 * HEAD pointer are not somebody's working list.
 *
 * The git runner is injected so the whole path is testable without a sandbox repo.
 *
 * This branch is read from the WORKING TREE when the caller supplies it, not from HEAD.
 * A session that has just filed an item has not committed it yet, and a ceiling drawn
 * from HEAD would offer that session back the number it is already using.
 *
 * @param {function(string[]): (string|null)} gitSafe a non-throwing git runner
 * @param {string} currentBranch the branch we are standing on
 * @param {function(string, string): boolean} isCandidate branch-survey's filter
 * @param {{live: string, archive: string}} [local] this branch's files as they are on disk
 * @returns {string[]|null} lines to print, or null when there is nothing to say
 */
function ceilingLines (gitSafe, currentBranch, isCandidate, local) {
  var mine = local
    ? highest(refsIn(local.live || '', local.archive || ''))
    : highestOn(gitSafe, 'HEAD')
  var rows = [{ label: 'this branch (' + currentBranch + ')', highest: mine }]

  var raw = gitSafe(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'])
  if (raw) {
    raw.split('\n').forEach(function (entry) {
      var name = String(entry).trim()
      if (!isCandidate(name, currentBranch)) { return }
      rows.push({ label: name, highest: highestOn(gitSafe, name) })
    })
  }

  return describeCeiling(rows)
}

module.exports = {
  refsIn: refsIn,
  compareRefs: compareRefs,
  highest: highest,
  nextAfter: nextAfter,
  describeCeiling: describeCeiling,
  highestOn: highestOn,
  ceilingLines: ceilingLines
}
