'use strict'

/**
 * Item 4.92, slice 1 — the country schedule store.
 *
 * WHAT THESE TESTS ARE FOR. Everything in this store arrives from a model reading a PDF, and
 * every class in it can be picked by a manager and written straight into a firm's approved
 * rates, which reach a forecast a lender reads. So the validation is held to the AI-output
 * bar in CLAUDE.md — valid, malformed, missing fields, wrong types — rather than the ordinary
 * one. A rate in the wrong unit and a class with no page are the two failures that would look
 * perfectly well sourced on the page a bank reads.
 *
 * They deliberately do NOT assert the wording of anything a person sees, except where the
 * wording is computed from data (the unread-pages sentence), where the assertion is on the
 * page numbers and the document name rather than on the sentence around them.
 */

const {
  CONFIG_KEY_PREFIX,
  MAX_SCHEDULE_CLASSES,
  MAX_UNRESOLVED,
  MAX_PAGE_RANGES,
  configKeyFor,
  cleanClass,
  cleanPageRanges,
  cleanUnresolved,
  validateCountrySchedule,
  unreadPagesSentence,
  resolveCountrySchedule,
  searchScheduleClasses,
  mayLoadSchedules
} = require('../../server/utils/countrySchedules')

const {
  setFirmMembership,
  globalScopeId,
  groupScopeId
} = require('../../server/utils/tierChain')

const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

/** A class row that passes, so each test can break exactly one thing. */
function aClass (over) {
  return Object.assign({
    label: 'Tractors (wheeled)',
    method: 'dv',
    dvRate: 0.13,
    slRate: 0.085,
    lifeYears: 15.5,
    source: { document: 'IR265', page: '9', published: '2023-10' }
  }, over || {})
}

/** A whole schedule that passes. */
function aSchedule (over) {
  return Object.assign({
    country: 'NZ',
    document: 'IR265',
    published: '2023-10',
    approvedBy: 'M. Bell',
    approvedAt: '2026-09-11T02:00:00.000Z',
    pagesRead: [{ from: 1, to: 52 }],
    pagesUnread: [],
    classes: [aClass()],
    unresolved: []
  }, over || {})
}

/** Collects errors the way the module's own callers do. */
function errs () { return [] }

describe('configKeyFor', () => {
  it('gives one key per country, not one key for all of them', () => {
    expect(configKeyFor('nz')).toBe(CONFIG_KEY_PREFIX + 'NZ')
    expect(configKeyFor('AU')).toBe(CONFIG_KEY_PREFIX + 'AU')
  })

  it('refuses a country NAME, so one country cannot end up with three tables', () => {
    expect(configKeyFor('New Zealand')).toBeNull()
    expect(configKeyFor('NZL')).toBeNull()
    expect(configKeyFor('')).toBeNull()
    expect(configKeyFor(null)).toBeNull()
    expect(configKeyFor(7)).toBeNull()
  })
})

