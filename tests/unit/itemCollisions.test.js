/**
 * The check that asks what the machines DID, not what they declared.
 *
 * 🔴 IT EXISTS BECAUSE THE DECLARING CHECK WORKED PERFECTLY AND SAW NOTHING. On
 * 2026-09-23 the desktop deleted item 7.13 at 11:00, having argued it unnecessary; the
 * laptop pushed a ~1,000-line build of that same item at 11:45. `active-items.js` read
 * `activeOn` faithfully — and ONE item of twenty-nine carried it, so both machines had a
 * green light. These tests hold the replacement to the one property that matters: it
 * reads commits, which nobody can forget to write.
 *
 * What is deliberately NOT tested here: the exact wording of the report. Per the testing
 * rule of 2026-08-24, a person reading the box judges its prose better than an assertion
 * can. What is pinned is which items it names and which it stays silent about, because a
 * false collision teaches people to ignore the box and a missed one is the defect itself.
 */

'use strict'

const collisions = require('../../scripts/item-collisions')

describe('reading the item ref off a commit subject', () => {
  test('the shapes this repository actually writes', () => {
    expect(collisions.refInSubject('feat(7.13): the app owns a model\'s page address')).toBe('7.13')
    expect(collisions.refInSubject('chore(14.4): the code-size stamp moves')).toBe('14.4')
    expect(collisions.refInSubject('docs(8.1): the ZDR intake is SENT')).toBe('8.1')
    expect(collisions.refInSubject('fix(15.12): two teaching pages overflow')).toBe('15.12')
  })

  test('a single-number ref, and a three-part one, both read', () => {
    expect(collisions.refInSubject('feat(16): a client document carries no firm')).toBe('16')
    expect(collisions.refInSubject('feat(1.2.3): deeper than we use today')).toBe('1.2.3')
  })

  // 🔴 THE FALSE-POSITIVE GUARD. A conventional-commit scope sits in the same brackets as
  // an item ref, so a check that took anything in there would flag `handover` and
  // `integration` as items and put nonsense in the box. The test is on the SHAPE — digits
  // and dots — rather than a list of known scopes somebody would have to maintain.
  test('a conventional-commit SCOPE is not an item', () => {
    expect(collisions.refInSubject('chore(handover): the desktop')).toBeNull()
    expect(collisions.refInSubject('docs(integration): the email re-verified')).toBeNull()
    expect(collisions.refInSubject('feat(deps): bump something')).toBeNull()
  })

  test('a subject with no scope at all', () => {
    expect(collisions.refInSubject('Merge origin/master into feat/firm-quiz-builder-ui')).toBeNull()
    expect(collisions.refInSubject('')).toBeNull()
    expect(collisions.refInSubject(null)).toBeNull()
  })

  // ⚠ THE OTHER HALF OF THE FALSE-POSITIVE GUARD, and the reason only the PREFIX is read.
  // A summary that mentions another item is discussion, not work against it. Reading the
  // whole subject would turn every cross-reference into a collision.
  test('an item mentioned in the free text is NOT work against it', () => {
    expect(collisions.refInSubject('feat(7.5): supersedes 7.13 entirely')).toBe('7.5')
    expect(collisions.refInSubject('chore(handover): 7.13 and 8.1 both moved')).toBeNull()
  })
})

describe('refsFrom', () => {
  test('de-duplicates and keeps first-seen order', () => {
    expect(collisions.refsFrom([
      'docs(8.1): third commit',
      'docs(8.1): second commit',
      'chore(7.13): deleted',
      'chore(handover): ignored'
    ])).toEqual(['8.1', '7.13'])
  })

  test('empty and missing input yield nothing', () => {
    expect(collisions.refsFrom([])).toEqual([])
    expect(collisions.refsFrom(null)).toEqual([])
  })
})

describe('collisionsBetween', () => {
  test('only refs present on both sides', () => {
    expect(collisions.collisionsBetween(['8.1', '7.13', '13.3'], ['7.13', '14.4'])).toEqual(['7.13'])
  })

  test('no overlap is silence, not an empty-ish answer', () => {
    expect(collisions.collisionsBetween(['8.1'], ['14.4'])).toEqual([])
  })

  test('order follows this machine, so its latest work reads first', () => {
    expect(collisions.collisionsBetween(['15.1', '7.13'], ['7.13', '15.1'])).toEqual(['15.1', '7.13'])
  })
})

