'use strict'

/**
 * Starts a feature the way this project requires one to be started: as a page in
 * the Handbook, before any code exists.
 *
 * WHAT IT DOES. Creates design/features/<slug>.md (the Brief) and
 * <slug>-history.md (the History) from the standard skeleton every other page
 * follows, and adds the row to design/features/README.md — which is the single
 * source of the Handbook's navigation, so the page is reachable the moment it is
 * created rather than whenever somebody remembers to list it.
 *
 * WHY IT IS A COMMAND AND NOT A DISCIPLINE. The rule "a new feature starts as a
 * page" is in handbook.md §2.5, and rules of that shape are kept by remembering
 * them. Every part of the setup that a person has to remember is a part that
 * eventually gets skipped under time pressure — and the page that gets skipped is
 * the one for the feature that was rushed, which is the one that most needed it.
 * Typing one command is faster than writing the page by hand, so the compliant
 * route is also the lazy route. That is the only kind of rule that holds.
 *
 * WHAT IT REFUSES TO DO, and why each refusal is deliberate:
 *  - It never overwrites an existing page. A half-written Brief silently replaced
 *    by a fresh stub is a worse outcome than any error message.
 *  - It refuses an unknown group rather than inventing a heading. A typo would
 *    otherwise create a second navigation group with one page in it, which reads
 *    on screen as a real category.
 *  - It refuses a name whose slug ends in `-history`, because the generator pairs
 *    a Brief with its companion by that exact suffix.
 *
 * WHAT IT DELIBERATELY LEAVES UNDONE. The pages it writes are stubs and say so at
 * the top, in a warning meant to be deleted by whoever fills them in. It does not
 * try to draft the content: a plausible-sounding Brief nobody wrote is precisely
 * the failure this folder exists to prevent.
 *
 * Run:  npm run feature "Case Reviews" "Hub pages — mentor & firm" "what it is, in a clause"
 *       npm run feature "Case Reviews"      (lists the groups and stops)
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const FEATURES_DIR = path.join(ROOT, 'design', 'features')
const INDEX_FILE = 'README.md'

/** Groups that exist for navigation but are not a home for a new feature page. */
const NOT_A_TARGET = ['start here']

/**
 * Turns a display name into the file slug.
 *
 * The Handbook's index parser only recognises a link whose target matches
 * [a-z0-9-]+.md, so anything this produces outside that set would create a page
 * the navigation cannot see. It is therefore validated, not merely tidied.
 *
 * @param {string} name  e.g. 'Case Reviews & Rulings'
 * @returns {string}     e.g. 'case-reviews-and-rulings'
 */
function slugify (name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * The navigation groups the index currently defines.
 *
 * @param {string} indexMarkdown  contents of design/features/README.md
 * @returns {string[]}  heading text, in document order
 */
function groupsIn (indexMarkdown) {
  const groups = []
  indexMarkdown.split(/\r?\n/).forEach((line) => {
    const heading = line.match(/^##\s+(.+?)\s*$/)
    if (heading) groups.push(heading[1])
  })
  return groups
}

/**
 * The groups a new feature can actually be filed under.
 *
 * The index has headings that are prose, not tables — "Why this exists" is one —
 * and it has "Start here", which is the Handbook's own front matter. Offering
 * either as a choice would be offering a choice that is then refused, which is
 * the same fault as a wrong link: it costs a person a whole attempt to discover.
 *
 * @param {string} indexMarkdown
 * @returns {string[]}
 */
function targetGroupsIn (indexMarkdown) {
  return groupsIn(indexMarkdown).filter((group) => {
    if (NOT_A_TARGET.indexOf(group.trim().toLowerCase()) !== -1) return false
    try {
      insertRow(indexMarkdown, group, '| probe |')
      return true
    } catch (error) {
      return false
    }
  })
}

/**
 * The index row for a new page, in the format every existing row uses.
 *
 * @param {{name: string, slug: string, summary: string}} page
 * @returns {string}
 */
function indexRow (page) {
  const label = '[' + page.name + '](' + page.slug + '.md)'
  const described = page.summary ? label + ' — ' + page.summary : label
  return '| ' + described + ' | [history](' + page.slug + '-history.md) |'
}

/**
 * Inserts a row at the foot of a group's table.
 *
 * Appending rather than sorting is deliberate: the tables are in the order
 * somebody chose, and re-sorting them would produce a diff nobody asked for on
 * every single run.
 *
 * @param {string} indexMarkdown  contents of README.md
 * @param {string} group          the heading to file under, matched case-insensitively
 * @param {string} row            the row to insert
 * @returns {string}              the new contents
 * @throws if the group is unknown, or its section holds no table
 */
function insertRow (indexMarkdown, group, row) {
  const lines = indexMarkdown.split(/\r?\n/)
  const wanted = String(group).trim().toLowerCase()

  let start = -1
  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^##\s+(.+?)\s*$/)
    if (heading && heading[1].trim().toLowerCase() === wanted) {
      start = i
      break
    }
  }
  if (start === -1) {
    throw new Error(
      'No group "' + group + '" in ' + INDEX_FILE + '. The groups are:\n  ' +
      groupsIn(indexMarkdown).filter(g => NOT_A_TARGET.indexOf(g.trim().toLowerCase()) === -1).join('\n  ') +
      '\n\nA new group is a change to how the Handbook is organised — make it in ' +
      INDEX_FILE + ' first, deliberately, then run this again.'
    )
  }

  let end = lines.length
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      end = i
      break
    }
  }

  let lastRow = -1
  for (let i = start + 1; i < end; i += 1) {
    if (lines[i].charAt(0) === '|') lastRow = i
  }
  if (lastRow === -1) {
    throw new Error('The group "' + group + '" in ' + INDEX_FILE + ' has no table to add a row to.')
  }

  lines.splice(lastRow + 1, 0, row)
  return lines.join('\n')
}

