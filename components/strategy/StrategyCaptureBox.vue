<template lang="pug">
.scb
  //- 🔴 THE SAME VOICE BAR THE ADVISOR ALREADY USES — Mike, 2026-09-19: "check the
  //- 'i have a client with a problem...' section - i want app user consistency." Same
  //- three states, same icons and the same six strings from `voice.*` as VirtualAdvisor's
  //- profile questions. Nothing is worded here. Absent where the browser has no speech
  //- recognition, exactly as elsewhere.
  .scb-voice(v-if="speechSupported")
    button.scb-vb.is-idle(
      v-if="!recording"
      type="button"
      @click="$emit('toggle-voice', field.key)"
    )
      svg(xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor")
        path(d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z")
      | {{ value ? $t('voice.recordAgain') : $t('voice.tapToSpeak') }}
    template(v-else)
      span.scb-vdot
      span.scb-vlab {{ $t('voice.recording') }}
      button.scb-vb.is-stop(type="button" @click="$emit('toggle-voice', field.key)")
        svg(xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor")
          rect(x="6" y="6" width="12" height="12" rx="2")
        | {{ $t('voice.stopRecording') }}

  //- 🔴 TWO EVENTS, AND ONLY ONE OF THEM SAVES.
  //- `@input` is Buefy's, made to fire on LEAVING the box by `lazy` below — that is the
  //- save. `@input.native` is the raw keystroke, and it sends NOTHING anywhere: it tells
  //- the page there are words not yet written out, so the Saved stamp can say so
  //- (Decision E) and the pause timer can start (Decision D, "yes - auto save").
  //- ⚠ NEVER SAVE FROM `@input.native`. That is the 2026-09-22 defect exactly.
  //-
  //- 🔴 `lazy` IS LOAD-BEARING — see the same note in StrategyConceptCapture.vue.
  //- Without it Buefy emits `input` from the native event, so this box saves once per
  //- keystroke — one `PUT /entries` and one database write per character, fired without
  //- awaiting each other, which on a slow line can store a half-typed answer. With it,
  //- the box saves when the advisor leaves it, which is what the JSDoc on
  //- `onFieldChanged` always claimed. Pinned by tests/unit/strategyCaptureSaveRate.test.js.
  b-input(
    :id="'scb-' + field.key"
    :type="singleLine ? 'text' : 'textarea'"
    lazy
    :rows="singleLine ? null : rows"
    :size="singleLine ? 'is-small' : null"
    :value="value"
    :placeholder="field.example"
    @focus="$emit('focus-field', field)"
    @input="$emit('input-field', field, $event)"
    @input.native="$emit('typing-field', field, $event.target.value)"
  )
</template>

<script>
/**
 * StrategyCaptureBox — one box of a capture table, with the voice bar above it.
 *
 * WHY IT EXISTS. The capture screen now draws three layouts: Mike's banded tables as
 * blocks, his two-dimensional tables as a grid (approved 2026-09-21), and the Org Chart
 * Builder's list of roles (approved 2026-09-21). All three put the same box in every cell,
 * and his ruling of 2026-09-19 is that the voice control is the one the advisor already
 * uses — so it lives in one place rather than being written three times and drifting apart.
 *
 * 🔴 IT WORDS NOTHING. Every string is `voice.*` from the locale file, already in use in
 * the Virtual Advisor, and the placeholder is Mike's own worked example off the template.
 *
 * Vue 2, Options API, Pug. No DOM access at all.
 */
export default {
  name: 'StrategyCaptureBox',

  props: {
    /** The field this box captures — its key, and Mike's example if he gave one. */
    field: {
      type: Object,
      required: true,
      validator: f => !!f && typeof f.key === 'string'
    },

    /** What is in the box now: what was captured, or Mike's prefilled answer. */
    value: {
      type: String,
      default: ''
    },

    /** How tall, taken from the length of his own example. */
    rows: {
      type: Number,
      default: 2
    },

    /** Does this browser do speech recognition? Absent, the bar is not drawn. */
    speechSupported: {
      type: Boolean,
      default: false
    },

    /** Is this the box currently being dictated into? */
    recording: {
      type: Boolean,
      default: false
    },

    /**
     * One line rather than a paragraph — a role name, not an answer to a prompt.
     *
     * The Org Chart drawing shows a 30px box on every row, because a role is a few words
     * and thirty stacked textareas would be a page of scrolling. The voice bar above it is
     * unchanged, which is the whole reason this prop lives here rather than that screen
     * drawing its own box.
     */
    singleLine: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.scb-voice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 5px;
  flex-wrap: wrap;
}

.scb-vb {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 6px;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.scb-vb.is-idle {
  border: 1px solid #d5e1ee;
  color: #0070c0;
  background: #fff;
}

.scb-vb.is-stop {
  border: 0;
  background: #c0392b;
  color: #fff;
}

.scb-vdot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #c0392b;
}

.scb-vlab {
  font-size: 12px;
  color: #c0392b;
  font-weight: 600;
}
</style>
