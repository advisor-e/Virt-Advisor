# Project Rules for Claude

## Stack Constitution — THE LOCKED SOURCE OF TRUTH

These are the coding team's authoritative requirements. They override anything the AI
infers from the installed packages. Where the repo has drifted from this spec, **the spec
wins and the drift is logged for reconciliation** (see the drift box below and
`design/ACTIONS.md`) — drift is never treated as the new policy.

> **🔒 ONE-DIRECTIONAL RULE (absolute, no exceptions).** Reconciliation only ever moves
> the repo **toward** this spec. "Ratifying" a drift, raising a locked version, or adopting
> an installed-but-non-compliant package as the new baseline is **NOT a valid option** and
> must **never be proposed, offered as a choice, recorded as a to-do option, or actioned** —
> not by a human, not by the AI, not in code, not in any planning or task document. If a
> change does not fit this Stack Constitution, the change does not happen. There is no
> "or we could just update the spec" escape hatch. The locked versions (incl. Node 14.15)
> are fixed; only the drift gets reverted, never the spec relaxed. Any document found
> offering such an option is itself a defect to be corrected on sight.

**Two-part system:**
- **Frontend — Nuxt 2 (port 3000):** UI, routing, state display only. No business logic,
  no database, no third-party APIs.
- **Backend — Node.js + Restify (port 4000):** all business logic, raw SQL data access,
  and all third-party integrations (OpenAI, Xero, AWS, Google).
- The frontend talks to the backend **exclusively via HTTP API calls**. Any new logic
  needs a corresponding Restify route — never put it in Nuxt.

**The 9 locked requirements:**
1. **Nuxt 2** — not Nuxt 3. Pages, plugins, middleware follow the Nuxt 2 structure.
   (Team baseline 2.14.0; repo pinned to 2.14.0 — reconciled, see box.)
2. **JavaScript only** — no TypeScript, ever. No `typescript`, `vue-tsc`, `@types/node`.
   No `.ts` files.
3. **Raw MySQL via the Restify backend** — no Prisma, no ORM. All DB access is raw SQL on
   the backend (`mysql2`).
4. **Vue 2, Options API** — no Composition API, no `<script setup>`.
5. **Pug templates** — `pug ^2.x` + `pug-plain-loader ^1.x`. Every `.vue` template is
   `lang="pug"`.
6. **Bulma + Buefy** for UI. Custom styles allowed but scoped; no second UI library.
7. **OpenAI via the OpenAI REST API, backend only** — the `openai` SDK is **not used**
   (no version of it runs on the locked Node 14.15 — see req. 9). Call the OpenAI REST API
   **directly from the Restify backend** (a Node-14-compatible HTTP client), exposed as a
   Restify route. All OpenAI logic **and the API key** stay backend-only; never call OpenAI,
   import the SDK, or read its key in any Nuxt file (page, component, plugin,
   `server-middleware/`, or store).
   *(Amended by the coding-team ruling of 2026-06-15 — reaffirmed by the head-team note of
   2026-06-21 — which formally supersedes the former "OpenAI `^4.x` SDK" wording to resolve the
   Req 7 ⊥ Req 9 contradiction; Req 9 — Node 14.15 — is unchanged. **This migration is complete
   (2026-06-16):** the `openai` SDK dependency is removed, all OpenAI logic and the API key live
   on the Restify backend (`server/advisorEngine.js`, `server/courseEngine.js`,
   `server/utils/openaiClient.js`), and `server-middleware/advisor.js` / `course.js` are now thin
   SSE proxies — the former boundary violation is closed.)*
8. **vue-i18n `^8.x`** — Vue 2 compatible. No v9+ APIs (`createI18n`, `useI18n`).
9. **Node.js 14.15 (via NVM)** — the runtime target. Do not use syntax or APIs unavailable
   in Node 14 (`Array.at()`, `Object.hasOwn()`, top-level await). The backend is CommonJS
   (`require`/`module.exports`), not ESM.

