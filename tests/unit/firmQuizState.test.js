'use strict'

// A firm's quiz DECISIONS — the storage half of quizzes joining the one mechanism.
//
// The legacy adapter is the part worth reading carefully. Before this change a save
// stored a whole COPY of a bank, replacing Advisor-e's outright. No such row is
// known to exist, but the save route is live, and reading an old copy as decisions
// is what stops a firm's saved wording being thrown away because the storage shape
// changed underneath them.

const fs = require('fs')
const {
  CONFIG_KEYS,
  FIRM_QUESTION_PREFIX,
  adaptLegacyWholeConfig,
  loadFirmQuizState
} = require('../../server/utils/firmQuizzes')

const loaderFor = byKey => jest.fn((firmId, key) => Promise.resolve(byKey[key]))

const BASE = {
  'Bank One': {
    entries: [
      { id: 1, qid: 'qz-1', question: 'Q1', answer: 'A1', keyPoint: 'K1' },
      { id: 2, qid: 'qz-2', question: 'Q2', answer: 'A2', keyPoint: 'K2' },
      { id: 3, qid: 'qz-3', question: 'Q3', answer: 'A3', keyPoint: 'K3' }
    ]
  }
}

describe('loadFirmQuizState', () => {
  it('returns an empty state with no firm id, and never touches the store', async () => {
    const loader = jest.fn()
    expect(await loadFirmQuizState(null, loader, BASE)).toEqual({
      declinedIds: [], overrides: {}, ownRows: [], fromLegacy: false
    })
    expect(loader).not.toHaveBeenCalled()
  })

  it('shapes declines, overrides and own rows from the store', async () => {
    const state = await loadFirmQuizState('firm-A', loaderFor({
      [CONFIG_KEYS.declines]: ['qz-2'],
      [CONFIG_KEYS.overrides]: { 'qz-1': { question: 'ours' } },
      [CONFIG_KEYS.own]: [{ id: 'fq-1', bank: 'Bank One', question: 'Q', answer: 'A', keyPoint: 'K' }]
    }), BASE)

    expect(state.declinedIds).toEqual(['qz-2'])
    expect(state.overrides).toEqual({ 'qz-1': { question: 'ours' } })
    expect(state.ownRows).toHaveLength(1)
    expect(state.fromLegacy).toBe(false)
  })

  it('coerces wrong-typed stored values to safe empties', async () => {
    const state = await loadFirmQuizState('firm-A', loaderFor({
      [CONFIG_KEYS.declines]: 'not-an-array',
      [CONFIG_KEYS.overrides]: ['not', 'an', 'object'],
      [CONFIG_KEYS.own]: { not: 'an-array' }
    }), BASE)
    expect(state).toEqual({ declinedIds: [], overrides: {}, ownRows: [], fromLegacy: false })
  })

  it('reads the legacy whole-bank copy when the firm has made no new decision', async () => {
    const state = await loadFirmQuizState('firm-A', loaderFor({
      [CONFIG_KEYS.legacy]: {
        'Bank One': {
          entries: [
            { id: 1, question: 'Q1', answer: 'A1', keyPoint: 'K1' },
            { id: 2, question: 'THE FIRM REWORDED THIS', answer: 'A2', keyPoint: 'K2' },
            { id: 3, question: 'Q3', answer: 'A3', keyPoint: 'K3' }
          ]
        }
      }
    }), BASE)

    expect(state.fromLegacy).toBe(true)
    expect(state.overrides).toEqual({ 'qz-2': { question: 'THE FIRM REWORDED THIS' } })
  })

  it('a new-shape decision wins — the legacy copy is then ignored', async () => {
    const state = await loadFirmQuizState('firm-A', loaderFor({
      [CONFIG_KEYS.declines]: ['qz-3'],
      [CONFIG_KEYS.legacy]: { 'Bank One': { entries: [{ id: 1, question: 'X', answer: 'Y', keyPoint: 'Z' }] } }
    }), BASE)

    expect(state.fromLegacy).toBe(false)
    expect(state.declinedIds).toEqual(['qz-3'])
    expect(state.overrides).toEqual({})
  })

  it('an override keyed to no real question does not count as a decision', async () => {
    // Junk in storage must not suppress the legacy read and lose real saved work.
    const state = await loadFirmQuizState('firm-A', loaderFor({
      [CONFIG_KEYS.overrides]: { 'qz-nonexistent': { question: 'stray' } },
      [CONFIG_KEYS.legacy]: {
        'Bank One': {
          entries: [
            { id: 1, question: 'REAL SAVED WORK', answer: 'A1', keyPoint: 'K1' },
            { id: 2, question: 'Q2', answer: 'A2', keyPoint: 'K2' },
            { id: 3, question: 'Q3', answer: 'A3', keyPoint: 'K3' }
          ]
        }
      }
    }), BASE)

    expect(state.fromLegacy).toBe(true)
    expect(state.overrides).toEqual({ 'qz-1': { question: 'REAL SAVED WORK' } })
  })

  it('production rejects on a store failure — it never reads a stand-in file', async () => {
    jest.resetModules()
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const prod = require('../../server/utils/firmQuizzes')
      const realRead = fs.readFileSync
      const isDevFile = p => typeof p === 'string' && p.includes('dev-firm-quiz')
      const readSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((p, ...rest) =>
        isDevFile(p) ? JSON.stringify({ 'firm-A': ['qz-1'] }) : realRead(p, ...rest))

      await expect(
        prod.loadFirmQuizState('firm-A', () => Promise.reject(new Error('no db')), BASE)
      ).rejects.toThrow('no db')
      expect(readSpy.mock.calls.filter(([p]) => isDevFile(p))).toHaveLength(0)

      readSpy.mockRestore()
    } finally {
      process.env.NODE_ENV = prevEnv
      jest.resetModules()
    }
  })
})

