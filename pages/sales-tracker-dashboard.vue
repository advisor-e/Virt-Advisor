<template lang="pug">
sales-dashboard-screen
</template>

<script>
/**
 * /sales-tracker-dashboard — the Sales Dashboard, as Mike built it (item 17 stage 3).
 *
 * ⚠ THE ADDRESS IS NOT `/sales-dashboard`, AND THE TITLE IS STILL HIS. That
 * address is already taken by item 4.95's Sales Dashboard model, which reads a
 * CLIENT's sales workbook — a different screen for a different reader. Only the
 * route differs; the page calls itself "Sales Dashboard", his own title, because
 * that is what he named it.
 *
 * An ADVISOR page, not a Firm Manager Hub tab, for the same reason as
 * `/sales-pipeline` and `/sales-coi`: the hub sits behind `requireManagerRole`
 * and has no advisor scope. The firm manager's view of their advisors' pipelines
 * is stage 4's Team roll-up, which IS a hub tab.
 *
 * The page holds no logic; the component reads the figures from
 * `GET /api/sales/metrics` and the backend decides which rows they are built from.
 */
import SalesDashboardScreen from '~/components/sales/SalesDashboardScreen.vue'

export default {
  name: 'SalesTrackerDashboardPage',
  components: { SalesDashboardScreen },
  head () {
    return { title: this.$t('salesTrackerDashboard.title') }
  }
}
</script>
