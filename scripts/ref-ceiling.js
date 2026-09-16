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
 * decimals are the jobs in it (7 is the AI engine, so 7.1 and 7.2 are engine jobs). See
 * design/ITEM-NUMBERING.md.
 *
 * 🔴 THAT RULING IS WHY THE CEILING ALONE WAS NOT ENOUGH, AND 7.5 COLLIDED ON 2026-09-16 —
 * the twelfth. A ceiling answers "what new SUBJECT is free", and from 2026-09-15 almost
 * every new job takes a DECIMAL of a subject that already exists. Nothing compared those
 * across branches, so this report could truthfully print "highest in use 14.2 / 14.1" on a
 * morning when 7.5 named two different jobs, one per machine. Built the 14th, the rule
 * changed the 15th, it collided on the 16th.
 *
 * So this file now answers both halves, and a third question neither half asked:
 *   - the next free PARENT, for a subject that has none (the original ceiling);
 *   - the next free DECIMAL of every subject in use, read across every branch;
 *   - and whether a number ALREADY names two different jobs, which is the only one of the
 *     three that reports a fault rather than preventing one.
 *
 * The clash check needs item NAMES, not just numbers: the same ref on two branches is
 * normally the same item, present on both. A clash is one ref describing two unrelated
 * jobs — 7.5 as "which calculation model the AI named" here and "a page's templates are
 * hidden behind whichever won the ID" there.
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

/** The same archive line, keeping the title that follows the number. */
var ARCHIVE_ENTRY = /^\*\*(\d+\.\d+)\s+(.*)$/gm

/**
 * `"ref": "7.5"` and the `"name"` that follows it, for a list too malformed to parse.
 * The gap is bounded so a missing name cannot reach forward and steal the next item's.
 */
var LIVE_ENTRY = /"ref"\s*:\s*"(\d+\.\d+)"[\s\S]{0,400}?"name"\s*:\s*"((?:[^"\\]|\\.)*)"/g

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
 * Tidy an archive title into something comparable: the separators the entry used, and
 * the closing bold, are formatting rather than name.
 *
 * @param {string} raw everything after the number on the archive's bold line
 * @returns {string} the title alone
 */
function archiveTitle (raw) {
  return String(raw || '')
    .replace(/^[\s—·\-–:]+/, '')
    .replace(/\*\*.*$/, '')
    .replace(/[.\s]+$/, '')
    .trim()
}

/**
 * Every item a machine holds, as number AND name.
 *
 * The live list is JSON, so it is parsed as JSON — the field order in that file is the
 * ranking control's to rewrite, and a regex that assumed `name` follows `ref` would start
 * pairing the wrong two the first time it saved them the other way round. The regex is
 * kept as the fallback for a branch caught mid-edit with a list that will not parse: half
 * a read beats none, and this report can never block anything.
 *
 * @param {string} liveJson contents of to-do-items.json
 * @param {string} archiveMd contents of to-do-done-and-parked.md
 * @returns {Array<{ref: string, name: string}>} every item found, in the order found
 */
function entriesIn (liveJson, archiveMd) {
  var out = []
  var parsed = null
  try {
    parsed = JSON.parse(String(liveJson || ''))
  } catch (err) {
    parsed = null
  }

  if (parsed && Array.isArray(parsed.items)) {
    parsed.items.forEach(function (item) {
      if (item && /^\d+\.\d+$/.test(String(item.ref))) {
        out.push({ ref: String(item.ref), name: String(item.name || '') })
      }
    })
  } else {
    var live = new RegExp(LIVE_ENTRY.source, LIVE_ENTRY.flags)
    var m
    while ((m = live.exec(String(liveJson || ''))) !== null) {
      out.push({ ref: m[1], name: m[2] })
    }
  }

  var arch = new RegExp(ARCHIVE_ENTRY.source, ARCHIVE_ENTRY.flags)
  var a
  while ((a = arch.exec(String(archiveMd || ''))) !== null) {
    out.push({ ref: a[1], name: archiveTitle(a[2]) })
  }
  return out
}

/**
 * Do two titles describe the same job?
 *
 * Deliberately generous, because the cost is asymmetric: a false alarm costs a glance at
 * two titles printed side by side, and a miss costs what 4.100 cost — twenty-six files.
 * But a title edited on one branch and not the other must not read as a collision, so a
 * trimmed or extended version of the same title counts as the same job, as does a title
 * sharing half its substantial words.
 *
 * An empty name answers YES. A ref we cannot name is a ref we cannot judge, and shouting
 * about one would train the reader to scroll past the box that matters.
 *
 * @param {string} a one branch's title for a ref
 * @param {string} b another branch's title for the same ref
 * @returns {boolean} true when they are the same piece of work
 */
