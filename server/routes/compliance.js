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
const { formidable } = require('formidable')
const overlay = require('../utils/firmOverlay')
const db = require('../utils/db')
const drive = require('../services/driveService')
const { STORAGE, DRIVE } = require('../../config/integration')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { tierOfScope, isWithinScope } = require('../utils/tierChain')
const { listFirms } = require('../utils/firmsDirectory')
const complianceCheck = require('../utils/complianceCheck')

/**
 * Where a scope's last completeness check is kept.
 *
 * ⚠ ITS OWN KEY, not a field on the declaration. They are different things with different
 * lives: the declaration gates and is signed, the check informs and is disposable. Storing
 * them together would put a re-run of an advisory check on the same row as the record a firm
 * manager put their name to.
 */
const CHECK_KEY = 'compliance-check'
const {
  CONFIG_KEY,
  DECLARATION_KEY,
  DECLARATION_WORDING,
  readDeclaration,
  meetingReviewOpen,
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
 * @param {string} scopeId
 * @returns {Promise<string|null>}
 */
async function declaredAtFor (scopeId) {
  const record = readDeclaration(await readScopeConfig(scopeId, DECLARATION_KEY))
  return record === null ? null : record.declaredAt
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
    const declaration = readDeclaration(await readScopeConfig(req.firmId, DECLARATION_KEY))
    const declaredAt = declaration === null ? null : declaration.declaredAt
    res.send(200, {
      items,
      newCount: newCountSince(items, declaredAt),
      declaredAt,
      declaration,
      // The words a manager is about to be held to, sent from the store that keeps them so no
      // screen holds a second copy of a sentence that is pinned.
      declarationWording: DECLARATION_WORDING,
      // The last completeness check, or null. The eight points travel with it, so the screen
      // renders what was actually checked rather than its own copy of the list.
      check: await readScopeConfig(req.firmId, CHECK_KEY),
      tier: tierOfScope(req.firmId),
      limits: {
        title: MAX_TITLE,
        summary: MAX_SUMMARY,
        body: MAX_BODY,
        // The evidence pack's per-file limit is the platform's, not this feature's.
        fileBytes: STORAGE.maxFileSizeBytes
      }
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

/**
 * POST /api/firm-manager/compliance/declaration  (manager)
 *
 * Record this scope's declaration. **This is the only thing that opens Meeting Review.**
 *
 * 🔴 THE TICK IS THE GATE — Mike's ruling of 2026-09-10, *"they have to tick a box before the
 * feature becomes active"*, which reversed a recommendation of ours against gating at all.
 * That recommendation objected to gating on the EVIDENCE PACK, which would make Advisor-e the
 * judge of a firm's compliance; gating on the firm's OWN declaration judges nothing.
 *
 * 🔴 `confirmed: true` IS REQUIRED IN THE BODY, and it is not ceremony: without it a screen
 * could record a declaration nobody ticked, which is the one thing this route exists to make
 * impossible. The signer's name comes from the verified token, never the body.
 *
 * ⚠ WHAT WAS ON SCREEN IS STORED WITH IT — the wording they saw, and every item published to
 * them with its version. A record naming only a date and a person is a record of a click.
 *
 * ⚠ RE-DECLARING IS ALLOWED AND CLEARS THE DOT. Only the FIRST declaration gates; a later one
 * is a manager saying they have read what has been published since.
 *
 * @route POST /api/firm-manager/compliance/declaration
 * @param {object} req.body - `{ confirmed: true }`
 * @returns {{declared: true, declaration: object, newCount: number}}
 */
async function declare (req, res) {
  const body = req.body || {}
  if (body.confirmed !== true) {
    return sendError(res, 400, 'NOT_CONFIRMED',
      'The declaration has to be ticked before it can be recorded')
  }

  try {
    const items = await resolveComplianceItems(req.firmId, readScopeConfig)
    const record = {
      declaredAt: new Date().toISOString(),
      // From the verified token, never the body — this is the name a firm is held to.
      declaredBy: req.userEmail || '',
      wording: DECLARATION_WORDING,
      against: items
        .filter(i => !i.isOwn)
        .map(i => ({ ref: i.ref, title: i.title, version: i.version }))
    }

    const clean = readDeclaration(record)
    if (clean === null) {
      // Reachable when the token carries no user — a declaration nobody can be identified by
      // is not a declaration, and storing one would put an unsigned record behind the gate.
      return sendError(res, 400, 'NO_SIGNER',
        'We could not tell who is making this declaration')
    }

    try {
      await overlay.saveFirmConfig(req.firmId, DECLARATION_KEY, clean, req.userEmail)
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
      devWrite(req.firmId, DECLARATION_KEY, clean)
    }

    res.send(200, {
      declared: true,
      declaration: clean,
      newCount: newCountSince(items, clean.declaredAt)
    })
  } catch (err) {
    console.error('[compliance] declaration failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Your declaration could not be recorded')
  }
}

/**
 * GET /api/compliance/gate  (any signed-in user)
 *
 * Whether Meeting Review is open for the caller's firm, so the recorder page can show the
 * locked state rather than a screen that does nothing.
 *
 * 🔴 THIS IS NOT THE GATE. It is what the SCREEN asks so it can explain itself. The gate is
 * `requireDeclaration` below, on the route that starts a recording — a UI check is not a
 * control, and `pages/meeting-record.vue` says so in its own comment about its access check.
 *
 * ⚠ ANY SIGNED-IN USER, NOT MANAGERS. The person who meets the locked state is an ADVISOR,
 * and an advisor behind the manager guard would be told nothing at all.
 *
 * @route GET /api/compliance/gate
 * @returns {{open: boolean}}
 */
async function gate (req, res) {
  try {
    const stored = await readScopeConfig(req.firmId, DECLARATION_KEY)
    res.send(200, { open: meetingReviewOpen(stored) })
  } catch (err) {
    // 🔴 CLOSED ON FAILURE, NOT OPEN. Everywhere else in this app a read that fails degrades
    // to the permissive answer so an advisor is never blocked; here the permissive answer is
    // "record a client meeting", and a storage fault must not become permission to do that.
    // The screen tells them to ask a firm manager, which is a recoverable wrong answer; the
    // other direction is not.
    console.error('[compliance] gate read failed:', err.message)
    res.send(200, { open: false })
  }
}

/**
 * Restify middleware: refuse a recording unless the caller's firm has declared.
 *
 * 🔴 THIS IS THE GATE, AND IT IS ON THE BACKEND BECAUSE A SCREEN IS NOT A CONTROL. The page
 * shows the locked state; this refuses the route whatever the page does.
 *
 * ⚠ IT GUARDS THE START OF A RECORDING AND NOTHING ELSE, deliberately. That is the one choke
 * point — consent, chunks, finish and the reports all address a meeting that already exists,
 * so a recording cannot come into being without passing here. Spreading the check across all
 * seven routes would add six places for it to drift.
 *
 * ⚠ A STORAGE FAILURE REFUSES. See `gate` above for why this one fails closed where the rest
 * of the app fails open.
 *
 * @param {object} req
 * @param {object} res
 * @param {function} next
 */
async function requireDeclaration (req, res, next) {
  try {
    const stored = await readScopeConfig(req.firmId, DECLARATION_KEY)
    if (meetingReviewOpen(stored)) { next(); return }
  } catch (err) {
    console.error('[compliance] gate check failed:', err.message)
  }

  sendError(res, 403, 'NOT_DECLARED',
    'Meeting Review is not active at this firm yet. A firm manager needs to record the ' +
    'compliance declaration in Firm Manager Hub, under Compliance.')
}

/**
 * GET /api/firm-manager/compliance/firms  (manager)
 *
 * Who beneath this tier has declared, and who therefore cannot record a client meeting.
 *
 * 🔴 STATUS ONLY, NEVER THEIR DOCUMENTS. A firm's legal opinion and its policies are the
 * firm's; this says THAT a document exists and how many, and nothing else. Nobody at
 * Advisor-e reads them and no route here returns one.
 *
 * ⚠ IT REPORTS ONE THING AS THE REASON, BECAUSE THERE IS ONLY ONE. A firm that cannot record
 * has not declared — never because its pack is thin. The drawing states it in terms: one firm
 * records on 2 of 8 points covered while another with an empty pack is blocked, and the
 * difference is the tick.
 *
 * ⚠ WHICH FIRMS A MIDDLE TIER SEES DEPENDS ON MEMBERSHIP DATA THAT IS ADVISOR-E'S TO SUPPLY
 * (`design/USER-LEVEL-CASCADE-HANDOVER.md` Part 3). Until it arrives every firm resolves under
 * the mentor, which is the safe direction to fail by design — a middle tier is shown nothing
 * rather than another brand's firms.
 *
 * @route GET /api/firm-manager/compliance/firms
 * @returns {{firms: Array<{id: string, name: string|null, declaredAt: string|null,
 *   declaredBy: string, active: boolean, documentsHeld: number}>}}
 */
async function listFirmsStatus (req, res) {
  try {
    const all = await listFirms()
    const mine = all.filter(f => isWithinScope(f.id, req.firmId) && f.id !== req.firmId)
    if (mine.length === 0) { res.send(200, { firms: [] }); return }

    // One query for "who has declared at all", so only those firms are read individually.
    let declaredIds = []
    try {
      declaredIds = await overlay.listFirmIdsWithConfigKey(DECLARATION_KEY)
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
      declaredIds = mine.map(f => f.id)
    }
    const hasDeclared = {}
    declaredIds.forEach((id) => { hasDeclared[id] = true })

    // One grouped query for the counts, rather than one per firm.
    const counts = {}
    try {
      const marks = mine.map(() => '?').join(', ')
      const [rows] = await db.execute(
        `SELECT firm_id, COUNT(*) AS held
         FROM firm_documents
         WHERE category = ? AND firm_id IN (${marks})
         GROUP BY firm_id`,
        [EVIDENCE_CATEGORY].concat(mine.map(f => f.id))
      )
      rows.forEach((r) => { counts[r.firm_id] = Number(r.held) })
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
    }

    const firms = []
    for (let i = 0; i < mine.length; i++) {
      const firm = mine[i]
      let record = null
      if (hasDeclared[firm.id]) {
        record = readDeclaration(await readScopeConfig(firm.id, DECLARATION_KEY))
      }
      firms.push({
        id: firm.id,
        name: firm.name,
        declaredAt: record === null ? null : record.declaredAt,
        declaredBy: record === null ? '' : record.declaredBy,
        active: record !== null,
        documentsHeld: counts[firm.id] || 0
      })
    }

    res.send(200, { firms })
  } catch (err) {
    console.error('[compliance] firm roll-up failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read which firms have declared')
  }
}

// ── The firm's own compliance evidence (slice 2) ───────────────────────────────
//
// 🔴 THESE ARE THE FIRM'S DOCUMENTS AND THE FIRM'S ALONE. Its lawyer's opinion, its privacy
// statement, its engagement terms, its staff consultation record, its breach process. Advisor-e
// holds them and does not read them; a tier above sees THAT a document exists and when it
// arrived, never the document (the drawing, "Your firm's compliance evidence").
//
// 🔴 NOTHING READS THE INSIDE OF ONE, INCLUDING THE COMPLETENESS CHECK. The artefact says it
// three times — "we do not read them", "we do not read your documents for meaning", "neither
// the AI nor anyone at Advisor-e reads it" — and the check works on what a document IS, which
// is the name the firm gave it. The drawing's own examples are file names: "Covered by: Legal
// opinion — Harrow & Tait, 3 Sep 2026". No document content leaves this server.
//
// ⚠ NEVER THE TEXT OF THE LAW. Mike agreed on 2026-09-10 that uploading statutes for the AI to
// read would put our software in the place of a firm's lawyer. This zone takes the firm's own
// EVIDENCE, and the wording on the screen says which.
//
// The storage is the document library's, unchanged: Google Drive under the firm's own folder,
// with a `firm_documents` row and the 500 MB per-firm quota. Reusing it rather than inventing a
// second store means the cross-firm authorisation gate, the quota and the download route are
// the ones already proven, not new ones written under a new name.

/** Where a firm's compliance evidence sits, in the document library's own vocabulary. */
const EVIDENCE_CATEGORY = DRIVE.categories.COMPLIANCE

/**
 * formidable v2's parse() is callback-style, so wrap it to keep `await [fields, files]`.
 * @param {object} form
 * @param {object} req
 * @returns {Promise<Array>}
 */
function parseForm (form, req) {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) { reject(err); return }
      resolve([fields, files])
    })
  })
}

