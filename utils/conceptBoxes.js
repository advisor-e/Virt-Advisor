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
