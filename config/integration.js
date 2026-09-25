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
 * Collaborate's settings (CROSS_ORG, ADVISOR_E, OUTREACH, INVITE) live here too:
 * the two apps share ONE backend and one AUTH block, so a claim name or role value
 * is changed in exactly one place. Its former config/collaborate/integration.js
 * declared the same AUTH claims and role values and has been folded in here.
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
  // JWT claim for the user's display name. Advisor-e allocates the advisor ID and
  // authenticates the user before they ever reach this app, so the name arrives with
  // the same verified token — this is the link-in point, not a lookup we perform.
  // Absent claim = the team table shows the advisor ID, which is today's behaviour.
  // TODO: confirm the field name with the Advisor-e auth team.
  nameClaim: 'name',

  managerRole: 'firm_manager', // role value granting Firm Manager hub access
  adminRole: 'platform_admin', // role value granting platform-wide access
  // Role value granting the cross-firm Mentor view. Interim = platform_admin
  // until the master team introduces a distinct 'mentor' role upstream (see
  // design/USER-LEVEL-CASCADE-HANDOVER.md and the distinctions-cascade Stage 3).
  // Point this at the real 'mentor' role when it lands — no route change needed.
  mentorRole: 'platform_admin',

  // ── The two MIDDLE management tiers ─────────────────────────────────────────
  // 🔴 EMPTY ON PURPOSE, AND EMPTY IS THE FAIL-CLOSED STATE. Advisor-e issues no
  // role value for either tier yet (server/collaborate/data/roles.js maps only
  // platform_admin -> mentor and firm_manager -> firm_manager). An empty string
  // matches no role, so no token can resolve to these tiers and no save can land
  // in a group's storage by accident.
  //
  // DO NOT point either of these at an existing role to "make it work". That is
  // precisely how a mentor's saves ran into a firm's storage for weeks in 2026:
  // an existing role stood in for one that did not exist yet, requireManagerRole
  // let it through, and the screen reported success every time.
  //
  // INTEGRATION NOTE (for the Advisor-e team): set these to the real role values
  // when they exist, and supply the two claims below. Nothing else changes.
  globalManagerRole: '', // role value for a Global Group (brand) manager
  groupManagerRole: '', // role value for a Group (country) manager

  // Which group the signed-in manager manages. Advisor-e already holds this shape
  // on the user record — the firm is the Advisory `branch` and the country is
  // `country-address` — so this is a claim to PASS THROUGH, not data for anyone to
  // re-type on our side. A manager whose token omits the claim their tier needs is
  // refused, never defaulted: guessing a brand would file one customer's content
  // under another's.
  globalGroupClaim: 'globalGroup', // JWT claim carrying the brand, e.g. 'BDO'
  countryClaim: 'country', // JWT claim carrying the country, e.g. 'DE'

  // ── The BUSINESS ENTITY — the client being advised ──────────────────────────
  // 🔴 EMPTY ON PURPOSE, the same fail-closed state as the two tiers above. Advisor-e
  // issues no role value for a client yet. An empty string matches no role, so no
  // token can be taken for a client, and a client token can never pass firmAuth into
  // an advisor's routes (server/middleware/firmAuth.js refuses it by name).
  //
  // INTEGRATION NOTE (for the Advisor-e team): set the role value and the claim that
  // carries the client's id — it must equal the id in this app's client register
  // (va_clients.id), which is the key the advisor's per-client switches are stored
  // under. design/features/business-entity-reports.md.
  businessEntityRole: '', // role value for a business entity (client) login
  businessEntityIdClaim: 'businessEntityId', // JWT claim carrying the client's id

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
    JSON_CONFIG: 'json-config',
    // A firm's OWN compliance evidence — its lawyer's opinion, its privacy statement, its
    // engagement terms, its staff consultation record, its breach process (item 4.83,
    // slice 2). 🔴 NEVER THE TEXT OF THE LAW: Mike agreed on 2026-09-10 that uploading
    // statutes for the AI to read would put our software in the place of a firm's lawyer,
    // and a stale statute would have it quoting law that IPP3A superseded on 1 May 2026.
    //
    // ⚠ ADVISOR-E HOLDS THESE FILES AND DOES NOT READ THEM. They live in the same Drive as
    // every other firm document, under that firm's own folder, and the screen says so. A
    // tier above sees THAT a document exists and when it arrived, never the document.
    COMPLIANCE: 'compliance'
  }
}

// ── Advisor-e → this app: the template-library push (Cascade Phase 4) ─────────
// Advisor-e posts the search_content export to POST /api/integration/templates
// when Mike publishes, instead of him downloading and re-uploading it
// (design/SEARCH-CONTENT-CASCADE-PLAN.md Phase 4). A server is calling, not a
// person, so there is no JWT — a shared secret in the header below stands in.
//
// 🔴 EMPTY IS THE FAIL-CLOSED STATE. While `secret` is unset the route answers 404
// as though it did not exist. Set ADVISOR_E_PUSH_SECRET on the backend only, and
// give the same value to the Advisor-e team; it never reaches a Nuxt file.
//
// INTEGRATION NOTE (for the Advisor-e team): send the export file's JSON array as
// the request body, Content-Type application/json, with this header carrying the
// secret. 201 means stored and live within a minute; a 4xx body says why not.

