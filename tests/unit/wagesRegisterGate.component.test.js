/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

jest.mock('../../utils/wagesRegister', () => ({
  getRegisterGate: jest.fn(),
  openRegisterGate: jest.fn(),
  closeRegisterGate: jest.fn()
}))

const api = require('../../utils/wagesRegister')
const WagesRegisterGate = require('../../components/WagesRegisterGate.vue').default

/**
 * WagesRegisterGate — the strip deciding whether the staff register is on screen at all
 * (item 5.1, Decision 6; wording approved by Mike 2026-09-15).
 *
 * WHAT UAT CANNOT SEE, AND THIS PINS. A tester sees one client in one state. These cover
 * the transitions and the failures between them: that a CLOSED gate renders no switch at
 * all, that a failed check leaves no switch on screen rather than defaulting to one, that
 * changing client never carries the previous client's answer over, and that what is shown
 * after switching on is the server's answer rather than a locally flipped flag.
 *
 * Deliberately NOT asserted here: the wording of any label. Those are on screen for a
 * person to read, and they change when Mike changes his mind about them.
 */
const DD_CASE = { id: 'case-1', title: 'Acquisition of Kinetic Planning (2007) Limited' }
const OPEN_GATE = {
  state: 'open',
  reason: 'switched-on',
  case: DD_CASE,
  openedBy: { name: 'M. Bartlett', email: 'mike@advisor-e.com' },
  openedAt: '2026-09-15T02:00:00.000Z'
}
const AVAILABLE_GATE = { state: 'available', reason: 'not-switched-on', case: DD_CASE, openedBy: null, openedAt: null }
const CLOSED_GATE = { state: 'closed', reason: 'no-due-diligence-case', case: null, openedBy: null, openedAt: null }

/**
 * Let every pending promise settle AND Vue re-render. `$nextTick` alone is not enough: the
 * load in `mounted` is a real async call, so the fetch's microtasks have to drain before
 * the render that shows their result.
 * @param {object} wrapper
 */
async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

/** Mount with a signed-in advisor and a chosen client, and let `mounted`'s load settle. */
async function mountGate (gate, propsData) {
  api.getRegisterGate.mockResolvedValue({ clientId: 'c-1', clientName: 'Kinetic Planning', gate })
  const wrapper = mountWithBuefy(WagesRegisterGate, {
    propsData: Object.assign({ clientId: 'c-1' }, propsData)
  })
  await settle(wrapper)
  return wrapper
}

beforeEach(() => {
  api.getRegisterGate.mockReset()
  api.openRegisterGate.mockReset()
  api.closeRegisterGate.mockReset()
  window.localStorage.setItem('advisor_e_token', 'a-token')
})

afterEach(() => { window.localStorage.clear() })

describe('what each state puts on screen', () => {
  it('🔴 CLOSED renders no switch — nothing here can start a due-diligence project', async () => {
    const wrapper = await mountGate(CLOSED_GATE)
    expect(wrapper.find('.wrg-strip').exists()).toBe(true)
    // Neither switch: a closed gate offers nothing to press at all.
    expect(wrapper.find('.wrg-btn').exists()).toBe(false)
  })

  it('AVAILABLE is the one state carrying the OPEN switch', async () => {
    const wrapper = await mountGate(AVAILABLE_GATE)
    expect(wrapper.find('.wrg-open').exists()).toBe(true)
  })

  it('OPEN carries the transaction, the advisor and the date, and no switch', async () => {
    const wrapper = await mountGate(OPEN_GATE)
    const note = wrapper.find('.wrg-s').text()
    expect(note).toContain('Kinetic Planning')
    expect(note).toContain('M. Bartlett')
    // The date is rendered through $d, so assert a year rather than a format.
    expect(note).toContain('2026')
    expect(wrapper.find('.wrg-open').exists()).toBe(false)
  })

  it('an available case with no title still offers the switch', async () => {
    // The deal name is what the sentence would have named; its absence is not a reason to
    // withhold a register the ruling says is available.
    const wrapper = await mountGate({ ...AVAILABLE_GATE, case: { id: 'case-1', title: '' } })
    expect(wrapper.find('.wrg-open').exists()).toBe(true)
    expect(wrapper.find('.wrg-s').text().length).toBeGreaterThan(0)
  })

  it('an open gate with an unreadable date still renders, without the word "Invalid"', async () => {
    const wrapper = await mountGate({ ...OPEN_GATE, openedAt: 'not-a-date' })
    expect(wrapper.find('.wrg-s').text()).not.toMatch(/Invalid/i)
  })
})

describe('when nothing should be rendered at all', () => {
  it('no client chosen: the backend is never asked, and nothing renders', async () => {
    const wrapper = mountWithBuefy(WagesRegisterGate, { propsData: { clientId: '' } })
    await wrapper.vm.$nextTick()
    expect(api.getRegisterGate).not.toHaveBeenCalled()
    expect(wrapper.find('.wrg-strip').exists()).toBe(false)
  })

  it('no token: the backend is never asked', async () => {
    window.localStorage.clear()
    const wrapper = mountWithBuefy(WagesRegisterGate, { propsData: { clientId: 'c-1' } })
    await wrapper.vm.$nextTick()
    expect(api.getRegisterGate).not.toHaveBeenCalled()
    expect(wrapper.find('.wrg-strip').exists()).toBe(false)
  })

  it('🔴 a FAILED check leaves no switch on screen', async () => {
    // A check that cannot answer must not fall open. The advisor sees an error, never a
    // button that would post a switch-on for a client whose case is unknown.
    api.getRegisterGate.mockRejectedValue(new Error('network down'))
    const wrapper = mountWithBuefy(WagesRegisterGate, { propsData: { clientId: 'c-1' } })
    await settle(wrapper)
    expect(wrapper.find('.wrg-btn').exists()).toBe(false)
    expect(wrapper.find('.wrg-strip').exists()).toBe(false)
    expect(wrapper.find('.wrg-err').exists()).toBe(true)
  })
})

