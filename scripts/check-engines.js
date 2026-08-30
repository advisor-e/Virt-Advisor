/**
 * check-engines.js — the check `.npmrc` had been promising since 2026-08-24.
 *
 * Item 4.7 brought the installed tree to zero Node-engine offenders and turned
 * `engine-strict=true` on. But `engine-strict` only fires for whoever runs the
 * install, and the scan that PROVED the zero was written ad hoc and thrown away.
 * So the state that took a morning to reach could not be confirmed by anybody
 * else without rebuilding the tool first — and two documents told them to run a
 * check that was not in the repository. That gap is item 4.44, and this is it.
 *
 * Three things are checked, and each fails the run:
 *
 *   1. ENGINES — every installed package whose `engines.node` excludes the locked
 *      runtime. This is what `engine-strict` enforces at install time; here it can
 *      be confirmed on demand, by anyone, without installing anything.
 *   2. BANNED PACKAGES — Stack Constitution req 2 forbids `typescript` and
 *      `vue-tsc` outright. Nothing looked for them before; item 4.41 exists
 *      because nothing looked for the third.
 *   3. THE `@types/node` PIN — req 2 names it too, but it cannot be removed (21
 *      transitive requirers, all Jest internals and webpack typings). It is
 *      accepted and pinned DOWN to the Node 14 line instead — see `.npmrc` and
 *      item 4.41's closure. This check guards that pin, so a silent drift back up
 *      is reported rather than discovered a month later.
 *
 * 🔴 THE TARGET IS READ, NEVER TYPED. The locked runtime comes from the root
 * `package.json`'s own `engines.node`. A version typed into this file could drift
 * away from the lock it exists to enforce, and would then report a comfortable
 * zero against the wrong number.
 *
 *   npm run check:engines
 *
 * Exits 0 when clean, 1 when anything is found. Not wired into pre-commit or CI:
 * a full `node_modules` walk is too slow for every commit, and `engine-strict`
 * already hard-fails the install, which is the enforcement. This is the on-demand
 * confirmation nobody had.
 *
 * Node 14.15 / CommonJS per the Stack Constitution.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const semver = require('semver')

const ROOT = path.resolve(__dirname, '..')

/** Req 2 forbids these outright. Present at any depth is a failure. */
const BANNED = ['typescript', 'vue-tsc']

/** Req 2 names this too, but it is unremovable — pinned low instead. See item 4.41. */
const PINNED_BAN = '@types/node'

/**
 * Reads a package.json, returning null rather than throwing on anything unreadable.
 * A malformed manifest deep in the tree must not kill the scan.
 *
 * @param {string} dir - directory expected to contain a package.json
 * @returns {object|null} the parsed manifest, or null
 */
function readPackage (dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  } catch (e) {
    return null
  }
}

/**
 * Resolves the locked runtime from the root manifest into a concrete version.
 *
 * `engines.node` is a RANGE (`14.15.x`); `semver.satisfies` needs a version to
 * test with, so the range's own minimum is used. That keeps the target derived
 * from the lock rather than restated beside it.
 *
 * @param {object} rootPkg - the root package.json
 * @returns {{range: string, version: string}}
 * @throws {Error} when the root declares no usable engines.node
 */
function lockedNodeVersion (rootPkg) {
  const range = rootPkg && rootPkg.engines && rootPkg.engines.node
  if (!range) {
    throw new Error('The root package.json declares no engines.node. That field IS the lock — restore it before trusting any scan.')
  }
  const min = semver.minVersion(range)
  if (!min) {
    throw new Error('Could not read a concrete version out of engines.node "' + range + '".')
  }
  return { range: range, version: min.version }
}

/**
 * Walks an installed tree and returns every package found, nested copies included.
 *
 * @param {string} nodeModulesDir - a node_modules directory
 * @returns {Array<{name: string, version: string, dir: string, engines: string|undefined}>}
 */
function scanTree (nodeModulesDir) {
  const found = []

  function walk (dir) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch (e) {
      return
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) { continue }
      const full = path.join(dir, entry.name)
      // A scope directory (@nuxt, @types) holds packages, not a package.
      if (entry.name.charAt(0) === '@') { walk(full); continue }
      if (entry.name === '.bin') { continue }
      const pkg = readPackage(full)
      if (pkg && pkg.name) {
        found.push({
          name: pkg.name,
          version: pkg.version || '?',
          dir: full,
          engines: pkg.engines && pkg.engines.node
        })
      }
      const nested = path.join(full, 'node_modules')
      if (fs.existsSync(nested)) { walk(nested) }
    }
  }

  walk(nodeModulesDir)
  return found
}

/**
 * Packages whose declared Node range excludes the locked runtime.
 *
 * @param {Array<object>} pkgs - output of scanTree
 * @param {string} target - concrete locked version, e.g. '14.15.0'
 * @returns {Array<object>} the offenders
 */
function engineOffenders (pkgs, target) {
  return pkgs.filter(function (p) {
    if (!p.engines) { return false }
    try {
      return !semver.satisfies(target, p.engines, { includePrerelease: true })
    } catch (e) {
      // An unparseable range is reported, never quietly treated as satisfied.
      return true
    }
  })
}

/**
 * Packages req 2 forbids outright, at any depth.
 *
 * @param {Array<object>} pkgs - output of scanTree
 * @returns {Array<object>} the offenders
 */
