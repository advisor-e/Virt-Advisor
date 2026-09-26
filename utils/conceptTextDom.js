/**
 * @file Reading, redrawing and fit-checking a concept page's text in the browser. Item 15.25.
 *
 * The pure rules — which lines make a block, what a block is called, how words wrap — are in
 * `utils/conceptTextBlocks.js`. This file is the half that needs a rendered page.
 *
 * Approved design: `design/mockups/strategy-edit-text-test.html` (Mike, 2026-09-25).
 * 🔴 ONE DELIBERATE DIFFERENCE FROM THAT TEST, AND IT IS A CORRECTION: the test found what
 * an edit runs into by asking the screen which element sits under each point. That only
 * answers for the part of the page currently scrolled into view, so an edit to a page lower
 * down would have reported "fits" whatever it hit. This asks each shape directly
 * (`isPointInFill` / `isPointInStroke`), which works wherever the page is.
 *
 * 🔴 NOTHING HERE WRITES TO THE DRAWING'S OWN LINES. An edited block's original lines are
 * hidden and new lines drawn beside them; "Put back the original" removes ours and shows
 * his again. The drawing is never altered, only covered, for this session.
 *
 * Browser-only: call from `mounted()` or a click handler, never during render.
 */
import { groupLines, blockKey, normaliseWords, wrapText } from './conceptTextBlocks'

/** Never editable: the firm's mark, and the agenda lines that come from the session's steps. */
const NOT_EDITABLE = '[class*="firm"],[id*="firm"],[class*="fm-"],.agenda-slot'

/** Never collided with: definitions and the like are not painted. */
const NOT_PAINTED = 'defs,clipPath,mask,pattern,marker,symbol,title,desc,style,script'

/** Page units between the points sampled across a line when checking the fit. */
const STEP = 4

/** Marks the lines we draw, so a second read of the page never mistakes them for his. */
const OURS = 'data-cte-line'

/** Marks the red outline drawn round what an edit runs into. */
const HIT_MARK = 'data-cte-hit'

const isHidden = el => !!el.closest('[style*="display: none"],[style*="display:none"]')

/**
 * The width of some words in one line's own font, measured by the browser.
 * @param {SVGTextElement} tpl a line whose font to use
 * @param {string} s
 * @returns {number} in page units
 */
function measure (tpl, s) {
  const probe = tpl.cloneNode(false)
  probe.removeAttribute('textLength')
  probe.removeAttribute('lengthAdjust')
  probe.removeAttribute(OURS)
  probe.style.display = ''
  probe.setAttribute('visibility', 'hidden')
  probe.textContent = s
  tpl.parentNode.appendChild(probe)
  const w = probe.getComputedTextLength()
  probe.remove()
  return w
}

/**
 * The matrix taking a point from one element's own space into the page's.
 * @param {SVGSVGElement} svg
 * @param {SVGGraphicsElement} el
 * @returns {DOMMatrix}
 */
function toPage (svg, el) {
  return svg.getScreenCTM().inverse().multiply(el.getScreenCTM())
}

/**
 * An element's bounding box in page units.
 * @returns {{x: number, y: number, w: number, h: number}}
 */
function pageBox (svg, el) {
  const b = el.getBBox()
  const m = toPage(svg, el)
  const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
    .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m))
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/**
 * The points sampled across some lines, in page units. A text box is taller than its ink,
 * so the top and bottom sixth are left out — adjacent lines of one paragraph touch otherwise.
 * @returns {Array<{x: number, y: number}>}
 */
function samplePoints (svg, lines) {
  const out = []
  lines.forEach((el) => {
    const b = pageBox(svg, el)
    for (let y = b.y + b.h / 6; y <= b.y + b.h * 5 / 6; y += STEP) {
      for (let x = b.x + 1; x <= b.x + b.w - 1; x += STEP) { out.push({ x, y }) }
    }
  })
  return out
}

/**
 * Everything painted on the page that an edit could run into, with how to test a point.
 * @param {SVGSVGElement} svg
 * @returns {Array<{el: Element, box: object, hits: function({x:number,y:number}): boolean}>}
 */
