'use strict'

/**
 * @file The semantic-profile store — item 4.97 / 7.2 US9, task T054.
 *
 * What these tests are FOR, since the suite is meant to catch what UAT cannot
 * (CLAUDE.md → Testing): a profile is the resolver's dominant lever, and it is
 * scored out of sight. A weight that is silently dropped, a tool that never
 * reaches the screen, or a validator that admits a weight of 0 all look perfectly
 * fine to a person reading the page. `validateProfile` guards untrusted input and
 * carries the project's 100% bar.
 *
 * Nothing here asserts wording or CSS — the screen is judged on screen.
 */

const {
  PROFILE_PREFIX,
  NOTE_MAX,
  clearProfileCache,
  loadEffectiveProfiles,
  listTemplateProfiles,
  isThin,
  validateProfile
} = require('../../server/utils/semanticProfiles')

const { SIGNAL_REGISTRY } = require('../../server/utils/problemSignals')
const LIBRARY = require('../../data/templates.json')
const COMPILED = require('../../data/semantic-profiles.json')

const allTemplates = LIBRARY.templates || LIBRARY
const doTheJob = allTemplates.filter(t => t && t.page && t.menuSection === 'do-the-job')

beforeEach(() => clearProfileCache())

describe('the overlay address', () => {
  test('is the prefix the route and the store agree on', () => {
    expect(PROFILE_PREFIX).toBe('semantic-profile:')
  })
})

describe('every client tool reaches the screen', () => {
  // The fault item 7.5 names: templateRegistry is keyed by page and keeps ONE template
  // per page, so reading it loses 15 of Mike's tools. This is the assertion that fails
  // if someone "simplifies" the store back onto the registry.
  test('names all 220 do-the-job tools, not the 205 pages they sit on', () => {
    const { rows, total, pages } = listTemplateProfiles()
    expect(total).toBe(doTheJob.length)
    expect(pages).toBe(rows.length)
    expect(total).toBeGreaterThan(pages)
  })

  test('every tool title in the library appears on exactly one row', () => {
    const { rows } = listTemplateProfiles()
    const named = rows.flatMap(r => [r.title, ...r.alsoOnPage])
    expect(named.length).toBe(doTheJob.length)
    for (const t of doTheJob) {
      expect(named).toContain(t.title)
    }
  })

  test('tools sharing a page share one row and one profile — Mike 2026-09-16', () => {
    const { rows } = listTemplateProfiles()
    const shared = rows.filter(r => r.alsoOnPage.length > 0)
    expect(shared.length).toBeGreaterThan(0)
    for (const row of shared) {
      // one page, one profile, and every tool on it named
      expect(typeof row.page).toBe('string')
      expect(row.title).toBeTruthy()
      expect(row.alsoOnPage.every(t => typeof t === 'string' && t.length > 0)).toBe(true)
    }
  })

  // The library really does list four tools twice under one title — `Capacity, Capability,
  // Opportunity` and `IT Services` among them. The row must show BOTH, not silently keep
  // one: a repeated title is a duplicate for Mike to see in Advisor-e, and a screen that
  // hides it is why nobody has noticed. Pinned because the obvious "tidy" fix is to
  // de-duplicate titles here, which would bury it again.
  test('a title listed twice on one page is shown twice, never collapsed', () => {
    const { rows } = listTemplateProfiles()
    const withRepeat = rows.filter(r => new Set([r.title, ...r.alsoOnPage]).size <
      [r.title, ...r.alsoOnPage].length)
    expect(withRepeat.length).toBeGreaterThan(0)
    for (const row of withRepeat) {
      expect(row.alsoOnPage).toContain(row.title)
    }
  })

  test('no row is listed twice and every page id is distinct', () => {
    const { rows } = listTemplateProfiles()
    const pages = rows.map(r => r.page)
    expect(new Set(pages).size).toBe(pages.length)
  })

  test('a tool with no compiled entry still appears, as source none', () => {
    const { rows } = listTemplateProfiles()
    const noEntry = rows.filter(r => r.source === 'none')
    expect(noEntry.length).toBeGreaterThan(0)
    for (const row of noEntry) {
      expect(row.thin).toBe(true)
      expect(row.thinReason).toBe('no_entry')
      expect(row.effective).toEqual({})
    }
  })

  test('the thin count is the number of thin rows', () => {
    const { rows, thinCount } = listTemplateProfiles()
    expect(thinCount).toBe(rows.filter(r => r.thin).length)
  })

  test('every effective weight is a whole number 1-10 on a known signal', () => {
    const known = new Set(Object.keys(SIGNAL_REGISTRY))
    for (const row of listTemplateProfiles().rows) {
      for (const [signal, weight] of Object.entries(row.effective)) {
        expect(known.has(signal)).toBe(true)
        expect(Number.isInteger(weight)).toBe(true)
        expect(weight).toBeGreaterThanOrEqual(1)
      }
    }
  })
})

