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
          // Generic: dictate into a named box on a screen that has no profile or
          // review draft of its own — a Strategy Planner capture table, where the
          // boxes are read out of Mike's workbook and cannot be data properties.
          // The host says where the words go, so this mixin never needs a fourth
          // hard-coded target. `emitVoice` is how it hands them over.
          this.emitVoice(this.voiceField, transcript)
        } else {
          this.inputText = transcript
        }
      }
      this.recognition.onend = () => {
        this._recognitionRunning = false
        // The component can go away while the engine is still winding down. Restarting
        // then leaves the microphone live on a screen the advisor has already left.
        if (this._speechDestroyed) { return }
        if (this.isListening || this.profileRecordingField || this.reviewRecordingField ||
            this.voiceField) {
          this._recognitionRunning = true
          try { this.recognition.start() } catch (e) {}
        }
      }
      this.recognition.onerror = (e) => {
        this._recognitionRunning = false
        // 'no-speech' is benign — the advisor simply paused; let onend restart.
        if (e.error === 'no-speech') { return }
        // Anything else (permission denied, no microphone, network) must clear EVERY
        // recording flag. Clearing only `isListening` left a profile/review field set,
        // so onend restarted, which errored again — an endless start→error loop that
        // pinned a CPU core and spammed the console on a single "Block" click.
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
     * Where the words go when `voiceField` is the target.
     *
     * A host that uses `toggleVoiceField` overrides this. The default does nothing
     * rather than guessing at a property, because a silent write to the wrong place
     * is worse than no write at all.
     *
     * @param {string} field the value `toggleVoiceField` was called with
     * @param {string} transcript what was heard so far, from the start of this take
     */
    emitVoice (field, transcript) {},

    /**
     * Dictate into a named box, one box at a time.
     *
     * The same three states the advisor already knows from "I have a client with a
     * problem…": tap to speak, speak, captured. Tapping the box that is already
     * recording stops it, exactly as the profile questions do.
     *
     * @param {string} field the box to dictate into
     */
    toggleVoiceField (field) {
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
