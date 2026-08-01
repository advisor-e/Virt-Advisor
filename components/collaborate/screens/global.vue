<template lang="pug">
  manager-console(endpoint="/api/people/console/preview/global" :preview="true")
</template>

<script>
/**
 * Global Manager console — SHOW-HOME PREVIEW (see ManagerConsole / pages/group.vue).
 * Dev-only; production serves every tier from the single role-gated /firm page.
 */
import ManagerConsole from '~/components/collaborate/shared/ManagerConsole.vue'

export default {
  name: 'GlobalConsolePreview',
  components: { ManagerConsole }
}
</script>
