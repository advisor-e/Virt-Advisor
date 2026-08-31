'use strict'

/**
 * @file Shared validation for a master template-export upload.
 * @module server/utils/templateImport
 *
 * One set of rules for BOTH upload doorways — the firm's own import
 * (server/routes/firmManager.js importTemplates) and the mentor's platform
 * upload (server/routes/mentor.js importPlatformTemplates). The two must never
 * drift: a file the firm route accepts and the mentor route rejects (or the
 * reverse) would mean the same export behaves differently by who uploads it.
 * SEARCH-CONTENT-CASCADE-PLAN.md Phase 1.
 *
 * The rules themselves are unchanged from the firm route where they were built:
 * a non-empty array, capped in count, every entry carrying the fields the
 * engine's loader and scorer actually read. Uploaded content is hostile until
 * it passes here (CLAUDE.md → Security; .claude/skills/master-export-upload).
 */

/** Fields every template entry must carry — what the engine reads. */
const TEMPLATE_REQUIRED_FIELDS = ['page', 'title', 'section']

/** Upper bound on entries — ~7× the current 291-record library. */
const TEMPLATE_MAX_COUNT = 2000

/** Upload size cap, enforced by formidable BEFORE the body is read. */
const TEMPLATE_IMPORT_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Validate a parsed template-export upload.
 *
 * Pure and synchronous, so it carries the project's 100% test bar for
 * untrusted-input validation (tests/unit/templateImport.test.js).
 *
 * @param {*} parsed - whatever JSON.parse produced from the uploaded file
 * @returns {{ok: true} | {ok: false, code: string, message: string}} verdict;
 *   `code`/`message` are safe to return to the client verbatim
 */
function validateTemplateImport (parsed) {
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { ok: false, code: 'INVALID_FORMAT', message: 'Template JSON must be a non-empty array' }
  }
  if (parsed.length > TEMPLATE_MAX_COUNT) {
    return {
      ok: false,
      code: 'TOO_MANY_TEMPLATES',
      message: `Template JSON must not exceed ${TEMPLATE_MAX_COUNT} entries`
    }
  }
  const badEntry = parsed.find(t =>
    !t || typeof t !== 'object' || TEMPLATE_REQUIRED_FIELDS.some(f => !t[f])
  )
  if (badEntry !== undefined) {
    return {
      ok: false,
      code: 'INVALID_FORMAT',
      message: `Each template must have: ${TEMPLATE_REQUIRED_FIELDS.join(', ')}`
    }
  }
  return { ok: true }
}

module.exports = {
  TEMPLATE_REQUIRED_FIELDS,
  TEMPLATE_MAX_COUNT,
  TEMPLATE_IMPORT_MAX_BYTES,
  validateTemplateImport
}
