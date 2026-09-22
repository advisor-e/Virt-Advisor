'use strict'

/**
 * salesListsStore — the dropdown values behind the Sales Tracker screens
 * (item 17 stage 4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THERE IS NO `va_sales_lists` TABLE
 * ─────────────────────────────────────────────────────────────────────────────
 * The source app has an `appconfig` table storing `list:<key>` → JSON, and stage 1
 * deliberately did NOT create it:
 *
 *     appconfig ⛔ dropped — We already have `firm_framework_versions`. Theirs is
 *     `list:<key>` → JSON deduped in app code; ours dedupes in the database *and*
 *     brings version history and restore free.
 *     (features/sales-tracker.md §10 stage 1)
 *
 * So a list is a firm config under the `sales-tracker-list:` prefix, and this
 * module is a thin, typed wrapper over `firmOverlay`. Three things come free and
 * none of them was written here: the firm cascade, a full version history, and
 * restore-to-a-previous-version.
 *
 * ⚠ THE SOURCE APP DEDUPES IN JAVASCRIPT AND THAT IS A BUG, not a style choice.
 * Its read (`server/api/lists/index.get.js`) fetches every `list:` row ordered by
 * `updatedAt` and then keeps the newest per key in a Map — because its upsert is
 * keyed on `(userId, configKey)`, so EVERY USER WHO EDITS A LIST CREATES THEIR OWN
 * ROW. A firm with three managers has three rows per list and reads whichever was
 * saved last. `firmOverlay` keys on the firm, so the row is the firm's.
 *
 * 🔴 DEFAULTS ARE THE FLOOR, NEVER THE STORED VALUE. A list a firm has never
 * touched returns the default below and writes nothing. That matters because a
 * dropdown that silently empties takes its screen with it: a firm cannot delete
 * `prospectStatus` and leave the pipeline unusable, because the default is what
 * answers when nothing is stored.
 */

const { loadFirmConfig, saveFirmConfig, getVersionHistory, restoreVersion } = require('./firmOverlay')

/** Every list key ships with its config under this prefix. */
const KEY_PREFIX = 'sales-tracker-list:'

/**
 * The ten lists, their labels, and the values a firm starts with.
 *
 * Ported from `server/api/lists/index.get.js` — the items are the source app's
 * verbatim, because they are the values already in use in the spreadsheets these
 * screens replace. `prospectStatus`'s five values in particular are load-bearing:
 * `salesMetrics.teamSummary` counts on those exact strings, and its own
 * STATUS_COLUMNS pins them.
 *
 * `colors` exists on one list only, as in the source.
 */
const DEFAULT_LISTS = {
  partner: {
    name: 'Partner',
    description: 'Partners responsible for client relationships',
    items: []
  },
  leadStaff: {
    name: 'Lead Staff (Client Manager)',
    description: 'Staff members who manage client accounts',
    items: []
  },
  prospectStatus: {
    name: 'Prospect Status',
    description: 'Status options for tracking prospect lifecycle',
    items: ['Active', 'Await Research', 'Completed', 'Dead', 'On Hold'],
    colors: {
      Active: '#dcfce7',
      'Await Research': '#dbeafe',
      Completed: '#f0fdf4',
      Dead: '#fee2e2',
      'On Hold': '#fef3c7'
    }
  },
  relationshipType: {
    name: 'Relationship Type',
    description: 'Type of business relationship with prospect',
    items: ['Existing Client', 'New Prospect']
  },
  prospectSource: {
    name: 'Prospect Source',
    description: 'How the prospect was acquired',
    items: ['Social Media', 'Web Enquiry', 'Walk-In', 'Phone-In', 'Referral', 'Cold Target', 'Networking', "Pers' Relations"]
  },
  approachStyle: {
    name: 'Approach Style',
    description: 'Method used to approach the prospect',
    items: ['Direct Contact', 'Pre Approach - Single', 'Pre Approach - Sequence', 'Pre Approach Gift', 'Group Positioning', 'Quiz Link Sent']
  },
  salesStyle: {
    name: 'Sales Style',
    description: 'Sales methodology being applied',
    items: ['Campaign', 'Total Needs']
  },
  totalNeedsStage: {
    name: 'Total Needs Stage',
    description: 'Stage in the Total Needs sales process',
    items: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5']
  },
  meetingTheme: {
    name: 'Meeting Theme',
    description: 'Theme or focus of sales meetings',
    items: ['Discovery', 'Presentation', 'Proposal Review', 'Follow Up', 'Closing']
  },
  industry: {
    name: 'Industry',
    description: 'Common industries for prospects and COIs',
    items: ['Accounting', 'Legal', 'Finance', 'Real Estate', 'Insurance', 'Healthcare', 'Technology', 'Manufacturing', 'Retail', 'Construction', 'Education', 'Hospitality', 'Earthmoving', 'Other']
  }
}

/** The list keys a caller may name. Anything else is refused by the route. */
const LIST_KEYS = Object.keys(DEFAULT_LISTS)

/** Caps, so one firm cannot store a list that no screen can render. */
const MAX_ITEMS = 200
const MAX_ITEM_LENGTH = 120

/**
 * Is this a key we know? Used by the route before it touches the store.
 * @param {*} key
 * @returns {boolean}
 */
function isKnownKey (key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(DEFAULT_LISTS, key)
}

/** The config key one list is stored under. */
function configKeyFor (key) {
  return `${KEY_PREFIX}${key}`
}

