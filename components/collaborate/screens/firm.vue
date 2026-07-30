<template lang="pug">
  manager-console(endpoint="/api/people/firm")
</template>

<script>
/**
 * Firm Manager console — the REAL, role-gated page (server returns 403 for a
 * non-manager). It renders the shared ManagerConsole against the live endpoint;
 * that same component serves every tier (Q-ROLES). In production this is THE
 * console page, shown once based on the Advisory login.
 */
import ManagerConsole from '~/components/collaborate/shared/ManagerConsole.vue'

export default {
  name: 'FirmConsolePage',
  components: { ManagerConsole }
}
</script>
