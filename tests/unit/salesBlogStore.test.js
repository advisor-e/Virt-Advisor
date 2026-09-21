'use strict'

/**
 * The blog store — item 17 stage 5.
 *
 * The access rules are the pipeline's and the COI's, with ONE difference that is
 * the point of this file: these three tables have **no `visibility` column**.
 * Every row is the advisor's own, both to read and to write. A brief, a
 * half-written draft and a pasted source document are nobody else's business —
 * not a colleague's, and not a firm manager's.
 *
 *   READ  — `advisor_id = ? AND firm_id = ?`, always both.
 *   WRITE — the same, so a guessed id from another tenant MISSES rather than
 *           merely being unlikely.
 *
 * A third resource is exactly where an access rule gets dropped, because by now
 * the pattern looks already-solved. That is why every clause is asserted again
 * here rather than assumed from the two stores before it.
 */

jest.mock('../../server/utils/db', () => ({ execute: jest.fn(), getConnection: jest.fn() }))
jest.mock('../../server/utils/dbFailure', () => ({ devFallbackAllowed: jest.fn(() => false) }))

const db = require('../../server/utils/db')
const { devFallbackAllowed } = require('../../server/utils/dbFailure')
const store = require('../../server/utils/salesBlogStore')

const ADVISOR = 'advisor-aaa'
const FIRM = 'firm-111'

/** One statement's SQL, whitespace collapsed so a line break cannot hide a clause. */
function sqlOf (call) {
  return String(call[0]).replace(/\s+/g, ' ').trim()
}

/** Every statement this test run issued, as collapsed SQL. */
function allSql () {
  return db.execute.mock.calls.map(sqlOf)
}

beforeEach(() => {
  jest.clearAllMocks()
  devFallbackAllowed.mockReturnValue(false)
})

describe('🔴 every read is scoped to the caller, in SQL', () => {
  test('listing briefs filters on the advisor AND the firm', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listInputs(ADVISOR, FIRM)

    const sql = sqlOf(db.execute.mock.calls[0])
    expect(sql).toMatch(/WHERE advisor_id = \? AND firm_id = \?/)
    expect(sql).toMatch(/LIMIT 120/)
    expect(db.execute.mock.calls[0][1]).toEqual([ADVISOR, FIRM])
  })

  test('listing posts filters on the advisor, the firm AND the kind', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listPosts(ADVISOR, FIRM, { kind: 'final' })

    const sql = sqlOf(db.execute.mock.calls[0])
    expect(sql).toMatch(/advisor_id = \? AND firm_id = \? AND kind = \?/)
    expect(db.execute.mock.calls[0][1]).toEqual([ADVISOR, FIRM, 'final'])
  })

  test('listing references filters on the advisor AND the firm', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listReferences(ADVISOR, FIRM)

    expect(sqlOf(db.execute.mock.calls[0])).toMatch(/advisor_id = \? AND firm_id = \?/)
    expect(db.execute.mock.calls[0][1]).toEqual([ADVISOR, FIRM])
  })

  test('every getById carries BOTH ids, so a guessed id from another tenant misses', async () => {
    db.execute.mockResolvedValue([[]])
    await store.getInput('id-1', ADVISOR, FIRM)
    await store.getPost('id-2', ADVISOR, FIRM)
    await store.getReference('id-3', ADVISOR, FIRM)

    for (const sql of allSql()) {
      expect(sql).toMatch(/WHERE id = \? AND advisor_id = \? AND firm_id = \?/)
    }
  })

  test('🔴 no read mentions visibility — these rows are never shared', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listInputs(ADVISOR, FIRM)
    await store.listPosts(ADVISOR, FIRM, {})
    await store.listReferences(ADVISOR, FIRM)

    for (const sql of allSql()) {
      expect(sql).not.toMatch(/visibility/)
    }
  })
})

