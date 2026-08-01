/**
 * staircaseMixin — gives the in-session Advisory Staircase selector the firm's own
 * wording for the five steps.
 *
 * WHY IT EXISTS. The selector used to be built straight from
 * `data/advisory-staircase.json`, baked into the bundle at build time. A firm's
 * saved override reached the backend — it set the complexity ceiling — but never
 * reached the screen, so a firm manager could rename every step and rewrite every
 * description on the Firm Manager Hub tab, save it, see it in version history, and
 * no advisor would ever see a word of it (found 2026-07-31).
 *
 * The load mirrors `mixins/currencyMixin.js`: paint instantly from the platform
 * data file, then refresh from `GET /api/advisor/staircase`. It deliberately does
 * NOT cache in localStorage as the currency does — the selector appears well into a
 * conversation, many seconds after mount, so the request has long since settled,
 * and a cache would only add a way to show a firm stale wording after an edit.
 *
 * The read is firmAuth-guarded but must NEVER break a session: any failure (401,
 * offline, backend down, a nonsense body) silently keeps the platform wording. An
 * advisor mid-session with no staircase to choose from is a dead end.
 *
 * A component that mixes this in gets `staircaseSteps` and must not declare its own
 * — a second copy is precisely how the screen and the engine drifted apart.
 */
import advisoryStaircase from '~/data/advisory-staircase.json'

const TOKEN_KEY = 'advisor_e_token'

/**
 * Put steps into the shape the selector renders.
 *
 * The "Step N: " prefix is not decoration — it is the contract with the backend.
 * The advisor's submitted answer is this label plus its description, and
 * `advisorEngine` reads the step NUMBER back out of that text to resolve the
 * complexity ceiling. Drop the prefix and the engine silently falls back to the
 * default ceiling.
 *
 * @param {Array<Object>} steps - rows with `step`, `name`, `selectorDescription`.
 * @returns {Array<Object>} the same rows with selector `name` + `description`.
 */
function toOptions (steps) {
  return steps.map(s => ({
    ...s,
    name: `Step ${s.step}: ${s.name}`,
    description: s.selectorDescription
  }))
}

/**
 * @param {*} steps
 * @returns {boolean} true only for a list the advisor could actually choose from —
 *   every row needs a number the engine can resolve and a name a human can read.
 */
function isUsable (steps) {
  return Array.isArray(steps) && steps.length > 0 && steps.every(
    s => s && Number.isInteger(s.step) && typeof s.name === 'string' && s.name.trim()
  )
}

export default {
  data () {
    return { staircaseSteps: toOptions(advisoryStaircase.steps) }
  },

  mounted () {
    if (!process.client) { return }
    this.loadFirmStaircase()
  },

  methods: {
    /**
     * Fetch the firm's staircase wording and apply it. Silent on any failure — the
     * platform wording stays and the session continues.
     * @returns {Promise<void>}
     */
    async loadFirmStaircase () {
      try {
        const token = window.localStorage.getItem(TOKEN_KEY) || 'dev-local-bypass'
        const res = await fetch('/api/advisor/staircase', {
          headers: { Authorization: 'Bearer ' + token }
        })
        if (!res.ok) { return }
        const data = await res.json()
        if (data && isUsable(data.steps)) {
          this.staircaseSteps = toOptions(data.steps)
        }
      } catch (e) { /* keep the platform wording — never surface to the session */ }
    }
  }
}
