---
name: firm-manager-edit-target
description: >-
  Use when bringing a building block under no-code Firm Manager editing — letting a firm view and
  change a piece of the decision config without a developer. Trigger for any "make X firm-editable",
  "add X to Firm Manager", "EDIT-TARGET" work, or the pending building blocks in ACTIONS.md
  (14-question weight sliders, the strategy table, primary-issues, content-summaries, the coaching
  reference, the logic-tree editor). Reuses the existing firm-overlay mechanism (version history +
  restore for free) and the IDOR-safe auth guard. Keywords: firm override, firmOverlay, config_key,
  firm_framework_versions, Advisory Distinctions pattern, no-code editing, version history.
---

# Firm Manager edit-target

Make a building block firm-editable by **reusing the patterns already proven by Advisory
Distinctions and the Decision Framework** — do not invent new machinery.

Reference implementation: `server/routes/firmManager.js`. Read it before starting.

## Security & auth (non-negotiable — these are the IDOR-safe rules)

- Register the new routes in `server/restify-server.js` **behind `firmAuth` + `requireManagerRole`**
  (same as every other `/api/firm-manager/*` route). By the time a handler runs, `req.firmId`,
  `req.userRole`, and `req.userEmail` are guaranteed.
- **The firm is `req.firmId` (from the verified JWT). NEVER take firmId/advisorId from the request
  body or query.** Scope every read and write to `req.firmId`. (This is the exact rule in the open
  IDOR item in `design/ACTIONS.md` — follow it here so we don't add a new hole.)
- **Validate every field server-side** before storing: required-field checks, allowed-value sets,
  numeric clamping, `trim()`/filter on strings. Reject with `sendError(res, 400, CODE, msg)`.
- **Never leak internals.** Return generic messages via the `serverError()` helper; log the real
  error server-side only (no DB fragments, Drive IDs, or file paths in the response).

## Storage: reuse the firm overlay — no new schema

Firm overrides live in the `firm_framework_versions` table via `server/utils/firmOverlay.js`,
addressed by a string **`config_key`**. This already gives **version history + restore** (your
auditability requirement) for free:

- `overlay.loadFirmConfig(firmId, configKey)` → the firm's stored value (or `null`).
- `overlay.saveFirmConfig(firmId, configKey, value, savedBy)` → saves a new version.
- `overlay.getVersionHistory(firmId, configKey)` / `overlay.restoreVersion(firmId, configKey, versionId)`.

Pick one of the two shapes already in use:

1. **Whole-config override** (like the Decision Framework): one JSON object per `config_key`.
   Model on `getFramework` / `saveFramework` (validate `configJson` is a non-array object).
2. **CRUD rows** (like Advisory Distinctions, `config_key='advisory-distinctions'`): an array of
   rows stored under one key. Model on `listDistinctions` / `createDistinction` /
   `updateDistinction` / `deleteDistinction` — assign incrementing `id`, stamp `created_by` +
   `created_at`, validate per field.

## Dev fallback (so it runs without MySQL locally)

Mirror the existing pattern: on **read** routes, when the DB is unavailable and `IS_DEV`, return a
safe empty payload (`if (IS_DEV) { res.send(200, { ...empty }); return }`). For **CRUD writes**,
fall back to a local dev JSON file (the `_devReadDistinctions` / `_devWriteDistinctions` pattern,
e.g. `data/dev-firm-distinctions.json`, which is gitignored).

## Making the override actually take effect

A stored override only matters if the live decision path reads it. The engine merges the firm
override over the base config through `firmOverlay`. Confirm the building block you're exposing is
read through that overlay at runtime (the resolvers already accept `firmOverrides`) — otherwise the
edit saves but changes nothing.

## Frontend

Surface it in `components/FirmManagerHub.vue` (Pug template, Vue 2 Options API, Buefy/Bulma —
CLAUDE.md). The component calls the backend **through the `server-middleware/` proxy** to
`/api/firm-manager/*`; it never talks to MySQL or Drive directly. Confirm button/label wording with
the user before writing copy (CLAUDE.md).

## Gotcha: don't re-hardcode a list that already lives in data

`createDistinction` builds its allowed-domain set (`DISTINCTION_DOMAINS`) from `data/domains.json`,
so it never drifts and new domains are accepted automatically. Follow that pattern: when a new
edit-target needs an allowed-value list, **read it from the data file** (see the
`single-source-wiring` skill) rather than pasting a hardcoded list.

## Definition of done

- Routes registered behind `firmAuth` + `requireManagerRole`; everything scoped to `req.firmId`.
- Stored via `firmOverlay` under a new `config_key`; version history + restore work.
- Dev fallback in place (read + write).
- Override is read on the live decision path (proven, not assumed).
- Surfaced in `FirmManagerHub.vue` via the proxy.
- Tests: route ≥ 90%, validation 100% (valid, missing fields, wrong types, not-owned-by-firm,
  dev-fallback). Update `design/ACTIONS.md` (tick the EDIT-TARGET item).

## References
- `server/routes/firmManager.js`, `server/utils/firmOverlay.js`, `server/restify-server.js`,
  `components/FirmManagerHub.vue`.
- Memory: `firm_manager_hub`. Backlog: `design/ACTIONS.md` → EDIT-TARGET list.
