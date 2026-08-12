# Collaborate → Firm Manager Hub — merge plan

**Written 2026-07-30 (laptop), branch `feat/advisor-progress`. Every slice below needs Mike's
approval individually (CLAUDE.md → LIVE-APP rule).**

> **STATUS (updated 2026-08-01): SLICES 1, 2 AND 4 ARE BUILT.**
>
> - **Slice 1** (`8215bec`, 2026-07-30) — Collaborate's code is in this repo under
>   `*/collaborate/`, wired to nothing.
> - **Slice 2 — ONE BACKEND** (2026-08-01) — the two Restify servers, the two
>   `config/integration.js` files and the two auth middlewares are now one each; Collaborate's
>   40 routes are registered on the single server and reachable through the Nuxt proxy.
> - **Slice 4 — THE TAB** (2026-08-01) — the manager console is the Firm Manager Hub's
>   **Adviser Network** tab (label ruled by Mike). Taken OUT OF ORDER, ahead of slice 3, on the
>   finding that the console reads Collaborate's own store and never touches
>   `firm_framework_versions` — so the storage re-key cannot make it need rework, and the
>   workstream stops being invisible. **View-as is deliberately withheld here** — see ACTIONS.
>
> Suites **212 / 3,486 green**, lint 0 errors, `nuxt build` green. ✅ **LIVE-VERIFIED by Mike
> 2026-08-01 on the running app** — *"collab firm manager page is in and works great"*. The
> backend was also confirmed answering both apps' routes from one process (`/api/health` and
> `/api/people/firm` both 200), which is what the mocked-Restify wiring test cannot show.
>
> **Slices 3, 5 and 6 are unbuilt and unapproved.** Full record, including the silent
> `~/`-alias trap from slice 1 and the translate-route fork found in slice 2, is in
> [`ACTIONS.md`](ACTIONS.md) → §Collaborate.

## 0. The owner's ruling that started this

**Mike, 2026-07-30:** Virt Advisor is the container for three features — **performance
reports**, **the AI section**, and now **Collaborate**. Collaborate's firm-manager page
becomes **another tab in the Firm Manager Hub**, and *"the code would then have to be merged
so that when the master coding team are pulling everything through, it all sits neatly."*

One repo, one pull, one Firm Manager screen.

---

## 1. What Collaborate is, and where it lives

A separate repository — **not** a branch of this one.

| | |
|---|---|
| **On this laptop** | `C:\Users\mb\Projects\Advisor Collaborate` |
| **GitHub** | `advisor-e/Colab` — *"A place for advisors to find others to work with on developing new content"* |
| **Branch / state** | `main`, clean, last commit `626da83` |
| **Suite** | **38 suites / 431 tests, all green, 99.72% line coverage** |

Its README calls it *"a standalone sibling of the Virt Advisor app, built to the same Stack
Constitution."* That is accurate, and it is the single biggest reason this merge is realistic.

### The firm manager view itself

[`components/shared/ManagerConsole.vue`](../../Advisor%20Collaborate/components/shared/ManagerConsole.vue)
(476 lines), reached at `/firm`. A firm manager can:

- see every adviser in their firm — searchable, with availability, group count, last active;
- set the **cross-org collaboration posture** (Open / Closed) — whether their advisers may
  link up with advisers outside the firm. *This is the accessibility control Mike described.*
- approve or decline advisers' requests to join specialty groups;
- **bulk-invite** ticked advisers into one of their groups;
- **view as** an adviser — see the app through their eyes;
- read an activity / audit feed for their scope.

---

## 2. The finding that sets the size of this job

**The manager page cannot come across on its own.**

Its six endpoints look modest, but three are **group** routes (`/my-groups`,
`/groups/:id/invite-many`, `/group-requests/:id/accept|decline`), and the page also reads
advisers, the activity feed and the audit log. The tab is a *window onto Collaborate's people
layer*, not a self-contained screen.

**So the work is: merge the Collaborate application into this repo, then surface its manager
page as a Hub tab.** Anyone quoting this as "move one component" will be wrong by an order of
magnitude. That is not an argument against doing it — it is the honest scope.

---

## 3. Why it is nonetheless a good merge

Verified, not assumed:

