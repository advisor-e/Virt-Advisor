'use strict'

const path = require('path')
const DEV_DISTINCTIONS_FILE = path.resolve(__dirname, '../../data/dev-firm-distinctions.json')
const DEV_DECLINES_FILE = path.resolve(__dirname, '../../data/dev-firm-distinction-declines.json')
const DEV_OVERRIDES_FILE = path.resolve(__dirname, '../../data/dev-firm-distinction-overrides.json')
const DEV_STAIRCASE_FILE = path.resolve(__dirname, '../../data/dev-firm-staircase.json')
const DEV_TEMPLATES_FILE = path.resolve(__dirname, '../../data/dev-firm-templates.json')
const DEV_LASTSEEN_FILE = path.resolve(__dirname, '../../data/dev-firm-distinction-lastseen.json')
const DEV_OVERRIDE_BASELINES_FILE = path.resolve(__dirname, '../../data/dev-firm-distinction-override-baselines.json')
const DEV_QUIZZES_FILE = path.resolve(__dirname, '../../data/dev-firm-quizzes.json')
const IS_DEV = process.env.NODE_ENV !== 'production'

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
 *   Firm Profile
 *     GET  /api/firm-manager/profile              get firm profile
 *     PUT  /api/firm-manager/profile              update firm profile
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
    if (IS_DEV) { res.send(200, { base: [], firm: [] }); return }
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
    if (IS_DEV) { res.send(200, { configKey, firmOverride: null, hasOverride: false }); return }
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
    if (IS_DEV) { res.send(200, { history: [] }); return }
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
    if (IS_DEV) { res.send(200, { videos: [] }); return }
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

// ── Firm Profile ──────────────────────────────────────────────────────────────

