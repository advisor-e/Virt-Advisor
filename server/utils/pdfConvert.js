'use strict'

/**
 * @file Turning one uploaded PDF into clean page drawings, without the server ever reading it.
 * @module server/utils/pdfConvert
 *
 * Item 15.20, Add Concept. The server never opens an uploaded PDF itself: `convertPdf` starts
 * `pdfConvertWorker.js` as a separate process and believes nothing it sends back until every
 * field has been checked and every drawing cleaned.
 *
 * 🔴 MIKE'S RULING OF 2026-09-24 — THE READER'S KNOWN FLAW IS CONTAINED THREE WAYS. The
 * reader (`pdfjs-dist` 2.16.105) carries CVE-2024-4367 on every version Node 14.15 can run.
 * This file carries the second condition:
 *   - AN EMPTY ENVIRONMENT. The worker is given no database password and no OpenAI key; on
 *     Linux it sees nothing at all, on Windows only the handful of system paths the OS adds.
 *   - A MEMORY CEILING (`MEMORY_MB`) and A KILL AT 20 SECONDS (`TIMEOUT_MS`). A reading inside
 *     the server's own process could not be interrupted; this one simply ends.
 *   - AN OUTPUT CAP (`MAX_OUTPUT_BYTES`), so a hostile file cannot flood the server's memory
 *     through the one channel it has back.
 * See `design/features/strategy-planner.md` §9 and `design/SECURITY-AUDIT-NOTES.md`.
 *
 * 🔴 NOTHING THE WORKER RETURNS IS TRUSTED. It is the process a hostile file ran in. Its reply
 * is shape-checked (`validateReply`), and each drawing is put through `isomorphic-dompurify`
 * (`cleanSvg`) with a second pass that keeps only embedded `data:` pictures and fonts — so a
 * converted page can never carry a script, an event handler, or a link that calls out to
 * anywhere when it is shown to a client.
 *
 * Node 14, CommonJS.
 */

const path = require('path')
const { spawn } = require('child_process')
const DOMPurify = require('isomorphic-dompurify')

/** Mike's ruling, 2026-09-24: the worker is killed at 20 seconds. */
const TIMEOUT_MS = 20000

/** The worker's heap ceiling. Page 11 of Organisational Review converts well inside it. */
const MEMORY_MB = 256

/** The most the worker may send back. Beyond it the worker is killed and nothing is used. */
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024

/** The most of the worker's stderr kept for the server log. */
const MAX_LOG_BYTES = 4096

const WORKER = path.join(__dirname, 'pdfConvertWorker.js')

/**
 * Why a conversion produced nothing. The route turns each into a message; the drawing's §6
 * wording covers `UNREADABLE` and `PROTECTED`.
 */
const FAILURES = Object.freeze({
  UNREADABLE: 'UNREADABLE', // the reader could not make sense of it, or every page is a scan
  PROTECTED: 'PROTECTED', // password-protected
  TIMEOUT: 'TIMEOUT', // killed at TIMEOUT_MS
  TOO_LARGE: 'TOO_LARGE', // its reply passed MAX_OUTPUT_BYTES
  FAILED: 'FAILED' // the worker died, or replied with something that is not a reply
})

class PdfConvertError extends Error {
  constructor (code, detail) {
    super('PDF conversion failed: ' + code)
    this.name = 'PdfConvertError'
    this.code = code
    this.detail = detail || ''
  }
}

const isNumber = v => typeof v === 'number' && Number.isFinite(v)
const isText = v => typeof v === 'string'

/**
 * Checks the worker's reply before any of it is used.
 *
 * @param {*} reply - the parsed stdout line
 * @returns {{ok:true, pages:object[]}|{ok:false, code:string}}
 * @throws {PdfConvertError} FAILED when the reply is not the shape the worker writes
 */
function validateReply (reply) {
  if (!reply || typeof reply !== 'object') { throw new PdfConvertError(FAILURES.FAILED, 'not an object') }
  if (reply.ok === false) {
    const known = [FAILURES.UNREADABLE, FAILURES.PROTECTED]
    return { ok: false, code: known.includes(reply.code) ? reply.code : FAILURES.FAILED }
  }
  if (reply.ok !== true || !Array.isArray(reply.pages) || reply.pages.length === 0) {
    throw new PdfConvertError(FAILURES.FAILED, 'no pages')
  }
  reply.pages.forEach((p, i) => {
    const sound = p && typeof p === 'object' &&
      isNumber(p.number) && isNumber(p.width) && p.width > 0 && isNumber(p.height) && p.height > 0 &&
      isText(p.svg) && isText(p.title) && Array.isArray(p.text) && p.text.every(isText) &&
      typeof p.readable === 'boolean' && isNumber(p.droppedImages)
    if (!sound) { throw new PdfConvertError(FAILURES.FAILED, 'page ' + (i + 1) + ' is malformed') }
  })
  return { ok: true, pages: reply.pages }
}

/**
 * Only an embedded picture or font may stay. Anything pointing elsewhere would make a client's
 * screen fetch from an address the uploader chose.
 */
