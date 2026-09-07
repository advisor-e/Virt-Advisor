<template lang="pug">
.dri-layout
  aside.dri-card
    .dri-group
      .dri-glabel
        span.dri-dot
        h2.dri-h2 {{ $t('report.dashboardReports.inventory.dropTitle') }}
      p.dri-hint {{ $t('report.dashboardReports.inventory.readerLater') }}
    .dri-group
      .dri-glabel
        span.dri-dot
        h2.dri-h2 {{ $t('report.dashboardReports.inventory.cannotTell') }}
      b-field
        template(#label)
          | {{ $t('report.dashboardReports.inventory.slowObsolete') }}
          provenance-badge(source="entered" size="sm" spaced file-label="" :entered-label="$t('report.dashboardReports.accounts.entered')")
        b-input(type="number" step="any" :value="inventory.slowObsolete" @input="v => change('slowObsolete', v)")
      .dri-lbl
        | {{ $t('report.dashboardReports.inventory.ageingTitle') }}
        provenance-badge(source="entered" size="sm" spaced file-label="" :entered-label="$t('report.dashboardReports.accounts.entered')")
      table.dri-table
        tbody
          tr(v-for="(band, i) in bands" :key="band")
            td {{ $t('report.dashboardReports.inventory.band.' + band) }}
            td.dri-n
              b-input(type="number" step="any" size="is-small" :value="inventory.ageing[i]" @input="v => changeAgeing(i, v)")
      p.dri-hint {{ $t('report.dashboardReports.inventory.ageingHint') }}
  .dri-results
    .dri-edu
      .dri-edu-h {{ $t('report.dashboardReports.inventory.whyTitle') }}
      p {{ $t('report.dashboardReports.inventory.why') }}
    .dri-actions
      b-button(type="is-primary" @click="$emit('continue')") {{ $t('report.dashboardReports.inventory.continue') }}
</template>

<script>
/**
 * DashboardReportsInventory — step 3 of the Business Performance Report: what the accounts
 * cannot tell us about stock (item 4.70; the drawing's step 3, in its "until the reader
 * exists" form: the typed fields alone).
 *
 * Stock at cost, turnover and days on the shelf come from the accounts on step 2 and are
 * not asked for again. The inventory-export reader (Cin7 Core, Unleashed) is stage 4; until
 * it exists the slow-or-obsolete figure and the ageing bands are the advisor's, badged as
 * such wherever they print, and a blank ageing table leaves the ageing chart off the page.
 */
import ProvenanceBadge from '~/components/base/ProvenanceBadge.vue'
const { AGEING_BANDS } = require('~/utils/dashboardReportsSavedShape')

export default {
  name: 'DashboardReportsInventory',

  components: { ProvenanceBadge },

  props: {
    /** `{ slowObsolete, ageing: [5] }` */
    inventory: { type: Object, required: true }
  },

  data () {
    return { bands: AGEING_BANDS }
  },

  methods: {
    /** @param {*} v @returns {number|null} */
    toNumber (v) {
      if (v === '' || v === null || v === undefined) { return null }
      const n = parseFloat(v)
      return Number.isFinite(n) ? n : null
    },
    /** @param {string} key @param {*} value */
    change (key, value) {
      // change: the whole inventory object with one field replaced
      this.$emit('change', Object.assign({}, this.inventory, { [key]: this.toNumber(value) }))
    },
    /** @param {number} i @param {*} value */
    changeAgeing (i, value) {
      const ageing = this.inventory.ageing.slice()
      ageing[i] = this.toNumber(value)
      // change: the whole inventory object with one ageing band replaced
      this.$emit('change', Object.assign({}, this.inventory, { ageing }))
    }
  }
}
</script>

<style scoped>
.dri-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .dri-layout { grid-template-columns: 1fr; } }
.dri-card { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); }
.dri-group { padding: 15px 16px; border-bottom: 1px solid var(--rs-line); }
.dri-group:last-child { border-bottom: 0; }
.dri-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.dri-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.dri-h2 { margin: 0; font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.dri-hint { font-size: 12px; color: var(--rs-muted); margin: 6px 0 0; }
.dri-lbl { font-size: 12.5px; font-weight: 600; margin: 12px 0 6px; }
.dri-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.dri-table td { padding: 5px 8px; border-bottom: 1px solid var(--rs-line); }
.dri-n { width: 130px; }
.dri-results { display: flex; flex-direction: column; gap: 16px; }
.dri-edu { border-left: 3px solid var(--rs-accent-bright); background: var(--rs-accent-soft); border-radius: 0 9px 9px 0; padding: 15px 17px; }
.dri-edu-h { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--rs-accent); margin-bottom: 8px; }
.dri-edu p { margin: 0; font-size: 14px; line-height: 1.6; }
.dri-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
</style>
