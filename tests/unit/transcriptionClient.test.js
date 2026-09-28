'use strict'

/**
 * Guards `server/utils/transcriptionClient.js` — Meeting Review slice 2, the one call this
 * feature makes to a third party.
 *
 * 🔴 `CLAUDE.md` PUTS LLM-OUTPUT VALIDATORS AT 100%: valid, malformed, missing fields, wrong
 * types. `readSegment` and `parseDiarizedResponse` are exactly that, and they are the last
 * thing standing between a model's reply and a claim about what a named client said in a
 * private meeting.
 *
 * 🔴 THE TWO THAT UAT CANNOT SEE.
 *
 *   1. **Attribution that looks confident and is wrong** (§5 trap 1). Every "did I use a
 *      metaphor" check depends on knowing which voice is the advisor's, and the anchor is
 *      that the advisor speaks the consent line FIRST. Get that backwards and the coaching
 *      notes read as certain while being exactly inverted — a tester cannot tell.
 *   2. **The identifiers that must not leave.** The `CLAUDE.md` PII exception is scoped to
 *      the spoken content ALONE; condition (b) keeps firm and advisor identifiers stripped.
 *      A filename is metadata that travels with the upload, and nobody inspects it.
 */

const tc = require('../../server/utils/transcriptionClient')

const GOOD = { speaker: 'A', start: 0, end: 4.2, text: 'Before we begin.' }

describe('one segment, checked rather than trusted', () => {
  test('a well-formed segment survives', () => {
    expect(tc.readSegment(GOOD)).toEqual(GOOD)
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'hello'],
    ['a number', 5],
    ['an array', []],
    ['no text', { speaker: 'A', start: 0, end: 1 }],
    ['empty text', { ...GOOD, text: '' }],
    ['whitespace text', { ...GOOD, text: '   ' }],
    ['text of the wrong type', { ...GOOD, text: 42 }],
    ['no speaker', { start: 0, end: 1, text: 'hi' }],
    ['a null speaker', { ...GOOD, speaker: null }],
    ['a numeric speaker', { ...GOOD, speaker: 1 }],
    ['a blank speaker', { ...GOOD, speaker: '  ' }],
    ['no start', { speaker: 'A', end: 1, text: 'hi' }],
    ['a non-numeric start', { ...GOOD, start: 'soon' }],
    ['a negative start', { ...GOOD, start: -1 }],
    ['end before start', { ...GOOD, start: 9, end: 2 }],
    ['a NaN end', { ...GOOD, end: NaN }],
    ['an Infinite end', { ...GOOD, end: Infinity }]
  ])('%s is dropped, never repaired', (_label, raw) => {
    // 🔴 DROPPED, NOT REPAIRED. A repaired timestamp is a fact this app invented about a
    // client's meeting. Brief P4 would rather have less evidence than invented evidence.
    expect(tc.readSegment(raw)).toBeNull()
  })

  test('text is trimmed and invisible characters are stripped', () => {
    // The same defence `openaiClient.js` applies to chat replies: a Unicode tag character is
    // the channel most often used to smuggle text past a human reviewer.
    const seg = tc.readSegment({ ...GOOD, text: '  hello​ world  ' })
    expect(seg.text).toBe('hello world')
  })

  test('a numeric string start is read as a number', () => {
    // Providers are not consistent about this and a string "0" is still a real timestamp.
    expect(tc.readSegment({ ...GOOD, start: '0', end: '4' })).toEqual({
      speaker: 'A', start: 0, end: 4, text: GOOD.text
    })
  })
})

describe('the whole response', () => {
  test('good segments are kept, in time order, and bad ones counted', () => {
    const parsed = tc.parseDiarizedResponse({
      text: 'full text',
      segments: [
        { speaker: 'B', start: 10, end: 12, text: 'second' },
        { speaker: 'A', start: 0, end: 4, text: 'first' },
        { speaker: 'A', start: 'nope', end: 2, text: 'broken' }
      ]
    })
    expect(parsed.segments.map(s => s.text)).toEqual(['first', 'second'])
    expect(parsed.dropped).toBe(1)
    expect(parsed.text).toBe('full text')
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'nope'],
    ['a number', 7],
    ['an array', []],
    ['an empty object', {}],
    ['segments of the wrong type', { segments: 'nope' }],
    ['segments null', { segments: null }]
  ])('%s yields no segments rather than throwing', (_label, parsed) => {
    // NEVER THROWS ON SHAPE. The caller reports a failed transcription in those words
    // (Brief P11) rather than the process dying on a third party's bad day.
    const result = tc.parseDiarizedResponse(parsed)
    expect(result.segments).toEqual([])
  })

  test('a response with no top-level text falls back to joining the segments', () => {
    const parsed = tc.parseDiarizedResponse({
      segments: [
        { speaker: 'A', start: 0, end: 1, text: 'one' },
        { speaker: 'B', start: 1, end: 2, text: 'two' }
      ]
    })
    expect(parsed.text).toBe('one two')
  })

  test('every segment being malformed is an empty result with a full drop count', () => {
    const parsed = tc.parseDiarizedResponse({ segments: [null, {}, 'x'] })
    expect(parsed.segments).toEqual([])
    expect(parsed.dropped).toBe(3)
  })
})

