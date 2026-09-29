<template lang="pug">
.fws
  .has-text-centered.py-5(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  template(v-else)
    hub-guide-panel.mb-4(storage-key="wordsmith" :intro="$t('wordsmith.hub.guide.intro')" :points="guidePoints")
    b-message(v-if="error" type="is-danger" size="is-small") {{ error }}

    .fws-chips
      button.fws-chip(
        v-for="s in statements"
        :key="s.name"
        type="button"
        :class="{ 'is-on': s.name === selected }"
        @click="choose(s.name)")
        | {{ s.name }}
        em {{ s.definition.length }}
      button.fws-chip(type="button" :class="{ 'is-on': selected === STYLE }" @click="choose(STYLE)")
        | {{ $t('wordsmith.hub.styleChip') }}
        em {{ styleCount }}

    //- One statement: its writing rule, what it is, its questions, its word limit (screen 6).
    template(v-if="current")
      p.label.is-small
        | {{ current.name === 'Values' ? $t('wordsmith.hub.howWrittenPlural', { name: current.name }) : $t('wordsmith.hub.howWritten', { name: current.name }) }}
        span.has-text-weight-normal.has-text-grey  · {{ $t('wordsmith.hub.domainHint', { domain: current.domain.name }) }}
      firm-wordsmith-row(
        :text="current.domain.rule"
        :source="current.domain.source"
        :changed-above="current.domain.changedAbove"
        :above="current.domain.above || ''"
        :maxlength="limits.maxRule"
        :busy="busy"
        @save="p => send('PUT', 'value', { field: 'rule', value: p.text })"
        @use-inherited="send('POST', 'value/use-inherited', { field: 'rule' })"
        @keep-mine="send('POST', 'value/keep-mine', { field: 'rule' })")

      p.label.is-small.mt-4
        | {{ $t('wordsmith.hub.whatIs', { name: current.name }) }}
        span.has-text-weight-normal.has-text-grey  · {{ $t('wordsmith.hub.whatIsHint') }}
      firm-wordsmith-row(
        v-for="r in current.definition"
        :key="r.id"
        :text="r.text"
        :source="r.source"
        :basis="r.basis"
        :cites="r.cites || []"
        :changed-above="r.changedAbove"
        :above="r.above || ''"
        :offable="true"
        :off-disabled="isLastAlignment(r)"
        :maxlength="limits.maxDefinition"
        :busy="busy"
        @save="p => send('PUT', 'rows', Object.assign({ part: 'definition', id: r.id, text: p.text }, p.cites ? { cites: p.cites } : {}))"
        @off="send('POST', 'rows/off', { part: 'definition', id: r.id, off: true })"
        @use-inherited="send('POST', 'rows/use-inherited', { part: 'definition', id: r.id })"
        @keep-mine="send('POST', 'rows/keep-mine', { part: 'definition', id: r.id })")
      .fws-add(v-if="adding && adding.part === 'definition'")
        b-select(v-model="adding.basis" size="is-small")
          option(value="alignment") {{ $t('wordsmith.hub.basis.alignment') }}
          option(value="best-practice") {{ $t('wordsmith.hub.basis.bestPractice') }}
        b-input.fws-grow(v-model="adding.text" type="textarea" rows="2" :maxlength="limits.maxDefinition")
        b-button(size="is-small" type="is-primary" :loading="busy" @click="send('POST', 'rows', { part: 'definition', basis: adding.basis, text: adding.text })") {{ $t('growthAspectQuestions.buttons.save') }}
        b-button(size="is-small" type="is-light" @click="adding = null") {{ $t('growthAspectQuestions.buttons.cancel') }}
      b-button.mt-2(v-else size="is-small" type="is-light" @click="adding = { part: 'definition', basis: 'best-practice', text: '' }") {{ $t('wordsmith.hub.addRow') }}
      switched-off(:rows="current.definitionDeclined" field="text" @on="id => send('POST', 'rows/off', { part: 'definition', id, off: false })")

      p.label.is-small.mt-4
        | {{ $t('wordsmith.hub.questions') }}
        span.has-text-weight-normal.has-text-grey  · {{ $t('wordsmith.hub.questionsHint') }}
      firm-wordsmith-row(
        v-for="q in current.questions"
        :key="q.id"
        :text="q.question"
        :source="q.source"
        :changed-above="q.changedAbove"
        :above="q.above || ''"
        :offable="true"
        :maxlength="limits.maxQuestion"
        :busy="busy"
        @save="p => send('PUT', 'rows', { part: 'questions', id: q.id, question: p.text })"
        @off="send('POST', 'rows/off', { part: 'questions', id: q.id, off: true })"
        @use-inherited="send('POST', 'rows/use-inherited', { part: 'questions', id: q.id })"
        @keep-mine="send('POST', 'rows/keep-mine', { part: 'questions', id: q.id })")
      .fws-add(v-if="adding && adding.part === 'questions'")
        b-input.fws-grow(v-model="adding.text" type="textarea" rows="2" :maxlength="limits.maxQuestion")
        b-button(size="is-small" type="is-primary" :loading="busy" @click="send('POST', 'rows', { part: 'questions', question: adding.text })") {{ $t('growthAspectQuestions.buttons.save') }}
        b-button(size="is-small" type="is-light" @click="adding = null") {{ $t('growthAspectQuestions.buttons.cancel') }}
      b-button.mt-2(v-else size="is-small" type="is-light" @click="adding = { part: 'questions', text: '' }") {{ $t('growthAspectQuestions.buttons.add') }}
      switched-off(:rows="current.questionsDeclined" field="question" @on="id => send('POST', 'rows/off', { part: 'questions', id, off: false })")

      p.label.is-small.mt-4 {{ $t('wordsmith.hub.wordLimit') }}
      firm-wordsmith-row(
        :text="current.maxWords.value"
        :display="wordLimitLine(current)"
        :source="current.maxWords.source"
        :changed-above="current.maxWords.changedAbove"
        :above="current.maxWords.above === undefined ? '' : current.maxWords.above"
        :number="true"
        :min="limits.minWords"
        :max="limits.maxWords"
        :busy="busy"
        @save="p => send('PUT', 'value', { field: 'maxWords', value: Number(p.text) })"
        @use-inherited="send('POST', 'value/use-inherited', { field: 'maxWords' })"
        @keep-mine="send('POST', 'value/keep-mine', { field: 'maxWords' })")

    //- The style wording: reworded only, never switched off or added (screen 7).
    template(v-if="selected === STYLE")
      template(v-for="row in style")
        p.label.is-small.mt-3(:key="row.key + '-label'")
          | {{ $t('wordsmith.hub.settingNames.' + row.key) }}
          span.has-text-weight-normal.has-text-grey  · {{ $t('wordsmith.hub.styleHint') }}
        firm-wordsmith-row(
          v-for="o in row.options"
          :key="o.id"
          :text="o.instruction"
          :choice="o.value.replace('-', ' ')"
          :source="o.source"
          :changed-above="o.changedAbove"
          :above="o.above || ''"
          :maxlength="limits.maxInstruction"
          :busy="busy"
          @save="p => send('PUT', 'style', { id: o.id, instruction: p.text }, true)"
          @use-inherited="send('POST', 'style/use-inherited', { id: o.id }, true)"
          @keep-mine="send('POST', 'style/keep-mine', { id: o.id }, true)")

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
import FirmWordsmithRow from '~/components/firm/FirmWordsmithRow.vue'
import HubGuidePanel from '~/components/shared/HubGuidePanel.vue'
import { intlLocaleFor } from '~/utils/dateLocale'

const BASE = '/api/firm-manager/wordsmith'

/** The chip that shows the style wording rather than a statement. */
const STYLE = '__style__'

/** The rows a tier switched off, each with Switch back on — Growth Aspect Questions' block. */
const SwitchedOff = {
  name: 'SwitchedOff',
  props: {
    rows: { type: Array, required: true },
    /** Which field holds the row's words: `text` or `question`. */
    field: { type: String, required: true, validator: v => ['text', 'question'].includes(v) }
  },
  render (h) {
    if (!this.rows.length) { return h('div') }
    return h('div', [
      h('p', { class: 'label is-small mt-3' }, this.$t('growthAspectQuestions.switchedOffHeading')),
      ...this.rows.map(r => h('div', { key: r.id, class: 'fws-off' }, [
        h('span', { class: 'fws-grow has-text-grey' }, [
          h('span', { class: 'tag is-light mr-2' }, this.$t('growthAspectQuestions.tags.off')),
          r[this.field]
        ]),
        // Payload: the row's id — switch it back on at this tier.
        h('b-button', { props: { size: 'is-small', type: 'is-light' }, on: { click: () => this.$emit('on', r.id) } },
          this.$t('growthAspectQuestions.buttons.switchBackOn'))
      ]))
    ])
  }
}

/**
 * FirmWordsmith — the hub tab where each manager tier shapes what Wordsmith knows: every
 * statement's writing rule, definition rows and their sources, questions for the room and word
 * limit, and the instruction behind each style choice. Item 15.14, screens 6 and 7 of
 * `design/mockups/wordsmith-screens.html`, approved by Mike 2026-09-29 with its wording.
 *
 * The same screen at all four manager tiers, on the standard cascade (`tier-cascade.md` P3,
 * P11), in Growth Aspect Questions' own look — Mike's instruction that the colours and format
 * match the hub's other pages. Every action is saved when it is made; the backend
 * (`server/routes/wordsmithContent.js`) decides every rule, and this screen draws what it returns.
 *
 * ⚠ DIFFERENCES FROM THE DRAWING, deliberate: a row's source is edited through "Edit source"
 * with Author / Title / Link fields (build detail 11); switched-off rows are listed under
 * "Switched off here", as on Growth Aspect Questions, which the drawing does not show.
 */
export default {
  name: 'FirmWordsmith',

  components: { FirmWordsmithRow, HubGuidePanel, SwitchedOff },

  props: {
    /** The caller's bearer token; the backend re-checks authorisation on every call. */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      STYLE,
      loading: true,
      busy: false,
      error: '',
      /** The five as the backend resolved them for this tier — see wordsmithContent.resolveDetailed. */
      statements: [],
      style: [],
      limits: { maxDefinition: 600, maxQuestion: 300, maxRule: 800, maxInstruction: 400, minWords: 10, maxWords: 120 },
      selected: '',
      /** A row being added: `{ part, text, basis? }`, or null. */
      adding: null,
      history: [],
      showHistory: false
    }
  },

  computed: {
    /** The statement on screen, or null while the style wording is. */
    current () {
      return this.statements.find(s => s.name === this.selected) || null
    },

    styleCount () {
      return this.style.reduce((n, r) => n + r.options.length, 0)
    },

    guidePoints () {
      return [1, 2, 3].map(n => this.$t('wordsmith.hub.guide.point' + n))
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

    /** Take the backend's answer, keeping the selected chip where it was. */
    apply (data) {
      this.statements = data.statements || []
      this.style = data.style || []
      if (data.limits) { this.limits = data.limits }
      if (this.selected !== STYLE && !this.statements.some(s => s.name === this.selected)) {
        this.selected = this.statements.length ? this.statements[0].name : ''
      }
    },

    /** @param {string} name - a statement's name, or STYLE */
    choose (name) {
      this.selected = name
      this.adding = null
    },

    /**
     * Whether switching this row off would leave its statement with no Alignment document row —
     * the backend refuses that (build detail 12), so the button never offers it.
     * @param {object} row
     * @returns {boolean}
     */
    isLastAlignment (row) {
      return row.basis === 'alignment' && this.current.definition.filter(r => r.basis === 'alignment').length === 1
    },

    /** @param {object} s @returns {string} the word limit as a sentence, Values in the plural (build detail 10) */
    wordLimitLine (s) {
      const key = s.name === 'Values' ? 'wordsmith.hub.wordLimitLinePlural' : 'wordsmith.hub.wordLimitLine'
      return this.$t(key, { name: s.name, n: s.maxWords.value })
    },

    /**
     * One action. The statement is added unless the action is on the style wording.
     * @param {string} method
     * @param {string} path - under /api/firm-manager/wordsmith/
     * @param {object} body
     * @param {boolean} [styleAction]
     */
    async send (method, path, body, styleAction) {
      this.busy = true
      this.error = ''
      try {
        const payload = styleAction ? body : Object.assign({ statement: this.selected }, body)
        this.apply(await this.api(method, BASE + '/' + path, payload))
        this.adding = null
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
.fws-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }
.fws-chip {
  display: inline-flex; align-items: center; gap: 0.4rem;
  border: 1px solid #dfe6ee; border-radius: 999px; background: #fff;
  padding: 0.25rem 0.8rem; font-size: 0.85rem; cursor: pointer;
}
.fws-chip.is-on { border-color: #0070c0; box-shadow: 0 0 0 1px #0070c0; }
.fws-chip em { font-style: normal; color: #7a8ba0; }
.fws-add { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.45rem 0.25rem; }
.fws-grow { flex: 1; min-width: 0; }
.fws >>> .fws-off { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.45rem 0.25rem; border-bottom: 1px solid #f0f3f7; }
</style>
