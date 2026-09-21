# Item numbering — a number says what a job belongs to

> **Mike's ruling, 2026-09-15.** In his words: *"if we have a task open which is say — number
> 4 — then any other job directly related to that becomes 4.1 or 4.2 etc. The ONLY jobs to get
> a number starting with '4' must belong directly to the initial task."*

---

## 1. The rule

**A whole number is a subject. Its decimals are the jobs that belong to it.** Nothing else may
carry that whole number.

- `7` is the AI advisory engine. `7.1`, `7.2`, `7.3` are jobs on the engine — and nothing else
  ever starts with `7`.
- A new job on an existing subject takes the next free decimal of **that subject's** parent.
- A job that belongs to no existing subject is a new parent, taking the next free whole number.
  A new parent is a real event: it means the product grew an area it did not have.

## 2. Why the old numbers are frozen, not rewritten

Every item numbered before 2026-09-15 **keeps the number it has.** They are history and they are
read as history.

This is not tidiness deferred. **613 references to these numbers are written into 279 code
files** — comments like:

```js
//- ── Tab: Country Rate Schedules (item 4.92) ──────────────
//- ── Tab: Depreciation Rates (item 4.78) ──────────────────
```

Renumbering the past means editing all of them to chase a comment. One mistyped number leaves a
permanent lie in the code, and the cost is known: correcting a *single* duplicated number on
2026-09-15 took **twenty-six files** (`a7b0f6f8`). That is the same error class this rule exists
to remove, multiplied.

**So: the `2.x`, `3.x`, `4.x` and `5.1`–`5.5` families are closed.** They were a flat serial
scheme wearing a hierarchy's clothes — 85 of 90 archived items are `4.x` and share no subject at
all. `4.90` names *Retirement Review* and *"only 250 of about 2,800 published classes are kept"*.
The `4.` meant nothing; it is retired rather than pretended into order.

⚠ **`5.1`–`5.5` are five deleted items from 2026-08-15, not children of parent 5.** They predate
this rule. Parent **5** below is Model Library; its children start at `5.1` and the collision is
in name only, because the old five are deleted, recorded on `to-do-done-and-parked.md`, and
nothing references them. Anyone reading a `5.x` from before this date is reading the old scheme.

## 3. The parents

Taken from what the 121 items inventoried on 2026-09-15 actually are, not from a guess.

| # | Subject | What belongs here |
|---|---|---|
| **5** | **Model Library & report models** | Every report screen and its maths: property, High/Mid-Level Budget, Retirement, Stock Purchasing, Sales Dashboard, Wages/Salary, Volatility, saved reports |
| **6** | **Forecast & economic analysis** | The three-way forecast, its intake, the economic-analysis prompt and its research |
| **7** | **AI advisory engine** | Domains, logic tables, templates, primary issues, distinctions, prompts, the narrative, AI providers |
| **8** | **Meeting Review** | Recording, consent, transcription, the two reports, meeting types |
| **9** | **Outcome Learning & case reviews** | Case outcomes, the pooled learning, the benches, the Scenario Lab, the trace |
| **10** | **Firm Manager Hub & tier cascade** | The four hubs, their tabs, the cascade, firm overlays, the staircase |
| **11** | **Adviser Network / Collaborate** | The people layer, groups, messaging |
| **12** | **Course Builder & quizzes** | Courses, quiz banks, CPD, advisor progress |
| **13** | **Language, Tax & Currency** | Country rates, schedules, tax bands, compliance pages · **and everything about the words a reader sees and the money a figure is in**: the locale files, the languages, the translation route, the currency setting and the currency list |
| **14** | **Tooling & process** | The Handbook, this list, branch checks, skills, the test suite, governance |
| **15** | **Strategy Planner** | The strategy domain's session surface: the planning menu, capture tables, carry-forward, the client plan report, facilitation observation points |

**16 is taken and 17 is the Sales Tracker. 18 is the next free parent.**

### 🔴 2026-09-22 — parent 13 renamed, because localisation had no home

**Mike's ruling, in his own words: *"rename 13 to be Language, Tax & Currency"*.** It was
*Depreciation, tax & compliance rates*.

**The gap it closes.** Language and currency had **no parent at all**, despite owning a Brief
([`features/localisation-and-currency.md`](features/localisation-and-currency.md)) — eight locale
files, 28 languages, six currencies, a translation route and a manager-gated currency setting, and
nowhere on this list to put a job about any of it. Every other Brief maps to a parent; that one
mapped to none.

**What that produced, and it is why this is recorded rather than just done.** On 2026-09-22 item
`5.4` — the currency wording line — was filed under **5, Model Library**, for the weak reason that
the currency *picker* sits on the Model Library screen. **That is filing by where the code lives,
not by what the job is about**, which is exactly the drift §1 exists to stop. When there is no right
parent, a session picks the nearest one and the number stops meaning anything.

