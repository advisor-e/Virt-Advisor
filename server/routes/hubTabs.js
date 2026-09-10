'use strict'

/**
 * Hub tab notification dots — Restify routes. Item 4.84, slice 1.
 *
 * The record behind the BLUE and ORANGE dots in the hub's left-hand menu: when this manager
 * last opened each tab. Asked for by Mike on 2026-09-10 — *"put the dots in the left hand
 * menu"*, *"every tab"* — and drawn at `design/mockups/hub-menu-dots.html`, approved to build
 * from with all four of its questions ruled the same day.
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId` FROM THE VERIFIED TOKEN, and keyed to `req.userEmail`
 * from the same place. Neither is ever read from a body or a query, so one manager cannot read
 * or clear another's dots and no scope can reach another scope's row. The only thing a caller
 * supplies is which tab they just opened, and that is validated by shape before it reaches a
 * key (`server/utils/hubTabOpened.js` explains why by shape and not against a list).
 *
 * 🔴 THIS STORES NOTHING ABOUT WHAT IS INSIDE A TAB — no content, no counts, no client data.
 * One timestamp per manager per tab, and the drawing says so on the screen where a manager can
 * read it.
 *
 * MANAGERS ONLY — `firmAuth` + `requireManagerRole`, wired in restify-server.js, at all four
 * tiers. There is no advisor-facing version: the dots are a manager's own reading history of a
 * manager's own hub.
 *
 * ⚠ RED IS NOT HERE. A red dot means something new arrived, which only a tab that knows what
 * "new" means for itself can raise — Compliance raises one from its own route today, and no
 * other tab does. These two routes answer the questions about time alone.
 *
 * ⚠ NOT BUILT HERE, and each is a later slice rather than an omission: the menu reading this
 * and painting the three dots (slice 2), and the legend and count at the foot of the menu
 * (slice 3).
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const {
  KEY_PREFIX,
  STALE_DAYS,
  isValidTabKey,
  managerKeyPrefix,
  tabOpenedKey,
  normaliseOpened
} = require('../utils/hubTabOpened')

/** The dev-JSON fallback, used only when there is no database to talk to. */
const DEV_FILE = path.resolve(__dirname, '../../data/dev-hub-tabs.json')

/**
 * Dev-only: every row for one manager in one scope, in the shape the overlay's prefix read
 * returns — `{ tabKey: value }`.
 *
 * The file is one flat `{ scopeId: { configKey: value } }` map, matching every other dev
 * fallback in this app, so the address has to be taken apart again on the way out.
 */
function devReadByPrefix (scopeId, keyPrefix) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    const forScope = all[scopeId]
    if (!forScope || typeof forScope !== 'object') { return {} }
    const out = {}
    Object.keys(forScope).forEach((key) => {
      if (key.indexOf(keyPrefix) !== 0) { return }
      const suffix = key.slice(keyPrefix.length)
      if (suffix) { out[suffix] = forScope[key] }
    })
    return out
  } catch (e) { return {} }
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
 * GET /api/firm-manager/hub-tabs/opened  (manager, all four tiers)
 *
 * When this manager last opened each hub tab, and the rule the orange dot is drawn from.
 *
 * ⚠ THE ANSWER IS TIMESTAMPS, NOT DOT COLOURS, and that is deliberate. Red is raised by the
 * individual tab, so no single route is in a position to say which colour wins; the menu holds
 * the precedence Mike ruled on — red beats blue beats orange — because the menu is the one
 * place that can see all three inputs at once.
 *
 * ⚠ `staleDays` TRAVELS WITH THE ANSWER rather than being written down again in a Vue file.
 * The number and the words beside the dot then cannot drift apart.
 *
 * A read failure is NOT an error to the caller: it answers with no history, every tab shows
 * blue, and the hub opens. A manager locked out of their own menu because a dot could not be
 * computed would be a far worse fault than a dot that is briefly wrong.
 *
 * @route GET /api/firm-manager/hub-tabs/opened
 * @returns {{opened: Object.<string, string>, staleDays: number}}
 */
async function getOpened (req, res) {
  const prefix = managerKeyPrefix(req.userEmail)
  if (prefix === null) {
    // No identity on the token — nobody to hold a reading history. Not an error: the menu
    // simply has no dots to paint.
    return res.send(200, { opened: {}, staleDays: STALE_DAYS })
  }

  try {
    let rows
    try {
      rows = await overlay.loadFirmConfigsByPrefix(req.firmId, prefix)
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
      rows = devReadByPrefix(req.firmId, prefix)
    }
    res.send(200, { opened: normaliseOpened(rows), staleDays: STALE_DAYS })
  } catch (err) {
    console.error('[hubTabs] could not read the opened record:', err.message)
    res.send(200, { opened: {}, staleDays: STALE_DAYS })
  }
}

/**
 * POST /api/firm-manager/hub-tabs/opened  (manager, all four tiers)
 *
 * Stamp one tab as opened, now, by this manager. Body: `{ tab: 'depreciationRates' }`.
 *
 * 🔴 THE TIME IS THE SERVER'S, never the body's. A client-supplied timestamp could hold a dot
 * off indefinitely by claiming a visit that never happened.
 *
 * ⚠ ONE ROW, ONE WRITER. The key carries this manager's own id, so two managers in one firm —
 * and one manager in two browser windows — never write the same row. See item 4.75.
 *
 * @route POST /api/firm-manager/hub-tabs/opened
 * @param {string} req.body.tab - the tab key, camelCase, as `NAV_GROUPS` names it
 * @returns {{opened: true, tab: string, at: string}}
 */
async function markOpened (req, res) {
  const tab = (req.body || {}).tab
  if (!isValidTabKey(tab)) {
    return sendError(res, 400, 'BAD_TAB', 'That is not a tab we can record')
  }

  const key = tabOpenedKey(req.userEmail, tab)
  if (key === null) {
    // Reachable when the token carries no user. Nothing to store against, and nothing is
    // broken for the caller — a manager we cannot identify simply has no reading history.
    return sendError(res, 403, 'NO_MANAGER', 'We could not tell who is reading this tab')
  }

  const record = { at: new Date().toISOString() }

  try {
    try {
      await overlay.saveFirmConfig(req.firmId, key, record, req.userEmail)
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
      devWrite(req.firmId, key, record)
    }
    res.send(200, { opened: true, tab, at: record.at })
  } catch (err) {
    console.error('[hubTabs] could not record an opened tab:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'We could not record that you opened this tab')
  }
}

module.exports = { getOpened, markOpened, KEY_PREFIX, DEV_FILE }
