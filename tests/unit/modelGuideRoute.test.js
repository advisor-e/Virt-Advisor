'use strict'

const fs = require('fs')
const path = require('path')
const { modelGuide } = require('../../server/routes/report')
const { MODELS, STATUS_READY } = require('../../utils/reportModelCatalogue')

/**
 * Route test — GET /api/report/model-guide.
 *
 * The screen this route feeds (`components/ModelGuide.vue`) names no model: it renders
 * whatever comes back. So everything that keeps the page honest has to be proved here and
 * in `reportModelSummaries.test.js` — the content guard — rather than in the component.
 *
 * 🔴 THE ONE THIS ROUTE EXISTS FOR. Ruled by Mike, 2026-08-22: the page is for a firm
 * manager choosing a model *as well as* for the AI guiding an advisor. If the two ever
 * read from different places they will eventually say different things about the same
 * screen. The last test in this file is the one that stops that, and it is not a
 * formality — it compares the served records against the prompt block character by
 * character where they overlap.
 */

/** Minimal Restify res double capturing what the handler sends. */
function makeRes () {
  const res = { statusCode: null, body: null }
  res.send = (status, body) => { res.statusCode = status; res.body = body }
  return res
}

/** Every catalogued model with a live page — the only ones that may ever be served. */
const READY = MODELS.filter(m => m.status === STATUS_READY)

