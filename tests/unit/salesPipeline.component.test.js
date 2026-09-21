/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The Pipeline screen — item 17 stage 2, the screen half.
 *
 * WHAT IS WORTH ASSERTING HERE, AND WHAT IS NOT.
 *
 * Mike's rule of 2026-08-24: a test earns its place when it catches what UAT
 * cannot. A person opening this screen sees the labels, the colours and the
 * layout in five seconds and judges them better than an assertion can, so none of
 * that is pinned. What they CANNOT see:
 *
 *   1. That the edit and delete buttons are absent on a COLLEAGUE'S shared deal.
 *      A tester signed in as one advisor sees only their own rows, so the screen
 *      looks identical whether the rule holds or not.
 *   2. That money is the FIRM's currency, not a hardcoded one. £ and $ both look
 *      like money. The source app hardcodes USD for every firm on earth
 *      (`new Intl.NumberFormat("en-US", { currency: "USD" })`) and nothing on its
 *      screen says so.
 *   3. That an empty money box saves as 0 rather than NaN, and that a failed call
 *      produces a message rather than a silently empty table.
 *   4. That the summary figures follow the filter. A total that ignored the
 *      filter beside a table that obeyed it reads as a contradiction, and only
 *      ever with the right combination of rows.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const SalesPipeline = require('../../components/sales/SalesPipeline.vue').default

const ME = 'advisor-me'
const THEM = 'advisor-them'

/** The component's source, exactly as written. */
function componentSource () {
  return require('fs').readFileSync(
    require.resolve('../../components/sales/SalesPipeline.vue'), 'utf8'
  )
}

/**
 * The component's CODE, with every comment removed.
 *
 * Needed because this file and the component both NAME the patterns they forbid
 * in order to explain them, and the first version of the currency test below
 * failed on its own explanatory prose — the same trap salesTrackerSchema.test.js
 * hit earlier the same day. An assertion about code must read the code.
 */
function componentCode () {
  return componentSource()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !/^\s*(\/\/|\/\/-)/.test(l))
    .join('\n')
}

/** A deal, with only what a test cares about spelled out. */
function deal (over) {
  return Object.assign({
    id: 'd1',
    advisorId: ME,
    firmId: 'firm-1',
    visibility: 'private',
    prospectName: 'Acme Ltd',
    businessName: 'Acme',
    prospectStatus: 'Active',
    partner: '',
    leadStaff: 'Jo',
    industry: 'Legal',
    secureMeeting: false,
    proposalSent: false,
    proposalValue: 0,
    jobSecured: false,
    jobSecuredValue: 0
  }, over || {})
}

/** Mount with the list already answered, so `mounted()`'s fetch is deterministic. */
async function mountWith (items, currency) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, items, currency: currency || 'GBP' })
  }))
  const w = mountWithBuefy(SalesPipeline)
  // currencyMixin also fetches; let both settle.
  await w.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await w.vm.$nextTick()
  return w
}

let prevClient

/**
 * The token the stubbed store answers with. Held in a variable the getter READS,
 * so a test can change it after the store has been installed.
 */
let currentToken = null

/** Point the stubbed localStorage at a token (or null for none). */
function setToken (token) {
  currentToken = token
}

/**
 * Install the stub ONCE. jsdom's window.localStorage is a read-only accessor, so
 * a plain assignment is silently ignored and the real (empty) store answers —
 * which is why the sharing tests first PASSED while asserting nothing.
 * defineProperty replaces it; re-defining per test does not take, hence the
 * variable above.
 */
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: {
    getItem: k => (k === 'advisor_e_token' ? currentToken : null),
    setItem: () => {},
    removeItem: () => {}
  }
})

beforeEach(() => {
  jest.clearAllMocks()
  // Nuxt sets process.client in the browser; jest does not, so the component's
  // SSR guards would refuse to read the token and every row would look like the
  // caller's own. Without this the sharing rule below is untested and PASSES.
  prevClient = process.client
  process.client = true
  // A token whose payload names ME, so isMine() has something real to compare.
  // jsdom's window.localStorage is a READ-ONLY accessor: a plain assignment is
  // silently ignored and the real (empty) store answers, so the token is never
  // found. defineProperty is what actually replaces it. Without this the sharing
  // tests below PASS while asserting nothing.
  const payload = Buffer.from(JSON.stringify({ advisorId: ME })).toString('base64')
  setToken('h.' + payload + '.s')
  window.atob = str => Buffer.from(str, 'base64').toString('binary')
})

afterEach(() => {
  process.client = prevClient
})

