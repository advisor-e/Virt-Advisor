import debounce from 'lodash/debounce'

/**
 * reportRecompute — shared, race-safe backend recompute for the report screens.
 *
 * Every report recomputes on the Restify backend after each input change (calc is
 * backend-only per the Stack Constitution). This mixin owns the three things the
 * reports were each hand-rolling — and the older ones got subtly wrong:
 *
 *   1. a DEBOUNCE, so dragging a slider doesn't flood the backend;
 *   2. a monotonic REQUEST STAMP, so a slow *older* response can never overwrite a
 *      newer one (the "slider race" — R10; the pre-mixin older reports had no guard);
 *   3. the STALE `error` flag the template greys the figures with on a failed recompute.
 *
 * A consuming report provides two methods and reads one flag:
 *   - `recomputeRequest()` → `{ url, body }` — the POST to make, or a falsy value to
 *     skip this run (e.g. nothing staged yet).
 *   - `applyResult(data)` → assign the successful `json.data` to the report's own state.
 *   - `error` (from this mixin) → true when the last recompute failed → show stale banner.
 *
 * The report drives it via `this.recompute()` (e.g. a Retry button) and
 * `this.queueRecompute()` (from its input watcher). Optional `recomputeDelay` (ms)
 * overrides the 250 ms default. This mixin deliberately does NOT define `mounted` —
 * each report fires the first recompute itself (some seed extra state first).
 */
export default {
  data () {
    return { error: false }
  },

  created () {
    // Non-reactive by design — a stamp, not rendered state.
    this._reqSeq = 0
    this._debouncedRecompute = debounce(this.recompute, this.recomputeDelay || 250)
  },

  beforeDestroy () {
    if (this._debouncedRecompute) { this._debouncedRecompute.cancel() }
  },

  methods: {
    /** Queue a debounced recompute — call from the input watcher. */
    queueRecompute () {
      this._debouncedRecompute()
    },

    /**
     * Recompute now. POSTs the report's request and applies the result ONLY if this
     * request is still the newest — a superseded slow response is discarded, so the
     * screen can never show figures from an out-of-date request.
     * @returns {Promise<void>}
     */
    recompute () {
      const spec = this.recomputeRequest()
      if (!spec) { return Promise.resolve() }
      const seq = ++this._reqSeq
      return fetch(spec.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spec.body)
      })
        .then(res => res.json())
        .then((json) => {
          if (seq !== this._reqSeq) { return } // superseded — discard
          if (json && json.success) {
            this.applyResult(json.data)
            this.error = false
          } else {
            this._flagRecomputeError()
          }
        })
        .catch(() => { if (seq === this._reqSeq) { this._flagRecomputeError() } })
    },

    /**
     * Flag a failed recompute: set the stale `error` flag (reports with a stale banner
     * grey their figures) and, if the report defines `onRecomputeError()`, call it —
     * reports that surface failures with a toast instead of a banner use that hook.
     */
    _flagRecomputeError () {
      this.error = true
      if (typeof this.onRecomputeError === 'function') { this.onRecomputeError() }
    }
  }
}
