# Firm Manager Hub — Handoff Guide

This document is for the senior Advisor-e development team integrating the Firm Manager module into the main app.

---

## Overview

The Firm Manager hub is a protected section of the Virt Advisor app that allows firm-level managers to:

- Upload, download, and manage their firm's logic tables and domain support PDFs (stored in Google Drive)
- Edit and version-control their firm's overrides to the AI decision framework JSON
- Add video links tagged to advisory domains
- Edit their firm's profile and AI persona name

All content changes are scoped to the firm. The platform base layer is read-only to all firms. The AI session merges firm overrides on top of the platform base at runtime.

---

## Integration Checklist

### Step 1 — Edit `config/integration.js` (the ONLY file you should need to touch)

| Field | What to set |
|---|---|
| `AUTH.firmIdClaim` | Name of the firmId field in the Advisor-e JWT payload |
| `AUTH.roleClaim` | Name of the role field in the Advisor-e JWT payload |
| `AUTH.emailClaim` | Name of the email field in the JWT payload |
| `AUTH.managerRole` | The role string that grants Firm Manager access |
| `AUTH.adminRole` | The role string that grants platform-wide access |
| `AUTH.secret` | The JWT signing secret (or public key for RS256) |
| `DB.host / port / database / user / password` | Advisor-e MySQL connection details |
| `DRIVE.credentialsPath` | Absolute path to the Google Drive service account JSON key |
| `DRIVE.baseFolderId` | Google Drive folder ID of the `/VirtAdvisor/` root folder |

Set these as environment variables (`MYSQL_HOST`, `MYSQL_PASSWORD`, `JWT_SECRET`, `GOOGLE_DRIVE_CREDENTIALS_PATH`, `GOOGLE_DRIVE_BASE_FOLDER_ID`) rather than hardcoding them in the file for production.

### Step 2 — Run the database schema

```sql
-- Run against the Advisor-e MySQL database:
source config/db-schema.sql
```

If Advisor-e already has a `firms` table, skip the `CREATE TABLE firms` block and update the `FOREIGN KEY` references in the other four tables to point to your existing firms table.

### Step 3 — Google Drive setup

1. Create a folder called `/VirtAdvisor/` in the Google Drive account associated with the service account.
2. Copy the folder ID from the URL (the long string after `/folders/`).
3. Set `DRIVE.baseFolderId` to that ID.
4. Grant the service account "Editor" access to the `/VirtAdvisor/` folder.
5. Place the service account JSON key file at the path set in `DRIVE.credentialsPath`.

The service will create the subfolder structure (`/base/`, `/firms/{firmId}/`, etc.) automatically on first use.

### Step 4 — Frontend auth wiring (`pages/firm-manager.vue`)

The page reads auth state from localStorage using the keys defined in `AUTH_STORAGE` near the top of the file:

```js
const AUTH_STORAGE = {
  tokenKey: 'advisor_e_token',
  roleKey:  'advisor_e_role',
  firmKey:  'advisor_e_firm_id',
  emailKey: 'advisor_e_email'
}
```

Update these four keys to match wherever Advisor-e stores the JWT and user role after login. The server independently validates the token on every API call — this client-side check is UI-only.

### Step 5 — JWT algorithm (if RS256)

The auth middleware (`server/middleware/firmAuth.js`) defaults to HS256 (symmetric secret). If Advisor-e uses RS256:

1. Replace `jwt.verify(token, AUTH.secret)` with `jwt.verify(token, publicKey)` where `publicKey` is the PEM-formatted public key.
2. Add an `AUTH.publicKeyPath` field to `config/integration.js` and load the key from that path.

### Step 6 — File download auth

The `downloadDoc` method in `FirmManagerHub.vue` currently opens the download URL in a new tab, which does not send the Authorization header. For production, replace this with one of:

- A short-lived signed URL generated server-side
- A server-side redirect that proxies the Drive stream after verifying the token

---

## File Map

