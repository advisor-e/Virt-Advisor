<template lang="pug">
report-shell
  business-performance-report
</template>

<script>
/**
 * /business-performance-report page
 *
 * Hosts the Business Performance Report feature (first module: Working Capital Cycle).
 * Per the design (Option 1), this screen is launched from Advisory.com's existing
 * "client report button", which opens this Virt-Advisor-hosted page and passes the session.
 * The screen itself renders the interactive model; the calc runs backend-only. Wrapped in
 * the shared ReportShell (frame + visual-standard tokens).
 */
import ReportShell from '~/components/base/ReportShell.vue'
import BusinessPerformanceReport from '~/components/BusinessPerformanceReport.vue'

export default {
  name: 'BusinessPerformanceReportPage',
  components: { ReportShell, BusinessPerformanceReport }
}
</script>
