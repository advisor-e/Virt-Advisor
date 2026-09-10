'use strict'

/**
 * The compliance cascade — item 4.83, slice 1.
 *
 * 🔴 THE THREE THAT MATTER, and none of them is visible to a person in UAT:
 *
 *   1. EVERY TIER'S ITEMS SURVIVE THE RESOLVE. This is the one cascading block in the app
 *      that must NOT merge — a firm reads a list of items each naming the tier that
 *      published it, so a global group manager's material has to sit beside the mentor's
 *      rather than being overwritten by it. A merge would look perfectly normal on screen
 *      and would silently lose whichever layer lost the fold.
 *
 *   2. A MALFORMED ROW COSTS ONE ITEM, NEVER THE PAGE. A firm whose compliance page fails
 *      whole is a firm told nothing at all about its obligations, which is worse than a
 *      firm told most things.
 *
 *   3. THE DOT COUNTS AGAINST THE DECLARATION, NOT AGAINST A VISIT. Mike's wording,
 *      2026-09-10: new means "published since you last declared". A dot that cleared itself
 *      when somebody opened the page would report reading as understanding — and with no
 *      declaration recorded, everything published to you is new, which is the correct
 *      answer for a firm that has declared nothing.
 */

const {
  validateComplianceItems,
  nextItemId,
  resolveComplianceItems,
  newCountSince,
  readDeclaration,
  meetingReviewOpen,
  DECLARATION_WORDING,
  CONFIG_KEY,
  MAX_BODY,
  MAX_ITEMS,
  MAX_TITLE
} = require('../../server/utils/compliance')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const {
  setFirmMembership,
  globalScopeId,
  groupScopeId
} = require('../../server/utils/tierChain')

const FIRM = 'firm-test-123'
const BRAND = 'Acme'
const COUNTRY = 'Germany'

/** A valid stored item, with anything you want overridden. */
function item (over) {
  return Object.assign({
    title: 'Meeting Review — Data Protection Impact Assessment',
    summary: 'Assessed against the NZ Privacy Act 2020',
    body: 'The assessment itself.',
    version: 1,
    publishedAt: '2026-09-10T09:00:00.000Z',
    publishedBy: 'mentor@example.com'
  }, over || {})
}

afterEach(() => {
  setFirmMembership({})
})

// ── Validation ────────────────────────────────────────────────────────────────

describe('validateComplianceItems', () => {
  test('accepts a well-formed set and returns it cleaned', () => {
    const { ok, value } = validateComplianceItems({ 'ci-1': item() })
    expect(ok).toBe(true)
    expect(value['ci-1'].version).toBe(1)
    expect(value['ci-1'].body).toBe('The assessment itself.')
  })

  test('an absent value is an empty set, not a failure', () => {
    // A tier that has published nothing is the common case, not an error.
    expect(validateComplianceItems(null)).toEqual({ ok: true, errors: [], value: {} })
    expect(validateComplianceItems(undefined).value).toEqual({})
  })

  test('an array is refused — the store is a map so a republish can address one item', () => {
    const { ok } = validateComplianceItems([item()])
    expect(ok).toBe(false)
  })

  test.each([
    ['no title', { title: '' }],
    ['a non-string title', { title: 42 }],
    ['no body — an item with no material publishes nothing', { body: '   ' }],
    ['no publishedAt', { publishedAt: '' }],
    ['an unparseable publishedAt', { publishedAt: 'last Tuesday' }],
    ['no publishedBy — nobody to name beside it', { publishedBy: '' }],
    ['a version below one', { version: 0 }],
    ['a fractional version', { version: 1.5 }]
  ])('refuses an item with %s', (_label, over) => {
    const { ok, value } = validateComplianceItems({ 'ci-1': item(over) })
    expect(ok).toBe(false)
    expect(value['ci-1']).toBeUndefined()
  })

  test('🔴 a body past the cap is REFUSED, never truncated', () => {
    // Silently docking the last third of a legal document destroys the thing being stored.
    // The title and summary truncate; this one cannot.
    const { ok, value } = validateComplianceItems({ 'ci-1': item({ body: 'x'.repeat(MAX_BODY + 1) }) })
    expect(ok).toBe(false)
    expect(value['ci-1']).toBeUndefined()
  })

  test('a title past the cap is truncated rather than refused', () => {
    const { value } = validateComplianceItems({ 'ci-1': item({ title: 'y'.repeat(MAX_TITLE + 50) }) })
    expect(value['ci-1'].title).toHaveLength(MAX_TITLE)
  })

  test('a set past the item cap is refused whole', () => {
    const many = {}
    for (let i = 0; i <= MAX_ITEMS; i++) { many['ci-' + i] = item() }
    const { ok, value } = validateComplianceItems(many)
    expect(ok).toBe(false)
    expect(value).toEqual({})
  })

  test('🔴 one bad item is dropped and the rest survive', () => {
    // See this file's header, point 2. `ok` is false so a WRITE is refused; the surviving
    // items are still returned so a READ can show what it has.
    const { ok, value } = validateComplianceItems({
      'ci-1': item(),
      'ci-2': item({ body: '' }),
      'ci-3': item({ title: 'Meeting consent wording' })
    })
    expect(ok).toBe(false)
    expect(Object.keys(value).sort()).toEqual(['ci-1', 'ci-3'])
  })
})

