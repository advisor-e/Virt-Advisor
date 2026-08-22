'use strict'

/**
 * The real figures behind each model's Coach reading — to-do item 4.34.
 *
 * Raised by Mike on 2026-08-22, reading the built Model Guide: *"it makes this section
 * worthless"*. The page showed the sentence with its numbers taken out — "your [working
 * capital] of working capital … takes [n] days … about [amount] more revenue a year" —
 * and the AI was handed exactly the same text.
 *
 * 🔴 WHAT THIS FILE IS ACTUALLY FOR. Filling the gaps is easy; filling them with the
 * numbers the SCREEN shows is the whole job. Every figure below is asserted against a
 * freshly computed model, and the two derivations that had to move out of `.vue` files to
 * make that possible are pinned to the values the screens were showing before the move.
 * A test that only checked "no braces remain" would pass just as happily on wrong numbers.
 */

const fs = require('fs')
const path = require('path')

const { computeCoachFigures, MONTHS } = require('../../server/utils/reportModelFigures')
const { listReportModels, resolveCoachLine, renderFigure } = require('../../server/utils/reportModels')
const { computeWorkingCapitalCycle } = require('../../server/report/workingCapitalCycleModel')
const { computeEbitdaDcf } = require('../../server/report/ebitdaDcfModel')
const { DEFAULTS: MARGIN_DEFAULTS } = require('../../server/report/marginBreakevenModel')

/** Read a component's source, for the guards that pin a duplicated constant. */
function componentSource (name) {
  return fs.readFileSync(path.resolve(__dirname, '../../components/', name), 'utf8')
}

/** Every `{token}` a model's Coach lines ask for, without the braces. @returns {string[]} */
function tokensIn (model) {
  const names = []
  ;(model.coach || []).forEach((line) => {
    ;(line.match(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g) || []).forEach((t) => {
      const name = t.slice(1, -1)
      if (!names.includes(name)) { names.push(name) }
    })
  })
  return names
}

