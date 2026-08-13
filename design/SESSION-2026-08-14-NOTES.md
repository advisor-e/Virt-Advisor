# Session Notes — 2026-08-14 · Laptop, Session 52

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,221 green / 303 suites**, **0 ahead / 0 behind `origin/feat/advisor-progress`**,
> **14 ahead / 0 behind `origin/master`**.
>
> ⚠ **No application code was touched this session.** Two commits: one script, two tests,
> and design pages. No dev servers were started or restarted.

---

## 🔴 FIRST TASK NEXT SESSION — build the marking mechanism

**Mike ruled on 2026-08-14 that authored commentary in the domain-support data must be MARKED as
ours.** The ruling is recorded; **nothing has been built**. Two pieces of work, in this order:

1. **Design and build the marking mechanism** — where a marked clause lives in the JSON, and how
   the prompt labels it so the AI can tell the firm's method from our commentary about it. Use
   Strategy as the worked example: its nine clauses are listed verbatim, with row and step, in
   [`features/domain-support-provenance.md`](features/domain-support-provenance.md) §4.
2. **Sweep the other 28 domains.** Read each domain's rows beside its own source PDF.

⚠ **The sweep cannot be automated. Do not try again without reading
[`features/domain-support-provenance-history.md`](features/domain-support-provenance-history.md)
§2–3 first.** Three detectors were built here and all three were defeated by paraphrase. The four
controls any future attempt must pass are written down. This is the single most expensive thing in
this session to re-derive.

---

## 🔴 THE ONE THING TO READ — 4.6 has an answer, and it is not the one expected

**The facts are clean.** All 140 marker-carrying claims in the domain-support data — every acronym
expansion, counted list, quotation and named authority — were verified present in the firm's own
115 documents. The AIDCRA row matches its source exactly, confirming the 2026-07-31 correction.

**What was found instead is a layer of authored commentary.** Nine short clauses across seven of
the nine sourced Strategy rows appear in **none** of the firm's documents — glosses explaining why
a step matters (*"rather than one large bet"*, *"not judged after it"*). Most are improvements.
That is the trap: they sit inside the firm's method, in the firm's voice, with nothing to say they
are not the firm's.

**One per row, steadily, with two rows completely clean.** A rate that even is a writing habit, not
a set of accidents — which means it is wherever the same transcription process ran, and it ran
everywhere.

⚠ **The 150–200 app-wide estimate rests on ONE domain of twenty-nine. It is not a count.**

---

## What was built

**`npm run feature "<name>" "<group>" "<summary>"`** — [`../scripts/new-feature.js`](../scripts/new-feature.js).
Writes the Brief, the History and the index row from the standard skeleton, so a feature exists as
a page before it exists as code. Part 3 of Mike's instruction, and the last of the three.

Four refusals, each deliberate: never overwrites a page; refuses a group `features/README.md` does
not already have (a typo would otherwise invent a navigation category that reads as a real one);
refuses a name colliding with the `-history` suffix; and writes nothing until every check passes,
so a refusal never leaves half a feature on disk. Both pages it writes are stubs and **say so at
the top**.

**The guard tests the FOLDER, not the script.** Any Brief anywhere without a History or without an
index row fails the suite, however it got there. **Proven on first real use** — the two provenance
pages were created with the command and the guard picked them up unprompted, +2 tests with no test
code written.

**And [`../tests/unit/buildHandbook.test.js`](../tests/unit/buildHandbook.test.js) stopped typing
its page count.** The literal `25` was correct the day it was written and would have gone red on
the first page the new command added. It now derives the count and asserts the relationship it was
always there for. Verified green at both 25 and 26 pages.

---

## 🔴 A process note worth keeping

**A commit message was mangled by shell quoting** — an apostrophe in *"owner's"* closed the string,
truncating the message mid-sentence and writing a 386 KB stray file into the project root. The
commit's *contents* were correct; only the message was damaged. Fixed by amend, stray file deleted.

**Commit messages are now written to a file and passed with `-F`.** That removes the whole class of
problem. Do not type a multi-line commit message on the command line.

---

## 🖥 FOR THE DESKTOP

**Nothing here went near your ground.** No application code was touched. Logic Lab and the
firm-side logic-table screens remain yours.

**Two things you need:**

1. **`npm run feature` exists now.** When you start a feature, run it first — the Brief and History
   come before the code. It refuses a group name that is not already in `features/README.md`, so
   pass the group spelled exactly as the index spells it (`"Hub pages — mentor & firm"`, long dash
   and all).
2. **`domain-support.md` P2 has changed.** Commentary you author *about* a step the source gives is
   permitted — **and only when marked as ours**. Inventing the firm's *method* is still forbidden,
   unchanged. If you transcribe any source material, do not add unmarked explanatory clauses; that
   is the exact habit this session found nine of.

**Merge `master` before writing any new design document.** Conflict risk is `design/ACTIONS.md`,
which gained four rows at the top.

---

## ☐ Open for Mike — still nine decisions

Unchanged from last session; all nine are on [`features/to-do.md`](features/to-do.md) §2. **Mike
deferred the `v0.8.0` release number deliberately this session** — *"we have more to do before we
send release number"* — so it is not a carried oversight.

---

## Commits

`a871413` · `5c8f92f`
