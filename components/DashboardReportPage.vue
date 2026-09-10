<template lang="pug">
section.drd-page(:class="{ 'is-dark': dark }")
  h2.drd-title {{ title }}
  p.drd-sub(v-if="sub || $slots.sub")
    | {{ sub }}
    |
    slot(name="sub")
  slot
  .drd-foot
    span.drd-logo {{ $t('report.dashboardReports.doc.firmLogo') }}
    span {{ clientName }} · {{ $t('report.dashboardReports.title') }} · {{ period }}
    span(v-if="footNote") · {{ footNote }}
  span.drd-pno {{ number }}
</template>

<script>
/**
 * DashboardReportPage — one landscape page of the Business Performance Report: the title,
 * the sub-line with its provenance marks, the content, and the footer every page carries
 * (a place for the firm's logo, the client's name, the period and the page number). The
 * approved drawing is `design/mockups/business-performance-report.html`; every page of it
 * shares this frame, so the frame is one component.
 *
 * The logo is a marked place, not an image: no firm-logo setting exists yet, and the
 * drawing itself shows the place (Brief P6, "leave room for the firm's logo").
 */
export default {
  name: 'DashboardReportPage',

  props: {
    title: { type: String, required: true },
    sub: { type: String, default: '' },
    number: { type: Number, required: true },
    clientName: { type: String, default: '' },
    period: { type: String, default: '' },
    /** An extra footer note, as the cash page and the outlook page carry. */
    footNote: { type: String, default: '' },
    /** The navy page (next steps). */
    dark: { type: Boolean, default: false }
  }
}
</script>

<style>
/* Unscoped on purpose: these are the report's page tokens, read by every section
   component inside the frame. Prefixed `drd-` so nothing else can collide with them. */
