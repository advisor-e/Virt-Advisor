'use strict'

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
 *   Firm Profile
 *     GET  /api/firm-manager/profile              get firm profile
 *     PUT  /api/firm-manager/profile              update firm profile
 *
 *   Storage
 *     GET  /api/firm-manager/storage              get storage usage summary
 */

const fs = require('fs')
const formidable = require('formidable')
const { sendError } = require('../utils/sendError')
const drive = require('../services/driveService')
const overlay = require('../utils/firmOverlay')
const db = require('../utils/db')
const { STORAGE, DRIVE } = require('../../config/integration')

// ── Helpers ───────────────────────────────────────────────────────────────────

function categoryKeyFromValue (value) {
  return Object.keys(DRIVE.categories).find(k => DRIVE.categories[k] === value) || null
}

function validCategoryValues () {
  return Object.values(DRIVE.categories)
}

// ── Document Library ──────────────────────────────────────────────────────────

async function listDocuments (req, res, next) {
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
    return sendError(res, 500, 'DRIVE_ERROR', err.message)
  }
  return next()
}

async function uploadDocument (req, res, next) {
  const form = formidable({
    maxFileSize: STORAGE.maxFileSizeBytes,
    filter ({ mimetype }) {
      return STORAGE.allowedMimeTypes.includes(mimetype)
    }
  })

  let fields, files
  try {
    ;[fields, files] = await form.parse(req)
  } catch (err) {
    return sendError(res, 400, 'PARSE_ERROR', err.message)
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

  try {
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
    return sendError(res, 500, 'UPLOAD_ERROR', err.message)
  }
  return next()
}

async function downloadDocument (req, res, next) {
  const { fileId, fileName } = req.query
  if (!fileId) { return sendError(res, 400, 'NO_FILE_ID', 'fileId query param required') }
  try {
    const stream = await drive.downloadDocument(fileId)
    res.header('Content-Disposition',
      `attachment; filename="${(fileName || 'document.pdf').replace(/"/g, '')}"`)
    res.header('Content-Type', 'application/pdf')
    stream.pipe(res)
  } catch (err) {
    return sendError(res, 500, 'DOWNLOAD_ERROR', err.message)
  }
  return next()
}

async function deleteDocument (req, res, next) {
  const { fileId } = req.params
  if (!fileId) { return sendError(res, 400, 'NO_FILE_ID', 'fileId route param required') }

  // Confirm the file belongs to this firm before deleting
  const [rows] = await db.execute(
    'SELECT size_bytes FROM firm_documents WHERE drive_file_id = ? AND firm_id = ?',
    [fileId, req.firmId]
  )
  if (rows.length === 0) {
    return sendError(res, 404, 'NOT_FOUND', 'Document not found for this firm')
  }
  const sizeBytes = Number(rows[0].size_bytes)

  try {
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
    return sendError(res, 500, 'DELETE_ERROR', err.message)
  }
  return next()
}

// ── Decision Framework ────────────────────────────────────────────────────────

async function getFramework (req, res, next) {
  const { configKey } = req.query
  if (!configKey) { return sendError(res, 400, 'NO_CONFIG_KEY', 'configKey query param required') }
  try {
    const firmOverride = await overlay.loadFirmConfig(req.firmId, configKey)
    res.send(200, { configKey, firmOverride, hasOverride: firmOverride !== null })
  } catch (err) {
    return sendError(res, 500, 'DB_ERROR', err.message)
  }
  return next()
}

async function saveFramework (req, res, next) {
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
    return sendError(res, 500, 'DB_ERROR', err.message)
  }
  return next()
}

async function getFrameworkHistory (req, res, next) {
  const { configKey } = req.query
  if (!configKey) { return sendError(res, 400, 'NO_CONFIG_KEY', 'configKey query param required') }
  try {
    const history = await overlay.getVersionHistory(req.firmId, configKey)
    res.send(200, { history })
  } catch (err) {
    return sendError(res, 500, 'DB_ERROR', err.message)
  }
  return next()
}

async function restoreFramework (req, res, next) {
  const { configKey, versionId } = req.body || {}
  if (!configKey || !versionId) {
    return sendError(res, 400, 'MISSING_PARAMS', 'configKey and versionId are required')
  }
  try {
    const version = await overlay.restoreVersion(req.firmId, configKey, Number(versionId))
    res.send(200, { restored: true, version })
  } catch (err) {
    return sendError(res, 500, 'DB_ERROR', err.message)
  }
  return next()
}

// ── Videos ────────────────────────────────────────────────────────────────────

async function listVideos (req, res, next) {
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
    return sendError(res, 500, 'DB_ERROR', err.message)
  }
  return next()
}

async function addVideo (req, res, next) {
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
    return sendError(res, 500, 'DB_ERROR', err.message)
  }
  return next()
}

async function deleteVideo (req, res, next) {
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
    return sendError(res, 500, 'DB_ERROR', err.message)
  }
  return next()
}

// ── Firm Profile ──────────────────────────────────────────────────────────────

async function getProfile (req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, slug, logo_url, primary_colour, persona_name, created_at
       FROM firms WHERE id = ?`,
      [req.firmId]
    )
    if (rows.length === 0) { return sendError(res, 404, 'NOT_FOUND', 'Firm not found') }
    res.send(200, { firm: rows[0] })
  } catch (err) {
    return sendError(res, 500, 'DB_ERROR', err.message)
  }
  return next()
}

async function updateProfile (req, res, next) {
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
    return sendError(res, 500, 'DB_ERROR', err.message)
  }
  return next()
}

// ── Storage usage ─────────────────────────────────────────────────────────────

async function getStorageUsage (req, res, next) {
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
    return sendError(res, 500, 'DB_ERROR', err.message)
  }
  return next()
}

module.exports = {
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
  getStorageUsage
}
