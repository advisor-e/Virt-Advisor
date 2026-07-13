<template lang="pug">
.eight-levers-page
  eight-levers-report
</template>

<script>
/**
 * /eight-levers page — the 8 Levers growth model (Education class).
 * Launched from the Model Library; the calc runs backend-only.
 */
import EightLeversReport from '~/components/EightLeversReport.vue'

export default {
  name: 'EightLeversPage',
  components: { EightLeversReport }
}
</script>

<style scoped>
.eight-levers-page {
  min-height: 100vh;
}
</style>
