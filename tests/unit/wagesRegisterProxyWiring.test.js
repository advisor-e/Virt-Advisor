'use strict'

const fs = require('fs')
const path = require('path')

/**
 * The staff-register gate must reach the backend the same way everything else does.
 *
 * WHY THIS TEST EXISTS, and why it is not the "file exists" kind the standards ban: reaching
 * the backend is a property of TWO files that are never open at the same time. A route can be
 * registered and serving while `nuxt.config.js` has no line for its path, and then every call
 * from the browser is a Nuxt 404 with nothing wrong on either side to see. That has happened
 * THREE times in this repository — Meeting Review's three slices, then Client Copy Request and
 * Compliance on 2026-09-11, the second of which failed CLOSED and so looked like a working
 * gate that simply never opened. This gate fails closed too, in exactly the same way: an
 * unproxied check would leave every advisor looking at a register that is never available,
 * whatever their client's case says.
 */
const root = path.join(__dirname, '../../')
const read = f => fs.readFileSync(path.join(root, f), 'utf8')

describe('the staff-register gate — reaching the backend', () => {
  it('never hardcodes a backend host in the browser bundle', () => {
    expect(read('utils/wagesRegister.js')).not.toMatch(/https?:\/\/localhost/)
  })

  it('calls the proxy path', () => {
    expect(read('utils/wagesRegister.js')).toMatch(/fetch\(['`]\/api\/wages-register/)
  })

  it('has /api/wages-register registered on the Nuxt proxy, through the shared thin proxy', () => {
    const cfg = read('nuxt.config.js')
    const line = cfg.split('\n').find(l => l.includes("path: '/api/wages-register'"))
    expect(line).toBeDefined()
    expect(line).toContain('apiProxy.js')
  })

  it('has all three backend routes, and all behind firmAuth', () => {
    // firmAuth by name: a business-entity token is refused there. A client must never be
    // able to read — let alone open — a register of their own staff.
    const server = read('server/restify-server.js')
    expect(server).toMatch(/server\.get\('\/api\/wages-register\/gate\/:clientId', firmAuth/)
    expect(server).toMatch(/server\.post\('\/api\/wages-register\/gate\/:clientId\/open', firmAuth/)
    expect(server).toMatch(/server\.post\('\/api\/wages-register\/gate\/:clientId\/close', firmAuth/)
  })

  it('the page hands the chosen client to the gate, or the strip can never appear', () => {
    // The header already renders the client picker on every catalogue model; the gate is
    // useless until the page listens to it. Wiring, not wording.
    const page = read('pages/wages-review.vue')
    expect(page).toMatch(/@client-change="onClientChange"/)
    // The client is bound; the rest of the tag is free to grow. It did on 2026-09-15, when
    // `@gate="onGate"` was added so the register itself knows whether to render — and a
    // pattern ending in `)` failed on an addition it had no business guarding.
    expect(page).toMatch(/wages-register-gate\(:client-id="clientId"/)
  })

  it('the register itself is bound to the gate, and to step 1\'s team', () => {
    // 🔴 THE `v-if` IS THE WIRING THAT MATTERS. The register must be ABSENT unless the gate
    // said open — not hidden, absent — so that no employee data is rendered into a page not
    // entitled to show it. A `v-show` here would put names in the DOM behind CSS.
    const page = read('pages/wages-review.vue')
    expect(page).toMatch(/wages-register\(v-if="registerOpen"/)
    expect(page).not.toMatch(/wages-register\(v-show=/)
    expect(page).toMatch(/:team="registerTeam"/)
    expect(page).toMatch(/@gate="onGate"/)
    // 🔴 STEP 3 BEFORE STEP 1. Only step 3's people carry `payRise`, and leave is valued at
    // the rate including rises (Mike, 2026-09-15). Reading step 1 first would quietly price
    // every risen person at their old rate.
    expect(page).toMatch(/this\.year && this\.year\.people/)
  })

  it('the register\'s own routes are firmAuth and re-check the gate', () => {
    const server = read('server/restify-server.js')
    expect(server).toMatch(/server\.post\('\/api\/wages-register\/:clientId\/view', firmAuth/)
    expect(server).toMatch(/server\.put\('\/api\/wages-register\/:clientId', firmAuth/)
    // Both handlers resolve the gate before answering; the route test proves the behaviour,
    // this proves the seam exists at all.
    const routes = read('server/routes/wagesRegister.js')
    expect(routes).toMatch(/REGISTER_NOT_OPEN/)
  })
})
