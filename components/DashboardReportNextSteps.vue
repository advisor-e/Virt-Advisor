<template lang="pug">
dashboard-report-page(:title="$t('report.dashboardReports.doc.section.nextSteps')" :number="number" :client-name="clientName" :period="period" :foot-note="foot" dark)
  template(#sub)
    | {{ $t('report.dashboardReports.doc.nextStepsSub') }}
    span.drd-prov.drd-prov-dark {{ $t(drafted ? 'report.dashboardReports.doc.draftedBy' : 'report.dashboardReports.doc.writtenBy') }}
  .drd-steps
    .drd-step(v-for="(s, i) in steps" :key="i" :class="'is-' + i")
      .drd-ic {{ i + 1 }}
      div
        h3 {{ s.title || $t('report.dashboardReports.doc.stepUntitled', { n: i + 1 }) }}
        p {{ s.body || $t('report.dashboardReports.doc.stepEmpty') }}
</template>

<script>
/**
 * DashboardReportNextSteps — page 8, Key Insights & Next Steps (drawing page 10): the
 * navy page with the advisor's three priorities. The mark says which happened and never
 * both: *Drafted with AI · edited and approved by your advisor* where the three started
 * from a draft (stage 6, approved 2026-09-09), *Written by your advisor* where they were
 * typed. Whether the page prints at all is the parent's decision, on the server's record.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'

export default {
  name: 'DashboardReportNextSteps',

  components: { DashboardReportPage },

  props: {
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** `words.steps` — three `{ title, body }` */
    steps: { type: Array, required: true },
    nextReview: { type: String, default: '' },
    preparedBy: { type: String, default: '' },
    /** The three started from an AI draft (stage 6). */
    drafted: { type: Boolean, default: false }
  },

  computed: {
    foot () {
      const parts = []
      if (this.nextReview) { parts.push(this.$t('report.dashboardReports.doc.nextReview') + ': ' + this.nextReview) }
      if (this.preparedBy) { parts.push(this.$t('report.dashboardReports.doc.preparedBy') + ' ' + this.preparedBy) }
      return parts.join(' · ')
    }
  }
}
</script>

<style scoped>
.drd-prov-dark { background: transparent; color: #ff9900; border-color: #ff9900; }
.drd-steps { display: grid; gap: 14px; margin-top: 20px; }
.drd-step { display: grid; grid-template-columns: 50px 1fr; gap: 16px; align-items: center; background: rgba(255, 255, 255, .08); border: 1px solid rgba(127, 211, 241, .25); border-radius: 12px; padding: 16px 20px; }
.drd-ic { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; font: 700 18px var(--drd-serif); color: #fff; background: #ff9900; }
.drd-step.is-1 .drd-ic { background: #ff0000; }
.drd-step.is-2 .drd-ic { background: #00b1e0; color: #002b64; }
.drd-step h3 { color: #fff; font-size: 18px; margin: 0 0 4px; }
.drd-step p { color: #dbeaf7; font-size: 13.5px; margin: 0; }
</style>
