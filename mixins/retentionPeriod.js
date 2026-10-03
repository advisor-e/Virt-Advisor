/**
 * How long a firm keeps meeting transcripts, in the reader's language — item 13.12.
 *
 * The backend sends the number of months and nothing else; the words are
 * `locales/en.json` → `retentionPeriod`. Until 2026-10-03 the backend sent its own English
 * phrase, so a German reader met "18 months" inside the consent screen's privacy sentence.
 *
 * Shared by the consent panel, the reports screen and the manager's Meeting Review tab, so
 * the period reads the same everywhere it is quoted.
 */
export default {
  methods: {
    /**
     * @param {*} months - whole months, as the backend resolved them
     * @returns {string} "18 months", "1 month", or '' when there is no usable figure
     */
    retentionPeriod (months) {
      const n = Number(months)
      if (!Number.isInteger(n) || n < 1) { return '' }
      return n === 1 ? this.$t('retentionPeriod.oneMonth') : this.$t('retentionPeriod.nMonths', { n })
    }
  }
}