**Why 13 rather than a new parent 18.** 13 already held country-specific *money* rules — tax bands,
rates per country. Language and currency are the same family of concern: what a figure is
denominated in, and what words surround it. A new parent would have split one subject across two
numbers.

✅ **`5.4` MOVED TO `13.1` the same day, and the freeze rule does not stop it.** §2 freezes items
numbered **before 2026-09-15**; `5.4` was filed on 2026-09-22, referenced in two documents written
the same hour and in no code at all. Moving it cost two edits. **Had it been left a week it would
have been frozen in the wrong place for good** — which is the argument for renaming the parent the
moment the gap is seen rather than at a tidier time.

*(`5.4` also collided with a deleted 2026-08-15 item of the same number — see §2's note on the
closed `5.1`–`5.5` family. Permitted by that ruling, but it makes the move doubly worth doing.)*

**New jobs about language, tax, rates or currency take `13.x`.**

## 4. The live items, renumbered 2026-09-15

Only the 14 live items moved. Every closed item stayed where it was.

| Was | Now | Item |
|---|---|---|
| 4.104 | **5.1** | Wages/Salary Review — labour margin, and a register gated on due diligence |
| 4.103 | **5.2** | Load a payroll report to pre-fill the team |
| 4.15 | **7.1** | The 14 branches that still name a page nobody can open |
| 4.97 | **7.2** | The engine's middle, and the learning loop made true |
| 4.98 | **7.3** | A second opinion from two AI providers |
| 4.93 | **7.4** | Read this for me — plain guidance and an AI reading on the mentor's pages |
| 4.58 | **8.1** | Meeting Review — two non-coding gates before a first real recording |
| 4.87 | **9.1** | Learning from outcomes across consenting firms |
| 4.99 | **9.2** | A part-measured lab run overwrites a full one |
| 4.86 | **11.1** | Adviser Network runs on nine invented people |
| 4.96 | **14.1** | The add-a-report skill still points sessions at the frozen ACTIONS.md |
| 4.101 | **14.2** | Startup is blind to the other machine's branch |

⚠ **`4.93` and `4.96` each named two different jobs.** The closed one keeps the number; only the
live one moved. `4.93` in the code means **Mid-Level Budget** (closed) — those comments are
correct and must not be touched. `4.96` is closed on the laptop's branch and live on the
desktop's; the live one becomes `14.1`.

### 🔴 2026-09-19 — `7.12` was OVERWRITTEN, not duplicated. It is put back; the new job is `7.13`

**This is not a collision, and reading it as one is how it nearly went through.** Nobody filed a
second `7.12`. On 2026-09-18 the desktop took the live row and pointed its number at different
work — the whole change to the list was one line:

```diff
-  "name": "The right calculator is offered only sometimes, and sometimes the wrong one is",
+  "name": "The model's page is recalled by the AI, not looked up",
```

| Number | Job | Outcome |
|---|---|---|
| `7.12`, asked 2026-09-16 | The right calculator is offered only sometimes, and sometimes the wrong one is | **restored** — still open at 4 of 6 |
| `7.13`, asked 2026-09-18 | The model's page is recalled by the AI, not looked up | **takes the free number** |

🔴 **THE FIRST ROW IS THE POINT. `7.12` IS PUT BACK, NOT RENUMBERED.** The model-offer defect is
unfixed, has no closure entry, and after that commit existed nowhere on the desktop's list. Had
its branch merged, an open defect would have been **deleted from the shared list with no trace**.
Recording this as a renumbering would have documented the deletion rather than undone it.

**The desktop applies both halves** — the rows are on that machine's branch and this one must
never edit them. Mike's ruling, given 2026-09-19.

**Why it beat every gate, and what now stops it.** One row, one file, one machine: no number
appeared twice, so `toDoItems.test.js` passed, and both machines held the identical file, so
`check:branch` had nothing to compare. **Every control we had asks whether the two machines
disagree; none asked whether a number had quietly changed meaning.**
[`tests/unit/itemIdentity.test.js`](../tests/unit/itemIdentity.test.js) now does, at commit time,
on the machine making the change. It guards **the date a job was asked for, never its name** —
measured over 414 commits, a live item's `name` changed 40 times in 60 days as work progressed,
while the asked-on date raised three alarms in 3,693 comparisons and not one false one. The other
two it caught were `7.5` and `4.67` below.

### 🔴 2026-09-18 — both machines' `7.9` turn out to be ONE fault, and `7.9` is spent

**This is not a renumbering, and that is the point.** Both machines filed a `7.9` on 2026-09-16,
from the same instruction of Mike's, over the same 30 live `discover` calls, naming the same files.
The laptop read it as **absence** (8 of 19 calculators never offered); the desktop read it as
**unreliability** (the template right every run, the calculator beside it varying). **Two readings
of one fault.**

