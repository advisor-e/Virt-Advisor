<template lang="pug">
.srpp(v-if="importStatus === 'ready' && reportFigures")
  //- The plan's own sheet furniture — frame, mark, running foot — handed in by the plan, so
  //- the page wears the same sheet as its neighbours and nothing is drawn for a report that
  //- is not there.
  slot
  dashboard-report-summary(
    :number="number"
    :client-name="clientName"
    :period="savedInfo ? savedInfo.period : ''"
    :s="reportFigures.summary"
    :score="reportFigures.score"
    :words="reportState.words")
</template>

<script>
/**
 * StrategyReportPlanPage — the client's plan page for a Business Performance Report that
 * was brought into the session (item 15.13, Decision D of
 * design/mockups/strategy-current-position-import.html, approved by Mike 2026-09-28): the
 * report's OWN Executive Summary page, nothing else.
 *
 * It is worked out afresh when the plan is produced, from the client's saved report on the
 * report's own route, so the plan can never disagree with the report. The plan mounts this
 * only where the session records that the report was brought in; with no completed report
 * or a failed read it renders nothing, so a plan never carries a page of blanks.
 */
import DashboardReportSummary from '~/components/DashboardReportSummary.vue'
import businessReportImport from '~/mixins/businessReportImport'

export default {
  name: 'StrategyReportPlanPage',

  components: { DashboardReportSummary },

  mixins: [businessReportImport],

  /** The page footer's mark is the advisor firm's, as on the report itself (item 16). */
  provide () {
    return { drdBrand: () => this.firmBrand }
  },

  props: {
    clientId: { type: String, required: true },
    clientName: { type: String, default: '' },
    apiToken: { type: String, default: 'dev-local-bypass' },
    /** The page's number in the plan. */
    number: { type: Number, required: true }
  },

  mounted () {
    this.loadFirmBrand({ Authorization: 'Bearer ' + this.apiToken })
    this.bringInReport()
  }
}
</script>
