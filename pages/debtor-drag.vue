<template lang="pug">
report-shell
  debtor-drag-report
</template>

<script>
/**
 * /debtor-drag page — Debtor Business Drag report (second model).
 * Launched from Advisory.com per the design (Option 1); calc runs backend-only.
 * Wraps the screen in the shared ReportShell (frame + visual-standard tokens).
 */
import ReportShell from '~/components/base/ReportShell.vue'
import DebtorDragReport from '~/components/DebtorDragReport.vue'

export default {
  name: 'DebtorDragPage',
  components: { ReportShell, DebtorDragReport }
}
</script>