describe('🔴 every write is scoped to the caller, in SQL', () => {
  test('updating a post requires the advisor and the firm to match', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])
    await store.updatePost('id-1', ADVISOR, FIRM, { title: 'New' })

    expect(sqlOf(db.execute.mock.calls[0]))
      .toMatch(/WHERE id = \? AND advisor_id = \? AND firm_id = \?/)
  })

  test('every delete requires the advisor and the firm to match', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])
    await store.removeInput('a', ADVISOR, FIRM)
    await store.removePost('b', ADVISOR, FIRM)
    await store.removeReference('c', ADVISOR, FIRM)

    for (const sql of allSql()) {
      expect(sql).toMatch(/WHERE id = \? AND advisor_id = \? AND firm_id = \?/)
    }
  })

  test('a delete that matches nothing reports false, never throws', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])
    expect(await store.removeInput('nope', ADVISOR, FIRM)).toBe(false)
    expect(await store.removePost('nope', ADVISOR, FIRM)).toBe(false)
    expect(await store.removeReference('nope', ADVISOR, FIRM)).toBe(false)
  })

  test('an update that matches nothing returns null — "not yours" and "no such row" agree', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])
    expect(await store.updatePost('nope', ADVISOR, FIRM, { title: 'x' })).toBeNull()
  })

  test('🔴 identity comes from the arguments, never from the payload', async () => {
    db.execute.mockResolvedValue([[{ id: 'new', advisor_id: ADVISOR, firm_id: FIRM }]])
    await store.createPost({
      advisorId: ADVISOR,
      firmId: FIRM,
      // A client that sends these must not be able to set them.
      advisor_id: 'attacker',
      firm_id: 'other-firm',
      title: 'T',
      outlineText: 'O'
    })

    const insert = db.execute.mock.calls[0]
    expect(insert[1][1]).toBe(ADVISOR)
    expect(insert[1][2]).toBe(FIRM)
    expect(insert[1]).not.toContain('attacker')
    expect(insert[1]).not.toContain('other-firm')
  })

  test('a create with no identity is refused before any SQL runs', async () => {
    await expect(store.createPost({ title: 'T' })).rejects.toThrow(/advisorId and firmId/)
    await expect(store.createReference({ title: 'T' })).rejects.toThrow(/advisorId and firmId/)
    await expect(store.saveInput({ signature: 's' })).rejects.toThrow(/advisorId and firmId/)
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('a brief with no signature is refused before any SQL runs', async () => {
    await expect(store.saveInput({ advisorId: ADVISOR, firmId: FIRM }))
      .rejects.toThrow(/signature is required/)
    expect(db.execute).not.toHaveBeenCalled()
  })
})

describe('saveInput — the signature is the advisor own de-duplication key', () => {
  test('🔴 the lookup is scoped to the advisor, so two colleagues never collide', async () => {
    // the lookup finds nothing, then the insert, then the read-back
    db.execute.mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM }]])
    await store.saveInput({ advisorId: ADVISOR, firmId: FIRM, signature: 'sig-1', topic: 'T' })

    const lookup = sqlOf(db.execute.mock.calls[0])
    expect(lookup).toMatch(/WHERE signature = \? AND advisor_id = \? AND firm_id = \?/)
    expect(db.execute.mock.calls[0][1]).toEqual(['sig-1', ADVISOR, FIRM])
  })

  test('an existing brief with the same signature is UPDATED, not duplicated', async () => {
    db.execute.mockResolvedValueOnce([[{ id: 'existing-1' }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 'existing-1', advisor_id: ADVISOR, firm_id: FIRM }]])
    await store.saveInput({ advisorId: ADVISOR, firmId: FIRM, signature: 'sig-1', topic: 'T' })

    const second = sqlOf(db.execute.mock.calls[1])
    expect(second).toMatch(/^UPDATE va_sales_blog_input/)
    expect(second).toMatch(/WHERE id = \? AND advisor_id = \? AND firm_id = \?/)
    expect(allSql().some(s => s.startsWith('INSERT'))).toBe(false)
  })

  test('re-saving the same brief touches only the fields it carries', async () => {
    db.execute.mockResolvedValueOnce([[{ id: 'existing-1' }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 'existing-1', advisor_id: ADVISOR, firm_id: FIRM }]])
    await store.saveInput({ advisorId: ADVISOR, firmId: FIRM, signature: 'sig-1', topic: 'New topic' })

    // `signature` is itself a column, so the UPDATE always runs and refreshes
    // updated_at. What matters is that a field the caller did NOT send is left
    // alone rather than being nulled — a partial save must not erase the rest
    // of the advisor's brief.
    const update = sqlOf(db.execute.mock.calls[1])
    expect(update).toMatch(/`topic` = \?/)
    expect(update).toMatch(/`signature` = \?/)
    expect(update).not.toMatch(/`audience` = \?/)
    expect(update).not.toMatch(/`cta` = \?/)
  })
})

