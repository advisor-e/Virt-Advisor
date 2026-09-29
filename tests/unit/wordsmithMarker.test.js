'use strict'

/**
 * The "✓ written with Wordsmith" stamp (item 15.14, screen 4; build detail 2).
 *
 * WHAT UAT CANNOT SEE: that the planner's ordinary box save could write the stamp itself —
 * making any typed words read as agreed by the client — or that the stamp outlives an edit.
 */

const { markerKeyFor, buildMarker, parseMarker, stampHolds } = require('../../utils/wordsmithMarker')
const captureForms = require('../../server/utils/strategyCaptureForms')
const frameworks = require('../../server/utils/strategyFrameworks')

test('🔴 the planner\'s box save refuses the stamp\'s key, so only the Wordsmith route can write it', () => {
  expect(captureForms.hasCaptureField('alignment-statements', 't0r0c1', frameworks.getConcept)).toBe(true)
  expect(captureForms.hasCaptureField('alignment-statements', markerKeyFor('t0r0c1'), frameworks.getConcept)).toBe(false)
})

test('the stamp holds only while the box holds the agreed words', () => {
  const marker = parseMarker(buildMarker({ approvedAt: '2026-09-29T10:42:00.000Z', text: 'We are trusted.' }))
  expect(stampHolds(marker, 'We are trusted. ')).toBe(true)
  expect(stampHolds(marker, 'We are trusted by all.')).toBe(false)
  expect(stampHolds(null, 'We are trusted.')).toBe(false)
})

test.each([undefined, '', 'not json', '{"text":"x"}', '{"approvedAt":"soon","text":"x"}', '[]'])('a malformed stamp %p reads as none', (v) => {
  expect(parseMarker(v)).toBeNull()
})
