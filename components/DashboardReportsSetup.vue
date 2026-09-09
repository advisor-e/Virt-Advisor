<template lang="pug">
.drs-layout
  aside.drs-card
    .drs-group
      .drs-glabel
        span.drs-dot
        h2.drs-h2 {{ $t('report.dashboardReports.setup.clientAndPeriod') }}
      b-field(:label="$t('report.dashboardReports.setup.client')")
        b-input(:value="clientName || $t('report.dashboardReports.setup.noClient')" disabled)
      p.drs-hint {{ $t('report.dashboardReports.setup.clientHint') }}
      b-field(:label="$t('report.dashboardReports.setup.financialYear')")
        b-input(:value="setup.financialYear" maxlength="200" :has-counter="false" @input="v => change('financialYear', v)")
      p.drs-hint {{ $t('report.dashboardReports.setup.financialYearHint') }}
      b-field(:label="$t('report.dashboardReports.setup.dateIssued')")
        b-input(type="date" :value="setup.dateIssued" @input="v => change('dateIssued', v)")
    .drs-group
      .drs-glabel
        span.drs-dot
        h2.drs-h2 {{ $t('report.dashboardReports.setup.whoPrepared') }}
      b-field(:label="$t('report.dashboardReports.setup.preparedBy')")
        b-input(:value="setup.preparedBy" maxlength="200" :has-counter="false" @input="v => change('preparedBy', v)")
      p.drs-hint {{ $t('report.dashboardReports.setup.preparedHint') }}
  .drs-results
    .drs-card
      .drs-group
        .drs-glabel
          span.drs-dot
          h2.drs-h2 {{ $t('report.dashboardReports.setup.findIndustry') }}
        b-field
          b-input(:value="query" :placeholder="$t('report.dashboardReports.setup.findPlaceholder')" icon="magnify" @input="onQuery")
        .drs-finder(v-if="matches.length")
          .drs-opt(v-for="m in matches" :key="m.code" :class="{ 'is-on': m.code === setup.industryCode }" @click="pick(m)")
            span {{ m.name }}
            span.drs-code
              | {{ m.code }} ·
              |
              | {{ $t('report.dashboardReports.setup.' + (m.benchmarks ? 'benchmarksPublished' : 'noBenchmarks')) }}
        p.drs-hint(v-else-if="query.length >= 2 && query !== setup.industryName") {{ $t('report.dashboardReports.setup.noMatches') }}
        p.drs-chosen(v-if="setup.industryCode")
          b {{ setup.industryName }}
          |
          | {{ setup.industryCode }} ·
          |
          | {{ $t('report.dashboardReports.setup.anzsicClass') }}
        p.drs-hint {{ $t('report.dashboardReports.setup.finderHint', { n: industryCount }) }}
      .drs-group(v-if="setup.industryCode")
        .drs-glabel
          span.drs-dot
          h2.drs-h2 {{ $t('report.dashboardReports.setup.sizeBandTitle') }}
        template(v-if="industry && industry.bands")
          .drs-band(v-for="b in bandRows" :key="b.key" :class="{ 'is-on': b.on, 'is-fit': b.fits }")
            b-radio(:value="setup.sizeBand || ''" :native-value="b.key" @input="v => change('sizeBand', v)")
              b {{ $t('report.dashboardReports.setup.band.' + b.key) }}
              |
              | — {{ $t('report.dashboardReports.setup.bandQuarter.' + b.key) }}
            span.drs-range {{ b.range }}
            span.drs-fit(v-if="b.fits") {{ $t('report.dashboardReports.setup.matchesRevenue', { revenue: kMoney(revenue) }) }}
          p.drs-hint {{ $t('report.dashboardReports.setup.bandHint') }}
          b-button(v-if="setup.sizeBand" size="is-small" type="is-text" @click="change('sizeBand', '')") {{ $t('report.dashboardReports.setup.bandFromRevenue') }}
        p.drs-hint(v-else-if="industry") {{ $t('report.dashboardReports.setup.noBenchmarksLong') }}
    .drs-actions
      b-button(type="is-primary" @click="$emit('continue')") {{ $t('report.dashboardReports.setup.continue') }}
      span.drs-note {{ $t('report.dashboardReports.setup.nothingSent') }}
</template>

<script>
/**
 * DashboardReportsSetup — step 1 of the Business Performance Report: the client, the
 * period, the date issued, who prepared it, and — stage 3 — the industry and the size band
 * (item 4.70; the approved drawing is `design/mockups/business-performance-report-intake.html`,
 * step 1).
 *
 * The client is the one chosen on the header, as every saved report's is, so it is shown
 * and not chosen again here. The finder searches every industry Stats NZ lists and says
 * which publish benchmarks; the size band is Stats NZ's four turnover quarters FOR THAT
 * INDUSTRY, each with its range, pre-marked from the revenue in the accounts when there is
 * one. Leaving the band blank means "from the revenue" and the pages route picks it.
 *
 * Nothing here calls the backend: the workbench answers the `search` and `industry` events,
 * so the step stays display and choice (the architecture boundary).
 */
