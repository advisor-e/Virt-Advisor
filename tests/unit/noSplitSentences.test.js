'use strict'

/**
 * No screen builds a sentence from translated pieces around a bold word (item 13.6).
 *
 * Every string but English is translated by the backend one key at a time. A sentence
 * split into keys either side of a bold phrase reaches the translator as fragments: no
 * language can reorder them, and in German a join lost its space and printed
 * "Drei-Wege-Prognosezwei-Jahres-Vergleich". Eight screens did this on 2026-09-30 —
 * two of them coaching lines an advisor reads with a client. The fix is one key per
 * sentence with the bold parts as `<i18n path>` slots; this keeps it fixed.
 *
 * Nobody in UAT reads every screen in 28 languages, which is why this is a test.
 *
 * Two shapes are caught, in Pug templates:
 *   inline   | {{ $t('a') }} #[b …] {{ $t('b') }}       text before AND after the tag
 *   stacked  | {{ $t('a') }}  /  b …  /  | {{ $t('b') }}   three lines at one indent
 * A bold label followed by a dash ("#[strong Label] — body") has no text before it and
 * translates correctly, so it is not caught.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
const INLINE_TAG = /#\[(b|strong|em|i)[ .(]/
const STACKED_TAG = /^(b|strong|em|i)([.(][^ ]*)?\s/
const indent = line => line.length - line.trimStart().length
const hasWords = text => /\$t\(|[A-Za-z]/.test(text)

/**
 * The split sentences in one Pug template, as 1-based line numbers within it.
 * @param {string} pug
 * @returns {number[]}
 */
function splitSentences (pug) {
  const lines = pug.split(/\r?\n/)
  const found = []
  lines.forEach((line, i) => {
    const t = line.trim()
    const tag = t.search(INLINE_TAG)
    if (tag > 0 && /\$t\(/.test(t.slice(0, tag)) && hasWords(t.slice(t.lastIndexOf(']') + 1))) {
      found.push(i + 1)
      return
    }
    const prev = lines[i - 1] || ''
    const next = lines[i + 1] || ''
    if (STACKED_TAG.test(t) &&
        indent(prev) === indent(line) && /^\|.*\$t\(/.test(prev.trim()) &&
        indent(next) === indent(line) && /^\|/.test(next.trim()) && hasWords(next.trim().slice(1))) {
      found.push(i + 1)
    }
  })
  return found
}

function vueFiles (dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((out, e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { return out.concat(vueFiles(p)) }
    return e.name.endsWith('.vue') ? out.concat(p) : out
  }, [])
}

describe('a sentence is one locale string, never pieces around a bold word', () => {
  test('the detector catches both shapes and leaves a bold label alone', () => {
    expect(splitSentences("p\n  | {{ $t('a') }} #[b {{ $t('b') }}] {{ $t('c') }}")).toEqual([2])
    expect(splitSentences("p\n  | {{ $t('a') }}\n  b {{ $t('b') }}\n  | {{ $t('c') }}")).toEqual([3])
    expect(splitSentences("li #[strong {{ $t('label') }}] — {{ $t('body') }}")).toEqual([])
    expect(splitSentences("p\n  | {{ $t('a') }}\n  |  #[b {{ $t('whole') }}]")).toEqual([])
  })

  test('no screen, page or layout splits one', () => {
    const offenders = []
    ;['components', 'pages', 'layouts'].forEach((dir) => {
      vueFiles(path.join(ROOT, dir)).forEach((file) => {
        const m = fs.readFileSync(file, 'utf8').match(/<template lang="pug">\r?\n([\s\S]*?)\r?\n<\/template>/)
        if (!m) { return }
        splitSentences(m[1]).forEach(n => offenders.push(path.relative(ROOT, file) + ' template line ' + n))
      })
    })
    expect(offenders).toEqual([])
  })
})
