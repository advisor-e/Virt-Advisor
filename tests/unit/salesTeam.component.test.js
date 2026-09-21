/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The Team and Lists screens — item 17 stage 4, the screen half.
 *
 * WHAT IS WORTH ASSERTING HERE (Mike's rule, 2026-08-24: a test earns its place
 * when it catches what UAT cannot). A tester opening these screens sees the
 * labels, the colours and the layout in five seconds. What they CANNOT see:
 *
 *   1. That a rate with no denominator shows a DASH, not 0%. A tester with real
 *      data never meets the case, and a confident 0% beside a colleague's name
 *      reads as a failure rather than as an absence of data.
 *   2. That money is the FIRM's currency rather than a hardcoded one. £ and $
 *      both look like money — the source app hardcodes NZD for every firm.
 *   3. That a 403 says "this is a manager's screen" rather than "something went
 *      wrong". A tester signed in AS a manager never sees either.
 *   4. That a failed load leaves a message rather than a silently empty table.
 *   5. That an edit is local until saved, so a half-finished list never reaches
 *      the colleagues whose dropdowns read it.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const SalesTeam = require('../../components/sales/SalesTeam.vue').default
const SalesLists = require('../../components/sales/SalesLists.vue').default

/** The component's code with comments stripped — an assertion about code must read code. */
function codeOf (file) {
  return require('fs')
    .readFileSync(require.resolve(`../../components/sales/${file}`), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !/^\s*(\/\/|\/\/-)/.test(l))
    .join('\n')
}

function row (over) {
  return Object.assign({
    leadStaff: 'Ann',
    prospects: 4,
    approachable: 4,
    approachesMade: 2,
    secureMeetings: 1,
    proposalsSent: 2,
    totalProposalValue: 10000,
    engagementsSecured: 1,
    totalSecuredValue: 5000,
    approachRate: 50,
    securedRate: 50,
    avgProposalValue: 5000
  }, over || {})
}

/** Mount the Team screen with its fetch already answered. */
async function mountTeam (payload, opts) {
  const o = opts || {}
  global.fetch = jest.fn((url) => {
    // currencyMixin fetches too; answer it and the team call separately.
    if (!String(url).includes('/api/sales/team')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, currency: o.currency || 'GBP' }) })
    }
    return Promise.resolve({
      ok: o.ok !== false,
      status: o.status || 200,
      json: () => Promise.resolve(payload)
    })
  })
  const w = mountWithBuefy(SalesTeam)
  await w.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await w.vm.$nextTick()
  return w
}

/** Mount the Lists screen with its fetch already answered. */
async function mountLists (lists) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, lists })
  }))
  const w = mountWithBuefy(SalesLists)
  await w.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await w.vm.$nextTick()
  return w
}

