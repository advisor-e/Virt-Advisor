'use strict'

// The CPD half of activityStore's DEV/TEST-ONLY JSON fallback.
//
// What matters here: a pledge survives a round trip; REPEATS are kept rather than
// de-duplicated (the owner ruling — an advisor who watched a video three times did
// the work three times); a withdrawal stamps the row instead of deleting it, because
// a claim may already have been submitted to a professional body; and a withdrawal
// can only ever touch the claimant's own standing claim.
//
// Isolated temp dev file via ACTIVITY_DEV_FILE, same convention as the sibling
// activityStore fallback suite.

process.env.NODE_ENV = 'development'

const fs = require('fs')
const path = require('path')
const os = require('os')

// Set BEFORE requiring activityStore — DEV_ACTIVITY_FILE resolves at module load.
const DEV_FILE = path.join(os.tmpdir(), `va-test-dev-cpd-${process.pid}.json`)
process.env.ACTIVITY_DEV_FILE = DEV_FILE

// DB always rejects → forces the dev fallback path.
jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(() => Promise.reject(new Error('no db in this test')))
}))

const activityStore = require('../../server/utils/activityStore')

function clean () { try { fs.unlinkSync(DEV_FILE) } catch (e) { /* not there — fine */ } }
function readFile () { return JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) }

const claim = over => Object.assign({
  advisorId: 'a1',
  advisorName: 'Jordan Reeve',
  firmId: 'f1',
  templateTitle: 'E.O.Y Meeting',
  templatePage: 'id-7154906006',
  activity: 'video',
  minutes: 9,
  pledgeKey: 'cpd.pledge.video',
  pledgeVersion: 1
}, over)

