/**
 * DEV/TEST-ONLY seeding of the firm membership map.
 *
 * @module server/utils/devFirmMembership
 *
 * WHY THIS EXISTS. The Global Group Manager and Group Manager hubs answer one
 * question before they can show anything: "which firms are below me?" That is
 * answered by tierChain's membership map, and nothing in the running app has ever
 * filled it — real membership needs a group/country column on the `firms` table and
 * matching JWT claims, neither of which the master app supplies yet (see
 * config/db-schema.sql). Until then both hubs are correctly, and permanently, empty
 * in development, which makes their layout impossible to review.
 *
 * 🔴 WHY IT IS GATED TWICE. Membership decides the STORAGE SCOPE a manager's saves
 * resolve to. If a seeded map were ever in force in a real deployment, one firm's
 * edits could be written into a whole country's scope and every firm in that country
 * would inherit them — the exact accident the fail-closed tier design exists to
 * prevent. So this loader is inert unless BOTH:
 *
 *   NODE_ENV !== 'production'   AND   ALLOW_DEV_AUTH === 'true'
 *
 * which is deliberately the SAME condition that admits the dev tokens in
 * server/middleware/firmAuth.js. That is not a coincidence to be tidied away: the
 * only identities that can reach either hub are those dev tokens, so seeding
 * membership under any weaker condition would be seeding it for nobody. Forgetting
 * to set NODE_ENV cannot expose it, because ALLOW_DEV_AUTH must also be set, and
 * production never sets it.
 *
 * This module is called ONCE at start-up. Nothing in a request path may call it —
 * see the warning on tierChain.setFirmMembership.
 */

const fs = require('fs')
const path = require('path')
const { setFirmMembership } = require('./tierChain')

// Overridable so a test can point at a fixture without writing to data/.
const DEV_MEMBERSHIP_FILE = process.env.FIRM_MEMBERSHIP_DEV_FILE
  ? path.resolve(process.env.FIRM_MEMBERSHIP_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-firm-membership.json')

/**
 * Whether seeded membership may be loaded at all.
 *
 * Read at call time rather than at module load, so a test can flip the environment
 * and see the answer change — and so a production process can never carry a value
 * decided before its config was read.
 *
 * @returns {boolean}
 */
function devMembershipEnabled () {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH === 'true'
}

/**
 * Keep only entries that are shaped like a membership row.
 *
 * A malformed entry is DROPPED rather than defaulted. Guessing a firm's country
 * would place its manager's edits in a scope nobody chose, which is worse than the
 * firm simply not appearing under any tier.
 *
 * @param {*} raw the parsed `membership` object
 * @returns {Object.<string, {globalGroup: string, country: string}>}
 */
function _sanitise (raw) {
  const out = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { return out }
  Object.keys(raw).forEach((firmId) => {
    const row = raw[firmId]
    if (!row || typeof row !== 'object') { return }
    const globalGroup = row.globalGroup
    const country = row.country
    if (typeof globalGroup !== 'string' || globalGroup.length === 0) { return }
    if (typeof country !== 'string' || country.length === 0) { return }
    out[firmId] = { globalGroup, country }
  })
  return out
}

/**
 * Load the dev membership file into tierChain, if permitted.
 *
 * A missing file is not a fault — it is a developer who has never set one up, and
 * the two middle hubs then behave exactly as they do without this module: empty,
 * reporting `awaitingFirms`.
 *
 * @returns {{loaded: boolean, firms: number, reason: (string|null)}} what happened,
 *   so the caller can say so on the console rather than seed silently. Seeding
 *   invisibly is how a developer ends up reviewing a screen full of invented firms
 *   believing they are real.
 */
function loadDevFirmMembership () {
  if (!devMembershipEnabled()) {
    return { loaded: false, firms: 0, reason: 'disabled' }
  }

  let raw
  try {
    raw = fs.readFileSync(DEV_MEMBERSHIP_FILE, 'utf8')
  } catch (e) {
    if (e.code === 'ENOENT') { return { loaded: false, firms: 0, reason: 'no-file' } }
    return { loaded: false, firms: 0, reason: e.message }
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    return { loaded: false, firms: 0, reason: 'unparseable: ' + e.message }
  }

  const map = _sanitise(parsed && parsed.membership)
  const firms = Object.keys(map).length
  if (firms === 0) { return { loaded: false, firms: 0, reason: 'no-valid-entries' } }

  setFirmMembership(map)
  return { loaded: true, firms, reason: null }
}

module.exports = {
  loadDevFirmMembership,
  // Exported for tests and for anything needing to reason about the gate.
  devMembershipEnabled,
  DEV_MEMBERSHIP_FILE
}