describe('cleanClass — one published class', () => {
  it('accepts a well-formed class and keeps the authority\'s own wording', () => {
    const e = errs()
    const out = cleanClass(aClass(), 'classes[0]', e)
    expect(e).toEqual([])
    expect(out.label).toBe('Tractors (wheeled)')
    expect(out.dvRate).toBe(0.13)
    expect(out.source.page).toBe('9')
  })

  it('refuses a rate typed as a percentage rather than a decimal', () => {
    const e = errs()
    // 50 would depreciate an asset by 5000% a year in a forecast that still balances.
    expect(cleanClass(aClass({ dvRate: 50 }), 'c', e)).toBeNull()
    expect(e.length).toBeGreaterThan(0)
  })

  it('refuses a rate of zero or below', () => {
    expect(cleanClass(aClass({ dvRate: 0 }), 'c', errs())).toBeNull()
    expect(cleanClass(aClass({ dvRate: -0.1 }), 'c', errs())).toBeNull()
  })

  it('refuses a class whose method names a rate it does not carry', () => {
    const e = errs()
    expect(cleanClass(aClass({ method: 'sl', slRate: null }), 'c', e)).toBeNull()
    expect(e.length).toBeGreaterThan(0)
  })

  it('refuses an unknown method', () => {
    expect(cleanClass(aClass({ method: 'reducing' }), 'c', errs())).toBeNull()
    expect(cleanClass(aClass({ method: null }), 'c', errs())).toBeNull()
  })

  it('refuses a class with no label', () => {
    expect(cleanClass(aClass({ label: '   ' }), 'c', errs())).toBeNull()
    expect(cleanClass(aClass({ label: null }), 'c', errs())).toBeNull()
  })

  it('refuses a class with no source document', () => {
    expect(cleanClass(aClass({ source: null }), 'c', errs())).toBeNull()
    expect(cleanClass(aClass({ source: { page: '9', published: '2023-10' } }), 'c', errs())).toBeNull()
  })

  it('refuses a class with no PAGE — the one field a manager checks the figure against', () => {
    const e = errs()
    expect(cleanClass(aClass({ source: { document: 'IR265', published: '2023-10' } }), 'c', e)).toBeNull()
    expect(e.join(' ')).toMatch(/page/i)
  })

  it('refuses a publication date it cannot rank', () => {
    expect(cleanClass(aClass({ source: { document: 'IR265', page: '9', published: 'October 2023' } }), 'c', errs())).toBeNull()
  })

  it('refuses an implausible life', () => {
    expect(cleanClass(aClass({ lifeYears: 0 }), 'c', errs())).toBeNull()
    expect(cleanClass(aClass({ lifeYears: 101 }), 'c', errs())).toBeNull()
  })

  it('refuses anything that is not an object', () => {
    expect(cleanClass(null, 'c', errs())).toBeNull()
    expect(cleanClass([aClass()], 'c', errs())).toBeNull()
    expect(cleanClass('Tractors', 'c', errs())).toBeNull()
  })
})

describe('cleanPageRanges', () => {
  it('accepts whole page numbers in order', () => {
    const e = errs()
    expect(cleanPageRanges([{ from: 1, to: 8 }, { from: 9, to: 16 }], 'p', e)).toEqual([
      { from: 1, to: 8 }, { from: 9, to: 16 }
    ])
    expect(e).toEqual([])
  })

  it('treats an absent list as no ranges rather than an error', () => {
    expect(cleanPageRanges(undefined, 'p', errs())).toEqual([])
    expect(cleanPageRanges(null, 'p', errs())).toEqual([])
  })

  it('refuses a range that ends before it starts', () => {
    expect(cleanPageRanges([{ from: 20, to: 4 }], 'p', errs())).toBeNull()
  })

  it('refuses fractional or non-numeric pages', () => {
    expect(cleanPageRanges([{ from: 1.5, to: 8 }], 'p', errs())).toBeNull()
    expect(cleanPageRanges([{ from: 'one', to: 8 }], 'p', errs())).toBeNull()
  })

  it('refuses pages outside a believable document', () => {
    expect(cleanPageRanges([{ from: 0, to: 8 }], 'p', errs())).toBeNull()
    expect(cleanPageRanges([{ from: 1, to: 99999 }], 'p', errs())).toBeNull()
  })

  it('refuses more ranges than a schedule could have', () => {
    const many = []
    for (let i = 0; i < MAX_PAGE_RANGES + 1; i++) { many.push({ from: i + 1, to: i + 1 }) }
    expect(cleanPageRanges(many, 'p', errs())).toBeNull()
  })

  it('refuses a non-array', () => {
    expect(cleanPageRanges({ from: 1, to: 2 }, 'p', errs())).toBeNull()
  })

  it('refuses a range that is not an object at all', () => {
    expect(cleanPageRanges([null], 'p', errs())).toBeNull()
    expect(cleanPageRanges(['1-8'], 'p', errs())).toBeNull()
    expect(cleanPageRanges([[1, 8]], 'p', errs())).toBeNull()
  })
})