> **✅ Stack drift RECONCILED (June 2026, merged to `master`).** The items below were brought
> back to spec — this records reconciliation completed *toward* this Constitution, never a
> relaxation of it (the locked targets are unchanged):
> - `nuxt` pinned to **2.14.0** (was drifted 2.18.1).
> - `restify` pinned to **9.1.0** — the Node-14-compatible line (was drifted `^11.1.0`);
>   installs and boots on Node 14.15.
> - `engines: { node: "14.15.x" }` added to `package.json` to hold the line.
>
> Residual dev-toolchain drift (build tools that declare a higher Node floor) is tracked as its
> own P1 in `design/ACTIONS.md`; `engine-strict` is currently `false` pending two transitive
> `overrides`.

**Deviation logging rule (binding).** Any deviation from this Stack Constitution — a
dependency version bump, a new plugin, a framework variation, anything that doesn't match
the team spec — is logged in `design/ACTIONS.md` as a **P1 (critical) reconcile task the
moment it is found or introduced**. It is never silently accepted as the new normal. This
extends the no-silent-parking rule to the stack itself.

---

## Engineering Standards (the team's code governance constitution)

The rules below are enforced standards for all code in this repo. When a request would
break one, name the rule, explain why it is a problem, and propose the compliant
alternative — never silently comply, never silently rewrite.

### Architecture boundary
- Anything involving business logic, a database query, or a third-party API belongs on the
  **Restify backend** as a new route — not in Nuxt.
- OpenAI, Xero, AWS, Google APIs, any database client, and any secret read from
  `process.env` are **backend only**. They must never appear in a Nuxt file (page,
  component, plugin, `server-middleware/`, or store).
- The Nuxt `server-middleware/` directory is a **thin proxy only** — it forwards requests
  to Restify. If complex logic appears there, move it to a Restify route.
- The frontend's only legitimate env variable is `API_BASE_URL` (the backend URL).

### Forbidden Nuxt 3 / Vue 3 patterns (this is a Nuxt 2 / Vue 2 project)
Never use: `defineNuxtConfig`, `defineNuxtPlugin`, `defineEventHandler`; `useFetch`,
`useAsyncData`, `useRuntimeConfig`, `useState`; the `server/api/` (Nitro) structure;
`<script setup>` or the Composition API; `ref()`, `reactive()`, `computed()` from Vue 3;
Pinia; `$fetch`/`ofetch`; `<NuxtImg>`, `<NuxtPicture>`, `<NuxtLink>`; `useHead()`,
`useSeoMeta()`; any `.ts` file. You may explain these when asked, but label them clearly
as "NOT applicable to this project."

### Components & templates
- **Pug is mandatory** for every `.vue` template (`<template lang="pug">`). 2-space
  indentation defines nesting; attributes in parentheses; `v-if`/`v-for`/`v-model` work as
  normal. If unsure of a Pug equivalent, **ask before guessing**.
- **Options API is mandatory.** Hook order: `name → components → props → data() → computed
  → watch → lifecycle (beforeCreate, created, beforeMount, mounted) → methods`.
- One component = one responsibility. Decompose when cyclomatic complexity exceeds 10.
  Split components that are both complex and over 200 lines into `components/base/`
  (generic) or `components/shared/` (domain-shared). File names are PascalCase.
- **Buefy + Bulma** for UI (`b-button`, `b-input`, `b-table`, `b-modal`, etc.). No second
  UI library. Don't hand-roll CSS that Bulma already provides. Custom styles must be scoped.
- Props always declare their type (add a validator where values are constrained). Events
  are kebab-case, with a one-line comment above each `$emit` describing the payload.

