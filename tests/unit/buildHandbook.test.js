'use strict'

/**
 * Guards scripts/build-handbook.js and the approved Handbook design.
 *
 * THE FIRST BLOCK IS THE IMPORTANT ONE. On 2026-08-13 the Handbook was rebuilt
 * from a written description of itself because a note said the original had been
 * deleted. It had not — it was on disk — and the rebuild shipped a different
 * palette, a different structure, and lost the gate the index itself describes.
 * Every review gate passed, because every gate compares the code to the note and
 * nothing compared the build to the artefact.
 *
 * So the artefact is now pinned by test. Change the Handbook's look and this
 * suite goes red and names the file you are supposed to be building from. That
 * is a control; the paragraph above is only an explanation of why it exists.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const builder = require('../../scripts/build-handbook')

const ROOT = path.join(__dirname, '..', '..')
const FEATURES_DIR = path.join(ROOT, 'design', 'features')
const SHELL_PATH = path.join(ROOT, 'scripts', 'handbook-shell.html')

describe('the Handbook', () => {
  let result
  let html
  let shell
  let outPath

  beforeAll(() => {
    shell = fs.readFileSync(SHELL_PATH, 'utf8')
    outPath = path.join(os.tmpdir(), 'handbook-test-' + process.pid + '.html')
    result = builder.build(outPath)
    html = fs.readFileSync(outPath, 'utf8')
  })

  afterAll(() => {
    if (fs.existsSync(outPath)) {
      fs.unlinkSync(outPath)
    }
  })

  describe('the approved design is the one that ships', () => {
    // These are the values in the artefact Mike read and edited. If a change is
    // ever wanted, it is made in scripts/handbook-shell.html and these numbers
    // follow — never the other way round, and never by rewriting the shell.
    it('keeps the Advisor-e palette', () => {
      expect(shell).toContain('--ink: #002b64')
      expect(shell).toContain('--accent: #0070c0')
      expect(shell).toContain('--accent-bright: #00b1e0')
      expect(shell).toContain('--ground: #eef3f8')
    })

    it('keeps the report standard\'s width and card radius', () => {
      expect(shell).toContain('max-width: 1120px')
      expect(shell).toContain('--radius: 14px')
    })

    it('keeps the History behind a gate inside the Brief, as the index says it does', () => {
      // design/features/README.md tells readers the Handbook has "the history
      // behind a gate". A History rendered as its own page contradicts the
      // document it is generated from.
      expect(fs.readFileSync(path.join(FEATURES_DIR, 'README.md'), 'utf8'))
        .toContain('history behind a gate')
      expect(html).toContain('<details class="gate">')
      expect(html).toContain('The History — why these rules exist')
      expect(html).toContain('If this and the page above disagree, the page above wins.')
      expect(html).not.toMatch(/<article class="page" id="page-[a-z0-9-]+-history"/)
    })

    it('keeps edits through a reload, and offers them as a file', () => {
      expect(shell).toContain('localStorage')
      expect(shell).toContain('window.claude.downloads')
    })

    it('renders both themes from tokens, never inside the media query alone', () => {
      expect(shell).toContain('@media (prefers-color-scheme: dark)')
      expect(shell).toContain(':root:not([data-theme="light"])')
      expect(shell).toContain(':root[data-theme="dark"]')
    })
  })

  describe('nothing is silently dropped', () => {
    it('accounts for every markdown file — as a page, a gate, or the index', () => {
      const known = new Set(result.pages.map(page => page.slug))
      result.pages.forEach((page) => {
        if (page.companion) {
          known.add(page.companion)
        }
      })
      known.add('README')

      const missing = result.files
        .map(name => name.replace(/\.md$/, ''))
        .filter(slug => !known.has(slug))

      expect(missing).toEqual([])
    })

    it('reports any page the index has forgotten rather than hiding it', () => {
      // Today every page is listed. If this fails, add the named page to
      // README.md — do not relax the assertion.
      expect(result.unlisted).toEqual([])
    })

    it('renders a page listed under two groups exactly once', () => {
      // Quizzes, the Hub and Adviser Network each appear twice in the index.
      const ids = html.match(/id="page-[a-z0-9-]+"/g) || []
      expect(ids.length).toBe(new Set(ids).size)

      // The count is DERIVED, never typed. A literal here was correct on the day
      // it was written and would have gone red on the first page `npm run feature`
      // added — a failure saying nothing except that the number had moved. What
      // is actually being asserted is the relationship: every distinct entry in
      // the index becomes exactly one page, and no page is invented.
      const distinct = new Set()
      result.groups.forEach(group => group.items.forEach(item => distinct.add(item.slug)))
      expect(result.pages).toHaveLength(distinct.size)
      expect(distinct.size).toBeGreaterThan(20)
    })

    it('gives every page the id and data-page the shell looks for', () => {
      result.pages.forEach((page) => {
        expect(html).toContain('id="page-' + page.slug + '" data-page="' + page.slug + '"')
      })
    })
  })

  describe('the substitution slots', () => {
    it('leaves no slot unfilled', () => {
      builder.PLACEHOLDERS.forEach(slot => expect(html).not.toContain(slot))
    })

    // Replacement fills the FIRST occurrence only, so a second slot anywhere in
    // the shell — a comment will do — swallows the whole page and the build
    // still reports success. That happened.
    it('refuses to build when a slot appears twice', () => {
      expect(() => builder.substitute('<!--NAV--> and <!--NAV-->', '<!--NAV-->', 'x'))
        .toThrow(/exactly once — found 2/)
    })

    it('refuses to build when a slot is missing', () => {
      expect(() => builder.substitute('<p>no slot</p>', '<!--NAV-->', 'x'))
        .toThrow(/exactly once — found 0/)
    })

    it('substitutes content containing $ patterns literally', () => {
      expect(builder.substitute('a <!--NAV--> b', '<!--NAV-->', '$& $1 $$')).toBe('a $& $1 $$ b')
    })

    it('carries no doctype, html, head or body tag — the publisher adds those', () => {
      expect(html).not.toMatch(/<!doctype/i)
      expect(html).not.toMatch(/<html[\s>]/i)
      expect(html).not.toMatch(/<body[\s>]/i)
    })
  })

  describe('links', () => {
    it('turns a link to another feature page into in-page navigation', () => {
      expect(builder.relink('<a href="tier-cascade.md">x</a>')).toBe('<a href="#tier-cascade">x</a>')
    })

    it('turns a link that leaves the folder into an informational file link', () => {
      expect(builder.relink('<a href="../ACTIONS.md">x</a>'))
        .toBe('<a href="#" data-file="ACTIONS.md" class="filelink">x</a>')
      expect(builder.relink('<a href="../../server/routes/report.js">x</a>'))
        .toBe('<a href="#" data-file="server/routes/report.js" class="filelink">x</a>')
    })

    it('leaves no relative path in an href, except the one below', () => {
      const survivors = (html.match(/href="\.\.[^"]*"/g) || [])
      expect(survivors).toEqual([])
    })

    // A link to the parent FOLDER — [`../i18n-*`](../) in
    // localisation-and-currency-history.md — used to survive relink() because the
    // pattern demanded at least one character after '../', leaving the one link in
    // the Handbook that rendered as a link and did nothing when clicked. Fixed
    // 2026-08-15 on Mike's yes: [^"]+ → [^"]*. It now reads as a file reference
    // like every other link that leaves the folder.
    it('converts a link to the parent folder itself', () => {
      expect(builder.relink('<a href="../">x</a>'))
        .toBe('<a href="#" data-file="" class="filelink">x</a>')
    })
  })

  describe('the index drives the navigation', () => {
    it('reads its groups from README.md rather than a list in the script', () => {
      const readme = fs.readFileSync(path.join(FEATURES_DIR, 'README.md'), 'utf8')
      result.groups.forEach(group => expect(readme).toContain('## ' + group.name))
    })

    it('drops the tables\' own header rows', () => {
      const titles = result.groups.reduce((all, group) => all.concat(group.items.map(i => i.title)), [])
      expect(titles).not.toContain('Brief')
      expect(titles).not.toContain('History')
    })

    it('points every navigation entry at a page that was rendered', () => {
      const slugs = result.pages.map(page => page.slug)
      result.groups.forEach((group) => {
        group.items.forEach(item => expect(slugs).toContain(item.slug))
      })
    })
  })

  describe('the gate\'s companion page', () => {
    it('pairs a Brief with its History', () => {
      expect(builder.companionOf('quizzes', new Set(['quizzes-history']))).toBe('quizzes-history')
    })

    it('pairs the To-Do List with done-and-parked instead', () => {
      expect(builder.companionOf('to-do', new Set(['to-do-done-and-parked']))).toBe('to-do-done-and-parked')
    })

    it('returns null when a page has no companion', () => {
      expect(builder.companionOf('model-library', new Set())).toBeNull()
    })
  })

  describe('the page body', () => {
    it('strips the leading heading, because the shell renders its own', () => {
      expect(builder.body('# Quizzes — the Brief\n\nText.\n')).toBe('\nText.\n')
    })
  })
})
