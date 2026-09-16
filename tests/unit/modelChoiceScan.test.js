'use strict'

/**
 * Item 7.5 — what the AI named, and how we know.
 *
 * WHAT THESE TESTS EARN THEIR PLACE FOR (Mike's ruling, 2026-08-24). Every case here is
 * one a person in UAT cannot see: the marker is stripped before it reaches a screen, so a
 * tester reads a perfectly ordinary answer whether we recorded the right model, the wrong
 * model, a fabricated model, or nothing at all. Nothing on screen differs. These are also
 * the shapes the 2026-09-15 effectiveness test proved the AI actually produces.
 *
 * 🔴 THE PAIR THAT MATTERS MOST: a marker saying "none" and a marker naming a model that
 * does not exist BOTH resolve to an empty model list. One is the AI behaving exactly as
 * instructed; the other is it inventing a tool. If those two ever read alike, the screen
 * records a fabrication as good behaviour — so they are asserted apart, in both directions.
 */

const scan = require('../../server/utils/modelChoiceScan')
const { loadReportModels } = require('../../server/utils/reportModels')

// Real routes from the real catalogue — never typed here. A drawing that types a figure
// rather than reading it is what shipped two cards with the same heading on 2026-09-15.
const MODELS = loadReportModels().models
const ROUTE_A = MODELS[0].route
const NAME_A = MODELS[0].name
const ROUTE_B = MODELS[1].route

describe('modelChoiceScan — the declared marker', () => {
  it('reads one declared route', () => {
    const out = scan.resolveModelChoiceWithSource(`Here is my answer.\n\n[[MODEL: ${ROUTE_A}]]`)
    expect(out.source).toBe('declared')
    expect(out.models).toEqual([ROUTE_A])
    expect(out.declined).toBe(false)
  })

  it('reads several, separated by a pipe or a comma', () => {
    const piped = scan.resolveModelChoiceWithSource(`x\n[[MODEL: ${ROUTE_A} | ${ROUTE_B}]]`)
    const commad = scan.resolveModelChoiceWithSource(`x\n[[MODEL: ${ROUTE_A}, ${ROUTE_B}]]`)
    expect(piped.models).toEqual([ROUTE_A, ROUTE_B])
    expect(commad.models).toEqual([ROUTE_A, ROUTE_B])
  })

  it('accepts the model NAME as well as the page path', () => {
    const out = scan.resolveModelChoiceWithSource(`x\n[[MODEL: ${NAME_A}]]`)
    expect(out.models).toEqual([ROUTE_A])
    expect(out.source).toBe('declared')
  })

  it('records a decline, which is the one thing the prose scan can never see', () => {
    const out = scan.resolveModelChoiceWithSource('No model in the app answers this.\n\n[[MODEL: none]]')
    expect(out.declined).toBe(true)
    expect(out.models).toEqual([])
    expect(out.source).toBe('declared')
  })

  it('treats a model that is not in the catalogue as unverified — NOT as a decline', () => {
    const out = scan.resolveModelChoiceWithSource('x\n[[MODEL: /cash-flow-wizard]]')
    expect(out.models).toEqual([])
    // 🔴 The assertion this file exists for. Empty models, but the AI did not decline —
    // it invented a tool, and the two must never be recorded as the same event.
    expect(out.declined).toBe(false)
    expect(out.unverified).toBe(1)
    expect(out.source).toBe('none')
  })

  it('drops the decline when the same marker also names a real model', () => {
    // A contradiction. The named model is what the advisor actually read, so it wins and
    // the decline goes — recording both would put one reply on the screen twice, saying
    // opposite things.
    const out = scan.resolveModelChoiceWithSource(`x\n[[MODEL: none, ${ROUTE_A}]]`)
    expect(out.models).toEqual([ROUTE_A])
    expect(out.declined).toBe(false)
  })

  it('returns source "none" for a reply with no marker and no page path', () => {
    const out = scan.resolveModelChoiceWithSource('A perfectly ordinary answer about staff morale.')
    expect(out).toEqual({ models: [], declined: false, source: 'none', unverified: 0 })
  })

  it('reads the LAST marker when a reply somehow carries two', () => {
    const out = scan.resolveModelChoiceWithSource(`[[MODEL: ${ROUTE_B}]] ... [[MODEL: ${ROUTE_A}]]`)
    expect(out.models).toEqual([ROUTE_A])
  })
})

