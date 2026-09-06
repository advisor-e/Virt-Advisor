/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const EconomicAnalysisStep = require('~/components/EconomicAnalysisStep.vue').default

/**
 * Economic Analysis — step 5 of the Three-Way Forecast (item 4.66, slice 2).
 *
 * 🔴 THE FIRST BLOCK IS THE REASON THIS FILE EXISTS, and it is the one thing on this screen
 * that UAT genuinely cannot check. Mike's privacy ruling of 2026-09-06 is that the app sends
 * NOTHING about the client on its own — only the advisor's own words. A screen that quietly
 * added the company name, a figure from the forecast, or the uploaded file to that request
 * would look identical in UAT and send a client's data to a third party. So the request body
 * is asserted key by key, not merely checked for the brief.
 *
 * The rest guard the same class of thing: an approval that survives a re-run (unread research
 * riding in on a tick set against a previous run), and the parser that turns model output into
 * screen tokens — which the standards require tested for valid, malformed and missing input,
 * because it processes LLM output.
 *
 * `$t()` returns the KEY, so nothing here pins Mike's wording — deliberately, under his
 * 2026-08-24 ruling about what a test may assert.
 */

/** A validated research payload, in the shape `getRun` returns it. */
function research (over) {
  return Object.assign({
    text: 'x',
    wordCount: 2013,
    citationCount: 29,
    sources: [{ url: 'https://www.rbnz.govt.nz/a' }, { url: 'https://www.stats.govt.nz/b' }],
    sections: [
      { n: 1, body: '## 1. Global economic outlook\n\nGrowth was **3.0%** in 2026. ([imf.org](https://www.imf.org/x))', wordCount: 9, citations: [] }
    ]
  }, over || {})
}

/**
 * The approval record `POST …/include` returns.
 *
 * 🔴 THIS IS THE SHAPE `approveRun` ACTUALLY BUILDS, and getting it wrong here is what hid
 * a real fault for a day. The fixture used to read `{ by: { name }, runNumber, ofRuns }` —
 * invented, and matched by a component reading `approval.by.name`, so the two agreed with
 * each other and neither agreed with the backend. Ticking the second tick threw in the
 * running app while these tests stayed green. Keep this in step with
 * `server/utils/economicAnalysisRuns.js`.
 */
function approvalRecord (over) {
  return Object.assign({
    isApproved: true,
    runId: 'ea_1',
    runNumber: 2,
    totalRuns: 3,
    approvedBy: { name: 'Ann Advisor', email: 'ann@firm.example' },
    approvedAt: '2026-09-06T09:00:00.000Z'
  }, over || {})
}

/** Drives fetch through a queue of responses, recording every call. */
function stubFetch (queue) {
  const calls = []
  global.fetch = jest.fn((url, opts) => {
    calls.push({ url, opts })
    const next = queue.shift()
    if (!next) { return Promise.reject(new Error('no queued response')) }
    if (next instanceof Error) { return Promise.reject(next) }
    return Promise.resolve({
      ok: next.ok !== false,
      json: () => Promise.resolve(next.body)
    })
  })
  return calls
}

/** Mounted, ticked on, with a brief long enough to pass the route's floor. */
async function mountTicked (brief) {
  const w = mountWithBuefy(EconomicAnalysisStep, {
    propsData: { apiToken: 'tok-123', clientRef: 'client-7' }
  })
  w.setData({
    enabled: true,
    brief: brief || 'A commercial bakery in Hamilton, New Zealand, seeking finance for a second production line.'
  })
  await w.vm.$nextTick()
  return w
}

afterEach(() => {
  jest.useRealTimers()
  delete global.fetch
})

