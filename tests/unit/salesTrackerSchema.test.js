'use strict'

/**
 * The Sales Tracker schema — item 17, stage 1.
 *
 * WHY THIS TEST EXISTS, AND WHY IT IS NOT A "FILE EXISTS" TEST.
 *
 * The standards say not to assert that a file exists where nothing reads its
 * contents (CLAUDE.md, Mike 2026-08-24). This reads the contents, and what it
 * reads is the one property in the whole feature that UAT cannot see:
 *
 *   🔴 WHOSE DEALS ARE THESE?
 *
 * The source app (advisor-e/sales-tracker-nuxt) has NO CONCEPT OF A FIRM — its
 * own comment says "Pipeline is shared across the firm - no userId filter". Ported
 * without the scoping columns below, one firm reads another firm's prospects and
 * fee values, and every advisor reads their colleagues' deals. A tester in UAT,
 * signed in as one advisor at one firm, sees a perfectly correct screen
 * throughout — which is exactly the shape of fault the list scores 5.
 *
 * So this pins the trio copied from `va_courses`:
 *   advisor_id  — the owner
 *   firm_id     — the tenant, foreign-keyed so an unknown firm is REFUSED
 *   visibility  — DEFAULT 'private', the fail-safe
 *
 * It also pins money as DECIMAL. A fee value silently becoming a float is a
 * wrong number on a firm's report, and nobody eyeballs it into existence.
 *
 * PROVEN AGAINST A REAL DATABASE 2026-09-22: the migration ran on the local
 * MySQL 8.4 `virt_advisor`; the FK refused an unknown firm (ER_NO_REFERENCED_ROW_2);
 * a new row defaulted to 'private'; 12345678901.99 and 0.01 round-tripped exactly.
 * This test is the standing guard for what that run proved once.
 */

const fs = require('fs')
const path = require('path')

const MIGRATION = path.resolve(__dirname, '../../config/db-migration-sales-tracker.sql')
const sql = fs.readFileSync(MIGRATION, 'utf8')

/**
 * The statements alone, with every `--` comment line removed.
 *
 * Needed because this file's comments deliberately DISCUSS the types they forbid
 * ("Money is DECIMAL, never FLOAT") — and the first version of the FLOAT check
 * below failed on its own explanatory prose. A schema assertion must read the
 * schema, not the commentary around it.
 */
const statements = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

/** The block of one CREATE TABLE statement, so a column cannot be matched from a neighbour. */
function tableBlock (name) {
  const start = statements.indexOf('CREATE TABLE IF NOT EXISTS `' + name + '`')
  if (start === -1) { return '' }
  const end = statements.indexOf('ENGINE=InnoDB', start)
  return end === -1 ? '' : statements.slice(start, end)
}

/** Every table this migration creates. */
const ALL_TABLES = [
  'va_sales_pipeline',
  'va_sales_coi',
  'va_sales_blog_input',
  'va_sales_blog_post',
  'va_sales_blog_reference'
]

/**
 * The two tables holding an advisor's own commercial records. These carry the
 * full trio. The three blog tables are authoring scratch space for stage 5 and
 * carry advisor_id + firm_id without a visibility switch, because nothing shares
 * a half-written blog post.
 */
const OWNED_BY_AN_ADVISOR = ['va_sales_pipeline', 'va_sales_coi']

