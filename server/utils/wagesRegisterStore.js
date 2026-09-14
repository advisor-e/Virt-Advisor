'use strict'

/**
 * wagesRegisterStore — what one client's staff register holds, and where it is kept.
 *
 * @module server/utils/wagesRegisterStore
 *
 * Design: `design/mockups/wages-register.html`, approved by Mike 2026-09-15.
 *
 * STORAGE IS THE GATE'S OWN SEAM: one `firmOverlay` key per client,
 * `wages-register-rows:<clientId>`, so version history and restore come free and NO NEW
 * TABLE is needed — the same judgement `wagesRegisterGate.js` records for the switch. The
 * switch and the contents are separate keys deliberately: who opened a register and what it
 * says are different facts with different lifetimes, and Decision 8 puts the contents on a
 * retention dial while the switch record is the audit trail of a decision.
 *
 * 🔴 WHAT IS STORED IS ONLY WHAT THE ADVISOR TYPES HERE — accrued annual leave, years
 * employed, and the key-person-risk band, plus the firm's hours-in-a-leave-day. Name,
 * division and pay rate are NOT stored: they belong to step 1 of the model, and duplicating
 * them would let the register disagree with the model about who works there.
 *
 * 🔴 SICK LEAVE IS NOT STORED AND IS DISCARDED ON THE WAY IN. Mike, 2026-09-15: *"take it
 * off"*. `sanitise` names the fields it keeps, so a field nobody asked for cannot arrive by
 * being added to a request body.
 *
 * ⚠ ENTRIES ARE MATCHED TO PEOPLE BY `personKey` — `division|name|occurrence` — NOT by name.
 * Matching by name was the first build and it was wrong on the very first real data: see
 * `personKey` for what opening the screen found. Step 1's team is not yet persisted per client
 * (item 4.62), so the key is stable rather than permanent, and that limit is stated there.
 * The entry is NOT deleted when somebody leaves the team — silently destroying a record about
 * a person is worse than keeping one nobody is looking at, and Decision 8 governs how long it
 * lives.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('./firmOverlay')
const { devFallbackAllowed: IS_DEV } = require('./dbFailure')
const { BANDS } = require('./wagesRegisterMaths')

/** Dev-only stand-in for a machine with no MySQL — the affordance every store here carries. */
const DEV_FILE = 'data/dev-wages-register-rows.json'

/** The overlay key prefix. One row per client, separate from the switch's own key. */
const KEY_PREFIX = 'wages-register-rows:'

/** `firm_framework_versions.config_key` is VARCHAR(128); a longer id cannot be keyed. */
const MAX_CLIENT_ID = 64

/** A person's name, trimmed to what the record sensibly holds. */
const MAX_NAME = 128

/** A person's key: two names and an occurrence number, with room to spare. */
const MAX_KEY = 300

/** More than any real team, and a bound on what one request can write. */
const MAX_PEOPLE = 500

/** The range a firm may set for hours in a day's leave. */
const MIN_HOURS = 0.5
const MAX_HOURS = 24

function fail (code, message) {
  const e = new Error(message)
  e.code = code
  return e
}

/**
 * The firmOverlay key for one client's register contents.
 * @param {string} clientId
 * @returns {string}
 * @throws {Error} err.code 'BAD_CLIENT'
 */
function configKey (clientId) {
  const id = String(clientId || '')
  if (!id || id.length > MAX_CLIENT_ID || id.includes(':')) {
    throw fail('BAD_CLIENT', 'The client id cannot be used as a storage key.')
  }
  return KEY_PREFIX + id
}

/**
 * A finite number within bounds, or null. Used for every typed figure.
 * @param {*} value @param {number} min @param {number} max
 * @returns {number|null}
 */
function boundedNum (value, min, max) {
  if (value === null || value === undefined || value === '') { return null }
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < min || n > max) { return null }
  return n
}

