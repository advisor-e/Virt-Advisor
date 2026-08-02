/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The advisor-facing half of the slicer, and the bug that came with it.
 *
 * Two separate things are held here:
 *
 * 1. **'Request changes' must not destroy the outline.** It used to clear it on
 *    the click, and nothing anywhere could bring it back — a course is not
 *    saved until 'Start this course', and the chat transcript has the outline
 *    JSON stripped out of it. Mike lost a course to this on 2026-08-03. The
 *    card now survives until a replacement actually arrives.
 *
 * 2. **The session-length question is a DROP-TAB.** The advisor picks one of
 *    two computed options; the id goes to the engine, so nothing has to be
 *    parsed back out of a typed sentence
 *    (design/COURSE-SLICED-SESSION-WORDING.md, and this app's own rule for a
 *    choice between defined options).
 *
 * CourseBuilder is not yet i18n'd (its copy is inline English — see the i18n
 * sweep in design/ACTIONS.md), so these assertions read the English the screen
 * actually shows, matching the file's convention.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const CourseBuilder = require('~/components/CourseBuilder.vue').default

/** A sliced session, in the shape the engine now emits. */
function slice (id, title, minutes, sliceInfo, objectives) {
  return {
    id,
    title,
    focus: 'Read through the template.',
    resources: [sliceInfo.resource],
    objectives: objectives || [],
    estimatedMinutes: minutes,
    sessionEffort: {
      minutes,
      video: sliceInfo.activity === 'video' ? minutes : 0,
      reading: sliceInfo.activity === 'reading' ? minutes : 0,
      rehearsal: sliceInfo.activity === 'rehearsal' ? minutes : 0,
      modelMinutes: 0,
      unknown: []
    },
    slice: sliceInfo
  }
}

const OBJECTIVE = 'How to frame the EOY meeting as a springboard into advisory services.'

const SLICED_OUTLINE = {
  title: 'Running a better End of Year meeting',
  topic: 'eoy',
  intensity: 'consistent',
  totalSessions: 3,
  sessionBudget: { min: 15, max: 20 },
  sessions: [
    slice(1, 'Watch: E.O.Y Meeting', 9, { resource: 'E.O.Y Meeting', activity: 'video', part: 1, parts: 1 }, [OBJECTIVE]),
    slice(2, 'Read: E.O.Y Meeting (part 1 of 3)', 20, { resource: 'E.O.Y Meeting', activity: 'reading', part: 1, parts: 3 }, [OBJECTIVE]),
    slice(3, 'Read: E.O.Y Meeting (part 2 of 3)', 20, { resource: 'E.O.Y Meeting', activity: 'reading', part: 2, parts: 3 }, [OBJECTIVE])
  ]
}

const FIT_OPTIONS = [
  { id: 'keep-length', label: 'Keep your session length — 15–20 minutes each, and the course becomes 11 sessions', sessions: 11, budget: { min: 15, max: 20 } },
  { id: 'keep-count', label: 'Keep the course as short as possible — 6 sessions, the longest 1 hour', sessions: 6, budget: { min: 60, max: 60 } }
]

/**
 * The design POST, picked out of every call the component makes — mounting also
 * loads the saved and shared course lists, so calls[0] is not this one.
 */
function designRequestBody () {
  const call = global.fetch.mock.calls.find(
    c => c[1] && typeof c[1].body === 'string' && c[1].body.includes('"type":"design"')
  )
  return call ? JSON.parse(call[1].body) : null
}

async function mountDesign (data) {
  const wrapper = mountWithBuefy(CourseBuilder, {
    propsData: { advisorId: 'advisor-1', firmId: 'firm-1', apiToken: 'token' }
  })
  await wrapper.setData(Object.assign({
    phase: 'design',
    isDesignStreaming: false,
    courseState: {},
    pendingOutline: null
  }, data))
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

// ── The bug Mike hit ────────────────────────────────────────────────────────

describe("'Request changes' keeps the course on screen", () => {
  test('the card is still there after the click', async () => {
    const wrapper = await mountDesign({ pendingOutline: SLICED_OUTLINE })
    expect(wrapper.find('.outline-card').exists()).toBe(true)

    wrapper.find('.btn-request-changes').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.pendingOutline).toEqual(SLICED_OUTLINE)
    expect(wrapper.find('.outline-card').exists()).toBe(true)
  })

  test('a failed send puts the outline back rather than leaving an empty screen', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network is down')))
    const wrapper = await mountDesign({ pendingOutline: SLICED_OUTLINE, designInput: 'make it shorter' })

    await wrapper.vm.sendDesignMessage()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.pendingOutline).toEqual(SLICED_OUTLINE)
  })

  test('a reply that carries no course leaves the advisor with the one they had', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      body: {
        getReader () {
          const frames = [
            'data: {"type":"delta","text":"Sorry, I could not do that."}\n\n',
            'data: {"type":"state","state":{"pendingOutline":null}}\n\n',
            'data: {"type":"done"}\n\n'
          ]
          let i = 0
          return {
            read () {
              return Promise.resolve(i < frames.length
                ? { done: false, value: new TextEncoder().encode(frames[i++]) }
                : { done: true })
            }
          }
        }
      }
    }))
    const wrapper = await mountDesign({ pendingOutline: SLICED_OUTLINE, designInput: 'change it' })

    await wrapper.vm.sendDesignMessage()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.pendingOutline).toEqual(SLICED_OUTLINE)
  })
})

