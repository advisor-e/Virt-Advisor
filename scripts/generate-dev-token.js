'use strict'

/**
 * Generates a dev JWT for testing the Firm Manager hub locally.
 * Run: node scripts/generate-dev-token.js
 * Then paste the output into your browser console on the /firm-manager page.
 *
 * Only works when JWT_SECRET is still the placeholder — do not use in production.
 */

const jwt = require('jsonwebtoken')
const { AUTH } = require('../config/integration')

if (AUTH.secret !== 'REPLACE_ME_WITH_ADVISOR_E_JWT_SECRET' && !process.env.ALLOW_DEV_TOKEN) {
  console.error('ERROR: JWT_SECRET is set to a real value. Do not generate dev tokens against a live secret.')
  process.exit(1)
}

const payload = {
  [AUTH.firmIdClaim]: process.argv[2] || 'dev-firm-001',
  [AUTH.roleClaim]: 'firm_manager',
  [AUTH.emailClaim]: 'mike@advisor-e.com'
}

const token = jwt.sign(payload, AUTH.secret, { expiresIn: '24h' })

console.log('\nPaste this into your browser console on the /firm-manager page:\n')
console.log(
  `localStorage.setItem('advisor_e_token', '${token}'); ` +
  `localStorage.setItem('advisor_e_role', 'firm_manager'); ` +
  `localStorage.setItem('advisor_e_firm_id', '${payload[AUTH.firmIdClaim]}'); ` +
  `localStorage.setItem('advisor_e_email', '${payload[AUTH.emailClaim]}'); ` +
  `location.reload();`
)
console.log('\nToken expires in 24 hours. Re-run this script to get a fresh one.\n')
