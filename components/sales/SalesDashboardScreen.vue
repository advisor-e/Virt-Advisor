<template lang="pug">
section.section.dashboard-page
  //- Page header
  header.dashboard-header.mb-5
    .level.is-mobile
      .level-left
        .level-item
          div
            b-tag(type="is-link is-light" rounded) {{ $t('salesTrackerDashboard.badge') }}
            h1.title.is-spaced.has-text-white.mt-2 {{ $t('salesTrackerDashboard.title') }}
            p.subtitle.has-text-white-ter {{ $t('salesTrackerDashboard.subtitle') }}
      .level-right
        .level-item
          b-button(@click="loadMetrics" :loading="loading" type="is-white" rounded)
            | {{ loading ? $t('salesTrackerDashboard.loadingWord') : $t('salesTrackerDashboard.refresh') }}

  b-notification(v-if="errorText" type="is-danger is-light" :closable="false") {{ errorText }}
  loading-spinner(v-if="loading && !metrics" :message="$t('salesTrackerDashboard.loading')")

  template(v-if="metrics")
    //- Stats strip
    .stats-strip.mb-4
      stat-card(
        :label="$t('salesTrackerDashboard.totalProspects')"
        :value="metrics.totalProspects"
        :badge="$t('salesTrackerDashboard.pipeline')"
        badge-color="blue"
        :footer="metrics.activeProspects + ' ' + $t('salesTrackerDashboard.active')"
      )
      stat-card(
        :label="$t('salesTrackerDashboard.approachMeeting')"
        :value="combinedMeetingRate + '%'"
        :badge="$t('salesTrackerDashboard.combined')"
        badge-color="cyan"
        :footer="combinedMeetings + '/' + combinedApproaches"
      )
      stat-card(
        :label="$t('salesTrackerDashboard.meetingProposal')"
        :value="combinedProposalRate + '%'"
        :badge="$t('salesTrackerDashboard.combined')"
        badge-color="blue"
        :footer="combinedProposals + '/' + combinedMeetings"
      )
      stat-card(
        :label="$t('salesTrackerDashboard.proposalSecured')"
        :value="combinedSecuredRate + '%'"
        :badge="$t('salesTrackerDashboard.combined')"
        badge-color="teal"
        :footer="combinedSecured + '/' + combinedProposals"
      )
      stat-card(
        :label="$t('salesTrackerDashboard.overallWinRate')"
        :value="combinedOverallRate + '%'"
        :badge="$t('salesTrackerDashboard.combined')"
        badge-color="green"
        :footer="combinedSecured + '/' + combinedApproaches"
      )
      stat-card(
        :label="$t('salesTrackerDashboard.pipelineValue')"
        :value="money(metrics.totalProposalValue)"
        :badge="$t('salesTrackerDashboard.proposals')"
        badge-color="cyan"
        :footer="$t('salesTrackerDashboard.outstandingProposals')"
      )
      stat-card(
        :label="$t('salesTrackerDashboard.workSecured')"
        :value="money(metrics.totalSecuredValue)"
        :badge="$t('salesTrackerDashboard.revenue')"
        badge-color="green"
        :footer="$t('salesTrackerDashboard.totalClosedValue')"
      )

    //- Campaign results
    .box.rates-section.campaign.mb-4
      h2.section-title
        span.title-icon.cyan
          svg(xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
            path(d="M22 12h-4l-3 9L9 3l-3 9H2")
        | {{ $t('salesTrackerDashboard.campaignResults') }}
      .funnel-grid
        .rate-card
          .rate-ring
            svg(viewBox="0 0 100 100")
              circle.ring-bg(cx="50" cy="50" r="42")
              circle.ring-progress.cyan(cx="50" cy="50" r="42" :stroke-dasharray="264" :stroke-dashoffset="264 - (264 * campaignMeetingRate / 100)")
            .rate-value {{ campaignMeetingRate }}%
          span.rate-label {{ $t('salesTrackerDashboard.approachMeeting') }}
          span.rate-count {{ metrics.campaignFunnel.meetings }}/{{ metrics.campaignFunnel.approaches }}
        .rate-card
          .rate-ring
            svg(viewBox="0 0 100 100")
              circle.ring-bg(cx="50" cy="50" r="42")
              circle.ring-progress.blue(cx="50" cy="50" r="42" :stroke-dasharray="264" :stroke-dashoffset="264 - (264 * campaignProposalRate / 100)")
            .rate-value {{ campaignProposalRate }}%
          span.rate-label {{ $t('salesTrackerDashboard.meetingProposal') }}
          span.rate-count {{ metrics.campaignFunnel.proposals }}/{{ metrics.campaignFunnel.meetings }}
        .rate-card
          .rate-ring
            svg(viewBox="0 0 100 100")
              circle.ring-bg(cx="50" cy="50" r="42")
              circle.ring-progress.teal(cx="50" cy="50" r="42" :stroke-dasharray="264" :stroke-dashoffset="264 - (264 * campaignSecuredRate / 100)")
            .rate-value {{ campaignSecuredRate }}%
          span.rate-label {{ $t('salesTrackerDashboard.proposalSecured') }}
          span.rate-count {{ metrics.campaignFunnel.secured }}/{{ metrics.campaignFunnel.proposals }}
        .rate-card
          .rate-ring
            svg(viewBox="0 0 100 100")
              circle.ring-bg(cx="50" cy="50" r="42")
              circle.ring-progress.green(cx="50" cy="50" r="42" :stroke-dasharray="264" :stroke-dashoffset="264 - (264 * campaignOverallRate / 100)")
            .rate-value {{ campaignOverallRate }}%
          span.rate-label {{ $t('salesTrackerDashboard.overallWinRate') }}
          span.rate-count {{ metrics.campaignFunnel.secured }}/{{ metrics.campaignFunnel.approaches }}
        .stat-card-inline.cyan
          .stat-icon
            svg(xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
              line(x1="12" y1="1" x2="12" y2="23")
              path(d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6")
          span.stat-label {{ $t('salesTrackerDashboard.avgFee') }}
          strong.stat-value {{ money(metrics.campaignFunnel.avgFee) }}
        .stat-card-inline.cyan
          .stat-icon
            svg(xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
              circle(cx="12" cy="12" r="10")
              polyline(points="12 6 12 12 16 14")
          span.stat-label {{ $t('salesTrackerDashboard.avgDays') }}
          strong.stat-value {{ Math.round(metrics.campaignFunnel.avgDaysElapsed * 10) / 10 }} {{ $t('salesTrackerDashboard.days') }}

    //- Total needs results
    .box.rates-section.total-needs.mb-4
      h2.section-title
        span.title-icon.orange
          svg(xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
            circle(cx="12" cy="12" r="10")
            path(d="M12 16v-4")
            path(d="M12 8h.01")
        | {{ $t('salesTrackerDashboard.totalNeedsResults') }}
      .funnel-grid
        .rate-card
          .rate-ring
            svg(viewBox="0 0 100 100")
              circle.ring-bg(cx="50" cy="50" r="42")
              circle.ring-progress.orange(cx="50" cy="50" r="42" :stroke-dasharray="264" :stroke-dashoffset="264 - (264 * totalNeedsMeetingRate / 100)")
            .rate-value {{ totalNeedsMeetingRate }}%
          span.rate-label {{ $t('salesTrackerDashboard.approachMeeting') }}
          span.rate-count {{ metrics.totalNeedsFunnel.meetings }}/{{ metrics.totalNeedsFunnel.approaches }}
        .rate-card
          .rate-ring
            svg(viewBox="0 0 100 100")
              circle.ring-bg(cx="50" cy="50" r="42")
              circle.ring-progress.amber(cx="50" cy="50" r="42" :stroke-dasharray="264" :stroke-dashoffset="264 - (264 * totalNeedsProposalRate / 100)")
            .rate-value {{ totalNeedsProposalRate }}%
          span.rate-label {{ $t('salesTrackerDashboard.meetingProposal') }}
          span.rate-count {{ metrics.totalNeedsFunnel.proposals }}/{{ metrics.totalNeedsFunnel.meetings }}
        .rate-card
          .rate-ring
            svg(viewBox="0 0 100 100")
              circle.ring-bg(cx="50" cy="50" r="42")
              circle.ring-progress.lime(cx="50" cy="50" r="42" :stroke-dasharray="264" :stroke-dashoffset="264 - (264 * totalNeedsSecuredRate / 100)")
            .rate-value {{ totalNeedsSecuredRate }}%
          span.rate-label {{ $t('salesTrackerDashboard.proposalSecured') }}
          span.rate-count {{ metrics.totalNeedsFunnel.secured }}/{{ metrics.totalNeedsFunnel.proposals }}
        .rate-card
          .rate-ring
            svg(viewBox="0 0 100 100")
              circle.ring-bg(cx="50" cy="50" r="42")
              circle.ring-progress.emerald(cx="50" cy="50" r="42" :stroke-dasharray="264" :stroke-dashoffset="264 - (264 * totalNeedsOverallRate / 100)")
            .rate-value {{ totalNeedsOverallRate }}%
          span.rate-label {{ $t('salesTrackerDashboard.overallWinRate') }}
          span.rate-count {{ metrics.totalNeedsFunnel.secured }}/{{ metrics.totalNeedsFunnel.approaches }}
        .stat-card-inline.orange
          .stat-icon
            svg(xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
              line(x1="12" y1="1" x2="12" y2="23")
              path(d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6")
          span.stat-label {{ $t('salesTrackerDashboard.avgFee') }}
          strong.stat-value {{ money(metrics.totalNeedsFunnel.avgFee) }}
        .stat-card-inline.orange
          .stat-icon
            svg(xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
              circle(cx="12" cy="12" r="10")
              polyline(points="12 6 12 12 16 14")
          span.stat-label {{ $t('salesTrackerDashboard.avgDays') }}
          strong.stat-value {{ Math.round(metrics.totalNeedsFunnel.avgDaysElapsed * 10) / 10 }} {{ $t('salesTrackerDashboard.days') }}

    //- COI performance
    .box.rates-section.coi-performance.mb-4
      h2.section-title
        span.title-icon.teal
          svg(xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2")
            path(d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2")
            circle(cx="9" cy="7" r="4")
            path(d="M22 21v-2a4 4 0 0 0-3-3.87")
            path(d="M16 3.13a4 4 0 0 1 0 7.75")
        | {{ $t('salesTrackerDashboard.coiPerformance') }}
      .coi-panel-grid
        .coi-chart-box
          h4 {{ $t('salesTrackerDashboard.statusProgression') }}
          .coi-chart-inner
            h-bar-chart(:bars="coiPerformanceBars" :format-value="whole" :max-width="200" :aria-label="$t('salesTrackerDashboard.statusProgression')")
        .coi-stats-table
          .coi-stat-row
            span.coi-stat-label {{ $t('salesTrackerDashboard.totalCOIs') }}
            strong.coi-stat-value {{ metrics.coiPerformance.total }}
          .coi-stat-row
            span.coi-stat-label {{ $t('salesTrackerDashboard.referrals') }}
            strong.coi-stat-value {{ metrics.coiPerformance.totalReferrals }}
          .coi-stat-row
            span.coi-stat-label {{ $t('salesTrackerDashboard.converted') }}
            strong.coi-stat-value {{ metrics.coiPerformance.totalConverted }}
          .coi-stat-row
            span.coi-stat-label {{ $t('salesTrackerDashboard.proposalFeeValue') }}
            strong.coi-stat-value {{ money(metrics.coiPerformance.totalProposalFeeValue) }}
          .coi-stat-row
            span.coi-stat-label {{ $t('salesTrackerDashboard.securedFeeValue') }}
            strong.coi-stat-value {{ money(metrics.coiPerformance.totalSecuredFeeValue) }}
        .coi-chart-box
          h4 {{ $t('salesTrackerDashboard.byIndustry') }}
          .coi-chart-inner
            h-bar-chart(:bars="coiIndustryBars" :format-value="whole" :max-width="200" :aria-label="$t('salesTrackerDashboard.byIndustry')")

    //- Charts row
    .columns.mb-4
      .column.is-3
        chart-card(:title="$t('salesTrackerDashboard.prospectStatus')" :subtitle="$t('salesTrackerDashboard.statusDistribution')" chart-type="pie")
          doughnut-chart(:slices="statusSlices" :aria-label="$t('salesTrackerDashboard.prospectStatus')")
      .column.is-3
        chart-card(:title="$t('salesTrackerDashboard.leadSources')" :subtitle="$t('salesTrackerDashboard.whereProspectsCome')" chart-type="doughnut")
          doughnut-chart(:slices="sourceSlices" :aria-label="$t('salesTrackerDashboard.leadSources')")
      .column.is-6
        chart-card(:title="$t('salesTrackerDashboard.monthlyTrend')" :subtitle="$t('salesTrackerDashboard.revenueOverTime')" chart-type="line")
          line-chart(:points="monthlyPoints" :format-value="kMoney" colour="#00b1e0" :aria-label="$t('salesTrackerDashboard.monthlyTrend')")

    //- Staff bar chart
    .columns
      .column
        chart-card(:title="$t('salesTrackerDashboard.workSecuredByTeam')" :subtitle="$t('salesTrackerDashboard.individualPerformance')" chart-type="bar-h")
          h-bar-chart(:bars="staffBars" :format-value="kMoney" :aria-label="$t('salesTrackerDashboard.workSecuredByTeam')")
</template>

<script>
/**
 * SalesDashboardScreen — the Sales Dashboard, as Mike built it (item 17 stage 3).
 *
 * 🔴 THIS IS A FAITHFUL COPY, NOT A REDESIGN. Ported from his own
 * `pages/dashboard.vue` in advisor-e/sales-tracker-nuxt: the same sections in the
 * same order, the same seven stat cards, the same two rings-and-averages blocks,
 * the same COI panel, the same charts row, his CSS unchanged and his wording
 * verbatim in `locales/en.json` under `salesTrackerDashboard`.
 *
 * 🔴 THE TWO FUNNELS ARE THE POINT. Campaign and Total Needs are split on
 * `salesStyle` and reported separately, so the two ways of selling can be
 * compared. An earlier version of this screen collapsed them into one and
 * invented a chart of its own; that was wrong and is gone.
 *
 * ⚠ THE ONLY DELIBERATE DIFFERENCE, AND WHY. His seven charts are drawn with
 * Chart.js + vue-chartjs. This app has no chart library and cannot add one — the
 * Stack Constitution locks the dependency set to Node 14.15 and `engine-strict`
 * enforces it, so the master team would reject the branch. The charts are
 * therefore drawn with this repo's own SVG components (`components/base/`),
 * matched to his intent as closely as they allow:
 *
 *   - his pie and doughnut  → `DoughnutChart`, carrying HIS colours
 *   - his line              → `LineChart`, in his cyan #00b1e0
 *   - his horizontal bar    → `HBarChart`
 *   - his two VERTICAL bars → `HBarChart` laid horizontally; we have no
 *     vertical bar component, and this is the nearest honest equivalent
 *
 * Everything that is not a chart — the rings, the cards, the gradients, the COI
 * table, the header — is his markup and his CSS, copied.
 *
 * MONEY goes through `currencyMixin` rather than his hardcoded
 * `Intl.NumberFormat('en-NZ', { currency: 'NZD' })`, so a firm sees its own
 * currency (localisation-and-currency.md P8). His dashboard would show every
 * firm on earth New Zealand dollars.
 *
 * SSR: no `window`/`document` at the top level, in `data()` or `created()`.
 */
import currencyMixin from '~/mixins/currencyMixin'
import StatCard from '~/components/sales/StatCard.vue'
import ChartCard from '~/components/sales/ChartCard.vue'
import LoadingSpinner from '~/components/sales/LoadingSpinner.vue'
import DoughnutChart from '~/components/base/DoughnutChart.vue'
import LineChart from '~/components/base/LineChart.vue'
import HBarChart from '~/components/base/HBarChart.vue'

const TOKEN_KEY = 'advisor_e_token'

/** Mike's status colours, copied from his `statusColors`. */
const STATUS_COLOURS = {
  Active: '#22c55e',
  'Await Research': '#f59e0b',
  Completed: '#3b82f6',
  Dead: '#ef4444',
  'On Hold': '#0891b2'
}

/** Mike's source palette, copied from his `sourceColors`. */
const SOURCE_COLOURS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
]

/** Mike's COI progression colours, copied from his `coiPerformanceBarData`. */
const COI_COLOURS = ['#f97316', '#eab308', '#22c55e', '#06b6d4']

/** Mike's warm palette, used by his COI industry chart. */
const WARM = ['#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e']

export default {
  name: 'SalesDashboardScreen',

  components: { StatCard, ChartCard, LoadingSpinner, DoughnutChart, LineChart, HBarChart },

  mixins: [currencyMixin],

  data () {
    return {
      metrics: null,
      loading: false,
      errorText: ''
    }
  },

  computed: {
    // ---- Mike's combined rates, ported exactly (including his rounding) ----

    combinedApproaches () {
      return (this.f('campaignFunnel', 'approaches')) + (this.f('totalNeedsFunnel', 'approaches'))
    },
    combinedMeetings () {
      return (this.f('campaignFunnel', 'meetings')) + (this.f('totalNeedsFunnel', 'meetings'))
    },
    combinedProposals () {
      return (this.f('campaignFunnel', 'proposals')) + (this.f('totalNeedsFunnel', 'proposals'))
    },
    combinedSecured () {
      return (this.f('campaignFunnel', 'secured')) + (this.f('totalNeedsFunnel', 'secured'))
    },
    combinedMeetingRate () {
      return this.pc(this.combinedMeetings, this.combinedApproaches)
    },
    combinedProposalRate () {
      return this.pc(this.combinedProposals, this.combinedMeetings)
    },
    combinedSecuredRate () {
      return this.pc(this.combinedSecured, this.combinedProposals)
    },
    combinedOverallRate () {
      return this.pc(this.combinedSecured, this.combinedApproaches)
    },

    campaignMeetingRate () {
      return this.pc(this.f('campaignFunnel', 'meetings'), this.f('campaignFunnel', 'approaches'))
    },
    campaignProposalRate () {
      return this.pc(this.f('campaignFunnel', 'proposals'), this.f('campaignFunnel', 'meetings'))
    },
    campaignSecuredRate () {
      return this.pc(this.f('campaignFunnel', 'secured'), this.f('campaignFunnel', 'proposals'))
    },
    campaignOverallRate () {
      return this.pc(this.f('campaignFunnel', 'secured'), this.f('campaignFunnel', 'approaches'))
    },

    totalNeedsMeetingRate () {
      return this.pc(this.f('totalNeedsFunnel', 'meetings'), this.f('totalNeedsFunnel', 'approaches'))
    },
    totalNeedsProposalRate () {
      return this.pc(this.f('totalNeedsFunnel', 'proposals'), this.f('totalNeedsFunnel', 'meetings'))
    },
    totalNeedsSecuredRate () {
      return this.pc(this.f('totalNeedsFunnel', 'secured'), this.f('totalNeedsFunnel', 'proposals'))
    },
    totalNeedsOverallRate () {
      return this.pc(this.f('totalNeedsFunnel', 'secured'), this.f('totalNeedsFunnel', 'approaches'))
    },

    // ---- His chart datasets, in our components' shapes ----

    /** His status pie. Labels carry the count, as his do. */
    statusSlices () {
      return (this.metrics.statusBreakdown || [])
        .filter(s => Number(s.count) > 0)
        .map(s => ({
          label: s.status + ' (' + s.count + ')',
          value: Number(s.count),
          colour: STATUS_COLOURS[s.status] || '#64748b'
        }))
    },

    /** His lead-sources doughnut. */
    sourceSlices () {
      return (this.metrics.sourceBreakdown || [])
        .filter(s => Number(s.count) > 0)
        .map((s, i) => ({
          label: s.source + ' (' + s.count + ')',
          value: Number(s.count),
          colour: SOURCE_COLOURS[i % SOURCE_COLOURS.length]
        }))
    },

    /** His monthly secured-value trend. */
    monthlyPoints () {
      return (this.metrics.monthlySecuredTrend || [])
        .map(m => ({ label: m.month, value: Number(m.value) || 0 }))
    },

    /** His work-secured-by-team bar. */
    staffBars () {
      return (this.metrics.staffSecuredBreakdown || [])
        .filter(s => Number(s.value) > 0)
        .map(s => ({ label: s.leadStaff, value: Number(s.value), colour: '#00b1e0' }))
    },

    /** His COI status-progression bar, with his four labels and colours. */
    coiPerformanceBars () {
      const p = this.metrics.coiPerformance || {}
      return [
        { label: 'Could We', value: Number(p.couldWe) || 0, colour: COI_COLOURS[0] },
        { label: 'How Would We', value: Number(p.howWouldWe) || 0, colour: COI_COLOURS[1] },
        { label: 'Will We', value: Number(p.willWe) || 0, colour: COI_COLOURS[2] },
        { label: 'Test/Review', value: Number(p.testReview) || 0, colour: COI_COLOURS[3] }
      ]
    },

    /** His COI-by-industry bar. */
    coiIndustryBars () {
      return (this.metrics.coiIndustryBreakdown || [])
        .filter(r => Number(r.relationships) > 0)
        .map((r, i) => ({
          label: r.industry,
          value: Number(r.relationships),
          colour: WARM[i % WARM.length]
        }))
    }
  },

  mounted () {
    this.loadMetrics()
  },

  methods: {
    /**
     * One funnel's field, 0 when the payload has not arrived.
     * @param {string} funnel - 'campaignFunnel' or 'totalNeedsFunnel'
     * @param {string} field
     * @returns {number}
     */
    f (funnel, field) {
      const block = this.metrics && this.metrics[funnel]
      return (block && Number(block[field])) || 0
    },

    /**
     * His percentage: a whole number, and 0 when there is nothing to divide by.
     * Kept as he wrote it because the rings are drawn FROM this number and a ring
     * needs something to draw.
     * @param {number} part
     * @param {number} whole
     * @returns {number}
     */
    pc (part, whole) {
      return whole ? Math.round((part / whole) * 100) : 0
    },

    /** A count, for a chart's value labels. */
    whole (v) {
      return String(Math.round(Number(v) || 0))
    },

    /**
     * Money shortened for a chart label, where the full figure will not fit —
     * matching his axis callbacks, which print `$12k`.
     * @param {number} v
     * @returns {string}
     */
    kMoney (v) {
      const n = Number(v) || 0
      return Math.abs(n) >= 1000 ? this.money(Math.round(n / 1000)) + 'k' : this.money(n)
    },

    authHeaders () {
      const token = (process.client && window.localStorage.getItem(TOKEN_KEY)) || 'dev-local-bypass'
      return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    },

    /**
     * Load the figures. Both an HTTP error and a network failure produce a
     * message rather than a silently empty screen (the standards' error rule).
     */
    async loadMetrics () {
      this.loading = true
      this.errorText = ''
      try {
        const res = await fetch('/api/sales/metrics', { headers: this.authHeaders() })
        const body = await res.json().catch(() => null)
        if (!res.ok || !body || body.success !== true) {
          this.errorText = (body && body.error && body.error.message) ||
            this.$t('salesTrackerDashboard.errorLoad')
        } else {
          this.metrics = body.dashboard || null
        }
      } catch (e) {
        this.errorText = this.$t('salesTrackerDashboard.errorNetwork')
      }
      this.loading = false
    }
  }
}
</script>

<style scoped>
/* ------------------------------------------------------------------------- *
 * MIKE'S CSS, COPIED FROM HIS OWN dashboard.vue. Not re-themed, not tidied.
 * The colours here are his — the cyan gradient header, the coloured section
 * borders, the eight ring colours — and they are deliberately not this repo's
 * brand tokens, because this screen is a faithful copy of the one he built.
 * ------------------------------------------------------------------------- */
.dashboard-page {
  padding: 0;
  min-height: 100vh;
  background: linear-gradient(180deg, #e6f9ff 0%, #f0fcff 100%);
}

.stats-strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.75rem;
}

.dashboard-header {
  background:
    radial-gradient(ellipse at 20% 50%, rgba(255, 255, 255, 0.12) 0%, transparent 50%),
    linear-gradient(135deg, #00c4e8 0%, #00b1e0 40%, #007a99 100%);
  border-radius: 20px;
  padding: 2.5rem 2rem;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 177, 224, 0.3);
}

.dashboard-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 60%;
  height: 200%;
  background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%);
  transform: rotate(25deg);
  pointer-events: none;
}

/* Rates Section */
.rates-section {
  border-radius: 20px;
}

.section-title {
  margin: 0 0 1.25rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-icon.cyan {
  background: linear-gradient(135deg, #cffafe, #a5f3fc);
  color: #0891b2;
}

.title-icon.orange {
  background: linear-gradient(135deg, #ffedd5, #fed7aa);
  color: #ea580c;
}

.rates-section.campaign {
  border-left: 4px solid #00b1e0;
}

.rates-section.total-needs {
  border-left: 4px solid #f97316;
}

.rates-section.coi-performance {
  border-left: 4px solid #14b8a6;
}

.title-icon.teal {
  background: linear-gradient(135deg, #ccfbf1, #99f6e4);
  color: #0d9488;
}

.coi-panel-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1.5rem;
  align-items: stretch;
}

.coi-stats-table {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
  border-radius: 14px;
  min-width: 160px;
}

.coi-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(13, 148, 136, 0.1);
}

.coi-stat-row:last-child {
  border-bottom: none;
}

.coi-stat-label {
  font-size: 0.85rem;
  color: #0d9488;
  font-weight: 500;
}

.coi-stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.coi-chart-box {
  background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
  border-radius: 14px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
}

.coi-chart-box h4 {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #0d9488;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.coi-chart-inner {
  flex: 1;
  min-height: 100px;
}

.stat-card-inline.teal {
  background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
}

.stat-card-inline.teal .stat-icon {
  background: linear-gradient(135deg, #14b8a6, #0d9488);
  color: white;
}

.funnel-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.stat-card-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 14px;
  background: #f8fafc;
  text-align: center;
}

.stat-card-inline.cyan {
  background: linear-gradient(135deg, #ecfeff, #cffafe);
}

.stat-card-inline.orange {
  background: linear-gradient(135deg, #fff7ed, #ffedd5);
}

.stat-card-inline .stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card-inline.cyan .stat-icon {
  background: linear-gradient(135deg, #00b1e0, #38bdf8);
  color: white;
}

.stat-card-inline.orange .stat-icon {
  background: linear-gradient(135deg, #f97316, #fb923c);
  color: white;
}

.stat-card-inline .stat-label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.stat-card-inline .stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.rate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.rate-ring {
  position: relative;
  width: 100px;
  height: 100px;
}

.rate-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: #f1f5f9;
  stroke-width: 8;
}

.ring-progress {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease;
}

.ring-progress.cyan { stroke: #00b1e0; }
.ring-progress.blue { stroke: #3b82f6; }
.ring-progress.green { stroke: #22c55e; }
.ring-progress.orange { stroke: #f97316; }
.ring-progress.teal { stroke: #14b8a6; }
.ring-progress.amber { stroke: #f59e0b; }
.ring-progress.lime { stroke: #84cc16; }
.ring-progress.emerald { stroke: #10b981; }

.rate-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.rate-label {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
  text-align: center;
}

.rate-count {
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 500;
}

/* Charts */
.chart-card {
  background: white;
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  min-width: 0;
}

@media (max-width: 1215px) {
  .stats-strip {
    grid-template-columns: repeat(4, 1fr);
  }

  .funnel-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .coi-panel-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-strip {
    grid-template-columns: repeat(2, 1fr);
  }

  .funnel-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
