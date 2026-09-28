<template lang="pug">
.gaq
  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else)
    b-message(v-if="error" type="is-danger" size="is-small") {{ error }}

    .gaq-aspects
      button.gaq-chip(
        v-for="a in aspects"
        :key="a.name"
        type="button"
        :class="{ 'is-on': a.name === selected }"
        @click="choose(a.name)")
        span.gaq-sw(:style="{ background: colourOf(a.name) }")
        | {{ a.name }}
        em {{ a.questions.length }}

    template(v-if="current")
      p.label.is-small {{ $t('growthAspectQuestions.labels.description') }}
      .gaq-q(:class="{ 'is-changed': current.descriptionChangedAbove }")
        template(v-if="editing && editing.kind === 'description'")
          b-input.gaq-grow(v-model="editing.text" type="textarea" rows="2" :maxlength="limits.maxDescription")
          b-button(size="is-small" type="is-primary" :loading="busy" @click="saveEdit") {{ $t('growthAspectQuestions.buttons.save') }}
          b-button(size="is-small" type="is-light" @click="editing = null") {{ $t('growthAspectQuestions.buttons.cancel') }}
        template(v-else)
          .gaq-grow
            span.tag.is-light.mr-2 {{ tagOf(current.descriptionSource) }}
            | {{ current.description }}
            template(v-if="current.descriptionChangedAbove")
              p.is-size-7.mt-1
                b {{ $t('growthAspectQuestions.changedAbove.line') }}
                |  {{ $t('growthAspectQuestions.changedAbove.now', { text: current.descriptionAbove }) }}
          template(v-if="current.descriptionChangedAbove")
            b-button(size="is-small" type="is-primary" @click="send('POST', 'description/use-inherited', {})") {{ $t('growthAspectQuestions.buttons.useTheirs') }}
            b-button(size="is-small" type="is-light" @click="send('POST', 'description/keep-mine', {})") {{ $t('growthAspectQuestions.buttons.keepMine') }}
          template(v-else)
            b-button(size="is-small" type="is-light" @click="startEdit('description', null, current.description)") {{ $t('growthAspectQuestions.buttons.edit') }}
            b-button(
              v-if="current.descriptionSource === 'edited-here'"
              size="is-small"
              type="is-light"
              @click="send('POST', 'description/use-inherited', {})") {{ $t('growthAspectQuestions.buttons.useInherited') }}

      p.label.is-small.mt-4 {{ $t('growthAspectQuestions.labels.questions') }}
      .gaq-q(v-for="q in current.questions" :key="q.id" :class="{ 'is-changed': q.changedAbove }")
        template(v-if="editing && editing.id === q.id")
          b-input.gaq-grow(v-model="editing.text" type="textarea" rows="2" :maxlength="limits.maxQuestion")
          b-button(size="is-small" type="is-primary" :loading="busy" @click="saveEdit") {{ $t('growthAspectQuestions.buttons.save') }}
          b-button(size="is-small" type="is-light" @click="editing = null") {{ $t('growthAspectQuestions.buttons.cancel') }}
        template(v-else)
          .gaq-grow
            span.tag.is-light.mr-2 {{ tagOf(q.source) }}
            | {{ q.text }}
            template(v-if="q.changedAbove")
              p.is-size-7.mt-1
                b {{ $t('growthAspectQuestions.changedAbove.line') }}
                |  {{ $t('growthAspectQuestions.changedAbove.now', { text: q.above }) }}
          template(v-if="q.changedAbove")
            b-button(size="is-small" type="is-primary" @click="send('POST', 'questions/use-inherited', { id: q.id })") {{ $t('growthAspectQuestions.buttons.useTheirs') }}
            b-button(size="is-small" type="is-light" @click="send('POST', 'questions/keep-mine', { id: q.id })") {{ $t('growthAspectQuestions.buttons.keepMine') }}
          template(v-else)
            b-button(size="is-small" type="is-light" @click="startEdit('question', q.id, q.text)") {{ $t('growthAspectQuestions.buttons.edit') }}
            b-button(
              v-if="q.source === 'edited-here'"
              size="is-small"
              type="is-light"
              @click="send('POST', 'questions/use-inherited', { id: q.id })") {{ $t('growthAspectQuestions.buttons.useInherited') }}
            b-button(
              v-else
              size="is-small"
              type="is-danger is-light"
              :disabled="current.questions.length === 1"
              @click="send('POST', 'questions/off', { id: q.id, off: true })") {{ q.source === 'added-here' ? $t('growthAspectQuestions.buttons.remove') : $t('growthAspectQuestions.buttons.switchOff') }}

      .gaq-q(v-if="editing && editing.kind === 'new'")
        b-input.gaq-grow(v-model="editing.text" type="textarea" rows="2" :maxlength="limits.maxQuestion")
        b-button(size="is-small" type="is-primary" :loading="busy" @click="saveEdit") {{ $t('growthAspectQuestions.buttons.save') }}
        b-button(size="is-small" type="is-light" @click="editing = null") {{ $t('growthAspectQuestions.buttons.cancel') }}
      b-button.mt-3(v-else size="is-small" type="is-light" @click="startEdit('new', null, '')") {{ $t('growthAspectQuestions.buttons.add') }}

      template(v-if="current.declined.length")
        p.label.is-small.mt-4 {{ $t('growthAspectQuestions.switchedOffHeading') }}
        .gaq-q(v-for="q in current.declined" :key="q.id")
          .gaq-grow.has-text-grey
            span.tag.is-light.mr-2 {{ $t('growthAspectQuestions.tags.off') }}
            | {{ q.text }}
          b-button(size="is-small" type="is-light" @click="send('POST', 'questions/off', { id: q.id, off: false })") {{ $t('growthAspectQuestions.buttons.switchBackOn') }}

    p.is-size-7.has-text-grey.mt-4(v-if="history.length")
      | {{ $t('growthAspectQuestions.saved', { date: dateOf(history[0].created_at), who: history[0].saved_by }) }}
      | ·
      a(@click="showHistory = !showHistory") {{ $t('growthAspectQuestions.earlierVersions') }}

    table.table.is-fullwidth.is-narrow.mt-2(v-if="showHistory && history.length")
      tbody
        tr(v-for="h in history" :key="h.id")
          td {{ $t('growthAspectQuestions.history.version', { version: h.version }) }}
          td.is-size-7.has-text-grey {{ h.saved_by }}
          td.is-size-7.has-text-grey {{ dateOf(h.created_at) }}
          td.has-text-right
            b-button(size="is-small" type="is-light" @click="restore(h.id)") {{ $t('growthAspectQuestions.history.restore') }}
