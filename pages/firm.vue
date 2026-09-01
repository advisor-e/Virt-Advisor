<template lang="pug">
firm-screen
</template>

<script>
import FirmScreen from '~/components/collaborate/screens/firm.vue'

/**
 * /firm — Collaborate's role-gated manager console (the standalone app's one
 * production console URL; the AppHeader's Firm link points here). The same
 * console is also embedded as the Firm Manager Hub's Adviser Network tab —
 * this page is the Collaborate-side door to it. Route shell only; see
 * pages/collaborate.vue.
 */
export default {
  name: 'FirmPage',
  layout: 'collaborate',
  components: { FirmScreen }
}
</script>
