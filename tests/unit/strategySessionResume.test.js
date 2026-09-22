/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * THE DOOR — reopening a strategy session. Item 15.1, stage 7.
 *
 * Design: design/mockups/strategy-session-resume.html. Decisions A, B, D and E ruled by
 * Mike 2026-09-22; C dropped by him the same day.
 *
 * 🔴 WHY THIS FEATURE EXISTS. Until this was built, an advisor who left the session screen
 * for ANY reason came back to a blank one with no way into the session they had been
 * running, and pressing `Build the session` again opened an empty duplicate for the same
 * client. Everything typed was stored and unreachable.
 *
 * 🔴 WHAT THESE TESTS GUARD, and none of it is wording or styling — every one of them is
 * something a person in UAT cannot see:
 *
 *   1. REOPENING RESTORES THE ADVISOR'S OWN ARRANGEMENT. A session's saved steps must
 *      never be overwritten by the firm's standard process. On screen both look like "a
 *      session with steps in it"; only the names tell them apart, and the advisor's own
 *      work would be the thing lost.
 *   2. WHERE IT LANDS (Decision B). Derived from the timeline's newest row, skipping any
 *      concept since unticked — landing on a concept with no card is a blank screen.
 *   3. TYPING NEVER SAVES. The per-keystroke defect of the same day must not come back
 *      through the door built to report it. A person typing sees no difference whatever.
 *   4. THE STAMP NEVER LIES (Decision E), including after a FAILED save. A green tick over
 *      words that did not reach the database is the one thing it exists to prevent, and it
 *      is invisible until somebody goes looking for an answer that is not there.
 *   5. NO SILENT RESUME (Decision A). Guessing wrong in front of a client cannot be undone
 *      in the room.
 */

const { shallowWithBuefy } = require('../helpers/mountComponent')
const StrategyPlanner = require('~/pages/strategy-planner.vue').default

/** A session as `GET /api/strategy/sessions?clientId=` returns one. */
const session = over => Object.assign({
  id: 7,
  clientId: 'c1',
  advisorName: 'James Okoro',
  startedAt: '2026-09-19T14:14:00.000Z',
  lastOpenedAt: '2026-09-19T16:02:00.000Z',
  scope: { domains: [], frameworks: ['porters-5-forces'], steps: [], suggestion: null }
}, over || {})

const mountPage = () => shallowWithBuefy(StrategyPlanner, {
  mocks: {
    $route: { query: {} },
    $router: { replace: () => Promise.resolve() }
  },
  stubs: { 'b-notification': true, 'b-loading': true, 'b-select': true, 'b-button': true }
})

describe('the bar that offers a session back', () => {
  it('🔴 offers nothing once a session is already open — a silent resume mid-session', () => {
    const w = mountPage()
    w.setData({ clientSessions: [session()], sessionId: 7 })
    expect(w.vm.mostRecentSession).toBeNull()
  })

  it('offers the newest, and lists the rest behind the link', () => {
    const w = mountPage()
    w.setData({ clientSessions: [session({ id: 9 }), session({ id: 5 }), session({ id: 3 })] })
    expect(w.vm.mostRecentSession.id).toBe(9)
    expect(w.vm.earlierSessions.map(s => s.id)).toEqual([5, 3])
  })

  it('🔴 "Start a new session" opens NOTHING — it only puts the bar away', () => {
    const w = mountPage()
    w.setData({ clientSessions: [session()], showEarlier: true })
    w.vm.dismissResume()
    // Opening a session here would strand the advisor: one would exist, nothing would be
    // ticked, and the screen would have skipped the only stage where ticking happens.
    expect(w.vm.sessionId).toBeNull()
    expect(w.vm.mostRecentSession).toBeNull()
    expect(w.vm.showEarlier).toBe(false)
  })

  it('names whose session it is — the route is scoped to the firm, not the advisor', () => {
    const w = mountPage()
    const line = w.vm.sessionFacts(session({ advisorName: 'James Okoro' }))
    expect(line).toContain('James Okoro')
  })
})

describe('where a reopened session lands — Decision B', () => {
  it('goes to the newest concept in the timeline', () => {
    const w = mountPage()
    w.setData({ chosen: ['porters-5-forces', 'boston-model'] })
    const landing = w.vm.landingConcept([
      { frameworkId: 'porters-5-forces', fieldKey: 'a', openedAt: '2026-09-19T14:20:00Z' },
      { frameworkId: 'boston-model', fieldKey: 'b', openedAt: '2026-09-19T14:40:00Z' }
    ])
    expect(landing.conceptId).toBe('boston-model')
  })

  it('🔴 skips a concept that has since been unticked — landing on it is a blank screen', () => {
    const w = mountPage()
    w.setData({ chosen: ['porters-5-forces'] })
    const landing = w.vm.landingConcept([
      { frameworkId: 'porters-5-forces', fieldKey: 'a', openedAt: '2026-09-19T14:20:00Z' },
      { frameworkId: 'boston-model', fieldKey: 'b', openedAt: '2026-09-19T14:40:00Z' }
    ])
    expect(landing.conceptId).toBe('porters-5-forces')
  })

  it('lands nowhere when the session was scoped and never run — which is where it stopped', () => {
    const w = mountPage()
    w.setData({ chosen: ['porters-5-forces'] })
    expect(w.vm.landingConcept([])).toBeNull()
    expect(w.vm.landingConcept(undefined)).toBeNull()
  })
})

