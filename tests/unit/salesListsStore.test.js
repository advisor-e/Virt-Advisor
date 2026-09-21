'use strict'

/**
 * The Sales Tracker's dropdown lists — item 17 stage 4.
 *
 * Stage 1 dropped the source app's `appconfig` table and stored these on
 * `firm_framework_versions` through `firmOverlay`. What is asserted here is what
 * that decision has to buy, and what it must never cost:
 *
 *   1. 🔴 A DEFAULT IS THE FLOOR. A firm that has never touched a list still gets
 *      its values — a dropdown that silently empties takes its screen with it.
 *   2. A firm edits the VALUES in a list, never what the list is. A stored name or
 *      description cannot override the default's.
 *   3. A stored value of the wrong shape falls back rather than reaching a screen.
 *   4. One unreadable list does not take the other nine down with it.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const store = require('../../server/utils/salesListsStore')

const FIRM = 'firm-111'

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(1)
  overlay.getVersionHistory.mockResolvedValue([])
  overlay.restoreVersion.mockResolvedValue(2)
})

describe('the ten lists and their keys', () => {
  test('all ten source-app lists are present', () => {
    expect(store.LIST_KEYS).toEqual([
      'partner', 'leadStaff', 'prospectStatus', 'relationshipType', 'prospectSource',
      'approachStyle', 'salesStyle', 'totalNeedsStage', 'meetingTheme', 'industry'
    ])
  })

  test('🔴 the five prospect statuses match the ones the roll-up counts', () => {
    // salesMetrics.teamSummary counts these exact strings. If a default is
    // retitled here, every status column on the Team screen silently reads zero.
    expect(store.DEFAULT_LISTS.prospectStatus.items)
      .toEqual(['Active', 'Await Research', 'Completed', 'Dead', 'On Hold'])
  })

  test('🔴 the two sales styles match the ones the dashboard splits its funnels on', () => {
    // salesMetrics.dashboard builds one funnel per style. Renaming either here
    // empties one of Mike's two funnels.
    expect(store.DEFAULT_LISTS.salesStyle.items).toEqual(['Campaign', 'Total Needs'])
  })

  test('keys are namespaced so they cannot collide with another feature\'s config', () => {
    expect(store.configKeyFor('partner')).toBe('sales-tracker-list:partner')
    expect(store.KEY_PREFIX.endsWith(':')).toBe(true)
  })

  test('isKnownKey accepts the ten and refuses anything else', () => {
    expect(store.isKnownKey('partner')).toBe(true)
    expect(store.isKnownKey('evil')).toBe(false)
    expect(store.isKnownKey('')).toBe(false)
    expect(store.isKnownKey(null)).toBe(false)
    // A prototype key must not pass as a list.
    expect(store.isKnownKey('constructor')).toBe(false)
    expect(store.isKnownKey('__proto__')).toBe(false)
  })
})

describe('getLists — defaults are the floor', () => {
  test('🔴 a firm that has stored nothing still gets every list, with its defaults', async () => {
    const lists = await store.getLists(FIRM)
    expect(Object.keys(lists)).toHaveLength(10)
    expect(lists.prospectStatus.items).toHaveLength(5)
    expect(lists.prospectStatus.isCustomised).toBe(false)
  })

  test('a stored list replaces the default items and is marked customised', async () => {
    overlay.loadFirmConfig.mockImplementation((firmId, key) =>
      Promise.resolve(key === 'sales-tracker-list:partner' ? { items: ['Ann', 'Bob'] } : null))
    const lists = await store.getLists(FIRM)
    expect(lists.partner.items).toEqual(['Ann', 'Bob'])
    expect(lists.partner.isCustomised).toBe(true)
    // The other nine are untouched.
    expect(lists.industry.isCustomised).toBe(false)
  })

  test('🔴 a firm CAN store an empty list, and it does not silently revert', async () => {
    // An empty list is a real choice — a firm with no COI partners yet. It must
    // not be mistaken for "nothing stored" and refilled with defaults.
    overlay.loadFirmConfig.mockResolvedValue({ items: [] })
    const lists = await store.getLists(FIRM)
    expect(lists.prospectStatus.items).toEqual([])
    expect(lists.prospectStatus.isCustomised).toBe(true)
  })

  test('the firm edits VALUES, never what the list is', async () => {
    overlay.loadFirmConfig.mockResolvedValue({
      items: ['X'], name: 'Hijacked', description: 'Hijacked', key: 'somethingElse'
    })
    const lists = await store.getLists(FIRM)
    expect(lists.partner.name).toBe('Partner')
    expect(lists.partner.description).toBe(store.DEFAULT_LISTS.partner.description)
    expect(lists.partner.key).toBe('partner')
  })

  test('a stored value of the wrong shape falls back to the default', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ items: 'not an array' })
    const lists = await store.getLists(FIRM)
    expect(lists.prospectStatus.items).toHaveLength(5)
    expect(lists.prospectStatus.isCustomised).toBe(false)
  })

  test('non-text entries in a stored list are dropped rather than rendered', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ items: ['Ann', 42, null, 'Bob'] })
    const lists = await store.getLists(FIRM)
    expect(lists.partner.items).toEqual(['Ann', 'Bob'])
  })

  test('stored colours merge over the defaults rather than replacing them wholesale', async () => {
    overlay.loadFirmConfig.mockImplementation((firmId, key) =>
      Promise.resolve(key === 'sales-tracker-list:prospectStatus'
        ? { items: ['Active'], colors: { Active: '#ffffff' } }
        : null))
    const lists = await store.getLists(FIRM)
    expect(lists.prospectStatus.colors.Active).toBe('#ffffff')
    // A colour the firm did not override is still the default's.
    expect(lists.prospectStatus.colors.Dead).toBe('#fee2e2')
  })

  test('colours stored as an array are ignored', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ items: ['Active'], colors: ['#fff'] })
    const lists = await store.getLists(FIRM)
    expect(lists.prospectStatus.colors.Active).toBe('#dcfce7')
  })

  test('🔴 one unreadable list does not take the other nine with it', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.loadFirmConfig.mockImplementation((firmId, key) =>
      key === 'sales-tracker-list:partner'
        ? Promise.reject(new Error('ER_LOCK_WAIT_TIMEOUT'))
        : Promise.resolve(null))
    const lists = await store.getLists(FIRM)
    expect(Object.keys(lists)).toHaveLength(10)
    expect(lists.partner.items).toEqual([])
    // The failure is logged, never swallowed in silence.
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('reads are scoped to the firm it was given', async () => {
    await store.getLists(FIRM)
    overlay.loadFirmConfig.mock.calls.forEach(([firmId]) => expect(firmId).toBe(FIRM))
  })
})

describe('getList — one list', () => {
  test('an unknown key returns null rather than inventing a list', async () => {
    expect(await store.getList(FIRM, 'evil')).toBeNull()
    expect(overlay.loadFirmConfig).not.toHaveBeenCalled()
  })

  test('a known key returns the merged list', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ items: ['Ann'] })
    const list = await store.getList(FIRM, 'partner')
    expect(list.items).toEqual(['Ann'])
    expect(list.name).toBe('Partner')
  })
})

describe('normaliseItems', () => {
  test('trims, and drops blanks', () => {
    expect(store.normaliseItems(['  Ann  ', '', '   ', 'Bob']).value).toEqual(['Ann', 'Bob'])
  })

  test('removes duplicates, keeping the firm\'s own order', () => {
    expect(store.normaliseItems(['Bob', 'Ann', 'Bob']).value).toEqual(['Bob', 'Ann'])
  })

  test('duplicates that differ only by surrounding space collapse to one', () => {
    expect(store.normaliseItems(['Ann', ' Ann ']).value).toEqual(['Ann'])
  })

  test('caps the length of one value', () => {
    const long = 'x'.repeat(500)
    expect(store.normaliseItems([long]).value[0]).toHaveLength(store.MAX_ITEM_LENGTH)
  })

  test('refuses a list past the size cap rather than storing what no screen renders', () => {
    const many = new Array(store.MAX_ITEMS + 1).fill(null).map((_, i) => `item-${i}`)
    expect(store.normaliseItems(many).error).toMatch(/more than/)
  })

  test('a list exactly at the cap is accepted', () => {
    const many = new Array(store.MAX_ITEMS).fill(null).map((_, i) => `item-${i}`)
    expect(store.normaliseItems(many).value).toHaveLength(store.MAX_ITEMS)
  })

  test('refuses anything that is not an array', () => {
    expect(store.normaliseItems('Ann').error).toBeTruthy()
    expect(store.normaliseItems(null).error).toBeTruthy()
    expect(store.normaliseItems(undefined).error).toBeTruthy()
    expect(store.normaliseItems({ 0: 'Ann' }).error).toBeTruthy()
  })

  test('refuses a non-text entry rather than coercing it', () => {
    expect(store.normaliseItems(['Ann', 42]).error).toBeTruthy()
  })

  test('an empty array is valid — a firm may clear a list', () => {
    expect(store.normaliseItems([]).value).toEqual([])
  })
})

describe('saveList', () => {
  test('writes under the namespaced key, for the given firm, with the saver', async () => {
    await store.saveList(FIRM, 'partner', { items: ['Ann'] }, 'advisor-aaa')
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, 'sales-tracker-list:partner', { items: ['Ann'] }, 'advisor-aaa'
    )
  })

  test('colours are stored when given', async () => {
    await store.saveList(FIRM, 'prospectStatus', { items: ['Active'], colors: { Active: '#fff' } }, 'a')
    expect(overlay.saveFirmConfig.mock.calls[0][2].colors).toEqual({ Active: '#fff' })
  })

  test('colours given as an array are not stored', async () => {
    await store.saveList(FIRM, 'partner', { items: [], colors: ['#fff'] }, 'a')
    expect(overlay.saveFirmConfig.mock.calls[0][2].colors).toBeUndefined()
  })

  test('🔴 an unknown key throws and writes nothing', async () => {
    await expect(store.saveList(FIRM, 'evil', { items: [] }, 'a')).rejects.toThrow(/unknown list key/)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('returns the list as a screen reads it', async () => {
    const list = await store.saveList(FIRM, 'partner', { items: ['Ann'] }, 'a')
    expect(list).toMatchObject({ key: 'partner', name: 'Partner', items: ['Ann'], isCustomised: true })
  })
})

describe('history and restore come free from firmOverlay', () => {
  test('history is read for the namespaced key', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 1, version: 2 }])
    const versions = await store.historyFor(FIRM, 'partner')
    expect(overlay.getVersionHistory).toHaveBeenCalledWith(FIRM, 'sales-tracker-list:partner')
    expect(versions).toHaveLength(1)
  })

  test('history for an unknown key throws', async () => {
    await expect(store.historyFor(FIRM, 'evil')).rejects.toThrow(/unknown list key/)
  })

  test('restore calls firmOverlay with three arguments — it stamps the saver itself', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ items: ['Ann'] })
    await store.restoreList(FIRM, 'partner', 7)
    expect(overlay.restoreVersion).toHaveBeenCalledWith(FIRM, 'sales-tracker-list:partner', 7)
    expect(overlay.restoreVersion.mock.calls[0]).toHaveLength(3)
  })

  test('restore returns the list as it now stands', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ items: ['Restored'] })
    const list = await store.restoreList(FIRM, 'partner', 7)
    expect(list.items).toEqual(['Restored'])
  })

  test('restore of an unknown key throws and restores nothing', async () => {
    await expect(store.restoreList(FIRM, 'evil', 1)).rejects.toThrow(/unknown list key/)
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })
})
