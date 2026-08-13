'use strict'

/**
 * A MARK MUST NEVER POINT AT WORDS THAT ARE NOT THERE.
 *
 * Domain-support rows are transcriptions of a firm's own documents. Mixed into
 * them is a second kind of sentence — a short clause explaining WHY a step
 * matters, written by us during transcription and present in none of the firm's
 * material. Nine were found in Strategy on 2026-08-14. The owner's ruling was
 * MARK them, not delete them (design/features/domain-support-provenance.md).
 *
 * A mark records the words verbatim rather than a step number, because the
 * screen lets steps be reordered and an index would silently come to mean a
 * different sentence. The cost of that choice is that the mark and the text can
 * drift apart if someone edits the step — so this test closes it:
 *
 *   - every marked fragment still appears in its own material
 *   - exactly once, so the screen never has to guess which occurrence it meant
 *   - carrying the date it was checked and what was searched
 *
 * It runs over ALL 29 areas, not just Strategy, so the rule is already in force
 * for the sweep of the remaining 28 rather than being written after the mess.
 *
 * ⚠ This test does NOT find unmarked commentary. It cannot: three detectors
 * were built on 2026-08-14 and all three were defeated by paraphrase, which is
 * proven rather than assumed. Finding them is a person reading a domain beside
 * its own source PDF. See domain-support-provenance-history.md §2–3.
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', '..', 'data')

const files = fs.readdirSync(DATA_DIR).filter(name => name.endsWith('-domain-support.json'))

/** The fields of a material a mark may point into. */
function searchableText (material) {
  return [material.summary || '', material.who_when || '']
    .concat(Array.isArray(material.steps) ? material.steps : [])
}

/** How many times `fragment` occurs across a material's own text. */
function occurrences (material, fragment) {
  return searchableText(material).reduce((total, field) => {
    let count = 0
    let at = field.indexOf(fragment)
    while (at !== -1) { count++; at = field.indexOf(fragment, at + 1) }
    return total + count
  }, 0)
}

/** Every mark in every area, flattened with enough context to name it. */
function allMarks () {
  return files.reduce((marks, file) => {
    const support = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'))
    const materials = Array.isArray(support.materials) ? support.materials : []
    materials.forEach((material) => {
      const list = material.authored_commentary
      if (!Array.isArray(list)) { return }
      list.forEach((mark, index) => {
        marks.push({ file, material, mark, where: `${file} → ${material.id} → mark ${index + 1}` })
      })
    })
    return marks
  }, [])
}

describe('authored commentary — the mark and the words it points at', () => {
  it('finds domain-support files to check', () => {
    // A rename that emptied this list would make every test below pass on
    // nothing, which is the failure mode a guard test is worst at noticing.
    expect(files.length).toBeGreaterThan(20)
  })

  it('every marked fragment still appears in its own material', () => {
    const orphans = allMarks()
      .filter(({ material, mark }) => occurrences(material, mark.text) === 0)
      .map(({ where, mark }) => `${where}: "${mark.text}"`)

    expect(orphans).toEqual([])
  })

  it('every marked fragment appears exactly once, so the screen cannot guess', () => {
    const ambiguous = allMarks()
      .map(({ where, material, mark }) => ({ where, mark, hits: occurrences(material, mark.text) }))
      .filter(({ hits }) => hits > 1)
      .map(({ where, mark, hits }) => `${where}: ${hits}× "${mark.text}"`)

    expect(ambiguous).toEqual([])
  })

  it('every mark carries the date it was checked and what was searched', () => {
    // A mark with no provenance is an opinion. The date is what tells a future
    // reader whether the check predates the source document they are holding.
    const undocumented = allMarks().filter(({ mark }) => {
      const dated = typeof mark.checked === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(mark.checked)
      const sourced = typeof mark.searched === 'string' && mark.searched.trim().length > 0
      return !dated || !sourced
    }).map(({ where }) => where)

    expect(undocumented).toEqual([])
  })

  it('a mark is a non-empty string of real words, never a blank or a whole step', () => {
    const malformed = allMarks().filter(({ material, mark }) => {
      if (typeof mark.text !== 'string' || mark.text.trim().length === 0) { return true }
      // A mark covering an entire step says the firm wrote none of it, which is
      // a P2 fabrication finding and not a commentary mark. Different problem,
      // different fix — do not let it hide in here.
      return (material.steps || []).some(step => step.trim() === mark.text.trim())
    }).map(({ where }) => where)

    expect(malformed).toEqual([])
  })

  it('Strategy carries the nine found in the 2026-08-14 sweep', () => {
    // Pinned deliberately. These nine are the worked example the mechanism
    // shipped with; losing them silently would leave the feature working and
    // empty, which looks identical to a clean domain.
    const strategy = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'strategy-domain-support.json'), 'utf8')
    )
    const count = strategy.materials
      .reduce((n, m) => n + (Array.isArray(m.authored_commentary) ? m.authored_commentary.length : 0), 0)

    expect(count).toBe(9)
  })
})
