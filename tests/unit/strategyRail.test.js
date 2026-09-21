'use strict'

/**
 * The stage rail — item 15.1, Mike's request of 2026-09-21: *"enable me to be able to click
 * on the step banner (scope, build etc) in any order i want to make it easier if i forget
 * something"*.
 *
 * 🔴 WHAT THESE GUARD, AND NONE OF IT IS VISIBLE TO A PERSON TESTING THE SCREEN:
 *
 *   1. **`steps` is in the progress order.** It was missing, and `indexOf` returned -1 for
 *      it, so on Scope — the first screen an advisor ever sees — segment 2 rendered as DONE,
 *      because `-1 < 0`; and on Build session segment 1 rendered as untouched, because
 *      nothing is less than -1. **A green segment reads as progress, not as a mistake**,
 *      which is exactly why it survived from the day Build session was added until it was
 *      measured on screen.
 *   2. **Leaving Scope fetches the newly ticked concept's table.** Without it a concept
 *      ticked on a RETURN visit is silently absent from Build session, the meeting and the
 *      client's plan — the advisor ticks it, watches the menu confirm it, and never sees it
 *      again. That is precisely the "I forgot something" journey this feature exists for, so
 *      the feature would have been broken by the thing it was built for.
 *   3. **Leaving Scope saves the scope.** It otherwise only reaches the backend attached to
 *      a change of steps.
 *   4. **The last four stages need a session.** They read `sessionId` to save what is typed.
 */

const Page = require('../../pages/strategy-planner.vue').default

const RAIL = Page.computed.railStages.call({})
const KEYS = RAIL.map(s => s.key)

/** The page's own `railClass`, called against a stub holding only what it reads. */
function classesOn (step) {
  const out = {}
  KEYS.forEach((key) => {
    out[key] = Page.methods.railClass.call({ step, railStages: RAIL }, key)
  })
  return out
}

/** Which segment, if any, is marked done. */
function doneOn (step) {
  const c = classesOn(step)
  return KEYS.filter(k => c[k]['is-done'])
}

describe('the rail names all five stages, in order, in one place', () => {
  test('every stage the page can be in is on it', () => {
    expect(KEYS).toEqual(['scope', 'steps', 'run', 'objectives', 'plan'])
  })

  test('exactly one segment is lit, wherever the advisor is', () => {
    KEYS.forEach((step) => {
      const c = classesOn(step)
      expect({ step, lit: KEYS.filter(k => c[k]['is-on']) }).toEqual({ step, lit: [step] })
    })
  })
})

describe('the rail tells the truth about progress', () => {
  test('nothing is done on the first screen', () => {
    // 🔴 THE BUG THIS FILE WAS WRITTEN FOR. "2 · Build session" showed as DONE here, on the
    // opening screen of the feature, before the advisor had been anywhere at all.
    expect(doneOn('scope')).toEqual([])
  })

  test('Scope is done once the advisor has moved past it', () => {
    // And this was the other half: segment 1 showed as untouched while standing on segment 2.
    expect(doneOn('steps')).toEqual(['scope'])
  })

  test('everything behind the advisor is done, and nothing ahead of them is', () => {
    expect(doneOn('run')).toEqual(['scope', 'steps'])
    expect(doneOn('objectives')).toEqual(['scope', 'steps', 'run'])
    expect(doneOn('plan')).toEqual(['scope', 'steps', 'run', 'objectives'])
  })
})

describe('which stages may be opened', () => {
  test('Scope always, whether or not a session exists', () => {
    expect(Page.methods.canOpenStage.call({ sessionId: null }, 'scope')).toBe(true)
  })

  test('the other four need a session, because they save into one', () => {
    const none = { sessionId: null }
    KEYS.filter(k => k !== 'scope').forEach((key) => {
      expect({ key, open: Page.methods.canOpenStage.call(none, key) }).toEqual({ key, open: false })
    })
  })

  test('and all five once it is open', () => {
    const open = { sessionId: 7 }
    KEYS.forEach((key) => {
      expect({ key, open: Page.methods.canOpenStage.call(open, key) }).toEqual({ key, open: true })
    })
  })
})

describe('leaving Scope carries the ticks with it', () => {
  /**
   * @param {object} over
   * @returns {object} a stub recording what `goToStage` did
   */
  function stub (over) {
    const calls = []
    return Object.assign({
      step: 'scope',
      sessionId: 7,
      calls,
      loadCaptures: jest.fn(() => { calls.push('loadCaptures'); return Promise.resolve() }),
      seedSteps: jest.fn(() => calls.push('seedSteps')),
      saveScope: jest.fn(() => { calls.push('saveScope'); return Promise.resolve() }),
      canOpenStage: Page.methods.canOpenStage
    }, over || {})
  }

  test('the new concept\'s table is fetched BEFORE the next screen reads it', async () => {
    const vm = stub()
    await Page.methods.goToStage.call(vm, 'run')
    // 🔴 ORDER MATTERS. `seedSteps` filters the handed-down process against the cards that
    // exist, and a card only exists once its capture has arrived. Seeded first, a returning
    // advisor gets steps with the new concept missing from them.
    expect(vm.calls).toEqual(['loadCaptures', 'seedSteps', 'saveScope'])
    expect(vm.step).toBe('run')
  })

  test('it happens however far forward the advisor jumps', async () => {
    const vm = stub()
    await Page.methods.goToStage.call(vm, 'plan')
    expect(vm.loadCaptures).toHaveBeenCalled()
    expect(vm.step).toBe('plan')
  })

  test('moving between the LATER stages does not refetch anything', async () => {
    const vm = stub({ step: 'run' })
    await Page.methods.goToStage.call(vm, 'plan')
    expect(vm.calls).toEqual([])
    expect(vm.step).toBe('plan')
  })

  test('clicking the stage you are already on does nothing at all', async () => {
    const vm = stub()
    await Page.methods.goToStage.call(vm, 'scope')
    expect(vm.calls).toEqual([])
  })

  test('a stage that cannot be opened is not opened', async () => {
    const vm = stub({ sessionId: null })
    await Page.methods.goToStage.call(vm, 'run')
    expect(vm.step).toBe('scope')
    expect(vm.calls).toEqual([])
  })
})
