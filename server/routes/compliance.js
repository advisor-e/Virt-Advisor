'use strict'

/**
 * Compliance — Restify routes. Item 4.83, slice 1.
 *
 * What a tier publishes about compliance, and what every tier beneath it receives. Asked for
 * by Mike on 2026-09-10 naming all four manager tiers himself; the artefact is
 * `design/mockups/compliance-pages.html`, approved the same day.
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT, and every WRITE
 * addresses that scope's own row and no other. This is what makes Mike's two rulings of
 * 2026-09-10 — a firm may neither EDIT nor HIDE what a tier above it published — structural
 * rather than a check somebody remembered to write. There is no code path here that can reach
 * another scope's row, so no request can edit one, and nothing stores a per-firm "hidden" flag
 * for a request to set.
 *
 * 🔴 AND `publishedBy` IS TAKEN FROM THE VERIFIED TOKEN, NEVER FROM THE BODY. It is the name
 * beside a compliance statement that a firm relies on; a body-supplied publisher would let
 * anyone with the route sign somebody else's name to it.
 *
 * MANAGERS ONLY — `firmAuth` + `requireManagerRole`, wired in restify-server.js, at all four
 * tiers. There is no advisor-facing read here: compliance is a firm's obligation rather than an
 * individual advisor's (the drawing, "Which tiers get this, and why"). The one screen an
 * advisor meets is the locked state on `/meeting-record`, which is slice 3.
 *
 * Persistence rides the same `firmOverlay` store as the rest of the config (`config_key`
 * `'compliance-published'`), so version history and restore come for free. A dev-JSON fallback
 * keeps it usable before the MySQL table is provisioned.
 *
 * ⚠ NOT BUILT HERE, and each is a later slice rather than an omission: the firm's own evidence
 * pack (slice 2), the declaration and the gate it puts on Meeting Review (slice 3), and the
 * completeness check with the mentor's roll-up (slice 4). `newCount` below already counts
 * against the declaration slice 3 will write, so nothing about the dot changes when it lands.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { tierOfScope } = require('../utils/tierChain')
const {
  CONFIG_KEY,
  DECLARATION_KEY,
  MAX_TITLE,
  MAX_SUMMARY,
  MAX_BODY,
  MAX_ITEMS,
  validateComplianceItems,
  nextItemId,
  resolveComplianceItems,
  newCountSince
} = require('../utils/compliance')

/** The dev-JSON fallback, used only when there is no database to talk to. */
const DEV_FILE = path.resolve(__dirname, '../../data/dev-compliance.json')

/** Dev-only: one scope's stored value for one key from the JSON fallback, or null. */
function devRead (scopeId, key) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    const own = all[scopeId] && all[scopeId][key]
    return (own && typeof own === 'object' && !Array.isArray(own)) ? own : null
  } catch (e) { return null }
}

/** Dev-only: persist one scope's value for one key to the JSON fallback. */
function devWrite (scopeId, key, value) {
  let all = {}
  try { all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (e) { all = {} }
  if (!all[scopeId] || typeof all[scopeId] !== 'object') { all[scopeId] = {} }
  all[scopeId][key] = value
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
}

/**
 * The overlay reader the resolver walks the tier chain with, falling back to the dev file so
 * the cascade behaves the same way with and without a database.
 *
 * @param {string} scopeId
 * @param {string} key
 * @returns {Promise<object|null>}
 */
async function readScopeConfig (scopeId, key) {
  try {
    return await overlay.loadFirmConfig(scopeId, key)
  } catch (err) {
    if (devFallbackAllowed(err)) { return devRead(scopeId, key) }
    throw err
  }
}

/** This scope's OWN published items, validated, or {} when it has none we can use. */
async function ownItems (scopeId) {
  const stored = await readScopeConfig(scopeId, CONFIG_KEY)
  const { value } = validateComplianceItems(stored)
  return value
}

/** Write this scope's own items, through the overlay or the dev file. */
async function writeItems (scopeId, items, userEmail) {
  try {
    await overlay.saveFirmConfig(scopeId, CONFIG_KEY, items, userEmail)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(scopeId, CONFIG_KEY, items)
  }
}

/**
 * When this scope last recorded its declaration, or null.
 *
 * ⚠ NOTHING WRITES THIS YET — slice 3 does. It is read here so the red dot counts against the
 * declaration from the day it lands, rather than counting against nothing and then changing
 * meaning underneath a manager who had got used to it.
 *
 * @param {string} scopeId
 * @returns {Promise<string|null>}
 */
async function declaredAtFor (scopeId) {
  const stored = await readScopeConfig(scopeId, DECLARATION_KEY)
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return null }
  const at = typeof stored.declaredAt === 'string' ? stored.declaredAt.trim() : ''
  return at && !Number.isNaN(Date.parse(at)) ? at : null
}

/**
 * GET /api/firm-manager/compliance  (manager, all four tiers)
 *
 * Everything published TO this scope, newest first, each item naming the tier that published
 * it, plus how many are new since this scope last declared.
 *
 * The screen splits the one list on `isOwn` rather than being handed two: an item is either
 * this scope's own — republishable — or it came from above and is read-only, and that is one
 * fact rather than two lists that could disagree.
 *
 * ⚠ THE FIELD LIMITS TRAVEL WITH THE ANSWER rather than being written down again on the screen.
 * The store is the only place that decides how long a title or a document may be, and a second
 * copy in a Vue file is a copy that drifts — the fault the single-source rule exists to end.
 *
 * @route GET /api/firm-manager/compliance
 * @returns {{items: Array<object>, newCount: number, declaredAt: string|null, tier: string,
 *   limits: {title: number, summary: number, body: number}}}
 */
