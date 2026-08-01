'use strict'

// The firm's effective quiz banks — quizzes on the one mechanism (2026-07-31).
//
// Two properties matter more than the rest and are asserted first: a firm that has
// decided nothing must get byte-identical prompt material to before (the tuned
// CB-29/CB-30 behaviour rides on it), and a firm's saved decisions must actually
// reach the AI — the defect this file closed, where the engine read the shipped
// file directly and a firm's saved quizzes were shown on screen but never used.

const {
  QUIZ_SOURCE_LABELS,
  baseBanks,
  isFirmAuthored,
  blendQuizBanks,
  resolveBankEntries,
  loadBlendedQuizBanks
} = require('../../server/utils/quizConfig')

const BASE_QUIZZES = require('../../data/course-quizzes.json')

const FIRM = 'firm-test-quiz'
const BANK_KEY = Object.keys(BASE_QUIZZES.banks).filter(k => !k.startsWith('_'))[0]

/** A loader stub resolving a value per config key (mirrors firmOverlay.loadFirmConfig). */
const loaderFor = byKey => jest.fn((firmId, key) => Promise.resolve(byKey[key]))
const emptyLoader = () => loaderFor({})

/** The generation-prompt line the engine builds per question (courseEngine.js). */
const promptLine = e => `Entry ${e.id}\nQuestion: ${e.question}\nKey point: ${e.keyPoint}`

describe('baseBanks', () => {
  it('drops the _comment documentation keys', () => {
    expect(Object.keys(baseBanks()).some(k => k.startsWith('_'))).toBe(false)
  })

  it('tags every question platform — an untagged one would be fenced as the firm\'s', () => {
    const untagged = []
    for (const [key, bank] of Object.entries(baseBanks())) {
      for (const e of bank.entries) {
        if (e.source !== QUIZ_SOURCE_LABELS.inherited) { untagged.push(`${key} #${e.id}`) }
      }
    }
    expect(untagged).toEqual([])
  })

  it('leaves the question text and numbering exactly as shipped', () => {
    const shipped = BASE_QUIZZES.banks[BANK_KEY].entries
    const served = baseBanks()[BANK_KEY].entries
    expect(served.map(promptLine)).toEqual(shipped.map(promptLine))
  })
})

describe('isFirmAuthored', () => {
  it('is false for a platform question and true for both firm kinds', () => {
    expect(isFirmAuthored({ source: 'platform' })).toBe(false)
    expect(isFirmAuthored({ source: 'firm-override' })).toBe(true)
    expect(isFirmAuthored({ source: 'firm-own' })).toBe(true)
  })

  it('FAILS CLOSED — a question with no provenance is treated as the firm\'s', () => {
    // Under-fencing is the prompt-injection route; over-fencing only costs tuning.
    expect(isFirmAuthored({ question: 'no source field' })).toBe(true)
  })
})

describe('resolveBankEntries', () => {
  const entries = [
    { id: 1, qid: 'qz-a', question: 'Q1', answer: 'A1', keyPoint: 'K1' },
    { id: 2, qid: 'qz-b', question: 'Q2', answer: 'A2', keyPoint: 'K2' },
    { id: 3, qid: 'qz-c', question: 'Q3', answer: 'A3', keyPoint: 'K3' }
  ]

  it('passes questions through untouched when the firm has decided nothing', () => {
    const out = resolveBankEntries(entries, {})
    expect(out.map(e => e.qid)).toEqual(['qz-a', 'qz-b', 'qz-c'])
    expect(out.map(e => e.id)).toEqual([1, 2, 3])
    expect(out.every(e => e.source === 'platform')).toBe(true)
  })

  it('a declined question drops out AND the rest close the gap', () => {
    // The numbering is what the AI is shown as "Entry N" and hands back as
    // bankRef. A gap would show it Entry 1, 3 and send the grader hunting.
    const out = resolveBankEntries(entries, { declinedIds: ['qz-b'] })
    expect(out.map(e => e.qid)).toEqual(['qz-a', 'qz-c'])
    expect(out.map(e => e.id)).toEqual([1, 2])
  })

  it('an override replaces the wording but never the identity', () => {
    const out = resolveBankEntries(entries, { overrides: { 'qz-b': { question: 'OUR WORDING' } } })
    expect(out[1].question).toBe('OUR WORDING')
    expect(out[1].answer).toBe('A2') // untouched fields still track Advisor-e
    expect(out[1].qid).toBe('qz-b')
    expect(out[1].source).toBe('firm-override')
  })

  it('the firm\'s own questions come after Advisor-e\'s, numbered on', () => {
    const out = resolveBankEntries(entries, {
      ownRows: [{ id: 'fq-1', qid: 'fq-1', question: 'OURS', answer: 'A', keyPoint: 'K' }]
    })
    expect(out.map(e => e.id)).toEqual([1, 2, 3, 4])
    expect(out[3].source).toBe('firm-own')
    expect(out[3].qid).toBe('fq-1')
  })

  it('a question with no qid is skipped rather than guessed at', () => {
    const out = resolveBankEntries([...entries, { id: 4, question: 'no qid' }], {})
    expect(out).toHaveLength(3)
  })
})