let warn
beforeEach(() => {
  clean()
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => warn.mockRestore())
afterAll(clean)

// ── Round trip ────────────────────────────────────────────────────────────────

describe('recording a pledge', () => {
  test('stores every value the claim is made of, and reads it back', async () => {
    const stored = await activityStore.recordCpdClaim(claim())

    expect(stored.id).toBe(1)
    expect(stored.minutes).toBe(9)
    expect(stored.withdrawn_at).toBeNull()
    expect(stored.claimed_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)

    const [row] = await activityStore.readAdvisorClaims('a1', 'f1')
    expect(row).toMatchObject({
      advisor_id: 'a1',
      advisor_name: 'Jordan Reeve',
      firm_id: 'f1',
      template_title: 'E.O.Y Meeting',
      template_page: 'id-7154906006',
      activity: 'video',
      minutes: 9,
      pledge_key: 'cpd.pledge.video',
      pledge_version: 1,
      withdrawn_at: null
    })
  })

  test('the pledge wording is stored as a KEY and a version, never as English', async () => {
    // A reworded declaration must never change what an older claim says the advisor
    // agreed to — so the row holds the reference, and the words live in the locales.
    await activityStore.recordCpdClaim(claim())

    const [row] = await activityStore.readAdvisorClaims('a1', 'f1')
    expect(row.pledge_key).toBe('cpd.pledge.video')
    expect(row.pledge_version).toBe(1)
    expect(JSON.stringify(row)).not.toMatch(/I confirm/i)
  })

  test('an advisor with no name claim on their token still records a claim', async () => {
    const stored = await activityStore.recordCpdClaim(claim({ advisorName: null }))

    expect(stored.id).toBe(1)
    expect(readFile().cpdClaims[0].advisor_name).toBeNull()
  })

  test('a template with no page id stores none rather than an empty string', async () => {
    await activityStore.recordCpdClaim(claim({ templatePage: undefined }))

    expect(readFile().cpdClaims[0].template_page).toBeNull()
  })

  test('says out loud that the dev file — not the database — took the write', async () => {
    // A silent fallback is how data goes missing. This is the only trace.
    await activityStore.recordCpdClaim(claim())

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('recordCpdClaim'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('NOT production persistence'))
  })
})

// ── Repeats are the point ─────────────────────────────────────────────────────

describe('repeat claims', () => {
  test('the SAME template and activity can be claimed again and again', async () => {
    // Owner ruling 2026-07-29: some concepts require extra effort, and watching a
    // video three times is three real pieces of work. De-duplicating would erase it.
    await activityStore.recordCpdClaim(claim())
    await activityStore.recordCpdClaim(claim())
    await activityStore.recordCpdClaim(claim())

    const rows = await activityStore.readAdvisorClaims('a1', 'f1')
    expect(rows).toHaveLength(3)
    expect(rows.map(r => r.minutes)).toEqual([9, 9, 9])
  })

  test('each repeat is its own row with its own id', async () => {
    const first = await activityStore.recordCpdClaim(claim())
    const second = await activityStore.recordCpdClaim(claim())

    expect(second.id).toBe(first.id + 1)
  })

  test('the next id comes from the highest id, not the row count', async () => {
    // Otherwise a hand-edited or partially cleared file would reissue a live id, and
    // a withdrawal would then hit the wrong claim.
    await activityStore.recordCpdClaim(claim())
    await activityStore.recordCpdClaim(claim())
    const file = readFile()
    file.cpdClaims = [file.cpdClaims[1]] // drop the first, leaving id 2 alone
    fs.writeFileSync(DEV_FILE, JSON.stringify(file), 'utf8')

    const third = await activityStore.recordCpdClaim(claim())

    expect(third.id).toBe(3)
  })
})

// ── Withdrawal ────────────────────────────────────────────────────────────────

describe('withdrawing a claim', () => {
  test('stamps the row and KEEPS it', async () => {
    const stored = await activityStore.recordCpdClaim(claim())

    const done = await activityStore.withdrawCpdClaim(stored.id, 'a1', 'f1')

    expect(done).toBe(true)
    const rows = await activityStore.readAdvisorClaims('a1', 'f1')
    expect(rows).toHaveLength(1)
    expect(rows[0].withdrawn_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  test('withdrawing twice does not rewrite the date', async () => {
    const stored = await activityStore.recordCpdClaim(claim())
    await activityStore.withdrawCpdClaim(stored.id, 'a1', 'f1')
    const firstDate = (await activityStore.readAdvisorClaims('a1', 'f1'))[0].withdrawn_at

    const again = await activityStore.withdrawCpdClaim(stored.id, 'a1', 'f1')

    expect(again).toBe(false)
    expect((await activityStore.readAdvisorClaims('a1', 'f1'))[0].withdrawn_at).toBe(firstDate)
  })

  test('withdraws only the claim named, leaving its repeats standing', async () => {
    const first = await activityStore.recordCpdClaim(claim())
    await activityStore.recordCpdClaim(claim())

    await activityStore.withdrawCpdClaim(first.id, 'a1', 'f1')

    const rows = await activityStore.readAdvisorClaims('a1', 'f1')
    expect(rows.filter(r => !r.withdrawn_at)).toHaveLength(1)
  })

  test('another advisor cannot withdraw this advisor\'s claim', async () => {
    const stored = await activityStore.recordCpdClaim(claim())

    const done = await activityStore.withdrawCpdClaim(stored.id, 'a2', 'f1')

    expect(done).toBe(false)
    expect((await activityStore.readAdvisorClaims('a1', 'f1'))[0].withdrawn_at).toBeNull()
  })

  test('the same advisor id at another firm cannot withdraw it either', async () => {
    const stored = await activityStore.recordCpdClaim(claim())

    expect(await activityStore.withdrawCpdClaim(stored.id, 'a1', 'f2')).toBe(false)
  })

  test('a claim id that does not exist reports nothing withdrawn', async () => {
    expect(await activityStore.withdrawCpdClaim(999, 'a1', 'f1')).toBe(false)
  })

  test('a numeric-string id still matches its row', async () => {
    // The id round-trips through JSON and a URL on the way back from the browser.
    const stored = await activityStore.recordCpdClaim(claim())

    expect(await activityStore.withdrawCpdClaim(String(stored.id), 'a1', 'f1')).toBe(true)
  })
})

// ── Scoping and older files ───────────────────────────────────────────────────

describe('reading a record', () => {
  test('returns only this advisor\'s claims at this firm', async () => {
    await activityStore.recordCpdClaim(claim())
    await activityStore.recordCpdClaim(claim({ advisorId: 'a2' }))
    await activityStore.recordCpdClaim(claim({ firmId: 'f2' }))

    const rows = await activityStore.readAdvisorClaims('a1', 'f1')

    expect(rows).toHaveLength(1)
    expect(rows[0].advisor_id).toBe('a1')
    expect(rows[0].firm_id).toBe('f1')
  })

  test('newest first', async () => {
    await activityStore.recordCpdClaim(claim({ templateTitle: 'Older' }))
    const file = readFile()
    file.cpdClaims[0].claimed_at = '2026-01-01 09:00:00'
    fs.writeFileSync(DEV_FILE, JSON.stringify(file), 'utf8')
    await activityStore.recordCpdClaim(claim({ templateTitle: 'Newer' }))

    const rows = await activityStore.readAdvisorClaims('a1', 'f1')

    expect(rows.map(r => r.template_title)).toEqual(['Newer', 'Older'])
  })

  test('no file yet is an advisor with no claims, not a fault', async () => {
    expect(await activityStore.readAdvisorClaims('a1', 'f1')).toEqual([])
  })

  test('a dev file written before CPD existed reads as no claims', async () => {
    // Every dev file on disk today predates this table. An older file is a new CPD
    // record, not a crash — and its sessions must still load.
    fs.writeFileSync(DEV_FILE, JSON.stringify({ vaSessions: [], courseSessions: [] }), 'utf8')

    expect(await activityStore.readAdvisorClaims('a1', 'f1')).toEqual([])
    expect(await activityStore.withdrawCpdClaim(1, 'a1', 'f1')).toBe(false)
  })

  test('a CORRUPT dev file is a fault that is said out loud, not an empty record', async () => {
    // The honest-failure rule one layer down: a broken store must never look like an
    // advisor who has claimed nothing.
    fs.writeFileSync(DEV_FILE, '{ not json', 'utf8')

    await expect(activityStore.readAdvisorClaims('a1', 'f1')).rejects.toThrow()
  })

  test('recording into a corrupt file fails rather than silently starting a new record', async () => {
    fs.writeFileSync(DEV_FILE, '{ not json', 'utf8')

    await expect(activityStore.recordCpdClaim(claim())).rejects.toThrow()
  })
})

// ── Production never falls back ───────────────────────────────────────────────

describe('in production', () => {
  afterEach(() => { process.env.NODE_ENV = 'development' })

  test('a database failure propagates instead of writing a local file', async () => {
    process.env.NODE_ENV = 'production'

    await expect(activityStore.recordCpdClaim(claim())).rejects.toThrow('no db in this test')
    await expect(activityStore.readAdvisorClaims('a1', 'f1')).rejects.toThrow('no db in this test')
    await expect(activityStore.withdrawCpdClaim(1, 'a1', 'f1')).rejects.toThrow('no db in this test')
    expect(fs.existsSync(DEV_FILE)).toBe(false)
  })
})