describe('the report', () => {
  test('nothing to say prints no box at all', () => {
    expect(collisions.reportLines([])).toBeNull()
    expect(collisions.reportLines(null)).toBeNull()
  })

  test('a hit names the item and both commit counts', () => {
    const lines = collisions.reportLines([
      { ref: '7.13', machine: 'laptop', branch: 'feat/advisor-progress', mine: 1, theirs: 1 }
    ])
    const text = lines.join('\n')
    expect(text).toContain('7.13')
    expect(text).toContain('laptop')
  })
})

describe('collisionLines — the git-facing half, with git stubbed', () => {
  /**
   * A gitSafe stub driven by a map of "joined args" -> output.
   * @param {Object} responses
   * @returns {function(string[]): (string|null)}
   */
  const stub = responses => (args) => {
    const key = args.join(' ')
    return Object.prototype.hasOwnProperty.call(responses, key) ? responses[key] : null
  }

  const LOG_MINE = 'log --format=%s --max-count=400 origin/master..HEAD'
  const REFS = 'for-each-ref --format=%(refname:short) refs/remotes/origin'
  const LOG_LAPTOP = 'log --format=%s --max-count=400 origin/master..origin/feat/advisor-progress'

  // 🔴 THE SCENARIO OF 2026-09-23, REPRODUCED. If this test ever goes green on a null
  // report, the check has stopped doing the one thing it was built for.
  test('catches the 7.13 collision that actually happened', () => {
    const lines = collisions.collisionLines(stub({
      [LOG_MINE]: 'docs(8.1): the intake is sent\nchore(7.13): deleted as unnecessary',
      [REFS]: 'origin/master\norigin/feat/advisor-progress\norigin/feat/firm-quiz-builder-ui',
      [LOG_LAPTOP]: 'feat(7.13): the app owns a model\'s page address\nchore(14.4): the stamp moves'
    }), 'feat/firm-quiz-builder-ui')

    expect(lines).not.toBeNull()
    expect(lines.join('\n')).toContain('7.13')
    // 8.1 and 14.4 are one-sided, so neither may appear as a collision.
    expect(lines.join('\n')).not.toContain('8.1  —')
    expect(lines.join('\n')).not.toContain('14.4  —')
  })

  test('two machines on different items report nothing', () => {
    expect(collisions.collisionLines(stub({
      [LOG_MINE]: 'docs(8.1): the intake is sent',
      [REFS]: 'origin/master\norigin/feat/advisor-progress',
      [LOG_LAPTOP]: 'chore(14.4): the stamp moves'
    }), 'feat/firm-quiz-builder-ui')).toBeNull()
  })

  test('nothing unmerged on this branch exits before asking about others', () => {
    let askedForRefs = false
    const g = (args) => {
      if (args.join(' ') === REFS) { askedForRefs = true }
      return args.join(' ') === LOG_MINE ? '' : null
    }
    expect(collisions.collisionLines(g, 'feat/firm-quiz-builder-ui')).toBeNull()
    expect(askedForRefs).toBe(false)
  })

  // ⚠ A PARTIAL ANSWER WOULD READ AS "NO COLLISIONS", which is the one wrong thing this
  // must never say. A failed git call gives up the whole report instead.
  test('a failed git call yields null rather than a clean bill of health', () => {
    expect(collisions.collisionLines(() => null, 'feat/firm-quiz-builder-ui')).toBeNull()
  })

  test('a branch that is nobody\'s machine is not compared', () => {
    expect(collisions.collisionLines(stub({
      [LOG_MINE]: 'chore(7.13): deleted',
      [REFS]: 'origin/master\norigin/release/v0.9.0',
      'log --format=%s --max-count=400 origin/master..origin/release/v0.9.0': 'chore(7.13): also here'
    }), 'feat/firm-quiz-builder-ui')).toBeNull()
  })

  // The branch we are standing on appears in the remote list too. Comparing it with
  // itself would report every one of this session's own items as a collision.
  test('this machine\'s own remote branch is not compared with itself', () => {
    expect(collisions.collisionLines(stub({
      [LOG_MINE]: 'chore(7.13): deleted',
      [REFS]: 'origin/master\norigin/feat/firm-quiz-builder-ui',
      'log --format=%s --max-count=400 origin/master..origin/feat/firm-quiz-builder-ui': 'chore(7.13): deleted'
    }), 'feat/firm-quiz-builder-ui')).toBeNull()
  })
})