async function getForManager (req, res) {
  try {
    const items = await resolveComplianceItems(req.firmId, readScopeConfig)
    const declaredAt = await declaredAtFor(req.firmId)
    res.send(200, {
      items,
      newCount: newCountSince(items, declaredAt),
      declaredAt,
      tier: tierOfScope(req.firmId),
      limits: { title: MAX_TITLE, summary: MAX_SUMMARY, body: MAX_BODY }
    })
  } catch (err) {
    console.error('[compliance] read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the compliance material')
  }
}

/**
 * POST /api/firm-manager/compliance  (manager, all four tiers)
 *
 * Publish a new item, or republish one this scope already owns as a new version.
 *
 * 🔴 AN `id` THE CALLER DOES NOT ALREADY OWN IS REFUSED, and that refusal is the enforcement of
 * Mike's *"never edit ours"*. Without it a firm could pass the id of an item the mentor
 * published and quietly mint its own version of it. The check is against this scope's OWN row
 * — not against the resolved list, which contains every tier above.
 *
 * ⚠ REPUBLISHING BUMPS THE VERSION AND RESETS `publishedAt`, so every tier beneath sees the
 * item as new again and its dot returns. That is the notification working as ruled, not a side
 * effect: an item worth republishing is an item worth re-reading.
 *
 * @route POST /api/firm-manager/compliance
 * @param {object} req.body - `{ title, summary, body, id? }` — `id` republishes an own item
 * @returns {{published: true, id: string, items: Array<object>, newCount: number}}
 */
async function publish (req, res) {
  const body = req.body || {}

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) {
    return sendError(res, 400, 'MISSING_TITLE', 'A title is required')
  }
  if (typeof body.body !== 'string' || !body.body.trim()) {
    return sendError(res, 400, 'MISSING_BODY', 'The material itself is required')
  }
  if (body.body.length > MAX_BODY) {
    return sendError(res, 400, 'BODY_TOO_LONG',
      `The material is longer than the ${MAX_BODY}-character limit`)
  }

  try {
    const mine = await ownItems(req.firmId)

    let id = typeof body.id === 'string' ? body.id.trim() : ''
    let version = 1
    if (id) {
      // See the note above: this is what stops a tier republishing another tier's item.
      if (!Object.prototype.hasOwnProperty.call(mine, id)) {
        return sendError(res, 404, 'NOT_YOURS',
          'That item was published by a tier above you and cannot be changed here')
      }
      version = Number(mine[id].version) + 1
    } else {
      if (Object.keys(mine).length >= MAX_ITEMS) {
        return sendError(res, 400, 'TOO_MANY_ITEMS',
          `A scope may publish at most ${MAX_ITEMS} compliance items`)
      }
      id = nextItemId(mine)
    }

    const next = Object.assign({}, mine, {
      [id]: {
        title,
        summary: typeof body.summary === 'string' ? body.summary : '',
        body: body.body,
        version,
        publishedAt: new Date().toISOString(),
        // From the verified token, never the body — see this file's header.
        publishedBy: req.userEmail || ''
      }
    })

    const { ok, errors } = validateComplianceItems(next)
    if (!ok) {
      return sendError(res, 400, 'INVALID_ITEM', errors.join('; '))
    }

    await writeItems(req.firmId, next, req.userEmail)

    const items = await resolveComplianceItems(req.firmId, readScopeConfig)
    const declaredAt = await declaredAtFor(req.firmId)
    res.send(200, { published: true, id, items, newCount: newCountSince(items, declaredAt) })
  } catch (err) {
    console.error('[compliance] publish failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not publish that item')
  }
}

/**
 * GET /api/firm-manager/compliance/history  (manager)
 * @route GET /api/firm-manager/compliance/history
 * @returns {{history: Array<object>}} every saved version of THIS scope's own published set.
 */
async function history (req, res) {
  try {
    const rows = await overlay.getVersionHistory(req.firmId, CONFIG_KEY)
    res.send(200, { history: rows })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[compliance] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/firm-manager/compliance/restore  (manager)
 *
 * ⚠ RESTORES THIS SCOPE'S OWN SET ONLY, which is the same boundary every other route here
 * keeps. A tier cannot restore a version of a tier above it, because it has never held one.
 *
 * @route POST /api/firm-manager/compliance/restore
 * @param {object} req.body - `{ versionId: number }`
 * @returns {{restored: true, items: Array<object>, newCount: number}}
 */
async function restore (req, res) {
  const versionId = req.body && req.body.versionId
  if (!versionId) {
    return sendError(res, 400, 'MISSING_VERSION', 'versionId is required')
  }
  try {
    await overlay.restoreVersion(req.firmId, CONFIG_KEY, Number(versionId))
    const items = await resolveComplianceItems(req.firmId, readScopeConfig)
    const declaredAt = await declaredAtFor(req.firmId)
    res.send(200, { restored: true, items, newCount: newCountSince(items, declaredAt) })
  } catch (err) {
    console.error('[compliance] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = {
  getForManager,
  publish,
  history,
  restore,
  readScopeConfig
}
