'use strict'

/**
 * @file The Stats NZ benchmarker's routes (item 4.70 stage 3, Brief P9): the mentor's
 *   upload of a new release, its summary, and the industry finder every advisor uses.
 * @module server/routes/benchmarker
 *
 * WHO MAY DO WHAT, and why:
 *   - UPLOAD and SUMMARY (`/api/firm-manager/benchmarker`) — the MENTOR alone
 *     (`firmAuth` + `requireMentorRole`, wired in restify-server.js). The benchmarker is one
 *     national table replaced each release; a firm has no different Stats NZ, so no tier
 *     below the mentor stores one. The upload is stored at the PLATFORM scope through the
 *     overlay store, so version history and restore come for free.
 *   - FINDER and INDUSTRY (`/api/report/benchmarker/…`) — any signed-in user, a client
 *     included (`firmOrEntityAuth`): a client reading their saved report needs the same
 *     industry names. Nothing here is a firm's own data.
 *
 * THE UPLOAD IS TWO FILES, READ BY COLUMN NAME AND REFUSED BY NAME. Stats NZ's two CSVs
 * arrive as multipart fields `ratios` and `financial`; the reader validates both before
 * anything is stored, and a refusal names the column it missed. A file too large for the
 * limit below is refused before it is read — the 2025 release is 1.3 MB across both.
 *
 * A dev-JSON fallback keeps the upload usable before the MySQL table is provisioned, as
 * the thresholds and the ladder have.
 */

const fs = require('fs')
const path = require('path')
const { formidable } = require('formidable')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { readBenchmarker, findIndustries, BANDS } = require('../report/benchmarks/statsNzBenchmarker')
const { CONFIG_KEY, PLATFORM_SCOPE, BASE_BENCHMARKER, loadBenchmarker, summaryOf } = require('../utils/benchmarkerStore')

const DEV_FILE = path.resolve(__dirname, '../../data/dev-statsnz-benchmarker.json')
/** Each CSV may be this large; the 2025 ratios file is 0.9 MB. */
const MAX_FILE_BYTES = 8 * 1024 * 1024

/** Dev-only: the platform's stored dataset from the JSON fallback, or null. */
function devRead () {
  try { return JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (e) { return null }
}

/** Dev-only: persist the platform's dataset to the JSON fallback. */
function devWrite (value) {
  fs.writeFileSync(DEV_FILE, JSON.stringify(value))
}

/**
 * The overlay reader the store loads with, falling back to the dev file so a developer
 * machine behaves as UAT does.
 * @param {string} scopeId @param {string} key
 * @returns {Promise<object|null>}
 */
async function readPlatformConfig (scopeId, key) {
  try {
    return await overlay.loadFirmConfig(scopeId, key)
  } catch (err) {
    if (devFallbackAllowed(err)) { return devRead() }
    throw err
  }
}

/** The formidable parse as a promise (v2 is callback-style). */
function parseForm (form, req) {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => { if (err) { reject(err) } else { resolve([fields, files]) } })
  })
}

/** One uploaded file's text, or null when the field is absent. */
function textOf (files, field) {
  const f = files && files[field]
  const one = Array.isArray(f) ? f[0] : f
  if (!one || !one.filepath) { return null }
  return fs.readFileSync(one.filepath, 'utf8')
}

/**
 * GET /api/firm-manager/benchmarker  (mentor)
 * @route GET /api/firm-manager/benchmarker
 * @returns {{dataset: {source, year, provisional, counts}, uploaded: boolean}} the release in
 *   force, and whether it is an upload or the shipped file.
 */
async function summary (req, res) {
  try {
    const stored = await readPlatformConfig(PLATFORM_SCOPE, CONFIG_KEY)
    const dataset = await loadBenchmarker(readPlatformConfig)
    res.send(200, { dataset: summaryOf(dataset), uploaded: Boolean(stored) && dataset !== BASE_BENCHMARKER })
  } catch (err) {
    console.error('[benchmarker] summary failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the benchmarker')
  }
}

/**
 * POST /api/firm-manager/benchmarker  (mentor) — multipart: `ratios`, `financial`.
 *
 * Reads both files, refuses either by the column it lacks, and stores the dataset as a new
 * version at the platform scope. Nothing is stored until both files read cleanly.
 *
 * @route POST /api/firm-manager/benchmarker
 * @returns {{saved: true, dataset: {source, year, provisional, counts}}}
 */
