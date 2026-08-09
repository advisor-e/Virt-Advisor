<template lang="pug">
.mentor-template-check
  .has-text-centered.py-6(v-if="loading")
    b-loading(:is-full-page="false" :active="true")

  b-notification(v-else-if="error" type="is-danger is-light" :closable="false")
    | {{ error }}

  template(v-else)
    p.title.is-5 {{ $t('templateCheck.title') }}
    p.subtitle.is-6.has-text-grey.mb-5 {{ $t('templateCheck.lede') }}

    //- ── The counts ────────────────────────────────────────────────
    p.tc-band-title {{ $t('templateCheck.counts.heading') }}
    p.is-size-7.has-text-grey.mb-3 {{ $t('templateCheck.counts.sub', { n: counts.tablesChecked }) }}
    .columns.mb-5
      .column(v-for="tile in tiles" :key="tile.k")
        .box.tc-tile(:class="'tc-tile--' + tile.tone")
          span.tc-num {{ tile.n }}
          span.tc-lab {{ tile.label }}
          p.is-size-7.has-text-grey.mt-2 {{ tile.body }}

    //- ── The list ──────────────────────────────────────────────────
    p.tc-band-title {{ $t('templateCheck.list.heading') }}
    p.is-size-7.has-text-grey.mb-3 {{ $t('templateCheck.list.sub') }}

    .tc-toolbar.mb-4
      .buttons.mb-0
        b-button(
          v-for="f in filters"
          :key="f.k"
          size="is-small"
          :type="activeFilter === f.k ? 'is-primary' : 'is-light'"
          @click="activeFilter = f.k"
        ) {{ f.label }} ({{ f.n }})
      b-input(
        v-model="search"
        size="is-small"
        type="search"
        icon="magnify"
        :placeholder="$t('templateCheck.list.searchPlaceholder')"
      )
      //- Only offered once something is queued. A button reading "(0)" invites a
      //- click that can only disappoint, and this list is empty until rows are ruled.
      b-button(
        v-if="queuedCount > 0"
        size="is-small"
        type="is-link"
        icon-left="playlist-check"
        @click="openQueue"
      ) {{ $t('templateCheck.queue.button', { n: queuedCount }) }}

    //- ── What is queued ────────────────────────────────────────────
    //- Design: design/mockups/logic-table-template-check.html §5 (ruled 2026-08-09).
    //- It PREPARES a reviewed change; it never edits a table.
    b-modal(v-model="queueOpen" has-modal-card trap-focus :width="900")
      .modal-card(style="width:auto")
        header.modal-card-head
          p.modal-card-title {{ $t('templateCheck.queue.heading') }}
        section.modal-card-body
          .has-text-centered.py-5(v-if="queueLoading")
            b-loading(:is-full-page="false" :active="true")
          b-notification(v-else-if="queueError" type="is-danger is-light" :closable="false")
            | {{ queueError }}
          template(v-else)
            p.is-size-7.has-text-grey.mb-4
              | {{ $t('templateCheck.queue.sub', { ready: patch.counts.ready, needsEyes: patch.counts.needsEyes }) }}
            p.is-size-7.mb-4 {{ $t('templateCheck.queue.explainer') }}
            b-table(:data="patch.edits" :hoverable="true" :narrowed="true")
              b-table-column(v-slot="{ row }" :label="$t('templateCheck.queue.colWhere')")
                span.has-text-weight-semibold {{ row.table }}
                br
                span.is-size-7.has-text-grey {{ row.branchName }}
              b-table-column(v-slot="{ row }" :label="$t('templateCheck.queue.colChange')")
                code.tc-from {{ row.from }}
                |  →
                code.tc-to {{ row.to }}
                br
                span.is-size-7.has-text-grey {{ row.where }} · {{ row.field }}
              b-table-column(v-slot="{ row }" :label="$t('templateCheck.queue.colStatus')" width="34%")
                b-tag(:type="row.status === 'ready' ? 'is-success is-light' : 'is-warning is-light'")
                  | {{ $t('templateCheck.queue.status.' + (row.status === 'ready' ? 'ready' : 'needsChecking')) }}
                p.is-size-7.has-text-grey.mt-1(v-if="row.reason") {{ row.reason }}
        footer.modal-card-foot
          b-button(@click="queueOpen = false") {{ $t('templateCheck.queue.close') }}

    p.has-text-grey.has-text-centered.py-6(v-if="visibleRows.length === 0")
      | {{ $t('templateCheck.list.empty') }}

    b-table(
      v-else
      :data="visibleRows"
      :row-class="row => row.verdict === 'dismissed' ? 'tc-dismissed' : ''"
      :paginated="visibleRows.length > 25"
      :per-page="25"
      hoverable
    )
      b-table-column(v-slot="{ row }" :label="$t('templateCheck.col.table')" width="20%")
        span.tc-table-name {{ row.table }}
        br
        span.is-size-7.has-text-grey {{ row.branchName || row.condition }}

      b-table-column(v-slot="{ row }" :label="$t('templateCheck.col.name')" width="17%")
        span.tc-name {{ row.name }}

      b-table-column(v-slot="{ row }" :label="$t('templateCheck.col.where')" width="9%")
        b-tag(:type="row.where === 'list' ? 'is-info is-light' : 'is-warning is-light'")
          | {{ row.where === 'list' ? $t('templateCheck.where.list') : $t('templateCheck.where.prose') }}

      b-table-column(v-slot="{ row }" :label="$t('templateCheck.col.verdict')" width="32%")
        b-tag(:type="verdictTone(row.verdict)") {{ verdictLabel(row.verdict) }}
        p.is-size-7.mt-1(v-if="row.verdict === 'maybe' && row.candidate")
          strong {{ row.candidate.title }}
          |  — {{ candidateWhy(row.candidate) }}
          template(v-if="row.candidate.summary")
            br
            em.has-text-grey {{ truncate(row.candidate.summary) }}
        p.is-size-7.mt-1.has-text-grey(v-else-if="row.verdict === 'none'")
          | {{ $t('templateCheck.verdictWhy.none') }}
        p.is-size-7.mt-1(v-else-if="row.verdict === 'ruled'")
          | → #[strong {{ row.ruling.title }}]
          br
          //- The two halves of one sentence changing state. Both approved wording:
          //- design/mockups/logic-table-template-check.html §5 (ruled 2026-08-09).
          span.has-text-grey(v-if="!row.ruling.applyRequested")
            | {{ $t('templateCheck.verdictWhy.ruled') }}
          span.has-text-success(v-else) {{ $t('templateCheck.verdictWhy.queued') }}
        p.is-size-7.mt-1.has-text-grey(v-else-if="row.verdict === 'flagged'")
          | {{ $t('templateCheck.verdictWhy.flagged') }}
        p.is-size-7.mt-1.has-text-grey(v-else-if="row.verdict === 'dismissed'")
          | {{ $t('templateCheck.verdictWhy.dismissed') }}

      b-table-column(v-slot="{ row }" :label="$t('templateCheck.col.actions')" width="22%")
        .buttons.are-small.mb-0(v-if="row.verdict === 'maybe'")
          b-button(type="is-primary" :loading="saving === row.key" @click="useThisOne(row)")
            | {{ $t('templateCheck.action.useThisOne') }}
          b-button(@click="openPicker(row)") {{ $t('templateCheck.action.pickAnother') }}
          b-button(type="is-text" @click="dismiss(row)") {{ $t('templateCheck.action.notATool') }}
        .buttons.are-small.mb-0(v-else-if="row.verdict === 'none'")
          b-button(type="is-primary" @click="openPicker(row)")
            | {{ $t('templateCheck.action.pointAtTemplate') }}
          b-button(@click="dismiss(row)") {{ $t('templateCheck.action.notATool') }}
          b-button(type="is-text" :loading="saving === row.key" @click="flagMissing(row)")
            | {{ $t('templateCheck.action.flagMissing') }}
        .buttons.are-small.mb-0(v-else)
          //- "Apply it" — approved 2026-08-05. It QUEUES the change; it never edits a
          //- table. Only a ruling that points at a template can be queued: a dismissal
          //- and a flag both correctly produce no edit at all.
          b-button(
            v-if="row.verdict === 'ruled' && !row.ruling.applyRequested"
            type="is-primary"
            :loading="saving === row.key"
            @click="applyIt(row)"
          )
            | {{ $t('templateCheck.action.applyIt') }}
          b-button(type="is-text" :loading="saving === row.key" @click="undo(row)")
            | {{ undoLabel(row.verdict) }}

    b-notification.mt-4(type="is-warning is-light" :closable="false")
      strong {{ $t('templateCheck.caution.heading') }}
      |  {{ $t('templateCheck.caution.body') }}

    //- ── The limits ────────────────────────────────────────────────
    p.tc-band-title.mt-6 {{ $t('templateCheck.limits.heading') }}
    p.is-size-7.has-text-grey.mb-3 {{ $t('templateCheck.limits.sub') }}
    .box
      ul.tc-plain
        li(v-for="k in limitKeys" :key="k") {{ $t('templateCheck.limits.' + k) }}
      p.is-size-7.has-text-grey.mt-3
        | {{ $t('templateCheck.limits.footnote', { tables: counts.tablesChecked, refs: counts.listReferencesChecked }) }}

  //- ── Template picker ───────────────────────────────────────────
  b-modal(v-model="pickerOpen" has-modal-card trap-focus :can-cancel="['escape','outside']")
    .modal-card(style="width:520px")
      header.modal-card-head
        p.modal-card-title {{ $t('templateCheck.picker.heading') }}
      section.modal-card-body
        p.is-size-7.has-text-grey.mb-3(v-if="pickerRow")
          | {{ $t('templateCheck.picker.forName', { name: pickerRow.name }) }}
        b-field
          b-autocomplete(
            v-model="pickerQuery"
            :data="pickerMatches"
            :placeholder="$t('templateCheck.picker.placeholder')"
            open-on-focus
            clearable
            @select="option => pickerChoice = option"
          )
      footer.modal-card-foot
        b-button(
          type="is-primary"
          :disabled="!pickerChoice"
          :loading="saving === (pickerRow && pickerRow.key)"
          @click="confirmPick"
        ) {{ $t('templateCheck.picker.confirm') }}
        b-button(@click="pickerOpen = false") {{ $t('templateCheck.picker.cancel') }}
