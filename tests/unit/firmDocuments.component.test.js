/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmDocuments = require('~/components/firm/FirmDocuments.vue').default
const { blockTone, BAND_TEXT } = require('~/utils/brandTokens')

/**
 * Component tests for the rebuilt Document Library (FIRM-EDITABLE-TABLES-PLAN.md
 * Phase 1): the Hub's old b-menu + two-table tab re-skinned onto the shared
 * FirmRail pattern. The claims that matter: every category loads and renders in
 * the owner's order with distinct brand tones, gaps stay visible, a document's
 * actions match its source (platform = read-only), an upload carries its
 * category, and storage changes are reported upward for the Hub's header.
 *
 * Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js).
 */

const doc = (id, name) => ({ id, name })

/** Per-category payloads the fetch stub serves, keyed off the category param. */
function defaultLists () {
  return {
    'logic-tables': {
      base: [doc('b1', 'Profit Logic Table.pdf')],
      firm: [doc('f1', 'Our Firm Levers.pdf')]
    },
    'domain-support': {
      base: [doc('b2', 'Staff Domain Support.pdf')],
      firm: []
    },
    templates: { base: [], firm: [] }
  }
}

function stubFetch (byCategory) {
  global.fetch = jest.fn((url) => {
    const m = String(url).match(/category=([\w-]+)/)
    const data = (m && byCategory[m[1]]) || { base: [], firm: [] }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data) })
  })
}

/** Let the parallel category loads settle, then re-render. */
async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

async function mountLibrary (lists) {
  stubFetch(lists || defaultLists())
  const wrapper = mountWithBuefy(FirmDocuments, { propsData: { apiToken: 'test-token' } })
  await settle(wrapper)
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('loading', () => {
  test('asks the backend for every category, with the bearer token', async () => {
    await mountLibrary()
    const urls = global.fetch.mock.calls.map(c => c[0])
    expect(urls).toEqual(expect.arrayContaining([
      '/api/firm-manager/documents?category=logic-tables',
      '/api/firm-manager/documents?category=domain-support',
      '/api/firm-manager/documents?category=templates'
    ]))
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token')
  })

  test('a failed load says so rather than rendering an empty library', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'boom', json: () => Promise.resolve({}) }))
    const wrapper = mountWithBuefy(FirmDocuments, { propsData: { apiToken: 't' } })
    await settle(wrapper)
    expect(wrapper.text()).toContain('firmDocuments.loadFailed')
  })
})

describe('the rail', () => {
  test('lists the three categories in order, tone-banded from the brand tokens', async () => {
    const wrapper = await mountLibrary()
    const bands = wrapper.findAll('.rail-section').wrappers
    expect(bands.map(w => w.text())).toEqual([
      'firmDocuments.catLogicTables',
      'firmDocuments.catDomainSupport',
      'firmDocuments.catTemplates'
    ])
    expect(bands[0].element.style.backgroundColor).toBe(hexToRgb(blockTone(0).band))
    expect(bands[0].element.style.color).toBe(hexToRgb(BAND_TEXT))
    const backgrounds = bands.map(w => w.element.style.backgroundColor)
    expect(new Set(backgrounds).size).toBe(backgrounds.length)
  })

  // Seeing the gap is the point — an empty list must stay visible, marked so.
  test('an empty document list is still listed, badged none', async () => {
    const wrapper = await mountLibrary()
    expect(wrapper.text()).toContain('firmDocuments.none')
    expect(wrapper.text()).toContain('firmDocuments.fileCount')
  })
})

describe('opening a document', () => {
  /** Expand the given drop-tab, then click the first document inside it. */
  async function openDoc (wrapper, subIndex) {
    wrapper.findAll('.rail-sub').at(subIndex).trigger('click')
    await wrapper.vm.$nextTick()
    wrapper.findAll('.rail-page').at(0).trigger('click')
    await wrapper.vm.$nextTick()
    return wrapper
  }

  test('before anything is picked, the panel invites a choice', async () => {
    const wrapper = await mountLibrary()
    expect(wrapper.text()).toContain('firmDocuments.pickPrompt')
    expect(wrapper.text()).toContain('firmDocuments.pickHint')
  })

  test('a platform document offers download only — no remove', async () => {
    const wrapper = await openDoc(await mountLibrary(), 0)
    expect(wrapper.text()).toContain('Profit Logic Table.pdf')
    expect(wrapper.text()).toContain('firmDocuments.originPlatform')
    expect(wrapper.text()).toContain('firmDocuments.download')
    const buttonTexts = wrapper.findAll('button').wrappers.map(w => w.text())
    expect(buttonTexts).not.toContain('firmDocuments.remove')
    expect(wrapper.vm.current.source).toBe('base')
  })

  test('a firm document can also be removed', async () => {
    const wrapper = await openDoc(await mountLibrary(), 1)
    expect(wrapper.text()).toContain('Our Firm Levers.pdf')
    expect(wrapper.text()).toContain('firmDocuments.originFirm')
    expect(wrapper.text()).toContain('firmDocuments.remove')
    expect(wrapper.vm.current.source).toBe('firm')
  })
})

describe('the category panel', () => {
  test('clicking a category band opens its upload panel', async () => {
    const wrapper = await mountLibrary()
    wrapper.findAll('.rail-section--button').at(0).trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('firmDocuments.uploadHeading')
    expect(wrapper.vm.selectedCategory).toBe('logic-tables')
  })

  test('an upload posts the file against the open category and reports the storage change', async () => {
    const wrapper = await mountLibrary()
    wrapper.findAll('.rail-section--button').at(0).trigger('click')
    await wrapper.vm.$nextTick()
    wrapper.setData({ uploadFile: new File(['%PDF-1.4'], 'New Table.pdf', { type: 'application/pdf' }) })
    await wrapper.vm.submitUpload()
    const post = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST')
    expect(post).toBeTruthy()
    expect(post[0]).toBe('/api/firm-manager/documents')
    expect(post[1].body.get('category')).toBe('logic-tables')
    expect(wrapper.emitted('storage-changed')).toBeTruthy()
  })
})

describe('removing a firm document', () => {
  test('deletes by id, clears the panel, and reports the storage change', async () => {
    const wrapper = await mountLibrary()
    wrapper.findAll('.rail-sub').at(1).trigger('click')
    await wrapper.vm.$nextTick()
    wrapper.findAll('.rail-page').at(0).trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.deleteDoc(wrapper.vm.current)
    const del = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'DELETE')
    expect(del).toBeTruthy()
    expect(del[0]).toBe('/api/firm-manager/documents/f1')
    expect(wrapper.vm.current).toBeNull()
    expect(wrapper.emitted('storage-changed')).toBeTruthy()
  })
})

describe('search', () => {
  test('filters to matching file names and auto-expands their drop-tab', async () => {
    const wrapper = await mountLibrary()
    wrapper.setData({ query: 'levers' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Our Firm Levers.pdf')
    expect(wrapper.text()).not.toContain('Staff Domain Support.pdf')
  })

  test('a search with no hit says so instead of showing an empty rail', async () => {
    const wrapper = await mountLibrary()
    wrapper.setData({ query: 'zzzz-no-such-file' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('firmDocuments.noMatchHere')
  })
})

/** jsdom reports inline colours as rgb(); convert for comparison. */
function hexToRgb (hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}
