# Session Notes — 2026-08-10 · Laptop, Session 41

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **4,845 green / 282 suites**,
> lint 0 errors, **34 ahead / 0 behind `master`**, level with the remote.
>
> **No application code was touched this session.** Three commits, all design and record. The
> `tier-hub-pages` build is still approved and **still not started** — it begins at part 1 with a
> fresh window, exactly as session 40 left it.

---

## 🔴 THE ONE THING TO READ — the boundary

Session 40 ended with an instruction from Mike: ask him about Advisor-e's design logic and the
rules around editability before designing anything. **That was done first, and the answer became
[`ADVISOR-E-DESIGN-LOGIC.md`](ADVISOR-E-DESIGN-LOGIC.md).**

**Read §1 before designing anything.** Mike, 2026-08-10:

> *"All of the template cloning, access and editing, hosting and archiving etc. are controlled by
> the Advisor-e app… NONE of this is visible inside the Virt Advisor app since it doesn't need to
> be — NONE of the functionality in this app requires those things."*

**Advisor-e owns: login, accounts, the org chart, roles, and templates + videos end to end.** Each
template carries its own id there for cloning and archiving, which we never see. **If a feature
needs any of those, it is not ours** — do not design a screen for it, hold a copy of its data, or
mint an id for it.

---

## What the next session most needs to know

**The document was written twice, and the first draft is the finding.**

Draft 1 explained the whole platform's design logic — six levels, authority, permissions,
template lifecycle. Mike read it and said:

> *"I worry that sharing all this logic may now have created more confusion — not less."*

He was right, and with evidence rather than a worry: **twice in two days, work was started here
that Advisor-e already owns.**

1. **Session 40** — a Global Groups membership screen, designed and approved, withdrawn within
   the hour. It would have been a second, drifting copy of Advisor-e's org chart.
2. **This session** — `data/templates.json` holding 291 records with no `id` was written up as
   *"the biggest gap in the product"*, reasoning that the thing Mike calls the heart of Advisor-e
   cannot cascade. **It is not a gap.** Templates are Advisor-e's. The `page`/`link` values on
   those records are master-app **PAGE** ids — which is why only 267 of 291 are distinct, and why
   they never could have keyed a template.

**Both errors have the same shape**: measuring the absence of something in our data and reading
it as a gap in the product, when it only ever meant *we don't hold a copy*. Nothing in the code
could have contradicted either guess.

