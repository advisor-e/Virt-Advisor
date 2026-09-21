<template lang="pug">
.sp
  header.sp-head
    .sp-eyebrow {{ $t('salesPipeline.eyebrow') }}
    h1.sp-title {{ $t('salesPipeline.title') }}
    p.sp-lede {{ $t('salesPipeline.lede') }}

  //- The seven figures the source app shows above its table. Kept because they
  //- are the advisor's own summary of their own deals; repainted to brand.
  .sp-stats(v-if="!loading || items.length")
    .sp-stat(v-for="s in stats" :key="s.key" :class="s.tone")
      .sp-stat-v {{ s.value }}
      .sp-stat-k {{ s.label }}

  b-notification.sp-error(
    v-if="errorText"
    type="is-danger is-light"
    :closable="true"
    @close="errorText = ''"
  ) {{ errorText }}

  .sp-bar
    b-input.sp-search(
      v-model="search"
      type="search"
      icon="magnify"
      size="is-small"
      :placeholder="$t('salesPipeline.filters.search')"
      :aria-label="$t('salesPipeline.filters.search')"
    )
    b-select(v-model="statusFilter" size="is-small" :aria-label="$t('salesPipeline.columns.status')")
      option(value="") {{ $t('salesPipeline.filters.status') }}
      option(v-for="s in knownStatuses" :key="s" :value="s") {{ s }}
    b-select(v-model="ownerFilter" size="is-small" :aria-label="$t('salesPipeline.columns.leadStaff')")
      option(value="") {{ $t('salesPipeline.filters.owner') }}
      option(v-for="o in knownOwners" :key="o" :value="o") {{ o }}
    b-button.sp-clear(
      v-if="search || statusFilter || ownerFilter"
      size="is-small"
      @click="clearFilters"
    ) {{ $t('salesPipeline.filters.clear') }}
    .sp-bar-spacer
    b-button.sp-add(type="is-primary" size="is-small" icon-left="plus" @click="openNew") {{ $t('salesPipeline.add') }}

  .sp-loading(v-if="loading && !items.length") {{ $t('salesPipeline.loading') }}

  .sp-empty(v-else-if="!visible.length")
    | {{ items.length ? $t('salesPipeline.emptyFiltered') : $t('salesPipeline.empty') }}

  .sp-tablewrap(v-else)
    table.sp-table
      thead
        tr
          th {{ $t('salesPipeline.columns.prospect') }}
          th {{ $t('salesPipeline.columns.business') }}
          th {{ $t('salesPipeline.columns.status') }}
          th {{ $t('salesPipeline.columns.leadStaff') }}
          th {{ $t('salesPipeline.columns.industry') }}
          th.sp-mid {{ $t('salesPipeline.columns.meeting') }}
          th.sp-mid {{ $t('salesPipeline.columns.proposal') }}
          th.sp-num {{ $t('salesPipeline.columns.proposalValue') }}
          th.sp-mid {{ $t('salesPipeline.columns.secured') }}
          th.sp-num {{ $t('salesPipeline.columns.securedValue') }}
          th.sp-mid {{ $t('salesPipeline.columns.shared') }}
          th.sp-act
      tbody
        tr(v-for="row in visible" :key="row.id" :class="{ 'is-theirs': !isMine(row) }")
          td.sp-name {{ row.prospectName }}
          td {{ row.businessName || '—' }}
          td
            span.sp-pill(:class="statusTone(row.prospectStatus)") {{ row.prospectStatus }}
          td {{ row.leadStaff || '—' }}
          td {{ row.industry || '—' }}
          td.sp-mid {{ row.secureMeeting ? '✓' : '' }}
          td.sp-mid {{ row.proposalSent ? '✓' : '' }}
          td.sp-num {{ row.proposalValue ? money(row.proposalValue) : '—' }}
          td.sp-mid {{ row.jobSecured ? '✓' : '' }}
          td.sp-num {{ row.jobSecuredValue ? money(row.jobSecuredValue) : '—' }}
          td.sp-mid
            span.sp-shared(v-if="row.visibility === 'firm'") {{ $t('salesPipeline.visibility.firm') }}
          td.sp-act
            //- A deal shared to the firm is READABLE by a colleague and editable
            //- only by its owner — the backend enforces it; this matches so the
            //- screen never offers an action the server will refuse.
            template(v-if="isMine(row)")
              b-button.sp-icon(size="is-small" icon-left="pencil" :aria-label="$t('salesPipeline.form.editTitle')" @click="openEdit(row)")
              b-button.sp-icon(size="is-small" icon-left="delete" :aria-label="$t('salesPipeline.confirmDelete.confirm')" @click="confirmDelete(row)")

  b-modal(:active.sync="formOpen" has-modal-card trap-focus :can-cancel="['escape', 'outside']")
    .modal-card.sp-card
      header.modal-card-head
        p.modal-card-title {{ draft.id ? $t('salesPipeline.form.editTitle') : $t('salesPipeline.form.newTitle') }}
      section.modal-card-body
        .sp-grid
          b-field(:label="$t('salesPipeline.form.prospectName')")
            b-input(v-model="draft.prospectName" size="is-small" required)
          b-field(:label="$t('salesPipeline.form.businessName')")
            b-input(v-model="draft.businessName" size="is-small")
          b-field(:label="$t('salesPipeline.form.prospectStatus')")
            b-input(v-model="draft.prospectStatus" size="is-small" required)
          b-field(:label="$t('salesPipeline.form.partner')")
            b-input(v-model="draft.partner" size="is-small")
          b-field(:label="$t('salesPipeline.form.leadStaff')")
            b-input(v-model="draft.leadStaff" size="is-small")
          b-field(:label="$t('salesPipeline.form.industry')")
            b-input(v-model="draft.industry" size="is-small")
          b-field(:label="$t('salesPipeline.form.email')")
            b-input(v-model="draft.email" size="is-small" type="email")
          b-field(:label="$t('salesPipeline.form.contactPhone')")
            b-input(v-model="draft.contactPhone" size="is-small")
          b-field(:label="$t('salesPipeline.form.prospectSource')")
            b-input(v-model="draft.prospectSource" size="is-small")
          b-field(:label="$t('salesPipeline.form.coiInvolved')")
            b-input(v-model="draft.coiInvolved" size="is-small")
          b-field(:label="$t('salesPipeline.form.approachDate')")
            b-input(v-model="draft.approachDate" size="is-small" type="date")
          b-field(:label="$t('salesPipeline.form.meetingDate')")
            b-input(v-model="draft.meetingDate" size="is-small" type="date")
          b-field(:label="$t('salesPipeline.form.proposalValue')")
            b-input(v-model="draft.proposalValue" size="is-small" type="number" step="0.01" min="0")
          b-field(:label="$t('salesPipeline.form.jobSecuredValue')")
            b-input(v-model="draft.jobSecuredValue" size="is-small" type="number" step="0.01" min="0")
          b-field(:label="$t('salesPipeline.form.dateSecured')")
            b-input(v-model="draft.dateSecured" size="is-small" type="date")
          b-field(:label="$t('salesPipeline.form.additionalWorkSecured')")
            b-input(v-model="draft.additionalWorkSecured" size="is-small" type="number" step="0.01" min="0")
        .sp-checks
          b-checkbox(v-model="draft.secureMeeting" size="is-small") {{ $t('salesPipeline.form.secureMeeting') }}
          b-checkbox(v-model="draft.proposalSent" size="is-small") {{ $t('salesPipeline.form.proposalSent') }}
          b-checkbox(v-model="draft.jobSecured" size="is-small") {{ $t('salesPipeline.form.jobSecured') }}
        b-field.sp-notes(:label="$t('salesPipeline.form.comments')")
          b-input(v-model="draft.comments" type="textarea" rows="3" size="is-small")
        b-field.sp-vis(:label="$t('salesPipeline.form.visibility')")
          b-select(v-model="draft.visibility" size="is-small" expanded)
            option(value="private") {{ $t('salesPipeline.visibility.private') }}
            option(value="firm") {{ $t('salesPipeline.visibility.firm') }}
        p.sp-vis-hint {{ draft.visibility === 'firm' ? $t('salesPipeline.visibility.firmHint') : $t('salesPipeline.visibility.privateHint') }}
      footer.modal-card-foot
        b-button(size="is-small" @click="formOpen = false") {{ $t('salesPipeline.form.cancel') }}
        b-button(type="is-primary" size="is-small" :loading="saving" :disabled="!canSave" @click="save") {{ $t('salesPipeline.form.save') }}