describe('Team screen — what a tester cannot see', () => {
  test('🔴 a rate with nothing to divide by shows a DASH, never 0%', async () => {
    const w = await mountTeam({
      success: true,
      rows: [row({ leadStaff: 'New Starter', securedRate: null, approachRate: null, avgProposalValue: null })],
      totals: { prospects: 1, securedRate: null, approachRate: null }
    })
    const text = w.text()
    expect(text).toContain('—')
    // The trap this guards: a 0 would render as "0%" and read as a real failure.
    expect(text).not.toContain('0%')
  })

  test('a real zero rate is still shown as 0%, not hidden behind the dash', async () => {
    const w = await mountTeam({
      success: true,
      rows: [row({ securedRate: 0, approachRate: 0 })],
      totals: { securedRate: 0 }
    })
    expect(w.text()).toContain('0%')
  })

  test('🔴 money is the FIRM\'s currency — no hardcoded symbol in the component', () => {
    const code = codeOf('SalesTeam.vue')
    expect(code).toMatch(/currencyMixin/)
    // The source app's mistake: Intl.NumberFormat with a fixed locale/currency.
    expect(code).not.toMatch(/Intl\.NumberFormat/)
    expect(code).not.toMatch(/currency:\s*['"](USD|NZD|GBP|EUR)['"]/)
  })

  test('🔴 a 403 says this is a manager\'s screen, not "something went wrong"', async () => {
    const w = await mountTeam({ success: false }, { ok: false, status: 403 })
    expect(w.vm.errorText).toBe('salesTeam.errors.forbidden')
    expect(w.vm.errorText).not.toBe('salesTeam.errors.load')
  })

  test('another failure says the load failed', async () => {
    const w = await mountTeam({ success: false }, { ok: false, status: 500 })
    expect(w.vm.errorText).toBe('salesTeam.errors.load')
  })

  test('🔴 a failed load leaves a MESSAGE, never a silently empty table', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const w = mountWithBuefy(SalesTeam)
    await w.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    await w.vm.$nextTick()
    expect(w.vm.errorText).toBeTruthy()
    expect(w.vm.loading).toBe(false)
  })

  test('🔴 the truncation warning appears only when rows were dropped', async () => {
    const shown = await mountTeam({ success: true, rows: [row()], totals: {}, truncated: true })
    expect(shown.vm.truncated).toBe(true)
    expect(shown.text()).toContain('salesTeam.truncated')

    const hidden = await mountTeam({ success: true, rows: [row()], totals: {}, truncated: false })
    expect(hidden.text()).not.toContain('salesTeam.truncated')
  })

  test('an unassigned bucket is labelled as a gap, not as a person', async () => {
    const w = await mountTeam({
      success: true,
      rows: [row({ leadStaff: 'Unassigned' })],
      totals: {}
    })
    expect(w.text()).toContain('salesTeam.unassignedNote')
  })

  test('a named colleague carries no such note', async () => {
    const w = await mountTeam({ success: true, rows: [row({ leadStaff: 'Ann' })], totals: {} })
    expect(w.text()).not.toContain('salesTeam.unassignedNote')
  })

  test('no rows shows the empty state rather than a bare table', async () => {
    const w = await mountTeam({ success: true, rows: [], totals: {} })
    expect(w.text()).toContain('salesTeam.empty.title')
  })

  test('🔴 the firm total shows BOTH halves of the approach rate', async () => {
    // Found on screen 2026-09-22, invisible to every other test: `totals` was
    // declared as `{}`, so Vue 2 never made `approachable` reactive and the
    // footer rendered "7" where it should read "7 / 8" — while the IDENTICAL
    // markup in the body rows was correct, because `rows` is an array replaced
    // wholesale. A field a component will render must exist at create time.
    const w = await mountTeam({
      success: true,
      rows: [row()],
      totals: { prospects: 9, approachable: 8, approachesMade: 7, approachRate: 87.5 }
    })
    const footer = w.find('tfoot').text()
    expect(footer).toContain('7 / 8')
  })

  test('every field the footer renders is declared before the fetch', () => {
    // The guard for the bug above, at its cause rather than its symptom.
    const w = mountWithBuefy(SalesTeam)
    const declared = Object.keys(w.vm.totals)
    for (const field of ['prospects', 'approachable', 'approachesMade', 'secureMeetings',
      'proposalsSent', 'totalProposalValue', 'engagementsSecured', 'totalSecuredValue']) {
      expect(declared).toContain(field)
    }
  })

  test('🔴 the screen holds NO access logic — the backend is the boundary', () => {
    const code = codeOf('SalesTeam.vue')
    // A screen that filtered by role or visibility would be a second place for
    // the rule to live, and the first place it could drift.
    expect(code).not.toMatch(/visibility\s*===/)
    expect(code).not.toMatch(/userRole|isManager|role\s*===/)
  })
})

describe('Lists screen — what a tester cannot see', () => {
  const LISTS = {
    partner: { key: 'partner', name: 'Partner', description: 'Who owns it', items: ['Ann', 'Bob'], isCustomised: true },
    salesStyle: { key: 'salesStyle', name: 'Sales Style', description: 'How', items: ['Campaign'], isCustomised: false }
  }

  test('🔴 an edit is LOCAL until saved — nothing is sent while typing', async () => {
    const w = await mountLists(JSON.parse(JSON.stringify(LISTS)))
    const callsAfterLoad = global.fetch.mock.calls.length
    w.vm.toggle('partner')
    w.vm.draft = 'Carol'
    w.vm.add('partner')
    await w.vm.$nextTick()
    expect(w.vm.lists.partner.items).toContain('Carol')
    // The colleagues whose dropdowns read this list have seen nothing.
    expect(global.fetch.mock.calls.length).toBe(callsAfterLoad)
  })

  test('an unsaved edit is marked as unsaved', async () => {
    const w = await mountLists(JSON.parse(JSON.stringify(LISTS)))
    expect(w.vm.isDirty('partner')).toBe(false)
    w.vm.lists.partner.items.push('Carol')
    expect(w.vm.isDirty('partner')).toBe(true)
  })

  test('undo puts the list back to how it loaded', async () => {
    const w = await mountLists(JSON.parse(JSON.stringify(LISTS)))
    w.vm.lists.partner.items.push('Carol')
    w.vm.revert('partner')
    expect(w.vm.lists.partner.items).toEqual(['Ann', 'Bob'])
    expect(w.vm.isDirty('partner')).toBe(false)
  })

  test('🔴 a duplicate is refused ON SCREEN, so the advisor sees why nothing happened', async () => {
    const w = await mountLists(JSON.parse(JSON.stringify(LISTS)))
    w.vm.draft = 'Ann'
    w.vm.add('partner')
    expect(w.vm.errorText).toBeTruthy()
    expect(w.vm.lists.partner.items).toEqual(['Ann', 'Bob'])
  })

  test('reordering changes the order the dropdown will show', async () => {
    const w = await mountLists(JSON.parse(JSON.stringify(LISTS)))
    w.vm.move('partner', 1, -1)
    expect(w.vm.lists.partner.items).toEqual(['Bob', 'Ann'])
  })

  test('a move past either end does nothing rather than corrupting the list', async () => {
    const w = await mountLists(JSON.parse(JSON.stringify(LISTS)))
    w.vm.move('partner', 0, -1)
    w.vm.move('partner', 1, 1)
    expect(w.vm.lists.partner.items).toEqual(['Ann', 'Bob'])
  })

  test('🔴 the SAVED list from the backend becomes the baseline, not the local copy', async () => {
    const w = await mountLists(JSON.parse(JSON.stringify(LISTS)))
    w.vm.lists.partner.items.push('  Carol  ')
    // The backend trims and dedupes; the screen must adopt ITS answer.
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        success: true,
        list: { key: 'partner', name: 'Partner', description: 'Who owns it', items: ['Ann', 'Bob', 'Carol'], isCustomised: true }
      })
    }))
    await w.vm.save('partner')
    expect(w.vm.lists.partner.items).toEqual(['Ann', 'Bob', 'Carol'])
    expect(w.vm.isDirty('partner')).toBe(false)
  })

  test('🔴 a 403 on save says only a manager may change these lists', async () => {
    const w = await mountLists(JSON.parse(JSON.stringify(LISTS)))
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false, status: 403, json: () => Promise.resolve({ success: false })
    }))
    await w.vm.save('partner')
    expect(w.vm.errorText).toBe('salesLists.errors.forbidden')
  })

  test('a validation message from the backend is shown, not replaced by a generic one', async () => {
    const w = await mountLists(JSON.parse(JSON.stringify(LISTS)))
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ success: false, error: { code: 'INVALID_ITEMS', message: 'A list cannot hold more than 200 values' } })
    }))
    await w.vm.save('partner')
    expect(w.vm.errorText).toMatch(/200 values/)
  })

  test('a network failure on save leaves a message and clears the saving state', async () => {
    const w = await mountLists(JSON.parse(JSON.stringify(LISTS)))
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    await w.vm.save('partner')
    expect(w.vm.errorText).toBe('salesLists.errors.save')
    expect(w.vm.savingKey).toBe('')
  })

  test('a failed load leaves a message rather than an empty screen', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const w = mountWithBuefy(SalesLists)
    await w.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    await w.vm.$nextTick()
    expect(w.vm.errorText).toBeTruthy()
    expect(w.vm.loading).toBe(false)
  })

  test('🔴 the Languages block of the source screen is NOT built — stage 6, not this', () => {
    // Its pages/lists.vue carries an "add a language, AI translates the app"
    // section. That is stage 6 and the survey recommends dropping it. Its absence
    // is a scope decision; this fails if a later session quietly adds it.
    const code = codeOf('SalesLists.vue')
    expect(code).not.toMatch(/addNewLanguage|newLanguage|nativeName|translate/i)
  })
})
