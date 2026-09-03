<template lang="pug">
client-report-library
</template>

<script>
/**
 * /my-reports — the business entity's own reports page (the stub, part 1 of
 * design/features/business-entity-reports.md). The page holds no logic: the component
 * reads the client's open set from the backend and the backend decides everything.
 */
import ClientReportLibrary from '~/components/ClientReportLibrary.vue'

export default {
  name: 'MyReportsPage',
  components: { ClientReportLibrary },
  head () {
    return { title: this.$t('clientReports.library.title') }
  }
}
</script>
