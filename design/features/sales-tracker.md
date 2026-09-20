# Sales Tracker — the advisor's own pipeline and referral partners

**History:** [`sales-tracker-history.md`](sales-tracker-history.md)

> **Item 17 on [`to-do-items.json`](to-do-items.json).** Nothing is built yet. §1–6 are the survey
> of an existing app; **§7 onward is the build plan.** Written from the running app, its source and
> its database — never from the repository's own description of itself, which is stale.
>
> 🔴 **MIKE RULED 2026-09-21: HE WANTS ALL OF IT** — all eight screens, not the pipeline-and-COI
> subset §6 recommends. **That decision stands and is not re-argued.** Each stage is priced so the
> choice stays informed.
>
> ⚠ **The measurement is still not named** (§1). It does not block the build Mike has asked for; it
> is what tells us afterwards whether it worked.

---

## 1. The Impact Test

**The rule (`CLAUDE.md`, Mike 2026-09-16): the problem, the measurement and the nearest existing
feature are answered in plain English BEFORE any design.** Two of the three are answered.

**What problem does this solve? ✅ ANSWERED — Mike, 2026-09-21.** It is **a tool for the firm's own
advisors**: an advisor tracks their own sales pipeline and their referral partners inside Virt
Advisor, so their business development sits where their client work already is. **The gain is to the
advisor, not to their client.** This rules out the alternative reading — that these screens become
something an advisor runs *with* a client on the client's own sales — which would be a redesign
rather than a port, because the screens hold the advisor's own deal records.

**How will we know afterwards? ⛔ STILL NOT NAMED.** The honest measure is whether advisors use it
in place of the spreadsheet or second app they use today. **Mike has asked for the build regardless,
and that is his call to make** — but without this, nothing afterwards can say whether it worked. It
is the half of the test that item 7.2 skipped at a cost of two and a half days.

**What already does this job? ✅ Nothing here.** The Model Library is report maths over figures
entered for a client. The Strategy Planner runs a client session. The Adviser Network is the people
layer for collaboration between advisors. **No existing subject covers an advisor's own deal
tracking** — which is why this is parent 17 and not a decimal of an existing area (Mike's call,
2026-09-21; `ITEM-NUMBERING.md` §3, *"a new parent is a real event"*).

---

## 2. Where the code is

| | |
|---|---|
| **Local** | `E:/Visual Code Projects/sales-tracker-nuxt-clean` |
| **Remote** | `advisor-e/sales-tracker-nuxt` (public), branch `main` |
| **In step?** | Yes — 0 ahead, 0 behind as of 2026-09-21; only `.nvmrc` and `.vscode/` uncommitted |
| **Last real commit** | 31 Mar 2026 |
| **Size** | ~9,100 lines live (excluding its own `backups/` directory) |

⚠ **It exists only on `E:`, the drive flagged as a stale backup** ([[env_repo_moved_to_ssd]]). That
rule is about the Virt Advisor working copy, but it means this project's only copy outside GitHub
sits on a drive we do not trust. **Port from it; never work in it.**

⚠ 🔴 **ITS OWN `CLAUDE.md` DESCRIBES AN APP THAT NO LONGER EXISTS.** It says *"built with Nuxt 3,
Prisma and MySQL"*, *"Nitro"*, *"TypeScript types"* — all of which were converted away months ago.
**Nothing written in that repository can be trusted as a description of what is in it.** Everything
in this Brief was read from `package.json` and the source files directly.

**Someone deliberately converted it toward our stack.** Its commit history, newest last:

```
90f0a61  Convert project from TypeScript to plain JavaScript
5e50e68  Downgrade from Nuxt 3 to Nuxt 2 (Vue 2); fix i18n and chart issues
a4ecf8d  Convert all Vue templates to Pug; fix CSRF middleware
81bd6a7  Migrate UI to Bulma CSS and Buefy component library
ff65ba8  Fix post-Buefy layout issues
```

That conversion is what the word *"clean"* in the folder name refers to.

---

## 3. What it does

Eight pages, of which **Pipeline** and **COI** are the reason to look at it at all.

| Screen | Lines | What it is |
|---|---|---|
| `pipeline.vue` | 847 | The advisor's deals — stages, values, close dates |
| `coi.vue` | 428 | Centres of influence: referral partners and what they send |
| `dashboard.vue` | 1,033 | Charts and conversion rates over both |
| `index.vue` | 843 | Entry / landing |
| `lists.vue` | 430 | The dropdown values behind the other screens |
| `team.vue` | 189 | Team roll-up |
| `home.vue`, `login.vue` | 300 | Landing and sign-in |