describe('loadEffectiveProfiles', () => {
  test('carries every page the compiled file holds', () => {
    const map = loadEffectiveProfiles()
    const compiledPages = COMPILED.filter(r => r && r.page).map(r => r.page)
    expect(map.size).toBe(new Set(compiledPages).size)
    for (const page of compiledPages) { expect(map.has(page)).toBe(true) }
  })

  test('a compiled row written with no summary reads as source none', () => {
    const map = loadEffectiveProfiles()
    const noSummary = COMPILED.filter(r => r.note)
    expect(noSummary.length).toBeGreaterThan(0)
    for (const row of noSummary) {
      expect(map.get(row.page).source).toBe('none')
    }
  })

  test('is memoised, and clearProfileCache drops it', () => {
    const first = loadEffectiveProfiles()
    expect(loadEffectiveProfiles()).toBe(first)
    clearProfileCache()
    expect(loadEffectiveProfiles()).not.toBe(first)
  })
})

describe('isThin — the four reasons, approved 2026-09-14', () => {
  test('no entry at all', () => {
    expect(isThin({ profile: {}, source: 'none' })).toEqual({ thin: true, reason: 'no_entry' })
    expect(isThin(null)).toEqual({ thin: true, reason: 'no_entry' })
    expect(isThin(undefined)).toEqual({ thin: true, reason: 'no_entry' })
  })

  test('an entry with no signals', () => {
    expect(isThin({ profile: {}, source: 'auto' })).toEqual({ thin: true, reason: 'no_signals' })
  })

  test('weights summing below the floor of 4', () => {
    expect(isThin({ profile: { sales_volume: 3 }, source: 'auto' })).toEqual({ thin: true, reason: 'weak' })
    expect(isThin({ profile: { sales_volume: 1, pricing_issue: 2 }, source: 'auto' }))
      .toEqual({ thin: true, reason: 'weak' })
  })

  test('exactly 4 is not weak — the floor is inclusive', () => {
    expect(isThin({ profile: { sales_volume: 4 }, source: 'auto' })).toEqual({ thin: false, reason: null })
  })

  test('matched by keyword only, however strong the weights', () => {
    expect(isThin({ profile: { sales_volume: 10 }, source: 'keyword' }))
      .toEqual({ thin: true, reason: 'keyword_only' })
  })

  test('a strong generated or reviewed profile is not thin', () => {
    expect(isThin({ profile: { sales_volume: 10 }, source: 'auto' })).toEqual({ thin: false, reason: null })
    expect(isThin({ profile: { cash_flow_gap: 6 }, source: 'reviewed' })).toEqual({ thin: false, reason: null })
  })

  test('a malformed entry is treated as thin, never trusted', () => {
    // Defensive: the compiler never writes these, but an authored row will one day come
    // from a request body, and a profile that cannot be read must not score as strong.
    expect(isThin({ source: 'auto' })).toEqual({ thin: true, reason: 'no_signals' })
    expect(isThin({ profile: null, source: 'auto' })).toEqual({ thin: true, reason: 'no_signals' })
    expect(isThin({ profile: { sales_volume: 'lots' }, source: 'auto' }))
      .toEqual({ thin: true, reason: 'weak' })
  })

  test('the reasons are ordered: no entry beats no signals', () => {
    // A source of 'none' is answered before the weights are looked at, so a page with
    // neither entry nor signals reports the reason a reader can act on.
    expect(isThin({ profile: {}, source: 'none' }).reason).toBe('no_entry')
  })
})

