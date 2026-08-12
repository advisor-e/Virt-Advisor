'use strict'

/**
 * dbFailure — tells apart "there is no database here" from "the database
 * answered, and said no".
 *
 * 🔴 WHY THIS EXISTS. Every store in this app has a dev fallback: when a query
 * fails and we are not in production, it reads or writes a gitignored
 * `data/dev-*.json` file instead, so the app is usable on a developer machine
 * with no MySQL. That is a good affordance and it is not being removed.
 *
 * The defect is that the fallback could not tell the two cases apart. Its only
 * test was `NODE_ENV !== 'production'`, so ANY failure was treated as "no
 * database" — including a failure where MySQL was present, reachable, and had
 * deliberately REFUSED the write. A save would then land in a scratch file and
 * the route would report success.
 *
 * That is not theoretical. Every management tier needs a reserved row in
 * `firms` before anything can be stored against its scope (see
 * `config/db-schema.sql`, and §6 of `design/ADVISOR-E-DESIGN-LOGIC.md`). Miss
 * the insert and MySQL rejects each save with a foreign-key error — errno 1452,
 * sqlState '23000' — which the old gate read as "no database", wrote to a local
 * file, and reported as saved. The mentor's own saves ran silently broken for
 * weeks exactly this way, and the same trap was waiting for whoever set up the
 * two middle tiers in UAT: the screens would have looked perfect while nothing
 * reached the database at all. A false pass is worse than a failure, because a
 * failure gets fixed and a false pass gets signed off.
 *
 * THE DISCRIMINATOR IS `sqlState`, and the choice is deliberate. A rejection
 * from a live MySQL server always carries one — a five-character SQL-standard
 * class ('23000' integrity constraint, '42S02' no such table, '22001' data too
 * long). A connection-level failure never does: mysql2 surfaces ECONNREFUSED,
 * ENOTFOUND, ETIMEDOUT and friends with a `code` and no `sqlState`, because no
 * server was ever reached to answer. `code` alone cannot be used — connection
 * errors and server rejections both set it.
 *
 * The rule this produces:
 *   • no sqlState  → nothing answered  → the dev fallback may run (dev only)
 *   • sqlState set → the server refused → NEVER fall back; let it throw
 *
 * Errors that are neither (a bare `new Error('no db in this test')`, a thrown
 * string) have no sqlState and so permit the fallback. That is the safe
 * direction: it preserves today's behaviour for everything except the one case
 * this module exists to catch, and it is what the existing dev-fallback tests
 * rely on.
 */

/**
 * Did a live database server answer this request and refuse it?
 *
 * @param {*} err - whatever was caught; any value is safe to pass
 * @returns {boolean} true when the error carries a MySQL `sqlState`, meaning a
 *   server processed the statement and rejected it
 */
function isDatabaseRefusal (err) {
  return !!(err && typeof err.sqlState === 'string' && err.sqlState.length > 0)
}

/**
 * May a dev fallback run for this failure?
 *
 * Both conditions must hold: we are not in production, AND no live server
 * refused the statement. Callers use it in place of a bare NODE_ENV check:
 *
 *   catch (err) {
 *     if (devFallbackAllowed(err)) { return readTheDevFile() }
 *     throw err
 *   }
 *
 * @param {*} err - the caught error
 * @returns {boolean}
 */
function devFallbackAllowed (err) {
  if (process.env.NODE_ENV === 'production') { return false }
  return !isDatabaseRefusal(err)
}

module.exports = { isDatabaseRefusal, devFallbackAllowed }