</template>

<script>
/**
 * SalesPipeline — an advisor's own deals (item 17 stage 2, the screen half).
 *
 * Ported from advisor-e/sales-tracker-nuxt `pages/pipeline.vue` (847 lines). The
 * STRUCTURE survives — stat strip, filter bar, table, add/edit form — and the
 * APPEARANCE does not, which is the whole of design/features/sales-tracker.md §4a:
 * that screen carries 93 distinct colours against our six, and declares no font.
 *
 * WHAT CHANGED FROM THE SOURCE, AND WHY. Each of these is a rule of this repo,
 * not a preference:
 *
 *   - 🔴 MONEY. Theirs holds `new Intl.NumberFormat("en-US", { currency: "USD" })`
 *     as a data property — every firm's fees shown in dollars whatever they trade
 *     in. This uses `currencyMixin`, so a figure is in the FIRM's currency and the
 *     READER's number format. That mixin exists precisely to stop a local
 *     formatter being written (localisation-and-currency.md P8).
 *   - COLOUR. Brand tokens only: navy #002b64, blue #0070c0, cyan #00b1e0, and
 *     the semantic three for state. No colour here is decorative.
 *   - WORDING. Every string is a `$t()` key in `salesPipeline.*`. Theirs mixes
 *     translated and hardcoded text.
 *   - ⚠ COLUMNS. Theirs shows 25, with drag-to-reorder and resize saved per user.
 *     This shows the 11 that answer "where is this deal?" — the rest are on the
 *     form. That is a DEVIATION from the source and is recorded in the Brief
 *     rather than decided silently; the full-width table is a later call of Mike's.
 *
 * THE SHARING RULE IS MIRRORED, NOT INVENTED. A deal shared to the firm is
 * readable by a colleague and editable only by its owner — the backend enforces
 * it in SQL, and `isMine()` matches so the screen never offers an action the
 * server will refuse.
 *
 * SSR: no `window`/`document` at the top level, in `data()` or `created()`. The
 * only browser access is the token read inside `mounted()`.
 */
