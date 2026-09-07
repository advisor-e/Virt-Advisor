'use strict'

/**
 * Follow-through — last meeting's agreed actions, checked against this one.
 *
 * 🔴 THE ONE THAT MATTERS MOST IS THE MATCH, AND UAT CANNOT SEE IT. A follow-through block
 * built against the WRONG client renders as a perfectly ordinary report: real actions, real
 * quotes, real timestamps, and every one of them from somebody else's business. A tester with
 * one client's meeting in front of them has nothing to compare it against.
 *
 * What these tests pin:
 *
 *   1. **The match is firm + advisor + client.** Not the advisor and the meeting type, which is
 *      what would be available without a client on the record.
 *   2. **Same advisor, because of P2** — a recording belongs to the advisor who made it, and a
 *      colleague's summary is not theirs to read.
 *   3. **No client means no match**, never a guess.
 *   4. **An expired previous meeting says so**, rather than reporting that no actions were
 *      agreed — a different and untrue statement, and the one a reader would believe.
 *   5. **The two kinds of finding come back apart.** They travel to the model in one list, and
 *      an observation point leaking into the follow-through block (or the reverse) would look
 *      entirely plausible on screen.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'mft-test-'))
process.env.MEETING_AUDIO_DIR = ROOT

const store = require('../../server/utils/meetingAudioStore')
const {
  FOLLOW_PREFIX,
  findPrevious,
  actionPoints,
  splitFindings,
  buildBlock
} = require('../../server/utils/meetingFollowThrough')

const FIRM = 'firm-ft-1'
const ADVISOR = 'adv-ft-1'
const CLIENT = 'client-ft-1'

/**
 * A stored meeting, optionally with a summary carrying agreed actions.
 *
 * @param {object} o
 * @returns {object} the meeting record
 */
function seed (o) {
  const { meetingId } = store.createMeeting({
    firmId: o.firmId || FIRM,
    advisor: o.advisor || ADVISOR,
    clientId: 'clientId' in o ? o.clientId : CLIENT,
    retentionMonths: 18
  })
  store.updateMeta(meetingId, { createdAt: o.createdAt })
  if (o.actions) {
    store.writeReport(meetingId, 'summary', { covered: 'x', actions: o.actions })
  }
  return store.readMeta(meetingId)
}

afterAll(() => {
  try { fs.rmdirSync(ROOT, { recursive: true }) } catch (_e) { /* the OS will sweep it */ }
})

describe('finding the previous meeting', () => {
  test('the most recent EARLIER meeting with the same client is chosen', () => {
    seed({ createdAt: '2026-01-10T09:00:00.000Z', actions: [{ what: 'january action' }] })
    seed({ createdAt: '2026-03-10T09:00:00.000Z', actions: [{ what: 'march action' }] })
    const current = seed({ createdAt: '2026-04-10T09:00:00.000Z' })

    const prev = findPrevious(store, current)
    expect(prev).not.toBeNull()
    expect(prev.actions[0].what).toBe('march action')
  })

  test('a LATER meeting is never chosen', () => {
    const current = seed({ createdAt: '2026-04-10T09:00:00.000Z' })
    seed({ createdAt: '2026-05-10T09:00:00.000Z', actions: [{ what: 'the future' }] })
    const prev = findPrevious(store, current)
    expect(prev.actions[0].what).not.toBe('the future')
  })

  test('🔴 another CLIENT of the same advisor is never matched', () => {
    seed({
      createdAt: '2026-04-01T09:00:00.000Z',
      clientId: 'someone-else',
      actions: [{ what: 'another business entirely' }]
    })
    const current = seed({ createdAt: '2026-04-20T09:00:00.000Z', clientId: 'a-lonely-client' })
    expect(findPrevious(store, current)).toBeNull()
  })

  test('🔴 another ADVISOR at the same firm is never matched — P2', () => {
    seed({
      createdAt: '2026-04-02T09:00:00.000Z',
      advisor: 'a-colleague',
      clientId: 'shared-client',
      actions: [{ what: 'my colleague\'s note' }]
    })
    const current = seed({ createdAt: '2026-04-21T09:00:00.000Z', clientId: 'shared-client' })
    expect(findPrevious(store, current)).toBeNull()
  })

  test('🔴 another FIRM is never matched', () => {
    seed({
      createdAt: '2026-04-03T09:00:00.000Z',
      firmId: 'a-different-firm',
      clientId: 'coincidence',
      actions: [{ what: 'not ours' }]
    })
    const current = seed({ createdAt: '2026-04-22T09:00:00.000Z', clientId: 'coincidence' })
    expect(findPrevious(store, current)).toBeNull()
  })

  test('🔴 a meeting with NO client is never matched, rather than guessed at', () => {
    seed({ createdAt: '2026-04-04T09:00:00.000Z', clientId: null, actions: [{ what: 'x' }] })
    const current = seed({ createdAt: '2026-04-23T09:00:00.000Z', clientId: null })
    expect(findPrevious(store, current)).toBeNull()
  })

  test('🔴 an expired previous meeting is reported as expired, not as "no actions"', () => {
    // Its record survives the purge; its summary does not. Reporting zero actions here would
    // tell an advisor nothing was agreed last time, which is a different and untrue statement.
    const old = seed({ createdAt: '2026-02-01T09:00:00.000Z', actions: [{ what: 'gone' }] })
    store.destroyTranscript(old.meetingId)
    const current = seed({ createdAt: '2026-02-20T09:00:00.000Z' })

    const prev = findPrevious(store, current)
    expect(prev.expired).toBe(true)
    expect(prev.actions).toEqual([])
    expect(buildBlock(prev, []).expired).toBe(true)
  })

  test('an unreadable current record yields no match rather than throwing', () => {
    expect(findPrevious(store, null)).toBeNull()
    expect(findPrevious(store, { firmId: FIRM, advisor: ADVISOR, clientId: CLIENT, createdAt: 'nope' })).toBeNull()
  })
})

