<template lang="pug">
.staircase-step-form
  b-field(:label="$t('firmStaircase.fieldName')")
    b-input(
      :value="value.name"
      maxlength="120"
      @input="update('name', $event)"
    )

  b-field(
    :label="$t('firmStaircase.fieldDescription')"
    :message="$t('firmStaircase.fieldDescriptionHint')"
  )
    b-input(
      :value="value.selectorDescription"
      type="textarea"
      rows="3"
      @input="update('selectorDescription', $event)"
    )

  b-field(:label="$t('firmStaircase.fieldCeiling')" :message="$t('firmStaircase.fieldCeilingHint')")
    b-select(:value="value.complexityCeiling" @input="update('complexityCeiling', $event)")
      option(v-for="c in ceilingOptions" :key="c" :value="c") {{ capitalise(c) }}

  .field.is-grouped.mt-4
    b-button(type="is-primary" :loading="saving" @click="$emit('save')") {{ submitLabel }}
    b-button.ml-2(:disabled="saving" @click="$emit('cancel')") {{ $t('firmStaircase.cancel') }}
</template>

<script>
/**
 * @file The three fields of a staircase step, wherever it is being written.
 *
 * Extracted 2026-08-01 for the same reason FirmQuizQuestionForm was: the form has to
 * appear in TWO places and the two must never drift apart. Editing happens IN PLACE —
 * the step's own block becomes this form — after Mike ruled that every Firm Manager tab
 * must behave the way Quizzes does, so a manager never has to work out what a given tab
 * did with the button they just pressed. Adding a new step still uses a form at the end
 * of the list, which is where a new step goes.
 *
 * The staircase form is the case that needed the ruling most: its panel carries the live
 * steps AND the switched-off list, so a form below both opened further out of sight than
 * the quizzes one ever did.
 *
 * Controlled, not self-owning: the parent holds the values and this emits `input` with a
 * fresh object on every keystroke. The parent decides which fields a save actually sends
 * (utils/staircaseRows.js → buildStepEdit), so it must hold the truth about what has been
 * typed.
 */
export default {
  name: 'FirmStaircaseStepForm',

  props: {
    /** The values being edited: { name, selectorDescription, complexityCeiling }. */
    value: {
      type: Object,
      required: true,
      validator: v => typeof v.name === 'string'
    },
    /** True while a save is in flight — disables both buttons. */
    saving: { type: Boolean, default: false },
    /** Wording of the confirm button: "Save changes" or "Add step". */
    submitLabel: { type: String, required: true },
    /**
     * The ceilings this firm may choose, derived by the parent from the platform base
     * the backend sends — never a hardcoded list here, or a ceiling added upstream
     * would stop appearing.
     */
    ceilingOptions: { type: Array, default: () => [] }
  },

  methods: {
    /**
     * @param {string} field one of name | selectorDescription | complexityCeiling
     * @param {string} val the new value
     */
    update (field, val) {
      // Emits the WHOLE object, not a patch — the parent binds this with v-model and a
      // patch would silently clear the other two fields.
      this.$emit('input', { ...this.value, [field]: val })
    },

    /**
     * Ceilings are stored lower-case ('simple') and shown capitalised. Kept here rather
     * than passed in: it is presentation, and the parent's copy is used for the same
     * words elsewhere on the tab.
     * @param {string} s
     * @returns {string}
     */
    capitalise (s) {
      return typeof s === 'string' && s.length ? s.charAt(0).toUpperCase() + s.slice(1) : ''
    }
  }
}
</script>
