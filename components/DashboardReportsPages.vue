<template lang="pug">
.drp-layout
  aside.drp-card
    .drp-group
      .drp-glabel
        span.drp-dot
        h2.drp-h2 {{ $t('report.dashboardReports.pages.alwaysTitle') }}
      .drp-pg.is-base(v-for="p in basePages" :key="p.key")
        span.drp-cb
        span {{ $t('report.dashboardReports.pages.base.' + p.key) }}
        span.drp-why {{ $t('report.dashboardReports.pages.from.' + p.from) }}
  .drp-results
    .drp-card
      .drp-group
        .drp-glabel
          span.drp-dot
          h2.drp-h2 {{ $t('report.dashboardReports.pages.addTitle') }}
        .drp-pg(v-for="o in optional" :key="o.key" :class="{ 'is-on': o.on, 'is-off': !o.available }")
          b-checkbox(:value="o.on" :disabled="!o.available" @input="v => toggle(o.key, v)")
            | {{ $t('report.dashboardReports.pages.optional.' + o.key) }}
          span.drp-why(:class="{ 'is-ok': o.available }") {{ o.reason }}
        p.drp-hint {{ $t('report.dashboardReports.pages.hint') }}
    .drp-actions
      b-button(type="is-primary" @click="$emit('continue')") {{ $t('report.dashboardReports.pages.continue') }}
</template>

<script>
/**
 * DashboardReportsPages — step 5 of the Business Performance Report: which pages are in
 * it (item 4.70; the drawing's step 5, the add-a-page dropdown drawn as a list).
 *
 * 🔴 A PAGE WHOSE DATA IS ABSENT IS NOT OFFERED (Brief P1). Every optional page carries
 * the reason it can or cannot be added, from `pageAvailability` in the saved-shape util,
 * so the list can never add an empty page. In this build no optional page is available
 * yet — each says what it waits on — and the base pages are the ten the drawing names.
 */
const { OPTIONAL_PAGES } = require('~/utils/dashboardReportsSavedShape')

/** The base pages in report order, each with the step its content comes from. */
const BASE_PAGES = [
  { key: 'cover', from: 'step1' },
  { key: 'summary', from: 'steps2and4' },
  { key: 'dashboard', from: 'step2' },
  { key: 'profitLoss', from: 'step2' },
  { key: 'balanceSheet', from: 'step2' },
  { key: 'cashFlow', from: 'step2' },
  { key: 'inventory', from: 'step3' },
  { key: 'trends', from: 'step2' },
  { key: 'nextSteps', from: 'step4' },
  { key: 'information', from: 'firm' }
]

export default {
  name: 'DashboardReportsPages',

  props: {
    /** `{ added: string[] }` */
    pages: { type: Object, required: true },
    /** `{ [key]: { available: boolean, reason: string } }` per optional page. */
    availability: { type: Object, required: true }
  },

  data () {
    return { basePages: BASE_PAGES }
  },

  computed: {
    optional () {
      return OPTIONAL_PAGES.map((key) => {
        const a = this.availability[key] || { available: false, reason: '' }
        return { key, available: a.available, reason: a.reason, on: this.pages.added.includes(key) }
      })
    }
  },

  methods: {
    /** @param {string} key @param {boolean} on */
    toggle (key, on) {
      const added = this.pages.added.filter(k => k !== key)
      if (on) { added.push(key) }
      // change: the whole pages object with the added list replaced
      this.$emit('change', Object.assign({}, this.pages, { added }))
    }
  }
}
</script>

<style scoped>
.drp-layout { display: grid; grid-template-columns: var(--rs-col-input) 1fr; gap: var(--rs-col-gap); align-items: start; }
@media (max-width: 860px) { .drp-layout { grid-template-columns: 1fr; } }
.drp-card { background: var(--rs-card-bg); border: 1px solid var(--rs-card-border); border-radius: var(--rs-card-radius); }
.drp-group { padding: 15px 16px; }
.drp-glabel { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.drp-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rs-accent-bright); }
.drp-h2 { margin: 0; font-size: var(--rs-card-title-size); letter-spacing: .1em; text-transform: uppercase; color: var(--rs-muted); font-weight: 600; }
.drp-pg { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; padding: 10px 12px; border: 1px solid var(--rs-line); border-radius: 8px; margin-bottom: 8px; font-size: 13.5px; }
.drp-pg.is-base { grid-template-columns: 22px 1fr auto; background: var(--rs-panel-2); }
.drp-pg.is-off { color: var(--rs-muted); }
.drp-pg.is-on { border-color: var(--rs-accent); background: var(--rs-accent-soft); }
.drp-cb { width: 16px; height: 16px; border-radius: 4px; background: var(--rs-muted); }
.drp-why { font-size: 12px; color: var(--rs-muted); text-align: right; }
.drp-why.is-ok { color: var(--rs-good); }
.drp-hint { font-size: 12px; color: var(--rs-muted); margin: 6px 0 0; }
.drp-results { display: flex; flex-direction: column; gap: 16px; }
.drp-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
</style>
