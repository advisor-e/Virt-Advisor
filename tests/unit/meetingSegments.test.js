'use strict'

/**
 * Joining a strategy session's segments into one transcript (item 8.4).
 *
 * 🔴 WHAT UAT CANNOT SEE. Meeting Review's reports read the joined transcript exactly as they
 * read a single-file one, so a wrong join produces confident reports about the wrong minute
 * or the wrong speaker. Three ways that happens, each pinned here:
 *   1. times closed up across a break, so a quote's time is wrong;
 *   2. one unattributed segment hidden inside a "confident" session;
 *   3. a failed segment vanishing without trace.
 */

const ms = require('../../server/utils/meetingSegments')

const T0 = '2026-09-28T09:00:00.000Z'
const T1 = '2026-09-28T09:30:00.000Z' // 30 minutes later, after a break

function seg (n, state, startedAt, conceptId) {
  return { n, state, startedAt, conceptId: conceptId || 'c' + n, label: 'C' + n }
}

function text (rows, confident) {
  return { segments: rows, text: rows.map(r => r.text).join(' '), speakerCount: 2, attributionConfident: confident }
}

describe('settling', () => {
  test('a session is settled only when every segment is done, failed or empty', () => {
    expect(ms.allSettled([seg(1, 'done', T0), seg(2, 'failed', T1), seg(3, 'empty', T1)])).toBe(true)
    expect(ms.allSettled([seg(1, 'done', T0), seg(2, 'transcribing', T1)])).toBe(false)
    expect(ms.allSettled([seg(1, 'closed', T0)])).toBe(false)
    expect(ms.allSettled([seg(1, 'recording', T0)])).toBe(false)
  })
})

describe('joining', () => {
  test('each segment is shifted by when it started on the clock, so a break stays a break', () => {
    const joined = ms.joinTranscripts(
      [seg(2, 'done', T1, 'porters-5-forces'), seg(1, 'done', T0, 'our-session-objective')],
      n => n === 1
        ? text([{ speaker: 'advisor', role: 'advisor', start: 0, end: 20, text: 'consent' }], true)
        : text([{ speaker: 'A', role: 'client', start: 5, end: 9, text: 'two suppliers' }], true)
    )
    expect(joined.segments.map(r => r.start)).toEqual([0, 1805])
    expect(joined.segments.map(r => r.conceptId)).toEqual(['our-session-objective', 'porters-5-forces'])
    expect(joined.segments.map(r => r.segment)).toEqual([1, 2])
    expect(joined.attributionConfident).toBe(true)
  })

  test('one segment the voice clip matched nobody in makes the whole session not confident', () => {
    const joined = ms.joinTranscripts(
      [seg(1, 'done', T0), seg(2, 'done', T1)],
      n => text([{ role: n === 1 ? 'advisor' : 'unknown', start: 0, end: 1, text: 'x' }], n === 1)
    )
    expect(joined.attributionConfident).toBe(false)
  })

  test('a failed segment adds no rows and is named as missing; an empty one is not', () => {
    const joined = ms.joinTranscripts(
      [seg(1, 'done', T0), seg(2, 'failed', T1), seg(3, 'empty', T1)],
      n => (n === 1 ? text([{ role: 'advisor', start: 0, end: 1, text: 'x' }], true) : null)
    )
    expect(joined.segments).toHaveLength(1)
    expect(joined.missingSegments).toEqual([2])
    expect(joined.segmentCount).toBe(3)
  })

  test('a session where nothing was transcribed is never called confident', () => {
    const joined = ms.joinTranscripts([seg(1, 'failed', T0)], () => null)
    expect(joined.attributionConfident).toBe(false)
    expect(joined.segments).toEqual([])
  })

  test('a stored transcript of the wrong shape is treated as missing, not read', () => {
    const joined = ms.joinTranscripts([seg(1, 'done', T0)], () => ({ segments: 'nope' }))
    expect(joined.missingSegments).toEqual([1])
  })

  test.each([[null], [undefined], ['x']])('no segment list (%p) joins to nothing', (input) => {
    expect(ms.joinTranscripts(input, () => null).segments).toEqual([])
  })
})

describe('what the screen may see', () => {
  test('segment states and sizes, never their words', () => {
    const shown = ms.publicSegments({
      segments: [{ ...seg(1, 'done', T0), bytes: 9, audioDeletedAt: T1, attributionConfident: true, secret: 'x' }]
    })
    expect(shown[0]).toEqual({
      n: 1,
      conceptId: 'c1',
      label: 'C1',
      state: 'done',
      startedAt: T0,
      closedAt: null,
      bytes: 9,
      audioDeleted: true,
      attributionConfident: true,
      summaryState: null,
      summaryApproved: false
    })
  })
})
