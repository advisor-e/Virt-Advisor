'use strict'

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

/**
 * THE READ-ONLY PHRASE PROBE — does it describe the engine, or its own idea of it?
 *
 * Why this file exists. Which logic table opens is decided by literal matching
 * against firm-editable trigger phrases, and until now nothing on any screen
 * showed that. Two P1 defects came out of it on 2026-07-31. The probe makes the
 * decision inspectable — which is only worth anything if what it reports is what
 * production actually does.
 *
 * So the test that earns its keep is the DRIFT GUARD: across the entire corpus,
 * `explainDetection` must agree with the real `detectLogicTrees` on ordering and
 * with `detectLogicTree` on the winner. A spot-check would pass for years while
 * the two quietly diverged, and the screen would then explain a decision the
 * engine never made — worse than no screen, because it would be believed.
 *
 * The other claim under test is that NOTHING IS WRITTEN. A preview that left a
 * trace would be an editing tool wearing a preview's clothes.
 */

jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn()
}))
jest.mock('../../server/services/driveService', () => ({
  listFirmDocuments: jest.fn(),
  listBaseDocuments: jest.fn(),
  uploadFirmDocument: jest.fn(),
  downloadDocument: jest.fn(),
  deleteFirmDocument: jest.fn()
}))
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const logicTrees = require('../../server/utils/logicTrees')
const phraseProbe = require('../../server/utils/phraseProbe')
const { probeLogicTreePhrase, previewLogicTreeTriggers } = require('../../server/routes/firmManager')
const overlay = require('../../server/utils/firmOverlay')

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body }
  }
}

function makeReq (overrides = {}) {
  return { firmId: 'firm-test-123', userRole: 'firm_manager', userEmail: 'mgr@testfirm.com', params: {}, body: {}, ...overrides }
}

const CORPUS = phraseProbe.buildCorpus()

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
})

