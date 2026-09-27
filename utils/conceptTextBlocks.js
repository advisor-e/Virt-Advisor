/**
 * @file How a concept page's text is split into blocks an advisor can edit, how each block
 * is named, and how edited words are re-wrapped. Item 15.25.
 *
 * Pure — no DOM. The half that reads and redraws the page is `utils/conceptTextDom.js`.
 *
 * Approved design: `design/mockups/strategy-edit-text-test.html`, tried and approved to build
 * by Mike on 2026-09-25. Its measurements (Porter's 5 Forces, Blue Ocean Strategy) are in
 * `scripts/edit-text-test/`, and the rules below are the ones that test proved.
 */

/**
 * A page with no edits. ONE shared, frozen object rather than a fresh `{}` per render: the
 * drawing watches its edits, and a new empty object every time a parent re-rendered — which
 * is every keystroke in a capture box — would redraw every page on the screen for nothing.
 */
export const NO_EDITS = Object.freeze({})

/**
 * One page's saved edits out of the session's, as the store keys them.
 * @param {Object<string, Object<string, string>>} all `{ '<conceptId>#<sheet>': { block: text } }`
 * @param {string} conceptId
 * @param {number} sheet
 * @returns {Object<string, string>}
 */
export function sheetEdits (all, conceptId, sheet) {
  return (all && all[conceptId + '#' + sheet]) || NO_EDITS
}

/**
 * @typedef {object} LineDesc
 * @property {number} x         the line's left edge (or anchor), in page units
 * @property {number} y         its baseline, in page units
 * @property {number} fontSize  in page units
 * @property {string} look      size, weight, style, colour and anchor, joined — two lines
 *                              that differ in any of these are never one paragraph
 */

/**
 * Which lines of a page make one paragraph.
 *
 * 🔴 A PARAGRAPH ON HIS PAGE IS SEVERAL SEPARATE LINES. The drawings reproduce his line
 * breaks one `<text>` at a time (Porter's "New Entrants" question is four), so the thing an
 * advisor edits is the run of lines, re-wrapped together — never one line on its own, whose
 * extra words would have nowhere to go.
 *
 * Consecutive lines join when they look the same, start at the same x, and step down by
 * roughly one line: more than 0.8 and less than 1.8 of the font size. Those bounds are the
 * ones the approved test ran on, and every block of both measured pages re-wrapped to its
 * original breaks under them.
 *
 * @param {LineDesc[]} lines in document order
 * @returns {number[][]} each block as the indices of its lines
 */
export function groupLines (lines) {
  const blocks = []
  ;(lines || []).forEach((line, i) => {
    const current = blocks[blocks.length - 1]
    const prev = current ? lines[current[current.length - 1]] : null
    if (prev && prev.look === line.look && Math.abs(prev.x - line.x) < 2) {
      const gap = line.y - prev.y
      if (gap > line.fontSize * 0.8 && gap < line.fontSize * 1.8) {
        current.push(i)
        return
      }
    }
    blocks.push([i])
  })
  return blocks
}

/**
 * Collapse runs of white space, and trim. How a block's words are compared and stored.
 * @param {string} text
 * @returns {string}
 */
export function normaliseWords (text) {
  return String(text === null || text === undefined ? '' : text).replace(/\s+/g, ' ').trim()
}

/**
 * A short, stable hash of some words — FNV-1a, 32 bit, base 36.
 * @param {string} text
 * @returns {string}
 */
export function hashWords (text) {
  let h = 0x811C9DC5
  const s = normaliseWords(text)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36)
}

/**
 * The name an edit is stored under: the block's position on the page AND its original words.
 *
 * 🔴 THE WORDS ARE IN THE NAME SO A REDRAWN PAGE DROPS AN OLD EDIT RATHER THAN MISPLACING
 * IT. Position alone would carry an advisor's sentence onto whatever block took that place
 * after a drawing was corrected — a different question, silently answered with the wrong
 * words. With the hash, a changed block simply stops matching and shows its new original.
 *
 * @param {number} index the block's position on the page, from 0
 * @param {string} originalText its words as drawn
 * @returns {string} e.g. `b10-1k2x9`; matches the store's BLOCK_KEY
 */
export function blockKey (index, originalText) {
  return 'b' + index + '-' + hashWords(originalText)
}

/**
 * Break words into lines no wider than `maxWidth`, greedily, as the page itself does.
 *
 * A line break the advisor types starts a new paragraph. A single word wider than the column
 * still gets a line of its own — it is the fit check's job to say it does not fit, not this
 * function's to hide it.
 *
 * @param {string} text
 * @param {number} maxWidth in page units
 * @param {function(string): number} measure the width of a string in this block's font
 * @returns {Array<{s: string, full: boolean}>} `full` is true for a line the wrap broke,
 *   false for the last line of a paragraph — only a full line is justified
 */
export function wrapText (text, maxWidth, measure) {
  const out = []
  String(text === null || text === undefined ? '' : text).split(/\n+/).forEach((para) => {
    const words = para.trim().split(/\s+/).filter(Boolean)
    let line = ''
    words.forEach((w) => {
      const next = line ? line + ' ' + w : w
      if (line && measure(next) > maxWidth + 0.5) {
        out.push({ s: line, full: true })
        line = w
      } else {
        line = next
      }
    })
    if (line) { out.push({ s: line, full: false }) }
  })
  return out
}
