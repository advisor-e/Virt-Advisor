'use strict'

/**
 * @file The reserved overlay scope that mentor-authored content is stored under.
 * @module server/utils/platformScope
 *
 * The mentor is not a firm, but their content rides the same store as a firm's
 * (`firm_framework_versions`, keyed by `firm_id` + `config_key`) so that version
 * history and one-click restore come free rather than being built twice. The
 * mentor's rows are written under this reserved id.
 *
 * ⚠ IT IS A REAL ROW IN `firms`, and it has to be — the store's `firm_id` column
 * is foreign-keyed to `firms.id`, so an id with no matching firm is REJECTED by
 * MySQL. See the seed block in config/db-schema.sql, which must be run even by an
 * Advisor-e installation that skips our `firms` CREATE TABLE and points the
 * foreign keys at its own table.
 *
 * ⚠ AND IT IS NOT A FIRM. Anything that answers "which firms…" must exclude it —
 * see `listFirmIdsWithConfigKey` in ./firmOverlay, which is the single choke point
 * every such reader goes through today. Counting this row as a firm would make the
 * mentor's own content read as a firm having customised something, which is the
 * exact distinction the Logic Lab Report is built on (five firms reads as a
 * platform gap; one reads as that firm's preference).
 *
 * ONE HOME FOR THE STRING, deliberately. Two modules used to declare their own
 * copy of it (platformDistinctions, templateCheckRulings) and a third was about to.
 * design/MENTOR-SAVE-SCOPE-PLAN.md §3.1.
 */

/**
 * The reserved scope id. Not a valid Advisor-e firm id — the double underscores
 * are what make a collision with a real firm impossible.
 * @type {string}
 */
const PLATFORM_SCOPE = '__platform__'

/**
 * Display name for the reserved row, so the seeded record explains itself to
 * anyone reading the database directly.
 * @type {string}
 */
const PLATFORM_SCOPE_NAME = 'Platform (mentor)'

/**
 * True when a scope id is the reserved platform scope rather than a real firm.
 * @param {string} scopeId
 * @returns {boolean}
 */
function isPlatformScope (scopeId) {
  return scopeId === PLATFORM_SCOPE
}

module.exports = { PLATFORM_SCOPE, PLATFORM_SCOPE_NAME, isPlatformScope }
