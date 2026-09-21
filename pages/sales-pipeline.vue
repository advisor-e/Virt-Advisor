<template lang="pug">
sales-pipeline
</template>

<script>
/**
 * /sales-pipeline — the advisor's own deals (item 17 stage 2).
 *
 * An ADVISOR page, not a Firm Manager Hub tab. The hub's four scopes are
 * mentor/global/group/firm and it sits behind `requireManagerRole`; this tool is
 * for the firm's own advisors (Mike's ruling 2026-09-21), so a hub tab would put
 * it where its own users cannot open it. The plan said otherwise and was
 * corrected — design/features/sales-tracker.md §10 stage 7 records why.
 *
 * The Team roll-up, where a firm manager reads their advisors' pipelines (Mike,
 * 2026-09-22), IS a hub tab. That is stage 4.
 *
 * The page holds no logic, matching every other page here: the component reads
 * the advisor's deals from the backend and the backend decides what they may see.
 */
import SalesPipeline from '~/components/sales/SalesPipeline.vue'

export default {
  name: 'SalesPipelinePage',
  components: { SalesPipeline },
  head () {
    return { title: this.$t('salesPipeline.title') }
  }
}
</script>
