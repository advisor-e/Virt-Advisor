/**
 * fetchWithTimeout — a browser fetch that gives up instead of waiting for ever.
 *
 * WHY THIS EXISTS (2026-07-29). `fetch()` has no timeout of its own: a request that
 * is never answered leaves its promise pending for the life of the page. Every screen
 * in this app follows the same `loading = true … finally { loading = false }` shape,
 * so a pending promise means the spinner never stops and the user is told nothing at
 * all. That is the exact failure this workstream spent the day removing from the
 * backend (the `.catch(() => [[]])` swallows) — a fault that renders as "still
 * working" rather than saying what went wrong.
 *
 * Found live: the My Progress screen span for ever with no error anywhere. The cause
 * was the browser, not the app — Chrome allows only SIX simultaneous connections per
 * host, and in development every open tab permanently holds one for hot-reload. With
 * all six taken, the request was queued in the browser and never sent. Nothing was
 * broken, and nothing said so.
 *
 * ABORTING MATTERS, not just rejecting. Abandoning the request without aborting it
 * would leave it holding one of those six connection slots, so a screen that timed
 * out would make the next screen likelier to time out too. Where the browser provides
 * AbortController we cancel the request; where it does not, we still stop waiting.
 *
 * Note the error is a plain Error carrying a `name`, not an `extends Error` subclass:
 * transpiling a built-in subclass breaks `instanceof` on older targets, and this file
 * runs in whatever browser the advisor happens to have.
 */

/** Long enough for a slow page-render call (CLAUDE.md caps those at 2000ms), short
 *  enough that a stuck request is reported while the user is still looking at it. */
export const DEFAULT_TIMEOUT_MS = 15000

/**
 * Build the error a timed-out request rejects with.
 *
 * @param {number} ms - the limit that was exceeded.
 * @returns {Error} an Error with `name = 'RequestTimeoutError'` and `isTimeout = true`.
 */
export function timeoutError (ms) {
  const err = new Error('Request timed out after ' + ms + 'ms')
  err.name = 'RequestTimeoutError'
  err.isTimeout = true
  return err
}

/**
 * `fetch`, but rejecting once `timeoutMs` has passed with no response.
 *
 * Callers need no new branch: a timeout rejects, so it lands in the same `catch` that
 * already handles "no network at all" and produces the same honest message. The point
 * is only that the wait ends.
 *
 * @param {string} url - request URL, same as fetch's first argument.
 * @param {Object} [options] - fetch init. An explicit `signal` is respected and left
 *   alone; the timeout still fires, it just cannot abort a request the caller owns.
 * @param {number} [timeoutMs] - limit in ms; a non-positive or non-numeric value
 *   falls back to DEFAULT_TIMEOUT_MS rather than disabling the timeout, because
 *   "no limit" is the behaviour this exists to prevent.
 * @returns {Promise<Response>} resolves with the response, or rejects — with the
 *   timeout error, or with whatever fetch itself rejected with.
 */
export function fetchWithTimeout (url, options, timeoutMs) {
  const limit = (typeof timeoutMs === 'number' && timeoutMs > 0)
    ? timeoutMs
    : DEFAULT_TIMEOUT_MS

  const opts = Object.assign({}, options || {})

  // Only supply a signal when the caller has not; overwriting theirs would silently
  // take away their own cancellation.
  const controller = (typeof AbortController === 'function' && !opts.signal)
    ? new AbortController()
    : null
  if (controller) { opts.signal = controller.signal }

  return new Promise(function (resolve, reject) {
    // One-shot guard: whichever of the two finishes first wins, and the loser is
    // ignored. Without it an abort would reject a promise the response had settled.
    let settled = false

    const timer = setTimeout(function () {
      if (settled) { return }
      settled = true
      if (controller) {
        try { controller.abort() } catch (e) { /* aborting is best-effort */ }
      }
      reject(timeoutError(limit))
    }, limit)

    Promise.resolve()
      .then(function () { return fetch(url, opts) })
      .then(function (res) {
        if (settled) { return }
        settled = true
        clearTimeout(timer)
        resolve(res)
      })
      .catch(function (err) {
        if (settled) { return }
        settled = true
        clearTimeout(timer)
        reject(err)
      })
  })
}
