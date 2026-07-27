<template lang="pug">
.lease-vs-buy-page
  .wrap
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
.lease-vs-buy-page { min-height: 100vh; background: #eef3f8; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 28px 22px 64px; }
</style>