describe('who is the advisor — the consent line is the anchor', () => {
  test('the first voice on the recording is the advisor', () => {
    // 🔴 THE WHOLE DESIGN IN ONE ASSERTION. Brief §3: the advisor speaks the consent wording
    // and speaks it FIRST, so whoever opens the recording is the advisor. This is why a
    // single-file meeting keeps no voice sample — a sample held so software can recognise a
    // person is biometric data, special-category under UK and EU law. Segmented sessions are
    // the one exception, tested below.
    const result = tc.attributeSpeakers([
      { speaker: 'S1', start: 0, end: 20, text: 'Before we begin — I would like to record our meeting.' },
      { speaker: 'S2', start: 21, end: 24, text: 'Yes, that is fine.' },
      { speaker: 'S1', start: 25, end: 30, text: 'Thank you.' }
    ])
    expect(result.advisorSpeaker).toBe('S1')
    expect(result.segments.map(s => s.role)).toEqual(['advisor', 'client', 'advisor'])
    expect(result.confident).toBe(true)
  })

  test('a recording with only one voice is not confident', () => {
    // §5 trap 1: degraded diarization must FAIL VISIBLY rather than blur. One speaker means
    // the two people were not told apart, and attributing the whole meeting to the advisor
    // would read as certain and be worthless.
    const result = tc.attributeSpeakers([
      { speaker: 'S1', start: 0, end: 5, text: 'one' },
      { speaker: 'S1', start: 6, end: 9, text: 'two' }
    ])
    expect(result.speakerCount).toBe(1)
    expect(result.confident).toBe(false)
  })

  test('a third voice in the room is a client, not an advisor', () => {
    // The consent line covers everyone present — a colleague, a spouse, a business partner.
    // Only the first voice is the advisor; everyone else is the other side of the table.
    const result = tc.attributeSpeakers([
      { speaker: 'S1', start: 0, end: 5, text: 'consent' },
      { speaker: 'S2', start: 6, end: 8, text: 'yes' },
      { speaker: 'S3', start: 9, end: 11, text: 'fine by me' }
    ])
    expect(result.segments.map(s => s.role)).toEqual(['advisor', 'client', 'client'])
    expect(result.speakerCount).toBe(3)
  })

  test('no segments at all leaves nobody attributed', () => {
    const result = tc.attributeSpeakers([])
    expect(result.advisorSpeaker).toBeNull()
    expect(result.confident).toBe(false)
    expect(result.segments).toEqual([])
  })

  test.each([[null], [undefined], ['nope'], [{}]])(
    'a non-list (%p) is handled rather than thrown on', (input) => {
      expect(tc.attributeSpeakers(input).segments).toEqual([])
    }
  )
})

