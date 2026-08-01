<template lang="pug">
  manager-console(endpoint="/api/people/console/preview/group" :preview="true")
</template>

<script>
/**
 * Group (country) Manager console — SHOW-HOME PREVIEW. Renders the shared
 * ManagerConsole against the dev-only preview endpoint (a seeded demo country
 * manager), so the tier's view can be seen without a real login. In production
 * this URL does not exist — the single role-gated /firm page serves every tier
 * based on the Advisory login (Q-ROLES).
 */
import ManagerConsole from '~/components/collaborate/shared/ManagerConsole.vue'

export default {
  name: 'GroupConsolePreview',
  components: { ManagerConsole }
}
</script>
