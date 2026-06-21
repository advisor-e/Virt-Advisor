'use strict'

const { detectFabricatedQuotes, findUnverifiedQuotes } = require('../../server/utils/fabricationWatch')

describe('Tier 2 — fabrication watch (log-only detection)', () => {
  const reference = 'Open in the Personal Zone. Use the transition: "How are you going for time today?" before any business topic. Close with a Start/Stop/Keep exercise.'

  describe('detectFabricatedQuotes', () => {
    test('flags a quoted script that is NOT in the reference', () => {
      const response = 'You could open with: "I am excited to share some insights that could really help you leverage the opportunities ahead in your business."'
      const flagged = detectFabricatedQuotes(response, reference)
      expect(flagged.length).toBe(1)
      expect(flagged[0]).toMatch(/excited to share/)
    })

    test('does NOT flag a quote that appears verbatim in the reference', () => {
      const response = 'Open with the firm\'s line: "How are you going for time today?" then move on.'
      expect(detectFabricatedQuotes(response, reference)).toEqual([])
    })

    test('ignores short concept terms in quotes (under the script threshold)', () => {
      const response = 'Anchor on the "Growth Curve" and close with "Start Stop Keep".'
      expect(detectFabricatedQuotes(response, reference)).toEqual([])
    })

    test('returns nothing when the response has no quotes', () => {
      const response = 'Open in the Personal Zone and read whether the client is macro or micro vision.'
      expect(detectFabricatedQuotes(response, reference)).toEqual([])
    })

    test('handles curly quotes and punctuation/case differences', () => {
      // present in reference but with smart quotes + different case → not flagged
      const present = 'Say this: “HOW ARE YOU GOING for time, today?”'
      expect(detectFabricatedQuotes(present, reference)).toEqual([])
      // absent, smart-quoted → flagged
      const absent = 'Try “let me paint you a picture of where this business could be in five years” today.'
      expect(detectFabricatedQuotes(absent, reference).length).toBe(1)
    })
  })

  describe('findUnverifiedQuotes (message-array source)', () => {
    const messages = [
      { role: 'system', content: 'You are an advisor coach.' },
      { role: 'user', content: reference },
      { role: 'user', content: 'My client keeps saying "we just want to get through the year in one piece" to me.' }
    ]

    test("does not flag the advisor's own words echoed back", () => {
      const response = 'You told me they keep saying "we just want to get through the year in one piece" — lean into that.'
      expect(findUnverifiedQuotes(response, messages)).toEqual([])
    })

    test('flags wording present only in a prior ASSISTANT turn (assistant excluded from source)', () => {
      const withAssistant = messages.concat([
        { role: 'assistant', content: 'Earlier I suggested: "kick things off by celebrating their biggest win of the year first"' }
      ])
      const response = 'Open with: "kick things off by celebrating their biggest win of the year first" to set the tone.'
      expect(findUnverifiedQuotes(response, withAssistant).length).toBe(1)
    })

    test('tolerates a missing/empty message array', () => {
      expect(findUnverifiedQuotes('no quotes here', null)).toEqual([])
    })
  })
})