describe('listPosts — the search box cannot become an injection', () => {
  test('🔴 the search text is BOUND, never concatenated into the SQL', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listPosts(ADVISOR, FIRM, { search: "'; DROP TABLE va_sales_blog_post; --" })

    const sql = sqlOf(db.execute.mock.calls[0])
    expect(sql).not.toContain('DROP TABLE')
    expect(sql).toMatch(/\(title LIKE \? OR topic LIKE \? OR selected_person LIKE \?\)/)
    // The whole string arrives as ONE bound parameter. Its underscores are
    // escaped because `_` is a LIKE wildcard — that is the escaping test below
    // doing its job on this input too, not a separate behaviour.
    expect(db.execute.mock.calls[0][1].slice(3))
      .toEqual(Array(3).fill("%'; DROP TABLE va\\_sales\\_blog\\_post; --%"))
  })

  test('🔴 LIKE metacharacters in the advisor own text are escaped', async () => {
    // Unescaped, a literal % would match every post the advisor has, which reads
    // as a broken search box rather than as a bug.
    db.execute.mockResolvedValue([[]])
    await store.listPosts(ADVISOR, FIRM, { search: '100%_off' })

    expect(db.execute.mock.calls[0][1][3]).toBe('%100\\%\\_off%')
  })

  test('no search adds no clause and no parameters', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listPosts(ADVISOR, FIRM, { search: '   ' })

    expect(sqlOf(db.execute.mock.calls[0])).not.toMatch(/LIKE/)
    expect(db.execute.mock.calls[0][1]).toHaveLength(3)
  })

  test('pinnedOnly adds the clause; anything but true does not', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listPosts(ADVISOR, FIRM, { pinnedOnly: true })
    expect(sqlOf(db.execute.mock.calls[0])).toMatch(/is_pinned = 1/)

    jest.clearAllMocks()
    db.execute.mockResolvedValue([[]])
    await store.listPosts(ADVISOR, FIRM, { pinnedOnly: 'true' })
    expect(sqlOf(db.execute.mock.calls[0])).not.toMatch(/is_pinned = 1/)
  })

  test('no options at all is the same as asking for drafts', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listPosts(ADVISOR, FIRM)

    expect(db.execute.mock.calls[0][1]).toEqual([ADVISOR, FIRM, 'draft'])
  })

  test('pinned posts sort first, then the most recently updated', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listPosts(ADVISOR, FIRM, {})

    expect(sqlOf(db.execute.mock.calls[0]))
      .toMatch(/ORDER BY is_pinned DESC, updated_at DESC/)
  })
})

describe('listReferences — the topic filter', () => {
  test('a topic adds an exact-match clause and its parameter', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listReferences(ADVISOR, FIRM, 'Cash flow')

    expect(sqlOf(db.execute.mock.calls[0])).toMatch(/topic = \?/)
    expect(db.execute.mock.calls[0][1]).toEqual([ADVISOR, FIRM, 'Cash flow'])
  })

  test('an empty or whitespace topic adds nothing', async () => {
    db.execute.mockResolvedValue([[]])
    await store.listReferences(ADVISOR, FIRM, '   ')

    expect(sqlOf(db.execute.mock.calls[0])).not.toMatch(/topic = \?/)
    expect(db.execute.mock.calls[0][1]).toHaveLength(2)
  })
})

