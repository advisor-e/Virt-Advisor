# Session Notes — 2026-08-09 (C) · Laptop, Session 38

> **Nothing is unsaved.** `feat/advisor-progress`, tree clean, level with `origin`, suite
> **4,808 green / 280 suites**, lint 0 errors, **23 ahead / 0 behind `master`**.
>
> Mike asked to "finish the Mentor Hub". **It is finished** — all three things the previous
> session named as outstanding are built. What remains is his to do, not a developer's.

---

## What the next session most needs to know

**The obvious repair to an empty screen was the wrong one, twice, and for the same reason.**

Team Progress and Team Case Studies rendered empty at `/mentor` after Phase 3. Rolling them up
one level is what an empty screen invites, and both would have been privacy regressions:

- **Team Progress lists a firm's advisers BY NAME.** Widening it puts every firm's people in
  front of Advisor-e — against a boundary this codebase *already enforces in code*
  (`mentorLogicLabReport.assertNoPersonalFields` throws).
- **Team Case Studies already had a correct cross-firm version sitting beside it** — the Case
  Reviews tab, which shows only cases a firm manager has anonymised and explicitly approved.
  Rolling the firm tab up would have walked straight past that consent gate.

**Carry this:** before widening a firm-scoped screen to the mentor tier, ask what the tier
above is *allowed* to see, and check whether the correct version already exists. Both answers
were already in the codebase; neither was in the notes. The first framing put to Mike was
wrong and was corrected out loud.

---

## What was done

### Job A — Phase 5: the Staircase and Quizzes inherit (`aef33fa`)

A mentor could add a staircase step or quiz question, see it saved, see it on their own screen
with version history beside it — and no firm would ever get it. Both blocks resolved against
the **shipped file**; they now resolve against the **mentor's resolved content**. Same function
calling itself one level up: one rule for two tiers, not a second mechanism.

Plan: [`MENTOR-SAVE-SCOPE-PLAN.md`](MENTOR-SAVE-SCOPE-PLAN.md) §Phase 5. **The save-scope P1 is
now closed.**

🔒 **Security, and the trap inside it.** `source` describes a row's relationship to the level
*below* it — so a mentor's own question is `firm-own` on their screen and `platform` the moment
a firm inherits it. Reading it alone would have quietly **un**fenced mentor-typed text on its
way to the AI. A sticky `browserAuthored` flag now carries provenance across tiers.
`isFirmAuthored` → `isBrowserAuthored`: the bar is "not repo data", not "not Advisor-e", because
a firm's text reaches one firm and a mentor's reaches **every** firm.

⚠ **An id collision Phase 5 would otherwise have created.** Own-row ids mint per scope, so the
mentor's first added step and a firm's first added step were **both `fs-1`** (`fq-1` for
questions). Harmless until Phase 5 put both in one list, where every decision is keyed to an
id — a firm switching off "its own" step would have dropped the mentor's. The mentor now mints
under `ms-` / `mq-`. **No stored data affected.**

> **How it surfaced is the part worth keeping.** Three test stubs answered the store without
> checking *which scope* was asking, and so reproduced the collision exactly. The temptation was
> to read it as mock noise and scope the stubs. The stubs did need scoping; the duplicate was real.

### Job B — "How firms are using the app" (`85f42e1`, `b720d97`, `f6b549f`)

Design: [`mentor-adoption-view.html`](mockups/mentor-adoption-view.html) — **saved and committed
BEFORE Mike ruled on it**, then updated with his four rulings, then with every build deviation.
Read that file, not this paragraph.

🔴 **RULED (Mike):** read the firms list · keep Avg quiz · quiet after **60 days** · warmer,
advisory wording (tabled on the artefact, word for word).

⚠ **This is the FIRST backend read of the `firms` table anywhere in this repo**
([`firmsDirectory.js`](../server/utils/firmsDirectory.js)), deliberately a single choke point —
a test walks `server/` and fails if a second query appears, because a second query is a second
place to forget the reserved `__platform__` exclusion.

