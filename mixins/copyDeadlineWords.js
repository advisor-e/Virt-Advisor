/**
 * copyDeadlineWords — a client copy request's deadline and countdown, worded on the screen
 * (item 10.2). The backend sends facts only: `{ count, unit }` for the firm's response time
 * and `{ remaining, unit, overdue }` for a request's clock. Wording them here is what lets
 * the hub read "20 Arbeitstage" to a German manager, where the backend used to send
 * "20 working days" whatever the reader's language.
 *
 * Shared by the firm's list (FirmClientCopyRequests) and one request's view
 * (ClientCopyRequestDetail), which show the same clock. The English is the backend's former
 * wording, word for word, singular included — "1 working days left" on a screen counting down
 * to a legal deadline reads as carelessness about the deadline itself.
 */

/** The unit a clock or deadline falls back to when it arrives without a known one. */
const FALLBACK_UNIT = 'calendar-days'
const UNITS = ['working-days', 'calendar-days', 'calendar-months']

export default {
  methods: {
    /**
     * "20 working days", "1 calendar month".
     * @param {{count: number, unit: string}} deadline
     * @returns {string} '' when there is no figure to word
     */
    deadlineWords (deadline) {
      if (!deadline || typeof deadline.count !== 'number') { return '' }
      const unit = UNITS.includes(deadline.unit) ? deadline.unit : FALLBACK_UNIT
      return this.$tc('firmClientCopyRequests.units.' + unit, deadline.count, { count: deadline.count })
    },

    /**
     * A unit on its own, for the response-time dropdown — "working days".
     * @param {string} unit
     * @returns {string}
     */
    unitName (unit) {
      return UNITS.includes(unit) ? this.$t('firmClientCopyRequests.unitNames.' + unit) : unit
    },

    /**
     * The clock — "4 working days left", "2 days overdue", "due today".
     * @param {{remaining: number, unit: string}} clock
     * @returns {string} '' when there is no clock
     */
    clockWords (clock) {
      if (!clock || typeof clock.remaining !== 'number') { return '' }
      if (clock.remaining === 0) { return this.$t('firmClientCopyRequests.clock.dueToday') }
      const amount = this.deadlineWords({ count: Math.abs(clock.remaining), unit: clock.unit })
      return this.$t(clock.remaining < 0 ? 'firmClientCopyRequests.clock.overdue' : 'firmClientCopyRequests.clock.left', { amount })
    }
  }
}
