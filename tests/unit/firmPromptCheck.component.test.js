/**
 * @jest-environment jsdom
 */
'use strict'

// The Share-a-prompt panel as a firm manager meets it — item 4.31, steps 1–2.
//
// 🔴 WHY THIS FILE EXISTS. Two things here are invisible to a person in UAT:
//
//   1. THE PANEL COMPILES AT ALL. Nothing else in the suite renders this component, so a
//      Pug indentation slip would first surface during `nuxt build` on the master team's
//      side — the gate this repository does not run (CLAUDE.md → Enforcement).
//   2. EVERY REFUSAL KIND THE BACKEND CAN SEND HAS A MESSAGE HERE. A kind with no branch
//      would render an empty red box, and an empty red box is indistinguishable from a
//      broken page. The mapping is checked by KIND, never by the sentence it produces —
//      the words are a person's job to judge.
//
// ⚠ ALSO PINNED: that a refusal never happens without the manager having asked. The
// component must not set `removeInvisible` on its own, because the design's rule is that
// a refusal is shown and never silently worked around.

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmPromptCheck = require('../../components/firm/FirmPromptCheck.vue').default

/** Mount the panel with the backend answering however this test needs. */
function mountPanel (answer) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(answer || { ok: true, refusal: null, cleared: true, limit: 6000 })
  }))
  return mountWithBuefy(FirmPromptCheck, { propsData: { apiToken: 'test-token' } })
}

/** The body of the single fetch the panel made. */
function sentBody () {
  return JSON.parse(global.fetch.mock.calls[0][1].body)
}

afterEach(() => { delete global.fetch })

describe('the panel a manager opens', () => {
  it('renders with an empty box and nothing to say yet', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.vm.view).toBeNull()
    expect(wrapper.vm.cleared).toBe(false)
  })

  it('will not check an empty box', () => {
    const wrapper = mountPanel()
    expect(wrapper.vm.canCheck).toBe(false)
    wrapper.vm.text = '   '
    expect(wrapper.vm.canCheck).toBe(false)
  })

  it('🔴 has no second door — Lane B is step 4 and is not built', () => {
    // The mockup drew two cards. If a second lane ever appears in this component
    // without the design's step 4 being done, this is what notices.
    const html = mountPanel().html()
    expect(html).not.toContain('lane')
  })
})

describe('every refusal the backend can send has a message', () => {
  const KINDS = [
    { kind: 'length', characters: 21000, limit: 6000 },
    { kind: 'fence', line: 31, quote: '<<<ADVISOR_DATA' },
    { kind: 'invisible', line: 6, count: 3 },
    { kind: 'secret', line: 9, quote: 'sk-live-…' },
    { kind: 'link', variant: 'web', line: 14, quote: 'https://example.com/x' },
    { kind: 'link', variant: 'email', line: 14, quote: 'a@example.com' },
    { kind: 'personal', variant: 'address', line: 12, quote: 'Mrs Kerr, 14 Rosewood Terrace' },
    { kind: 'personal', variant: 'taxNumber', line: 12, quote: '123-456-789' },
    { kind: 'personal', variant: 'name', line: 12, quote: 'Mrs Alison Kerr' }
  ]

  KINDS.forEach((refusal) => {
    const label = refusal.kind + (refusal.variant ? '/' + refusal.variant : '')

    it(`describes a ${label} refusal completely`, async () => {
      const wrapper = mountPanel({ ok: false, refusal, cleared: false, limit: 6000 })
      wrapper.vm.text = 'anything'
      await wrapper.vm.check(false)

      const view = wrapper.vm.view
      expect(view).not.toBeNull()
      // Every part of the three-part shape is filled, and the button says something.
      expect(view.heading).toBeTruthy()
      expect(view.found).toBeTruthy()
      expect(view.why).toBeTruthy()
      expect(view.todo).toBeTruthy()
      expect(view.againLabel).toBeTruthy()
      expect(wrapper.vm.failed).toBe(false)
    })
  })

  it('a length limit is toned as a limit, and the five refusals as refusals', async () => {
    // The two must not look the same: telling somebody who wrote nine pages that we
    // "have not included this" accuses them of something they did not do.
    const limit = mountPanel({ ok: false, refusal: KINDS[0], cleared: false, limit: 6000 })
    limit.vm.text = 'x'
    await limit.vm.check(false)
    expect(limit.vm.view.tone).toBe('is-limit')

    const stop = mountPanel({ ok: false, refusal: KINDS[1], cleared: false, limit: 6000 })
    stop.vm.text = 'x'
    await stop.vm.check(false)
    expect(stop.vm.view.tone).toBe('is-stop')
  })

  it('🔴 says the check failed rather than showing an empty box it cannot describe', async () => {
    const wrapper = mountPanel({
      ok: false, refusal: { kind: 'something-new', line: 1 }, cleared: false, limit: 6000
    })
    wrapper.vm.text = 'anything'
    await wrapper.vm.check(false)

    expect(wrapper.vm.view).toBeNull()
    expect(wrapper.vm.failed).toBe(true)
  })
})

