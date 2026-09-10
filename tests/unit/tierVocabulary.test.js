'use strict'

/**
 * THE SIX ROLE NAMES, AND THE FACT THAT THEY DO NOT SHIFT.
 *
 * Ordered by the owner on 2026-08-11, in his words: *"go back through the entire
 * cascade code and change all roles to exactly what the stated role is … and NEVER
 * allow this to shift. this is sloppy work and it's how fuck ups occur."*
 *
 * Two renames were made that day:
 *   • `global_manager`  → `global_group_manager` — the level runs a GLOBAL GROUP,
 *     and the short form had already produced a coined job title twice in one
 *     session, because a global group is a brand and the shortened value invited
 *     the shortcut.
 *
 * 🔴 THE RENAME DID NOT STOP THE COINED TITLES, AND THAT IS WHY THIS FILE SCANS FOR
 * THEM TOO (Mike, 2026-09-02). Both invented titles kept reappearing long after the
 * values were correct — including in a document addressed to the master coding team,
 * which asked them to wire two roles nobody has. They are written out ONLY in the
 * FORBIDDEN list below, which this file is exempt from, so there is exactly one place
 * in the repository where the wrong words exist and it is the place that bans them.
 *   • `client`          → `business_entity` — a business entity may have MORE THAN
 *     ONE person, so "client" cannot express the normal case. The advisor advises an
 *     entity; the entity has people.
 *
 * 🔴 WHY A TEST AND NOT A NOTE. The vocabulary lives as a literal array in
 * roles.js and is COPIED as a second literal in tierChain.js. That file's comment
 * has always claimed the two "can never drift into disagreeing" — a claim nothing
 * checked, which is exactly the shape of failure this repo keeps meeting: a rule
 * stated in prose, verified by nobody, true until the day it quietly is not. The
 * scan below is the half that matters most — it fails on a superseded spelling
 * ANYWHERE in the source, so a name cannot creep back in via a file no one thought
 * to look at.
 */

const fs = require('fs')
const path = require('path')

const roles = require('../../server/collaborate/data/roles')
const tierChain = require('../../server/utils/tierChain')

/** The vocabulary, in full, highest authority first. Changing this list is a decision. */
const CANONICAL = [
  'mentor',
  'global_group_manager',
  'group_manager',
  'firm_manager',
  'advisor',
  'business_entity'
]

/** The four that manage people below them — the top of the same list, not a second list. */
const MANAGING = CANONICAL.slice(0, 4)

describe('the canonical vocabulary', () => {
  test('roles.TIERS is exactly the six, in order', () => {
    expect(roles.TIERS).toEqual(CANONICAL)
  })

  test('roles.MANAGER_TIERS is the first four of the same list', () => {
    expect(roles.MANAGER_TIERS).toEqual(MANAGING)
  })

  test('🔴 tierChain agrees with roles — the claim that comment made for months', () => {
    // Two literals in two files. This is the only thing holding them together.
    expect(tierChain.TIERS).toEqual(MANAGING)
    expect(tierChain.TIERS).toEqual(roles.TIERS.slice(0, tierChain.TIERS.length))
  })

  test('every managing tier is one a scope id can actually resolve to', () => {
    // A vocabulary nothing can produce is decoration. Each managing tier must be
    // reachable from a real scope id, or the list and the code disagree silently.
    const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
    expect(tierChain.tierOfScope(PLATFORM_SCOPE)).toBe('mentor')
    expect(tierChain.tierOfScope(tierChain.globalScopeId('Advisor-e'))).toBe('global_group_manager')
    expect(tierChain.tierOfScope(tierChain.groupScopeId('Advisor-e', 'Germany'))).toBe('group_manager')
    expect(tierChain.tierOfScope('some-real-firm-id')).toBe('firm_manager')
  })
})