describe('the fail-safe normalisers', () => {
  test('🔴 an unrecognised kind becomes a draft, never a final', () => {
    // Publishing something the advisor has not finished is the damaging
    // direction, so an unknown value fails toward the safe one.
    expect(store.normaliseKind('final')).toBe('final')
    expect(store.normaliseKind('draft')).toBe('draft')
    expect(store.normaliseKind('published')).toBe('draft')
    expect(store.normaliseKind(undefined)).toBe('draft')
    expect(store.normaliseKind(null)).toBe('draft')
    expect(store.normaliseKind(42)).toBe('draft')
  })

  test('an unrecognised reference type becomes a document, never a url', () => {
    expect(store.normaliseReferenceType('url')).toBe('url')
    expect(store.normaliseReferenceType('document')).toBe('document')
    expect(store.normaliseReferenceType('script')).toBe('document')
    expect(store.normaliseReferenceType(undefined)).toBe('document')
  })

  test('a post created with an unknown kind is stored as a draft', async () => {
    db.execute.mockResolvedValue([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM }]])
    await store.createPost({
      advisorId: ADVISOR, firmId: FIRM, kind: 'published', title: 'T', outlineText: 'O'
    })

    const kindIndex = store.POST_COLUMNS.findIndex(c => c[0] === 'kind')
    expect(db.execute.mock.calls[0][1][3 + kindIndex]).toBe('draft')
  })
})

describe('rowToEntry — what comes back out of MySQL', () => {
  test('a TINYINT pinned flag becomes a real boolean', () => {
    const out = store.rowToEntry({ id: 'a', is_pinned: 1 }, store.POST_COLUMNS)
    expect(out.isPinned).toBe(true)
    expect(store.rowToEntry({ id: 'a', is_pinned: 0 }, store.POST_COLUMNS).isPinned).toBe(false)
  })

  test('a JSON column arrives as an object whether the driver parsed it or not', () => {
    const parsed = store.rowToEntry(
      { id: 'a', principles_json: [{ title: 'T' }] }, store.INPUT_COLUMNS
    )
    expect(parsed.principles).toEqual([{ title: 'T' }])

    const asString = store.rowToEntry(
      { id: 'a', principles_json: '[{"title":"T"}]' }, store.INPUT_COLUMNS
    )
    expect(asString.principles).toEqual([{ title: 'T' }])
  })

  test('🔴 malformed JSON in a column becomes null rather than throwing', () => {
    // A row written by hand, or by an older version, must not take down the
    // whole list on the way out.
    const out = store.rowToEntry({ id: 'a', principles_json: '{not json' }, store.INPUT_COLUMNS)
    expect(out.principles).toBeNull()
  })

  test('a missing column becomes null, not undefined', () => {
    const out = store.rowToEntry({ id: 'a' }, store.REFERENCE_COLUMNS)
    expect(out.title).toBeNull()
    expect(out.url).toBeNull()
  })

  test('the identity and timestamps always come through', () => {
    const out = store.rowToEntry(
      { id: 'a', advisor_id: ADVISOR, firm_id: FIRM, created_at: 'c', updated_at: 'u' },
      store.POST_COLUMNS
    )
    expect(out).toMatchObject({ id: 'a', advisorId: ADVISOR, firmId: FIRM, createdAt: 'c', updatedAt: 'u' })
  })
})

