<template lang="pug">
group-detail-screen
</template>

<script>
import GroupDetailScreen from '~/components/collaborate/screens/groups/_id.vue'

/** /groups/:id — a Collaborate group's detail screen (reads the id from the route itself). Route shell only; see pages/collaborate.vue. */
export default {
  name: 'GroupDetailPage',
  layout: 'collaborate',
  components: { GroupDetailScreen }
}
</script>