| File | Purpose |
|---|---|
| `config/integration.js` | **Single integration point** — all fields to change are here |
| `config/db-schema.sql` | MySQL schema — run once |
| `server/utils/db.js` | MySQL connection pool singleton |
| `server/middleware/firmAuth.js` | JWT verification + role enforcement |
| `server/services/driveService.js` | Google Drive folder management + file operations |
| `server/utils/firmOverlay.js` | Layered override merge logic + version history |
| `server/routes/firmManager.js` | All `/api/firm-manager/*` route handlers |
| `server/restify-server.js` | Route registration (Firm Manager routes added at bottom) |
| `pages/firm-manager.vue` | Nuxt page — client-side role gate, renders hub |
| `components/FirmManagerHub.vue` | Main hub UI — 4 tabs (Documents, Framework, Videos, Profile) |

---

## API Endpoints

All endpoints require `Authorization: Bearer <token>` with a `firm_manager` or `platform_admin` role.

| Method | Path | Description |
|---|---|---|
| GET | `/api/firm-manager/documents?category=` | List platform + firm documents |
| POST | `/api/firm-manager/documents` | Upload a firm document (multipart/form-data) |
| GET | `/api/firm-manager/documents/download?fileId=&fileName=` | Stream a file |
| DELETE | `/api/firm-manager/documents/:fileId` | Delete a firm document |
| GET | `/api/firm-manager/framework?configKey=` | Get firm override for a config section |
| POST | `/api/firm-manager/framework` | Save a firm override |
| GET | `/api/firm-manager/framework/history?configKey=` | List version history |
| POST | `/api/firm-manager/framework/restore` | Restore an earlier version |
| GET | `/api/firm-manager/videos` | List firm videos |
| POST | `/api/firm-manager/videos` | Add a video link |
| DELETE | `/api/firm-manager/videos/:id` | Remove a video link |
| GET | `/api/firm-manager/profile` | Get firm profile |
| PUT | `/api/firm-manager/profile` | Update firm profile |
| GET | `/api/firm-manager/storage` | Get storage usage (bytes + percent) |

---

## Security Notes

- `firmId` is always derived from the verified JWT — never from URL params or request body.
- Every DB query scopes to `req.firmId` — cross-firm data leakage requires a bug in this scoping.
- File uploads are restricted to `application/pdf` MIME type and 20 MB max size.
- Video URLs must use HTTPS.
- Per-firm storage quota is 500 MB (configurable in `STORAGE.maxFirmStorageBytes`).
- Uploaded files are validated by MIME type on the server before being sent to Drive.
- The `firmAuth` middleware returns 401/403 before any handler runs if the token is invalid or the role is insufficient.

### ⚠ KNOWN GAP — client-supplied identity on non-Firm-Manager routes (must-fix before real data)

The JWT-derived-identity standard above currently applies to the **Firm Manager** routes only. Two subsystems still trust **client-supplied** `advisorId` / `firmId` and must be brought up to that standard when the auth layer is wired:

- **Activity / Progression** — `server/routes/activity.js` (`/api/activity/log-course`, `/api/activity/progression`, `/api/activity/team`). IDs come from query/body params. As-is this is **broken access control (IDOR)**: a caller can read another advisor's or firm's progression data by changing the IDs.
- **Case studies** — `utils/cases.js` → future `/api/cases/*` (see Learning Loop section + the field table where `advisor_id` / `firm_id` are noted as "Client prop"). Same pattern.

