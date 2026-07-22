/**
 * @jest-environment jsdom
 */
'use strict'

const VirtualAdvisor = require('~/components/VirtualAdvisor.vue').default

const profileQuestions = VirtualAdvisor.computed.profileQuestions
const stepWatcher = VirtualAdvisor.watch.profileQuestions
const openProfile = VirtualAdvisor.methods.openProfile

/**
 * The advisor-profile question list changes shape as it is answered.
 *
 * Answering the role question in a way that reads as "beginner" DROPS the experience
 * question; the client-demographic question appears only for some combinations. But
 * progress was tracked as a numeric index into that list — so editing an earlier answer
 * shifted every later question by one, skipping one entirely and labelling the rest
 * wrongly, with nothing on screen to show it had happened.
 *
 * These tests pin the property rather than the wording: whichever question the advisor
 * was on, they stay on THAT question wherever it moves to.
 */

/** The list the component would compute for a given set of answers. */
function questionsFor (advisorProfile) {
  return profileQuestions.call({ advisorProfile, $t: k => k })
}

const fieldsFor = profile => questionsFor(profile).map(q => q.field)

describe('profileQuestions — the list really does change shape', () => {
  it('drops the experience question once the role answer reads as a beginner', () => {
    const asked = fieldsFor({ advisorRole: 'I do mostly compliance', experience: '' })
    expect(asked).not.toContain('experience')
  })

  it('keeps it for a role answer that does not', () => {
    expect(fieldsFor({ advisorRole: 'Partner running advisory', experience: '' })).toContain('experience')
  })
})

describe('profileQuestions — the advisor stays on the same question when it moves', () => {
  /** Run the watcher exactly as Vue would when the computed list changes. */
  function reanchor (ctx, prev, next) {
    stepWatcher.call(ctx, next, prev)
    return ctx.profileStep
  }

  it('follows the question to its new position instead of shifting under it', () => {
    // The reported defect: the advisor is on clientDemographic, goes back and edits the
    // role answer, `experience` disappears and every later question slides up one — so
    // the index that meant clientDemographic now means something else entirely.
    const before = [{ field: 'advisorRole' }, { field: 'experience' }, { field: 'clientDemographic' }, { field: 'enjoyment' }]
    const after = [{ field: 'advisorRole' }, { field: 'clientDemographic' }, { field: 'enjoyment' }]
    const ctx = { profileStep: 2 } // clientDemographic

    expect(reanchor(ctx, before, after)).toBe(1)
    expect(after[ctx.profileStep].field).toBe('clientDemographic')
  })

  it('follows it the other way too, when a question is added back', () => {
    const before = [{ field: 'advisorRole' }, { field: 'clientDemographic' }]
    const after = [{ field: 'advisorRole' }, { field: 'experience' }, { field: 'clientDemographic' }]
    const ctx = { profileStep: 1 }

    expect(reanchor(ctx, before, after)).toBe(2)
    expect(after[ctx.profileStep].field).toBe('clientDemographic')
  })

  it('never runs off the end when the current question disappears', () => {
    const before = [{ field: 'advisorRole' }, { field: 'experience' }, { field: 'clientDemographic' }]
    const after = [{ field: 'advisorRole' }]
    const ctx = { profileStep: 2 }

    expect(reanchor(ctx, before, after)).toBe(0)
  })

  it('leaves the step alone when the list has not moved', () => {
    const list = [{ field: 'advisorRole' }, { field: 'experience' }]
    const ctx = { profileStep: 1 }

    expect(reanchor(ctx, list, list)).toBe(1)
  })

  it('does nothing when there is no previous list to compare against', () => {
    const ctx = { profileStep: 3 }
    stepWatcher.call(ctx, [{ field: 'advisorRole' }], null)
    expect(ctx.profileStep).toBe(3)
  })
})

describe('openProfile — restoring progress cannot point past the last question', () => {
  it('clamps to the final question when every answer is already given', () => {
    // The count equals the list LENGTH, which is one past the last index — leaving the
    // current question undefined for anything that reads it.
    const list = [{ field: 'advisorRole' }, { field: 'experience' }]
    const ctx = {
      profileQuestions: list,
      advisorProfile: { advisorRole: 'a', experience: 'b' },
      profileStep: 0,
      profileOpen: false,
      $nextTick: fn => fn && fn(),
      resizeAllTextareas () {}
    }

    openProfile.call(ctx)

    expect(ctx.profileStep).toBe(1)
    expect(list[ctx.profileStep]).toBeDefined()
    expect(ctx.profileOpen).toBe(true)
  })

  it('still restores part-way progress rather than collapsing to the first question', () => {
    const ctx = {
      profileQuestions: [{ field: 'advisorRole' }, { field: 'experience' }, { field: 'enjoyment' }],
      advisorProfile: { advisorRole: 'a' },
      profileStep: 0,
      profileOpen: false,
      $nextTick: fn => fn && fn(),
      resizeAllTextareas () {}
    }

    openProfile.call(ctx)

    expect(ctx.profileStep).toBe(1)
  })
})
