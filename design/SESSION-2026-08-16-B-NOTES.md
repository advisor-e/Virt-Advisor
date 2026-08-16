# Session Notes — 2026-08-16 · Laptop, Session 62

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **5,439 green / 314 suites**,
> **64 ahead / 0 behind `origin/master`**.
>
> ⚠ **NO APPLICATION CODE WAS TOUCHED.** Five commits, all documentation: one binding rule, two
> approved artefacts, and the list updates. Nothing was built, and nothing in the running app
> changed.

---

## 🔴 FIRST TASK NEXT SESSION — one question, then the build

**Ask Mike who drafts the ten empty domains.** Phase 1 of 4.16 is fully specified and approved and
cannot start without it:

1. **He authors them** — most faithful, slowest.
2. **We draft** from each domain's own `overview` and `materials`; he approves. The raw material is
   already in the file, so it is summarising rather than inventing. **Each draft is a committed
   artefact BEFORE he approves it** — ten domains must not become a rubber stamp.
3. **A mix** — we take the seven Get-the-Job domains, he writes the three client-facing ones.

**No drafting starts before he answers.** Authoring advisory routing text unasked is the same fault
as inventing wording, at ten times the scale.

⚠ **DO NOT ask him for the education-gate wording (2.9)** or **raise the release number** — both
still settled from sessions 60 and 61.

---

## What happened

### ✅ 4.16's sweep is finished — and it found 102, not a handful

Every one proved by **rendering the real prompt and searching it**, never by inspecting the store.

| Block | Unreachable | What |
|---|---|---|
| Domain support | **71** | 65 `diagnostic_entry` branches across 19 domains, 6 `if_then_logic` rules |
| Logic trees | **15** | 13 `stage_entry_question`, 2 `flat_branches` |
| Engagement types | **15** | 5 fields × 3 types, behind a hardcoded paraphrase in `advisorEngine.js` |
| Advisory Staircase | **1** | `selectorPrompt`, duplicated as a hardcoded string in the engine |

🔴 **The second half nobody predicted: no screen renders any of them either.** The Domain Support
tab edits the materials table only; the Logic Tables tab edits the branch rows only. Invisible in
**both** directions.

**And the trap is sharper than "this block has no page."** Both tabs are **ungated** in `TAB_TIERS`,
so every tier from the mentor down has had them all along. **The pages were there; the fields were
never put on them.** The question that catches this is not *"does this block have a screen?"* but
*"does **this field** have one?"*

**Session 61's guard did not catch any of it.** `recommendationGate.test.js` walks `tree.nodes`
only, and every miss is a tree-level field or in another file. The control was real; its reach was
one level too narrow.

### 🔴 The new binding rule — AI fixes surface on a hub page

Mike, on seeing that: *"ALL AI fixes must use hub pages where possible, starting with the mentor and
cascading down as appropriate."*

Written into [`../CLAUDE.md`](../CLAUDE.md) as its own section **and**
[`features/tier-cascade.md`](features/tier-cascade.md) as **P10**. Not a session note — a rule left
in one is a rule nobody finds.

### Phase 1 specified, approved, and not started

Artefacts committed *before* approval:
[`DIAGNOSTIC-ENTRY-BLOCK.md`](DIAGNOSTIC-ENTRY-BLOCK.md) ·
[`mockups/domain-support-diagnostic-entry.html`](mockups/domain-support-diagnostic-entry.html)
(also published to Mike's artefact link).

His rulings, all today: wording approved as proposed · **mentor tier only** · a **section inside the
existing Domain Support tab**, not a new page · **ship it filled**, *"with as many sections as
possible"*.

⚠ **"Ship it filled" reordered the phase.** Authoring the **10 empty domains** — `eoy`, `profit`,
`staff` first, then the 7 Get-the-Job ones — is now the **first and larger half**, shipping with the
wiring. The section never goes live half-filled.

⚠ **The mentor-only ruling corrected the artefact's own first draft**, which proposed all four
managing tiers with row-level inheritance — the default P10 produces. Kept as superseded rather than
overwritten, because that is the reusable lesson: **a hub page is the rule; every tier getting it is
not.**

### 🆕 4.17 — found by Mike himself, on screen

He asked why Advisory Distinctions "no longer appear to be linked and working at mentor level". It
showed **1 distinction when the shipped set is 67**: a local git-ignored dev file
(`data/dev-platform-distinctions.json`) holding one stale test row is deliberately preferred over
the committed seed when there is no database — **with nothing on screen saying so.**

**The same pattern applies to every dev-JSON fallback in the app**, not just this one. That is the
item; the single file is only the symptom.

---

## ⚠ What is open, and honestly

1. 🔴 **A ONE-LINE COMMAND IS WAITING ON MIKE'S MACHINE.** `del "data\dev-platform-distinctions.json"`
   — his Advisory Distinctions tab shows 1 of 67 until he runs it. **The AI's own safety classifier
   refused the deletion twice**, so this could not be done for him. The file is git-ignored, so it
   will never appear in `git status` and nothing will remind anyone. The one row is backed up in the
   session scratchpad.
2. **The dev servers were left running** (`npm run go` — Nuxt :3000, Restify :4000). Started so
   Mike could see the Mentor Hub. Close the window when done.
3. **`get-team-problem`'s 6 rules are excluded from Phase 1** and still unfixed — they sit under
   `if_then_logic` and carry three parts, not two.
4. **Nobody has seen any of this working**, because nothing was built. The proof throughout is the
   rendered prompt, read end to end.
5. **Carried, untouched from session 61:** six ghost template references logged at every startup;
   two broken Brief links (`tier-cascade.md` → `collaborate.md`, `to-do-done-and-parked.md` →
   `../STATUS.md`). **Now carried three sessions.**
6. **`ARTEFACTS.md` still shows item 2.6 as "☐ awaiting approval"** though it closed on 2026-08-16.
   Spotted and deliberately not folded into an unrelated commit.

---

## 🖥 FOR THE DESKTOP

**Nothing of yours moved. No application code changed anywhere this session.**

🔴 **`CLAUDE.md` HAS A NEW BINDING RULE** — every AI fix surfaces on a hub page, mentor tier first.
It binds your sessions too. Read it before wiring any content into a prompt: if the AI reads it,
somebody must be able to see it on a page, and you name which tiers get it in the same change.

🔴 **`design/features/tier-cascade.md` gained P10**, the same rule, beside the other nine
non-negotiables.

**Two new files:** `design/DIAGNOSTIC-ENTRY-BLOCK.md` and
`design/mockups/domain-support-diagnostic-entry.html`.

⚠ **If you are anywhere near `domainSupport.js` or `logicTrees.js`, Phase 1 will touch
`domainSupport.js`'s three formatters** — one shared `diagnostic_entry` renderer replacing the two
inline copies. Nothing is written yet.

---

## ☐ Open for Mike

1. 🔴 **Who drafts the ten empty domains** — blocks Phase 1, see the top of this note.
2. 🔴 **Run the one-line delete** so Advisory Distinctions shows all 67.
3. **4.12 · where the corrected handover lives, and what it describes** — carried **five** sessions.
4. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried **five** sessions.
5. **The template picker on a firm's own coaching entry** — carried from session 60, never ruled.

⚠ **Items 3 and 4 have now been carried for five sessions each.** Neither needs a working session.
