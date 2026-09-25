/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const OwnerExpectations = require('~/components/OwnerExpectations.vue').default
const { requestFromSaved, contrastFrom } = require('~/utils/ownerExpectationsPrint')
const { computeOwnerExpectationsModel } = require('~/server/report/ownerExpectationsModel')

/**
 * Item 15.23 — Business Owner Expectations run inside a Strategy Planner session, from
 * `design/mockups/strategy-concept-owner-expectations.html`, approved by Mike 2026-09-25.
 *
 * Pins what no one in UAT can see:
 *   - the client's plan asks the model EXACTLY what the model's own screen asks, so the plan
 *     can never print figures different from the ones the advisor just worked on;
 *   - hosted in the planner, the screen still saves under the model's own route — Decision B,
 *     one record per client, never a second copy keyed by the planner's page;
 *   - the contrast table leaves off empty owner blocks and unused tasks, and nothing else.
 */

const SHIPPED = require('~/data/owner-focus-tasks.json').tasks

async function settle (wrapper) {
  for (let i = 0; i < 4; i++) {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
  }
}

/** Mount with the model answering and the starting list read as the shipped one. */
async function mountScreen (propsData) {
  global.fetch = jest.fn((url) => {
    const u = String(url)
    if (u.indexOf('/api/owner-focus-tasks') === 0) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ tasks: SHIPPED }) })
    }
    if (u.indexOf('/api/client-reports/saved/') === 0) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ report: null, clientChanges: [] }) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: computeOwnerExpectationsModel() }) })
  })
  const wrapper = mountWithBuefy(OwnerExpectations, { propsData: propsData || {} })
  await settle(wrapper)
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('the plan asks the model what the screen asks', () => {
  it('🔴 builds the same request from the saved record as the screen builds from its form', async () => {
    const wrapper = await mountScreen()
    // Move off the sample in every part the record carries, so a key the helper drops shows.
    wrapper.vm.openOwner = 1
    await wrapper.vm.$nextTick()
    wrapper.vm.openForm.name = 'Wiremu'
    wrapper.vm.openForm.duties[2].focusPct = 33
    wrapper.vm.removeTask(9)
    wrapper.vm.addTask()
    wrapper.vm.openForm.duties[9].task = 'Board meetings'
    wrapper.vm.openForm.duties[9].nowPct = 5
    wrapper.vm.form.development.fixedCosts[2] = 310000
    wrapper.vm.form.loan.ratePct = 8.5
    await settle(wrapper)

    const fromScreen = JSON.parse(JSON.stringify(wrapper.vm.recomputeRequest().body))
    const fromSaved = JSON.parse(JSON.stringify(requestFromSaved(wrapper.vm.reportInputs())))
    expect(fromSaved).toEqual(fromScreen)
  })
})

describe('hosted in a session, the screen keeps one record per client — Decision B', () => {
  it('🔴 reads and saves under /owner-expectations, never under the planner\'s own page', async () => {
    const wrapper = await mountScreen({ embedded: true, clientId: 'c-1', clientName: 'Harbour Joinery', token: 't-1' })
    expect(wrapper.vm.savedReportRoute).toBe('/owner-expectations')

    const readUrl = global.fetch.mock.calls.map(c => String(c[0])).find(u => u.indexOf('/api/client-reports/saved/') === 0)
    expect(readUrl).toBe('/api/client-reports/saved/c-1?route=%2Fowner-expectations')

    global.fetch.mockClear()
    await wrapper.vm.saveReport()
    const save = global.fetch.mock.calls.find(c => String(c[0]).indexOf('/api/client-reports/saved/c-1') === 0)
    expect(save).toBeTruthy()
    expect(JSON.parse(save[1].body).route).toBe('/owner-expectations')
    expect(save[1].headers.Authorization).toBe('Bearer t-1')
  })
})

describe('the contrast table', () => {
  const sample = computeOwnerExpectationsModel()

  it('🔴 no name = no column — Mike, 2026-09-25', () => {
    // Every named owner prints, earning or not; clearing the name is how one is removed.
    expect(contrastFrom(sample).owners.map(o => o.name))
      .toEqual(['Andy', 'Bill', 'Shirley', 'Bob', 'John', 'Dick'])
    const r = JSON.parse(JSON.stringify(sample))
    r.owners.owners[2].name = ''
    r.owners.owners[3].name = '   '
    const table = contrastFrom(r)
    expect(table.owners.map(o => o.name)).toEqual(['Andy', 'Bill', 'John', 'Dick'])
    expect(table.owners[0].incomes).toEqual([120000, 125000, 175000, 225000])
    expect(table.revenue).toEqual(sample.development.stages.map(s => s.revenue))
  })

  it('leaves off a task nobody spends time on, now or at focus', () => {
    const names = contrastFrom(sample).tasks.map(t => t.name)
    expect(names).not.toContain('Other 1')
    expect(names).toContain('Fishing')
  })

  it('shows a task one owner holds and another does not as blank for the other', () => {
    const r = JSON.parse(JSON.stringify(sample))
    r.owners.owners[1].duties.push({ task: 'Board meetings', now: 0, focus: 0.1 })
    const row = contrastFrom(r).tasks.find(t => t.name === 'Board meetings')
    expect(row.cells[0]).toBeNull()
    expect(row.cells[1]).toEqual({ now: 0, focus: 0.1 })
  })
})
