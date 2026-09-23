'use strict'

/**
 * Item 15.20 — the PDF converter. These tests pin the three conditions of Mike's ruling of
 * 2026-09-24 (CVE-2024-4367 contained), because none of them is visible to a person in UAT:
 * a converter with eval on, secrets in its environment, or no time limit looks exactly the
 * same on screen as one without.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { JSDOM } = require('jsdom')

const convert = require('../../server/utils/pdfConvert')
const worker = require('../../server/utils/pdfConvertWorker')

const { FAILURES, PdfConvertError, validateReply, cleanSvg, runWorker, convertPdf } = convert

const DECK = path.join(__dirname, '../../design/planning-templates/Advance.6.Organisational Review.pdf')

// Stand-in workers: small scripts the real spawn runs, each misbehaving in one way. Written
// to a folder of this suite's own, so no other suite can collide with them (item 22.1).
let dir
const standIn = (name, body) => {
  const file = path.join(dir, name + '.js')
  fs.writeFileSync(file, body)
  return file
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfconvert-'))
  // isomorphic-dompurify picks its DOM on first use; use it here, before anything below can
  // make this process look like a browser.
  cleanSvg('<svg></svg>')
})

afterAll(() => {
  fs.rmdirSync(dir, { recursive: true })
})

const page = (over = {}) => ({
  number: 1,
  width: 720,
  height: 405,
  svg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L1 1"/></svg>',
  title: 'T',
  text: ['T'],
  readable: true,
  droppedImages: 0,
  ...over
})

describe('the worker is sealed off — Mike\'s ruling, 2026-09-24', () => {
  test('it is started with none of the server\'s environment', async () => {
    process.env.PDF_CONVERT_TEST_SECRET = 'must-not-leak'
    const reply = await runWorker(Buffer.from('x'), {
      worker: standIn('env', 'process.stdin.resume();process.stdin.on("end",()=>' +
        'console.log(JSON.stringify(Object.keys(process.env))))')
    })
    delete process.env.PDF_CONVERT_TEST_SECRET
    expect(reply).not.toContain('PDF_CONVERT_TEST_SECRET')
    expect(reply.filter(k => /DB_|MYSQL|OPENAI|SECRET|KEY|TOKEN|PASSWORD/i.test(k))).toEqual([])
  })

  test('a worker that never answers is killed at the time limit', async () => {
    const started = Date.now()
    await expect(runWorker(Buffer.from('x'), {
      worker: standIn('hang', 'setInterval(()=>{},1000)'),
      timeoutMs: 400
    })).rejects.toMatchObject({ code: FAILURES.TIMEOUT })
    expect(Date.now() - started).toBeLessThan(5000)
  })

  test('the time limit in force is Mike\'s twenty seconds', () => {
    expect(convert.TIMEOUT_MS).toBe(20000)
  })

  test('a worker that floods its output is stopped and nothing is used', async () => {
    await expect(runWorker(Buffer.from('x'), {
      worker: standIn('flood', 'process.stdout.write("x".repeat(3*1024*1024))'),
      maxOutputBytes: 1024 * 1024
    })).rejects.toMatchObject({ code: FAILURES.TOO_LARGE })
  })

  test('a reply that is not JSON is a failure, not an empty result', async () => {
    await expect(runWorker(Buffer.from('x'), {
      worker: standIn('garbage', 'process.stdout.write("not json")')
    })).rejects.toMatchObject({ code: FAILURES.FAILED })
  })

  test('the worker loads the reader with eval switched off', () => {
    const seen = []
    const fakeReader = {
      getDocument: (opts) => { seen.push(opts); return { promise: Promise.reject(new Error('stop')) } }
    }
    return worker.convert(new Uint8Array(1), fakeReader, {}).catch(() => {
      expect(seen[0].isEvalSupported).toBe(false)
    })
  })
})

describe('nothing the worker sends is trusted', () => {
  test('a sound reply passes', () => {
    expect(validateReply({ ok: true, pages: [page()] })).toEqual({ ok: true, pages: [page()] })
  })

  test.each([
    ['not an object', null],
    ['no pages', { ok: true, pages: [] }],
    ['a page with no drawing', { ok: true, pages: [page({ svg: 42 })] }],
    ['a page with no size', { ok: true, pages: [page({ width: 0 })] }],
    ['text that is not text', { ok: true, pages: [page({ text: [1] })] }],
    ['a missing readable flag', { ok: true, pages: [page({ readable: 'yes' })] }]
  ])('refuses %s', (_, reply) => {
    expect(() => validateReply(reply)).toThrow(PdfConvertError)
  })

  test('a failure the worker names passes through; one it invents does not', () => {
    expect(validateReply({ ok: false, code: 'PROTECTED' })).toEqual({ ok: false, code: 'PROTECTED' })
    expect(validateReply({ ok: false, code: 'ANYTHING' })).toEqual({ ok: false, code: 'FAILED' })
  })

  test('a file whose every page is a scan is unreadable, not an empty concept', async () => {
    const reply = JSON.stringify({ ok: true, pages: [page({ readable: false })] })
    await expect(convertPdf(Buffer.from('x'), {
      worker: standIn('scan', 'process.stdout.write(' + JSON.stringify(reply) + ')')
    })).rejects.toMatchObject({ code: FAILURES.UNREADABLE })
  })
})

describe('a converted page is made safe to show a client', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgo='

  test('scripts, handlers and foreign content are removed', () => {
    const out = cleanSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">' +
      '<script>alert(1)</script><foreignObject><div>x</div></foreignObject>' +
      '<path d="M0 0" onclick="alert(1)"/></svg>')
    expect(out).not.toMatch(/script|onload|onclick|foreignObject/i)
    expect(out).toMatch(/<path/)
  })

  test('only an embedded picture survives', () => {
    const out = cleanSvg('<svg xmlns="http://www.w3.org/2000/svg">' +
      '<image href="' + PNG + '"/><image href="https://example.com/track.png"/></svg>')
    expect((out.match(/<image/g) || []).length).toBe(1)
    expect(out).not.toMatch(/example\.com/)
  })

  test('a style that fetches from anywhere is removed; embedded fonts stay', () => {
    const kept = cleanSvg('<svg xmlns="http://www.w3.org/2000/svg"><style>@font-face{src:url(data:font/opentype;base64,AAAA)}</style></svg>')
    const gone = cleanSvg('<svg xmlns="http://www.w3.org/2000/svg"><style>@font-face{src:url(https://example.com/f.otf)}</style>' +
      '<path d="M0 0" style="fill:url(https://example.com/x)"/></svg>')
    expect(kept).toMatch(/@font-face/)
    expect(gone).not.toMatch(/example\.com/)
  })

  test('something that is not a drawing comes back empty', () => {
    expect(cleanSvg('<div>hello</div>')).toBe('')
  })
})

describe('the drawing the worker writes', () => {
  const doc = () => new JSDOM('').window.document
  const NS = 'http://www.w3.org/2000/svg'

  // A 720 × 405 page, as the SVG back-end writes it: flipped, in points.
  const svgWith = (x, y, w, h) => {
    const d = doc()
    const svg = d.createElementNS(NS, 'svg')
    const g = d.createElementNS(NS, 'g')
    const img = d.createElementNS(NS, 'image')
    Object.entries({ x, y, width: w, height: h }).forEach(([k, v]) => img.setAttribute(k, String(v)))
    g.appendChild(img)
    svg.appendChild(g)
    return svg
  }

  test('a picture wholly under the firm\'s mark is dropped — question 8', () => {
    const svg = svgWith(60, 370, 50, 30) // Mike's logo sits at 50–119, 365–402
    expect(worker.dropCoveredImages(svg, 720, 405)).toBe(1)
    expect(svg.getElementsByTagName('image').length).toBe(0)
  })

  test('a picture crossing the edge of the mark is kept — the rule only removes what the mark hides', () => {
    const svg = svgWith(60, 300, 50, 100)
    expect(worker.dropCoveredImages(svg, 720, 405)).toBe(0)
  })

  test('every xlink prefix is rewritten, never only the first', () => {
    const out = worker.plainSvg('<svg:svg xmlns:svg="s"><svg:image xmlns:ns1="x" ns1:href="a"/>' +
      '<svg:image xmlns:ns2="x" ns2:href="b"/><svg:image xmlns:ns3="x" ns3:href="c"/></svg:svg>')
    expect(out).not.toMatch(/ns\d+:|svg:/)
    expect((out.match(/ href=/g) || []).length).toBe(3)
  })

  test('the title is the largest line on the page', () => {
    expect(worker.titleOf([
      { str: 'small', transform: [1, 0, 0, 10, 0, 0] },
      { str: 'Big Title', transform: [1, 0, 0, 24, 0, 0] },
      { str: ' ', transform: [1, 0, 0, 40, 0, 0] }
    ])).toBe('Big Title')
  })

  test('a transform it cannot read changes nothing', () => {
    expect(worker.parseTransform('rotate(45)')).toEqual([1, 0, 0, 1, 0, 0])
    expect(worker.parseTransform('scale(2) translate(3,4)')).toEqual([2, 0, 0, 2, 6, 8])
  })
})

describe('Mike\'s own page, converted for real', () => {
  // The same conversion in this process, where coverage can see it: in production the loop
  // runs only inside the worker, which no coverage tool instruments.
  test('the conversion loop reads every page, titled, with the covered logo counted', async () => {
    const win = new JSDOM('').window
    global.document = win.document
    try {
      const pdfjs = require('pdfjs-dist/legacy/build/pdf.js')
      const { pages } = await worker.convert(new Uint8Array(fs.readFileSync(DECK)), pdfjs, win)
      expect(pages).toHaveLength(25)
      expect(pages[10].title).toBe('Defining Our Cultural Core Values (foundation)')
      expect(pages[10].droppedImages).toBe(1)
      expect(pages.every(p => p.readable)).toBe(true)
    } finally {
      delete global.document
    }
  }, 30000)

  test('Organisational Review p11 arrives whole, titled, clean and without the covered logo', async () => {
    const pages = await convertPdf(fs.readFileSync(DECK))
    const p11 = pages.find(p => p.number === 11)
    expect(p11.title).toBe('Defining Our Cultural Core Values (foundation)')
    expect(p11.droppedImages).toBe(1) // the advisor-e.com logo, under the firm's mark
    expect((p11.svg.match(/<image/g) || []).length).toBe(2) // both green arrows kept
    expect(p11.svg).not.toMatch(/ns\d+:href|<script/i)
  }, 30000)
})