describe('🔴 no superseded spelling survives anywhere in the source', () => {
  /**
   * ⚠ `design/` IS IN SCOPE, and that is the half that matters most. The vocabulary
   * is read from ADVISOR-E-DESIGN-LOGIC.md far more often than from roles.js — it is
   * where a session learns what the levels are called. A stale name in a document
   * that reads as authority is how the old spelling comes back, and it would come
   * back looking correct. Documents drift silently; code at least gets run.
   */
  const ROOTS = ['server', 'components', 'pages', 'mixins', 'locales', 'store', 'plugins', 'tests', 'design']
  const EXTS = ['.js', '.vue', '.json', '.md', '.html']

  /**
   * Every source file under the roots above. Walked rather than globbed so a new
   * directory is covered the day it is added, without anyone updating a list.
   * @param {string} dir
   * @param {string[]} out
   * @returns {string[]}
   */
  function walk (dir, out) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch (e) {
      return out
    }
    entries.forEach((e) => {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git') { return }
        walk(full, out)
      } else if (EXTS.includes(path.extname(e.name))) {
        out.push(full)
      }
    })
    return out
  }

  const FILES = ROOTS.reduce((acc, r) => walk(path.resolve(__dirname, '../..', r), acc), [])

  test('the walk actually found files — an empty scan passes everything', () => {
    expect(FILES.length).toBeGreaterThan(200)
  })

  /**
   * Spellings that were replaced and must never return. `\b` does not match between
   * `_` and a letter, so `global_manager` does NOT match inside
   * `global_group_manager` and `group_manager` does not match inside it either —
   * checked deliberately, because a pattern that matched the new name would fail
   * every run and get deleted rather than believed.
   */
  const FORBIDDEN = [
    { pattern: /\bglobal_manager\b/, why: 'superseded by global_group_manager' },
    { pattern: /["']Global Manager["']/, why: 'display name is "Global Group Manager"' },

    // 🔴 WIDENED 2026-09-10 (item 4.80). The pattern above bans only the QUOTED form, so the
    // unquoted "global manager" survived in 45 places for a month — including the file
    // sessions learn the tier names from. A large share of those were Mike's own words in
    // direct quotes ("repeated at group manager or global manager", 2026-07-30), and his
    // quotes stay verbatim, so this pattern is tested with quoted spans stripped first —
    // see stripQuotedSpans below. Our prose and code have no such licence.
    { pattern: /\bglobal managers?\b/i, why: 'the old short name — the role is "global group manager"', outsideQuotes: true },

    // 🔴 THE TWO COINED JOB TITLES, BANNED BY MIKE ON 2026-09-02: "any mention of brand
    // manager or country manager needs to be deleted AS A ROLE… delete the wrong terms
    // throughout so you never get confused again".
    //
    // ⚠ THE SPELLINGS WERE ALREADY FIXED IN 2026-08-11 AND THE TITLES CAME BACK ANYWAY,
    // which is why this pattern exists and the rename alone did not. A global group IS a
    // brand and a group is normally a country, so those words sit legitimately in the
    // prose all around these files — and every few sessions someone welds one to the word
    // "manager" and produces a role that does not exist. It reads as authoritative, and
    // nobody downstream can tell it was invented. It reached a document addressed to the
    // master coding team, asking them to wire two roles nobody has.
    //
    // The words themselves are fine. "the brand a manager runs", "grouped by country" —
    // untouched. Only the two-word title is refused.
    { pattern: /\bbrand manager\b/i, why: 'a coined job title — the role is "global group manager"' },
    { pattern: /\bcountry manager\b/i, why: 'a coined job title — the role is "group manager"' },

    // 🔴 WIDENED 2026-09-08, ON MIKE'S TENTH DEMAND, BECAUSE THE TWO PATTERNS ABOVE WERE
    // PASSING WHILE THE THING THEY EXIST TO STOP WAS IN THE REPOSITORY. `\bcountry manager\b`
    // does not match "country GROUP manager" — one word in the middle and the guard is blind.
    // That near-miss was sitting in an approved mockup and in a unit test's own comment, and
    // it is the same invented role wearing one extra word.
    //
    // The second pattern bans naming a TIER after a brand or a country. There are four tiers
    // and they have names; "a brand or a country tier" is a fifth vocabulary nobody agreed,
    // and it is how the coined job titles get back in — a tier called "the country tier"
    // acquires a "country manager" within a session or two.
    //
    // ⚠ STILL DELIBERATELY NOT BANNED, per Mike's own ruling of 2026-09-02 recorded above:
    // the plain words. "grouped by country", "the brand a manager runs", and the cross-org
    // posture levels whose STORED KEYS are literally `country` and `global`. Those are data,
    // not roles. Only the welding of brand/country onto a person or a tier is refused.
    { pattern: /\b(?:brand|country)\s+group\s+managers?\b/i, why: 'a coined job title — the roles are "global group manager" and "group manager"' },
    { pattern: /\b(?:brand|country)\s+tiers?\b/i, why: 'a tier named after a brand or a country — the four tiers have names' },

    // The drift path itself, closed on the same demand. "a country group" is how the coined
    // title is built: name the scope after a country, and a "country group manager" follows
    // within a session or two — which is exactly what happened, in an approved mockup. The
    // scope a group manager works at is "a group", or "one global group in one country" when
    // the detail matters. `global group` is the canonical name and is untouched by this.
    { pattern: /\b(?:brand|country)\s+groups?\b/i, why: 'a scope named after a brand or a country — say "group", or "one global group in one country"' }
  ]

  test('the pattern does not match the NEW name — otherwise this whole file is noise', () => {
    expect(/\bglobal_manager\b/.test('global_group_manager')).toBe(false)
    expect(/\bgroup_manager\b/.test('global_group_manager')).toBe(false)
    // …and it does still catch the thing it is for.
    expect(/\bglobal_manager\b/.test("tier === 'global_manager'")).toBe(true)
  })

  /**
   * Blank out every double-quoted span — straight or curly, and the \"…\" form a quote
   * takes inside a JSON string — so a pattern marked outsideQuotes ignores Mike's own
   * words and catches only ours. A span may run over line ends (his quotes are wrapped
   * in markdown, comment blocks and HTML) but never over a blank line, and never past
   * 800 characters: an unbalanced quote in code must not be able to hide a real offender
   * by swallowing the rest of the file. The self-test below proves both directions.
   * @param {string} text
   * @returns {string}
   */
  function stripQuotedSpans (text) {
    const span = '(?:(?!\\r?\\n[ \\t>*/]*\\r?\\n)[^"“”]){0,800}'
    return text
      .replace(new RegExp('\\\\"' + span + '\\\\"', 'g'), ' ')
      .replace(new RegExp('["“]' + span + '["”]', 'g'), ' ')
  }

  test('stripQuotedSpans hides a quoted offender and exposes an unquoted one', () => {
    const bad = /\bglobal manager\b/i
    expect(bad.test(stripQuotedSpans('his words, *"repeated at group manager or\n> global manager… no new functionality"*'))).toBe(false)
    expect(bad.test(stripQuotedSpans('<em>“too technical for a firm or global manager.”</em>'))).toBe(false)
    expect(bad.test(stripQuotedSpans('"name": "\\"Global manager\\" is the old name"'))).toBe(false)
    expect(bad.test(stripQuotedSpans('a global manager gets [group, firm]'))).toBe(true)
    // An unbalanced quote cannot swallow the file: a blank line ends the span…
    expect(bad.test(stripQuotedSpans('x = "oops\n\nso a global manager sees'))).toBe(true)
    // …and so does the length cap.
    expect(bad.test(stripQuotedSpans('x = "' + 'a'.repeat(801) + ' global manager sees"'))).toBe(true)
  })

  FORBIDDEN.forEach(({ pattern, why, outsideQuotes }) => {
    test(`no file contains ${pattern} — ${why}`, () => {
      const offenders = FILES.filter((f) => {
        // This test file names the forbidden spellings on purpose.
        if (path.basename(f) === 'tierVocabulary.test.js') { return false }
        const text = fs.readFileSync(f, 'utf8')
        return pattern.test(outsideQuotes ? stripQuotedSpans(text) : text)
      }).map(f => path.relative(path.resolve(__dirname, '../..'), f))

      expect(offenders).toEqual([])
    })
  })

  test('🔴 no tier is called `client` — a business entity may have several people', () => {
    // Deliberately NOT a blanket scan for the word: `loadPrompt('client')` is a
    // prompt file, `mode: 'client'` is a conversation mode stored in the database,
    // and neither is a tier. The check is that no TIER LIST contains it.
    expect(roles.TIERS).not.toContain('client')
    expect(roles.MANAGER_TIERS).not.toContain('client')
    expect(tierChain.TIERS).not.toContain('client')
    expect(roles.TIERS).toContain('business_entity')
  })
})

