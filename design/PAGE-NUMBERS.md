# Page numbers — a task's number is its Handbook page

> **Mike's ruling, 2026-09-23.** In his words: *"i want the handbook and task numbering system
> to better align. from now on - each task is assigned to a feature in the handbook. any new
> feature must be assigned a new page to the handbook. if the 'sales tracker' feature is on page
> 32 in the handbook - all tasks associated with that feature start with 32 so it could be task
> 32.15 - the 15th task on that feature. No number gets reused. The pages in the handbook get
> assigned a number - the number does not need to align with the order in which the page appears
> in the handbook although the handbook will show the page number on that page at all times."*

✅ **APPROVED AND BUILT, 2026-09-23.** The register is the `#` column of
[`features/README.md`](features/README.md) — the file that already drives the Handbook, and
therefore the one home for the numbers. **This file holds the rule and the record only, and never
a second copy of the numbers**; read them there.

---

## 1. The rule

**A Handbook page is a subject. Its number's decimals are the jobs on it.**

- Sales Tracker is page **17**, so a job on it is `17.1`, `17.2`, `17.3` — and nothing that is
  not a Sales Tracker job may start with `17`.
- **A new feature earns a new page.** It cannot take a task number without one. This is the
  half of the ruling that does work nothing did before: a feature could previously ship with no
  page at all and the numbering would not notice.
- **A page number is never reused**, exactly as an item number is never reused. A page that is
  deleted or folded into another spends its number for good.
- **A page number is independent of where the page sits in the Handbook.** The index reorders as
  the product grows; the number does not move with it. The page displays its own number.

## 2. Why the numbers are SEEDED from the twelve subjects, not allocated afresh

**Mike's decision, 2026-09-23, taken against the measurement below rather than an opinion.**

The old scheme's whole numbers are subjects — `7` the AI advisory engine, `15` the Strategy
Planner. Eleven of the twelve already correspond to a Handbook page almost exactly. **Give each
of those pages the number its subject already holds, and not one live task changes number.**

The alternative — numbering all 48 pages from scratch — costs, measured on 2026-09-23 across the
whole repository:

| | |
|---|---|
| quotations of the 32 live task numbers | **192** |
| code files quoting one | **72** |
| briefs and mockups quoting one | **29** |
| live tasks quoted nowhere at all | 11 of 32 |

`15.1` alone is written into **26 code files** — `config/db-schema.sql`, `nuxt.config.js`,
`pages/strategy-planner.vue`, eleven test files. `5.1` is in 19. Rewriting those to chase a
comment is the exact error class [`ITEM-NUMBERING.md`](ITEM-NUMBERING.md) §2 froze the `4.x`
family to avoid: **one mistyped number leaves a permanent lie in the code**, and correcting a
single duplicated number on 2026-09-15 took twenty-six files.

Seeding costs nothing and loses nothing. The two schemes agree on every number already in use.

⚠ **Sales Tracker comes out as 17, not 32.** Mike's `32` was the shape of the idea, not the
value — `17` is the number the Sales Tracker subject already holds in `ITEM-NUMBERING.md` §3, so
seeding hands it straight to the page.

## 3. What this fixes, in evidence rather than argument

A subject is an abstraction a session has to **infer**; a page is a thing you can open. The
inference has failed twice in eight days:

- **`5.4`** was filed under *Model Library* because the currency picker sits on that screen. It
  is a currency job. Moved to `13.1` — `ITEM-NUMBERING.md` records the cause as *"filing by where
  the code lives, not by what the job is about."*
- **`5.3` is wrong today.** *"Test suites collide on a shared dev file and block pushes at
  random"* carries a Model Library number and is a tooling job. It has been in the wrong family
  since it was filed.

With 48 pages against 12 subjects, "there is no right page" becomes rare — and when it happens,
the ruling already answers it: **make a page.**

