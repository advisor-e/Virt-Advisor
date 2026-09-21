<template lang="pug">
sales-lists
</template>

<script>
/**
 * /sales-lists — the firm's Sales Tracker dropdown values (item 17 stage 4).
 *
 * Reading the lists is open to every advisor, because the pipeline and COI
 * screens build their dropdowns from them. CHANGING one is the manager's: a list
 * is firm-wide, so one advisor must not retitle everyone's prospect stages. Both
 * halves of that are enforced on the backend, per route.
 *
 * The page holds no logic, matching every other page here.
 */
import SalesLists from '~/components/sales/SalesLists.vue'

export default {
  name: 'SalesListsPage',
  components: { SalesLists },
  head () {
    return { title: this.$t('salesLists.title') }
  }
}
</script>
