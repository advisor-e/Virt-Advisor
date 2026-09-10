'use strict'

/**
 * @file The documents one scope has loaded, and what the model read out of each — the
 *   PROPOSALS, which reach no forecast and never can.
 * @module server/utils/depreciationProposals
 *
 * Item 4.78, slice 3. The approved rates live in `depreciationRates.js` and its store; this
 * is the other side of the same feature and they are deliberately two stores.
 *
 * 🔴 WHY A PROPOSAL CANNOT LIVE IN THE APPROVED STORE. That store's own header states it
 * holds APPROVED TABLES ONLY: a country entry that cannot name its approver and the date
 * fails validation and is dropped by the resolver. That is what makes "nothing unapproved
 * reaches a forecast" structural rather than a flag somebody has to remember to test (P1,
 * FR-008). A pending proposal kept in the same store would need a flag, and the guarantee
 * would go with it. So a proposal lives here, in a store the RESOLVER NEVER READS.
 *
 * ⚠ WHAT IS KEPT, AND WHAT IS NOT. The document's name, its publication date, its country,
 * who loaded it and when, and what was read out of it. NOT THE FILE ITSELF: the PDF is sent
 * to the model, read, and discarded. Keeping firm-uploaded binaries would need a storage
 * home this feature does not have, and keeping none removes path traversal, storage limits
 * and a deletion policy from the attack surface entirely. A manager who needs the document
 * again has it — it is published on their tax authority's website.
 *
 * ⚠ A REFUSED READ IS RECORDED, NOT DISCARDED. A document the model could not read is kept
 * with status `unreadable`, because a manager who loaded three files needs to see which one
 * failed. It proposes nothing, exactly as a rejected one does.
 *
 * Node 14, CommonJS.
 */

const crypto = require('crypto')
const { CATEGORY_KEYS, normaliseCountry, publishedKey } = require('./depreciationRates')
// One number, one home: the reading applies this cap and the store holds it to the same one.
const { MAX_CLASSES, MAX_UNRESOLVED } = require('./depreciationExtract')

/** The overlay address these records are stored under, at every tier. */
const CONFIG_KEY = 'depreciation-proposals'

/**
 * Where a loaded document has got to.
 *   `pending`    — read, proposing rates, waiting for a manager
 *   `approved`   — a manager approved a table from it
 *   `rejected`   — a manager threw the proposal away
 *   `unreadable` — the model could not read it; it proposes nothing
 */
const STATUSES = ['pending', 'approved', 'rejected', 'unreadable']

/**
 * How many documents one scope keeps. Old records are dropped from the end, newest first.
 *
 * A cap rather than unlimited history because this whole object is read on every manager
 * screen load, and because the record that matters is the APPROVED table's own version
 * history — which the overlay keeps separately and which a dropped proposal cannot touch.
 */
const MAX_DOCUMENTS = 20

/** Longest a document name or file name may be, in characters. Matches the rate store's cap. */
const MAX_LABEL = 120

/** A new document id. Random rather than sequential: an id is quoted in a URL by the screen. */
function newDocumentId () {
  return crypto.randomBytes(12).toString('hex')
}

/** Trimmed text within a cap, or '' for anything that is not usable text. */
function text (value, cap) {
  if (typeof value !== 'string') { return '' }
  return value.trim().slice(0, cap || MAX_LABEL)
}

/**
 * Validates one stored document record.
 *
 * Written as strictly as the rate store's own validation and for the same reason: this
 * object goes out to a screen and its `categories` are what a manager approves. A record
 * that cannot be trusted is dropped rather than repaired — a repaired record is a record
 * nobody chose.
 *
 * @param {*} value
 * @param {string[]} errors - collected in place
 * @param {string} where - for the error message
 * @returns {object|null} the cleaned record, or null when it was refused
 */
function cleanDocument (value, errors, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(where + ' must be a non-array JSON object')
    return null
  }

  const id = text(value.id, 64)
  if (!id) { errors.push(where + '.id is required'); return null }

  const country = normaliseCountry(value.country)
  if (country === null) {
    errors.push(where + '.country must be a two-letter code, such as NZ')
    return null
  }

  const status = STATUSES.includes(value.status) ? value.status : null
  if (status === null) {
    errors.push(where + '.status must be one of: ' + STATUSES.join(', '))
    return null
  }

  const filename = text(value.filename)
  if (!filename) { errors.push(where + '.filename is required'); return null }

  const loadedAt = text(value.loadedAt, 40)
  if (!loadedAt || Number.isNaN(Date.parse(loadedAt))) {
    errors.push(where + '.loadedAt must be the date the document was loaded')
    return null
  }

  // An unreadable document names no publication date, because nothing was read out of it.
  const published = text(value.published, 20)
  if (published && publishedKey(published) === null) {
    errors.push(where + '.published must be a date like 2023-10 or 2023-10-31')
    return null
  }

  const categories = {}
  const raw = value.categories
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    Object.keys(raw).forEach((key) => {
      if (CATEGORY_KEYS.includes(key)) { categories[key] = raw[key] }
    })
  }

  const unmatched = Array.isArray(value.unmatched)
    ? value.unmatched.filter(k => CATEGORY_KEYS.includes(k))
    : CATEGORY_KEYS.filter(k => !categories[k])

  // The document's own published classes, which the manager's screen offers when the model
  // matched a category to the wrong one. Held as the reading left them — an entry a manager
  // actually picks is validated by `validateDepreciationRates` on the way into the approved
  // table, which is the gate that matters and the only one a stored figure passes through.
  const classes = Array.isArray(value.classes)
    ? value.classes
      .filter(c => c && typeof c === 'object' && !Array.isArray(c) && text(c.label))
      .slice(0, MAX_CLASSES)
    : []

  // The entries the document could not settle — held as the reading left them. They carry no
  // rate and no category, so nothing validates them further: they exist to be READ by a person
  // against the document (prompt section 3, Mike's ruling of 2026-09-11).
  const unresolved = Array.isArray(value.unresolved)
    ? value.unresolved
      .filter(u => u && typeof u === 'object' && !Array.isArray(u) && text(u.label))
      .slice(0, MAX_UNRESOLVED)
    : []

  const refused = Number(value.refusedRows)

  return {
    id,
    filename,
    documentName: text(value.documentName) || filename,
    country,
    published: published || null,
    loadedBy: text(value.loadedBy),
    loadedAt,
    status,
    firstYearRuleFound: value.firstYearRuleFound === true,
    categories,
    unmatched,
    classes,
    unresolved,
    refusedRows: Number.isFinite(refused) && refused > 0 ? Math.floor(refused) : 0,
    decidedBy: text(value.decidedBy),
    decidedAt: text(value.decidedAt, 40) || null
  }
}

