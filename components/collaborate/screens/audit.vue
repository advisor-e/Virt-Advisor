<template lang="pug">
  audit-viewer(endpoint="/api/people/audit" fallback-endpoint="/api/people/audit/preview")
</template>

<script>
/**
 * Audit log — the admin/compliance viewer (FEAT-AUDIT-UI). Reads the REAL,
 * admin-gated /api/people/audit (a live Mentor sees the trail). In the dev
 * show-home the logged-in user isn't a Mentor, so the real route 403s and the
 * viewer falls back to the dev-only /preview route (which 404s in production, so
 * it's never a backdoor). Reached from the "View the full network audit log" link
 * on the Mentor console.
 */
import AuditViewer from '~/components/collaborate/shared/AuditViewer.vue'

export default {
  name: 'AuditLogPage',
  components: { AuditViewer }
}
</script>
