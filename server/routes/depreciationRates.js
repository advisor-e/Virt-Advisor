'use strict'

/**
 * Depreciation rates per country — Restify routes.
 *
 * Item 4.78, slices 2 and 3. The rates a client's forecast writes assets down at, read from that
 * client's own tax authority's documents and approved by a firm manager before anything uses
 * them. Design: `design/features/depreciation-rates.md`;
 * `specs/001-depreciation-rates-per-country/spec.md`.
 *
 * Access is asymmetric, exactly as the property tax rules and the trend thresholds are:
 *   - READ  (`get`)      — any signed-in user (`firmAuth`). Every advisor building a
 *     forecast needs it, so it must never require a manager role and must never break the
 *     forecast: on any failure it degrades to the app's own six rates. Mike's ruling of
 *     2026-09-08, in his words: *"Never block the advisor."*
 *   - MANAGE (`getForManager` / `approveRates` / `approveFirstYearRule` / `history` /
 *     `restore`, and slice 3's `loadDocument` / `listDocuments` / `approveDocument` /
 *     `rejectDocument`) — managers only (`firmAuth` + the managing-tier guard, wired in
 *     restify-server.js).
 *
 * ⚠ LOADING A DOCUMENT IS MANAGER-ONLY TODAY, AND THAT IS THE SLICE RATHER THAN THE RULING.
 * Mike settled on 2026-09-08 that an ADVISOR may load a document and only a manager may
 * approve one (FR-017). The advisor's half is its own screen and its own drawing
 * (`design/mockups/depreciation-rates-advisor.html`) and is not built. Until it is, the
 * loading routes sit behind the manager guard — which is the safe direction to be wrong in.
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler here
 * reads a scope from a body or a query, so one firm can never read or write another's tables
 * (`tier-cascade.md` P6).
 *
 * 🔴 AND `approvedBy` IS TAKEN FROM THE VERIFIED TOKEN, NEVER FROM THE BODY. It is the name
 * that appears beside a rate on a document a lender reads; a body-supplied approver would let
 * anyone with the route sign somebody else's name to a tax table.
 *
 * 🔴 TWO APPROVE ROUTES, NOT ONE, AND THAT IS THE RULING RATHER THAN A CONVENIENCE. Mike,
 * 2026-09-09: a first-year rule gets its own Approve, separate from the rates'. Two routes
 * make that structural — approving a rate table cannot adopt a tax scheme as a side effect,
 * because the handler that writes rates never touches `firstYearRule` and vice versa. A
 * single route with a flag would have put that guarantee in a caller's hands.
 *
 * Persistence rides the same `firmOverlay` store as the rest of the config (`config_key`
 * `'depreciation-rates'`), so version history and restore come for free. A dev-JSON fallback
 * keeps it usable before the MySQL table is provisioned.
 */

const fs = require('fs')
const path = require('path')
// formidable is pinned to v2.1.2 — the last v2 release before it required Node > 14.15.
// Both v2 and v3 expose the factory as a named export, so this destructure works on either.
// Same import and same reasoning as `routes/firmManager.js`, which uploads firm documents.
const { formidable } = require('formidable')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { parentScopeOf } = require('../utils/tierChain')
const {
  BASE_DEPRECIATION_RATES,
  CONFIG_KEY,
  normaliseCountry,
  validateDepreciationRates,
  loadResolvedDepreciationRates
} = require('../utils/depreciationRates')
const extract = require('../utils/depreciationExtract')
const proposals = require('../utils/depreciationProposals')

/**
 * The dev-JSON fallback, one file per config key.
 *
 * Keyed rather than a single path because this file now stores two different things — the
 * APPROVED tables and the PENDING proposals — and they are two stores on purpose (see
 * `depreciationProposals.js`). One file holding both would put a proposal one careless read
 * away from the resolver.
 */
const DEV_FILES = {
  [CONFIG_KEY]: path.resolve(__dirname, '../../data/dev-depreciation-rates.json'),
  [proposals.CONFIG_KEY]: path.resolve(__dirname, '../../data/dev-depreciation-proposals.json')
}

/** Dev-only: this scope's own stored value for one key from the JSON fallback, or null. */
function devRead (scopeId, key) {
  const file = DEV_FILES[key]
  if (!file) { return null }
  try {
    const all = JSON.parse(fs.readFileSync(file, 'utf8'))
    const own = all[scopeId]
    return (own && typeof own === 'object' && !Array.isArray(own)) ? own : null
  } catch (e) { return null }
}

