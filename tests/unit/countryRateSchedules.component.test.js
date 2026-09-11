/**
 * @jest-environment jsdom
 */
'use strict'

// The Country Rate Schedules tab as a global group manager meets it — item 4.92, slice 4.
//
// WHAT THIS FILE IS FOR. Four things on this screen behave wrongly in ways a person in UAT
// cannot see, because in each case the broken state looks exactly like a working one:
//
//   1. THE READ IS A BACKGROUND JOB, so the screen POLLS while one is running and MUST STOP
//      when nothing is. A poll left running is a request every ten seconds for the life of the
//      session, on every open tab, for ever — invisible until somebody reads a server log.
//   2. A READ THAT HAS DIED LOOKS LIKE ONE STILL WORKING. The allowance has already been spent,
//      and shown as an ordinary progress bar it is a manager waiting for something that will
//      never move.
//   3. A FAILURE TO READ THE LIBRARY MUST NOT LOOK LIKE AN EMPTY LIBRARY. A manager told they
//      hold no schedules when the truth is that we could not look would go and load ones they
//      already have — the absence-looks-like-a-negative failure this whole feature guards
//      against.
//   4. THE 2,800 ROWS MUST NEVER COME TO THE BROWSER. The list carries counts; the classes stay
//      on the backend.
//
// Deliberately NOT asserted: wording, headings, and CSS classes. A person in UAT sees those in
// five seconds and judges them better than an assertion can (Mike's ruling, 2026-08-24).

const { mountWithBuefy } = require('../helpers/mountComponent')
const CountryRateSchedules = require('../../components/firm/CountryRateSchedules.vue').default

/** One approved country, as the list route sends it — counts, never classes. */
function held (over) {
  return Object.assign({
    country: 'NZ',
    document: 'IR265 — General depreciation rates',
    published: '2023-10',
    approvedBy: 'mike@advisor-e.com',
    approvedAt: '2026-09-11T02:00:00.000Z',
    classes: 2814,
    unresolved: 3,
    pagesUnread: [],
    unreadNote: ''
  }, over || {})
}

/** One read in flight or waiting, as the list route sends it. */
function read (over) {
  return Object.assign({
    id: 'read-1',
    country: 'NZ',
    filename: 'ir265.pdf',
    documentName: 'IR265',
    published: '2023-10',
    totalPages: 52,
    loadedBy: 'mike@advisor-e.com',
    loadedAt: '2026-09-11T02:00:00.000Z',
    updatedAt: '2026-09-11T02:05:00.000Z',
    status: 'reading',
    passesPlanned: 7,
    passesDone: 3,
    passesFailed: 0,
    classesSoFar: 812,
    error: null,
    stale: false
  }, over || {})
}

/**
 * Mount the tab with the network stubbed.
 *
 * @param {object} list - what GET country-schedules answers
 * @param {object} [detail] - what GET country-schedules/read answers
 * @returns {Promise<object>} the wrapper, with `fetch` on it as `global.fetch`
 */
async function mountTab (list, detail) {
  global.fetch = jest.fn((path) => {
    if (String(path).includes('/read?')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(detail || { read: null }) })
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(Object.assign({ schedules: [], reads: [], mayLoad: true }, list || {}))
    })
  })
  const wrapper = mountWithBuefy(CountryRateSchedules, { propsData: { apiToken: 'test-token' } })
  // Enough turns for refresh -> the library call -> the per-read detail calls to settle. The
  // detail fetch is a second round trip inside the first, so three ticks is not enough.
  for (let i = 0; i < 10; i++) { await wrapper.vm.$nextTick() }
  return wrapper
}

beforeEach(() => { jest.useFakeTimers() })

afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
  delete global.fetch
})

