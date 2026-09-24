import {
  SPEECH_STATE, recognitionClass, createOnDeviceRecognition, checkOnDevice, installOnDevice
} from '~/utils/onDeviceSpeech'

// BCP-47 speech recognition language codes, keyed by i18n locale
export const BCP47_MAP = {
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  nl: 'nl-NL',
  pl: 'pl-PL',
  sv: 'sv-SE',
  da: 'da-DK',
  fi: 'fi-FI',
  no: 'nb-NO',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ko: 'ko-KR',
  ar: 'ar-SA',
  ru: 'ru-RU',
  tr: 'tr-TR',
  hi: 'hi-IN',
  id: 'id-ID',
  ms: 'ms-MY'
}

export default {
  data () {
    return {
      isListening: false,
      speechSupported: false,
      /** Item 12.2 — see utils/onDeviceSpeech.js. Shown by SpeechStatusLine. */
      speechState: SPEECH_STATE.NONE,
      recognition: null,
      profileRecordingField: null,
      reviewRecordingField: null,
      voiceField: null
    }
  },

  mounted () {
    const SpeechRecognition = recognitionClass(window)
    if (SpeechRecognition) {
      // processLocally is on from the first line: nothing said here leaves the computer (12.2).
      // The same change as mixins/speechMixin.js — two files hold this code.
      this.recognition = createOnDeviceRecognition(SpeechRecognition)
      this._speechClass = SpeechRecognition
      this._needsInstall = false
      this._recognitionRunning = false
      // Non-reactive teardown latch — read by onend, which can fire after destroy.
      this._speechDestroyed = false
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = BCP47_MAP[this.$i18n.locale] || 'en-US'
      this.recognition.onresult = (e) => {
        let transcript = ''
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript
        }
        if (this.profileRecordingField) {
          this.$set(this.advisorProfile, this.profileRecordingField, transcript)
        } else if (this.reviewRecordingField) {
          this.$set(this.reviewDraft, this.reviewRecordingField, transcript)
        } else if (this.voiceField) {
          // Generic: dictate into a data field. Supports a top-level field
          // (e.g. 'reply') or one level of nesting (e.g. 'form.summary' /
          // 'outreach.context'), set via $set so a nested write stays reactive.
          const dot = this.voiceField.indexOf('.')
          if (dot === -1) {
            this[this.voiceField] = transcript
          } else {
            const parent = this.voiceField.slice(0, dot)
            const child = this.voiceField.slice(dot + 1)
            this.$set(this[parent], child, transcript)
          }
        } else {
          this.inputText = transcript
        }
      }
      this.recognition.onend = () => {
        this._recognitionRunning = false
        // The component can go away while the engine is still winding down. Restarting
        // then leaves the microphone live on a screen the advisor has already left.
        if (this._speechDestroyed) { return }
        if (this.isListening || this.profileRecordingField || this.reviewRecordingField || this.voiceField) {
          this._recognitionRunning = true
          try { this.recognition.start() } catch (e) {}
        }
      }
      this.recognition.onerror = (e) => {
        this._recognitionRunning = false
        // 'no-speech' is benign — the advisor simply paused; let onend restart.
        if (e.error === 'no-speech') { return }
        // Anything else (permission denied, no microphone, network) must clear EVERY
        // recording flag. Clearing only `isListening` left a profile/review/voice field
        // set, so onend restarted, which errored again — an endless start→error loop
        // that pinned a CPU core and spammed the console on a single "Block" click.
        this.isListening = false
        this.profileRecordingField = null
        this.reviewRecordingField = null
        this.voiceField = null
      }
      this._checkSpeechOnDevice()
    }
  },

  /**
   * Release the microphone.
   *
   * Without this the recogniser outlived the component: `onend` saw `isListening` still
   * true on the destroyed instance and started it again, so the browser's recording
   * indicator stayed on and audio kept being captured after the advisor navigated away.
   * The handlers are detached BEFORE aborting, so the abort cannot itself trigger a
   * restart.
   *
   * 🔴 THIS FILE WENT WITHOUT IT. The fix was made in `mixins/speechMixin.js` and never
   * reached this copy, so five Collaborate screens — Discover, New Group, Marketplace,
   * Profile and the message pane — kept a live microphone after the advisor left them.
   * Copied across on Mike's ruling, 2026-09-19. Two files hold this code; a fix to one
   * is half a fix.
   */
  beforeDestroy () {
    if (!this.recognition) { return }
    this._speechDestroyed = true
    this.isListening = false
    this.profileRecordingField = null
    this.reviewRecordingField = null
    this.voiceField = null
    this.recognition.onresult = null
    this.recognition.onend = null
    this.recognition.onerror = null
    try { this.recognition.abort() } catch (e) { /* already stopped */ }
    this._recognitionRunning = false
  },

  methods: {
    /**
     * Ask Chrome whether this screen's language works on the computer. Until it answers the
     * microphone is not drawn; a language it cannot do stays off (D1 — never Google).
     */
    async _checkSpeechOnDevice () {
      this.speechState = SPEECH_STATE.CHECKING
      const answer = await checkOnDevice(this._speechClass, this.recognition.lang)
      if (this._speechDestroyed) { return }
      if (answer === 'unavailable') {
        this.speechState = SPEECH_STATE.UNAVAILABLE
        this.speechSupported = false
        return
      }
      this._needsInstall = answer === 'needsInstall'
      this.speechState = SPEECH_STATE.READY
      this.speechSupported = true
    },

    /** True while any box is waiting for words. */
    _speechWanted () {
      return !!(this.isListening || this.profileRecordingField || this.reviewRecordingField || this.voiceField)
    },

    _clearSpeechTargets () {
      this.isListening = false
      this.profileRecordingField = null
      this.reviewRecordingField = null
      this.voiceField = null
    },

    /** The one-off language download, then the recording the advisor asked for (W1, W2). */
    async _installThenStart () {
      if (this.speechState === SPEECH_STATE.SETTING_UP) { return }
      this.speechState = SPEECH_STATE.SETTING_UP
      const ok = await installOnDevice(this._speechClass, this.recognition.lang)
      if (this._speechDestroyed) { return }
      if (!ok) {
        // Never a fallback to a server. The next tap tries the download again.
        this.speechState = SPEECH_STATE.SETUP_FAILED
        this._clearSpeechTargets()
        return
      }
      this._needsInstall = false
      this.speechState = SPEECH_STATE.READY
      if (this._speechWanted()) { this._startRecognition() }
    },

    _startRecognition () {
      if (this._recognitionRunning) { return }
      if (this.speechState === SPEECH_STATE.UNAVAILABLE) { this._clearSpeechTargets(); return }
      if (this._needsInstall) { this._installThenStart(); return }
      this._recognitionRunning = true
      try {
        this.recognition.start()
      } catch (e) {
        this._recognitionRunning = false
        console.warn('[va:speech] recognition.start() failed:', e.message)
      }
    },

    toggleListening () {
      if (!this.recognition) { return }
      if (this.isListening) {
        this.recognition.stop()
        this.isListening = false
      } else {
        this.profileRecordingField = null
        this.reviewRecordingField = null
        this.inputText = ''
        this.isListening = true
        this._startRecognition()
      }
    },

    toggleProfileListening (field) {
      if (!this.recognition) { return }
      if (this.profileRecordingField === field) {
        this.recognition.stop()
        this.profileRecordingField = null
      } else {
        this.isListening = false
        this.reviewRecordingField = null
        this.profileRecordingField = field
        this._startRecognition()
      }
    },

    // Generic voice input for any top-level data field (message boxes, etc.).
    toggleVoiceInput (field) {
      if (!this.recognition) { return }
      if (this.voiceField === field) {
        this.recognition.stop()
        this.voiceField = null
      } else {
        this.isListening = false
        this.profileRecordingField = null
        this.reviewRecordingField = null
        this.voiceField = field
        this._startRecognition()
      }
    },

    toggleReviewListening (field) {
      if (!this.recognition) { return }
      if (this.reviewRecordingField === field) {
        this.recognition.stop()
        this.reviewRecordingField = null
      } else {
        this.isListening = false
        this.profileRecordingField = null
        this.reviewRecordingField = field
        this._startRecognition()
      }
    }
  }
}