describe('cleanUnresolved', () => {
  it('keeps an entry that names a class, and drops one that does not', () => {
    const out = cleanUnresolved([
      { label: 'Southern Cross Cable Network capacity', pages: '39-40', differs: 'two rates' },
      { pages: '12', differs: 'no class named' },
      'not an object'
    ], 'u', errs())
    expect(out).toHaveLength(1)
    expect(out[0].pages).toBe('39-40')
  })

  it('never carries a rate — nothing is ever taken from this list', () => {
    const out = cleanUnresolved([{ label: 'Microwave ovens', dvRate: 0.4 }], 'u', errs())
    expect(out[0].dvRate).toBeUndefined()
  })

  it('refuses a non-array', () => {
    expect(cleanUnresolved({ label: 'x' }, 'u', errs())).toBeNull()
  })

  it('refuses more unsettled entries than nine passes could honestly produce', () => {
    const many = []
    for (let i = 0; i < MAX_UNRESOLVED + 1; i++) { many.push({ label: 'Entry ' + i }) }
    expect(cleanUnresolved(many, 'u', errs())).toBeNull()
  })
})

describe('validateCountrySchedule', () => {
  it('accepts a complete schedule', () => {
    const { ok, value } = validateCountrySchedule(aSchedule())
    expect(ok).toBe(true)
    expect(value.country).toBe('NZ')
    expect(value.classes).toHaveLength(1)
  })

  it('refuses a schedule that cannot name who approved it, or when', () => {
    expect(validateCountrySchedule(aSchedule({ approvedBy: '' })).ok).toBe(false)
    expect(validateCountrySchedule(aSchedule({ approvedAt: '' })).ok).toBe(false)
    expect(validateCountrySchedule(aSchedule({ approvedAt: 'last Tuesday' })).ok).toBe(false)
  })

  it('refuses a schedule stored under a different country from the one it names', () => {
    const { ok, errors } = validateCountrySchedule(aSchedule({ country: 'AU' }), { expectCountry: 'NZ' })
    expect(ok).toBe(false)
    expect(errors.join(' ')).toMatch(/AU|NZ/)
  })

  it('accepts when the stored country and the key agree', () => {
    expect(validateCountrySchedule(aSchedule(), { expectCountry: 'nz' }).ok).toBe(true)
  })

  it('refuses a schedule with no classes — that is a failed read, not a table', () => {
    // Item 4.91: IR265 was read, named and dated, and proposed nothing at all.
    const { ok } = validateCountrySchedule(aSchedule({ classes: [] }))
    expect(ok).toBe(false)
  })

  it('refuses more classes than any real schedule publishes', () => {
    const many = []
    for (let i = 0; i < MAX_SCHEDULE_CLASSES + 1; i++) { many.push(aClass({ label: 'Class ' + i })) }
    const { ok, errors } = validateCountrySchedule(aSchedule({ classes: many }))
    expect(ok).toBe(false)
    expect(errors.join(' ')).toMatch(String(MAX_SCHEDULE_CLASSES))
  })

  it('drops a class listed twice, keeping the one the document printed first', () => {
    const { ok, value } = validateCountrySchedule(aSchedule({
      classes: [
        aClass({ label: 'Tractors (wheeled)', dvRate: 0.13 }),
        aClass({ label: 'tractors (WHEELED)', dvRate: 0.5 }),
        aClass({ label: 'Computers', dvRate: 0.5, source: { document: 'IR265', page: '30', published: '2023-10' } })
      ]
    }))
    expect(ok).toBe(true)
    expect(value.classes).toHaveLength(2)
    expect(value.classes[0].dvRate).toBe(0.13)
  })

  it('refuses the whole schedule when one class is malformed', () => {
    // A table with three sound rows and one guess looks exactly like a table with four sound
    // rows, which is why one bad row is not simply skipped here.
    const { ok } = validateCountrySchedule(aSchedule({
      classes: [aClass(), aClass({ label: 'Computers', dvRate: 50 })]
    }))
    expect(ok).toBe(false)
  })

  it('refuses an edition date it cannot rank', () => {
    expect(validateCountrySchedule(aSchedule({ published: 'Oct 2023' })).ok).toBe(false)
    expect(validateCountrySchedule(aSchedule({ published: null })).ok).toBe(false)
  })

  it('refuses a schedule that does not name its document', () => {
    expect(validateCountrySchedule(aSchedule({ document: '' })).ok).toBe(false)
  })

  it('refuses anything that is not an object', () => {
    expect(validateCountrySchedule(null).ok).toBe(false)
    expect(validateCountrySchedule([aSchedule()]).ok).toBe(false)
    expect(validateCountrySchedule('IR265').ok).toBe(false)
  })

  it('refuses a schedule that names no country of its own', () => {
    expect(validateCountrySchedule(aSchedule({ country: null })).ok).toBe(false)
    expect(validateCountrySchedule(aSchedule({ country: 'New Zealand' })).ok).toBe(false)
  })

  it('refuses classes that are not a list at all', () => {
    expect(validateCountrySchedule(aSchedule({ classes: null })).ok).toBe(false)
    expect(validateCountrySchedule(aSchedule({ classes: { tractors: aClass() } })).ok).toBe(false)
  })

  it('keeps the unread page ranges, which are the second ruling made storable', () => {
    const { ok, value } = validateCountrySchedule(aSchedule({
      pagesRead: [{ from: 1, to: 40 }, { from: 49, to: 52 }],
      pagesUnread: [{ from: 41, to: 48 }]
    }))
    expect(ok).toBe(true)
    expect(value.pagesUnread).toEqual([{ from: 41, to: 48 }])
  })
})

