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
    .drs-edu
      .drs-edu-h {{ $t('report.dashboardReports.setup.industryTitle') }}
      p {{ $t('report.dashboardReports.setup.industryLater') }}
    .drs-actions
      b-button(type="is-primary" @click="$emit('continue')") {{ $t('report.dashboardReports.setup.continue') }}
      span.drs-note {{ $t('report.dashboardReports.setup.nothingSent') }}
</template>

<script>
/**
 * DashboardReportsSetup — step 1 of the Business Performance Report: the client, the
 * period, the date issued and who prepared it (item 4.70; the approved drawing is
 * `design/mockups/business-performance-report-intake.html`, step 1).
 *
 * The client is the one chosen on the header, as every saved report's is, so it is shown
 * and not chosen again here. The industry finder and the size band drawn on this step are
 * stage 3 (the Stats NZ benchmarker) and are not on the screen until it exists; the panel
 * says so rather than showing an empty control.
 */
export default {
  name: 'DashboardReportsSetup',

  props: {
    /** `{ financialYear, dateIssued, preparedBy }` */
    setup: { type: Object, required: true },
    /** The client's name from the header picker, or the dropped file. */
    clientName: { type: String, default: '' }
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
.drs-edu { border-left: 3px solid var(--rs-accent-bright); background: var(--rs-accent-soft); border-radius: 0 9px 9px 0; padding: 15px 17px; }
.drs-edu-h { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--rs-accent); margin-bottom: 8px; }
.drs-edu p { margin: 0; font-size: 14px; line-height: 1.6; }
.drs-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.drs-note { font-size: 12.5px; color: var(--rs-muted); }
</style>
