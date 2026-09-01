<template lang="pug">
messages-screen
</template>

<script>
import MessagesScreen from '~/components/collaborate/screens/messages.vue'

/** /messages — Collaborate's conversations. Route shell only; see pages/collaborate.vue. */
export default {
  name: 'MessagesPage',
  layout: 'collaborate',
  components: { MessagesScreen }
}
</script>
