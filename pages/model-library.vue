<template lang="pug">
.model-library-page
  model-library
</template>

<script>
/**
 * /model-library page — the Business Performance Report's model picker.
 *
 * The landing screen for the report feature: the advisor picks a model here and
 * opens its report. It is also the destination of the "Back to Model Library" link
 * on each report, so the reports are no longer dead ends however the user arrived.
 */
import ModelLibrary from '~/components/ModelLibrary.vue'

export default {
  name: 'ModelLibraryPage',
  components: { ModelLibrary }
}
</script>

<style scoped>
.model-library-page {
  min-height: 100vh;
}
</style>
