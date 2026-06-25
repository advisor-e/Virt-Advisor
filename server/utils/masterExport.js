'use strict'
/**
 * Master-export discovery — the single source of truth for WHERE the firm's master
 * template export lives and WHICH file is current.
 *
 * The export (search_content_<YYYYMMDDHHMMSS>.json) is dropped into the
 * `Central Frameworks/` folder, alongside the source PDFs it is generated from. It
 * is re-exported with a fresh timestamp each time, so callers must always discover
 * the NEWEST by pattern — never hardcode a filename, which silently goes stale after
 * the next re-export (this helper exists precisely to retire those hardcoded names).
 *
 * Note: the running app does NOT read the export directly — it reads the tracked
 * 1:1 mirror at data/templates.json. This helper is for the dev-time ghost-reference
 * validator and the content audit/migration scripts, which check the logic trees
 * against the raw export. The export itself is gitignored (firm-specific master
 * data), so on a fresh clone / CI no file is present and these helpers return null;
 * callers must handle that.
 */

const { readdirSync, readFileSync } = require('fs')
const { resolve } = require('path')

// The one place that knows where master exports live. Change here only.
const EXPORT_DIR = 'Central Frameworks'
const EXPORT_RE = /^search_content_\d+\.json$/

/**
 * @returns {string|null} absolute path to the newest export, or null if none found
 */
function findLatestSearchContentPath () {
  let files
  try {
    files = readdirSync(resolve(process.cwd(), EXPORT_DIR))
  } catch (e) {
    return null // folder missing (e.g. CI) — caller handles the null
  }
  // Timestamps are zero-padded, so a descending lexical sort = newest first.
  const matches = files.filter(f => EXPORT_RE.test(f)).sort().reverse()
  return matches.length > 0 ? resolve(process.cwd(), EXPORT_DIR, matches[0]) : null
}

/**
 * @returns {Array|null} parsed newest export, or null if none found / unreadable
 */
function loadLatestSearchContent () {
  const path = findLatestSearchContentPath()
  if (!path) { return null }
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    return null
  }
}

module.exports = { findLatestSearchContentPath, loadLatestSearchContent, EXPORT_DIR }
