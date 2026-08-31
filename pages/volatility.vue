<template lang="pug">
report-shell
  volatility-report
</template>

<script>
/**
 * /volatility page — the Volatility Report (Risk · Report class).
 * Thin: wraps the screen in the shared ReportShell (which owns the page frame —
 * canvas, centred 1120px column, padding — and the visual-standard tokens) and
 * renders the screen component. The calc runs backend-only.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import VolatilityReport from '~/components/VolatilityReport.vue'

export default {
  name: 'VolatilityPage',
  components: { ReportShell, VolatilityReport }
}
</script>