/**
 * Validates a scope's whole stored value.
 *
 * @param {*} value - `{ documents: [...] }`, from the store or a request
 * @returns {{ok: boolean, errors: string[], value: {documents: object[]}}}
 */
function validateProposals (value) {
  const errors = []
  if (value === null || value === undefined) { return { ok: true, errors: [], value: { documents: [] } } }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['proposals must be a non-array JSON object'], value: { documents: [] } }
  }

  const list = Array.isArray(value.documents) ? value.documents : []
  const documents = []
  list.forEach((one, i) => {
    const cleaned = cleanDocument(one, errors, 'documents[' + i + ']')
    // A single bad record does not lose the rest: the others are a manager's real work, and
    // the errors are returned so a caller can log what was dropped.
    if (cleaned !== null) { documents.push(cleaned) }
  })

  return { ok: errors.length === 0, errors, value: { documents } }
}

/**
 * The record for one read, in the store's shape.
 *
 * @param {object} opts
 * @param {string} opts.filename
 * @param {string} opts.country
 * @param {string} opts.loadedBy - from the verified token, never a body
 * @param {object|null} opts.reading - from `depreciationExtract.validateReading`, or null
 * @param {string} [opts.status] - defaults to `pending`, or `unreadable` with no reading
 * @param {Date} [opts.now]
 * @returns {object}
 */
function documentRecord (opts) {
  const now = opts.now || new Date()
  const reading = opts.reading || null
  return {
    id: newDocumentId(),
    filename: text(opts.filename) || 'document.pdf',
    documentName: reading ? reading.document : (text(opts.filename) || 'document.pdf'),
    country: normaliseCountry(opts.country),
    published: reading ? reading.published : null,
    loadedBy: text(opts.loadedBy),
    loadedAt: now.toISOString(),
    status: opts.status || (reading ? 'pending' : 'unreadable'),
    firstYearRuleFound: Boolean(reading && reading.firstYearRuleFound),
    categories: reading ? reading.categories : {},
    unmatched: reading ? reading.unmatched : CATEGORY_KEYS.slice(),
    classes: reading && Array.isArray(reading.classes) ? reading.classes : [],
    unresolved: reading && Array.isArray(reading.unresolved) ? reading.unresolved : [],
    refusedRows: reading ? reading.refusedRows : 0,
    decidedBy: '',
    decidedAt: null
  }
}

/**
 * This scope's records with one added at the front, capped.
 *
 * ⚠ A NEW DOCUMENT NEVER REPLACES AN EXISTING ONE — Mike's drawing says so in as many
 * words: *"a second document never replaces the first, it is read alongside it"* (FR-001).
 *
 * @param {object} store - `{ documents: [...] }`
 * @param {object} record
 * @returns {{documents: object[]}} a new object; the input is not mutated
 */
function addDocument (store, record) {
  const existing = (store && Array.isArray(store.documents)) ? store.documents : []
  return { documents: [record].concat(existing).slice(0, MAX_DOCUMENTS) }
}

/**
 * @param {object} store
 * @param {string} id
 * @returns {object|null}
 */
function findDocument (store, id) {
  const list = (store && Array.isArray(store.documents)) ? store.documents : []
  return list.filter(d => d.id === id)[0] || null
}

/**
 * This scope's records with one document's status changed.
 *
 * @param {object} store
 * @param {string} id
 * @param {string} status - one of `STATUSES`
 * @param {string} by - from the verified token
 * @param {Date} [now]
 * @returns {{documents: object[]}} a new object; the input is not mutated
 */
function setStatus (store, id, status, by, now) {
  const list = (store && Array.isArray(store.documents)) ? store.documents : []
  const at = (now || new Date()).toISOString()
  return {
    documents: list.map((d) => {
      if (d.id !== id) { return d }
      return Object.assign({}, d, { status, decidedBy: text(by), decidedAt: at })
    })
  }
}

module.exports = {
  CONFIG_KEY,
  STATUSES,
  MAX_DOCUMENTS,
  MAX_LABEL,
  newDocumentId,
  cleanDocument,
  validateProposals,
  documentRecord,
  addDocument,
  findDocument,
  setStatus
}
