/**
 * firmBrand — the advisor firm's name, logo and colour for a document a client is handed
 * (item 16). One home for the read, so every screen that prints a client's document gets
 * the brand the same way: the Strategy Planner and the Business Performance Report.
 *
 * Mike's rule, 2026-09-18: in client dealings the brand is ALWAYS the advisor's firm,
 * never Advisor-e. The values live on the firm profile page in the Advisor-e master app;
 * `GET /api/report/firm/brand` reads them (design/features/white-label.md §1).
 *
 * ⚠ IT NEVER BLOCKS THE PAGE. A brand is decoration on a screen whose figures matter, so
 * a failure leaves the nulls in place and the document prints with the initials disc or
 * the placeholder. There is no error message and no retry: a logo that did not load is
 * not something an advisor can act on (white-label.md §2).
 */
export default {
  data () {
    return {
      /**
       * Nulls are the honest resting state: `logo` null means the initials disc shows
       * (Mike's ruling, 2026-09-22), `colour` null means the platform colour, and `name`
       * null means the placeholder. The route answers 200 with nulls on any failure.
       */
      firmBrand: { name: null, logo: null, colour: null }
    }
  },

  methods: {
    /**
     * Read the brand once. Call from `mounted()` only — `fetch` and the token are
     * browser-side.
     *
     * @route GET /api/report/firm/brand (firmOrEntityAuth — an advisor's or a client's
     *   own sign-in, scoped to the firm in its verified token)
     * @param {Object} headers the request headers, carrying the caller's Bearer token
     * @returns {Promise<void>} resolves once `firmBrand` holds whatever could be read.
     */
    async loadFirmBrand (headers) {
      try {
        const res = await fetch('/api/report/firm/brand', { credentials: 'same-origin', headers })
        if (!res.ok) { return }
        const body = await res.json()
        this.firmBrand = {
          name: typeof body.name === 'string' ? body.name : null,
          logo: typeof body.logo === 'string' ? body.logo : null,
          colour: typeof body.colour === 'string' ? body.colour : null
        }
      } catch (e) {
        // Deliberately silent — see the note above.
      }
    }
  }
}
