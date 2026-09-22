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
const { listFirms, firmBrand, assertColumnName, DEV_FIRMS_FILE } = require('../../server/utils/firmsDirectory')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { FIRM_BRAND } = require('../../config/integration')

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

// ── Firm branding — the stub connection to Advisor-e's firm profile (item 16) ──
//
// THESE EARN THEIR PLACE BECAUSE UAT CANNOT SEE ANY OF IT. A tester looking at a
// client's document sees a logo and a coloured border, or sees the initials disc,
// and both look correct. What they cannot see is a column name interpolated into
// SQL, or a colour string that is not a colour reaching an SVG fill attribute.
//
// The column names are Advisor-e's and unknown until they answer Q-FIRM-BRAND, so
// they are configuration rather than code — which is exactly why the validation
// below exists. Mike's ruling, 2026-09-22.

describe('assertColumnName — the one place a configured value reaches SQL unbound', () => {
  test.each([
    ['logo_url'],
    ['brandColour'],
    ['_private'],
    ['col2']
  ])('accepts the plain identifier %s', (name) => {
    expect(assertColumnName(name, 'logoColumn')).toBe(name)
  })

  test.each([
    ['logo_url, (SELECT password FROM users)', 'a second column smuggled in'],
    ['logo_url; DROP TABLE firms', 'a statement terminator'],
    ['logo_url--', 'a comment opener'],
    ['`logo_url`', 'backquotes'],
    ['logo url', 'a space'],
    ['1logo', 'a leading digit'],
    ['', 'an empty string'],
    ['x'.repeat(65), 'a name longer than any real column']
  ])('REFUSES %s (%s)', (name) => {
    expect(() => assertColumnName(name, 'logoColumn')).toThrow(/not a plain column name/)
  })

  test('the error names which setting is wrong, so the fix is obvious', () => {
    // A generic "bad column" leaves someone opening a 340-line config to find it.
    expect(() => assertColumnName('a b', 'colourColumn')).toThrow(/FIRM_BRAND\.colourColumn/)
  })
})