// ── Minting ids ───────────────────────────────────────────────────────────────

describe('nextItemId', () => {
  test('counts from the highest id present, never from the size of the set', () => {
    // Counting from the size would reuse an id after an item was removed, silently
    // reattaching one item's publication history to another.
    expect(nextItemId({})).toBe('ci-1')
    expect(nextItemId({ 'ci-1': item(), 'ci-7': item() })).toBe('ci-8')
  })

  test('ignores ids that are not ours', () => {
    expect(nextItemId({ 'something-else': item() })).toBe('ci-1')
  })
})

// ── The cascade ───────────────────────────────────────────────────────────────

describe('resolveComplianceItems', () => {
  /** A reader over a plain `{ scopeId: items }` map. */
  function readerFor (byScope) {
    return (scopeId, key) => {
      expect(key).toBe(CONFIG_KEY)
      return Promise.resolve(byScope[scopeId] || null)
    }
  }

  test('no scope resolves to nothing rather than guessing', async () => {
    expect(await resolveComplianceItems(null, readerFor({}))).toEqual([])
  })

  test('🔴 every tier\'s items survive — nothing is merged away', async () => {
    // See this file's header, point 1. Four tiers, four items, and all four must be readable
    // by the firm at the bottom with the tier that published each one still attached.
    setFirmMembership({ [FIRM]: { globalGroup: BRAND, country: COUNTRY } })

    const items = await resolveComplianceItems(FIRM, readerFor({
      [PLATFORM_SCOPE]: { 'ci-1': item({ title: 'Platform', publishedAt: '2026-09-01T00:00:00Z' }) },
      [globalScopeId(BRAND)]: { 'ci-1': item({ title: 'Brand', publishedAt: '2026-09-02T00:00:00Z' }) },
      [groupScopeId(BRAND, COUNTRY)]: { 'ci-1': item({ title: 'Country', publishedAt: '2026-09-03T00:00:00Z' }) },
      [FIRM]: { 'ci-1': item({ title: 'Ours', publishedAt: '2026-09-04T00:00:00Z' }) }
    }))

    expect(items).toHaveLength(4)
    expect(items.map(i => i.originTier)).toEqual([
      'firm_manager', 'group_manager', 'global_group_manager', 'mentor'
    ])
  })

  test('an item is flagged as the reader\'s own only when the reader published it', async () => {
    // This flag is the ONLY thing that decides whether a republish control is offered, so
    // getting it wrong at one tier would offer a firm an edit on the mentor's material —
    // the exact thing Mike ruled against on 2026-09-10.
    const items = await resolveComplianceItems(FIRM, readerFor({
      [PLATFORM_SCOPE]: { 'ci-1': item() },
      [FIRM]: { 'ci-1': item({ publishedAt: '2026-09-11T00:00:00Z' }) }
    }))

    const own = items.filter(i => i.isOwn)
    expect(own).toHaveLength(1)
    expect(own[0].originScopeId).toBe(FIRM)
  })

  test('items come back newest first', async () => {
    const items = await resolveComplianceItems(FIRM, readerFor({
      [PLATFORM_SCOPE]: {
        'ci-1': item({ title: 'Older', publishedAt: '2026-09-01T00:00:00Z' }),
        'ci-2': item({ title: 'Newer', publishedAt: '2026-09-09T00:00:00Z' })
      }
    }))
    expect(items.map(i => i.title)).toEqual(['Newer', 'Older'])
  })

  test('🔴 one unreachable tier costs that tier only, never the whole page', async () => {
    // See this file's header, point 2, one level up: a firm whose compliance page fails whole
    // is a firm told nothing at all about its obligations.
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const items = await resolveComplianceItems(FIRM, (scopeId) => {
      if (scopeId === PLATFORM_SCOPE) { return Promise.reject(new Error('mentor row unreadable')) }
      return Promise.resolve({ 'ci-1': item({ title: 'Ours' }) })
    })
    expect(items.map(i => i.title)).toEqual(['Ours'])
    console.error.mockRestore()
  })

  test('a malformed item is dropped and its tier\'s good items still arrive', async () => {
    const items = await resolveComplianceItems(FIRM, readerFor({
      [PLATFORM_SCOPE]: { 'ci-1': item({ body: '' }), 'ci-2': item({ title: 'Survivor' }) }
    }))
    expect(items.map(i => i.title)).toEqual(['Survivor'])
  })

  test('each item carries a ref unique across tiers', async () => {
    // Two tiers both mint `ci-1` on their own rows, so the id alone cannot key a list.
    setFirmMembership({ [FIRM]: { globalGroup: BRAND, country: COUNTRY } })
    const items = await resolveComplianceItems(FIRM, readerFor({
      [PLATFORM_SCOPE]: { 'ci-1': item() },
      [FIRM]: { 'ci-1': item() }
    }))
    expect(new Set(items.map(i => i.ref)).size).toBe(items.length)
  })
})

