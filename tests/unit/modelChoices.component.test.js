/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const MentorModelChoices = require('~/components/mentor/MentorModelChoices.vue').default

/**
 * Model Choices — the manager's read-back of what the AI named (item 7.5,
 * design/mockups/model-choices.html, all three decisions ruled by Mike 2026-09-16).
 *
 * 🔴 WHAT THESE TESTS ARE FOR, AND WHAT THEY DELIBERATELY ARE NOT. Per CLAUDE.md's
 * testing rule, a test here earns its place by catching what a person in UAT cannot.
 * Nothing below asserts a label, a heading or a CSS class — a tester sees all of those
 * in five seconds and judges them better than an assertion can.
 *
 * What a tester CANNOT see is the difference between "the record could not be read"
 * and "the AI named nothing this period", because both render as a page with no rows
 * unless the component keeps them apart. That distinction is the first block below and
 * it is the whole reason this file exists: a silently-empty audit screen would report
 * that the AI is behaving perfectly at the exact moment we had lost the ability to tell.
 */
function respond (status, body) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
}

async function settle (wrapper) {
  for (let i = 0; i < 6; i++) { await wrapper.vm.$nextTick() }
}

/** A well-formed response with one of everything the four bands read. */
const FULL = {
  success: true,
  scopeId: 'firm-1',
  tier: 'mentor',
  awaitingFirms: false,
  totals: { named: 38, declined: 9, viaProse: 6 },
  pairings: [
    { domain: 'financial management', route: '/three-way-forecast', model: '3-Way Forecast Filter', count: 9 }
  ],
  declines: [{ domain: 'governance and leadership', count: 3 }],
  rows: [
    {
      at: '2026-09-15T16:04:00.000Z',
      firmId: 'firm-1',
      advisorId: 'adv-7',
      advisorName: 'D. Okafor',
      domain: 'financial management',
      route: '/three-way-forecast',
      model: '3-Way Forecast Filter',
      declined: false,
      source: 'declared',
      phase: 'discover'
    }
  ],
  timestamp: '2026-09-15T16:05:00.000Z'
}

function mount () {
  return mountWithBuefy(MentorModelChoices, { propsData: { apiToken: 'tok-1' } })
}

afterEach(() => { delete global.fetch })

describe('Model Choices — an unreadable record never looks like a quiet period', () => {
  it('an HTTP failure sets error, and leaves no band claiming a count of zero', async () => {
    global.fetch = jest.fn(() => respond(500, { success: false }))
    const wrapper = mount()
    await settle(wrapper)

    expect(wrapper.vm.error).toBe(true)
    // The bands must not render at all. Were they to render from the empty defaults,
    // the screen would state that the AI named nothing — a claim about the AI's
    // behaviour, made at the moment we could not read its behaviour.
    expect(wrapper.vm.rows).toEqual([])
    expect(wrapper.vm.pairings).toEqual([])
    expect(wrapper.vm.declines).toEqual([])
  })

  it('a 200 carrying success:false is still a failure, not an empty period', async () => {
    global.fetch = jest.fn(() => respond(200, { success: false }))
    const wrapper = mount()
    await settle(wrapper)
    expect(wrapper.vm.error).toBe(true)
  })

  it('a network failure is a failure', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const wrapper = mount()
    await settle(wrapper)
    expect(wrapper.vm.error).toBe(true)
  })

  it('a genuinely empty period is NOT an error', async () => {
    global.fetch = jest.fn(() => respond(200, {
      success: true, totals: { named: 0, declined: 0, viaProse: 0 }, pairings: [], declines: [], rows: []
    }))
    const wrapper = mount()
    await settle(wrapper)

    expect(wrapper.vm.error).toBe(false)
    expect(wrapper.vm.tiles.map(t => t.value)).toEqual([0, 0, 0])
  })
})

describe('Model Choices — the scope comes from the token and is never sent', () => {
  it('sends the bearer token and no firm id of any kind', async () => {
    global.fetch = jest.fn(() => respond(200, FULL))
    const wrapper = mount()
    await settle(wrapper)

    const [url, init] = global.fetch.mock.calls[0]
    expect(init.headers.Authorization).toBe('Bearer tok-1')
    // 🔴 A firmId in the request would be an IDOR straight into another firm's
    // activity. The route reads req.firmId from the verified token and ignores the
    // query string; this pins the screen to the same discipline so the two cannot
    // drift into sending one "for convenience".
    expect(url).toBe('/api/model-choices')
    expect(url).not.toMatch(/firmId|firm_id|scope=/)
  })
})