describe('a colleague\'s shared deal is readable but not editable', () => {
  test('🔴 my own deal offers edit and delete', async () => {
    const w = await mountWith([deal({ advisorId: ME })])
    expect(w.findAll('.sp-act button').length).toBe(2)
  })

  test('🔴 a colleague\'s SHARED deal offers neither', async () => {
    const w = await mountWith([deal({ id: 'd2', advisorId: THEM, visibility: 'firm' })])
    // The row is there — it is readable.
    expect(w.findAll('tbody tr').length).toBe(1)
    // And it carries no action the server would refuse.
    expect(w.findAll('.sp-act button').length).toBe(0)
  })

  test('a mixed list offers actions on mine only', async () => {
    const w = await mountWith([
      deal({ id: 'a', advisorId: ME }),
      deal({ id: 'b', advisorId: THEM, visibility: 'firm' }),
      deal({ id: 'c', advisorId: ME })
    ])
    expect(w.findAll('tbody tr').length).toBe(3)
    expect(w.findAll('.sp-act button').length).toBe(4) // two rows × edit+delete
  })

  test('with no readable token every row is offered — the BACKEND still refuses', async () => {
    // Fail-safe in the honest direction: the cost is an action that fails, never
    // one that leaks, because the server checks ownership in SQL regardless.
    setToken(null)
    const w = await mountWith([deal({ advisorId: THEM, visibility: 'firm' })])
    expect(w.vm.advisorId).toBe('')
    expect(w.findAll('.sp-act button').length).toBe(2)
  })
})

