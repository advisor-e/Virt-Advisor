'use strict'

/**
 * The app supplies the page address; the AI only names the model.
 *
 * Asked for by Mike, 2026-09-23: *"every model or template is linked via an ID in the
 * cascade search"* — and the models were not in that scheme.
 *
 * 🔴 WHAT THIS GUARDS THAT UAT CANNOT. The defect being closed is invisible to a person:
 * the AI names Sales Dashboard correctly 6 times in 6 and links it 3 times in 6, and
 * every one of those answers reads perfectly well on its own. A tester sees a good answer
 * and moves on. It is only findable by asking the same question repeatedly and counting,
 * which is how item 7.12 found it.
 *
 * 🔴 AND THE HALF THAT WOULD DO REAL HARM. Model names that are ALSO real template
 * titles. Attaching a model's address to a line that meant the template would send an
 * advisor to the wrong thing while looking entirely correct — worse than the missing
 * link it replaced. The block boundary is the whole defence, so most of this file is
 * about where the injector must keep its hands off.
 *
 * ⚠ THE COLLIDING NAMES ARE COMPUTED BELOW, NEVER TYPED. `templateHeadingCheck` records
 * what typing them costs: its comment read "two" for weeks, every later note repeated
 * it, and three templates went on being flagged as calculators. A seventh collision
 * added tomorrow is covered by this file the day it appears, with no edit here.
 */

const {
  injectModelLinks,
  planModelLinks,
  modelIdFor,
  pageAddressFor
} = require('../../server/utils/modelLinkInjector')
const { loadReportModels } = require('../../server/utils/reportModels')
const { isKnownTemplate, nearestTemplateTitle } = require('../../server/utils/tierLookup')

/** The hidden marker the AI appends, stripped before the advisor reads anything. */
function marker (...routes) {
  return '[[MODEL: ' + routes.join(' | ') + ']]'
}

/** An answer in the format `discover.txt` specifies, with the model line supplied. */
function answerWith (modelLine) {
  return [
    '**Best match**',
    '**Cash Flow Forecasting** — the document to walk them through.',
    '',
    '**How it works**',
    'You take last year and project it forward.',
    '',
    '**A model that fits**',
    modelLine,
    '',
    '**Is that what you had in mind, or would you like me to look for something else?**'
  ].join('\n')
}

