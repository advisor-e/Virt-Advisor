'use strict'

const fs = require('fs')
const path = require('path')

/**
 * CONSISTENCY GUARD — a `<style scoped>` block may not target `body`, `html` or
 * `#__nuxt`, because such a rule is silently inert.
 *
 * Why this exists — a real, shipped defect (found 2026-08-02). CourseBuilder's
 * "Print / Save as PDF" carried this, inside its scoped block:
 *
 *     @media print { body > * { display: none !important; } }
 *
 * Vue rewrites a scoped selector to match only that component's own elements, so it
 * compiled to `body > *[data-v-hash]`. Nuxt's own page wrapper carries no such
 * attribute, so the rule matched nothing, hid nothing, and printing a course
 * certificate produced the ENTIRE Course Builder screen instead of the certificate.
 *
 * It is the worst shape of defect this repo keeps meeting: it renders confidently, it
 * is believed, and it is wrong. Nothing failed. No test could have failed, because the
 * damage is in what the CSS compiles to, not in what the component renders — and jsdom
 * has no print pipeline to observe.
 *
 * The fix in both printing components is a SECOND, deliberately unscoped `<style>`
 * block gated behind a body class. This guard makes the mistake unrepeatable: move
 * those rules back into a scoped block, or write a new one, and the build fails here
 * rather than in a print preview nobody opens.
 *
 * See components/CpdRecord.vue and components/CourseBuilder.vue for the pattern.
 */

const ROOTS = ['components', 'pages', 'layouts']

/** `<style …>` blocks, capturing the attributes and the CSS separately. */
const STYLE_BLOCK = /<style([^>]*)>([\s\S]*?)<\/style>/g

/**
 * `body` / `html` / `#__nuxt` as a bare selector — NOT as part of a name. Without the
 * boundaries this flags every `.cert-body` and `.conv-body` in the repo, and a guard
 * that cries wolf is switched off within a week.
 */
const REACHES_OUTSIDE = /(?<![\w.#-])(?:body|html|#__nuxt)(?![\w-])/

/** Selector heads inside a CSS body — the text immediately before each `{`. */
const SELECTOR = /(^|[{}();,])\s*([^{}@;]+?)\{/g

/**
 * Every `.vue` file under the given directories.
 *
 * @param {string[]} roots - repo-relative directory names.
 * @returns {string[]} absolute paths.
 */
function vueFiles (roots) {
  const found = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(full) } else if (entry.name.endsWith('.vue')) { found.push(full) }
    }
  }
  for (const r of roots) { walk(path.resolve(__dirname, '../..', r)) }
  return found
}

/**
 * Scoped selectors in one file's source that reach outside the component.
 *
 * Comments are stripped first: the fix itself is heavily commented, and the words
 * "body" and "html" appear in those explanations.
 *
 * @param {string} src - the `.vue` file's source.
 * @returns {string[]} the offending selectors, normalised to one line.
 */
function offendingSelectors (src) {
  const out = []
  let block
  STYLE_BLOCK.lastIndex = 0
  while ((block = STYLE_BLOCK.exec(src))) {
    if (!/\bscoped\b/.test(block[1])) { continue }
    const css = block[2].replace(/\/\*[\s\S]*?\*\//g, '')
    let hit
    SELECTOR.lastIndex = 0
    while ((hit = SELECTOR.exec(css))) {
      if (REACHES_OUTSIDE.test(hit[2])) { out.push(hit[2].trim().replace(/\s+/g, ' ')) }
    }
  }
  return out
}

describe('a scoped style block cannot reach outside its component', () => {
  // A guard that cannot fail is worse than no guard: it reads as proof and is not.
  // This feeds it the exact rule that shipped broken and requires it to object.
  it('catches the rule that actually shipped (the detector is live)', () => {
    const broken = `<style scoped>
      @media print {
        body > * { display: none !important; }
      }
    </style>`
    expect(offendingSelectors(broken)).toEqual(['body > *'])
  })

  it('does not flag a class that merely contains the word (no false alarms)', () => {
    const fine = `<style scoped>
      .cert-body { color: red; }
      .modal-card-body p { margin: 0; }
      .somebody-else { color: blue; }
    </style>`
    expect(offendingSelectors(fine)).toEqual([])
  })

  it('ignores an UNSCOPED block, which is the sanctioned way to do this', () => {
    const sanctioned = `<style>
      @media print { body.cpd-printing * { visibility: hidden !important; } }
    </style>`
    expect(offendingSelectors(sanctioned)).toEqual([])
  })

  it('finds .vue files to check (the sweep is live)', () => {
    expect(vueFiles(ROOTS).length).toBeGreaterThan(20)
  })

  it('no component in the repo carries such a rule', () => {
    const offenders = vueFiles(ROOTS)
      .map(file => ({ file, selectors: offendingSelectors(fs.readFileSync(file, 'utf8')) }))
      .filter(r => r.selectors.length)
      .map(r => `${path.relative(path.resolve(__dirname, '../..'), r.file)}: ${r.selectors.join(', ')}`)

    expect(offenders).toEqual([])
  })
})

describe('the two printing components keep their print rules unscoped', () => {
  const CASES = [
    { file: 'components/CpdRecord.vue', gate: 'cpd-printing' },
    { file: 'components/CourseBuilder.vue', gate: 'cert-printing' }
  ]

  it.each(CASES)('$file prints via an unscoped block gated on a body class', ({ file, gate }) => {
    const src = fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8')

    const unscoped = []
    let block
    STYLE_BLOCK.lastIndex = 0
    while ((block = STYLE_BLOCK.exec(src))) {
      if (!/\bscoped\b/.test(block[1])) { unscoped.push(block[2]) }
    }

    // Exactly one unscoped block, so the exception stays an exception.
    expect(unscoped).toHaveLength(1)
    expect(unscoped[0]).toMatch(/@media\s+print/)
    // The gate is what keeps an ordinary Ctrl+P elsewhere in the app untouched.
    expect(unscoped[0]).toContain(`body.${gate}`)
  })

  it.each(CASES)('$file adds AND removes the gate around printing', ({ file, gate }) => {
    const src = fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8')
    expect(src).toContain(`classList.add('${gate}')`)
    // In a `finally`, so a print that throws cannot leave the page blank on screen.
    expect(src).toMatch(new RegExp(`finally\\s*\\{[^}]*classList\\.remove\\('${gate}'\\)`))
  })
})
