'use strict'

/**
 * wagesRegisterStore — what a client's staff register holds (item 4.104).
 *
 * WHAT UAT CANNOT SEE, AND THIS PINS. A tester drives the screen and can only ever send what
 * the screen sends. These assertions cover the other direction: that a field nobody asked for
 * cannot arrive by being added to a request body. **Sick leave above all** — Mike ruled it off
 * the product entirely on 2026-09-15 (*"take it off"*), and a rule enforced only by a screen
 * not having a box for it is not enforced.
 */
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))
jest.mock('../../server/utils/dbFailure', () => ({ devFallbackAllowed: jest.fn(() => false) }))

const overlay = require('../../server/utils/firmOverlay')
const store = require('../../server/utils/wagesRegisterStore')

beforeEach(() => {
  overlay.loadFirmConfig.mockReset()
  overlay.saveFirmConfig.mockReset()
})

describe('configKey', () => {
  it('keys one client', () => {
    expect(store.configKey('c-1')).toBe('wages-register-rows:c-1')
  })

  it('is NOT the switch\'s key — the contents and the decision are different facts', () => {
    const gate = require('../../server/utils/wagesRegisterGate')
    expect(store.KEY_PREFIX).not.toBe(gate.KEY_PREFIX)
  })

  it.each([[''], [null], ['has:colon'], ['x'.repeat(65)]])('refuses %p', (id) => {
    expect(() => store.configKey(id)).toThrow(/client id/)
    try { store.configKey(id) } catch (e) { expect(e.code).toBe('BAD_CLIENT') }
  })
})

describe('sanitise — an allow-list, not a clean-up', () => {
  it('🔴 DROPS SICK LEAVE, however it is sent', () => {
    const out = store.sanitise({
      people: [{ key: 'admin|mary g|1', name: 'Mary G', accruedLeaveDays: 3, sickLeaveDays: 12, sickLeave: 12 }]
    })
    expect(out.people[0]).not.toHaveProperty('sickLeaveDays')
    expect(out.people[0]).not.toHaveProperty('sickLeave')
    expect(Object.keys(out.people[0]).sort())
      .toEqual(['accruedLeaveDays', 'band', 'key', 'name', 'yearsEmployed'])
  })

  it('drops a date of birth, which Mike ruled off the register on 2026-09-14', () => {
    const out = store.sanitise({ people: [{ key: 'k|1', name: 'Mary G', dob: '1969-01-01', age: 57 }] })
    expect(out.people[0]).not.toHaveProperty('dob')
    expect(out.people[0]).not.toHaveProperty('age')
  })

  it('keeps the three typed fields and the hours', () => {
    const out = store.sanitise({
      hoursInLeaveDay: 8,
      people: [{ key: 'production|bruce|1', name: 'Bruce', accruedLeaveDays: 16, yearsEmployed: 5, band: 'direct-loss' }]
    })
    expect(out.hoursInLeaveDay).toBe(8)
    expect(out.people[0]).toEqual({
      key: 'production|bruce|1',
      name: 'Bruce',
      accruedLeaveDays: 16,
      yearsEmployed: 5,
      band: 'direct-loss'
    })
  })

  it('refuses a band that is not one of the three', () => {
    // "Dispensable" is the workbook's word and Decision 7 exists to keep it off this
    // document. It must not be storable even by a direct call.
    expect(store.sanitise({ people: [{ key: 'k|1', band: 'Dispensable' }] }).people[0].band).toBeNull()
  })

  it('drops an entry with no KEY — the key is what identifies a person', () => {
    expect(store.sanitise({ people: [{ accruedLeaveDays: 3 }, { key: '   ' }] }).people).toEqual([])
  })

  it('🔴 KEEPS an entry with no NAME, because four of the sample team have none', () => {
    // Dropping them silently discarded whatever the advisor typed against those rows. Found
    // by opening the screen on 2026-09-15, not by a test.
    const out = store.sanitise({ people: [{ key: 'production||1', name: '', accruedLeaveDays: 4 }] })
    expect(out.people).toHaveLength(1)
    expect(out.people[0].accruedLeaveDays).toBe(4)
  })

  it('trims a very long name rather than storing it whole', () => {
    expect(store.sanitise({ people: [{ key: 'k|1', name: 'x'.repeat(300) }] }).people[0].name).toHaveLength(128)
  })

  it('caps how many people one request can write', () => {
    const many = Array.from({ length: store.MAX_PEOPLE + 50 }, (_, i) => ({ key: 'k|' + i }))
    expect(store.sanitise({ people: many }).people).toHaveLength(store.MAX_PEOPLE)
  })

  it.each([[null], ['']])('reads hours %p as not set rather than zero', (hours) => {
    expect(store.sanitise({ hoursInLeaveDay: hours }).hoursInLeaveDay).toBeNull()
  })

  it.each([[0], [0.1], [25], ['nonsense']])('refuses out-of-range hours %p', (hours) => {
    expect(store.sanitise({ hoursInLeaveDay: hours }).hoursInLeaveDay).toBeNull()
  })

  it('refuses negative leave and impossible service', () => {
    const out = store.sanitise({ people: [{ key: 'k|1', accruedLeaveDays: -1, yearsEmployed: 200 }] })
    expect(out.people[0].accruedLeaveDays).toBeNull()
    expect(out.people[0].yearsEmployed).toBeNull()
  })

  it('survives a body that is not an object at all', () => {
    expect(store.sanitise(null)).toEqual({ hoursInLeaveDay: null, people: [] })
    expect(store.sanitise({ people: 'not a list' }).people).toEqual([])
    expect(store.sanitise({ people: [null, 'x'] }).people).toEqual([])
  })
})

