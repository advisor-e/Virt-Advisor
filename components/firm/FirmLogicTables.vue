<template lang="pug">
section.firm-logic-tables
  //- Intro
  p.subtitle.is-6.has-text-grey.mb-4 {{ $t('firmLogicTables.lede') }}

  b-message(v-if="error" type="is-danger" has-icon :closable="false") {{ error }}

  //- Toolbar — search
  .level.mb-4
    .level-left
      b-field.mb-0
        b-input(
          v-model="query"
          type="search"
          icon="magnify"
          :placeholder="$t('firmLogicTables.searchPlaceholder')"
          :aria-label="$t('firmLogicTables.searchPlaceholder')"
        )

  b-loading(:is-full-page="false" :active="loading")

  .columns(v-if="!loading")
    //- ── Rail: two groups (advisory / get-the-job) ──────────────────────
    .column.is-4
      nav.lt-rail(:aria-label="$t('firmLogicTables.railLabel')")
        .lt-rail-empty(v-if="!groups.length")
          span.has-text-grey.is-size-7 {{ query ? $t('firmLogicTables.noMatchHere') : $t('firmLogicTables.emptyLibrary') }}

        .lt-rail-group(v-for="group in groups" :key="group.key")
          h3.lt-rail-heading {{ group.heading }}
          button.lt-rail-item(
            v-for="item in group.items"
            :key="item.id"
            type="button"
            :class="{ 'is-current': current && current.id === item.id }"
            @click="select(item)"
          )
            span.lt-rail-name {{ item.label }}
            b-tag(:type="item.origin === 'firm' ? 'is-warning is-light' : 'is-light'" size="is-small" rounded) {{ item.count }}

    //- ── Panel: the selected table's branches ───────────────────────────
    .column.is-8
      .box.panel-empty(v-if="!current")
        p.has-text-weight-semibold {{ $t('firmLogicTables.pickPrompt') }}
        p.has-text-grey.is-size-7 {{ $t('firmLogicTables.pickHint') }}

      div(v-else)
        .box
          //- Header — table identity + origin legend.
          .level.mb-3.is-align-items-flex-start
            .level-left
              div
                p.title.is-5.mb-1 {{ current.label }}
                b-tag(:type="current.origin === 'firm' ? 'is-warning is-light' : 'is-light'")
                  | {{ current.origin === 'firm' ? $t('firmLogicTables.originFirm') : $t('firmLogicTables.originPlatform') }}
            .level-right
              .lt-legend
                span.lt-legend-item
                  span.lt-dot.is-platform
                  | {{ $t('firmLogicTables.legendPlatform') }}
                span.lt-legend-item
                  span.lt-dot.is-firm
                  | {{ $t('firmLogicTables.legendFirm') }}

          //- Preview banner — this pass edits on screen only; saving follows.
          b-message.mb-4(type="is-info" has-icon :closable="false")
            | {{ $t('firmLogicTables.previewNotice') }}

          b-message.mb-0(
            v-if="!hasBranches"
            type="is-warning"
            has-icon
            :closable="false"
          ) {{ $t('firmLogicTables.noBranches') }}

          //- The four-column IF→THEN table.
          .table-scroll(v-else)
            table.lt-table
              colgroup
                col.c-branch
                col.c-if
                col.c-then
                col.c-notes
              thead
                tr
                  th(scope="col") {{ $t('firmLogicTables.colBranch') }}
                  th.th-if(scope="col") {{ $t('firmLogicTables.colIf') }}
                  th.th-then(scope="col") {{ $t('firmLogicTables.colThen') }}
                  th(scope="col") {{ $t('firmLogicTables.colNotes') }}
              tbody
                tr(v-for="(branch, bIndex) in form.branches" :key="bIndex")
                  td
                    b-input.branch-input(
                      v-model="branch.branch_name"
                      :aria-label="$t('firmLogicTables.colBranch')"
                    )
                    b-tag.mt-2(:type="branch.origin === 'firm' ? 'is-warning is-light' : 'is-light'" size="is-small")
                      | {{ branch.origin === 'firm' ? $t('firmLogicTables.tagFirm') : $t('firmLogicTables.tagPlatform') }}
                  td.td-if
                    b-input(
                      v-model="branch.condition"
                      type="textarea"
                      rows="3"
                      :aria-label="$t('firmLogicTables.colIf')"
                    )
                  td.td-then
                    b-input(
                      v-model="branch.action"
                      type="textarea"
                      rows="3"
                      :aria-label="$t('firmLogicTables.colThen')"
                    )
                  td
                    b-input(
                      v-model="branch.notes"
                      type="textarea"
                      rows="3"
                      :aria-label="$t('firmLogicTables.colNotes')"
                    )

          //- Action bar. Inert this pass (see previewNotice); Save/Reset/Add
          //- branch go live with the fencing safeguard in Slice B.
          .lt-actionbar(v-if="hasBranches")
            b-button(type="is-light" disabled) {{ $t('firmLogicTables.addBranch') }}
            b-button(type="is-text" disabled) {{ $t('firmLogicTables.reset') }}
            span.lt-spacer
            b-button(type="is-primary" disabled) {{ $t('firmLogicTables.save') }}
