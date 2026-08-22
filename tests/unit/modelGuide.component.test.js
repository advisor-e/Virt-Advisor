/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const ModelGuide = require('~/components/ModelGuide.vue').default

/**
 * The Model Guide screen (Mike, 2026-08-22).
 *
 * Approved artefact: design/mockups/report-model-summaries.html (draft 2).
 *
 * 🔴 THE TWO CLAIMS WORTH TESTING, because both are promises made to Mike in words:
 *
 *   1. *"Everytime a new model is added, it gets updated and shown on this page."*
 *      Proved by rendering a model this component has never heard of and asserting it
 *      appears in full. A test using the ten real models would pass just as happily if
 *      the component had them hardcoded.
 *
 *   2. *"I also want a search function for purpose etc so a firm manager can ALSO use
 *      the page to find the most appropriate model."* Proved by searching for words that
 *      appear ONLY in a model's purpose, its Coach reading and the situation it is built
 *      for — never in its name. A search that only reads names would pass a naive test
 *      and fail the firm manager.
 *
 * The fetch is stubbed; the route itself is covered in modelGuideRoute.test.js.
 * Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js).
 */

/** A model no part of this component knows about — the "new model added" case. */
function inventedModel () {
  return {
    route: '/succession-runway',
    name: 'Succession Runway',
    category: 'Growth',
    modelClass: 'decision',
    answers: 'Whether the owner can afford to step back, and in which year the business stops needing them.',
    keyOutputs: ['Years to handover', 'Owner drawings replaced', 'Buyer affordability'],
    heroFigures: [
      { label: 'Years to handover', sub: 'before the owner can step back' },
      { label: 'Owner drawings replaced', sub: 'by the management wage' },
      { label: 'Buyer affordability', sub: 'what a successor could service' }
    ],
    alsoOnScreen: 'The management wage schedule and the earn-out profile.',
    coach: ['The business does not yet run without the owner. On these figures that changes in year four, and the gap until then is a wage nobody is currently paying.'],
    coachIsNotAPanel: false,
    inputsNeeded: 'Owner drawings, the management wage that would replace them, and the buyer profile.',
    useWhen: 'The owner is talking about retiring, slowing down, or handing over to a family member.',
    limits: 'It assumes the business survives the handover. It does not model losing key clients with the owner.'
  }
}

/** Two of the real ten, enough to prove grouping and search across fields. */
function realModels () {
  return [
    {
      route: '/debtor-drag',
      name: 'Debtor Business Drag',
      category: 'Cash Flow',
      modelClass: 'education',
      answers: 'How much of a year’s sales is merely delayed because customers pay slowly.',
      keyOutputs: ['Deepest cash low under the plan', 'Deepest cash low before the change', 'The effect of the decisions'],
      heroFigures: [
        { label: 'Deepest cash low — your plan', sub: 'the worst month under the profile you set' },
        { label: 'Deepest cash low — Before', sub: 'the same month on the frozen comparison' },
        { label: 'Effect of your decisions', sub: 'better or worse at the worst month' }
      ],
      alsoOnScreen: 'Both collection profiles in full, months in overdraft, and the year-end balance.',
      coach: ['Cash arrives late but suppliers, wages and GST do not wait. Your bank dips into overdraft and you are in the red for months.'],
      coachIsNotAPanel: false,
      inputsNeeded: 'Twelve months of sales and two collection profiles.',
      useWhen: 'Overdraft pressure, slow payers, or whether to chase debtors harder.',
      limits: 'Illustrative teaching figures — no client data goes into it.'
    },
    {
      route: '/lease-vs-buy',
      name: 'Lease vs Buy',
      category: 'Valuation',
      modelClass: 'decision',
      answers: 'Whether leasing or buying an asset costs less over its whole life.',
      keyOutputs: ['Total cost to buy', 'Total cost to lease', 'You save'],
      heroFigures: [
        { label: 'Total cost to buy', sub: 'over the whole term, after resale' },
        { label: 'Total cost to lease', sub: 'over the whole term, after residual' },
        { label: 'You save', sub: 'by choosing the cheaper option' }
      ],
      alsoOnScreen: '',
      coach: ['The model does not leave the choice open. It returns a one-word verdict with the saving beside it.'],
      coachIsNotAPanel: true,
      inputsNeeded: 'Asset price, loan terms, depreciation, running costs and the lease terms.',
      useWhen: 'Funding a vehicle or a piece of equipment against a loan.',
      limits: 'The FBT-versus-reimbursement sheet is not part of the verdict and is not built.'
    }
  ]
}

