/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * Course Builder's microphone listens in the reader's language, as the advisor chat does.
 * Until 2026-09-25 it was fixed to American English, so an advisor speaking German got
 * garbled English text — which no screen or test showed, because the words still arrived.
 */

const { mountWithBuefy, englishMocks } = require('../helpers/mountComponent')
const CourseBuilder = require('~/components/CourseBuilder.vue').default

function FakeRecognition () {
  this.start = () => {}
  this.stop = () => {}
  this.abort = () => {}
}

function mountIn (locale) {
  window.SpeechRecognition = FakeRecognition
  const mocks = Object.assign(englishMocks(), { $i18n: { locale } })
  return mountWithBuefy(CourseBuilder, {
    propsData: { advisorId: 'advisor-1', firmId: 'firm-1', apiToken: '' },
    mocks
  })
}

beforeEach(() => { jest.spyOn(console, 'warn').mockImplementation(() => {}) })
afterEach(() => {
  delete window.SpeechRecognition
  jest.restoreAllMocks()
})

test.each([
  ['de', 'de-DE'],
  ['ja', 'ja-JP'],
  ['en', 'en-US'],
  ['eo', 'en-US'] // a language with no speech code falls back rather than guessing
])('a reader in %s is listened to in %s', (locale, expected) => {
  const wrapper = mountIn(locale)

  expect(wrapper.vm.recognition.lang).toBe(expected)
  wrapper.destroy()
})
