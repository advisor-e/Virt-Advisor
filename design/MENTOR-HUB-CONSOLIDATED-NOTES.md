# The Mentor Hub — every note, pulled together

**Status:** CONSOLIDATION ONLY — awaiting Mike's confirmation that it is complete and correct.
**Written:** 2026-08-09 (laptop, `feat/advisor-progress`).
**Purpose:** the Mentor Hub is described across 19 files written over ten weeks, and no single
document says what it is for. This gathers every statement into one place, quotes the source,
and separates *ruled* from *built* from *assumed*. **It proposes nothing.** The design of what
the Mentor Hub should contain comes after Mike confirms this record.

> **A correction recorded here rather than lost in chat (2026-08-09).** Asked whether the
> approved Template Check mockup showed the Mentor Hub carrying all the Firm Manager's features
> plus the mentor's report, the first answer was *"not in the mockup, and not stated in any
> note."* **The first half is right, the second half is wrong.** It *is* ruled, in
> [`ACTIONS.md` §collaborate-merge](ACTIONS.md#collaborate-merge) and
> [`COLLABORATE-MERGE-PLAN.md` §4.1](COLLABORATE-MERGE-PLAN.md), both from 2026-07-30 — the
> search that missed it looked for the words "Mentor Hub", and those documents say "tier",
> "cascade" and "every tier is the same screen". Mike's recollection was correct.

---

## 1. Who the Mentor is

From [`USER-LEVEL-CASCADE-HANDOVER.md`](USER-LEVEL-CASCADE-HANDOVER.md) (authored 2026-06-26),
the seven user levels — the Mentor is level 1:

| Level | Role | Operates this app as… |
|---|---|---|
| 1 | **Mentor** | Platform owner (Mike). Makes app changes; authors content, domain logic trees, summary documents; seeds the baseline distinctions every firm starts with. |
| 2 | Global Manager / Global Coach | — same screens as a Firm Manager — |
| 3 | Group Manager | — same screens as a Firm Manager — |
| 4 | Firm Manager | Final say on what their advisors and clients see |
| 5 | Advisor / Client | Read what the Firm allows |

The governing rule, same document:

> *"Influence flows down only. Override authority sits at the firm."*

A firm **cannot push anything upward or sideways** — authority is total within their firm, zero
outside it. Later layers inherit from the layer above; the firm has the last word on visibility.

---

## 2. The governing model — Mike's ruling of 2026-07-30

This is the sentence the whole question turns on.
[`COLLABORATE-MERGE-PLAN.md` §4.1](COLLABORATE-MERGE-PLAN.md), quoting Mike verbatim:

> *"All of the functionality that you see at firm manager is simply repeated at group manager
> or global manager… The firm manager sees a summarised view of all the advisers. A group
> manager sees a summarised view of all the firm managers. A global manager a summarised view
> of all the group managers, and a mentor a summarised view of all the global managers. So
> there's no new functionality. It's just simply stubs… we can fix that bit up later on, but at
> least you've made room for it. That's the main thing."*

Three statements follow from it, recorded in the same section:

- **Documents cascade DOWN** — the mentor authors, each level clones the level above.
- **Reporting rolls UP** — each level sees a summarised view of the level below.
- **Every tier is the same screen, re-scoped. No new features per tier.**

And the chain itself:

```text
Mentor  (Mike — creates the original document)
  └─ Global group manager
       └─ Group manager
            └─ Firm manager
                 └─ Adviser (pass-through)
                      └─ Client
```

Marked 🔴 **RULED** in [`ACTIONS.md`](ACTIONS.md#collaborate-merge): *"the 5-level cascade is
built in PROPERLY, now; firm-as-top is not carried forward… The half-measure of confining tiers
to one tab, or logging the seams for the master team, was offered, rejected, and must never be
re-proposed."* Curator and coach do not clone documents and sit outside the chain.

**So Mike's recollection is the ruling: the Mentor Hub is the Firm Manager Hub re-scoped one
level up, plus the roll-up report.** That is written down. What is *not* written down anywhere
is which of the Firm Manager's ten tabs that actually means in practice — see §4.

### 2.1 Every editable function in the Firm Manager Hub arrived by cascade

**Clarified by Mike, 2026-08-09 — read this before §4 or the table there will mislead you.**

> *"All editable functions currently in the Firm Manager Hub have cascaded down from Mentor Hub
> to Global Manager Hub to Group Manager Hub to Firm Manager Hub — then down to advisor and
> business entity/client."*

This is the point the earlier notes leave implicit, and it changes how the whole app should be
read. **Nothing in the Firm Manager Hub originates at the firm.** Domain Support, Logic Tables,
the Logic-Lab, the Advisory Staircase, Templates & Videos, Advisory Distinctions, Quizzes — every
one of them is Mike's content, authored at the top and passed down through each tier, with each
level free to adjust its own copy and the firm holding the final say over what its advisors and
clients see.

```text
Mentor Hub            ← every editable function is authored here
  └─ Global Manager Hub          ← same functions, its own copy
       └─ Group Manager Hub      ← same functions, its own copy
            └─ Firm Manager Hub  ← same functions, its own copy — final say on visibility
                 └─ Advisor
                      └─ Business entity / client
```

**Consequence for §4.** The ten-tab table below is therefore not a wish-list of features to
invent at mentor level. It is a list of functions that are **already the Mentor's**, currently
visible only at their bottom stop. The Firm Manager Hub is the *destination* of the cascade that
was built first, because the firm tier was the first one the app needed. The tiers above it were
never built — so today the content is hand-edited in `data/*.json` files rather than authored on
a screen, and the two middle hubs have nowhere to exist at all (§5).

**This also reframes the "gap".** It is not nine missing features. It is one missing *thing* —
the tiers — expressed nine times.

---

## 3. What exists today

### 3.1 The screen

[`pages/mentor.vue`](../pages/mentor.vue) — **two tabs**:

| Tab | Component | What it does |
|---|---|---|
| Case Reviews | [`MentorReview.vue`](../components/MentorReview.vue) | Read anonymised advisor case studies a firm deliberately shared upward |
| Advisory Distinctions | [`MentorDistinctions.vue`](../components/MentorDistinctions.vue) | Author the platform distinction set every firm receives as its default |

### 3.2 The routes

All gated `firmAuth + requireMentorRole` ([`restify-server.js` L347–359](../server/restify-server.js#L347-L359)):

- `GET /api/mentor/cases` — cross-firm anonymised feed
- `GET | POST /api/mentor/distinctions`, `PUT | DELETE /api/mentor/distinctions/:id`

### 3.3 The Advisory Distinctions cascade — the only feature that actually cascades today

Fully built, and the most documented thing in the repo
([`DISTINCTIONS-CASCADE-PLAN.md`](DISTINCTIONS-CASCADE-PLAN.md),
[`SESSION-2026-06-29-NOTES.md`](SESSION-2026-06-29-NOTES.md)). Two locked decisions:

- **On by default (opt-out)** — a published mentor distinction is immediately live for every
  firm's advisors, no firm action required.
- **Firm customisation wins and sticks** — once a firm declines or edits one, the mentor's
  *later* changes to that row do not override the firm.

Stages built: A–C (storage, CRUD routes, mentor UI, 2026-06-29) · **D** — mentor deletes a row,
a firm that customised it keeps its version ("keep theirs") · **E** — *"Mentor updated this
distinction"* badge with **Adopt / Keep mine** and a side-by-side compare panel. A passive
banner covers untouched rows: *"N mentor updates since your last visit."*

**Live-verified by Mike, 2026-06-29** — both D and E click-tested end to end.

⚠ **Stage 3 (hierarchy hook-up) is the only cascade stage still open**, and it is the same seam
as the tiers: `AUTH.mentorRole` in [`config/integration.js` L45](../config/integration.js#L45)
is set to `platform_admin` **as an interim** until the real Mentor role exists upstream. The
master team repoints one constant; no route or UI change.

### 3.4 The case-study route upward (built 2026-06-26)

The one read that deliberately crosses the firm boundary, and it is a **double opt-in**: the
advisor shares with their firm → the firm manager chooses *"Share with mentor"* → an anonymiser
strips client identity → **the manager previews and approves the scrubbed copy** → only then is
it visible to the Mentor. Raw summaries and transcripts never leave the firm.

---

## 4. The gap, in numbers

[`FirmManagerHub.vue`](../components/FirmManagerHub.vue) has **ten** tabs. The Mentor page has
**two**. This table is a factual inventory, not a proposal — and per §2.1 it lists functions
that are **already the Mentor's**, shown at the only stop on the chain that was ever built:

| Firm Manager tab | Mentor-level equivalent today |
|---|---|
| Domain Support | ✗ none |
| Logic Tables | ✗ none |
| Logic-Lab | ✗ none |
| Advisory Staircase | ✗ none |
| Templates & Videos *(built, hidden behind `v-if="false"`)* | ✗ none |
| **Advisory Distinctions** | ✅ **built — the only one** |
| Quizzes | ✗ none |
| Advisor Network | ✗ none |
| Team Progress | ✗ none |
| Team Case Studies | ◐ the mentor *reads* shared cases; does not manage them |

**Plus the report that has no home at all.** [`ACTIONS.md`](ACTIONS.md), 2026-07-30: *"THIS
APP'S OWN REPORTING HAS NO ROLL-UP ABOVE THE FIRM, and it is listed as a job nowhere."* Team
Progress, the CPD screens and `activity.js`'s team-overview route are all firm-manager gated and
firm-scoped.

Two notes from that entry worth keeping, because they make the job smaller than it sounds:

- **Up and down are not mirror images.** Down = clones, which must be stored. **Up = summaries
  computed at read time** — no new table, no stored copies, and a summary of summaries rather
  than a re-count of every advisor.
- **Collaborate has already built this.** `ManagerConsole.vue` — *"ONE component renders the
  console for EVERY manager tier; the backend returns the correctly-scoped payload."* In
  production a single role-gated page serves every tier; `/group`, `/global` and `/mentor` are
  dev-only previews, four lines each. The roll-up tree (`ConsoleNode.vue`) and the performance
  work (lazy per-node loading, so a mentor opening the screen does not pull every advisor on the
  platform) are done and tested. **Copy it rather than rediscover it.**

---

## 5. The blocker nobody has costed

From [`COLLABORATE-MERGE-PLAN.md` §4](COLLABORATE-MERGE-PLAN.md) — why the two middle tiers
cannot exist yet:

- **Roles:** [`config/integration.js`](../config/integration.js) declares only
  `managerRole: 'firm_manager'` and `adminRole: 'platform_admin'`. No global-group tier, no
  group tier.
- **Storage:** `firm_framework_versions` is keyed `(firm_id, config_key)`, with `firm_id`
  foreign-keyed to `firms`. **There is no column a mentor-level or group-level override could be
  written to.** Every firm-editable feature — Domain Support, Logic Tables, the Staircase,
  Distinctions — writes through that one key.

> **Why now is the cheapest it will ever be: there is NO DATA TO MIGRATE.** MySQL has never been
> provisioned, so no override row exists anywhere. Re-keying to `(scope_level, scope_id,
> config_key)` is a schema edit today and a live migration of a firm's authored content later.

The change is concentrated — **~6 functions and 1 table**, read rather than guessed: the five
`firmOverlay.js` functions, `firmContent.js`'s loader, `mergeEntry` (2-argument merge → a fold
over the chain), and `firmAuth`. `deepMerge` already generalises.

---

## 6. Where the Template Check screen fits

[`mockups/logic-table-template-check.html`](mockups/logic-table-template-check.html) — approved
by Mike 2026-08-05 (*"that looks great, move forward"*), committed `9ba2b4c`.

It is **one screen doing one job**, not a hub layout: it checks every tool name a logic table
asks for against the templates the app can actually open, and lets the mentor correct the
wording once. Four sections — the counts (42 tables / 12 names matching nothing / 27 names
inside sentences), the list with filters, the wording for approval, and an honest "what this
screen cannot do".

Its opening line is where it touches the cascade: *"Where the name does not match, you fix the
wording here and it flows down to every firm."*

**It would be the second mentor-level feature ever built, after Advisory Distinctions** — and it
is a *new* capability, not a re-scoped Firm Manager tab, so it does not itself follow the
self-similar rule. Its four-phase plan is in
[`SESSION-2026-08-05-B-NOTES.md`](SESSION-2026-08-05-B-NOTES.md); **Phase 1 is awaiting Mike's
go-ahead** and closes the open P1 [`gate-blind-to-flat-trees`](ACTIONS.md#gate-blind-to-flat-trees).

---

## 7. What the notes never say

Named here so the gaps are visible rather than filled in by assumption:

1. **Which Firm Manager tabs a mentor should actually get.** "Every tier is the same screen" is
   ruled, but no note tests it against the ten tabs. Some read oddly one level up — *Advisor
   Network* and *Team Progress* are about people inside one firm.
2. **What the mentor's roll-up report shows.** Ruled as existing; never specified.
3. **Whether "Mentor Hub" and the `/mentor` page are the same thing.** The word "Hub" appears
   only in the 2026-08-05 mockup title. Every earlier note calls it the mentor page.
4. ~~**Whether the mentor authors content directly or clones it downward.**~~ **Answered by Mike
   2026-08-09 — see §2.1: the mentor authors, and each hub below holds its own copy.** What is
   still unstated is the *mechanism* at each stop: the distinctions cascade stores only a delta
   (the edited fields) and merges, whereas §4.1's "clones the level above" reads as a full copy.
   Those behave differently the moment the Mentor changes something — a delta stays current
   automatically, a clone goes stale. **This is the one question in this list with a real cost
   attached**, and the staircase already hit it once ([`ACTIONS.md`](ACTIONS.md), 2026-07-31: a
   firm override replaced the whole `steps` array, so the firm would never have seen a step the
   platform later added).
5. **Who builds the tier storage change** — this repo or the master team. §4 of the merge plan
   recommends naming the seams for them; the 2026-07-30 ruling says build it here. These are in
   tension and it is not resolved in writing.

---

## 8. Source index

Every file consulted, and what it contributes.

**Primary — read these:**

- [`COLLABORATE-MERGE-PLAN.md`](COLLABORATE-MERGE-PLAN.md) §4 + §4.1 — the cascade model, Mike's
  verbatim ruling, the two blockers. *The single most important source.*
- [`USER-LEVEL-CASCADE-HANDOVER.md`](USER-LEVEL-CASCADE-HANDOVER.md) — the seven levels, the
  flow-down rule, the case-study route upward, the `AUTH.mentorRole` seam.
- [`DISTINCTIONS-CASCADE-PLAN.md`](DISTINCTIONS-CASCADE-PLAN.md) — the one cascade that is
  finished, Stages 0–3 and A–E, and the two locked decisions.
- [`ACTIONS.md`](ACTIONS.md#collaborate-merge) — the RULED entry, and the "no roll-up above the
  firm" entry.

**Supporting:**

- [`SESSION-2026-06-29-NOTES.md`](SESSION-2026-06-29-NOTES.md) — the day Stages D and E were
  built and live-verified.
- [`SESSION-2026-08-05-B-NOTES.md`](SESSION-2026-08-05-B-NOTES.md) +
  [`TREE-RECOMMENDATION-REVIEW.md`](TREE-RECOMMENDATION-REVIEW.md) +
  [`mockups/logic-table-template-check.html`](mockups/logic-table-template-check.html) — the
  Template Check screen and its four phases.
- [`virt-advisor-registry.md`](virt-advisor-registry.md) — where the distinctions cascade sits
  among the app's data sources.
- [`STATUS.md`](STATUS.md) — the open Stage 3 line.

**Passing mentions only, checked and carrying nothing new:**
[`ENGINE-DEFECTS-2026-07-14-HANDOVER.md`](ENGINE-DEFECTS-2026-07-14-HANDOVER.md) ·
[`FIRM-EDITABLE-TABLES-PLAN.md`](FIRM-EDITABLE-TABLES-PLAN.md) ·
[`LOGIC-LAB-ACCEPT-AND-PUSH.md`](LOGIC-LAB-ACCEPT-AND-PUSH.md) ·
[`LOGIC-LAB-BUILD-VS-MOCKUP.md`](LOGIC-LAB-BUILD-VS-MOCKUP.md) ·
[`CLEANUP-PASS-PLAN.md`](CLEANUP-PASS-PLAN.md) · [`COVERAGE-DEBT.md`](COVERAGE-DEBT.md) ·
[`RELEASE-NOTES-v0.7.0.md`](RELEASE-NOTES-v0.7.0.md) ·
[`SESSION-2026-07-10-NOTES.md`](SESSION-2026-07-10-NOTES.md) ·
[`SESSION-2026-08-03-D-NOTES.md`](SESSION-2026-08-03-D-NOTES.md)

**Code read to check the notes against reality:** [`pages/mentor.vue`](../pages/mentor.vue) ·
[`components/FirmManagerHub.vue`](../components/FirmManagerHub.vue) ·
[`server/restify-server.js`](../server/restify-server.js) ·
[`server/routes/mentor.js`](../server/routes/mentor.js) ·
[`config/integration.js`](../config/integration.js)
