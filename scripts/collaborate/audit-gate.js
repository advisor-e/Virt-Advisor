'use strict'

/**
 * Dependency-audit gate.
 *
 * Implements the blocking audit gate mandated by `CLAUDE.md`
 * (§Enforcement / §Dependency and Version Governance). The documented policy is:
 *
 *   - **Block the commit on any CRITICAL finding** (`--audit-level=critical`) …
 *   - … *except* a short, explicit **allow-list** of findings that are already
 *     reviewed and formally accepted as **build-time-only** risk (they live in the
 *     Nuxt 2 build toolchain and are unreachable from the deployed runtime, and are
 *     unfixable under the Node 14.15 / Nuxt 2 lock — a semver-major bump is forbidden
 *     by the one-directional rule).
 *   - HIGH findings are **reported for review but never block** — the same policy the
 *     team already runs (protection by review, not by jamming the commit gate).
 *
 * Why a wrapper instead of raw `npm audit --audit-level=critical`: raw npm audit has
 * no way to accept a *specific, documented* advisory while still failing on any NEW
 * critical. Without that, the unavoidable build-time `ejs` critical would block every
 * commit (design/ACTIONS.md P1-AUDIT-GATE). The allow-list is keyed to the exact GHSA
 * id **and** module, so a *different* future critical — even in the same package —
 * still surfaces and blocks until a human reviews it.
 *
 * The accepted risks are recorded in `design/SECURITY-AUDIT-NOTES.md`; this file is the
 * machine-enforced counterpart. Adding an entry here is a deliberate, auditable act.
 *
 * Node 14.15 / CommonJS — no external dependencies. Handles both the npm 6 audit JSON
 * shape (`advisories`) and the npm 7+ shape (`vulnerabilities`) so it behaves whether
 * run on the locked runtime or a newer local npm.
 *
 * Exit codes: 0 = clean or only allow-listed criticals; 1 = an un-allow-listed critical
 * was found (commit/CI must stop). Infrastructure failure (audit could not run, e.g.
 * offline) warns and exits 0 — a transient network problem must not silently block all
 * commits, and CI re-runs it with connectivity.
 */

const { execSync } = require('child_process')

/**
 * The accepted-risk allow-list. Each entry is a critical finding that has been
 * reviewed and formally accepted as build-time-only. Keep this in lock-step with
 * `design/SECURITY-AUDIT-NOTES.md`.
 *
 * @type {Array<{ ghsa: string, module: string, reason: string }>}
 */
const ALLOWLIST = [
  {
    ghsa: 'GHSA-phwq-j96m-2c2q',
    module: 'ejs',
    reason:
      'ejs <3.1.7 template injection — reached ONLY via ' +
      'nuxt > @nuxt/webpack > webpack-bundle-analyzer > ejs, a build-time bundle-size ' +
      'tool. Not present in, or reachable from, the deployed runtime. Unfixable under ' +
      'the Node 14.15 / Nuxt 2 lock (semver-major = forbidden by the one-directional ' +
      'rule). Accepted build-time risk — see design/SECURITY-AUDIT-NOTES.md.'
  }
]

/**
 * Pull the GHSA id out of a GitHub advisory URL, if present.
 *
 * @param {string} url - e.g. 'https://github.com/advisories/GHSA-phwq-j96m-2c2q'
 * @returns {string|null} the GHSA id (upper-cased) or null
 */
function ghsaFromUrl (url) {
  const m = /\/(GHSA-[a-z0-9-]+)/i.exec(String(url || ''))
  return m ? m[1].toUpperCase() : null
}

/**
 * Normalise an `npm audit --json` payload (either the npm 6 `advisories` shape or the
 * npm 7+ `vulnerabilities` shape) into a flat, de-duplicated list of findings.
 *
 * @param {object} auditJson - parsed output of `npm audit --json`
 * @returns {Array<{ ghsa: (string|null), module: string, severity: string }>}
 */
function normaliseFindings (auditJson) {
  const out = []
  const seen = new Set()
  const add = (ghsa, moduleName, severity) => {
    const g = ghsa ? String(ghsa).toUpperCase() : null
    const key = (g || '') + '|' + (moduleName || '') + '|' + (severity || '')
    if (seen.has(key)) { return }
    seen.add(key)
    out.push({ ghsa: g, module: moduleName || '', severity: severity || '' })
  }

  if (auditJson && auditJson.advisories && typeof auditJson.advisories === 'object') {
    // npm 6 shape.
    for (const adv of Object.values(auditJson.advisories)) {
      add(adv.github_advisory_id, adv.module_name, adv.severity)
    }
  }

  if (auditJson && auditJson.vulnerabilities && typeof auditJson.vulnerabilities === 'object') {
    // npm 7+ shape — the GHSA + severity live on the `via` objects.
    for (const vuln of Object.values(auditJson.vulnerabilities)) {
      const vias = Array.isArray(vuln.via) ? vuln.via : []
      for (const via of vias) {
        if (via && typeof via === 'object') {
          add(ghsaFromUrl(via.url), via.name || vuln.name, via.severity || vuln.severity)
        }
      }
    }
  }

  return out
}