// ── The declaration, and the gate ─────────────────────────────────────────────

describe('readDeclaration and meetingReviewOpen', () => {
  const good = {
    declaredAt: '2026-09-10T00:00:00.000Z',
    declaredBy: 'janine@example.com',
    wording: DECLARATION_WORDING,
    against: [{ ref: '__platform__/ci-1', title: 'The assessment', version: 2 }]
  }

  test('accepts a complete declaration and keeps what was on screen', () => {
    const out = readDeclaration(good)
    expect(out.declaredBy).toBe('janine@example.com')
    expect(out.wording).toBe(DECLARATION_WORDING)
    expect(out.against[0].version).toBe(2)
  })

  test.each([
    ['nothing at all', null],
    ['an array', []],
    ['no date', { declaredBy: 'a@b.c' }],
    ['an unparseable date', { declaredAt: 'someday', declaredBy: 'a@b.c' }],
    ['🔴 nobody\'s name — a declaration nobody signed is not a declaration',
      { declaredAt: '2026-09-10T00:00:00.000Z' }]
  ])('refuses %s', (_label, value) => {
    expect(readDeclaration(value)).toBeNull()
    expect(meetingReviewOpen(value)).toBe(false)
  })

  test('🔴 the gate opens on the declaration and on nothing else', () => {
    // The distinction the whole design rests on, at the level of the function that decides
    // it: there is one input, and it is the declaration.
    expect(meetingReviewOpen(good)).toBe(true)
  })

  test('a malformed entry in `against` is dropped, and the declaration still stands', () => {
    // The record of what was on screen is evidence, not a gate. One unreadable entry must
    // not invalidate a declaration a manager actually made.
    const out = readDeclaration({ ...good, against: [{ nope: true }, good.against[0]] })
    expect(out).not.toBeNull()
    expect(out.against).toHaveLength(1)
  })

  test('the pinned wording is Mike\'s sentence, first person and with the authority clause', () => {
    // 🔴 THE ONE DELIBERATE WORDING PIN IN THIS FEATURE, and it is load-bearing: this is the
    // sentence a firm manager is held to when their advisors record a client. It is pinned
    // here, beside the store that keeps it, with the reason stated — not scattered across
    // screen tests. Everything else this feature says on screen is UAT's to judge.
    expect(DECLARATION_WORDING).toContain('I confirm I have read the material provided above')
    expect(DECLARATION_WORDING).toContain('I act for and on behalf of my firm')
  })
})

// ── The dot ───────────────────────────────────────────────────────────────────

describe('newCountSince', () => {
  const inherited = at => ({ isOwn: false, publishedAt: at })

  test('🔴 with no declaration, everything published to you is new', () => {
    // The correct answer rather than a placeholder: a firm that has declared nothing has
    // read nothing, as far as this app can know.
    expect(newCountSince([inherited('2026-09-01T00:00:00Z'), inherited('2026-01-01T00:00:00Z')], null))
      .toBe(2)
  })

  test('counts only what was published after the declaration', () => {
    const count = newCountSince([
      inherited('2026-09-09T00:00:00Z'),
      inherited('2026-09-11T00:00:00Z')
    ], '2026-09-10T00:00:00Z')
    expect(count).toBe(1)
  })

  test('🔴 your own publications never notify you', () => {
    expect(newCountSince([{ isOwn: true, publishedAt: '2026-09-11T00:00:00Z' }], '2026-09-10T00:00:00Z'))
      .toBe(0)
  })

  test('an unreadable date counts as new rather than being skipped', () => {
    // The safe direction: a manager told to look at something that turns out to be old has
    // lost a minute; one never told has lost the notification entirely.
    expect(newCountSince([inherited('not a date')], '2026-09-10T00:00:00Z')).toBe(1)
  })

  test('a nonsense declaration date is treated as no declaration at all', () => {
    expect(newCountSince([inherited('2026-01-01T00:00:00Z')], 'whenever')).toBe(1)
  })

  test('nothing published is nothing to report', () => {
    expect(newCountSince([], null)).toBe(0)
    expect(newCountSince(null, null)).toBe(0)
  })
})
