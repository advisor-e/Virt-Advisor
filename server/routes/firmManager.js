'use strict'

const path = require('path')
const DEV_DISTINCTIONS_FILE = path.resolve(__dirname, '../../data/dev-firm-distinctions.json')
const DEV_DECLINES_FILE = path.resolve(__dirname, '../../data/dev-firm-distinction-declines.json')
const DEV_OVERRIDES_FILE = path.resolve(__dirname, '../../data/dev-firm-distinction-overrides.json')
const DEV_STAIRCASE_FILE = path.resolve(__dirname, '../../data/dev-firm-staircase.json')
// The staircase's three cascade keys, added 2026-07-31 when it joined the one
// firm-editable mechanism. Same TEST-ONLY convention as the distinction files above.
const DEV_STAIRCASE_DECLINES_FILE = path.resolve(__dirname, '../../data/dev-firm-staircase-declines.json')
const DEV_STAIRCASE_OVERRIDES_FILE = path.resolve(__dirname, '../../data/dev-firm-staircase-overrides.json')
const DEV_STAIRCASE_OWN_FILE = path.resolve(__dirname, '../../data/dev-firm-staircase-own.json')
const DEV_STAIRCASE_BASELINES_FILE = path.resolve(__dirname, '../../data/dev-firm-staircase-override-baselines.json')
const DEV_TEMPLATES_FILE = path.resolve(__dirname, '../../data/dev-firm-templates.json')
const DEV_LASTSEEN_FILE = path.resolve(__dirname, '../../data/dev-firm-distinction-lastseen.json')
const DEV_OVERRIDE_BASELINES_FILE = path.resolve(__dirname, '../../data/dev-firm-distinction-override-baselines.json')
const DEV_QUIZZES_FILE = path.resolve(__dirname, '../../data/dev-firm-quizzes.json')
// The quiz cascade's three keys, added 2026-07-31 (Phase 3) when quizzes joined the
// one firm-editable mechanism. These paths must stay identical to firmQuizzes.js's
// own DEV_FILES: the write side lives here and the read side lives there, so a
// mismatch would look exactly like a save that vanished.
const DEV_QUIZ_DECLINES_FILE = path.resolve(__dirname, '../../data/dev-firm-quiz-declines.json')
const DEV_QUIZ_OVERRIDES_FILE = path.resolve(__dirname, '../../data/dev-firm-quiz-overrides.json')
const DEV_QUIZ_OWN_FILE = path.resolve(__dirname, '../../data/dev-firm-quiz-own.json')
const DEV_QUIZ_BASELINES_FILE = path.resolve(__dirname, '../../data/dev-firm-quiz-override-baselines.json')
// The Logic-Lab accepted-idea log (ACTIONS #logic-lab-accept-and-push). Same
// TEST-ONLY convention as every dev file above — it exists so an accept works on a
// machine with no MySQL, which is where this feature is actually tested.
const DEV_LOGIC_LAB_ACCEPTED_FILE = path.resolve(__dirname, '../../data/dev-firm-logic-lab-accepted.json')
function _devReadDistinctions (firmId) {
  try {
    const raw = fs.readFileSync(DEV_DISTINCTIONS_FILE, 'utf8')
    const all = JSON.parse(raw)
    return Array.isArray(all[firmId]) ? all[firmId] : []
  } catch { return [] }
}

function _devWriteDistinctions (firmId, rows) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_DISTINCTIONS_FILE, 'utf8'))
  } catch {}
  all[firmId] = rows
  fs.writeFileSync(DEV_DISTINCTIONS_FILE, JSON.stringify(all, null, 2))
}

// Dev-JSON fallbacks for the cascade state (declined platform ids + platform
// overrides), mirroring the own-rows fallback above. The engine reads the same
// files (server/utils/firmDistinctions.js) so a dev edit is honoured in a live
// session. TEST-ONLY (no version history) — replaced by MySQL before production.
function _devReadDeclines (firmId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_DECLINES_FILE, 'utf8'))
    return Array.isArray(all[firmId]) ? all[firmId] : []
  } catch { return [] }
}

function _devWriteDeclines (firmId, ids) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_DECLINES_FILE, 'utf8'))
  } catch {}
  all[firmId] = ids
  fs.writeFileSync(DEV_DECLINES_FILE, JSON.stringify(all, null, 2))
}

function _devReadOverrides (firmId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_OVERRIDES_FILE, 'utf8'))
    const v = all[firmId]
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
  } catch { return {} }
}

function _devWriteOverrides (firmId, obj) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_OVERRIDES_FILE, 'utf8'))
  } catch {}
  all[firmId] = obj
  fs.writeFileSync(DEV_OVERRIDES_FILE, JSON.stringify(all, null, 2))
}

// Dev-JSON fallback for the firm's "mentor updates last reviewed" marker (a single
// ISO timestamp per firm), mirroring the cascade-state fallbacks above. TEST-ONLY
// (no version history) — replaced by MySQL before production.
function _devReadLastSeen (firmId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_LASTSEEN_FILE, 'utf8'))
    return typeof all[firmId] === 'string' ? all[firmId] : null
  } catch { return null }
}

function _devWriteLastSeen (firmId, iso) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_LASTSEEN_FILE, 'utf8'))
  } catch {}
  all[firmId] = iso
  fs.writeFileSync(DEV_LASTSEEN_FILE, JSON.stringify(all, null, 2))
}

// Dev-JSON fallback for the per-override "mentor baseline" signatures — the content
// signature of the mentor row at the moment the firm last overrode/reviewed it, keyed
// by platform id (pd-N). Drives Stage E drift detection (mentor row now ≠ baseline →
// "mentor updated this distinction"). TEST-ONLY (no version history) — MySQL later.
function _devReadOverrideBaselines (firmId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_OVERRIDE_BASELINES_FILE, 'utf8'))
    const v = all[firmId]
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
  } catch { return {} }
}

function _devWriteOverrideBaselines (firmId, obj) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_OVERRIDE_BASELINES_FILE, 'utf8'))
  } catch {}
  all[firmId] = obj
  fs.writeFileSync(DEV_OVERRIDE_BASELINES_FILE, JSON.stringify(all, null, 2))
}

/**
 * firmManager routes
 *
 * All handlers here are pre-protected by firmAuth + requireManagerRole
 * middleware applied in restify-server.js. By the time any handler runs,
 * req.firmId, req.userRole, and req.userEmail are guaranteed to be set.
 *
 * Endpoints:
 *   Document Library
 *     GET  /api/firm-manager/documents            list platform + firm docs
 *     POST /api/firm-manager/documents            upload a firm document
 *     GET  /api/firm-manager/documents/download   stream a file from Drive
 *     DEL  /api/firm-manager/documents/:fileId    delete a firm document
 *
 *   Decision Framework
 *     GET  /api/firm-manager/framework            get firm override (merged view)
 *     POST /api/firm-manager/framework            save a firm override
 *     GET  /api/firm-manager/framework/history    list version history
 *     POST /api/firm-manager/framework/restore    restore an earlier version
 *
 *   Videos
 *     GET  /api/firm-manager/videos               list firm videos
 *     POST /api/firm-manager/videos               add a video link
 *     DEL  /api/firm-manager/videos/:id           remove a video link
 *
 *   Advisory Staircase (whole-config firm override)
 *     GET  /api/firm-manager/staircase            get base + firm override (merged view)
 *     POST /api/firm-manager/staircase            save a validated firm override
 *     (history + restore reuse /framework/history + /framework/restore with
 *      configKey='advisory-staircase')
 *
 *   Quizzes (whole-bank override, plus the per-question cascade)
 *     GET  /api/firm-manager/quizzes                       base + overlay + resolved
 *     POST /api/firm-manager/quizzes                       save a whole-bank override
 *     PUT  /api/firm-manager/quizzes/platform/:qid         edit one of ours
 *     DEL  /api/firm-manager/quizzes/platform/:qid         reset it to ours
 *     PUT  /api/firm-manager/quizzes/platform/:qid/decline switch it off / back on
 *     POST /api/firm-manager/quizzes/own                   add a question of their own
 *     PUT  /api/firm-manager/quizzes/own/:id               edit one they added
 *     DEL  /api/firm-manager/quizzes/own/:id               remove one they added
 *
 *   Storage
 *     GET  /api/firm-manager/storage              get storage usage summary
 */

const fs = require('fs')
// formidable is pinned to v2.1.2 (the last v2 release before it pulled in a
// crypto helper that requires Node > 14.15 — see design/ACTIONS.md). Both v2 and
// v3 expose the factory as a `.formidable` named export, so this destructure works
// on either. Used by uploadDocument + importTemplates.
const { formidable } = require('formidable')

// formidable v2's parse() is callback-style (returns the form, not a promise),
// so wrap it to keep the `await [fields, files]` usage in the upload handlers.
function parseForm (form, req) {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) { reject(err); return }
      resolve([fields, files])
    })
  })
}
const { sendError } = require('../utils/sendError')
const drive = require('../services/driveService')
const overlay = require('../utils/firmOverlay')
const db = require('../utils/db')
const { STORAGE, DRIVE } = require('../../config/integration')
const DOMAINS = require('../../data/domains.json')
const BASE_STAIRCASE = require('../../data/advisory-staircase.json')
const { resolveEffectiveDistinctions } = require('../utils/resolveDistinctions')
const { loadFirmDistinctionState, CONFIG_KEYS } = require('../utils/firmDistinctions')
const { loadPlatformDistinctions } = require('../utils/platformDistinctions')
const { devFallbackAllowed } = require('../utils/dbFailure')

// Every `catch` below asks this instead of a bare NODE_ENV check. It answers NO
// when a live MySQL REFUSED the statement, so a rejected save can no longer be
// written to a gitignored dev file and reported to the screen as saved. The
// case that forces it: each management tier needs its reserved row in `firms`,
// and without it every save at that tier is foreign-key refused. See
// server/utils/dbFailure.js.
const devFallbackOk = devFallbackAllowed

// ── Helpers ───────────────────────────────────────────────────────────────────

// Logs the real error server-side; returns a generic message to the client
// so internal Drive IDs, MySQL fragments, and file paths are never exposed.
function serverError (res, status, code, err) {
  console.error(`[firmManager] ${code}:`, err.message)
  return sendError(res, status, code, 'An unexpected error occurred')
}

function categoryKeyFromValue (value) {
  return Object.keys(DRIVE.categories).find(k => DRIVE.categories[k] === value) || null
}

function validCategoryValues () {
  return Object.values(DRIVE.categories)
}

// ── Document Library ──────────────────────────────────────────────────────────

async function listDocuments (req, res) {
  const { category } = req.query
  if (!category || !validCategoryValues().includes(category)) {
    return sendError(res, 400, 'INVALID_CATEGORY',
      `category must be one of: ${validCategoryValues().join(', ')}`)
  }
  const catKey = categoryKeyFromValue(category)
  try {
    const [baseFiles, firmFiles] = await Promise.all([
      drive.listBaseDocuments(catKey).catch(() => []),
      drive.listFirmDocuments(req.firmId, catKey)
    ])
    res.send(200, {
      base: baseFiles.map(f => ({ ...f, source: 'platform' })),
      firm: firmFiles.map(f => ({ ...f, source: 'firm' }))
    })
  } catch (err) {
    if (devFallbackOk(err)) { res.send(200, { base: [], firm: [] }); return }
    return serverError(res, 500, 'DRIVE_ERROR', err)
  }
}

async function uploadDocument (req, res) {
  const form = formidable({
    maxFileSize: STORAGE.maxFileSizeBytes,
    filter ({ mimetype }) {
      return STORAGE.allowedMimeTypes.includes(mimetype)
    }
  })

  let fields, files
  try {
    ;[fields, files] = await parseForm(form, req)
  } catch (err) {
    return serverError(res, 400, 'PARSE_ERROR', err)
  }

  const category = Array.isArray(fields.category) ? fields.category[0] : fields.category
  const uploadedFile = files.file
    ? (Array.isArray(files.file) ? files.file[0] : files.file)
    : null

  if (!uploadedFile) { return sendError(res, 400, 'NO_FILE', 'A file field named "file" is required') }
  if (!category) { return sendError(res, 400, 'NO_CATEGORY', 'A "category" field is required') }

  const catKey = categoryKeyFromValue(category)
  if (!catKey) {
    return sendError(res, 400, 'INVALID_CATEGORY',
      `category must be one of: ${validCategoryValues().join(', ')}`)
  }

  try {
    // Enforce per-firm storage quota
    const [usageRows] = await db.execute(
      'SELECT bytes_used FROM firm_storage_usage WHERE firm_id = ?',
      [req.firmId]
    )
    const bytesUsed = usageRows.length > 0 ? Number(usageRows[0].bytes_used) : 0
    if (bytesUsed + uploadedFile.size > STORAGE.maxFirmStorageBytes) {
      return sendError(res, 413, 'QUOTA_EXCEEDED',
        'This upload would exceed your firm storage limit of 500 MB')
    }

    const buffer = fs.readFileSync(uploadedFile.filepath)
    const fileName = uploadedFile.originalFilename || uploadedFile.newFilename || 'document.pdf'
    const driveFile = await drive.uploadFirmDocument(
      req.firmId, catKey, fileName, uploadedFile.mimetype, buffer
    )

    await db.execute(
      `INSERT INTO firm_documents
         (firm_id, category, file_name, drive_file_id, mime_type, size_bytes, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.firmId, category, driveFile.name, driveFile.id,
        uploadedFile.mimetype, uploadedFile.size, req.userEmail]
    )

    await db.execute(
      `INSERT INTO firm_storage_usage (firm_id, bytes_used) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE bytes_used = bytes_used + VALUES(bytes_used)`,
      [req.firmId, uploadedFile.size]
    )

    res.send(201, { file: driveFile })
  } catch (err) {
    return serverError(res, 500, 'UPLOAD_ERROR', err)
  } finally {
    // Always clean up the temp file formidable wrote to disk
    if (uploadedFile && uploadedFile.filepath) {
      fs.unlink(uploadedFile.filepath, () => {})
    }
  }
}

async function downloadDocument (req, res) {
  const { fileId, fileName, source, category } = req.query
  if (!fileId) { return sendError(res, 400, 'NO_FILE_ID', 'fileId query param required') }

  // Authorisation gate (closes the cross-firm IDOR): confirm this firm may read
  // this file before streaming a single byte. A 'firm' document must belong to
  // req.firmId; a 'platform' document must be a real base file in the named
  // category. Anything else is reported as not-found so we never reveal — or
  // stream — another firm's document.
  try {
    if (source === 'platform') {
      const catKey = categoryKeyFromValue(category)
      if (!catKey) {
        return sendError(res, 400, 'INVALID_CATEGORY', 'A valid category is required for a platform document')
      }
      const baseFiles = await drive.listBaseDocuments(catKey)
      if (!baseFiles.some(f => f.id === fileId)) {
        return sendError(res, 404, 'NOT_FOUND', 'Document not found')
      }
    } else {
      // Firm-owned path (also the default for a missing/unknown source).
      const [rows] = await db.execute(
        'SELECT 1 FROM firm_documents WHERE drive_file_id = ? AND firm_id = ?',
        [fileId, req.firmId]
      )
      if (rows.length === 0) {
        return sendError(res, 404, 'NOT_FOUND', 'Document not found for this firm')
      }
    }
  } catch (err) {
    return serverError(res, 500, 'DOWNLOAD_AUTH_ERROR', err)
  }

  try {
    const stream = await drive.downloadDocument(fileId)
    res.header('Content-Disposition',
      `attachment; filename="${(fileName || 'document.pdf').replace(/"/g, '')}"`)
    res.header('Content-Type', 'application/pdf')
    // If the Drive stream errors mid-transfer, headers are already sent — we can't
    // send an error envelope, so log it and tear the response down cleanly.
    stream.on('error', (err) => {
      console.error('[firmManager] DOWNLOAD_STREAM_ERROR:', err.message)
      res.destroy(err)
    })
    stream.pipe(res)
  } catch (err) {
    return serverError(res, 500, 'DOWNLOAD_ERROR', err)
  }
}

async function deleteDocument (req, res) {
  const { fileId } = req.params
  if (!fileId) { return sendError(res, 400, 'NO_FILE_ID', 'fileId route param required') }

  try {
    // Confirm the file belongs to this firm before deleting
    const [rows] = await db.execute(
      'SELECT size_bytes FROM firm_documents WHERE drive_file_id = ? AND firm_id = ?',
      [fileId, req.firmId]
    )
    if (rows.length === 0) {
      return sendError(res, 404, 'NOT_FOUND', 'Document not found for this firm')
    }
    const sizeBytes = Number(rows[0].size_bytes)

    await drive.deleteFirmDocument(fileId)
    await db.execute(
      'DELETE FROM firm_documents WHERE drive_file_id = ? AND firm_id = ?',
      [fileId, req.firmId]
    )
    await db.execute(
      'UPDATE firm_storage_usage SET bytes_used = GREATEST(0, bytes_used - ?) WHERE firm_id = ?',
      [sizeBytes, req.firmId]
    )
    res.send(200, { deleted: true })
  } catch (err) {
    return serverError(res, 500, 'DELETE_ERROR', err)
  }
}

// ── Decision Framework ────────────────────────────────────────────────────────