/**
 * What the register accepts, and nothing else.
 *
 * 🔴 AN ALLOW-LIST, NOT A CLEAN-UP. Every field is named here; anything else in the body is
 * dropped without comment. That is what keeps sick leave, dates of birth and any future
 * addition out of a record about named employees — the register can only ever hold what Mike
 * ruled it holds.
 *
 * @param {object} payload - an untrusted request body
 * @returns {{hoursInLeaveDay: number|null, people: Array<object>}}
 */
function sanitise (payload) {
  const body = (payload && typeof payload === 'object') ? payload : {}
  const list = Array.isArray(body.people) ? body.people.slice(0, MAX_PEOPLE) : []
  const people = []
  list.forEach((entry) => {
    if (!entry || typeof entry !== 'object') { return }
    // 🔴 THE KEY IS WHAT IDENTIFIES AN ENTRY, NOT THE NAME. An entry with no key is dropped;
    // an entry with no NAME is kept, because the workbook's own sample team has four people
    // with no name at all and dropping them silently discarded whatever was typed against
    // them. See `personKey`.
    const key = String(entry.key || '').trim().slice(0, MAX_KEY)
    if (!key) { return }
    people.push({
      key,
      name: String(entry.name || '').trim().slice(0, MAX_NAME),
      accruedLeaveDays: boundedNum(entry.accruedLeaveDays, 0, 3650),
      yearsEmployed: boundedNum(entry.yearsEmployed, 0, 100),
      band: BANDS.includes(entry.band) ? entry.band : null
    })
  })
  return {
    hoursInLeaveDay: boundedNum(body.hoursInLeaveDay, MIN_HOURS, MAX_HOURS),
    people
  }
}

/**
 * A stable identity for one person on step 1's team: `division|name|occurrence`.
 *
 * 🔴 WHY NOT THE NAME, WHICH IS WHAT THIS USED TO BE. Opening the screen on 2026-09-15 found
 * the workbook's own sample team carries **Butch, Bono, Boris and Brad TWICE each, and four
 * people with no name at all**. Matching on name meant Vue rendered duplicate keys and
 * updated the wrong person's row as an advisor typed, and the two Butches collapsed into one
 * stored entry on save. On a register of named people that is the worst kind of wrong: the
 * leave balance of a real person, recorded against somebody else.
 *
 * ⚠ IT IS STABLE, NOT PERMANENT, and the difference is worth stating. The occurrence number
 * is counted over the team in its own order, so the key survives a reload and survives step
 * 1's division regrouping — but renaming somebody, or moving them between divisions,
 * separates them from their entry. A permanent identity needs step 1's team to be persisted
 * per client, which is item 4.62 and is not built. Nothing here pretends otherwise.
 *
 * Lower-cased so a capitalisation change is not a different person.
 *
 * @param {{name: string, division: string}} person
 * @param {Object<string, number>} seen - running occurrence tally, mutated
 * @returns {string}
 */
function personKey (person, seen) {
  const name = String((person && person.name) || '').trim().toLowerCase()
  const division = String((person && person.division) || '').trim().toLowerCase()
  const base = division + '|' + name
  seen[base] = (seen[base] || 0) + 1
  return (base + '|' + seen[base]).slice(0, MAX_KEY)
}

/** Dev-only: the whole `{ firmId: { clientId: row } }` map. */
function _readDevMap () {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), DEV_FILE), 'utf8'))
  } catch (_e) {
    return {}
  }
}

/** Dev-only: one client's stored register. */
function _readDev (firmId, clientId) {
  const firm = _readDevMap()[firmId]
  return (firm && Object.prototype.hasOwnProperty.call(firm, clientId)) ? firm[clientId] : null
}

/** Dev-only: write one client's register. */
function _writeDev (firmId, clientId, row) {
  const all = _readDevMap()
  if (!all[firmId]) { all[firmId] = {} }
  all[firmId][clientId] = row
  fs.writeFileSync(path.resolve(process.cwd(), DEV_FILE), JSON.stringify(all, null, 2))
}