describe('read', () => {
  it('returns an empty register rather than null when nothing is stored', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    expect(await store.read('firm-1', 'c-1')).toEqual({
      hoursInLeaveDay: null, people: [], savedBy: null, savedAt: null
    })
  })

  it('🔴 sanitises on the way OUT as well as in', async () => {
    // A row written before a field was tightened — or typed into the dev file by hand —
    // cannot put on screen a value the register would refuse to accept.
    overlay.loadFirmConfig.mockResolvedValue({
      hoursInLeaveDay: 8,
      people: [{ key: 'admin|mary g|1', name: 'Mary G', accruedLeaveDays: 3, band: 'Dispensable', sickLeaveDays: 12 }],
      savedBy: 'mike@advisor-e.com',
      savedAt: '2026-09-15T02:00:00.000Z'
    })
    const out = await store.read('firm-1', 'c-1')
    expect(out.people[0].band).toBeNull()
    expect(out.people[0]).not.toHaveProperty('sickLeaveDays')
    expect(out.savedBy).toBe('mike@advisor-e.com')
  })

  it('re-throws a real database failure rather than serving a scratch file', async () => {
    const err = new Error('refused')
    overlay.loadFirmConfig.mockRejectedValue(err)
    await expect(store.read('firm-1', 'c-1')).rejects.toThrow('refused')
  })

  it('refuses an unkeyable client id before it reaches the store', async () => {
    await expect(store.read('firm-1', 'has:colon')).rejects.toThrow(/client id/)
    expect(overlay.loadFirmConfig).not.toHaveBeenCalled()
  })
})

describe('save', () => {
  it('writes only the allowed fields, stamped with who and when', async () => {
    overlay.saveFirmConfig.mockResolvedValue()
    const out = await store.save('firm-1', 'c-1', {
      hoursInLeaveDay: 8,
      people: [{ key: 'production|bruce|1', name: 'Bruce', accruedLeaveDays: 16, yearsEmployed: 5, band: 'direct-loss', sickLeaveDays: 14 }]
    }, 'mike@advisor-e.com')
    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.people[0]).not.toHaveProperty('sickLeaveDays')
    expect(written.savedBy).toBe('mike@advisor-e.com')
    expect(out.savedAt).toEqual(expect.any(String))
  })

  it('re-throws a real database failure', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('refused'))
    await expect(store.save('firm-1', 'c-1', {}, null)).rejects.toThrow('refused')
  })
})

