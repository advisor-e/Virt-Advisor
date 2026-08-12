# Session Notes — 2026-08-12 · Laptop, Session 47

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,042 green / 296 suites**, lint 0 errors, **58 ahead / 0 behind `master`**, and **pushed**.
>
> ⚠ **No backend restart needed** for today's backend change — `templateCheck.js` is read per
> request. The Logic Tables editor change (`7ba8427`) *does* need one wherever the app is running.
>
> ⚠ **The dev server still answers on `localhost`, NOT `127.0.0.1`.** Unchanged from session 46.

---

## 🔴 THE ONE THING TO READ — three faults, all found by a human looking, none catchable by a test

The Template Check queue said **88 rows, 0 ruled**. It is now **59 ruled, 29 left**. But the
throughput is not the story. **Every real defect today was found by Mike asking a question, and not
one of them could have failed a test**, because each is a screen showing a human too little:

| What he said | What it turned out to be |
|---|---|
| *"isn't this why the logic tables became editable, so I can correct things like this?"* | The editor's THEN column read `action`, falling back to `question`, and never `recommendation` — where **55 branches across 8 tables** keep their only instruction. All 55 rendered an **empty box**. |
| *"it's too hard to tell what's required"* | `findCandidate` read `summary \|\| description`. **No record in the 291 has either field** — all carry `purpose`. The line explaining what a suggested document IS has been **blank since the day it shipped**. |
| *(while checking his claim)* | The name matcher splits words on punctuation, so **`Porter's & Pine` never matches the published `Porters & Pine`**, and **`Quickfire Diagnosis Template` never matches `Quick Fire Diagnosis`**. |

🔴 **Every gate passed, all day, on all three.** Gates compare code to code. **Nothing asserts that a
box a human has to read has anything in it.** That is the same family as the Logic-Lab mockup and the
`request-compressed-to-one-line` P1 — and it is now the third session in a row where the finding came
from Mike, not from the suite.

---

## The punctuation fault is OPEN and it is the one to act on

