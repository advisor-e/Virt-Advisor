/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The client copy request screens.
 *
 * 🔴 WHAT THESE TESTS EARN. Per Mike's ruling of 2026-08-24, a component test here has to
 * catch what UAT cannot — so this file does NOT assert headings, button wording or CSS
 * classes. It asserts the three places where the screen could show a person something
 * UNTRUE, each of which looks entirely normal to a tester:
 *
 *   1. **Which meetings a caller is offered as theirs to release.** Ruling 2 gives the send
 *      to the recording advisor alone. A screen that offered somebody else's meeting would
 *      look identical, and the refusal would only appear after they pressed the button.
 *   2. **What an expired meeting says.** Ruling 7: its OWN promised period and its
 *      destruction date, never the firm's current dial. A tester cannot tell 18 from 24.
 *   3. **The break-glass banner on the advisor's own notes.** It appears only where a
 *      manager actually declared — its absence and its presence are both meaningful, and
 *      neither is visible without knowing what happened elsewhere.
 */

import { shallowMount, mount, createLocalVue } from '@vue/test-utils'
import ClientCopyRequestDetail from '../../components/shared/ClientCopyRequestDetail.vue'

const localVue = createLocalVue()

/** Buefy's tags are not registered in this harness; render them as inert placeholders. */
const STUBS = {
  'b-button': true,
  'b-message': true,
  'b-tag': true,
  'b-modal': true,
  'b-loading': true,
  'b-field': true,
  'b-input': true,
  'b-checkbox': true,
  'b-select': true,
  'b-datepicker': true
}

const REQUEST = {
  id: 'a'.repeat(32),
  clientId: 'client-raman',
  clientName: 'Raman Joinery Ltd',
  kind: 'copy',
  channel: 'email',
  receivedAt: '2026-09-02T00:00:00.000Z',
  state: 'open',
  loggedBy: 'Dana Whitfield'
}

function meeting (over = {}) {
  return Object.assign({
    meetingId: 'b'.repeat(32),
    advisor: 'adv-dana',
    advisorName: 'Dana Whitfield',
    createdAt: '2026-08-27T00:00:00.000Z',
    retentionMonths: 18,
    transcriptPurgedAt: null,
    deletedForClientAt: null,
    holds: ['transcript', 'summary'],
    yours: true,
    released: false,
    expired: false,
    expiredAt: null,
    expiredReason: null
  }, over)
}

/** Let the mounted() fetch chain settle — resolve, parse, assign, re-render. */
async function flush (wrapper) {
  for (let i = 0; i < 4; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()
  }
}

/** Mount the detail view with a fixed payload, without touching the network for real. */
async function mountDetail (payload) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(Object.assign({
      request: REQUEST,
      meetings: [],
      releases: [],
      clock: { due: '2026-09-30T00:00:00.000Z', remaining: 4, unit: 'working-days', overdue: false, phrase: '4 working days left' }
    }, payload))
  })

  const wrapper = mount(ClientCopyRequestDetail, {
    localVue,
    stubs: STUBS,
    propsData: { apiToken: 'tok', requestId: REQUEST.id }
  })
  await flush(wrapper)
  return wrapper
}

afterEach(() => {
  delete global.fetch
})

describe('who is offered a release', () => {
  it('🔴 offers only the caller’s own meetings, and names who the others wait on', async () => {
    // RULING 2. A screen that offered somebody else's meeting would look identical to this
    // one; the refusal would arrive only after the button was pressed, in front of a client.
    const wrapper = await mountDetail({
      meetings: [
        meeting({ meetingId: 'c'.repeat(32), yours: true }),
        meeting({ meetingId: 'd'.repeat(32), yours: false, advisor: 'adv-owen', advisorName: 'Owen Fraser' })
      ]
    })

    expect(wrapper.vm.waitingOn).toEqual(['Owen Fraser'])
    expect(wrapper.vm.anyReleasable).toBe(true)
  })

  it('🔴 offers nothing when every meeting belongs to somebody else', async () => {
    const wrapper = await mountDetail({
      meetings: [meeting({ yours: false, advisorName: 'Owen Fraser' })]
    })
    expect(wrapper.vm.anyReleasable).toBe(false)
    expect(wrapper.vm.waitingOn).toEqual(['Owen Fraser'])
  })

  it('does not wait on an advisor whose meeting has expired or is already released', async () => {
    // Neither is outstanding, and listing them would tell a firm it was waiting on somebody
    // who has nothing left to do.
    const wrapper = await mountDetail({
      meetings: [
        meeting({ meetingId: 'c'.repeat(32), yours: false, advisorName: 'Owen Fraser', expired: true }),
        meeting({ meetingId: 'd'.repeat(32), yours: false, advisorName: 'Ruth Ellis', released: true })
      ]
    })
    expect(wrapper.vm.waitingOn).toEqual([])
  })

  it('🔴 falls back to the advisor’s identifier rather than inventing a name', async () => {
    // This app holds no advisors table, so a meeting recorded before 2026-09-10 carries no
    // name. A plausible wrong name is worse than an honest id — the "4 of 12" wall.
    const wrapper = await mountDetail({
      meetings: [meeting({ yours: false, advisorName: null, advisor: 'adv-owen' })]
    })
    expect(wrapper.vm.waitingOn).toEqual(['adv-owen'])
  })
})

