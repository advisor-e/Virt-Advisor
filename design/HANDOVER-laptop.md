# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-21 · Laptop · branch `feat/advisor-progress`

**Clean, pushed, and offered to `master` as [PR #103](https://github.com/advisor-e/Virt-Advisor/pull/103).**
Merged up to date with the desktop's PR #101 first. Suite 12,304→12,329 green (571 suites),
coverage and audit gates passed. Take ahead/behind from `npm run check:branch`.

🔴 **MIKE REJECTED THE BUILT STEP BUILDER ON SIGHT** — *"cluncky - ugly and lacks logic …
sloppy work"*. New drawing: `design/mockups/strategy-session-process.html`, **four decisions
all ruled by him 2026-09-21** (step arrives filled · AI proposes only · all four manager tiers
author · the two closing blocks leave the screen). ⛔ **RULED IS NOT APPROVED TO BUILD.**
Approving the drawing and building from it are each still to be asked. The page says so on its face.

🔴 **TWO NEW BINDING RULES ON HOW QUESTIONS ARE PUT TO HIM** — `CLAUDE.md`, echoed in
`.claude/commands/startup.md`. A bare "yes" must be a complete instruction on its own, in the
shape `<question> — instead of <what "no" means>? Yes or no.`, and **the question is the last
sentence of the Non-Coder Summary, every time.** Read them before writing to him.

🔴 **`templateCount` IS NOT A CONCEPT COUNT, AND IT NEARLY COST A CORRECT BRIEF.**
`data/strategy-capture-tables.json` `templateCount` is 20 and counts TEMPLATES; concepts with a
supplied table are **16**, measured concept by concept against the running API. `captureFormBasis:
"measured"` means the form's SHAPE is known, not that Mike's workbook exists — Branding, Customer
Loyalty, Packaging and Pricing all read `measured` and return `supplied: false`. **The Brief's 16 /
36 were right; an edit "correcting" them was written and reverted.** Measure before rewriting a record.

**Stage names are now Mike's:** Scope session · Build session · Run session · Objectives & actions ·
Produce plan (`locales/en.json` rail keys). Advisor-facing only; the client's agenda is unaffected.

**DESKTOP — shared files I changed:** `CLAUDE.md` and `.claude/commands/startup.md` (the two rules
above), `pages/strategy-planner.vue`, `locales/en.json`, `design/ARTEFACTS.md`. Merge conflicts in
`strategy-planner.md`, `to-do-items.json` and `to-do.md` were resolved **block by block** — your
item 17 and the 7.12→7.13 renumber are intact. `activeOn` for 7.5 and 15.1 unchanged.