describe('blendQuizBanks', () => {
  const base = {
    'Bank One': {
      source: 'x.pdf',
      entries: [
        { id: 1, qid: 'qz-a', question: 'Q1', answer: 'A1', keyPoint: 'K1' },
        { id: 2, qid: 'qz-b', question: 'Q2', answer: 'A2', keyPoint: 'K2' }
      ]
    }
  }

  it('a bank with every question switched off DISAPPEARS, rather than arriving empty', () => {
    // An empty bank would tell the AI "build every question from the bank above"
    // and give it nothing. Dropping it falls through to AI generation, exactly as
    // for a page that never had a quiz.
    const out = blendQuizBanks(base, { declinedIds: ['qz-a', 'qz-b'] })
    expect(out['Bank One']).toBeUndefined()
  })

  it('a firm can add a quiz to a page Advisor-e ships none for', () => {
    const out = blendQuizBanks(base, {
      ownRows: [{ id: 'fq-1', bank: 'A Page With No Quiz', question: 'Q', answer: 'A', keyPoint: 'K' }]
    })
    expect(out['A Page With No Quiz'].entries).toHaveLength(1)
    expect(out['A Page With No Quiz'].entries[0].source).toBe('firm-own')
    expect(out['Bank One'].entries).toHaveLength(2) // untouched
  })

  it('an own row naming no bank is ignored — it belongs nowhere', () => {
    const out = blendQuizBanks(base, { ownRows: [{ id: 'fq-1', question: 'Q', answer: 'A', keyPoint: 'K' }] })
    expect(Object.keys(out)).toEqual(['Bank One'])
  })

  it('the bank\'s own metadata survives the blend', () => {
    const out = blendQuizBanks(base, { overrides: { 'qz-a': { question: 'edited' } } })
    expect(out['Bank One'].source).toBe('x.pdf')
  })
})

describe('loadBlendedQuizBanks', () => {
  it('serves the platform banks unchanged when there is no firm id', async () => {
    const loader = jest.fn()
    const banks = await loadBlendedQuizBanks(null, loader)
    expect(banks).toEqual(baseBanks())
    expect(loader).not.toHaveBeenCalled()
  })

  it('serves the platform banks when the firm has decided nothing — byte-identical', async () => {
    // The regression that would be invisible: every firm without quiz decisions
    // must get exactly the prompt material they got before this feature existed.
    const banks = await loadBlendedQuizBanks(FIRM, emptyLoader())
    for (const key of Object.keys(BASE_QUIZZES.banks).filter(k => !k.startsWith('_'))) {
      expect(banks[key].entries.map(promptLine))
        .toEqual(BASE_QUIZZES.banks[key].entries.map(promptLine))
    }
  })

  it('a firm\'s decisions REACH the caller — the defect this closed', async () => {
    const firstQid = BASE_QUIZZES.banks[BANK_KEY].entries[0].qid
    const banks = await loadBlendedQuizBanks(FIRM, loaderFor({
      'quiz-overrides': { [firstQid]: { question: 'THE FIRM\'S WORDING' } }
    }))
    expect(banks[BANK_KEY].entries[0].question).toBe('THE FIRM\'S WORDING')
    expect(banks[BANK_KEY].entries[0].source).toBe('firm-override')
  })

  it('never rejects in production — it logs and serves the platform banks', async () => {
    // A storage fault must not strip an advisor's quiz back to AI invention
    // without a word in the log. Same shape as loadBlendedStaircase.
    //
    // The re-require is not ceremony: the dev-fallback switch in firmQuizzes is a
    // module-load constant, so setting NODE_ENV on an already-loaded module proves
    // nothing. Same pattern as the staircase's production test.
    jest.resetModules()
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const prod = require('../../server/utils/quizConfig')
      const banks = await prod.loadBlendedQuizBanks(FIRM, () => Promise.reject(new Error('no db')))
      expect(Object.keys(banks)).toEqual(Object.keys(prod.baseBanks()))
      expect(errSpy).toHaveBeenCalled()
    } finally {
      process.env.NODE_ENV = prevEnv
      errSpy.mockRestore()
      jest.resetModules()
    }
  })
})