describe('changing client', () => {
  it('🔴 never carries the previous client\'s answer over', async () => {
    const wrapper = await mountGate(OPEN_GATE)
    expect(wrapper.find('.wrg-strip').exists()).toBe(true)

    // The next client's check has not answered yet: the open strip must be gone already,
    // or one client's register state is briefly shown against another client's name.
    let answer
    api.getRegisterGate.mockReturnValue(new Promise((resolve) => { answer = resolve }))
    wrapper.setProps({ clientId: 'c-2' })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.wrg-strip').exists()).toBe(false)

    answer({ clientId: 'c-2', clientName: 'Other', gate: CLOSED_GATE })
    await settle(wrapper)
    expect(wrapper.find('.wrg-btn').exists()).toBe(false)
    expect(api.getRegisterGate).toHaveBeenLastCalledWith('c-2', 'a-token')
  })
})

describe('switching the register on', () => {
  it('shows the SERVER\'s answer, not a locally flipped flag', async () => {
    const wrapper = await mountGate(AVAILABLE_GATE)
    api.openRegisterGate.mockResolvedValue({ clientId: 'c-1', gate: OPEN_GATE })
    await wrapper.vm.openRegister()
    await settle(wrapper)
    expect(wrapper.vm.gate).toEqual(OPEN_GATE)
    expect(wrapper.find('.wrg-open').exists()).toBe(false)
    expect(api.openRegisterGate).toHaveBeenCalledWith('c-1', 'a-token')
  })

  it('emits `opened` with the gate the server returned', async () => {
    const wrapper = await mountGate(AVAILABLE_GATE)
    api.openRegisterGate.mockResolvedValue({ clientId: 'c-1', gate: OPEN_GATE })
    await wrapper.vm.openRegister()
    expect(wrapper.emitted('opened')[0][0]).toEqual(OPEN_GATE)
  })

  it('🔴 a REFUSED switch-on leaves the gate where it was and emits nothing', async () => {
    // The server refuses a switch-on for a client with no due-diligence case. The screen
    // must not show an open register because it asked for one.
    const wrapper = await mountGate(AVAILABLE_GATE)
    const err = new Error('refused')
    err.code = 'NO_DUE_DILIGENCE_CASE'
    api.openRegisterGate.mockRejectedValue(err)
    await wrapper.vm.openRegister()
    await settle(wrapper)
    expect(wrapper.vm.gate.state).toBe('available')
    expect(wrapper.emitted('opened')).toBeUndefined()
    expect(wrapper.find('.wrg-err').exists()).toBe(true)
  })

  it('a second press while the first is in flight does nothing', async () => {
    const wrapper = await mountGate(AVAILABLE_GATE)
    api.openRegisterGate.mockReturnValue(new Promise(() => {}))
    wrapper.vm.openRegister()
    wrapper.vm.openRegister()
    expect(api.openRegisterGate).toHaveBeenCalledTimes(1)
  })
})

describe('switching the register off again', () => {
  it('the OPEN state carries a close switch, and the closed one does not carry it', async () => {
    const wrapper = await mountGate(OPEN_GATE)
    expect(wrapper.find('.wrg-close').exists()).toBe(true)
    const closedWrapper = await mountGate(CLOSED_GATE)
    expect(closedWrapper.find('.wrg-close').exists()).toBe(false)
  })

  it('AVAILABLE offers opening, never closing', async () => {
    const wrapper = await mountGate(AVAILABLE_GATE)
    expect(wrapper.find('.wrg-open').exists()).toBe(true)
    expect(wrapper.find('.wrg-close').exists()).toBe(false)
  })

  it('shows the SERVER\'s answer after closing, and emits `closed`', async () => {
    const wrapper = await mountGate(OPEN_GATE)
    api.closeRegisterGate.mockResolvedValue({ clientId: 'c-1', gate: AVAILABLE_GATE })
    await wrapper.vm.closeRegister()
    await settle(wrapper)
    expect(wrapper.vm.gate).toEqual(AVAILABLE_GATE)
    expect(wrapper.find('.wrg-close').exists()).toBe(false)
    expect(wrapper.emitted('closed')[0][0]).toEqual(AVAILABLE_GATE)
    expect(api.closeRegisterGate).toHaveBeenCalledWith('c-1', 'a-token')
  })

  it('🔴 a FAILED close leaves the register OPEN and emits nothing', async () => {
    // The dangerous direction to guess wrong: a screen that showed the register closed
    // while the server still had it open would tell the advisor the data is withdrawn
    // when it is not.
    const wrapper = await mountGate(OPEN_GATE)
    api.closeRegisterGate.mockRejectedValue(new Error('network down'))
    await wrapper.vm.closeRegister()
    await settle(wrapper)
    expect(wrapper.vm.gate.state).toBe('open')
    expect(wrapper.emitted('closed')).toBeUndefined()
    expect(wrapper.find('.wrg-err').exists()).toBe(true)
  })

  it('a second press while the first is in flight does nothing', async () => {
    const wrapper = await mountGate(OPEN_GATE)
    api.closeRegisterGate.mockReturnValue(new Promise(() => {}))
    wrapper.vm.closeRegister()
    wrapper.vm.closeRegister()
    expect(api.closeRegisterGate).toHaveBeenCalledTimes(1)
  })
})
