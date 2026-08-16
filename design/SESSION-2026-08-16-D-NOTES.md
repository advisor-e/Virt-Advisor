# Session Notes — 2026-08-16 · Laptop, Session 64

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, suite **5,491 green / 315 suites**.
>
> ✅ **4.16 STARTED BUILDING.** Item **E** of seven is done and pushed. Application code changed —
> `server/advisorEngine.js`, two staircase utils, one route and one screen component.

---

## 🔴 FIRST TASK NEXT SESSION

**Continue 4.16 from [`4-16-BUILD-SPEC.md`](4-16-BUILD-SPEC.md).** E is marked done in its table.
The spec is still the authority; do not re-derive the analysis.

**Two things E learned that the spec does not say, and B–G need them:**

1. **Read the code before trusting the spec's counts.** The spec said the two hardcoded staircase
   strings were the same sentence. They are not — the second carries a `No problem —` lead-in for
   the moment an advisor declines a saved answer. Nothing about that is in any document; it took
   opening the file. Expect the same in C, F and G.
2. **Both halves, always.** The prompt half and the screen half shipped in one commit, per the
   hub-page rule. Wiring content to the AI without a screen is the state 4.16 exists to close.

⚠ **DO NOT** re-raise: the education-gate wording (settled, session 61), the release number
(settled, session 60), routing text for the "ten empty domains" (they are not empty — session 63).

---

## What shipped

### 1. 4.16 item E — the staircase question (`5873c06`)

`selectorPrompt` has been authored in `data/advisory-staircase.json` since the framework shipped and
was **read by nothing**. `advisorEngine.js` asked a hardcoded copy in two places, so a mentor's or a
firm's edit reached no advisor at all.

**This is the same fault fixed for the step NAMES on 2026-07-31** — the comment above the
`loadBlendedStaircase` call records that one. The question sitting above those steps was missed.

- **Screen:** *"The question your advisors are asked"* on the Advisory Staircase tab, between the
  steps and the default complexity ceiling. Shares that block's config key and Save button, so
  version history and restore came free. Wording approved by Mike:
  [`STAIRCASE-SELECTOR-PROMPT-FIELD.md`](STAIRCASE-SELECTOR-PROMPT-FIELD.md) §3.
- **Prompt:** both call sites read the resolved value. A read failure serves the shipped sentence —
  an advisor is never asked nothing.
- **Today's advisor sees no change**, and two tests *pin* that rather than assert it: they hold the
  exact strings that were hardcoded, written out in full so an edit to the data file cannot silently
  re-point them.
- **Proved on the running app**, not only in the suite: saved as the mentor, inherited by a firm that
  had written none of its own, and the engine then put that sentence to the advisor. Empty,
  over-length and unauthenticated requests all refused. The dev-JSON test value was deleted after.

🔴 **One wording decision is OPEN and was deliberately not bundled:** that block's history button
reads **"Ceiling history"** while now covering two settings. Mike's call.

⚠ **One deviation from the approved artefact, named in it:** the hint said *"The steps below"*; on
the real screen the steps are **above**. Our drafting error, corrected when building.

### 2. Seven documents joined the Handbook (`0d640c8`)

**Raised by Mike:** *"why is the 'what each hub page is for' page not been added to the handbook???"*

`build-handbook.js` read **one** directory. That file was written one level up, so it was never a
candidate — and **nothing would ever have said so**: the "Unlisted" warning only sees inside
`design/features/`. The morning's build reported 26 pages, all listed, and was right.

133 documents sat at `design/` root; Handbook pages linked to 54 of them **135 times, every link
dead.** Seven that are *current rules* are now pages — hub-page purposes, design logic, working
agreement, tier cascade map, artefact register, content routing, deployed versions. **33 dead links
now open.** Handbook: 26 → 33 pages.