describe('GET /api/report/model-guide', () => {
  afterEach(() => { jest.resetModules(); jest.dontMock('../../server/utils/reportModels') })

  it('returns the standard envelope with every live model', () => {
    const res = makeRes()
    const next = jest.fn()
    modelGuide({}, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date')
    expect(next).toHaveBeenCalled()
    expect(Array.isArray(res.body.data.models)).toBe(true)
    expect(res.body.data.models).toHaveLength(READY.length)
  })

  it('🔴 SERVES NO MODEL THAT HAS NO PAGE — the screen offers no dead links', () => {
    // Every card on the Model Guide is a link to the model's route. A served model
    // without a live page puts a link to a 404 in front of a firm manager.
    const res = makeRes()
    modelGuide({}, res, jest.fn())

    const readyRoutes = READY.map(m => m.route)
    res.body.data.models.forEach((m) => {
      expect(readyRoutes).toContain(m.route)
    })
  })

  it('carries the fields the screen renders, on every model', () => {
    // Not a duplicate of the content guard: that one holds the FILE to a standard, this
    // holds what the ROUTE actually hands the browser. A future filter or projection in
    // the handler that dropped a field would pass there and fail here.
    const res = makeRes()
    modelGuide({}, res, jest.fn())

    res.body.data.models.forEach((m) => {
      expect(typeof m.name).toBe('string')
      expect(typeof m.route).toBe('string')
      expect(typeof m.category).toBe('string')
      expect(typeof m.modelClass).toBe('string')
      expect(typeof m.answers).toBe('string')
      expect(typeof m.useWhen).toBe('string')
      expect(typeof m.inputsNeeded).toBe('string')
      expect(typeof m.limits).toBe('string')
      expect(typeof m.alsoOnScreen).toBe('string')
      expect(typeof m.coachIsNotAPanel).toBe('boolean')
      expect(Array.isArray(m.keyOutputs)).toBe(true)
      expect(Array.isArray(m.heroFigures)).toBe(true)
      expect(Array.isArray(m.coach)).toBe(true)
      expect(m.coach.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('a new model needs no change to this route — it is driven entirely by the data', () => {
    // The handler contains no model name, route or count. This is the mechanism behind
    // Mike's "every time a new model is added, it gets updated and shown on this page":
    // the content guard forces the entry to exist, and nothing here has to be touched.
    const src = fs.readFileSync(path.resolve(__dirname, '../../server/routes/report.js'), 'utf8')
    const handler = src.slice(src.indexOf('function modelGuide'))
    READY.forEach((m) => {
      expect(handler).not.toContain(m.name)
      expect(handler).not.toContain(m.route)
    })
  })

  it('fails safe: a read error returns a generic message, never the underlying fault', () => {
    jest.resetModules()
    jest.doMock('../../server/utils/reportModels', () => ({
      listReportModels: () => { throw new Error('ENOENT: /srv/secret/path/data/report-model-summaries.json') },
      loadReportModels: () => ({}),
      formatReportModelsForPrompt: () => ''
    }))
    // eslint-disable-next-line global-require
    const { modelGuide: guarded } = require('../../server/routes/report')

    const res = makeRes()
    const next = jest.fn()
    guarded({}, res, next)

    expect(res.statusCode).toBe(500)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('MODEL_GUIDE_UNAVAILABLE')
    expect(next).toHaveBeenCalled()
    // No stack trace, no file path, no raw error text — Engineering Standards, Error handling.
    const serialised = JSON.stringify(res.body)
    expect(serialised).not.toContain('ENOENT')
    expect(serialised).not.toContain('/srv/secret/path')
    expect(serialised).not.toMatch(/\bat\s+\w+\s+\(/)
  })
})

describe('🔴 the screen and the AI are given the same thing', () => {
  // The whole design turns on this. Mike, 2026-08-22: the page serves a firm manager
  // "AS WELL AS ai reading it to assist it in guiding advisors". Two readers, one source.
  // If this ever fails, one of them has been given its own copy and they will drift.

  it('every model the screen is served is named in the AI prompt block, with the same route', () => {
    // eslint-disable-next-line global-require
    const { formatReportModelsForPrompt } = require('../../server/utils/reportModels')
    const block = formatReportModelsForPrompt()

    const res = makeRes()
    modelGuide({}, res, jest.fn())

    res.body.data.models.forEach((m) => {
      expect(block).toContain(`### ${m.name}`)
      expect(block).toContain(`**Page:** ${m.route}`)
    })
  })

  it('the prose the screen shows is the prose the AI is given, word for word', () => {
    // eslint-disable-next-line global-require
    const { formatReportModelsForPrompt } = require('../../server/utils/reportModels')
    const block = formatReportModelsForPrompt()

    const res = makeRes()
    modelGuide({}, res, jest.fn())

    res.body.data.models.forEach((m) => {
      expect(block).toContain(m.answers)
      expect(block).toContain(m.useWhen)
      expect(block).toContain(m.limits)
    })
  })

  it('the Coach reading reaches the AI as well as the screen', () => {
    // Several models perform a what-if in their Coach panel — Working Capital prices what
    // ten days off the cycle is worth. The AI recommends these models, so it needs the
    // reading, not just the four headline numbers.
    //
    // 🔴 COMPARED AFTER RESOLUTION, and that is the point rather than a concession. The
    // sentence is served with `{named}` gaps and each reader fills them; comparing the raw
    // templates would prove only that both were handed the same holes, which is exactly
    // the state to-do item 4.34 was raised to end. This asserts they are handed the same
    // SENTENCE AND THE SAME FIGURES.
    // eslint-disable-next-line global-require
    const { formatReportModelsForPrompt, resolveCoachLine } = require('../../server/utils/reportModels')
    const block = formatReportModelsForPrompt()

    const res = makeRes()
    modelGuide({}, res, jest.fn())

    res.body.data.models.forEach((m) => {
      m.coach.forEach(line => expect(block).toContain(resolveCoachLine(line, m.coachFigures)))
    })
  })

  it('🔴 NO BRACE, AND NO EMPTY GAP, REACHES EITHER READER', () => {
    // The fault itself, stated as a test. Mike, 2026-08-22, reading the built page: "it
    // makes this section worthless" — the screen showed "takes [n] days ... about [amount]
    // more revenue a year" and the AI was handed the same. A gap left unresolved, or a
    // figure that failed to compute, must fail the build rather than reach a screen.
    // eslint-disable-next-line global-require
    const { formatReportModelsForPrompt, resolveCoachLine } = require('../../server/utils/reportModels')
    const block = formatReportModelsForPrompt()

    const res = makeRes()
    modelGuide({}, res, jest.fn())

    res.body.data.models.forEach((m) => {
      m.coach.forEach((line) => {
        const resolved = resolveCoachLine(line, m.coachFigures)
        expect(resolved).not.toMatch(/\{[a-zA-Z]/) // an unfilled gap
        expect(resolved).not.toMatch(/\[[a-z]/) // the old bracket form, e.g. "[n]"
        // A figure that would not compute renders as "—". Checked where a gap WAS, not
        // across the sentence: this prose uses em dashes of its own throughout.
        ;(line.match(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g) || []).forEach((t) => {
          expect(resolveCoachLine(t, m.coachFigures)).not.toBe('—')
        })
      })
    })
    expect(block).not.toMatch(/\{[a-zA-Z][a-zA-Z0-9]*\}/)
  })
})
