'use strict'

/**
 * The parts row's arithmetic — item 8.4, the long-recording drawing (approved 2026-10-01).
 *
 * What UAT cannot see: a meeting has to run past 20 minutes before a second part exists, and a
 * part has to FAIL before its warning shows. These pin that every part's minutes are counted
 * from part 1's start — the clock the joined transcript and the reports use — so "the transcript
 * is missing 20:00–40:00" names the minutes that are actually missing.
 */

const { clockOf, describeParts, failedParts } = require('../../utils/meetingParts')

const PARTS = [
  { n: 1, state: 'done', startedAt: '2026-10-01T09:00:00.000Z', closedAt: '2026-10-01T09:20:00.000Z' },
  { n: 2, state: 'failed', startedAt: '2026-10-01T09:20:00.000Z', closedAt: '2026-10-01T09:40:00.000Z' },
  { n: 3, state: 'transcribing', startedAt: '2026-10-01T09:40:00.000Z', closedAt: '2026-10-01T10:07:12.000Z' },
  { n: 4, state: 'recording', startedAt: '2026-10-01T10:07:12.000Z', closedAt: null }
]

test('every part is timed from part 1\'s start, past the hour included', () => {
  expect(describeParts(PARTS)).toEqual([
    { n: 1, status: 'ready', from: '00:00', to: '20:00' },
    { n: 2, status: 'failed', from: '20:00', to: '40:00' },
    { n: 3, status: 'working', from: '40:00', to: '67:12' },
    { n: 4, status: 'recording', from: '67:12', to: '' }
  ])
})

test('one part shows no row — a meeting under 20 minutes looks as it always did (Decision D)', () => {
  expect(describeParts(PARTS.slice(0, 1))).toEqual([])
})

test('a failed part is named by its minutes, even when it is the only part', () => {
  expect(failedParts(PARTS)).toEqual([{ n: 2, from: '20:00', to: '40:00' }])
  expect(failedParts([{ n: 1, state: 'failed', startedAt: '2026-10-01T09:00:00.000Z', closedAt: '2026-10-01T09:12:30.000Z' }]))
    .toEqual([{ n: 1, from: '00:00', to: '12:30' }])
})

test('the order the server lists parts in does not change the clock', () => {
  expect(describeParts(PARTS.slice().reverse())[0]).toEqual({ n: 1, status: 'ready', from: '00:00', to: '20:00' })
  expect(clockOf(-5)).toBe('00:00')
})
