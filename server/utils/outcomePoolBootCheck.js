'use strict'

/**
 * Refuse to start when firms share outcomes and the pool secret is missing (item 4.97 US6,
 * specs/003-engine-middle-learning-true contracts §Boot check).
 *
 * 🔴 WHY A SERVER THAT WILL NOT START IS THE RIGHT ANSWER. Without `OUTCOME_POOL_SECRET`,
 * `firmToken` throws, every contribution is dropped, and NOTHING SAYS SO: the app runs, the
 * screens render, the switch still reads "Sharing since 11 Sep", and a firm that signed a
 * consent contributes nothing at all. The fault is invisible from every page, which is
 * exactly why it cannot be left to be noticed. Mike's ruling of 2026-09-14: the secret is
 * optional until the first firm shares, required from then, and never changed once set —
 * changing it orphans every row already pooled under the old one.
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
 * Throw if any firm shares outcomes while the pool secret is unset. Called before the
 * listening line in `restify-server.js`, which exits 1 on rejection.
 *
 * Skipped under `NODE_ENV=test`: the suite boots the wiring repeatedly and must not be
 * made to depend on an environment variable or on the store being reachable.
 *
 * @returns {Promise<void>} resolves when it is safe to start
 * @throws {Error} `OUTCOME_POOL_SECRET_REQUIRED` — the message names the COUNT of sharing
 *   firms and never a firm id: a startup log is not a place to put an identifier.
 */
async function assertPoolSecretIfConsented () {
  if (process.env.NODE_ENV === 'test') { return }
  // With the secret set there is nothing to decide, so do not pay for a query per firm.
  if (_secretPresent()) { return }

  let sharing = 0
  try {
    sharing = await _countSharingFirms()
  } catch (err) {
    // The store is not reachable. That is not evidence anyone shares, and boot does not
    // depend on it. The message is deliberately generic — a connection string in a
    // startup log is a leak.
    console.warn('[startup] could not check outcome-sharing consent; starting anyway')
    return
  }

  if (sharing > 0) {
    const err = new Error(
      'OUTCOME_POOL_SECRET is not set but ' + sharing + ' firm(s) share outcomes'
    )
    err.code = 'OUTCOME_POOL_SECRET_REQUIRED'
    throw err
  }
}

module.exports = { assertPoolSecretIfConsented }
