/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmDomainSupport = require('~/components/firm/FirmDomainSupport.vue').default

/**
 * Component tests for the firm Domain Support screen (FIRM-EDITABLE-TABLES-PLAN.md
 * Phase 2, §0.5/§0.6) — the four-column material tables the advisors' AI reads.
 *
 * This is the LIVE-PREVIEW read pass: the claims that matter are that the rail
 * groups load, a migrated domain opens into an editable four-column table, a
 * not-yet-migrated domain says so instead of showing an empty grid, the preview
 * banner is present and Save is inert (nothing persists yet), and on-screen
 * add/remove edits the local copy only.
 *
 * Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js).
 */

/** The domain list the list route serves. EOY is migrated; profit is not. */
function defaultList () {
  return {
    advisoryDomains: [
      { id: 'eoy', label: 'End of Year', supportTools: 0, origin: 'platform' },
      { id: 'profit', label: 'Profitability', supportTools: 3, origin: 'platform' }
    ],
    getSellers: [
      { id: 'get-marketing', label: 'marketing', supportTools: 2, origin: 'platform' }
    ]
  }
}

/** EOY detail — the four-column `materials` shape. */
function eoyDetail () {
  return {
    domain: 'eoy',
    label: 'end of year meetings and client reviews',
    materials: [
      {
        name: 'EOY Meeting Agenda',
        summary: 'The standard End of Year meeting structure.',
        who_when: 'General commercial business clients.',
        steps: ['Set the agenda.', 'Conduct the accounts review.']
      }
    ]
  }
}

/** A legacy domain detail — the old `support_tools` shape, no `materials`. */
function profitDetail () {
  return { domain: 'profit', label: 'profitability', support_tools: [{ name: 'X' }] }
}

/** Route the fetch stub by URL. */
function stubFetch (list, details) {
  global.fetch = jest.fn((url) => {
    const u = String(url)
    let data = {}
    if (/\/domain-support\/[^/]+\/history/.test(u)) {
      data = { history: [] }
    } else if (/\/domain-support\/([^/?]+)$/.test(u)) {
      const id = decodeURIComponent(u.match(/\/domain-support\/([^/?]+)$/)[1])
      data = details[id] || {}
    } else if (/\/domain-support$/.test(u)) {
      data = list
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data) })
  })
}

async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

async function mountScreen (list, details) {
  stubFetch(list || defaultList(), details || { eoy: eoyDetail(), profit: profitDetail() })
  const wrapper = mountWithBuefy(FirmDomainSupport, { propsData: { apiToken: 'test-token' } })
  await settle(wrapper)
  return wrapper
}

/** Open a domain by id via the component's own select(). */
async function openDomain (wrapper, id, label, origin) {
  await wrapper.vm.select({ id, label, origin: origin || 'platform' })
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('loading', () => {
  test('asks the backend for the domain list, with the bearer token', async () => {
    await mountScreen()
    expect(global.fetch.mock.calls[0][0]).toBe('/api/firm-manager/domain-support')
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token')
  })

  test('a failed load says so rather than rendering an empty screen', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'boom', json: () => Promise.resolve({}) }))
    const wrapper = mountWithBuefy(FirmDomainSupport, { propsData: { apiToken: 't' } })
    await settle(wrapper)
    expect(wrapper.text()).toContain('firmDomainSupport.loadFailed')
  })
})

