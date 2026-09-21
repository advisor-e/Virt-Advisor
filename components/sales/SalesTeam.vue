<template lang="pug">
.st
  header.st-head
    .st-eyebrow {{ $t('salesTeam.eyebrow') }}
    h1.st-title {{ $t('salesTeam.title') }}
    p.st-lede {{ $t('salesTeam.lede') }}

  //- The four figures a manager checks first: how many people are selling, how
  //- many prospects they hold between them, what has gone out, and what came in.
  .st-stats(v-if="!loading || rows.length")
    .st-stat(v-for="s in stats" :key="s.key")
      .st-stat-v {{ s.value }}
      .st-stat-k {{ s.label }}

  b-notification.st-error(
    v-if="errorText"
    type="is-danger is-light"
    :closable="true"
    @close="errorText = ''"
  ) {{ errorText }}

  //- The store caps at 2000 rows. A roll-up quietly missing deals reports wrong
  //- totals to the person judging their team by them, so it is said out loud.
  b-notification.st-truncated(
    v-if="truncated"
    type="is-warning is-light"
    :closable="false"
  ) {{ $t('salesTeam.truncated') }}

  loading-spinner(v-if="loading && !rows.length" :message="$t('salesTeam.loading')")

  .st-empty(v-else-if="!rows.length")
    p.st-empty-t {{ $t('salesTeam.empty.title') }}
    p.st-empty-b {{ $t('salesTeam.empty.body') }}

  .st-tablewrap(v-else)
    table.st-table
      thead
        tr
          th.st-th-name {{ $t('salesTeam.columns.member') }}
          th.st-num {{ $t('salesTeam.columns.prospects') }}
          th.st-num {{ $t('salesTeam.columns.approaches') }}
          th.st-num {{ $t('salesTeam.columns.meetings') }}
          th.st-num {{ $t('salesTeam.columns.proposals') }}
          th.st-num {{ $t('salesTeam.columns.proposalValue') }}
          th.st-num {{ $t('salesTeam.columns.secured') }}
          th.st-num {{ $t('salesTeam.columns.securedValue') }}
          th.st-num {{ $t('salesTeam.columns.approachRate') }}
          th.st-num {{ $t('salesTeam.columns.avgProposal') }}
          th.st-num {{ $t('salesTeam.columns.securedRate') }}
      tbody
        tr(v-for="row in rows" :key="row.leadStaff" :class="{ 'st-unassigned': row.leadStaff === unassigned }")
          td.st-name
            span {{ row.leadStaff === unassigned ? $t('salesTeam.unassigned') : row.leadStaff }}
            //- A deal with nobody named against it is a gap in the record, not a
            //- colleague. Saying which it is stops a manager reading it as a person.
            span.st-note(v-if="row.leadStaff === unassigned") {{ $t('salesTeam.unassignedNote') }}
          td.st-num {{ row.prospects }}
          //- Both halves of the approach rate, so the percentage beside them can
          //- be read rather than taken on trust: approached out of approachable.
          td.st-num {{ row.approachesMade }} / {{ row.approachable }}
          td.st-num {{ row.secureMeetings }}
          td.st-num {{ row.proposalsSent }}
          td.st-num {{ money(row.totalProposalValue) }}
          td.st-num {{ row.engagementsSecured }}
          td.st-num {{ money(row.totalSecuredValue) }}
          td.st-num {{ percent(row.approachRate) }}
          td.st-num {{ row.avgProposalValue === null ? dash : money(row.avgProposalValue) }}
          td.st-num {{ percent(row.securedRate) }}
      tfoot
        tr
          td.st-name {{ $t('salesTeam.columns.firmTotal') }}
          td.st-num {{ totals.prospects }}
          td.st-num {{ totals.approachesMade }} / {{ totals.approachable }}
          td.st-num {{ totals.secureMeetings }}
          td.st-num {{ totals.proposalsSent }}
          td.st-num {{ money(totals.totalProposalValue) }}
          td.st-num {{ totals.engagementsSecured }}
          td.st-num {{ money(totals.totalSecuredValue) }}
          td.st-num {{ percent(totals.approachRate) }}
          td.st-num —
          td.st-num {{ percent(totals.securedRate) }}

  p.st-foot {{ $t('salesTeam.footnote') }}
</template>

<script>
import currencyMixin from '~/mixins/currencyMixin'
import LoadingSpinner from '~/components/sales/LoadingSpinner.vue'

/** The same key the other Sales Tracker screens read their token from. */
const TOKEN_KEY = 'advisor_e_token'

/**
 * The Team roll-up — every advisor's pipeline in the firm, by the staff member
 * leading each deal (item 17 stage 4).
 *
 * 🔴 THIS SCREEN SHOWS PRIVATE DEALS. Mike's ruling, 2026-09-22: a firm manager
 * sees every deal in their firm. The backend enforces that — `/api/sales/team`
 * sits behind `requireManagerRole` and reads the whole firm — and this component
 * only draws what it is given. It holds no access logic of its own and must
 * never acquire any.
 *
 * ⚠ A RATE OF `null` IS "NOTHING TO REPORT", NOT ZERO. A staff member who has
 * sent no proposals has no close rate, and showing them a confident 0% invites a
 * manager to judge an absence of data as a failure. `percent()` renders an em
 * dash for null, and the backend is what decides which it is.
 */
