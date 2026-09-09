'use strict'

/**
 * The client copy request's deadline — Mike's ruling 6 of 2026-09-10.
 *
 * 🔴 WHAT THESE TESTS EARN, and none of it is visible to a person testing in UAT:
 *
 *   1. **The unit is part of the setting.** New Zealand allows 20 WORKING days; the UK and EU
 *      work to one CALENDAR month. A build that stored a bare number would show a London firm
 *      a due date roughly eight days later than the law allows, and the screen would look
 *      perfectly normal doing it. That is a wrong number reaching a legal deadline.
 *   2. **The countdown is in the firm's own unit.** Telling a firm on working days that it has
 *      "6 days" when four of them are a weekend is how a request is left until Monday and
 *      missed.
 *   3. **The cascade fails upward, never to a guess.** A firm that has set nothing tracks the
 *      level above; malformed storage reads as "set nothing" rather than throwing, because a
 *      manager who cannot open the tab cannot answer the client waiting on it.
 *
 * ⚠ PUBLIC HOLIDAYS ARE NOT EXCLUDED and cannot be — the module says so. The pinned
 * consequence is that the due date is EARLIER than a strict legal reading, which is the safe
 * direction, and one test holds that direction in place.
 */

const d = require('../../server/utils/copyRequestDeadline')

/** A loader over a plain map, standing in for the overlay. */
function loaderFor (map) {
  return (scopeId, key) => {
    if (key !== d.CONFIG_KEY) { return Promise.resolve(null) }
    return Promise.resolve(
      Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : null
    )
  }
}

describe('the deadline setting', () => {
  it('defaults to 20 working days — New Zealand’s statutory maximum', () => {
    expect(d.PLATFORM_DEFAULT).toEqual({ count: 20, unit: 'working-days' })
  })

  it('offers calendar months, so "one calendar month" is expressible as itself', () => {
    // 🔴 THE POINT OF THE THIRD UNIT. Approximating the UK/EU figure as 28 or 30 days would
    // be a legal deadline replaced by one nobody chose.
    expect(d.UNIT_VALUES).toContain('calendar-months')
    const checked = d.validateDeadline(1, 'calendar-months')
    expect(checked.ok).toBe(true)
  })

  it('refuses an unknown unit rather than assuming days', () => {
    const checked = d.validateDeadline(20, 'fortnights')
    expect(checked.ok).toBe(false)
    expect(checked.value).toBeNull()
  })

  it('refuses a fractional count rather than rounding it', () => {
    // Rounding a manager's typing into a deadline is worse than refusing it — the same rule
    // as validateRetentionMonths, and for the same reason.
    const checked = d.validateDeadline(17.5, 'working-days')
    expect(checked.ok).toBe(false)
    expect(checked.errors[0]).toMatch(/whole number/)
  })

  it('applies a different range per unit', () => {
    expect(d.validateDeadline(24, 'calendar-months').ok).toBe(true)
    expect(d.validateDeadline(25, 'calendar-months').ok).toBe(false)
    expect(d.validateDeadline(260, 'working-days').ok).toBe(true)
    expect(d.validateDeadline(0, 'working-days').ok).toBe(false)
  })

  it('reads malformed storage as "nothing set" rather than throwing', () => {
    expect(d.readStoredDeadline(null)).toBeNull()
    expect(d.readStoredDeadline('20 days')).toBeNull()
    expect(d.readStoredDeadline({ count: 20 })).toBeNull()
    expect(d.readStoredDeadline({ count: 20, unit: 'working-days' }))
      .toEqual({ count: 20, unit: 'working-days' })
  })
})

