'use strict'

/**
 * Add Concept — the Restify routes behind the Strategy Concepts hub tab. Item 15.20; the
 * approved drawing is `design/mockups/add-concept.html` and every ruling is in
 * `design/features/strategy-planner.md` §9.
 *
 *   list    GET  /api/firm-manager/strategy-concepts            what this tier sees, and from where
 *   preview POST /api/firm-manager/strategy-concepts/preview    one PDF converted for steps 2 and 3;
 *                                                               NOTHING is stored
 *   save    POST /api/firm-manager/strategy-concepts            the concept, and its PDFs kept
 *   remove  POST /api/firm-manager/strategy-concepts/remove     a concept this tier added
 *
 * Managers only, at all four tiers (`firmAuth` + `requireManagerRole`, wired in
 * restify-server.js).
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler reads a
 * scope from a body or a field, so a tier adds to and removes from its own list only
 * (`tier-cascade.md` P6).
 *
 * 🔴 THE UPLOAD FOLLOWS `depreciationRates.loadDocument`, as Mike ruled 2026-09-23: multipart
 * through formidable, 20 MB a file, the first bytes checked for `%PDF-`, the temporary copies
 * deleted whatever happens. ONE DELIBERATE DIFFERENCE: there is no mimetype filter. formidable
 * skips a filtered part without a word, so a save carrying three teaching files, one mislabelled
 * by the browser, would quietly store a concept with two pages. Here every part is read, and one
 * that is not a PDF refuses the whole save.
 *
 * 🔴 NO PDF IS READ IN THIS PROCESS, AND NONE IS SENT TO A MODEL. Conversion is
 * `pdfConvert.convertPdf`, in its own sealed process (Mike, 2026-09-24); nothing here calls a
 * model (Mike, 2026-09-23).
 *
 * 🔴 SAVE CONVERTS THE PDFs AGAIN. The pages a preview returned are never sent back and stored:
 * the record holds the server's own conversion of the files uploaded with the save.
 */

const fs = require('fs')
// formidable is pinned to v2.1.2 — the last v2 release before it required Node > 14.15.
const { formidable } = require('formidable')
const { sendError } = require('../utils/sendError')
const { convertPdf, PdfConvertError, FAILURES } = require('../utils/pdfConvert')
const ic = require('../utils/importedConcepts')
const sources = require('../utils/conceptSourceStore')

/**
 * formidable v2 caps the WHOLE request, not each file, so the request cap is the per-file cap
 * times the most files a save carries; each file's own 20 MB is checked after the parse.
 */
const MAX_REQUEST_BYTES = ic.MAX_PDF_BYTES * (ic.MAX_TEACHING_FILES + 1)

/** The limits the screens stop their fields at, so a field never accepts what a save refuses. */
const LIMITS = {
  maxPdfBytes: ic.MAX_PDF_BYTES,
  maxTeachingFiles: ic.MAX_TEACHING_FILES,
  maxTeachingPages: ic.MAX_TEACHING_PAGES,
  maxName: ic.MAX_NAME,
  maxHelps: ic.MAX_HELPS,
  maxBoxes: ic.MAX_BOXES,
  maxLabel: ic.MAX_LABEL
}

function parseForm (form, req) {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) { reject(err); return }
      resolve([fields, files])
    })
  })
}

/** One field from a formidable v2 body, which may hand back an array. */
function field (fields, name) {
  const v = fields && fields[name]
  return Array.isArray(v) ? v[0] : v
}

/** Every file under one part name, in the order the browser sent them. */
function filesOf (files, name) {
  const v = files && files[name]
  if (!v) { return [] }
  return Array.isArray(v) ? v : [v]
}

function allFiles (files) {
  return Object.keys(files || {}).reduce((acc, k) => acc.concat(filesOf(files, k)), [])
}

/** Delete the temporary copies of a refused upload without reading them. */
function discard (list) {
  list.forEach((f) => {
    try { fs.unlinkSync(f.filepath) } catch (e) { /* already gone */ }
  })
}

/**
 * Read the upload's files into memory and delete every temporary copy, whatever happens.
 *
 * @param {Array<object>} list - formidable file objects
 * @returns {{ok: true, buffers: Buffer[]}|{ok: false, status: number, code: string, message: string}}
 */
function readPdfs (list) {
  const buffers = []
  let refusal = null
  list.forEach((f) => {
    let buffer = null
    try {
      if (!refusal) { buffer = fs.readFileSync(f.filepath) }
    } catch (err) {
      console.error('[imported-concepts] upload read failed:', err.message)
      refusal = { status: 400, code: 'UPLOAD_FAILED', message: 'That file could not be read' }
    } finally {
      try { fs.unlinkSync(f.filepath) } catch (e) { /* already gone */ }
    }
    if (refusal || !buffer) { return }
    if (buffer.length > ic.MAX_PDF_BYTES) {
      refusal = { status: 413, code: 'FILE_TOO_LARGE', message: 'Each PDF is 20 MB at most' }
    } else if (buffer.slice(0, 5).toString('latin1') !== '%PDF-') {
      refusal = { status: 400, code: 'NOT_A_PDF', message: 'That file is not a PDF' }
    } else {
      buffers.push(buffer)
    }
  })
  return refusal ? Object.assign({ ok: false }, refusal) : { ok: true, buffers }
}

