<template lang="pug">
.sc
  header.sc-head
    .sc-eyebrow {{ $t('salesCoi.eyebrow') }}
    h1.sc-title {{ $t('salesCoi.title') }}
    p.sc-lede {{ $t('salesCoi.lede') }}

  //- The five figures that answer "is this network working?" — partners, what
  //- they sent, what converted, and what it earned.
  .sc-stats(v-if="!loading || items.length")
    .sc-stat(v-for="s in stats" :key="s.key" :class="s.tone")
      .sc-stat-v {{ s.value }}
      .sc-stat-k {{ s.label }}

  b-notification.sc-error(
    v-if="errorText"
    type="is-danger is-light"
    :closable="true"
    @close="errorText = ''"
  ) {{ errorText }}

  .sc-bar
    b-input.sc-search(
      v-model="search"
      type="search"
      icon="magnify"
      size="is-small"
      :placeholder="$t('salesCoi.filters.search')"
      :aria-label="$t('salesCoi.filters.search')"
    )
    b-select(v-model="industryFilter" size="is-small" :aria-label="$t('salesCoi.columns.industry')")
      option(value="") {{ $t('salesCoi.filters.industry') }}
      option(v-for="i in knownIndustries" :key="i" :value="i") {{ i }}
    b-select(v-model="leadFilter" size="is-small" :aria-label="$t('salesCoi.columns.leadRelationshipPartner')")
      option(value="") {{ $t('salesCoi.filters.partner') }}
      option(v-for="l in knownLeads" :key="l" :value="l") {{ l }}
    b-button.sc-clear(
      v-if="search || industryFilter || leadFilter"
      size="is-small"
      @click="clearFilters"
    ) {{ $t('salesCoi.filters.clear') }}
    .sc-bar-spacer
    b-button.sc-add(type="is-primary" size="is-small" icon-left="plus" @click="openNew") {{ $t('salesCoi.add') }}

  .sc-loading(v-if="loading && !items.length") {{ $t('salesCoi.loading') }}

  .sc-empty(v-else-if="!visible.length")
    | {{ items.length ? $t('salesCoi.emptyFiltered') : $t('salesCoi.empty') }}

  .sc-tablewrap(v-else)
    table.sc-table
      thead
        tr
          th {{ $t('salesCoi.columns.coiName') }}
          th {{ $t('salesCoi.columns.entity') }}
          th {{ $t('salesCoi.columns.position') }}
          th {{ $t('salesCoi.columns.industry') }}
          th {{ $t('salesCoi.columns.leadRelationshipPartner') }}
          th.sc-num {{ $t('salesCoi.columns.referrals') }}
          th.sc-num {{ $t('salesCoi.columns.converted') }}
          th.sc-num {{ $t('salesCoi.columns.feeValue') }}
          th.sc-mid {{ $t('salesCoi.columns.shared') }}
          th.sc-act
      tbody
        tr(v-for="row in visible" :key="row.id" :class="{ 'is-theirs': !isMine(row) }")
          td.sc-name {{ row.coiName }}
          td {{ row.entity || '—' }}
          td {{ row.position || '—' }}
          td {{ row.industry || '—' }}
          td {{ row.leadRelationshipPartner || '—' }}
          td.sc-num {{ row.totalReferrals || '—' }}
          td.sc-num {{ row.totalConverted || '—' }}
          td.sc-num {{ row.feeValue ? money(row.feeValue) : '—' }}
          td.sc-mid
            span.sc-shared(v-if="row.visibility === 'firm'") {{ $t('salesCoi.visibility.firm') }}
          td.sc-act
            //- A partner shared to the firm is READABLE by a colleague and
            //- editable only by its owner — the backend enforces it; this matches
            //- so the screen never offers an action the server will refuse.
            template(v-if="isMine(row)")
              b-button.sc-icon(size="is-small" icon-left="pencil" :aria-label="$t('salesCoi.form.editTitle')" @click="openEdit(row)")
              b-button.sc-icon(size="is-small" icon-left="delete" :aria-label="$t('salesCoi.confirmDelete.confirm')" @click="confirmDelete(row)")

  b-modal(:active.sync="formOpen" has-modal-card trap-focus :can-cancel="['escape', 'outside']")
    .modal-card.sc-card
      header.modal-card-head
        p.modal-card-title {{ draft.id ? $t('salesCoi.form.editTitle') : $t('salesCoi.form.newTitle') }}
      section.modal-card-body
        //- 🔴 WHO CAN SEE THIS COMES FIRST. On the pipeline form this control was
        //- built last and fell below the fold, so an advisor never saw the choice
        //- that decides who reads their row (Mike's ruling 2026-09-22). Same
        //- decision, same place, on this form from the start.
        .sc-vis-top
          b-field.sc-vis(:label="$t('salesCoi.form.visibility')")
            b-select(v-model="draft.visibility" size="is-small" expanded)
              option(value="private") {{ $t('salesCoi.visibility.private') }}
              option(value="firm") {{ $t('salesCoi.visibility.firm') }}
          p.sc-vis-hint {{ draft.visibility === 'firm' ? $t('salesCoi.visibility.firmHint') : $t('salesCoi.visibility.privateHint') }}
        .sc-grid
          b-field(:label="$t('salesCoi.form.coiName')")
            b-input(v-model="draft.coiName" size="is-small" required)
          b-field(:label="$t('salesCoi.form.entity')")
            b-input(v-model="draft.entity" size="is-small")
          b-field(:label="$t('salesCoi.form.position')")
            b-input(v-model="draft.position" size="is-small")
          b-field(:label="$t('salesCoi.form.industry')")
            b-input(v-model="draft.industry" size="is-small")
          b-field(:label="$t('salesCoi.form.email')")
            b-input(v-model="draft.email" size="is-small" type="email")
          b-field(:label="$t('salesCoi.form.cell')")
            b-input(v-model="draft.cell" size="is-small")
          b-field(:label="$t('salesCoi.form.leadRelationshipPartner')")
            b-input(v-model="draft.leadRelationshipPartner" size="is-small")
          b-field(:label="$t('salesCoi.form.relationshipSupport')")
            b-input(v-model="draft.relationshipSupport" size="is-small")
          b-field(:label="$t('salesCoi.form.other')")
            b-input(v-model="draft.other" size="is-small")

        //- The advisor's own assessment. The source app set no range on these four
        //- and neither does our schema (config/db-migration-sales-tracker.sql), so
        //- they are plain numbers rather than a 1-5 scale nobody has ruled.
        h4.sc-sub {{ $t('salesCoi.form.assessment') }}
        .sc-grid
          b-field(:label="$t('salesCoi.form.couldWe')")
            b-input(v-model="draft.couldWe" size="is-small" type="number" step="1")
          b-field(:label="$t('salesCoi.form.howWouldWe')")
            b-input(v-model="draft.howWouldWe" size="is-small" type="number" step="1")
          b-field(:label="$t('salesCoi.form.willWe')")
            b-input(v-model="draft.willWe" size="is-small" type="number" step="1")
          b-field(:label="$t('salesCoi.form.testReview')")
            b-input(v-model="draft.testReview" size="is-small" type="number" step="1")

        h4.sc-sub {{ $t('salesCoi.form.produced') }}
        .sc-grid
          b-field(:label="$t('salesCoi.form.totalReferrals')")
            b-input(v-model="draft.totalReferrals" size="is-small" type="number" step="1" min="0")
          b-field(:label="$t('salesCoi.form.totalConverted')")
            b-input(v-model="draft.totalConverted" size="is-small" type="number" step="1" min="0")
          b-field(:label="$t('salesCoi.form.feeValue')")
            b-input(v-model="draft.feeValue" size="is-small" type="number" step="0.01" min="0")
      footer.modal-card-foot
        b-button(size="is-small" @click="formOpen = false") {{ $t('salesCoi.form.cancel') }}
        b-button(type="is-primary" size="is-small" :loading="saving" :disabled="!canSave" @click="save") {{ $t('salesCoi.form.save') }}
