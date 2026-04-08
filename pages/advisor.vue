<template lang="pug">
VirtualAdvisor(
  :org-template-ids="null"
  :advisor-id="advisorId"
  :firm-id="firmId"
)
</template>

<script>
export default {
  name: 'AdvisorPage',
  computed: {
    // In production, Advisor-e platform passes these as URL params or injected props.
    // Locally, defaults are used so the app works without any setup.
    advisorId () {
      return (this.$route && this.$route.query.advisorId) || 'local-advisor'
    },
    firmId () {
      return (this.$route && this.$route.query.firmId) || 'local-firm'
    }
  }
}
</script>
