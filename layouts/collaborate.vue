<template lang="pug">
.collab-scope
  view-as-banner
  app-header
  nuxt
</template>

<script>
import AppHeader from '~/components/collaborate/AppHeader.vue'
import ViewAsBanner from '~/components/collaborate/ViewAsBanner.vue'

/**
 * Collaborate section layout — the chrome the standalone app's default
 * layout provided (view-as banner + navbar), now scoped to the pages under
 * the /collaborate front door. The .collab-scope wrapper is load-bearing:
 * assets/css/collaborate-theme.css prefixes every rule with it so
 * Collaborate's visual theme cannot restyle the rest of the app.
 */
export default {
  name: 'CollaborateLayout',
  components: { AppHeader, ViewAsBanner }
}
</script>

<style src="~/assets/css/collaborate-theme.css"></style>
