'use strict'

// Item 13.6: a sentence assembled in code keeps its slots wherever a translation put them.
const { slotMarkers, sentenceParts } = require('../../utils/sentenceParts')

describe('sentenceParts', () => {
  const bold = { text: 'Pricing', bold: true }

  test('cuts a sentence at its slot, in reading order', () => {
    const text = 'File it under {domain} — never elsewhere.'.replace('{domain}', slotMarkers(['domain']).domain)
    expect(sentenceParts(text, { domain: bold })).toEqual([
      { text: 'File it under ' }, bold, { text: ' — never elsewhere.' }
    ])
  })

  test('follows a translation that moves the slot to the front, and keeps two apart', () => {
    const m = slotMarkers(['a', 'b'])
    const a = { text: 'A', bold: true }
    expect(sentenceParts(m.b + ' und ' + m.a, { a, b: bold })).toEqual([bold, { text: ' und ' }, a])
  })

  test('a slot the translation lost is dropped, never shown as a marker', () => {
    expect(sentenceParts('Nur Text.', { domain: bold })).toEqual([{ text: 'Nur Text.' }])
  })
})
