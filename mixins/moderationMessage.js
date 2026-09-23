/**
 * Turns a moderation block from the backend into the sentence a person reads — item 8.2.
 *
 * Every screen that calls the AI can meet a block, and each must say it in the same words: the
 * five messages Mike approved on 2026-09-24 (`design/MODERATION-WORDING.md`). The mapping lives
 * here so there is one of it. The backend half is `server/utils/moderationReport.js`.
 *
 * 🔴 A REPORT THIS BUILD CANNOT DESCRIBE RETURNS null. The caller then shows the message it
 * already showed for any AI failure, rather than a sentence with a hole in it.
 *
 * The words are `locales/en.json` → `moderation`. Nothing here hardcodes English.
 */

/** OpenAI's category names, which carry slashes, to locale keys. */
const CATEGORY_KEYS = {
  'sexual/minors': 'sexualMinors',
  'self-harm/instructions': 'selfHarmInstructions',
  'illicit/violent': 'illicitViolent'
}

const SPEAKERS = ['advisor', 'client', 'unknown']

/**
 * The quoted sentence without its own final full stop, because the approved wording closes the
 * quote with one ('{sentence}'.) and "myself.'." reads as a mistake (Mike, 2026-09-24). A
 * question or exclamation mark is part of what was said, and stays.
 * @param {string} s
 * @returns {string}
 */
function quoted (s) {
  return String(s).replace(/\.\s*$/, '')
}

export default {
  methods: {
    /**
     * Finds a moderation report wherever a response carries it: a JSON error envelope
     * (`body.error.moderation`), a stream event or a background run's error (`x.moderation`).
     * @param {*} payload
     * @returns {object|null}
     */
    moderationReportFrom (payload) {
      if (!payload || typeof payload !== 'object') { return null }
      const r = payload.moderation || (payload.error && typeof payload.error === 'object' ? payload.error.moderation : null)
      return r && typeof r === 'object' && typeof r.kind === 'string' ? r : null
    },

    /**
     * @param {object|null} report - `{ kind, category, sentence?, speaker?, time? }`
     * @returns {string|null} the approved message, or null when it cannot be described
     */
    moderationMessage (report) {
      if (!report) { return null }
      const catKey = CATEGORY_KEYS[report.category]
      if (!catKey) { return null }
      const category = this.$t('moderation.category.' + catKey)

      if (report.kind === 'typed' && report.sentence) {
        return this.$t('moderation.typed', { sentence: quoted(report.sentence), category })
      }
      if (report.kind === 'typedWhole') { return this.$t('moderation.typedWhole', { category }) }
      if (report.kind === 'app') { return this.$t('moderation.app') }
      if (report.kind === 'meeting' && report.sentence && SPEAKERS.includes(report.speaker)) {
        return this.$t('moderation.meeting', {
          speaker: this.$t('moderation.speaker.' + report.speaker),
          time: report.time,
          category,
          sentence: quoted(report.sentence)
        })
      }
      if (report.kind === 'meetingWhole') { return this.$t('moderation.meetingWhole', { category }) }
      return null
    },

    /**
     * Both steps at once, for the common case of a screen holding a failed response.
     * @param {*} payload
     * @returns {string|null}
     */
    moderationMessageFrom (payload) {
      return this.moderationMessage(this.moderationReportFrom(payload))
    }
  }
}
