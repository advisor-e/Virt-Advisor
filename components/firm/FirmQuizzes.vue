<template lang="pug">
section.firm-quizzes
  //- Intro
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmQuizzes.lede') }}

  b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

  //- Toolbar — search + the "show me the gaps" switch
  .level.mb-4
    .level-left
      b-field.mb-0
        b-input(
          v-model="query"
          type="search"
          icon="magnify"
          :placeholder="$t('firmQuizzes.searchPlaceholder')"
          :aria-label="$t('firmQuizzes.searchPlaceholder')"
        )
    .level-right
      b-switch(v-model="showEmpty") {{ $t('firmQuizzes.showEmpty') }}

  b-loading(:is-full-page="false" :active="loading")

  .columns(v-if="!loading")
    //- ── Rail: sections → sub-sections → pages (shared FirmRail) ────────
    .column.is-4
      firm-rail(
        :sections="tree"
        :query="query.trim()"
        :aria-label="$t('firmQuizzes.railLabel')"
        :empty-text="query ? $t('firmQuizzes.noMatchHere') : $t('firmQuizzes.emptyLibrary')"
      )
        template(v-slot:sub-badge="{ sub }")
          b-tag(:type="sub.quizPageCount ? 'is-info is-light' : 'is-light'" size="is-small")
            | {{ sub.quizPageCount ? $tc('firmQuizzes.quizCount', sub.quizPageCount) : $t('firmQuizzes.none') }}

        template(v-slot:default="{ sub }")
          button.rail-page(
            v-for="page in sub.visiblePages"
            :key="page.title"
            type="button"
            :class="{ 'is-current': current && current.title === page.title, 'is-blocked': !page.bindable }"
            @click="select(page)"
          )
            span.rail-pagename {{ page.title }}
            b-tag(v-if="!page.bindable" type="is-warning is-light" size="is-small")
              | {{ $t('firmQuizzes.duplicateNameTag') }}
            b-tag(size="is-small" rounded) {{ page.entryCount }}

          .rail-empty(v-if="!sub.visiblePages.length")
            span.has-text-grey.is-size-7
              | {{ query ? $t('firmQuizzes.noMatchHere') : $t('firmQuizzes.noQuizYet') }}

    //- ── Panel: the selected page's questions ───────────────────────────
    .column.is-8
      .box.panel-empty(v-if="!current")
        p.has-text-weight-semibold {{ $t('firmQuizzes.pickAPage') }}
        p.has-text-grey.is-size-7 {{ $t('firmQuizzes.pickAPageHint') }}

      div(v-else)
        .box
          .level.mb-3
            .level-left
              div
                p.is-size-7.has-text-grey {{ current.section }} › {{ current.subSection }}
                p.title.is-5.mb-2 {{ current.title }}
                .tags.mb-0
                  b-tag(:type="current.origin === 'firm' ? 'is-warning is-light' : 'is-light'")
                    | {{ current.origin === 'firm' ? $t('firmQuizzes.originFirm') : $t('firmQuizzes.originPlatform') }}
                  b-tag(type="is-light") {{ $tc('firmQuizzes.questionCount', current.entries.length) }}

          //- Said before any work is done, not after a rejected save.
          b-message.mb-4(
            v-if="!current.bindable"
            type="is-warning"
            has-icon
            :closable="false"
          ) {{ $t('firmQuizzes.duplicateNameWarning') }}

          //- One question per card. Read-only in this pass; editing follows.
          article.q(v-for="(entry, i) in current.entries" :key="entry.id")
            .q-number {{ i + 1 }}
            .q-body
              p.q-text {{ entry.question }}
              .q-field
                p.q-label {{ $t('firmQuizzes.answer') }}
                p.q-value {{ entry.answer }}
              .q-field
                p.q-label {{ $t('firmQuizzes.keyPoint') }}
                p.q-value {{ entry.keyPoint }}

        //- ── Version history ─────────────────────────────────────────────
        .box
          p.title.is-6 {{ $t('firmQuizzes.historyHeading') }}
          b-table(v-if="history.length" :data="history" :mobile-cards="false")
            b-table-column(v-slot="{ row }" field="version" :label="$t('firmQuizzes.historyVersion')" width="80")
              | v{{ row.version }}
            b-table-column(v-slot="{ row }" field="saved_by" :label="$t('firmQuizzes.historySavedBy')")
              | {{ row.saved_by }}
            b-table-column(v-slot="{ row }" field="created_at" :label="$t('firmQuizzes.historyDate')")
              | {{ formatDate(row.created_at) }}
          p.has-text-grey.is-size-7(v-else) {{ $t('firmQuizzes.historyEmpty') }}