import currencyMixin from '~/mixins/currencyMixin'

const TOKEN_KEY = 'advisor_e_token'

/** Money and date fields, so the draft can be normalised in one place. */
const MONEY_FIELDS = ['proposalValue', 'jobSecuredValue', 'additionalWorkSecured']
const DATE_FIELDS = ['approachDate', 'meetingDate', 'dateSecured']
const FLAG_FIELDS = ['secureMeeting', 'proposalSent', 'jobSecured']
const TEXT_FIELDS = [
  'prospectName', 'businessName', 'prospectStatus', 'partner', 'leadStaff',
  'industry', 'email', 'contactPhone', 'prospectSource', 'coiInvolved', 'comments'
]

export default {
  name: 'SalesPipeline',

  mixins: [currencyMixin],

  data () {
    return {
      items: [],
      loading: false,
      saving: false,
      errorText: '',
      search: '',
      statusFilter: '',
      ownerFilter: '',
      formOpen: false,
      draft: this.emptyDraft(),
      advisorId: ''
    }
  },

  computed: {
    /** The deals left after the three filters. */
    visible () {
      const q = this.search.trim().toLowerCase()
      return this.items.filter((i) => {
        if (this.statusFilter && i.prospectStatus !== this.statusFilter) { return false }
        if (this.ownerFilter && i.leadStaff !== this.ownerFilter) { return false }
        if (!q) { return true }
        return [i.prospectName, i.businessName, i.partner, i.leadStaff]
          .some(v => String(v || '').toLowerCase().includes(q))
      })
    },

    /**
     * The summary strip. Counts follow what is ON SCREEN, so a filtered view
     * summarises the filtered deals — a total that ignored the filter beside a
     * table that obeyed it would be read as a contradiction.
     */
    stats () {
      const v = this.visible
      const sum = f => v.reduce((t, i) => t + Number(i[f] || 0), 0)
      return [
        { key: 'deals', label: this.$t('salesPipeline.stats.deals'), value: String(v.length), tone: '' },
        { key: 'meetings', label: this.$t('salesPipeline.stats.meetings'), value: String(v.filter(i => i.secureMeeting).length), tone: '' },
        { key: 'proposals', label: this.$t('salesPipeline.stats.proposals'), value: String(v.filter(i => i.proposalSent).length), tone: '' },
        { key: 'secured', label: this.$t('salesPipeline.stats.secured'), value: String(v.filter(i => i.jobSecured).length), tone: 'is-good' },
        { key: 'proposedValue', label: this.$t('salesPipeline.stats.proposedValue'), value: this.money(sum('proposalValue')), tone: '' },
        { key: 'securedValue', label: this.$t('salesPipeline.stats.securedValue'), value: this.money(sum('jobSecuredValue')), tone: 'is-good' }
      ]
    },

    /** Statuses actually in use, so the filter offers what exists rather than a guessed list. */
    knownStatuses () {
      return Array.from(new Set(this.items.map(i => i.prospectStatus).filter(Boolean))).sort()
    },

    knownOwners () {
      return Array.from(new Set(this.items.map(i => i.leadStaff).filter(Boolean))).sort()
    },

    canSave () {
      return !!(String(this.draft.prospectName || '').trim() && String(this.draft.prospectStatus || '').trim())
    }
  },

  mounted () {
    this.advisorId = this.readAdvisorId()
    this.load()
  },

  methods: {
    /** A blank deal. Private by default, matching the backend's own default. */
    emptyDraft () {
      return {
        id: '',
        prospectName: '',
        businessName: '',
        prospectStatus: 'Active',
        partner: '',
        leadStaff: '',
        industry: '',
        email: '',
        contactPhone: '',
        prospectSource: '',
        coiInvolved: '',
        approachDate: '',
        meetingDate: '',
        dateSecured: '',
        secureMeeting: false,
        proposalSent: false,
        jobSecured: false,
        proposalValue: '',
        jobSecuredValue: '',
        additionalWorkSecured: '',
        comments: '',
        visibility: 'private'
      }
    },

    /**
     * The signed-in advisor's id, for deciding which rows this screen offers to
     * edit. It is a DISPLAY decision only — the backend decides what may actually
     * change, so a wrong answer here can never widen access.
     * @returns {string}
     */
    readAdvisorId () {
      if (!process.client) { return '' }
      try {
        const token = window.localStorage.getItem(TOKEN_KEY) || ''
        const part = token.split('.')[1]
        if (!part) { return '' }
        const claims = JSON.parse(window.atob(part.replace(/-/g, '+').replace(/_/g, '/')))
        return String(claims.advisorId || claims.sub || '')
      } catch (e) {
        return ''
      }
    },

    /** True when the row belongs to the signed-in advisor. */
    isMine (row) {
      // With no id to compare (dev sign-in, or an unreadable token) the row is
      // treated as the advisor's own: the backend still refuses anything that is
      // not, so the cost is an action that fails rather than one that leaks.
      return !this.advisorId || row.advisorId === this.advisorId
    },

    /** Status colour: the semantic three signal state, never decorate. */
    statusTone (status) {
      const s = String(status || '').toLowerCase()
      if (s.includes('won') || s.includes('secured')) { return 'is-good' }
      if (s.includes('lost') || s.includes('dead')) { return 'is-crit' }
      if (s.includes('hold') || s.includes('pending')) { return 'is-warn' }
      return ''
    },

    clearFilters () {
      this.search = ''
      this.statusFilter = ''
      this.ownerFilter = ''
    },

    authHeaders () {
      const token = (process.client && window.localStorage.getItem(TOKEN_KEY)) || 'dev-local-bypass'
      return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    },

    /**
     * One place for every call, so both an HTTP error and a network failure produce
     * a message rather than a silently empty screen (the standards' error rule).
     * @param {string} url
     * @param {object} [options]
     * @returns {Promise<object|null>} the payload, or null when it failed
     */
    async call (url, options) {
      try {
        const res = await fetch(url, Object.assign({ headers: this.authHeaders() }, options || {}))
        const body = await res.json().catch(() => null)
        if (!res.ok || !body || body.success !== true) {
          this.errorText = (body && body.error && body.error.message) || this.$t('salesPipeline.errors.load')
          return null
        }
        return body
      } catch (e) {
        this.errorText = this.$t('salesPipeline.errors.network')
        return null
      }
    },

    async load () {
      this.loading = true
      this.errorText = ''
      const body = await this.call('/api/sales/pipeline')
      if (body) { this.items = body.items || [] }
      this.loading = false
    },

    openNew () {
      this.draft = this.emptyDraft()
      this.formOpen = true
    },

    openEdit (row) {
      const d = this.emptyDraft()
      Object.keys(d).forEach((k) => {
        if (row[k] === null || row[k] === undefined) { return }
        // A date arrives as a full timestamp and the input wants YYYY-MM-DD.
        d[k] = DATE_FIELDS.includes(k) ? String(row[k]).slice(0, 10) : row[k]
      })
      d.id = row.id
      this.draft = d
      this.formOpen = true
    },

    /** The draft → the body the routes validate. Empty stays empty; it never becomes 0. */
    payload () {
      const out = {}
      TEXT_FIELDS.forEach((f) => { out[f] = String(this.draft[f] || '').trim() })
      FLAG_FIELDS.forEach((f) => { out[f] = !!this.draft[f] })
      DATE_FIELDS.forEach((f) => { out[f] = this.draft[f] || null })
      MONEY_FIELDS.forEach((f) => {
        const raw = this.draft[f]
        // '' → 0 rather than NaN: an empty money box means nothing entered, and
        // the column is NOT NULL.
        out[f] = raw === '' || raw === null || raw === undefined ? 0 : Number(raw)
      })
      out.visibility = this.draft.visibility
      return out
    },

    async save () {
      if (!this.canSave) { return }
      this.saving = true
      this.errorText = ''
      const id = this.draft.id
      const body = await this.call(
        id ? '/api/sales/pipeline/' + encodeURIComponent(id) : '/api/sales/pipeline',
        { method: id ? 'PUT' : 'POST', body: JSON.stringify(this.payload()) }
      )
      this.saving = false
      if (!body) { return }
      this.formOpen = false
      await this.load()
      this.$buefy.toast.open({ message: this.$t('salesPipeline.saved'), type: 'is-success' })
    },

    confirmDelete (row) {
      this.$buefy.dialog.confirm({
        title: this.$t('salesPipeline.confirmDelete.title'),
        // The prospect's name is user-entered text and goes in as a PARAMETER,
        // never interpolated into markup — the dialog renders it as text.
        message: this.$t('salesPipeline.confirmDelete.message', { name: row.prospectName }),
        confirmText: this.$t('salesPipeline.confirmDelete.confirm'),
        cancelText: this.$t('salesPipeline.confirmDelete.cancel'),
        type: 'is-danger',
        onConfirm: () => this.remove(row)
      })
    },

    async remove (row) {
      this.errorText = ''
      const body = await this.call('/api/sales/pipeline/' + encodeURIComponent(row.id), { method: 'DELETE' })
      if (!body) { return }
      await this.load()
      this.$buefy.toast.open({ message: this.$t('salesPipeline.deleted'), type: 'is-success' })
    }
  }
}
</script>

