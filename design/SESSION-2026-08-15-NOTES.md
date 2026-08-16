# Session Notes — 2026-08-15 · Laptop, Session 56

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,229 green / 305 suites**, lint 0 errors, **35 ahead / 0 behind `origin/master`**.
>
> ⚠ **Application code WAS touched, but only by REVERSION** — four files restored to their
> exact pre-`90b673d` state, plus one dead handler deleted from `advisorEngine.js` and one
> character changed in `scripts/build-handbook.js`. No new feature code was written.
>
> **Net: 1,362 lines added, 3,550 deleted.** That is the shape of the whole day.

---

## 🔴 FIRST TASK NEXT SESSION — the release, and now the email that unblocks it

Unchanged for the third session running, and Mike ranked it **#1 himself** this time.
`v0.8.0` is tagged, pushed, and **nobody outside has been told it exists.**

What is new is that the integration questions are now written down:
[`MASTER-TEAM-INTEGRATION-EMAIL.md`](MASTER-TEAM-INTEGRATION-EMAIL.md). **Do not re-derive
it** — five questions, every answer a value typed into `config/integration.js`.

---

## What happened — five commits, and the day is one story

**Mike asked who had requested a feature. Nobody had.** That question ran through everything.

| Commit | What |
| --- | --- |
| `f3aeb58` | The authored-commentary sweep deleted entirely — documents, tasks and code |
| `70874dd` | 31 to-do items audited against the code; 16 survived. `STATUS.md` and its generator deleted |
| `a9ee30b` | §2.2 (the four hub tabs) deleted — a mismatch with a drawing is not a defect |
| `0aa0132` | The scored, editable work queue, committed as an artefact *before* Mike saw it |
| `f1c8143` | Mike's own Proceed / Done / Park calls applied, plus the master-team email |

---

## 🔴 The lesson, and it is the most valuable thing this session produced

**An AI session wrote an observation into `ACTIONS.md`. A later session read it as a task.**

The line was *"the blast radius was never measured."* Nobody asked for it. The real defect —
the A.I.D.C.R.A expansion — was Mike's own find, corrected by him on 2026-07-31, with the
follow-up **deferred in writing**. Two weeks later that sentence was picked up, measured, and
**came back clean: all 140 checkable claims verified present.** Having found nothing, the sweep
pursued a writing-style question instead and grew into a Brief, a mockup, a marking mechanism, a
29-domain read and a 49-item batch — then reached Mike at the top of a startup report, **above
his own standing ruling that this exact sweep must not hold a release.**

Then it happened a second time the same day, with the four hub tabs, from a mockup cell.

**The cause is structural, not carelessness.** The old list recorded who each item was *waiting
for* and never who *wanted* it. Once written down, an AI's observation and Mike's instruction
looked identical on the page.

> *"Unless I specifically asked for it, unless it meets all my criteria for building a better
> app, I want it deleted — off the list, not parked."*

> *"Why would you park them!? That would mean they're still in the system."*

---

## What the list is now

**Ten live items, in Mike's own order**, from the mockup he marked up himself. Every item carries
five fields: **Score · Why · Risk · Asked by · Touches.** `Asked by` is the one that matters —
four items honestly say **⚠ ours**, and have to justify themselves.

**The score:** 5 security/data · 4 user worse off · 3 helps sell it · 2 robustness · 1 internal ·
**0 = deleted, with its code.** Order is **blockers first, then score**, and **Mike's call beats
both** — where they disagree the score stays visible so the disagreement is on the page.

**Mike settled four items himself, and corrected my framing doing it.** I had MySQL, the
middle-tier logins and the firm membership data as blockers waiting on the master team. They are
not blockers — the master app already provides all of it, and our side only had to offer the
connection point. **Verified in the code before writing it down:** `config/integration.js` is that
point, `server/utils/db.js` is a pool reading it, `firmAuth.js` has exactly one `jwt.verify()`
call site, and the two middle-tier roles are empty strings that **fail closed**.

⚠ **One technical detail is genuinely open** and is question 5 of the email: a *manager's own*
group arrives in their token and works today; mapping *a firm* to its brand and country needs a
source we do not have. `parentScopeOf()` returns the platform scope until then — flat, never a guess.

---

## 🖥 FOR THE DESKTOP — merge `master` before touching any of these

**Six code files changed, five of them by reversion. If you have work in any, expect conflicts.**

1. **`components/firm/FirmDomainSupport.vue`** — restored to pre-`90b673d`. The whole
   *"This is our wording"* marking control, its two computeds and its styles are **gone**.
2. **`components/FirmManagerHub.vue`** — two lines reverted (same commit).
3. **`server/utils/domainSupport.js`** — `livingCommentary()` and the AI prompt block are gone.
4. **`data/strategy-domain-support.json`** — nine `authored_commentary` entries removed.
5. **`locales/en.json`** — five keys removed (`markedLabel`, `markButton`, `markHint`,
   `markSelected`, `unmark`). Nothing else touched.
6. **`server/advisorEngine.js`** — the `__none_of_these__` handler deleted; unreachable since
   its only caller went on 2026-08-14.

**Deleted outright — do not resurrect:** `design/STATUS.md`, `scripts/generate-status-table.js`,
`tests/unit/statusTable.test.js`, the `npm run status` script, three `authoredCommentary*` test
files, `DOMAIN-SUPPORT-SWEEP-PROGRESS.md`, `features/domain-support-provenance.md` + its history,
and the mockup `domain-support-authored-commentary.html`.

**`scripts/build-handbook.js`** — one character in `relink()` (`[^"]+` → `[^"]*`), fixing the one
dead link in the Handbook. Its pinning test flipped from *"does not yet convert"* to *"converts"*.

🔴 **`design/features/to-do.md` is restructured, not edited.** It leads with a ranked table and
carries a scoring system. **Do not overwrite it from an older copy** — Mike's own calls are in it.

**Untouched:** Logic Lab and every firm-side logic-table screen.

---

## ⚠ Honest limits

1. **The mockup's round-trip does not work and I said so late.** Mike's edits live in his
   browser's local storage; **no session can read them.** The only route back is the **Save**
   button, which puts the list in a box he copies and pastes. Checked: only `downloads` and `mcp`
   runtime capabilities are available — **there is no shared store**, so no version of that page
   can save somewhere we can read.
2. **The guard test is NOT built, deliberately.** A test failing the build when an item is
   missing one of the five fields is the control this needs. It waits on Mike settling the shape,
   so it gets written once. `to-do.md` §2 says so plainly rather than describing it as if it exists.
3. **`0aa0132` and `f1c8143` were committed without asking Mike for that specific commit** — the
   first because the Save-the-Artefact rule requires the artefact to exist before he approves it,
   the second because his marked-up table read as the instruction. Both were judgement calls;
   flagged at shutdown rather than left silent.

---

## ☐ Open for Mike — four decisions, down from ten

All on [`features/to-do.md`](features/to-do.md), in his order:

1. **Send the master team the release number** (#1, his own ranking) — and
   **send the integration email** while he is there.
2. **`advisor_note`** — a real instruction in his own logic tree that reaches the AI nowhere.
3. **Seminar's seven lines** — reword toward Public Speaking.
4. **The education-gate wording** — his own design, needs the on-screen words.

Plus **4.4**, which is one 30-second click only he can do: open the Handbook, edit a word,
reload, confirm it survives. No browser automation on this machine.
