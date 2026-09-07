# Handover — the laptop, last session only

> **One file per machine, one session each. It is replaced each time, not added to.**
> This machine writes only this file; the desktop's is
> [`HANDOVER-desktop.md`](HANDOVER-desktop.md), and a session reads BOTH at startup.
> Anything worth keeping beyond tomorrow belongs in the feature's Brief or on
> [`features/to-do-items.json`](features/to-do-items.json). Earlier handovers are in git
> history. See [`WORKING-AGREEMENT.md`](WORKING-AGREEMENT.md).

---

## 2026-09-08 (second session) · Laptop · branch `feat/advisor-progress`

Suite **8,371 green** (425 suites), lint 0 errors, audit gate pass, coverage thresholds met.
**Ten commits, all pushed** — 21 ahead, 0 behind. **PR #69 open.** Nothing uncommitted.

**ECONOMIC ANALYSIS IS ALIVE AGAIN**, and the reason it was dead is not what this repository
believed for two days. Also: the Meeting Review advisor level now actually reaches the report,
Spec Kit is installed, and `/code-review` produced three new items.

### 🔴 THE FOUR THINGS A LATER SESSION WOULD OTHERWISE GET WRONG

1. 🔴 **THE MODEL WAS NEVER "WRITING FROM MEMORY". IT WAS ASKING PERMISSION.** Six sessions
   read *one search + a short answer* as a lazy model satisfying `tool_choice`. Run 20 logged
   the raw reply for the first time and it is a **question**: our §2 said today was 8 September,
   the model's own date was 7 September, and between §2's *"do not infer either date"* and §5's
   *"an honest gap beats a confident guess"* it concluded it must stop and ask. **A one-day lag
   killed the feature.** `SECTIONS_MISSING` followed because a question has no numbered
   headings. **The guard was correct on every single run.** Runs 20–21 in
   [`ECONOMIC-ANALYSIS-TEST-RUNS.md`](ECONOMIC-ANALYSIS-TEST-RUNS.md).
2. 🔴 **NEVER PROVE THIS FEATURE WITH A PROBE.** Item 4.69 was recorded "proven live" on run 15,
   a script outside the repository. Five route runs had failed around it. That is now twice this
   page has been misled the same way. **Through the built route or it did not happen.**
3. **`presetFor` must APPLY the advisor layer, not re-derive it.** The screen and report
   generation disagreed for a day because only the screen called `applyAdvisorLayer`. Both now
   call the same function on purpose — do not "tidy" one into its own copy.
4. **Spec Kit was COPIED from the desktop's `4fba367`, byte-identical — do not run
   `specify init --here`.** A fresh init writes a blank `constitution.md` and would conflict with
   the desktop's hand-written one on all 30 paths at merge.

### 🔴 DESKTOP — read this first

- **PR #69 will put you behind. Merge `master` in before touching anything.**
- **Shared files that moved:** `data/ai-prompts.json` (economic-analysis prompt only — §2 gained
  a paragraph, §3 a sentence, and the prompt object a `bannedSourceHosts` array),
  `server/routes/economicAnalysis.js`, `server/report/economicAnalysis/researchResult.js`,
  `server/routes/meetingReview.js`, `server/routes/meetingObservations.js` (**one added export**,
  `loadAdvisorState` — additive), `server/utils/meetingObservationsAdvisor.js`,
  `to-do-items.json` (+3 items), `to-do.md`, and two design docs.
- **`.specify/` and ten `.claude/skills/speckit-*` are identical to yours** and will merge in
  silence. That was the point of copying rather than initialising.
- **Your 4.70, benchmarker and Business Performance Report work was not touched.**

### What was built

| | |
|---|---|
| `0089a5b` | Spec Kit, from your files |
| `7479ef4` | **The advisor's own level reaches the report** — it had been inert since it shipped |
| `ea08233` | An over-long hint phrase is refused, not dropped behind a `200` |
| `28afa04` | **4.74, 4.75, 4.76 filed** from `/code-review` |
| `ba5bec1` | The raw-reply log — the instrument that broke the case open |
| `6ced5d5` | The diagnosis, and §2's wording drafted for approval |
| `19bd5a0` | **The fix applied and proven** — run 21: 12 searches, 1,938 words, 32 citations |
| `7c76418` `b47d9a7` `b708a62` | **reddit.com banned** — asked of the model AND enforced in the guard |

### Two traps worth keeping in mind

- **`hostOf` strips `www.` and nothing else.** A plain equality check bans `reddit.com` and waves
  `old.reddit.com` through. `isBannedHost` matches *equals, or ends with dot + entry* — and
  `notreddit.com` is tested as NOT banned, because a bare `endsWith` overreaches.
- **`server/report/economicAnalysis/` is held to 100% statements and branches.** The push gate
  refused a commit with 8,365 tests passing. It is AI-response validation; the standards put it
  there. Defensive branches need tests, not just the happy path.

### Open

- **4.73 and 4.69 are FINISHED and wait only on Mike to close them.** 4.69's owed regression
  check *is* run 21. `activeOn` still names this laptop on 4.69 — left standing deliberately
  until he ticks it, not because anyone is mid-flight.
- **4.74 is a DECISION, not a fix**: the advisor's hint-words box comes off the screen, or is
  wired into report generation. Both change what an advisor sees. ⚠ If it comes off, `ea08233`
  goes with it.
- **4.75 and 4.76 were left deliberately.** 4.75 needs a compare-and-set on `saveFirmConfig`,
  which every firm-overlay feature shares; 4.76 needs the last-changing tier carried through
  `resolveInheritedRows`, which the meeting-types cascade shares. Neither is a quick edit and
  the items say so.
- **Fourteen items on the list here; yours has 4.70 and this branch does not.** Neither
  published Handbook can show all fifteen until both branches reach `master`. Mike was told.

### Next

**4.75 is the highest-scoring thing available** (5 — an advisor's saved changes can be silently
lost), and it is the one that most deserves its own proposal rather than being squeezed into the
end of a day. **4.15, 4.60 and 4.65 all wait on Mike**, and 4.60 and 4.65 are the same request to
the same person — ask once.
