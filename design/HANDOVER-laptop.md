# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-22 · Laptop · branch `feat/advisor-progress`

**Clean, pushed at `b6f053f7`, 4 ahead / 0 behind.** Suite **13,401 green** (601 suites),
coverage thresholds met, lint 0 errors, audit gate clean. Merged your 12 commits on the way —
item 17, 13.4, the currency wording and the language policy all came across. **NOTHING WAITS
ON MIKE.**

⚠ **I TOUCHED 57 FILES AND MOST OF THEM ARE YOURS TO KNOW ABOUT — read the next two blocks
before you open anything in `components/strategy/`.**

### ITEM 16 IS BUILT ON OUR SIDE. Mike ruled twice and then said do them all.

**The mark on a client's document is the advisor firm's REAL logo**, in a fixed-height box, with
the initials disc only when a firm holds none. **And the border returns, in the firm's colour.**
The second ruling followed from the first: the colour drove exactly ONE element, the disc, so
ruling the disc into a fallback would have left a branded firm's colour appearing nowhere at all.

🔴 **THE DATA IS ADVISOR-E'S AND WE BUILD NO SCREEN FOR IT.** His words: *"Advisor-e already
picks up the colour and brands the border to suit"* — it lives on the **firm profile page** in
the master app. Item 16's note used to say we needed a screen; that sentence is gone. Our half is
`firmBrand()` in `server/utils/firmsDirectory.js`, seam **Q-FIRM-BRAND** in
`config/integration.js`, and **question 8** of the integration email. Two nulls, marked TODO.
**Shipped inert** — unanswered, no brand SQL is built and every page falls back.

**Then: *"i want them all fixed — there is NO reason why you would have some and not others."*
So all 32 drawings carry the border and the logo box**, not just the Porter's exemplar.

### 🔴 TWO TRAPS — DO NOT PAY FOR EITHER OF THESE TWICE

**1. NEVER hand-edit `components/strategy/concepts/`.** The 32 components are GENERATED from the
7 mockups by `scripts/build-concept-graphics.js`, and a test recompares every one against its
drawing. Change the drawing, teach the generator, re-run it. I changed a comment *inside* the
Porter's SVG after generating and the guard caught it immediately — which is the guard working,
but it will catch you the same way.

**2. `strategy-concept-batch-5.html` IS CRLF AND THE OTHER SIX ARE LF.** An LF-only pattern
matched nothing in it and my script reported *"already wired"* while doing nothing at all — the
quietest possible failure, and it would have shipped 21 bordered drawings and 11 plain ones.
Normalise to LF, transform, write back in the ending it arrived with.

### SHARED FILES I TOUCHED — check before you edit

`config/integration.js` (new `FIRM_BRAND` block + export), `server/utils/firmsDirectory.js`
(new `firmBrand`, `assertColumnName`; **`listFirms` is unchanged** and still returns id and name
alone), `design/ARTEFACTS.md`, `design/features/to-do-items.json`, `design/CODE-SIZE.md`,
`design/features/strategy-planner.md`, `design/MASTER-TEAM-INTEGRATION-EMAIL.md` (seven questions
became eight, including the unblocks table), all 7 mockups, all 32 concept components, and the
four `components/strategy/Strategy*.vue` wrappers that now thread a `firmLogo` prop.
**Your item 17 files untouched.**

⚠ **A COLUMN NAME CANNOT BE A BOUND PARAMETER.** Whatever the master team types into
`FIRM_BRAND` is interpolated into SQL. `assertColumnName` refuses anything but a bare identifier
and **throws rather than skipping** — a typo that quietly disabled branding would look identical
to *"they have not answered yet"*. The logo and colour are validated too, because they reach an
SVG `fill` and an `<image>` href. 57 tests in `tests/unit/firmsDirectory.test.js`.

### Also done, and one thing still open

**7.5 and 7.12 were flagged `waitingOn: Mike` and both were wrong** — each one's own note says
the work left on it is ours. Corrected, so the live list went from fifteen items needing him to
thirteen. **Of those thirteen, 7.6 must not be raised** (his own ruling parks it) and **9.1 is
UAT**, so eleven genuinely need him. He worked through two of them today.

☐ **STILL UNRULED on the Porter's artefact: his deck page number, removed because the client's
plan runs in the advisor's order.** It is the last of the three deviations; the other two were
ruled today. Put it to him before anything else on that drawing.

**`activeOn`: 7.5 and 15.1 laptop — both still in hand, neither advanced today. 16 needs no flag;
what remains on it is the master team's.** **NEXT on 15.1: stages 7 and 8**, unchanged.

⚠ **LOCAL TO THIS LAPTOP, NOT IN GIT:** `data/dev-cases.json` carries a seeded conversation
summary on Harbour Joinery. **Fabricated — never read it as real client history.**
