<template lang="pug">
.model-guide-page
  model-guide
</template>

<script>
/**
 * /model-guide page — what each report model is for.
 *
 * The reference beside the Model Library: purpose, the figures each model calculates,
 * the reading its Coach panel gives, what it needs and what it does not cover.
 * Reached from the Model Library and returning to it, so neither screen is a dead end.
 *
 * Ruled by Mike, 2026-08-22 — the page serves a firm manager choosing a model *as well
 * as* the AI guiding an advisor, from the same records. See components/ModelGuide.vue.
 */
import ModelGuide from '~/components/ModelGuide.vue'

export default {
  name: 'ModelGuidePage',
  components: { ModelGuide }
}
</script>

<style scoped>
.model-guide-page {
  min-height: 100vh;
}
</style>