</template>

<script>
import { GROWTH_ASPECT_COLOURS } from '~/utils/growthAspectColours'
import { intlLocaleFor } from '~/utils/dateLocale'

const BASE = '/api/firm-manager/growth-aspects'

/**
 * FirmGrowthAspectQuestions — the hub tab where the nine Growth Aspects' descriptions and
 * Mike's 98 questions are seen and changed. Item 15.2, screens 3 and 3b of
 * `design/mockups/growth-aspect-questions.html`, approved 2026-09-27 and 2026-09-28 with
 * their wording.
 *
 * The same screen at all four manager tiers, on the standard cascade (`tier-cascade.md` P3,
 * P11): each row says whether it is inherited, edited here or added here; an inherited
 * question can be edited or switched off, one added here edited or removed; an edited
 * question the tier above has since rewritten is offered as Use theirs / Keep mine. Every
 * action is saved when it is made, as on the Meeting Review tab, and each save is a version.
 *
 * The backend decides every rule; this screen only draws what it returns and sends one
 * action at a time. The disabled Switch off on an aspect's last question mirrors the
 * backend's refusal so the button never offers what a save would refuse.
 *
 * ⚠ DIFFERENCES FROM THE DRAWING, deliberate: the tab sits in "Your AI coach" after Meeting
 * Review; the saved date reads in full through the app's one date format.
 */
