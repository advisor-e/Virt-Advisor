/**
 * @jest-environment jsdom
 */
'use strict'

// MentorTemplateLibrary — the Mentor Hub upload screen for the master export
// (SEARCH-CONTENT-CASCADE-PLAN Phase 1). Per the testing ruling (2026-08-24),
// nothing here asserts wording or CSS — UAT judges those better. What UAT
// cannot see, and these tests pin:
//
// - every call carries the mentor's bearer token;
// - a rejected upload leaves the screen consistent (error surfaced, no reload
//   pretending it worked) and maps the backend's code to the right message KEY;
// - restore sends the history row's id, not its version number — the backend
//   looks up by row id, and the two are easy to conflate on a quiet screen.

const MentorTemplateLibrary = require('../../components/mentor/MentorTemplateLibrary.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function jsonResponse (body, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

const emptyState = { success: true, hasUpload: false, templateCount: 0, history: [] }
const loadedState = {
  success: true,
  hasUpload: true,
  templateCount: 291,
  history: [
    { id: 12, version: 3, is_active: 1, saved_by: 'mike@advisor-e.com', created_at: '2026-08-31T09:00:00Z' },
    { id: 7, version: 2, is_active: 0, saved_by: 'mike@advisor-e.com', created_at: '2026-08-20T09:00:00Z' }
  ]
}

function mountScreen () {
  return mountWithBuefy(MentorTemplateLibrary, {
    propsData: { apiToken: 'test-token' },
    mocks: { $buefy: { toast: { open: jest.fn() } } }
  })
}

beforeEach(() => {
  global.fetch = jest.fn(() => jsonResponse(emptyState))
})

afterEach(() => {
  delete global.fetch
})

describe('loading the upload state', () => {
  it('fetches on mount with the bearer token', async () => {
    mountScreen()
    await flush()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/mentor/templates')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  it('renders the stored count and the history rows once loaded', async () => {
    global.fetch.mockImplementation(() => jsonResponse(loadedState))
    const wrapper = mountScreen()
    await flush()
    expect(wrapper.vm.state.templateCount).toBe(291)
    expect(wrapper.findAll('table tbody tr').length).toBe(2)
  })

  it('a failed load shows the error state, never an empty reassuring card', async () => {
    global.fetch.mockImplementation(() => Promise.reject(new Error('down')))
    const wrapper = mountScreen()
    await flush()
    expect(wrapper.vm.loadError).toContain('templateLibrary.loadFailed')
    expect(wrapper.find('.box').exists()).toBe(false)
  })
})

describe('uploading', () => {
  it('POSTs the picked file as multipart with the bearer token, then reloads', async () => {
    const wrapper = mountScreen()
    await flush()
    global.fetch.mockClear()
    global.fetch
      .mockImplementationOnce(() => jsonResponse({ success: true, imported: true, templateCount: 291, version: 3 }))
      .mockImplementationOnce(() => jsonResponse(loadedState))

    wrapper.vm.pickedFile = new File(['[]'], 'search_content_20260831.json')
    await wrapper.vm.upload()

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/mentor/templates/import')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    expect(opts.body).toBeInstanceOf(FormData)
    expect(opts.body.get('file')).toBeInstanceOf(File)
    // Reloaded after success, and the picker cleared so the same file is not re-sent.
    expect(global.fetch.mock.calls[1][0]).toBe('/api/mentor/templates')
    expect(wrapper.vm.pickedFile).toBeNull()
  })

  it.each([
    ['INVALID_JSON', 'templateLibrary.reasonNotJson'],
    ['INVALID_FORMAT', 'templateLibrary.reasonWrongShape'],
    ['TOO_MANY_TEMPLATES', 'templateLibrary.reasonTooLarge'],
    ['SOMETHING_NEW', 'templateLibrary.reasonGeneric']
  ])('maps a %s rejection to its reason and does NOT reload', async (code, expectedKey) => {
    const wrapper = mountScreen()
    await flush()
    global.fetch.mockClear()
    global.fetch.mockImplementationOnce(() =>
      jsonResponse({ success: false, error: { code, message: 'server detail' } }, false))

    wrapper.vm.pickedFile = new File(['x'], 'bad.json')
    await wrapper.vm.upload()

    expect(wrapper.vm.uploadError).toBe(expectedKey)
    // One call only — a rejected file must not trigger the post-success reload.
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('a network failure surfaces the generic reason rather than throwing', async () => {
    const wrapper = mountScreen()
    await flush()
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error('offline')))
    wrapper.vm.pickedFile = new File(['x'], 'x.json')
    await wrapper.vm.upload()
    expect(wrapper.vm.uploadError).toBe('templateLibrary.reasonGeneric')
    expect(wrapper.vm.uploading).toBe(false)
  })
})

describe('restoring', () => {
  it('sends the history row ID (not its version number) with the bearer token', async () => {
    global.fetch.mockImplementation(() => jsonResponse(loadedState))
    const wrapper = mountScreen()
    await flush()
    global.fetch.mockClear()
    global.fetch
      .mockImplementationOnce(() => jsonResponse({ success: true, restored: true, version: 4 }))
      .mockImplementationOnce(() => jsonResponse(loadedState))

    await wrapper.vm.restore(loadedState.history[1])

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/mentor/templates/restore')
    expect(JSON.parse(opts.body)).toEqual({ versionId: 7 })
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    expect(global.fetch.mock.calls[1][0]).toBe('/api/mentor/templates')
  })

  it('only non-current versions offer a restore control', async () => {
    global.fetch.mockImplementation(() => jsonResponse(loadedState))
    const wrapper = mountScreen()
    await flush()
    const rows = wrapper.findAll('table tbody tr')
    expect(rows.at(0).find('button').exists()).toBe(false)
    expect(rows.at(1).find('button').exists()).toBe(true)
  })

  it('a failed restore reports failure and clears the busy state', async () => {
    global.fetch.mockImplementation(() => jsonResponse(loadedState))
    const wrapper = mountScreen()
    await flush()
    global.fetch.mockImplementationOnce(() => jsonResponse({ success: false }, false))
    await wrapper.vm.restore(loadedState.history[1])
    expect(wrapper.vm.$buefy.toast.open).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'is-danger' }))
    expect(wrapper.vm.restoring).toBe('')
  })
})
