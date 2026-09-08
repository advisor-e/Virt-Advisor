'use strict'

/**
 * The next-steps run store (item 4.70, stage 6) — and, through it, the shared
 * `aiRunStore` factory both AI features now stand on. The economic analysis's own route
 * tests prove the factory kept its behaviour; this proves what is this feature's alone:
 * the tick is on the WORDS, the record names the draft where there was one, and page 8's
 * gate is the record compared with the saved lines, never a flag.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const store = require('../../server/utils/nextStepsDraftRuns')
const eaStore = require('../../server/utils/economicAnalysisRuns')

const FIRM = 'firm-ns-1'
const ADVISOR = 'adv-ns-1'
const WHO = { name: 'Sarah Mitchell', email: 'sarah@testfirm.com' }

const STEPS = [
  { title: 'Free up cash from stock', body: 'Run down the slow lines.' },
  { title: 'Bring debtor days back', body: 'Shorten the terms.' },
  { title: 'Protect the margin', body: 'Review the supplier agreements.' }
]

beforeEach(() => {
  store._reset()
  eaStore._reset()
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue({})
})

describe('the two stores are separate instances of one factory', () => {
  test('each keeps its own runs, ids and approval key', () => {
    const ns = store.createRun({ firmId: FIRM, advisorId: ADVISOR, clientRef: 'c1', sent: '- Stock days: red' })
    const ea = eaStore.createRun({ firmId: FIRM, advisorId: ADVISOR, clientRef: 'c1', brief: 'A clinic in Galway.' })
    expect(ns.runId.startsWith('ns_')).toBe(true)
    expect(ea.runId.startsWith('ea_')).toBe(true)
    expect(ns.state).toBe('drafting')
    expect(ea.state).toBe('researching')
    expect(ns.sent).toBe('- Stock days: red')
    expect(ea.searches).toEqual([])
    expect(store.ownedRun(ea.runId, FIRM, ADVISOR)).toBeNull()
    expect(eaStore.ownedRun(ns.runId, FIRM, ADVISOR)).toBeNull()
    expect(store.CONFIG_KEY).toBe('next-steps-approvals')
    expect(eaStore.CONFIG_KEY).toBe('economic-analysis-approvals')
    expect(store.countInContext(FIRM, ADVISOR, 'c1')).toBe(1)
    expect(eaStore.countInContext(FIRM, ADVISOR, 'c1')).toBe(1)
  })

  test('a run is only the starting advisor\'s', () => {
    const ns = store.createRun({ firmId: FIRM, advisorId: ADVISOR, clientRef: 'c1', sent: '' })
    expect(store.ownedRun(ns.runId, FIRM, 'someone-else')).toBeNull()
    expect(store.ownedRun(ns.runId, 'other-firm', ADVISOR)).toBeNull()
    expect(store.ownedRun(ns.runId, FIRM, ADVISOR)).toBe(ns)
  })
})

describe('recordReady — the tick is on the words', () => {
  test('records typed words with no draft behind them', async () => {
    const { approval, recorded } = await store.recordReady({ firmId: FIRM, clientRef: 'c1', ready: true, steps: STEPS, run: null, who: WHO, totalDrafts: 0 })
    expect(recorded).toBe(true)
    expect(approval).toMatchObject({ isApproved: true, clientRef: 'c1', runId: null, draftNumber: 0, totalDrafts: 0, draft: null, sent: null, approvedBy: WHO })
    expect(approval.steps).toEqual(STEPS)
    expect(approval.edited).toEqual([false, false, false])
    expect(typeof approval.approvedAt).toBe('string')
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(FIRM, 'next-steps-approvals', { approvals: [approval] }, WHO)
  })

  test('names the draft it came from and marks each line the advisor changed', async () => {
    const run = store.createRun({ firmId: FIRM, advisorId: ADVISOR, clientRef: 'c1', sent: '- Stock days: red' })
    store.completeRun(run, { steps: [STEPS[0], { title: 'Chase the debtors', body: 'Ring them.' }, STEPS[2]] })
    const { approval } = await store.recordReady({ firmId: FIRM, clientRef: 'c1', ready: true, steps: STEPS, run, who: WHO, totalDrafts: 1 })
    expect(approval.runId).toBe(run.runId)
    expect(approval.draftNumber).toBe(1)
    expect(approval.sent).toBe('- Stock days: red')
    expect(approval.draft[1]).toEqual({ title: 'Chase the debtors', body: 'Ring them.' })
    expect(approval.edited).toEqual([false, true, false])
    expect(run.approval).toBe(approval)
  })

  test('a removed tick is recorded too, and the newest record wins', async () => {
    await store.recordReady({ firmId: FIRM, clientRef: 'c1', ready: true, steps: STEPS, who: WHO })
    const first = overlay.saveFirmConfig.mock.calls[0][2]
    overlay.loadFirmConfig.mockResolvedValue(first)
    const { approval } = await store.recordReady({ firmId: FIRM, clientRef: 'c1', ready: false, steps: STEPS, who: WHO })
    expect(approval.isApproved).toBe(false)
    const second = overlay.saveFirmConfig.mock.calls[1][2]
    expect(second.approvals).toHaveLength(2)
    overlay.loadFirmConfig.mockResolvedValue(second)
    const latest = await store.latestApproval(FIRM, 'c1')
    expect(latest.isApproved).toBe(false)
    expect(store.summarise(latest, STEPS).approved).toBe(false)
  })

  test('persistence never fails the tick, and says so', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('overlay down'))
    const { approval, recorded } = await store.recordReady({ firmId: FIRM, clientRef: 'c1', ready: true, steps: STEPS, who: WHO })
    expect(approval.isApproved).toBe(true)
    expect(recorded).toBe(false)
  })

  test('keeps the last 500 records per firm', async () => {
    const many = { approvals: Array.from({ length: 500 }, (_, i) => ({ clientRef: 'c' + i, isApproved: true, steps: STEPS })) }
    overlay.loadFirmConfig.mockResolvedValue(many)
    await store.recordReady({ firmId: FIRM, clientRef: 'new', ready: true, steps: STEPS, who: WHO })
    const kept = overlay.saveFirmConfig.mock.calls[0][2].approvals
    expect(kept).toHaveLength(500)
    expect(kept[499].clientRef).toBe('new')
    expect(kept[0].clientRef).toBe('c1')
  })
})

describe('latestApproval — whose record', () => {
  test('finds the newest record for this client and ignores the others', async () => {
    overlay.loadFirmConfig.mockResolvedValue({
      approvals: [
        { clientRef: 'c1', isApproved: true, approvedAt: '1' },
        { clientRef: 'c2', isApproved: true, approvedAt: '2' },
        { clientRef: 'c1', isApproved: false, approvedAt: '3' }
      ]
    })
    expect((await store.latestApproval(FIRM, 'c1')).approvedAt).toBe('3')
    expect((await store.latestApproval(FIRM, 'c2')).approvedAt).toBe('2')
    expect(await store.latestApproval(FIRM, 'c3')).toBeNull()
  })

  test('no record, or an unreadable one, is null', async () => {
    expect(await store.latestApproval(FIRM, 'c1')).toBeNull()
    overlay.loadFirmConfig.mockResolvedValue({ approvals: 'corrupt' })
    expect(await store.latestApproval(FIRM, 'c1')).toBeNull()
  })
})

describe('matches and summarise — the gate page 8 prints on', () => {
  const approval = { isApproved: true, steps: STEPS, approvedBy: WHO, approvedAt: '2026-09-09T00:00:00.000Z', draftNumber: 1, totalDrafts: 2, edited: [false, true, false] }

  test('🔴 holds only for the exact approved words', () => {
    expect(store.matches(approval, STEPS)).toBe(true)
    const edited = [STEPS[0], STEPS[1], { title: 'Protect the margin', body: 'Review the supplier agreements!' }]
    expect(store.matches(approval, edited)).toBe(false)
    expect(store.matches(approval, STEPS.slice(0, 2))).toBe(false)
    expect(store.matches(approval, null)).toBe(false)
    expect(store.matches(null, STEPS)).toBe(false)
    expect(store.matches(Object.assign({}, approval, { isApproved: false }), STEPS)).toBe(false)
    expect(store.matches(Object.assign({}, approval, { steps: undefined }), STEPS)).toBe(false)
  })

  test('summarise says who, when and which draft — never the lines themselves', () => {
    const s = store.summarise(approval, STEPS)
    expect(s).toEqual({ approved: true, approvedBy: WHO, approvedAt: approval.approvedAt, draftNumber: 1, totalDrafts: 2, edited: [false, true, false] })
    expect(JSON.stringify(s)).not.toContain('Free up cash')
  })

  test('summarise on a mismatch is the empty shape, not a partial one', () => {
    expect(store.summarise(approval, [])).toEqual({ approved: false, approvedBy: null, approvedAt: null, draftNumber: 0, totalDrafts: 0, edited: [false, false, false] })
    expect(store.summarise(null, STEPS).approved).toBe(false)
  })
})
