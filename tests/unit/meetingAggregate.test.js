'use strict'

/**
 * The manager's aggregate — the arithmetic behind "are the observation points landing?"
 *
 * 🔴 EVERY TEST HERE GUARDS SOMETHING A PERSON IN UAT CANNOT SEE. A screen showing "17 / 28"
 * looks equally correct whether the threshold held or not, whether the month was right or not,
 * and whether an advisor's identifier travelled with the counts or not. That is the whole reason
 * this file exists — the wording and the bars are a tester's job, and are not asserted here.
 *
 *   1. **The threshold, both halves.** Mike's ruling, 2026-09-01: 5 advisors AND 20 meetings.
 *      A firm that meets one and not the other must see nothing, and the failure mode is silent.
 *   2. **No advisor identifier in the output.** The counts are the product; the identities are
 *      scaffolding. A leak here is a privacy breach that renders as a perfectly ordinary screen.
 *   3. **The per-point floor.** Above the overall gate, a point checked in three meetings would
 *      print "1 / 3" — reversible to one person, which is the reversal the gate exists to stop.
 *   4. **What counts as contributing.** A meeting with no coaching notes cannot say whether a
 *      point landed; counting it would deflate every percentage while looking reasonable.
 */

const {
  MIN_ADVISORS,
  MIN_MEETINGS,
  periodOf,
  periodLabel,
  inPeriod,
  outcomeOf,
  summarise
} = require('../../server/utils/meetingAggregate')

const PERIOD = { year: 2026, month: 8 }

/**
 * One meeting record with coaching notes.
 *
 * @param {string} advisor
 * @param {Array<object>} findings
 * @param {string} [createdAt]
 * @returns {{meta: object, coaching: object}}
 */
function meeting (advisor, findings, createdAt) {
  return {
    meta: {
      meetingId: 'm' + Math.random().toString(16).slice(2),
      firmId: 'firm-1',
      advisor,
      createdAt: createdAt || '2026-08-14T10:00:00.000Z'
    },
    coaching: { findings }
  }
}

/** `n` meetings spread over `advisorCount` advisors, all meeting the one point. */
function bulk (n, advisorCount, state) {
  const out = []
  for (let i = 0; i < n; i++) {
    out.push(meeting('adv-' + (i % advisorCount), [
      { pointId: 'p1', text: 'Meeting framed in the first two minutes', state: state || 'found' }
    ]))
  }
  return out
}

describe('the threshold Mike ruled — 5 advisors and 20 meetings', () => {
  test('the ruled numbers are what the module holds', () => {
    expect(MIN_ADVISORS).toBe(5)
    expect(MIN_MEETINGS).toBe(20)
  })

  test('enough meetings but too few advisors shows nothing', () => {
    const out = summarise(bulk(30, 4), PERIOD)
    expect(out.advisors).toBe(4)
    expect(out.meetings).toBe(30)
    expect(out.enough).toBe(false)
    expect(out.points).toEqual([])
  })

  test('enough advisors but too few meetings shows nothing', () => {
    const out = summarise(bulk(19, 6), PERIOD)
    expect(out.meetings).toBe(19)
    expect(out.enough).toBe(false)
    expect(out.points).toEqual([])
  })

  test('exactly on both numbers is enough — the boundary is inclusive', () => {
    const out = summarise(bulk(20, 5), PERIOD)
    expect(out.advisors).toBe(5)
    expect(out.meetings).toBe(20)
    expect(out.enough).toBe(true)
    expect(out.points).toHaveLength(1)
  })

  test('below the gate the figures are NOT computed, only withheld', () => {
    // The distinction matters: a caller cannot reach past the flag for a number that was
    // never worked out, whereas one that was computed and hidden is one render away.
    const out = summarise(bulk(10, 2), PERIOD)
    expect(out.points).toEqual([])
  })
})

describe('no advisor identifier survives the aggregation', () => {
  test('nothing anywhere in the result mentions an advisor', () => {
    const rows = bulk(24, 6)
    const out = summarise(rows, PERIOD)
    expect(out.enough).toBe(true)
    const serialised = JSON.stringify(out)
    rows.forEach((r) => {
      expect(serialised).not.toContain(r.meta.advisor)
    })
    expect(serialised).not.toContain('adv-')
  })

  test('advisors are reported as a count and never as a list', () => {
    const out = summarise(bulk(24, 6), PERIOD)
    expect(out.advisors).toBe(6)
    expect(Array.isArray(out.advisors)).toBe(false)
  })

  test('a meeting with no advisor recorded is not counted as an advisor', () => {
    const rows = bulk(20, 5)
    rows.push(meeting(null, [{ pointId: 'p1', text: 'x', state: 'found' }]))
    const out = summarise(rows, PERIOD)
    expect(out.advisors).toBe(5)
    expect(out.meetings).toBe(21)
  })
})

describe('the per-point floor', () => {
  test('a point checked in fewer than 20 meetings is omitted entirely', () => {
    const rows = bulk(24, 6)
    // One rare point, on three meetings only.
    rows.slice(0, 3).forEach((r) => {
      r.coaching.findings.push({ pointId: 'rare', text: 'A rare point', state: 'not_found' })
    })
    const out = summarise(rows, PERIOD)
    const ids = out.points.map(p => p.pointId)
    expect(ids).toContain('p1')
    expect(ids).not.toContain('rare')
  })

  test('a point on exactly 20 meetings is shown', () => {
    const rows = bulk(24, 6)
    rows.slice(0, 20).forEach((r) => {
      r.coaching.findings.push({ pointId: 'edge', text: 'Edge point', state: 'found' })
    })
    const out = summarise(rows, PERIOD)
    const edge = out.points.filter(p => p.pointId === 'edge')[0]
    expect(edge).toBeDefined()
    expect(edge.of).toBe(20)
    expect(edge.met).toBe(20)
  })
})

