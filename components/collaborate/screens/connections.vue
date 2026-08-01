<template lang="pug">
  div
</template>

<script>
/**
 * Connections — RETIRED (Phase 4 of FEAT-CONNECTING). The unified "Connecting"
 * screen (pages/connecting.vue) replaces this page, so the route only redirects.
 * See design/ACTIONS.md.
 */
export default {
  name: 'ConnectionsRedirect',
  middleware ({ redirect }) {
    redirect('/connecting')
  }
}
</script>
