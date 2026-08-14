'use strict'

/**
 * Generates the Advisor-e Handbook — every page in design/features/ turned into
 * ONE navigable, editable page.
 *
 * WHAT THIS IS. The Handbook's design is scripts/handbook-shell.html, restored
 * byte-for-byte from the original that Mike read and edited on 2026-08-13. It is
 * the approved artefact and this script does not second-guess it: the shell owns
 * the look, the gate, the edit bar and the save; this script only assembles the
 * markdown into the markup the shell expects.
 *
 * WHY IT LIVES IN THE REPO. The original generator was written into a
 * session-scoped scratchpad, and the record then said it had been deleted. It
 * had not — but a tool that only one machine, on one day, can find is not a
 * tool. It is versioned here so that cannot recur.
 *
 * THREE THINGS THIS FIXES IN THE ORIGINAL, none of them cosmetic:
 *  1. The original typed its 24 pages and their groups into the script by hand,
 *     so a new Brief stayed invisible until somebody remembered it — and its
 *     groups had ALREADY drifted from design/features/README.md. The navigation
 *     is now read from that index, which is the document people actually edit.
 *  2. The original hardcoded 'c:/Users/mb/Projects/Virt Advisor', so it ran on
 *     this laptop and nowhere else. Paths are now relative to the repo.
 *  3. The original substituted its slots with String.replace, which fills the
 *     FIRST match only. See substitute().
 *
 * Run:  npm run handbook            (writes to the OS temp directory)
 *       npm run handbook -- <path>  (writes where you say)
 *
 * Then publish the written file as an Artifact, updating the EXISTING handbook
 * URL rather than creating a second one.
 *
 * THE TO-DO PAGE IS THE ONE EXCEPTION to "markdown in, prose out". Its ranked
 * table is replaced by a mount point, and design/features/to-do-items.json rides
 * along as a data island, so the shell can render Mike's ranking as a control he
 * can re-order, score and comment on rather than a table he can only read. The
 * two must never both appear: the table is a second copy of his ranking, and a
 * stale copy is the one a reader trusts. mountQueue() enforces that.
 *
 * WHAT IT DOES NOT DO, stated here rather than discovered later:
 *  - It never writes to design/. It only reads the repo.
 *  - A link that leaves design/features/ (../ACTIONS.md, ../../server/…) has no
 *    destination inside one page. As in the original it becomes a .filelink,
 *    which keeps its words and names the file when clicked.
 *  - A cross-page link carrying a section anchor (foo.md#3.2) lands on the page,
 *    not the section. Section anchors are not generated.
 *  - A page the index has forgotten is still rendered, under "Unlisted", and
 *    reported on the console. Silently dropping a page is the one failure this
 *    generator must never have.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const FEATURES_DIR = path.join(ROOT, 'design', 'features')
const SHELL_PATH = path.join(__dirname, 'handbook-shell.html')
const INDEX_SLUG = 'README'

/** The page whose ranked table becomes the ranking control. */
const QUEUE_SLUG = 'to-do'
const QUEUE_DATA_PATH = path.join(FEATURES_DIR, 'to-do-items.json')

const DEFAULT_OUT = path.join(os.tmpdir(), 'advisor-e-handbook.html')

const MarkdownIt = require(path.join(ROOT, 'node_modules', 'markdown-it'))
const md = new MarkdownIt({ html: false, linkify: false, typographer: false })

/** The shell's substitution slots. Each must appear EXACTLY once — see substitute(). */
const PLACEHOLDERS = ['<!--NAV-->', '<!--PAGES-->', '<!--COUNT-->', '<!--QUEUE-->']

/**
 * Replaces a slot in the shell, refusing to guess when the slot is not where it
 * should be.
 *
 * This is a control, not a nicety. `String.replace` with a string pattern fills
 * the FIRST occurrence only. A rebuild of this generator put the placeholder
 * names in the shell's own opening comment, so every article was substituted
 * into the comment: a 412 KB page, no error, and nothing on screen. Counting the
 * occurrences is the only thing that catches it.
 *
 * @param {string} shell        the template
 * @param {string} placeholder  the slot, e.g. '<!--NAV-->'
 * @param {string} value        what replaces it
 * @returns {string}
 * @throws if the slot is missing, or appears more than once
 */
