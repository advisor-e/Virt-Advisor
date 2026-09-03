/**
 * active-items.js — say which to-do items are in hand, on which computer, and whether
 * that claim is still believable.
 *
 * Why this exists (Mike, 2026-09-03): item 4.54 was built on both machines in the same
 * week, neither knowing. The live list now carries `activeOn: { machine, since }` on any
 * item a session has picked up. A field only a session writes can go stale exactly the
 * way a handover note does — a session ends without shutdown and the item stays marked
 * "in hand" for ever. This is the check that catches that at the next startup.
 *
 * Three verdicts, and nothing else:
 *   other  — active on the other machine. Off limits here; the files it names too.
 *   mine   — active on this machine, and this machine's handover has not been written
 *            since it was set, so the claim is as fresh as it can be.
 *   stale  — active on this machine, but this machine's handover is DATED AFTER the item
 *            was picked up and does not mention the item. A session shut down and said
 *            nothing about it, so it is probably finished or dropped. Ask Mike; clear it.
 *
 * REPORT ONLY — structural, like branch-survey.js. Nothing here exits, throws past its
 * caller, or is reachable from the rules that block a push.
 *
 * Node 14.15 / CommonJS per the Stack Constitution. No dependencies.
 */

'use strict'

/** Which branch is which computer. A branch not listed here is an unknown machine. */
var MACHINE_BY_BRANCH = {
  'feat/firm-quiz-builder-ui': 'desktop',
  'feat/advisor-progress': 'laptop'
}

/**
 * The computer a branch belongs to.
 * @param {string} branch current branch name
 * @returns {string|null} 'desktop', 'laptop', or null if the branch is not a machine's
 */
function machineFor (branch) {
  return MACHINE_BY_BRANCH[branch] || null
}

/**
 * The date of the most recent session in a handover file — its first `## YYYY-MM-DD`
 * heading. Each file carries one session and is replaced each time, so the first date
 * heading is the latest.
 * @param {string} text the handover file's contents
 * @returns {string|null} the date, or null if the file has no dated heading
 */
function handoverDate (text) {
  var m = /^## (\d{4}-\d{2}-\d{2})/m.exec(String(text || ''))
  return m ? m[1] : null
}

/**
 * Judge every active item from this machine's point of view.
 *
 * @param {Array<Object>} items to-do-items.json `items`
 * @param {string|null} machine this computer — 'desktop' | 'laptop' | null
 * @param {string|null} handoverIso date of this machine's latest handover, or null
 * @param {string} handoverText this machine's handover, to look for the item's ref
 * @returns {Array<{ref:string, name:string, machine:string, since:string, verdict:string, touches:string}>}
 */
function assess (items, machine, handoverIso, handoverText) {
  var text = String(handoverText || '')
  return (items || [])
    .filter(function (i) { return i.activeOn && i.activeOn.machine })
    .map(function (i) {
      var mine = machine !== null && i.activeOn.machine === machine
      var verdict = 'other'
      if (mine) {
        // ISO dates compare as strings. A handover written AFTER the item was picked up,
        // that never mentions it, is a session that ended without saying it was still in hand.
        var later = handoverIso !== null && handoverIso > i.activeOn.since
        var mentioned = text.indexOf(i.ref) !== -1
        verdict = later && !mentioned ? 'stale' : 'mine'
      }
      return {
        ref: i.ref,
        name: i.name,
        machine: i.activeOn.machine,
        since: i.activeOn.since,
        verdict: verdict,
        touches: i.touches || ''
      }
    })
}

/**
 * The report, as lines — or null when there is nothing to say, so the caller prints
 * nothing at all rather than an empty box.
 * @param {Array<Object>} verdicts from assess()
 * @param {string|null} machine this computer
 * @returns {string[]|null}
 */
function reportLines (verdicts, machine) {
  if (!verdicts || !verdicts.length) { return null }
  var lines = []
  verdicts.forEach(function (v) {
    if (v.verdict === 'other') {
      lines.push('  ' + v.ref + '  ' + v.name)
      lines.push('       ACTIVE ON THE ' + v.machine.toUpperCase() + ' since ' + v.since +
        ' — off limits on this machine, and so are its files:')
      lines.push('       ' + v.touches)
    } else if (v.verdict === 'stale') {
      lines.push('  ' + v.ref + '  ' + v.name)
      lines.push('       ⚠ marked active on THIS machine since ' + v.since + ', but this machine\'s')
      lines.push('       handover is dated later and does not mention it. A session ended without')
      lines.push('       saying it was still in hand. Ask Mike, then clear `activeOn` or keep it.')
    } else {
      lines.push('  ' + v.ref + '  ' + v.name)
      lines.push('       in hand on this machine since ' + v.since + '.')
    }
  })
  if (machine === null) {
    lines.push('  (this branch is not one of the two machines\', so nothing above is "mine")')
  }
  return lines
}

module.exports = {
  MACHINE_BY_BRANCH: MACHINE_BY_BRANCH,
  machineFor: machineFor,
  handoverDate: handoverDate,
  assess: assess,
  reportLines: reportLines
}
