'use strict'

/**
 * @file The Stats NZ benchmarker dataset in force — the shipped release, or the one the
 *   mentor uploaded over it (item 4.70 stage 3, Brief P9).
 * @module server/utils/benchmarkerStore
 *
 * MENTOR TIER ALONE, and here that is the whole design rather than the default: the
 * benchmarker is one published national table, replaced each release, and no firm has a
 * different Stats NZ. So there is no cascade to walk — the platform scope's stored dataset
 * is the dataset, and the shipped file (`data/statsnz-benchmarker-2025.json`) is what every
 * reader gets until a mentor uploads a newer release. Version history and restore come
 * with the overlay store for free.
 *
 * NEVER REJECTS, like the thresholds and the ladder: a store fault falls back to the shipped
 * file, because a benchmark read must not cost a client their report.
 */

const { isBenchmarkerDataset } = require('../report/benchmarks/statsNzBenchmarker')
const BASE_FILE = require('../../data/statsnz-benchmarker-2025.json')
const { PLATFORM_SCOPE } = require('./platformScope')

/** The shipped dataset, its `_readme` stripped so the file's own notes never reach a response. */
const BASE_BENCHMARKER = Object.keys(BASE_FILE)
  .filter(k => k.charAt(0) !== '_')
  .reduce((out, k) => { out[k] = BASE_FILE[k]; return out }, {})

/** The overlay address the mentor's upload is stored under. */
const CONFIG_KEY = 'statsnz-benchmarker'

/**
 * The dataset in force.
 * @param {function(string, string): Promise<Object|null>} loadConfig - the overlay reader
 *   (scopeId, key) → stored value or null; injected so tests need no database.
 * @returns {Promise<object>} the stored dataset when it is one this module wrote, else the shipped one.
 */
async function loadBenchmarker (loadConfig) {
  let stored = null
  try {
    stored = await loadConfig(PLATFORM_SCOPE, CONFIG_KEY)
  } catch (err) {
    console.error('[benchmarker] platform read failed:', err.message)
    return BASE_BENCHMARKER
  }
  return isBenchmarkerDataset(stored) ? stored : BASE_BENCHMARKER
}

/** The one-line summary a manager's screen shows. @param {object} dataset */
function summaryOf (dataset) {
  return { source: dataset.source, year: dataset.year, provisional: dataset.provisional, counts: dataset.counts }
}

module.exports = { BASE_BENCHMARKER, CONFIG_KEY, PLATFORM_SCOPE, loadBenchmarker, summaryOf }
