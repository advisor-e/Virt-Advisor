'use strict'

/**
 * Production startup guard (CLAUDE.md §Security; design/ACTIONS.md P1-PROD-GUARD).
 *
 * Refuses to boot in production while insecure dev settings or placeholder
 * secrets are still in place. Pure function — takes the environment and config
 * as arguments and RETURNS the blocking reasons — so it is unit-testable without
 * binding a port. `server/restify-server.js` calls it at startup and exits on any
 * violation.
 */

const PLACEHOLDERS = ['REPLACE_ME', 'REPLACE_ME_WITH_ADVISOR_E_JWT_SECRET']

/**
 * A secret/password is unsafe if it is empty/unset or still a known placeholder.
 * @param {*} value
 * @returns {boolean}
 */
function isPlaceholder (value) {
  return !value || PLACEHOLDERS.includes(String(value))
}

/**
 * Compute the reasons the app must NOT boot. The guard only applies when
 * NODE_ENV === 'production'; otherwise (dev/test) it returns no violations.
 *
 * @param {Object} env - process.env (or a stub)
 * @param {{ AUTH?: { secret?: string }, DB?: { password?: string } }} config
 * @returns {string[]} blocking reasons; empty = safe to boot
 */
function productionStartupViolations (env, config) {
  const e = env || {}
  const violations = []
  if (e.NODE_ENV !== 'production') { return violations }

  if (String(e.ALLOW_DEV_AUTH) === 'true') {
    violations.push('ALLOW_DEV_AUTH=true is forbidden in production (it bypasses Advisory auth)')
  }
  const secret = config && config.AUTH ? config.AUTH.secret : undefined
  if (isPlaceholder(secret)) {
    violations.push('JWT signing secret is unset/placeholder — set JWT_SECRET')
  }
  const dbPassword = config && config.DB ? config.DB.password : undefined
  if (isPlaceholder(dbPassword)) {
    violations.push('MySQL password is unset/placeholder — set MYSQL_PASSWORD')
  }
  return violations
}

module.exports = { productionStartupViolations, isPlaceholder, PLACEHOLDERS }
