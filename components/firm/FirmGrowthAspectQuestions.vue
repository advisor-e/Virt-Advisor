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
        @click="selected = a.name")
        span.gaq-sw(:style="{ background: colourOf(a.name) }")
        | {{ a.name }}
        em {{ a.questions.length }}

    template(v-if="current")
      p.label.is-small {{ $t('growthAspectQuestions.labels.description') }}
      b-input(v-model="current.description" type="textarea" rows="2" :maxlength="maxDescription")

      p.label.is-small.mt-4 {{ $t('growthAspectQuestions.labels.questions') }}
      .gaq-q(v-for="(q, i) in current.questions" :key="q.key")
        b-input.gaq-grow(v-if="q.editing" v-model="q.text" type="textarea" rows="2" :maxlength="maxQuestion")
        span.gaq-grow(v-else) {{ q.text }}
        b-button(size="is-small" type="is-light" @click="q.editing = !q.editing") {{ $t('growthAspectQuestions.buttons.edit') }}
        b-button(
          size="is-small"
          type="is-danger is-light"
          :disabled="current.questions.length === 1"
          @click="current.questions.splice(i, 1)") {{ $t('growthAspectQuestions.buttons.remove') }}

      .gaq-acts
        b-button(size="is-small" type="is-light" @click="addQuestion") {{ $t('growthAspectQuestions.buttons.add') }}
        b-button(type="is-primary" :loading="saving" @click="save") {{ $t('growthAspectQuestions.buttons.save') }}

    p.is-size-7.has-text-grey.mt-3(v-if="history.length")
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

/** Mirrors the backend's limits in server/utils/growthAspects.js, so a box stops where a save would be refused. */
const MAX_DESCRIPTION = 400
const MAX_QUESTION = 1000

let _key = 0

/**
 * FirmGrowthAspectQuestions — the Mentor Hub tab where the nine Growth Aspects' descriptions
 * and Mike's 98 questions behind them are seen and edited. Item 15.2, screen 3 of
 * `design/mockups/growth-aspect-questions.html`, approved 2026-09-27 with its wording.
 *
 * The descriptions reach the Virtual Advisor's prompt and the questions reach the planner's
 * coverage wheel — the hub-page rule is why they are on a screen. MENTOR TIER ALONE today
 * (`TAB_TIERS.growthAspectQuestions`); the routes and resolver already carry every tier.
 *
 * One Save sends all nine as shown. The backend stores only what differs from the level
 * above, so an aspect left alone keeps inheriting the shipped wording.
 *
 * ⚠ DIFFERENCES FROM THE DRAWING, deliberate: the saved date reads in full ("27 September
 * 2026") through the app's one date format rather than "27 Sep"; and "Earlier versions"
 * opens a list whose "Version n" and "Restore" wording the drawing does not show.
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
      saving: false,
      error: '',
      /** The nine as edited here: `{name, description, questions: [{key, text, editing}]}`. */
      aspects: [],
      selected: '',
      history: [],
      showHistory: false,
      maxDescription: MAX_DESCRIPTION,
      maxQuestion: MAX_QUESTION
    }
  },

  computed: {
    /** The aspect being edited. */
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
        const data = await this.api('GET', '/api/firm-manager/growth-aspects')
        this.applyToForm(data.aspects || [])
        await this.loadHistory()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Put the backend's aspects into the form, keeping the selected aspect where it was.
     * @param {Array<{name: string, description: string, questions: string[]}>} aspects
     */
    applyToForm (aspects) {
      this.aspects = aspects.map(a => ({
        name: a.name,
        description: a.description,
        questions: a.questions.map(text => ({ key: ++_key, text, editing: false }))
      }))
      if (!this.aspects.some(a => a.name === this.selected)) {
        this.selected = this.aspects.length ? this.aspects[0].name : ''
      }
    },

    addQuestion () {
      this.current.questions.push({ key: ++_key, text: '', editing: true })
    },

    async save () {
      this.saving = true
      this.error = ''
      const body = {}
      this.aspects.forEach((a) => {
        body[a.name] = { description: a.description, questions: a.questions.map(q => q.text) }
      })
      try {
        const data = await this.api('POST', '/api/firm-manager/growth-aspects', { aspects: body })
        this.applyToForm(data.aspects || [])
        await this.loadHistory()
      } catch (err) {
        this.error = err.message
      } finally {
        this.saving = false
      }
    },

    async loadHistory () {
      const data = await this.api('GET', '/api/firm-manager/growth-aspects/history')
      this.history = data.history || []
    },

    async restore (versionId) {
      try {
        await this.api('POST', '/api/firm-manager/growth-aspects/restore', { versionId })
        await this.load()
      } catch (err) {
        this.error = err.message
      }
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
  padding: 0.45rem 0; border-bottom: 1px solid #f0f3f7;
}
.gaq-grow { flex: 1; min-width: 0; }
.gaq-acts { display: flex; justify-content: space-between; margin-top: 0.75rem; }
</style>
