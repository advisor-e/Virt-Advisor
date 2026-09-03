---
description: Start-of-session checklist — sync with master, prove the tests are green, surface open work
---

Run the start-of-session checklist from `design/WORKING-AGREEMENT.md`. Work through it
in order and report the result of each step in plain English. Mike is non-technical —
end with a short Non-Coder Summary.

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

---

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

4. **What is open?** Read **`design/features/to-do-items.json`** — the ten live items
   themselves — and **BOTH handover notes**: `design/HANDOVER-desktop.md` and
   `design/HANDOVER-laptop.md`, one per machine. Yours is the one matching the branch from
   step 1; the other machine's is what stops the two divisions treading on each other.
   Report the two or three things most likely to be today's work, saying for each whether
   it waits on Mike, on us, or on someone outside. Do not start any of them.

   **An item whose `activeOn` names the other machine is off limits.** Say which item and
   which files, and do not touch them this session. That field exists because item 4.54 was
   built on both machines in one week (Mike, 2026-09-03). Step 2's `npm run check:branch`
   prints an **ACTIVE ITEMS** box for this: the other machine's items with their files, and
   any item marked active on THIS machine that a later handover never mentioned — a session
   ended without saying whether it was still in hand. Put that one to Mike before anything
   else, and clear or keep the field on his word.

   **Say so if the other machine's note is stale.** Its date against today's is the only
   signal that the other division has been idle, or ended a session without writing one.

   **Read the JSON, not `to-do.md`.** The page is 850 lines of standing explanation
   wrapped around a generated ten-row table; the JSON *is* the list, and the page is
   rebuilt from it. Same information, a fraction of the reading. Open the page only if
   Mike asks why an item is worded as it is.

   **Not `design/ACTIONS.md`.** It is a **frozen archive** as of 2026-08-24 — history,
   not a work list. Nothing is added to it and nothing is triaged from it. An item found
   there is a claim to check against the code, never a status.

   **There are no session-notes files any more.** 85 of them exist from before
   2026-08-24 and stay as history; none is written now, and none needs reading. The
   handover lives in one place, above.

5. **If the branch is behind master, propose catching it up** — merge `origin/master`
   in, then run the full test suite to prove the merge broke nothing. State the commit
   counts and what would come across. Wait for Mike's yes before merging.

Then stop and ask what he wants to work on. Do not begin work in the same message.