</template>

<script>
/**
 * SalesCoi — an advisor's own referral partners (item 17 stage 3, the screen half).
 *
 * The centres of influence who send an advisor work, and what each relationship
 * has actually produced. Ported from advisor-e/sales-tracker-nuxt `pages/coi.vue`
 * on the same terms as `SalesPipeline.vue`: the STRUCTURE survives — stat strip,
 * filter bar, table, add/edit form — and the APPEARANCE does not
 * (design/features/sales-tracker.md §4a).
 *
 * It is deliberately the pipeline screen again with different columns, because an
 * advisor moving between the two should not have to learn a second set of habits.
 * The four things that differ are the columns, the two assessment blocks on the
 * form, the filters (industry and relationship lead, not status and owner) and
 * the conversion-rate figure.
 *
 * 🔴 THE CONVERSION RATE IS CONVERSIONS OVER REFERRALS, never over partners —
 * the latter reads above 100% the moment one partner sends two jobs. It matches
 * `server/utils/salesMetrics.js`, which computes the same figure for the
 * insights screen; the two must not disagree, and the screen guards its
 * denominator exactly as the backend does.
 *
 * MONEY goes through `currencyMixin`, so fees are in the FIRM's currency and the
 * READER's number format — never a locally-built formatter
 * (localisation-and-currency.md P8).
 *
 * SSR: no `window`/`document` at the top level, in `data()` or `created()`. The
 * only browser access is the token read inside `mounted()`.
 */
