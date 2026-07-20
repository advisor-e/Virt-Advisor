<template lang="pug">
.voice-bar
  .voice-state.voice-idle(v-if="!listening && !text.trim()")
    button.voice-btn.voice-btn-idle(@click="toggle" :disabled="disabled")
      svg(xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor")
        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
      | Tap to Speak
  .voice-state.voice-recording(v-else-if="listening")
    span.recording-dot
    span.recording-label Recording — speak now
    button.voice-btn.voice-btn-stop(@click="toggle")
      svg(xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor")
        rect(x="6" y="6" width="12" height="12" rx="2")
      | Stop Recording
  .voice-state.voice-ready(v-else-if="text.trim()")
    svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:#16a34a")
      path(d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z")
    span.ready-label {{ readyLabel }}
    button.voice-btn.voice-btn-redo(@click="toggle")
      svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
      | Record again
</template>

<script>
/**
 * VoiceInputBar — presentational speech-to-text status pill used above the
 * course-builder text inputs (design, session and quiz screens). It renders one
 * of three states (idle / recording / captured) and owns no speech logic: the
 * parent starts/stops recognition and binds the text back in. Extracted from
 * CourseBuilder.vue (CB-23) to remove the three-fold duplication.
 */
export default {
  name: 'VoiceInputBar',
  props: {
    /** Current text of the paired input — drives the idle→captured transition. */
    text: { type: String, default: '' },
    /** True while speech recognition is actively listening. */
    listening: { type: Boolean, default: false },
    /** Disables the "Tap to Speak" button while the parent is busy (streaming/grading). */
    disabled: { type: Boolean, default: false },
    /** Label shown once text is captured — e.g. "…review then Save" vs "…Submit". */
    readyLabel: { type: String, default: 'Captured — review then Save' }
  },
  methods: {
    toggle () {
      // toggle — no payload; the parent owns the speech-recognition start/stop
      this.$emit('toggle')
    }
  }
}
</script>

<style scoped>
/* ── Voice bar ─────────────────────────────────────────── */
.voice-bar { margin-bottom: 10px; min-height: 36px; display: flex; align-items: center; }
.voice-state { display: flex; align-items: center; gap: 10px; width: 100%; }
.voice-btn {
  display: inline-flex; align-items: center; gap: 6px;
  border: none; border-radius: 20px; padding: 7px 14px;
  font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.voice-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.voice-btn-idle { background: #eff6ff; color: #1e40af; }
.voice-btn-idle:hover:not(:disabled) { background: #dbeafe; }
.recording-dot {
  width: 10px; height: 10px; border-radius: 50%; background: #dc2626;
  animation: pulse-dot 1s infinite;
}
@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.recording-label { font-size: 13px; font-weight: 600; color: #dc2626; flex: 1; }
.voice-btn-stop { background: #dc2626; color: white; }
.voice-btn-stop:hover { background: #b91c1c; }
.ready-label { font-size: 13px; color: #16a34a; font-weight: 500; flex: 1; }
.voice-btn-redo { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
.voice-btn-redo:hover { background: #f9fafb; }
</style>
