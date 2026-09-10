'use strict'

/**
 * @file What a tier publishes about compliance, and what every tier beneath it receives.
 * @module server/utils/compliance
 *
 * Item 4.83, slice 1. Asked for by Mike on 2026-09-10, in his own words: *"i want these
 * compliance pages to show in the mentor, global manager, group manager and firm manager hubs
 * - again, cascading so that if I as a mentor, gets new information, I can share it downwards
 * but they can seek their own legal opinion and comply thereafter"*. The artefact is
 * `design/mockups/compliance-pages.html`, approved by him the same day with all nine of its
 * questions ruled.
 *
 * 🔴 A FIRM MAY NEITHER EDIT NOR HIDE WHAT A TIER ABOVE IT PUBLISHED — two separate rulings of
 * Mike's, 2026-09-10 (*"never edit ours"*, and hiding asked separately and refused). THIS IS A
 * DELIBERATE DEPARTURE FROM EVERY OTHER CASCADING BLOCK IN THIS APP, which offers accept /
 * edit / switch off / add, so a build reaching for the usual overlay shape will offer an edit
 * control by habit. It must not.
 *
 * The prohibition is STRUCTURAL rather than a check somebody remembered to write: a scope's
 * published items live under that scope's own overlay row, every write in
 * `server/routes/compliance.js` addresses `req.firmId` and nothing else, and a republish
 * refuses an id the caller does not already own. There is no code path that can reach a row
 * belonging to a tier above, so there is no flag to forget to test.
 *
 * The reasons, recorded so they are not re-argued. EDITING: a firm that changes our assessment
 * and later relies on the edited version has our name on words we did not write, and the record
 * no longer shows what we actually told them — the exposure the all-care basis exists to avoid.
 * HIDING: it would clear the item's dot, so the notification would defeat itself and a firm
 * could switch off the one signal telling them to read something new. A firm's OWN material
 * stays theirs; only what arrives from above is fixed.
 *
 * 🔴 ONLY THE FIRST DECLARATION GATES; A PUBLISHED UPDATE NOTIFIES AND SUSPENDS NOTHING. Mike's
 * ruling of 2026-09-10 — *"no, I publish an update - they get a notification such as a red dot
 * next to the topic"*. `newCountSince` below is that dot's whole arithmetic, and it is the only
 * consequence a later publication has. The gate itself is slice 3.
 *
 * ⚠ THIS RESOLVES TOP-DOWN AND KEEPS EVERY LAYER, where `firmOverlay.loadFirmConfig` would fold
 * them into one. That is the difference between this and a normal cascading key, and it is the
 * point: a firm reads a LIST of items each naming the tier that published it, so an item
 * published by a global group manager for one country sits beside the mentor's platform
 * material and is not overwritten by it. Nothing here is merged, so nothing here is lost.
 */

const { scopeChain, tierOfScope } = require('./tierChain')

/** The overlay address a scope's OWN published items are stored under, at every tier. */
const CONFIG_KEY = 'compliance-published'

/**
 * The overlay address a scope's declaration is stored under.
 *
 * ⚠ NOTHING WRITES THIS YET — the declaration and its gate are slice 3. It is named here, in
 * the file that owns the cascade, so that the dot's arithmetic and the declaration it counts
 * against have one home between them rather than two that can drift apart. Until slice 3 the
 * read returns null and every published item therefore counts as new, which is the correct
 * answer for a firm that has declared nothing.
 */
const DECLARATION_KEY = 'compliance-declaration'

/** Longest an item's title may be — one line on a list of documents. */
const MAX_TITLE = 120

/** Longest the sub-line under a title may be: what it is, when it was published, by whom. */
const MAX_SUMMARY = 300

/**
 * Longest the material itself may be.
 *
 * Sized against the real thing rather than guessed: `design/MEETING-REVIEW-DPIA.md` is the
 * first item this page will carry and is a little over 30,000 characters, so a cap that could
 * not hold it would be a cap that refuses the document the feature was built for.
 */
const MAX_BODY = 60000

/**
 * Most items one scope may publish.
 *
 * A limit rather than none, because a scope's whole set is read on every page load by every
 * tier beneath it; and generous, because the mentor accumulates platform material over years
 * and a firm meeting the cap is a support call, not a fault.
 */
const MAX_ITEMS = 100

/** The id prefix minted items carry. Scoped by the row they live on, so ids never collide. */
const ITEM_PREFIX = 'ci-'