</template>

<script>
/**
 * Firm Logic Tables (FIRM-EDITABLE-TABLES-PLAN.md Phase 3, §0.6) — the firm's
 * no-code view of the IF→THEN branch tables that steer how a meeting is run.
 * Each row is one branch: name, the If (condition), the Then (action), notes.
 *
 * Lives in its own file rather than inside FirmManagerHub.vue (over the
 * decompose rule, CB-23) — the Hub renders it as one tab, like FirmQuizzes,
 * FirmDocuments and FirmDomainSupport, whose read-preview pattern this mirrors.
 *
 * Slice A is a LIVE PREVIEW read pass: browse the tables, open one, and edit its
 * branches ON SCREEN — nothing is persisted. Save, Reset and "+ Add branch" are
 * inert (see the previewNotice banner). Persisting a firm's edits, the "+ Add
 * branch" flow behaviour, and the prompt-fencing that firm-authored branch text
 * needs before it reaches the AI (plan §5) all land in Slice B so that surface
 * is never live before its safeguard.
 *
 * Reads the SINGLE `logic-trees` overlay bundle the advisor engine itself loads
 * (firmContent), so what a firm sees here is what the AI sees — not the split
 * per-key storage the domain-support routes use (that gap is a logged P1).
 *
 * The rail is a simple two-group list (advisory / get-the-job) per the approved
 * mockup, matching FirmDomainSupport — not the FirmRail accordion.
 */
