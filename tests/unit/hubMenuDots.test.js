'use strict'

/**
 * The hub menu's notification dots — item 4.84, slice 2.
 *
 * Design: `design/mockups/hub-menu-dots.html`, approved to build from 2026-09-10 with all
 * four of its questions ruled the same day.
 *
 * 🔴 THE FOUR THAT MATTER, and a person in UAT can check none of them in five seconds:
 *
 *   1. RED BEATS BLUE BEATS ORANGE — Mike's ruling. Seeing it on screen needs a tab that is
 *      simultaneously never-opened and holding new material, which is a state you cannot
 *      arrange by clicking; here it is one line.
 *
 *   2. THE ORANGE THRESHOLD IS A DATE COMPARISON. Twenty days is not orange and twenty-two
 *      is, and nobody can test that by hand without waiting three weeks.
 *
 *   3. NOTHING PAINTS BEFORE THE RECORD IS READ. The failure it prevents — every tab flashing
 *      blue on every hub load — looks like a rendering quirk rather than a bug, so it would be
 *      reported as "the dots flicker" and never traced.
 *
 *   4. A TAB CLEARS ITS OWN DOT AND NO OTHER. A stamp that cleared the whole menu would look
 *      perfectly reasonable on screen: the manager did just open the hub.
 *
 * The methods are exercised against a plain context rather than a mounted hub. This is the
 * shipped logic either way, and mounting the whole hub would drag in every child component and
 * its network calls to test four decisions that touch none of them.
 */

const Hub = require('../../components/FirmManagerHub.vue').default

const {
  menuDot, menuDotTitle, menuDotCount, menuDotCountLabel, loadTabOpened, markTabOpened
} = Hub.methods

/** Days ago, as an ISO timestamp. */
function daysAgo (n) {
  return new Date(Date.now() - n * 86400000).toISOString()
}

/**
 * A hub in a known state. Defaults: the record has been read, the threshold is the
 * backend's 21, and nothing is new in Compliance.
 */
function hub (over) {
  return Object.assign({
    complianceNewCount: 0,
    tabOpened: {},
    tabStaleDays: 21,
    tabOpenedLoaded: true,
    activeTab: 'domainSupport',
    visibleGroups: [],
    menuDot,
    menuDotTitle,
    menuDotCount,
    menuDotCountLabel,
    // The real one: `loadTabOpened` finishes by stamping the tab the hub opened on, and a
    // stub here would let that call quietly stop happening without a test noticing.
    markTabOpened,
    $set (obj, key, value) { obj[key] = value },
    api: jest.fn().mockResolvedValue({})
  }, over || {})
}

describe('which dot a tab carries', () => {
  test('red when something new arrived — Compliance, the only tab that raises one', () => {
    const ctx = hub({ complianceNewCount: 2, tabOpened: { compliance: daysAgo(1) } })

    expect(menuDot.call(ctx, 'compliance')).toBe('red')
  })

  test('🔴 RED BEATS BLUE — a never-opened tab holding new material shows RED', () => {
    // Mike's ruling, 2026-09-10. Drawn as our judgement at §3 of the artefact and settled by
    // him as drawn: the new material is the more urgent fact.
    const ctx = hub({ complianceNewCount: 1, tabOpened: {} })

    expect(menuDot.call(ctx, 'compliance')).toBe('red')
  })

  test('🔴 RED BEATS ORANGE — new material outranks a long absence', () => {
    const ctx = hub({ complianceNewCount: 1, tabOpened: { compliance: daysAgo(90) } })

    expect(menuDot.call(ctx, 'compliance')).toBe('red')
  })

  test('🔴 BLUE BEATS ORANGE by construction — never opened cannot also be stale', () => {
    // There is no timestamp to be stale against, so the two can never both apply. Pinned
    // because a later "default it to the epoch" would silently turn every blue dot orange.
    const ctx = hub({ tabOpened: {} })

    expect(menuDot.call(ctx, 'quizzes')).toBe('blue')
  })

  test('blue when this manager has never opened the tab', () => {
    const ctx = hub({ tabOpened: { taxRates: daysAgo(1) } })

    expect(menuDot.call(ctx, 'quizzes')).toBe('blue')
  })

  test('orange only once the threshold is genuinely passed', () => {
    const ctx = hub({
      tabOpened: { fresh: daysAgo(20), stale: daysAgo(22) }
    })

    expect(menuDot.call(ctx, 'fresh')).toBe('')
    expect(menuDot.call(ctx, 'stale')).toBe('orange')
  })

  test('no dot for a tab opened recently with nothing new in it', () => {
    const ctx = hub({ tabOpened: { taxRates: daysAgo(2) } })

    expect(menuDot.call(ctx, 'taxRates')).toBe('')
  })

  test('an unreadable stored timestamp reads as never opened, not as a missing dot', () => {
    const ctx = hub({ tabOpened: { taxRates: 'the day before yesterday' } })

    expect(menuDot.call(ctx, 'taxRates')).toBe('blue')
  })
})

