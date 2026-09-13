<template lang="pug">
report-shell
  sales-dashboard
</template>

<script>
/**
 * /sales-dashboard page — the Sales Dashboard model (item 4.95).
 *
 * Thin by design: the frame, the palette and the layout numbers all come from the shared
 * `ReportShell` (see `design/REPORT-VISUAL-STANDARD.md`), and everything else — the header, the
 * import, the trend, the bands table and the five cuts — lives in the one screen component.
 * `tests/unit/reportShellFrame.test.js` fails the build if this page stops wrapping the screen in
 * `<report-shell>`.
 *
 * Calculation is backend-only per the Stack Constitution: the screen POSTs to
 * `/api/report/sales-dashboard` on every change and renders what comes back, and uploads a sales
 * report to `/api/report/sales-dashboard/intake`.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import SalesDashboard from '~/components/SalesDashboard.vue'

export default {
  name: 'SalesDashboardPage',
  components: { ReportShell, SalesDashboard }
}
</script>