export default {
  name: 'SalesTeam',

  components: { LoadingSpinner },

  mixins: [currencyMixin],

  props: {
    /**
     * The hub passes its own token down; the standalone page at /sales-team does
     * not, and the component falls back to the one the master app left in
     * localStorage. Optional so the SAME component serves both doorways rather
     * than there being two of it.
     */
    apiToken: { type: String, default: '' }
  },

  data () {
    return {
      rows: [],
      /**
       * 🔴 DECLARED WITH EVERY FIELD, NOT `{}`. Vue 2 can only make properties
       * reactive that exist when the component is created — a field added later
       * by `this.totals = payload` renders as blank in the footer and never
       * updates. Found on screen 2026-09-22: `approachesMade / approachable`
       * printed "7" instead of "7 / 8", while the identical markup in the body
       * rows was correct because `rows` is an array replaced wholesale.
       */
      totals: {
        teamMembers: 0,
        prospects: 0,
        approachable: 0,
        approachesMade: 0,
        secureMeetings: 0,
        proposalsSent: 0,
        totalProposalValue: 0,
        engagementsSecured: 0,
        totalSecuredValue: 0,
        approachRate: null,
        securedRate: null
      },
      truncated: false,
      loading: false,
      errorText: '',
      /** Matches salesMetrics.UNASSIGNED — the bucket for deals with no lead staff. */
      unassigned: 'Unassigned',
      dash: '—'
    }
  },

  computed: {
    /** The four headline figures, in the order a manager reads them. */
    stats () {
      const t = this.totals || {}
      return [
        { key: 'members', value: t.teamMembers || 0, label: this.$t('salesTeam.stats.members') },
        { key: 'prospects', value: t.prospects || 0, label: this.$t('salesTeam.stats.prospects') },
        { key: 'proposals', value: this.money(t.totalProposalValue || 0), label: this.$t('salesTeam.stats.proposalValue') },
        { key: 'secured', value: this.money(t.totalSecuredValue || 0), label: this.$t('salesTeam.stats.securedValue') }
      ]
    }
  },

  mounted () {
    this.load()
  },

  methods: {
    /**
     * Fetch the roll-up. Both the loading and the error state are handled: a
     * failed call must never leave a blank screen with no explanation.
     * @returns {Promise<void>}
     */
    authHeaders () {
      const token = this.apiToken ||
        (process.client && window.localStorage.getItem(TOKEN_KEY)) ||
        'dev-local-bypass'
      return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    },

    async load () {
      this.loading = true
      this.errorText = ''
      try {
        const res = await fetch('/api/sales/team', { headers: this.authHeaders() })
        const body = await res.json().catch(() => null)
        if (!res.ok || !body || body.success !== true) {
          // 403 is not a fault — it is an advisor opening a manager's screen, and
          // it needs a different sentence from "something went wrong".
          this.errorText = res.status === 403
            ? this.$t('salesTeam.errors.forbidden')
            : this.$t('salesTeam.errors.load')
          return
        }
        this.rows = Array.isArray(body.rows) ? body.rows : []
        this.totals = body.totals || {}
        this.truncated = !!body.truncated
      } catch (e) {
        this.errorText = this.$t('salesTeam.errors.load')
      } finally {
        this.loading = false
      }
    },

    /**
     * A percentage, or an em dash when there was nothing to divide by.
     * @param {number|null} v
     * @returns {string}
     */
    percent (v) {
      return v === null || v === undefined ? this.dash : `${v}%`
    }
    // `money()` is currencyMixin's — whole units in the FIRM's currency, so a
    // roll-up compares magnitudes and no screen hardcodes a symbol.
  }
}
</script>

<style scoped>
.st {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.75rem 1.25rem 3rem;
}

.st-head { margin-bottom: 1.5rem; }

.st-eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0070c0;
}

.st-title {
  font-size: 1.85rem;
  font-weight: 700;
  color: #002b64;
  margin: 0.25rem 0 0.35rem;
  line-height: 1.15;
}

.st-lede {
  color: #5b6f8a;
  max-width: 68ch;
  margin: 0;
}

.st-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.75rem;
  margin: 1.25rem 0;
}

.st-stat {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-top: 3px solid #0070c0;
  border-radius: 12px;
  padding: 0.85rem 1rem;
}

.st-stat-v {
  font-size: 1.5rem;
  font-weight: 700;
  color: #002b64;
  line-height: 1.2;
}

.st-stat-k {
  font-size: 0.78rem;
  color: #5b6f8a;
  margin-top: 0.15rem;
}

.st-error, .st-truncated { margin-bottom: 1rem; }

.st-empty {
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 12px;
  padding: 2rem 1.5rem;
  text-align: center;
}

.st-empty-t { font-weight: 700; color: #002b64; margin-bottom: 0.35rem; }
.st-empty-b { color: #5b6f8a; margin: 0; }

.st-tablewrap {
  overflow-x: auto;
  background: #fff;
  border: 1px solid #d5e1ee;
  border-radius: 12px;
}

.st-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  min-width: 940px;
}

.st-table th {
  text-align: left;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5b6f8a;
  padding: 0.75rem 0.6rem;
  border-bottom: 1px solid #d5e1ee;
  white-space: nowrap;
}

.st-table td {
  padding: 0.6rem;
  border-bottom: 1px solid #eef3f8;
  vertical-align: top;
}

.st-table tbody tr:hover { background: #f7fbff; }

.st-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.st-th-name, .st-name { text-align: left; }
.st-name { font-weight: 600; color: #002b64; }

.st-note {
  display: block;
  font-weight: 400;
  font-size: 0.72rem;
  color: #5b6f8a;
}

.st-unassigned { background: #fcfcfd; }

.st-table tfoot td {
  border-top: 2px solid #d5e1ee;
  border-bottom: 0;
  font-weight: 700;
  color: #002b64;
  background: #f7fbff;
}

.st-foot {
  margin-top: 0.85rem;
  font-size: 0.78rem;
  color: #5b6f8a;
}

@media (max-width: 720px) {
  .st { padding: 1.25rem 0.85rem 2.5rem; }
  .st-title { font-size: 1.5rem; }
}
</style>
