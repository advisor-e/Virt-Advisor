---
name: add-a-domain
description: >-
  Use when adding a new advisory domain to the engine, or fully configuring/adjusting an existing
  one. A domain is not a single record — it spans data/domains.json (the registration point) plus a
  set of companion per-domain files, and a few code touch-points that hardcode domain lists. Trigger
  for "add a domain", "configure the X domain", "new advisory area", "wire up domain X". Keywords:
  domains.json, domain-support, primary-issues, signals, logic tree, disambiguation, engagementType.
---

# Add (or configure) a domain

A domain spans several files. Miss one and the domain half-works (it's detected but has no support
content, or it has content but never gets detected). This is the checklist + order.

Apply the `single-source-wiring` discipline throughout: **trace the real consumers first**, prove
what each file currently contains, and verify counts after each edit. Governance: one edit at a
time, permission before each (CLAUDE.md).

## 1. The registration point — `data/domains.json` (always)

Add/confirm the domain object. Fields (match the existing shape exactly):
- `id` — the canonical kebab-case domain id used everywhere else as the key.
- `label` — human-readable name.
- `keywords` — the detection regex/alternation (how free text routes to this domain).
- `disambiguationKeywords` — narrower terms used when more than one domain matches.
- `engagementType` — `education` | `facilitation` | `advice` (the single source for the
  domain→engagement map; do NOT recreate a separate map — see `single-source-wiring`).
- `questions` — array of `{ field, text }` diagnostic questions (may be empty).

`data/domains.json` is loaded in `server-middleware/advisor.js` (≈ line 30) and its `questions`
are read for the dynamic-question flow (≈ lines 841 and 1220). Confirm the new id flows through
those paths.

## 2. Companion per-domain files (create/extend the ones the domain needs)

- **`data/<id>-domain-support.json`** — the advisor-facing support content (`overview` +
  `support_tools`). This is what the advisor sees as guidance for the domain.
- **`data/primary-issues.json`** — add a `"<id>": [ ...canonical primary issues... ]` entry. These
  are the Workshop-1 canonical issues for the domain (used by the primary-issue step).
- **`data/signal-dictionary.json`** + **`data/signal-assignments-draft.json`** — if the domain has
  diagnostic questions, register its signals here so they feed the case state / scoring.
- **`data/logic_trees.json`** — add the diagnostic tree(s) if the domain has one. Note: many trees
  are dormant by design — if you add one that isn't yet wired into a live path, say so and log it
  (no-silent-parking).
- **`data/content-summaries.json`** / **`data/semantic-profiles.json`** — template-matching content,
  only if the domain maps to templates.

Not every domain needs every file. State explicitly which you are creating and which don't apply.

## 3. Code touch-points & known gotchas

- **Hardcoded domain lists drift.** Search the codebase for any inline list of domain ids and update
  it — or better, make it read from `data/domains.json`. **Known example:** `DISTINCTION_DOMAINS`
  in `server/routes/firmManager.js` is a hardcoded 14-domain set; domains added after it cannot get
  Advisory Distinctions until that list is updated. Prefer fixing such lists via `single-source-wiring`.
- **`engagementType` is already single-source** in `domains.json` — never add a parallel domain→type
  map in code.
- **Never hand-edit the master `search_content` export** to add a domain's templates — templates are
  generated upstream in the Advisor-e master app and arrive via the export (CLAUDE.md). This skill
  adds the *engine config* for a domain, not its templates.

## 4. Verify

- `node -e "require('./data/domains.json')"` parses; the new `id` is present once.
- The new id appears in every place a domain id is expected (primary-issues, signals, any updated
  code list). Grep to confirm no consumer is missing it.
- Run the full suite: `npm test` (or `npx jest`) — green.

## 5. Record & commit

Tick the relevant item in `design/ACTIONS.md`; update memory if the domain set changed. Commit the
domain as its own unit. Push when asked.

## References
- `data/domains.json`, `data/<id>-domain-support.json`, `data/primary-issues.json`,
  `data/signal-dictionary.json`, `data/logic_trees.json`, `server-middleware/advisor.js`.
- Memory: `session_framework` (domain↔file mappings), `normalized_primary_issue_map`.
- Companion skill: `single-source-wiring`.
