/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const speechMixin = require('~/mixins/speechMixin').default

/**
 * Microphone lifecycle.
 *
 * Two defects, both logged from the code-review sweep and both with consequences beyond
 * tidiness:
 *
 *   1. NO TEARDOWN — the recogniser outlived the component. `onend` saw `isListening`
 *      still true on the destroyed instance and restarted it, so the browser's recording
 *      indicator stayed on and audio kept being captured after the advisor left the
 *      screen. That is a privacy problem, not a leak.
 *   2. INFINITE START→ERROR LOOP — on a permission denial the handler cleared only
 *      `isListening`. A profile or review field stayed set, so `onend` restarted, which
 *      errored again, for ever.
 *
 * The fake below mimics the real API's ordering: `start()` may throw if already running,
 * `abort()` fires `onend`, and an error is always followed by `onend` — which is what
 * made the loop possible in the first place.
 */

/** A stand-in for the browser's SpeechRecognition. */
function makeFakeEngine (log) {
  return function FakeRecognition () {
    this.running = false
    this.onresult = null
    this.onend = null
    this.onerror = null
    this.start = () => {
      log.push('start')
      if (this.running) { throw new Error('already started') }
      this.running = true
    }
    this.stop = () => {
      log.push('stop')
      this.running = false
      if (this.onend) { this.onend() }
    }
    this.abort = () => {
      log.push('abort')
      this.running = false
      if (this.onend) { this.onend() }
    }
    /** Real engines fire onerror and then onend. */
    this.fail = (error) => {
      this.running = false
      if (this.onerror) { this.onerror({ error }) }
      if (this.onend) { this.onend() }
    }
  }
}

const HostComponent = {
  name: 'SpeechHost',
  mixins: [speechMixin],
  data () {
    return { inputText: '', advisorProfile: {}, reviewDraft: {} }
  },
  render (h) { return h('div') }
}

let log

function mountHost () {
  log = []
  window.SpeechRecognition = makeFakeEngine(log)
  return mountWithBuefy(HostComponent, {})
}

afterEach(() => { delete window.SpeechRecognition })

describe('speechMixin — releasing the microphone', () => {
  it('aborts the recogniser when the component is destroyed', () => {
    const wrapper = mountHost()
    wrapper.vm.toggleListening()
    expect(wrapper.vm.recognition.running).toBe(true)

    wrapper.destroy()

    expect(log).toContain('abort')
    expect(wrapper.vm.recognition.running).toBe(false)
  })

  it('does NOT restart after destroy — the bug that kept the mic live', () => {
    // The engine's own onend fires during teardown. Before the fix it saw isListening
    // still true and called start() again, on a component the advisor had left.
    const wrapper = mountHost()
    wrapper.vm.toggleListening()
    log.length = 0

    wrapper.destroy()

    expect(log).not.toContain('start')
  })

  it('clears every recording flag on destroy', () => {
    const wrapper = mountHost()
    wrapper.vm.toggleProfileListening('goals')
    expect(wrapper.vm.profileRecordingField).toBe('goals')

    wrapper.destroy()

    expect(wrapper.vm.isListening).toBe(false)
    expect(wrapper.vm.profileRecordingField).toBeNull()
    expect(wrapper.vm.reviewRecordingField).toBeNull()
  })

  it('survives being destroyed without ever having listened', () => {
    const wrapper = mountHost()
    expect(() => wrapper.destroy()).not.toThrow()
  })
})

describe('speechMixin — a refused microphone stops asking', () => {
  it('does not loop when permission is denied mid profile-recording', () => {
    // The reported loop: onerror cleared isListening only, the profile field stayed
    // set, onend restarted, the engine errored again — for ever.
    const wrapper = mountHost()
    wrapper.vm.toggleProfileListening('goals')
    log.length = 0

    wrapper.vm.recognition.fail('not-allowed')

    expect(log.filter(x => x === 'start')).toHaveLength(0)
    expect(wrapper.vm.profileRecordingField).toBeNull()
    expect(wrapper.vm.isListening).toBe(false)
  })

  it('does not loop when permission is denied mid review-recording', () => {
    const wrapper = mountHost()
    wrapper.vm.toggleReviewListening('notes')
    log.length = 0

    wrapper.vm.recognition.fail('audio-capture')

    expect(log.filter(x => x === 'start')).toHaveLength(0)
    expect(wrapper.vm.reviewRecordingField).toBeNull()
  })

  it('KEEPS listening through a silence, which is not a failure', () => {
    // 'no-speech' just means the advisor paused. Treating it as fatal would cut them
    // off mid-thought — the reason the original code special-cased it.
    const wrapper = mountHost()
    wrapper.vm.toggleListening()
    log.length = 0

    wrapper.vm.recognition.fail('no-speech')

    expect(log).toContain('start')
    expect(wrapper.vm.isListening).toBe(true)
  })
})

describe('speechMixin — degrades where speech is unsupported', () => {
  it('reports unsupported and ignores the toggles rather than throwing', () => {
    log = []
    delete window.SpeechRecognition
    const wrapper = mountWithBuefy(HostComponent, {})

    expect(wrapper.vm.speechSupported).toBe(false)
    expect(() => wrapper.vm.toggleListening()).not.toThrow()
    expect(() => wrapper.destroy()).not.toThrow()
  })
})
