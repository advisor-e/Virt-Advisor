/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmDomainSupport = require('~/components/firm/FirmDomainSupport.vue').default
const MethodGuidePanel = require('~/components/firm/MethodGuidePanel.vue').default

/**
 * The method-guide screen (to-do item 4.16 F, 2026-08-17).
 *
 * Approved artefact: design/METHOD-GUIDES-SCREEN.md · design/mockups/method-guides.html
 *
 * 🔴 THE CLAIM WORTH TESTING IS THAT THE SCREEN SHOWS WHAT THE AI READS, and the
 * only way to hold that is to render from the SAME walk the prompt is built from.
 * The panel is given `sections` (the walk) and `content` (what the walk addressed);
 * a test that fed it a hand-written field list would prove nothing about the prompt.
 *
 * ⚠ A guide with a section nobody anticipated must still render in full. That is
 * asserted here with an invented shape, because 35% of the 155,000 characters across
 * the thirteen sits in blocks unique to a single guide — a screen with a fixed set of
 * boxes would leave most of three guides invisible, which is this item's own fault
 * one level down.
 *
 * Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js).
 */

/** The domain list. `profit` carries two guides; `governance` carries none. */
function defaultList () {
  return {
    doTheJob: [
      { id: 'profit', label: 'Profitability', supportTools: 2, origin: 'platform' },
      { id: 'governance', label: 'Governance', supportTools: 1, origin: 'platform' }
    ],
    getTheJob: [],
    getOrganised: []
  }
}

/** The thirteen, as the list route serves them (trimmed to what these tests use). */
function guideList () {
  return {
    guides: [
      {
        id: 'facilitation_101',
        label: 'Facilitation 101',
        standing: true,
        rows: [],
        origin: 'platform'
      },
      {
        id: 'trial_fit',
        label: 'Trial Fit Method',
        standing: false,
        rows: [{ domain: 'profit', domainLabel: 'Profitability', material: 'Trial Fit Method' }],
        origin: 'platform'
      }
    ]
  }
}

function profitDetail () {
  return {
    domain: 'profit',
    label: 'profitability',
    materials: [
      { name: 'Trial Fit Method', summary: 'A revenue model built with the client.', who_when: 'Aware clients.', steps: ['Build it.'] },
      { name: 'A row with no guide behind it', summary: 'x', who_when: 'y', steps: ['z'] }
    ],
    guides: [{ id: 'trial_fit', label: 'Trial Fit Method', material: 'Trial Fit Method', alsoUsedBy: [] }]
  }
}

function governanceDetail () {
  return {
    domain: 'governance',
    label: 'governance',
    materials: [{ name: 'Board Charter', summary: 'x', who_when: 'y', steps: ['z'] }],
    guides: []
  }
}

/** One guide's detail: the walk, and the content it addresses. */
function trialFitGuideDetail (extra) {
  return Object.assign({
    id: 'trial_fit',
    label: 'Trial Fit Method',
    standing: false,
    description: 'The method for building a revenue model with the client in the room.',
    origin: 'platform',
    rows: [{ domain: 'profit', domainLabel: 'Profitability', material: 'Trial Fit Method' }],
    sections: [
      { kind: 'text', key: 'objective', label: 'Objective', path: ['objective'], value: 'The authored objective.' },
      {
        kind: 'items',
        key: 'stages',
        label: 'Stages',
        path: ['stages'],
        children: [
          {
            kind: 'group',
            key: 0,
            label: 'Stage 1: Building the model',
            path: ['stages', 0],
            children: [
              { kind: 'text', key: 'key_principle', label: 'Key principle', path: ['stages', 0, 'key_principle'], value: 'The authored principle.' },
              { kind: 'list', key: 'coaching_points', label: 'Coaching points', path: ['stages', 0, 'coaching_points'], values: ['The first coaching point.', 'The second coaching point.'] }
            ]
          }
        ]
      }
    ],
    content: {
      objective: 'The authored objective.',
      stages: [{ key_principle: 'The authored principle.', coaching_points: ['The first coaching point.', 'The second coaching point.'] }]
    }
  }, extra || {})
}

function stubFetch (routes) {
  global.fetch = jest.fn((url, opts) => {
    const u = String(url)
    let data = {}
    if (/\/method-guides\/[^/]+\/history/.test(u)) {
      data = { history: [] }
    } else if (/\/method-guides\/([^/?]+)$/.test(u)) {
      data = routes.guide || trialFitGuideDetail()
    } else if (/\/method-guides$/.test(u)) {
      data = routes.guides || guideList()
    } else if (/\/domain-support\/[^/]+\/history/.test(u)) {
      data = { history: [] }
    } else if (/\/domain-support\/([^/?]+)$/.test(u)) {
      const id = decodeURIComponent(u.match(/\/domain-support\/([^/?]+)$/)[1])
      data = (routes.details || {})[id] || {}
    } else if (/\/domain-support$/.test(u)) {
      data = routes.list || defaultList()
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data), _opts: opts })
  })
}