/**
 * GET /api/firm-manager/compliance/evidence  (manager)
 *
 * What this firm holds, read from `firm_documents` rather than from Drive's own listing —
 * Drive knows the file, the row knows WHO added it and WHEN, and the drawing shows both.
 *
 * @route GET /api/firm-manager/compliance/evidence
 * @returns {{documents: Array<{fileId: string, name: string, sizeBytes: number,
 *   addedAt: string, addedBy: string}>}}
 */
async function listEvidence (req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT drive_file_id, file_name, size_bytes, uploaded_by, created_at
       FROM firm_documents
       WHERE firm_id = ? AND category = ?
       ORDER BY created_at DESC`,
      [req.firmId, EVIDENCE_CATEGORY]
    )
    res.send(200, {
      documents: rows.map(r => ({
        fileId: r.drive_file_id,
        name: r.file_name,
        sizeBytes: Number(r.size_bytes),
        addedAt: r.created_at,
        addedBy: r.uploaded_by || ''
      }))
    })
  } catch (err) {
    // An empty pack blocks nothing — it is the declaration that gates, never this — so a
    // storage failure degrades to "nothing held" rather than taking the page down with it.
    if (devFallbackAllowed(err)) { res.send(200, { documents: [] }); return }
    console.error('[compliance] evidence read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read your compliance documents')
  }
}

/**
 * POST /api/firm-manager/compliance/evidence  (manager)
 *
 * Add one document to this firm's pack. PDFs only and up to the platform's per-file limit,
 * which is the document library's rule and not a new one invented here.
 *
 * ⚠ THE DRAWING SAYS "PDF, Word or text" AND THIS TAKES PDFs ONLY. `config/integration.js`
 * allows PDFs platform-wide; widening a security setting for one tab is not a scope call, so
 * the narrower behaviour ships and the difference is recorded rather than made quietly.
 *
 * @route POST /api/firm-manager/compliance/evidence
 * @param {object} req - multipart: one part named `file`
 * @returns {{added: true, fileId: string}}
 */
async function uploadEvidence (req, res) {
  const form = formidable({
    maxFileSize: STORAGE.maxFileSizeBytes,
    filter ({ mimetype }) {
      return STORAGE.allowedMimeTypes.includes(mimetype)
    }
  })

  let files
  try {
    ;[, files] = await parseForm(form, req)
  } catch (err) {
    const tooBig = err && /maxFileSize/i.test(err.message || '')
    return sendError(res, tooBig ? 413 : 400, tooBig ? 'FILE_TOO_LARGE' : 'PARSE_ERROR',
      tooBig
        ? `That file is larger than the ${Math.round(STORAGE.maxFileSizeBytes / (1024 * 1024))} MB limit`
        : 'That upload could not be read')
  }

  const uploaded = files && files.file
    ? (Array.isArray(files.file) ? files.file[0] : files.file)
    : null
  if (!uploaded) {
    // The mime filter drops a non-PDF silently, so "no file" and "wrong type" arrive here as
    // the same thing. Said as one message rather than guessed between.
    return sendError(res, 400, 'NO_FILE', 'A PDF is required')
  }

  try {
    const [usage] = await db.execute(
      'SELECT bytes_used FROM firm_storage_usage WHERE firm_id = ?',
      [req.firmId]
    )
    const bytesUsed = usage.length > 0 ? Number(usage[0].bytes_used) : 0
    if (bytesUsed + uploaded.size > STORAGE.maxFirmStorageBytes) {
      return sendError(res, 413, 'QUOTA_EXCEEDED',
        'This upload would exceed your firm storage limit of 500 MB')
    }

    const buffer = fs.readFileSync(uploaded.filepath)
    const fileName = uploaded.originalFilename || uploaded.newFilename || 'document.pdf'
    const driveFile = await drive.uploadFirmDocument(
      req.firmId, 'COMPLIANCE', fileName, uploaded.mimetype, buffer
    )

    await db.execute(
      `INSERT INTO firm_documents
         (firm_id, category, file_name, drive_file_id, mime_type, size_bytes, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.firmId, EVIDENCE_CATEGORY, driveFile.name, driveFile.id,
        uploaded.mimetype, uploaded.size, req.userEmail]
    )
    await db.execute(
      `INSERT INTO firm_storage_usage (firm_id, bytes_used) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE bytes_used = bytes_used + ?`,
      [req.firmId, uploaded.size, uploaded.size]
    )

    res.send(200, { added: true, fileId: driveFile.id })
  } catch (err) {
    // 🔴 NO DEV FALLBACK ON A WRITE, deliberately. A document a firm believes it has lodged
    // and which is not there is worse than an upload that plainly failed — and this pack is
    // the evidence half of the all-care basis.
    console.error('[compliance] evidence upload failed:', err.message)
    return sendError(res, 500, 'UPLOAD_ERROR', 'That document could not be stored')
  }
}

