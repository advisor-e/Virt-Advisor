'use strict'

/**
 * THE AI MUST BE ABLE TO TELL THE FIRM'S METHOD FROM OUR COMMENTARY ABOUT IT.
 *
 * P6 of design/features/domain-support-provenance.md: "the AI is told which is
 * which. The point of the exercise is lost if both arrive looking identical."
 *
 * The shape is deliberate and is what the approved artefact
 * (design/mockups/domain-support-authored-commentary.html §5) draws:
 *
 *   - the steps reach the model UNCHANGED, so the method still reads as one
 *     instruction rather than a sentence broken by a label
 *   - a short block AFTER them names what was ours
 *   - a material with no marks renders exactly as it did before, so nothing
 *     that reads these files today changes behaviour
 *
 * Both prompt paths are covered — the advisor engine and the course session —
 * because both format materials through the same function and a change to one
 * must not quietly miss the other.
 */

const {
  formatDomainSupportForPrompt,
  formatDomainContextForSession,
  livingCommentary
} = require('~/server/utils/domainSupport')

const HEADING = "**Not the firm's own words — commentary added by Advisor-e."

describe('authored commentary in the prompt', () => {
  it('names our two clauses under the Profit Levers material', () => {
    const prompt = formatDomainSupportForPrompt('strategy', null)

    expect(prompt).toContain(HEADING)
    expect(prompt).toContain('- "so purchasing blockages are removed rather than competed against"')
    expect(prompt).toContain('- "which is what captures accumulative incremental growth rather than one large bet"')
  })

  it('leaves the firm\'s steps completely unchanged', () => {
    const prompt = formatDomainSupportForPrompt('strategy', null)

    // The whole sentence, tail included, still reads as one step. Marking is an
    // attribution, never an edit.
    expect(prompt).toContain(
      '4. Sort against the 8 Profit Levers: place the post-it notes under the corresponding lever, ' +
      'which is what captures accumulative incremental growth rather than one large bet.'
    )
  })

  it('puts the block after the steps, not inside them', () => {
    // Scoped to one material: several areas carry marks, so searching the whole
    // prompt would compare this material's last step against a different
    // material's block and pass or fail by ordering accident.
    const prompt = formatDomainSupportForPrompt('strategy', null)
    const start = prompt.indexOf('### Profit Levers & Blue Ocean')
    const end = prompt.indexOf('###', start + 3)
    const section = prompt.slice(start, end === -1 ? undefined : end)

    const lastStep = section.indexOf('5. Create the action plan')
    const block = section.indexOf(HEADING)

    expect(lastStep).toBeGreaterThan(-1)
    expect(block).toBeGreaterThan(lastStep)
  })

  it('reaches the course session path too', () => {
    const prompt = formatDomainContextForSession('strategy', null)

    expect(prompt).toContain(HEADING)
    expect(prompt).toContain('- "set before the trial starts, not judged after it"')
  })

  it('says nothing at all for a material with no marks', () => {
    // strategy-business-targets and strategy-orientation-part-2 were traced to
    // the source in full. A clean material must render as it always did.
    const prompt = formatDomainSupportForPrompt('strategy', null)
    const start = prompt.indexOf('### Business Targets')
    const end = prompt.indexOf('###', start + 3)
    const section = prompt.slice(start, end === -1 ? undefined : end)

    expect(section.length).toBeGreaterThan(0)
    expect(section).not.toContain(HEADING)
  })

  it('an area with no marks anywhere is byte-for-byte what it was', () => {
    // The regression guard for "additive": every one of the other 28 areas is
    // untouched by this feature until it is swept.
    const prompt = formatDomainSupportForPrompt('eoy', null)

    expect(prompt).not.toContain(HEADING)
  })
})

describe('livingCommentary — a mark only counts while its words are there', () => {
  const material = {
    summary: 'A summary with no marks in it.',
    steps: ['Do the thing, so the reason is clear.', 'Then do the next thing.'],
    authored_commentary: [
      { text: 'so the reason is clear', checked: '2026-08-14', searched: 'all 115 firm documents' }
    ]
  }

  it('returns a mark whose words are present', () => {
    expect(livingCommentary(material)).toEqual(['so the reason is clear'])
  })

  it('drops a mark whose sentence has been rewritten', () => {
    const edited = Object.assign({}, material, { steps: ['Do the thing.', 'Then do the next thing.'] })

    // This is the firm-edit case the screen shows: rewrite the sentence and the
    // words become yours, so the attribution retires itself rather than
    // pointing at text nobody wrote. No test can reach a firm's stored copy —
    // this check is what keeps it honest there.
    expect(livingCommentary(edited)).toEqual([])
  })

  it('finds a mark in the summary, not only in steps', () => {
    const inSummary = {
      summary: 'A summary, which we added a gloss to.',
      steps: [],
      authored_commentary: [{ text: 'which we added a gloss to' }]
    }

    expect(livingCommentary(inSummary)).toEqual(['which we added a gloss to'])
  })

  it('ignores a blank, a missing list and a malformed entry', () => {
    expect(livingCommentary(null)).toEqual([])
    expect(livingCommentary({ steps: ['a'] })).toEqual([])
    expect(livingCommentary({ steps: ['a'], authored_commentary: 'nope' })).toEqual([])
    expect(livingCommentary({ steps: ['a'], authored_commentary: [{ text: '   ' }, null] })).toEqual([])
  })
})
