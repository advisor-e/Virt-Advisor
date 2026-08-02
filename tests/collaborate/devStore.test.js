'use strict'

/**
 * Tests for the DEV-ONLY Collaborate people-store snapshot
 * (server/collaborate/data/devStore.js and its wiring in repository.js).
 *
 * Two properties matter more than the round-trip itself and are tested first:
 *
 *   1. PRODUCTION WRITES NOTHING. The store holds names, emails and phone
 *      numbers. A JSON file of that on a live server would be personal data at
 *      rest outside the database, so production must not create one — even when
 *      a path is explicitly configured.
 *   2. THE SUITE IS SEALED OFF FROM THE DEVELOPER'S FILE. If the repository
 *      hydrated from whatever happens to be on the machine, these 431
 *      Collaborate tests would depend on local state and stop being repeatable.
 *      Every test below names its own temp file; nothing reads the real one.
 *
 * Each repository test re-requires the module with jest.resetModules() because
 * hydration happens once, at require time.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const DEV_STORE = '../../server/collaborate/data/devStore'
const REPOSITORY = '../../server/collaborate/data/repository'

let tmpDir
let tmpFile
const originalEnvFile = process.env.COLLAB_DEV_STORE_FILE
const originalNodeEnv = process.env.NODE_ENV

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-devstore-'))
  tmpFile = path.join(tmpDir, 'people.json')
  jest.resetModules()
})

afterEach(() => {
  if (originalEnvFile === undefined) { delete process.env.COLLAB_DEV_STORE_FILE } else { process.env.COLLAB_DEV_STORE_FILE = originalEnvFile }
  if (originalNodeEnv === undefined) { delete process.env.NODE_ENV } else { process.env.NODE_ENV = originalNodeEnv }
  try { fs.rmdirSync(tmpDir, { recursive: true }) } catch (_e) { /* best effort */ }
})

describe('devStore — where it refuses to run', () => {
  test('production reads and writes nothing, even with a file explicitly configured', () => {
    process.env.NODE_ENV = 'production'
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    const devStore = require(DEV_STORE)

    expect(devStore.isEnabled()).toBe(false)
    expect(devStore.save({ advisors: [{ id: 'me', email: 'mike@advisor-e.com' }] })).toBe(false)
    expect(fs.existsSync(tmpFile)).toBe(false)
    expect(devStore.load()).toBeNull()
  })

  test('under Jest it is off unless a test names its own file', () => {
    delete process.env.COLLAB_DEV_STORE_FILE
    const devStore = require(DEV_STORE)

    // This is what keeps the Collaborate suite independent of the developer's
    // own data/dev-collaborate-people.json.
    expect(devStore.isEnabled()).toBe(false)
    expect(devStore.load()).toBeNull()
  })
})

describe('devStore — reading and writing', () => {
  test('a saved snapshot loads back unchanged', () => {
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    const devStore = require(DEV_STORE)

    const snapshot = { advisors: [{ id: 'me' }], seq: { gjrSeq: 7 } }
    expect(devStore.save(snapshot)).toBe(true)
    expect(devStore.load()).toEqual(snapshot)
  })

  test('a malformed file loads as null rather than throwing', () => {
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    fs.writeFileSync(tmpFile, '{ this is not json', 'utf8')
    const devStore = require(DEV_STORE)

    expect(devStore.load()).toBeNull()
  })

  test('a JSON array is refused — the snapshot is an object', () => {
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    fs.writeFileSync(tmpFile, '[1,2,3]', 'utf8')
    const devStore = require(DEV_STORE)

    expect(devStore.load()).toBeNull()
  })
})

describe('repository — the store survives a restart', () => {
  test('a change writes the snapshot', async () => {
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    const repo = require(REPOSITORY)

    expect(fs.existsSync(tmpFile)).toBe(false)
    await repo.setOrgPosture('Advisor-e Munich', 'closed')

    expect(fs.existsSync(tmpFile)).toBe(true)
    const written = JSON.parse(fs.readFileSync(tmpFile, 'utf8'))
    expect(written.postures.firm['Advisor-e Munich']).toBe('closed')
  })

  test('a saved change is still there after a fresh require', async () => {
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    const first = require(REPOSITORY)
    await first.setOrgPosture('Advisor-e Munich', 'closed')

    jest.resetModules()
    const second = require(REPOSITORY)

    // Without hydration this reads the seed value, 'open'.
    await expect(second.getOrgPosture('Advisor-e Munich')).resolves.toBe('closed')
  })

  test('the id counters travel with the rows, so a restored row is not overwritten', async () => {
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    const first = require(REPOSITORY)
    const created = await first.requestJoinGroup('cashflow-clinic', 'sofia-rossi')
    expect(created).toBeTruthy()
    const firstId = JSON.parse(fs.readFileSync(tmpFile, 'utf8'))
      .groupJoinRequests.find(r => r.advisorId === 'sofia-rossi').id

    jest.resetModules()
    const second = require(REPOSITORY)
    await second.requestJoinGroup('cashflow-clinic', 'lena-schmidt')
    const ids = JSON.parse(fs.readFileSync(tmpFile, 'utf8')).groupJoinRequests.map(r => r.id)

    // The counter restarting at 1 would mint firstId a second time.
    expect(ids).toContain(firstId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('postures merge per level, so a brand added to the seed later is not lost', async () => {
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    // A snapshot written before 'Advisor-e Dublin' existed in the seed.
    fs.writeFileSync(tmpFile, JSON.stringify({
      postures: { firm: { 'Advisor-e Munich': 'closed' } }
    }), 'utf8')
    const repo = require(REPOSITORY)

    await expect(repo.getOrgPosture('Advisor-e Munich')).resolves.toBe('closed')
    await expect(repo.getOrgPosture('Advisor-e Dublin')).resolves.toBe('open')
  })

  test('a malformed snapshot leaves the seeded store standing', async () => {
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    fs.writeFileSync(tmpFile, 'not json at all', 'utf8')
    const repo = require(REPOSITORY)

    await expect(repo.getOrgPosture('Advisor-e Munich')).resolves.toBe('open')
    await expect(repo.getAdvisorById('me')).resolves.toEqual(expect.objectContaining({ id: 'me' }))
  })

  test('a read does NOT write the file', async () => {
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    const repo = require(REPOSITORY)

    await repo.listAdvisors({ viewerId: 'me' })
    await repo.getOrgPosture('Advisor-e Munich')
    await repo.listGroups()

    expect(fs.existsSync(tmpFile)).toBe(false)
  })
})

describe('repository — the mutator list cannot silently go stale', () => {
  test('every export named with a mutating verb is wrapped for persistence', () => {
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    const repo = require(REPOSITORY)
    const verbs = repo._MUTATING_VERBS

    const looksMutating = Object.keys(repo)
      .filter(n => !n.startsWith('_'))
      .filter(n => typeof repo[n] === 'function')
      .filter(n => verbs.some(v => n.startsWith(v)))

    // Add createSomething() and forget to list it, and this fails — instead of
    // that change quietly not being saved.
    const missing = looksMutating.filter(n => !repo._MUTATORS.includes(n))
    expect(missing).toEqual([])
  })

  test('every listed mutator exists and is a function', () => {
    process.env.COLLAB_DEV_STORE_FILE = tmpFile
    const repo = require(REPOSITORY)

    // A typo here would mean a real mutator silently never persists.
    repo._MUTATORS.forEach((name) => {
      expect(typeof repo[name]).toBe('function')
    })
  })
})
