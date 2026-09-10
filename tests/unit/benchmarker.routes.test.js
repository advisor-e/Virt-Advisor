'use strict'

/**
 * The benchmarker's routes (item 4.70 stage 3). What UAT cannot see: an upload stored
 * under the wrong scope, a half-read pair of files stored anyway, a live database refusal
 * swallowed as "no database here", or the finder answering from the wrong release.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))
jest.mock('formidable', () => ({ formidable: jest.fn() }))

const fs = require('fs')
const path = require('path')
const { formidable } = require('formidable')
const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/benchmarker')
const { CONFIG_KEY, PLATFORM_SCOPE, BASE_BENCHMARKER } = require('../../server/utils/benchmarkerStore')

const FIX = path.join(__dirname, '../fixtures/statsnz')

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}
const errorBody = res => (typeof res._body === 'string' ? JSON.parse(res._body) : res._body)

/** A live MySQL refusal — carries a sqlState, so the dev fallback must NOT run. */
function dbRefusal () { const e = new Error('refused'); e.sqlState = '42000'; return e }

/** Make formidable hand back these files. */
function uploadOf (files) {
  formidable.mockReturnValue({ parse: (req, cb) => cb(null, {}, files) })
}
const file = name => ({ filepath: path.join(FIX, name) })

beforeEach(() => { jest.clearAllMocks(); overlay.loadFirmConfig.mockResolvedValue(null) })

describe('the mentor\'s upload', () => {
  test('🔴 STORES THE DATASET AT THE PLATFORM SCOPE, never the caller\'s firm', async () => {
    uploadOf({ ratios: file('benchmark_ratios-excerpt.csv'), financial: file('financial-excerpt.csv') })
    overlay.saveFirmConfig.mockResolvedValue({ version: 2 })
    const res = makeMockRes()
    await routes.upload({ firmId: 'firm-1', userEmail: 'mentor@x' }, res)
    expect(res._status).toBe(200)
    expect(res._body.saved).toBe(true)
    expect(res._body.dataset.counts.withBenchmarks).toBe(2)
    const [scope, key, value, by] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(PLATFORM_SCOPE)
    expect(key).toBe(CONFIG_KEY)
    expect(value.industries.H451100.ratios.currentRatio.small.median).toBe(0.35)
    expect(by).toBe('mentor@x')
  })

  test('one file alone stores nothing', async () => {
    uploadOf({ ratios: file('benchmark_ratios-excerpt.csv') })
    const res = makeMockRes()
    await routes.upload({ firmId: 'firm-1' }, res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('TWO_FILES_REQUIRED')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('🔴 A FILE MISSING A COLUMN IS REFUSED BY NAME, and nothing is stored', async () => {
    const broken = path.join(FIX, 'broken.csv')
    fs.writeFileSync(broken, fs.readFileSync(path.join(FIX, 'benchmark_ratios-excerpt.csv'), 'utf8').replace('Value_median', 'Median'))
    try {
      uploadOf({ ratios: { filepath: broken }, financial: file('financial-excerpt.csv') })
      const res = makeMockRes()
      await routes.upload({ firmId: 'firm-1' }, res)
      expect(res._status).toBe(400)
      expect(errorBody(res).error.code).toBe('BENCHMARKER_REJECTED')
      expect(errorBody(res).error.message).toMatch(/Value_median/)
      expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
    } finally { fs.unlinkSync(broken) }
  })

  test('a live database refusal is a 500, not a silent dev-file save', async () => {
    uploadOf({ ratios: file('benchmark_ratios-excerpt.csv'), financial: file('financial-excerpt.csv') })
    overlay.saveFirmConfig.mockRejectedValue(dbRefusal())
    const res = makeMockRes()
    await routes.upload({ firmId: 'firm-1' }, res)
    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
  })

  test('an unreadable upload is refused before anything is parsed', async () => {
    formidable.mockReturnValue({ parse: (req, cb) => cb(new Error('too big')) })
    const res = makeMockRes()
    await routes.upload({ firmId: 'firm-1' }, res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('UPLOAD_REJECTED')
  })
})

describe('what is in force', () => {
  test('the summary is the shipped release until a mentor uploads one', async () => {
    const res = makeMockRes()
    await routes.summary({ firmId: 'firm-1' }, res)
    expect(res._status).toBe(200)
    expect(res._body.uploaded).toBe(false)
    expect(res._body.dataset.year).toBe(BASE_BENCHMARKER.year)
    expect(res._body.dataset.industries).toBeUndefined()
  })

  test('an uploaded release answers the finder, and is read from the platform scope', async () => {
    const uploaded = Object.assign({}, BASE_BENCHMARKER, { year: 2026 })
    overlay.loadFirmConfig.mockResolvedValue(uploaded)
    const res = makeMockRes()
    await routes.industries({ firmId: 'firm-1', query: { q: 'cafes' } }, res)
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith(PLATFORM_SCOPE, CONFIG_KEY)
    expect(res._body.year).toBe(2026)
    expect(res._body.matches[0].code).toBe('H451100')
  })
})

describe('the release history', () => {
  test('history and restore work at the platform scope, never the caller\'s firm', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 7, version: 2 }])
    let res = makeMockRes()
    await routes.history({ firmId: 'firm-1' }, res)
    expect(overlay.getVersionHistory).toHaveBeenCalledWith(PLATFORM_SCOPE, CONFIG_KEY)
    expect(res._body.history[0].id).toBe(7)
    overlay.restoreVersion.mockResolvedValue()
    res = makeMockRes()
    await routes.restore({ firmId: 'firm-1', body: { versionId: '7' } }, res)
    expect(overlay.restoreVersion).toHaveBeenCalledWith(PLATFORM_SCOPE, CONFIG_KEY, 7)
    expect(res._body.restored).toBe(true)
    expect(res._body.dataset.year).toBe(BASE_BENCHMARKER.year)
  })

  test('a restore without a version is refused', async () => {
    const res = makeMockRes()
    await routes.restore({ firmId: 'firm-1', body: {} }, res)
    expect(res._status).toBe(400)
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })
})

describe('the finder and the industry', () => {
  test('a short query answers nothing; a name answers the best matches with their status', async () => {
    let res = makeMockRes()
    await routes.industries({ query: { q: 'k' } }, res)
    expect(res._body.matches).toEqual([])
    res = makeMockRes()
    await routes.industries({ query: { q: 'kitchen' } }, res)
    expect(res._body.matches.map(m => m.code)).toContain('F373300')
    expect(res._body.matches.find(m => m.code === 'F373300').benchmarks).toBe(false)
  })

  test('an industry carries its bands and counts but not its ratio table; an unknown code is 404', async () => {
    let res = makeMockRes()
    await routes.industry({ params: { code: 'h451100' } }, res)
    expect(res._status).toBe(200)
    expect(res._body.industry.bands.small).toEqual({ min: 249001, max: 506000 })
    expect(res._body.industry.ratios).toBeUndefined()
    expect(res._body.bands).toEqual(['micro', 'small', 'medium', 'large'])
    res = makeMockRes()
    await routes.industry({ params: { code: 'nope' } }, res)
    expect(res._status).toBe(404)
  })
})