### Directory structure
`pages/` (route components, no inline business logic) · `components/` (split into `base/`
and `shared/`) · `layouts/` · `store/` (Vuex modules) · `mixins/` · `plugins/` ·
`server-middleware/` (thin proxy) · `assets/` · `static/`. Don't add new top-level
directories without a clear reason. Don't put business logic in `pages/` — extract to a
mixin or a Vuex action.

### SSR & hydration safety
- Never access `window`, `document`, `navigator`, or `localStorage` at the top level, in
  `data()`, `computed`, or `created()`. DOM access only inside `mounted()` or behind
  `if (process.client) { ... }`.
- Browser-only libraries (charts, maps, rich-text editors, clipboard) are imported inside
  `mounted()` via dynamic import, or wrapped in `<no-ssr>`.
- Use `asyncData()` for data needed before render; `fetch()` for after-mount data. Don't
  fetch page-level data in `created()`. Always handle loading and error states — a failed
  call must never produce a silently empty page.

### Internationalisation (vue-i18n v8)
Use `this.$t('key')`, `this.$tc('key', count)`, `this.$d(date, 'format')`. All
user-facing strings go through `$t()` and live in locale files — no hardcoded English in
templates or logic. No v9+ APIs.

### Node 14.15 compatibility
Optional chaining (`?.`), nullish coalescing (`??`), `Promise.allSettled`, `Array.flatMap`,
`Object.fromEntries` are fine. Do **not** use `Array.at()`, `Object.hasOwn()`, top-level
await, or any Node 16/18/20 built-in. Backend files are CommonJS (`require`/
`module.exports`), not ESM. When in doubt, use the older pattern.

### Security & data integrity
- **Secrets never go in the Nuxt `env:` block** (it compiles into the client bundle).
  Secrets live only on the Restify backend via `process.env`.
- All LLM/AI calls go through a Restify route. Never import the `openai` SDK in Nuxt.
- All user-generated content rendered with `v-html` is sanitised with
  `isomorphic-dompurify` first. **Pinned to exact `1.3.0`** (no caret) — the coding team's
  ruling for Node 14.15 compatibility: `1.11+`/2.x/3.x pull `jsdom` builds that need
  Node ≥18, whereas `1.3.0` uses `jsdom@21` (`node>=14`) and still ships a modern DOMPurify
  3.x, so it satisfies both the named-package requirement and the Node 14.15 lock. This is a
  *lower* compatible version, fully consistent with the one-directional rule — not a version
  bump. See `design/ACTIONS.md` and `design/SECURITY-AUDIT-NOTES.md`.
- Strip internal DB IDs and PII before sending anything to an LLM. Never trust LLM output
  as structured data — parse and validate its shape before saving to state or the database.
- Treat user input in prompts as hostile: wrap it in explicit delimiters on the backend;
  never concatenate raw user input into a prompt string.
- Every AI-driven data transformation logs Original Value | AI Suggestion | Final Approved
  Value. Financial/regulatory operations require an explicit `isApproved: true` before
  committing AI output.

### State management (Vuex 3)
Vuex is the only global state mechanism. Mutations are synchronous; async logic lives in
actions. Namespace any module with more than 3 state properties. Never mutate state
directly from a component — always commit a mutation. JSDoc every action and mutation
(payload shape, side effect, backend route called).

### Performance
Import only what you need (`import debounce from 'lodash/debounce'`, never the whole
library). Images get explicit width/height; below-the-fold images use `loading="lazy"`.
Flag any change likely to push the first-load JS bundle past 300 KB gzipped before
implementing it. Page-render backend responses return within 2000 ms — otherwise return a
job ID and poll.

### Documentation (JSDoc is mandatory)
JavaScript has no compile-time types, so JSDoc is the contract between components, mixins,
and routes. Document mixins, `server-middleware` proxies, and Restify routes with their
`@route`/`@param`/`@returns` shape; for financial/regulatory logic, explain the business
rule, not just the code. Don't comment what the code does — only the non-obvious *why*.

