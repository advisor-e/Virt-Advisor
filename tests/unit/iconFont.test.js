'use strict'

/**
 * @file The icon font is present, wired up, and every icon the app names really
 * exists in it. Added 2026-08-03 with `@mdi/font` (Mike's ruling).
 *
 * WHY THIS TEST EXISTS. A missing icon fails SILENTLY — Buefy renders an empty
 * `<i>` and the page just has a gap. Nothing errors, nothing logs, and the suite
 * stays green. That is how the app came to have 29 icon props across 10 files
 * with no icon font declared anywhere: every gate passed the whole time.
 *
 * Three ways it can silently break, one test each:
 *   1. the dependency is dropped
 *   2. the stylesheet stops being loaded by Nuxt
 *   3. someone writes an icon name that does not exist (a typo, or an icon
 *      renamed between Material Design Icons releases)
 */

const { readFileSync, readdirSync, statSync } = require('fs')
const { resolve, join } = require('path')

const ROOT = resolve(__dirname, '../..')
const MDI_CSS = join(ROOT, 'node_modules/@mdi/font/css/materialdesignicons.min.css')

/** Every .vue file under the app's template directories. */
function vueFiles (dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) { vueFiles(full, acc) } else if (name.endsWith('.vue')) { acc.push(full) }
  }
  return acc
}

/**
 * Icon names used in templates: `icon="x"`, `icon-left="x"`, `icon-right="x"`.
 * Bound forms (`:icon="expr"`) are skipped — their value is only known at
 * runtime, so they cannot be checked here.
 *
 * The leading `(?![:\w-])` guard matters: without it the scan also matched the
 * tail of `show-detail-icon="false"` and reported `false` as a missing icon.
 */
function iconNamesInSource () {
  const found = new Set()
  for (const dir of ['components', 'pages', 'layouts']) {
    for (const file of vueFiles(join(ROOT, dir))) {
      const src = readFileSync(file, 'utf8')
      const re = /(?<![:\w-])icon(?:-left|-right)?=["']([a-z0-9-]+)["']/g
      let m
      while ((m = re.exec(src)) !== null) { found.add(m[1]) }
    }
  }
  return [...found]
}

describe('the icon font', () => {
  test('is declared as a dependency, pinned exactly', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

    // Exact, no caret: an icon pack that shifts under us renames icons, and a
    // renamed icon disappears from the page without any error.
    expect(pkg.dependencies['@mdi/font']).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test('is actually loaded by Nuxt — the dependency alone renders nothing', () => {
    const config = readFileSync(join(ROOT, 'nuxt.config.js'), 'utf8')

    expect(config).toContain('@mdi/font/css/materialdesignicons.min.css')
  })

  test('contains every icon the app asks for by name', () => {
    const css = readFileSync(MDI_CSS, 'utf8')
    const used = iconNamesInSource()

    // Guard the guard: if the scan ever finds nothing, this test would pass while
    // checking nothing at all.
    expect(used.length).toBeGreaterThan(10)

    const missing = used.filter(name => !css.includes(`.mdi-${name}:`))
    expect(missing).toEqual([])
  })
})
