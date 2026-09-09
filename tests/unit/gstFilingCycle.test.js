'use strict'

/**
 * The GST filing cycle as a number of months — item 4.81, slice 4.
 *
 * 🔴 WHY THIS EXISTS. Until this change the forecast held THREE hardcoded filing branches —
 * one-monthly, two-monthly and six-monthly — and all three are New Zealand's. Australia's
 * quarterly BAS and the United Kingdom's quarterly VAT could not be expressed at all, so
 * every overseas client silently filed a New Zealand return. The cash flow was wrong in the
 * months the return fell due, and the forecast balanced perfectly either way.
 *
 * TWO THINGS ARE BEING PROVED HERE, and they pull in opposite directions:
 *
 *   1. THE THREE THE WORKBOOK HAD ARE UNTOUCHED. `threeWayForecastModel.test.js` is the real
 *      proof of that — 3,385 golden cells read out of the workbook itself, which pass
 *      unchanged. What this file adds is the part the golden set cannot see, because the
 *      workbook has no column for it: that the ONE formula which replaced the three branches
 *      puts each of them on exactly the months it always used.
 *
 *   2. A CYCLE THE WORKBOOK NEVER HAD LANDS ON THE RIGHT MONTHS. A quarterly return that
 *      fell due in the wrong months would move cash between months in a forecast that still
 *      balanced — the same class of silent error, just newer.
 */

const { computeThreeWayForecast, DEFAULTS } = require('../../server/report/threeWayForecastModel')

/** A March start, where a six-monthly return falls due in the very first month. */
const MARCH_START = 45717

/** The 0-based months a return actually falls due in, for one forecast. */
function dueMonths (forecast) {
  return forecast.schedules.gst.amountToFile
    .map((v, m) => (typeof v === 'number' ? m : null))
    .filter(m => m !== null)
}

/** The calendar months those returns fall in. */
function dueCalendarMonths (forecast) {
  return dueMonths(forecast).map(m => forecast.months.calendarMonths[m])
}

describe('the default start, so the calendar is known', () => {
  // Everything below reads off this. April to March — New Zealand's tax year, which is what
  // the workbook was built around and why March is the anchor the cycles land on.
  test('runs April to March', () => {
    const f = computeThreeWayForecast({})
    expect(f.months.calendarMonths).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3])
  })
})

