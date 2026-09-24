<template lang="pug">
report-shell
  owner-expectations
</template>

<script>
/**
 * /owner-expectations page — Business Owner Expectations and Business Development Stages
 * (item 5.4).
 *
 * Thin by design: the frame, the palette and the layout numbers come from the shared
 * `ReportShell`, and the header, the two step chips and both steps live in the one screen
 * component, because there is no file intake to coordinate. `reportShellFrame.test.js`
 * fails the build if this page stops wrapping the screen in `<report-shell>`.
 *
 * Calculation is backend-only: the screen POSTs to `/api/report/owner-expectations` on every
 * change and renders what comes back. Nothing about the owners is stored.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import OwnerExpectations from '~/components/OwnerExpectations.vue'

export default {
  name: 'OwnerExpectationsPage',
  components: { ReportShell, OwnerExpectations }
}
</script>