describe('the cascade', () => {
  it('falls to the platform default when nothing is set anywhere', async () => {
    const resolved = await d.loadResolvedDeadline('firm-a', loaderFor({}))
    expect(resolved.count).toBe(20)
    expect(resolved.unit).toBe('working-days')
    expect(resolved.source).toBe(d.DEADLINE_SOURCES.platform)
    expect(resolved.setAtScope).toBeNull()
  })

  it('uses a scope’s own figure and says it was set there', async () => {
    const resolved = await d.loadResolvedDeadline(
      'firm-a', loaderFor({ 'firm-a': { count: 1, unit: 'calendar-months' } })
    )
    expect(resolved).toMatchObject({
      count: 1,
      unit: 'calendar-months',
      source: d.DEADLINE_SOURCES.own,
      setAtScope: 'firm-a'
    })
  })

  it('never rejects when the store throws — it falls upward and logs', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const angry = () => Promise.reject(new Error('store down'))
    const resolved = await d.loadResolvedDeadline('firm-a', angry)
    expect(resolved.count).toBe(20)
    spy.mockRestore()
  })

  it('returns the platform default for a null scope without touching the store', async () => {
    const loader = jest.fn()
    const resolved = await d.loadResolvedDeadline(null, loader)
    expect(resolved.source).toBe(d.DEADLINE_SOURCES.platform)
    expect(loader).not.toHaveBeenCalled()
  })
})

describe('the due date', () => {
  // 2 September 2026 is a Wednesday.
  const RECEIVED = '2026-09-02T00:00:00Z'

  it('counts 20 working days as weekdays, landing on 30 September', () => {
    const due = d.dueDate(RECEIVED, { count: 20, unit: 'working-days' })
    expect(due.toISOString().slice(0, 10)).toBe('2026-09-30')
  })

  it('never lands a working-day deadline on a weekend', () => {
    for (let n = 1; n <= 40; n += 1) {
      const due = d.dueDate(RECEIVED, { count: n, unit: 'working-days' })
      expect([0, 6]).not.toContain(due.getUTCDay())
    }
  })

  it('does not count the day the request arrived', () => {
    // A request received on Monday with one working day is due Tuesday. Counting the arrival
    // day would quietly take a day off every allowance.
    const monday = '2026-09-07T00:00:00Z'
    const due = d.dueDate(monday, { count: 1, unit: 'working-days' })
    expect(due.toISOString().slice(0, 10)).toBe('2026-09-08')
  })

  it('gives a Saturday arrival its full allowance rather than losing a day to the weekend', () => {
    const saturday = '2026-09-05T00:00:00Z'
    const monday = '2026-09-07T00:00:00Z'
    expect(d.dueDate(saturday, { count: 5, unit: 'working-days' }).toISOString())
      .toBe(d.dueDate(monday, { count: 5, unit: 'working-days' }).toISOString())
  })

  it('🔴 lands EARLIER than a strict legal reading, because holidays are not excluded', () => {
    // The module cannot know any country's holidays and says so. Excluding only weekends
    // uses the allowance up faster, so the firm is prompted SOONER than it strictly must be.
    // That is the safe direction for a deadline, and this test is what holds it there: a
    // future "improvement" that padded the count would push real due dates LATER than the law.
    const weekendsOnly = d.dueDate(RECEIVED, { count: 20, unit: 'working-days' })
    const ifOneHolidayWereExcluded = d.dueDate(RECEIVED, { count: 21, unit: 'working-days' })
    expect(weekendsOnly.getTime()).toBeLessThan(ifOneHolidayWereExcluded.getTime())
  })

  it('🔴 makes 20 working days exactly four weeks — so it is never longer than a month', () => {
    // THE ARITHMETIC THE UNIT EXISTS TO PROTECT, and it is not symmetric.
    //
    // Before public holidays, 20 working days is exactly 4 weeks — 28 calendar days, every
    // time, from any weekday. A calendar month is 28 to 31. So the month is ALWAYS at least
    // as long, equal only across a non-leap February.
    //
    // ⚠ WHICH MAKES ONE SUBSTITUTION SAFE AND THE OTHER NOT. Showing a UK firm the New Zealand
    // figure would have them answer EARLY — wrong, but harmless. Showing a New Zealand firm
    // "one calendar month" would hand them up to three days they do not legally have, on a
    // screen that looked entirely reasonable. That is the one this file refuses to allow, and
    // it is why the unit is stored rather than inferred from anything.
    const weekdays = ['2026-09-02', '2026-04-06', '2026-11-13']
    weekdays.forEach((day) => {
      const wd = d.dueDate(day + 'T00:00:00Z', { count: 20, unit: 'working-days' })
      const spanDays = Math.round((wd - new Date(day + 'T00:00:00Z')) / 86400000)
      expect(spanDays).toBe(28)

      const month = d.dueDate(day + 'T00:00:00Z', { count: 1, unit: 'calendar-months' })
      expect(month.getTime()).toBeGreaterThanOrEqual(wd.getTime())
    })

    // Equal across a 28-day February, which is the edge that makes "they're the same thing"
    // look true to anyone who checks once in the wrong month.
    const febWd = d.dueDate('2026-02-02T00:00:00Z', { count: 20, unit: 'working-days' })
    const febMonth = d.dueDate('2026-02-02T00:00:00Z', { count: 1, unit: 'calendar-months' })
    expect(febMonth.getTime()).toBe(febWd.getTime())
  })

  it('normalises a calendar-month overflow forward, matching meetingPurge', () => {
    // 31 January plus one month is 3 March in a non-leap year. Later than the promise rather
    // than earlier, and the same normalisation meetingPurge.expiryOf uses, so the two agree.
    const due = d.dueDate('2026-01-31T00:00:00Z', { count: 1, unit: 'calendar-months' })
    expect(due.toISOString().slice(0, 10)).toBe('2026-03-03')
  })

  it('returns null for an unusable date or deadline rather than a wrong one', () => {
    expect(d.dueDate('not a date', { count: 20, unit: 'working-days' })).toBeNull()
    expect(d.dueDate(RECEIVED, { count: 0, unit: 'working-days' })).toBeNull()
    expect(d.dueDate(RECEIVED, null)).toBeNull()
  })
})