function substitute (shell, placeholder, value) {
  const occurrences = shell.split(placeholder).length - 1
  if (occurrences !== 1) {
    throw new Error(
      'handbook-shell.html must contain ' + placeholder + ' exactly once — found ' +
      occurrences + '. Substitution fills the first occurrence only, so a second ' +
      'one (in a comment, for instance) silently swallows the whole page.'
    )
  }
  return shell.replace(placeholder, () => value)
}

function escapeHtml (text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── The index drives the navigation ────────────────────────────────────────

/**
 * Parses design/features/README.md into the navigation.
 *
 * The index is the single source of the grouping: change a heading or a row
 * there and the Handbook's rail changes with it. Nothing about the groups is
 * hardcoded here, so the two cannot drift — which they had.
 *
 * A page listed in two groups (Quizzes, the Hub, Adviser Network all are) gets a
 * navigation entry in both and is RENDERED ONCE, under the first group it
 * appears in. Rendering it twice would put two elements on the same id.
 *
 * @param {string} markdown  the index file's contents
 * @returns {Array<{name: string, items: Array<{slug: string, title: string}>}>}
 */
function parseIndex (markdown) {
  const groups = []
  let current = null

  markdown.split(/\r?\n/).forEach(line => {
    const heading = line.match(/^##\s+(.+?)\s*$/)
    if (heading) {
      current = { name: heading[1], items: [] }
      groups.push(current)
      return
    }
    if (!current || line.charAt(0) !== '|') return
    if (/^\|[\s|:-]*\|?\s*$/.test(line)) return // separator row

    const cells = line.split('|').slice(1, -1)
    if (!cells.length) return

    const link = cells[0].match(/\[([^\]]+)\]\(([a-z0-9-]+)\.md[^)]*\)/i)
    if (!link) return // a header row, or a cell with no page in it

    const title = link[1].replace(/[*`]/g, '').trim()
    if (/^(brief|history)$/i.test(title)) return // the table's own header row

    current.items.push({ slug: link[2], title })
  })

  return groups.filter(group => group.items.length)
}

/**
 * The companion page that opens behind the gate at the foot of a Brief.
 * Every Brief has a `-history`; the To-Do List's companion is its done-and-parked
 * list instead, which is why this is a lookup and not a suffix.
 *
 * @param {string} slug
 * @param {Set<string>} known  slugs that exist in design/features/
 * @returns {string|null}
 */
function companionOf (slug, known) {
  if (slug === 'to-do' && known.has('to-do-done-and-parked')) return 'to-do-done-and-parked'
  const history = slug + '-history'
  return known.has(history) ? history : null
}

// ── Markdown → the markup the shell expects ────────────────────────────────

/** Strip the leading `# Title` line — the shell renders its own header. */
function body (markdown) {
  return markdown.replace(/^#\s+.*\r?\n/, '')
}

/**
 * Rewrites cross-links between feature files into in-page navigation, and turns
 * a link that leaves the folder into a .filelink — informational, not clickable
 * through to nowhere. Both behaviours are the original's, unchanged.
 */
function relink (html) {
  return html
    .replace(/href="([a-z0-9-]+)\.md"/g, 'href="#$1"')
    .replace(/href="\.\.\/\.\.\/([^"]+)"/g, 'href="#" data-file="$1" class="filelink"')
    .replace(/href="\.\.\/([^"]*)"/g, 'href="#" data-file="$1" class="filelink"')
}

/**
 * Removes a generator's own BEGIN/END markers from the markdown.
 *
 * markdown-it runs with `html: false`, so an HTML comment does not disappear —
 * it is escaped and shown to the reader as literal `<!-- BEGIN ... -->`. The
 * markers exist for scripts/apply-to-do.js and mean nothing to anybody reading
 * the page.
 */
function stripMarkers (markdown) {
  return markdown.replace(/^[ \t]*<!--\s*(?:BEGIN|END) GENERATED[^\n]*-->[ \t]*\r?\n?/gm, '')
}

function renderMarkdown (markdown) {
  return relink(md.render(stripMarkers(body(markdown))))
}

// ── The ranking control ────────────────────────────────────────────────────

/**
 * What the shell renders the control into. The words inside are what a reader
 * sees if the script never runs — the sections further down the page still hold
 * every item's why, risk and touches, so the page is degraded, not empty.
 */
const QUEUE_MOUNT =
  '<div class="queue" data-queue>' +
  '<p class="queue-fallback">The ranking control needs JavaScript. Every item below ' +
  'still carries its score, why, risk and who asked for it.</p>' +
  '</div>'

/**
 * The header cells that identify §1's ranked table. Both are required: §2's
 * scoring key also has a `Score` column, and matching that one instead would
 * delete the explanation of the scores and leave the ranking on screen twice.
 */
const RANKED_TABLE_MARKS = ['<th>Score</th>', '<th>Waiting on</th>']

/**
 * Replaces §1's ranked table with the control's mount point.
 *
 * Refusing to guess is the point. If the table cannot be found the build stops
 * rather than shipping a page carrying BOTH a live control and a hand-written
 * table of the same ranking — two copies of Mike's own ordering, one of which is
 * stale, with nothing on screen saying which.
 *
 * @param {string} html  the rendered To-Do page
 * @returns {string}
 * @throws if the page holds anything other than exactly one ranked table
 */
function mountQueue (html) {
  const tables = html.match(/<table>[\s\S]*?<\/table>/g) || []
  const ranked = tables.filter(table =>
    RANKED_TABLE_MARKS.every(mark => table.indexOf(mark) !== -1))

  if (ranked.length !== 1) {
    throw new Error(
      'design/features/' + QUEUE_SLUG + '.md must hold exactly one ranked table for the ' +
      'control to replace — found ' + ranked.length + '. It is the table whose header ' +
      'row reads `| # | Item | Score | Blocks | Waiting on |`. Shipping without this ' +
      'substitution would put the control and a hand-written copy of the same ranking ' +
      'on one page.'
    )
  }

  return html.replace(ranked[0], () => QUEUE_MOUNT)
}

/**
 * design/features/to-do-items.json, carried into the page for the shell to read.
 *
 * Parsed here rather than passed through as text so a malformed data file fails
 * the build with a JSON error, instead of producing a Handbook whose control is
 * silently empty.
 *
 * @returns {string} a JSON data island
 */
function renderQueueData () {
  const data = JSON.parse(fs.readFileSync(QUEUE_DATA_PATH, 'utf8'))

  // `<` cannot survive raw inside a script element — a `</script>` in any string
  // would end the island early. It only ever occurs inside JSON string values,
  // where < is the same character.
  return '<script type="application/json" id="queuedata">' +
    JSON.stringify(data).replace(/</g, '\\u003c') +
    '</script>'
}

/**
 * One feature page: the Brief, and its companion behind the gate.
 *
 * @param {{slug: string, title: string, group: string, companion: string|null}} page
 * @param {function(string): string} read  slug → markdown
 */
function renderPage (page, read) {
  let out = '<article class="page" id="page-' + page.slug + '" data-page="' + page.slug + '" hidden>'
  out += '<header class="pagehead"><div class="eyebrow">' + escapeHtml(page.group) +
    '</div><h1>' + escapeHtml(page.title) + '</h1></header>'
  const prose = renderMarkdown(read(page.slug))
  out += '<div class="prose">' +
    (page.slug === QUEUE_SLUG ? mountQueue(prose) : prose) +
    '</div>'

  if (page.companion) {
    const isToDo = page.slug === 'to-do'
    out += '<details class="gate"><summary>' +
      (isToDo ? 'Done &amp; parked' : 'The History — why these rules exist') +
      '</summary>' +
      '<p class="gate-hint">' +
      (isToDo
        ? 'Finished work, and everything parked by a decision of yours. Nothing here is live.'
        : 'Read the page above first. Nothing below is a current instruction. If this and the page above disagree, the page above wins.') +
      '</p>' +
      '<div class="prose history">' + renderMarkdown(read(page.companion)) + '</div></details>'
  }

  return out + '</article>'
}

/**
 * A navigation entry.
 *
 * The dot carries the "never opened" / "not opened in 3 weeks" marks the rail's
 * own legend explains and the shell's CSS styles. The original omitted the
 * element, so those two marks could never appear — the only deliberate change to
 * the original's output, made because the shell already asks for it.
 */
function renderNavLink (item) {
  return '<a class="navlink" href="#' + item.slug + '" data-slug="' + item.slug + '">' +
    '<span class="dot"></span>' + escapeHtml(item.title) + '</a>'
}

// ── Assembly ───────────────────────────────────────────────────────────────

function build (outPath) {
  const files = fs.readdirSync(FEATURES_DIR).filter(name => name.endsWith('.md'))
  const known = new Set(files.map(name => name.replace(/\.md$/, '')))
  const read = slug => fs.readFileSync(path.join(FEATURES_DIR, slug + '.md'), 'utf8')

  const groups = parseIndex(read(INDEX_SLUG))

  // Render each page once, under the first group that lists it.
  const pages = []
  const rendered = new Set()
  groups.forEach(group => group.items.forEach(item => {
    if (rendered.has(item.slug)) return
    rendered.add(item.slug)
    const companion = companionOf(item.slug, known)
    if (companion) rendered.add(companion)
    pages.push({ slug: item.slug, title: item.title, group: group.name, companion })
  }))

  // A page nothing points at is a page nobody will read. Never drop it silently.
  // The index itself is the source of the rail, not a page in it.
  const unlisted = Array.from(known)
    .filter(slug => slug !== INDEX_SLUG && !rendered.has(slug))
    .sort()
    .map(slug => ({ slug, title: slug, group: 'Unlisted', companion: null }))

  const allPages = pages.concat(unlisted)
  const navGroups = groups.concat(
    unlisted.length ? [{ name: 'Unlisted — not in the index', items: unlisted }] : []
  )

  const nav = navGroups.map(group =>
    '<div class="navgroup">' + escapeHtml(group.name) + '</div>' +
    group.items.map(renderNavLink).join('')
  ).join('')

  const values = {
    '<!--NAV-->': nav,
    '<!--PAGES-->': allPages.map(page => renderPage(page, read)).join(''),
    '<!--COUNT-->': String(allPages.length),
    '<!--QUEUE-->': renderQueueData()
  }

  const html = PLACEHOLDERS.reduce(
    (shell, placeholder) => substitute(shell, placeholder, values[placeholder]),
    fs.readFileSync(SHELL_PATH, 'utf8')
  )

  fs.writeFileSync(outPath, html, 'utf8')

  return {
    pages: allPages,
    groups: navGroups,
    unlisted,
    files,
    outPath,
    queueItems: JSON.parse(fs.readFileSync(QUEUE_DATA_PATH, 'utf8')).items.length,
    bytes: Buffer.byteLength(html)
  }
}

// ── Console report ─────────────────────────────────────────────────────────

if (require.main === module) {
  const outPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUT
  const result = build(outPath)

  const gated = result.pages.filter(page => page.companion).length
  const navCount = result.groups.reduce((total, group) => total + group.items.length, 0)

  console.log('')
  console.log('Advisor-e Handbook built.')
  console.log('  ' + result.pages.length + ' feature pages, ' + gated + ' with a history behind the gate')
  console.log('  ' + result.files.length + ' markdown files read from design/features/')
  console.log('  ' + result.groups.length + ' navigation groups, ' + navCount + ' entries, read from ' + INDEX_SLUG + '.md')
  console.log('  ' + result.queueItems + ' ranked items on the To-Do page, as a control rather than a table')
  console.log('  ' + Math.round(result.bytes / 1024) + ' KB written to ' + result.outPath)

  if (result.unlisted.length) {
    console.log('')
    console.log('  WARNING — ' + result.unlisted.length + ' page(s) are in the folder but not in the index.')
    console.log('  They are in the handbook under "Unlisted"; add them to ' + INDEX_SLUG + '.md:')
    result.unlisted.forEach(page => console.log('    - ' + page.slug + '.md'))
  }

  console.log('')
  console.log('  Next: publish this file as an Artifact, updating the EXISTING handbook URL.')
  console.log('')
}

module.exports = {
  build,
  parseIndex,
  companionOf,
  relink,
  body,
  stripMarkers,
  substitute,
  mountQueue,
  PLACEHOLDERS
}