/**
 * A conversion failure as the screen needs it. `UNREADABLE` carries the drawing's §6 sentence
 * on the screen; the rest are ours, and none repeats what the worker said.
 */
function conversionRefusal (err) {
  if (!(err instanceof PdfConvertError)) { throw err }
  if (err.code === FAILURES.UNREADABLE || err.code === FAILURES.PROTECTED) {
    return { status: 422, code: 'UNREADABLE', message: 'That page could not be read' }
  }
  return { status: 422, code: 'CONVERT_FAILED', message: 'That file could not be converted' }
}

async function listView (req) {
  return { concepts: await ic.listForScope(req.firmId), limits: LIMITS }
}

/**
 * @route GET /api/firm-manager/strategy-concepts
 * @returns {{concepts: Array<object>, limits: object}} see `importedConcepts.listForScope`
 */
async function list (req, res) {
  try {
    res.send(200, await listView(req))
  } catch (err) {
    console.error('[imported-concepts] list failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the concepts')
  }
}

/**
 * Convert one PDF so the manager can check it (step 2) or mark its boxes (step 3). Stores
 * nothing: a preview that is abandoned leaves no trace.
 *
 * @route POST /api/firm-manager/strategy-concepts/preview
 * @param {object} req - multipart: one `file` part
 * @returns {{pages: Array<{number: number, width: number, height: number, svg: string,
 *   title: string}>}}
 */
async function preview (req, res) {
  let files
  try {
    ;[, files] = await parseForm(formidable({ maxFileSize: ic.MAX_PDF_BYTES }), req)
  } catch (err) {
    console.error('[imported-concepts] preview parse failed:', err.message)
    return sendError(res, 400, 'UPLOAD_FAILED', 'That file could not be read. It must be a PDF of 20 MB or less.')
  }
  const list = allFiles(files)
  const file = filesOf(files, 'file')
  if (file.length !== 1 || list.length !== 1) {
    discard(list)
    return sendError(res, 400, 'ONE_FILE', 'Send exactly one file, in a field named "file"')
  }
  const read = readPdfs(file)
  if (!read.ok) { return sendError(res, read.status, read.code, read.message) }

  try {
    const pages = await convertPdf(read.buffers[0])
    res.send(200, { pages: pages.map(p => ({ number: p.number, width: p.width, height: p.height, svg: p.svg, title: p.title })) })
  } catch (err) {
    let refusal
    try { refusal = conversionRefusal(err) } catch (e) {
      console.error('[imported-concepts] preview failed:', e.message)
      return sendError(res, 500, 'CONVERT_FAILED', 'That file could not be converted')
    }
    return sendError(res, refusal.status, refusal.code, refusal.message)
  }
}

/**
 * Add a concept at this tier: its teaching PDFs, its Response Form, the boxes marked on it, and
 * the name and section. The PDFs are kept (question 4); the pages stored are this request's own
 * conversion.
 *
 * @route POST /api/firm-manager/strategy-concepts
 * @param {object} req - multipart: `teaching` parts (1 to 5, in teaching order), one `response`
 *   part, and fields `name`, `planningDomain`, `helpsClientTo`, `boxes` (a JSON array of
 *   `{label, x, y, w, h}`, each a fraction of the Response Form page)
 * @returns {{concept: object, concepts: Array<object>, limits: object}} 201
 */