let logged
beforeEach(() => { logged = jest.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { logged.mockRestore() })

describe('the address is put in when the AI leaves it out', () => {
  it('🔴 THE MEASURED FAULT — a named model with no link gets one', () => {
    // Sales Dashboard is also a template title, so this carries the marker the AI really
    // does append. That is the case the whole build exists for: 6/6 named, 3/6 linked.
    const out = planModelLinks(
      answerWith('Sales Dashboard — shows where the margin actually comes from.'),
      marker('/sales-dashboard')
    )
    expect(out.text).toContain('Sales Dashboard — shows where the margin actually comes from. — open it at /sales-dashboard')
    expect(out.filled).toHaveLength(1)
    expect(out.filled[0].name).toBe('Sales Dashboard')
  })

  it('uses the wording discover.txt already asks the AI for, not a new one', () => {
    // The advisor must not be able to tell which lines the app finished. Anything else
    // here is new user-facing wording, which is Mike's to approve, not ours to invent.
    const out = planModelLinks(answerWith('Debtor Business Drag — what slow payers cost.'))
    expect(out.text).toContain('— open it at /debtor-drag')
  })

  it('a bulleted model line is filled the same way', () => {
    const out = planModelLinks(answerWith('- Volatility Report — how much the month-to-month swing costs.'))
    expect(out.text).toContain('— open it at /volatility')
  })

  it('the short form the AI actually writes still resolves', () => {
    // "Stock Purchasing" for "Stock Purchasing (Growth Pro)" — item 7.12, measured.
    const out = planModelLinks(answerWith('Stock Purchasing — what the buying pattern ties up.'))
    expect(out.text).toContain('— open it at /stock-purchasing')
  })

  it('a name whose own hyphen could split it is read whole', () => {
    const out = planModelLinks(answerWith('Margin · Mark-up · Break-even — the pricing trio.'))
    expect(out.text).toContain('— open it at /margin-breakeven')
  })

  it('logs when it fires, so how often the AI drops an address stays readable', () => {
    injectModelLinks(answerWith('Sales Dashboard — where the margin comes from.'), marker('/sales-dashboard'))
    expect(logged).toHaveBeenCalledTimes(1)
    expect(logged.mock.calls[0][0]).toContain('/sales-dashboard')
  })

  it('says nothing at all on the answers that were already right', () => {
    injectModelLinks(answerWith('Sales Dashboard — where the margin comes from. — open it at /sales-dashboard'))
    expect(logged).not.toHaveBeenCalled()
  })
})

describe('it only ever fills a gap', () => {
  it('a line that already carries the right address is untouched', () => {
    const text = answerWith('Sales Dashboard — where the margin comes from. — open it at /sales-dashboard')
    const out = planModelLinks(text)
    expect(out.text).toBe(text)
    expect(out.filled).toEqual([])
  })

  it('🔴 A LINE CARRYING ANOTHER MODEL’S REAL ADDRESS IS LEFT ALONE, NOT ARBITRATED', () => {
    // Deciding whether the name or the address was what the AI meant is a judgement.
    // This supplies facts; it does not overrule the answer.
    const text = answerWith('Sales Dashboard — where the margin comes from. — open it at /mid-level-budget')
    expect(planModelLinks(text).text).toBe(text)
  })

  it('an invented address in the closing clause is corrected, and the line kept', () => {
    const out = planModelLinks(
      answerWith('Sales Dashboard — where the margin comes from. — open it at /sales-dashboard-pro'),
      marker('/sales-dashboard')
    )
    expect(out.text).toContain('— open it at /sales-dashboard')
    expect(out.text).not.toContain('/sales-dashboard-pro')
  })

  it('a name we do not hold is never given a page', () => {
    const text = answerWith('Cash Flow Forecasting — a template, not a model of ours.')
    expect(planModelLinks(text).text).toBe(text)
  })

  it('prose under the heading that is not a name line is left as prose', () => {
    const text = answerWith('None of the models in this app answers that directly.')
    expect(planModelLinks(text).text).toBe(text)
  })

  it('an answer with no model block is returned exactly as it came', () => {
    const text = '**Best match**\n**Cash Flow Forecasting** — the document.\n'
    expect(planModelLinks(text).text).toBe(text)
  })

  it('a non-string is handed straight back', () => {
    expect(planModelLinks(null).text).toBeNull()
    expect(planModelLinks(undefined).filled).toEqual([])
  })
})

describe('🔴 the block boundary is the safety, and the colliding names depend on it', () => {
  /** Every model whose name is also a real template title — recomputed, never typed. */
  const COLLIDING = (loadReportModels().models || [])
    .filter(m => m && m.name && m.route)
    .filter(m => isKnownTemplate(m.name) || nearestTemplateTitle(m.name))

  it('there ARE names in both lists — the guard below would be vacuous otherwise', () => {
    expect(COLLIDING.length).toBeGreaterThan(0)
  })

  it.each(COLLIDING.map(m => [m.name, m.route]))(
    '🔴 “%s” UNDER A TEMPLATE HEADING IS NEVER LINKED — there, it means the template',
    (name, route) => {
      // Under a template heading the name means the document in Advisor-e. Sending the
      // advisor to our page instead is a wrong link wearing a right one's clothes.
      const text = [
        '**Best match**',
        '**' + name + '** — the document to walk them through.',
        '',
        '**Also worth considering**',
        name + ' — the same thing, put more lightly.'
      ].join('\n')
      const out = planModelLinks(text)
      expect(out.text).toBe(text)
      expect(out.text).not.toContain(route)
    }
  )

  it.each(COLLIDING.map(m => [m.name, m.route]))(
    '🔴 “%s” IN THE MODEL BLOCK IS NOT LINKED WITHOUT THE AI’S MARKER',
    (name, route) => {
      // The heading is not evidence enough for these. `templateHeadingCheck` catches a
      // model filed under a template heading; NOTHING catches a template filed under the
      // model heading, so without the marker this name could still mean the document.
      const text = answerWith(name + ' — the thing to take them through.')
      expect(planModelLinks(text).text).toBe(text)
      expect(planModelLinks(text).text).not.toContain(route)
    }
  )

  it.each(COLLIDING.map(m => [m.name, m.route]))(
    '“%s” IS linked once the AI’s own marker names it — the ambiguity is gone',
    (name, route) => {
      const out = planModelLinks(answerWith(name + ' — the thing to take them through.'), marker(route))
      expect(out.text).toContain('— open it at ' + route)
      expect(out.filled).toHaveLength(1)
    }
  )

  it('🔴 A MARKER NAMING A DIFFERENT MODEL DOES NOT VOUCH FOR THIS ONE', () => {
    const text = answerWith('Sales Dashboard — the thing to take them through.')
    expect(planModelLinks(text, marker('/debtor-drag')).text).toBe(text)
  })

  it('a name no template answers to still fills with no marker at all', () => {
    // The thirteen are unaffected: the extra proof is asked for only where it is needed.
    const out = planModelLinks(answerWith('Debtor Business Drag — what slow payers cost.'))
    expect(out.text).toContain('— open it at /debtor-drag')
  })

  it('the block ends at the next heading', () => {
    const text = [
      '**A model that fits**',
      'Sales Dashboard — where the margin comes from.',
      '',
      '**Also worth considering**',
      'Working Capital Cycle — the template of that name.'
    ].join('\n')
    // The marker declares BOTH, so the heading is the only thing keeping the second one
    // unlinked — which is exactly what this asserts.
    const out = planModelLinks(text, marker('/sales-dashboard', '/business-performance-report'))
    expect(out.text).toContain('Sales Dashboard — where the margin comes from. — open it at /sales-dashboard')
    expect(out.text).toContain('Working Capital Cycle — the template of that name.')
    expect(out.text).not.toContain('/business-performance-report')
    expect(out.filled).toHaveLength(1)
  })

  it('the heading is recognised once markdown has upgraded it to a real heading', () => {
    const text = '#### A model that fits\nSales Dashboard — where the margin comes from.'
    expect(planModelLinks(text, marker('/sales-dashboard')).text).toContain('— open it at /sales-dashboard')
  })
})

describe('the id is the join, exactly as a template’s link id is', () => {
  it('every shipped model resolves name → id → address', () => {
    (loadReportModels().models || []).forEach((m) => {
      const id = modelIdFor(m.name)
      expect(id).toBe(m.id)
      expect(pageAddressFor(id)).toBe(m.route)
    })
  })

  it('a name that matches nothing yields no id', () => {
    expect(modelIdFor('A Model Nobody Built')).toBeNull()
    expect(pageAddressFor('model-0000000000')).toBeNull()
  })

  it('🔴 A MODEL WITH NO ID IS NOT LINKABLE — which is what the id guard is FOR', () => {
    jest.resetModules()
    jest.doMock('../../server/utils/reportModels', () => ({
      loadReportModels: () => ({
        instruction: [],
        models: [{ route: '/no-identity', name: 'Model Without An Id' }]
      })
    }))
    const injector = require('../../server/utils/modelLinkInjector')
    expect(injector.modelIdFor('Model Without An Id')).toBeNull()
    const text = '**A model that fits**\nModel Without An Id — it has no identity.'
    expect(injector.planModelLinks(text).text).toBe(text)
    jest.resetModules()
  })
})
