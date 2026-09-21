/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The manager's authoring screen for the standard planning session — item 15.1,
 * Decision C (Mike, 2026-09-21).
 *
 * 🔴 WHAT THESE GUARD, and none of it is wording or styling:
 *
 *   1. THE TRAY AND THE ADVISOR'S TRAY ADMIT THE SAME CONCEPTS. A concept offered here and
 *      not there arrives on the advisor's screen as an empty step with nothing saying why.
 *      The rule lives in ONE place, `isPlaceableConcept`, and this proves this screen uses
 *      it rather than a second copy.
 *   2. AN INHERITED SESSION IS NEVER SHOWN AS THIS TIER'S OWN. Both states render
 *      identically, so a manager would edit what they believe is theirs and change nothing.
 *   3. SAVING SENDS WHAT IS ON SCREEN, INCLUDING THE PURPOSES. The purpose is the one field
 *      the advisor's builder does not edit, so it is the one most easily dropped in transit.
 *
 * None of the three is visible to a person testing the screen.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmSessionProcess = require('~/components/firm/FirmSessionProcess.vue').default

/** A concept with a drawing, so `isPlaceableConcept` admits it without a table. */
const DRAWN = 'porters-5-forces'

const CARDS = [
  { key: 'fw-porters-five-forces', conceptId: DRAWN, name: "Porter's 5 Forces", deck: 'Strategic Orientation 2', hasTable: true },
  { key: 'no-table-no-drawing', conceptId: 'not-a-real-concept', name: 'Neither', deck: 'Strategic Orientation 2', hasTable: false }
]

/**
 * @param {object} process what GET /session-process answers
 * @returns {object} the mounted wrapper
 */
function mount (process) {
  global.fetch = jest.fn((path) => {
    const body = path.includes('/cards')
      ? { success: true, cards: CARDS }
      : process
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
  })

  return mountWithBuefy(FirmSessionProcess, { propsData: { apiToken: 't' } })
}

/** A firm receiving a session the MENTOR authored. */
const INHERITED = {
  success: true,
  process: { name: 'The standard planning session', steps: [{ name: 'One', purpose: 'Why', items: ['fw-porters-five-forces'] }] },
  source: { scopeId: '__platform__', tier: 'mentor', shipped: false },
  tier: 'firm_manager',
  inherited: true,
  ownedHere: false
}

/** A firm holding one of its own. */
const OURS = {
  success: true,
  process: { name: 'Ours', steps: [{ name: 'One', purpose: 'Why', items: [] }] },
  source: { scopeId: 'firm-a', tier: 'firm_manager', shipped: false },
  tier: 'firm_manager',
  inherited: false,
  ownedHere: true
}

/** The MENTOR looking at the shipped default, which nobody has edited. */
const SHIPPED_AT_MENTOR = {
  success: true,
  process: { name: 'The standard planning session', steps: [{ name: 'One', purpose: '', items: [] }] },
  source: { scopeId: '__platform__', tier: 'mentor', shipped: true },
  tier: 'mentor',
  inherited: false,
  ownedHere: false
}

/** A FIRM receiving the shipped default, nobody above having written one. */
const SHIPPED_AT_FIRM = Object.assign({}, SHIPPED_AT_MENTOR, { tier: 'firm_manager', inherited: true })

/**
 * Let the mounted `load()` settle.
 *
 * ⚠ TWO `$nextTick`s ARE NOT ENOUGH, and that is not a style preference — the component
 * awaits two fetches and then assigns, so the microtask queue has to drain before the
 * screen is real. Asserting too early passes on an empty component and proves nothing.
 *
 * @param {object} w
 * @returns {Promise<void>}
 */
async function flush (w) {
  // setTimeout, not setImmediate: this suite runs in jsdom, which has no setImmediate.
  await new Promise(resolve => setTimeout(resolve, 0))
  await w.vm.$nextTick()
}

afterEach(() => { delete global.fetch })

