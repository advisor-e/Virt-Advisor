<template lang="pug">
.lease-vs-buy-page
  lease-vs-buy
</template>

<script>
/**
 * /lease-vs-buy page — the Lease vs Buy model (Valuation · Decision class).
 * Thin: renders the screen component; the calc runs backend-only.
 */
import LeaseVsBuy from '~/components/LeaseVsBuy.vue'

export default {
  name: 'LeaseVsBuyPage',
  components: { LeaseVsBuy }
}
</script>

<style scoped>
.lease-vs-buy-page {
  min-height: 100vh;
}
</style>