/**
 * Merge a stored value over its default.
 *
 * The NAME and DESCRIPTION are always the default's — a firm edits the values in
 * a list, not what the list is. Only `items` and `colors` are a firm's to set,
 * and a stored value of the wrong shape falls back rather than reaching a screen.
 *
 * @param {string} key
 * @param {*} stored - whatever came out of firmOverlay, trusted for nothing
 * @returns {object} the list as a screen reads it
 */
function mergeOverDefault (key, stored) {
  const base = DEFAULT_LISTS[key]
  const out = {
    key,
    name: base.name,
    description: base.description,
    items: base.items.slice(),
    isCustomised: false
  }
  if (base.colors) { out.colors = Object.assign({}, base.colors) }

  if (stored && typeof stored === 'object') {
    if (Array.isArray(stored.items)) {
      out.items = stored.items.filter(i => typeof i === 'string')
      out.isCustomised = true
    }
    if (stored.colors && typeof stored.colors === 'object' && !Array.isArray(stored.colors)) {
      out.colors = Object.assign({}, base.colors || {}, stored.colors)
    }
  }
  return out
}

/**
 * Every list for a firm, defaults filled in for any the firm has not customised.
 *
 * Reads are per key rather than by prefix so a list is always present in the
 * result: a screen builds ten dropdowns and must never be handed nine.
 *
 * @param {string} firmId - the authenticated scope id, never client-supplied
 * @returns {Promise<Object.<string, object>>} key → list
 */
async function getLists (firmId) {
  const out = {}
  for (const key of LIST_KEYS) {
    let stored = null
    try {
      stored = await loadFirmConfig(firmId, configKeyFor(key))
    } catch (err) {
      // One unreadable list must not take the other nine down with it — the
      // screen still needs its dropdowns. The default stands in and the failure
      // is logged, never silently swallowed.
      console.error(`[salesListsStore] could not load '${key}' for firm ${firmId}:`, err.message)
    }
    out[key] = mergeOverDefault(key, stored)
  }
  return out
}

/**
 * One list, defaults filled in.
 * @param {string} firmId
 * @param {string} key
 * @returns {Promise<object|null>} null when the key is not one of the ten
 */
async function getList (firmId, key) {
  if (!isKnownKey(key)) { return null }
  const stored = await loadFirmConfig(firmId, configKeyFor(key))
  return mergeOverDefault(key, stored)
}

/**
 * Normalise items on the way in: strings only, trimmed, blanks dropped,
 * duplicates removed (first wins, so the firm's own order is kept), each capped
 * in length and the list capped in size.
 *
 * @param {*} items
 * @returns {{ value?: string[], error?: string }}
 */
function normaliseItems (items) {
  if (!Array.isArray(items)) { return { error: 'A list must be an array of text values' } }
  const seen = new Set()
  const out = []
  for (const raw of items) {
    if (typeof raw !== 'string') { return { error: 'Every value in a list must be text' } }
    const v = raw.trim().slice(0, MAX_ITEM_LENGTH)
    if (!v) { continue }
    if (seen.has(v)) { continue }
    seen.add(v)
    out.push(v)
  }
  if (out.length > MAX_ITEMS) { return { error: `A list cannot hold more than ${MAX_ITEMS} values` } }
  return { value: out }
}

/**
 * Save one list for a firm. Version history is `firmOverlay`'s and is written by
 * it — every save is recoverable, which is the whole reason stage 1 chose this
 * store over the source app's table.
 *
 * @param {string} firmId - the authenticated scope id, never client-supplied
 * @param {string} key - one of LIST_KEYS
 * @param {{items: string[], colors?: object}} payload
 * @param {string} savedBy - the advisor id from the verified JWT, for the history row
 * @returns {Promise<object>} the saved list, as a screen reads it
 */
async function saveList (firmId, key, payload, savedBy) {
  if (!isKnownKey(key)) { throw new Error(`unknown list key: ${key}`) }
  const value = { items: payload.items }
  if (payload.colors && typeof payload.colors === 'object' && !Array.isArray(payload.colors)) {
    value.colors = payload.colors
  }
  await saveFirmConfig(firmId, configKeyFor(key), value, savedBy)
  return mergeOverDefault(key, value)
}

/**
 * The saved versions of one list, newest first — `firmOverlay`'s history.
 * @param {string} firmId
 * @param {string} key
 * @returns {Promise<object[]>}
 */
function historyFor (firmId, key) {
  if (!isKnownKey(key)) { return Promise.reject(new Error(`unknown list key: ${key}`)) }
  return getVersionHistory(firmId, configKeyFor(key))
}

/**
 * Put one list back to an earlier saved version.
 *
 * `firmOverlay.restoreVersion` takes no "who" — it stamps the new row `'restore'`
 * itself, so a restore is distinguishable from an ordinary save in the history.
 * @param {string} firmId
 * @param {string} key
 * @param {number|string} versionId
 * @returns {Promise<object>} the restored list
 */
async function restoreList (firmId, key, versionId) {
  if (!isKnownKey(key)) { throw new Error(`unknown list key: ${key}`) }
  await restoreVersion(firmId, configKeyFor(key), versionId)
  return getList(firmId, key)
}

module.exports = {
  getLists,
  getList,
  saveList,
  historyFor,
  restoreList,
  normaliseItems,
  isKnownKey,
  configKeyFor,
  mergeOverDefault,
  DEFAULT_LISTS,
  LIST_KEYS,
  KEY_PREFIX,
  MAX_ITEMS,
  MAX_ITEM_LENGTH
}