import currencyMixin from '~/mixins/currencyMixin'

const TOKEN_KEY = 'advisor_e_token'

/** The fields, grouped so a draft can be normalised in one place. */
const MONEY_FIELDS = ['feeValue']
const COUNT_FIELDS = [
  'couldWe', 'howWouldWe', 'willWe', 'testReview', 'totalReferrals', 'totalConverted'
]
const TEXT_FIELDS = [
  'coiName', 'email', 'cell', 'entity', 'position', 'industry', 'other',
  'leadRelationshipPartner', 'relationshipSupport'
]

export default {
  name: 'SalesCoi',

  mixins: [currencyMixin],

  data () {
    return {
      items: [],
      loading: false,
      saving: false,
      errorText: '',
      search: '',
      industryFilter: '',
      leadFilter: '',
      formOpen: false,
      draft: this.emptyDraft(),
      advisorId: ''
    }
  },

  computed: {
    /** The partners left after the three filters. */
    visible () {
      const q = this.search.trim().toLowerCase()
      return this.items.filter((i) => {
        if (this.industryFilter && i.industry !== this.industryFilter) { return false }
        if (this.leadFilter && i.leadRelationshipPartner !== this.leadFilter) { return false }
        if (!q) { return true }
        return [i.coiName, i.entity, i.industry, i.position, i.leadRelationshipPartner]
          .some(v => String(v || '').toLowerCase().includes(q))
      })
    },

    /**
     * The summary strip. Counts follow what is ON SCREEN, so a filtered view
     * summarises the filtered partners — matching `SalesPipeline`, and for the
     * same reason: a total that ignored the filter beside a table that obeyed it
     * reads as a contradiction.
     */
    stats () {
      const v = this.visible
      const sum = f => v.reduce((t, i) => t + Number(i[f] || 0), 0)
      const referrals = sum('totalReferrals')
      const converted = sum('totalConverted')
      return [
        { key: 'partners', label: this.$t('salesCoi.stats.partners'), value: String(v.length), tone: '' },
        { key: 'referrals', label: this.$t('salesCoi.stats.referrals'), value: String(referrals), tone: '' },
        { key: 'converted', label: this.$t('salesCoi.stats.converted'), value: String(converted), tone: 'is-good' },
        { key: 'conversionRate', label: this.$t('salesCoi.stats.conversionRate'), value: this.rateText(converted, referrals), tone: '' },
        { key: 'feeValue', label: this.$t('salesCoi.stats.feeValue'), value: this.money(sum('feeValue')), tone: 'is-good' }
      ]
    },

    /** Industries actually in use, so the filter offers what exists. */
    knownIndustries () {
      return Array.from(new Set(this.items.map(i => i.industry).filter(Boolean))).sort()
    },

    knownLeads () {
      return Array.from(new Set(this.items.map(i => i.leadRelationshipPartner).filter(Boolean))).sort()
    },

    canSave () {
      return !!String(this.draft.coiName || '').trim()
    }
  },

  mounted () {
    this.advisorId = this.readAdvisorId()
    this.load()
  },

  methods: {
    /** A blank partner. Private by default, matching the backend's own default. */
    emptyDraft () {
      return {
        id: '',
        coiName: '',
        email: '',
        cell: '',
        entity: '',
        position: '',
        industry: '',
        other: '',
        leadRelationshipPartner: '',
        relationshipSupport: '',
        couldWe: '',
        howWouldWe: '',
        willWe: '',
        testReview: '',
        totalReferrals: '',
        totalConverted: '',
        feeValue: '',
        visibility: 'private'
      }
    },

    /**
     * A percentage, or the "nothing to report" dash when there is no denominator.
     * A confident 0% on an empty network tells an advisor their referrals are
     * failing when they have not asked for one yet.
     * @param {number} part
     * @param {number} whole
     * @returns {string}
     */
    rateText (part, whole) {
      if (!whole) { return '—' }
      return Math.round((part / whole) * 1000) / 10 + '%'
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

    clearFilters () {
      this.search = ''
      this.industryFilter = ''
      this.leadFilter = ''
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
          this.errorText = (body && body.error && body.error.message) || this.$t('salesCoi.errors.load')
          return null
        }
        return body
      } catch (e) {
        this.errorText = this.$t('salesCoi.errors.network')
        return null
      }
    },

    async load () {
      this.loading = true
      this.errorText = ''
      const body = await this.call('/api/sales/coi')
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
        d[k] = row[k]
      })
      d.id = row.id
      this.draft = d
      this.formOpen = true
    },

    /** The draft → the body the routes validate. Empty stays empty; it never becomes NaN. */
    payload () {
      const out = {}
      TEXT_FIELDS.forEach((f) => { out[f] = String(this.draft[f] || '').trim() })
      // '' → 0 rather than NaN: an empty box means nothing entered, and every one
      // of these columns is NOT NULL DEFAULT 0.
      COUNT_FIELDS.concat(MONEY_FIELDS).forEach((f) => {
        const raw = this.draft[f]
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
        id ? '/api/sales/coi/' + encodeURIComponent(id) : '/api/sales/coi',
        { method: id ? 'PUT' : 'POST', body: JSON.stringify(this.payload()) }
      )
      this.saving = false
      if (!body) { return }
      this.formOpen = false
      await this.load()
      this.$buefy.toast.open({ message: this.$t('salesCoi.saved'), type: 'is-success' })
    },

    confirmDelete (row) {
      this.$buefy.dialog.confirm({
        title: this.$t('salesCoi.confirmDelete.title'),
        // The partner's name is user-entered text and goes in as a PARAMETER,
        // never interpolated into markup — the dialog renders it as text.
        message: this.$t('salesCoi.confirmDelete.message', { name: row.coiName }),
        confirmText: this.$t('salesCoi.confirmDelete.confirm'),
        cancelText: this.$t('salesCoi.confirmDelete.cancel'),
        type: 'is-danger',
        onConfirm: () => this.remove(row)
      })
    },

    async remove (row) {
      this.errorText = ''
      const body = await this.call('/api/sales/coi/' + encodeURIComponent(row.id), { method: 'DELETE' })
      if (!body) { return }
      await this.load()
      this.$buefy.toast.open({ message: this.$t('salesCoi.deleted'), type: 'is-success' })
    }
  }
}
</script>

