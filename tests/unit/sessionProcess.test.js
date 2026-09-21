'use strict'

/**
 * The standard planning session, and the ladder it comes down.
 *
 * Item 15.1. Approved artefact: `design/mockups/strategy-session-process.html`, approved
 * by Mike 2026-09-21 with its four decisions ruled the same day.
 *
 * 🔴 WHAT THESE GUARD, and none of it is wording or styling:
 *
 *   1. THE CASCADE RESOLVES TO THE RIGHT TIER, AND SAYS WHOSE IT IS. Decision C. An
 *      inherited session shown as the firm's own is a manager editing what they think is
 *      theirs and changing nothing — invisible on screen, because both states render
 *      identically.
 *   2. A MALFORMED STORED ROW DEGRADES UPWARD RATHER THAN REACHING A SCREEN. The value
 *      comes out of a database and was typed into a browser; half a session in front of a
 *      client looks perfectly reasonable to anyone who was not in the meeting.
 *   3. ONE CONCEPT NEVER REACHES TWO STEPS. Mike's ruling of 2026-09-21. A duplicate would
 *      print the same page twice in a client's plan.
 *   4. AN EMPTY STEP SURVIVES VALIDATION. Pivot's steps 4 and 5 hold nothing and still
 *      print on the agenda a client reads.
 *
 * UAT cannot see any of these: every one of them renders as a plausible screen.
 */

const sessionProcess = require('../../server/utils/sessionProcess')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

/** A loader that has nothing stored anywhere. */
const nothingStored = () => Promise.resolve(null)

/**
 * A loader with a stored process at named scopes only.
 * @param {Object<string, object>} byScope
 * @returns {function(string, string): Promise<object|null>}
 */
function storedAt (byScope) {
  return scopeId => Promise.resolve(byScope[scopeId] || null)
}

/** @param {string} name @returns {object} a minimal valid process */
function processNamed (name) {
  return { name, steps: [{ name: 'Step one', purpose: '', items: ['porters'] }] }
}

describe('the shipped platform session', () => {
  it('is served when nobody in the chain has written one, and says it was never authored', async () => {
    const resolved = await sessionProcess.resolveProcess('firm-1', nothingStored)

    expect(resolved.source.tier).toBe('mentor')
    expect(resolved.source.shipped).toBe(true)
    expect(resolved.inherited).toBe(true)
    expect(resolved.process.steps.length).toBeGreaterThan(0)
  })

  it('is not inherited by the mentor, because the mentor IS that tier', async () => {
    const resolved = await sessionProcess.resolveProcess(PLATFORM_SCOPE, nothingStored)
    expect(resolved.inherited).toBe(false)
  })

  it('hands back a fresh copy, so one caller cannot edit the next caller\'s session', async () => {
    const a = await sessionProcess.resolveProcess('firm-1', nothingStored)
    a.process.steps[0].name = 'MUTATED'
    const b = await sessionProcess.resolveProcess('firm-1', nothingStored)

    expect(b.process.steps[0].name).not.toBe('MUTATED')
  })

  it('names no concept twice across its steps, which is Mike\'s ruling in the data', () => {
    const base = sessionProcess.baseProcess()
    const all = base.steps.reduce((acc, s) => acc.concat(s.items), [])
    expect(new Set(all).size).toBe(all.length)
  })

  it('offers no closing block, which Decision D took off this screen', () => {
    const base = sessionProcess.baseProcess()
    const all = base.steps.reduce((acc, s) => acc.concat(s.items), [])
    expect(all.filter(k => k.indexOf('close-') === 0)).toEqual([])
  })
})

