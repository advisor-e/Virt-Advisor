/**
 * A sentence with bold or quoted parts, built from ONE locale string (item 13.6).
 *
 * Splitting a sentence into several keys around its bold words hands the translator
 * fragments: no language can reorder them, and a join can lose its space. A template
 * uses vue-i18n's `<i18n path>` component with named slots for this; these two
 * functions do the same for a sentence assembled in code and rendered as parts.
 *
 *   const text = this.$t('key', slotMarkers(['template']))
 *   sentenceParts(text, { template: { text: title, bold: true } })
 */

const MARK = '\u0000'

/**
 * Stand-in values for a sentence's slots. Passed to `$t`, each `{name}` comes back as a
 * marker the sentence can be cut at, wherever the translation put it.
 *
 * @param {string[]} names - the slot names in the locale string
 * @returns {Object<string, string>}
 */
export function slotMarkers (names) {
  const out = {}
  names.forEach((name) => { out[name] = MARK + name + MARK })
  return out
}

/**
 * Cut a translated sentence at its markers, in reading order.
 *
 * @param {string} text - `$t` output given `slotMarkers()` as its slot values
 * @param {Object<string, Object>} slots - each slot's part, e.g. `{ text: 'X', bold: true }`
 * @returns {Array<Object>} the parts; plain text arrives as `{ text }`
 */
export function sentenceParts (text, slots) {
  const parts = []
  String(text).split(MARK).forEach((piece, i) => {
    // Odd pieces sit between two markers, so they are slot names.
    if (i % 2 === 1 && slots[piece]) {
      parts.push(slots[piece])
    } else if (piece) {
      parts.push({ text: piece })
    }
  })
  return parts
}
