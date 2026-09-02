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
    { pattern: /\bcountry manager\b/i, why: 'a coined job title — the role is "group manager"' }
  ]

  test('the pattern does not match the NEW name — otherwise this whole file is noise', () => {
    expect(/\bglobal_manager\b/.test('global_group_manager')).toBe(false)
    expect(/\bgroup_manager\b/.test('global_group_manager')).toBe(false)
    // …and it does still catch the thing it is for.
    expect(/\bglobal_manager\b/.test("tier === 'global_manager'")).toBe(true)
  })

  FORBIDDEN.forEach(({ pattern, why }) => {
    test(`no file contains ${pattern} — ${why}`, () => {
      const offenders = FILES.filter((f) => {
        // This test file names the forbidden spellings on purpose.
        if (path.basename(f) === 'tierVocabulary.test.js') { return false }
        return pattern.test(fs.readFileSync(f, 'utf8'))
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
