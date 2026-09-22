<template lang="pug">
sales-tracker-home
</template>

<script>
/**
 * /sales-tracker — the advisor's doorway into the Sales Tracker (item 17 stage 4).
 *
 * 🔴 THIS IS THE STUB THE MASTER TEAM PLACES ONE LINK TO — Mike, 2026-09-22. This
 * app has no navigation of its own (`layouts/default.vue` is `div > nuxt`), so every
 * screen is reached by Advisor-e deep-linking into it. One link to this address puts
 * all three advisor screens within reach, and a fourth screen later changes this page
 * rather than their link. design/features/sales-tracker.md §13.
 *
 * An ADVISOR page — no manager role, the same as the three screens it opens onto.
 * The page holds no logic, matching every other page here.
 */
import SalesTrackerHome from '~/components/sales/SalesTrackerHome.vue'

export default {
  name: 'SalesTrackerPage',
  components: { SalesTrackerHome },
  head () {
    return { title: this.$t('salesTrackerHome.title') }
  }
}
</script>