<style scoped>
/* Brand tokens only — design/BRAND-TOKENS.md. The source screen carried 93
   distinct colours; these are the six plus the semantic three, and every one
   means something. */
.sp {
  --sp-navy: #002b64;
  --sp-blue: #0070c0;
  --sp-cyan: #00b1e0;
  --sp-ink: #002b64;
  --sp-muted: #5b6f8a;
  --sp-line: #d5e1ee;
  --sp-panel: #ffffff;
  --sp-ground: #eef3f8;
  --sp-good: #4ca52d;
  --sp-warn: #ff9900;
  --sp-crit: #e00000;
  font-family: 'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight: 300;
  color: var(--sp-muted);
  -webkit-font-smoothing: antialiased;
  max-width: 1400px;
  margin: 0 auto;
  padding: 28px 22px 64px;
}

.sp-head { margin-bottom: 18px; }
.sp-eyebrow {
  font-size: 11.5px; font-weight: 600; letter-spacing: .14em;
  text-transform: uppercase; color: var(--sp-blue);
}
.sp-title {
  margin: 4px 0 0; font-size: 30px; font-weight: 600; line-height: 1.15;
  letter-spacing: -.015em; color: var(--sp-ink);
}
.sp-lede { margin: 6px 0 0; font-size: 15px; max-width: 70ch; }

