<template lang="pug">
p.speech-status(v-if="message" :class="'is-' + state")
  span.speech-spinner(v-if="state === 'settingUp'")
  | {{ message }}
</template>

<script>
/**
 * SpeechStatusLine — the one line a microphone shows when it is not simply ready (item 12.2).
 *
 * Presentational only: the host's speech mixin owns the state. Wording is Mike's, approved
 * 2026-09-24 as W1–W3 on design/mockups/dictation-on-device.html. Renders nothing when the
 * microphone is ready, still being checked, or absent from the browser altogether.
 */
const MESSAGE_KEYS = {
  settingUp: 'voice.settingUp',
  setupFailed: 'voice.setupFailed',
  unavailable: 'voice.unavailable'
}

export default {
  name: 'SpeechStatusLine',
  props: {
    /** The host's `speechState` — see utils/onDeviceSpeech.js SPEECH_STATE. */
    state: {
      type: String,
      default: 'none',
      validator: v => ['none', 'checking', 'ready', 'settingUp', 'setupFailed', 'unavailable'].includes(v)
    }
  },
  computed: {
    message () {
      const key = MESSAGE_KEYS[this.state]
      return key ? this.$t(key) : ''
    }
  }
}
</script>

<style scoped>
.speech-status { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 13px; color: #23405f; }
.speech-status.is-unavailable { color: #6b7f99; }
.speech-spinner {
  width: 14px; height: 14px; border-radius: 50%; flex: none;
  border: 2px solid #d5e1ee; border-top-color: #0070c0; animation: speech-spin 0.8s linear infinite;
}
@keyframes speech-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .speech-spinner { animation: none; } }
</style>