describe('modelChoiceScan — the prose fallback', () => {
  it('finds a page path when the AI wrote no marker', () => {
    const out = scan.resolveModelChoiceWithSource(`Open ${ROUTE_A} and work through it.`)
    expect(out.source).toBe('prose')
    expect(out.models).toEqual([ROUTE_A])
  })

  it('falls back to prose when the marker named only something unverifiable', () => {
    const out = scan.resolveModelChoiceWithSource(`Open ${ROUTE_A}.\n\n[[MODEL: /invented-model]]`)
    expect(out.source).toBe('prose')
    expect(out.models).toEqual([ROUTE_A])
    // The bad declaration is still carried, so a drift in obedience is not lost.
    expect(out.unverified).toBe(1)
  })

  it('does not match a route that is only part of a longer word', () => {
    const out = scan.resolveModelChoiceWithSource(`See ${ROUTE_A}-archive for last year.`)
    expect(out.models).toEqual([])
    expect(out.source).toBe('none')
  })

  it('de-duplicates a route mentioned several times', () => {
    const out = scan.resolveModelChoiceWithSource(`${ROUTE_A} ... again ${ROUTE_A}`)
    expect(out.models).toEqual([ROUTE_A])
  })
})

describe('modelChoiceScan — stripping, so no marker reaches an advisor', () => {
  it('removes the marker and the gap it leaves behind', () => {
    expect(scan.stripModelMarker(`My answer.\n\n[[MODEL: ${ROUTE_A}]]`)).toBe('My answer.')
  })

  it('removes a marker written mid-reply, not only a trailing one', () => {
    expect(scan.stripModelMarker(`One. [[MODEL: ${ROUTE_A}]] Two.`)).toBe('One.  Two.')
  })

  it('removes EVERY marker, so a repeat cannot survive', () => {
    const out = scan.stripModelMarker(`a [[MODEL: ${ROUTE_A}]] b [[MODEL: ${ROUTE_B}]]`)
    expect(out).not.toContain('[[MODEL:')
  })

  it('leaves a reply that never carried one exactly as it was', () => {
    const text = 'Nothing machine-readable here at all.'
    expect(scan.stripModelMarker(text)).toBe(text)
  })

  it('leaves the TEMPLATES marker alone for the other strip to read', () => {
    // The two markers can arrive in either order. This one must remove only itself, or a
    // model marker written first would take the template declaration down with it.
    const out = scan.stripModelMarker(`answer\n\n[[MODEL: ${ROUTE_A}]]\n[[TEMPLATES: Quick & Worst]]`)
    expect(out).toContain('[[TEMPLATES: Quick & Worst]]')
    expect(out).not.toContain('[[MODEL:')
  })

  it('survives a non-string without throwing', () => {
    expect(scan.stripModelMarker(null)).toBe(null)
    expect(scan.resolveModelChoiceWithSource(undefined).source).toBe('none')
  })
})

describe('modelChoiceScan — the catalogue is the authority', () => {
  it('resolves every live model, by route and by name', () => {
    // A model added to the JSON is recognised the same day, with no second list to
    // remember. If this ever fails, the scan has stopped reading the file the AI reads.
    MODELS.forEach((m) => {
      expect(scan.resolveModelToken(m.route)).toBe(m.route)
      expect(scan.resolveModelToken(m.name)).toBe(m.route)
    })
  })

  it('tolerates markdown emphasis, quotes and a trailing slash around a route', () => {
    expect(scan.resolveModelToken(`**${ROUTE_A}**`)).toBe(ROUTE_A)
    expect(scan.resolveModelToken(`"${ROUTE_A}/"`)).toBe(ROUTE_A)
    expect(scan.resolveModelToken(`${ROUTE_A}.`)).toBe(ROUTE_A)
  })

  it('refuses a token that is not a model', () => {
    expect(scan.resolveModelToken('/dashboard')).toBeNull()
    expect(scan.resolveModelToken('')).toBeNull()
    expect(scan.resolveModelToken(null)).toBeNull()
  })
})