function paintedShapes (svg) {
  const vb = svg.viewBox.baseVal
  const out = []
  svg.querySelectorAll('path,circle,rect,ellipse,polygon,polyline,line,image,text').forEach((el) => {
    if (el.closest(NOT_PAINTED) || isHidden(el) || el.hasAttribute(HIT_MARK)) { return }
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) { return }
    const box = pageBox(svg, el)
    // The white sheet behind everything is not something an edit runs into.
    if (el.tagName === 'rect' && box.w >= vb.width - 1 && box.h >= vb.height - 1) { return }
    if (el.tagName === 'text' || el.tagName === 'image') {
      out.push({ el, box, hits: p => p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h })
      return
    }
    const filled = cs.fill !== 'none' && Number(cs.fillOpacity) > 0
    const stroked = cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0 && Number(cs.strokeOpacity) > 0
    if (!filled && !stroked) { return }
    const inv = svg.getScreenCTM().inverse().multiply(el.getScreenCTM()).inverse()
    // ⚠ AN SVGPoint, NOT A DOMPoint. Chrome's isPointInFill/isPointInStroke refuse the
    // newer DOMPoint ("parameter 1 is not of type 'SVGPoint'") — found by running the app;
    // jsdom has neither method, so no unit test could have caught it.
    const q = svg.createSVGPoint()
    out.push({
      el,
      box,
      hits: (p) => {
        const t = new DOMPoint(p.x, p.y).matrixTransform(inv)
        q.x = t.x
        q.y = t.y
        return (filled && el.isPointInFill(q)) || (stroked && el.isPointInStroke(q))
      }
    })
  })
  return out
}

/**
 * Read a rendered page into its editable blocks.
 *
 * ⚠ CALL IT BEFORE ANY EDIT IS APPLIED, AND ONCE. What a block overlaps as drawn is measured
 * here — the shapes it already sits on or inside — so the fit check can tell a label that
 * was always inside its circle from one an edit pushed out of it. The page's fonts must be
 * loaded first, or every width is a stand-in font's (the test's own first fault).
 *
 * @param {SVGSVGElement} svg
 * @returns {Array<object>} blocks, each `{ key, index, lines, original, width, wrapWidth,
 *   justified, pinned, x, y0, lh, touches: Set<Element>, insideOf: Element[] }`
 */
export function readBlocks (svg) {
  const lines = Array.from(svg.querySelectorAll('text'))
    .filter(t => t.getAttribute('y') !== null && !t.hasAttribute(OURS) && !t.closest(NOT_EDITABLE) && !isHidden(t))
  const descs = lines.map((t) => {
    const cs = getComputedStyle(t)
    return {
      x: parseFloat(t.getAttribute('x')) || 0,
      y: parseFloat(t.getAttribute('y')) || 0,
      fontSize: parseFloat(cs.fontSize) || 0,
      look: [cs.fontSize, cs.fontWeight, cs.fontStyle, cs.fill, cs.textAnchor].join('|')
    }
  })
  const shapes = paintedShapes(svg)

  return groupLines(descs).map((idx, index) => {
    const els = idx.map(i => lines[i])
    const naturals = els.map(el => measure(el, el.textContent))
    const pinnedWidths = els.map(el => parseFloat(el.getAttribute('textLength')) || 0)
    const width = Math.max(...els.map((el, i) => pinnedWidths[i] || naturals[i]))
    // His pinned lines are sometimes squeezed a little to match his page. Wrapping at the
    // pinned width alone would break his own words differently from his page.
    const squeeze = Math.min(1, ...pinnedWidths.map((p, i) => (p && naturals[i] ? p / naturals[i] : 1)))
    const gaps = els.slice(1).map((el, i) => descs[idx[i + 1]].y - descs[idx[i]].y).sort((a, b) => a - b)
    const original = normaliseWords(els.map(el => el.textContent).join(' '))

    const points = samplePoints(svg, els)
    const counts = new Map()
    points.forEach(p => shapes.forEach((s) => {
      if (!els.includes(s.el) && s.hits(p)) { counts.set(s.el, (counts.get(s.el) || 0) + 1) }
    }))

    return {
      key: blockKey(index, original),
      index,
      lines: els,
      drawn: [],
      original,
      width,
      wrapWidth: width / squeeze,
      justified: els.length > 1 && els.slice(0, -1).every(el => el.hasAttribute('textLength')),
      pinned: pinnedWidths.some(Boolean),
      x: descs[idx[0]].x,
      y0: descs[idx[0]].y,
      lh: gaps.length ? gaps[Math.floor(gaps.length / 2)] : descs[idx[0]].fontSize * 1.3,
      touches: new Set(counts.keys()),
      insideOf: Array.from(counts.entries()).filter(([, n]) => n >= points.length * 0.95).map(([el]) => el)
    }
  })
}

/**
 * Draw a block's words: the advisor's, or null to show his original again.
 * @param {object} block from `readBlocks`
 * @param {string|null} text
 */
