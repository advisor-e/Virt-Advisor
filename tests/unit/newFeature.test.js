'use strict'

/**
 * Guards scripts/new-feature.js, and the invariant it exists to maintain.
 *
 * THE LAST BLOCK IS THE IMPORTANT ONE. The scaffolder can be tested all day and
 * still be worthless if a page can be added to design/features/ by hand and go
 * unlisted, or arrive without a History. So the final describe checks the FOLDER,
 * not the script: every Brief has its companion, and every Brief has a row in the
 * index. Whether it got there by command or by hand is not the test's business.
 *
 * That is the difference between testing the tool and testing the rule. The rule
 * is what people break.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const scaffold = require('../../scripts/new-feature')
const handbook = require('../../scripts/build-handbook')

const FEATURES_DIR = path.join(__dirname, '..', '..', 'design', 'features')

const removeTree = fs.rmSync
  ? dir => fs.rmSync(dir, { recursive: true, force: true })
  : dir => fs.rmdirSync(dir, { recursive: true })

/** A miniature index with the two shapes the real one uses: a headed table, and a headless one. */
const SAMPLE_INDEX = [
  '# Feature Briefs — the index',
  '',
  '## Start here',
  '',
  '| | |',
  '|---|---|',
  '| **[The To-Do List](to-do.md)** | The whole live list |',
  '',
  '## The AI engine',
  '',
  '| Brief | History |',
  '|---|---|',
  '| [Virtual Advisor](virtual-advisor.md) — the conversation screen | [history](virtual-advisor-history.md) |',
  '',
  '## Learning',
  '',
  '| Brief | History |',
  '|---|---|',
  '| [Course Builder](course-builder.md) | [history](course-builder-history.md) |',
  '',
  '---',
  '',
  '## Why this exists',
  '',
  'Prose, no table.',
  ''
].join('\n')

