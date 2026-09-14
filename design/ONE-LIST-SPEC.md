# One List — the to-do list stops being a file on a branch

> **Status: a PROPOSAL for Mike to read. Nothing here is built.**
> Written 2026-09-15 on the desktop, on Mike's yes to *"write the specification"*, after he
> said: *"we are constantly struggling with the to-do list and mixing up tasks and numbers
> between the two computers… I want a no fail option."*

---

## 1. What is actually wrong

The list was built to reduce confusion, and its design is sound. The fault is not in the
rules and it is not in anyone following them badly. **The list lives inside the thing it is
trying to coordinate.**

`design/features/to-do-items.json` is a file on a branch. A branch is invisible to the other
machine until it reaches `master`. So each machine reads its own copy, believes it is *the*
list, and acts on it. Every guard that exists compares that copy against itself.

### The four failures, each traced to code

**1 · Nothing allocates a number.** There is no code anywhere in the repo that picks the next
item ref. It is hand-typed by a session, every time. A search for `nextRef` / `maxRef` /
`Math.max(...)+1` over the to-do code path returns nothing.

**It has happened nine times.** `4.88, 4.89, 4.90, 4.91, 4.92, 4.94, 4.97, 4.98, 4.100` each
name **two unrelated pieces of work**. The ninth was 2026-09-15: both machines filed a
different "4.100" on 2026-09-14. The laptop caught it by hand at startup and renumbered its own
to 4.104 — **twenty-six files changed to correct one number** (`a7b0f6f8`).

**2 · Every uniqueness check is single-branch.** `tests/unit/toDoItems.test.js:208` asserts
`refs` equals `Array.from(new Set(refs))` — one array against itself.
`scripts/apply-to-do.js` rejects a duplicate *within the incoming file*. Neither has ever
opened another branch. As the laptop's own `ref-ceiling.js` header records: *"every past
collision slid through the moment both items closed."*

**3 · `activeOn` is hand-typed and invisible until merge.** Nothing sets it and nothing clears
it. The Handbook control has no UI for it — `handbook-shell.html:1372` passes the value
through unchanged (`activeOn: o.activeOn || null`). The only automation is
`scripts/active-items.js`, which *prints a nag* telling a human to clear it. Today `4.87` reads
`activeOn: desktop` on the laptop's copy and carries no marker at all on the desktop's. **The
field built to stop collisions is itself out of step.**

**4 · The ranking screen reads `master`, and saving from it destroys what it cannot see.**
This is the worst of the four and it was not previously understood.

- `scripts/build-handbook.js:85` defaults its source to `origin/master`; line 134 reads every
  file with `git show master:<path>`. **The Handbook renders master's committed list.**
- Today that is **5 items**. Thirteen are live across the two machines.
- `scripts/apply-to-do.js` `planApply` (L386-408) builds `items` **entirely from the incoming
  saved file**. It is a wholesale replace, not an item-by-item merge. No field is ever carried
  over from the current file.
- Therefore: rank on the Handbook, save, apply — and every item the other machine added since
  master, and every `activeOn` it set, **is overwritten without a word.**

There is a fifth, smaller one worth fixing while we are here: the browser export emits a fixed
key whitelist (L1357-1376) that omits `kind`, which `validate()` requires — so a browser-saved
file would fail the gate on every item.

### Why no amount of care fixes this

Every gate passes green on both machines while the lists disagree. The machinery cannot see the
thing it is checking. **This is not a discipline problem, so a new rule will not solve it.**

The proof: the laptop diagnosed exactly this on 2026-09-14 as item **4.101** and built the
numbering half — `scripts/ref-ceiling.js`, which reads every machine's branch and prints the next
free number. It works. It is on the laptop's branch, **not on master and not on the desktop.**
This machine ran the startup checklist on 2026-09-15 with the old 230-line script and could not
tell. *The fix for the problem is trapped by the problem.*

---

## 2. What replaces it

**One list, on the Handbook artifact's own shared database.** Not a file on any branch. Both
machines read and write the same rows, live.

| Failure today | What replaces it |
|---|---|
| Numbers hand-typed, nine collisions | The shared list issues the number under a lease. Two machines **cannot** get the same one. |
| Three diverging copies | One list. There is nothing to diverge. |
| `activeOn` hand-edited, invisible until merge | Claiming an item writes the claim **instantly, for both machines**. |
| Saving overwrites what it cannot see | Nothing to overwrite. Rows are edited in place, not replaced as an array. |
| Handbook shows master's 5 of 13 items | It shows the list, because it *is* the list. |

### What stays exactly as it is

This is deliberately a change of **where the list lives**, not of what the list is or how it
works. Unchanged: the five required fields, the word caps, the 1-5 score, the `kind` gate
refusing a feature nobody asked for, the `askedBy.ours` honesty field, Mike's hand-ranked order,
the archive on `to-do-done-and-parked.md`, and the rule that an item is not removed until its
closure is written.

`design/features/to-do-items.json` **stays in the repo as a generated snapshot**, written on
every shutdown. The git history keeps working, the existing tests keep running against it
unchanged, and if the shared list is ever unreachable the file is still there to read. It stops
being the source and becomes the record.

---

## 3. How it works

### 3.1 Where the rows live

The Handbook artifact already has a database (`capabilities: {db: {}}`). One document per item:

```
items/4.97      → { ref, name, kind, score, why, risk, askedBy, touches,
                    note, comment, waitingOn, blocker, blocks,
                    activeOn: { machine, since } | null,
                    rank: <integer>, status: 'live' }
meta/counter    → { highest: 104 }          ← the number issuer
meta/order      → { orderedByMikeOn, orderSource }
```

Documents are shared by default: every viewer reads and writes, and changes arrive live via
`onSnapshot`. A declaring artifact is organisation-internal, so only signed-in members of your
own organisation can ever open it.