export function drawBlock (block, text) {
  block.drawn.forEach(el => el.remove())
  block.drawn = []
  if (text === null || normaliseWords(text) === block.original) {
    block.lines.forEach((el) => { el.style.display = '' })
    return
  }
  const tpl = block.lines[0]
  block.lines.forEach((el) => { el.style.display = 'none' })
  block.drawn = wrapText(text, block.wrapWidth, s => measure(tpl, s)).map((ln, k) => {
    const el = tpl.cloneNode(false)
    el.style.display = ''
    el.removeAttribute('textLength')
    el.removeAttribute('lengthAdjust')
    el.setAttribute(OURS, block.key)
    el.setAttribute('y', (block.y0 + k * block.lh).toFixed(1))
    el.textContent = ln.s
    const natural = measure(tpl, ln.s)
    if ((block.pinned && natural > block.width) || (block.justified && ln.full)) {
      el.setAttribute('textLength', block.width.toFixed(1))
      el.setAttribute('lengthAdjust', 'spacing')
    }
    tpl.parentNode.insertBefore(el, tpl)
    return el
  })
}

/**
 * Whether a block's words, as currently drawn, fit the page — and if not, what they run into.
 *
 * Fits means: nothing leaves the page; nothing touches a painted shape or another block's text
 * that the original did not already touch; and a block drawn inside a shape (a label in a
 * circle) stays wholly inside it.
 *
 * @param {SVGSVGElement} svg
 * @param {object} block from `readBlocks`, after `drawBlock`
 * @returns {{fits: boolean, hit: Element|null}} `hit` is what to outline; the page itself
 *   when the words run off it
 */
export function checkFit (svg, block) {
  const lines = block.drawn.length ? block.drawn : block.lines
  const vb = svg.viewBox.baseVal
  const off = lines.some((el) => {
    const b = pageBox(svg, el)
    return b.x < vb.x - 1 || b.y < vb.y - 1 || b.x + b.w > vb.x + vb.width + 1 || b.y + b.h > vb.y + vb.height + 1
  })
  if (off) { return { fits: false, hit: svg } }

  const points = samplePoints(svg, lines)
  const boxes = lines.map(l => pageBox(svg, l))
  const all = paintedShapes(svg)
  const others = all.filter(s => !lines.includes(s.el) && !block.lines.includes(s.el) && !block.touches.has(s.el))
  for (let i = 0; i < others.length; i++) {
    const s = others[i]
    // Only shapes whose box meets the words can be hit; skipping the rest keeps this fast.
    if (boxes.some(b => overlaps(s.box, b)) && points.some(p => s.hits(p))) { return { fits: false, hit: s.el } }
  }
  const container = block.insideOf.find((c) => {
    const s = all.find(x => x.el === c)
    return s && points.some(p => !s.hits(p))
  })
  if (container) { return { fits: false, hit: container } }
  return { fits: true, hit: null }
}

/**
 * Outline in red what an edit runs into, so the advisor can see what to shorten around.
 * Approved with the wording: `design/STRATEGY-EDIT-TEXT-WORDING.md`.
 * @param {SVGSVGElement} svg
 * @param {Element|null} el null clears the outline
 */
export function markHit (svg, el) {
  svg.querySelectorAll('[' + HIT_MARK + ']').forEach(m => m.remove())
  if (!el) { return }
  const vb = svg.viewBox.baseVal
  const b = el === svg ? { x: vb.x, y: vb.y, w: vb.width, h: vb.height } : pageBox(svg, el)
  const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  r.setAttribute(HIT_MARK, '')
  r.setAttribute('x', (b.x - 4).toFixed(1))
  r.setAttribute('y', (b.y - 4).toFixed(1))
  r.setAttribute('width', (b.w + 8).toFixed(1))
  r.setAttribute('height', (b.h + 8).toFixed(1))
  r.setAttribute('rx', '6')
  r.setAttribute('fill', 'none')
  r.setAttribute('stroke', '#c0392b')
  r.setAttribute('stroke-width', '5')
  r.setAttribute('pointer-events', 'none')
  svg.appendChild(r)
}

/**
 * The block a clicked element belongs to — one of his lines, or one we drew.
 * @param {Array<object>} blocks
 * @param {Element} target
 * @returns {object|null}
 */
export function blockAt (blocks, target) {
  const t = target && target.closest ? target.closest('text') : null
  if (!t) { return null }
  return blocks.find(b => b.lines.includes(t) || b.drawn.includes(t)) || null
}
