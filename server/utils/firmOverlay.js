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
const db = require('./db')

// ── Merge logic ───────────────────────────────────────────────────────────────

function deepMerge (base, override) {
  if (typeof base !== 'object' || base === null) { return override }
  if (typeof override !== 'object' || override === null) { return override }
  if (Array.isArray(override)) { return override }

  const result = { ...base }
  for (const key of Object.keys(override)) {
    const baseVal = base[key]
    const overrideVal = override[key]
    const bothObjects = (
      typeof baseVal === 'object' && baseVal !== null && !Array.isArray(baseVal) &&
      typeof overrideVal === 'object' && overrideVal !== null && !Array.isArray(overrideVal)
    )
    result[key] = bothObjects ? deepMerge(baseVal, overrideVal) : overrideVal
  }
  return result
}

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

    // Prune versions beyond the history limit (oldest inactive first)
    const pruneCount = nextVersion - FRAMEWORK.maxVersionHistory - 1
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
 * List every firm id that has an ACTIVE config under a given key. Used by the
 * mentor delete-promotion (Stage D) to find the firms that customised a row the
 * mentor is deleting, without a per-firm probe. Returns a plain array of ids.
 * @param {string} configKey - e.g. 'distinction-overrides'
 * @returns {Promise<string[]>}
 */
async function listFirmIdsWithConfigKey (configKey) {
  const [rows] = await db.execute(
    `SELECT DISTINCT firm_id
     FROM firm_framework_versions
     WHERE config_key = ? AND is_active = 1`,
    [configKey]
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