describe('every gap in a Coach line has a figure behind it', () => {
  const models = listReportModels()

  it('🔴 NO MODEL REACHES A READER WITH AN UNFILLED GAP', () => {
    models.forEach((m) => {
      m.coach.forEach((line) => {
        const resolved = resolveCoachLine(line, m.coachFigures)
        expect(resolved).not.toMatch(/\{[a-zA-Z]/)
      })
    })
  })

  it('🔴 AND NONE FALLS BACK TO A DASH — every figure actually computed', () => {
    // "—" is the honest no-figure fallback and it must never be needed here. If a model
    // stops computing, this is the test that says so, rather than the page quietly losing
    // its numbers while every other test stays green.
    //
    // Checked figure by figure rather than by scanning the finished sentence: this prose
    // is full of em dashes of its own ("Fixed costs sit outside the wheel — paid whether
    // it turns or not"), so a scan would either pass by accident or fail for the wrong
    // reason. Both are worse than no test.
    const missing = []
    models.forEach((m) => {
      tokensIn(m).forEach((name) => {
        if (renderFigure(m.coachFigures[name]) === '—') { missing.push(`${m.route} {${name}}`) }
      })
    })
    expect(missing).toEqual([])
  })

  it('every token named in a sentence exists in that model’s figures', () => {
    // The failure this catches is a typo: `{cycleDay}` for `{cycleDays}` resolves to a
    // dash and reads almost right. Listed by name so the message says which.
    const undeclared = []
    models.forEach((m) => {
      tokensIn(m).forEach((name) => {
        if (!m.coachFigures[name]) { undeclared.push(`${m.route} {${name}}`) }
      })
    })
    expect(undeclared).toEqual([])
  })

  it('no model carries a figure nothing uses', () => {
    // The other direction: a figure computed for a token that was reworded away is dead
    // weight that reads as though it is on the page.
    const figures = computeCoachFigures()
    const unused = []
    models.forEach((m) => {
      const used = tokensIn(m)
      Object.keys(figures[m.route] || {}).forEach((token) => {
        if (!used.includes(token)) { unused.push(`${m.route} {${token}}`) }
      })
    })
    expect(unused).toEqual([])
  })

  it('the old bracket form is gone from the data file for good', () => {
    // The exact shape of the fault — "[n]", "[amount]", "[working capital]".
    models.forEach((m) => {
      m.coach.forEach(line => expect(line).not.toMatch(/\[[a-z]/))
    })
  })
})

describe('the figures are the ones the screen shows, not merely plausible ones', () => {
  const figures = computeCoachFigures()

  it('Working Capital opens on $120, a 30-day cycle turning 1.0× a month', () => {
    // The sample scenario an advisor sees on load. Pinned as literals deliberately: a
    // change to the model's defaults should have to be acknowledged here.
    const f = figures['/business-performance-report']
    expect(f.workingCapital.value).toBe(120)
    expect(f.cycleDays.value).toBe(30)
    expect(f.cycleFactor.value).toBe(1)
  })

  it('🔴 AND ITS WHAT-IF STILL PRICES TEN DAYS AT $1,800 — the figure that moved', () => {
    // The arithmetic moved out of `BusinessPerformanceReport.vue` into the model on
    // 2026-08-22 so the guide could quote it. These are the values the screen was showing
    // before the move; the move was supposed to change nothing.
    const f = figures['/business-performance-report']
    expect(f.fasterDays.value).toBe(20)
    expect(f.fasterFactor.value).toBe(1.5)
    expect(f.fasterExtra.value).toBe(1800)
  })

  it('the screen now READS that what-if rather than computing its own', () => {
    // A source tripwire, in the idiom of reportModelSummaries.test.js: if the component
    // goes back to deriving the number itself, the guide and the screen can differ again
    // and nothing else would notice.
    const src = componentSource('BusinessPerformanceReport.vue')
    expect(src).toContain('this.out.fasterCycle')
    expect(src).not.toContain('this.out.cycleDays - 10')
  })

  it('EBITDA names 2024 as the dip, and the terminal value as 30.1% of the total', () => {
    const f = figures['/ebitda-dcf']
    const v = computeEbitdaDcf({}).valuation
    expect(f.dipYear.value).toBe(2024)
    expect(f.dipYear.value).toBe(v.dipYear)
    expect(renderFigure(f.dipGrowth)).toBe('-21.6%')
    expect(renderFigure(f.terminalShare)).toBe('30.1%')
  })

  it('🔴 THE DIP YEAR SURVIVES ITS OFF-BY-ONE — rate[i] is the step INTO years[i + 1]', () => {
    // The reason this derivation was worth moving into the model rather than copying.
    // Year-on-year growth has one fewer entry than years; reading the wrong end names an
    // innocent year to a buyer.
    const r = computeEbitdaDcf({})
    const idx = r.valuation.actualGrowth.findIndex(g => g !== null && g < 0)
    expect(idx).toBeGreaterThan(-1)
    expect(r.valuation.dipYear).toBe(r.years[idx + 1])
    expect(r.valuation.dipGrowth).toBe(r.valuation.actualGrowth[idx])
  })

  it('the screen reads the dip and the share from the model too', () => {
    const src = componentSource('EbitdaDcfReport.vue')
    expect(src).toContain('r.valuation.dipYear')
    expect(src).toContain('r.valuation.terminalShare')
    expect(src).not.toContain('findIndex(g => g !== null && g < 0)')
  })

  it('Margin · Mark-up · Break-even computes its sample instead of a page of zeros', () => {
    // The model whose defaults lived only in the component. 67% margin on a $250 sale at
    // $82.50 cost, and (11,500 + 8,600) / 0.67 = $30,000 of sales a month.
    const f = figures['/margin-breakeven']
    expect(renderFigure(f.margin)).toBe('67%')
    expect(renderFigure(f.markup)).toBe('203%')
    expect(f.requiredSales.value).toBe(30000)
  })

  it('🔴 AND ITS MIRRORED DEFAULTS STILL MATCH THE SCREEN’S OWN', () => {
    // Two copies, one guarded. `components/MarginBreakevenReport.vue` keeps its DEFAULTS
    // for the sliders; the model keeps them so a reader with nothing to send can compute
    // the sample. If they drift, the guide describes a screen nobody sees.
    const src = componentSource('MarginBreakevenReport.vue')
    const line = (src.match(/const DEFAULTS = \{[^}]*\}/) || [''])[0]
    expect(line).toContain('price: ' + MARGIN_DEFAULTS.price)
    expect(line).toContain('cost: ' + MARGIN_DEFAULTS.cost)
    expect(line).toContain('oh: ' + MARGIN_DEFAULTS.overheads)
    expect(line).toContain('draw: ' + MARGIN_DEFAULTS.ownerDrawings)
  })

  it('Working Capital’s defaults match the screen’s own, for the same reason', () => {
    const src = componentSource('BusinessPerformanceReport.vue')
    const block = (src.match(/const DEFAULTS = \{[\s\S]*?\n\}/) || [''])[0]
    const wcc = computeWorkingCapitalCycle({})
    // Proven through the output rather than by re-listing twelve fields: if the two sets
    // of defaults differ at all, the working capital or the cycle length moves.
    expect(block).toContain('initialInvestment: 200')
    expect(block).toContain('daysReceivable: 35')
    expect(wcc.workingCapital).toBe(120)
    expect(wcc.cycleDays).toBe(30)
  })

  it('Quick Position and Lease vs Buy quote their own model’s answer', () => {
    expect(renderFigure(figures['/quick-position'].monthsZeroSales)).toBe('17.8')
    expect(renderFigure(figures['/quick-position'].discount)).toBe('5%')
    expect(renderFigure(figures['/lease-vs-buy'].saving)).toBe('$4,539')
  })

  it('Debtor Drag names May, the month its model actually returns', () => {
    expect(renderFigure(figures['/debtor-drag'].deepestLowMonth)).toBe('May')
    expect(figures['/debtor-drag'].monthsInOverdraft.value).toBe(5)
  })

  it('🔴 AND ITS MONTH NAMES ARE THE SCREEN’S MONTH NAMES', () => {
    // A third copy of the same twelve strings, guarded rather than left silent — see the
    // note in reportModelFigures.js.
    const src = componentSource('DebtorDragReport.vue')
    const line = (src.match(/const MON = \[[^\]]*\]/) || [''])[0]
    MONTHS.forEach(m => expect(line).toContain(`'${m}'`))
    expect(line.split(',')).toHaveLength(MONTHS.length)
  })
})

