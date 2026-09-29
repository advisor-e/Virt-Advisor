/**
 * The boxes a manager drags over an imported Response Form (item 15.20, drawing §5b).
 *
 * A box is stored as fractions of the page — `{ x, y, w, h }`, each 0 to 1 — so it lands in the
 * same place however large the page is drawn, and the backend's `checkBoxes` can prove it lies
 * inside the page. These are the screen's half of that contract: what the screen sends is
 * already what the backend accepts.
 */

/** Matches `MIN_BOX` in server/utils/importedConcepts.js: smaller is a slip of the mouse. */
export const MIN_BOX = 0.01

const clamp = v => Math.min(1, Math.max(0, v))

/**
 * A point on the page as fractions, clamped to the page, from a pointer position and the
 * page's on-screen rectangle.
 * @param {number} clientX
 * @param {number} clientY
 * @param {{left: number, top: number, width: number, height: number}} rect
 * @returns {{x: number, y: number}}
 */
export function pointOnPage (clientX, clientY, rect) {
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) { return { x: 0, y: 0 } }
  return { x: clamp((clientX - rect.left) / rect.width), y: clamp((clientY - rect.top) / rect.height) }
}

/**
 * The box between two points, whichever way it was dragged, or null when it is too small to be
 * a space to write in.
 * @param {{x: number, y: number}} a
 * @param {{x: number, y: number}} b
 * @returns {{x: number, y: number, w: number, h: number}|null}
 */
export function boxBetween (a, b) {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const w = Math.abs(a.x - b.x)
  const h = Math.abs(a.y - b.y)
  if (w < MIN_BOX || h < MIN_BOX) { return null }
  return { x, y, w, h }
}

/**
 * The boxes as the save sends them: trimmed labels, the drawn order kept, nothing else carried.
 * @param {Array<{label: string, x: number, y: number, w: number, h: number}>} boxes
 * @returns {Array<object>}
 */
export function boxesForSave (boxes) {
  return boxes.map(b => ({ label: String(b.label || '').trim(), x: b.x, y: b.y, w: b.w, h: b.h }))
}

/**
 * Whether the save may be pressed: at least one box, and every box labelled.
 * @param {Array<{label: string}>} boxes
 * @returns {boolean}
 */
export function boxesReady (boxes) {
  return boxes.length > 0 && boxes.every(b => String(b.label || '').trim().length > 0)
}

/**
 * The type sizes an answer is tried at inside its box on the client's plan, largest first, in
 * `cqw` — a share of the plan page's width, so a size that fits on screen fits on paper too.
 * 1.944 is 14pt on his 720pt deck page; 1.25 is 9pt, the size of his own page number
 * (`StrategyPlanDocument.vue`), which is the readable floor question 7 asks for.
 */
export const ANSWER_SIZES = [1.944, 1.8, 1.65, 1.5, 1.375, 1.25]

/**
 * Where one answer goes on an imported Response Form — question 7, ruled by Mike 2026-09-24:
 * inside its own box, shrinking to fit, and continuing below the page under the box's label only
 * when it is too long — never cut off.
 *
 * 🔴 NOTHING IS LOST. `inBox` without its trailing ellipsis, then `rest`, is every word of the
 * answer in order, with its line breaks — the split falls between two words, and only the space
 * at that break is dropped.
 *
 * @param {string} text - the client's answer
 * @param {function(string, number): boolean} fits - does this text fit the box at this size?
 * @param {number[]} [sizes] - largest first; the last is the floor
 * @returns {{size: number, inBox: string, rest: string}}
 */
export function fitAnswer (text, fits, sizes = ANSWER_SIZES) {
  const all = String(text || '')
  for (const size of sizes) {
    if (fits(all, size)) { return { size, inBox: all, rest: '' } }
  }
  const floor = sizes[sizes.length - 1]
  const words = all.match(/\S+\s*/g) || []
  const lead = all.slice(0, all.length - words.join('').length)
  const shown = k => (lead + words.slice(0, k).join('')).trimEnd() + '…'
  // The most words that fit with the ellipsis after them. Zero leaves the box empty and the
  // whole answer below, which is right for a box too small to hold even one word.
  let lo = 0
  let hi = words.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (fits(shown(mid), floor)) { lo = mid } else { hi = mid - 1 }
  }
  if (lo === 0) { return { size: floor, inBox: '', rest: all } }
  return { size: floor, inBox: shown(lo), rest: words.slice(lo).join('') }
}