async function getProfile (req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, slug, logo_url, primary_colour, persona_name, created_at
       FROM firms WHERE id = ?`,
      [req.firmId]
    )
    if (rows.length === 0) { return sendError(res, 404, 'NOT_FOUND', 'Firm not found') }
    res.send(200, { firm: rows[0] })
  } catch (err) {
    if (IS_DEV) {
      res.send(200, { firm: { id: req.firmId, name: 'Dev Firm', slug: 'dev', logo_url: null, primary_colour: '#000000', persona_name: null } }); return
    }
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

async function updateProfile (req, res) {
  const allowed = ['name', 'logo_url', 'primary_colour', 'persona_name']
  const body = req.body || {}
  const setClauses = []
  const values = []

  for (const field of allowed) {
    if (body[field] !== undefined) {
      setClauses.push(`\`${field}\` = ?`)
      values.push(body[field])
    }
  }

  if (setClauses.length === 0) {
    return sendError(res, 400, 'NO_FIELDS',
      `At least one of these fields is required: ${allowed.join(', ')}`)
  }

  values.push(req.firmId)
  try {
    await db.execute(
      `UPDATE firms SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    )
    res.send(200, { updated: true })
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
    if (IS_DEV) { res.send(200, { bytesUsed: 0, maxBytes: STORAGE.maxFirmStorageBytes, percentUsed: 0 }); return }
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
// a database. This is a TESTING convenience ONLY and is gated behind IS_DEV — it
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
    if (IS_DEV) {
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
      if (!IS_DEV) { throw err }
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
    if (IS_DEV) { _devClearTemplates(req.firmId); res.send(200, { reset: true }); return }
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

async function _loadDistinctions (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, DISTINCTIONS_KEY)
    return Array.isArray(stored) ? stored : []
  } catch (err) {
    if (IS_DEV) { return _devReadDistinctions(firmId) }
    throw err
  }
}

async function _saveDistinctions (firmId, rows, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, DISTINCTIONS_KEY, rows, savedBy)
  } catch (err) {
    if (IS_DEV) { _devWriteDistinctions(firmId, rows); return }
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
// origin, DISTINCTIONS-CASCADE-PLAN.md §6) — so its ids are loaded per request via
// the single platform loader (falls back to the committed seed when nothing stored).
async function _loadPlatformIds () {
  const rows = await loadPlatformDistinctions(overlay.loadFirmConfig)
  return new Set(rows.map(r => r.id))
}

async function _loadDeclines (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, CONFIG_KEYS.declines)
    return Array.isArray(stored) ? stored : []
  } catch (err) {
    if (IS_DEV) { return _devReadDeclines(firmId) }
    throw err
  }
}

async function _saveDeclines (firmId, ids, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, CONFIG_KEYS.declines, ids, savedBy)
  } catch (err) {
    if (IS_DEV) { _devWriteDeclines(firmId, ids); return }
    throw err
  }
}

async function _loadOverrides (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, CONFIG_KEYS.overrides)
    return (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {}
  } catch (err) {
    if (IS_DEV) { return _devReadOverrides(firmId) }
    throw err
  }
}

async function _saveOverrides (firmId, obj, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, CONFIG_KEYS.overrides, obj, savedBy)
  } catch (err) {
    if (IS_DEV) { _devWriteOverrides(firmId, obj); return }
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
    if (IS_DEV) { return _devReadLastSeen(firmId) }
    throw err
  }
}

async function _saveLastSeen (firmId, iso, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, LAST_SEEN_KEY, iso, savedBy)
  } catch (err) {
    if (IS_DEV) { _devWriteLastSeen(firmId, iso); return }
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
    if (IS_DEV) { return _devReadOverrideBaselines(firmId) }
    throw err
  }
}

async function _saveOverrideBaselines (firmId, obj, savedBy) {
  try {
    await overlay.saveFirmConfig(firmId, OVERRIDE_BASELINES_KEY, obj, savedBy)
  } catch (err) {
    if (IS_DEV) { _devWriteOverrideBaselines(firmId, obj); return }
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
    if (IS_DEV) { return _devAllOverrideFirms(id) }
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

  return { promoted }
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
  const platformRows = await loadPlatformDistinctions(overlay.loadFirmConfig)
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
  if (!(await _loadPlatformIds()).has(id)) {
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
  const platformRows = await loadPlatformDistinctions(overlay.loadFirmConfig)
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
  if (!(await _loadPlatformIds()).has(id)) {
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
  const platformRows = await loadPlatformDistinctions(overlay.loadFirmConfig)
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
    if (IS_DEV) { return _devReadStaircase(firmId) }
    throw err
  }
}

async function _saveStaircaseOverride (firmId, cfg, savedBy) {
  try {
    return await overlay.saveFirmConfig(firmId, STAIRCASE_KEY, cfg, savedBy)
  } catch (err) {
    if (IS_DEV) { _devWriteStaircase(firmId, cfg); return null }
    throw err
  }
}

// Returns an error string if the override is invalid, or null if it is well-formed.
function _validateStaircase (cfg) {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
    return 'staircase must be a non-array JSON object'
  }
  if (!Array.isArray(cfg.steps) || cfg.steps.length === 0) {
    return 'steps must be a non-empty array'
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

async function getStaircase (req, res) {
  try {
    const firmOverride = await _loadStaircase(req.firmId)
    res.send(200, { base: BASE_STAIRCASE, firmOverride, hasOverride: firmOverride !== null })
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
const { listTemplatePages } = require('../utils/resolveTemplateName')
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
    if (IS_DEV) { return _devReadQuizzes(firmId) }
    throw err
  }
}

async function _saveQuizOverride (firmId, cfg, savedBy) {
  try {
    return await overlay.saveFirmConfig(firmId, QUIZ_KEY, cfg, savedBy)
  } catch (err) {
    if (IS_DEV) { _devWriteQuizzes(firmId, cfg); return null }
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
 * @returns {{base: Object, firmOverride: Object|null, merged: Object,
 *            hasOverride: boolean, pages: Array<Object>}}
 */
async function getQuizzes (req, res) {
  try {
    const firmOverride = await _loadQuizOverride(req.firmId)
    const base = {}
    for (const [key, bank] of Object.entries(BASE_QUIZZES.banks || {})) {
      if (!key.startsWith('_')) { base[key] = bank }
    }
    res.send(200, {
      base,
      firmOverride,
      merged: mergeQuizBanks(base, firmOverride),
      hasOverride: firmOverride !== null,
      pages: quizzablePages(listTemplatePages())
    })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * POST /api/firm-manager/quizzes — save the firm's overlay (never the base).
 * Body: { quizzes: { "<page title>": { entries: [{id, question, answer, keyPoint}] } } }
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

// ── Domain Support ──────────────────────────────────────────────────────────

const DEV_DOMAIN_SUPPORT_FILE = path.resolve(__dirname, '../../data/dev-firm-domain-support.json')
const DOMAIN_SUPPORT_KEY_PREFIX = 'domain-support-'

function _devReadDomainSupport (firmId, domainId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_DOMAIN_SUPPORT_FILE, 'utf8'))
    const firm = all[firmId] || {}
    return firm[domainId] || null
  } catch { return null }
}

function _devWriteDomainSupport (firmId, domainId, cfg) {
  let all = {}
  try {
    all = JSON.parse(fs.readFileSync(DEV_DOMAIN_SUPPORT_FILE, 'utf8'))
  } catch {}
  if (!all[firmId]) { all[firmId] = {} }
  all[firmId][domainId] = cfg
  fs.writeFileSync(DEV_DOMAIN_SUPPORT_FILE, JSON.stringify(all, null, 2))
}

async function _loadDomainSupportOverride (firmId, domainId) {
  const configKey = DOMAIN_SUPPORT_KEY_PREFIX + domainId
  try {
    return await overlay.loadFirmConfig(firmId, configKey)
  } catch (err) {
    if (IS_DEV) { return _devReadDomainSupport(firmId, domainId) }
    throw err
  }
}

async function _saveDomainSupportOverride (firmId, domainId, cfg, savedBy) {
  const configKey = DOMAIN_SUPPORT_KEY_PREFIX + domainId
  try {
    return await overlay.saveFirmConfig(firmId, configKey, cfg, savedBy)
  } catch (err) {
    if (IS_DEV) { _devWriteDomainSupport(firmId, domainId, cfg); return null }
    throw err
  }
}

async function _getDomainSupportHistory (firmId, domainId) {
  const configKey = DOMAIN_SUPPORT_KEY_PREFIX + domainId
  try {
    const [rows] = await db.execute(
      `SELECT version, saved_by, created_at
       FROM firm_framework_versions
       WHERE firm_id = ? AND config_key = ?
       ORDER BY version DESC`,
      [firmId, configKey]
    )
    return rows
  } catch (err) {
    if (IS_DEV) { return [] }
    throw err
  }
}

async function _restoreDomainSupportVersion (firmId, domainId, version, restoredBy) {
  const configKey = DOMAIN_SUPPORT_KEY_PREFIX + domainId
  try {
    const [rows] = await db.execute(
      `SELECT config_json FROM firm_framework_versions
       WHERE firm_id = ? AND config_key = ? AND version = ?`,
      [firmId, configKey, version]
    )
    if (rows.length === 0) { throw new Error('Version not found') }
    const cfg = JSON.parse(rows[0].config_json)
    await _saveDomainSupportOverride(firmId, domainId, cfg, restoredBy)
    return true
  } catch (err) {
    if (IS_DEV) { return false }
    throw err
  }
}

/**
 * GET /api/firm-manager/domain-support — list all domain support + firm overrides
 */
async function getDomainSupport (req, res) {
  try {
    const { domainSupport } = require('../utils/domainSupport')
    const domains = require('../../data/domains.json') || []
    const fs = require('fs')
    const path = require('path')

    // Load GET files list
    const getFiles = ['get-marketing', 'get-positioning', 'get-pricing-proposals', 'get-sales', 'get-sales-tracker', 'get-seminar', 'get-team-problem']

    const result = {
      advisoryDomains: [],
      getSellers: []
    }

    // Load advisory domains with firm overrides
    for (const domain of domains) {
      const override = await _loadDomainSupportOverride(req.firmId, domain.id)
      const support = require('../utils/domainSupport').resolveDomainSupport(domain.id, override ? { [domain.id]: override } : null)
      result.advisoryDomains.push({
        id: domain.id,
        label: domain.label,
        hasOverride: override !== null,
        supportTools: support ? (support.support_tools || []).length : 0,
        origin: override ? 'firm' : 'platform'
      })
    }

    // Load GET files with firm overrides
    for (const fileId of getFiles) {
      const override = await _loadDomainSupportOverride(req.firmId, fileId)
      const support = require('../utils/domainSupport').resolveDomainSupport(fileId, override ? { [fileId]: override } : null)
      result.getSellers.push({
        id: fileId,
        label: fileId.replace('get-', '').replace(/-/g, ' '),
        hasOverride: override !== null,
        supportTools: support ? (support.support_tools || []).length : 0,
        origin: override ? 'firm' : 'platform'
      })
    }

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
    const override = await _loadDomainSupportOverride(req.firmId, domainId)
    const merged = domainSupport.resolveDomainSupport(domainId, override ? { [domainId]: override } : null)
    res.send(200, merged || {})
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * POST /api/firm-manager/domain-support/:domainId — save domain support override
 */
async function saveDomainSupport (req, res) {
  const { domainId } = req.params
  const override = req.body || {}

  try {
    const version = await _saveDomainSupportOverride(req.firmId, domainId, override, req.userEmail)
    res.send(200, { saved: true, version, domainId })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * DELETE /api/firm-manager/domain-support/:domainId — reset to platform default
 */
async function resetDomainSupport (req, res) {
  const { domainId } = req.params
  const configKey = DOMAIN_SUPPORT_KEY_PREFIX + domainId

  try {
    if (!IS_DEV) {
      await db.execute(
        `UPDATE firm_framework_versions SET is_active = 0
         WHERE firm_id = ? AND config_key = ?`,
        [req.firmId, configKey]
      )
    } else {
      let all = {}
      try {
        all = JSON.parse(fs.readFileSync(DEV_DOMAIN_SUPPORT_FILE, 'utf8'))
      } catch {}
      if (all[req.firmId]) { delete all[req.firmId][domainId] }
      fs.writeFileSync(DEV_DOMAIN_SUPPORT_FILE, JSON.stringify(all, null, 2))
    }
    res.send(200, { reset: true, domainId })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * GET /api/firm-manager/domain-support/:domainId/history — version history
 */
async function getDomainSupportHistory (req, res) {
  const { domainId } = req.params
  try {
    const history = await _getDomainSupportHistory(req.firmId, domainId)
    res.send(200, { history, domainId })
  } catch (err) {
    return serverError(res, 500, 'DB_ERROR', err)
  }
}

/**
 * POST /api/firm-manager/domain-support/:domainId/restore — restore a version
 */
async function restoreDomainSupport (req, res) {
  const { domainId } = req.params
  const { version } = req.body || {}

  if (typeof version !== 'number') {
    return res.send(400, { success: false, error: { code: 'INVALID_VERSION', message: 'version must be a number' } })
  }

  try {
    await _restoreDomainSupportVersion(req.firmId, domainId, version, req.userEmail)
    res.send(200, { restored: true, domainId, version })
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
  getProfile,
  updateProfile,
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
  getQuizzes,
  saveQuizzes,
  getDomainSupport,
  getDomainSupportDetail,
  saveDomainSupport,
  resetDomainSupport,
  getDomainSupportHistory,
  restoreDomainSupport
}