- **Identical stack.** Collaborate's `package.json` locks **Nuxt 2.14.0, Restify 9.1.0, Node
  14.15.x, Vue 2, Buefy + Bulma, vue-i18n 8, Vuex 3, mysql2** — this repo's Stack Constitution
  line for line. Same Pug templates, same Options API, same CommonJS backend.
- **Same login seam.** Both read `config/integration.js → AUTH`, verify a JWT with
  `jsonwebtoken`, take identity from the token and never from the request, and share the
  `sendApiError` error shape. Both carry the same fail-closed dev bypass idea.
- **The wording files barely clash.** 17 top-level sections here, 19 there, and **exactly one
  collides: `profile`.** A rename, not a reconciliation.
- **It brings its own safety net** — 431 tests at 99.72% line coverage, higher than this repo.
  The merge can be *proven*, not hoped.

---

## 4. The cascade — the platform spine, not a Collaborate feature

**Mike, 2026-07-30 (this is the governing model across every app that connects to Advisory):**

```text
Mentor  (Mike — creates the original document)
  └─ Global group manager
       └─ Group manager
            └─ Firm manager
                 └─ Adviser        ← a PASS-THROUGH, not an authoring level
                      └─ Client
```

A document is created once at the top and **clones down** through each level. Each level
receives its parent's version and may hold its own. The adviser is a pass-through — they
receive and use, they do not author a variant — and the client is the final recipient.

**Curator and coach are separate roles that do NOT clone documents,** so they sit outside this
chain entirely and are not part of the hierarchy question. Recorded so nobody tries to fit
them in.

**Mike's ruling on ownership: the hierarchy itself is the master coding team's to implement.**
Our job is to understand it and not design against it.

### The finding this produces — and it inverts the earlier recommendation

**The gap is in THIS app, not in Collaborate.**

- **Collaborate already models the whole chain.** `server/data/roles.js` declares
  `TIERS = ['mentor', 'global_group_manager', 'group_manager', 'firm_manager', 'advisor', 'client']`
  — Mike's list exactly, client included. Its cross-org **ceiling** is a working cascade
  already: a stricter level above caps what a level below may open.
- **Virt Advisor implements a TRUNCATED two-level version.** Content cascades
  *platform default (the `data/*.json` files) → firm override*, and the two middle tiers
  **have nowhere to exist**:
  - **Roles:** `config/integration.js` declares only `managerRole: 'firm_manager'` and
    `adminRole: 'platform_admin'` (with `mentorRole` pointed at `platform_admin` as an
    interim). No global-group tier, no group tier.
  - **Storage:** `firm_framework_versions` is keyed `(firm_id, config_key)` with `firm_id`
    FK-constrained to `firms`. **There is no column a global-group or group-level override
    could be written to.** Every firm-editable feature — Domain Support, Logic Tables,
    Advisory Distinctions, Quizzes — inherits that shape.

So the earlier recommendation ("confine Collaborate's levels to its own tab") was **wrong**:
it would entrench a model that is already missing two of the five authoring levels, in exactly
the screens the cascade is meant to feed.

> **Revised recommendation.** Adopt **Collaborate's tier vocabulary as the shared one** across
> the merged app — it is the platform-correct list and it already exists, tested. Do **not**
> build the cascade here; per Mike's ruling that is the master team's. What this repo should do
> is **stop hardcoding the two-level assumption** and name the seams clearly for them:
> the role list in `config/integration.js`, and the `firm_id`-only key on
> `firm_framework_versions`. Both are small, well-marked places — as long as nobody adds a
> third one during this merge.

### 4.1 The tiers are SELF-SIMILAR — ruled by Mike, 2026-07-30

> *"All of the functionality that you see at firm manager is simply repeated at group manager
> or global manager… The firm manager sees a summarised view of all the advisers. A group
> manager sees a summarised view of all the firm managers. A global manager a summarised view
> of all the group managers, and a mentor a summarised view of all the global managers. So
> there's no new functionality. It's just simply stubs… we can fix that bit up later on, but
> at least you've made room for it. That's the main thing."*

Two directions, one shape:

- **Documents cascade DOWN** — mentor authors, each level clones the level above.
- **Reporting rolls UP** — each level sees a summarised view of the level below.
- **Every tier is the same screen**, re-scoped. No new features per tier.

**Ruling: include the hierarchy in our coding. Stubs are acceptable. The requirement is to
make room for it, not to finish it now.**

