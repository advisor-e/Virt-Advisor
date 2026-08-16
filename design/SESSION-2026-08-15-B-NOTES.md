# Session Notes — 2026-08-15 (B) · Laptop, Session 57

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,273 green / 306 suites**, lint 0 errors, **38 ahead / 0 behind `origin/master`**.
>
> ⚠ **No application code was touched.** Two new files (`to-do-items.json`, its test) and
> edits to six documents. `server/`, `components/`, `pages/` and `store/` are untouched.
>
> 🔴 **One uncommitted line is Mike's, not ours:** a blank line in
> `design/features/report-models.md` from having the file open in his editor. Left alone
> deliberately — it is his to keep or drop.

---

## 🔴 FIRST TASK NEXT SESSION — phase 2 of the ranking control

**Mike ranked it #1 himself** and asked for the work to be **split across two or three sessions
so it cannot be lost again**. It was lost once already: session 56 designed the ranking system,
ran out of context, and never coded it in.

**Phase 1 is done and pushed.** Phase 2 renders the control on the Handbook's To-Do page instead
of prose. **Measured against [`mockups/to-do-list-table.html`](mockups/to-do-list-table.html) —
approved by use, since Mike set the current order with it — and every deviation from it must be
named before it ships.** The three phases are written into
[`features/to-do.md`](features/to-do.md) §6 under 4.14, with phase 1 ticked, so this survives
even if this note is not read.

**Rank 2 is still the release, and it is Mike's** — `v0.8.0` tagged, pushed, nobody outside told.
The integration email is already drafted at
[`MASTER-TEAM-INTEGRATION-EMAIL.md`](MASTER-TEAM-INTEGRATION-EMAIL.md). **Do not re-derive it.**

---

## What happened — one commit, and one question that undid a day's plan

**Mike asked "who is this function for?" and the answer deleted the job.**

The session opened with §4.13 — *make a silent save failure loud* — sitting third on the list at
**SCORE 5, data integrity**. It was real: with no database reachable, every store writes a local
JSON file and the screen says *Saved*. All 108 call sites route through one gate,
`devFallbackAllowed()`.

Three fixes were proposed across four messages: a warning banner, then blocking writes, then
reworded save confirmations. **All three were wrong**, and the second would have taken away Mike's
ability to save anything on this laptop to fix a wording problem.

His question exposed why. That gate can only fire where there is **no database at all** — a
developer machine. **UAT has MySQL. Production has MySQL**, and production mode refuses the
fallback outright, which `UAT-LOAD-PACK.md` §5 already instructs. No adviser, firm or client can
ever reach it.

> *"I know I'm in a development role… the UAT and production have MySQL connected — I know this,
> you know this, why are we wasting time?"*

**Deleted, with its reasoning**, at [`features/to-do-done-and-parked.md`](features/to-do-done-and-parked.md)
§0 — including a red block naming all three wrong fixes so none is re-proposed. **No code was
touched:** the v0.8.0 half in `server/utils/dbFailure.js` catches a write a *live* MySQL refused,
which does bite in UAT and production, and it stays.

---

## 🔴 The lesson — and it is a sharper version of session 56's

Session 56 learned that *an AI observation written down looks identical to Mike's instruction*, and
built the **`Asked by`** field to stop it. §4.13's `Asked by` field already said ⚠ **ours**.

**The field worked. Nobody read it.** It was scored 5 by the people who found it, ranked by them,
and put in front of Mike as the third job on his list.

> **A score given by whoever found the thing is not a priority — it is the finder's own opinion
> wearing a number.**

That is now written into [`features/to-do.md`](features/to-do.md) §7, where the next session will
find it. **The field is not enough on its own; something has to read it.**

---

## What was built — phase 1

**[`features/to-do-items.json`](features/to-do-items.json)** — the ten live items as data, each
carrying score · why · risk · **askedBy** · touches, plus who it waits on and whether it blocks
anyone. **Array order is Mike's ranking**, stated in the file's own header.

**[`../tests/unit/toDoItems.test.js`](../tests/unit/toDoItems.test.js)** — 44 tests. Refuses an
item missing any of the five fields, a score outside 1–5 (a 0 is deleted with its code, never
filed), an `askedBy.ours` claim with nothing justifying it, a duplicate ref, and a blocker that
does not say what it blocks. It also cross-checks the JSON against the ranked table in `to-do.md`,
so the two copies cannot drift until phase 3 generates one from the other. **It pins the order**,
so no script and no session can re-sort the list into score order behind Mike's back.

