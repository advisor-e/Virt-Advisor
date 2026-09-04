'use strict'

/**
 * firmOverlay — layered override merge logic.
 *
 * The AI advisor session calls loadFirmConfig(firmId, configKey) to retrieve
 * a firm's JSON override for a given framework section. The caller is
 * responsible for merging this with the platform base using deepMerge().
 *
 * Overlay rule:
 *   - Firms can ADD new keys and OVERRIDE existing values.
 *   - Firms cannot delete platform base keys — only override them.
 *   - Array values are replaced wholesale (not merged element-by-element).
 *   - Nested objects are merged recursively.
 */

const { FRAMEWORK } = require('../../config/integration')
const { PLATFORM_SCOPE } = require('./platformScope')
const { scopeChain } = require('./tierChain')
const db = require('./db')

// ── Merge logic ───────────────────────────────────────────────────────────────
// Lives in ./deepMerge (dependency-free) so content modules can use the same
// rule without requiring this module's MySQL pool; re-exported here unchanged.

const { deepMerge } = require('./deepMerge')

// ── DB operations ─────────────────────────────────────────────────────────────

/**
 * The config keys that CASCADE — where a mentor's stored content is inherited by
 * every firm that has not overridden the same field.
 *
 * design/MENTOR-SAVE-SCOPE-PLAN.md Phase 4, and Mike's ruling of 2026-08-09: a
 * firm holds only the fields it changed, laid over the mentor's, merged at read
 * time. So the mentor's later edits keep reaching a firm for everything that firm
 * has not touched, and a firm's own change still wins and sticks.
 *
 * ⚠ WHY THIS IS A LIST AND NOT "EVERY KEY". The merge rule (deepMerge) expresses a
 * delta only for MAP-SHAPED values, where each entry has an id and an untouched
 * entry can fall through to the layer above. Arrays REPLACE WHOLESALE — that is the
 * documented overlay rule and it is right for a firm editing one config, but it
 * cannot express inheritance: a firm holding a one-item array would blank the
 * mentor's whole set for themselves rather than adding to it. So array-valued keys
 * (`templates`, `coaching-reference`, `advisory-distinctions`, `logic-lab-accepted`)
 * are deliberately absent.
 *
 * ⚠ ALSO ABSENT: the decline/override/own-rows keys behind the Staircase, Quizzes
 * and Distinctions. Those already carry their own inheritance model
 * (`resolveInheritedRows`), which resolves a tier's decisions against a base. Adding
 * a deepMerge fold underneath would apply inheritance twice. They inherit by having
 * the MENTOR's resolved content become their base — a different change, named in the
 * plan rather than smuggled in here.
 *
 * Every key here is a `{ id: value }` map. Adding one that is not is a correctness
 * bug, and tests/unit/cascadingConfig.test.js is what says so.
 */
const CASCADING_CONFIG_KEYS = new Set([
  'domain-support', // firmContent: per-domain sparse overrides
  'logic-trees', // firmContent: per-tree sparse overrides
  'domain-support-sections', // firmManager: { itemId: section } placement
  'logic-tree-sections' // firmManager: { itemId: section } placement
])

/**
 * One scope's stored value for a key, or null. No cascade — the raw read.
 * @param {string} scopeId - a firm id, or the reserved platform scope
 * @param {string} configKey
 * @returns {Promise<*|null>}
 */
async function _readActiveConfig (scopeId, configKey) {
  const [rows] = await db.execute(
    `SELECT config_json
     FROM firm_framework_versions
     WHERE firm_id = ? AND config_key = ? AND is_active = 1
     ORDER BY version DESC
     LIMIT 1`,
    [scopeId, configKey]
  )
  if (rows.length === 0) { return null }
  try {
    return JSON.parse(rows[0].config_json)
  } catch {
    return null
  }
}

/**
 * Load a scope's effective config for a key.
 *
 * For a cascading key (see above) this folds the WHOLE chain, highest tier first,
 * each level laid over the one above it: mentor -> global -> group -> firm. A level
 * that has stored nothing therefore inherits from the level above rather than
 * seeing nothing — which is the whole point of the Mentor Hub, and was not true
 * before Phase 4.
 *
 * The chain comes from tierChain rather than being assumed here
 * (design/MENTOR-TIER-CHAIN-PLAN.md §3.4). ⚠ WITH NO MEMBERSHIP DATA — today —
 * scopeChain returns exactly [PLATFORM_SCOPE, firmId], so this is the same two
 * reads and the same single deepMerge it performed before, in the same order. The
 * middle tiers cost nothing until the master team supplies membership.
 *
 * A read AT the top of the chain never folds onto itself: its chain is [itself].
 *
 * @param {string} firmId - the authenticated scope id, never client-supplied
 * @param {string} configKey
 * @returns {Promise<*|null>} the effective value, or null when no layer holds one
 */
async function loadFirmConfig (firmId, configKey) {
  if (!CASCADING_CONFIG_KEYS.has(configKey)) {
    return _readActiveConfig(firmId, configKey)
  }

  const chain = scopeChain(firmId)
  // No scope id at all — nothing to read, and nothing to guess at.
  if (chain.length === 0) { return null }

  // WALKED BOTTOM-UP: this scope first, then each level above it. The order is
  // deliberate and pinned by tests/unit/cascadingConfig.test.js — a reader
  // checking "did it ask the reserved mentor scope, or did it go rummaging in
  // another firm?" reads the query log in that order. Folding top-down would give
  // the same answer while quietly reversing that log.
  let effective = null
  for (let i = chain.length - 1; i >= 0; i--) {
    const layer = await _readActiveConfig(chain[i], configKey)
    if (layer === null) { continue }
    // `layer` is always HIGHER than what has accumulated, so it goes underneath:
    // nested objects merge, the LOWER level wins on a conflict, and a field it
    // never touched still comes from above. The first layer found becomes the base
    // rather than being merged onto null, so a non-object value survives unchanged.
    effective = effective === null ? layer : deepMerge(layer, effective)
  }

  return effective
}