</template>

<script>
/**
 * Firm Quizzes (CB-31 Phase 3) — the firm's no-code view of its quiz material.
 *
 * Lives in its own file rather than inside FirmManagerHub.vue, which is already
 * over the decompose rule and logged as CB-23. The Hub renders it as one tab.
 *
 * This pass is READ-ONLY: browse, search, see where quiz material is missing,
 * and see the saved version history. Editing and saving follow separately so
 * each half is reviewable on its own.
 *
 * The rail deliberately lists EVERY sub-section, including those with no quiz,
 * because seeing the gap is the point — a firm cannot fill material it cannot
 * see is missing.
 *
 * The rail itself (tone bands, drop-tab accordion, open/closed state and the
 * three-state stuck-open fix) is the shared FirmRail component — this screen
 * builds the data and renders the page rows through its slots.
 */
import FirmRail from '~/components/firm/FirmRail.vue'

export default {
  name: 'FirmQuizzes',

  components: { FirmRail },

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      error: '',
      /** Page library from the resolver's own list — every selectable page. */
      pages: [],
      /** Platform base ⊕ firm overlay, keyed by page title, each tagged origin. */
      banks: {},
      hasOverride: false,
      history: [],
      query: '',
      showEmpty: true,
      /** The page whose questions are on screen, or null. */
      current: null
    }
  },

  computed: {
    /**
     * The rail: sections → sub-sections → pages, built from the page library
     * with quiz counts layered on. Search filters the pages, not the structure,
     * so a firm can still see which sub-section a hit belongs to.
     */
    tree () {
      const q = this.query.trim().toLowerCase()
      const sections = []
      const sectionIndex = {}

      for (const page of this.pages) {
        const sectionName = page.section || this.$t('firmQuizzes.ungrouped')
        const subName = page.subSection || this.$t('firmQuizzes.ungrouped')
        const key = `${sectionName}::${subName}`

        if (!sectionIndex[sectionName]) {
          sectionIndex[sectionName] = {
            name: sectionName,
            // Raw position — FirmRail cycles it through the brand tones.
            tone: sections.length,
            subs: [],
            subIndex: {}
          }
          sections.push(sectionIndex[sectionName])
        }
        const section = sectionIndex[sectionName]
        if (!section.subIndex[subName]) {
          section.subIndex[subName] = { key, name: subName, pages: [] }
          section.subs.push(section.subIndex[subName])
        }

        const bank = this.banks[page.title]
        section.subIndex[subName].pages.push({
          title: page.title,
          section: sectionName,
          subSection: subName,
          // False when the page's name is shared with another page, so a quiz
          // cannot be attached to it. Said up front rather than at save time.
          bindable: page.bindable !== false,
          entryCount: bank ? bank.entries.length : 0,
          origin: bank ? bank.origin : null,
          entries: bank ? bank.entries : []
        })
      }

      for (const section of sections) {
        for (const sub of section.subs) {
          sub.quizPageCount = sub.pages.filter(p => p.entryCount > 0).length
          sub.visiblePages = sub.pages.filter(p => p.entryCount > 0 && this.pageMatches(p, q))
          // Open/closed state lives in FirmRail (three-state, explicit close
          // wins). These two flags feed its auto-expand: a search hit hidden
          // behind a closed sub-section reads as "no results", and the sub
          // holding the page on screen should present itself.
          sub.hasHits = sub.visiblePages.length > 0
          sub.holdsCurrent = !!(this.current &&
            this.current.section === section.name &&
            this.current.subSection === sub.name)
        }
        section.subs = section.subs.filter(sub => this.subVisible(sub, q))
      }
      return sections.filter(section => section.subs.length)
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** GET the merged banks, the page library and the saved version history. */
    async load () {
      this.loading = true
      this.error = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/quizzes')
        this.pages = data.pages || []
        this.banks = data.merged || {}
        this.hasOverride = !!data.hasOverride
        await this.loadHistory()
      } catch (err) {
        this.error = this.$t('firmQuizzes.loadFailed')
      } finally {
        this.loading = false
      }
    },

    /**
     * Saved versions of the firm's overlay. A firm that has never saved has no
     * history row, which is not an error — it is the normal starting state.
     */
    async loadHistory () {
      if (!this.hasOverride) { this.history = []; return }
      try {
        const data = await this.api('GET', '/api/firm-manager/framework/history?configKey=quiz-banks')
        this.history = Array.isArray(data) ? data : (data.history || [])
      } catch (err) {
        this.history = []
      }
    },

    /** True when a page's title or any of its question text matches the query. */
    pageMatches (page, q) {
      if (!q) { return true }
      if (page.title.toLowerCase().includes(q)) { return true }
      return page.entries.some(e =>
        e.question.toLowerCase().includes(q) ||
        e.answer.toLowerCase().includes(q) ||
        e.keyPoint.toLowerCase().includes(q)
      )
    },

    /**
     * A sub-section stays in the rail when it has a visible hit, or — when the
     * firm has asked to see the gaps and is not searching — when it is empty.
     */
    subVisible (sub, q) {
      if (sub.visiblePages.length) { return true }
      if (q) { return false }
      return this.showEmpty && sub.quizPageCount === 0
    },

    /** Open a page's questions in the panel. @param {Object} page rail page row */
    select (page) {
      this.current = page
    },

    formatDate (value) {
      if (!value) { return '' }
      const d = new Date(value)
      return isNaN(d.getTime()) ? String(value) : d.toLocaleString()
    },

    /**
     * Thin authenticated fetch. Mirrors the Hub's own helper so this tab can be
     * mounted and tested on its own; the backend re-checks authorisation on
     * every call regardless of what the browser sends.
     *
     * @param {string} method HTTP verb
     * @param {string} path same-origin API path (proxied to Restify)
     * @param {Object} [body] JSON body
     * @returns {Promise<Object>} parsed JSON
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
/* The rail's structure (groups, bands, accordion, chevron) is styled inside
   the shared FirmRail component. Only the rows this screen renders through
   FirmRail's slots are styled here — slot content compiles in this
   component's scope, so these rules cannot live in FirmRail. */
.rail-page {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 0.3rem 0.25rem;
  font: inherit;
  border-radius: 4px;
}
.rail-page:hover { background: #f5f5f5; }
.rail-page.is-current { background: #eef6fc; font-weight: 600; }
.rail-page.is-blocked .rail-pagename { color: #7a7a7a; }
.rail-pagename { flex: 1; }
.rail-empty { padding: 0.3rem 0.25rem; }
.panel-empty { text-align: center; padding: 3rem 1rem; }
.q { display: flex; gap: 0.75rem; padding: 0.9rem 0; border-top: 1px solid #f0f0f0; }
.q-number { color: #b5b5b5; font-variant-numeric: tabular-nums; min-width: 1.5rem; }
.q-body { flex: 1; }
.q-text { font-weight: 600; margin-bottom: 0.4rem; }
.q-field { margin-top: 0.35rem; }
.q-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #7a7a7a;
}
.q-value { font-size: 0.9rem; }
</style>
