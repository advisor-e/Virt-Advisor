<template lang="pug">
group-new-screen
</template>

<script>
import GroupNewScreen from '~/components/collaborate/screens/groups/new.vue'

/** /groups/new — create a Collaborate specialty group. Route shell only; see pages/collaborate.vue. */
export default {
  name: 'GroupNewPage',
  layout: 'collaborate',
  components: { GroupNewScreen }
}
</script>
