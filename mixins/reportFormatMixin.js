/**
 * reportFormatMixin — the report pages' unit-free formatters (`utils/reportFormat.js`)
 * bound to the reader's language, the way `currencyMixin` binds money (item 13.8).
 *
 * A component that mixes this in gets `pct`, `pctUpTo`, `pct100`, `pts`, `signedPct`,
 * `signedPct100`, `days`, `times` and `ratio2` as methods, with the same arguments as the
 * plain functions minus the locale, which is always `$i18n.locale`. Calling the plain
 * functions directly from a screen writes English digits in every language — the fault this
 * exists to stop.
 *
 * ⚠ A component's own method of the same name silently wins over these (Vue 2 merge
 * order), so a screen adopting the mixin must delete its local `pct`/`percent` first.
 */
const f = require('~/utils/reportFormat')

export default {
  methods: {
    /** @param {number|null} v @param {number} [d] @returns {string} "13.9%" */
    pct (v, d) { return f.pct(v, d, this.$i18n.locale) },
    /** @param {number|null} v @param {number} [d] - at most @returns {string} "80%", "40.1%" */
    pctUpTo (v, d) { return f.pctUpTo(v, d, this.$i18n.locale) },
    /** @param {number|null} v - already ×100 @param {number} [d] @returns {string} "13.9%" */
    pct100 (v, d) { return f.pct100(v, d, this.$i18n.locale) },
    /** @param {number|null} v - points @returns {string} "+0.7 pts", the unit in the reader's language */
    pts (v) { return f.pts(v, this.$i18n.locale, this.$t('report.dashboardReports.doc.pts')) },
    /** @param {number|null} v - a fraction @returns {string} "+12.4%" */
    signedPct (v) { return f.signedPct(v, this.$i18n.locale) },
    /** @param {number|null} v - already ×100 @param {number} [d] @returns {string} "+2.2%" */
    signedPct100 (v, d) { return f.signedPct100(v, this.$i18n.locale, d) },
    /** @param {number|null} v @returns {string} "47" */
    days (v) { return f.days(v, this.$i18n.locale) },
    /** @param {number|null} v @param {number} [d] @returns {string} "5.2×" */
    times (v, d) { return f.times(v, this.$i18n.locale, d) },
    /** @param {number|null} v @returns {string} "0.38" */
    ratio2 (v) { return f.ratio2(v, this.$i18n.locale) }
  }
}