async function getFramework (req, res) {
  const { configKey } = req.query
  if (!configKey) { return sendError(res, 400, 'NO_CONFIG_KEY', 'configKey query param required') }
  try {
    const firmOverride = await overlay.loadFirmConfig(req.firmId, configKey)
    res.send(200, { configKey, firmOverride, hasOverride: firmOverride !== null })
  } catch (err) {
    if (devFallbackOk(err)) { res.send(200, { configKey, firmOverride: null, hasOverride: false }); return }
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function saveFramework (req, res) {
  const { configKey, configJson } = req.body || {}
  if (!configKey) {
    return sendError(res, 400, 'NO_CONFIG_KEY', 'configKey is required')
  }
  if (!configJson || typeof configJson !== 'object' || Array.isArray(configJson)) {
    return sendError(res, 400, 'INVALID_JSON', 'configJson must be a non-array JSON object')
  }
  try {
    const version = await overlay.saveFirmConfig(req.firmId, configKey, configJson, req.userEmail)
    res.send(200, { saved: true, version })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function getFrameworkHistory (req, res) {
  const { configKey } = req.query
  if (!configKey) { return sendError(res, 400, 'NO_CONFIG_KEY', 'configKey query param required') }
  try {
    const history = await overlay.getVersionHistory(req.firmId, configKey)
    res.send(200, { history })
  } catch (err) {
    if (devFallbackOk(err)) { res.send(200, { history: [] }); return }
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function restoreFramework (req, res) {
  const { configKey, versionId } = req.body || {}
  if (!configKey || !versionId) {
    return sendError(res, 400, 'MISSING_PARAMS', 'configKey and versionId are required')
  }
  try {
    const version = await overlay.restoreVersion(req.firmId, configKey, Number(versionId))
    res.send(200, { restored: true, version })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Videos ────────────────────────────────────────────────────────────────────

async function listVideos (req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT id, domain, title, url, added_by, created_at
       FROM firm_videos
       WHERE firm_id = ?
       ORDER BY domain, title`,
      [req.firmId]
    )
    res.send(200, { videos: rows })
  } catch (err) {
    if (devFallbackOk(err)) { res.send(200, { videos: [] }); return }
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function addVideo (req, res) {
  const { domain, title, url } = req.body || {}
  if (!domain || !title || !url) {
    return sendError(res, 400, 'MISSING_FIELDS', 'domain, title, and url are all required')
  }
  try {
    const parsed = new URL(url)
    if (!STORAGE.allowedVideoProtocols.includes(parsed.protocol)) {
      return sendError(res, 400, 'INVALID_URL', 'Video URL must use HTTPS')
    }
  } catch {
    return sendError(res, 400, 'INVALID_URL', 'url is not a valid URL')
  }
  try {
    const [result] = await db.execute(
      'INSERT INTO firm_videos (firm_id, domain, title, url, added_by) VALUES (?, ?, ?, ?, ?)',
      [req.firmId, domain, title, url, req.userEmail]
    )
    res.send(201, { id: result.insertId, domain, title, url })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function deleteVideo (req, res) {
  const { id } = req.params
  try {
    const [result] = await db.execute(
      'DELETE FROM firm_videos WHERE id = ? AND firm_id = ?',
      [Number(id), req.firmId]
    )
    if (result.affectedRows === 0) {
      return sendError(res, 404, 'NOT_FOUND', 'Video not found for this firm')
    }
    res.send(200, { deleted: true })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Storage usage ─────────────────────────────────────────────────────────────

async function getStorageUsage (req, res) {
  try {
    const [rows] = await db.execute(
      'SELECT bytes_used FROM firm_storage_usage WHERE firm_id = ?',
      [req.firmId]
    )
    const bytesUsed = rows.length > 0 ? Number(rows[0].bytes_used) : 0
    res.send(200, {
      bytesUsed,
      maxBytes: STORAGE.maxFirmStorageBytes,
      percentUsed: Math.round((bytesUsed / STORAGE.maxFirmStorageBytes) * 100)
    })
  } catch (err) {
    if (devFallbackOk(err)) { res.send(200, { bytesUsed: 0, maxBytes: STORAGE.maxFirmStorageBytes, percentUsed: 0 }); return }
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Template Library Import ───────────────────────────────────────────────────

const TEMPLATE_REQUIRED_FIELDS = ['page', 'title', 'section']
const TEMPLATE_MAX_COUNT = 2000
const TEMPLATE_IMPORT_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

// ⚠⚠ DEV/TEST-ONLY persistence fallback — NOT production storage. ⚠⚠
// When MySQL is unavailable on a local dev machine, template imports fall back to
// a gitignored local JSON file so the feature can be exercised end-to-end without
// a database. This is a TESTING convenience ONLY and is gated behind devFallbackOk — it
// can never run in production. Real persistence MUST go through the
// firm_framework_versions table via firmOverlay. Wiring the live MySQL persistence
// (and retiring these dev-file fallbacks) is a tracked task — see HANDOFF.md and
// design/ACTIONS.md ("Firm Manager config persistence → MySQL").
function _devReadTemplates (firmId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_TEMPLATES_FILE, 'utf8'))
    return Array.isArray(all[firmId]) ? all[firmId] : null
  } catch { return null }
}

function _devWriteTemplates (firmId, rows) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_TEMPLATES_FILE, 'utf8'))
  } catch {}
  all[firmId] = rows
  fs.writeFileSync(DEV_TEMPLATES_FILE, JSON.stringify(all, null, 2))
}

function _devClearTemplates (firmId) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_TEMPLATES_FILE, 'utf8'))
  } catch {}
  delete all[firmId]
  fs.writeFileSync(DEV_TEMPLATES_FILE, JSON.stringify(all, null, 2))
}

async function getTemplateImport (req, res) {
  try {
    const [config, history] = await Promise.all([
      overlay.loadFirmConfig(req.firmId, 'templates'),
      overlay.getVersionHistory(req.firmId, 'templates')
    ])
    if (!config) {
      return res.send(200, { hasImport: false, templateCount: 0, history: [] })
    }
    res.send(200, {
      hasImport: true,
      templateCount: Array.isArray(config) ? config.length : 0,
      history: history || []
    })
  } catch (err) {
    // DEV/TEST-ONLY: fall back to the local dev file (see banner above).
    if (devFallbackOk(err)) {
      const devConfig = _devReadTemplates(req.firmId)
      res.send(200, {
        hasImport: !!devConfig,
        templateCount: Array.isArray(devConfig) ? devConfig.length : 0,
        history: []
      })
      return
    }
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function importTemplates (req, res) {
  const form = formidable({ maxFileSize: TEMPLATE_IMPORT_MAX_BYTES })
  let files
  try {
    ;[, files] = await parseForm(form, req)
  } catch (err) {
    return serverError(res, 400, 'PARSE_ERROR', err)
  }

  const uploadedFile = files.file
    ? (Array.isArray(files.file) ? files.file[0] : files.file)
    : null
  if (!uploadedFile) { return sendError(res, 400, 'NO_FILE', 'A file field named "file" is required') }

  // Clean up the temp file formidable wrote, whichever exit path we take.
  res.once('finish', () => { fs.unlink(uploadedFile.filepath, () => {}) })

  let parsed
  try {
    const content = fs.readFileSync(uploadedFile.filepath, 'utf8')
    parsed = JSON.parse(content)
  } catch {
    return sendError(res, 400, 'INVALID_JSON', 'File must contain valid JSON')
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return sendError(res, 400, 'INVALID_FORMAT', 'Template JSON must be a non-empty array')
  }
  if (parsed.length > TEMPLATE_MAX_COUNT) {
    return sendError(res, 400, 'TOO_MANY_TEMPLATES',
      `Template JSON must not exceed ${TEMPLATE_MAX_COUNT} entries`)
  }
  const badEntry = parsed.find(t =>
    !t || typeof t !== 'object' || TEMPLATE_REQUIRED_FIELDS.some(f => !t[f])
  )
  if (badEntry) {
    return sendError(res, 400, 'INVALID_FORMAT',
      `Each template must have: ${TEMPLATE_REQUIRED_FIELDS.join(', ')}`)
  }

  try {
    let version
    try {
      version = await overlay.saveFirmConfig(req.firmId, 'templates', parsed, req.userEmail)
    } catch (err) {
      if (!devFallbackOk(err)) { throw err }
      _devWriteTemplates(req.firmId, parsed) // DEV/TEST-ONLY fallback (see banner above)
      version = null
    }
    res.send(201, { imported: true, templateCount: parsed.length, version })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function resetTemplateImport (req, res) {
  try {
    await db.execute(
      'DELETE FROM firm_framework_versions WHERE firm_id = ? AND config_key = ?',
      [req.firmId, 'templates']
    )
    res.send(200, { reset: true })
  } catch (err) {
    // DEV/TEST-ONLY: clear the local dev file instead (see banner above).
    if (devFallbackOk(err)) { _devClearTemplates(req.firmId); res.send(200, { reset: true }); return }
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Advisory Distinctions (firm-level rows) ───────────────────────────────────
// Stored in firm_framework_versions under config_key='advisory-distinctions'.
// Same table already used for Decision Framework overrides — no new schema needed.

const DISTINCTIONS_KEY = 'advisory-distinctions'

// Built from data/domains.json (single source of truth) so every current and
// future domain is automatically valid for distinctions — no code change needed
// when a domain is added.
const DISTINCTION_DOMAINS = new Set(DOMAINS.map(d => d.id))

// The subset the Advisory Distinctions SCREEN shows, marked in domains.json with
// `distinctions: true` — the same flag the screen reads, so the two cannot drift.
// A Logic-Lab accept may only file here: on 2026-08-03 it wrote a live row into
// `org-board-pack`, which has no screen — active in the engine, invisible to the
// firm. A row the firm cannot see is a row the firm cannot correct.
const VISIBLE_DISTINCTION_DOMAINS = new Set(
  DOMAINS.filter(d => d.distinctions === true).map(d => d.id)
)

async function _loadDistinctions (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, DISTINCTIONS_KEY)
    return Array.isArray(stored) ? stored : []
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadDistinctions(firmId) }
    throw err
  }
}

async function _saveDistinctions (firmId, rows, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, DISTINCTIONS_KEY, rows, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteDistinctions(firmId, rows); return }
    throw err
  }
}

async function listDistinctions (req, res) {
  try {
    const rows = await _loadDistinctions(req.firmId)
    res.send(200, { distinctions: rows })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function createDistinction (req, res) {
  const { domain, description, triggers, templates, boost } = req.body || {}

  if (!domain || !DISTINCTION_DOMAINS.has(domain)) {
    return sendError(res, 400, 'INVALID_DOMAIN', 'domain must be a recognised advisory domain')
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return sendError(res, 400, 'INVALID_DESCRIPTION', 'description is required')
  }
  if (!Array.isArray(triggers) || triggers.length === 0) {
    return sendError(res, 400, 'INVALID_TRIGGERS', 'triggers must be a non-empty array of strings')
  }
  if (!Array.isArray(templates) || templates.length === 0) {
    return sendError(res, 400, 'INVALID_TEMPLATES', 'templates must be a non-empty array of strings')
  }
  const boostVal = Math.min(20, Math.max(1, Number(boost) || 5))

  try {
    const existing = await _loadDistinctions(req.firmId)
    const nextId = existing.length > 0 ? Math.max(...existing.map(r => r.id || 0)) + 1 : 1
    const newRow = {
      id: nextId,
      domain,
      description: description.trim(),
      triggers: triggers.map(t => String(t).trim()).filter(Boolean),
      templates: templates.map(t => String(t).trim()).filter(Boolean),
      boost: boostVal,
      created_by: req.userEmail,
      created_at: new Date().toISOString()
    }
    await _saveDistinctions(req.firmId, [...existing, newRow], req.userEmail)
    res.send(201, { id: nextId, created: true })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function updateDistinction (req, res) {
  const id = parseInt(req.params.id, 10)
  if (!id) { return sendError(res, 400, 'INVALID_ID', 'id must be a positive integer') }

  const { domain, description, triggers, templates, boost } = req.body || {}

  if (domain && !DISTINCTION_DOMAINS.has(domain)) {
    return sendError(res, 400, 'INVALID_DOMAIN', 'domain must be a recognised advisory domain')
  }
  if (triggers !== undefined && (!Array.isArray(triggers) || triggers.length === 0)) {
    return sendError(res, 400, 'INVALID_TRIGGERS', 'triggers must be a non-empty array of strings')
  }
  if (templates !== undefined && (!Array.isArray(templates) || templates.length === 0)) {
    return sendError(res, 400, 'INVALID_TEMPLATES', 'templates must be a non-empty array of strings')
  }

  try {
    const existing = await _loadDistinctions(req.firmId)
    const idx = existing.findIndex(r => r.id === id)
    if (idx === -1) {
      return sendError(res, 404, 'NOT_FOUND', 'Distinction not found')
    }
    const updated = { ...existing[idx] }
    if (domain) { updated.domain = domain }
    if (description !== undefined) { updated.description = description.trim() }
    if (triggers) { updated.triggers = triggers.map(t => String(t).trim()).filter(Boolean) }
    if (templates) { updated.templates = templates.map(t => String(t).trim()).filter(Boolean) }
    if (boost !== undefined) { updated.boost = Math.min(20, Math.max(1, Number(boost) || 5)) }
    const newList = [...existing]
    newList[idx] = updated
    await _saveDistinctions(req.firmId, newList, req.userEmail)
    res.send(200, { updated: true })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function deleteDistinction (req, res) {
  const id = parseInt(req.params.id, 10)
  if (!id) { return sendError(res, 400, 'INVALID_ID', 'id must be a positive integer') }

  try {
    const existing = await _loadDistinctions(req.firmId)
    const filtered = existing.filter(r => r.id !== id)
    if (filtered.length === existing.length) {
      return sendError(res, 404, 'NOT_FOUND', 'Distinction not found')
    }
    await _saveDistinctions(req.firmId, filtered, req.userEmail)
    res.send(200, { deleted: true })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Advisory Distinctions — platform-row cascade (decline + override) ─────────
// A firm can switch a platform (mentor) distinction OFF for itself (decline) or
// EDIT it (override — the firm's version replaces the platform original in the
// effective list). Stored under their own firmOverlay config keys so the existing
// firm-own rows are untouched and version history/restore come for free. The
// engine reads the same state via server/utils/firmDistinctions.js, so an edit or
// decline here changes live advisor sessions. All scoped to the JWT-verified
// req.firmId — a client-supplied firmId is never trusted (IDOR).

// The platform (mentor) set is now dynamic — the mentor can author it (the cascade
// origin, DISTINCTIONS-CASCADE-PLAN.md §6) — so its rows are loaded per request via
// the single platform loader (falls back to the committed seed when nothing stored).
//
// WHY THIS ANSWERS THE RESPONSE ITSELF. Every route below checks the id against the
// platform set BEFORE its try block, because a 404 for an unknown id must come before
// any store write. In production loadPlatformDistinctions REJECTS on a storage fault
// rather than quietly serving the seed, and an async Restify handler that rejects
// answers NOTHING AT ALL — the manager's browser would sit there until it gave up.
// So the fault is turned into the same 500 the handler's own catch would have sent.
//
// @param {Object} res - restify response; answered with a 500 when the read fails
// @returns {Promise<Array|null>} the platform rows, or null once `res` is answered
async function _platformRowsOr500 (res) {
  try {
    return await loadPlatformDistinctions(overlay.loadFirmConfig)
  } catch (err) {
    serverError(res, 500, 'DB_ERROR', err)
    return null
  }
}

async function _loadDeclines (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, CONFIG_KEYS.declines)
    return Array.isArray(stored) ? stored : []
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadDeclines(firmId) }
    throw err
  }
}

async function _saveDeclines (firmId, ids, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, CONFIG_KEYS.declines, ids, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteDeclines(firmId, ids); return }
    throw err
  }
}

async function _loadOverrides (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, CONFIG_KEYS.overrides)
    return (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {}
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadOverrides(firmId) }
    throw err
  }
}

async function _saveOverrides (firmId, obj, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, CONFIG_KEYS.overrides, obj, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteOverrides(firmId, obj); return }
    throw err
  }
}

// The firm's "mentor distinction updates last reviewed" marker — one ISO timestamp,
// UI-only (it never affects engine resolution, so it is NOT part of the resolver
// state in firmDistinctions.js). Stored under its own firmOverlay config key like
// the cascade state, with the same dev-JSON fallback. Used to flag which platform
// (mentor) rows changed since the firm manager last acknowledged them.
const LAST_SEEN_KEY = 'distinction-last-seen'

async function _loadLastSeen (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, LAST_SEEN_KEY)
    return typeof stored === 'string' ? stored : null
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadLastSeen(firmId) }
    throw err
  }
}

async function _saveLastSeen (firmId, iso, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, LAST_SEEN_KEY, iso, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteLastSeen(firmId, iso); return }
    throw err
  }
}

// ── Stage E — mentor-update review (drift detection on overridden rows) ────────
// When a firm overrides a platform row, the firm's version SHIELDS it from the
// mentor's later edits (firm-wins-and-sticks). Stage E lets the firm see a mentor
// update and choose Adopt (drop the override → take the mentor's current row) or
// Keep mine (re-stamp the baseline so the prompt clears until the mentor's NEXT edit).
// Detection: at override/keep-mine time we stamp the mentor row's CONTENT SIGNATURE;
// when the live mentor row's signature later differs, the row has drifted.
const OVERRIDE_BASELINES_KEY = 'distinction-override-baselines'

// A stable content signature of a distinction's meaningful fields. Deterministic
// (sorted keys) so the same content always hashes identically; ignores audit fields
// (created_at/updated_by) and id/source so only a real wording/trigger/template/boost/
// domain change counts as drift.
function _distinctionSignature (row) {
  if (!row || typeof row !== 'object') { return '' }
  const norm = {
    domain: String(row.domain || ''),
    description: String(row.description || '').trim(),
    triggers: (Array.isArray(row.triggers) ? row.triggers : []).map(t => String(t).trim()),
    templates: (Array.isArray(row.templates) ? row.templates : []).map(t => String(t).trim()),
    boost: Number(row.boost) || 0
  }
  return JSON.stringify(norm)
}

async function _loadOverrideBaselines (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, OVERRIDE_BASELINES_KEY)
    return (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {}
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadOverrideBaselines(firmId) }
    throw err
  }
}

async function _saveOverrideBaselines (firmId, obj, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, OVERRIDE_BASELINES_KEY, obj, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteOverrideBaselines(firmId, obj); return }
    throw err
  }
}

// ── Stage D — mentor delete → "keep theirs" cross-firm promotion ───────────────
// When the mentor deletes a master (platform) row, a firm that CUSTOMISED it keeps
// its version as a standalone firm-own row (honours "firm customisation wins and
// sticks"); only the master default disappears. Implemented at delete time because
// the mentor handler still holds the full master row (incl. its domain). This is a
// cross-firm write — guarded by the mentor role at the route mount.

// Dev fallback: which firms hold an override for `id` (reads the whole dev-overrides map).
function _devAllOverrideFirms (id) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_OVERRIDES_FILE, 'utf8'))
    return Object.keys(all).filter(fid => all[fid] && typeof all[fid] === 'object' && all[fid][id])
  } catch { return [] }
}

// Every firm that currently overrides platform row `id`. Prod: one indexed query +
// a per-firm read; dev (no DB): the dev-overrides map. All-DB-or-all-dev (no mix).
async function _enumerateOverrideFirms (id) {
  try {
    const firmIds = await overlay.listFirmIdsWithConfigKey(CONFIG_KEYS.overrides)
    const out = []
    for (const fid of firmIds) {
      const ovr = await overlay.loadFirmConfig(fid, CONFIG_KEYS.overrides)
      if (ovr && typeof ovr === 'object' && ovr[id]) { out.push(fid) }
    }
    return out
  } catch (err) {
    if (devFallbackOk(err)) { return _devAllOverrideFirms(id) }
    throw err
  }
}

/**
 * Promote every customising firm's version of a soon-to-be-deleted master row into a
 * standalone firm-own row, then drop that firm's override + drift baseline. Called by
 * the mentor delete handler BEFORE the master row is removed, so `deletedRow` still
 * carries the full master content (incl. domain). Firms that only DECLINED the row
 * need no action (the decline becomes inert once the master is gone); untouched firms
 * simply lose the default. Idempotent: a firm that already has a firm-own copy of this
 * row (e.g. from an earlier "Move to…") is not duplicated — its override is just dropped.
 * @param {object} deletedRow - the full master row about to be deleted (pd-N)
 * @param {string} savedBy - audit attribution (the mentor's email)
 * @returns {Promise<{promoted: string[]}>} firm ids that gained a kept-version row
 */
async function promoteOverridesForDeletedRow (deletedRow, savedBy) {
  const id = deletedRow && deletedRow.id
  if (!id) { return { promoted: [] } }
  const by = savedBy || 'mentor-delete'
  const firmIds = await _enumerateOverrideFirms(id)
  const promoted = []

  try {
    await _promoteEach(firmIds, id, deletedRow, by, promoted)
  } catch (err) {
    // Carry WHAT WAS ALREADY DONE out with the failure. Without this the caller can
    // only say "could not delete" — which is untrue the moment one firm has been
    // promoted, and leaves a retry blind. The loop itself is safe to re-run: a firm
    // holding a kept copy is skipped by the `movedFrom` check below.
    err.promoted = promoted.slice()
    throw err
  }

  return { promoted }
}

/**
 * The per-firm half of the promotion, split out so the caller can report partial
 * progress when it throws. Mutates `promoted` as it goes — deliberately, so the
 * ids survive an exception thrown mid-loop.
 *
 * @param {string[]} firmIds - firms overriding the row
 * @param {string} id - the platform row id being deleted
 * @param {object} deletedRow - the full master row
 * @param {string} by - audit attribution
 * @param {string[]} promoted - accumulator, appended in place
 * @returns {Promise<void>}
 */
async function _promoteEach (firmIds, id, deletedRow, by, promoted) {
  for (const fid of firmIds) {
    const overrides = await _loadOverrides(fid)
    const ovr = overrides[id]
    if (!ovr) { continue }

    const own = await _loadDistinctions(fid)
    // Skip the firm-own write if a copy of this row already exists (idempotent / prior move).
    if (!own.some(r => r.movedFrom === id)) {
      const effective = Object.assign({}, deletedRow, ovr)
      const nextId = own.length > 0 ? Math.max(...own.map(r => r.id || 0)) + 1 : 1
      own.push({
        id: nextId,
        domain: deletedRow.domain,
        description: String(effective.description || '').trim(),
        triggers: Array.isArray(effective.triggers) ? effective.triggers : [],
        templates: Array.isArray(effective.templates) ? effective.templates : [],
        boost: Math.min(20, Math.max(1, Number(effective.boost) || 5)),
        created_by: by,
        created_at: new Date().toISOString(),
        movedFrom: id,
        keptOnMentorDelete: true
      })
      await _saveDistinctions(fid, own, by)
      promoted.push(fid)
    }

    // Drop the now-orphaned override + its drift baseline.
    const nextOverrides = Object.assign({}, overrides)
    delete nextOverrides[id]
    await _saveOverrides(fid, nextOverrides, by)
    const baselines = await _loadOverrideBaselines(fid)
    if (Object.prototype.hasOwnProperty.call(baselines, id)) {
      const nextB = Object.assign({}, baselines)
      delete nextB[id]
      await _saveOverrideBaselines(fid, nextB, by)
    }
  }
}

/**
 * Whitelist + validate the editable fields of a platform-row override. Only the
 * four editable fields are accepted (a partial edit is fine) — id/domain/source
 * are never taken from the client, so an override can change wording, triggers,
 * templates and boost but never a row's identity or domain.
 * @param {Object} body - request body
 * @returns {{ok: true, value: Object}|{ok: false, code: string, message: string}}
 */
function _sanitiseOverrideFields (body) {
  const out = {}
  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || !body.description.trim()) {
      return { ok: false, code: 'INVALID_DESCRIPTION', message: 'description must be a non-empty string' }
    }
    out.description = body.description.trim().slice(0, 255)
  }
  if (body.triggers !== undefined) {
    if (!Array.isArray(body.triggers) || body.triggers.length === 0) {
      return { ok: false, code: 'INVALID_TRIGGERS', message: 'triggers must be a non-empty array' }
    }
    out.triggers = body.triggers.map(t => String(t).trim()).filter(Boolean)
  }
  if (body.templates !== undefined) {
    if (!Array.isArray(body.templates) || body.templates.length === 0) {
      return { ok: false, code: 'INVALID_TEMPLATES', message: 'templates must be a non-empty array' }
    }
    out.templates = body.templates.map(t => String(t).trim()).filter(Boolean)
  }
  if (body.boost !== undefined) {
    out.boost = Math.min(20, Math.max(1, Number(body.boost) || 5))
  }
  if (Object.keys(out).length === 0) {
    return { ok: false, code: 'NO_FIELDS', message: 'no editable fields provided' }
  }
  return { ok: true, value: out }
}

/**
 * @route GET /api/firm-manager/distinctions/state
 * Returns the firm's full distinction state (own rows + declined platform ids +
 * platform overrides) and the resolved effective list, so the UI can render one
 * unified, badged list.
 * @returns {{ownRows: Array, declinedIds: string[], overrides: Object, effective: Array}}
 */
async function getDistinctionState (req, res) {
  try {
    const state = await loadFirmDistinctionState(req.firmId, overlay.loadFirmConfig)
    const platformRows = await loadPlatformDistinctions(overlay.loadFirmConfig)
    const effective = resolveEffectiveDistinctions(platformRows, state)

    const overriddenIds = new Set(Object.keys(state.overrides || {}))
    const declinedIdSet = new Set(state.declinedIds || [])

    // ── Stage E drift (rows this firm has OVERRIDDEN): the mentor changed a row the
    // firm customised, so the firm is currently shielded and should be offered Adopt /
    // Keep-mine. Compare the live mentor row's signature to the baseline stamped when
    // the firm last overrode / kept-mine it. A missing baseline (an override predating
    // this feature) is lazily backfilled to the current signature — assume in-sync now,
    // track drift from here — so existing firm edits never get a false "updated" prompt.
    const baselines = await _loadOverrideBaselines(req.firmId)
    let baselinesChanged = false
    const driftIds = []
    for (const row of platformRows) {
      if (!overriddenIds.has(row.id)) { continue }
      const sig = _distinctionSignature(row)
      if (!Object.prototype.hasOwnProperty.call(baselines, row.id)) {
        baselines[row.id] = sig
        baselinesChanged = true
      } else if (baselines[row.id] !== sig) {
        driftIds.push(row.id)
      }
    }
    if (baselinesChanged) {
      await _saveOverrideBaselines(req.firmId, baselines, req.userEmail)
    }

    // ── "Since your last visit" notice (rows the firm PASSIVELY inherits — neither
    // overridden nor declined): a mentor edit auto-applies, so this is informational
    // only. Overridden rows are excluded here (handled by drift above); declined rows
    // are off and need no notice. A row's mentor timestamp is updated_at (an edit) or
    // created_at (a new row); seed rows carry neither and are never flagged. Mapped to
    // fresh objects so the cached seed array is never mutated across requests.
    const lastReviewedAt = await _loadLastSeen(req.firmId)
    const seenMs = lastReviewedAt ? new Date(lastReviewedAt).getTime() : 0
    let newUpdateCount = 0
    const platform = platformRows.map((row) => {
      const passive = !overriddenIds.has(row.id) && !declinedIdSet.has(row.id)
      const ts = row.updated_at || row.created_at || null
      const ms = ts ? new Date(ts).getTime() : NaN
      const mentorUpdated = passive && !Number.isNaN(ms) && ms > seenMs
      if (mentorUpdated) { newUpdateCount++ }
      return { ...row, mentorUpdated, mentorUpdatedAt: mentorUpdated ? ts : null }
    })

    res.send(200, {
      ownRows: state.ownRows,
      declinedIds: state.declinedIds,
      overrides: state.overrides,
      effective,
      platform,
      lastReviewedAt,
      newUpdateCount,
      driftIds
    })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route POST /api/firm-manager/distinctions/mark-reviewed
 * Acknowledge the mentor distinction updates: advance the firm's "last reviewed"
 * marker to now, which clears the "since your last visit" banner and per-row badges.
 * Set only on an explicit click (never on page load) so a manager never loses the
 * notice before reading it. Scoped to the JWT-verified req.firmId.
 * @returns {{ reviewed: true, lastReviewedAt: string }}
 */
async function markDistinctionsReviewed (req, res) {
  try {
    const now = new Date().toISOString()
    await _saveLastSeen(req.firmId, now, req.userEmail)
    res.send(200, { reviewed: true, lastReviewedAt: now })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route PUT /api/firm-manager/distinctions/platform/:id
 * Save a firm override of a platform row — the firm's edited version replaces the
 * platform original in the effective list (firm wins).
 * @param {string} id - the platform distinction id (pd-N)
 * @returns {{updated: true, id: string}}
 */
async function setDistinctionOverride (req, res) {
  const id = String(req.params.id || '')
  const platformRows = await _platformRowsOr500(res)
  if (!platformRows) { return }
  const platformRow = platformRows.find(r => r.id === id)
  if (!platformRow) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform distinction with that id')
  }
  const sani = _sanitiseOverrideFields(req.body || {})
  if (!sani.ok) { return sendError(res, 400, sani.code, sani.message) }
  try {
    const overrides = await _loadOverrides(req.firmId)
    const next = { ...overrides, [id]: { ...(overrides[id] || {}), ...sani.value } }
    await _saveOverrides(req.firmId, next, req.userEmail)
    // Stamp the mentor row's current signature as the drift baseline — the firm has
    // just (re)stated its version against this mentor content, so drift is measured
    // from here (Stage E). A later mentor edit makes the signatures differ → prompt.
    const baselines = await _loadOverrideBaselines(req.firmId)
    await _saveOverrideBaselines(req.firmId, { ...baselines, [id]: _distinctionSignature(platformRow) }, req.userEmail)
    res.send(200, { updated: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route DELETE /api/firm-manager/distinctions/platform/:id
 * Reset to platform — remove the firm's override so the platform row applies
 * again. Idempotent (a no-op if there was no override).
 * @param {string} id - the platform distinction id (pd-N)
 * @returns {{reset: true, id: string}}
 */
async function resetDistinctionOverride (req, res) {
  const id = String(req.params.id || '')
  const platformRows = await _platformRowsOr500(res)
  if (!platformRows) { return }
  if (!platformRows.some(r => r.id === id)) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform distinction with that id')
  }
  try {
    const overrides = await _loadOverrides(req.firmId)
    if (Object.prototype.hasOwnProperty.call(overrides, id)) {
      const next = { ...overrides }
      delete next[id]
      await _saveOverrides(req.firmId, next, req.userEmail)
    }
    // Adopt path: the firm no longer holds its own version, so drop the drift baseline
    // too (a stale baseline is inert, but clearing it keeps the store honest).
    const baselines = await _loadOverrideBaselines(req.firmId)
    if (Object.prototype.hasOwnProperty.call(baselines, id)) {
      const nextB = { ...baselines }
      delete nextB[id]
      await _saveOverrideBaselines(req.firmId, nextB, req.userEmail)
    }
    res.send(200, { reset: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route POST /api/firm-manager/distinctions/platform/:id/keep-mine
 * Stage E "Keep mine" — the firm has seen the mentor's update to a row it overrode and
 * chooses to keep its own version. Re-stamps the drift baseline to the mentor's CURRENT
 * signature, so the "mentor updated this" prompt clears until the mentor's NEXT edit. The
 * firm's override is left untouched. 404 if it isn't a platform row; 409 if the firm has
 * no override for it (nothing to keep).
 * @param {string} id - the platform distinction id (pd-N)
 * @returns {{ keptMine: true, id: string }}
 */
async function keepMineDistinction (req, res) {
  const id = String(req.params.id || '')
  const platformRows = await _platformRowsOr500(res)
  if (!platformRows) { return }
  const platformRow = platformRows.find(r => r.id === id)
  if (!platformRow) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform distinction with that id')
  }
  try {
    const overrides = await _loadOverrides(req.firmId)
    if (!Object.prototype.hasOwnProperty.call(overrides, id)) {
      return sendError(res, 409, 'NOT_OVERRIDDEN', 'This firm has no custom version of that distinction')
    }
    const baselines = await _loadOverrideBaselines(req.firmId)
    await _saveOverrideBaselines(req.firmId, { ...baselines, [id]: _distinctionSignature(platformRow) }, req.userEmail)
    res.send(200, { keptMine: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route PUT /api/firm-manager/distinctions/platform/:id/decline
 * Switch a platform row off (declined:true) or back on (declined:false) for this
 * firm. Decline takes precedence over an override, so re-enabling restores any
 * edit the firm had made.
 * @param {string} id - the platform distinction id (pd-N)
 * @returns {{declined: boolean, id: string}}
 */
async function setDistinctionDecline (req, res) {
  const id = String(req.params.id || '')
  const platformRows = await _platformRowsOr500(res)
  if (!platformRows) { return }
  if (!platformRows.some(r => r.id === id)) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform distinction with that id')
  }
  const declined = (req.body || {}).declined
  if (typeof declined !== 'boolean') {
    return sendError(res, 400, 'INVALID_DECLINED', 'declined must be a boolean')
  }
  try {
    const set = new Set(await _loadDeclines(req.firmId))
    if (declined) { set.add(id) } else { set.delete(id) }
    await _saveDeclines(req.firmId, [...set], req.userEmail)
    res.send(200, { declined, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route POST /api/firm-manager/distinctions/platform/:id/move
 * Move a platform distinction into a more suitable domain for this firm. Distinctions
 * are scored only within the detected domain, so a row filed under the wrong domain
 * never fires; this relocates it. The distinction's content as it currently reads
 * (platform base + any firm override) is recreated as a firm-OWN row in the target
 * domain, and the platform original is switched off in its old domain. Any now-
 * redundant override of the original is cleared. (Logical move via the firm config
 * stores; a future MySQL transaction will make the multi-store write atomic.)
 * @param {string} id - the platform distinction id (pd-N)
 * @returns {{moved: true, fromId: string, newId: number, targetDomain: string}}
 */
async function moveDistinction (req, res) {
  const id = String(req.params.id || '')
  const platformRows = await _platformRowsOr500(res)
  if (!platformRows) { return }
  const platformRow = platformRows.find(r => r.id === id)
  if (!platformRow) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform distinction with that id')
  }
  const { targetDomain } = req.body || {}
  if (!targetDomain || !DISTINCTION_DOMAINS.has(targetDomain)) {
    return sendError(res, 400, 'INVALID_DOMAIN', 'targetDomain must be a recognised advisory domain')
  }
  if (targetDomain === platformRow.domain) {
    return sendError(res, 400, 'SAME_DOMAIN', 'targetDomain must differ from the distinction\'s current domain')
  }

  try {
    // Effective content = platform base with the firm's edits (if any) applied.
    const overrides = await _loadOverrides(req.firmId)
    const effective = Object.assign({}, platformRow, overrides[id] || {})

    // Recreate as a firm-own row in the target domain (carries content as it reads).
    const existing = await _loadDistinctions(req.firmId)
    // Guard: this platform row has already been moved (a firm-own copy exists). Moving
    // again would create a duplicate and, if the override was cleared by the first move,
    // silently lose the firm's edits. Block it and point them at the existing copy.
    if (existing.some(r => r.movedFrom === id)) {
      return sendError(res, 409, 'ALREADY_MOVED',
        'This distinction has already been moved to one of your domains — edit or remove that copy instead of moving it again.')
    }
    const nextId = existing.length > 0 ? Math.max(...existing.map(r => r.id || 0)) + 1 : 1
    const newRow = {
      id: nextId,
      domain: targetDomain,
      description: String(effective.description || '').trim(),
      triggers: Array.isArray(effective.triggers) ? effective.triggers : [],
      templates: Array.isArray(effective.templates) ? effective.templates : [],
      boost: Math.min(20, Math.max(1, Number(effective.boost) || 5)),
      created_by: req.userEmail,
      created_at: new Date().toISOString(),
      movedFrom: id
    }
    await _saveDistinctions(req.firmId, existing.concat([newRow]), req.userEmail)

    // Switch the platform original off in its old domain for this firm.
    const declines = new Set(await _loadDeclines(req.firmId))
    declines.add(id)
    await _saveDeclines(req.firmId, [...declines], req.userEmail)

    // Drop any now-redundant override of the original (the firm-own copy holds the
    // content; switching the original back on later should give a clean platform base).
    if (Object.prototype.hasOwnProperty.call(overrides, id)) {
      const nextOverrides = Object.assign({}, overrides)
      delete nextOverrides[id]
      await _saveOverrides(req.firmId, nextOverrides, req.userEmail)
    }

    res.send(201, { moved: true, fromId: id, newId: nextId, targetDomain })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Advisory Staircase (whole-config firm override) ───────────────────────────
// Stored in firm_framework_versions under config_key='advisory-staircase' (same
// table as Decision Framework + Advisory Distinctions — no new schema). Version
// history + restore reuse the generic getFrameworkHistory/restoreFramework routes
// with configKey='advisory-staircase'. Read returns the platform base alongside
// the firm override so the editor can show the starting point.

const STAIRCASE_KEY = 'advisory-staircase'

// Allowed complexity-ceiling values are derived from the base data file (single
// source of truth) — never hardcoded — so they track the framework if it changes.
const STAIRCASE_CEILINGS = new Set(
  BASE_STAIRCASE.steps.map(s => s.complexityCeiling).concat(BASE_STAIRCASE.defaultCeiling)
)

/**
 * Length cap on the staircase question a tier may write (item 4.16 E).
 *
 * The platform's own sentence is 88 characters. This is not a formatting preference:
 * the value is put to the advisor as a question and travels into the advisor prompt,
 * so an unbounded field is a place to paste an essay — or an instruction — into every
 * session that tier runs. A cap does not make the field safe on its own (any tier that
 * can edit it is already trusted with step names and descriptions, which reach the same
 * place), it bounds the blast radius of a mistake.
 * @type {number}
 */
const SELECTOR_PROMPT_MAX = 500

function _devReadStaircase (firmId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_STAIRCASE_FILE, 'utf8'))
    return all[firmId] || null
  } catch { return null }
}

function _devWriteStaircase (firmId, cfg) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_STAIRCASE_FILE, 'utf8'))
  } catch {}
  all[firmId] = cfg
  fs.writeFileSync(DEV_STAIRCASE_FILE, JSON.stringify(all, null, 2))
}

async function _loadStaircase (firmId) {
  try {
    return await overlay.loadFirmConfig(firmId, STAIRCASE_KEY)
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadStaircase(firmId) }
    throw err
  }
}

async function _saveStaircaseOverride (firmId, cfg, savedBy) {
  try {
    return await overlay.saveFirmConfig(firmId, STAIRCASE_KEY, cfg, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteStaircase(firmId, cfg); return null }
    throw err
  }
}

// Returns an error string if the override is invalid, or null if it is well-formed.
//
// `steps` became OPTIONAL on 2026-07-31. Per-step wording is no longer saved as a
// whole copy — it goes through the cascade routes below, one decision at a time — so
// this route's remaining job is the ceiling settings. A body that still carries steps
// is validated exactly as before, which is why no existing caller changed.
function _validateStaircase (cfg) {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
    return 'staircase must be a non-array JSON object'
  }
  if (cfg.steps !== undefined && (!Array.isArray(cfg.steps) || cfg.steps.length === 0)) {
    return 'steps must be a non-empty array'
  }
  // selectorPrompt is OPTIONAL on every shape (item 4.16 E). A body that omits it is
  // saying nothing about it, which must not wipe a value already stored — the ceiling
  // controls and this field share one key and one Save button, and the frontend sends
  // both together, but a hand-made request need not.
  if (cfg.selectorPrompt !== undefined) {
    if (typeof cfg.selectorPrompt !== 'string' || !cfg.selectorPrompt.trim()) {
      return 'selectorPrompt must be a non-empty string'
    }
    if (cfg.selectorPrompt.trim().length > SELECTOR_PROMPT_MAX) {
      return `selectorPrompt must be ${SELECTOR_PROMPT_MAX} characters or fewer`
    }
  }
  if (cfg.steps === undefined) {
    return STAIRCASE_CEILINGS.has(cfg.defaultCeiling)
      ? null
      : `defaultCeiling must be one of: ${[...STAIRCASE_CEILINGS].join(', ')}`
  }
  const allowed = [...STAIRCASE_CEILINGS].join(', ')
  const seen = new Set()
  for (const s of cfg.steps) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      return 'each step must be an object'
    }
    if (!Number.isInteger(s.step)) {
      return 'each step needs an integer "step" number'
    }
    if (seen.has(s.step)) {
      return `duplicate step number: ${s.step}`
    }
    seen.add(s.step)
    if (!s.name || typeof s.name !== 'string' || !s.name.trim()) {
      return 'each step needs a non-empty name'
    }
    if (!STAIRCASE_CEILINGS.has(s.complexityCeiling)) {
      return `each step's complexityCeiling must be one of: ${allowed}`
    }
  }
  if (!STAIRCASE_CEILINGS.has(cfg.defaultCeiling)) {
    return `defaultCeiling must be one of: ${allowed}`
  }
  return null
}

// ── Staircase cascade (the one firm-editable mechanism, 2026-07-31) ────────────
// Switch a platform step off, edit one, or add your own — each a single decision
// keyed to a step id, stored in its own key. Mirrors the distinction routes above,
// deliberately: same shapes, same verbs, same error codes, so a reader who knows one
// knows the other.

const {
  loadFirmStaircaseState, CONFIG_KEYS: STAIRCASE_KEYS, EDITABLE_STEP_FIELDS, ownStepPrefix
} = require('../utils/firmStaircase')
const { loadBlendedStaircase } = require('../utils/staircaseConfig')

const STAIRCASE_DEV_FILES = {
  [STAIRCASE_KEYS.declines]: DEV_STAIRCASE_DECLINES_FILE,
  [STAIRCASE_KEYS.overrides]: DEV_STAIRCASE_OVERRIDES_FILE,
  [STAIRCASE_KEYS.own]: DEV_STAIRCASE_OWN_FILE
}

const PLATFORM_STEP_IDS = new Set(BASE_STAIRCASE.steps.map(s => s.id))

function _devReadStaircasePart (file, firmId, fallback) {
  try {
    const all = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Object.prototype.hasOwnProperty.call(all, firmId) ? all[firmId] : fallback
  } catch { return fallback }
}

function _devWriteStaircasePart (file, firmId, value) {
  let all = {}
  try { all = JSON.parse(fs.readFileSync(file, 'utf8')) } catch {}
  all[firmId] = value
  fs.writeFileSync(file, JSON.stringify(all, null, 2))
}

async function _loadStaircasePart (firmId, key, fallback) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, key)
    return (stored === null || stored === undefined) ? fallback : stored
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadStaircasePart(STAIRCASE_DEV_FILES[key], firmId, fallback) }
    throw err
  }
}

async function _saveStaircasePart (firmId, key, value, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, key, value, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteStaircasePart(STAIRCASE_DEV_FILES[key], firmId, value); return }
    throw err
  }
}

