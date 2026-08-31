'use strict'

/**
 * templateLibrary — the cascade-aware read side of the template library
 * (SEARCH-CONTENT-CASCADE-PLAN.md Phase 2, approved 2026-09-01).
 *
 * What UAT cannot see, and these tests must: which tier's library is in force.
 * A wrong winner looks like a perfectly plausible library on screen — the pages
 * render, the AI recommends — while a firm reads another tier's content or the
 * mentor's upload silently never reaches anyone. Every test here pins the
 * resolution order, the wholesale-replace ruling, or the fallback behaviour.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn()
}))

const fs = require('fs')
const overlay = require('../../server/utils/firmOverlay')
const tierChain = require('../../server/utils/tierChain')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { loadEffectiveTemplates, clearTemplateCache, TTL_MS } = require('../../server/utils/templateLibrary')

const FIRM_SET = [{ page: 'firm-1', title: 'Firm Page' }]
const PLATFORM_SET = [{ page: 'plat-1', title: 'Platform Page' }, { page: 'plat-2', title: 'Second' }]
const GROUP_SET = [{ page: 'grp-1', title: 'Group Page' }]

/** loadFirmConfig responder from a { scopeId: value } map; anything else → null. */
function storeHolds (byScope) {
  overlay.loadFirmConfig.mockImplementation((scopeId, key) => {
    if (key !== 'templates') { return Promise.resolve(null) }
    return Promise.resolve(Object.prototype.hasOwnProperty.call(byScope, scopeId) ? byScope[scopeId] : null)
  })
}

