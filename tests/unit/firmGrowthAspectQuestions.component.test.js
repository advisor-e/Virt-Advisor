/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The Mentor Hub's Growth Aspect Questions tab — item 15.2, screen 3.
 *
 * What UAT cannot see: the body the Save button sends. An edit made on one aspect that is
 * lost when another is selected, a question sent in the wrong order, or a save that goes out
 * without the aspects the mentor did not touch would all look like a successful save.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const { BASE_ASPECTS } = require('../../server/utils/growthAspects')
const FirmGrowthAspectQuestions = require('~/components/firm/FirmGrowthAspectQuestions.vue').default

const ASPECTS = BASE_ASPECTS.map(a => ({ name: a.name, description: a.description, questions: a.questions.slice() }))

function fetchMock (answers) {
  return jest.fn((url, opts) => {
    const key = ((opts && opts.method) || 'GET') + ' ' + String(url)
    const body = answers[key] || { history: [] }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
  })
}

async function settle (wrapper) {
  for (let i = 0; i < 6; i++) { await wrapper.vm.$nextTick(); await Promise.resolve() }
}

afterEach(() => { delete global.fetch })

describe('the Growth Aspect Questions tab', () => {
  test('🔴 Save sends all nine, with edits made on two different aspects both kept', async () => {
    global.fetch = fetchMock({
      'GET /api/firm-manager/growth-aspects': { aspects: ASPECTS },
      'POST /api/firm-manager/growth-aspects': { aspects: ASPECTS }
    })
    const wrapper = mountWithBuefy(FirmGrowthAspectQuestions, { propsData: { apiToken: 'tok-1' } })
    await settle(wrapper)
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-1')

    wrapper.vm.selected = 'Governance'
    wrapper.vm.current.description = 'Edited.'
    wrapper.vm.selected = 'Innovation'
    wrapper.vm.addQuestion()
    wrapper.vm.current.questions[wrapper.vm.current.questions.length - 1].text = 'A new one?'
    await wrapper.vm.save()

    const post = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST')
    const sent = JSON.parse(post[1].body).aspects
    expect(Object.keys(sent)).toEqual(ASPECTS.map(a => a.name))
    expect(sent.Governance.description).toBe('Edited.')
    expect(sent.Innovation.questions).toEqual(ASPECTS.find(a => a.name === 'Innovation').questions.concat(['A new one?']))
  })

  test('the last question of an aspect cannot be removed', async () => {
    const one = ASPECTS.map(a => (a.name === 'Governance' ? Object.assign({}, a, { questions: ['Only?'] }) : a))
    global.fetch = fetchMock({ 'GET /api/firm-manager/growth-aspects': { aspects: one } })
    const wrapper = mountWithBuefy(FirmGrowthAspectQuestions, { propsData: { apiToken: 'tok-1' } })
    await settle(wrapper)
    wrapper.vm.selected = 'Governance'
    await settle(wrapper)
    const remove = wrapper.findAll('button').filter(b => b.text() === 'growthAspectQuestions.buttons.remove')
    expect(remove).toHaveLength(1)
    expect(remove.at(0).attributes('disabled')).toBe('disabled')
  })

  test('shows who saved each version, and restores the one chosen', async () => {
    global.fetch = fetchMock({
      'GET /api/firm-manager/growth-aspects': { aspects: ASPECTS },
      'GET /api/firm-manager/growth-aspects/history': { history: [{ id: 5, version: 2, saved_by: 'mentor@x', created_at: '2026-09-28T00:00:00Z' }] },
      'POST /api/firm-manager/growth-aspects/restore': { restored: true, aspects: ASPECTS }
    })
    const wrapper = mountWithBuefy(FirmGrowthAspectQuestions, { propsData: { apiToken: 'tok-1' } })
    await settle(wrapper)
    expect(wrapper.text()).toContain('mentor@x')
    await wrapper.vm.restore(5)
    const post = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST')
    expect(JSON.parse(post[1].body)).toEqual({ versionId: 5 })
  })

  test('a refused save shows the backend’s reason and keeps the mentor’s edits', async () => {
    global.fetch = jest.fn((url, opts) => {
      if (opts && opts.method === 'POST') {
        return Promise.resolve({ ok: false, statusText: 'Bad Request', json: () => Promise.resolve({ error: { message: 'Governance: question 2 is blank' } }) })
      }
      const body = String(url).endsWith('/history') ? { history: [] } : { aspects: ASPECTS }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
    })
    const wrapper = mountWithBuefy(FirmGrowthAspectQuestions, { propsData: { apiToken: 'tok-1' } })
    await settle(wrapper)
    wrapper.vm.selected = 'Governance'
    wrapper.vm.current.description = 'Kept.'
    await wrapper.vm.save()
    expect(wrapper.vm.error).toBe('Governance: question 2 is blank')
    expect(wrapper.vm.current.description).toBe('Kept.')
  })
})