🔴 **THE FILES DID NOT MOVE, and that is the point.** `CONTENT-ROUTING.md` is written by a
generator, `ARTEFACTS.md` is guarded by a test, and `WORKING-AGREEMENT.md` is named in `CLAUDE.md`,
`README.md`, both slash commands, a skill and a script. An index row may now point one level up
(`../TIER-CASCADE-MAP.md`) and the document becomes a page where it lies.

⚠ **A move was tried first and `newFeature.test.js` caught it.** `HUB-PAGE-PURPOSES.md` went into
`design/features/`; that folder holds feature Briefs, each with a History behind the gate, and a
reference table is neither. It went back. A test now asserts it stays out, with the reason beside
it, and it is rule 9 of [`features/handbook.md`](features/handbook.md).

### 3. The records (`this commit`)

`to-do.md` and the build spec mark E done. **Two Briefs were corrected because they now disagreed
with the code** — `handbook.md` §1 still said the content was *"every `*.md` file in
`design/features/`. Nothing else."*, and `advisory-staircase.md` §4 still called the whole-config key
the home of the default ceiling alone.

---

## ⚠ What is open, and honestly

1. 🔴 **About 100 Handbook links still point at documents with no page.** 135 outbound links to 54
   documents; 33 now open. Most should probably *lose the link* rather than gain a page — but nobody
   has decided which, **and there is no check that would fail if a Brief linked to a file that does
   not exist at all.** Logged in `ACTIONS.md` as work for a person.
2. **Six of the seven 4.16 items remain.** D (engagement types, 18 fields) still has **no page at
   any tier** and cannot start without Mike.
3. **The Coaching Reference still has no Brief** — the only content page in the hub without one.
   Carried from session 63. Not part of 4.16.
4. **Six rows of `HUB-PAGE-PURPOSES.md` are still `brief only`** — Distinctions, Quizzes, Adoption,
   Logic-Lab Report, Case Reviews, Adviser Network. Not code-checked. Do not rely on them.
5. **Carried, untouched from sessions 61–63:** six ghost template references logged at every
   startup; two broken Brief links (`tier-cascade.md` → `collaborate.md`,
   `to-do-done-and-parked.md` → `../STATUS.md`). **Now carried five sessions.**
6. **`ARTEFACTS.md` still shows item 2.6 as "☐ awaiting approval"** though it closed on 2026-08-16.
   Carried from session 62.

---

## 🖥 FOR THE DESKTOP

🔴 **Application code changed this session, in the advisor engine.** If you are near
`server/advisorEngine.js`, `server/utils/staircaseConfig.js`, `server/utils/firmStaircase.js`,
`server/routes/firmManager.js` or `components/firm/FirmStaircase.vue`, **merge `master` before you
touch them.** Nothing of yours moved; `logic-lab` is untouched.

🔴 **`scripts/build-handbook.js` changed shape.** `relink()` now takes the folder its source was
written in, and `parseIndex()` items carry `file` and `source`. Both new `relink` arguments default,
so a one-argument call still means what it did. **If you add a page, `npm run feature` is unchanged.**

🔴 **Do not move a document into `design/features/` to get it into the Handbook.** List it with a
`../` row in `README.md` instead — rule 9 of `features/handbook.md` says why, and a test enforces it.

**New file:** `design/STAIRCASE-SELECTOR-PROMPT-FIELD.md` and this note.

---

## ☐ Open for Mike

1. **The "Ceiling history" button** — it now covers two settings and names one. 🆕 today.
2. **Where the engagement types live** — 18 authored fields, no page at any tier. The one 4.16 item
   that cannot start without him.
3. **4.12 · where the corrected handover lives, and what it describes** — carried **seven** sessions.
4. **4.7 · when the overnight reinstall can run** — a time, not an answer. Carried **seven** sessions.
5. **The template picker on a firm's own coaching entry** — carried from session 60, never ruled.

⚠ **Items 3 and 4 have now been carried for seven sessions each.** Neither needs a working session.
