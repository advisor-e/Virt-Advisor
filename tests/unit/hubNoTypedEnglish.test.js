'use strict'

/**
 * Item 13.7 — translation reaches every hub page, at every level, going forward.
 *
 * A string in `locales/en.json` is served in any of the reader's 28 languages; a string typed
 * into a template stays English for ever (design/features/localisation-and-currency.md §1a).
 * An English-speaking tester in UAT cannot see the difference, so this is the only place it
 * is caught. It walks every screen the four hub pages reach — following their imports, so a
 * new tab is covered the day it is added — and fails on:
 *
 *   1. English typed into a template, as text or as a label, placeholder or title;
 *   2. English written into a toast, dialog or label in the script;
 *   3. a `$t` key that does not resolve — vue-i18n renders the key itself, so a missing one
 *      shows "firmManagerHub.foo" on screen and nothing else notices.
 *
 * Templates are read with pug's own lexer (a dependency of `pug`, req. 5), not a regex, so
 * comments, multi-line attributes and `#[...]` interpolation are read exactly as pug reads them.
 */

const fs = require('fs')
const path = require('path')
const lex = require('pug-lexer')
const { mergeSections, COLLABORATE_SECTIONS } = require('../../utils/i18nMessages')

const ROOT = path.join(__dirname, '..', '..')
const HUB_PAGES = ['pages/mentor.vue', 'pages/global-group-manager.vue', 'pages/group-manager.vue', 'pages/firm-manager.vue']
const MESSAGES = mergeSections(require('../../locales/en.json'), require('../../locales/collaborate/en.json'), COLLABORATE_SECTIONS)

/** Static attributes whose value a reader sees. */
const PROSE_ATTRS = new Set(['label', 'placeholder', 'title', 'message', 'aria-label', 'alt', 'empty-string', 'confirm-text', 'cancel-text'])

/** A capitalised word, or two lowercase words in a row — prose, not a code value like `eoy_meeting` or `NZ`. */
const PROSE = /[A-Z][a-z]|[a-z]{2,}\s+[a-z]{2,}/

/** A wording key held in the script for a later `$t`, such as `sessionProcess.tierMentor`. */
const WORDING_KEY = /^[a-z]\w*(\.\w+)+$/

/** A file path shown as code, such as `data/dev-platform-distinctions.json` — a name, not prose. */
const FILE_PATH = /^[\w-]+(\/[\w.-]+)+$/

/** Every .vue file the hub pages reach through their imports. */
function hubFiles () {
  const seen = new Set()
  const visit = (rel) => {
    if (seen.has(rel)) { return }
    seen.add(rel)
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8')
    const imports = /import\s+\w+\s+from\s+'([^']+\.vue)'/g
    let m
    while ((m = imports.exec(src))) {
      const abs = m[1].startsWith('~/') ? path.join(ROOT, m[1].slice(2)) : path.resolve(path.dirname(path.join(ROOT, rel)), m[1])
      if (fs.existsSync(abs)) { visit(path.relative(ROOT, abs).replace(/\\/g, '/')) }
    }
  }
  HUB_PAGES.forEach(visit)
  return [...seen].sort()
}

function templateOf (src) {
  const m = src.replace(/\r\n/g, '\n').match(/<template lang="pug">\n([\s\S]*)\n<\/template>/)
  if (!m) { return '' }
  const lines = m[1].split('\n')
  const indent = Math.min(...lines.filter(l => l.trim()).map(l => l.search(/\S/)))
  return lines.map(l => l.slice(indent)).join('\n')
}

/**
 * Quoted prose inside an expression — `{{ file ? file.name : 'Choose a file' }}`. Phrases only:
 * a single word there is nearly always code (`'Values'` compared, `'Head'` joined onto a key).
 */
function proseLiterals (expr) {
  return (expr.match(/'(?:\\.|[^'\\])*'/g) || []).map(q => q.slice(1, -1)).filter(s => /[A-Za-z]{2,}\s+[A-Za-z]/.test(s))
}

