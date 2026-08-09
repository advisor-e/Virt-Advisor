'use strict'

// The Template Check routes and the ruling store.
//
// A ruling is Mike's decision about one row of the report. Two things about it
// are worth guarding, and neither is obvious from reading the handlers:
//
// 1. Every save is a READ-MODIFY-WRITE of one shared map. If a failed read were
//    answered with an empty map, saving one ruling would erase every earlier one
//    — the same shape as the bug that made a mentor edit overwrite the whole
//    platform distinction set (see platformDistinctions.js).
// 2. A ruling records a decision; it does NOT edit a logic table. Nothing an
//    advisor sees changes when one is saved.

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  listFirmIdsWithConfigKey: jest.fn(() => Promise.resolve([]))
}))

const overlay = require('../../server/utils/firmOverlay')
const { PLATFORM_SCOPE, CONFIG_KEY, normaliseRuling, RULING } = require('../../server/utils/templateCheckRulings')
const {
  getTemplateCheck,
  saveTemplateCheckRuling,
  deleteTemplateCheckRuling,
  getTemplateCheckPatch
} = require('../../server/routes/mentor')

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

const MENTOR_REQ = { userEmail: 'mentor@advisor-e.com' }

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(1)
})

describe('GET /api/mentor/template-check', () => {
  it('returns the counts and the findings', async () => {
    const res = makeMockRes()
    await getTemplateCheck(MENTOR_REQ, res)
    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
    expect(res._body.counts.tablesChecked).toBe(42)
    expect(Array.isArray(res._body.findings)).toBe(true)
    expect(res._body.findings.length).toBeGreaterThan(0)
  })

  it('applies the stored rulings, so the screen never merges two sources itself', async () => {
    const res0 = makeMockRes()
    await getTemplateCheck(MENTOR_REQ, res0)
    const first = res0._body.findings[0]

    overlay.loadFirmConfig.mockResolvedValue({ [first.key]: { verdict: 'dismissed' } })
    const res = makeMockRes()
    await getTemplateCheck(MENTOR_REQ, res)
    expect(res._body.findings.find(f => f.key === first.key).verdict).toBe('dismissed')
  })

  it('reads from the reserved global scope, never a firm id', async () => {
    await getTemplateCheck(MENTOR_REQ, makeMockRes())
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith(PLATFORM_SCOPE, CONFIG_KEY)
  })

  it('returns a safe error, not a stack trace, when the store cannot be read', async () => {
    process.env.NODE_ENV = 'production'
    overlay.loadFirmConfig.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))
    const res = makeMockRes()
    await getTemplateCheck(MENTOR_REQ, res)
    delete process.env.NODE_ENV
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('ECONNREFUSED')
  })
})