import currencyMixin from '~/mixins/currencyMixin'

const BANDS = ['micro', 'small', 'medium', 'large']

export default {
  name: 'DashboardReportsSetup',

  mixins: [currencyMixin],

  props: {
    /** `{ financialYear, dateIssued, preparedBy, industryCode, industryName, sizeBand }` */
    setup: { type: Object, required: true },
    /** The client's name from the header picker, or the dropped file. */
    clientName: { type: String, default: '' },
    /** The finder's answer to the last `search`: `{ code, name, division, benchmarks }`. */
    matches: { type: Array, default: () => [] },
    /** The chosen industry's record (`bands`, `counts`, `accuracy`), or null until loaded. */
    industry: { type: Object, default: null },
    /** How many industries the finder covers, for the hint. */
    industryCount: { type: Number, default: 0 },
    /** This year's revenue from the accounts, or null before any file is dropped. */
    revenue: { type: Number, default: null }
  },

  data () {
    // A loaded report opens with its industry's name in the box, as a fresh pick leaves it.
    return { query: this.setup && this.setup.industryName ? this.setup.industryName : '' }
  },

  computed: {
    bandRows () {
      if (!this.industry || !this.industry.bands) { return [] }
      return BANDS.filter(k => this.industry.bands[k]).map((key) => {
        const b = this.industry.bands[key]
        const fits = this.revenue !== null && Number.isFinite(b.min) && Number.isFinite(b.max) && this.revenue >= b.min && this.revenue <= b.max
        return {
          key,
          range: this.kMoney(b.min) + ' – ' + this.kMoney(b.max),
          fits,
          on: this.setup.sizeBand ? this.setup.sizeBand === key : fits
        }
      })
    }
  },

  methods: {
    /**
     * One field changed.
     * @param {string} key
     * @param {string} value
     */
    change (key, value) {
      // change: the whole setup object with one field replaced
      this.$emit('change', Object.assign({}, this.setup, { [key]: value }))
    },
    /** @param {string} v */
    onQuery (v) {
      this.query = v
      // search: the finder text, two characters or more
      this.$emit('search', v)
    },
    /** @param {object} m - a finder match */
    pick (m) {
      // change: the whole setup with the industry replaced and the band cleared
      this.$emit('change', Object.assign({}, this.setup, { industryCode: m.code, industryName: m.name, sizeBand: '' }))
      // industry: the code whose bands the workbench should load
      this.$emit('industry', m.code)
      // The pick is the end of the search: the box shows the chosen name and the list goes
      // (Mike, 2026-09-09 — the other candidates staying on screen read as "not chosen").
      this.query = m.name
      // search: blank, so the workbench clears its matches
      this.$emit('search', '')
    }
  }
}
</script>

<style scoped>
.drs-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .drs-layout { grid-template-columns: 1fr; } }
.drs-card { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); }
.drs-group { padding: 15px 16px; border-bottom: 1px solid var(--rs-line); }
.drs-group:last-child { border-bottom: 0; }
.drs-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.drs-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.drs-h2 { margin: 0; font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.drs-hint { font-size: 12px; color: var(--rs-muted); margin: -6px 0 12px; }
.drs-results { display: flex; flex-direction: column; gap: 16px; }
.drs-finder { border: 1px solid var(--rs-line); border-radius: 8px; overflow: hidden; margin-bottom: 10px; }
.drs-opt { display: flex; justify-content: space-between; gap: 10px; padding: 8px 10px; font-size: 13px; border-bottom: 1px solid var(--rs-line); cursor: pointer; }
.drs-opt:last-child { border-bottom: 0; }
.drs-opt:hover { background: var(--rs-panel-2); }
.drs-opt.is-on { background: var(--rs-accent-soft); }
.drs-code { color: var(--rs-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.drs-chosen { font-size: 13.5px; margin: 4px 0 10px; }
.drs-band { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; padding: 8px 10px; border: 1px solid var(--rs-line); border-radius: 8px; margin-bottom: 6px; font-size: 13px; }
.drs-band.is-fit { border-color: var(--rs-accent); }
.drs-band.is-on { background: var(--rs-accent-soft); }
.drs-range { color: var(--rs-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.drs-fit { font-size: 11.5px; color: var(--rs-accent); font-weight: 600; white-space: nowrap; }
.drs-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.drs-note { font-size: 12.5px; color: var(--rs-muted); }
</style>