### 4.2 For the people side, this is ALREADY BUILT — verified, not assumed

Collaborate did exactly this. Evidence:

- **One component, every tier.** `ManagerConsole.vue`'s own header: *"ONE component renders the
  console for EVERY manager tier; the backend returns the correctly-scoped payload… and this
  component labels itself from `c.scope.tier`."*
- **Production is a single page.** *"In production this URL does not exist — the single
  role-gated `/firm` page serves every tier based on the Advisory login."* The `/group`,
  `/global` and `/mentor` pages are **dev-only previews** so each tier can be seen without a
  real login — three files, four lines each, all rendering the same component.
- **The roll-up exists.** Firm tier gets the flat adviser table; higher tiers get a cascading
  tree (`ConsoleNode.vue`) — global group → country → firm → adviser. Stat tiles are chosen
  per tier (`mentor: globalGroups/groups/firms/advisers`, `group_manager:
  firms/advisers/pendingApprovals`, and so on).
- **Scope is re-derived server-side on every request**, never trusted from the client
  (`scopedActivity`, `repo.actorInScope`) — and they have already done the performance work so
  a higher tier does not ship every adviser (`PERF-CONSOLE-TREE`; advisers load lazily per node,
  paginated).

**So no stubs are needed for the Collaborate tab. The work Mike described is done and tested.**

### 4.3 Where the room still has to be made

The gap is **this repo's own Hub tabs** — Domain Support, Logic Tables, Advisory Distinctions,
Quizzes, Team Progress. Every one is firm-scoped with no notion of a level above, and the
override table has no column for one (§4). Under 4.1 each should eventually roll up the same
way: a group manager seeing a summarised view across their firms, and so on.

**Not to be built now.** What this merge must do is avoid adding a *third* place that hardcodes
"firm is the top". Concretely:

- New routes take scope from a resolved tier, not from a bare `firmId`.
- New storage is keyed on a scope that *could* be widened, rather than on `firm_id` alone.
- Where a stub is the honest answer, it says so on screen rather than showing an empty roll-up
  that looks like real data with nothing in it.

### 4.4 RULED (Mike, 2026-07-30) — build the hierarchy in properly, now

> *"Why would you create code that's gonna create a problem further down the track? If you need
> to leave room for the next two layers so that the code doesn't get confused, why would you do
> a shit job and cut it off now? Do it properly."*

**The seams are widened as part of this merge. Firm-as-top is not carried forward anywhere.**
The half-measure previously offered here (log it for the master team, leave the code narrow)
is withdrawn and must not be re-proposed.

**The timing evidence, which makes this cheap today and expensive later:**

**There is no data to migrate.** MySQL has never been provisioned — every firm-editable feature
runs on its dev-file fallback, and not one override row exists in any environment. So changing
the storage key costs a schema edit and nothing else. Once a real firm authors content against
a `firm_id`-keyed table, the same change becomes a live migration of their authored work. Doing
it now is the cheapest it will ever be.

**The truncation is concentrated, not scattered** — verified by reading it:

| Where | Today | Becomes |
|---|---|---|
| [`server/utils/firmOverlay.js`](../server/utils/firmOverlay.js) | 5 functions, every one `(firmId, configKey)` — load, save, version history, restore, and the cross-firm enumerator | `(scope, configKey)` where scope is `{level, id}` |
| [`server/utils/firmContent.js`](../server/utils/firmContent.js) | `_load(loadFirmConfig, firmId, key, devFile)` + 2 wrappers | the same, resolving a scope **chain** |
| `mergeEntry` → `deepMerge(base, override)` | a **two**-argument merge: platform default + firm | a fold over the chain — platform → global group → group → firm |
| `config/db-schema.sql` → `firm_framework_versions` | keyed `(firm_id, config_key)`, `firm_id` FK-constrained to `firms` | keyed `(scope_level, scope_id, config_key)`; the FK cannot survive, since a scope id may be a group or global group |
| [`server/middleware/firmAuth.js`](../server/middleware/firmAuth.js) | resolves `req.firmId` | resolves the caller's tier and their scope chain |

That is roughly **six functions and one table** — the whole two-level assumption lives there.
`deepMerge` already generalises: merging a chain is a reduce over the same function, not a new
algorithm.