Behind them: **ten MySQL tables**, **36 API files**, six translated languages, and a
**blog-writing tool** that calls OpenAI.

⚠ **THE BLOG TOOL AND THE LANGUAGE-ADMIN SCREEN ARE A DIFFERENT PRODUCT**, and between them they
are roughly a third of the back end — **5 to 8 of the 12–21 days** (stages 5 and 6 below).
**Mike has ruled they are in scope**; this note stays only so the cost of that third is never
hidden, and so it can still be cut if he changes his mind.

---

## 4. What already fits, and what does not

### ✅ Already on our stack — the genuine head start

Nuxt **2.18**, Vue **2.7**, Buefy, Vuex **3**, vue-i18n **8**, and **all 15 templates are
`lang="pug"`**. The 4,000 lines of screens are broadly portable as they stand.

Two files — `composables/useAuth.js` and `composables/useLists.js` — still use the banned Nuxt 3
APIs (`useState`, `useRequestHeaders`, `import.meta.server`). **They are referenced by nothing.**
Verified 2026-09-21: no page, component, layout, middleware, store or plugin imports either.
**They get deleted, not converted.**

### ⛔ The three blockers — each one a Stack Constitution breach

| # | What | Where | Why it cannot come across |
|---|---|---|---|
| 1 | **Prisma, an ORM** | 33 files; `server/utils/db.js` is a `PrismaClient` | Req 3 — **raw SQL only**, via `mysql2` |
| 2 | **Business logic inside Nuxt** | all 36 files under `server/api/`, run from `serverMiddleware` | Our rules make `server-middleware/` a **thin proxy only**; logic belongs on Restify |
| 3 | **The `openai` SDK** | 5 files; `server/utils/openai.js` does `new OpenAI()` | Req 7 — **no version runs on Node 14.15**; we already migrated to direct REST for exactly this |

**And two more facts that shape the estimate:**

- 🔴 **It has no tests. None.** No `tests/` directory exists. Our bar is **≥90% for Restify routes**
  and **100% for anything validating AI output** — so the blog tool, if ever taken, arrives with the
  strictest requirement in the standards and nothing to build on.
- ⚠ **Its `.nvmrc` says Node 20.** We are locked to **14.15**. Nothing in it has been proven on 14.15,
  and blocker 3 is a direct consequence of that gap.

---

## 5. What a port would actually be

**Not a copy. A rewrite of the back half, keeping the front half.** Roughly 2,200 lines of server
code rebuilt; roughly 4,000 lines of screens largely surviving.

1. **Rebuild the API as Restify routes** — the 36 Nitro-style files become routes under
   `server/routes/`, following the pattern every existing route uses. The mechanical bulk.
2. **Replace Prisma with raw SQL** — the ten-table schema becomes SQL migrations; the 33 Prisma call
   sites become `mysql2` queries against our existing pool in `server/utils/db.js`.
3. **Replace the OpenAI SDK** — only if the blog tool is ever in scope. `server/utils/openaiClient.js`
   already does this correctly, backend-only.
4. **Rewire the screens** — they call our Restify backend via `API_BASE_URL`, nothing else.
5. **Write the tests that do not exist** — to our thresholds, not theirs.
6. **Fold in the six locale files.**

**Estimate: several weeks, not days.** Steps 1 and 2 are most of it. Scoping to Pipeline + COI
removes roughly a third.

---

## 6. The recommendation

**Do not absorb it wholesale.** Scope it to **Pipeline + COI**, and **name the measurement in §1
before any design begins**. The screens are genuinely on our stack and that is real value; the back
end is a rewrite whichever way it is approached, and the parts nobody asked for are the parts that
would make it expensive.

---

---

# The build plan

> 🔴 **Mike ruled 2026-09-21: he wants ALL of it** — all eight screens, not the pipeline-and-COI
> subset §6 above recommends. That decision stands and is not re-argued. Each stage below is
> priced so the choice stays informed.

## 7. What is already true — verified by running it, not by reading it

**The app runs today** on `http://localhost:3100` from
`E:/Visual Code Projects/sales-tracker-nuxt-clean`, against a local MySQL database
`sales_tracker_nuxt` holding real demo data. Signed in as `mike@advisor-e.com`, every screen
opens and shows data: **14 prospects (£46,170 proposed, £33,600 secured), 11 COI rows, 5 team
members.**

