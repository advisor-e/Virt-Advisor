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

// A temp file, never the developer's own data/ copy - set before the store loads (item 22.1).
process.env.CLIENT_REPORT_ACCESS_DEV_FILE = require('path').join(require('os').tmpdir(), `va-test-report-access-${process.pid}.json`)

const overlay = require('../../server/utils/firmOverlay')
const access = require('../../server/utils/clientReportAccess')
const { removeFile } = require('../helpers/removeFile')

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

describe('the no-database fallback — dev only, and never on a refusal', () => {
  const fs = require('fs')
  const path = require('path')
  const access2 = require('../../server/utils/clientReportAccess')
  const DEV_PATH = path.resolve(process.env.CLIENT_REPORT_ACCESS_DEV_FILE)

  /** A connection-level failure: mysql2 gives a `code` and NO `sqlState`. */
  function noServer () {
    const e = new Error('connect ECONNREFUSED 127.0.0.1:3306')
    e.code = 'ECONNREFUSED'
    return e
  }

  /** A live server that REFUSED the statement: always carries a `sqlState`. */
  function refused () {
    const e = new Error('Cannot add or update a child row')
    e.code = 'ER_NO_REFERENCED_ROW_2'
    e.sqlState = '23000'
    return e
  }

  afterEach(() => { try { removeFile(DEV_PATH) } catch (_e) { /* not written */ } })

  it('🔴 a read with no database answers "nothing open" instead of throwing', async () => {
    // This is the whole defect: it threw, the route turned it into a 500, and every report
    // page showed a red error under the client picker.
    overlay.loadFirmConfig.mockRejectedValue(noServer())
    await expect(access2.listForClient('firm-1', 'c-1')).resolves.toEqual({})
  })

  it('a state saved with no database is read back', async () => {
    overlay.loadFirmConfig.mockRejectedValue(noServer())
    overlay.saveFirmConfig.mockRejectedValue(noServer())
    await access2.setState('firm-1', 'c-1', '/volatility', 'open', 'adv@firm')
    const open = await access2.listForClient('firm-1', 'c-1')
    expect(open['/volatility'].state).toBe('open')
    // And another firm's table is not this one's.
    await expect(access2.listForClient('firm-2', 'c-1')).resolves.toEqual({})
  })

  it('🔴 A SERVER THAT REFUSED THE WRITE NEVER FALLS BACK', async () => {
    // A refused write must not land in a scratch file and be reported as a model opened to
    // a client who cannot actually see it.
    overlay.loadFirmConfig.mockResolvedValue(null)
    overlay.saveFirmConfig.mockRejectedValue(refused())
    await expect(access2.setState('firm-1', 'c-1', '/volatility', 'open', 'adv@firm')).rejects.toThrow(/child row/)
    expect(fs.existsSync(DEV_PATH)).toBe(false)
  })

  it('🔴 A SERVER THAT REFUSED THE READ NEVER FALLS BACK EITHER', async () => {
    overlay.loadFirmConfig.mockRejectedValue(refused())
    await expect(access2.listForClient('firm-1', 'c-1')).rejects.toThrow(/child row/)
  })
})
