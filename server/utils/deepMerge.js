'use strict'

/**
 * @file deepMerge — the layered-override merge rule, in a dependency-free home.
 * @module server/utils/deepMerge
 *
 * Moved verbatim from firmOverlay.js (which re-exports it, so its API is
 * unchanged) so that content modules can merge firm overlays without pulling
 * the MySQL pool into their require chain — firmOverlay requires ./db, which
 * creates the pool at require time.
 *
 * Overlay rule:
 *   - Firms can ADD new keys and OVERRIDE existing values.
 *   - Firms cannot delete platform base keys — only override them.
 *   - Array values are replaced wholesale (not merged element-by-element).
 *   - Nested objects are merged recursively.
 */

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

module.exports = { deepMerge }
