'use strict'

// parseBody used to accumulate the request body with no size cap — a memory-
// exhaustion DoS on the OpenAI-backed /api/course route. It must now reject a
// body over BODY_LIMIT with a tagged error (mapped to 413 by the handler) and
// destroy the socket, while still parsing a normal body.

const { EventEmitter } = require('events')
const courseEngine = require('../../server/courseEngine')
const { parseBody, BODY_LIMIT } = courseEngine

/** A fake request stream with a destroyable socket. */
function makeReq () {
  const req = new EventEmitter()
  req.socket = { destroyed: false, destroy () { this.destroyed = true } }
  return req
}

describe('courseEngine.parseBody', () => {
  test('parses a normal JSON body', async () => {
    const req = makeReq()
    const p = parseBody(req)
    req.emit('data', Buffer.from(JSON.stringify({ type: 'design', query: 'hi' })))
    req.emit('end')
    await expect(p).resolves.toEqual({ type: 'design', query: 'hi' })
  })

  test('rejects a body over BODY_LIMIT with BODY_TOO_LARGE and destroys the socket', async () => {
    const req = makeReq()
    const p = parseBody(req)
    // One chunk larger than the cap.
    req.emit('data', Buffer.alloc(BODY_LIMIT + 1, 0x61))
    await expect(p).rejects.toMatchObject({ code: 'BODY_TOO_LARGE' })
    expect(req.socket.destroyed).toBe(true)
  })

  test('rejects invalid JSON (within the size cap)', async () => {
    const req = makeReq()
    const p = parseBody(req)
    req.emit('data', Buffer.from('not json'))
    req.emit('end')
    await expect(p).rejects.toBeInstanceOf(Error)
  })
})
