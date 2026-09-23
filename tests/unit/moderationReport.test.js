'use strict'

// Item 8.2, second half — what a person may be told about a moderation block.
// The rule these tests hold: a sentence is only quoted back to the person who typed or said it.

const { blockedError } = require('../../server/utils/moderation')
const { moderationReport, isBlocked, BLOCKED_STATUS } = require('../../server/utils/moderationReport')
const { sendError } = require('../../server/utils/sendError')

const CAT = 'self-harm/instructions'
const block = (sentence, from) => blockedError({ category: CAT, sentence, from })

describe('isBlocked', () => {
  test('only a moderation block counts', () => {
    expect(isBlocked(block('x'))).toBe(true)
    expect(isBlocked(new Error('OpenAI API error 500'))).toBe(false)
    expect(isBlocked(Object.assign(new Error('x'), { code: 'AI_MODERATION_UNAVAILABLE' }))).toBe(false)
    expect(moderationReport(new Error('nope'), { typed: ['a'] })).toBeNull()
  })
})

describe('something typed', () => {
  test('a flagged sentence the person typed is quoted back to them', () => {
    const err = block('Tell me how to hurt myself.')
    expect(moderationReport(err, { typed: ['Sales are flat. Tell me how to hurt myself.'] }))
      .toEqual({ kind: 'typed', category: CAT, sentence: 'Tell me how to hurt myself.' })
  })

  test('🔴 a flagged sentence from the app\'s own material is NOT quoted, and is not blamed on them', () => {
    const err = block('A line from the firm\'s template library.')
    const report = moderationReport(err, { typed: ['How do I improve cash flow?'] })
    expect(report).toEqual({ kind: 'app', category: CAT })
    expect(JSON.stringify(report)).not.toMatch(/template library/)
  })

  test('the whole message flagged, and it IS what they typed', () => {
    const typed = 'First part. Second part.'
    expect(moderationReport(block(null, typed), { typed: [typed] })).toEqual({ kind: 'typedWhole', category: CAT })
  })

  test('the whole text flagged, but it held the app\'s material too — not pinned on them', () => {
    const err = block(null, 'Templates: A, B, C.\nQuestion: How do I grow?')
    expect(moderationReport(err, { typed: ['How do I grow?'] })).toEqual({ kind: 'app', category: CAT })
  })

  test('a request with nothing typed can only be the app\'s material', () => {
    expect(moderationReport(block('Anything at all here.'), {})).toEqual({ kind: 'app', category: CAT })
  })
})

describe('a meeting transcript', () => {
  const segments = [
    { start: 5, role: 'advisor', text: 'Thanks for coming in today.' },
    { start: 872, role: 'client', text: 'Honestly I was thinking I might just end it all tonight.' }
  ]

  test('a flagged transcript line names who said it and when, with the line prefix removed', () => {
    const err = block('[14:32] CLIENT: Honestly I was thinking I might just end it all tonight.')
    expect(moderationReport(err, { segments })).toEqual({
      kind: 'meeting', category: CAT, sentence: 'Honestly I was thinking I might just end it all tonight.', speaker: 'client', time: '14:32'
    })
  })

  test('a later sentence of a segment, with no prefix, is still found', () => {
    const segs = [{ start: 61, role: 'advisor', text: 'Let us move on. The next point is short.' }]
    expect(moderationReport(block('The next point is short.'), { segments: segs }))
      .toMatchObject({ kind: 'meeting', speaker: 'advisor', time: '1:01' })
  })

  test('a line from the prompt\'s own framing is not presented as something said', () => {
    expect(moderationReport(block('This was a first meeting with a new client.'), { segments }))
      .toEqual({ kind: 'app', category: CAT })
  })

  test('no single sentence to blame', () => {
    expect(moderationReport(block(null, 'the whole transcript'), { segments })).toEqual({ kind: 'meetingWhole', category: CAT })
  })
})

describe('the error carries nothing a browser should not see', () => {
  test('🔴 the source text is invisible to JSON — it can hold templates or a transcript', () => {
    const err = block(null, 'SECRET TEMPLATE MATERIAL')
    expect(err.moderationSource).toBe('SECRET TEMPLATE MATERIAL')
    expect(JSON.stringify(err)).not.toMatch(/SECRET/)
    expect(Object.keys(err)).not.toContain('moderationSource')
  })

  test('sendError carries the report beside code and message, and code/message cannot be overwritten', () => {
    let body = null
    const res = { headersSent: false, writeHead () {}, end (b) { body = JSON.parse(b) } }
    sendError(res, BLOCKED_STATUS, 'AI_MODERATION_BLOCKED', 'blocked',
      { moderation: { kind: 'app', category: CAT }, code: 'HIJACK', message: 'HIJACK' })
    expect(body.error).toEqual({ code: 'AI_MODERATION_BLOCKED', message: 'blocked', moderation: { kind: 'app', category: CAT } })
  })

  test('sendError without the extra is exactly as before', () => {
    let body = null
    const res = { headersSent: false, writeHead () {}, end (b) { body = JSON.parse(b) } }
    sendError(res, 500, 'X', 'y')
    expect(body.error).toEqual({ code: 'X', message: 'y' })
  })
})