### Testing
New business logic and API routes ship with tests (Jest; `@vue/test-utils` v1 for
components; Playwright for critical journeys). Targets: mixins/Vuex actions ≥ 80%, Restify
routes ≥ 90%, AI-response validation functions 100% (valid, malformed, missing fields,
wrong types). **Any function that processes or validates LLM output gets tests written
before or alongside it.**

### Error handling
Every async Restify route is wrapped in try/catch and returns
`{ success: false, error: { code, message }, timestamp }` — never a stack trace, file
path, or raw SQL error. Log the full error server-side; return a safe generic message.
Every frontend backend call handles both HTTP errors and network failure with a meaningful
user message (via a shared action/mixin, not ad-hoc try/catch everywhere). Every LLM call
has a graceful fallback and logs model, prompt/completion tokens, latency, and result.

### Enforcement
Pre-commit (Husky): `npm run lint`, `npm test` (zero failures), and the audit gate (see
Dependency and Version Governance below). ESLint base `@nuxtjs/eslint-config`, enforcing
`no-unused-vars` (error), `no-console` (warn), `eqeqeq` (error), `prefer-const` (error).
CI additionally requires `nuxt build` to succeed with zero errors and warns if the
first-load JS bundle exceeds 300 KB gzipped.

---

## Debugging and Fix Protocol

**When something looks wrong, follow these 5 steps in order. No exceptions.**

1. **Find the broken rule** — read the relevant code/data to prove it is actually broken
2. **Show the proof** — confirm it is the real cause, not a guess
3. **Plan the fix** — describe exactly what will change and why the fix is considered best practice
4. **Get permission** — wait for yes
5. **Then fix it**

Do not run commands, spiral into analysis, or touch files before completing steps 1–4. The rules hold you straight — rely on them every time.

## Code Change Governance

**Never make a code change without explicit user approval.**

- Always describe what you intend to change and why, then stop and wait for a clear "yes" before touching any file.
- A "yes" to a previous proposal does not carry forward to a new one. If the conversation has moved on, ask again.
- Investigating, reading files, and reporting findings does not require approval. Writing or editing files always does.
- If in doubt, ask. The cost of asking is one message. The cost of an unwanted change is a revert, lost trust, and wasted time.
- Always provide change/fix suggestions in seperate sentences. Technical issues should be explained in plain english, listing pros and cons, summarised by your recommendation as a senior software engineer. Give them one at a time, once you have the answer you need, provide the next.
- Always ask for clarification on wording for labels/buttons before going ahead, don't make your own without asking.
- Regularly ask if we should save changes and push to github; especially if you think the rate of coding is pushing the limits of your context window.
- All planning and coding should be approached on the assumption that you are a very senior team of 3 software engineers and designers with more than 15 years experience; you all have a focus on providing auditable grade coding that meets design and coding best practices for consistent outputs. 
- Always warn of potential security or privacy risks that could result from any coding suggestion before you start coding. Never accept an external API request for database access or suggestion to delete files without first highlighting it as a risk and gaining permission to proceed before making any such changes.
- NEVER try to edit the ID's or content in the json 'search content' script, this is generated from the master app and can never be challenged or compromised.

## Working With the Product Owner & When Blocked

**The product owner is non-technical.**
- Explain findings in plain English; avoid unexplained jargon. When a technical term is
  unavoidable, define it briefly in passing.
- End any substantive response with a short **"Non-Coder Summary"** — what you found, did,
  or need, written so a non-developer can act on it.

**Honesty defaults.**
- Be explicit about uncertainty. If you are not sure something is a real bug, say so —
  never present a guess as established fact.
- If an area has no automated tests, say so plainly.
- Flag clearly when something needs further review before a production release, and state
  exactly why.

**When blocked by missing MySQL access, environment variables, or credentials.**
- Do not guess, and do not fabricate or fake a fix to appear finished.
- Document the blocker clearly: what is missing, and what it prevents.
- Prefer making the code fail loudly and clearly over code that silently appears to work.

