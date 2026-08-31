# The Handbook — the History

## Why it exists at all

The current rule and the historical argument that produced it used to sit on the page with equal
weight — that is how drift kept winning: they looked the same. The full case is in
[`README.md`](README.md), *Why this exists*.

The split into a **Brief** (current rules) and a **History** (everything else) was made on
2026-08-13, 24 pages in one session. Six of the eleven Mentor Hub tabs had never had a page of
their own. Collaborate turned out to be a whole application rather than a feature and was split
into three.

## The rebuild that produced most of these rules

**2026-08-13.** The generator lived in a session-scoped temporary folder, and a note recorded that
it had been deleted when that session ended. It had not. It was still on the machine, and `find`
located it in four seconds — **after** a replacement had already been written from a prose
description of the page: a different palette, the History promoted out of its gate into a separate
page, and the reload-survival of edits lost entirely.

Every check passed throughout, because **every check compares the code to the note, and nothing
compared the build to the artefact.** The rule requiring an artefact to be committed before
approval already existed and did not fire, because the design had no footprint in the repository
at all — nothing referenced it, so nothing could notice it was missing.

Mike's reaction is the rule in §2.1: *"no point us going to all the work to develop a mockup if
you make up your own [design] anyway when it comes time to finish the task."*

**What was done instead of arguing:** the shell was restored and proven identical to the
original's output, and the rebuild's value was kept where it was real — the index-driven
navigation, the guards, the tests.

## Faults in the original generator, fixed rather than preserved

1. **It typed its 24 pages and their groups into the script by hand.** A new Brief stayed
   invisible until somebody remembered it — and the groups had *already* drifted from the index.
   Hence rule 3: the index is the single source.
2. **It substituted its slots with `String.replace`**, which fills the first match only — a
   412 KB page, no error, and nothing on screen. `substitute()` now counts occurrences and
   refuses to build otherwise.

## What was tried and rejected

- **Publishing the rebuilt design to a second link so the two could be compared.** Rejected: two
  Handbooks is the failure, not the comparison.
- **Fetching the published page to recover the design.** It would have pulled 400 KB of content
  back through the session and returned the text, not the stylesheet — the wrong tool for the
  question.
- **A document restating "always check the artefact".** That is what already existed. The
  register and the pin test replaced it, because a document is what failed.

## Two deliberate departures from the original's output

- **The nav link now carries its status dot.** The rail's own legend explains "never opened" and
  "not opened in 3 weeks", and the stylesheet styles them, but the original emitted no element —
  so neither mark could ever appear.
- **The two drifted group names now follow the index.**

## Known gap

`[../i18n-*](../)` in [`localisation-and-currency-history.md`](localisation-and-currency-history.md)
stays a dead relative link, because the rewrite needs at least one character after `../`.
Identical in the original. Pinned as a ⚠ CURRENT BEHAVIOUR test rather than quietly changed.

## 2026-08-15 — the To-Do page becomes a control, and Mike breaks it three times in an afternoon

The list stopped being a table you read and became a screen you use. It took three rebuilds in one
day, and **every fault that mattered was found by a person using it, not by the forty-one tests
guarding it.** That is the whole lesson of this entry.

### What it is

The Handbook's To-Do page renders [`to-do-items.json`](to-do-items.json) as a working control —
score, **Proceed / Done / Park / Delete**, a comment on every row — in place of §1's ranked table.
The generator refuses to ship both: two copies of Mike's own ranking with nothing on screen saying
which is stale is precisely what the item existed to end. **Save** writes the list back as data,
and `npm run to-do -- <file>` applies it.

### The row that vanished, and the rule it produced

He marked an item **Park**; the row sank out of sight before he could type the reason.

> *"The handbook is clunky and confusing — I see the chances of a fuck-up occurring… this is very
> poor design."*

He was right, and **both faults were ours, not the mockup's.**

- **Settled rows sank to the bottom.** Taken faithfully from
  [`../mockups/to-do-list-table.html`](../mockups/to-do-list-table.html). In use it is exactly
  backwards: the moment you settle an item is the moment you need to write *why*, and the box has
  just left the screen.
  🔴 **An approved artefact is approved for how it looks, not for how its logic behaves against
  real data.** Check the behaviour too.
- **A two-button choice — "use the project's list" or "keep mine" — with no way to compare them.**
  That was ours, never in the mockup. A decision with no information attached to it, where either
  answer could throw away work.

His rule, now Brief rule 7: **"nothing leaves my sight in terms of order etc until I click save."**
Nothing moves as a side effect; a sort heading is the only thing that reorders, says so while it
does, and undoes in one click. The reason for a settled item is asked for **where he decides it**.
The two-button choice was replaced by a merge that discards nothing and reports what changed.

The guard is mutation-verified: reintroducing the exact `renderAll()` he hit turns the suite red.

### The thing the control was for

Its first real use closed three items and produced the day's most useful finding. `npm run to-do`
**refused to apply anything** — not the order, not the scores — because two items were leaving with
no closure recorded, and printed the blocks that needed writing. That refusal is the feature.

It also settled a four-session-old item in one message, by showing Mike the actual sentences
instead of asking him about a label again. 🔴 **The label was the blocker, not the decision.**

---

**Brief:** [`handbook.md`](handbook.md)
