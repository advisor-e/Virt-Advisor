'use strict'

/**
 * count-code — how much working code the app holds, written to design/CODE-SIZE.md.
 *
 * Asked for by Mike, 2026-09-10: *"keep that as a rolling summary in the handbook please"*.
 * Rolling means computed, never typed: `scripts/build-handbook.js` calls `writeRecord` before
 * it reads a single page, so the figure on the Handbook's Code Size page is the figure at the
 * moment the Handbook was built. `npm run code-size` writes the same file on its own.
 *
 * WHAT COUNTS AS WORKING CODE. `.js` and `.vue` files under the app's own directories, minus
 * blank lines, minus comment lines — `//`, `/* … *\/` blocks and the `*` lines inside them,
 * Pug's `//-`, and HTML `<!-- -->`. A line of code with a comment at its end counts as code.
 *
 * WHAT DOES NOT. Tests (reported separately, never added in), design documents, the data
 * folder (Mike's content, not code), scripts (developer tools), locale files (words on
 * screens, reported separately), node_modules and the build output.
 *
 * Node 14, CommonJS; no dependencies.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

/** The app's own directories, in the order the page lists them. */
const APP_DIRS = ['components', 'server', 'utils', 'pages', 'mixins', 'server-middleware', 'plugins', 'config', 'layouts', 'store', 'middleware']
const CODE_EXT = new Set(['.js', '.vue'])
const SKIP_DIRS = new Set(['node_modules', '.nuxt', 'tests', 'design', 'data', 'scripts', '.git', 'coverage'])

/**
 * Count one file's lines: working code, comment, blank.
 *
 * @param {string} text
 * @returns {{code: number, comment: number, blank: number}}
 */
function countCode (text) {
  let inBlock = false
  let code = 0
  let comment = 0
  let blank = 0
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) { blank++; continue }
    if (inBlock) {
      comment++
      if (line.includes('*/')) { inBlock = false }
      continue
    }
    if (line.startsWith('/*')) {
      comment++
      // A block that opens and closes on one line ends here; otherwise it runs on.
      if (!line.includes('*/', 2)) { inBlock = true }
      continue
    }
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('<!--')) { comment++; continue }
    code++
  }
  return { code, comment, blank }
}

function walk (dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) { walk(p, out) }
    } else if (CODE_EXT.has(path.extname(name))) {
      out.push(p)
    }
  }
}

function sumFiles (files) {
  const total = { files: 0, code: 0, comment: 0, blank: 0 }
  for (const f of files) {
    const c = countCode(fs.readFileSync(f, 'utf8'))
    total.files++
    total.code += c.code
    total.comment += c.comment
    total.blank += c.blank
  }
  return total
}

/**
 * Measure the repository.
 *
 * @param {string} root - the repository root
 * @returns {{areas: Array<{dir: string, files: number, code: number, comment: number}>, byType: object, app: object, tests: object, localeLines: number}}
 */
function measure (root) {
  const areas = []
  const allFiles = []
  for (const dir of APP_DIRS) {
    const p = path.join(root, dir)
    if (!fs.existsSync(p)) { continue }
    const files = []
    walk(p, files)
    const t = sumFiles(files)
    areas.push({ dir, files: t.files, code: t.code, comment: t.comment })
    allFiles.push(...files)
  }
  const nuxtConfig = path.join(root, 'nuxt.config.js')
  if (fs.existsSync(nuxtConfig)) {
    const t = sumFiles([nuxtConfig])
    areas.push({ dir: 'nuxt.config.js', files: 1, code: t.code, comment: t.comment })
    allFiles.push(nuxtConfig)
  }
  areas.sort((a, b) => b.code - a.code)

  const byType = {}
  for (const f of allFiles) {
    const ext = path.extname(f)
    const c = countCode(fs.readFileSync(f, 'utf8'))
    byType[ext] = byType[ext] || { files: 0, code: 0 }
    byType[ext].files++
    byType[ext].code += c.code
  }

  const app = sumFiles(allFiles)

  const testFiles = []
  const testsDir = path.join(root, 'tests')
  if (fs.existsSync(testsDir)) { walk(testsDir, testFiles) }
  const tests = sumFiles(testFiles)

  let localeLines = 0
  const localesDir = path.join(root, 'locales')
  if (fs.existsSync(localesDir)) {
    for (const name of fs.readdirSync(localesDir)) {
      if (name.endsWith('.json')) {
        localeLines += fs.readFileSync(path.join(localesDir, name), 'utf8').split(/\r?\n/).filter(l => l.trim()).length
      }
    }
  }

  return { areas, byType, app, tests, localeLines }
}

function fmt (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }

