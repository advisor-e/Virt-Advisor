---
name: master-export-upload
description: >-
  Use when building or modifying the Firm Manager feature that lets a firm upload its own master
  template export (the search_content_*.json file) instead of a developer placing it by hand.
  This is the secure-upload procedure: validate an untrusted uploaded JSON config, store it
  per-firm, and keep a safe fallback + version history. Trigger for any "upload the export",
  "firm uploads their templates", "self-service export upload", "Stage 2 search_content" work, or
  any feature that accepts an uploaded config/data file from the browser. Keywords: file upload,
  schema validation, last-known-good, version history, per-firm storage, search_content.
  STATUS: build-time guidance — the feature is not built yet (blocked on Firm Manager Auth).
---

# Master-export upload (secure)

How to safely accept a firm-uploaded master template export and swap it in behind the single
central loader. **Read this before writing any upload code.**

## Security first (a file upload is an attack surface — CLAUDE.md requires flagging this)

Treat every uploaded file as **hostile data**. The risks to defend against, and the rule for each:

- **Wrong/huge file → resource exhaustion.** Enforce a **size cap** and reject anything over it
  before reading the body. Accept **JSON only** (check content type *and* parse).
- **Malformed or malicious JSON → crash or bad state.** Parse inside try/catch. On any parse
  error, reject the upload and keep the current file untouched.
- **Wrong-shape JSON → silently breaks the app.** Validate the parsed object against the
  **expected schema/shape** (required top-level keys, array of templates with the expected
  fields) before accepting. If the shape is wrong, reject — do not store it.
- **Overwriting good data with bad → outage.** Never overwrite the live file in place. Write the
  new file only after it passes validation, and **keep the previous version as last-known-good**
  so a bad or partial upload can never take the firm offline.
- **Path traversal / arbitrary file write.** Never build the storage path from user-supplied
  names. Derive the path from the **verified firmId** (see below) and a fixed naming scheme.
- **Cross-firm access (IDOR).** The target firm **must** come from the verified JWT
  (`firmAuth`), never from a value sent by the browser. Gate the route to the **firm_manager**
  role. (Same rule as the IDOR item in `design/ACTIONS.md` — do not trust client-supplied
  identity.)

## Hard rules (inherit from CLAUDE.md)

- **Never hand-edit or mutate the contents of the master `search_content` export.** Its IDs and
  content are generated upstream in the Advisor-e master app. This feature *receives and stores*
  the file; it must never alter what's inside it.
- **Backend only.** All file handling, validation, and storage is on the **Restify backend** —
  never in Nuxt. The frontend only POSTs the file to a backend route. Node 14 / CommonJS.
- **Governance.** Investigate and propose first; get a "yes" before each file edit; one edit at
  a time.

## Procedure (when the feature is built)

1. **Confirm the prerequisite.** This needs a verified `firmId` — it is blocked on Firm Manager
   Auth (hub Phase 1). Do not build the per-firm scoping until that exists; until then, Stage 1
   (one central loader + validation, single-firm interim, file in one defined folder) is the
   only safe scope.
2. **Add a backend Restify route**, role-gated to `firm_manager`, that accepts the upload.
3. **Validate in order:** size cap → JSON-only → parse in try/catch → schema/shape check. Reject
   with a safe, generic message on any failure (no stack traces to the client — CLAUDE.md).
4. **Store per-firm**, path derived from the verified firmId (planned: a per-firm Google Drive
   folder `/VirtAdvisor/firms/{firmId}/`). Keep the prior version as **last-known-good**.
5. **Keep version history + restore** (this is the auditability requirement — a firm can roll
   back to a previous export).
6. **Swap in behind the single central loader** so the rest of the app reads the firm's file
   through the one existing entry point (this is itself a single-source concern — see the
   `single-source-wiring` skill).
7. **Test the validation function to 100%** (valid file, oversized, non-JSON, malformed JSON,
   wrong shape, missing fields) before marking done — AI/untrusted-input handling gets full
   coverage per CLAUDE.md.

## References
- `design/ACTIONS.md` → "Firm Manager: master-export self-service upload (Stage 2)".
- Memory: `master_export_lifecycle`, `firm_manager_hub`.
- The IDOR P1 item (verified-identity rule) in `design/ACTIONS.md`.