describe('the actions become points the citation guard already covers', () => {
  test('each action is one point, prefixed so it can be split back out', () => {
    const points = actionPoints([
      { who: 'the client', what: 'send the bank the forecast', when: 'end of month' },
      { who: '', what: 'book the valuation', when: '' }
    ])
    expect(points).toHaveLength(2)
    expect(points[0].id).toBe(FOLLOW_PREFIX + '0')
    expect(points[0].text).toContain('send the bank the forecast')
    expect(points[1].id).toBe(FOLLOW_PREFIX + '1')
  })

  test('an action with no text is dropped rather than asked about as an empty string', () => {
    expect(actionPoints([{ what: '' }, { what: '   ' }, null])).toEqual([])
  })

  test('no actions is an empty list, so nothing is added to the request', () => {
    expect(actionPoints([])).toEqual([])
    expect(actionPoints(null)).toEqual([])
  })
})

describe('🔴 the two kinds of finding come back apart', () => {
  test('observation findings and follow-through findings are separated by id', () => {
    const split = splitFindings([
      { pointId: 'p1', state: 'found' },
      { pointId: FOLLOW_PREFIX + '0', state: 'found' },
      { pointId: 'own-2', state: 'not_found' },
      { pointId: FOLLOW_PREFIX + '1', state: 'not_found' }
    ])
    expect(split.findings.map(f => f.pointId)).toEqual(['p1', 'own-2'])
    expect(split.followThrough).toHaveLength(2)
  })

  test('a malformed findings list does not crash the split', () => {
    expect(splitFindings(null)).toEqual({ findings: [], followThrough: [] })
    expect(splitFindings([null, {}]).findings).toHaveLength(2)
  })
})

describe('the stored block', () => {
  test('each prior action is paired with what this meeting did about it', () => {
    const prev = {
      meetingId: 'abc',
      at: '2026-03-10T09:00:00.000Z',
      expired: false,
      actions: [
        { who: 'the client', what: 'send the forecast', when: 'end of month' },
        { who: 'me', what: 'call the bank', when: '' }
      ]
    }
    const block = buildBlock(prev, [
      { pointId: FOLLOW_PREFIX + '0', state: 'found', quote: 'did you send that forecast', at: '4:10', atSeconds: 250 }
    ])

    expect(block.items).toHaveLength(2)
    expect(block.items[0].state).toBe('found')
    expect(block.items[0].quote).toBe('did you send that forecast')
    expect(block.items[0].what).toBe('send the forecast')
    // An action the model said nothing about reads as not followed through, never as absent.
    expect(block.items[1].state).toBe('not_found')
    expect(block.items[1].quote).toBeNull()
  })

  test('no previous meeting means no block at all', () => {
    expect(buildBlock(null, [])).toBeNull()
  })
})
