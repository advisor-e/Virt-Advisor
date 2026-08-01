<template lang="pug">
report-shell
  margin-breakeven-report
</template>

<script>
/**
 * /margin-breakeven page — Margin, Mark-up & Break-even report (third model).
 * Launched from Advisory.com per the design (Option 1); calc runs backend-only.
 * Wraps the screen in the shared ReportShell (which owns the frame + visual-standard
 * tokens); the screen reads those tokens for all its colours.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import MarginBreakevenReport from '~/components/MarginBreakevenReport.vue'

export default {
  name: 'MarginBreakevenPage',
  components: { ReportShell, MarginBreakevenReport }
}
</script>
