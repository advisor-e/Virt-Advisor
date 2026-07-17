'use strict'

const { detectFabricatedQuotes, findUnverifiedQuotes, logUnverifiedQuotes, buildCorrectionNote, appendCorrectionNote } = require('../../server/utils/fabricationWatch')

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

    test('a quoted span that is all punctuation normalises to nothing and is never flagged', () => {
      const response = 'Odd formatting: "!!! ??? --- ... ###" appeared in the notes.'
      expect(detectFabricatedQuotes(response, reference)).toEqual([])
    })

    test('a null/empty response is tolerated', () => {
      expect(detectFabricatedQuotes(null, reference)).toEqual([])
      expect(detectFabricatedQuotes('', reference)).toEqual([])
    })

    test('curly double quotes in the SOURCE material normalise too', () => {
      const curlySource = 'The doc says: “we grow through disciplined weekly rhythms and reviews”.'
      const response = 'Remember: "we grow through disciplined weekly rhythms and reviews".'
      expect(detectFabricatedQuotes(response, curlySource)).toEqual([])
    })

    test('handles curly quotes and punctuation/case differences', () => {
      // present in reference but with smart quotes + different case → not flagged
      const present = 'Say this: “HOW ARE YOU GOING for time, today?”'
      expect(detectFabricatedQuotes(present, reference)).toEqual([])
      // absent, smart-quoted → flagged
      const absent = 'Try “let me paint you a picture of where this business could be in five years” today.'
      expect(detectFabricatedQuotes(absent, reference).length).toBe(1)
    })

    test('curly apostrophes normalise like straight ones (both directions)', () => {
      // reference has "How are you going..." with a straight apostrophe context;
      // a curly-apostrophe rendition of the same line must not be flagged
      const curly = 'Open with: “how are you going for time today’s check?”'
      const ref = "Use the line: \"how are you going for time today's check?\""
      expect(detectFabricatedQuotes(curly, ref)).toEqual([])
    })
  })

  describe('logUnverifiedQuotes (log wrapper)', () => {
    test('warns once per flagged span and returns the flagged list', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const messages = [{ role: 'user', content: reference }]
      const response = 'Open with: "I am delighted to walk you through everything we achieved together this year".'
      const flagged = logUnverifiedQuotes('test-path', response, messages)
      expect(flagged.length).toBe(1)
      expect(spy).toHaveBeenCalledTimes(2) // summary line + one span line
      expect(spy.mock.calls[0][0]).toContain('[fabrication-watch] test-path')
      spy.mockRestore()
    })

    test('stays silent when nothing is flagged', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const messages = [{ role: 'user', content: reference }]
      expect(logUnverifiedQuotes('test-path', 'no quotes at all', messages)).toEqual([])
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
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

    test('tolerates null entries, content-less messages and left-curly apostrophes', () => {
      const raggedMessages = [
        null,
        { role: 'user' }, // no content field
        { role: 'user', content: 'The line is: "it‘s all about the momentum you build early on"' }
      ]
      // same span quoted back (left-curly apostrophe in both) → not flagged
      const response = 'Use: "it‘s all about the momentum you build early on" here.'
      expect(findUnverifiedQuotes(response, raggedMessages)).toEqual([])
    })
  })
})

