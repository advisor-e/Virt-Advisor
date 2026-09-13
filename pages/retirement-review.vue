<template lang="pug">
report-shell
  retirement-review
</template>

<script>
/**
 * /retirement-review page — the Retirement Review model (item 4.90).
 *
 * Thin by design: the frame, the palette and the layout numbers all come from the shared
 * `ReportShell` (see `design/REPORT-VISUAL-STANDARD.md`), and everything else — the header,
 * the four step chips, the entry and the twenty-year result — lives in the one screen
 * component, because unlike Quick Position there is no file intake to coordinate.
 * `tests/unit/reportShellFrame.test.js` fails the build if this page stops wrapping the
 * screen in `<report-shell>`.
 *
 * Calculation is backend-only per the Stack Constitution: the screen POSTs to
 * `/api/report/retirement-review` on every change and renders what comes back. Nothing about
 * the household is stored — see the route's header.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import RetirementReview from '~/components/RetirementReview.vue'

export default {
  name: 'RetirementReviewPage',
  components: { ReportShell, RetirementReview }
}
</script>
