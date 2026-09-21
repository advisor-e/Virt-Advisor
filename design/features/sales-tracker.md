# Sales Tracker — the advisor's own pipeline and referral partners

**History:** [`sales-tracker-history.md`](sales-tracker-history.md)

> **Item 17 on [`to-do-items.json`](to-do-items.json).** §1–6 are the survey of an existing app;
> **§7 onward is the build plan.** Written from the running app, its source and its database —
> never from the repository's own description of itself, which is stale.
>
> 🔴 **MIKE RULED 2026-09-21: HE WANTS ALL OF IT** — all eight screens, not the pipeline-and-COI
> subset §6 recommends. **That decision stands and is not re-argued.** Each stage is priced so the
> choice stays informed.
>
> ⚠ **The measurement is still not named** (§1). It does not block the build Mike has asked for; it
> is what tells us afterwards whether it worked.
>
> 🔴 **CORRECTED 2026-09-21, BEFORE ANY CODE WAS WRITTEN — four findings, one of them Mike's catch.**
> This plan was written and re-read the same day; the re-read found the front half wrong. **Read §4a
> and stage 7 before building anything.**
>
> | | Finding | Where |
> |---|---|---|
> | 1 | **The screens are a repaint, not a port** — 93 colours, 3 on brand, no font at all | §4a |
> | 2 | **The dashboard needs Chart.js**, which we do not have and will not add — it is redrawn | §4a |
> | 3 | ✅ **`va_courses` already answers multi-tenancy** — and better: advisor-private by default | §8 |
> | 4 | 🔴 **"Put the screens on the Firm Manager Hub" was WRONG and nobody asked for it** | §10 stage 7 |
>
> **Finding 4 is the one that matters.** The hub has no advisor scope, so that instruction would have
> built this tool where its own users cannot open it. **It was written by an AI session drafting this
> Brief — not by Mike, and not by any ruling** — and it survived into a costed plan. It was caught
> only because he asked to see the instruction. *(`CLAUDE.md`: "a single AI-written sentence… that a
> later session read as an instruction.")*
>
> **The estimate moves from 12–21 days to 16–25** (§11). The build itself is unchanged in intent.
>
> ✅ **THE FEATURE IS COMPLETE AND MERGED — 2026-09-22, [PR #109](https://github.com/advisor-e/Virt-Advisor/pull/109).**
> Stages 1–5 built (1–3 on 2026-09-21; 4 and 5 on 2026-09-22): five tables, the pipeline and COI,
> the Sales Dashboard, the firm-wide Team roll-up and ten dropdown lists, and the blog tool. Eight
> screens, **mutation-verified**, proven against a real MySQL and **driven in a real browser** —
> which is how all three of the faults in §10 were found, none of them by 13,182 tests.
>
> **Stage 6 was skipped on Mike's ruling** and **stage 7 needed no work** — stages 2–5 had already
> done it. Both are recorded in §10 with what was checked. Closure: `to-do-done-and-parked.md` §2.
>
> 🔴 **STAGE 5 WAS RE-MEASURED 2026-09-22, BEFORE ANY CODE, AND IT IS BIGGER THAN THIS PLAN SAID.**
> It was priced as back end only — *"4 blog routes + 3 reference routes"*. There are **12 API
> files**, and the blog tool **has an 843-line screen**: `pages/index.vue`, which §3 had catalogued
> as *"Entry / landing"*. It is not the landing page; `home.vue` is. **Stage 5 moves 3–5 → 5–8 days,
> the total 16–25 → 18–28** (§11). Nothing is built yet.
>
> **This is stage 3's lesson working.** That stage invented a layout because nobody opened the
> source app first; the rule it left behind — *the source app is the specification* — is what found
> this, one command into stage 5 instead of a day into it.
>
> ⏳ **STAGE 5's BACK END IS COMPLETE (2026-09-22).** Three tables wired, 12 Restify routes, the
> two model calls on `aiProvider` under the `draft` role, **176 tests** with the engine at **100%
> on all four measures**. Suite 13,140 green. **What remains of stage 5 is the screen.** See §10.

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
| `index.vue` | 843 | 🔴 **The blog tool itself** — the whole screen, not a landing page |
| `lists.vue` | 430 | The dropdown values behind the other screens |
| `team.vue` | 189 | Team roll-up |
| `home.vue`, `login.vue` | 300 | Landing and sign-in |

Behind them: **ten MySQL tables**, **36 API files**, six translated languages, and a
**blog-writing tool** that calls OpenAI.

🔴 **`index.vue` IS THE BLOG TOOL, and this table used to call it "Entry / landing".** The landing
page is `home.vue`, which is in the row below it. The mistake mattered: it hid the blog tool's
entire screen, so stage 5 was costed as back-end work alone. Found 2026-09-22 by opening the
source before building — the check stage 3's lesson exists to enforce (§10 stage 3).

⚠ **THE BLOG TOOL AND THE LANGUAGE-ADMIN SCREEN ARE A DIFFERENT PRODUCT**, and between them they
are roughly a third of the back end — **5 to 8 of the 16–25 days** (stages 5 and 6 below).
**Mike has ruled they are in scope**; this note stays only so the cost of that third is never
hidden, and so it can still be cut if he changes his mind.

---

## 4. What already fits, and what does not

### ✅ Already on our stack — the genuine head start

Nuxt **2.18**, Vue **2.7**, Buefy, Vuex **3**, vue-i18n **8**, and **all 15 templates are
`lang="pug"`**. The 4,000 lines of screens carry the right *structure* — Pug, Options API, Buefy
components — and that is a genuine head start on shape.

🔴 **But they are NOT portable as they stand, and an earlier draft of this Brief said they were.**
See §4a: they are painted in another product's palette and set in no font at all. **The structure
survives; the appearance is rebuilt.** That distinction is the difference between a port and a
repaint, and it is worth days.

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

## 4a. 🔴 THE SCREENS ARE A REPAINT, NOT A PORT — measured 2026-09-21

**Counted, not estimated.** Every hex in their `pages/` and `components/`:

| | |
|---|---|
| Distinct colours in their screens | **93** |
| Of those, on our brand palette | **3** |
| `font-family` declarations | **0** |
| Hand-rolled `<style scoped>` blocks | **13** |

Their palette is a Tailwind-style set — `#f97316` orange, `#22c55e` green, `#3b82f6` blue,
`#64748b` slate, `#14b8a6` teal. Against that:

- [`BRAND-TOKENS.md`](../BRAND-TOKENS.md) — set by Mike 2026-07-09 — gives six brand hues and says
  they **"apply to every screen, mockup, chart, and the eventual built UI."** Their screens use
  two of the six.
- **Open Sans Light (300) is the default for all text**, same document. Their screens declare no
  font family at all, so they inherit whatever the shell gives them and none of the weight
  discipline.
- Their green and amber are **decoration**. [`business-performance-report.md`](business-performance-report.md)
  P5: *"Colour means something or it is not used… A colour with no rule behind it is decoration
  that a client will read as a verdict."* Ours are reserved for good / caution / danger.

**What this means for the estimate.** Eight screens need their palette and type replaced, not
copied — the Pug structure and the Buefy components stay. **It is not a polish pass at the end; a
screen wearing another product's colours is not shippable**, and it is invisible in a line count,
which is why it was missed.

### And their dashboard needs a chart library we deliberately do not have

`pages/dashboard.vue` (1,033 lines) imports `chart.js` and `vue-chartjs`, registering eight
Chart.js elements.

**We have no chart library, by design.** Six hand-built SVG components in
[`components/base/`](../../components/base/) — `LineChart`, `BandBarChart`, `DoughnutChart`,
`HBarChart`, `BarPairChart`, `WaterfallChart` — all pure SVG, SSR-safe, already in the brand
palette, already tested.

Taking Chart.js would mean a **new frontend dependency under `engine-strict`** plus a browser-only
library needing a `mounted()` dynamic import or `<no-ssr>` to satisfy the hydration rule. **The
compliant route is to redraw the dashboard on our six components** — which is a rebuild of that
screen, not a port of it. Stage 3 called the dashboard *"the easiest of the three"*; on this
evidence it is the hardest.

### One security path that must not be copied

`pages/index.vue:88-91` pipes `marked(this.draftText)` straight into `v-html` (`:725`, `:753`) with
**no sanitiser**, on text an AI generated. Our rule is `isomorphic-dompurify` on every `v-html`
path. It dies with stage 5 if the blog tool is built, but **it must not be carried across, and the
same page is where a careless port would put it.**

*(`xlsx` is also in their `package.json` and imported by nothing — it does not come across.)*

---

## 5. What a port would actually be

**Not a copy. A rewrite of the back half, and a repaint of the front half.** Roughly 2,200 lines of
server code rebuilt; roughly 4,000 lines of screens keeping their **structure** and losing their
**appearance** — see §4a, which is the half this sentence originally missed.

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
before any design begins**. The screens are on our stack *structurally* and that is real value; the
back end is a rewrite whichever way it is approached, and the parts nobody asked for are the parts
that would make it expensive.

⚠ **This recommendation was written before the §4a measurement, and that measurement strengthens it
rather than changing it** — the screens turned out to be worth less than assumed, not more. **Mike
has ruled for all eight screens regardless (§7 header), and that ruling stands and is not
re-argued.** This section is kept as the survey's original opinion, which is what §6 is for.

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

### The two bugs found by driving it — diagnosis, not just the fix

**Both presented as the same symptom — *"I click a tab and it throws me back to login"*. They were
different faults, and the second was mine to find three theories sooner.**

#### Bug 1 · `/team` and `/lists` always bounced · **FIXED**

**Cause.** `middleware/firm-manager.js` had no `process.server` guard, so its role check ran during
server-side rendering — where there is no cached auth state and the session cookie is not visible.
It concluded *not authenticated* and redirected. `middleware/auth.js` has the guard on line 7; this
file did not.

**Fix.** One line, `if (process.server) return`, with a comment saying why. **Applied 2026-09-21 in
the Sales Tracker repo — ⚠ still uncommitted there** (see §13).

**Proof.** Driven in a real browser before and after: `/team` and `/lists` went from `KICKED` to
`OK`, with 5 team rows rendering.

#### Bug 2 · every tab bounced a visitor · **NOT A CODE FIX — a missing front door**

**Cause.** `/` is the **Blog page and it requires no login.** A person who types the address lands
there, is never prompted to sign in, and every tab they click correctly sends them to `/login`.
Nothing is broken; there is simply no front door.

**Why it took three wrong theories — recorded so nobody repeats them:**

| Theory | Why it looked right | Why it was wrong |
|---|---|---|
| The `Secure` cookie flag | `csrf_token` really is `Secure` under `NODE_ENV=production`, and the site is plain HTTP | Chrome treats `localhost` as trustworthy and sends it anyway |
| `Set-Cookie` being overwritten | `csrf.js:18` really does use `setHeader`, which replaces | Both cookies arrive; the raw headers show it |
| A stale session after the password reset | Plausible, and 52 old sessions existed | A private window failed too |

🔴 **THE METHOD THAT FOUND IT, AND THE LESSON.** Every test that "passed" used `curl`, which
**ignores cookie rules a browser enforces** — so the *server* was proven fine while the *screens*
were never proven at all. It was found within one run of driving a real browser **the way Mike
actually used it: land on the address, click a tab, without logging in first.** Testing the ideal
path proves nothing about the real one. This is [[feedback_walk_the_conversation]] exactly.

**It must not survive the port**, and it does not: in Virt Advisor the entry point is an
authenticated hub page, so a signed-out visitor never sees a working-looking screen.

---

## 8. 🔴 THE BLOCKER: this app has no concept of a firm — and our schema already answers it

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
"later hardening". It is invisible in the screens, which is exactly why it gets stated first.

### ✅ AND OUR SCHEMA ALREADY ANSWERS IT — with a better answer than `firm_id` alone

**Found 2026-09-21 by reading our own schema rather than designing a new one.**
[`config/db-schema.sql`](../../config/db-schema.sql) has settled this convention across a dozen
tables: `firm_id VARCHAR(64) NOT NULL`, foreign-keyed to `firms(id)` `ON DELETE CASCADE`.

🔴 **But `firm_id` ALONE would be the wrong answer here, and `va_courses` shows why.** Mike ruled
(§1) that this is **the advisor's own** tool. Their app's comment — *"Pipeline is shared across the
firm"* — is their product decision, not ours. Ported literally, **every advisor at a firm would see
every other advisor's deals and fee values.** That is not what was asked for.

[`va_courses`](../../config/db-schema.sql) is the exact precedent, and it is already built, already
tested:

```sql
`advisor_id`  VARCHAR(64)             NOT NULL,   -- the owner
`firm_id`     VARCHAR(64)             NOT NULL,   -- the tenant
`visibility`  ENUM('private','firm')  NOT NULL DEFAULT 'private',
KEY `idx_courses_advisor`         (`advisor_id`),
KEY `idx_courses_firm_visibility` (`firm_id`, `visibility`),
CONSTRAINT `fk_courses_firm` FOREIGN KEY (`firm_id`) REFERENCES `firms`(`id`) ON DELETE CASCADE
```

**Private by default, firm-visible by choice, inside one tenant.** That is three protections where
the plan had one, it needs no new thinking, and it makes stage 1 smaller rather than larger. The
identity comes from the verified JWT the way [`server/routes/clients.js`](../../server/routes/clients.js)
does it — `req.advisorId` / `req.firmId`, *"ids in the body/params are NEVER trusted for
ownership — the same rule that closed the cases IDOR."*

⚠ **One open question for Mike, not for us:** whether a firm manager sees their advisors' pipelines
by default. `visibility` carries either answer; the Team screen (stage 4) is where it becomes
visible.

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

### Stage 1 — The schema, on our existing convention · ✅ **BUILT 2026-09-21**
[`config/db-migration-sales-tracker.sql`](../../config/db-migration-sales-tracker.sql) · guard
[`tests/unit/salesTrackerSchema.test.js`](../../tests/unit/salesTrackerSchema.test.js) (32 tests)

**FIVE tables, not the ten the source has, and not the eight this section first estimated.** Every
omission is a decision, stated in the migration's own header:

| Source table | What happened | Why |
|---|---|---|
| `pipelineentry` | → **`va_sales_pipeline`** (38 cols) | All 34 business columns kept |
| `coientry` | → **`va_sales_coi`** (22 cols) | All kept |
| `bloginput`, `blogpost`, `blogreference` | → **`va_sales_blog_*`** | Stage 5 is in scope by Mike's ruling; created now, **inert** |
| `user`, `session` | ⛔ **dropped** | All login is the master app's. Identity is `req.advisorId` / `req.firmId` from the verified JWT |
| `auditlog` | ⛔ **dropped** | **We already have `audit_log`** — append-only, a superset of their columns. The Sales Tracker writes to it |
| `appconfig` | ⛔ **dropped** | **We already have `firm_framework_versions`.** Theirs is `list:<key>` → JSON deduped in app code; ours dedupes in the database *and* brings version history and restore free. Lists uses `sales-tracker-list:` keys |
| `customlanguage` | ⛔ **not created** | Stage 6, recommended for dropping — we have 8 locale files against their 6 |

**Two tables dropped beyond the `user`/`session` recommendation**, both because our own store already
does the job better. That is the §8 finding repeating itself: *read our schema before designing.*

#### 🔴 Proven against a real database, not by reading it

Run on the local MySQL 8.4 `virt_advisor` on 2026-09-21 — **the migration is not a proposal that has
never been executed:**

- **All 5 tables created.** `va_sales_pipeline` 38 columns / 6 keys, `va_sales_coi` 22 / 5.
- **The foreign key REFUSES an unknown firm** — `ER_NO_REFERENCED_ROW_2`. The tenant boundary is a
  database guarantee, not a convention a route might forget.
- **A new deal defaults to `visibility = 'private'`.** One advisor's deals are invisible to their
  colleagues until they choose otherwise.
- **Money is exact.** `12345678901.99` and `0.01` round-tripped unchanged — `DECIMAL(14,2)`, no float
  drift on a fee value a firm reports on.
- Test rows removed; the table was left empty.

The guard test pins each of those properties and was **mutation-verified**: flipping the default to
`'firm'`, dropping `ON DELETE CASCADE`, and changing a money column to `DOUBLE` each fail it.

⚠ **It has NOT been run against the Advisor-e database.** That is the master team's, and it needs the
`firms` table and the `__platform__` row first — same prerequisites as every other migration here.

**Still open, and it is Mike's:** whether a firm manager sees their advisors' pipelines by default.
`visibility` carries either answer with no schema change; stage 4's Team screen is where it shows.

### Stage 2 — Pipeline, end to end · *the proof* · ✅ **COMPLETE 2026-09-21**
✅ migration (stage 1) → ✅ **4 Restify routes + the store** → ✅ the page, repainted to brand (§4a):
[`components/sales/SalesPipeline.vue`](../../components/sales/SalesPipeline.vue) at `/sales-pipeline`.

| | |
|---|---|
| [`server/utils/salesPipelineStore.js`](../../server/utils/salesPipelineStore.js) | Raw `mysql2`, no ORM. The access rules live here |
| [`server/routes/salesPipeline.js`](../../server/routes/salesPipeline.js) | `GET` · `POST` · `PUT /:id` · `DELETE /:id`, all behind `firmAuth` |
| [`tests/unit/salesPipelineStore.test.js`](../../tests/unit/salesPipelineStore.test.js) | 44 tests — the SQL |
| [`tests/unit/salesPipeline.routes.test.js`](../../tests/unit/salesPipeline.routes.test.js) | 55 tests — the contract |

**Coverage: routes 99%, store 97%** — both past the ≥90% route bar.

**The access rule, in one line:** an advisor sees **their own deals at any visibility plus their
firm's deals marked `firm`**, and may **change only their own**. That asymmetry is deliberate — a
shared deal is readable by a colleague and editable only by its owner.

⚠ **"`firm_id` scoping" is not enough and this line used to say only that.** A route filtering on
the firm alone returns every advisor's deals to every colleague — the exact fault §8 exists to
prevent. The filter is the advisor **and** the firm, widened only by `visibility`.

#### Three faults in the source app that did NOT come across

Each was read from its code, and each is pinned by a test that was **mutation-verified** — the
rule was broken on purpose and the test caught it:

1. **No firm filter.** Its list route says so itself: *"Pipeline is shared across the firm - no
   userId filter"*. In a multi-tenant app that is one firm reading another's prospects.
2. **An IDOR on update.** `[id].patch.js` runs `updateMany({ where: { id } })` behind a plain
   "is signed in" check, on an **auto-increment integer**. Anyone could edit anyone's deal by
   guessing a number. Ours checks ownership in SQL *and* uses UUIDs.
3. **16 of 34 fields editable.** Its update schema omits `industry`, `meetingDate`, `dateSecured`,
   `supportStaff` and 13 more — creatable, never editable. Ours drives validation off the store's
   single `COLUMNS` list, so the two cannot drift.

#### Two decisions worth recording

**`PUT`, not `PATCH`, though the body is a partial update.** Every partial update in
`restify-server.js` is a `PUT` — 36 of them — and `PATCH` appears nowhere. My first attempt used
`PATCH` and `tests/unit/serverWiring.test.js` **failed the build**, because its mock stubs exactly
the verbs the app uses. The guard was right: adding a verb for one route means widening a shared
mock for no behavioural gain.

**Money is validated at the route, not left to MySQL.** A value past `DECIMAL(14,2)` is **refused**
rather than truncated into a different figure, negatives are refused, and a non-finite number
becomes `0.00` rather than `NaN` — which would fail the whole insert on one bad field.

### Stage 3 — COI + Dashboard · ✅ **COMPLETE 2026-09-21 — backend AND both screens**
[`server/utils/salesCoiStore.js`](../../server/utils/salesCoiStore.js) ·
[`server/utils/salesMetrics.js`](../../server/utils/salesMetrics.js) ·
[`server/routes/salesCoi.js`](../../server/routes/salesCoi.js) — 4 COI routes and the metrics
route, 98 tests. Coverage: metrics **100%**, store 97%, routes 93.5%.

**The two screens**: [`components/sales/SalesCoi.vue`](../../components/sales/SalesCoi.vue) at
`/sales-coi`, and [`SalesDashboardScreen.vue`](../../components/sales/SalesDashboardScreen.vue)
at `/sales-tracker-dashboard`, with his three components copied beside them (`StatCard`,
`ChartCard`, `LoadingSpinner`). Both driven in a browser against seeded data.

> ## 🔴 THE DASHBOARD IS A FAITHFUL COPY OF MIKE'S OWN — and the first attempt was not
>
> **His ruling, 2026-09-21:** *"i want what i had in the first place - i spent a lot of time to
> get it right - all you had to do was wire it - not fuck with it and start changing it."* And
> then: *"build it as close as possible to what i provided … dont change shit - get it looking
> the same."*
>
> **What the first attempt did wrong, all of it unasked:** it invented a waterfall chart that
> appears nowhere in his design or in this plan; it **collapsed his two funnels into one**,
> losing the Campaign / Total Needs distinction that is the whole point of the screen; it
> dropped his progress rings, his avg-fee and avg-days cards and his COI stats table; and it
> renamed the page *"My Pipeline Insights"*. It was deleted entire and rebuilt from
> `pages/dashboard.vue`.
>
> **Two lessons, and the second is the expensive one.** A plan that says *"redraw on our six SVG
> components"* names the CONSTRAINT, not the design — it is not a licence to invent a layout.
> And **the source app is the specification**: read the screen being ported before writing the
> one replacing it. Nothing in §4a or §10 said what this screen looked like, and nobody noticed
> that until Mike opened it.
>
> **What is copied:** every section in his order, his seven stat cards, both rings-and-averages
> blocks with his eight ring colours, his COI panel, his charts row, his CSS unchanged
> (deliberately NOT re-themed to our brand tokens), and his wording verbatim in
> `locales/en.json` under `salesTrackerDashboard`.
>
> **The three deliberate differences, each forced and each stated:**
>
> | | |
> |---|---|
> | **The charts** | His seven are Chart.js + vue-chartjs. We cannot add either (§4a, and `engine-strict` on Node 14.15), so they are drawn on `components/base/` carrying **his** colours. His two VERTICAL bar charts are horizontal — we have no vertical bar component. |
> | **The address** | `/sales-tracker-dashboard`, because `/sales-dashboard` is item 4.95's Sales Dashboard **model** — a different screen reading a CLIENT's workbook. The page still calls itself *"Sales Dashboard"*, his title. |
> | **Money** | `currencyMixin`, not his hardcoded `Intl.NumberFormat('en-NZ', { currency: 'NZD' })`, which would show every firm on earth New Zealand dollars. |

🔴 **HIS TWO FUNNELS SPLIT ON `salesStyle` — 'Campaign' vs 'Total Needs'.** Two ways of selling,
reported separately so they can be compared, each with its own four rates, average fee and
average days. `sales_style` was **already in our table and our store** from stage 1; it simply
was not being read. `dashboard()` in `salesMetrics.js` is a field-for-field port of his
`server/api/dashboard/metrics.get.js`, and `tests/unit/salesDashboardMetrics.test.js` (22 tests)
fails if the two funnels are ever collapsed again — mutation-verified.

⚠ **HIS ROUNDING AND HIS ZEROES ARE KEPT, AGAINST THE CONVENTION ABOVE.** `wholeRate` returns a
whole number and **0** for an empty denominator, where `rate` returns `null`. That is deliberate:
his rings are DRAWN from the percentage and a ring needs a number. Both live side by side and
neither was changed — `compute()` and its published contract are untouched, because removing a
field nobody asked about is its own kind of unasked change.

🔴 **THE DASHBOARD AGGREGATES THE STORES; IT NEVER QUERIES THE TABLES.** `salesMetrics` takes
rows and returns figures — no database access, no identity handling — so it can only summarise
what the two stores already filtered. **The access rule is enforced once, in SQL, and the
dashboard cannot widen it.** The source app computes its dashboard from separate aggregates
carrying no user filter at all: a second place to write the rule, and it got it wrong.

**🔴 Every rate guards its denominator.** A conversion rate over zero approaches is not 0% and
not 100% — it returns **null**, so the screen says *nothing to report*. A confident 0% on an
empty pipeline tells an advisor their approach is failing when they have not started, and no
tester can see that a percentage is wrong. Three more judgements, each with its test:
**days-to-secure is a median** (10/20/30 plus one at 731 gives 25, where a mean gives ~198);
**an undated win is skipped, never dated to today**; and **the COI rate is conversions over
referrals**, not over partners, which would read 250%.

🔴 **THE DASHBOARD WAS THE HARDEST SCREEN, AND NOT FOR THE REASON THIS SECTION GAVE.** It read
*"the easiest of the three and the most visible"*, which was true of its **backend** (read-only
aggregation) and false of the screen; that much was corrected before the build. What the
correction still missed is that the difficulty was never the charts — **it was that nobody had
read his screen**, so "redraw it on our components" sounded like a free hand. It is not. See the
box above.

### Stage 4 — Team + Lists · ✅ **COMPLETE 2026-09-22 — backend AND both screens**
[`server/utils/salesTeamStore.js`](../../server/utils/salesTeamStore.js) ·
[`server/utils/salesListsStore.js`](../../server/utils/salesListsStore.js) ·
[`server/routes/salesTeam.js`](../../server/routes/salesTeam.js) — 5 routes, 120 tests.
Coverage: routes 98.8% statements / 100% functions.

**The two screens**: [`components/sales/SalesTeam.vue`](../../components/sales/SalesTeam.vue) and
[`SalesLists.vue`](../../components/sales/SalesLists.vue), at `/sales-team` and `/sales-lists`
**and as two Firm Manager Hub tabs** — Mike's ask, 2026-09-22: *"make sure the firm manager hub
is running too - so i can see the lists and report"*. One component, two doorways: it takes the
hub's token through an optional `apiToken` prop and falls back to the advisor's own on the page.

> ## 🔴 THEIR TEAM SCREEN DOES NOT WORK, AND THE BUG IS NOT THE ROLE CHECK
>
> This section used to say only *"their bug from §0 does not get ported"*, meaning the
> middleware. There are **two** faults stacked, and the second is the one that matters:
>
> 1. **The role check gates the PAGE, not the data.** `middleware/firm-manager.js` opens
>    `if (process.server) return` — a client-side redirect, so `/api/team/summary` stays open
>    to anyone signed in. Ours is `requireManagerRole` in front of the route.
> 2. 🔴 **The query is wrong and the screen is meaningless.** `summary.get.js` line 13 filters
>    `where: { userId: user.id }` — it aggregates **only the manager's own deals** and then
>    groups them by `leadStaff`. A team roll-up that cannot see the team. Ours filters by
>    **firm**, and `tests/unit/salesTeamSummary.test.js` fails if it is ever narrowed back —
>    mutation-verified.

🔴 **A FIRM MANAGER SEES EVERY DEAL IN THE FIRM, PRIVATE ONES INCLUDED — Mike's ruling,
2026-09-22.** This is the open question stage 1 left behind, now answered. It is the one sales
read that crosses the advisor boundary, which is why the role gate is server-side and the firm
filter is in the SQL rather than in a handler. `salesTeamStore.listForFirm` is the only place
it happens.

🔴 **THE APPROACH RATE IS MIKE'S MEASURE, NOT THE SOURCE APP'S — his ruling, 2026-09-22.** In
his words: *"the % of prospects identified and research completed (available sales approach
opportunities) vs the actual number of those prospects approached — helps a manager identify an
advisor who spends time looking for client opportunities but never starting the sales process
with them."*

- **Approached** = an `approachDate` is recorded. **NOT `approachStyle`**, which the pipeline
  screen fills in on creation — the source app's `avgApproachConversion` counts that, so its
  rate reads ~100% for everyone and measures nothing. Found by opening the screen, not by a test.
- **Available** = every prospect whose status is not `Await Research`. A full research queue is
  not held against an advisor.
- The screen shows **both halves** (`2 / 3`) beside the percentage, so the figure can be read
  rather than taken on trust.

⚠ **THE LANGUAGES SECTION OF THEIR LISTS SCREEN IS DELIBERATELY NOT BUILT.** Their
`pages/lists.vue` carries an *"add a language, AI translates the whole app"* block — that is
stage 6, recommended for dropping because we already have 28 languages against their 6. Its
absence is a scope decision, pinned by a test so no later session quietly adds it.

**The ten lists ride `firm_framework_versions`**, as stage 1 decided — so version history and
restore came free and are exposed as two extra routes. Their `appconfig` upsert keys on
`(userId, configKey)`, so every manager who edits a list creates their own row and the app
dedupes in JavaScript; ours keys on the firm.

#### A bug only the screen could show

The firm-total row rendered `7` where it should read `7 / 8`. The cause was **Vue 2
reactivity** — `totals` was declared `{}`, so a field arriving later from the server was never
tracked — while the **identical markup one row above was correct**, because `rows` is an array
replaced wholesale. Every one of the 12,956 tests passed throughout. Fixed by declaring every
field at create time, and guarded by `salesTeam.component.test.js`, mutation-verified.

### Stage 5 — Blog tool · ✅ **COMPLETE 2026-09-22 — back end AND the screen**

✅ **Built:** `server/utils/salesBlogStore.js` (three tables), `server/utils/salesBlogEngine.js`
(the two model calls), `server/routes/salesBlog.js` (12 routes), registered in
`restify-server.js`. **176 tests**, the engine at **100% on all four measures** and pinned in
`jest.config.js`.
✅ **The screen**, built the same day: `components/SalesBlog.vue` (997 lines) and
`pages/sales-blog.vue`, an **advisor** page — the hub has no advisor scope, and these are the
advisor's own drafts. A fourth card on `/sales-tracker` opens it. Model output is sanitised with
`isomorphic-dompurify` before `v-html`; this is the component's own renderer and the locked
`VirtualAdvisor` pipeline is untouched.

⚠ **Opening it found what the suite did not**: the doorway's icon chain ended in a bare `v-else`,
so the fourth card silently wore the dashboard's bar chart. Fixed, and pinned by a test asserting
every card draws a **different** icon. One defect was recorded rather than fixed — `is-primary` and
`is-info` on two adjacent buttons, an instance of item **16.1**.

#### What changed from the source, and why

| | The source app | Here |
|---|---|---|
| AI client | `openai` SDK — banned by req 7, and it does not run on Node 14.15 | `aiProvider.getClient('draft')`, the seam every other model call uses |
| Model | hardcoded `gpt-4o` | not named — the role decides it |
| Advisor input | concatenated straight into the prompt | `promptSafety.fenceUntrusted`, plus `stripInvisible` |
| Access | `userId` alone | `advisor_id = ? AND firm_id = ?` on every read AND write |
| Tests | none at all | 176, engine at 100% |

🔴 **THE FENCING USES THE SHARED HELPER, NOT A LOCAL COPY — and a first draft of this file got
that wrong.** It grew its own two-line `<<<`/`>>>` fence and would have been the only prompt
builder here not using `promptSafety.fenceUntrusted`, which ten other backend files already use.
Caught by finding `tests/unit/promptSafety.test.js` while checking something else. The shared
helper is better twice over: its markers are `<<<ADVISOR_DATA`, distinctive where a bare `<<<`
can occur in an advisor's own markdown; and it ships `stripInvisible`, which removes the
zero-width and bidi characters a local fence passes straight to the model. **A guard that is
nearly the house one is how a rule quietly drifts out of step with itself.**

✅ **The template fallback is PORTED, not redesigned.** No key, an empty reply or any thrown
error each return a markdown skeleton built from the advisor's own brief, with
`source: 'template'` and the reason. **Both generate routes answer 200 on a model failure** — a
500 would throw away an outline the advisor can still edit. A missing field is still a 400.

⚠ **`isPinned` on a post, and `kind`, fail safe.** An unrecognised `kind` stores as `draft`,
never `final`: publishing something unfinished is the damaging direction.

🔴 **NO MANAGER ROLE ON ANY BLOG ROUTE**, the mirror image of stage 4's Team roll-up. A manager
reading a colleague's *deals* is Mike's ruling of 2026-09-22; reading their half-written *drafts*
is not, and nobody asked for it. `serverWiring.test.js` fails the build if one acquires the role.

#### The original measurement, kept because it is why this stage grew

🔴 **RE-MEASURED 2026-09-22, BEFORE ANY CODE — this stage was understated twice over.** The
previous wording read *"4 blog routes + 3 reference routes"* and named no screen at all. Both
numbers were wrong, and the second one hid the largest screen in the source app.

| | The old wording said | What is actually there |
|---|---|---|
| Back end | 7 routes | **12 API files** — 2 generate, 3 inputs, 4 posts, 3 references — plus `server/utils/openai.js` (119 lines) |
| Screen | *(not mentioned)* | **`pages/index.vue`, 843 lines** — the blog tool IS a screen (§3) |

**The work:** those 12 routes as Restify routes with raw `mysql2`, `openai.js` rewritten against
`server/utils/openaiClient.js`, and the screen repainted to brand exactly as stages 2–4 were
(§4a — 93 colours to 6, Open Sans 300). The three `va_sales_blog_*` tables **already exist and sit
inert**, built in stage 1, so there is no schema work.

✅ **One thing the source gets right, and it must be kept.** Every AI path already has a **template
fallback**: no key, an empty response, or a thrown error each fall back to locally-built markdown
and report `source: 'template'` with the reason. That satisfies our *"every LLM call has a graceful
fallback"* rule as written — port the behaviour, do not redesign it.

🔴 **This is the strictest work in the whole plan**: our standards require **100% test coverage on
anything that validates LLM output**, and this app has **no tests at all**. Its OpenAI calls also
have no prompt-injection guard, which our rules require (`wrap user input in explicit delimiters`)
— it concatenates the advisor's topic, audience and CTA straight into the prompt string.

### Stage 6 — Language admin · 🔴 **SKIPPED ON MIKE'S RULING, 2026-09-22**

7 `languages/*` routes including a `translate.post` that calls OpenAI. **Virt Advisor already has
language and currency handling** (`localisation-and-currency.md`), so porting it means running two
translation systems side by side.

**This is the one departure from *"Mike wants all of it"*, and he made it himself.** Put to him at
the stage, with the recommendation and one further fact: **we translate nothing into any language
today.** The seven non-English locales hold 8 top-level keys against English's 54, and
`plugins/i18n.js` sets `fallbackLocale: 'en'`, so a French reader sees English words rather than
broken keys. A translation admin would have managed a system nobody uses. **His answer: "go to
stage 7."**

### Stage 7 — Locales, the advisor's pages, and the front door · ✅ **ALREADY COMPLETE 2026-09-22**

**Nothing was built, because stages 2–5 had already done all three parts as they went.** Checked
against the code rather than against this plan — which is the lesson of finding 4 below, a plan
sentence nobody verified:

| Part | State |
|---|---|
| The advisor's pages | ✅ Eight `pages/sales*.vue`. The four not on the doorway are correct: `sales-dashboard` is item 4.95's **client** workbook, and `sales-team`/`sales-lists` are manager screens reached through the hub |
| The Team roll-up as a hub tab | ✅ `salesTeam: ['firm']` in `TAB_TIERS`, its panel, and the `hubTabTiers` key |
| Merge the 6 locale files | ✅ **341 `$t()` calls across the sales screens, no hardcoded English** |
| The front door | ✅ Dead by construction — see below |

**The front-door bug (§7 bug 2) does not survive the port, and that was verified, not assumed.**
The doorway carries no auth code at all, which looks wrong for a minute: it is correct, because the
page renders four links and fetches nothing, so it holds no data to protect. **Every screen behind
it gates on the backend** (`firmAuth`, plus `requireManagerRole` on the manager screens). The source
app's fault was the reverse — it hid pages with a client-side redirect and left its endpoints open.

🔴 **THE SCREENS ARE ADVISOR PAGES, NOT HUB TABS. An earlier draft of this plan said the opposite
and it was wrong — corrected 2026-09-21 on Mike's challenge.**

The wrong instruction, struck: *"Add the screens to the Firm Manager Hub per the hub-page rule —
mentor tier first."* **Mike never asked for that. No ruling says it.** It was written by an AI
session drafting this Brief, and it fails on two counts:

1. **The hub has no advisor scope.** `HUB_SCOPES = ['mentor', 'global', 'group', 'firm']`
   ([`components/FirmManagerHub.vue`](../../components/FirmManagerHub.vue)), behind
   `requireManagerRole`. §1 says this tool is **for the firm's own advisors**. Following the
   instruction would have built the Sales Tracker where its own users cannot open it.
2. **The hub-page rule does not apply.** `CLAUDE.md` scopes it to *"any change to what the AI is
   shown — content wired up, corrected, added, or newly emitted into a prompt."* **The Sales
   Tracker feeds no prompt.** The rule was reached for because it is written in strong language,
   not because it covers this.

**What it conflated.** The genuine point was the front-door bug (§7): a signed-out visitor must
never land on a working-looking screen. Any authenticated page in our app fixes that. The draft
slid from *"an authenticated hub page"* to *"the Firm Manager Hub"*, which is a specific
manager-only screen.

**The correct shape:**

| Screen | Where it goes | Why |
|---|---|---|
| Pipeline, COI, Dashboard, Lists | `pages/sales/*.vue` — **advisor pages** | The advisor's own deals. The pattern is the 41 pages already in [`pages/`](../../pages/) — `my-reports.vue`, `model-library.vue` |
| **Team roll-up** | **A Firm Manager Hub tab** | A manager reading their advisors' pipelines **is** a manager function. This one belongs there, and only this one |

**The Team tab follows the hub's own pattern exactly** — an entry in `TAB_TIERS` naming its tiers
with the ruling behind it, an entry appended to the end of the right `NAV_GROUPS` group, one
`v-if="showsTab(...)"` panel, the body in `components/firm/`, and the key added to
`tests/unit/hubTabTiers.test.js`, which **fails the build** until it is. Per the mentor-alone
default (`CLAUDE.md`, 2026-08-24), it starts at the **firm** tier — a firm's own advisors' deals
mean nothing to the mentor, who has no advisors of its own — and cascades upward only if Mike wants
a group view. **That judgement is stated here rather than assumed, and it is his to overturn.**

The §7 landing-page bug dies here: entry is an authenticated page either way.

---

## 11. What each stage costs, stated plainly

These are working days for one focused developer, and they assume nothing goes wrong. **The honest
range is the right-hand column.**

🔴 **RE-PRICED 2026-09-21 after the §4a measurement.** The first version of this table costed the
back end and assumed the screens came across nearly free. They do not. **Every stage that owns a
screen carries a repaint** — palette and type replaced, structure kept — and stage 3 carries a
redraw on top of that.

| Stage | Work | Was | **Now** | Why it moved |
|---|---|---|---|---|
| 1 | Schema on the `va_courses` pattern | 1–2 | ✅ **DONE** | Built 2026-09-21 in well under a day — the convention already existed (§8), and two more tables dropped out |
| 2 | Pipeline end to end, with tests | 2–4 | ✅ **DONE** | Built 2026-09-21 — backend, screen and 122 tests |
| 3 | COI + Dashboard | 2–3 | ✅ **DONE** | Built 2026-09-21 — backend and both screens. The dashboard was rebuilt once: see §10 stage 3 |
| 4 | Team + Lists | 1–2 | ✅ **DONE** | Built 2026-09-22 — 5 routes, both screens, 2 hub tabs, 120 tests |
| 5 | **Blog tool** (incl. 100% LLM test bar) | 3–5 | ✅ **DONE** | Built 2026-09-22 — 12 routes, the 997-line screen, 176 tests. Re-measured first: 12 routes not 7, and an **843-line screen** the plan never counted (§10 stage 5) |
| 6 | **Language admin** | 2–3 | 🔴 **SKIPPED** | Mike's ruling 2026-09-22 — a second translation system beside ours, managing languages nobody uses (§10 stage 6) |
| 7 | Locales, advisor pages, front door | 1–2 | ✅ **NIL** | Stages 2–5 had already done all three parts; verified against the code (§10 stage 7) |
| | **TOTAL** | **12–21** | **COMPLETE** | Stages 6 and 7 — the 3–5 days this table still carried — cost nothing in the end |

**The honest movement is +6 days over two corrections.** Nothing was padded, and both movements
have the same single cause: **the screens are a repaint, and the first estimate counted none of
them.** 2026-09-21 found that for stages 2–4 (93 colours → 6, no font → Open Sans 300);
2026-09-22 found the blog tool's own 843-line screen, which §3 had miscatalogued as a landing
page, and 12 routes where the plan said 7.

**Stages 5 and 6 were 7–11 of those days — between a third and a half of the whole job — and both
were the parts this survey recommended dropping.** That number was kept here so the choice stayed
informed rather than forgotten, and in the end it did its job: stage 5 was built as Mike ruled, and
**stage 6 he skipped himself** when it was put to him at the stage with the measurement beside it.

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
7. 🔴 **Brand palette + Open Sans 300** — [`BRAND-TOKENS.md`](../BRAND-TOKENS.md), *"every screen…
   and the eventual built UI"*. **Their 93 colours and missing font are a breach, not a preference**
   (§4a). Semantic green/amber/red signal state only, never decoration.
8. 🔴 **No new chart library.** The six SVG components in [`components/base/`](../../components/base/)
   draw everything. Chart.js does not come across (§4a).
9. **Advisor pages, not hub tabs** — the hub has no advisor scope. Only the Team roll-up is a hub
   tab (§10 stage 7).
10. **`v-html` sanitised** with `isomorphic-dompurify` — their `pages/index.vue` does **not**
    sanitise, and that path must not be copied (§4a).

---

## 13. Where this is built, and what happens to the old app

**Built in Virt Advisor, on a branch off `master`.** The Sales Tracker repo is a **source to port
from, never a place to work** — it lives only on `E:`, the drive flagged as an unreliable backup,
and its own `CLAUDE.md` still describes a Nuxt 3 app that no longer exists.

⚠ **THE BUG-1 FIX FROM §7 IS UNCOMMITTED AND EXISTS IN ONE PLACE ONLY** — the working tree at
`E:/Visual Code Projects/sales-tracker-nuxt-clean/middleware/firm-manager.js`, on the drive above.
**If that folder is lost, the fix is lost**, and the next person to run the app meets the same
`/team` and `/lists` failure with nothing to say why.

**It survives in two ways and needs only one of them:** committed in that repo (a one-line change
with its comment), or carried into the port, where the same guard is needed on our own tier check.
**The diagnosis in §7 is the part that must not be lost either way** — the fix is one line and could
be rewritten in a minute; knowing *why* took most of a morning.

### 🔴 THE STUB FOR THE MASTER TEAM — one link, and the whole feature is reachable

**Mike, 2026-09-22:** *"when this gets introduced to the master app we need a 'stub' the master
coding team can place the landing page/doorway into a page within the main advisor-e app"*.

**This app has no navigation of its own.** `layouts/default.vue` is `div > nuxt` and nothing more:
every screen here is reached by Advisor-e deep-linking into it. So a screen nobody links to cannot
be found at all — which is exactly what had happened to the advisor's three Sales Tracker screens
until this page was built.

| What the master team places | Where it goes |
|---|---|
| **One link to `/sales-tracker`** | Wherever an advisor's tools are listed in Advisor-e |

That address is the advisor's landing page ([`pages/sales-tracker.vue`](../../pages/sales-tracker.vue)
→ [`SalesTrackerHome.vue`](../../components/sales/SalesTrackerHome.vue)), and it opens onto the
three advisor screens:

