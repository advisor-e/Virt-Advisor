---
description: Start-of-session checklist — sync with master, prove the tests are green, surface open work
---

Run the start-of-session checklist from `design/WORKING-AGREEMENT.md`. Work through it
in order and report the result of each step in plain English. Mike is non-technical —
end with a short Non-Coder Summary.

**The LIVE-APP / repo-change rule in `CLAUDE.md` still applies throughout.** Steps 1, 2 and
4 are read-only. Step 3 writes nothing to the repository and republishes Mike's own private
Handbook link — he asked for that to happen every session (2026-08-13), so it needs no fresh
approval. Step 5 changes files, so it needs Mike's explicit yes before you run it — propose
it, do not perform it unasked.

1. **Where am I?** Report the current branch, whether the working tree is clean, and
   whether the branch matches the machine's expected branch (desktop → course builder,
   laptop → `feat/advisor-progress`). If the tree is dirty, list what is uncommitted
   and stop for instructions — never start new work on top of unexplained changes.

2. **How far off master am I?** Run `npm run check:branch`. Report the ahead/behind
   counts. Behind is the number that matters: it is what silently became 97 commits and
   left the master team unable to test course builder.

3. **Open the Handbook.** Run `npm run handbook`, republish the generated file to the
   EXISTING Handbook artifact (pass its URL — never create a second one), open that URL
   in Mike's browser, and give him the link in your reply.

   Why this is a step and not a courtesy: the Handbook is rebuilt from committed markdown
   every time, so doing it here means the page **cannot** drift from the repository. It
   also means overwriting the published version is always safe. If the build reports a
   page under "Unlisted", say so — the index has forgotten a page.

4. **What is open?** Read `design/features/to-do.md` — the live list — and the most recent
   session-notes file in `design/`. Report the two or three things most likely to be
   today's work, saying for each whether it waits on Mike, on us, or on someone outside.
   Do not start any of them.

   **Not `design/ACTIONS.md`.** That is the full record and stays so, but it is 6,000+
   lines and reads as about seventy open tasks when the real list is nineteen. It is not
   the front door. An item taken from it is a claim to check against the code, never a
   status.

5. **If the branch is behind master, propose catching it up** — merge `origin/master`
   in, then run the full test suite to prove the merge broke nothing. State the commit
   counts and what would come across. Wait for Mike's yes before merging.

Then stop and ask what he wants to work on. Do not begin work in the same message.