/** Typed English in one template, as `line: text`. */
function templateEnglish (file, src) {
  const found = []
  let inComment = false
  lex(templateOf(src), { filename: file }).forEach((t) => {
    if (t.type === 'comment') { inComment = true; return }
    if (t.type === 'end-pipeless-text' || t.type === 'newline' || t.type === 'outdent') { inComment = false; return }
    if (inComment || t.type === 'start-pipeless-text') { return }
    const line = t.loc.start.line + ': '
    if (t.type === 'text') {
      const words = t.val.replace(/\{\{[\s\S]*?\}\}/g, ' ').replace(/&[a-z]+;/g, ' ')
      if (/[A-Za-z]{2,}/.test(words) && !FILE_PATH.test(words.trim())) { found.push(line + t.val.trim()) }
      ;(t.val.match(/\{\{[\s\S]*?\}\}/g) || []).forEach(e => proseLiterals(e).forEach(s => found.push(line + s)))
    }
    if (t.type === 'attribute' && typeof t.val === 'string') {
      const name = t.name.replace(/^(:|v-bind:)/, '')
      if (!PROSE_ATTRS.has(name)) { return }
      if (name === t.name && /^["']/.test(t.val) && PROSE.test(t.val)) { found.push(line + t.name + '=' + t.val) }
      if (name !== t.name) { proseLiterals(t.val).forEach(s => found.push(line + t.name + '=' + s)) }
    }
  })
  return found
}

/** English written into a toast, dialog or label in the script. */
function scriptEnglish (src) {
  const script = (src.match(/<script>([\s\S]*?)<\/script>/) || [])[1] || ''
  const found = []
  const literal = /\b(message|title|confirmText|cancelText|label|placeholder)\s*:\s*(['`])((?:\\.|(?!\2)[^\\])*)\2/g
  let m
  while ((m = literal.exec(script))) {
    if (!WORDING_KEY.test(m[3]) && PROSE.test(m[3].replace(/\$\{[^}]*\}/g, ' '))) { found.push(m[1] + ': ' + m[3]) }
  }
  return found
}

/** `$t` / `$tc` keys and `i18n(path=...)` paths that resolve to nothing. */
function unresolvedKeys (src) {
  const missing = []
  const keys = /\$tc?\('([^']+)'(\s*\+)?|i18n\(path="([^"]+)"/g
  let m
  while ((m = keys.exec(src))) {
    const key = m[1] || m[3]
    // A key built by concatenation is checked as far as it is written: `'console.titles.' + tier`
    // needs its parent, `'guide.point' + n` needs a sibling that starts `point`.
    const parts = key.split('.')
    const last = m[2] ? parts.pop() : null
    const node = parts.filter(Boolean).reduce((n, p) => (n && typeof n === 'object') ? n[p] : undefined, MESSAGES)
    const found = last ? node && typeof node === 'object' && Object.keys(node).some(k => k.startsWith(last)) : node !== undefined
    if (!found) { missing.push(key) }
  }
  return missing
}

describe('🔴 every hub screen, at every level, is translatable', () => {
  const files = hubFiles()

  test('the walk reaches the four hub pages and the screens under them', () => {
    // A walk that silently stopped following imports would pass everything below.
    expect(files).toEqual(expect.arrayContaining(HUB_PAGES.concat(['components/FirmManagerHub.vue', 'components/firm/FirmWordsmith.vue'])))
    expect(files.length).toBeGreaterThan(50)
  })

  test.each(hubFiles())('%s has no English typed into it', (file) => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8')
    expect(templateEnglish(file, src).concat(scriptEnglish(src))).toEqual([])
  })

  test.each(hubFiles())('%s asks only for wording that exists', (file) => {
    expect(unresolvedKeys(fs.readFileSync(path.join(ROOT, file), 'utf8'))).toEqual([])
  })
})

describe('the guard itself', () => {
  test('catches typed text, a typed label and a typed toast — and passes comments and code values', () => {
    // Windows line endings on purpose: the repository's files carry them on this machine, and a
    // template that failed to parse would be read as empty and pass everything.
    const tpl = '<template lang="pug">\r\n  div\r\n    //- a comment in English\r\n      that runs on\r\n    p Hello there\r\n    b-field(label="Domain")\r\n    b-input(placeholder="eoy_meeting")\r\n    p {{ $t(\'a.b\') }} &middot;\r\n    span {{ f ? f.name : \'Choose a file\' }}\r\n    b-field(:label="x ? \'Your firm\' : $t(\'a.b\')")\r\n</template>'
    expect(templateEnglish('x.vue', tpl)).toEqual(['4: Hello there', '5: label="Domain"', '8: Choose a file', '9: :label=Your firm'])
    expect(scriptEnglish("<script>\nf({ message: 'Video added.' }); g({ label: 'sessionProcess.tierMentor' })\n</script>")).toEqual(['message: Video added.'])
    expect(unresolvedKeys("$t('firmManagerHub.close') $t('firmManagerHub.nope') $t('wordsmith.hub.guide.point' + n)")).toEqual(['firmManagerHub.nope'])
  })
})
