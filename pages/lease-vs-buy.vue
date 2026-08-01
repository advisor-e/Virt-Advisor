<template lang="pug">
report-shell
  lease-vs-buy
</template>

<script>
/**
 * /lease-vs-buy page — the Lease vs Buy model (Valuation · Decision class).
 * Thin: wraps the screen in the shared ReportShell (which owns the page frame —
 * canvas, centred 1120px column, padding — and the visual-standard tokens) and
 * renders the screen component. The calc runs backend-only.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import LeaseVsBuy from '~/components/LeaseVsBuy.vue'

export default {
  name: 'LeaseVsBuyPage',
  components: { ReportShell, LeaseVsBuy }
}
</script>
