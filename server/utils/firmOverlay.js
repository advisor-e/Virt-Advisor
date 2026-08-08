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
const db = require('./db')

// ── Merge logic ───────────────────────────────────────────────────────────────
// Lives in ./deepMerge (dependency-free) so content modules can use the same
// rule without requiring this module's MySQL pool; re-exported here unchanged.

const { deepMerge } = require('./deepMerge')

// ── DB operations ─────────────────────────────────────────────────────────────

async function loadFirmConfig (firmId, configKey) {
  const [rows] = await db.execute(
    `SELECT config_json
     FROM firm_framework_versions
     WHERE firm_id = ? AND config_key = ? AND is_active = 1
     ORDER BY version DESC
     LIMIT 1`,
    [firmId, configKey]
  )
  if (rows.length === 0) { return null }
  try {
    return JSON.parse(rows[0].config_json)
  } catch {
    return null
  }
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
      await conn.execute(
        `DELETE FROM firm_framework_versions
         WHERE firm_id = ? AND config_key = ? AND is_active = 0
         ORDER BY version ASC
         LIMIT ?`,
        [firmId, configKey, pruneCount]
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
    [firmId, configKey, FRAMEWORK.maxVersionHistory]
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

module.exports = { deepMerge, loadFirmConfig, saveFirmConfig, listFirmIdsWithConfigKey, getVersionHistory, restoreVersion }
