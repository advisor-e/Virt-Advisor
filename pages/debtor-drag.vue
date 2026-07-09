<template lang="pug">
.debtor-drag-page
  debtor-drag-report
</template>

<script>
/**
 * /debtor-drag page — Debtor Business Drag report (second model).
 * Launched from Advisory.com per the design (Option 1); calc runs backend-only.
 */
import DebtorDragReport from '~/components/DebtorDragReport.vue'

export default {
  name: 'DebtorDragPage',
  components: { DebtorDragReport }
}
</script>

<style scoped>
.debtor-drag-page {
  min-height: 100vh;
}
</style>
