'use strict'

/**
 * The relabel warning, held against the behaviour it describes.
 *
 * 🔴 `CLAUDE.md` SAYS NOT TO ASSERT THE WORDING OF LABELS, AND THIS IS THE NAMED
 * EXCEPTION — so here is why, next to the data it protects. The carve-out is *"where
 * wording genuinely must not drift … wording Mike has explicitly approved — pin it in ONE
 * test next to the data it protects, and say in a comment why that string is
 * load-bearing."* Mike approved this sentence on 2026-09-22 for item 13.1.
 *
 * 🔴 WHY IT IS LOAD-BEARING: IT IS THE ONLY THING STANDING BETWEEN A MANAGER AND A WRONG
 * NUMBER IN A CLIENT'S HANDS. Switching the firm currency relabels every figure and
 * converts nothing — £46,170 becomes €46,170 at no exchange rate. That is correct and
 * deliberate (Mike's ruling of 2026-09-22: conversion belongs inside a model where a
 * primary currency is entered, as the three-way forecast already does via
 * `fxAllowancePct`). But `currencyMixin.money()` passes the raw value straight to the
 * formatter, so the screen looks identical to one that had done the work, and the save
 * confirmation says *"Reports now show Euro (€)"*. Without this sentence nothing anywhere
 * contradicts the natural reading, and the figure travels into a funding pack or a fee
 * proposal out by whatever the rate is.
 *
 * A person in UAT cannot catch its removal: a currency picker with no warning looks
 * perfectly normal. That is precisely the shape of thing the carve-out exists for.
 *
 * 🔴 AND IT MUST APPEAR IN BOTH PLACES. Mike ruled on 2026-09-22 that it goes on the
 * standing note AND in the save confirmation. The confirmation is the more dangerous of
 * the two — it fires at the moment the manager acts, and it is the string that currently
 * reads as a conversion. A build that fixes only the quiet half leaves the loud half
 * saying what it always said, so `saved` is asserted to carry the sentence on its own.
 */

const en = require('../../locales/en.json')

/** The sentence exactly as Mike approved it, 2026-09-22. */
const APPROVED = 'Figures are relabelled, not converted — the amounts do not change.'

describe('the currency relabel warning (item 13.1)', () => {
  const currency = en.modelLibrary.currency

  it('is on the standing note beside the picker, word for word', () => {
    expect(currency.relabelNote).toBe(APPROVED)
  })

  it('is repeated in the save confirmation, which is the string that misleads', () => {
    expect(currency.saved).toContain(APPROVED)
  })

  it('still tells the manager which currency was chosen', () => {
    // The warning is an addition to the confirmation, never a replacement for it —
    // dropping the placeholders would leave a manager unsure the change took.
    expect(currency.saved).toContain('{name}')
    expect(currency.saved).toContain('{symbol}')
  })

  it('uses an em dash, not a hyphen', () => {
    // Mike approved the sentence with an em dash. A locale round-trip through a tool
    // that normalises punctuation is the likeliest way this drifts without anyone
    // deciding to change it.
    expect(currency.relabelNote).toContain('—')
  })

  it('does not claim a conversion anywhere in the currency strings', () => {
    // The failure this guards against is a future edit "improving" the wording into
    // exactly the false statement the item was raised about.
    const all = Object.values(currency).join(' ')
    expect(all).not.toMatch(/\bconverted at\b|\bexchange rate\b|\bconverts\b/i)
  })
})
