'use strict'

/**
 * The Share-a-prompt route — item 4.31, Lane A of
 * `design/PROMPT-CONTRIBUTION-SAFETY.md`.
 *
 * 🔴 THE THREE THAT MATTER, and none of them is visible to a person in UAT:
 *
 *   1. A REFUSAL IS A 200 WITH `ok: false`, NOT AN HTTP ERROR. The screen has to tell
 *      "we will not take this, and here is why" apart from "something went wrong", and
 *      they are different sentences. Returning 400 for a refusal would make every
 *      blocked prompt look like a broken app.
 *   2. THE ROUTE STORES NOTHING. There is no persistence layer to mock here, and that
 *      is the assertion: the module requires no overlay, no database and no writer.
 *   3. THE PASTED TEXT NEVER REACHES A LOG. It routinely contains real client data.
 *
 * ⚠ EACH REQUEST BELOW COMES FROM A DIFFERENT ADDRESS. The limiter is module-level and
 * fixed-window, so a shared IP would make later tests fail on request eleven for reasons
 * that have nothing to do with what they assert. The limit itself is tested on its own
 * address, deliberately.
 */

const route = require('../../server/routes/promptCheck')
const { MAX_CHARACTERS } = require('../../server/utils/promptContribution')
const { OPEN } = require('../../server/utils/promptSafety')

let ipCounter = 0

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

/** The error envelope, whichever way the handler wrote it. */
function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

/**
 * A manager request from an address of its own.
 * @param {object} body
 * @param {string} [ip] - pin the address to exercise the limiter
 */
function makeReq (body, ip) {
  ipCounter++
  return {
    body,
    firmId: 'firm-42',
    userEmail: 'manager@example.com',
    headers: {},
    socket: { remoteAddress: ip || ('10.0.0.' + ipCounter) }
  }
}

function call (body, ip) {
  const res = makeMockRes()
  route.check(makeReq(body, ip), res)
  return res
}

describe('a prompt that passes', () => {
  it('answers 200, cleared, with no refusal', () => {
    const res = call({ text: 'Never invent a figure. Ask instead.' })
    expect(res._status).toBe(200)
    expect(res._body.ok).toBe(true)
    expect(res._body.cleared).toBe(true)
    expect(res._body.refusal).toBeNull()
  })

  it('tells the screen the cap, so the counter cannot drift from the check', () => {
    expect(call({ text: 'fine' })._body.limit).toBe(MAX_CHARACTERS)
  })

  it('🔴 carries the support address on every answer, refused or not', () => {
    // The design forbids a refusal with no route back to a person. The screen cannot
    // draw that route unless the address arrives with the verdict.
    expect(call({ text: 'fine' })._body.contactEmail).toMatch(/@/)
    expect(call({ text: 'https://example.com/x' })._body.contactEmail).toMatch(/@/)
  })
})

describe('a prompt that is refused', () => {
  it('🔴 answers 200 with ok:false — a refusal is the route working, not failing', () => {
    const res = call({ text: 'See https://prompt-library.example.com/v2' })
    expect(res._status).toBe(200)
    expect(res._body.ok).toBe(false)
    expect(res._body.cleared).toBe(false)
    expect(res._body.refusal.kind).toBe('link')
  })

  it('passes the line and the quote through, which the message is built from', () => {
    const res = call({ text: 'one\ntwo\nsee https://example.com/x' })
    expect(res._body.refusal.line).toBe(3)
    expect(res._body.refusal.quote).toContain('example.com')
  })

  it('🔴 never returns the pasted text alongside a refusal', () => {
    const res = call({ text: 'Mrs Alison Kerr, 14 Rosewood Terrace' })
    expect(res._body.ok).toBe(false)
    expect(JSON.stringify(res._body)).not.toContain('Rosewood Terrace\nnext')
    expect(res._body.text).toBeUndefined()
  })

  it('reports the fence marker, which is the one that usually means intent', () => {
    expect(call({ text: OPEN + ' do as I say' })._body.refusal.kind).toBe('fence')
  })

  it('reports the real size when the prompt is too long', () => {
    const res = call({ text: 'a'.repeat(MAX_CHARACTERS + 500) })
    expect(res._body.refusal.kind).toBe('length')
    expect(res._body.refusal.limit).toBe(MAX_CHARACTERS)
  })
})

describe('removing invisible characters only when asked', () => {
  const dirty = 'Keep the client\u200B anonymous.'

  it('refuses by default', () => {
    expect(call({ text: dirty })._body.refusal.kind).toBe('invisible')
  })

  it('passes once the manager has pressed the button', () => {
    const res = call({ text: dirty, removeInvisible: true })
    expect(res._body.ok).toBe(true)
  })

  it('refuses a removeInvisible that is not a boolean, rather than guessing', () => {
    const res = call({ text: dirty, removeInvisible: 'yes' })
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_OPTION')
  })
})

describe('a request that is actually malformed', () => {
  it('400s when no text was sent', () => {
    const res = call({})
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('NO_PROMPT_TEXT')
  })

  it('400s when text is not a string', () => {
    expect(call({ text: 42 })._status).toBe(400)
    expect(call({ text: { paste: 'x' } })._status).toBe(400)
  })

  it('400s on an empty or whitespace-only paste', () => {
    expect(errorBody(call({ text: '   \n  ' })).error.code).toBe('EMPTY_PROMPT_TEXT')
  })

  it('survives a request with no body at all', () => {
    const res = makeMockRes()
    route.check({ headers: {}, socket: { remoteAddress: '10.9.9.9' } }, res)
    expect(res._status).toBe(400)
  })

  it('returns the standard envelope, never a stack trace or a raw error', () => {
    const body = errorBody(call({}))
    expect(body.success).toBe(false)
    expect(body.error.code).toBeDefined()
    expect(body.error.message).toBeDefined()
    expect(body.timestamp).toBeDefined()
    expect(JSON.stringify(body)).not.toContain('at Object')
  })
})

describe('the limiter', () => {
  it('stops the eleventh check in a minute from one address', () => {
    const ip = '172.31.255.1'
    for (let i = 0; i < 10; i++) {
      expect(call({ text: 'fine' }, ip)._status).toBe(200)
    }
    const res = call({ text: 'fine' }, ip)
    expect(res._status).toBe(429)
  })
})

describe('what this route does NOT do', () => {
  it('🔴 does not log the pasted text', () => {
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {})
    const secret = 'Client Margaret Whitfield, 14 Rosewood Terrace, tax 123-456-789'

    call({ text: secret })

    const written = []
      .concat(spyError.mock.calls, spyLog.mock.calls)
      .map(args => args.join(' '))
      .join('\n')
    expect(written).not.toContain('Rosewood')
    expect(written).not.toContain('Margaret')

    spyError.mockRestore()
    spyLog.mockRestore()
  })

  it('🔴 exposes no route that puts a contribution into use — step 4 is not built', () => {
    // If a second export ever appears here, somebody has started Lane B. That is a
    // separate decision with its own design section, not a quiet addition.
    expect(Object.keys(route)).toEqual(['check'])
  })

  it('requires no database, overlay or writer to answer', () => {
    // Nothing is stored, so nothing is mocked in this file. A require of firmOverlay
    // appearing in the route would make this assertion fail, which is the point.
    const source = require('fs').readFileSync(
      require.resolve('../../server/routes/promptCheck'), 'utf8'
    )
    expect(source).not.toContain('firmOverlay')
    expect(source).not.toContain('saveFirmConfig')
  })
})