**Fix (both, against the line-130 standard):** derive `advisorId` / `firmId` from the verified JWT (the `firmAuth` pattern), never from the request; scope every DB query to those values; enforce ownership — an advisor sees only their own data, a firm manager only their own firm.
**Gate:** close before the Progression feature serves real firm data.
*(Surfaced per the registry's no-silent-parking rule — cross-ref registry Part 1A → Progression.)*

---

## Learning Loop — Case Studies

The VA session system supports saving case studies for advisor learning and AI improvement. Each saved case captures the full conversation, session context, and post-delivery observations.

### Current storage: localStorage

Case data is stored in `utils/cases.js` via localStorage. The file explicitly notes the migration path — replace the four CRUD functions with API calls. The rest of the app is storage-agnostic by design. **Shared visibility (`visibility: 'shared'`) is stored correctly but cannot actually be shared across devices until the MySQL migration is complete.**

### MySQL migration — table schema

```sql
CREATE TABLE va_case_studies (
  id                         VARCHAR(64)               NOT NULL,
  advisor_id                 VARCHAR(64)               NOT NULL,
  firm_id                    VARCHAR(64)               NOT NULL,
  title                      VARCHAR(255)              NOT NULL,
  mode                       VARCHAR(32)               NOT NULL,
  visibility                 ENUM('shared','private')  NOT NULL DEFAULT 'shared',
  domain                     VARCHAR(128)              NULL,
  staircase_step             VARCHAR(128)              NULL,
  growth_stage               VARCHAR(64)               NULL,
  fin_mgt_theme              VARCHAR(128)              NULL,
  templates                  JSON                      NULL COMMENT 'Array of recommended template names from Phase 3 output',
  summary                    TEXT                      NULL COMMENT 'First 600 chars of Phase 3 AI output',
  transcript                 LONGTEXT                  NULL COMMENT 'Full conversation messages array (JSON)',
  feedback_pending           TINYINT(1)                NOT NULL DEFAULT 1 COMMENT '1 until advisor completes AI-guided post-session intake',
  review_went_well           TEXT                      NULL,
  review_went_less           TEXT                      NULL,
  review_changes_recommended TEXT                      NULL,
  reviewed_at                DATETIME                  NULL,
  created_at                 DATETIME                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_advisor          (advisor_id),
  INDEX idx_firm_visibility  (firm_id, visibility),
  INDEX idx_domain           (domain),
  INDEX idx_feedback_pending (firm_id, feedback_pending)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Case data field reference

| Field | Source | Notes |
|---|---|---|
| `id` | Client `crypto.randomUUID()` | Preserve as-is on migration |
| `advisor_id` | Client prop | Upgrade to JWT-derived once auth is wired |
| `firm_id` | Client prop | Upgrade to JWT-derived once auth is wired |
| `title` | Advisor input | Free text |
| `mode` | Session mode | `client`, `discover`, `plan`, `learn` |
| `visibility` | Advisor choice | `shared` = firm team; `private` = advisor only |
| `domain` | `session_meta` SSE event | One of the 14 advisory domain IDs |
| `staircase_step` | UI selector | Advisory Staircase step name |
| `growth_stage` | UI selector | Growth Curve stage name |
| `fin_mgt_theme` | UI selector | Financial Management theme name |
| `templates` | `session_meta` SSE event | Array of template names extracted from Phase 3 output |
| `summary` | Client | First 600 chars of last AI message |
| `transcript` | Client | Full `messages` array serialised as JSON |
| `feedback_pending` | Client | `true` until AI-guided intake is completed in-session |
| `review_*` | Post-delivery review UI | Filled in after advisor delivers session to client |

### Migration steps

1. Run the schema above against the Advisor-e MySQL database
2. Replace the four functions in `utils/cases.js` (`getCases`, `saveCase`, `updateCaseReview`, `deleteCase`) with API calls to new `/api/cases/*` routes — scope all DB queries to `firmId` from the JWT, never from the request body
3. Register new routes in `server/restify-server.js`
4. Build a one-time browser-side migration utility to export existing localStorage cases and POST them to the new API

---

## Known Architecture Limitations

These are confirmed pre-production issues. They are not blocking for initial handoff but must be resolved before production scale or public exposure.

### L1 — No rate limiting on OpenAI endpoints (HIGH) — RESOLVED

~~`/api/advisor/query` and `/api/course` have zero throttling. Unbounded API spend is possible under load or abuse.~~

**Resolved:** Per-IP rate limiting is implemented in `server-middleware/advisor.js` via `createLimiter` (imported from `./rateLimit`). The advisor query endpoint is limited at 30 requests per window. The `rateLimit.js` middleware handles the response directly and blocks over-limit requests before they reach OpenAI.

### L2 — Conversation state round-trips via client (HIGH — architectural) — RESOLVED

~~`conversationState` (14+ fields including `recommendationDelivered`, `happyConfirmed`, `detectedDomain`) is serialised into every SSE response and trusted back from the client on the next request. An attacker can modify state in transit to skip the question pipeline entirely.~~

**Resolved:** Server-side session storage is implemented in `server-middleware/advisor.js`. All conversation state is held in a server-side `Map` (`sessionStore`) keyed by a 16-byte random session ID. The client receives only the session ID; no state is round-tripped. Sessions expire after 2 hours of inactivity and are pruned every 15 minutes. For multi-process deployments, replace the `Map` with a Redis-backed store.

### L3 — `/api/firm/advisors` and `/api/firm/insights` are stub-only

These two routes now have `firmAuth` middleware applied (JWT required) but the handlers return empty placeholder data. They must be wired to real DB queries before the FirmDashboard can display live team data. The FirmDashboard.vue component currently uses client-side mock data.

**Fix required:** Implement the DB queries documented in `server/routes/firm.js` TODOs. The `FirmDashboard.vue` frontend will also need to send a JWT `Authorization` header when the stubs are replaced.

### L4 — Static template name alias map requires manual maintenance

`industryTemplateMap` has been removed from `server-middleware/advisor.js`. The remaining static map is `TEMPLATE_SUMMARY_ALIASES` in `server/utils/summaries.js` — it bridges known naming mismatches between logic tree template names and content summary names (e.g. `"Nine Growth Aspects"` → `"9 Growth Aspect Questions & Graphic"`).

This map is well-contained in one file but must be manually updated when:
- A new template is added whose name differs between `data/logic_trees.json` and `data/content-summaries.json`
- An existing template is renamed in either data file

No consolidation is required — the alias map is intentionally separate from the data files. The integration team should audit the map after any bulk template rename.

### L6 — Case study storage is localStorage only (MEDIUM — pre-production)

Case studies saved by advisors exist only in their browser's localStorage. This means:
- "Shared with firm" cases are not visible to other advisors on different devices
- Firm managers cannot access team case data
- Cases are lost if the advisor clears browser storage

**Fix required before production:** Migrate `utils/cases.js` to MySQL using the schema and steps documented in the "Learning Loop — Case Studies" section above. The migration path is already prepared — the four functions in `utils/cases.js` are the only files to replace.

### L5 — Phase 3 `max_tokens` configuration

Phase 3 recommendation stream is set to `max_tokens: 2500` (raised from 1500 — the original value was truncating multi-template recommendations). If the recommendation format expands further (e.g. more templates, longer Content Summaries), this may need adjustment. The setting is in `server-middleware/advisor.js` at the `getOpenAI().chat.completions.create()` call that produces the main stream.

---

## Known Issues

### Startup diagnostic log — API key fragment (REMOVE BEFORE PRODUCTION)

`server-middleware/advisor.js` line 109 logs the last 8 characters of `OPENAI_API_KEY` to the console on every server start. This is intentionally left in to make it easy to confirm the correct key is loaded during development and testing.

**Remove before production deployment.** Delete or comment out the `console.log` line at `server-middleware/advisor.js:109`. The surrounding `if (!process.env.OPENAI_API_KEY)` error check on line 105 should be kept — only the key fragment log needs to go.

---

### Node.js v24 + Restify v11 incompatibility

Restify v11 depends on `spdy`, which uses a native `http_parser` binding that was removed in Node.js v24. The backend (`server/restify-server.js`) will fail to start on Node 24 with a binding error.

**Fix:** Use Node.js 18 LTS or 20 LTS for the backend process. This is an upstream Restify issue — no changes to the Firm Manager code are required. Track the upstream fix at the `restify` npm package.