/** Dev-only: persist this scope's own value for one key to the JSON fallback. */
function devWrite (scopeId, key, value) {
  const file = DEV_FILES[key]
  if (!file) { return }
  let all = {}
  try { all = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { all = {} }
  all[scopeId] = value
  fs.writeFileSync(file, JSON.stringify(all, null, 2))
}

/**
 * The overlay reader the resolver walks the tier chain with, falling back to the dev file so
 * the cascade behaves the same way with and without a database.
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

/** This scope's OWN stored tables, validated, or {} when it has none we can use. */
async function ownTables (scopeId) {
  const stored = await readScopeConfig(scopeId, CONFIG_KEY)
  const { ok, value } = validateDepreciationRates(stored)
  return ok ? value : {}
}

/** Write this scope's own tables, through the overlay or the dev file. */
async function writeTables (scopeId, tables, userEmail) {
  try {
    await overlay.saveFirmConfig(scopeId, CONFIG_KEY, tables, userEmail)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(scopeId, CONFIG_KEY, tables)
  }
}

/** This scope's OWN loaded documents and their proposals, validated. */
async function ownProposals (scopeId) {
  const stored = await readScopeConfig(scopeId, proposals.CONFIG_KEY)
  const { errors, value } = proposals.validateProposals(stored)
  if (errors.length) {
    // Dropped records are logged rather than hidden: a manager's document vanishing from a
    // list with nothing said anywhere is the failure this feature exists to end.
    console.error('[depreciation-rates] dropped proposal records:', errors.join('; '))
  }
  return value
}

/** Write this scope's own documents, through the overlay or the dev file. */
async function writeProposals (scopeId, value, userEmail) {
  try {
    await overlay.saveFirmConfig(scopeId, proposals.CONFIG_KEY, value, userEmail)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(scopeId, proposals.CONFIG_KEY, value)
  }
}

/**
 * Approve a country's rate table for one scope — the one write path, shared by the two
 * routes that approve rates.
 *
 * ⚠ IT NEVER TOUCHES `firstYearRule`, and neither of its callers can make it. A rule already
 * adopted for this country is carried forward with its own approver and date; a rule is
 * adopted only by the route that exists for that (see this file's header).
 *
 * @param {string} scopeId - the VERIFIED scope from the JWT
 * @param {string} country - already normalised
 * @param {object} categories - the manager's own figures, corrections included
 * @param {string} userEmail - from the verified token; this is the name beside the rates
 * @returns {Promise<{ok: boolean, errors: string[]}>}
 */
async function saveApprovedRates (scopeId, country, categories, userEmail) {
  const mine = await ownTables(scopeId)
  const existing = mine[country] || {}

  const candidate = {
    approvedAt: new Date().toISOString(),
    // From the verified token, never the body — see this file's header.
    approvedBy: userEmail || '',
    categories
  }
  // Carried forward rather than re-approved: the rule keeps its own approver and date.
  if (existing.firstYearRule) { candidate.firstYearRule = existing.firstYearRule }

  const next = Object.assign({}, mine, { [country]: candidate })
  const { ok, errors } = validateDepreciationRates(next)
  if (!ok) { return { ok: false, errors } }

  await writeTables(scopeId, next, userEmail)
  return { ok: true, errors: [] }
}

/** The everything-defaults answer, for a read that cannot be served. */
function defaultsFor (country) {
  const categories = {}
  Object.keys(BASE_DEPRECIATION_RATES).forEach((key) => {
    categories[key] = { ...BASE_DEPRECIATION_RATES[key], originTier: null, originScopeId: null }
  })
  return { country: normaliseCountry(country), categories, firstYearRule: null, isDefault: true }
}

/**
 * GET /api/report/depreciation-rates?country=NZ  (firmAuth)
 *
 * The rates this scope works to for one country, with every tier above it already applied and
 * each rate saying where it came from. The forecast's assets step draws its badges from this.
 *
 * @route GET /api/report/depreciation-rates
 * @param {string} req.query.country - the CLIENT's country, two letters. An absent or
 *   unrecognised one is not an error: it resolves to the app's own six rates, because an
 *   advisor is never blocked by a country nobody has loaded a document for.
 * @returns {{country: string|null, categories: object, firstYearRule: object|null, isDefault: boolean}}
 */
async function get (req, res) {
  const country = req.query && req.query.country
  try {
    const resolved = await loadResolvedDepreciationRates(req.firmId, country, readScopeConfig)
    res.send(200, resolved)
  } catch (err) {
    // A rate read must never stop an advisor building a forecast. The worst case is the six
    // app defaults, which is what every firm gets today anyway.
    console.error('[depreciation-rates] read failed:', err.message)
    res.send(200, defaultsFor(country))
  }
}

/**
 * GET /api/firm-manager/depreciation-rates?country=NZ  (manager)
 *
 * What this tier is working to for one country, split three ways so the screen can show the
 * difference rather than assert it: what it INHERITS, what it has APPROVED itself, and the
 * RESOLVED result the advisors under it actually get. `countries` lists every country this
 * scope has approved something for, so the screen can offer them without a second call.
 *
 * @route GET /api/firm-manager/depreciation-rates
 * @returns {{country: string|null, inherited: object, own: object|null, resolved: object,
 *   hasOwn: boolean, countries: string[]}}
 */
async function getForManager (req, res) {
  const country = normaliseCountry(req.query && req.query.country)
  try {
    const mine = await ownTables(req.firmId)
    const countries = Object.keys(mine).sort()

    if (country === null) {
      res.send(200, {
        country: null,
        inherited: defaultsFor(null),
        own: null,
        resolved: defaultsFor(null),
        hasOwn: false,
        countries
      })
      return
    }

    // The layer above, asked for by resolving the PARENT rather than subtracting our own
    // values from the result — subtraction cannot tell "same as above" from "approved here to
    // the same thing", and those are different decisions.
    const parent = parentScopeOf(req.firmId)
    const inherited = parent === null
      ? defaultsFor(country)
      : await loadResolvedDepreciationRates(parent, country, readScopeConfig)

    const resolved = await loadResolvedDepreciationRates(req.firmId, country, readScopeConfig)

    res.send(200, {
      country,
      inherited,
      own: mine[country] || null,
      resolved,
      hasOwn: Boolean(mine[country]),
      countries
    })
  } catch (err) {
    console.error('[depreciation-rates] manager read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the depreciation rates')
  }
}

/**
 * POST /api/firm-manager/depreciation-rates  (manager)
 *
 * Approve a country's RATE TABLE. Replaces this scope's own table for that country and
 * leaves every other country untouched.
 *
 * ⚠ IT NEVER TOUCHES `firstYearRule`. A rule already adopted for this country survives an
 * approval of the rates, and a rule is never adopted by one — that is the second Approve
 * button, and it is a different route. See this file's header.
 *
 * @route POST /api/firm-manager/depreciation-rates
 * @param {object} req.body - `{ country: 'NZ', categories: { <key>: entry } }`
 * @returns {{approved: true, country: string, resolved: object}}
 */
async function approveRates (req, res) {
  const body = req.body || {}
  const country = normaliseCountry(body.country)
  if (country === null) {
    return sendError(res, 400, 'INVALID_COUNTRY', 'country must be a two-letter code, such as NZ')
  }
  if (!body.categories || typeof body.categories !== 'object' || Array.isArray(body.categories)) {
    return sendError(res, 400, 'INVALID_RATES', 'categories must be a non-array JSON object')
  }

  try {
    const saved = await saveApprovedRates(req.firmId, country, body.categories, req.userEmail)
    if (!saved.ok) {
      return sendError(res, 400, 'INVALID_RATES', saved.errors.join('; '))
    }

    const resolved = await loadResolvedDepreciationRates(req.firmId, country, readScopeConfig)
    res.send(200, { approved: true, country, resolved })
  } catch (err) {
    console.error('[depreciation-rates] approve failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save the depreciation rates')
  }
}

/**
 * POST /api/firm-manager/depreciation-rates/first-year-rule  (manager)
 *
 * Adopt, replace or withdraw a country's FIRST-YEAR RULE — New Zealand's Investment Boost,
 * and whatever another country calls its own. A null rule withdraws it.
 *
 * 🔴 A SEPARATE ROUTE BECAUSE IT IS A SEPARATE DECISION (Mike, 2026-09-09). Approving 41
 * depreciation rates is a routine review; adopting a 20% first-year write-off changes one
 * year's tax on every qualifying purchase a firm's clients make. The rates handler above
 * cannot reach this field and this one cannot reach the rates.
 *
 * ⚠ WITHDRAWING IS ALLOWED AND LEAVES THE RATES ALONE. A country whose table holds only a
 * rule is emptied entirely rather than left as a table with nothing in it.
 *
 * @route POST /api/firm-manager/depreciation-rates/first-year-rule
 * @param {object} req.body - `{ country: 'NZ', rule: object|null }`
 * @returns {{approved: true, country: string, resolved: object}}
 */
async function approveFirstYearRule (req, res) {
  const body = req.body || {}
  const country = normaliseCountry(body.country)
  if (country === null) {
    return sendError(res, 400, 'INVALID_COUNTRY', 'country must be a two-letter code, such as NZ')
  }

  try {
    const mine = await ownTables(req.firmId)
    const existing = mine[country]
    const next = { ...mine }

    if (body.rule === null || body.rule === undefined) {
      if (!existing) {
        return sendError(res, 404, 'NO_RULE', 'There is no first-year rule here to withdraw')
      }
      const stripped = { ...existing }
      delete stripped.firstYearRule
      // A table that held only a rule has nothing left to say once the rule goes.
      if (Object.keys(stripped.categories || {}).length === 0) {
        delete next[country]
      } else {
        next[country] = stripped
      }
    } else {
      const candidate = {
        approvedAt: (existing && existing.approvedAt) || new Date().toISOString(),
        approvedBy: (existing && existing.approvedBy) || req.userEmail || '',
        categories: (existing && existing.categories) || {},
        firstYearRule: {
          ...body.rule,
          // The rule's OWN approval, from the verified token. This is the second signature,
          // and it is what makes the second button mean something.
          approvedAt: new Date().toISOString(),
          approvedBy: req.userEmail || ''
        }
      }
      next[country] = candidate
    }

    const { ok, errors } = validateDepreciationRates(next)
    if (!ok) {
      return sendError(res, 400, 'INVALID_RULE', errors.join('; '))
    }

    await writeTables(req.firmId, next, req.userEmail)
    const resolved = await loadResolvedDepreciationRates(req.firmId, country, readScopeConfig)
    res.send(200, { approved: true, country, resolved })
  } catch (err) {
    console.error('[depreciation-rates] rule approve failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save the first-year rule')
  }
}

/**
 * GET /api/firm-manager/depreciation-rates/history  (manager)
 * @route GET /api/firm-manager/depreciation-rates/history
 * @returns {{history: Array<object>}} every saved version of THIS scope's own tables.
 */
async function history (req, res) {
  try {
    const rows = await overlay.getVersionHistory(req.firmId, CONFIG_KEY)
    res.send(200, { history: rows })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[depreciation-rates] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/firm-manager/depreciation-rates/restore  (manager)
 * @route POST /api/firm-manager/depreciation-rates/restore
 * @param {object} req.body - `{ versionId: number, country: string }`
 * @returns {{restored: true, resolved: object}}
 */
async function restore (req, res) {
  const versionId = req.body && req.body.versionId
  if (!versionId) {
    return sendError(res, 400, 'MISSING_VERSION', 'versionId is required')
  }
  try {
    await overlay.restoreVersion(req.firmId, CONFIG_KEY, Number(versionId))
    const resolved = await loadResolvedDepreciationRates(
      req.firmId, req.body && req.body.country, readScopeConfig
    )
    res.send(200, { restored: true, resolved })
  } catch (err) {
    console.error('[depreciation-rates] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

// ── Loading a document, and what the model read out of it (slice 3) ───────────

/**
 * Reads the multipart body of an upload. formidable v2's `parse` is callback-style, so it is
 * wrapped to keep the `await` shape the handler reads in.
 *
 * @param {object} form
 * @param {object} req
 * @returns {Promise<[object, object]>} `[fields, files]`
 */
function parseForm (form, req) {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) { reject(err); return }
      resolve([fields, files])
    })
  })
}

/** One field from a formidable v2/v3 body, which may hand back an array. */
function field (fields, name) {
  const v = fields && fields[name]
  return Array.isArray(v) ? v[0] : v
}

/**
 * POST /api/firm-manager/depreciation-rates/documents  (manager)
 *
 * Load one tax-authority depreciation schedule, have the model read it, and keep what it
 * proposed for a manager to approve. NOTHING HERE REACHES A FORECAST: the proposal is stored
 * in its own place and the resolver never reads it.
 *
 * 🔴 THE FILE IS NOT KEPT. It is read into memory, sent to the model, and the temporary copy
 * formidable made is deleted. There is no firm-PDF store here, and keeping none removes path
 * traversal, a storage quota and a deletion policy from the attack surface at once. What is
 * kept is what was read: the document's name, its date, and the rates.
 *
 * ⚠ THE DECLARED MIME TYPE IS NOT BELIEVED. It comes from the browser, so the first bytes of
 * the file are checked for a PDF header as well. A document that is not a PDF is refused
 * before a single byte of it is sent anywhere.
 *
 * @route POST /api/firm-manager/depreciation-rates/documents
 * @param {object} req - multipart: a `file` part and a `country` field
 * @returns {{ok: boolean, code: (string|null), message: (string|null), document: (object|null)}}
 */
async function loadDocument (req, res) {
  const form = formidable({
    maxFileSize: extract.MAX_PDF_BYTES,
    filter ({ mimetype }) { return mimetype === extract.PDF_MIME }
  })

  let fields, files
  try {
    ;[fields, files] = await parseForm(form, req)
  } catch (err) {
    console.error('[depreciation-rates] upload parse failed:', err.message)
    return sendError(res, 400, 'UPLOAD_FAILED',
      'That file could not be read. It must be a PDF of 20 MB or less.')
  }

  const country = normaliseCountry(field(fields, 'country'))
  if (country === null) {
    return sendError(res, 400, 'INVALID_COUNTRY', 'country must be a two-letter code, such as NZ')
  }

  const uploaded = files && files.file
    ? (Array.isArray(files.file) ? files.file[0] : files.file)
    : null
  if (!uploaded) {
    return sendError(res, 400, 'NO_FILE', 'A file field named "file" is required')
  }

  let buffer
  try {
    buffer = fs.readFileSync(uploaded.filepath)
  } catch (err) {
    console.error('[depreciation-rates] upload read failed:', err.message)
    return sendError(res, 400, 'UPLOAD_FAILED', 'That file could not be read')
  } finally {
    // The temporary copy goes whatever happens next. A failed read must not leave a 20 MB
    // file behind on every attempt.
    try { fs.unlinkSync(uploaded.filepath) } catch (e) { /* already gone */ }
  }

  if (buffer.slice(0, 5).toString('latin1') !== '%PDF-') {
    return sendError(res, 400, 'NOT_A_PDF',
      'That file is not a PDF. Load the schedule as it is published by the tax authority.')
  }

  const filename = uploaded.originalFilename || uploaded.newFilename || 'document.pdf'
  const result = await extract.readDocument({
    scopeId: req.firmId,
    country,
    filename,
    buffer,
    loadFirmConfig: readScopeConfig
  })

  // A document the model could not read, or answered about in a shape we cannot use, is
  // RECORDED as unreadable rather than dropped: a manager who loaded three files has to be
  // able to see which one failed. Everything else — a network fault, a prompt that could not
  // be assembled — is not the document's fault and records nothing.
  if (!result.ok && result.code !== 'UNREADABLE' && result.code !== 'MALFORMED') {
    const status = result.code === 'COUNTRY_MISMATCH' || result.code === 'INVALID_COUNTRY' ? 400 : 502
    return sendError(res, status, result.code, result.message)
  }

  try {
    const store = await ownProposals(req.firmId)
    const record = proposals.documentRecord({
      filename,
      country,
      loadedBy: req.userEmail,
      reading: result.ok ? result.reading : null
    })
    await writeProposals(req.firmId, proposals.addDocument(store, record), req.userEmail)
    res.send(200, {
      ok: result.ok,
      code: result.code,
      message: result.message,
      document: record
    })
  } catch (err) {
    console.error('[depreciation-rates] proposal save failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'The document was read but the result could not be saved')
  }
}

/**
 * GET /api/firm-manager/depreciation-rates/documents?country=NZ  (manager)
 *
 * Every document this scope has loaded, newest first, with what was read out of each and
 * which of the six categories it did not cover.
 *
 * @route GET /api/firm-manager/depreciation-rates/documents
 * @returns {{documents: object[]}}
 */
async function listDocuments (req, res) {
  const country = normaliseCountry(req.query && req.query.country)
  try {
    const store = await ownProposals(req.firmId)
    const documents = country === null
      ? store.documents
      : store.documents.filter(d => d.country === country)
    res.send(200, { documents })
  } catch (err) {
    console.error('[depreciation-rates] document list failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the loaded documents')
  }
}

/**
 * POST /api/firm-manager/depreciation-rates/documents/approve  (manager)
 *
 * Approve a table built from one loaded document. The figures written are THE MANAGER'S —
 * whatever they have on screen when they press the button, corrections included — never the
 * model's untouched proposal (FR-007).
 *
 * ⚠ THE RATES ARE WRITTEN FIRST AND THE DOCUMENT MARKED SECOND. If the write is refused
 * nothing is marked, so a document can never read `approved` beside a table that was never
 * stored. The reverse order could.
 *
 * @route POST /api/firm-manager/depreciation-rates/documents/approve
 * @param {object} req.body - `{ documentId, categories }`
 * @returns {{approved: true, country: string, resolved: object, document: object}}
 */
async function approveDocument (req, res) {
  const body = req.body || {}
  const documentId = typeof body.documentId === 'string' ? body.documentId.trim() : ''
  if (!documentId) {
    return sendError(res, 400, 'MISSING_DOCUMENT', 'documentId is required')
  }
  if (!body.categories || typeof body.categories !== 'object' || Array.isArray(body.categories)) {
    return sendError(res, 400, 'INVALID_RATES', 'categories must be a non-array JSON object')
  }

  try {
    const store = await ownProposals(req.firmId)
    const document = proposals.findDocument(store, documentId)
    if (!document) {
      return sendError(res, 404, 'NO_DOCUMENT', 'That document is not one this level has loaded')
    }
    if (document.status !== 'pending') {
      return sendError(res, 409, 'NOT_PENDING', 'That document has already been decided')
    }

    // The country comes from the DOCUMENT, never from the body. A body-supplied country
    // would let an Australian schedule be approved as a New Zealand table in one request.
    const saved = await saveApprovedRates(req.firmId, document.country, body.categories, req.userEmail)
    if (!saved.ok) {
      return sendError(res, 400, 'INVALID_RATES', saved.errors.join('; '))
    }

    const next = proposals.setStatus(store, documentId, 'approved', req.userEmail)
    await writeProposals(req.firmId, next, req.userEmail)

    const resolved = await loadResolvedDepreciationRates(req.firmId, document.country, readScopeConfig)
    res.send(200, {
      approved: true,
      country: document.country,
      resolved,
      document: proposals.findDocument(next, documentId)
    })
  } catch (err) {
    console.error('[depreciation-rates] document approve failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not approve that document')
  }
}

/**
 * POST /api/firm-manager/depreciation-rates/documents/reject  (manager)
 *
 * Throw a proposal away. The rates in force are untouched — nothing was ever using it.
 *
 * @route POST /api/firm-manager/depreciation-rates/documents/reject
 * @param {object} req.body - `{ documentId }`
 * @returns {{rejected: true, document: object}}
 */
async function rejectDocument (req, res) {
  const documentId = req.body && typeof req.body.documentId === 'string'
    ? req.body.documentId.trim()
    : ''
  if (!documentId) {
    return sendError(res, 400, 'MISSING_DOCUMENT', 'documentId is required')
  }

  try {
    const store = await ownProposals(req.firmId)
    const document = proposals.findDocument(store, documentId)
    if (!document) {
      return sendError(res, 404, 'NO_DOCUMENT', 'That document is not one this level has loaded')
    }
    if (document.status !== 'pending') {
      return sendError(res, 409, 'NOT_PENDING', 'That document has already been decided')
    }

    const next = proposals.setStatus(store, documentId, 'rejected', req.userEmail)
    await writeProposals(req.firmId, next, req.userEmail)
    res.send(200, { rejected: true, document: proposals.findDocument(next, documentId) })
  } catch (err) {
    console.error('[depreciation-rates] document reject failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not reject that document')
  }
}

module.exports = {
  get,
  getForManager,
  approveRates,
  approveFirstYearRule,
  history,
  restore,
  readScopeConfig,
  loadDocument,
  listDocuments,
  approveDocument,
  rejectDocument
}