describe('an expired meeting', () => {
  it('🔴 names ITS OWN retention period, not the firm’s current one', async () => {
    // RULING 7. A firm that later extended to 24 months still reports 18 against an old
    // meeting, because 18 is what that client was told on the day. A tester cannot tell the
    // two apart on screen.
    const wrapper = await mountDetail({
      meetings: [meeting({
        retentionMonths: 18,
        holds: [],
        expired: true,
        expiredAt: '2026-05-11T00:00:00.000Z',
        expiredReason: 'retention'
      })]
    })

    const text = wrapper.text()
    expect(text).toContain('18 months')
    expect(text).not.toContain('24 months')
    // And it is never offered for release.
    expect(wrapper.vm.anyReleasable).toBe(false)
  })

  it('computes the retention end date from the meeting’s own months', () => {
    const vm = { shortDate: ClientCopyRequestDetail.methods.shortDate }
    const ends = ClientCopyRequestDetail.methods.retentionEnds.call(
      vm, { createdAt: '2026-08-27T00:00:00.000Z', retentionMonths: 18 })
    expect(ends).toMatch(/2028/)
  })

  it('says so plainly when a meeting has no recorded period, rather than guessing one', () => {
    const vm = { shortDate: ClientCopyRequestDetail.methods.shortDate }
    const ends = ClientCopyRequestDetail.methods.retentionEnds.call(
      vm, { createdAt: '2026-08-27T00:00:00.000Z', retentionMonths: null })
    expect(ends).toBe('an unrecorded date')
  })
})

describe('the release record on screen', () => {
  it('🔴 shows a break-glass release as one, with the declaration behind it', async () => {
    // The declaration is unverifiable by design, so the RECORD is the whole control. A screen
    // that rendered it as an ordinary release would erase the one fact it exists to preserve.
    const meetingId = 'c'.repeat(32)
    const wrapper = await mountDetail({
      meetings: [meeting({ meetingId, yours: false, advisorName: 'Owen Fraser', released: true })],
      releases: [{
        requestId: REQUEST.id,
        meetingId,
        advisor: 'Owen Fraser',
        releasedBy: 'Marcus Bell',
        at: '2026-09-10T00:00:00.000Z',
        documents: ['transcript', 'summary'],
        breakGlass: { absentAdvisor: 'Owen Fraser', declaredBy: 'Marcus Bell', at: '2026-09-10T00:00:00.000Z' }
      }]
    })

    const text = wrapper.text()
    expect(text).toContain('Marcus Bell')
    expect(text).toContain('Owen Fraser')
    expect(text).toContain('could no longer act')
  })

  it('returns an empty object for a meeting with no release, rather than throwing', async () => {
    const wrapper = await mountDetail({ meetings: [meeting()] })
    expect(wrapper.vm.releaseFor(meeting())).toEqual({})
  })
})

describe('the failure path', () => {
  it('says the load failed rather than rendering an empty request', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: { message: 'The store is down.' } })
    })

    const wrapper = shallowMount(ClientCopyRequestDetail, {
      localVue,
      stubs: STUBS,
      propsData: { apiToken: 'tok', requestId: REQUEST.id }
    })
    await flush(wrapper)

    expect(wrapper.vm.loadError).toBe('The store is down.')
    expect(wrapper.vm.meetings).toEqual([])
  })

  it('reports a network failure in words a person can act on', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'))

    const wrapper = shallowMount(ClientCopyRequestDetail, {
      localVue,
      stubs: STUBS,
      propsData: { apiToken: 'tok', requestId: REQUEST.id }
    })
    await flush(wrapper)

    expect(wrapper.vm.loadError).toMatch(/could not be reached/)
  })
})
