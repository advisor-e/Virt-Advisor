/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * NOT A GUARD — a LOOK. Run on demand to read both currency screens' real text:
 *
 *   npx jest tests/unit/firmCurrencyRender.manual.test.js
 *
 * Item 13.3 put the picker in two places (Mike, 2026-09-23): the Hub SETS it, the Model
 * Library SHOWS it. Two screens carrying one setting is exactly where wording drifts
 * apart, and neither half is visible to the other's test. This prints both so a person
 * can read them side by side.
 *
 * It mounts with the REAL locale file, because the shared helper's `$t` returns the key
 * rather than English — correct for every other component test under Mike's 2026-08-24
 * ruling, and exactly the wrong tool for reading a screen.
 */
const { mountWithBuefy } = require('../helpers/mountComponent')
const EN = require('../../locales/en.json')
const FirmCurrency = require('~/components/firm/FirmCurrency.vue').default

/**
 * The real `$t`: walk the dotted key into the locale file, or return the key itself
 * when there is none — which is what a manager would see if a string were missing.
 *
 * @param {string} key - dotted i18n key
 * @param {object} [params] - interpolation values
 * @returns {string}
 */
function realT (key, params) {
  const found = String(key).split('.')
    .reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), EN)
  if (!found) { return key }
  return String(found).replace(/\{(\w+)\}/g, (m, k) => (params && params[k] !== undefined ? params[k] : m))
}

function respond (body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
}

afterEach(() => { delete global.fetch })

it('prints the Hub picker a manager actually reads', async () => {
  global.fetch = jest.fn(() => respond({ currency: 'NZD', isDefault: false }))
  const wrapper = mountWithBuefy(FirmCurrency, {
    propsData: { apiToken: 'tok' },
    mocks: { $t: realT }
  })
  for (let i = 0; i < 8; i++) { await wrapper.vm.$nextTick() }

  // eslint-disable-next-line no-console
  console.log('\n===== HUB: CURRENCY TAB (firm has chosen) =====\n' + wrapper.text() + '\n=====')

  expect(wrapper.text()).not.toMatch(/firmCurrency\.[a-zA-Z]/)
})

it('prints the Hub picker when the firm has chosen nothing', async () => {
  global.fetch = jest.fn(() => respond({ currency: 'NZD', isDefault: true }))
  const wrapper = mountWithBuefy(FirmCurrency, {
    propsData: { apiToken: 'tok' },
    mocks: { $t: realT }
  })
  for (let i = 0; i < 8; i++) { await wrapper.vm.$nextTick() }

  // eslint-disable-next-line no-console
  console.log('\n===== HUB: CURRENCY TAB (on the platform default) =====\n' + wrapper.text() + '\n=====')

  expect(wrapper.text()).not.toMatch(/firmCurrency\.[a-zA-Z]/)
})

it('prints the two sentences the Model Library shows, manager and advisor', () => {
  // The Model Library's own mount needs its whole catalogue; the two strings it now
  // chooses between are what changed, so they are read straight from the locale.
  // eslint-disable-next-line no-console
  console.log([
    '\n===== MODEL LIBRARY: the read-only line =====',
    'label:     ' + EN.modelLibrary.currency.label,
    'manager:   ' + EN.modelLibrary.currency.setInHub,
    'advisor:   ' + EN.modelLibrary.currency.managedNote,
    'both see:  ' + EN.modelLibrary.currency.relabelNote,
    '====='
  ].join('\n'))

  // A manager told to visit a hub they cannot open, or an advisor told to change
  // something they may not, would each be worse than saying nothing.
  expect(EN.modelLibrary.currency.setInHub).toMatch(/Firm Manager Hub/)
  expect(EN.modelLibrary.currency.managedNote).not.toMatch(/Hub/)
})