async function upload (req, res) {
  let files
  try {
    const form = formidable({ maxFileSize: MAX_FILE_BYTES, maxFiles: 2, keepExtensions: false })
    ;[, files] = await parseForm(form, req)
  } catch (err) {
    return sendError(res, 400, 'UPLOAD_REJECTED', 'The upload could not be read; each file must be under 8 MB')
  }
  const ratiosCsv = textOf(files, 'ratios')
  const financialCsv = textOf(files, 'financial')
  if (ratiosCsv === null || financialCsv === null) {
    return sendError(res, 400, 'TWO_FILES_REQUIRED', 'Both Stats NZ files are needed: the benchmark ratios file and the financial file')
  }
  const { ok, errors, dataset } = readBenchmarker({ ratiosCsv, financialCsv })
  if (!ok) { return sendError(res, 400, 'BENCHMARKER_REJECTED', errors.join('; ')) }
  try {
    try {
      await overlay.saveFirmConfig(PLATFORM_SCOPE, CONFIG_KEY, dataset, req.userEmail)
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
      devWrite(dataset)
    }
    res.send(200, { saved: true, dataset: summaryOf(dataset) })
  } catch (err) {
    console.error('[benchmarker] save failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save the benchmarker')
  }
}

/**
 * GET /api/report/benchmarker/industries?q=  (firmOrEntityAuth)
 * @route GET /api/report/benchmarker/industries
 * @param {string} req.query.q - two characters or more of a name or code.
 * @returns {{year: number, matches: Array<{code, name, division, benchmarks, accuracy}>}}
 */
async function industries (req, res) {
  try {
    const dataset = await loadBenchmarker(readPlatformConfig)
    const q = req.query && typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : ''
    res.send(200, { year: dataset.year, matches: findIndustries(dataset, q, 12) })
  } catch (err) {
    console.error('[benchmarker] finder failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not search the industries')
  }
}

/**
 * GET /api/report/benchmarker/industries/:code  (firmOrEntityAuth)
 * @route GET /api/report/benchmarker/industries/:code
 * @returns {{industry: {code, name, division, benchmarks, accuracy, counts, bands}, bands: string[], year: number}}
 */
async function industry (req, res) {
  try {
    const dataset = await loadBenchmarker(readPlatformConfig)
    const code = String((req.params && req.params.code) || '').toUpperCase().slice(0, 12)
    const ind = dataset.industries[code]
    if (!ind) { return sendError(res, 404, 'NOT_FOUND', 'No industry with that code') }
    // The ratio table is the comparison's, not the finder's: the page gets it through the pages route.
    const rest = Object.assign({}, ind)
    delete rest.ratios
    res.send(200, { industry: rest, bands: BANDS, year: dataset.year, provisional: dataset.provisional })
  } catch (err) {
    console.error('[benchmarker] industry read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the industry')
  }
}

/**
 * GET /api/firm-manager/benchmarker/history  (mentor)
 * @route GET /api/firm-manager/benchmarker/history
 * @returns {{history: Array<object>}} every release ever uploaded, newest first.
 */
async function history (req, res) {
  try {
    const rows = await overlay.getVersionHistory(PLATFORM_SCOPE, CONFIG_KEY)
    res.send(200, { history: rows })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[benchmarker] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the release history')
  }
}

/**
 * POST /api/firm-manager/benchmarker/restore  (mentor)
 * @route POST /api/firm-manager/benchmarker/restore
 * @param {object} req.body - `{ versionId: number }`
 * @returns {{restored: true, dataset: {source, year, provisional, counts}}}
 */
async function restore (req, res) {
  const versionId = req.body && req.body.versionId
  if (!versionId) { return sendError(res, 400, 'MISSING_VERSION', 'versionId is required') }
  try {
    await overlay.restoreVersion(PLATFORM_SCOPE, CONFIG_KEY, Number(versionId))
    const dataset = await loadBenchmarker(readPlatformConfig)
    res.send(200, { restored: true, dataset: summaryOf(dataset) })
  } catch (err) {
    console.error('[benchmarker] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that release')
  }
}

module.exports = { summary, upload, industries, industry, history, restore, readPlatformConfig }