/**
 * DELETE /api/firm-manager/compliance/evidence/:fileId  (manager)
 *
 * 🔴 A FIRM'S OWN UPLOADS STAY THEIRS TO REMOVE — the other half of Mike's ruling of
 * 2026-09-10 that a firm may not hide what a tier ABOVE published. Only what arrives from
 * above is fixed; a firm's own pack is its own.
 *
 * ⚠ THE ROW IS CHECKED AGAINST `req.firmId` BEFORE ANYTHING IS DELETED, so a file id
 * belonging to another firm reads as not found and is never touched — the same
 * cross-firm gate the document library's own delete keeps.
 *
 * @route DELETE /api/firm-manager/compliance/evidence/:fileId
 * @returns {{removed: true}}
 */
async function deleteEvidence (req, res) {
  const fileId = req.params && req.params.fileId
  if (!fileId) { return sendError(res, 400, 'NO_FILE_ID', 'A file id is required') }

  try {
    const [rows] = await db.execute(
      `SELECT size_bytes FROM firm_documents
       WHERE drive_file_id = ? AND firm_id = ? AND category = ?`,
      [fileId, req.firmId, EVIDENCE_CATEGORY]
    )
    if (rows.length === 0) {
      return sendError(res, 404, 'NOT_FOUND', 'That document is not in your compliance pack')
    }
    const sizeBytes = Number(rows[0].size_bytes)

    await drive.deleteFirmDocument(fileId)
    await db.execute(
      'DELETE FROM firm_documents WHERE drive_file_id = ? AND firm_id = ?',
      [fileId, req.firmId]
    )
    await db.execute(
      'UPDATE firm_storage_usage SET bytes_used = GREATEST(0, bytes_used - ?) WHERE firm_id = ?',
      [sizeBytes, req.firmId]
    )

    res.send(200, { removed: true })
  } catch (err) {
    console.error('[compliance] evidence delete failed:', err.message)
    return sendError(res, 500, 'DELETE_ERROR', 'That document could not be removed')
  }
}

