# Sales Tracker — the advisor's own pipeline and referral partners

**History:** [`sales-tracker-history.md`](sales-tracker-history.md)

> **Item 17 on [`to-do-items.json`](to-do-items.json).** Nothing here is built. This page is the
> survey of an existing app and what porting it would actually cost, written so the decision is
> made on facts rather than on the repository's own description of itself.
>
> 🔴 **THE MEASUREMENT IS NOT YET NAMED, SO NO DESIGN BEGINS.** See §1.

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

**How will we know afterwards? ⛔ NOT ANSWERED.** The honest measure is whether advisors use it in
place of the spreadsheet or second app they use today. **That has to be named properly before
anything is designed** — it is the half of the test that item 7.2 skipped at a cost of two and a
half days.

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

🔴 **THE BLOG TOOL AND THE LANGUAGE-ADMIN SCREEN ARE A DIFFERENT PRODUCT.** They are roughly a third
of the back end and nobody has asked for either. **Scope any port to Pipeline + COI and leave them
behind** — taking them doubles the work for no gain anybody has named.

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

*Surveyed 2026-09-21 against the code, not against the repository's own documentation.*