export default {
  name: 'FirmGrowthAspectQuestions',

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      busy: false,
      error: '',
      /** The nine as the backend resolved them for this tier — see growthAspects.resolveDetailed. */
      aspects: [],
      limits: { maxQuestion: 1000, maxDescription: 400 },
      selected: '',
      /** What is open for typing: `{ kind: 'question'|'description'|'new', id, text }`, or null. */
      editing: null,
      history: [],
      showHistory: false
    }
  },

  computed: {
    /** The aspect on screen. */
    current () {
      return this.aspects.find(a => a.name === this.selected) || null
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    async load () {
      this.loading = true
      this.error = ''
      try {
        this.apply(await this.api('GET', BASE))
        await this.loadHistory()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /** Take the backend's answer, keeping the selected aspect where it was. */
    apply (data) {
      this.aspects = data.aspects || []
      if (data.limits) { this.limits = data.limits }
      if (!this.aspects.some(a => a.name === this.selected)) {
        this.selected = this.aspects.length ? this.aspects[0].name : ''
      }
    },

    /** @param {string} name */
    choose (name) {
      this.selected = name
      this.editing = null
    },

    /**
     * @param {'question'|'description'|'new'} kind
     * @param {string|null} id
     * @param {string} text
     */
    startEdit (kind, id, text) {
      this.editing = { kind, id, text }
    },

    saveEdit () {
      const e = this.editing
      if (e.kind === 'description') { return this.send('PUT', 'description', { text: e.text }) }
      if (e.kind === 'new') { return this.send('POST', 'questions', { text: e.text }) }
      return this.send('PUT', 'questions', { id: e.id, text: e.text })
    },

    /**
     * One action on the selected aspect. The typing box stays open when a save is refused,
     * so the manager's words are not lost with the error.
     * @param {string} method
     * @param {string} path - under /api/firm-manager/growth-aspects/
     * @param {object} body - the action's fields; the aspect is added here
     */
    async send (method, path, body) {
      this.busy = true
      this.error = ''
      try {
        this.apply(await this.api(method, BASE + '/' + path, Object.assign({ aspect: this.selected }, body)))
        this.editing = null
        await this.loadHistory()
      } catch (err) {
        this.error = err.message
      } finally {
        this.busy = false
      }
    },

    async loadHistory () {
      const data = await this.api('GET', BASE + '/history')
      this.history = data.history || []
    },

    async restore (versionId) {
      this.error = ''
      try {
        this.apply(await this.api('POST', BASE + '/restore', { versionId }))
        await this.loadHistory()
      } catch (err) {
        this.error = err.message
      }
    },

    /** @param {string} source @returns {string} the row's tag, in the approved words */
    tagOf (source) {
      if (source === 'edited-here') { return this.$t('growthAspectQuestions.tags.editedHere') }
      if (source === 'added-here') { return this.$t('growthAspectQuestions.tags.addedHere') }
      return this.$t('growthAspectQuestions.tags.inherited')
    },

    /** @param {string} name @returns {string} the aspect's colour, as on the wheel */
    colourOf (name) {
      return GROWTH_ASPECT_COLOURS[name] || '#ccc'
    },

    /** @param {string} iso @returns {string} */
    dateOf (iso) {
      return iso ? this.$d(new Date(iso), 'long', intlLocaleFor(this.$i18n.locale)) : ''
    },

    /**
     * Thin authenticated fetch, as the sibling hub tabs have — the backend re-checks
     * authorisation on every call regardless of what the browser sends.
     * @param {string} method
     * @param {string} path same-origin API path (proxied to Restify)
     * @param {Object} [body]
     * @returns {Promise<Object>}
     */
    async api (method, path, body) {
      const opts = { method, headers: { Authorization: `Bearer ${this.apiToken}` } }
      if (body) {
        opts.headers['Content-Type'] = 'application/json'
        opts.body = JSON.stringify(body)
      }
      const res = await fetch(path, opts)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err.error && err.error.message) || err.message || res.statusText)
      }
      return res.json()
    }
  }
}
</script>

<style scoped>
.gaq-aspects { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }
.gaq-chip {
  display: inline-flex; align-items: center; gap: 0.4rem;
  border: 1px solid #dfe6ee; border-radius: 999px; background: #fff;
  padding: 0.25rem 0.7rem; font-size: 0.85rem; cursor: pointer;
}
.gaq-chip.is-on { border-color: #0070c0; box-shadow: 0 0 0 1px #0070c0; }
.gaq-chip em { font-style: normal; color: #7a8ba0; }
.gaq-sw { width: 0.7rem; height: 0.7rem; border-radius: 2px; display: inline-block; }
.gaq-q {
  display: flex; align-items: flex-start; gap: 0.5rem;
  padding: 0.45rem 0.25rem; border-bottom: 1px solid #f0f3f7;
}
.gaq-q.is-changed { background: #f1f6fb; }
.gaq-grow { flex: 1; min-width: 0; }
</style>