.drd-page {
  --drd-navy: #002b64; --drd-blue: #0070c0; --drd-cyan: #00b1e0; --drd-sky: #7fd3f1; --drd-charcoal: #3a3a3a;
  --drd-good: #4ca52d; --drd-caution: #ff9900; --drd-danger: #ff0000;
  --drd-tint-blue: #ebf4fa; --drd-tint-cyan: #ebf9fd; --drd-tint-sky: #f5fbfe;
  --drd-tint-good: #eef6ea; --drd-tint-caution: #fff4e5; --drd-tint-danger: #fdeaea;
  --drd-ink: #002b64; --drd-body: #363636; --drd-muted: #5b6f8a; --drd-line: #d5e1ee;
  --drd-serif: 'Source Serif 4', Georgia, 'Times New Roman', serif;
  position: relative; width: 100%; aspect-ratio: 16 / 9; background: #fff; margin: 0 auto 22px;
  padding: 40px 56px 52px; box-shadow: 0 2px 14px rgba(0, 43, 100, .10); overflow: hidden;
  color: var(--drd-body); font-size: 13px; line-height: 1.45; font-variant-numeric: tabular-nums;
  break-after: page; page-break-after: always;
}
.drd-page.is-dark { background: var(--drd-navy); color: #fff; }
.drd-title { margin: 0; font: 700 34px/1.1 var(--drd-serif); color: var(--drd-navy); }
.drd-page.is-dark .drd-title { color: #fff; }
.drd-sub { margin: 6px 0 18px; color: var(--drd-muted); font-size: 15px; }
.drd-page.is-dark .drd-sub { color: var(--drd-sky); }
.drd-foot { position: absolute; left: 56px; right: 110px; bottom: 18px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px 12px; color: var(--drd-muted); font-size: 11.5px; }
.drd-page.is-dark .drd-foot, .drd-page.is-dark .drd-pno { color: var(--drd-sky); }
.drd-pno { position: absolute; right: 56px; bottom: 18px; font-weight: 700; color: var(--drd-blue); font-size: 13px; }
.drd-logo { display: inline-grid; place-items: center; width: 88px; height: 24px; border: 1px dashed var(--drd-sky); border-radius: 4px; color: var(--drd-blue); font-size: 9px; letter-spacing: .06em; text-transform: uppercase; background: var(--drd-tint-sky); }
/* Shared page furniture */
.drd-h3 { margin: 0 0 8px; font-size: 14px; font-weight: 700; color: var(--drd-ink); }
.drd-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 16px; }
.drd-cols.is-wide { grid-template-columns: 1.25fr 1fr; }
.drd-panel { border: 1px solid var(--drd-line); border-radius: 12px; padding: 16px 18px; background: #fff; }
.drd-panel.is-soft { background: var(--drd-tint-blue); border-color: transparent; }
.drd-panel.is-caution { background: var(--drd-tint-caution); border-color: transparent; }
.drd-panel.is-danger { background: var(--drd-tint-danger); border-color: transparent; }
.drd-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.drd-tile { border-radius: 12px; padding: 16px 18px 14px; background: var(--drd-tint-blue); }
.drd-tile.is-cyan { background: var(--drd-tint-cyan); }
.drd-tile.is-caution { background: var(--drd-tint-caution); }
.drd-tile.is-danger { background: var(--drd-tint-danger); }
.drd-tile.is-navy { background: var(--drd-navy); color: #fff; }
.drd-tile .drd-v { font: 700 32px/1.05 var(--drd-serif); color: var(--drd-navy); margin: 2px 0 6px; }
.drd-tile.is-navy .drd-v, .drd-tile.is-navy .drd-k { color: #fff; }
.drd-tile .drd-k { font-weight: 700; font-size: 13.5px; color: var(--drd-ink); }
.drd-tile .drd-d { font-size: 12px; margin-top: 5px; }
.drd-up { color: var(--drd-good); font-weight: 600; }
.drd-down { color: var(--drd-danger); font-weight: 600; }
.drd-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.drd-table td, .drd-table th { padding: 7px 9px; border-bottom: 1px solid var(--drd-line); text-align: left; }
.drd-table .drd-n { text-align: right; }
.drd-table tr.is-total td { font-weight: 700; background: var(--drd-tint-blue); }
.drd-table th { font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--drd-muted); }
.drd-table .drd-pct { color: var(--drd-muted); font-size: 12px; }
.drd-small { font-size: 11.5px; color: var(--drd-muted); }
.drd-legend { display: flex; gap: 14px; font-size: 12px; color: var(--drd-muted); margin-top: 6px; }
.drd-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
.drd-light { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
.drd-light.is-good { background: var(--drd-good); }
.drd-light.is-warn { background: var(--drd-caution); }
.drd-light.is-crit { background: var(--drd-danger); }
.drd-prov { display: inline-block; font-size: 9.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; border-radius: 999px; padding: 2px 8px; border: 1px solid var(--drd-line); color: var(--drd-muted); vertical-align: middle; margin-left: 6px; background: #fff; }
.drd-prov.is-file { color: var(--drd-blue); border-color: var(--drd-blue); }
.drd-prov.is-typed { color: #8a5a00; border-color: var(--drd-caution); }
.drd-gap { font-size: 12.5px; color: var(--drd-muted); background: var(--drd-tint-sky); border: 1px dashed var(--drd-sky); border-radius: 10px; padding: 12px 14px; }
/* The slim five-card strip along the foot of the optional pages (drawing pages 11–13). */
.drd-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 14px; }
.drd-sc { border: 1px solid var(--drd-line); border-radius: 8px; padding: 8px 10px; font-size: 11.5px; background: #fff; }
.drd-sk { font-weight: 700; color: var(--drd-ink); line-height: 1.2; }
.drd-sv { font: 700 15px/1.1 var(--drd-serif); color: var(--drd-navy); margin: 3px 0 2px; }
.drd-tag { display: inline-block; font-size: 9.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; border-radius: 999px; padding: 1px 6px; margin-top: 3px; }
.drd-tag.is-uses { background: var(--drd-tint-caution); color: #8a5a00; }
.drd-tag.is-rel { background: var(--drd-tint-good); color: #2f6b19; }
/* `screen` on purpose: Chrome lays an A4 landscape sheet out at 842px, so without it this
   phone breakpoint fires on paper and stacks every page into one tall column (found in
   Mike's printed PDF, 2026-09-09). The same word guards the three sibling breakpoints. */
@media screen and (max-width: 900px) {
  .drd-page { aspect-ratio: auto; padding: 22px 18px 56px; }
  .drd-tiles { grid-template-columns: 1fr 1fr; }
  .drd-strip { grid-template-columns: 1fr 1fr; }
  .drd-cols, .drd-cols.is-wide { grid-template-columns: 1fr; }
}
@media print {
  .drd-page { box-shadow: none; margin: 0; aspect-ratio: auto; height: 100vh; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
