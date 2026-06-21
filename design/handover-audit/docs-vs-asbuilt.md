# Handover Audit — Documentation vs As-Built + Architecture-Boundary Verification

**Audit date:** 2026-06-21 · **Scope:** read-only · **Auditor:** automated docs-vs-code accuracy + architecture-boundary sweep
**Method:** Read / Grep / Glob only. No files modified. No commands run that change state. Every drift claim is cited `path:line` with both the doc text and the code reality. Where a claim could not be verified without running tooling (e.g. live test counts), it is labelled UNVERIFIED.

---

## Summary

- **Architecture boundary: PASS.** The OpenAI SDK→REST migration has genuinely landed. No `require('openai')`, `new OpenAI(...)`, `OPENAI_API_KEY` read, or `api.openai.com` call exists in any Nuxt-reachable file (`pages/`, `components/`, `plugins/`, `store/`, `mixins/`, `server-middleware/`, `layouts/`). All OpenAI logic and the API key are backend-only (`server/advisorEngine.js`, `server/courseEngine.js`, `server/utils/openaiClient.js`). `server-middleware/advisor.js` (56 lines) and `course.js` (51 lines) are now true thin SSE proxies.
- **Nuxt `env:` block: PASS.** `nuxt.config.js:75-77` exposes only `apiBaseUrl` from `API_BASE_URL`. No secret is in the `env:` block.
- **Doc-vs-code drifts found: 7** (1 medium, 6 low/cosmetic). None are correctness or security defects. The most material is a **stale line-count claim** in `design/ACTIONS.md` that still describes the *pre-migration* monolith and would mislead a new dev into thinking the boundary work is not done.
- **One genuine cross-layer-call flag (not a secret leak):** `server-middleware/translate.js` calls a third-party translation API (`api.mymemory.translated.net`) directly from the Nuxt layer and reads a non-`API_BASE_URL` env var (`MYMEMORY_EMAIL`). This is a real architecture-boundary deviation per the spec ("third-party APIs … BACKEND-ONLY"), though it carries no secret and no DB/LLM access. Worth logging.
- **Org CA Capacity Planner mislabel: RESOLVED (diagnosis).** The mislabel is a *source-PDF naming* issue in the Logic folder, not a code/JSON defect. Recommendation below; no code change needed.

---

## Doc-vs-code drift table

