# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-22 · Laptop · branch `feat/advisor-progress`

**Clean, merged with your PRs #112 and #113, pushed, and raised as a PR to `master` on Mike's
instruction — *"i want everything here completely aligned with desktop"*.** Suite **13,414 green**
(603 suites), lint 0 errors. **NOTHING WAITS ON MIKE.**

### 🔴 STAGE 7 OF ITEM 15.1 IS NOT WHAT IT SAID. Mike redirected it himself.

It read *"calculators run inside the card"*. He asked *"as an advisor, in a session with a client,
how do i leave the session to look at something else and return back to my screen afterwards?"* —
**and you cannot.** Leave the planner for any reason and you came back to a blank Scope screen with
no way into the session you were running, while a second *Build the session* opened an **empty
duplicate** for the same client. His words: *"or, simply make stage 7 - building the door?"*

**THE CALCULATORS ARE PARKED, NOT DELETED.** His patchwork ruling of 2026-09-16 stands verbatim in
Brief **§7a**. ⚠ It is **TWO frameworks, not three** — *"Revenue Model"* is a master-app template
topic with no page, no model and no route here. Do not re-derive the count from the names.

**All five decisions settled the same day** on
[`mockups/strategy-session-resume.html`](mockups/strategy-session-resume.html) (published,
registered). A, B, D, E ruled; **C dropped on his own challenge** — *"each session relates to a
single client - tell me why i need this feature"*. There is **no "finished" flag anywhere** and
that is now the settled design, not a gap.

### 🔴 THREE TRAPS — DO NOT PAY FOR ANY OF THESE TWICE

**1. NEVER SAVE FROM `@input.native`.** The capture boxes were saving **once per keystroke** —
Buefy's Input emits from the native event unless `lazy` is set, and neither box passed it. Measured
at **62 saves for a 62-character sentence**, each its own `PUT /entries` and database write, fired
without awaiting one another so a slow line could store a **half-typed answer**. Fixed with `lazy`,
mutation-verified. `@input.native` now exists on three components and carries **no network call at
all** — it only tells the page there are unsaved words. Turning it into a save restores the defect.
`tests/unit/strategyCaptureSaveRate.test.js`.

**2. THE SESSION STORE STRIPS THE `Z`, SO ITS TIMES ARE UTC AND NOTHING SAYS SO.** `now()` in
`server/utils/strategySessionStore.js` writes MySQL `DATETIME` shape. Passed to `new Date()` in a
browser it reads as **local** — twelve hours out here. The stamp showed *"Saved 4:10 AM"* for a
4:10 PM save, and an evening session would have shown the **wrong day**. Use `storeTime()` in
`pages/strategy-planner.vue`, which also refuses to double-zone an already-ISO string.

**3. `git show` HANDS BACK **LF**; THE WORKING FILE IS **CRLF**.** Splitting on the wrong one gives
one line and every index check passes on nothing — your own 2026-09-22 warning, hit again resolving
today's merge. Also: **bound a JSON record by BRACE DEPTH, never by a line trimming to `},`** —
item 17's nested `askedBy` closes exactly that way and a text scan cut the record in half.

### SHARED FILES I TOUCHED — check before you edit

`pages/strategy-planner.vue` (substantial: the resume bar, reopen, the Saved stamp, auto-save,
`storeTime`, the session id in the address bar) · `components/strategy/StrategyConceptCapture.vue`,
`StrategyCaptureBox.vue`, `StrategyCaptureCard.vue` (all three: `lazy` and/or `@input.native`) ·
`locales/en.json` (`strategyPlanner.resume`, `.save`, `errors.reopenFailed`) ·
`config/integration.js` (**new seam `Q-RETURN-URL`** — `ADVISOR_E.menuUrl`, `.menuHostAllowList`) ·
`design/MASTER-TEAM-INTEGRATION-EMAIL.md` (**eight questions became nine**, incl. the unblocks
table) · `ARTEFACTS.md` · `features/strategy-planner.md` (§0 stage 7 rewritten, **new §7a**) ·
`features/to-do-items.json` · the two generated files. **Your item 13.4 and 16 files untouched.**

### ⚠ `Leave session` IS DRAWN AND DELIBERATELY NOT RENDERED

Our pages carry **no navigation at all** (`layouts/default.vue` is four lines), so the way out is
Advisor-e's — and nobody has ever told this app that address. **Question 9** asks for it two ways,
either alone sufficient, and asks for the **host** too because a `returnUrl` out of the address bar
is an open-redirect surface. Unanswered, the button does not appear. **Do not build it inert.**

### Also done

**Item 17 removed from the live list** — its closure was written up on the done-and-parked page but
the item was never taken off, so the sales tracker read as finished *and* still to do. The list is
**33 items**; your 14.4 and your 13.1 closure both survived today's merge, verified by ref.

🔴 **FOUR FAULTS FOUND BY OPENING THE APP, none visible to 13,414 assertions** — *"1 concepts
scoped"*; *"0 steps named"* beside a session holding five (seeded steps were saved only if the
advisor EDITED them, so reopening would have rebuilt them from the firm's CURRENT standard); a raw
`porters-5-forces` on screen; and the UTC time above. **Run it, don't trust the suite.**

**`activeOn`: 7.5 and 15.1 laptop — both still in hand.** **NEXT on 15.1: stage 8**, a manager
adding a concept. Stage 7 is done bar `Leave session`.

⚠ **LOCAL TO THIS LAPTOP, NOT IN GIT:** `data/dev-strategy-sessions.json` now holds **140+ sessions**
for Harbour Joinery, one per dev run. Fabricated, and incidentally a neat demonstration of the
defect stage 7 fixes — every one was unreachable the moment its page was left.
