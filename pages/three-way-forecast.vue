<template lang="pug">
report-shell
  three-way-forecast-report(
    :seed="seed"
    :client="companyName"
    @start-again="startAgain")
</template>

<script>
/**
 * /three-way-forecast — the Three-Way Forecast result screen.
 *
 * The engine behind it is a port of `3 way Filter.xlsx`, proven against 10,155 of that
 * workbook's own calculated cells across all three years, with nine corrections each
 * ruled by Mike on 2026-09-02 (`design/THREE-WAY-FORECAST-DEVIATIONS.md`).
 *
 * ⚠ THE FILE INTAKE IS BUILT ON THE BACKEND AND HAS NO SCREEN YET.
 * `POST /api/report/three-way-forecast/intake` reads a Balance Sheet and a Profit and
 * Loss and proposes the opening position and the cost base, with every figure tagged
 * `file`, `seeded` or `entered`. Steps 1 to 3 of the approved drawing — drop the
 * exports, confirm the opening position, set the assumptions — are the next unit of
 * work. Until they exist this screen computes on the source workbook's own sample, which
 * is why it carries no client name and no upload.
 *
 * That is a deliberate stopping point, not an oversight: the result screen is what the
 * four consistency guards cover, and shipping it first means the intake screens are
 * built against a screen that already looks and behaves like its nine neighbours.
 */
import ReportShell from '~/components/base/ReportShell.vue'
import ThreeWayForecastReport from '~/components/ThreeWayForecastReport.vue'

export default {
  name: 'ThreeWayForecastPage',

  components: { ReportShell, ThreeWayForecastReport },

  data () {
    return {
      /** Confirmed inputs from the intake once its screens exist; null computes the sample. */
      seed: null
    }
  },

  computed: {
    /** The client's name, from a dropped file. Displayed locally, never sent anywhere. */
    companyName () {
      return (this.seed && this.seed.companyName) || ''
    }
  },

  methods: {
    /** Back to the sample. With no intake screen yet there is nothing else to clear. */
    startAgain () {
      this.seed = null
    }
  }
}
</script>
