# The Handbook — the Brief

**Every feature page in this folder, readable as one navigable page.** It is the front door:
sessions start by opening it, work is picked from the to-do page inside it, and a new feature
begins as a page in it before any code is written.

---

## 1. What it is made of

| | |
|---|---|
| **The content** | Every `*.md` file in [`design/features/`](README.md), plus any document in `design/` that the index lists with a `../` row — read where it lies, never moved. |
| **The navigation** | Read from [`README.md`](README.md) — its headings are the groups, its table rows the entries. |
| **The design** | [`scripts/handbook-shell.html`](../../scripts/handbook-shell.html) — an approved artefact. |
| **The generator** | [`scripts/build-handbook.js`](../../scripts/build-handbook.js), run with `npm run handbook`. |
| **The scaffolder** | [`scripts/new-feature.js`](../../scripts/new-feature.js), run with `npm run feature`. |
| **The published page** | One URL, recorded in [`ARTEFACTS.md`](../ARTEFACTS.md). |

## 2. The rules

1. **The design is not redrawn.** `handbook-shell.html` is what Mike approved. Its palette,
   width, card radius, gate and edit bar are pinned by
   [`tests/unit/buildHandbook.test.js`](../../tests/unit/buildHandbook.test.js) — change the look
   and the suite goes red naming the file. A change to the design is made *in that file*, on
   Mike's instruction, and the pinned values follow.
2. **There is one Handbook, at one address.** Build, then republish to the URL in
   [`ARTEFACTS.md`](../ARTEFACTS.md). Publishing without it creates a second Handbook and the
   bookmarked one silently stops updating.
3. **The index is the single source of the navigation.** A page missing from `README.md` still
   appears — under *Unlisted* — and the build says so. It is never dropped silently.
4. **Every Brief has a History**, and the History renders behind a gate at the foot of the Brief,
   never as a page of its own. The gate carries the line *"If this and the page above disagree,
   the page above wins."*
5. **A new feature starts here.** Its Brief and History exist before its code does, and
   `npm run feature "<name>" "<group>" "<one-line summary>"` creates all three — the Brief, the
   History and the index row — from the standard skeleton. It refuses to overwrite a page, and
   refuses a group `README.md` does not already have, so a typo cannot invent a navigation
   category. Both pages it writes are stubs and **say so at the top**; that warning is deleted by
   whoever fills them in. Adding a page by hand is still allowed — but
   [`tests/unit/newFeature.test.js`](../../tests/unit/newFeature.test.js) fails if any Brief ends
   up without a History or without a row in the index, however it got there.
6. **Rules established in a session are written into the Brief that same session.** A rule left
   in a session note is a rule nobody will find.
7. 🔴 **Nothing on a Handbook screen may move as a side effect of what Mike does.** His rule,
   2026-08-15: *"nothing leaves my sight in terms of order etc until I click save."* An action
   changes only the thing it acted on. Reordering happens because he asked for it, says so on
   screen while it applies, and undoes in one click. Pinned by
   [`buildHandbook.test.js`](../../tests/unit/buildHandbook.test.js) and mutation-verified against
   the bug that produced the rule — see [`handbook-history.md`](handbook-history.md).
8. 🔴 **Never make him choose between two states he cannot compare.** Where his work and the
   repository disagree, they are merged — his copy wins, in his order — and the difference is
   *reported*. Nothing of his is discarded, so there is nothing to ask.
9. 🔴 **A comment Mike leaves on a LIVE item is an INSTRUCTION, and it survives the round trip.**
   His words go back into [`to-do-items.json`](to-do-items.json) as `comment`, and the control
   reads them back onto the screen the next time he opens it, so a note written weeks ago is
   still in the box. **Both halves are required** — a save that keeps it and a load that blanks
   it is the same fault twice.
   ⚠ **A comment on an item he SETTLES is different and already worked:** `closureBlock()` carries
   it onto [`to-do-done-and-parked.md`](to-do-done-and-parked.md) under *"Mike's own words"*, so
   it survives the item.
   **Why this is a rule and not an implementation note (2026-08-21).** Discarding a live item's
   comment was deliberate, and a test named *"strips his call and comment — they are decisions,
   not schema"* defended it. That reasoning is right for a settled item and was never right for
   an open one: a live item's comment is the only thing on the whole round trip that says what he
   wants done. On 2026-08-15 he wrote *"get this done, it doesn't rely on me and should never
   have been parked"* on 4.7, *"if this is just a handover note - get it done"* on 4.12, and
   *"draft the email you want me to send Carl"* on 3.5. All three were applied, all three sets of
   words discarded, and **six days later all three items were still open and still reading
   "waiting on Us"** — because no session after that one could see he had said anything. Nothing
   went red: every gate compares generated prose to the data, and nothing compared the data to
   what he actually said. Fixed in `838f3a0`; guarded by a round-trip test in
   [`applyToDo.test.js`](../../tests/unit/applyToDo.test.js) that applies a comment, feeds the
   list back through the way the control does, and proves the words are still there.
10. **A document a generator writes or a test guards is listed with a `../` row, never moved
   into this folder.** `CONTENT-ROUTING.md` is written by `npm run routing`, `ARTEFACTS.md` is
   guarded by a test, and `WORKING-AGREEMENT.md` is named in `CLAUDE.md`, `README.md`, both slash
   commands, a skill and a script. A documentation tidy-up does not get to put those at risk.
   **And this folder holds feature Briefs only** — every page in it must have a History behind
   the gate (rule 4), so a reference table belongs in `design/` and is listed from there.
   `HUB-PAGE-PURPOSES.md` was moved in on 2026-08-16 and
   [`tests/unit/newFeature.test.js`](../../tests/unit/newFeature.test.js) caught it; it went back.

## 3. Reading and editing it

**There are two Saves, and they do different things.** Both write a real file to Downloads.

| | The edit bar | The ranking control |
|---|---|---|
| **Where** | Bottom right of every page | The top of the To-Do page only |
| **What it edits** | Any prose — click the text and type | The live to-do list: score, **Your call**, a comment per row |
| **What Save writes** | `handbook-changes.txt` — which page, what it said, what it now says | `to-do-items.json` — the whole list as data |
| **How it is applied** | By hand, to the markdown | `npm run to-do -- <file>` |

The ranking control renders in place of §1's ranked table on [`to-do.md`](to-do.md) — the two
never both appear, and the build stops if they would. What it will not do is let an item leave the
list quietly: `npm run to-do` applies **nothing at all** until a settled item's closure is written
on [`to-do-done-and-parked.md`](to-do-done-and-parked.md), and prints the block that needs writing.

Edits survive a reload — they are held in the browser. **They live in one browser on one machine.**
Save and send them before switching machines.

## 4. How it opens

[`/startup`](../../.claude/commands/startup.md) builds it, republishes it, opens it, and hands
over the link. Because it is rebuilt from committed markdown every session, the page cannot drift
from the repository — and overwriting the published version is therefore always safe.

[`/shutdown`](../../.claude/commands/shutdown.md) updates it first: rules into the Brief,
finished work moved off [`to-do.md`](to-do.md), then [`ACTIONS.md`](../ACTIONS.md) as the record.

## 5. What it is not

It is not the record. [`ACTIONS.md`](../ACTIONS.md) holds the full history of every task and
finding and stays that way. The Handbook holds the current rules and the live list.

---

**See also:** [`to-do.md`](to-do.md) — the live list ·
[`README.md`](README.md) — the index that drives the navigation ·
[`ARTEFACTS.md`](../ARTEFACTS.md) — the register of approved artefacts.

**History:** [`handbook-history.md`](handbook-history.md)
