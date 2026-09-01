<template lang="pug">
collaborate-home
</template>

<script>
import CollaborateHome from '~/components/collaborate/screens/index.vue'

/**
 * /collaborate — the Collaborate front door. This is the ONE address the
 * Advisor-e master app's banner button opens; the screens behind it link to
 * each other by the absolute paths they shipped with (/discover, /connecting,
 * /marketplace, …), which is why every other Collaborate wrapper page keeps
 * its original URL rather than nesting under /collaborate/. All wrappers are
 * route shells only — the screens themselves live in
 * components/collaborate/screens/ (merge slice 1) and are unchanged.
 */
export default {
  name: 'CollaboratePage',
  layout: 'collaborate',
  components: { CollaborateHome }
}
</script>