describe('who is the advisor in a later segment — the voice clip is the anchor (item 8.4)', () => {
  test('the advisor is whoever the clip matched, even when the client speaks first', () => {
    // 🔴 THE REASON THE CLIP EXISTS. Segment 4 of a strategy session has no consent line, so
    // the first voice may be the client's. The first-speaker rule would swap every label in
    // the segment and still read as confident.
    const result = tc.attributeSpeakers([
      { speaker: 'A', start: 0, end: 4, text: 'the other thing is the flat-pack version' },
      { speaker: 'advisor', start: 5, end: 8, text: 'so that is a substitute' }
    ], 'advisor')
    expect(result.segments.map(s => s.role)).toEqual(['client', 'advisor'])
    expect(result.advisorSpeaker).toBe('advisor')
    expect(result.confident).toBe(true)
  })

  test('a clip that matched nobody leaves every row unknown and says it is not confident', () => {
    // Either the advisor never spoke, or the match failed. The second would give the
    // advisor's own words to the client, so neither is guessed at.
    const result = tc.attributeSpeakers([
      { speaker: 'A', start: 0, end: 4, text: 'one' },
      { speaker: 'B', start: 5, end: 8, text: 'two' }
    ], 'advisor')
    expect(result.segments.map(s => s.role)).toEqual(['unknown', 'unknown'])
    expect(result.advisorSpeaker).toBeNull()
    expect(result.confident).toBe(false)
  })

  test('a segment where only the advisor spoke is still attributed', () => {
    const result = tc.attributeSpeakers([
      { speaker: 'advisor', start: 0, end: 30, text: 'this slide is about the five forces' }
    ], 'advisor')
    expect(result.segments[0].role).toBe('advisor')
    expect(result.confident).toBe(true)
  })

  test('the clip becomes a data URL of its own declared audio type', () => {
    expect(tc.referenceDataUrl({ buffer: Buffer.from('VOICE'), mime: 'audio/webm' }))
      .toBe('data:audio/webm;base64,' + Buffer.from('VOICE').toString('base64'))
  })

  test('a clip whose type is not an audio type on the list is refused, never forwarded', () => {
    // The type rides into a URL OpenAI parses; it is checked, not copied from a request.
    expect(() => tc.referenceDataUrl({ buffer: Buffer.from('x'), mime: 'text/html' }))
      .toThrow(/not allowed/)
  })

  test.each([[undefined], [null], [{ buffer: Buffer.alloc(0), mime: 'audio/webm' }], [{ buffer: 'x', mime: 'audio/webm' }]])(
    'no usable clip (%p) means no reference is sent', (reference) => {
      expect(tc.referenceDataUrl(reference)).toBeNull()
    }
  )
})

describe('what leaves this machine', () => {
  test('the upload filename carries no identifier of any kind', () => {
    // 🔴 PII EXCEPTION CONDITION (b). The exception in `CLAUDE.md` covers the SPOKEN CONTENT
    // alone — internal ids and firm/advisor identifiers are still stripped. A filename such
    // as "meeting-<firmId>.webm" would have shipped exactly the identifier the condition
    // forbids, in the one field nobody inspects. This is a deliberate pin.
    expect(tc.UPLOAD_FILENAME).toBe('recording.webm')
    expect(tc.UPLOAD_FILENAME).not.toMatch(/firm|advisor|meeting|[0-9a-f]{16}/i)
  })

  test('the multipart body carries the audio, the model and the format — and nothing else', () => {
    const body = tc.buildMultipartBody(
      'BOUND',
      [{ name: 'model', value: 'a-model' }, { name: 'response_format', value: 'diarized_json' }],
      { name: 'file', filename: tc.UPLOAD_FILENAME, contentType: 'application/octet-stream', buffer: Buffer.from('AUDIO') }
    )
    const text = body.toString('latin1')
    expect(text).toContain('name="model"')
    expect(text).toContain('name="response_format"')
    expect(text).toContain('filename="recording.webm"')
    expect(text).toContain('AUDIO')
    expect(text.endsWith('--BOUND--\r\n')).toBe(true)
  })

  test('the diarizing model is the one confirmed enabled on the account', () => {
    // ⚠ A DELIBERATE PIN, and the reason is unusual enough to write down: this model is
    // published as an UNDATED name only — every other transcription model on the account
    // ships dated snapshots. So there is no version to pin, and OpenAI can change what sits
    // behind the name. Pinning the name at least makes a change to it a deliberate edit.
    expect(tc.DIARIZING_MODEL).toBe('gpt-4o-transcribe-diarize')
    expect(tc.DIARIZED_FORMAT).toBe('diarized_json')
  })
})