describe('the resolver still behaves — the rename moved names, not logic', () => {
  test('an unknown advisor is an advisor, not a business entity', () => {
    expect(roles.resolveTier(null)).toBe('advisor')
    expect(roles.resolveTier({ id: 'a1' })).toBe('advisor')
  })

  test('a global group manager reaches their own brand and no other', () => {
    const manager = { id: 'm1', tier: 'global_group_manager', globalGroup: 'Advisor-e' }
    expect(roles.canManage(manager, { id: 'a1', globalGroup: 'Advisor-e' })).toBe(true)
    expect(roles.canManage(manager, { id: 'a2', globalGroup: 'BDO' })).toBe(false)
  })

  test('neither an advisor nor a business entity manages anyone', () => {
    expect(roles.canManage({ id: 'a1', tier: 'advisor' }, { id: 'a2' })).toBe(false)
    expect(roles.canManage({ id: 'c1', tier: 'business_entity' }, { id: 'a2' })).toBe(false)
  })

  test('isManagerTier answers for every name in the vocabulary', () => {
    MANAGING.forEach(t => expect(roles.isManagerTier(t)).toBe(true))
    expect(roles.isManagerTier('advisor')).toBe(false)
    expect(roles.isManagerTier('business_entity')).toBe(false)
  })
})
