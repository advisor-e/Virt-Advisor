/**
 * speechMixin
 *
 * Wraps the browser Web Speech API (SpeechRecognition) to provide voice dictation
 * into three different targets: the main chat input, an advisor-profile field, or
 * a case-review field. Only one target records at a time. All SpeechRecognition
 * setup runs in mounted() because the API is browser-only and absent during SSR;
 * speechSupported stays false when the API is unavailable so the UI can hide the mic.
 */

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
      recognition: null,
      profileRecordingField: null,
      reviewRecordingField: null
    }
  },

  // Initialise SpeechRecognition in mounted() — window/webkitSpeechRecognition are
  // browser-only and unavailable during SSR. Wires three handlers:
  //  - onresult: routes the running transcript to whichever target is active
  //    (profile field, review field, or the main input).
  //  - onend: auto-restarts recognition while a target is still active (the API
  //    stops itself periodically), guarded by _recognitionRunning to avoid a
  //    double start() race.
  //  - onerror: stops listening on real errors but ignores transient 'no-speech'.
  mounted () {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      this.speechSupported = true
      this.recognition = new SpeechRecognition()
      this._recognitionRunning = false
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
        } else {
          this.inputText = transcript
        }
      }
      this.recognition.onend = () => {
        this._recognitionRunning = false
        if (this.isListening || this.profileRecordingField || this.reviewRecordingField) {
          this._recognitionRunning = true
          try { this.recognition.start() } catch (e) {}
        }
      }
      this.recognition.onerror = (e) => {
        if (e.error !== 'no-speech') {
          this.isListening = false
        }
      }
    }
  },

  methods: {
    /**
     * Start the recogniser if it isn't already running. The _recognitionRunning
     * guard prevents an InvalidStateError from calling start() while already
     * active; a failed start is logged and the guard reset.
     * @returns {void}
     */
    _startRecognition () {
      if (this._recognitionRunning) { return }
      this._recognitionRunning = true
      try {
        this.recognition.start()
      } catch (e) {
        this._recognitionRunning = false
        console.warn('[va:speech] recognition.start() failed:', e.message)
      }
    },

    /**
     * Toggle dictation into the main chat input. Stops if already listening;
     * otherwise clears the other recording targets and the input, then starts.
     * @returns {void}
     */
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

    /**
     * Toggle dictation into a named advisor-profile field. Stops if that same
     * field is already recording; otherwise clears the other targets and starts
     * recording into the given field.
     * @param {string} field - the advisorProfile key to dictate into
     * @returns {void}
     */
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

    /**
     * Toggle dictation into a named case-review field. Stops if that same field
     * is already recording; otherwise clears the other targets and starts
     * recording into the given field.
     * @param {string} field - the reviewDraft key to dictate into
     * @returns {void}
     */
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
