/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const OwnerExpectations = require('~/components/OwnerExpectations.vue').default
const {
  computeOwnerExpectationsModel,
  computeOwnerExpectations,
  computeDevelopmentStages,
  computeQuickLoan,
  DEFAULT_INPUTS
} = require('~/server/report/ownerExpectationsModel')
const { validateInputs } = require('~/server/utils/savedReports')

/**
 * Screen test — Business Owner Expectations (item 5.4).
 *
 * Pins the SEAMS, none of which a person in UAT can see:
 *   - what the screen sends to the model (a split sent as 10 instead of 0.10 looks plausible);
 *   - that an edit to one owner's tasks lands on that owner alone;
 *   - that a tier's starting list reaches every owner without dragging the workbook's sample
 *     split onto tasks it never named, and never overwrites a client's saved figures;
 *   - that what the screen saves is accepted by the saved-report store and loads back intact.
 * No wording, no CSS class, no card count.
 */

/** Mount with the model answering, and the starting-list read answering `startingTasks`. */
async function mountWith (startingTasks) {
  global.fetch = jest.fn((url) => {
    if (String(url).indexOf('/api/owner-focus-tasks') === 0) {
      if (!startingTasks) { return Promise.resolve({ ok: false, json: () => Promise.resolve({}) }) }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ tasks: startingTasks }) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: computeOwnerExpectationsModel() }) })
  })
  const wrapper = mountWithBuefy(OwnerExpectations, { propsData: {} })
  for (let i = 0; i < 4; i++) {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
  }
  return wrapper
}

const SHIPPED = require('~/data/owner-focus-tasks.json').tasks

afterEach(() => { delete global.fetch })

describe('OwnerExpectations screen — the payload', () => {
  it('🔴 reproduces the workbook sample EXACTLY on the shipped starting list', async () => {
    const wrapper = await mountWith(SHIPPED)
    const body = JSON.parse(JSON.stringify(wrapper.vm.recomputeRequest().body))

    expect(computeOwnerExpectations(body)).toEqual(computeOwnerExpectations(DEFAULT_INPUTS))
    expect(computeDevelopmentStages(body)).toEqual(computeDevelopmentStages(DEFAULT_INPUTS))
    expect(computeQuickLoan(body)).toEqual(computeQuickLoan(DEFAULT_INPUTS))
  })

  it('sends task names with splits and the loan rate as decimals, not the percentages it shows', async () => {
    const wrapper = await mountWith(SHIPPED)
    const body = wrapper.vm.recomputeRequest().body
    expect(body.owners[0].duties[0]).toEqual({ task: '(Strategic) Client Dealings', now: 0.1, focus: 0.4 })
    expect(body.owners[5].duties[8].focus).toBeCloseTo(0.1, 10)
    expect(body.loan.rate).toBeCloseTo(0.07, 10)
  })
})

describe('OwnerExpectations screen — each owner\'s own tasks', () => {
  it('rename, add and remove change the open owner and no other', async () => {
    const wrapper = await mountWith(SHIPPED)
    wrapper.vm.openOwner = 3
    await wrapper.vm.$nextTick()
    wrapper.vm.openForm.duties[8].task = 'Board meetings'
    wrapper.vm.removeTask(9)
    wrapper.vm.addTask()
    wrapper.vm.openForm.duties[9].task = 'Hiring'
    wrapper.vm.openForm.duties[9].focusPct = 15

    const body = wrapper.vm.recomputeRequest().body
    expect(body.owners[3].duties.map(d => d.task).slice(8)).toEqual(['Board meetings', 'Hiring'])
    expect(body.owners[3].duties[9].focus).toBeCloseTo(0.15, 10)
    expect(body.owners[0].duties.map(d => d.task)).toEqual(SHIPPED)
  })

  it('never removes an owner\'s last task, and never adds past the model\'s ceiling', async () => {
    const wrapper = await mountWith(SHIPPED)
    const o = wrapper.vm.openForm
    while (o.duties.length > 1) { wrapper.vm.removeTask(0) }
    wrapper.vm.removeTask(0)
    expect(o.duties).toHaveLength(1)
    for (let i = 0; i < 40; i++) { wrapper.vm.addTask() }
    expect(o.duties).toHaveLength(wrapper.vm.maxTasks)
  })
})

