# Session Notes — 2026-08-12 · Laptop, Session 46

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,033 green / 295 suites**, lint 0 errors, **51 ahead / 0 behind `master`**, and
> **pushed** — local and `origin` are both at `a0770bb`.
>
> ⚠ **A BACKEND RESTART is needed** wherever the app runs — three routes and two utils
> changed. A running Restify process holds the old code.
>
> ⚠ **The dev server now answers on `localhost`, NOT `127.0.0.1`.** That is deliberate; see
> the address section below before "fixing" it.

---

## 🔴 THE ONE THING TO READ — a ruling shipped only its visible half, and the safety net hid it

Team Progress and Team Case Studies were **ruled to roll up on 2026-08-10**
([`ADVISOR-E-DESIGN-LOGIC.md`](ADVISOR-E-DESIGN-LOGIC.md) §4.2). Their **tabs were added** at the
global and group tiers. **The routes behind them were never changed** — each matched `firm_id`
exactly, so a country scope like `__group__:Advisor-e:DE` matched no row and a manager got an
empty list.

**Why nothing caught it, and this is the reusable part.** While no firm was mapped to a middle
tier, `isAwaitingFirms` was true and the screens honestly said *"not connected yet"*. The
emptiness was **indistinguishable from correct behaviour** — and no test can assert what a tier
with no members should show. The guard worked only because the mapping was empty.

The moment this session seeded dev membership, the banner stopped firing and the same empty list
began saying:

> *"No shared case studies yet. When an advisor shares a case, it appears here for review."*

to a group manager whose advisers had shared **three** — visible **on the same screen**, in the
Case Reviews tab. §4.4 records this family of mistake twice before.

🔴 **The seeding did not cause this. It brought forward a fault already waiting for the day the
master team supplies real membership.**

**What each tier gets now:**

| | Team Case Studies | Team Progress |
|---|---|---|
| Firm manager | its advisers' shared cases, **full text** | its advisers **by name** |
| Group manager | 3 cases, grouped by **firm** | Hamburg · Munich · Berlin |
| Global group manager | 7 cases, grouped by **country** | AU · UK · DE |
| Mentor | 10 cases, grouped by **brand** | *(not shown at mentor)* |

Quietest group sorts **first** — §2 is *"who is failing so we can offer help"*.

