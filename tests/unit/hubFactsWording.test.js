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

describe('🔴 a schedule with unread pages still draws, under the REAL translator', () => {
  // Found 2026-09-29: the screens passed `this.$t` detached, and vue-i18n's real $t reads
  // `this.$i18n` — so it threw, and the Country Rate Schedules table drew BLANK for any schedule
  // with unread pages (IR265 always has some). The mocks above are plain functions and cannot
  // see it; this mounts the screen with vue-i18n itself installed.
  const { createLocalVue, mount } = require('@vue/test-utils')
  const Buefy = require('buefy').default
  const VueI18n = require('vue-i18n')
  const CountryRateSchedules = require('~/components/firm/CountryRateSchedules.vue').default

  afterEach(() => { delete global.fetch })

  it('lists the schedule and names its gap', async () => {
    const localVue = createLocalVue()
    localVue.use(Buefy)
    localVue.use(VueI18n)
    const i18n = new VueI18n({ locale: 'en', messages: { en: require('~/locales/en.json') } })
    const schedule = { country: 'NZ', document: 'IR265', published: '2023-10', approvedBy: 'm', approvedAt: '2026-09-29T00:00:00Z', classes: 2302, unresolved: 2, pagesUnread: [{ from: 54, to: 58 }], originTier: 'mentor', inherited: true }
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ schedules: [schedule], reads: [], mayLoad: true }) }))

    const wrapper = mount(CountryRateSchedules, { localVue, i18n, propsData: { apiToken: 't' } })
    for (let i = 0; i < 6; i++) { await wrapper.vm.$nextTick(); await Promise.resolve() }

    const row = wrapper.find('.crs table tbody tr')
    expect(row.exists()).toBe(true)
    expect(row.text()).toContain('54–58 of IR265')
  })
})

describe('the client copy request screen has no English of its own', () => {
  // Found while fixing 10.2: this screen held ~60 English phrases typed into the page, so a
  // manager reading the hub in German met it entirely in English — and an English-speaking
  // tester in UAT can never see that. Rendered with the KEY stub, every word the screen shows
  // must be a key, a person's name or a date. A phrase typed back into the page fails here.
  const Detail = require('~/components/shared/ClientCopyRequestDetail.vue').default
  const MEETINGS = [
    { meetingId: 'm1', createdAt: '2026-08-27T00:00:00.000Z', yours: true, holds: ['transcript', 'summary'], retentionMonths: 18 },
    { meetingId: 'm2', createdAt: '2026-08-20T00:00:00.000Z', yours: true, holds: ['transcript'], retentionMonths: 18 },
    { meetingId: 'm3', createdAt: '2026-08-10T00:00:00.000Z', yours: false, holds: ['transcript'], advisorName: 'Owen Fraser', retentionMonths: 12 },
    { meetingId: 'm4', createdAt: '2025-01-01T00:00:00.000Z', yours: true, expired: true, expiredReason: 'client-asked', expiredAt: '2026-08-01T00:00:00.000Z', holds: [], retentionMonths: 12 },
    { meetingId: 'm5', createdAt: '2026-06-01T00:00:00.000Z', yours: false, released: true, holds: ['transcript'], retentionMonths: 18 }
  ]
  const RELEASES = [{ meetingId: 'm5', at: '2026-09-06T00:00:00.000Z', releasedBy: 'Sarah Chen', breakGlass: { declaredBy: 'Mike Barnes', absentAdvisor: 'Owen Fraser' } }]
  const ALLOWED = ['Harbour', 'Joinery', 'Owen', 'Fraser', 'Sarah', 'Chen', 'Mike', 'Barnes', 'January', 'June', 'August', 'Sep', 'Aug', 'Feb', 'Jun', 'Jan']

  it('🔴 every word on the screen, and in each of its three dialogs, comes from the wording file', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        request: { id: 'r1', clientName: 'Harbour Joinery', kind: 'copy', state: 'open', receivedAt: '2026-09-02T00:00:00.000Z' },
        meetings: MEETINGS,
        releases: RELEASES,
        clock: { due: '2026-09-30T00:00:00.000Z', remaining: 4, unit: 'working-days', overdue: false }
      })
    })
    const w = mountWithBuefy(Detail, { propsData: { apiToken: 't', requestId: 'r1' }, attachTo: document.body })
    for (let i = 0; i < 6; i++) { await w.vm.$nextTick(); await Promise.resolve() }
    const texts = [document.body.textContent]
    w.vm.target = MEETINGS[2]
    for (const dialog of ['correcting', 'deleting', 'breakingGlass']) {
      w.vm[dialog] = true
      await w.vm.$nextTick()
      texts.push(document.body.textContent)
      w.vm[dialog] = false
      await w.vm.$nextTick()
    }
    const words = texts.join(' ')
      .replace(/[\w.]+\.[\w.-]+/g, ' ') // keys, as the stub returns them
      .replace(/\{[^}]*\}/g, ' ') // the stub's interpolation params
      .match(/[A-Za-z]{3,}/g) || []
    expect(words.filter(x => !ALLOWED.includes(x))).toEqual([])
    w.destroy()
    document.body.innerHTML = ''
    delete global.fetch
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