| # | Claim | Doc location | Code reality | Severity |
|---|---|---|---|---|
| 1 | "Advisor/course engine + OpenAI SDK live in Nuxt `server-middleware/` … (`advisor.js` 2061 lines, `course.js` 507) — not the 'thin proxy' the spec requires." | `design/ACTIONS.md:130` (P2 ARCH item, status ☐ open) | `server-middleware/advisor.js` is **56 lines**, `course.js` is **51 lines** — both thin SSE proxies (verified by reading both; headers say "THIN PROXY", body only forwards to `http://localhost:4000`). The engines moved to `server/advisorEngine.js` (**2086 lines**) and `server/courseEngine.js` (**442 lines**). The migration that closes this item is marked DONE elsewhere (`ACTIONS.md:72`, `:198` superseded). The P2 line at `:130` was never struck through. | **Medium** — stale "open" item describing the pre-migration state; contradicts the (correct) DONE record at `ACTIONS.md:72`. A new dev reading `:130` would believe the boundary work is outstanding. |
| 2 | "`advisor.js` 2061 lines, `course.js` 507 lines" (the SDK-in-Nuxt boundary drift, "Still BLOCKED, not actioned") | `design/ACTIONS.md:198` | Same as #1 — those files no longer hold the engine. This paragraph is in a "Recently completed (2026-06-15)" block and was true *at that date*; it is now historical and reads as current-state if skimmed. | **Low** — historical entry, technically time-stamped, but easy to misread. |
| 3 | "`server-middleware/advisor.js` line 109 logs the last 8 characters of `OPENAI_API_KEY`" | `design/HANDOFF.md:270` | The struck-through `~~...~~` text is correctly marked RESOLVED at `:272`; verified — no key fragment is logged anywhere. Startup check is `server/advisorEngine.js:198-201`, logs only `present=true`. **Accurate doc** (resolved correctly). | **None** (verified accurate; listed for completeness). |
| 4 | `package.json` claims in ACTIONS: nuxt pinned `2.14.0`, restify `9.1.0`, `engines.node: 14.15.x` | `design/ACTIONS.md:64,66,68` | `package.json:38` `"nuxt": "2.14.0"`, `:39` `"restify": "9.1.0"`, `:4-6` `"engines": { "node": "14.15.x" }`. **All accurate.** `isomorphic-dompurify` exact-pinned `1.3.0` (`:34`) and `shell-quote` override `1.8.4` (`:60`) also match the docs. | **None** (verified accurate). |
| 5 | `server/courseEngine.js` header comment: "Nuxt 2 server middleware — handles POST /api/course" | `server/courseEngine.js:4` | The file is now a **Restify backend engine** registered at `server/restify-server.js:122` (`server.post('/api/course', courseEngine)`), not Nuxt server-middleware. The header was carried over verbatim from the old `server-middleware/course.js` during the move and never updated. | **Low** — misleading in-code doc; a new dev grepping for "server middleware" lands on a backend file. |
| 6 | "`formidable` v3.5.4 is installed … Fixed to `const { formidable } = require('formidable')`" (RESOLVED note) | `design/HANDOFF.md:284-286` | `package.json:31` now pins `"formidable": "2.1.2"` (the stack-reconciliation downgrade, `ACTIONS.md:32`). The HANDOFF note still narrates the *v3* import bug and its v3 fix as if v3 were installed. The actual installed version is v2.1.2, which uses a callback `parse()` wrapper (`ACTIONS.md:32`). | **Low** — stale narrative; the named bug no longer applies to the installed version. |
| 7 | "Node.js v24 + Restify v11 incompatibility … Use Node.js 18 LTS or 20 LTS for the backend process." | `design/HANDOFF.md:276-280` | Contradicts the locked runtime. `CLAUDE.md` Req 9 + `package.json:5` lock **Node 14.15**, and `restify` is pinned `9.1.0` (not v11). The Node-version guards (`nuxt.config.js:5-21`, mirrored in `server/restify-server.js`) reject ≥22 and warn on anything `!== 14`, pointing to `nvm use 14.15.0`. The HANDOFF "use Node 18/20" guidance is the old pre-reconciliation stance and now conflicts with the Constitution. | **Low-Medium** — actively wrong onboarding guidance; could send a new dev to the wrong Node version. |