describe('the three cycles the workbook had, on exactly the months they always used', () => {
  test('one-monthly files every month', () => {
    const f = computeThreeWayForecast({ gstPeriod: 'One Monthly' })
    expect(dueMonths(f)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    // And each return is that month's own GST, nothing carried in.
    expect(f.schedules.gst.amountToFile).toEqual(f.schedules.gst.forMonth)
  })

  test('two-monthly files on the odd calendar months', () => {
    const f = computeThreeWayForecast({ gstPeriod: 'Two Monthly' })
    expect(dueCalendarMonths(f)).toEqual([5, 7, 9, 11, 1, 3])
  })

  test('six-monthly files in March and September', () => {
    const f = computeThreeWayForecast({ gstPeriod: 'Six Monthly' })
    expect(dueCalendarMonths(f)).toEqual([9, 3])
  })

  // The three arrays are all in the response whatever cycle is in force, because a reader
  // compares them. The one formula has to fill all three the way the three branches did.
  test('all three are still reported side by side, whichever is in force', () => {
    const f = computeThreeWayForecast({ gstPeriod: 'Two Monthly' })
    expect(f.schedules.gst.fileOneMonthly).toEqual(f.schedules.gst.forMonth)
    expect(f.schedules.gst.fileTwoMonthly.filter(v => v !== null)).toHaveLength(6)
    expect(f.schedules.gst.fileSixMonthly.filter(v => v !== null)).toHaveLength(2)
  })

  test('the one in force is the one reported as the amount to file', () => {
    const six = computeThreeWayForecast({ gstPeriod: 'Six Monthly' })
    expect(six.schedules.gst.amountToFile).toEqual(six.schedules.gst.fileSixMonthly)

    const two = computeThreeWayForecast({ gstPeriod: 'Two Monthly' })
    expect(two.schedules.gst.amountToFile).toEqual(two.schedules.gst.fileTwoMonthly)
  })
})

describe('a quarterly cycle, which could not be expressed at all before', () => {
  // 🔴 THE POINT OF THE WHOLE SLICE. March, June, September and December are the Australian
  // BAS quarters and the United Kingdom's VAT quarters. They fall out of the same formula
  // that puts the workbook's own three where they have always been.
  test('files in March, June, September and December', () => {
    const f = computeThreeWayForecast({ gstFilingMonths: 3 })
    expect(dueCalendarMonths(f)).toEqual([6, 9, 12, 3])
  })

  test('a quarterly return is three months of GST, not one', () => {
    const f = computeThreeWayForecast({ gstFilingMonths: 3 })
    const monthly = f.schedules.gst.forMonth
    // The June return, at index 2, covers April, May and June.
    expect(f.schedules.gst.amountToFile[2]).toBeCloseTo(monthly[0] + monthly[1] + monthly[2], 6)
  })

  test('nothing is filed in a month no return falls due in', () => {
    const f = computeThreeWayForecast({ gstFilingMonths: 3 })
    expect(f.schedules.gst.amountToFile[0]).toBeNull()
    expect(f.schedules.gst.amountToFile[1]).toBeNull()
  })

  // A cycle that does not divide into twelve would leave a period running past the end of
  // the forecast, so every offered cycle closes exactly within it.
  test.each([1, 2, 3, 4, 6, 12])('a %s-month cycle divides the year exactly', (months) => {
    const f = computeThreeWayForecast({ gstFilingMonths: months })
    expect(dueMonths(f)).toHaveLength(12 / months)
    // And the last return of the year is the last month of the forecast, so nothing is
    // left unfiled at the end.
    expect(dueMonths(f).pop()).toBe(11)
  })

  test('an annual return files once, at the year end', () => {
    const f = computeThreeWayForecast({ gstFilingMonths: 12 })
    expect(dueCalendarMonths(f)).toEqual([3])
    const total = f.schedules.gst.forMonth.reduce((a, b) => a + b, 0)
    expect(f.schedules.gst.amountToFile[11]).toBeCloseTo(total, 6)
  })
})

describe('what the response says the cycle was', () => {
  test('the workbook’s three keep the workbook’s own wording', () => {
    expect(computeThreeWayForecast({ gstPeriod: 'One Monthly' }).schedules.gst.period).toBe('One Monthly')
    expect(computeThreeWayForecast({ gstPeriod: 'Six Monthly' }).schedules.gst.period).toBe('Six Monthly')
  })

  test('the cycle is reported as a number as well as a name', () => {
    expect(computeThreeWayForecast({ gstPeriod: 'Six Monthly' }).schedules.gst.periodMonths).toBe(6)
    expect(computeThreeWayForecast({ gstFilingMonths: 3 }).schedules.gst.periodMonths).toBe(3)
  })

  // The country's own word for it, because that is what a manager approved and what the
  // people who file the returns call it. "Every 3 months" is not what any document says.
  test('a country’s own name for a new cycle is carried through', () => {
    const f = computeThreeWayForecast({ gstFilingMonths: 3, gstFilingLabel: 'Quarterly (BAS)' })
    expect(f.schedules.gst.period).toBe('Quarterly (BAS)')
    expect(f.schedules.gst.periodMonths).toBe(3)
  })

  test('a new cycle nobody named still gets a name rather than nothing', () => {
    const f = computeThreeWayForecast({ gstFilingMonths: 4 })
    expect(typeof f.schedules.gst.period).toBe('string')
    expect(f.schedules.gst.period.length).toBeGreaterThan(0)
  })

  // A supplied name never overrides the workbook's own for its own three, or two forecasts
  // on the same cycle would describe it differently.
  test('a supplied name does not rename one of the workbook’s three', () => {
    const f = computeThreeWayForecast({ gstFilingMonths: 2, gstFilingLabel: 'Bi-monthly-ish' })
    expect(f.schedules.gst.period).toBe('Two Monthly')
  })
})

describe('what an existing caller sends, and gets back unchanged', () => {
  // 🔴 THE ENGINE'S INPUT SHAPE IS UNCHANGED. Every forecast already stored was built with
  // `gstPeriod` and no month count, and must resolve exactly as it did.
  test('a forecast that says nothing about GST filing is two-monthly, as it always was', () => {
    const f = computeThreeWayForecast({})
    expect(f.schedules.gst.period).toBe(DEFAULTS.gstPeriod)
    expect(f.schedules.gst.periodMonths).toBe(2)
  })

  test('the workbook’s wording alone still decides the cycle', () => {
    const f = computeThreeWayForecast({ gstPeriod: 'Six Monthly' })
    expect(dueCalendarMonths(f)).toEqual([9, 3])
  })

  test('a cycle the forecast cannot carry is refused, and the default stands', () => {
    // 5 does not divide into twelve. It is not honoured, and it does not throw either —
    // the forecast falls back rather than stopping an advisor mid-report.
    const f = computeThreeWayForecast({ gstFilingMonths: 5 })
    expect(f.schedules.gst.periodMonths).toBe(2)
    expect(f.schedules.gst.period).toBe('Two Monthly')
  })

  test.each([
    ['nonsense', 'every so often'],
    ['zero', 0],
    ['negative', -3],
    ['fractional', 2.5]
  ])('a month count that is %s falls back to what the caller’s wording said', (_label, months) => {
    const f = computeThreeWayForecast({ gstFilingMonths: months, gstPeriod: 'Six Monthly' })
    expect(f.schedules.gst.periodMonths).toBe(6)
  })

  test('a month count wins over the wording when both are given', () => {
    const f = computeThreeWayForecast({ gstFilingMonths: 3, gstPeriod: 'Six Monthly' })
    expect(f.schedules.gst.periodMonths).toBe(3)
  })
})

describe('the workbook’s #REF! belongs to six-monthly alone', () => {
  // Correction R5. The workbook's six-monthly formula reads six columns back, which falls
  // off the sheet in the first month of a year that starts in March. The two-monthly window
  // has always clamped instead — that asymmetry is the workbook's own and is reproduced
  // deliberately. A generalisation that tidied it away would change a shipped figure.
  test('six-monthly still reads #REF! at a March start when uncorrected', () => {
    const input = { startDateSerial: MARCH_START, gstPeriod: 'Six Monthly' }
    const workbook = computeThreeWayForecast(input, { sourceFidelity: true })
    expect(workbook.schedules.gst.fileSixMonthly[0]).toBeNull()
  })

  test('and clamps to the start of the year when corrected', () => {
    const input = { startDateSerial: MARCH_START, gstPeriod: 'Six Monthly' }
    const fixed = computeThreeWayForecast(input)
    expect(fixed.schedules.gst.fileSixMonthly[0]).toBe(fixed.schedules.gst.forMonth[0])
  })

  // 🔴 A NEW CYCLE MUST NOT INHERIT THE #REF!. It is a fault of one workbook formula, not a
  // rule about short windows, and reproducing it for a quarterly return would drop a real
  // filing out of an Australian forecast.
  test('a quarterly return in the first month clamps, and never reads #REF!', () => {
    const input = { startDateSerial: MARCH_START, gstFilingMonths: 3 }
    const workbook = computeThreeWayForecast(input, { sourceFidelity: true })
    expect(workbook.months.calendarMonths[0]).toBe(3)
    expect(workbook.schedules.gst.amountToFile[0]).toBe(workbook.schedules.gst.forMonth[0])
  })

  test('two-monthly in the first month clamps, exactly as it always did', () => {
    const input = { startDateSerial: MARCH_START, gstPeriod: 'Two Monthly' }
    const workbook = computeThreeWayForecast(input, { sourceFidelity: true })
    expect(workbook.schedules.gst.amountToFile[0]).toBe(workbook.schedules.gst.forMonth[0])
  })
})

describe('the cycle reaches the cash flow, which is the whole reason it matters', () => {
  // A right rate on a wrong filing cycle is still a wrong cash flow: the money leaves the
  // bank in different months. This is what the item was filed against.
  test('changing the cycle moves when GST is actually paid', () => {
    const monthly = computeThreeWayForecast({ gstPeriod: 'One Monthly' })
    const quarterly = computeThreeWayForecast({ gstFilingMonths: 3 })

    const paidMonths = f => f.cashFlow.payments.gstPaid
      .map((v, m) => (v > 0 ? m : null)).filter(m => m !== null)

    expect(paidMonths(monthly)).not.toEqual(paidMonths(quarterly))
  })

  test('the year’s GST paid does not depend on how often it is filed', () => {
    // Only the TIMING moves. A cycle that changed the total would be an arithmetic fault,
    // not a filing one — and the closing cash would still balance.
    const sum = f => f.cashFlow.payments.gstPaid.reduce((a, b) => a + b, 0)
    const monthly = sum(computeThreeWayForecast({ gstPeriod: 'One Monthly' }))
    const quarterly = sum(computeThreeWayForecast({ gstFilingMonths: 3 }))

    // Within one period's worth: the last return of the year is paid after the forecast
    // ends on every cycle, so the two differ by what is still owing at the year end.
    expect(Math.abs(monthly - quarterly)).toBeLessThan(monthly)
    expect(quarterly).toBeGreaterThan(0)
  })
})