describe('PUT a ruling', () => {
  it('stores a name pointed at a template', async () => {
    const req = Object.assign({ params: { key: 'tree::rule::a name' }, body: { verdict: 'ruled', title: 'Quick Position' } }, MENTOR_REQ)
    const res = makeMockRes()
    await saveTemplateCheckRuling(req, res)

    expect(res._status).toBe(200)
    const [scope, key, map] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(PLATFORM_SCOPE)
    expect(key).toBe(CONFIG_KEY)
    expect(map['tree::rule::a name'].title).toBe('Quick Position')
    expect(map['tree::rule::a name'].ruledBy).toBe('mentor@advisor-e.com')
  })

  it('KEEPS the rulings already stored — one decision never erases the others', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ 'old::key::x': { verdict: 'dismissed' } })
    const req = Object.assign({ params: { key: 'new::key::y' }, body: { verdict: 'dismissed' } }, MENTOR_REQ)
    await saveTemplateCheckRuling(req, makeMockRes())

    const map = overlay.saveFirmConfig.mock.calls[0][2]
    expect(Object.keys(map).sort()).toEqual(['new::key::y', 'old::key::x'])
  })

  it('refuses a ruling with no key', async () => {
    const res = makeMockRes()
    await saveTemplateCheckRuling(Object.assign({ params: {}, body: { verdict: 'dismissed' } }, MENTOR_REQ), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('refuses an unknown verdict rather than storing a decision nothing can read', async () => {
    const res = makeMockRes()
    await saveTemplateCheckRuling(Object.assign({ params: { key: 'k' }, body: { verdict: 'probably-fine' } }, MENTOR_REQ), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('refuses to point a name at nothing', async () => {
    // The one combination that would store a decision nobody can act on.
    const res = makeMockRes()
    await saveTemplateCheckRuling(Object.assign({ params: { key: 'k' }, body: { verdict: 'ruled' } }, MENTOR_REQ), res)
    expect(res._status).toBe(400)
  })

  it('reports a failed save rather than letting it read as saved', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('write failed'))
    process.env.NODE_ENV = 'production'
    const res = makeMockRes()
    await saveTemplateCheckRuling(Object.assign({ params: { key: 'k' }, body: { verdict: 'dismissed' } }, MENTOR_REQ), res)
    delete process.env.NODE_ENV
    expect(res._status).toBe(500)
  })
})

describe('DELETE a ruling', () => {
  it('removes just that one', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ a: { verdict: 'dismissed' }, b: { verdict: 'dismissed' } })
    const res = makeMockRes()
    await deleteTemplateCheckRuling(Object.assign({ params: { key: 'a' } }, MENTOR_REQ), res)
    expect(res._status).toBe(200)
    expect(Object.keys(overlay.saveFirmConfig.mock.calls[0][2])).toEqual(['b'])
  })

  it('succeeds when there was nothing to remove', async () => {
    // The end state the caller asked for is the end state they get. A 404 here
    // would only ever be a race with themselves.
    overlay.loadFirmConfig.mockResolvedValue({})
    const res = makeMockRes()
    await deleteTemplateCheckRuling(Object.assign({ params: { key: 'nope' } }, MENTOR_REQ), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('a flagged name is not a ruled one', () => {
  // "Missing — flag it" says the document is real but unpublished. Folding it
  // into "You've ruled" would render a row pointing at no template at all, and
  // would tell Mike he had settled something only the master-app team can close.
  it('keeps its own verdict through a full round trip', async () => {
    const res0 = makeMockRes()
    await getTemplateCheck(MENTOR_REQ, res0)
    const first = res0._body.findings[0]

    overlay.loadFirmConfig.mockResolvedValue({ [first.key]: { verdict: 'flagged', title: null } })
    const res = makeMockRes()
    await getTemplateCheck(MENTOR_REQ, res)

    const row = res._body.findings.find(f => f.key === first.key)
    expect(row.verdict).toBe('flagged')
    expect(row.ruling.title).toBeNull()
  })
})

describe('normaliseRuling', () => {
  it('accepts each of the three things a ruling can say', () => {
    for (const verdict of Object.values(RULING)) {
      const body = verdict === RULING.POINTS_AT ? { verdict, title: 'X' } : { verdict }
      expect(normaliseRuling(body, 'm@x.com', '2026-08-09T00:00:00Z').ok).toBe(true)
    }
  })

  it('caps a note rather than storing an unbounded string', () => {
    const r = normaliseRuling({ verdict: 'dismissed', note: 'x'.repeat(900) }, 'm@x.com', 'now')
    expect(r.value.note).toHaveLength(500)
  })

  it('stamps who ruled and when, so a decision can be explained later', () => {
    const r = normaliseRuling({ verdict: 'dismissed' }, 'm@x.com', '2026-08-09T00:00:00Z')
    expect(r.value.ruledBy).toBe('m@x.com')
    expect(r.value.ruledAt).toBe('2026-08-09T00:00:00Z')
  })
})

// ── "Apply it" — queueing a ruling for the next update ────────────────────────
//
// RULED 2026-08-09 (Mike): "Apply it" PREPARES a reviewed change; it never edits a
// logic table. Design: design/mockups/logic-table-template-check.html §5.

describe('applyRequested — the second step on a ruled row', () => {
  it('defaults to false, so a ruling is never queued by being made', () => {
    // The mockup shows two separate presses on purpose: deciding what a name means
    // and asking for the table to change are different acts.
    const r = normaliseRuling({ verdict: RULING.POINTS_AT, title: 'X' }, 'm@x.com', 'now')
    expect(r.value.applyRequested).toBe(false)
    expect(r.value.applyRequestedAt).toBeNull()
  })

  it('is stamped separately from the ruling — the two are rarely the same day', () => {
    const r = normaliseRuling(
      { verdict: RULING.POINTS_AT, title: 'X', applyRequested: true }, 'm@x.com', '2026-08-09T00:00:00Z'
    )
    expect(r.value.applyRequested).toBe(true)
    expect(r.value.applyRequestedAt).toBe('2026-08-09T00:00:00Z')
  })

  it('REFUSES to queue a dismissal or a flag, rather than ignoring the request', () => {
    // Neither produces an edit to any table — a dismissal says the phrase was never
    // a document, and a flag is for the master-app team. Accepting the request
    // silently would queue a row for a change that can never appear in the patch.
    for (const verdict of [RULING.NOT_A_TOOL, RULING.FLAGGED]) {
      const r = normaliseRuling({ verdict, applyRequested: true }, 'm@x.com', 'now')
      expect(r.ok).toBe(false)
      expect(r.message).toMatch(/points at a template/)
    }
  })

  it('a non-true value does not queue anything', () => {
    const r = normaliseRuling(
      { verdict: RULING.POINTS_AT, title: 'X', applyRequested: 'yes' }, 'm@x.com', 'now'
    )
    expect(r.value.applyRequested).toBe(false)
  })
})

describe('GET /api/mentor/template-check/patch', () => {
  it('returns an empty patch when nothing has been queued — the state today', async () => {
    overlay.loadFirmConfig.mockResolvedValue({})
    const res = makeMockRes()

    await getTemplateCheckPatch(MENTOR_REQ, res)

    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
    expect(res._body.patch.edits).toEqual([])
    expect(res._body.patch.counts.requested).toBe(0)
  })

  it('fails in the standard envelope when the rulings cannot be read', async () => {
    // Answering an unreadable store with an empty patch would read as "nothing to
    // do", which is the one answer that must never be guessed at here.
    overlay.loadFirmConfig.mockRejectedValue(new Error('store down'))
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const res = makeMockRes()
      await getTemplateCheckPatch(MENTOR_REQ, res)

      expect(res._status).toBe(500)
      expect(res._body.error.code).toBe('DB_ERROR')
      expect(JSON.stringify(res._body)).not.toContain('store down')
    } finally {
      process.env.NODE_ENV = prevEnv
      errSpy.mockRestore()
    }
  })
})