/**
 * Accept only the fields a firm may edit on a step, in the types they must be.
 *
 * `id` and `step` are absent from EDITABLE_STEP_FIELDS on purpose: the id is identity
 * and the number is a position the resolver assigns. Neither is the firm's to set, and
 * letting either through the body would let a firm re-point an edit at another step.
 *
 * @param {Object} body
 * @returns {{ok: boolean, value?: Object, code?: string, message?: string}}
 */
function _sanitiseStaircaseFields (body) {
  const src = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {}
  const value = {}
  for (const field of EDITABLE_STEP_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(src, field)) { continue }
    if (field === 'complexityCeiling') {
      if (!STAIRCASE_CEILINGS.has(src[field])) {
        return { ok: false, code: 'INVALID_CEILING', message: `complexityCeiling must be one of: ${[...STAIRCASE_CEILINGS].join(', ')}` }
      }
      value[field] = src[field]
      continue
    }
    if (typeof src[field] !== 'string') {
      return { ok: false, code: 'INVALID_FIELD', message: `${field} must be a string` }
    }
    value[field] = src[field].trim()
  }
  if (Object.keys(value).length === 0) {
    return { ok: false, code: 'NO_FIELDS', message: `Provide at least one of: ${EDITABLE_STEP_FIELDS.join(', ')}` }
  }
  if (Object.prototype.hasOwnProperty.call(value, 'name') && !value.name) {
    return { ok: false, code: 'INVALID_FIELD', message: 'name must not be empty' }
  }
  return { ok: true, value }
}

// ── Phase 3 — platform-update review on steps a firm has edited ───────────────
// A firm's edit SHIELDS a step from later platform wording (firm-wins-and-sticks),
// which is right until the platform improves that step: the firm then never sees the
// improvement, permanently, with nothing on screen to say so. This is the same
// mechanism Stage E gives Advisory Distinctions — stamp the platform row's content
// signature when the firm edits, and when the live signature later differs, offer
// Adopt (drop the edit, take the platform's step) or Keep mine (re-stamp, so the
// prompt clears until the platform's NEXT change).
//
// ONE HONEST DIFFERENCE FROM DISTINCTIONS, worth knowing before reading this as an
// exact copy. A mentor authors distinctions in the running app, so a firm sees drift
// within minutes. The staircase is a COMMITTED FILE (data/advisory-staircase.json),
// so its signature changes when a release ships, not while anyone is looking. The
// detection is identical; the cadence is release-to-release.
//
// There is deliberately NO "since your last visit" half here. That notice covers rows
// a firm has NOT edited, and reads the mentor row's updated_at/created_at — timestamps
// the staircase file does not carry. A step a firm has not touched already updates
// itself silently, which is the wanted behaviour; inventing timestamps to announce it
// would be building a feature nobody asked for out of data that does not exist.
const STAIRCASE_BASELINES_KEY = 'staircase-override-baselines'

function _devReadStaircaseBaselines (firmId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_STAIRCASE_BASELINES_FILE, 'utf8'))
    const v = all[firmId]
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
  } catch { return {} }
}

function _devWriteStaircaseBaselines (firmId, obj) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_STAIRCASE_BASELINES_FILE, 'utf8'))
  } catch {}
  all[firmId] = obj
  fs.writeFileSync(DEV_STAIRCASE_BASELINES_FILE, JSON.stringify(all, null, 2))
}

/**
 * A stable content signature of a platform step's meaningful fields.
 *
 * Deterministic (fixed field order) so the same content always signs identically, and
 * limited to EDITABLE_STEP_FIELDS: `id` is identity and `step` is a POSITION the
 * resolver assigns, so including either would report a firm's step as "updated"
 * because a step above it was declined — an update prompt for a change that never
 * touched this step's wording.
 *
 * @param {Object} row - a platform step
 * @returns {string} the signature, or '' for a missing row
 */
function _staircaseStepSignature (row) {
  if (!row || typeof row !== 'object') { return '' }
  const norm = {}
  for (const field of EDITABLE_STEP_FIELDS) {
    norm[field] = String(row[field] === null || row[field] === undefined ? '' : row[field]).trim()
  }
  return JSON.stringify(norm)
}

async function _loadStaircaseBaselines (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, STAIRCASE_BASELINES_KEY)
    return (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {}
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadStaircaseBaselines(firmId) }
    throw err
  }
}

async function _saveStaircaseBaselines (firmId, obj, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, STAIRCASE_BASELINES_KEY, obj, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteStaircaseBaselines(firmId, obj); return }
    throw err
  }
}

/**
 * Which of this firm's edited steps the platform has changed since the firm last
 * stated its version.
 *
 * A MISSING BASELINE IS BACKFILLED, NOT TREATED AS DRIFT. An edit made before this
 * feature existed has no stamp, and reading that as "the platform changed this" would
 * greet every such firm with a review prompt for an update that never happened. The
 * honest reading is "assume in sync now, track from here".
 *
 * @param {string} firmId
 * @param {Object} overrides - the firm's edits, keyed by platform step id
 * @param {string} savedBy - audit attribution for a backfill write
 * @returns {Promise<string[]>} platform step ids to offer Adopt / Keep mine on
 */
async function _staircaseDriftIds (firmId, overrides, savedBy) {
  const edited = Object.keys(overrides || {})
  if (edited.length === 0) { return [] }

  const baselines = await _loadStaircaseBaselines(firmId)
  const driftIds = []
  let backfilled = false

  for (const step of BASE_STAIRCASE.steps) {
    if (!step || !edited.includes(step.id)) { continue }
    const sig = _staircaseStepSignature(step)
    if (!Object.prototype.hasOwnProperty.call(baselines, step.id)) {
      baselines[step.id] = sig
      backfilled = true
    } else if (baselines[step.id] !== sig) {
      driftIds.push(step.id)
    }
  }

  if (backfilled) { await _saveStaircaseBaselines(firmId, baselines, savedBy) }
  return driftIds
}

/**
 * @route GET /api/firm-manager/staircase
 * The tab's whole picture: Advisor-e's steps, this firm's decisions, and the resolved
 * list those two produce — the SAME resolved list the advisor's selector and the
 * engine's ceiling read, so the screen can never show a firm something different from
 * what its advisors get.
 * @returns {{base: Object, state: Object, resolved: Array, driftIds: string[],
 *   hasOverride: boolean}} `driftIds` are the firm's edited steps the platform has
 *   changed since — the tab offers Adopt / Keep mine on those.
 */