| Card | Address | Who |
|---|---|---|
| My pipeline | `/sales-pipeline` | any advisor — `firmAuth` only |
| My referral partners | `/sales-coi` | any advisor — `firmAuth` only |
| My sales dashboard | `/sales-tracker-dashboard` | any advisor — `firmAuth` only |

🔴 **ONE LINK, NOT FOUR, AND THAT IS THE POINT OF A STUB.** Adding a fourth advisor screen later
changes this landing page and **never their link** — no second integration conversation.

⚠ **THE MANAGER'S TWO SCREENS ARE NOT ON IT, DELIBERATELY.** The Team roll-up and the Lists are
Firm Manager Hub tabs behind `requireManagerRole`; a card here would hand every advisor a door
that answers 403. A manager reaches them through the hub they already open
(`/firm-manager` → *Your Team In Action*), so the master team has nothing extra to place for those.

Pinned by `tests/unit/salesTrackerHome.component.test.js`: every card points at a page that
exists, neither manager screen is offered, and `/sales-tracker` itself is asserted by name — so a
rename that would break their link fails the build here first.

---

## 14. What I would do first, tomorrow morning

**Stage 1 and Stage 2, together, as one slice** — schema on the `va_courses` pattern, then Pipeline
end to end with tests **and repainted to brand**. That produces **one screen genuinely working
inside Virt Advisor, owned by one advisor, inside one firm**, and it proves or disproves every
assumption in this plan within a few days.

**Pipeline is the right first slice precisely because it exercises all four findings at once:** the
schema pattern (3), the repaint (1), an advisor page rather than a hub tab (4), and the route
pattern. The dashboard's chart redraw (2) is the only thing it does not touch.

Everything after that is the same work with different columns.

---

---

*Surveyed 2026-09-21 against the code, not against the repository's own documentation.*
