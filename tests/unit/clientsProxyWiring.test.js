'use strict'

const fs = require('fs')
const path = require('path')

/**
 * The client register must reach the backend the same way everything else does.
 *
 * `utils/clients.js` hardcoded `http://localhost:4000`, so the feature only worked where
 * the browser and the Restify backend shared a host — fine on a developer laptop,
 * broken in UAT or production. And `/api/clients` was never registered on the Nuxt thin
 * proxy, so there was no route through for it to use even if it had asked for one.
 *
 * Two rules from CLAUDE.md → Architecture boundary are at stake:
 *   - "The frontend's only legitimate env variable is API_BASE_URL (the backend URL)" —
 *     the frontend is not supposed to know where the backend lives;
 *   - "The Nuxt server-middleware/ directory is a thin proxy — it forwards requests to
 *     Restify."
 *
 * Tripwires rather than behaviour tests: what matters is the WIRING, and wiring is a
 * property of these two files. A unit test that mocked fetch would pass regardless.
 */

const root = path.join(__dirname, '../../')
const read = f => fs.readFileSync(path.join(root, f), 'utf8')

describe('client register — reaching the backend', () => {
  it('never hardcodes a backend host in the browser bundle', () => {
    // The defect verbatim: an absolute URL that is only correct on one machine.
    expect(read('utils/clients.js')).not.toMatch(/https?:\/\/localhost/)
    expect(read('utils/clients.js')).not.toMatch(/https?:\/\/\d+\.\d+\.\d+\.\d+/)
  })

  it('calls the proxy path, like every other feature', () => {
    const src = read('utils/clients.js')
    expect(src).toMatch(/fetch\('\/api\/clients'/)
  })

  it('has /api/clients registered on the Nuxt proxy', () => {
    // Without this entry the calls above have no route through to Restify.
    const cfg = read('nuxt.config.js')
    expect(cfg).toMatch(/path: '\/api\/clients'/)
  })

  it('routes it through the shared thin proxy rather than bespoke middleware', () => {
    const cfg = read('nuxt.config.js')
    const line = cfg.split('\n').find(l => l.includes("path: '/api/clients'"))
    expect(line).toBeDefined()
    expect(line).toContain('apiProxy.js')
  })

  it('still has the backend routes it is proxying to', () => {
    // A proxy entry pointing at nothing would be worse than no entry.
    const server = read('server/restify-server.js')
    expect(server).toMatch(/server\.get\('\/api\/clients'/)
    expect(server).toMatch(/server\.post\('\/api\/clients'/)
  })

  it('keeps those routes behind firmAuth — they read a firm’s client list', () => {
    const server = read('server/restify-server.js')
    const lines = server.split('\n').filter(l => l.includes("'/api/clients"))
    expect(lines.length).toBeGreaterThanOrEqual(3)
    lines.forEach(l => expect(l).toContain('firmAuth'))
  })
})