function commitOf (root) {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim()
  } catch (e) { return 'unknown' }
}

const AREA_NAMES = {
  components: 'Screens and components',
  server: 'The Restify backend',
  utils: 'Front-end helpers',
  pages: 'Pages',
  mixins: 'Mixins',
  'server-middleware': 'Thin proxies to the backend',
  plugins: 'Plugins',
  config: 'Configuration',
  layouts: 'Layouts',
  store: 'Vuex store',
  middleware: 'Route middleware',
  'nuxt.config.js': 'Nuxt configuration'
}

/**
 * The record as markdown.
 *
 * @param {object} m - from `measure`
 * @param {{date: string, commit: string}} stamp
 * @returns {string}
 */
function renderMarkdown (m, stamp) {
  const lines = []
  lines.push('# Code Size — how much working code there is')
  lines.push('')
  lines.push('> **Generated. Do not edit — the next Handbook build overwrites it.** Written by')
  lines.push('> `scripts/count-code.js`, which `npm run handbook` runs before it reads a single page,')
  lines.push('> and `npm run code-size` runs on its own. Mike asked for this as a rolling summary on')
  lines.push('> 2026-09-10; rolling means computed at build time, never typed.')
  lines.push('>')
  lines.push('> **Measured ' + stamp.date + ' at commit `' + stamp.commit + '`.**')
  lines.push('')
  lines.push('**Working code: ' + fmt(m.app.code) + ' lines** across ' + fmt(m.app.files) + ' files — blank lines and')
  lines.push('comment lines stripped; tests, design documents, data, scripts and locale strings left out.')
  lines.push('')
  lines.push('| Where | Files | Lines of code | Comment lines |')
  lines.push('|---|---:|---:|---:|')
  for (const a of m.areas) {
    lines.push('| ' + (AREA_NAMES[a.dir] || a.dir) + ' (`' + a.dir + '`) | ' + fmt(a.files) + ' | ' + fmt(a.code) + ' | ' + fmt(a.comment) + ' |')
  }
  lines.push('| **Total working code** | **' + fmt(m.app.files) + '** | **' + fmt(m.app.code) + '** | **' + fmt(m.app.comment) + '** |')
  lines.push('')
  lines.push('| By kind | Files | Lines of code |')
  lines.push('|---|---:|---:|')
  const kinds = { '.vue': 'Vue screens and components', '.js': 'JavaScript' }
  Object.keys(m.byType).sort().forEach((ext) => {
    lines.push('| ' + (kinds[ext] || ext) + ' | ' + fmt(m.byType[ext].files) + ' | ' + fmt(m.byType[ext].code) + ' |')
  })
  lines.push('')
  lines.push('**Beside the code, and not counted in it:**')
  lines.push('')
  lines.push('- **Comments and documentation** inside those same files: ' + fmt(m.app.comment) + ' lines. The JSDoc rule asks for the *why*, and this is what it costs.')
  lines.push('- **Tests**: ' + fmt(m.tests.files) + ' files, ' + fmt(m.tests.code) + ' lines of test code' + (m.tests.code > m.app.code ? ' — more test code than app code.' : '.'))
  lines.push('- **Locale strings**: ' + fmt(m.localeLines) + ' non-blank lines across the language files. Words on screens, not logic.')
  lines.push('- **The content the engine reads** — logic trees, prompts, observation points, templates — lives in `data/` and is Mike\'s material, not code.')
  lines.push('')
  lines.push('**How a line is classified.** A line is a comment if, once trimmed, it starts with `//`, `*`,')
  lines.push('`<!--`, or sits inside a `/* … */` block. A line of code with a comment at its end is code.')
  lines.push('Pinned by `tests/unit/countCode.test.js`.')
  lines.push('')
  return lines.join('\n')
}

/**
 * Measure and write design/CODE-SIZE.md.
 *
 * @param {string} root
 * @returns {{file: string, code: number, files: number}}
 */
function writeRecord (root) {
  const m = measure(root)
  const stamp = { date: new Date().toISOString().slice(0, 10), commit: commitOf(root) }
  const file = path.join(root, 'design', 'CODE-SIZE.md')
  fs.writeFileSync(file, renderMarkdown(m, stamp), 'utf8')
  return { file, code: m.app.code, files: m.app.files, tests: m.tests.code }
}

module.exports = { countCode, measure, renderMarkdown, writeRecord, APP_DIRS }

if (require.main === module) {
  const root = path.resolve(__dirname, '..')
  const r = writeRecord(root)
  console.log('Wrote design/CODE-SIZE.md — ' + fmt(r.code) + ' lines of working code in ' + fmt(r.files) + ' files; ' + fmt(r.tests) + ' lines of tests.')
}