export default {
  name: 'FirmLogicTables',

  props: {
    /** Bearer token for the firm-manager API (the server re-checks every call). */
    apiToken: { type: String, required: true }
  },

  data () {
    return {
      loading: false,
      error: '',
      /** List-route payload: advisory logic tables, each {id,label,count,origin}. */
      advisory: [],
      /** List-route payload: the get-the-job logic tables, same shape. */
      getSellers: [],
      query: '',
      /** The table on screen: {id, label, origin}, or null. */
      current: null,
      /** A deep, editable copy of the current table's branches (local only). */
      form: { branches: [] }
    }
  },

  computed: {
    /**
     * The rail: two headed groups, each a flat list of tables filtered by the
     * search box. An empty group is dropped so no heading sits over nothing.
     */
    groups () {
      const q = this.query.trim().toLowerCase()
      const match = list => list
        .filter(d => !q || String(d.label || '').toLowerCase().includes(q))
        .map(d => ({ id: d.id, label: d.label, count: d.count, origin: d.origin }))

      const groups = []
      const advisory = match(this.advisory)
      if (advisory.length) {
        groups.push({ key: 'advisory', heading: this.$t('firmLogicTables.groupAdvisory'), items: advisory })
      }
      const sellers = match(this.getSellers)
      if (sellers.length) {
        groups.push({ key: 'sellers', heading: this.$t('firmLogicTables.groupSellers'), items: sellers })
      }
      return groups
    },

    /** True when the open table has branches to show. */
    hasBranches () {
      return Array.isArray(this.form.branches) && this.form.branches.length > 0
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /** GET the logic-table list (advisory + get-the-job). */
    async load () {
      this.loading = true
      this.error = ''
      try {
        const data = await this.api('GET', '/api/firm-manager/logic-trees')
        this.advisory = (data.advisory || []).map(this.normaliseListRow)
        this.getSellers = (data.getSellers || []).map(this.normaliseListRow)
      } catch (err) {
        this.error = this.$t('firmLogicTables.loadFailed')
      } finally {
        this.loading = false
      }
    },

    /**
     * Give each rail row a stable shape.
     * @param {{id:string,label:string,count:number,origin:string}} row
     * @returns {{id:string,label:string,count:number,origin:string}}
     */
    normaliseListRow (row) {
      return {
        id: row.id,
        label: row.label,
        count: typeof row.count === 'number' ? row.count : 0,
        origin: row.origin || 'platform'
      }
    },

    /**
     * Open a table: fetch its branches and take an editable local copy. Editing
     * that copy changes nothing on the server in this pass.
     * @param {{id:string,label:string,origin:string}} item rail row
     */
    async select (item) {
      this.current = { id: item.id, label: item.label, origin: item.origin }
      this.form = { branches: [] }
      try {
        const detail = await this.api('GET', `/api/firm-manager/logic-trees/${encodeURIComponent(item.id)}`)
        const branches = Array.isArray(detail.branches) ? detail.branches : []
        const rowOrigin = item.origin === 'firm' ? 'firm' : 'platform'
        // Deep copy so on-screen edits never mutate the fetched reference. Each
        // branch keeps its node id so a later save can merge by id (Slice B).
        this.form = {
          branches: branches.map(b => ({
            id: b.id,
            branch_name: b.branch_name || '',
            condition: b.condition || '',
            action: b.action || '',
            notes: b.notes || '',
            origin: rowOrigin
          }))
        }
      } catch (err) {
        this.error = this.$t('firmLogicTables.detailFailed')
      }
    },

    /**
     * Thin authenticated fetch — mirrors the sibling firm tabs so this one can
     * be mounted and tested on its own; the backend re-checks authorisation on
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
/* Rail — a simple two-group list (the mockup shape), matching FirmDomainSupport.
   Kept local; slot content compiles in this component's scope. */
.lt-rail {
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  padding: 0.5rem;
  max-height: 70vh;
  overflow-y: auto;
}
.lt-rail-group { margin-bottom: 1rem; }
.lt-rail-heading {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  font-weight: 700;
  color: #8a94a3;
  margin: 0 0 0.35rem;
  padding: 0.3rem 0.4rem;
}
.lt-rail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  background: none;
  border: 0;
  border-left: 3px solid transparent;
  cursor: pointer;
  text-align: left;
  padding: 0.45rem 0.5rem;
  font: inherit;
  border-radius: 4px;
}
.lt-rail-item:hover { background: #f5f7fa; }
.lt-rail-item.is-current {
  background: #eaf1fb;
  border-left-color: #002b64;
  font-weight: 600;
}
.lt-rail-name { flex: 1; }
.lt-rail-empty { padding: 0.3rem 0.25rem; }
.panel-empty { text-align: center; padding: 3rem 1rem; }

/* Origin legend in the panel header. */
.lt-legend { display: flex; gap: 0.9rem; font-size: 0.75rem; color: #8a94a3; }
.lt-legend-item { display: inline-flex; align-items: center; gap: 0.35rem; }
.lt-dot { display: inline-block; width: 0.62rem; height: 0.62rem; border-radius: 3px; }
.lt-dot.is-platform { background: #c7ceda; }
.lt-dot.is-firm { background: #e0b24e; }

/* The four-column table. Scrolls inside its own container so the page body
   never scrolls sideways. IF/THEN columns carry a faint blue/green wash so the
   condition and the action read apart at a glance. */
.table-scroll { overflow-x: auto; }
.lt-table { border-collapse: collapse; width: 100%; min-width: 62rem; }
.lt-table thead th {
  background: #f4f6f9;
  text-align: left;
  vertical-align: bottom;
  font-size: 0.68rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-weight: 700;
  color: #002b64;
  padding: 0.7rem 0.6rem;
  border-bottom: 1px solid #d5dbe4;
}
.lt-table thead th.th-if { background: #f4f8fc; }
.lt-table thead th.th-then { background: #f3faf5; }
.lt-table tbody td {
  vertical-align: top;
  padding: 0.6rem;
  border-bottom: 1px solid #eef1f5;
}
.lt-table tbody td.td-if { background: #f9fbfe; }
.lt-table tbody td.td-then { background: #f8fcf9; }
.lt-table colgroup .c-branch { width: 16%; }
.lt-table colgroup .c-if { width: 28%; }
.lt-table colgroup .c-then { width: 28%; }
.lt-table colgroup .c-notes { width: 28%; }
.branch-input >>> input { font-weight: 600; color: #002b64; }

/* Action bar. */
.lt-actionbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  padding-top: 0.9rem;
  margin-top: 0.6rem;
  border-top: 1px solid #eef1f5;
}
.lt-spacer { flex: 1; }
</style>
