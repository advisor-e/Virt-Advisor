# Session Notes — 2026-08-11 · Laptop, Session 43

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **4,946 green / 289 suites**, lint 0 errors, **41 ahead / 0 behind `master`**, level with the
> remote at `18221c2`.
>
> **Part 5 is BUILT. The `tier-hub-pages` P1 is now complete on our side** — what remains is the
> master team's, and it cannot be closed here.

---

## 🔴 THE ONE THING TO READ — the guard read the role, and two tiers shared one role value

Case Reviews, Adoption and the Logic Lab Report were mounted behind `requireMentorRole` — a check
on the **role string**. But `AUTH.mentorRole` and `AUTH.adminRole` are the **same value**,
`platform_admin`, because Advisor-e has never issued a mentor role and the mentor borrows the admin
one.

So that guard could not tell a mentor apart from anything else carrying that value — and the dev
sign-ins for the two new middle hubs carry exactly it.

**Opening a Group Manager Hub returned every brand's cases, activity and configuration into one
group manager's screen.**

Nothing errored. No test failed — because **every existing test called those handlers as the
mentor**, for whom "everything" is the correct answer. The fault lived entirely in the question
nobody had asked yet: *what should a tier that is not the mentor see?* Same family as session 42's
negative condition, one layer down: there, a rule stopped meaning what it said when the world grew;
here, a rule was checking a fact that had never been able to distinguish the thing it was asked to.

Reachable only in development today, since no real token can carry a middle tier. It is the code
path that goes live when one can.

**The fix is two controls, not one:**

| | Where | Decides |
|---|---|---|
| `requireManagingTier` | [`firmAuth.js`](../server/middleware/firmAuth.js) | **who may ask** — reads the RESOLVED SCOPE, not the role |
| `isWithinScope` | [`tierChain.js`](../server/utils/tierChain.js) | **what comes back** — per row, in each handler |

`isWithinScope` is expressed with `scopeChain`, which is why the mentor matches **every** firm (its
three reports are unchanged) and a middle tier with no membership matches **none**. Empty is
recoverable; another brand's data is not.

`caseStore.listSharedWithMentor()` — the flat `SELECT … WHERE mentor_shared = 1` that session 42
flagged — **now takes a scope**, and the dev fallback filters identically, so the two can never
disagree.

---

## Step 2 — five blank panels that each said "nobody is using it"

Step 1 made every middle-tier report correctly empty. **Empty was where the problem started.** A
blank panel in front of a brand's own senior manager *states that their firms are not using the
app*. That is false: no firm has been **put** beneath them yet.

[`TierNotConnected.vue`](../components/base/TierNotConnected.vue) shows the approved sentence, word
for word from the artefact's §4 table. No second explanatory line was invented — wording is Mike's
to rule.

🔴 **The screen is TOLD, it does not infer.** `tierChain.isAwaitingFirms` answers on the backend and
rides each payload as `awaitingFirms`. A component could reach the same answer today by asking "am I
a middle tier?" — and would be right until a mapping arrives, then keep apologising for firms that
**are** connected. Only the backend knows what the mapping holds.

It sits beside the adoption page's existing `directoryRead` flag and is a **different** statement:
*"the list we can read is short"* is not *"there is nothing to read yet"*. Both survive.

Not an error (`is-info` — nothing failed), and it **replaces** the misleading empty state rather
than sitting above it. Both at once would still tell a manager their firms are idle.

---

## 🔴 Mike's ruling — Template Check is MENTOR ONLY

> *"remove the template check from the group manager and global group manager page. template check
> should only be for the mentor since we use it to improve the overall system. it does not relate to
> people/advisor performance or group manager selection/access permission to templates."*

The one named exception to "every report rolls up" (2026-08-10). It is also the only report with
**no firm dimension** — it scans the shared master catalogue, so there is nothing beneath a group
for it to show. Its four routes never moved; the tab came off both middle hubs, now **12 tabs, not
13**.

⚠ [`hubTabTiers.test.js`](../tests/unit/hubTabTiers.test.js) **asserts the exception** rather than
dropping Template Check from the roll-up loop. An exception deleted from a list looks identical to
one never considered.

---

## ⚠ Three things a future session should not take on trust

**1 · The previous handover's description of this bug was wrong.** It said all six reports "render
empty". Only **two** did. The other four returned the mentor's full cross-brand data — the opposite
of empty, and a worse fault. Corrected in `ACTIONS.md` in place, struck through rather than deleted.
*A handover note describing a symptom is a claim to re-check against the code, not a diagnosis to
build from.*