The rewrite leads with the boundary and covers only this app: §2 who the user actually is, §3 the
five blocks that cascade, §4 the seven reports that roll up, §5 every feature walked through
(the Hub's 14 tabs, the AI section, the nine report screens, Adviser Network, CPD), §6 scope
identity, §7 what is not working and whose it is, §8 ten binding design rules.

### A contradiction reported, then dissolved by the same boundary

Mike's *"the advisor has final edit and final selection"* appeared to contradict
[`COLLABORATE-MERGE-PLAN.md`](COLLABORATE-MERGE-PLAN.md) §4 — *"the adviser is a PASS-THROUGH, not
an authoring level… neither gets override storage."* It was raised as an open question needing his
ruling.

**There was never a conflict.** The advisor edits the **template**, and that happens in Advisor-e.
This repo needs no advisor override storage, and the 2026-07-30 rule stands unamended. Recorded
because the question cost a round trip that §1 would have answered.

---

## What was done

Three commits, no code:

- `75e1e2b` — [`ADVISOR-E-DESIGN-LOGIC.md`](ADVISOR-E-DESIGN-LOGIC.md), the framework, boundary
  first.
- `6ff182d` — the [`ACTIONS.md`](ACTIONS.md#design-logic-framework) record row that **links** it
  (per the Save-the-Artefact rule — the record points at the artefact, it does not retell it), and
  one bullet added to [`tier-hub-pages`](ACTIONS.md#tier-hub-pages).
- (this commit) — the stash correction below, and this note.

### The bullet added to `tier-hub-pages` is the useful one

Part 2 of that build — *"the tab conditions rewritten to name their tiers"* — was an instruction
with no evidence attached. §5.1 now tabulates **every Hub tab beside its current gate**, read out
of the component, and it makes the trap visible without opening the file:

- **Advisory Distinctions is TWO exclusive tab entries** — `scope === 'firm'` at
  `FirmManagerHub.vue:174` and `scope === 'mentor'` at `:441`. A third scope value matches
  **neither**, so the tab disappears.
- **`scope !== 'mentor'`** on Team Progress and Team Case Studies is **true** for a third scope,
  so those two switch themselves **on**.

**Not one condition to fix — a pattern of them.** Nothing errors; no test fails.

---

## ✅ Correction to session 40's notes — there is no loose end

[`SESSION-2026-08-10-B-NOTES.md`](SESSION-2026-08-10-B-NOTES.md) closed with *"One loose end,
deliberately left"* — a git stash said to hold a half-written `APPROVED` banner for the superseded
Global Groups mockup, awaiting a `git stash drop`. The same claim sat in the `tier-hub-pages` row.

**`git stash list` is empty on this machine.** Checked at startup. Both places are corrected —
**corrected, not deleted**, so the dead end is not re-derived from the older notes by whoever
reads them next. The mockup file itself is untouched and deliberately kept.

---

## Where the work stopped

**Cleanly, before any code.** The `tier-hub-pages` build is approved, logged, artefact-backed, and
**not one line written**. Start at [`ACTIONS.md` → `tier-hub-pages`](ACTIONS.md#tier-hub-pages),
open [`mockups/tier-hub-pages.html`](mockups/tier-hub-pages.html), and read
[`ADVISOR-E-DESIGN-LOGIC.md`](ADVISOR-E-DESIGN-LOGIC.md) §1 and §5.1 first.

⚠ **The mockup predates §3.1 of the framework.** It was drawn on the understanding that a middle
tier only *filters* what flows down; Mike has since said larger firms and groups also **edit and
add their own material**. In this repo that applies to the five cascading config blocks, not to
templates. Worth re-reading the mockup against §3 before building it.

⚠ **Part 2 still goes first**, for the reason above.

## On conflicts

**Only `design/` files were touched** — `ACTIONS.md` is where a conflict would land, as always. No
`server/`, no `components/`, no `pages/`. **Logic Lab and the firm-side logic-table screens remain
the DESKTOP's**; nothing here went near them.

**For the desktop machine:** there is now a framework document that governs anything a narrower
design doc does not state explicitly. Read `ADVISOR-E-DESIGN-LOGIC.md` §1 before starting any tier
work — it is the boundary, and it is what both of this week's withdrawn pieces of work would have
prevented.

## Open for Mike

- **§9 of the framework** — when a group adds *"their own fresh resources"*, do those travel down
  to its firms like an edited config row, or sit alongside as a separate library? *(If
  "resources" means templates and videos, it is Advisor-e's and there is nothing to answer.)*
- **Ask the master team for the two role values + which group a manager manages** — §5 of the
  hub artefact is written so it can be sent as it stands. ⚠ **`mentor` was never added either.**
  *(Carried from sessions 39 and 40; the Wednesday deadline rests on it.)*
- **The `tier-hub-pages` build itself** — approved, not started. *(Carried.)*
- **Rule the 93 Template Check rows** — the queue stays empty until he does. *(Carried.)*
- **Reply to Carl about `npm install`** — v0.7.0 adds `@mdi/font`. *(Carried.)*
- **Raise the export gap with the master-app team — SEVEN tools.** *(Carried.)*
- **Decide on the `/startup` change** in
  [§approved-mockup-stranded-on-a-branch](ACTIONS.md#approved-mockup-stranded-on-a-branch).
  *(Carried.)*
