'use strict'

// 🔴 WHY THIS EXISTS. On 2026-09-18 the desktop took live item `7.12` — an open
// defect about the wrong model being offered — and typed a different job over the
// top of it, keeping the number:
//
//   -  "name": "The right calculator is offered only sometimes, and sometimes the wrong one is",
//   +  "name": "The model's page is recalled by the AI, not looked up",
//
// One row, one file, one machine. No number appeared twice, so `toDoItems.test.js`
// passed. Both machines held the identical file, so nothing was out of step and the
// branch check had nothing to compare. Every gate passed honestly, and the defect was
// one merge away from being deleted from the shared list with no trace of it ever
// having existed. It was caught by luck, not by a control.
//
// WHY THE GUARD IS NOT ON THE NAME. Measured over 414 commits and 60 days of both
// branches: a live item's `name` changed 40 times, almost all of them honest — `4.58`
// alone walked "three slices built" → "four slices built" → "five slices built" as the
// work progressed. The name is a STATUS LINE, not an identity, and a guard on it would
// have raised ~26 false alarms in two months and been switched off inside a week.
//
// WHAT IS the identity is the date the job was asked for. It cannot change for a given
// job — a different date is different work. Over the same 3,693 ref-to-ref comparisons
// that rule raised THREE alarms and no false ones: `7.12` above, plus `7.5` (16 Sep) and
// `4.67` (5 Sep), two earlier numbers that changed meaning inside a merge and cost a day
// each to unpick.
//
// THE BASELINE IS `origin/master`, DELIBERATELY — not the previous commit. Both machines
// run several sessions a day, so a check against "last commit" would go quiet the moment
// a later session committed on top. Against master it keeps failing until it is put
// right, and it fails on the machine that made the change, before the work leaves it.
//
// THERE IS NO ESCAPE HATCH, and that is not an oversight. If a number's meaning must
// change, the answer is already written down: a number is spent for good once used
// (`design/ITEM-NUMBERING.md` §2), so the new job takes a new number — the free one
// `npm run check:branch` prints, read across every branch.

const { execFileSync } = require('child_process')
const { readFileSync } = require('fs')
const { resolve } = require('path')

const ROOT = resolve(__dirname, '..', '..')
const LIST_PATH = 'design/features/to-do-items.json'
const BASELINE = 'origin/master'

const items = JSON.parse(readFileSync(resolve(ROOT, LIST_PATH), 'utf8')).items

/**
 * The date a job was asked for, read from its provenance.
 *
 * Every live item carries one — it is the first thing `askedBy.detail` says. The test
 * below holds that true, because a missing date is a row this guard cannot see.
 *
 * @param {object} item one row of the live list
 * @returns {string|null} an ISO date, or null when the row does not record one
 */
function askedOn (item) {
  const detail = (item && item.askedBy && item.askedBy.detail) || ''
  const found = String(detail).match(/(20\d\d-\d\d-\d\d)/)
  return found ? found[1] : null
}

/**
 * The same list as `origin/master` holds it — the shared baseline both machines descend
 * from, whatever either has done since.
 *
 * @returns {{ items: object[] }|{ error: string }} master's rows, or why they could not be read
 */
function baselineList () {
  let raw
  try {
    raw = execFileSync('git', ['show', BASELINE + ':' + LIST_PATH], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    })
  } catch (e) {
    return { error: 'could not read `' + BASELINE + ':' + LIST_PATH + '`. Run `git fetch origin master` and try again.' }
  }
  try {
    return { items: JSON.parse(raw).items }
  } catch (e) {
    return { error: '`' + BASELINE + '` holds a list that is not valid JSON.' }
  }
}

describe('a live item number never changes what it means', () => {
  test('every live item records the date it was asked for', () => {
    const blind = items.filter(i => !askedOn(i)).map(i => i.ref + ' — ' + i.name)
    expect(blind.length ? blind : 'every item dated').toEqual('every item dated')
  })

  test('no number on `master` has been pointed at different work', () => {
    const baseline = baselineList()

    // A guard that can quietly skip is the failure it exists to stop, so say so loudly.
    expect(baseline.error || 'baseline read').toBe('baseline read')

    const was = new Map()
    baseline.items.forEach(i => was.set(i.ref, i))

    const repointed = items
      .map((now) => {
        const before = was.get(now.ref)
        // Filed since master — there is nothing to hold it against.
        if (!before) { return null }
        const then = askedOn(before)
        const still = askedOn(now)
        if (!then || !still || then === still) { return null }
        return [
          'Item ' + now.ref + ' means something different than it does on master.',
          '  asked ' + then + ' — ' + before.name,
          '  asked ' + still + ' — ' + now.name,
          '  A number is spent for good once used (design/ITEM-NUMBERING.md §2).',
          '  Put ' + now.ref + ' back as it was, and file the new job under the free',
          '  number `npm run check:branch` prints — it reads every branch, not just this one.'
        ].join('\n')
      })
      .filter(Boolean)

    expect(repointed.length ? repointed.join('\n\n') : 'every number still means what it meant')
      .toBe('every number still means what it meant')
  })
})
