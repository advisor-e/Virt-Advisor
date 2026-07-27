<template lang="pug">
report-shell
  cost-of-capital
</template>

<script>
/**
 * /cost-of-capital page — the Cost of Capital (WACC) model (Valuation · Decision class).
 * Thin: wraps the screen in the shared ReportShell (which owns the page frame —
 * canvas, centred 1120px column, padding — and the visual-standard tokens) and
 * renders the screen component. The calc runs backend-only.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import CostOfCapital from '~/components/CostOfCapital.vue'

export default {
  name: 'CostOfCapitalPage',
  components: { ReportShell, CostOfCapital }
}
</script>
