/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

jest.mock('../../utils/wagesRegister', () => ({
  getRegisterGate: jest.fn(),
  openRegisterGate: jest.fn(),
  closeRegisterGate: jest.fn(),
  viewRegister: jest.fn(),
  saveRegister: jest.fn()
}))

const api = require('../../utils/wagesRegister')
const WagesRegister = require('../../components/WagesRegister.vue').default

/**
 * WagesRegister — the staff register itself (item 4.104), approved by Mike 2026-09-15.
 *
 * WHAT UAT CANNOT SEE, AND THIS PINS. A tester types into the sheet and sees numbers appear.
 * What they cannot see is WHAT LEAVES THE BROWSER — and the one rule that matters most on this
 * screen is what it does not send. Sick leave was ruled off the product entirely (*"take it
 * off"*), and a rule enforced only by there being no box for it is not enforced: a later
 * session adding a column would break it silently. These assertions also cover that the
 * screen computes nothing of its own, and that an unpriced person never renders as a zero.
 *
 * Deliberately NOT asserted here: the wording of any label, or any CSS class as such. Those
 * are on screen for a person to read.
 */
const ROWS = [
  { name: 'Mary G', division: 'Admin', payRate: 19.95, accruedLeaveDays: null, yearsEmployed: 3, band: 'direct-loss', liability: null },
  { name: 'Bruce', division: 'Production', payRate: 40.28, accruedLeaveDays: 16, yearsEmployed: 5, band: 'direct-loss', liability: 5155.84 }
]

const SUMMARY = {
  bands: [
    { band: 'direct-loss', people: 2, priced: 1, liability: 5155.84, avgYears: 4 },
    { band: 'indirect-loss', people: 0, priced: 0, liability: 0, avgYears: null },
    { band: 'no-material-loss', people: 0, priced: 0, liability: 0, avgYears: null }
  ],
  total: { people: 2, priced: 1, liability: 5155.84 }
}

const TEAM = [
  { name: 'Mary G', division: 'Admin', payRate: 19.95 },
  { name: 'Bruce', division: 'Production', payRate: 40.28 }
]

function answer (over) {
  return Object.assign({
    gate: { state: 'open' },
    register: { hoursInLeaveDay: 8, savedAt: null, savedBy: null },
    rows: JSON.parse(JSON.stringify(ROWS)),
    summary: SUMMARY,
    retention: { months: 84, source: 'platform-default', keptUntil: '2033-09-14T02:00:00.000Z' }
  }, over)
}

/** Let pending promises settle AND Vue re-render — `mounted` does a real async load. */
async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

async function mountRegister (over) {
  api.viewRegister.mockResolvedValue(answer(over))
  const wrapper = mountWithBuefy(WagesRegister, { propsData: { clientId: 'c-1', team: TEAM } })
  await settle(wrapper)
  return wrapper
}

beforeEach(() => {
  api.viewRegister.mockReset()
  api.saveRegister.mockReset()
  window.localStorage.setItem('advisor_e_token', 'a-token')
})

afterEach(() => { window.localStorage.clear() })

