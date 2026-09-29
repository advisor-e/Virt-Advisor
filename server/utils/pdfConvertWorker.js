'use strict'

/**
 * @file The throwaway process that reads one uploaded PDF and turns each page into a drawing.
 * @module server/utils/pdfConvertWorker
 *
 * Item 15.20, Add Concept. NEVER required by the server: `pdfConvert.js` starts this file as
 * its own process, hands it the PDF on stdin, and reads one line of JSON from stdout.
 *
 * 🔴 THIS IS WHERE A HOSTILE FILE IS READ, AND MIKE'S RULING OF 2026-09-24 GOVERNS IT.
 * Every `pdfjs-dist` that runs on Node 14.15 carries CVE-2024-4367 (a crafted font runs its
 * own code). Three conditions contain it, and this file carries the first; the other two are
 * how `pdfConvert.js` starts it:
 *   1. `isEvalSupported: false` on every load — the published workaround.
 *   2. An empty environment, a memory ceiling and a 20-second kill (`pdfConvert.js`).
 *   3. The upload hygiene of the depreciation route (the route, when it is built).
 * See `design/features/strategy-planner.md` §9 and `design/SECURITY-AUDIT-NOTES.md`.
 *
 * NOTHING HERE TALKS TO AN AI — Mike's ruling of 2026-09-23. The page's own text is read
 * locally so step 2 can pre-fill the concept's name.
 *
 * Node 14, CommonJS.
 */

const { JSDOM } = require('jsdom')

/**
 * Where the firm's mark sits on every drawn slide, as fractions of the page. The mark's box is
 * x 86–326, y 766–814 of the 1500 × 844 frame (`scripts/build-concept-graphics.js`); the zone
 * runs from just above it to the bottom edge, because Mike's deck logo starts 0.7% above the
 * box and runs down into the bar band.
 *
 * 🔴 QUESTION 8, RULED 2026-09-24: the firm's mark is painted here, so a picture lying WHOLLY
 * inside this zone is covered and is not stored. Anything crossing its edge is kept — the rule
 * may only ever remove what the mark hides.
 */
const MARK_ZONE = Object.freeze({
  x0: 86 / 1500,
  x1: 326 / 1500,
  y0: 766 / 844 - 0.02,
  y1: 1
})

/**
 * Where a source deck prints its own page number, as fractions of the page: the bottom-right
 * corner, inside the frame. Mike's deck prints it at 91–93% across and 96% down on every page.
 *
 * 🔴 RULED BY MIKE 2026-09-29: the source deck's page number is removed from every imported
 * page, as the covered logo is — it points at a deck the client never sees, beside concepts that
 * carry no number. Only text that is NOTHING BUT one to three digits, lying wholly in this zone,
 * is removed; a word, or a number anywhere else on the page, is kept.
 */
const PAGE_NUMBER_ZONE = Object.freeze({ x0: 0.85, x1: 1, y0: 0.9, y1: 1 })

const PAGE_NUMBER = /^\s*\d{1,3}\s*$/

const IDENTITY = [1, 0, 0, 1, 0, 0]

function multiply (a, b) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5]
  ]
}

/**
 * One `transform` attribute as a matrix. Only the three forms the SVG back-end writes —
 * `matrix`, `scale`, `translate` — are read; anything else leaves the matrix unchanged, which
 * can only make a picture look larger than it is and therefore be kept.
 *
 * @param {string|null} attr
 * @returns {number[]}
 */
function parseTransform (attr) {
  let m = IDENTITY
  String(attr || '').replace(/(matrix|scale|translate)\(([^)]*)\)/g, (_, kind, args) => {
    const n = args.split(/[\s,]+/).filter(Boolean).map(Number)
    if (n.some(v => !Number.isFinite(v))) { return '' }
    const step = kind === 'matrix'
      ? n.slice(0, 6)
      : kind === 'scale'
        ? [n[0], 0, 0, n[1] === undefined ? n[0] : n[1], 0, 0]
        : [1, 0, 0, 1, n[0], n[1] || 0]
    if (step.length === 6) { m = multiply(m, step) }
    return ''
  })
  return m
}

/**
 * The box a picture occupies on the page, as fractions of the page's width and height.
 *
 * @param {Element} image
 * @param {number} width - the page's width in points
 * @param {number} height - the page's height in points
 * @returns {{x0:number, x1:number, y0:number, y1:number}}
 */
