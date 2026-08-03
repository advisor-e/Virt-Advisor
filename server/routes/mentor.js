'use strict'

const { sendError } = require('../utils/sendError')
const caseStore = require('../utils/caseStore')
const overlay = require('../utils/firmOverlay')
const {
  loadPlatformDistinctions,
  savePlatformDistinctions
} = require('../utils/platformDistinctions')
// Stage D delete-promotion lives in firmManager (it owns the firm-distinction stores
// + dev fallbacks); reused here so a mentor delete preserves customising firms' rows.
// One-way dependency (firmManager never requires mentor) — no cycle.
const DOMAINS = require('../../data/domains.json')
const firmManager = require('./firmManager')

/**
 * Mentor routes — the cross-firm review surface. These deliberately cross the
 * firm boundary (every other case read is firm-scoped), so they are gated to the
 * mentor role at the mount (requireMentorRole) and only ever return cases a firm
 * manager explicitly approved for the mentor, in their anonymised form.
 */

// ── Advisory Distinctions — mentor authoring (the cascade ORIGIN) ──────────────
// The mentor authors the platform set the firm tier receives as its default and
// may then decline / override / extend (DISTINCTIONS-CASCADE-PLAN.md §6). Stored
// in the reserved global overlay scope via server/utils/platformDistinctions.js,
// so every reader (the advisor engine, the Firm Manager screen) sees the same set.
// At this tier there is no layer above, so rows are plain CRUD (no decline/override);
// changing a row's domain is just an edit. All gated firmAuth + requireMentorRole;
// the mentor set is global, so these handlers never read req.firmId.

// Built from data/domains.json (single source) so a new domain is automatically a
// valid distinction domain — no code change when a domain is added.
const DISTINCTION_DOMAINS = new Set(DOMAINS.map(d => d.id))

/**
 * Next stable platform id. Ids are `pd-N`; the next is max(N)+1 so an id is never
 * reused after a delete (a firm override may still reference a retired id — never
 * resurrect it onto a different row).
 * @param {Array} rows - the current platform set
 * @returns {string} e.g. 'pd-42'
 */
function _nextPlatformId (rows) {
  let max = 0
  for (const r of rows) {
    const m = /^pd-(\d+)$/.exec(String(r && r.id))
    if (m) { max = Math.max(max, parseInt(m[1], 10)) }
  }
  return `pd-${max + 1}`
}

/**
 * GET /api/mentor/distinctions — the mentor's full platform set.
 * @route GET /api/mentor/distinctions
 * @returns {200} { success: true, distinctions: object[] }
 */
async function listMentorDistinctions (req, res) {
  try {
    const rows = await loadPlatformDistinctions(overlay.loadFirmConfig)
    res.send(200, { success: true, distinctions: rows })
  } catch (err) {
    console.error('[mentor] listMentorDistinctions failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load distinctions')
  }
}

/**
 * POST /api/mentor/distinctions — author a new platform distinction.
 * @route POST /api/mentor/distinctions
 * @param {object} req.body - { domain, description, triggers[], templates[], boost }
 * @returns {201} { success: true, id: string }
 */
async function createMentorDistinction (req, res) {
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

  try {
    const existing = await loadPlatformDistinctions(overlay.loadFirmConfig)
    const id = _nextPlatformId(existing)
    const newRow = {
      id,
      domain,
      triggers: triggers.map(t => String(t).trim()).filter(Boolean),
      description: description.trim(),
      templates: templates.map(t => String(t).trim()).filter(Boolean),
      boost: Math.min(20, Math.max(1, Number(boost) || 5)),
      created_by: req.userEmail,
      created_at: new Date().toISOString()
    }
    await savePlatformDistinctions([...existing, newRow], overlay.saveFirmConfig, req.userEmail)
    res.send(201, { success: true, id })
  } catch (err) {
    console.error('[mentor] createMentorDistinction failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save distinction')
  }
}

/**
 * PUT /api/mentor/distinctions/:id — edit a platform distinction. The id is pinned
 * (firms' overrides reference it); changing the domain is allowed (a mentor-tier
 * move). Partial edits are accepted — only provided fields change.
 * @route PUT /api/mentor/distinctions/:id
 * @param {string} id - the platform distinction id (pd-N)
 * @returns {200} { success: true }
 */
