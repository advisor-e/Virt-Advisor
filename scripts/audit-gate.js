#!/usr/bin/env node
'use strict'
/**
 * Pre-commit audit gate — replaces a bare `npm audit --audit-level=critical`.
 *
 * WHY THIS EXISTS (the non-obvious part):
 *   The locked Nuxt 2 stack (CLAUDE.md -> Stack Constitution) pins build tooling that
 *   carries a CRITICAL advisory whose only fix is a forbidden Nuxt 4 major upgrade. A
 *   bare critical gate therefore blocks EVERY commit on risk that is already formally
 *   accepted in design/SECURITY-AUDIT-NOTES.md. This gate still fails on any NEW critical
 *   advisory, but lets through ONLY the specific, documented, build-time advisories listed
 *   in ALLOWLIST below. It never blanket-disables the critical check.
 *
 * TO ACCEPT A NEW ADVISORY: add its GHSA id here AND document it (package, why it is
 *   build-time-only / not runtime-reachable, why it can't be fixed) in
 *   design/SECURITY-AUDIT-NOTES.md. Both, together — never one without the other.
 *
 * Node 14.15 / CommonJS, zero external deps by design (a new audit-tool dependency would
 * itself risk a Node-engine conflict — see the dev-toolchain drift task in ACTIONS.md).
 */
const { execSync } = require('child_process')

// Accepted, build-time-only critical advisories. Each MUST have a matching entry in
// design/SECURITY-AUDIT-NOTES.md ("Accepted critical build-time advisories").
const ALLOWLIST = new Set([
  // ejs template injection — reachable only via webpack-bundle-analyzer at build time
  // (not in/!reachable from the deployed runtime); fix path is Nuxt 4 (forbidden).
  'GHSA-phwq-j96m-2c2q'
])

// Validate the registry TLS chain behind the corporate/AV cert bundle if the caller
// (the husky hook) did not already set it.
if (!process.env.NODE_EXTRA_CA_CERTS) {
  process.env.NODE_EXTRA_CA_CERTS = './certs/digicert-bundle.pem'
}

function runAuditJson () {
  try {
    return execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (err) {
    // `npm audit` exits non-zero whenever vulnerabilities exist — the JSON report is
    // still written to stdout, so use it rather than treating this as a hard failure.
    if (err && err.stdout) { return err.stdout.toString() }
    throw err
  }
}

function ghsaFrom (str) {
  const m = /GHSA-[0-9a-z-]+/i.exec(str || '')
  return m ? m[0] : null
}

// Collect distinct CRITICAL advisories across both the npm >=7 and npm 6 JSON shapes,
// keyed by GHSA id so the result is stable regardless of which npm ran the audit.
function collectCriticals (audit) {
  const found = new Map() // ghsaId -> human title
  if (audit.vulnerabilities) { // npm >= 7
    for (const pkg of Object.values(audit.vulnerabilities)) {
      for (const via of (pkg.via || [])) {
        if (via && typeof via === 'object' && via.severity === 'critical') {
          const id = ghsaFrom(via.url) || String(via.source || via.url)
          found.set(id, via.title || via.name || id)
        }
      }
    }
  }
  if (audit.advisories) { // npm 6
    for (const adv of Object.values(audit.advisories)) {
      if (adv && adv.severity === 'critical') {
        const id = ghsaFrom(adv.url) || adv.github_advisory_id || String(adv.id)
        found.set(id, adv.title || adv.module_name || id)
      }
    }
  }
  return found
}

let audit
try {
  audit = JSON.parse(runAuditJson())
} catch (e) {
  console.error('[audit-gate] ERROR: could not run or parse `npm audit --json`: ' + e.message)
  process.exit(2)
}

const criticals = collectCriticals(audit)
const blocking = []
const accepted = []
for (const [id, title] of criticals) {
  if (ALLOWLIST.has(id)) { accepted.push(id + ' (' + title + ')') } else { blocking.push(id + ' (' + title + ')') }
}

if (accepted.length) {
  console.log('[audit-gate] Accepted build-time criticals (see design/SECURITY-AUDIT-NOTES.md):')
  accepted.forEach(function (a) { console.log('  - ' + a) })
}

if (blocking.length) {
  console.error('[audit-gate] BLOCKED: ' + blocking.length + ' un-accepted critical advisory(ies):')
  blocking.forEach(function (b) { console.error('  - ' + b) })
  console.error('[audit-gate] Resolve it, or — if it is genuinely build-time-only and unfixable')
  console.error('             within the locked stack — document it in design/SECURITY-AUDIT-NOTES.md')
  console.error('             and add its GHSA id to ALLOWLIST in scripts/audit-gate.js.')
  process.exit(1)
}

console.log('[audit-gate] PASS: no un-accepted critical advisories (' + accepted.length + ' accepted).')
process.exit(0)