**2 · "The whole suite passed unmodified" does NOT hold for part 5.** Three existing tests were
edited. They called the handlers with `{}` — a request no route can receive, since `firmAuth`
refuses a token with no firm claim — so the empty object stood in for "the mentor" by accident
rather than by statement. Every expectation is unchanged; only the identity is now supplied, plus
one tripwire that quoted the old guard by name. A weaker proof stated is worth more than a stronger
one implied.

**3 · Pug templates are not exercised by the suite.** Step 2 altered `v-if`/`v-else` chains on two
screens **already live in UAT**, so all six changed templates were compiled by hand through `pug` +
`vue-template-compiler`. A broken chain passes every unit test and fails at build. Worth repeating
on any future template-shape change.

---

## ☐ Open for Mike

- **The `firmId` in the Case Reviews feed.** `caseStore.rowToMentorCase` carries `firmId` into the
  payload, so the feed names the firm each anonymised case came from — against what the design
  record says that screen is (*"anonymised, no adviser, no firm, read-only"*), and never read by
  [`MentorReview.vue`](../components/MentorReview.vue). **Pre-existing**, not introduced by this
  work; removing it changes what the mentor's live screen receives, so it is his call. Pinned by a
  test asserting today's behaviour, so it cannot change quietly in either direction.
- **Rule the wording** in [`WORDING-CASE-SHARE-CASCADE.md`](WORDING-CASE-SHARE-CASCADE.md). It
  waited on part 5 by his own instruction — *"we do the labels last when we are certain what the
  button or section performs"* — and **part 5 is now done**, so it is unblocked.
- **Decide the mentor +2 / firm +3 tabs** the §2 matrix implies for the two hubs already live in
  UAT. Raised, not built. *(Carried from session 42.)*
- **Ask the master team for the two role values + which group a manager manages** — §5 of the hub
  artefact is written so it can be sent as it stands. ⚠ **`mentor` was never added either.**
  *(Carried from sessions 39–42.)*
- **Rule the 93 Template Check rows** — the queue stays empty until he does. *(Carried.)*
- **Reply to Carl about `npm install`** — v0.7.0 adds `@mdi/font`. *(Carried.)*
- **Raise the export gap with the master-app team — SEVEN tools.** *(Carried.)*
- **Decide on the `/startup` change** in
  [§approved-mockup-stranded-on-a-branch](ACTIONS.md#approved-mockup-stranded-on-a-branch).
  *(Carried.)*
- **41 commits sit unmerged on this branch.** None of this is visible to the desktop or the master
  team until a pull request lands.

---

## ⛔ What is left on this row is NOT ours

The reports **already fill themselves** from the membership map — `firmsUnderScope` and
`isWithinScope` both read it — so the day real data lands, every report populates and every notice
clears **with no code change**.

But **nothing calls `setFirmMembership`**. The only definition and the only export are in
`tierChain.js` itself; no route, no startup path, no seed populates it. Same blocker as the reserved
`firms` rows: the `firms` table has no group or country column, and no JWT carries the two claims.
Instructions are already in [`config/db-schema.sql`](../config/db-schema.sql), the control at the
point of use.

---

## On conflicts

**Shared files touched this session** — the desktop should merge `master` before going near any of
them:

- [`components/FirmManagerHub.vue`](../components/FirmManagerHub.vue) — the Hub both divisions use
- [`server/middleware/firmAuth.js`](../server/middleware/firmAuth.js)
- [`server/utils/tierChain.js`](../server/utils/tierChain.js)
- [`server/routes/mentor.js`](../server/routes/mentor.js) · [`activity.js`](../server/routes/activity.js) · [`cases.js`](../server/routes/cases.js)
- [`server/utils/caseStore.js`](../server/utils/caseStore.js) · [`server/restify-server.js`](../server/restify-server.js)
- [`locales/en.json`](../locales/en.json) — one new key group, `tierNotConnected`

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's**; nothing here went near
them. `ACTIONS.md` is where a conflict would land, as always.

⚠ **A backend restart is needed** wherever the app runs — these are route and middleware changes,
and a running Restify process holds the old code.

## Commits

- `01c8fcf` — step 1, the guard and the scoping
- `18221c2` — step 2, the honest empty state
