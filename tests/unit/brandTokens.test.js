'use strict'

// Brand tokens are the owner's record (design/BRAND-TOKENS.md, 2026-07-09) and
// the accessibility floor for every block on screen. Both are easy to break by
// eye — a colour "looks fine" to someone with normal vision at exactly the
// ratios a low-vision reader cannot read. These tests make both mechanical.

const { BRAND, SEMANTIC, BLOCK_TONES, BAND_TEXT, blockTone } = require('../../utils/brandTokens')

/** WCAG 2.1 relative luminance. */
function luminance (hex) {
  const channel = (v) => {
    const c = parseInt(v, 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const r = channel(hex.slice(1, 3))
  const g = channel(hex.slice(3, 5))
  const b = channel(hex.slice(5, 7))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 contrast ratio between two hex colours. */
function contrast (a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const AA_SMALL_TEXT = 4.5
const BODY_INK = '#363636' // Bulma's default body colour, used on tinted blocks

describe('brand palette matches design/BRAND-TOKENS.md', () => {
  test('the six brand hexes are exactly as the owner set them', () => {
    expect(BRAND).toEqual({
      navy: '#002B64',
      cyan: '#00B1E0',
      sky: '#7FD3F1',
      blue: '#0070C0',
      pureBlue: '#0000FF',
      charcoal: '#3A3A3A'
    })
  })

  test('semantic colours are exactly as the owner set them', () => {
    expect(SEMANTIC).toEqual({ good: '#4CA52D', caution: '#FF9900', danger: '#FF0000' })
  })
})

describe('block tones stay on-brand', () => {
  test('every accent is a brand colour, never an invented one', () => {
    const brandHexes = Object.values(BRAND)
    for (const tone of BLOCK_TONES) {
      expect(brandHexes).toContain(tone.accent)
    }
  })

  // A semantic colour used as decoration stops reading as a signal — an orange
  // block is indistinguishable from a caution.
  test('no tone borrows a semantic colour', () => {
    const semantic = Object.values(SEMANTIC)
    for (const tone of BLOCK_TONES) {
      expect(semantic).not.toContain(tone.accent)
      expect(semantic).not.toContain(tone.tint)
    }
  })

  test('accents are distinct, so two blocks never look the same', () => {
    const accents = BLOCK_TONES.map(t => t.accent)
    expect(new Set(accents).size).toBe(accents.length)
  })
})

describe('every tone is legible (WCAG AA, small text)', () => {
  test.each(BLOCK_TONES.map((t, i) => [i, t]))(
    'tone %i: its text colour clears 4.5:1 on its accent',
    (_i, tone) => {
      expect(contrast(tone.fg, tone.accent)).toBeGreaterThanOrEqual(AA_SMALL_TEXT)
    }
  )

  test.each(BLOCK_TONES.map((t, i) => [i, t]))(
    'tone %i: body ink clears 4.5:1 on its tint',
    (_i, tone) => {
      expect(contrast(BODY_INK, tone.tint)).toBeGreaterThanOrEqual(AA_SMALL_TEXT)
    }
  )

  // The specific trap this guards: white is the obvious default for text on a
  // coloured block, and it is unreadable on the two lighter brand accents.
  test('the lighter accents do NOT pair with white text', () => {
    const light = BLOCK_TONES.filter(t => contrast('#FFFFFF', t.accent) < AA_SMALL_TEXT)
    expect(light.length).toBeGreaterThan(0) // cyan and sky
    for (const tone of light) {
      expect(tone.fg.toUpperCase()).not.toBe('#FFFFFF')
    }
  })
})

// Heading bands are the owner's call (2026-07-22): they must all carry WHITE,
// so the set reads as one thing. That makes legibility the BAND's job — where a
// brand hex cannot carry white it is darkened on the same hue until it can.
describe('heading bands all carry white, legibly', () => {
  test('band text is white', () => {
    expect(BAND_TEXT.toUpperCase()).toBe('#FFFFFF')
  })

  test.each(BLOCK_TONES.map((t, i) => [i, t]))(
    'tone %i: white clears 4.5:1 on its band',
    (_i, tone) => {
      expect(contrast(BAND_TEXT, tone.band)).toBeGreaterThanOrEqual(AA_SMALL_TEXT)
    }
  )

  test('a band is only darkened when the brand hex cannot carry white', () => {
    for (const tone of BLOCK_TONES) {
      if (contrast('#FFFFFF', tone.accent) >= AA_SMALL_TEXT) {
        // Already legible — must be used unaltered, not needlessly darkened.
        expect(tone.band).toBe(tone.accent)
      } else {
        expect(tone.band).not.toBe(tone.accent)
      }
    }
  })

  test('bands are distinct, so two sections never look the same', () => {
    const bands = BLOCK_TONES.map(t => t.band)
    expect(new Set(bands).size).toBe(bands.length)
  })
})

describe('blockTone', () => {
  test('returns tones in order', () => {
    expect(blockTone(0)).toBe(BLOCK_TONES[0])
    expect(blockTone(2)).toBe(BLOCK_TONES[2])
  })

  // A section or step added upstream must still be distinguished, not render
  // unstyled because it ran off the end of the list.
  test('cycles past the end rather than returning undefined', () => {
    const past = blockTone(BLOCK_TONES.length + 1)
    expect(past).toBe(BLOCK_TONES[1])
    expect(past.accent).toBeDefined()
  })
})
