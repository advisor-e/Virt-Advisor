/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for components/shared/ConversationPane.vue — the shared
 * conversation view used by Messages and Connecting (Phase 3 of FEAT-CONNECTING).
 * Covers self-load from the `threadId` prop, replies, invitation accept/decline,
 * per-message translation, and the `changed` event that tells the parent list to
 * refresh. fetch is URL-aware; $t/$i18n/$buefy mocked.
 */

import { mount, createLocalVue } from '@vue/test-utils'
import ConversationPane from '../../components/collaborate/shared/ConversationPane.vue'

const localVue = createLocalVue()
const Stub = { render (h) { return h('div', this.$slots.default) } }
;['b-message', 'b-tag', 'b-switch', 'b-button', 'b-modal', 'b-field', 'b-autocomplete'].forEach(n => localVue.component(n, Stub))
// The shared ToolPicker has its own tests; stub it (with reset).
const PickerStub = { render (h) { return h('div') }, methods: { reset () {} } }

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const CURRENT = { id: 't-bob', kind: 'outreach', withName: 'Bob Lindt', status: 'active', direction: 'incoming', messages: [{ from: 'Bob Lindt', text: 'Gerne!', lang: 'de' }] }
const REPLIED = { ...CURRENT, messages: [...CURRENT.messages, { from: 'Me', text: 'Thanks', lang: 'en' }] }

function mockApi () {
  global.fetch = jest.fn((url) => {
    let payload = {}
    if (url.includes('/reply')) { payload = REPLIED } else if (url.includes('/invitations/')) { payload = { success: true } } else if (url === '/api/translate/locale') { payload = { t: 'Willingly!' } } else if (url.startsWith('/api/people/messages/')) { payload = CURRENT }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
  })
}

function factory (threadId) {
  return mount(ConversationPane, {
    localVue,
    stubs: { ToolPicker: PickerStub },
    propsData: { threadId: threadId || 't-bob' },
    mocks: {
      $t: key => key,
      $i18n: { locale: 'en' },
      $buefy: { toast: { open: jest.fn() }, dialog: { confirm: opts => opts.onConfirm() } }
    }
  })
}

describe('ConversationPane', () => {
  afterEach(() => { delete global.fetch })

  test('self-loads the thread named by the threadId prop', async () => {
    mockApi()
    const w = factory('t-bob')
    await flush(); await w.vm.$nextTick()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/messages/t-bob')
    expect(w.vm.current.withName).toBe('Bob Lindt')
  })

  test('reloads when the threadId prop changes', async () => {
    mockApi()
    const w = factory('t-bob')
    await flush()
    global.fetch.mockClear()
    await w.setProps({ threadId: 't-other' })
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/messages/t-other')
  })

  test('send() posts a reply, updates the conversation, clears the box and emits changed', async () => {
    mockApi()
    const w = factory()
    await flush()
    w.vm.reply = 'Thanks'
    await w.vm.send()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/messages/t-bob/reply', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.reply).toBe('')
    expect(w.vm.current.messages).toHaveLength(2)
    expect(w.emitted().changed).toBeTruthy()
  })

  test('send() does nothing with an empty message', async () => {
    mockApi()
    const w = factory()
    await flush(); global.fetch.mockClear()
    w.vm.reply = '   '
    await w.vm.send()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('respondInvite() accepts, toasts, reloads and emits changed', async () => {
    mockApi()
    const w = factory()
    await flush()
    w.vm.current = { id: 't-inv', kind: 'invitation', direction: 'incoming', status: 'request', messages: [] }
    await w.vm.respondInvite(true)
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/invitations/t-inv/accept', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-success' }))
    expect(w.emitted().changed).toBeTruthy()
  })

  test('translateMsg() fetches a translation and stores it', async () => {
    mockApi()
    const w = factory()
    await flush()
    await w.vm.translateMsg({ text: 'Gerne!', lang: 'de' }, 0)
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/translate/locale', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.translations['t-bob:0']).toBe('Willingly!')
    expect(w.vm.translating['t-bob:0']).toBe(false)
  })

  test('shows the shared-workspace strip with Advisor-e links when the thread has shared pages', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(Object.assign({}, CURRENT, {
        sharedPages: [{ pageId: 'ae-x', title: 'Joint Forecast', openUrl: 'https://app.advisor-e.com/p/ae-x' }]
      }))
    }))
    const w = factory('t-anna')
    await flush(); await w.vm.$nextTick()
    expect(w.text()).toContain('Joint Forecast')
    expect(w.find('a[href="https://app.advisor-e.com/p/ae-x"]').exists()).toBe(true)
  })

  test('canShareTools is true on a 1:1 thread, false on a group thread', async () => {
    mockApi()
    const w = factory()
    await flush()
    w.vm.current = { id: 'g', kind: 'group', messages: [] }
    expect(w.vm.canShareTools).toBe(false)
    w.vm.current = { id: 'd', kind: 'outreach', messages: [] }
    expect(w.vm.canShareTools).toBe(true)
  })

  test('addTool attaches a catalogue tool to the 1:1 shared workspace', async () => {
    global.fetch = jest.fn((url, opts) => {
      let payload = {}
      if (url === '/api/templates') { payload = [{ pageId: 'id-1', title: 'Tool One', subSection: 'Finance' }] } else if (url.includes('/shared-pages') && opts && opts.method === 'POST') { payload = { success: true, sharedPages: [{ pageId: 'id-1', title: 'Tool One', openUrl: 'https://app.advisor-e.com/p/id-1' }] } } else { payload = CURRENT }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
    })
    const w = factory('t-bob')
    await flush(); await w.vm.$nextTick()
    w.vm.openToolPicker()
    // The ToolPicker emits `select` with the chosen catalogue row.
    w.vm.onToolSelect({ pageId: 'id-1', title: 'Tool One' })
    expect(w.vm.selectedTool.pageId).toBe('id-1')
    await w.vm.addTool()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/messages/t-bob/shared-pages', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.current.sharedPages[0].pageId).toBe('id-1')
  })

  test('removeTool detaches a tool after confirm (DELETE)', async () => {
    global.fetch = jest.fn((url, opts) => {
      let payload = {}
      if (url.includes('/shared-pages/') && opts && opts.method === 'DELETE') { payload = { success: true, sharedPages: [] } } else { payload = Object.assign({}, CURRENT, { sharedPages: [{ pageId: 'id-1', title: 'Tool One', openUrl: 'https://app.advisor-e.com/p/id-1' }] }) }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
    })
    const w = factory('t-bob')
    await flush(); await w.vm.$nextTick()
    expect(w.vm.current.sharedPages).toHaveLength(1)
    await w.vm.removeTool({ pageId: 'id-1', title: 'Tool One' })
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/messages/t-bob/shared-pages/id-1', expect.objectContaining({ method: 'DELETE' }))
    expect(w.vm.current.sharedPages).toHaveLength(0)
  })

  test('isForeign flags a message only when its lang differs from the reader', async () => {
    mockApi()
    const w = factory()
    await flush()
    expect(w.vm.isForeign({ lang: 'de' })).toBe(true) // reader is 'en'
    expect(w.vm.isForeign({ lang: 'en' })).toBe(false)
    expect(w.vm.isForeign({})).toBe(false)
  })

  test('turning on auto-translate translates foreign messages', async () => {
    mockApi()
    const w = factory()
    await flush()
    global.fetch.mockClear()
    w.vm.autoTranslate = true
    await w.vm.$nextTick(); await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/translate/locale', expect.objectContaining({ method: 'POST' }))
  })
})