describe('the rail', () => {
  test('lists the two groups with their domains', async () => {
    const wrapper = await mountScreen()
    expect(wrapper.text()).toContain('firmDomainSupport.groupAdvisory')
    expect(wrapper.text()).toContain('firmDomainSupport.groupSellers')
    expect(wrapper.text()).toContain('End of Year')
    expect(wrapper.text()).toContain('Profitability')
  })

  test('before a domain is picked, the panel invites a choice', async () => {
    const wrapper = await mountScreen()
    expect(wrapper.text()).toContain('firmDomainSupport.pickPrompt')
  })

  test('search filters the domain list', async () => {
    const wrapper = await mountScreen()
    wrapper.setData({ query: 'year' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('End of Year')
    expect(wrapper.text()).not.toContain('Profitability')
  })
})

describe('opening a migrated domain', () => {
  test('renders the four-column table with the material and its steps', async () => {
    const wrapper = await openDomain(await mountScreen(), 'eoy', 'End of Year')
    expect(wrapper.text()).toContain('firmDomainSupport.colName')
    expect(wrapper.text()).toContain('firmDomainSupport.colSteps')
    expect(wrapper.vm.form.materials).toHaveLength(1)
    expect(wrapper.vm.form.materials[0].steps).toHaveLength(2)
  })

  test('Save is disabled until the table is edited, then enabled', async () => {
    const wrapper = await openDomain(await mountScreen(), 'eoy', 'End of Year')
    const findSave = () => wrapper.findAll('button').wrappers.find(w => w.text().includes('firmDomainSupport.save'))
    expect(wrapper.vm.dirty).toBe(false)
    expect(findSave().attributes('disabled')).toBeTruthy()
    wrapper.vm.form.materials[0].summary = 'Edited by the firm.'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.dirty).toBe(true)
    expect(findSave().attributes('disabled')).toBeFalsy()
  })

  test('adding a material or step alone does not save', async () => {
    const wrapper = await openDomain(await mountScreen(), 'eoy', 'End of Year')
    wrapper.vm.addMaterial()
    wrapper.vm.addStep(wrapper.vm.form.materials[0])
    await wrapper.vm.$nextTick()
    const anyWrite = global.fetch.mock.calls.find(c => c[1] && c[1].method && c[1].method !== 'GET')
    expect(anyWrite).toBeFalsy()
  })
})

describe('saving and resetting', () => {
  test('save posts the cleaned materials (origin stripped, blank steps dropped)', async () => {
    const wrapper = await openDomain(await mountScreen(), 'eoy', 'End of Year')
    wrapper.vm.form.materials[0].summary = 'Firm summary.'
    wrapper.vm.form.materials[0].steps.push('   ')
    await wrapper.vm.save()
    const post = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST')
    expect(post).toBeTruthy()
    expect(post[0]).toBe('/api/firm-manager/domain-support/eoy')
    const body = JSON.parse(post[1].body)
    expect(body.materials[0].summary).toBe('Firm summary.')
    expect(body.materials[0].origin).toBeUndefined()
    expect(body.materials[0].steps).not.toContain('   ')
  })

  test('after save the domain is firm-authored and the rail tag follows', async () => {
    const wrapper = await openDomain(await mountScreen(), 'eoy', 'End of Year')
    wrapper.vm.form.materials[0].summary = 'Firm summary.'
    await wrapper.vm.save()
    expect(wrapper.vm.current.origin).toBe('firm')
    expect(wrapper.vm.advisoryDomains.find(d => d.id === 'eoy').origin).toBe('firm')
  })

  test('reset is offered only for a firm-authored domain, and deletes the override', async () => {
    const list = defaultList()
    list.advisoryDomains[0].origin = 'firm'
    const wrapper = await openDomain(await mountScreen(list), 'eoy', 'End of Year', 'firm')
    expect(wrapper.vm.canReset).toBe(true)
    await wrapper.vm.reset()
    const del = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'DELETE')
    expect(del).toBeTruthy()
    expect(del[0]).toBe('/api/firm-manager/domain-support/eoy')
    expect(wrapper.vm.current.origin).toBe('platform')
  })

  test('a platform domain cannot be reset', async () => {
    const wrapper = await openDomain(await mountScreen(), 'eoy', 'End of Year')
    expect(wrapper.vm.canReset).toBe(false)
  })
})

describe('opening a not-yet-migrated domain', () => {
  test('says it is not in the four-column format instead of an empty grid', async () => {
    const wrapper = await openDomain(await mountScreen(), 'profit', 'Profitability')
    expect(wrapper.text()).toContain('firmDomainSupport.notMigrated')
    expect(wrapper.vm.hasMaterials).toBe(false)
  })
})

describe('on-screen editing (local only)', () => {
  test('add / remove step edits the local copy', async () => {
    const wrapper = await openDomain(await mountScreen(), 'eoy', 'End of Year')
    const material = wrapper.vm.form.materials[0]
    wrapper.vm.addStep(material)
    expect(material.steps).toHaveLength(3)
    wrapper.vm.removeStep(material, 0)
    expect(material.steps).toHaveLength(2)
  })

  test('add material appends a firm-origin blank row', async () => {
    const wrapper = await openDomain(await mountScreen(), 'eoy', 'End of Year')
    wrapper.vm.addMaterial()
    expect(wrapper.vm.form.materials).toHaveLength(2)
    expect(wrapper.vm.form.materials[1].origin).toBe('firm')
  })
})
