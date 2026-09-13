<template lang="pug">
report-shell
  stock-purchasing
</template>

<script>
/**
 * /stock-purchasing page — the Stock Purchasing model (item 4.94).
 *
 * Thin by design: the frame, the palette and the layout numbers all come from the shared
 * `ReportShell` (see `design/REPORT-VISUAL-STANDARD.md`), and everything else — the header, the
 * four step chips, the entry, the stock-sheet import and the ranked buy list — lives in the one
 * screen component. `tests/unit/reportShellFrame.test.js` fails the build if this page stops
 * wrapping the screen in `<report-shell>`.
 *
 * Calculation is backend-only per the Stack Constitution: the screen POSTs to
 * `/api/report/stock-purchasing` on every change and renders what comes back, and uploads a
 * stock sheet to `/api/report/stock-purchasing/intake`.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import StockPurchasing from '~/components/StockPurchasing.vue'

export default {
  name: 'StockPurchasingPage',
  components: { ReportShell, StockPurchasing }
}
</script>
