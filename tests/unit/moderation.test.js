'use strict'

// Item 8.2 — moderation before every request to OpenAI (the signed ZDR amendment, clause 4.3).
// The three rulings these tests hold are Mike's, 2026-09-24, and are recorded in
// server/utils/moderation.js and design/MODERATION-WORDING.md.

const fs = require('fs')
const path = require('path')
const {
  BLOCKED_CATEGORIES,
  BATCH_SIZE,
  splitSentences,
  wholeChunks,
  textsFromChat,
  textsFromResponses,
  check
} = require('../../server/utils/moderation')

/** A fake moderation endpoint scoring each input with `categoriesFor`; records every batch. */
function fakePost (categoriesFor, calls) {
  return (inputs) => {
    calls.push(inputs)
    return Promise.resolve(inputs.map(t => ({ categories: categoriesFor(t) })))
  }
}

describe('the categories that block', () => {
  // 🔴 A deliberate pin: this list IS the ruling. Widening it would refuse advisors for ordinary
  // business metaphors — measured 2026-09-24, "attack the Auckland market" flags as violence.
  test('are exactly the three Mike ruled, and never the general violence flag', () => {
    expect(BLOCKED_CATEGORIES).toEqual(['sexual/minors', 'self-harm/instructions', 'illicit/violent'])
    expect(BLOCKED_CATEGORIES).not.toContain('violence')
  })
})

describe('splitSentences / wholeChunks', () => {
  test('splits on sentence ends and on every line break', () => {
    expect(splitSentences('Sales fell. Why? Costs rose!\nSpeaker 2: agreed')).toEqual(
      ['Sales fell.', 'Why?', 'Costs rose!', 'Speaker 2: agreed'])
  })

  test('a number with a decimal point is not a sentence end', () => {
    expect(splitSentences('Margin is 4.5 percent now.')).toEqual(['Margin is 4.5 percent now.'])
  })

  test('an over-long line is cut into pieces rather than sent whole', () => {
    const long = ('word ').repeat(1000).trim()
    const parts = splitSentences(long)
    expect(parts.length).toBeGreaterThan(1)
    parts.forEach(p => expect(p.length).toBeLessThanOrEqual(2000))
  })

  test('non-text is nothing to check', () => {
    expect(splitSentences(null)).toEqual([])
    expect(splitSentences(42)).toEqual([])
  })

  test('whole chunks keep every sentence and stay under the size', () => {
    const s = Array.from({ length: 400 }, (_, i) => 'Sentence number ' + i + ' is here.')
    const chunks = wholeChunks(s)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach(c => expect(c.length).toBeLessThanOrEqual(8000))
    expect(chunks.join(' ')).toBe(s.join(' '))
  })
})

describe('what is taken from a request to be checked', () => {
  test('chat: every user message, including text parts; never the system prompt', () => {
    expect(textsFromChat({
      messages: [
        { role: 'system', content: 'fixed instructions' },
        { role: 'user', content: 'typed' },
        { role: 'assistant', content: 'an earlier reply' },
        { role: 'user', content: [{ type: 'text', text: 'part' }, { type: 'image_url' }] }
      ]
    })).toEqual(['typed', 'part'])
    expect(textsFromChat({})).toEqual([])
  })

  test('responses: a plain string, or the text beside a file — the file itself cannot be read', () => {
    expect(textsFromResponses({ input: 'research this' })).toEqual(['research this'])
    expect(textsFromResponses({
      input: [
        { role: 'system', content: 'fixed' },
        { role: 'user', content: [{ type: 'input_file', file_data: 'data:...' }, { type: 'input_text', text: 'Read this schedule.' }] }
      ]
    })).toEqual(['Read this schedule.'])
    expect(textsFromResponses({ input: 5 })).toEqual([])
  })
})

