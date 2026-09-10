<template lang="pug">
div
  section.drd-page.drd-cover
    .drd-c1
    .drd-c2
    .drd-c3
    span.drd-logo.is-big {{ $t('report.dashboardReports.doc.firmLogo') }}
    .drd-eyebrow {{ $t('report.dashboardReports.doc.coverEyebrow') }}
    h2.drd-cover-title {{ $t('report.dashboardReports.title') }}
    .drd-client {{ clientName }}
    .drd-period {{ $t('report.dashboardReports.doc.reportingPeriod') }}: {{ period }}
    .drd-by
      | {{ $t('report.dashboardReports.doc.preparedBy') }}: {{ preparedBy || '—' }}
      | &nbsp;&nbsp;&nbsp;
      | {{ $t('report.dashboardReports.doc.dateIssued') }}: {{ dateIssued || '—' }}
  dashboard-report-page(:title="$t('report.dashboardReports.doc.contents')" :sub="$t('report.dashboardReports.doc.contentsSub')" :number="2" :client-name="clientName" :period="period")
    .drd-toc
      .drd-toc-row(v-for="s in sections" :key="s.key")
        span.drd-toc-ic(:class="'is-' + s.tone") {{ s.n }}
        span
          b {{ $t('report.dashboardReports.doc.section.' + s.key) }}
          small {{ $t('report.dashboardReports.doc.sectionSub.' + s.key) }}
    p.drd-small.drd-toc-note
      template(v-if="addedTitles.length")
        | {{ $t('report.dashboardReports.doc.addedByAdvisor') }}: {{ addedTitles.join(', ') }}.
        |
      | {{ $t('report.dashboardReports.doc.closingPage') }}: #[b {{ $t('report.dashboardReports.doc.section.information') }}].
      |
      | {{ $t('report.dashboardReports.doc.everyFigureMarked') }}
      span.drd-prov.is-file {{ $t('report.dashboardReports.doc.fromAccounts') }}
      span.drd-prov.is-typed {{ $t('report.dashboardReports.doc.enteredByAdvisor') }}
</template>

<script>
/**
 * DashboardReportCover — the cover and the contents page of the Business Performance
 * Report (drawing pages 1 and 2). The cover is its own layout, not the shared frame:
 * navy, the deck's three circles, the client's name in the caution colour as the deck has
 * it, and the prepared-by line.
 */
import DashboardReportPage from '~/components/DashboardReportPage.vue'

export default {
  name: 'DashboardReportCover',

  components: { DashboardReportPage },

  props: {
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    preparedBy: { type: String, default: '' },
    dateIssued: { type: String, default: '' },
    /** The numbered sections in order: `{ key, n, tone }`. */
    sections: { type: Array, required: true },
    /** Titles of the optional pages the advisor added. */
    addedTitles: { type: Array, default: () => [] }
  }
}
</script>

<style scoped>
.drd-cover { padding: 52px 56px; color: #fff; background: var(--drd-navy, #002b64); }
.drd-cover .drd-c1, .drd-cover .drd-c2, .drd-cover .drd-c3 { position: absolute; border-radius: 50%; }
.drd-c1 { width: 560px; height: 560px; right: -180px; top: -270px; background: #0070c0; opacity: .75; }
.drd-c2 { width: 380px; height: 380px; right: -80px; bottom: -130px; background: #00b1e0; opacity: .85; }
.drd-c3 { width: 240px; height: 240px; right: 240px; bottom: -60px; background: #ff9900; }
.drd-logo.is-big { position: absolute; right: 56px; top: 40px; width: 170px; height: 52px; font-size: 11px; border-color: #00b1e0; background: rgba(255, 255, 255, .08); color: #7fd3f1; }
.drd-eyebrow { font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: #00b1e0; }
.drd-cover-title { margin: 96px 0 0; font: 700 64px/1.05 var(--drd-serif, Georgia, serif); color: #fff; max-width: 62%; position: relative; }
.drd-client { margin-top: 30px; font-weight: 700; font-size: 24px; color: #ff9900; position: relative; }
.drd-period { margin-top: 12px; font-size: 16px; color: #dbeaf7; position: relative; }
.drd-by { position: absolute; left: 56px; bottom: 44px; font-size: 14px; color: #7fd3f1; }
.drd-toc { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.drd-toc-row { display: grid; grid-template-columns: 54px 1fr; gap: 14px; align-items: center; background: #f4f8fb; border: 1px solid var(--drd-line); border-radius: 12px; padding: 12px 16px; }
.drd-toc-ic { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; font: 700 20px var(--drd-serif); color: var(--drd-navy); background: var(--drd-tint-cyan); }
.drd-toc-ic.is-caution { background: var(--drd-tint-caution); color: #8a5a00; }
.drd-toc-ic.is-danger { background: var(--drd-tint-danger); color: #9c2323; }
.drd-toc b { font-size: 16px; color: var(--drd-ink); }
.drd-toc small { display: block; color: var(--drd-muted); font-size: 12.5px; margin-top: 2px; }
.drd-toc-note { margin-top: 14px; }
@media screen and (max-width: 900px) {
  .drd-cover-title { font-size: 40px; margin-top: 36px; max-width: 100%; }
  .drd-c1, .drd-c2, .drd-c3 { display: none; }
  .drd-toc { grid-template-columns: 1fr; }
}
</style>