// ── The drop-tab ────────────────────────────────────────────────────────────

describe('the session-length question is picked from, not typed', () => {
  test('both options appear in the drop-tab', async () => {
    const wrapper = await mountDesign({ courseState: { pendingFit: { options: FIT_OPTIONS } } })
    const labels = wrapper.findAll('.fit-card option').wrappers.map(o => o.text())
    expect(labels).toContain(FIT_OPTIONS[0].label)
    expect(labels).toContain(FIT_OPTIONS[1].label)
  })

  test('nothing is preselected — a default answer is the app choosing', async () => {
    const wrapper = await mountDesign({ courseState: { pendingFit: { options: FIT_OPTIONS } } })
    expect(wrapper.vm.fitChoice).toBe('')
    expect(wrapper.find('.btn-build-course').attributes('disabled')).toBeTruthy()
  })

  test('the chosen option id is sent to the engine, and its label to the transcript', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('stop here')))
    const wrapper = await mountDesign({ courseState: { pendingFit: { options: FIT_OPTIONS } } })
    await wrapper.setData({ fitChoice: 'keep-count' })

    await wrapper.vm.sendFitChoice()
    await wrapper.vm.$nextTick()

    const body = designRequestBody()
    expect(body.fitChoice).toBe('keep-count')
    expect(body.query).toBe(FIT_OPTIONS[1].label)
    const lastUser = [...wrapper.vm.designMessages].reverse().find(m => m.role === 'user')
    expect(lastUser.content).toBe(FIT_OPTIONS[1].label)
  })

  test('an ordinary message never carries a choice', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('stop here')))
    const wrapper = await mountDesign({ designInput: 'make session two harder' })

    await wrapper.vm.sendDesignMessage()

    expect(designRequestBody().fitChoice).toBeUndefined()
  })

  test('the question and the outline card are never both on screen', async () => {
    const wrapper = await mountDesign({ courseState: { pendingFit: { options: FIT_OPTIONS } } })
    expect(wrapper.find('.fit-card').exists()).toBe(true)
    expect(wrapper.find('.outline-card').exists()).toBe(false)
  })

  test('no question, no drop-tab', async () => {
    const wrapper = await mountDesign({ pendingOutline: SLICED_OUTLINE })
    expect(wrapper.find('.fit-card').exists()).toBe(false)
  })
})

// ── The sliced card ─────────────────────────────────────────────────────────

describe('a sliced course reads as one activity per session', () => {
  test('the session length is the slice, with no breakdown repeating the title', async () => {
    const wrapper = await mountDesign({ pendingOutline: SLICED_OUTLINE })
    const rows = wrapper.findAll('.outline-session').wrappers
    expect(rows[1].find('.session-time').text()).toBe('20m')
    expect(rows[1].find('.session-time').text()).not.toContain('reading')
  })

  test("the template's authored objective is shown once, on its first session", async () => {
    const wrapper = await mountDesign({ pendingOutline: SLICED_OUTLINE })
    const shown = wrapper.findAll('.session-objective').wrappers.map(o => o.text())
    expect(shown).toEqual([OBJECTIVE])
  })

  test('a course the AI grouped itself is left exactly as it was', async () => {
    const aiOutline = {
      title: 'An older course',
      totalSessions: 1,
      intensity: 'consistent',
      sessions: [{
        id: 1,
        title: 'Session One',
        focus: 'Basics',
        resources: [],
        objectives: ['An AI objective'],
        sessionEffort: { minutes: 77, video: 17, reading: 30, rehearsal: 30, modelMinutes: 0, unknown: [] }
      }]
    }
    const wrapper = await mountDesign({ pendingOutline: aiOutline })
    expect(wrapper.find('.session-time').text()).toBe('1h 17m — 17m video · 30m reading · 30m rehearsal')
    expect(wrapper.find('.session-objective').exists()).toBe(false)
  })

  test('material with no published time is named, not silently missing', async () => {
    const wrapper = await mountDesign({
      pendingOutline: { ...SLICED_OUTLINE, unknownResources: ['Dashboard Report'] }
    })
    expect(wrapper.text())
      .toContain("1 resource has no published time, so it isn't timetabled: Dashboard Report.")
  })

  test('two untimed resources are counted and named', async () => {
    const wrapper = await mountDesign({
      pendingOutline: { ...SLICED_OUTLINE, unknownResources: ['Dashboard Report', 'Cash Flow Sheet'] }
    })
    expect(wrapper.text())
      .toContain("2 resources have no published time, so they aren't timetabled: Dashboard Report, Cash Flow Sheet.")
  })

  test('nothing is said when everything could be timetabled', async () => {
    const wrapper = await mountDesign({ pendingOutline: SLICED_OUTLINE })
    expect(wrapper.text()).not.toContain('no published time')
  })
})
