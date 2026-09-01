<template lang="pug">
audit-screen
</template>

<script>
import AuditScreen from '~/components/collaborate/screens/audit.vue'

/** /audit — Collaborate's admin-gated network audit log. Route shell only; see pages/collaborate.vue. */
export default {
  name: 'AuditPage',
  layout: 'collaborate',
  components: { AuditScreen }
}
</script>