describe('the cascade stops at the first tier that has written one', () => {
  it('a firm\'s own session wins over everything above it', async () => {
    const resolved = await sessionProcess.resolveProcess(
      'firm-1', storedAt({ 'firm-1': processNamed('Ours'), [PLATFORM_SCOPE]: processNamed('Mentor') })
    )

    expect(resolved.process.name).toBe('Ours')
    expect(resolved.source.scopeId).toBe('firm-1')
    expect(resolved.source.tier).toBe('firm_manager')
    expect(resolved.inherited).toBe(false)
  })

  it('a firm with none of its own takes the mentor\'s, and is told whose it is', async () => {
    const resolved = await sessionProcess.resolveProcess(
      'firm-1', storedAt({ [PLATFORM_SCOPE]: processNamed('Mentor') })
    )

    expect(resolved.process.name).toBe('Mentor')
    expect(resolved.source.scopeId).toBe(PLATFORM_SCOPE)
    expect(resolved.source.tier).toBe('mentor')
    expect(resolved.source.shipped).toBe(false)
    expect(resolved.inherited).toBe(true)
  })

  it('never rejects when the store throws — the advisor still gets a session', async () => {
    const angry = () => Promise.reject(new Error('no database in this test'))
    const resolved = await sessionProcess.resolveProcess('firm-1', angry)

    expect(resolved.source.shipped).toBe(true)
    expect(resolved.process.steps.length).toBeGreaterThan(0)
  })

  it('🔴 falls through a MALFORMED stored row rather than serving half a session', async () => {
    // A row with no steps array is not a session. Serving it would put an empty Build
    // session in front of an advisor with nothing saying why.
    const resolved = await sessionProcess.resolveProcess(
      'firm-1', storedAt({ 'firm-1': { name: 'Broken' }, [PLATFORM_SCOPE]: processNamed('Mentor') })
    )

    expect(resolved.process.name).toBe('Mentor')
    expect(resolved.source.scopeId).toBe(PLATFORM_SCOPE)
  })
})

describe('what a manager may save', () => {
  it('refuses a session with no steps — a dead end, not a customisation', () => {
    expect(sessionProcess.validateProcess({ steps: [] }).ok).toBe(false)
  })

  it('refuses anything that is not an object with steps', () => {
    expect(sessionProcess.validateProcess(null).ok).toBe(false)
    expect(sessionProcess.validateProcess([]).ok).toBe(false)
    expect(sessionProcess.validateProcess({ steps: 'one, two' }).ok).toBe(false)
  })

  it('🔴 refuses the same concept in two steps — Mike\'s ruling, and a page printed twice', () => {
    const result = sessionProcess.validateProcess({
      steps: [
        { name: 'One', items: ['porters'] },
        { name: 'Two', items: ['porters'] }
      ]
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('porters')
  })

  it('de-duplicates the same concept repeated inside one step', () => {
    const result = sessionProcess.validateProcess({
      steps: [{ name: 'One', items: ['porters', 'porters', 'blue-ocean'] }]
    })

    expect(result.ok).toBe(true)
    expect(result.process.steps[0].items).toEqual(['porters', 'blue-ocean'])
  })

  it('🔴 keeps a step holding nothing — Pivot step 5, which is on the client\'s agenda', () => {
    const result = sessionProcess.validateProcess({
      steps: [{ name: 'Do It & Review It', items: [] }]
    })

    expect(result.ok).toBe(true)
    expect(result.process.steps).toHaveLength(1)
    expect(result.process.steps[0].items).toEqual([])
  })

  it('drops fields it does not understand rather than carrying them to a client\'s plan', () => {
    const result = sessionProcess.validateProcess({
      steps: [{ name: 'One', items: [], somethingElse: '<script>', nested: { a: 1 } }]
    })

    expect(result.ok).toBe(true)
    expect(Object.keys(result.process.steps[0]).sort()).toEqual(['items', 'name', 'purpose'])
  })

  it('refuses a step whose name is not text, and one with no name at all', () => {
    expect(sessionProcess.validateProcess({ steps: [{ items: [] }] }).ok).toBe(false)
    expect(sessionProcess.validateProcess({ steps: [{ name: 42, items: [] }] }).ok).toBe(false)
  })

  it('refuses a concept reference that is not a key', () => {
    expect(sessionProcess.validateProcess({ steps: [{ name: 'a', items: [{}] }] }).ok).toBe(false)
    expect(sessionProcess.validateProcess({ steps: [{ name: 'a', items: [''] }] }).ok).toBe(false)
  })

  it('bounds the size of a saved session, so a paste cannot become one', () => {
    const tooMany = []
    for (let i = 0; i <= sessionProcess.MAX_STEPS; i++) { tooMany.push({ name: 's' + i, items: [] }) }
    expect(sessionProcess.validateProcess({ steps: tooMany }).ok).toBe(false)

    const tooFull = []
    for (let i = 0; i <= sessionProcess.MAX_ITEMS_PER_STEP; i++) { tooFull.push('c' + i) }
    expect(sessionProcess.validateProcess({ steps: [{ name: 'a', items: tooFull }] }).ok).toBe(false)
  })

  it('keeps an empty purpose as an empty string, never as undefined', () => {
    const result = sessionProcess.validateProcess({ steps: [{ name: 'One', items: [] }] })
    expect(result.process.steps[0].purpose).toBe('')
  })
})
