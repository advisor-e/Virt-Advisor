# Session Notes — 2026-08-11 · Laptop, Session 42

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **4,894 green / 285 suites**, lint 0 errors, **38 ahead / 0 behind `master`**, level with the
> remote at `84ead41`.
>
> **The `tier-hub-pages` build is parts 1–4 DONE, part 5 OPEN.** Session 41 handed it over
> approved and not started; it is now built, tested and pushed.

---

## 🔴 THE ONE THING TO READ — the negative condition was the whole job

Three tabs were gated on `scope !== 'mentor'`. That rule was written when `firm` and `mentor`
were the only two scopes, and **it is a rule expressed as a negative**: the moment a third
scope exists it is true for it.

Adding `global` and `group` would have, on their own:

- switched **Team Progress** and **Team Case Studies** ON at both new tiers, and
- made **Advisory Distinctions** — gated on `scope === 'firm'` — **vanish** from them.

**Nothing would have errored. No test would have failed**, because no test can assert what a
scope that does not yet exist should show. This is why part 2 went first, before either page
existed.

The fix is [`TAB_TIERS`](../components/FirmManagerHub.vue): one matrix, every tab naming its
tiers **positively**, and nothing in the template reading `scope` directly any more. A fifth
tier one day shows up as a tab that is *missing* — visible — rather than one that appears
uninvited.

---

## What was built

| Part | State | Where |
|------|-------|-------|
| 2 · tab conditions name their tiers | ✅ | `TAB_TIERS` in [`FirmManagerHub.vue`](../components/FirmManagerHub.vue) |
| 1 · the two pages | ✅ | [`global-group-manager.vue`](../pages/global-group-manager.vue), [`group-manager.vue`](../pages/group-manager.vue) |
| 3 · scope resolved once at login | ✅ | `tierStorageScope` in [`firmAuth.js`](../server/middleware/firmAuth.js) |
| 4 · fail closed | ✅ | empty roles in [`config/integration.js`](../config/integration.js) |
| 4 · the reserved `firms` row | ❌ blocked | no group names supplied — see below |
| 5 · the six reports made tier-aware | ☐ **next job** | see below |

`mentorStorageScope` became `tierStorageScope` — the **same single choke point**, now covering
four tiers rather than two. A manager whose token does not name their group is **refused
(403), never defaulted**: a guessed brand files one customer's content under another's.

Fail-closed is real, not a comment. `AUTH.globalManagerRole` and `AUTH.groupManagerRole` are
**empty strings**, and an empty configured role matches nothing — so a `platform_admin`, the
most privileged role that exists, is refused at both pages.

### The proof that neither live hub moved

[`hubTabTiers.test.js`](../tests/unit/hubTabTiers.test.js) pins the firm at **9** tabs and the
mentor at **11**, listed by name and read out of the component at `2d38c60` — *before* the
middle tiers existed. **The entire pre-existing suite passed unmodified**, including all 31
`firmAuth` tests. Same safety pattern as session 39's tier-chain seam: demonstrated
behaviour-preserving, not asserted to be.

Also added: [`tierStorageScope.test.js`](../tests/unit/tierStorageScope.test.js) — the
*refusals* are the tests that matter — and
[`tierManagerPages.test.js`](../tests/unit/tierManagerPages.test.js), which is the only
demonstration these pages work at all, since nobody can sign in to open them.

### ⚠ Coverage nearly regressed, and the fix is the precedent

The new branches took `server/middleware/` from **100% to 95.3%**, which would have failed the
pre-commit gate. Fixed by **testing the branches, never by lowering the threshold** —
`jest.config.js` says *"nothing in this file may regress"* and it meant it.

---

## 🔴 What is still open, and one of it is a live gap

**Part 5 — the six reports are not tier-aware.** Open a middle-tier hub today and the report
tabs **render empty**, which reads as *"nobody is using it"* rather than *"not connected
yet"*. That is against §4.4 of the artefact — Mike's own standing rule that where a stub is
the honest answer, it says so on screen. **This is the next piece of work.**

**The reserved `firms` row per group still cannot be created**, because nobody has supplied
the group names. ⚠ **It has a live edge now:** the dev sign-ins resolve to
`__global__:Advisor-e` and `__group__:Advisor-e:DE`, which have **no row in `firms`** — so a
save at either scope is foreign-key rejected **while the dev fallback reports success**. That
is exactly the trap that ran the mentor's own saves broken for weeks. It bites a developer
locally, not a customer.

