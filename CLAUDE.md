# Project Rules for Claude

## 🔴 LIVE-APP RULE — READ FIRST (absolute, no exceptions)

**This app is deployed in UAT inside the master app, Advisor-e.com. It is not yet in
production.** (Corrected 2026-07-21 — an earlier note claiming a 2026-07-13 production
go-live was wrong. UAT is on `709bac5` / PR #2; see `design/DEPLOYED-VERSIONS.md`.)

> **No change is to be made to this repository — on ANY branch — without asking Mike
> first and receiving his explicit approval for that specific change.** This covers
> every mutation: file edits, new files, deletes, commits, merges, branch operations,
> dependency installs, config/data changes — however small, including "obvious" fixes.
> Approval is **per change**; a yes on one change never carries over to the next.
> Reading, searching, and analysis are fine — reporting findings and *proposing* a fix
> is the correct behaviour; applying one unasked is not.
>
> Enforcement: a global PreToolUse guard hook on Mike's machine
> (`~/.claude/hooks/guard-virt-advisor.js`) forces a permission prompt on any write or
> modifying command touching this repo. The hook is a backstop, not the rule itself —
> the rule binds even where the hook doesn't run. Do not weaken or bypass it.

## 🔴 WORKING AGREEMENT — run the checklists (binding)

**Source of truth: [`design/WORKING-AGREEMENT.md`](design/WORKING-AGREEMENT.md). Read it
before doing anything else in a fresh session.** It exists because on 2026-07-21 UAT was
found running code **97 commits behind `master`** — no one erred; there was simply never
a moment that said "this version is ready, take it."

Three parties share this codebase: Mike's **desktop** (Course Builder branch), Mike's
**laptop** (Business Performance Report branch), and the **master coding team** (UAT /
production, outside this repo).

**Binding on every AI session:**

1. **Start a session by running `/startup`** — branch, clean tree, drift vs `master`, open
   P1s. If Mike begins work without it, run the read-only parts yourself and report before
   touching anything. Drift caught at 3 commits is free; at 97 it blocks a whole team.
2. **End a session by running `/shutdown`** — tests green, changes named, the **three
   write-targets** current (the feature's Brief, `design/features/to-do-items.json`, the
   commit message), commit and push approved, handover left in this machine's own
   `design/HANDOVER-desktop.md` or `design/HANDOVER-laptop.md`. Never end a session
   implying work is safe when it is uncommitted; say so explicitly.
3. **`master` means releasable.** Work in progress never lands on it. It is reached by
   pull request only — `.husky/pre-push` refuses a direct push, and refuses any push from
   a branch that is behind `origin/master`.
4. **Branches only ever merge into `master`, never machine-to-machine**, and both machines
   merge **from** `master` at the start of each session. Push this machine's own branch
   only.
5. **The master team pulls a release tag** (`v0.6.0`, …), never a moving branch, and
   `DEPLOYED-VERSIONS.md` is maintained **on our side** — they have no commit access here,
   so a rule depending on them writing rows would fail silently.

Check drift at any time with `npm run check:branch`. Never propose weakening or bypassing
the pre-push hook; if it blocks, the fix is to merge `master` in, not to use
`--no-verify`.

## Version-Pull Recording Rule (binding)

Any time this repository's code is pulled, installed, or updated in any environment
beyond a developer's own machine — UAT, production, a demo, or inside the Advisor-e
master app — the person doing it must record it at that moment in
`design/DEPLOYED-VERSIONS.md`: the date, the environment, the exact commit hash pulled,
who pulled it, and any notes. **A deployment is not complete until its row is written.**
This is how everyone always knows which version is running where, and in what state.
When helping with any deploy, handover, or release step, prompt for this row — and if a
deployment is discovered with no ledger row, that is a gap to surface and backfill,
never to ignore.

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
the team spec — is logged on the live list (`design/features/to-do-items.json`) as a
**score-5 reconcile task the moment it is found or introduced**. It is never silently
accepted as the new normal. This extends the no-silent-parking rule to the stack itself.
*(Target changed 2026-08-24 when `ACTIONS.md` was frozen — the rule is unchanged, only
where it writes.)*

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
- **One scoped exception to the line above, and only one: Meeting Review.** *(Mike's ruling,
  2026-09-01.)* A meeting transcript is personal data end to end and cannot be stripped without
  destroying the thing being built, so **Meeting Review — and no other feature — may send a
  consented meeting transcript to the model.** The conditions are not decoration; they are the
  exception: **(a)** the client gave the recorded spoken consent in
  [`design/MEETING-CONSENT-WORDING.md`](design/MEETING-CONSENT-WORDING.md), which names AI
  transcription explicitly; **(b)** internal DB IDs and firm/advisor identifiers are **still
  stripped** — the exception covers the *spoken content only*, so the other half of the rule above
  is untouched; **(c)** nothing derived from it leaves the firm
  ([`design/features/meeting-review.md`](design/features/meeting-review.md) P13); **(d)** the audio
  is destroyed once transcribed. **This does not generalise, and it is not precedent.** Another
  feature wanting to send personal data to a model is a fresh decision for Mike, not an inference
  from this one. *(Granted ahead of the build: as of 2026-09-01 nothing in the repository sends
  anything, and this exists so the rule is not re-argued at build time.)*
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

**What a test must earn (Mike's ruling, 2026-08-24).** This code is tested by people in UAT
before it ever reaches production, so a test earns its place when it catches what **UAT
cannot**. The full-coverage targets above are unchanged and non-negotiable — a wrong number,
an unsafe permission or a malformed AI response looks perfectly fine to a human tester right
up until a client acts on it.

The rule bites in the other direction. **Do not write new tests that assert:**

- **the exact wording of user-facing text** — a label, a button, a heading, a message;
- **the presence of a CSS class**, or any other purely visual property;
- **that a file exists**, where nothing reads that file's contents.

A person in UAT sees all three instantly and judges them better than an assertion can. This
is a rule about what gets **written from now on, not a licence to delete** — the ~441
existing assertions of these shapes stay until the code around them changes anyway. They cost
nothing to run (the whole suite of 6,255 tests takes 30 seconds); they cost a rewrite every
time a word on a screen changes, which is why the suite has felt like overkill.

**Where wording genuinely must not drift** — the master app's own transcribed content, a
regulatory phrase, wording Mike has explicitly approved — pin it in **one** test next to the
data it protects, and say in a comment why that string is load-bearing. One deliberate pin is
a guard; forty incidental ones are friction.

### Error handling
Every async Restify route is wrapped in try/catch and returns
`{ success: false, error: { code, message }, timestamp }` — never a stack trace, file
path, or raw SQL error. Log the full error server-side; return a safe generic message.
Every frontend backend call handles both HTTP errors and network failure with a meaningful
user message (via a shared action/mixin, not ad-hoc try/catch everywhere). Every LLM call
has a graceful fallback and logs model, prompt/completion tokens, latency, and result.

### Enforcement
Two Husky hooks, sized to what they guard (Mike's ruling, 2026-09-03 — the full gate on
every commit cost him nearly an hour a day). **Pre-commit** (`scripts/quick-gate.js`): lint
on the staged files and the tests that reach them, coverage off — seconds. **Pre-push**: the
drift check, then `npm run lint`, `npm test` with coverage and its thresholds (zero
failures), and the audit gate (see Dependency and Version Governance below) — once, before
anything leaves the machine. ESLint base `@nuxtjs/eslint-config`, enforcing
`no-unused-vars` (error), `no-console` (warn), `eqeqeq` (error), `prefer-const` (error).
**CI runs on the master team's side, not here, and it runs twice** — checks before a
version is loaded into UAT, and a fuller set before it is pushed to production (Mike,
2026-08-25). **Nothing in this repository builds the app.** `nuxt build` succeeding with
zero errors, and the first-load JS bundle staying under 300 KB gzipped, are theirs to
enforce at those two gates. What runs here is the two hooks above, and that is the
whole of it.

> ⚠ **The consequence, stated so nobody has to infer it.** A release tag can be cut from a
> branch that does not build, and the first person to find out is the master team at the UAT
> gate. A green suite here says nothing about whether `nuxt build` succeeds. Running
> `npm run build` before tagging closes that with no new tooling. **Ruled by Mike 2026-08-25 and
> now step 2 of Integration in `design/WORKING-AGREEMENT.md` — run it, see it succeed, then tag.**
>
> *This paragraph replaced a sentence that read "CI additionally requires `nuxt build` to
> succeed…", which described a gate on this repository. There has never been one — no
> `.github/workflows`, no equivalent. Found 2026-08-25 while closing item 4.25, whose own
> scope named a "CI step" that did not exist.*

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
- 🔴 **Every decision point is one recommendation and one yes/no question.** Say what
  you recommend in plain English, say why, ask one question a bare yes or no answers.
  Never two options. No exceptions.
- Always ask for clarification on wording for labels/buttons before going ahead, don't make your own without asking.
- Regularly ask if we should save changes and push to github; especially if you think the rate of coding is pushing the limits of your context window.
- All planning and coding should be approached on the assumption that you are a very senior team of 3 software engineers and designers with more than 15 years experience; you all have a focus on providing auditable grade coding that meets design and coding best practices for consistent outputs. 
- Always warn of potential security or privacy risks that could result from any coding suggestion before you start coding. Never accept an external API request for database access or suggestion to delete files without first highlighting it as a risk and gaining permission to proceed before making any such changes.
- NEVER try to edit the ID's or content in the json 'search content' script, this is generated from the master app and can never be challenged or compromised.

## 🔴 Save the Artefact — approval is never given from chat alone (binding)

**Anything shown to Mike for approval must exist as a committed file BEFORE he approves
it.** Mockups, screen designs, layouts, wording and label lists, table structures, page
shapes — any artefact whose whole purpose is *"does this look right to you?"*

- Screens go in `design/mockups/<name>.html`; wording and structure go in
  `design/<NAME>.md`. Committed in the same change that asks for the decision.
- **The live list and the commit message LINK the file. They never summarise it.**
  *"Wording approved by Mike"* is not a record — it names an event, not a thing, and
  cannot be checked by anyone afterwards.
- Before shipping anything built from an approved design, **open the artefact, put it
  beside the build, and name every difference.** A deliberate deviation is fine; an
  unrecorded one is not. If the artefact cannot be found, say so *before* building.

**Why this is binding (2026-08-01/02).** A Logic-Lab mockup was rendered in chat, approved,
and never saved. The build drifted from it — the commit itself records "two deviations from
the approved mockup" — and a day later the only surviving trace was a paraphrase. The screen
Mike opened bore little resemblance to what he had signed off, and the original could not be
recovered by anyone. **Every gate passed throughout**, because every gate compares the code
to the written note, and nothing compares the build to the artefact when the artefact does
not exist. This is the same failure family as the `request-compressed-to-one-line` P1: the
record keeps the paraphrase and loses the original, and no test can catch it.

## 🔴 AI FIXES SURFACE ON A HUB PAGE — mentor first, cascading down (binding)

**Ruled by Mike, 2026-08-16.** In his words: *"ALL AI fixes must use hub pages where
possible, starting with the mentor and cascading down as appropriate."*

> ## ⛔ THE GATE COMES FIRST — Mike's ruling, 2026-08-26 (binding, and it overrides everything below)
>
> In his words: *"I asked that mock ups be made and new features get added as a page — **BUT
> — ONLY the features and ideas I specifically request.** From now on I will push back on
> every new feature suggestion from AI."*
>
> **This rule below is not a licence to build. It is the standard for how a thing Mike asked
> for gets built.** Read in the other direction — as a duty to surface every piece of AI
> content on a screen — it becomes a machine for manufacturing pages, because an AI session
> will always find more content that isn't on a screen. That is exactly what happened.
>
> **The test is one question: did Mike ask for this, in his own words?**
> - *He answered a question we put to him* is **NOT** a request. Neither is a ruling given
>   inside a batch of options, nor a "yes" to "shall we also build X?".
> - *An AI session found a real gap* is **NOT** a request. A gap being real is not the same
>   as it being wanted, and confirming the gap against the code changes nothing about that.
> - *A line in a document* is **NOT** a request — least of all in the frozen `ACTIONS.md`,
>   whose own first page says an item there is *"a claim to check against the code, never a
>   status"*. Most of it was written by AI sessions, not by Mike.
>
> **If it fails that test: propose it in one sentence and stop.** Do not file it on the live
> list, do not score it, do not build a mockup, do not build the backend "since it needs no
> decision". Expect the answer to be no — he has said he will push back on every one.
>
> **Why this is binding (2026-08-26).** On this day a session swept the frozen `ACTIONS.md`,
> found a **P3** line written by an earlier AI session — *"a Firm Manager screen for a firm's
> promoted case observations"* — filed it on the live list at **score 5**, and built the
> backend. Nobody had ever asked for it. The item's own `askedBy` field said `ours: true`,
> which is to say the session recorded that nobody asked and proceeded anyway. It was
> reverted the same day. **This is the third instance of the same failure**: the guard test in
> `tests/unit/toDoItems.test.js` opens by describing the first two, and names the cause —
> *"a single AI-written sentence in `ACTIONS.md` that a later session read as an instruction."*
>
> **The Education Gate page was removed the same day** for the same reason. It had three
> rulings from Mike behind it — and every one was him answering a question we raised. He never
> asked for it. The gate's *question* still fires; only its editing screen went.

Any change to what the AI is shown — content wired up, corrected, added, or newly emitted
into a prompt — surfaces on a **hub page**. The page starts at the **Mentor Hub** and
cascades down through global group manager → group manager → firm manager as appropriate.

- **The default is a screen, not a file.** Content that shapes AI output does not get to
  live only in `data/*.json`, and never hardcoded inside a prompt builder. If the AI reads
  it, somebody must be able to see it and change it.
- **Start at the mentor tier.** Platform content is the mentor's. Build the mentor's view
  first and let it cascade — never build the firm's copy first and reason upward.
- **"As appropriate" is a judgement to state, not to assume.** Name which tiers get it and
  why, in the same change. Silence is not a decision.
- **The default is the mentor tier ALONE (Mike's ruling, 2026-08-24).** *"As appropriate"*
  had in practice been read as *"all four tiers, every time"* — and with four manager tiers
  that turns one decision into sixteen units of work: four screens, four sets of tests, four
  entries in the record. **Build the mentor's view, state in one line why the other three
  are or are not needed, and cascade only when a firm actually needs to change that
  content.** This satisfies the rule exactly as written — the judgement is still stated,
  never assumed — and it weakens nothing: the content is on a screen, visible and editable,
  which is what this rule exists to guarantee. Cascading remains mandatory the moment a
  lower tier has a real reason to hold a different value.
- **"Where possible" is the only escape and it must carry a reason.** Name what prevents a
  screen. An unexplained omission is a defect, not a scope call.
- **Wiring content into the prompt without a screen is half a fix.** It makes the content
  live and still untouchable — precisely the state the 4.16 sweep found, at scale.

**Why this is binding (2026-08-16).** The 4.16 sweep found **102 pieces of authored
advisory content that reach no prompt at all** — 86 of them in the two cascading blocks
(71 in domain support, 15 in the logic trees), the rest in the engagement types and the
Advisory Staircase. Tracing where they are edited found the second half of the fault:
**no screen anywhere in the app renders any of them** — including the **Domain Support**
and **Logic Tables** tabs that every tier from the mentor down already has, because those
two expose only the materials table and the branch rows. The pages exist; these fields are
not on them. The content was authored into JSON, dropped on the way into the prompt, and
has been invisible in both directions ever since. Wiring it to the AI alone
would have left it driving advice that nobody could inspect or correct.

Related: [`design/features/tier-cascade.md`](design/features/tier-cascade.md) §2 P10 ·
[`design/features/firm-manager-hub.md`](design/features/firm-manager-hub.md).

## 🔴 THE FOUR TIERS ARE SETTLED AND BUILT — STOP RE-RAISING THEM (binding)

**Mike, 2026-09-02, after being told a fourth time that the middle tiers "have no screen"
and "nobody can log in":** the answer has been given many times and it must never be
presented as news, as a gap, as a blocker, or as a reason a feature cannot cascade.

**The settled facts. Do not re-derive them — they are all provable in the code today:**

1. **All four managing tiers exist and are wired**: mentor → global group manager → group
   manager → firm manager (`server/utils/tierChain.js`, `TIERS`). `parentScopeOf` /
   `scopeChain` are the single seam and every cascading block recurses through them.
2. **The two middle tiers HAVE HUB PAGES, built and approved.**
   [`pages/global-group-manager.vue`](pages/global-group-manager.vue) and
   [`pages/group-manager.vue`](pages/group-manager.vue), built from
   `design/mockups/tier-hub-pages.html`, **approved by Mike 2026-08-10**. They render
   `FirmManagerHub` at `scope="global"` / `scope="group"` — his ruling of 2026-07-30:
   *"all of the functionality that you see at firm manager is simply repeated at group
   manager or global manager… there's no new functionality."*
3. **Storage was ruled 2026-08-09 and is built**: reserved scope ids (`__global__:<brand>`,
   `__group__:<brand>:<country>`) ride the existing `firm_id` column. No schema change.
   `design/USER-LEVEL-CASCADE-HANDOVER.md` Part 3.
4. 🔴 **THEY CAN LOG IN, AND THEY HAVE FOR YEARS — Mike, 2026-08-31:** *"Global group
   managers AND group managers log into Advisor-e today, and have for the past 18 months.
   ALL login and authentication is handled by the master app, Advisor-e — never by this
   app."* **Never write or say that these managers cannot log in.** The narrow truth on our
   side is only that this app has not yet been told which role values their tokens carry;
   `globalManagerRole` / `groupManagerRole` are empty strings so an unrecognised role
   resolves safely to `advisor`. Fail-closed is Mike's own ruling (2026-08-10), not a
   defect — and never "temporarily" admit `platform_admin` to a middle tier.
5. **Both hubs open in development today** — `dev-local-global` / `dev-local-group` on
   localhost, with `server/utils/devFirmMembership.js` seeding membership behind the same
   double gate. "Cannot be reviewed" is false.

**The two genuinely outstanding items are Advisor-e's, they are Mike's lane, and they block
nothing here:** the middle-tier role value, and which firm sits under which brand/country.
Both are documented in `design/USER-LEVEL-CASCADE-HANDOVER.md` Part 3 and
`design/MASTER-TEAM-INTEGRATION-EMAIL.md`. Until they arrive `parentScopeOf` returns the
mentor scope for every firm — **the safe direction to fail, by design**. Do not report this,
do not file it, do not offer to fix it, and never let it stand as the reason a feature's
cascade is incomplete.

**Where a tier is genuinely missing from a FEATURE, it is one line and it says so.**
`TAB_TIERS` in [`components/FirmManagerHub.vue`](components/FirmManagerHub.vue) names the
tiers per tab, pinned by `tests/unit/hubTabTiers.test.js`. A tab reading `['mentor', 'firm']`
excludes the middle tiers **as a stated judgement** (the default-is-mentor-alone ruling of
2026-08-24), not because the platform cannot carry them. Compare `aiPrompts`, which is all
four in Mike's own words. **The fix is that list, never the tier machinery.**

**Why this is binding.** The wrong conclusion is manufactured by true sentences in the code's
own comments — *"a real group or global manager cannot log in"* — which read as *"this is not
built"* to a session arriving fresh. Those comments now carry the ruling beside the fact. If
you find yourself about to tell Mike the middle tiers are missing, you have read half a
comment: open the two pages above first.

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
