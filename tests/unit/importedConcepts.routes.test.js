'use strict'

/**
 * Add Concept's routes — item 15.20, `design/mockups/add-concept.html`.
 *
 * WHAT UAT CANNOT SEE: that a file which is not a PDF, or is too large, is stored anyway; that a
 * refused upload leaves a firm's PDF behind in a temporary folder; that a drawing the browser
 * sends back is what reaches a client; that a scope named in a request is obeyed; that a tier
 * can remove what the tier above added; that a failed save leaves the PDFs with nothing pointing
 * at them; that a removed concept's id is handed out again; or that a database fault leaks its
 * text. The overlay is an in-memory stand-in and the converter a stub; formidable is mocked with
 * real temporary files, so the route's own reads, checks and deletions all run for real.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn(),
  deleteFirmConfigsByPrefix: jest.fn()
}))
jest.mock('formidable', () => ({ formidable: jest.fn() }))
jest.mock('../../server/utils/pdfConvert', () => {
  const actual = jest.requireActual('../../server/utils/pdfConvert')
  return Object.assign({}, actual, { convertPdf: jest.fn() })
})
jest.mock('../../server/utils/conceptSourceStore', () => ({
  saveSources: jest.fn(),
  removeForConcept: jest.fn()
}))

const os = require('os')
const fs = require('fs')
const path = require('path')
const { formidable } = require('formidable')
const overlay = require('../../server/utils/firmOverlay')
const { convertPdf, PdfConvertError, FAILURES } = require('../../server/utils/pdfConvert')
const sources = require('../../server/utils/conceptSourceStore')
const routes = require('../../server/routes/importedConcepts')
const ic = require('../../server/utils/importedConcepts')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const FIRM = 'firm-a'
const PDF = '%PDF-1.4 test'
let db
let temps

function makeRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

const codeOf = res => res._body && res._body.error && res._body.error.code

function tempFile (content, name) {
  const filepath = path.join(os.tmpdir(), 'ic-test-' + Math.random().toString(16).slice(2) + '.pdf')
  fs.writeFileSync(filepath, content)
  temps.push(filepath)
  return { filepath, originalFilename: name || 'page.pdf' }
}

function upload (fields, files) {
  formidable.mockReturnValue({ parse (req, cb) { cb(null, fields, files) } })
}

async function call (handler, over) {
  const res = makeRes()
  await handler(Object.assign({ firmId: FIRM, userEmail: 'm@firm.example', body: {}, query: {} }, over), res)
  return res
}

function page (n, svg) {
  return { number: n, width: 960, height: 540, svg: svg || '<svg>page ' + n + '</svg>', title: 'Page ' + n, text: [], droppedImages: 0 }
}

const BOXES = [{ label: 'Our core values', x: 0.06, y: 0.24, w: 0.4, h: 0.28 }]

function saveFields (over) {
  return Object.assign({
    name: 'Our Client Charter',
    planningDomain: 'organisational-review',
    helpsClientTo: '',
    boxes: JSON.stringify(BOXES)
  }, over)
}

function validSave (fieldOver) {
  upload(saveFields(fieldOver), { teaching: [tempFile(PDF, 'teach.pdf')], response: tempFile(PDF, 'response.pdf') })
}

const stillOnDisk = () => temps.filter(f => fs.existsSync(f))

beforeEach(() => {
  jest.clearAllMocks()
  db = {}
  temps = []
  const own = scope => db[scope] || (db[scope] = {})
  overlay.loadFirmConfig.mockImplementation((scope, key) => Promise.resolve(own(scope)[key] || null))
  overlay.saveFirmConfig.mockImplementation((scope, key, value) => { own(scope)[key] = value; return Promise.resolve() })
  overlay.loadFirmConfigsByPrefix.mockImplementation((scope, prefix) => {
    const out = {}
    Object.keys(own(scope)).forEach((k) => { if (k.indexOf(prefix) === 0) { out[k.slice(prefix.length)] = own(scope)[k] } })
    return Promise.resolve(out)
  })
  overlay.deleteFirmConfigsByPrefix.mockImplementation((scope, prefix) => {
    Object.keys(own(scope)).forEach((k) => { if (k.indexOf(prefix) === 0) { delete own(scope)[k] } })
    return Promise.resolve(1)
  })
  convertPdf.mockResolvedValue([page(1)])
  sources.saveSources.mockResolvedValue()
  sources.removeForConcept.mockResolvedValue()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  temps.forEach((f) => { try { fs.unlinkSync(f) } catch (e) {} })
  jest.restoreAllMocks()
})

describe('preview converts and stores nothing', () => {
  test('returns the converted pages, and neither a record nor a PDF is kept', async () => {
    upload({}, { file: tempFile(PDF) })
    convertPdf.mockResolvedValue([page(1), page(2)])
    const res = await call(routes.preview)
    expect(res._status).toBe(200)
    expect(res._body.pages.map(p => p.title)).toEqual(['Page 1', 'Page 2'])
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
    expect(sources.saveSources).not.toHaveBeenCalled()
    expect(stillOnDisk()).toEqual([])
  })

  test('🔴 a file that is not a PDF is refused before the converter sees it, and its copy is deleted', async () => {
    upload({}, { file: tempFile('<html>not a pdf</html>') })
    const res = await call(routes.preview)
    expect(codeOf(res)).toBe('NOT_A_PDF')
    expect(convertPdf).not.toHaveBeenCalled()
    expect(stillOnDisk()).toEqual([])
  })

  test('an unreadable or protected page answers UNREADABLE, the code the drawing’s §6 sentence hangs on', async () => {
    for (const code of [FAILURES.UNREADABLE, FAILURES.PROTECTED]) {
      upload({}, { file: tempFile(PDF) })
      convertPdf.mockRejectedValueOnce(new PdfConvertError(code))
      const res = await call(routes.preview)
      expect(res._status).toBe(422)
      expect(codeOf(res)).toBe('UNREADABLE')
    }
  })

  test('a timed-out conversion is refused without repeating what the worker said', async () => {
    upload({}, { file: tempFile(PDF) })
    convertPdf.mockRejectedValueOnce(new PdfConvertError(FAILURES.TIMEOUT, 'worker detail at /srv/app'))
    const res = await call(routes.preview)
    expect(codeOf(res)).toBe('CONVERT_FAILED')
    expect(JSON.stringify(res._body)).not.toMatch(/srv|worker/)
  })

  test('two files, or none, are refused and every copy deleted', async () => {
    upload({}, { file: [tempFile(PDF), tempFile(PDF)] })
    expect(codeOf(await call(routes.preview))).toBe('ONE_FILE')
    upload({}, {})
    expect(codeOf(await call(routes.preview))).toBe('ONE_FILE')
    expect(stillOnDisk()).toEqual([])
  })

  test('a body that will not parse is a 400 that never names the library', async () => {
    formidable.mockReturnValue({ parse (req, cb) { cb(new Error('options.maxFileSize exceeded')) } })
    const res = await call(routes.preview)
    expect(codeOf(res)).toBe('UPLOAD_FAILED')
    expect(res._body.error.message).not.toMatch(/maxFileSize/)
  })
})

describe('saving a concept', () => {
  test('🔴 stores it under the TOKEN’s scope, never one named in a field, with the PDFs kept', async () => {
    validSave({ firmId: 'firm-b', scope: PLATFORM_SCOPE })
    const res = await call(routes.save)
    expect(res._status).toBe(201)
    expect(res._body.concept).toMatchObject({ id: 'im-f1', name: 'Our Client Charter', here: true, addedAtTier: 'firm_manager', boxCount: 1 })
    expect(overlay.saveFirmConfig.mock.calls.every(c => c[0] === FIRM)).toBe(true)
    expect(sources.saveSources).toHaveBeenCalledTimes(1)
    const [scope, id, version, files, who] = sources.saveSources.mock.calls[0]
    expect([scope, id, version, who]).toEqual([FIRM, 'im-f1', 1, 'm@firm.example'])
    expect(files.map(f => [f.role, f.position, f.filename])).toEqual([['teaching', 1, 'teach.pdf'], ['response', 1, 'response.pdf']])
    expect(files.every(f => f.bytes.toString() === PDF)).toBe(true)
    expect(stillOnDisk()).toEqual([])
  })

  test('🔴 the drawing stored is the server’s own conversion — pages sent back by the browser are ignored', async () => {
    validSave({ pages: JSON.stringify([{ svg: '<svg><script>alert(1)</script></svg>' }]), svg: '<svg>forged</svg>' })
    convertPdf.mockResolvedValue([page(1, '<svg>server</svg>')])
    await call(routes.save)
    const record = db[FIRM]['imported-concept:im-f1:record']
    expect(record.teachingPages.map(p => p.svg)).toEqual(['<svg>server</svg>'])
    expect(record.responsePage.svg).toBe('<svg>server</svg>')
    expect(JSON.stringify(record)).not.toMatch(/forged|script/)
  })

  test('teaching pages keep the order the files were dropped in, across every file', async () => {
    upload(saveFields(), { teaching: [tempFile(PDF), tempFile(PDF)], response: tempFile(PDF) })
    convertPdf
      .mockResolvedValueOnce([page(1, '<svg>a1</svg>'), page(2, '<svg>a2</svg>')])
      .mockResolvedValueOnce([page(1, '<svg>b1</svg>')])
      .mockResolvedValueOnce([page(1, '<svg>r</svg>')])
    const res = await call(routes.save)
    expect(res._body.concept.teachingPageCount).toBe(3)
    expect(db[FIRM]['imported-concept:im-f1:record'].teachingPages.map(p => p.svg)).toEqual(['<svg>a1</svg>', '<svg>a2</svg>', '<svg>b1</svg>'])
  })

  test('🔴 the Response Form is required — Mike, 2026-09-23 — and a save without one stores nothing', async () => {
    upload(saveFields(), { teaching: tempFile(PDF) })
    const res = await call(routes.save)
    expect(codeOf(res)).toBe('NO_RESPONSE')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
    expect(sources.saveSources).not.toHaveBeenCalled()
    expect(stillOnDisk()).toEqual([])
  })

  test('🔴 one teaching file that is not a PDF refuses the whole save, rather than a concept one page short', async () => {
    upload(saveFields(), { teaching: [tempFile(PDF), tempFile('GIF89a'), tempFile(PDF)], response: tempFile(PDF) })
    const res = await call(routes.save)
    expect(codeOf(res)).toBe('NOT_A_PDF')
    expect(convertPdf).not.toHaveBeenCalled()
    expect(sources.saveSources).not.toHaveBeenCalled()
    expect(stillOnDisk()).toEqual([])
  })

  test('🔴 a file over 20 MB is refused even though the whole request fitted', async () => {
    upload(saveFields(), { teaching: tempFile(Buffer.concat([Buffer.from(PDF), Buffer.alloc(ic.MAX_PDF_BYTES)])), response: tempFile(PDF) })
    const res = await call(routes.save)
    expect(res._status).toBe(413)
    expect(codeOf(res)).toBe('FILE_TOO_LARGE')
    expect(sources.saveSources).not.toHaveBeenCalled()
    expect(stillOnDisk()).toEqual([])
  })

  test('a Response Form that converts to more than one page is refused: the boxes belong to one page', async () => {
    validSave()
    convertPdf.mockResolvedValueOnce([page(1)]).mockResolvedValueOnce([page(1), page(2)])
    expect(codeOf(await call(routes.save))).toBe('RESPONSE_ONE_PAGE')
    expect(sources.saveSources).not.toHaveBeenCalled()
  })

  test('more than ten teaching pages in all is refused', async () => {
    validSave()
    convertPdf.mockResolvedValueOnce(Array.from({ length: 11 }, (_, i) => page(i + 1)))
    expect(codeOf(await call(routes.save))).toBe('TOO_MANY_PAGES')
  })

  test('an unknown section, a blank name, no boxes and a box off the page are each refused', async () => {
    validSave({ planningDomain: 'marketing' })
    expect(codeOf(await call(routes.save))).toBe('INVALID_SECTION')
    validSave({ name: '   ' })
    expect(codeOf(await call(routes.save))).toBe('INVALID_NAME')
    validSave({ boxes: '[]' })
    expect(codeOf(await call(routes.save))).toBe('NO_BOXES')
    validSave({ boxes: 'not json' })
    expect(codeOf(await call(routes.save))).toBe('NO_BOXES')
    validSave({ boxes: JSON.stringify([{ label: 'Off the edge', x: 0.8, y: 0.1, w: 0.3, h: 0.2 }]) })
    expect(codeOf(await call(routes.save))).toBe('INVALID_BOX')
    expect(sources.saveSources).not.toHaveBeenCalled()
    expect(stillOnDisk()).toEqual([])
  })

  test('🔴 a record that fails to save takes its PDFs with it, and the fault names nothing inside', async () => {
    validSave()
    overlay.saveFirmConfig.mockImplementation((scope, key, value) => {
      if (key.indexOf('imported-concept:') === 0) {
        const e = new Error('ER_DATA_TOO_LONG at /srv/app firm_framework_versions')
        e.sqlState = '22001'
        return Promise.reject(e)
      }
      db[scope] = Object.assign({}, db[scope], { [key]: value })
      return Promise.resolve()
    })
    const res = await call(routes.save)
    expect(res._status).toBe(500)
    expect(sources.removeForConcept).toHaveBeenCalledWith(FIRM, 'im-f1')
    expect(JSON.stringify(res._body)).not.toMatch(/ER_DATA_TOO_LONG|srv|firm_framework_versions/)
  })

  test('a database that refuses the PDFs stores no record', async () => {
    validSave()
    const e = new Error('ER_NET_PACKET_TOO_LARGE')
    e.sqlState = '08S01'
    sources.saveSources.mockRejectedValue(e)
    const res = await call(routes.save)
    expect(codeOf(res)).toBe('DB_ERROR')
    expect(db[FIRM]['imported-concept:im-f1:record']).toBeUndefined()
  })
})

describe('the cascade and removal', () => {
  function saveAt (scope) {
    validSave()
    return call(routes.save, { firmId: scope })
  }

  test('a concept the mentor adds is listed at once for a firm, as inherited from the mentor', async () => {
    await saveAt(PLATFORM_SCOPE)
    const res = await call(routes.list)
    expect(res._body.concepts).toEqual([expect.objectContaining({ id: 'im-m1', addedAtTier: 'mentor', here: false })])
    expect(res._body.limits.maxPdfBytes).toBe(ic.MAX_PDF_BYTES)
  })

  test('the list carries the shipped concepts, each in one of the four sections it names', async () => {
    const res = await call(routes.list)
    const sections = res._body.sections.map(s => s.id)
    expect(sections).toHaveLength(4)
    expect(res._body.shipped.length).toBeGreaterThan(0)
    expect(res._body.shipped.every(c => sections.includes(c.planningDomain))).toBe(true)
  })

  test('🔴 a firm cannot remove what the mentor added, and nothing is deleted trying', async () => {
    await saveAt(PLATFORM_SCOPE)
    jest.clearAllMocks()
    const res = await call(routes.remove, { body: { id: 'im-m1' } })
    expect(res._status).toBe(404)
    expect(codeOf(res)).toBe('NOT_HERE')
    expect(sources.removeForConcept).not.toHaveBeenCalled()
    expect(overlay.deleteFirmConfigsByPrefix).not.toHaveBeenCalled()
  })

  test('🔴 removing im-f1 deletes its PDFs and its record by a prefix that cannot reach im-f10', async () => {
    await saveAt(FIRM)
    const res = await call(routes.remove, { body: { id: 'im-f1', firmId: 'firm-b' } })
    expect(res._status).toBe(200)
    expect(sources.removeForConcept).toHaveBeenCalledWith(FIRM, 'im-f1')
    expect(overlay.deleteFirmConfigsByPrefix).toHaveBeenCalledWith(FIRM, 'imported-concept:im-f1:')
    expect(res._body.concepts).toEqual([])
  })

  test('🔴 a removed concept’s id is never handed out again', async () => {
    await saveAt(FIRM)
    await call(routes.remove, { body: { id: 'im-f1' } })
    const res = await saveAt(FIRM)
    expect(res._body.concept.id).toBe('im-f2')
  })

  test('an id that is not an imported concept’s is refused before any read', async () => {
    const res = await call(routes.remove, { body: { id: 'porters-5-forces' } })
    expect(codeOf(res)).toBe('INVALID_ID')
    expect(overlay.loadFirmConfigsByPrefix).not.toHaveBeenCalled()
  })

  test('a live database fault on the list is a 500 in the standard shape that names nothing inside', async () => {
    const e = new Error('ER_NO_SUCH_TABLE: firm_framework_versions')
    e.sqlState = '42S02'
    overlay.loadFirmConfigsByPrefix.mockRejectedValue(e)
    const res = await call(routes.list)
    expect(res._status).toBe(500)
    expect(res._body).toMatchObject({ success: false, error: { code: 'DB_ERROR' } })
    expect(JSON.stringify(res._body)).not.toMatch(/ER_NO_SUCH_TABLE|firm_framework_versions/)
  })
})