---

## Two rulings from Mike, and they govern more than they look like

> **"every level at once — follows the cascade up"**

> **"it needs to stay in their channel — only firms data that are member of that group
> (country) goes to that group manager. only group managers aligned with the global group
> manager above report"**

One share, no second consent step — and **strictly own-branch**. A firm's material rises
through its own country group to its own brand, and never crosses to another brand or
country.

**Why it came up.** Switching Case Reviews on at two more levels meant reading
[`caseStore.listSharedWithMentor()`](../server/utils/caseStore.js), which is a **flat
`SELECT … WHERE mentor_shared = 1` with no scope argument at all** — correct for the mentor,
who is meant to see everything, and a cross-brand leak at any tier below. Ruling 2 closes it;
the scope argument is part-5 work.

⚠ **Team Case Studies and Case Reviews are NOT duplicates.** Team Case Studies is the firm
looking **down** at its own advisers — named, un-anonymised, full trace, and it carries the
*Share* action. Case Reviews is what that button produces: anonymised, no adviser, no firm,
read-only. **One feeds the other.** A future session should not tidy either away.

---

## ☐ Awaiting Mike — the wording

[`WORDING-CASE-SHARE-CASCADE.md`](WORDING-CASE-SHARE-CASCADE.md) (committed `8b8926d`). Nine
sentences tell a firm manager they are sharing *"with the mentor"*, including the one they
read immediately before clicking approve. Seven are on a screen already in UAT; the other two
are [`MentorReview.vue`](../components/MentorReview.vue)'s hardcoded *"Mentor — Case
Reviews"* — the component a **group** manager's tab renders.

**Parked by instruction, not by neglect.** Mike, 2026-08-11: *"as you develop the wiring to
serve the functionality the names will become more evident. we do the labels last when we are
certain what the button or section performs."* So it waits on part 5.

---

## ⚠ The artefact disagrees with itself — read §2, not §1

[`mockups/tier-hub-pages.html`](mockups/tier-hub-pages.html) draws the new hubs with **8**
tabs in §1 and ticks **13** in the §2 matrix. §1 predates the correction Mike made on the day
and is **stale** — §2 governs, and 13 is what was built.

⚠ **§2's own caption is also wrong.** It says *"Mentor and Firm columns are what exists today
and are not being changed"*, but five cells in those columns carry the **new** badge: the
mentor would gain 2 tabs and the firm 3. That follows logically from "every report rolls up",
but it means changing two screens that are **already live in UAT**. **It was raised with Mike
and is NOT built** — the two new hubs were built at 13 tabs and the existing two left exactly
as they were. Still his decision to make.

---

## On conflicts

**Three shared files were touched** and the desktop should merge `master` before going near
any of them:

- [`components/FirmManagerHub.vue`](../components/FirmManagerHub.vue) — the Hub both divisions use
- [`server/middleware/firmAuth.js`](../server/middleware/firmAuth.js)
- [`config/integration.js`](../config/integration.js)

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's**; nothing here went
near them. `ACTIONS.md` is where a conflict would land, as always.

## Open for Mike

- **Part 5 — the reports.** The next job, and the empty-vs-honest gap above is inside it.
- **Rule the wording** in [`WORDING-CASE-SHARE-CASCADE.md`](WORDING-CASE-SHARE-CASCADE.md) —
  *after* part 5, by his own instruction.
- **Decide the mentor +2 / firm +3 tabs** the §2 matrix implies for the two live hubs.
- **Ask the master team for the two role values + which group a manager manages** — §5 of the
  hub artefact is written so it can be sent as it stands. ⚠ **`mentor` was never added
  either.** *(Carried from sessions 39, 40 and 41.)*
- **Rule the 93 Template Check rows** — the queue stays empty until he does. *(Carried.)*
- **Reply to Carl about `npm install`** — v0.7.0 adds `@mdi/font`. *(Carried.)*
- **Raise the export gap with the master-app team — SEVEN tools.** *(Carried.)*
- **Decide on the `/startup` change** in
  [§approved-mockup-stranded-on-a-branch](ACTIONS.md#approved-mockup-stranded-on-a-branch).
  *(Carried.)*
