'use strict'

/**
 * The quiz cascade routes (CB-31 Phase 3) — switch a question off, edit one,
 * add your own.
 *
 * These mirror the staircase cascade routes deliberately: same verbs, same shapes,
 * same error codes. What they must prove is not "the handler saves" but the
 * guarantees that make a firm's decisions safe to store — identity is assigned by
 * the server, a field the firm did not send is not recorded as an edit, a page name
 * is stored as the library spells it rather than as someone typed it, and the screen
 * is handed the SAME banks the course engine reads.
 *
 * The one place this file deliberately departs from its staircase twin is the
 * last-question case. The staircase refuses; quizzes must allow it, because a bank
 * with every question switched off is dropped so the course falls through to
 * AI-generated questions. That is a decision the engine already handles, so the
 * route has no business blocking it — and it is asserted here rather than left to
 * be rediscovered as a bug.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn().mockResolvedValue(1),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const fm = require('../../server/routes/firmManager')
const { CONFIG_KEYS, LIMITS } = require('../../server/utils/firmQuizzes')
const { loadBlendedQuizBanks } = require('../../server/utils/quizConfig')
const BASE = require('../../data/course-quizzes.json')

const FIRM = 'firm-test-123'

const BANK_KEYS = Object.keys(BASE.banks).filter(k => !k.startsWith('_'))
const BANK = BANK_KEYS[0]
const BANK_ENTRIES = BASE.banks[BANK].entries
const QID = BANK_ENTRIES[0].qid
const OTHER_QID = BASE.banks[BANK_KEYS[1]].entries[0].qid

// Mirrors staircaseCascade.routes.test.js: sendError writes through writeHead/end
// rather than send, so both paths have to be captured or an error response reads as
// nothing at all.
function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    header () {},
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch { this._body = body } }
  }
}

function makeReq (over = {}) {
  return { firmId: FIRM, userEmail: 'manager@testfirm.com', params: {}, body: {}, query: {}, headers: {}, ...over }
}

/** Answer each config key separately, as the real store does. */
function mockKeys (byKey) {
  overlay.loadFirmConfig.mockImplementation((firmId, key) =>
    Promise.resolve(Object.prototype.hasOwnProperty.call(byKey, key) ? byKey[key] : null))
}

/** What was written to one key, or undefined if that key was never written. */
function savedTo (key) {
  const call = overlay.saveFirmConfig.mock.calls.filter(c => c[1] === key).pop()
  return call ? call[2] : undefined
}

/** A complete question, as the Add form would send it. */
function newQuestion (over = {}) {
  return {
    bank: BANK,
    question: 'What does our firm ask first?',
    answer: 'What the client actually wants.',
    keyPoint: 'Start from the client, not the numbers.',
    ...over
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.saveFirmConfig.mockResolvedValue(1)
})

// ── Editing one of Advisor-e's questions ──────────────────────────────────────

