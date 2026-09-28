/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The Growth Aspect Questions hub tab — item 15.2, screens 3 and 3b.
 *
 * What UAT cannot see: which request each button sends. A Switch off sent as a remove, a
 * Keep mine sent as Use theirs, or an action filed against the wrong aspect all look like a
 * button that worked. The backend decides every rule (tests/unit/growthAspects.routes.test.js);
 * this proves the screen asks for the right one.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmGrowthAspectQuestions = require('~/components/firm/FirmGrowthAspectQuestions.vue').default

/** One aspect holding one row of every kind, plus eight plain ones. */
function aspects () {
  const plain = ['Process Improvement', 'Customer Focus', 'Sales (Process)', 'Authenticity', 'Inventory & Equipment', 'Team Focus', 'Innovation', 'Harmony / Balance']
    .map(name => ({ name, description: 'D', descriptionSource: 'inherited', descriptionChangedAbove: false, questions: [{ id: 'q', text: 'Q', source: 'inherited', changedAbove: false }], declined: [] }))
  return [{
    name: 'Governance',
    description: 'Ours.',
    descriptionSource: 'edited-here',
    descriptionChangedAbove: true,
    descriptionAbove: 'Theirs.',
    questions: [
      { id: 'ga-governance-1', text: 'Inherited?', source: 'inherited', changedAbove: false },
      { id: 'ga-governance-2', text: 'Edited?', source: 'edited-here', changedAbove: false },
      { id: 'ga-governance-3', text: 'Mine?', source: 'edited-here', changedAbove: true, above: 'Rewritten above?' },
      { id: 'fq-1', text: 'Added?', source: 'added-here', changedAbove: false }
    ],
    declined: [{ id: 'ga-governance-5', text: 'Off?' }]
  }].concat(plain)
}

function fetchMock () {
  return jest.fn((url, opts) => {
    const u = String(url)
    const body = u.endsWith('/history')
      ? { history: [{ id: 5, version: 2, saved_by: 'mentor@x', created_at: '2026-09-28T00:00:00Z' }] }
      : { aspects: aspects() }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
  })
}

async function settle (wrapper) {
  for (let i = 0; i < 6; i++) { await wrapper.vm.$nextTick(); await Promise.resolve() }
}

/** The one request the last click sent, as `METHOD path body`. */
function lastSent () {
  const call = global.fetch.mock.calls.filter(c => c[1] && c[1].method !== 'GET').pop()
  return { method: call[1].method, path: String(call[0]), body: JSON.parse(call[1].body) }
}

/** Click the button on a row whose text contains `rowText` and whose label key ends `key`. */
async function click (wrapper, rowText, key) {
  const row = wrapper.findAll('.gaq-q').filter(r => r.text().includes(rowText)).at(0)
  await row.findAll('button').filter(b => b.text() === 'growthAspectQuestions.buttons.' + key).at(0).trigger('click')
  await settle(wrapper)
}

let wrapper
beforeEach(async () => {
  global.fetch = fetchMock()
  wrapper = mountWithBuefy(FirmGrowthAspectQuestions, { propsData: { apiToken: 'tok-1' } })
  await settle(wrapper)
})
afterEach(() => { delete global.fetch })

describe('the Growth Aspect Questions tab — which request each button sends', () => {
  test('reads with the caller’s token and shows who saved each version', () => {
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-1')
    expect(wrapper.text()).toContain('mentor@x')
  })

  test('Switch off on an inherited question, and Remove on an added one, both send off: true', async () => {
    await click(wrapper, 'Inherited?', 'switchOff')
    expect(lastSent()).toEqual({ method: 'POST', path: '/api/firm-manager/growth-aspects/questions/off', body: { aspect: 'Governance', id: 'ga-governance-1', off: true } })
    await click(wrapper, 'Added?', 'remove')
    expect(lastSent().body).toEqual({ aspect: 'Governance', id: 'fq-1', off: true })
  })

  test('Switch back on sends off: false', async () => {
    await click(wrapper, 'Off?', 'switchBackOn')
    expect(lastSent().body).toEqual({ aspect: 'Governance', id: 'ga-governance-5', off: false })
  })

  test('🔴 on a question rewritten above, Keep mine and Use theirs send different requests', async () => {
    await click(wrapper, 'Mine?', 'keepMine')
    expect(lastSent()).toMatchObject({ path: '/api/firm-manager/growth-aspects/questions/keep-mine', body: { id: 'ga-governance-3' } })
    await click(wrapper, 'Mine?', 'useTheirs')
    expect(lastSent()).toMatchObject({ path: '/api/firm-manager/growth-aspects/questions/use-inherited', body: { id: 'ga-governance-3' } })
  })

  test('the same two on the description', async () => {
    await click(wrapper, 'Ours.', 'keepMine')
    expect(lastSent()).toMatchObject({ path: '/api/firm-manager/growth-aspects/description/keep-mine', body: { aspect: 'Governance' } })
  })

  test('Use the inherited wording on an edited question', async () => {
    await click(wrapper, 'Edited?', 'useInherited')
    expect(lastSent()).toMatchObject({ path: '/api/firm-manager/growth-aspects/questions/use-inherited', body: { id: 'ga-governance-2' } })
  })

  test('Edit then Save sends the new words for that question', async () => {
    await click(wrapper, 'Inherited?', 'edit')
    wrapper.vm.editing.text = 'Reworded?'
    await wrapper.vm.saveEdit()
    expect(lastSent()).toEqual({ method: 'PUT', path: '/api/firm-manager/growth-aspects/questions', body: { aspect: 'Governance', id: 'ga-governance-1', text: 'Reworded?' } })
  })

  test('Add a question then Save posts it to the aspect on screen', async () => {
    wrapper.vm.choose('Innovation')
    wrapper.vm.startEdit('new', null, '')
    wrapper.vm.editing.text = 'New?'
    await wrapper.vm.saveEdit()
    expect(lastSent()).toEqual({ method: 'POST', path: '/api/firm-manager/growth-aspects/questions', body: { aspect: 'Innovation', text: 'New?' } })
  })

  test('the only question on an aspect cannot be switched off', async () => {
    wrapper.vm.choose('Innovation')
    await settle(wrapper)
    const off = wrapper.findAll('button').filter(b => b.text() === 'growthAspectQuestions.buttons.switchOff')
    expect(off).toHaveLength(1)
    expect(off.at(0).attributes('disabled')).toBe('disabled')
  })

  test('a refused save keeps the typing box open with the manager’s words, and shows why', async () => {
    wrapper.vm.startEdit('new', null, 'Kept?')
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'Bad Request', json: () => Promise.resolve({ error: { message: 'A question cannot be blank' } }) }))
    await wrapper.vm.saveEdit()
    expect(wrapper.vm.error).toBe('A question cannot be blank')
    expect(wrapper.vm.editing.text).toBe('Kept?')
  })

  test('Restore names the version', async () => {
    await wrapper.vm.restore(5)
    expect(lastSent()).toEqual({ method: 'POST', path: '/api/firm-manager/growth-aspects/restore', body: { versionId: 5 } })
  })
})
