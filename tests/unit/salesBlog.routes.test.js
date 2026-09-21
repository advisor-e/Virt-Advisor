'use strict'

/**
 * The blog routes — item 17 stage 5.
 *
 * The identity rules are the pipeline's and the COI's, proved the same way. What
 * is asserted HERE is what is different about this resource:
 *
 *   1. 🔴 THE TWO GENERATE ROUTES ANSWER 200 WHEN THE MODEL FAILS. The engine
 *      falls back to a template built from the advisor's own brief, and the
 *      reply says `source: 'template'` with the reason. A 500 would throw away a
 *      usable outline. A MISSING FIELD is still a 400 — a brief with no topic
 *      cannot produce anything at all.
 *   2. 🔴 `principles` REACHES A PROMPT, so its shape is validated rather than
 *      trusted: a `details` that is a string instead of a list would otherwise
 *      be spread into one prompt line per letter.
 */

jest.mock('../../server/utils/salesBlogStore', () => {
  const actual = jest.requireActual('../../server/utils/salesBlogStore')
  return {
    listInputs: jest.fn(),
    getInput: jest.fn(),
    saveInput: jest.fn(),
    removeInput: jest.fn(),
    listPosts: jest.fn(),
    getPost: jest.fn(),
    createPost: jest.fn(),
    updatePost: jest.fn(),
    removePost: jest.fn(),
    listReferences: jest.fn(),
    getReference: jest.fn(),
    createReference: jest.fn(),
    removeReference: jest.fn(),
    KINDS: actual.KINDS,
    REFERENCE_TYPES: actual.REFERENCE_TYPES
  }
})
jest.mock('../../server/utils/salesBlogEngine', () => ({
  generateDraft: jest.fn(),
  generateFinal: jest.fn()
}))

const store = require('../../server/utils/salesBlogStore')
const engine = require('../../server/utils/salesBlogEngine')
const routes = require('../../server/routes/salesBlog')

const ADVISOR = 'advisor-aaa'
const FIRM = 'firm-111'

function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

