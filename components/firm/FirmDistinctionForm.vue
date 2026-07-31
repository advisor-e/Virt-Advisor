<template lang="pug">
.distinction-fields
  b-field(label="Domain")
    b-select(:value="value.domain" expanded :disabled="domainLocked" @input="update('domain', $event)")
      option(v-for="d in domains" :key="d.id" :value="d.id") {{ d.label }}

  b-field(label="Description" message="Describe the client situation in a plain sentence — this is what the AI matches the advisor's words against. Capture the cause, not just the symptom.")
    b-input(
      :value="value.description"
      placeholder="e.g. The owners aren't aligned on where the business is heading"
      maxlength="255"
      @input="update('description', $event)"
    )

  b-field(label="Trigger phrases" message="Type a phrase and press Enter or comma to add. These are example ways an advisor might describe this — they guide the AI, which matches on meaning, not exact words, so 3–6 varied examples is plenty.")
    b-taginput(
      :value="value.triggers"
      :confirm-key-codes="[13, 188]"
      placeholder="Add a phrase…"
      aria-close-label="Remove phrase"
      @input="update('triggers', $event)"
    )

  b-field(label="Templates to boost")
    .template-picker
      .template-picker-filters
        b-select(v-model="pickerSubSection" size="is-small" style="flex:0 0 200px")
          option(value="") All areas
          option(v-for="ss in subSections" :key="ss" :value="ss") {{ ss }}
        b-input(
          v-model="pickerSearch"
          size="is-small"
          placeholder="Search by title…"
          icon="magnify"
          style="flex:1"
        )
      .template-picker-list
        //- Revenue-model GROUP targets: boost a whole group rather than one named
        //- model; the engine auto-picks the right one by client industry.
        label.template-picker-opt.template-picker-group(
          v-for="g in groupTargets"
          :key="g.token"
          :class="{ 'is-selected': value.templates.includes(g.token) }"
        )
          input(
            type="checkbox"
            :value="g.token"
            :checked="value.templates.includes(g.token)"
            @change="toggleTemplate(g.token)"
          )
          span.template-picker-title {{ g.label }}
          span.template-picker-sub {{ g.hint }}
        label.template-picker-opt(
          v-for="t in filteredTemplates"
          :key="pickerKey(t)"
          :class="{ 'is-selected': value.templates.includes(t.title) }"
        )
          input(
            type="checkbox"
            :value="t.title"
            :checked="value.templates.includes(t.title)"
            @change="toggleTemplate(t.title)"
          )
          span.template-picker-title {{ t.title }}
          span.template-picker-sub {{ t.subSection }}
        p.has-text-grey.is-size-7.p-2(v-if="filteredTemplates.length === 0") No templates match — try clearing the filters.
      .template-picker-selected(v-if="value.templates.length > 0")
        span.is-size-7.has-text-grey.mr-2 Selected:
        b-tag.mr-1.mb-1(
          v-for="t in value.templates"
          :key="t"
          closable
          type="is-success is-light"
          @close="toggleTemplate(t)"
        ) {{ chipLabel(t) }}

  b-field(label="Boost score" message="How many points to add to each matched template's score (1–20). Default 5.")
    b-input(
      :value="value.boost"
      type="number"
      min="1"
      max="20"
      style="width:90px"
      @input="update('boost', Number($event))"
    )

  .field.is-grouped.mt-4
    b-button(type="is-primary" :loading="saving" @click="$emit('save')") {{ submitLabel }}
    b-button.ml-2(:disabled="saving" @click="$emit('cancel')") Cancel
</template>

<script>
/**
 * @file The fields of an Advisory Distinction, wherever one is being written.
 *
 * Extracted 2026-08-01, third of three, after Mike ruled that every Firm Manager tab
 * must behave the way Quizzes does: clicking Edit opens the form IN the row you
 * clicked, never in a box at the foot of the panel. That means the form appears in two
 * places — in the row being edited, and at the end of the list when adding — and two
 * copies of ninety lines of markup would drift apart. Same reasoning, and the same
 * shape, as FirmQuizQuestionForm and FirmStaircaseStepForm.
 *
 * THE PICKER'S FILTER STATE LIVES HERE, not in the parent. The search box and area
 * dropdown are about finding a template, not about what is being saved, and the parent
 * used to have to remember to reset both every time a form opened or closed. A fresh
 * child mounts with fresh filters, so that whole class of stale-state bug goes away.
 *
 * Controlled, not self-owning: the parent holds the values and this emits `input` with
 * a fresh object. `templates` and `triggers` are replaced with new arrays rather than
 * mutated in place — the parent compares the form against the row it opened from, and
 * mutating its arrays would make the two look identical when they are not.
 */