describe('what goes IN to MySQL', () => {
  test('text is truncated to its column width', async () => {
    db.execute.mockResolvedValue([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM }]])
    await store.createReference({
      advisorId: ADVISOR, firmId: FIRM, title: 'T'.repeat(400), type: 'url', url: 'u'.repeat(800)
    })

    const vals = db.execute.mock.calls[0][1]
    const titleIndex = 3 + store.REFERENCE_COLUMNS.findIndex(c => c[0] === 'title')
    const urlIndex = 3 + store.REFERENCE_COLUMNS.findIndex(c => c[0] === 'url')
    expect(vals[titleIndex]).toHaveLength(255)
    expect(vals[urlIndex]).toHaveLength(500)
  })

  test('🔴 LONGTEXT is NOT truncated — it holds an article', async () => {
    db.execute.mockResolvedValue([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM }]])
    const article = 'w'.repeat(50000)
    await store.createPost({
      advisorId: ADVISOR, firmId: FIRM, title: 'T', outlineText: article
    })

    const index = 3 + store.POST_COLUMNS.findIndex(c => c[0] === 'outlineText')
    expect(db.execute.mock.calls[0][1][index]).toHaveLength(50000)
  })

  test('an empty string is stored as NULL, so "unset" has one representation', async () => {
    db.execute.mockResolvedValue([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM }]])
    await store.createReference({
      advisorId: ADVISOR, firmId: FIRM, title: 'T', type: 'url', topic: ''
    })

    const index = 3 + store.REFERENCE_COLUMNS.findIndex(c => c[0] === 'topic')
    expect(db.execute.mock.calls[0][1][index]).toBeNull()
  })

  test('a JSON field is stringified, and an absent one is NULL', async () => {
    db.execute.mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM }]])
    await store.saveInput({
      advisorId: ADVISOR, firmId: FIRM, signature: 's', principles: [{ title: 'P' }]
    })

    const vals = db.execute.mock.calls[1][1]
    const pIndex = 3 + store.INPUT_COLUMNS.findIndex(c => c[0] === 'principles')
    const sIndex = 3 + store.INPUT_COLUMNS.findIndex(c => c[0] === 'styleTitles')
    expect(vals[pIndex]).toBe('[{"title":"P"}]')
    expect(vals[sIndex]).toBeNull()
  })

  test('the pinned flag reaches MySQL as 1 or 0, never as a boolean', async () => {
    db.execute.mockResolvedValue([[{ id: 'x', advisor_id: ADVISOR, firm_id: FIRM }]])
    await store.createPost({
      advisorId: ADVISOR, firmId: FIRM, title: 'T', outlineText: 'O', isPinned: true
    })

    const index = 3 + store.POST_COLUMNS.findIndex(c => c[0] === 'isPinned')
    expect(db.execute.mock.calls[0][1][index]).toBe(1)
  })
})

describe('an insert that cannot be read back is an error, not a silent success', () => {
  test('createPost throws when the row does not come back', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([[]])
    await expect(store.createPost({
      advisorId: ADVISOR, firmId: FIRM, title: 'T', outlineText: 'O'
    })).rejects.toThrow(/could not be read back/)
  })

  test('createReference throws when the row does not come back', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([[]])
    await expect(store.createReference({
      advisorId: ADVISOR, firmId: FIRM, title: 'T', type: 'url'
    })).rejects.toThrow(/could not be read back/)
  })

  test('saveInput throws when the new row does not come back', async () => {
    db.execute.mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[]])
    await expect(store.saveInput({ advisorId: ADVISOR, firmId: FIRM, signature: 's' }))
      .rejects.toThrow(/could not be read back/)
  })
})