// ── The two pages ──────────────────────────────────────────────────────────

/**
 * The Brief skeleton — the five sections every page in this folder uses.
 *
 * The prompts under each heading say what the section is for. They are written to
 * be deleted, and the stub warning at the top is written to be deleted last.
 *
 * @param {{name: string, slug: string, summary: string}} page
 * @returns {string}
 */
function briefTemplate (page) {
  const summary = page.summary || 'One sentence: what this is, and who uses it.'
  return [
    '# ' + page.name + ' — the Brief',
    '',
    '> ⚠ **NOT YET WRITTEN — this page is a stub.** It was created before the code, which is the',
    '> point of it; but nothing below has been decided. **Do not quote this page as a rule and do',
    '> not build from it while this warning is here.** Delete the warning when the page is real.',
    '>',
    '> **' + summary + '** Current rules only; the history is in',
    '> [`' + page.slug + '-history.md`](' + page.slug + '-history.md).',
    '>',
    '> **Covers:** … **Does not cover:** …',
    '',
    '---',
    '',
    '## 1. Design philosophy',
    '',
    '*The one idea somebody has to hold to make good decisions about this — why it exists and what',
    'it is for. Not a list of what it does.*',
    '',
    '---',
    '',
    '## 2. Key principles — the non-negotiables',
    '',
    '*The rules that must not be broken. One per paragraph, and each one says what goes wrong if it',
    'is ignored — a rule with no consequence attached gets traded away the first time it is',
    'inconvenient.*',
    '',
    '**P1 · …**',
    '',
    '---',
    '',
    '## 3. Design considerations',
    '',
    '*The judgement calls. What is deliberate but looks wrong, what a newcomer would reasonably',
    'change and should not, and what has already been tried and rejected.*',
    '',
    '---',
    '',
    '## 4. For the coder',
    '',
    '| Piece | Path |',
    '|---|---|',
    '| … | `…` |',
    '',
    '**Traps.** *What has already bitten somebody here.*',
    '',
    '**Known state.** *What is built, what is not, and what has never been run against anything',
    'real. Say it plainly — an unstated gap reads as a finished feature.*',
    '',
    '---',
    '',
    '## 5. Related briefs',
    '',
    '*The Briefs this one touches, each with a clause saying how.*',
    '',
    '---',
    '',
    '**History:** [`' + page.slug + '-history.md`](' + page.slug + '-history.md)',
    ''
  ].join('\n')
}

/**
 * The History skeleton.
 *
 * Two of its sections are fixed because every History has them: the closed
 * decisions, and where the raw material lives. The rest is written as things
 * happen.
 *
 * @param {{name: string, slug: string}} page
 * @returns {string}
 */
function historyTemplate (page) {
  return [
    '# ' + page.name + ' — the History',
    '',
    '> **Read [`' + page.slug + '.md`](' + page.slug + '.md) first.** That page is the rules. If the',
    '> two disagree, **the Brief wins**.',
    '>',
    '> ⚠ **Nothing has happened here yet.** This page was created alongside the Brief, before any',
    '> code. It fills up as decisions are taken — it is not written in one sitting.',
    '',
    '---',
    '',
    '## 1. Why this was built',
    '',
    '*What was asked for, who asked for it, and what problem it was meant to solve. Written once,',
    'at the start, while the answer is still known.*',
    '',
    '---',
    '',
    '## 2. Decisions taken and closed — do not reopen',
    '',
    '| Decision | Ruling | Date |',
    '|---|---|---|',
    '| … | … | … |',
    '',
    '---',
    '',
    '## 3. Where the raw material is',
    '',
    '*The mockups, workbooks, session notes and code comments this page was written from — named,',
    'not summarised, so anybody can go and read the original.*',
    ''
  ].join('\n')
}