describe('unreadPagesSentence', () => {
  it('says nothing when every page was read', () => {
    expect(unreadPagesSentence(validateCountrySchedule(aSchedule()).value)).toBe('')
    expect(unreadPagesSentence(null)).toBe('')
  })

  it('names the pages and the document when a range was not read', () => {
    const { value } = validateCountrySchedule(aSchedule({
      pagesRead: [{ from: 1, to: 40 }],
      pagesUnread: [{ from: 41, to: 48 }]
    }))
    const said = unreadPagesSentence(value)
    expect(said).toContain('41')
    expect(said).toContain('48')
    expect(said).toContain('IR265')
  })

  it('names every range when more than one was not read', () => {
    const { value } = validateCountrySchedule(aSchedule({
      pagesUnread: [{ from: 41, to: 48 }, { from: 50, to: 50 }]
    }))
    const said = unreadPagesSentence(value)
    expect(said).toContain('41')
    expect(said).toContain('50')
  })
})

describe('searchScheduleClasses', () => {
  const schedule = {
    classes: [
      aClass({ label: 'Engineering (heavy) — plant and machinery' }),
      aClass({ label: 'Engineering (light) — plant and machinery' }),
      aClass({ label: 'Tractors (wheeled)' }),
      aClass({ label: 'Computers (desktop and laptop)' })
    ]
  }

  it('matches the authority\'s own wording, case-insensitively', () => {
    const { matches, total } = searchScheduleClasses(schedule, 'ENGINEERING')
    expect(total).toBe(2)
    expect(matches).toHaveLength(2)
  })

  it('returns the head of the schedule for an empty query, never an empty box', () => {
    const { matches } = searchScheduleClasses(schedule, '')
    expect(matches).toHaveLength(4)
  })

  it('caps what it returns and says how many matched in all', () => {
    const { matches, total, truncated } = searchScheduleClasses(schedule, 'a', 2)
    expect(matches.length).toBeLessThanOrEqual(2)
    expect(total).toBeGreaterThan(matches.length)
    expect(truncated).toBe(true)
  })

  it('never returns more than 200 however large a limit is asked for', () => {
    const big = { classes: [] }
    for (let i = 0; i < 400; i++) { big.classes.push(aClass({ label: 'Class ' + i })) }
    const { matches } = searchScheduleClasses(big, '', 100000)
    expect(matches).toHaveLength(200)
  })

  it('answers safely for a missing schedule', () => {
    expect(searchScheduleClasses(null, 'engineering').matches).toEqual([])
    expect(searchScheduleClasses({}, 'engineering').total).toBe(0)
  })
})

