'use strict'

/**
 * The chips under the chat box while the industry question is live (item 4.87 T022a).
 * Mike's four rulings on design/mockups/outcome-learning-intake-industry.html
 * (2026-09-11) are numbers and behaviour, so they are pinned here rather than read off
 * a screen: three letters before anything is offered, eight chips at most, a prefix
 * match on the whole typed text, and the words come from the vocabulary as given.
 */

const { suggestIndustries, MIN_TYPED, MAX_SHOWN } = require('../../utils/industrySuggestions')

const WORDS = ['accountability', 'cafe', 'cake', 'plateau', 'platform', 'platinum', 'play',
  'playsheets', 'plugins', 'plumber', 'plus', 'podiatrist', 'point', 'points', 'policies', 'poor']

describe('suggestIndustries — the rulings as numbers', () => {
  test('the floor is three letters and the cap is eight', () => {
    expect(MIN_TYPED).toBe(3)
    expect(MAX_SHOWN).toBe(8)
  })

  test('nothing is offered below three letters', () => {
    expect(suggestIndustries(WORDS, '')).toEqual([])
    expect(suggestIndustries(WORDS, 'p')).toEqual([])
    expect(suggestIndustries(WORDS, 'pl')).toEqual([])
    expect(suggestIndustries(WORDS, '  pl ')).toEqual([])
  })

  test('three letters offer every word starting with them, in the list\'s own order', () => {
    expect(suggestIndustries(WORDS, 'plu')).toEqual(['plugins', 'plumber', 'plus'])
    expect(suggestIndustries(WORDS, 'caf')).toEqual(['cafe'])
  })

  test('at most eight are offered', () => {
    // 'pl' + a third letter 'a' matches six here; pad the list so the cap is what stops it.
    const many = WORDS.concat(['plane', 'planet', 'plank', 'plant', 'plaster', 'plastic'])
    const out = suggestIndustries(many, 'pla')
    expect(out.length).toBe(8)
    out.forEach(w => expect(w.startsWith('pla')).toBe(true))
  })

  test('the match is on the WHOLE typed text, lowercased and trimmed — not the last word', () => {
    expect(suggestIndustries(WORDS, '  PLU  ')).toEqual(['plugins', 'plumber', 'plus'])
    // "car yard" is not a prefix of anything; the last word "yard" is never tried on its own.
    expect(suggestIndustries(WORDS, 'car yard')).toEqual([])
    expect(suggestIndustries(WORDS.concat(['yard']), 'car yard')).toEqual([])
  })

  test('a word already typed in full is not offered back — the chips clear after a click', () => {
    expect(suggestIndustries(WORDS, 'plumber')).toEqual([])
    expect(suggestIndustries(WORDS, 'plus')).toEqual([])
  })

  test('a missing or malformed vocabulary offers nothing rather than throwing', () => {
    expect(suggestIndustries(null, 'plu')).toEqual([])
    expect(suggestIndustries(undefined, 'plu')).toEqual([])
    expect(suggestIndustries('plumber', 'plu')).toEqual([])
    expect(suggestIndustries([42, null, 'plumber'], 'plu')).toEqual(['plumber'])
    expect(suggestIndustries(WORDS, null)).toEqual([])
  })
})