async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

async function mountTab (routes) {
  stubFetch(Object.assign({ details: { profit: profitDetail(), governance: governanceDetail() } }, routes || {}))
  const wrapper = mountWithBuefy(FirmDomainSupport, { propsData: { apiToken: 'test-token' } })
  await settle(wrapper)
  return wrapper
}

async function mountPanel (guide) {
  stubFetch({ guide })
  const wrapper = mountWithBuefy(MethodGuidePanel, {
    propsData: { apiToken: 'test-token', guideId: 'trial_fit', fromDomain: 'profit' }
  })
  await settle(wrapper)
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('the control on a framework row', () => {
  test('appears on the row its guide is mapped to, and nowhere else', async () => {
    const wrapper = await mountTab()
    await wrapper.vm.select({ id: 'profit', label: 'Profitability', origin: 'platform' })
    await settle(wrapper)

    // Mike's wording, 2026-08-17 (§6a option C).
    expect(wrapper.text()).toContain('firmDomainSupport.guideOpen')
    expect(wrapper.findAll('.ds-guide-open')).toHaveLength(1)
    expect(wrapper.vm.guideForMaterial('Trial Fit Method').id).toBe('trial_fit')
    expect(wrapper.vm.guideForMaterial('A row with no guide behind it')).toBeNull()
  })

  test('a domain with no guides shows no control at all — nothing is placed by guesswork', async () => {
    const wrapper = await mountTab()
    await wrapper.vm.select({ id: 'governance', label: 'Governance', origin: 'platform' })
    await settle(wrapper)
    expect(wrapper.findAll('.ds-guide-open')).toHaveLength(0)
  })

  test('opens and closes the guide, one at a time', async () => {
    const wrapper = await mountTab()
    await wrapper.vm.select({ id: 'profit', label: 'Profitability', origin: 'platform' })
    await settle(wrapper)

    wrapper.vm.toggleGuide('trial_fit')
    await settle(wrapper)
    expect(wrapper.vm.openGuideId).toBe('trial_fit')
    expect(wrapper.text()).toContain('firmDomainSupport.guideHeading')

    wrapper.vm.toggleGuide('trial_fit')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.openGuideId).toBeNull()
  })

  test('moving to another domain closes a guide rather than carrying it across', async () => {
    const wrapper = await mountTab()
    await wrapper.vm.select({ id: 'profit', label: 'Profitability', origin: 'platform' })
    await settle(wrapper)
    wrapper.vm.toggleGuide('trial_fit')
    await settle(wrapper)

    await wrapper.vm.select({ id: 'governance', label: 'Governance', origin: 'platform' })
    await settle(wrapper)
    expect(wrapper.vm.openGuideId).toBeNull()
  })
})

describe('the standing entry above the domains', () => {
  test('is shown, named "applies to every domain", and holds Facilitation 101', async () => {
    const wrapper = await mountTab()
    // Ruled by Mike 2026-08-17 (§6d option A). Facilitation 101 has no material row
    // in any of the 30 domain files; filing it under an arbitrary domain would put
    // it where nobody would look.
    expect(wrapper.text()).toContain('firmDomainSupport.guideStandingHeading')
    expect(wrapper.vm.standingGuides.map(g => g.id)).toEqual(['facilitation_101'])
    expect(wrapper.text()).toContain('Facilitation 101')
  })

  test('a domain with guides is marked in the rail, per the approved mockup', async () => {
    const wrapper = await mountTab()
    // Otherwise the rail gives no sign that 15,000 characters of coaching sit one
    // click inside that domain.
    expect(wrapper.vm.guideCountFor('profit')).toBe(1)
    expect(wrapper.vm.guideCountFor('governance')).toBe(0)
    expect(wrapper.text()).toContain('firmDomainSupport.guideTag')
  })

  test('opening it clears the domain panel, because it belongs to no domain', async () => {
    const wrapper = await mountTab()
    await wrapper.vm.select({ id: 'profit', label: 'Profitability', origin: 'platform' })
    await settle(wrapper)

    wrapper.vm.selectStandingGuide({ id: 'facilitation_101' })
    await settle(wrapper)
    expect(wrapper.vm.current).toBeNull()
    expect(wrapper.vm.openGuideId).toBe('facilitation_101')
    // And it does NOT render under another domain's materials table as though it
    // belonged there.
    expect(wrapper.vm.guideIsOnThisDomain).toBe(false)
  })
})