async function updateMentorDistinction (req, res) {
  const id = String(req.params.id || '')
  const { domain, description, triggers, templates, boost } = req.body || {}

  if (domain !== undefined && !DISTINCTION_DOMAINS.has(domain)) {
    return sendError(res, 400, 'INVALID_DOMAIN', 'domain must be a recognised advisory domain')
  }
  if (description !== undefined && (typeof description !== 'string' || !description.trim())) {
    return sendError(res, 400, 'INVALID_DESCRIPTION', 'description must be a non-empty string')
  }
  if (triggers !== undefined && (!Array.isArray(triggers) || triggers.length === 0)) {
    return sendError(res, 400, 'INVALID_TRIGGERS', 'triggers must be a non-empty array of strings')
  }
  if (templates !== undefined && (!Array.isArray(templates) || templates.length === 0)) {
    return sendError(res, 400, 'INVALID_TEMPLATES', 'templates must be a non-empty array of strings')
  }

  try {
    const existing = await loadPlatformDistinctions(overlay.loadFirmConfig)
    const idx = existing.findIndex(r => r.id === id)
    if (idx === -1) {
      return sendError(res, 404, 'NOT_FOUND', 'No distinction with that id')
    }
    const updated = { ...existing[idx], id } // id stays pinned, never taken from body
    if (domain !== undefined) { updated.domain = domain }
    if (description !== undefined) { updated.description = description.trim() }
    if (triggers !== undefined) { updated.triggers = triggers.map(t => String(t).trim()).filter(Boolean) }
    if (templates !== undefined) { updated.templates = templates.map(t => String(t).trim()).filter(Boolean) }
    if (boost !== undefined) { updated.boost = Math.min(20, Math.max(1, Number(boost) || 5)) }
    updated.updated_by = req.userEmail
    updated.updated_at = new Date().toISOString()

    const newList = [...existing]
    newList[idx] = updated
    await savePlatformDistinctions(newList, overlay.saveFirmConfig, req.userEmail)
    res.send(200, { success: true })
  } catch (err) {
    console.error('[mentor] updateMentorDistinction failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save distinction')
  }
}

/**
 * DELETE /api/mentor/distinctions/:id — remove a platform distinction.
 * Stage D ("keep theirs", DISTINCTIONS-CASCADE-PLAN.md §6): before removing the
 * master row, any firm that CUSTOMISED it keeps its version as a standalone firm-own
 * row (promoteOverridesForDeletedRow), so a firm never loses its work because the
 * mentor deleted the original. Promotion runs FIRST — if it throws, the master row is
 * NOT removed (fail-safe; the firm edits are never stranded). Firms that only declined
 * the row need no action (the decline becomes inert); untouched firms lose the default.
 * @route DELETE /api/mentor/distinctions/:id
 * @param {string} id - the platform distinction id (pd-N)
 * @returns {200} { success: true, kept: string[] }  kept = firm ids whose version was preserved
 * @returns {500} DB_ERROR (nothing was done) · {500} PARTIAL_DELETE (some firms were
 *   already promoted before the failure — named in the message and the server log, and
 *   the master row is still present, so a repeat is safe)
 */
async function deleteMentorDistinction (req, res) {
  const id = String(req.params.id || '')
  try {
    const existing = await loadPlatformDistinctions(overlay.loadFirmConfig)
    const row = existing.find(r => r.id === id)
    if (!row) {
      return sendError(res, 404, 'NOT_FOUND', 'No distinction with that id')
    }
    // Keep-theirs promotion BEFORE the master is removed (it still holds the full row).
    const { promoted } = await firmManager.promoteOverridesForDeletedRow(row, req.userEmail)
    await savePlatformDistinctions(existing.filter(r => r.id !== id), overlay.saveFirmConfig, req.userEmail)
    res.send(200, { success: true, kept: promoted })
  } catch (err) {
    // A failure part-way through is NOT "nothing happened". By the time promotion
    // throws, some firms may already hold their kept copy and have had their override
    // dropped — and the old blanket message said the opposite, which is a statement
    // about the system that is not true. The master row is still there (it is removed
    // last, deliberately), so repeating the delete is safe and converges.
    const done = Array.isArray(err.promoted) ? err.promoted : []
    if (done.length > 0) {
      console.error(
        '[mentor] deleteMentorDistinction failed PART-WAY — the original was NOT removed; firms already holding their own copy:',
        done.join(', '), '—', err.message
      )
      sendError(res, 500, 'PARTIAL_DELETE',
        `The delete stopped part-way. ${done.length} firm(s) have already kept their own copy, and the original was NOT removed. Try again — repeating this is safe.`)
      return
    }
    console.error('[mentor] deleteMentorDistinction failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not delete distinction')
  }
}

/**
 * GET /api/mentor/cases — every mentor-shared case across all firms, anonymised
 * and advisor-stripped, most-recently-shared first. For the Mentor view, where
 * the mentor reviews real sessions to improve the app's accuracy.
 * @route GET /api/mentor/cases
 * @returns {200} { success: true, cases: object[] }
 * @returns {500} DB_ERROR
 */
async function listMentorCases (req, res) {
  try {
    const cases = await caseStore.listSharedWithMentor()
    res.send(200, { success: true, cases })
  } catch (err) {
    console.error('[mentor] listMentorCases failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load shared case studies')
  }
}

module.exports = {
  listMentorCases,
  listMentorDistinctions,
  createMentorDistinction,
  updateMentorDistinction,
  deleteMentorDistinction
}
