import { matchReason } from '~/utils/traceReasonCodes'

/**
 * traceReasonMixin — turns the engine's score-reason codes into the sentence a
 * reader sees in the decision-trace panel's "Why" column.
 *
 * WHY IT EXISTS. The adviser's live panel and the saved case in Firm Manager show
 * the same table of template scores. Until 2026-08-04 each had its own idea of what
 * to do with the reason codes: VirtualAdvisor translated 7 of the engine's 26 in a
 * local method, and FirmManagerHub joined the raw codes with commas, so a firm
 * manager read `tag:profit, domain:primary_subsection` where the adviser read
 * something in English. One mapping, reached from both, is the fix.
 *
 * The words live in `locales/en.json` under `decisionTrace.reason*`, so all 8
 * locales get them — a phrase built in JavaScript, as these were, never reaches the
 * translation service at all.
 *
 * @see utils/traceReasonCodes.js for the code→key table
 * @see design/WORDING-TRACE-REASONS.md for the approved wording and the five rulings
 */
export default {
  methods: {
    /**
     * @param {Array<string>} reasons a template's `matchReasons` from the trace
     * @returns {string} the reasons in English, comma-separated; an unrecognised code
     *   passes through unchanged rather than being dropped
     */
    humanizeReasons (reasons) {
      return (Array.isArray(reasons) ? reasons : [])
        .map((code) => {
          const hit = matchReason(code)
          if (hit) { return this.$t(hit.key, hit.params) }
          // Not a string, or a code this table has never seen: show what the engine
          // wrote. A reason a reader cannot parse still beats a reason that silently
          // is not there.
          return typeof code === 'string' ? code : ''
        })
        .filter(Boolean)
        .join(', ')
    }
  }
}
