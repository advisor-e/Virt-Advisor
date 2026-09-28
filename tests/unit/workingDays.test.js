'use strict'

/**
 * Working days — item 8.5. Mike's ruling, 2026-09-28: Monday to Friday, weekends skipped,
 * public holidays counted as ordinary days.
 *
 * 🔴 A WRONG COUNT DELETES A CLIENT'S RECORDING EARLY, and nobody in UAT waits seven working
 * days to see it happen. These pin the count across the weekend, where it goes wrong.
 */

const { isWeekend, addWorkingDays } = require('../../server/utils/workingDays')

// 2026-09-28 is a Monday.
const MON = '2026-09-28T10:00:00.000Z'
const FRI = '2026-10-02T15:00:00.000Z'
const SAT = '2026-10-03T09:00:00.000Z'

describe('weekends', () => {
  test('Saturday and Sunday are weekend days; Monday and Friday are not', () => {
    expect(isWeekend(new Date(SAT))).toBe(true)
    expect(isWeekend(new Date('2026-10-04T09:00:00.000Z'))).toBe(true)
    expect(isWeekend(new Date(MON))).toBe(false)
    expect(isWeekend(new Date(FRI))).toBe(false)
  })
})

describe('adding working days', () => {
  test('seven working days from a Monday is the Wednesday of the following week', () => {
    expect(addWorkingDays(MON, 7).toISOString()).toBe('2026-10-07T10:00:00.000Z')
  })

  test('seven working days from a Friday skips one weekend and lands on the Tuesday after next', () => {
    expect(addWorkingDays(FRI, 7).toISOString()).toBe('2026-10-13T15:00:00.000Z')
  })

  test('a start on a Saturday counts from the Monday, and a full working day must pass', () => {
    expect(addWorkingDays(SAT, 1).toISOString()).toBe('2026-10-05T09:00:00.000Z')
  })

  test('the time of day is kept', () => {
    expect(addWorkingDays(MON, 1).toISOString()).toBe('2026-09-29T10:00:00.000Z')
  })

  test('zero working days is the moment itself', () => {
    expect(addWorkingDays(MON, 0).toISOString()).toBe(MON)
  })

  test('a Date, a string and a number all work', () => {
    const ms = Date.parse(MON)
    expect(addWorkingDays(new Date(ms), 1).getTime()).toBe(addWorkingDays(ms, 1).getTime())
  })

  test.each([
    ['an unreadable date', 'not a date', 7],
    ['a negative count', MON, -1],
    ['a fractional count', MON, 1.5],
    ['a count that is not a number', MON, '7']
  ])('%s gives no deadline rather than a wrong one', (_label, from, count) => {
    expect(addWorkingDays(from, count)).toBeNull()
  })
})
