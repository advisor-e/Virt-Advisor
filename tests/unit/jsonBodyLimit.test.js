'use strict'

// R7 (2026-07-19) — the global jsonBodyParser must carry maxBodySize. Two halves:
// (1) MECHANISM: restify actually refuses an oversize body with 413 when the option
//     is set (proven on a local server built with the production options — the real
//     restify-server.js listens at require time, so it can't be imported in a test);
// (2) WIRING: the production server file really passes the cap to the parser — a
//     source tripwire so the option can't be silently dropped in a refactor.

const fs = require('fs')
const path = require('path')
const http = require('http')
const restify = require('restify')

const JSON_BODY_LIMIT = 1024 * 1024 // must match restify-server.js

/** POST a body to the local server, resolve with the status code. */
function post (port, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/echo', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)) }
    )
    // an oversize request may be refused mid-write — that IS the refusal, not a test failure
    req.on('error', reject)
    req.end(body)
  })
}

describe('R7 — JSON body cap', () => {
  let server
  let port

  beforeAll((done) => {
    server = restify.createServer()
    const parsers = restify.plugins.jsonBodyParser({ mapParams: false, maxBodySize: JSON_BODY_LIMIT })
    server.use(parsers)
    server.post('/echo', (req, res, next) => { res.send(200, { ok: true }); return next() })
    server.listen(0, '127.0.0.1', () => { port = server.address().port; done() })
  })

  afterAll((done) => { server.close(done) })

  test('mechanism: a body over the cap is refused with 413, never buffered whole', async () => {
    const oversize = '{"pad":"' + 'x'.repeat(JSON_BODY_LIMIT + 1024) + '"}'
    const status = await post(port, oversize)
    expect(status).toBe(413)
  })

  test('mechanism: a normal calc-sized body still parses fine', async () => {
    const status = await post(port, JSON.stringify({ cash: 296155, debtors: [1, 2, 3] }))
    expect(status).toBe(200)
  })

  test('wiring: restify-server.js passes maxBodySize: JSON_BODY_LIMIT (1 MB) to the parser', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../server/restify-server.js'), 'utf8')
    expect(src).toMatch(/const JSON_BODY_LIMIT = 1024 \* 1024/)
    expect(src).toMatch(/jsonBodyParser\(\{ mapParams: false, maxBodySize: JSON_BODY_LIMIT \}\)/)
  })
})