**This matters more than any estimate below.** The screens are not a promise — they exist, they
render, and they can be put beside whatever replaces them.

| Already on our stack | Must be rebuilt |
|---|---|
| Nuxt 2.18, Vue 2.7, Vuex 3, vue-i18n 8 | Prisma → raw `mysql2` (33 files) |
| **All 15 templates are `lang="pug"`** | 36 API files → Restify routes |
| Buefy + Bulma | `openai` SDK → our REST client |
| 8 pages, 7 components, 6 locales | **Multi-tenancy — see §1** |

**Two bugs were found by driving it, and both are fixed or recorded:**

1. **`middleware/firm-manager.js` had no `process.server` guard**, so `/team` and `/lists`
   redirected to `/login` on every server-rendered visit. **Fixed 2026-09-21** (one line, with a
   comment). `middleware/auth.js` had the guard; this one did not.
2. 🔴 **The landing page `/` is the Blog, and it requires no login.** A person typing the address
   lands there, is never prompted to sign in, and every tab they click bounces them to `/login`.
   **This is not a bug in the tabs — it is a missing front door.** It cost an hour of this session
   and it must not survive the port. **In Virt Advisor the entry point is an authenticated hub
   page, so this disappears by construction.**

---

## 8. 🔴 THE BLOCKER NOBODY HAS PRICED: this app has no concept of a firm

**Read this before anything else in the plan.**

`server/api/pipeline/index.get.js` line 14 says, in its own comment:

> `// Pipeline is shared across the firm - no userId filter`

`server/api/coi/index.get.js` says the same. **There is no `firm_id` column on any of the ten
tables.** The app assumes **one firm per database** — which is true for a standalone product and
false for ours.

**Virt Advisor is multi-tenant.** Every firm's data shares the same tables and is separated by
`firm_id`, and getting that wrong means **one firm seeing another firm's sales pipeline** — named
prospects, fee values, who is chasing whom. That is a **score-5 privacy fault** by the list's own
scale, not a schema tidy-up.

**Therefore every table gains `firm_id`, every query filters on it, and every route derives it
from the session — never from the request body.** This is not optional and it is not deferrable to
"later hardening". It is the largest single piece of thinking in the port, and it is invisible in
the screens, which is exactly why it gets stated first.

---

## 9. The shape of the port

**Not a copy. The front half survives; the back half is rebuilt.**

```
  THEIR APP                              VIRT ADVISOR
  ─────────                              ────────────
  pages/*.vue        ──── port ─────►    pages/sales/*.vue
  components/*.vue   ──── port ─────►    components/sales/*.vue
  store/*.js         ──── port ─────►    store/sales*.js
  locales/*.json     ──── merge ────►    locales/*.json

  server/api/*.js    ──── REBUILD ──►    server/routes/sales*.js   (Restify, raw SQL)
  prisma/schema      ──── REBUILD ──►    SQL migration, + firm_id
  server/utils/*.js  ──── REPLACE ──►    our db.js, our openaiClient.js
```

**The good news, found by reading a route rather than assuming:** their handlers are
`module.exports = async function(req, res)` — **plain Express**, not Nitro-specific. Restify takes
the same shape. **The rewrite is Prisma → SQL inside each handler, not a restructuring of all 36.**

---

## 10. The stages, in order, with what each buys

**The order is not negotiable: nothing above stage 2 can be trusted until stage 2 is done.**

### Stage 1 — The schema, with `firm_id` · *foundation*
Ten tables as raw SQL migrations, every one carrying `firm_id`. Tables:
`user`, `session`, `pipelineentry`, `coientry`, `appconfig`, `auditlog`, `bloginput`, `blogpost`,
`blogreference`, `customlanguage`.
**Decision needed:** their `user` and `session` tables **duplicate authentication Virt Advisor
already has** — and all login is the master app's, never ours. **Recommendation: drop both. Use
our existing advisor identity and firm scope.** This removes 3 API files and a whole security
surface.

### Stage 2 — Pipeline, end to end · *the proof*
One vertical slice: migration → 4 Restify routes (`GET/POST/PATCH/DELETE`) with raw SQL and
`firm_id` scoping → the page wired to `API_BASE_URL` → tests to our ≥90% route bar.
**Why first:** it proves the pattern. Every later screen is this again with different columns.
**Ship nothing else until this works against a real firm id.**