/**
 * POST /api/firm-manager/compliance/check  (manager, firm tier)
 *
 * What is missing from this firm's pack, checked against the eight points of the published
 * assessment — **from document NAMES only**.
 *
 * 🔴 ON A BUTTON, NEVER AUTOMATICALLY — Mike's ruling of 2026-09-10, and the reason is item
 * 4.82, still open: nothing caps how many paid readings a user can set off. A build that
 * re-checks on upload or on page load has undone that ruling without noticing.
 *
 * 🔴 THE CHECK NEVER GATES. An incomplete pack blocks nothing at all: if it did, Advisor-e
 * would be deciding when a firm is compliant enough to proceed, which is the responsibility
 * the all-care basis places on the firm. Only the declaration gates.
 *
 * ⚠ THE RESULT IS STORED so the screen can say when it was last run, and a FAILED check
 * leaves the previous result alone rather than blanking it — a firm that ran a check
 * yesterday should not lose it because the model was unreachable today.
 *
 * @route POST /api/firm-manager/compliance/check
 * @returns {{checked: true, check: object}}
 */
async function runCheck (req, res) {
  if (!process.env.OPENAI_API_KEY) {
    // Said plainly rather than failing as though the pack were the problem.
    return sendError(res, 503, 'NO_MODEL',
      'The completeness check is not available on this deployment yet')
  }

  try {
    let documents = []
    try {
      const [rows] = await db.execute(
        'SELECT file_name FROM firm_documents WHERE firm_id = ? AND category = ?',
        [req.firmId, EVIDENCE_CATEGORY]
      )
      documents = rows.map(r => ({ name: r.file_name }))
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
    }

    const outcome = await complianceCheck.runCheck({
      scopeId: req.firmId,
      documents,
      loadFirmConfig: readScopeConfig,
      apiKey: process.env.OPENAI_API_KEY
    })

    if (!outcome.ok) {
      return sendError(res, 502, outcome.code || 'CHECK_FAILED',
        'The check could not be completed. Your documents are untouched — try again shortly.')
    }

    try {
      await overlay.saveFirmConfig(req.firmId, CHECK_KEY, outcome.result, req.userEmail)
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
      devWrite(req.firmId, CHECK_KEY, outcome.result)
    }

    res.send(200, { checked: true, check: outcome.result })
  } catch (err) {
    console.error('[compliance] check failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'The check could not be completed')
  }
}

module.exports = {
  getForManager,
  runCheck,
  publish,
  history,
  restore,
  declare,
  gate,
  requireDeclaration,
  listFirmsStatus,
  listEvidence,
  uploadEvidence,
  deleteEvidence,
  readScopeConfig,
  EVIDENCE_CATEGORY
}
