# Advisor Progress — handover to the laptop

**Written:** 2026-07-29, on Mike's desktop, at the start of a session whose real work is
the domain-support content migration. **This branch (`feat/advisor-progress`) exists so the
laptop can take the advisor-progress work in parallel without either machine treading on
the other.**

**Branch point:** cut from `origin/master`, not from the desktop's working branch. Read
[§7 Why that matters](#7-why-the-branch-point-matters) before assuming you have everything.

> ## ⚠ THIS DOCUMENT IS THE BRIEFING, NOT THE CURRENT STATE
>
> **Read the `◐ ACTIVE WORKSTREAM — Advisor Progress` block in
> [`ACTIONS.md`](ACTIONS.md) first.** Five of the steps below were done on 2026-07-29
> and this file has not been rewritten — its **§8 suggested order of work would send
> you into finished work**. Specifically, as of the second 2026-07-29 laptop session:
>
> - **§4 honest failure — DONE.** The `.catch(() => [[]])` swallows are gone; a broken
>   database now says so instead of rendering a page of zeros.
> - **§5 two manager views — SETTLED.** The team view is a **Firm Manager Hub tab**
>   (`components/firm/FirmTeamProgress.vue`). The team table that used to live inside
>   `AdvisorProgression.vue` has been **removed**, so that component is now one
>   advisor's own record and nothing else — §2's "both progress screens in one
>   component" no longer describes it. **`FirmDashboard.vue` has been DELETED** (owner
>   ruling), along with the Course Builder button that opened it, the `firm` panel mode,
>   and the two `/api/firm/*` stub routes it never actually called — so §5 below
>   describes a file that no longer exists. The "Sarah Chen" fiction is gone from the
>   codebase entirely.
> - **§6 testing — LARGELY DONE.** Both screens now have component tests (32 of them),
>   plus a backend aggregation suite. Still missing: `activityLogger.js` has **no tests
>   at all**, and the i18n gap on `AdvisorProgression.vue` is still open.
> - **§7 branch point — RESOLVED.** `master` has been merged in; the quiz-provenance
>   groundwork is here, so the per-question record is no longer blocked.
> - **§6 per-question record — BUILT, AND SO IS THE MANAGER VIEW.** The open decision §6
>   describes was implemented rather than re-asked, the recommended way: **no free text**.
>   A manager now opens any advisor's row in Team Progress via a **Quiz detail** button
>   (`GET /api/activity/team/advisor/:advisorId` + `components/firm/FirmAdvisorQuestions.vue`)
>   and sees a topic rollup, weakest first, then the sessions themselves. So §6's "the
>   substantive open feature" is closed, and its open decision is no longer open.
>
> - **§6 testing — NOW CLOSED.** `activityLogger.js` was the last untested file and now has
>   **45 tests** (14/14 mutants killed). The i18n gap on `AdvisorProgression.vue` is also
>   closed. Suite stands at **2,158 / 140 suites**.
> - **Two defects fixed since (session 4, 2026-07-29):** `selectMode()` held a third,
>   drifted copy of the panel-mode list, so opening My Progress asked for
>   `opening.progression` — a key that has never existed; and **no screen's `fetch` had a
>   timeout**, so an unanswered request left the spinner running for ever. All three
>   activity screens now use `utils/fetchWithTimeout.js`.
>
> **Still true and still the point:** nothing has ever been written to a database, and
> everything real is behind provisioning MySQL. Both screens will show their error
> message until it exists — that is them working correctly.
>
> ⚠ **BEFORE YOU OPEN A SCREEN AND CONCLUDE IT IS BROKEN: close every other
> `localhost:3000` tab.** Chrome allows six simultaneous connections per host and, in
> development, each open tab permanently holds one for hot-reload. With all six taken a
> screen's request is **queued in the browser and never sent** — endless spinner, nothing
> red in the console, and **nothing in the backend log**. A fresh tab makes it worse. This
> cost an afternoon on 2026-07-29; it cannot happen in production.

---

## 1. What this feature is, in one paragraph

Every time an advisor finishes a client session in the Virtual Advisor, or finishes a
session inside a course they built, the app is supposed to record it — which advisory
tools were involved, what capability tier those tools sit at (entry-level / intermediate /
advanced), and what they scored on the quiz. Two screens then read that record: **My
Progress**, which an advisor sees about themselves, and a **team view**, which a firm
manager sees about their advisors. The idea is that a firm can see its people getting
better at advising, on evidence rather than impression.

