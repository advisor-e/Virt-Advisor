'use strict'

/**
 * @file The push doorway for the master template library — Cascade Phase 4, our half.
 * @module server/routes/integrationTemplates
 *
 * SEARCH-CONTENT-CASCADE-PLAN.md Phase 4 (Mike, 2026-09-09: "lets finish the search
 * content cascade plan"). Advisor-e posts the search_content export here the moment
 * Mike publishes, so the download-and-upload step disappears. It is the SECOND
 * doorway into the SAME validated store as the mentor's upload screen: the same
 * validator, the same platform scope, the same version history, the same cache
 * clear. Nothing an advisor sees changes by which door the library came through.
 *
 * 🔴 THIS DOOR IS NOT BEHIND A USER'S TOKEN, AND IT FAILS CLOSED. A server, not a
 * person, is calling, so there is no JWT to verify. Instead a shared secret held
 * ONLY in the backend's environment (ADVISOR_E_PUSH_SECRET) must arrive in the
 * request header. While that variable is unset the route answers 404 as if it did
 * not exist — the same fail-closed posture as the empty middle-tier roles in
 * config/integration.js. The comparison is constant-time over a digest of both
 * values, so neither the secret's length nor its prefix leaks through timing.
 *
 * The body is JSON only, capped at the upload cap (10 MB) and read here rather than
 * by the global 1 MB parser, which restify-server.js skips for this path — the same
 * arrangement the SSE engines use. Nothing in the payload is ever logged.
 *
 * The file's CONTENT is never edited here — IDs and content are Advisor-e's alone
 * (CLAUDE.md). This route receives, validates and stores; that is the whole job.
 */

const crypto = require('crypto')
const { PUSH } = require('../../config/integration')
const { sendError } = require('../utils/sendError')
const overlay = require('../utils/firmOverlay')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { PLATFORM_SCOPE } = require('../utils/platformScope')
const { validateTemplateImport, TEMPLATE_IMPORT_MAX_BYTES } = require('../utils/templateImport')
const { clearTemplateCache } = require('../utils/templateLibrary')
const firmManager = require('./firmManager')

/** Recorded as `saved_by` on the history row, so a pushed version reads as Advisor-e's. */
const PUSHED_BY = 'advisor-e'

/**
 * Constant-time comparison of the presented secret with the configured one.
 * Both are hashed first so the buffers are always equal length — timingSafeEqual
 * throws on unequal lengths, which would itself leak the secret's length.
 *
 * @param {*} given - whatever arrived in the header
 * @param {string} expected - the configured secret (non-empty)
 * @returns {boolean}
 */
function secretsMatch (given, expected) {
  if (typeof given !== 'string' || given.length === 0 || !expected) { return false }
  const a = crypto.createHash('sha256').update(given).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

/**
 * Guard: the push secret must be configured AND presented.
 *
 * Unconfigured → 404, never 401: an unconfigured door does not announce itself.
 * Wrong or missing → 401 with a fixed message that confirms nothing.
 *
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
function requirePushSecret (req, res, next) {
  if (!PUSH.secret) {
    sendError(res, 404, 'NOT_FOUND', 'Not found')
    return next(false)
  }
  if (!secretsMatch(req.headers && req.headers[PUSH.header], PUSH.secret)) {
    sendError(res, 401, 'UNAUTHORISED', 'The push secret is missing or wrong')
    return next(false)
  }
  return next()
}

/**
 * Read the raw request body as UTF-8, refusing past `maxBytes` BEFORE buffering
 * the rest — an oversize body is torn down, never held whole in memory.
 *
 * @param {object} req - the unread request stream
 * @param {number} maxBytes
 * @returns {Promise<string>} the body text
 * @throws {Error} code PAYLOAD_TOO_LARGE, or the stream's own error
 */
function readBody (req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        const err = new Error('Body exceeds ' + maxBytes + ' bytes')
        err.code = 'PAYLOAD_TOO_LARGE'
        // Reject FIRST, then tear down: a promise settles once, so whichever of
        // 'end' or 'error' the stream emits afterwards is a no-op.
        reject(err)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * POST /api/integration/templates — Advisor-e pushes the master export.
 *
 * Validation order per .claude/skills/master-export-upload: size cap (the body is
 * refused mid-stream past 10 MB) → JSON parse in try/catch → shape check (the shared
 * validateTemplateImport). On any failure the current version is untouched — a bad
 * push can never take the platform offline, and the mentor's Restore undoes a good
 * one that turns out to be wrong.
 *
 * @route POST /api/integration/templates
 * @param {string} req.headers[x-advisor-e-push-secret] - the shared secret
 * @param {Array<object>} body - the search_content export, as the file's own JSON array
 * @returns {201} { success: true, imported: true, templateCount, version }
 *   version is null when the DEV/TEST file fallback took the write (no MySQL).
 */
async function pushPlatformTemplates (req, res) {
  let text
  try {
    text = await readBody(req, TEMPLATE_IMPORT_MAX_BYTES)
  } catch (err) {
    if (err && err.code === 'PAYLOAD_TOO_LARGE') {
      return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'The export exceeds the 10 MB cap')
    }
    console.error('[integration] pushPlatformTemplates read failed:', (err && err.code) || 'READ_ERROR')
    return sendError(res, 400, 'PARSE_ERROR', 'Could not read the request body')
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return sendError(res, 400, 'INVALID_JSON', 'Body must be valid JSON')
  }

  const verdict = validateTemplateImport(parsed)
  if (!verdict.ok) { return sendError(res, 400, verdict.code, verdict.message) }

  try {
    let version
    try {
      version = await overlay.saveFirmConfig(PLATFORM_SCOPE, 'templates', parsed, PUSHED_BY)
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
      firmManager._devWriteTemplates(PLATFORM_SCOPE, parsed) // DEV/TEST-ONLY (see firmManager.js banner)
      version = null
    }
    // The new library is live on the next request here, not after the TTL.
    clearTemplateCache()
    res.send(201, { success: true, imported: true, templateCount: parsed.length, version })
  } catch (err) {
    console.error('[integration] pushPlatformTemplates failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the pushed library')
  }
}

module.exports = { requirePushSecret, pushPlatformTemplates, secretsMatch, readBody, PUSHED_BY }
