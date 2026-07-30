'use strict'

/**
 * Tests for the speech-to-text mixin (mixins/speechMixin.js).
 *
 * The mixin is SSR-safe: it only touches the Web Speech API inside mounted().
 * Rather than a full jsdom mount, each method/hook is invoked against a mock
 * component `this`, with a fake SpeechRecognition where needed. This exercises
 * the toggle logic, the mounted() wiring, and the recognition event handlers.
 */

import mixin, { BCP47_MAP } from '../../mixins/collaborate/speechMixin'

function makeRecognition () {
  return { start: jest.fn(), stop: jest.fn(), continuous: false, interimResults: false, lang: '' }
}

// A mock component `this` for the method tests.
function ctx (over) {
  return Object.assign({
    recognition: makeRecognition(),
    _recognitionRunning: false,
    isListening: false,
    profileRecordingField: null,
    reviewRecordingField: null,
    inputText: 'seed',
    _startRecognition: mixin.methods._startRecognition
  }, over)
}

describe('BCP47_MAP', () => {
  test('maps i18n locales to speech language tags', () => {
    expect(BCP47_MAP.en).toBe('en-US')
    expect(BCP47_MAP.de).toBe('de-DE')
    expect(Object.keys(BCP47_MAP).length).toBeGreaterThan(10)
  })
})

describe('data', () => {
  test('starts idle and unsupported', () => {
    expect(mixin.data()).toEqual({
      isListening: false,
      speechSupported: false,
      recognition: null,
      profileRecordingField: null,
      reviewRecordingField: null,
      voiceField: null
    })
  })
})

describe('toggle methods', () => {
  test('toggleListening is a no-op without recognition support', () => {
    const c = ctx({ recognition: null })
    expect(() => mixin.methods.toggleListening.call(c)).not.toThrow()
  })

  test('toggleListening starts listening and clears the input', () => {
    const c = ctx()
    mixin.methods.toggleListening.call(c)
    expect(c.isListening).toBe(true)
    expect(c.inputText).toBe('')
    expect(c.recognition.start).toHaveBeenCalled()
  })

  test('toggleListening stops when already listening', () => {
    const c = ctx({ isListening: true })
    mixin.methods.toggleListening.call(c)
    expect(c.isListening).toBe(false)
    expect(c.recognition.stop).toHaveBeenCalled()
  })

  test('toggleProfileListening starts, then stops the same field', () => {
    const c = ctx()
    mixin.methods.toggleProfileListening.call(c, 'about')
    expect(c.profileRecordingField).toBe('about')
    expect(c.recognition.start).toHaveBeenCalled()

    mixin.methods.toggleProfileListening.call(c, 'about')
    expect(c.profileRecordingField).toBeNull()
    expect(c.recognition.stop).toHaveBeenCalled()
  })

  test('toggleProfileListening is a no-op without recognition', () => {
    const c = ctx({ recognition: null })
    expect(() => mixin.methods.toggleProfileListening.call(c, 'about')).not.toThrow()
  })

  test('toggleReviewListening starts, then stops the same field', () => {
    const c = ctx()
    mixin.methods.toggleReviewListening.call(c, 'summary')
    expect(c.reviewRecordingField).toBe('summary')

    mixin.methods.toggleReviewListening.call(c, 'summary')
    expect(c.reviewRecordingField).toBeNull()
    expect(c.recognition.stop).toHaveBeenCalled()
  })

  test('toggleReviewListening is a no-op without recognition', () => {
    const c = ctx({ recognition: null })
    expect(() => mixin.methods.toggleReviewListening.call(c, 'summary')).not.toThrow()
  })

  test('toggleVoiceInput starts for a field, then stops the same field', () => {
    const c = ctx({ voiceField: null })
    mixin.methods.toggleVoiceInput.call(c, 'reply')
    expect(c.voiceField).toBe('reply')
    expect(c.recognition.start).toHaveBeenCalled()

    mixin.methods.toggleVoiceInput.call(c, 'reply')
    expect(c.voiceField).toBeNull()
    expect(c.recognition.stop).toHaveBeenCalled()
  })

  test('toggleVoiceInput is a no-op without recognition', () => {
    const c = ctx({ recognition: null, voiceField: null })
    expect(() => mixin.methods.toggleVoiceInput.call(c, 'reply')).not.toThrow()
  })
})

