'use strict'

/**
 * Advisor-e brand tokens — the single code-side source for the palette in
 * design/BRAND-TOKENS.md (set by the owner 2026-07-09, "apply to every screen,
 * mockup, chart, and the eventual built UI").
 *
 * Kept here so screens reference a token by name rather than pasting a hex, and
 * so a brand change is one edit rather than a hunt. If this file and
 * BRAND-TOKENS.md ever disagree, the document wins — it is the owner's record.
 */

/** Brand palette, in the document's order of preference. */
const BRAND = {
  navy: '#002B64', // headings, primary ink, dark grounds
  cyan: '#00B1E0', // bright accent, highlights, eyebrows
  sky: '#7FD3F1', // soft fills, light accents
  blue: '#0070C0', // primary interactive on light
  pureBlue: '#0000FF', // strong accent, sparing — deliberately unused below
  charcoal: '#3A3A3A' // warm neutral text / grounds
}

/**
 * Semantic colours. Deliberately separate from the brand blues: these signal
 * state (good / caution / danger) and must never be borrowed as decoration —
 * an orange used as an accent stops reading as a warning.
 */
const SEMANTIC = {
  good: '#4CA52D',
  caution: '#FF9900',
  danger: '#FF0000'
}

const WHITE = '#FFFFFF'

/**
 * Block tones — the colour language for "these are separate things", used by
 * the Advisory Staircase (one per step) and the Firm Quizzes rail (one per
 * library section). One list, so the two screens cannot drift apart.
 *
 * Ordered by BRIGHTNESS, not hue. The brand is deliberately a blue family, so
 * hue alone separates blocks poorly — put two brand blues side by side and they
 * read as the same colour. Stepping dark → bright separates them strongly while
 * every value stays an exact brand hex.
 *
 * Each tone carries four values because one shade cannot do four jobs:
 *   accent — the brand hex, unaltered. Borders, rules, badges.
 *   fg     — the ONE text colour that clears WCAG AA (4.5:1) on that accent.
 *            Not always white: white on cyan is 2.51:1 and on sky 1.68:1.
 *   tint   — the accent mixed 92% into white, for a faint block background.
 *            Body ink (#363636) clears 10:1 on all of them.
 *   band   — a solid heading band, and ALWAYS carries white text. Owner's call
 *            2026-07-22: heading bands read as one set, so they must all use
 *            white; navy-on-cyan passed on paper at 5.47:1 but he could not
 *            read it. Where the brand hex cannot carry white it is darkened on
 *            the same hue until it can — cyan #00B1E0 -> #007FA1 (4.61:1) and
 *            sky #7FD3F1 -> #4B7C8E (4.59:1). Navy, blue and charcoal already
 *            carry white and are used unchanged.
 *
 * Measured ratios — accent/fg · ink-on-tint · white-on-band:
 *   navy 13.73 / 10.39 / 13.73 · blue 5.15 / 10.85 / 5.15
 *   cyan 5.47 / 11.22 / 4.61 · charcoal 11.37 / 10.51 / 11.37
 *   sky 8.17 / 11.57 / 4.59
 *
 * Semantic colours are NOT eligible here (see SEMANTIC above).
 */
const BLOCK_TONES = [
  { accent: BRAND.navy, fg: WHITE, tint: '#ebeef3', band: BRAND.navy },
  { accent: BRAND.blue, fg: WHITE, tint: '#ebf4fa', band: BRAND.blue },
  { accent: BRAND.cyan, fg: BRAND.navy, tint: '#ebf9fd', band: '#007FA1' },
  { accent: BRAND.charcoal, fg: WHITE, tint: '#efefef', band: BRAND.charcoal },
  { accent: BRAND.sky, fg: BRAND.navy, tint: '#f5fbfe', band: '#4B7C8E' }
]

/** Heading bands always carry white text — see `band` above. */
const BAND_TEXT = WHITE

/**
 * The tone for a zero-based block index, cycling past the end so a section or
 * step added later is still distinguished rather than rendering unstyled.
 *
 * @param {number} index - zero-based position of the block
 * @returns {{accent: string, fg: string, tint: string}}
 */
function blockTone (index) {
  return BLOCK_TONES[index % BLOCK_TONES.length]
}

module.exports = { BRAND, SEMANTIC, BLOCK_TONES, BAND_TEXT, blockTone }
