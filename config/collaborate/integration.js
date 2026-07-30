'use strict'

/**
 * ADVISOR-E INTEGRATION CONFIG
 * ─────────────────────────────────────────────────────────────────────────────
 * The single place the integration team edits to align this app with Advisor-e.
 * Every other file imports its constants from here.
 *
 *   1. AUTH — match the JWT claim names + signing secret used by Advisory.com.
 *   2. DB   — point at the Advisor-e MySQL instance (or set the env vars).
 *
 * Prefer the env vars (JWT_SECRET, MYSQL_*) in real environments; the literals
 * here are dev placeholders. The backend refuses to boot in production while the
 * placeholders are still in place (see server/restify-server.js startup guard —
 * TODO: add when going live).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Auth ─────────────────────────────────────────────────────────────────────
// Names of the claims as they appear in the decoded Advisory.com JWT payload.
const AUTH = {
  firmIdClaim: 'firmId',
  advisorIdClaim: 'advisorId', // TODO: confirm with the Advisory auth team
  roleClaim: 'role',
  emailClaim: 'email',

  managerRole: 'firm_manager', // role granting Firm Manager access
  adminRole: 'platform_admin', // role granting platform-wide access
  mentorRole: 'platform_admin', // interim until a real 'mentor' role lands upstream

  // Signing secret used to verify tokens. For RS256 (asymmetric), put the public
  // key string here and switch the jwt.verify() call in server/middleware/auth.js.
  // TODO: replace with the shared secret from the Advisory auth service.
  secret: process.env.JWT_SECRET || 'REPLACE_ME_WITH_ADVISOR_E_JWT_SECRET'
}

// ── Database ─────────────────────────────────────────────────────────────────
// MySQL connection settings. Prefer the env vars in production.
const DB = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  database: process.env.MYSQL_DATABASE || 'advisor_collaborate',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'REPLACE_ME',
  connectionLimit: 10,
  connectTimeout: 2000 // fail fast in dev when MySQL is not running
}

// ── Cross-organisation engagement policy (plan §8; D1 + Q6 + the ceiling model) ─
// D1 (2026-07-03): the default posture is CLOSED / opt-in — members are sealed to
// their own organisation until a manager opts in to reach across. Q6 (2026-07-03):
// the boundary is the individual office (the advisor's `firm` / branch).
//
// CEILING MODEL (owner, 2026-07-07): the open/closed control is a MANAGER-level
// switch that exists at THREE stacked levels — brand (Global) → country (Group) →
// branch (Firm). A lower level may only ever TIGHTEN; a branch's EFFECTIVE posture
// is most-closed-wins across the three (see server/data/repository.js). Each level
// defaults to `defaultPosture`. Flip it to 'open' for an open-network default (a
// config flip, not a rebuild). Group/space-level gating still rides on T1-Spaces.
const CROSS_ORG = {
  defaultPosture: 'closed' // 'closed' = opt-in (D1) · 'open' = open network · applied at every ceiling level
}

// ── Advisor-e app links (deep-link a purchased tool to its hosted page) ────────
// SEAM (Q-PAGE-URL): the URL that opens an Advisor-e catalogue tool from its
// `pageId`. This is a PLACEHOLDER pattern — confirm the real one with the master
// team (and whether an SSO/token hop is needed). The link opens Advisor-e, which
// enforces its OWN access control (see Q-ACCESS-CASCADE) — this app never bypasses it.
const ADVISOR_E = {
  pageBaseUrl: process.env.ADVISOR_E_PAGE_BASE || 'https://app.advisor-e.com/p/'
}

// ── Outreach anti-spam guardrails (plan §4) ───────────────────────────────────
// "One outreach per person" is enforced separately (repo.hasOutgoingOutreach).
// These two are the remaining plan §4 guards, backend-enforced in sendOutreach:
//   dailyCap            — the most NEW cold outreaches one advisor may start per
//                         calendar day (owner policy, 2026-07-06).
//   respectAvailability — refuse cold outreach to an adviser marked unavailable.
// Both are tunable here without a rebuild.
const OUTREACH = {
  dailyCap: 20,
  respectAvailability: true
}

// ── Group invitations ─────────────────────────────────────────────────────────
// Manager bulk-invite (FEAT-BULKINVITE): the most invitees one request may carry.
// A guardrail against an oversized/abusive batch — tunable without a rebuild.
const INVITE = {
  bulkMax: 50
}

module.exports = { AUTH, DB, CROSS_ORG, ADVISOR_E, OUTREACH, INVITE }