describe('templateLibrary.loadEffectiveTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearTemplateCache()
    tierChain.setFirmMembership({})
  })

  afterEach(() => {
    jest.useRealTimers()
    tierChain.setFirmMembership({})
  })

  describe('resolution order — nearest tier wins, whole', () => {
    it('a firm with its own upload gets exactly that set, never a blend (Mike, 2026-08-31)', async () => {
      storeHolds({ 'firm-a': FIRM_SET, [PLATFORM_SCOPE]: PLATFORM_SET })
      const result = await loadEffectiveTemplates('firm-a')
      expect(result).toEqual(FIRM_SET)
      expect(result).toHaveLength(1) // wholesale: the platform's 2 pages are NOT mixed in
    })

    it("the mentor's upload reaches a firm with no upload of its own", async () => {
      storeHolds({ [PLATFORM_SCOPE]: PLATFORM_SET })
      await expect(loadEffectiveTemplates('firm-b')).resolves.toEqual(PLATFORM_SET)
    })

    it('no upload at any tier → null, so the caller falls back to the committed seed', async () => {
      storeHolds({})
      await expect(loadEffectiveTemplates('firm-c')).resolves.toBeNull()
    })

    it('an EMPTY stored array is not an upload — the tier above still supplies the library', async () => {
      storeHolds({ 'firm-d': [], [PLATFORM_SCOPE]: PLATFORM_SET })
      await expect(loadEffectiveTemplates('firm-d')).resolves.toEqual(PLATFORM_SET)
    })

    it('no scope id resolves at the platform tier (the mentor sees their own upload)', async () => {
      storeHolds({ [PLATFORM_SCOPE]: PLATFORM_SET })
      await expect(loadEffectiveTemplates(null)).resolves.toEqual(PLATFORM_SET)
    })

    it('with membership known, a group upload beats the platform and loses to the firm', async () => {
      tierChain.setFirmMembership({ 'firm-e': { globalGroup: 'BrandX', country: 'AU' } })
      const groupScope = tierChain.groupScopeId('BrandX', 'AU')
      storeHolds({ [groupScope]: GROUP_SET, [PLATFORM_SCOPE]: PLATFORM_SET })
      await expect(loadEffectiveTemplates('firm-e')).resolves.toEqual(GROUP_SET)

      clearTemplateCache()
      storeHolds({ 'firm-e': FIRM_SET, [groupScope]: GROUP_SET, [PLATFORM_SCOPE]: PLATFORM_SET })
      await expect(loadEffectiveTemplates('firm-e')).resolves.toEqual(FIRM_SET)
    })
  })

  describe('the ~60-second cache', () => {
    it('a second read inside the TTL does not hit the store again', async () => {
      storeHolds({ [PLATFORM_SCOPE]: PLATFORM_SET })
      await loadEffectiveTemplates('firm-f')
      const callsAfterFirst = overlay.loadFirmConfig.mock.calls.length
      await loadEffectiveTemplates('firm-f')
      expect(overlay.loadFirmConfig.mock.calls.length).toBe(callsAfterFirst)
    })

    it('a read after the TTL hits the store again — an upload is live within a minute', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(0)
      storeHolds({ [PLATFORM_SCOPE]: PLATFORM_SET })
      await loadEffectiveTemplates('firm-g')
      const callsAfterFirst = overlay.loadFirmConfig.mock.calls.length
      jest.setSystemTime(TTL_MS + 1)
      await loadEffectiveTemplates('firm-g')
      expect(overlay.loadFirmConfig.mock.calls.length).toBeGreaterThan(callsAfterFirst)
    })

    it('clearTemplateCache makes the next read hit the store — uploads are live immediately here', async () => {
      storeHolds({ [PLATFORM_SCOPE]: PLATFORM_SET })
      await loadEffectiveTemplates('firm-h')
      const callsAfterFirst = overlay.loadFirmConfig.mock.calls.length
      clearTemplateCache()
      storeHolds({ [PLATFORM_SCOPE]: FIRM_SET })
      await expect(loadEffectiveTemplates('firm-h')).resolves.toEqual(FIRM_SET)
      expect(overlay.loadFirmConfig.mock.calls.length).toBeGreaterThan(callsAfterFirst)
    })

    it('a null result is cached too — a missing upload cannot hammer the store', async () => {
      storeHolds({})
      await loadEffectiveTemplates('firm-i')
      const callsAfterFirst = overlay.loadFirmConfig.mock.calls.length
      await loadEffectiveTemplates('firm-i')
      expect(overlay.loadFirmConfig.mock.calls.length).toBe(callsAfterFirst)
    })
  })

  describe('failure behaviour — loud, never silent', () => {
    const realNodeEnv = process.env.NODE_ENV

    afterEach(() => {
      process.env.NODE_ENV = realNodeEnv
    })

    it('store unreachable in production: logs loudly and serves the committed seed (null)', async () => {
      process.env.NODE_ENV = 'production'
      overlay.loadFirmConfig.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      try {
        await expect(loadEffectiveTemplates('firm-j')).resolves.toBeNull()
        expect(errSpy).toHaveBeenCalledWith(
          expect.stringContaining('store unreachable'),
          expect.stringContaining('ECONNREFUSED')
        )
      } finally {
        errSpy.mockRestore()
      }
    })

    it('outside production, a store fault falls back to the dev file, nearest tier first', async () => {
      process.env.NODE_ENV = 'test'
      overlay.loadFirmConfig.mockRejectedValue(new Error('no such table'))
      const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
        'firm-k': FIRM_SET,
        [PLATFORM_SCOPE]: PLATFORM_SET
      }))
      try {
        await expect(loadEffectiveTemplates('firm-k')).resolves.toEqual(FIRM_SET)
        clearTemplateCache()
        await expect(loadEffectiveTemplates('firm-l')).resolves.toEqual(PLATFORM_SET)
      } finally {
        readSpy.mockRestore()
      }
    })

    it('outside production with no dev file either, the answer is the committed seed (null)', async () => {
      process.env.NODE_ENV = 'test'
      overlay.loadFirmConfig.mockRejectedValue(new Error('no such table'))
      const readSpy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => { throw new Error('ENOENT') })
      try {
        await expect(loadEffectiveTemplates('firm-m')).resolves.toBeNull()
      } finally {
        readSpy.mockRestore()
      }
    })
  })
})