> 🔴 **CORRECTION 2026-07-30 — THE TABLE ROW ABOVE FOR `mergeEntry` IS WRONG, AND SO IS THE
> WORD "fold" WHEREVER IT APPEARS IN THIS SECTION.** §4 of this same document says a document
> *"clones down through each level"*; §4.4 says the merge becomes *"a fold over the chain"*.
> Those are **different architectures**, and the contradiction is live: a plan built off the
> §4.4 wording was put to Mike on 2026-07-30 and he caught it.
>
> **The ruled model is neither pure clone nor pure layer — it is what Advisory Distinctions
> already does** (`server/utils/resolveDistinctions.js`): a row nobody has touched stays current
> with the mentor's edits automatically, and any row a level *has* edited is protected, with the
> mentor's update **offered** (*Adopt / Keep mine*) rather than applied. Clone-like protection
> where it matters, automatic freshness where it does not.
>
> **Ruled the same day: that mechanism becomes the single one used everywhere** — Domain
> Support, Logic Tables, Quizzes, the Staircase and the coaching reference all come up to it
> (Currency excepted: a single setting, not a list of rows). And **the sequencing reverses** —
> unify the mechanism at two levels first, then add the middle levels once, because extending
> one mechanism to five levels beats extending seven and merging them later. Full record and
> the taken inventory: [`ACTIONS.md`](ACTIONS.md) → §Collaborate.
>
> **Slice 2 in §5 is also overtaken** — see the ownership correction in `ACTIONS.md`: login,
> roles and the hierarchy belong to Advisory.com, so this repo never determines a tier and must
> never invent role-value names. What survives is two lines inside the storage work.

**Design rules that follow, binding on every slice below:**

1. **No new code takes a bare `firmId` as its scope.** A route resolves a tier and a scope; a
   firm is one possible value, never the assumed one.
2. **Resolution walks the chain** — platform default → global group → group → firm — and a
   level with no override is simply absent from the fold, not an error.
3. **A tier with nothing to show says so.** An empty roll-up and a broken one must never look
   alike. This workstream already spent a day removing exactly that confusion from My Progress
   (`.catch(() => [[]])`); it is not to be reintroduced one level up.
4. **Adviser is a pass-through and client is a recipient** — neither is an authoring level, so
   neither gets override storage.

### Already ruled — do not re-open

- ✅ **View-as is NOT treated as a significant risk (Mike, 2026-07-30).** The concern raised was
  that Collaborate's view-as cookie travels on every request, so a manager could in principle
  land a CPD claim on a colleague's record. **Mike's ruling: the exposure is negligible,
  because the adviser generates and submits their own CPD report and would see it.** Accepted.
  *One cheap, non-restricting suggestion offered and still open: stamp each claim with who was
  signed in when it was made, so a stray entry can be explained rather than argued about.*

---

## 5. Suggested order of work

Slice 1 is approved and built; **slices 2–6 are not approved.** Each slice is separately
approvable and separately provable.

