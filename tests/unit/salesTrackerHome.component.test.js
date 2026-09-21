/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The Sales Tracker landing page — item 17 stage 4, the advisor's doorway.
 *
 * WHAT IS WORTH ASSERTING HERE. A tester opening this page sees three cards in five
 * seconds and judges the wording better than an assertion can. What they CANNOT see:
 *
 *   1. That the two MANAGER screens are absent. A tester signed in as a manager would
 *      find a link to them perfectly reasonable — and every advisor would then meet a
 *      403 behind it.
 *   2. That every card points at an address that exists. A typo in a route renders as
 *      a perfectly ordinary-looking card.
 *   3. That this page stays the single doorway the master team links to, so adding a
 *      screen later changes this file and never their link.
 */

const fs = require('fs')
const path = require('path')
const { mountWithBuefy } = require('../helpers/mountComponent')
const SalesTrackerHome = require('../../components/sales/SalesTrackerHome.vue').default

/** Every `pages/*.vue` file, as the routes Nuxt will generate from them. */
function existingRoutes () {
  return fs.readdirSync(path.join(__dirname, '../../pages'))
    .filter(f => f.endsWith('.vue'))
    .map(f => '/' + f.replace(/\.vue$/, ''))
}

function mountHome () {
  return mountWithBuefy(SalesTrackerHome, {
    stubs: { 'nuxt-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } }
  })
}

describe('the advisor doorway', () => {
  test('offers the four advisor screens', () => {
    const routes = mountHome().vm.cards.map(c => c.route)
    expect(routes).toEqual([
      '/sales-pipeline', '/sales-coi', '/sales-tracker-dashboard', '/sales-blog'
    ])
  })

  test('🔴 every card points at a page that actually exists', () => {
    // A typo in a route renders as an ordinary-looking card and 404s on click.
    const pages = existingRoutes()
    for (const card of mountHome().vm.cards) {
      expect(pages).toContain(card.route)
    }
  })

  test('🔴 the MANAGER screens are NOT offered — they would 403 for every advisor', () => {
    // /sales-team and /sales-lists sit behind requireManagerRole. A link here would
    // hand every advisor a door that refuses them.
    const routes = mountHome().vm.cards.map(c => c.route)
    expect(routes).not.toContain('/sales-team')
    expect(routes).not.toContain('/sales-lists')
  })

  test('renders one clickable card per screen', () => {
    const links = mountHome().findAll('a.sth-card')
    expect(links).toHaveLength(4)
  })

  test('🔴 every card draws its own icon — none falls through to another screen\'s', () => {
    // The icons are a `v-if` chain on `card.icon`, and the last branch used to be
    // a bare `v-else`. A fourth card added without its own branch would silently
    // wear the dashboard's bar chart, which looks deliberate and is not.
    const shapes = mountHome().findAll('.sth-ico svg').wrappers
      .map(w => w.html().replace(/\s+/g, ' '))
    expect(new Set(shapes).size).toBe(shapes.length)
  })

  test('🔴 the doorway the master team links to is /sales-tracker, and it exists', () => {
    // Mike, 2026-09-22: they place ONE link, and everything below is reachable. If
    // this page is ever renamed, their link breaks — so it is pinned by name here
    // and the reason is stated in design/features/sales-tracker.md §13.
    expect(existingRoutes()).toContain('/sales-tracker')
  })

  test('the page holds no access logic — the backend is the boundary', () => {
    const src = fs.readFileSync(
      require.resolve('../../components/sales/SalesTrackerHome.vue'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter(l => !/^\s*(\/\/|\/\/-)/.test(l))
      .join('\n')
    expect(src).not.toMatch(/userRole|isManager|role\s*===/)
  })
})