describe('formatting: the AI’s copy and the screen’s copy differ only in currency', () => {
  // The screen formats through `mixins/currencyMixin.js` in the firm's currency; the AI has
  // no firm, so the block is rendered in the platform default. `utils/currencyFormat.js`
  // is an ES module and the CommonJS backend cannot require it, so this is what stops the
  // two implementations drifting.
  // eslint-disable-next-line global-require
  const { money, num } = require('../../utils/currencyFormat')

  it('money renders exactly as the shared frontend formatter does', () => {
    ;[0, 120, 1800, 30000, 4539.138538311672, -34891.37416518763, 4420962.96].forEach((v) => {
      expect(renderFigure({ value: v, format: 'money' })).toBe(money(v, 'NZD', 'en'))
    })
  })

  it('one-decimal figures render as the shared formatter does', () => {
    ;[1, 1.5, 17.75399, 20.25399].forEach((v) => {
      expect(renderFigure({ value: v, format: 'number1' })).toBe(num(v, 'en', 1))
    })
  })

  it('a year is never grouped — 2024, not 2,024', () => {
    expect(renderFigure({ value: 2024, format: 'plain' })).toBe('2024')
  })

  it('percentages follow the screens’ own two habits', () => {
    // `pct()` on the report screens is one decimal; a slider percentage is whole.
    expect(renderFigure({ value: 0.5368672779404859, format: 'percent1' })).toBe('53.7%')
    expect(renderFigure({ value: 0.05, format: 'percentInt' })).toBe('5%')
  })

  it('a missing or unusable figure becomes a dash, never a brace or a NaN', () => {
    expect(renderFigure(undefined)).toBe('—')
    expect(renderFigure({ value: null, format: 'money' })).toBe('—')
    expect(renderFigure({ value: NaN, format: 'money' })).toBe('—')
    expect(renderFigure({ value: Infinity, format: 'number1' })).toBe('—')
    expect(resolveCoachLine('costs {nothing} a week', {})).toBe('costs — a week')
  })

  it('a sentence with no gaps passes through untouched', () => {
    const plain = 'It also warns when it cannot be trusted.'
    expect(resolveCoachLine(plain, {})).toBe(plain)
  })
})

