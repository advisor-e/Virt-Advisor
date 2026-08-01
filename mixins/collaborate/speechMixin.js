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
      reviewRecordingField: null,
      voiceField: null
    }
  },

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
        if (this.isListening || this.profileRecordingField || this.reviewRecordingField || this.voiceField) {
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
