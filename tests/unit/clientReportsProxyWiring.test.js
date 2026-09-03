'use strict'

const fs = require('fs')
const path = require('path')

/**
 * Business Entity Reports must reach the backend the same way everything else does —
 * the same tripwires as clientsProxyWiring.test.js, for the same reason: on 2026-09-02
 * a whole feature (Meeting Review) shipped three slices with no proxy entry, and the
 * browser was never allowed to ask for any of it. Wiring is a property of two files.
 */
const root = path.join(__dirname, '../../')
const read = f => fs.readFileSync(path.join(root, f), 'utf8')

describe('business entity reports — reaching the backend', () => {
  it('never hardcodes a backend host in the browser bundle', () => {
    expect(read('utils/clientReports.js')).not.toMatch(/https?:\/\/localhost/)
  })

  it('calls the proxy path', () => {
    expect(read('utils/clientReports.js')).toMatch(/fetch\(['`]\/api\/client-reports/)
  })

  it('has /api/client-reports registered on the Nuxt proxy, through the shared thin proxy', () => {
    const cfg = read('nuxt.config.js')
    const line = cfg.split('\n').find(l => l.includes("path: '/api/client-reports'"))
    expect(line).toBeDefined()
    expect(line).toContain('apiProxy.js')
  })

  it('has the three backend routes, and none of them in routes/report.js', () => {
    const server = read('server/restify-server.js')
    expect(server).toMatch(/server\.get\('\/api\/client-reports\/mine', entityAuth/)
    expect(server).toMatch(/server\.get\('\/api\/client-reports\/access\/:clientId', firmAuth/)
    expect(server).toMatch(/server\.put\('\/api\/client-reports\/access\/:clientId', firmAuth/)
    // Part 2 (item 4.62): the saved figures. The client's two are entityAuth, the advisor's three firmAuth.
    expect(server).toMatch(/server\.get\('\/api\/client-reports\/mine\/saved', entityAuth/)
    expect(server).toMatch(/server\.put\('\/api\/client-reports\/mine\/saved', entityAuth/)
    expect(server).toMatch(/server\.get\('\/api\/client-reports\/saved\/:clientId', firmAuth/)
    expect(server).toMatch(/server\.put\('\/api\/client-reports\/saved\/:clientId', firmAuth/)
    expect(server).toMatch(/server\.post\('\/api\/client-reports\/saved\/:clientId\/restore', firmAuth/)
    // routes/report.js is the laptop's under item 4.61; this feature keeps out of it.
    expect(read('server/routes/report.js')).not.toMatch(/client-reports|clientReportAccess/)
  })
})
