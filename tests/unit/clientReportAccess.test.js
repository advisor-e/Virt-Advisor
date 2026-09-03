'use strict'

/**
 * The per-client switch table (design/features/business-entity-reports.md, D1/D5/D6,
 * approved by Mike 2026-09-03). This is a PERMISSION: what a client may open. The
 * properties pinned are the ones a person in UAT cannot see — hidden is the ABSENCE of a
 * row so a fresh client is closed by construction, a bad route or state is refused
 * rather than stored, and hiding deletes rather than writing "hidden".
 */
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const access = require('../../server/utils/clientReportAccess')

beforeEach(() => {
  overlay.loadFirmConfig.mockReset()
  overlay.saveFirmConfig.mockReset().mockResolvedValue({})
})

describe('clientReportAccess — reading', () => {
  it('a firm with no table has nothing open for anyone (D1: hidden by default)', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    expect(await access.listForClient('firm-1', 'client-a')).toEqual({})
    expect(await access.isOpen('firm-1', 'client-a', '/volatility')).toBe(false)
  })

  it('reads only rows in the open state, and only for the asked-for client', async () => {
    overlay.loadFirmConfig.mockResolvedValue({
      clients: {
        'client-a': { '/volatility': { state: 'open', by: 'adv@x', at: 't' }, '/quick-position': { state: 'weird' } },
        'client-b': { '/ebitda-dcf': { state: 'open', by: 'adv@x', at: 't' } }
      }
    })
    const a = await access.listForClient('firm-1', 'client-a')
    expect(Object.keys(a)).toEqual(['/volatility'])
    expect(await access.isOpen('firm-1', 'client-a', '/ebitda-dcf')).toBe(false)
    expect(await access.isOpen('firm-1', 'client-b', '/ebitda-dcf')).toBe(true)
  })

  it('survives a malformed stored table rather than throwing', async () => {
    overlay.loadFirmConfig.mockResolvedValue('not an object')
    expect(await access.listForClient('firm-1', 'client-a')).toEqual({})
    overlay.loadFirmConfig.mockResolvedValue({ clients: { 'client-a': 'nope' } })
    expect(await access.listForClient('firm-1', 'client-a')).toEqual({})
  })

  it('always reads under the config key, for the firm it was given', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    await access.listForClient('firm-9', 'c')
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith('firm-9', access.CONFIG_KEY)
  })
})

describe('clientReportAccess — writing', () => {
  it('opening writes a stamped row under the client and saves the whole table', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    const r = await access.setState('firm-1', 'client-a', '/volatility', 'open', 'adv@firm')
    expect(r).toEqual({ route: '/volatility', state: 'open' })
    const [firm, key, table, by] = overlay.saveFirmConfig.mock.calls[0]
    expect(firm).toBe('firm-1')
    expect(key).toBe(access.CONFIG_KEY)
    expect(by).toBe('adv@firm')
    expect(table.clients['client-a']['/volatility'].state).toBe('open')
    expect(table.clients['client-a']['/volatility'].by).toBe('adv@firm')
    expect(typeof table.clients['client-a']['/volatility'].at).toBe('string')
  })

  it('hiding DELETES the row — the table never fills with defaults', async () => {
    overlay.loadFirmConfig.mockResolvedValue({
      clients: { 'client-a': { '/volatility': { state: 'open' }, '/ebitda-dcf': { state: 'open' } } }
    })
    await access.setState('firm-1', 'client-a', '/volatility', 'hidden', 'adv@firm')
    const table = overlay.saveFirmConfig.mock.calls[0][2]
    expect(table.clients['client-a']).toEqual({ '/ebitda-dcf': { state: 'open' } })
  })

  it('hiding the last open model removes the client from the table entirely', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ clients: { 'client-a': { '/volatility': { state: 'open' } } } })
    await access.setState('firm-1', 'client-a', '/volatility', 'hidden', 'adv@firm')
    expect(overlay.saveFirmConfig.mock.calls[0][2].clients).toEqual({})
  })

  it('does not touch another client\'s rows', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ clients: { 'client-b': { '/volatility': { state: 'open' } } } })
    await access.setState('firm-1', 'client-a', '/quick-position', 'open', 'adv@firm')
    const table = overlay.saveFirmConfig.mock.calls[0][2]
    expect(table.clients['client-b']).toEqual({ '/volatility': { state: 'open' } })
    expect(Object.keys(table.clients['client-a'])).toEqual(['/quick-position'])
  })

  it.each([
    ['volatility', 'BAD_ROUTE'],
    ['/Volatility', 'BAD_ROUTE'],
    ['/a/b', 'BAD_ROUTE'],
    ['', 'BAD_ROUTE'],
    [undefined, 'BAD_ROUTE']
  ])('refuses the route %p as %s and writes nothing', async (route, code) => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    await expect(access.setState('firm-1', 'client-a', route, 'open', 'x')).rejects.toMatchObject({ code })
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it.each(['visible', 'OPEN', '', undefined])('refuses the state %p and writes nothing', async (state) => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    await expect(access.setState('firm-1', 'client-a', '/volatility', state, 'x')).rejects.toMatchObject({ code: 'BAD_STATE' })
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})