| Machine | Wording | Outcome |
|---|---|---|
| desktop, filed 2026-09-16 | The right calculator is offered only sometimes, and sometimes the wrong one is | **survives, as `7.12`** |
| laptop, filed 2026-09-16 | Eight of nineteen calculators are not offered | **folded in; `7.9` is spent** |

⚠ **The desktop renumbered its copy to `7.12` before the ruling could be applied**, so Mike's
decision — given against *`7.9` vs `7.9`* — was **put to him again against *`7.9` vs `7.12`*** and
confirmed. A session does not decide what he meant once the numbers have moved underneath him.

🔴 **`7.9` IS SPENT AND IS NEVER REISSUED**, exactly as if it had been closed. §2's rule applies:
a number is used up the moment it is used, whatever became of the item. The closure is on
[`features/to-do-done-and-parked.md`](features/to-do-done-and-parked.md); the evidence is in
[`features/advisory-engine.md`](features/advisory-engine.md) P2.

### 🔴 2026-09-16 — the desktop's `7.5` becomes `7.10`, ruled by Mike

**Both machines filed a `7.5` a day apart, for two unrelated engine jobs.** Neither could see
the other: nothing had reached `master` since 13 September.

| Machine | Item | Outcome |
|---|---|---|
| laptop, filed 2026-09-15 | Nothing records which calculation model the AI named | **keeps `7.5`** |
| desktop, filed 2026-09-16 | A page's templates are hidden behind whichever won the ID | **becomes `7.10`** |

**Why that way round, and not the other.** The laptop's is quoted in fifteen-plus places —
`config/db-schema.sql`, `nuxt.config.js`, `server/advisorEngine.js`, `server/utils/modelChoiceScan.js`,
`server/utils/activityLogger.js`, `server/restify-server.js`, four test files,
`design/mockups/model-choices.html` and two Briefs. The desktop's is one day old and lives in
`server/utils/semanticProfiles.js` and its test. Moving the cheaper one is the whole of the
reason; neither job is more important than the other.

**`7.10` is the number `npm run check:branch` prints as the next free decimal of subject 7,**
and it is reserved for this. **The desktop applies it** — the item is on that machine's branch
and this one must never edit it. Until it is applied the clash box names it every session,
which is the point: it stays visible instead of being remembered.

### Code comments updated with the live items

Four files name a live item and were corrected in the same change. Nothing else in the 279 was
touched.

| File | Was | Now |
|---|---|---|
| `scripts/ref-ceiling.js` | item 4.101 | item 14.2 |
| `scripts/check-branch-state.js` | item 4.101 | item 14.2 |
| `tests/unit/refCeiling.test.js` | item 4.101 | item 14.2 |
| `utils/reportModelSummaries.js`, `utils/reportModels.js` | item 4.15 | item 7.1 |
| `tests/unit/toDoItems.test.js` | item 4.58's comment | item 8.1's comment |

## 5. What this fixes, and what it does not

**Fixes.** A number now tells you what a job belongs to. And it dissolves a collision that was
waiting regardless: the laptop closed `4.96` while the desktop still had it live, and the desktop
added `4.94b` and `4.97`–`4.100` in the same space — **merging those two branches would have
collided on 4.94 and 4.96 under any scheme.**

**Does not fix.** The eleven historic collisions stand: `4.81, 4.88, 4.89, 4.90, 4.91, 4.92, 4.94`
each name two unrelated jobs in the archive, and `4.93`/`4.96` name one closed and one live.
They are recorded here so nobody re-derives them as a fault.

**Fixed 2026-09-16, after `7.5` collided anyway.** The ceiling built on 2026-09-14 answers
*"what new **parent** is free"* — and the rule at the top of this page, made the day after,
turned almost every new job into a **decimal of a subject that already exists**. Nothing
compared those across branches, so the box could truthfully print *"highest in use 14.2 /
14.1"* on a morning when `7.5` named two unrelated jobs, one per machine. That was the
twelfth collision.

`npm run check:branch` now prints three things instead of one, and **every number is taken
from there, never from your own branch**:

- the next free **parent**, for a subject that has none;
- the next free **decimal of every open subject**, read across every branch — and never a
  decimal of the closed `2.x`, `3.x`, `4.x` families, whatever looks free in them;
- **any number that already names two different jobs**, with both titles and both branches,
  so it is settled before the branches merge rather than after.

The eleven above are listed as recorded history and get one quiet line, not a warning — a
box that repeats the same names every morning is a box nobody reads.

---

## Non-Coder Summary

A job's number now tells you what it belongs to. The AI engine is 7, so every engine job is 7.1,
7.2, 7.3 — and nothing that isn't an engine job can start with 7. Ten subjects, listed above.

Old finished jobs keep their old numbers. They're quoted in 613 places inside the code, and
rewriting those would cause exactly the kind of mistake this is meant to stop — one wrong number
this morning already cost 26 files to put right. So the old numbering is closed off as history
and the new scheme starts today, with the 14 live jobs moved onto it.