describe('_startRecognition', () => {
  test('is a no-op while recognition is already running', () => {
    const c = ctx({ _recognitionRunning: true })
    mixin.methods._startRecognition.call(c)
    expect(c.recognition.start).not.toHaveBeenCalled()
  })

  test('swallows a start() failure and resets the running flag', () => {
    const rec = makeRecognition()
    rec.start = jest.fn(() => { throw new Error('busy') })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const c = ctx({ recognition: rec })

    mixin.methods._startRecognition.call(c)

    expect(c._recognitionRunning).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('mounted() wiring', () => {
  afterEach(() => { delete global.window })

  test('wires recognition and routes transcripts to the right target', () => {
    function FakeSR () { this.start = jest.fn(); this.stop = jest.fn() }
    global.window = { SpeechRecognition: FakeSR }

    const c = {
      $i18n: { locale: 'de' },
      advisorProfile: {},
reviewDraft: {},
inputText: '',
      profileRecordingField: null,
reviewRecordingField: null,
isListening: false,
      $set: (obj, k, v) => { obj[k] = v }
    }
    mixin.mounted.call(c)

    expect(c.speechSupported).toBe(true)
    expect(c.recognition.lang).toBe('de-DE')

    // Default target = inputText, concatenating all result segments.
    c.recognition.onresult({ results: [[{ transcript: 'hallo ' }], [{ transcript: 'welt' }]] })
    expect(c.inputText).toBe('hallo welt')

    // Profile field target.
    c.profileRecordingField = 'about'
    c.recognition.onresult({ results: [[{ transcript: 'bio text' }]] })
    expect(c.advisorProfile.about).toBe('bio text')

    // Review field target.
    c.profileRecordingField = null
    c.reviewRecordingField = 'summary'
    c.recognition.onresult({ results: [[{ transcript: 'review note' }]] })
    expect(c.reviewDraft.summary).toBe('review note')

    // Generic voice-field target (e.g. a message reply box).
    c.reviewRecordingField = null
    c.voiceField = 'reply'
    c.reply = ''
    c.recognition.onresult({ results: [[{ transcript: 'chat message' }]] })
    expect(c.reply).toBe('chat message')

    // Generic voice-field target with one level of nesting (e.g. 'form.summary').
    c.voiceField = 'form.summary'
    c.form = { summary: '' }
    c.recognition.onresult({ results: [[{ transcript: 'nested text' }]] })
    expect(c.form.summary).toBe('nested text')

    // onerror: ignore 'no-speech', stop listening on anything else.
    c.isListening = true
    c.recognition.onerror({ error: 'no-speech' })
    expect(c.isListening).toBe(true)
    c.recognition.onerror({ error: 'audio-capture' })
    expect(c.isListening).toBe(false)

    // onend restarts while a field is still recording.
    c._recognitionRunning = false
    c.recognition.onend()
    expect(c.recognition.start).toHaveBeenCalled()
  })

  test('defaults the recognition language to en-US for an unmapped locale', () => {
    function FakeSR () { this.start = jest.fn(); this.stop = jest.fn() }
    global.window = { webkitSpeechRecognition: FakeSR }
    const c = { $i18n: { locale: 'xx' }, $set: () => {} }
    mixin.mounted.call(c)
    expect(c.recognition.lang).toBe('en-US')
  })

  test('does nothing when the browser has no Speech API', () => {
    global.window = {}
    const c = { $i18n: { locale: 'en' } }
    mixin.mounted.call(c)
    expect(c.speechSupported).toBeFalsy()
    expect(c.recognition).toBeUndefined()
  })
})