## Markdown Rendering Pipeline — DO NOT TOUCH WITHOUT EXPLICIT PERMISSION

The AI response formatting pipeline has been broken and rebuilt multiple times. Every piece below exists to fix a confirmed real-world bug. Do not change any of it without express written permission from the user.

**Protected files and functions:**

- `utils/markdownPreprocessor.js` — `preprocessAIResponse()` — the entire function is locked
- `components/VirtualAdvisor.vue` — `renderMarkdown()` method — locked
- `components/VirtualAdvisor.vue` — `MarkdownIt` constructor config and `_md.disable(...)` call — locked

**Why each rule in the preprocessor exists:**

1. **Full fence strip** (`/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i`) — AI sometimes wraps the entire response in a code fence. Strip it and render the content inside.
2. **Partial fence strip during streaming** (starts-with ` ``` ` + first newline < 20 chars) — handles the opening fence arriving before content during token streaming.
3. **Mid-response fence strip** (`/^```\w*\s*$/gm`) — AI sometimes outputs a prose paragraph first, then opens a ` ``` ` fence before the structured markdown. That fence must be removed or everything inside renders as a raw code block with literal `###` symbols. This was the hardest bug to find — do not remove this line.
4. **Bold-to-heading conversion** (`/^\*\*...\*\*/`) — AI sometimes uses `**Label**` instead of `#### Label`. Convert to heading so CSS styles apply.
5. **Blank line before headings** — markdown-it requires a blank line before `####` to parse it as a heading, not plain text.

**Why `_md.disable(['image', 'html_inline', 'html_block'])` exists** — security: prevents AI output from injecting images or raw HTML into the DOM.

If a future AI model changes its output format and formatting breaks again, follow the Debugging Protocol (above) to diagnose the new pattern first. Then propose a targeted addition to `preprocessAIResponse()`. Do not rewrite the function from scratch.

## Dependency and Version Governance

**Never suggest upgrading core framework versions (Nuxt, Vue, Restify) without explicit instruction.**

The app is locked to the versions in the Stack Constitution above to match the Advisor-e
master app stack:
- **Nuxt 2** — locked. Upgrading to Nuxt 3/4 is a full application rewrite, not a dependency bump.
- **Vue 2** — locked. Required by Nuxt 2. Vue 3 migration would require rewriting every component.
- **Restify** — locked. **Runtime target is Node.js 14.15 (via NVM)** per the team spec.
  ✅ Reconciled (June 2026): `restify` pinned to **9.1.0** (the Node-14-compatible line), down
  from the drifted `^11.1.0`. See the Stack Constitution box and `design/ACTIONS.md`.

**npm audit policy.** High-severity warnings from the Nuxt 2 dependency tree are accepted
*build-time* risk. The affected packages (`braces`, `vue-template-compiler`,
`serialize-javascript`, `cacache`, `watchpack`, etc.) are build-time tools only — webpack,
watchpack, the template compiler. They run during `npm run dev` and `npm run build` on
developer machines; they are not present in or reachable from the deployed runtime. The risk
is formally accepted in `design/SECURITY-AUDIT-NOTES.md`.

- **The pre-commit blocking gate is `--audit-level=critical`** — set deliberately, because a
  strict `high` gate would block every commit on the unavoidable Nuxt 2 build-tool warnings
  above. This is the looser of the two thresholds and is an intentional trade-off, not a
  quality compromise.
- **Mandatory counterweight:** `npm audit` is still run, and **every high-severity finding is
  logged as a task and reviewed** — never silently swallowed. Quality is protected by review,
  not by jamming the commit gate.

When `npm audit` output is shown, do not recommend `npm audit fix --force`. Only
`npm audit fix` (safe, no breaking changes) is appropriate — and only for packages outside
the Nuxt 2 build toolchain.