describe('🔴 the AI is told these are sample figures where it reads them', () => {
  // The risk item 4.34 introduced, and Mike's ruling on it the same day. The AI used to
  // read "[amount]" and had nothing to quote; it now reads "$4,420,963". Every one of
  // these models states "illustrative teaching figures" in its limits and the list
  // instruction forbids passing them off as the client's — but that asked the model to
  // join two sentences a page apart. The caveat now sits on the line with the number.
  // eslint-disable-next-line global-require
  const { formatReportModelsForPrompt } = require('../../server/utils/reportModels')
  const block = formatReportModelsForPrompt()

  it('every Coach reading in the prompt is labelled as the screen’s sample figures', () => {
    const headings = block.match(/- \*\*What the (Coach panel says|screen tells the advisor)[^:]*:\*\*/g) || []
    expect(headings.length).toBeGreaterThan(0)
    headings.forEach(h => expect(h).toMatch(/sample figures/))
  })

  it('both forms carry it — the models with a Coach panel and the models without', () => {
    // Lease vs Buy has no Coach panel and quotes a real saving, so the caveat has to
    // reach the other heading too.
    expect(block).toContain("What the Coach panel says, on the screen's own sample figures")
    expect(block).toContain('What the screen tells the advisor, on its own sample figures')
  })

  it('the standing protections it leans on are still there', () => {
    // The caveat was added because these existed but sat far from the figures. If either
    // is ever removed, the caveat alone is thinner than what was ruled on.
    expect(block).toContain('uses teaching figures, not the client\'s accounts')
    listReportModels().forEach((m) => {
      if (m.coachFigures && Object.keys(m.coachFigures).length) {
        expect(m.limits).toMatch(/illustrat|sample|teaching/i)
      }
    })
  })
})

describe('the figures never cost an advisor their answer', () => {
  it('a model that will not compute loses its numbers, not the whole block', () => {
    // The same degradation rule the summaries themselves follow: an enrichment must never
    // take down the answer around it.
    jest.resetModules()
    jest.doMock('../../server/utils/reportModelFigures', () => ({
      computeCoachFigures: () => { throw new Error('boom') },
      MONTHS: []
    }))
    // eslint-disable-next-line global-require
    const guarded = require('../../server/utils/reportModels')

    const block = guarded.formatReportModelsForPrompt()
    expect(block).toContain('## Calculation Models Available In This App')
    expect(block).toContain('Working Capital Cycle')
    // Every gap becomes a dash rather than a brace, even in the failure case.
    expect(block).not.toMatch(/\{[a-zA-Z][a-zA-Z0-9]*\}/)

    jest.dontMock('../../server/utils/reportModelFigures')
    jest.resetModules()
  })
})
