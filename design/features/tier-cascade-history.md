# The Tier Cascade — the History

> **Read [`tier-cascade.md`](tier-cascade.md) first.** That page is the rules. This page is
> why they exist and what was got wrong. Nothing here is a current instruction. If this page
> and the Brief disagree, **the Brief wins** — and the disagreement is a defect to report.

---

## 1. The governing idea, in the owner's words

> *"Every quality system requires a feedback loop, a way to make sure we can improve. The
> information and tools cascade down so we share the tools effectively, the reports cascade up
> so we learn what is working, what isn't, who is failing so we can offer help."*
> — 2026-08-10

And on who the user is:

> *"The issue has always been we are most often NOT dealing with skilled, confident and
> experienced advisors. Most are learning; trying to build confidence and acumen."*

Those two quotations decide the tone rule, the roll-up rule, and why the Adoption screen was
ruled warmer than a league table with a 60-day quiet-firm threshold.

---

## 2. The four mistakes that produced the rules

### A privacy boundary applied to the wrong party · 2026-08-10

A tab matrix was drawn that left Team Progress, Team Case Studies and the three accuracy
reports **out** of both middle tiers. The reasoning: a ruling from the day before had kept Team
Progress away from the mentor.

**That ruling was about an outside party** — Advisor-e — seeing a customer's staff. A global
group is a **brand**, so a global or group manager is the customer's *own* senior person
looking at their *own* firms. Applying an external-party boundary to internal managers inverts
it.

**Nothing in the code could have noticed, and no test could have failed.** A rule copied from
one context into another that resembled it. → Brief **P4**.

### "Content flows down freely; people never flow up" · 2026-08-10

The first version of the cascade map said exactly that, and listed four reports as confined to
a single tier. It was wrong, and it contradicted a ruling already recorded ten days earlier.
The original wording was **deliberately not preserved** in that document, on the grounds that a
wrong sentence left on a page gets quoted. It is named here only so the correction is
traceable.

### A screen designed for data Advisor-e owns · 2026-08-10

A "Global Groups" membership screen was designed and approved, then withdrawn within the hour.
The reasoning had been: *our `firms` table has no group column, so nothing in our data says
which firms are in which group.* True — and the conclusion was wrong. It only ever meant **we
don't hold a copy**. The screen would have been a second, drifting copy of Advisor-e's org
chart. → Brief **P1**.

### `templates.json` written up as "the biggest gap in the product"

291 records with no id. Not a gap. Templates are Advisor-e's entire lifecycle — cloning,
access, editing, hosting, archiving — and each carries its own id *there*. The `page`/`link`
values on our records are **page** ids from the master export, not template ids, which we never
receive. → Brief **P1**.

### The names, and why they are pinned by a test · 2026-08-11

Two tier values were carrying loose spellings: the global-group tier had dropped the word
"group", and the bottom of the tree was named after a single person. The owner's reasoning:
*"a business entity may have more than 1 person/client"*, and *"this is sloppy work and it's how
fuck ups occur"*.

He was right on the evidence — the shortened form had already produced an **invented job title
twice in one session**, because it sounded authoritative and nothing marked it as wrong. Both
spellings are now pinned by `tierVocabulary.test.js`, which fails the build if either reappears
anywhere in the source or in `design/`. → Brief **P2**.

---

## 3. Decisions taken and closed — do not reopen

| Decision | Ruling | Date |
|---|---|---|
| Do the middle tiers get their own screens? | **No — every tier is the same screen, re-scoped.** *"There's no new functionality."* | 2026-07-30 |
| Build the hierarchy now, or leave it firm-as-top? | **Build it properly now.** *"Why would you create code that's gonna create a problem further down the track?"* | 2026-07-30 |
| Clone down, or layer? | **Neither — delta.** A level holds only its changes. | 2026-08-09 |
| How is a tier keyed in storage? | **Reserved scope ids on the existing `firm_id` column.** No schema change. | 2026-08-09 |
| Do reports roll up to every tier? | **Every report, no exceptions.** | 2026-08-10 |
| Does a firm get named to the manager above it? | **Yes — that is not a disclosure.** The adviser and client stay hidden. | 2026-08-11 |
| Do Global Coach / Group Coach / Curator get pages? | **No.** Real Advisor-e roles, no code here. | 2026-08-13 |
| Do a level's own imported resources need storage here? | **No.** They flow down inside Advisor-e, archiving included. | 2026-08-10 |

### The "fold" that was caught

A plan was put to the owner built on the word **fold** — a pure layering of every level. He
caught the difference. The ruled model is neither pure clone nor pure layer: it is what
Advisory Distinctions already did — an untouched row stays current automatically, an edited row
is protected and the update is *offered*. **That mechanism then became the single one used
everywhere**, and the sequencing was reversed with it: unify the mechanism at two levels first,
then add the middle levels once. Extending one mechanism to five levels beats extending seven
and merging them later.

### Why the timing mattered

**There was no data to migrate.** MySQL had never been provisioned, so not one override row
existed in any environment. Changing the storage key cost a schema edit and nothing else. Once
a real firm authors content against the old shape, the same change becomes a live migration of
their work.

---

## 4. Where the earlier record is wrong

Read 2026-08-13. **Left in place** — these are records of their own date. Listed so nobody
quotes them as current:

- `COLLABORATE-MERGE-PLAN.md` §4 describes documents that *"clone down through each level"*, and
  §4.4 describes the merge as *"a fold over the chain"*. **Those are different architectures**,
  the contradiction was live, and §4.4 carries its own correction box saying so. Neither is the
  ruled model — see above.
- The same plan's §4.4 table says `firm_framework_versions` **becomes** keyed
  `(scope_level, scope_id, config_key)` with the FK dropped. That is not what happened: the
  reserved-scope-id ruling of 2026-08-09 kept the existing `firm_id` column and needed no schema
  change at all.
- `MENTOR-TIER-CHAIN-PLAN.md` and the mockups at `mockups/tier-hub-pages.html` describe tabs the
  build does not yet have. The gap is real and is tracked in `ACTIONS.md`, but the mockup is not
  a description of the build.

---

## 5. Where the raw material is

**Permanent companions:** [`../ADVISOR-E-DESIGN-LOGIC.md`](../ADVISOR-E-DESIGN-LOGIC.md) (the
boundary and the ten binding rules — the fullest single account) ·
[`../TIER-CASCADE-MAP.md`](../TIER-CASCADE-MAP.md) (per tab: does it cascade, does it report) ·
[`../MENTOR-TIER-CHAIN-PLAN.md`](../MENTOR-TIER-CHAIN-PLAN.md) ·
[`../MENTOR-SAVE-SCOPE-PLAN.md`](../MENTOR-SAVE-SCOPE-PLAN.md) ·
[`../USER-LEVEL-CASCADE-HANDOVER.md`](../USER-LEVEL-CASCADE-HANDOVER.md) (the master-team
handover) · [`../COLLABORATE-MERGE-PLAN.md`](../COLLABORATE-MERGE-PLAN.md) §4–4.4 (the
2026-07-30 rulings, with the corrections noted above).

**Artefacts — keep on file:** `mockups/tier-hub-pages.html` (the two middle-tier hubs, approved
2026-08-10, unbuilt) · `mockups/mentor-adoption-view.html` · `mockups/case-origin.html`.

**Session notes:** `SESSION-2026-08-10-NOTES.md` (the session that built the chain) ·
`08-09` · `08-11` · `08-12` series · `08-13`.