describe('before the record has been read', () => {
  test('paints no blue or orange, so the menu cannot flash seventeen dots on load', () => {
    const ctx = hub({ tabOpenedLoaded: false, tabOpened: {} })

    expect(menuDot.call(ctx, 'quizzes')).toBe('')
  })

  test('still paints RED, which needs nothing stored', () => {
    const ctx = hub({ tabOpenedLoaded: false, complianceNewCount: 3 })

    expect(menuDot.call(ctx, 'compliance')).toBe('red')
  })

  test('paints no orange when the backend sent no threshold', () => {
    // The number has one home, on the backend. Without it there is no rule to apply, and
    // inventing a local 21 would be the second copy this feature was built to avoid.
    const ctx = hub({ tabStaleDays: null, tabOpened: { taxRates: daysAgo(90) } })

    expect(menuDot.call(ctx, 'taxRates')).toBe('')
  })
})

describe('the words beside the dot', () => {
  // 🔴 THESE THREE STRINGS ARE LOAD-BEARING AND PINNED ON PURPOSE — Mike ruled each of them
  // on 2026-09-10, one at a time, and they are the whole of what a manager who cannot see
  // colour is given. Everywhere else in this suite, wording is deliberately NOT asserted.
  test('says in words what each colour says', () => {
    const ctx = hub({
      complianceNewCount: 4,
      tabOpened: { taxRates: daysAgo(90) }
    })

    expect(menuDotTitle.call(ctx, 'compliance')).toBe('4 new items since you last declared')
    expect(menuDotTitle.call(ctx, 'quizzes')).toBe('Never opened')
    expect(menuDotTitle.call(ctx, 'taxRates')).toBe('Not opened in 3 weeks')
  })

  test('says nothing where there is no dot', () => {
    const ctx = hub({ tabOpened: { taxRates: daysAgo(1) } })

    expect(menuDotTitle.call(ctx, 'taxRates')).toBe('')
  })

  test('one new compliance item is not "1 new items"', () => {
    const ctx = hub({ complianceNewCount: 1 })

    expect(menuDotTitle.call(ctx, 'compliance')).toBe('1 new item since you last declared')
  })
})

describe('the count at the foot of the menu', () => {
  const groups = [{
    heading: 'Your AI coach',
    items: [{ key: 'domainSupport' }, { key: 'quizzes' }, { key: 'taxRates' }]
  }, {
    heading: 'Compliance',
    items: [{ key: 'compliance' }]
  }]

  test('counts every tab asking for attention, whatever colour it is asking in', () => {
    const ctx = hub({
      visibleGroups: groups,
      complianceNewCount: 2,
      tabOpened: { domainSupport: daysAgo(1), taxRates: daysAgo(90) }
      // domainSupport: recent, no dot · quizzes: blue · taxRates: orange · compliance: red
    })

    expect(menuDotCount.call(ctx)).toBe(3)
  })

  test('counts TABS, not items — four new documents in one tab still count once', () => {
    const ctx = hub({
      visibleGroups: [{ heading: 'Compliance', items: [{ key: 'compliance' }] }],
      complianceNewCount: 4,
      tabOpened: { compliance: daysAgo(1) }
    })

    expect(menuDotCount.call(ctx)).toBe(1)
  })

  test('counts only what this tier actually shows', () => {
    // `visibleGroups` is already filtered by tier, so a mentor is never told to look at a
    // tab their hub does not have.
    const ctx = hub({
      visibleGroups: [{ heading: 'Compliance', items: [{ key: 'compliance' }] }],
      tabOpened: {}
    })

    expect(menuDotCount.call(ctx)).toBe(1)
  })

  test('one tab is not "1 tabs"', () => {
    const ctx = hub({
      visibleGroups: [{ heading: 'Compliance', items: [{ key: 'compliance' }] }],
      tabOpened: {}
    })

    expect(menuDotCountLabel.call(ctx)).toBe('1 tab needing a look')
    expect(menuDotCountLabel.call(hub({
      visibleGroups: groups, tabOpened: {}
    }))).toBe('4 tabs needing a look')
  })
})

