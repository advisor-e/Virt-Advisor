/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * NOT A GUARD — a LOOK. Run on demand to read the screen's real rendered text:
 *
 *   npx jest tests/unit/modelChoicesRender.manual.test.js
 *
 * Playwright is not installed in this repo (only the Collaborate project has it), so
 * this stands in for the browser pass the run-the-app skill would otherwise do: it
 * mounts the real component against the real shape the route returns and prints what
 * a manager would read. It asserts almost nothing on purpose — the whole point is that
 * a PERSON reads the output, which is exactly the class of fault Mike's 2026-08-24
 * ruling says a test must not try to own.
 */
const { mountWithBuefy } = require('../helpers/mountComponent')
const EN = require('../../locales/en.json')
const MentorModelChoices = require('~/components/mentor/MentorModelChoices.vue').default

// 🔴 THE SHARED HELPER'S `$t` RETURNS THE KEY, NOT ENGLISH, AND THAT IS DELIBERATE —
// every other component test asserts on WHICH message shows, not its wording (Mike's
// 2026-08-24 ruling). So the helper's stub is exactly the wrong tool for a look at the
// real screen: it renders a page of keys whatever the locale file says.
//
// This file therefore mounts with the REAL locale file (`EN`, imported above), which is
// the only way to see what a manager reads. Nothing else in the suite does this, and
// nothing else should: it is a look, not a guard.

/**
 * The real `$t` behaviour for this one file: walk the dotted key into locales/en.json
 * and return the English, or the key itself when there is none — which is precisely
 * what a manager would see on screen if a string were missing.
 *
 * @param {string} key - dotted i18n key
 * @returns {string}
 */
function realT (key) {
  return String(key).split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), EN) || key
}

// Verbatim from a live GET /api/model-choices on this machine, 2026-09-23.
const LIVE = {
  success: true,
  scopeId: '__platform__',
  tier: 'mentor',
  awaitingFirms: false,
  totals: { named: 7, declined: 3, viaProse: 1 },
  pairings: [
    { domain: 'financial management', route: '/three-way-forecast', model: '3-Way Forecast Filter', count: 2 },
    { domain: 'profitability and feasibility', route: '/margin-breakeven', model: 'Margin · Mark-up · Break-even', count: 2 },
    { domain: 'governance and leadership', route: '/three-way-forecast', model: '3-Way Forecast Filter', count: 1 },
    { domain: 'financial management', route: '/debtor-drag', model: 'Debtor Business Drag', count: 1 },
    { domain: 'valuation', route: '/ebitda-dcf', model: 'EBITDA & Discounted Cash Flow', count: 1 }
  ],
  declines: [
    { domain: 'governance and leadership', count: 1 },
    { domain: 'conflict and conflict meetings', count: 1 },
    { domain: 'firm management coaching and culture', count: 1 }
  ],
  rows: [
    { at: '2026-09-15T04:04:00.000Z', firmId: 'dev-firm-001', advisorId: 'adv-okafor', advisorName: 'D. Okafor', domain: 'financial management', route: '/three-way-forecast', model: '3-Way Forecast Filter', declined: false, source: 'declared', phase: 'discover' },
    { at: '2026-09-15T03:41:00.000Z', firmId: 'dev-firm-001', advisorId: 'adv-marchetti', advisorName: 'S. Marchetti', domain: 'governance and leadership', route: null, model: null, declined: true, source: 'declared', phase: 'discover' },
    { at: '2026-09-14T23:58:00.000Z', firmId: 'dev-firm-001', advisorId: 'adv-boateng', advisorName: 'A. Boateng', domain: 'profitability and feasibility', route: '/margin-breakeven', model: 'Margin · Mark-up · Break-even', declined: false, source: 'prose', phase: 'recommendation' }
  ],
  timestamp: '2026-09-22T21:30:03.722Z'
}

it('prints what a manager actually reads', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(LIVE) }))
  const wrapper = mountWithBuefy(MentorModelChoices, {
    propsData: { apiToken: 'tok' },
    mocks: { $t: realT }
  })
  for (let i = 0; i < 8; i++) { await wrapper.vm.$nextTick() }

  // eslint-disable-next-line no-console
  console.log('\n===== MODEL CHOICES, AS RENDERED =====\n' + wrapper.text() + '\n=====')

  // The one thing worth asserting here: no untranslated key reached the screen.
  // That is the 2026-09-09 Template Check fault (`templateCheck.filter.all (62)`),
  // and it is invisible to every other test in the suite.
  expect(wrapper.text()).not.toMatch(/modelChoices\.[a-zA-Z]/)
  delete global.fetch
})
