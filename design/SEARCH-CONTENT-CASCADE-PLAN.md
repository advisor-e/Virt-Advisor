# Search-Content Cascade Plan — the master library moves into the database

**Status:** Phases 1–3 approved and built (Phase 1 `5cf3743`/`6ba5dd7` 2026-08-31;
Phase 2 `c3f2ee9` 2026-09-01; Phase 3 approved by Mike 2026-09-01 — wording in §7 — and
built the same day). Phase 4 remains the master team's. Authored 2026-08-31 at Mike's
request (*"plan/design how to convert the manual download and upload of a json script
(the search contents script) into a cascading - dynamic - database so that future changes
to content can be more easily shared and maintained"*).

**Asked by:** Mike, 2026-08-31, in his own words above. This document is the committed
artefact the Save-the-Artefact rule requires before approval.

---

## 1. The problem, precisely

A content change today needs five manual steps and a developer:

1. Mike edits content upstream in **Advisor-e** (the master app — the only place the
   content and its IDs are ever edited; that rule is unchanged by this plan).
2. Advisor-e exports `search_content_<timestamp>.json`.
3. The file is dropped by hand into `Central Frameworks/` (gitignored).
4. A developer mirrors it 1:1 into the tracked `data/templates.json` — **the file the
   running app actually reads** (`server/utils/templates.js` L14), cached in memory
   forever once loaded.
5. The change is committed and the app redeployed.

Every firm sees the same library; the only variation is a firm upload route
(`importTemplates`) that has no screen in front of it yet.

## 2. What already exists to build on (checked against the code 2026-08-31)

- **The cascade engine is built and tested.** `firm_framework_versions` stores config per
  scope; `server/utils/tierChain.js` + `server/utils/firmOverlay.js` walk
  **Mentor (`__platform__`) → `__global__:<brand>` → `__group__:<brand>:<country>` →
  firm**, merging in precedence order, with version history and restore. Ruled by Mike
  2026-08-09; live today for distinctions, the staircase, domain support and logic trees.
- **A validated firm template upload already exists.** `importTemplates`
  (`server/routes/firmManager.js` L600) accepts a JSON upload, enforces a size cap,
  parses in try/catch, checks shape and required fields, and saves under
  `config_key='templates'` with history. The engine already prefers a firm's uploaded set
  over the base file (`server/utils/templates.js` `getOrgTemplates`).
- **The security procedure is written down** in
  `.claude/skills/master-export-upload/SKILL.md`: size cap → JSON-only → parse in
  try/catch → schema check; last-known-good fallback; identity from the verified JWT,
  never the browser; 100% test coverage on validation functions.

## 3. Authentication — corrected 2026-08-31, and it matters to this plan

> 🔴 **Global group managers AND group managers log into Advisor-e today, and have for the
> past 18 months. ALL login and authentication is handled by the master app, Advisor-e —
> never by this app.** (Mike, 2026-08-31.)
>
> The phrase "no middle-tier login exists" (`design/USER-LEVEL-CASCADE-HANDOVER.md`
> Part 3) is misleading shorthand for a much narrower gap **on this app's side**: this
> app has not been told what role values those managers' tokens carry.
> `server/collaborate/data/roles.js` maps only `platform_admin` and `firm_manager`;
> `globalManagerRole` / `groupManagerRole` in `config/integration.js` are deliberately
> empty strings, so an unrecognised role safely resolves to `advisor`.
>
> **Consequence for this plan:** the full four-tier cascade needs no login work anywhere.
> It lights up with config wiring here — the role constants, `firmAuth` recognising them,
> and the group/global scope claims stamped from the verified JWT — once the master team
> supplies the values their tokens already carry. Until then the chain runs
> mentor → firm, which is the current, safe behaviour.

## 4. The design — four phases, each separately approved

### Phase 1 — the master library moves into the database

A **Mentor Hub screen** where Mike uploads the export. It is validated exactly as firm
uploads are (same code path, same caps and shape checks), then stored under the reserved
`__platform__` scope in `firm_framework_versions`, `config_key='templates'` — version
history and restore for free, no new table, no schema change.

- `data/templates.json` **stays in git, demoted to seed and last-known-good fallback**:
  fresh clones, CI, dev machines without MySQL, and any moment the database is
  unreachable.
- This app **receives and stores** the file. It never edits what is inside; IDs and
  content remain Advisor-e's alone (CLAUDE.md rule, unchanged).
- Prerequisite already documented in `config/db-schema.sql`: the reserved `__platform__`
  row in `firms` must exist, or saves are foreign-key refused while the screen reports
  success — the fault that once ran the mentor's saves silently broken for weeks.

### Phase 2 — the loader goes dynamic and cascading

Replace the load-once file read in `server/utils/templates.js` with a cascade-aware
read through the existing overlay loader: **firm's set if uploaded → otherwise group's →
global's → platform baseline → file fallback** (the fallback is logged loudly, never
silent). A short-lived cache (~60 seconds) replaces the forever-cache, so a new upload is
live everywhere within a minute — no developer, no commit, no redeploy.

