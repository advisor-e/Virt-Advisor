# Session Notes — 2026-08-13 (B) · Laptop, Session 51

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,114 green / 300 suites**, **0 ahead / 0 behind `origin/feat/advisor-progress`**.
>
> ⚠ **No application code was touched this session.** 50 files changed, every one under
> `design/`. No dev servers were started or restarted.

---

## 🔴 THE ONE THING TO READ — the backlog is no longer the triage list

**[`design/features/to-do.md`](features/to-do.md) is now where work is triaged.**
`ACTIONS.md` stays the full record and nothing was deleted from it — but it is **6,135 lines**
and reads as ~70 open tasks when the real live list is **nineteen, nine of which are waiting on
Mike rather than on code**.

Every item on the new list names **who it waits on** and **whether it was verified against the
code today or merely carried from the backlog**. That distinction is the whole point: three
separate items have previously been found already built while still flagged open, and on one
occasion the app's "top open defect" was reported three days after it had been fixed.

**And the rules now live in [`design/features/`](features/README.md), not in session notes.**

---

## What was built

**24 feature pages, each a pair.** A **Brief** — current rules only, no dates, no arguments, no
attribution — and a **History** holding why the rules exist, what was tried and rejected, and
what went wrong often enough to be worth remembering. The History is reachable only from the foot
of the Brief.

**Why:** `design/` had grown to 120 files and 25,566 lines, over half of it dated session notes.
Answering *"how is a report model built and formatted?"* meant reading across **22 files** and
discarding most of what you read — and the current rule and the historical argument sat on the
page with equal weight.

**One page per Mentor Hub tab**, at Mike's request, so a single hub screen can be reviewed on its
own: Advisory Staircase · Logic Lab · Adoption · Logic-Lab Report · Case Reviews · Template
Check. **Six of the eleven mentor tabs had no page of their own before this.**

**Logic Tables and Domain Support got their own pages**, also at Mike's request — they were
buried inside the engine Brief, which understated the two things most of the advice comes from.

**Collaborate was split into three** — Adviser Network, Groups & Messaging, and the People Data
Layer — after reading the code showed it is a whole app, not a feature.

---

## 🔴 Written against the CODE, not the plans — and it mattered twice

**The tier-cascade Brief was drafted saying the negative tab gates are live and the middle-tier
hub pages unbuilt.** Both were true when the design record was written and **both are false now**
— `TAB_TIERS` names every tier positively, `hubTabTiers.test.js` pins it, and both middle hubs
exist. Caught by opening the component, not by reading the plan. **The Brief nearly shipped
repeating a stale claim, which is the exact failure the whole exercise exists to stop.**

**And a fabrication outlived its own fix by a fortnight.** The invented `A.I.D.C.R.A` expansion
was corrected in the data on 2026-07-31 and is clean in every `data/` file — but it survived in
`DOMAIN-SUPPORT-REVIEW-CHECKLIST.md`, **the checklist Mike fills the 16 missing Step-by-step
cells FROM**. Writing steps from that row would have put the invention straight back into the
field the never-invent rule protects. Corrected (`dca5ae0`), old wording named in the row, repo
swept clean.

> **The transferable part: the fix was applied where the fault WAS, and nothing asked where the
> content had been COPIED to.** Prose copies are the ones nothing tests.

**Six design documents were found carrying stale counts or build status.** All left in place —
they are accurate records of their own date — and each is named in the relevant feature History
so nobody quotes it as current. Logged as [§stale-counts-in-design-docs](ACTIONS.md#stale-counts-in-design-docs).

---

## The handbook — one link, editable

All 24 pages are also **one navigable page**, generated from the markdown by a script that lives
in the **scratchpad, not the repo** (it reads the repo and writes nothing to it). Mike reads and
**edits directly on the page**; a Save button exports only what he changed — which page, what it
said before, what it says now — as a file in Downloads, which is then applied to the markdown by
hand.

**Proven end to end this session.** Mike's first edit came through and is committed (`86e4d1a`):
*"Every model **layout/format** looks identical"* — a real sharpening, because the models do
differ in charts, figures and inputs and the old wording overclaimed.

⚠ **Edits live in one browser on one machine.** Save and send them before switching machines.
⚠ **The generator is not in the repo**, so it is not versioned. Moving it in is unproposed.

---

## 🖥 FOR THE DESKTOP

**Nothing here went near your ground.** No application code was touched. Logic Lab and the
firm-side logic-table screens remain yours — the Logic Lab Brief says so at the top, and records
that "accept and push" is **designed and NOT built** so nobody reads the design document as a
description of the screen.

**Merge `master` before writing any new design document.** The only conflict risk is
`design/ACTIONS.md`, which gained a header block and two rows at the top.

**Then read [`design/features/README.md`](features/README.md).** If you establish a rule, write
it into that feature's Brief in the same session. A rule left in a session note is a rule nobody
will find.

---

## ☐ Open for Mike — the nine decisions

All nine are on [`features/to-do.md`](features/to-do.md) §2 with their context. In short:

- ☐ 🔴 **Send the master team the tag number.** `v0.8.0` is cut and pushed and nobody outside
  knows. *(Carried 50.)*
- ☐ **The four missing hub tabs** — +2 / +2, verified against `TAB_TIERS`.
- ☐ **Seminar's 7 lines** · **Management Reporting annual plan name** · **the five roll-up
  labels** · **`advisor_note`**. *(Carried 45–50.)*
- ☐ **Per-question quiz record — free text or not?** Recommendation on file: **no free text**.
- ☐ **How should `STATUS.md` stop going stale silently?** Three options, recommendation given.
- ☐ **The education-gate wording** — behaviour already ruled, words not yet confirmed.

**Parked, do not re-raise:** Template Check queue and the Logic Tables rewording — after UAT.

---

## Commits

`cfe1b72` · `86e4d1a` · `e5ade6e` · `d6e79b9` · `64e39d3` · `dca5ae0`
