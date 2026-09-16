<template lang="pug">
.mentor-semantic-profiles
  .has-text-centered.py-6(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-notification(v-else-if="loadError" type="is-danger is-light" :closable="false")
    | {{ loadError }}

  template(v-else)
    p.title.is-5 {{ $t('semanticProfiles.heading') }}
    p.subtitle.is-6.has-text-grey.mb-5 {{ $t('semanticProfiles.intro') }}

    //- Authoring is live (Mike's second ruling of 2026-09-16), so the screen says what a
    //- save actually does rather than letting a mentor discover it from an advisor.
    b-notification.mb-5(type="is-warning is-light" :closable="false")
      | {{ $t('semanticProfiles.authoringNotice') }}

    //- The four tiles of the approved drawing, read from the route so they can
    //- never drift from the table beneath them.
    .sp-tiles.mb-5
      .sp-tile(v-for="tile in tiles" :key="tile.key")
        .sp-tile-l {{ tile.label }}
        .sp-tile-v {{ tile.value }}
        .sp-tile-s {{ tile.sub }}

    .box
      .sp-card-h.mb-4
        p.sp-band-title {{ $t('semanticProfiles.tableHeading') }}
        b-tag(type="is-info is-light") {{ $t('semanticProfiles.weightsHint') }}

      b-field(grouped group-multiline)
        b-radio-button(
          v-model="filter"
          native-value="all"
          size="is-small"
        ) {{ $t('semanticProfiles.filterAll', { n: rows.length }) }}
        b-radio-button(
          v-model="filter"
          native-value="thin"
          size="is-small"
          type="is-warning"
        ) {{ $t('semanticProfiles.filterThin', { n: thinCount }) }}
        b-radio-button(
          v-model="filter"
          native-value="authored"
          size="is-small"
        ) {{ $t('semanticProfiles.filterAuthored', { n: authoredCount }) }}

      b-input.mt-3.mb-4(
        v-model="search"
        type="search"
        icon="magnify"
        size="is-small"
        :placeholder="$t('semanticProfiles.searchPlaceholder')"
      )

      b-table(
        :data="visibleRows"
        :hoverable="true"
        :narrowed="true"
        :paginated="true"
        :per-page="25"
        :pagination-simple="true"
        default-sort="subSection"
      )
        b-table-column(v-slot="{ row }" field="title" :label="$t('semanticProfiles.colTemplate')" sortable)
          span.sp-tt {{ row.title }}
          //- One profile governs every tool on a page — Mike's ruling, 2026-09-16.
          //- Naming them is the whole point: a mentor must see what a row covers.
          .sp-also(v-if="row.alsoOnPage.length > 0")
            | {{ $t('semanticProfiles.alsoOnPage', { list: row.alsoOnPage.join(', ') }) }}

        b-table-column(v-slot="{ row }" field="subSection" :label="$t('semanticProfiles.colSection')" sortable)
          | {{ row.subSection || '—' }}

        b-table-column(v-slot="{ row }" :label="$t('semanticProfiles.colSignals')")
          span.sp-none(v-if="signalsOf(row).length === 0") {{ $t('semanticProfiles.noSignals') }}
          template(v-else)
            b-tag.sp-chip.mr-1.mb-1(v-for="s in signalsOf(row)" :key="s.type")
              | {{ s.label }}
              b.ml-1 {{ s.weight }}

        b-table-column(v-slot="{ row }" field="source" :label="$t('semanticProfiles.colSource')" sortable)
          b-tag(:type="sourceTag(row.source)") {{ sourceLabel(row.source) }}

        b-table-column(v-slot="{ row }" field="thin" :label="$t('semanticProfiles.colThin')" sortable)
          b-tag(v-if="row.thin" :type="thinTag(row.thinReason)") {{ thinLabel(row.thinReason) }}
          .sp-also(v-if="row.thin && row.thinReason === 'weak'")
            | {{ $t('semanticProfiles.weakDetail', { n: weightTotal(row) }) }}

        b-table-column(v-slot="{ row }" label="" width="90")
          b-button(
            size="is-small"
            :type="editing && editing.page === row.page ? 'is-primary' : 'is-light'"
            @click="openEditor(row)"
          ) {{ editing && editing.page === row.page ? $t('semanticProfiles.editing') : $t('semanticProfiles.edit') }}

        template(#empty)
          p.has-text-grey.py-4 {{ $t('semanticProfiles.noneMatch') }}

      p.sp-foot.mt-3 {{ footLine }}

    //- ── The row editor (the drawing's Screens B and C) ──────────────────
    //- Opens beneath the table on the row being edited, never as a modal: the summary
    //- on the left is meant to be read AGAINST the ticks on the right, which a dialog
    //- covering the table would not help with.
    .box(v-if="editing" ref="editor")
      .sp-card-h.mb-4
        p.sp-band-title {{ editing.title }} · {{ editing.subSection || '—' }}
        b-tag(v-if="editing.thin" :type="thinTag(editing.thinReason)") {{ thinLabel(editing.thinReason) }}

      .columns
        .column.is-one-third
          p.sp-lbl {{ $t('semanticProfiles.summaryHeading') }}
          .sp-says(v-if="editing.indicators")
            | {{ editing.indicators }}
            .sp-who {{ $t('semanticProfiles.summaryReadOnly') }}
          .sp-says.sp-says-empty(v-else)
            | {{ editing.source === 'none' ? $t('semanticProfiles.noProfileAtAll') : $t('semanticProfiles.noSummary') }}

        .column
          p.sp-lbl {{ $t('semanticProfiles.ticksHeading') }}
          .sp-tick(v-for="s in signals" :key="s.type")
            b-checkbox(
              :value="draft[s.type] !== undefined"
              @input="toggleSignal(s.type, $event)"
            )
              span.sp-signame {{ signalLabel(s.type) }}
              small.sp-sigdesc {{ s.description }}
            b-input.sp-weight(
              v-if="draft[s.type] !== undefined"
              :value="draft[s.type]"
              type="number"
              min="1"
              max="10"
              size="is-small"
              @input="setWeight(s.type, $event)"
            )
            span.sp-weight-off(v-else) –

      p.sp-lbl.mt-4 {{ $t('semanticProfiles.whyLabel') }}
      b-input(
        v-model="draftNote"
        type="textarea"
        rows="2"
        :maxlength="noteMax"
        :placeholder="$t('semanticProfiles.whyPlaceholder')"
      )

      b-notification.mt-3(v-if="saveError" type="is-danger is-light" :closable="true" @close="saveError = ''")
        | {{ saveError }}

      .buttons.mt-3
        b-button(type="is-primary" :loading="saving" @click="save") {{ $t('semanticProfiles.save') }}
        b-button(@click="closeEditor") {{ $t('semanticProfiles.cancel') }}

      p.sp-foot.mt-2 {{ $t('semanticProfiles.saveKeeps') }}

      //- History, per page. "Restore to here" on the Generated line puts the script's
      //- own compiled profile back — the reversibility that stands in for the test
      //- nobody can write for a weight.
      template(v-if="history.length > 0")
        p.sp-band-title.mt-5 {{ $t('semanticProfiles.historyHeading') }}
        b-table(:data="history" :hoverable="true" :narrowed="true")
          b-table-column(v-slot="{ row }" :label="$t('semanticProfiles.colWhen')")
            | {{ formatDate(row.created_at) }}
          b-table-column(v-slot="{ row }" :label="$t('semanticProfiles.colBy')")
            | {{ row.saved_by }}
            b-tag.ml-2(v-if="row.is_active" type="is-success is-light") {{ $t('semanticProfiles.current') }}
          b-table-column(v-slot="{ row }" label="" width="130")
            b-button(
              v-if="!row.is_active"
              size="is-small"
              :loading="restoring === row.id"
              @click="restore(row)"
            ) {{ $t('semanticProfiles.restore') }}
</template>

<script>
/**
 * Template Profiles — the Mentor Hub tab (item 4.97 / 7.2, US9, task T059).
 *
 * Built from `design/mockups/template-profiles.html` Screen A, approved by Mike
 * 2026-09-14. A semantic profile is what the AI understands a client tool to be
 * *about* — the resolver's dominant lever, compiled from each tool's written
 * summary and, until this screen, visible nowhere.
 *
 * 🔴 READ-ONLY, AND THAT IS THE WHOLE POINT OF THIS RELEASE — Mike's ruling,
 * 2026-09-16. The drawing's Screens B and C are the row editor; they are NOT built,
 * so the table carries no Edit column and no Save. A button that saved a profile the
 * engine does not read would be a lie, and wiring the engine to read it (T058)
 * changes every advisor's recommendations with no test able to judge a weight. He
 * decides whether authoring 44 tools by hand is worth his time after seeing this.
 *
 * 🔴 205 ROWS COVERING 220 TOOLS, AND THE DRAWING SHOWS 220 ROWS. Deliberate, and
 * caused by Mike's own later ruling (2026-09-16): Advisor-e issues one ID per PAGE,
 * a page holds several tools, and tools on one page SHARE a profile because an
 * advisor opening that page gets them all. `alsoOnPage` names the others so nothing
 * of his is hidden. Recorded in `design/ARTEFACTS.md`.
 *
 * MENTOR TIER ALONE, as a stated judgement (the drawing's own closing section, and
 * the default-is-mentor-alone ruling of 2026-08-24): a profile describes what a
 * template is *for*, which does not change from firm to firm. A firm's own vocabulary
 * already reaches scoring through Advisory Distinctions, which every tier has.
 */
export default {
  name: 'MentorSemanticProfiles',

  props: {
    // The mentor's JWT. The route is re-gated server-side by requireMentorRole.
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      loadError: '',
      /** As GET /api/mentor/semantic-profiles returns it. */
      rows: [],
      signals: [],
      thinCount: 0,
      total: 0,
      /** 'all' | 'thin' | 'authored' — the drawing's three filters. */
      filter: 'all',
      search: '',
      /** The row open in the editor, or null. */
      editing: null,
      /** `{ signal: weight }` being edited — a copy, so Cancel really cancels. */
      draft: {},
      draftNote: '',
      saving: false,
      saveError: '',
      /** That page's saved versions, newest first. */
      history: [],
      /** History-row id being restored ('' = none). */
      restoring: '',
      /** Matches NOTE_MAX on the backend; the box stops typing rather than failing a save. */
      noteMax: 300
    }
  },

  computed: {
    /** @returns {number} rows a mentor has authored; 0 until authoring ships. */
    authoredCount () {
      return this.rows.filter(r => r.source === 'authored').length
    },

    /** @returns {number} rows compiled by script and never checked by a person. */
    generatedCount () {
      return this.rows.filter(r => r.source === 'auto').length
    },

    /**
     * The drawing's four tiles, with today's live figures rather than the
     * drawing's — the recompile of 2026-09-16 moved them.
     * @returns {Array<{key: string, label: string, value: number|string, sub: string}>}
     */
    tiles () {
      return [
        {
          key: 'tools',
          label: this.$t('semanticProfiles.tileTools'),
          value: this.total,
          sub: this.$t('semanticProfiles.tileToolsSub', { pages: this.rows.length })
        },
        {
          key: 'thin',
          label: this.$t('semanticProfiles.tileThin'),
          value: this.thinCount,
          sub: this.thinBreakdown
        },
        {
          key: 'authored',
          label: this.$t('semanticProfiles.tileAuthored'),
          value: this.authoredCount,
          sub: this.$t('semanticProfiles.tileAuthoredSub')
        },
        {
          key: 'generated',
          label: this.$t('semanticProfiles.tileGenerated'),
          value: this.generatedCount,
          sub: this.$t('semanticProfiles.tileGeneratedSub')
        }
      ]
    },

    /**
     * "44 no profile at all · 8 no signals matched · 3 weak match" — counted from
     * the rows, so the tile can never disagree with the table.
     * @returns {string}
     */
    thinBreakdown () {
      const order = ['no_entry', 'no_signals', 'weak', 'keyword_only']
      const counts = {}
      for (const row of this.rows) {
        if (row.thin) { counts[row.thinReason] = (counts[row.thinReason] || 0) + 1 }
      }
      return order
        .filter(reason => counts[reason])
        .map(reason => `${counts[reason]} ${this.thinLabel(reason).toLowerCase()}`)
        .join(' · ')
    },

    /** @returns {Array<object>} the rows the filter and the search leave showing. */
    visibleRows () {
      const term = this.search.trim().toLowerCase()
      return this.rows.filter((row) => {
        if (this.filter === 'thin' && !row.thin) { return false }
        if (this.filter === 'authored' && row.source !== 'authored') { return false }
        if (!term) { return true }
        const names = [row.title].concat(row.alsoOnPage).join(' ').toLowerCase()
        return names.includes(term) || (row.subSection || '').toLowerCase().includes(term)
      })
    },

    /** @returns {string} "Showing 205 rows, covering 220 client tools." */
    footLine () {
      return this.$t('semanticProfiles.foot', {
        shown: this.visibleRows.length,
        rows: this.rows.length,
        tools: this.total
      })
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** @returns {object} auth headers for the mentor call. */
    headers () {
      return { Authorization: `Bearer ${this.apiToken}` }
    },

    /**
     * A row's profile as chips, heaviest first — the weight is what decides how
     * much a match counts, so the heaviest signal is the one to read.
     * @param {object} row - a table row
     * @returns {Array<{type: string, label: string, weight: number}>}
     */
    signalsOf (row) {
      return Object.entries(row.effective || {})
        .map(([type, weight]) => ({ type, label: this.signalLabel(type), weight }))
        .sort((a, b) => b.weight - a.weight)
    },

    /** @param {object} row @returns {number} the row's weights added up. */
    weightTotal (row) {
      return Object.values(row.effective || {}).reduce((sum, n) => sum + (Number(n) || 0), 0)
    },

    /**
     * A signal key in plain English. The dictionary's keys are already readable
     * (`cash_flow_gap`), so the underscores come out and nothing is invented.
     * @param {string} type - a signal key
     * @returns {string}
     */
    signalLabel (type) {
      return String(type).replace(/_/g, ' ')
    },

    /**
     * The drawing's source wording. `none` means an entry exists carrying no
     * source — the no-summary rows — and a row absent from the file entirely
     * reaches us as `none` too, which the Thin column then explains.
     * @param {string} source - `authored`, `auto`, `keyword`, `reviewed` or `none`
     * @returns {string}
     */
    sourceLabel (source) {
      const known = ['authored', 'auto', 'keyword', 'reviewed', 'none']
      return this.$t('semanticProfiles.source.' + (known.includes(source) ? source : 'none'))
    },

    /** @param {string} source @returns {string} the Buefy tag type for it. */
    sourceTag (source) {
      if (source === 'authored' || source === 'reviewed') { return 'is-success is-light' }
      if (source === 'keyword') { return 'is-warning is-light' }
      if (source === 'none') { return 'is-light' }
      return 'is-info is-light'
    },

    /**
     * The four thin reasons, three of them ruled by Mike on 2026-09-14 and the
     * fourth ("No profile at all") added in the same day's redraw.
     * @param {string} reason - `no_entry`, `no_signals`, `weak` or `keyword_only`
     * @returns {string}
     */
    thinLabel (reason) {
      const known = ['no_entry', 'no_signals', 'weak', 'keyword_only']
      return this.$t('semanticProfiles.thin.' + (known.includes(reason) ? reason : 'no_signals'))
    },

    /** @param {string} reason @returns {string} the Buefy tag type for it. */
    thinTag (reason) {
      return reason === 'weak' || reason === 'keyword_only' ? 'is-warning is-light' : 'is-danger is-light'
    },

    /** @param {string} iso @returns {string} a short local date. */
    formatDate (iso) {
      const d = new Date(iso)
      return isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString(this.$i18n.locale, { day: 'numeric', month: 'short', year: 'numeric' })
    },

    /**
     * Open the editor on a row, seeded with the profile the engine reads TODAY rather
     * than blank — the mentor edits what is actually in force (the drawing's Option A).
     * @param {object} row - the table row
     */
    openEditor (row) {
      if (this.editing && this.editing.page === row.page) { this.closeEditor(); return }
      this.editing = row
      this.draft = Object.assign({}, row.effective)
      this.draftNote = row.note || ''
      this.saveError = ''
      this.history = []
      this.loadHistory(row.page)

      // 🔴 SCROLL TO IT, OR THE CLICK LOOKS LIKE IT DID NOTHING. The editor renders below
      // the table, and with 25 rows on screen that is roughly 1,300px down — off-screen.
      // Mike hit exactly that on 2026-09-16: he clicked Edit on `Retail`, the button said
      // "Editing…", and the panel he was waiting for was sitting past the bottom of the
      // window. The suite could not see it and my own check missed it, because I had
      // clicked the FIRST row, where the panel happens to be close enough to notice.
      // Guarded on the element itself rather than on `process.client`: there is no ref on
      // the server, so this is SSR-safe either way, and `process.client` is a Nuxt
      // build-time flag that is undefined under Jest — which would have made this branch
      // untestable. The options object is ignored by anything that does not understand it
      // rather than throwing, so an older browser still scrolls, just without the easing.
      this.$nextTick(() => {
        const el = this.$refs.editor
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },

    closeEditor () {
      this.editing = null
      this.draft = {}
      this.draftNote = ''
      this.saveError = ''
      this.history = []
    },

    /**
     * Tick or untick a signal. A freshly ticked signal starts at 5 — Mike's ruling of
     * 2026-09-14, clarify question 3.
     * @param {string} type - the signal key
     * @param {boolean} on - the checkbox's new state
     */
    toggleSignal (type, on) {
      const next = Object.assign({}, this.draft)
      if (on) { next[type] = next[type] === undefined ? 5 : next[type] } else { delete next[type] }
      this.draft = next
    },

    /**
     * Set one signal's weight, clamped to 1–10 so the box cannot offer a value the
     * backend will refuse.
     * @param {string} type - the signal key
     * @param {string|number} value - whatever the input holds
     */
    setWeight (type, value) {
      const n = Math.round(Number(value))
      if (!Number.isFinite(n)) { return }
      this.draft = Object.assign({}, this.draft, { [type]: Math.min(10, Math.max(1, n)) })
    },

    /** @param {string} page - load that page's saved versions. */
    async loadHistory (page) {
      try {
        const res = await fetch(`/api/mentor/semantic-profiles/${encodeURIComponent(page)}/history`, {
          headers: this.headers()
        })
        const body = await res.json()
        if (res.ok && body.success) { this.history = body.history || [] }
      } catch (e) {
        // History is a convenience beside the editor; failing to read it must not
        // stop the mentor saving. The editor stays usable with no history shown.
        this.history = []
      }
    },

    /**
     * 🔴 SAVE CHANGES WHAT ADVISORS ARE RECOMMENDED from the next conversation onward.
     * The list is reloaded afterwards so the table shows what the engine will now read,
     * rather than the mentor's optimistic copy of it.
     */
    async save () {
      if (!this.editing) { return }
      this.saving = true
      this.saveError = ''
      try {
        const res = await fetch(`/api/mentor/semantic-profiles/${encodeURIComponent(this.editing.page)}`, {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, this.headers()),
          body: JSON.stringify({ profile: this.draft, note: this.draftNote || null })
        })
        const body = await res.json()
        if (!res.ok || !body.success) {
          this.saveError = (body.error && body.error.message) || this.$t('semanticProfiles.saveFailed')
          return
        }
        this.$buefy.toast.open({ message: this.$t('semanticProfiles.saved'), type: 'is-success' })
        this.closeEditor()
        await this.load()
      } catch (e) {
        this.saveError = this.$t('semanticProfiles.saveFailed')
      } finally {
        this.saving = false
      }
    },

    /** @param {object} row - a history row; puts that version back. */
    async restore (row) {
      this.restoring = row.id
      try {
        const res = await fetch(`/api/mentor/semantic-profiles/${encodeURIComponent(this.editing.page)}/restore`, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, this.headers()),
          body: JSON.stringify({ versionId: row.id })
        })
        const body = await res.json()
        if (!res.ok || !body.success) { throw new Error('restore failed') }
        this.$buefy.toast.open({ message: this.$t('semanticProfiles.restored'), type: 'is-success' })
        this.closeEditor()
        await this.load()
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('semanticProfiles.restoreFailed'), type: 'is-danger' })
      } finally {
        this.restoring = ''
      }
    },

    async load () {
      this.loading = true
      this.loadError = ''
      try {
        const res = await fetch('/api/mentor/semantic-profiles', { headers: this.headers() })
        const body = await res.json()
        if (!res.ok || !body.success) { throw new Error('load failed') }
        this.rows = body.templates || []
        this.signals = body.signals || []
        this.thinCount = body.thinCount || 0
        this.total = body.total || 0
      } catch (e) {
        // A failed load must never render as an empty, reassuring table.
        this.loadError = this.$t('semanticProfiles.loadFailed')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.sp-band-title {
  font-weight: 700;
  color: #002b64;
  font-size: 1.05rem;
}

.sp-card-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* The drawing's four-tile strip. Bulma has no tile of this shape, so it is
   defined once here and scoped. */
.sp-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.75rem;
}

.sp-tile {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 14px;
  padding: 0.85rem 1rem;
}

.sp-tile-l {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #5b6f8a;
  font-weight: 600;
}

.sp-tile-v {
  font-size: 1.75rem;
  color: #002b64;
  line-height: 1.2;
}

.sp-tile-s {
  font-size: 0.75rem;
  color: #5b6f8a;
  line-height: 1.4;
}

.sp-tt {
  font-weight: 600;
  color: #002b64;
}

.sp-also {
  font-size: 0.72rem;
  color: #5b6f8a;
  line-height: 1.35;
  margin-top: 0.15rem;
}

.sp-chip {
  font-size: 0.72rem;
}

.sp-none {
  font-size: 0.75rem;
  color: #5b6f8a;
  font-style: italic;
}

.sp-foot {
  font-size: 0.78rem;
  color: #5b6f8a;
}

/* ── the row editor (the drawing's Screens B and C) ── */
.sp-lbl {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #5b6f8a;
  font-weight: 600;
  margin-bottom: 0.4rem;
}

.sp-says {
  background: #f1f6fb;
  border-left: 3px solid #0070c0;
  border-radius: 0 9px 9px 0;
  padding: 0.7rem 0.85rem;
  font-size: 0.86rem;
  line-height: 1.5;
}

.sp-says-empty {
  border-left-color: #ff9900;
  font-style: italic;
  color: #5b6f8a;
}

.sp-who {
  font-size: 0.72rem;
  color: #5b6f8a;
  margin-top: 0.5rem;
  line-height: 1.4;
}

.sp-tick {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #eef3f8;
}

.sp-signame {
  font-weight: 600;
  color: #002b64;
  font-size: 0.86rem;
}

.sp-sigdesc {
  display: block;
  font-size: 0.72rem;
  color: #5b6f8a;
  line-height: 1.35;
  font-weight: 400;
}

.sp-weight {
  width: 78px;
  margin-left: auto;
  flex: none;
}

.sp-weight-off {
  margin-left: auto;
  color: #b5c4d6;
  width: 78px;
  text-align: center;
  flex: none;
}
</style>
