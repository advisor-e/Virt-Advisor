/**
 * @jest-environment jsdom
 */
'use strict'

// FirmTemplateLibrary — the Firm Manager Hub screen for the firm's OWN template
// upload (SEARCH-CONTENT-CASCADE-PLAN Phase 3, approved 2026-09-01). Per the
// testing ruling (2026-08-24), nothing here asserts wording or CSS — UAT judges
// those better. What UAT cannot see, and these tests pin:
//
// - every call carries the manager's bearer token, to the FIRM routes (whose
//   success responses, unlike the mentor's, carry no `success` flag — res.ok is
//   the contract);
// - a rejected upload leaves the screen consistent and maps the backend's code
//   to the right message KEY;
// - restore sends the history row's id, not its version number;
// - Remove NEVER fires from the button alone — only the dialog's confirm sends
//   the DELETE (an unconfirmed destructive call is invisible in a quick UAT
//   pass, because the happy path looks identical);
// - the state line picks the right KEY as fields go missing (name-less rows and
//   the history-less dev fallback are exactly the cases UAT machines never show).

const FirmTemplateLibrary = require('../../components/firm/FirmTemplateLibrary.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function jsonResponse (body, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

const emptyState = { hasImport: false, templateCount: 0, history: [] }
const loadedState = {
  hasImport: true,
  templateCount: 250,
  history: [
    { id: 12, version: 3, is_active: 1, saved_by: 'mgr@testfirm.com', created_at: '2026-08-31T09:00:00Z' },
    { id: 7, version: 2, is_active: 0, saved_by: 'mgr@testfirm.com', created_at: '2026-08-20T09:00:00Z' }
  ]
}

function mountScreen () {
  return mountWithBuefy(FirmTemplateLibrary, {
    propsData: { apiToken: 'test-token' },
    mocks: {
      $buefy: {
        toast: { open: jest.fn() },
        dialog: { confirm: jest.fn() }
      }
    }
  })
}

beforeEach(() => {
  global.fetch = jest.fn(() => jsonResponse(emptyState))
})

afterEach(() => {
  delete global.fetch
})

describe('loading the upload state', () => {
  it('fetches the FIRM route on mount with the bearer token', async () => {
    mountScreen()
    await flush()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/templates')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  it('maps hasImport onto the screen state and renders the history rows', async () => {
    global.fetch.mockImplementation(() => jsonResponse(loadedState))
    const wrapper = mountScreen()
    await flush()
    expect(wrapper.vm.state.hasUpload).toBe(true)
    expect(wrapper.vm.state.templateCount).toBe(250)
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

describe('the library view (cards + contents)', () => {
  it('fetches the in-force library alongside the state, and maps the source', async () => {
    global.fetch.mockImplementation(url => url.endsWith('/library')
      ? jsonResponse({ source: 'firm', platformCount: 291, templates: [{ page: 'id-1', title: 'T' }] })
      : jsonResponse(loadedState))
    const wrapper = mountScreen()
    await flush()
    expect(wrapper.vm.library.loaded).toBe(true)
    expect(wrapper.vm.library.source).toBe('firm')
    expect(wrapper.vm.library.platformCount).toBe(291)
    expect(wrapper.findComponent({ name: 'FirmTemplateContents' }).exists()).toBe(true)
  })

  it('an unrecognised source falls back to platform, never an unvalidated string', async () => {
    global.fetch.mockImplementation(url => url.endsWith('/library')
      ? jsonResponse({ source: 'weird', platformCount: 291, templates: [] })
      : jsonResponse(emptyState))
    const wrapper = mountScreen()
    await flush()
    expect(wrapper.vm.library.source).toBe('platform')
  })
})

describe('the state line', () => {
  it.each([
    ['a named row picks the full key', loadedState.history, 'firmTemplateLibrary.stateUploaded '],
    ['a name-less row picks the no-name key', [{ id: 12, version: 3, is_active: 1, saved_by: '', created_at: '2026-08-31T09:00:00Z' }], 'firmTemplateLibrary.stateUploadedNoName'],
    ['no history at all (dev fallback) picks the bare key', [], 'firmTemplateLibrary.stateUploadedBare']
  ])('%s', async (_label, history, expectedKey) => {
    global.fetch.mockImplementation(() => jsonResponse({ hasImport: true, templateCount: 250, history }))
    const wrapper = mountScreen()
    await flush()
    expect(wrapper.vm.stateLine).toContain(expectedKey)
  })
})

describe('uploading', () => {
  it('POSTs the picked file as multipart with the bearer token, then reloads', async () => {
    const wrapper = mountScreen()
    await flush()
    global.fetch.mockClear()
    global.fetch
      .mockImplementationOnce(() => jsonResponse({ imported: true, templateCount: 250, version: 3 }))
      .mockImplementationOnce(() => jsonResponse(loadedState))

    wrapper.vm.pickedFile = new File(['[]'], 'search_content_20260901.json')
    await wrapper.vm.upload()

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/templates')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    expect(opts.body).toBeInstanceOf(FormData)
    expect(opts.body.get('file')).toBeInstanceOf(File)
    // Reloaded after success, and the picker cleared so the same file is not re-sent.
    expect(global.fetch.mock.calls[1][0]).toBe('/api/firm-manager/templates')
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
})

describe('restoring', () => {
  it('sends the history row ID (not its version number) to the firm restore route', async () => {
    global.fetch.mockImplementation(() => jsonResponse(loadedState))
    const wrapper = mountScreen()
    await flush()
    global.fetch.mockClear()
    global.fetch
      .mockImplementationOnce(() => jsonResponse({ restored: true, version: 4 }))
      .mockImplementationOnce(() => jsonResponse(loadedState))

    await wrapper.vm.restore(loadedState.history[1])

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/templates/restore')
    expect(JSON.parse(opts.body)).toEqual({ versionId: 7 })
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    expect(global.fetch.mock.calls[1][0]).toBe('/api/firm-manager/templates')
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

describe('removing the upload', () => {
  it('the button opens the confirm dialog and sends NOTHING until confirmed', async () => {
    global.fetch.mockImplementation(() => jsonResponse(loadedState))
    const wrapper = mountScreen()
    await flush()
    global.fetch.mockClear()

    wrapper.vm.confirmRemove()

    expect(wrapper.vm.$buefy.dialog.confirm).toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('confirming sends the DELETE with the bearer token, then reloads', async () => {
    global.fetch.mockImplementation(() => jsonResponse(loadedState))
    const wrapper = mountScreen()
    await flush()
    global.fetch.mockClear()
    global.fetch
      .mockImplementationOnce(() => jsonResponse({ reset: true }))
      .mockImplementationOnce(() => jsonResponse(emptyState))

    wrapper.vm.confirmRemove()
    // Fire what the dialog's confirm button would.
    await wrapper.vm.$buefy.dialog.confirm.mock.calls[0][0].onConfirm()

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/templates')
    expect(opts.method).toBe('DELETE')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
    expect(global.fetch.mock.calls[1][0]).toBe('/api/firm-manager/templates')
  })

  it('a failed removal reports failure and clears the busy state', async () => {
    global.fetch.mockImplementation(() => jsonResponse(loadedState))
    const wrapper = mountScreen()
    await flush()
    global.fetch.mockImplementationOnce(() => jsonResponse({ success: false }, false))
    await wrapper.vm.remove()
    expect(wrapper.vm.$buefy.toast.open).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'is-danger' }))
    expect(wrapper.vm.removing).toBe(false)
  })

  it('the remove control is absent while there is nothing to remove', async () => {
    const wrapper = mountScreen()
    await flush()
    // With no upload, the box offers upload only — no path to the DELETE at all.
    expect(wrapper.vm.state.hasUpload).toBe(false)
    expect(wrapper.findAll('.box .control button').length).toBe(1)
  })
})
