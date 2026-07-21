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
    //- ── Rail: sections → sub-sections → pages ──────────────────────────
    .column.is-4
      nav.rail(:aria-label="$t('firmQuizzes.railLabel')")
        //- Tone is positional, not keyed to section names, so a section added
        //- upstream is distinguished automatically instead of rendering plain.
        //- The accent bar carries the grouping on its own — colour reinforces
        //- it rather than being the only signal, which colour-blind readers lose.
        .rail-group(
          v-for="section in tree"
          :key="section.name"
          :style="{ borderLeftColor: sectionTone(section.tone).band }"
        )
          p.rail-section(:style="{ backgroundColor: sectionTone(section.tone).band, color: bandText }")
            | {{ section.name }}
          div(v-for="sub in section.subs" :key="sub.key")
            button.rail-sub(
              type="button"
              :aria-expanded="isOpen(sub.key) ? 'true' : 'false'"
              @click="toggleSub(sub.key)"
            )
              b-icon.rail-chev(:icon="isOpen(sub.key) ? 'menu-down' : 'menu-right'" size="is-small")
              span.rail-subname {{ sub.name }}
              b-tag(:type="sub.quizPageCount ? 'is-info is-light' : 'is-light'" size="is-small")
                | {{ sub.quizPageCount ? $tc('firmQuizzes.quizCount', sub.quizPageCount) : $t('firmQuizzes.none') }}

            .rail-pages(v-if="isOpen(sub.key)")
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
 */
const { blockTone, BLOCK_TONES, BAND_TEXT } = require('~/utils/brandTokens')

export default {
  name: 'FirmQuizzes',

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
      /** Heading bands all carry white text — see utils/brandTokens.js. */
      bandText: BAND_TEXT,
      /** Which sub-sections are expanded, keyed by `section::subSection`. */
      openSubs: {},
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
            tone: sections.length % BLOCK_TONES.length,
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

    /**
     * Brand tone for a section's position — the accent used as the solid
     * heading band, plus the one text colour that stays legible on it.
     *
     * @param {number} tone zero-based section position
     * @returns {{accent: string, fg: string, tint: string}}
     */
    sectionTone (tone) {
      return blockTone(tone)
    },

    isOpen (key) {
      return !!this.openSubs[key]
    },

    /** Expand or collapse a sub-section. @param {string} key section::subSection */
    toggleSub (key) {
      this.$set(this.openSubs, key, !this.openSubs[key])
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
.rail {
  max-height: 70vh;
  overflow-y: auto;
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  padding: 0.5rem;
}
/* Section accent. Deliberately muted and away from Buefy's status hues, so an
   is-warning or is-info tag inside the rail still reads as a status and not as
   another section. The bar is the primary grouping cue; colour reinforces it. */
.rail-group {
  border-left: 3px solid #dbdbdb;
  margin-bottom: 1rem;
}
.rail-group .rail-pages,
.rail-group .rail-sub { padding-left: 0.6rem; }

/* The section heading is a solid band, not tinted text — at 26 sub-sections
   the eye needs a hard break, and a colour that has to be hunted for is not
   doing its job. */
.rail-section {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #fff;
  background: #7a7a7a;
  margin: 0 0 0.35rem;
  padding: 0.4rem 0.6rem;
  border-radius: 3px;
}

/* Band colours are applied inline from utils/brandTokens.js — the same pattern
   the Advisory Staircase uses for its per-step colours. Kept out of this
   stylesheet so the brand palette lives in exactly one place. */
.rail-sub {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  padding: 0.35rem 0.25rem;
  font: inherit;
}
.rail-sub:hover { background: #f5f5f5; }
.rail-subname { flex: 1; }
.rail-pages { padding-left: 1.5rem; }
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
