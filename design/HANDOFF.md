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

## Local Setup / Run

Getting the repo running on a developer machine. The runtime is **locked to Node.js 14.15** (Stack Constitution, Req 9) — do not substitute a newer Node. **Ports:** Nuxt frontend **3000**, Restify backend **4000**.

**Prerequisites**

- **Node.js 14.15** as the active runtime (via nvm). If a system-wide Node install shadows nvm on `PATH`, invoke the 14.15 binary by its **exact path** for every command rather than relying on `nvm use`.
- **npm 8** for installs — the `overrides` block in `package.json` (`shell-quote`, `@nuxt/friendly-errors-webpack-plugin`) is **silently ignored by the bundled npm 6**.
- **`NODE_EXTRA_CA_CERTS`** on any network doing TLS interception (corporate proxy / AV that re-signs HTTPS). Without it, `npm install` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` and the backend's OpenAI TLS call fails. The committed dev bundle is `certs/digicert-bundle.pem`, and the `dev`/`start` npm scripts already point `NODE_EXTRA_CA_CERTS` at it; substitute your own trusted root CA in your environment.

**Install**

```
NODE_EXTRA_CA_CERTS=./certs/digicert-bundle.pem npm install   # run with an npm 8 binary so overrides apply
```

**Run**

| Command | What it does |
|---|---|
| `npm run dev` | Nuxt dev server on :3000 (12 GB heap + cert preset) |
| `npm run backend` | Restify backend on :4000 |
| `npm run dev:all` | Both together (`concurrently`) |
| `npm run start` | Production `nuxt start` on :3000 |
| `npm test` | Jest suite |
| `npm run build` | `nuxt build` (CI gate) |

**Two gotchas that cost time**

- **The backend does NOT auto-load `.env`.** Only Nuxt loads `.env`. When running `npm run backend` standalone, export what it needs into that shell — at minimum `OPENAI_API_KEY` and `NODE_EXTRA_CA_CERTS` (the OpenAI REST call is TLS-verified).
- **LAN / incognito access:** Nuxt's default host can bind IPv6-only, which breaks `localhost` from another device or in incognito. Start with `nuxt start -H 0.0.0.0` (or `HOST=0.0.0.0`) when you need LAN access.

---

## Integration Checklist

### Step 1 — Edit `config/integration.js` (the ONLY file you should need to touch)

| Field | What to set |
|---|---|
| `AUTH.firmIdClaim` | Name of the firmId field in the Advisor-e JWT payload |
| `AUTH.advisorIdClaim` | Name of the advisorId field in the Advisor-e JWT payload (used to scope the Activity/Progression routes; falls back to the standard `sub` claim if absent) |
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

### ⚠ Client-supplied identity on non-Firm-Manager routes

The JWT-derived-identity standard above originally applied to the **Firm Manager** routes only. Three subsystems trusted **client-supplied** `advisorId` / `firmId`:

- **Activity / Progression** — `server/routes/activity.js` (`/api/activity/log-course`, `/api/activity/progression`, `/api/activity/team`). **RESOLVED 2026-06-09:** all three routes now sit behind `firmAuth`; `advisorId` and `firmId` are derived from the verified JWT, never from query/body. `/api/activity/team` additionally requires `requireManagerRole` (advisor → own data only; manager → own firm only). `firmAuth` now attaches `req.advisorId` from `AUTH.advisorIdClaim` (falling back to the JWT `sub` claim), with a matching dev-bypass advisor ID. The front-end (`AdvisorProgression.vue`, `CourseBuilder.vue` via `VirtualAdvisor.vue`) sends the Bearer token and no longer sends IDs in the request. Proven by `tests/unit/activity.routes.test.js` — a spoofed ID in the request is ignored. **Integration note:** confirm `AUTH.advisorIdClaim` matches the advisor-ID field name in the Advisor-e token (see Step 1).
- **Advisor session (`/api/advisor/query`) — RESOLVED 2026-06-16.** The core session route now sits behind `firmAuth`; `firmId`/`advisorId` are derived from the verified JWT (`req.firmId`/`req.advisorId`) and `advisorEngine.handleQuery` ignores any IDs in the request body. This closes an IDOR where a client could read another firm's template/staircase/distinction overrides, or log activity under any identity, by changing a body value. The front-end (`components/VirtualAdvisor.vue`, wired via `pages/advisor.vue`) now sends the Bearer token and no longer sends IDs in the body. Proven by `tests/unit/advisor.auth.test.js` and a live run (no token → 401; dev-bypass → session runs). **Integration note:** same as the activity routes — confirm `AUTH.firmIdClaim`/`AUTH.advisorIdClaim` and wire the real login token into the advisor page (HANDOFF Step 4/5); this env uses a placeholder `JWT_SECRET`.
- **Case studies (STILL OPEN)** — `utils/cases.js` → future `/api/cases/*` (see Learning Loop section + the field table where `advisor_id` / `firm_id` are noted as "Client prop"). This is client-side localStorage today, so there is no server endpoint to exploit yet; its IDOR fix lands with the Case-study MySQL migration, where the data first becomes shared/server-side. **Fix (against the line-130 standard):** derive `advisorId` / `firmId` from the verified JWT, scope every query to them, enforce ownership. **Gate:** close as part of the migration, before case data is shared across devices/advisors.

*(Surfaced per the registry's no-silent-parking rule — cross-ref registry Part 1A → Progression.)*

---

## Learning Loop — Case Studies

> **✅ STATUS 2026-06-19 — the localStorage→DB migration described below is BUILT on branch `feat/case-study-db`** (not yet merged). `utils/cases.js` is now an API client over secured `/api/cases` routes; `server/utils/caseStore.js` does the raw-SQL data access (with a dev-JSON fallback); identity is JWT-derived (IDOR closed). The `va_case_studies` table is in `config/db-schema.sql`. Schema below kept for reference; the *as-built* table is the one in `config/db-schema.sql` (it added `updated_at`, defaults `visibility` to `private`, and FKs `firm_id` to `firms`). Visibility model: private = advisor-only across their devices; shared = whole firm; two-way toggle. **Before production: provision the table in MySQL** (dev runs on the dev-JSON fallback). See `design/SESSION-2026-06-19-NOTES.md`.

The VA session system supports saving case studies for advisor learning and AI improvement. Each saved case captures the full conversation, session context, and post-delivery observations.

### Storage: firm database (was localStorage)

Case data now lives in the `va_case_studies` table via `server/utils/caseStore.js`, reached through the secured `/api/cases` routes. The four former localStorage CRUD functions in `utils/cases.js` are now API calls. **Shared visibility now actually reaches the firm** (and follows an advisor across devices) once the table is provisioned in MySQL; locally it runs on the dev-JSON fallback.

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

### Migration steps — DONE on `feat/case-study-db` 2026-06-19 (except step 1, a deploy task)

1. ☐ **Run the schema against MySQL** — `va_case_studies` is in `config/db-schema.sql`; provision it in the Advisor-e MySQL instance before production. (Dev uses the dev-JSON fallback, so this is the one remaining environment step.)
2. ✅ Replaced the `utils/cases.js` functions with API calls to `/api/cases/*` — all DB queries scoped to JWT identity, never the request body. Data access in `server/utils/caseStore.js`.
3. ✅ Registered the routes in `server/restify-server.js` (all `firmAuth`-guarded).
4. ✅ Built the one-time browser→API migration (`migrateLegacyCases` in `utils/cases.js`, run once from `caseMixin.mounted`; preserves ids, keeps the localStorage backup).

---

## Known Architecture Limitations

These are confirmed pre-production issues. They are not blocking for initial handoff but must be resolved before production scale or public exposure.

### L1 — No rate limiting on OpenAI endpoints (HIGH) — RESOLVED

~~`/api/advisor/query` and `/api/course` have zero throttling. Unbounded API spend is possible under load or abuse.~~

**Resolved:** Per-IP rate limiting is implemented in `server/advisorEngine.js` (and `server/courseEngine.js`) via `createLimiter` (imported from `server/utils/rateLimit.js`). The advisor query endpoint is limited at 30 requests per window. The `rateLimit.js` middleware handles the response directly and blocks over-limit requests before they reach OpenAI. *(Note: the engine moved from the Nuxt `server-middleware/` layer to the Restify backend during the OpenAI SDK→REST migration; the `server-middleware/` files are now thin SSE proxies.)*

### L2 — Conversation state round-trips via client (HIGH — architectural) — RESOLVED

~~`conversationState` (14+ fields including `recommendationDelivered`, `happyConfirmed`, `detectedDomain`) is serialised into every SSE response and trusted back from the client on the next request. An attacker can modify state in transit to skip the question pipeline entirely.~~

**Resolved:** Server-side session storage is implemented in `server/advisorEngine.js`. All conversation state is held in a server-side `Map` (`sessionStore`) keyed by a 16-byte random session ID. The client receives only the session ID; no state is round-tripped. Sessions expire after 2 hours of inactivity and are pruned every 15 minutes. For multi-process deployments, replace the `Map` with a Redis-backed store.

### L3 — `/api/firm/advisors` and `/api/firm/insights` are stub-only — RESOLVED BY DELETION 2026-07-29

~~These two routes now have `firmAuth` middleware applied (JWT required) but the handlers return empty placeholder data. They must be wired to real DB queries before the FirmDashboard can display live team data.~~

**Resolved by removing them, not by wiring them.** Both routes and `server/routes/firm.js` are deleted, together with the `FirmDashboard.vue` mock they existed to serve (owner ruling, 2026-07-29). Their only caller was commented-out code inside that mock, and the schema they proposed — `advisors` / `courses` / `course_sessions` — was never built, while the real data has always lived in `advisor_va_sessions`, `advisor_course_completions` and `va_courses`.

**The firm-manager team view now exists for real:** a Team Progress tab in `FirmManagerHub.vue` reading `GET /api/activity/team`, which is behind `firmAuth + requireManagerRole` and takes the firm from the verified token.

### L4 — Static template name alias map requires manual maintenance

`industryTemplateMap` has been removed from `server-middleware/advisor.js`. The remaining static map is `TEMPLATE_SUMMARY_ALIASES` in `server/utils/summaries.js` — it bridges known naming mismatches between logic tree template names and content summary names (e.g. `"Nine Growth Aspects"` → `"9 Growth Aspect Questions & Graphic"`).

This map is well-contained in one file but must be manually updated when:
- A new template is added whose name differs between `data/logic_trees.json` and `data/content-summaries.json`
- An existing template is renamed in either data file

No consolidation is required — the alias map is intentionally separate from the data files. The integration team should audit the map after any bulk template rename.

### L6 — Case study storage — ✅ RESOLVED 2026-06-19 (on `feat/case-study-db`, pending merge + table provisioning)

Case studies have moved from browser localStorage to the firm database (`va_case_studies` via `caseStore.js` + `/api/cases`). "Shared" cases now genuinely reach the firm and follow an advisor across devices; identity is JWT-derived so the IDOR is closed; a one-time migration lifts any pre-existing localStorage cases.

**Remaining before this is live in production:** (1) merge the branch, (2) provision the `va_case_studies` table in MySQL (`config/db-schema.sql`) — locally it runs on the dev-JSON fallback. The earlier risks (cross-device invisibility, no manager access, loss on clearing storage) are addressed by the migration once the table exists.

### L5 — Phase 3 `max_tokens` configuration

Phase 3 recommendation stream is set to `max_tokens: 2500` (raised from 1500 — the original value was truncating multi-template recommendations). If the recommendation format expands further (e.g. more templates, longer Content Summaries), this may need adjustment. The setting is in `server/advisorEngine.js` (around line 1989) at the OpenAI client call that produces the main recommendation stream.

---

## Known Issues

### Startup diagnostic log — API key (RESOLVED 2026-06-20)

~~`server-middleware/advisor.js` line 109 logs the last 8 characters of `OPENAI_API_KEY` to the console on every server start.~~

**Resolved during the OpenAI SDK→REST migration.** The startup check now lives in `server/advisorEngine.js` (`startupCheck`, ~line 197) and logs only a **boolean presence** flag — `[advisor] OPENAI_API_KEY present=true` — never any part of the key. No key fragment is logged anywhere in the codebase (verified 2026-06-20). The `present=true` line is a harmless diagnostic and is safe to leave in production, or remove if you prefer a silent startup; the `if (!process.env.OPENAI_API_KEY)` FATAL check should be kept.

---

### Backend runtime — Node.js 14.15 + Restify 9.1.0

The backend runs on the locked **Node.js 14.15** runtime (`engines.node: "14.15.x"` in `package.json`) with **Restify pinned to `9.1.0`** (declares Node ≥10 — in range for 14.15). See **Local Setup / Run** for how to invoke it.

**Do not run the backend on Node 16 / 18 / 20 / 24** — 14.15 is the locked target (Stack Constitution, Req 9).

*Historical note (resolved):* an earlier build ran `restify ^11.1.0`, which pulls `spdy` and a native `http_parser` binding removed in Node 24, so the backend couldn't start on Node 24 and the project briefly ran on Node 18/20. The stack reconciliation (merged to `master`, 2026‑06) pinned Restify back to `9.1.0` and locked the runtime to Node 14.15, which removes that incompatibility on the supported runtime.

---

### File-upload import shape (`formidable`) — RESOLVED

`server/routes/firmManager.js` handles multipart uploads (document upload + template-library import) with **`formidable` pinned to `2.1.2`** — the last v2 release before v3 pulled in a crypto helper requiring Node > 14.15 (see `design/ACTIONS.md`; the runtime is locked to Node 14.15). Two notes for anyone touching this code:

- **Import:** `const { formidable } = require('formidable')` (`firmManager.js:109`). Both v2 and v3 expose the factory as a `.formidable` named export, so the destructure works on either — don't "fix" it to a default import.
- **Promise wrapper:** v2's `form.parse()` is **callback-style**, so a small `parseForm(form, req)` helper (`firmManager.js:113`) wraps it to keep the `await [fields, files]` usage in the handlers. File-object property names are identical between v2.1 and v3, so the upload/DB code is version-agnostic.

---

### ⚠ DEV/TEST-ONLY persistence fallbacks — MUST be wired to MySQL before production

So the Firm Manager screens can be exercised on a local machine **without** a MySQL instance, three config **writes** fall back to a gitignored local JSON file when the database is unavailable. **This is a testing convenience only** — it is gated behind `IS_DEV` (`NODE_ENV !== 'production'`) and can never run in production, where the write would correctly surface a `DB_ERROR` instead.

| Feature | Route | Dev file (gitignored) |
|---|---|---|
| Template-library import | `POST /api/firm-manager/templates` | `data/dev-firm-templates.json` |
| Advisory Staircase override | `POST /api/firm-manager/staircase` | `data/dev-firm-staircase.json` |
| Advisory Distinctions | `POST/PUT/DELETE /api/firm-manager/distinctions` | `data/dev-firm-distinctions.json` |

**Real persistence is the `firm_framework_versions` table via `server/utils/firmOverlay.js`** (whole-config + version history + restore). **Required before production:** a live MySQL instance with the schema in `config/db-schema.sql`; the dev-file fallbacks are then never hit. They are **not** a storage mechanism — they hold one firm's latest value with **no version history** and must not be relied upon. Tracked in `design/ACTIONS.md` ("Firm Manager config persistence → MySQL").