/**
 * How each tier is named on screen when it is the one that published an item.
 *
 * 🔴 THE FOUR SETTLED NAMES, AND NOTHING ELSE IS EVER COINED FROM A BRAND OR A COUNTRY
 * (CLAUDE.md, and Mike's repeated ruling). `tierOfScope` returns the role value; this turns it
 * into the words a manager reads, in the second person the drawing uses.
 */
const TIER_LABELS = {
  mentor: 'the mentor',
  global_group_manager: 'your global group manager',
  group_manager: 'your group manager',
  firm_manager: 'your firm'
}

/**
 * A trimmed string of at most `cap` characters, or null when there is nothing usable.
 *
 * ⚠ TRUNCATES RATHER THAN REFUSING, matching `sourcedFigure.cleanText`, and that is right for
 * a title or a summary. The BODY is checked against its cap and REFUSED instead — see
 * `validateComplianceItems`. Silently docking the last third of a legal document is the one
 * place where truncation would destroy the thing being stored.
 *
 * @param {*} value
 * @param {number} cap
 * @returns {string|null}
 */
function text (value, cap) {
  if (typeof value !== 'string') { return null }
  const t = value.trim()
  return t ? t.slice(0, cap) : null
}

/**
 * Validate one scope's OWN published items — the whole stored value at one tier.
 *
 * The shape is `{ <itemId>: { title, summary, body, version, publishedAt, publishedBy } }`.
 * A map rather than an array so a republish addresses one item by id without rewriting the
 * set, which is what stops two managers publishing at once from losing each other's item.
 *
 * A malformed item is DROPPED with an error recorded rather than taking the whole set down:
 * one unreadable row must not make a firm's entire compliance pack vanish from its screen.
 * The caller decides whether to refuse the write (`ok === false`) or to show what survived.
 *
 * @param {*} value - the candidate object, from a request body or the store.
 * @returns {{ok: boolean, errors: string[], value: object}} `value` holds only the items that
 *   validated, and is meaningful whether or not `ok` is true.
 */
