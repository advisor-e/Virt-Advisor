---
description: End-of-session checklist — tests green, work committed and pushed, handover note left for the other machine
---

Run the end-of-session checklist from `design/WORKING-AGREEMENT.md`. Work through it in
order and report each result in plain English. Mike is non-technical — end with a short
Non-Coder Summary.

---

## 🔴 HOW WE WORK HERE — read this before the checklist (Mike's ruling, 2026-08-24)

**We write quality, concise, purposeful code.** Every line must earn its place — and so
must every test and every sentence of documentation.

**This code is tested by people in UAT before it ever reaches production.** A test earns
its place when it catches what UAT cannot: a wrong number, an unsafe permission, a
malformed AI response. A test that checks what a person would notice in five seconds on
screen is work we do twice.

**The same rule governs what we write down. One fact, one home.** A Brief says how the
product works *now* — when something changes, replace the old sentence rather than adding
a new one beneath it.

---

**The LIVE-APP / repo-change rule in `CLAUDE.md` still applies.** Every step that writes,
commits, or pushes needs Mike's explicit yes for that specific step. Ask one question at
a time and wait for the answer.

1. **What changed?** List every modified, added and deleted file, with a one-line plain
   English description of what each change does. If anything is there that Mike did not
   approve, say so plainly rather than folding it into the commit.

2. **Is it green?** Run the full test suite and report the pass count. If anything fails,
   stop — report the failure and do not propose committing. A red suite is never pushed.

3. **Is the Handbook up to date?** It is the front door, so it is updated first.

   🔴 **THREE WRITE-TARGETS, AND ONLY THREE** (Mike's ruling, 2026-08-24). It used to be
   seven, and six copies of a fact are six chances to drift. If what you are about to
   write does not belong in one of these three, it does not get written.

   a. **The Brief in `design/features/` — how the product works NOW.**
      🔴 **A Brief is EDITED, NOT APPENDED TO.** When a rule changes, find the sentence
      that is now wrong and **replace it**; the superseded text goes to that feature's
      history page, which already exists behind the gate. Do not add a new section
      beneath the old one. *(Measured 2026-08-24: these pages were running at a 94–96%
      append rate — 528 lines added to Report Models against 19 removed — which is how a
      specification quietly turned into a diary of every session that touched it.)*
      If a Brief now disagrees with the code, that is a defect to report — never a
      reason to reword the Brief to match a drift.
   b. **`design/features/to-do-items.json` — what is left.** The list itself, not the
      page: `npm run to-do` rewrites `to-do.md` from it. Anything finished today MOVES
      to `to-do-done-and-parked.md`; it is not ticked and left. Anything discovered today
      is written as *something a person does* — a hazard recorded as a warning is not a
      task, and that is how one fault survived being described five times.
      **An open question for Mike is an item on this list**, never a line in a note.
   c. **The commit message — what happened today.** That is the permanent record, and
      unlike a note nobody can fail to find it.

   ⛔ **`design/ACTIONS.md` is FROZEN as of 2026-08-24. Add nothing to it.** At 7,448
   lines it had become unreadable enough that `/startup` already warned sessions away
   from it. It stays as searchable history.

   ⛔ **Do not write a session-notes file.** 85 exist from before this ruling and stay as
   history; none is written now. They were never asked for by any checklist — they
   accumulated to 11,990 lines by habit, and they did not work: on 2026-08-23 two open
   questions for Mike were written into one and reached no list, surfacing only because
   the next session happened to read a file nobody was obliged to read.

   Propose the updates; do not write them unasked.

4. **Propose the commit.** Draft the commit message and show it. Wait for approval.

5. **Propose the push.** Push **this machine's own branch only** — never the other
   machine's branch, and never `master` directly (the pre-push hook will block both).
   Wait for approval.

6. **Leave the handover — in `design/HANDOVER.md`, one file, replaced each session.**
   One session's worth: where the work stopped, what is half-finished, and what the other
   machine needs to know. Keep it under about 20 lines. This is what stops the two
   divisions treading on each other, and it is the *only* narrative file a session writes.

   It carries one session because the previous handover has already been acted on by the
   time you write yours — and because a file that only ever grows is the exact mechanism
   that produced 85 session-notes files nobody read. Anything worth keeping beyond
   tomorrow belongs in the Brief or on the to-do list, not here. Earlier handovers stay
   in git history if they are ever wanted.

If anything is left uncommitted or unpushed at the end, say so explicitly and explain
what would be lost if the machine were not opened again for a week. Never end a session
implying everything is safe when it is not.
