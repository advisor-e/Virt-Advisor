# Session Notes — 2026-08-16 · Laptop, Session 61

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **5,439 green / 314 suites**,
> lint **0 errors**, **58 ahead / 0 behind `origin/master`**.
>
> ⚠ **Application code was touched in ONE place:** `server/utils/logicTrees.js` — a new
> `formatDeliveryMethodChoiceForPrompt`, a `DECISION_CONTEXT_FORMATTERS` map, and two additions to
> `formatNodeForPrompt`. Everything else is tests, records and one build script.

---

## 🔴 FIRST TASK NEXT SESSION — ask Mike, do not pick

**The live list is [`features/to-do.md`](features/to-do.md), and it is six items. NONE of them wait
on Mike.** That is the first time this has been true. Do not rank it yourself; his order is in the
file and his ordering rule is §3.

✅ **DO NOT ASK HIM FOR THE EDUCATION-GATE WORDING.** He was asked on 2026-08-16 and rescoped the
item instead — see below. 2.9 now waits on **us**, and the wording question is answered until the
literacy signal is widened. This is the same failure family as the release number that was put to
him in sessions 58, 59 and 60.

✅ **DO NOT RAISE THE RELEASE NUMBER.** Still sequenced behind the technical list (Mike, session 60).

---

## What happened

Two items, both of which changed shape under a question Mike asked.

### ✅ 2.6 — the awareness branch gets the reason, not just the choice

Filed as *"one line from you"*: emit `advisor_note` on `profitability_feasibility/pf_awareness`,
gated the way `recommendation` is. **Both halves of that plan were wrong, and only running the code
showed it.**

**First**, the gate would have deleted it. Through `withholdUnavailableNames` the note survives as
*"This determines the delivery method."* — the gate reads "use Trial Fit" and "use Cautious Reveal"
as tools it cannot serve, when they are delivery *approaches*, not documents. It would have shipped
as a fix while throwing the instruction away.

**Second, and this is Mike's:** *"perhaps AI would benefit from greater context? what are the notes
about WHY I said not to spring it on somebody — what to look for etc..."* The answer was yes — and
**the reasoning was already authored**, in `trial-fit-reference.json` and
`cautious-reveal-reference.json`: the map shock definition, four observable signs of a motivated
client, the resistant client's profile, the contrast between the methods. **None of it loaded at
that branch.** `buildLearnReferenceText()` returns null for the Profitability tree, and three
realistic profitability conversations — including *"I am not sure they realise they need a revenue
model yet"* — all route to `profitability_feasibility`, so neither guide attaches. Rendered, the
branch gave the model a question and two labels.

**Built:** a 1,835-character context block on that branch, **read at run time from the two reference
files**, then the note. Artefact [`PF-AWARENESS-DECISION-BLOCK.md`](PF-AWARENESS-DECISION-BLOCK.md)
committed *before* approval (`717706d`), registered in [`ARTEFACTS.md`](ARTEFACTS.md) under a new
heading **"Words the AI is shown"**, with **four build differences named on it**.

**The two that go beyond the artefact, both deliberate:** `advisor_note` is emitted on *any* branch
carrying one — restricting it to a node id would have left the defect intact for the next note
anybody writes — and because it is the one field past the availability gate,
`recommendationGate.test.js` now pins `pf_awareness` as the **only** node in the corpus carrying
one. A second stops the build.

### 🔴 2.9 — rescoped by Mike, and it is no longer a wording task

Before asking him for the words, the precondition in his own 2026-07-16 ruling — *"the literacy
signal's reliability verified first"* — was finally run. **Two of that ruling's assumptions failed:**

1. **The pattern it says to copy does not exist.** *"The existing outside-your-range pattern"* was
   decided 2026-06-04 (`virt-advisor-system-design.md` §13) and **never built**. No code carries
   that text.
2. **The literacy signal exists in one domain out of eight.** *"Poor financial literacy"* sits under
   **forecasting** only — all eight primary-issue lists checked. A client who plainly cannot read
   their numbers but came about staffing or profitability would not trip the gate.

Shown both, Mike ruled: **"wherever it shows up."** Order now fixed — widen the signal (ours, and
**not** by copying the line into eight lists, but as a signal read independently of domain), *then*
his wording, *then* build. Recorded in `features/to-do.md` §4, `to-do-items.json`,
`ACTIONS.md`, and `features/advisory-staircase.md`.

### Two smaller things

- **The test count was reported wrong and corrected in its own commit** (`b8d2d26`). The build took
  the suite 5,429 → 5,442; closing 2.6 then took it to 5,438, because `toDoItems.test.js` generates
  four tests per live item. A number in a record gets quoted, not re-derived.
- **`apply-to-do.js` printed "Six live items. no need Mike."** The sentence pluralised neither half,
  so it went slack at exactly the counts that matter — it had already printed *"One need Mike."*
  Fixed, with both edge cases pinned.

---

## ⚠ What is open, and honestly

1. **Nobody has watched the AI use the new block in a live conversation.** The proof is the rendered
   prompt, read end to end against the approved artefact. That is the prescribed method and it is
   what found the defect three times — but it is not the same as seeing it work.
2. **4.16 is the sweep and it is still open.** 2.6 was its first *known* instance. Closing it raised
   the expected yield rather than lowering it: the fix had to grow four-fold once anyone actually
   read the rendered prompt. Its method is prescribed — **render the prompt and read it.**
3. **Six ghost template references are logged on every startup** — Lite Sales, Lite Data, Lite
   Planning, Lite People, Lite Process, Growth Curve. Names the trees reference that do not exist in
   the search content. **Noticed in passing, told to Mike, not filed and not ruled on.**
4. **Two Brief links are still broken** — `tier-cascade.md` → `collaborate.md` (never existed) and
   `to-do-done-and-parked.md` → `../STATUS.md` (deliberately deleted). Carried from sessions 59 and
   60. Still not added to anything.

---

## 🖥 FOR THE DESKTOP

**Nothing of yours moved.** Logic Lab and every page are as you left them. `FirmManagerHub.vue` was
**not** touched this session.

🔴 **`server/utils/logicTrees.js` `formatNodeForPrompt` now emits two more things** — a decision
context block keyed by node id (`DECISION_CONTEXT_FORMATTERS`, one entry today), and `advisor_note`
on any node carrying one. If you add a node field, the guard in `recommendationGate.test.js` will
stop you until it is either emitted or listed with a reason — that is the control working.

🔴 **`advisor_note` is the ONE field emitted past the availability gate.** Do not add a second
without reading the artefact first; a test enforces this.

**One new file you will not have:** `tests/unit/deliveryMethodContext.test.js`, and the artefact
`design/PF-AWARENESS-DECISION-BLOCK.md`.

---

## ☐ Open for Mike — nothing on the live list needs him

**For the first time, no live item waits on Mike.** Four things he *could* be asked, none blocking:

1. **The six ghost template references** — whether that becomes an item. Told, not ruled.
2. **4.12 · where the corrected handover lives, and what it describes** — carried since session 58.
3. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried.
4. **The template picker on a firm's own coaching entry** — carried from session 60, never ruled.

⚠ **Items 2 and 3 have now been carried for four sessions each.** Neither needs a working session.
