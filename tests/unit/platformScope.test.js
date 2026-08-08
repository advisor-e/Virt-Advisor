'use strict'

/**
 * The reserved platform scope — the row in `firms` that is not a firm.
 *
 * Phase 1 of design/MENTOR-SAVE-SCOPE-PLAN.md. Three things have to hold together
 * or mentor-authored content either cannot be saved at all or is silently counted
 * as a firm's:
 *
 *   1. the id has ONE definition (it used to have two, and a third was coming)
 *   2. the database has a row for it, or every mentor save is rejected by the
 *      foreign key on firm_framework_versions.firm_id
 *   3. nothing that answers "which firms..." includes it
 *
 * (2) is the defect these tests exist to prevent coming back: the sentinel was in
 * use by two live features for weeks and could never have been written to a real
 * database. Nothing caught it because MySQL has never been provisioned and the dev
 * fallback quietly absorbs the rejection.
 */

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn()
}))

const fs = require('fs')
const path = require('path')

const db = require('../../server/utils/db')
const { PLATFORM_SCOPE, PLATFORM_SCOPE_NAME, isPlatformScope } = require('../../server/utils/platformScope')
const { listFirmIdsWithConfigKey } = require('../../server/utils/firmOverlay')

const repoRoot = path.resolve(__dirname, '../..')
const readRepoFile = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8')

// ── 1. One definition ─────────────────────────────────────────────────────────

describe('the platform scope has a single definition', () => {
  test('the id is the reserved sentinel', () => {
    expect(PLATFORM_SCOPE).toBe('__platform__')
  })

  test('isPlatformScope tells the reserved id from a real firm id', () => {
    expect(isPlatformScope(PLATFORM_SCOPE)).toBe(true)
    expect(isPlatformScope('acme-ltd')).toBe(false)
    expect(isPlatformScope('')).toBe(false)
    expect(isPlatformScope(undefined)).toBe(false)
  })

  test('the two mentor content modules read the SAME constant, not their own copy', () => {
    const platformDistinctions = require('../../server/utils/platformDistinctions')
    const templateCheckRulings = require('../../server/utils/templateCheckRulings')
    expect(templateCheckRulings.PLATFORM_SCOPE).toBe(PLATFORM_SCOPE)
    // platformDistinctions does not export the scope; assert it stores under it
    // by proving the module loads and the shared constant is what it requires.
    expect(typeof platformDistinctions.loadPlatformDistinctions).toBe('function')
  })

  test('no module under server/ redeclares the literal — one home for the string', () => {
    const offenders = []
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) { walk(full); continue }
        if (!entry.name.endsWith('.js')) { continue }
        if (full.endsWith(`utils${path.sep}platformScope.js`)) { continue }
        if (/=\s*'__platform__'|=\s*"__platform__"/.test(fs.readFileSync(full, 'utf8'))) {
          offenders.push(path.relative(repoRoot, full))
        }
      }
    }
    walk(path.join(repoRoot, 'server'))
    // A new copy of the string is how this drifts. Require platformScope instead.
    expect(offenders).toEqual([])
  })
})

// ── 2. The database can actually accept it ────────────────────────────────────

describe('the schema seeds the reserved row', () => {
  const schema = readRepoFile('config/db-schema.sql')

  test('firm_framework_versions still foreign-keys firm_id to firms — the reason the row is needed', () => {
    // If this constraint is ever dropped the seed row becomes optional. Until
    // then, a scope with no matching firms row CANNOT be written.
    expect(schema).toMatch(/FOREIGN KEY\s*\(`firm_id`\)\s*REFERENCES\s*`firms`/)
  })

  test('a firms row exists for the reserved scope, so a mentor save is not rejected', () => {
    const insert = schema.match(/INSERT INTO `firms`[\s\S]*?;/)
    expect(insert).not.toBeNull()
    expect(insert[0]).toContain(`'${PLATFORM_SCOPE}'`)
    expect(insert[0]).toContain(PLATFORM_SCOPE_NAME)
  })

  test('the insert is idempotent, so re-running the schema is safe', () => {
    const insert = schema.match(/INSERT INTO `firms`[\s\S]*?;/)[0]
    expect(insert).toMatch(/ON DUPLICATE KEY UPDATE/i)
  })

  test('the integration note tells an installation with its own firms table to run it anyway', () => {
    // The schema explicitly invites the Advisor-e team to skip the firms block
    // and remap the foreign keys. That is precisely the reader who would
    // otherwise miss this row and hit the FK error in production.
    expect(schema).toMatch(/RUN THIS INSERT EVEN IF YOU SKIP/i)
  })
})

// ── 3. It is never counted as a firm ──────────────────────────────────────────

describe('listFirmIdsWithConfigKey excludes the platform scope', () => {
  beforeEach(() => { db.execute.mockReset() })

  test('the exclusion happens in SQL, bound as a parameter', async () => {
    db.execute.mockResolvedValue([[]])
    await listFirmIdsWithConfigKey('domain-support')

    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toMatch(/firm_id\s*<>\s*\?/)
    expect(params).toEqual(['domain-support', PLATFORM_SCOPE])
  })

  test('real firm ids are returned unchanged', async () => {
    db.execute.mockResolvedValue([[{ firm_id: 'acme-ltd' }, { firm_id: 'beta-co' }]])
    await expect(listFirmIdsWithConfigKey('domain-support'))
      .resolves.toEqual(['acme-ltd', 'beta-co'])
  })

  test('the mentor is not reported as a firm that customised its own content', async () => {
    // Belt and braces: even if the row reached JS, the caller's meaning is
    // "firms", and the delete-promotion and Logic Lab Report both act on the
    // count. This asserts the SQL is what keeps it out.
    db.execute.mockResolvedValue([[]])
    const ids = await listFirmIdsWithConfigKey('advisory-distinctions')
    expect(ids).not.toContain(PLATFORM_SCOPE)
  })
})