function imageBox (image, width, height) {
  const chain = []
  for (let el = image; el && el.getAttribute; el = el.parentNode) { chain.unshift(el) }
  const m = chain.reduce((acc, el) => multiply(acc, parseTransform(el.getAttribute('transform'))), IDENTITY)
  const x = parseFloat(image.getAttribute('x')) || 0
  const y = parseFloat(image.getAttribute('y')) || 0
  const w = parseFloat(image.getAttribute('width')) || 0
  const h = parseFloat(image.getAttribute('height')) || 0
  const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]
    .map(([px, py]) => [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]])
  const xs = corners.map(c => c[0] / width)
  const ys = corners.map(c => c[1] / height)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

function insideMarkZone (box) {
  return box.x0 >= MARK_ZONE.x0 && box.x1 <= MARK_ZONE.x1 &&
    box.y0 >= MARK_ZONE.y0 && box.y1 <= MARK_ZONE.y1
}

/**
 * Removes every picture the firm's mark covers, and returns how many went.
 *
 * @param {Element} svg - the page's root element
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function dropCoveredImages (svg, width, height) {
  const covered = Array.from(svg.getElementsByTagName('*'))
    .filter(el => el.localName === 'image' && insideMarkZone(imageBox(el, width, height)))
  covered.forEach(el => el.parentNode.removeChild(el))
  return covered.length
}

/**
 * Where the page's own text layer places a page number, if it has one: each item that is only
 * digits and lies wholly inside `PAGE_NUMBER_ZONE`, as fractions of the page.
 *
 * @param {Array<{str:string, transform:number[], width:number}>} items - `getTextContent().items`
 * @param {{width:number, height:number, convertToViewportPoint:function}} viewport
 * @returns {Array<{x0:number, x1:number, y:number}>}
 */
function pageNumberSpots (items, viewport) {
  return items
    .filter(i => PAGE_NUMBER.test(String(i.str || '')) && Array.isArray(i.transform))
    .map((i) => {
      const [x, y] = viewport.convertToViewportPoint(i.transform[4], i.transform[5])
      const x0 = x / viewport.width
      return { x0, x1: x0 + (Number(i.width) || 0) / viewport.width, y: y / viewport.height }
    })
    .filter(s => s.x0 >= PAGE_NUMBER_ZONE.x0 && s.x1 <= PAGE_NUMBER_ZONE.x1 &&
      s.y >= PAGE_NUMBER_ZONE.y0 && s.y <= PAGE_NUMBER_ZONE.y1)
}

/**
 * Where one drawn `<text>` starts, as fractions of the page: its transform chain applied to the
 * first glyph's position. The drawn glyphs are font codes, not characters, so a page number is
 * found by where it sits, never by what it says.
 */
function textOrigin (text, width, height) {
  const chain = []
  for (let el = text; el && el.getAttribute; el = el.parentNode) { chain.unshift(el) }
  const m = chain.reduce((acc, el) => multiply(acc, parseTransform(el.getAttribute('transform'))), IDENTITY)
  const span = Array.from(text.childNodes).find(c => c.localName === 'tspan' && c.getAttribute('x'))
  const x = span ? parseFloat(span.getAttribute('x').split(/\s+/)[0]) || 0 : 0
  return { x: (m[0] * x + m[4]) / width, y: (m[1] * x + m[5]) / height }
}

/**
 * Removes the drawn text at each page-number spot, and returns how many elements went.
 *
 * @param {Element} svg
 * @param {Array<{x0:number, x1:number, y:number}>} spots - from `pageNumberSpots`
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function dropPageNumber (svg, spots, width, height) {
  if (!spots.length) { return 0 }
  const SLACK = 0.005
  const gone = Array.from(svg.getElementsByTagName('*')).filter((el) => {
    if (el.localName !== 'text') { return false }
    const o = textOrigin(el, width, height)
    return spots.some(s => Math.abs(o.y - s.y) <= 0.01 && o.x >= s.x0 - SLACK && o.x <= s.x1 + SLACK)
  })
  gone.forEach(el => el.parentNode.removeChild(el))
  return gone.length
}

/**
 * The serialised page, made plain SVG.
 *
 * 🔴 EVERY `ns<N>:href`, NEVER ONE. `XMLSerializer` gives each `<image>` its own xlink prefix —
 * `ns1:href`, `ns2:href`, `ns3:href` — and a rewrite that handles one silently strips the
 * picture from the others while they keep their size and position. It read exactly like a
 * converter that lost content (Brief §9, 2026-09-23). The `svg:` element prefix the back-end
 * writes goes too, so the sanitiser sees ordinary SVG.
 *
 * @param {string} xml
 * @returns {string}
 */
