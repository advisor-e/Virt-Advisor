'use strict'

/**
 * EVERY /api PREFIX THE BROWSER ASKS FOR MUST BE ON THE NUXT PROXY LIST.
 *
 * Wiring is a property of two files, and nothing until now compared them. Nuxt forwards only
 * the prefixes listed in `serverMiddleware` in nuxt.config.js; a path missing from that list
 * gets a Nuxt 404 no matter how perfectly the Restify route behind it is registered and
 * serving. THREE FEATURES HAVE SHIPPED THAT WAY:
 *
 *   2026-09-02  Meeting Review — three slices, no entry. Found by opening the app: the
 *               advisor's pre-set answered "Your meeting checklist could not be loaded".
 *   2026-09-10  Client Copy Request — the tab calls its path first, so it showed an error
 *               instead of loading. Found 2026-09-11.
 *   2026-09-10  Compliance — found the same day, and NOT the hub tab, which reads
 *               /api/firm-manager and was always reachable. The only caller of
 *               /api/compliance is the gate on pages/meeting-record.vue. It FAILED CLOSED,
 *               the safe direction and deliberate — but the gate could never return open
 *               either, whatever a firm had declared, so Meeting Review was locked shut for
 *               everyone and a firm that had ticked saw the same screen as one that had not.
 *
 * The answer to the first two was a per-feature wiring test (clientsProxyWiring,
 * clientReportsProxyWiring). Both were written BECAUSE of 2026-09-02 and neither could catch
 * a third feature that never got one written. This is that check done once, for everything.
 *
 * ⚠ WHAT IT CANNOT SEE: a path assembled at runtime rather than written as a literal. Nothing
 * in the app does that today; if something starts to, this test will not know.
 */

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../../')

/** The directories whose code runs in the BROWSER. server/ is the other side of the wire. */
const FRONTEND = ['components', 'pages', 'utils', 'mixins', 'layouts', 'plugins']

/** A quoted `/api/<prefix>`, which is how a call is written everywhere in this app. */
const USED = /['"`](\/api\/[a-z0-9-]+)/g

/** An entry on the Nuxt proxy list. */
const PROXIED = /path: '(\/api\/[a-z0-9-]+)/g

/** Every file under one directory, recursively. */
function filesUnder (dir) {
  const here = path.join(root, dir)
  if (!fs.existsSync(here)) { return [] }
  const out = []
  const walk = (d) => {
    fs.readdirSync(d, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) { walk(full) } else { out.push(full) }
    })
  }
  walk(here)
  return out
}

/** Every distinct `/api/<prefix>` the browser-side code asks for, and where each was found. */
function prefixesAsked () {
  const found = new Map()
  FRONTEND.forEach((dir) => {
    filesUnder(dir).forEach((file) => {
      const text = fs.readFileSync(file, 'utf8')
      let m
      while ((m = USED.exec(text)) !== null) {
        const rel = path.relative(root, file).replace(/\\/g, '/')
        if (!found.has(m[1])) { found.set(m[1], rel) }
      }
    })
  })
  return found
}

/** Every `/api/<prefix>` Nuxt is told to forward. */
function prefixesProxied () {
  const cfg = fs.readFileSync(path.join(root, 'nuxt.config.js'), 'utf8')
  const out = new Set()
  let m
  while ((m = PROXIED.exec(cfg)) !== null) { out.add(m[1]) }
  return out
}

describe('the browser can reach every backend it calls', () => {
  it('has a Nuxt proxy entry for every /api prefix the frontend asks for', () => {
    const proxied = prefixesProxied()
    const missing = []
    prefixesAsked().forEach((where, prefix) => {
      if (!proxied.has(prefix)) { missing.push(`${prefix}  (called from ${where})`) }
    })

    // Named rather than counted: a bare number tells whoever broke this nothing about which
    // feature is dead, and the fix is one line per entry in nuxt.config.js serverMiddleware.
    expect(missing).toEqual([])
  })

  // A sanity check on the check itself. If the regexes ever stop matching, the test above
  // would pass against two empty sets and quietly guard nothing — the failure mode that makes
  // a green suite worse than no suite.
  it('is actually reading both files', () => {
    expect(prefixesProxied().size).toBeGreaterThan(10)
    expect(prefixesAsked().size).toBeGreaterThan(10)
  })
})
