<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.section.information')" :sub="$t('report.dashboardReports.doc.informationSub')" :number="number" :client-name="clientName" :period="period")
  .drd-disc
    p(v-for="k in paragraphs" :key="k")
      b {{ $t('report.dashboardReports.doc.info.' + k + 'Title') }}.
      |
      | {{ $t('report.dashboardReports.doc.info.' + k, { client: clientName, firm: preparedBy || $t('report.dashboardReports.doc.yourAdvisor'), period }) }}
</template>

<script>
/**
 * DashboardReportInformation — the closing Important Information page (drawing page 12;
 * Brief P11, Mike's instruction "we also need to include a disclaimer page"). Seven short
 * paragraphs, the wording ruled 2026-09-08 as drawn. It is never regulatory advice in itself.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'

export default {
  name: 'DashboardReportInformation',

  components: { DashboardReportPage },

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    preparedBy: { type: String, default: '' }
  },

  data () {
    return { paragraphs: ['what', 'whatNot', 'figures', 'benchmarks', 'score', 'research', 'confidential'] }
  }
}
</script>

<style scoped>
.drd-disc p { font-size: 12.5px; margin: 0 0 9px; max-width: 1040px; }
.drd-disc b { color: var(--drd-navy); }
</style>