// Enforcement (wording approved by Mike 2026-07-18): a watch hit appends a
// visible correction note — streamed replies can't be unprinted. The note may
// name a document ONLY when exactly one known document (harvested from OUR
// reference text as "the X document") appears near a flagged span; any
// ambiguity falls back to the generic wording, so the correction can never
// itself misattribute.
describe('Tier 2 — correction-note enforcement', () => {
  const FAKE_SCRIPT = 'let me paint you a picture of where this business could be'
  const sourceMessages = [
    { role: 'system', content: 'You are an advisor coach.' },
    { role: 'user', content: 'Rehearse using the EOY Scripts Only document before the meeting.' }
  ]

  describe('buildCorrectionNote', () => {
    test('nothing flagged → no note (null)', () => {
      expect(buildCorrectionNote([], 'any response', sourceMessages)).toBeNull()
      expect(buildCorrectionNote(null, 'any response', sourceMessages)).toBeNull()
      expect(buildCorrectionNote('not-an-array', 'any response', sourceMessages)).toBeNull()
    })

    test('names the document when exactly one known document sits near the flagged span', () => {
      const response = `From the EOY Scripts Only document you could open with: "${FAKE_SCRIPT}".`
      const note = buildCorrectionNote([FAKE_SCRIPT], response, sourceMessages)
      expect(note).toContain('⚠️ Correction')
      expect(note).toContain('*EOY Scripts Only*')
      expect(note).toContain('available in Advisor-e')
    })

    test('document-name matching in the response is case-insensitive', () => {
      const response = `The eoy scripts only document says: "${FAKE_SCRIPT}".`
      const note = buildCorrectionNote([FAKE_SCRIPT], response, sourceMessages)
      expect(note).toContain('*EOY Scripts Only*')
    })

    test('generic note when the response never mentions a known document', () => {
      const response = `You could open with: "${FAKE_SCRIPT}".`
      const note = buildCorrectionNote([FAKE_SCRIPT], response, sourceMessages)
      expect(note).toContain('⚠️ Correction')
      expect(note).toContain("not taken from the firm's materials")
      expect(note).not.toContain('EOY Scripts Only')
    })

    test('generic note when the known document is mentioned too far from the flagged span', () => {
      const response = 'The EOY Scripts Only document is a great resource. ' + 'x'.repeat(600) + ` Try: "${FAKE_SCRIPT}".`
      const note = buildCorrectionNote([FAKE_SCRIPT], response, sourceMessages)
      expect(note).toContain("not taken from the firm's materials")
      expect(note).not.toContain('*EOY Scripts Only*')
    })

    test('generic note when TWO known documents both sit near the flagged span (ambiguous)', () => {
      const twoDocSource = sourceMessages.concat([
        { role: 'user', content: 'Also review the Client Meeting Guide document.' }
      ])
      const response = `Blending the EOY Scripts Only document and the Client Meeting Guide document: "${FAKE_SCRIPT}".`
      const note = buildCorrectionNote([FAKE_SCRIPT], response, twoDocSource)
      expect(note).toContain("not taken from the firm's materials")
      expect(note).not.toContain('*EOY Scripts Only*')
      expect(note).not.toContain('*Client Meeting Guide*')
    })

    test('doc names are harvested from user/system source only, never from assistant turns', () => {
      const assistantOnly = [
        { role: 'assistant', content: 'See the Invented By Assistant document.' }
      ]
      const response = `The Invented By Assistant document says: "${FAKE_SCRIPT}".`
      const note = buildCorrectionNote([FAKE_SCRIPT], response, assistantOnly)
      expect(note).toContain("not taken from the firm's materials")
      expect(note).not.toContain('Invented By Assistant')
    })

    test('lowercase phrases like "the following document" never become a document name', () => {
      const lcSource = [{ role: 'user', content: 'Please read the following document carefully.' }]
      const response = `Per the following document: "${FAKE_SCRIPT}".`
      const note = buildCorrectionNote([FAKE_SCRIPT], response, lcSource)
      expect(note).toContain("not taken from the firm's materials")
    })

    test('junk inputs still produce the generic note rather than crashing', () => {
      const note = buildCorrectionNote([FAKE_SCRIPT], null, 'not-an-array')
      expect(note).toContain('⚠️ Correction')
      expect(note).toContain("not taken from the firm's materials")

      const ragged = [null, { role: 'user' }, { role: 'user', content: 'the EOY Scripts Only document' }]
      const near = buildCorrectionNote([FAKE_SCRIPT], `EOY Scripts Only: "${FAKE_SCRIPT}"`, ragged)
      expect(near).toContain('*EOY Scripts Only*')
    })
  })

  describe('appendCorrectionNote', () => {
    test('no flags → display text passes through byte-identical', () => {
      expect(appendCorrectionNote('The answer.', [], 'The answer.', sourceMessages)).toBe('The answer.')
    })

    test('a flag appends the note after a markdown divider', () => {
      const response = `Try: "${FAKE_SCRIPT}".`
      const out = appendCorrectionNote('DISPLAY TEXT', [FAKE_SCRIPT], response, sourceMessages)
      expect(out.startsWith('DISPLAY TEXT\n\n---\n\n⚠️ Correction')).toBe(true)
    })
  })
})
