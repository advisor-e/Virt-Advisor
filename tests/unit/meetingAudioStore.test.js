'use strict'

/**
 * Guards `server/utils/meetingAudioStore.js` — Meeting Review slice 2, the recording while it
 * briefly exists.
 *
 * 🔴 THIS MODULE HOLDS THE MOST DANGEROUS THING THIS APPLICATION EVER WILL. The Brief §1:
 * *"an hour of a client's private financial affairs … exists to be turned into text and then
 * to stop existing."* Three of the things that can go wrong here are invisible to a person
 * testing in UAT, which is what earns this file its place:
 *
 *   1. **A path-traversal meeting id.** `../../etc` reaching a filesystem path looks like
 *      nothing at all on screen. The id is checked before it is ever concatenated.
 *   2. **A deletion that reported success and removed nothing.** §5 trap 4 — "deletion that
 *      is best-effort" — is a promise made to a firm's clients. A tester sees "deleted".
 *   3. **Ownership.** Brief P2 gives a recording to the advisor who made it, so a colleague
 *      at the same firm is as much a stranger to it as another firm is. A test account will
 *      never notice the difference.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'mas-test-'))
process.env.MEETING_AUDIO_DIR = ROOT

const store = require('../../server/utils/meetingAudioStore')

const OWNER = { firmId: 'firm-1', advisor: 'adv-1', scenarioId: 'eoy_meeting', retentionMonths: 18 }

afterAll(() => {
  try { fs.rmdirSync(ROOT, { recursive: true }) } catch (e) { /* best effort, it is a temp dir */ }
})

