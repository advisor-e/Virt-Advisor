# Handover — the last session, and only the last session

> **One file, one session. It is replaced each time, not added to.** Anything worth keeping
> beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. This replaces the 85 `SESSION-*.md` files written before 2026-08-24; those stay
> as history and none is written now. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-08-25 (third session) · Laptop · branch `feat/advisor-progress`

**Two closed (4.46, 4.36). List 9 → 7.** Nothing half-finished, nothing uncommitted.
Branch **38 ahead, 0 behind** `master`. Suite **6,289 green**, lint 0 errors.

**4.46 — the switch offer now switches.** The picker read only the advisor's own words, so
the guide named in the AI's own offer could never reach it. Narrow fix, guarded on the offer
wording; conversations with no offer route exactly as before. Recorded as **P10** in
[`features/advisory-engine.md`](features/advisory-engine.md).

**4.36 — the Model Guide search meets the advisor's words.** Whole-phrase matching, filler
words and word endings, plus a `searchWords` list per model. **All of it applies to every
search, not just the property one** — seven ordinary queries that found nothing now work.
Recorded in [`features/report-models.md`](features/report-models.md); the two phrasings that
still miss are named there rather than glossed.

🔴 **THE ONE THING TO CARRY FORWARD.** Both of yesterday's AI defects and today's were found
by driving the real model, never by a test — 4.46 shipped with a fully green suite. **Six
live calls cost a fraction of a penny.** `pickLearnTreeAI` is now exported so that check can
be re-run. Do this before calling any prompt or routing change done.

**Unchanged:** `npm install` still needs npm 8.19.4 on Node 14.15 — [`../.npmrc`](../.npmrc)
explains it.

**Nothing waits on Mike, but 4.15 is the one he can unblock fastest** — it needs him to name
21 real page names, and its own note says to put the sentences in front of him, not the label.