function errorOf (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

function req (over) {
  return Object.assign(
    { advisorId: ADVISOR, firmId: FIRM, body: {}, params: {}, query: {} }, over || {}
  )
}

/** A body that passes validation, so a test can change one field at a time. */
function validBrief (over) {
  return Object.assign({
    topic: 'Cash flow',
    audience: 'Owner-managers',
    objective: 'Explain the gap',
    tone: 'Professional',
    length: 'Medium',
    cta: 'Book a review'
  }, over || {})
}

function validFinal (over) {
  return Object.assign({
    outlineText: '# Outline',
    topic: 'Cash flow',
    audience: 'Owner-managers',
    objective: 'Explain the gap',
    tone: 'Professional',
    cta: 'Book a review',
    polishLevel: 'Standard'
  }, over || {})
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  store.listInputs.mockResolvedValue([])
  store.listPosts.mockResolvedValue([])
  store.listReferences.mockResolvedValue([])
  store.saveInput.mockImplementation(input => Promise.resolve(Object.assign({ id: 'new-1' }, input)))
  store.createPost.mockImplementation(input => Promise.resolve(Object.assign({ id: 'new-1' }, input)))
  store.createReference.mockImplementation(input => Promise.resolve(Object.assign({ id: 'new-1' }, input)))
  store.updatePost.mockImplementation((id, a, f, patch) => Promise.resolve(Object.assign({ id }, patch)))
  store.removeInput.mockResolvedValue(true)
  store.removePost.mockResolvedValue(true)
  store.removeReference.mockResolvedValue(true)
  engine.generateDraft.mockResolvedValue({ text: '# Outline', source: 'ai' })
  engine.generateFinal.mockResolvedValue({ text: '# Article', source: 'ai' })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('🔴 identity comes from the verified token and nowhere else', () => {
  test('every write passes the TOKEN\'s advisor and firm to the store', async () => {
    await routes.saveInput(req({ body: { signature: 's', ...validBrief() } }), makeRes())
    await routes.createPost(req({ body: { title: 'T', outlineText: 'O', ...validBrief() } }), makeRes())
    await routes.createReference(req({ body: { title: 'T', type: 'url' } }), makeRes())

    for (const call of [store.saveInput, store.createPost, store.createReference]) {
      const passed = call.mock.calls[0][0]
      expect(passed.advisorId).toBe(ADVISOR)
      expect(passed.firmId).toBe(FIRM)
    }
  })

  test('🔴 a body claiming another advisor or firm cannot override the token', async () => {
    await routes.createPost(req({
      body: Object.assign(validBrief(), {
        title: 'T', outlineText: 'O', advisorId: 'attacker', firmId: 'other-firm'
      })
    }), makeRes())

    const passed = store.createPost.mock.calls[0][0]
    expect(passed.advisorId).toBe(ADVISOR)
    expect(passed.firmId).toBe(FIRM)
  })

  test('every route refuses a session that identifies no advisor', async () => {
    const calls = [
      ['listInputs', {}], ['saveInput', {}], ['removeInput', {}],
      ['listPosts', {}], ['createPost', {}], ['updatePost', {}], ['removePost', {}],
      ['listReferences', {}], ['createReference', {}], ['removeReference', {}],
      ['generateDraft', {}], ['generateFinal', {}]
    ]
    for (const [name] of calls) {
      const res = makeRes()
      await routes[name](req({ advisorId: null, firmId: null }), res)
      expect(res._status).toBe(403)
      expect(errorOf(res).error.code).toBe('NO_ADVISOR_IDENTITY')
    }
  })

  test('a firm with no advisor, or an advisor with no firm, is also refused', async () => {
    const res1 = makeRes()
    await routes.listPosts(req({ advisorId: null }), res1)
    expect(res1._status).toBe(403)

    const res2 = makeRes()
    await routes.listPosts(req({ firmId: null }), res2)
    expect(res2._status).toBe(403)
  })
})

describe('validatePrinciples — what may reach a prompt', () => {
  test('a well-formed list passes through', () => {
    const out = routes.validatePrinciples([{ title: 'T', details: ['a'] }])
    expect(out.value).toEqual([{ title: 'T', details: ['a'] }])
  })

  test('absent principles become an empty list, not an error', () => {
    expect(routes.validatePrinciples(undefined).value).toEqual([])
    expect(routes.validatePrinciples(null).value).toEqual([])
  })

  test('🔴 a string `details` is REFUSED, not coerced', () => {
    const out = routes.validatePrinciples([{ title: 'T', details: 'abc' }])
    expect(out.error.code).toBe('INVALID_PRINCIPLES')
  })

  test('a non-array, a non-object entry and a non-text title are refused', () => {
    expect(routes.validatePrinciples('nope').error.code).toBe('INVALID_PRINCIPLES')
    expect(routes.validatePrinciples([null]).error.code).toBe('INVALID_PRINCIPLES')
    expect(routes.validatePrinciples(['x']).error.code).toBe('INVALID_PRINCIPLES')
    expect(routes.validatePrinciples([[]]).error.code).toBe('INVALID_PRINCIPLES')
    expect(routes.validatePrinciples([{ title: 42 }]).error.code).toBe('INVALID_PRINCIPLES')
  })

  test('a non-text detail inside the list is refused', () => {
    expect(routes.validatePrinciples([{ title: 'T', details: ['a', 42] }]).error.code)
      .toBe('INVALID_PRINCIPLES')
  })

  test('too many principles are refused rather than silently truncated', () => {
    const many = Array.from({ length: 21 }, () => ({ title: 'T', details: [] }))
    expect(routes.validatePrinciples(many).error.code).toBe('INVALID_PRINCIPLES')
  })

  test('a principle with no title at all is allowed — the engine names it', () => {
    expect(routes.validatePrinciples([{ details: ['a'] }]).value).toEqual([{ title: '', details: ['a'] }])
  })

  test('details are capped at twenty per principle', () => {
    const long = Array.from({ length: 30 }, (_, i) => 'd' + i)
    expect(routes.validatePrinciples([{ title: 'T', details: long }]).value[0].details)
      .toHaveLength(20)
  })
})

describe('saving a brief', () => {
  test('a brief with every required field is stored', async () => {
    const res = makeRes()
    await routes.saveInput(req({ body: Object.assign({ signature: 'sig' }, validBrief()) }), res)

    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
  })

  test('a missing signature or required field is a 400', async () => {
    for (const missing of ['signature', 'topic', 'audience', 'objective', 'tone', 'length', 'cta']) {
      const body = Object.assign({ signature: 'sig' }, validBrief())
      delete body[missing]
      const res = makeRes()
      await routes.saveInput(req({ body }), res)
      expect(res._status).toBe(400)
      expect(errorOf(res).error.code).toBe('MISSING_FIELD')
    }
  })

  test('a required field that is present but blank is still missing', async () => {
    const res = makeRes()
    await routes.saveInput(req({ body: Object.assign({ signature: '   ' }, validBrief()) }), res)
    expect(res._status).toBe(400)
  })

  test('a required field of the wrong type is a 400, not a crash', async () => {
    const res = makeRes()
    await routes.saveInput(req({ body: Object.assign({ signature: 42 }, validBrief()) }), res)
    expect(res._status).toBe(400)
  })

  test('an optional field of the wrong type is refused', async () => {
    const res = makeRes()
    await routes.saveInput(req({
      body: Object.assign({ signature: 'sig', wordCount: 900 }, validBrief())
    }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_TEXT')
  })

  test('malformed principles are a 400 before anything is stored', async () => {
    const res = makeRes()
    await routes.saveInput(req({
      body: Object.assign({ signature: 'sig', principles: 'nope' }, validBrief())
    }), res)

    expect(res._status).toBe(400)
    expect(store.saveInput).not.toHaveBeenCalled()
  })

  test('a non-object body is refused rather than crashing', async () => {
    const res = makeRes()
    await routes.saveInput(req({ body: null }), res)
    expect(res._status).toBe(400)
  })

  test('styleTitles is capped, and unknown structures pass through as null', async () => {
    await routes.saveInput(req({
      body: Object.assign({
        signature: 'sig',
        styleTitles: Array.from({ length: 80 }, (_, i) => 't' + i)
      }, validBrief())
    }), makeRes())

    const passed = store.saveInput.mock.calls[0][0]
    expect(passed.styleTitles).toHaveLength(50)
    expect(passed.lengthRanges).toBeNull()
  })

  test('a non-array styleTitles becomes null rather than being stored', async () => {
    await routes.saveInput(req({
      body: Object.assign({ signature: 'sig', styleTitles: 'nope' }, validBrief())
    }), makeRes())

    expect(store.saveInput.mock.calls[0][0].styleTitles).toBeNull()
  })

  test('a store failure is a 500 with no detail leaked', async () => {
    store.saveInput.mockRejectedValue(new Error('ER_DUP_ENTRY at line 4'))
    const res = makeRes()
    await routes.saveInput(req({ body: Object.assign({ signature: 'sig' }, validBrief()) }), res)

    expect(res._status).toBe(500)
    expect(errorOf(res).error.code).toBe('DB_ERROR')
    expect(JSON.stringify(res._body)).not.toContain('ER_DUP_ENTRY')
  })
})

describe('listing and deleting', () => {
  test('the lists come back under `items`', async () => {
    for (const name of ['listInputs', 'listPosts', 'listReferences']) {
      const res = makeRes()
      await routes[name](req(), res)
      expect(res._status).toBe(200)
      expect(res._body).toEqual({ success: true, items: [] })
    }
  })

  test('the post query is passed through, normalised', async () => {
    await routes.listPosts(req({
      query: { kind: 'FINAL', search: 'cash', pinnedOnly: 'TRUE' }
    }), makeRes())

    expect(store.listPosts).toHaveBeenCalledWith(ADVISOR, FIRM, {
      kind: 'final', search: 'cash', pinnedOnly: true
    })
  })

  test('an absent query is the same as asking for drafts', async () => {
    await routes.listPosts(req({ query: undefined }), makeRes())
    expect(store.listPosts.mock.calls[0][2].kind).toBe('draft')
    expect(store.listPosts.mock.calls[0][2].pinnedOnly).toBe(false)
  })

  test('a very long search is truncated before it reaches the store', async () => {
    await routes.listPosts(req({ query: { search: 'x'.repeat(900) } }), makeRes())
    expect(store.listPosts.mock.calls[0][2].search).toHaveLength(200)
  })

  test('a reference topic is passed through and truncated', async () => {
    await routes.listReferences(req({ query: { topic: 'y'.repeat(900) } }), makeRes())
    expect(store.listReferences.mock.calls[0][2]).toHaveLength(255)
  })

  test('an absent reference topic is an empty string, not undefined', async () => {
    await routes.listReferences(req({ query: {} }), makeRes())
    expect(store.listReferences.mock.calls[0][2]).toBe('')
  })

  test('a delete with no id is a 400', async () => {
    for (const name of ['removeInput', 'removePost', 'removeReference']) {
      const res = makeRes()
      await routes[name](req({ params: {} }), res)
      expect(res._status).toBe(400)
      expect(errorOf(res).error.code).toBe('MISSING_ID')
    }
  })

  test('🔴 deleting something that is not yours is a 404, worded the same as "no such row"', async () => {
    store.removePost.mockResolvedValue(false)
    const res = makeRes()
    await routes.removePost(req({ params: { id: 'someone-elses' } }), res)

    expect(res._status).toBe(404)
    // The message must not distinguish "not yours" from "does not exist" — that
    // difference is itself a disclosure.
    expect(errorOf(res).error.message).toMatch(/not one of yours/)
  })

  test('a successful delete answers 200', async () => {
    const res = makeRes()
    await routes.removeInput(req({ params: { id: 'mine' } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true })
  })

  test('a store failure on any list or delete is a 500', async () => {
    store.listInputs.mockRejectedValue(new Error('boom'))
    store.listPosts.mockRejectedValue(new Error('boom'))
    store.listReferences.mockRejectedValue(new Error('boom'))
    store.removeInput.mockRejectedValue(new Error('boom'))
    store.removePost.mockRejectedValue(new Error('boom'))
    store.removeReference.mockRejectedValue(new Error('boom'))

    for (const [name, r] of [
      ['listInputs', req()], ['listPosts', req()], ['listReferences', req()],
      ['removeInput', req({ params: { id: 'a' } })],
      ['removePost', req({ params: { id: 'a' } })],
      ['removeReference', req({ params: { id: 'a' } })]
    ]) {
      const res = makeRes()
      await routes[name](r, res)
      expect(res._status).toBe(500)
    }
  })
})

describe('storing and changing a post', () => {
  test('a post with every required field is stored', async () => {
    const res = makeRes()
    await routes.createPost(req({
      body: Object.assign({ title: 'T', outlineText: 'O' }, validBrief())
    }), res)

    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
  })

  test('each required field is checked', async () => {
    for (const missing of routes.POST_REQUIRED) {
      const body = Object.assign({ title: 'T', outlineText: 'O' }, validBrief())
      delete body[missing]
      const res = makeRes()
      await routes.createPost(req({ body }), res)
      expect(res._status).toBe(400)
    }
  })

  test('an unknown kind is stored as a draft rather than refused', async () => {
    // The store's normaliser decides; the route passes the value through.
    await routes.createPost(req({
      body: Object.assign({ title: 'T', outlineText: 'O', kind: 'published' }, validBrief())
    }), makeRes())

    expect(store.createPost.mock.calls[0][0].kind).toBe('published')
  })

  test('isPinned is only ever true when it was literally true', async () => {
    for (const value of ['true', 1, 'yes', {}]) {
      jest.clearAllMocks()
      store.createPost.mockImplementation(i => Promise.resolve(i))
      await routes.createPost(req({
        body: Object.assign({ title: 'T', outlineText: 'O', isPinned: value }, validBrief())
      }), makeRes())
      expect(store.createPost.mock.calls[0][0].isPinned).toBe(false)
    }
  })

  test('only the patchable fields reach the store', async () => {
    await routes.updatePost(req({
      params: { id: 'p1' },
      body: { isPinned: true, title: 'New', kind: 'final', advisorId: 'attacker' }
    }), makeRes())

    const patch = store.updatePost.mock.calls[0][3]
    expect(patch).toEqual({ isPinned: true, title: 'New' })
    expect(patch.kind).toBeUndefined()
    expect(patch.advisorId).toBeUndefined()
  })

  test('an explicit null clears a field', async () => {
    await routes.updatePost(req({ params: { id: 'p1' }, body: { finalText: null } }), makeRes())
    expect(store.updatePost.mock.calls[0][3]).toEqual({ finalText: null })
  })

  test('a non-boolean isPinned on update is a 400', async () => {
    const res = makeRes()
    await routes.updatePost(req({ params: { id: 'p1' }, body: { isPinned: 'yes' } }), res)
    expect(res._status).toBe(400)
  })

  test('a non-text title or body field on update is a 400', async () => {
    const res = makeRes()
    await routes.updatePost(req({ params: { id: 'p1' }, body: { title: 42 } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_TEXT')
  })

  test('a blank title on update is refused — a post needs one', async () => {
    const res = makeRes()
    await routes.updatePost(req({ params: { id: 'p1' }, body: { title: '   ' } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('MISSING_FIELD')
  })

  test('an update with no id is a 400, and one matching nothing is a 404', async () => {
    const res1 = makeRes()
    await routes.updatePost(req({ params: {} }), res1)
    expect(res1._status).toBe(400)

    store.updatePost.mockResolvedValue(null)
    const res2 = makeRes()
    await routes.updatePost(req({ params: { id: 'nope' }, body: { title: 'T' } }), res2)
    expect(res2._status).toBe(404)
  })

  test('a store failure on create or update is a 500', async () => {
    store.createPost.mockRejectedValue(new Error('boom'))
    store.updatePost.mockRejectedValue(new Error('boom'))

    const res1 = makeRes()
    await routes.createPost(req({
      body: Object.assign({ title: 'T', outlineText: 'O' }, validBrief())
    }), res1)
    expect(res1._status).toBe(500)

    const res2 = makeRes()
    await routes.updatePost(req({ params: { id: 'a' }, body: { title: 'T' } }), res2)
    expect(res2._status).toBe(500)
  })

  test('an update carrying nothing patchable still answers 200', async () => {
    const res = makeRes()
    await routes.updatePost(req({ params: { id: 'p1' }, body: { nonsense: 1 } }), res)
    expect(res._status).toBe(200)
    expect(store.updatePost.mock.calls[0][3]).toEqual({})
  })

  test('a non-object body on update is treated as empty, not a crash', async () => {
    const res = makeRes()
    await routes.updatePost(req({ params: { id: 'p1' }, body: 'nope' }), res)
    expect(res._status).toBe(200)
  })
})

describe('storing a reference', () => {
  test('a document and a URL are both accepted', async () => {
    for (const type of ['document', 'url']) {
      const res = makeRes()
      await routes.createReference(req({ body: { title: 'T', type } }), res)
      expect(res._status).toBe(200)
    }
  })

  test('a missing title is a 400', async () => {
    const res = makeRes()
    await routes.createReference(req({ body: { type: 'url' } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('MISSING_FIELD')
  })

  test('🔴 an unrecognised type is REFUSED, not defaulted', async () => {
    // The store would fail it safe to 'document', but the advisor would then
    // have a reference that is not what they said it was.
    for (const type of ['script', '', undefined, 42]) {
      const res = makeRes()
      await routes.createReference(req({ body: { title: 'T', type } }), res)
      expect(res._status).toBe(400)
      expect(errorOf(res).error.code).toBe('INVALID_TYPE')
    }
  })

  test('a non-text content, url or topic is a 400', async () => {
    for (const field of ['content', 'url', 'topic']) {
      const res = makeRes()
      await routes.createReference(req({ body: { title: 'T', type: 'url', [field]: 42 } }), res)
      expect(res._status).toBe(400)
      expect(errorOf(res).error.code).toBe('INVALID_TEXT')
    }
  })

  test('a store failure is a 500', async () => {
    store.createReference.mockRejectedValue(new Error('boom'))
    const res = makeRes()
    await routes.createReference(req({ body: { title: 'T', type: 'url' } }), res)
    expect(res._status).toBe(500)
  })
})

describe('🔴 the two generate routes', () => {
  test('a draft returns the engine text and its source', async () => {
    const res = makeRes()
    await routes.generateDraft(req({ body: validBrief() }), res)

    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true, text: '# Outline', source: 'ai' })
  })

  test('🔴 a TEMPLATE fallback is a 200, not an error', async () => {
    // The whole point: the advisor gets a usable outline even when the model is
    // unavailable, and is told which they are looking at.
    engine.generateDraft.mockResolvedValue({
      text: '# Template outline', source: 'template', error: 'OpenAI key not configured'
    })
    const res = makeRes()
    await routes.generateDraft(req({ body: validBrief() }), res)

    expect(res._status).toBe(200)
    expect(res._body.source).toBe('template')
    expect(res._body.error).toBe('OpenAI key not configured')
    expect(res._body.text).toBe('# Template outline')
  })

  test('the same holds for the final article', async () => {
    engine.generateFinal.mockResolvedValue({ text: '# T', source: 'template', error: 'timeout' })
    const res = makeRes()
    await routes.generateFinal(req({ body: validFinal() }), res)

    expect(res._status).toBe(200)
    expect(res._body.source).toBe('template')
  })

  test('🔴 a MISSING FIELD is still a 400 — nothing can be generated from it', async () => {
    for (const missing of routes.DRAFT_REQUIRED) {
      const body = validBrief()
      delete body[missing]
      const res = makeRes()
      await routes.generateDraft(req({ body }), res)
      expect(res._status).toBe(400)
      expect(engine.generateDraft).not.toHaveBeenCalled()
    }
  })

  test('each field the final article needs is checked', async () => {
    for (const missing of routes.FINAL_REQUIRED) {
      const body = validFinal()
      delete body[missing]
      const res = makeRes()
      await routes.generateFinal(req({ body }), res)
      expect(res._status).toBe(400)
      expect(engine.generateFinal).not.toHaveBeenCalled()
    }
  })

  test('malformed principles are refused before the model is called', async () => {
    const res = makeRes()
    await routes.generateDraft(req({
      body: Object.assign(validBrief(), { principles: [{ title: 'T', details: 'abc' }] })
    }), res)

    expect(res._status).toBe(400)
    expect(engine.generateDraft).not.toHaveBeenCalled()
  })

  test('a non-text optional field is refused before the model is called', async () => {
    const res = makeRes()
    await routes.generateDraft(req({ body: Object.assign(validBrief(), { references: 42 }) }), res)
    expect(res._status).toBe(400)
    expect(engine.generateDraft).not.toHaveBeenCalled()

    const res2 = makeRes()
    await routes.generateFinal(req({ body: Object.assign(validFinal(), { aiInstructions: 42 }) }), res2)
    expect(res2._status).toBe(400)
    expect(engine.generateFinal).not.toHaveBeenCalled()
  })

  test('only the validated fields are handed to the engine', async () => {
    await routes.generateDraft(req({
      body: Object.assign(validBrief(), { advisorId: 'attacker', somethingElse: 'x' })
    }), makeRes())

    const passed = engine.generateDraft.mock.calls[0][0]
    expect(passed.advisorId).toBeUndefined()
    expect(passed.somethingElse).toBeUndefined()
    expect(passed.topic).toBe('Cash flow')
  })

  test('validated principles, not the raw body, reach the engine', async () => {
    await routes.generateDraft(req({
      body: Object.assign(validBrief(), { principles: [{ details: ['a'] }] })
    }), makeRes())

    expect(engine.generateDraft.mock.calls[0][0].principles).toEqual([{ title: '', details: ['a'] }])
  })

  test('🔴 an engine that THROWS is a 500 — it is not disguised as a template', async () => {
    // The engine catches its own model failures. Reaching here means something
    // else broke, and reporting it as a successful template would hide it.
    engine.generateDraft.mockRejectedValue(new Error('unexpected'))
    const res = makeRes()
    await routes.generateDraft(req({ body: validBrief() }), res)

    expect(res._status).toBe(500)
    expect(errorOf(res).error.code).toBe('AI_ERROR')
    expect(JSON.stringify(res._body)).not.toContain('unexpected')
  })

  test('the same holds for the final route', async () => {
    engine.generateFinal.mockRejectedValue(new Error('unexpected'))
    const res = makeRes()
    await routes.generateFinal(req({ body: validFinal() }), res)

    expect(res._status).toBe(500)
    expect(errorOf(res).error.code).toBe('AI_ERROR')
  })

  test('a non-object body is a 400, not a crash', async () => {
    const res = makeRes()
    await routes.generateDraft(req({ body: null }), res)
    expect(res._status).toBe(400)
  })
})
