<template lang="pug">
report-shell
  eight-levers-report
</template>

<script>
/**
 * /eight-levers page — the 8 Levers growth model (Education class).
 * Launched from the Model Library; the calc runs backend-only.
 * Wrapped in the shared ReportShell (frame + visual-standard tokens).
 */
import ReportShell from '~/components/base/ReportShell.vue'
import EightLeversReport from '~/components/EightLeversReport.vue'

export default {
  name: 'EightLeversPage',
  components: { ReportShell, EightLeversReport }
}
</script>