### Items checked and found ACCURATE (no drift)
- `nuxt.config.js` serverMiddleware registration (`:67-71`) matches the three proxy files present.
- `/api/advisor/query` is behind `firmAuth` with firmId/advisorId from JWT (`server/restify-server.js:121`; HANDOFF `:144` claim verified).
- Rate limiting moved to `server/utils/rateLimit.js` and used by the engines (HANDOFF `:227` L1-RESOLVED claim — `courseEngine.js:42` `createLimiter(15)`; verified).
- File Map in HANDOFF (`:90-102`) — all listed `server/...` files exist (verified via Glob).
- The 5 proprietary-framework wiring DONE items (`ACTIONS.md:113-115`) reference real files; not re-verified line-by-line (out of this audit's scope) but the named JSON files exist.

---

## Architecture-boundary verification (PASS/FAIL per check)

**Search surface for Nuxt-reachable files:** `pages/`, `components/`, `plugins/`, `store/`, `mixins/`, `server-middleware/`, `layouts/`, plus `utils/` (imported by components).

| Check | Result | Evidence |
|---|---|---|
| `require('openai')` / `import ... openai` / `new OpenAI` in Nuxt layer | **PASS (none)** | Only hits are `server/utils/openaiClient.js` (backend, a comment showing the swap), `server/routes/firm.js:60-61` (commented-out TODO stub, not live), and `CLAUDE.md`/`ACTIONS.md` (docs). Zero in any Nuxt-reachable file. |
| `OPENAI_API_KEY` read in Nuxt layer | **PASS (none)** | All live reads are backend: `server/advisorEngine.js:198,201,351`, `server/courseEngine.js:37`, `server/utils/openaiClient.js:133`. Others are tests + the commented stub `firm.js:61`. None in `pages/`, `components/`, `plugins/`, `store/`, `mixins/`, `server-middleware/`. |
| Direct `api.openai.com` call in Nuxt layer | **PASS (none)** | Only `server/utils/openaiClient.js:29` (`DEFAULT_HOST`). Backend only. |
| DB client (`mysql2`) / Google / AWS / Xero SDK in Nuxt layer | **PASS (none)** | Grep for `mysql2|googleapis|xero|aws-sdk|@aws-sdk|@google-cloud` across the Nuxt dirs returned **no matches**. `mysql2`/`googleapis` are used only under `server/`. |
| `process.env.*` (non-`API_BASE_URL`) in Nuxt layer | **PARTIAL** | `server-middleware/advisor.js:19` and `course.js:19` read `API_BASE_URL` only (allowed). **`server-middleware/translate.js:68` reads `process.env.MYMEMORY_EMAIL`** — a non-`API_BASE_URL` env var, and the file calls a third-party API directly (see below). No secret, but a boundary deviation. |
| `server-middleware/advisor.js` is a thin proxy | **PASS** | 56 lines; forwards POST `/query` to `http://localhost:4000/api/advisor/query` and pipes the SSE response back (`advisor.js:21-66`). No engine logic, no SDK, no key. |
| `server-middleware/course.js` is a thin proxy | **PASS** | 51 lines; forwards POST to `/api/course` and pipes back (`course.js:21-60`). No engine logic, no SDK, no key. |
| Engines live on Restify backend | **PASS** | `server/advisorEngine.js` (2086 lines) + `server/courseEngine.js` (442 lines), both mounted in `server/restify-server.js:121-122`. |
| OpenAI REST client exists backend-side | **PASS** | `server/utils/openaiClient.js` — "Minimal Node-14-compatible OpenAI REST client — NO SDK" (`:4`), uses built-in `https` (`:27`), no global `fetch`. Throws if `OPENAI_API_KEY` unset (`:133`). |
| `OPENAI_API_KEY` read only backend-side | **PASS** | See key-read check above — all live reads under `server/`. |
| Frontend (`VirtualAdvisor.vue`) makes no direct OpenAI/secret call | **PASS** | Only `fetch('/api/advisor/query', ...)` to its own backend proxy (`components/VirtualAdvisor.vue:1127,1398`). No OpenAI host, no key, no `process.env`. |

**Overall architecture-boundary verdict: PASS** — with one logged deviation (`translate.js`, below) that does not involve OpenAI, a secret, or DB access.

### Logged deviation — `server-middleware/translate.js`
- **What:** The translate middleware calls a third-party HTTP API directly from the Nuxt server-middleware layer: `fetch(\`https://api.mymemory.translated.net/get?...\`)` (`translate.js:98`) and reads `process.env.MYMEMORY_EMAIL` (`translate.js:68`).
- **Why it's a deviation:** The spec says third-party APIs are BACKEND-ONLY and `server-middleware/` must be a thin proxy; this file contains real logic (chunking, batching, fallback) and an outbound third-party call. The spec also says the frontend's only legitimate env var is `API_BASE_URL`.
- **Severity:** Low. No secret is exposed (`MYMEMORY_EMAIL` is a rate-limit identifier, not a credential), no DB, no LLM. But for a clean boundary it should be a Restify route, mirroring the advisor/course migration.
- **Node 14.15 note:** `translate.js:98` uses **global `fetch`**, which is Node 18+. On the locked Node 14.15 runtime this would throw `fetch is not defined`. The advisor/course proxies correctly avoid this (they use the `http`/`https` modules). This is a latent Node-14 incompatibility worth flagging. **UNVERIFIED whether this path is exercised on the backend Node-14 process or only on the dev Node-20 process** — translate runs inside the Nuxt server, which the docs say is currently run on Node 20 for dev.

---

## Nuxt env-block secret check

**PASS.** `nuxt.config.js:75-77`:
```js
env: {
  apiBaseUrl: process.env.API_BASE_URL || ''
}
```
Only `apiBaseUrl` is exposed. No `OPENAI_API_KEY`, `JWT_SECRET`, `MYSQL_*`, Drive credentials, or any other secret appears in the `env:` block. Secrets that the client bundle would otherwise inline are absent. This satisfies CLAUDE.md "Secrets never go in the Nuxt `env:` block."

(Note: `MYMEMORY_EMAIL` at `translate.js:68` is read at *server-middleware runtime*, not in the `env:` block, so it does not compile into the client bundle — it is a boundary-tidiness issue, not a bundle-leak issue.)

---

## Org CA Capacity Planner — mislabelled PDF resolution

**The open flag:** `design/ACTIONS.md:173` — "resolve the Org CA Capacity Planner mislabelled-PDF flag (Part 2A)". Cross-ref `design/virt-advisor-registry.md:296` and `:332`.

**What the mislabel actually is (evidence):**
- Registry `:296`: `| Org — CA Capacity Planner | Org. CA Capacity Planner Support.pdf ⚠ (mislabelled "Support" in Logic folder) | Org. CA Capacity Planner Support.pdf |` — i.e. in the source **Logic** folder, the file that should be the *Logic* PDF is named `...Support.pdf`. Both the Logic-column and Support-column cells point to the same `...Support.pdf` filename.
- Registry `:332`: "no tree — logic PDF mislabelled 'Support' in the Logic folder (may be a phantom)".
- Confirmed downstream: there is **no `logic_trees.json` tree** for capacity planner (Grep for the topic in `data/logic_trees.json` finds only `Org CA Firm Strategy Support.pdf` provenance at `:6043`, not capacity planner). The domain-support side is intact: `data/org-capacity-planner-domain-support.json` exists, `data/domains.json:264` registers the `org-capacity-planner` domain, and `data/templates.json:7997` carries the "CA Capacity Planner" template.

**Diagnosis:** This is a **source-asset naming defect, not a code or JSON defect.** The advisory data the engine reads is complete (domain + support JSON + template all present). The only thing "missing" is a *logic tree*, and the registry's own note explains why: the source Logic folder contains a file mislabelled `...Support.pdf` where a Logic PDF belongs — so either (a) the Logic PDF was accidentally named "Support", or (b) there genuinely is no separate Logic table for this method and the entry is a "phantom" (registry's word).

