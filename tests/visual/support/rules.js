'use strict'

/**
 * Rules 1-3, as one function that runs inside the browser.
 *
 * The standards are in `design/VISUAL-CHECKS.md`. If this file disagrees with that page,
 * the page wins and this file is the defect. Do not add a rule that is not written there.
 *
 * `collectFailures` is serialised by `page.evaluate()`, so it may not close over anything
 * in this module. Rule 4 is observed from outside the page and lives in `visual.js`.
 */

/**
 * Runs rules 1 to 3 against the page currently loaded in the browser.
 *
 * @returns {Array<{rule: string, detail: string}>} one entry per breach, empty when the
 *   screen meets every standard. Rule 3 contributes at most one entry.
 */
function collectFailures () {
  const failures = []

  // Only what is ACTUALLY VISIBLE is measured. The hubs keep every panel in the DOM and
  // hide all but one with `v-show`, so without this the checks would measure fifteen
  // closed panels.
  const isVisible = (el) => {
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) { return false }
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') { return false }
    if (parseFloat(style.opacity) === 0) { return false }
    return true
  }

  // Names the offending element in the failure message.
  const describe = (el) => {
    let name = el.tagName.toLowerCase()
    if (el.id) { name += '#' + el.id }
    if (el.className && typeof el.className === 'string') {
      const cls = el.className.trim().split(/\s+/).slice(0, 2).join('.')
      if (cls) { name += '.' + cls }
    }
    const label = (el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim()
    if (label) { name += ' [' + label.slice(0, 40) + ']' }
    return name
  }

  // The element's own computed font, on a canvas: how wide would this be drawn?
  let canvas = null
  const measureText = (text, style) => {
    if (!text) { return 0 }
    if (!canvas) { canvas = document.createElement('canvas') }
    const ctx = canvas.getContext('2d')
    ctx.font = [style.fontStyle, style.fontWeight, style.fontSize + '/' + style.lineHeight, style.fontFamily].join(' ')
    return ctx.measureText(text).width
  }

  const innerWidthOf = (el, style) => {
    return el.getBoundingClientRect().width -
      parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0) -
      parseFloat(style.borderLeftWidth || 0) - parseFloat(style.borderRightWidth || 0)
  }

  // ── Rule 1 — a box you type into is wide enough to show what you typed ────────────
  // Part 1: a content-independent FLOOR on every control (furniture + 2 chars) — cannot
  // cry wolf, and catches the phasing boxes at ~13px of inner width.
  // Part 2: the full value fit, on `number` and `select` ONLY. Free-text boxes are built
  // to scroll, so a long typed value overflowing one is not a defect.
  const SPINNER_PX = 16 // the number stepper Chromium draws inside type="number"
  const ARROW_PX = 20 // the dropdown arrow a <select> draws inside its own box
  const MIN_CHARS = 2 // the floor, in characters, on top of the furniture

  const SKIPPED_TYPES = ['checkbox', 'radio', 'range', 'color', 'file', 'hidden', 'submit', 'button', 'reset', 'image']

  const controls = document.querySelectorAll('input, select, textarea')
  for (let c = 0; c < controls.length; c++) {
    const control = controls[c]
    const type = (control.getAttribute('type') || '').toLowerCase()
    if (SKIPPED_TYPES.includes(type)) { continue }
    if (!isVisible(control)) { continue }

    const style = window.getComputedStyle(control)
    const inner = innerWidthOf(control, style)
    const tag = control.tagName.toLowerCase()

    // The arrow is charged for ONCE: Buefy reserves it in `padding-right`, which
    // `innerWidthOf` has already removed. Adding a flat 20px on top reported four sound
    // dropdowns as too narrow.
    let furniture = 0
    if (tag === 'select') {
      furniture = Math.max(0, ARROW_PX - parseFloat(style.paddingRight || 0))
    } else if (type === 'number') {
      // Drawn inside the content box, never covered by padding.
      furniture = SPINNER_PX
    }

    // Part 1 — the floor. Content-independent, so it cannot cry wolf.
    const floorNeeded = furniture + measureText('00'.slice(0, MIN_CHARS), style)
    if (inner < floorNeeded - 0.5) {
      failures.push({
        rule: 'Rule 1 — a box you type into is wide enough to show what you typed',
        detail: describe(control) + ' has ' + Math.round(inner) + 'px of inner width; it needs at least ' +
          Math.round(floorNeeded) + 'px to show its own controls and two characters. It is holding "' +
          String(control.value).slice(0, 20) + '".'
      })
      continue
    }

    // Part 2 — the full value fit, for bounded values only.
    let bounded = null
    if (tag === 'select') {
      const chosen = control.options[control.selectedIndex]
      bounded = chosen ? chosen.text : ''
    } else if (type === 'number') {
      bounded = String(control.value || '')
    }
    if (bounded) {
      const needed = measureText(bounded, style) + furniture
      if (needed > inner + 0.5) {
        failures.push({
          rule: 'Rule 1 — a box you type into is wide enough to show what you typed',
          detail: describe(control) + ' holds "' + bounded + '", which needs ' + Math.round(needed) +
            'px, but the box gives it ' + Math.round(inner) + 'px of inner width.'
        })
      }
    }
  }

  // ── Rule 2 — no text is cut off ───────────────────────────────────────────────────
  // A fault ONLY where the box hides the overflow. `overflow: auto` and an ellipsis are
  // deliberate — reading that intent is what removes the 61 false alarms of 2026-08-21.
  // Only elements that DIRECTLY contain text are examined.
  const hasOwnText = (el) => {
    for (let i = 0; i < el.childNodes.length; i++) {
      const node = el.childNodes[i]
      if (node.nodeType === 3 && node.nodeValue.trim().length > 0) { return true }
    }
    return false
  }

  const all = document.body.querySelectorAll('*')
  for (let e = 0; e < all.length; e++) {
    const el = all[e]
    if (!hasOwnText(el)) { continue }
    if (!isVisible(el)) { continue }

    const style = window.getComputedStyle(el)
    const clipsX = (style.overflowX === 'hidden' || style.overflowX === 'clip')
    const clipsY = (style.overflowY === 'hidden' || style.overflowY === 'clip')
    if (!clipsX && !clipsY) { continue }

    const ellipsised = style.textOverflow === 'ellipsis'
    const text = el.textContent.trim().slice(0, 60)

    if (clipsX && !ellipsised && el.scrollWidth > el.clientWidth + 1) {
      failures.push({
        rule: 'Rule 2 — no text is cut off',
        detail: describe(el) + ' hides its overflow and its content is ' + el.scrollWidth + 'px wide in a ' +
          el.clientWidth + 'px box. Text: "' + text + '"'
      })
    } else if (clipsY && el.scrollHeight > el.clientHeight + 1) {
      failures.push({
        rule: 'Rule 2 — no text is cut off',
        detail: describe(el) + ' hides its overflow and its content is ' + el.scrollHeight + 'px tall in a ' +
          el.clientHeight + 'px box. Text: "' + text + '"'
      })
    }
  }

  // ── Rule 3 — the page does not scroll sideways ────────────────────────────────────
  // A container scrolling sideways is often deliberate; the DOCUMENT doing it is not.
  if (document.documentElement.scrollWidth > window.innerWidth + 1) {
    failures.push({
      rule: 'Rule 3 — the page does not scroll sideways',
      detail: 'the document is ' + document.documentElement.scrollWidth + 'px wide in a ' +
        window.innerWidth + 'px viewport.'
    })
  }

  return failures
}

module.exports = { collectFailures }
