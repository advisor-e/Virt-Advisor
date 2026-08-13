# The Handbook — the Brief

**Every feature page in this folder, readable as one navigable page.** It is the front door:
sessions start by opening it, work is picked from the to-do page inside it, and a new feature
begins as a page in it before any code is written.

---

## 1. What it is made of

| | |
|---|---|
| **The content** | Every `*.md` file in [`design/features/`](README.md). Nothing else. |
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

## 3. Reading and editing it

Mike reads the page and edits directly on it. Edits survive a reload — they are held in the
browser — and **Save** exports only what changed (which page, what it said, what it now says) as
a file in Downloads, which is applied to the markdown by hand.

**Edits live in one browser on one machine.** Save and send them before switching machines.

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
