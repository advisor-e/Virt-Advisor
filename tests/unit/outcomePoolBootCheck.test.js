'use strict'

/**
 * The boot check that WARNS when firms share outcomes and no OUTCOME_POOL_SECRET is set
 * (item 4.97 US6, T041/T043; contracts §Boot check).
 *
 * 🔴 IT WARNS AND THE SERVER STARTS — Mike's ruling of 2026-09-15, which replaced the
 * refusal this file used to pin: "always give warning but let the user continue", and for
 * this feature specifically, "can the app still function elsewhere and just THAT FUNCTION
 * shut down with a notification / warning so the rest can still be used?"
 *
 * 🔴 WHAT UAT CANNOT SEE, AND WHY THIS IS STILL AT 100%. Without the secret, `firmToken`
 * throws and nothing is pooled — the server runs, every screen looks normal, and a firm that
 * signed a consent quietly contributes nothing. There is no error on any page, because from
 * the app's point of view nothing went wrong. A tester would have to know the pool should
 * have grown and notice that it did not. The silence is the fault; the warning is the fix.
 * The DATA was never at risk either way — a pooled row cannot be addressed without the
 * secret — which is why warning is enough and refusing to boot was too much.
 *
 * The second rule is the one that is easy to get backwards: THE CHECK MUST NOT MAKE BOOT
 * DEPEND ON THE STORE. A database that cannot be reached at startup must not stop the app
 * — that would trade a silent fault for a much louder one, and the pool is not what the
 * app is for. So a store error resolves, warning that it could not check rather than
 * claiming the feature is off — an unreadable store is not evidence that anyone shares.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  listFirmIdsWithConfigKey: jest.fn(),
  loadFirmConfig: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const { CONFIG_KEY } = require('../../server/utils/outcomeConsent')
const { assertPoolSecretIfConsented } = require('../../server/utils/outcomePoolBootCheck')

const originalSecret = process.env.OUTCOME_POOL_SECRET
const originalEnv = process.env.NODE_ENV

/** A stored consent record, on or off. */
const consent = on => ({ on, setBy: 'manager@firm.example', setAt: '2026-09-01T00:00:00Z' })