function plainSvg (xml) {
  return xml
    .replace(/<(\/?)svg:/g, '<$1')
    .replace(/\s+xmlns:svg="[^"]*"/g, '')
    .replace(/\s+xmlns:ns\d+="[^"]*"/g, '')
    .replace(/\bns\d+:href=/g, 'href=')
}

/**
 * The page's likely title: the tallest line of text, read from the page itself.
 *
 * @param {Array<{str:string, transform:number[]}>} items
 * @returns {string}
 */
function titleOf (items) {
  let best = null
  items.forEach((item) => {
    const text = String(item.str || '').trim()
    if (!text) { return }
    const size = Math.abs((item.transform && item.transform[3]) || 0)
    if (!best || size > best.size) { best = { text, size } }
  })
  return best ? best.text : ''
}

/**
 * Converts every page of one PDF.
 *
 * @param {Uint8Array} data - the file's bytes
 * @param {object} pdfjs - `pdfjs-dist/legacy/build/pdf.js`, passed in so a test can supply its own
 * @param {object} window - a jsdom window: the SVG back-end draws into `document`
 * @returns {Promise<{pages: Array<object>}>}
 */
async function convert (data, pdfjs, window) {
  const doc = await pdfjs.getDocument({
    data,
    isEvalSupported: false, // 🔴 CVE-2024-4367. Never remove — Mike's ruling, 2026-09-24.
    disableFontFace: true,
    fontExtraProperties: true,
    useSystemFonts: false,
    verbosity: 0
  }).promise

  const pages = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const viewport = page.getViewport({ scale: 1 })
    const opList = await page.getOperatorList()
    const gfx = new pdfjs.SVGGraphics(page.commonObjs, page.objs, true)
    gfx.embedFonts = true
    const svg = await gfx.getSVG(opList, viewport)
    const dropped = dropCoveredImages(svg, viewport.width, viewport.height)
    const items = (await page.getTextContent()).items || []
    const numberDropped = dropPageNumber(svg, pageNumberSpots(items, viewport), viewport.width, viewport.height)
    const markup = plainSvg(new window.XMLSerializer().serializeToString(svg))
    const text = items.map(i => String(i.str || '').trim()).filter(Boolean)
    const paths = (markup.match(/<path\b/g) || []).length
    pages.push({
      number: n,
      width: viewport.width,
      height: viewport.height,
      svg: markup,
      title: titleOf(items),
      text,
      // A scan has no text and no shapes — only a photograph of a page. It converts to an
      // unreadable block, so it is reported rather than passed on (the drawing, §6).
      readable: text.length > 0 || paths > 0,
      droppedImages: dropped,
      droppedPageNumber: numberDropped
    })
    page.cleanup()
  }
  await doc.destroy()
  return { pages }
}

/**
 * The process entry: PDF bytes on stdin, one line of JSON on stdout.
 *
 * `console` is pointed at stderr first. The reader prints its own warnings — *"The SVG
 * back-end is no longer maintained"* — and on stdout they would corrupt the only line the
 * server reads.
 */
function main () {
  const toStderr = (...args) => process.stderr.write(args.join(' ') + '\n')
  console.log = console.info = console.warn = toStderr

  const chunks = []
  process.stdin.on('data', c => chunks.push(c))
  process.stdin.on('end', async () => {
    try {
      const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')
      global.document = window.document
      const pdfjs = require('pdfjs-dist/legacy/build/pdf.js')
      const result = await convert(new Uint8Array(Buffer.concat(chunks)), pdfjs, window)
      process.stdout.write(JSON.stringify({ ok: true, pages: result.pages }) + '\n')
      process.exitCode = 0
    } catch (err) {
      // The reader's own message goes to stderr for the server log; the stdout line names a
      // category only, so nothing a hostile file wrote reaches a screen.
      toStderr('[pdfConvertWorker] ' + (err && err.name) + ': ' + (err && err.message))
      const code = err && err.name === 'PasswordException' ? 'PROTECTED' : 'UNREADABLE'
      process.stdout.write(JSON.stringify({ ok: false, code }) + '\n')
      process.exitCode = 2
    }
  })
}

if (require.main === module) { main() }

module.exports = { MARK_ZONE, PAGE_NUMBER_ZONE, parseTransform, imageBox, dropCoveredImages, pageNumberSpots, textOrigin, dropPageNumber, plainSvg, titleOf, convert }
