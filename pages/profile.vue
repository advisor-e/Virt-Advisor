<template lang="pug">
profile-screen
</template>

<script>
import ProfileScreen from '~/components/collaborate/screens/profile.vue'

/** /profile — the adviser's own Collaborate profile. Route shell only; see pages/collaborate.vue. */
export default {
  name: 'ProfilePage',
  layout: 'collaborate',
  components: { ProfileScreen }
}
</script>