/** Every firm in `ids` holds a consent record; `onIds` are the ones actually sharing. */
function firms (ids, onIds) {
  overlay.listFirmIdsWithConfigKey.mockResolvedValue(ids)
  overlay.loadFirmConfig.mockImplementation((firmId, key) => {
    if (key !== CONFIG_KEY) { return Promise.resolve(null) }
    return Promise.resolve(consent(onIds.includes(firmId)))
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  // The check is skipped under `test`, so every case here sets a non-test env on purpose.
  process.env.NODE_ENV = 'production'
  process.env.OUTCOME_POOL_SECRET = 'a-real-secret'
  overlay.listFirmIdsWithConfigKey.mockResolvedValue([])
  overlay.loadFirmConfig.mockResolvedValue(null)
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  console.error.mockRestore()
  console.warn.mockRestore()
  if (originalSecret === undefined) { delete process.env.OUTCOME_POOL_SECRET } else { process.env.OUTCOME_POOL_SECRET = originalSecret }
  if (originalEnv === undefined) { delete process.env.NODE_ENV } else { process.env.NODE_ENV = originalEnv }
})

describe('a firm shares and the secret is missing — the one case this exists for', () => {
  test('warns, names how many firms share, never names a firm, and NEVER rejects', async () => {
    delete process.env.OUTCOME_POOL_SECRET
    firms(['firm-a', 'firm-b', 'firm-c'], ['firm-a', 'firm-c'])

    const result = await assertPoolSecretIfConsented()
    expect(result).toEqual({ ok: false, sharing: 2 })

    // The count is the whole message: it tells whoever reads the log that real consents
    // are affected. A firm id in a startup log is an identifier in a place nobody guards.
    const logged = JSON.stringify(console.warn.mock.calls)
    expect(logged).toContain('2 firm(s)')
    expect(logged).not.toContain('firm-a')
    expect(logged).not.toContain('firm-c')
  })

  // The half of the ruling that is easy to lose: the app must still run. A regression here
  // would take every other feature down with the one that is off.
  test('the server is never stopped — the promise resolves', async () => {
    delete process.env.OUTCOME_POOL_SECRET
    firms(['firm-a'], ['firm-a'])
    await expect(assertPoolSecretIfConsented()).resolves.toBeDefined()
  })

  test('the warning says the feature is off and that nothing else is affected', async () => {
    delete process.env.OUTCOME_POOL_SECRET
    firms(['firm-a'], ['firm-a'])
    await assertPoolSecretIfConsented()
    const logged = JSON.stringify(console.warn.mock.calls)
    expect(logged).toMatch(/SWITCHED OFF/)
    expect(logged).toMatch(/No other feature is affected/)
  })

  test('an empty-string secret counts as missing, not as a secret', async () => {
    process.env.OUTCOME_POOL_SECRET = ''
    firms(['firm-a'], ['firm-a'])
    await expect(assertPoolSecretIfConsented()).resolves.toEqual({ ok: false, sharing: 1 })
  })
})

describe('the cases that must NOT stop the server', () => {
  test('no firm shares and no secret is set — a plain development machine starts', async () => {
    delete process.env.OUTCOME_POOL_SECRET
    firms(['firm-a', 'firm-b'], [])
    await expect(assertPoolSecretIfConsented()).resolves.toEqual({ ok: true, sharing: 0 })
    expect(console.warn).not.toHaveBeenCalled()
  })

  test('a firm shares and the secret is set — the ordinary production case', async () => {
    firms(['firm-a'], ['firm-a'])
    await expect(assertPoolSecretIfConsented()).resolves.toEqual({ ok: true, sharing: 0 })
    expect(console.warn).not.toHaveBeenCalled()
  })

  // Reading consent costs a query per firm. With a secret there is nothing to decide, so
  // the check must not make every boot pay for an answer it cannot act on.
  test('with the secret set, consent is never read at all', async () => {
    firms(['firm-a', 'firm-b'], ['firm-a'])
    await assertPoolSecretIfConsented()
    expect(overlay.listFirmIdsWithConfigKey).not.toHaveBeenCalled()
    expect(overlay.loadFirmConfig).not.toHaveBeenCalled()
  })

  test('under NODE_ENV=test it is skipped outright, secret or not', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.OUTCOME_POOL_SECRET
    firms(['firm-a'], ['firm-a'])
    await expect(assertPoolSecretIfConsented()).resolves.toEqual({ ok: true, sharing: 0 })
    expect(overlay.listFirmIdsWithConfigKey).not.toHaveBeenCalled()
  })

  // 🔴 The rule that is easy to get backwards. A store that cannot be reached is not
  // evidence that a firm shares, and boot must not depend on the pool store being up.
  test('a store failure resolves with a warning — boot never depends on the store', async () => {
    delete process.env.OUTCOME_POOL_SECRET
    overlay.listFirmIdsWithConfigKey.mockRejectedValue(new Error('ECONNREFUSED 10.0.0.1:3306'))
    await expect(assertPoolSecretIfConsented()).resolves.toEqual({ ok: true, sharing: 0 })
    expect(console.warn).toHaveBeenCalled()
    expect(JSON.stringify(console.warn.mock.calls)).not.toContain('10.0.0.1')
  })

  test('one firm whose consent cannot be read is skipped, and the others still decide', async () => {
    delete process.env.OUTCOME_POOL_SECRET
    overlay.listFirmIdsWithConfigKey.mockResolvedValue(['broken', 'sharing'])
    overlay.loadFirmConfig.mockImplementation((firmId) => {
      if (firmId === 'broken') { return Promise.reject(new Error('row unreadable')) }
      return Promise.resolve(consent(true))
    })
    const result = await assertPoolSecretIfConsented()
    expect(result).toEqual({ ok: false, sharing: 1 })
    expect(JSON.stringify(console.warn.mock.calls)).toContain('1 firm(s)')
  })

  test('a malformed consent record is not a sharing firm', async () => {
    delete process.env.OUTCOME_POOL_SECRET
    overlay.listFirmIdsWithConfigKey.mockResolvedValue(['firm-a'])
    overlay.loadFirmConfig.mockResolvedValue({ on: 'yes' })
    await expect(assertPoolSecretIfConsented()).resolves.toEqual({ ok: true, sharing: 0 })
  })
})
