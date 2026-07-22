/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const BusinessPerformanceReport = require('~/components/BusinessPerformanceReport.vue').default
const { computeWorkingCapitalCycle, DEFAULT_INPUTS } = require('~/server/report/workingCapitalCycleModel')

/**
 * The orbiting coin on the working-capital wheel.
 *
 * It exists to show the client that money goes round FASTER when the cycle is shorter.
 * Measured live 2026-07-21, it did not: `max(1.4, 6 / cycleFactor)` was floored at 1.4s,
 * so 0 days receivable (30 turns a month) and 10 days (6 turns) spun at exactly the same
 * speed while every figure beside them changed. At the far end, 90 days produced a
 * 17-second lap that reads as stationary rather than slow.
 *
 * These tests pin the property that was actually broken — that a faster cycle is
 * visibly faster ACROSS THE WHOLE RANGE — rather than the specific numbers, so the
 * curve can be retuned without rewriting them.
 */

/** Read the coin's lap time, in seconds, for a given cycle factor. */
async function lapSeconds (cycleFactorMonthly) {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
  const wrapper = mountWithBuefy(BusinessPerformanceReport, { propsData: {} })
  await wrapper.vm.$nextTick()
  wrapper.setData({ out: Object.assign(computeWorkingCapitalCycle(Object.assign({}, DEFAULT_INPUTS)), { cycleFactorMonthly }) })
  await wrapper.vm.$nextTick()
  return parseFloat(wrapper.vm.spinDur)
}

afterEach(() => { delete global.fetch })

describe('Working Capital — the coin responds across the whole range', () => {
  it('spins faster at 30 turns a month than at 6 — the dead zone that was reported', async () => {
    // Both of these used to floor at 1.40s, so dragging receivables from 10 days to 0
    // changed every number on screen and the coin not at all.
    const fast = await lapSeconds(30)
    const slower = await lapSeconds(6)

    expect(fast).toBeLessThan(slower)
    // Not merely different — visibly different.
    expect(slower - fast).toBeGreaterThan(1)
  })

  it('never crawls so slowly that it reads as stopped', async () => {
    // 90 days receivable used to give a 17-second lap.
    const verySlow = await lapSeconds(0.35)
    expect(verySlow).toBeLessThanOrEqual(8)
  })

  it('stays fast enough to read as motion, not a blur', async () => {
    const veryFast = await lapSeconds(1000)
    expect(veryFast).toBeGreaterThanOrEqual(0.8)
  })

  it('is monotonic — more turns is never a slower coin', async () => {
    const laps = []
    for (const turns of [0.2, 0.35, 1, 2, 6, 12, 30, 60]) {
      laps.push(await lapSeconds(turns))
    }
    for (let i = 1; i < laps.length; i++) {
      expect(laps[i]).toBeLessThanOrEqual(laps[i - 1])
    }
  })

  it('separates the mid-range too, rather than only the extremes', async () => {
    // A clamp alone would fix the ends and leave the middle flat.
    const a = await lapSeconds(1)
    const b = await lapSeconds(2)
    expect(a - b).toBeGreaterThan(0.5)
  })

  it('returns a usable CSS duration even before the first result arrives', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const wrapper = mountWithBuefy(BusinessPerformanceReport, { propsData: {} })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.spinDur).toMatch(/^\d+\.\d{2}s$/)
  })
})