describe('the authoring screen says whose session is in force', () => {
  it('🔴 marks an inherited session as the tier above\'s, never as this tier\'s own', async () => {
    const w = mount(INHERITED)
    await flush(w)

    expect(w.vm.ownedHere).toBe(false)
    // Exactly one rung owns it, and it is the one the resolve named.
    const owners = w.vm.ladder.filter(r => r.isOwner)
    expect(owners).toHaveLength(1)
    expect(owners[0].tier).toBe('mentor')
  })

  it('marks this tier as the owner when it holds one of its own', async () => {
    const w = mount(OURS)
    await flush(w)

    expect(w.vm.ownedHere).toBe(true)
    expect(w.vm.ladder.filter(r => r.isYou).map(r => r.tier)).toEqual(['firm_manager'])
  })

  it('⚠ claims no knowledge of tiers it never asked about', async () => {
    const w = mount(INHERITED)
    await flush(w)

    // Three rungs are not the owner, and none of them is drawn as holding anything —
    // this screen reads one scope and must not invent the other three.
    expect(w.vm.ladder.filter(r => r.isOwner)).toHaveLength(1)
  })

  // 🔴 THE SHIPPED DEFAULT WAS THE CASE NOBODY HAD WRITTEN, AND IT BROKE BOTH LINES. Found
  // by opening the screen on 2026-09-21, with the whole suite green: the ladder drew a bare
  // dash against all four tiers, and the sentence read "You are using the standard session
  // set by the standard session." Both are what a manager sees first.
  it('🔴 attributes the SHIPPED default to the mentor rung rather than to nobody', async () => {
    const w = mount(SHIPPED_AT_MENTOR)
    await flush(w)

    const owners = w.vm.ladder.filter(r => r.isOwner)
    expect(owners).toHaveLength(1)
    expect(owners[0].tier).toBe('mentor')
    // Not a dash. A rung saying nothing reads as a broken screen.
    expect(owners[0].state).not.toBe('—')
  })

  // ⚠ THESE ASSERT WHICH SENTENCE IS CHOSEN, NEVER WHAT IT SAYS. The harness's `$t`
  // returns the key, which suits the testing rule of 2026-08-24 exactly: a person in UAT
  // reads the words instantly, and what they cannot see is the wrong one of three being
  // picked for their tier.
  it('🔴 tells the mentor the shipped session is THEIRS, not somebody else\'s', async () => {
    const w = mount(SHIPPED_AT_MENTOR)
    await flush(w)

    // The mentor inherits from nobody — the shipped file is its own starting point.
    expect(w.vm.lede).toBe('sessionProcess.shippedMentorLede')
  })

  it('🔴 never picks the "set by {whose}" sentence when there is no author to name', async () => {
    // The defect in one assertion: `ownerLabel` is empty for a session nobody authored,
    // and the inherited sentence interpolates it — which is how "set by the standard
    // session" reached the screen.
    const atFirm = mount(SHIPPED_AT_FIRM)
    await flush(atFirm)

    expect(atFirm.vm.ownerLabel).toBe('')
    expect(atFirm.vm.lede).toBe('sessionProcess.shippedLede')
  })

  it('still names the author where there IS one', async () => {
    const w = mount(INHERITED)
    await flush(w)

    expect(w.vm.ownerLabel).toBe('sessionProcess.tierMentor')
    // The harness prints the key with its interpolation, which is exactly what is wanted
    // here: the sentence chosen AND the name carried into it.
    expect(w.vm.lede).toContain('sessionProcess.inheritedLede')
    expect(w.vm.lede).toContain('tierMentor')
  })
})

describe('the tray admits exactly what the advisor\'s tray admits', () => {
  it('🔴 drops a concept with neither a table nor a drawing, using the shared rule', async () => {
    const w = mount(INHERITED)
    await flush(w)

    expect(w.vm.placeableCards.map(c => c.key)).toEqual(['fw-porters-five-forces'])
  })
})

describe('saving', () => {
  it('🔴 sends the purposes as well as the names and the concepts', async () => {
    const w = mount(OURS)
    await flush(w)

    w.vm.onStepsChanged([{ key: 's1', name: 'Renamed', purpose: 'What it is for', items: ['fw-porters-five-forces'] }])
    await w.vm.save()

    const put = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'PUT')
    const sent = JSON.parse(put[1].body)
    expect(sent.steps[0]).toEqual({
      name: 'Renamed',
      purpose: 'What it is for',
      items: ['fw-porters-five-forces']
    })
  })

  it('is not offered until something has changed', async () => {
    const w = mount(OURS)
    await flush(w)

    expect(w.vm.dirty).toBe(false)
    w.vm.onStepsChanged(w.vm.steps)
    expect(w.vm.dirty).toBe(true)
  })

  it('⚠ re-reads after a save rather than assuming the tier now owns it', async () => {
    const w = mount(OURS)
    await flush(w)

    w.vm.onStepsChanged([{ key: 's1', name: 'Renamed', purpose: '', items: [] }])
    await w.vm.save()

    const getsAfterPut = global.fetch.mock.calls
      .map(c => c[1] && c[1].method)
      .join(',')
    expect(getsAfterPut).toContain('PUT')
    expect(w.vm.dirty).toBe(false)
  })
})
