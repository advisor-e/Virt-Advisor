/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const CourseBuilder = require('~/components/CourseBuilder.vue').default

/**
 * The advisor-facing half of session length.
 *
 * The engine now computes how long each session really is — video + reading +
 * rehearsal across the resources it chose (Mike's ruling 2026-08-03). None of
 * that was worth computing if the screen did not show it: before this change
 * `estimatedMinutes` was stored on every session and rendered nowhere, so the
 * only number an advisor ever saw was the one they had typed themselves.
 *
 * Three things these tests hold:
 *   • the figure shown is the COMPUTED one, never `estimatedMinutes` (which the
 *     save-door still fills with a default 30 for an untimed session);
 *   • an unknown length is said out loud, never rendered as "0m";
 *   • the mismatch notice follows the direction the session actually missed.
 *
 * CourseBuilder is not yet i18n'd (its copy is inline English — see the i18n
 * sweep in design/ACTIONS.md), so these assertions read the English the screen
 * actually shows, matching the file's current convention.
 */

/** A session as the engine now emits it, with its effort breakdown attached. */
function session (id, effort, extra) {
  return Object.assign({
    id,
    title: `Session ${id}`,
    focus: 'focus',
    resources: [],
    objectives: [],
    sessionEffort: Object.assign(
      { minutes: 0, video: 0, reading: 0, rehearsal: 0, modelMinutes: 0, unknown: [] },
      effort
    )
  }, extra)
}