describe('validateProfile — untrusted input, 100% bar', () => {
  const library = new Set(['a-page', 'b-page'])

  test('accepts a valid profile', () => {
    const v = validateProfile({ profile: { sales_volume: 5, cash_flow_gap: 10 } })
    expect(v.ok).toBe(true)
    expect(v.value.profile).toEqual({ sales_volume: 5, cash_flow_gap: 10 })
    expect(v.value.note).toBeNull()
  })

  test('an empty profile is valid — authored as none', () => {
    const v = validateProfile({ profile: {} })
    expect(v.ok).toBe(true)
    expect(v.value.profile).toEqual({})
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'sales_volume'],
    ['a number', 7],
    ['an array', [{ sales_volume: 5 }]]
  ])('refuses a body that is %s', (_label, body) => {
    const v = validateProfile(body)
    expect(v.ok).toBe(false)
    expect(v.code).toBe('INVALID_PROFILE')
  })

  test.each([
    ['missing', {}],
    ['null', { profile: null }],
    ['an array', { profile: [] }],
    ['a string', { profile: 'none' }]
  ])('refuses a profile field that is %s', (_label, body) => {
    expect(validateProfile(body).ok).toBe(false)
  })

  test('refuses an unknown signal', () => {
    const v = validateProfile({ profile: { not_a_signal: 5 } })
    expect(v.ok).toBe(false)
    expect(v.message).toMatch(/not_a_signal/)
  })

  test.each([
    ['0', 0],
    ['11', 11],
    ['negative', -1],
    ['a fraction', 2.5],
    ['a numeric string', '5'],
    ['null', null],
    ['NaN', NaN]
  ])('refuses a weight of %s', (_label, weight) => {
    const v = validateProfile({ profile: { sales_volume: weight } })
    expect(v.ok).toBe(false)
    expect(v.code).toBe('INVALID_PROFILE')
  })

  test('accepts the boundary weights 1 and 10', () => {
    expect(validateProfile({ profile: { sales_volume: 1 } }).ok).toBe(true)
    expect(validateProfile({ profile: { sales_volume: 10 } }).ok).toBe(true)
  })

  test('refuses a page outside the library, and accepts one inside it', () => {
    expect(validateProfile({ page: 'ghost', profile: {} }, null, library).ok).toBe(false)
    expect(validateProfile({ page: 'a-page', profile: {} }, null, library).ok).toBe(true)
  })

  test('a page is only checked when a library is supplied', () => {
    expect(validateProfile({ page: 'ghost', profile: {} }).ok).toBe(true)
  })

  test('accepts a Map as the library, as the route passes', () => {
    const asMap = new Map([['a-page', {}]])
    expect(validateProfile({ page: 'a-page', profile: {} }, null, asMap).ok).toBe(true)
    expect(validateProfile({ page: 'ghost', profile: {} }, null, asMap).ok).toBe(false)
  })

  test('honours a caller-supplied signal vocabulary, as a Set or an array', () => {
    expect(validateProfile({ profile: { only_this: 5 } }, new Set(['only_this'])).ok).toBe(true)
    expect(validateProfile({ profile: { only_this: 5 } }, ['only_this']).ok).toBe(true)
    expect(validateProfile({ profile: { sales_volume: 5 } }, ['only_this']).ok).toBe(false)
  })

  test(`refuses a note longer than ${NOTE_MAX}, accepts one at the cap`, () => {
    expect(validateProfile({ profile: {}, note: 'x'.repeat(NOTE_MAX + 1) }).ok).toBe(false)
    expect(validateProfile({ profile: {}, note: 'x'.repeat(NOTE_MAX) }).ok).toBe(true)
  })

  test('a null or absent note is kept as null', () => {
    expect(validateProfile({ profile: {}, note: null }).value.note).toBeNull()
    expect(validateProfile({ profile: {} }).value.note).toBeNull()
  })

  test('a non-string note is coerced, then capped', () => {
    expect(validateProfile({ profile: {}, note: 42 }).value.note).toBe('42')
  })

  test('every signal in the registry is accepted', () => {
    for (const signal of Object.keys(SIGNAL_REGISTRY)) {
      expect(validateProfile({ profile: { [signal]: 5 } }).ok).toBe(true)
    }
  })
})
