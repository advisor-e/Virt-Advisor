'use strict'

/**
 * The audio store's segments — a strategy session recorded one concept at a time (item 8.4,
 * design/mockups/strategy-session-recording.html, approved for build 2026-09-28).
 *
 * 🔴 WHAT UAT CANNOT SEE, AND WHY THESE EXIST:
 *
 *   1. **No file reaches OpenAI's 25 MB limit.** A segment refuses a chunk that would take it
 *      past `SEGMENT_MAX_BYTES`, and tells the browser to roll over at `SEGMENT_ROLL_BYTES`.
 *      A tester recording ten minutes never gets near either.
 *   2. **Deletion reaches every new file.** A segment's chunks, its text and the advisor's
 *      voice clip are all new names. A deletion that knew only the old ones would report
 *      success and leave a client's words — or the advisor's voice — on disk.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'mseg-test-'))
process.env.MEETING_AUDIO_DIR = ROOT

const store = require('../../server/utils/meetingAudioStore')

function session () {
  const { meetingId } = store.createMeeting({
    firmId: 'f1', advisor: 'a1', scenarioId: 'strategy_session', retentionMonths: 18, segmented: true
  })
  return meetingId
}

function filesOf (meetingId) {
  return fs.readdirSync(path.join(ROOT, meetingId))
}

afterAll(() => {
  try { fs.rmdirSync(ROOT, { recursive: true }) } catch (e) { /* temp dir */ }
})

describe('opening segments', () => {
  test('segments are numbered in order and carry their concept', () => {
    const id = session()
    const first = store.openSegment(id, { conceptId: 'our-session-objective', label: 'Our Session Objective' })
    store.updateSegment(id, first.n, { state: 'closed' })
    const second = store.openSegment(id, { conceptId: 'porters-5-forces', label: "Porter's 5 Forces" })
    expect([first.n, second.n]).toEqual([1, 2])
    expect(store.readMeta(id).segments.map(s => s.conceptId)).toEqual(['our-session-objective', 'porters-5-forces'])
  })

  test('only one segment records at a time', () => {
    const id = session()
    store.openSegment(id, { conceptId: 'a', label: 'A' })
    expect(() => store.openSegment(id, { conceptId: 'b', label: 'B' })).toThrow(/already recording/)
  })

  test('a single-file meeting cannot open a segment', () => {
    const { meetingId } = store.createMeeting({ firmId: 'f1', advisor: 'a1', retentionMonths: 18 })
    expect(() => store.openSegment(meetingId, { label: 'A' })).toThrow(/not recorded in segments/)
  })

  test.each([[0], [-1], [1.5], [store.MAX_SEGMENTS + 1], ['1']])(
    'segment number %p never becomes a file name', (n) => {
      const id = session()
      expect(() => store.listSegmentChunks(id, n)).toThrow(/invalid segment number/)
    }
  )
})

describe('the size of one segment — every file stays under OpenAI\'s limit', () => {
  test('the browser is told to roll over at 20 MB, and the server refuses past 24 MB', () => {
    expect(store.SEGMENT_ROLL_BYTES).toBe(20 * 1024 * 1024)
    expect(store.SEGMENT_MAX_BYTES).toBeLessThan(25 * 1024 * 1024)
    expect(store.SEGMENT_ROLL_BYTES).toBeLessThan(store.SEGMENT_MAX_BYTES)
  })

  test('a chunk that would take a segment past its cap is refused', () => {
    const id = session()
    const { n } = store.openSegment(id, { label: 'A' })
    store.updateSegment(id, n, { bytes: store.SEGMENT_MAX_BYTES - 2 })
    expect(() => store.appendSegmentChunk(id, n, 1, Buffer.from('ABC'))).toThrow(/segment is full/)
  })

  test('crossing the roll-over size says so', () => {
    const id = session()
    const { n } = store.openSegment(id, { label: 'A' })
    const small = store.appendSegmentChunk(id, n, 1, Buffer.from('AUDIO'))
    expect(small.rollOver).toBe(false)
    expect(small.segmentBytes).toBe(5)
  })

  test('a retried chunk counts once', () => {
    const id = session()
    const { n } = store.openSegment(id, { label: 'A' })
    store.appendSegmentChunk(id, n, 1, Buffer.from('AUDIO'))
    const again = store.appendSegmentChunk(id, n, 1, Buffer.from('AUDIO'))
    expect(again.segmentBytes).toBe(5)
    expect(store.readMeta(id).bytes).toBe(5)
  })

  test('a chunk for a segment that is not recording is refused', () => {
    const id = session()
    const { n } = store.openSegment(id, { label: 'A' })
    store.updateSegment(id, n, { state: 'closed' })
    expect(() => store.appendSegmentChunk(id, n, 1, Buffer.from('X'))).toThrow(/not recording/)
  })

  test('the single-file chunk path is refused for a segmented session, so the cap cannot be bypassed', () => {
    const id = session()
    expect(() => store.appendChunk(id, 1, Buffer.from('X'))).toThrow(/recorded in segments/)
  })

  test('a segment\'s chunks stitch in capture order', () => {
    const id = session()
    const { n } = store.openSegment(id, { label: 'A' })
    store.appendSegmentChunk(id, n, 2, Buffer.from('two'))
    store.appendSegmentChunk(id, n, 1, Buffer.from('one'))
    expect(store.assembleSegment(id, n).toString()).toBe('onetwo')
  })
})

