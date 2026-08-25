# The Advisory Staircase — the Brief

> **A Firm Manager and Mentor Hub tab.** Read this before changing the client-journey steps or
> the complexity ceiling. Current rules only; the history is in
> [`advisory-staircase-history.md`](advisory-staircase-history.md).
>
> **Covers:** the five steps of the client journey, who may edit them, and the one thing they
> control in the engine. **Does not cover:** template scoring
> ([`advisory-engine.md`](advisory-engine.md)).

---

## 1. Design philosophy

**The staircase is where the client is in their advisory journey, and it is the one thing that
still hard-stops a recommendation.**

Everything else in the engine was softened — hard exclusions were removed because they failed
silently, replaced by ranking and honest flagging. **The staircase ceiling stayed a hard block**,
for one reason: it protects the *advisor's* capability, not the system's tidiness. Recommending a
step-five engagement to a step-one advisor is not an untidy result, it is setting somebody up to
fail in front of a client.

**And the words matter as much as the mechanism.** Every advisor is asked the staircase question
in every client session, so the wording their firm chose is what they read. A firm that describes
its journey in its own language gets a product that sounds like them.

**Two things travel together and must never come from different merges** — the wording an advisor
reads, and the ceiling the engine applies. They share one blend for exactly that reason.

---

## 2. Key principles — the non-negotiables

**P1 · The complexity ceiling is a hard block, deliberately.** It is the only one left. Do not
soften it into a preference.

**P2 · The wording and the ceiling come from one blend.** They can never be resolved separately,
or an advisor reads one firm's words while the engine applies another's rule.

**P3 · Read by any signed-in firm user; written by managers only.** The question is asked of
every advisor in every session, so a read must never require a manager role and **must never
break the session** — on any failure it degrades to the platform wording.

**P4 · A level's decisions are stored in separate, additive keys** — what it switched off, what
it edited, and what it added — so the key that already existed is never rewritten and nothing a
firm has saved needs migrating.

**P5 · The default ceiling stays where it is.** The row-inheritance mechanism is for *lists of
rows* where switching one off and adding your own mean something. A single account-wide setting
is not a row.

**P6 · Own-row id prefixes stay distinct per tier** — mentor, global, group and firm each mint
their own, or one level switching off "its own" step silently drops another's.

---

## 3. Design considerations

**A step is a decision, not a value.** A level can switch a platform step off, edit it, reset it,
or add one of its own — and an untouched step keeps receiving improvements from above. That is
the same mechanism used by the distinctions and the quizzes.

**Editing the words does not change the ceiling.** They are separate fields with separate
purposes; rewriting a step's description does not move where the engine draws the line.

**This tab appears at every tier**, and the middle tiers take the firm flavour of it — they have
a level above them, so decline and reset mean something.

**`education-gates-ascent` is NOT part of this brief, and that is deliberate.** It
is a design intent stored in [`../../data/advisory-staircase.json`](../../data/advisory-staircase.json),
so it is easily mistaken for a staircase feature. Its own rule guard forbids that: *"Must never
couple staircase step → engagement type. Staircase stays ceiling-only; **the education decision
lives in the acumen lens.**"* Education is what lets a client *ascend* the steps; it is not a step,
and it never sets the ceiling.

Its status is `"not-wired"` and the substance sits in [`advisory-engine.md`](advisory-engine.md)
and on the live list as item 2.9. 🔴 **Mike ruled its reach on 2026-08-16 — the gate fires wherever
poor financial literacy shows up, not only inside a forecasting conversation** — which is why the
work begins with the literacy signal and not with the wording. **Do not ask him for the on-screen
words**; that question is answered until the signal is widened.

---

## 4. For the coder

| Piece | Path |
|---|---|
| Single read path for a level's decisions | `server/utils/firmStaircase.js` |
| The shared blend | `server/utils/staircaseConfig.js` |
| Advisor-readable route | `server/routes/staircase.js` |
| Manager write path | `server/routes/firmManager.js` |
| The screens | `components/firm/FirmStaircase.vue`, `FirmStaircaseStepForm.vue` |
| Screen-side helper | `mixins/staircaseMixin.js` |
| Platform data | `data/advisory-staircase.json` |

### The four config keys

Declines (an array of platform step ids switched off), overrides (a level's edits keyed by the id
they replace), own steps (added by that level), and the original file — **unchanged**, and the home
of the two settings that are not rows: the **default ceiling** and the **question the advisor is
asked**.

**The question comes from the data, and every level may write its own** (2026-08-16). It is
`selectorPrompt`, edited on the tab as *"The question your advisors are asked"*, and it inherits
exactly as the steps do — a level that has written none gets the level above's, down to the shipped
file. It was authored from the start and read by nothing until that date; the engine asked a
hardcoded copy, so no level's edit ever reached an advisor. Capped at 500 characters, because the
value travels into the advisor prompt. Approved wording:
[`../STAIRCASE-SELECTOR-PROMPT-FIELD.md`](../STAIRCASE-SELECTOR-PROMPT-FIELD.md).

**Traps.** Do not fold either setting into the row mechanism. Do not let the advisor read and the
engine rule resolve separately. A read that throws breaks a live client session — degrade instead,
and an unreadable question degrades to the shipped sentence rather than to silence, because an
advisor asked nothing cannot answer. And the `No problem —` lead-in on the re-ask belongs to the
code, not to the question: a level must not be able to delete it from a conversation it never saw.

**Known state.** Runs on the development file fallback like every other level-editable block.

---

## 5. Related briefs

[`advisory-engine.md`](advisory-engine.md) — where the ceiling is applied ·
[`advisory-distinctions.md`](advisory-distinctions.md) — the mechanism this reuses ·
[`firm-manager-hub.md`](firm-manager-hub.md) · [`tier-cascade.md`](tier-cascade.md).

**History:** [`advisory-staircase-history.md`](advisory-staircase-history.md)