- **Tier semantics: wholesale replace, not merge.** Each export is a complete
  firm-specific library generated by Advisor-e; merging two libraries would create
  near-duplicate pages. The nearest tier that has uploaded a set supplies the whole
  library. *(✅ Ruled by Mike, 2026-08-31: a firm that uploads its own 250-page export —
  its advisors see those 250 only, never a blend with the platform's 291.)*
- Dev-time consumers of the raw export (`server/utils/masterExport.js`, the
  ghost-reference validator, audit/migration scripts) keep reading
  `Central Frameworks/` unchanged — they are developer tools, not the running app.

### Phase 3 — firm self-service upload goes live

Mostly finishing what is built: put a screen in front of `importTemplates` on the Firm
Manager Hub, align its validation with the real export shape (field-for-field), and add
the restore button (history is already stored). This is Stage 2 of the
`master-export-upload` skill, done per its procedure.

### Phase 4 (future, upstream) — remove the download step entirely

Advisor-e pushes the export straight to a Restify endpoint at the moment Mike publishes,
instead of Mike downloading and re-uploading. Needs the master team (app-to-app
authentication), so it is a handover item for `USER-LEVEL-CASCADE-HANDOVER.md`, not work
this repo can do alone. Phases 1–3 are shaped so Phase 4 is only a second doorway into
the same validated store — same validation, same versioning, same loader.

## 5. Risks, named before anything is built

- **A file upload is an attack surface.** Every defence in the skill applies: size cap,
  JSON-only, schema check, no path built from user input, firm identity from the verified
  JWT. Validation functions carry the project's 100% test bar.
- **A bad upload must never take a firm offline.** Never overwrite in place; the previous
  version is always restorable; the git file remains the floor beneath everything.
- **The reserved-row trap** (Part 3 of the cascade handover): every tier scope needs its
  `firms` row before a save at that tier, or the save fails silently-successfully.
- **Cache staleness vs load:** the ~60-second TTL trades at most a minute of staleness
  for not hitting MySQL on every request. Tunable; stated so it is a decision, not an
  accident.

## 6. What this plan does NOT change

- Content and IDs are edited **only** in Advisor-e. Ever.
- The engine's selection logic, scoring, and prompt building — untouched. Only *where the
  library is read from* changes.
- The `Central Frameworks/` folder and the dev-time scripts that read it.
- Authentication — it stays entirely Advisor-e's, as it always has been.

## 7. Phase 3 — the screen, as approved (Mike, 2026-09-01)

The firm's Template Library tab on the Firm Manager Hub, firm tier only (the middle
tiers get theirs only when a real need names it — recorded at `TAB_TIERS.templateLibrary`).
Menu placement: end of the **"Your AI coach"** group, since this decides which library
the AI recommends from. Upload + version history/restore + a **Remove upload** button
(Mike's yes, 2026-09-01: without it, restore alone can never take a firm back to the
platform's library). Removal uses the existing delete route, which also clears the
firm's upload history — the confirm dialog says so honestly rather than hiding it.

**Approved wording (Save-the-Artefact record):**

| Where | Text |
| --- | --- |
| Tab label | Template Library |
| Heading | Your firm's template library |
| Intro | Upload your firm's search-content export from Advisor-e. Your advisors will see this library instead of the platform's. |
| No upload yet | No upload — your advisors see the platform's library. |
| With an upload | {n} templates · uploaded {date} by {who} |
| …no uploader name recorded | {n} templates · uploaded {date} |
| …no history row at all (dev fallback) | {n} templates |
| Remove button | Remove upload |
| Remove confirm — title | Remove your firm's library? |
| Remove confirm — body | Your advisors will see the platform's library again, and your upload history here will be cleared. You can upload a new export at any time. |
| After removal (toast) | Upload removed — your advisors see the platform's library again. |
| Removal failed (toast) | The upload couldn't be removed — try again. |

Everything else (Choose a file, Upload export, Previous versions, Restore, the
rejection reasons) reuses the mentor tab's approved `templateLibrary.*` strings
unchanged — one fact, one home.

**The mentor tab's dangling line, fixed the same way** (the other half of item 4.55):
when no uploader name is recorded the line reads *"{n} templates · uploaded {date}"*,
and with no history row at all simply *"{n} templates"* — it never trails off after "by".

**Extended the same day (Mike, 2026-09-01), artefact
`design/mockups/firm-template-library.html`:** the screen also carries (a) a two-card
"whose library is in force" panel — platform vs the firm's own, the green badge following
the cascade; and (b) a **read-only, searchable contents table** of the library in force,
each row opening to the full record (purpose, learning objectives, meta tags, link id,
CPD minutes, growth stage, include-in-client, business fundamental — the master app's
Edit Content field set, shown not editable). **View-only by ruling:** *"view only for
now with potential to become the master doc source in future — depending on feedback
from the master coding team."* Editing stays in Advisor-e; one page, not two (contents
below the controls — same question, one screen).

## 8. References

- `.claude/skills/master-export-upload/SKILL.md` — the secure-upload procedure
- `design/USER-LEVEL-CASCADE-HANDOVER.md` — tier scopes, seam files, reserved rows
  *(its "no middle-tier login exists" line is corrected by §3 above)*
- `server/utils/tierChain.js` · `server/utils/firmOverlay.js` — the cascade engine
- `server/routes/firmManager.js` `importTemplates` — the existing validated upload
- `server/utils/templates.js` — the loader Phase 2 rewires
- `server/utils/masterExport.js` — dev-time export discovery (unchanged)
