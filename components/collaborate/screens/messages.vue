<template lang="pug">
  div
</template>

<script>
/**
 * Messages — RETIRED (Phase 4 of FEAT-CONNECTING). The unified "Connecting" screen
 * (pages/connecting.vue) now owns conversations, so this route only redirects,
 * preserving any ?thread= deep-link (notifications, "Message" buttons) so old
 * links still land on the right conversation. See design/ACTIONS.md.
 */
export default {
  name: 'MessagesRedirect',
  middleware ({ redirect, query }) {
    const thread = query && query.thread
    redirect('/connecting' + (thread ? '?thread=' + thread : ''))
  }
}
</script>