describe('a meeting id from a request can never become a path', () => {
  test.each([
    ['traversal', '../../../etc'],
    ['traversal with separators', 'a/../../b'],
    ['a backslash', '..\\..\\windows'],
    ['too short', 'abc'],
    ['not hex', 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'],
    ['uppercase hex', 'ABCDEF01234567890ABCDEF012345678'],
    ['empty', ''],
    ['a number', 12345],
    ['null', null],
    ['an object', {}]
  ])('%s is refused', (_label, id) => {
    // 🔴 EVERY path builder in the module goes through the same guard, so this holds for
    // readMeta, appendChunk, assemble and both deletions alike — which is why the guard is
    // in one place rather than repeated per function.
    expect(() => store.readMeta(id)).toThrow(/invalid meeting id/)
  })

  test('a minted id is accepted', () => {
    const { meetingId } = store.createMeeting(OWNER)
    expect(meetingId).toMatch(store.MEETING_ID_PATTERN)
    expect(store.readMeta(meetingId)).not.toBeNull()
  })

  test('a well-formed id that does not exist reads as null, not as a throw', () => {
    // A missing meeting is a 404 the caller can answer without a try/catch. A MALFORMED id
    // still throws, because that is not a missing meeting — it is a request that should
    // never have been built.
    expect(store.readMeta('0'.repeat(32))).toBeNull()
  })
})

describe('ownership', () => {
  test('the owning advisor is recognised', () => {
    const { meta } = store.createMeeting(OWNER)
    expect(store.isOwnedBy(meta, 'firm-1', 'adv-1')).toBe(true)
  })

  test('a colleague at the same firm is not the owner', () => {
    // Brief P2. This is the one a shared test login would never catch.
    const { meta } = store.createMeeting(OWNER)
    expect(store.isOwnedBy(meta, 'firm-1', 'adv-2')).toBe(false)
  })

  test('the same advisor id at another firm is not the owner', () => {
    const { meta } = store.createMeeting(OWNER)
    expect(store.isOwnedBy(meta, 'firm-2', 'adv-1')).toBe(false)
  })

  test.each([
    ['no meta', null, 'firm-1', 'adv-1'],
    ['no firm', 'meta', '', 'adv-1'],
    ['no advisor', 'meta', 'firm-1', ''],
    ['both blank', 'meta', '', '']
  ])('%s is refused rather than treated as a match', (_label, useMeta, firmId, advisor) => {
    const { meta } = store.createMeeting(OWNER)
    expect(store.isOwnedBy(useMeta === null ? null : meta, firmId, advisor)).toBe(false)
  })
})

describe('consent is not claimed when a meeting is created', () => {
  test('a new meeting has no confirmed consent', () => {
    // 🔴 RECORD → SPEAK → CONFIRM. The tick cannot precede the recording, or the client's
    // agreement lands outside the audio — the fault Mike caught in the drawing. A meeting
    // that was born consented would defeat that silently.
    const { meta } = store.createMeeting(OWNER)
    expect(meta.consentConfirmedAt).toBeNull()
    expect(meta.state).toBe('recording')
  })

  test('the retention figure the advisor was shown is stored with the meeting', () => {
    // A firm that later moves its dial must not retrospectively change what a client was
    // told at THIS meeting.
    const { meta } = store.createMeeting({ ...OWNER, retentionMonths: 36 })
    expect(meta.retentionMonths).toBe(36)
  })
})

describe('chunks', () => {
  let meetingId
  beforeEach(() => { meetingId = store.createMeeting(OWNER).meetingId })

  test('are stored and counted', () => {
    const result = store.appendChunk(meetingId, 1, Buffer.from('abc'))
    expect(result).toEqual({ chunkCount: 1, bytes: 3 })
  })

  test('the same sequence twice is one chunk, not two', () => {
    // A retry after a flaky upload must not double-count or duplicate audio in the assembly.
    store.appendChunk(meetingId, 1, Buffer.from('abc'))
    const result = store.appendChunk(meetingId, 1, Buffer.from('abc'))
    expect(result.chunkCount).toBe(1)
  })

  test.each([
    ['zero', 0],
    ['negative', -1],
    ['a fraction', 1.5],
    ['a string', '1'],
    ['NaN', NaN]
  ])('a %s sequence is refused', (_label, seq) => {
    expect(() => store.appendChunk(meetingId, seq, Buffer.from('a'))).toThrow()
  })

  test('an empty chunk is refused', () => {
    expect(() => store.appendChunk(meetingId, 1, Buffer.alloc(0))).toThrow(/empty/)
  })

  test('a non-buffer is refused', () => {
    expect(() => store.appendChunk(meetingId, 1, 'not a buffer')).toThrow()
  })

  test('an oversized chunk is refused', () => {
    const tooBig = Buffer.alloc(store.MAX_CHUNK_BYTES + 1)
    expect(() => store.appendChunk(meetingId, 1, tooBig)).toThrow(/too large/)
  })

  test('a meeting that is no longer recording refuses more audio', () => {
    store.appendChunk(meetingId, 1, Buffer.from('abc'))
    store.assemble(meetingId)
    expect(() => store.appendChunk(meetingId, 2, Buffer.from('def'))).toThrow(/no longer recording/)
  })

  test('a chunk for a meeting that does not exist is refused', () => {
    expect(() => store.appendChunk('0'.repeat(32), 1, Buffer.from('a'))).toThrow(/no such meeting/)
  })
})

describe('assembly', () => {
  test('stitches the chunks in capture order, not in the order they were written', () => {
    // 🔴 THE ORDER IS THE MEETING. Chunk 10 arriving before chunk 9 after a retry must not
    // reorder a client's conversation — and a plain readdir sort would put "chunk-10" before
    // "chunk-9" without the zero padding. Written out of order here on purpose.
    const { meetingId } = store.createMeeting(OWNER)
    store.appendChunk(meetingId, 10, Buffer.from('J'))
    store.appendChunk(meetingId, 2, Buffer.from('B'))
    store.appendChunk(meetingId, 9, Buffer.from('I'))
    store.appendChunk(meetingId, 1, Buffer.from('A'))

    store.assemble(meetingId)
    expect(store.readAssembled(meetingId).toString()).toBe('ABIJ')
  })

  test('a meeting with no chunks refuses to assemble', () => {
    const { meetingId } = store.createMeeting(OWNER)
    expect(() => store.assemble(meetingId)).toThrow(/nothing was captured/)
  })
})

describe('destroying the audio — P8, and it returns its proof', () => {
  test('every chunk and the assembled file go, and the count says so', () => {
    const { meetingId } = store.createMeeting(OWNER)
    store.appendChunk(meetingId, 1, Buffer.from('abc'))
    store.appendChunk(meetingId, 2, Buffer.from('de'))
    store.assemble(meetingId)

    const proof = store.destroyAudio(meetingId)

    // 🔴 THE COUNT IS THE PROOF. A deletion that reports nothing is indistinguishable from
    // one that did nothing, which is exactly the "best effort" §5 trap 4 names.
    expect(proof.removed).toBe(3) // two chunks + the assembled file
    expect(proof.bytesRemoved).toBe(10) // 3 + 2 + 5 assembled
    expect(proof.audioRemains).toBe(false)
    expect(store.listChunks(meetingId)).toEqual([])
  })

  test('the transcript and the meeting record survive it', () => {
    // P8 destroys the AUDIO once there is text. Taking the text with it would delete the
    // thing the audio existed to become.
    const { meetingId } = store.createMeeting(OWNER)
    store.appendChunk(meetingId, 1, Buffer.from('abc'))
    store.writeTranscript(meetingId, { text: 'hello' })

    store.destroyAudio(meetingId)

    expect(store.readTranscript(meetingId)).toEqual({ text: 'hello' })
    expect(store.readMeta(meetingId)).not.toBeNull()
  })

  test('a meeting with no audio reports an honest zero rather than failing', () => {
    const { meetingId } = store.createMeeting(OWNER)
    expect(store.destroyAudio(meetingId)).toEqual({
      removed: 0, bytesRemoved: 0, audioRemains: false
    })
  })
})

describe('stop and delete — it must take the transcript too', () => {
  test('audio, transcript and record all go, and the directory with them', () => {
    // 🔴 `MEETING-CONSENT-WORDING.md` §4: *"'Delete' here means the audio AND any transcript
    // already derived from it. A meeting the client withdrew consent to must not survive as
    // text because the chunks happened to be transcribed early."* Deleting only the audio
    // would honour the letter of a client's refusal and break its substance.
    const { meetingId } = store.createMeeting(OWNER)
    store.appendChunk(meetingId, 1, Buffer.from('abc'))
    store.writeTranscript(meetingId, { text: 'what the client said' })

    const proof = store.destroyMeeting(meetingId)

    expect(proof.meetingRemains).toBe(false)
    expect(proof.removed).toBeGreaterThan(0)
    expect(store.readMeta(meetingId)).toBeNull()
    expect(store.readTranscript(meetingId)).toBeNull()
  })

  test('deleting a meeting that is already gone is not an error', () => {
    // The advisor pressing "stop and delete" twice, or after a crash, must not see a failure
    // that suggests something survived.
    const { meetingId } = store.createMeeting(OWNER)
    store.destroyMeeting(meetingId)
    expect(store.destroyMeeting(meetingId).meetingRemains).toBe(false)
  })
})

describe('the store lives outside the repository', () => {
  test('the root honours MEETING_AUDIO_DIR', () => {
    // A recording must not survive in a backup taken between capture and deletion, and it
    // must never be inside a directory that gets committed.
    expect(store.audioRoot()).toBe(ROOT)
  })
})