describe('removing invisible characters is the manager\'s decision', () => {
  it('🔴 never asks for removal on its own', async () => {
    const wrapper = mountPanel()
    wrapper.vm.text = 'ordinary prompt'
    await wrapper.vm.check(false)
    expect(sentBody().removeInvisible).toBe(false)
  })

  it('asks only after the button on the refusal is pressed', async () => {
    const wrapper = mountPanel({
      ok: false,
      refusal: { kind: 'invisible', line: 6, count: 3 },
      cleared: false,
      limit: 6000
    })
    wrapper.vm.text = 'has hidden characters'
    await wrapper.vm.check(false)
    expect(wrapper.vm.view.again).toBe('strip')

    global.fetch.mockClear()
    global.fetch.mockImplementation(() => Promise.resolve({
      ok: true, json: () => Promise.resolve({ ok: true, refusal: null, cleared: true, limit: 6000 })
    }))
    await wrapper.vm.act()
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).removeInvisible).toBe(true)
  })

  it('does not rewrite the manager\'s own words in the browser', async () => {
    const dirty = 'keep this exactly'
    const wrapper = mountPanel({
      ok: false, refusal: { kind: 'invisible', line: 1, count: 1 }, cleared: false, limit: 6000
    })
    wrapper.vm.text = dirty
    await wrapper.vm.check(false)
    await wrapper.vm.act()
    expect(wrapper.vm.text).toBe(dirty)
  })
})

describe('the route back to a person', () => {
  const REFUSED = {
    ok: false,
    refusal: { kind: 'link', variant: 'web', line: 1, quote: 'https://x.com' },
    cleared: false,
    limit: 6000,
    contactEmail: 'someone@advisor-e.com'
  }

  it('🔴 offers a real mail link, not a button that only reveals a sentence', async () => {
    const wrapper = mountPanel(REFUSED)
    wrapper.vm.text = 'https://x.com'
    await wrapper.vm.check(false)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.contactHref).toContain('mailto:someone@advisor-e.com')
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(true)
  })

  it('uses whatever address the backend sends, so one file governs it', async () => {
    const wrapper = mountPanel(Object.assign({}, REFUSED, { contactEmail: 'other@advisor-e.com' }))
    wrapper.vm.text = 'x'
    await wrapper.vm.check(false)
    expect(wrapper.vm.contactHref).toContain('mailto:other@advisor-e.com')
  })

  it('🔴 never pre-fills the mail with the prompt itself', async () => {
    // It may hold the very client details we just refused. Putting them in a mail body
    // moves the problem into somebody's outbox rather than solving it.
    const wrapper = mountPanel(REFUSED)
    wrapper.vm.text = 'Mrs Alison Kerr, 14 Rosewood Terrace'
    await wrapper.vm.check(false)
    expect(wrapper.vm.contactHref).not.toContain('Rosewood')
    expect(wrapper.vm.contactHref).not.toContain('body=')
  })

  it('draws no mail button before an address has arrived', async () => {
    const wrapper = mountPanel(Object.assign({}, REFUSED, { contactEmail: undefined }))
    wrapper.vm.text = 'x'
    await wrapper.vm.check(false)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false)
  })
})

describe('a verdict belongs to the text it was given', () => {
  it('clears the message the moment the manager edits', async () => {
    const wrapper = mountPanel({
      ok: false,
      refusal: { kind: 'link', variant: 'web', line: 1, quote: 'https://x.com' },
      cleared: false,
      limit: 6000
    })
    wrapper.vm.text = 'https://x.com'
    await wrapper.vm.check(false)
    expect(wrapper.vm.view).not.toBeNull()

    wrapper.vm.text = 'https://x.com edited'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.view).toBeNull()
    expect(wrapper.vm.cleared).toBe(false)
  })

  it('forgets a removal consent when the text changes', async () => {
    // Consent is held as the TEXT it was given for, not as a flag a watcher clears.
    // A flag raced the check that set it: Vue 2 runs watchers on the next tick, so a
    // press following a keystroke closely enough lost the consent it had just been
    // given. This test is what found that.
    const wrapper = mountPanel()
    wrapper.vm.text = 'first'
    await wrapper.vm.check(true)
    expect(wrapper.vm.consentFor).toBe('first')

    wrapper.vm.text = 'second'
    await wrapper.vm.$nextTick()
    global.fetch.mockClear()
    await wrapper.vm.check(false)
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).removeInvisible).toBe(false)
  })
})

describe('when the backend cannot answer', () => {
  it('says so instead of leaving the manager waiting', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network down')))
    const wrapper = mountWithBuefy(FirmPromptCheck, { propsData: { apiToken: 't' } })
    wrapper.vm.text = 'anything'
    await wrapper.vm.check(false)
    expect(wrapper.vm.failed).toBe(true)
    expect(wrapper.vm.checking).toBe(false)
  })
})