**Recommended correction (describe only — do NOT apply):**
1. Have the content owner inspect the actual file in the source **Logic** folder named `Org. CA Capacity Planner Support.pdf`. Determine whether its *content* is a logic table (decision tree) or duplicate support material.
2. If it is a logic table → rename the source file to `Org. CA Capacity Planner Logic.pdf` and extract it into `data/logic_trees.json` as `org_capacity_planner` (following the same pattern as the other Org trees), then update registry `:296`/`:332` to drop the ⚠.
3. If it is duplicate support material (the "phantom" case) → confirm capacity planner is intentionally tree-less (it is handled as a domain + template only, which is already wired and working), and update the registry to state "no logic tree by design — domain-only method" and remove the ⚠ and the "(may be a phantom)" hedge.
4. Either way this closes `ACTIONS.md:173` with a documentation edit; **no engine/JSON change is required** because the live data is already complete.

**Severity:** Low / DOC-only. No runtime impact — the capacity planner domain is registered and recommendable today.

---

## Onboarding gaps for a new developer

The setup gotchas are **mostly captured but scattered**, and one piece of HANDOFF guidance is now wrong. A new senior dev would hit friction on:

| Gotcha | Captured? | Where / Gap |
|---|---|---|
| Node 14.15 via **exact path** (nvm install fails; Node 20 + Program Files shadows nvm) | **Partially.** The *requirement* for 14.15 is everywhere (`CLAUDE.md` Req 9, `package.json:5`, guards). The *exact-path invocation* trick is in session notes / memory, **not in HANDOFF.md**. | **GAP** — HANDOFF should state the exact-path node invocation for the backend, since `nvm use` alone won't pick it up on this machine. |
| `NODE_EXTRA_CA_CERTS` / Avast (or DigiCert) cert for `npm install` and the OpenAI TLS call | **Partially.** `package.json:9,12` bake `NODE_EXTRA_CA_CERTS=./certs/digicert-bundle.pem` into `dev`/`start`. The Avast-root-CA install-time variant is in `ACTIONS.md:31,38`. | **Minor GAP** — HANDOFF.md does not mention the cert requirement at all; a new dev on a clean machine without the cert will get `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on install and TLS failures on OpenAI calls. |
| **npm 8** required for `overrides` (bundled npm 6 ignores them) | **Yes**, but only in `ACTIONS.md:33,38`. | **GAP in HANDOFF** — the integration team reading HANDOFF.md alone won't know installs must use a local npm 8. |
| `nuxt start -H 0.0.0.0` (IPv6-only default breaks incognito) | **Not in HANDOFF.** In memory/session notes only (`session_2026_06_18`). `nuxt.config.js:32-33` binds `host: 'localhost'`. | **GAP** — worth a one-liner in HANDOFF's run instructions. |
| Backend does **not** auto-load `.env` (`npm run backend` needs vars exported) | **Yes**, in `design/SESSION-2026-06-17-NOTES.md:94` and `ACTIONS.md:72`. Not in HANDOFF.md. | **GAP in HANDOFF** — HANDOFF Step 1 says "set these as environment variables" but doesn't warn that the standalone Restify process won't read `.env` the way Nuxt does. A new dev will set `.env`, run `npm run backend`, and get the `OPENAI_API_KEY` FATAL. |
| Node version guidance | **CONFLICTING.** HANDOFF `:276-280` says "use Node 18 LTS or 20 LTS for the backend"; the Constitution + guards say 14.15. | **GAP/CONFLICT** (drift #7) — HANDOFF must be reconciled to 14.15 or it will actively mislead. |

**Net onboarding assessment:** The authoritative facts exist, but they are split across `CLAUDE.md`, `ACTIONS.md`, and dated `SESSION-*.md`/memory files. `HANDOFF.md` — the document explicitly written "for the senior Advisor-e development team" — is missing the runtime setup gotchas (exact-path Node, cert, npm 8, `.env` non-loading, host flag) and still carries the superseded "Node 18/20" guidance. A short "Local Setup / Run" section in HANDOFF.md consolidating these five items would close the gap. (This is a recommendation; no edit made.)

---

## Open questions / could-not-verify

1. **Test count.** `ACTIONS.md:22` claims "421/421 tests pass"; earlier lines cite 375/392/319/314/307/302/272 at various dates. I could **not** verify any count — running `jest` is out of scope (state-changing). There are 26 test files under `tests/unit/` (Glob), consistent with a large suite, but the exact pass count is **UNVERIFIED**.
2. **`translate.js` on Node 14.** Whether the global-`fetch` call (`translate.js:98`) actually runs on a Node-14 process, or only ever on the Node-20 dev process, is **UNVERIFIED**. If the locale-translation feature is exercised against a true Node 14.15 runtime, it will throw `fetch is not defined`. Recommend confirming with the team.
3. **`courseEngine` `?.` usage** (`courseEngine.js:30`) — fine on Node 14.15 (optional chaining is supported in Node 14), and this is a backend file, so it is *not* a violation of the "no `?.` in server-middleware loader" constraint (that constraint applies to the Nuxt esm loader, `advisor.js:11`/`course.js:11`). Noted only to pre-empt a false-positive during the team's own review.
4. **Whether `ACTIONS.md:130` and `:198` should be reconciled now.** They describe the pre-migration monolith as current/open. Recommend the team strike `:130` through (the work is done per `:72`) so the backlog reflects reality. (Recommendation only — no edit made.)

---

*End of audit. No files were modified. The only file created is this report.*