describe('starting a feature as a page', () => {
  describe('the file name', () => {
    it('makes a slug the Handbook index parser can actually see', () => {
      // parseIndex only matches [a-z0-9-]+.md — anything else is an invisible page.
      ;['Case Reviews', 'Logic-Lab Report', "The Adviser's Network", 'Groups & Messaging']
        .forEach((name) => {
          expect(scaffold.slugify(name)).toMatch(/^[a-z0-9-]+$/)
        })
    })

    it('spells an ampersand out rather than dropping it', () => {
      expect(scaffold.slugify('Groups & Messaging')).toBe('groups-and-messaging')
    })

    it('collapses punctuation and trims the edges', () => {
      expect(scaffold.slugify('  The Adviser’s Network!  ')).toBe('the-advisers-network')
    })
  })

  describe('the index row', () => {
    it('matches the format the existing rows use', () => {
      expect(scaffold.indexRow({ name: 'Adoption', slug: 'adoption', summary: 'mentor & middle tiers' }))
        .toBe('| [Adoption](adoption.md) — mentor & middle tiers | [history](adoption-history.md) |')
    })

    it('omits the em dash when there is nothing after it', () => {
      expect(scaffold.indexRow({ name: 'Quizzes', slug: 'quizzes', summary: '' }))
        .toBe('| [Quizzes](quizzes.md) | [history](quizzes-history.md) |')
    })
  })

  describe('where the row lands', () => {
    it('goes at the foot of the named group, not the top of the file', () => {
      const next = scaffold.insertRow(SAMPLE_INDEX, 'Learning', '| ROW |')
      const lines = next.split('\n')
      expect(lines[lines.indexOf('| [Course Builder](course-builder.md) | [history](course-builder-history.md) |') + 1])
        .toBe('| ROW |')
    })

    it('does not disturb any other group', () => {
      const next = scaffold.insertRow(SAMPLE_INDEX, 'Learning', '| ROW |')
      expect(next).toContain('| [Virtual Advisor](virtual-advisor.md) — the conversation screen |')
      expect(next.split('| ROW |')).toHaveLength(2)
    })

    it('matches the heading whatever its case', () => {
      expect(scaffold.insertRow(SAMPLE_INDEX, 'learning', '| ROW |')).toContain('| ROW |')
    })

    it('refuses an unknown group, and says what the groups are', () => {
      // A typo must never invent a navigation group: on screen a group of one
      // page looks exactly like a real category.
      expect(() => scaffold.insertRow(SAMPLE_INDEX, 'Lerning', '| ROW |'))
        .toThrow(/No group "Lerning"[\s\S]*The AI engine[\s\S]*Learning/)
    })

    it('refuses a section that has no table', () => {
      expect(() => scaffold.insertRow(SAMPLE_INDEX, 'Why this exists', '| ROW |'))
        .toThrow(/no table/)
    })
  })

  describe('the groups it offers', () => {
    // Offering a choice that is then refused costs a person a whole attempt to
    // discover — the same fault as a link that goes nowhere.
    it('offers only groups a page can actually be filed under', () => {
      expect(scaffold.targetGroupsIn(SAMPLE_INDEX)).toEqual(['The AI engine', 'Learning'])
    })

    it('offers every real group in the live index, and nothing else', () => {
      const index = fs.readFileSync(path.join(FEATURES_DIR, 'README.md'), 'utf8')
      const offered = scaffold.targetGroupsIn(index)

      expect(offered).not.toContain('Start here')
      expect(offered).not.toContain('Why this exists')
      expect(offered).toContain('The AI engine')
      expect(offered.length).toBeGreaterThan(4)
      offered.forEach(group => expect(index).toContain('## ' + group))
    })
  })

  describe('creating the pair', () => {
    let dir

    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-'))
      fs.writeFileSync(path.join(dir, 'README.md'), SAMPLE_INDEX, 'utf8')
    })

    afterEach(() => removeTree(dir))

    const read = name => fs.readFileSync(path.join(dir, name), 'utf8')

    it('writes a Brief, a History and the row', () => {
      const made = scaffold.create({ name: 'Case Reviews', group: 'Learning', summary: 'what a firm reviews', dir })

      expect(made.slug).toBe('case-reviews')
      expect(fs.existsSync(path.join(dir, 'case-reviews.md'))).toBe(true)
      expect(fs.existsSync(path.join(dir, 'case-reviews-history.md'))).toBe(true)
      expect(read('README.md')).toContain(
        '| [Case Reviews](case-reviews.md) — what a firm reviews | [history](case-reviews-history.md) |'
      )
    })

    it('writes the five sections every other Brief uses', () => {
      scaffold.create({ name: 'Case Reviews', group: 'Learning', dir })
      const brief = read('case-reviews.md')

      expect(brief).toContain('# Case Reviews — the Brief')
      expect(brief).toContain('## 1. Design philosophy')
      expect(brief).toContain('## 2. Key principles — the non-negotiables')
      expect(brief).toContain('## 3. Design considerations')
      expect(brief).toContain('## 4. For the coder')
      expect(brief).toContain('## 5. Related briefs')
      expect(brief).toContain('**History:** [`case-reviews-history.md`](case-reviews-history.md)')
    })

    it('marks both pages as stubs, so neither can be quoted as a rule', () => {
      // A stub that reads like a finished Brief is worse than no page at all.
      scaffold.create({ name: 'Case Reviews', group: 'Learning', dir })
      expect(read('case-reviews.md')).toContain('NOT YET WRITTEN')
      expect(read('case-reviews-history.md')).toContain('Nothing has happened here yet')
    })

    it('points the History back at the Brief and says which one wins', () => {
      scaffold.create({ name: 'Case Reviews', group: 'Learning', dir })
      expect(read('case-reviews-history.md')).toContain('**the Brief wins**')
      expect(read('case-reviews-history.md')).toContain('## 2. Decisions taken and closed — do not reopen')
      expect(read('case-reviews-history.md')).toContain('## 3. Where the raw material is')
    })

    it('produces a page the Handbook generator pairs and navigates', () => {
      scaffold.create({ name: 'Case Reviews', group: 'Learning', dir })

      const known = new Set(fs.readdirSync(dir).map(name => name.replace(/\.md$/, '')))
      expect(handbook.companionOf('case-reviews', known)).toBe('case-reviews-history')

      const learning = handbook.parseIndex(read('README.md')).find(group => group.name === 'Learning')
      expect(learning.items).toContainEqual({ slug: 'case-reviews', title: 'Case Reviews' })
    })

    it('refuses to overwrite a Brief that already exists', () => {
      fs.writeFileSync(path.join(dir, 'case-reviews.md'), 'half-written', 'utf8')
      expect(() => scaffold.create({ name: 'Case Reviews', group: 'Learning', dir }))
        .toThrow(/already exists/)
      expect(read('case-reviews.md')).toBe('half-written')
    })

    it('refuses to overwrite a History that already exists', () => {
      fs.writeFileSync(path.join(dir, 'case-reviews-history.md'), 'half-written', 'utf8')
      expect(() => scaffold.create({ name: 'Case Reviews', group: 'Learning', dir }))
        .toThrow(/already exists/)
    })

    it('refuses a name the index has already claimed', () => {
      expect(() => scaffold.create({ name: 'Course Builder', group: 'Learning', dir }))
        .toThrow(/already listed/)
    })

    it('refuses a name that would collide with the companion suffix', () => {
      expect(() => scaffold.create({ name: 'Quizzes History', group: 'Learning', dir }))
        .toThrow(/-history suffix/)
    })

    it('refuses to file a feature under the index\'s own front matter', () => {
      expect(() => scaffold.create({ name: 'Case Reviews', group: 'Start here', dir }))
        .toThrow(/front matter/)
    })

    it('writes nothing at all when it refuses', () => {
      // A refusal that has already created one of the two files leaves the folder
      // in a state the next run also refuses to fix.
      const before = fs.readdirSync(dir).sort()
      expect(() => scaffold.create({ name: 'Case Reviews', group: 'Nowhere', dir })).toThrow()
      expect(fs.readdirSync(dir).sort()).toEqual(before)
      expect(read('README.md')).toBe(SAMPLE_INDEX)
    })
  })

  // ── The rule, not the tool ───────────────────────────────────────────────

  describe('every page in design/features/ obeys the rule', () => {
    const files = fs.readdirSync(FEATURES_DIR).filter(name => name.endsWith('.md'))
    const slugs = files.map(name => name.replace(/\.md$/, ''))
    const known = new Set(slugs)
    const index = fs.readFileSync(path.join(FEATURES_DIR, 'README.md'), 'utf8')

    /** Companions render inside their Brief's gate; they are not pages in their own right. */
    const companions = new Set(
      slugs.map(slug => handbook.companionOf(slug, known)).filter(Boolean)
    )
    const briefs = slugs.filter(slug => slug !== 'README' && !companions.has(slug))

    it('has at least one Brief to check', () => {
      expect(briefs.length).toBeGreaterThan(20)
    })

    it.each(briefs)('%s has a companion behind the gate', (slug) => {
      // A Brief with no History has nowhere to put the argument behind the rule,
      // so the argument goes on the Brief and the two start weighing the same.
      expect(handbook.companionOf(slug, known)).not.toBeNull()
    })

    it.each(briefs)('%s has a row in the index', (slug) => {
      // Unlisted pages still render, under "Unlisted" — but nobody reads a page
      // they cannot find in the rail.
      expect(index).toContain('(' + slug + '.md)')
    })
  })
})
