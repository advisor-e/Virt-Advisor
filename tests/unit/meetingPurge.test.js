'use strict'

/**
 * The transcript expiry sweep — Meeting Review P8, the half that shipped after the audio.
 *
 * 🔴 NOTHING HERE IS VISIBLE TO A PERSON TESTING IN UAT, and that is the point. A firm's
 * retention dial reads correctly on screen whether or not anything ever acts on it, and a
 * transcript that should have been deleted eighteen months ago looks exactly like one that
 * should not. What these tests pin:
 *
 *   1. **The clock is the one the CLIENT was shown**, stored on the meeting record, never the
 *      firm's current dial. Resolving the live setting would silently extend a transcript a
 *      client was promised would be gone — the one direction this must never move.
 *   2. **The reports go with the transcript.** Every coaching finding quotes the transcript
 *      verbatim. Deleting `transcript.json` alone keeps the client's own words in two other
 *      files: the letter of the promise kept, the substance broken.
 *   3. **A meeting with no promised period is never purged.** It cannot be expired against a
 *      promise nobody can produce, and a guessed period deletes a client's record on a number
 *      nobody said aloud.
 *   4. **A failure surfaces.** P8 is "provable, not best effort", so a file that will not
 *      delete is reported rather than counted as done.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'mpurge-test-'))
process.env.MEETING_AUDIO_DIR = ROOT

const store = require('../../server/utils/meetingAudioStore')
const { expiryOf, isExpired, purgeExpired } = require('../../server/utils/meetingPurge')

const FIRM = 'firm-purge-1'

/**
 * A meeting with a transcript and both reports already written.
 *
 * @param {object} opts
 * @param {string} opts.createdAt
 * @param {number|null} opts.retentionMonths
 * @param {boolean} [opts.withText]
 * @returns {string} the meeting id
 */
function seed (opts) {
  const { meetingId } = store.createMeeting({
    firmId: FIRM,
    advisor: 'adv-1',
    retentionMonths: opts.retentionMonths
  })
  store.updateMeta(meetingId, { createdAt: opts.createdAt })
  if (opts.withText !== false) {
    store.writeTranscript(meetingId, { segments: [{ role: 'ADVISOR', text: 'the client said' }] })
    store.writeReport(meetingId, 'summary', { covered: ['a point'] })
    store.writeReport(meetingId, 'coaching', {
      findings: [{ pointId: 'p1', state: 'found', quote: 'a verbatim client sentence' }]
    })
  }
  return meetingId
}

function textFilesFor (id) {
  return fs.readdirSync(path.join(ROOT, id)).filter(n => n !== 'meeting.json')
}

afterAll(() => {
  try { fs.rmdirSync(ROOT, { recursive: true }) } catch (_e) { /* the OS will sweep it */ }
})

describe('when a transcript expires', () => {
  test('the period is counted from the meeting, in months', () => {
    const due = expiryOf({ createdAt: '2026-01-15T10:00:00.000Z', retentionMonths: 18 })
    expect(due.toISOString().slice(0, 10)).toBe('2027-07-15')
  })

  test('a meeting one day short of its period is not expired', () => {
    const meta = { createdAt: '2026-01-15T10:00:00.000Z', retentionMonths: 18 }
    expect(isExpired(meta, new Date('2027-07-14T10:00:00.000Z'))).toBe(false)
    expect(isExpired(meta, new Date('2027-07-15T10:00:00.000Z'))).toBe(true)
  })

  test('🔴 a meeting with NO promised period never expires', () => {
    expect(expiryOf({ createdAt: '2020-01-01T00:00:00.000Z', retentionMonths: null })).toBeNull()
    expect(expiryOf({ createdAt: '2020-01-01T00:00:00.000Z' })).toBeNull()
    expect(expiryOf({ createdAt: '2020-01-01T00:00:00.000Z', retentionMonths: 0 })).toBeNull()
    expect(isExpired({ createdAt: '2020-01-01T00:00:00.000Z' }, new Date())).toBe(false)
  })

  test('an unreadable date does not produce an expiry', () => {
    expect(expiryOf({ createdAt: 'not a date', retentionMonths: 18 })).toBeNull()
    expect(expiryOf(null)).toBeNull()
  })
})