Commit `fe2e87c`. Row: [§team-reports-rollup](ACTIONS.md#team-reports-rollup).

---

## The consent gate is what makes rolling cases up safe

The old hub comment argued Team Case Studies must stay firm-only because *"rolling this tab up
would have walked past that consent gate"*. **That objection was right, and is now answered rather
than ignored.**

Above the firm the route reads **`listSharedWithMentor`**, never `listSharedForFirm`. The
adviser's decision to share with their firm is **not** the firm manager's separate decision to send
it further; reading the raw set would have carried un-anonymised client text past a gate no human
opened. Pinned by [`teamRollup.test.js`](../tests/unit/teamRollup.test.js).

**No adviser is named above the firm** — the new store read selects no `advisor_id` or
`advisor_name` **at all**, so there is nothing to filter and nothing to leak. Firm names *are*
shown: §4.3 is explicit that naming a firm to the manager above it is not a disclosure.

The mapping moved to [`caseRollup.js`](../server/utils/caseRollup.js) rather than being copied —
two versions would drift and nothing would say so, the same reason `toolNameScan` was extracted.
🔴 **A conflict there is resolved by keeping the import, never by restoring a local copy.**

---

## The test data: 27 firms, and why the middle hubs were empty without it

`setFirmMembership` was **called only from tests** — nothing in the running app had ever filled the
membership map, so both middle hubs could never show anything, whatever data existed.

Added, all DEV/TEST ONLY and gated on `NODE_ENV !== 'production'` **AND** `ALLOW_DEV_AUTH === 'true'`
— deliberately the same condition that admits the dev tokens, because those are the only identities
that can reach either hub:

- [`data/dev-firms.json`](../data/dev-firms.json) — 27 invented firms, **3 brands × 3 countries × 3
  firms** (Advisor-e / BDO / Lindt & Co). Also fills a file `firmsDirectory.js` had always looked
  for and never found, which is why Adoption printed the raw id `dev-firm-001` as a firm name.
- [`data/dev-firm-membership.json`](../data/dev-firm-membership.json) — brand + country per firm.
- [`server/utils/devFirmMembership.js`](../server/utils/devFirmMembership.js) — loads it once at
  boot, **announces itself on the console**, and drops malformed rows rather than defaulting them.

🔴 **Why the gate is double.** Membership decides the **storage scope** a manager's saves resolve
to. A seeded map in force in a real deployment could write one firm's edits into a whole country's
scope, and every firm in that country would inherit them — the precise accident the fail-closed
tier design exists to prevent. Most of its 8 tests prove it **refuses to run**, not that it runs.

⚠ **The sample sessions and case studies do NOT travel.** They live in `data/dev-activity.json` and
`data/dev-cases.json`, both **gitignored** because the app writes to them. Another machine gets the
firm structure and the membership map, but **not** the activity behind it — the hubs will look
emptier there until it writes its own.

---

## The address problem cost most of this session, and the lesson is one sentence

All three hubs sat spinning in the browser while **every command-line check returned 200.**

- **First fault:** the server was pinned to `127.0.0.1`, but `ping localhost` on this machine
  answers **`::1`**. The browser asked for IPv6 and was refused. The old config comment asserted
  that binding IPv4 is *"what every browser tries first"* — wrong here, and unchecked since the
  identical failure was fixed in the **opposite** direction on 2026-07-21.
- **Second fault, self-inflicted:** binding `'::'` (all interfaces) served both names and broke it
  worse — the dev server stopped being a loopback service, the local security software began
  filtering it, and the browser hit `ERR_CONNECTION_RESET` on API calls and on the HMR and
  loading-SSE streams. The server's own log named it: `[api-proxy] backend error: read ECONNRESET`.
- **Fix:** `host: '::1'` — loopback only, on the address the browser actually asks for.
  **`http://127.0.0.1:3000` no longer answers, deliberately.**

🔴 **CURL IS NOT THE BROWSER.** It falls back to IPv4 when IPv6 refuses, so `curl
http://localhost:3000` returns 200 against an IPv4-only bind and **proves nothing**. That 200 was
read as proof twice in one session. Check both stacks explicitly — `curl -g http://[::1]:3000` and
`curl http://127.0.0.1:3000` — never the name alone. Written into the config comment so it is not
rediscovered a third time.

⚠ **Headless Chrome and headless Edge both hang outright on this machine**, so a page cannot be
rendered from the command line here. Do not burn time on it; ask Mike to open a **private window**,
which is what finally settled it.

---

## ⚠ Three things a future session should not take on trust

**1 · The Adviser Network tab CANNOT be tier-tested on a dev machine, and a design doc calls it the
model for the rest.** All four tiers return an identical payload — the same fixed firm, labelled
`firm_manager` — because that tab goes through `collaborateAuth`, which expects a real signed JWT,
does not recognise the firmAuth dev tokens, and falls through to one fixed `DEV_IDENTITY`. **This is
not evidence of a production bug**; it is evidence that nobody can check. §4.2 records that tab as
*"✅ Already rolls up… The working model for the rest"* — **that tick is unverified**, and this
session's roll-up work deliberately copied nothing from it, reusing `originPathOf` instead.
→ [§adviser-network-untestable-locally](ACTIONS.md#adviser-network-untestable-locally).

**2 · Adviser counts in the roll-up were wrong in the first version, and both wrong ways are now
pinned by test.** Rows arrive per firm+tier **and** per table, so one adviser appears several times:
summing every row inflates a firm, and taking a single maximum across a country discards whole firms
(Germany read **2** when Berlin alone had 2 and Munich and Hamburg added more). It now de-duplicates
**within** a firm and adds **across** firms — Germany reads **4**. It remains an estimate where one
person works at two firms; only the adoption view solves that exactly, with a UNION.

**3 · Five labels were written WITHOUT Mike's ruling**, against the wording rule in `CLAUDE.md`.
**Level**, **Advisers**, **Avg Quiz**, "{n} firms" and the roll-up legend, in
[`locales/en.json`](../locales/en.json) under `firmTeamProgress`. They are logged so they cannot
become "approved by use" → [§rollup-labels-unruled](ACTIONS.md#rollup-labels-unruled).

---

## ☐ Open for Mike

- ☐ **Rule the five roll-up labels** (above). Strings in a locale file — free to change.
- 🔴 **Rule the 88 Template Check rows.** *(Carried from session 45 — it releases the 14 branches
  whose instruction the prompt still withholds.)*
- ☐ **Decide `advisor_note`** — a dropped instruction on one node. *(Carried 45.)*
- ☐ **Decide whether `action` and `notes` should be gated too** — recommendation remains **no**.
  *(Carried 45.)*
- **Decide the mentor +2 / firm +3 tabs** the §2 matrix implies. *(Carried 42–45.)*
- **Ask the master team for the two role values + which group a manager manages.** ⚠ The values
  changed name on our side: `global_group_manager`. *(Carried 39–45.)*
- **Reply to Carl about `npm install`** — v0.7.0 adds `@mdi/font`. *(Carried.)*
- **Raise the export gap with the master-app team — SEVEN tools.** *(Carried.)*
- **51 commits sit unmerged on this branch.** 🔴 **Mike ruled 2026-08-11: no PR to `master` until
  the task list is clear.** Known and accepted — do not re-raise. The branch **is pushed**, so the
  work is backed up without going near `master`.

---

## On conflicts

**Shared files touched this session** — the desktop should merge `master` before going near any:

- [`server/routes/activity.js`](../server/routes/activity.js) — new `getTeamRollup`
- [`server/routes/cases.js`](../server/routes/cases.js) — `listFirmCases` is now tier-aware
- [`server/routes/mentor.js`](../server/routes/mentor.js) — its `firmNameMap` + origin mapping were
  **removed** and are now imported; 🔴 a conflict here is resolved by **keeping the import**
- [`server/utils/activityStore.js`](../server/utils/activityStore.js) — new `readSessionsUnderScope`
- [`server/utils/caseRollup.js`](../server/utils/caseRollup.js) — **new file**
- [`components/FirmManagerHub.vue`](../components/FirmManagerHub.vue) — `loadDomains` now imports
  instead of fetching; `caseAdvisorLabel` shows the origin above the firm
- [`components/firm/FirmTeamProgress.vue`](../components/firm/FirmTeamProgress.vue) — roll-up table
- [`locales/en.json`](../locales/en.json) · [`nuxt.config.js`](../nuxt.config.js)

🔴 **`nuxt.config.js` `host` is `'::1'` on purpose.** If the desktop's browser cannot reach the dev
server, the answer is **not** to revert it blindly — read the comment first; the right value depends
on what that machine's `localhost` resolves to.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's**; nothing here went near
them.

## Commits

- `965a7f9` — the 27 test firms, the membership map, the dev-only loader and its 8 tests
- `2dffcb2` — the dev-server loopback binding
- `fe2e87c` — both roll-ups, the shared `caseRollup`, the `domains.json` double fault, 10 tests
- `a0770bb` — the record catches up