async function getStaircase (req, res) {
  try {
    const firmOverride = await _loadStaircase(req.firmId)
    const state = await loadFirmStaircaseState(req.firmId, overlay.loadFirmConfig, BASE_STAIRCASE.steps)
    const resolved = await loadBlendedStaircase(req.firmId, overlay.loadFirmConfig)
    const driftIds = await _staircaseDriftIds(req.firmId, state.overrides, req.userEmail)
    res.send(200, {
      base: BASE_STAIRCASE,
      firmOverride,
      state,
      resolved: resolved.steps,
      defaultCeiling: resolved.defaultCeiling,
      // The RESOLVED question, not this tier's own stored value: a firm that has not
      // written one must see the sentence its advisors are actually asked, which is
      // the mentor's. Showing an empty box there would read as "nobody has set this".
      selectorPrompt: resolved.selectorPrompt,
      driftIds,
      hasOverride: firmOverride !== null ||
        state.declinedIds.length > 0 ||
        Object.keys(state.overrides).length > 0 ||
        state.ownRows.length > 0
    })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route PUT /api/firm-manager/staircase/platform/:id
 * Edit an Advisor-e step for this firm. Fields the body does not carry are NOT
 * recorded, so they keep tracking Advisor-e's wording rather than being frozen at
 * today's text — the whole point of the mechanism.
 * @param {string} id - a platform step id (as-*)
 * @returns {{updated: true, id: string}}
 */
async function setStaircaseOverride (req, res) {
  const id = String(req.params.id || '')
  if (!PLATFORM_STEP_IDS.has(id)) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform staircase step with that id')
  }
  const sani = _sanitiseStaircaseFields(req.body || {})
  if (!sani.ok) { return sendError(res, 400, sani.code, sani.message) }
  try {
    const overrides = await _loadStaircasePart(req.firmId, STAIRCASE_KEYS.overrides, {})
    const current = (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) ? overrides : {}
    const next = { ...current, [id]: { ...(current[id] || {}), ...sani.value } }
    await _saveStaircasePart(req.firmId, STAIRCASE_KEYS.overrides, next, req.userEmail)
    // Stamp the platform step's current wording as the drift baseline: the firm has
    // just stated its version against THIS text, so a later platform change to it is
    // what the firm should be offered (Phase 3).
    const baselines = await _loadStaircaseBaselines(req.firmId)
    const platformRow = BASE_STAIRCASE.steps.find(s => s && s.id === id)
    await _saveStaircaseBaselines(
      req.firmId, { ...baselines, [id]: _staircaseStepSignature(platformRow) }, req.userEmail
    )
    res.send(200, { updated: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route DELETE /api/firm-manager/staircase/platform/:id
 * Reset to platform — drop this firm's version so Advisor-e's step applies again, and
 * keeps applying as Advisor-e changes it. Idempotent.
 * @param {string} id - a platform step id (as-*)
 * @returns {{reset: true, id: string}}
 */
async function resetStaircaseOverride (req, res) {
  const id = String(req.params.id || '')
  if (!PLATFORM_STEP_IDS.has(id)) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform staircase step with that id')
  }
  try {
    const overrides = await _loadStaircasePart(req.firmId, STAIRCASE_KEYS.overrides, {})
    const current = (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) ? overrides : {}
    if (Object.prototype.hasOwnProperty.call(current, id)) {
      const next = { ...current }
      delete next[id]
      await _saveStaircasePart(req.firmId, STAIRCASE_KEYS.overrides, next, req.userEmail)
    }
    // Also the Adopt path (Phase 3): the firm no longer holds its own version, so the
    // drift baseline goes with it. A stale baseline is inert — it is dropped to keep
    // the store honest, and so a later re-edit stamps fresh rather than inheriting a
    // signature from a decision the firm has since undone.
    const baselines = await _loadStaircaseBaselines(req.firmId)
    if (Object.prototype.hasOwnProperty.call(baselines, id)) {
      const nextB = { ...baselines }
      delete nextB[id]
      await _saveStaircaseBaselines(req.firmId, nextB, req.userEmail)
    }
    res.send(200, { reset: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route PUT /api/firm-manager/staircase/platform/:id/decline
 * Switch an Advisor-e step off for this firm, or back on. Only the declines key is
 * written — the firm's override survives — so a firm that switches a step back on
 * gets ITS OWN wording back, not Advisor-e's. Dropping an edit is the reset route
 * (DELETE .../platform/:id); the two are separate on purpose, and a comment saying
 * this returns Advisor-e's wording was wrong from Phase 2 until 2026-07-31.
 * @param {string} id - a platform step id (as-*)
 * @param {boolean} req.body.declined
 * @returns {{declined: boolean, id: string}}
 */
async function setStaircaseDecline (req, res) {
  const id = String(req.params.id || '')
  if (!PLATFORM_STEP_IDS.has(id)) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform staircase step with that id')
  }
  const declined = (req.body || {}).declined
  if (typeof declined !== 'boolean') {
    return sendError(res, 400, 'INVALID_DECLINED', 'declined must be a boolean')
  }
  try {
    const stored = await _loadStaircasePart(req.firmId, STAIRCASE_KEYS.declines, [])
    const set = new Set(Array.isArray(stored) ? stored : [])
    if (declined) { set.add(id) } else { set.delete(id) }
    // Switching every step off would leave an advisor mid-session with nothing to
    // choose from. The blend has a second lock for this; refusing here is the first,
    // and the only one that can explain itself to the person who asked for it.
    if (declined && set.size >= PLATFORM_STEP_IDS.size) {
      const ownRows = await _loadStaircasePart(req.firmId, STAIRCASE_KEYS.own, [])
      if (!Array.isArray(ownRows) || ownRows.length === 0) {
        return sendError(res, 409, 'LAST_STEP', 'At least one step must stay switched on — add your own step first, or switch another back on')
      }
    }
    await _saveStaircasePart(req.firmId, STAIRCASE_KEYS.declines, [...set], req.userEmail)
    res.send(200, { declined, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route POST /api/firm-manager/staircase/platform/:id/keep-mine
 * Phase 3 "Keep mine" — the firm has seen the platform's update to a step it edited
 * and is keeping its own version. Re-stamps the drift baseline to the platform's
 * CURRENT wording, so the review prompt clears until the platform's NEXT change. The
 * firm's edit is left untouched; the Adopt half of the choice is the existing
 * reset route, which drops the edit and takes the platform's step.
 *
 * 409 rather than a silent success when the firm holds no edit: nothing is being
 * kept, and stamping a baseline for a step the firm does not override would arm a
 * prompt that can never fire.
 *
 * @param {string} id - a platform step id (as-*)
 * @returns {{keptMine: true, id: string}}
 */
async function keepMineStaircaseStep (req, res) {
  const id = String(req.params.id || '')
  const platformRow = BASE_STAIRCASE.steps.find(s => s && s.id === id)
  if (!platformRow) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform staircase step with that id')
  }
  try {
    const overrides = await _loadStaircasePart(req.firmId, STAIRCASE_KEYS.overrides, {})
    const current = (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) ? overrides : {}
    if (!Object.prototype.hasOwnProperty.call(current, id)) {
      return sendError(res, 409, 'NOT_OVERRIDDEN', 'Your firm has no custom version of that step')
    }
    const baselines = await _loadStaircaseBaselines(req.firmId)
    await _saveStaircaseBaselines(
      req.firmId, { ...baselines, [id]: _staircaseStepSignature(platformRow) }, req.userEmail
    )
    res.send(200, { keptMine: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route POST /api/firm-manager/staircase/own
 * Add a step of the firm's own, after Advisor-e's. Its id is assigned here (fs-N) and
 * never taken from the body — an id from the browser could collide with a platform
 * step and silently replace it.
 * @returns {{added: true, id: string}}
 */
async function addOwnStaircaseStep (req, res) {
  const sani = _sanitiseStaircaseFields(req.body || {})
  if (!sani.ok) { return sendError(res, 400, sani.code, sani.message) }
  if (!sani.value.name) {
    return sendError(res, 400, 'INVALID_FIELD', 'A step needs a name')
  }
  try {
    const stored = await _loadStaircasePart(req.firmId, STAIRCASE_KEYS.own, [])
    const rows = Array.isArray(stored) ? stored : []
    // Highest existing number + 1, never the row count: reusing a deleted step's id
    // would hand a new step the decisions recorded against the old one.
    // The prefix depends on WHO is adding: a mentor's steps mint under `ms-`, a
    // firm's under `fs-`. Both scopes number from 1, and since Phase 5 a firm sees
    // the mentor's steps in its own resolved list — one shared prefix would put two
    // different steps under one id, and every decision here is keyed to an id.
    const prefix = ownStepPrefix(req.firmId)
    const used = rows
      .map(r => parseInt(String((r && r.id) || '').replace(prefix, ''), 10))
      .filter(n => Number.isInteger(n))
    const id = `${prefix}${(used.length ? Math.max(...used) : 0) + 1}`
    const next = [...rows, {
      id,
      name: sani.value.name,
      selectorDescription: sani.value.selectorDescription || '',
      complexityCeiling: sani.value.complexityCeiling || BASE_STAIRCASE.defaultCeiling
    }]
    await _saveStaircasePart(req.firmId, STAIRCASE_KEYS.own, next, req.userEmail)
    res.send(201, { added: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route PUT /api/firm-manager/staircase/own/:id
 * Edit a step this firm added.
 * @param {string} id - a firm step id (fs-*)
 * @returns {{updated: true, id: string}}
 */
async function updateOwnStaircaseStep (req, res) {
  const id = String(req.params.id || '')
  const sani = _sanitiseStaircaseFields(req.body || {})
  if (!sani.ok) { return sendError(res, 400, sani.code, sani.message) }
  try {
    const stored = await _loadStaircasePart(req.firmId, STAIRCASE_KEYS.own, [])
    const rows = Array.isArray(stored) ? stored : []
    const index = rows.findIndex(r => r && r.id === id)
    if (index === -1) {
      return sendError(res, 404, 'NOT_FOUND', 'No step of your own with that id')
    }
    const next = rows.map((r, i) => (i === index ? { ...r, ...sani.value, id } : r))
    await _saveStaircasePart(req.firmId, STAIRCASE_KEYS.own, next, req.userEmail)
    res.send(200, { updated: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route DELETE /api/firm-manager/staircase/own/:id
 * Remove a step this firm added. Only the firm's own steps can be removed — an
 * Advisor-e step is switched off, never deleted, so it can come back.
 * @param {string} id - a firm step id (fs-*)
 * @returns {{removed: true, id: string}}
 */
async function deleteOwnStaircaseStep (req, res) {
  const id = String(req.params.id || '')
  try {
    const stored = await _loadStaircasePart(req.firmId, STAIRCASE_KEYS.own, [])
    const rows = Array.isArray(stored) ? stored : []
    if (!rows.some(r => r && r.id === id)) {
      return sendError(res, 404, 'NOT_FOUND', 'No step of your own with that id')
    }
    await _saveStaircasePart(req.firmId, STAIRCASE_KEYS.own, rows.filter(r => !(r && r.id === id)), req.userEmail)
    res.send(200, { removed: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function saveStaircase (req, res) {
  const { staircase } = req.body || {}
  const validationError = _validateStaircase(staircase)
  if (validationError) {
    return sendError(res, 400, 'INVALID_STAIRCASE', validationError)
  }
  try {
    const version = await _saveStaircaseOverride(req.firmId, staircase, req.userEmail)
    res.send(200, { saved: true, version })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Quizzes (CB-31 Phase 2) ───────────────────────────────────────────────────
// Stored in firm_framework_versions under config_key='quiz-banks' — the same
// table as the Staircase and Distinctions, so no new schema and the generic
// history/restore routes work with configKey='quiz-banks'. Read returns the
// platform base alongside the firm's overlay so the editor can show both the
// starting point and what the firm changed.

const { CONFIG_KEY: QUIZ_KEY, validateQuizOverride, mergeQuizBanks } = require('../utils/firmQuizzes')
// The cascade's own imports live up here rather than beside its handlers below, so
// getQuizzes can read the resolved banks without referencing a binding declared
// further down the file.
const {
  loadFirmQuizState,
  CONFIG_KEYS: QUIZ_KEYS,
  EDITABLE_QUESTION_FIELDS,
  ownQuestionPrefix,
  LIMITS: QUIZ_LIMITS
} = require('../utils/firmQuizzes')
const { loadBlendedQuizBanks } = require('../utils/quizConfig')
const { listTemplatePages, resolveTemplateName } = require('../utils/resolveTemplateName')
const BASE_QUIZZES = require('../../data/course-quizzes.json')
const QUIZZABLE = require('../../data/quizzable-sections.json')

/**
 * Keep only pages in sub-sections that can hold quiz material.
 *
 * Mike's ruling 2026-07-22: the editor lists genuine advisory-content areas
 * only. Two of the excluded Do-the-Job pages carry no sub-section at all, so
 * before this rule they appeared under a heading the app invented — showing a
 * group that exists nowhere in the firm's library.
 *
 * A section absent from `restrictions` is unrestricted, so a section added
 * upstream stays visible rather than silently disappearing.
 *
 * @param {Array<Object>} pages - rows from listTemplatePages()
 * @returns {Array<Object>} the subset that may hold a quiz
 */
function quizzablePages (pages) {
  const limits = (QUIZZABLE && QUIZZABLE.restrictions) || {}
  const sectionOrder = (QUIZZABLE && QUIZZABLE.sectionOrder) || []
  const subOrder = (QUIZZABLE && QUIZZABLE.subSectionOrder) || {}

  const kept = pages.filter((p) => {
    const allowed = limits[p.section]
    return Array.isArray(allowed) ? allowed.includes(p.subSection) : true
  })

  // Anything unnamed ranks last rather than first, so a sub-section added
  // upstream appears at the end of its section instead of jumping to the top.
  const LAST = Number.MAX_SAFE_INTEGER
  const rankOf = (list, value) => {
    if (!Array.isArray(list)) { return LAST }
    const i = list.indexOf(value)
    return i === -1 ? LAST : i
  }
  // Where a section is restricted, the allow-list doubles as its running order,
  // so the two can never disagree.
  const subList = section => (Array.isArray(limits[section]) ? limits[section] : subOrder[section])

  return kept
    .map((page, i) => ({ page, i }))
    .sort((a, b) => {
      const sa = rankOf(sectionOrder, a.page.section)
      const sb = rankOf(sectionOrder, b.page.section)
      if (sa !== sb) { return sa - sb }
      const ta = rankOf(subList(a.page.section), a.page.subSection)
      const tb = rankOf(subList(b.page.section), b.page.subSection)
      if (ta !== tb) { return ta - tb }
      return a.i - b.i // keep the export's own order within a sub-section
    })
    .map(entry => entry.page)
}

function _devReadQuizzes (firmId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_QUIZZES_FILE, 'utf8'))
    return all[firmId] || null
  } catch { return null }
}

function _devWriteQuizzes (firmId, cfg) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_QUIZZES_FILE, 'utf8'))
  } catch {}
  all[firmId] = cfg
  fs.writeFileSync(DEV_QUIZZES_FILE, JSON.stringify(all, null, 2))
}

async function _loadQuizOverride (firmId) {
  try {
    return await overlay.loadFirmConfig(firmId, QUIZ_KEY)
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadQuizzes(firmId) }
    throw err
  }
}

async function _saveQuizOverride (firmId, cfg, savedBy) {
  try {
    return await overlay.saveFirmConfig(firmId, QUIZ_KEY, cfg, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteQuizzes(firmId, cfg); return null }
    throw err
  }
}

/**
 * GET /api/firm-manager/quizzes — the firm's quiz material.
 *
 * `pages` is every page that can hold quiz material — not just the pages that
 * already have one. The editor lists every such sub-section including the empty
 * ones, so a firm can SEE where it has no quiz material; hiding those would
 * hide the gap. It comes from the resolver's own list, so the pages offered are
 * exactly the pages a save will accept, filtered to the advisory-content areas
 * (see data/quizzable-sections.json).
 *
 * ALSO RETURNS THE RESOLVED BANKS (Phase 3) — the very banks loadBlendedQuizBanks
 * hands the course engine. `merged` is the OLD whole-bank view and is kept only so
 * the current read-only screen keeps working unchanged; anything that edits must
 * draw `resolved`, or the firm would be editing one thing while its advisors were
 * given another. That is not hypothetical: it is the defect Phase 2 closed on this
 * exact feature, and a Save button on top of `merged` would reopen it.
 *
 * `hasOverride` deliberately keeps its old, narrow meaning — "is there a whole-bank
 * override?" — because that is the question the version-history call answers.
 * Whether the firm has made any cascade decision is the separate `hasDecisions`.
 *
 * @returns {{base: Object, firmOverride: Object|null, merged: Object,
 *            resolved: Object, state: Object, hasOverride: boolean,
 *            hasDecisions: boolean, pages: Array<Object>, driftQids: string[]}}
 *   `driftQids` are the firm's edited questions Advisor-e has changed since — the tab
 *   offers Adopt / Keep mine on those (Phase 4).
 */
async function getQuizzes (req, res) {
  try {
    const firmOverride = await _loadQuizOverride(req.firmId)
    const base = _platformQuizBanks()
    const state = await loadFirmQuizState(req.firmId, overlay.loadFirmConfig, base)
    const resolved = await loadBlendedQuizBanks(req.firmId, overlay.loadFirmConfig)
    const driftQids = await _quizDriftQids(req.firmId, state.overrides, req.userEmail)
    res.send(200, {
      base,
      firmOverride,
      merged: mergeQuizBanks(base, firmOverride),
      resolved,
      state,
      driftQids,
      hasOverride: firmOverride !== null,
      hasDecisions: state.declinedIds.length > 0 ||
        Object.keys(state.overrides).length > 0 ||
        state.ownRows.length > 0,
      pages: quizzablePages(listTemplatePages())
    })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * POST /api/firm-manager/quizzes — save the firm's overlay (never the base).
 * Body: { quizzes: { "<page title>": { entries: [{id, question, answer, keyPoint}] } } }
 *
 * SUPERSEDED BY THE CASCADE ROUTES BELOW, and kept only so a firm that saved under
 * the old whole-bank shape does not lose it. Once a firm has made ANY per-question
 * decision, the reader takes the three cascade keys and stops consulting this one —
 * so a save here would answer `saved: true` and change nothing an advisor sees.
 * Nothing in the app posts to it; the Phase 3 screen uses the cascade routes.
 */
async function saveQuizzes (req, res) {
  const { quizzes } = req.body || {}
  const check = validateQuizOverride(quizzes)
  if (!check.ok) {
    const payload = { success: false, error: { code: 'INVALID_QUIZZES', message: check.error }, timestamp: new Date().toISOString() }
    if (check.candidates && check.candidates.length) { payload.error.candidates = check.candidates }
    return res.send(400, payload)
  }
  try {
    const version = await _saveQuizOverride(req.firmId, check.value, req.userEmail)
    res.send(200, { saved: true, version })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Quiz cascade (CB-31 Phase 3, 2026-07-31) ─────────────────────────────────
// One decision per request, about ONE question, keyed to its stable qid. Same
// verbs, shapes and error codes as the staircase cascade above, deliberately, so
// a reader who knows one knows the other.
//
// ONE DELIBERATE DIFFERENCE FROM THE STAIRCASE — the opposite rule, not an
// oversight. The staircase REFUSES to let a firm switch off its last step, because
// an advisor mid-session would be asked to choose from an empty list. Quizzes must
// not refuse: Phase 2 ruled that a bank with every question switched off is dropped
// entirely, so the course falls through to AI-generated questions exactly as it does
// for a page that never had a bank. Blocking it here would deny a firm a decision
// the engine already handles correctly. The cost is carried by the SCREEN, which has
// to say what happens — a firm switching off the last question is choosing
// AI-written questions, not no questions.

/**
 * Where a firm's drift baselines live (Phase 4) — mirroring STAIRCASE_BASELINES_KEY.
 *
 * DELIBERATELY NOT ADDED TO THE READER'S `CONFIG_KEYS`. Those three keys are the
 * firm's DECISIONS, and `loadFirmQuizState` asks "has this firm decided anything?"
 * by looking at them. A baseline is not a decision — it is our record of the wording
 * a decision was made against. Filed alongside the three, a firm that had only ever
 * been stamped would start reading as a firm with its own quiz configuration.
 */
const QUIZ_BASELINES_KEY = 'quiz-override-baselines'

const QUIZ_DEV_FILES = {
  [QUIZ_KEYS.declines]: DEV_QUIZ_DECLINES_FILE,
  [QUIZ_KEYS.overrides]: DEV_QUIZ_OVERRIDES_FILE,
  [QUIZ_KEYS.own]: DEV_QUIZ_OWN_FILE,
  // Listed here so _loadQuizPart/_saveQuizPart carry baselines with no second pair of
  // dev-file helpers. The staircase grew its own because it had no such map to join.
  [QUIZ_BASELINES_KEY]: DEV_QUIZ_BASELINES_FILE
}

/**
 * Every question id Advisor-e ships, across all 62 banks.
 *
 * Membership is what makes a platform route 404 instead of quietly storing a
 * decision against a question that does not exist. That matters more than a tidy
 * error: loadFirmQuizState treats an override keyed to an unknown qid as junk
 * rather than a decision, so a stored one would sit there doing nothing while
 * looking, on any screen that listed it, exactly like a saved edit.
 * @type {Set<string>}
 */
const PLATFORM_QIDS = new Set()

/**
 * The platform question behind each qid.
 *
 * Built in the same pass as PLATFORM_QIDS because Phase 4 needs the question's
 * CONTENT, not just its existence, and the staircase's `steps.find(...)` has no cheap
 * equivalent here — the questions are nested two deep across 62 banks, so a scan per
 * lookup would repeat that walk for every edited question on every load of the tab.
 * @type {Map<string, Object>}
 */
const PLATFORM_QUESTIONS = new Map()

for (const [bankKey, bank] of Object.entries(BASE_QUIZZES.banks || {})) {
  if (bankKey.startsWith('_')) { continue }
  for (const entry of (bank && Array.isArray(bank.entries)) ? bank.entries : []) {
    if (entry && entry.qid) {
      PLATFORM_QIDS.add(entry.qid)
      PLATFORM_QUESTIONS.set(entry.qid, entry)
    }
  }
}

function _devReadQuizPart (file, firmId, fallback) {
  try {
    const all = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Object.prototype.hasOwnProperty.call(all, firmId) ? all[firmId] : fallback
  } catch { return fallback }
}

function _devWriteQuizPart (file, firmId, value) {
  let all = {}
  try { all = JSON.parse(fs.readFileSync(file, 'utf8')) } catch {}
  all[firmId] = value
  fs.writeFileSync(file, JSON.stringify(all, null, 2))
}

async function _loadQuizPart (firmId, key, fallback) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, key)
    return (stored === null || stored === undefined) ? fallback : stored
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadQuizPart(QUIZ_DEV_FILES[key], firmId, fallback) }
    throw err
  }
}

async function _saveQuizPart (firmId, key, value, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, key, value, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteQuizPart(QUIZ_DEV_FILES[key], firmId, value); return }
    throw err
  }
}

/** Advisor-e's banks, minus the `_comment` documentation keys. */
function _platformQuizBanks () {
  const base = {}
  for (const [key, bank] of Object.entries(BASE_QUIZZES.banks || {})) {
    if (!key.startsWith('_')) { base[key] = bank }
  }
  return base
}

/**
 * Carry a firm's OLD whole-bank overlay into the mechanism's three keys, once,
 * before its first per-question decision is stored.
 *
 * THE GAP THIS CLOSES. loadFirmQuizState reads the three new keys first and only
 * falls back to the old `quiz-banks` shape when the firm has made no decision the
 * mechanism recognises. So a firm's FIRST decision would switch the old shape off
 * for good, and everything it had saved there would stop reaching its advisors —
 * silently, with its screen still showing a saved state. Until Phase 3 nothing
 * could write a decision, so the gap was unreachable; these routes are exactly what
 * make it reachable, so it is closed alongside them rather than afterwards.
 *
 * The old key is NOT deleted. It is the firm's own record, it costs nothing to
 * leave, and removing storage to tidy up is how a rollback stops being possible.
 *
 * Idempotent and cheap: `fromLegacy` is true only while the old shape is the ONLY
 * thing the firm has, so this writes at most once per firm and is a no-op on every
 * later call. Empty parts are not written — one non-empty part is enough to make
 * the mechanism take over, and empty rows would litter the version history of keys
 * the firm never used.
 *
 * @param {string} firmId - from the verified JWT, never the request body
 * @param {string} savedBy - the manager's email, for the version-history row
 * @returns {Promise<void>}
 */
async function _carryLegacyQuizDecisionsForward (firmId, savedBy) {
  const state = await loadFirmQuizState(firmId, overlay.loadFirmConfig, _platformQuizBanks())
  if (!state.fromLegacy) { return }
  if (state.declinedIds.length) {
    await _saveQuizPart(firmId, QUIZ_KEYS.declines, state.declinedIds, savedBy)
  }
  if (Object.keys(state.overrides).length) {
    await _saveQuizPart(firmId, QUIZ_KEYS.overrides, state.overrides, savedBy)
  }
  if (state.ownRows.length) {
    await _saveQuizPart(firmId, QUIZ_KEYS.own, state.ownRows, savedBy)
  }
}

// ── Phase 4: Adopt / Keep mine ────────────────────────────────────────────────
//
// A firm that edits one of Advisor-e's questions is deliberately shielded from our
// later improvements to it — that is the whole point of an override. Phase 4 is how
// the firm finds out we changed it anyway: we record the wording its edit was made
// against, notice when ours moves away from that, and offer the choice.
//
// This is a PORT of the staircase's Phase 3, not a new design. Same key shape, same
// backfill rule, same 409. Where the two must differ it is said so out loud, so a
// reader who knows one knows the other — the standing rule on this feature.

/**
 * A stable content signature of a platform question's meaningful fields.
 *
 * Deterministic (fixed field order) and limited to EDITABLE_QUESTION_FIELDS, for the
 * same reason the staircase excludes `step`: `id` is the POSITION the resolver
 * reassigns whenever a question above it is switched off, so signing it would report a
 * firm's question as "updated by Advisor-e" because the firm itself switched off a
 * different question. `qid` is identity and never changes.
 *
 * @param {Object} row - a platform question
 * @returns {string} the signature, or '' for a missing row
 */
function _quizQuestionSignature (row) {
  if (!row || typeof row !== 'object') { return '' }
  const norm = {}
  for (const field of EDITABLE_QUESTION_FIELDS) {
    norm[field] = String(row[field] === null || row[field] === undefined ? '' : row[field]).trim()
  }
  return JSON.stringify(norm)
}

/**
 * Which of this firm's edited questions Advisor-e has changed since the firm last
 * stated its version.
 *
 * A MISSING BASELINE IS BACKFILLED, NOT TREATED AS DRIFT. An edit made before this
 * feature existed carries no stamp, and reading that as "Advisor-e changed this" would
 * greet every such firm with a review prompt for an update that never happened — on
 * every question it had ever edited, at once. The honest reading is "assume in sync
 * now, track from here". Same rule as the staircase.
 *
 * @param {string} firmId - from the verified JWT, never the request body
 * @param {Object} overrides - the firm's edits, keyed by platform question id
 * @param {string} savedBy - audit attribution for a backfill write
 * @returns {Promise<string[]>} platform qids to offer Adopt / Keep mine on
 */
async function _quizDriftQids (firmId, overrides, savedBy) {
  const edited = Object.keys(overrides || {})
  if (edited.length === 0) { return [] }

  const stored = await _loadQuizPart(firmId, QUIZ_BASELINES_KEY, {})
  const baselines = (stored && typeof stored === 'object' && !Array.isArray(stored)) ? { ...stored } : {}
  const driftQids = []
  let backfilled = false

  for (const qid of edited) {
    const platformRow = PLATFORM_QUESTIONS.get(qid)
    // An override keyed to a qid Advisor-e no longer ships is not drift — there is
    // nothing to compare against and nothing to adopt. loadFirmQuizState already
    // treats it as junk rather than a decision; offering a review of it here would
    // be the one place in the app that disagreed.
    if (!platformRow) { continue }
    const sig = _quizQuestionSignature(platformRow)
    if (!Object.prototype.hasOwnProperty.call(baselines, qid)) {
      baselines[qid] = sig
      backfilled = true
    } else if (baselines[qid] !== sig) {
      driftQids.push(qid)
    }
  }

  if (backfilled) { await _saveQuizPart(firmId, QUIZ_BASELINES_KEY, baselines, savedBy) }
  return driftQids
}

/**
 * Accept only the fields a firm may edit on a question, in the types they must be.
 *
 * `qid` and `id` are absent from EDITABLE_QUESTION_FIELDS on purpose: `qid` is
 * identity and `id` is the POSITION the resolver reassigns whenever a question
 * above is switched off. Letting either through the body would let a firm re-point
 * an edit at a different question, or hand the AI a number the grader cannot find.
 *
 * Unlike the staircase, an empty value is refused for EVERY field rather than just
 * the name. All three are read by a person or marked against by the grader — a
 * blank answer is a marking guide with nothing in it, which fails at the moment an
 * advisor is waiting on a grade rather than at the moment it is saved.
 *
 * @param {Object} body - the raw request body (untrusted)
 * @returns {{ok: boolean, value?: Object, code?: string, message?: string}}
 */
function _sanitiseQuizFields (body) {
  const src = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {}
  const value = {}
  for (const field of EDITABLE_QUESTION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(src, field)) { continue }
    if (typeof src[field] !== 'string') {
      return { ok: false, code: 'INVALID_FIELD', message: `${field} must be a string` }
    }
    const trimmed = src[field].trim()
    if (!trimmed) {
      return { ok: false, code: 'INVALID_FIELD', message: `${field} must not be empty` }
    }
    if (trimmed.length > QUIZ_LIMITS.textChars) {
      return { ok: false, code: 'FIELD_TOO_LONG', message: `${field} must be ${QUIZ_LIMITS.textChars} characters or fewer` }
    }
    value[field] = trimmed
  }
  if (Object.keys(value).length === 0) {
    return { ok: false, code: 'NO_FIELDS', message: `Provide at least one of: ${EDITABLE_QUESTION_FIELDS.join(', ')}` }
  }
  return { ok: true, value }
}

/**
 * @route PUT /api/firm-manager/quizzes/platform/:qid
 * Edit one of Advisor-e's questions for this firm. Fields the body does not carry
 * are NOT recorded, so they keep tracking Advisor-e's wording rather than being
 * frozen at today's text — the whole point of the mechanism, and the exact defect
 * the old whole-bank overlay caused.
 *
 * Stamps Advisor-e's CURRENT wording as the drift baseline (Phase 4): the firm has
 * just stated its version against THIS text, so a later change by us to it is what the
 * firm should be offered. Before Phase 4 this deliberately stamped nothing, because
 * baselines written ahead of the screen that reads them would be state nothing could
 * act on.
 *
 * @param {string} qid - a platform question id (qz-*)
 * @returns {{updated: true, qid: string}}
 */
async function setQuizOverride (req, res) {
  const qid = String(req.params.qid || '')
  if (!PLATFORM_QIDS.has(qid)) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform quiz question with that id')
  }
  const sani = _sanitiseQuizFields(req.body || {})
  if (!sani.ok) { return sendError(res, 400, sani.code, sani.message) }
  try {
    await _carryLegacyQuizDecisionsForward(req.firmId, req.userEmail)
    const stored = await _loadQuizPart(req.firmId, QUIZ_KEYS.overrides, {})
    const current = (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {}
    const next = { ...current, [qid]: { ...(current[qid] || {}), ...sani.value } }
    await _saveQuizPart(req.firmId, QUIZ_KEYS.overrides, next, req.userEmail)
    const storedB = await _loadQuizPart(req.firmId, QUIZ_BASELINES_KEY, {})
    const baselines = (storedB && typeof storedB === 'object' && !Array.isArray(storedB)) ? storedB : {}
    await _saveQuizPart(
      req.firmId,
      QUIZ_BASELINES_KEY,
      { ...baselines, [qid]: _quizQuestionSignature(PLATFORM_QUESTIONS.get(qid)) },
      req.userEmail
    )
    res.send(200, { updated: true, qid })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route DELETE /api/firm-manager/quizzes/platform/:qid
 * Reset to Advisor-e's — drop this firm's version so Advisor-e's question applies
 * again, and keeps applying as Advisor-e improves it. Idempotent: resetting a
 * question the firm never edited is a no-op, not an error.
 *
 * THIS IS ALSO THE ADOPT HALF of Phase 4's choice — adopting our update means taking
 * our question, which is exactly a reset. The drift baseline is dropped with the edit:
 * a stale baseline is inert, but dropping it keeps the store honest and makes a later
 * re-edit stamp fresh rather than inherit a signature from a decision the firm has
 * since undone. Same reasoning as the staircase's reset.
 *
 * @param {string} qid - a platform question id (qz-*)
 * @returns {{reset: true, qid: string}}
 */
async function resetQuizOverride (req, res) {
  const qid = String(req.params.qid || '')
  if (!PLATFORM_QIDS.has(qid)) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform quiz question with that id')
  }
  try {
    await _carryLegacyQuizDecisionsForward(req.firmId, req.userEmail)
    const stored = await _loadQuizPart(req.firmId, QUIZ_KEYS.overrides, {})
    const current = (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {}
    if (Object.prototype.hasOwnProperty.call(current, qid)) {
      const next = { ...current }
      delete next[qid]
      await _saveQuizPart(req.firmId, QUIZ_KEYS.overrides, next, req.userEmail)
    }
    const storedB = await _loadQuizPart(req.firmId, QUIZ_BASELINES_KEY, {})
    const baselines = (storedB && typeof storedB === 'object' && !Array.isArray(storedB)) ? storedB : {}
    if (Object.prototype.hasOwnProperty.call(baselines, qid)) {
      const nextB = { ...baselines }
      delete nextB[qid]
      await _saveQuizPart(req.firmId, QUIZ_BASELINES_KEY, nextB, req.userEmail)
    }
    res.send(200, { reset: true, qid })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route POST /api/firm-manager/quizzes/platform/:qid/keep-mine
 * Phase 4 "Keep mine" — the firm has seen Advisor-e's update to a question it edited
 * and is keeping its own version. Re-stamps the drift baseline to Advisor-e's CURRENT
 * wording, so the review prompt clears until our NEXT change. The firm's edit is left
 * untouched; the Adopt half of the choice is the existing reset route, which drops the
 * edit and takes Advisor-e's question.
 *
 * 409 rather than a silent success when the firm holds no edit: nothing is being kept,
 * and stamping a baseline for a question the firm does not override would arm a prompt
 * that can never fire — it would sit in storage waiting for a change to a question this
 * firm reads from us anyway.
 *
 * @param {string} qid - a platform question id (qz-*)
 * @returns {{keptMine: true, qid: string}}
 */
async function keepMineQuizQuestion (req, res) {
  const qid = String(req.params.qid || '')
  const platformRow = PLATFORM_QUESTIONS.get(qid)
  if (!platformRow) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform quiz question with that id')
  }
  try {
    await _carryLegacyQuizDecisionsForward(req.firmId, req.userEmail)
    const stored = await _loadQuizPart(req.firmId, QUIZ_KEYS.overrides, {})
    const current = (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {}
    if (!Object.prototype.hasOwnProperty.call(current, qid)) {
      return sendError(res, 409, 'NOT_OVERRIDDEN', 'Your firm has no custom version of that question')
    }
    const storedB = await _loadQuizPart(req.firmId, QUIZ_BASELINES_KEY, {})
    const baselines = (storedB && typeof storedB === 'object' && !Array.isArray(storedB)) ? storedB : {}
    await _saveQuizPart(
      req.firmId,
      QUIZ_BASELINES_KEY,
      { ...baselines, [qid]: _quizQuestionSignature(platformRow) },
      req.userEmail
    )
    res.send(200, { keptMine: true, qid })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route PUT /api/firm-manager/quizzes/platform/:qid/decline
 * Switch one of Advisor-e's questions off for this firm, or back on. Only the declines
 * key is written — the firm's override survives — so a firm that switches a question
 * back on gets ITS OWN wording back, not Advisor-e's. Proven by "an edit made earlier
 * survives switching the question off and on again" in quizCascade.routes.test.js.
 * Dropping an edit is the reset route; the two are separate on purpose.
 *
 * There is deliberately NO last-question refusal here; see the section header.
 *
 * @param {string} qid - a platform question id (qz-*)
 * @param {boolean} req.body.declined
 * @returns {{declined: boolean, qid: string}}
 */
async function setQuizDecline (req, res) {
  const qid = String(req.params.qid || '')
  if (!PLATFORM_QIDS.has(qid)) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform quiz question with that id')
  }
  const declined = (req.body || {}).declined
  if (typeof declined !== 'boolean') {
    return sendError(res, 400, 'INVALID_DECLINED', 'declined must be a boolean')
  }
  try {
    await _carryLegacyQuizDecisionsForward(req.firmId, req.userEmail)
    const stored = await _loadQuizPart(req.firmId, QUIZ_KEYS.declines, [])
    const set = new Set(Array.isArray(stored) ? stored : [])
    if (declined) { set.add(qid) } else { set.delete(qid) }
    await _saveQuizPart(req.firmId, QUIZ_KEYS.declines, [...set], req.userEmail)
    res.send(200, { declined, qid })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route POST /api/firm-manager/quizzes/own
 * Add a question of the firm's own to a page. Its id is assigned here (fq-N) and
 * never taken from the body — an id from the browser could collide with one of
 * Advisor-e's questions and silently replace it.
 *
 * All three fields are required, unlike an edit: a question saved without its
 * answer or key point would reach an advisor as an unmarkable question.
 *
 * The page is resolved through resolveTemplateName, which refuses a near-miss
 * rather than guessing, so a typo can never silently attach a question to the wrong
 * page. The screen picks the page from the rail, so a near-miss should not arise —
 * this is the backstop for anything else calling the route.
 *
 * @param {string} req.body.bank - the page title the question belongs to
 * @returns {{added: true, id: string, bank: string}}
 */
async function addOwnQuizQuestion (req, res) {
  const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {}
  const sani = _sanitiseQuizFields(body)
  if (!sani.ok) { return sendError(res, 400, sani.code, sani.message) }
  const missing = EDITABLE_QUESTION_FIELDS.filter(f => !sani.value[f])
  if (missing.length) {
    return sendError(res, 400, 'INCOMPLETE_QUESTION', `A question you add needs all of: ${EDITABLE_QUESTION_FIELDS.join(', ')}`)
  }
  if (typeof body.bank !== 'string' || !body.bank.trim()) {
    return sendError(res, 400, 'INVALID_BANK', 'A question needs the page it belongs to')
  }
  if (body.bank.length > QUIZ_LIMITS.keyChars) {
    return sendError(res, 400, 'INVALID_BANK', 'That page name is too long')
  }
  let resolved
  try {
    resolved = resolveTemplateName(body.bank)
  } catch (err) {
    return sendError(res, 503, 'LIBRARY_UNAVAILABLE', 'The page library could not be read, so questions cannot be saved right now')
  }
  if (!resolved.ok) {
    return sendError(res, 404, 'NO_SUCH_PAGE', `"${body.bank}" does not match a page in your library`)
  }
  try {
    await _carryLegacyQuizDecisionsForward(req.firmId, req.userEmail)
    const stored = await _loadQuizPart(req.firmId, QUIZ_KEYS.own, [])
    const rows = Array.isArray(stored) ? stored : []
    if (rows.filter(r => r && r.bank === resolved.title).length >= QUIZ_LIMITS.entriesPerBank) {
      return sendError(res, 409, 'BANK_FULL', `A quiz can hold at most ${QUIZ_LIMITS.entriesPerBank} questions`)
    }
    // Highest existing number + 1, never the row count: reusing a deleted question's
    // id would hand a new question the decisions recorded against the old one.
    // Prefixed by SCOPE (`mq-` for the mentor, `fq-` for a firm) — since Phase 5 a
    // firm resolves the mentor's questions into its own list, and one shared prefix
    // would put two different questions under one id.
    const prefix = ownQuestionPrefix(req.firmId)
    const used = rows
      .map(r => parseInt(String((r && r.id) || '').replace(prefix, ''), 10))
      .filter(n => Number.isInteger(n))
    const id = `${prefix}${(used.length ? Math.max(...used) : 0) + 1}`
    // Key on the RESOLVED title, not what was typed, so the stored bank is always a
    // real page name however the caller spelled it.
    const next = [...rows, {
      id,
      bank: resolved.title,
      question: sani.value.question,
      answer: sani.value.answer,
      keyPoint: sani.value.keyPoint
    }]
    await _saveQuizPart(req.firmId, QUIZ_KEYS.own, next, req.userEmail)
    res.send(201, { added: true, id, bank: resolved.title })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route PUT /api/firm-manager/quizzes/own/:id
 * Edit a question this firm added. The page it belongs to is not editable here: a
 * question that moved page would take its id with it, and any later decision made
 * against that id would follow it to a page nobody expected. Remove and re-add.
 * @param {string} id - a firm question id (fq-*)
 * @returns {{updated: true, id: string}}
 */
async function updateOwnQuizQuestion (req, res) {
  const id = String(req.params.id || '')
  const sani = _sanitiseQuizFields(req.body || {})
  if (!sani.ok) { return sendError(res, 400, sani.code, sani.message) }
  try {
    await _carryLegacyQuizDecisionsForward(req.firmId, req.userEmail)
    const stored = await _loadQuizPart(req.firmId, QUIZ_KEYS.own, [])
    const rows = Array.isArray(stored) ? stored : []
    const index = rows.findIndex(r => r && r.id === id)
    if (index === -1) {
      return sendError(res, 404, 'NOT_FOUND', 'No question of your own with that id')
    }
    const next = rows.map((r, i) => (i === index ? { ...r, ...sani.value, id, bank: r.bank } : r))
    await _saveQuizPart(req.firmId, QUIZ_KEYS.own, next, req.userEmail)
    res.send(200, { updated: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route DELETE /api/firm-manager/quizzes/own/:id
 * Remove a question this firm added. Only the firm's own questions can be removed —
 * one of Advisor-e's is switched off, never deleted, so it can always come back.
 * @param {string} id - a firm question id (fq-*)
 * @returns {{removed: true, id: string}}
 */
async function deleteOwnQuizQuestion (req, res) {
  const id = String(req.params.id || '')
  try {
    // Carried before the removal, not after: a firm whose only questions live in the
    // old shape must have them promoted to real rows before one of them is deleted,
    // or the delete would 404 on a question that is plainly on screen.
    await _carryLegacyQuizDecisionsForward(req.firmId, req.userEmail)
    const stored = await _loadQuizPart(req.firmId, QUIZ_KEYS.own, [])
    const rows = Array.isArray(stored) ? stored : []
    if (!rows.some(r => r && r.id === id)) {
      return sendError(res, 404, 'NOT_FOUND', 'No question of your own with that id')
    }
    await _saveQuizPart(req.firmId, QUIZ_KEYS.own, rows.filter(r => !(r && r.id === id)), req.userEmail)
    res.send(200, { removed: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Domain Support ──────────────────────────────────────────────────────────
// Built on the SINGLE `domain-support` overlay bundle the advisor and course
// engines actually read (firmContent.loadFirmDomainSupport → CONFIG_KEYS
// .domainSupport), keyed by domain id — the same arrangement as Logic Tables
// below.
//
// It was per-key ('domain-support-<id>') until 2026-07-30. Saves landed under a
// key no reader ever selects, and the shared dev-file fallback hid it entirely:
// with no MySQL both sides fall back to data/dev-firm-domain-support.json in the
// same { firmId: { domainId: override } } shape, so a saved edit DID reach the
// AI in development. On MySQL the two keys would never reconcile — Firm Manager
// would report "saved" and the firm's content would silently never reach the
// AI. Reconciled while nothing was stored yet; see ACTIONS.md.

const { loadFirmLogicTrees, CONFIG_KEYS: CONTENT_CONFIG_KEYS } = require('../utils/firmContent')

const DEV_DOMAIN_SUPPORT_FILE = path.resolve(__dirname, '../../data/dev-firm-domain-support.json')

// The seller-facing support files, which have no row in domains.json.
const DOMAIN_SUPPORT_GET_FILES = ['get-marketing', 'get-positioning', 'get-pricing-proposals', 'get-sales', 'get-sales-tracker', 'get-seminar', 'get-team-problem']

/**
 * Is this a real domain-support id? The override bundle is a plain object keyed
 * by domain id, and `domainId` arrives from the URL, so an id is checked against
 * the known set before it is ever used as a key — an unchecked `__proto__` or
 * `constructor` would be an assignment to the object's prototype rather than a
 * stored override. (Under the old per-key storage the id was only ever part of a
 * config_key string, so this could not arise.) Refusing unknown ids also stops a
 * firm accumulating overrides for domains that do not exist.
 * @param {string} id - the domain or seller-file id from the request
 * @returns {boolean}
 */
function _isKnownDomainSupportId (id) {
  if (typeof id !== 'string' || !id) { return false }
  if (DOMAIN_SUPPORT_GET_FILES.includes(id)) { return true }
  const domains = require('../../data/domains.json') || []
  return domains.some(d => d && d.id === id)
}

/**
 * Load the firm's raw domain-support override map ({ domainId: sparse override })
 * for reading and writing — the same store and dev file the engines read, but
 * returned raw so one key can be mutated. Missing / malformed → {} (a firm with
 * no edits yet).
 * @param {string} firmId - authenticated firm id (never client-supplied)
 * @returns {Promise<Object>}
 */
async function _loadFirmDomainSupportMapRaw (firmId) {
  try {
    const v = await overlay.loadFirmConfig(firmId, CONTENT_CONFIG_KEYS.domainSupport)
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
  } catch (err) {
    if (devFallbackOk(err)) {
      try {
        const all = JSON.parse(fs.readFileSync(DEV_DOMAIN_SUPPORT_FILE, 'utf8'))
        return (all[firmId] && typeof all[firmId] === 'object' && !Array.isArray(all[firmId])) ? all[firmId] : {}
      } catch { return {} }
    }
    throw err
  }
}

/**
 * Persist the firm's whole domain-support override map. Prod goes through the
 * overlay store (version history + restore for free); dev writes the gitignored
 * JSON the engines fall back to.
 * @param {string} firmId
 * @param {Object} map - { domainId: sparse override }
 * @param {string} savedBy - userEmail
 * @returns {Promise<number|null>} the new version, or null in dev
 */
async function _saveFirmDomainSupportMap (firmId, map, savedBy) {
  try {
    return await overlay.saveFirmConfig(firmId, CONTENT_CONFIG_KEYS.domainSupport, map, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) {
      let all = {}
      try { all = JSON.parse(fs.readFileSync(DEV_DOMAIN_SUPPORT_FILE, 'utf8')) } catch {}
      all[firmId] = map
      fs.writeFileSync(DEV_DOMAIN_SUPPORT_FILE, JSON.stringify(all, null, 2))
      return null
    }
    throw err
  }
}

/**
 * The saved versions of the firm's domain-support bundle. NOTE: every domain
 * shares ONE stored bundle, so this history is bundle-level (all domains' saves
 * interleaved), not per-domain — the same caveat as Logic Tables. Restore is
 * still per-domain; see _restoreDomainSupportVersion.
 * @param {string} firmId
 * @returns {Promise<Array<Object>>}
 */
async function _getDomainSupportHistory (firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT version, saved_by, created_at
       FROM firm_framework_versions
       WHERE firm_id = ? AND config_key = ?
       ORDER BY version DESC`,
      [firmId, CONTENT_CONFIG_KEYS.domainSupport]
    )
    return rows
  } catch (err) {
    if (devFallbackOk(err)) { return [] }
    throw err
  }
}

/**
 * Restore ONE domain to how it stood at a saved version, leaving every other
 * domain as it is today. The bundle is shared, so restoring it wholesale would
 * roll all 29 domains back — instead this reads that version's bundle, lifts out
 * just this domain's entry, and writes it into the CURRENT map. A domain absent
 * from that version had no override at the time, so restoring it clears today's
 * override rather than inventing one.
 * @param {string} firmId
 * @param {string} domainId
 * @param {number} version
 * @param {string} restoredBy - userEmail
 * @returns {Promise<boolean>}
 */
async function _restoreDomainSupportVersion (firmId, domainId, version, restoredBy) {
  try {
    const [rows] = await db.execute(
      `SELECT config_json FROM firm_framework_versions
       WHERE firm_id = ? AND config_key = ? AND version = ?`,
      [firmId, CONTENT_CONFIG_KEYS.domainSupport, version]
    )
    if (rows.length === 0) { throw new Error('Version not found') }
    const bundle = JSON.parse(rows[0].config_json)
    const past = (bundle && typeof bundle === 'object' && !Array.isArray(bundle))
      ? Object.prototype.hasOwnProperty.call(bundle, domainId) ? bundle[domainId] : undefined
      : undefined
    const map = await _loadFirmDomainSupportMapRaw(firmId)
    if (past === undefined) { delete map[domainId] } else { map[domainId] = past }
    await _saveFirmDomainSupportMap(firmId, map, restoredBy)
    return true
  } catch (err) {
    if (devFallbackOk(err)) { return false }
    throw err
  }
}

/**
 * How many editable items a domain's support holds, for the rail count. The
 * four-column `materials` shape (§0.5) is counted first; a domain still on the
 * legacy `support_tools` shape falls back to that. Without this, a migrated
 * domain (e.g. EOY) reported 0 because only support_tools was counted.
 * @param {Object|null} support - the merged domain-support entry
 * @returns {number}
 */
function _countSupportItems (support) {
  // Count the EDITABLE four-column materials only. A domain still on the legacy
  // support_tools shape has no four-column content to edit here, so it honestly
  // reports 0 — matching the "not authored yet" state the panel shows when the
  // domain is opened (a non-zero rail count that the panel then contradicts was
  // the legibility bug the owner hit 2026-07-27).
  return (support && Array.isArray(support.materials)) ? support.materials.length : 0
}

/**
 * GET /api/firm-manager/domain-support — list all domain support + firm overrides
 */
/**
 * Which master section a domain-support item belongs to, for the three-way rail
 * (FIRM-EDITABLE-TABLES-PLAN.md — matches the master export's do-the-job /
 * get-the-job / get-organised sections). The `get-*` seller files are
 * get-the-job; the firm-management domains (org-*, fm-coach-culture,
 * people-power) are get-organised; everything else is client-delivery advisory
 * = do-the-job. Kept here, not in the data, because domains.json carries no
 * section field. A future firm re-file (drag) will override this default.
 * @param {string} id - domain or seller id
 * @returns {'doTheJob'|'getTheJob'|'getOrganised'}
 */
function _domainSupportSection (id) {
  const s = String(id || '')
  if (s.startsWith('get-')) { return 'getTheJob' }
  if (s.startsWith('org-') || s === 'fm-coach-culture' || s === 'people-power') { return 'getOrganised' }
  return 'doTheJob'
}

async function getDomainSupport (req, res) {
  try {
    const domains = require('../../data/domains.json') || []

    const result = { doTheJob: [], getTheJob: [], getOrganised: [] }
    const firmSections = await _loadSectionMap(req.firmId, DOMAIN_SUPPORT_SECTIONS_KEY, DEV_DOMAIN_SUPPORT_SECTIONS_FILE)
    // ONE store read for the whole screen. Every domain's override lives in the
    // same bundle, so loading per domain inside the loop meant ~36 round-trips
    // to render one page.
    const overrides = await _loadFirmDomainSupportMapRaw(req.firmId)

    const addRow = (id, label) => {
      const override = overrides[id] || null
      const support = require('../utils/domainSupport').resolveDomainSupport(id, override ? { [id]: override } : null)
      const moved = firmSections[id]
      const section = VALID_SECTIONS.includes(moved) ? moved : _domainSupportSection(id)
      result[section].push({
        id,
        label,
        hasOverride: override !== null,
        supportTools: _countSupportItems(support),
        origin: override ? 'firm' : 'platform'
      })
    }

    for (const domain of domains) { addRow(domain.id, domain.label) }
    for (const fileId of DOMAIN_SUPPORT_GET_FILES) { addRow(fileId, fileId.replace('get-', '').replace(/-/g, ' ')) }

    res.send(200, result)
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * GET /api/firm-manager/domain-support/:domainId — get domain support detail with firm override
 */
async function getDomainSupportDetail (req, res) {
  const { domainId } = req.params
  try {
    const domainSupport = require('../utils/domainSupport')
    const overrides = await _loadFirmDomainSupportMapRaw(req.firmId)
    const override = overrides[domainId] || null
    const merged = domainSupport.resolveDomainSupport(domainId, override ? { [domainId]: override } : null)
    res.send(200, merged || {})
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * POST /api/firm-manager/domain-support/:domainId — save one domain's override
 * into the SINGLE `domain-support` bundle the advisor and course engines read,
 * so a save reaches the AI (fenced — see domainSupport.js's three formatters).
 * The whole map is written back because one bundle holds every domain.
 */
async function saveDomainSupport (req, res) {
  const { domainId } = req.params
  const override = req.body || {}

  if (!_isKnownDomainSupportId(domainId)) {
    return res.send(404, { success: false, error: { code: 'NOT_FOUND', message: 'Domain support not found' } })
  }

  try {
    const map = await _loadFirmDomainSupportMapRaw(req.firmId)
    map[domainId] = override
    const version = await _saveFirmDomainSupportMap(req.firmId, map, req.userEmail)
    res.send(200, { saved: true, version, domainId })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * DELETE /api/firm-manager/domain-support/:domainId — reset one domain to the
 * platform default by dropping its key from the firm's override bundle. Every
 * other domain's edits are left untouched.
 */
async function resetDomainSupport (req, res) {
  const { domainId } = req.params

  try {
    const map = await _loadFirmDomainSupportMapRaw(req.firmId)
    if (Object.prototype.hasOwnProperty.call(map, domainId)) {
      delete map[domainId]
      await _saveFirmDomainSupportMap(req.firmId, map, req.userEmail)
    }
    res.send(200, { reset: true, domainId })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * GET /api/firm-manager/domain-support/:domainId/history — the saved versions of
 * the firm's domain-support bundle. Bundle-level, not per-domain (see
 * _getDomainSupportHistory); `domainId` is echoed back for the caller's benefit.
 */
async function getDomainSupportHistory (req, res) {
  const { domainId } = req.params
  try {
    const history = await _getDomainSupportHistory(req.firmId)
    res.send(200, { history, domainId })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * POST /api/firm-manager/domain-support/:domainId/restore — restore this one
 * domain to a saved version, leaving the others as they are.
 */
async function restoreDomainSupport (req, res) {
  const { domainId } = req.params
  const { version } = req.body || {}

  if (typeof version !== 'number') {
    return res.send(400, { success: false, error: { code: 'INVALID_VERSION', message: 'version must be a number' } })
  }

  if (!_isKnownDomainSupportId(domainId)) {
    return res.send(404, { success: false, error: { code: 'NOT_FOUND', message: 'Domain support not found' } })
  }

  try {
    await _restoreDomainSupportVersion(req.firmId, domainId, version, req.userEmail)
    res.send(200, { restored: true, domainId, version })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Logic Tables ─────────────────────────────────────────────────────────────
// The firm-editable IF→THEN branch tables (FIRM-EDITABLE-TABLES-PLAN.md Phase 3,
// §0.6). Deliberately built on the SINGLE `logic-trees` overlay bundle the
// advisor engine actually reads (firmContent.loadFirmLogicTrees, keyed by tree
// id) — so a firm's save reaches the AI in production, not only the dev-file
// fallback. Domain support was reconciled onto the same arrangement on
// 2026-07-30 (see the P1 note above its own block); both pages now store the way
// the engines read. Slice A is READ-ONLY (list + detail); save/reset/history
// land in Slice B alongside the prompt-fencing safeguard.
//
// `loadFirmLogicTrees` / `CONTENT_CONFIG_KEYS` are required at the top of the
// Domain Support block above — both features read the same module.

// The firm's whole logic-tree override bundle is stored under ONE config key
// ('logic-trees') as a map { treeId: override } — not per-key like domain
// support. Saving one table therefore loads the whole map, sets one key, and
// writes the whole map back. Dev falls back to the same gitignored JSON the
// reader uses (firmContent.DEV_FILES.logicTrees), keyed by firmId.
const DEV_LOGIC_TREES_FILE = path.resolve(__dirname, '../../data/dev-firm-logic-trees.json')

// ── Section placement (display-only, firm-scoped) ────────────────────────────
// A firm can re-file a domain-support item or logic table into a different
// master section (Do the Job / Get the Job / Get Organised) for THEIR firm.
// Stored as a sparse { itemId: section } map, SEPARATE from content edits, and
// read ONLY by the two list routes below — never by the advisor/course engines
// (owner ruling 2026-07-27: re-filing changes the Firm Manager shelf, not the
// AI's behaviour). Dragging an item back to its platform-default section clears
// its override, so the map stays sparse.
const VALID_SECTIONS = ['doTheJob', 'getTheJob', 'getOrganised']
const LOGIC_TREE_SECTIONS_KEY = 'logic-tree-sections'
const DOMAIN_SUPPORT_SECTIONS_KEY = 'domain-support-sections'
const DEV_LOGIC_TREE_SECTIONS_FILE = path.resolve(__dirname, '../../data/dev-firm-logic-tree-sections.json')
const DEV_DOMAIN_SUPPORT_SECTIONS_FILE = path.resolve(__dirname, '../../data/dev-firm-domain-support-sections.json')

/**
 * The firm's { itemId: section } placement overrides for one page, or {}.
 * @param {string} firmId @param {string} configKey @param {string} devFile
 * @returns {Promise<Object>}
 */
async function _loadSectionMap (firmId, configKey, devFile) {
  try {
    const v = await overlay.loadFirmConfig(firmId, configKey)
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
  } catch (err) {
    if (devFallbackOk(err)) {
      try {
        const all = JSON.parse(fs.readFileSync(devFile, 'utf8'))
        return (all[firmId] && typeof all[firmId] === 'object' && !Array.isArray(all[firmId])) ? all[firmId] : {}
      } catch { return {} }
    }
    throw err
  }
}

/**
 * Persist a firm's section-placement map (prod overlay store, dev-JSON fallback).
 * @param {string} firmId @param {string} configKey @param {string} devFile
 * @param {Object} map @param {string} savedBy
 * @returns {Promise<number|null>}
 */
async function _saveSectionMap (firmId, configKey, devFile, map, savedBy) {
  try {
    return await overlay.saveFirmConfig(firmId, configKey, map, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) {
      let all = {}
      try { all = JSON.parse(fs.readFileSync(devFile, 'utf8')) } catch {}
      all[firmId] = map
      fs.writeFileSync(devFile, JSON.stringify(all, null, 2))
      return null
    }
    throw err
  }
}

/**
 * The firm's logic-tree override map ({ treeId: sparse override }) or null —
 * the exact bundle the advisor engine loads, so Firm Manager shows what the AI
 * sees. Threads overlay.loadFirmConfig, with the dev-file fallback inside
 * firmContent (mirrors how the engines load it).
 * @param {string} firmId
 * @returns {Promise<Object|null>}
 */
function _loadFirmLogicTreeMap (firmId) {
  return loadFirmLogicTrees(firmId, overlay.loadFirmConfig)
}

/**
 * Which master section a logic table belongs to, for the three-way rail (matches
 * the master export's do-the-job / get-the-job / get-organised sections). The
 * tree's own `section` tag wins where present; otherwise the id prefix decides —
 * `org_`/`fm_` = get-organised (firm-management), `get_` = get-the-job
 * (advisor-facing selling material, memory feedback_get_vs_client_logic), and
 * everything else is client-delivery logic = do-the-job. `section` is only
 * partly populated in the data, so the prefix is the reliable fallback. A future
 * firm re-file (drag) will override this default.
 * @param {Object} tree
 * @returns {'doTheJob'|'getTheJob'|'getOrganised'}
 */
function _treeSection (tree) {
  const id = String(tree.id || '')
  if (tree.section === 'get-organised' || id.startsWith('org_') || id.startsWith('fm_')) { return 'getOrganised' }
  if (tree.section === 'get-the-job' || id.startsWith('get_')) { return 'getTheJob' }
  return 'doTheJob'
}

/**
 * Which of a node's fields the THEN column is showing.
 *
 * THE READ AND THE WRITE MUST NEVER DISAGREE, which is why this is one function
 * and not two matching conditions. A node keeps its instruction in one of three
 * places and the display column is single: `action` on most, `question` on a
 * pure-question node, and `recommendation` on 55 branches across 8 tables (Get
 * Seminar, Firm Board Pack, Leadership & Partner Development, CA Firm Strategy,
 * Financial Systems Review, Raising Capital, Stock Purchasing, FM Coaching &
 * Culture). Every one of those 55 has neither `action` nor `question`, so before
 * this the editor rendered an EMPTY THEN box and the only copy of the
 * instruction was unreachable in the app — the reason a mentor could not correct
 * "Use Get Seminar template" himself (Mike, 2026-08-12).
 *
 * 🔴 WHY THE WRITE-BACK TARGET MATTERS, beyond tidiness. `recommendation` is
 * gated at the sentence by the tool-name check (`fdb15ca`): a sentence naming a
 * tool the catalogue cannot serve is withheld from the prompt. `action` is not
 * gated. Saving a reworded `recommendation` into `action` would therefore carry
 * it PAST that gate — a silent safety regression with no error and no failing
 * test. So an edit goes home to the field it came from, always.
 *
 * @param {Object} node - a tree node or flat branch.
 * @returns {'action'|'question'|'recommendation'} the field the column reflects.
 */
function _thenFieldOf (node) {
  const n = node || {}
  if (typeof n.action === 'string' && n.action !== '') { return 'action' }
  if (typeof n.question === 'string' && n.question !== '') { return 'question' }
  if (typeof n.recommendation === 'string' && n.recommendation !== '') { return 'recommendation' }
  // Nothing to show. A node that HAS the key keeps it as the write target, so an
  // emptied field is refilled where it was; otherwise `action` is the default.
  if (n.question !== undefined && n.action === undefined) { return 'question' }
  if (n.recommendation !== undefined && n.action === undefined) { return 'recommendation' }
  return 'action'
}

/**
 * Normalise a tree's branches to the four display columns, whichever shape the
 * tree uses: a branching `nodes` graph or a `flat_if_then` `branches` list. Each
 * node's `id` rides along so a later save can merge edits back by id and
 * preserve the node's hidden flow wiring (Slice B).
 * @param {Object} tree
 * @returns {Array<{id:string,branch_name:string,condition:string,action:string,notes:string}>}
 */
function _treeBranchRows (tree) {
  const src = Array.isArray(tree.nodes)
    ? tree.nodes
    : (Array.isArray(tree.branches) ? tree.branches : [])
  return src.map((n, i) => ({
    id: n.id || `row-${i}`,
    branch_name: n.branch_name || '',
    condition: n.condition || '',
    // The THEN column shows whichever field holds this node's instruction, and
    // _thenFieldOf is the single answer the save path uses too.
    action: n[_thenFieldOf(n)] || '',
    notes: n.notes || ''
  }))
}

/**
 * GET /api/firm-manager/logic-trees — list every logic table, grouped
 * advisory / get-the-job, with branch counts and Platform/Your-firm origin.
 */
async function getLogicTrees (req, res) {
  try {
    const logicTrees = require('../utils/logicTrees')
    const base = logicTrees.loadLogicTrees()
    const firmMap = await _loadFirmLogicTreeMap(req.firmId)
    const firmSections = await _loadSectionMap(req.firmId, LOGIC_TREE_SECTIONS_KEY, DEV_LOGIC_TREE_SECTIONS_FILE)
    const result = { doTheJob: [], getTheJob: [], getOrganised: [] }
    for (const tree of base) {
      // The firm's re-file wins over the platform default; an unknown stored
      // value falls back so a bad override can never lose a row.
      const moved = firmSections[tree.id]
      const section = VALID_SECTIONS.includes(moved) ? moved : _treeSection(tree)
      result[section].push({
        id: tree.id,
        label: tree.name || tree.id,
        count: _treeBranchRows(tree).length,
        origin: (firmMap && firmMap[tree.id]) ? 'firm' : 'platform'
      })
    }
    res.send(200, result)
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * GET /api/firm-manager/logic-trees/:treeId — one logic table's branches as the
 * four display columns, with the firm's override merged in for display.
 *
 * `reorderable` tells the editor whether the firm may move rows up and down.
 *
 * A `flat_if_then` tree is always reorderable — its branches are self-contained
 * rules with no entry semantics. A `nodes`-shaped tree is reorderable only once
 * it records its entry point in `entry_node`, because the walk used to start at
 * whatever sat first (`tree.nodes[0].id`) and moving rows would have repointed
 * where the engine begins reasoning — a FLOW change, which firm editing
 * excludes (Mike's scope ruling 2026-07-24: reword + add/remove, flow intact).
 * With the entry recorded, order is presentation alone.
 *
 * The check is deliberately per-tree rather than a blanket `true`: a tree added
 * later without `entry_node`, or carrying a dangling one, falls back to the
 * positional start, so it must not be offered for reordering.
 */
async function getLogicTreeDetail (req, res) {
  const { treeId } = req.params
  try {
    const logicTrees = require('../utils/logicTrees')
    const firmMap = await _loadFirmLogicTreeMap(req.firmId)
    const merged = logicTrees.effectiveTrees(firmMap).find(t => t.id === treeId)
    if (!merged) {
      return res.send(404, { success: false, error: { code: 'NOT_FOUND', message: 'Logic table not found' } })
    }
    res.send(200, {
      id: merged.id,
      label: merged.name || merged.id,
      origin: (firmMap && firmMap[treeId]) ? 'firm' : 'platform',
      reorderable: !Array.isArray(merged.nodes) ||
        !!(merged.entry_node && merged.nodes.some(n => n.id === merged.entry_node)),
      // The words that decide whether this table opens at all. Added 2026-08-02:
      // Logic-Lab asked a firm to add or remove trigger phrases while showing
      // them none of the ones already there, so every edit was made blind.
      entryTriggers: (merged.entry_triggers || []).map(String),
      branches: _treeBranchRows(merged)
    })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * Load the firm's raw logic-tree override map ({ treeId: override }) for
 * WRITING — the same store + dev-file the reader uses, but returned raw so one
 * key can be mutated. Missing / malformed → {} (a firm with no edits yet).
 * @param {string} firmId - authenticated firm id (never client-supplied)
 * @returns {Promise<Object>}
 */
async function _loadFirmLogicTreesMapRaw (firmId) {
  try {
    const v = await overlay.loadFirmConfig(firmId, CONTENT_CONFIG_KEYS.logicTrees)
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
  } catch (err) {
    if (devFallbackOk(err)) {
      try {
        const all = JSON.parse(fs.readFileSync(DEV_LOGIC_TREES_FILE, 'utf8'))
        return (all[firmId] && typeof all[firmId] === 'object' && !Array.isArray(all[firmId])) ? all[firmId] : {}
      } catch { return {} }
    }
    throw err
  }
}

/**
 * Persist the firm's whole logic-tree override map. Prod goes through the
 * overlay store (version history + restore for free); dev writes the gitignored
 * JSON the reader falls back to.
 * @param {string} firmId
 * @param {Object} map - { treeId: override }
 * @param {string} savedBy - userEmail
 * @returns {Promise<number|null>} the new version, or null in dev
 */
async function _saveFirmLogicTreesMap (firmId, map, savedBy) {
  try {
    return await overlay.saveFirmConfig(firmId, CONTENT_CONFIG_KEYS.logicTrees, map, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) {
      let all = {}
      try { all = JSON.parse(fs.readFileSync(DEV_LOGIC_TREES_FILE, 'utf8')) } catch {}
      all[firmId] = map
      fs.writeFileSync(DEV_LOGIC_TREES_FILE, JSON.stringify(all, null, 2))
      return null
    }
    throw err
  }
}

/**
 * Build a tree's full override branch-list from the edited display rows,
 * PRESERVING each existing node's hidden flow wiring (branches / next_node /
 * templates / type / stage …) and appending firm-added rows as new guidance
 * branches with no wiring. Scope: reword + add/remove, flow intact
 * (Mike 2026-07-24). deepMerge replaces arrays wholesale, so the override must
 * carry the COMPLETE list — a sparse list would drop the untouched branches.
 *
 * @param {Object} baseTree - the platform tree (nodes- or flat_if_then-shaped)
 * @param {Array<{id?:string,branch_name?:string,condition?:string,action?:string,notes?:string}>} rows
 * @returns {{ key: 'nodes'|'branches', list: Array<Object> }}
 */
function _mergeBranchRows (baseTree, rows) {
  const usesNodes = Array.isArray(baseTree.nodes)
  const key = usesNodes ? 'nodes' : 'branches'
  const baseList = usesNodes ? baseTree.nodes : (baseTree.branches || [])
  // Key by the SAME display id the detail route assigns (_treeBranchRows:
  // n.id || `row-${i}`), so both graph `nodes` (real ids) and flat_if_then
  // branches (often id-less) round-trip and keep their hidden fields —
  // templates included — instead of degrading to a text-only re-add.
  const byId = new Map(baseList.map((n, i) => [n.id || `row-${i}`, n]))
  const str = v => (typeof v === 'string' ? v : '')

  // A firm-added row's id IS its identity — the firm-editable cascade keys the
  // firm's decisions about a row to it. It must therefore be unique and it must
  // never change. It used to be the row's POSITION in the submitted list
  // (`firm-branch-${i}`), which is neither: a new row landing at the index where
  // an existing firm row's number was minted produced TWO rows carrying that id,
  // with no error. So a generated id now dodges every id already spoken for —
  // every platform row, and every id the submitted rows arrived with (which is
  // how previously-saved firm rows keep theirs).
  const taken = new Set(byId.keys())
  for (const row of (rows || [])) {
    if (row && typeof row.id === 'string' && row.id) { taken.add(row.id) }
  }
  let firmSeq = 0
  const nextFirmBranchId = () => {
    while (taken.has(`firm-branch-${firmSeq}`)) { firmSeq++ }
    const id = `firm-branch-${firmSeq}`
    taken.add(id)
    return id
  }

  const list = (rows || []).map((row) => {
    const existing = row && row.id ? byId.get(row.id) : null
    if (existing) {
      // Reword in place: overwrite only the four editable fields, keep the rest
      // (flow wiring, templates, type) exactly as the platform authored them.
      const next = { ...existing, branch_name: str(row.branch_name), condition: str(row.condition), notes: str(row.notes) }
      // The THEN box was filled from ONE of `action` / `question` /
      // `recommendation`, so the edit goes home to that same field. Asking
      // _thenFieldOf rather than repeating its rules is what stops the read and
      // the write drifting apart — and a `recommendation` written back as an
      // `action` would slip past the tool-name gate. See _thenFieldOf.
      next[_thenFieldOf(existing)] = str(row.action)
      return next
    }
    // Firm-added branch: a new guidance row, appended, with no flow wiring.
    return {
      id: (row && typeof row.id === 'string' && row.id) ? row.id : nextFirmBranchId(),
      branch_name: str(row && row.branch_name),
      condition: str(row && row.condition),
      action: str(row && row.action),
      notes: str(row && row.notes)
    }
  })
  return { key, list }
}

/**
 * POST /api/firm-manager/logic-trees/:treeId — save the firm's edits to one
 * logic table. Body: { branches: [{id,branch_name,condition,action,notes}] }.
 * The edits merge onto the SINGLE `logic-trees` bundle the advisor engine reads,
 * so a save reaches the AI (fenced — see logicTrees.formatLogicTreeForPrompt).
 */
async function saveLogicTree (req, res) {
  const { treeId } = req.params
  const rows = req.body && Array.isArray(req.body.branches) ? req.body.branches : null
  if (!rows) {
    return res.send(400, { success: false, error: { code: 'INVALID_BODY', message: 'branches array required' } })
  }
  try {
    const logicTrees = require('../utils/logicTrees')
    const base = logicTrees.loadLogicTrees().find(t => t.id === treeId)
    if (!base) {
      return res.send(404, { success: false, error: { code: 'NOT_FOUND', message: 'Logic table not found' } })
    }
    const { key, list } = _mergeBranchRows(base, rows)
    const map = await _loadFirmLogicTreesMapRaw(req.firmId)
    map[treeId] = { [key]: list }
    const version = await _saveFirmLogicTreesMap(req.firmId, map, req.userEmail)
    res.send(200, { saved: true, version, treeId })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * DELETE /api/firm-manager/logic-trees/:treeId — reset one table to the platform
 * default by dropping its key from the firm's override bundle.
 */
async function resetLogicTree (req, res) {
  const { treeId } = req.params
  try {
    const map = await _loadFirmLogicTreesMapRaw(req.firmId)
    if (Object.prototype.hasOwnProperty.call(map, treeId)) {
      delete map[treeId]
      await _saveFirmLogicTreesMap(req.firmId, map, req.userEmail)
    }
    res.send(200, { reset: true, treeId })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * GET /api/firm-manager/logic-trees/:treeId/history — the saved versions of the
 * firm's logic-tree bundle. NOTE: logic tables share ONE stored bundle, so this
 * history is bundle-level (every table's saves interleaved), not per-table. It
 * is read-only in Slice B; a per-table restore is deferred because restoring the
 * shared bundle would roll back every table at once (needs its own design).
 * `treeId` is accepted for URL symmetry with domain-support but not used.
 */
async function getLogicTreeHistory (req, res) {
  try {
    let history = []
    try {
      const [rows] = await db.execute(
        `SELECT version, saved_by, created_at
         FROM firm_framework_versions
         WHERE firm_id = ? AND config_key = ?
         ORDER BY version DESC`,
        [req.firmId, CONTENT_CONFIG_KEYS.logicTrees]
      )
      history = rows
    } catch (err) {
      if (!devFallbackOk(err)) { throw err }
    }
    res.send(200, { history })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * POST /api/firm-manager/logic-trees/probe — run one sentence through every
 * DETERMINISTIC layer of the engine and report what it did: which domain was
 * detected, which logic tables opened and on exactly which phrases, and which
 * problem signals fired. Body: { text }.
 *
 * A POST because the payload is free text, not an identifier — it must not land
 * in a URL, a server log or a browser history. Nothing is written: this is a
 * read of the engine's behaviour, not a change to it.
 *
 * ADVISORY DISTINCTIONS ARE INCLUDED, via one live gpt-4o-mini call through the
 * engine's own classifier (2026-08-02). They were previously reported as "not
 * measured" on the grounds that measuring them costs an API call — which is not a
 * reason (owner ruling, same day: live AI runs where it is what proves the thing).
 * For ONE sentence it is one call, so the layer is measured rather than excused.
 */
async function probeLogicTreePhrase (req, res) {
  const text = req.body && typeof req.body.text === 'string' ? req.body.text : null
  if (!text || !text.trim()) {
    return res.send(400, { success: false, error: { code: 'INVALID_BODY', message: 'text required' } })
  }
  try {
    const phraseProbe = require('../utils/phraseProbe')
    const firmMap = await _loadFirmLogicTreeMap(req.firmId)

    // The firm's OWN effective distinctions — the same resolution a live session
    // uses, so the probe cannot report a match production would not make. A read
    // fault here must not lose the deterministic answer the rest of the probe
    // already has, so it degrades to an empty list and the probe says why.
    let distinctionRows = []
    try {
      const state = await loadFirmDistinctionState(req.firmId, overlay.loadFirmConfig)
      const platformRows = await loadPlatformDistinctions(overlay.loadFirmConfig)
      distinctionRows = resolveEffectiveDistinctions(platformRows, state)
    } catch (err) {
      console.error('[logic-lab] distinction read failed — probe continues without them:', err.message)
    }

    res.send(200, await phraseProbe.probeText(text, firmMap, distinctionRows))
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * POST /api/firm-manager/logic-trees/:treeId/preview-triggers — what WOULD change
 * if this table's trigger phrases were edited. Body: { add: [], remove: [] }.
 *
 * ⚠ NOTHING IS SAVED. The proposal is merged in memory for the length of the
 * request. It exists so a firm can see, before committing, whether a new word
 * would take conversations away from another table — the check that was done by
 * hand on 2026-07-31 and survived nowhere.
 */
async function previewLogicTreeTriggers (req, res) {
  const { treeId } = req.params
  const body = req.body || {}
  const add = Array.isArray(body.add) ? body.add : []
  const remove = Array.isArray(body.remove) ? body.remove : []
  if (add.length === 0 && remove.length === 0) {
    return res.send(400, { success: false, error: { code: 'INVALID_BODY', message: 'add or remove required' } })
  }
  try {
    const phraseProbe = require('../utils/phraseProbe')
    const firmMap = await _loadFirmLogicTreeMap(req.firmId)
    const result = phraseProbe.previewTriggerChange({ treeId, add, remove, firmTrees: firmMap })
    if (!result) {
      return res.send(404, { success: false, error: { code: 'NOT_FOUND', message: 'Logic table not found' } })
    }
    res.send(200, result)
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * POST /api/firm-manager/logic-trees/:treeId/section — re-file a logic table into
 * a different master section for this firm (display-only; the AI is unaffected).
 * Body: { section: 'doTheJob' | 'getTheJob' | 'getOrganised' }. Moving an item
 * back to its platform-default section clears the override.
 */
async function setLogicTreeSection (req, res) {
  const { treeId } = req.params
  const section = req.body && req.body.section
  if (!VALID_SECTIONS.includes(section)) {
    return res.send(400, { success: false, error: { code: 'INVALID_SECTION', message: 'section must be one of: ' + VALID_SECTIONS.join(', ') } })
  }
  try {
    const logicTrees = require('../utils/logicTrees')
    const base = logicTrees.loadLogicTrees().find(t => t.id === treeId)
    if (!base) {
      return res.send(404, { success: false, error: { code: 'NOT_FOUND', message: 'Logic table not found' } })
    }
    const map = await _loadSectionMap(req.firmId, LOGIC_TREE_SECTIONS_KEY, DEV_LOGIC_TREE_SECTIONS_FILE)
    if (section === _treeSection(base)) { delete map[treeId] } else { map[treeId] = section }
    await _saveSectionMap(req.firmId, LOGIC_TREE_SECTIONS_KEY, DEV_LOGIC_TREE_SECTIONS_FILE, map, req.userEmail)
    res.send(200, { moved: true, treeId, section })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * POST /api/firm-manager/domain-support/:domainId/section — re-file a
 * domain-support item into a different master section for this firm
 * (display-only). Body: { section }. Back-to-default clears the override.
 */
async function setDomainSupportSection (req, res) {
  const { domainId } = req.params
  const section = req.body && req.body.section
  if (!VALID_SECTIONS.includes(section)) {
    return res.send(400, { success: false, error: { code: 'INVALID_SECTION', message: 'section must be one of: ' + VALID_SECTIONS.join(', ') } })
  }
  const domains = require('../../data/domains.json') || []
  const getFiles = ['get-marketing', 'get-positioning', 'get-pricing-proposals', 'get-sales', 'get-sales-tracker', 'get-seminar', 'get-team-problem']
  const known = new Set([...domains.map(d => d.id), ...getFiles])
  if (!known.has(domainId)) {
    return res.send(404, { success: false, error: { code: 'NOT_FOUND', message: 'Domain support item not found' } })
  }
  try {
    const map = await _loadSectionMap(req.firmId, DOMAIN_SUPPORT_SECTIONS_KEY, DEV_DOMAIN_SUPPORT_SECTIONS_FILE)
    if (section === _domainSupportSection(domainId)) { delete map[domainId] } else { map[domainId] = section }
    await _saveSectionMap(req.firmId, DOMAIN_SUPPORT_SECTIONS_KEY, DEV_DOMAIN_SUPPORT_SECTIONS_FILE, map, req.userEmail)
    res.send(200, { moved: true, domainId, section })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Logic-Lab (the Decision Logic page) ───────────────────────────────────────
// Two READ-ONLY routes behind the Firm Manager Hub tab named "Logic-Lab". The
// screen is design/mockups/decision-logic-map-mockup.html, approved by Mike
// 2026-08-02; ACTIONS #logic-lab-decision-logic-build.
//
// ACCURACY IS THE RULING ("of course it needs to be accurate for them — always"):
// both routes read the FIRM'S OWN resolved configuration — their logic-table
// edits, their distinctions, their imported template library — never the platform
// files with the firm's work missing.
//
// The counting lives in server/utils/logicLabSummary.js, not in these handlers,
// so the planned mentor rollup across every firm can call the same functions
// instead of growing a second definition of "what a firm has".

/**
 * The firm's imported template library, or null for the platform default. Same
 * two-step (overlay, then the dev-JSON fallback) as getTemplateImport, so the
 * diagnostic scores against the library an advisor session would actually use.
 * @param {string} firmId
 * @returns {Promise<Array|null>}
 */
async function _firmTemplateLibrary (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, 'templates')
    return Array.isArray(stored) ? stored : null
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadTemplates(firmId) }
    throw err
  }
}

/**
 * The firm's effective Advisory Distinctions — platform rows with their declines
 * removed and their overrides swapped in, plus the firm's own rows.
 * @param {string} firmId
 * @returns {Promise<Array<Object>>}
 */
async function _effectiveDistinctionsFor (firmId) {
  const state = await loadFirmDistinctionState(firmId, overlay.loadFirmConfig)
  const platformRows = await loadPlatformDistinctions(overlay.loadFirmConfig)
  return resolveEffectiveDistinctions(platformRows, state)
}

/**
 * @route GET /api/firm-manager/logic-lab/summary
 *
 * Sections 1 and 3 of the page: the three levers with the firm's real counts,
 * and the near-miss distinctions — the firm's own rows filed under one area that
 * keep matching conversations recognised as another, so they have never counted.
 *
 * Reads nothing it does not already have a screen for; writes nothing at all.
 *
 * @returns {200} { levers, nearMisses, quizNote }
 */
async function getLogicLabSummary (req, res) {
  try {
    const logicTreesLib = require('../utils/logicTrees')
    const domainSupport = require('../utils/domainSupport')
    const summary = require('../utils/logicLabSummary')
    const caseStore = require('../utils/caseStore')
    const domains = require('../../data/domains.json') || []

    // ── Domain support: every document, with the firm's own edits marked.
    const supportOverrides = await _loadFirmDomainSupportMapRaw(req.firmId)
    const domainSupportDocs = []
    for (const id of [...domains.map(d => d.id), ...DOMAIN_SUPPORT_GET_FILES]) {
      const override = supportOverrides[id] || null
      const resolved = domainSupport.resolveDomainSupport(id, override ? { [id]: override } : null)
      // A domain with no base file has no document to count; counting it would
      // inflate the number the page states as fact.
      if (!resolved) { continue }
      domainSupportDocs.push({ id, hasOverride: override !== null, origin: override ? 'firm' : 'platform' })
    }

    // ── Logic tables: the firm's merged tables, so an edit that adds a template
    // hint moves the "carry template hints" count on this page.
    const firmTreeMap = await _loadFirmLogicTreeMap(req.firmId)
    const trees = logicTreesLib.effectiveTrees(firmTreeMap).map(tree => ({
      ...tree,
      origin: (firmTreeMap && firmTreeMap[tree.id]) ? 'firm' : 'platform'
    }))

    const distinctions = await _effectiveDistinctionsFor(req.firmId)
    const quizBanks = await loadBlendedQuizBanks(req.firmId, overlay.loadFirmConfig)

    // ── Near misses, from cases advisors SHARED with the firm. Private cases are
    // advisor-only by design, so this is a count of shared cases and the payload
    // says so rather than letting the number read as every conversation.
    let sharedCases = []
    try {
      sharedCases = await caseStore.listSharedForFirm(req.firmId)
    } catch (err) {
      // A case-store fault must not take the whole page down — sections 1 and 2
      // are still true without it. Reported in the payload, never as silence.
      console.error('[logic-lab] shared case read failed:', err.message)
      sharedCases = null
    }

    res.send(200, {
      levers: summary.buildLeverSummary({
        domainSupportDocs,
        logicTrees: trees,
        distinctions,
        quizBanks
      }),
      nearMisses: sharedCases
        ? summary.aggregateNearMisses(sharedCases, distinctions)
        : { rows: [], basisCaseCount: 0, tracedCaseCount: 0, staleDropped: 0, unavailable: true },
      domains: domains.map(d => ({ id: d.id, label: d.label }))
    })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route POST /api/firm-manager/logic-lab/diagnose
 * Body: { text, expectedTitle? }
 *
 * Section 4 of the page. Runs the sentence through the real engine and returns
 * what it did (the live probe) plus the score sheet with the gap to the template
 * the firm expected.
 *
 * A POST because the body is free advisor text, which must never reach a URL, a
 * server log or a browser history. NOTHING IS SAVED.
 *
 * ⚠ The sheet publishes only the firm-editable levers; every other scoring rule
 * is folded into one "other engine factors" figure so the arithmetic still
 * balances (server/utils/decisionScore.js — the allowlist fails closed).
 *
 * @returns {200} the decisionScore payload
 * @returns {400} INVALID_BODY · {500} DB_ERROR
 */
async function diagnoseDecision (req, res) {
  const text = req.body && typeof req.body.text === 'string' ? req.body.text : null
  if (!text || !text.trim()) {
    return sendError(res, 400, 'INVALID_BODY', 'text required')
  }
  const expectedTitle = req.body && typeof req.body.expectedTitle === 'string'
    ? req.body.expectedTitle
    : null

  try {
    const decisionScore = require('../utils/decisionScore')
    const firmTrees = await _loadFirmLogicTreeMap(req.firmId)

    // Same degradation the probe route already chose: a distinction read fault
    // must not lose the deterministic half of the answer. It is logged, and the
    // sheet then shows no distinction levers — which the page reads as "none
    // matched", so the failure is stated rather than disguised.
    let distinctionRows = []
    let distinctionsAvailable = true
    try {
      distinctionRows = await _effectiveDistinctionsFor(req.firmId)
    } catch (err) {
      console.error('[logic-lab] distinction read failed — diagnosis continues without them:', err.message)
      distinctionsAvailable = false
    }

    const firmTemplates = await _firmTemplateLibrary(req.firmId)
    const result = await decisionScore.diagnose({
      text,
      expectedTitle,
      firmTrees,
      distinctionRows,
      firmTemplates
    })
    res.send(200, { ...result, distinctionsAvailable })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route GET /api/firm-manager/logic-lab/templates
 * The template titles the "which template did you expect?" picker offers — the
 * firm's own library when they have imported one, otherwise the platform set.
 * Titles only: the picker needs nothing else, and a page shape is not a payload.
 * @returns {200} { titles: string[] }
 */
async function getLogicLabTemplateTitles (req, res) {
  try {
    const { getOrgTemplates } = require('../utils/templates')
    const firmTemplates = await _firmTemplateLibrary(req.firmId)
    const titles = getOrgTemplates(null, firmTemplates)
      .map(t => t && t.title)
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)))
    res.send(200, { titles: [...new Set(titles)] })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Logic-Lab — accept an idea ────────────────────────────────────────────────
// ACTIONS #logic-lab-accept-and-push. THE SPEC IS THE ARTEFACT:
// design/LOGIC-LAB-ACCEPT-AND-PUSH.md, which carries Mike's request verbatim.
//
// This is the page's THIRD write, and the first that changes template selection.
// Only the fully-determined idea gets a button (Mike's ruling, 2026-08-03) — see
// server/utils/logicLabAccept.js for why the other two cannot be the same control.

// The accepted-idea log. Its own firmOverlay config key, so it inherits version
// history like every other block and needs no schema change.
//
// ⚠ HONEST LIMIT, worth knowing before volumes grow: this is ONE JSON value that
// is rewritten whole on every append, and firmOverlay banks a version each time —
// so storage grows with the square of the entry count. That is comfortably fine
// for a manager accepting ideas by hand, and wrong for anything automated. When
// the mentor rollup is built, this wants its own table.
const LOGIC_LAB_ACCEPTED_KEY = 'logic-lab-accepted'

function _devReadAcceptedLog (firmId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_LOGIC_LAB_ACCEPTED_FILE, 'utf8'))
    return Array.isArray(all[firmId]) ? all[firmId] : []
  } catch { return [] }
}

function _devWriteAcceptedLog (firmId, rows) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_LOGIC_LAB_ACCEPTED_FILE, 'utf8'))
  } catch {}
  all[firmId] = rows
  fs.writeFileSync(DEV_LOGIC_LAB_ACCEPTED_FILE, JSON.stringify(all, null, 2))
}

async function _loadAcceptedLog (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, LOGIC_LAB_ACCEPTED_KEY)
    return Array.isArray(stored) ? stored : []
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadAcceptedLog(firmId) }
    throw err
  }
}

async function _saveAcceptedLog (firmId, rows, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, LOGIC_LAB_ACCEPTED_KEY, rows, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteAcceptedLog(firmId, rows); return }
    throw err
  }
}

/**
 * @route POST /api/firm-manager/logic-lab/accept
 * Body: { text, templateTitle, description?, context? }
 *
 * Attach the template the firm expected to the distinction that already matched —
 * the one idea on the page that is fully determined, so it can be one click.
 *
 * ONE ROUTE DOES BOTH THE CHANGE AND THE RECORD, deliberately. The near-miss
 * Move/Copy buttons reuse the ordinary distinction endpoints from the browser, and
 * this could have too — but the accepted-idea log is required from the first
 * commit (design/LOGIC-LAB-ACCEPT-AND-PUSH.md), and a design where the browser
 * makes a second, separate call to record it loses an entry every time that call
 * fails. Here an accept cannot be written without being logged.
 *
 * NOTHING THE BROWSER SENDS DECIDES THE WRITE. The distinction list and the
 * template library are re-resolved server-side from the JWT-verified firm, so a
 * client naming another firm's distinction gets a 404 from a list it was never in.
 * `context` is descriptive only and is bounded before storage.
 *
 * @returns {200} { attached: true, distinctionId, templates }
 * @returns {400} INVALID_BODY · INVALID_TEMPLATE · INVALID_ID · TEMPLATE_NOT_IN_LIBRARY
 * @returns {404} NOT_FOUND · {409} ALREADY_ATTACHED · {500} DB_ERROR
 */
async function acceptLogicLabIdea (req, res) {
  const body = req.body || {}
  const templateTitle = typeof body.templateTitle === 'string' ? body.templateTitle : ''
  const text = typeof body.text === 'string' ? body.text : ''
  // The row wording the manager approved (or reworded) in the confirm dialog.
  // Their words either way — the app never authors the firm's material.
  const description = typeof body.description === 'string' ? body.description : ''

  try {
    const { planDeliver, requiredBoost, buildLogEntry } = require('../utils/logicLabAccept')
    const { getOrgTemplates } = require('../utils/templates')
    const decisionScore = require('../utils/decisionScore')

    const firmTemplates = await _firmTemplateLibrary(req.firmId)
    const firmTrees = await _loadFirmLogicTreeMap(req.firmId)
    const libraryTitles = getOrgTemplates(null, firmTemplates)
      .map(t => t && t.title)
      .filter(Boolean)

    /** Run the manager's phrase through the real engine. */
    const runEngine = async () => decisionScore.diagnose({
      text,
      expectedTitle: templateTitle,
      firmTrees,
      distinctionRows: await _effectiveDistinctionsFor(req.firmId),
      firmTemplates
    })

    // ── 1. What happens today, and how far short the wanted template falls ────
    const before = await runEngine()
    const topBefore = (before.sheet && before.sheet[0]) || null
    const wantedBefore = before.expected || null
    if (!before.scored || !topBefore || !wantedBefore) {
      return sendError(res, 400, 'NO_DOMAIN', 'These words were not recognised as any advisory area, so there is nowhere the engine would read a distinction filed for them.')
    }

    // ── 2. The distinction that delivers it ──────────────────────────────────
    const ownRows = await _loadDistinctions(req.firmId)
    const outcome = planDeliver({
      text,
      templateTitle,
      description,
      domain: before.domain,
      libraryTitles,
      existingRows: ownRows,
      boost: requiredBoost(topBefore.score, wantedBefore.score)
    })
    if (!outcome.ok) {
      return sendError(res, outcome.code === 'NO_DOMAIN' ? 400 : 400, outcome.code, outcome.message)
    }
    const plan = outcome.plan

    if (!VISIBLE_DISTINCTION_DOMAINS.has(plan.domain)) {
      // Refusal, not a write. The engine read the words as an area the Advisory
      // Distinctions screen does not show; filing there would change live
      // behaviour with nothing on any screen to show it happened.
      return sendError(res, 400, 'DOMAIN_NOT_VISIBLE', 'These words were read as an area your Advisory Distinctions screen doesn’t cover, so nothing was changed.')
    }

    // ── 3. Write it, keeping what was there so it can be put back ────────────
    const nextRows = plan.mode === 'update'
      ? ownRows.map(r => String(r.id) === String(plan.id)
          ? { ...r, templates: plan.templates, boost: plan.boost, triggers: plan.triggers }
          : r)
      : [...ownRows, {
          id: ownRows.length > 0 ? Math.max(...ownRows.map(r => r.id || 0)) + 1 : 1,
          domain: plan.domain,
          description: plan.description,
          triggers: plan.triggers,
          templates: plan.templates,
          boost: plan.boost,
          created_by: req.userEmail,
          created_at: new Date().toISOString(),
          // Provenance: this row was written by an accepted Logic-Lab idea, not
          // typed on the distinctions screen. The mentor rollup wants to tell
          // those apart, and so does anyone reading the row later.
          created_from: 'logic-lab'
        }]
    await _saveDistinctions(req.firmId, nextRows, req.userEmail)

    // ── 4. PROVE IT. The whole promise of this button is that the advisor now
    // gets the template — so it is checked against the real engine rather than
    // asserted from the arithmetic. The boost is computable, but whether the AI
    // MATCHES the new distinction to these words is a judgement, and a promise
    // resting on an unchecked judgement is the thing this page exists to stop.
    const after = await runEngine()
    const topAfter = (after.sheet && after.sheet[0]) || {}
    const delivered = String(topAfter.title || '') === String(plan.templateTitle)

    if (!delivered) {
      // Put the configuration back exactly as it was. A change that did not do
      // what it promised is worse than no change: it is a change the manager
      // believes worked.
      await _saveDistinctions(req.firmId, ownRows, req.userEmail)
      return res.send(200, {
        delivered: false,
        topTemplate: topAfter.title || null,
        topScore: typeof topAfter.score === 'number' ? topAfter.score : null,
        wantedScore: (after.expected && after.expected.score) || 0,
        reverted: true
      })
    }

    // ── 5. The record — written in the same handler, so an accepted idea can
    // never change live configuration and leave no trace.
    const entry = buildLogEntry({
      plan,
      context: body.context,
      by: req.userEmail,
      at: new Date().toISOString()
    })
    const log = await _loadAcceptedLog(req.firmId)
    await _saveAcceptedLog(req.firmId, [...log, entry], req.userEmail)

    res.send(200, {
      delivered: true,
      mode: plan.mode,
      domain: plan.domain,
      boost: plan.boost,
      templateTitle: plan.templateTitle,
      score: typeof topAfter.score === 'number' ? topAfter.score : null
    })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

// ── Coaching Reference (item 4.9, the visible half) ───────────────────────────
// The engine half shipped 2026-08-15 (server/utils/coachingConfig.js): the fifteen
// rows in data/coaching-reference.json resolve down every tier through the one
// firm-editable mechanism. Nothing could make a decision for it to resolve, because
// there was no screen and no route. These are the routes.
//
// Deliberately modelled on the staircase handlers above, key for key, so the two
// cannot drift. Two differences, both honest rather than incidental:
//
//   1. NO DRIFT BASELINE, so no Adopt / Keep mine. The staircase stamps a signature
//      of the platform wording a firm edited against, and offers a review when that
//      wording later changes. coachingConfig stores nothing equivalent, and a badge
//      backed by no stamp is a light that can never come on. Approved as absent by
//      Mike on 2026-08-15 against design/mockups/firm-coaching-reference.html.
//   2. NO whole-config key and no history routes. The staircase's history belongs to
//      its one scalar setting (defaultCeiling); the coaching block has no scalar.
//
// 🔴 THE KEY THIS SECTION MUST NEVER TOUCH: `coaching-reference`. It holds a firm's
// PROMOTED CASE OBSERVATIONS — advisor free text about a real client, which reaches
// the model FENCED. These routes write only coaching-declines / coaching-overrides /
// coaching-own. See the header of server/utils/firmCoachingReference.js.

const BASE_COACHING_ROWS = require('../../data/coaching-reference.json')
const {
  loadFirmCoachingState,
  CONFIG_KEYS: COACHING_KEYS,
  EDITABLE_COACHING_FIELDS,
  ownCoachingPrefix
} = require('../utils/firmCoachingReference')
const { loadResolvedCoaching } = require('../utils/coachingConfig')

const DEV_COACHING_DECLINES_FILE = path.resolve(__dirname, '../../data/dev-firm-coaching-declines.json')
const DEV_COACHING_OVERRIDES_FILE = path.resolve(__dirname, '../../data/dev-firm-coaching-overrides.json')
const DEV_COACHING_OWN_FILE = path.resolve(__dirname, '../../data/dev-firm-coaching-own.json')

const COACHING_DEV_FILES = {
  [COACHING_KEYS.declines]: DEV_COACHING_DECLINES_FILE,
  [COACHING_KEYS.overrides]: DEV_COACHING_OVERRIDES_FILE,
  [COACHING_KEYS.own]: DEV_COACHING_OWN_FILE
}

const PLATFORM_COACHING_IDS = new Set(BASE_COACHING_ROWS.map(r => r.id))

/**
 * The most scenarios one entry may carry, and the longest any single one may be.
 *
 * Not arbitrary tidiness: every field here is rendered into the prompt that chooses a
 * template, so an unbounded array is an unbounded prompt. The platform's own widest
 * entry has four scenarios, so twenty is far above any honest use and still bounded.
 */
const MAX_COACHING_SCENARIOS = 20
const MAX_COACHING_SCENARIO_LENGTH = 500

async function _loadCoachingPart (firmId, key, fallback) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, key)
    return (stored === null || stored === undefined) ? fallback : stored
  } catch (err) {
    if (devFallbackOk(err)) { return _devReadStaircasePart(COACHING_DEV_FILES[key], firmId, fallback) }
    throw err
  }
}

async function _saveCoachingPart (firmId, key, value, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, key, value, savedBy)
  } catch (err) {
    if (devFallbackOk(err)) { _devWriteStaircasePart(COACHING_DEV_FILES[key], firmId, value); return }
    throw err
  }
}

/**
 * Accept only the fields a firm may edit on a coaching entry, in the types they must be.
 *
 * `template` is absent from EDITABLE_COACHING_FIELDS on purpose and is NOT accepted here
 * for a platform row: the field names a template in the library, and letting a firm
 * retitle an inherited row would leave the platform's id attached to guidance pointing
 * somewhere else. firmCoachingReference.filterEditableFields strips it again on the read,
 * so this is the first of two locks rather than the only one.
 *
 * @param {Object} body
 * @param {{allowTemplate: boolean}} [opts] - own rows carry their own template, because
 *   an entry that names no template coaches the model toward nothing
 * @returns {{ok: boolean, value?: Object, code?: string, message?: string}}
 */
function _sanitiseCoachingFields (body, opts) {
  const src = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {}
  const allowTemplate = !!(opts && opts.allowTemplate)
  const value = {}

  if (allowTemplate && Object.prototype.hasOwnProperty.call(src, 'template')) {
    if (typeof src.template !== 'string') {
      return { ok: false, code: 'INVALID_FIELD', message: 'template must be a string' }
    }
    value.template = src.template.trim()
  }

  for (const field of EDITABLE_COACHING_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(src, field)) { continue }

    if (field === 'scenarios') {
      if (!Array.isArray(src[field])) {
        return { ok: false, code: 'INVALID_FIELD', message: 'scenarios must be an array of strings' }
      }
      if (src[field].length > MAX_COACHING_SCENARIOS) {
        return {
          ok: false,
          code: 'TOO_MANY_SCENARIOS',
          message: `No more than ${MAX_COACHING_SCENARIOS} situations per entry`
        }
      }
      const cleaned = []
      for (const item of src[field]) {
        if (typeof item !== 'string') {
          return { ok: false, code: 'INVALID_FIELD', message: 'scenarios must be an array of strings' }
        }
        if (item.length > MAX_COACHING_SCENARIO_LENGTH) {
          return {
            ok: false,
            code: 'SCENARIO_TOO_LONG',
            message: `A situation must be under ${MAX_COACHING_SCENARIO_LENGTH} characters`
          }
        }
        // A blank row is what an untouched "add a situation" box sends. Dropping it
        // here means the screen never has to police its own empty inputs, and an
        // empty string can never reach the prompt as a bullet with nothing after it.
        const trimmed = item.trim()
        if (trimmed) { cleaned.push(trimmed) }
      }
      value[field] = cleaned
      continue
    }

    if (typeof src[field] !== 'string') {
      return { ok: false, code: 'INVALID_FIELD', message: `${field} must be a string` }
    }
    value[field] = src[field].trim()
  }

  if (Object.keys(value).length === 0) {
    const offered = allowTemplate
      ? ['template', ...EDITABLE_COACHING_FIELDS]
      : EDITABLE_COACHING_FIELDS
    return { ok: false, code: 'NO_FIELDS', message: `Provide at least one of: ${offered.join(', ')}` }
  }
  return { ok: true, value }
}

/**
 * @route GET /api/firm-manager/coaching
 * The tab's whole picture: Advisor-e's coaching entries, this firm's decisions, and the
 * resolved list those two produce — the SAME list server/utils/coaching.js renders into
 * the prompt, so the screen can never show a firm something different from what its
 * advisors' AI is actually coached by.
 * @returns {{base: Array, state: Object, resolved: Array, hasOverride: boolean}}
 */
async function getCoaching (req, res) {
  try {
    const state = await loadFirmCoachingState(req.firmId, overlay.loadFirmConfig)
    const resolved = await loadResolvedCoaching(req.firmId, overlay.loadFirmConfig)
    res.send(200, {
      base: BASE_COACHING_ROWS,
      state,
      resolved,
      hasOverride: state.declinedIds.length > 0 ||
        Object.keys(state.overrides).length > 0 ||
        state.ownRows.length > 0
    })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route PUT /api/firm-manager/coaching/platform/:id
 * Edit an Advisor-e coaching entry for this firm. Fields the body does not carry are NOT
 * recorded, so they keep tracking Advisor-e's wording rather than being frozen at today's
 * text — the whole point of the mechanism.
 * @param {string} id - a platform entry id (cr-*)
 * @returns {{updated: true, id: string}}
 */
async function setCoachingOverride (req, res) {
  const id = String(req.params.id || '')
  if (!PLATFORM_COACHING_IDS.has(id)) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform coaching entry with that id')
  }
  const sani = _sanitiseCoachingFields(req.body || {})
  if (!sani.ok) { return sendError(res, 400, sani.code, sani.message) }
  try {
    const stored = await _loadCoachingPart(req.firmId, COACHING_KEYS.overrides, {})
    const current = (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {}
    const next = { ...current, [id]: { ...(current[id] || {}), ...sani.value } }
    await _saveCoachingPart(req.firmId, COACHING_KEYS.overrides, next, req.userEmail)
    res.send(200, { updated: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route DELETE /api/firm-manager/coaching/platform/:id
 * Reset to platform — drop this firm's version so Advisor-e's entry applies again, and
 * keeps applying as Advisor-e changes it. Idempotent.
 * @param {string} id - a platform entry id (cr-*)
 * @returns {{reset: true, id: string}}
 */
async function resetCoachingOverride (req, res) {
  const id = String(req.params.id || '')
  if (!PLATFORM_COACHING_IDS.has(id)) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform coaching entry with that id')
  }
  try {
    const stored = await _loadCoachingPart(req.firmId, COACHING_KEYS.overrides, {})
    const current = (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {}
    if (Object.prototype.hasOwnProperty.call(current, id)) {
      const next = { ...current }
      delete next[id]
      await _saveCoachingPart(req.firmId, COACHING_KEYS.overrides, next, req.userEmail)
    }
    res.send(200, { reset: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route PUT /api/firm-manager/coaching/platform/:id/decline
 * Switch an Advisor-e coaching entry off for this firm, or back on. Only the declines key
 * is written — the firm's override survives — so an entry switched back on returns with
 * ITS OWN wording, not Advisor-e's. Dropping an edit is the reset route above; the two
 * are separate on purpose.
 *
 * THE LAST-ENTRY REFUSAL IS THE STAIRCASE'S, FOR THE SAME REASON AND A DIFFERENT COST.
 * loadResolvedCoaching already refuses to resolve to zero rows and falls back to the
 * layer above — so without this a firm could switch every entry off, see them all
 * greyed out, and still be coached by all fifteen. The screen would be lying. Refusing
 * here is the lock that can explain itself to the person who asked for it.
 *
 * @param {string} id - a platform entry id (cr-*)
 * @param {boolean} req.body.declined
 * @returns {{declined: boolean, id: string}}
 */
async function setCoachingDecline (req, res) {
  const id = String(req.params.id || '')
  if (!PLATFORM_COACHING_IDS.has(id)) {
    return sendError(res, 404, 'NOT_FOUND', 'No platform coaching entry with that id')
  }
  const declined = (req.body || {}).declined
  if (typeof declined !== 'boolean') {
    return sendError(res, 400, 'INVALID_DECLINED', 'declined must be a boolean')
  }
  try {
    const stored = await _loadCoachingPart(req.firmId, COACHING_KEYS.declines, [])
    const set = new Set(Array.isArray(stored) ? stored : [])
    if (declined) { set.add(id) } else { set.delete(id) }
    if (declined && set.size >= PLATFORM_COACHING_IDS.size) {
      const ownRows = await _loadCoachingPart(req.firmId, COACHING_KEYS.own, [])
      if (!Array.isArray(ownRows) || ownRows.length === 0) {
        return sendError(res, 409, 'LAST_ENTRY', 'At least one entry must stay switched on — add your own entry first, or switch another back on')
      }
    }
    await _saveCoachingPart(req.firmId, COACHING_KEYS.declines, [...set], req.userEmail)
    res.send(200, { declined, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route POST /api/firm-manager/coaching/own
 * Add a coaching entry of the firm's own, after Advisor-e's. Its id is assigned here and
 * never taken from the body — an id from the browser could collide with a platform entry
 * and silently replace it. The prefix depends on WHO is adding (mc- / xc- / gc- / fc-),
 * because own-row numbers are minted per scope and every decision is keyed to an id.
 * @returns {{added: true, id: string}}
 */
async function addOwnCoachingEntry (req, res) {
  const sani = _sanitiseCoachingFields(req.body || {}, { allowTemplate: true })
  if (!sani.ok) { return sendError(res, 400, sani.code, sani.message) }
  if (!sani.value.template) {
    return sendError(res, 400, 'INVALID_FIELD', 'An entry needs a template name')
  }
  try {
    const stored = await _loadCoachingPart(req.firmId, COACHING_KEYS.own, [])
    const rows = Array.isArray(stored) ? stored : []
    // Highest existing number + 1, never the row count: reusing a deleted entry's id
    // would hand a new entry the decisions recorded against the old one.
    const prefix = ownCoachingPrefix(req.firmId)
    const used = rows
      .map(r => parseInt(String((r && r.id) || '').replace(prefix, ''), 10))
      .filter(n => Number.isInteger(n))
    const id = `${prefix}${(used.length ? Math.max(...used) : 0) + 1}`
    const next = [...rows, {
      id,
      template: sani.value.template,
      howItHelps: sani.value.howItHelps || '',
      whatToLookFor: sani.value.whatToLookFor || '',
      whereMayLead: sani.value.whereMayLead || '',
      deliveryNotes: sani.value.deliveryNotes || '',
      scenarios: sani.value.scenarios || []
    }]
    await _saveCoachingPart(req.firmId, COACHING_KEYS.own, next, req.userEmail)
    res.send(201, { added: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route PUT /api/firm-manager/coaching/own/:id
 * Edit an entry this firm added. `template` IS editable here, unlike on an inherited
 * entry: this row is the firm's own, so there is no platform id left pointing at wording
 * that has moved underneath it.
 * @param {string} id - a firm entry id (fc-*, or the tier prefix that minted it)
 * @returns {{updated: true, id: string}}
 */
async function updateOwnCoachingEntry (req, res) {
  const id = String(req.params.id || '')
  const sani = _sanitiseCoachingFields(req.body || {}, { allowTemplate: true })
  if (!sani.ok) { return sendError(res, 400, sani.code, sani.message) }
  if (Object.prototype.hasOwnProperty.call(sani.value, 'template') && !sani.value.template) {
    return sendError(res, 400, 'INVALID_FIELD', 'An entry needs a template name')
  }
  try {
    const stored = await _loadCoachingPart(req.firmId, COACHING_KEYS.own, [])
    const rows = Array.isArray(stored) ? stored : []
    const index = rows.findIndex(r => r && r.id === id)
    if (index === -1) {
      return sendError(res, 404, 'NOT_FOUND', 'No entry of your own with that id')
    }
    const next = rows.map((r, i) => (i === index ? { ...r, ...sani.value, id } : r))
    await _saveCoachingPart(req.firmId, COACHING_KEYS.own, next, req.userEmail)
    res.send(200, { updated: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * @route DELETE /api/firm-manager/coaching/own/:id
 * Remove an entry this firm added. Only the firm's own entries can be removed — an
 * Advisor-e entry is switched off, never deleted, so it can come back.
 * @param {string} id - a firm entry id
 * @returns {{removed: true, id: string}}
 */
async function deleteOwnCoachingEntry (req, res) {
  const id = String(req.params.id || '')
  try {
    const stored = await _loadCoachingPart(req.firmId, COACHING_KEYS.own, [])
    const rows = Array.isArray(stored) ? stored : []
    if (!rows.some(r => r && r.id === id)) {
      return sendError(res, 404, 'NOT_FOUND', 'No entry of your own with that id')
    }
    await _saveCoachingPart(
      req.firmId, COACHING_KEYS.own, rows.filter(r => !(r && r.id === id)), req.userEmail
    )
    res.send(200, { removed: true, id })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

module.exports = {
  quizzablePages,
  listDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  getFramework,
  saveFramework,
  getFrameworkHistory,
  restoreFramework,
  listVideos,
  addVideo,
  deleteVideo,
  getStorageUsage,
  getTemplateImport,
  importTemplates,
  resetTemplateImport,
  listDistinctions,
  createDistinction,
  updateDistinction,
  deleteDistinction,
  getDistinctionState,
  markDistinctionsReviewed,
  setDistinctionOverride,
  resetDistinctionOverride,
  keepMineDistinction,
  setDistinctionDecline,
  moveDistinction,
  promoteOverridesForDeletedRow,
  getStaircase,
  saveStaircase,
  setStaircaseOverride,
  resetStaircaseOverride,
  setStaircaseDecline,
  keepMineStaircaseStep,
  addOwnStaircaseStep,
  updateOwnStaircaseStep,
  deleteOwnStaircaseStep,
  getCoaching,
  setCoachingOverride,
  resetCoachingOverride,
  setCoachingDecline,
  addOwnCoachingEntry,
  updateOwnCoachingEntry,
  deleteOwnCoachingEntry,
  getQuizzes,
  saveQuizzes,
  setQuizOverride,
  resetQuizOverride,
  keepMineQuizQuestion,
  setQuizDecline,
  addOwnQuizQuestion,
  updateOwnQuizQuestion,
  deleteOwnQuizQuestion,
  getDomainSupport,
  getDomainSupportDetail,
  saveDomainSupport,
  resetDomainSupport,
  getDomainSupportHistory,
  restoreDomainSupport,
  getLogicTrees,
  getLogicTreeDetail,
  saveLogicTree,
  resetLogicTree,
  getLogicTreeHistory,
  setLogicTreeSection,
  probeLogicTreePhrase,
  previewLogicTreeTriggers,
  setDomainSupportSection,
  getLogicLabSummary,
  diagnoseDecision,
  getLogicLabTemplateTitles,
  acceptLogicLabIdea
}