describe('adaptLegacyWholeConfig', () => {
  it('an identical copy is not an edit — nothing is carried across', () => {
    // Recording it as an edit would stop those questions tracking Advisor-e's
    // later wording fixes, for no reason the firm ever asked for.
    const legacy = { 'Bank One': { entries: BASE['Bank One'].entries.map(e => ({ ...e })) } }
    expect(adaptLegacyWholeConfig(BASE, legacy)).toEqual({ declinedIds: [], overrides: {}, ownRows: [] })
  })

  it('questions the copy does not reach were REMOVED by the firm, so they decline', () => {
    // Wholesale replacement means absence was deliberate. Carrying them back in
    // would resurrect questions the firm dropped on purpose.
    const legacy = { 'Bank One': { entries: [{ id: 1, question: 'Q1', answer: 'A1', keyPoint: 'K1' }] } }
    expect(adaptLegacyWholeConfig(BASE, legacy).declinedIds).toEqual(['qz-2', 'qz-3'])
  })

  it('questions beyond Advisor-e\'s list become the firm\'s own, keyed by bank', () => {
    const legacy = {
      'Bank One': {
        entries: [
          ...BASE['Bank One'].entries.map(e => ({ ...e })),
          { id: 4, question: 'THEIRS', answer: 'A4', keyPoint: 'K4' }
        ]
      }
    }
    const out = adaptLegacyWholeConfig(BASE, legacy)
    expect(out.ownRows).toEqual([{
      id: `${FIRM_QUESTION_PREFIX}1`, bank: 'Bank One', question: 'THEIRS', answer: 'A4', keyPoint: 'K4'
    }])
  })

  it('a whole bank Advisor-e does not ship becomes the firm\'s own questions', () => {
    const legacy = { 'Their Own Page': { entries: [{ id: 1, question: 'Q', answer: 'A', keyPoint: 'K' }] } }
    const out = adaptLegacyWholeConfig(BASE, legacy)
    expect(out.ownRows).toHaveLength(1)
    expect(out.ownRows[0].bank).toBe('Their Own Page')
    expect(out.declinedIds).toEqual([])
  })

  it('a malformed stored question is skipped, never turned into a real one', () => {
    // Junk storage must not put a blank question in front of an advisor.
    const legacy = { 'Their Own Page': { entries: [{ id: 1, question: '   ', answer: '', keyPoint: null }] } }
    expect(adaptLegacyWholeConfig(BASE, legacy).ownRows).toEqual([])
  })

  it('nothing stored, or the wrong shape, yields an empty state', () => {
    for (const bad of [null, undefined, 'a string', ['an array'], 42]) {
      expect(adaptLegacyWholeConfig(BASE, bad)).toEqual({ declinedIds: [], overrides: {}, ownRows: [] })
    }
  })
})
