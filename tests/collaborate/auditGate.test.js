'use strict'

/**
 * Tests for the dependency-audit gate (scripts/audit-gate.js).
 *
 * The pure decision logic is tested directly — no `npm audit` process is spawned.
 * Covers: the accepted build-time critical passing, a NEW critical blocking, the
 * GHSA-but-wrong-module safety case, HIGH never blocking, both npm 6 and npm 7 JSON
 * shapes, empty input, and stale-allow-list detection.
 */

const {
  evaluateAudit,
  normaliseFindings,
  ghsaFromUrl,
  ALLOWLIST
} = require('../../scripts/collaborate/audit-gate')

// The real accepted advisory (ejs, build-time only).
const EJS = { ghsa: 'GHSA-phwq-j96m-2c2q', module: 'ejs' }

// --- npm 6 (`advisories`) shape ------------------------------------------------
function npm6 (advisories) {
  const obj = {}
  advisories.forEach((a, i) => {
    obj[String(1000 + i)] = {
      id: 1000 + i,
      github_advisory_id: a.ghsa,
      module_name: a.module,
      severity: a.severity
    }
  })
  return { advisories: obj }
}

// --- npm 7+ (`vulnerabilities`) shape -----------------------------------------
function npm7 (advisories) {
  const vulns = {}
  advisories.forEach((a) => {
    vulns[a.module] = {
      name: a.module,
      severity: a.severity,
      via: [{ name: a.module, severity: a.severity, url: 'https://github.com/advisories/' + a.ghsa }]
    }
  })
  return { vulnerabilities: vulns }
}

describe('ghsaFromUrl', () => {
  test('extracts and upper-cases a GHSA id', () => {
    expect(ghsaFromUrl('https://github.com/advisories/GHSA-phwq-j96m-2c2q'))
      .toBe('GHSA-PHWQ-J96M-2C2Q')
  })
  test('returns null when absent', () => {
    expect(ghsaFromUrl('https://example.com/x')).toBeNull()
    expect(ghsaFromUrl(undefined)).toBeNull()
  })
})

describe('normaliseFindings', () => {
  test('reads the npm 6 advisories shape', () => {
    const f = normaliseFindings(npm6([{ ...EJS, severity: 'critical' }]))
    expect(f).toHaveLength(1)
    expect(f[0]).toMatchObject({ module: 'ejs', severity: 'critical' })
    expect(f[0].ghsa).toBe('GHSA-PHWQ-J96M-2C2Q')
  })
  test('reads the npm 7+ vulnerabilities shape', () => {
    const f = normaliseFindings(npm7([{ ...EJS, severity: 'critical' }]))
    expect(f).toHaveLength(1)
    expect(f[0]).toMatchObject({ module: 'ejs', severity: 'critical', ghsa: 'GHSA-PHWQ-J96M-2C2Q' })
  })
  test('de-duplicates identical findings', () => {
    const both = Object.assign({}, npm6([{ ...EJS, severity: 'critical' }]),
      npm7([{ ...EJS, severity: 'critical' }]))
    expect(normaliseFindings(both)).toHaveLength(1)
  })
  test('empty / missing input yields no findings', () => {
    expect(normaliseFindings({})).toEqual([])
    expect(normaliseFindings(null)).toEqual([])
  })
})

describe('evaluateAudit — blocking decision', () => {
  test('the accepted ejs critical does NOT block', () => {
    const r = evaluateAudit(npm6([{ ...EJS, severity: 'critical' }]))
    expect(r.blocking).toHaveLength(0)
    expect(r.allowlisted).toHaveLength(1)
  })

  test('a NEW, un-accepted critical DOES block', () => {
    const r = evaluateAudit(npm6([
      { ...EJS, severity: 'critical' },
      { ghsa: 'GHSA-xxxx-yyyy-zzzz', module: 'evil-pkg', severity: 'critical' }
    ]))
    expect(r.blocking).toHaveLength(1)
    expect(r.blocking[0].module).toBe('evil-pkg')
  })

  test('safety: a matching GHSA on the WRONG module still blocks', () => {
    const r = evaluateAudit(npm6([
      { ghsa: EJS.ghsa, module: 'some-other-pkg', severity: 'critical' }
    ]))
    expect(r.blocking).toHaveLength(1)
    expect(r.allowlisted).toHaveLength(0)
  })

  test('HIGH findings are reported but never block', () => {
    const r = evaluateAudit(npm6([
      { ghsa: 'GHSA-high-0001', module: 'braces', severity: 'high' }
    ]))
    expect(r.blocking).toHaveLength(0)
    expect(r.reviewHigh).toHaveLength(1)
    expect(r.reviewHigh[0].module).toBe('braces')
  })

  test('works identically on the npm 7 shape', () => {
    const r = evaluateAudit(npm7([{ ...EJS, severity: 'critical' }]))
    expect(r.blocking).toHaveLength(0)
    expect(r.allowlisted).toHaveLength(1)
  })

  test('clean audit passes with nothing to review', () => {
    const r = evaluateAudit({})
    expect(r.blocking).toHaveLength(0)
    expect(r.reviewHigh).toHaveLength(0)
  })

  test('flags an allow-list entry that matches no current finding', () => {
    // Only a high present → the ejs allow-list entry is unused this run.
    const r = evaluateAudit(npm6([{ ghsa: 'GHSA-high-0002', module: 'ip', severity: 'high' }]))
    expect(r.unusedAllowlist.some(a => a.module === 'ejs')).toBe(true)
  })

  test('a custom allow-list can accept a different finding', () => {
    const r = evaluateAudit(
      npm6([{ ghsa: 'GHSA-aaaa-bbbb-cccc', module: 'build-only', severity: 'critical' }]),
      [{ ghsa: 'GHSA-aaaa-bbbb-cccc', module: 'build-only', reason: 'test' }]
    )
    expect(r.blocking).toHaveLength(0)
    expect(r.allowlisted).toHaveLength(1)
  })
})

describe('ALLOWLIST integrity', () => {
  test('every entry documents a ghsa, module and reason', () => {
    expect(ALLOWLIST.length).toBeGreaterThan(0)
    ALLOWLIST.forEach((a) => {
      expect(a.ghsa).toMatch(/^GHSA-/)
      expect(typeof a.module).toBe('string')
      expect(a.module.length).toBeGreaterThan(0)
      expect(typeof a.reason).toBe('string')
      expect(a.reason.length).toBeGreaterThan(20)
    })
  })
})