→ [§name-matcher-punctuation-blind](ACTIONS.md#name-matcher-punctuation-blind).

**Three for three: a digit (5 Aug), an apostrophe, a space.** Each reported a real, published
document to Mike as *"Nothing matches"*. The digit alone put **9 rows** on his queue that needed no
ruling and nearly withheld 8 correct sentences.

⚠ **The same `normalise` decides what the runtime gate withholds from live prompts.** Checked: the
affected names sit in `action` and `notes`, which are **not** gated, so **nothing is being wrongly
withheld today**. A trap, not a live fault. **Do not "just fix" it in passing** — it moves a function
the engine depends on and needs its own change and tests.

**The working rule it suggests:** when a name "does not exist", grep the catalogue by hand before
telling Mike. Three for three.

---

## What was recorded, and what is deliberately NOT

**59 of 88 ruled** — 31 pointed at a published title, 16 not-a-tool, 12 flagged. Two committed
artefacts, both built by reading the sentence each name came from and checking `data/templates.json`:

- [`TEMPLATE-CHECK-ALREADY-ANSWERED.md`](TEMPLATE-CHECK-ALREADY-ANSWERED.md) — the 30 that already had
  an answer, 23 of them from **5 August**, which the screen had never seen.
- [`TEMPLATE-CHECK-REMAINING-58.md`](TEMPLATE-CHECK-REMAINING-58.md) — the rest, in three groups.

🔴 **The 29 left are Mike's and must not be guessed.** They are where the catalogue offers two
plausible documents — Sales Tracker **Opt A or Opt B**, COI Development **pt1 or pt2**, which of
**four** Lite Fundamentals. Guessing these is the exact failure the screen was built after.

**Group 3 was FLAGGED, not dismissed** (the master-app file names). Nothing matches them, but
`Get. Invitation Email` and `Get. Bankers Login Email` read like real things an advisor sends. **Where
two answers differ only in whether something real quietly disappears, take the reversible one.**

**Storage note:** rulings live in `data/dev-template-check-rulings.json`, which — unlike every sibling
dev store — is **NOT gitignored**, so it is committed and travels. That was deliberate; the code
comment claiming otherwise is what is wrong →
[§rulings-file-not-gitignored](ACTIONS.md#rulings-file-not-gitignored).

---

## 🔴 Get Seminar: the record's old answer was WRONG, and is struck

`ACTIONS.md` said *"deleting those 7 costs nothing"*. **Mike corrected it**, and both halves of his
correction check out: he placed that material **across Public Speaking** in June
([`SESSION-2026-06-20-IP-DEPTH-AUDIT-NOTES.md`](SESSION-2026-06-20-IP-DEPTH-AUDIT-NOTES.md)), and
[`MENTOR-SAVE-SCOPE-PLAN.md`](MENTOR-SAVE-SCOPE-PLAN.md) confirms a mentor's Logic Tables edits are
inherited by every firm.

**Those 7 lines are his to reword in the app, not a developer's to rule on or delete.** A session that
puts them on his ruling queue has misread the record.

---

## ⚠ Two things a future session should not take on trust

**1 · The screen's suggestion can be confidently wrong, and now there is a worked example.** For
`Lite Fundamentals Data` it offers **Lite Fundamentals** — a framework for *winning engagements* — to
a branch about **poor cash management**, while **Lite Data**, the record about *interpreting data*, is
never mentioned. **The wrong document wins because its title spells better.** Do not treat "Probably
this" as evidence.

**2 · A number written from impression is not a count.** A committed list said *"9 rows genuinely need
you"*. The real figure was **11 names over 20 rows**, plus 2 open since 5 August. Corrected in-file
with the reason visible. Same family as a paraphrase standing in for an artefact.

---

## ☐ Open for Mike

- ☐ **The 13 names on the Template Check screen** — `http://localhost:3000/mentor`, Template Check tab.
- ☐ **Get Seminar's 7 lines** — same hub, **Logic Tables** tab, reword toward Public Speaking.
- ☐ **Rule the labels in [`mockups/template-check-evidence-row.html`](mockups/template-check-evidence-row.html)** —
  three section headings; the verdicts and buttons are unchanged from his 2026-08-05 approval.
- ☐ **Rule the five roll-up labels.** *(Carried 46.)*
- ☐ **Decide `advisor_note`**, and **whether `action` and `notes` should be gated** — recommendation
  remains **no**. *(Carried 45–46.)*
- **Decide the mentor +2 / firm +3 tabs.** *(Carried 42–46.)*
- **Ask the master team for the two role values + which group a manager manages.** *(Carried 39–46.)*
- **Reply to Carl about `npm install`.** · **Raise the export gap — now ELEVEN tools** (7 + Group 3's
  4). *(Carried.)*
- **58 commits unmerged on this branch.** 🔴 **Mike ruled 2026-08-11: no PR to `master` until the task
  list is clear.** Known and accepted — do not re-raise. The branch **is pushed**.

---

## On conflicts

**Shared files touched this session** — the desktop should merge `master` before going near any:

- [`server/routes/firmManager.js`](../server/routes/firmManager.js) — new `_thenFieldOf`; the THEN
  column read and the save write BOTH call it. 🔴 **A conflict here is resolved by keeping the single
  function** — restoring two matching conditions is how `recommendation` gets saved as `action` and
  slips past the tool-name gate.
- [`server/utils/templateCheck.js`](../server/utils/templateCheck.js) — `findCandidate` reads
  `purpose` first.
- [`design/ACTIONS.md`](ACTIONS.md) — four new rows, plus a struck conclusion on Get Seminar.
- **New:** `data/dev-template-check-rulings.json` · two `TEMPLATE-CHECK-*.md` ·
  `mockups/template-check-evidence-row.html` · `tests/unit/templateCheckCandidateText.test.js`.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's**; nothing here went near them.

## Commits

- `d3d99e3` — the 30 rows that already had an answer
- `7ba8427` — the editor blind to `recommendation`, and the corrected Section C
- `a8f066c` — the other 58, and the apostrophe
- `543bbaa` — the first 14 rulings
- `cb9c40c` — 45 more; 59 of 88 settled
- `046933a` — the blank suggestion fixed, and the evidence-row mockup
