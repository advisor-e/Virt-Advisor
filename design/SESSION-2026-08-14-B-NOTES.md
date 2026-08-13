# Session Notes — 2026-08-14 (B) · Laptop, Session 53

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, no stashes, suite
> **5,251 green / 306 suites**, **0 ahead / 0 behind `origin/feat/advisor-progress`**,
> **18 ahead / 0 behind `origin/master`**.
>
> ⚠ **Application code WAS touched this session** — unlike session 52. Three files:
> `server/utils/domainSupport.js`, `components/firm/FirmDomainSupport.vue`,
> `components/FirmManagerHub.vue`. No dev servers were started or restarted.

---

## 🔴 FIRST TASK NEXT SESSION — sweep the 28 domains

**The marking mechanism session 52 asked for is BUILT.** What is left is the reading job, and it
is the whole of item 4.6 now:

1. **Read each domain's rows beside its own source PDF.** Order by weight — Seminar, EOY, Sales &
   Marketing after Strategy.
2. **Record what you find** as an `authored_commentary` entry beside that material's `steps`. The
   shape and the rules are [`features/domain-support-provenance.md`](features/domain-support-provenance.md)
   §4.1. Copy the clause **exactly**.
3. **Run `npx jest tests/unit/authoredCommentary.test.js` after each domain**, not at the end — a
   mistyped fragment is caught while you still have that domain open.

⚠ **The mechanism does not FIND anything. It is the container.** Do not try to automate the
finding. Three detectors were built on 2026-08-14 and all three were defeated by paraphrase; the
four controls any future attempt must pass are in
[`features/domain-support-provenance-history.md`](features/domain-support-provenance-history.md) §2–3.

⚠ **The 150–200 estimate rests on ONE domain of twenty-nine. It is not a count.**

---

## What was built — `90b673d`

**The firm's sentence is never touched.** Our additions turned out to be *tails welded onto the end
of the firm's own sentences* — *"…place the post-it notes under the corresponding lever**, which is
what captures accumulative incremental growth rather than one large bet**."* That single fact drove
every decision: marking had to work inside a sentence, not per row.

**A mark records the words, never a step number.** The screen already allows reordering, so an
index would quietly come to mean a different sentence. The price — an edit can orphan a mark — is
paid twice: `tests/unit/authoredCommentary.test.js` fails the build on a platform mark that is
missing or ambiguous, **across all 29 areas from day one**, and `livingCommentary()` re-checks
presence at the moment of display. That second check is the only thing protecting a firm's own
saved copy, which no test can reach.

**The AI gets the steps unchanged**, plus a block naming what was ours. Both prompt paths carry it —
advisor engine and course session — because both format through `formatMaterialLines`.

**The control:** highlight the words, press *"This is our wording"*. The words are never retyped,
so a mark that does not match its sentence **cannot be created at all**. The × takes it back off.

**`canMark` is `scope === 'mentor'` — named positively**, because Tier Cascade P5's trap is that a
negative gate answers *yes* for a tier that does not exist yet.

+30 tests, suite 5,221 → 5,251. Lint clean.

---

## 🔴 The process lesson worth keeping

**Mike asked "where do I edit what has been marked?" — and the honest answer was "nowhere".** The
design was a label on a screen where every other cell is editable. That question added the whole
marking control, and it was the right addition.

**The answer to the follow-up came from the Briefs, not from me.** Asked who should get the control,
two things in the way the question had been framed were simply wrong, and reading
[`features/tier-cascade.md`](features/tier-cascade.md) and [`features/domain-support.md`](features/domain-support.md)
found both: there **is** already a platform-side editor (the mentor renders the same hub, and the
Domain Support tab has no tier gate), and a firm unmarking would silently cost it every future
improvement to the whole area, because arrays replace wholesale. **Neither was guessable.** Read the
Briefs before answering a design question about tiers.

---

## 🖥 FOR THE DESKTOP

**Nothing here went near your ground.** Logic Lab and the firm-side logic-table screens remain
yours. `FirmManagerHub.vue` gained **one line** — `:scope="scope"` on the Domain Support tab — so a
conflict there is unlikely but that is the line to expect.

**Two things you need:**

1. **`components/firm/FirmDomainSupport.vue` changed materially** — a `scope` prop, five methods, a
   template block under each step, and `cleanMaterials`/`applyDetail` now carry
   `authored_commentary` through. If you have work in that file, merge `master` before touching it.
2. **If you transcribe any source material, the marking mechanism now exists** — use it rather than
   adding an unmarked explanatory clause. `domain-support.md` P2 already carried the rule; now
   there is somewhere to put the answer.

**Merge `master` before writing any new design document.** Conflict risk is `design/ACTIONS.md`,
which gained a rewritten row near the top and a corrected bullet at ~line 159.

---

## ⚠ Two honest limits

1. **Never run in the app.** Proven by tests, not by use. Nobody has seen the note render or pressed
   the button in a browser.
2. **The guard test cannot reach a firm's saved copy.** Platform data is held to the strong rule;
   a firm's own stored materials are protected only by the presence check at display time.

---

## ☐ Open for Mike — still nine decisions

Unchanged from session 52; all nine are on [`features/to-do.md`](features/to-do.md) §2. **One new
one is coming but is not owed yet:** the firm-level label wording, asked for when a firm first has
its own commentary to mark. It is deliberately not being invented in advance.

---

## Commits

`90b673d` · `35cd399` · plus this session's closing commit.
