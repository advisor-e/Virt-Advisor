/**
 * @jest-environment jsdom
 */
'use strict'

// The Education Gate tab as a manager actually meets it — item 2.9.
//
// 🔴 WHY THE FIRST BLOCK EXISTS, in one sentence: on 2026-08-24 this tab shipped with two
// labels rendering as `firmEducationGate.option.education_first` — the raw translation key,
// on screen, where a button name should be — and **6,212 passing tests did not notice**.
// It was found by opening the page and looking at it.
//
// The cause is a vue-i18n rule, not a typo. A key written FLAT with a dot in it
// (`"option.education_first": "…"`) is looked up as a NESTED PATH, so it never resolves and
// vue-i18n renders the key itself. Nothing throws. The screen just reads as broken.
//
// ⚠ AND A COMPONENT TEST CANNOT CATCH IT BY RENDERING. `tests/helpers/mountComponent.js`
// gives every test a `$t()` that returns the KEY on purpose, so assertions pin WHICH
// message a screen shows rather than its English. Under that stub a key that resolves and
// a key that does not look exactly the same. Fighting that convention here would trade a
// good rule for one bug.
//
// So the guard is on the LOCALE FILE instead: every key this component asks for is
// resolved the way vue-i18n resolves it — splitting on dots, walking the object — and must
// arrive at a string. That catches the whole class, including the dynamic `option.<value>`
// keys, and it would have caught this one.
//
// The screen is checked against `design/mockups/education-gate.html`; every difference
// between the drawing and the build is named in `design/EDUCATION-GATE.md` §9.

const fs = require('fs')
const path = require('path')
const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmEducationGate = require('../../components/firm/FirmEducationGate.vue').default
const { BASE_GATE } = require('../../server/utils/educationGate')
const messages = require('../../locales/en.json')

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'firm', 'FirmEducationGate.vue'), 'utf8'
)

/**
 * Resolve a key the way vue-i18n does: dots are a path through the object, never part of
 * a key name.
 *
 * @param {string} key - e.g. `firmEducationGate.option.technical`
 * @returns {*} the value found, or undefined
 */
function resolve (key) {
  return key.split('.').reduce(
    (node, part) => (node === null || node === undefined ? undefined : node[part]),
    messages
  )
}