function sameJob (a, b) {
  var x = String(a || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  var y = String(b || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!x || !y || x === y) { return true }
  if (x.indexOf(y) === 0 || y.indexOf(x) === 0) { return true }

  var big = function (s) { return s.split(' ').filter(function (w) { return w.length >= 4 }) }
  var wx = big(x)
  var wy = big(y)
  if (wx.length === 0 || wy.length === 0) { return true }

  var shared = wx.filter(function (w) { return wy.indexOf(w) !== -1 })
  return (shared.length / Math.min(wx.length, wy.length)) >= 0.5
}

/**
 * Numbers that already name two different jobs.
 *
 * This is the one thing here that reports a fault instead of preventing one, so it says
 * which branch holds which, and lets a person read the two titles and decide.
 *
 * Within a single branch only the first sighting of a ref is kept: a duplicate on one
 * branch is `toDoItems.test.js`'s job and it fails the build there, where it can.
 *
 * @param {Array<{label: string, entries: Array<{ref: string, name: string}>}>} branches
 * @returns {Array<{ref: string, sides: Array<{label: string, name: string}>}>} in ref order
 */
function clashes (branches) {
  var byRef = {}
  ;(branches || []).forEach(function (branch) {
    if (!branch || !Array.isArray(branch.entries)) { return }
    branch.entries.forEach(function (entry) {
      var sides = byRef[entry.ref] || (byRef[entry.ref] = [])
      var held = sides.some(function (s) { return s.label === branch.label })
      if (!held) { sides.push({ label: branch.label, name: entry.name }) }
    })
  })

  var found = []
  Object.keys(byRef).forEach(function (ref) {
    var sides = byRef[ref]
    if (sides.length < 2) { return }
    var differs = sides.slice(1).some(function (s) { return !sameJob(sides[0].name, s.name) })
    if (differs) { found.push({ ref: ref, sides: sides }) }
  })
  return found.sort(function (a, b) { return compareRefs(a.ref, b.ref) })
}

/**
 * The old flat families, closed by design/ITEM-NUMBERING.md §2 and never reissued.
 *
 * They were a serial scheme wearing a hierarchy's clothes — 85 of 90 archived items are
 * `4.x` and share no subject at all — and 613 references to them are written into 279 code
 * files. A table that offered `4.103` back would be handing out a number whose family is
 * shut, which is how a comment ends up pointing at the wrong job for good.
 *
 * Parent 5 is NOT here: `5.1`–`5.5` are five deleted items from the old scheme, and parent
 * 5 (Model Library) is live with children of its own. §2 calls that collision name-only.
 */
var CLOSED_FAMILIES = [2, 3, 4]

/**
 * Collisions that already happened, were found, and are WRITTEN DOWN — design/
 * ITEM-NUMBERING.md §5 lists all eleven. They are history, not news.
 *
 * They matter here because the clash check finds them every single morning, and a red box
 * that cries the same nine names every session is a box nobody reads by Thursday. The one
 * that must be seen is a NEW one. These get a single quiet line instead.
 */
var RECORDED_CLASHES = ['4.81', '4.88', '4.89', '4.90', '4.91', '4.92', '4.93', '4.94', '4.96']

/**
 * The next free decimal of every OPEN subject in use.
 *
 * Always the highest plus one, never the lowest gap: a gap means an item was deleted, and
 * `to-do-done-and-parked.md` says which. A number is spent for good once used.
 *
 * @param {string[]} refs every ref in use across every branch
 * @returns {Array<{subject: number, next: string}>} lowest subject first, closed ones out
 */
function nextFreeBySubject (refs) {
  var top = {}
  ;(refs || []).forEach(function (r) {
    var m = /^(\d+)\.(\d+)$/.exec(String(r))
    if (!m) { return }
    var subject = m[1]
    var decimal = parseInt(m[2], 10)
    if (top[subject] === undefined || decimal > top[subject]) { top[subject] = decimal }
  })

  return Object.keys(top).map(function (subject) {
    return { subject: parseInt(subject, 10), next: subject + '.' + (top[subject] + 1) }
  }).filter(function (row) {
    return CLOSED_FAMILIES.indexOf(row.subject) === -1
  }).sort(function (a, b) { return a.subject - b.subject })
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
 * A clash leads, because it is the only part of this box that reports something already
 * wrong. Where there is none — the ordinary morning — the box still opens on what a
 * number means, which is what stops the next one being guessed.
 *
 * @param {Array<{label: string, highest: string|null, entries: (Array|undefined)}>} rows
 *   one per branch read; `entries` may be absent, and then only the ceiling is reported
 * @returns {string[]|null} lines to print, or null when nothing could be read
 */
function describeCeiling (rows) {
  var known = (rows || []).filter(function (r) { return r && r.highest })
  if (known.length === 0) { return null }

  var ceiling = highest(known.map(function (r) { return r.highest }))
  var width = known.reduce(function (w, r) { return r.label.length > w ? r.label.length : w }, 0)

  var everyRef = []
  known.forEach(function (row) {
    (row.entries || []).forEach(function (e) { everyRef.push(e.ref) })
  })

  var lines = []

  var all = clashes(known)
  var recorded = all.filter(function (c) { return RECORDED_CLASHES.indexOf(c.ref) !== -1 })

  all.filter(function (c) { return RECORDED_CLASHES.indexOf(c.ref) === -1 }).forEach(function (clash) {
    lines.push('🔴 ONE NUMBER, TWO DIFFERENT JOBS — settle it before either branch merges.')
    lines.push('')
    clash.sides.forEach(function (side) {
      lines.push('  ' + clash.ref + '  on ' + side.label)
      lines.push('        "' + String(side.name || '(no title)').slice(0, 96) + '"')
    })
    lines.push('')
    lines.push('  Renumbering one costs every file that quotes it — 4.100 cost twenty-six —')
    lines.push('  so the later-filed one moves, and which that is, is Mike\'s call.')
    lines.push('')
  })

  if (recorded.length > 0) {
    lines.push('Already recorded, nothing to do: ' + recorded.map(function (c) { return c.ref }).join(', ') +
      ' — design/ITEM-NUMBERING.md §5.')
    lines.push('')
  }

  lines.push('A WHOLE NUMBER IS A SUBJECT; ITS DECIMALS ARE THE JOBS IN IT.')
  lines.push('')
  lines.push('  Job on an EXISTING subject   the next free decimal, in the table below')
  lines.push('                               (what each subject is: design/ITEM-NUMBERING.md)')
  lines.push('  A subject that has none      ' + nextParent([ceiling]) + '  — the next free parent')
  lines.push('')
  lines.push('Take the number from here, never from your own branch — the other machine\'s')
  lines.push('numbers are invisible to you until its work reaches `master`.')
  lines.push('')

  known.forEach(function (row) {
    var pad = row.label + new Array(width - row.label.length + 1).join(' ')
    lines.push('  ' + pad + '   highest in use ' + row.highest)
  })

  var subjects = nextFreeBySubject(everyRef)
  if (subjects.length > 0) {
    lines.push('')
    lines.push('THE NEXT FREE DECIMAL OF EACH SUBJECT, ACROSS EVERY BRANCH ABOVE:')
    lines.push('')
    for (var i = 0; i < subjects.length; i += 4) {
      lines.push('  ' + subjects.slice(i, i + 4).map(function (s) {
        var cell = s.subject + ' → ' + s.next
        return cell + new Array(Math.max(1, 15 - cell.length)).join(' ')
      }).join('').replace(/\s+$/, ''))
    }
    lines.push('')
    lines.push('  ' + CLOSED_FAMILIES.map(function (n) { return n + '.x' }).join(' ') +
      ' are CLOSED families — never reissued, whatever is free in them.')
    lines.push('  (design/ITEM-NUMBERING.md §2 — 613 references to them live in 279 files.)')
  }

  lines.push('')
  lines.push('Live items AND closed ones are counted: a number is spent for good once')
  lines.push('used. Guessing this produced TWELVE duplicated refs — 4.81, 4.88-4.92 and')
  lines.push('4.94 sit twice in the archive, where the uniqueness guard does not reach.')
  return lines
}

/**
 * Read both list files from one branch, as numbers WITH names.
 *
 * @param {function(string[]): (string|null)} gitSafe a non-throwing git runner
 * @param {string} ref a branch or remote-tracking ref to read from
 * @returns {Array<{ref: string, name: string}>|null} null when neither file can be read
 */
function entriesOn (gitSafe, ref) {
  var live = gitSafe(['show', ref + ':' + LIVE_LIST])
  var archive = gitSafe(['show', ref + ':' + ARCHIVE])
  if (live === null && archive === null) { return null }
  return entriesIn(live || '', archive || '')
}

/**
 * The highest ref one branch holds.
 *
 * @param {function(string[]): (string|null)} gitSafe a non-throwing git runner
 * @param {string} ref a branch or remote-tracking ref to read from
 * @returns {string|null} the highest ref that branch holds, or null if unreadable
 */
function highestOn (gitSafe, ref) {
  var entries = entriesOn(gitSafe, ref)
  if (entries === null) { return null }
  return highest(entries.map(function (e) { return e.ref }))
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
  var topOf = function (entries) {
    return entries === null ? null : highest(entries.map(function (e) { return e.ref }))
  }
  var row = function (label, entries) {
    return { label: label, highest: topOf(entries), entries: entries || [] }
  }

  var mine = local
    ? entriesIn(local.live || '', local.archive || '')
    : entriesOn(gitSafe, 'HEAD')
  var rows = [row('this branch (' + currentBranch + ')', mine)]

  var raw = gitSafe(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'])
  if (raw) {
    raw.split('\n').forEach(function (entry) {
      var name = String(entry).trim()
      if (!isCandidate(name, currentBranch)) { return }
      rows.push(row(name, entriesOn(gitSafe, name)))
    })
  }

  return describeCeiling(rows)
}

module.exports = {
  refsIn: refsIn,
  entriesIn: entriesIn,
  compareRefs: compareRefs,
  highest: highest,
  nextAfter: nextAfter,
  nextParent: nextParent,
  nextFreeBySubject: nextFreeBySubject,
  sameJob: sameJob,
  clashes: clashes,
  describeCeiling: describeCeiling,
  entriesOn: entriesOn,
  highestOn: highestOn,
  ceilingLines: ceilingLines
}