const EMBEDDED_IMAGE = /^data:image\/(png|jpeg|gif);base64,[A-Za-z0-9+/=\s]*$/
const CSS_URL = /url\(\s*(['"]?)([^'")]*)\1\s*\)/gi

function onlyEmbedded (css) {
  let clean = true
  String(css).replace(CSS_URL, (_, q, target) => {
    if (!/^data:(font|application)\//i.test(target.trim())) { clean = false }
    return ''
  })
  return clean
}

/**
 * One converted page, made safe to show a client.
 *
 * @param {string} svg - the worker's drawing
 * @returns {string} the cleaned drawing, or '' when nothing drawable survived
 */
function cleanSvg (svg) {
  const fragment = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'],
    RETURN_DOM_FRAGMENT: true
  })
  const root = fragment.firstElementChild
  if (!root || root.localName !== 'svg') { return '' }

  Array.from(root.getElementsByTagName('*')).forEach((el) => {
    if (!el.parentNode) { return }
    if (el.localName === 'image') {
      const href = el.getAttribute('href') || el.getAttribute('xlink:href') || ''
      if (!EMBEDDED_IMAGE.test(href)) { el.parentNode.removeChild(el) }
      return
    }
    if (el.localName === 'style' && !onlyEmbedded(el.textContent)) {
      el.parentNode.removeChild(el)
      return
    }
    const style = el.getAttribute('style')
    if (style && !onlyEmbedded(style)) { el.removeAttribute('style') }
  })
  return root.outerHTML
}

/**
 * Runs the worker on one PDF. Separated from `convertPdf` so a test can start a stand-in.
 *
 * @param {Buffer} bytes
 * @param {{worker?:string, timeoutMs?:number, maxOutputBytes?:number, log?:Function}} [opts]
 * @returns {Promise<*>} the parsed reply line
 */
function runWorker (bytes, opts = {}) {
  const worker = opts.worker || WORKER
  const timeoutMs = opts.timeoutMs || TIMEOUT_MS
  const maxOutput = opts.maxOutputBytes || MAX_OUTPUT_BYTES
  const log = opts.log || (msg => console.error(msg))

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--max-old-space-size=' + MEMORY_MB, worker], {
      env: {}, // 🔴 no secrets reach the process a hostile file runs in
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    })

    let out = []
    let outBytes = 0
    let errText = ''
    let settled = false

    const finish = (fn, value) => {
      if (settled) { return }
      settled = true
      clearTimeout(timer)
      if (child.exitCode === null) { child.kill('SIGKILL') }
      // Only on failure: every success carries the reader's "SVG back-end is no longer
      // maintained" warning, and logging it each time would bury the one that matters.
      const failed = fn === reject || !value || value.ok !== true
      if (failed && errText) { log('[pdfConvert] worker said: ' + errText.slice(-MAX_LOG_BYTES)) }
      fn(value)
    }

    const timer = setTimeout(() => finish(reject, new PdfConvertError(FAILURES.TIMEOUT)), timeoutMs)

    child.stdout.on('data', (chunk) => {
      outBytes += chunk.length
      if (outBytes > maxOutput) {
        out = []
        finish(reject, new PdfConvertError(FAILURES.TOO_LARGE))
        return
      }
      out.push(chunk)
    })
    child.stderr.on('data', (chunk) => {
      errText = (errText + chunk).slice(-MAX_LOG_BYTES)
    })
    child.on('error', err => finish(reject, new PdfConvertError(FAILURES.FAILED, err.message)))
    child.on('close', () => {
      const line = Buffer.concat(out).toString('utf8').trim()
      try {
        finish(resolve, JSON.parse(line))
      } catch (e) {
        finish(reject, new PdfConvertError(FAILURES.FAILED, 'reply is not JSON'))
      }
    })

    // A worker that dies before reading everything must not crash the server with EPIPE.
    child.stdin.on('error', () => {})
    child.stdin.end(bytes)
  })
}

/**
 * Converts one uploaded PDF into clean, checked page drawings.
 *
 * @param {Buffer} bytes - the file, already size-capped and magic-byte-checked by the route
 * @param {object} [opts] - see `runWorker`; tests only
 * @returns {Promise<Array<{number:number, width:number, height:number, svg:string,
 *   title:string, text:string[], droppedImages:number}>>} one entry per readable page
 * @throws {PdfConvertError} with `code` from `FAILURES`
 */
async function convertPdf (bytes, opts) {
  const reply = validateReply(await runWorker(bytes, opts))
  if (!reply.ok) { throw new PdfConvertError(reply.code) }

  const pages = reply.pages
    .filter(p => p.readable)
    .map(p => ({ ...p, svg: cleanSvg(p.svg) }))
    .filter(p => p.svg)
  if (pages.length === 0) { throw new PdfConvertError(FAILURES.UNREADABLE) }
  return pages.map(({ readable, ...page }) => page)
}

module.exports = {
  TIMEOUT_MS,
  MEMORY_MB,
  MAX_OUTPUT_BYTES,
  FAILURES,
  PdfConvertError,
  validateReply,
  cleanSvg,
  runWorker,
  convertPdf
}