describe('PUT /api/firm-manager/quizzes/platform/:qid', () => {
  test('records only the fields the firm actually sent', async () => {
    // The freshness guarantee. Recording the whole question would freeze the two
    // fields the firm did not touch at today's wording — which is precisely the
    // defect the old whole-bank overlay caused and this mechanism exists to close.
    mockKeys({})
    const res = makeRes()

    await fm.setQuizOverride(makeReq({ params: { qid: QID }, body: { question: 'How do we open a year-end meeting?' } }), res)

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.overrides)).toEqual({ [QID]: { question: 'How do we open a year-end meeting?' } })
  })

  test('merges with an edit the firm made earlier rather than replacing it', async () => {
    mockKeys({ [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours' } } })

    await fm.setQuizOverride(makeReq({ params: { qid: QID }, body: { answer: 'Our answer.' } }), makeRes())

    expect(savedTo(CONFIG_KEYS.overrides)[QID]).toEqual({ question: 'Ours', answer: 'Our answer.' })
  })

  test('leaves another question edit alone', async () => {
    mockKeys({ [CONFIG_KEYS.overrides]: { [OTHER_QID]: { question: 'Kept' } } })

    await fm.setQuizOverride(makeReq({ params: { qid: QID }, body: { question: 'New' } }), makeRes())

    expect(savedTo(CONFIG_KEYS.overrides)).toEqual({
      [OTHER_QID]: { question: 'Kept' },
      [QID]: { question: 'New' }
    })
  })

  test('a qid or a question number in the body is ignored, not stored', async () => {
    // `qid` is identity and `id` is the position the resolver assigns. Accepting
    // either would let a firm re-point its edit at a different question, or hand the
    // AI a number the grader then cannot look back up.
    mockKeys({})
    const res = makeRes()

    await fm.setQuizOverride(makeReq({ params: { qid: QID }, body: { qid: OTHER_QID, id: 4 } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('NO_FIELDS')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses an empty value on ANY field, not just the question', async () => {
    // Unlike the staircase, all three fields are load-bearing: a blank answer is a
    // marking guide with nothing in it, and it fails at the moment an advisor is
    // waiting for a grade rather than at the moment it is saved.
    for (const field of ['question', 'answer', 'keyPoint']) {
      mockKeys({})
      const res = makeRes()

      await fm.setQuizOverride(makeReq({ params: { qid: QID }, body: { [field]: '   ' } }), res)

      expect(res._status).toBe(400)
      expect(res._body.error.code).toBe('INVALID_FIELD')
    }
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a value longer than the stored limit', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setQuizOverride(makeReq({
      params: { qid: QID },
      body: { answer: 'x'.repeat(LIMITS.textChars + 1) }
    }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('FIELD_TOO_LONG')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a non-string field', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.setQuizOverride(makeReq({ params: { qid: QID }, body: { question: { evil: true } } }), res)

    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('404s on a question Advisor-e does not have', async () => {
    // An override keyed to an unknown qid is not a decision — loadFirmQuizState
    // treats it as junk, so storing one would leave the firm looking at a saved edit
    // that does nothing.
    mockKeys({})
    const res = makeRes()

    await fm.setQuizOverride(makeReq({ params: { qid: 'qz-999999' }, body: { question: 'x' } }), res)

    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

// ── Reset to Advisor-e's ──────────────────────────────────────────────────────

describe('DELETE /api/firm-manager/quizzes/platform/:qid', () => {
  test('drops the firm version so Advisor-e question applies again', async () => {
    mockKeys({ [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours' }, [OTHER_QID]: { question: 'Kept' } } })
    const res = makeRes()

    await fm.resetQuizOverride(makeReq({ params: { qid: QID } }), res)

    expect(res._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.overrides)).toEqual({ [OTHER_QID]: { question: 'Kept' } })
  })

  test('is idempotent — resetting something never edited is not an error', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.resetQuizOverride(makeReq({ params: { qid: QID } }), res)

    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('404s on a question Advisor-e does not have', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.resetQuizOverride(makeReq({ params: { qid: 'qz-999999' } }), res)

    expect(res._status).toBe(404)
  })
})

// ── Switch off / switch on ────────────────────────────────────────────────────

describe('PUT /api/firm-manager/quizzes/platform/:qid/decline', () => {
  test('switching off records the qid; switching on removes it', async () => {
    mockKeys({})
    await fm.setQuizDecline(makeReq({ params: { qid: QID }, body: { declined: true } }), makeRes())
    expect(savedTo(CONFIG_KEYS.declines)).toEqual([QID])

    jest.clearAllMocks()
    overlay.saveFirmConfig.mockResolvedValue(1)
    mockKeys({ [CONFIG_KEYS.declines]: [QID] })
    await fm.setQuizDecline(makeReq({ params: { qid: QID }, body: { declined: false } }), makeRes())
    expect(savedTo(CONFIG_KEYS.declines)).toEqual([])
  })

  test('an edit made earlier survives switching the question off and on again', async () => {
    // Switching off is not deleting. The firm's wording must still be there when
    // they change their mind, or "switch off" quietly becomes destructive.
    mockKeys({ [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours' } } })

    await fm.setQuizDecline(makeReq({ params: { qid: QID }, body: { declined: true } }), makeRes())

    expect(savedTo(CONFIG_KEYS.overrides)).toBeUndefined() // the overrides key was not touched
  })

  test('ALLOWS switching off every question in a bank — the opposite of the staircase', async () => {
    // Ruled in Phase 2: a bank with nothing left is dropped, so the course falls
    // through to AI-generated questions exactly as it does for a page that never had
    // a bank. Refusing here would block a decision the engine already handles.
    const allButLast = BANK_ENTRIES.slice(0, -1).map(e => e.qid)
    mockKeys({ [CONFIG_KEYS.declines]: allButLast })
    const res = makeRes()

    await fm.setQuizDecline(makeReq({
      params: { qid: BANK_ENTRIES[BANK_ENTRIES.length - 1].qid },
      body: { declined: true }
    }), res)

    expect(res._status).toBe(200)
  })

  test('and the bank really does disappear from what the engine reads', async () => {
    // The half that matters: the route allowing it is only correct because the
    // resolver drops the empty bank. Proven against the engine's own read path.
    mockKeys({ [CONFIG_KEYS.declines]: BANK_ENTRIES.map(e => e.qid) })

    const resolved = await loadBlendedQuizBanks(FIRM, overlay.loadFirmConfig)

    expect(resolved[BANK]).toBeUndefined()
    expect(Object.keys(resolved).length).toBe(BANK_KEYS.length - 1)
  })

  test('requires a boolean, and 404s on an unknown question', async () => {
    mockKeys({})
    const bad = makeRes()
    await fm.setQuizDecline(makeReq({ params: { qid: QID }, body: { declined: 'yes' } }), bad)
    expect(bad._status).toBe(400)
    expect(bad._body.error.code).toBe('INVALID_DECLINED')

    const missing = makeRes()
    await fm.setQuizDecline(makeReq({ params: { qid: 'qz-999999' }, body: { declined: true } }), missing)
    expect(missing._status).toBe(404)

    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

// ── The firm's own questions ──────────────────────────────────────────────────

describe('the firm own questions', () => {
  test('the server assigns the id — one supplied by the browser is ignored', async () => {
    // An id from the browser could collide with one of Advisor-e's questions and
    // silently replace it.
    mockKeys({})
    const res = makeRes()

    await fm.addOwnQuizQuestion(makeReq({ body: newQuestion({ id: QID }) }), res)

    expect(res._status).toBe(201)
    expect(res._body.id).toBe('fq-1')
    expect(savedTo(CONFIG_KEYS.own)).toEqual([{
      id: 'fq-1',
      bank: BANK,
      question: 'What does our firm ask first?',
      answer: 'What the client actually wants.',
      keyPoint: 'Start from the client, not the numbers.'
    }])
  })

  test('a new id is highest-so-far plus one, never the row count', async () => {
    // Reusing a deleted question's id would hand the new question the decisions
    // recorded against the old one.
    mockKeys({ [CONFIG_KEYS.own]: [{ id: 'fq-3', bank: BANK, question: 'Kept', answer: 'a', keyPoint: 'k' }] })
    const res = makeRes()

    await fm.addOwnQuizQuestion(makeReq({ body: newQuestion() }), res)

    expect(res._body.id).toBe('fq-4')
  })

  test('the page is stored as the library spells it, not as it was typed', async () => {
    // resolveTemplateName absorbs case and punctuation noise but refuses a genuine
    // near-miss. Storing the typed string instead would leave a firm with a bank key
    // no reader ever looks up.
    mockKeys({})
    const res = makeRes()

    await fm.addOwnQuizQuestion(makeReq({ body: newQuestion({ bank: `  ${BANK.toLowerCase()}!  ` }) }), res)

    expect(res._status).toBe(201)
    expect(res._body.bank).toBe(BANK)
    expect(savedTo(CONFIG_KEYS.own)[0].bank).toBe(BANK)
  })

  test('needs all three fields, not just one', async () => {
    // An edit may carry one field; an ADDED question may not. A question with no
    // answer reaches an advisor as something the grader cannot mark.
    mockKeys({})
    const res = makeRes()

    await fm.addOwnQuizQuestion(makeReq({ body: { bank: BANK, question: 'Only this' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INCOMPLETE_QUESTION')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('needs the page it belongs to', async () => {
    mockKeys({})
    const res = makeRes()

    const body = newQuestion()
    delete body.bank
    await fm.addOwnQuizQuestion(makeReq({ body }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_BANK')
  })

  test('404s rather than guessing when the page name does not match the library', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.addOwnQuizQuestion(makeReq({ body: newQuestion({ bank: 'A Page We Never Shipped' }) }), res)

    expect(res._status).toBe(404)
    expect(res._body.error.code).toBe('NO_SUCH_PAGE')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses to grow one bank past the stored limit', async () => {
    const full = Array.from({ length: LIMITS.entriesPerBank }, (_, i) => ({
      id: `fq-${i + 1}`, bank: BANK, question: 'q', answer: 'a', keyPoint: 'k'
    }))
    mockKeys({ [CONFIG_KEYS.own]: full })
    const res = makeRes()

    await fm.addOwnQuizQuestion(makeReq({ body: newQuestion() }), res)

    expect(res._status).toBe(409)
    expect(res._body.error.code).toBe('BANK_FULL')
  })

  test('a question of the firm own can be edited and removed', async () => {
    mockKeys({ [CONFIG_KEYS.own]: [{ id: 'fq-1', bank: BANK, question: 'Ours', answer: 'old', keyPoint: 'k' }] })
    const edit = makeRes()
    await fm.updateOwnQuizQuestion(makeReq({ params: { id: 'fq-1' }, body: { answer: 'new' } }), edit)
    expect(edit._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.own)[0]).toEqual({ id: 'fq-1', bank: BANK, question: 'Ours', answer: 'new', keyPoint: 'k' })

    jest.clearAllMocks()
    overlay.saveFirmConfig.mockResolvedValue(1)
    mockKeys({
      [CONFIG_KEYS.own]: [
        { id: 'fq-1', bank: BANK, question: 'Ours', answer: 'a', keyPoint: 'k' },
        { id: 'fq-2', bank: BANK, question: 'Other', answer: 'a', keyPoint: 'k' }
      ]
    })
    const del = makeRes()
    await fm.deleteOwnQuizQuestion(makeReq({ params: { id: 'fq-1' } }), del)
    expect(del._status).toBe(200)
    expect(savedTo(CONFIG_KEYS.own)).toEqual([{ id: 'fq-2', bank: BANK, question: 'Other', answer: 'a', keyPoint: 'k' }])
  })

  test('an edit cannot move a question to another page', async () => {
    // The id would travel with it, and any decision recorded against that id would
    // follow it to a page nobody expected.
    mockKeys({ [CONFIG_KEYS.own]: [{ id: 'fq-1', bank: BANK, question: 'Ours', answer: 'a', keyPoint: 'k' }] })

    await fm.updateOwnQuizQuestion(makeReq({
      params: { id: 'fq-1' },
      body: { question: 'Changed', bank: BANK_KEYS[1] }
    }), makeRes())

    expect(savedTo(CONFIG_KEYS.own)[0].bank).toBe(BANK)
  })

  test('editing or removing a question that is not the firm own 404s', async () => {
    mockKeys({ [CONFIG_KEYS.own]: [] })
    const edit = makeRes()
    await fm.updateOwnQuizQuestion(makeReq({ params: { id: 'fq-9' }, body: { question: 'x' } }), edit)
    expect(edit._status).toBe(404)

    // A platform question is switched off, never deleted — so it is not found here.
    const del = makeRes()
    await fm.deleteOwnQuizQuestion(makeReq({ params: { id: QID } }), del)
    expect(del._status).toBe(404)

    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

// ── Carrying the OLD whole-bank storage forward ───────────────────────────────
//
// The gap these close. The reader consults the old `quiz-banks` key ONLY while the
// firm has made no decision the mechanism recognises — so without a carry-over the
// firm's very first click would switch the old shape off for good and everything
// saved there would stop reaching its advisors, silently, with the screen still
// showing a saved state.
//
// These tests use a STATEFUL store rather than the fixed mock above, because that
// is the property under test: the carry-over writes, and the handler must then read
// back what it wrote. A store that always answers with the original would let a
// broken carry-over pass.

describe('a firm still on the old whole-bank storage', () => {
  const PLATFORM_Q = BANK_ENTRIES[0]

  /** A saved copy of the platform bank with question 1 reworded and one added. */
  function legacyOverlay () {
    return {
      [BANK]: {
        entries: [
          { id: 1, question: 'Our reworded first question', answer: PLATFORM_Q.answer, keyPoint: PLATFORM_Q.keyPoint },
          ...BANK_ENTRIES.slice(1).map((e, i) => ({ id: i + 2, question: e.question, answer: e.answer, keyPoint: e.keyPoint })),
          { id: BANK_ENTRIES.length + 1, question: 'A question we added ourselves', answer: 'Our answer.', keyPoint: 'Our point.' }
        ]
      }
    }
  }

  /** A store that answers with whatever was last written to it, as MySQL would. */
  function statefulStore (initial) {
    const store = { ...initial }
    overlay.loadFirmConfig.mockImplementation((firmId, key) =>
      Promise.resolve(Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null))
    overlay.saveFirmConfig.mockImplementation((firmId, key, value) => {
      store[key] = value
      return Promise.resolve(1)
    })
    return store
  }

  test('its saved wording survives the first switch-off, instead of vanishing', async () => {
    const store = statefulStore({ [CONFIG_KEYS.legacy]: legacyOverlay() })

    await fm.setQuizDecline(makeReq({ params: { qid: OTHER_QID }, body: { declined: true } }), makeRes())

    // The reworded question is now a real override, and the added one a real row.
    expect(store[CONFIG_KEYS.overrides][PLATFORM_Q.qid]).toEqual({ question: 'Our reworded first question' })
    expect(store[CONFIG_KEYS.own]).toEqual([
      { id: 'fq-1', bank: BANK, question: 'A question we added ourselves', answer: 'Our answer.', keyPoint: 'Our point.' }
    ])
    // And the decision that triggered it is stored too, not lost to the carry-over.
    expect(store[CONFIG_KEYS.declines]).toEqual([OTHER_QID])
  })

  test('and the engine still serves that wording afterwards — the point of the exercise', async () => {
    const store = statefulStore({ [CONFIG_KEYS.legacy]: legacyOverlay() })
    const before = await loadBlendedQuizBanks(FIRM, overlay.loadFirmConfig)

    await fm.setQuizDecline(makeReq({ params: { qid: OTHER_QID }, body: { declined: true } }), makeRes())
    const after = await loadBlendedQuizBanks(FIRM, overlay.loadFirmConfig)

    const texts = banks => banks[BANK].entries.map(e => e.question)
    expect(texts(before)).toContain('Our reworded first question')
    expect(texts(before)).toContain('A question we added ourselves')
    // Unchanged by the decision, which was about a question in a DIFFERENT bank.
    expect(texts(after)).toEqual(texts(before))
    expect(store[CONFIG_KEYS.legacy]).toBeDefined() // the old key is kept, not deleted
  })

  test('an edit made in the new screen lands on top of the carried wording', async () => {
    const store = statefulStore({ [CONFIG_KEYS.legacy]: legacyOverlay() })

    await fm.setQuizOverride(makeReq({
      params: { qid: PLATFORM_Q.qid },
      body: { answer: 'A better answer.' }
    }), makeRes())

    // Both survive: the carried question wording and the answer just typed.
    expect(store[CONFIG_KEYS.overrides][PLATFORM_Q.qid]).toEqual({
      question: 'Our reworded first question',
      answer: 'A better answer.'
    })
  })

  test('a question carried across can then be removed by the id it was given', async () => {
    // Without the carry-over this 404s on a question the firm can plainly see.
    const store = statefulStore({ [CONFIG_KEYS.legacy]: legacyOverlay() })
    const res = makeRes()

    await fm.deleteOwnQuizQuestion(makeReq({ params: { id: 'fq-1' } }), res)

    expect(res._status).toBe(200)
    expect(store[CONFIG_KEYS.own]).toEqual([])
  })

  test('runs once — a firm that has already decided something is not re-carried', async () => {
    // The old copy is stale by then. Re-applying it would resurrect wording the firm
    // has since changed, every time they clicked.
    const store = statefulStore({
      [CONFIG_KEYS.legacy]: legacyOverlay(),
      [CONFIG_KEYS.declines]: [OTHER_QID]
    })

    await fm.setQuizDecline(makeReq({ params: { qid: QID }, body: { declined: true } }), makeRes())

    expect(store[CONFIG_KEYS.overrides]).toBeUndefined()
    expect(store[CONFIG_KEYS.own]).toBeUndefined()
    expect(store[CONFIG_KEYS.declines]).toEqual([OTHER_QID, QID])
  })

  test('a firm with nothing stored at all is left alone', async () => {
    // No legacy row, no decisions — the carry-over must not write empty keys and
    // litter the version history of storage the firm has never used.
    const store = statefulStore({})

    await fm.setQuizDecline(makeReq({ params: { qid: QID }, body: { declined: true } }), makeRes())

    expect(Object.keys(store)).toEqual([CONFIG_KEYS.declines])
  })
})

// ── What the tab is given to draw ─────────────────────────────────────────────

describe('GET /api/firm-manager/quizzes', () => {
  test('returns the resolved banks the course engine actually reads', async () => {
    // The management screen and the course must never show different questions. The
    // defect closed on this exact feature was that they did — so this is asserted
    // against the engine's own read path rather than against a copy of its logic.
    mockKeys({
      [CONFIG_KEYS.declines]: [BANK_ENTRIES[0].qid],
      [CONFIG_KEYS.overrides]: { [OTHER_QID]: { question: 'Our wording' } }
    })
    const res = makeRes()

    await fm.getQuizzes(makeReq(), res)
    const engine = await loadBlendedQuizBanks(FIRM, overlay.loadFirmConfig)

    expect(res._status).toBe(200)
    expect(res._body.resolved).toEqual(engine)
    expect(res._body.hasDecisions).toBe(true)
    expect(res._body.state.declinedIds).toEqual([BANK_ENTRIES[0].qid])
  })

  test('a switched-off question is gone and the rest close the numbering gap', async () => {
    // The positional `id` is what the AI is shown and what the grader looks back up.
    // A gap would have the model offered Entry 1, 3, 4 and the grader hunting for a
    // number nobody gave it.
    mockKeys({ [CONFIG_KEYS.declines]: [BANK_ENTRIES[0].qid] })
    const res = makeRes()

    await fm.getQuizzes(makeReq(), res)

    const entries = res._body.resolved[BANK].entries
    expect(entries.map(e => e.qid)).not.toContain(BANK_ENTRIES[0].qid)
    expect(entries.map(e => e.id)).toEqual(entries.map((_, i) => i + 1))
  })

  test('a firm that has decided nothing is told so, and gets Advisor-e banks tagged', async () => {
    // The tagging is not cosmetic: the engine's fencing check fails CLOSED, so an
    // untagged bank would fence Advisor-e's own questions and quietly change the
    // tuned prompt for every firm.
    mockKeys({})
    const res = makeRes()

    await fm.getQuizzes(makeReq(), res)

    expect(res._body.hasDecisions).toBe(false)
    expect(res._body.hasOverride).toBe(false)
    expect(Object.keys(res._body.resolved).length).toBe(BANK_KEYS.length)
    expect(res._body.resolved[BANK].entries.every(e => e.source === 'platform')).toBe(true)
  })

  test('the old whole-bank view is still returned, so the current screen is untouched', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.getQuizzes(makeReq(), res)

    expect(Object.keys(res._body.merged).length).toBe(BANK_KEYS.length)
    expect(res._body.merged[BANK].origin).toBe('platform')
    expect(Array.isArray(res._body.pages)).toBe(true)
  })
})

// ── Phase 4: Adopt / Keep mine (2026-08-01) ──────────────────────────────────
//
// A firm that edits one of Advisor-e's questions is deliberately shielded from our
// later improvements to it. What must be proven here is not that a signature gets
// stored, but that the firm is asked exactly when Advisor-e genuinely changed the
// question, never when it did not, and that each of the two answers actually settles
// it. Ported from the staircase's Phase 3 tests, case for case.

// Hardcoded rather than imported on purpose — the storage key is a contract, and a
// rename that silently orphaned every firm's baselines would show up here.
const QUIZ_BASELINES_KEY = 'quiz-override-baselines'

describe('platform-update drift on an edited question', () => {
  test('editing a question stamps a baseline, and that baseline reports no drift', async () => {
    mockKeys({})
    await fm.setQuizOverride(makeReq({ params: { qid: QID }, body: { question: 'Ours?' } }), makeRes())

    const stamped = savedTo(QUIZ_BASELINES_KEY)
    expect(stamped).toHaveProperty(QID)

    // Feed the stamp straight back: nothing about Advisor-e's question has changed.
    jest.clearAllMocks()
    overlay.saveFirmConfig.mockResolvedValue(1)
    mockKeys({ [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours?' } }, [QUIZ_BASELINES_KEY]: stamped })
    const res = makeRes()

    await fm.getQuizzes(makeReq(), res)

    expect(res._body.driftQids).toEqual([])
  })

  test('a baseline that no longer matches the platform is reported as drift', async () => {
    mockKeys({
      [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours?' } },
      [QUIZ_BASELINES_KEY]: { [QID]: 'the wording as it stood when they edited' }
    })
    const res = makeRes()

    await fm.getQuizzes(makeReq(), res)

    expect(res._body.driftQids).toEqual([QID])
  })

  test('an edit with NO baseline is backfilled, not reported as an update', async () => {
    // An edit made before Phase 4 existed carries no stamp. Reading that as "Advisor-e
    // changed this" would greet the firm with a review prompt for an update that never
    // happened — on every question it had ever edited, at once.
    mockKeys({ [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours?' } } })
    const res = makeRes()

    await fm.getQuizzes(makeReq(), res)

    expect(res._body.driftQids).toEqual([])
    expect(savedTo(QUIZ_BASELINES_KEY)).toHaveProperty(QID)
  })

  test('a question the firm never edited is never reported, whatever is stored', async () => {
    // Nothing is shielded, so Advisor-e's wording already reaches them: there is no
    // choice left to offer.
    mockKeys({ [QUIZ_BASELINES_KEY]: { [QID]: 'stale' } })
    const res = makeRes()

    await fm.getQuizzes(makeReq(), res)

    expect(res._body.driftQids).toEqual([])
  })

  test('an override on a qid Advisor-e no longer ships is not offered as an update', async () => {
    // There is nothing to compare against and nothing to adopt. loadFirmQuizState
    // already treats such an override as junk rather than a decision; reporting it
    // here would make this the one place in the app that disagreed.
    mockKeys({
      [CONFIG_KEYS.overrides]: { 'qz-retired-question': { question: 'Ours?' } },
      [QUIZ_BASELINES_KEY]: { 'qz-retired-question': 'stale' }
    })
    const res = makeRes()

    await fm.getQuizzes(makeReq(), res)

    expect(res._body.driftQids).toEqual([])
  })

  test('resetting a question drops its baseline with the edit', async () => {
    mockKeys({
      [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours?' } },
      [QUIZ_BASELINES_KEY]: { [QID]: 'stale', [OTHER_QID]: 'kept' }
    })

    await fm.resetQuizOverride(makeReq({ params: { qid: QID } }), makeRes())

    expect(savedTo(QUIZ_BASELINES_KEY)).toEqual({ [OTHER_QID]: 'kept' })
  })

  test('a second edited question is not swept in with the one that drifted', async () => {
    mockKeys({
      [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours?' }, [OTHER_QID]: { question: 'Also ours?' } },
      [QUIZ_BASELINES_KEY]: { [QID]: 'stale' }
    })
    const res = makeRes()

    await fm.getQuizzes(makeReq(), res)

    // OTHER_QID carried no stamp, so it is backfilled as in-sync rather than joining QID.
    expect(res._body.driftQids).toEqual([QID])
  })
})

describe('POST /api/firm-manager/quizzes/platform/:qid/keep-mine', () => {
  test('re-stamps the baseline so the prompt clears, leaving the edit alone', async () => {
    mockKeys({
      [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours?' } },
      [QUIZ_BASELINES_KEY]: { [QID]: 'stale' }
    })
    const res = makeRes()

    await fm.keepMineQuizQuestion(makeReq({ params: { qid: QID } }), res)

    expect(res._status).toBe(200)
    expect(res._body.keptMine).toBe(true)
    // The firm's wording is untouched — only the baseline moved.
    expect(savedTo(CONFIG_KEYS.overrides)).toBeUndefined()

    const stamped = savedTo(QUIZ_BASELINES_KEY)
    expect(stamped[QID]).not.toBe('stale')

    // And the prompt is genuinely gone, not merely re-stamped.
    jest.clearAllMocks()
    overlay.saveFirmConfig.mockResolvedValue(1)
    mockKeys({ [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours?' } }, [QUIZ_BASELINES_KEY]: stamped })
    const after = makeRes()

    await fm.getQuizzes(makeReq(), after)

    expect(after._body.driftQids).toEqual([])
  })

  test('409s when the firm holds no version to keep', async () => {
    // Stamping a baseline for a question the firm does not override would arm a
    // prompt that can never fire.
    mockKeys({})
    const res = makeRes()

    await fm.keepMineQuizQuestion(makeReq({ params: { qid: QID } }), res)

    expect(res._status).toBe(409)
    expect(res._body.error.code).toBe('NOT_OVERRIDDEN')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('404s on a question Advisor-e does not have', async () => {
    mockKeys({})
    const res = makeRes()

    await fm.keepMineQuizQuestion(makeReq({ params: { qid: 'qz-invented' } }), res)

    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('keeps only the question asked about, leaving other baselines alone', async () => {
    mockKeys({
      [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours?' } },
      [QUIZ_BASELINES_KEY]: { [QID]: 'stale', [OTHER_QID]: 'untouched' }
    })

    await fm.keepMineQuizQuestion(makeReq({ params: { qid: QID } }), makeRes())

    expect(savedTo(QUIZ_BASELINES_KEY)[OTHER_QID]).toBe('untouched')
  })
})

describe('the quiz drift signature', () => {
  test('a question moving position is not an update — only its wording counts', async () => {
    // `id` is a POSITION the resolver reassigns whenever a question above it is
    // switched off. Signing it would tell a firm Advisor-e had rewritten a question
    // that the FIRM itself had renumbered by switching a different one off.
    mockKeys({})
    await fm.setQuizOverride(makeReq({ params: { qid: QID }, body: { question: 'Ours?' } }), makeRes())
    const stamped = savedTo(QUIZ_BASELINES_KEY)

    jest.clearAllMocks()
    overlay.saveFirmConfig.mockResolvedValue(1)
    mockKeys({
      // Another question in the same bank is switched off, renumbering this one.
      [CONFIG_KEYS.declines]: [BANK_ENTRIES[1].qid],
      [CONFIG_KEYS.overrides]: { [QID]: { question: 'Ours?' } },
      [QUIZ_BASELINES_KEY]: stamped
    })
    const res = makeRes()

    await fm.getQuizzes(makeReq(), res)

    expect(res._body.driftQids).toEqual([])
  })

  test('every field a firm may edit is signed, so any of them drifting is caught', async () => {
    // A field left out of the signature is a field Advisor-e could rewrite without the
    // firm ever being told. Proven per field rather than in aggregate, so adding a
    // fourth editable field and forgetting the signature fails here.
    const { EDITABLE_QUESTION_FIELDS } = require('../../server/utils/firmQuizzes')
    const platformRow = BANK_ENTRIES[0]

    mockKeys({})
    await fm.setQuizOverride(makeReq({ params: { qid: QID }, body: { question: 'Ours?' } }), makeRes())
    const stamped = savedTo(QUIZ_BASELINES_KEY)[QID]

    for (const field of EDITABLE_QUESTION_FIELDS) {
      // Rebuild the signature with exactly one field moved. It must differ from the
      // stamp, which is only true if that field is part of what gets signed.
      const moved = JSON.stringify(
        EDITABLE_QUESTION_FIELDS.reduce((acc, f) => {
          acc[f] = f === field
            ? 'CHANGED BY ADVISOR-E'
            : String(platformRow[f] === null || platformRow[f] === undefined ? '' : platformRow[f]).trim()
          return acc
        }, {})
      )
      expect(stamped).not.toBe(moved)
    }

    // And the control: rebuilt with NOTHING moved, it must MATCH — otherwise the loop
    // above would pass even if the signature were of something else entirely.
    const unmoved = JSON.stringify(
      EDITABLE_QUESTION_FIELDS.reduce((acc, f) => {
        acc[f] = String(platformRow[f] === null || platformRow[f] === undefined ? '' : platformRow[f]).trim()
        return acc
      }, {})
    )
    expect(stamped).toBe(unmoved)
  })
})
