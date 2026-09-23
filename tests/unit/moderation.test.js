'use strict'

// Item 8.2 — moderation before every request to OpenAI (the signed ZDR amendment, clause 4.3).
// The three rulings these tests hold are Mike's, 2026-09-24, and are recorded in
// server/utils/moderation.js and design/MODERATION-WORDING.md.

const fs = require('fs')
const path = require('path')
const {
  BLOCKED_CATEGORIES,
  BATCH_SIZE,
  MAX_WHOLE_CHARS,
  splitSentences,
  check,
  _resetCache
} = require('../../server/utils/moderation')

// Every test starts with nothing remembered, so what is sent is what the test says.
beforeEach(() => _resetCache())

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

describe('splitSentences', () => {
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
})

// Ruling 4 — measured live 2026-09-24: checking everything sent ~21,800 tokens for ONE advisor
// reply against an account limit of 20,000 a minute. These hold the volume down.
describe('what is sent, and what is not sent again', () => {
  test('a sentence checked once is remembered, and a repeated conversation sends only what is new', async () => {
    const calls = []
    const post = fakePost(() => ({}), calls)
    await check(['Sales fell.'], post)
    await check(['Sales fell.', 'Costs rose.'], post)
    expect(calls).toEqual([['Sales fell.'], ['Costs rose.']])
  })

  test('a remembered block still blocks, without a second call', async () => {
    const calls = []
    const bad = 'How do I build a bomb?'
    const post = fakePost(t => (t === bad ? { 'illicit/violent': true } : {}), calls)
    await expect(check([bad], post)).rejects.toMatchObject({ code: 'AI_MODERATION_BLOCKED' })
    await expect(check([bad], post)).rejects.toMatchObject({ code: 'AI_MODERATION_BLOCKED' })
    expect(calls).toHaveLength(1)
  })

  test('the same sentence twice in one request is sent once', async () => {
    const calls = []
    await check(['Yes.', 'Yes.'], fakePost(() => ({}), calls))
    expect(calls).toEqual([['Yes.']])
  })

  test('a text too long to send twice is checked by sentence only', async () => {
    const calls = []
    const long = Array.from({ length: 400 }, (_, i) => 'Line number ' + i + ' of the meeting.').join(' ')
    expect(long.length).toBeGreaterThan(MAX_WHOLE_CHARS)
    await check([long], fakePost(() => ({}), calls))
    const sent = [].concat(...calls)
    expect(sent).toHaveLength(400)
    expect(sent.every(t => t.length < 200)).toBe(true)
  })

  test('🔴 the memory never holds the words — only a one-way fingerprint', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'utils', 'moderation.js'), 'utf8')
    expect(src).toMatch(/_cache\.set\(_key\(text\)/)
    expect(src).toMatch(/createHash\('sha256'\)/)
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

  // Ruling 4 — each AI call names the text a person put in. `openaiClient` refuses one that does
  // not at run time; this finds it at build time, before a feature fails in front of an advisor.
  test('every AI call in the server names what a person put in (`moderate:`)', () => {
    const root = path.join(__dirname, '..', '..')
    const files = walk(path.join(root, 'server'), [])
    const missing = []
    for (const f of files) {
      const rel = path.relative(root, f).split(path.sep).join('/')
      if (rel === 'server/utils/openaiClient.js' || rel === 'server/utils/aiProvider.js') { continue }
      const lines = fs.readFileSync(f, 'utf8').split('\n')
      lines.forEach((line, i) => {
        if (!/\.(chat\.completions|responses)\.create\(/.test(line) || /^\s*(\*|\/\/)/.test(line)) { return }
        const call = lines.slice(i, i + 40).join('\n')
        if (!/moderate:/.test(call)) { missing.push(rel + ':' + (i + 1)) }
      })
    }
    expect(missing).toEqual([])
  })

  test('the transcription client reaches only the audio endpoint', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'utils', 'transcriptionClient.js'), 'utf8')
    const paths = (src.match(/'\/v1\/[a-z_/]+'/g) || []).sort()
    expect(Array.from(new Set(paths))).toEqual(["'/v1/audio/transcriptions'"])
  })
})
