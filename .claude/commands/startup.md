---
description: Start-of-session checklist — sync with master, prove the tests are green, surface open work
---

Run the start-of-session checklist from `design/WORKING-AGREEMENT.md`. Work through it
in order and report the result of each step in plain English. Mike is non-technical —
end with a short Non-Coder Summary.

**The LIVE-APP / repo-change rule in `CLAUDE.md` still applies throughout.** Steps 1–3
are read-only and need no approval. Step 4 changes files, so it needs Mike's explicit
yes before you run it — propose it, do not perform it unasked.

1. **Where am I?** Report the current branch, whether the working tree is clean, and
   whether the branch matches the machine's expected branch (desktop → course builder,
   laptop → business performance report). If the tree is dirty, list what is uncommitted
   and stop for instructions — never start new work on top of unexplained changes.

2. **How far off master am I?** Run `npm run check:branch`. Report the ahead/behind
   counts. Behind is the number that matters: it is what silently became 97 commits and
   left the master team unable to test course builder.

3. **What is open?** Skim `design/ACTIONS.md` for P1 items and anything marked in
   progress, and read the most recent session-notes file in `design/`. Report the two or
   three things most likely to be today's work. Do not start any of them.

4. **If the branch is behind master, propose catching it up** — merge `origin/master`
   in, then run the full test suite to prove the merge broke nothing. State the commit
   counts and what would come across. Wait for Mike's yes before merging.

Then stop and ask what he wants to work on. Do not begin work in the same message.
