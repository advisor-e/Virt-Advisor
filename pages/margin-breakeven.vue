<template lang="pug">
.margin-breakeven-page
  margin-breakeven-report
</template>

<script>
/**
 * /margin-breakeven page — Margin, Mark-up & Break-even report (third model).
 * Launched from Advisory.com per the design (Option 1); calc runs backend-only.
 */
import MarginBreakevenReport from '~/components/MarginBreakevenReport.vue'

export default {
  name: 'MarginBreakevenPage',
  components: { MarginBreakevenReport }
}
</script>

<style scoped>
.margin-breakeven-page {
  min-height: 100vh;
}
</style>