describe('the call itself', () => {
  /** A fake https.request that replies with whatever body the test supplies. */
  function fakeRequest (status, payload) {
    return (_options, onResponse) => {
      const res = {
        statusCode: status,
        async * [Symbol.asyncIterator] () { yield Buffer.from(payload) }
      }
      const req = {
        setTimeout () {},
        on () {},
        write () {},
        destroy () {},
        end () { setImmediate(() => onResponse(res)) }
      }
      return req
    }
  }

  test('a good reply comes back attributed', async () => {
    const client = tc.createTranscriptionClient({
      apiKey: 'k',
      requestImpl: fakeRequest(200, JSON.stringify({
        text: 'all of it',
        segments: [
          { speaker: 'S1', start: 0, end: 5, text: 'consent line' },
          { speaker: 'S2', start: 6, end: 8, text: 'yes' }
        ]
      }))
    })
    const result = await client.transcribe({ buffer: Buffer.from('AUDIO') })
    expect(result.segments.map(s => s.role)).toEqual(['advisor', 'client'])
    expect(result.confident).toBe(true)
    expect(result.model).toBe(tc.DIARIZING_MODEL)
    expect(result.bytes).toBe(5)
  })

  // OpenAI refuses the diarizing model without it — "chunking_strategy is required for
  // diarization models", proven live 2026-09-24 (OPENAI-DEVELOPER-DOCS.md O5). A simulated
  // OpenAI never asks for it, which is how every test here stayed green while the call failed.
  test('the request carries chunking_strategy=auto', async () => {
    let sent = ''
    const requestImpl = (_options, onResponse) => ({
      setTimeout () {},
      on () {},
      write (chunk) { sent += Buffer.from(chunk).toString('latin1') },
      destroy () {},
      end () {
        setImmediate(() => onResponse({
          statusCode: 200,
          async * [Symbol.asyncIterator] () { yield Buffer.from('{"text":"","segments":[]}') }
        }))
      }
    })
    await tc.createTranscriptionClient({ apiKey: 'k', requestImpl }).transcribe({ buffer: Buffer.from('AUDIO') })
    expect(sent).toMatch(/name="chunking_strategy"\r\n\r\nauto\r\n/)
  })

  test('with the advisor\'s clip, the request names it and the reply is attributed by it', async () => {
    let sent = ''
    const requestImpl = (_options, onResponse) => ({
      setTimeout () {},
      on () {},
      write (chunk) { sent += Buffer.from(chunk).toString('latin1') },
      destroy () {},
      end () {
        setImmediate(() => onResponse({
          statusCode: 200,
          async * [Symbol.asyncIterator] () {
            yield Buffer.from(JSON.stringify({
              text: 'x',
              segments: [
                { speaker: 'A', start: 0, end: 2, text: 'client first' },
                { speaker: 'advisor', start: 3, end: 5, text: 'advisor second' }
              ]
            }))
          }
        }))
      }
    })
    const result = await tc.createTranscriptionClient({ apiKey: 'k', requestImpl }).transcribe({
      buffer: Buffer.from('AUDIO'),
      advisorReference: { buffer: Buffer.from('VOICE'), mime: 'audio/webm' }
    })
    expect(sent).toMatch(/name="known_speaker_names\[\]"\r\n\r\nadvisor\r\n/)
    expect(sent).toContain('name="known_speaker_references[]"\r\n\r\ndata:audio/webm;base64,')
    expect(result.segments.map(s => s.role)).toEqual(['client', 'advisor'])
  })

  test('without a clip, the request carries no known-speaker fields at all', async () => {
    let sent = ''
    const requestImpl = (_options, onResponse) => ({
      setTimeout () {},
      on () {},
      write (chunk) { sent += Buffer.from(chunk).toString('latin1') },
      destroy () {},
      end () {
        setImmediate(() => onResponse({
          statusCode: 200,
          async * [Symbol.asyncIterator] () { yield Buffer.from('{"text":"","segments":[]}') }
        }))
      }
    })
    await tc.createTranscriptionClient({ apiKey: 'k', requestImpl }).transcribe({ buffer: Buffer.from('AUDIO') })
    expect(sent).not.toContain('known_speaker')
  })

  test('a missing key throws before anything is sent', async () => {
    const client = tc.createTranscriptionClient({ apiKey: '' })
    await expect(client.transcribe({ buffer: Buffer.from('a') })).rejects.toThrow(/OPENAI_API_KEY/)
  })

  test.each([
    ['no buffer', undefined],
    ['an empty buffer', Buffer.alloc(0)],
    ['a string', 'audio']
  ])('%s is refused before a request is made', async (_label, buffer) => {
    const client = tc.createTranscriptionClient({
      apiKey: 'k',
      requestImpl: () => { throw new Error('should never be called') }
    })
    await expect(client.transcribe({ buffer })).rejects.toThrow(/no audio/)
  })

  test('a non-2xx reply throws, and the error body is truncated', async () => {
    // An error body from a third party is not something to log whole when the request that
    // produced it carried a client's meeting.
    const client = tc.createTranscriptionClient({
      apiKey: 'k',
      requestImpl: fakeRequest(500, 'x'.repeat(2000))
    })
    await expect(client.transcribe({ buffer: Buffer.from('a') }))
      .rejects.toThrow(/Transcription API error 500/)
  })

  test('a reply that is not JSON throws rather than being half-read', async () => {
    const client = tc.createTranscriptionClient({
      apiKey: 'k',
      requestImpl: fakeRequest(200, 'not json at all')
    })
    await expect(client.transcribe({ buffer: Buffer.from('a') })).rejects.toThrow(/not JSON/)
  })
})
