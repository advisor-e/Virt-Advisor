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

**Every decision point is one recommendation and one yes/no question** (Mike's ruling,
2026-09-04). Say what you recommend, say why, ask one question a bare yes or no answers.
Never two options. No exceptions.

## 🔴 FIND IT → SAY IT → ASK → FIX IT. NEVER PARK IT. (Mike's ruling, 2026-09-14 — binding)

In his words: *"you find a problem then ignore it and leave it for later — fucking bring it
to me every time you find it, ask the question and get it fixed."*

**A problem found during this checklist is fixed during this checklist, not written into the
handover.** Say it in one or two sentences, ask the one question you need, fix it on his yes.

⛔ **A handover note is not a parking space, and this is where that habit shows up.** If you
are about to write *"⚠ still outstanding…"*, *"worth fixing next session"*, or *"I've left it
alone"* about something you found today and could have fixed today, **stop and put it to Mike
instead.** A handover carries what the next session needs to KNOW — the branch, what changed,
what is genuinely blocked on somebody else. It does not carry work you chose not to do.

**Item 4.96 is the proof.** An AI-written line pointing every report build at a frozen archive
sat in three consecutive laptop handovers before it ever became an item — and when it finally
was one, its scope said *"one sentence in one file"* and it was four. Three sessions saw it,
three sessions wrote it down, none of them asked.

🔴 **EVERY FAULT ENDS ONE OF TWO WAYS — FIXED NOW, OR FILED ON THE LIST WITH HIS YES** (Mike,
2026-09-15). **`CLAUDE.md` holds that rule in full.** At shutdown it has a specific bite: before
writing this handover, take every fault you found today and check each one reached one of those
two endings. Anything that reached neither is a question you still owe Mike — ask it now, not
in the note.

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
      **`activeOn` says which machine is on an item.** Any item this machine picked up
      today carries `{ machine, since }`; keep it if the work is still in hand, clear it if
      the item is finished or dropped. Never set it for the other machine.
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

6. **Leave the handover — in THIS MACHINE'S OWN file, replaced each session.**
   `design/HANDOVER-desktop.md` on the desktop, `design/HANDOVER-laptop.md` on the laptop,
   matched to the branch. **Never write the other machine's file** — the same rule as the
   branch you push, and for the same reason: it is not yours to overwrite.

   One session's worth: where the work stopped, what is half-finished, and what the other
   machine needs to know. Keep it under about 20 lines. This is what stops the two
   divisions treading on each other, and it is the *only* narrative file a session writes.

   ⛔ **DO NOT WRITE THAT THE OTHER MACHINE'S NOTE IS STALE** unless the **OTHER BRANCHES**
   box of `npm run check:branch` said so this session. The copy in your working tree is
   frozen at your last merge and looks weeks old when it is not. *Six consecutive desktop
   handovers carried this accusation, the last on 2026-09-16 — after the laptop had rebutted
   it in writing. A handover is read by the other division; a false charge in it costs them
   a session's trust and teaches the next session to repeat it.*

   It carries one session because the previous handover has already been acted on by the
   time you write yours — and because a file that only ever grows is the exact mechanism
   that produced 85 session-notes files nobody read. Anything worth keeping beyond
   tomorrow belongs in the Brief or on the to-do list, not here. Earlier handovers stay
   in git history if they are ever wanted.

If anything is left uncommitted or unpushed at the end, say so explicitly and explain
what would be lost if the machine were not opened again for a week. Never end a session
implying everything is safe when it is not.