describe('typing never saves — the defect of the same day must not return', () => {
  it('🔴 sends NOTHING while the advisor types', () => {
    const w = mountPage()
    const calls = []
    global.fetch = (...args) => { calls.push(args); return Promise.resolve({ ok: true, json: () => ({}) }) }
    w.setData({ sessionId: 7 })

    const sentence = 'Two of the three largest merchants now quote online.'
    for (let i = 1; i <= sentence.length; i++) {
      w.vm.onFieldTyping({ frameworkId: 'porters-5-forces', fieldKey: 'a', value: sentence.slice(0, i) })
    }

    expect(calls).toHaveLength(0)
    expect(w.vm.saveState).toBe('unsaved')
    expect(w.vm.pendingEntry.value).toBe(sentence)
  })

  it('writes the box out ONCE after the advisor stops', async () => {
    jest.useFakeTimers()
    const w = mountPage()
    const calls = []
    global.fetch = (...args) => { calls.push(args); return Promise.resolve({ ok: true, json: () => ({}) }) }
    w.setData({ sessionId: 7 })

    w.vm.onFieldTyping({ frameworkId: 'porters-5-forces', fieldKey: 'a', value: 'Two of' })
    w.vm.onFieldTyping({ frameworkId: 'porters-5-forces', fieldKey: 'a', value: 'Two of the three' })
    jest.runOnlyPendingTimers()
    await w.vm.$nextTick()
    await Promise.resolve()

    expect(calls).toHaveLength(1)
    expect(JSON.parse(calls[0][1].body).entries[0].value).toBe('Two of the three')
    jest.useRealTimers()
  })

  it('🔴 a box saved on leaving it is not written a SECOND time by the pause timer', async () => {
    jest.useFakeTimers()
    const w = mountPage()
    const calls = []
    global.fetch = (...args) => { calls.push(args); return Promise.resolve({ ok: true, json: () => ({}) }) }
    w.setData({ sessionId: 7 })

    w.vm.onFieldTyping({ frameworkId: 'porters-5-forces', fieldKey: 'a', value: 'Done' })
    await w.vm.onFieldsChanged([{ frameworkId: 'porters-5-forces', fieldKey: 'a', value: 'Done' }])
    jest.runOnlyPendingTimers()
    await w.vm.$nextTick()

    expect(calls).toHaveLength(1)
    expect(w.vm.pendingEntry).toBeNull()
    jest.useRealTimers()
  })
})

describe('the stamp tells the truth — Decision E', () => {
  it('says nothing at all before a session exists', () => {
    const w = mountPage()
    expect(w.vm.saveStampKey).toBe('')
  })

  it('🔴 does NOT say "Saved" after a save that failed', async () => {
    const w = mountPage()
    global.fetch = () => Promise.resolve({ ok: false, status: 500 })
    w.setData({ sessionId: 7 })

    await w.vm.onFieldsChanged([{ frameworkId: 'porters-5-forces', fieldKey: 'a', value: 'Lost?' }])

    // The words are still on screen — a failed save never rolls the advisor back — so
    // "unsaved" is the accurate word for them, and a green tick would be a lie.
    expect(w.vm.saveState).toBe('unsaved')
    expect(w.vm.saveStampKey).toBe('strategyPlanner.save.unsaved')
  })

  it('🔴 reads the store\'s time as UTC — it arrives with the Z deliberately stripped', () => {
    const w = mountPage()
    // `now()` in server/utils/strategySessionStore.js writes MySQL DATETIME shape:
    // new Date().toISOString().replace('T',' ').replace('Z',''). The instant is UTC and
    // NOTHING IN THE STRING SAYS SO. Read as local it is twelve hours out in New Zealand —
    // the stamp showed "4:10 AM" for a 4:10 PM save, and a session started late in the
    // evening would have shown the wrong DAY on the bar.
    const parsed = w.vm.storeTime('2026-09-22 04:10:24.878')
    expect(parsed.toISOString()).toBe('2026-09-22T04:10:24.878Z')
  })

  it('does NOT add a second Z to a time that already carries one', () => {
    const w = mountPage()
    // With a real MySQL behind it the same field can arrive already zoned; pushing it out
    // again would be the same fault in the other direction.
    expect(w.vm.storeTime('2026-09-22T04:10:24.878Z').toISOString()).toBe('2026-09-22T04:10:24.878Z')
    expect(w.vm.storeTime(new Date('2026-09-22T04:10:24.878Z')).toISOString()).toBe('2026-09-22T04:10:24.878Z')
  })

  it('has nothing to show rather than an Invalid Date', () => {
    const w = mountPage()
    expect(w.vm.storeTime('')).toBeNull()
    expect(w.vm.storeTime(null)).toBeNull()
    expect(w.vm.storeTime('not a time at all')).toBeNull()
  })

  it('shows a time only when there is genuinely a save to report', () => {
    const w = mountPage()
    w.setData({ sessionId: 7, saveState: 'unsaved' })
    expect(w.vm.saveStampTime).toBe('')
    w.vm.markSaved('2026-09-19T16:02:00.000Z')
    expect(w.vm.saveState).toBe('saved')
    expect(w.vm.saveStampTime).not.toBe('')
  })
})