| # | Slice | Why this order |
|---|---|---|
| 1 | ✅ **DONE 2026-07-30 (`8215bec`) — brought the code across, wired to nothing.** Landed under `*/collaborate/` rather than "their own names", because 8 paths collided with ours and 4 of those differ; namespacing meant **zero edits to our files** (bar one `.gitignore` exception line). Their 14 pages landed as **components**, not in `pages/`, so no URL became reachable. The `profile` locale clash never arose — their wording file landed whole at `locales/collaborate/en.json`. Scope was wider than this row assumed: getting their 431 tests green also needed their pages, both mixins, `config/integration.js`, `server-middleware/api.js` and 2 scripts. | Both suites must go green in one repo *before* any behaviour changes. If this slice is hard, everything after it is harder. |
| 2 | ✅ **DONE 2026-08-01 — ONE BACKEND, ONE DOOR.** The identity shapes are reconciled (`attachIdentity` sets `req.identity` **and** the flat `req.firmId`/`req.userRole` from one verified token) and the two servers, configs and auth middlewares are one each; Collaborate's 40 routes are registered and proxied. **The tier-vocabulary half of this row was already withdrawn** by the ownership correction in `ACTIONS.md` — login, roles and the hierarchy are Advisory.com's, so this repo never determines a tier and must not invent role names. What remained was the plumbing, and it is done. | Everything downstream reads scope. Getting this right once is what stops firm-as-top being re-introduced by accident. |
| 3 | **Widen the override storage to scope-keyed — while there is still no data.** `firm_framework_versions` becomes `(scope_level, scope_id, config_key)`; the `firms` FK goes; the 5 `firmOverlay` functions and `firmContent`'s loader take a scope; `mergeEntry` becomes a fold over the chain (platform → global group → group → firm). | §4.4: no override row exists anywhere, so this is a schema edit today and a live content migration later. Do it before anything authors against the old shape. |
| 4 | ✅ **DONE 2026-08-01 — the "Adviser Network" tab.** `ManagerConsole.vue` gained an `embedded` prop (drops the page frame, the banner and the dev tier-switcher); `components/firm/FirmAdviserNetwork.vue` wraps it in the Hub's own style; Collaborate's wording is joined to ours at `plugins/i18n.js` through a merge that **refuses a section-name collision** rather than letting one file silently win. **The stated reason for putting this after slice 3 does not hold** — read, not assumed: the console fetches only `/api/people/*`, served from Collaborate's own store, and never touches `firm_framework_versions`, so the storage re-key cannot make it need rework. Doing it now ends four sessions of invisible work. | ~~Lands on correct foundations rather than needing rework.~~ Superseded: there was no dependency to wait for. |
| 5 | **Reconcile the two data layers.** Collaborate's `repository.js` is entirely in-memory and resets on restart — deliberately built as a one-file MySQL seam. This repo uses MySQL-with-a-dev-file-fallback. Neither has a real database yet. | Two half-built data layers, no working one to preserve. Best done knowingly, not by accident. |
| 6 | **One handover story for the master team.** Collaborate's `START-HERE.md` and `HANDOVER.md` currently describe a standalone app. After the merge they describe a section of this one — including the widened scope model, so the master team builds the tiers above onto it rather than around it. | See §6. |

**Slices 2 and 3 are the "do it properly" ruling made concrete.** They are not optional and
they do not get deferred to the master team.

---

## 6. Risks, stated plainly

1. **This cuts across an in-flight handover.** Collaborate's last three commits are a
   master-team handover checklist and pre-handover security fixes. That repo is being packaged
   *right now* as a standalone deliverable with isolated integration seams. Merging changes
   what the master team has been promised. **Mike's ruling is that one neat pull is the goal —
   so the handover docs must be rewritten as part of the merge, not left to contradict it.**
2. **Two `config/integration.js` files, two `db-schema.sql` files.** Both will need merging,
   and both are auth/security surfaces. Slow, careful work — not a copy-paste.
3. **The existing tabs inherit a scope model they were not written for.** Domain Support, Logic
   Tables, Advisory Distinctions and Quizzes all assume firm-as-top. Slices 2–3 change the
   ground beneath them. **This is deliberate and ruled (§4.4) — but it means those tabs' tests
   are the safety net for the change, and any that pass a bare `firmId` around must be read,
   not just made to compile.** Behaviour for a firm-level user must come out byte-identical:
   that is the acceptance test for slice 3, and the same discipline that proved the Phase-0
   firm-content overlay (`firmContent.test.js` cross-firm leak tests).
4. **Nothing here is provable by eye until slice 3.** Slices 1–2 are provable only by the test
   suites. Say so rather than implying a working screen.

---

## 7. Related, deliberately NOT in this plan

- ☐ **CPD record must be exportable as a PDF** (Mike, 2026-07-30) — the adviser sends it to
  their accounting society. **This is its own task, not part of the merge.** Groundwork already
  checked: this app has **no PDF dependency and needs none** — six screens (Business
  Performance, Debtor Drag, Margin Breakeven, EBITDA-DCF, Quick Position, Course Builder)
  already export by `window.print()` behind a Download button plus an `@media print`
  stylesheet, and `MarginBreakevenReport.vue` names the method `downloadPdf()`. Following that
  established pattern avoids a real PDF library, which would be a fight on locked Node 14.15
  (most need Node 18+). **Honest limit:** the browser makes the PDF and the adviser saves it —
  there is no server-side copy of what was sent, and layout depends on their browser. If the
  society ever needs a document the firm can vouch for independently, that is a much bigger
  job. Per [[mike-scope-instructions]], the CPD export should follow the six existing screens'
  pattern rather than invent a new one.