describe('what a finding counts as', () => {
  test('found is met, not found is missed', () => {
    expect(outcomeOf({ state: 'found' })).toBe(true)
    expect(outcomeOf({ state: 'not_found' })).toBe(false)
  })

  test('an un-hearable point counts only once the advisor has answered', () => {
    expect(outcomeOf({ state: 'cannot_hear', advisorAnswer: true })).toBe(true)
    expect(outcomeOf({ state: 'cannot_hear', advisorAnswer: false })).toBe(false)
    expect(outcomeOf({ state: 'cannot_hear', advisorAnswer: null })).toBeNull()
  })

  test('an unanswered un-hearable point leaves the DENOMINATOR too', () => {
    // "We never asked" is not "it did not happen". Counting it as a miss would tell a manager
    // the point is being dropped when the software simply could not hear it.
    const rows = bulk(24, 6)
    rows.slice(0, 22).forEach((r) => {
      r.coaching.findings.push({ pointId: 'drew', text: 'I drew it out', state: 'cannot_hear', advisorAnswer: null })
    })
    const out = summarise(rows, PERIOD)
    expect(out.points.map(p => p.pointId)).not.toContain('drew')
  })

  test('an unknown state is not counted either way', () => {
    expect(outcomeOf({ state: 'something-new' })).toBeNull()
    expect(outcomeOf(null)).toBeNull()
    expect(outcomeOf('nonsense')).toBeNull()
  })

  test('a finding with no point id is ignored rather than counted under an empty key', () => {
    const rows = bulk(20, 5)
    rows[0].coaching.findings.push({ pointId: '', text: 'orphan', state: 'found' })
    const out = summarise(rows, PERIOD)
    expect(out.points.map(p => p.pointId)).toEqual(['p1'])
  })
})

describe('which meetings contribute', () => {
  test('a meeting with no coaching notes does not contribute', () => {
    const rows = bulk(20, 5)
    rows.push({ meta: { firmId: 'firm-1', advisor: 'adv-9', createdAt: '2026-08-02T09:00:00.000Z' }, coaching: null })
    const out = summarise(rows, PERIOD)
    expect(out.meetings).toBe(20)
    expect(out.advisors).toBe(5)
  })

  test('a meeting from another month does not contribute', () => {
    const rows = bulk(20, 5)
    rows.push(meeting('adv-9', [{ pointId: 'p1', text: 'x', state: 'found' }], '2026-07-31T23:00:00.000Z'))
    const out = summarise(rows, PERIOD)
    expect(out.meetings).toBe(20)
  })

  test('the month is taken from when the meeting HAPPENED', () => {
    expect(inPeriod({ createdAt: '2026-08-14T12:00:00.000Z' }, PERIOD)).toBe(true)
    expect(inPeriod({ createdAt: '2026-09-14T12:00:00.000Z' }, PERIOD)).toBe(false)
  })

  test('🔴 the month is read in UTC, so the same records count the same on every server', () => {
    // Read in local time, these two land in different months in half the world's timezones and
    // the same month in the other half — and nothing on screen would say which had happened.
    expect(inPeriod({ createdAt: '2026-08-31T23:59:59.000Z' }, PERIOD)).toBe(true)
    expect(inPeriod({ createdAt: '2026-09-01T00:00:01.000Z' }, PERIOD)).toBe(false)
    expect(inPeriod({ createdAt: '2026-08-01T00:00:01.000Z' }, PERIOD)).toBe(true)
    expect(inPeriod({ createdAt: '2026-07-31T23:59:59.000Z' }, PERIOD)).toBe(false)
    expect(periodOf(new Date('2026-08-31T23:59:59.000Z'))).toEqual({ year: 2026, month: 8 })
  })

  test('an unreadable or missing date is not counted', () => {
    expect(inPeriod({ createdAt: 'not a date' }, PERIOD)).toBe(false)
    expect(inPeriod({}, PERIOD)).toBe(false)
    expect(inPeriod(null, PERIOD)).toBe(false)
  })

  test('no meetings at all is an honest empty answer, not a crash', () => {
    const out = summarise([], PERIOD)
    expect(out.meetings).toBe(0)
    expect(out.advisors).toBe(0)
    expect(out.enough).toBe(false)
    expect(out.points).toEqual([])
  })

  test('a malformed records argument is survived', () => {
    expect(summarise(null, PERIOD).meetings).toBe(0)
    expect(summarise([null, undefined, {}], PERIOD).meetings).toBe(0)
  })
})

describe('counting', () => {
  test('met and total are the two numbers the screen prints', () => {
    const rows = bulk(14, 5, 'found').concat(bulk(10, 5, 'not_found'))
    const out = summarise(rows, PERIOD)
    const p1 = out.points[0]
    expect(p1.of).toBe(24)
    expect(p1.met).toBe(14)
  })

  test('the period carries the label the drawing prints', () => {
    expect(periodLabel({ year: 2026, month: 8 })).toBe('Aug 2026')
    expect(periodLabel({ year: 2026, month: 1 })).toBe('Jan 2026')
    expect(periodLabel({ year: 2026, month: 12 })).toBe('Dec 2026')
  })

  test('periodOf reads a date as a 1-12 month', () => {
    expect(periodOf(new Date('2026-01-15T00:00:00.000Z')).month).toBeGreaterThanOrEqual(1)
    expect(periodOf(new Date('2026-08-15T12:00:00.000Z'))).toEqual({ year: 2026, month: 8 })
  })
})