describe('opening a tab', () => {
  test('clears that tab\'s dot and no other', async () => {
    const ctx = hub({ tabOpened: {} })

    await markTabOpened.call(ctx, 'taxRates')

    expect(menuDot.call(ctx, 'taxRates')).toBe('')
    expect(menuDot.call(ctx, 'quizzes')).toBe('blue')
  })

  test('clears the dot without waiting for the server to answer', async () => {
    // The local record is written first on purpose: a dot that lingered until a round trip
    // finished would read as "the click did not register".
    let resolveIt
    const ctx = hub({ api: jest.fn(() => new Promise((resolve) => { resolveIt = resolve })) })

    const pending = markTabOpened.call(ctx, 'taxRates')
    expect(menuDot.call(ctx, 'taxRates')).toBe('')

    resolveIt({})
    await pending
  })

  test('tells the backend which tab, and nothing else', async () => {
    const ctx = hub()

    await markTabOpened.call(ctx, 'taxRates')

    expect(ctx.api).toHaveBeenCalledWith(
      'POST', '/api/firm-manager/hub-tabs/opened', { tab: 'taxRates' })
  })

  test('a failed stamp is silent — nothing the manager did has failed', async () => {
    const ctx = hub({ api: jest.fn().mockRejectedValue(new Error('offline')) })

    await expect(markTabOpened.call(ctx, 'taxRates')).resolves.toBeUndefined()
  })
})

describe('reading the record when the hub opens', () => {
  test('takes both the history and the threshold from the backend', async () => {
    const ctx = hub({
      tabOpenedLoaded: false,
      api: jest.fn().mockResolvedValue({
        opened: { taxRates: daysAgo(30) },
        staleDays: 21
      })
    })

    await loadTabOpened.call(ctx)

    expect(ctx.tabStaleDays).toBe(21)
    expect(ctx.tabOpenedLoaded).toBe(true)
    expect(menuDot.call(ctx, 'taxRates')).toBe('orange')
  })

  test('stamps the tab the hub opened on, which no watcher would ever see change', async () => {
    const ctx = hub({ tabOpenedLoaded: false, activeTab: 'domainSupport' })

    await loadTabOpened.call(ctx)

    expect(ctx.api).toHaveBeenCalledWith(
      'POST', '/api/firm-manager/hub-tabs/opened', { tab: 'domainSupport' })
  })

  test('a failed read leaves the menu with no blue or orange dots, and no alarm', async () => {
    const ctx = hub({
      tabOpenedLoaded: false,
      api: jest.fn().mockRejectedValue(new Error('offline'))
    })

    await expect(loadTabOpened.call(ctx)).resolves.toBeUndefined()
    expect(ctx.tabOpenedLoaded).toBe(false)
    expect(menuDot.call(ctx, 'quizzes')).toBe('')
  })

  test('a red dot survives a failed read, because it needs nothing that read holds', async () => {
    const ctx = hub({
      tabOpenedLoaded: false,
      complianceNewCount: 2,
      api: jest.fn().mockRejectedValue(new Error('offline'))
    })

    await loadTabOpened.call(ctx)

    expect(menuDot.call(ctx, 'compliance')).toBe('red')
  })
})