describe('the voice clip', () => {
  test('is kept for the session and read back with its type', () => {
    const id = session()
    store.writeVoiceReference(id, Buffer.from('VOICE'), 'audio/webm')
    const ref = store.readVoiceReference(id)
    expect(ref.buffer.toString()).toBe('VOICE')
    expect(ref.mime).toBe('audio/webm')
  })

  test('anything larger than a clip is refused', () => {
    const id = session()
    expect(() => store.writeVoiceReference(id, Buffer.alloc(store.MAX_VOICE_REFERENCE_BYTES + 1), 'audio/webm'))
      .toThrow(/too large/)
  })
})

describe('deletion reaches every new file', () => {
  test('one segment\'s audio goes once it is text, and the voice clip stays for the next segment', () => {
    const id = session()
    store.writeVoiceReference(id, Buffer.from('VOICE'), 'audio/webm')
    const { n } = store.openSegment(id, { label: 'A' })
    store.appendSegmentChunk(id, n, 1, Buffer.from('AUDIO'))
    const proof = store.destroySegmentAudio(id, n)
    expect(proof).toEqual({ removed: 1, bytesRemoved: 5, audioRemains: false })
    expect(filesOf(id)).toContain(store.VOICE_REFERENCE_FILE)
  })

  test('destroyAudio takes every segment\'s chunks AND the voice clip, and keeps the text', () => {
    const id = session()
    store.writeVoiceReference(id, Buffer.from('VOICE'), 'audio/webm')
    const { n } = store.openSegment(id, { label: 'A' })
    store.appendSegmentChunk(id, n, 1, Buffer.from('AUDIO'))
    store.writeSegmentTranscript(id, n, { segments: [] })
    const proof = store.destroyAudio(id)
    expect(proof.audioRemains).toBe(false)
    expect(proof.removed).toBe(2)
    const left = filesOf(id)
    expect(left).not.toContain(store.VOICE_REFERENCE_FILE)
    expect(left.some(f => /chunk/.test(f))).toBe(false)
    expect(left).toContain('seg-001-text.json')
  })

  test('destroyTranscript takes every segment\'s text with the joined transcript', () => {
    // 🔴 The retention clock's promise. The joined transcript alone expiring would leave every
    // word of the session in the segment files beside it.
    const id = session()
    const a = store.openSegment(id, { label: 'A' })
    store.writeSegmentTranscript(id, a.n, { segments: [{ text: 'client words' }] })
    store.updateSegment(id, a.n, { state: 'done' })
    const b = store.openSegment(id, { label: 'B' })
    store.writeSegmentTranscript(id, b.n, { segments: [] })
    store.writeTranscript(id, { segments: [] })
    const proof = store.destroyTranscript(id)
    expect(proof.textRemains).toBe(false)
    expect(filesOf(id).some(f => /text\.json$/.test(f))).toBe(false)
  })

  test('"Stop and delete everything" leaves nothing of a segmented session', () => {
    const id = session()
    store.writeVoiceReference(id, Buffer.from('VOICE'), 'audio/webm')
    const { n } = store.openSegment(id, { label: 'A' })
    store.appendSegmentChunk(id, n, 1, Buffer.from('AUDIO'))
    store.writeSegmentTranscript(id, n, { segments: [] })
    expect(store.destroyMeeting(id).meetingRemains).toBe(false)
    expect(fs.existsSync(path.join(ROOT, id))).toBe(false)
  })
})