describe('firmBrand', () => {
  const restore = { logo: FIRM_BRAND.logoColumn, colour: FIRM_BRAND.colourColumn }

  afterEach(() => {
    FIRM_BRAND.logoColumn = restore.logo
    FIRM_BRAND.colourColumn = restore.colour
  })

  test('THE SHIPPED STATE: no columns configured, so no brand SQL is built', async () => {
    // Nothing waits on the master team to boot. This is the state the app ships in
    // and the one that must never throw.
    FIRM_BRAND.logoColumn = null
    FIRM_BRAND.colourColumn = null
    db.execute.mockResolvedValue([[{ id: 'firm-a', name: 'Hartley & Co' }]])

    const brand = await firmBrand('firm-a')

    const [sql] = db.execute.mock.calls[0]
    expect(sql).toBe('SELECT id, name FROM firms WHERE id = ? LIMIT 1')
    expect(brand).toEqual({ id: 'firm-a', name: 'Hartley & Co', logo: null, colour: null })
  })

  test('once the master team answers, both columns are selected', async () => {
    FIRM_BRAND.logoColumn = 'logo_url'
    FIRM_BRAND.colourColumn = 'brand_colour'
    db.execute.mockResolvedValue([[
      { id: 'firm-a', name: 'Hartley & Co', logo_url: 'https://cdn/x.png', brand_colour: '#0070c0' }
    ]])

    const brand = await firmBrand('firm-a')

    expect(db.execute.mock.calls[0][0]).toContain('logo_url, brand_colour')
    expect(brand).toEqual({
      id: 'firm-a', name: 'Hartley & Co', logo: 'https://cdn/x.png', colour: '#0070c0'
    })
  })

  test('one column alone is a valid answer — they need not send both', async () => {
    FIRM_BRAND.logoColumn = null
    FIRM_BRAND.colourColumn = 'brand_colour'
    db.execute.mockResolvedValue([[{ id: 'firm-a', name: 'A', brand_colour: '#abc' }]])

    const brand = await firmBrand('firm-a')

    expect(db.execute.mock.calls[0][0]).toBe('SELECT id, name, brand_colour FROM firms WHERE id = ? LIMIT 1')
    expect(brand.colour).toBe('#abc')
    expect(brand.logo).toBeNull()
  })

  test('the firm id is BOUND, never interpolated', async () => {
    db.execute.mockResolvedValue([[]])

    await firmBrand('firm-a\' OR \'1\'=\'1')

    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toContain('WHERE id = ?')
    expect(params).toEqual(['firm-a\' OR \'1\'=\'1'])
  })

  test('the reserved platform row has no brand and is never queried', async () => {
    // Advisor-e's own shelf is not a firm, so it can never supply a client document
    // with a logo. Same rule as listFirms, enforced before the read rather than after.
    expect(await firmBrand(PLATFORM_SCOPE)).toBeNull()
    expect(db.execute).not.toHaveBeenCalled()
  })

  test.each([[''], [null], [undefined]])('an empty firm id (%s) reads nothing', async (id) => {
    expect(await firmBrand(id)).toBeNull()
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('an unknown firm is null, not an empty brand', async () => {
    db.execute.mockResolvedValue([[]])
    expect(await firmBrand('nobody')).toBeNull()
  })
})

describe('a brand value is never trusted as read', () => {
  const restore = { logo: FIRM_BRAND.logoColumn, colour: FIRM_BRAND.colourColumn }

  beforeEach(() => {
    FIRM_BRAND.logoColumn = 'logo_url'
    FIRM_BRAND.colourColumn = 'brand_colour'
  })

  afterEach(() => {
    FIRM_BRAND.logoColumn = restore.logo
    FIRM_BRAND.colourColumn = restore.colour
  })

  // THE COLOUR REACHES AN SVG `fill` ATTRIBUTE AND THE LOGO REACHES AN `<image>`
  // HREF. Advisor-e owns this data and we merely display it, which is precisely the
  // case CLAUDE.md's "never trust external data as structured data" rule covers. A
  // rejected value resolves to null and the drawing falls back to the initials disc
  // — it never renders something that is not a colour or not an image URL.

  test.each([
    ['#0070c0', '#0070c0', 'six-digit hex'],
    ['#abc', '#abc', 'three-digit hex'],
    ['  #0070c0  ', '#0070c0', 'hex with stray whitespace'],
    ['red', null, 'a colour keyword, which is not the agreed format'],
    ['#0070c0" onload="alert(1)', null, 'an attribute break-out'],
    ['url(#x)', null, 'an SVG reference'],
    ['javascript:alert(1)', null, 'a script URL'],
    ['#12345', null, 'a hex of the wrong length'],
    ['#gggggg', null, 'non-hex characters'],
    ['', null, 'an empty string']
  ])('colour %s resolves to %s (%s)', async (stored, expected) => {
    db.execute.mockResolvedValue([[{ id: 'f', name: 'F', brand_colour: stored }]])
    expect((await firmBrand('f')).colour).toBe(expected)
  })

  test.each([
    ['https://cdn.advisor-e.com/l.png', 'https://cdn.advisor-e.com/l.png', 'https'],
    ['http://cdn/l.png', 'http://cdn/l.png', 'http'],
    ['javascript:alert(1)', null, 'a script URL'],
    ['data:image/svg+xml,<svg onload="alert(1)"/>', null, 'an inline data URI carrying script'],
    ['/relative/l.png', null, 'a relative path, which would resolve against OUR host'],
    ['', null, 'an empty string']
  ])('logo %s resolves to %s (%s)', async (stored, expected) => {
    db.execute.mockResolvedValue([[{ id: 'f', name: 'F', logo_url: stored }]])
    expect((await firmBrand('f')).logo).toBe(expected)
  })

  test.each([[42], [{}], [true]])('a non-string value (%s) resolves to null rather than rendering', async (stored) => {
    db.execute.mockResolvedValue([[{ id: 'f', name: 'F', brand_colour: stored, logo_url: stored }]])
    const brand = await firmBrand('f')
    expect(brand.colour).toBeNull()
    expect(brand.logo).toBeNull()
  })
})

describe('firm branding in development', () => {
  test('the dev file supplies logo and colour with NO column names configured', async () => {
    // The real column names are unknown until Advisor-e answers, so a developer must
    // be able to see a branded document without them. The dev path reads the plain
    // `logo` and `colour` keys instead.
    db.execute.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify([
      { id: 'firm-dev', name: 'Dev Firm', logo: 'https://cdn/dev.png', colour: '#7a4b8f' }
    ]))

    expect(await firmBrand('firm-dev')).toEqual({
      id: 'firm-dev', name: 'Dev Firm', logo: 'https://cdn/dev.png', colour: '#7a4b8f'
    })
  })

  test('AND THE FORMAT CHECKS ARE THE SAME ON BOTH PATHS', async () => {
    // The failure this guards: validation that lives only on the production read is
    // absent from the one environment anybody actually looks at, so a bad value
    // renders fine locally and is only caught by a client.
    db.execute.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify([
      { id: 'firm-dev', name: 'Dev Firm', logo: 'javascript:alert(1)', colour: 'red' }
    ]))

    const brand = await firmBrand('firm-dev')
    expect(brand.logo).toBeNull()
    expect(brand.colour).toBeNull()
  })

  test('the platform row is excluded from the dev file too', async () => {
    db.execute.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify([
      { id: PLATFORM_SCOPE, name: 'Platform', colour: '#000000' }
    ]))

    expect(await firmBrand(PLATFORM_SCOPE)).toBeNull()
  })

  test('a missing dev file gives no brand rather than throwing', async () => {
    db.execute.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e
    })

    expect(await firmBrand('firm-dev')).toBeNull()
  })

  test('PRODUCTION REJECTS — a client document never brands itself from a stray dev file', async () => {
    jest.resetModules()
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      jest.doMock('../../server/utils/db', () => ({ execute: jest.fn(() => Promise.reject(new Error('no db'))) }))
      const prod = require('../../server/utils/firmsDirectory')

      await expect(prod.firmBrand('firm-a')).rejects.toThrow('no db')
    } finally {
      process.env.NODE_ENV = prevEnv
      jest.resetModules()
    }
  })
})
