'use strict'

/**
 * Tests for videoInjector — the sentence that tells an advisor a tutorial video exists.
 *
 * WHY THIS FILE EXISTS AT ALL. There were no tests here, and the injector was DEAD for
 * ten weeks (19 May – 30 July 2026) across 83 templates without one symptom on screen:
 * it read a `videoMinutes` field that a hand-run script had to copy onto every record
 * after each master-export swap, the script was not re-run, and the lookup silently
 * became empty. Advice simply stopped mentioning videos. Nothing failed, nothing
 * logged, nobody noticed.
 *
 * So the FIRST test below is the one that matters: the minutes come from the authored
 * `cpd.watchedVideo` field, not from a derived copy. If someone reintroduces a
 * synced-field approach, that test goes red.
 *
 * The template list is stubbed rather than read from data/templates.json — the export is
 * swapped wholesale every few weeks, and a test pinned to today's library would fail for
 * reasons that have nothing to do with this code.
 */

jest.mock('~/server/utils/templates', () => ({ getOrgTemplates: jest.fn() }))
const { getOrgTemplates } = require('~/server/utils/templates')
const { injectVideoInfo } = require('~/server/utils/videoInjector')

/** One template record as the library holds it. */
function template (over) {
  return Object.assign({
    title: 'E.O.Y Meeting',
    page: 'eoy-meeting',
    cpd: { watchedVideo: 9, reviewTemplate: 60, reheasedTemplate: 30, isHidden: false }
  }, over)
}

/** A record whose cpd block is built from the given overrides. */
function withCpd (cpd, over) {
  return Object.assign(template(), over, { cpd: Object.assign({}, template().cpd, cpd) })
}

/** AI output naming one template in bold, with its own paragraph beneath. */
function response (title) {
  return `**${title || 'E.O.Y Meeting'}**\nThis template helps you run the year-end conversation.\n\nUnrelated prose that follows.\n`
}

beforeEach(() => { getOrgTemplates.mockReset() })

describe('the minutes come from the authored field', () => {
  test('reads cpd.watchedVideo — the regression that went unnoticed for ten weeks', () => {
    getOrgTemplates.mockReturnValue([template()])
    expect(injectVideoInfo(response(), null)).toContain('A 9-minute tutorial video is available')
  })

  test('a derived `videoMinutes` field is NOT what is read', () => {
    // The exact shape of the ten-week outage: the hand-synced copy is present and the
    // authored field is absent. Nothing must be claimed from the copy alone.
    getOrgTemplates.mockReturnValue([{ title: 'E.O.Y Meeting', page: 'eoy-meeting', videoMinutes: 9 }])
    expect(injectVideoInfo(response(), null)).not.toContain('tutorial video is available')
  })

  test('fractional lengths are rounded, because "15.2-minute" is not English', () => {
    // Rounding matches cpdCatalogue, so the advice and the advisor's own CPD record
    // state the SAME number for the same video.
    getOrgTemplates.mockReturnValue([withCpd({ watchedVideo: 15.2 })])
    const out = injectVideoInfo(response(), null)
    expect(out).toContain('A 15-minute tutorial video')
    expect(out).not.toContain('15.2')
  })

  test('rounds up as well as down', () => {
    getOrgTemplates.mockReturnValue([withCpd({ watchedVideo: 24.23 }), withCpd({ watchedVideo: 8.7 }, { title: 'Growth Curve' })])
    expect(injectVideoInfo(response('Growth Curve'), null)).toContain('A 9-minute tutorial video')
  })
})