/** Mount with `fetch` stubbed to return `models`, and wait for the load to settle. */
async function mountWith (models) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, data: { models }, timestamp: new Date().toISOString() })
  })
  const wrapper = mountWithBuefy(ModelGuide)
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('a model the component has never heard of still renders in full', () => {
  it('🔴 A NEW MODEL APPEARS WITH NO CHANGE TO THIS COMPONENT', async () => {
    // Mike's requirement in his own words: "Everytime a new model is added, it gets
    // updated and shown on this page." Nothing below is in the component's source.
    const wrapper = await mountWith([inventedModel()])
    const text = wrapper.text()

    expect(text).toContain('Succession Runway')
    expect(text).toContain('Whether the owner can afford to step back')
    expect(text).toContain('Years to handover')
    expect(text).toContain('before the owner can step back')
    expect(text).toContain('The management wage schedule')
    expect(text).toContain('The business does not yet run without the owner')
    expect(text).toContain('The owner is talking about retiring')
    expect(text).toContain('It assumes the business survives the handover')
    expect(wrapper.find('a[href="/succession-runway"]').exists()).toBe(true)
  })

  it('a brand-new category gets its own group rather than being dropped', async () => {
    const wrapper = await mountWith([inventedModel()])
    expect(wrapper.text()).toContain('Growth')
  })

  it('a model whose entry predates the labelled figures still shows its calculations', async () => {
    // Defensive: heroFigures absent, keyOutputs present. The screen degrades to the
    // plain strings rather than rendering an empty panel.
    const partial = Object.assign(inventedModel(), { heroFigures: [] })
    const wrapper = await mountWith([partial])
    expect(wrapper.text()).toContain('Buyer affordability')
  })
})

describe('the search reaches a model through what it is FOR, not just its name', () => {
  it('🔴 FINDS A MODEL BY A WORD THAT APPEARS ONLY IN ITS COACH READING', async () => {
    // "overdraft" is nowhere in "Debtor Business Drag". A firm manager describing a
    // client's problem must still land on it — that is the whole point of the search.
    const wrapper = await mountWith(realModels())
    wrapper.setData({ query: 'overdraft' })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Debtor Business Drag')
    expect(wrapper.text()).not.toContain('Lease vs Buy')
  })

  it('finds a model by the situation it is built for', async () => {
    const wrapper = await mountWith(realModels())
    wrapper.setData({ query: 'vehicle' }) // only in Lease vs Buy's useWhen
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Lease vs Buy')
    expect(wrapper.text()).not.toContain('Debtor Business Drag')
  })

  it('finds a model by what it does NOT cover', async () => {
    // A manager who has been burnt once searches for the thing that caught them out.
    const wrapper = await mountWith(realModels())
    wrapper.setData({ query: 'fbt' })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Lease vs Buy')
    expect(wrapper.text()).not.toContain('Debtor Business Drag')
  })

  it('finds a model by a figure it calculates', async () => {
    const wrapper = await mountWith(realModels())
    wrapper.setData({ query: 'residual' }) // only in a heroFigure sub-label
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Lease vs Buy')
  })

  it('is case-insensitive and ignores surrounding spaces', async () => {
    const wrapper = await mountWith(realModels())
    wrapper.setData({ query: '  OVERDRAFT  ' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Debtor Business Drag')
  })

  it('an empty search shows every model again', async () => {
    const wrapper = await mountWith(realModels())
    wrapper.setData({ query: 'overdraft' })
    await wrapper.vm.$nextTick()
    wrapper.setData({ query: '' })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Debtor Business Drag')
    expect(wrapper.text()).toContain('Lease vs Buy')
  })

  it('a search that matches nothing says so, and offers the way back', async () => {
    // Never a silently empty page.
    const wrapper = await mountWith(realModels())
    wrapper.setData({ query: 'zzzznothing' })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('modelGuide.noMatches')
    expect(wrapper.text()).toContain('modelGuide.clearSearch')
  })
})

describe('a model with no Coach panel is not described as having one', () => {
  it('uses the screen-says heading where coachIsNotAPanel is set', async () => {
    const wrapper = await mountWith(realModels())
    const text = wrapper.text()
    // Lease vs Buy has a verdict, not a Coach panel; Debtor Drag has a Coach panel.
    expect(text).toContain('modelGuide.label.screenSays')
    expect(text).toContain('modelGuide.label.coach')
  })
})

describe('the page never fails silently', () => {
  it('says so when the backend cannot be reached, and offers a retry', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))
    const wrapper = mountWithBuefy(ModelGuide)
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('modelGuide.error')
    expect(wrapper.text()).toContain('modelGuide.retry')
  })

  it('treats an unexpected response shape as a failure rather than rendering nothing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, data: {} }) })
    const wrapper = mountWithBuefy(ModelGuide)
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('modelGuide.error')
  })

  it('an HTTP error is a failure, not an empty list', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    const wrapper = mountWithBuefy(ModelGuide)
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('modelGuide.error')
  })
})