async function save (req, res) {
  let fields, files
  try {
    ;[fields, files] = await parseForm(formidable({ multiples: true, maxFileSize: MAX_REQUEST_BYTES }), req)
  } catch (err) {
    console.error('[imported-concepts] save parse failed:', err.message)
    return sendError(res, 400, 'UPLOAD_FAILED', 'Those files could not be read. Each must be a PDF of 20 MB or less.')
  }

  const teachingFiles = filesOf(files, 'teaching')
  const responseFiles = filesOf(files, 'response')
  const everything = allFiles(files)
  const refuseAll = (status, code, message) => {
    discard(everything)
    return sendError(res, status, code, message)
  }
  if (teachingFiles.length === 0) { return refuseAll(400, 'NO_TEACHING', 'At least one teaching PDF is required') }
  if (teachingFiles.length > ic.MAX_TEACHING_FILES) {
    return refuseAll(400, 'TOO_MANY_FILES', 'A concept takes ' + ic.MAX_TEACHING_FILES + ' teaching PDFs at most')
  }
  // Required, on Mike's ruling of 2026-09-23: "Every concept has a teach and response requirement."
  if (responseFiles.length !== 1) { return refuseAll(400, 'NO_RESPONSE', 'Exactly one Response Form PDF is required') }
  if (everything.length !== teachingFiles.length + 1) { return refuseAll(400, 'UNEXPECTED_FILE', 'Only teaching and response files are accepted') }

  const details = ic.checkDetails({
    name: field(fields, 'name'),
    planningDomain: field(fields, 'planningDomain'),
    helpsClientTo: field(fields, 'helpsClientTo')
  })
  if (!details.ok) { return refuseAll(400, details.code, details.message) }

  let rawBoxes
  try { rawBoxes = JSON.parse(field(fields, 'boxes') || 'null') } catch (e) { rawBoxes = null }
  const boxes = ic.checkBoxes(rawBoxes)
  if (!boxes.ok) { return refuseAll(400, boxes.code, boxes.message) }

  const read = readPdfs(teachingFiles.concat(responseFiles))
  if (!read.ok) { return sendError(res, read.status, read.code, read.message) }
  const teachingBuffers = read.buffers.slice(0, teachingFiles.length)
  const responseBuffer = read.buffers[teachingFiles.length]

  let teachingPages = []
  let responsePages
  try {
    for (const buffer of teachingBuffers) { teachingPages = teachingPages.concat(await convertPdf(buffer)) }
    responsePages = await convertPdf(responseBuffer)
  } catch (err) {
    let refusal
    try { refusal = conversionRefusal(err) } catch (e) {
      console.error('[imported-concepts] save conversion failed:', e.message)
      return sendError(res, 500, 'CONVERT_FAILED', 'Those files could not be converted')
    }
    return sendError(res, refusal.status, refusal.code, refusal.message)
  }
  if (teachingPages.length > ic.MAX_TEACHING_PAGES) {
    return sendError(res, 400, 'TOO_MANY_PAGES', 'A concept teaches from ' + ic.MAX_TEACHING_PAGES + ' pages at most')
  }
  // The boxes were marked on one page, so a form that converts to more than one has no single
  // page for them to belong to.
  if (responsePages.length !== 1) {
    return sendError(res, 400, 'RESPONSE_ONE_PAGE', 'The Response Form must be a single page')
  }

  const who = req.userEmail
  let id
  try {
    id = await ic.mintId(req.firmId, who)
    await sources.saveSources(req.firmId, id, 1,
      teachingBuffers.map((bytes, i) => ({ role: 'teaching', position: i + 1, filename: teachingFiles[i].originalFilename, bytes }))
        .concat([{ role: 'response', position: 1, filename: responseFiles[0].originalFilename, bytes: responseBuffer }]),
      who)
  } catch (err) {
    console.error('[imported-concepts] save failed before the record:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save that concept just now')
  }

  try {
    const record = ic.buildRecord(id, details.value, teachingPages, responsePages[0], boxes.value, who)
    await ic.saveRecord(req.firmId, record, who)
    const view = await listView(req)
    res.send(201, Object.assign({ concept: view.concepts.find(c => c.id === id) || null }, view))
  } catch (err) {
    console.error('[imported-concepts] record save failed:', err.message)
    // The PDFs went in first; a concept that never arrived must not leave a firm's material behind.
    await sources.removeForConcept(req.firmId, id).catch(e => console.error('[imported-concepts] cleanup failed:', e.message))
    return sendError(res, 500, 'DB_ERROR', 'Could not save that concept just now')
  }
}

/**
 * Remove a concept this tier added, with every version of its record and every PDF it was built
 * from. An inherited concept is not this tier's to remove.
 *
 * @route POST /api/firm-manager/strategy-concepts/remove
 * @param {object} req.body - `{ id }`
 * @returns {{concepts: Array<object>, limits: object}}
 */
async function remove (req, res) {
  const id = req.body && req.body.id
  if (typeof id !== 'string' || !ic.ID_PATTERN.test(id)) {
    return sendError(res, 400, 'INVALID_ID', 'That is not a concept id')
  }
  try {
    const own = await ic.readOwn(req.firmId)
    if (!own[id]) {
      return sendError(res, 404, 'NOT_HERE', 'That concept was not added here')
    }
    // PDFs first: if the second step fails the concept is still listed and can be removed again,
    // whereas the other order could leave a firm's material with nothing pointing at it.
    await sources.removeForConcept(req.firmId, id)
    await ic.deleteRecord(req.firmId, id)
    res.send(200, await listView(req))
  } catch (err) {
    console.error('[imported-concepts] remove failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not remove that concept just now')
  }
}

module.exports = { LIMITS, MAX_REQUEST_BYTES, list, preview, save, remove }