describe('Model Choices — the numbers behind the tiles', () => {
  it('reads named, declined and viaProse straight from the route', async () => {
    global.fetch = jest.fn(() => respond(200, FULL))
    const wrapper = mount()
    await settle(wrapper)

    expect(wrapper.vm.tiles.map(t => t.value)).toEqual([38, 9, 6])
  })

  it('shows THREE tiles, not the drawing\'s four', async () => {
    global.fetch = jest.fn(() => respond(200, FULL))
    const wrapper = mount()
    await settle(wrapper)

    // The fourth — "conversations where a model could have been named" — counts client
    // conversations from advisor_va_sessions, a table this route does not read. The
    // drawing names that difference itself. This pins it so a later session cannot
    // quietly invent the figure from a number that is to hand but means something else.
    expect(wrapper.vm.tiles).toHaveLength(3)
  })

  it('a missing totals block reads as zero, never as undefined on the screen', async () => {
    global.fetch = jest.fn(() => respond(200, { success: true, pairings: [], declines: [], rows: [] }))
    const wrapper = mount()
    await settle(wrapper)

    expect(wrapper.vm.tiles.map(t => t.value)).toEqual([0, 0, 0])
  })
})

describe('Model Choices — a middle tier with no firms mapped yet', () => {
  it('awaitingFirms replaces the page rather than drawing bands of zero', async () => {
    global.fetch = jest.fn(() => respond(200, {
      success: true, awaitingFirms: true, totals: {}, pairings: [], declines: [], rows: []
    }))
    const wrapper = mount()
    await settle(wrapper)

    // Bands of zero would state that the AI never names a model, which is false — the
    // truth is that this tier has no firms beneath it yet. The two must not look alike.
    expect(wrapper.vm.awaitingFirms).toBe(true)
    expect(wrapper.vm.error).toBe(false)
  })

  it('awaitingFirms is false unless the route says otherwise', async () => {
    global.fetch = jest.fn(() => respond(200, FULL))
    const wrapper = mount()
    await settle(wrapper)
    expect(wrapper.vm.awaitingFirms).toBe(false)
  })
})

describe('Model Choices — how we know what the AI chose', () => {
  it('a declared choice and a page path found in prose are told apart', async () => {
    global.fetch = jest.fn(() => respond(200, FULL))
    const wrapper = mount()
    await settle(wrapper)

    expect(wrapper.vm.howType({ source: 'declared' })).toBe('is-success is-light')
    expect(wrapper.vm.howType({ source: 'prose' })).toBe('is-warning is-light')
  })

  it('a source this screen does not know renders with NO colour rather than the last branch', async () => {
    global.fetch = jest.fn(() => respond(200, FULL))
    const wrapper = mount()
    await settle(wrapper)

    // A third source added on the backend must be visible as unstyled, never silently
    // dressed as one of the two we know.
    expect(wrapper.vm.howType({ source: 'something-new' })).toBe('')
    expect(wrapper.vm.howType({})).toBe('')
  })
})

describe('Model Choices — the timestamp', () => {
  it('renders day, month and 24-hour time, never a numeric date', async () => {
    global.fetch = jest.fn(() => respond(200, FULL))
    const wrapper = mount()
    await settle(wrapper)

    // 7/8 is a different day in two countries, which is why the whole app avoids the
    // browser's short numeric default. This checks the SHAPE, not the wording.
    const out = wrapper.vm.formatWhen('2026-09-15T16:04:00.000Z')
    expect(out).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{2}:\d{2}$/)
  })

  it('a missing timestamp renders empty rather than "Invalid Date"', async () => {
    global.fetch = jest.fn(() => respond(200, FULL))
    const wrapper = mount()
    await settle(wrapper)

    expect(wrapper.vm.formatWhen(null)).toBe('')
    expect(wrapper.vm.formatWhen(undefined)).toBe('')
  })
})