describe('the sweep', () => {
  test('🔴 the transcript AND both reports go — the reports quote the transcript', () => {
    const id = seed({ createdAt: '2020-01-01T00:00:00.000Z', retentionMonths: 18 })
    expect(textFilesFor(id).length).toBe(3)

    const r = purgeExpired(new Date('2026-09-07T00:00:00.000Z'))
    expect(r.purged).toBeGreaterThanOrEqual(1)

    expect(store.readTranscript(id)).toBeNull()
    expect(store.readReport(id, 'summary')).toBeNull()
    expect(store.readReport(id, 'coaching')).toBeNull()
    expect(textFilesFor(id)).toEqual([])
  })

  test('the meeting record survives, stamped with when the text went', () => {
    // Without the record there is nothing to prove the expiry ran, only a missing directory.
    const id = seed({ createdAt: '2020-02-01T00:00:00.000Z', retentionMonths: 12 })
    purgeExpired(new Date('2026-09-07T00:00:00.000Z'))
    const meta = store.readMeta(id)
    expect(meta).not.toBeNull()
    expect(meta.firmId).toBe(FIRM)
    expect(typeof meta.transcriptPurgedAt).toBe('string')
  })

  test('a meeting still inside its period is untouched', () => {
    const id = seed({ createdAt: '2026-09-01T00:00:00.000Z', retentionMonths: 18 })
    purgeExpired(new Date('2026-09-07T00:00:00.000Z'))
    expect(store.readTranscript(id)).not.toBeNull()
    expect(store.readReport(id, 'coaching')).not.toBeNull()
  })

  test('🔴 a meeting with no promised period is REPORTED, not purged', () => {
    const id = seed({ createdAt: '2019-01-01T00:00:00.000Z', retentionMonths: null })
    const r = purgeExpired(new Date('2026-09-07T00:00:00.000Z'))
    expect(r.unclocked).toBeGreaterThanOrEqual(1)
    expect(store.readTranscript(id)).not.toBeNull()
  })

  test('sweeping twice is a no-op, not a pile of failures', () => {
    seed({ createdAt: '2020-03-01T00:00:00.000Z', retentionMonths: 6 })
    purgeExpired(new Date('2026-09-07T00:00:00.000Z'))
    const second = purgeExpired(new Date('2026-09-07T00:00:00.000Z'))
    expect(second.failures).toEqual([])
    expect(second.purged).toBe(0)
    expect(second.expired).toBeGreaterThan(0)
  })

  test('the sweep reports what it did', () => {
    const r = purgeExpired(new Date('2026-09-07T00:00:00.000Z'))
    expect(typeof r.scanned).toBe('number')
    expect(typeof r.expired).toBe('number')
    expect(typeof r.filesRemoved).toBe('number')
    expect(typeof r.bytesRemoved).toBe('number')
    expect(Array.isArray(r.failures)).toBe(true)
  })

  test('🔴 a deletion that did not happen is a FAILURE, never a silent success', () => {
    const id = seed({ createdAt: '2020-04-01T00:00:00.000Z', retentionMonths: 6 })
    const spy = jest.spyOn(store, 'destroyTranscript').mockReturnValue({
      removed: 0, bytesRemoved: 0, textRemains: true
    })
    const r = purgeExpired(new Date('2026-09-07T00:00:00.000Z'))
    expect(r.failures).toContain(id)
    expect(r.purged).toBe(0)
    spy.mockRestore()
  })

  test('a throwing store is reported rather than stopping the sweep', () => {
    const id = seed({ createdAt: '2020-05-01T00:00:00.000Z', retentionMonths: 6 })
    const spy = jest.spyOn(store, 'destroyTranscript').mockImplementation(() => {
      throw new Error('disk gone')
    })
    const r = purgeExpired(new Date('2026-09-07T00:00:00.000Z'))
    expect(r.failures).toContain(id)
    spy.mockRestore()
  })

  test('an empty store is an honest zero, not a crash', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'mpurge-empty-'))
    const was = process.env.MEETING_AUDIO_DIR
    process.env.MEETING_AUDIO_DIR = empty
    const r = purgeExpired(new Date())
    expect(r.scanned).toBe(0)
    expect(r.purged).toBe(0)
    expect(r.failures).toEqual([])
    process.env.MEETING_AUDIO_DIR = was
  })
})

describe('🔴 the clock is the one the client was shown', () => {
  test('a meeting expires on ITS OWN stored period, not on a firm-wide figure', () => {
    // Two meetings of the same firm, recorded under different dials. If anything resolved a
    // single current setting, one of these two would be wrong — and both would look fine.
    const shortOne = seed({ createdAt: '2025-01-01T00:00:00.000Z', retentionMonths: 6 })
    const longOne = seed({ createdAt: '2025-01-01T00:00:00.000Z', retentionMonths: 36 })

    purgeExpired(new Date('2026-01-01T00:00:00.000Z'))

    expect(store.readTranscript(shortOne)).toBeNull()
    expect(store.readTranscript(longOne)).not.toBeNull()
  })
})
