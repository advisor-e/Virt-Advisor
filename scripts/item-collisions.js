/**
 * item-collisions.js — which to-do items BOTH machines have commits against.
 *
 * 🔴 THE DEFECT THIS EXISTS FOR, 2026-09-23. At 11:00 the desktop deleted item 7.13 from
 * the live list, having argued it was unnecessary. At 11:45 the laptop pushed a ~1,000-line
 * build OF THAT ITEM — an injector, an id allocator and two test files. Neither machine
 * could see the other, and BOTH had followed every rule we own.
 *
 * ⚠ THE CLAIMING FIELD DID NOT FAIL. IT WAS NEVER SET. `active-items.js` reads
 * `activeOn: { machine, since }` and reports it faithfully — but ONE item out of
 * twenty-nine carried it that morning. The laptop had been building 7.13 for hours and
 * had not claimed it, so the desktop's startup correctly reported the item as unclaimed
 * and free. **A rule that depends on a session remembering to fill in a field is not a
 * rule, it is a hope**, and it protected nothing the first time it was tested.
 *
 * 🔴 SO THIS CHECK ASKS WHAT PEOPLE DID, NOT WHAT THEY DECLARED. Commits cannot be
 * forgotten — they are the work itself. The desktop's startup on 2026-09-23 would have
 * read "the laptop has commits against 7.13" straight off the other branch, and the
 * deletion would never have been proposed. That is the whole of it.
 *
 * WHERE THE ITEM NUMBER COMES FROM: the commit subject, which this repository writes as
 * `type(ref): summary` — `feat(7.13):`, `chore(14.4):`, `docs(8.1):`. It is a convention,
 * not a schema, so this reads it leniently and reports nothing when it finds nothing.
 * A missed collision is the status quo; a FALSE one would teach people to ignore the box,
 * which is worse than silence.
 *
 * ⚠ THIS DOES NOT AND MUST NOT BLOCK. Structural, like `branch-survey` and `active-items`:
 * nothing here exits, throws past its caller, or is reachable from the two rules that
 * refuse a push. Two machines touching one item is a conversation to have, never a reason
 * to refuse somebody's work — and a check that blocked would be disabled within a week.
 *
 * Node 14.15 / CommonJS per the Stack Constitution. No dependencies.
 */

'use strict'

var activeItems = require('./active-items')

var PROTECTED_BRANCH = 'master'

/**
 * How many of the other machine's commit subjects to read. Generous: the drift this
 * repository is built to catch reached 97 commits, and a survey that stopped at 20 would
 * have gone quiet exactly when it mattered most.
 */
var MAX_COMMITS = 400

/**
 * The item ref in a commit subject, or null.
 *
 * Matches the `type(ref):` prefix only — never the free text after the colon, because a
 * summary that happens to mention another item ("supersedes 7.5") is discussion, not work
 * against it. Reading the whole subject was tried on paper and rejected for that reason:
 * it turns every cross-reference into a false collision.
 *
 * A ref is digits with optional dots (`8`, `7.13`, `15.12`). Anything else in that slot is
 * a conventional-commit scope rather than an item — `chore(handover)`, `docs(integration)`
 * — and yields null, which is why the test for it is on the SHAPE and not on a list of
 * known scopes that would need maintaining.
 *
 * @param {string} subject one commit subject line
 * @returns {string|null} the ref, e.g. '7.13', or null when the subject names no item
 */
function refInSubject (subject) {
  var m = /^[a-z]+\(([0-9]+(?:\.[0-9]+)*)\)\s*:/i.exec(String(subject || '').trim())
  return m ? m[1] : null
}

/**
 * Every item ref a list of commit subjects works against, de-duplicated, in order.
 *
 * @param {string[]} subjects commit subject lines
 * @returns {string[]} refs
 */
function refsFrom (subjects) {
  var seen = {}
  var out = []
  ;(subjects || []).forEach(function (s) {
    var ref = refInSubject(s)
    if (!ref || seen[ref]) { return }
    seen[ref] = true
    out.push(ref)
  })
  return out
}

/**
 * The refs both sides have commits against.
 *
 * Order follows THIS machine's refs, so the most recently worked item on this branch is
 * read first — the one a session is most likely to be about to touch again.
 *
 * @param {string[]} mine refs from this branch's unmerged commits
 * @param {string[]} theirs refs from the other branch's unmerged commits
 * @returns {string[]} refs present in both
 */
