<template lang="pug">
connections-screen
</template>

<script>
import ConnectionsScreen from '~/components/collaborate/screens/connections.vue'

/** /connections — Collaborate's established-connections list. Route shell only; see pages/collaborate.vue. */
export default {
  name: 'ConnectionsPage',
  layout: 'collaborate',
  components: { ConnectionsScreen }
}
</script>