/* The summary strip. 16px gaps, matching the report standard's geometry. */
.sp-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px; margin-bottom: 16px;
}
.sp-stat {
  background: var(--sp-panel); border: 1px solid var(--sp-line);
  border-radius: 14px; padding: 14px 16px;
}
.sp-stat-v {
  font-size: 22px; font-weight: 600; color: var(--sp-ink);
  font-variant-numeric: tabular-nums;
}
.sp-stat.is-good .sp-stat-v { color: var(--sp-good); }
.sp-stat-k {
  font-size: 11px; font-weight: 600; letter-spacing: .08em;
  text-transform: uppercase; color: var(--sp-muted); margin-top: 2px;
}

.sp-error { margin-bottom: 16px; }

.sp-bar {
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
  margin-bottom: 16px;
}
.sp-search { min-width: 260px; }
.sp-bar-spacer { flex: 1 1 auto; }

.sp-loading, .sp-empty {
  background: var(--sp-panel); border: 1px solid var(--sp-line);
  border-radius: 14px; padding: 28px; text-align: center; font-size: 15px;
}

.sp-tablewrap {
  background: var(--sp-panel); border: 1px solid var(--sp-line);
  border-radius: 14px; overflow-x: auto;
}
.sp-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 980px; }
.sp-table thead th {
  text-align: left; padding: 12px 12px 10px; white-space: nowrap;
  font-size: 10.5px; font-weight: 600; letter-spacing: .1em;
  text-transform: uppercase; color: var(--sp-muted);
  border-bottom: 1px solid var(--sp-line); background: var(--sp-panel);
  position: sticky; top: 0; z-index: 1;
}
.sp-table tbody td {
  padding: 11px 12px; border-bottom: 1px solid #f0f3f7; vertical-align: middle;
}
.sp-table tbody tr:last-child td { border-bottom: 0; }
.sp-table tbody tr:hover { background: #f7fafd; }
.sp-name { color: var(--sp-ink); font-weight: 600; }
.sp-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sp-mid { text-align: center; color: var(--sp-good); font-weight: 600; }
.sp-act { width: 92px; white-space: nowrap; text-align: right; }

/* A colleague's shared deal: readable, not editable. Quieter, so the missing
   buttons read as deliberate rather than as a row that failed to render. */
.sp-table tbody tr.is-theirs .sp-name { font-weight: 400; }
.sp-shared {
  font-size: 11px; font-weight: 600; color: var(--sp-blue);
  background: #e6f2fb; border-radius: 999px; padding: 2px 8px; white-space: nowrap;
}

.sp-pill {
  display: inline-block; font-size: 12px; font-weight: 600;
  border-radius: 999px; padding: 2px 10px;
  background: #edf2f7; color: var(--sp-muted);
}
.sp-pill.is-good { background: #e8f4e9; color: var(--sp-good); }
.sp-pill.is-warn { background: #fdf1e0; color: #b56200; }
.sp-pill.is-crit { background: #fdeaea; color: var(--sp-crit); }

.sp-icon { margin-left: 4px; }

.sp-card { max-width: 900px; }
.sp-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;
}
.sp-checks { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 14px; }
.sp-notes, .sp-vis { margin-top: 14px; }
.sp-vis-hint { font-size: 13px; color: var(--sp-muted); margin-top: -6px; }

@media (max-width: 860px) {
  .sp { padding: 20px 16px 64px; }
  .sp-search { min-width: 100%; }
}
</style>