describe('reading the register', () => {
  it('renders one row per person the backend returned', async () => {
    const wrapper = await mountRegister()
    expect(wrapper.findAll('tbody tr').length).toBeGreaterThanOrEqual(2)
    expect(wrapper.text()).toContain('Mary G')
    expect(wrapper.text()).toContain('Bruce')
  })

  it('sends step 1\'s team up, because the register does not store the people', async () => {
    await mountRegister()
    expect(api.viewRegister).toHaveBeenCalledWith('c-1', TEAM, 'a-token')
  })

  it('🔴 shows an unpriced person as unpriced, never as a zero', async () => {
    const wrapper = await mountRegister()
    // Mike's ruling, question 2, 2026-09-15. A confident 0.00 against somebody's name is a
    // figure nobody computed.
    expect(wrapper.find('.wrs-unpriced').exists()).toBe(true)
  })

  it('🔴 computes nothing of its own — every figure is the backend\'s', async () => {
    // The liability shown is whatever the server said, even where it disagrees with what
    // this screen could have worked out from the same row.
    const rows = JSON.parse(JSON.stringify(ROWS))
    rows[1].liability = 99.99
    const wrapper = await mountRegister({ rows })
    expect(wrapper.text()).toContain('99.99')
  })

  it('renders nothing at all when the read fails, and says so', async () => {
    api.viewRegister.mockRejectedValue(new Error('nope'))
    const wrapper = mountWithBuefy(WagesRegister, { propsData: { clientId: 'c-1', team: TEAM } })
    await settle(wrapper)
    expect(wrapper.find('.wrs-err').exists()).toBe(true)
    expect(wrapper.find('.wrs-table').exists()).toBe(false)
  })

  it('does not call the backend at all without a token', async () => {
    window.localStorage.clear()
    const wrapper = mountWithBuefy(WagesRegister, { propsData: { clientId: 'c-1', team: TEAM } })
    await settle(wrapper)
    expect(api.viewRegister).not.toHaveBeenCalled()
  })

  it('re-reads when the team changes, so somebody added in step 1 appears here', async () => {
    const wrapper = await mountRegister()
    api.viewRegister.mockClear()
    wrapper.setProps({ team: TEAM.concat([{ name: 'Judy', division: 'Admin', payRate: 19 }]) })
    await settle(wrapper)
    expect(api.viewRegister).toHaveBeenCalled()
  })

  it('never carries the previous client\'s rows over', async () => {
    const wrapper = await mountRegister()
    api.viewRegister.mockImplementation(() => new Promise(() => {}))
    wrapper.setProps({ clientId: 'c-2' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.rows).toEqual([])
    expect(wrapper.find('.wrs-table').exists()).toBe(false)
  })
})

describe('saving', () => {
  it('🔴 SENDS ONLY THE FOUR FIELDS THE REGISTER HOLDS', async () => {
    const wrapper = await mountRegister()
    api.saveRegister.mockResolvedValue({ register: { hoursInLeaveDay: 8, savedAt: 'x', savedBy: 'y' } })
    await wrapper.vm.save()
    const [, payload] = api.saveRegister.mock.calls[0]
    expect(Object.keys(payload).sort()).toEqual(['hoursInLeaveDay', 'people'])
    payload.people.forEach((p) => {
      expect(Object.keys(p).sort()).toEqual(['accruedLeaveDays', 'band', 'name', 'yearsEmployed'])
      // The two Mike ruled off, named so this fails loudly if either ever returns.
      expect(p).not.toHaveProperty('sickLeaveDays')
      expect(p).not.toHaveProperty('dob')
    })
  })

  it('does not send the pay rate or division back — they are step 1\'s, not the register\'s', async () => {
    const wrapper = await mountRegister()
    api.saveRegister.mockResolvedValue({ register: { hoursInLeaveDay: 8, savedAt: 'x', savedBy: null } })
    await wrapper.vm.save()
    const [, payload] = api.saveRegister.mock.calls[0]
    expect(payload.people[0]).not.toHaveProperty('payRate')
    expect(payload.people[0]).not.toHaveProperty('division')
  })

  it('re-reads after saving, so what is on screen is what the server stored', async () => {
    const wrapper = await mountRegister()
    api.viewRegister.mockClear()
    api.saveRegister.mockResolvedValue({ register: { hoursInLeaveDay: 8, savedAt: 'x', savedBy: null } })
    await wrapper.vm.save()
    expect(api.viewRegister).toHaveBeenCalled()
  })

  it('reports a failed save and changes nothing on screen', async () => {
    const wrapper = await mountRegister()
    api.saveRegister.mockRejectedValue(new Error('nope'))
    await wrapper.vm.save()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.wrs-err').exists()).toBe(true)
  })

  it('sends an empty hours field as null, not as an empty string', async () => {
    const wrapper = await mountRegister({ register: { hoursInLeaveDay: null, savedAt: null, savedBy: null } })
    wrapper.vm.hoursInLeaveDay = ''
    api.saveRegister.mockResolvedValue({ register: { hoursInLeaveDay: null, savedAt: 'x', savedBy: null } })
    await wrapper.vm.save()
    expect(api.saveRegister.mock.calls[0][1].hoursInLeaveDay).toBeNull()
  })

  it('does not fire twice while a save is in flight', async () => {
    const wrapper = await mountRegister()
    let release
    api.saveRegister.mockImplementation(() => new Promise((resolve) => { release = resolve }))
    const first = wrapper.vm.save()
    await wrapper.vm.save()
    expect(api.saveRegister).toHaveBeenCalledTimes(1)
    release({ register: { hoursInLeaveDay: 8, savedAt: 'x', savedBy: null } })
    await first
  })
})

describe('the retention sentence', () => {
  it('shows the date the register is kept until', async () => {
    const wrapper = await mountRegister()
    expect(wrapper.find('.wrs-retention').exists()).toBe(true)
  })

  it('🔴 never offers the SETTING — changing it is a Firm Manager decision', async () => {
    const wrapper = await mountRegister()
    const retention = wrapper.find('.wrs-retention')
    expect(retention.find('input').exists()).toBe(false)
    expect(retention.find('select').exists()).toBe(false)
  })

  it('says nothing at all rather than a broken date when there is none', async () => {
    const wrapper = await mountRegister({ retention: { months: 84, source: 'platform-default', keptUntil: null } })
    expect(wrapper.find('.wrs-retention').exists()).toBe(false)
  })
})
