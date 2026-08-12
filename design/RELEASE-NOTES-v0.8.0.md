# Release Notes — v0.8.0

**Tag:** `v0.8.0` · **Cut:** 2026-08-13 ·
**Previous release:** [`v0.7.0`](RELEASE-NOTES-v0.7.0.md) (`015eed0`, 2026-08-04) — pulled
2026-08-04 by the master-app team as `2beba9f`.

**74 commits since v0.7.0.**

> ✅ **NO `npm install` REQUIRED.** `package.json` is byte-identical to v0.7.0 — not one
> dependency added, removed or moved. This is deliberately called out because v0.7.0 added
> `@mdi/font` and, without the install, the Hub's tab icons rendered blank, which reads as a
> broken build rather than a missing package. That cannot happen with this release.

**Verified at tag time, on the tagged commit:** 5,114 tests green across 300 suites · lint
0 errors · critical-audit gate PASS. Runtime target unchanged: **Node 14.15**, backend
CommonJS, Nuxt 2 / Vue 2 / Restify 9.1.0 per the Stack Constitution.

---

## 🔴 READ THIS FIRST — three things that will otherwise cost you an afternoon

### 1. Nothing in the app links to the new screens. Type the addresses.

A feature is not delivered until someone can reach it, and these three have no menu entry
anywhere — `pages/index.vue` redirects `/` to `/advisor`. **Give testers the URL, not a path
through a menu.**

| Screen | Address |
|---|---|
| Mentor Hub | `/mentor` |
| Global Group Manager Hub | `/global-group-manager` |
| Group Manager Hub | `/group-manager` |
| Firm Manager Hub | `/firm-manager` |

Inside Advisor-e this repo surfaces at three places — firm manager → *Manage AI Coach*;
adviser → *AI help*; adviser → *Performance Reports*. The three hubs above are **not** among
them yet, which is why the addresses matter.

### 2. The two middle tiers CANNOT be logged into, and that is not a bug in this release.

Advisor-e issues no role value for a global group manager or a group manager.
`server/collaborate/data/roles.js` maps only `platform_admin` → mentor and `firm_manager` →
firm manager; `globalManagerRole` and `groupManagerRole` in `config/integration.js` are
deliberately **empty strings**, because this repo never invents a role-value name.
(⚠ `mentor` was never added either — it still borrows `platform_admin`.)

**To exercise either middle tier, run with `ALLOW_DEV_AUTH=true` in a NON-production
environment** and use the dev bearer tokens in `server/middleware/firmAuth.js`:
`dev-local-mentor`, `dev-local-global`, `dev-local-group`, `dev-local-bypass` (firm manager).
They are refused outright in production, twice over. This is the only way anyone — including
us — can open those two hubs today.

The full handover, including exactly what Advisor-e needs to send, is
[`USER-LEVEL-CASCADE-HANDOVER.md`](USER-LEVEL-CASCADE-HANDOVER.md). **It was corrected on
2026-08-13** — an older copy asks you to choose between two database shapes for the group
layers. **Do not answer that question.** It was settled a third way on 2026-08-09 and built:
reserved scope ids ride the existing `firm_id` column, and no schema change is needed.

### 3. Seed the reserved `firms` row for every tier BEFORE testing a save.

Each management scope stores against a reserved id — `__platform__`, `__global__:<brand>`,
`__group__:<brand>:<country>` — and each needs a row in `firms`, or the save is refused by a
foreign key. The insert instructions are in `config/db-schema.sql`, beside the `__platform__`
insert you already run.

**In v0.7.0 and every release before it, missing that row failed SILENTLY** — see the storage
fix below. It no longer does.

---

## What's new since v0.7.0, by theme

### 1. The management cascade reaches all six levels

The hierarchy is `mentor → global_group_manager → group_manager → firm_manager → advisor →
business_entity`. **This app does not implement that hierarchy — it scopes to it**; login,
accounts, roles and the org chart remain Advisor-e's.

- **Two new hub pages** (`/global-group-manager`, `/group-manager`). They are the *same*
  component as the Firm Manager Hub with a different scope, per the ruling that every tier is
  one screen re-scoped — so they add no new functionality to learn.
- **Content cascades down through every level.** Domain Support, Logic Tables, section
  placement, Advisory Distinctions, the Advisory Staircase and Quizzes all resolve against
  the level above. **A level holds only its changes, never a copy**, so an untouched row keeps
  receiving improvements from above automatically, and a row a level *has* edited is
  protected — the update is offered, never imposed.
- **The tab matrix is now explicit.** Every conditional tab names the tiers it appears at, in
  one place. It replaced three tabs gated on `scope !== 'mentor'`, a negative that would have
  switched them on at any new tier by accident, while `scope === 'firm'` silently switched
  another off.