describe('🔴 the dev JSON fallback enforces the SAME rules as the SQL', () => {
  // The rules above are only as good as the path that actually runs on a dev
  // machine with no MySQL. The COI store proves its fallback the same way, for
  // the same reason: two implementations of one access rule is two chances to
  // get it wrong, and the one without a database is the one nobody watches.
  const os = require('os')
  const path = require('path')
  const fs = require('fs')
  let file
  let isolated

  const OTHER = 'advisor-bbb'

  beforeEach(() => {
    file = path.join(os.tmpdir(), 'dev-sales-blog-' + Date.now() + Math.random() + '.json')
    process.env.SALES_BLOG_DEV_FILE = file
    jest.resetModules()
    jest.doMock('../../server/utils/db', () => ({
      execute: jest.fn(() => Promise.reject(new Error('no db'))), getConnection: jest.fn()
    }))
    jest.doMock('../../server/utils/dbFailure', () => ({ devFallbackAllowed: jest.fn(() => true) }))
    isolated = require('../../server/utils/salesBlogStore')
  })

  afterEach(() => {
    delete process.env.SALES_BLOG_DEV_FILE
    try { fs.unlinkSync(file) } catch (e) { /* never existed */ }
  })

  test('a created post belongs to its creator', async () => {
    const p = await isolated.createPost({
      advisorId: ADVISOR, firmId: FIRM, title: 'T', outlineText: 'O'
    })
    expect(p.advisorId).toBe(ADVISOR)
    expect(p.firmId).toBe(FIRM)
    expect(p.kind).toBe('draft')
  })

  test('🔴 another advisor at the same firm sees NOTHING of these three', async () => {
    await isolated.createPost({ advisorId: ADVISOR, firmId: FIRM, title: 'Secret', outlineText: 'O' })
    await isolated.createReference({ advisorId: ADVISOR, firmId: FIRM, title: 'R', type: 'url' })
    await isolated.saveInput({ advisorId: ADVISOR, firmId: FIRM, signature: 's', topic: 'T' })

    await expect(isolated.listPosts(OTHER, FIRM, {})).resolves.toEqual([])
    await expect(isolated.listReferences(OTHER, FIRM)).resolves.toEqual([])
    await expect(isolated.listInputs(OTHER, FIRM)).resolves.toEqual([])
  })

  test('🔴 another FIRM sees nothing at all', async () => {
    await isolated.createPost({ advisorId: ADVISOR, firmId: FIRM, title: 'T', outlineText: 'O' })
    await expect(isolated.listPosts(ADVISOR, 'other-firm', {})).resolves.toEqual([])
  })

  test('🔴 a colleague can neither read, edit nor delete another advisor post', async () => {
    const p = await isolated.createPost({
      advisorId: ADVISOR, firmId: FIRM, title: 'Mine', outlineText: 'O'
    })
    await expect(isolated.getPost(p.id, OTHER, FIRM)).resolves.toBeNull()
    await expect(isolated.updatePost(p.id, OTHER, FIRM, { title: 'Meddled' })).resolves.toBeNull()
    await expect(isolated.removePost(p.id, OTHER, FIRM)).resolves.toBe(false)

    await expect(isolated.updatePost(p.id, ADVISOR, FIRM, { title: 'Mine again' })).resolves.toBeTruthy()
    await expect(isolated.removePost(p.id, ADVISOR, FIRM)).resolves.toBe(true)
  })

  test('the owner can edit a post title, text and pin', async () => {
    const p = await isolated.createPost({
      advisorId: ADVISOR, firmId: FIRM, title: 'A', outlineText: 'O'
    })
    const u = await isolated.updatePost(p.id, ADVISOR, FIRM, {
      title: 'B', finalText: 'The article', isPinned: true
    })
    expect(u.title).toBe('B')
    expect(u.finalText).toBe('The article')
    expect(u.isPinned).toBe(true)
  })

  test('a brief is replaced by signature rather than duplicated', async () => {
    await isolated.saveInput({ advisorId: ADVISOR, firmId: FIRM, signature: 'sig', topic: 'First' })
    await isolated.saveInput({ advisorId: ADVISOR, firmId: FIRM, signature: 'sig', topic: 'Second' })

    const all = await isolated.listInputs(ADVISOR, FIRM)
    expect(all).toHaveLength(1)
    expect(all[0].topic).toBe('Second')
  })

  test('🔴 two advisors using the SAME signature do not overwrite each other', async () => {
    await isolated.saveInput({ advisorId: ADVISOR, firmId: FIRM, signature: 'sig', topic: 'Mine' })
    await isolated.saveInput({ advisorId: OTHER, firmId: FIRM, signature: 'sig', topic: 'Theirs' })

    const mine = await isolated.listInputs(ADVISOR, FIRM)
    const theirs = await isolated.listInputs(OTHER, FIRM)
    expect(mine).toHaveLength(1)
    expect(mine[0].topic).toBe('Mine')
    expect(theirs[0].topic).toBe('Theirs')
  })

  test('a brief can be deleted by its owner and by nobody else', async () => {
    const i = await isolated.saveInput({ advisorId: ADVISOR, firmId: FIRM, signature: 'sig' })
    await expect(isolated.removeInput(i.id, OTHER, FIRM)).resolves.toBe(false)
    await expect(isolated.getInput(i.id, ADVISOR, FIRM)).resolves.toBeTruthy()
    await expect(isolated.removeInput(i.id, ADVISOR, FIRM)).resolves.toBe(true)
  })

  test('a reference can be read and deleted only by its owner', async () => {
    const r = await isolated.createReference({
      advisorId: ADVISOR, firmId: FIRM, title: 'Doc', type: 'document', content: 'text'
    })
    await expect(isolated.getReference(r.id, OTHER, FIRM)).resolves.toBeNull()
    await expect(isolated.removeReference(r.id, OTHER, FIRM)).resolves.toBe(false)
    await expect(isolated.getReference(r.id, ADVISOR, FIRM)).resolves.toBeTruthy()
    await expect(isolated.removeReference(r.id, ADVISOR, FIRM)).resolves.toBe(true)
  })

  test('references filter by topic, as the SQL does', async () => {
    await isolated.createReference({ advisorId: ADVISOR, firmId: FIRM, title: 'A', type: 'url', topic: 'Cash' })
    await isolated.createReference({ advisorId: ADVISOR, firmId: FIRM, title: 'B', type: 'url', topic: 'Tax' })

    await expect(isolated.listReferences(ADVISOR, FIRM, 'Cash')).resolves.toHaveLength(1)
    await expect(isolated.listReferences(ADVISOR, FIRM)).resolves.toHaveLength(2)
  })

  test('posts filter by kind, search and pinned — the same three as the SQL', async () => {
    await isolated.createPost({
      advisorId: ADVISOR, firmId: FIRM, kind: 'draft', title: 'Cash flow', outlineText: 'O'
    })
    await isolated.createPost({
      advisorId: ADVISOR, firmId: FIRM, kind: 'final', title: 'Tax year', outlineText: 'O', isPinned: true
    })

    await expect(isolated.listPosts(ADVISOR, FIRM, { kind: 'draft' })).resolves.toHaveLength(1)
    await expect(isolated.listPosts(ADVISOR, FIRM, { kind: 'final' })).resolves.toHaveLength(1)
    await expect(isolated.listPosts(ADVISOR, FIRM, { kind: 'final', search: 'tax' })).resolves.toHaveLength(1)
    await expect(isolated.listPosts(ADVISOR, FIRM, { kind: 'final', search: 'nothing' })).resolves.toHaveLength(0)
    await expect(isolated.listPosts(ADVISOR, FIRM, { kind: 'draft', pinnedOnly: true })).resolves.toHaveLength(0)
    await expect(isolated.listPosts(ADVISOR, FIRM, { kind: 'final', pinnedOnly: true })).resolves.toHaveLength(1)
  })

  test('the search matches topic and the named person too, and ignores case', async () => {
    await isolated.createPost({
      advisorId: ADVISOR, firmId: FIRM, title: 'T', topic: 'Cashflow', outlineText: 'O'
    })
    await isolated.createPost({
      advisorId: ADVISOR, firmId: FIRM, title: 'U', selectedPerson: 'Jane Doe', outlineText: 'O'
    })

    await expect(isolated.listPosts(ADVISOR, FIRM, { search: 'CASHFLOW' })).resolves.toHaveLength(1)
    await expect(isolated.listPosts(ADVISOR, FIRM, { search: 'jane' })).resolves.toHaveLength(1)
  })

  test('pinned posts come back first', async () => {
    await isolated.createPost({ advisorId: ADVISOR, firmId: FIRM, title: 'Plain', outlineText: 'O' })
    await isolated.createPost({
      advisorId: ADVISOR, firmId: FIRM, title: 'Pinned', outlineText: 'O', isPinned: true
    })

    const list = await isolated.listPosts(ADVISOR, FIRM, {})
    expect(list[0].title).toBe('Pinned')
  })

  test('a missing fallback file reads as empty rather than throwing', async () => {
    await expect(isolated.listInputs(ADVISOR, FIRM)).resolves.toEqual([])
    await expect(isolated.listPosts(ADVISOR, FIRM, {})).resolves.toEqual([])
    await expect(isolated.listReferences(ADVISOR, FIRM)).resolves.toEqual([])
    await expect(isolated.getPost('nope', ADVISOR, FIRM)).resolves.toBeNull()
    await expect(isolated.removePost('nope', ADVISOR, FIRM)).resolves.toBe(false)
    await expect(isolated.updatePost('nope', ADVISOR, FIRM, { title: 'x' })).resolves.toBeNull()
  })

  test('a corrupt fallback file reads as empty rather than throwing', async () => {
    fs.writeFileSync(file, '{not json at all')
    await expect(isolated.listPosts(ADVISOR, FIRM, {})).resolves.toEqual([])
  })

  test('JSON fields survive the round trip through the file', async () => {
    const i = await isolated.saveInput({
      advisorId: ADVISOR, firmId: FIRM, signature: 'sig', principles: [{ title: 'P', details: ['d'] }]
    })
    expect(i.principles).toEqual([{ title: 'P', details: ['d'] }])

    const read = await isolated.getInput(i.id, ADVISOR, FIRM)
    expect(read.principles).toEqual([{ title: 'P', details: ['d'] }])
  })
})