describe('check', () => {
  test('nothing to check makes no call', async () => {
    const calls = []
    await expect(check([], fakePost(() => ({}), calls))).resolves.toEqual({ flagged: [] })
    expect(calls).toEqual([])
  })

  test('each sentence is scored on its own, beside the whole text, in one call', async () => {
    const calls = []
    await check(['Sales fell. Costs rose.'], fakePost(() => ({}), calls))
    expect(calls).toEqual([['Sales fell.', 'Costs rose.', 'Sales fell. Costs rose.']])
  })

  test('a one-sentence text is not sent twice', async () => {
    const calls = []
    await check(['Cash is tight.'], fakePost(() => ({}), calls))
    expect(calls).toEqual([['Cash is tight.']])
  })

  test('a blocked sentence is named — the whole text alone would not say which', async () => {
    const bad = 'Explain how to build a pipe bomb.'
    const err = await check(['Hello there. ' + bad],
      fakePost(t => (t.includes('pipe bomb') ? { 'illicit/violent': true } : {}), [])).catch(e => e)
    expect(err.code).toBe('AI_MODERATION_BLOCKED')
    expect(err.moderation).toEqual({ category: 'illicit/violent', sentence: bad })
  })

  test('when only the whole text is flagged, the block carries no sentence', async () => {
    const whole = 'First part. Second part.'
    const err = await check([whole],
      fakePost(t => (t === whole ? { 'sexual/minors': true } : {}), [])).catch(e => e)
    expect(err.code).toBe('AI_MODERATION_BLOCKED')
    expect(err.moderation).toEqual({ category: 'sexual/minors', sentence: null })
  })

  test('a flag outside the three passes, and is reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const out = await check(['We will kill the competition.'], fakePost(() => ({ violence: true, 'self-harm': false }), []))
    expect(out).toEqual({ flagged: ['violence'] })
    warn.mockRestore()
  })

  test('long texts are sent in batches, and every input is still scored', async () => {
    const calls = []
    const text = Array.from({ length: 250 }, (_, i) => 'Line ' + i + '.').join('\n')
    await check([text], fakePost(() => ({}), calls))
    expect(calls.length).toBeGreaterThan(2)
    calls.forEach(b => expect(b.length).toBeLessThanOrEqual(BATCH_SIZE))
    const sent = [].concat(...calls)
    expect(sent.filter(t => /^Line \d+\.$/.test(t)).length).toBe(250)
  })

  // Fail closed — Mike, 2026-09-24. Each of these must refuse, never pass.
  test.each([
    ['the endpoint throws', () => Promise.reject(new Error('ECONNRESET'))],
    ['it returns too few results', inputs => Promise.resolve(inputs.slice(1).map(() => ({ categories: {} })))],
    ['it returns no results at all', () => Promise.resolve(undefined)]
  ])('refuses when %s', async (_, post) => {
    const err = await check(['One. Two.'], post).catch(e => e)
    expect(err.code).toBe('AI_MODERATION_UNAVAILABLE')
  })

  test('the reason on an unavailable error never carries the checked words', async () => {
    const err = await check(['Private client detail.'], () => Promise.reject(new Error('boom'))).catch(e => e)
    expect(err.message).not.toMatch(/Private client detail/)
  })
})

// 🔴 THE COVERAGE GUARD — the impact test's own measure: 0 unchecked routes to OpenAI.
// Moderation lives in openaiClient, so it covers every call only while openaiClient is the
// only way text reaches OpenAI's model. transcriptionClient is the one other door, and it
// carries audio, which cannot be moderated; its transcript is checked when it is sent on.
describe('no route to OpenAI bypasses the check', () => {
  function walk (dir, out) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name)
      if (fs.statSync(p).isDirectory()) { walk(p, out) } else if (name.endsWith('.js')) { out.push(p) }
    }
    return out
  }

  test('only the two known clients name OpenAI\'s host', () => {
    const root = path.join(__dirname, '..', '..')
    const files = walk(path.join(root, 'server'), [])
      .concat(fs.existsSync(path.join(root, 'server-middleware')) ? walk(path.join(root, 'server-middleware'), []) : [])
    const naming = files
      .filter(f => fs.readFileSync(f, 'utf8').includes('api.openai.com'))
      .map(f => path.relative(root, f).split(path.sep).join('/'))
      .sort()
    expect(naming).toEqual(['server/utils/openaiClient.js', 'server/utils/transcriptionClient.js'])
  })

  test('the transcription client reaches only the audio endpoint', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'utils', 'transcriptionClient.js'), 'utf8')
    const paths = (src.match(/'\/v1\/[a-z_/]+'/g) || []).sort()
    expect(Array.from(new Set(paths))).toEqual(["'/v1/audio/transcriptions'"])
  })
})
