<template lang="pug">
.business-performance-report-page
  business-performance-report
</template>

<script>
/**
 * /business-performance-report page
 *
 * Hosts the Business Performance Report feature (first module: Working Capital Cycle).
 * Per the design (Option 1), this screen is launched from Advisory.com's existing
 * "client report button", which opens this Virt-Advisor-hosted page and passes the session.
 * The screen itself renders the interactive model; the calc runs backend-only.
 */
import BusinessPerformanceReport from '~/components/BusinessPerformanceReport.vue'

export default {
  name: 'BusinessPerformanceReportPage',
  components: { BusinessPerformanceReport }
}
</script>

<style scoped>
.business-performance-report-page {
  min-height: 100vh;
}
</style>
