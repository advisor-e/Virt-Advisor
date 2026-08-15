<template lang="pug">
.coach-entry-form
  //- ── The template ──────────────────────────────────────────────────────
  //- On an INHERITED entry this is read-only and says why. The field names a
  //- template in the library, and the whole purpose of the block is to steer the
  //- model toward that template by name; retitling an inherited entry would leave
  //- Advisor-e's id attached to guidance pointing somewhere else. The backend
  //- refuses it and strips it again on the read — this is the third lock, and the
  //- only one that can explain itself to the person who wanted it.
  b-field(:label="$t('firmCoaching.fieldTemplate')" :message="ownEntry ? $t('firmCoaching.fieldTemplateHint') : null")
    b-input(
      v-if="ownEntry"
      :value="value.template"
      maxlength="160"
      @input="update('template', $event)"
    )
    .coach-locked(v-else)
      span.coach-locked-icon(aria-hidden="true") 🔒
      span {{ value.template }}
  p.help.coach-locked-note(v-if="!ownEntry") {{ $t('firmCoaching.fieldTemplateLocked') }}

  b-field(:label="$t('firmCoaching.fieldHowItHelps')")
    b-input(
      :value="value.howItHelps"
      type="textarea"
      rows="4"
      @input="update('howItHelps', $event)"
    )

  b-field(:label="$t('firmCoaching.fieldWhatToLookFor')")
    b-input(
      :value="value.whatToLookFor"
      type="textarea"
      rows="3"
      @input="update('whatToLookFor', $event)"
    )

  b-field(:label="$t('firmCoaching.fieldWhereMayLead')")
    b-input(
      :value="value.whereMayLead"
      type="textarea"
      rows="2"
      @input="update('whereMayLead', $event)"
    )

  b-field(
    :label="$t('firmCoaching.fieldDeliveryNotes')"
    :message="$t('firmCoaching.fieldDeliveryNotesHint')"
  )
    b-input(
      :value="value.deliveryNotes"
      type="textarea"
      rows="2"
      @input="update('deliveryNotes', $event)"
    )

  //- ── The situations ────────────────────────────────────────────────────
  //- A list, not a text box: each one is rendered into the prompt as its own item,
  //- so joining them into a paragraph here would change what the model receives.
  b-field(:label="$t('firmCoaching.fieldScenarios')")
    .coach-scenario(v-for="(s, i) in scenarios" :key="i")
      b-input.coach-scenario-input(
        :value="s"
        maxlength="500"
        @input="updateScenario(i, $event)"
      )
      b-button(size="is-small" :disabled="saving" @click="removeScenario(i)") {{ $t('firmCoaching.removeScenario') }}
    b-button.mt-2(size="is-small" icon-left="plus" :disabled="saving" @click="addScenario") {{ $t('firmCoaching.addScenario') }}

  .field.is-grouped.mt-4
    b-button(type="is-primary" :loading="saving" @click="$emit('save')") {{ submitLabel }}
    b-button.ml-2(:disabled="saving" @click="$emit('cancel')") {{ $t('firmCoaching.cancel') }}
</template>

<script>
/**
 * @file The fields of a coaching entry, wherever it is being written.
 *
 * Extracted for the same reason FirmStaircaseStepForm was: the form appears in TWO
 * places — in place on the entry being edited, and at the foot of the list when adding
 * — and the two must never drift apart. Editing happens IN PLACE after Mike ruled that
 * every Firm Manager tab behaves the way Quizzes does.
 *
 * Controlled, not self-owning: the parent holds the values and this emits `input` with a
 * fresh object on every keystroke. The parent decides which fields a save actually sends
 * (utils/coachingRows.js → buildCoachingEdit), so it must hold the truth about what has
 * been typed.
 *
 * 🔴 THE TEMPLATE FIELD IS THE ONE THING HERE THAT IS NOT A PLAIN INPUT. On an inherited
 * entry it renders read-only with the reason beneath it. That restriction is enforced in
 * two places already — the route refuses a `template` in the body, and
 * firmCoachingReference.filterEditableFields strips it on the read — so this is not the
 * lock. It is the explanation, and a greyed-out box with no reason beside it is how a
 * firm ends up filing a bug report about a rule working correctly.
 */
export default {
  name: 'FirmCoachingEntryForm',

  props: {
    /**
     * The values being edited:
     * { template, howItHelps, whatToLookFor, whereMayLead, deliveryNotes, scenarios }.
     */
    value: {
      type: Object,
      required: true,
      validator: v => typeof v.template === 'string'
    },
    /** True while a save is in flight — disables the buttons. */
    saving: { type: Boolean, default: false },
    /**
     * Is this an entry the firm owns? Own entries may set their own template; entries
     * inherited from Advisor-e may not. Named `own` on the prop and read through
     * `ownEntry` below, because `own` alone reads as a verb in the template.
     */
    own: { type: Boolean, default: false },
    /** Wording of the confirm button: "Save changes" or "Add your own entry". */
    submitLabel: { type: String, required: true }
  },

  computed: {
    ownEntry () {
      return this.own
    },

    /**
     * The situations, always with one empty box at the end so there is somewhere to
     * type the next one without pressing Add first.
     *
     * The trailing blank never reaches the backend: buildCoachingEdit and
     * buildOwnCoachingBody both drop empty strings, which is also what stops an
     * untouched form from counting as a change to an entry the firm has not edited.
     * @returns {string[]}
     */
    scenarios () {
      const list = Array.isArray(this.value.scenarios) ? this.value.scenarios : []
      return list.length && list[list.length - 1] === '' ? list : [...list, '']
    }
  },

  methods: {
    /**
     * @param {string} field one of the entry's fields
     * @param {string} val the new value
     */
    update (field, val) {
      // Emits the WHOLE object, not a patch — the parent binds this with v-model and a
      // patch would silently clear every other field.
      this.$emit('input', { ...this.value, [field]: val })
    },

    /**
     * @param {number} index which situation was typed into
     * @param {string} val the new text
     */
    updateScenario (index, val) {
      const next = [...this.scenarios]
      next[index] = val
      this.update('scenarios', next)
    },

    addScenario () {
      this.update('scenarios', [...this.scenarios, ''])
    },

    /**
     * @param {number} index which situation to drop
     */
    removeScenario (index) {
      this.update('scenarios', this.scenarios.filter((_, i) => i !== index))
    }
  }
}
</script>

<style scoped>
.coach-scenario {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}
.coach-scenario-input { flex: 1; }

/* The read-only template on an inherited entry. Drawn as a filled, bordered field
   rather than a disabled input: a disabled input invites clicking, and the padlock
   plus the note below carry the reason. */
.coach-locked {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.7rem;
  background: #f7f8fa;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  font-size: 0.95rem;
  color: #3a3a3a;
}
.coach-locked-icon { font-size: 0.8rem; color: #7a7a7a; }
.coach-locked-note { color: #7a7a7a; }
</style>
