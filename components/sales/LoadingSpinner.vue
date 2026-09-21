<template lang="pug">
.has-text-centered.p-6
  .spinner
  p.mt-4.has-text-grey(v-if="message") {{ message }}
</template>

<script>
/**
 * LoadingSpinner — the Sales Dashboard's loading state.
 *
 * A faithful copy of Mike's own `components/common/LoadingSpinner.vue` from
 * advisor-e/sales-tracker-nuxt: same markup, same CSS, same cyan spinner. Only
 * the prop declaration gained its type, which this repo's standards require.
 */
export default {
  name: 'LoadingSpinner',

  props: {
    /** Optional line beneath the spinner. */
    message: { type: String, default: '' }
  }
}
</script>

<style scoped>
/* Mike's CSS, copied unchanged. */
.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #00b1e0;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