const PUSH = {
  header: 'x-advisor-e-push-secret', // request header carrying the shared secret (lower-case, as Node exposes it)
  secret: process.env.ADVISOR_E_PUSH_SECRET || ''
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

// ── Master-app template pages (CB-25) ─────────────────────────────────────────
// How a template's page-link id (the `link` field in the search_content export,
// e.g. "id-7154906006") becomes a real Advisor-e page address. Pattern confirmed
// against a live URL (Mike, 2026-07-16):
//   {dashboardBase}#{link}?type={section, lowercased + URL-encoded}
// e.g. https://www.advisor-e.com/secure/dashboard#id-7154906006?type=do%20the%20job
// If the master app's page structure changes, adjust ONLY this block.

const TEMPLATE_PAGE = {
  dashboardBase: process.env.ADVISOR_E_DASHBOARD_URL ||
    'https://www.advisor-e.com/secure/dashboard'
}

// ── Cross-organisation engagement policy (Collaborate; D1 + Q6 + the ceiling model) ─
// D1 (2026-07-03): the default posture is CLOSED / opt-in — members are sealed to
// their own organisation until a manager opts in to reach across. Q6 (2026-07-03):
// the boundary is the individual office (the advisor's `firm` / branch).
//
// CEILING MODEL (owner, 2026-07-07): the open/closed control is a MANAGER-level
// switch that exists at THREE stacked levels — brand (Global) → country (Group) →
// branch (Firm). A lower level may only ever TIGHTEN; a branch's EFFECTIVE posture
// is most-closed-wins across the three (see server/collaborate/data/repository.js).
// Each level defaults to `defaultPosture`. Flip it to 'open' for an open-network
// default (a config flip, not a rebuild).

const CROSS_ORG = {
  defaultPosture: 'closed' // 'closed' = opt-in (D1) · 'open' = open network · applied at every ceiling level
}

// ── Advisor-e app links (deep-link a purchased tool to its hosted page) ───────
// SEAM (Q-PAGE-URL): the URL that opens an Advisor-e catalogue tool from its
// `pageId`. This is a PLACEHOLDER pattern — confirm the real one with the master
// team (and whether an SSO/token hop is needed). The link opens Advisor-e, which
// enforces its OWN access control (see Q-ACCESS-CASCADE) — this app never bypasses it.
//
// Distinct from TEMPLATE_PAGE above, deliberately: that one addresses a template's
// page inside the master dashboard, this one addresses a purchased marketplace tool.
// Same host, different routes — confirm both with the master team before go-live.

const ADVISOR_E = {
  pageBaseUrl: process.env.ADVISOR_E_PAGE_BASE || 'https://app.advisor-e.com/p/'
}

// ── Firm branding on a client's document (item 16) ───────────────────────────
// SEAM (Q-FIRM-BRAND): a firm's logo and brand colour are ADVISOR-E'S DATA, held
// on the FIRM PROFILE PAGE in the master app. Mike, 2026-09-22: "Advisor-e already
// picks up the colour and brands the border to suit." We never keep a copy of it
// and we build no screen to edit one — this is a stub connection, nothing more.
//
// WHY IT MATTERS: the 33 strategy concept drawings are white-labelled — a client
// sees their own advisor's firm, never Advisor-e. Every drawing already accepts a
// name, a logo and a colour; without these two values it prints the words "Firm
// logo" against an empty disc.
//
// These name COLUMNS on the `firms` table that server/utils/firmsDirectory.js
// already reads — the one and only place this backend touches that table. The
// master team either adds the two columns to ours, points the foreign keys at
// their own firms table (config/db-schema.sql already invites exactly that), or
// exposes a view carrying them. All three satisfy this seam unchanged.
//
// LEAVING THEM NULL IS SAFE AND IS THE SHIPPED STATE: the brand read resolves the
// firm's name only, every drawing falls back to the initials disc, and no SQL for
// these columns is ever built. Nothing waits on the master team to boot.
//
// ⚠ A COLUMN NAME CANNOT BE A BOUND PARAMETER, so whatever is typed here is
// interpolated into SQL. firmsDirectory.js validates both against a strict
// identifier pattern and REFUSES to build a statement from anything else — see
// `assertColumnName` there. Type a plain column name; never a fragment of SQL.
//
// TODO (master team): confirm the two column names on the firm profile record.

const FIRM_BRAND = {
  logoColumn: process.env.FIRM_BRAND_LOGO_COLUMN || null, // e.g. 'logo_url' — absolute http(s) URL of the firm's logo image
  colourColumn: process.env.FIRM_BRAND_COLOUR_COLUMN || null // e.g. 'brand_colour' — the border colour as #rrggbb
}

// ── Outreach anti-spam guardrails (Collaborate plan §4) ──────────────────────
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

// ── Group invitations (Collaborate) ──────────────────────────────────────────
// Manager bulk-invite (FEAT-BULKINVITE): the most invitees one request may carry.
// A guardrail against an oversized/abusive batch — tunable without a rebuild.

const INVITE = {
  bulkMax: 50
}

// ── AI providers (item 4.97 US8) ─────────────────────────────────────────────
// Mike, 2026-09-14: "yes" to a backend fallback provider, after the OpenAI account ran out of
// credit on 11 September and every AI feature in the product stopped at once.
//
// 🔴 NO PROVIDER IS NAMED IN CODE. Both are configured here from the environment, so the
// choice of who answers is an operator decision and never a developer's.
//
// 🔴 PERSONAL DATA GOES ONLY TO A PROVIDER MIKE HAS CLEARED, and the default is cleared for
// NOTHING. A meeting transcript, a client's words or the case anonymiser's input must not
// reach a second provider on a fallback simply because the first one failed: the consent a
// client gave aloud names AI transcription, not an arbitrary list of companies. DeepSeek was
// the provider Mike raised (2026-09-14) and it is the reason this defaults to false — its API
// is hosted in China and its terms permit training on submitted data, so it would need fresh
// consent wording and a fresh legal opinion per market before it could carry anything
// personal. A provider with a no-training, non-Chinese-hosted API needs neither.
//
// Which calls count as personal is decided at each call site, not here: see
// specs/003-engine-middle-learning-true/research.md R8 for the table of all 25.
//
// Four call sites can have NO fallback and the seam records that rather than pretending:
// the economic analysis (web search with citations), the two PDF schedule readers (base64
// file input) and the meeting transcription (audio) use endpoints and features no second
// provider offers today.

const _aiModels = (prefix, fallbacks) => ({
  classify: process.env[prefix + 'MODEL_CLASSIFY'] || fallbacks.classify,
  narrative: process.env[prefix + 'MODEL_NARRATIVE'] || fallbacks.narrative,
  course: process.env[prefix + 'MODEL_COURSE'] || fallbacks.course,
  report: process.env[prefix + 'MODEL_REPORT'] || fallbacks.report,
  reading: process.env[prefix + 'MODEL_READING'] || fallbacks.reading,
  review: process.env[prefix + 'MODEL_REVIEW'] || fallbacks.review,
  compliance: process.env[prefix + 'MODEL_COMPLIANCE'] || fallbacks.compliance,
  draft: process.env[prefix + 'MODEL_DRAFT'] || fallbacks.draft,
  research: process.env[prefix + 'MODEL_RESEARCH'] || fallbacks.research,
  extract: process.env[prefix + 'MODEL_EXTRACT'] || fallbacks.extract,
  translate: process.env[prefix + 'MODEL_TRANSLATE'] || fallbacks.translate
})

// The models each role uses today, moved here from eleven hardcoded literals across the
// backend so both providers can be configured without touching a call site twice.
const _primaryModels = {
  classify: 'gpt-4o-mini',
  narrative: 'gpt-4o-mini',
  course: 'gpt-4o',
  report: 'gpt-4o-mini',
  reading: 'gpt-4o-mini',
  review: 'gpt-4o-mini',
  compliance: 'gpt-6-astra',
  draft: 'gpt-6-astra',
  research: 'gpt-6-astra',
  extract: 'gpt-6-astra',
  // The app's own wording into a reader's language (server/utils/uiTranslation.js).
  translate: 'gpt-4o-mini'
}

const AI = {
  primary: {
    name: process.env.AI_PRIMARY_NAME || 'openai',
    host: process.env.AI_PRIMARY_HOST || 'api.openai.com',
    // The existing key, unchanged: an installation that sets nothing new keeps working.
    apiKey: process.env.AI_PRIMARY_KEY || process.env.OPENAI_API_KEY || '',
    models: _aiModels('AI_PRIMARY_', _primaryModels)
  },
  // Unset name or key = NO FALLBACK, and the seam behaves exactly as the app does today.
  fallback: {
    name: process.env.AI_FALLBACK_NAME || '',
    host: process.env.AI_FALLBACK_HOST || '',
    apiKey: process.env.AI_FALLBACK_KEY || '',
    chatPath: process.env.AI_FALLBACK_CHAT_PATH || '/v1/chat/completions',
    models: _aiModels('AI_FALLBACK_', {})
  },
  // Only the exact string 'true' clears the fallback for personal data. Anything else,
  // including 'TRUE', '1' and 'yes', leaves it uncleared — a privacy gate should not open
  // on a typo.
  fallbackPersonalCleared: process.env.AI_FALLBACK_PERSONAL_DATA_CLEARED === 'true'
}

module.exports = {
  AUTH, DB, DRIVE, PUSH, STORAGE, FRAMEWORK, TEMPLATE_PAGE, CROSS_ORG, ADVISOR_E, FIRM_BRAND, OUTREACH, INVITE, AI
}
