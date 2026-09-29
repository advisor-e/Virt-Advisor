<template lang="pug">
.fwr(:class="{ 'is-changed': changedAbove, 'is-editing': editing }")
  template(v-if="editing")
    .fwr-grow
      b-input(v-if="number" v-model.number="draft" type="number" size="is-small" :min="min" :max="max")
      b-input(v-else v-model="draft" type="textarea" rows="2" :maxlength="maxlength")
      template(v-if="citeable")
        a.is-size-7(v-if="!sourcesOpen" @click="openSources") {{ $t('wordsmith.hub.editSource') }}
        .fwr-cite(v-for="(c, i) in sources" v-else :key="i")
          b-field(:label="$t('wordsmith.hub.citeAuthor')" label-position="on-border")
            b-input(v-model="c.author" size="is-small" maxlength="120")
          b-field(:label="$t('wordsmith.hub.citeTitle')" label-position="on-border")
            b-input(v-model="c.title" size="is-small" maxlength="200")
          b-field(:label="$t('wordsmith.hub.citeLink')" label-position="on-border")
            b-input(v-model="c.url" size="is-small" maxlength="500")
    b-button(size="is-small" type="is-primary" :loading="busy" @click="save") {{ $t('growthAspectQuestions.buttons.save') }}
    b-button(size="is-small" type="is-light" @click="editing = false") {{ $t('growthAspectQuestions.buttons.cancel') }}

  template(v-else)
    .fwr-grow
      span.tag.is-light.mr-2 {{ tagOf(source) }}
      span.tag.is-info.is-light.mr-2(v-if="basis") {{ basis === 'alignment' ? $t('wordsmith.hub.basis.alignment') : $t('wordsmith.hub.basis.bestPractice') }}
      span.tag.is-white.fwr-choice.mr-2(v-if="choice") {{ choice }}
      | {{ display || text }}
      span.fwr-cites.is-size-7(v-if="cites && cites.length")
        | {{ cites.length > 1 ? $t('wordsmith.hub.sources') : $t('wordsmith.hub.source') }}
        |
        template(v-for="(c, i) in cites")
          a(v-if="c.url" :key="'a' + i" :href="c.url" target="_blank" rel="noopener") {{ c.author }}, {{ c.title }}
          span(v-else :key="'s' + i") {{ c.author }}, {{ c.title }}
          span(v-if="i < cites.length - 1" :key="'d' + i") {{ ' · ' }}
      p.is-size-7.mt-1(v-if="changedAbove")
        b {{ $t('growthAspectQuestions.changedAbove.line') }}
        |  {{ $t('growthAspectQuestions.changedAbove.now', { text: above }) }}
    template(v-if="changedAbove")
      //- The level above's change is offered, never applied (tier-cascade.md P3).
      b-button(size="is-small" type="is-primary" @click="$emit('use-inherited')") {{ $t('growthAspectQuestions.buttons.useTheirs') }}
      b-button(size="is-small" type="is-light" @click="$emit('keep-mine')") {{ $t('growthAspectQuestions.buttons.keepMine') }}
    template(v-else)
      b-button(size="is-small" type="is-light" @click="startEdit") {{ $t('growthAspectQuestions.buttons.edit') }}
      b-button(
        v-if="source === 'edited-here'"
        size="is-small"
        type="is-light"
        @click="$emit('use-inherited')") {{ $t('growthAspectQuestions.buttons.useInherited') }}
      b-button(
        v-else-if="offable"
        size="is-small"
        type="is-danger is-light"
        :disabled="offDisabled"
        @click="$emit('off')") {{ source === 'added-here' ? $t('growthAspectQuestions.buttons.remove') : $t('growthAspectQuestions.buttons.switchOff') }}
</template>

<script>
/**
 * FirmWordsmithRow — one editable line of the Wordsmith hub tab: a writing rule, a definition
 * row, a question for the room, a word limit or a style instruction. Item 15.14, screens 6 and 7
 * of `design/mockups/wordsmith-screens.html`, approved 2026-09-29.
 *
 * Growth Aspect Questions' row, word for word in its tags and buttons, so a manager meets one
 * pattern across the hub. The backend decides every rule; `offable` and `offDisabled` only mirror
 * what a save would refuse (a style row is never switched off; a statement keeps an Alignment row).
 */
export default {
  name: 'FirmWordsmithRow',

  props: {
    /** What is edited: the wording, or the word limit's number. */
    text: { type: [String, Number], required: true },
    /** What is shown in place of `text`, when it reads as a sentence (the word limit). */
    display: { type: String, default: '' },
    /** `inherited`, `edited-here` or `added-here`, from the backend. */
    source: {
      type: String,
      default: 'inherited',
      validator: v => ['inherited', 'edited-here', 'added-here'].includes(v)
    },
    changedAbove: { type: Boolean, default: false },
    above: { type: [String, Number], default: '' },
    basis: { type: String, default: '', validator: v => ['', 'alignment', 'best-practice'].includes(v) },
    /** A definition row's sources: `[{author, title, url?}]`. */
    cites: { type: Array, default: () => [] },
    /** A style row's fixed choice, shown as its tag. */
    choice: { type: String, default: '' },
    /** Whether the row offers Switch off / Remove at all. */
    offable: { type: Boolean, default: false },
    offDisabled: { type: Boolean, default: false },
    number: { type: Boolean, default: false },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    maxlength: { type: Number, default: 1000 },
    busy: { type: Boolean, default: false }
  },

  data () {
    return { editing: false, draft: '', sourcesOpen: false, sources: [] }
  },

  computed: {
    /** Only a definition row carries sources. */
    citeable () {
      return Boolean(this.basis)
    }
  },

  methods: {
    startEdit () {
      this.draft = this.text
      this.sourcesOpen = false
      this.editing = true
    },

    openSources () {
      this.sources = this.cites.length
        ? this.cites.map(c => ({ author: c.author, title: c.title, url: c.url || '' }))
        : [{ author: '', title: '', url: '' }]
      this.sourcesOpen = true
    },

    save () {
      const payload = { text: this.draft }
      if (this.sourcesOpen) {
        payload.cites = this.sources
          .filter(c => c.author.trim() || c.title.trim() || c.url.trim())
          .map(c => (c.url.trim() ? { author: c.author, title: c.title, url: c.url } : { author: c.author, title: c.title }))
      }
      // Payload: { text: string|number, cites?: [{author, title, url?}] } — the parent saves and
      // closes the editor by re-rendering the row.
      this.$emit('save', payload)
      this.editing = false
    },

    /** @param {string} source @returns {string} the row's tag, in Growth Aspect Questions' approved words */
    tagOf (source) {
      if (source === 'edited-here') { return this.$t('growthAspectQuestions.tags.editedHere') }
      if (source === 'added-here') { return this.$t('growthAspectQuestions.tags.addedHere') }
      return this.$t('growthAspectQuestions.tags.inherited')
    }
  }
}
</script>

<style scoped>
.fwr {
  display: flex; align-items: flex-start; gap: 0.5rem;
  padding: 0.45rem 0.25rem; border-bottom: 1px solid #f0f3f7;
}
.fwr.is-changed { background: #f1f6fb; }
.fwr.is-editing { background: #f5fbff; border-left: 3px solid #3298dc; border-radius: 4px; }
.fwr-grow { flex: 1; min-width: 0; }
.fwr-choice { border: 1px solid #dbdbdb; color: #7a7a7a; }
.fwr-cites { display: block; color: #7a8ba0; margin-top: 0.15rem; }
.fwr-cite { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.6rem; }
.fwr-cite .field { flex: 1 1 10rem; margin-bottom: 0; }
</style>
