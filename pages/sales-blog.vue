<template lang="pug">
sales-blog
</template>

<script>
/**
 * /sales-blog — the advisor's blog-writing tool (item 17 stage 5).
 *
 * An ADVISOR page, not a Firm Manager Hub tab, for the same reason as
 * `/sales-pipeline` and `/sales-coi`: the hub's four scopes are
 * mentor/global/group/firm and it sits behind `requireManagerRole`, so a hub tab
 * would put this tool where its own users cannot open it (Mike's ruling
 * 2026-09-21; design/features/sales-tracker.md §10 stage 7).
 *
 * ⚠ AND THESE ARE THE ADVISOR'S OWN DRAFTS. Stage 4's Team roll-up deliberately
 * shows a manager every deal in the firm; nothing here is shared with anyone,
 * which is why no blog route carries a manager role at all.
 *
 * The page holds no logic, matching every other page here.
 */
import SalesBlog from '~/components/sales/SalesBlog.vue'

export default {
  name: 'SalesBlogPage',
  components: { SalesBlog },
  head () {
    return { title: this.$t('salesBlog.title') }
  }
}
</script>