**Mutation-verified, not merely green:** dropping `risk` from 4.12 → caught. Claiming `ours` with
an empty detail → caught. Filing a 0 instead of deleting → caught.

🔴 **`to-do.md` §2 said *"Not yet enforced… it is not built."* That is now corrected** — the page
had begun to contradict itself the moment the guard shipped.

**New item 4.14 — the ranking control itself — is scored 1 and ranked first.** Honestly 1: no
customer will ever see the Handbook. First because Mike asked for it now. **The disagreement is
written on the page** rather than hidden by inflating the score to justify the position.

---

## ⚠ The finding nobody has agreed to act on

**Only 4 of the 26 Handbook Briefs have ever been checked against the code.** All 20 core pages
were written in **one sitting on 2026-08-13**, from 120 design documents totalling 25,566 lines.
Session 51's own notes record that two Briefs nearly shipped stale claims taken from plans rather
than code, caught by opening a component rather than by any process.

**Two of the first two pages checked today were wrong:**

- `model-library.md` said advisors pick *"from nineteen models"*. `utils/reportModelCatalogue.js`
  holds **eighteen** — 9 ready, 9 coming. Break-Even was folded into *Margin · Mark-up ·
  Break-even* on 2026-07-13 and the Brief never followed.
- `report-models.md` told a coder that **`SliderGroup`** covers four screens. **No such component
  exists anywhere in the code.** It is `components/base/SliderField.vue` — and the same Brief named
  it correctly twenty lines later, so the page contradicted itself. The wrong name was also in the
  build recipe at `ADDING-A-REPORT.md`. The *"four screens"* was right.

Both corrected. Mechanically checked as well: **219 file links across 27 Briefs, 2 broken** —
`tier-cascade.md` → `collaborate.md` (that page was split into three and the link never repointed)
and `to-do-done-and-parked.md` → `STATUS.md` (deleted 2026-08-14). **Neither is fixed.**

**A page-by-page verification of the remaining 22 was proposed and Mike redirected to the ranking
work instead.** It is therefore **deliberately not on the to-do list** — nobody outside asked for
it, and §7 says such an item must justify itself before it is filed. It is recorded in
[`ACTIONS.md`](ACTIONS.md) under the session-57 closures as a live gap. **Raise it with Mike; do
not start it unasked.**

---

## 🖥 FOR THE DESKTOP

**No application code changed. Nothing of yours was touched** — Logic Lab, the firm-side
logic-table screens, every component and every server file are exactly as you left them.

**Six documents changed**, and only one is likely to conflict:

1. 🔴 **`design/features/to-do.md` — do not overwrite from an older copy.** It now leads with a
   ranked table of ten, carries Mike's own ordering, and §2 records the guard as built.
2. **`design/features/to-do-items.json` — NEW, and it is now the source.** Edit the JSON, not the
   table. A missing field fails the build.
3. `design/features/to-do-done-and-parked.md` — 4.13's deletion and its reasoning.
4. `design/ACTIONS.md` — a session-57 block at the top; the old §4.13 line keeps its wording with
   the ruling appended beneath it.
5. `design/features/model-library.md` + its history · `design/features/report-models.md` + its
   history · `design/ADDING-A-REPORT.md` — the two corrections above.

**If you are mid-way through a report screen:** the component is `SliderField`, not `SliderGroup`.
`REPORT-SCAFFOLDING-PLAN.md` still says otherwise and is left as a record of its own date.

---

## ☐ Open for Mike — four, unchanged

All on [`features/to-do.md`](features/to-do.md), in his order:

1. **Send the master team the release number** (rank 2) — and the integration email with it.
2. **`advisor_note`** — a real instruction in his own logic tree that reaches the AI nowhere.
3. **Seminar's seven lines** — reword toward Public Speaking.
4. **The education-gate wording** — his own design, needs the on-screen words.

Plus **4.4**, the 30-second click only he can do: open the Handbook, edit a word, reload, confirm
it survives. Still no browser automation on this machine.

---

## ⚠ Honest limits

1. **Phase 2 and 3 are not started.** The ranking control still exists only as the standalone
   mockup, whose Save puts text in a box to copy out. Mike's ranking still reaches the repository
   by hand.
2. **22 Briefs remain unverified against the code**, and the sample size that has been checked is
   two, both wrong. Do not treat an unchecked Brief as fact.
3. **The two broken Brief links are known and unfixed.**