function bannedPresent (pkgs) {
  return pkgs.filter(function (p) { return BANNED.indexOf(p.name) !== -1 })
}

/**
 * Copies of the accepted-but-pinned package that have drifted off the pin.
 *
 * Absent entirely is the BEST outcome, not a fault — if the toolchain ever stops
 * requiring it, req 2 is satisfied outright and this returns nothing.
 *
 * @param {Array<object>} pkgs - output of scanTree
 * @param {object} rootPkg - the root package.json
 * @returns {Array<{name: string, version: string, dir: string, reason: string}>}
 */
function pinViolations (pkgs, rootPkg) {
  const copies = pkgs.filter(function (p) { return p.name === PINNED_BAN })
  if (copies.length === 0) { return [] }

  const pin = rootPkg && rootPkg.overrides && rootPkg.overrides[PINNED_BAN]
  if (!pin) {
    return copies.map(function (c) {
      return { name: c.name, version: c.version, dir: c.dir, reason: 'the overrides pin has been removed from package.json' }
    })
  }
  return copies.filter(function (c) {
    try {
      return !semver.satisfies(c.version, pin)
    } catch (e) {
      return true
    }
  }).map(function (c) {
    return { name: c.name, version: c.version, dir: c.dir, reason: 'off the pin (' + pin + ')' }
  })
}

/** Path relative to the repo root, so output is readable rather than absolute. */
function rel (dir) {
  return path.relative(ROOT, dir).split(path.sep).join('/')
}

/**
 * Runs all three checks and prints the report.
 *
 * @returns {number} process exit code — 0 clean, 1 something found
 */
function main () {
  const rootPkg = readPackage(ROOT)
  if (!rootPkg) {
    console.log('✖ Could not read the root package.json.')
    return 1
  }

  let locked
  try {
    locked = lockedNodeVersion(rootPkg)
  } catch (e) {
    console.log('✖ ' + e.message)
    return 1
  }

  const nodeModules = path.join(ROOT, 'node_modules')
  if (!fs.existsSync(nodeModules)) {
    console.log('✖ node_modules is not present — nothing to scan. Install first.')
    return 1
  }

  const pkgs = scanTree(nodeModules)
  const offenders = engineOffenders(pkgs, locked.version)
  const banned = bannedPresent(pkgs)
  const pins = pinViolations(pkgs, rootPkg)

  console.log('')
  console.log('Engine scan — locked runtime ' + locked.range + ' (tested as ' + locked.version + ')')
  console.log('Scanned ' + pkgs.length + ' installed packages.')
  console.log('')

  if (offenders.length) {
    console.log('✖ ' + offenders.length + ' package(s) declare a Node range that excludes the lock:')
    offenders.forEach(function (o) {
      console.log('    ' + o.name + '@' + o.version + '  needs ' + o.engines)
      console.log('      ' + rel(o.dir))
    })
    console.log('')
    console.log('  Fix each with an `overrides` entry in package.json — never by raising the')
    console.log('  locked Node target or by turning engine-strict off (CLAUDE.md, one-directional rule).')
    console.log('')
  } else {
    console.log('✔ Engines: 0 offenders.')
  }

  if (banned.length) {
    console.log('✖ ' + banned.length + ' package(s) the Stack Constitution forbids by name (req 2):')
    banned.forEach(function (b) {
      console.log('    ' + b.name + '@' + b.version + '  ' + rel(b.dir))
    })
    console.log('')
    console.log('  `legacy-peer-deps=true` in .npmrc exists to keep typescript out of this tree.')
    console.log('  If one has appeared, find what pulled it in before doing anything else.')
    console.log('')
  } else {
    console.log('✔ Banned packages: none of ' + BANNED.join(', ') + ' present.')
  }

  if (pins.length) {
    console.log('✖ ' + pins.length + ' copy/copies of ' + PINNED_BAN + ' have drifted off the pin:')
    pins.forEach(function (v) {
      console.log('    ' + v.name + '@' + v.version + '  — ' + v.reason)
      console.log('      ' + rel(v.dir))
    })
    console.log('')
    console.log('  ' + PINNED_BAN + ' is accepted-but-pinned, not approved. It cannot be removed while')
    console.log('  Jest is the test runner; it is held at the Node 14 line instead. See .npmrc and')
    console.log('  item 4.41 on design/features/to-do-done-and-parked.md.')
    console.log('')
  } else {
    const copies = pkgs.filter(function (p) { return p.name === PINNED_BAN }).length
    console.log('✔ ' + PINNED_BAN + ': ' + (copies === 0 ? 'not present at all — req 2 satisfied outright.' : copies + ' copy/copies, all on the pin.'))
  }

  const total = offenders.length + banned.length + pins.length
  console.log('')
  if (total === 0) {
    console.log('✔ Clean. The tree matches the Stack Constitution.')
    return 0
  }
  console.log('✖ ' + total + ' finding(s). This is a Stack Constitution deviation: log it on')
  console.log('  design/features/to-do-items.json as a score-5 reconcile task the moment it is found.')
  return 1
}

module.exports = {
  lockedNodeVersion: lockedNodeVersion,
  scanTree: scanTree,
  engineOffenders: engineOffenders,
  bannedPresent: bannedPresent,
  pinViolations: pinViolations,
  BANNED: BANNED,
  PINNED_BAN: PINNED_BAN
}

if (require.main === module) {
  process.exit(main())
}
