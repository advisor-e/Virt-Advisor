<template lang="pug">
  manager-console(endpoint="/api/people/console/preview/mentor" :preview="true")
</template>

<script>
/**
 * Mentor console — SHOW-HOME PREVIEW (see ManagerConsole / pages/group.vue).
 * Dev-only; production serves every tier from the single role-gated /firm page.
 */
import ManagerConsole from '~/components/collaborate/shared/ManagerConsole.vue'

export default {
  name: 'MentorConsolePreview',
  components: { ManagerConsole }
}
</script>
