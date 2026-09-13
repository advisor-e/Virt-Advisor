<template lang="pug">
report-shell
  high-level-budget
</template>

<script>
/**
 * /high-level-budget page — the High Level Budget model (item 4.88).
 *
 * Thin by design: the frame, the palette and the layout numbers all come from the shared
 * `ReportShell` (see `design/REPORT-VISUAL-STANDARD.md`), and everything else — the header,
 * the four step chips, the entry and the result — lives in the one screen component, because
 * unlike Quick Position there are no separate intake and report components to coordinate.
 * `tests/unit/reportShellFrame.test.js` fails the build if this page stops wrapping the
 * screen in `<report-shell>`.
 *
 * Calculation is backend-only per the Stack Constitution: the screen POSTs to
 * `/api/report/high-level-budget` on every change and renders what comes back.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import HighLevelBudget from '~/components/HighLevelBudget.vue'

export default {
  name: 'HighLevelBudgetPage',
  components: { ReportShell, HighLevelBudget }
}
</script>
