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

## 🔴 FIND IT → SAY IT → ASK → FIX IT. NEVER PARK IT. (Mike's ruling, 2026-09-14 — binding)

In his words: *"you find a problem then ignore it and leave it for later — fucking bring it
to me every time you find it, ask the question and get it fixed."*

**The moment you find something wrong, it stops being an observation and becomes the next
thing you do.** Not a line in the report at the end. Not "worth noting". Not a loose end
listed under a Non-Coder Summary. Not "I've left it alone" — that sentence is the failure.

1. **Say it, in one or two sentences**, as soon as you find it.
2. **Ask the one question** you need answered to fix it — one recommendation, one yes/no.
3. **Fix it on his yes**, then carry on with what you were doing.

**This includes anything you find while doing something else** — a stale note, a wrong
figure, a comment that contradicts the code, a claim in a Brief that is no longer true.
Especially those: they are found by accident and lost the same way.

**Why this is binding.** On 2026-09-14 a session reported that item 4.104's note still
listed a question Mike had answered that morning, and then wrote *"I haven't touched it"*
— in the same breath as naming it. The whole day had been spent removing exactly that kind
of stale sentence from seven other places. **Reporting a defect is not handling it.** An
observed problem that is written down and left is worse than one never found, because the
record now says somebody looked.

**Every decision point is one recommendation and one yes/no question** (Mike's ruling,
2026-09-04). Say what you recommend, say why, ask one question a bare yes or no answers.
Never two options. No exceptions.

---

**The LIVE-APP / repo-change rule in `CLAUDE.md` still applies throughout.** Steps 1, 2 and
4 are read-only. Step 3 republishes Mike's own private Handbook link — he asked for that to
happen every session (2026-08-13), so it needs no fresh approval. Step 5 changes files, so it
needs Mike's explicit yes before you run it — propose it, do not perform it unasked.

⚠ **Step 3 IS NOT read-only, and this used to say it was.** `npm run handbook` regenerates
`design/CODE-SIZE.md` — a rolling count of the codebase, computed at build time and never
typed — so **the working tree comes back dirty from running this checklist.** The file is
generated, not authored, and its header records the commit it was measured at. Say so when
reporting step 3, and put it to Mike with the session's other changes: the pre-commit hook
refuses any commit that leaves a modified tracked file behind, so it cannot simply be
ignored. *(Found 2026-09-12, when that hook blocked a commit over it.)*

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

   Why this is a step and not a courtesy: the Handbook is rebuilt from `origin/master`
   every time — not from this machine's branch — so both machines publish the same page
   and neither can erase the other's features (item 4.85). Overwriting the published
   version is therefore always safe. The line under the title says which master commit it
   came from and how many commits each machine still holds beyond it; read those counts
   out. If the build reports a page under "Unlisted", say so — the index has forgotten a
   page.

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

   **Say so if the other machine's note is stale — and `npm run check:branch` now tells you
   from the right copy.** Its **OTHER BRANCHES** box prints that machine's handover date read
   from *that machine's own branch*, beside its last commit date, and says outright when the
   note is older than the work. Take it from there.

   🔴 **Do NOT judge staleness from `design/HANDOVER-desktop.md` in this working tree.** That
   copy is frozen at the last merge, so it can be days behind the real note while looking
   perfectly fine — it exists, it parses, it has a date. That is exactly how a session
   reported the desktop idle on 2026-09-14 when its note was two days newer, and again on
   2026-09-15. Read the file for its *content* by all means; take its *date* from the check.

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