function validateComplianceItems (value) {
  const errors = []
  if (value === null || value === undefined) { return { ok: true, errors, value: {} } }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['Compliance items must be a non-array JSON object'], value: {} }
  }

  const clean = {}
  const ids = Object.keys(value)

  if (ids.length > MAX_ITEMS) {
    errors.push(`A scope may publish at most ${MAX_ITEMS} compliance items`)
    return { ok: false, errors, value: {} }
  }

  ids.forEach((id) => {
    const where = `item ${id}`
    const item = value[id]
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${where} must be a non-array JSON object`)
      return
    }

    const title = text(item.title, MAX_TITLE)
    if (title === null) {
      errors.push(`${where}.title is required — a published item needs a name a manager can read`)
      return
    }

    // The material itself. Refused rather than truncated: see `text` above.
    if (typeof item.body !== 'string' || !item.body.trim()) {
      errors.push(`${where}.body is required — an item with no material in it publishes nothing`)
      return
    }
    if (item.body.length > MAX_BODY) {
      errors.push(`${where}.body is longer than the ${MAX_BODY}-character limit`)
      return
    }

    const publishedAt = typeof item.publishedAt === 'string' ? item.publishedAt.trim() : ''
    if (!publishedAt || Number.isNaN(Date.parse(publishedAt))) {
      errors.push(`${where}.publishedAt must be the date it was published`)
      return
    }

    // Who published it — taken from the verified token by the route, never from a body.
    const publishedBy = text(item.publishedBy, MAX_TITLE)
    if (publishedBy === null) {
      errors.push(`${where}.publishedBy must name the manager who published it`)
      return
    }

    const version = Number(item.version)
    if (!Number.isFinite(version) || version < 1 || Math.floor(version) !== version) {
      errors.push(`${where}.version must be a whole number from 1 up`)
      return
    }

    clean[id] = {
      title,
      summary: text(item.summary, MAX_SUMMARY) || '',
      body: item.body,
      version,
      publishedAt,
      publishedBy
    }
  })

  return { ok: errors.length === 0, errors, value: clean }
}

/**
 * The next free item id on a scope's own row.
 *
 * Counts from the highest number already present rather than from the size of the set, so an
 * id is never reused after an item is replaced — a reused id would silently reattach one
 * item's publication history to another.
 *
 * @param {object} own - this scope's own validated items, `{ id: item }`
 * @returns {string}
 */
function nextItemId (own) {
  let highest = 0
  Object.keys(own || {}).forEach((id) => {
    if (id.indexOf(ITEM_PREFIX) !== 0) { return }
    const n = Number(id.slice(ITEM_PREFIX.length))
    if (Number.isFinite(n) && n > highest) { highest = n }
  })
  return ITEM_PREFIX + (highest + 1)
}

/**
 * Everything published TO a scope, newest first, each item naming the tier that published it.
 *
 * Walks `scopeChain` from the mentor down to the scope itself and KEEPS every layer — see this
 * file's header for why nothing here is merged. An item published by the scope itself is
 * flagged `isOwn`, which is the only thing the screen needs in order to offer a republish
 * control on one item and not on another.
 *
 * @param {string|null} scopeId - the scope to resolve for, taken from the verified JWT and
 *   NEVER from a request body — a body-supplied id would let one firm read another's material
 *   (`tier-cascade.md` P6).
 * @param {function(string, string): Promise<Object|null>} readConfig - the overlay reader,
 *   injected rather than imported so tests need no database.
 * @returns {Promise<Array<object>>} each item with `ref`, `originTier`, `originTierLabel`,
 *   `originScopeId` and `isOwn` added. NEVER REJECTS: one unreachable tier costs that tier's
 *   items and no more, because a compliance page that fails whole tells a firm nothing at all.
 */
async function resolveComplianceItems (scopeId, readConfig) {
  if (!scopeId) { return [] }

  const chain = scopeChain(scopeId)
  const out = []

  for (let i = 0; i < chain.length; i++) {
    const at = chain[i]
    let stored = null
    try {
      stored = await readConfig(at, CONFIG_KEY)
    } catch (err) {
      // One unreachable tier must not lose the tiers already collected, and must not stop the
      // ones below it being asked.
      console.error('[compliance] scope read failed:', err.message)
      continue
    }

    // `ok` is deliberately ignored: a malformed item is dropped by the validator and the rest
    // of that tier's pack is still shown. A firm losing its whole compliance page over one bad
    // row is the worse failure by a distance.
    const { value } = validateComplianceItems(stored)
    const tier = tierOfScope(at)

    Object.keys(value).forEach((id) => {
      out.push({
        ...value[id],
        id,
        ref: at + '/' + id,
        originTier: tier,
        originTierLabel: TIER_LABELS[tier] || '',
        originScopeId: at,
        isOwn: at === scopeId
      })
    })
  }

  // Newest first, as the drawing lists them. A tie keeps the tier order the chain gave, so two
  // items published the same instant read mentor-first rather than in an order nobody chose.
  return out.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
}

/**
 * How many published items are NEW — the whole arithmetic behind the red dot.
 *
 * 🔴 NEW MEANS "PUBLISHED SINCE YOU LAST DECLARED", which is Mike's own wording of 2026-09-10
 * and not "since you last looked". A firm that opens the page and reads nothing has not
 * declared anything, so the dot stays — the dot tracks the declaration, and only recording one
 * clears it.
 *
 * ⚠ A SCOPE'S OWN ITEMS DO NOT COUNT. Publishing something to the tiers beneath you does not
 * notify you of your own publication.
 *
 * With no declaration recorded — every firm, until slice 3 — every inherited item is new. That
 * is the correct answer rather than a placeholder: a firm that has declared nothing has read
 * nothing as far as this app can know.
 *
 * @param {Array<object>} items - the resolved list from `resolveComplianceItems`
 * @param {string|null} declaredAt - ISO date of the scope's last declaration, or null
 * @returns {number}
 */
function newCountSince (items, declaredAt) {
  const list = Array.isArray(items) ? items : []
  const since = declaredAt ? Date.parse(declaredAt) : NaN

  return list.filter((item) => {
    if (item.isOwn) { return false }
    if (Number.isNaN(since)) { return true }
    const at = Date.parse(item.publishedAt)
    return Number.isNaN(at) ? true : at > since
  }).length
}

module.exports = {
  CONFIG_KEY,
  DECLARATION_KEY,
  MAX_TITLE,
  MAX_SUMMARY,
  MAX_BODY,
  MAX_ITEMS,
  ITEM_PREFIX,
  TIER_LABELS,
  validateComplianceItems,
  nextItemId,
  resolveComplianceItems,
  newCountSince
}