<style scoped>
/* Brand tokens only — design/BRAND-TOKENS.md. Identical to SalesPipeline's, so
   the two screens read as one tool rather than two products. */
.sc {
  --sc-navy: #002b64;
  --sc-blue: #0070c0;
  --sc-cyan: #00b1e0;
  --sc-ink: #002b64;
  --sc-muted: #5b6f8a;
  --sc-line: #d5e1ee;
  --sc-panel: #ffffff;
  --sc-good: #4ca52d;
  font-family: 'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-weight: 300;
  color: var(--sc-muted);
  -webkit-font-smoothing: antialiased;
  max-width: 1400px;
  margin: 0 auto;
  padding: 28px 22px 64px;
}

.sc-head { margin-bottom: 18px; }
.sc-eyebrow {
  font-size: 11.5px; font-weight: 600; letter-spacing: .14em;
  text-transform: uppercase; color: var(--sc-blue);
}
.sc-title {
  margin: 4px 0 0; font-size: 30px; font-weight: 600; line-height: 1.15;
  letter-spacing: -.015em; color: var(--sc-ink);
}
.sc-lede { margin: 6px 0 0; font-size: 15px; max-width: 70ch; }

.sc-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px; margin-bottom: 16px;
}
.sc-stat {
  background: var(--sc-panel); border: 1px solid var(--sc-line);
  border-radius: 14px; padding: 14px 16px;
}
.sc-stat-v {
  font-size: 22px; font-weight: 600; color: var(--sc-ink);
  font-variant-numeric: tabular-nums;
}
.sc-stat.is-good .sc-stat-v { color: var(--sc-good); }
.sc-stat-k {
  font-size: 11px; font-weight: 600; letter-spacing: .08em;
  text-transform: uppercase; color: var(--sc-muted); margin-top: 2px;
}