describe('the Sales Tracker schema keeps one advisor\'s deals out of another\'s hands', () => {
  test.each(ALL_TABLES)('%s exists in the migration', (name) => {
    expect(tableBlock(name)).not.toBe('')
  })

  test.each(ALL_TABLES)('%s is scoped to a firm, and the firm must be a real one', (name) => {
    const block = tableBlock(name)
    expect(block).toMatch(/`firm_id`\s+VARCHAR\(64\)\s+NOT NULL/)
    // The FK is what turns the column into a guarantee. Without it, firm_id is a
    // label anyone could write anything into.
    expect(block).toMatch(/FOREIGN KEY \(`firm_id`\) REFERENCES `firms` \(`id`\) ON DELETE CASCADE/)
  })

  test.each(ALL_TABLES)('%s records which advisor owns the row', (name) => {
    expect(tableBlock(name)).toMatch(/`advisor_id`\s+VARCHAR\(64\)\s+NOT NULL/)
  })

  test.each(OWNED_BY_AN_ADVISOR)('%s is PRIVATE until the advisor says otherwise', (name) => {
    const block = tableBlock(name)
    // Two assertions, because either alone would pass a broken schema: a column
    // with no default, or a default of 'firm'.
    expect(block).toMatch(/`visibility`\s+ENUM\('private','firm'\)\s+NOT NULL DEFAULT 'private'/)
  })

  test('a deal cannot be created without saying whose firm it is', () => {
    const block = tableBlock('va_sales_pipeline')
    // NOT NULL on both scoping columns: a row with a missing owner or missing
    // tenant is the row that leaks.
    expect(block).toMatch(/`advisor_id`\s+VARCHAR\(64\)\s+NOT NULL/)
    expect(block).toMatch(/`firm_id`\s+VARCHAR\(64\)\s+NOT NULL/)
  })
})

describe('money is exact', () => {
  // A fee value is a number a firm reports on and an advisor is paid against.
  // FLOAT/DOUBLE lose pennies at scale and nobody notices until a total is wrong.
  const MONEY_COLUMNS = [
    ['va_sales_pipeline', 'proposal_value'],
    ['va_sales_pipeline', 'job_secured_value'],
    ['va_sales_pipeline', 'additional_work_secured'],
    ['va_sales_coi', 'fee_value']
  ]

  test.each(MONEY_COLUMNS)('%s.%s is DECIMAL(14,2), never a float', (table, column) => {
    const block = tableBlock(table)
    expect(block).toMatch(new RegExp('`' + column + '`\\s+DECIMAL\\(14,2\\)'))
  })

  test('no money column anywhere is FLOAT or DOUBLE', () => {
    expect(statements).not.toMatch(/\bFLOAT\b/i)
    expect(statements).not.toMatch(/\bDOUBLE\b/i)
  })
})

describe('the tables the source app has that we deliberately do not', () => {
  /**
   * Five of the source's ten tables do not come across, and each omission is a
   * decision recorded in the migration's header. This asserts the decisions
   * stuck, because re-adding one would be a silent regression:
   *
   *   user, session   — all login is the master app's, never ours
   *   auditlog        — we already have `audit_log`, a superset
   *   appconfig       — we already have `firm_framework_versions`, which also
   *                     brings version history and restore
   *   customlanguage  — stage 6, recommended for dropping; we have 8 locales
   */
  const NOT_OURS = ['va_sales_user', 'va_sales_session', 'va_sales_audit', 'va_sales_config', 'va_sales_language']

  test.each(NOT_OURS)('%s is not created — it duplicates something we already have', (name) => {
    expect(statements).not.toMatch(new RegExp('CREATE TABLE IF NOT EXISTS `' + name + '`'))
  })

  test('the migration creates exactly five tables', () => {
    const created = statements.match(/CREATE TABLE IF NOT EXISTS/g) || []
    expect(created).toHaveLength(ALL_TABLES.length)
  })
})

describe('the migration is safe to run', () => {
  test('every table is guarded with IF NOT EXISTS', () => {
    // Re-running a migration must never drop a firm's live pipeline.
    const creates = statements.match(/CREATE TABLE(?: IF NOT EXISTS)?/g) || []
    creates.forEach(c => expect(c).toBe('CREATE TABLE IF NOT EXISTS'))
  })

  test('it drops nothing', () => {
    expect(statements).not.toMatch(/\bDROP\s+(TABLE|DATABASE|COLUMN)\b/i)
  })

  test('it targets the Virt Advisor database explicitly', () => {
    expect(statements).toMatch(/USE `virt_advisor`;/)
  })
})