describe('🔴 every message this tab asks for actually resolves', () => {
  const allKeys = Array.from(new Set(
    (SOURCE.match(/\$t\('([^']+)'/g) || []).map(m => m.slice(4, -1))
  )).filter(k => k.indexOf('firmEducationGate.') === 0)

  // A key ending in a dot is not a key — it is the literal half of a key built at runtime
  // (`$t('…option.' + option.value)`). Those are checked below against the shipped answers.
  const prefixes = allKeys.filter(k => k.slice(-1) === '.')
  const staticKeys = allKeys.filter(k => k.slice(-1) !== '.')

  test('only ONE key is built at runtime, and it is the one we think it is', () => {
    // The exclusion above must not become a place a broken key can hide. If a second
    // dynamic key appears, this fails until it is given its own check.
    expect(prefixes).toEqual(['firmEducationGate.option.'])
  })

  test('the component does ask for messages, so an empty sweep cannot pass silently', () => {
    // Without this, renaming the prefix would empty the list below and every test in it
    // would pass by having nothing to check.
    expect(staticKeys.length).toBeGreaterThan(15)
  })

  test.each(staticKeys)('%s resolves to a string', (key) => {
    expect(typeof resolve(key)).toBe('string')
  })

  test.each(BASE_GATE.options.map(o => o.value))(
    'the DYNAMIC key for answer "%s" resolves — this is the one that shipped broken',
    (value) => {
      // Built at runtime as `$t('firmEducationGate.option.' + option.value)`, so no static
      // sweep can see it. It is derived from the shipped options here for the same reason:
      // a third answer could never be added without this failing first.
      expect(typeof resolve('firmEducationGate.option.' + value)).toBe('string')
    }
  )
})

/**
 * Mount the tab with the backend answering exactly as the real route does.
 *
 * @param {object} [own] - what this tier has set itself
 * @returns {Promise<object>} the mounted wrapper
 */
async function mountTab (own) {
  const ownValue = own || {}
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      tier: 'mentor',
      gate: BASE_GATE,
      own: ownValue,
      hasOwn: Object.keys(ownValue).length > 0,
      inherited: BASE_GATE,
      platform: BASE_GATE
    })
  }))
  const wrapper = mountWithBuefy(FirmEducationGate, { propsData: { apiToken: 'test-token' } })
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('the Education Gate tab', () => {
  test("shows the advisor-facing question, in Mike's approved words", async () => {
    const wrapper = await mountTab()
    expect(wrapper.find('textarea').element.value)
      .toContain('may not yet be comfortable reading their own numbers')
  })

  test('puts each answer\'s LABEL in an editable box — the values are not the manager\'s business', async () => {
    const wrapper = await mountTab()
    const values = wrapper.findAll('input').wrappers.map(i => i.element.value)
    expect(values).toContain('Education first')
    expect(values).toContain("What's technically needed")
  })

  test('renders the four editable blocks the design names', async () => {
    // §9 of the design records that the build has FOUR where the drawing had three — the
    // reason line was made editable. If that block disappears, the one sentence the
    // 2026-07-16 ruling actually requires becomes the only thing nobody can change.
    const wrapper = await mountTab()
    expect(wrapper.findAll('.feg-block')).toHaveLength(4)
  })

  test('renders one row per shipped phrase, each removable', async () => {
    const wrapper = await mountTab()
    expect(wrapper.findAll('.feg-phrase')).toHaveLength(BASE_GATE.phrases.length)
  })

  test('marks every field inherited when this tier has set nothing', async () => {
    const wrapper = await mountTab()
    const tags = wrapper.findAll('.tag').wrappers.map(t => t.text())
    expect(tags).toEqual(new Array(4).fill('firmEducationGate.inherited'))
  })

  test('marks ONLY the field this tier actually set as set-here', async () => {
    // The distinction is the point: an inherited field keeps receiving the level above's
    // corrections, one set here does not.
    const wrapper = await mountTab({ question: 'Ours?' })
    const tags = wrapper.findAll('.tag').wrappers.map(t => t.text())
    expect(tags[0]).toBe('firmEducationGate.setHere')
    expect(tags.slice(1)).toEqual(new Array(3).fill('firmEducationGate.inherited'))
  })

  test('sends only what THIS tier changed, so the level above keeps correcting the rest', async () => {
    const wrapper = await mountTab()
    wrapper.vm.form.question = 'A different question?'
    expect(wrapper.vm.payload()).toEqual({ question: 'A different question?' })
  })

  test('sends nothing at all when nothing was changed', async () => {
    const wrapper = await mountTab()
    expect(wrapper.vm.payload()).toEqual({})
  })

  test('drops blank phrase rows on the way out rather than storing them', async () => {
    const wrapper = await mountTab()
    wrapper.vm.form.phrases = ['chasing turnover', '   ', 'new one']
    expect(wrapper.vm.payload().phrases).toEqual(['chasing turnover', 'new one'])
  })

  test('warns — but does not block — when the reason line loses its {phrase}', async () => {
    const wrapper = await mountTab()
    expect(wrapper.vm.reasonMissingPlaceholder).toBe(false)
    wrapper.vm.form.reason = 'Because we said so.'
    expect(wrapper.vm.reasonMissingPlaceholder).toBe(true)
    // Empty is a legitimate choice — the backend drops the sentence rather than printing a
    // literal placeholder — so it must not warn.
    wrapper.vm.form.reason = ''
    expect(wrapper.vm.reasonMissingPlaceholder).toBe(false)
  })

  test('says so plainly when the tab cannot load, rather than showing an empty screen', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: { message: 'Could not read the education gate' } })
    }))
    const wrapper = mountWithBuefy(FirmEducationGate, { propsData: { apiToken: 'test-token' } })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('firmEducationGate.loadFailed')
    expect(wrapper.text()).toContain('Could not read the education gate')
    expect(wrapper.findAll('.feg-block')).toHaveLength(0)
  })
})
