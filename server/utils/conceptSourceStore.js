'use strict'

/**
 * @file The original PDFs behind an imported Strategy Planner concept.
 * @module server/utils/conceptSourceStore
 *
 * Item 15.20, Add Concept. Mike ruled on 2026-09-23 that the original PDF is KEPT, against the
 * version of the concept it produced, and on 2026-09-29 that it is kept in the database
 * (`strategy_concept_sources`, `config/db-migration-strategy-concept-sources.sql`). Nothing here
 * reads a PDF: the bytes arrive already checked by the route and converted by `pdfConvert.js`,
 * and they are only ever stored or deleted.
 *
 * 🔴 A FIRM'S OWN MATERIAL, WHICH CAN CARRY CLIENT NAMES. It is never sent to a model (Mike,
 * 2026-09-23), and every row goes when its concept is removed (`removeForConcept`).
 *
 * The dev fallback writes to a gitignored folder only when there is no database at all — never
 * because a live one refused (`dbFailure.devFallbackAllowed`), so a server without the
 * `max_allowed_packet` the migration names fails the save rather than landing on a disk.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { devFallbackAllowed } = require('./dbFailure')

const ROLES = ['teaching', 'response']

const DEV_DIR = path.resolve(__dirname, '../../data/dev-concept-sources')

function db () {
  return require('./db')
}

/**
 * A browser-supplied file name, made safe to store and show: no folder part, no control
 * characters, and never longer than the column.
 * @param {*} raw
 * @returns {string}
 */
function cleanFilename (raw) {
  const base = String(raw || '').split(/[\\/]/).pop()
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 255)
  return clean || 'document.pdf'
}

/** One dev folder per scope, named by a hash so a scope id's colons never reach a path. */
function devFolder (scopeId, conceptId) {
  const scope = crypto.createHash('sha256').update(String(scopeId)).digest('hex').slice(0, 16)
  return path.join(DEV_DIR, scope, String(conceptId).replace(/[^a-z0-9-]/gi, '_'))
}

/**
 * Keep the PDFs one concept version was built from.
 *
 * @param {string} scopeId - from the verified JWT, never a request body
 * @param {string} conceptId
 * @param {number} version
 * @param {Array<{role: string, position: number, filename: string, bytes: Buffer}>} files
 * @param {string} savedBy
 * @returns {Promise<void>}
 * @throws when a file is malformed, or a live database refuses the write
 */
async function saveSources (scopeId, conceptId, version, files, savedBy) {
  const rows = files.map((f) => {
    if (!ROLES.includes(f.role) || !Number.isInteger(f.position) || f.position < 1 || !Buffer.isBuffer(f.bytes)) {
      throw new Error('conceptSourceStore: malformed source file')
    }
    return {
      role: f.role,
      position: f.position,
      filename: cleanFilename(f.filename),
      bytes: f.bytes,
      sha256: crypto.createHash('sha256').update(f.bytes).digest('hex')
    }
  })

  try {
    const conn = await db().getConnection()
    try {
      await conn.beginTransaction()
      for (const r of rows) {
        await conn.execute(
          `INSERT INTO strategy_concept_sources
             (firm_id, concept_id, concept_version, role, position, filename, byte_size, sha256, pdf, saved_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [scopeId, conceptId, version, r.role, r.position, r.filename, r.bytes.length, r.sha256, r.bytes, savedBy]
        )
      }
      await conn.commit()
    } catch (err) {
      await conn.rollback().catch(() => {})
      throw err
    } finally {
      conn.release()
    }
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const dir = path.join(devFolder(scopeId, conceptId), 'v' + version)
    fs.mkdirSync(dir, { recursive: true })
    rows.forEach((r) => {
      fs.writeFileSync(path.join(dir, r.role + '-' + r.position + '.pdf'), r.bytes)
    })
  }
}

/**
 * Delete every PDF, every version, of one concept at one scope.
 *
 * @param {string} scopeId - from the verified JWT, never a request body
 * @param {string} conceptId
 * @returns {Promise<void>}
 * @throws when a live database refuses the delete
 */
async function removeForConcept (scopeId, conceptId) {
  try {
    await db().execute(
      'DELETE FROM strategy_concept_sources WHERE firm_id = ? AND concept_id = ?',
      [scopeId, conceptId]
    )
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    fs.rmdirSync(devFolder(scopeId, conceptId), { recursive: true })
  }
}

module.exports = { ROLES, cleanFilename, saveSources, removeForConcept }
