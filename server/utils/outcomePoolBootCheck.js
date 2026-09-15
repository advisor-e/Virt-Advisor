'use strict'

/**
 * Refuse to start when firms share outcomes and the pool secret is missing (item 4.97 US6,
 * specs/003-engine-middle-learning-true contracts §Boot check).
 *
 * 🔴 THE FEATURE STOPS; THE APP DOES NOT (Mike's ruling, 2026-09-15). Asked whether a missing
 * secret should stop the server, his answer was that one firm's data must never reach another
 * — "can the app still function elsewhere and just THAT FUNCTION shut down with a
 * notification / warning so the rest can still be used?" So this warns loudly and starts.
 *
 * 🔴 WHY THAT IS SAFE, AND IT IS NOT A JUDGEMENT CALL. Pooled sharing cannot leak without the
 * secret because it cannot be ADDRESSED without it: every pooled read and write derives its
 * key through `firmToken`, which throws on a missing secret, and the consent route refuses to
 * switch sharing on at all. The protection is structural, not a flag someone remembered to
 * check. What was missing was never safety — it was that NOTHING SAID SO: the app ran, the
 * screens rendered, the switch still read "Sharing since 11 Sep", and a firm that signed a
 * consent contributed nothing. That is what the warning here and the notice on the consent
 * screen now answer, in the place a person actually looks.
 *
 * Mike's ruling of 2026-09-14 stands unchanged on the secret itself: optional until the first
 * firm shares, required from then, and never changed once set — changing it orphans every row
 * already pooled under the old one. This file no longer decides whether the server lives; it
 * decides how loudly the gap is announced.
 *
 * 🔴 AND WHY IT MUST NOT MAKE BOOT DEPEND ON THE STORE. A database that cannot be reached
 * at startup is not evidence that anyone shares. Refusing to start on an unreadable store
 * would trade a silent pooling fault for a total outage of an app whose main job has
 * nothing to do with the pool. So every read failure here resolves, with a warning.
 */

const overlay = require('./firmOverlay')
const { CONFIG_KEY, contributionOpen } = require('./outcomeConsent')

/**
 * Whether the pool secret is present. An empty string is missing — it would key every
 * pooled row under nothing, which is worse than refusing.
 * @returns {boolean}
 */
function _secretPresent () {
  const secret = process.env.OUTCOME_POOL_SECRET
  return typeof secret === 'string' && secret.length > 0
}

/**
 * Count the firms whose consent is on. A firm whose record cannot be read is skipped
 * rather than guessed at in either direction.
 * @returns {Promise<number>}
 */
async function _countSharingFirms () {
  const firmIds = await overlay.listFirmIdsWithConfigKey(CONFIG_KEY)
  const flags = await Promise.all(firmIds.map(firmId =>
    Promise.resolve()
      .then(() => overlay.loadFirmConfig(firmId, CONFIG_KEY))
      .then(stored => contributionOpen(stored))
      .catch(() => false)
  ))
  return flags.filter(Boolean).length
}

/**
 * Warn — loudly — if any firm shares outcomes while the pool secret is unset, and let the
 * server start. Called before the listening line in `restify-server.js`.
 *
 * NEVER REJECTS. Pooled sharing is already incapable of writing without the secret (see this
 * file's header), so the server dying added no protection and took every other feature down
 * with it. The warning is the whole job.
 *
 * Skipped under `NODE_ENV=test`: the suite boots the wiring repeatedly and must not be
 * made to depend on an environment variable or on the store being reachable.
 *
 * @returns {Promise<{ok: boolean, sharing: number}>} `ok:false` with the COUNT of sharing
 *   firms when the secret is missing and someone shares — never a firm id, because a startup
 *   log is not a place to put an identifier. Returned rather than only logged so a caller
 *   (and the test) can assert on it.
 */
async function assertPoolSecretIfConsented () {
  if (process.env.NODE_ENV === 'test') { return { ok: true, sharing: 0 } }
  // With the secret set there is nothing to decide, so do not pay for a query per firm.
  if (_secretPresent()) { return { ok: true, sharing: 0 } }

  let sharing = 0
  try {
    sharing = await _countSharingFirms()
  } catch (err) {
    // The store is not reachable. That is not evidence anyone shares, and boot does not
    // depend on it. The message is deliberately generic — a connection string in a
    // startup log is a leak.
    console.warn('[startup] could not check outcome-sharing consent; starting anyway')
    return { ok: true, sharing: 0 }
  }

  if (sharing > 0) {
    console.warn(
      '[startup] WARNING: shared outcome learning is SWITCHED OFF — OUTCOME_POOL_SECRET is ' +
      'not set and ' + sharing + ' firm(s) have consented to share. Nothing is being pooled ' +
      'and nothing can be: every pooled read and write needs the secret to derive its key. ' +
      'No other feature is affected. Set the secret to turn shared learning back on.'
    )
    return { ok: false, sharing }
  }
  return { ok: true, sharing: 0 }
}

module.exports = { assertPoolSecretIfConsented }