**The two reads fail differently on purpose.** Activity is the page, so losing it fails the
route. The firms list only adds the never-started firms, so losing it degrades the page — and
the payload **says** the list is short, because a shorter list otherwise reads as a healthier
platform.

### Job C — Template Check's "Apply it" (`cdd039e`)

🔴 **RULED (Mike): it PREPARES a reviewed change; it never edits a logic table.** Three reasons,
recorded on [`logic-table-template-check.html`](mockups/logic-table-template-check.html) §5:
this exact fix is already made by reviewed commit (`bd7dc63`, `3064a71`); a stored override
marks the table human-edited, which makes the AI prompt **fence its text for every firm, one
table at a time, invisibly**; and a stored override freezes a copy, so a later improvement to
the committed table could never reach anyone whose rulings had been applied.

Every queued change comes back classified — *ready*, or *needs checking*. Nothing awkward is
dropped: a patch that silently omitted the hard rows would read as a finished job, and this
screen exists because two confident passes at these names were both wrong.

---

## Where the work stopped

**Cleanly. All five commits pushed. Nothing is half-finished in code.**

**The Mentor Hub is finished.** What remains on it is Mike's judgement, not a build:

- ⚠ **Nothing has been ruled in Template Check yet, so the queue is empty.** Job C built the
  machinery; working through the **93 rows** is what fills it. That is Mike's next move.
- **Templates and the coaching reference still cannot inherit as stored.** Unchanged from the
  previous session and unchanged by Phase 5: they are bare arrays, and giving their entries ids
  is a **data-model change, not a merge change**. Never re-scope this as "just add it to the list".

## On conflicts

Touched `server/utils/` (staircaseConfig, quizConfig, firmStaircase, firmQuizzes, activityStore,
+3 new), `server/routes/mentor.js`, `server/routes/firmManager.js`, `server/restify-server.js`,
`components/FirmManagerHub.vue`, `components/mentor/`, `locales/en.json`, and four `design/`
files. **`ACTIONS.md` and `locales/en.json` are where a conflict would land.**

⚠ **`FirmManagerHub.vue` is shared by two tiers and now has tier-only tabs.**
`mentorHubScope.component.test.js` fails if the exceptions grow beyond the two ruled here —
do not widen those lists to make a test pass; that is the erosion the test exists to catch.

⚠ **`staircaseConfig.js` / `quizConfig.js` now recurse one level up.** A stub loader that
ignores the scope id will produce duplicate rows. That is not mock noise — see Job A above.

**Logic Lab and the firm-side logic-table screens remain the DESKTOP's.** Nothing here went
near `FirmLogicTables.vue`, `FirmLogicLab.vue` or `DecisionLogicDiagnostic.vue`. No change was
made to `data/logic_trees.json` — deliberately, and that is the whole point of Job C's ruling.

## Honest limits

⚠ **The firms-table read has NOT been proven against real data.** There is no MySQL here, so it
is evidenced by tests and a dev fallback — a weaker claim, written down as one on the artefact
§5. **This is the same shape as the defect found in session 37**, where a dev fallback absorbed
a foreign-key rejection silently for two features that had been built, tested and signed off.
When MySQL is provisioned, this is the first thing to check.

## Open for Mike

- **Rule the 93 Template Check rows** — the queue stays empty until he does.
- **Reply to Carl about `npm install`.** He pulled `2beba9f` (= `v0.7.0` + two doc commits) on
  4 August. **v0.7.0 adds `@mdi/font`; without `npm install` the tab icons render blank and it
  reads as a broken build.** Still unconfirmed. *(Carried, unchanged.)*
- **Raise the export gap with the master-app team — SEVEN tools.** *(Carried, unchanged.)*
- **Decide on the `/startup` change** proposed in
  [§approved-mockup-stranded-on-a-branch](ACTIONS.md#approved-mockup-stranded-on-a-branch).
  *(Carried, unchanged.)*
