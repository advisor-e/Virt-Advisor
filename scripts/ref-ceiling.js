/**
 * ref-ceiling.js — say what the highest to-do item number is ACROSS BOTH MACHINES.
 *
 * The defect this exists for (found 2026-09-14, item 14.2): each machine allocates the
 * next item number by looking at its own branch, and the other machine's branch is
 * invisible until it reaches `master`. So both pick the same "next" number and file two
 * different pieces of work under it.
 *
 * IT HAS HAPPENED ELEVEN TIMES — a full inventory of all 121 items on 2026-09-15 found
 * two more than the eight this file first claimed. 4.81, 4.88, 4.89, 4.90, 4.91, 4.92
 * and 4.94 each name two unrelated items inside `to-do-done-and-parked.md`; 4.93 and
 * 4.96 each name one closed item and one live one; 4.97 and 4.98 collided live on
 * 2026-09-14 and the laptop's two were renumbered on Mike's ruling. Then 4.100 collided
 * in its turn — both machines filed one on 2026-09-14 — and correcting that single
 * number cost twenty-six files (a7b0f6f8).
 *
 * None of it was caught by a test: `toDoItems.test.js` guards uniqueness on ONE branch's
 * LIVE list, so every collision slid through the moment both items closed.
 *
 * Printing the true ceiling at the top of every session turns the guess that caused all
 * eleven into a read. It cannot fix a clash that already exists — it stops the next one.
 *
 * SINCE 2026-09-15 A NUMBER ALSO MEANS SOMETHING: a whole number is a subject and its
 * decimals are the jobs in it (7 is the AI engine, so 7.1 and 7.2 are engine jobs). What
 * this script reports is therefore the highest PARENT in use, so two machines cannot both
 * claim the next new subject. See design/ITEM-NUMBERING.md.
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
 * Kept for the callers and tests that ask "what follows this ref in its own series" —
 * it is the child question, and it is only half of what a session needs since
 * 2026-09-15. Use {@link nextParent} for a job that belongs to no existing subject.
 *
 * @param {string} ref the highest ref in use anywhere
 * @returns {string} the next one up, in the same series
 */
function nextAfter (ref) {
  var parts = String(ref).split('.')
  return parts[0] + '.' + (parseInt(parts[1], 10) + 1)
}

/**
 * The next free PARENT — the number a brand-new subject takes.
 *
 * Since Mike's ruling of 2026-09-15 a whole number is a subject and its decimals are the
 * jobs in it, so "the next number" is two questions, not one. This is the one that must
 * never be guessed: two machines both inventing parent 15 is the original defect wearing
 * a new scheme.
 *
 * The old families are counted like any other: 4.x means 4 is spent, so the ceiling
 * clears them without needing to know their history.
 *
 * @param {string[]} refs every ref in use anywhere
 * @returns {number} the lowest whole number no subject has taken
 */
function nextParent (refs) {
  var top = 0
  ;(refs || []).forEach(function (r) {
    var n = parseInt(String(r).split('.')[0], 10)
    if (!isNaN(n) && n > top) { top = n }
  })
  return top + 1
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
    'A WHOLE NUMBER IS A SUBJECT; ITS DECIMALS ARE THE JOBS IN IT.',
    '',
    '  Job on an EXISTING subject   the next free decimal of that subject',
    '                               (the ten subjects: design/ITEM-NUMBERING.md)',
    '  A subject that has none      ' + nextParent([ceiling]) + '  — the next free parent',
    '',
    'Take the parent from here, never from your own branch — the other machine\'s',
    'numbers are invisible to you until its work reaches `master`.',
    ''
  ]

  known.forEach(function (row) {
    var pad = row.label + new Array(width - row.label.length + 1).join(' ')
    lines.push('  ' + pad + '   highest in use ' + row.highest)
  })

  lines.push('')
  lines.push('Live items AND closed ones are counted: a number is spent for good once')
  lines.push('used. Guessing this produced ELEVEN duplicated refs — 4.81, 4.88-4.92 and')
  lines.push('4.94 sit twice in the archive, where the uniqueness guard does not reach.')
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
  nextParent: nextParent,
  describeCeiling: describeCeiling,
  highestOn: highestOn,
  ceilingLines: ceilingLines
}
