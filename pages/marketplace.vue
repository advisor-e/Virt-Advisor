<template lang="pug">
marketplace-screen
</template>

<script>
import MarketplaceScreen from '~/components/collaborate/screens/marketplace.vue'

/** /marketplace — Collaborate's tool marketplace. Route shell only; see pages/collaborate.vue. */
export default {
  name: 'MarketplacePage',
  layout: 'collaborate',
  components: { MarketplaceScreen }
}
</script>
