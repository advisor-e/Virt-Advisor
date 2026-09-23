'use strict'

/**
 * The five strings Mike approved on the Staff Register Retention screen — item 5.1.
 *
 * 🔴 THIS IS THE NAMED EXCEPTION TO THE NO-ASSERTING-WORDING RULE, NOT A BREACH OF IT.
 * Mike's ruling of 2026-08-24 stops us pinning labels, because a person in UAT sees a wrong
 * word instantly and an assertion costs a rewrite every time a word changes. The same ruling
 * names the exception: *"where wording genuinely must not drift — wording Mike has explicitly
 * approved — pin it in ONE test next to the data it protects, and say in a comment why that
 * string is load-bearing."* This is that one test.
 *
 * WHY THESE FIVE ARE LOAD-BEARING. He approved them on 2026-09-23 from a screenshot of the
 * running page, so they are his words and not ours. Two of them carry more than a label:
 *
 *   - **The ceiling line** is the only place a manager is told 18 months is a limit rather
 *     than a suggestion. Without it the dropdown simply stops and looks arbitrary.
 *   - **The closing line** is the only thing telling a manager that shortening the period
 *     deletes nothing today. Decision 8 asked for a visible clock, not a purge; a manager who
 *     believed otherwise would shorten it expecting data to disappear.
 *
 * ⚠ IF A STRING HERE MUST CHANGE, IT IS MIKE'S CALL AND THIS TEST CHANGES WITH IT — the guard
 * follows the approved wording, it is never relaxed to fit a rewrite. That is what happened to
 * 13.1's relabel sentence on 2026-09-23, which this pattern is copied from.
 */

const en = require('../../locales/en.json')

describe('the Staff Register Retention wording Mike approved 2026-09-23', () => {
  const t = en.registerRetention

  it('exists as its own block, so no other screen can move these strings', () => {
    expect(t).toBeTruthy()
  })

  it.each([
    ['inForce', 'In force now'],
    ['label', 'Keep a staff register for'],
    ['useInherited', 'Use the period from above']
  ])('%s reads exactly as approved', (key, approved) => {
    expect(t[key]).toBe(approved)
  })

  // The ceiling is Mike's ruling, and this line is the only place the screen says so.
  // `{max}` is interpolated from the backend's own MAX_MONTHS rather than typed, so the
  // sentence cannot claim a limit the validator does not enforce.
  it('states the ceiling, and takes the number from the backend rather than typing it', () => {
    expect(t.ceilingNote).toBe('{max} months is the longest any level may choose.')
  })

  // 🔴 THE SENTENCE THAT STOPS A MANAGER EXPECTING A DELETION. Decision 8 asked for a
  // visible clock and no purge runs. Removing this line would leave the screen implying one.
  it('says plainly that the dial deletes nothing', () => {
    expect(t.noDeletionNote).toBe(
      'This sets how long a register is kept and shows the date on the register itself. ' +
      'It does not delete anything on its own.')
  })

  // The three cascade badges are the difference between a figure a manager chose and one they
  // are living under. Pinned because "Set here." and "Inherited…" reading alike would make the
  // reset button meaningless — the fault the screen exists to avoid.
  it('keeps the three sources distinguishable', () => {
    expect(t.sourceOwn).not.toBe(t.sourceInherited)
    expect(t.sourceInherited).not.toBe(t.sourcePlatform)
    expect(t.sourceOwn).toBe('Set here.')
  })
})
