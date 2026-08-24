'use strict'

// 🔴 WHAT THIS FILE IS FOR. A checker that reports green unconditionally is worse
// than no checker: it is the exact fault closed in item 4.30 — green, documented,
// and doing nothing. These tests prove `check-engines` can actually FAIL, on each
// of the three things it claims to look for, and that it stays quiet on a clean
// tree. UAT cannot perform this check at all, so it earns its place under the
// testing rule.

const fs = require('fs')
const os = require('os')
const path = require('path')

const {
  lockedNodeVersion,
  scanTree,
  engineOffenders,
  bannedPresent,
  pinViolations
} = require('../../scripts/check-engines')

/** Writes one fake installed package into a fixture tree. */
function place (nodeModules, name, manifest) {
  const dir = path.join(nodeModules, name.split('/').join(path.sep))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(Object.assign({ name }, manifest)))
  return dir
}

let tmp

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-engines-'))
})

afterAll(() => {
  try { fs.rmdirSync(tmp, { recursive: true }) } catch (e) {}
})

describe('lockedNodeVersion — the target is read from the lock, never typed beside it', () => {
  test('turns the declared range into a concrete version to test with', () => {
    const got = lockedNodeVersion({ engines: { node: '14.15.x' } })
    expect(got.range).toBe('14.15.x')
    expect(got.version).toBe('14.15.0')
  })

  // A missing engines field must stop the scan, not produce a comfortable zero
  // measured against nothing. That field IS the lock.
  test('refuses to run when the root declares no engines.node', () => {
    expect(() => lockedNodeVersion({})).toThrow(/engines\.node/)
  })
})

describe('the scan finds what a real tree hides', () => {
  let nodeModules

  beforeAll(() => {
    nodeModules = path.join(tmp, 'dirty', 'node_modules')
    fs.mkdirSync(nodeModules, { recursive: true })
    place(nodeModules, 'fine-pkg', { version: '1.0.0', engines: { node: '>=10' } })
    place(nodeModules, 'no-engines-pkg', { version: '1.0.0' })
    place(nodeModules, 'too-new-pkg', { version: '2.0.0', engines: { node: '>=18' } })
    place(nodeModules, '@scope/scoped-too-new', { version: '3.0.0', engines: { node: '>=16.20.0' } })
    place(nodeModules, 'typescript', { version: '5.9.0' })
    place(nodeModules, '@types/node', { version: '25.9.3' })
    // Nested under another package — the depth a flat listing misses.
    place(path.join(nodeModules, 'fine-pkg', 'node_modules'), 'buried-too-new', { version: '1.2.3', engines: { node: '>=20' } })
  })

  test('walks nested and scoped directories, not just the top level', () => {
    const names = scanTree(nodeModules).map(p => p.name).sort()
    expect(names).toContain('@scope/scoped-too-new')
    expect(names).toContain('buried-too-new')
    expect(names).toContain('@types/node')
  })

  test('flags every package whose Node range excludes the lock, and only those', () => {
    const flagged = engineOffenders(scanTree(nodeModules), '14.15.0').map(p => p.name).sort()
    expect(flagged).toEqual(['@scope/scoped-too-new', 'buried-too-new', 'too-new-pkg'])
  })

  test('flags a package req 2 forbids by name', () => {
    expect(bannedPresent(scanTree(nodeModules)).map(p => p.name)).toEqual(['typescript'])
  })

  test('flags an @types/node copy that has drifted off the pin', () => {
    const found = pinViolations(scanTree(nodeModules), { overrides: { '@types/node': '14.18.63' } })
    expect(found).toHaveLength(1)
    expect(found[0].version).toBe('25.9.3')
  })

  // Removing the pin is the same defect as drifting off it: nothing holds the
  // version down any more. It must not read as compliant.
  test('flags the copies when the pin itself has been deleted from package.json', () => {
    const found = pinViolations(scanTree(nodeModules), { overrides: {} })
    expect(found).toHaveLength(1)
    expect(found[0].reason).toMatch(/removed/)
  })
})

describe('a compliant tree reports nothing — the checker is not simply always red', () => {
  let nodeModules

  beforeAll(() => {
    nodeModules = path.join(tmp, 'clean', 'node_modules')
    fs.mkdirSync(nodeModules, { recursive: true })
    place(nodeModules, 'fine-pkg', { version: '1.0.0', engines: { node: '>=10' } })
    place(nodeModules, 'exact-pkg', { version: '1.0.0', engines: { node: '14.15.x' } })
    place(nodeModules, '@types/node', { version: '14.18.63' })
  })

  test('no engine offenders, no banned packages, no pin violations', () => {
    const pkgs = scanTree(nodeModules)
    expect(engineOffenders(pkgs, '14.15.0')).toEqual([])
    expect(bannedPresent(pkgs)).toEqual([])
    expect(pinViolations(pkgs, { overrides: { '@types/node': '14.18.63' } })).toEqual([])
  })

  // The best outcome req 2 allows: the package is gone entirely. That is compliance,
  // not a missing pin, and must not be reported as a fault.
  test('@types/node absent altogether is clean, not a violation', () => {
    expect(pinViolations([{ name: 'other', version: '1.0.0', dir: 'x' }], { overrides: {} })).toEqual([])
  })
})
