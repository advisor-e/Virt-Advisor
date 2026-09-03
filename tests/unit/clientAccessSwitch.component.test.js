/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const ClientAccessSwitch = require('~/components/base/ClientAccessSwitch.vue').default

/**
 * The advisor's "Client access" switch (design/features/business-entity-reports.md, D3/D5,
 * approved by Mike 2026-09-03). Pinned: it renders for an advisor only — never for a
 * client's sign-in, never with no sign-in, never off a catalogue route — and a flip sends
 * exactly { route, state } for the chosen client, with the token, to the PUT route.
 */
function respond (status, body) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
}

async function settle (wrapper) {
  for (let i = 0; i < 6; i++) { await wrapper.vm.$nextTick() }
}

const CLIENTS = { success: true, clients: [{ id: 'c-1', name: 'Big Bird Bakery' }, { id: 'c-2', name: 'Vanoss' }] }

function fetchByUrl (answers) {
  return jest.fn((url, init) => {
    const method = (init && init.method) || 'GET'
    const key = `${method} ${url}`
    const hit = Object.keys(answers).find(k => key.indexOf(k) === 0)
    return hit ? answers[hit]() : respond(404, {})
  })
}

beforeEach(() => { window.localStorage.clear() })
afterEach(() => { delete global.fetch })

describe('ClientAccessSwitch — when it appears', () => {
  it('renders nothing with no sign-in', async () => {
    global.fetch = jest.fn()
    const wrapper = mountWithBuefy(ClientAccessSwitch, { propsData: { modelRoute: '/volatility' } })
    await settle(wrapper)
    expect(wrapper.find('.cas').exists()).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('renders nothing for a business entity\'s sign-in (D5: advisor only)', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    window.localStorage.setItem('advisor_e_role', 'business_entity')
    global.fetch = jest.fn()
    const wrapper = mountWithBuefy(ClientAccessSwitch, { propsData: { modelRoute: '/volatility' } })
    await settle(wrapper)
    expect(wrapper.find('.cas').exists()).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('renders nothing on a route that is not a catalogue model', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    global.fetch = jest.fn()
    const wrapper = mountWithBuefy(ClientAccessSwitch, { propsData: { modelRoute: '/firm-manager' } })
    await settle(wrapper)
    expect(wrapper.find('.cas').exists()).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('renders for an advisor on a model, with the firm\'s clients to pick from and nothing chosen', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    global.fetch = fetchByUrl({ 'GET /api/clients': () => respond(200, CLIENTS) })
    const wrapper = mountWithBuefy(ClientAccessSwitch, { propsData: { modelRoute: '/volatility' } })
    await settle(wrapper)
    expect(wrapper.find('.cas').exists()).toBe(true)
    expect(wrapper.findAll('option').length).toBe(2)
    expect(wrapper.text()).toContain('clientReports.switch.hintNoClient')
    // Both buttons are inert until a client is chosen.
    wrapper.findAll('.cas-btn').wrappers.forEach(b => expect(b.attributes('disabled')).toBeDefined())
  })
})

describe('ClientAccessSwitch — flipping it', () => {
  it('choosing a client reads their state, and Open sends { route, state } for THAT client', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    global.fetch = fetchByUrl({
      'GET /api/clients': () => respond(200, CLIENTS),
      'GET /api/client-reports/access/c-1': () => respond(200, { success: true, clientId: 'c-1', open: {} }),
      'PUT /api/client-reports/access/c-1': () => respond(200, { success: true, clientId: 'c-1', route: '/volatility', state: 'open' })
    })
    const wrapper = mountWithBuefy(ClientAccessSwitch, { propsData: { modelRoute: '/volatility' } })
    await settle(wrapper)

    await wrapper.find('select').setValue('c-1')
    await settle(wrapper)
    expect(wrapper.text()).toContain('clientReports.switch.hintHidden')

    const openBtn = wrapper.findAll('.cas-btn').at(1)
    await openBtn.trigger('click')
    await settle(wrapper)

    const put = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'PUT')
    expect(put[0]).toBe('/api/client-reports/access/c-1')
    expect(JSON.parse(put[1].body)).toEqual({ route: '/volatility', state: 'open' })
    expect(put[1].headers.Authorization).toBe('Bearer tok')
    expect(wrapper.text()).toContain('clientReports.switch.hintOpen')
    expect(wrapper.emitted('change')[0][0]).toEqual({ clientId: 'c-1', route: '/volatility', state: 'open' })
    expect(window.localStorage.getItem('advisor_e_report_client')).toBe('c-1')
  })

  it('a client already open shows Open, and a failed save says so and keeps the old state', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    window.localStorage.setItem('advisor_e_report_client', 'c-2')
    global.fetch = fetchByUrl({
      'GET /api/clients': () => respond(200, CLIENTS),
      'GET /api/client-reports/access/c-2': () => respond(200, { success: true, clientId: 'c-2', open: { '/volatility': { state: 'open' } } }),
      'PUT /api/client-reports/access/c-2': () => respond(500, {})
    })
    const wrapper = mountWithBuefy(ClientAccessSwitch, { propsData: { modelRoute: '/volatility' } })
    await settle(wrapper)
    expect(wrapper.text()).toContain('clientReports.switch.hintOpen')

    await wrapper.findAll('.cas-btn').at(0).trigger('click')
    await settle(wrapper)
    expect(wrapper.text()).toContain('clientReports.switch.saveFailed')
    expect(wrapper.vm.state).toBe('open')
  })
})