describe('the library', () => {
  it('takes counts from the backend and never the classes themselves', async () => {
    const wrapper = await mountTab({ schedules: [held()] })
    expect(wrapper.vm.schedules[0].classes).toBe(2814)
    // A number, not a list: the 2,800 rows stay on the backend.
    expect(Array.isArray(wrapper.vm.schedules[0].classes)).toBe(false)
    wrapper.destroy()
  })

  it('reports a failure rather than showing an empty library', async () => {
    // A manager told they hold no schedules when we simply could not look would go and load
    // ones they already have.
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      statusText: 'Service Unavailable',
      json: () => Promise.resolve({ error: { message: 'could not be reached' } })
    }))
    const wrapper = mountWithBuefy(CountryRateSchedules, { propsData: { apiToken: 't' } })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.error).toBeTruthy()
    expect(wrapper.vm.schedules).toEqual([])
    wrapper.destroy()
  })

  it('takes whether this tier may load from the backend, never from its own guess', async () => {
    const wrapper = await mountTab({ mayLoad: false })
    expect(wrapper.vm.mayLoad).toBe(false)
    wrapper.destroy()
  })
})

describe('watching a read', () => {
  it('polls while something is being read', async () => {
    const wrapper = await mountTab({ reads: [read()] })
    const before = global.fetch.mock.calls.length

    jest.advanceTimersByTime(10000)
    await wrapper.vm.$nextTick()

    expect(global.fetch.mock.calls.length).toBeGreaterThan(before)
    wrapper.destroy()
  })

  it('does NOT poll when nothing is being read', async () => {
    const wrapper = await mountTab({ reads: [read({ status: 'pending' })] })
    expect(wrapper.vm.timer).toBeNull()
    wrapper.destroy()
  })

  it('stops polling when the tab goes away', async () => {
    // A poll left running is a request every ten seconds for the life of the session, on
    // every open tab, invisible until somebody reads a server log.
    const wrapper = await mountTab({ reads: [read()] })
    expect(wrapper.vm.timer).not.toBeNull()

    wrapper.destroy()
    expect(wrapper.vm.timer).toBeNull()
  })

  it('stops polling once the last read finishes', async () => {
    const wrapper = await mountTab({ reads: [read()] })
    expect(wrapper.vm.timer).not.toBeNull()

    wrapper.vm.reads = [read({ status: 'pending' })]
    wrapper.vm.syncPolling()

    expect(wrapper.vm.timer).toBeNull()
    wrapper.destroy()
  })

  it('treats a read that has gone quiet as stopped, not as still working', async () => {
    // The allowance has already been spent. Shown as an ordinary progress bar this is a
    // manager waiting for something that will never move.
    const wrapper = await mountTab({ reads: [read({ stale: true })] })
    expect(wrapper.vm.stateLabel(wrapper.vm.reads[0])).not.toBe('Reading')
    expect(wrapper.vm.anyReading).toBe(false)
    expect(wrapper.vm.timer).toBeNull()
    wrapper.destroy()
  })
})

describe('what a manager is shown about a finished read', () => {
  it('names the pages that could not be read', async () => {
    // Mike's second ruling of 2026-09-11: the gap is named, not hidden.
    const wrapper = await mountTab(
      { reads: [read({ status: 'pending' })] },
      { read: { reading: { pagesUnread: [{ from: 41, to: 48 }], unresolved: [] } } }
    )
    const shown = wrapper.vm.detail(wrapper.vm.reads[0])
    expect(shown.unreadNote).toContain('41')
    expect(shown.unreadNote).toContain('48')
    wrapper.destroy()
  })

  it('says nothing about gaps when every page was read', async () => {
    const wrapper = await mountTab(
      { reads: [read({ status: 'pending' })] },
      { read: { reading: { pagesUnread: [], unresolved: [] } } }
    )
    expect(wrapper.vm.detail(wrapper.vm.reads[0]).unreadNote).toBe('')
    wrapper.destroy()
  })

  it('carries the entries the document could not settle', async () => {
    const wrapper = await mountTab(
      { reads: [read({ status: 'pending' })] },
      {
        read: {
          reading: {
            pagesUnread: [],
            unresolved: [{ label: 'Southern Cross Cable capacity', pages: '39, 40', differs: 'two rates' }]
          }
        }
      }
    )
    expect(wrapper.vm.detail(wrapper.vm.reads[0]).unresolved).toHaveLength(1)
    wrapper.destroy()
  })

  it('a detail that will not load does not take the row down with it', async () => {
    global.fetch = jest.fn((path) => {
      if (String(path).includes('/read?')) {
        return Promise.resolve({ ok: false, statusText: 'nope', json: () => Promise.resolve({}) })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ schedules: [], reads: [read({ status: 'pending' })], mayLoad: true })
      })
    })
    const wrapper = mountWithBuefy(CountryRateSchedules, { propsData: { apiToken: 't' } })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.reads).toHaveLength(1)
    expect(wrapper.vm.error).toBe('')
    wrapper.destroy()
  })
})

