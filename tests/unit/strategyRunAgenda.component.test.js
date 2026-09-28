/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * StrategyRunAgenda — item 8.4, slice 4 (screens 8 and 9, approved 2026-09-28).
 *
 * Nothing here asserts wording or CSS. What a tester glancing at a tidy agenda cannot see:
 *   - the countdown counts the LIVE concept's own minutes, from when that concept started —
 *     across a "part 2" roll-over — and turns to an overrun at zero (Decision G);
 *   - "Running N min behind" is worked from the overrun, and the planned times never move;
 *   - "Today's" means the live concept's day on a two-day workshop (Decision H).
 */

const StrategyRunAgenda = require('../../components/strategy/StrategyRunAgenda.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

const CARDS = [
  { key: 'objective', name: 'Our Session Objective' },
  { key: 'porters', name: "Porter's 5 Forces" },
  { key: 'blue', name: 'Blue Ocean Strategy' }
]
const STEPS = [
  { name: 'Set the scene', items: ['objective'] },
  { name: 'Fronts', items: ['porters', 'break-aaaaaa', 'blue'] }
]
const TIMING = { startsAt: '09:00', minutes: { objective: 20, porters: 40, 'break-aaaaaa': 15, blue: 30 }, days: {} }

function mount (live, timing, steps) {
  return mountWithBuefy(StrategyRunAgenda, {
    propsData: { steps: steps || STEPS, cards: CARDS, timing: timing || TIMING, live: live || null }
  })
}

const T0 = 1000000

test('the agenda lists every concept and break with its planned time', () => {
  const w = mount()
  expect(w.vm.rows.map(r => [r.name, r.span])).toEqual([
    ['Our Session Objective', '9:00–9:20'],
    ["Porter's 5 Forces", '9:20–10:00'],
    ['strategyPlanner.timing.break', '10:00–10:15'],
    ['Blue Ocean Strategy', '10:15–10:45']
  ])
})

test('rows before the live one are past, and the live one is marked', () => {
  const w = mount({ key: 'blue', label: 'Blue', startedAt: T0 })
  expect(w.vm.rows.map(r => r.past)).toEqual([true, true, true, false])
  expect(w.vm.rows.map(r => r.live)).toEqual([false, false, false, true])
})

test('with nothing live there is no countdown', () => {
  const w = mount()
  expect(w.vm.countdown).toBeNull()
})

test('the countdown counts the live concept\'s own minutes from when it started', async () => {
  const w = mount({ key: 'porters', label: "Porter's 5 Forces", startedAt: T0 })
  await w.setData({ now: T0 + (27 * 60 + 20) * 1000 })
  expect(w.vm.countdown).toMatchObject({ over: false, figure: '12:40' })
  expect(w.vm.countdown.what).toContain('strategyPlanner.timing.left')
  expect(w.vm.behindMinutes).toBe(0)
})

test('🔴 at zero it turns to an overrun, and the session says how far behind it is', async () => {
  const w = mount({ key: 'porters', label: "Porter's 5 Forces", startedAt: T0 })
  await w.setData({ now: T0 + (43 * 60 + 10) * 1000 })
  expect(w.vm.countdown).toMatchObject({ over: true, figure: '+3:10' })
  expect(w.vm.behindMinutes).toBe(4)
  // Planned finish 10:45 plus 4 minutes behind — and the planned times themselves unchanged.
  expect(w.vm.formatClock(w.vm.dayFinish + w.vm.behindMinutes)).toBe('10:49')
  expect(w.vm.rows[3].span).toBe('10:15–10:45')
})

test('a concept with no minutes set has no countdown rather than one at zero', async () => {
  const w = mount({ key: 'objective', label: 'x', startedAt: T0 }, { startsAt: '09:00', minutes: {}, days: {} })
  await w.setData({ now: T0 + 5000 })
  expect(w.vm.countdown).toBeNull()
})

test('"Today\'s agenda" is the live concept\'s day on a two-day workshop', () => {
  const steps = [{ name: 'A', items: ['objective', 'day-bbbbbb', 'blue'] }]
  const timing = { startsAt: '09:00', minutes: { objective: 20, blue: 30 }, days: { 'day-bbbbbb': '08:30' } }
  const dayTwo = mount({ key: 'blue', label: 'Blue', startedAt: T0 }, timing, steps)
  expect(dayTwo.vm.rows.map(r => r.name)).toEqual(['Blue Ocean Strategy'])
  const dayOne = mount(null, timing, steps)
  expect(dayOne.vm.rows.map(r => r.name)).toEqual(['Our Session Objective'])
})

test('no start time shows no agenda at all rather than an agenda of blanks', () => {
  const w = mount(null, { startsAt: null, minutes: { objective: 20 }, days: {} })
  expect(w.vm.rows).toEqual([])
  expect(w.find('.sra-agenda').exists()).toBe(false)
})

test('without a start time the countdown still runs on the live concept\'s minutes', async () => {
  const w = mount({ key: 'objective', label: 'x', startedAt: T0 }, { startsAt: null, minutes: { objective: 20 }, days: {} })
  await w.setData({ now: T0 + 60000 })
  expect(w.vm.countdown).toMatchObject({ over: false, figure: '19:00' })
})
