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
