'use strict'

/**
 * A strategy session's run sheet — item 8.4, slice 3 (screen 7, approved 2026-09-28).
 *
 * 🔴 A WRONG CLOCK IS A PLAN THAT LOOKS RIGHT. Every time on the agenda follows from the one
 * before, so one wrong rule moves lunch for the whole afternoon, and a tester glancing at the
 * screen sees tidy times either way. These pin the rules Mike ruled:
 *   - a step's figure is the subtotal of its CONCEPTS; a break runs the clock but is not in it;
 *   - a break can sit mid-step;
 *   - "Day 2 starts" restarts the clock at that day's own time;
 *   - no start time means no clock times, never a plan starting at midnight.
 */

const t = require('../../utils/sessionTiming')

const CARDS = ['our-session-objective', 'business-owner-expectations', 'porters-5-forces#1', 'blue-ocean']
const isCard = key => CARDS.includes(key)

// The drawing's own sample: 9:00 start; step 1 = 20 min; step 2 = 30, a 15-minute break, 40.
const STEPS = [
  { items: ['our-session-objective'] },
  { items: ['business-owner-expectations', 'break-aaaaaa', 'porters-5-forces#1'] }
]
const TIMING = {
  startsAt: '09:00',
  minutes: { 'our-session-objective': 20, 'business-owner-expectations': 30, 'break-aaaaaa': 15, 'porters-5-forces#1': 40 },
  days: {}
}

describe('the drawing\'s own sample, worked out', () => {
  const r = t.computeTiming({ steps: STEPS, timing: TIMING, isCard })

  test('each row starts when the one before finishes', () => {
    expect(t.formatClock(r.rows['our-session-objective'].start)).toBe('9:00')
    expect(t.formatClock(r.rows['business-owner-expectations'].start)).toBe('9:20')
    expect(t.formatClock(r.rows['break-aaaaaa'].start)).toBe('9:50')
    expect(t.formatClock(r.rows['porters-5-forces#1'].start)).toBe('10:05')
    expect(t.formatClock(r.rows['porters-5-forces#1'].end)).toBe('10:45')
  })

  test('a step shows its concepts\' subtotal; the break runs its span but not its minutes', () => {
    expect(r.steps[1].minutes).toBe(70)
    expect(t.formatClock(r.steps[1].start)).toBe('9:20')
    expect(t.formatClock(r.steps[1].end)).toBe('10:45')
  })

  test('the footer totals: finishes 10:45 am, 90 min of concepts, 15 min of breaks', () => {
    expect(t.formatClock(r.finishesAt, true)).toBe('10:45 am')
    expect(r.conceptMinutes).toBe(90)
    expect(r.breakMinutes).toBe(15)
  })
})

describe('the rules that move every later time', () => {
  test('no start time: minutes still add up, and no clock time is invented', () => {
    const r = t.computeTiming({ steps: STEPS, timing: { ...TIMING, startsAt: null }, isCard })
    expect(r.steps[1].minutes).toBe(70)
    expect(r.rows['porters-5-forces#1'].start).toBeNull()
    expect(r.finishesAt).toBeNull()
  })

  test('"Day 2 starts" restarts the clock at that day\'s own time, and numbers the day', () => {
    const steps = [{ items: ['our-session-objective', 'day-bbbbbb', 'blue-ocean'] }]
    const timing = { startsAt: '08:00', minutes: { 'our-session-objective': 60, 'blue-ocean': 30 }, days: { 'day-bbbbbb': '09:00' } }
    const r = t.computeTiming({ steps, timing, isCard })
    expect(r.rows['day-bbbbbb']).toMatchObject({ kind: 'day', day: 2 })
    expect(t.formatClock(r.rows['blue-ocean'].start)).toBe('9:00')
    expect(r.rows['blue-ocean'].day).toBe(2)
    expect(r.days).toBe(2)
    expect(t.formatClock(r.finishesAt, true)).toBe('9:30 am')
  })

  test('a day row with no time yet leaves that day\'s times empty rather than guessing', () => {
    const steps = [{ items: ['our-session-objective', 'day-cccccc', 'blue-ocean'] }]
    const r = t.computeTiming({ steps, timing: { startsAt: '08:00', minutes: { 'blue-ocean': 30 }, days: {} }, isCard })
    expect(r.rows['blue-ocean'].start).toBeNull()
  })

  test('a key that is no longer a scoped card takes no time and moves nothing', () => {
    const steps = [{ items: ['our-session-objective', 'unticked-concept', 'blue-ocean'] }]
    const timing = { startsAt: '09:00', minutes: { 'our-session-objective': 10, 'unticked-concept': 99, 'blue-ocean': 10 } }
    const r = t.computeTiming({ steps, timing, isCard })
    expect(r.rows['unticked-concept']).toBeUndefined()
    expect(t.formatClock(r.rows['blue-ocean'].start)).toBe('9:10')
  })

  test.each([[undefined], [-5], [2.5], ['20']])('a missing or malformed minute count (%p) counts as none', (bad) => {
    const r = t.computeTiming({ steps: [{ items: ['blue-ocean'] }], timing: { startsAt: '09:00', minutes: { 'blue-ocean': bad } }, isCard })
    expect(r.rows['blue-ocean'].minutes).toBe(0)
  })

  test('an empty step is a real step with no time and no span', () => {
    const r = t.computeTiming({ steps: [{ items: [] }], timing: TIMING, isCard })
    expect(r.steps[0]).toEqual({ minutes: 0, start: null, end: null })
  })

  test('nothing at all is an honest empty sheet, not a crash', () => {
    const r = t.computeTiming()
    expect(r).toMatchObject({ steps: [], conceptMinutes: 0, breakMinutes: 0, finishesAt: null, days: 1 })
    expect(t.computeTiming({ steps: [{}], timing: null }).steps[0].minutes).toBe(0)
  })
})

describe('reading and printing a time', () => {
  test.each([['09:00', 540], ['00:00', 0], ['23:59', 1439]])('%s is %i minutes past midnight', (clock, mins) => {
    expect(t.parseClock(clock)).toBe(mins)
  })

  test.each([['9:00'], ['24:00'], ['09:60'], [''], [null], ['9am']])('%p is not a clock time', (clock) => {
    expect(t.parseClock(clock)).toBeNull()
  })

  test('twelve-hour, as the drawing prints it, with am and pm when asked', () => {
    expect(t.formatClock(0, true)).toBe('12:00 am')
    expect(t.formatClock(12 * 60, true)).toBe('12:00 pm')
    expect(t.formatClock(13 * 60 + 5)).toBe('1:05')
    expect(t.formatClock(25 * 60 + 10, true)).toBe('1:10 am')
    expect(t.formatClock(null)).toBe('')
  })
})

describe('row keys', () => {
  test('break and day rows are told apart from cards, and from each other', () => {
    expect(t.isBreakKey('break-abc123')).toBe(true)
    expect(t.isDayKey('day-abc123')).toBe(true)
    expect(t.isBreakKey('porters-5-forces#1')).toBe(false)
    expect(t.isDayKey(null)).toBe(false)
  })

  test('a new row key carries its prefix and six hex digits', () => {
    expect(t.newRowKey(t.BREAK_PREFIX, () => 0)).toBe('break-000000')
    expect(t.newRowKey(t.DAY_PREFIX)).toMatch(/^day-[0-9a-f]{6}$/)
  })
})