</template>

<script>
/**
 * Template Check — the Mentor Hub tab that lists every tool a logic table asks
 * for and the app cannot open.
 *
 * Built to design/mockups/logic-table-template-check.html, approved by Mike on
 * 2026-08-05 ("that looks great, move forward"). The 13 labels and 4 verdict
 * names in that file are approved AS WRITTEN and are reproduced here through
 * `locales/en.json` — see templateCheck.* — so they translate without the wording
 * changing. Deviations from the mockup are named in the commit that ships this.
 *
 * The screen decides nothing. Every verdict is either a fact about the catalogue
 * or a suggestion labelled as one, and nothing is written to a logic table from
 * here: a ruling is recorded, and applying it is a later, reviewed step.
 */

const ALL_TITLES = [...new Set(
  require('~/data/templates.json').map(t => t && t.title).filter(Boolean)
)].sort()

export default {
  name: 'MentorTemplateCheck',

  props: {
    // The mentor's JWT. Every call is re-gated server-side by requireMentorRole.
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: true,
      error: '',
      counts: {},
      findings: [],
      activeFilter: 'all',
      search: '',
      saving: '',
      pickerOpen: false,
      pickerRow: null,
      pickerQuery: '',
      pickerChoice: '',
      limitKeys: ['cannotKnow', 'suggestionOnly', 'titlesNotContents', 'cannotPublish'],
      queueOpen: false,
      queueLoading: false,
      queueError: '',
      /** The prepared changes, as GET /api/mentor/template-check/patch returns them. */
      patch: { counts: { ready: 0, needsEyes: 0 }, edits: [] }
    }
  },

  computed: {
    /**
     * How many rulings are queued for the next update.
     *
     * Counted from the rows already on screen rather than fetched, so pressing
     * "Apply it" moves the number immediately — a count that only caught up on
     * reload would read as a button that did nothing.
     *
     * @returns {number}
     */
    queuedCount () {
      return this.findings.filter(f => f.ruling && f.ruling.applyRequested).length
    },

    /** The three tiles across the top, in the mockup's order. */
    tiles () {
      const c = this.counts
      return [
        {
          k: 'tables',
          tone: 'ok',
          n: c.tablesChecked || 0,
          label: this.$t('templateCheck.tile.tables'),
          body: this.$t('templateCheck.tile.tablesBody', {
            nodes: c.tablesWithNodes || 0,
            branches: c.tablesWithBranches || 0
          })
        },
        {
          k: 'lists',
          tone: 'bad',
          n: c.unmatchedInLists || 0,
          label: this.$t('templateCheck.tile.lists'),
          body: this.$t('templateCheck.tile.listsBody', { checked: c.listReferencesChecked || 0 })
        },
        {
          k: 'prose',
          tone: 'warn',
          n: c.unmatchedInProse || 0,
          label: this.$t('templateCheck.tile.prose'),
          body: this.$t('templateCheck.tile.proseBody')
        }
      ]
    },

    /** Filter chips, each carrying its own live count. */
    filters () {
      const by = v => this.findings.filter(f => f.verdict === v).length
      return [
        { k: 'all', label: this.$t('templateCheck.filter.all'), n: this.findings.filter(f => f.verdict !== 'dismissed').length },
        { k: 'none', label: this.$t('templateCheck.verdict.none'), n: by('none') },
        { k: 'maybe', label: this.$t('templateCheck.verdict.maybe'), n: by('maybe') },
        { k: 'ruled', label: this.$t('templateCheck.verdict.ruled'), n: by('ruled') },
        { k: 'flagged', label: this.$t('templateCheck.verdict.flagged'), n: by('flagged') },
        { k: 'dismissed', label: this.$t('templateCheck.verdict.dismissed'), n: by('dismissed') }
      ]
    },

    visibleRows () {
      const q = this.search.trim().toLowerCase()
      return this.findings.filter((f) => {
        // "All" deliberately hides dismissals: they are answered, and leaving them
        // in the default view re-raises the false alarms the dismissal settled.
        if (this.activeFilter === 'all' ? f.verdict === 'dismissed' : f.verdict !== this.activeFilter) { return false }
        if (!q) { return true }
        return `${f.table} ${f.name} ${f.branchName}`.toLowerCase().includes(q)
      })
    },

    pickerMatches () {
      const q = this.pickerQuery.trim().toLowerCase()
      if (!q) { return ALL_TITLES.slice(0, 50) }
      return ALL_TITLES.filter(t => t.toLowerCase().includes(q)).slice(0, 50)
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** @returns {object} auth headers for every mentor call. */
    headers () {
      return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiToken}` }
    },

    async load () {
      this.loading = true
      this.error = ''
      try {
        const res = await fetch('/api/mentor/template-check', { headers: this.headers() })
        const body = await res.json()
        if (!res.ok || !body.success) { throw new Error((body.error && body.error.message) || 'load failed') }
        this.counts = body.counts || {}
        this.findings = body.findings || []
      } catch (e) {
        // A failed load must never render as an empty, reassuring table.
        this.error = this.$t('templateCheck.error.load')
      } finally {
        this.loading = false
      }
    },

    /**
     * Record one ruling and fold the server's answer back into the row in place,
     * so a decision does not cost a full rescan of 42 tables.
     *
     * @param {object} row - the finding.
     * @param {object} payload - { verdict, title, note }.
     */
    async saveRuling (row, payload) {
      this.saving = row.key
      try {
        const res = await fetch(`/api/mentor/template-check/rulings/${encodeURIComponent(row.key)}`, {
          method: 'PUT', headers: this.headers(), body: JSON.stringify(payload)
        })
        const body = await res.json()
        if (!res.ok || !body.success) { throw new Error((body.error && body.error.message) || 'save failed') }
        this.applyLocally(row, body.ruling)
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('templateCheck.error.save'), type: 'is-danger' })
      } finally {
        this.saving = ''
      }
    },

    /**
     * "Apply it" — queue this ruling for the next update.
     *
     * It re-sends the SAME verdict and title with `applyRequested`, rather than
     * patching a flag: the ruling is one stored record, and a partial write would
     * be a second way for a decision and its queue state to disagree.
     *
     * @param {object} row - the ruled row.
     * @returns {Promise<void>}
     */
    applyIt (row) {
      return this.saveRuling(row, {
        verdict: 'ruled',
        title: row.ruling.title,
        note: row.ruling.note || '',
        applyRequested: true
      })
    },

    /**
     * Fetch the prepared changes and open the panel.
     *
     * Fetched on open rather than held in memory: a ruling made minutes ago may
     * already be stale against a table someone else changed, and the classification
     * is worked out server-side against the file as it stands right now.
     *
     * @returns {Promise<void>}
     */
    async openQueue () {
      this.queueOpen = true
      this.queueLoading = true
      this.queueError = ''
      try {
        const res = await fetch('/api/mentor/template-check/patch', { headers: this.headers() })
        const body = await res.json()
        if (!res.ok || !body.success) { throw new Error((body.error && body.error.message) || 'load failed') }
        this.patch = body.patch
      } catch (e) {
        this.queueError = this.$t('templateCheck.queue.loadFailed')
      } finally {
        this.queueLoading = false
      }
    },

    /** @param {object} row @param {object|null} ruling */
    applyLocally (row, ruling) {
      const i = this.findings.findIndex(f => f.key === row.key)
      if (i < 0) { return }
      // Mirrors buildFinding() on the backend, so a row looks the same
      // immediately after a decision as it does after the next full load.
      let verdict
      if (ruling && ['dismissed', 'flagged'].includes(ruling.verdict)) {
        verdict = ruling.verdict
      } else if (ruling) {
        verdict = 'ruled'
      } else {
        verdict = this.findings[i].candidate ? 'maybe' : 'none'
      }
      this.$set(this.findings, i, Object.assign({}, this.findings[i], { ruling, verdict }))
    },

    useThisOne (row) {
      this.saveRuling(row, { verdict: 'ruled', title: row.candidate.title })
    },

    dismiss (row) {
      this.saveRuling(row, { verdict: 'dismissed' })
    },

    flagMissing (row) {
      this.saveRuling(row, { verdict: 'flagged', note: this.$t('templateCheck.flagNote') })
    },

    async undo (row) {
      this.saving = row.key
      try {
        const res = await fetch(`/api/mentor/template-check/rulings/${encodeURIComponent(row.key)}`, {
          method: 'DELETE', headers: this.headers()
        })
        if (!res.ok) { throw new Error('undo failed') }
        this.applyLocally(row, null)
      } catch (e) {
        this.$buefy.toast.open({ message: this.$t('templateCheck.error.save'), type: 'is-danger' })
      } finally {
        this.saving = ''
      }
    },

    openPicker (row) {
      this.pickerRow = row
      this.pickerQuery = ''
      this.pickerChoice = ''
      this.pickerOpen = true
    },

    confirmPick () {
      const row = this.pickerRow
      this.pickerOpen = false
      this.saveRuling(row, { verdict: 'ruled', title: this.pickerChoice })
    },

    /** @param {string} v @returns {string} the approved verdict wording. */
    verdictLabel (v) {
      return this.$t(`templateCheck.verdict.${v}`)
    },

    /** @param {string} v @returns {string} Buefy tag type. */
    verdictTone (v) {
      return {
        none: 'is-danger is-light',
        maybe: 'is-warning is-light',
        ruled: 'is-success is-light',
        flagged: 'is-info is-light',
        dismissed: 'is-light'
      }[v] || 'is-light'
    },

    /**
     * The undo wording differs by what is being undone — "Put it back" reads as
     * restoring something removed, which is only true of a dismissal.
     *
     * @param {string} v - the row's verdict.
     * @returns {string}
     */
    undoLabel (v) {
      if (v === 'dismissed') { return this.$t('templateCheck.action.putItBack') }
      return this.$t('templateCheck.action.changeMyMind')
    },

    /** @param {object} c - candidate @returns {string} */
    candidateWhy (c) {
      return this.$t('templateCheck.candidateWhy', { why: c.why })
    },

    /** @param {string} s @returns {string} */
    truncate (s) {
      const t = String(s || '')
      return t.length > 180 ? `${t.slice(0, 177)}…` : t
    }
  }
}
</script>

<style scoped>
.tc-band-title {
  font-weight: 700;
  color: #002b64;
  font-size: 1.05rem;
}
.tc-tile {
  border-top: 5px solid #d8dce3;
  height: 100%;
}
.tc-tile--ok { border-top-color: #63c48d; }
.tc-tile--bad { border-top-color: #e8a0a0; }
.tc-tile--warn { border-top-color: #ffb870; }
.tc-num {
  display: block;
  font-size: 2.1rem;
  font-weight: 700;
  color: #002b64;
  line-height: 1.1;
}
.tc-lab {
  display: block;
  font-weight: 700;
  font-size: 0.95rem;
  color: #002b64;
  margin-top: 0.5rem;
}
.tc-toolbar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: space-between;
}
.tc-table-name { font-weight: 600; color: #002b64; }
.tc-name { font-family: monospace; font-size: 0.82rem; }
.tc-plain { list-style: disc; padding-left: 1.25rem; }
.tc-plain li { margin-bottom: 0.5rem; }
</style>
