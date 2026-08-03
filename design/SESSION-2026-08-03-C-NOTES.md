# Session Notes — 2026-08-03 (C) · Laptop, Session 30 (a fault that read as a finding)

> **Nothing is unsaved.** `feat/advisor-progress` = `origin`, **7 ahead / 0 behind
> `master`**, working tree clean. Suite **4,373 green / 254 suites**, lint 0 errors.
>
> ✅ **PR #35 IS OPEN and MERGEABLE** — <https://github.com/advisor-e/Virt-Advisor/pull/35>,
> raised on Mike's instruction at the close of the session. 18 files, +1,260 / −55.
>
> **⚠ Whoever merges it must RESTART THE BACKEND** — a running Restify process holds the
> old engine code, and the change will look as though it did nothing.

---

## The one thing the next session most needs to know

**An empty result meant two opposite things, and nothing in the code or on any screen
could tell them apart.**

`_classifyMatchingRows` returned `[]` from its catch. `[]` is also exactly what a
successful call that matched nothing returns. So a distinction classifier that never
answered — a dead key, a rotated certificate, a firm's network — produced the same value
as a working one with nothing to report, and four screens turned that into *"the AI read
all 5 in this area and none matched"*: a sentence stating the model had done something it
had not.

In a live session it was worse than a wrong sentence. The distinction layer is the firm's
single biggest lever (+5, and 29 of 51 Scenario Lab cases turn on it alone). A firm whose
certificate broke lost that entire layer, got a plausible recommendation built without it,
and was told the opposite.

**Carry this:** when a function's failure path returns the same value as its ordinary
empty case, no caller downstream can ever be honest — and no test that only checks the
happy path will notice. The fix is at the boundary, not on the screens. Every screen was
already faithfully reporting what it had been given.

**And the second lesson, which is Mike's.** I closed the first pass saying the live panels
still needed a look, and told him to reproduce it with a deliberately wrong
`OPENAI_API_KEY`. His answer: *"I have no way of determining the wrong AI key. I don't know
how you expect me to test that."* He was right — that was my gap to close, not his. Both
panels are now rendered in test with the failure switched on. **Do not hand the owner a
verification step that needs a developer's environment.**

---

## What was built

Full detail and the approved wording: **[`WORDING-DISTINCTION-AI-FAILURE.md`](WORDING-DISTINCTION-AI-FAILURE.md)**.
`ACTIONS.md` → [`ai-failure-reads-as-no-match`](ACTIONS.md) is now closed and carries the same record.

### 1. The engine tells a fault from a finding (`9201457`)

`_classifyMatchingRows` returns `{ok, rows}`; `classifyDistinctions` and
`findNearMissDistinctions` carry it up; the saved decision trace records `aiFailed` and
`nearMissAiFailed` as **two** flags, because the two AI calls fail independently.

- **An object, not `null`** — the shape `ACTIONS.md` originally sketched. A caller that
  forgets to check a flag still degrades; one that forgets to check `null` throws
  mid-session.
- **An UNREADABLE reply is a failure too.** An empty or prose reply used to fall through a
  `|| '{}'` default and read as a confident "none of your distinctions applied". Flagged to
  Mike as a judgement call inside the approved fix; not objected to.
- `scenario-lab.js` counts failed classifications and states them, so a 50-case measurement
  cannot quietly average in runs made without the lever.

### 2. Eight surfaces, not the four first found (`9201457`)

The two quietest showed **nothing at all** rather than something wrong: the live-session
"filed elsewhere" section simply did not render, and a saved case in the Hub filed the
claim permanently with no sentence attached. Six strings cover all eight; all approved by
Mike as recommended, plus **Decision 0 option A** — the Logic-Lab score sheet still shows,
under a banner, because the deterministic half of it stays true.

The "→ Write a distinction in X" instruction is **withheld** while the layer is unread. It
was the most harmful of the eight: it sent a manager to solve a problem nobody had measured.

### 3. The two live panels are rendered in test, not read as source (`da96977`)

[`decisionTraceAiFailure.render.test.js`](../tests/unit/decisionTraceAiFailure.render.test.js)
mounts VirtualAdvisor and FirmManagerHub with the failure on and asserts the approved
**English** appears.

⚠ **That file deliberately breaks the house rule** that component tests assert i18n KEYS,
not wording. The reason is written at the top of the file: the defect was a screen making a
false *statement*, and a key-based assertion would have passed happily throughout the
original bug. **Do not "correct" it back.**

Every screen is checked both ways round — the fault renders its sentence, a genuine
no-match still renders the ordinary one — because the two produce an identical empty result
and only the flag separates them.

---

## Where the work stopped

**Nothing is half-finished.** The P1 is closed end to end: engine, six sentences, 27 tests.

**Two findings logged, not fixed** (both new entries in `ACTIONS.md`):

1. [`trace-panels-hardcoded-english`](ACTIONS.md) — ~15 strings in the two trace panels never
   went through `$t()`. Pre-existing. The two NEW sentences do, so no new violation was
   added; moving the rest is its own sweep. ⚠ A test greps one of those literals and will
   fail loudly if the wording moves — re-point it, do not delete it.
2. ~~[`no-escalation-route`](ACTIONS.md)~~ — **RULED the same evening.** Mike: *"contact
   your advisor-e coach - that's what they're here for!"* It now ends the two fault
   sentences that instruct the reader. **The route now exists as a written answer, so the
   next fault message anywhere in the app should reuse it rather than re-open the
   question.**

**Ruled after this note was first written** — all twelve strings in
[`WORDING-DECISIONS-2026-08-03.md`](WORDING-DECISIONS-2026-08-03.md) are settled: the
Logic-Lab lede corrected to *"Nothing on this page changes anything until you choose it."*
(it promised the opposite directly above two buttons that write to live configuration), the
other eleven kept as written.

⚠ **That list was MIS-FRAMED, and it is the process lesson of the session.** It offered
twelve equal-looking decisions when it was **one defect and eleven rubber stamps** — seven
of the eight gap sentences only appear in states a normal test of the page never reaches.
Mike tested the live page and asked why he was being consulted at all. Re-reading the code
proved nothing was stale; the *framing* was the fault. **Next wording list: separate the
defects from the approvals.**

**Least-tested path:** the failure has never been seen in the running app — only rendered in
jsdom. The sentences are provably on the page; how they read beside a real recommendation is
still unwatched.

## On conflicts

This session touched `server/advisorEngine.js`, `server/utils/phraseProbe.js`,
`scripts/scenario-lab.js`, `locales/en.json`, four components (`VirtualAdvisor`,
`FirmManagerHub`, `FirmLogicLab`, `DecisionLogicDiagnostic`), six test files and
`ACTIONS.md`. **`FirmLogicLab.vue` and `DecisionLogicDiagnostic.vue` are the desktop's own
recent work** — the changes here are additive branches on the failure flag and touch none of
its arithmetic, but that is where a conflict would land if both machines edit them.

⚠ **`ACTIONS.md`'s top item claimed PR #33 was still open; it had merged.** Corrected. Treat
this list's flags as claims to check, which its own header already says.