describe('OwnerExpectations screen — the starting list handed down', () => {
  it('🔴 a tier\'s own list reaches every owner with a BLANK split — never the workbook\'s by position', async () => {
    const wrapper = await mountWith(['Board', 'Sales', 'Hiring'])
    const body = wrapper.vm.recomputeRequest().body
    body.owners.forEach((o) => {
      expect(o.duties.map(d => d.task)).toEqual(['Board', 'Sales', 'Hiring'])
      o.duties.forEach(d => expect(d.now).toBe(0))
    })
  })

  it('a failed read keeps the workbook\'s list and says so', async () => {
    const wrapper = await mountWith(null)
    expect(wrapper.vm.startingFailed).toBe(true)
    expect(wrapper.vm.form.owners[0].duties.map(d => d.task)).toEqual(SHIPPED)
  })

  it('never overwrites a client\'s saved tasks when the starting list arrives late', async () => {
    const wrapper = await mountWith(SHIPPED)
    wrapper.vm.applyReportInputs({ 'o1.tasks': ['Own task'], 'o1.now': [100], 'o1.focus': [100] })
    wrapper.vm.applyStartingTasks(['Board', 'Sales'])
    expect(wrapper.vm.form.owners[0].duties.map(d => d.task)).toEqual(['Own task'])
  })
})

describe('OwnerExpectations screen — saved against the client', () => {
  it('🔴 what it saves is accepted by the saved-report store, and loads back to the same model', async () => {
    const wrapper = await mountWith(SHIPPED)
    wrapper.vm.openForm.duties[0].task = 'Renamed'
    wrapper.vm.form.development.markets[2] = 'x'.repeat(900)
    const saved = wrapper.vm.reportInputs()

    // The store's own validator — a row it would refuse is a save that silently fails.
    expect(() => validateInputs(JSON.parse(JSON.stringify(saved)))).not.toThrow()

    const before = JSON.parse(JSON.stringify(wrapper.vm.recomputeRequest().body))
    const other = await mountWith(SHIPPED)
    other.vm.applyReportInputs(validateInputs(JSON.parse(JSON.stringify(saved))))
    const after = JSON.parse(JSON.stringify(other.vm.recomputeRequest().body))

    before.development.markets[2] = before.development.markets[2].slice(0, 200)
    expect(computeOwnerExpectations(after)).toEqual(computeOwnerExpectations(before))
    expect(computeDevelopmentStages(after)).toEqual(computeDevelopmentStages(before))
    expect(computeQuickLoan(after)).toEqual(computeQuickLoan(before))
    expect(after.owners[0].duties[0].task).toBe('Renamed')
  })

  it('ignores keys it does not know and shapes it does not expect', async () => {
    const wrapper = await mountWith(SHIPPED)
    const before = JSON.parse(JSON.stringify(wrapper.vm.recomputeRequest().body))
    wrapper.vm.applyReportInputs({ 'o1.incomes': 'lots', 'loan.type': 'Balloon', 'o9.name': 'Nobody', junk: [1] })
    const after = JSON.parse(JSON.stringify(wrapper.vm.recomputeRequest().body))
    expect(after.owners[0].incomes).toEqual(before.owners[0].incomes)
    expect(after.loan.type).toBe('Table')
  })
})

describe('OwnerExpectations screen — judgement and failure', () => {
  it('flags a split that does not add to the whole week, and tolerates floating-point noise', async () => {
    const wrapper = await mountWith(SHIPPED)
    expect(wrapper.vm.isWhole(0.1 + 0.2 + 0.7)).toBe(true)
    expect(wrapper.vm.isWhole(0.95)).toBe(false)
  })

  it('never renders the stale flag itself', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network down')))
    const wrapper = mountWithBuefy(OwnerExpectations, { propsData: {} })
    for (let i = 0; i < 3; i++) {
      await wrapper.vm.$nextTick()
      await Promise.resolve()
    }
    expect(wrapper.text()).not.toMatch(/\btrue\b/)
  })
})
