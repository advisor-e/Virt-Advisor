<template lang="pug">
.quiz-question-form
  b-field(:label="$t('firmQuizzes.fieldQuestion')")
    b-input(
      :value="value.question"
      type="textarea"
      rows="2"
      :maxlength="String(maxChars)"
      @input="update('question', $event)"
    )

  b-field(:label="$t('firmQuizzes.answer')" :message="$t('firmQuizzes.fieldAnswerHint')")
    b-input(
      :value="value.answer"
      type="textarea"
      rows="2"
      :maxlength="String(maxChars)"
      @input="update('answer', $event)"
    )

  b-field(:label="$t('firmQuizzes.keyPoint')" :message="$t('firmQuizzes.fieldKeyPointHint')")
    b-input(
      :value="value.keyPoint"
      type="textarea"
      rows="2"
      :maxlength="String(maxChars)"
      @input="update('keyPoint', $event)"
    )

  .field.is-grouped.mt-4
    b-button(type="is-primary" :loading="saving" @click="$emit('save')") {{ submitLabel }}
    b-button.ml-2(:disabled="saving" @click="$emit('cancel')") {{ $t('firmQuizzes.cancel') }}
</template>

<script>
/**
 * @file The three fields of a quiz question, wherever it is being written.
 *
 * Extracted 2026-07-31 because the form has to appear in TWO places and the two
 * must never drift apart. Editing happens IN PLACE — the question's card becomes
 * this form — after Mike found that a single form at the foot of the page looked
 * like nothing had happened at all: a Growth Curve bank is ten tall cards, so the
 * form opened about a screen and a half below the button he pressed. Adding a new
 * question still uses a form at the end of the list, which is where a new question
 * goes.
 *
 * Controlled, not self-owning: the parent holds the values and this emits `input`
 * with a fresh object on every keystroke. The parent is what decides which fields
 * a save actually sends (utils/quizRows.js), so it must hold the truth about what
 * has been typed.
 */
export default {
  name: 'FirmQuizQuestionForm',

  props: {
    /** The values being edited: { question, answer, keyPoint }. */
    value: {
      type: Object,
      required: true,
      validator: v => ['question', 'answer', 'keyPoint'].every(f => typeof v[f] === 'string')
    },
    /** True while a save is in flight — disables both buttons. */
    saving: { type: Boolean, default: false },
    /** Wording of the confirm button: "Save changes" or "Add question". */
    submitLabel: { type: String, required: true },
    /** Matches LIMITS.textChars on the backend, which is the rule enforced. */
    maxChars: { type: Number, default: 2000 }
  },

  methods: {
    /**
     * @param {string} field one of question | answer | keyPoint
     * @param {string} val the new text
     */
    update (field, val) {
      // Emits the WHOLE object, not a patch — the parent binds this with v-model
      // and a patch would silently clear the other two fields.
      this.$emit('input', { ...this.value, [field]: val })
    }
  }
}
</script>