- **The six role names are pinned by a test.** `tierVocabulary.test.js` fails the build if a
  superseded spelling appears anywhere in the source *or* in `design/`. Please use these exact
  values in the token: `mentor`, `global_group_manager`, `group_manager`, `firm_manager`,
  `advisor`, `business_entity`.

### 2. Reports roll up — every one of them

Ruled 2026-08-10: *information and tools cascade down so the tools are shared; the reports
cascade up so we learn what is working and who needs help.* **Each level sees the level
immediately below it, summarised** — never a flat roster of everything beneath.

Team Progress, Team Case Studies, Case Reviews, the Logic-Lab Report and the adoption view
all now resolve by tier. Case sharing remains **double opt-in** — the adviser shares to the
firm, and the firm manager separately approves an anonymised copy going further — and the
sentences a manager reads before approving now name the actual destinations ("your group
manager, your global group manager and Advisor-e") instead of saying "the mentor".

**One named exception:** Template Check is mentor-only, narrowed deliberately on 2026-08-11.

### 3. Template Check — the tools a logic table asks for that the app cannot open

A mentor-only screen that scans all 42 logic tables against the published catalogue and
lists every tool name the app could not serve. 65 of 88 rows are ruled; each row opens onto
the evidence it is judged from — the sentence, the branch with one above and one below, and
every candidate document with its purpose text.

**Alongside it:** 55 branches kept their instruction in a `recommendation` field the prompt
builder never read, so it reached the AI nowhere. It is now emitted **sentence by sentence**,
and any sentence naming a tool the catalogue cannot serve is held back — the 2026-08-04
ruling implemented rather than restated. 6,707 characters of instruction that previously
reached nobody now do.

### 4. 🔴 A save the database REFUSED is no longer reported as saved

**The most important line in this release for anyone testing against a real database.**

Every store has a dev fallback: when a query fails outside production, it writes a
gitignored `data/dev-*.json` file so the app is usable with no MySQL. Its only test was
`NODE_ENV !== 'production'` — so **any** failure was read as "there is no database",
including one where MySQL was present and had deliberately refused the write. The content
went to a scratch file and the screen reported success. Reads fell back to the same file, so
it looked entirely convincing.

In a UAT environment — not named exactly `production` — a tester could have exercised the
whole cascade, watched it work, and signed it off having proved nothing: the database was
never written to, and the file disappears on the next deploy.

Fixed by telling the two cases apart on `sqlState`, which only a live server's rejection
carries (`server/utils/dbFailure.js`). 14 files now ask it. **If you miss a reserved `firms`
row, you will now get an error instead of a false success.**

---

## Known limits — stated rather than discovered

- **The middle tiers cannot be demonstrated by logging in as one**, because no such login
  exists. They are evidenced by tests against a seeded membership map — a weaker claim than a
  live screen, and recorded as one.
- **No firm→group→global membership data.** The `firms` table has no country, group or parent
  column, so until Advisor-e supplies it, every firm's parent resolves to the mentor scope and
  the chain runs mentor → firm exactly as it did before. That is the safe direction to fail.
- **The Adviser Network tab cannot be tier-tested on a dev machine.** It goes through a
  different guard that does not recognise the dev tokens, so all four tiers return the same
  firm. Not known-broken — unproven.
- **The master export is gitignored.** `Central Frameworks/search_content_*.json` is not in
  the repo. Without it the ghost-reference validator returns no findings *by design*, so two
  tests in `ghostReferenceValidator.test.js` fail on a fresh clone. Copy the export in before
  believing any verdict.
- **Seven real tools are in neither template file**, so the app cannot serve them: Offshoring
  Review · Team AI (Familiarity) Tasks · Software Assessment Criteria · Client Service Stds ·
  Global Actions Report · Boardroom Manipulation Tactics · Enneagram Employment Questions.
  These are confirmed real documents — it is an **export gap**, and only the master app can
  close it.
- **`data/templates.json` (291 records) and the export (274 unique titles) disagree by 18
  titles.** Measured 2026-08-13: **no logic tree branch and no prose field references any of
  the 18**, so nothing routes an advisor to one of them today. Recorded because the
  availability gate validates against the mirror rather than the export, which would matter if
  one of those names were ever written into a tree.
- **One open engine defect:** a client situation can be detected as a firm-internal advisory
  area. The Logic-Lab accept now refuses to file into an area the firm cannot see, so the
  wrong turn no longer writes to the wrong place — but the detection itself is unfixed.

---

## Deployment

Per the Version-Pull Recording Rule, **record the pull in
[`DEPLOYED-VERSIONS.md`](DEPLOYED-VERSIONS.md) the moment it happens** — date, environment,
exact commit hash, who pulled it. A deployment is not complete until its row is written.

Pull the **tag**, not the branch: a tag is immutable, a branch keeps moving.
