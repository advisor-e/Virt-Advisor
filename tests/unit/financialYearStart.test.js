/**
 * The financial year a new budget opens on.
 *
 * This earns its place because UAT cannot see it. A budget opening on the wrong year is
 * twelve correct-looking month labels — the screen is complete, the arithmetic is right,
 * and only the year is a year out. Both budget screens shipped hardcoded to the sample
 * workbook's '2021-04' and nobody caught it for months.
 *
 * The boundary is the point: on 31 March the financial year is still the previous April's,
 * and on 1 April it is not. A test is the only place that gets checked on both days.
 */

const { financialYearStart } = require('../../utils/financialYearStart')

const APRIL = 4

// Constructed year/month/day, so these read as local dates and not as UTC strings.
const on = (y, m, d) => new Date(y, m - 1, d)

describe('financialYearStart', () => {
  it('gives the current year once the start month has been reached', () => {
    expect(financialYearStart(on(2026, 9, 13), APRIL)).toBe('2026-04')
  })

  it('gives the previous year for a date before the start month', () => {
    expect(financialYearStart(on(2026, 1, 31), APRIL)).toBe('2025-04')
  })

  it('turns over ON the first of the start month, not after it', () => {
    expect(financialYearStart(on(2026, 3, 31), APRIL)).toBe('2025-04')
    expect(financialYearStart(on(2026, 4, 1), APRIL)).toBe('2026-04')
  })

  it('holds the year across the calendar new year', () => {
    expect(financialYearStart(on(2026, 12, 31), APRIL)).toBe('2026-04')
    expect(financialYearStart(on(2027, 1, 1), APRIL)).toBe('2026-04')
    expect(financialYearStart(on(2027, 3, 31), APRIL)).toBe('2026-04')
    expect(financialYearStart(on(2027, 4, 1), APRIL)).toBe('2027-04')
  })

  it('handles a January financial year, where every date is in its own year', () => {
    expect(financialYearStart(on(2026, 1, 1), 1)).toBe('2026-01')
    expect(financialYearStart(on(2026, 12, 31), 1)).toBe('2026-01')
  })

  it('pads a single-digit month to the two digits a month input needs', () => {
    expect(financialYearStart(on(2026, 9, 13), 7)).toBe('2026-07')
    expect(financialYearStart(on(2026, 5, 13), 7)).toBe('2025-07')
  })

  it('falls back to today rather than emitting a broken value', () => {
    const now = new Date()
    const expected = financialYearStart(now, APRIL)
    expect(financialYearStart(undefined, APRIL)).toBe(expected)
    expect(financialYearStart(new Date('nonsense'), APRIL)).toBe(expected)
  })

  it('falls back to January for a start month outside 1-12', () => {
    expect(financialYearStart(on(2026, 9, 13), 0)).toBe('2026-01')
    expect(financialYearStart(on(2026, 9, 13), 13)).toBe('2026-01')
    expect(financialYearStart(on(2026, 9, 13), 4.5)).toBe('2026-01')
  })

  it('always answers the YYYY-MM shape a month input accepts', () => {
    for (let m = 1; m <= 12; m++) {
      expect(financialYearStart(on(2026, 6, 15), m)).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/)
    }
  })
})
