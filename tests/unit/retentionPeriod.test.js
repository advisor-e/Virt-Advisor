/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * Item 13.12 — how long a firm keeps transcripts, worded on the screen from a number of months.
 *
 * Until 2026-10-03 the backend sent "18 months" in English, so a reader in any other language
 * met it inside the consent screen's privacy sentence. What UAT cannot see: which wording is
 * chosen for one month, and that a figure that could not be read still stops a recording from
 * starting — the consent sentence must never be read aloud with a hole in it.
 */

const retentionPeriod = require('../../mixins/retentionPeriod').default
const MeetingConsentPanel = require('../../components/MeetingConsentPanel.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

const stub = { $t: (k, p) => (p ? k + ' ' + JSON.stringify(p) : k) }
const period = m => retentionPeriod.methods.retentionPeriod.call(stub, m)

describe('the period in the reader\'s language', () => {
  test('one month is singular, any other whole number is counted', () => {
    expect(period(1)).toBe('retentionPeriod.oneMonth')
    expect(period(18)).toBe('retentionPeriod.nMonths {"n":18}')
  })

  test.each([[0], [-3], [null], [undefined], [1.5], [NaN], ['abc']])('an unusable figure (%p) words nothing rather than guessing', (m) => {
    expect(period(m)).toBe('')
  })
})

describe('🔴 the consent panel', () => {
  const mount = retentionMonths => mountWithBuefy(MeetingConsentPanel, { propsData: { step: 1, retentionMonths } })

  test('quotes the firm\'s own period in the approved sentence', () => {
    const w = mount(24)
    expect(w.vm.retentionSentence).toBe('meetingConsent.step1Retention'.replace('{months}', 'retentionPeriod.nMonths {"n":24}'))
    expect(w.vm.period).toBe('retentionPeriod.nMonths {"n":24}')
  })

  test('refuses to start when the period could not be read', () => {
    const start = w => w.findAll('button').at(0)
    expect(start(mount(null)).attributes('disabled')).toBeTruthy()
    expect(start(mount(18)).attributes('disabled')).toBeFalsy()
  })
})