describe('🔴 the privacy ruling — what actually leaves the app', () => {
  test('the request carries the brief and the client reference AND NOTHING ELSE', async () => {
    const calls = stubFetch([{ body: { started: true, runId: 'ea_1', runNumber: 1 } }])
    const w = await mountTicked('A physiotherapy clinic in Galway, Ireland, seeking finance for a third site.')

    await w.vm.startResearch()

    const sent = JSON.parse(calls[0].opts.body)
    // Key by key: an added key is how a client's name or a forecast figure would arrive.
    expect(Object.keys(sent).sort()).toEqual(['brief', 'clientRef'])
    expect(sent.brief).toBe('A physiotherapy clinic in Galway, Ireland, seeking finance for a third site.')
    expect(sent.clientRef).toBe('client-7')
  })

  test('the brief is sent trimmed, and is the advisor’s own text unaltered', async () => {
    const calls = stubFetch([{ body: { started: true, runId: 'ea_1', runNumber: 1 } }])
    const w = await mountTicked('   A bakery in Hamilton, New Zealand, seeking finance for a second line.   ')

    await w.vm.startResearch()

    expect(JSON.parse(calls[0].opts.body).brief)
      .toBe('A bakery in Hamilton, New Zealand, seeking finance for a second line.')
  })

  test('the exact-words box shows the brief verbatim, never a summary', async () => {
    const w = await mountTicked('A bakery in Hamilton, New Zealand, seeking finance for a second line.')
    expect(w.vm.trimmedBrief).toBe('A bakery in Hamilton, New Zealand, seeking finance for a second line.')
    expect(w.find('.sendbody').text())
      .toBe('A bakery in Hamilton, New Zealand, seeking finance for a second line.')
  })

  test('a brief under the route’s floor cannot be sent at all', async () => {
    const w = await mountTicked('Too short.')
    expect(w.vm.canResearch).toBe(false)
    stubFetch([])
    await w.vm.startResearch()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('🔴 the approval gate — the second tick', () => {
  test('re-running CLEARS the approval, so unread research cannot ride in on it', async () => {
    const w = await mountTicked()
    w.setData({
      state: 'done',
      research: research(),
      runId: 'ea_1',
      include: true,
      approval: approvalRecord({ runNumber: 1, totalRuns: 1 })
    })
    await w.vm.$nextTick()

    w.vm.researchAgain()

    expect(w.vm.include).toBe(false)
    expect(w.vm.approval).toBeNull()
    expect(w.vm.research).toBeNull()
    expect(w.vm.state).toBe('idle')
  })

  test('a refused include puts the tick BACK, so the screen never claims an approval the server has not got', async () => {
    stubFetch([{ ok: false, body: { error: { code: 'RESEARCH_NOT_READY', message: 'not finished' } } }])
    const w = await mountTicked()
    w.setData({ state: 'done', research: research(), runId: 'ea_1', include: true })
    await w.vm.$nextTick()

    await w.vm.onIncludeChange()

    expect(w.vm.include).toBe(false)
    expect(w.vm.approval).toBeNull()
    expect(w.vm.includeError).toBeTruthy()
  })

  test('a network failure on include also puts the tick back', async () => {
    stubFetch([new Error('offline')])
    const w = await mountTicked()
    w.setData({ state: 'done', research: research(), runId: 'ea_1', include: true })
    await w.vm.$nextTick()

    await w.vm.onIncludeChange()

    expect(w.vm.include).toBe(false)
    expect(w.vm.includeError).toBeTruthy()
  })

  test('a recorded approval is kept and reported', async () => {
    const approval = approvalRecord()
    stubFetch([{ body: { included: true, approval, recorded: true } }])
    const w = await mountTicked()
    w.setData({ state: 'done', research: research(), runId: 'ea_1', include: true })
    await w.vm.$nextTick()

    await w.vm.onIncludeChange()

    expect(w.vm.approval).toEqual(approval)
    expect(w.emitted().included[0][0].included).toBe(true)
  })

  test('the approval line reads the record the BACKEND returns, not an invented shape', async () => {
    // The regression this exists for: `approval.by.name` threw on every real approval,
    // because the backend returns `approvedBy`. A fixture that had invented `by` agreed
    // with the bug. Found 2026-09-06 while building the printed pack.
    const w = await mountTicked()
    w.setData({ state: 'done', research: research(), runId: 'ea_1', approval: approvalRecord() })
    await w.vm.$nextTick()

    expect(w.vm.approvedLine).toContain('Ann Advisor')
    expect(w.vm.approvedLine).toContain('"of":3')
  })
})

describe('🔴 what the printed pack is told, and when', () => {
  test('a finished run hands the validated research to the page', async () => {
    // The pack cannot render what it is not given, and the page is the only place both
    // step 4's print and step 5's research can be seen at once.
    const data = research()
    stubFetch([{ body: { state: 'done', research: data, searchCount: 4, searches: [] } }])
    const w = await mountTicked()
    w.setData({ runId: 'ea_1', runNumber: 1, state: 'researching' })

    await w.vm.poll()

    const payload = w.emitted().research[0][0]
    expect(payload.research).toEqual(data)
    expect(payload.researchedAt instanceof Date).toBe(true)
  })

  test('re-running tells the page there is no research and no approval', async () => {
    // Without this the previous run keeps printing for a lender while the screen shows an
    // empty brief — the half of "re-running clears the approval" that the pack introduced.
    const w = await mountTicked()
    w.setData({ state: 'done', research: research(), runId: 'ea_1', include: true, approval: approvalRecord() })
    await w.vm.$nextTick()

    w.vm.researchAgain()

    expect(w.emitted().research[0][0].research).toBeNull()
    expect(w.emitted().included[0][0].included).toBe(false)
    expect(w.emitted().included[0][0].approval).toBeNull()
  })

  test('switching the whole step off withdraws approved research from the pack', async () => {
    // An advisor who approves the research, changes their mind and unticks the feature
    // must not still hand a lender AI-written market research.
    const calls = stubFetch([{ body: { included: false, approval: null, recorded: true } }])
    const w = await mountTicked()
    w.setData({ state: 'done', research: research(), runId: 'ea_1', include: true, approval: approvalRecord() })
    await w.vm.$nextTick()

    w.setData({ enabled: false })
    w.vm.onEnableChange()

    expect(w.emitted().included[0][0].included).toBe(false)
    expect(w.vm.approval).toBeNull()
    // And the record behind it is cleared too, so the two do not disagree.
    expect(calls[0].url).toContain('/include')
    expect(JSON.parse(calls[0].opts.body).include).toBe(false)
  })

  test('a failed withdrawal still leaves the research out of the pack', async () => {
    // The safe direction for the pair to be wrong in: an approval recorded for research
    // that is not printed, never research printed on an approval that was withdrawn.
    stubFetch([new Error('offline')])
    const w = await mountTicked()
    w.setData({ state: 'done', research: research(), runId: 'ea_1', include: true, approval: approvalRecord() })
    await w.vm.$nextTick()

    w.setData({ enabled: false })
    await w.vm.onEnableChange()

    expect(w.emitted().included[0][0].included).toBe(false)
  })
})

describe('the parser that turns model output into screen tokens', () => {
  test('bold and links become their own tokens, and plain text survives between them', async () => {
    const w = await mountTicked()
    const tokens = w.vm.tokensOf('Growth was **3.0%** in 2026. ([imf.org](https://www.imf.org/x))')

    expect(tokens.filter(t => t.t === 'bold').map(t => t.s)).toEqual(['3.0%'])
    const link = tokens.find(t => t.t === 'link')
    expect(link.s).toBe('imf.org')
    expect(link.url).toBe('https://www.imf.org/x')
    expect(tokens.map(t => t.s).join('')).toContain('Growth was')
  })

  test('a numbered heading is marked as a heading, with its hashes removed', async () => {
    const w = await mountTicked()
    const paras = w.vm.paragraphsOf('## 1. Global economic outlook\n\nSome prose.')

    expect(paras[0].heading).toBe(true)
    expect(paras[0].tokens.map(t => t.s).join('')).toBe('1. Global economic outlook')
    expect(paras[1].heading).toBe(false)
  })

  // Malformed and missing input: the three shapes the standards require of anything that
  // processes LLM output. Each must degrade to literal text, never throw.
  test('unclosed markers and a bare bracket pass through as text rather than throwing', async () => {
    const w = await mountTicked()
    expect(() => w.vm.tokensOf('An **unclosed bold and a [half link](')).not.toThrow()
    const tokens = w.vm.tokensOf('An **unclosed bold and a [half link](')
    expect(tokens.map(t => t.s).join('')).toBe('An **unclosed bold and a [half link](')
  })

  test('missing and empty bodies produce no paragraphs rather than an error', async () => {
    const w = await mountTicked()
    expect(w.vm.paragraphsOf(undefined)).toEqual([])
    expect(w.vm.paragraphsOf('')).toEqual([])
    expect(w.vm.paragraphsOf('   \n\n   ')).toEqual([])
  })

  test('a non-http link is NOT turned into an anchor', async () => {
    const w = await mountTicked()
    const tokens = w.vm.tokensOf('see [here](javascript:alert(1))')
    expect(tokens.some(t => t.t === 'link')).toBe(false)
  })

  test('a source URL renders as its host, without the www', async () => {
    const w = await mountTicked()
    expect(w.vm.hostOf('https://www.stats.govt.nz/a/b?c=1')).toBe('stats.govt.nz')
    expect(w.vm.hostOf('not a url')).toBe('not a url')
  })
})

describe('polling', () => {
  test('a completed run stops the poll and keeps the research', async () => {
    jest.useFakeTimers()
    stubFetch([{ body: { state: 'done', searchCount: 10, searches: ['a'], research: research() } }])
    const w = await mountTicked()
    w.setData({ runId: 'ea_1', state: 'researching' })

    await w.vm.poll()

    expect(w.vm.state).toBe('done')
    expect(w.vm.research.wordCount).toBe(2013)
    expect(w.vm.timer).toBeNull()
  })

  test('a refused run surfaces the backend’s safe message and stops polling', async () => {
    stubFetch([{ body: { state: 'failed', searchCount: 0, searches: [], error: { code: 'SECTION_UNSOURCED', message: 'no sources behind it' } } }])
    const w = await mountTicked()
    w.setData({ runId: 'ea_1', state: 'researching' })

    await w.vm.poll()

    expect(w.vm.state).toBe('failed')
    expect(w.vm.error).toBe('no sources behind it')
  })

  // A dropped poll must not fail a run that is still going on the server — the run is
  // 141 seconds long and one bad tick is not an outcome.
  test('a failed poll leaves the run alone', async () => {
    stubFetch([new Error('offline')])
    const w = await mountTicked()
    w.setData({ runId: 'ea_1', state: 'researching' })

    await w.vm.poll()

    expect(w.vm.state).toBe('researching')
    expect(w.vm.error).toBe('')
  })

  test('tearing the screen down stops the timer', async () => {
    const w = await mountTicked()
    w.vm.schedulePoll()
    expect(w.vm.timer).not.toBeNull()
    w.destroy()
    expect(w.vm.timer).toBeNull()
  })
})

describe('starting a run', () => {
  test('a refused start surfaces the message and never enters the running state', async () => {
    stubFetch([{ ok: false, body: { error: { code: 'TOO_MANY_RUNS', message: 'too many runs' } } }])
    const w = await mountTicked()

    await w.vm.startResearch()

    expect(w.vm.state).toBe('idle')
    expect(w.vm.error).toBe('too many runs')
  })

  test('a started run records which run number it is', async () => {
    stubFetch([{ body: { started: true, runId: 'ea_9', runNumber: 3 } }])
    const w = await mountTicked()

    await w.vm.startResearch()

    expect(w.vm.state).toBe('researching')
    expect(w.vm.runId).toBe('ea_9')
    expect(w.vm.runNumber).toBe(3)
  })

  test('the firm token is sent on every call — all three routes are firmAuth-guarded', async () => {
    const calls = stubFetch([{ body: { started: true, runId: 'ea_1', runNumber: 1 } }])
    const w = await mountTicked()

    await w.vm.startResearch()

    expect(calls[0].opts.headers.Authorization).toBe('Bearer tok-123')
  })
})
