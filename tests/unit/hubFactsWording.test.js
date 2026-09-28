/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy, englishMocks } = require('../helpers/mountComponent')
const copyDeadlineWords = require('~/mixins/copyDeadlineWords').default
const { scheduleUnreadSentence } = require('~/utils/scheduleUnreadWords')
const FirmMeetingPatterns = require('~/components/firm/FirmMeetingPatterns.vue').default

/**
 * Item 10.2 — the hub's backend now sends facts, and each screen words them in its reader's
 * language. These pin the one thing a German-language walk would never show: that the ENGLISH
 * a manager reads is exactly what the backend used to write — the singular at one, "due
 * today" at zero, the page list joined with "and". Those sentences sit on a legal deadline
 * and a depreciation gap, where a slip reads as carelessness about the obligation itself.
 */

/** A bare host for the mixin, with real English. */
function host () {
  return mountWithBuefy({ mixins: [copyDeadlineWords], render: h => h('div') }, { mocks: englishMocks() }).vm
}

describe('a copy request\'s deadline and clock, worded on the screen', () => {
  it('🔴 says one in the singular and many in the plural', () => {
    const vm = host()
    expect(vm.deadlineWords({ count: 1, unit: 'calendar-months' })).toBe('1 calendar month')
    expect(vm.deadlineWords({ count: 20, unit: 'working-days' })).toBe('20 working days')
    expect(vm.clockWords({ remaining: 1, unit: 'working-days' })).toBe('1 working day left')
  })

  it('🔴 counts down, runs overdue, and says "due today" at zero rather than "0 … left"', () => {
    const vm = host()
    expect(vm.clockWords({ remaining: 4, unit: 'working-days' })).toBe('4 working days left')
    expect(vm.clockWords({ remaining: -2, unit: 'calendar-days' })).toBe('2 days overdue')
    expect(vm.clockWords({ remaining: 0, unit: 'working-days' })).toBe('due today')
  })

  it('says nothing for a request with no clock, and treats an unknown unit as days', () => {
    const vm = host()
    expect(vm.clockWords(null)).toBe('')
    expect(vm.deadlineWords(null)).toBe('')
    expect(vm.clockWords({ remaining: 3, unit: 'fortnights' })).toBe('3 days left')
    expect(vm.unitName('working-days')).toBe('working days')
  })
})

describe('a country schedule\'s unread pages, worded on the screen', () => {
  const { $t, $tc } = englishMocks()

  it('says nothing when every page was read', () => {
    expect(scheduleUnreadSentence([], 'IR265', $t, $tc)).toBe('')
    expect(scheduleUnreadSentence(null, 'IR265', $t, $tc)).toBe('')
  })

  it('🔴 names one range, and several joined as a person writes them', () => {
    expect(scheduleUnreadSentence([{ from: 41, to: 48 }], 'IR265', $t, $tc)).toBe(
      'Some of this schedule could not be read: page 41–48 of IR265 were not read, so a class printed there is missing from this list.')
    expect(scheduleUnreadSentence([{ from: 41, to: 48 }, { from: 50, to: 50 }, { from: 52, to: 53 }], 'IR265', $t, $tc))
      .toContain('pages 41–48, 50 and 52–53 of IR265')
  })
})

describe('the meeting patterns month', () => {
  it('🔴 asks for the month itself, in the reader\'s language, on a day no timezone can move', () => {
    const $d = jest.fn(() => 'Aug 2026')
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ tier: 'firm_manager', period: { year: 2026, month: 8 } }) }))
    const vm = mountWithBuefy(FirmMeetingPatterns, { propsData: { apiToken: 't' }, mocks: { $d } }).vm
    vm.period = { year: 2026, month: 8 }
    expect(vm.periodWords).toBe('Aug 2026')
    const [date, format] = $d.mock.calls[$d.mock.calls.length - 1]
    expect(format).toBe('monthYear')
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 7, 15])
    delete global.fetch
  })
})