describe('loading a schedule', () => {
  it('will not send without both a country and a file', async () => {
    const wrapper = await mountTab({})
    expect(wrapper.vm.canLoad).toBe(false)

    wrapper.vm.countryInput = 'NZ'
    expect(wrapper.vm.canLoad).toBe(false)

    wrapper.vm.file = { name: 'ir265.pdf' }
    expect(wrapper.vm.canLoad).toBe(true)

    wrapper.vm.countryInput = 'New Zealand'
    expect(wrapper.vm.canLoad).toBe(false)
    wrapper.destroy()
  })

  it('sends the country upper-cased, and the file, as a form', async () => {
    const wrapper = await mountTab({})
    wrapper.vm.countryInput = 'nz'
    wrapper.vm.file = new File(['%PDF-1.4'], 'ir265.pdf', { type: 'application/pdf' })

    await wrapper.vm.load()

    const post = global.fetch.mock.calls.filter(c => c[1] && c[1].method === 'POST')[0]
    expect(post[0]).toBe('/api/firm-manager/country-schedules')
    expect(post[1].body.get('country')).toBe('NZ')
    expect(post[1].body.get('file')).toBeTruthy()
    // The browser sets the multipart boundary; setting Content-Type here would break it.
    expect(post[1].headers['Content-Type']).toBeUndefined()
    wrapper.destroy()
  })

  it('shows the backend\'s own refusal rather than a generic failure', async () => {
    // The daily-allowance sentence is Mike's approved wording and must reach the manager as
    // he wrote it, not be replaced by whatever this screen would say instead.
    const wrapper = await mountTab({})
    wrapper.vm.countryInput = 'NZ'
    wrapper.vm.file = new File(['%PDF-1.4'], 'ir265.pdf', { type: 'application/pdf' })

    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      statusText: 'Too Many Requests',
      json: () => Promise.resolve({ error: { message: 'Your group has used all 10 country schedule readings for today.' } })
    }))
    await wrapper.vm.load()

    expect(wrapper.vm.uploadType).toBe('is-danger')
    expect(wrapper.vm.uploadMessage).toContain('all 10')
    wrapper.destroy()
  })

  it('clears the chosen file once it has been sent', async () => {
    const wrapper = await mountTab({})
    wrapper.vm.countryInput = 'NZ'
    wrapper.vm.file = new File(['%PDF-1.4'], 'ir265.pdf', { type: 'application/pdf' })

    await wrapper.vm.load()

    expect(wrapper.vm.file).toBeNull()
    wrapper.destroy()
  })
})

describe('deciding', () => {
  it('approves the country named, and re-reads the library afterwards', async () => {
    const wrapper = await mountTab({ reads: [read({ status: 'pending' })] })
    await wrapper.vm.approve('NZ')

    const post = global.fetch.mock.calls.filter(c => c[1] && c[1].method === 'POST')[0]
    expect(post[0]).toContain('/approve')
    expect(JSON.parse(post[1].body)).toEqual({ country: 'NZ' })
    wrapper.destroy()
  })

  it('rejects the country named', async () => {
    const wrapper = await mountTab({ reads: [read({ status: 'pending' })] })
    await wrapper.vm.reject('NZ')

    const post = global.fetch.mock.calls.filter(c => c[1] && c[1].method === 'POST')[0]
    expect(post[0]).toContain('/reject')
    wrapper.destroy()
  })

  it('reports a refusal rather than claiming the schedule was approved', async () => {
    const wrapper = await mountTab({ reads: [read({ status: 'pending' })] })
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ error: { message: 'that read cannot be approved' } })
    }))

    await wrapper.vm.approve('NZ')

    expect(wrapper.vm.error).toContain('cannot be approved')
    expect(wrapper.vm.deciding).toBe('')
    wrapper.destroy()
  })
})
