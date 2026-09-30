<template lang="pug">
.twc
  section.twc-cover
    i.twc-c1
    i.twc-c2
    i.twc-c3
    .twc-firm(v-if="firm") {{ firm }}
    .twc-eyebrow
      | {{ $t(C + 'eyebrow', { client }) }}
      span.twc-bar |
      | {{ $t(C + 'confidential') }}
    h1.twc-title {{ $t(C + 'title') }}
    .twc-client {{ client }}
    .twc-period {{ period }}
    .twc-by {{ firm ? $t(C + 'preparedIssued', { firm, date: today }) : $t(C + 'issued', { date: today }) }}
    .twc-caution {{ $t('report.threeWayForecast.report.caution') }}

  section.twc-contents
    h2.twc-h {{ $t(T + 'heading') }}
    p.twc-sub {{ $t(T + 'sub') }}
    .twc-toc
      div(v-for="(e, i) in entries" :key="e")
        span.twc-ic {{ i + 1 }}
        span
          b {{ $t(T + e) }}
          small {{ $t(T + e + 'Body') }}
    p.twc-foot
      span.twc-footfirm(v-if="firm") {{ firm }}
      | {{ $t('report.threeWayForecast.report.caution') }}
</template>

<script>
import { intlLocaleFor } from '~/utils/dateLocale'

const C = 'report.threeWayForecast.pack.cover.'
const T = 'report.threeWayForecast.pack.contents.'

/**
 * ThreeWayForecastCover — the printed pack's cover and contents (item 44.4; drawing and
 * wording approved by Mike 2026-09-30, design/mockups/three-way-forecast-board-pack.html).
 * Print only.
 *
 * The firm is the one the Notes' "Prepared by" names. The app holds no firm logo, so where
 * the drawing marked a logo the firm's name is printed instead — a placeholder box is never
 * put in front of a lender. The FRS-42 caution is on the cover, since it is the page most
 * often handed on alone. The economic analysis is listed only when it will print.
 */
export default {
  name: 'ThreeWayForecastCover',

  props: {
    /** The client's name; empty reads "the business". */
    clientName: { type: String, default: '' },
    /** The firm from the Notes' "Prepared by"; empty leaves the firm off. */
    preparedBy: { type: String, default: '' },
    /** The forecast's first month, `YYYY-MM-01`. */
    startIso: { type: String, required: true },
    yearCount: { type: Number, default: 1 },
    /** True when the approved economic analysis prints after the notes. */
    economicInPack: { type: Boolean, default: false }
  },

  data () {
    return { C, T }
  },

  computed: {
    intlLocale () { return intlLocaleFor(this.$i18n.locale) },
    client () { return this.clientName.trim() || this.$t('report.threeWayForecast.notes.general.theBusiness') },
    firm () { return this.preparedBy.trim() },

    /** "Forecast for the 12 months from 1 April 2024 to 31 March 2025", or over n years. */
    period () {
      const [y, m] = this.startIso.split('-').map(Number)
      const start = this.long(new Date(Date.UTC(y, m - 1, 1)))
      const end = this.long(new Date(Date.UTC(y + this.yearCount, m - 1, 0)))
      return this.yearCount > 1
        ? this.$t(C + 'periodMany', { n: this.yearCount, start, end })
        : this.$t(C + 'periodOne', { start, end })
    },

    /** The day it is printed. */
    today () { return new Date().toLocaleDateString(this.intlLocale, { day: 'numeric', month: 'long', year: 'numeric' }) },

    entries () {
      const e = ['glance', 'cash', 'profit', 'balance', 'notes']
      return this.economicInPack ? e.concat('economic') : e
    }
  },

  methods: {
    long (d) { return d.toLocaleDateString(this.intlLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) }
  }
}
</script>

<style scoped>
.twc { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.twc-cover {
  position: relative; overflow: hidden; height: 190mm; padding: 16mm 18mm;
  background: #002b64; color: #fff; break-after: page; page-break-after: always;
}
.twc-c1, .twc-c2, .twc-c3 { position: absolute; border-radius: 50%; z-index: 0; }
/* Every word sits above the circles: they are decoration, never over the text. */
.twc-cover > :not(i) { z-index: 1; }
.twc-eyebrow, .twc-title, .twc-client, .twc-period { position: relative; }
.twc-c1 { width: 170mm; height: 170mm; right: -55mm; top: -80mm; background: #0070c0; opacity: .75; }
.twc-c2 { width: 110mm; height: 110mm; right: -25mm; bottom: -38mm; background: #00b1e0; opacity: .85; }
.twc-c3 { width: 70mm; height: 70mm; right: 72mm; bottom: -16mm; background: #ff9900; }
.twc-firm { position: absolute; right: 18mm; top: 14mm; font-size: 14px; font-weight: 700; color: #7fd3f1; max-width: 70mm; text-align: right; }
.twc-eyebrow { font-size: 11px; letter-spacing: .28em; text-transform: uppercase; color: #00b1e0; max-width: 60%; }
.twc-bar { margin: 0 10px; }
.twc-title { font: 700 60px/1.05 Georgia, serif; color: #fff; margin: 34mm 0 0; white-space: nowrap; }
.twc-client { margin-top: 10mm; font-size: 24px; font-weight: 700; color: #ff9900; }
.twc-period { margin-top: 3mm; font-size: 16px; color: #dbeaf7; }
.twc-by { position: absolute; left: 18mm; bottom: 20mm; font-size: 14px; color: #7fd3f1; }
.twc-caution { position: absolute; left: 18mm; bottom: 11mm; font-size: 12px; color: #8fb2d9; font-style: italic; max-width: 60%; }
.twc-contents { break-after: page; page-break-after: always; color: #363636; }
.twc-h { font: 700 30px/1.1 Georgia, serif; color: #002b64; margin: 0; }
.twc-sub { color: #5b6f8a; font-size: 14px; margin: 6px 0 16px; }
.twc-toc { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; }
.twc-toc > div { display: grid; grid-template-columns: 44px 1fr; gap: 14px; align-items: center; background: #f4f8fb; border: 1px solid #d5e1ee; border-radius: 10px; padding: 12px 16px; }
.twc-ic { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; font: 700 18px Georgia, serif; color: #002b64; background: #ebf9fd; }
.twc-toc b { font-size: 15px; color: #002b64; }
.twc-toc small { display: block; color: #5b6f8a; font-size: 12.5px; margin-top: 2px; }
.twc-foot { margin-top: 14mm; font-size: 11px; color: #5b6f8a; font-style: italic; }
.twc-footfirm { font-style: normal; font-weight: 700; margin-right: 10px; }
</style>
