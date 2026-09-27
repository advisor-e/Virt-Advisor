<template lang="pug">
.step-panel(role="dialog" :aria-label="$t('strategyPlanner.editText.heading')")
  p.step-heading {{ $t('strategyPlanner.editText.heading') }}
  b-input(
    ref="words"
    type="textarea"
    :value="value"
    rows="4"
    @input="onInput"
  )
  p.step-state.is-fit(v-if="state === 'fits'") {{ $t('strategyPlanner.editText.fits') }}
  p.step-state.is-nofit(v-else-if="state === 'noFit'") {{ $t('strategyPlanner.editText.doesNotFit') }}
  .step-actions
    b-button(type="is-primary" :disabled="state === 'noFit'" :loading="saving" @click="onSave") {{ $t('strategyPlanner.editText.save') }}
    b-button(outlined @click="onCancel") {{ $t('strategyPlanner.editText.cancel') }}
    b-button(v-if="edited" outlined type="is-primary" @click="onRestore") {{ $t('strategyPlanner.editText.restore') }}
  p.step-note {{ $t('strategyPlanner.editText.sessionOnly') }}
</template>

<script>
/**
 * StrategyTextEditPanel — the box an advisor edits a concept page's words in. Item 15.25.
 *
 * Its wording is Mike's, approved 2026-09-25: `design/STRATEGY-EDIT-TEXT-WORDING.md`. It
 * measures nothing itself — the page it sits on says whether the words fit, and this only
 * shows the answer and refuses Save while they do not.
 *
 * 🔴 SAVE IS REFUSED WHILE THE WORDS DO NOT FIT — Mike's ruling, 2026-09-25: *"we will add
 * the ability to 'add a page' later on and for those who have much more, they will use the
 * 'add a template' function."* A messy page must never reach the client's printed plan.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'StrategyTextEditPanel',

  props: {
    /** The words being edited. */
    value: {
      type: String,
      default: ''
    },

    /** Whether the words fit the page: unknown until measured, then fits or not. */
    state: {
      type: String,
      default: 'idle',
      validator: v => ['idle', 'fits', 'noFit'].includes(v)
    },

    /** True while the page is saving the edit. */
    saving: {
      type: Boolean,
      default: false
    },

    /** True when this block already carries a saved edit — only then can it be put back. */
    edited: {
      type: Boolean,
      default: false
    }
  },

  mounted () {
    // Focus without scrolling: the advisor is looking at the drawing, not at this box.
    this.$nextTick(() => {
      const input = this.$refs.words && this.$refs.words.$refs ? this.$refs.words.$refs.textarea : null
      if (input && input.focus) { input.focus({ preventScroll: true }) }
    })
  },

  methods: {
    /** @param {string} words */
    onInput (words) {
      // Payload: the words as typed, so the page can redraw and re-measure them.
      this.$emit('input', words)
    },

    onSave () {
      if (this.state === 'noFit') { return }
      // Payload: none — the page saves the words it last drew.
      this.$emit('save')
    },

    onCancel () {
      // Payload: none — the page puts back whatever was showing before the box opened.
      this.$emit('cancel')
    },

    onRestore () {
      // Payload: none — the page removes this block's saved edit and shows the original.
      this.$emit('restore')
    }
  }
}
</script>

<style scoped>
/*
 * 🔴 STICKY, NOT FIXED. The approved test floated the box over the window's foot, but the
 * planner's sheet is a size container (`.sp-sheet`, container-type: inline-size), and that
 * makes `position: fixed` pin to the SHEET's foot instead of the window's. Focusing the box
 * then scrolled the page thousands of pixels away from the drawing being edited — found by
 * running the app. Sticky sits right under the drawing and holds at the window's foot while
 * the drawing is on screen, so the advisor watches their words re-wrap as they type.
 */
.step-panel {
  position: sticky;
  bottom: 16px;
  max-width: 760px;
  margin: 12px auto 0;
  z-index: 40;
  background: #fff;
  border: 2px solid #0070c0;
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
}

.step-heading {
  font-weight: 700;
  color: #002b64;
  margin-bottom: 6px;
}

.step-state {
  font-weight: 700;
  margin-top: 6px;
}

.step-state.is-fit {
  color: #2e7d32;
}

.step-state.is-nofit {
  color: #c0392b;
}

.step-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.step-note {
  font-size: 0.85em;
  color: #6b7f99;
  margin-top: 8px;
}

@media print {
  .step-panel {
    display: none;
  }
}
</style>