describe('records that carry no claimable video get no sentence', () => {
  test('no cpd block at all', () => {
    getOrgTemplates.mockReturnValue([{ title: 'E.O.Y Meeting', page: 'eoy-meeting' }])
    expect(injectVideoInfo(response(), null)).not.toContain('tutorial video')
  })

  test('a zero allowance', () => {
    getOrgTemplates.mockReturnValue([withCpd({ watchedVideo: 0 })])
    expect(injectVideoInfo(response(), null)).not.toContain('tutorial video')
  })

  test('a hidden record is never offered', () => {
    getOrgTemplates.mockReturnValue([withCpd({ isHidden: true })])
    expect(injectVideoInfo(response(), null)).not.toContain('tutorial video')
  })

  test('under a minute is not worth a sentence', () => {
    // 0.4 rounds to 0. A "0-minute tutorial video" would be worse than silence.
    getOrgTemplates.mockReturnValue([withCpd({ watchedVideo: 0.4 })])
    expect(injectVideoInfo(response(), null)).not.toContain('tutorial video')
  })

  test('an absurd value is refused rather than printed', () => {
    // Bounds a corrupt export, not a design choice — a day and a half is not a video.
    getOrgTemplates.mockReturnValue([withCpd({ watchedVideo: 2000 })])
    expect(injectVideoInfo(response(), null)).not.toContain('tutorial video')
  })

  test('a non-numeric value is refused, never coerced', () => {
    // '9' must not become 9: the export is authored elsewhere, and guessing at its
    // types is how a wrong number reaches an advisor.
    getOrgTemplates.mockReturnValue([withCpd({ watchedVideo: '9' })])
    expect(injectVideoInfo(response(), null)).not.toContain('tutorial video')
  })

  test('an empty library returns the text completely untouched', () => {
    getOrgTemplates.mockReturnValue([])
    const text = response()
    expect(injectVideoInfo(text, null)).toBe(text)
  })
})

describe('where the sentence lands', () => {
  test('after the template\'s own content, not inside the prose that follows', () => {
    getOrgTemplates.mockReturnValue([template()])
    const out = injectVideoInfo(response(), null)
    const video = out.indexOf('A 9-minute tutorial video')
    const unrelated = out.indexOf('Unrelated prose')
    expect(video).toBeGreaterThan(-1)
    expect(video).toBeLessThan(unrelated)
  })

  test('a template with a video does not lend its sentence to the next template', () => {
    // The original bug this design guards: every bold tag is a block boundary, so
    // template A's sentence cannot land under template B.
    getOrgTemplates.mockReturnValue([template(), { title: 'Cash Flow Basics', page: 'cash', cpd: { watchedVideo: 0 } }])
    const out = injectVideoInfo('**E.O.Y Meeting**\nYear-end guidance.\n\n**Cash Flow Basics**\nCash guidance.\n', null)
    const video = out.indexOf('A 9-minute tutorial video')
    const second = out.indexOf('**Cash Flow Basics**')
    expect(video).toBeLessThan(second)
    expect(out.match(/tutorial video/g)).toHaveLength(1)
  })

  test('a LATER template mentioning a video does not suppress an earlier one', () => {
    // The block boundary is what makes "already mentioned?" a per-template question.
    // Without it the check scans to the end of the response, so template A is skipped
    // because template B's prose happens to say "tutorial video" — A's advisor is
    // simply never told their video exists. Found by mutation; the earlier ordering
    // test could not see it, because where the sentence LANDS is decided separately.
    getOrgTemplates.mockReturnValue([template(), withCpd({ watchedVideo: 15 }, { title: 'Growth Curve' })])
    const out = injectVideoInfo(
      '**E.O.Y Meeting**\nYear-end guidance.\n\n**Growth Curve**\nThere is a tutorial video for this one already.\n\n',
      null
    )
    expect(out).toContain('A 9-minute tutorial video')
  })

  test('a sentence is not added twice when the AI already mentioned the video', () => {
    getOrgTemplates.mockReturnValue([template()])
    const text = '**E.O.Y Meeting**\nThere is a tutorial video for this one already.\n\n'
    expect(injectVideoInfo(text, null).match(/tutorial video/g)).toHaveLength(1)
  })

  test('titles match regardless of case and apostrophe style', () => {
    getOrgTemplates.mockReturnValue([withCpd({}, { title: "Deming's Cycle" })])
    expect(injectVideoInfo('**demings cycle**\nGuidance.\n\n', null)).toContain('A 9-minute tutorial video')
  })

  test('text naming no template is returned unchanged', () => {
    getOrgTemplates.mockReturnValue([template()])
    const text = 'A paragraph of advice with no template names in it at all.'
    expect(injectVideoInfo(text, null)).toBe(text)
  })
})

describe('the field labels it also bolds', () => {
  test('bolds the three standard labels at the start of a line', () => {
    getOrgTemplates.mockReturnValue([template()])
    const out = injectVideoInfo('**E.O.Y Meeting**\nGuidance.\n\nWhy this fits your client:\nBecause.\n', null)
    expect(out).toContain('**Why this fits your client:**')
  })
})