describe('mayLoadSchedules', () => {
  afterEach(() => setFirmMembership({}))

  it('lets a global group manager load, which is Mike\'s ruling of 2026-09-11', () => {
    expect(mayLoadSchedules(globalScopeId('Advisor-e'))).toBe(true)
  })

  it('does not let the mentor, a group manager or a firm load one', () => {
    expect(mayLoadSchedules(PLATFORM_SCOPE)).toBe(false)
    expect(mayLoadSchedules(groupScopeId('Advisor-e', 'NZ'))).toBe(false)
    expect(mayLoadSchedules('firm-1')).toBe(false)
  })

  it('refuses a missing scope', () => {
    expect(mayLoadSchedules(null)).toBe(false)
    expect(mayLoadSchedules('')).toBe(false)
  })
})

describe('resolveCountrySchedule', () => {
  const GLOBAL = globalScopeId('Advisor-e')
  const GROUP = groupScopeId('Advisor-e', 'NZ')

  beforeEach(() => setFirmMembership({ 'firm-1': { globalGroup: 'Advisor-e', country: 'NZ' } }))
  afterEach(() => setFirmMembership({}))

  /** An overlay reader standing in for the database. */
  function reader (byScope) {
    return jest.fn((scopeId, configKey) => {
      const held = byScope[scopeId]
      if (!held) { return Promise.resolve(null) }
      return Promise.resolve(held[configKey] === undefined ? null : held[configKey])
    })
  }

  it('finds the brand\'s schedule for a firm beneath it', async () => {
    const load = reader({ [GLOBAL]: { [configKeyFor('NZ')]: aSchedule() } })
    const out = await resolveCountrySchedule('firm-1', 'NZ', load)
    expect(out).not.toBeNull()
    expect(out.document).toBe('IR265')
    expect(out.originTier).toBe('global_group_manager')
    expect(out.originScopeId).toBe(GLOBAL)
  })

  it('asks only for the country wanted, never for every country held', async () => {
    const load = reader({ [GLOBAL]: { [configKeyFor('NZ')]: aSchedule() } })
    await resolveCountrySchedule('firm-1', 'NZ', load)
    load.mock.calls.forEach(([, key]) => expect(key).toBe(configKeyFor('NZ')))
  })

  it('gives nothing for a country nobody has loaded, so the advisor keeps the app defaults', async () => {
    const load = reader({ [GLOBAL]: { [configKeyFor('NZ')]: aSchedule() } })
    expect(await resolveCountrySchedule('firm-1', 'AU', load)).toBeNull()
  })

  it('lets the nearer tier win, exactly as the six rates do', async () => {
    const load = reader({
      [GLOBAL]: { [configKeyFor('NZ')]: aSchedule({ document: 'IR265' }) },
      [GROUP]: { [configKeyFor('NZ')]: aSchedule({ document: 'IR265 (NZ group edition)' }) }
    })
    const out = await resolveCountrySchedule('firm-1', 'NZ', load)
    expect(out.document).toBe('IR265 (NZ group edition)')
    expect(out.originTier).toBe('group_manager')
  })

  it('skips a stored schedule that no longer validates rather than serving it', async () => {
    const load = reader({ [GLOBAL]: { [configKeyFor('NZ')]: aSchedule({ approvedBy: '' }) } })
    expect(await resolveCountrySchedule('firm-1', 'NZ', load)).toBeNull()
  })

  it('skips a schedule filed under the wrong country', async () => {
    const load = reader({ [GLOBAL]: { [configKeyFor('NZ')]: aSchedule({ country: 'AU' }) } })
    expect(await resolveCountrySchedule('firm-1', 'NZ', load)).toBeNull()
  })

  it('never rejects when a tier cannot be read, and still uses the tiers that could', async () => {
    const load = jest.fn((scopeId) => {
      if (scopeId === GROUP) { return Promise.reject(new Error('store down')) }
      if (scopeId === GLOBAL) { return Promise.resolve(aSchedule()) }
      return Promise.resolve(null)
    })
    const out = await resolveCountrySchedule('firm-1', 'NZ', load)
    expect(out.originScopeId).toBe(GLOBAL)
  })

  it('answers null without asking the store when there is no scope or no country', async () => {
    const load = jest.fn()
    expect(await resolveCountrySchedule(null, 'NZ', load)).toBeNull()
    expect(await resolveCountrySchedule('firm-1', 'New Zealand', load)).toBeNull()
    expect(load).not.toHaveBeenCalled()
  })
})