describe('the guide, opened', () => {
  test("carries Mike's heading, word for word", async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('firmDomainSupport.guideHeading')
  })

  test('renders every authored line the walk found, at any depth', async () => {
    const wrapper = await mountPanel()
    const values = wrapper.findAll('textarea').wrappers.map(w => w.element.value)
    expect(values).toContain('The authored objective.')
    expect(values).toContain('The authored principle.')
    // Nested inside an item inside a section — the shape a fixed set of boxes loses.
    expect(values).toContain('The first coaching point.')
    expect(values).toContain('The second coaching point.')
  })

  test('a section nobody anticipated still renders in full', async () => {
    const invented = trialFitGuideDetail({
      sections: [{
        kind: 'group',
        key: 'a_block_invented_today',
        label: 'A block invented today',
        path: ['a_block_invented_today'],
        children: [{
          kind: 'items',
          key: 'questions',
          label: 'Questions',
          path: ['a_block_invented_today', 'questions'],
          children: [{
            kind: 'group',
            key: 0,
            label: 'Disturb',
            path: ['a_block_invented_today', 'questions', 0],
            children: [{ kind: 'text', key: 'text', label: 'Text', path: ['a_block_invented_today', 'questions', 0, 'text'], value: 'A question four levels down.' }]
          }]
        }]
      }],
      content: { a_block_invented_today: { questions: [{ text: 'A question four levels down.' }] } }
    })
    const wrapper = await mountPanel(invented)
    const values = wrapper.findAll('textarea').wrappers.map(w => w.element.value)
    expect(values).toContain('A question four levels down.')
    expect(wrapper.text()).toContain('A block invented today')
  })

  test('says so where the same guide is shown on another domain page', async () => {
    const shared = trialFitGuideDetail({
      rows: [
        { domain: 'strategy', domainLabel: 'Strategy', material: 'Capacity, Capability, Opportunity' },
        { domain: 'get-positioning', domainLabel: 'positioning', material: 'Capacity, Capability, Opportunity (CCO)' }
      ]
    })
    stubFetch({ guide: shared })
    const wrapper = mountWithBuefy(MethodGuidePanel, {
      propsData: { apiToken: 't', guideId: 'capacity_capability_opportunity', fromDomain: 'strategy' }
    })
    await settle(wrapper)
    // Mike's wording, 2026-08-17 (§6c option A) — said WHERE THE EDIT HAPPENS, not
    // discovered afterwards.
    expect(wrapper.vm.sharedWith).toBe('positioning')
    expect(wrapper.text()).toContain('firmDomainSupport.guideShared')
  })

  test('says nothing about sharing when the guide belongs to one page', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.vm.sharedWith).toBe('')
    expect(wrapper.text()).not.toContain('firmDomainSupport.guideShared')
  })

  test('offers no way to add or remove anything — structure is fixed', async () => {
    const wrapper = await mountPanel()
    const labels = wrapper.findAll('button').wrappers.map(w => w.text().toLowerCase())
    expect(labels.some(t => t.includes('add'))).toBe(false)
    expect(labels.some(t => t.includes('remove'))).toBe(false)
  })
})

describe('editing a line', () => {
  test('lights up Save and posts the whole guide back', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.vm.dirty).toBe(false)

    wrapper.vm.applyChange({ path: ['stages', 0, 'coaching_points', 1], value: 'Our own second point.' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.dirty).toBe(true)
    // Written back into the copy the screen reads from, so what is saved is what
    // is on screen.
    expect(wrapper.vm.content.stages[0].coaching_points[1]).toBe('Our own second point.')

    await wrapper.vm.save()
    const post = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST')
    expect(post[0]).toBe('/api/firm-manager/method-guides/trial_fit')
    expect(JSON.parse(post[1].body).content.stages[0].coaching_points[1]).toBe('Our own second point.')
  })

  test('a failed load says so rather than rendering an empty guide', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'boom', json: () => Promise.resolve({}) }))
    const wrapper = mountWithBuefy(MethodGuidePanel, { propsData: { apiToken: 't', guideId: 'trial_fit' } })
    await settle(wrapper)
    expect(wrapper.text()).toContain('firmDomainSupport.guideLoadFailed')
  })

  test('Reset is offered only where this scope actually has its own wording', async () => {
    const inherited = await mountPanel()
    const resetBtn = inherited.findAll('button').wrappers.find(w => w.text().includes('firmDomainSupport.reset'))
    expect(resetBtn.attributes('disabled')).toBeTruthy()

    const own = await mountPanel(trialFitGuideDetail({ origin: 'firm' }))
    const ownReset = own.findAll('button').wrappers.find(w => w.text().includes('firmDomainSupport.reset'))
    expect(ownReset.attributes('disabled')).toBeFalsy()
  })
})