describe('money is the firm\'s, never a hardcoded currency', () => {
  test('🔴 no local formatter and no hardcoded currency in this component', () => {
    const code = componentCode()
    expect(code).not.toMatch(/new Intl\.NumberFormat/)
    expect(code).not.toMatch(/['"]USD['"]/)
    expect(code).not.toMatch(/['"]en-US['"]/)
  })

  test('the component takes its formatter from currencyMixin', () => {
    const src = componentSource()
    expect(src).toMatch(/currencyMixin/)
    expect(src).toMatch(/mixins:\s*\[currencyMixin\]/)
  })

  test('a figure renders through money(), so it follows the firm setting', async () => {
    const w = await mountWith([deal({ proposalValue: 46170 })])
    const spy = jest.spyOn(w.vm, 'money')
    await w.vm.$forceUpdate()
    await w.vm.$nextTick()
    expect(spy).toHaveBeenCalled()
  })
})

describe('the summary follows what is on screen', () => {
  test('a filter narrows the counts as well as the rows', async () => {
    const w = await mountWith([
      deal({ id: 'a', prospectStatus: 'Active', jobSecured: true, jobSecuredValue: 100 }),
      deal({ id: 'b', prospectStatus: 'Lost', jobSecured: true, jobSecuredValue: 900 })
    ])
    const securedBefore = w.vm.stats.find(s => s.key === 'secured').value
    expect(securedBefore).toBe('2')

    w.setData({ statusFilter: 'Active' })
    await w.vm.$nextTick()
    expect(w.vm.visible.length).toBe(1)
    expect(w.vm.stats.find(s => s.key === 'secured').value).toBe('1')
  })

  test('search matches the name, business, partner and lead', async () => {
    const w = await mountWith([
      deal({ id: 'a', prospectName: 'Zephyr', businessName: '', leadStaff: '' }),
      deal({ id: 'b', prospectName: 'Other', businessName: 'Zephyr Holdings', leadStaff: '' }),
      deal({ id: 'c', prospectName: 'Other', businessName: '', leadStaff: 'Zephyr' }),
      deal({ id: 'd', prospectName: 'Nothing', businessName: '', leadStaff: '' })
    ])
    w.setData({ search: 'zephyr' })
    await w.vm.$nextTick()
    expect(w.vm.visible.map(i => i.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('the form sends what the routes accept', () => {
  test('🔴 an empty money box sends 0, not NaN', async () => {
    const w = await mountWith([])
    w.vm.draft = Object.assign(w.vm.emptyDraft(), {
      prospectName: 'A', prospectStatus: 'New', proposalValue: ''
    })
    const body = w.vm.payload()
    expect(body.proposalValue).toBe(0)
    expect(Number.isNaN(body.proposalValue)).toBe(false)
  })

  test('a typed money value is sent as a Number, not the input\'s string', async () => {
    const w = await mountWith([])
    w.vm.draft = Object.assign(w.vm.emptyDraft(), {
      prospectName: 'A', prospectStatus: 'New', proposalValue: '1234.56'
    })
    expect(w.vm.payload().proposalValue).toBe(1234.56)
  })

  test('an empty date is sent as null rather than an empty string', async () => {
    const w = await mountWith([])
    w.vm.draft = Object.assign(w.vm.emptyDraft(), { prospectName: 'A', prospectStatus: 'New' })
    expect(w.vm.payload().meetingDate).toBeNull()
  })

  test('a new deal is private by default, matching the backend', async () => {
    const w = await mountWith([])
    expect(w.vm.emptyDraft().visibility).toBe('private')
    expect(w.vm.payload().visibility).toBe('private')
  })

  test('save is blocked until a name AND a status are present', async () => {
    const w = await mountWith([])
    w.vm.draft = Object.assign(w.vm.emptyDraft(), { prospectName: '', prospectStatus: 'New' })
    expect(w.vm.canSave).toBe(false)
    w.vm.draft.prospectName = '   '
    expect(w.vm.canSave).toBe(false)
    w.vm.draft.prospectName = 'Acme'
    expect(w.vm.canSave).toBe(true)
    w.vm.draft.prospectStatus = ''
    expect(w.vm.canSave).toBe(false)
  })

  test('editing sends PUT to the row\'s id; adding sends POST to the collection', async () => {
    const w = await mountWith([deal({ id: 'd7' })])
    global.fetch.mockClear()
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, item: {}, items: [] }) })

    w.vm.draft = Object.assign(w.vm.emptyDraft(), { id: 'd7', prospectName: 'A', prospectStatus: 'New' })
    await w.vm.save()
    expect(global.fetch.mock.calls[0][0]).toBe('/api/sales/pipeline/d7')
    expect(global.fetch.mock.calls[0][1].method).toBe('PUT')

    global.fetch.mockClear()
    w.vm.draft = Object.assign(w.vm.emptyDraft(), { prospectName: 'B', prospectStatus: 'New' })
    await w.vm.save()
    expect(global.fetch.mock.calls[0][0]).toBe('/api/sales/pipeline')
    expect(global.fetch.mock.calls[0][1].method).toBe('POST')
  })

  test('an id with an awkward character is encoded into the URL', async () => {
    const w = await mountWith([])
    global.fetch.mockClear()
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, items: [] }) })
    await w.vm.remove({ id: 'a/b?c' })
    expect(global.fetch.mock.calls[0][0]).toBe('/api/sales/pipeline/a%2Fb%3Fc')
  })

  test('opening an edit turns a timestamp back into a date the input accepts', async () => {
    const w = await mountWith([])
    w.vm.openEdit(deal({ id: 'd1', meetingDate: '2026-04-01T00:00:00.000Z' }))
    expect(w.vm.draft.meetingDate).toBe('2026-04-01')
  })
})

describe('a failure says so — it never leaves a silently empty screen', () => {
  test('an HTTP error shows the server\'s message', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ success: false, error: { code: 'DB_ERROR', message: 'Could not load your pipeline' } })
    }))
    const w = mountWithBuefy(SalesPipeline)
    await w.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(w.vm.errorText).toBe('Could not load your pipeline')
  })

  test('🔴 a network failure is caught and reported, not thrown', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const w = mountWithBuefy(SalesPipeline)
    await w.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(w.vm.errorText).toBeTruthy()
    expect(w.vm.items).toEqual([])
  })

  test('a body that is not the success envelope is treated as a failure', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) }))
    const w = mountWithBuefy(SalesPipeline)
    await w.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(w.vm.errorText).toBeTruthy()
  })

  test('a failed save leaves the form OPEN so the typing is not lost', async () => {
    const w = await mountWith([])
    w.vm.formOpen = true
    w.vm.draft = Object.assign(w.vm.emptyDraft(), { prospectName: 'A', prospectStatus: 'New' })
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    await w.vm.save()
    expect(w.vm.formOpen).toBe(true)
    expect(w.vm.saving).toBe(false)
  })
})

describe('server-side rendering safety', () => {
  test('no window, document or localStorage outside mounted()', () => {
    const src = componentSource()
    const script = src.slice(src.indexOf('<script>'), src.indexOf('</script>'))
    // Every browser access must sit behind process.client or inside a method that
    // only runs after mount. `data()` and `computed` run on the server.
    const dataBlock = script.slice(script.indexOf('data ()'), script.indexOf('computed'))
    expect(dataBlock).not.toMatch(/window\.|document\.|localStorage/)
    const computedBlock = script.slice(script.indexOf('computed'), script.indexOf('mounted'))
    expect(computedBlock).not.toMatch(/window\.|document\.|localStorage/)
  })

  test('the token read is guarded by process.client', () => {
    const src = componentSource()
    const fn = src.slice(src.indexOf('readAdvisorId ()'), src.indexOf('isMine ('))
    expect(fn).toMatch(/process\.client/)
  })
})
