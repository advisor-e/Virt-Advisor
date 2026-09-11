/**
 * industrySuggestions — the chips under the chat box while the intake's industry
 * question is live (item 4.87 T022a; design/mockups/outcome-learning-intake-industry.html,
 * approved by Mike 2026-09-11, all four questions ruled as recommended).
 *
 * The rulings, as numbers and behaviour:
 *   - nothing is offered until THREE letters are typed (MIN_TYPED);
 *   - at most EIGHT words are offered (MAX_SHOWN), alphabetical — the list arrives sorted;
 *   - a word is offered when it STARTS WITH the whole typed text, lowercased and trimmed;
 *   - a chip replaces the WHOLE answer (the caller does that; see `pickIndustry`), because
 *     the outcome pool keeps an industry only when the whole answer equals one word.
 *
 * Pure, so the numbers are pinned by tests rather than read off a screen.
 */

const MIN_TYPED = 3
const MAX_SHOWN = 8

/**
 * @param {string[]} words - the engine's vocabulary, lowercase and sorted (the route's shape)
 * @param {string} typed - the chat box's current text
 * @returns {string[]} up to MAX_SHOWN words starting with the typed text; `[]` below the floor
 */
function suggestIndustries (words, typed) {
  const q = typeof typed === 'string' ? typed.trim().toLowerCase() : ''
  if (q.length < MIN_TYPED || !Array.isArray(words)) { return [] }
  const out = []
  for (let i = 0; i < words.length && out.length < MAX_SHOWN; i++) {
    const w = words[i]
    if (typeof w === 'string' && w.startsWith(q) && w !== q) { out.push(w) }
  }
  return out
}

module.exports = { suggestIndustries, MIN_TYPED, MAX_SHOWN }