**What it does not fix.** A job that genuinely spans the app still has to pick one page, and the
pick will sometimes be arbitrary — `16.1`, *"primary buttons show the library's violet where the
brand file says blue"*, touches everything. The scheme makes this rarer, not impossible.

## 4. The register lives in the index, not here

🔴 **[`features/README.md`](features/README.md) — the `#` column. It is the only copy.** A second
one on this page would be a fact with two homes, and the two would disagree inside a month.

**49 pages, numbered 5 to 53 with no gaps.** Thirteen are seeded from the subjects that held them
— `5` Model Library, `7` Advisory Engine, `8` Meeting Review, `9` Outcome Learning, `10` Firm
Manager Hub, `11` Adviser Network, `12` Course Builder, `13` Language & Currency, `14` The
Handbook, `15` Strategy Planner, `16` White-Label & Firm Brand, `17` Sales Tracker, and `6` the
Economic Analysis Prompt. The other thirty-six were allocated from **18** upward in the
Handbook's index order — reproducible, and not a judgement anyone has to defend later.

🔴 **`1`, `2`, `3` and `4` are never allocated.** `2.x`, `3.x` and `4.x` are the closed families of
[`ITEM-NUMBERING.md`](ITEM-NUMBERING.md) §2, with 613 references in 279 code files. `1` is left
free so the range reads as one block.

⚠ **Sales Tracker is 17, not the 32 of Mike's example.** His `32` was the shape of the idea; `17`
is the number that subject already held, so seeding handed it straight to the page.

### The page that was written because of this rule — White-Label & Firm Brand, 16

**Number 16 was the only subject with live tasks and no Handbook page.** It is the white-label
promise — a client's document carrying the advisor firm's own name, colour and logo — and it held
three live tasks: `16`, `16.1` and `16.2`.

Under the ruling a subject with tasks and no page cannot stand, so
[`features/white-label.md`](features/white-label.md) was written and takes 16. Its content was
gathered, not invented: it existed already across `features/strategy-planner.md`, `ARTEFACTS.md`
and `mockups/strategy-plan-firm-mark.html`. **That is the point the ruling makes** — the material
was there and had nowhere to be read.

## 5. What holds it true

Four pieces, all built 2026-09-23.

1. **The `#` column** in [`features/README.md`](features/README.md). The Handbook build already
   read that file for the page set, the titles and the order; it reads the number the same way.
2. **The number on the page.** `scripts/build-handbook.js` renders it in the eyebrow of every
   page, per Mike's *"the handbook will show the page number on that page at all times."* The
   build **refuses** two pages on one number, as it already refuses two pages on one id.
3. **Allocation across the two machines.** `npm run check:branch` reads the index from **every
   branch** and prints the next free page number. Without this the two machines allocate the same
   number blind — the cause of all twelve task-number collisions to date.
4. **[`tests/unit/pageNumbers.test.js`](../tests/unit/pageNumbers.test.js)** — every live task's
   whole number is a real page, no two pages share a number, no page holds two, every page carries
   one, and nothing sits below 5. This is what makes the scheme true rather than merely written
   down: before it, nothing anywhere could be asked whether a task number meant anything.

⚠ **The published Handbook is built from `origin/master`, never from a working tree** (item 4.85,
so that neither machine can erase the other's features). **The numbers appear on the shared page
only once this work merges** — not when it is committed, and not when it is pushed.

---

## Non-Coder Summary

Every Handbook page now has a number, and a task's number says which page it belongs to. Sales
Tracker is page 17, so a job on it is 17.1, 17.2, and nothing else can start with 17. A new
feature has to be given a page before it can be given a task number.

The numbers were seeded from the twelve subject numbers already in use, so **no existing task
changed number** — Strategy Planner keeps 15, the AI engine keeps 7. Numbering afresh would have
meant rewriting 192 references across 72 code files, which is how numbering mistakes get made.

One page had to be written: white-labelling — the advisor firm's name and logo on a client's
document — is number 16, had three live tasks and no page. It has one now.
