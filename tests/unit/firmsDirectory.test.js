'use strict'

// The list of firms — the first and only backend read of the `firms` table.
//
// TWO THINGS MAKE THIS FILE WORTH HAVING. The reserved `__platform__` row is not a
// firm and must never be counted as one; and the table may not be ours at all, since
// config/db-schema.sql invites the Advisor-e team to point the foreign keys at their
// own. Both are properties that only show up in production, so they are pinned here.

const fs = require('fs')
const path = require('path')

jest.mock('../../server/utils/db', () => ({ execute: jest.fn() }))

const db = require('../../server/utils/db')
const { listFirms, DEV_FIRMS_FILE } = require('../../server/utils/firmsDirectory')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const read = rel => fs.readFileSync(path.resolve(__dirname, '../../', rel), 'utf8')

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

describe('the reserved platform row is not a firm', () => {
  test('it is excluded IN SQL, so no caller can forget', async () => {
    // In SQL rather than in JavaScript, deliberately: the row then never crosses the
    // wire, and a future caller cannot reintroduce it by skipping a filter.
    db.execute.mockResolvedValue([[]])

    await listFirms()

    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toMatch(/WHERE id <> \?/)
    expect(params).toEqual([PLATFORM_SCOPE])
  })

  test('and the dev fallback excludes it too — the two paths must agree', async () => {
    // The failure this guards: an exclusion that lives only in SQL is absent from
    // every developer machine, so the mentor's own shelf would read as a firm in the
    // one environment anybody actually looks at.
    db.execute.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify([
      { id: 'firm-a', name: 'A' },
      { id: PLATFORM_SCOPE, name: 'Platform (mentor)' }
    ]))

    const firms = await listFirms()

    expect(firms.map(f => f.id)).toEqual(['firm-a'])
  })

  test('the source names the reason, not just the constant', () => {
    // A bare `WHERE id <> ?` invites a later reader to "tidy" it. The comment is the
    // only thing that says why, and this is the same tripwire pattern used on the
    // db-schema seed instruction.
    const src = read('server/utils/firmsDirectory.js')
    expect(src).toMatch(/NOT A FIRM/i)
  })
})

describe('listFirms', () => {
  test('returns id and name, and nothing else', async () => {
    // A whitelist, not a passthrough: the firms table carries a logo url, a colour
    // and a persona name, none of which this read has any business publishing.
    db.execute.mockResolvedValue([[
      { id: 'firm-a', name: 'Hartley & Vine', logo_url: 'http://x/y.png', primary_colour: '#123456' }
    ]])

    const firms = await listFirms()

    expect(firms).toEqual([{ id: 'firm-a', name: 'Hartley & Vine' }])
  })

  test('a firm with no name comes back as null rather than an empty string', async () => {
    // The caller distinguishes "we have a name" from "we do not" to decide whether to
    // print an id as a name. An empty string would read as a name we have.
    db.execute.mockResolvedValue([[{ id: 'firm-a', name: null }]])

    expect(await listFirms()).toEqual([{ id: 'firm-a', name: null }])
  })

  test('a row with no id is dropped rather than published as an empty firm', async () => {
    db.execute.mockResolvedValue([[{ id: null, name: 'Ghost' }, { id: 'firm-a', name: 'A' }]])

    expect(await listFirms()).toEqual([{ id: 'firm-a', name: 'A' }])
  })
})

describe('when the table cannot be read', () => {
  test('development falls back to the dev file, so the page is testable at all', async () => {
    db.execute.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
      firms: [{ id: 'firm-dev', name: 'Dev Firm' }]
    }))

    expect(await listFirms()).toEqual([{ id: 'firm-dev', name: 'Dev Firm' }])
  })

  test('a missing dev file is a developer who has not set one up, not a fault', async () => {
    db.execute.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e
    })

    expect(await listFirms()).toEqual([])
  })

  test('PRODUCTION REJECTS — it never reads a stand-in file', async () => {
    // A stray dev file on a production box must not be able to define the platform's
    // firm list, and an outage must not be dressed up as "there are no firms".
    jest.resetModules()
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      jest.doMock('../../server/utils/db', () => ({ execute: jest.fn(() => Promise.reject(new Error('no db'))) }))
      const prod = require('../../server/utils/firmsDirectory')
      const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('[]')

      await expect(prod.listFirms()).rejects.toThrow('no db')
      // Asserted against the PATH rather than "not called at all": jest itself reads
      // source files to build the code frame for an assertion, so a bare
      // not.toHaveBeenCalled() here fails for reasons that have nothing to do with
      // the property — which is that the stand-in file is never opened.
      const opened = readSpy.mock.calls.map(c => String(c[0]))
      expect(opened.some(p => p.includes('dev-firms'))).toBe(false)
    } finally {
      process.env.NODE_ENV = prevEnv
      jest.resetModules()
    }
  })

  test('the dev file path is overridable, so tests are hermetic', () => {
    expect(DEV_FIRMS_FILE).toMatch(/dev-firms\.json$/)
  })
})

describe('nothing else in the backend queries the firms table', () => {
  test('this module is the single choke point', () => {
    // The claim in the module header, asserted rather than trusted. A second query
    // elsewhere would be a second place to forget the platform-row exclusion — the
    // same reasoning that makes listFirmIdsWithConfigKey a single choke point.
    const files = []
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) { walk(full) } else if (entry.name.endsWith('.js')) { files.push(full) }
      }
    }
    walk(path.resolve(__dirname, '../../server'))

    // Comments are stripped first. Without that this matches English — the phrase
    // "separate from firms' own rows" in platformDistinctions.js reads as SQL to a
    // regex, and the test would fail on a file that queries nothing.
    const stripComments = src => src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')

    const offenders = files.filter((f) => {
      if (f.endsWith('firmsDirectory.js')) { return false }
      return /\bFROM\s+`?firms`?\b|\bJOIN\s+`?firms`?\b/i.test(stripComments(fs.readFileSync(f, 'utf8')))
    })

    expect(offenders).toEqual([])
  })
})