describe('personKey — a stable identity, because names are not one', () => {
  it('numbers repeated names within a division', () => {
    // 🔴 THE WORKBOOK'S OWN SAMPLE TEAM HAS TWO BUTCHES. Found by opening the screen on
    // 2026-09-15: Vue reported duplicate keys and the wrong person's row updated as the
    // advisor typed.
    const seen = {}
    const a = store.personKey({ name: 'Butch', division: 'Production' }, seen)
    const b = store.personKey({ name: 'Butch', division: 'Production' }, seen)
    expect(a).not.toBe(b)
    expect(a).toBe('production|butch|1')
    expect(b).toBe('production|butch|2')
  })

  it('gives the four nameless people distinct keys too', () => {
    const seen = {}
    const a = store.personKey({ name: '', division: 'Production' }, seen)
    const b = store.personKey({ name: '', division: 'Management' }, seen)
    const c = store.personKey({ name: '', division: 'Management' }, seen)
    expect(new Set([a, b, c]).size).toBe(3)
  })

  it('is not case-sensitive — a capitalisation change is not a different person', () => {
    expect(store.personKey({ name: 'Bruce', division: 'Production' }, {}))
      .toBe(store.personKey({ name: 'bruce', division: 'production' }, {}))
  })

  it('survives a person with nothing on them at all', () => {
    expect(typeof store.personKey(null, {})).toBe('string')
  })
})

describe('merge — the team is who, the register is what was typed about them', () => {
  const team = [
    { name: 'Mary G', division: 'Admin', payRate: 19.95 },
    { name: 'Bruce', division: 'Production', payRate: 40.28 }
  ]

  it('🔴 values leave at the rate INCLUDING pay rises, keeping the base beside it', () => {
    // Mike's ruling, 2026-09-15. Step 3 carries `payRise`; step 1 does not, so a person from
    // step 1 alone is valued at their base rate.
    const withRise = [{ name: 'Mary G', division: 'Admin', payRate: 19, payRise: [0, 0.05] }]
    const out = store.merge(withRise, [])
    expect(out[0].payRate).toBe(19.95)
    expect(out[0].basePayRate).toBe(19)
  })

  it('lays stored entries over the team, by key', () => {
    const out = store.merge(team, [{
      key: 'production|bruce|1', accruedLeaveDays: 16, yearsEmployed: 5, band: 'direct-loss'
    }])
    expect(out[1]).toEqual({
      key: 'production|bruce|1',
      name: 'Bruce',
      division: 'Production',
      payRate: 40.28,
      basePayRate: 40.28,
      accruedLeaveDays: 16,
      yearsEmployed: 5,
      band: 'direct-loss'
    })
  })

  it('🔴 keeps two people of the SAME NAME apart', () => {
    const twoButches = [
      { name: 'Butch', division: 'Production', payRate: 26 },
      { name: 'Butch', division: 'Production', payRate: 26 }
    ]
    const out = store.merge(twoButches, [{ key: 'production|butch|2', accruedLeaveDays: 9 }])
    expect(out[0].accruedLeaveDays).toBeNull()
    expect(out[1].accruedLeaveDays).toBe(9)
  })

  it('gives a person with no entry empty fields — somebody nobody has filled in yet', () => {
    const out = store.merge(team, [])
    expect(out[0].accruedLeaveDays).toBeNull()
    expect(out[0].band).toBeNull()
    expect(out[0].name).toBe('Mary G')
  })

  it('returns one row per person on the TEAM, in the team\'s own order', () => {
    // An entry for somebody no longer on the team does not appear. It is not deleted from
    // storage either — see the store's header for why.
    const out = store.merge(team, [{ key: 'admin|departed|1', accruedLeaveDays: 9 }])
    expect(out.map(r => r.name)).toEqual(['Mary G', 'Bruce'])
  })

  it('survives either side being absent', () => {
    expect(store.merge(null, null)).toEqual([])
    expect(store.merge(team, null)).toHaveLength(2)
  })
})
