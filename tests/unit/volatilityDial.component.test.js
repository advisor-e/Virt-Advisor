/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const VolatilityDial = require('~/components/base/VolatilityDial.vue').default

/**
 * VolatilityDial — the shared rev counter.
 *
 * WHAT IS TESTED HERE, and only this: the needle's ANGLE. A dial pointing at the wrong
 * number is the most visible thing on the screen and the easiest to get silently wrong —
 * it is trigonometry, not a figure passed through, and 0 at 225° / 100 at −45° is the
 * geometry of Mike's own workbook gauge rather than a choice made here.
 *
 * These two assertions moved from volatilityReport.component.test.js on 2026-09-03, when
 * the dial became a shared component because Mike ruled it onto the Three-Way Forecast's
 * step 3 as well. Same guard, now sitting beside the code it guards — and now covering
 * BOTH screens, which is the point of there being one component.
 *
 * Deliberately NOT tested: the key rows, the explain paragraph and the score's formatting
 * — a person in UAT sees all of those in five seconds (CLAUDE.md, "What a test must earn").
 */
describe('VolatilityDial', () => {
  it('points the needle at the score, on the workbook geometry', () => {
    const wrapper = mountWithBuefy(VolatilityDial, { propsData: { score: 77.7268 } })
    const { needle } = wrapper.vm

    // 0 sits at 225 degrees and 100 at -45, sweeping 270 clockwise. A score of 77.7268
    // is therefore 225 - 209.86 = 15.13 degrees, up and to the right of centre.
    const angle = Math.atan2(110 - needle.tipY, needle.tipX - 110) * 180 / Math.PI
    expect(angle).toBeCloseTo(15.13, 1)
    // …and the tip is out near the rim, not sitting on the hub.
    const r = Math.hypot(needle.tipX - 110, 110 - needle.tipY)
    expect(r).toBeCloseTo(64, 6)
  })

  it('pegs a score over 100 at the end stop rather than swinging back round', () => {
    // A wildly volatile business can score past 100. Left unclamped the needle would wrap
    // past the bottom-right and point back into the green, reading as calm.
    const wrapper = mountWithBuefy(VolatilityDial, { propsData: { score: 260 } })
    const { needle } = wrapper.vm

    const angle = Math.atan2(110 - needle.tipY, needle.tipX - 110) * 180 / Math.PI
    expect(angle).toBeCloseTo(-45, 1) // the 100 end stop
  })

  it('sits at the zero end stop for a score of zero, rather than pointing nowhere', () => {
    // A business with no variation at all scores 0. The needle must reach the left stop,
    // not fall back to the centre, which would read as a middling swing.
    const wrapper = mountWithBuefy(VolatilityDial, { propsData: { score: 0 } })
    const { needle } = wrapper.vm

    const angle = Math.atan2(110 - needle.tipY, needle.tipX - 110) * 180 / Math.PI
    expect(angle).toBeCloseTo(-135, 1) // 225 degrees, drawn down and to the left
  })
})