describe('a database failure is raised, not disguised', () => {
  test('every read rethrows when the dev fallback is not allowed', async () => {
    devFallbackAllowed.mockReturnValue(false)
    db.execute.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(store.listInputs(ADVISOR, FIRM)).rejects.toThrow('ECONNREFUSED')
    await expect(store.listPosts(ADVISOR, FIRM, {})).rejects.toThrow('ECONNREFUSED')
    await expect(store.listReferences(ADVISOR, FIRM)).rejects.toThrow('ECONNREFUSED')
    await expect(store.getInput('a', ADVISOR, FIRM)).rejects.toThrow('ECONNREFUSED')
    await expect(store.getPost('a', ADVISOR, FIRM)).rejects.toThrow('ECONNREFUSED')
    await expect(store.getReference('a', ADVISOR, FIRM)).rejects.toThrow('ECONNREFUSED')
  })

  test('every write rethrows when the dev fallback is not allowed', async () => {
    devFallbackAllowed.mockReturnValue(false)
    db.execute.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(store.saveInput({ advisorId: ADVISOR, firmId: FIRM, signature: 's' }))
      .rejects.toThrow('ECONNREFUSED')
    await expect(store.createPost({ advisorId: ADVISOR, firmId: FIRM, title: 'T', outlineText: 'O' }))
      .rejects.toThrow('ECONNREFUSED')
    await expect(store.createReference({ advisorId: ADVISOR, firmId: FIRM, title: 'T', type: 'url' }))
      .rejects.toThrow('ECONNREFUSED')
    await expect(store.updatePost('a', ADVISOR, FIRM, { title: 'x' })).rejects.toThrow('ECONNREFUSED')
    await expect(store.removeInput('a', ADVISOR, FIRM)).rejects.toThrow('ECONNREFUSED')
    await expect(store.removePost('a', ADVISOR, FIRM)).rejects.toThrow('ECONNREFUSED')
    await expect(store.removeReference('a', ADVISOR, FIRM)).rejects.toThrow('ECONNREFUSED')
  })
})
