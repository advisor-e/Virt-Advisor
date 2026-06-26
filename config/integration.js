'use strict'

/**
 * ADVISOR-E INTEGRATION CONFIG
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the ONLY file the senior integration team needs to edit to align
 * this module with the Advisor-e app. Every other file imports its constants
 * from here — no hunting through routes, middleware, or services.
 *
 * Steps for integration:
 *   1. Set AUTH fields to match the JWT payload shape used by Advisor-e
 *   2. Set DB fields (or populate the corresponding env vars) for MySQL
 *   3. Set DRIVE fields to point to the service account and root folder
 *   4. Review STORAGE limits and ROLES if Advisor-e uses different values
 *
 * See design/HANDOFF.md for the full integration checklist.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Auth ──────────────────────────────────────────────────────────────────────
// Names of claims as they appear in the decoded JWT payload from Advisor-e.
// TODO: confirm these field names match the Advisor-e auth team's token shape.

const AUTH = {
  firmIdClaim: 'firmId', // JWT claim that carries the firm's unique ID
  advisorIdClaim: 'advisorId', // JWT claim that carries the advisor's unique ID. TODO: confirm with Advisor-e auth team
  roleClaim: 'role', // JWT claim that carries the user's role string
  emailClaim: 'email', // JWT claim for the user's email (falls back to 'sub')

  managerRole: 'firm_manager', // role value granting Firm Manager hub access
  adminRole: 'platform_admin', // role value granting platform-wide access
  // Role value granting the cross-firm Mentor view. Interim = platform_admin
  // until the master team introduces a distinct 'mentor' role upstream (see
  // design/USER-LEVEL-CASCADE-HANDOVER.md and the distinctions-cascade Stage 3).
  // Point this at the real 'mentor' role when it lands — no route change needed.
  mentorRole: 'platform_admin',

  // Signing secret used to verify tokens.
  // If Advisor-e uses RS256 (asymmetric), replace this with the public key
  // string and update the jwt.verify() call in server/middleware/firmAuth.js.
  // TODO: replace with the shared secret from the Advisor-e auth service.
  secret: process.env.JWT_SECRET || 'REPLACE_ME_WITH_ADVISOR_E_JWT_SECRET'
}

// ── Database ──────────────────────────────────────────────────────────────────
// MySQL connection settings. Prefer env vars in production.
// TODO: populate the env vars below, or set the fallback values directly.

const DB = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  database: process.env.MYSQL_DATABASE || 'virt_advisor', // TODO: replace
  user: process.env.MYSQL_USER || 'root', // TODO: replace
  password: process.env.MYSQL_PASSWORD || 'REPLACE_ME', // TODO: replace
  connectionLimit: 10,
  connectTimeout: 2000 // fail fast in dev when MySQL is not running
}

// ── Google Drive ──────────────────────────────────────────────────────────────
// Service account JSON key path and the Drive folder ID for /VirtAdvisor/.
// TODO: replace credentialsPath with the real path to the service account file.
// TODO: replace baseFolderId with the Google Drive folder ID of /VirtAdvisor/.

const DRIVE = {
  credentialsPath: process.env.GOOGLE_DRIVE_CREDENTIALS_PATH ||
    './config/drive-service-account.json',
  baseFolderId: process.env.GOOGLE_DRIVE_BASE_FOLDER_ID ||
    'REPLACE_ME_WITH_DRIVE_FOLDER_ID',

  // Subfolder names used inside /base/ and /firms/{firmId}/.
  // Only change these if the Drive folder structure is renamed.
  categories: {
    LOGIC_TABLES: 'logic-tables',
    DOMAIN_SUPPORT: 'domain-support',
    TEMPLATES: 'templates',
    VIDEOS: 'videos', // stores JSON metadata, not raw video files
    JSON_CONFIG: 'json-config'
  }
}

// ── Storage limits ────────────────────────────────────────────────────────────

const STORAGE = {
  maxFileSizeBytes: 20 * 1024 * 1024, // 20 MB per uploaded file
  maxFirmStorageBytes: 500 * 1024 * 1024, // 500 MB total per firm
  allowedMimeTypes: ['application/pdf'], // PDFs only for the document library
  allowedVideoProtocols: ['https:'] // video links must use HTTPS
}

// ── Framework versioning ──────────────────────────────────────────────────────

const FRAMEWORK = {
  maxVersionHistory: 10 // number of saved versions retained per firm per config key
}

module.exports = { AUTH, DB, DRIVE, STORAGE, FRAMEWORK }