// ── Creation ───────────────────────────────────────────────────────────────

/**
 * Creates the Brief, the History and the index row.
 *
 * Nothing is written until every check has passed, so a refusal never leaves half
 * a feature on disk.
 *
 * @param {object} options
 * @param {string} options.name     display name, e.g. 'Case Reviews'
 * @param {string} options.group    an existing heading in README.md
 * @param {string} [options.summary]  the clause after the em dash in the index row
 * @param {string} [options.dir]    the features directory; overridden by the tests
 * @returns {{slug: string, brief: string, history: string, index: string, row: string}}
 * @throws with a message meant to be read by a person, on any refusal
 */
function create (options) {
  const dir = options.dir || FEATURES_DIR
  const name = String(options.name || '').trim()
  if (!name) throw new Error('A feature needs a name.')

  const slug = slugify(name)
  if (!slug) {
    throw new Error('"' + name + '" produces no usable file name. Use letters and numbers.')
  }
  if (/-history$/.test(slug)) {
    throw new Error(
      '"' + name + '" would be filed as ' + slug + '.md, and the Handbook pairs a Brief with its ' +
      'companion by that exact -history suffix. Name it something else.'
    )
  }

  const briefPath = path.join(dir, slug + '.md')
  const historyPath = path.join(dir, slug + '-history.md')
  const indexPath = path.join(dir, INDEX_FILE)

  if (fs.existsSync(briefPath)) {
    throw new Error(slug + '.md already exists. Edit it — this command will not overwrite a page.')
  }
  if (fs.existsSync(historyPath)) {
    throw new Error(slug + '-history.md already exists. Edit it — this command will not overwrite a page.')
  }

  const indexMarkdown = fs.readFileSync(indexPath, 'utf8')
  if (indexMarkdown.indexOf('(' + slug + '.md)') !== -1) {
    throw new Error(slug + '.md is already listed in ' + INDEX_FILE + ', so something already claims that name.')
  }

  const group = String(options.group || '').trim()
  if (NOT_A_TARGET.indexOf(group.toLowerCase()) !== -1) {
    throw new Error('"' + group + '" is the Handbook\'s own front matter, not a home for a feature.')
  }

  const summary = String(options.summary || '').trim()
  const row = indexRow({ name: name, slug: slug, summary: summary })
  const nextIndex = insertRow(indexMarkdown, group, row)

  fs.writeFileSync(briefPath, briefTemplate({ name: name, slug: slug, summary: summary }), 'utf8')
  fs.writeFileSync(historyPath, historyTemplate({ name: name, slug: slug }), 'utf8')
  fs.writeFileSync(indexPath, nextIndex, 'utf8')

  return { slug: slug, brief: briefPath, history: historyPath, index: indexPath, row: row }
}

// ── Console ────────────────────────────────────────────────────────────────

function usage (message) {
  const index = fs.readFileSync(path.join(FEATURES_DIR, INDEX_FILE), 'utf8')
  const groups = targetGroupsIn(index)

  console.error('')
  if (message) console.error('  ' + message)
  console.error('')
  console.error('  npm run feature "<name>" "<group>" ["<one-line summary>"]')
  console.error('')
  console.error('  The groups, exactly as the index spells them:')
  groups.forEach(group => console.error('    "' + group + '"'))
  console.error('')
  process.exitCode = 1
}

if (require.main === module) {
  const [name, group, summary] = process.argv.slice(2)

  if (!name) {
    usage('Name the feature.')
  } else if (!group) {
    usage('Which group does "' + name + '" belong in? Filing it wrongly is worse than asking.')
  } else {
    try {
      const made = create({ name: name, group: group, summary: summary })
      console.log('')
      console.log('  ' + name + ' now has a page.')
      console.log('    Brief    design/features/' + made.slug + '.md')
      console.log('    History  design/features/' + made.slug + '-history.md')
      console.log('    Listed   under "' + group + '" in design/features/' + INDEX_FILE)
      console.log('')
      console.log('  Both pages are stubs and say so at the top. Write the Brief before the code,')
      console.log('  then `npm run handbook` and republish to the existing Handbook URL.')
      console.log('')
    } catch (error) {
      console.error('')
      console.error('  ' + error.message)
      console.error('')
      process.exitCode = 1
    }
  }
}

module.exports = {
  create,
  slugify,
  groupsIn,
  targetGroupsIn,
  indexRow,
  insertRow,
  briefTemplate,
  historyTemplate,
  FEATURES_DIR,
  INDEX_FILE
}