describe('what is left', () => {
  const RECEIVED = '2026-09-02T00:00:00Z'
  const NZ = { count: 20, unit: 'working-days' }

  it('counts down in the firm’s own unit, not in days', () => {
    // 🔴 24 September is a Thursday; four working days remain to the 30th. Six CALENDAR days
    // remain, four of them a weekend — which is the number that gets a request left till
    // Monday and missed.
    const left = d.timeRemaining(RECEIVED, NZ, new Date('2026-09-24T00:00:00Z'))
    expect(left.remaining).toBe(4)
    expect(left.unit).toBe('working-days')
    expect(d.remainingPhrase(left)).toBe('4 working days left')
  })

  it('reports a calendar-month deadline as days, because months are not a countdown', () => {
    const left = d.timeRemaining(RECEIVED, { count: 1, unit: 'calendar-months' },
      new Date('2026-09-28T00:00:00Z'))
    expect(left.unit).toBe('calendar-days')
    expect(left.remaining).toBe(4)
  })

  it('goes negative when overdue and says by how much', () => {
    const left = d.timeRemaining(RECEIVED, NZ, new Date('2026-10-05T00:00:00Z'))
    expect(left.overdue).toBe(true)
    expect(left.remaining).toBeLessThan(0)
    expect(d.remainingPhrase(left)).toMatch(/overdue$/)
  })

  it('says "due today" rather than "0 working days left"', () => {
    const left = d.timeRemaining(RECEIVED, NZ, new Date('2026-09-30T12:00:00Z'))
    expect(left.remaining).toBe(0)
    expect(d.remainingPhrase(left)).toBe('due today')
  })

  it('is not skewed by the time of day', () => {
    const morning = d.timeRemaining(RECEIVED, NZ, new Date('2026-09-24T00:01:00Z'))
    const night = d.timeRemaining(RECEIVED, NZ, new Date('2026-09-24T23:59:00Z'))
    expect(morning.remaining).toBe(night.remaining)
  })

  it('returns null rather than a misleading clock when the deadline is unusable', () => {
    expect(d.timeRemaining(RECEIVED, { count: 0, unit: 'working-days' })).toBeNull()
  })
})

describe('the words', () => {
  it('uses the singular where the count is one', () => {
    expect(d.deadlinePhrase({ count: 1, unit: 'calendar-months' })).toBe('1 calendar month')
    expect(d.deadlinePhrase({ count: 20, unit: 'working-days' })).toBe('20 working days')
  })

  it('falls back to the platform default rather than printing nothing', () => {
    expect(d.deadlinePhrase(null)).toBe('20 working days')
    expect(d.deadlinePhrase({ count: 999, unit: 'working-days' })).toBe('20 working days')
  })

  it('returns an empty string for an unusable remaining figure', () => {
    expect(d.remainingPhrase(null)).toBe('')
    expect(d.remainingPhrase({})).toBe('')
  })
})