async function saveFirmConfig (firmId, configKey, configJson, savedBy) {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    await conn.execute(
      `UPDATE firm_framework_versions
       SET is_active = 0
       WHERE firm_id = ? AND config_key = ?`,
      [firmId, configKey]
    )

    const [[{ next_version: nextVersion }]] = await conn.execute(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
       FROM firm_framework_versions
       WHERE firm_id = ? AND config_key = ?`,
      [firmId, configKey]
    )

    await conn.execute(
      `INSERT INTO firm_framework_versions
         (firm_id, config_key, config_json, version, is_active, saved_by)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [firmId, configKey, JSON.stringify(configJson), nextVersion, savedBy]
    )

    // Prune versions beyond the history limit (oldest inactive first). Count from the
    // actual row count — NOT the version number, which climbs forever as rows are pruned
    // and would eventually delete every inactive row, wiping all rollback history.
    const [[{ row_count: rowCount }]] = await conn.execute(
      `SELECT COUNT(*) AS row_count
       FROM firm_framework_versions
       WHERE firm_id = ? AND config_key = ?`,
      [firmId, configKey]
    )
    const pruneCount = rowCount - FRAMEWORK.maxVersionHistory
    if (pruneCount > 0) {
      // 🔴 LIMIT IS BOUND AS A STRING, DELIBERATELY. mysql2's execute() sends a JS number
      // as a DOUBLE in the binary protocol, and MySQL 8.0.22+ refuses a non-integer
      // LIMIT in a prepared statement — ER_WRONG_ARGUMENTS, "Incorrect arguments to
      // mysqld_stmt_execute". Found live 2026-09-04 on MySQL 8.4: the ELEVENTH save of
      // any key hit this line, the transaction rolled back, and the route returned 500.
      // A string is coerced to an integer server-side and works on every version.
      await conn.execute(
        `DELETE FROM firm_framework_versions
         WHERE firm_id = ? AND config_key = ? AND is_active = 0
         ORDER BY version ASC
         LIMIT ?`,
        [firmId, configKey, String(pruneCount)]
      )
    }

    await conn.commit()
    return nextVersion
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/**
 * List every FIRM id that has an ACTIVE config under a given key. Used by the
 * mentor delete-promotion (Stage D) to find the firms that customised a row the
 * mentor is deleting, without a per-firm probe, and by the Logic Lab Report to
 * count how many firms touched each lever. Returns a plain array of ids.
 *
 * ⚠ THE RESERVED PLATFORM SCOPE IS EXCLUDED, and this is the single choke point
 * where that happens — every "which firms…" reader in the app goes through this
 * function, and nothing anywhere queries the `firms` table directly (checked).
 * The mentor's own content is stored in the same table under `__platform__` (see
 * ./platformScope), so without this filter the mentor would be counted as a firm
 * that had customised their own content. That is not a cosmetic miscount: the
 * delete-promotion would treat the mentor's set as a firm to protect, and the
 * Logic Lab Report's whole meaning rests on the firm count — five firms reads as
 * a platform gap, one reads as that firm's preference.
 *
 * Excluded in SQL rather than in JS so a caller cannot forget, and so the row
 * never crosses the wire.
 *
 * @param {string} configKey - e.g. 'distinction-overrides'
 * @returns {Promise<string[]>} real firm ids only, never the platform scope
 */
async function listFirmIdsWithConfigKey (configKey) {
  const [rows] = await db.execute(
    `SELECT DISTINCT firm_id
     FROM firm_framework_versions
     WHERE config_key = ? AND is_active = 1 AND firm_id <> ?`,
    [configKey, PLATFORM_SCOPE]
  )
  return rows.map(r => r.firm_id)
}

async function getVersionHistory (firmId, configKey) {
  const [rows] = await db.execute(
    `SELECT id, version, is_active, saved_by, created_at
     FROM firm_framework_versions
     WHERE firm_id = ? AND config_key = ?
     ORDER BY version DESC
     LIMIT ?`,
    // A string for the same reason as the prune in saveFirmConfig: a number here fails
    // on MySQL 8.0.22+, which made every version-history screen fail to load.
    [firmId, configKey, String(FRAMEWORK.maxVersionHistory)]
  )
  return rows
}

async function restoreVersion (firmId, configKey, versionId) {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const [[target]] = await conn.execute(
      `SELECT config_json FROM firm_framework_versions
       WHERE id = ? AND firm_id = ? AND config_key = ?`,
      [versionId, firmId, configKey]
    )
    if (!target) { throw new Error('Version not found for this firm and config key') }

    await conn.execute(
      `UPDATE firm_framework_versions SET is_active = 0
       WHERE firm_id = ? AND config_key = ?`,
      [firmId, configKey]
    )

    const [[{ next_version: nextVersion }]] = await conn.execute(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
       FROM firm_framework_versions
       WHERE firm_id = ? AND config_key = ?`,
      [firmId, configKey]
    )

    await conn.execute(
      `INSERT INTO firm_framework_versions
         (firm_id, config_key, config_json, version, is_active, saved_by)
       VALUES (?, ?, ?, ?, 1, 'restore')`,
      [firmId, configKey, target.config_json, nextVersion]
    )

    await conn.commit()
    return nextVersion
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

module.exports = {
  deepMerge,
  CASCADING_CONFIG_KEYS,
  loadFirmConfig,
  saveFirmConfig,
  listFirmIdsWithConfigKey,
  getVersionHistory,
  restoreVersion
}
