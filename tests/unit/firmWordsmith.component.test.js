/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The Wordsmith hub tab — item 15.14, screens 6 and 7.
 *
 * What UAT cannot see: which request each button sends. A style row switched off, a Keep mine
 * sent as Use theirs, an action filed against the wrong statement, or a scope slipped into a body
 * all look like a button that worked. The backend decides every rule
 * (tests/unit/wordsmithContent.routes.test.js); this proves the screen asks for the right one and
 * never offers what the backend refuses.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmWordsmith = require('~/components/firm/FirmWordsmith.vue').default

const plain = name => ({
  name,
  domain: { id: 'd', name: 'Knowing', rule: 'R', source: 'inherited', changedAbove: false },
  maxWords: { value: 40, source: 'inherited', changedAbove: false },
  definition: [{ id: name + '-d1', basis: 'alignment', text: 'A', source: 'inherited', changedAbove: false }],
  definitionDeclined: [],
  questions: [],
  questionsDeclined: []
})

function content () {
  return {
    statements: [{
      name: 'Vision',
      domain: { id: 'ws-vision-domain', name: 'Being', rule: 'Ours.', source: 'edited-here', changedAbove: true, above: 'Theirs.' },
      maxWords: { value: 45, source: 'inherited', changedAbove: false },
      definition: [
        { id: 'ws-vision-d1', basis: 'alignment', text: 'Only alignment row', source: 'inherited', changedAbove: false },
        { id: 'ws-vision-d2', basis: 'best-practice', text: 'Best practice row', source: 'inherited', changedAbove: false, cites: [{ author: 'Collins & Porras', title: 'T', url: 'https://hbr.org/x' }] }
      ],
      definitionDeclined: [],
      questions: [{ id: 'ws-vision-e1', question: 'By when?', source: 'inherited', changedAbove: false }],
      questionsDeclined: []
    }].concat(['Purpose', 'Values', 'Mission', 'Strategy'].map(plain)),
    style: [{ key: 'voice', options: [{ id: 'ws-style-voice-we', value: 'we', instruction: 'Speak as "we".', source: 'inherited', changedAbove: false }] }],
    limits: { maxDefinition: 600, maxQuestion: 300, maxRule: 800, maxInstruction: 400, minWords: 10, maxWords: 120 }
  }
}

function fetchMock () {
  return jest.fn((url) => {
    const body = String(url).endsWith('/history') ? { history: [] } : content()
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
  })
}

async function settle (wrapper) {
  for (let i = 0; i < 6; i++) { await wrapper.vm.$nextTick(); await Promise.resolve() }
}

function lastSent () {
  const call = global.fetch.mock.calls.filter(c => c[1] && c[1].method !== 'GET').pop()
  return { method: call[1].method, path: String(call[0]), body: JSON.parse(call[1].body) }
}

const rowWith = (wrapper, text) => wrapper.findAll('.fwr').filter(r => r.text().includes(text)).at(0)
const buttonIn = (row, key) => row.findAll('button').filter(b => b.text() === 'growthAspectQuestions.buttons.' + key)

let wrapper
beforeEach(async () => {
  global.fetch = fetchMock()
  wrapper = mountWithBuefy(FirmWordsmith, { propsData: { apiToken: 'tok-1' } })
  await settle(wrapper)
})

test('the last Alignment document row cannot be switched off; a best-practice row can', () => {
  expect(buttonIn(rowWith(wrapper, 'Only alignment row'), 'switchOff').at(0).attributes('disabled')).toBeDefined()
  expect(buttonIn(rowWith(wrapper, 'Best practice row'), 'switchOff').at(0).attributes('disabled')).toBeUndefined()
})

test('switching a row off names the statement, the part and the row — and no scope', async () => {
  await buttonIn(rowWith(wrapper, 'Best practice row'), 'switchOff').at(0).trigger('click')
  await settle(wrapper)
  const sent = lastSent()
  expect(sent).toMatchObject({ method: 'POST', path: '/api/firm-manager/wordsmith/rows/off' })
  expect(sent.body).toEqual({ statement: 'Vision', part: 'definition', id: 'ws-vision-d2', off: true })
})

test('Keep mine on the rewritten rule keeps it, as its own request', async () => {
  await buttonIn(rowWith(wrapper, 'Ours.'), 'keepMine').at(0).trigger('click')
  await settle(wrapper)
  expect(lastSent()).toMatchObject({ path: '/api/firm-manager/wordsmith/value/keep-mine', body: { statement: 'Vision', field: 'rule' } })
})

test('🔴 a style row offers only Edit — never Switch off or Remove — and its action carries no statement', async () => {
  wrapper.vm.choose('__style__')
  await settle(wrapper)
  const row = rowWith(wrapper, 'Speak as')
  expect(buttonIn(row, 'switchOff')).toHaveLength(0)
  expect(buttonIn(row, 'remove')).toHaveLength(0)
  await wrapper.vm.send('PUT', 'style', { id: 'ws-style-voice-we', instruction: 'New.' }, true)
  expect(lastSent()).toMatchObject({ method: 'PUT', path: '/api/firm-manager/wordsmith/style', body: { id: 'ws-style-voice-we', instruction: 'New.' } })
  expect(lastSent().body).not.toHaveProperty('statement')
})