.sc-error { margin-bottom: 16px; }

.sc-bar {
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
  margin-bottom: 16px;
}
.sc-search { min-width: 260px; }
.sc-bar-spacer { flex: 1 1 auto; }

.sc-loading, .sc-empty {
  background: var(--sc-panel); border: 1px solid var(--sc-line);
  border-radius: 14px; padding: 28px; text-align: center; font-size: 15px;
}

.sc-tablewrap {
  background: var(--sc-panel); border: 1px solid var(--sc-line);
  border-radius: 14px; overflow-x: auto;
}
.sc-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 900px; }
.sc-table thead th {
  text-align: left; padding: 12px 12px 10px; white-space: nowrap;
  font-size: 10.5px; font-weight: 600; letter-spacing: .1em;
  text-transform: uppercase; color: var(--sc-muted);
  border-bottom: 1px solid var(--sc-line); background: var(--sc-panel);
  position: sticky; top: 0; z-index: 1;
}
.sc-table tbody td {
  padding: 11px 12px; border-bottom: 1px solid #f0f3f7; vertical-align: middle;
}
.sc-table tbody tr:last-child td { border-bottom: 0; }
.sc-table tbody tr:hover { background: #f7fafd; }
.sc-name { color: var(--sc-ink); font-weight: 600; }
.sc-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sc-mid { text-align: center; }
.sc-act { width: 92px; white-space: nowrap; text-align: right; }

/* A colleague's shared partner: readable, not editable. Quieter, so the missing
   buttons read as deliberate rather than as a row that failed to render. */
.sc-table tbody tr.is-theirs .sc-name { font-weight: 400; }
.sc-shared {
  font-size: 11px; font-weight: 600; color: var(--sc-blue);
  background: #e6f2fb; border-radius: 999px; padding: 2px 8px; white-space: nowrap;
}

.sc-icon { margin-left: 4px; }

.sc-card { max-width: 900px; }
.sc-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;
}
.sc-sub {
  margin: 20px 0 10px; font-size: 11px; font-weight: 600; letter-spacing: .1em;
  text-transform: uppercase; color: var(--sc-blue);
  border-top: 1px solid var(--sc-line); padding-top: 14px;
}

/* The privacy choice, at the top of the form and set apart from the fields below
   it. Same treatment as the pipeline form. */
.sc-vis-top {
  background: #ebf4fa;
  border: 1px solid var(--sc-line);
  border-left: 3px solid var(--sc-blue);
  border-radius: 0 10px 10px 0;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.sc-vis { margin-bottom: 4px; }
.sc-vis-hint { font-size: 13px; color: var(--sc-muted); margin: 0; }

@media (max-width: 860px) {
  .sc { padding: 20px 16px 64px; }
  .sc-search { min-width: 100%; }
}
</style>