function collisionsBetween (mine, theirs) {
  var other = {}
  ;(theirs || []).forEach(function (r) { other[r] = true })
  return (mine || []).filter(function (r) { return other[r] })
}

/**
 * The report, as lines — or null when there is nothing to say, so the caller prints no
 * box at all rather than an empty one.
 *
 * @param {Array<{ref: string, machine: string|null, branch: string, mine: number, theirs: number}>} hits
 * @returns {string[]|null}
 */
function reportLines (hits) {
  if (!hits || !hits.length) { return null }
  var lines = []
  lines.push('BOTH MACHINES HAVE COMMITS AGAINST THESE ITEMS. Neither branch is merged, so')
  lines.push('neither machine can see the other\'s work. Talk to Mike BEFORE touching them.')
  lines.push('')
  hits.forEach(function (h) {
    var who = h.machine ? 'the ' + h.machine : h.branch
    lines.push('  ' + h.ref + '  — this branch: ' + h.mine + ' commit(s) · ' + who + ': ' + h.theirs + ' commit(s)')
  })
  lines.push('')
  lines.push('Read the other branch before you judge the item:')
  lines.push('  git log --oneline origin/' + PROTECTED_BRANCH + '..<their branch> --grep "(<ref>)"')
  lines.push('')
  lines.push('⚠ A commit on both sides is not proof of a clash, and it is never proof there')
  lines.push('  is none — it is the question worth asking. On 2026-09-23 one machine deleted')
  lines.push('  item 7.13 as unnecessary while the other was building it, 45 minutes apart.')
  return lines
}

/**
 * Gather both sides and report. The only function here that talks to git.
 *
 * Every git call is through the caller's `gitSafe`, which returns null rather than
 * throwing, and any null gives up the whole report: a partial answer here would be read
 * as "no collisions", which is the one wrong thing this must never say.
 *
 * ⚠ NO FETCH. `branch-survey.surveyLines` has already fetched by the time this runs, and
 * a second fetch would double the startup's slowest step to re-read what is already local.
 *
 * @param {function(string[]): (string|null)} gitSafe non-throwing git runner
 * @param {string} currentBranch the branch we are standing on
 * @returns {string[]|null} lines, or null when there is nothing to report
 */
function collisionLines (gitSafe, currentBranch) {
  var subjects = function (range) {
    var raw = gitSafe(['log', '--format=%s', '--max-count=' + MAX_COMMITS, range])
    return raw === null ? null : (raw ? raw.split('\n') : [])
  }

  var mineSubjects = subjects('origin/' + PROTECTED_BRANCH + '..HEAD')
  if (mineSubjects === null) { return null }
  var mineRefs = refsFrom(mineSubjects)
  // Nothing of ours to collide with. Cheap exit before paying for the other branches.
  if (!mineRefs.length) { return null }

  var raw = gitSafe(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'])
  if (raw === null) { return null }

  var hits = []
  raw.split('\n').forEach(function (entry) {
    var ref = String(entry || '').trim()
    var name = ref.indexOf('origin/') === 0 ? ref.slice(7) : ref
    // Only the OTHER machines' branches. A machine's own branch is this side of the
    // comparison, and `master` is the baseline both sides are measured from.
    var machine = activeItems.machineFor(name)
    if (!machine || name === currentBranch) { return }

    var theirSubjects = subjects('origin/' + PROTECTED_BRANCH + '..' + ref)
    if (theirSubjects === null) { return }
    var theirRefs = refsFrom(theirSubjects)

    collisionsBetween(mineRefs, theirRefs).forEach(function (r) {
      hits.push({
        ref: r,
        machine: machine,
        branch: name,
        mine: mineSubjects.filter(function (s) { return refInSubject(s) === r }).length,
        theirs: theirSubjects.filter(function (s) { return refInSubject(s) === r }).length
      })
    })
  })

  return reportLines(hits)
}

module.exports = {
  MAX_COMMITS: MAX_COMMITS,
  refInSubject: refInSubject,
  refsFrom: refsFrom,
  collisionsBetween: collisionsBetween,
  reportLines: reportLines,
  collisionLines: collisionLines
}