**None of it works end to end today.** The screens render, the routes are written, the
database tables are designed — but nothing has ever been written to a database, because
the database has never been switched on. Detail in [§4](#4-why-it-shows-nothing-today).

---

## 2. Every file in scope

| File | What it is |
|---|---|
| [`components/AdvisorProgression.vue`](../components/AdvisorProgression.vue) (382 lines) | **Both** progress screens in one component. `isFirmManager` false → "My Progress" (three tier cards + Recent Activity list). True → "Team Progress" (the advisor × tier table). |
| [`components/FirmDashboard.vue`](../components/FirmDashboard.vue) (609 lines) | The **"Team Dashboard"** screen — a richer manager view with per-advisor course/session drill-down and an "AI insight" panel. **This one is a mockup end to end** — see [§5](#5-the-team-dashboard-is-a-mockup). |
| [`server/routes/activity.js`](../server/routes/activity.js) (228 lines) | The three real backend routes: `POST /api/activity/log-course`, `GET /api/activity/progression`, `GET /api/activity/team`. |
| [`server/utils/activityLogger.js`](../server/utils/activityLogger.js) (91 lines) | The two database writes: `logVASession` (client sessions) and `logCourseSession` (course sessions). Deliberately fire-and-forget — a database failure must never interrupt a live advisor session. |
| [`config/db-schema.sql`](../config/db-schema.sql) L124–167 | The two tables: `advisor_va_sessions` and `advisor_course_completions`. |
| [`tests/unit/activity.routes.test.js`](../tests/unit/activity.routes.test.js) (117 lines) | **The only test coverage that exists.** Backend routes only. |

**Where the screens are reached in the running app** — both are modes of
[`components/VirtualAdvisor.vue`](../components/VirtualAdvisor.vue): the main menu's
"My Progress" card calls `selectMode('progression')` (L123), and the Team Dashboard is
opened from a button inside Course Builder that only firm managers see, via
`@openFirmDashboard="selectMode('firm')"` (L161).

**Supporting code you will read but probably not change:**
`server/utils/tierLookup.js` decides which tier a session counts as, by looking up the
recommended template names against the catalogue. `server/utils/db.js` is the MySQL pool.
`config/integration.js` L49–55 holds the connection settings.

---

## 3. How the data is supposed to flow

```
advisor finishes a client session   →  advisorEngine  →  logVASession()
                                                          ↓
                                                   advisor_va_sessions
                                                          ↓
advisor finishes a course session   →  POST /api/activity/log-course
   (CourseBuilder.vue L1553)                               ↓
                                                 advisor_course_completions
                                                          ↓
         GET /api/activity/progression  →  "My Progress"  (own record only)
         GET /api/activity/team         →  "Team Progress" (whole firm)
```

Two things about that flow are already right and should not be re-litigated:

- **Security is sound.** Both read routes derive the advisor and the firm from the verified
  login token, never from the request — so an advisor cannot ask for someone else's record
  by changing a parameter. This was deliberately fixed (commit `f6ca851`, "Close IDOR on
  /api/activity/* routes"). Keep it that way: if you add a route, take identity from
  `req.advisorId` / `req.firmId`, never from the body or query string.
- **The tier is computed at write time**, not at read time, and stored in the row. That is
  intentional — the template catalogue changes over time, and a record of what an advisor
  did in March should not silently change tier in July because a tool was re-filed.

---

## 4. Why it shows nothing today

**The database has never been provisioned.** `config/integration.js` still carries the
placeholder credentials (`user: 'root'`, `password: 'REPLACE_ME'`, database
`virt_advisor`). Nothing has been created; no row has ever been written.

**This is not a theory — there is fresh evidence.** On the evening of 2026-07-28 Mike
completed two full course sessions in the running app and scored 70 and 73. Both writes
failed, with this in the backend log:

```
[activityLogger] logCourseSession failed: Access denied for user 'root'@'localhost'
```

**⚠ The trap that will cost you an hour if nobody tells you:** the read route hides the
failure. In [`server/routes/activity.js`](../server/routes/activity.js) L100 and L108 each
query ends `.catch(() => [[]])` — a database error is swallowed and replaced with an empty
result set. So a broken database connection and a genuinely new advisor produce **exactly
the same screen**: a tidy page of zeros and "No activity yet". You will be looking at what
appears to be a working feature with no data in it, when in fact the connection is being
refused on every request.

That swallow was defensible when the concern was "don't crash the app in dev without
MySQL". It is not defensible now: it makes the only real fault in the feature invisible.
**Recommendation — make the failure honest before doing anything else.** Distinguish "the
query ran and returned nothing" from "the query could not run", and let the screen say the
second one out loud. That is a small, self-contained change and it makes every subsequent
piece of work verifiable instead of guesswork.

**Everything else in this feature is gated behind provisioning that database.** Until
MySQL exists, no amount of frontend work can be proven to work — you can only prove it
against fixtures. Say so plainly rather than reporting a screen as "done".

---

## 5. The Team Dashboard is a mockup

[`components/FirmDashboard.vue`](../components/FirmDashboard.vue) does not talk to the
backend at all.

- [`loadData()`](../components/FirmDashboard.vue#L237) waits 600ms to imitate a network
  call, then returns `_mockAdvisors()` — hardcoded people named **Sarah Chen** and
  **James Park**, with invented courses and scores. The `TODO` above it names the intended
  call: `GET /api/firm/advisors`.
- [`generateInsights()`](../components/FirmDashboard.vue#L252) is not AI. It waits 1200ms
  and then assembles a sentence from the mock numbers using string concatenation. It reads
  as an AI insight and is not one.

This was **an intentional dev stub**, recorded and accepted in `ACTIONS.md` on 2026-07-10 —
not an oversight, and not something anyone tried to hide. But it must never reach a real
firm: a manager shown Sarah Chen's progress would be looking at fiction on a screen
labelled with their own firm's name. **Treat "remove the mock" as a release blocker for
this screen**, whether that means wiring it to `/api/activity/team` or hiding the screen
until it is wired.

Note there are now **two** manager-facing views that overlap — the "Team Progress" half of
`AdvisorProgression.vue` (real, wired, empty) and `FirmDashboard.vue` (fake, rich). Deciding
whether both survive, and which is *the* manager view, is a design question for Mike, not a
code question. Ask it before building on either.

---

## 6. What is missing, and what has to be decided

**Missing — testing.** There are **no component tests for either screen**. The only test
file is the backend route test. Anything you change in `AdvisorProgression.vue` or
`FirmDashboard.vue` is currently unverified by the suite. The project standard (CLAUDE.md
→ Testing) expects new business logic and routes to ship with tests, and `@vue/test-utils`
v1 is already set up — there are plenty of component tests elsewhere to copy the pattern
from (e.g. `tests/unit/firmQuizzes.component.test.js`).

**Missing — the record is only ever a score.** `log-course` sends the quiz score and
nothing else, so the tables have never seen an individual question. Every screen therefore
shows averages, and a manager cannot see *what* an advisor got wrong — only that they got
73. Making that per-question record real is the substantive open feature. **But see §7 —
part of the groundwork for it lives on the desktop branch and is not in this one.**

**Open decision for Mike (already on the record, unresolved):** when the per-question
record is built, should it store the advisor's **own written answer**, or only the bank,
the question number, pass/fail and the score? The recommendation on file is **no free
text** — advisors write differently once they believe a manager reads their words, which
would degrade the very signal the record exists to collect. Text can be added later; it
cannot be un-stored. Do not build it either way without asking him.

---

## 7. Why the branch point matters

This branch was cut from `origin/master`. That is deliberate and correct — the working
agreement says branches are short-lived and cut from `master` — and it costs you nothing
for the progress files themselves: **every file in §2 is byte-identical between `master`
and the desktop's working branch.** It was checked commit by commit. Nothing was left
behind on the other machine.

**But two adjacent things are NOT on this branch**, because they were built on the desktop
branch (`feat/firm-quiz-builder-ui`) on 2026-07-28 and have not yet been merged to
`master`:

1. **Quiz provenance** — the backend now returns which question bank fed each generated
   quiz question, and `CourseBuilder.vue` records `bankKey` / `bankSource` / `bankRef` on
   every graded result. That is precisely the data a per-question backend record would
   send. If you build the per-question record here, you will be building against a
   `CourseBuilder.vue` that does not have it, and the two will collide at merge.
2. **The quiz lab** (`scripts/quiz-lab.js`) and three newly ingested quiz banks.

**Therefore:** the per-question record work should **wait** until the desktop branch is
merged into `master` and this branch merges `master` in. Everything else in this
document — the honest-failure fix, the database provisioning, the mock removal, the test
coverage, the two-manager-views decision — is fully independent and can start now.

---

## 8. Suggested order of work

Nothing here is approved — Mike approves each change individually, per CLAUDE.md. This is a
recommended sequence, not a mandate.

1. **Make the database failure visible** (§4). Small, self-contained, and it converts every
   later step from guesswork into something you can actually see.
2. **Provision MySQL** (§4). Everything real is behind this. It is the same blocker as the
   rest of Firm Manager, so solving it here unblocks several other stalled features at once.
   This needs credentials Mike has to supply — do not guess them, and do not fake around it.
3. **Re-run the two failed completions** and prove a row lands. That is the first moment
   this feature has ever genuinely worked.
4. **Settle the two-manager-views question** with Mike (§5), then either wire or hide
   `FirmDashboard.vue`. Do not leave Sarah Chen where a firm can see her.
5. **Add component tests** for whichever screens survive (§6).
6. **Per-question record** — only after the desktop branch has landed in `master` (§7), and
   only after Mike answers the free-text question (§6).

---

## 9. Ground rules for whoever picks this up

- **No change to this repository without Mike's explicit approval for that specific
  change** — CLAUDE.md, LIVE-APP rule. It applies on this branch exactly as on any other.
- **Start with `/startup`, end with `/shutdown`.** Merge `master` in at the start of each
  session; push only this branch; reach `master` by pull request.
- **The dev server belongs to Mike.** Never start, stop or restart it — ask him to.
- **Say what is unverified.** The test suite cannot see a screen. If a change is only
  provable by eye, name the screen and say a human has to look.