/**
 * Read one client's register. An empty register is `{ hoursInLeaveDay: null, people: [] }`,
 * never null — the screen has the same shape whether anything has been typed or not.
 *
 * @param {string} firmId - the authenticated scope id, never client-supplied
 * @param {string} clientId - a client of that firm (the route checks it belongs)
 * @returns {Promise<{hoursInLeaveDay: number|null, people: Array, savedBy: string|null, savedAt: string|null}>}
 */
async function read (firmId, clientId) {
  // Outside the try: a BAD_CLIENT carries no sqlState and must never be mistaken for
  // "nothing answered" and served from a scratch file.
  const key = configKey(clientId)
  let stored
  try {
    stored = await overlay.loadFirmConfig(firmId, key)
  } catch (err) {
    if (!IS_DEV(err)) { throw err }
    stored = _readDev(firmId, clientId)
  }
  if (!stored || typeof stored !== 'object') {
    return { hoursInLeaveDay: null, people: [], savedBy: null, savedAt: null }
  }
  // Sanitised on the way OUT as well as in: a row written before a field was tightened, or
  // by hand into the dev file, cannot put a value on screen that the register would refuse.
  const clean = sanitise(stored)
  return {
    hoursInLeaveDay: clean.hoursInLeaveDay,
    people: clean.people,
    savedBy: stored.savedBy || null,
    savedAt: stored.savedAt || null
  }
}

/**
 * Write one client's register.
 *
 * @param {string} firmId - the authenticated scope id
 * @param {string} clientId - a client of that firm
 * @param {object} payload - the untrusted body; only named fields survive
 * @param {string|null} savedBy - the advisor's email, from the verified token
 * @returns {Promise<{hoursInLeaveDay: number|null, people: Array, savedBy: string|null, savedAt: string}>}
 */
async function save (firmId, clientId, payload, savedBy) {
  const key = configKey(clientId)
  const clean = sanitise(payload)
  const row = {
    hoursInLeaveDay: clean.hoursInLeaveDay,
    people: clean.people,
    savedBy: savedBy || null,
    savedAt: new Date().toISOString()
  }
  try {
    await overlay.saveFirmConfig(firmId, key, row, savedBy)
  } catch (err) {
    if (!IS_DEV(err)) { throw err }
    _writeDev(firmId, clientId, row)
  }
  return row
}

/**
 * Lay the stored entries over the team step 1 already holds.
 *
 * The team is the authority on WHO is on it; the register is the authority on what has been
 * typed ABOUT them. Matching is by name — see the file header for why, and for what that
 * costs. A person with no stored entry appears with empty fields, which is exactly right: it
 * is somebody nobody has filled in yet.
 *
 * @param {Array<{name: string, division: string, payRate: *}>} team - from step 1
 * @param {Array<{name: string, accruedLeaveDays: *, yearsEmployed: *, band: *}>} stored
 * @returns {Array<object>} one row per person on the TEAM, in the team's own order
 */
function merge (team, stored) {
  const byKey = {}
  ;(Array.isArray(stored) ? stored : []).forEach((entry) => {
    if (entry && entry.key) { byKey[entry.key] = entry }
  })
  const seen = {}
  return (Array.isArray(team) ? team : []).map((person) => {
    const key = personKey(person, seen)
    const entry = byKey[key] || {}
    return {
      key,
      name: String((person && person.name) || '').trim(),
      division: (person && person.division) || '',
      payRate: (person && person.payRate) === undefined ? null : person.payRate,
      accruedLeaveDays: entry.accruedLeaveDays === undefined ? null : entry.accruedLeaveDays,
      yearsEmployed: entry.yearsEmployed === undefined ? null : entry.yearsEmployed,
      band: entry.band === undefined ? null : entry.band
    }
  })
}

module.exports = {
  DEV_FILE,
  KEY_PREFIX,
  MIN_HOURS,
  MAX_HOURS,
  MAX_PEOPLE,
  configKey,
  personKey,
  sanitise,
  read,
  save,
  merge
}
