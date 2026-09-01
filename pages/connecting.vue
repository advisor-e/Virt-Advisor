<template lang="pug">
connecting-screen
</template>

<script>
import ConnectingScreen from '~/components/collaborate/screens/connecting.vue'

/** /connecting — Collaborate's outreach / connection-request screen. Route shell only; see pages/collaborate.vue. */
export default {
  name: 'ConnectingPage',
  layout: 'collaborate',
  components: { ConnectingScreen }
}
</script>