### 3.2 Issuing a number — the part that must not fail

⚠ **The store is last-writer-wins with no transactions, and its own documentation warns:
*"Do NOT build monotonic counters from read-modify-update — a retried write can apply twice."***
A naive read-then-write counter would reintroduce the exact bug we are removing.

The store provides `acquire({holder, ttlMs})` for precisely this — a cooperative single-writer
lease. Allocation is:

1. `meta/counter.acquire({ holder: '<machine>-<session>', ttlMs: 10000 })`
2. If `acquired` is false, another machine is mid-allocation — wait and retry. This is a normal
   outcome, not an error.
3. Read `highest`, write `highest + 1`, create the item document at that ref.
4. The lease expires on its own; there is no release step.

Both machines using `acquire` is what makes it safe. **This is the one piece of the design that
carries real risk if done casually, and it is called out here so it is not.**

### 3.3 Claiming an item

Pressing **Pick this up** on a row writes `activeOn: { machine, since }` to that document. The
other machine's open Handbook shows it within seconds — no merge, no push, no handover note.
Pressing it again, or settling the item, clears the field. It stops being a thing a session
remembers to type and becomes a consequence of doing the work.

### 3.4 The screen

Your existing ranking control is already the right screen. It gains four things:

- it reads live rows instead of data baked in at build time;
- **Pick this up** / **Put it down** on each row;
- a **Claimed by** column that is true now rather than true-on-one-branch;
- **+ Add an item** gets its number from §3.2 instead of a person typing one.

Drag-to-rank, scores, calls and comments behave as they do today. **Save the list** stops being
a download-then-apply round trip: a change is saved when you make it. That removes the whole
class of failure in §1.4.

### 3.5 The snapshot back to the repo

`npm run to-do` gains a mode that reads the shared list and writes
`design/features/to-do-items.json` plus the generated table on `to-do.md`. Shutdown runs it, so
every commit still carries an accurate record of the list at that moment, and
`tests/unit/toDoItems.test.js` and `applyToDo.test.js` keep guarding it exactly as they do now.

---

## 4. What this does NOT fix, stated plainly

- **It does not merge the two lists for you.** §5 is a decision only Mike can take.
- **It does not stop two machines editing the same code.** It makes the claim visible
  immediately, which is as far as a list can go.
- **It needs the browser open to claim an item.** A session working with the Handbook closed can
  still take something unclaimed. The snapshot in the repo remains the fallback record.
- **A ninth collision cannot be undone.** `4.88`–`4.94` already name two items each in the
  archive. This stops the tenth; it does not tidy the past.
- **It is one more thing that can be offline.** If claude.ai is unreachable, the repo snapshot is
  read-only truth until it is back. That is strictly better than today, where the copies are
  wrong *while everything is up*.

---

## 5. 🔴 The one decision that is yours before anything is built

The two lists must become one, and they disagree. Thirteen items across two machines:

| Ref | On | Name |
|---|---|---|
| 4.15 | both + master | The 14 branches that still name a page nobody can open |
| 4.58 | both + master | Meeting Review — three non-coding gates |
| 4.86 | both + master | Adviser Network runs on nine invented people |
| 4.87 | both + master | Learning from outcomes across consenting firms |
| 4.96 | desktop + master | The add-a-report skill points at the frozen ACTIONS.md |
| 4.97 | desktop only | The engine's middle, and the learning loop made true |
| 4.93 | desktop only | Read this for me — plain guidance and an AI reading |
| 4.98 | desktop only | A second opinion from two AI providers |
| 4.99 | desktop only | A part-measured lab run overwrites a full one |
| 4.101 | laptop only | Startup is blind to the other machine's branch |
| 4.103 | laptop only | Load a payroll report to pre-fill the team |
| 4.104 | laptop only | Wages/Salary Review — labour margin and a gated register |

⚠ **`4.87` is claimed by the desktop on the laptop's copy and unclaimed on the desktop's.** One
of those is wrong and only you know which.

**The merged list is yours to approve item by item and to rank.** It is not mine to guess, and
guessing it would be the same fault in a new place.

---

## 6. Build order

| Step | What | Gate |
|---|---|---|
| 0 | ✅ **DONE 2026-09-15 — PR #93.** The numbering half (`4.101`, now **14.2**), cherry-picked narrow off master. The next number is a read, not a guess | — |
| 1 | The shared list on the Handbook db: documents, live read, the lease-based number issuer | — |
| 2 | Seed it from the merged list of §5 | **Mike approves the merge** |
| 3 | Pick up / put down, and the Claimed by column | — |
| 4 | The snapshot back to the repo; shutdown writes it | — |
| 5 | Retire the download-and-apply round trip | — |

Roughly a day, step 0 excepted — that is minutes.

---

## Non-Coder Summary

Your to-do list isn't one list — it's three copies (desktop, laptop, shared), and each computer
only sees its own. That's why numbers clash: nothing in the code picks the next number, a person
types it, and nine numbers now mean two different jobs. It's also why "which computer is on this"
can't be trusted. And the worst part, which we only found today: **the Handbook page you rank
tasks on is reading the old shared copy — 5 tasks when 13 are really live — and saving from it
wipes out the ones it couldn't see.**

The fix is to stop keeping the list as a file that travels with the code, and put it on the web
where both computers read and write the *same* list at the same instant. Numbers get handed out
by the list itself so they can't clash. Picking up a job shows on the other computer straight
away. Everything else — your scores, your order, the rules about what makes a real task — stays
exactly as it is, and a copy still gets saved into the code each day for the record.

**One thing needs you before we build:** the two lists have to be merged into one, and they
disagree on thirteen items. That's your call to make, not ours to guess.
