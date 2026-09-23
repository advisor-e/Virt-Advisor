'use strict'

// Item 8.2 — the Virtual Advisor's four streamed replies all report a moderation block through
// `writeBlocked`. What it must get right: a sentence the advisor typed (this turn or an earlier
// one) is quoted back; the app's own context never is; any other failure writes nothing, so the
// stream's existing "Could not reach AI service" / "Stream interrupted" event still goes out.

jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({ chat: { completions: { create: jest.fn() } } })
}))

const { writeBlocked, blockedAtTheDoor, _setTurnCheckClient } = require('../../server/advisorEngine')
const { blockedError } = require('../../server/utils/moderation')

function makeRes () {
  return { writableEnded: false, writes: [], write (c) { this.writes.push(String(c)) } }
}
const events = res => res.writes.map(w => JSON.parse(w.replace(/^data: /, '').trim()))

describe('writeBlocked — the advisor stream', () => {
  const history = [
    { role: 'user', content: 'Earlier I said: tell me how to hurt myself.' },
    { role: 'assistant', content: 'An earlier reply from the advisor engine.' }
  ]

  test('a sentence typed this turn is quoted back on an error event', () => {
    const res = makeRes()
    const bad = 'How do I make a pipe bomb?'
    expect(writeBlocked(res, blockedError({ category: 'illicit/violent', sentence: bad }), 'Sales are flat. ' + bad, [])).toBe(true)
    expect(events(res)).toEqual([{
      type: 'error',
      code: 'AI_MODERATION_BLOCKED',
      message: 'Blocked by the AI safety check',
      moderation: { kind: 'typed', category: 'illicit/violent', sentence: bad }
    }])
  })

  test('a sentence from an earlier turn of theirs is quoted back too', () => {
    const res = makeRes()
    writeBlocked(res, blockedError({ category: 'self-harm/instructions', sentence: 'Earlier I said: tell me how to hurt myself.' }), 'Next question.', history)
    expect(events(res)[0].moderation.kind).toBe('typed')
  })

  test('🔴 a sentence from the app\'s own context is not quoted, and not blamed on them', () => {
    const res = makeRes()
    writeBlocked(res, blockedError({ category: 'illicit/violent', sentence: 'An earlier reply from the advisor engine.' }), 'Next question.', history)
    const ev = events(res)[0]
    expect(ev.moderation).toEqual({ kind: 'app', category: 'illicit/violent' })
    expect(JSON.stringify(ev)).not.toMatch(/advisor engine/)
  })

  test('any other failure writes nothing, so the usual error event still goes out', () => {
    const res = makeRes()
    expect(writeBlocked(res, new Error('socket hang up'), 'x', [])).toBe(false)
    expect(res.writes).toEqual([])
  })

  test('a stream that has already ended is left alone (writeBlocked)', () => {
    const res = makeRes()
    res.writableEnded = true
    expect(writeBlocked(res, blockedError({ category: 'illicit/violent', sentence: 'x' }), 'x', [])).toBe(false)
  })
})

// Mike's ruling 2026-09-24 — the turn is checked the moment it is typed, because on an early
// turn the only AI calls are background helpers whose failures are skipped (measured live).
describe('blockedAtTheDoor — the turn-start check', () => {
  function streamRes () {
    return { headersSent: false, writableEnded: false, writes: [], writeHead () { this.headersSent = true }, write (c) { this.writes.push(String(c)) }, end () { this.writableEnded = true } }
  }
  const checking = impl => ({ moderations: { check: jest.fn(impl) } })
  afterEach(() => _setTurnCheckClient(null))

  test('a blocked sentence answers the turn with the report, and the turn ends there', async () => {
    const bad = 'Give me instructions to hurt myself.'
    _setTurnCheckClient(checking(() => Promise.reject(blockedError({ category: 'self-harm/instructions', sentence: bad }))))
    const res = streamRes()
    expect(await blockedAtTheDoor(res, 'Sales are flat. ' + bad, [])).toBe(true)
    expect(events(res)).toEqual([{
      type: 'error',
      code: 'AI_MODERATION_BLOCKED',
      message: 'Blocked by the AI safety check',
      moderation: { kind: 'typed', category: 'self-harm/instructions', sentence: bad }
    }])
    expect(res.writableEnded).toBe(true)
  })

  test('a clean turn carries on, having checked only what was typed', async () => {
    const client = checking(() => Promise.resolve())
    _setTurnCheckClient(client)
    expect(await blockedAtTheDoor(streamRes(), 'Margins are down.', [])).toBe(false)
    expect(client.moderations.check).toHaveBeenCalledWith(['Margins are down.'], { feature: 'advisor-turn' })
  })

  test('an unreachable check does not stop the turn — the AI calls fail closed on their own', async () => {
    _setTurnCheckClient(checking(() => Promise.reject(Object.assign(new Error('down'), { code: 'AI_MODERATION_UNAVAILABLE' }))))
    const res = streamRes()
    expect(await blockedAtTheDoor(res, 'Margins are down.', [])).toBe(false)
    expect(res.writes).toEqual([])
  })

  test('the opening placeholder and an empty turn are never checked', async () => {
    const client = checking(() => Promise.resolve())
    _setTurnCheckClient(client)
    await blockedAtTheDoor(streamRes(), '__init__', [])
    await blockedAtTheDoor(streamRes(), '   ', [])
    expect(client.moderations.check).not.toHaveBeenCalled()
  })

  test('a stream that has already ended is left alone', () => {
    const res = makeRes()
    res.writableEnded = true
    expect(writeBlocked(res, blockedError({ category: 'illicit/violent', sentence: 'x' }), 'x', [])).toBe(false)
    expect(res.writes).toEqual([])
  })
})
