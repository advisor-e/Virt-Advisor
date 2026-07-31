'use strict'

// Every screen's <style> block must actually parse.
//
// WHY THIS EXISTS. On 2026-07-31 the Advisory Distinctions rebuild deleted a CSS rule
// but left its closing brace behind, one line above </style> in FirmManagerHub.vue. That
// single stray `}` stopped webpack compiling the component, so the WHOLE Firm Manager
// page — every tab, not just Distinctions — failed to build. It shipped green: 3,365
// tests and the linter all passed, because neither reads the style block. The test
// runner strips it and ESLint lints markup and JavaScript only. Only a full `nuxt build`
// caught it, and a build is not run on every commit.
//
// So this closes a hole the suite was structurally unable to see: a class of defect that
// costs nothing to make, breaks a whole page, and is invisible to every other gate.
//
// It parses with POSTCSS ON PURPOSE — the same parser `postcss-loader` uses inside the
// real build — so a pass here means the same thing the build means, rather than being a
// second opinion that can drift from it. postcss arrives with Nuxt's build chain rather
// than as a direct dependency of ours; it is present wherever the app can be built at
// all, and nothing new was installed for this test.

const fs = require('fs')
const path = require('path')
const postcss = require('postcss')

const ROOT = path.resolve(__dirname, '../..')
const SCREEN_DIRS = ['components', 'pages', 'layouts']

/**
 * Every .vue file under the screen directories.
 * @returns {string[]} repo-relative paths
 */
function findVueFiles () {
  const found = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.name.endsWith('.vue')) {
        found.push(path.relative(ROOT, full).replace(/\\/g, '/'))
      }
    }
  }
  for (const dir of SCREEN_DIRS) {
    const abs = path.join(ROOT, dir)
    if (fs.existsSync(abs)) { walk(abs) }
  }
  return found.sort()
}

/**
 * The plain-CSS style blocks in one .vue file. A block declaring a preprocessor
 * (`lang="scss"`) is skipped rather than mis-reported — postcss would reject syntax that
 * is legitimate for that language. No screen uses one today; this keeps the guard honest
 * if one ever does, instead of failing for the wrong reason.
 *
 * @param {string} source - the file's contents
 * @returns {string[]} the CSS inside each block
 */
function cssBlocks (source) {
  const blocks = []
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/g
  let match
  while ((match = re.exec(source)) !== null) {
    const lang = /lang\s*=\s*["']([^"']+)["']/.exec(match[1])
    if (lang && lang[1] !== 'css') { continue }
    blocks.push(match[2])
  }
  return blocks
}

const vueFiles = findVueFiles()
const styled = vueFiles
  .map(file => ({ file, blocks: cssBlocks(fs.readFileSync(path.join(ROOT, file), 'utf8')) }))
  .filter(entry => entry.blocks.length > 0)

describe('the guard is reading real files', () => {
  // Without these two, a broken walk that finds nothing would report a clean pass —
  // the loudest kind of false green, because it looks like proof.
  test('it finds the app screens', () => {
    expect(vueFiles.length).toBeGreaterThan(50)
  })

  test('it finds style blocks to check', () => {
    expect(styled.length).toBeGreaterThan(40)
  })
})

describe('every screen style block parses', () => {
  test.each(styled.map(entry => [entry.file, entry.blocks]))(
    '%s',
    (file, blocks) => {
      for (const css of blocks) {
        // postcss reports the line and reason; letting it throw puts both in the failure.
        expect(() => postcss.parse(css, { from: file })).not.toThrow()
      }
    }
  )
})

describe('the check itself works', () => {
  // Proving the guard bites by breaking the real file and restoring it is a one-off that
  // no future session can see. The defect lives in the test instead, so the proof is
  // permanent and runs on every commit.
  test('the exact 2026-07-31 defect is caught — a stray closing brace', () => {
    const broken = [
      '.distinction-off { opacity: 0.5; }',
      '}'
    ].join('\n')
    expect(() => postcss.parse(broken, { from: 'stray-brace.css' })).toThrow(/Unexpected \}/)
  })

  test('an unclosed rule is caught', () => {
    expect(() => postcss.parse('.card { padding: 1rem;', { from: 'unclosed.css' }))
      .toThrow(/Unclosed/)
  })

  test('the corrected form of that same rule passes', () => {
    expect(() => postcss.parse('.distinction-off { opacity: 0.5; }', { from: 'fixed.css' }))
      .not.toThrow()
  })
})