/**
 * Decide whether the audit result should block, given the allow-list.
 *
 * A critical finding is allow-listed only when BOTH its GHSA id and module match an
 * allow-list entry — matching the id alone is not enough, so a different critical in
 * the same module still blocks.
 *
 * @param {object} auditJson - parsed `npm audit --json`
 * @param {Array<{ghsa:string,module:string,reason?:string}>} [allowlist=ALLOWLIST]
 * @returns {{ blocking: Array, allowlisted: Array, reviewHigh: Array, unusedAllowlist: Array }}
 */
function evaluateAudit (auditJson, allowlist) {
  const list = Array.isArray(allowlist) ? allowlist : ALLOWLIST
  const findings = normaliseFindings(auditJson)

  const isAllowlisted = (f) =>
    list.some((a) =>
      a && f.ghsa &&
      String(a.ghsa).toUpperCase() === f.ghsa &&
      String(a.module) === f.module)

  const criticals = findings.filter((f) => f.severity === 'critical')
  const blocking = criticals.filter((f) => !isAllowlisted(f))
  const allowlisted = criticals.filter(isAllowlisted)
  const reviewHigh = findings.filter((f) => f.severity === 'high')

  // Allow-list entries that matched nothing — flag so the list can be pruned and
  // never quietly hides a risk that no longer exists.
  const unusedAllowlist = list.filter((a) =>
    !criticals.some((f) =>
      f.ghsa &&
      String(a.ghsa).toUpperCase() === f.ghsa &&
      String(a.module) === f.module))

  return { blocking, allowlisted, reviewHigh, unusedAllowlist }
}

/* istanbul ignore next: thin process/IO wrapper around the tested pure logic above */
function main () {
  let raw
  try {
    raw = execSync('npm audit --json', { maxBuffer: 1e8 }).toString()
  } catch (e) {
    // npm audit exits non-zero WHENEVER findings exist — that is the normal case here,
    // and the JSON is on stdout. Only treat it as an infra failure if there is no
    // parseable body.
    raw = (e && e.stdout ? e.stdout.toString() : '')
  }

  let json
  try {
    json = JSON.parse(raw)
  } catch (e) {
    process.stdout.write(
      '[audit-gate] WARN: could not run/parse `npm audit` (offline?). ' +
      'Skipping the audit gate this run — CI re-checks with connectivity.\n')
    process.exit(0)
    return
  }

  const { blocking, allowlisted, reviewHigh, unusedAllowlist } = evaluateAudit(json)

  process.stdout.write('[audit-gate] critical: ' + (blocking.length + allowlisted.length) +
    ' (' + allowlisted.length + ' allow-listed, ' + blocking.length + ' un-accepted) · high: ' +
    reviewHigh.length + ' (reported, non-blocking)\n')

  if (allowlisted.length) {
    process.stdout.write('[audit-gate] accepted build-time criticals: ' +
      allowlisted.map((f) => f.module + ' (' + f.ghsa + ')').join(', ') + '\n')
  }

  for (const a of unusedAllowlist) {
    process.stdout.write('[audit-gate] NOTE: allow-list entry no longer matches any finding — ' +
      'consider pruning: ' + a.module + ' (' + a.ghsa + ')\n')
  }

  if (blocking.length) {
    process.stdout.write('\n[audit-gate] BLOCKED — un-accepted CRITICAL finding(s):\n')
    for (const f of blocking) {
      process.stdout.write('  - ' + f.module + ' (' + (f.ghsa || 'no-GHSA') + ')\n')
    }
    process.stdout.write('\nReview it. If it is genuinely build-time-only and unfixable under ' +
      'the lock, add a documented entry to ALLOWLIST in scripts/audit-gate.js AND to ' +
      'design/SECURITY-AUDIT-NOTES.md. Otherwise fix it (npm audit fix — never --force).\n')
    process.exit(1)
    return
  }

  process.stdout.write('[audit-gate] PASS — no un-accepted critical findings.\n')
  process.exit(0)
}

if (require.main === module) { main() }

module.exports = { evaluateAudit, normaliseFindings, ghsaFromUrl, ALLOWLIST }
