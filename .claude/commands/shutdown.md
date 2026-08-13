---
description: End-of-session checklist — tests green, work committed and pushed, handover note left for the other machine
---

Run the end-of-session checklist from `design/WORKING-AGREEMENT.md`. Work through it in
order and report each result in plain English. Mike is non-technical — end with a short
Non-Coder Summary.

**The LIVE-APP / repo-change rule in `CLAUDE.md` still applies.** Every step that writes,
commits, or pushes needs Mike's explicit yes for that specific step. Ask one question at
a time and wait for the answer.

1. **What changed?** List every modified, added and deleted file, with a one-line plain
   English description of what each change does. If anything is there that Mike did not
   approve, say so plainly rather than folding it into the commit.

2. **Is it green?** Run the full test suite and report the pass count. If anything fails,
   stop — report the failure and do not propose committing. A red suite is never pushed.

3. **Is the Handbook up to date?** It is the front door, so it is updated first.

   a. **Rules established today go into that feature's Brief in `design/features/`, this
      session.** A rule left in a session note is a rule nobody will find. If a Brief now
      disagrees with the code, that is a defect to report — never a reason to reword the
      Brief to match a drift.
   b. **`design/features/to-do.md` is the live list.** Anything finished today MOVES to
      `to-do-done-and-parked.md`; it is not ticked and left. Anything discovered today is
      written as *something a person does* — a hazard recorded as a warning is not a task,
      and that is how one fault survived being described five times.
   c. **Then `design/ACTIONS.md`**, which stays the full record: items closed, new findings,
      anything discovered but not fixed.

   Propose the updates; do not write them unasked.

4. **Propose the commit.** Draft the commit message and show it. Wait for approval.

5. **Propose the push.** Push **this machine's own branch only** — never the other
   machine's branch, and never `master` directly (the pre-push hook will block both).
   Wait for approval.

6. **Leave the handover.** State in one or two lines where the work stopped, what is
   half-finished, and what the other machine needs to know. This is what stops the two
   divisions treading on each other.

If anything is left uncommitted or unpushed at the end, say so explicitly and explain
what would be lost if the machine were not opened again for a week. Never end a session
implying everything is safe when it is not.
