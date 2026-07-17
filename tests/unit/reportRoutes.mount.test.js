'use strict'

const restify = require('restify')
const reportRoute = require('../../server/routes/report')

/**
 * Mount boot-check for the report routes (added after the Quick Position Stage D
 * catch, 2026-07-17): Restify 9 validates every handler's shape at REGISTRATION
 * time — an async handler that also declares the `(req, res, next)` callback
 * kills the whole server at boot with an assertion. Unit tests that call handlers
 * directly can never see that, so this suite mounts every exported report handler
 * on a real (non-listening) Restify server exactly as restify-server.js does.
 */
describe('report routes — Restify 9 mount check', () => {
  test('every exported report handler registers without a boot assertion', () => {
    const server = restify.createServer()
    try {
      expect(() => {
        for (const name of Object.keys(reportRoute)) {
          server.post('/mount-check/' + name, reportRoute[name])
        }
      }).not.toThrow()
    } finally {
      server.close()
    }
  })
})
