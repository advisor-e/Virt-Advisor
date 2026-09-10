'use strict'

/**
 * @file When a manager last opened each hub tab — the record behind the BLUE and ORANGE
 * notification dots in the hub's left-hand menu. Item 4.84, slice 1.
 * @module server/utils/hubTabOpened
 *
 * Design: `design/mockups/hub-menu-dots.html`, drawn 2026-09-10 and approved to build from,
 * with all four of its questions ruled by Mike the same day. Asked for in his own words:
 * *"they get a notification such as a red dot next to the topic"*, *"we could also add the
 * blue and orange - never opened and not opened in 3 weeks"*, *"put the dots in the left hand
 * menu"*, *"every tab"*.
 *
 * 🔴 RED NEEDS NOTHING IN THIS FILE, AND THAT IS THE DESIGN. Red means *something new arrived*,
 * and only a tab that knows what "new" means for itself can raise one — Compliance does
 * (material published by the tier above since this firm last declared) and no other tab does.
 * This module answers the two questions that are about TIME ALONE: has this person ever opened
 * this tab, and how long ago. That split is why Compliance could ship its own red dot on
 * 2026-09-10 without waiting for this.
 *
 * 🔴 ONE ROW PER MANAGER PER TAB — never one row holding every tab. A manager with the hub open
 * in two browser windows would otherwise read the whole map, change their own entry and write
 * the map back, and the second write would land without the first's change. That is item 4.75's
 * lost-update fault, and a row per tab gives every row exactly one writer, so there is no lost
 * write to detect. Mike's ruling of 2026-09-10, recorded as ruling (7) on the Compliance
 * drawing.
 *
 * ⚠ THE MANAGER IS IDENTIFIED BY THE EMAIL ON THEIR VERIFIED TOKEN, and the alternative was
 * rejected for a stated reason. `req.advisorId` is the stabler identifier where it exists, but
 * it is **null on the mentor and both middle-tier tokens** (`server/middleware/firmAuth.js`),
 * so keying on it would give three of the four hubs no dots at all. Email is on every token
 * (the claim, or `sub`). The cost is that a manager whose email changes sees their dots go blue
 * once — cosmetic, self-healing, and cheaper than a feature that silently does nothing at three
 * tiers. `compliance.js` identifies a signer the same way.
 *
 * ⚠ NO LIST OF TAB KEYS LIVES HERE, DELIBERATELY. The tabs are `NAV_GROUPS` in
 * `components/FirmManagerHub.vue` and a second copy on the backend is a copy that drifts — the
 * exact fault the single-source rule exists to end. A submitted key is validated by SHAPE
 * instead. That is enough for what the validation is actually for: the manager's own id is
 * server-side, so a rogue value can only ever address a row inside that manager's own prefix,
 * never another person's. What shape validation buys is a bound on the garbage.
 *
 * Node 14, CommonJS.
 */

/**
 * The config-key prefix every one of these rows lives under.
 *
 * 🔴 A KEY PREFIX, NOT A KEY. The address is `hub-tab-opened:<manager email>:<tab key>` —
 * build one with `tabOpenedKey`, never by hand.
 */
const KEY_PREFIX = 'hub-tab-opened'

/** What separates the three parts of a key. Matches the reserved scope ids (`__global__:<brand>`). */
const KEY_SEPARATOR = ':'

/**
 * How long a tab may go unopened before its dot turns orange.
 *
 * 🔴 21 DAYS IS MIKE'S "3 WEEKS", and it is the number the Handbook has used since it was
 * built (`STALE_DAYS` in `scripts/handbook-shell.html`). It lives here, on the backend, and
 * travels to the screen in the API answer, so the rule and the words beside the dot —
 * *"Not opened in 3 weeks"* — can never disagree.
 */
const STALE_DAYS = 21

/**
 * The most email characters that reach a config key.
 *
 * `config_key` is `VARCHAR(128)` (`config/db-schema.sql`). The arithmetic, so nobody has to
 * redo it: 14 (prefix) + 1 + 64 (email) + 1 + 40 (tab) = 120, with room to spare. 64 is also
 * what `activity.js` truncates an identifier to, so one identifier is not held to two lengths
 * in one app.
 */
const MAX_MANAGER_ID_LENGTH = 64

/** The most tab-key characters that reach a config key. See the arithmetic above. */
const MAX_TAB_KEY_LENGTH = 40

/**
 * What a tab key may look like: the camelCase identifiers `NAV_GROUPS` uses.
 *
 * ⚠ SHAPE, NOT MEMBERSHIP — see the file header. Notably this admits no `:`, so a submitted
 * value can never add a part to the key and address something other than one tab of one
 * manager.
 */
const TAB_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*$/

/**
 * Is this a tab key we are willing to store?
 *
 * @param {*} tab
 * @returns {boolean}
 */
function isValidTabKey (tab) {
  return typeof tab === 'string' &&
    tab.length > 0 &&
    tab.length <= MAX_TAB_KEY_LENGTH &&
    TAB_KEY_PATTERN.test(tab)
}

/**
 * The prefix ONE manager's rows share — what the whole set is read back with in one query.
 *
 * @param {*} managerId - the email from the verified token, never a body
 * @returns {string|null} null when there is nobody to key on
 */
function managerKeyPrefix (managerId) {
  const id = typeof managerId === 'string' ? managerId.trim() : ''
  if (!id) { return null }
  return KEY_PREFIX + KEY_SEPARATOR + id.slice(0, MAX_MANAGER_ID_LENGTH) + KEY_SEPARATOR
}

/**
 * The config key ONE manager's record for ONE tab lives at.
 *
 * @param {*} managerId - the email from the verified token, never a body
 * @param {*} tab - a tab key, validated by shape
 * @returns {string|null} null when either part is unusable — the caller refuses, never guesses
 */
function tabOpenedKey (managerId, tab) {
  const prefix = managerKeyPrefix(managerId)
  if (prefix === null || !isValidTabKey(tab)) { return null }
  return prefix + tab
}

/**
 * The stored timestamp inside one row, or null when the row cannot be trusted.
 *
 * A row that is missing, malformed or holds an unparseable date reads as **never opened**,
 * which shows a blue dot. That is the safe direction: the worst a bad row can do is invite
 * somebody to look at a tab they have already seen.
 *
 * @param {*} stored - one row's parsed JSON
 * @returns {string|null} an ISO timestamp
 */
function readOpenedAt (stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return null }
  const at = stored.at
  if (typeof at !== 'string' || !at) { return null }
  const ms = Date.parse(at)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

/**
 * Every tab this manager has opened, as `{ tabKey: ISO timestamp }`.
 *
 * Takes what `firmOverlay.loadFirmConfigsByPrefix` returns — the part of each key AFTER the
 * prefix, mapped to its value — and drops anything unusable rather than letting one bad row
 * cost the whole menu its dots.
 *
 * @param {Object.<string, *>} bySuffix
 * @returns {Object.<string, string>}
 */
function normaliseOpened (bySuffix) {
  const out = {}
  if (!bySuffix || typeof bySuffix !== 'object') { return out }
  Object.keys(bySuffix).forEach((tab) => {
    if (!isValidTabKey(tab)) { return }
    const at = readOpenedAt(bySuffix[tab])
    if (at !== null) { out[tab] = at }
  })
  return out
}

module.exports = {
  KEY_PREFIX,
  KEY_SEPARATOR,
  STALE_DAYS,
  MAX_MANAGER_ID_LENGTH,
  MAX_TAB_KEY_LENGTH,
  isValidTabKey,
  managerKeyPrefix,
  tabOpenedKey,
  readOpenedAt,
  normaliseOpened
}