### Stage 3 — COI + Dashboard · *the rest of the core*
5 COI routes and the metrics route, same pattern. The dashboard is read-only aggregation — it is
the easiest of the three and the most visible.

### Stage 4 — Team + Lists · *firm-manager pages*
`team/summary` and the 2 list routes. **`middleware/firm-manager.js` becomes our own tier check**
(`firm_manager` in our role model), not theirs. Their bug from §0 does not get ported.

### Stage 5 — Blog tool · *the part I advised against, priced honestly*
4 blog routes + 3 reference routes + `server/utils/openai.js` (119 lines) rewritten against
`server/utils/openaiClient.js`.
🔴 **This is the strictest work in the whole plan**: our standards require **100% test coverage on
anything that validates LLM output**, and this app has **no tests at all**. Its OpenAI calls also
have no prompt-injection guard, which our rules require (`wrap user input in explicit delimiters`).
**It is roughly a third of the back end for a feature nobody has named a use for.**

### Stage 6 — Language admin · *the other part I advised against*
7 `languages/*` routes including a `translate.post` that calls OpenAI. **Virt Advisor already has
language and currency handling** (`localisation-and-currency.md`). **Recommendation: drop this
entirely and use ours** — porting it means running two translation systems side by side.

### Stage 7 — Locales, hub page, and the front door
Merge the 6 locale files into ours. Add the screens to the Firm Manager Hub per the hub-page rule
— **mentor tier first, stating in one line which other tiers need it.** The §0 landing-page bug
dies here: entry is an authenticated hub page.

---

## 11. What each stage costs, stated plainly

These are working days for one focused developer, and they assume nothing goes wrong. **The honest
range is the right-hand column.**

| Stage | Work | Best case | Realistic |
|---|---|---|---|
| 1 | Schema + `firm_id` + migrations | 1 | **1–2** |
| 2 | Pipeline end to end, with tests | 2 | **2–4** |
| 3 | COI + Dashboard | 2 | **2–3** |
| 4 | Team + Lists | 1 | **1–2** |
| 5 | **Blog tool** (incl. 100% LLM test bar) | 2 | **3–5** |
| 6 | **Language admin** | 1 | **2–3** |
| 7 | Locales, hub page, front door | 1 | **1–2** |
| | **TOTAL** | **10** | **12–21 days** |

**Stages 5 and 6 are 5–8 of those days — between a third and a half of the whole job — and both
are parts this survey recommended dropping.** Mike has said he wants everything, and that stands;
the number is here so the choice stays informed rather than forgotten.

**Not included, and genuinely unknown:** whatever the master team needs for the real firm data.
This plan builds against our own MySQL, as everything else here does.

---

## 12. The rules this must not break

Each of these is from `CLAUDE.md` and each has already been verified as a real conflict, not a
theoretical one:

1. **Raw SQL only** — no Prisma reaches this repo. Not as a dependency, not in a migration.
2. **All logic on Restify** — `server-middleware/` stays a thin proxy. Their `server/api/` tree
   does not come across as-is.
3. **Node 14.15** — proved by accident on 2026-09-21: their Prisma client **fails to parse** on
   14.15 (`SyntaxError: Unexpected token '??='`). The app currently runs on Node 20.
4. **OpenAI backend-only, REST not SDK** — via `server/utils/openaiClient.js`.
5. **Pug + Options API + Buefy** — already satisfied by their screens; keep it that way.
6. **Tests** — ≥90% on routes, **100% on anything validating LLM output**. They have none.
7. **Hub page** — the screens surface per the hub-page rule, mentor tier first.
8. **`v-html` sanitised** — the blog tool renders generated markdown; check every render path.

---

## 13. Where this is built, and what happens to the old app

**Built in Virt Advisor, on a branch off `master`.** The Sales Tracker repo is a **source to port
from, never a place to work** — it lives only on `E:`, the drive flagged as an unreliable backup,
and its own `CLAUDE.md` still describes a Nuxt 3 app that no longer exists.

**The one-line fix from §0 is currently uncommitted in that repo.** It should be committed there so
it is not lost, and it is needed in the port regardless.

---

## 14. What I would do first, tomorrow morning

**Stage 1 and Stage 2, together, as one slice** — schema with `firm_id`, then Pipeline end to end
with tests. That produces **one screen genuinely working inside Virt Advisor, with real firm
separation**, and it proves or disproves every assumption in this plan within a few days.

Everything after that is the same work with different columns.

---

---

*Surveyed 2026-09-21 against the code, not against the repository's own documentation.*
