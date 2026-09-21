<template lang="pug">
sales-coi
</template>

<script>
/**
 * /sales-coi — the advisor's own referral partners (item 17 stage 3).
 *
 * An ADVISOR page, not a Firm Manager Hub tab, for the same reason as
 * `/sales-pipeline`: the hub's four scopes are mentor/global/group/firm and it
 * sits behind `requireManagerRole`, so a hub tab would put this tool where its
 * own users cannot open it (Mike's ruling 2026-09-21;
 * design/features/sales-tracker.md §10 stage 7).
 *
 * The page holds no logic, matching every other page here: the component reads
 * the advisor's partners from the backend and the backend decides what they may
 * see.
 */
import SalesCoi from '~/components/sales/SalesCoi.vue'

export default {
  name: 'SalesCoiPage',
  components: { SalesCoi },
  head () {
    return { title: this.$t('salesCoi.title') }
  }
}
</script>
