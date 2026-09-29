/**
 * Gives one imported page's embedded fonts names of their own (item 15.20, piece 5).
 *
 * 🔴 WHY. The PDF reader names a converted page's fonts `g_d0_f1`, `g_d0_f2`… afresh for every
 * file, so the same name means a different font on different pages. Where two imported pages
 * share a screen — the session card, the plan, the Add Concept preview — the later page's
 * `@font-face` replaced the earlier one's, and p11 of Organisational Review printed its bold
 * "?" as "2" and ")" as "6". Each page converts correctly on its own; the collision is only in
 * sharing one document. Proved 2026-09-29 by drawing p11 alone and beside p14.
 *
 * The tag is worked out from the page's own markup, so a page is named the same on the server
 * and in the browser, and the same page drawn twice shares identical fonts, which is harmless.
 */

/**
 * @param {string} s
 * @returns {string} a short hash, base 36
 */
function tagOf (s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0 }
  return (h >>> 0).toString(36)
}

/**
 * @param {string} svg - one converted page
 * @returns {string} the same page, every font name made unique to it
 */
export function ownFontNames (svg) {
  const page = String(svg || '')
  const tag = tagOf(page)
  return page.replace(/\bg_d(\d+)_f(\d+)\b/g, (_, d, f) => 'g_' + tag + '_d' + d + '_f' + f)
}
