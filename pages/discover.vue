<template lang="pug">
discover-screen
</template>

<script>
import DiscoverScreen from '~/components/collaborate/screens/discover.vue'

/** /discover — Collaborate's adviser + group directory. Route shell only; see pages/collaborate.vue. */
export default {
  name: 'DiscoverPage',
  layout: 'collaborate',
  components: { DiscoverScreen }
}
</script>