export default {
  name: 'FirmDistinctionForm',

  props: {
    /** { domain, description, triggers[], templates[], boost }. */
    value: {
      type: Object,
      required: true,
      validator: v => Array.isArray(v.triggers) && Array.isArray(v.templates)
    },
    /** Selectable domains: [{ id, label }]. */
    domains: { type: Array, default: () => [] },
    /**
     * True for a platform or customised row, whose domain is fixed. Moving one to
     * another domain is the separate "Move to…" action, which re-keys the override.
     */
    domainLocked: { type: Boolean, default: false },
    /** Every client template: [{ title, subSection }]. */
    allTemplates: { type: Array, default: () => [] },
    /** The area names the dropdown offers. */
    subSections: { type: Array, default: () => [] },
    /** Revenue-model group targets: [{ token, label, hint }]. */
    groupTargets: { type: Array, default: () => [] },
    /** True while a save is in flight — disables both buttons. */
    saving: { type: Boolean, default: false },
    /** Wording of the confirm button: "Save changes" or "Add distinction". */
    submitLabel: { type: String, required: true }
  },

  data () {
    return {
      pickerSearch: '',
      // Opens on one focused area rather than all ~106 templates at once. The manager
      // switches area or types in search; the group targets always show on top.
      pickerSubSection: 'General Tools'
    }
  },

  computed: {
    /** The templates the picker currently offers, after area and search filters. */
    filteredTemplates () {
      let list = this.allTemplates
      if (this.pickerSubSection) {
        list = list.filter(t => t.subSection === this.pickerSubSection)
      }
      if (this.pickerSearch) {
        const q = this.pickerSearch.toLowerCase()
        list = list.filter(t => t.title.toLowerCase().includes(q))
      }
      return list
    }
  },

  methods: {
    /**
     * A render key that is unique per ROW, not per title.
     *
     * WHY NOT THE TITLE. Five titles appear twice in the master export — two of them
     * inside the same area ("Capacity, Capability, Opportunity" in General Tools,
     * "IT Services" in Revenue & Feasibility Models). Keyed on title, Vue warns of
     * duplicate keys and may reuse one row's DOM node for the other, so a tick can
     * land on the row the manager did not click. `index` is the row's position in the
     * export and is unique across all 289 rows; the title is folded in so a future
     * export that drops `index` degrades to the old behaviour rather than keying
     * everything on `undefined`.
     *
     * This does NOT change what a tick STORES — that is still the title, which is what
     * templateResolver matches on. Two templates sharing a title therefore still boost
     * together; that is a content question for the master export, and this repo never
     * edits that data.
     *
     * @param {Object} t - a template row
     * @returns {string}
     */
    pickerKey (t) {
      return `${t.index}|${t.title}`
    },

    /**
     * @param {string} field one of domain | description | triggers | templates | boost
     * @param {*} val the new value
     */
    update (field, val) {
      // Emits the WHOLE object, not a patch — the parent binds this with v-model and a
      // patch would silently clear every other field.
      this.$emit('input', { ...this.value, [field]: val })
    },

    /**
     * Add or remove a boost target. A NEW array is emitted rather than the existing one
     * being pushed to: an in-place push would change the parent's object without an
     * `input` event, which is how a save comes to disagree with what is on screen.
     * @param {string} title - a template title or a group token
     */
    toggleTemplate (title) {
      const current = this.value.templates
      const next = current.includes(title)
        ? current.filter(t => t !== title)
        : [...current, title]
      this.update('templates', next)
    },

    /**
     * Friendly label for a selected chip — a group token shows its label, an ordinary
     * template shows its title.
     * @param {string} value
     * @returns {string}
     */
    chipLabel (value) {
      const group = this.groupTargets.find(g => g.token === value)
      return group ? group.label : value
    }
  }
}
</script>

<style scoped>
.template-picker { border: 1px solid #dbdbdb; border-radius: 4px; overflow: hidden; }

.template-picker-filters {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-bottom: 1px solid #dbdbdb;
}

.template-picker-list {
  max-height: 220px;
  overflow-y: auto;
  background: #fff;
}

.template-picker-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.85rem;
  transition: background 0.1s;
}
.template-picker-opt:hover { background: #f0f7ff; }
.template-picker-opt.is-selected { background: #ebf8ee; }
.template-picker-opt input[type="checkbox"] { flex-shrink: 0; accent-color: #48c78e; }
.template-picker-title { flex: 1; color: #363636; }
.template-picker-sub { font-size: 0.75rem; color: #9a9a9a; }

.template-picker-selected {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px 12px;
  background: #f9fafb;
  border-top: 1px solid #dbdbdb;
  min-height: 38px;
}
</style>