/** Mount showing a pending outline, as an advisor sees it before starting. */
async function mountOutline (sessions, courseState) {
  const wrapper = mountWithBuefy(CourseBuilder, {
    propsData: { advisorId: 'advisor-1', firmId: 'firm-1', apiToken: 'token' }
  })
  await wrapper.setData({
    phase: 'design',
    isDesignStreaming: false,
    courseState: courseState || {},
    pendingOutline: {
      title: 'A course',
      topic: 'x',
      intensity: 'consistent',
      totalSessions: sessions.length,
      sessions
    }
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('the outline card shows the real session length', () => {
  test("Mike's worked example reads as 1h 17m with its three parts named", async () => {
    const wrapper = await mountOutline([
      session(1, { minutes: 77, video: 17, reading: 30, rehearsal: 30 })
    ])

    const time = wrapper.find('.session-time')
    expect(time.exists()).toBe(true)
    expect(time.text()).toContain('1h 17m')
    expect(time.text()).toContain('17m video')
    expect(time.text()).toContain('30m reading')
    expect(time.text()).toContain('30m rehearsal')
  })

  test('a sub-hour session reads in minutes alone', async () => {
    const wrapper = await mountOutline([
      session(1, { minutes: 30, video: 5, reading: 15, rehearsal: 10 })
    ])
    expect(wrapper.find('.session-time').text()).toContain('30m')
    expect(wrapper.find('.session-time').text()).not.toContain('0h')
  })

  test('an activity carrying no time is left out rather than shown as zero', async () => {
    const wrapper = await mountOutline([
      session(1, { minutes: 17, video: 17 })
    ])
    const text = wrapper.find('.session-time').text()
    expect(text).toContain('17m video')
    expect(text).not.toContain('reading')
    expect(text).not.toContain('rehearsal')
  })

  test('a session costed by the revenue-model allowance shows its total with no breakdown', async () => {
    const wrapper = await mountOutline([
      session(1, { minutes: 30, modelMinutes: 30 })
    ])
    expect(wrapper.find('.session-time').text().trim()).toBe('30m')
  })

  test('the whole course total appears on the card', async () => {
    const wrapper = await mountOutline([
      session(1, { minutes: 99, video: 9, reading: 60, rehearsal: 30 }),
      session(2, { minutes: 209, video: 29, reading: 90, rehearsal: 90 })
    ])
    expect(wrapper.find('.outline-card-header').text()).toContain('5h 8m')
  })

  test('the shown figure is the computed one — a stale estimatedMinutes is ignored', async () => {
    const wrapper = await mountOutline([
      // What the save-door would leave behind: the AI's echoed 30.
      session(1, { minutes: 99, video: 9, reading: 60, rehearsal: 30 }, { estimatedMinutes: 30 })
    ])
    const time = wrapper.find('.session-time').text()
    expect(time).toContain('1h 39m')
    expect(time).not.toContain('30m —')
  })
})

describe('an unknown length is never shown as zero', () => {
  test('a session with nothing published shows no time at all', async () => {
    const wrapper = await mountOutline([
      session(1, { minutes: 0, unknown: ['Dashboard Report'] })
    ])
    expect(wrapper.find('.session-time').exists()).toBe(false)
  })

  test('the untimed resources are counted out loud', async () => {
    const wrapper = await mountOutline([
      session(1, { minutes: 30, video: 30, unknown: ['Dashboard Report'] })
    ])
    expect(wrapper.find('.session-time-unknown').text()).toBe('1 resource has no published time')
  })

  test('more than one untimed resource reads as a plural', async () => {
    const wrapper = await mountOutline([
      session(1, { minutes: 30, video: 30, unknown: ['A', 'B'] })
    ])
    expect(wrapper.find('.session-time-unknown').text()).toBe('2 resources have no published time')
  })

  test('a fully timed session says nothing about unknowns', async () => {
    const wrapper = await mountOutline([session(1, { minutes: 30, video: 30 })])
    expect(wrapper.find('.session-time-unknown').exists()).toBe(false)
  })

  test('a course with no published time anywhere shows no total', async () => {
    const wrapper = await mountOutline([session(1, { minutes: 0, unknown: ['A'] })])
    expect(wrapper.find('.outline-card-header').text()).not.toContain('0m')
  })
})

describe('the length-mismatch notice', () => {
  const notice = (sessions, requested) => ({
    sessionLengthNotice: { requested: requested || { min: 30, max: 30 }, sessions }
  })

  test('an over-long session is named, with the direction of the miss', async () => {
    const wrapper = await mountOutline(
      [session(1, { minutes: 99, video: 9, reading: 60, rehearsal: 30 })],
      notice([{ id: 1, title: 'Session 1', minutes: 99 }])
    )
    const text = wrapper.text()
    expect(text).toContain('You asked for 30-minute sessions')
    expect(text).toContain('session 1 works out at 1h 39m')
    expect(text).toContain('if you want it shorter')
  })

  // Mike's live phrasing. The warning must quote the band he actually gave,
  // never a single figure he never said.
  test('a requested RANGE is read back with both ends', async () => {
    const wrapper = await mountOutline(
      [session(1, { minutes: 70, video: 5, reading: 20, rehearsal: 45 })],
      notice([{ id: 1, title: 'Session 1', minutes: 70 }], { min: 15, max: 20 })
    )
    const text = wrapper.text()
    expect(text).toContain('You asked for 15–20 minute sessions')
    expect(text).toContain('session 1 works out at 1h 10m')
    expect(text).toContain('if you want it shorter')
  })

  test('a session under the bottom of a range is told to go longer', async () => {
    const wrapper = await mountOutline(
      [session(1, { minutes: 5, video: 5 })],
      notice([{ id: 1, title: 'Session 1', minutes: 5 }], { min: 15, max: 20 })
    )
    expect(wrapper.text()).toContain('if you want it longer')
  })

  test('an under-length session is told to go longer, not shorter', async () => {
    const wrapper = await mountOutline(
      [session(1, { minutes: 10, video: 10 })],
      notice([{ id: 1, title: 'Session 1', minutes: 10 }])
    )
    expect(wrapper.text()).toContain('if you want it longer')
  })

  test('sessions missing in both directions get neutral advice', async () => {
    const wrapper = await mountOutline(
      [session(1, { minutes: 99 }), session(2, { minutes: 10 })],
      notice([
        { id: 1, title: 'Session 1', minutes: 99 },
        { id: 2, title: 'Session 2', minutes: 10 }
      ])
    )
    const text = wrapper.text()
    expect(text).toContain('session 1 works out at 1h 39m and session 2 works out at 10m')
    expect(text).toContain('if you want them changed')
  })

  test('no notice means nothing is shown', async () => {
    const wrapper = await mountOutline([session(1, { minutes: 30, video: 30 })])
    expect(wrapper.text()).not.toContain('You asked for')
  })
})
