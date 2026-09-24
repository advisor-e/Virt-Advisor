/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmOwnerFocusTasks = require('~/components/firm/FirmOwnerFocusTasks.vue').default

/**
 * The Owner Focus Tasks hub tab (item 5.4). Pins what it SENDS and what it refuses to leave
 * a manager holding — an empty starting list would start every owner with nothing — and that
 * an inherited list is never presented as this tier's own. No wording, no CSS.
 */

function answer (body) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

const INHERITED = {
  success: true,
  tasks: ['Board', 'Sales'],
  source: { scopeId: '__platform__', tier: 'mentor', shipped: false },
  tier: 'firm_manager',
  inherited: true,
  ownedHere: false
}

async function mount (first) {
  global.fetch = jest.fn(() => answer(first))
  const wrapper = mountWithBuefy(FirmOwnerFocusTasks, { propsData: { apiToken: 'tok' } })
  for (let i = 0; i < 3; i++) {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
  }
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('FirmOwnerFocusTasks', () => {
  it('shows an inherited list as inherited, and marks only the writer\'s rung', async () => {
    const wrapper = await mount(INHERITED)
    expect(wrapper.vm.ownedHere).toBe(false)
    expect(wrapper.vm.ladder.filter(r => r.isOwner).map(r => r.tier)).toEqual(['mentor'])
  })

  it('saves the names in order with the token, to the one endpoint, and nothing else', async () => {
    const wrapper = await mount(INHERITED)
    wrapper.vm.tasks[1].name = 'Selling'
    wrapper.vm.addTask()
    wrapper.vm.tasks[2].name = 'Hiring'
    global.fetch = jest.fn(() => answer(Object.assign({}, INHERITED, { ownedHere: true, inherited: false })))
    await wrapper.vm.save()

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/owner-focus-tasks')
    expect(opts.method).toBe('PUT')
    expect(opts.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(opts.body)).toEqual({ tasks: ['Board', 'Selling', 'Hiring'] })
    expect(wrapper.vm.ownedHere).toBe(true)
  })

  it('never removes the last task', async () => {
    const wrapper = await mount(INHERITED)
    wrapper.vm.removeTask(0)
    wrapper.vm.removeTask(0)
    expect(wrapper.vm.tasks.map(t => t.name)).toEqual(['Sales'])
  })

  it('a refused save shows the server\'s message and keeps the manager\'s edits', async () => {
    const wrapper = await mount(INHERITED)
    wrapper.vm.tasks[0].name = 'Edited'
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false, json: () => Promise.resolve({ error: { message: 'A task list must hold at least one task' } })
    }))
    await wrapper.vm.save()
    expect(wrapper.vm.saveError).toBe('A task list must hold at least one task')
    expect(wrapper.vm.tasks[0].name).toBe('Edited')
  })
})