// ─────────────────────────────────────────────────────────────────────────────
describe('the corpus is real enough to prove anything with', () => {
  test('it is built from both sources and is not trivially small', () => {
    // Guards against the vacuous pass: if a source silently stopped loading, every
    // comparison below would still be "green" over an empty list.
    expect(CORPUS.entries.length).toBeGreaterThan(200)
    expect(CORPUS.composition['branch-condition']).toBeGreaterThan(150)
    expect(CORPUS.composition['scenario-lab']).toBeGreaterThan(40)
  })

  test('a meaningful share of the corpus actually opens a table', () => {
    // If almost nothing matched, the drift guard would be comparing empty to empty.
    const opening = CORPUS.entries.filter(e => logicTrees.detectLogicTree(e.text) !== null)
    expect(opening.length).toBeGreaterThan(50)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('DRIFT GUARD — the explainer never disagrees with the real detector', () => {
  test('ordering matches detectLogicTrees for every sentence in the corpus', () => {
    const mismatches = []
    for (const entry of CORPUS.entries) {
      const real = logicTrees.detectLogicTrees(entry.text).map(t => t.id)
      const explained = logicTrees.explainDetection(entry.text).map(r => r.id)
      if (JSON.stringify(real) !== JSON.stringify(explained)) {
        mismatches.push({ id: entry.id, real, explained })
      }
    }
    expect(mismatches).toEqual([])
  })

  test('the top row matches detectLogicTree\'s single winner for every sentence', () => {
    const mismatches = []
    for (const entry of CORPUS.entries) {
      const winner = logicTrees.detectLogicTree(entry.text)
      const explained = logicTrees.explainDetection(entry.text)
      const top = explained.length > 0 ? explained[0].id : null
      if ((winner ? winner.id : null) !== top) {
        mismatches.push({ id: entry.id, winner: winner ? winner.id : null, top })
      }
    }
    expect(mismatches).toEqual([])
  })

  test('every phrase it reports as matched really is in the text', () => {
    // The explanation is the whole point — a plausible-but-wrong "why" is worse
    // than none. Re-checks each reported phrase independently of the matcher.
    for (const entry of CORPUS.entries.slice(0, 120)) {
      const lower = entry.text.toLowerCase()
      for (const row of logicTrees.explainDetection(entry.text)) {
        expect(row.matched.length).toBe(row.score)
        for (const phrase of row.matched) {
          expect(lower).toContain(phrase.toLowerCase())
        }
      }
    }
  })

  test('it still honours the word-boundary rule fixed on 2026-07-31', () => {
    // "HR" is a real trigger on staff_performance. Before the boundary fix it
    // fired inside "three". If the explainer ever regressed to a substring test
    // this is where it shows.
    const rows = logicTrees.explainDetection('there are three of them')
    const staff = rows.find(r => r.id === 'staff_performance')
    expect(staff === undefined || !staff.matched.includes('hr')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('probeText — all three deterministic layers, and honesty about the fourth', () => {
  const SENTENCE = 'my staff are driving me nuts and nobody knows who reports to whom'

  test('it reports the table that opens and the phrases that opened it', () => {
    const out = phraseProbe.probeText(SENTENCE)
    expect(out.topTable).toBe('staff_performance')
    const staff = out.tables.find(t => t.id === 'staff_performance')
    expect(staff.matched.length).toBeGreaterThan(0)
    expect(staff.shape).toBe('nodes')
  })

  test('it reports the domain layer using the engine\'s own patterns', () => {
    const out = phraseProbe.probeText(SENTENCE)
    expect(Array.isArray(out.domains)).toBe(true)
    expect(out.domains.map(d => d.id)).toContain('staff')
  })

  test('domain scoring is stateless — the same text twice gives the same answer', () => {
    // The engine's patterns carry /g. Scoring with RegExp.test instead of
    // String.match would advance lastIndex and make every second call wrong.
    const first = phraseProbe.scoreDomains(SENTENCE)
    const second = phraseProbe.scoreDomains(SENTENCE)
    expect(second).toEqual(first)
    expect(phraseProbe.scoreDomains(SENTENCE)).toEqual(first)
  })

  test('it reports the signal layer with plain-English descriptions', () => {
    const out = phraseProbe.probeText('they have no idea what their numbers are and the reports are a mess')
    expect(Array.isArray(out.signals)).toBe(true)
    for (const s of out.signals) {
      expect(typeof s.description).toBe('string')
      expect(s.description.length).toBeGreaterThan(0)
    }
  })

  test('it names the layer it cannot measure instead of staying silent', () => {
    const out = phraseProbe.probeText(SENTENCE)
    expect(out.notMeasured.map(n => n.layer)).toContain('advisory-distinctions')
    expect(out.notMeasured[0].reason).toMatch(/AI/)
  })

  test('over-long text is cut AND says it was cut', () => {
    const long = 'staff '.repeat(1000)
    const out = phraseProbe.probeText(long)
    expect(out.text.length).toBe(phraseProbe.MAX_TEXT)
    expect(out.truncated).toBe(true)
  })

  test('empty and non-string input do not throw', () => {
    expect(phraseProbe.probeText('').tables).toEqual([])
    expect(phraseProbe.probeText(null).tables).toEqual([])
    expect(phraseProbe.probeText(undefined).truncated).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('previewTriggerChange — what would move, measured not guessed', () => {
  test('an unknown table is null, not an empty result that reads as "no effect"', () => {
    expect(phraseProbe.previewTriggerChange({ treeId: 'no-such-table', add: ['x'] })).toBeNull()
  })

  test('adding words that already win elsewhere reports the table they were TAKEN FROM', () => {
    // Built from the live corpus rather than hardcoded, so it cannot rot when the
    // trees are edited: find a sentence some table wins, then give a DIFFERENT
    // table enough of that sentence's own words to outscore it.
    const victimEntry = CORPUS.entries.find((e) => {
      const rows = logicTrees.explainDetection(e.text)
      return rows.length > 0 && rows[0].id !== 'valuation' && e.text.split(/\s+/).length > 8
    })
    expect(victimEntry).toBeDefined()

    const beforeRows = logicTrees.explainDetection(victimEntry.text)
    const victimId = beforeRows[0].id
    const victimScore = beforeRows[0].score

    const words = victimEntry.text.toLowerCase().match(/[a-z]{5,}/g) || []
    const steal = Array.from(new Set(words)).slice(0, victimScore + 2)
    expect(steal.length).toBeGreaterThan(victimScore)

    const out = phraseProbe.previewTriggerChange({ treeId: 'valuation', add: steal })
    const gained = out.gained.find(g => g.id === victimEntry.id)
    expect(gained).toBeDefined()
    expect(gained.takenFrom).toBe(victimId)
    // The phrases responsible are named, so the reader can judge the trade.
    expect(gained.matched.length).toBeGreaterThan(0)
  })

  test('the cap is above the largest real trigger list, so a full rewrite fits', () => {
    // staff_performance carries 59 triggers. A cap below that would silently
    // refuse a full edit of the biggest table — found by this test, not by a firm.
    const longest = Math.max(...logicTrees.loadLogicTrees().map(t => (t.entry_triggers || []).length))
    expect(longest).toBeGreaterThan(50)
    expect(phraseProbe.MAX_PHRASES).toBeGreaterThan(longest)
  })

  test('removing every trigger reports what the table STOPS opening for', () => {
    const tree = logicTrees.loadLogicTrees().find(t => t.id === 'staff_performance')
    const out = phraseProbe.previewTriggerChange({
      treeId: 'staff_performance',
      remove: tree.entry_triggers
    })
    expect(out.phrasesIgnored).toBe(0)
    expect(out.triggersAfter).toBe(0)
    expect(out.lost.length).toBeGreaterThan(0)
    // Each lost sentence says where it went instead — including nowhere.
    for (const l of out.lost) {
      expect(l.wentTo === null || typeof l.wentTo === 'string').toBe(true)
      expect(l.wentTo).not.toBe('staff_performance')
    }
  })

  test('a no-op edit moves nothing', () => {
    const tree = logicTrees.loadLogicTrees().find(t => t.id === 'staff_performance')
    const out = phraseProbe.previewTriggerChange({
      treeId: 'staff_performance',
      add: [tree.entry_triggers[0]]
    })
    expect(out.gained).toEqual([])
    expect(out.lost).toEqual([])
    expect(out.otherMoves).toEqual([])
    expect(out.unchanged).toBe(CORPUS.entries.length)
  })

  test('NOTHING IS SAVED — the platform triggers are untouched afterwards', () => {
    const before = logicTrees.loadLogicTrees().find(t => t.id === 'staff_performance').entry_triggers.slice()
    phraseProbe.previewTriggerChange({ treeId: 'staff_performance', add: ['a totally new phrase'] })
    const after = logicTrees.loadLogicTrees().find(t => t.id === 'staff_performance').entry_triggers
    expect(after).toEqual(before)
    // And the detector is unchanged for the next caller.
    expect(logicTrees.detectLogicTree('a totally new phrase')).toBeNull()
  })

  test('the caller\'s own firm override map is not mutated', () => {
    const firmTrees = { staff_performance: { entry_triggers: ['widget'] } }
    const snapshot = JSON.parse(JSON.stringify(firmTrees))
    phraseProbe.previewTriggerChange({ treeId: 'staff_performance', add: ['sprocket'], firmTrees })
    expect(firmTrees).toEqual(snapshot)
  })

  test('it reports the phrases it ignored rather than dropping them quietly', () => {
    const out = phraseProbe.previewTriggerChange({
      treeId: 'staff_performance',
      add: ['  ', '', 'x'.repeat(200), 'genuine phrase', 'genuine phrase']
    })
    expect(out.phrasesIgnored).toBe(4)
    expect(out.caps.maxPhrases).toBe(phraseProbe.MAX_PHRASES)
  })

  test('it states the corpus it used AND the limit of that corpus', () => {
    const out = phraseProbe.previewTriggerChange({ treeId: 'staff_performance', add: ['sprocket'] })
    expect(out.corpus.size).toBe(CORPUS.entries.length)
    expect(out.corpus.composition['scenario-lab']).toBeGreaterThan(0)
    // The screen must be able to say the number is a proxy, not real advisor speech.
    expect(out.corpusLimit).toMatch(/not recordings of real advisor speech/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('the routes — read-only, and guarded like the rest of Firm Manager', () => {
  test('probe returns the three layers for a sentence', async () => {
    const req = makeReq({ body: { text: 'my staff are driving me nuts' } })
    const res = makeMockRes()
    await probeLogicTreePhrase(req, res)
    expect(res._status).toBe(200)
    expect(res._body.topTable).toBe('staff_performance')
    expect(res._body.notMeasured.length).toBeGreaterThan(0)
  })

  test('probe refuses empty text with a clean 400', async () => {
    const res = makeMockRes()
    await probeLogicTreePhrase(makeReq({ body: { text: '   ' } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_BODY')
  })

  test('probe never writes a firm config', async () => {
    await probeLogicTreePhrase(makeReq({ body: { text: 'my staff are driving me nuts' } }), makeMockRes())
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('preview returns the before/after and writes nothing', async () => {
    const req = makeReq({ params: { treeId: 'staff_performance' }, body: { add: ['sprocket'] } })
    const res = makeMockRes()
    await previewLogicTreeTriggers(req, res)
    expect(res._status).toBe(200)
    expect(res._body.treeId).toBe('staff_performance')
    expect(typeof res._body.unchanged).toBe('number')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('preview 400s when neither add nor remove is given', async () => {
    const res = makeMockRes()
    await previewLogicTreeTriggers(makeReq({ params: { treeId: 'staff_performance' }, body: {} }), res)
    expect(res._status).toBe(400)
  })

  test('preview 404s on an unknown table', async () => {
    const res = makeMockRes()
    await previewLogicTreeTriggers(makeReq({ params: { treeId: 'nope' }, body: { add: ['x'] } }), res)
    expect(res._status).toBe(404)
    expect(res._body.error.code).toBe('NOT_FOUND')
  })
})
